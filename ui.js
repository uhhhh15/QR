// ui.js
import * as Constants from './constants.js';
import { fetchQuickReplies } from './api.js';
import { sharedState } from './state.js';
import { applyWhitelistDOMChanges } from './whitelist.js';
import { Logger, LogCategory } from './logger.js';
import { saveSettings, applyThemeStyles, updateIconDisplay } from './settings.js';
import { translate } from '../../../i18n.js';

// 滚动条自动隐藏/显示逻辑辅助函数 (导出供 Settings 使用)
export const attachScrollListener = (element) => {
    let scrollTimeout;
    element.addEventListener('scroll', () => {
        // 添加类名以显示滚动条
        if (!element.classList.contains('is-scrolling')) {
            element.classList.add('is-scrolling');
        }

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            element.classList.remove('is-scrolling');
        }, 500); // 停止滚动 0.5s 后隐藏
    }, { passive: true });

    // 鼠标悬停时也显示滚动条，防止用户想拖动时消失
    element.addEventListener('mouseenter', () => element.classList.add('is-scrolling'));
    element.addEventListener('mouseleave', () => element.classList.remove('is-scrolling'));
};

export function createMenuElement() {
    const menu = document.createElement('div');
    menu.id = Constants.ID_MENU;
    menu.setAttribute('role', 'dialog');
    menu.tabIndex = -1;

    // 1. 创建内容包裹层 (承载原来的左右两栏)
    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'qr-body-container';

    // 2. 左栏
    const leftColumn = document.createElement('div');
    leftColumn.className = 'column column-left';
    const leftList = document.createElement('div');
    leftList.className = 'action-list';
    leftList.id = 'qr-list-left';
    attachScrollListener(leftList);
    leftColumn.appendChild(leftList);

    // 3. 右栏
    const rightColumn = document.createElement('div');
    rightColumn.className = 'column column-right';
    const rightList = document.createElement('div');
    rightList.className = 'action-list';
    rightList.id = 'qr-list-right';
    attachScrollListener(rightList);
    rightColumn.appendChild(rightList);

    // 4. 组装
    bodyContainer.appendChild(leftColumn);
    bodyContainer.appendChild(rightColumn);
    menu.appendChild(bodyContainer);

    return menu;
}

