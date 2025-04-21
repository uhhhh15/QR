// events.js
import * as Constants from './constants.js';
import { sharedState, setMenuVisible } from './state.js';
import { updateMenuVisibilityUI } from './ui.js';
import { triggerQuickReply } from './api.js';
// 导入 settings.js 中的函数用于处理设置变化和UI更新
import { handleSettingsChange, handleUsageButtonClick, closeUsagePanel, updateIconDisplay } from './settings.js';
// 导入 index.js 的设置对象 (用于样式函数)
import { extension_settings } from './index.js';

/**
 * Handles clicks on the rocket button. Toggles menu visibility state and updates UI.
 */
export function handleRocketButtonClick() {
    setMenuVisible(!sharedState.menuVisible); // Toggle state
    updateMenuVisibilityUI(); // Update UI based on new state (will fetch/render replies if opening)
}

/**
 * Handles clicks outside the menu to close it.
 * @param {Event} event
 */
export function handleOutsideClick(event) {
    const { menu, rocketButton } = sharedState.domElements;
    if (sharedState.menuVisible &&
        menu && rocketButton &&
        !menu.contains(event.target) &&
        event.target !== rocketButton &&
        !rocketButton.contains(event.target)
       ) {
        setMenuVisible(false); // Update state
        updateMenuVisibilityUI(); // Update UI
    }
}

/**
 * Handles clicks on individual quick reply items (buttons).
 * Reads data attributes and triggers the API call.
 * @param {Event} event The click event on the button.
 */
export async function handleQuickReplyClick(event) {
    const button = event.currentTarget; // Get the button that was clicked
    const setName = button.dataset.setName;
    const label = button.dataset.label;

    if (!setName || !label) {
        console.error(`[${Constants.EXTENSION_NAME}] Missing data-set-name or data-label on clicked item.`);
        setMenuVisible(false); // Close menu on error
        updateMenuVisibilityUI();
        return;
    }

    // Don't wait for trigger to finish before closing the menu visually
    setMenuVisible(false);
    updateMenuVisibilityUI();

    try {
        await triggerQuickReply(setName, label); // Await the API call in the background
    } catch (error) {
        // Error is logged within triggerQuickReply
        // UI is already closed
    }
}

/**
 * 处理菜单样式按钮点击
 */
export function handleMenuStyleButtonClick() {
    const stylePanel = document.getElementById(Constants.ID_MENU_STYLE_PANEL);
    if (stylePanel) {
        // 载入当前样式到面板
        loadMenuStylesIntoPanel();
        stylePanel.style.display = 'block';
    }
}

/**
 * 将当前菜单样式加载到设置面板中
 */
function loadMenuStylesIntoPanel() {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    // 确保menuStyles存在，否则使用默认值
    const styles = settings.menuStyles || JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));

    // Helper to safely set element value
    const safeSetValue = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.value = value;
    };
    const safeSetText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    // 设置各个控件的值时添加检查
    const itemBgColorHex = styles.itemBgColor && typeof styles.itemBgColor === 'string' ? rgbaToHex(styles.itemBgColor) : '#3c3c3c';
    safeSetValue('qr-item-bgcolor-picker', itemBgColorHex);
    safeSetValue('qr-item-bgcolor-text', itemBgColorHex.toUpperCase());

    const itemOpacity = styles.itemBgColor && typeof styles.itemBgColor === 'string' ? getOpacityFromRgba(styles.itemBgColor) : 0.7;
    safeSetValue('qr-item-opacity', itemOpacity);
    safeSetText('qr-item-opacity-value', itemOpacity);

    const itemTextColor = styles.itemTextColor || '#ffffff';
    safeSetValue('qr-item-color-picker', itemTextColor);
    safeSetValue('qr-item-color-text', itemTextColor.toUpperCase());

    const titleColor = styles.titleColor || '#cccccc';
    safeSetValue('qr-title-color-picker', titleColor);
    safeSetValue('qr-title-color-text', titleColor.toUpperCase());

    const titleBorderColor = styles.titleBorderColor || '#444444';
    safeSetValue('qr-title-border-picker', titleBorderColor);
    safeSetValue('qr-title-border-text', titleBorderColor.toUpperCase());

    const emptyColor = styles.emptyTextColor || '#666666';
    safeSetValue('qr-empty-color-picker', emptyColor);
    safeSetValue('qr-empty-color-text', emptyColor.toUpperCase());

    const menuBgColorHex = styles.menuBgColor && typeof styles.menuBgColor === 'string' ? rgbaToHex(styles.menuBgColor) : '#000000';
    safeSetValue('qr-menu-bgcolor-picker', menuBgColorHex);
    safeSetValue('qr-menu-bgcolor-text', menuBgColorHex.toUpperCase());

    const menuOpacity = styles.menuBgColor && typeof styles.menuBgColor === 'string' ? getOpacityFromRgba(styles.menuBgColor) : 0.85;
    safeSetValue('qr-menu-opacity', menuOpacity);
    safeSetText('qr-menu-opacity-value', menuOpacity);

    const menuBorderColor = styles.menuBorderColor || '#555555';
    safeSetValue('qr-menu-border-picker', menuBorderColor);
    safeSetValue('qr-menu-border-text', menuBorderColor.toUpperCase());
}

