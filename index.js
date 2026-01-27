// index.js - Main Entry Point
import * as Constants from './constants.js';
import { sharedState } from './state.js';
import { createMenuElement } from './ui.js';
import { createSettingsHtml, createModalOverlayHtml, loadAndApplySettings, setupEventListeners, refreshUpdateUI, populateWhitelistManagementUI, updateTabGliderState } from './settings.js';
import { applyWhitelistDOMChanges, observeBarMutations } from './whitelist.js';
import { setupEventListeners as setupMenuEvents, handleQuickReplyClick } from './events.js';
import { Logger, LogCategory } from './logger.js';

// 定义默认设置结构
const DEFAULT_SETTINGS = {
    enabled: true,
    firstTimeSetupPending: true, // 新增：标记是否需要显示首次设置栏
    iconType: Constants.ICON_TYPES.STAR,
    customIconUrl: '',
    faIconCode: '',
    savedCustomIcons: [],
    whitelist: [],
    autoShrinkEnabled: false,
    uiTheme: Constants.UI_THEMES.LIGHT,
    enableBackdrop: false,
    migrated_from_v1: false, // 迁移状态标记
    hideWhitelistHelp: false, // 是否隐藏白名单页面的帮助说明
    logLevel: 1, // 新增：默认日志级别 (1=INFO)
};

// --- 移除顶层的设置初始化逻辑 ---
// 原来的代码在这里执行了 extension_settings 的初始化，导致了竞态条件。
// 我们将它移到 initializePlugin 函数中。

function injectRocketButton() {
    const sendButton = document.getElementById('send_but');
    if (!sendButton) return null;

    let rocketButton = document.getElementById(Constants.ID_ROCKET_BUTTON);
    if (rocketButton) return rocketButton;

    rocketButton = document.createElement('div');
    rocketButton.id = Constants.ID_ROCKET_BUTTON;
    rocketButton.title = "快速回复菜单";
    sendButton.parentNode.insertBefore(rocketButton, sendButton);
    return rocketButton;
}

// 专门用于初始化/合并设置的函数
function ensureSettingsInitialized() {
    const context = window.SillyTavern.getContext();
    const OLD_DATA_KEY = "quick-reply-menu"; // 旧版本的数据键名

    // 1. 确保新版命名空间在内存中存在
    if (!context.extensionSettings[Constants.EXTENSION_NAME]) {
        context.extensionSettings[Constants.EXTENSION_NAME] = {};
    }

    const currentSettings = context.extensionSettings[Constants.EXTENSION_NAME];
    const oldSettings = context.extensionSettings[OLD_DATA_KEY];

    // 2. 核心迁移逻辑：仅在未迁移过且检测到旧数据时执行
    if (!currentSettings.migrated_from_v1) {
        Logger.info(LogCategory.SYSTEM, '正在初始化新环境并检测旧版本数据...');

        if (oldSettings) {
            Logger.info(LogCategory.SYSTEM, '检测到旧版数据，开始跨键名静默克隆...');

            // A. 状态迁移：enabled 与 autoShrinkEnabled
            currentSettings.enabled = oldSettings.enabled !== false;
            currentSettings.autoShrinkEnabled = oldSettings.autoShrinkEnabled === true;

            // B. 白名单迁移：直接克隆数组 (ID 格式已在 api.js 中对齐)
            if (Array.isArray(oldSettings.whitelist)) {
                currentSettings.whitelist = [...oldSettings.whitelist];
            }

            // 如果是从旧版 V1 迁移过来的用户，视为老用户，默认跳过首次设置向导
            // 如果您希望老用户更新后也看一次，请注释掉下面这行
            // currentSettings.firstTimeSetupPending = false;

            // C. 图标库清洗：去除废弃的 id 和 size 字段
            if (Array.isArray(oldSettings.savedCustomIcons)) {
                currentSettings.savedCustomIcons = oldSettings.savedCustomIcons
                    .map(icon => ({
                        name: icon.name || "未命名图标",
                        url: icon.url || ""
                    }))
                    .filter(icon => icon.url); // 过滤掉无效数据
            }

            // D. 激活图标迁移
            currentSettings.customIconUrl = oldSettings.customIconUrl || '';

            // 如果旧版是 fontawesome 类型，由于新版不支持，强制回退至默认星月
            if (oldSettings.iconType === 'fontawesome') {
                currentSettings.iconType = Constants.ICON_TYPES.STAR;
            } else {
                currentSettings.iconType = oldSettings.iconType || Constants.ICON_TYPES.STAR;
            }
        }

        // 无论是否检测到旧数据，都标记为已迁移，防止后续重复逻辑
        currentSettings.migrated_from_v1 = true;

        // 3. 强制持久化：将内存中克隆的数据立即写入硬盘 settings.json
        if (typeof context.saveSettingsDebounced === 'function') {
            context.saveSettingsDebounced();
            Logger.info(LogCategory.SYSTEM, '迁移数据已成功锁定并写入磁盘');
        }
    }

    // 4. 补全默认设置键值
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
        if (currentSettings[key] === undefined) {
            currentSettings[key] = DEFAULT_SETTINGS[key];
        }
    });
}