export function createQuickReplyItem(reply) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = Constants.CLASS_ACTION_ITEM;

    item.dataset.label = reply.label?.trim() || '';
    item.dataset.isStandard = String(reply.isStandard !== false);
    item.dataset.setName = reply.setName || 'Unknown';
    item.dataset.source = reply.source || 'Unknown';

    if (reply.source === 'JSSlashRunner') {
        item.dataset.isApiBased = String(!!reply.isApiBased);
        if (reply.isApiBased) item.dataset.buttonId = reply.buttonId;
        item.dataset.scriptId = reply.scriptId;
    } else if (reply.source === 'LittleWhiteBox') {
        item.dataset.taskId = reply.taskId;
        item.dataset.taskScope = reply.taskScope;
    } else if (reply.source === 'RawDomElement') {
        item.dataset.domId = reply.domId;
    }

    // 第四点需求：内部包裹 span 以配合 CSS 实现 margin: auto 居中效果
    const span = document.createElement('span');

    // 支持渲染第三方插件传入的图标 HTML 标签
    if (item.dataset.label.includes('<i ') || item.dataset.label.includes('<img ')) {
        span.innerHTML = item.dataset.label;
    } else {
        span.textContent = item.dataset.label;
    }
    item.appendChild(span);

    // 第三点需求：移除原生 title，使用自定义悬停逻辑
    item.removeAttribute('title');

    // =========================================================
    // 配置：是否启用详细信息弹窗 (默认禁用)
    // 如果需要恢复悬停/长按显示信息，请将下方变量设为 true
    const ENABLE_MENU_TOOLTIPS = false;
    // =========================================================

    if (ENABLE_MENU_TOOLTIPS) {
        // 绑定悬停事件显示自定义 Tooltip
        item.addEventListener('mouseenter', (e) => {
            showTooltip(e, reply);
        });
        item.addEventListener('mouseleave', () => {
            hideTooltip();
        });
    }

    // --- 长摁逻辑 (兼容 PC 和 Mobile) ---
    let pressTimer;
    let hasTriggeredSortModal = false; // 标记是否已触发排序弹窗
    const clearTimer = () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    };

    const handleLongPressStart = (e) => {
        clearTimer();
        hasTriggeredSortModal = false; // 重置触发标记

        // 1. 保留原有的 600ms 提示框逻辑 (如果 ENABLE_MENU_TOOLTIPS 开启的话)
        if (ENABLE_MENU_TOOLTIPS) {
            // ... 原有 toastr 逻辑已在事件监听外独立处理 ...
        }

        // 2. 新增 3000ms 触发自定义排序逻辑
        pressTimer = setTimeout(() => {
            hasTriggeredSortModal = true; // 标记已触发

            // 震动反馈 (支持的设备)
            if (navigator.vibrate) navigator.vibrate(50);

            // 先弹出排序管理弹窗
            if (window.quickReplyMenu && window.quickReplyMenu.openSortModal) {
                window.quickReplyMenu.openSortModal();
            }

            // 延迟关闭菜单，确保弹窗先打开
            requestAnimationFrame(() => {
                sharedState.menuVisible = false;
                updateMenuVisibilityUI();
            });

            // 清除定时器引用，防止重复触发
            pressTimer = null;
        }, 3000); // 长按三秒
    };

    const handleLongPressEnd = (e) => {
        // 如果已经触发过排序弹窗，直接返回
        if (hasTriggeredSortModal) {
            hasTriggeredSortModal = false; // 重置标记
            clearTimer();
            return;
        }
        clearTimer();
    };

    // 绑定 Mobile 和 PC 事件
    item.addEventListener('touchstart', handleLongPressStart, { passive: true });
    item.addEventListener('touchend', handleLongPressEnd, { passive: true });
    item.addEventListener('touchmove', clearTimer, { passive: true });

    item.addEventListener('mousedown', handleLongPressStart);
    item.addEventListener('mouseup', handleLongPressEnd);
    item.addEventListener('mouseleave', clearTimer);

    if (ENABLE_MENU_TOOLTIPS) {
        // 为 600ms 保留单独的计时器防止冲突
        let tooltipTimer;
        item.addEventListener('touchstart', (e) => {
            tooltipTimer = setTimeout(() => {
                // 第二点需求：长摁显示详细信息
                // 1. 来源解析
                let sourceText = translate('未知来源', 'qra_source_unknown');
                if (reply.source === 'JSSlashRunner') sourceText = translate('酒馆助手 (JSR)', 'qra_source_jsr');
                else if (reply.source === 'QuickReplyV2') sourceText = translate('快速回复 (QR)', 'qra_source_qr');
                else if (reply.source === 'LittleWhiteBox') sourceText = translate('小白X (LWB)', 'qra_source_lwb');
                else if (reply.source === 'RawDomElement') sourceText = translate('酒馆插件', 'qra_source_thirdparty') || '酒馆插件';

                // 2. 作用域解析
                let scopeText = translate('角色', 'qra_scope_character');
                if (reply.scope === 'global') scopeText = translate('全局', 'qra_scope_global');
                else if (reply.scope === 'character') scopeText = translate('角色', 'qra_scope_character');
                else if (reply.scope === 'preset') scopeText = translate('预设', 'qra_scope_preset');

                // 兼容旧逻辑防御
                if (!reply.scope && reply.taskScope) {
                     scopeText = reply.taskScope === 'global' ? translate('全局', 'qra_scope_global') : translate('角色', 'qra_scope_character');
                }

                // 3. 脚本/集来源
                const setSource = reply.setName || 'Default';
                const btnName = reply.label;

                // 构建 HTML
                const htmlContent = `
                    <div style="text-align:left; font-size:0.9em; line-height:1.5;">
                        <div>${translate('来源', 'qra_tooltip_source')}: ${sourceText}</div>
                        <div>${translate('范围', 'qra_tooltip_scope')}: ${scopeText}</div>
                        <div>${translate('归属', 'qra_tooltip_belong')}: ${setSource}</div>
                        <div style="margin-top:4px; font-weight:bold; color:red; font-size:1.1em;">${btnName}</div>
                    </div>
                `;

                if (window.toastr) {
                    window.toastr.info(htmlContent, '', {
                        timeOut: 4000,
                        positionClass: 'toast-top-center',
                        preventDuplicates: true,
                        escapeHtml: false // 允许 HTML
                    });
                } else {
                    alert(`${translate('来源', 'qra_tooltip_source')}: ${sourceText}\n${translate('范围', 'qra_tooltip_scope')}: ${scopeText}\n${translate('归属', 'qra_tooltip_belong')}: ${setSource}\n${btnName}`);
                }
            }, 600);
        }, { passive: true });

        item.addEventListener('touchend', () => {
            if (tooltipTimer) {
                clearTimeout(tooltipTimer);
                tooltipTimer = null;
            }
        }, { passive: true });
        item.addEventListener('touchmove', () => {
            if (tooltipTimer) {
                clearTimeout(tooltipTimer);
                tooltipTimer = null;
            }
        }, { passive: true });
    }

    return item;
}

