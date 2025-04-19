// events.js
import * as Constants from './constants.js';
import { sharedState, setMenuVisible } from './state.js';
import { updateMenuVisibilityUI } from './ui.js';
import { triggerQuickReply } from './api.js';
import { handleSettingsChange, handleUsageButtonClick, closeUsagePanel } from './settings.js';
import { extension_settings } from './index.js';

/**
 * Handles clicks on the rocket button. Toggles menu visibility state and updates UI.
 */
export function handleRocketButtonClick() {
    setMenuVisible(!sharedState.menuVisible); // Toggle state
    updateMenuVisibilityUI(); // Update UI based on new state
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

    await triggerQuickReply(setName, label); // Await the API call

    // Always close the menu after attempting to trigger, regardless of success/failure
    setMenuVisible(false);
    updateMenuVisibilityUI();
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
    
    // 设置各个控件的值时添加检查
    const itemBgColorHex = styles.itemBgColor && typeof styles.itemBgColor === 'string' ? rgbaToHex(styles.itemBgColor) : '#3c3c3c';
    document.getElementById('qr-item-bgcolor-picker').value = itemBgColorHex;
    document.getElementById('qr-item-bgcolor-text').value = itemBgColorHex.toUpperCase();
    
    document.getElementById('qr-item-opacity').value = 
        styles.itemBgColor && typeof styles.itemBgColor === 'string' ? getOpacityFromRgba(styles.itemBgColor) : 0.7;
    document.getElementById('qr-item-opacity-value').textContent = 
        styles.itemBgColor && typeof styles.itemBgColor === 'string' ? getOpacityFromRgba(styles.itemBgColor) : 0.7;
    
    const itemTextColor = styles.itemTextColor || '#ffffff';
    document.getElementById('qr-item-color-picker').value = itemTextColor;
    document.getElementById('qr-item-color-text').value = itemTextColor.toUpperCase();
    
    const titleColor = styles.titleColor || '#cccccc';
    document.getElementById('qr-title-color-picker').value = titleColor;
    document.getElementById('qr-title-color-text').value = titleColor.toUpperCase();
    
    const titleBorderColor = styles.titleBorderColor || '#444444';
    document.getElementById('qr-title-border-picker').value = titleBorderColor;
    document.getElementById('qr-title-border-text').value = titleBorderColor.toUpperCase();
    
    const emptyColor = styles.emptyTextColor || '#666666';
    document.getElementById('qr-empty-color-picker').value = emptyColor;
    document.getElementById('qr-empty-color-text').value = emptyColor.toUpperCase();
    
    const menuBgColorHex = styles.menuBgColor && typeof styles.menuBgColor === 'string' ? rgbaToHex(styles.menuBgColor) : '#000000';
    document.getElementById('qr-menu-bgcolor-picker').value = menuBgColorHex;
    document.getElementById('qr-menu-bgcolor-text').value = menuBgColorHex.toUpperCase();
    
    document.getElementById('qr-menu-opacity').value = 
        styles.menuBgColor && typeof styles.menuBgColor === 'string' ? getOpacityFromRgba(styles.menuBgColor) : 0.85;
    document.getElementById('qr-menu-opacity-value').textContent = 
        styles.menuBgColor && typeof styles.menuBgColor === 'string' ? getOpacityFromRgba(styles.menuBgColor) : 0.85;
    
    const menuBorderColor = styles.menuBorderColor || '#555555';
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
    
    // 从颜色选择器或文本输入框获取值
    function getColorValue(pickerId) {
        const textInput = document.getElementById(pickerId + '-text');
        if (textInput && /^#[0-9A-F]{6}$/i.test(textInput.value)) {
            return textInput.value;
        }
        const picker = document.getElementById(pickerId);
        return picker ? picker.value : null;
    }
    
    // 获取各项颜色值
    const itemBgColor = getColorValue('qr-item-bgcolor-picker');
    const itemOpacity = document.getElementById('qr-item-opacity').value;
    settings.menuStyles.itemBgColor = hexToRgba(itemBgColor, itemOpacity);
    
    settings.menuStyles.itemTextColor = getColorValue('qr-item-color-picker');
    settings.menuStyles.titleColor = getColorValue('qr-title-color-picker');
    settings.menuStyles.titleBorderColor = getColorValue('qr-title-border-picker');
    settings.menuStyles.emptyTextColor = getColorValue('qr-empty-color-picker');
    
    const menuBgColor = getColorValue('qr-menu-bgcolor-picker');
    const menuOpacity = document.getElementById('qr-menu-opacity').value;
    settings.menuStyles.menuBgColor = hexToRgba(menuBgColor, menuOpacity);
    
    settings.menuStyles.menuBorderColor = getColorValue('qr-menu-border-picker');
    
    // 删除followTheme属性（如果存在）
    if (settings.menuStyles.hasOwnProperty('followTheme')) {
        delete settings.menuStyles.followTheme;
    }
    
    // 应用样式到菜单
    updateMenuStylesUI();
    
    // 关闭面板
    closeMenuStylePanel();
    
    // 保存设置到localStorage
    try {
        localStorage.setItem('QRA_settings', JSON.stringify(settings));
    } catch(e) {
        console.error('保存到localStorage失败:', e);
    }
}

/**
 * 重置样式到默认值
 */
export function resetMenuStyles() {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    settings.menuStyles = JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));
    
    // 重新加载面板
    loadMenuStylesIntoPanel();
    
    // 应用默认样式
    updateMenuStylesUI();
}

