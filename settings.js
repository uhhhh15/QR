// settings.js
import * as Constants from './constants.js';
import { sharedState } from './state.js';
import { fetchQuickReplies } from './api.js';
import { applyWhitelistDOMChanges } from './whitelist.js';
import { attachScrollListener, showTooltip, hideTooltip } from './ui.js';
import { checkForUpdates, getChangelog, performUpdate } from './update.js';

// --- 自动伸缩 CSS 注入逻辑 ---
function injectAutoShrinkStyle() {
    if (document.getElementById(Constants.ID_AUTO_SHRINK_STYLE_TAG)) return;
    const style = document.createElement('style');
    style.id = Constants.ID_AUTO_SHRINK_STYLE_TAG;
    style.innerHTML = `
        #qr--bar {
            height: 0px;
            overflow: hidden;
            transition: height 0.3s ease-in-out;
        }
        #send_form:hover #qr--bar {
            height: var(--buttons-bar-height); 
        }
    `;
    document.head.appendChild(style);
}

function removeAutoShrinkStyle() {
    const style = document.getElementById(Constants.ID_AUTO_SHRINK_STYLE_TAG);
    if (style) style.remove();
}

// 导出滑块定位函数，供 index.js 在面板打开时调用
export function updateTabGliderState() {
    const tabBar = document.getElementById(Constants.ID_SETTINGS_TAB_BAR);
    const activeTab = tabBar?.querySelector('.qr-settings-tab-item.active');
    const glider = tabBar?.querySelector('.qr-tab-glider');

    // 仅当 Tab 存在且可见（宽度大于0）时计算，防止初始化隐藏时计算为 0
    if (activeTab && glider && activeTab.offsetWidth > 0) {
        glider.style.width = `${activeTab.offsetWidth}px`;
        glider.style.transform = `translateX(${activeTab.offsetLeft}px)`;
        glider.style.opacity = '1';
    }
}

// settings.js -> updateIconDisplay
export function updateIconDisplay() {
    const button = sharedState.domElements.rocketButton;
    if (!button) return;

    const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
    const iconType = settings.iconType || Constants.ICON_TYPES.ROCKET;
    const customIconUrl = settings.customIconUrl || '';
    const faIconCode = settings.faIconCode || '';

    // 1. 清理旧样式
    button.innerHTML = '';
    button.removeAttribute('style');
    button.className = '';

    // 2. 基础类名适配
    const sendBtn = document.getElementById('send_but');
    if (sendBtn && sendBtn.classList.contains('primary-button')) button.classList.add('primary-button');
    else button.classList.add('secondary-button');

    // 3. 渲染图标内容
    let myIconElement = null;

    if (iconType === Constants.ICON_TYPES.CUSTOM && customIconUrl) {
        const img = document.createElement('img');
        img.src = customIconUrl;
        img.alt = "icon";

        // 始终使用相对单位 em，使其随按钮字体大小自适应
        img.style.height = '1.2em';
        img.style.width = 'auto';
        img.style.verticalAlign = 'middle';
        img.style.display = 'inline-block';
        img.style.objectFit = 'contain';

        button.appendChild(img);
        myIconElement = img;

    } else if (iconType === Constants.ICON_TYPES.FONTAWESOME && faIconCode) {
        button.innerHTML = faIconCode;
        myIconElement = button.querySelector('i, svg');
    } else {
        const iconClass = Constants.ICON_CLASS_MAP[iconType] || Constants.ICON_CLASS_MAP.rocket;
        button.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        myIconElement = button.querySelector('i');
    }

    // 4. 深度样式同步 (完全自适应)
    if (sendBtn) {
        const sendBtnComputed = window.getComputedStyle(sendBtn);

        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.color = sendBtnComputed.color;
        button.style.cursor = sendBtnComputed.cursor;
        button.style.fontSize = sendBtnComputed.fontSize; // 同步原生字号

        const innerIcon = sendBtn.querySelector('i');
        const sourceElement = innerIcon || sendBtn;
        const sourceComputed = window.getComputedStyle(sourceElement);

        if (myIconElement) {
            myIconElement.style.paddingTop = sourceComputed.paddingTop;
            myIconElement.style.paddingBottom = sourceComputed.paddingBottom;
            myIconElement.style.marginTop = sourceComputed.marginTop;

            // 如果原生内部图标有特殊字号，进行二次同步
            if (sourceComputed.fontSize !== sendBtnComputed.fontSize) {
                 myIconElement.style.fontSize = sourceComputed.fontSize;
                 button.style.fontSize = 'inherit';
            }
        }
    }
}

