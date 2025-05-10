// api.js
import * as Constants from './constants.js';
import { setMenuVisible } from './state.js';

// 尝试获取 SillyTavern 上下文
// 使用问号?.进行安全访问，即使 SillyTavern 或 getContext 不存在也不会报错
const stContext = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null;

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
    console.log(`[${Constants.EXTENSION_NAME} Debug] fetchQuickReplies called.`);
    let chatReplies = [];
    const globalReplies = [];
    const chatQrLabels = new Set(); // To track labels and avoid duplicates in chat section

    // --- 1. 获取标准 Quick Reply v2 ---
    // 这部分代码保持不变，它依赖于 window.quickReplyApi
    if (!window.quickReplyApi) {
        console.warn(`[${Constants.EXTENSION_NAME}] Quick Reply API (window.quickReplyApi) not found! Cannot fetch standard replies.`);
    } else {
        const qrApi = window.quickReplyApi;
        // 只有明确 isEnabled === false 才算禁用，undefined 或 true 都算启用
        if (qrApi.settings?.isEnabled === false) {
            console.log(`[${Constants.EXTENSION_NAME}] Core Quick Reply v2 is disabled. Skipping standard reply fetch.`);
        } else {
            console.log(`[${Constants.EXTENSION_NAME}] Fetching standard Quick Replies...`);
            try {
                // Fetch Chat Quick Replies
                if (qrApi.settings?.chatConfig?.setList) {
                    qrApi.settings.chatConfig.setList.forEach(setLink => {
                        // 检查 setLink 和 set 是否存在，是否可见，以及 qrList 是否存在且是数组
                        if (setLink?.isVisible && setLink.set?.qrList && Array.isArray(setLink.set.qrList)) {
                            setLink.set.qrList.forEach(qr => {
                                // 检查 qr 对象是否存在，是否隐藏，以及 label 是否存在且非空
                                if (qr && !qr.isHidden && qr.label && qr.label.trim() !== "") {
                                    const label = qr.label.trim();
                                    if (!chatQrLabels.has(label)) { // 避免与已添加的重复
                                        chatReplies.push({
                                            setName: setLink.set.name || 'Unknown Set',
                                            label: label,
                                            message: qr.message || `(标准回复: ${label})`,
                                            isStandard: true,
                                            source: 'QuickReplyV2' // 额外标识来源
                                        });
                                        chatQrLabels.add(label);
                                    }
                                }
                            });
                        }
                    });
                } else {
                     console.warn(`[${Constants.EXTENSION_NAME}] Could not find chatConfig.setList in quickReplyApi settings.`);
                }

                // Fetch Global Quick Replies
                if (qrApi.settings?.config?.setList) {
                    qrApi.settings.config.setList.forEach(setLink => {
                        // 检查 setLink 和 set 是否存在，是否可见，以及 qrList 是否存在且是数组
                        if (setLink?.isVisible && setLink.set?.qrList && Array.isArray(setLink.set.qrList)) {
                            setLink.set.qrList.forEach(qr => {
                                // 检查 qr 对象是否存在，是否隐藏，以及 label 是否存在且非空
                                if (qr && !qr.isHidden && qr.label && qr.label.trim() !== "") {
                                     const label = qr.label.trim();
                                    // 只有当标签在聊天回复中不存在时，才添加到全局回复列表
                                    if (!chatQrLabels.has(label)) {
                                        globalReplies.push({
                                            setName: setLink.set.name || 'Unknown Set',
                                            label: label,
                                            message: qr.message || `(标准回复: ${label})`,
                                            isStandard: true,
                                            source: 'QuickReplyV2' // 额外标识来源
                                        });
                                    }
                                }
                            });
                        }
                    });
                } else {
                     console.warn(`[${Constants.EXTENSION_NAME}] Could not find config.setList in quickReplyApi settings.`);
                }
                const standardChatCount = chatReplies.filter(r => r.source === 'QuickReplyV2').length;
                console.log(`[${Constants.EXTENSION_NAME}] Fetched Standard Replies - Chat: ${standardChatCount}, Global: ${globalReplies.length}`);
            } catch (error) {
                console.error(`[${Constants.EXTENSION_NAME}] Error fetching standard quick replies:`, error);
            }
        }
    }

    // --- 2. 从 JS-Slash-Runner 设置中获取脚本按钮 ---
    console.log(`[${Constants.EXTENSION_NAME} Debug] Attempting to fetch JS Runner buttons from settings via SillyTavern.extensionSettings...`);

    // *** 核心修改点：通过 stContext.extensionSettings 访问设置 ***
    // 使用 ?. 安全地访问 stContext 和 extensionSettings
    const jsRunnerSettings = stContext?.extensionSettings?.[JSR_SETTINGS_KEY];

    if (!stContext) {
         console.warn(`[${Constants.EXTENSION_NAME}] SillyTavern context (window.SillyTavern) not available. Cannot fetch JS Runner buttons.`);
    } else if (!stContext.extensionSettings) {
         console.warn(`[${Constants.EXTENSION_NAME}] SillyTavern.extensionSettings not available. Cannot fetch JS Runner buttons.`);
    } else if (!jsRunnerSettings) {
        // 打印更详细的警告，说明在 SillyTavern.extensionSettings 中找不到键
        console.warn(`[${Constants.EXTENSION_NAME}] JS-Slash-Runner settings ('${JSR_SETTINGS_KEY}') not found in SillyTavern.extensionSettings. JS-Slash-Runner might not be loaded or enabled.`);
    } else if (jsRunnerSettings.enabled_extension === false) { // 检查 JS-Slash-Runner 插件是否启用
        console.log(`[${Constants.EXTENSION_NAME}] JS-Slash-Runner plugin is disabled in its settings. Skipping its button fetch.`);
    } else {
        const processScripts = (scripts, scriptType, typeEnabled) => {
             if (!typeEnabled) {
                 console.log(`[${Constants.EXTENSION_NAME} Debug] JS-Slash-Runner ${scriptType} script type is disabled.`);
                 return;
             }
            if (!scripts || !Array.isArray(scripts)) {
                console.log(`[${Constants.EXTENSION_NAME} Debug] No ${scriptType} scripts found or scripts is not an array in JS-Slash-Runner settings.`);
                return;
            }

            scripts.forEach(script => {
                // 检查单个脚本是否启用且有按钮列表
                if (script && script.enabled && script.buttons && Array.isArray(script.buttons)) {
                    script.buttons.forEach(button => {
                        // 检查按钮是否可见且有名称
                        if (button && button.visible && button.name && button.name.trim() !== "") {
                            const label = button.name.trim();
                            // 避免重复添加相同标签的按钮
                            if (!chatQrLabels.has(label)) {
                                chatReplies.push({
                                    setName: script.name || 'JS脚本', // 使用脚本名作为分类或默认名
                                    label: label,
                                    message: `(JS脚本: ${script.name || '未命名'})`, // 内部描述
                                    isStandard: false, // 标记为非标准QR，而是JS Runner代理
                                    scriptId: script.id, // 存储脚本ID用于后续事件触发
                                    source: 'JSSlashRunner' // 额外标识来源
                                });
                                chatQrLabels.add(label); // 记录已添加的JS按钮标签
                                // console.log(`[${Constants.EXTENSION_NAME} Debug] Added JS Runner button: Script='${script.name}', Label='${label}', ID='${script.id}'`); // Verbose log
                            } else {
                                // console.log(`[${Constants.EXTENSION_NAME} Debug] Skipping duplicate JS Runner button (label already exists): Script='${script.name}', Label='${label}'`); // Verbose log
                            }
                        }
                    });
                }
            });
        };

        // 处理全局脚本
        // 检查全局脚本类型是否启用，默认启用
        const globalScriptTypeEnabled = jsRunnerSettings.script?.global_script_enabled !== false;
        processScripts(jsRunnerSettings.script?.scriptsRepository, 'global', globalScriptTypeEnabled);

        // 处理角色脚本
        // 检查 SillyTavern 上下文、角色数据和当前角色ID是否存在
        if (stContext?.characters && typeof stContext.this_chid !== 'undefined' && stContext.this_chid !== null) {
            const currentChar = stContext.characters[stContext.this_chid];
            // 检查当前角色数据和 avatar 是否存在
            if (currentChar && currentChar.avatar) {
                // 检查角色脚本类型是否启用，默认启用类型
                const characterScriptsTypeEnabled = jsRunnerSettings.script?.characters_with_scripts_enabled !== false;
                // 获取角色启用列表，如果不存在则为空数组
                const characterEnabledList = Array.isArray(jsRunnerSettings.script?.characters_with_scripts) ? jsRunnerSettings.script.characters_with_scripts : [];
                // 检查当前角色的 avatar 是否在启用列表中
                const isCurrentCharEnabled = characterEnabledList.includes(currentChar.avatar);

                // 如果角色脚本类型启用且当前角色在启用列表中
                if (characterScriptsTypeEnabled && isCurrentCharEnabled) {
                    // JS-Slash-Runner 将角色脚本存在 extensions.TavernHelper_scripts
                    // 使用 ?. 安全地访问角色数据和 extensions
                    const characterScripts = currentChar.data?.extensions?.[JSR_CHAR_EXTENSION_KEY];
                    processScripts(characterScripts, 'character', true); // 角色类型已启用且当前角色在列表中，则处理其脚本
                } else {
                    console.log(`[${Constants.EXTENSION_NAME} Debug] JS-Slash-Runner character scripts are disabled for current character (Type enabled: ${characterScriptsTypeEnabled}, Current char in list: ${isCurrentCharEnabled}).`);
                }
            } else {
                 console.log(`[${Constants.EXTENSION_NAME} Debug] No character selected or character data incomplete for JS Runner character scripts.`);
            }
        } else {
             console.log(`[${Constants.EXTENSION_NAME} Debug] SillyTavern context does not indicate a character is selected for JS Runner character scripts.`);
        }
         const jsRunnerChatCount = chatReplies.filter(r => r.source === 'JSSlashRunner').length;
         if (jsRunnerChatCount > 0) {
            console.log(`[${Constants.EXTENSION_NAME}] Successfully fetched ${jsRunnerChatCount} JS Runner buttons.`);
         } else if (jsRunnerSettings.enabled_extension !== false) {
            console.log(`[${Constants.EXTENSION_NAME}] No JS Runner buttons found or all were duplicates/disabled.`);
         }
    }
    // --- JS Runner 按钮获取结束 ---

    console.log(`[${Constants.EXTENSION_NAME} Debug] Final fetch results - Chat (incl. JS): ${chatReplies.length}, Global: ${globalReplies.length}`);
    return { chat: chatReplies, global: globalReplies };
}