function createEmptyState(text) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.textContent = text;
    return div;
}

export function renderQuickReplies(scriptReplies, standardReplies) {
    const leftList = document.getElementById('qr-list-left');
    const rightList = document.getElementById('qr-list-right');

    if (!leftList || !rightList) return;

    const populateContainer = (container, replies, emptyText) => {
        container.innerHTML = '';
        const parentColumn = container.parentElement;
        const oldEmpty = parentColumn.querySelector('.empty-state');
        if (oldEmpty) oldEmpty.remove();

        if (replies && replies.length > 0) {
            container.style.display = 'flex';

            replies.forEach((reply, index) => {
                const btn = createQuickReplyItem(reply);

                // 相同来源(setName)合并背景
                const prev = replies[index - 1];
                const next = replies[index + 1];
                const currSet = reply.setName;

                const isPrevSame = prev && prev.setName === currSet;
                const isNextSame = next && next.setName === currSet;

                if (!isPrevSame && isNextSame) {
                    btn.classList.add('group-start');
                } else if (isPrevSame && isNextSame) {
                    btn.classList.add('group-middle');
                } else if (isPrevSame && !isNextSame) {
                    btn.classList.add('group-end');
                }

                btn.addEventListener('click', (e) => {
                     if (window.quickReplyMenu?.handleQuickReplyClick) {
                        window.quickReplyMenu.handleQuickReplyClick(e);
                     }
                });
                container.appendChild(btn);
            });
        } else {
            container.style.display = 'none';
            parentColumn.appendChild(createEmptyState(emptyText));
        }
    };

    // 左栏：显示脚本 (JSR, LWB)
    populateContainer(leftList, scriptReplies, translate('没有可用的脚本按钮', 'qra_empty_scripts'));
    // 右栏：显示标准快速回复 (QR v2)
    populateContainer(rightList, standardReplies, translate('没有可用的快速回复', 'qra_empty_standard'));
}

