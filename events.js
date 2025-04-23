// events.js
import * as Constants from './constants.js';
import { sharedState, setMenuVisible } from './state.js';
import { updateMenuVisibilityUI } from './ui.js';
// 确保导入 triggerQuickReply (现在只用于标准QR)
import { triggerQuickReply } from './api.js';
import { handleSettingsChange, handleUsageButtonClick, closeUsagePanel } from './settings.js';
// 导入 extension_settings 以便在样式函数中使用
import { extension_settings } from './index.js'; 

/**
 * Handles clicks on the rocket button. Toggles menu visibility state and updates UI.
 */
export function handleRocketButtonClick() {
    setMenuVisible(!sharedState.menuVisible); // Toggle state
    updateMenuVisibilityUI(); // Update UI based on new state (this will fetch and render replies)
}

/**
 * Handles clicks outside the menu and the rocket button to close the menu.
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
 * Handles clicks on individual quick reply items (buttons) in the QR助手 menu.
 * Determines if it's a standard QR or a JS Runner button and acts accordingly.
 * @param {Event} event The click event object, where event.currentTarget is the button clicked inside the menu.
 */
export async function handleQuickReplyClick(event) {
    const button = event.currentTarget; // The button inside QR助手 menu
    const setName = button.dataset.setName;
    const label = button.dataset.label;
    const isStandard = button.dataset.isStandard === 'true';

    if (!label) {
        console.error(`[${Constants.EXTENSION_NAME}] Missing data-label on clicked item.`);
        setMenuVisible(false);
        updateMenuVisibilityUI();
        return;
    }

    if (isStandard) {
        // --- 处理标准 Quick Reply ---
        if (!setName) {
             console.error(`[${Constants.EXTENSION_NAME}] Missing data-set-name for standard QR: ${label}`);
        } else {
            await triggerQuickReply(setName, label);
        }
    } else {
        // --- 处理 JS Runner 按钮 (模拟点击原始按钮) ---
        console.log(`[${Constants.EXTENSION_NAME}] Handling JS Runner button: "${label}"`);
        try {
            const jsRunnerButtonContainer = document.getElementById('TH-script-buttons');
            let originalButton = null;

            if (jsRunnerButtonContainer) {
                // ***** 重要修改：使用正确的选择器查找 div *****
                const buttons = jsRunnerButtonContainer.querySelectorAll('div.qr--button.menu_button.interactable');
                // ***********************************************
                for (const btnDiv of buttons) { // 现在变量是 btnDiv
                    if (btnDiv.textContent?.trim() === label) {
                        originalButton = btnDiv;
                        break;
                    }
                }
            }

            if (originalButton) {
                console.log(`[${Constants.EXTENSION_NAME}] Found original JS Runner button (div) for "${label}". Simulating click...`);
                originalButton.click(); // 模拟点击原始的 div
                console.log(`[${Constants.EXTENSION_NAME}] Click simulated for "${label}".`);
            } else {
                console.error(`[${Constants.EXTENSION_NAME}] Could not find the original JS Runner button (div) with label "${label}" in #TH-script-buttons.`);
            }
        } catch (error) {
            console.error(`[${Constants.EXTENSION_NAME}] Error simulating click for JS Runner button "${label}":`, error);
        }
    }

    // 关闭菜单
    setTimeout(() => {
        setMenuVisible(false);
        updateMenuVisibilityUI();
    }, 50);
}


/**
 * 处理菜单样式按钮点击
 */
export function handleMenuStyleButtonClick() {
    const stylePanel = document.getElementById(Constants.ID_MENU_STYLE_PANEL);
    if (stylePanel) {
        loadMenuStylesIntoPanel();
        stylePanel.style.display = 'block';
    }
}

/**
 * 将当前菜单样式加载到设置面板中
 */
