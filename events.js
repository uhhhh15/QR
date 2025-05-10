// events.js
import * as Constants from './constants.js';
import { sharedState, setMenuVisible } from './state.js';
import { updateMenuVisibilityUI } from './ui.js';
// 从 api.js 导入 triggerQuickReply 和新增的 triggerJsRunnerScript
import { triggerQuickReply, triggerJsRunnerScript } from './api.js';
// 导入 settings.js 中的函数用于处理设置变化和UI更新
// handleSettingsChange, handleUsageButtonClick, closeUsagePanel, updateIconDisplay 都在 settings.js 中定义和导出
import { handleSettingsChange, handleUsageButtonClick, closeUsagePanel, updateIconDisplay } from './settings.js';
// 导入 index.js 的设置对象 (用于样式函数)
import { extension_settings } from './index.js'; // Assuming index.js exports extension_settings

/**
 * Handles clicks on the rocket button. Toggles menu visibility state and updates UI.
 */
export function handleRocketButtonClick() {
    setMenuVisible(!sharedState.menuVisible); // Toggle state
    updateMenuVisibilityUI(); // Update UI based on new state (will fetch/render replies if opening)
}

/**
 * Handles clicks outside the menu to close it.
 * Also closes the style panel or usage panel if they are open and clicked outside.
 * @param {Event} event
 */
export function handleOutsideClick(event) {
    const { menu, rocketButton } = sharedState.domElements;
    const stylePanel = document.getElementById(Constants.ID_MENU_STYLE_PANEL);
    const usagePanel = document.getElementById(Constants.ID_USAGE_PANEL);
    const styleButton = document.getElementById(Constants.ID_MENU_STYLE_BUTTON);
    const usageButton = document.getElementById(Constants.ID_USAGE_BUTTON);

    // Close main menu if click is outside menu and its trigger button
    if (sharedState.menuVisible &&
        menu && rocketButton &&
        !menu.contains(event.target) &&
        event.target !== rocketButton &&
        !rocketButton.contains(event.target) // Check if click is not inside the rocket button either
       ) {
        setMenuVisible(false); // Update state
        updateMenuVisibilityUI(); // Update UI
    }

    // Close style panel if click is outside the panel and its trigger button
    if (stylePanel && stylePanel.style.display === 'block' &&
        !stylePanel.contains(event.target) &&
        event.target !== styleButton && // Don't close if clicking the trigger button again
        !styleButton?.contains(event.target)
       ) {
        closeMenuStylePanel(); // Use the specific close function
    }

    // Close usage panel if click is outside the panel and its trigger button
    if (usagePanel && usagePanel.style.display === 'block' &&
        !usagePanel.contains(event.target) &&
        event.target !== usageButton && // Don't close if clicking the trigger button again
        !usageButton?.contains(event.target)
       ) {
        closeUsagePanel(); // Use the specific close function from settings.js
    }
}


/**
 * Handles clicks on individual quick reply items (buttons).
 * Reads data attributes.
 * If it's a standard reply, triggers the API call.
 * If it's a JS Runner proxy, triggers the JS Runner script via event.
 * @param {Event} event The click event on the button.
 */