/**
 * Triggers a specific standard quick reply using the API.
 * (此函数只处理 isStandard: true 的情况，由 event handler 决定调用)
 * @param {string} setName
 * @param {string} label
 */
export async function triggerQuickReply(setName, label) {
    if (!window.quickReplyApi) {
        console.error(`[${Constants.EXTENSION_NAME}] Quick Reply API not found! Cannot trigger standard reply.`);
        return;
    }
    // 只有明确 isEnabled === false 才算禁用
    if (window.quickReplyApi.settings?.isEnabled === false) {
         console.log(`[${Constants.EXTENSION_NAME}] Core Quick Reply v2 is disabled. Cannot trigger standard reply.`);
         return;
    }

    console.log(`[${Constants.EXTENSION_NAME}] Triggering Standard Quick Reply: "${setName}.${label}"`);
    try {
        // 调用 Quick Reply v2 的 API 方法
        await window.quickReplyApi.executeQuickReply(setName, label);
        console.log(`[${Constants.EXTENSION_NAME}] Standard Quick Reply "${setName}.${label}" executed successfully.`);
    } catch (error) {
        console.error(`[${Constants.EXTENSION_NAME}] Failed to execute Standard Quick Reply "${setName}.${label}":`, error);
    }
}

/**
 * Triggers a specific JS-Slash-Runner script button via its event.
 * (此函数只处理 isStandard: false 的情况)
 * @param {string} scriptId - The ID of the script.
 * @param {string} buttonLabel - The label of the button within the script.
 */