function loadMenuStylesIntoPanel() {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    const styles = settings.menuStyles || JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));

    // Helper to safely get style values or defaults
    const getStyleValue = (key, defaultValue) => styles[key] !== undefined ? styles[key] : defaultValue;

    // Item Background Color and Opacity
    const itemBgRgba = getStyleValue('itemBgColor', Constants.DEFAULT_MENU_STYLES.itemBgColor);
    document.getElementById('qr-item-bgcolor-picker').value = rgbaToHex(itemBgRgba);
    document.getElementById('qr-item-bgcolor-text').value = rgbaToHex(itemBgRgba).toUpperCase();
    document.getElementById('qr-item-opacity').value = getOpacityFromRgba(itemBgRgba);
    document.getElementById('qr-item-opacity-value').textContent = getOpacityFromRgba(itemBgRgba);

    // Item Text Color
    const itemTextColor = getStyleValue('itemTextColor', Constants.DEFAULT_MENU_STYLES.itemTextColor);
    document.getElementById('qr-item-color-picker').value = itemTextColor;
    document.getElementById('qr-item-color-text').value = itemTextColor.toUpperCase();

    // Title Text Color
    const titleColor = getStyleValue('titleColor', Constants.DEFAULT_MENU_STYLES.titleColor);
    document.getElementById('qr-title-color-picker').value = titleColor;
    document.getElementById('qr-title-color-text').value = titleColor.toUpperCase();

    // Title Border Color
    const titleBorderColor = getStyleValue('titleBorderColor', Constants.DEFAULT_MENU_STYLES.titleBorderColor);
    document.getElementById('qr-title-border-picker').value = titleBorderColor;
    document.getElementById('qr-title-border-text').value = titleBorderColor.toUpperCase();

    // Empty Text Color
    const emptyColor = getStyleValue('emptyTextColor', Constants.DEFAULT_MENU_STYLES.emptyTextColor);
    document.getElementById('qr-empty-color-picker').value = emptyColor;
    document.getElementById('qr-empty-color-text').value = emptyColor.toUpperCase();

    // Menu Background Color and Opacity
    const menuBgRgba = getStyleValue('menuBgColor', Constants.DEFAULT_MENU_STYLES.menuBgColor);
    document.getElementById('qr-menu-bgcolor-picker').value = rgbaToHex(menuBgRgba);
    document.getElementById('qr-menu-bgcolor-text').value = rgbaToHex(menuBgRgba).toUpperCase();
    document.getElementById('qr-menu-opacity').value = getOpacityFromRgba(menuBgRgba);
    document.getElementById('qr-menu-opacity-value').textContent = getOpacityFromRgba(menuBgRgba);

    // Menu Border Color
    const menuBorderColor = getStyleValue('menuBorderColor', Constants.DEFAULT_MENU_STYLES.menuBorderColor);
    document.getElementById('qr-menu-border-picker').value = menuBorderColor;
    document.getElementById('qr-menu-border-text').value = menuBorderColor.toUpperCase();
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

    // 从颜色选择器或文本输入框获取值 (优先文本框，如果合法)
    function getColorValue(pickerId, defaultHex) {
        const textInput = document.getElementById(pickerId + '-text');
        if (textInput && /^#[0-9A-F]{6}$/i.test(textInput.value)) {
            return textInput.value;
        }
        const picker = document.getElementById(pickerId);
        return picker ? picker.value : defaultHex;
    }

    // 获取各项颜色值
    const itemBgHex = getColorValue('qr-item-bgcolor-picker', '#3c3c3c');
    const itemOpacity = document.getElementById('qr-item-opacity').value;
    settings.menuStyles.itemBgColor = hexToRgba(itemBgHex, itemOpacity);

    settings.menuStyles.itemTextColor = getColorValue('qr-item-color-picker', '#ffffff');
    settings.menuStyles.titleColor = getColorValue('qr-title-color-picker', '#cccccc');
    settings.menuStyles.titleBorderColor = getColorValue('qr-title-border-picker', '#444444');
    settings.menuStyles.emptyTextColor = getColorValue('qr-empty-color-picker', '#666666');

    const menuBgHex = getColorValue('qr-menu-bgcolor-picker', '#000000');
    const menuOpacity = document.getElementById('qr-menu-opacity').value;
    settings.menuStyles.menuBgColor = hexToRgba(menuBgHex, menuOpacity);

    settings.menuStyles.menuBorderColor = getColorValue('qr-menu-border-picker', '#555555');

    // 应用样式到菜单
    updateMenuStylesUI();

    // 关闭面板
    closeMenuStylePanel();

    // 触Settings保存 (如果可用)
    if (typeof window.quickReplyMenu !== 'undefined' && window.quickReplyMenu.saveSettings) {
        window.quickReplyMenu.saveSettings();
    } else {
         console.warn(`[${Constants.EXTENSION_NAME}] Cannot automatically save style settings.`);
         // 可以在这里尝试localStorage备份
         try {
             localStorage.setItem('QRA_settings', JSON.stringify(extension_settings[Constants.EXTENSION_NAME]));
         } catch(e) { console.error('Failed to save styles to localStorage:', e); }
    }
}

/**
 * 重置样式到默认值
 */
export function resetMenuStyles() {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    settings.menuStyles = JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));

    // 重新加载面板以显示默认值
    loadMenuStylesIntoPanel();

    // 应用默认样式到UI
    updateMenuStylesUI();

    // 触Settings保存 (如果可用)
    if (typeof window.quickReplyMenu !== 'undefined' && window.quickReplyMenu.saveSettings) {
        window.quickReplyMenu.saveSettings();
    }
}

