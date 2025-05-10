// index.js - Main Entry Point
import * as Constants from './constants.js';
import { sharedState } from './state.js';
import { createMenuElement } from './ui.js';
// 从 settings.js 导入核心功能
import { createSettingsHtml, loadAndApplySettings as loadAndApplySettingsToPanel, updateIconDisplay } from './settings.js';
import { setupEventListeners, handleQuickReplyClick, updateMenuStylesUI } from './events.js';

// JS-Slash-Runner 在 extension_settings 中使用的键名
const JSR_SETTINGS_KEY = "TavernHelper";

// 创建本地设置对象，如果全局对象不存在
if (typeof window.extension_settings === 'undefined') {
    window.extension_settings = {};
}
// 初始化当前扩展的设置，包含新增字段的默认值
if (!window.extension_settings[Constants.EXTENSION_NAME]) {
    window.extension_settings[Constants.EXTENSION_NAME] = {
        enabled: true,
        iconType: Constants.ICON_TYPES.ROCKET,
        customIconUrl: '',
        customIconSize: Constants.DEFAULT_CUSTOM_ICON_SIZE,
        faIconCode: '',
        matchButtonColors: true,
        menuStyles: JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES)),
        savedCustomIcons: []
    };
}

// 导出设置对象以便其他模块使用
export const extension_settings = window.extension_settings;

/**
 * Injects the rocket button next to the send button
 */
function injectRocketButton() {
    const sendButton = document.getElementById('send_but');
    if (!sendButton) {
        console.error(`[${Constants.EXTENSION_NAME}] Could not find send button (#send_but)`);
        return null;
    }

    let rocketButton = document.getElementById(Constants.ID_ROCKET_BUTTON);
    if (rocketButton) {
        console.log(`[${Constants.EXTENSION_NAME}] Rocket button already exists.`);
        return rocketButton;
    }

    rocketButton = document.createElement('div');
    rocketButton.id = Constants.ID_ROCKET_BUTTON;
    rocketButton.title = "快速回复菜单";
    rocketButton.setAttribute('aria-haspopup', 'true');
    rocketButton.setAttribute('aria-expanded', 'false');
    rocketButton.setAttribute('aria-controls', Constants.ID_MENU);

    sendButton.parentNode.insertBefore(rocketButton, sendButton);
    console.log(`[${Constants.EXTENSION_NAME}] Rocket button injected.`);
    return rocketButton;
}

/**
 * 图标预览功能已禁用以改善性能
 * 这是一个空操作，不进行任何DOM操作
 */
function updateIconPreview(iconType) {
    // 不执行任何DOM操作
    return;
}

/**
 * Initializes the plugin: creates UI, sets up listeners, loads settings.
 */
