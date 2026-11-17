// index.js - Main Entry Point
import * as Constants from './constants.js';
import { sharedState } from './state.js';
import { createMenuElement } from './ui.js';
import { createSettingsHtml, createModalOverlayHtml, loadAndApplySettings, setupEventListeners, refreshUpdateUI, populateWhitelistManagementUI, updateTabGliderState, updateIconDisplay, updateBuiltinPreview, updateCharacterPreview, openSortModal, showAnnouncementModalIfNeeded, syncCombinedCheckbox } from './settings.js';
import { applyWhitelistDOMChanges, observeBarMutations } from './whitelist.js';
import { setupEventListeners as setupMenuEvents, handleQuickReplyClick } from './events.js';
import { Logger, LogCategory } from './logger.js';
import { getCurrentLocale, addLocaleData, translate, applyLocale } from '../../../i18n.js';
import { dictionaries } from './dict.js';

// 定义默认设置结构
const DEFAULT_SETTINGS = {
    enabled: true,
    firstTimeSetupPending: true, // 标记是否需要显示首次设置栏
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
    builtinIconSize: 'match', // 内置图标大小：'match' = 与发送按钮保持一致, 或自定义数值 (em 单位)
    enableCustomSort: false, // 是否启用自定义排序模式
    groupOrder: { left: [], right: [] }, // 排序蓝图
    enableAvatarRotation: false, // 控制头像是否在打开弹窗时旋转
    defaultQrButtonsDisabledOnce: false, // 是否已执行过"取消 Default 快速回复套 Buttons 勾选"
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
    rocketButton.title = translate("QR助手", 'qra_rocket_btn_title');
    sendButton.parentNode.insertBefore(rocketButton, sendButton);
    return rocketButton;
}

// menu-cleaner（Fvck-the-useless-DOMs）会给输入栏按钮重写 order。
// 旧版本把小火箭加入“始终排除”来避免被重排，但这会让小火箭无法参与精简器的输入栏排序。
// 现在把小火箭纳入 sendForm 排序表：默认排在发送按钮左侧；用户自定义过位置则保持不变。
const MENU_CLEANER_SEND_FORM_GROUP = 'sendForm';
const MENU_CLEANER_SEND_BUTTON_KEY = '#send_but';
const MENU_CLEANER_ROCKET_LEGACY_LABEL = 'QR助手小火箭';

function sortMenuCleanerOrderKeys(map) {
    return Object.keys(map).sort((a, b) => map[a] - map[b]);
}

function getMenuCleanerKeyBeforeSendButton(map) {
    const keys = sortMenuCleanerOrderKeys(map);
    const index = keys.indexOf(MENU_CLEANER_SEND_BUTTON_KEY);
    return index > 0 ? keys[index - 1] : null;
}

function moveMenuCleanerKeyBeforeSendButton(map, key) {
    const keys = sortMenuCleanerOrderKeys(map).filter((k) => k !== key);
    const index = keys.indexOf(MENU_CLEANER_SEND_BUTTON_KEY);
    keys.splice(index === -1 ? keys.length : index, 0, key);
    keys.forEach((k, i) => { map[k] = i; });
}

// 返回 null 表示精简器的排序表尚未就绪；true/false 表示本次是否有改动。
// 判定“自定义排序”的依据是 nativeOrder：一旦精简器记录的原始顺序里
// 小火箭已紧贴发送按钮左侧，说明当前顺序是用户调整过的，此后一律不再干预。
function ensureRocketOrderInMenuCleaner(menuCleaner) {
    const rocketKey = `#${Constants.ID_ROCKET_BUTTON}`;
    const order = menuCleaner.settings?.order?.[MENU_CLEANER_SEND_FORM_GROUP];
    if (!order || !(MENU_CLEANER_SEND_BUTTON_KEY in order)) return null;

    const nativeOrder = menuCleaner.settings.nativeOrder?.[MENU_CLEANER_SEND_FORM_GROUP];
    const isCustomized = nativeOrder
        && getMenuCleanerKeyBeforeSendButton(nativeOrder) === rocketKey
        && getMenuCleanerKeyBeforeSendButton(order) !== rocketKey;
    if (isCustomized) return false;

    let changed = false;
    if (getMenuCleanerKeyBeforeSendButton(order) !== rocketKey) {
        moveMenuCleanerKeyBeforeSendButton(order, rocketKey);
        changed = true;
    }
    if (nativeOrder
        && MENU_CLEANER_SEND_BUTTON_KEY in nativeOrder
        && getMenuCleanerKeyBeforeSendButton(nativeOrder) !== rocketKey) {
        moveMenuCleanerKeyBeforeSendButton(nativeOrder, rocketKey);
        changed = true;
    }
    return changed;
}

