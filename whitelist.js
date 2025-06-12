// whitelist.js
import * as Constants from './constants.js';
import { sharedState } from './state.js';
import { fetchQuickReplies } from './api.js';

// 辅助函数：判断元素是否为受保护的输入助手（容器或按钮）
function isProtectedInputHelper(element) {
    if (!element) return false;
    // 输入助手容器
    if (element.id === 'input_helper_toolbar' || element.id === 'custom_buttons_container') return true;
    // 在 wrapper 模式下的单个输入助手按钮
    if (element.classList && element.classList.contains('qr--button') && element.id && element.id.startsWith('input_') && element.parentElement && element.parentElement.classList.contains('qr--buttons') && !element.parentElement.id) return true;
     // 在非 wrapper 模式下，输入助手按钮在 custom_buttons_container 内部，容器本身被保护即可
    return false;
}

// 辅助函数：判断一个元素是否为合并模式下的包裹容器
function isCombinedWrapper(element, qrBarElement) {
     if (!element || !qrBarElement || element.parentElement !== qrBarElement) return false;
     if (!element.classList || !element.classList.contains('qr--buttons')) return false;
     if (element.id && (element.id === 'input_helper_toolbar' || element.id === 'custom_buttons_container')) return false;

     // 宽松判断：#qr--bar 的直接子元素, class含 qr--buttons, 且不是受保护容器, 且内部包含任何 qr--button(s)
     const hasInnerButtons = element.querySelector('.qr--button, .qr--buttons');
     // 通常 wrapper 没有ID，或者不是 script_container
      const isNotScript = !element.id || !element.id.startsWith('script_container_');
      // 如果设置开启了 isCombined, 并且满足条件
      const qrSettings = window.quickReplyApi?.settings?.config;
       if (qrSettings?.isCombined && isNotScript && hasInnerButtons) {
          // 检查它是否包含了其他 *非* input_helper 的 .qr--buttons 或 .qr--button
          const hasNonHelperContent = element.querySelector(':scope > .qr--buttons:not(#input_helper_toolbar):not(#custom_buttons_container), :scope > div[id^="script_container_"], :scope > .qr--button:not([id^="input_"])');
           // 如果它只包含 input_helper_toolbar / custom_buttons_container / 独立的input_按钮, 也不算 wrapper
           const onlyContainsHelpers = Array.from(element.children).every(child => 
               child.id === 'input_helper_toolbar' || 
               child.id === 'custom_buttons_container' || 
               (child.id && child.classList.contains('qr--button') && child.id.startsWith('input_'))
           );
          // 必须包含非Helper内容，且不能只包含Helper
          if(hasNonHelperContent || !onlyContainsHelpers) return true;
       }
      // 兜底：用于识别你最早 dom_1 结构 (无ID的qr--buttons且有子元素)
      if (!element.id && hasInnerButtons) return true;

     return false;
}


let allQrSetsCache = new Map(); 
let lastQrApiSettingsString = null;

// 获取所有QR Set并缓存, 避免频繁遍历和重复创建对象
// 包含QR缓存修复逻辑
function getAllQrSets(qrApi) {
    const configList = qrApi?.settings?.config?.setList;
    const chatConfigList = qrApi?.settings?.chatConfig?.setList;
    
    const configNames = (configList || []).map(sl => sl?.set?.name).filter(Boolean).sort().join(',');
    const chatNames = (chatConfigList || []).map(sl => sl?.set?.name).filter(Boolean).sort().join(',');
    const currentSettingsString = `${configList?.length}:${configNames}|${chatConfigList?.length}:${chatNames}`;

    if (lastQrApiSettingsString === currentSettingsString && allQrSetsCache.size > 0) {
        return allQrSetsCache;
    }
    // console.log("[QRQ DEBUG] QR Set Cache MISS or INVALIDATED. Rebuilding...");

    allQrSetsCache.clear(); 
    const collect = (list) => {
        list?.forEach(setLink => {
            if (setLink?.set?.dom && setLink.set.name) {
                 if(document.body.contains(setLink.set.dom)) { // 检查dom是否还在文档中
                     allQrSetsCache.set(setLink.set.dom, { name: setLink.set.name, dom: setLink.set.dom });
                 }
            }
        });
    };
    collect(configList);
    collect(chatConfigList);
    
    lastQrApiSettingsString = currentSettingsString;
    return allQrSetsCache;
}