function initializePlugin() {
    try {
        console.log(`[${Constants.EXTENSION_NAME}] Initializing...`);

        const rocketButton = injectRocketButton();
        if (!rocketButton) {
             console.error(`[${Constants.EXTENSION_NAME}] Initialization failed: Rocket button could not be injected.`);
             return;
        }

        const menu = createMenuElement();

        sharedState.domElements.rocketButton = rocketButton;
        sharedState.domElements.menu = menu;
        sharedState.domElements.chatItemsContainer = menu.querySelector(`#${Constants.ID_CHAT_ITEMS}`);
        sharedState.domElements.globalItemsContainer = menu.querySelector(`#${Constants.ID_GLOBAL_ITEMS}`);
        sharedState.domElements.customIconUrl = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
        sharedState.domElements.customIconSizeInput = document.getElementById(Constants.ID_CUSTOM_ICON_SIZE_INPUT);
        sharedState.domElements.faIconCodeInput = document.getElementById(Constants.ID_FA_ICON_CODE_INPUT);
        sharedState.domElements.colorMatchCheckbox = document.getElementById(Constants.ID_COLOR_MATCH_CHECKBOX);

        window.quickReplyMenu = {
            handleQuickReplyClick,
            saveSettings: function() {
                console.log(`[${Constants.EXTENSION_NAME}] Attempting to save settings via window.quickReplyMenu.saveSettings...`);
                const settings = extension_settings[Constants.EXTENSION_NAME];
                const enabledDropdown = document.getElementById(Constants.ID_SETTINGS_ENABLED_DROPDOWN);
                const iconTypeDropdown = document.getElementById(Constants.ID_ICON_TYPE_DROPDOWN);
                const customIconUrlInput = document.getElementById(Constants.ID_CUSTOM_ICON_URL); // Renamed for clarity
                const customIconSizeInput = document.getElementById(Constants.ID_CUSTOM_ICON_SIZE_INPUT);
                const faIconCodeInput = document.getElementById(Constants.ID_FA_ICON_CODE_INPUT);
                const colorMatchCheckbox = document.getElementById(Constants.ID_COLOR_MATCH_CHECKBOX);

                if (enabledDropdown) settings.enabled = enabledDropdown.value === 'true';
                if (iconTypeDropdown) settings.iconType = iconTypeDropdown.value;

                // Handle potentially large custom icon URL data from dataset
                if (customIconUrlInput) {
                    settings.customIconUrl = customIconUrlInput.dataset.fullValue || customIconUrlInput.value;
                }

                if (customIconSizeInput) settings.customIconSize = parseInt(customIconSizeInput.value, 10) || Constants.DEFAULT_CUSTOM_ICON_SIZE;
                if (faIconCodeInput) settings.faIconCode = faIconCodeInput.value;
                if (colorMatchCheckbox) settings.matchButtonColors = colorMatchCheckbox.checked;

                updateIconDisplay(); // Reflects latest settings on the button icon

                if (document.getElementById(Constants.ID_SETTINGS_CONTAINER)?.offsetParent !== null) {
                     updateIconPreview(settings.iconType);
                }

                if (typeof updateMenuStylesUI === 'function' && settings.menuStyles) {
                    updateMenuStylesUI();
                }

                let savedToLocalStorage = false;
                try {
                    localStorage.setItem('QRA_settings', JSON.stringify(settings));
                    savedToLocalStorage = true;
                } catch(e) {
                    console.error(`[${Constants.EXTENSION_NAME}] 保存到localStorage失败:`, e);
                }

                let savedToContext = false;
                // SillyTavern context API for saving settings
                const stContext = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null;
                if (stContext && typeof stContext.saveExtensionSettings === 'function') {
                    try {
                        stContext.saveExtensionSettings(); // This saves ALL extension settings
                        console.log(`[${Constants.EXTENSION_NAME}] 设置已通过 SillyTavern context.saveExtensionSettings() 保存`);
                        savedToContext = true;
                    } catch(e) {
                        console.error(`[${Constants.EXTENSION_NAME}] 通过 SillyTavern context.saveExtensionSettings() 保存设置失败:`, e);
                    }
                } else {
                    console.warn(`[${Constants.EXTENSION_NAME}] SillyTavern context.saveExtensionSettings 不可用`);
                }


                const success = savedToContext || savedToLocalStorage;

                const saveStatus = document.getElementById('qr-save-status');
                 if (saveStatus) {
                     saveStatus.textContent = success ? '✓ 设置已保存' : '✗ 保存失败';
                     saveStatus.style.color = success ? '#4caf50' : '#f44336';
                     setTimeout(() => { saveStatus.textContent = ''; }, 2000);
                 }

                 const saveButton = document.getElementById('qr-save-settings');
                 if (saveButton && success) {
                     const originalText = saveButton.innerHTML; // Save current HTML
                     const originalBg = saveButton.style.backgroundColor;
                     saveButton.innerHTML = '<i class="fa-solid fa-check"></i> 已保存';
                     saveButton.style.backgroundColor = '#4caf50';
                     setTimeout(() => {
                         saveButton.innerHTML = originalText;
                         saveButton.style.backgroundColor = originalBg;
                     }, 2000);
                 }
                return success;
            },
            updateIconPreview: updateIconPreview
        };

        document.body.appendChild(menu);
        loadAndApplyInitialSettings();
        setupEventListeners();

        console.log(`[${Constants.EXTENSION_NAME}] Initialization complete.`);
    } catch (err) {
        console.error(`[${Constants.EXTENSION_NAME}] 初始化失败:`, err);
    }
}

/**
 * 加载初始设置并应用到插件状态和按钮显示
 */