/**
 * 更新菜单的实际样式
 */
export function updateMenuStylesUI() {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    const styles = settings.menuStyles || Constants.DEFAULT_MENU_STYLES;
    
    const menu = document.getElementById(Constants.ID_MENU);
    if (!menu) return;
    
    // 确保菜单有正确的类
    if (!menu.classList.contains('custom-styled-menu')) {
        menu.className = Constants.ID_MENU + ' custom-styled-menu';
    }
    
    // 应用自定义样式
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
    if (!hex) return `rgba(60, 60, 60, ${opacity || 0.7})`;
    
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * 辅助函数 - rgba转hex
 */
function rgbaToHex(rgba) {
    // 添加防御性检查
    if (!rgba || typeof rgba !== 'string') {
        return '#000000'; // 返回默认黑色
    }
    
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
    if (!match) {
        // 如果不是rgba格式，直接返回原值(如果是hex格式)或默认值
        return rgba.startsWith('#') ? rgba : '#000000';
    }
    
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

/**
 * 辅助函数 - 获取rgba的透明度值
 */
function getOpacityFromRgba(rgba) {
    if (!rgba || typeof rgba !== 'string') {
        return 1; // 默认不透明
    }
    
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
    if (!match) return 1;
    return parseFloat(match[4] || 1);
}

/**
 * 配对并同步所有颜色选择器和文本输入框
 */
function setupColorPickerSync() {
    document.querySelectorAll('.qr-color-picker').forEach(picker => {
        const textId = picker.id + '-text';
        const textInput = document.getElementById(textId);
        if (!textInput) return;
        
        // 初始化文本输入框的值
        textInput.value = picker.value.toUpperCase();
        
        // 当颜色选择器改变时更新文本输入框
        picker.addEventListener('input', () => {
            textInput.value = picker.value.toUpperCase();
        });
        
        // 当文本输入框改变时更新颜色选择器
        textInput.addEventListener('input', () => {
            const value = textInput.value;
            // 支持有或没有#前缀的六位十六进制颜色
            if (/^#?([0-9A-F]{6})$/i.test(value)) {
                const color = value.startsWith('#') ? value : '#' + value;
                picker.value = color;
                textInput.value = color.toUpperCase();
            }
        });
    });
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
        colorMatchCheckbox
    } = sharedState.domElements;

    rocketButton?.addEventListener('click', handleRocketButtonClick);
    document.addEventListener('click', handleOutsideClick);

    // Settings listeners
    settingsDropdown?.addEventListener('change', handleSettingsChange);
    
    // 新增图标设置相关监听器
    iconTypeDropdown?.addEventListener('change', (event) => {
        handleSettingsChange(event);
        
        // 处理自定义图标容器显示逻辑
        const customIconContainer = document.querySelector('.custom-icon-container');
        if (customIconContainer) {
            customIconContainer.style.display = 
                event.target.value === Constants.ICON_TYPES.CUSTOM ? 'flex' : 'none';
        }
    });
    
    customIconUrl?.addEventListener('input', handleSettingsChange);
    colorMatchCheckbox?.addEventListener('change', handleSettingsChange);
    
    // 添加使用说明按钮监听器
    const usageButton = document.getElementById(Constants.ID_USAGE_BUTTON);
    if (usageButton) {
        usageButton.addEventListener('click', handleUsageButtonClick);
    }
    
    // 添加使用说明面板关闭按钮监听器
    const usageCloseButton = document.getElementById(`${Constants.ID_USAGE_PANEL}-close`);
    if (usageCloseButton) {
        usageCloseButton.addEventListener('click', closeUsagePanel);
    }
    
    // 添加菜单样式按钮监听器
    const menuStyleButton = document.getElementById(Constants.ID_MENU_STYLE_BUTTON);
    menuStyleButton?.addEventListener('click', handleMenuStyleButtonClick);
    
    // 添加菜单样式面板相关监听器
    const closeButton = document.getElementById(`${Constants.ID_MENU_STYLE_PANEL}-close`);
    closeButton?.addEventListener('click', closeMenuStylePanel);
    
    const applyButton = document.getElementById(`${Constants.ID_MENU_STYLE_PANEL}-apply`);
    applyButton?.addEventListener('click', applyMenuStyles);
    
    const resetButton = document.getElementById(Constants.ID_RESET_STYLE_BUTTON);
    resetButton?.addEventListener('click', resetMenuStyles);
    
    // 添加不透明度滑块变化监听器
    const itemOpacitySlider = document.getElementById('qr-item-opacity');
    itemOpacitySlider?.addEventListener('input', function() {
        document.getElementById('qr-item-opacity-value').textContent = this.value;
    });
    
    const menuOpacitySlider = document.getElementById('qr-menu-opacity');
    menuOpacitySlider?.addEventListener('input', function() {
        document.getElementById('qr-menu-opacity-value').textContent = this.value;
    });

    // 设置颜色选择器与文本输入框同步
    setupColorPickerSync();
    
    // 处理文件上传
    const fileUpload = document.getElementById('icon-file-upload');
    if (fileUpload) {
        fileUpload.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const customIconUrl = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
                if (customIconUrl) {
                    customIconUrl.value = e.target.result; // 将文件转为base64
                    
                    // 创建一个合成的change事件
                    const inputEvent = new Event('input', { bubbles: true });
                    customIconUrl.dispatchEvent(inputEvent);
                }
            };
            reader.readAsDataURL(file);
        });
    }
}