export function updateMenuVisibilityUI() {
    const { menu, rocketButton, backdrop } = sharedState.domElements;
    const show = sharedState.menuVisible;

    if (!menu || !rocketButton) return;

    if (show) {
        const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const isMobile = vw < 600;
        const targetWidth = isMobile ? vw * 0.95 : Math.min(vw * 0.85, 800);

        menu.style.width = `${targetWidth}px`;
        menu.style.maxHeight = `${vh - 40}px`;

        const settings = window.SillyTavern?.getContext()?.extensionSettings?.[Constants.EXTENSION_NAME];

        // 先在隐藏状态下渲染内容，再显示菜单，避免首次打开时出现"由小变大"的视觉跳变
        try {
            if (settings?.firstTimeSetupPending) {
                renderOnboardingHeader(menu, settings);
            } else {
                const header = document.getElementById(Constants.ID_ONBOARDING_HEADER);
                if (header) header.remove();
            }

            const { scripts, standard } = fetchQuickReplies();
            const { leftList, rightList } = performAutoGrouping(scripts, standard);

            renderQuickReplies(leftList, rightList);
            applyWhitelistDOMChanges();
        } catch (e) {
            Logger.error(LogCategory.UI, '获取回复列表失败', e);
            if (menu) {
                const bodyContainer = menu.querySelector('.qr-body-container');
                if (bodyContainer) {
                    bodyContainer.innerHTML = `
                        <div style="padding: 20px; width: 100%; text-align: center; color: #ff6b6b;">
                            <i class="fa-solid fa-triangle-exclamation" style="font-size: 2em; margin-bottom: 10px;"></i>
                            <div style="font-weight: bold;">${translate('菜单渲染出错', 'qra_menu_render_error')}</div>
                            <div style="font-size: 0.8em; opacity: 0.8; margin-top: 5px;">${e.message || "Unknown Error"}</div>
                            <div style="font-size: 0.8em; opacity: 0.6; margin-top: 10px;">${translate('请按 F12 查看控制台详细日志', 'qra_menu_check_console')}</div>
                        </div>
                    `;
                }
            }
        }

        // 内容就绪后再显示菜单
        menu.classList.add('visible');
        rocketButton.classList.add('active');

        // 仅在设置开启时，才添加旋转动画类名
        if (settings?.enableAvatarRotation) {
            rocketButton.classList.add('qr-avatar-rotated');
        }

        // 遮罩层
        if (settings?.enableBackdrop && backdrop) {
            backdrop.classList.add('visible');
        }
    } else {
        menu.classList.remove('visible');
        if (sharedState.domElements.backdrop) {
            sharedState.domElements.backdrop.classList.remove('visible');
        }
        rocketButton.classList.remove('active');
        rocketButton.classList.remove('qr-avatar-rotated');
        applyWhitelistDOMChanges();
    }
}

// --- 自定义 Tooltip 逻辑 ---
let tooltipEl = null;

function getTooltipElement() {
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'qr-tooltip';
        document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
}

export function showTooltip(e, reply, hideLabel = false) {
    const el = getTooltipElement();
    const targetBtn = e.currentTarget;

    // 解析来源信息
    let sourceText = translate('未知来源', 'qra_source_unknown');
    if (reply.source === 'JSSlashRunner') sourceText = translate('酒馆助手 (JSR)', 'qra_source_jsr');
    else if (reply.source === 'QuickReplyV2') sourceText = translate('快速回复 (QR)', 'qra_source_qr');
    else if (reply.source === 'LittleWhiteBox') sourceText = translate('小白X (LWB)', 'qra_source_lwb');
    else if (reply.source === 'RawDomElement') sourceText = translate('酒馆插件', 'qra_source_thirdparty') || '酒馆插件';

    let scopeText = translate('角色', 'qra_scope_character');
    if (reply.scope === 'global') scopeText = translate('全局', 'qra_scope_global');
    else if (reply.scope === 'character') scopeText = translate('角色', 'qra_scope_character');
    else if (reply.scope === 'preset') scopeText = translate('预设', 'qra_scope_preset');

    const setSource = reply.setName || 'Default';
    const displaySource = reply.source === 'LittleWhiteBox' ? 'XB-Task' : setSource;

    let contentHtml = `
        <div style="text-align:left; line-height:1.5;">
            <div style="color:#666; font-size:0.9em;">${translate('来源', 'qra_tooltip_source')}: ${sourceText}</div>
            <div style="color:#666; font-size:0.9em;">${translate('范围', 'qra_tooltip_scope')}: ${scopeText}</div>
    `;

    // 如果不隐藏归属和标题（主菜单模式）
    if (!hideLabel) {
        contentHtml += `
            <div style="color:#666; font-size:0.9em;">${translate('归属', 'qra_tooltip_belong')}: ${displaySource}</div>
            <div style="margin-top:6px; font-weight:600; color:#333; font-size:1.1em; border-top:1px solid #eee; padding-top:4px;">
                ${reply.label}
            </div>
        `;
    }

    contentHtml += `</div>`;
    el.innerHTML = contentHtml;
    el.classList.add('visible');

    const btnRect = targetBtn.getBoundingClientRect();
    const tooltipRect = el.getBoundingClientRect();

    // 改进定位逻辑：检查是否在设置面板（白名单区域）
    const isWhitelistItem = targetBtn.classList.contains('qrq-whitelist-item');
    const isLeftColumn = !isWhitelistItem && targetBtn.closest('.column-left') !== null;

    let top = btnRect.bottom;
    let left = 0;

    if (isWhitelistItem) {
        // 白名单项：统一在按钮右下角对齐
        left = btnRect.left;
    } else if (isLeftColumn) {
        left = btnRect.left - tooltipRect.width;
    } else {
        left = btnRect.right;
    }

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
}

