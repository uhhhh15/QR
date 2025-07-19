// whitelist.js (v8 - Fixes TavernHelper compatibility in combined mode)
import * as Constants from './constants.js';
import { sharedState } from './state.js';
import { fetchQuickReplies } from './api.js';

function isProtectedInputHelper(element) {
    if (!element) return false;
    if (element.id === 'input_helper_toolbar' || element.id === 'custom_buttons_container') return true;
    if (element.classList?.contains('qr--button') && element.id?.startsWith('input_')) return true;
    return false;
}

function isCombinedWrapper(element, qrBarElement) {
    if (!element || element.parentElement !== qrBarElement || !element.classList.contains('qr--buttons') || element.id) {
        return false;
    }
    for (const child of element.children) {
        if (child.classList.contains('qr--buttons')) {
            return true;
        }
    }
    return false;
}


let allQrSetsCache = new Map(); 
let lastQrApiSettingsString = null;

function getAllQrSets(qrApi) {
    const configList = qrApi?.settings?.config?.setList;
    const chatConfigList = qrApi?.settings?.chatConfig?.setList;
    const configNames = (configList || []).map(sl => sl?.set?.name).filter(Boolean).sort().join(',');
    const chatNames = (chatConfigList || []).map(sl => sl?.set?.name).filter(Boolean).sort().join(',');
    const currentSettingsString = `${configList?.length}:${configNames}|${chatConfigList?.length}:${chatNames}`;
    if (lastQrApiSettingsString === currentSettingsString && allQrSetsCache.size > 0) return allQrSetsCache;
    allQrSetsCache.clear(); 
    const collect = (list) => {
        list?.forEach(setLink => {
            if (setLink?.set?.dom && setLink.set.name && document.body.contains(setLink.set.dom)) {
                allQrSetsCache.set(setLink.set.dom, { name: setLink.set.name, dom: setLink.set.dom });
            }
        });
    };
    collect(configList);
    collect(chatConfigList);
    lastQrApiSettingsString = currentSettingsString;
    return allQrSetsCache;
}

// ======================= 新增辅助函数 (START) =======================
/**
 * 检查一个元素或其后代是否在白名单中。
 * 这是修复问题的核心，用于防止父容器错误地隐藏了白名单中的子元素。
 * @param {HTMLElement} element - 要检查的元素。
 * @param {string[]} whitelist - 白名单列表。
 * @returns {boolean} 如果元素本身或其任何后代在白名单中，则返回true。
 */
function hasWhitelistedDescendant(element, whitelist) {
    // 查找所有 TavernHelper (JSR) 后代容器
    const descendantJsrElements = element.querySelectorAll('[id^="script_container_"]');
    
    // 将它们的ID转换为白名单中使用的格式 (例如 "JSR::uuid-...")
    const descendantJsrIds = Array.from(descendantJsrElements)
                                  .map(el => `JSR::${el.id.substring('script_container_'.length)}`);
    
    // 检查是否有任何一个后代ID存在于白名单中
    if (descendantJsrIds.some(id => whitelist.includes(id))) {
        return true; // 找到了一个在白名单中的后代
    }

    // 未找到白名单中的后代
    return false;
}
// ======================= 新增辅助函数 (END) =======================


// ======================= 重构的核心逻辑 (START) =======================
function processElement(element, whitelist, qrApi) {
    if (!element || !element.classList) return;

    // 保护输入助手，不进行任何操作
    if (isProtectedInputHelper(element)) {
        element.classList.remove('qrq-hidden-by-plugin', 'qrq-whitelisted-original');
        return;
    }

    // 识别当前元素的ID，用于匹配白名单
    let containerIdForWhitelist = '';
    if (element.id && element.id.startsWith('script_container_')) {
        containerIdForWhitelist = `JSR::${element.id.substring('script_container_'.length)}`;
    } else if (element.classList.contains('qr--buttons')) {
        const allSetsMap = getAllQrSets(qrApi); 
        const setData = allSetsMap.get(element); 
        if (setData?.name) {
            containerIdForWhitelist = `QRV2::${setData.name}`;
        }
    }

    // 核心判断：
    // 1. 元素本身是否在白名单中？
    const isWhitelisted = containerIdForWhitelist && whitelist.includes(containerIdForWhitelist);
    // 2. 元素的后代中是否有任何一个在白名单中？
    const hasVisibleChild = hasWhitelistedDescendant(element, whitelist);

    // 根据上述判断，应用CSS类
    if (isWhitelisted || hasVisibleChild) {
        // **显示**：只要元素本身或其任何子元素在白名单中，就必须将此容器标记为可见。
        // 这将激活 style.css 中的 `display: contents` 或 `display: flex` 规则。
        element.classList.add('qrq-whitelisted-original');
        element.classList.remove('qrq-hidden-by-plugin');
    } else {
        // **隐藏**：仅当元素本身及其所有后代都【不】在白名单中时，才隐藏它。
        // 同时，确保我们只操作目标元素（QR按钮组或TH脚本容器）。
        if (element.classList.contains('qr--buttons') || element.id.startsWith('script_container_')) {
            element.classList.add('qrq-hidden-by-plugin');
            element.classList.remove('qrq-whitelisted-original');
        }
    }
}
// ======================= 重构的核心逻辑 (END) =======================