// 设置面板 HTML
export function createSettingsHtml() {
    return `
    <div id="${Constants.ID_SETTINGS_CONTAINER}" class="extension-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <div style="display:flex; align-items:center;">
                    <b>QR助手</b>
                    <span id="${Constants.ID_NEW_VERSION_BADGE}" class="qr-new-badge">NEW</span>
                </div>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
            </div>
            <div class="inline-drawer-content">

                <!-- 菜单栏 -->
                <div id="${Constants.ID_SETTINGS_TAB_BAR}" class="qr-settings-tab-bar">
                    <!-- 滑块元素 -->
                    <div class="qr-tab-glider"></div>

                    <div class="qr-settings-tab-item active" data-tab="${Constants.ID_PAGE_MAIN}" id="${Constants.ID_TAB_MAIN}">
                        <i class="fa-solid fa-cog"></i> 主设置
                    </div>
                    <div class="qr-settings-tab-item" data-tab="${Constants.ID_PAGE_WHITELIST}" id="${Constants.ID_TAB_WHITELIST}">
                        <i class="fa-solid fa-list-check"></i> 白名单
                    </div>
                    <div class="qr-settings-tab-item" data-tab="${Constants.ID_PAGE_ICON}" id="${Constants.ID_TAB_ICON}">
                        <i class="fa-solid fa-icons"></i> 按钮图标
                    </div>
                </div>

                <!-- 1. 主设置页面 -->
                <div id="${Constants.ID_PAGE_MAIN}" class="qr-settings-page active">
                    <!-- 版本检测行 -->
                    <div class="qr-version-row">
                        <span>当前版本: <span id="${Constants.ID_VERSION_DISPLAY}">...</span></span>
                        <button id="${Constants.ID_BTN_CHECK_UPDATE}" class="menu_button qr-update-btn">检查更新</button>
                    </div>

                    <div class="flex-container flexGap5">
                        <select id="${Constants.ID_SETTINGS_ENABLED_DROPDOWN}" class="text_pole" style="width: 100%;">
                            <option value="true">启用插件</option>
                            <option value="false">禁用插件</option>
                        </select>
                    </div>

                    <!-- UI 主题设置 -->
                    <div class="flex-container flexGap5" style="margin-top: 10px; align-items: center;">
                        <label style="font-weight:bold; min-width: 70px;">UI 主题:</label>
                        <select id="${Constants.ID_UI_THEME_DROPDOWN}" class="text_pole" style="flex:1;">
                            <option value="${Constants.UI_THEMES.LIGHT}">默认</option>
                            <option value="${Constants.UI_THEMES.SYSTEM}">跟随酒馆</option>
                            <option value="${Constants.UI_THEMES.PAPER}">和纸</option>
                            <option value="${Constants.UI_THEMES.AURORA}">极光</option>
                            <option value="${Constants.UI_THEMES.SMOKED}">烟熏</option>
                            <option value="${Constants.UI_THEMES.CERAMIC}">白瓷</option>
                            <option value="${Constants.UI_THEMES.LAVENDER}">薰衣草</option>
                            <option value="${Constants.UI_THEMES.FOREST}">迷雾森林</option>
                        </select>
                    </div>

                    <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 2px;">

                        <!-- 自动伸缩卡片 -->
                        <div class="qr-setting-card">
                            <div class="qr-setting-text">
                                <h3>按钮自动伸缩</h3>
                                <p>光标移出输入框区域时自动折叠输入栏高度</p>
                            </div>
                            <label class="qr-toggle">
                                <input type="checkbox" id="${Constants.ID_AUTO_SHRINK_CHECKBOX}">
                                <span class="qr-slider"></span>
                            </label>
                        </div>

                        <!-- 背景模糊卡片 -->
                        <div class="qr-setting-card">
                            <div class="qr-setting-text">
                                <h3>背景模糊效果</h3>
                                <p>打开菜单时对背景应用毛玻璃模糊遮罩</p>
                            </div>
                            <label class="qr-toggle">
                                <input type="checkbox" id="${Constants.ID_BACKDROP_ENABLED_CHECKBOX}">
                                <span class="qr-slider"></span>
                            </label>
                        </div>

                        <!-- 使用说明卡片 -->
                        <div class="qr-setting-card">
                            <div class="qr-setting-text">
                                <h3>插件使用说明</h3>
                                <p>查看关于本插件的详细功能介绍与帮助</p>
                            </div>
                            <button id="${Constants.ID_BTN_OPEN_HELP}" class="qr-card-btn">
                                打开
                            </button>
                        </div>

                    </div>
                </div>

                <!-- 2. 白名单管理页面 (内嵌) -->
                <div id="${Constants.ID_PAGE_WHITELIST}" class="qr-settings-page">
                    <div class="qr-whitelist-inline-container">
                        <div class="qr-whitelist-col">
                            <label>收纳列表 (隐藏)</label>
                            <div id="qrq-non-whitelisted-list" class="qrq-whitelist-list"></div>
                        </div>
                        <div class="qr-whitelist-col">
                            <label>白名单列表 (显示)</label>
                            <div id="qrq-whitelisted-list" class="qrq-whitelist-list"></div>
                        </div>
                    </div>

                    <!-- 底部说明区域 -->
                    <div id="${Constants.ID_WHITELIST_HELP_BOX}" class="qr-whitelist-help-box">
                        <p><strong>点击列表中的选项即可进行移动，在白名单列表中的选项的按钮将保留在输入上方，不会显示在QR助手的菜单面板中。</strong></p>
                        <p>手机用户长摁列表中对应的QR或脚本选项，可以查看该选项具体的来源和作用域。</p>
                        <p>此外，<i class="fa-solid fa-sun"></i> 表示为小白X脚本，<i class="fa-solid fa-star"></i> 表示为QR，而 <i class="fa-solid fa-moon"></i> 表示为酒馆助手脚本。</p>
                    </div>
                </div>

                <!-- 3. 图标设置页面 -->
                <div id="${Constants.ID_PAGE_ICON}" class="qr-settings-page">
                    <!-- 注意：弹窗遮罩已移至 body 根节点，不再此处 -->

                    <div class="qr-icon-settings-layout">
                        <!-- 顶部切换栏 -->
                        <div class="qr-icon-top-bar">
                            <select id="${Constants.ID_ICON_SOURCE_SELECT}" class="text_pole" style="flex:1;">
                                <option value="builtin">内置图标</option>
                                <option value="custom">自定义图标</option>
                            </select>
                        </div>

                        <!-- 内容显示区 -->
                        <div class="qr-icon-content">

                            <!-- A. 内置图标面板 -->
                            <div id="${Constants.ID_PANEL_BUILTIN}" class="qr-icon-panel active">
                                <!-- 修改方向为 row，添加垂直居中 -->
                                <div style="display:flex; flex-direction:row; gap:5px; align-items:center;">
									<label style="font-weight:bold; min-width: 70px;">按钮图标:</label>
                                    <select id="${Constants.ID_BUILTIN_DROPDOWN}" class="text_pole" style="flex:1;">
                                        <option value="${Constants.ICON_TYPES.ROCKET}">小火箭</option>
                                        <option value="${Constants.ICON_TYPES.BOLT}">六芒星</option>
                                        <option value="${Constants.ICON_TYPES.COMMENT}">调色盘</option>
                                        <option value="${Constants.ICON_TYPES.STAR}">星月</option>
                                        <option value="${Constants.ICON_TYPES.FAN}">风车</option>
                                        <option value="${Constants.ICON_TYPES.PENCIL}">小铅笔</option>
                                        <option value="${Constants.ICON_TYPES.BOOK}">书本</option>
                                        <option value="${Constants.ICON_TYPES.MUG}">热咖啡</option>
                                        <option value="${Constants.ICON_TYPES.CROWN}">皇冠</option>
                                        <option value="${Constants.ICON_TYPES.GEM}">钻石</option>
                                        <option value="${Constants.ICON_TYPES.HEADPHONES}">耳机</option>
                                    </select>
                                </div>
                                <div class="qr-icon-preview-box" id="${Constants.ID_BUILTIN_PREVIEW}">
                                    <!-- JS 填充 -->
                                    <i class="fa-solid fa-rocket"></i>
                                    <span class="qr-icon-preview-label">预览</span>
                                </div>
                            </div>

                            <!-- B. 自定义图标面板 -->
                            <div id="${Constants.ID_PANEL_CUSTOM}" class="qr-icon-panel">
                                <!-- 修改方向为 row，添加垂直居中 -->
                                <div style="display:flex; flex-direction:row; gap:5px; align-items:center;">
                                <label style="font-weight:bold; min-width: 70px;">按钮图标:</label>
                                    <select id="${Constants.ID_CUSTOM_DROPDOWN}" class="text_pole" style="flex:1;">
                                        <option value="">-- 请选择或新增 --</option>
                                    </select>
                                </div>

                                <div class="qr-icon-preview-box" id="${Constants.ID_CUSTOM_PREVIEW}">
                                    <span>无图标</span>
                                    <span class="qr-icon-preview-label">预览</span>
                                </div>

                                <div class="qr-icon-actions">
                                    <button id="${Constants.ID_BTN_MANAGE_CUSTOM}" class="menu_button">
                                        <i class="fa-solid fa-list"></i> 管理图标
                                    </button>
                                    <button id="${Constants.ID_BTN_ADD_CUSTOM}" class="menu_button">
                                        <i class="fa-solid fa-plus"></i> 新增图标
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>`;
}