function initializePlugin() {
    try {
        Logger.info(LogCategory.SYSTEM, '插件正在初始化...');

        // --- 在这里调用设置初始化 ---
        // 此时 APP_READY 已触发，window.extension_settings 肯定已经包含了从硬盘读取的数据
        ensureSettingsInitialized();

        const rocketButton = injectRocketButton();
        if (!rocketButton) return;

        const menu = createMenuElement();

        sharedState.domElements.rocketButton = rocketButton;
        sharedState.domElements.menu = menu;

        // 创建并注入遮罩层
        let backdrop = document.getElementById(Constants.ID_BACKDROP);
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = Constants.ID_BACKDROP;
            document.body.appendChild(backdrop);
        }
        sharedState.domElements.backdrop = backdrop;

        // 点击遮罩关闭菜单
        backdrop.addEventListener('click', () => {
            sharedState.menuVisible = false;
            import('./ui.js').then(({ updateMenuVisibilityUI }) => updateMenuVisibilityUI());
        });

        window.quickReplyMenu = {
            handleQuickReplyClick,
            applyWhitelistDOMChanges,
            observeBarMutations,
            populateWhitelistManagementUI // 暴露给 whitelist.js 调用
        };

        // 注入菜单到 body
        document.body.appendChild(menu);

        // (原白名单弹窗注入逻辑已移除，改为内嵌在设置面板中)

        // 注入图标管理弹窗遮罩 (确保层级在所有元素之上)
        document.body.insertAdjacentHTML('beforeend', createModalOverlayHtml());

        // 加载设置并应用 (现在读取到的一定是正确的数据)
        loadAndApplySettings();
        setupEventListeners();
        setupMenuEvents();

        applyWhitelistDOMChanges();
        observeBarMutations();

        // 启动时后台检测更新 (不阻塞 UI)
        setTimeout(() => {
            if (typeof refreshUpdateUI === 'function') {
                refreshUpdateUI(false).catch(e => Logger.warn(LogCategory.UPDATE, '自动更新检测失败', e));
            }
        }, 3000); // 延迟 3 秒执行，避免影响启动速度

        Logger.info(LogCategory.SYSTEM, '插件初始化完成');
    } catch (err) {
        Logger.error(LogCategory.SYSTEM, '插件初始化失败', err);
    }
}

let pluginInitialized = false;

function performInitialization() {
    if (pluginInitialized) return;
    initializePlugin();
    pluginInitialized = true;

    // 初始 DOM 快照
    setTimeout(() => {
        Logger.info(LogCategory.CORE, '插件初始化完成 - 初始 DOM 快照:', {
            domStructure: Logger.getDomStructure('send_form')
        });
    }, 1000);

    // 添加设置抽屉的点击监听器，打开面板时自动刷新白名单列表
    const settingsDrawer = document.querySelector(`#${Constants.ID_SETTINGS_CONTAINER} .inline-drawer-toggle`);
    if (settingsDrawer) {
        settingsDrawer.addEventListener('click', () => {
            // 延迟执行以确保动画开始或状态更新 (面板展开需要时间)
            setTimeout(() => {
                if (typeof populateWhitelistManagementUI === 'function') {
                    populateWhitelistManagementUI();
                }
                // 面板可见后重新计算滑块位置
                if (typeof updateTabGliderState === 'function') {
                    updateTabGliderState();
                }
            }, 50);
        });
    }
}

function handleChatLoaded() {
    setTimeout(() => {
        if (window.quickReplyMenu?.applyWhitelistDOMChanges) {
            window.quickReplyMenu.applyWhitelistDOMChanges();
        }
    }, 500);
}

(function () {
    // 注入设置面板 (Settings Drawer) - 修改注入目标为 #qr_container
    const injectSettings = () => {
        const targetContainer = document.getElementById('qr_container');
        if (targetContainer) {
            const settingsHtml = createSettingsHtml();
            targetContainer.insertAdjacentHTML('beforeend', settingsHtml);
        } else {
            // 回退逻辑：如果找不到 qr_container，记录警告并尝试使用旧逻辑（可选，或直接报错）
            Logger.warn(LogCategory.SYSTEM, '目标容器 #qr_container 未找到');

            // 为了兼容性，如果没有找到目标容器，依然尝试注入到 extensions_settings 防止设置彻底丢失
            let fallbackContainer = document.getElementById('extensions_settings');
            if (!fallbackContainer) {
                fallbackContainer = document.createElement('div');
                fallbackContainer.id = 'extensions_settings';
                fallbackContainer.style.display = 'none';
                document.body.appendChild(fallbackContainer);
            }
            const settingsHtml = createSettingsHtml();
            fallbackContainer.insertAdjacentHTML('beforeend', settingsHtml);
        }
    };
    injectSettings();

    // 等待 SillyTavern 就绪
    const waitForSillyTavernContext = () => {
        if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
            const context = window.SillyTavern.getContext();
            if (context && context.eventSource && context.eventTypes?.APP_READY) {
                // APP_READY 意味着 ST 的所有设置（包括 settings.json）都已加载完毕
                context.eventSource.once(context.eventTypes.APP_READY, performInitialization);
                if (context.eventTypes.CHAT_CHANGED) {
                    context.eventSource.on(context.eventTypes.CHAT_CHANGED, handleChatLoaded);
                }
            } else {
                setTimeout(waitForSillyTavernContext, 150);
            }
        } else {
            setTimeout(waitForSillyTavernContext, 150);
        }
    };
    waitForSillyTavernContext();
})();
