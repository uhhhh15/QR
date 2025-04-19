// constants.js

export const EXTENSION_NAME = "quick-reply-menu";

export const CLASS_ENABLED = 'qr-menu-enabled';
export const CLASS_DISABLED = 'qr-menu-disabled';

// --- DOM Element IDs ---
export const ID_BUTTON = 'quick-reply-menu-button'; // 保留用于向后兼容
export const ID_ROCKET_BUTTON = 'quick-reply-rocket-button'; // 新的火箭按钮ID
export const ID_MENU = 'quick-reply-menu';
export const ID_CHAT_LIST_CONTAINER = 'chat-quick-replies';
export const ID_GLOBAL_LIST_CONTAINER = 'global-quick-replies';
export const ID_CHAT_ITEMS = 'chat-qr-items';
export const ID_GLOBAL_ITEMS = 'global-qr-items';
export const ID_SETTINGS_CONTAINER = `${EXTENSION_NAME}-settings`;
export const ID_SETTINGS_ENABLED_DROPDOWN = `${EXTENSION_NAME}-enabled`;
export const ID_ICON_TYPE_DROPDOWN = `${EXTENSION_NAME}-icon-type`;
export const ID_CUSTOM_ICON_URL = `${EXTENSION_NAME}-custom-icon-url`;
export const ID_COLOR_MATCH_CHECKBOX = `${EXTENSION_NAME}-color-match`;

// --- 菜单样式相关常量 ---
export const ID_MENU_STYLE_BUTTON = `${EXTENSION_NAME}-menu-style-button`;
export const ID_MENU_STYLE_PANEL = `${EXTENSION_NAME}-menu-style-panel`;
export const ID_RESET_STYLE_BUTTON = `${EXTENSION_NAME}-reset-style`;

// --- CSS Classes ---
export const CLASS_MENU_CONTAINER = 'quick-reply-menu-container';
export const CLASS_LIST = 'quick-reply-list';
export const CLASS_LIST_TITLE = 'quick-reply-list-title';
export const CLASS_ITEM = 'quick-reply-item';
export const CLASS_EMPTY = 'quick-reply-empty';
export const CLASS_ICON_PREVIEW = 'quick-reply-icon-preview';
export const CLASS_SETTINGS_ROW = 'quick-reply-settings-row';

// --- ARIA ---
export const ARIA_ROLE_MENU = 'menu';
export const ARIA_ROLE_GROUP = 'group';
export const ARIA_ROLE_MENUITEM = 'menuitem';

// --- 使用说明相关常量 ---
export const ID_USAGE_BUTTON = `${EXTENSION_NAME}-usage-button`;
export const ID_USAGE_PANEL = `${EXTENSION_NAME}-usage-panel`;

// --- 默认图标选项 ---
export const ICON_TYPES = {
    ROCKET: 'rocket',
    COMMENT: 'comment',
    STAR: 'star',
    BOLT: 'bolt',
    CUSTOM: 'custom'
};

// --- 图标类型到FontAwesome类名的映射 ---
export const ICON_CLASS_MAP = {
    [ICON_TYPES.ROCKET]: 'fa-rocket',
    [ICON_TYPES.COMMENT]: 'fa-comment',
    [ICON_TYPES.STAR]: 'fa-star',
    [ICON_TYPES.BOLT]: 'fa-bolt',
    [ICON_TYPES.CUSTOM]: ''  // 自定义图标不使用FontAwesome类
};

// --- 默认菜单样式值 ---
export const DEFAULT_MENU_STYLES = {
    itemBgColor: 'rgba(60, 60, 60, 0.7)',
    itemTextColor: '#ffffff',
    titleColor: '#cccccc',
    titleBorderColor: '#444444',
    emptyTextColor: '#666666',
    menuBgColor: 'rgba(0, 0, 0, 0.85)',
    menuBorderColor: '#555555'
};