/**
 * 关闭菜单样式面板
 */
export function closeMenuStylePanel() {
    const stylePanel = document.getElementById(Constants.ID_MENU_STYLE_PANEL);
    if (stylePanel) {
        stylePanel.style.display = 'none';
    }
}

/**
 * 从样式面板中收集样式设置并应用
 */
export function applyMenuStyles() {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    if (!settings.menuStyles) {
        settings.menuStyles = JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));
    }

    // Helper to get value safely
    const safeGetValue = (id, defaultValue) => {
        const element = document.getElementById(id);
        return element ? element.value : defaultValue;
    };

    // 从颜色选择器或文本输入框获取值
    function getColorValue(pickerId) {
        const textInput = document.getElementById(pickerId + '-text');
        // Prefer valid hex from text input
        if (textInput && /^#[0-9A-F]{6}$/i.test(textInput.value)) {
            return textInput.value;
        }
        // Fallback to picker value
        return safeGetValue(pickerId, null);
    }

    // 获取各项颜色值和透明度
    const itemBgColorHex = getColorValue('qr-item-bgcolor-picker');
    const itemOpacity = safeGetValue('qr-item-opacity', 0.7);
    settings.menuStyles.itemBgColor = hexToRgba(itemBgColorHex, itemOpacity);

    settings.menuStyles.itemTextColor = getColorValue('qr-item-color-picker') || '#ffffff';
    settings.menuStyles.titleColor = getColorValue('qr-title-color-picker') || '#cccccc';
    settings.menuStyles.titleBorderColor = getColorValue('qr-title-border-picker') || '#444444';
    settings.menuStyles.emptyTextColor = getColorValue('qr-empty-color-picker') || '#666666';

    const menuBgColorHex = getColorValue('qr-menu-bgcolor-picker');
    const menuOpacity = safeGetValue('qr-menu-opacity', 0.85);
    settings.menuStyles.menuBgColor = hexToRgba(menuBgColorHex, menuOpacity);

    settings.menuStyles.menuBorderColor = getColorValue('qr-menu-border-picker') || '#555555';

    // 删除followTheme属性（如果存在，用于旧版兼容）
    delete settings.menuStyles.followTheme;

    // 应用样式到菜单
    updateMenuStylesUI();

    // 关闭面板
    closeMenuStylePanel();

    // 触发保存设置 (让用户在主设置区点击保存)
    // if (window.quickReplyMenu && window.quickReplyMenu.saveSettings) {
    //     window.quickReplyMenu.saveSettings();
    // }
    console.log(`[${Constants.EXTENSION_NAME}] Menu styles applied. Remember to save settings.`);
}

/**
 * 重置样式到默认值
 */
export function resetMenuStyles() {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    settings.menuStyles = JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));

    // 重新加载面板以显示默认值
    loadMenuStylesIntoPanel();

    // 应用默认样式到菜单
    updateMenuStylesUI();

    // 提示用户需要保存
    console.log(`[${Constants.EXTENSION_NAME}] Menu styles reset to default. Remember to save settings.`);
}

/**
 * 更新菜单的实际样式 (应用CSS变量)
 */