export function hideTooltip() {
    const el = getTooltipElement();
    el.classList.remove('visible');
}

/**
 * 显示自定义图标引导弹窗
 * @param {HTMLElement} menuContainer 菜单容器
 */
function showCustomIconGuidance(menuContainer) {
    const existingOverlay = menuContainer.querySelector('.qr-ob-guidance-overlay');
    if (existingOverlay) return;

    const overlay = document.createElement('div');
    overlay.className = 'qr-ob-guidance-overlay';
    overlay.innerHTML = `
        <div class="qr-ob-guidance-box">
            <div class="qr-ob-guidance-title">${translate('新增自定义图标', 'qra_onboarding_custom_guide_title')}</div>
            <div class="qr-ob-guidance-text">
                ${translate('请点击酒馆顶部菜单栏的 <i class="fa-solid fa-cubes"></i> 扩展管理图标，找到 <strong>【QR助手】</strong>，切换到 <strong>"图标按钮"</strong> 页面新增并启用自定义图标。', 'qra_onboarding_custom_guide_text')}
            </div>
            <button class="qr-ob-btn" id="qr-ob-guidance-close">${translate('知道了', 'qra_onboarding_got_it')}</button>
        </div>
    `;
    menuContainer.appendChild(overlay);

    document.getElementById('qr-ob-guidance-close').addEventListener('click', () => {
        overlay.style.transition = 'opacity 0.15s';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 150);
    });
}

/**
 * 渲染首次设置栏 (Onboarding Header)
 * @param {HTMLElement} menuContainer 菜单容器
 * @param {Object} settings 设置对象
 */
