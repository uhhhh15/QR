// api.js（修复QRv2优先级过滤BUG + 保留角色QR支持和最新哈希）
import * as Constants from './constants.js';
import { setMenuVisible } from './state.js';

// JS-Slash-Runner 在 extension_settings 中使用的键名
const JSR_SETTINGS_KEY = "TavernHelper";
// 新版 JSR (v4+) 使用的小写键名
const JSR_DATA_KEY = "tavern_helper";
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
 * 辅助函数：将 JSR 脚本数据结构"拍平"。
 * 这个版本修正了逻辑顺序，可以正确处理旧版 JSR 的数据结构。
 * @param {Array<object>} items - 从 JSR 设置中获取的原始脚本/文件夹列表。
 * @returns {Array<object>} - 一个只包含纯脚本对象的扁平数组。
 */
function flattenJsrScripts(items) {
    if (!items || !Array.isArray(items)) {
        return [];
    }
    const flatScripts = [];
    const processItem = (item) => {
        if (!item) return;

        // 修复了对 JSR 数据结构的解析逻辑
        if (item.type === 'folder' && Array.isArray(item.value)) {
            // 1. 如果是文件夹，遍历其 value 数组
            item.value.forEach(scriptInFolder => {
                // 确保文件夹内的对象也是有效的脚本对象
                if (scriptInFolder && scriptInFolder.id) {
                    flatScripts.push(scriptInFolder);
                }
            });
        }
        else if (item.type === 'script') {
            // 2. 如果类型是 'script'
            if (item.value) {
                // 新结构: { type: 'script', value: {...} }
                flatScripts.push(item.value);
            } else if (item.id) {
                // 兼容结构: { type: 'script', id: '...', ... } (没有 value 包装)
                // 这是之前遗漏的关键情况！
                flatScripts.push(item);
            }
        }
        else if (!item.type && item.id) {
            // 3. 最旧的扁平结构，没有 type 字段
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
 * 默认禁用同名过滤机制，但原有逻辑进行保留，只进行注释，不修改原有处理逻辑
 */
export function fetchQuickReplies() {
    const stContext = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null;

    console.log(`[${Constants.EXTENSION_NAME} Debug] fetchQuickReplies called (No-Filter Mode).`);

    const finalChatReplies = [];
    const finalGlobalReplies = [];
    // const processedLabels = new Set(); // 已禁用同名过滤

    // --- 1. 获取并处理标准 Quick Reply v2 (逻辑不变) ---
    const processedSetNames = new Set();
    if (window.quickReplyApi && window.quickReplyApi.settings?.isEnabled !== false) {
        const qrApi = window.quickReplyApi;
        const processQrLevel = (setList, destinationList) => {
            if (!setList || !Array.isArray(setList)) return;
            setList.forEach(setLink => {
                const setName = setLink?.set?.name;
                if (!setName || processedSetNames.has(setName)) return;
                processedSetNames.add(setName);
                if (setLink?.isVisible && setLink.set?.qrList) {
                    setLink.set.qrList.forEach(qr => {
                        if (qr && !qr.isHidden && qr.label) {
                            const label = qr.label.trim();
                            // 修改点: 移除了 !processedLabels.has(label)
                            if (label) {
                                destinationList.push({ setName, label, message: qr.message || `(Standard Reply: ${label})`, isStandard: true, source: 'QuickReplyV2' });
                                // processedLabels.add(label); // 已禁用
                            }
                        }
                    });
                }
            });
        };
        processQrLevel(qrApi.settings?.chatConfig?.setList, finalChatReplies);
        processQrLevel(qrApi.settings?.charConfig?.setList, finalChatReplies);
        processQrLevel(qrApi.settings?.config?.setList, finalGlobalReplies);
    }

    // --- 2. 获取并处理 Tavern Helper / JSR 按钮 ---
    const jsRunnerSettings = stContext?.extensionSettings?.[JSR_SETTINGS_KEY];
    const newApi = (typeof TavernHelper !== 'undefined' && TavernHelper.getAllEnabledScriptButtons) || 
                   (stContext?.TavernHelper && stContext.TavernHelper.getAllEnabledScriptButtons);
                   
    if (!stContext) {
        console.warn(`[${Constants.EXTENSION_NAME}] SillyTavern context not available.`);
    } else if (typeof newApi === 'function' && jsRunnerSettings) {
        // --- PATH A: 使用新版运行时 API ---
        console.log(`[${Constants.EXTENSION_NAME}] Using new Tavern Helper runtime API.`);
        const enabledButtonsMap = newApi();

        const scriptNameMap = new Map();
        const allScripts = [];

        const jsrGlobalSettings = stContext?.extensionSettings?.[JSR_DATA_KEY] || stContext?.extensionSettings?.[JSR_SETTINGS_KEY];
        if (jsrGlobalSettings?.script?.scripts) {
            allScripts.push(...flattenJsrScripts(jsrGlobalSettings.script.scripts));
        }

        const presetName = stContext.presetName;
        if (presetName) {
            const presetJsrSettings = stContext.presets?.[presetName]?.extensions?.[JSR_DATA_KEY] || stContext.presets?.[presetName]?.extensions?.[JSR_SETTINGS_KEY];
            if (presetJsrSettings?.scripts) {
                allScripts.push(...flattenJsrScripts(presetJsrSettings.scripts));
            }
        }

        const characterId = stContext.characterId;
        if (characterId != null) {
            const characterScriptsRaw = stContext.characters?.[characterId]?.data?.extensions?.[JSR_DATA_KEY] || stContext.characters?.[characterId]?.data?.extensions?.[JSR_SETTINGS_KEY];
            if (characterScriptsRaw) {
                let characterSettingsObject = characterScriptsRaw;
                if (Array.isArray(characterScriptsRaw)) {
                    try {
                        characterSettingsObject = Object.fromEntries(characterScriptsRaw);
                    } catch (e) {
                        console.error(`[${Constants.EXTENSION_NAME}] Failed to convert character scripts from array to object.`, e);
                        characterSettingsObject = {};
                    }
                }

                if (characterSettingsObject?.scripts) {
                    allScripts.push(...flattenJsrScripts(characterSettingsObject.scripts));
                }
            }
        }

        allScripts.forEach(script => scriptNameMap.set(script.id, script.name));

        for (const script_id in enabledButtonsMap) {
            const buttons = enabledButtonsMap[script_id];
            buttons.forEach(button => {
                const label = button.button_name.trim();
                // 修改点: 移除了 !processedLabels.has(label)
                if (label) {
                    const scriptName = scriptNameMap.get(script_id) || 'JS Script';
                    finalChatReplies.push({
                        setName: scriptName,
                        label: label,
                        message: `(JS Script: ${scriptName})`,
                        isStandard: false,
                        source: 'JSSlashRunner',
                        isApiBased: true,
                        buttonId: button.button_id,
                        scriptId: script_id
                    });
                    // processedLabels.add(label); // 已禁用
                }
            });
        }

    } else if (jsRunnerSettings && jsRunnerSettings.enabled_extension !== false) {
        // --- PATH B: 回退到旧版手动解析设置的逻辑 (保持原始逻辑不变) ---
        console.log(`[${Constants.EXTENSION_NAME}] Tavern Helper API not found. Falling back to legacy settings parsing.`);

        const processScripts = (scripts) => {
            if (!scripts || !Array.isArray(scripts)) return;
            scripts.forEach(script => {
                if (script && script.enabled && script.buttons && Array.isArray(script.buttons)) {
                    script.buttons.forEach(button => {
                        if (button && button.visible && button.name) {
                            const label = button.name.trim();
                            // 修改点: 移除了 !processedLabels.has(label)
                            if (label) {
                                finalChatReplies.push({
                                    setName: script.name || 'JS Script',
                                    label: label,
                                    message: `(JS Script: ${script.name || 'Untitled'})`,
                                    isStandard: false,
                                    source: 'JSSlashRunner',
                                    isApiBased: false,
                                    scriptId: script.id
                                });
                                // processedLabels.add(label); // 已禁用
                            }
                        }
                    });
                }
            });
        };

        if (jsRunnerSettings.script?.global_script_enabled !== false) {
            processScripts(flattenJsrScripts(jsRunnerSettings.script?.scriptsRepository));
        }

        const characterId = stContext.characterId;
        if (stContext.characters && characterId != null) {
            const currentChar = stContext.characters[characterId];
            if (currentChar && currentChar.avatar) {
                const characterEnabledList = Array.isArray(jsRunnerSettings.script?.characters_with_scripts) ? jsRunnerSettings.script.characters_with_scripts : [];
                if (characterEnabledList.includes(currentChar.avatar)) {
                    const characterScripts = currentChar.data?.extensions?.[JSR_CHAR_EXTENSION_KEY];
                    processScripts(flattenJsrScripts(characterScripts));
                }
            }
        }
    }

    // --- 3. 从 LittleWhiteBox (LWB) 获取任务按钮 (逻辑不变) ---
    if (window.XBTasks && typeof window.XBTasks.dump === 'function') {
        try {
            const lwbTasks = window.XBTasks.dump('all');
            const processLwbTasks = (tasks, scope, destinationList) => {
                if (!Array.isArray(tasks)) return;
                tasks.forEach(task => {
                    if (task && !task.disabled && task.name) {
                        const label = task.name.trim();
                        // 修改点: 移除了 !processedLabels.has(label)
                        if (label) {
                            destinationList.push({
                                setName: `LWB-${scope.charAt(0).toUpperCase()}`,
                                label: label,
                                message: task.commands || `(LWB Task: ${label})`,
                                isStandard: false, source: 'LittleWhiteBox',
                                taskId: task.name, taskScope: scope,
                            });
                            // processedLabels.add(label); // 已禁用
                        }
                    }
                });
            };
            processLwbTasks(lwbTasks.character, 'character', finalChatReplies);
            processLwbTasks(lwbTasks.global, 'global', finalGlobalReplies);
            processLwbTasks(lwbTasks.preset, 'preset', finalGlobalReplies);
        } catch (error) {
            console.error(`[${Constants.EXTENSION_NAME}] Error fetching LWB tasks:`, error);
        }
    }

    console.log(`[${Constants.EXTENSION_NAME} Debug] Final fetch results - Chat: ${finalChatReplies.length}, Global: ${finalGlobalReplies.length}`);
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
 * This function now supports both new API-based and legacy trigger modes.
 * @param {object} replyData - The reply data object containing trigger information.
 */
export async function triggerJsRunnerScript(replyData) {
    const stContext = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null;

    if (!stContext || !stContext.eventSource || typeof stContext.eventSource.emit !== 'function') {
        console.error(`[${Constants.EXTENSION_NAME}] SillyTavern context or eventSource not available.`);
        return;
    }

    if (replyData.isApiBased) {
        // --- PATH A: 新版 API 触发 ---
        const eventName = replyData.buttonId;
        if (!eventName) {
            console.error(`[${Constants.EXTENSION_NAME}] API-based trigger failed: buttonId is missing.`);
            return;
        }
        console.log(`[${Constants.EXTENSION_NAME}] Triggering Tavern Helper Script (API Mode): '${eventName}'`);
        try {
            await stContext.eventSource.emit(eventName);
        } catch (error) {
            console.error(`[${Constants.EXTENSION_NAME}] Error emitting new API event "${eventName}":`, error);
        }
    } else {
        // --- PATH B: 旧版兼容触发 ---
        const { scriptId, label: buttonLabel } = replyData;
        if (!scriptId || !buttonLabel) {
             console.error(`[${Constants.EXTENSION_NAME}] Legacy trigger failed: scriptId or label is missing.`);
            return;
        }

        // 为新版JSR(pre-API)生成基于哈希的事件名
        const buttonNameHash = getStringHash(buttonLabel);
        const newEventName = `${scriptId}_${buttonNameHash}`;

        // 为旧版JSR生成基于原始标签的事件名
        const oldEventName = `${scriptId}_${buttonLabel}`;

        console.log(`[${Constants.EXTENSION_NAME}] Triggering JS Runner Script (Legacy Compatibility Mode):`);
        console.log(`  - For hash-based JSR: '${newEventName}'`);
        console.log(`  - For label-based JSR: '${oldEventName}'`);

        try {
            await stContext.eventSource.emit(newEventName);
        } catch (error) { /* Expected to fail on older versions */ }

        try {
            await stContext.eventSource.emit(oldEventName);
        } catch (error) { /* Expected to fail on newer versions */ }
    }
}

/**
 * Triggers a specific LittleWhiteBox task using its global execution function.
 * @param {string} taskName - The name of the task to execute.
 */
export async function triggerLwbTask(taskName) {
    if (typeof window.xbqte === 'function') {
        console.log(`[${Constants.EXTENSION_NAME}] Triggering LittleWhiteBox Task: "${taskName}"`);
        try {
            await window.xbqte(taskName);
        } catch (error) {
            console.error(`[${Constants.EXTENSION_NAME}] Failed to execute LittleWhiteBox Task "${taskName}":`, error);
        }
    } else {
        console.error(`[${Constants.EXTENSION_NAME}] LWB execution function (window.xbqte) not found!`);
    }
}