function loadAndApplyInitialSettings() {
    const settings = window.extension_settings[Constants.EXTENSION_NAME];

    settings.enabled = settings.enabled !== false;
    settings.iconType = settings.iconType || Constants.ICON_TYPES.ROCKET;
    settings.customIconUrl = settings.customIconUrl || '';
    settings.customIconSize = settings.customIconSize || Constants.DEFAULT_CUSTOM_ICON_SIZE;
    settings.faIconCode = settings.faIconCode || '';
    settings.matchButtonColors = settings.matchButtonColors !== false;
    settings.menuStyles = settings.menuStyles || JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));

    document.body.classList.remove('qra-enabled', 'qra-disabled');
    document.body.classList.add(settings.enabled ? 'qra-enabled' : 'qra-disabled');

    if (sharedState.domElements.rocketButton) {
        sharedState.domElements.rocketButton.style.display = settings.enabled ? 'flex' : 'none';
    }

    updateIconDisplay(); // From settings.js

    if (typeof updateMenuStylesUI === 'function') {
        updateMenuStylesUI();
    }
    console.log(`[${Constants.EXTENSION_NAME}] Initial settings applied.`);
}

function onReady(callback) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(callback, 1);
    } else {
        document.addEventListener("DOMContentLoaded", callback);
    }
}

function loadSettingsFromLocalStorage() {
    try {
        const savedSettings = localStorage.getItem('QRA_settings');
        if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            const currentSettings = extension_settings[Constants.EXTENSION_NAME];
            Object.assign(currentSettings, parsedSettings);
            console.log(`[${Constants.EXTENSION_NAME}] 从localStorage加载了设置:`, currentSettings);
            return true;
        }
    } catch(e) {
        console.error(`[${Constants.EXTENSION_NAME}] 从localStorage加载设置失败:`, e);
    }
    return false;
}

let pluginInitialized = false; // Flag to prevent multiple initializations

function performInitialization() {
    if (pluginInitialized) {
        console.log(`[${Constants.EXTENSION_NAME}] Plugin already initialized. Skipping.`);
        return;
    }
    console.log(`[${Constants.EXTENSION_NAME}] Performing initialization tasks...`);
    initializePlugin();
    loadAndApplySettingsToPanel();
    pluginInitialized = true;
}


onReady(() => {
    try {
        loadSettingsFromLocalStorage();

        let settingsContainer = document.getElementById('extensions_settings');
        if (!settingsContainer) {
            console.warn(`[${Constants.EXTENSION_NAME}] #extensions_settings not found, creating dummy container.`);
            settingsContainer = document.createElement('div');
            settingsContainer.id = 'extensions_settings';
            settingsContainer.style.display = 'none';
            document.body.appendChild(settingsContainer);
        }

        const settingsHtml = createSettingsHtml();
        settingsContainer.insertAdjacentHTML('beforeend', settingsHtml);

        // Access SillyTavern context and event types
        const st = (typeof SillyTavern !== 'undefined') ? SillyTavern : null;
        const stEventTypes = st?.event_types; // Use optional chaining

        if (st && st.eventSource && stEventTypes && stEventTypes.EXTENSION_SETTINGS_LOADED) {
            // Check if EXTENSION_SETTINGS_LOADED has already fired
            // A simple check: if TavernHelper settings are already in window.extension_settings
            if (window.extension_settings && window.extension_settings[JSR_SETTINGS_KEY]) {
                console.log(`[${Constants.EXTENSION_NAME}] Extension settings (including ${JSR_SETTINGS_KEY}) seem to be already loaded. Initializing plugin directly.`);
                performInitialization();
            } else {
                console.log(`[${Constants.EXTENSION_NAME}] Waiting for SillyTavern's EXTENSION_SETTINGS_LOADED event...`);
                st.eventSource.once(stEventTypes.EXTENSION_SETTINGS_LOADED, () => {
                    console.log(`[${Constants.EXTENSION_NAME}] Received EXTENSION_SETTINGS_LOADED event.`);
                    performInitialization();
                });
            }
        } else {
            console.warn(`[${Constants.EXTENSION_NAME}] SillyTavern event system (EXTENSION_SETTINGS_LOADED) not available or QR助手 loaded too early. Initializing with a delay as a fallback.`);
            // Fallback: Initialize after a short delay, hoping other extensions have loaded.
            // This is less reliable than using the event.
            setTimeout(() => {
                console.log(`[${Constants.EXTENSION_NAME}] Initializing after fallback delay.`);
                performInitialization();
            }, 2000); // Adjust delay as needed, e.g., 2000ms
        }

    } catch (err) {
        console.error(`[${Constants.EXTENSION_NAME}] 启动失败:`, err);
    }
});
