// ui.js
import * as Constants from './constants.js';
import { fetchQuickReplies } from './api.js'; // fetchQuickReplies 现在从设置中获取数据
import { sharedState } from './state.js';

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
    globalTitle.id = `${Constants.ID_GLOBAL_LIST_CONTAINer}-title`; // ID for aria-labelledby
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
 * Adds data-is-standard and data-script-id attributes based on reply data.
 * @param {object} reply - The quick reply data { setName, label, message, isStandard, scriptId?, source? }
 * @returns {HTMLButtonElement} The button element for the quick reply item.
 */
export function createQuickReplyItem(reply) {
    const item = document.createElement('button');
    item.type = 'button'; // Explicitly set type
    item.className = Constants.CLASS_ITEM;
    item.setAttribute('role', Constants.ARIA_ROLE_MENUITEM);

    // 确保 label 存在且非空
    item.dataset.label = reply.label?.trim() || '';

    // isStandard: 'false' if explicitly false, otherwise 'true'
    item.dataset.isStandard = String(reply.isStandard === false ? false : true);

    // 添加 setName 数据属性，对于标准QR是回复集名称，对于JS Runner可以是脚本名称或分类
    item.dataset.setName = reply.setName || (reply.source === 'JSSlashRunner' ? 'JS脚本' : '未知回复集');

    // 如果是非标准回复 (JS Runner)，添加 scriptId 数据属性
    if (reply.isStandard === false && reply.scriptId) {
        item.dataset.scriptId = reply.scriptId;
    }

    // Tooltip showing source/set > label and message
    const sourceText = item.dataset.setName;
    const tooltipMessage = reply.message || `(${reply.isStandard ? '标准回复' : 'JS脚本'})`; // Fallback tooltip message if none provided
    item.title = `${sourceText} > ${item.dataset.label}:\n${tooltipMessage.length > 70 ? tooltipMessage.slice(0, 70) + "..." : tooltipMessage}`;

    // Display label as button text
    item.textContent = item.dataset.label;

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
        // 确保 reply 对象和 label 存在
        if (!reply || !reply.label || reply.label.trim() === "") {
             console.warn(`[${Constants.EXTENSION_NAME}] Skipping invalid quick reply data:`, reply);
             return;
        }
        const item = createQuickReplyItem(reply); // createQuickReplyItem now adds necessary data attributes
        // Attach the single click handler from events.js (exposed via window.quickReplyMenu)
        item.addEventListener('click', function(event) {
            if (window.quickReplyMenu && window.quickReplyMenu.handleQuickReplyClick) {
                // The handler in events.js will read data attributes and decide the action
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
        chatItemsContainer.appendChild(createEmptyPlaceholder('没有可用的聊天快速回复或脚本按钮'));
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