function renderOnboardingHeader(menuContainer, settings) {
    if (document.getElementById(Constants.ID_ONBOARDING_HEADER)) return;

    const header = document.createElement('div');
    header.id = Constants.ID_ONBOARDING_HEADER;

    // 构建 UI Themes 选项
    const themes = [
        { val: Constants.UI_THEMES.LIGHT, label: translate('默认', 'qra_theme_default') },
        { val: Constants.UI_THEMES.SYSTEM, label: translate('跟随酒馆', 'qra_theme_system') },
        { val: Constants.UI_THEMES.CUTE, label: translate('樱花', 'qra_theme_sakura') },
        { val: Constants.UI_THEMES.CLASSICAL, label: translate('古典', 'qra_theme_classical') },
        { val: Constants.UI_THEMES.DARK, label: translate('暗黑', 'qra_theme_dark') },
        { val: Constants.UI_THEMES.PAPER, label: translate('和纸', 'qra_theme_paper') },
        { val: Constants.UI_THEMES.CERAMIC, label: translate('白瓷', 'qra_theme_ceramic') },
        { val: Constants.UI_THEMES.LAVENDER, label: translate('薰衣草', 'qra_theme_lavender') },
        { val: Constants.UI_THEMES.SMOKED, label: translate('烟熏', 'qra_theme_smoked') },
        { val: Constants.UI_THEMES.AURORA, label: translate('极光', 'qra_theme_aurora') },
        { val: Constants.UI_THEMES.FOREST, label: translate('迷雾森林', 'qra_theme_forest') }
    ];

    let optionsHtml = '';
    themes.forEach(t => {
        const selected = (settings.uiTheme === t.val) ? 'selected' : '';
        optionsHtml += `<option value="${t.val}" ${selected}>${t.label}</option>`;
    });

    const isBlur = settings.enableBackdrop ? 'checked' : '';

    // 确定当前图标来源
    const currentIconType = settings.iconType || Constants.ICON_TYPES.STAR;
    let currentSource = 'builtin';
    if (currentIconType === Constants.ICON_TYPES.CHARACTER_CARD) currentSource = 'character';
    else if (currentIconType === Constants.ICON_TYPES.CUSTOM) currentSource = 'custom';

    const isActive = (source) => source === currentSource ? 'active' : '';

    header.innerHTML = `
        <div class="qr-ob-group">
            <i class="fa-solid fa-palette" title="${translate('快速外观设置', 'qra_onboarding_theme')}"></i>
            <select id="${Constants.ID_ONBOARDING_THEME_SELECT}" class="qr-ob-select">
                ${optionsHtml}
            </select>
        </div>
        <div class="qr-ob-group qr-ob-icon-source">
            <button id="${Constants.ID_ONBOARDING_ICON_SOURCE}" class="qr-ob-icon-btn" title="${translate('切换图标来源', 'qra_onboarding_icon')}">
                <i class="fa-solid fa-icons"></i>
                <span>${translate('设置图标', 'qra_onboarding_icon')}</span>
            </button>
            <div id="${Constants.ID_ONBOARDING_ICON_MENU}" class="qr-ob-icon-menu">
                <div class="qr-ob-icon-option ${isActive('character')}" data-source="character">
                    <i class="fa-solid fa-user-circle"></i>
                    <span>${translate('当前角色卡', 'qra_onboarding_char_card')}</span>
                </div>
                <div class="qr-ob-icon-option ${isActive('builtin')}" data-source="builtin">
                    <i class="fa-solid fa-star-and-crescent"></i>
                    <span>${translate('内置图标', 'qra_onboarding_builtin')}</span>
                </div>
                <div class="qr-ob-icon-option ${isActive('custom')}" data-source="custom">
                    <i class="fa-solid fa-image"></i>
                    <span>${translate('自定义图标', 'qra_onboarding_custom')}</span>
                </div>
            </div>
        </div>
        <div class="qr-ob-group">
            <label style="cursor:pointer; display:flex; align-items:center; gap:4px;">
                <input type="checkbox" id="${Constants.ID_ONBOARDING_BLUR_CHECK}" ${isBlur}>
                ${translate('背景模糊', 'qra_onboarding_blur')}
            </label>
        </div>
        <button id="${Constants.ID_ONBOARDING_BTN_DONE}" class="qr-ob-btn">
            ${translate('完成设置', 'qra_onboarding_done')}
        </button>
    `;

    // 插入到 menu 最上方
    menuContainer.insertBefore(header, menuContainer.firstChild);

    // --- 绑定交互事件 ---

    // 1. 主题实时预览
    const themeSelect = document.getElementById(Constants.ID_ONBOARDING_THEME_SELECT);
    themeSelect.addEventListener('change', (e) => {
        settings.uiTheme = e.target.value;
        applyThemeStyles(); // 立即应用 CSS 变量，无需保存即可预览
        // 同时同步设置面板中的下拉框（如果存在）
        const settingDd = document.getElementById(Constants.ID_UI_THEME_DROPDOWN);
        if (settingDd) settingDd.value = settings.uiTheme;
    });

    // 1.5 图标来源切换
    const iconSourceBtn = document.getElementById(Constants.ID_ONBOARDING_ICON_SOURCE);
    const iconMenu = document.getElementById(Constants.ID_ONBOARDING_ICON_MENU);

    // 切换下拉菜单显隐
    iconSourceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        iconMenu.classList.toggle('open');
    });

    // 各选项点击事件
    iconMenu.querySelectorAll('.qr-ob-icon-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const source = option.dataset.source;
            iconMenu.classList.remove('open');

            if (source === 'custom') {
                showCustomIconGuidance(menuContainer);
                return;
            }

            // 切换前保存当前内置图标快照
            if (settings.iconType !== Constants.ICON_TYPES.CUSTOM && settings.iconType !== Constants.ICON_TYPES.CHARACTER_CARD) {
                settings._builtinIconType = settings.iconType;
            }

            if (source === 'character') {
                settings.iconType = Constants.ICON_TYPES.CHARACTER_CARD;
            } else {
                settings.iconType = settings._builtinIconType || Constants.ICON_TYPES.STAR;
            }

            saveSettings();
            updateIconDisplay();

            // 更新菜单中激活状态
            iconMenu.querySelectorAll('.qr-ob-icon-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
        });
    });

    // 点击菜单外部关闭下拉
    menuContainer.addEventListener('click', (e) => {
        if (!iconSourceBtn.contains(e.target) && !iconMenu.contains(e.target)) {
            iconMenu.classList.remove('open');
        }
    });

    // 2. 模糊实时预览
    const blurCheck = document.getElementById(Constants.ID_ONBOARDING_BLUR_CHECK);
    blurCheck.addEventListener('change', (e) => {
        settings.enableBackdrop = e.target.checked;
        // 实时控制 backdrop 显隐
        const backdrop = sharedState.domElements.backdrop;
        if (backdrop) {
            if (settings.enableBackdrop) backdrop.classList.add('visible');
            else backdrop.classList.remove('visible');
        }
        // 同步设置面板
        const settingCheck = document.getElementById(Constants.ID_BACKDROP_ENABLED_CHECKBOX);
        if (settingCheck) settingCheck.checked = settings.enableBackdrop;
    });

    // 3. 完成按钮
    const btnDone = document.getElementById(Constants.ID_ONBOARDING_BTN_DONE);
    btnDone.addEventListener('click', () => {
        // 标记为已完成
        settings.firstTimeSetupPending = false;
        saveSettings(); // 保存最终结果

        // 移除 Header 动画
        header.style.transition = 'opacity 0.2s';
        header.style.opacity = '0';
        setTimeout(() => {
            header.remove();
            // 重新计算一次布局高度位置，因为去掉了头部高度变了
            updateMenuVisibilityUI();
        }, 200);
    });
}

