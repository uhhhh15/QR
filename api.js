// api.js
import * as Constants from './constants.js';
import { setMenuVisible } from './state.js';

// JS-Slash-Runner 在 extension_settings 和角色扩展中使用的键名
// 根据 JS-Slash-Runner 源码确定为 "TavernHelper"
const JSR_SETTINGS_KEY = "TavernHelper";
// JS-Slash-Runner 在角色扩展中存储脚本的键名
const JSR_CHAR_EXTENSION_KEY = "TavernHelper_scripts";

/**
 * Fetches chat and global quick replies from the quickReplyApi.
 * Also fetches JS Runner buttons directly from its settings if available via SillyTavern.extensionSettings.
 * @returns {{ chat: Array<object>, global: Array<object> }}
 */
export function fetchQuickReplies() {
    // 【最终修正-A】在函数内部实时获取上下文
    const stContext = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null;

    console.log(`[${Constants.EXTENSION_NAME} Debug] fetchQuickReplies called.`);
    let chatReplies = [];
    const globalReplies = [];
    const chatQrLabels = new Set(); // To track labels and avoid duplicates in chat section

    // --- 1. 获取标准 Quick Reply v2 ---
    if (!window.quickReplyApi) {
        console.warn(`[${Constants.EXTENSION_NAME}] Quick Reply API (window.quickReplyApi) not found! Cannot fetch standard replies.`);
    } else {
        const qrApi = window.quickReplyApi;
        if (qrApi.settings?.isEnabled !== false) {
            console.log(`[${Constants.EXTENSION_NAME}] Fetching standard Quick Replies...`);
            try {
                // Fetch Chat Quick Replies
                if (qrApi.settings?.chatConfig?.setList) {
                    qrApi.settings.chatConfig.setList.forEach(setLink => {
                        if (setLink?.isVisible && setLink.set?.qrList && Array.isArray(setLink.set.qrList)) {
                            setLink.set.qrList.forEach(qr => {
                                if (qr && !qr.isHidden && qr.label && qr.label.trim() !== "") {
                                    const label = qr.label.trim();
                                    if (!chatQrLabels.has(label)) {
                                        chatReplies.push({
                                            setName: setLink.set.name || 'Unknown Set',
                                            label: label,
                                            message: qr.message || `(标准回复: ${label})`,
                                            isStandard: true,
                                            source: 'QuickReplyV2'
                                        });
                                        chatQrLabels.add(label);
                                    }
                                }
                            });
                        }
                    });
                }

                // Fetch Global Quick Replies
                if (qrApi.settings?.config?.setList) {
                    qrApi.settings.config.setList.forEach(setLink => {
                        if (setLink?.isVisible && setLink.set?.qrList && Array.isArray(setLink.set.qrList)) {
                            setLink.set.qrList.forEach(qr => {
                                if (qr && !qr.isHidden && qr.label && qr.label.trim() !== "") {
                                     const label = qr.label.trim();
                                    if (!chatQrLabels.has(label)) {
                                        globalReplies.push({
                                            setName: setLink.set.name || 'Unknown Set',
                                            label: label,
                                            message: qr.message || `(标准回复: ${label})`,
                                            isStandard: true,
                                            source: 'QuickReplyV2'
                                        });
                                    }
                                }
                            });
                        }
                    });
                }
            } catch (error) {
                console.error(`[${Constants.EXTENSION_NAME}] Error fetching standard quick replies:`, error);
            }
        }
    }

    // --- 2. 从 JS-Slash-Runner 设置中获取脚本按钮 ---
    const jsRunnerSettings = stContext?.extensionSettings?.[JSR_SETTINGS_KEY];

    if (!stContext) {
         console.warn(`[${Constants.EXTENSION_NAME}] SillyTavern context not available.`);
    } else if (!jsRunnerSettings) {
        console.warn(`[${Constants.EXTENSION_NAME}] JS-Slash-Runner settings not found.`);
    } else if (jsRunnerSettings.enabled_extension === false) {
        console.log(`[${Constants.EXTENSION_NAME}] JS-Slash-Runner plugin is disabled.`);
    } else {
        const processScripts = (scripts, scriptType, typeEnabled) => {
             if (!typeEnabled) return;
            if (!scripts || !Array.isArray(scripts)) return;
            scripts.forEach(script => {
                if (script && script.enabled && script.buttons && Array.isArray(script.buttons)) {
                    script.buttons.forEach(button => {
                        if (button && button.visible && button.name && button.name.trim() !== "") {
                            const label = button.name.trim();
                            if (!chatQrLabels.has(label)) {
                                chatReplies.push({
                                    setName: script.name || 'JS脚本',
                                    label: label,
                                    message: `(JS脚本: ${script.name || '未命名'})`,
                                    isStandard: false,
                                    scriptId: script.id,
                                    source: 'JSSlashRunner'
                                });
                                chatQrLabels.add(label);
                            }
                        }
                    });
                }
            });
        };

        // 处理全局脚本
        const globalScriptTypeEnabled = jsRunnerSettings.script?.global_script_enabled !== false;
        processScripts(jsRunnerSettings.script?.scriptsRepository, 'global', globalScriptTypeEnabled);

        // 【最终修正-B】直接使用 stContext.characterId，这是 this_chid 的实时引用
        const characterId = stContext.characterId;

        if (stContext.characters && typeof characterId !== 'undefined' && characterId !== null) {
            const currentChar = stContext.characters[characterId];
            if (currentChar && currentChar.avatar) {
                const characterScriptsTypeEnabled = jsRunnerSettings.script?.characters_with_scripts_enabled !== false;
                const characterEnabledList = Array.isArray(jsRunnerSettings.script?.characters_with_scripts) ? jsRunnerSettings.script.characters_with_scripts : [];
                const isCurrentCharEnabled = characterEnabledList.includes(currentChar.avatar);

                if (characterScriptsTypeEnabled && isCurrentCharEnabled) {
                    // JSR 将角色脚本存在 character.data.extensions.TavernHelper_scripts
                    const characterScripts = currentChar.data?.extensions?.[JSR_CHAR_EXTENSION_KEY];
                    processScripts(characterScripts, 'character', true);
                }
            }
        }
    }

    console.log(`[${Constants.EXTENSION_NAME} Debug] Final fetch results - Chat (incl. JS): ${chatReplies.length}, Global: ${globalReplies.length}`);
    return { chat: chatReplies, global: globalReplies };
}


