// ui.js
import * as Constants from './constants.js';
import { fetchQuickReplies } from './api.js';
import { sharedState } from './state.js';
// No longer need extension_settings here directly

// Removed updateButtonIconDisplay and updateIconDisplay from this file. Use settings.js version.

/**
 * Creates the main quick reply button (legacy, kept for reference).
 * @returns {HTMLElement} The created button element.
 */
export function createMenuButton() {
    // This function is likely unused but kept for potential reference.
    const button = document.createElement('button');
    button.id = Constants.ID_BUTTON; // Legacy ID
    button.type = 'button';
    button.innerText = '[快速回复]';
    button.setAttribute('aria-haspopup', 'true');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', Constants.ID_MENU);
    console.warn(`[${Constants.EXTENSION_NAME}] Legacy function createMenuButton called.`);
    return button;
}

/**
 * Creates the menu element structure.
 * @returns {HTMLElement} The created menu element (initially hidden).
 */
export function createMenuElement() {
    const menu = document.createElement('div');
    menu.id = Constants.ID_MENU;
    menu.className = 'custom-styled-menu'; // Add class for custom styling hooks
    menu.setAttribute('role', Constants.ARIA_ROLE_MENU);
    menu.tabIndex = -1; // Allows focus programmatically but not via tab initially
    menu.style.display = 'none'; // Start hidden

    const container = document.createElement('div');
    container.className = Constants.CLASS_MENU_CONTAINER;

    // Chat quick replies section
    const chatListContainer = document.createElement('div');
    chatListContainer.id = Constants.ID_CHAT_LIST_CONTAINER;
    chatListContainer.className = Constants.CLASS_LIST;
    chatListContainer.setAttribute('role', Constants.ARIA_ROLE_GROUP);
    chatListContainer.setAttribute('aria-labelledby', `${Constants.ID_CHAT_LIST_CONTAINER}-title`); // ARIA

    const chatTitle = document.createElement('div');
    chatTitle.id = `${Constants.ID_CHAT_LIST_CONTAINER}-title`; // ID for aria-labelledby
    chatTitle.className = Constants.CLASS_LIST_TITLE;
    chatTitle.textContent = '聊天快速回复'; // Title includes standard and JS Runner replies now

    const chatItems = document.createElement('div');
    chatItems.id = Constants.ID_CHAT_ITEMS; // Container for chat items

    chatListContainer.appendChild(chatTitle);
    chatListContainer.appendChild(chatItems);

    // Global quick replies section
    const globalListContainer = document.createElement('div');
    globalListContainer.id = Constants.ID_GLOBAL_LIST_CONTAINER;
    globalListContainer.className = Constants.CLASS_LIST;
    globalListContainer.setAttribute('role', Constants.ARIA_ROLE_GROUP);
    globalListContainer.setAttribute('aria-labelledby', `${Constants.ID_GLOBAL_LIST_CONTAINER}-title`); // ARIA

    const globalTitle = document.createElement('div');
    globalTitle.id = `${Constants.ID_GLOBAL_LIST_CONTAINER}-title`; // ID for aria-labelledby
    globalTitle.className = Constants.CLASS_LIST_TITLE;
    globalTitle.textContent = '全局快速回复';

    const globalItems = document.createElement('div');
    globalItems.id = Constants.ID_GLOBAL_ITEMS; // Container for global items

    globalListContainer.appendChild(globalTitle);
    globalListContainer.appendChild(globalItems);

    // Append sections to container
    container.appendChild(chatListContainer);
    container.appendChild(globalListContainer);
    menu.appendChild(container);

    return menu;
}

/**
 * Creates a single quick reply item (button).
 * Adds data-is-standard attribute based on reply data.
 * @param {object} reply - The quick reply data { setName, label, message, isStandard }
 * @returns {HTMLButtonElement} The button element for the quick reply item.
 */
export function createQuickReplyItem(reply) {
    const item = document.createElement('button');
    item.type = 'button'; // Explicitly set type
    item.className = Constants.CLASS_ITEM;
    item.setAttribute('role', Constants.ARIA_ROLE_MENUITEM);
    item.dataset.setName = reply.setName; // Store data needed for trigger
    item.dataset.label = reply.label;

    // ***************************************************************
    // --- 新增：添加 isStandard 数据属性，用于区分点击行为 ---
    // dataset 属性值必须是字符串，所以显式转换布尔值
    // 如果 reply.isStandard 是 false，则设置为 'false'；否则（包括 true 和 undefined），设置为 'true'
    item.dataset.isStandard = String(reply.isStandard === false ? false : true);
    // ***************************************************************

    // Tooltip showing full message or first 50 chars
    // Use reply.message directly, api.js provides a default if needed
    const tooltipMessage = reply.message || '(点击执行)'; // Fallback tooltip message if none provided
    item.title = tooltipMessage.length > 50
        ? `${reply.setName} > ${reply.label}:\n${tooltipMessage.slice(0, 50)}...`
        : `${reply.setName} > ${reply.label}:\n${tooltipMessage}`;
    item.textContent = reply.label; // Display label as button text

    // Event listener will be added in renderQuickReplies where this is used
    // item.dataset.type = 'quick-reply-item'; // Could be used for event delegation if needed

    return item;
}