// --- 弹窗 HTML 生成器 ---
function createManageModalHtml(savedIcons) {
    let listHtml = '';
    if (savedIcons && savedIcons.length > 0) {
        savedIcons.forEach((icon, index) => {
            listHtml += `
            <div class="qr-manage-item" data-index="${index}">
                <img src="${icon.url}" onerror="this.src=''">
                <span class="qr-manage-name" title="${icon.name}">${icon.name}</span>
                <div class="qr-manage-actions">
                    <button class="qr-icon-btn edit" title="重命名" onclick="window.quickReplyMenu.renameIcon(${index})">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="qr-icon-btn delete" title="删除" onclick="window.quickReplyMenu.deleteIcon(${index})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>`;
        });
    } else {
        listHtml = `<div style="text-align:center; padding:20px; color:#888;">暂无保存的图标</div>`;
    }

    return `
    <div class="qr-modal-box" id="${Constants.ID_MODAL_MANAGE}">
        <div class="qr-modal-header">管理自定义图标</div>
        <div class="qr-manage-list" id="${Constants.ID_LIST_MANAGE}">
            ${listHtml}
        </div>
        <div class="qr-modal-footer">
            <button id="${Constants.ID_BTN_CLOSE_MANAGE}" class="menu_button">关闭</button>
        </div>
    </div>`;
}

function createAddModalHtml() {
    return `
    <div class="qr-modal-box" id="${Constants.ID_MODAL_ADD}">
        <div class="qr-modal-header">新增自定义图标</div>

        <div class="qr-input-group">
            <label>名称:</label>
            <input type="text" id="${Constants.ID_INPUT_ADD_NAME}" class="text_pole" placeholder="例如: 派蒙">
        </div>

        <div class="qr-input-group">
            <div style="display:flex; justify-content:space-between;">
                <label>图标 URL:</label>
                <a href="https://catbox.moe/" target="_blank" class="qr-upload-link" title="前往 Catbox 上传图片">
                    <i class="fa-solid fa-cloud-arrow-up"></i> 免费图床
                </a>
            </div>
            <input type="text" id="${Constants.ID_INPUT_ADD_URL}" class="text_pole" placeholder="输入图片的图床链接">
        </div>

        <div class="qr-input-group">
            <label>预览:</label>
            <div class="qr-icon-preview-box" id="${Constants.ID_PREVIEW_ADD}" style="min-height:80px; font-size:1.5em;">
                <span>Wait...</span>
            </div>
        </div>

        <div class="qr-modal-footer">
            <button id="${Constants.ID_BTN_SAVE_NEW}" class="menu_button primary">保存</button>
            <button class="menu_button" onclick="document.getElementById('${Constants.ID_MODAL_OVERLAY}').classList.remove('visible')">取消</button>
        </div>
    </div>`;
}

export function handleSettingsChange(event) {
    const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
    const id = event.target.id;
    const val = event.target.value;

    if (id === Constants.ID_SETTINGS_ENABLED_DROPDOWN) {
        settings.enabled = val === 'true';
        if (settings.enabled) {
            document.body.classList.add('qra-enabled');
            document.body.classList.remove('qra-disabled');
            const btn = document.getElementById(Constants.ID_ROCKET_BUTTON);
            if (btn) btn.style.display = 'flex';
        } else {
            document.body.classList.remove('qra-enabled');
            document.body.classList.add('qra-disabled');
            const btn = document.getElementById(Constants.ID_ROCKET_BUTTON);
            if (btn) btn.style.display = 'none';
        }
        applyWhitelistDOMChanges();
    }
    // --- 新版图标逻辑 ---
    else if (id === Constants.ID_BUILTIN_DROPDOWN) {
        settings.iconType = val;
        updateBuiltinPreview(val);
    }
    else if (id === Constants.ID_CUSTOM_DROPDOWN) {
        const selectedUrl = val;
        settings.customIconUrl = selectedUrl;
        settings.iconType = Constants.ICON_TYPES.CUSTOM;
        updateCustomPreview(selectedUrl);
    }
    else if (id === Constants.ID_AUTO_SHRINK_CHECKBOX) {
        settings.autoShrinkEnabled = event.target.checked;
        if (settings.autoShrinkEnabled) injectAutoShrinkStyle();
        else removeAutoShrinkStyle();
    }
    else if (id === Constants.ID_BACKDROP_ENABLED_CHECKBOX) {
        settings.enableBackdrop = event.target.checked;
    }
    else if (id === Constants.ID_UI_THEME_DROPDOWN) {
        settings.uiTheme = val;
        applyThemeStyles();
    }

    updateIconDisplay();
    saveSettings();
}