/**
 * Triggers a specific standard quick reply using the API.
 * @param {string} setName
 * @param {string} label
 */
export async function triggerQuickReply(setName, label) {
    if (!window.quickReplyApi) {
        console.error(`[${Constants.EXTENSION_NAME}] Quick Reply API not found!`);
        return;
    }
    if (window.quickReplyApi.settings?.isEnabled === false) {
         console.log(`[${Constants.EXTENSION_NAME}] Core Quick Reply v2 is disabled.`);
         return;
    }
    console.log(`[${Constants.EXTENSION_NAME}] Triggering Standard Quick Reply: "${setName}.${label}"`);
    try {
        await window.quickReplyApi.executeQuickReply(setName, label);
    } catch (error) {
        console.error(`[${Constants.EXTENSION_NAME}] Failed to execute Standard Quick Reply "${setName}.${label}":`, error);
    }
}

/**
 * Triggers a specific JS-Slash-Runner script button via its event.
 * @param {string} scriptId - The ID of the script.
 * @param {string} buttonLabel - The label of the button within the script.
 */
export async function triggerJsRunnerScript(scriptId, buttonLabel) {
    // 【最终修正-C】在函数内部实时获取上下文
    const stContext = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null;

    if (!stContext || !stContext.eventSource || typeof stContext.eventSource.emit !== 'function') {
        console.error(`[${Constants.EXTENSION_NAME}] SillyTavern context or eventSource not available.`);
        return;
    }
    const jsRunnerSettings = stContext.extensionSettings?.[JSR_SETTINGS_KEY];
    if (!jsRunnerSettings) {
         console.log(`[${Constants.EXTENSION_NAME}] JS-Slash-Runner settings not found.`);
        return;
    }
    if (jsRunnerSettings.enabled_extension === false) {
        console.log(`[${Constants.EXTENSION_NAME}] JS-Slash-Runner plugin is disabled.`);
        return;
    }

    const eventName = `${scriptId}_${buttonLabel}`;
    console.log(`[${Constants.EXTENSION_NAME}] Triggering JS Runner Script: Event='${eventName}'`);
    try {
        await stContext.eventSource.emit(eventName);
    } catch (error) {
        console.error(`[${Constants.EXTENSION_NAME}] Error emitting JS Runner script event "${eventName}":`, error);
    }
}
