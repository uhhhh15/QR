// api.js - 最终完整版 3.0（修正数据源 + 保持正确哈希）
import * as Constants from './constants.js';
import { setMenuVisible } from './state.js';

// JS-Slash-Runner 在 extension_settings 中使用的键名
const JSR_SETTINGS_KEY = "TavernHelper";
// JS-Slash-Runner 在角色扩展中存储脚本的键名
const JSR_CHAR_EXTENSION_KEY = "TavernHelper_scripts";

/**
 * SillyTavern 的内部字符串哈希函数（从新版 TavernHelper 的行为推断）。
 * 这是一个高质量的 53 位哈希函数 (cyrb53)，能生成与当前 TavernHelper 行为一致的大数值哈希。
 * 它返回的是一个十进制数字字符串，而不是 base-36。
 * @param {string} str - 要进行哈希处理的字符串。
 * @param {number} [seed=0] - 可选的哈希种子。
 * @returns {string} - 一个十进制格式的哈希字符串。
 */
function getStringHash(str, seed = 0) {
    if (typeof str !== 'string' || str.length === 0) {
        return '0';
    }
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    // 返回一个 53-bit 的哈希值，并转换为十进制字符串
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString();
}

/**
 * 辅助函数：将新的、包含文件夹的 JSR 脚本数据结构“拍平”，
 * 转换成旧的、简单的脚本对象数组（兼容新旧版酒馆助手 3.2.3 版本）。
 * @param {Array<object>} items - 从 JSR 设置中获取的原始脚本/文件夹列表。
 * @returns {Array<object>} - 一个只包含纯脚本对象的扁平数组。
 */
function flattenJsrScripts(items) {
    if (!items || !Array.isArray(items)) {
        return [];
    }

    const flatScripts = [];

    const processItem = (item) => {
        // Case 1: 这是一个文件夹，递归处理其内部的脚本
        if (item && item.type === 'folder' && Array.isArray(item.value)) {
            // 文件夹内的脚本是纯粹的脚本对象，直接遍历
            item.value.forEach(scriptInFolder => {
                // 直接将文件夹内的脚本对象加入结果列表
                flatScripts.push(scriptInFolder);
            });
        }
        // Case 2: 这是一个顶层脚本，提取其 .value
        else if (item && item.type === 'script' && item.value) {
            flatScripts.push(item.value);
        }
        // Case 3: 兼容非常旧的、没有任何包装的扁平结构（以防万一）
        else if (item && !item.type && item.id) {
            flatScripts.push(item);
        }
    };

    items.forEach(processItem);

    return flatScripts;
}

/**
 * Fetches chat and global quick replies from the quickReplyApi.
 * Also fetches JS Runner buttons directly from its settings if available via SillyTavern.extensionSettings.
 * @returns {{ chat: Array<object>, global: Array<object> }}
 */
export function fetchQuickReplies() {
    const stContext = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null;

    console.log(`[${Constants.EXTENSION_NAME} Debug] fetchQuickReplies called.`);
    let chatReplies = [];
    const globalReplies = [];
    const chatQrLabels = new Set();

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

        // 处理全局脚本（这部分逻辑是正确的，因为它直接从全局设置读取）
        const globalScriptTypeEnabled = jsRunnerSettings.script?.global_script_enabled !== false;
        const flatGlobalScripts = flattenJsrScripts(jsRunnerSettings.script?.scriptsRepository);
        processScripts(flatGlobalScripts, 'global', globalScriptTypeEnabled);

        const characterId = stContext.characterId;

        if (stContext.characters && typeof characterId !== 'undefined' && characterId !== null) {
            const currentChar = stContext.characters[characterId];
            if (currentChar && currentChar.avatar) {
                const characterEnabledList = Array.isArray(jsRunnerSettings.script?.characters_with_scripts) ? jsRunnerSettings.script.characters_with_scripts : [];
                const isCurrentCharEnabled = characterEnabledList.includes(currentChar.avatar);

                if (isCurrentCharEnabled) {
                    // TavernHelper 用这个键来加载和执行脚本。
                    const characterScriptsRepository = currentChar.data?.extensions?.[JSR_CHAR_EXTENSION_KEY];

                    // 将提取出的脚本仓库数组传入拍平函数并处理
                    const flatCharacterScripts = flattenJsrScripts(characterScriptsRepository);
                    processScripts(flatCharacterScripts, 'character', true);
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

    // 使用我们自己文件中的 getStringHash 函数来生成正确的事件名称
    const buttonNameHash = getStringHash(buttonLabel);
    const eventName = `${scriptId}_${buttonNameHash}`;

    // 我添加了 hash 值的日志，方便你确认它是否正确生成
    console.log(`[${Constants.EXTENSION_NAME}] Triggering JS Runner Script: Event='${eventName}' (Label: "${buttonLabel}", Hash: "${buttonNameHash}")`);
    try {
        await stContext.eventSource.emit(eventName);
    } catch (error) {
        console.error(`[${Constants.EXTENSION_NAME}] Error emitting JS Runner script event "${eventName}":`, error);
    }
}
