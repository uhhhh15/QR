// whitelist.js
import * as Constants from './constants.js';
import { sharedState } from './state.js';
// 导入 fetchQuickReplies 以便进行状态验证
import { fetchQuickReplies } from './api.js';

// ---- 以下函数保持不变 ----
function resetOriginalContainers() {
    const containers = document.querySelectorAll('#qr--bar .qr--buttons:not(#input_helper_toolbar):not(#custom_buttons_container)');
    containers.forEach(c => c.classList.remove('qrq-whitelisted-original'));
}

function filterMenuItems() {
    // ... (此函数保持不变)
    const { chatItemsContainer, globalItemsContainer } = sharedState.domElements;
    if (!chatItemsContainer || !globalItemsContainer) return;
    const buttons = [
        ...(Array.from(chatItemsContainer.querySelectorAll(`.${Constants.CLASS_ITEM}`))),
        ...(Array.from(globalItemsContainer.querySelectorAll(`.${Constants.CLASS_ITEM}`)))
    ];
    const whitelist = window.extension_settings[Constants.EXTENSION_NAME]?.whitelist || [];
    buttons.forEach(btn => {
        const isStandard = btn.dataset.isStandard === 'true';
        const setName = btn.dataset.setName;
        const scriptId = btn.dataset.scriptId;
        let id = '';
        if (isStandard) {
            id = `QRV2::${setName}`;
        } else if (scriptId) {
            id = `JSR::${scriptId}`;
        }
        btn.style.display = (id && whitelist.includes(id)) ? 'none' : 'block';
    });
}

function restoreOriginalContainers() {
    // ... (此函数保持不变)
    const whitelist = window.extension_settings[Constants.EXTENSION_NAME]?.whitelist || [];
    whitelist.forEach(wid => {
        if (wid.startsWith('QRV2::')) {
            const set = window.quickReplyApi?.getSetByName(wid.substring(6));
            if (set?.dom) {
                set.dom.classList.add('qrq-whitelisted-original');
            }
        } else if (wid.startsWith('JSR::')) {
            const scriptId = wid.substring(5);
            const container = document.getElementById(`script_container_${scriptId}`);
            if (container) {
                container.classList.add('qrq-whitelisted-original');
            }
        }
    });
}

export function applyWhitelistDOMChanges() {
    resetOriginalContainers();
    filterMenuItems();
    restoreOriginalContainers();
}
// ---- 以上函数保持不变 ----


// 【终极方案 V7：自我修复与状态验证】
const cachedJsrNodes = new Map(); // 用于缓存 JSR 按钮容器的克隆
let debounceTimer = null;

const debouncedHealAndApply = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        console.log(`[QRQ Guardian] DOM changed. Validating state, healing, and applying rules...`);

        // 1. 获取当前所有应该存在的 JSR 和 QR 按钮的“真相”
        const { chat: validChatReplies } = fetchQuickReplies();
        const validJsrScriptIds = new Set(
            validChatReplies
                .filter(r => r.source === 'JSSlashRunner' && r.scriptId)
                .map(r => r.scriptId)
        );

        const whitelist = window.extension_settings[Constants.EXTENSION_NAME]?.whitelist || [];
        const jsrItemsInWhitelist = whitelist.filter(wid => wid.startsWith('JSR::'));
        const qrBar = document.getElementById('qr--bar');

        if (!qrBar) {
            return;
        }

        let domWasModified = false;

        // 2. 遍历所有在白名单中的 JSR 项，进行检查和修复
        for (const wid of jsrItemsInWhitelist) {
            const scriptId = wid.substring(5);
            const containerId = `script_container_${scriptId}`;
            const containerInDom = document.getElementById(containerId);

            if (containerInDom) {
                // 按钮在 DOM 中
                if (!validJsrScriptIds.has(scriptId)) {
                    // **新逻辑**: DOM中有，但根据设置它不应该存在 (用户刚刚禁用了它)
                    console.log(`[QRQ Guardian] JSR node #${containerId} exists in DOM but is no longer valid. It will be removed by other plugins.`);
                    // 我们什么都不做，让 JSR 插件自己去移除它。同时可以从缓存中清除。
                    if (cachedJsrNodes.has(scriptId)) {
                        cachedJsrNodes.delete(scriptId);
                    }
                } else {
                    // DOM中有，也应该存在。这是正常状态。我们顺便更新一下缓存。
                    if (!cachedJsrNodes.has(scriptId) || cachedJsrNodes.get(scriptId).innerHTML !== containerInDom.innerHTML) {
                        // console.log(`[QRQ Guardian] Caching/Updating JSR node: #${containerId}`);
                        cachedJsrNodes.set(scriptId, containerInDom.cloneNode(true));
                    }
                }
            } else {
                // 按钮不在 DOM 中
                if (validJsrScriptIds.has(scriptId) && cachedJsrNodes.has(scriptId)) {
                    // **核心修复逻辑**: DOM中没有，但它应该存在，并且我们有缓存。恢复它！
                    console.error(`[QRQ Guardian] JSR node #${containerId} is MISSING but SHOULD exist. Restoring from cache!`);
                    const cachedNode = cachedJsrNodes.get(scriptId);
                    qrBar.appendChild(cachedNode.cloneNode(true));
                    domWasModified = true;
                } else if (!validJsrScriptIds.has(scriptId)) {
                    // DOM中没有，也不应该存在。这是用户禁用的正常情况。清理缓存。
                    if (cachedJsrNodes.has(scriptId)) {
                        console.log(`[QRQ Guardian] JSR node #${containerId} is not in DOM and is invalid. Clearing cache.`);
                        cachedJsrNodes.delete(scriptId);
                    }
                }
            }
        }

        // 3. 总是应用一次样式规则。如果在上一步恢复了节点，DOM已经改变。
        applyWhitelistDOMChanges();
        
        // 4. 如果我们手动恢复了节点，延迟一帧再次应用，确保样式万无一失。
        if (domWasModified) {
            requestAnimationFrame(applyWhitelistDOMChanges);
        }

    }, 250);
};

export function observeBarMutations() {
    const targetNode = document.getElementById('send_form') || document.body;
    
    const observer = new MutationObserver(() => {
        debouncedHealAndApply();
    });

    observer.observe(targetNode, { childList: true, subtree: true });
    console.log(`[QRQ Whitelist] "Intelligent Phoenix" MutationObserver is now watching subtree of #${targetNode.id || 'body'}.`);
}


window.quickReplyMenu = window.quickReplyMenu || {};
window.quickReplyMenu.applyWhitelistDOMChanges = applyWhitelistDOMChanges;
window.quickReplyMenu.observeBarMutations = observeBarMutations;