/**
 * Renders fetched quick replies into the respective menu containers.
 * Also attaches click listeners to the newly created items.
 * @param {Array<object>} chatReplies - Chat-specific quick replies (includes standard and JS runner)
 * @param {Array<object>} globalReplies - Global quick replies (standard only)
 */
export function renderQuickReplies(chatReplies, globalReplies) {
    const { chatItemsContainer, globalItemsContainer } = sharedState.domElements;
    if (!chatItemsContainer || !globalItemsContainer) {
         console.error(`[${Constants.EXTENSION_NAME}] Menu item containers not found for rendering.`);
         return;
     }

    // Clear previous content safely
    chatItemsContainer.innerHTML = '';
    globalItemsContainer.innerHTML = '';

    // Helper function to create and append item with listener
    const addItem = (container, reply) => {
        const item = createQuickReplyItem(reply); // createQuickReplyItem now adds data-is-standard
        // Attach the single click handler from events.js (exposed via window.quickReplyMenu)
        item.addEventListener('click', function(event) {
            if (window.quickReplyMenu && window.quickReplyMenu.handleQuickReplyClick) {
                // The handler in events.js will read data-is-standard and decide the action
                window.quickReplyMenu.handleQuickReplyClick(event);
            } else {
                console.error(`[${Constants.EXTENSION_NAME}] handleQuickReplyClick not found on window.quickReplyMenu`);
            }
        });
        container.appendChild(item);
    };

    // Render chat replies or placeholder (includes standard and JS Runner items)
    if (chatReplies && chatReplies.length > 0) {
        chatReplies.forEach(reply => addItem(chatItemsContainer, reply));
    } else {
        chatItemsContainer.appendChild(createEmptyPlaceholder('没有可用的聊天快速回复或脚本'));
    }

    // Render global replies or placeholder (standard only)
    if (globalReplies && globalReplies.length > 0) {
        globalReplies.forEach(reply => addItem(globalItemsContainer, reply));
    } else {
        globalItemsContainer.appendChild(createEmptyPlaceholder('没有可用的全局快速回复'));
    }
}

/**
 * Creates an empty placeholder element (e.g., when a list is empty).
 * @param {string} message - The message to display in the placeholder.
 * @returns {HTMLDivElement} The placeholder div element.
 */
export function createEmptyPlaceholder(message) {
    const empty = document.createElement('div');
    empty.className = Constants.CLASS_EMPTY;
    empty.textContent = message;
    return empty;
}

/**
 * Updates the visibility of the menu UI and related ARIA attributes.
 * Fetches and renders content if the menu is being shown.
 */
export function updateMenuVisibilityUI() {
    const { menu, rocketButton } = sharedState.domElements;
    const show = sharedState.menuVisible;

    if (!menu || !rocketButton) {
         console.error(`[${Constants.EXTENSION_NAME}] Menu or rocket button DOM element not found for visibility update.`);
         return;
     }

    if (show) {
        // Update content *before* showing
        console.log(`[${Constants.EXTENSION_NAME}] Opening menu, fetching replies (including JS Runner)...`);
        try {
            const { chat, global } = fetchQuickReplies(); // From api.js (now includes JS runner in chat)
             if (chat === undefined || global === undefined) {
                 throw new Error("fetchQuickReplies did not return expected structure.");
             }
            renderQuickReplies(chat, global); // From this file (will render both types)
        } catch (error) {
             console.error(`[${Constants.EXTENSION_NAME}] Error fetching or rendering replies:`, error);
             // Display an error message within the menu containers
             const errorMsg = "加载回复列表失败";
             if (sharedState.domElements.chatItemsContainer) {
                 sharedState.domElements.chatItemsContainer.innerHTML = ''; // Clear first
                 sharedState.domElements.chatItemsContainer.appendChild(createEmptyPlaceholder(errorMsg));
             }
              if (sharedState.domElements.globalItemsContainer) {
                  sharedState.domElements.globalItemsContainer.innerHTML = ''; // Clear first
                  sharedState.domElements.globalItemsContainer.appendChild(createEmptyPlaceholder(errorMsg));
              }
        }

        // Show the menu and update ARIA/classes
        menu.style.display = 'block';
        rocketButton.setAttribute('aria-expanded', 'true');
        rocketButton.classList.add('active'); // For visual feedback

        // Optional: Focus management (consider accessibility implications)
        // const firstItem = menu.querySelector(`.${Constants.CLASS_ITEM}`);
        // firstItem?.focus();

    } else {
        // Hide the menu and update ARIA/classes
        menu.style.display = 'none';
        rocketButton.setAttribute('aria-expanded', 'false');
        rocketButton.classList.remove('active');
    }
}
