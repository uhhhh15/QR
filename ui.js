// ui.js
import * as Constants from './constants.js';
import { sharedState, setMenuVisible } from './state.js';
import { fetchQuickReplies } from './api.js';
import { handleQuickReplyClick } from './events.js'; // Import handler reference

// --- UI Creation Functions ---

/**
 * Creates the main quick reply button.
 * @returns {HTMLElement} The created button element.
 */
export function createMenuButton() {
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
 * Creates the quick reply menu structure.
 * @returns {HTMLElement} The created menu element.
 */
export function createMenuElement() {
    const menu = document.createElement('div');
    menu.id = Constants.ID_MENU;
    menu.setAttribute('role', Constants.ARIA_ROLE_MENU);
    menu.setAttribute('aria-labelledby', Constants.ID_BUTTON);
    menu.style.display = 'none'; // Initially hidden

    const chatTitleId = `${Constants.ID_CHAT_LIST_CONTAINER}-title`;
    const globalTitleId = `${Constants.ID_GLOBAL_LIST_CONTAINER}-title`;

    menu.innerHTML = `
        <div class="${Constants.CLASS_MENU_CONTAINER}">
            <div id="${Constants.ID_CHAT_LIST_CONTAINER}" class="${Constants.CLASS_LIST}" role="${Constants.ARIA_ROLE_GROUP}" aria-labelledby="${chatTitleId}">
                <div id="${chatTitleId}" class="${Constants.CLASS_LIST_TITLE}">聊天快捷回复</div>
                <div id="${Constants.ID_CHAT_ITEMS}"></div>
            </div>
            <div id="${Constants.ID_GLOBAL_LIST_CONTAINER}" class="${Constants.CLASS_LIST}" role="${Constants.ARIA_ROLE_GROUP}" aria-labelledby="${globalTitleId}">
                <div id="${globalTitleId}" class="${Constants.CLASS_LIST_TITLE}">全局快捷回复</div>
                <div id="${Constants.ID_GLOBAL_ITEMS}"></div>
            </div>
        </div>
    `;
    return menu;
}

/**
 * Creates a single quick reply item (button).
 * @param {object} qr - The quick reply object { setName, label, message }.
 * @returns {HTMLElement} The created button element.
 */
function createQuickReplyItem(qr) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = Constants.CLASS_ITEM;
    item.innerText = qr.label;
    item.title = qr.message.substring(0, 100) + (qr.message.length > 100 ? '...' : '');
    item.setAttribute('role', Constants.ARIA_ROLE_MENUITEM);
    // Add data attributes to pass info to the generic handler
    item.dataset.setName = qr.setName;
    item.dataset.label = qr.label;
    // Attach the generic click handler
    item.addEventListener('click', handleQuickReplyClick);
    return item;
}


// --- Rendering Functions ---

/**
 * Renders the fetched quick replies into the menu lists.
 * @param {Array<object>} chatReplies
 * @param {Array<object>} globalReplies
 */
function renderQuickReplies(chatReplies, globalReplies) {
    renderList(sharedState.domElements.chatItemsContainer, chatReplies, "没有可用的聊天快捷回复");
    renderList(sharedState.domElements.globalItemsContainer, globalReplies, "没有可用的全局快捷回复");
}

/**
 * Renders a list of quick reply items into a given container.
 * @param {HTMLElement} container - The container element to render into.
 * @param {Array<object>} replies - Array of quick reply objects.
 * @param {string} emptyMessage - Message to display if the list is empty.
 */
function renderList(container, replies, emptyMessage) {
    if (!container) return; // Safety check

    container.innerHTML = ''; // Clear previous items

    if (replies.length > 0) {
        const fragment = document.createDocumentFragment();
        replies.forEach(qr => {
            fragment.appendChild(createQuickReplyItem(qr));
        });
        container.appendChild(fragment);
    } else {
        displayEmptyMessage(container, emptyMessage);
    }
}

/**
 * Displays an empty message in a container.
 * @param {HTMLElement} container
 * @param {string} message
 */
function displayEmptyMessage(container, message) {
    container.innerHTML = `<div class="${Constants.CLASS_EMPTY}">${message}</div>`;
}


// --- UI State Update Functions ---

/**
 * Updates the visibility of the menu UI and related ARIA attributes based on sharedState.
 */
export function updateMenuVisibilityUI() {
    const { menu, button } = sharedState.domElements;
    const show = sharedState.menuVisible;

    if (!menu || !button) return;

    if (show) {
        // Update content before showing
        const { chat, global } = fetchQuickReplies();
        renderQuickReplies(chat, global);

        menu.style.display = 'block';
        button.setAttribute('aria-expanded', 'true');

        // Optional: Focus the first item in the menu for keyboard navigation
        const firstItem = menu.querySelector(`.${Constants.CLASS_ITEM}`);
        firstItem?.focus();
    } else {
        menu.style.display = 'none';
        button.setAttribute('aria-expanded', 'false');
    }
}