export function saveSettings() {
    const context = window.SillyTavern?.getContext();
    if (context && typeof context.saveSettingsDebounced === 'function') {
        context.saveSettingsDebounced();
    } else {
        console.warn(`[${Constants.EXTENSION_NAME}] Save function not found in context.`);
    }
}

export function loadAndApplySettings() {
    const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];

    const setVal = (id, v) => { const el = document.getElementById(id); if(el) el.value = v; };
    setVal(Constants.ID_SETTINGS_ENABLED_DROPDOWN, settings.enabled);
    setVal(Constants.ID_UI_THEME_DROPDOWN, settings.uiTheme || Constants.UI_THEMES.LIGHT);

    const shrink = document.getElementById(Constants.ID_AUTO_SHRINK_CHECKBOX);
    if(shrink) shrink.checked = settings.autoShrinkEnabled;

    const backdropCheck = document.getElementById(Constants.ID_BACKDROP_ENABLED_CHECKBOX);
    if(backdropCheck) backdropCheck.checked = settings.enableBackdrop;

    // --- 新 UI 初始化 ---
    refreshCustomDropdown();

    const isCustom = settings.iconType === Constants.ICON_TYPES.CUSTOM;
    const sourceSelect = document.getElementById(Constants.ID_ICON_SOURCE_SELECT);
    const panelBuiltin = document.getElementById(Constants.ID_PANEL_BUILTIN);
    const panelCustom = document.getElementById(Constants.ID_PANEL_CUSTOM);

    // 设置下拉框值并切换面板
    if (sourceSelect) sourceSelect.value = isCustom ? 'custom' : 'builtin';

    if (isCustom) {
        if(panelCustom) panelCustom.classList.add('active');
        if(panelBuiltin) panelBuiltin.classList.remove('active');
        updateCustomPreview(settings.customIconUrl);
    } else {
        if(panelBuiltin) panelBuiltin.classList.add('active');
        if(panelCustom) panelCustom.classList.remove('active');

        const ddBuiltin = document.getElementById(Constants.ID_BUILTIN_DROPDOWN);
        if(ddBuiltin) ddBuiltin.value = settings.iconType;
        updateBuiltinPreview(settings.iconType);
    }

    updateIconDisplay();

    if (settings.autoShrinkEnabled) injectAutoShrinkStyle();
    else removeAutoShrinkStyle();

    if (settings.enabled) {
        document.body.classList.add('qra-enabled');
        document.body.classList.remove('qra-disabled');
    } else {
        document.body.classList.remove('qra-enabled');
        document.body.classList.add('qra-disabled');
    }

    applyThemeStyles();

    // 初始化滑块位置
    setTimeout(() => {
        updateTabGliderState();
    }, 100); // 略微延迟等待 DOM 渲染布局

    // 刷新更新 UI 状态 (使用缓存或静默检测)
    refreshUpdateUI(false);

    // 初始化白名单说明区域的显隐
    const helpBox = document.getElementById(Constants.ID_WHITELIST_HELP_BOX);
    if (helpBox) {
        helpBox.style.display = settings.hideWhitelistHelp ? 'none' : 'block';
    }
}

