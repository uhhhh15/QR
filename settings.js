// settings.js
import * as Constants from './constants.js';
import { sharedState } from './state.js';
import { fetchQuickReplies } from './api.js';
import { applyWhitelistDOMChanges } from './whitelist.js';
import { attachScrollListener, showTooltip, hideTooltip } from './ui.js';
import { checkForUpdates, getChangelog, performUpdate } from './update.js';
import { Logger, LogLevel, LogCategory } from './logger.js';
import { translate, getCurrentLocale } from '../../../i18n.js';
import { helpDocs, announcementDocs } from './dict.js';

// 同步原版 Quick Reply v2 "合并按钮" 开关状态到我们的面板
export function syncCombinedCheckbox() {
    const combinedCheck = document.getElementById(Constants.ID_COMBINED_BUTTONS_CHECKBOX);
    if (combinedCheck && window.quickReplyApi && window.quickReplyApi.settings) {
        combinedCheck.checked = window.quickReplyApi.settings.isCombined;
    }
}

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
    const iconType = settings.iconType || Constants.ICON_TYPES.STAR;
    const customIconUrl = settings.customIconUrl || '';
    const faIconCode = settings.faIconCode || '';
    const sizeMode = settings.builtinIconSize || 'match'; // 内置图标大小模式

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

        // 查找当前图标对应的配置以获取：
        const savedCustomIcons = settings.savedCustomIcons || [];
        const currentIconConfig = savedCustomIcons.find(icon => icon.url === customIconUrl);
        // 如果找到了配置且有size字段则使用，否则默认1.2
        const iconSize = (currentIconConfig && currentIconConfig.size) ? currentIconConfig.size : '1.2';

        // 始终使用相对单位 em，使其随按钮字体大小自适应
        img.style.height = iconSize + 'em';
        img.style.width = 'auto';
        img.style.verticalAlign = 'middle';
        img.style.display = 'inline-block';
        img.style.objectFit = 'contain';

        button.appendChild(img);
        myIconElement = img;

    } else if (iconType === Constants.ICON_TYPES.CHARACTER_CARD) {
        const avatarImg = document.querySelector("#avatar_load_preview");
        if (avatarImg && avatarImg.src) {
            const img = document.createElement('img');
            img.src = avatarImg.src;
            img.alt = "character";
            img.className = 'qr-character-avatar';
            img.onerror = () => { button.innerHTML = '<i class="fa-solid fa-user"></i>'; };
            button.appendChild(img);
            myIconElement = img;
        } else {
            button.innerHTML = '<i class="fa-solid fa-user"></i>';
            myIconElement = button.querySelector('i');
        }

    } else if (iconType === Constants.ICON_TYPES.FONTAWESOME && faIconCode) {
        button.innerHTML = faIconCode;
        myIconElement = button.querySelector('i, svg');
    } else {
        const iconClass = Constants.ICON_CLASS_MAP[iconType] || Constants.ICON_CLASS_MAP[Constants.ICON_TYPES.STAR];

        // 计算最终字号
        let finalFontSize;
        if (sizeMode === 'match') {
            finalFontSize = 'inherit'; // 与发送按钮保持一致
        } else {
            const numVal = parseFloat(sizeMode);
            if (!isNaN(numVal) && numVal > 0) {
                finalFontSize = `${sizeMode}em`;
            } else {
                finalFontSize = 'inherit'; // 无效值回退
            }
        }

        button.innerHTML = `<i class="fa-solid ${iconClass}" style="font-size: ${finalFontSize};"></i>`;
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

            // 仅在"与发送按钮保持一致"模式下才同步图标字号；自定义大小模式下不覆盖
            if (sizeMode === 'match' && sourceComputed.fontSize !== sendBtnComputed.fontSize) {
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
                    <b data-i18n="qra_plugin_name">QR助手</b>
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
                        <i class="fa-solid fa-cog"></i> <span data-i18n="qra_tab_main">主设置</span>
                    </div>
                    <div class="qr-settings-tab-item" data-tab="${Constants.ID_PAGE_WHITELIST}" id="${Constants.ID_TAB_WHITELIST}">
                        <i class="fa-solid fa-list-check"></i> <span data-i18n="qra_tab_whitelist">白名单</span>
                    </div>
                    <div class="qr-settings-tab-item" data-tab="${Constants.ID_PAGE_ICON}" id="${Constants.ID_TAB_ICON}">
                        <i class="fa-solid fa-icons"></i> <span data-i18n="qra_tab_icon">按钮图标</span>
                    </div>
                </div>

                <!-- 1. 主设置页面 -->
                <div id="${Constants.ID_PAGE_MAIN}" class="qr-settings-page active">
                    <!-- 版本检测行 -->
                    <div class="qr-version-row">
                        <span><span data-i18n="qra_label_current_version">当前版本:</span> <span id="${Constants.ID_VERSION_DISPLAY}">...</span></span>
                        <button id="${Constants.ID_BTN_CHECK_UPDATE}" class="menu_button qr-update-btn"><span data-i18n="qra_btn_check_update">检查更新</span></button>
                    </div>

                    <div class="flex-container flexGap5">
                        <select id="${Constants.ID_SETTINGS_ENABLED_DROPDOWN}" class="text_pole" style="width: 100%;">
                            <option value="true" data-i18n="qra_opt_enable">启用插件</option>
                            <option value="false" data-i18n="qra_opt_disable">禁用插件</option>
                        </select>
                    </div>

                    <!-- UI 主题设置 -->
                    <div class="flex-container flexGap5" style="margin-top: 10px; align-items: center;">
                        <label style="font-weight:bold; min-width: 70px;" data-i18n="qra_label_ui_theme">UI 主题:</label>
                        <select id="${Constants.ID_UI_THEME_DROPDOWN}" class="text_pole" style="flex:1;">
                            <option value="${Constants.UI_THEMES.LIGHT}" data-i18n="qra_theme_default">默认</option>
                            <option value="${Constants.UI_THEMES.SYSTEM}" data-i18n="qra_theme_system">跟随酒馆</option>
                            <option value="${Constants.UI_THEMES.CUTE}" data-i18n="qra_theme_sakura">樱花</option>
                            <option value="${Constants.UI_THEMES.CLASSICAL}" data-i18n="qra_theme_classical">古典</option>
                            <option value="${Constants.UI_THEMES.DARK}" data-i18n="qra_theme_dark">暗黑</option>
                            <option value="${Constants.UI_THEMES.PAPER}" data-i18n="qra_theme_paper">和纸</option>
                            <option value="${Constants.UI_THEMES.CERAMIC}" data-i18n="qra_theme_ceramic">白瓷</option>
                            <option value="${Constants.UI_THEMES.LAVENDER}" data-i18n="qra_theme_lavender">薰衣草</option>
                            <option value="${Constants.UI_THEMES.SMOKED}" data-i18n="qra_theme_smoked">烟熏</option>
                            <option value="${Constants.UI_THEMES.AURORA}" data-i18n="qra_theme_aurora">极光</option>
                            <option value="${Constants.UI_THEMES.FOREST}" data-i18n="qra_theme_forest">迷雾森林</option>
                        </select>
                    </div>

                    <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 2px;">

                        <!-- 自动伸缩卡片 -->
                        <div class="qr-setting-card">
                            <div class="qr-setting-text">
                                <h3 data-i18n="qra_card_autoshrink_title">按钮自动折叠</h3>
                                <p data-i18n="qra_card_autoshrink_desc">自动折叠聊天输入框上方的按钮区域</p>
                            </div>
                            <label class="qr-toggle">
                                <input type="checkbox" id="${Constants.ID_AUTO_SHRINK_CHECKBOX}">
                                <span class="qr-slider"></span>
                            </label>
                        </div>

                        <!-- 背景模糊卡片 -->
                        <div class="qr-setting-card">
                            <div class="qr-setting-text">
                                <h3 data-i18n="qra_card_backdrop_title">背景模糊效果</h3>
                                <p data-i18n="qra_card_backdrop_desc">打开菜单时对背景应用毛玻璃模糊遮罩</p>
                            </div>
                            <label class="qr-toggle">
                                <input type="checkbox" id="${Constants.ID_BACKDROP_ENABLED_CHECKBOX}">
                                <span class="qr-slider"></span>
                            </label>
                        </div>

                        <!-- 合并按钮卡片 -->
                        <div class="qr-setting-card">
                            <div class="qr-setting-text">
                                <h3 data-i18n="qra_card_combined_title">合并快速回复</h3>
                                <p data-i18n="qra_card_combined_desc">让输入框上方的所有的按钮都紧贴再一块</p>
                            </div>
                            <label class="qr-toggle">
                                <input type="checkbox" id="${Constants.ID_COMBINED_BUTTONS_CHECKBOX}">
                                <span class="qr-slider"></span>
                            </label>
                        </div>

                        <!-- 菜单分组排序卡片 -->
                        <div class="qr-setting-card">
                            <div class="qr-setting-text">
                                <h3 data-i18n="qra_card_sort_title">菜单按钮排序</h3>
                                <p data-i18n="qra_card_sort_desc">允许对菜单按钮进行自定义排序</p>
                            </div>
                            <button id="${Constants.ID_BTN_OPEN_SORT}" class="qr-card-btn" data-i18n="qra_btn_settings">
                                设置
                            </button>
                        </div>

                        <!-- 使用说明卡片 -->
                        <div class="qr-setting-card">
                            <div class="qr-setting-text">
                                <h3 data-i18n="qra_card_help_title">插件使用说明</h3>
                                <p data-i18n="qra_card_help_desc">查看关于本插件的详细功能介绍与帮助</p>
                            </div>
                            <button id="${Constants.ID_BTN_OPEN_HELP}" class="qr-card-btn" data-i18n="qra_btn_open">
                                打开
                            </button>
                        </div>

                        ${Constants.DEBUG_MODE ? `
                        <!-- 系统日志卡片（仅 DEBUG_MODE 开启时显示） -->
                        <div class="qr-setting-card" style="align-items: flex-start;">
                            <div class="qr-setting-text" style="padding-top: 5px;">
                                <h3 data-i18n="qra_card_log_title">系统日志</h3>
                                <p data-i18n="qra_card_log_desc">查看插件运行状态、排查问题或导出日志报告</p>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 5px; min-width: 140px;">
                                <select id="qr-log-level-select" class="text_pole" style="width: 100%;">
                                    <option value="0" data-i18n="qra_log_level_debug">DEBUG (全部)</option>
                                    <option value="1" data-i18n="qra_log_level_info">INFO (常规)</option>
                                    <option value="2" data-i18n="qra_log_level_warn">WARN (仅警告)</option>
                                    <option value="3" data-i18n="qra_log_level_error">ERROR (仅错误)</option>
                                </select>
                                <button id="qr-view-logs-btn" class="menu_button" style="width: auto; align-self: stretch;" data-i18n="qra_btn_view_logs">查看日志</button>
                                <button id="qr-download-logs-panel-btn" class="menu_button" style="width: auto; align-self: stretch;" data-i18n="qra_btn_download_logs">下载日志</button>
                            </div>
                        </div>
                        ` : ''}

                    </div>
                </div>

                <!-- 2. 白名单管理页面 (内嵌) -->
                <div id="${Constants.ID_PAGE_WHITELIST}" class="qr-settings-page">
                    <div class="qr-whitelist-inline-container">
                        <div class="qr-whitelist-col">
                            <label data-i18n="qra_whitelist_hidden">收纳列表 (隐藏)</label>
                            <div id="qrq-non-whitelisted-list" class="qrq-whitelist-list"></div>
                        </div>
                        <div class="qr-whitelist-col">
                            <label data-i18n="qra_whitelist_visible">白名单列表 (显示)</label>
                            <div id="qrq-whitelisted-list" class="qrq-whitelist-list"></div>
                        </div>
                    </div>

                    <!-- 底部说明区域 -->
                    <div id="${Constants.ID_WHITELIST_HELP_BOX}" class="qr-whitelist-help-box">
                        <p data-i18n="qra_whitelist_help_p1"><strong>直接点击上方列表中的选项即可将对应选项按钮移动到另一侧列表中。</strong></p>
                        <p data-i18n="qra_whitelist_help_p2"><strong>在白名单列表中的选项的按钮将保留在聊天输入框上方，不会显示在QR助手的菜单面板中，而在收纳列表中的选项按钮则会出现菜单面板中，不出现在聊天输入框上方。</strong></p>
                        <p data-i18n="qra_whitelist_help_p3">手机用户长摁列表中对应的QR或脚本选项，可以查看该选项具体的来源和作用域。</p>
                        <p data-i18n="qra_whitelist_help_p4">此外，<i class="fa-solid fa-sun"></i> 表示为小白X脚本，<i class="fa-solid fa-star"></i> 表示为QR，<i class="fa-solid fa-moon"></i> 表示为酒馆助手脚本，而 <i class="fa-solid fa-puzzle-piece"></i> 表示为酒馆插件。</p>
                    </div>
                </div>

                <!-- 3. 图标设置页面 -->
                <div id="${Constants.ID_PAGE_ICON}" class="qr-settings-page">
                    <!-- 注意：弹窗遮罩已移至 body 根节点，不再此处 -->

                    <div class="qr-icon-settings-layout">
                        <!-- 顶部切换栏 -->
                        <div class="qr-icon-top-bar">
                            <select id="${Constants.ID_ICON_SOURCE_SELECT}" class="text_pole" style="flex:1;">
                                <option value="builtin" data-i18n="qra_icon_source_builtin">内置图标</option>
                                <option value="character" data-i18n="qra_icon_source_character">当前角色卡</option>
                                <option value="custom" data-i18n="qra_icon_source_custom">自定义图标</option>
                            </select>
                        </div>

                        <!-- 内容显示区 -->
                        <div class="qr-icon-content">

                            <!-- A. 内置图标面板 -->
                            <div id="${Constants.ID_PANEL_BUILTIN}" class="qr-icon-panel active">
                                <!-- 修改方向为 row，添加垂直居中 -->
                                <div style="display:flex; flex-direction:row; gap:5px; align-items:center;">
									<label style="font-weight:bold; min-width: 70px;" data-i18n="qra_label_btn_icon">按钮图标:</label>
                                    <select id="${Constants.ID_BUILTIN_DROPDOWN}" class="text_pole" style="flex:1;">
                                        <option value="${Constants.ICON_TYPES.ROCKET}" data-i18n="qra_icon_rocket">小火箭</option>
                                        <option value="${Constants.ICON_TYPES.BOLT}" data-i18n="qra_icon_bolt">六芒星</option>
                                        <option value="${Constants.ICON_TYPES.COMMENT}" data-i18n="qra_icon_comment">调色盘</option>
                                        <option value="${Constants.ICON_TYPES.STAR}" data-i18n="qra_icon_star">星月</option>
                                        <option value="${Constants.ICON_TYPES.FAN}" data-i18n="qra_icon_fan">风车</option>
                                        <option value="${Constants.ICON_TYPES.PENCIL}" data-i18n="qra_icon_pencil">小铅笔</option>
                                        <option value="${Constants.ICON_TYPES.BOOK}" data-i18n="qra_icon_book">书本</option>
                                        <option value="${Constants.ICON_TYPES.MUG}" data-i18n="qra_icon_mug">热咖啡</option>
                                        <option value="${Constants.ICON_TYPES.CROWN}" data-i18n="qra_icon_crown">皇冠</option>
                                        <option value="${Constants.ICON_TYPES.GEM}" data-i18n="qra_icon_gem">钻石</option>
                                        <option value="${Constants.ICON_TYPES.HEADPHONES}" data-i18n="qra_icon_headphones">耳机</option>
                                    </select>
                                </div>
                                <div class="qr-icon-preview-box" id="${Constants.ID_BUILTIN_PREVIEW}">
                                    <!-- JS 填充 -->
                                    <i class="fa-solid fa-star-and-crescent"></i>
                                    <span class="qr-icon-preview-label" data-i18n="qra_label_preview">预览</span>
                                </div>
                                <!-- 图标大小控制 -->
                                <div style="display:flex; flex-direction:column; gap:5px;">
                                    <div style="display:flex; flex-direction:row; gap:5px; align-items:center;">
                                        <label style="font-weight:bold; min-width: 70px;" data-i18n="qra_label_icon_size">图标大小:</label>
                                        <select id="${Constants.ID_BUILTIN_SIZE_SELECT}" class="text_pole" style="flex:1;">
                                            <option value="match" data-i18n="qra_opt_size_match">与发送按钮保持一致大小</option>
                                            <option value="custom" data-i18n="qra_opt_size_custom">自定义内置图标大小</option>
                                        </select>
                                    </div>
                                    <div id="${Constants.ID_BUILTIN_SIZE_INPUT}-wrapper" style="display:none; flex-direction:row; gap:5px; align-items:center;">
                                        <label style="font-weight:bold; min-width: 70px;" data-i18n="qra_label_size_em">大小 (em):</label>
                                        <input type="number" id="${Constants.ID_BUILTIN_SIZE_INPUT}" class="text_pole" style="flex:1;" step="0.1" min="0.1" placeholder="例如: 1.5">
                                    </div>
                                </div>
                            </div>

                            <!-- A2. 当前角色卡面板 -->
                            <div id="${Constants.ID_PANEL_CHARACTER}" class="qr-icon-panel">
                                <p style="text-align:center; opacity:0.6; font-size:13px; margin:0;" data-i18n="qra_char_desc">显示当前聊天角色的头像作为按钮图标，切换聊天时自动更新</p>
                                <div class="qr-icon-preview-box" id="${Constants.ID_PANEL_CHARACTER}-preview">
                                    <span data-i18n="qra_char_no_avatar">无角色头像</span>
                                    <span class="qr-icon-preview-label" data-i18n="qra_label_preview">预览</span>
                                </div>
                                <!-- 头像旋转控制开关 -->
                                <div style="margin-top: 15px; border-top: 1px solid var(--SmartThemeBorderColor, rgba(255,255,255,0.1)); padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-size: 13px;" data-i18n="qra_char_avatar_rotation">开启头像旋转动画</span>
                                    <label class="qr-toggle">
                                        <input type="checkbox" id="qr-toggle-avatar-rotation">
                                        <span class="qr-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <!-- B. 自定义图标面板 -->
                            <div id="${Constants.ID_PANEL_CUSTOM}" class="qr-icon-panel">
                                <!-- 修改方向为 row，添加垂直居中 -->
                                <div style="display:flex; flex-direction:row; gap:5px; align-items:center;">
                                <label style="font-weight:bold; min-width: 70px;" data-i18n="qra_label_btn_icon">按钮图标:</label>
                                    <select id="${Constants.ID_CUSTOM_DROPDOWN}" class="text_pole" style="flex:1;">
                                        <option value="" data-i18n="qra_custom_placeholder">-- 请选择或新增 --</option>
                                    </select>
                                </div>

                                <div class="qr-icon-preview-box" id="${Constants.ID_CUSTOM_PREVIEW}">
                                    <span data-i18n="qra_custom_no_icon">无图标</span>
                                    <span class="qr-icon-preview-label" data-i18n="qra_label_preview">预览</span>
                                </div>

                                <div class="qr-icon-actions">
                                    <button id="${Constants.ID_BTN_MANAGE_CUSTOM}" class="menu_button">
                                        <i class="fa-solid fa-list"></i> <span data-i18n="qra_btn_manage_icons">管理图标</span>
                                    </button>
                                    <button id="${Constants.ID_BTN_ADD_CUSTOM}" class="menu_button">
                                        <i class="fa-solid fa-plus"></i> <span data-i18n="qra_btn_add_icon">新增图标</span>
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
            // 获取大小，如果没有则显示默认 1.2
            const sizeDisplay = icon.size || '1.2';

            listHtml += `
            <div class="qr-manage-item" data-index="${index}">
                <!-- 图标预览 -->
                <img src="${icon.url}" onerror="this.src=''">

                <!-- 名称与详情区域 -->
                <div style="flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center;">
                    <span class="qr-manage-name" title="${icon.name}" style="font-weight:bold; font-size:14px;">${icon.name}</span>
                </div>

                <!-- 操作按钮 -->
                <div class="qr-manage-actions">
                    <!-- 改为调用 editIcon -->
                    <button class="qr-icon-btn edit" title="${translate('编辑', 'qra_title_edit')}" onclick="window.quickReplyMenu.editIcon(${index})">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="qr-icon-btn delete" title="${translate('删除', 'qra_title_delete')}" onclick="window.quickReplyMenu.deleteIcon(${index})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>`;
        });
    } else {
        listHtml = `<div style="text-align:center; padding:20px; color:#888;" data-i18n="qra_no_saved_icons">暂无保存的图标</div>`;
    }

    return `
    <div class="qr-modal-box" id="${Constants.ID_MODAL_MANAGE}">
        <div class="qr-modal-header" data-i18n="qra_modal_manage_title">管理自定义图标</div>
        <div class="qr-manage-list" id="${Constants.ID_LIST_MANAGE}">
            ${listHtml}
        </div>
        <div class="qr-modal-footer">
            <button id="${Constants.ID_BTN_CLOSE_MANAGE}" class="menu_button" data-i18n="qra_btn_close">关闭</button>
        </div>
    </div>`;
}

