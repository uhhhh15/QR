// ui.js
import * as Constants from './constants.js';
import { fetchQuickReplies } from './api.js';
import { sharedState } from './state.js';
import { extension_settings } from "./index.js";  

// 重命名这个函数，避免与settings.js的函数冲突
export function updateButtonIconDisplay() {
    const button = sharedState.domElements.rocketButton;
    if (!button) return;
    
    const settings = extension_settings[Constants.EXTENSION_NAME];
    const iconType = settings.iconType || Constants.ICON_TYPES.ROCKET;
}

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
    
    // 将事件监听器的设置移到setupEventListeners中处理
    item.dataset.type = 'quick-reply-item';
    
    return item;
}

/**
 * 更新按钮图标显示
 * 根据设置使用不同的图标和颜色风格
 */
export function updateIconDisplay() {
    const button = sharedState.domElements.rocketButton;
    if (!button) return;
    
    const settings = extension_settings[Constants.EXTENSION_NAME];
    const iconType = settings.iconType || Constants.ICON_TYPES.ROCKET;
    
    // 清除按钮内容
    button.innerHTML = '';
    button.className = 'interactable secondary-button';
    
    // 如果是自定义图标，使用图片元素
    if (iconType === Constants.ICON_TYPES.CUSTOM && settings.customIconUrl) {
        const img = document.createElement('img');
        img.src = settings.customIconUrl;
        img.alt = '快速回复';
        img.style.maxHeight = '20px';
        img.style.maxWidth = '20px';
        button.appendChild(img);
    } else {
        // 使用FontAwesome图标
        const iconClass = Constants.ICON_CLASS_MAP[iconType] || Constants.ICON_CLASS_MAP[Constants.ICON_TYPES.ROCKET];
        button.classList.add('fa-solid', iconClass);
    }
    
    // 应用颜色匹配设置
    if (settings.matchButtonColors) {
        // 从发送按钮获取CSS变量并应用到我们的按钮
        const sendButton = document.getElementById('send_but');
        if (sendButton) {
            // 获取计算后的样式
            const sendButtonStyle = getComputedStyle(sendButton);
            
            // 应用颜色和背景色
            button.style.color = sendButtonStyle.color;
            
            // 添加额外的CSS类以匹配发送按钮
            if (sendButton.classList.contains('primary-button')) {
                button.classList.remove('secondary-button');
                button.classList.add('primary-button');
            }
        }
    }
}

// 其他函数...

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
    
    // 为新添加的按钮添加事件监听
    document.querySelectorAll(`.${Constants.CLASS_ITEM}`).forEach(item => {
        item.addEventListener('click', function(event) {
            // 引用全局事件处理函数
            if (window.quickReplyMenu && window.quickReplyMenu.handleQuickReplyClick) {
                window.quickReplyMenu.handleQuickReplyClick(event);
            }
        });
    });
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