// 处理单个元素（容器或按钮）的显隐
function processElement(element, whitelist, qrApi, isInsideWrapper = false) {
    if (!element || !element.classList) return false;

    /*显示 #qr--popoutTrigger
    if (element.id === 'qr--popoutTrigger' && element.parentElement && element.parentElement.id === 'qr--bar') {
        element.classList.add('qrq-hidden-by-plugin');
        return false; 
    }
    */
    
    if (isProtectedInputHelper(element)) {
        element.classList.remove('qrq-hidden-by-plugin');
        element.classList.remove('qrq-whitelisted-original'); 
        return true; 
    }

    let containerIdForWhitelist = '';
    // 优先检查是否为 QR Set
     if (element.classList.contains('qr--buttons') && qrApi && (!element.id || !element.id.startsWith('script_container_'))) { 
        const allSetsMap = getAllQrSets(qrApi); 
        const setData = allSetsMap.get(element); 
        if (setData?.name) {
            containerIdForWhitelist = `QRV2::${setData.name}`;
        }
    } else if (element.id && element.id.startsWith('script_container_')) { // JSR
        containerIdForWhitelist = `JSR::${element.id.substring('script_container_'.length)}`;
    }

    if (containerIdForWhitelist) {
        if (whitelist.includes(containerIdForWhitelist)) {
            element.classList.add('qrq-whitelisted-original');
            element.classList.remove('qrq-hidden-by-plugin');
            return true; 
        } else {
            element.classList.add('qrq-hidden-by-plugin');
            element.classList.remove('qrq-whitelisted-original');
            return false; 
        }
    }
    
    // 兜底：未识别的 .qr--buttons (且不是受保护的, 也不是wrapper本身) -> 隐藏
    if (element.classList.contains('qr--buttons') && !isProtectedInputHelper(element) && !containerIdForWhitelist && !isCombinedWrapper(element, document.getElementById('qr--bar'))) {
       element.classList.add('qrq-hidden-by-plugin');
       return false;
    }
     // 其他情况 (如文本节点或 wrapper 本身)
    return !element.classList.contains('qrq-hidden-by-plugin');
}