function createAddModalHtml() {
    return `
    <div class="qr-modal-box" id="${Constants.ID_MODAL_ADD}">
        <div class="qr-modal-header" data-i18n="qra_modal_add_title">新增自定义图标</div>

        <div class="qr-input-group">
            <label data-i18n="qra_label_name">名称:</label>
            <input type="text" id="${Constants.ID_INPUT_ADD_NAME}" class="text_pole" placeholder="例如: 派蒙" data-i18n="[placeholder]qra_placeholder_name">
        </div>

        <div class="qr-input-group">
            <div style="display:flex; justify-content:space-between;">
                <label data-i18n="qra_label_icon_url">图标 URL:</label>
                <a href="https://catbox.moe/" target="_blank" class="qr-upload-link" title="前往 Catbox 上传图片">
                    <i class="fa-solid fa-cloud-arrow-up"></i> <span data-i18n="qra_link_image_host">免费图床</span>
                </a>
            </div>
            <input type="text" id="${Constants.ID_INPUT_ADD_URL}" class="text_pole" placeholder="输入图片的图床链接" data-i18n="[placeholder]qra_placeholder_url">
        </div>

        <div class="qr-input-group">
            <label data-i18n="qra_label_icon_size_hint">图标大小 (默认值1.2表示与发送按钮保持一致大小。因此非必要请不要修改该值，除非您确实想要强制调大或调小该图标):</label>
            <input type="number" id="${Constants.ID_INPUT_ADD_SIZE}" class="text_pole" value="1.2" step="0.1" min="0.1" placeholder="例如: 1.2">
        </div>

        <div class="qr-input-group">
            <label data-i18n="qra_label_preview">预览:</label>
            <div class="qr-icon-preview-box" id="${Constants.ID_PREVIEW_ADD}" style="min-height:80px; font-size:1.5em;">
                <span>Wait...</span>
            </div>
        </div>

        <div class="qr-modal-footer">
            <button id="${Constants.ID_BTN_SAVE_NEW}" class="menu_button primary" data-i18n="qra_btn_save">保存</button>
            <button class="menu_button" onclick="document.getElementById('${Constants.ID_MODAL_OVERLAY}').classList.remove('visible')" data-i18n="qra_btn_cancel">取消</button>
        </div>
    </div>`;
}