export function updateMenuStylesUI() {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    // 使用当前设置或默认值
    const styles = settings.menuStyles || Constants.DEFAULT_MENU_STYLES;

    const menu = document.getElementById(Constants.ID_MENU);
    if (!menu) return;

    // 应用自定义样式到 CSS 变量
    document.documentElement.style.setProperty('--qr-item-bg-color', styles.itemBgColor || 'rgba(60, 60, 60, 0.7)');
    document.documentElement.style.setProperty('--qr-item-text-color', styles.itemTextColor || 'white');
    document.documentElement.style.setProperty('--qr-title-color', styles.titleColor || '#ccc');
    document.documentElement.style.setProperty('--qr-title-border-color', styles.titleBorderColor || '#444');
    document.documentElement.style.setProperty('--qr-empty-text-color', styles.emptyTextColor || '#666');
    document.documentElement.style.setProperty('--qr-menu-bg-color', styles.menuBgColor || 'rgba(0, 0, 0, 0.85)');
    document.documentElement.style.setProperty('--qr-menu-border-color', styles.menuBorderColor || '#555');
}

/**
 * 辅助函数 - hex转rgba
 */
function hexToRgba(hex, opacity) {
    // 默认颜色处理
    if (!hex || !/^#[0-9A-F]{6}$/i.test(hex)) {
        hex = '#3c3c3c'; // Default to dark grey if hex is invalid
        console.warn(`Invalid hex color provided: ${hex}. Using default.`);
    }
    // 默认透明度处理
    const validOpacity = (opacity !== null && opacity !== undefined && opacity >= 0 && opacity <= 1) ? opacity : 0.7;

    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${validOpacity})`;
}

/**
 * 辅助函数 - rgba转hex
 */
function rgbaToHex(rgba) {
    if (!rgba || typeof rgba !== 'string') {
        return '#000000'; // Default black
    }
    // 匹配 rgba(r, g, b, a) 或 rgb(r, g, b)
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
    if (!match) {
        // If it's already a valid hex, return it, otherwise default black
        return /^#[0-9A-F]{6}$/i.test(rgba) ? rgba.toUpperCase() : '#000000';
    }
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    // Ensure values are within 0-255 range
    const hexR = Math.max(0, Math.min(255, r)).toString(16).padStart(2, '0');
    const hexG = Math.max(0, Math.min(255, g)).toString(16).padStart(2, '0');
    const hexB = Math.max(0, Math.min(255, b)).toString(16).padStart(2, '0');
    return `#${hexR}${hexG}${hexB}`.toUpperCase();
}

/**
 * 辅助函数 - 获取rgba的透明度值
 */
function getOpacityFromRgba(rgba) {
    if (!rgba || typeof rgba !== 'string') {
        return 1; // Default opaque
    }
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
    // If no alpha value is found (rgb format or invalid), default to 1
    if (!match || match[4] === undefined) return 1;
    const opacity = parseFloat(match[4]);
    // Ensure opacity is within 0-1 range
    return Math.max(0, Math.min(1, opacity));
}

/**
 * 配对并同步所有颜色选择器和文本输入框
 */
function setupColorPickerSync() {
    document.querySelectorAll('.qr-color-picker').forEach(picker => {
        const textId = picker.id.replace('-picker', '-text'); // Derive text input ID
        const textInput = document.getElementById(textId);
        if (!textInput) return;

        // Initialize text input with current picker value
        textInput.value = picker.value.toUpperCase();

        // Picker changes -> update text input
        picker.addEventListener('input', () => {
            textInput.value = picker.value.toUpperCase();
        });

        // Text input changes -> update picker (if valid hex)
        textInput.addEventListener('input', () => {
            const value = textInput.value.trim();
            if (/^#?([0-9A-F]{6})$/i.test(value)) {
                const color = value.startsWith('#') ? value : '#' + value;
                picker.value = color;
                // Ensure text input shows '#' and is uppercase
                textInput.value = color.toUpperCase();
            }
        });
         // Also handle 'change' event for text input (e.g., when losing focus)
         textInput.addEventListener('change', () => {
             const value = textInput.value.trim();
             if (/^#?([0-9A-F]{6})$/i.test(value)) {
                 const color = value.startsWith('#') ? value : '#' + value;
                 picker.value = color;
                 textInput.value = color.toUpperCase();
             } else {
                 // If invalid, revert text input to picker's current value
                 textInput.value = picker.value.toUpperCase();
             }
         });
    });
}