function disableMenuCleanerQrFold(menuCleaner) {
    try {
        const context = window.SillyTavern.getContext();
        const mcSettings = context.extensionSettings.menu_cleaner3;
        const alreadyDisabled = menuCleaner.settings?.enableQrFold === false
            && (!mcSettings || mcSettings.enableQrFold === false);
        if (alreadyDisabled) return;

        if (mcSettings) mcSettings.enableQrFold = false;
        if (menuCleaner.settings) menuCleaner.settings.enableQrFold = false;
        menuCleaner.save?.();
        menuCleaner.applyAll?.();
        context.saveSettingsDebounced?.();
        Logger.info(LogCategory.SYSTEM, '已关闭菜单精简器的 QR 面板折叠（输入栏由 QR助手管理）');
    } catch (err) {
        Logger.debug(LogCategory.SYSTEM, '关闭菜单精简器 QR 面板折叠失败', err);
    }
}

function syncRocketWithMenuCleaner(retries = 120) {
    const menuCleaner = window.__mc3;
    if (!menuCleaner?.settings || typeof menuCleaner.applyAll !== 'function') {
        if (retries > 0) {
            setTimeout(() => syncRocketWithMenuCleaner(retries - 1), 1000);
        }
        return;
    }

    const changed = ensureRocketOrderInMenuCleaner(menuCleaner);
    if (changed === null) {
        if (retries > 0) {
            setTimeout(() => syncRocketWithMenuCleaner(retries - 1), 1000);
        }
        return;
    }

    // 迁移：移除旧版本自动写入的“始终排除”规则，让小火箭重新参与排序
    let legacyExclusionRemoved = false;
    try {
        const legacyExclusion = (menuCleaner.settings.excludedSelectors || []).find(
            (item) => item?.selector === `#${Constants.ID_ROCKET_BUTTON}`
                && item.label === MENU_CLEANER_ROCKET_LEGACY_LABEL
        );
        if (legacyExclusion && typeof menuCleaner.deleteExcludedSelector === 'function') {
            menuCleaner.deleteExcludedSelector(legacyExclusion.id);
            legacyExclusionRemoved = true;
            Logger.info(LogCategory.SYSTEM, '已从菜单精简器的始终排除列表移除小火箭，允许其参与输入栏排序');
        }
    } catch (err) {
        Logger.debug(LogCategory.SYSTEM, '移除菜单精简器的始终排除规则失败', err);
    }

    if (changed) {
        menuCleaner.save?.();
        Logger.info(LogCategory.SYSTEM, '已将小火箭默认排在发送按钮左侧（可在菜单精简器中自定义排序）');
    }

    // 小火箭是运行时新插入的元素，必须让精简器立即扫描一次，
    // 否则它会以未设置 order 的状态（默认 0）短暂停在输入栏最左侧，
    // 随后在下一次自动重扫时才跳回正确位置，形成“图标互换”的闪烁。
    menuCleaner.applyAll?.();

    disableMenuCleanerQrFold(menuCleaner);
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

    // 旧版本的一次性标记，现已改为每次强制关闭 QR 面板折叠
    if ('menuCleanerQrFoldDisabledOnce' in currentSettings) {
        delete currentSettings.menuCleanerQrFoldDisabledOnce;
        if (typeof context.saveSettingsDebounced === 'function') {
            context.saveSettingsDebounced();
        }
    }
}