function createEditModalHtml(icon) {
    // 复用 Constants 中的 ID，因为弹窗是互斥的，不会冲突
    return `
    <div class="qr-modal-box" id="${Constants.ID_MODAL_ADD}">
        <div class="qr-modal-header" data-i18n="qra_modal_edit_title">编辑图标</div>

        <div class="qr-input-group">
            <label data-i18n="qra_label_name">名称:</label>
            <input type="text" id="${Constants.ID_INPUT_ADD_NAME}" class="text_pole" value="${icon.name}">
        </div>

        <div class="qr-input-group">
            <div style="display:flex; justify-content:space-between;">
                <label data-i18n="qra_label_icon_url">图标 URL:</label>
            </div>
            <input type="text" id="${Constants.ID_INPUT_ADD_URL}" class="text_pole" value="${icon.url}">
        </div>

        <div class="qr-input-group">
            <label data-i18n="qra_label_icon_size_hint">图标大小 (默认值1.2表示与发送按钮保持一致大小。因此非必要请不要修改该值，除非您确实想要强制调大或调小该图标):</label>
            <input type="number" id="${Constants.ID_INPUT_ADD_SIZE}" class="text_pole" value="${icon.size || '1.2'}" step="0.1" min="0.1">
        </div>

        <div class="qr-input-group">
            <label data-i18n="qra_label_preview">预览:</label>
            <div class="qr-icon-preview-box" id="${Constants.ID_PREVIEW_ADD}" style="min-height:80px; font-size:1.5em;">
                <img src="${icon.url}" style="height: ${icon.size || '1.2'}em;">
            </div>
        </div>

        <div class="qr-modal-footer">
            <button id="qr-btn-save-edit" class="menu_button primary" data-i18n="qra_btn_save_changes">保存修改</button>
            <button id="qr-btn-cancel-edit" class="menu_button" data-i18n="qra_btn_back">返回</button>
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
        settings._builtinIconType = val;
        updateBuiltinPreview(val);
    }
    else if (id === Constants.ID_BUILTIN_SIZE_SELECT) {
        const isCustom = val === 'custom';
        const inputWrapper = document.getElementById(`${Constants.ID_BUILTIN_SIZE_INPUT}-wrapper`);
        const sizeInput = document.getElementById(Constants.ID_BUILTIN_SIZE_INPUT);

        if (inputWrapper) {
            inputWrapper.style.display = isCustom ? 'flex' : 'none';
        }

        if (!isCustom) {
            // 切回"与发送按钮保持一致"，备份自定义值到 _customSize
            const existingSize = parseFloat(settings.builtinIconSize);
            if (!isNaN(existingSize) && existingSize > 0) {
                settings._customIconSize = settings.builtinIconSize;
            }
            settings.builtinIconSize = 'match';
            if (sizeInput) sizeInput.value = '';
        } else {
            // 切换到自定义：优先恢复之前备份的自定义值
            const savedCustom = parseFloat(settings._customIconSize);
            if (!isNaN(savedCustom) && savedCustom > 0) {
                settings.builtinIconSize = settings._customIconSize;
                if (sizeInput) sizeInput.value = settings._customIconSize;
            } else {
                const existingSize = parseFloat(settings.builtinIconSize);
                if (!isNaN(existingSize) && existingSize > 0) {
                    if (sizeInput) sizeInput.value = settings.builtinIconSize;
                } else {
                    if (sizeInput) sizeInput.value = '1.2';
                    settings.builtinIconSize = '1.2';
                }
            }
        }
        updateBuiltinPreview(settings.iconType);
    }
    else if (id === Constants.ID_BUILTIN_SIZE_INPUT) {
        const sizeSelect = document.getElementById(Constants.ID_BUILTIN_SIZE_SELECT);
        if (sizeSelect && sizeSelect.value !== 'custom') return; // 仅在自定义模式下响应

        const numVal = parseFloat(val);
        if (!isNaN(numVal) && numVal > 0) {
            settings.builtinIconSize = val;
        } else {
            // 无效输入（负数、0、字母、空），回退到 match
            settings.builtinIconSize = 'match';
            if (sizeSelect) sizeSelect.value = 'match';
            const inputWrapper = document.getElementById(`${Constants.ID_BUILTIN_SIZE_INPUT}-wrapper`);
            if (inputWrapper) inputWrapper.style.display = 'none';
        }
        updateBuiltinPreview(settings.iconType);
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
    else if (id === Constants.ID_COMBINED_BUTTONS_CHECKBOX) {
        if (window.quickReplyApi && window.quickReplyApi.settings) {
            window.quickReplyApi.settings.isCombined = event.target.checked;
            window.quickReplyApi.settings.save();
            const origCheckbox = document.getElementById('qr--isCombined');
            if (origCheckbox) {
                origCheckbox.checked = event.target.checked;
            }
        }
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
        Logger.warn(LogCategory.SYSTEM, '保存设置函数未找到');
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

    const combinedCheck = document.getElementById(Constants.ID_COMBINED_BUTTONS_CHECKBOX);
    if (combinedCheck) {
        combinedCheck.checked = window.quickReplyApi?.settings?.isCombined || false;
    }

    // --- 新 UI 初始化 ---
    refreshCustomDropdown();

    const isCustom = settings.iconType === Constants.ICON_TYPES.CUSTOM;
    const isCharacter = settings.iconType === Constants.ICON_TYPES.CHARACTER_CARD;
    const isBuiltin = !isCustom && !isCharacter;
    const sourceSelect = document.getElementById(Constants.ID_ICON_SOURCE_SELECT);
    const panelBuiltin = document.getElementById(Constants.ID_PANEL_BUILTIN);
    const panelCustom = document.getElementById(Constants.ID_PANEL_CUSTOM);
    const panelCharacter = document.getElementById(Constants.ID_PANEL_CHARACTER);

    // 设置下拉框值并切换面板
    if (sourceSelect) sourceSelect.value = isCustom ? 'custom' : isCharacter ? 'character' : 'builtin';

    // 始终恢复所有面板的 DOM 状态，确保切换回来时不会丢失配置
    // 恢复内置图标面板状态
    const builtinIconType = settings._builtinIconType || (isBuiltin ? settings.iconType : Constants.ICON_TYPES.STAR);
    const ddBuiltin = document.getElementById(Constants.ID_BUILTIN_DROPDOWN);
    if(ddBuiltin) ddBuiltin.value = builtinIconType;

    // 恢复内置图标大小设置
    const sizeSelect = document.getElementById(Constants.ID_BUILTIN_SIZE_SELECT);
    const sizeInput = document.getElementById(Constants.ID_BUILTIN_SIZE_INPUT);
    const sizeInputWrapper = document.getElementById(`${Constants.ID_BUILTIN_SIZE_INPUT}-wrapper`);
    const sizeMode = settings.builtinIconSize || 'match';

    if (sizeMode === 'match') {
        if (sizeSelect) sizeSelect.value = 'match';
        if (sizeInput) sizeInput.value = '';
        if (sizeInputWrapper) sizeInputWrapper.style.display = 'none';
    } else {
        if (sizeSelect) sizeSelect.value = 'custom';
        if (sizeInput) sizeInput.value = sizeMode;
        if (sizeInputWrapper) sizeInputWrapper.style.display = 'flex';
    }

    updateBuiltinPreview(builtinIconType);

    // 显示当前激活的面板
    if (isCustom) {
        if(panelCustom) panelCustom.classList.add('active');
        if(panelBuiltin) panelBuiltin.classList.remove('active');
        if(panelCharacter) panelCharacter.classList.remove('active');
        updateCustomPreview(settings.customIconUrl);
    } else if (isCharacter) {
        if(panelCharacter) panelCharacter.classList.add('active');
        if(panelBuiltin) panelBuiltin.classList.remove('active');
        if(panelCustom) panelCustom.classList.remove('active');
        updateCharacterPreview();
    } else {
        if(panelBuiltin) panelBuiltin.classList.add('active');
        if(panelCustom) panelCustom.classList.remove('active');
        if(panelCharacter) panelCharacter.classList.remove('active');
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

    // --- 应用日志级别设置 ---
    // 默认为 1 (INFO)，兼容旧配置文件
    const savedLevel = settings.logLevel !== undefined ? settings.logLevel : 1;

    // 1. 应用到 Logger 系统
    Logger.setLevel(savedLevel);

    // 2. 回显到 UI 下拉框
    const logSelect = document.getElementById('qr-log-level-select');
    if (logSelect) {
        logSelect.value = savedLevel;
    }

    // 恢复头像旋转开关状态
    const toggleAvatarRotation = document.getElementById('qr-toggle-avatar-rotation');
    if (toggleAvatarRotation) {
        toggleAvatarRotation.checked = settings.enableAvatarRotation || false;
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
            // 如果是角色任务集，使用统一 ID，并显示特定名称
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
        else if(r.source === 'RawDomElement') {
            // 原生第三方按钮的白名单 ID 直接使用它们的 domId
            id = r.domId; // 即 pt-wb-common-button 或 zero-preset-btn
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
        } else {
            // 给第三方原生插件按钮一个统一的"拼图"图标
            iconHtml = '<i class="fa-solid fa-puzzle-piece" title="Third Party"></i>';
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
        else if (id === 'pt-wb-common-button' || id === 'zero-preset-btn') {
            source = 'RawDomElement';
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
            // 重置标记，防止 isTouchAction 永久为 true 导致后续 mouseenter 被屏蔽
            setTimeout(() => { isTouchAction = false; }, 500);
        }, { passive: true });

        if(settings.whitelist.includes(id)) wlList.appendChild(div);
        else nonList.appendChild(div);
    });

    attachScrollListener(nonList);
    attachScrollListener(wlList);

    // 容器级别兜底：鼠标离开列表区域时强制隐藏 tooltip
    nonList.addEventListener('mouseleave', hideTooltip);
    wlList.addEventListener('mouseleave', hideTooltip);
}

export function setupEventListeners() {
    const bind = (id, handler) => document.getElementById(id)?.addEventListener('change', handler);

    bind(Constants.ID_SETTINGS_ENABLED_DROPDOWN, handleSettingsChange);
    bind(Constants.ID_AUTO_SHRINK_CHECKBOX, handleSettingsChange);
    bind(Constants.ID_BACKDROP_ENABLED_CHECKBOX, handleSettingsChange);
    bind(Constants.ID_COMBINED_BUTTONS_CHECKBOX, handleSettingsChange);
    bind(Constants.ID_UI_THEME_DROPDOWN, handleSettingsChange);

    // --- 图标设置新界面监听 ---
    const sourceSelect = document.getElementById(Constants.ID_ICON_SOURCE_SELECT);
    const panelBuiltin = document.getElementById(Constants.ID_PANEL_BUILTIN);
    const panelCustom = document.getElementById(Constants.ID_PANEL_CUSTOM);

    if (sourceSelect) {
        sourceSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            const isCustom = val === 'custom';
            const isCharacter = val === 'character';
            const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];

            const panelCharacter = document.getElementById(Constants.ID_PANEL_CHARACTER);

            if (isCustom) {
                // 切换前保存当前内置图标快照（如果当前是内置图标模式）
                if (settings.iconType !== Constants.ICON_TYPES.CUSTOM && settings.iconType !== Constants.ICON_TYPES.CHARACTER_CARD) {
                    settings._builtinIconType = settings.iconType;
                }
                panelCustom.classList.add('active');
                panelBuiltin.classList.remove('active');
                if (panelCharacter) panelCharacter.classList.remove('active');
                settings.iconType = Constants.ICON_TYPES.CUSTOM;

                // 自动选中第一个自定义图标（如果有且未选）
                if (!settings.customIconUrl && settings.savedCustomIcons?.length > 0) {
                    settings.customIconUrl = settings.savedCustomIcons[0].url;
                    const dd = document.getElementById(Constants.ID_CUSTOM_DROPDOWN);
                    if(dd) dd.value = settings.customIconUrl;
                }
            } else if (isCharacter) {
                // 切换前保存当前内置图标快照（如果当前是内置图标模式）
                if (settings.iconType !== Constants.ICON_TYPES.CUSTOM && settings.iconType !== Constants.ICON_TYPES.CHARACTER_CARD) {
                    settings._builtinIconType = settings.iconType;
                }
                if (panelCharacter) panelCharacter.classList.add('active');
                panelBuiltin.classList.remove('active');
                panelCustom.classList.remove('active');
                settings.iconType = Constants.ICON_TYPES.CHARACTER_CARD;
                updateCharacterPreview();
            } else {
                panelBuiltin.classList.add('active');
                panelCustom.classList.remove('active');
                if (panelCharacter) panelCharacter.classList.remove('active');

                // 从保存的快照恢复内置图标类型
                settings.iconType = settings._builtinIconType || Constants.ICON_TYPES.STAR;
            }
            saveSettings();
            updateIconDisplay();
        });
    }

    bind(Constants.ID_BUILTIN_DROPDOWN, handleSettingsChange);
    bind(Constants.ID_BUILTIN_SIZE_SELECT, handleSettingsChange);
    bind(Constants.ID_BUILTIN_SIZE_INPUT, handleSettingsChange);
    bind(Constants.ID_CUSTOM_DROPDOWN, handleSettingsChange);

    const btnManage = document.getElementById(Constants.ID_BTN_MANAGE_CUSTOM);
    if (btnManage) btnManage.onclick = openManageModal;

    const btnAdd = document.getElementById(Constants.ID_BTN_ADD_CUSTOM);
    if (btnAdd) btnAdd.onclick = openAddModal;

    // 移除旧的白名单按钮监听 (ID_WHITELIST_BUTTON 已不存在)

    // 白名单 TAB 点击事件
    const wlTab = document.getElementById(Constants.ID_TAB_WHITELIST);
    if (wlTab) {
        wlTab.addEventListener('click', () => {
            // 切换到白名单页面时刷新数据
            populateWhitelistManagementUI();
        });
    }

    // 使用说明按钮点击事件
    const helpBtn = document.getElementById(Constants.ID_BTN_OPEN_HELP);
    if (helpBtn) {
        helpBtn.onclick = () => {
             openHelpModal();
        };
    }

    // 排序设置按钮点击事件
    const sortBtn = document.getElementById(Constants.ID_BTN_OPEN_SORT);
    if (sortBtn) {
        sortBtn.onclick = () => {
             openSortModal();
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
                btn.textContent = translate("检测中...", 'qra_checking');
                await refreshUpdateUI(true);
                const isUpdated = btn.classList.contains('has-update');
                if (!isUpdated) btn.textContent = translate("已是最新", 'qra_up_to_date');
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

    // 初始化日志设置
    initLogSettings();

    // 头像旋转开关事件
    const toggleAvatarRotation = document.getElementById('qr-toggle-avatar-rotation');
    if (toggleAvatarRotation) {
        toggleAvatarRotation.addEventListener('change', (e) => {
            const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
            settings.enableAvatarRotation = e.target.checked;
            saveSettings();
        });
    }

    // 监听原生 QR v2 合并开关的改动，实现反向双向同步
    document.body.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'qr--isCombined') {
            const combinedCheck = document.getElementById(Constants.ID_COMBINED_BUTTONS_CHECKBOX);
            if (combinedCheck) {
                combinedCheck.checked = e.target.checked;
            }
        }
    });
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
export function updateBuiltinPreview(type) {
    const el = document.getElementById(Constants.ID_BUILTIN_PREVIEW);
    if(!el) return;
    const iconClass = Constants.ICON_CLASS_MAP[type] || 'fa-star-and-crescent';

    const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
    const sizeMode = settings.builtinIconSize || 'match';

    let sizeStyle = '';
    if (sizeMode !== 'match') {
        const numVal = parseFloat(sizeMode);
        if (!isNaN(numVal) && numVal > 0) {
            sizeStyle = `font-size: ${sizeMode}em;`;
        }
    }

    el.innerHTML = `<i class="fa-solid ${iconClass}" style="${sizeStyle}"></i><span class="qr-icon-preview-label" data-i18n="qra_label_preview">预览</span>`;
}

function updateCustomPreview(url) {
    const el = document.getElementById(Constants.ID_CUSTOM_PREVIEW);
    if(!el) return;
    if (url) {
        el.innerHTML = `<img src="${url}"><span class="qr-icon-preview-label" data-i18n="qra_label_preview">预览</span>`;
    } else {
        el.innerHTML = `<span data-i18n="qra_custom_no_icon">无</span><span class="qr-icon-preview-label" data-i18n="qra_label_preview">预览</span>`;
    }
}

export function updateCharacterPreview() {
    const el = document.getElementById(`${Constants.ID_PANEL_CHARACTER}-preview`);
    if (!el) return;
    const avatarImg = document.querySelector("#avatar_load_preview");
    if (avatarImg && avatarImg.src) {
        el.innerHTML = `<img src="${avatarImg.src}" class="qr-character-preview-avatar"><span class="qr-icon-preview-label" data-i18n="qra_label_preview">预览</span>`;
    } else {
        el.innerHTML = `<span data-i18n="qra_char_no_avatar">无角色头像</span><span class="qr-icon-preview-label" data-i18n="qra_label_preview">预览</span>`;
    }
}

// --- 弹窗逻辑 ---
function openManageModal() {
    const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
    const overlay = document.getElementById(Constants.ID_MODAL_OVERLAY);

    // 渲染管理列表
    overlay.innerHTML = createManageModalHtml(settings.savedCustomIcons);
    overlay.classList.add('visible');

    // 关闭按钮
    document.getElementById(Constants.ID_BTN_CLOSE_MANAGE).onclick = () => {
        overlay.classList.remove('visible');
        refreshCustomDropdown(); // 关闭时刷新一下外面的下拉框
    };

    // --- 删除逻辑 ---
    window.quickReplyMenu.deleteIcon = (index) => {
        if(!confirm(translate('确定删除这个图标吗？', 'qra_confirm_delete_icon'))) return;

        // 如果删除的是当前正在使用的图标，重置为默认
        const deletedUrl = settings.savedCustomIcons[index].url;
        if (settings.customIconUrl === deletedUrl) {
            settings.customIconUrl = '';
            // 可选：重置为星标
            // settings.iconType = Constants.ICON_TYPES.STAR;
            updateIconDisplay();
        }

        settings.savedCustomIcons.splice(index, 1);
        saveSettings();
        openManageModal(); // 重新渲染列表
    };

    // --- 编辑逻辑 ---
    window.quickReplyMenu.editIcon = (index) => {
        const icon = settings.savedCustomIcons[index];
        if (!icon) return;

        // 1. 渲染编辑界面覆盖当前弹窗
        overlay.innerHTML = createEditModalHtml(icon);

        // 2. 绑定预览逻辑 (与新增逻辑一致)
        const inputUrl = document.getElementById(Constants.ID_INPUT_ADD_URL);
        const inputSize = document.getElementById(Constants.ID_INPUT_ADD_SIZE);
        const previewBox = document.getElementById(Constants.ID_PREVIEW_ADD);

        const updatePreview = () => {
             const u = inputUrl.value.trim();
             const s = inputSize.value || '1.2';
             if (u) {
                 previewBox.innerHTML = `<img src="${u}" style="max-width:80%; max-height:80%; height: ${s}em;">`;
             }
        };
        inputUrl.addEventListener('input', updatePreview);
        inputSize.addEventListener('input', updatePreview);

        // 3. 绑定"返回"按钮 (回到管理列表)
        document.getElementById('qr-btn-cancel-edit').onclick = () => {
            openManageModal();
        };

        // 4. 绑定"保存"按钮
        document.getElementById('qr-btn-save-edit').onclick = () => {
            const newName = document.getElementById(Constants.ID_INPUT_ADD_NAME).value.trim();
            const newUrl = inputUrl.value.trim();
            const newSize = inputSize.value;

            if (newName && newUrl) {
                // 更新数据
                settings.savedCustomIcons[index] = {
                    name: newName,
                    url: newUrl,
                    size: newSize
                };

                // 如果修改的是当前正在使用的图标，需要实时更新主界面
                // 只要 URL 没变，或者 URL 变了且等于当前选中的 URL (这句逻辑主要是为了覆盖 url 修改的情况)
                if (settings.iconType === Constants.ICON_TYPES.CUSTOM) {
                     // 简单粗暴：如果 URL 匹配旧的，更新为新的
                     if (settings.customIconUrl === icon.url) {
                         settings.customIconUrl = newUrl;
                     }
                     // 无论如何，只要是自定义模式，都触发一次图标刷新，确保 Size 变化被应用
                     if (settings.customIconUrl === newUrl) {
                         updateIconDisplay();
                     }
                }

                saveSettings();
                openManageModal(); // 保存后回到管理列表
            } else {
                alert(translate("名称和链接不能为空", 'qra_alert_name_url_required'));
            }
        };
    };
}

function openAddModal() {
    const overlay = document.getElementById(Constants.ID_MODAL_OVERLAY);
    overlay.innerHTML = createAddModalHtml();
    overlay.classList.add('visible');

    const inputUrl = document.getElementById(Constants.ID_INPUT_ADD_URL);
    const inputName = document.getElementById(Constants.ID_INPUT_ADD_NAME);
    const inputSize = document.getElementById(Constants.ID_INPUT_ADD_SIZE);
    const preview = document.getElementById(Constants.ID_PREVIEW_ADD);

    // 封装更新预览函数
    const updatePreview = () => {
        const url = inputUrl.value.trim();
        const size = inputSize.value || '1.2';
        if (url) {
            preview.innerHTML = `<img src="${url}" style="max-width:80%; max-height:80%; height: ${size}em;">`;
        } else {
            preview.innerHTML = '<span>Wait...</span>';
        }
    };

    // 实时预览监听
    inputUrl.addEventListener('input', updatePreview);
    inputSize.addEventListener('input', updatePreview);

    document.getElementById(Constants.ID_BTN_SAVE_NEW).onclick = () => {
        const url = inputUrl.value.trim();
        const name = inputName.value.trim() || translate('未命名图标', 'qra_unnamed_icon');
        const size = inputSize.value || '1.2';

        if (!url) {
            alert(translate('请输入图标链接', 'qra_alert_url_required'));
            return;
        }

        const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
        if (!settings.savedCustomIcons) settings.savedCustomIcons = [];

        settings.savedCustomIcons.push({ name, url, size });
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

    dd.innerHTML = `<option value="">${translate('-- 请选择 --', 'qra_custom_select')}</option>`;
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

function createHelpModalHtml() {
    const lang = getCurrentLocale();
    const content = helpDocs[lang] || helpDocs['en'] || helpDocs['zh-cn'];

    return `
    <div class="qr-modal-box qr-help-mode" id="${Constants.ID_MODAL_HELP}">
        <!-- 1. 头部 -->
        <div class="qr-help-header">
            <div class="qr-help-header-left">
                <button class="qr-help-sidebar-toggle" id="${Constants.ID_BTN_TOGGLE_SIDEBAR}" title="${translate('目录', 'qra_title_toc')}">
                    <i class="fa-solid fa-bars"></i>
                </button>
                <span data-i18n="qra_help_title">QR助手 使用说明</span>
            </div>
            <button class="qr-help-close-btn" onclick="document.getElementById('${Constants.ID_MODAL_OVERLAY}').classList.remove('visible')">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>

        <!-- 2. 双栏布局区 -->
        <div class="qr-help-split-layout">
            <!-- 左侧目录 -->
            <div class="qr-help-sidebar">
                <div class="qr-toc-item active" data-target="help-video" data-i18n="qra_help_toc_video">视频示例</div>
                <div class="qr-toc-item" data-target="help-core" data-i18n="qra_help_toc_core">核心功能</div>
                <div class="qr-toc-item" data-target="help-detail" data-i18n="qra_help_toc_detail">具体功能</div>
                <div class="qr-toc-item sub" data-target="help-whitelist" data-i18n="qra_help_toc_whitelist">白名单</div>
                <div class="qr-toc-item sub" data-target="help-icons" data-i18n="qra_help_toc_icons">按钮图标</div>
                <div class="qr-toc-item sub" data-target="help-theme" data-i18n="qra_help_toc_theme">UI 主题</div>
                <div class="qr-toc-item sub" data-target="help-sort" data-i18n="qra_help_toc_sort">菜单按钮排序</div>
                <div class="qr-toc-item sub" data-target="help-others" data-i18n="qra_help_toc_others">其他功能</div>
                <div class="qr-toc-item sub" data-target="help-compat" data-i18n="qra_help_toc_compat">兼容其他插件</div>
                <div class="qr-toc-item sub" data-target="help-update" data-i18n="qra_help_toc_update">检测更新</div>
            </div>

            <!-- 右侧正文 -->
            <div class="qr-help-content" id="qr-help-scroll-view">
                ${content}
            </div>
        </div>
    </div>`;
}

function openHelpModal() {
    const overlay = document.getElementById(Constants.ID_MODAL_OVERLAY);
    if (!overlay) return;

    overlay.innerHTML = createHelpModalHtml();
    overlay.classList.add('visible');

    const splitLayout = overlay.querySelector('.qr-help-split-layout');
    const sidebar = overlay.querySelector('.qr-help-sidebar');
    const toggleBtn = document.getElementById(Constants.ID_BTN_TOGGLE_SIDEBAR);

    // 绑定侧边栏收缩/展开按钮
    if (toggleBtn && splitLayout) {
        toggleBtn.addEventListener('click', () => {
            splitLayout.classList.toggle('qr-sidebar-open');
        });
        // 点击正文区域关闭侧边栏（移动端）
        const content = overlay.querySelector('.qr-help-content');
        if (content) {
            content.addEventListener('click', () => {
                splitLayout.classList.remove('qr-sidebar-open');
            });
        }
    }

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

            // 移动端点击目录项后自动关闭侧边栏
            if (splitLayout) {
                splitLayout.classList.remove('qr-sidebar-open');
            }
        });
    });

    // 滚动联动：滚动正文时自动高亮对应的目录项
    if (scrollView) {
        scrollView.addEventListener('scroll', () => {
            const scrollTop = scrollView.scrollTop;
            const targets = Array.from(items).map(item => {
                const el = document.getElementById(item.getAttribute('data-target'));
                return el ? { item, offsetTop: el.offsetTop - scrollView.offsetTop } : null;
            }).filter(Boolean);

            // 找到当前滚动位置对应的最后一个可见章节
            let activeItem = targets[0]?.item;
            for (const t of targets) {
                if (scrollTop >= t.offsetTop - 20) {
                    activeItem = t.item;
                }
            }

            if (activeItem && !activeItem.classList.contains('active')) {
                items.forEach(i => i.classList.remove('active'));
                activeItem.classList.add('active');
            }
        });
    }
}

// --- 更新日志弹窗 ---
function createChangelogModalHtml(changelogText) {
    return `
    <div class="qr-modal-box" id="${Constants.ID_MODAL_UPDATE}">
        <div class="qr-modal-header" data-i18n="qra_modal_update_title">插件更新日志</div>
        <div class="qr-changelog-viewer" id="${Constants.ID_CHANGELOG_CONTENT}">${changelogText}</div>
        <div class="qr-update-tip" data-i18n="qra_update_tip">如果更新失败，可以在酒馆扩展页面的【管理扩展程序】列表中手动更新QR助手。如果依然更新失败，则可以尝试删除重装来使用最新版本插件。</div>
        <div class="qr-modal-footer">
            <button id="${Constants.ID_BTN_CONFIRM_UPDATE}" class="menu_button primary" data-i18n="qra_btn_update_now">立即更新</button>
            <button class="menu_button" onclick="document.getElementById('${Constants.ID_MODAL_OVERLAY}').classList.remove('visible')" data-i18n="qra_btn_cancel">取消</button>
        </div>
    </div>`;
}

async function showUpdateModal() {
    const overlay = document.getElementById(Constants.ID_MODAL_OVERLAY);
    // 先显示 Loading
    overlay.innerHTML = `<div class="qr-modal-box" style="text-align:center; padding:30px;">${translate("Loading changelog...", 'qra_loading_changelog')}</div>`;
    overlay.classList.add('visible');

    const changelog = await getChangelog();

    // 简单的 Markdown 渲染 (只处理换行和简单的标题，或者直接依赖 ST 的 markdown 渲染器如果可用)
    // 这里简单转义 HTML 即可，保持纯文本显示最稳妥，或者简单替换换行
    const safeLog = changelog.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    overlay.innerHTML = createChangelogModalHtml(safeLog);

    const btnUpdate = document.getElementById(Constants.ID_BTN_CONFIRM_UPDATE);
    if (btnUpdate) {
        btnUpdate.onclick = async () => {
            if (confirm(translate('更新操作将刷新页面，请确保已保存对话。\n确定更新吗？', 'qra_confirm_update'))) {
                btnUpdate.disabled = true;
                btnUpdate.textContent = translate("更新中...", 'qra_checking');
                try {
                    const res = await performUpdate();
                    if (res.ok) {
                        alert(translate('更新指令已发送，页面即将刷新。', 'qra_alert_update_sent'));
                        setTimeout(() => location.reload(), 2000);
                    } else {
                        alert(translate('更新失败，请查看控制台日志。', 'qra_alert_update_failed'));
                        btnUpdate.disabled = false;
                    }
                } catch (e) {
                    alert(translate('更新请求发生错误: ', 'qra_alert_update_error') + e);
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
    if (force && verDisplay) verDisplay.textContent = translate("检测中...", 'qra_checking');

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
            btn.textContent = translate("发现新版本", 'qra_new_version_found');
            btn.classList.add('has-update');
            btn.title = `最新版本: ${result.latestVersion}`;
        }
    } else {
        if (badge) badge.classList.remove('visible');
        if (btn) {
            // 如果 remote 检查失败，显示提示
            if (result.latestVersion === "Check Failed") {
                btn.textContent = translate("检测失败", 'qra_check_failed');
            } else {
                btn.textContent = translate("检查更新", 'qra_btn_check_update');
            }
            btn.classList.remove('has-update');
            btn.removeAttribute('title');
        }
    }
}

// --- 日志面板功能 ---

/**
 * 生成日志弹窗的 HTML 结构
 */
function createLogModalHtml() {
    return `
    <div class="qr-modal-box" id="${Constants.ID_MODAL_LOG}" style="width: 800px; height: 80vh; max-height: 90vh;">
        <!-- 修改点：添加 flex 布局样式，确保标题在左，按钮组在右 -->
        <div class="qr-modal-header" style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 16px; font-weight: bold;" data-i18n="qra_log_title">运行日志</span>

            <!-- 右侧按钮组容器 -->
            <div style="display: flex; gap: 8px; align-items: center;">
                <button id="${Constants.ID_BTN_COPY_LOG}" class="menu_button qr-log-header-btn" data-i18n="qra_btn_copy">复制</button>
                <button id="${Constants.ID_BTN_DOWNLOAD_LOG}" class="menu_button qr-log-header-btn" data-i18n="qra_btn_download">下载</button>
                <button id="${Constants.ID_BTN_CLEAR_LOG}" class="menu_button qr-log-header-btn" style="color: #d32f2f; border-color: rgba(211, 47, 47, 0.3);" data-i18n="qra_btn_clear">清空</button>

                <!-- 竖线分隔符 -->
                <div style="width: 1px; height: 18px; background: #ccc; margin: 0 6px;"></div>

                <!-- 关闭按钮 -->
                <button class="qr-help-close-btn" onclick="document.getElementById('${Constants.ID_MODAL_OVERLAY}').classList.remove('visible')" title="${translate('关闭', 'qra_title_close')}" style="height: 24px; width: 24px; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-xmark" style="font-size: 18px;"></i>
                </button>
            </div>
        </div>

        <div id="${Constants.ID_LOG_VIEWER}" class="qr-log-viewer"></div>
    </div>`;
}

/**
 * 渲染日志内容到视图
 */
function renderLogsToView(viewerElement) {
    if (!viewerElement) return;

    // 获取当前设置的过滤等级
    const filterLevel = Logger.currentLevel;

    // 修改：先 filter 过滤符合等级的日志，再 map 生成 HTML
    viewerElement.innerHTML = Logger.logs
        .filter(log => log.level >= filterLevel)
        .map(log => {
            let color = '#333';
            let bgStyle = '';

            if (log.level === LogLevel.ERROR) color = '#d32f2f';
            else if (log.level === LogLevel.WARN) color = '#f57c00';
            else if (log.level === LogLevel.DEBUG) color = '#757575';

            if (log.category === 'Core') {
                color = '#7b1fa2';
                bgStyle = 'background: rgba(123, 31, 162, 0.05); border-left: 3px solid #7b1fa2; padding-left: 8px;';
            }

            const timeStr = `<span style="color: #999; margin-right: 8px;">[${log.timestamp.split('T')[1].replace('Z','')}]</span>`;
            const catStr = `<span style="font-weight:bold; color: ${color}; margin-right: 8px;">[${log.category}]</span>`;

            let dataPart = '';
            if (log.data) {
                try {
                    // 如果包含堆栈信息 (由 logger.js 处理过)，显示折叠面板
                    if (log.data.stack) {
                        dataPart = `
                        <div style="margin-top: 4px; font-size: 0.85em; opacity: 0.8;">
                            <details>
                                <summary style="cursor: pointer; text-decoration: underline;">${translate('查看错误堆栈 (Stack Trace)', 'qra_stack_trace')}</summary>
                                <pre style="white-space: pre-wrap; word-break: break-all; background: rgba(0,0,0,0.1); padding: 5px; border-radius: 4px; margin-top: 5px; font-family: monospace;">${log.data.stack}</pre>
                            </details>
                        </div>`;
                    } else {
                        // 普通对象，显示简短的 JSON
                        const jsonStr = JSON.stringify(log.data);
                        // 截断太长的日志防止卡顿
                        const displayStr = jsonStr.length > 200 ? jsonStr.substring(0, 200) + '...' : jsonStr;
                        dataPart = `<div style="margin-top: 2px; font-size: 0.85em; opacity: 0.7; font-family: monospace;">Data: ${displayStr}</div>`;
                    }
                } catch (e) {
                    dataPart = `<div style="color: red;">[Data Render Error]</div>`;
                }
            }

            return `<div style="margin-bottom: 6px; border-bottom: 1px solid #f0f0f0; padding-bottom: 4px; ${bgStyle}">
                ${timeStr}${catStr}<span style="color:${color}">${log.message}</span>
                ${dataPart}
            </div>`;
        }).join('');

    viewerElement.scrollTop = viewerElement.scrollHeight;
}

/**
 * 显示日志弹窗
 */
function showLogModal() {
    const overlay = document.getElementById(Constants.ID_MODAL_OVERLAY);
    if (!overlay) return;

    overlay.innerHTML = createLogModalHtml();
    overlay.classList.add('visible');

    const viewer = document.getElementById(Constants.ID_LOG_VIEWER);
    renderLogsToView(viewer);

    // 绑定事件
    const btnCopy = document.getElementById(Constants.ID_BTN_COPY_LOG);
    if (btnCopy) {
        btnCopy.onclick = () => {
            navigator.clipboard.writeText(Logger.exportLogs()).then(() => {
                const originalText = btnCopy.textContent;
                btnCopy.textContent = translate('已复制!', 'qra_copied');
                setTimeout(() => btnCopy.textContent = originalText, 1500);
            });
        };
    }

    const btnDownload = document.getElementById(Constants.ID_BTN_DOWNLOAD_LOG);
    if (btnDownload) {
        btnDownload.onclick = () => {
            try {
                // 1. 生成 JSON 字符串 (格式化缩进为 2 空格)
                const jsonContent = JSON.stringify(Logger.logs, null, 2);

                // 2. 创建 application/json 类型的 Blob
                const blob = new Blob([jsonContent], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                // 3. 生成文件名: qr_helper_logs_2023-10-27T10-00-00.json
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `qr_helper_logs_${timestamp}.json`;

                // 4. 触发下载
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();

                // 5. 清理
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                Logger.info(LogCategory.SYSTEM, '日志已导出为 JSON 文件');
            } catch (e) {
                Logger.error(LogCategory.SYSTEM, '导出日志失败', e);
                toastr.error(translate('导出日志失败，请查看控制台', 'qra_toastr_export_failed'));
            }
        };
    }

    const btnClear = document.getElementById(Constants.ID_BTN_CLEAR_LOG);
    if (btnClear) {
        btnClear.onclick = () => {
            if (confirm(translate('确定清空所有日志吗？', 'qra_confirm_clear_logs'))) {
                Logger.clear();
                renderLogsToView(viewer);
            }
        };
    }
}

// 初始化日志设置
function initLogSettings() {
    const logLevelSelect = document.getElementById('qr-log-level-select');
    if (logLevelSelect) {
        logLevelSelect.addEventListener('change', (e) => {
            const level = parseInt(e.target.value);

            // 1. 设置运行时级别
            Logger.setLevel(level);

            // 2. 保存到持久化设置
            const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
            settings.logLevel = level;
            saveSettings();

            Logger.info(LogCategory.SYSTEM, `日志级别已更新并保存为: ${e.target.options[e.target.selectedIndex].text}`);

            // 如果日志弹窗当前是打开的，立即重新渲染以应用过滤
            const viewer = document.getElementById(Constants.ID_LOG_VIEWER);
            if (viewer && document.getElementById(Constants.ID_MODAL_LOG)) {
                renderLogsToView(viewer);
            }
        });
    }

    const viewLogsBtn = document.getElementById('qr-view-logs-btn');
    if (viewLogsBtn) {
        viewLogsBtn.addEventListener('click', () => {
            showLogModal();
        });
    }

    // 设置面板直接下载日志
    const downloadLogsPanelBtn = document.getElementById('qr-download-logs-panel-btn');
    if (downloadLogsPanelBtn) {
        downloadLogsPanelBtn.addEventListener('click', () => {
            try {
                // 1. 生成 JSON 字符串 (格式化缩进为 2 空格)
                const jsonContent = JSON.stringify(Logger.logs, null, 2);

                // 2. 创建 application/json 类型的 Blob
                const blob = new Blob([jsonContent], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                // 3. 生成文件名: qr_helper_logs_2023-10-27T10-00-00.json
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `qr_helper_logs_${timestamp}.json`;

                // 4. 触发下载
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();

                // 5. 清理
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                Logger.info(LogCategory.SYSTEM, '日志已导出为 JSON 文件');
            } catch (e) {
                Logger.error(LogCategory.SYSTEM, '导出日志失败', e);
                toastr.error(translate('导出日志失败，请查看控制台', 'qra_toastr_export_failed'));
            }
        });
    }
}

// 导出日志初始化函数供 setupEventListeners 调用
export function setupLogEventListeners() {
    initLogSettings();
}

// --- 排序管理弹窗与拖拽逻辑 ---

function createSortModalHtml(settings) {
    const isCustomChecked = settings.enableCustomSort ? 'checked' : '';
    const showDragArea = settings.enableCustomSort ? '' : 'style="display: none;"';
    return `
        <div class="qr-modal-box" id="${Constants.ID_MODAL_SORT}" style="width: 500px; max-width: 95vw;">
            <div class="qr-modal-header" style="display: flex; justify-content: space-between; align-items: center;">
                <span data-i18n="qra_sort_title">菜单分组排序管理</span>
                <button class="qr-help-close-btn" onclick="document.getElementById('${Constants.ID_MODAL_OVERLAY}').classList.remove('visible')" style="color: #333 !important;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div style="background: rgba(0,0,0,0.03); padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-weight: bold;" data-i18n="qra_sort_enable">开启自定义排序模式</span>
                        <i class="fa-solid fa-circle-question qr-sort-help-toggle" id="${Constants.ID_SORT_HELP_TOGGLE}" title="Toggle help" style="cursor: pointer; color: #999; font-size: 14px;"></i>
                    </div>
                    <label class="qr-toggle">
                        <input type="checkbox" id="${Constants.ID_SORT_MODE_TOGGLE}" ${isCustomChecked}>
                        <span class="qr-slider"></span>
                    </label>
                </div>
                <div class="qr-sort-desc" id="${Constants.ID_SORT_DESC}" ${isCustomChecked ? 'style="display: none;"' : ''} data-i18n="qra_sort_desc">
                    该模式允许您自定义排列QR菜单上的按钮顺序。<br>
                    关闭时，QR菜单上的按钮将会自适应排列（默认模式）。<br>
                    开启时，将会根据以下方式的排列显示在QR菜单上，因此你可以自行拖拽以下分组按钮进行自定义排列。
                </div>
            </div>

            <div class="qr-sort-columns-container" id="qr-sort-columns-container" ${showDragArea}>
                <div class="qr-sort-column">
                    <div class="qr-sort-list" id="qr-sort-list-left" data-col="left"></div>
                </div>
                <div class="qr-sort-column">
                    <div class="qr-sort-list" id="qr-sort-list-right" data-col="right"></div>
                </div>
            </div>
        </div>`;
}

// 暴露给 ui.js 调用
window.quickReplyMenu = window.quickReplyMenu || {};
window.quickReplyMenu.openSortModal = openSortModal;

// 导出函数供 index.js 使用
export function openSortModal() {
    const overlay = document.getElementById(Constants.ID_MODAL_OVERLAY);
    if (!overlay) return;

    const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
    if (!settings.groupOrder) settings.groupOrder = { left: [], right: [] };

    overlay.innerHTML = createSortModalHtml(settings);
    overlay.classList.add('visible');

    // 开关事件绑定
    document.getElementById(Constants.ID_SORT_MODE_TOGGLE).addEventListener('change', (e) => {
        settings.enableCustomSort = e.target.checked;
        saveSettings();

        // 动态显示/隐藏帮助图标
        const helpToggle = document.getElementById(Constants.ID_SORT_HELP_TOGGLE);
        if (helpToggle) {
            helpToggle.style.display = settings.enableCustomSort ? 'inline' : 'none';
        }

        // 开启时折叠说明区域，关闭时展开
        const descEl = document.getElementById(Constants.ID_SORT_DESC);
        if (descEl) {
            descEl.style.display = settings.enableCustomSort ? 'none' : 'block';
        }

        // 动态显示/隐藏拖拽区域
        const dragContainer = document.getElementById('qr-sort-columns-container');
        if (dragContainer) {
            dragContainer.style.display = settings.enableCustomSort ? 'flex' : 'none';
        }

        // 如果开启自定义排序，渲染分组列表
        if (settings.enableCustomSort) {
            renderSortLists(settings);
        }
    });

    // 帮助图标点击折叠/展开
    const helpToggle = document.getElementById(Constants.ID_SORT_HELP_TOGGLE);
    if (helpToggle) {
        helpToggle.style.display = settings.enableCustomSort ? 'inline' : 'none';
        helpToggle.addEventListener('click', () => {
            const descEl = document.getElementById(Constants.ID_SORT_DESC);
            if (descEl) {
                const isHidden = descEl.style.display === 'none';
                descEl.style.display = isHidden ? 'block' : 'none';
                helpToggle.classList.toggle('active', isHidden);
            }
        });
    }

    // 只在开启自定义排序时渲染分组列表
    if (settings.enableCustomSort) {
        renderSortLists(settings);
    }
}

// --- 新增：实时深度内存扫描仪 ---
// 作用：绕过激活和显示限制，从酒馆底层内存中揪出所有隐藏、禁用或其他角色的按钮
function scanAllMemoryForButtons() {
    const resultMap = new Map();
    const stContext = window.SillyTavern?.getContext();

    const addBtn = (groupName, label) => {
        if (!groupName || !label) return;
        if (!resultMap.has(groupName)) resultMap.set(groupName, new Set());
        resultMap.get(groupName).add(label);
    };

    // 1. 扫描 QR V2 (包含当前加载但被设置为 Hidden 的分组)
    if (window.quickReplyApi?.settings) {
        const scanQr = (setList) => {
            if (!Array.isArray(setList)) return;
            setList.forEach(link => {
                if (link?.set?.name && Array.isArray(link.set.qrList)) {
                    link.set.qrList.forEach(qr => {
                        if (qr.label) addBtn(link.set.name, qr.label.trim());
                    });
                }
            });
        };
        scanQr(window.quickReplyApi.settings.config?.setList);
        scanQr(window.quickReplyApi.settings.chatConfig?.setList);
        scanQr(window.quickReplyApi.settings.charConfig?.setList);
    }

    // 2. 扫描 LWB / 小白X (包含被设置为 Disabled 的任务)
    if (window.XBTasks) {
        const getTasks = (source) => Array.isArray(source) ? source : [];
        getTasks(window.XBTasks.global).forEach(t => { if (t.name) addBtn(`LWB-global-${t.name}`, t.name.trim()); });
        getTasks(window.XBTasks.preset).forEach(t => { if (t.name) addBtn(`LWB-preset-${t.name}`, t.name.trim()); });

        let currentCharName = "Character";
        if (stContext?.characterId && stContext.characters) {
            currentCharName = stContext.characters[stContext.characterId]?.name || "Character";
        }
        getTasks(window.XBTasks.character).forEach(t => { if (t.name) addBtn(currentCharName, t.name.trim()); });
    }

    // 3. 扫描酒馆内存中的所有角色 (挖掘其他角色的私有按钮)
    if (stContext?.characters) {
        stContext.characters.forEach(char => {
            const exts = char.data?.extensions || {};

            // 挖掘其他角色的 LWB 任务
            if (Array.isArray(exts.XBTasks)) {
                exts.XBTasks.forEach(t => {
                    if (t.name) addBtn(char.name, t.name.trim());
                });
            }

            // 挖掘其他角色的 QRv2 配置 (尝试兼容不同的存储键名)
            const qrData = exts['quick-reply'] || exts['ch_quick_reply'] || exts['qr'];
            if (qrData) {
                const setList = Array.isArray(qrData) ? qrData : (Array.isArray(qrData.setList) ? qrData.setList : null);
                if (setList) {
                    setList.forEach(setObj => {
                        const set = setObj.set || setObj; // 兼容不同结构
                        if (set.name && Array.isArray(set.qrList)) {
                            set.qrList.forEach(qr => {
                                if (qr.label) addBtn(set.name, qr.label.trim());
                            });
                        }
                    });
                }
            }
        });
    }

    return resultMap;
}

// --- 替换原有的 renderSortLists 方法 ---
function renderSortLists(settings) {
    // 1. 获取当前界面上激活的按钮
    const { scripts, standard } = fetchQuickReplies();
    const whitelist = Array.isArray(settings.whitelist) ? settings.whitelist : [];

    // 白名单过滤：已在白名单中的项不应出现在排序管理中
    const generateId = (item) => {
        if (item.source === 'JSSlashRunner') return `JSR::${item.scriptId}`;
        if (item.source === 'QuickReplyV2') return `QRV2::${item.setName}`;
        if (item.source === 'LittleWhiteBox') {
            if (item.taskScope === 'character') return 'LWB::Character_Set';
            return `LWB::${item.taskScope}::${item.taskId}`;
        }
        if (item.source === 'RawDomElement') return item.domId;
        return null;
    };
    const isWhitelisted = (item) => {
        const id = generateId(item);
        return id && whitelist.includes(id);
    };

    const groupDataMap = new Map();
    const allItems = [...scripts, ...standard].filter(item => !isWhitelisted(item));
    allItems.forEach(item => {
        if (item.setName) {
            if (!groupDataMap.has(item.setName)) {
                groupDataMap.set(item.setName, []);
            }
            groupDataMap.get(item.setName).push(item);
        }
    });

    // 2. 实时深度内存扫描，获取幽灵数据
    const memoryScannerMap = scanAllMemoryForButtons();

    // 3. 孤儿收容：发现新分组则补充到底部
    groupDataMap.forEach((items, name) => {
        if (!settings.groupOrder.left.includes(name) && !settings.groupOrder.right.includes(name)) {
            const isScript = items.some(item => item.source === 'JSSlashRunner' || item.source === 'LittleWhiteBox');
            if (isScript) settings.groupOrder.left.push(name);
            else settings.groupOrder.right.push(name);
        }
    });

    // 4. 渲染单列逻辑
    const renderList = (colId, listKey) => {
        const listEl = document.getElementById(colId);
        listEl.innerHTML = '';

        settings.groupOrder[listKey].forEach(name => {
            const groupItems = groupDataMap.get(name) || [];
            const isActive = groupItems.length > 0;

            // 新增逻辑：如果是幽灵分组，尝试从内存扫描结果中提取按钮
            let ghostItems = [];
            if (!isActive && memoryScannerMap.has(name)) {
                ghostItems = Array.from(memoryScannerMap.get(name)).map(label => ({ label }));
            }

            // 决定当前应当显示的按钮数量
            const displayCount = isActive ? groupItems.length : ghostItems.length;

            // 创建分组容器
            const groupContainer = document.createElement('div');
            groupContainer.className = 'qr-sort-group';
            if (!isActive) groupContainer.classList.add('ghost');

            // 分组头部（可拖拽）
            const headerEl = document.createElement('div');
            headerEl.className = 'qr-sort-group-header';
            headerEl.draggable = true;
            headerEl.dataset.name = name;

            const itemCount = displayCount > 0 ? `<span class="qr-sort-item-count">${displayCount}</span>` : '';

            // LWB分组统一加前缀以匹配白名单显示
            let displayName = name;
            const isLwbActive = groupItems.some(item => item.source === 'LittleWhiteBox');

            if (isLwbActive) {
                const firstLwbItem = groupItems.find(item => item.source === 'LittleWhiteBox');
                if (firstLwbItem.isLwbCharSet) {
                    displayName = `小白X-${name}`;
                } else {
                    displayName = `小白X-${firstLwbItem.taskId}`;
                }
            } else {
                if (name.startsWith('LWB-global-')) {
                    displayName = `小白X-${name.replace('LWB-global-', '')}`;
                } else if (name.startsWith('LWB-preset-')) {
                    displayName = `小白X-${name.replace('LWB-preset-', '')}`;
                }
            }

            const delBtnHtml = !isActive ? `<button class="qr-sort-del-btn" title="${translate('删除记录', 'qra_sort_del_record')}"><i class="fa-solid fa-trash-can"></i></button>` : '';

            headerEl.innerHTML = `
                <div style="display:flex; align-items:center; flex:1; overflow:hidden;">
                    <i class="fa-solid fa-grip-lines qr-sort-drag-handle"></i>
                    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:bold;">${displayName}</span>
                    ${itemCount}
                </div>
                ${delBtnHtml}
                <button class="qr-sort-expand-btn" title="${translate('展开/收起', 'qra_sort_expand_collapse')}">
                    <i class="fa-solid fa-chevron-down"></i>
                </button>
            `;

            // 【Bug 修复】为幽灵分组的删除按钮绑定 onclick 事件
            const delBtn = headerEl.querySelector('.qr-sort-del-btn');
            if (delBtn) {
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    const arr = settings.groupOrder[listKey];
                    const idx = arr.indexOf(name);
                    if (idx > -1) arr.splice(idx, 1);
                    groupContainer.remove();
                    saveSettings();
                };
            }

            // 展开/收起按钮
            const expandBtn = headerEl.querySelector('.qr-sort-expand-btn');
            const contentEl = document.createElement('div');
            contentEl.className = 'qr-sort-group-content';
            contentEl.style.display = 'none'; // 默认收起

            expandBtn.onclick = (e) => {
                e.stopPropagation();
                const isExpanded = contentEl.style.display !== 'none';
                contentEl.style.display = isExpanded ? 'none' : 'block';
                expandBtn.querySelector('i').className = isExpanded ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
            };

            // --- 渲染内部按钮 ---
            const itemsToRender = isActive ? groupItems : ghostItems;

            if (itemsToRender.length > 0) {
                itemsToRender.forEach(item => {
                    const btnEl = document.createElement('div');
                    btnEl.className = 'qr-sort-group-item';

                    // 幽灵状态按钮样式弱化，以作视觉区分
                    if (!isActive) {
                        btnEl.style.opacity = '0.6';
                        btnEl.style.background = '#f9f9f9';
                    }

                    btnEl.innerHTML = `<span>${item.label || item.name || 'Unknown'}</span>`;
                    contentEl.appendChild(btnEl);
                });
            } else {
                contentEl.innerHTML = `<div style="padding:10px; text-align:center; color:#999; font-size:12px;">${translate('该分组当前未在酒馆内存中找到有效按钮', 'qra_sort_group_empty')}</div>`;
            }

            groupContainer.appendChild(headerEl);
            groupContainer.appendChild(contentEl);
            listEl.appendChild(groupContainer);

            // 绑定拖拽事件到头部
            bindDragEvents(headerEl, groupContainer);
        });

        // 为空列绑定接收拖拽的能力
        listEl.addEventListener('dragover', e => {
            e.preventDefault();
            const draggingGroup = document.querySelector('.qr-sort-group.dragging');
            if (draggingGroup && !listEl.contains(draggingGroup)) {
                listEl.appendChild(draggingGroup);
            }
        });
    };

    renderList('qr-sort-list-left', 'left');
    renderList('qr-sort-list-right', 'right');
}

let draggedItem = null;
let draggedGroup = null;

function bindDragEvents(headerEl, groupContainer) {
    headerEl.addEventListener('dragstart', (e) => {
        draggedItem = headerEl;
        draggedGroup = groupContainer;
        groupContainer.classList.add('dragging');
        // 兼容 Firefox
        if (e.dataTransfer) e.dataTransfer.setData('text/plain', '');
    });

    headerEl.addEventListener('dragend', () => {
        groupContainer.classList.remove('dragging');
        draggedItem = null;
        draggedGroup = null;
        saveSortOrderFromDOM();
    });

    headerEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (headerEl === draggedItem) return;

        const targetGroup = headerEl.closest('.qr-sort-group');
        const listEl = targetGroup.parentNode;
        const rect = headerEl.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;

        // 决定是在目标上方还是下方插入
        if (e.clientY < midpoint) {
            listEl.insertBefore(draggedGroup, targetGroup);
        } else {
            listEl.insertBefore(draggedGroup, targetGroup.nextSibling);
        }
    });
}

function saveSortOrderFromDOM() {
    const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];

    const getNames = (colId) => {
        const groups = document.querySelectorAll(`#${colId} .qr-sort-group`);
        return Array.from(groups).map(el => el.querySelector('.qr-sort-group-header').dataset.name);
    };

    settings.groupOrder.left = getNames('qr-sort-list-left');
    settings.groupOrder.right = getNames('qr-sort-list-right');
    saveSettings();
}