/**
 * 执行自动分组、排序与平衡逻辑 (最终完美版)
 * 特性：
 * 1. 白名单预清洗：计算前剔除被隐藏的按钮，防止"幽灵高度"干扰。
 * 2. 智能填坑 (Best Fit)：计算高度差的一半，寻找最接近该大小的组进行搬运，精确处理 2 vs 3 的差异。
 * 3. 金字塔重排：搬运后再次全局排序，确保无论怎么移，永远保持"上小下大"。
 */
function performAutoGrouping(leftRaw, rightRaw) {
    // --- A. 准备工作：获取设置 ---
    const context = window.SillyTavern?.getContext();
    const settings = context?.extensionSettings?.["qr-assistant"] || {};
    const whitelist = Array.isArray(settings.whitelist) ? settings.whitelist : [];

    // ID 生成器
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

    const isVisible = (item) => {
        const id = generateId(item);
        if (id && whitelist.includes(id)) return false;
        return true;
    };

    // --- B. 分组 (同时执行过滤) ---
    const groupItems = (items) => {
        const map = new Map();
        if (Array.isArray(items)) {
            items.forEach(item => {
                if (!isVisible(item)) return;
                const key = item.setName || 'Unknown';
                if (!map.has(key)) {
                    map.set(key, { name: key, items: [], count: 0 });
                }
                const g = map.get(key);
                g.items.push(item);
                g.count++;
            });
        }
        return Array.from(map.values());
    };

    let leftGroups = groupItems(leftRaw);
    let rightGroups = groupItems(rightRaw);
    const flatten = (groups) => groups.flatMap(g => g.items);

    // ==========================================
    // 模式 1: 自定义排序 (双轨制 - 手动档)
    // ==========================================
    if (settings.enableCustomSort && settings.groupOrder) {
        // 1. 将当前存活组放入 Map 以便提取
        const activeGroupsMap = new Map();
        [...leftGroups, ...rightGroups].forEach(g => activeGroupsMap.set(g.name, g));

        const finalLeftGroups = [];
        const finalRightGroups = [];

        // 2. 应对减少：依蓝图提取左侧（遇幽灵则跳过）
        (settings.groupOrder.left || []).forEach(name => {
            if (activeGroupsMap.has(name)) {
                finalLeftGroups.push(activeGroupsMap.get(name));
                activeGroupsMap.delete(name);
            }
        });

        // 3. 应对减少：依蓝图提取右侧
        (settings.groupOrder.right || []).forEach(name => {
            if (activeGroupsMap.has(name)) {
                finalRightGroups.push(activeGroupsMap.get(name));
                activeGroupsMap.delete(name);
            }
        });

        // 4. 应对增多：安置未在蓝图中的孤儿分组
        activeGroupsMap.forEach((group, name) => {
            const isOriginallyLeft = leftGroups.some(g => g.name === name);
            if (isOriginallyLeft) finalLeftGroups.push(group);
            else finalRightGroups.push(group);
        });

        return {
            leftList: flatten(finalLeftGroups),
            rightList: flatten(finalRightGroups)
        };
    }

    // ==========================================
    // 模式 2: 自适应平衡与金字塔排序 (双轨制 - 自动档)
    // ==========================================
    const sorter = (a, b) => {
        if (a.count !== b.count) return a.count - b.count;
        return a.name.localeCompare(b.name, 'zh-CN');
    };

    leftGroups.sort(sorter);
    rightGroups.sort(sorter);

    const getHeight = (list) => list.reduce((sum, g) => sum + g.count, 0);
    let maxLoop = 20;

    while (maxLoop > 0) {
        maxLoop--;
        const lH = getHeight(leftGroups);
        const rH = getHeight(rightGroups);
        const diff = lH - rH;

        if (Math.abs(diff) <= 1) break;

        const targetMoveSize = Math.abs(diff) / 2;
        const sourceList = diff > 0 ? leftGroups : rightGroups;
        const targetList = diff > 0 ? rightGroups : leftGroups;

        let bestIndex = -1;
        let minDist = Infinity;

        sourceList.forEach((group, index) => {
            const dist = Math.abs(group.count - targetMoveSize);
            if (dist < minDist) {
                minDist = dist;
                bestIndex = index;
            }
        });

        if (bestIndex === -1) break;

        const candidateSize = sourceList[bestIndex].count;
        const currentImbalance = Math.abs(diff);
        const newImbalance = Math.abs((lH - (diff > 0 ? candidateSize : -candidateSize)) - (rH + (diff > 0 ? candidateSize : -candidateSize)));

        if (newImbalance >= currentImbalance) break;

        const groupToMove = sourceList.splice(bestIndex, 1)[0];
        targetList.push(groupToMove);
    }

    leftGroups.sort(sorter);
    rightGroups.sort(sorter);

    return {
        leftList: flatten(leftGroups),
        rightList: flatten(rightGroups)
    };
}
