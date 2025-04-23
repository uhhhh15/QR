// ui.js
import * as Constants from './constants.js';
import { fetchQuickReplies } from './api.js';
import { sharedState } from './state.js';
// 导入 extension_settings 以便在 updateIconDisplay 中使用
import { extension_settings } from "./index.js";

// 注意：这个函数现在主要由 index.js 或 settings.js 中的同名函数处理
// 保留在这里可能导致混淆，建议只在一个地方维护
// 如果其他地方确实需要调用 ui.js 的版本，可以保留，否则可以考虑移除
/*
export function updateButtonIconDisplay() {
    const button = sharedState.domElements.rocketButton;
    if (!button) return;

    const settings = extension_settings[Constants.EXTENSION_NAME];
    const iconType = settings.iconType || Constants.ICON_TYPES.ROCKET;
    // ... (实际的图标更新逻辑) ...
    // 建议调用 index.js 或 settings.js 中的 updateIconDisplay
    console.warn("[ui.js] updateButtonIconDisplay called - consider centralizing this logic.");
}
*/

/**
 * Creates the main quick reply button (legacy, kept for reference).
 * @returns {HTMLElement} The created button element.
 */
export function createMenuButton() {
    // This function is kept for reference but no longer used
    const button = document.createElement('button');
    button.id = Constants.ID_BUTTON;
    button.type = 'button';
    button.innerText = '[快速回复]';
    button.setAttribute('aria-haspopup', 'true');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', Constants.ID_MENU);
    return button;
}

/**
 * Creates the main menu element structure.
 * @returns {HTMLElement} The created menu element.
 */
export function createMenuElement() {
    const menu = document.createElement('div');
    menu.id = Constants.ID_MENU;
    // 确保应用了自定义样式类（如果样式设置中存在）
    const settings = extension_settings[Constants.EXTENSION_NAME];
    if (settings.menuStyles && settings.menuStyles.itemBgColor) { // 检查是否有自定义样式
        menu.className = `${Constants.ID_MENU} custom-styled-menu`;
    } else {
         menu.className = Constants.ID_MENU; // 默认类
    }
    menu.setAttribute('role', Constants.ARIA_ROLE_MENU);
    menu.tabIndex = -1; // Allows the menu to be focused programmatically if needed
    menu.style.display = 'none'; // Initially hidden

    const container = document.createElement('div');
    container.className = Constants.CLASS_MENU_CONTAINER;

    // Chat quick replies section
    const chatListContainer = document.createElement('div');
    chatListContainer.id = Constants.ID_CHAT_LIST_CONTAINER;
    chatListContainer.className = Constants.CLASS_LIST;
    chatListContainer.setAttribute('role', Constants.ARIA_ROLE_GROUP);
    chatListContainer.setAttribute('aria-labelledby', `${Constants.ID_CHAT_LIST_CONTAINER}-title`); // ARIA

    const chatTitle = document.createElement('div');
    chatTitle.id = `${Constants.ID_CHAT_LIST_CONTAINER}-title`; // ARIA
    chatTitle.className = Constants.CLASS_LIST_TITLE;
    chatTitle.textContent = '聊天快速回复';

    const chatItems = document.createElement('div');
    chatItems.id = Constants.ID_CHAT_ITEMS;

    chatListContainer.appendChild(chatTitle);
    chatListContainer.appendChild(chatItems);

    // Global quick replies section
    const globalListContainer = document.createElement('div');
    globalListContainer.id = Constants.ID_GLOBAL_LIST_CONTAINER;
    globalListContainer.className = Constants.CLASS_LIST;
    globalListContainer.setAttribute('role', Constants.ARIA_ROLE_GROUP);
    globalListContainer.setAttribute('aria-labelledby', `${Constants.ID_GLOBAL_LIST_CONTAINER}-title`); // ARIA

    const globalTitle = document.createElement('div');
    globalTitle.id = `${Constants.ID_GLOBAL_LIST_CONTAINER}-title`; // ARIA
    globalTitle.className = Constants.CLASS_LIST_TITLE;
    globalTitle.textContent = '全局快速回复';

    const globalItems = document.createElement('div');
    globalItems.id = Constants.ID_GLOBAL_ITEMS;

    globalListContainer.appendChild(globalTitle);
    globalListContainer.appendChild(globalItems);

    // Append sections to container
    container.appendChild(chatListContainer);
    container.appendChild(globalListContainer);
    menu.appendChild(container);

    return menu;
}

