// api.js
import * as Constants from './constants.js';

/**
 * Fetches chat and global quick replies from the quickReplyApi,
 * AND scans for JS Slash Runner buttons to add as chat replies.
 * Includes enhanced logging for debugging.
 * @returns {{ chat: Array<object>, global: Array<object> }}
 */
export function fetchQuickReplies() {
    console.log(`[${Constants.EXTENSION_NAME} Debug] fetchQuickReplies called.`);
    let chatReplies = [];
    const globalReplies = [];
    const chatQrLabels = new Set();

    // --- Standard Quick Reply v2 Fetching ---
    // (保持不变)
    if (!window.quickReplyApi) {
        console.warn(`[${Constants.EXTENSION_NAME}] Quick Reply API (window.quickReplyApi) not found! Cannot fetch standard replies.`);
    } else {
        const qrApi = window.quickReplyApi;
        if (!qrApi.settings || qrApi.settings.isEnabled === false) {
            console.log(`[${Constants.EXTENSION_NAME}] Core Quick Reply v2 is disabled. Skipping standard reply fetch.`);
        } else {
            try {
                // Fetch Chat Quick Replies (Standard)
                if (qrApi.settings?.chatConfig?.setList) {
                    qrApi.settings.chatConfig.setList.forEach(setLink => {
                        if (setLink?.isVisible && setLink.set?.qrList) {
                            setLink.set.qrList.forEach(qr => {
                                if (qr && !qr.isHidden && qr.label) {
                                    chatReplies.push({
                                        setName: setLink.set.name || 'Unknown Set',
                                        label: qr.label,
                                        message: qr.message || '(无消息内容)',
                                        isStandard: true,
                                    });
                                    chatQrLabels.add(qr.label);
                                }
                            });
                        }
                    });
                }
                // Fetch Global Quick Replies (Standard)
                if (qrApi.settings?.config?.setList) {
                     qrApi.settings.config.setList.forEach(setLink => {
                        if (setLink?.isVisible && setLink.set?.qrList) {
                            setLink.set.qrList.forEach(qr => {
                                if (qr && !qr.isHidden && qr.label && !chatQrLabels.has(qr.label)) {
                                    globalReplies.push({
                                        setName: setLink.set.name || 'Unknown Set',
                                        label: qr.label,
                                        message: qr.message || '(无消息内容)',
                                        isStandard: true,
                                    });
                                }
                            });
                        }
                    });
                }
                 console.log(`[${Constants.EXTENSION_NAME} Debug] Fetched ${chatReplies.length} standard chat QR, ${globalReplies.length} standard global QR.`);
            } catch (error) {
                console.error(`[${Constants.EXTENSION_NAME}] Error fetching standard quick replies:`, error);
            }
        }
    }
    // --- End Standard Fetching ---

    // --- Enhanced JS Slash Runner Button Scanning ---
    console.log(`[${Constants.EXTENSION_NAME} Debug] Starting JS Runner button scan...`);
    try {
        const jsRunnerButtonContainerId = 'TH-script-buttons';
        const jsRunnerButtonContainer = document.getElementById(jsRunnerButtonContainerId);

        if (jsRunnerButtonContainer) {
            console.log(`[${Constants.EXTENSION_NAME} Debug] Found container #${jsRunnerButtonContainerId}:`, jsRunnerButtonContainer);

            // --- 重要修改：使用正确的选择器查找 div ---
            const jsRunnerButtons = jsRunnerButtonContainer.querySelectorAll('div.qr--button.menu_button.interactable');

            console.log(`[${Constants.EXTENSION_NAME} Debug] Found ${jsRunnerButtons.length} 'div.qr--button' elements inside.`); // 更新日志

            const scannedLabels = new Set();

            if (jsRunnerButtons.length > 0) {
                jsRunnerButtons.forEach((buttonDiv, index) => { // 现在变量是 buttonDiv
                    const label = buttonDiv.textContent?.trim();
                    console.log(`[${Constants.EXTENSION_NAME} Debug] Scanning button #${index}: Label='${label}', Element:`, buttonDiv);

                    if (label && label !== '' && !scannedLabels.has(label)) {
                        console.log(`[${Constants.EXTENSION_NAME} Debug] Adding JS Runner button: Label='${label}'`);
                        chatReplies.push({
                            setName: 'JS脚本按钮',
                            label: label,
                            message: `jsrunner_button_${label}`,
                            isStandard: false,
                        });
                        scannedLabels.add(label);
                    } else if (label && scannedLabels.has(label)) {
                        console.log(`[${Constants.EXTENSION_NAME} Debug] Skipping duplicate JS Runner label: '${label}'`);
                    } else if (!label || label === '') {
                         console.log(`[${Constants.EXTENSION_NAME} Debug] Skipping button #${index} due to empty label.`);
                    }
                });
                console.log(`[${Constants.EXTENSION_NAME} Debug] Finished scanning JS Runner buttons. Added ${scannedLabels.size} unique buttons.`);
            } else {
                console.log(`[${Constants.EXTENSION_NAME} Debug] No 'div.qr--button' elements found inside #${jsRunnerButtonContainerId}.`); // 更新日志
            }
        } else {
            console.log(`[${Constants.EXTENSION_NAME} Debug] JS Runner button container #${jsRunnerButtonContainerId} NOT FOUND in the DOM.`);
        }
    } catch (error) {
        console.error(`[${Constants.EXTENSION_NAME}] Error during JS Runner button scanning:`, error);
    }
    // --- End Scanning ---

    console.log(`[${Constants.EXTENSION_NAME} Debug] Final fetch results - Chat (incl. JS): ${chatReplies.length}, Global: ${globalReplies.length}`);
    return { chat: chatReplies, global: globalReplies };
}


/**
 * Triggers a standard quick reply using the API.
 * (Keep this function as is)
 * @param {string} setName
 * @param {string} label
 */
export async function triggerQuickReply(setName, label) {
    if (!window.quickReplyApi) {
        console.error(`[${Constants.EXTENSION_NAME}] Quick Reply API not found! Cannot trigger standard reply.`);
        return;
    }
    if (!window.quickReplyApi.settings || window.quickReplyApi.settings.isEnabled === false) {
         console.log(`[${Constants.EXTENSION_NAME}] Core Quick Reply v2 is disabled. Cannot trigger standard reply.`);
         return;
    }
    console.log(`[${Constants.EXTENSION_NAME}] Triggering Standard Quick Reply: "${setName}.${label}"`);
    try {
        await window.quickReplyApi.executeQuickReply(setName, label);
        console.log(`[${Constants.EXTENSION_NAME}] Standard Quick Reply "${setName}.${label}" executed successfully.`);
    } catch (error) {
        console.error(`[${Constants.EXTENSION_NAME}] Failed to execute standard Quick Reply "${setName}.${label}":`, error);
    }
}