export function populateWhitelistManagementUI() {
    const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
    const { scripts, standard } = fetchQuickReplies();
    const all = [...scripts, ...standard];
    
    const map = new Map();
    all.forEach(r => {
        let id;
        let displayName = r.setName || r.label;

        if(r.source === 'JSSlashRunner') {
            id = `JSR::${r.scriptId}`;
        }
        else if(r.source === 'QuickReplyV2') {
            id = `QRV2::${r.setName}`;
        }
        else if(r.source === 'LittleWhiteBox') {
            // 修改：如果是角色任务集，使用统一 ID，并显示特定名称
            if (r.isLwbCharSet) {
                id = 'LWB::Character_Set';
                // 需求：显示为 "小白X-${当前角色名称}"
                // r.setName 在 api.js 中已被设为角色名
                displayName = `小白X-${r.setName}`;
            } else {
                id = `LWB::${r.taskScope}::${r.taskId}`;
                // 需求：显示为 "小白X-${脚本名称}"
                // r.taskId 即为脚本名称
                displayName = `小白X-${r.taskId}`;
            }
        }

        if(id && !map.has(id)) map.set(id, { name: displayName, scope: r.scope });
    });

    const nonList = document.getElementById('qrq-non-whitelisted-list');
    const wlList = document.getElementById('qrq-whitelisted-list');
    if(!nonList || !wlList) return;
    
    nonList.innerHTML = ''; wlList.innerHTML = '';
    
    map.forEach((data, id) => {
        // 从对象中解构出 name 和保存的 scope
        const { name, scope: savedScope } = data;

        const div = document.createElement('div');
        div.className = 'qrq-whitelist-item';

        // --- 图标映射逻辑 ---
        let iconHtml = '';
        if (id.startsWith('JSR::')) {
            iconHtml = '<i class="fa-solid fa-moon" title="JSR Script"></i>';
        } else if (id.startsWith('LWB::')) {
            iconHtml = '<i class="fa-solid fa-sun" title="XB Task"></i>';
        } else if (id.startsWith('QRV2::')) {
            iconHtml = '<i class="fa-solid fa-star" title="Quick Reply"></i>';
        }

        // 使用 flex 布局对齐图标和文本
        div.innerHTML = `${iconHtml}<span style="flex:1; overflow:hidden; text-overflow:ellipsis;">${name}</span>`;

        div.onclick = () => {
            if (!Array.isArray(settings.whitelist)) settings.whitelist = [];

            const idx = settings.whitelist.indexOf(id);
            if(idx > -1) settings.whitelist.splice(idx, 1);
            else settings.whitelist.push(id);

            populateWhitelistManagementUI();
            saveSettings();
            if(window.quickReplyMenu?.applyWhitelistDOMChanges) window.quickReplyMenu.applyWhitelistDOMChanges();
        };

        // --- 悬停与触摸交互逻辑 ---

        // 1. 预先构建数据对象
        let source = 'Unknown';
        // 优先使用 api.js 传来的 scope，如果没有则默认为 global
        let scope = savedScope || 'global';

        if (id.startsWith('JSR::')) source = 'JSSlashRunner';
        else if (id.startsWith('QRV2::')) source = 'QuickReplyV2';
        else if (id.startsWith('LWB::')) {
            source = 'LittleWhiteBox';
            // 针对 LWB 保持 ID 解析逻辑以确保准确性
            scope = id.split('::')[1]; // LWB::{scope}::{taskId}
        }

        const mockReply = {
            source: source,
            scope: scope,
            label: name,
            setName: name
        };

        // 2. 状态控制变量
        let pressTimer = null;
        let isTouchAction = false;

        // 3. 鼠标悬停 (Desktop)
        div.addEventListener('mouseenter', (e) => {
            // 如果是由触摸操作引发的模拟鼠标事件，则忽略，防止点击时弹出
            if (isTouchAction) return;
            showTooltip(e, mockReply, true);
        });

        div.addEventListener('mouseleave', () => {
            hideTooltip();
        });

        // 4. 触摸长按 (Mobile)
        div.addEventListener('touchstart', (e) => {
            isTouchAction = true;
            pressTimer = setTimeout(() => {
                // 长按 600ms 后显示信息
                // 修复：异步回调中原事件对象的 currentTarget 会丢失，
                // 必须显式捕获当前的 DOM 元素 (div) 并伪造一个事件对象传给 showTooltip
                const mockEvent = { currentTarget: div };
                showTooltip(mockEvent, mockReply, true);
            }, 600);
        }, { passive: true });

        const clearTouchState = () => {
            if (pressTimer) clearTimeout(pressTimer);
            hideTooltip(); // 松手隐藏
            // 延迟重置标记，确保覆盖随后的 mouseenter/click 事件周期
            setTimeout(() => { isTouchAction = false; }, 500);
        };

        div.addEventListener('touchend', clearTouchState, { passive: true });

        div.addEventListener('touchmove', () => {
            // 如果手指移动了，视为滑动操作，取消长按判定
            if (pressTimer) clearTimeout(pressTimer);
            hideTooltip();
        }, { passive: true });

        if(settings.whitelist.includes(id)) wlList.appendChild(div);
        else nonList.appendChild(div);
    });

    attachScrollListener(nonList);
    attachScrollListener(wlList);
}