/**
 * 更新菜单的实际样式 (通过CSS变量)
 */
export function updateMenuStylesUI() {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    // 使用 || 提供默认值，以防 menuStyles 尚未初始化
    const styles = settings.menuStyles || Constants.DEFAULT_MENU_STYLES;
    const root = document.documentElement;

    // Helper to safely set CSS property
    const setCssVar = (varName, value, defaultValue) => {
        root.style.setProperty(varName, value !== undefined ? value : defaultValue);
    };

    setCssVar('--qr-item-bg-color', styles.itemBgColor, Constants.DEFAULT_MENU_STYLES.itemBgColor);
    setCssVar('--qr-item-text-color', styles.itemTextColor, Constants.DEFAULT_MENU_STYLES.itemTextColor);
    setCssVar('--qr-title-color', styles.titleColor, Constants.DEFAULT_MENU_STYLES.titleColor);
    setCssVar('--qr-title-border-color', styles.titleBorderColor, Constants.DEFAULT_MENU_STYLES.titleBorderColor);
    setCssVar('--qr-empty-text-color', styles.emptyTextColor, Constants.DEFAULT_MENU_STYLES.emptyTextColor);
    setCssVar('--qr-menu-bg-color', styles.menuBgColor, Constants.DEFAULT_MENU_STYLES.menuBgColor);
    setCssVar('--qr-menu-border-color', styles.menuBorderColor, Constants.DEFAULT_MENU_STYLES.menuBorderColor);
}

/**
 * 辅助函数 - hex转rgba
 */
function hexToRgba(hex, opacity) {
    // 改进：处理无效输入
    if (!hex || !/^#[0-9A-F]{6}$/i.test(hex)) {
        hex = '#3c3c3c'; // Default to gray if hex is invalid
        console.warn(`Invalid hex color: ${hex}. Using default.`);
    }
    opacity = (opacity !== undefined && !isNaN(parseFloat(opacity))) ? parseFloat(opacity) : 0.7; // Default opacity

    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * 辅助函数 - rgba转hex (忽略透明度)
 */
function rgbaToHex(rgba) {
    if (!rgba || typeof rgba !== 'string') {
        return '#000000'; // Default black
    }
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
    if (!match) {
        return rgba.startsWith('#') ? rgba.substring(0, 7) : '#000000'; // Return if already hex or default black
    }
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    // Ensure values are within 0-255
    const toHex = (c) => ('0' + Math.max(0, Math.min(255, c)).toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 辅助函数 - 获取rgba的透明度值
 */
function getOpacityFromRgba(rgba) {
    if (!rgba || typeof rgba !== 'string') {
        return 1; // Default opaque
    }
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
    if (!match || match[4] === undefined) { // Check if opacity value exists
        return 1; // Default opaque if alpha channel is missing
    }
    const opacity = parseFloat(match[4]);
    return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity)); // Clamp between 0 and 1
}

/**
 * 配对并同步所有颜色选择器和文本输入框
 */
function setupColorPickerSync() {
    document.querySelectorAll('.qr-color-picker').forEach(picker => {
        const textId = picker.id.replace('-picker', '-text'); // More robust ID derivation
        const textInput = document.getElementById(textId);
        if (!textInput) return;

        // Initialize text input from picker
        textInput.value = picker.value.toUpperCase();

        // Picker changes -> Update text input
        picker.addEventListener('input', () => {
            textInput.value = picker.value.toUpperCase();
        });

        // Text input changes -> Update picker (if valid hex)
        textInput.addEventListener('input', () => {
            let value = textInput.value.trim().toUpperCase();
            if (!value.startsWith('#')) {
                value = '#' + value;
            }
            if (/^#[0-9A-F]{6}$/i.test(value)) {
                picker.value = value;
                textInput.value = value; // Ensure consistent casing/format
            }
        });
        // Also validate on blur/change for better UX
        textInput.addEventListener('change', () => {
             let value = textInput.value.trim().toUpperCase();
            if (!value.startsWith('#')) {
                value = '#' + value;
            }
             if (/^#[0-9A-F]{6}$/i.test(value)) {
                 picker.value = value;
                 textInput.value = value;
             } else {
                 // Revert to picker's current value if text input is invalid
                 textInput.value = picker.value.toUpperCase();
             }
        });
    });
}

/**
 * 处理文件上传并更新设置
 * @param {Event} event
 */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Optional: Check file size or type here if needed
    // const maxSize = 500 * 1024; // 500 KB limit example
    // if (file.size > maxSize) { alert('文件过大!'); return; }
    // if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/gif'].includes(file.type)) { alert('不支持的文件类型!'); return; }

    const reader = new FileReader();
    reader.onload = function(e) {
        const customIconUrlInput = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
        if (customIconUrlInput) {
            const base64Result = e.target.result;
            customIconUrlInput.value = base64Result; // Display base64 string

            // Manually trigger an 'input' event so handleSettingsChange picks it up
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            customIconUrlInput.dispatchEvent(inputEvent);
        }
    };
    reader.onerror = function(e) {
        console.error(`[${Constants.EXTENSION_NAME}] Error reading file:`, e);
        alert('读取文件时出错。');
    };
    reader.readAsDataURL(file); // Read file as Base64
}