export async function handleQuickReplyClick(event) {
    const button = event.currentTarget; // 获取被点击的菜单项按钮
    const label = button.dataset.label;
    const isStandard = button.dataset.isStandard !== 'false'; // 'true' 或 undefined 为 true

    if (!label || label.trim() === "") {
        console.error(`[${Constants.EXTENSION_NAME}] Missing valid data-label on clicked item.`);
        setMenuVisible(false);
        updateMenuVisibilityUI();
        return;
    }

    // 先关闭菜单，再执行操作
    setMenuVisible(false);
    updateMenuVisibilityUI();

    if (isStandard) {
        // --- 标准 Quick Reply v2 行为 ---
        const setName = button.dataset.setName;
        if (!setName) {
            console.error(`[${Constants.EXTENSION_NAME}] Missing data-set-name for standard reply item "${label}".`);
            return;
        }
        console.log(`[${Constants.EXTENSION_NAME} Debug] Clicked standard reply: ${setName} / ${label}. Triggering API...`);
        try {
            // 调用 api.js 中的 triggerQuickReply
            await triggerQuickReply(setName, label);
        } catch (error) {
            console.error(`[${Constants.EXTENSION_NAME}] Error occurred during triggerQuickReply for "${setName}.${label}".`, error);
        }
    } else {
        // --- JS Runner 按钮代理行为：通过事件触发 ---
        const scriptId = button.dataset.scriptId;
        if (!scriptId) {
            console.error(`[${Constants.EXTENSION_NAME}] Missing data-script-id for JS Runner proxy reply "${label}".`);
            return;
        }
        console.log(`[${Constants.EXTENSION_NAME} Debug] Clicked JS Runner proxy for scriptId: "${scriptId}", label: "${label}". Triggering script...`);
        try {
            // 调用 api.js 中的 triggerJsRunnerScript
            await triggerJsRunnerScript(scriptId, label);
        } catch (error) {
            console.error(`[${Constants.EXTENSION_NAME}] Error triggering JS Runner script for scriptId "${scriptId}", label "${label}".`, error);
        }
    }
    // 不再需要模拟点击DOM元素，直接触发JS-Slash-Runner监听的事件即可
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
         // 计算并设置面板位置...
         const windowHeight = window.innerHeight;
         const panelHeight = stylePanel.offsetHeight;
         const topPosition = Math.max(50, (windowHeight - panelHeight) / 2); // 尝试垂直居中，最小top为50px
         stylePanel.style.top = `${topPosition}px`;
         stylePanel.style.transform = 'translateX(-50%)';
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
        else console.warn(`[${Constants.EXTENSION_NAME} Style Panel] Element not found: #${id}`);
    };
    const safeSetText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
         else console.warn(`[${Constants.EXTENSION_NAME} Style Panel] Element not found: #${id}`);
    };

    // 设置各个控件的值时添加检查
    const itemBgColorHex = styles.itemBgColor && typeof styles.itemBgColor === 'string' ? rgbaToHex(styles.itemBgColor) : '#3c3c3c';
    safeSetValue('qr-item-bgcolor-picker', itemBgColorHex);
    safeSetValue('qr-item-bgcolor-text', itemBgColorHex.toUpperCase());

    const itemOpacity = styles.itemBgColor && typeof styles.itemBgColor === 'string' ? getOpacityFromRgba(styles.itemBgColor) : 0.7;
    safeSetValue('qr-item-opacity', itemOpacity);
    safeSetText('qr-item-opacity-value', itemOpacity.toFixed(1)); // 显示一位小数

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
    safeSetText('qr-menu-opacity-value', menuOpacity.toFixed(2)); // 显示两位小数

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
    // 检查 settings 对象是否存在
    if (!window.extension_settings || !window.extension_settings[Constants.EXTENSION_NAME]) {
        console.error(`[${Constants.EXTENSION_NAME}] Settings object not found. Cannot apply styles.`);
        return;
    }
    const settings = window.extension_settings[Constants.EXTENSION_NAME];
    if (!settings.menuStyles) {
        settings.menuStyles = JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));
    }

    // Helper to get value safely
    const safeGetValue = (id, defaultValue) => {
        const element = document.getElementById(id);
        return element ? element.value : defaultValue;
    };

    // 从颜色选择器或文本输入框获取值
    function getColorValue(pickerId, defaultValue) {
        const textInput = document.getElementById(pickerId + '-text');
        // Prefer valid hex from text input
        if (textInput && /^#[0-9A-F]{6}$/i.test(textInput.value)) {
            return textInput.value;
        }
        // Fallback to picker value if it exists
        const picker = document.getElementById(pickerId);
        if (picker && picker.value) {
            return picker.value;
        }
        // Finally, return the default value
        return defaultValue;
    }

    // 获取各项颜色值和透明度
    const itemBgColorHex = getColorValue('qr-item-bgcolor-picker', '#3c3c3c');
    const itemOpacity = parseFloat(safeGetValue('qr-item-opacity', 0.7)); // Ensure opacity is a number
    settings.menuStyles.itemBgColor = hexToRgba(itemBgColorHex, itemOpacity);

    settings.menuStyles.itemTextColor = getColorValue('qr-item-color-picker', '#ffffff');
    settings.menuStyles.titleColor = getColorValue('qr-title-color-picker', '#cccccc');
    settings.menuStyles.titleBorderColor = getColorValue('qr-title-border-picker', '#444444');
    settings.menuStyles.emptyTextColor = getColorValue('qr-empty-color-picker', '#666666');

    const menuBgColorHex = getColorValue('qr-menu-bgcolor-picker', '#000000');
    const menuOpacity = parseFloat(safeGetValue('qr-menu-opacity', 0.85)); // Ensure opacity is a number
    settings.menuStyles.menuBgColor = hexToRgba(menuBgColorHex, menuOpacity);

    settings.menuStyles.menuBorderColor = getColorValue('qr-menu-border-picker', '#555555');

    // 删除followTheme属性（如果存在，用于旧版兼容）
    delete settings.menuStyles.followTheme;

    // 应用样式到菜单
    updateMenuStylesUI();

    // 关闭面板
    closeMenuStylePanel();

    // 提示用户需要保存设置
    console.log(`[${Constants.EXTENSION_NAME}] Menu styles applied. Remember to save extension settings.`);
    // Optionally, show a temporary message near the save button
     const saveStatus = document.getElementById('qr-save-status');
     if (saveStatus) {
        saveStatus.textContent = '样式已应用，请保存设置';
        saveStatus.style.color = '#ff9800'; // Orange warning color
        setTimeout(() => { if(saveStatus.textContent === '样式已应用，请保存设置') saveStatus.textContent = ''; }, 3000);
     }
}