export function applyWhitelistDOMChanges() {
    const qrBar = document.getElementById('qr--bar');
    if (!qrBar) {
       // console.warn(`[QRQ Whitelist] #qr--bar not found.`);
        return;
    }

    const settings = window.extension_settings[Constants.EXTENSION_NAME];
    const whitelist = settings?.whitelist || [];
    const pluginEnabled = settings?.enabled !== false;
    const qrApi = window.quickReplyApi;

    const elementsToReset = qrBar.querySelectorAll('.qrq-whitelisted-original, .qrq-hidden-by-plugin, .qrq-wrapper-visible');
    elementsToReset.forEach(el => {
        el.classList.remove('qrq-whitelisted-original', 'qrq-hidden-by-plugin', 'qrq-wrapper-visible');
    });

    if (!pluginEnabled) {
        document.body.classList.remove('qra-enabled');
        document.body.classList.add('qra-disabled');
        filterMenuItems(whitelist, pluginEnabled);
        return;
    }

    document.body.classList.remove('qra-disabled');
    document.body.classList.add('qra-enabled');

    let wrapper = null;
    Array.from(qrBar.children).some(child => {
        if (isCombinedWrapper(child, qrBar)) {
            wrapper = child;
            return true; 
        }
        return false;
    });

    let wrapperShouldBeVisible = false;
    Array.from(qrBar.children).forEach(child => {
        if (child === wrapper) { 
            Array.from(wrapper.children).forEach(innerChild => {
                if (processElement(innerChild, whitelist, qrApi, true)) {
                    wrapperShouldBeVisible = true;
                }
            });
        } else {
            // 对于非 wrapper 的子元素，processElement 返回值不影响 wrapperShouldBeVisible
            processElement(child, whitelist, qrApi, false);
        }
    });
    
    if (wrapper) {
        if (wrapperShouldBeVisible) {
            wrapper.classList.remove('qrq-hidden-by-plugin');
            wrapper.classList.add('qrq-wrapper-visible');
        } else {
            wrapper.classList.add('qrq-hidden-by-plugin');
            wrapper.classList.remove('qrq-wrapper-visible');
        }
    }
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


// ================== 治疗和观察逻辑 (包含顺序保持修复！) ==================
// 缓存结构: Map<scriptId, { node: Node, nextSibling: Element | null }>
const cachedJsrNodes = new Map(); 
let debounceTimer = null;

const debouncedHealAndApply = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const qrBar = document.getElementById('qr--bar');
        if (!qrBar && document.readyState === 'complete') return;
        if (!qrBar) return;

        const { chat: validChatReplies } = fetchQuickReplies(); 
        const validJsrScriptIds = new Set((validChatReplies || []).filter(r => r.source === 'JSSlashRunner' && r.scriptId).map(r => r.scriptId));
        const settings = window.extension_settings[Constants.EXTENSION_NAME];
        const whitelist = settings?.whitelist || [];
        const jsrItemsInWhitelist = whitelist.filter(wid => wid.startsWith('JSR::'));
        let domWasModifiedByHealing = false;

        if (settings?.enabled !== false) {
             let targetParent = qrBar;
             const currentWrapper = Array.from(qrBar.children).find(c => isCombinedWrapper(c, qrBar));
             if (currentWrapper) targetParent = currentWrapper;

            for (const wid of jsrItemsInWhitelist) {
                const scriptId = wid.substring(5);
                const containerId = `script_container_${scriptId}`;
                const containerInDom = document.getElementById(containerId); 
                const cached = cachedJsrNodes.get(scriptId);

                if (containerInDom) { // 元素在 DOM 中
                    if (validJsrScriptIds.has(scriptId)) { // 且应该存在 -> 更新缓存
                         if (!cached || cached.node !== containerInDom || cached.nextSibling !== containerInDom.nextElementSibling) {
                             cachedJsrNodes.set(scriptId, { 
                                node: containerInDom, 
                                nextSibling: containerInDom.nextElementSibling 
                             });
                         }
                    } else { // 但不应该存在
                         cachedJsrNodes.delete(scriptId);
                    }
                } else { // 元素不在 DOM 中
                    if (validJsrScriptIds.has(scriptId) && cached) { // 但应该存在且有缓存 -> 恢复
                        console.error(`[QRQ Guardian] JSR node #${containerId} MISSING! Restoring to original position.`);
                        const nodeToRestore = cached.node.cloneNode(true); 
                        const referenceSibling = cached.nextSibling; 

                        let inserted = false;
                         // 检查参考兄弟节点是否仍然是 targetParent 的子节点
                         if (referenceSibling && targetParent.contains(referenceSibling)) {
                             try {
                                targetParent.insertBefore(nodeToRestore, referenceSibling);
                                inserted = true;
                             } catch(e) { console.warn(`[QRQ Guardian] insertBefore failed for ${scriptId}:`, e); }
                         }
                         // 如果参考节点不存在、不是父级的子级、或 insertBefore 失败，则追加到末尾 (兜底)
                         if (!inserted) {
                            targetParent.appendChild(nodeToRestore);
                             console.warn(`[QRQ Guardian] Fallback: Appended ${scriptId} to end. Order may differ.`);
                         }
                         // 更新缓存为恢复后的新节点及其当前兄弟节点
                         cachedJsrNodes.set(scriptId, { node: nodeToRestore, nextSibling: nodeToRestore.nextElementSibling });
                         domWasModifiedByHealing = true;

                    } else if (!validJsrScriptIds.has(scriptId)) { // 且不应该存在
                         cachedJsrNodes.delete(scriptId);
                    }
                }
            } // end for
        } else { // 插件禁用
            cachedJsrNodes.clear();
        }
        
        lastQrApiSettingsString = null; // 强制DOM变化后使QR缓存失效
        applyWhitelistDOMChanges(); 
        // 如果DOM被修改，延迟一帧再次应用，确保类名正确
        if (domWasModifiedByHealing) {
           requestAnimationFrame(() => {
               // 再次更新缓存中恢复节点的 nextSibling
                cachedJsrNodes.forEach(cached => {
                   if(cached.node && cached.node.parentNode) { 
                       cached.nextSibling = cached.node.nextElementSibling;
                   }
                });
               applyWhitelistDOMChanges();
           });
        }
    }, 250); // 防抖延迟
};


let observerInstance = null;
export function observeBarMutations() {
    if (observerInstance) observerInstance.disconnect();
    const targetNode = document.getElementById('send_form') || document.body; 
    observerInstance = new MutationObserver(debouncedHealAndApply);
    observerInstance.observe(targetNode, { childList: true, subtree: true, attributes: false, characterData: false  });
     console.log(`[QRQ Whitelist] "Order-Preserving Phoenix" Observer watching #${targetNode.id || 'body'}.`);
}
// 全局挂载
if (typeof window !== 'undefined') {
    window.quickReplyMenu = window.quickReplyMenu || {};
    window.quickReplyMenu.applyWhitelistDOMChanges = applyWhitelistDOMChanges;
    window.quickReplyMenu.observeBarMutations = observeBarMutations; 
}