/**
 * Creates a single quick reply item (button) for the menu.
 * Adds necessary data attributes for the click handler.
 * @param {object} reply - The quick reply data (can be standard or JS Runner).
 *                         Should contain `label`, `setName`, `message`, and `isStandard`.
 * @returns {HTMLElement} The button element for the menu.
 */
export function createQuickReplyItem(reply) {
    const item = document.createElement('button');
    item.className = Constants.CLASS_ITEM; // Basic class for styling
    item.setAttribute('role', Constants.ARIA_ROLE_MENUITEM);
    item.type = 'button'; // Explicitly set type for button element

    // --- Crucial Data Attributes ---
    item.dataset.setName = reply.setName; // e.g., 'MyPreset' or 'JS脚本按钮'
    item.dataset.label = reply.label;     // The text displayed and used for identification
    // Convert boolean to string for dataset attribute
    item.dataset.isStandard = String(reply.isStandard); // 'true' or 'false'
    // This dataset type is used by the event delegate in events.js
    item.dataset.type = 'quick-reply-item';

    // --- Tooltip (Title Attribute) ---
    if (reply.isStandard) {
        // For standard replies, show the message/command (truncated if long)
        const messageContent = reply.message || '(无消息内容)';
        item.title = messageContent.length > 100
            ? messageContent.slice(0, 97) + '...'
            : messageContent;
    } else {
        // For JS Runner buttons, provide a specific hint
        item.title = `点击以触发原始 '${reply.label}' 脚本按钮`;
    }

    // --- Button Text ---
    item.textContent = reply.label;

    // --- No Visual Distinction Added Here ---
    // We are intentionally *not* adding a specific class like 'jsrunner-qr-item'

    return item;
}

/**
 * Updates the rocket button icon display based on settings.
 * This function might be better placed in index.js or settings.js to avoid potential import issues.
 * However, keeping a version here if ui.js needs to trigger it independently.
 */
export function updateIconDisplay() {
    const button = sharedState.domElements.rocketButton;
    if (!button) return;

    const settings = extension_settings[Constants.EXTENSION_NAME];
    // Ensure settings and defaults are properly handled
    const iconType = settings.iconType || Constants.ICON_TYPES.ROCKET;
    const matchColors = settings.matchButtonColors !== false; // Default true

    // Clear previous content and styles
    button.innerHTML = '';
    // Reset classes, keep interactable and secondary-button as base
    button.className = 'interactable secondary-button';
    // Reset background image styles
    button.style.backgroundImage = '';
    button.style.backgroundSize = '';
    button.style.backgroundPosition = '';
    button.style.backgroundRepeat = '';
    // Reset color explicitly
    button.style.color = ''; // Let CSS handle default color

    // Apply icon based on type
    if (iconType === Constants.ICON_TYPES.CUSTOM && settings.customIconUrl) {
        const customContent = settings.customIconUrl.trim();
        // Logic to handle SVG, Data URL, or regular URL as background-image
        // (Using the robust logic from index.js/settings.js is recommended)
        if (customContent.startsWith('<svg') && customContent.includes('</svg>')) {
            const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(customContent);
            button.style.backgroundImage = `url('${svgDataUrl}')`;
        } else if (customContent.startsWith('data:') || customContent.startsWith('http') || customContent.includes('.')) { // Simple URL check
             button.style.backgroundImage = `url('${customContent}')`;
        } else if (customContent.includes('base64,')) { // Attempt to fix incomplete base64
             let imgUrl = customContent;
             if (!customContent.startsWith('data:')) {
                 imgUrl = 'data:image/png;base64,' + customContent.split('base64,')[1];
             }
             button.style.backgroundImage = `url('${imgUrl}')`;
        } else {
             button.textContent = '?'; // Fallback for unrecognizable format
             console.warn(`[${Constants.EXTENSION_NAME}] Unrecognized custom icon format in updateIconDisplay.`);
        }
        // Apply common background styles if an image was set
        if(button.style.backgroundImage){
            button.style.backgroundSize = '20px 20px';
            button.style.backgroundPosition = 'center';
            button.style.backgroundRepeat = 'no-repeat';
        }

    } else {
        // Apply FontAwesome icon
        const iconClass = Constants.ICON_CLASS_MAP[iconType] || Constants.ICON_CLASS_MAP[Constants.ICON_TYPES.ROCKET];
        button.classList.add('fa-solid', iconClass);
    }

    // Apply color matching if enabled
    if (matchColors) {
        const sendButton = document.getElementById('send_but');
        if (sendButton) {
            const sendButtonStyle = getComputedStyle(sendButton);
            button.style.color = sendButtonStyle.color;
            // Match primary/secondary style
            if (sendButton.classList.contains('primary-button')) {
                button.classList.remove('secondary-button');
                button.classList.add('primary-button');
            } else {
                 button.classList.remove('primary-button'); // Ensure it's not primary if send isn't
                 button.classList.add('secondary-button');
            }
        }
    }
}

