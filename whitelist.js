// whitelist.js (v6 - Final, Corrected, and Verified)
import * as Constants from './constants.js';
import { sharedState } from './state.js';
import { fetchQuickReplies } from './api.js';

function isProtectedInputHelper(element) {
    if (!element) return false;
    if (element.id === 'input_helper_toolbar' || element.id === 'custom_buttons_container') return true;
    if (element.classList?.contains('qr--button') && element.id?.startsWith('input_')) return true;
    return false;
}

// ========================================================================
//  THIS IS THE BULLETPROOF FIX
// ========================================================================
function isCombinedWrapper(element, qrBarElement) {
    // 1. Basic checks: Must be a direct child of qr-bar, have the class, and importantly, have NO ID.
    if (!element || element.parentElement !== qrBarElement || !element.classList.contains('qr--buttons') || element.id) {
        return false;
    }

    // 2. The definitive structural check: A true wrapper MUST contain other `.qr--buttons` elements as direct children.
    //    A simple button group (like HELP) only contains `.qr--button` children.
    //    We iterate through children to be 100% explicit.
    for (const child of element.children) {
        if (child.classList.contains('qr--buttons')) {
            // Found a child that is ALSO a button container. This is DEFINITELY a wrapper.
            return true;
        }
    }

    // If the loop finishes, no `.qr--buttons` children were found. It's a simple button group, NOT a wrapper.
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

function processElement(element, whitelist, qrApi) {
    if (!element || !element.classList) return;

    if (isProtectedInputHelper(element)) {
        element.classList.remove('qrq-hidden-by-plugin');
        element.classList.remove('qrq-whitelisted-original');
        return;
    }

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

    if (containerIdForWhitelist) {
        if (whitelist.includes(containerIdForWhitelist)) {
            element.classList.add('qrq-whitelisted-original');
            element.classList.remove('qrq-hidden-by-plugin');
        } else {
            element.classList.add('qrq-hidden-by-plugin');
            element.classList.remove('qrq-whitelisted-original');
        }
        return;
    }
    
    if (element.classList.contains('qr--buttons')) {
       element.classList.add('qrq-hidden-by-plugin');
    }
}

export function applyWhitelistDOMChanges() {
    const qrBar = document.getElementById('qr--bar');
    if (!qrBar) return;

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

    const wrapper = Array.from(qrBar.children).find(child => isCombinedWrapper(child, qrBar));
    let elementsToProcess = [];

    if (wrapper) {
        elementsToProcess = Array.from(wrapper.children);
        wrapper.classList.remove('qrq-hidden-by-plugin');
        wrapper.classList.add('qrq-wrapper-visible');
    } else {
        elementsToProcess = Array.from(qrBar.children);
    }

    elementsToProcess.forEach(element => {
        if (element.id === 'qr--popoutTrigger') return;
        processElement(element, whitelist, qrApi);
    });

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

// Phoenix Logic for observation and healing
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
