// api.js
import * as Constants from './constants.js';
import { setMenuVisible } from './state.js'; // 假设 state.js 仍然存在且被需要

/**
 * Fetches chat and global quick replies from the quickReplyApi.
 * Checks if the main Quick Reply v2 extension is enabled before fetching.
 * Note: Still relies on accessing internal settings structure.
 * @returns {{ chat: Array<object>, global: Array<object> }}
 */
export function fetchQuickReplies() {
    const chatReplies = [];
    const globalReplies = [];
    const chatQrLabels = new Set(); // To track labels and avoid duplicates in global

    if (!window.quickReplyApi) {
        console.error(`[${Constants.EXTENSION_NAME}] Quick Reply API (window.quickReplyApi) not found! Cannot fetch replies.`);
        return { chat: [], global: [] };
    }

    const qrApi = window.quickReplyApi;

    // --- 新增检查 ---
    // 检查 Quick Reply v2 扩展本身是否启用
    // 同时检查 settings 对象是否存在，以防万一
    // 注意：我们假设 isEnabled=true 或 undefined 时都算启用，只有明确为 false 才算禁用
    if (!qrApi.settings || qrApi.settings.isEnabled === false) {
        console.log(`[${Constants.EXTENSION_NAME}] Core Quick Reply v2 is disabled. Skipping reply fetch.`);
        // 直接返回空数组，不进行后续获取
        return { chat: [], global: [] };
    }
    // --- 检查结束 ---


    try {
        // Fetch Chat Quick Replies (Accessing internal settings)
        // 只有在主 Quick Reply v2 启用时才继续获取
        if (qrApi.settings?.chatConfig?.setList) {
            qrApi.settings.chatConfig.setList.forEach(setLink => {
                if (setLink?.isVisible && setLink.set?.qrList) {
                    setLink.set.qrList.forEach(qr => {
                        if (qr && !qr.isHidden && qr.label) { // Added check for qr object and label
                            chatReplies.push({
                                setName: setLink.set.name || 'Unknown Set',
                                label: qr.label,
                                message: qr.message || '(无消息内容)'
                            });
                            chatQrLabels.add(qr.label);
                        }
                    });
                }
            });
        } else {
             console.warn(`[${Constants.EXTENSION_NAME}] Could not find chatConfig.setList in quickReplyApi settings.`);
        }

        // Fetch Global Quick Replies (Accessing internal settings)
        // 只有在主 Quick Reply v2 启用时才继续获取
        if (qrApi.settings?.config?.setList) {
            qrApi.settings.config.setList.forEach(setLink => {
                if (setLink?.isVisible && setLink.set?.qrList) {
                    setLink.set.qrList.forEach(qr => {
                        // Only add if not hidden and label doesn't exist in chat replies
                        if (qr && !qr.isHidden && qr.label && !chatQrLabels.has(qr.label)) {
                            globalReplies.push({
                                setName: setLink.set.name || 'Unknown Set',
                                label: qr.label,
                                message: qr.message || '(无消息内容)'
                            });
                        }
                    });
                }
            });
        } else {
             console.warn(`[${Constants.EXTENSION_NAME}] Could not find config.setList in quickReplyApi settings.`);
        }

        console.log(`[${Constants.EXTENSION_NAME}] Fetched Replies - Chat: ${chatReplies.length}, Global: ${globalReplies.length}`);

    } catch (error) {
        console.error(`[${Constants.EXTENSION_NAME}] Error fetching quick replies:`, error);
        // Return empty arrays on error to prevent issues down the line
        return { chat: [], global: [] };
    }

    return { chat: chatReplies, global: globalReplies };
}


/**
 * Triggers a specific quick reply using the API.
 * @param {string} setName
 * @param {string} label
 */
export async function triggerQuickReply(setName, label) {
    if (!window.quickReplyApi) {
        console.error(`[${Constants.EXTENSION_NAME}] Quick Reply API not found! Cannot trigger reply.`);
        // setMenuVisible(false); // 让调用者处理 UI 状态
        return; // Indicate failure or inability to proceed
    }

    // --- 新增检查 ---
    // 触发前也检查主 Quick Reply v2 是否启用
    if (!window.quickReplyApi.settings || window.quickReplyApi.settings.isEnabled === false) {
         console.log(`[${Constants.EXTENSION_NAME}] Core Quick Reply v2 is disabled. Cannot trigger reply.`);
         // setMenuVisible(false); // 让调用者处理 UI 状态
         return;
    }
    // --- 检查结束 ---

    console.log(`[${Constants.EXTENSION_NAME}] Triggering Quick Reply: "${setName}.${label}"`);
    try {
        // 假设 qrApi.executeQuickReply 是正确的 API 调用方法
        // 注意：根据 QuickReplyApi.js.txt，实际方法是 executeQuickReply
        await window.quickReplyApi.executeQuickReply(setName, label);
        console.log(`[${Constants.EXTENSION_NAME}] Quick Reply "${setName}.${label}" executed successfully.`);
    } catch (error) {
        console.error(`[${Constants.EXTENSION_NAME}] Failed to execute Quick Reply "${setName}.${label}":`, error);
        // 让调用者处理 UI 关闭，即使出错
    }
    // 不需要在这里设置 setMenuVisible(false)
}