export function applyWhitelistDOMChanges() {
    const qrBar = document.getElementById('qr--bar');
    if (!qrBar) return;

    const settings = window.extension_settings[Constants.EXTENSION_NAME];
    const whitelist = settings?.whitelist || [];
    const pluginEnabled = settings?.enabled !== false;
    const qrApi = window.quickReplyApi;

    // 1. 重置
    const elementsToReset = qrBar.querySelectorAll('.qrq-whitelisted-original, .qrq-hidden-by-plugin, .qrq-wrapper-visible');
    elementsToReset.forEach(el => {
        el.classList.remove('qrq-whitelisted-original', 'qrq-hidden-by-plugin', 'qrq-wrapper-visible');
    });

    // 2. 插件禁用检查
    if (!pluginEnabled) {
        document.body.classList.remove('qra-enabled');
        document.body.classList.add('qra-disabled');
        filterMenuItems(whitelist, pluginEnabled);
        return;
    }

    // 3. 插件启用状态
    document.body.classList.remove('qra-disabled');
    document.body.classList.add('qra-enabled');

    const wrapper = Array.from(qrBar.children).find(child => isCombinedWrapper(child, qrBar));

    if (wrapper) {
        // --- 合并模式逻辑 ---

        // 步骤一：处理所有可被白名单管理的容器
        const allButtonContainersInWrapper = wrapper.querySelectorAll('.qr--buttons, [id^="script_container_"]');
        allButtonContainersInWrapper.forEach(container => {
            processElement(container, whitelist, qrApi);
        });

        // 步骤二：清理那些因“后代”而可见的父容器，隐藏其自身按钮
        allButtonContainersInWrapper.forEach(container => {
            let containerIdForWhitelist = '';
            let isContainerItselfWhitelisted = false;
            
            if (container.id && container.id.startsWith('script_container_')) {
                containerIdForWhitelist = `JSR::${container.id.substring('script_container_'.length)}`;
            } else if (container.classList.contains('qr--buttons')) {
                const setData = getAllQrSets(qrApi).get(container);
                if (setData?.name) {
                    containerIdForWhitelist = `QRV2::${setData.name}`;
                }
            }
            
            if (containerIdForWhitelist && whitelist.includes(containerIdForWhitelist)) {
                isContainerItselfWhitelisted = true;
            }

            if (!isContainerItselfWhitelisted && container.classList.contains('qrq-whitelisted-original')) {
                Array.from(container.children).forEach(child => {
                    if (child.matches('.qr--button')) {
                        child.classList.add('qrq-hidden-by-plugin');
                    }
                });
            }
        });
        
        // ======================= ★★★ 最终修复 ★★★ =======================
        // 步骤三：【最终修复】决定 wrapper 的可见性。
        // 不仅要检查白名单元素，还要检查受保护的输入助手元素。
        const hasWhitelistedItem = wrapper.querySelector('.qrq-whitelisted-original');
        const hasProtectedInputHelper = wrapper.querySelector('#input_helper_toolbar, #custom_buttons_container, .qr--button[id^="input_"]');
        
        if (hasWhitelistedItem || hasProtectedInputHelper) {
            // 只要有任何一个白名单项 或 任何一个输入助手项，wrapper 就必须可见！
            wrapper.classList.add('qrq-wrapper-visible');
            wrapper.classList.remove('qrq-hidden-by-plugin');
        } else {
            // 只有在绝对空的情况下，才隐藏 wrapper
            wrapper.classList.add('qrq-hidden-by-plugin');
            wrapper.classList.remove('qrq-wrapper-visible');
        }
        // ======================= ★★★ 修复结束 ★★★ =======================
        
        // 处理其他不在 wrapper 内的元素
        Array.from(qrBar.children).forEach(element => {
            if (element === wrapper || element.id === 'qr--popoutTrigger') return;
            processElement(element, whitelist, qrApi);
        });

    } else {
        // --- 非合并模式逻辑（保持不变）---
        Array.from(qrBar.children).forEach(element => {
            if (element.id === 'qr--popoutTrigger') return;
            processElement(element, whitelist, qrApi);
        });
    }

    // 最后更新菜单项
    filterMenuItems(whitelist, pluginEnabled);
}

