// api.js - 最终完整版 3.2（修复QRv2优先级过滤BUG + 保留角色QR支持和最新哈希）
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
        if (item && item.type === 'folder' && Array.isArray(item.value)) {
            item.value.forEach(scriptInFolder => {
                flatScripts.push(scriptInFolder);
            });
        }
        else if (item && item.type === 'script' && item.value) {
            flatScripts.push(item.value);
        }
        else if (item && !item.type && item.id) {
            flatScripts.push(item);
        }
    };

    items.forEach(processItem);

    return flatScripts;
}

/**
 * Fetches chat, character, and global quick replies, applying priority rules.
 * Also fetches JS Runner buttons directly from its settings.
 * Priority: Chat > Character > Global.
 * @returns {{ chat: Array<object>, global: Array<object> }}
 */
export function fetchQuickReplies() {
    const stContext = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null;

    console.log(`[${Constants.EXTENSION_NAME} Debug] fetchQuickReplies called with corrected priority logic.`);
    
    // 最终用于UI渲染的列表
    const finalChatReplies = [];
    const finalGlobalReplies = [];
    
    // 用于去重的集合
    const processedSetNames = new Set(); // 跟踪已处理的 QRv2 回复集名称
    const processedLabels = new Set();   // 跟踪已处理的所有按钮标签，防止UI上出现同名按钮

    // --- 1. 获取并处理标准 Quick Reply v2 (包含新增的角色逻辑) ---
    if (!window.quickReplyApi) {
        console.warn(`[${Constants.EXTENSION_NAME}] Quick Reply API (window.quickReplyApi) not found!`);
    } else {
        const qrApi = window.quickReplyApi;
        if (qrApi.settings?.isEnabled !== false) {
            console.log(`[${Constants.EXTENSION_NAME}] Fetching standard Quick Replies (Chat, Character, Global)...`);

            // ★★★ 修复核心 ★★★
            // 辅助函数，用于处理一个级别的回复集列表 (例如 chatConfig.setList)
            const processQrLevel = (setList, destinationList) => {
                if (!setList || !Array.isArray(setList)) return;

                setList.forEach(setLink => {
                    const setName = setLink?.set?.name;
                    // 如果这个回复集已经被更高优先级的版本处理过，则跳过整个回复集
                    if (!setName || processedSetNames.has(setName)) {
                        return; 
                    }

                    // 标记此回复集名称为已处理
                    processedSetNames.add(setName);
                    
                    if (setLink?.isVisible && setLink.set?.qrList && Array.isArray(setLink.set.qrList)) {
                        setLink.set.qrList.forEach(qr => {
                            if (qr && !qr.isHidden && qr.label && qr.label.trim() !== "") {
                                const label = qr.label.trim();
                                // 只要标签没重复，就添加
                                if (!processedLabels.has(label)) {
                                    destinationList.push({
                                        setName: setName || 'Unknown Set',
                                        label: label,
                                        message: qr.message || `(标准回复: ${label})`,
                                        isStandard: true,
                                        source: 'QuickReplyV2'
                                    });
                                    processedLabels.add(label);
                                }
                            }
                        });
                    }
                });
            };

            // 按照 聊天 -> 角色 -> 全局 的顺序处理
            processQrLevel(qrApi.settings?.chatConfig?.setList, finalChatReplies);
            processQrLevel(qrApi.settings?.charConfig?.setList, finalChatReplies); // 角色回复也属于聊天级别
            processQrLevel(qrApi.settings?.config?.setList, finalGlobalReplies);
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
        const processScripts = (scripts) => {
            if (!scripts || !Array.isArray(scripts)) return;
            scripts.forEach(script => {
                if (script && script.enabled && script.buttons && Array.isArray(script.buttons)) {
                    script.buttons.forEach(button => {
                        if (button && button.visible && button.name && button.name.trim() !== "") {
                            const label = button.name.trim();
                            // 关键：检查标签是否已被更高优先级的QRv2按钮占用
                            if (!processedLabels.has(label)) {
                                finalChatReplies.push({ // JSR按钮总是被视为“聊天”级别
                                    setName: script.name || 'JS脚本',
                                    label: label,
                                    message: `(JS脚本: ${script.name || '未命名'})`,
                                    isStandard: false,
                                    scriptId: script.id,
                                    source: 'JSSlashRunner'
                                });
                                processedLabels.add(label); // 记录已处理的标签
                            }
                        }
                    });
                }
            });
        };

        // 处理全局脚本
        if (jsRunnerSettings.script?.global_script_enabled !== false) {
            const flatGlobalScripts = flattenJsrScripts(jsRunnerSettings.script?.scriptsRepository);
            processScripts(flatGlobalScripts);
        }

        // 处理角色脚本
        const characterId = stContext.characterId;
        if (stContext.characters && typeof characterId !== 'undefined' && characterId !== null) {
            const currentChar = stContext.characters[characterId];
            if (currentChar && currentChar.avatar) {
                const characterEnabledList = Array.isArray(jsRunnerSettings.script?.characters_with_scripts) ? jsRunnerSettings.script.characters_with_scripts : [];
                const isCurrentCharEnabled = characterEnabledList.includes(currentChar.avatar);

                if (isCurrentCharEnabled) {
                    const characterScriptsRepository = currentChar.data?.extensions?.[JSR_CHAR_EXTENSION_KEY];
                    const flatCharacterScripts = flattenJsrScripts(characterScriptsRepository);
                    processScripts(flatCharacterScripts);
                }
            }
        }
    }

    console.log(`[${Constants.EXTENSION_NAME} Debug] Final fetch results - Chat (incl. Char & JS): ${finalChatReplies.length}, Global: ${finalGlobalReplies.length}`);
    return { chat: finalChatReplies, global: finalGlobalReplies };
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

    const buttonNameHash = getStringHash(buttonLabel);
    const eventName = `${scriptId}_${buttonNameHash}`;

    console.log(`[${Constants.EXTENSION_NAME}] Triggering JS Runner Script: Event='${eventName}' (Label: "${buttonLabel}", Hash: "${buttonNameHash}")`);
    try {
        await stContext.eventSource.emit(eventName);
    } catch (error) {
        console.error(`[${Constants.EXTENSION_NAME}] Error emitting JS Runner script event "${eventName}":`, error);
    }
}