/**
 * Sets up all event listeners for the plugin.
 */
export function setupEventListeners() {
    const {
        rocketButton,
        settingsDropdown,
        iconTypeDropdown,
        customIconUrl,
        colorMatchCheckbox,
        menu // Get the menu element reference
    } = sharedState.domElements;

    // --- Core Menu Interaction ---
    rocketButton?.addEventListener('click', handleRocketButtonClick);
    document.addEventListener('click', handleOutsideClick);

    // --- Quick Reply Item Clicks (Event Delegation on Menu) ---
    if (menu) {
        menu.addEventListener('click', (event) => {
            // Find the closest ancestor button with the correct class
            const targetButton = event.target.closest(`.${Constants.CLASS_ITEM}`);
            // Ensure it's the button itself and has the necessary dataset type
            if (targetButton && targetButton.matches(`.${Constants.CLASS_ITEM}`) && targetButton.dataset.type === 'quick-reply-item') {
                // Call the unified handler, passing the button as currentTarget
                handleQuickReplyClick({ currentTarget: targetButton });
            }
        });
    } else {
        console.error(`[${Constants.EXTENSION_NAME}] Menu element not found for setting up click delegation.`);
    }


    // --- Settings Panel Listeners ---
    settingsDropdown?.addEventListener('change', handleSettingsChange);
    iconTypeDropdown?.addEventListener('change', handleSettingsChange); // handleSettingsChange now handles icon preview updates indirectly
    customIconUrl?.addEventListener('input', handleSettingsChange); // Use 'input' for immediate feedback
    colorMatchCheckbox?.addEventListener('change', handleSettingsChange);

    // --- Usage Panel ---
    const usageButton = document.getElementById(Constants.ID_USAGE_BUTTON);
    usageButton?.addEventListener('click', handleUsageButtonClick);
    // The usage panel close button listener is now added dynamically when the panel is created in settings.js

    // --- Menu Style Panel ---
    const menuStyleButton = document.getElementById(Constants.ID_MENU_STYLE_BUTTON);
    menuStyleButton?.addEventListener('click', handleMenuStyleButtonClick);

    const stylePanel = document.getElementById(Constants.ID_MENU_STYLE_PANEL);
    if (stylePanel) {
        const closeButton = stylePanel.querySelector(`#${Constants.ID_MENU_STYLE_PANEL}-close`);
        closeButton?.addEventListener('click', closeMenuStylePanel);

        const applyButton = stylePanel.querySelector(`#${Constants.ID_MENU_STYLE_PANEL}-apply`);
        applyButton?.addEventListener('click', applyMenuStyles);

        const resetButton = stylePanel.querySelector(`#${Constants.ID_RESET_STYLE_BUTTON}`); // Directly get reset button by ID
        resetButton?.addEventListener('click', resetMenuStyles);

        // Opacity Sliders
        const itemOpacitySlider = stylePanel.querySelector('#qr-item-opacity');
        itemOpacitySlider?.addEventListener('input', function() {
            const valueDisplay = stylePanel.querySelector('#qr-item-opacity-value');
            if(valueDisplay) valueDisplay.textContent = this.value;
        });

        const menuOpacitySlider = stylePanel.querySelector('#qr-menu-opacity');
        menuOpacitySlider?.addEventListener('input', function() {
             const valueDisplay = stylePanel.querySelector('#qr-menu-opacity-value');
             if(valueDisplay) valueDisplay.textContent = this.value;
        });

        // Set up color picker synchronization within the style panel
        setupColorPickerSync();
    } else {
         console.warn(`[${Constants.EXTENSION_NAME}] Menu style panel not found for setting up listeners.`);
    }


    // --- Custom Icon File Upload ---
    const fileUploadInput = document.getElementById('icon-file-upload'); // Get the hidden file input
    if (fileUploadInput) {
        fileUploadInput.addEventListener('change', handleFileUpload);
    }
    // The "选择文件" button's click is handled by inline HTML onclick to trigger the hidden input.

    // --- Save Settings Button ---
    // The save button listener is now added dynamically in settings.js or triggered via window.quickReplyMenu.saveSettings

    console.log(`[${Constants.EXTENSION_NAME}] All event listeners set up.`);
}
