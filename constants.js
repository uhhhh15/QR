// constants.js

export const EXTENSION_NAME = "qr-assistant";

// --- 开发者可配置的内置白名单 ---
export const BUILTIN_WHITELIST = [
    'input_helper_toolbar',
    'custom_buttons_container' 
];

// --- CSS Classes ---
export const CLASS_ENABLED = 'qr-menu-enabled';
export const CLASS_DISABLED = 'qr-menu-disabled';

// --- DOM Element IDs ---
export const ID_ROCKET_BUTTON = 'quick-reply-rocket-button';
export const ID_MENU = 'qr-assistant';
export const ID_BACKDROP = 'quick-reply-backdrop';

// 设置面板相关 ID
export const ID_SETTINGS_CONTAINER = `${EXTENSION_NAME}-settings`;
export const ID_SETTINGS_ENABLED_DROPDOWN = `${EXTENSION_NAME}-enabled`;
export const ID_ICON_TYPE_DROPDOWN = `${EXTENSION_NAME}-icon-type`;

// UI 主题下拉菜单 ID
export const ID_UI_THEME_DROPDOWN = `${EXTENSION_NAME}-ui-theme`;

// --- 图标设置新界面 ID ---
    // 布局容器
    export const ID_ICON_SETTINGS_LAYOUT = `${EXTENSION_NAME}-icon-layout`;

    // 图标来源切换下拉框 (替代原侧边栏)
    export const ID_ICON_SOURCE_SELECT = `${EXTENSION_NAME}-icon-source-select`;

    // 内容面板
    export const ID_PANEL_BUILTIN = `${EXTENSION_NAME}-panel-builtin`;
    export const ID_PANEL_CUSTOM = `${EXTENSION_NAME}-panel-custom`;

    // 内置图标控件
    export const ID_BUILTIN_DROPDOWN = `${EXTENSION_NAME}-builtin-select`;
    export const ID_BUILTIN_PREVIEW = `${EXTENSION_NAME}-builtin-preview`;

    // 自定义图标控件
    export const ID_CUSTOM_DROPDOWN = `${EXTENSION_NAME}-custom-select`;
    export const ID_CUSTOM_PREVIEW = `${EXTENSION_NAME}-custom-preview`;
    export const ID_BTN_MANAGE_CUSTOM = `${EXTENSION_NAME}-btn-manage`;
    export const ID_BTN_ADD_CUSTOM = `${EXTENSION_NAME}-btn-add`;

    // 弹窗相关
    export const ID_MODAL_OVERLAY = `${EXTENSION_NAME}-modal-overlay`;
    export const ID_MODAL_MANAGE = `${EXTENSION_NAME}-modal-manage`;
    export const ID_MODAL_ADD = `${EXTENSION_NAME}-modal-add`;

    // 弹窗控件
    export const ID_INPUT_ADD_NAME = `${EXTENSION_NAME}-add-name`;
    export const ID_INPUT_ADD_URL = `${EXTENSION_NAME}-add-url`;
    export const ID_PREVIEW_ADD = `${EXTENSION_NAME}-add-preview`;
    export const ID_BTN_SAVE_NEW = `${EXTENSION_NAME}-btn-save-new`;

    // 管理弹窗控件
    export const ID_LIST_MANAGE = `${EXTENSION_NAME}-list-manage`;
    export const ID_BTN_CLOSE_MANAGE = `${EXTENSION_NAME}-btn-close-manage`;

// 白名单管理相关 ID
// ID_WHITELIST_BUTTON 已移除
// ID_WHITELIST_PANEL 已移除 (现在内嵌在 Settings Page 中)

// 自动伸缩
export const ID_AUTO_SHRINK_CHECKBOX = `${EXTENSION_NAME}-auto-shrink-enabled`;
export const ID_AUTO_SHRINK_STYLE_TAG = 'qrq-auto-shrink-style-tag';
export const ID_BACKDROP_ENABLED_CHECKBOX = `${EXTENSION_NAME}-backdrop-enabled`;

// --- UI 类名 ---
export const CLASS_ACTION_ITEM = 'action-item';
export const CLASS_ACTION_ITEM_ACTIVE = 'active';