/**
 * 重置样式到默认值
 */
export function resetMenuStyles() {
    // 检查 settings 对象是否存在
    if (!window.extension_settings || !window.extension_settings[Constants.EXTENSION_NAME]) {
        console.error(`[${Constants.EXTENSION_NAME}] Settings object not found. Cannot reset styles.`);
        return;
    }
    const settings = window.extension_settings[Constants.EXTENSION_NAME];
    settings.menuStyles = JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));

    // 重新加载面板以显示默认值
    loadMenuStylesIntoPanel();

    // 应用默认样式到菜单
    updateMenuStylesUI();

    // 提示用户需要保存
    console.log(`[${Constants.EXTENSION_NAME}] Menu styles reset to default. Remember to save extension settings.`);
     const saveStatus = document.getElementById('qr-save-status');
     if (saveStatus) {
        saveStatus.textContent = '样式已重置，请保存设置';
        saveStatus.style.color = '#ff9800'; // Orange warning color
        setTimeout(() => { if(saveStatus.textContent === '样式已重置，请保存设置') saveStatus.textContent = ''; }, 3000);
     }
}

/**
 * 更新菜单的实际样式 (应用CSS变量)
 */
export function updateMenuStylesUI() {
    // 检查 settings 对象是否存在
     if (!window.extension_settings || !window.extension_settings[Constants.EXTENSION_NAME]) {
         console.warn(`[${Constants.EXTENSION_NAME}] Settings object not found for applying styles. Using defaults.`);
         // Apply default styles directly if settings are missing
         const defaults = Constants.DEFAULT_MENU_STYLES;
         document.documentElement.style.setProperty('--qr-item-bg-color', defaults.itemBgColor);
         document.documentElement.style.setProperty('--qr-item-text-color', defaults.itemTextColor);
         document.documentElement.style.setProperty('--qr-title-color', defaults.titleColor);
         document.documentElement.style.setProperty('--qr-title-border-color', defaults.titleBorderColor);
         document.documentElement.style.setProperty('--qr-empty-text-color', defaults.emptyTextColor);
         document.documentElement.style.setProperty('--qr-menu-bg-color', defaults.menuBgColor);
         document.documentElement.style.setProperty('--qr-menu-border-color', defaults.menuBorderColor);
         return;
     }
    const settings = window.extension_settings[Constants.EXTENSION_NAME];
    // 使用当前设置或默认值
    const styles = settings.menuStyles || Constants.DEFAULT_MENU_STYLES;

    const menu = document.getElementById(Constants.ID_MENU);
    if (!menu) return; // Don't apply if menu doesn't exist

    // 应用自定义样式到 CSS 变量
    document.documentElement.style.setProperty('--qr-item-bg-color', styles.itemBgColor || Constants.DEFAULT_MENU_STYLES.itemBgColor);
    document.documentElement.style.setProperty('--qr-item-text-color', styles.itemTextColor || Constants.DEFAULT_MENU_STYLES.itemTextColor);
    document.documentElement.style.setProperty('--qr-title-color', styles.titleColor || Constants.DEFAULT_MENU_STYLES.titleColor);
    document.documentElement.style.setProperty('--qr-title-border-color', styles.titleBorderColor || Constants.DEFAULT_MENU_STYLES.titleBorderColor);
    document.documentElement.style.setProperty('--qr-empty-text-color', styles.emptyTextColor || Constants.DEFAULT_MENU_STYLES.emptyTextColor);
    document.documentElement.style.setProperty('--qr-menu-bg-color', styles.menuBgColor || Constants.DEFAULT_MENU_STYLES.menuBgColor);
    document.documentElement.style.setProperty('--qr-menu-border-color', styles.menuBorderColor || Constants.DEFAULT_MENU_STYLES.menuBorderColor);
}

/**
 * 辅助函数 - hex转rgba
 */