export function setupEventListeners() {
    const bind = (id, handler) => document.getElementById(id)?.addEventListener('change', handler);

    bind(Constants.ID_SETTINGS_ENABLED_DROPDOWN, handleSettingsChange);
    bind(Constants.ID_AUTO_SHRINK_CHECKBOX, handleSettingsChange);
    bind(Constants.ID_BACKDROP_ENABLED_CHECKBOX, handleSettingsChange);
    bind(Constants.ID_UI_THEME_DROPDOWN, handleSettingsChange);

    // --- 图标设置新界面监听 ---
    const sourceSelect = document.getElementById(Constants.ID_ICON_SOURCE_SELECT);
    const panelBuiltin = document.getElementById(Constants.ID_PANEL_BUILTIN);
    const panelCustom = document.getElementById(Constants.ID_PANEL_CUSTOM);

    if (sourceSelect) {
        sourceSelect.addEventListener('change', (e) => {
            const isCustom = e.target.value === 'custom';
            const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];

            if (isCustom) {
                panelCustom.classList.add('active');
                panelBuiltin.classList.remove('active');
                settings.iconType = Constants.ICON_TYPES.CUSTOM;

                // 自动选中第一个自定义图标（如果有且未选）
                if (!settings.customIconUrl && settings.savedCustomIcons?.length > 0) {
                    settings.customIconUrl = settings.savedCustomIcons[0].url;
                    const dd = document.getElementById(Constants.ID_CUSTOM_DROPDOWN);
                    if(dd) dd.value = settings.customIconUrl;
                }
            } else {
                panelBuiltin.classList.add('active');
                panelCustom.classList.remove('active');

                // 恢复为内置图标的当前选项
                const dd = document.getElementById(Constants.ID_BUILTIN_DROPDOWN);
                if (dd) settings.iconType = dd.value;
            }
            saveSettings();
            updateIconDisplay();
        });
    }

    bind(Constants.ID_BUILTIN_DROPDOWN, handleSettingsChange);
    bind(Constants.ID_CUSTOM_DROPDOWN, handleSettingsChange);

    const btnManage = document.getElementById(Constants.ID_BTN_MANAGE_CUSTOM);
    if (btnManage) btnManage.onclick = openManageModal;

    const btnAdd = document.getElementById(Constants.ID_BTN_ADD_CUSTOM);
    if (btnAdd) btnAdd.onclick = openAddModal;

    // 移除旧的白名单按钮监听 (ID_WHITELIST_BUTTON 已不存在)

    // 新增：白名单 TAB 点击事件
    const wlTab = document.getElementById(Constants.ID_TAB_WHITELIST);
    if (wlTab) {
        wlTab.addEventListener('click', () => {
            // 切换到白名单页面时刷新数据
            populateWhitelistManagementUI();
        });
    }

    // 新增：使用说明按钮点击事件
    const helpBtn = document.getElementById(Constants.ID_BTN_OPEN_HELP);
    if (helpBtn) {
        helpBtn.onclick = () => {
             openHelpModal();
        };
    }

    // (已移除局部 updateGliderPosition 定义)

    const tabs = document.querySelectorAll('.qr-settings-tab-item');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            const currentTab = e.currentTarget;
            currentTab.classList.add('active');

            // 移动滑块 (调用导出函数)
            updateTabGliderState();

            const pages = document.querySelectorAll('.qr-settings-page');
            pages.forEach(p => p.classList.remove('active'));

            const targetId = currentTab.getAttribute('data-tab');
            const targetPage = document.getElementById(targetId);
            if(targetPage) targetPage.classList.add('active');
        });
    });

    const themeDropdown = document.getElementById('themes');
    if (themeDropdown) {
        themeDropdown.addEventListener('change', () => {
            setTimeout(() => {
                updateIconDisplay();
            }, 500);
        });
    }

    // 更新按钮监听
    const btnUpdate = document.getElementById(Constants.ID_BTN_CHECK_UPDATE);
    if (btnUpdate) {
        btnUpdate.onclick = async (e) => {
            // 防止冒泡导致折叠面板
            e.stopPropagation();
            const btn = document.getElementById(Constants.ID_BTN_CHECK_UPDATE);
            // 如果已经是红色状态(有更新)，点击则弹出日志
            if (btn.classList.contains('has-update')) {
                showUpdateModal();
            } else {
                // 否则强制检查
                btn.textContent = "检测中...";
                await refreshUpdateUI(true);
                const isUpdated = btn.classList.contains('has-update');
                if (!isUpdated) btn.textContent = "已是最新";
            }
        };
    }

    // ============================================================
    // 防止操作弹窗时导致背后的 ST 扩展面板关闭
    // ============================================================
    const overlay = document.getElementById(Constants.ID_MODAL_OVERLAY);
    if (overlay) {
        // 定义一个阻止冒泡的函数
        const stopPropagation = (e) => {
            e.stopPropagation();
        };

        // SillyTavern 在 script.js 中监听的是 'touchstart' 和 'mousedown'
        // 我们需要在这些事件到达 html 之前在 overlay 层将其截断
        overlay.addEventListener('mousedown', stopPropagation);
        overlay.addEventListener('touchstart', stopPropagation);
        overlay.addEventListener('click', stopPropagation);

        // 同样阻止滚轮事件冒泡，防止滚动弹窗列表时误触（可选，但推荐）
        overlay.addEventListener('wheel', stopPropagation, { passive: true });
    }
    // ============================================================

    // 白名单页面说明区域 - "不再显示"按钮逻辑
    const btnDismissHelp = document.getElementById(Constants.ID_BTN_DISMISS_WHITELIST_HELP);
    if (btnDismissHelp) {
        btnDismissHelp.onclick = () => {
            const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
            settings.hideWhitelistHelp = true;
            saveSettings();

            const box = document.getElementById(Constants.ID_WHITELIST_HELP_BOX);
            if (box) box.style.display = 'none';
        };
    }
}

// 应用主题样式类到 body (互斥管理)
export function applyThemeStyles() {
    const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
    const theme = settings.uiTheme || Constants.UI_THEMES.LIGHT;

    // 1. 获取所有已知的主题类名列表
    const allThemeClasses = Object.values(Constants.UI_THEMES).filter(t => t !== 'light' && t !== 'system');
    // 添加 system 的特殊映射类名（如果我们在 CSS 中给它定义了类名的话，这里使用了变量覆盖，但保持统一性也行）
    allThemeClasses.push('qra-theme-system');

    // 2. 清理所有主题类名
    document.body.classList.remove(...allThemeClasses);

    // 3. 添加当前选中的主题类名
    if (theme === Constants.UI_THEMES.SYSTEM) {
        document.body.classList.add('qra-theme-system');
    } else if (theme !== Constants.UI_THEMES.LIGHT) {
        // Light 模式使用 CSS 中的 :root 或默认值，不需要添加类
        document.body.classList.add(theme);
    }
}

// --- 预览更新辅助函数 ---
function updateBuiltinPreview(type) {
    const el = document.getElementById(Constants.ID_BUILTIN_PREVIEW);
    if(!el) return;
    const iconClass = Constants.ICON_CLASS_MAP[type] || 'fa-rocket';
    el.innerHTML = `<i class="fa-solid ${iconClass}"></i><span class="qr-icon-preview-label">预览</span>`;
}

function updateCustomPreview(url) {
    const el = document.getElementById(Constants.ID_CUSTOM_PREVIEW);
    if(!el) return;
    if (url) {
        el.innerHTML = `<img src="${url}"><span class="qr-icon-preview-label">预览</span>`;
    } else {
        el.innerHTML = `<span>无</span><span class="qr-icon-preview-label">预览</span>`;
    }
}

// --- 弹窗逻辑 ---
function openManageModal() {
    const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
    const overlay = document.getElementById(Constants.ID_MODAL_OVERLAY);
    overlay.innerHTML = createManageModalHtml(settings.savedCustomIcons);
    overlay.classList.add('visible');

    document.getElementById(Constants.ID_BTN_CLOSE_MANAGE).onclick = () => {
        overlay.classList.remove('visible');
        refreshCustomDropdown();
    };

    window.quickReplyMenu.deleteIcon = (index) => {
        if(!confirm('确定删除这个图标吗？')) return;
        settings.savedCustomIcons.splice(index, 1);
        saveSettings();
        openManageModal();
    };

    window.quickReplyMenu.renameIcon = (index) => {
        const newName = prompt("请输入新名称:", settings.savedCustomIcons[index].name);
        if(newName) {
            settings.savedCustomIcons[index].name = newName;
            saveSettings();
            openManageModal();
        }
    };
}

