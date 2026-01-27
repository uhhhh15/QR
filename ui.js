// ui.js
import * as Constants from './constants.js';
import { fetchQuickReplies } from './api.js';
import { sharedState } from './state.js';
import { applyWhitelistDOMChanges } from './whitelist.js';
import { Logger, LogCategory } from './logger.js';
import { saveSettings, applyThemeStyles } from './settings.js';

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
    span.textContent = item.dataset.label;
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

        // --- 移动端长摁逻辑 ---
        let pressTimer;
        const clearTimer = () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        };

        item.addEventListener('touchstart', (e) => {
            clearTimer();
            // 设置 600ms 长摁阈值
            pressTimer = setTimeout(() => {
                // 第二点需求：长摁显示详细信息
                // 1. 来源解析
                let sourceText = '未知来源';
                if (reply.source === 'JSSlashRunner') sourceText = '酒馆助手 (JSR)';
                else if (reply.source === 'QuickReplyV2') sourceText = '快速回复 (QR)';
                else if (reply.source === 'LittleWhiteBox') sourceText = '小白X (LWB)';

                // 2. 作用域解析
                let scopeText = '角色';
                if (reply.scope === 'global') scopeText = '全局';
                else if (reply.scope === 'character') scopeText = '角色';
                else if (reply.scope === 'preset') scopeText = '预设';

                // 兼容旧逻辑防御
                if (!reply.scope && reply.taskScope) {
                     scopeText = reply.taskScope === 'global' ? '全局' : '角色';
                }

                // 3. 脚本/集来源
                const setSource = reply.setName || 'Default';
                const btnName = reply.label;

                // 构建 HTML
                const htmlContent = `
                    <div style="text-align:left; font-size:0.9em; line-height:1.5;">
                        <div>来源: ${sourceText}</div>
                        <div>范围: ${scopeText}</div>
                        <div>归属: ${setSource}</div>
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
                    alert(`来源: ${sourceText}\n作用域: ${scopeText}\n归属: ${setSource}\n名称: ${btnName}`);
                }
            }, 600);
        }, { passive: true });

        item.addEventListener('touchend', clearTimer, { passive: true });
        item.addEventListener('touchmove', clearTimer, { passive: true });
        // ---------------------
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
    populateContainer(leftList, scriptReplies, '没有可用的脚本按钮');
    // 右栏：显示标准快速回复 (QR v2)
    populateContainer(rightList, standardReplies, '没有可用的快速回复');
}

export function updateMenuVisibilityUI() {
    const { menu, rocketButton, backdrop } = sharedState.domElements; // 解构出 backdrop
    const show = sharedState.menuVisible;

    if (!menu || !rocketButton) return;

    if (show) {
        // 注意：将遮罩层显示逻辑移入 RAF，防止背景先黑一下菜单还没出来的闪烁感

        // 使用 visualViewport (如果可用) 以获得更准确的移动端可视区域
        const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const vTop = window.visualViewport ? window.visualViewport.offsetTop : 0;
        const vLeft = window.visualViewport ? window.visualViewport.offsetLeft : 0;

        // 宽度设置：移动端占 95%，桌面端限制最大宽度
        const isMobile = vw < 600;
        const targetWidth = isMobile ? vw * 0.95 : Math.min(vw * 0.85, 800);

        menu.style.width = `${targetWidth}px`;
        menu.style.height = 'auto';
        // 限制最大高度，防止溢出屏幕，预留上下各 20px 空间
        menu.style.maxHeight = `${vh - 40}px`;

        // 暂时显示以进行测量
        menu.style.visibility = 'hidden';
        menu.classList.add('visible');

        // 第一点需求：使用 requestAnimationFrame 等待 DOM 渲染完成后再计算坐标
        requestAnimationFrame(() => {
            const rect = menu.getBoundingClientRect();

            // 重新获取最新的视口数据 (以防万一)
            const curVw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
            const curVh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            const curVTop = window.visualViewport ? window.visualViewport.offsetTop : 0;
            const curVLeft = window.visualViewport ? window.visualViewport.offsetLeft : 0;

            const topPos = curVTop + (curVh - rect.height) / 2;
            const leftPos = curVLeft + (curVw - rect.width) / 2;

            menu.style.position = 'fixed';
            menu.style.top = `${Math.max(curVTop + 10, topPos)}px`;
            menu.style.left = `${leftPos}px`;
            menu.style.transform = 'none';
            menu.style.margin = '0';

            // 计算完毕，显示
            menu.style.visibility = 'visible';
            rocketButton.classList.add('active');

            // 在此处才显示遮罩，确保和菜单同时出现
            const settings = window.SillyTavern?.getContext()?.extensionSettings?.[Constants.EXTENSION_NAME];
            if (settings?.enableBackdrop && backdrop) {
                backdrop.classList.add('visible');
            }
        });

        try {
            // --- 新增：首次运行设置栏逻辑 ---
            const settings = window.SillyTavern?.getContext()?.extensionSettings?.[Constants.EXTENSION_NAME];
            if (settings?.firstTimeSetupPending) {
                renderOnboardingHeader(menu, settings);
            } else {
                // 如果不在首次设置模式，确保 header 被移除
                const header = document.getElementById(Constants.ID_ONBOARDING_HEADER);
                if (header) header.remove();
            }
            // -----------------------------

            // 更新为获取 scripts 和 standard
            const { scripts, standard } = fetchQuickReplies();

            // [新增] 执行自适应分组、排序与平衡逻辑
            // 左侧初始为 Scripts(脚本/LWB)，右侧初始为 Standard(QR)
            const { leftList, rightList } = performAutoGrouping(scripts, standard);

            // 渲染处理后的列表
            renderQuickReplies(leftList, rightList);
            applyWhitelistDOMChanges();
        } catch (e) {
            Logger.error(LogCategory.UI, '获取回复列表失败', e);
            // 错误处理：在菜单中显示错误信息，防止菜单坍缩成一条横线
            if (menu) {
                const bodyContainer = menu.querySelector('.qr-body-container');
                if (bodyContainer) {
                    bodyContainer.innerHTML = `
                        <div style="padding: 20px; width: 100%; text-align: center; color: #ff6b6b;">
                            <i class="fa-solid fa-triangle-exclamation" style="font-size: 2em; margin-bottom: 10px;"></i>
                            <div style="font-weight: bold;">菜单渲染出错</div>
                            <div style="font-size: 0.8em; opacity: 0.8; margin-top: 5px;">${e.message || "Unknown Error"}</div>
                            <div style="font-size: 0.8em; opacity: 0.6; margin-top: 10px;">请按 F12 查看控制台详细日志</div>
                        </div>
                    `;
                }
            }
        }
    } else {
        menu.classList.remove('visible');
        if (sharedState.domElements.backdrop) {
            sharedState.domElements.backdrop.classList.remove('visible');
        }
        rocketButton.classList.remove('active');
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
    let sourceText = '未知来源';
    if (reply.source === 'JSSlashRunner') sourceText = '酒馆助手 (JSR)';
    else if (reply.source === 'QuickReplyV2') sourceText = '快速回复 (QR)';
    else if (reply.source === 'LittleWhiteBox') sourceText = '小白X (LWB)';

    let scopeText = '角色';
    if (reply.scope === 'global') scopeText = '全局';
    else if (reply.scope === 'character') scopeText = '角色';
    else if (reply.scope === 'preset') scopeText = '预设';

    const setSource = reply.setName || 'Default';
    const displaySource = reply.source === 'LittleWhiteBox' ? 'XB-Task' : setSource;

    let contentHtml = `
        <div style="text-align:left; line-height:1.5;">
            <div style="color:#666; font-size:0.9em;">来源: ${sourceText}</div>
            <div style="color:#666; font-size:0.9em;">范围: ${scopeText}</div>
    `;

    // 如果不隐藏归属和标题（主菜单模式）
    if (!hideLabel) {
        contentHtml += `
            <div style="color:#666; font-size:0.9em;">归属: ${displaySource}</div>
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
        { val: Constants.UI_THEMES.LIGHT, label: '默认 (Light)' },
        { val: Constants.UI_THEMES.SYSTEM, label: '跟随酒馆 (System)' },
        { val: Constants.UI_THEMES.CUTE, label: '樱花 (Sakura)' },
        { val: Constants.UI_THEMES.CLASSICAL, label: '古典 (Classical)' },
        { val: Constants.UI_THEMES.DARK, label: '暗黑 (Dark)' },
        { val: Constants.UI_THEMES.PAPER, label: '和纸 (Paper)' },
        { val: Constants.UI_THEMES.CERAMIC, label: '白瓷 (Ceramic)' },
        { val: Constants.UI_THEMES.LAVENDER, label: '薰衣草 (Lavender)' },
        { val: Constants.UI_THEMES.SMOKED, label: '烟熏 (Smoked)' },
        { val: Constants.UI_THEMES.AURORA, label: '极光 (Aurora)' },
        { val: Constants.UI_THEMES.FOREST, label: '迷雾森林 (Forest)' }
    ];

    let optionsHtml = '';
    themes.forEach(t => {
        const selected = (settings.uiTheme === t.val) ? 'selected' : '';
        optionsHtml += `<option value="${t.val}" ${selected}>${t.label}</option>`;
    });

    const isBlur = settings.enableBackdrop ? 'checked' : '';

    header.innerHTML = `
        <div class="qr-ob-group">
            <i class="fa-solid fa-palette" title="快速外观设置"></i>
            <select id="${Constants.ID_ONBOARDING_THEME_SELECT}" class="qr-ob-select">
                ${optionsHtml}
            </select>
        </div>
        <div class="qr-ob-group">
            <label style="cursor:pointer; display:flex; align-items:center; gap:4px;">
                <input type="checkbox" id="${Constants.ID_ONBOARDING_BLUR_CHECK}" ${isBlur}>
                背景模糊
            </label>
        </div>
        <button id="${Constants.ID_ONBOARDING_BTN_DONE}" class="qr-ob-btn">
            完成设置
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
    // --- A. 准备工作：获取白名单设置 ---
    const context = window.SillyTavern?.getContext();
    const settings = context?.extensionSettings?.["qr-assistant"];
    const whitelist = Array.isArray(settings?.whitelist) ? settings.whitelist : [];

    // ID 生成器 (需与 whitelist.js 逻辑保持一致)
    const generateId = (item) => {
        if (item.source === 'JSSlashRunner') return `JSR::${item.scriptId}`;
        if (item.source === 'QuickReplyV2') return `QRV2::${item.setName}`;
        if (item.source === 'LittleWhiteBox') {
            // LWB 特殊逻辑：角色任务集归类为 Character_Set
            if (item.taskScope === 'character') return 'LWB::Character_Set';
            return `LWB::${item.taskScope}::${item.taskId}`;
        }
        return null;
    };

    // 过滤函数：如果 ID 在白名单中，则不参与分组计算（因为它在菜单里是隐藏的）
    const isVisible = (item) => {
        const id = generateId(item);
        // 如果能生成ID且ID在白名单里，视为"不可见"(在菜单中不占用高度)
        if (id && whitelist.includes(id)) return false;
        return true;
    };

    // --- B. 分组 (同时执行过滤) ---
    const groupItems = (items) => {
        const map = new Map();
        if (Array.isArray(items)) {
            items.forEach(item => {
                // [关键] 预先过滤掉白名单项
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

    // --- C. 排序函数 (金字塔：小在顶，大在底) ---
    const sorter = (a, b) => {
        if (a.count !== b.count) return a.count - b.count;
        return a.name.localeCompare(b.name, 'zh-CN');
    };

    // 初始排序
    leftGroups.sort(sorter);
    rightGroups.sort(sorter);

    // --- D. 智能平衡逻辑 (Best Fit) ---

    // 辅助：获取列表总高度 (按钮总数)
    const getHeight = (list) => list.reduce((sum, g) => sum + g.count, 0);

    let maxLoop = 20; // 防止死循环保险

    while (maxLoop > 0) {
        maxLoop--;

        const lH = getHeight(leftGroups);
        const rH = getHeight(rightGroups);
        const diff = lH - rH;

        // 如果高度差 <= 1，已经完美，停止
        if (Math.abs(diff) <= 1) break;

        // 计算我们需要移动的"理想大小" (差值的一半)
        // 例如左比右高 5，我们需要移 2.5 过去，最理想是移一个 size=2 或 size=3 的组
        const targetMoveSize = Math.abs(diff) / 2;

        // 确定源列表(高)和目标列表(矮)
        const sourceList = diff > 0 ? leftGroups : rightGroups;
        const targetList = diff > 0 ? rightGroups : leftGroups;

        // [核心算法] 在源列表中寻找"最佳匹配"
        // 我们要找一个组，它的 size 与 targetMoveSize 的差距最小
        let bestIndex = -1;
        let minDist = Infinity;

        sourceList.forEach((group, index) => {
            const dist = Math.abs(group.count - targetMoveSize);
            // 找到更接近的，或者一样接近但更靠前的(也就是更小的，保持金字塔倾向)
            if (dist < minDist) {
                minDist = dist;
                bestIndex = index;
            }
        });

        // 如果找不到可移的 (理论上不可能，除非列表为空)，跳出
        if (bestIndex === -1) break;

        // 检查：如果移动这个最佳组，是否会让情况变差？
        // 比如 diff=3，target=1.5。最佳组 size=5。移过去后 diff变为 -7 (反向更差)。
        // 此时应该停止，或者尝试移个小的。但在"高度优先"逻辑下，停止比较安全。
        const candidateSize = sourceList[bestIndex].count;
        const currentImbalance = Math.abs(diff);
        const newImbalance = Math.abs((lH - (diff > 0 ? candidateSize : -candidateSize)) - (rH + (diff > 0 ? candidateSize : -candidateSize)));

        // 只有当移动能减小(或不增加)失衡度时才移动
        // 如果无法优化了（例如只剩一个巨大的组，移不移都歪），则停止
        if (newImbalance >= currentImbalance) break;

        // 执行移动
        const groupToMove = sourceList.splice(bestIndex, 1)[0];
        targetList.push(groupToMove); // 先随便放到底部，稍后会重排
    }

    // --- E. 最终重排 (Final Re-sort) ---
    // 这一步至关重要！
    // 因为刚才的"智能搬运"可能把一个大组(size=3)移到了原本全是小组(size=1)的列表里。
    // 我们必须再次排序，让这个新来的大组沉到底部，维持金字塔视觉重心。
    leftGroups.sort(sorter);
    rightGroups.sort(sorter);

    // --- F. 展平输出 ---
    const flatten = (groups) => groups.flatMap(g => g.items);

    return {
        leftList: flatten(leftGroups),
        rightList: flatten(rightGroups)
    };
}