// 首次安装或升级后执行一次：取消 Default 快速回复套的 "Buttons" 勾选
function disableDefaultQuickReplyButtonsOnce() {
    try {
        const context = window.SillyTavern.getContext();
        const settings = context.extensionSettings[Constants.EXTENSION_NAME];
        if (!settings || settings.defaultQrButtonsDisabledOnce) return;

        const qrApi = window.quickReplyApi;
        if (!qrApi?.settings?.config) {
            Logger.debug(LogCategory.SYSTEM, '快速回复 API 尚未就绪，跳过 Default 按钮禁用，下次启动重试');
            return;
        }

        const defaultLink = qrApi.settings.config.setList?.find(link => link.set?.name === 'Default');
        if (defaultLink?.isVisible) {
            defaultLink.isVisible = false;
            qrApi.settings.save();
            if (typeof qrApi.settingsUi?.rerender === 'function') {
                qrApi.settingsUi.rerender();
            }
            Logger.info(LogCategory.SYSTEM, '已取消 Default 快速回复套的 Buttons 勾选');
        }

        settings.defaultQrButtonsDisabledOnce = true;
        context.saveSettingsDebounced();
    } catch (err) {
        Logger.error(LogCategory.SYSTEM, '禁用 Default 快速回复按钮失败', err);
    }
}

function initializePlugin() {
    try {
        Logger.info(LogCategory.SYSTEM, '插件正在初始化...');

        // --- 注入 i18n 字典 ---
        const currentLang = getCurrentLocale();
        const dictToLoad = dictionaries[currentLang];
        if (dictToLoad) {
            addLocaleData(currentLang, dictToLoad);
            applyLocale(); // addLocaleData 在 applyLocale 之后调用，需要手动重新扫描 DOM
        }
        // ----------------------

        // --- 在这里调用设置初始化 ---
        // 此时 APP_READY 已触发，window.extension_settings 肯定已经包含了从硬盘读取的数据
        ensureSettingsInitialized();

        // 首次安装/升级后执行一次：取消 Default 快速回复套的 "Buttons" 勾选
        disableDefaultQuickReplyButtonsOnce();

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
            populateWhitelistManagementUI, // 暴露给 whitelist.js 调用
            openSortModal, // 暴露给 ui.js 调用
            syncCombinedCheckbox, // 暴露给全局调用
            syncRocketWithMenuCleaner: () => syncRocketWithMenuCleaner(0)
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

        // 兼容 menu-cleaner：把小火箭纳入输入栏排序，默认排在发送按钮左侧
        syncRocketWithMenuCleaner();

        // 启动时后台检测更新与公告检查 (不阻塞 UI)
        setTimeout(() => {
            if (typeof refreshUpdateUI === 'function') {
                refreshUpdateUI(false).catch(e => Logger.warn(LogCategory.UPDATE, '自动更新检测失败', e));
            }
            if (typeof showAnnouncementModalIfNeeded === 'function') {
                showAnnouncementModalIfNeeded();
            }
        }, 500); 

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
                // 动态同步"合并按钮"的最新状态
                if (typeof window.quickReplyMenu?.syncCombinedCheckbox === 'function') {
                    window.quickReplyMenu.syncCombinedCheckbox();
                }
                // 面板可见后重新计算滑块位置
                if (typeof updateTabGliderState === 'function') {
                    updateTabGliderState();
                }
                // 刷新内置图标预览，修复页面刷新后预览显示为默认星月的问题
                const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
                if (settings && settings.iconType && typeof updateBuiltinPreview === 'function') {
                    updateBuiltinPreview(settings.iconType);
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
        // 切换聊天时刷新角色卡图标
        updateIconDisplay();
        // 切换聊天时刷新角色卡预览
        updateCharacterPreview();
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