// --- 默认图标选项 ---
export const ICON_TYPES = {
    ROCKET: 'rocket',
    COMMENT: 'comment',
    STAR: 'star',
    BOLT: 'bolt',
    FAN: 'fan',
    PENCIL: 'pencil',
    BOOK: 'book',
    MUG: 'mug',
    CROWN: 'crown',
    GEM: 'gem',
    HEADPHONES: 'headphones',
    FONTAWESOME: 'fontawesome',
    CUSTOM: 'custom'
};

export const ICON_CLASS_MAP = {
    [ICON_TYPES.ROCKET]: 'fa-rocket',
    [ICON_TYPES.COMMENT]: 'fa-palette',
    [ICON_TYPES.STAR]: 'fa-star-and-crescent',
    [ICON_TYPES.BOLT]: 'fa-star-of-david',
    [ICON_TYPES.FAN]: 'fa-fan',
    [ICON_TYPES.PENCIL]: 'fa-pencil',
    [ICON_TYPES.BOOK]: 'fa-book-open',
    [ICON_TYPES.MUG]: 'fa-mug-hot',
    [ICON_TYPES.CROWN]: 'fa-crown',
    [ICON_TYPES.GEM]: 'fa-gem',
    [ICON_TYPES.HEADPHONES]: 'fa-headphones',
    [ICON_TYPES.CUSTOM]: '',
    [ICON_TYPES.FONTAWESOME]: ''
};

// --- 设置页面 Tab 相关 ID ---
export const ID_SETTINGS_TAB_BAR = `${EXTENSION_NAME}-settings-tab-bar`;
export const ID_TAB_MAIN = `${EXTENSION_NAME}-tab-main`;
export const ID_TAB_WHITELIST = `${EXTENSION_NAME}-tab-whitelist`;
export const ID_TAB_ICON = `${EXTENSION_NAME}-tab-icon`;

export const ID_PAGE_MAIN = `${EXTENSION_NAME}-page-main`;
export const ID_PAGE_WHITELIST = `${EXTENSION_NAME}-page-whitelist`;
export const ID_PAGE_ICON = `${EXTENSION_NAME}-page-icon`;

// 新增：主页面的帮助按钮 ID
export const ID_BTN_OPEN_HELP = `${EXTENSION_NAME}-btn-open-help`;

// --- 更新相关 ID ---
export const ID_BTN_CHECK_UPDATE = `${EXTENSION_NAME}-btn-check-update`;
export const ID_NEW_VERSION_BADGE = `${EXTENSION_NAME}-new-version-badge`;
export const ID_VERSION_DISPLAY = `${EXTENSION_NAME}-version-display`;
export const ID_MODAL_UPDATE = `${EXTENSION_NAME}-modal-update`;
export const ID_CHANGELOG_CONTENT = `${EXTENSION_NAME}-changelog-content`;
export const ID_BTN_CONFIRM_UPDATE = `${EXTENSION_NAME}-btn-confirm-update`;

// 新增：帮助弹窗 ID
export const ID_MODAL_HELP = `${EXTENSION_NAME}-modal-help`;

// --- 首次运行设置栏 ID ---
export const ID_ONBOARDING_HEADER = `${EXTENSION_NAME}-onboarding-header`;
export const ID_ONBOARDING_THEME_SELECT = `${EXTENSION_NAME}-onboarding-theme`;
export const ID_ONBOARDING_BLUR_CHECK = `${EXTENSION_NAME}-onboarding-blur`;
export const ID_ONBOARDING_BTN_DONE = `${EXTENSION_NAME}-onboarding-done`;

// --- 白名单说明区域 ID ---
export const ID_WHITELIST_HELP_BOX = `${EXTENSION_NAME}-whitelist-help-box`;
export const ID_BTN_DISMISS_WHITELIST_HELP = `${EXTENSION_NAME}-btn-dismiss-whitelist-help`;

// --- UI 主题常量 ---
export const UI_THEMES = {
    LIGHT: 'light',         // 默认 (对应 Ceramic 或 Paper 风格)
    SYSTEM: 'system',       // 跟随酒馆
    PAPER: 'theme-paper',
    AURORA: 'theme-aurora',
    SMOKED: 'theme-smoked',
    CERAMIC: 'theme-ceramic',
    LAVENDER: 'theme-lavender',
    FOREST: 'theme-forest'
};