function openAddModal() {
    const overlay = document.getElementById(Constants.ID_MODAL_OVERLAY);
    overlay.innerHTML = createAddModalHtml();
    overlay.classList.add('visible');

    const inputUrl = document.getElementById(Constants.ID_INPUT_ADD_URL);
    const inputName = document.getElementById(Constants.ID_INPUT_ADD_NAME);
    const preview = document.getElementById(Constants.ID_PREVIEW_ADD);

    inputUrl.addEventListener('input', (e) => {
        const val = e.target.value;
        if(val) preview.innerHTML = `<img src="${val}" style="max-width:80%; max-height:80%;">`;
        else preview.innerHTML = '<span>Wait...</span>';
    });

    document.getElementById(Constants.ID_BTN_SAVE_NEW).onclick = () => {
        const url = inputUrl.value.trim();
        const name = inputName.value.trim() || '未命名图标';

        if (!url) {
            alert('请输入图标链接');
            return;
        }

        const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
        if (!settings.savedCustomIcons) settings.savedCustomIcons = [];

        settings.savedCustomIcons.push({ name, url });
        settings.customIconUrl = url;
        settings.iconType = Constants.ICON_TYPES.CUSTOM;

        saveSettings();
        overlay.classList.remove('visible');

        refreshCustomDropdown();
        // 切换下拉框并触发事件
        const select = document.getElementById(Constants.ID_ICON_SOURCE_SELECT);
        if(select) {
            select.value = 'custom';
            select.dispatchEvent(new Event('change'));
        }
    };
}

function refreshCustomDropdown() {
    const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
    const dd = document.getElementById(Constants.ID_CUSTOM_DROPDOWN);
    if (!dd) return;

    dd.innerHTML = '<option value="">-- 请选择 --</option>';
    if (settings.savedCustomIcons) {
        settings.savedCustomIcons.forEach(icon => {
            const opt = document.createElement('option');
            opt.value = icon.url;
            opt.textContent = icon.name;
            dd.appendChild(opt);
        });
    }
    dd.value = settings.customIconUrl || '';
    updateCustomPreview(dd.value);
}

// 独立的 Modal Overlay HTML，用于注入到 body
export function createModalOverlayHtml() {
    return `<div id="${Constants.ID_MODAL_OVERLAY}" class="qr-modal-overlay"></div>`;
}

// --- 使用说明弹窗逻辑 ---

// 硬编码的使用说明内容 (对应 使用说明.md)
const HELP_CONTENT_HTML = `
    <h2 id="help-core">核心功能</h2>
    <ul>
        <li>能够将聊天输入框上方的按钮都移动到一个独立的菜单中，并通过发送按钮左边图标用来打开该菜单。</li>
    </ul>
    <blockquote>
        插件提供<code>白名单</code>功能，在<code>白名单</code>中的按钮将不会放到该菜单中。因此，你可以选择性的保留一些按钮到输入框上方（例如输入助手）。
    </blockquote>

    <h2 id="help-detail">具体功能介绍</h2>

    <h3 id="help-whitelist">白名单功能</h3>
    <ul>
        <li>点击对应的QR、酒馆脚本、小白X按钮，即可移至白名单列表，白名单列表的按钮将会保留在输入框上方。</li>
    </ul>

    <h3 id="help-icons">按钮图标</h3>
    <h4>内置图标</h4>
    <ul>
        <li>默认按钮图标是小火箭，不过插件还内置了六芒星、调色盘、星月，这三个图标可供选择。</li>
    </ul>
    <h4>自动图标</h4>
    <ul>
        <li>除了以上内置的四个图标外，插件还支持<code>自定义图标</code>。</li>
        <li>点击<code>新增图标</code>按钮，然后输入自定义的图标名称和图片的图床链接，即可添加自定义的图标。另外，弹窗内部提供免费图床链接（catbox）。</li>
        <li>点击<code>管理图标</code>按钮，即可修改自定义图标的名称或者删除对应的自定义图标。</li>
    </ul>
    <h4>其他说明</h4>
    <p>如果酒馆主题UI自带QR助手图标，那么该主题的图标是会覆盖掉你当前使用的QR助手按钮图标的。这是预期现象。</p>

    <h3 id="help-theme">菜单UI主题</h3>
    <ul>
        <li>插件内置多种UI主题，可供选择。</li>
    </ul>

    <h3 id="help-others">其他功能</h3>
    <h4>一键禁用/启用QR助手</h4>
    <ul><li>选择<code>启用/禁用插件</code>即可</li></ul>
    <h4>内置自动折叠输入框区域</h4>
    <ul><li>启用<code>按钮自动伸缩</code>功能即可。</li></ul>
    <h4>提供按钮菜单背景模糊效果</h4>
    <ul><li>启用<code>背景模糊效果</code>功能即可。</li></ul>

    <h3 id="help-compat">输入助手与预设转移插件</h3>
    <ul>
        <li>将输入助手移至白名单即可正常显示对应的符号按钮。</li>
        <li>已经兼容<code>预设转移工具</code>插件的"世界书常用"按钮，会显示在列表左侧。</li>
    </ul>

    <h3 id="help-update">检测更新</h3>
    <ul>
        <li>除了酒馆内置的在<code>管理拓展</code>区域提供的检测更新外，插件也提供自动检测版本更新。每超过24小时会检测一次版本。如果存在最新版本，则会显示<code>NEW</code>符号，并且<code>检测版本</code>会变为红色的<code>发现新版本</code>标题。点击<code>发现新版本</code>可查看更新日志，并快速进行更新插件。</li>
    </ul>
    <div style="height: 100px;"></div> <!-- 底部留白 -->
`;