/**
 * Renders quick replies (both standard and JS Runner) into the menu containers.
 * @param {Array<object>} chatReplies - Chat-specific quick replies (includes JS Runner buttons).
 * @param {Array<object>} globalReplies - Global quick replies (standard only).
 */
export function renderQuickReplies(chatReplies, globalReplies) {
    const { chatItemsContainer, globalItemsContainer } = sharedState.domElements;
    if (!chatItemsContainer || !globalItemsContainer) {
        console.error(`[${Constants.EXTENSION_NAME}] Menu item containers not found.`);
        return;
    }

    // Clear existing content
    chatItemsContainer.innerHTML = '';
    globalItemsContainer.innerHTML = '';

    // Render chat replies (including JS Runner)
    if (chatReplies && chatReplies.length > 0) {
        chatReplies.forEach(reply => {
            // createQuickReplyItem handles both types now
            chatItemsContainer.appendChild(createQuickReplyItem(reply));
        });
    } else {
        chatItemsContainer.appendChild(createEmptyPlaceholder('没有可用的聊天快速回复'));
    }

    // Render global replies (standard only)
    if (globalReplies && globalReplies.length > 0) {
        globalReplies.forEach(reply => {
            globalItemsContainer.appendChild(createQuickReplyItem(reply));
        });
    } else {
        globalItemsContainer.appendChild(createEmptyPlaceholder('没有可用的全局快速回复'));
    }

    // NOTE: Event listeners are now handled by delegation in setupEventListeners (events.js)
    // No need to add individual listeners here.
}

/**
 * Creates an empty placeholder element for when a list is empty.
 * @param {string} message - The message to display.
 * @returns {HTMLElement} The empty placeholder element.
 */
export function createEmptyPlaceholder(message) {
    const empty = document.createElement('div');
    empty.className = Constants.CLASS_EMPTY;
    empty.textContent = message;
    return empty;
}

/**
 * Updates the visibility of the menu UI and related ARIA attributes based on sharedState.
 * Fetches and renders replies when showing the menu.
 */
export function updateMenuVisibilityUI() {
    const { menu, rocketButton } = sharedState.domElements;
    const show = sharedState.menuVisible;

    if (!menu || !rocketButton) {
        console.error(`[${Constants.EXTENSION_NAME}] Menu or Rocket Button not found in DOM elements state.`);
        return;
    }

    if (show) {
        // --- Show Menu ---
        // Fetch fresh data JUST before showing
        try {
            const { chat, global } = fetchQuickReplies();
            renderQuickReplies(chat, global);
        } catch (error) {
             console.error(`[${Constants.EXTENSION_NAME}] Error fetching/rendering replies:`, error);
             // Optionally show an error message in the menu
             const errorPlaceholder = createEmptyPlaceholder('加载快速回复失败！');
             const chatContainer = menu.querySelector(`#${Constants.ID_CHAT_ITEMS}`);
             const globalContainer = menu.querySelector(`#${Constants.ID_GLOBAL_ITEMS}`);
             if(chatContainer) chatContainer.innerHTML = ''; chatContainer.appendChild(errorPlaceholder);
             if(globalContainer) globalContainer.innerHTML = ''; // Clear global too
        }


        menu.style.display = 'block';
        rocketButton.setAttribute('aria-expanded', 'true');
        rocketButton.classList.add('active'); // Visual feedback for active button

        // Optional: Focus management for accessibility
        // setTimeout(() => { // Delay focus slightly to ensure menu is fully visible
        //     const firstItem = menu.querySelector(`.${Constants.CLASS_ITEM}`);
        //     firstItem?.focus();
        // }, 100);

    } else {
        // --- Hide Menu ---
        menu.style.display = 'none';
        rocketButton.setAttribute('aria-expanded', 'false');
        rocketButton.classList.remove('active');
    }
}