function filterMenuItems(whitelist, pluginEnabled) {
     const { chatItemsContainer, globalItemsContainer } = sharedState.domElements;
    if (!chatItemsContainer || !globalItemsContainer) return;
    const buttons = [...Array.from(chatItemsContainer.querySelectorAll(`.${Constants.CLASS_ITEM}`)), ...Array.from(globalItemsContainer.querySelectorAll(`.${Constants.CLASS_ITEM}`))];
    buttons.forEach(btn => {
        if (!pluginEnabled) {
            btn.style.display = 'block'; 
            return;
        }
        const isStandard = btn.dataset.isStandard === 'true';
        const setName = btn.dataset.setName;
        const scriptId = btn.dataset.scriptId;
        let id = '';
        if (isStandard && setName) id = `QRV2::${setName}`;
        else if (scriptId) id = `JSR::${scriptId}`;
        btn.style.display = (id && whitelist.includes(id)) ? 'none' : 'block';
    });
}

// Phoenix Logic for observation and healing (保持不变)
const cachedJsrNodes = new Map(); 
let debounceTimer = null;
const debouncedHealAndApply = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const qrBar = document.getElementById('qr--bar');
        if (!qrBar) return;
        const { chat: validChatReplies } = fetchQuickReplies(); 
        const validJsrScriptIds = new Set((validChatReplies || []).filter(r => r.source === 'JSSlashRunner' && r.scriptId).map(r => r.scriptId));
        const settings = window.extension_settings[Constants.EXTENSION_NAME];
        if (settings?.enabled === false) {
            cachedJsrNodes.clear();
            applyWhitelistDOMChanges();
            return;
        }
        const whitelist = settings?.whitelist || [];
        const jsrItemsInWhitelist = whitelist.filter(wid => wid.startsWith('JSR::'));
        let targetParent = qrBar;
        const currentWrapper = Array.from(qrBar.children).find(c => isCombinedWrapper(c, qrBar));
        if (currentWrapper) targetParent = currentWrapper;
        let domWasModifiedByHealing = false;
        for (const wid of jsrItemsInWhitelist) {
            const scriptId = wid.substring(5);
            const containerId = `script_container_${scriptId}`;
            const containerInDom = document.getElementById(containerId); 
            const cached = cachedJsrNodes.get(scriptId);
            if (containerInDom) {
                if (validJsrScriptIds.has(scriptId)) {
                    if (!cached || cached.node !== containerInDom || cached.nextSibling !== containerInDom.nextElementSibling) {
                        cachedJsrNodes.set(scriptId, { node: containerInDom, nextSibling: containerInDom.nextElementSibling });
                    }
                } else {
                    cachedJsrNodes.delete(scriptId);
                }
            } else {
                if (validJsrScriptIds.has(scriptId) && cached) {
                    console.error(`[QRQ Guardian] JSR node #${containerId} MISSING! Restoring...`);
                    const nodeToRestore = cached.node.cloneNode(true); 
                    const referenceSibling = cached.nextSibling;
                    let inserted = false;
                    if (referenceSibling && targetParent.contains(referenceSibling)) {
                        try {
                            targetParent.insertBefore(nodeToRestore, referenceSibling);
                            inserted = true;
                        } catch(e) { console.warn(`[QRQ Guardian] insertBefore failed:`, e); }
                    }
                    if (!inserted) {
                        targetParent.appendChild(nodeToRestore);
                        console.warn(`[QRQ Guardian] Fallback: Appended to end.`);
                    }
                    cachedJsrNodes.set(scriptId, { node: nodeToRestore, nextSibling: nodeToRestore.nextElementSibling });
                    domWasModifiedByHealing = true;
                } else if (!validJsrScriptIds.has(scriptId)) {
                    cachedJsrNodes.delete(scriptId);
                }
            }
        }
        lastQrApiSettingsString = null;
        applyWhitelistDOMChanges(); 
        if (domWasModifiedByHealing) {
           requestAnimationFrame(() => {
                cachedJsrNodes.forEach(cached => {
                   if(cached.node && cached.node.parentNode) { 
                       cached.nextSibling = cached.node.nextElementSibling;
                   }
                });
               applyWhitelistDOMChanges();
           });
        }
    }, 250);
};

let observerInstance = null;
export function observeBarMutations() {
    if (observerInstance) observerInstance.disconnect();
    const targetNode = document.getElementById('send_form') || document.body; 
    observerInstance = new MutationObserver(debouncedHealAndApply);
    observerInstance.observe(targetNode, { childList: true, subtree: true });
     console.log(`[QRQ Whitelist] Observer watching #${targetNode.id || 'body'}.`);
}

if (typeof window !== 'undefined') {
    window.quickReplyMenu = window.quickReplyMenu || {};
    window.quickReplyMenu.applyWhitelistDOMChanges = applyWhitelistDOMChanges;
    window.quickReplyMenu.observeBarMutations = observeBarMutations; 
}