function createHelpModalHtml() {
    return `
    <div class="qr-modal-box qr-help-mode" id="${Constants.ID_MODAL_HELP}">
        <!-- 1. 头部 -->
        <div class="qr-help-header">
            <span>QR助手 使用说明</span>
            <button class="qr-help-close-btn" onclick="document.getElementById('${Constants.ID_MODAL_OVERLAY}').classList.remove('visible')">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>

        <!-- 2. 视频区 (置顶) -->
        <div class="qr-help-video-container">
            <video controls controlsList="nodownload" preload="metadata">
                <source src="https://files.catbox.moe/mu8kg5.mp4" type="video/mp4">
                您的浏览器不支持视频标签。
            </video>
        </div>

        <!-- 3. 双栏布局区 -->
        <div class="qr-help-split-layout">
            <!-- 左侧目录 -->
            <div class="qr-help-sidebar">
                <div class="qr-toc-item active" data-target="help-core">核心功能</div>
                <div class="qr-toc-item" data-target="help-detail">具体功能</div>
                <div class="qr-toc-item sub" data-target="help-whitelist">白名单</div>
                <div class="qr-toc-item sub" data-target="help-icons">按钮图标</div>
                <div class="qr-toc-item sub" data-target="help-theme">UI 主题</div>
                <div class="qr-toc-item sub" data-target="help-others">其他功能</div>
                <div class="qr-toc-item sub" data-target="help-compat">兼容其他插件</div>
                <div class="qr-toc-item sub" data-target="help-update">检测更新</div>
            </div>

            <!-- 右侧正文 -->
            <div class="qr-help-content" id="qr-help-scroll-view">
                ${HELP_CONTENT_HTML}
            </div>
        </div>
    </div>`;
}

function openHelpModal() {
    const overlay = document.getElementById(Constants.ID_MODAL_OVERLAY);
    if (!overlay) return;

    overlay.innerHTML = createHelpModalHtml();
    overlay.classList.add('visible');

    // 绑定目录点击事件
    const items = overlay.querySelectorAll('.qr-toc-item');
    const scrollView = document.getElementById('qr-help-scroll-view');

    items.forEach(item => {
        item.addEventListener('click', () => {
            // 切换高亮
            items.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // 滚动定位
            const targetId = item.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl && scrollView) {
                // 使用 scrollIntoView 或 scrollTop 计算
                // 这里减去 20px 留一点顶部间隙
                const topPos = targetEl.offsetTop - scrollView.offsetTop;
                scrollView.scrollTo({ top: topPos, behavior: 'smooth' });
            }
        });
    });
}

// --- End of 使用说明逻辑 ---

// --- 更新日志弹窗 ---
function createChangelogModalHtml(changelogText) {
    return `
    <div class="qr-modal-box" id="${Constants.ID_MODAL_UPDATE}">
        <div class="qr-modal-header">插件更新日志</div>
        <div class="qr-changelog-viewer" id="${Constants.ID_CHANGELOG_CONTENT}">${changelogText}</div>
        <div class="qr-modal-footer">
            <button id="${Constants.ID_BTN_CONFIRM_UPDATE}" class="menu_button primary">立即更新</button>
            <button class="menu_button" onclick="document.getElementById('${Constants.ID_MODAL_OVERLAY}').classList.remove('visible')">取消</button>
        </div>
    </div>`;
}

async function showUpdateModal() {
    const overlay = document.getElementById(Constants.ID_MODAL_OVERLAY);
    // 先显示 Loading
    overlay.innerHTML = `<div class="qr-modal-box" style="text-align:center; padding:30px;">Loading changelog...</div>`;
    overlay.classList.add('visible');

    const changelog = await getChangelog();

    // 简单的 Markdown 渲染 (只处理换行和简单的标题，或者直接依赖 ST 的 markdown 渲染器如果可用)
    // 这里简单转义 HTML 即可，保持纯文本显示最稳妥，或者简单替换换行
    const safeLog = changelog.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    overlay.innerHTML = createChangelogModalHtml(safeLog);

    const btnUpdate = document.getElementById(Constants.ID_BTN_CONFIRM_UPDATE);
    if (btnUpdate) {
        btnUpdate.onclick = async () => {
            if (confirm('更新操作将刷新页面，请确保已保存对话。\n确定更新吗？')) {
                btnUpdate.disabled = true;
                btnUpdate.textContent = "更新中...";
                try {
                    const res = await performUpdate();
                    if (res.ok) {
                        alert('更新指令已发送，页面即将刷新。');
                        setTimeout(() => location.reload(), 2000);
                    } else {
                        alert('更新失败，请查看控制台日志。');
                        btnUpdate.disabled = false;
                    }
                } catch (e) {
                    alert('更新请求发生错误: ' + e);
                    btnUpdate.disabled = false;
                }
            }
        };
    }
}

// 更新 UI 状态
export async function refreshUpdateUI(force = false) {
    const btn = document.getElementById(Constants.ID_BTN_CHECK_UPDATE);
    const verDisplay = document.getElementById(Constants.ID_VERSION_DISPLAY);
    
    // 如果是强制检查，先显示 Loading 状态
    if (force && verDisplay) verDisplay.textContent = "检测中...";

    const result = await checkForUpdates(force);

    // 只要有结果返回，就优先更新版本号显示
    if (result && verDisplay) {
        verDisplay.textContent = result.localVersion || 'Unknown';
    }

    // 接下来处理“是否有更新”的按钮状态
    const badge = document.getElementById(Constants.ID_NEW_VERSION_BADGE);
    
    if (!result) {
        // 极端情况：没有任何结果
        if (verDisplay) verDisplay.textContent = "Error";
        return;
    }

    if (result.hasUpdate) {
        if (badge) badge.classList.add('visible');
        if (btn) {
            btn.textContent = "发现新版本";
            btn.classList.add('has-update');
            btn.title = `最新版本: ${result.latestVersion}`;
        }
    } else {
        if (badge) badge.classList.remove('visible');
        if (btn) {
            // 如果 remote 检查失败，显示提示
            if (result.latestVersion === "Check Failed") {
                btn.textContent = "检测失败";
            } else {
                btn.textContent = "检查更新";
            }
            btn.classList.remove('has-update');
            btn.removeAttribute('title');
        }
    }
}