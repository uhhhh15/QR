// index.js - Main Entry Point
import * as Constants from './constants.js';
import { sharedState } from './state.js';
import { createMenuElement } from './ui.js';
// 从 settings.js 导入核心功能
import { createSettingsHtml, loadAndApplySettings as loadAndApplySettingsToPanel, updateIconDisplay, saveSettings, populateWhitelistManagementUI } from './settings.js';
import { applyWhitelistDOMChanges, observeBarMutations } from './whitelist.js';
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
        globalIconSize: null,
        menuStyles: JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES)),
        savedCustomIcons: [],
        whitelist: [],
		autoShrinkEnabled: false, // 新增：默认关闭自动伸缩功能
    };
}

// 导出设置对象以便其他模块使用
export const extension_settings = window.extension_settings;

/**
 * 【最终修正版】主动修复函数
 * 在函数内部实时获取 SillyTavern 上下文，不再依赖外部缓存的变量。
 */
function forceUIRerender() {
    console.log('[QRQ] Forcing UI re-render by emitting CHAT_CHANGED.');

    // 在需要时，直接从全局 window 对象获取最新的 SillyTavern 引用
    const st = window.SillyTavern;

    if (st && st.eventSource && st.eventSource.event_types && st.eventSource.event_types.CHAT_CHANGED) {
        try {
            st.eventSource.emit(st.eventSource.event_types.CHAT_CHANGED);
            console.log('[QRQ] Successfully emitted CHAT_CHANGED event.');
        } catch (error) {
            console.error('[QRQ] Error while emitting CHAT_CHANGED event:', error);
        }
    } else {
        // 提供更详细的诊断信息
        console.error('[QRQ] Could not emit CHAT_CHANGED. Reason:', {
            isSillyTavernObjectPresent: !!st,
            isEventSourcePresent: !!st?.eventSource,
            isEventTypesPresent: !!st?.eventSource?.event_types,
            isChatChangedEventPresent: !!st?.eventSource?.event_types?.CHAT_CHANGED,
        });
    }
}


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

        // 将修复函数添加到全局接口
        window.quickReplyMenu = {
            handleQuickReplyClick,
            saveSettings: saveSettings,
            updateIconPreview: updateIconPreview,
            applyWhitelistDOMChanges,
            observeBarMutations,
            forceUIRerender, // <--- 暴露修复函数
        };

        document.body.appendChild(menu);
        loadAndApplyInitialSettings();
        setupEventListeners();
        // 初始化时就应用一次
        applyWhitelistDOMChanges();
        // 启动观察者
        observeBarMutations();

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
    settings.globalIconSize = typeof settings.globalIconSize !== 'undefined' ? settings.globalIconSize : null;
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
let finalCheckPerformed = false;

function performInitialization() {
    if (pluginInitialized) {
        console.log(`[${Constants.EXTENSION_NAME}] Plugin already initialized. Skipping.`);
        return;
    }
    console.log(`[${Constants.EXTENSION_NAME}] Performing initialization tasks...`);
    initializePlugin();
    loadAndApplySettingsToPanel();
    populateWhitelistManagementUI();
    pluginInitialized = true;
    
    // 添加设置抽屉的点击监听器
    const settingsDrawer = document.querySelector(`#${Constants.ID_SETTINGS_CONTAINER} .inline-drawer-toggle`);
    if (settingsDrawer) {
        settingsDrawer.addEventListener('click', () => {
            console.log(`[${Constants.EXTENSION_NAME}] Settings drawer opened, repopulating whitelist UI.`);
            setTimeout(populateWhitelistManagementUI, 100);
        });
    }
}


/**
 * 处理常规的聊天加载事件
 */
function handleChatLoaded() {
    console.log(`[${Constants.EXTENSION_NAME}] 'CHAT_CHANGED' event detected. Triggering a general whitelist update.`);
    // 切换聊天后，DOM会完全重绘，需要给一点时间
    setTimeout(() => {
        if (window.quickReplyMenu?.applyWhitelistDOMChanges) {
            window.quickReplyMenu.applyWhitelistDOMChanges();
        }
    }, 500);
}


onReady(() => {
    console.log(`[${Constants.EXTENSION_NAME}] onReady callback executed.`);
    try {
        loadSettingsFromLocalStorage();

        let settingsContainer = document.getElementById('extensions_settings');
        if (!settingsContainer) {
            console.warn(`[${Constants.EXTENSION_NAME}] #extensions_settings not found. Creating dummy container.`);
            settingsContainer = document.createElement('div');
            settingsContainer.id = 'extensions_settings';
            settingsContainer.style.display = 'none';
            document.body.appendChild(settingsContainer);
        }

        const settingsHtml = createSettingsHtml();
        settingsContainer.insertAdjacentHTML('beforeend', settingsHtml);

        const st = (typeof SillyTavern !== 'undefined') ? SillyTavern : null;
        const stEventTypes = st?.eventSource?.event_types;

        if (st && st.eventSource && stEventTypes && stEventTypes.EXTENSION_SETTINGS_LOADED) {
            if (window.extension_settings[JSR_SETTINGS_KEY]) {
                performInitialization();
            } else {
                st.eventSource.once(stEventTypes.EXTENSION_SETTINGS_LOADED, performInitialization);
            }

            if (stEventTypes.CHAT_CHANGED) {
                 st.eventSource.on(stEventTypes.CHAT_CHANGED, handleChatLoaded);
                 console.log(`[${Constants.EXTENSION_NAME}] Successfully attached to 'CHAT_CHANGED' event.`);
            }

        } else {
            console.warn(`[${Constants.EXTENSION_NAME}] SillyTavern event system not available. Initializing with a delay.`);
            setTimeout(performInitialization, 2000);
        }

    } catch (err) {
        console.error(`[${Constants.EXTENSION_NAME}] Startup failed:`, err);
    }

    // 最终的 window.onload 检查 (保险措施)
    window.addEventListener('load', () => {
        if (pluginInitialized && !finalCheckPerformed) {
            console.log(`[${Constants.EXTENSION_NAME}] Window 'load' event fired. Performing final whitelist check.`);
            setTimeout(() => {
                if (window.quickReplyMenu?.applyWhitelistDOMChanges) {
                    window.quickReplyMenu.applyWhitelistDOMChanges();
                    finalCheckPerformed = true;
                }
            }, 1500);
        }
    });
});