export async function triggerJsRunnerScript(scriptId, buttonLabel) {
    // 确保 SillyTavern 上下文和 eventSource 可用
    if (!stContext || !stContext.eventSource || typeof stContext.eventSource.emit !== 'function') {
        console.error(`[${Constants.EXTENSION_NAME}] SillyTavern context or eventSource not available. Cannot trigger JS Runner script.`);
        return;
    }

    // 检查 JS-Slash-Runner 插件是否启用 (通过 SillyTavern.extensionSettings 检查)
    // 使用 ?. 安全地访问 stContext 和 extensionSettings
    const jsRunnerSettings = stContext.extensionSettings?.[JSR_SETTINGS_KEY];
    if (!jsRunnerSettings) {
         console.log(`[${Constants.EXTENSION_NAME}] JS-Slash-Runner settings ('${JSR_SETTINGS_KEY}') not found in SillyTavern.extensionSettings. Cannot trigger script event.`);
        return;
    }
    if (jsRunnerSettings.enabled_extension === false) {
        console.log(`[${Constants.EXTENSION_NAME}] JS-Slash-Runner plugin is disabled. Cannot trigger script event.`);
        return;
    }

    // 构造 JS-Slash-Runner 按钮事件名
    const eventName = `${scriptId}_${buttonLabel}`;
    console.log(`[${Constants.EXTENSION_NAME}] Triggering JS Runner Script: Event='${eventName}' (ScriptID='${scriptId}', Button='${buttonLabel}')`);

    try {
        // 使用 SillyTavern 的 eventSource 发射事件
        // JS-Slash-Runner 的 An 类的 bindEvents 方法绑定了对这个事件的监听
        await stContext.eventSource.emit(eventName);
        console.log(`[${Constants.EXTENSION_NAME}] JS Runner script event "${eventName}" emitted successfully.`);
    } catch (error) {
        console.error(`[${Constants.EXTENSION_NAME}] Error emitting JS Runner script event "${eventName}":`, error);
    }
}