// --- 公告弹窗逻辑 ---
function createAnnouncementModalHtml() {
    const lang = getCurrentLocale();
    const content = announcementDocs[lang] || announcementDocs['en'] || announcementDocs['zh-cn'];

    return `
    <div class="qr-modal-box" id="${Constants.ID_MODAL_ANNOUNCEMENT}">
        <div style="padding: 10px 15px; overflow-y: auto; max-height: 50vh; color: #000; line-height: 1.6; font-size: 14px;">
            ${content}
        </div>
        <div class="qr-modal-footer">
            <button id="${Constants.ID_BTN_CLOSE_ANNOUNCEMENT}" class="menu_button primary" data-i18n="qra_btn_read">已阅</button>
        </div>
    </div>`;
}

export function showAnnouncementModalIfNeeded() {
    const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
    const ANNOUNCEMENT_KEY = 'announcement_read_20260428';

    // 如果已经阅读过了，直接跳过
    if (settings[ANNOUNCEMENT_KEY]) return;

    const overlay = document.getElementById(Constants.ID_MODAL_OVERLAY);
    if (!overlay) return;

    // 生成并显示弹窗
    overlay.innerHTML = createAnnouncementModalHtml();
    overlay.classList.add('visible');

    // 当展现弹窗的瞬间立刻标记为已读并保存设置
    // 这样即便用户不点关闭而是直接刷新网页，弹窗下次也不会再出现了
    settings[ANNOUNCEMENT_KEY] = true;
    saveSettings();

    // 重新应用翻译，确保"已阅"按钮根据系统语言变换
    import('../../../i18n.js').then(({ applyLocale }) => {
        if (typeof applyLocale === 'function') applyLocale();
    });

    // 绑定关闭事件
    const btnClose = document.getElementById(Constants.ID_BTN_CLOSE_ANNOUNCEMENT);
    if (btnClose) {
        btnClose.onclick = () => {
            overlay.classList.remove('visible');
        };
    }
}