function hexToRgba(hex, opacity) {
    // 默认颜色处理
    if (!hex || typeof hex !== 'string' || !/^#[0-9A-F]{6}$/i.test(hex)) {
        console.warn(`[${Constants.EXTENSION_NAME} Style Util] Invalid hex color provided: '${hex}'. Using default #3c3c3c.`);
        hex = '#3c3c3c'; // Default to dark grey if hex is invalid
    }
    // 默认透明度处理
    const validOpacity = (opacity !== null && opacity !== undefined && !isNaN(opacity) && opacity >= 0 && opacity <= 1) ? Number(opacity) : 0.7;

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
        if (/^#[0-9A-F]{6}$/i.test(rgba)) {
            return rgba.toUpperCase();
        }
        console.warn(`[${Constants.EXTENSION_NAME} Style Util] Could not parse RGBA: '${rgba}'. Returning default #000000.`);
        return '#000000';
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
    // Ensure opacity is within 0-1 range and is a valid number
    if (isNaN(opacity)) return 1;
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
        try {
             textInput.value = picker.value.toUpperCase();
        } catch (e) {
             console.warn(`[${Constants.EXTENSION_NAME} Style Panel] Could not initialize text input for picker #${picker.id}: ${e}`);
        }

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
    // Rocket button is fetched in initializePlugin and stored in sharedState
    const rocketButton = sharedState.domElements.rocketButton;

    // 主要按钮和菜单外部点击监听
    rocketButton?.addEventListener('click', handleRocketButtonClick);
    // Use capture phase for outside click to potentially handle events stopped by other listeners
    document.addEventListener('click', handleOutsideClick, true);

    // --- 设置相关的监听器 (通过 ID 获取元素) ---
    // Use IDs defined in Constants to get elements safely
    const safeAddListener = (id, event, handler) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            // console.warn(`[${Constants.EXTENSION_NAME} Event Setup] Element not found: #${id}. Cannot add listener.`); // Suppress warnings for elements that might not exist initially
        }
    };

    // Add listeners, calling handleSettingsChange from settings.js
    safeAddListener(Constants.ID_SETTINGS_ENABLED_DROPDOWN, 'change', handleSettingsChange);
    safeAddListener(Constants.ID_ICON_TYPE_DROPDOWN, 'change', handleSettingsChange);
    safeAddListener(Constants.ID_CUSTOM_ICON_URL, 'input', handleSettingsChange);
    safeAddListener(Constants.ID_CUSTOM_ICON_SIZE_INPUT, 'input', handleSettingsChange);
    safeAddListener(Constants.ID_FA_ICON_CODE_INPUT, 'input', handleSettingsChange);
    safeAddListener(Constants.ID_COLOR_MATCH_CHECKBOX, 'change', handleSettingsChange);

    // File upload listener is set up in settings.js -> setupSettingsEventListeners

    // --- 其他按钮监听器 ---
    // Usage button and panel listeners are set up in settings.js -> setupSettingsEventListeners
    // safeAddListener(Constants.ID_USAGE_BUTTON, 'click', handleUsageButtonClick); // from settings.js
    // safeAddListener(`${Constants.ID_USAGE_PANEL}-close`, 'click', closeUsagePanel); // from settings.js

    // Style button and panel listeners
    safeAddListener(Constants.ID_MENU_STYLE_BUTTON, 'click', handleMenuStyleButtonClick); // from this file
    safeAddListener(`${Constants.ID_MENU_STYLE_PANEL}-close`, 'click', closeMenuStylePanel); // from this file
    safeAddListener(`${Constants.ID_MENU_STYLE_PANEL}-apply`, 'click', applyMenuStyles); // from this file
    safeAddListener(Constants.ID_RESET_STYLE_BUTTON, 'click', resetMenuStyles); // from this file

    // 不透明度滑块监听
    safeAddListener('qr-item-opacity', 'input', function(e) {
        const valueSpan = document.getElementById('qr-item-opacity-value');
        if(valueSpan) valueSpan.textContent = parseFloat(e.target.value).toFixed(1); // Format to 1 decimal place
    });
    safeAddListener('qr-menu-opacity', 'input', function(e) {
        const valueSpan = document.getElementById('qr-menu-opacity-value');
        if(valueSpan) valueSpan.textContent = parseFloat(e.target.value).toFixed(2); // Format to 2 decimal places
    });

    // 设置颜色选择器与文本输入框同步 (需要在设置面板HTML创建后执行)
    // Consider calling this after settings HTML is injected or using event delegation
    // For now, call it here, assuming settings elements exist
    setupColorPickerSync(); // from this file

    console.log(`[${Constants.EXTENSION_NAME}] Event listeners set up.`);

    // Note: Click listeners for the actual quick reply items (CLASS_ITEM) are added dynamically
    // in ui.js -> renderQuickReplies, using event delegation or direct attachment.
    // The current implementation attaches directly in renderQuickReplies.
    // The save button listener is also set up in settings.js -> setupSettingsEventListeners
    // safeAddListener('qr-save-settings', 'click', window.quickReplyMenu.saveSettings); // Assuming it's exposed
}