/**
 * Sets up all event listeners for the plugin.
 */
export function setupEventListeners() {
    const { rocketButton } = sharedState.domElements; // Only need rocketButton from state here

    // 主要按钮和菜单外部点击监听
    rocketButton?.addEventListener('click', handleRocketButtonClick);
    document.addEventListener('click', handleOutsideClick);

    // --- 设置相关的监听器 ---
    // Use IDs defined in Constants to get elements
    const enabledDropdown = document.getElementById(Constants.ID_SETTINGS_ENABLED_DROPDOWN);
    const iconTypeDropdown = document.getElementById(Constants.ID_ICON_TYPE_DROPDOWN);
    const customIconUrlInput = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
    const customIconSizeInput = document.getElementById(Constants.ID_CUSTOM_ICON_SIZE_INPUT); // <-- New
    const faIconCodeInput = document.getElementById(Constants.ID_FA_ICON_CODE_INPUT);       // <-- New
    const colorMatchCheckbox = document.getElementById(Constants.ID_COLOR_MATCH_CHECKBOX);
    const fileUploadTrigger = document.querySelector(`button[onclick*="${'icon-file-upload'}"]`); // Find button that triggers file input
    const fileUploadInput = document.getElementById('icon-file-upload'); // The actual file input

    // Add listeners, calling handleSettingsChange from settings.js
    enabledDropdown?.addEventListener('change', handleSettingsChange);
    iconTypeDropdown?.addEventListener('change', handleSettingsChange);
    customIconUrlInput?.addEventListener('input', handleSettingsChange);
    customIconSizeInput?.addEventListener('input', handleSettingsChange); // <-- New
    faIconCodeInput?.addEventListener('input', handleSettingsChange);       // <-- New
    colorMatchCheckbox?.addEventListener('change', handleSettingsChange);

    // File upload is handled in settings.js (handleFileUpload, setupSettingsEventListeners)
    // Ensure those are called appropriately during initialization.

    // --- 其他按钮监听器 ---
    const usageButton = document.getElementById(Constants.ID_USAGE_BUTTON);
    const usageCloseButton = document.getElementById(`${Constants.ID_USAGE_PANEL}-close`);
    const menuStyleButton = document.getElementById(Constants.ID_MENU_STYLE_BUTTON);
    const stylePanelCloseButton = document.getElementById(`${Constants.ID_MENU_STYLE_PANEL}-close`);
    const styleApplyButton = document.getElementById(`${Constants.ID_MENU_STYLE_PANEL}-apply`);
    const styleResetButton = document.getElementById(Constants.ID_RESET_STYLE_BUTTON);

    // Add listeners for these buttons, calling functions from this file or settings.js
    usageButton?.addEventListener('click', handleUsageButtonClick); // from settings.js
    usageCloseButton?.addEventListener('click', closeUsagePanel); // from settings.js
    menuStyleButton?.addEventListener('click', handleMenuStyleButtonClick); // from this file
    stylePanelCloseButton?.addEventListener('click', closeMenuStylePanel); // from this file
    styleApplyButton?.addEventListener('click', applyMenuStyles); // from this file
    styleResetButton?.addEventListener('click', resetMenuStyles); // from this file

    // 不透明度滑块监听
    const itemOpacitySlider = document.getElementById('qr-item-opacity');
    itemOpacitySlider?.addEventListener('input', function() {
        const valueSpan = document.getElementById('qr-item-opacity-value');
        if(valueSpan) valueSpan.textContent = this.value;
    });
    const menuOpacitySlider = document.getElementById('qr-menu-opacity');
    menuOpacitySlider?.addEventListener('input', function() {
        const valueSpan = document.getElementById('qr-menu-opacity-value');
        if(valueSpan) valueSpan.textContent = this.value;
    });

    // 设置颜色选择器与文本输入框同步
    setupColorPickerSync(); // from this file

    console.log(`[${Constants.EXTENSION_NAME}] Event listeners set up.`);
}
