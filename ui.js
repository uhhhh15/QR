// ui.js
import * as Constants from './constants.js';
import { handleQuickReplyClick } from './events.js';
import { fetchQuickReplies } from './api.js';
import { sharedState } from './state.js';

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
 * Creates the menu element.
 * @returns {HTMLElement} The created menu element.
 */
export function createMenuElement() {
    const menu = document.createElement('div');
    menu.id = Constants.ID_MENU;
    menu.setAttribute('role', Constants.ARIA_ROLE_MENU);
    menu.tabIndex = -1;
    menu.style.display = 'none';

    const container = document.createElement('div');
    container.className = Constants.CLASS_MENU_CONTAINER;

    // Chat quick replies section
    const chatListContainer = document.createElement('div');
    chatListContainer.id = Constants.ID_CHAT_LIST_CONTAINER;
    chatListContainer.className = Constants.CLASS_LIST;
    chatListContainer.setAttribute('role', Constants.ARIA_ROLE_GROUP);

    const chatTitle = document.createElement('div');
    chatTitle.className = Constants.CLASS_LIST_TITLE;
    chatTitle.textContent = '聊天快捷回复';
    
    const chatItems = document.createElement('div');
    chatItems.id = Constants.ID_CHAT_ITEMS;

    chatListContainer.appendChild(chatTitle);
    chatListContainer.appendChild(chatItems);

    // Global quick replies section
    const globalListContainer = document.createElement('div');
    globalListContainer.id = Constants.ID_GLOBAL_LIST_CONTAINER;
    globalListContainer.className = Constants.CLASS_LIST;
    globalListContainer.setAttribute('role', Constants.ARIA_ROLE_GROUP);

    const globalTitle = document.createElement('div');
    globalTitle.className = Constants.CLASS_LIST_TITLE;
    globalTitle.textContent = '全局快捷回复';
    
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
 * Creates a single quick reply item.
 * @param {object} reply - The quick reply data
 * @returns {HTMLElement} The button element
 */
export function createQuickReplyItem(reply) {
    const item = document.createElement('button');
    item.className = Constants.CLASS_ITEM;
    item.setAttribute('role', Constants.ARIA_ROLE_MENUITEM);
    item.dataset.setName = reply.setName;
    item.dataset.label = reply.label;
    item.title = reply.message.length > 50 ? reply.message.slice(0, 50) + '...' : reply.message;
    item.textContent = reply.label;
    
    // Add click handler directly to this element
    item.addEventListener('click', handleQuickReplyClick);
    
    return item;
}

/**
 * Creates an empty placeholder element.
 * @param {string} message - The message to display
 * @returns {HTMLElement} The empty placeholder element
 */
export function createEmptyPlaceholder(message) {
    const empty = document.createElement('div');
    empty.className = Constants.CLASS_EMPTY;
    empty.textContent = message;
    return empty;
}

/**
 * Renders quick replies into the menu containers.
 * @param {Array<object>} chatReplies - Chat-specific quick replies
 * @param {Array<object>} globalReplies - Global quick replies
 */
export function renderQuickReplies(chatReplies, globalReplies) {
    const { chatItemsContainer, globalItemsContainer } = sharedState.domElements;
    if (!chatItemsContainer || !globalItemsContainer) return;

    // Clear existing content
    chatItemsContainer.innerHTML = '';
    globalItemsContainer.innerHTML = '';

    // Render chat replies
    if (chatReplies.length > 0) {
        chatReplies.forEach(reply => {
            chatItemsContainer.appendChild(createQuickReplyItem(reply));
        });
    } else {
        chatItemsContainer.appendChild(createEmptyPlaceholder('没有可用的聊天快捷回复'));
    }

    // Render global replies
    if (globalReplies.length > 0) {
        globalReplies.forEach(reply => {
            globalItemsContainer.appendChild(createQuickReplyItem(reply));
        });
    } else {
        globalItemsContainer.appendChild(createEmptyPlaceholder('没有可用的全局快捷回复'));
    }
}

/**
 * Updates the visibility of the menu UI and related ARIA attributes based on sharedState.
 */
export function updateMenuVisibilityUI() {
    const { menu, rocketButton } = sharedState.domElements;
    const show = sharedState.menuVisible;

    if (!menu || !rocketButton) return;

    if (show) {
        // Update content before showing
        const { chat, global } = fetchQuickReplies();
        renderQuickReplies(chat, global);

        menu.style.display = 'block';
        rocketButton.setAttribute('aria-expanded', 'true');
        // Add active class for styling
        rocketButton.classList.add('active');

        // Optional: Focus the first item in the menu for keyboard navigation
        const firstItem = menu.querySelector(`.${Constants.CLASS_ITEM}`);
        firstItem?.focus();
    } else {
        menu.style.display = 'none';
        rocketButton.setAttribute('aria-expanded', 'false');
        // Remove active class
        rocketButton.classList.remove('active');
    }
}
