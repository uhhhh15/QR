// whitelist.js (Refactored)
import * as Constants from './constants.js';
import { fetchQuickReplies } from './api.js';

// 检查某个 ID 是否在白名单中 (合并用户定义 + 内置)
function checkIsWhitelisted(id, userWhitelist) {
    if (!id) return false;
    // 1. 检查内置白名单
    if (Constants.BUILTIN_WHITELIST.includes(id)) return true;
    // 2. 检查用户白名单
    return userWhitelist.includes(id);
}

// 核心处理函数
function processElement(element, userWhitelist, qrApi) {
    if (!element || !element.classList) return;

    let idToCheck = null;

    // 1. 识别 Input Helper / Custom Buttons (通过内置白名单处理)
    if (element.id && Constants.BUILTIN_WHITELIST.includes(element.id)) {
        idToCheck = element.id;
    }
    // 2. 识别 JSR 容器
    else if (element.id && element.id.startsWith('script_container_')) {
        const scriptId = element.id.substring('script_container_'.length);
        idToCheck = `JSR::${scriptId}`;
    }
    // 3. 识别 QR v2 Set 容器
    else if (element.classList.contains('qr--buttons')) {
        // 需要从 API 反查 Set Name
        // 简单遍历缓存策略
        const sets = getAllQrSets(qrApi);
        const setData = sets.get(element);
        if (setData?.name) {
            idToCheck = `QRV2::${setData.name}`;
        }
    }

    // 决策显隐
    if (idToCheck && checkIsWhitelisted(idToCheck, userWhitelist)) {
        // 白名单：显示，并标记为 'whitelisted'
        element.classList.add('qrq-whitelisted-original');
        element.classList.remove('qrq-hidden-by-plugin');
    } else if (idToCheck) {
        // 已知类型但非白名单：隐藏
        element.classList.add('qrq-hidden-by-plugin');
        element.classList.remove('qrq-whitelisted-original');
    }
    // 未知类型元素 (如 input_text 等) 不做处理，保持原样
}

// 缓存 QR Sets 映射 (复用原逻辑但简化)
let allQrSetsCache = new Map();
function getAllQrSets(qrApi) {
    // 简单重新构建 map，不进行复杂的 diff 检查，保证准确性
    allQrSetsCache.clear();
    const collect = (list) => {
        list?.forEach(link => {
            if (link?.set?.dom && link.set.name) allQrSetsCache.set(link.set.dom, { name: link.set.name });
        });
    };
    collect(qrApi?.settings?.config?.setList);
    collect(qrApi?.settings?.chatConfig?.setList);
    collect(qrApi?.settings?.charConfig?.setList);
    return allQrSetsCache;
}

export function applyWhitelistDOMChanges() {
    const qrBar = document.getElementById('qr--bar');
    if (!qrBar) return;

    // 确保 settings 存在，防止初始化未完成时报错
    const settings = window.SillyTavern?.getContext()?.extensionSettings?.[Constants.EXTENSION_NAME];
    if (!settings) return;

    const userWhitelist = Array.isArray(settings.whitelist) ? settings.whitelist : [];
    const pluginEnabled = settings?.enabled !== false;
    const qrApi = window.quickReplyApi;

    // 清理旧状态
    const elementsToReset = qrBar.querySelectorAll('.qrq-whitelisted-original, .qrq-hidden-by-plugin, .qrq-wrapper-visible, .qrq-mixed-content');
    elementsToReset.forEach(el => el.classList.remove('qrq-whitelisted-original', 'qrq-hidden-by-plugin', 'qrq-wrapper-visible', 'qrq-mixed-content'));

    if (!pluginEnabled) {
        document.body.classList.remove('qra-enabled');
        document.body.classList.add('qra-disabled');
        return;
    }
    document.body.classList.add('qra-enabled');

    // --- 第三方特殊按钮预处理 (原子级标记) ---
    // 修复：使用 querySelectorAll + 属性选择器找到所有 ID 为 pt-wb-common-button 的元素
    // 因为该插件可能会在 fallback 容器和 script 容器中创建多个同名 ID 元素
    const commonBtns = document.querySelectorAll('[id="pt-wb-common-button"]');
    const fallbackBar = document.getElementById('pt-wb-common-fallback-bar');
    const isCommonWhitelisted = userWhitelist.includes('pt-wb-common-button');

    // 1. 处理后备容器 (Fallback Bar) - 即幽灵容器
    if (fallbackBar) {
        if (isCommonWhitelisted) {
            fallbackBar.classList.remove('qrq-hidden-by-plugin');
            // 如果是在 fallback 容器里，通常不需要 whitelisted-original 标记来强制 display:flex
            // 只需要移除隐藏类即可，让其保持原样
        } else {
            fallbackBar.classList.add('qrq-hidden-by-plugin');
        }
    }

    // 2. 处理具体的按钮实例 (包括寄生在 script_container 中的和 fallback 中的)
    commonBtns.forEach(btn => {
        if (isCommonWhitelisted) {
            btn.classList.add('qrq-whitelisted-original');
            btn.classList.remove('qrq-hidden-by-plugin');
        } else {
            // 关键：显式添加隐藏类。
            // 即使它的父容器 (script_container) 被白名单放行显示了，
            // 这一行也能确保该按钮自身被 CSS 的 display: none !important 隐藏。
            btn.classList.add('qrq-hidden-by-plugin');
            btn.classList.remove('qrq-whitelisted-original');
        }
    });

    // --- LWB 按钮特殊处理 (因为它们没有容器，是单个按钮) ---
    if (window.XBTasks) {
        // 获取当前角色的所有任务名，用于比对
        let charTasksNames = new Set();
        if (window.XBTasks.character && Array.isArray(window.XBTasks.character)) {
            window.XBTasks.character.forEach(t => charTasksNames.add(t.name));
        }

        const lwbButtons = qrBar.querySelectorAll('.xiaobaix-task-button');
        lwbButtons.forEach(btn => {
            const taskName = btn.dataset.taskName;
            let isWhite = false;

            // 判断该任务是否属于当前角色
            if (charTasksNames.has(taskName)) {
                // 如果是角色任务，检查统一的集合 ID
                isWhite = userWhitelist.includes('LWB::Character_Set');
            } else {
                // 如果是全局或预设任务，检查具体的任务 ID
                // ID 格式: LWB::{scope}::{taskName}
                // 这里使用模糊匹配或精确匹配
                isWhite = userWhitelist.some(wid => wid.endsWith(`::${taskName}`) && wid.startsWith('LWB::'));
            }

            if (isWhite) {
                btn.classList.add('qrq-whitelisted-original');
            } else {
                btn.classList.add('qrq-hidden-by-plugin');
            }
        });
    }

    // --- LWB 按钮去重处理 (修复非合并模式下的双重显示) ---
    // 原因：LWB 可能会在多个容器(如 QR Bar 和 JSR Script Container)中同时注入相同的按钮。
    // 如果这些容器都被判定为 "Mixed Content"，会导致按钮重复出现。
    if (window.XBTasks) {
        const seenTasks = new Set();
        // 再次查询所有刚才被标记为白名单的 LWB 按钮
        const whiteLwbButtons = qrBar.querySelectorAll('.xiaobaix-task-button.qrq-whitelisted-original');

        whiteLwbButtons.forEach(btn => {
            const name = btn.dataset.taskName;
            if (name) {
                if (seenTasks.has(name)) {
                    // 如果这个任务名已经出现过（即重复项），强制移除白名单标记并隐藏
                    // 这样它所在的容器就不会因为这个按钮而被误判为 Mixed Content
                    btn.classList.remove('qrq-whitelisted-original');
                    btn.classList.add('qrq-hidden-by-plugin');
                } else {
                    seenTasks.add(name);
                }
            }
        });
    }

    // --- 容器处理 (支持 ST 合并模式 Wrapper) ---
    // 查找是否包裹在 wrapper 中
    let wrapper = null;
    for (const child of qrBar.children) {
        // Wrapper 特征：没有ID，包含 qr--buttons 子元素
        if (!child.id && child.querySelector('.qr--buttons')) {
            wrapper = child;
            break;
        }
    }

    const processList = (elements) => {
        elements.forEach(el => processElement(el, userWhitelist, qrApi));
    };

    // --- 核心逻辑优化：处理所有容器 (包括 Wrapper 内部和外部) ---
    // 1. 首先运行基础显隐逻辑 (这会标记 qrq-hidden-by-plugin 或 qrq-whitelisted-original)
    const allContainers = qrBar.querySelectorAll('.qr--buttons, [id^="script_container_"]');
    processList(allContainers);

    // 2. 二次检查：处理"混合状态"
    // 在非合并模式下，LWB 按钮会被注入到 .qr--buttons 内部。
    // 如果 .qr--buttons 被上面的 processList 标记为隐藏，但内部有 LWB 白名单按钮，
    // 我们必须强制显示该容器，并标记为 mixed (CSS 会处理内部非白名单子元素的隐藏)。
    allContainers.forEach(container => {
        // 优化：如果容器是 JSR 脚本容器 (id^="script_container_") 且自身未被白名单，
        // 即使它里面混入了 LWB 按钮，我们通常也不应该将其作为混合容器显示。
        // 因为 LWB 按钮通常也会存在于主 QR 容器中（已被上面的去重逻辑保留）。
        // 强行显示 JSR 容器可能会导致布局混乱或重复。
        const isJsrContainer = container.id && container.id.startsWith('script_container_');
        const isSelfWhitelisted = container.classList.contains('qrq-whitelisted-original');

        if (isJsrContainer && !isSelfWhitelisted) {
            return; // 跳过 JSR 容器的混合检测
        }

        // 检查是否有子元素被标记为白名单显示
        const hasVisibleChild = container.querySelector('.qrq-whitelisted-original');

        if (hasVisibleChild) {
            // 如果容器本身被隐藏了，或者它需要作为混合容器显示
            if (container.classList.contains('qrq-hidden-by-plugin')) {
                container.classList.remove('qrq-hidden-by-plugin');
                container.classList.add('qrq-mixed-content');
            } else if (!isSelfWhitelisted) {
                // 容器本身没被白名单选中（正常显示），但也可能处于混合状态
                // 这种情况下添加 mixed 类可以确保 CSS 隐藏掉不需要的普通子元素
                container.classList.add('qrq-mixed-content');
            }
        }
    });

    // --- Wrapper 特殊处理 (保持原有的 ST 合并模式逻辑) ---
    if (wrapper) {
        // 检查 Wrapper 内部是否有可见内容 (白名单原子元素、内置元素、或混合容器)
        const hasWhitelistedInner = wrapper.querySelector('.qrq-whitelisted-original');
        const hasBuiltIn = Constants.BUILTIN_WHITELIST.some(id => wrapper.querySelector(`#${id}`));
        const hasMixed = wrapper.querySelector('.qrq-mixed-content');

        if (hasWhitelistedInner || hasBuiltIn || hasMixed) {
            wrapper.classList.add('qrq-wrapper-visible');
        } else {
            wrapper.classList.add('qrq-hidden-by-plugin');
        }
    }

    // 过滤菜单项显示 (如果已在白名单显示，则从菜单中移除)
    filterMenuItems(userWhitelist);
}

function filterMenuItems(whitelist) {
    // 隐藏菜单中那些已经在白名单里的项目
    const items = document.querySelectorAll(`.${Constants.CLASS_ACTION_ITEM}`);
    items.forEach(btn => {
        let id = '';
        const source = btn.dataset.source;
        if (source === 'JSSlashRunner') id = `JSR::${btn.dataset.scriptId}`;
        else if (source === 'QuickReplyV2') id = `QRV2::${btn.dataset.setName}`;
        else if (source === 'LittleWhiteBox') {
            // 特殊处理 LWB 角色任务
            if (btn.dataset.taskScope === 'character') {
                id = 'LWB::Character_Set';
            } else {
                id = `LWB::${btn.dataset.taskScope}::${btn.dataset.taskId}`;
            }
        }

        // 同时检查用户白名单和内置白名单
        // 修复 BUG：CSS 中 .action-item 设置了 display: flex !important
        // 因此普通的 btn.style.display = 'none' 无法生效
        // 必须使用 setProperty 加上 'important' 优先级
        if (id && checkIsWhitelisted(id, whitelist)) {
            btn.style.setProperty('display', 'none', 'important');
        } else {
            btn.style.setProperty('display', 'flex', 'important');
        }
    });
}

// 简单的防抖观察者
let debounceTimer = null;
export function observeBarMutations() {
    const target = document.getElementById('send_form') || document.body;
    const obs = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            applyWhitelistDOMChanges();

            // 修复：当按钮栏发生变动（如JSR脚本启用/禁用）时，实时刷新设置面板中的白名单列表
            if (window.quickReplyMenu && typeof window.quickReplyMenu.populateWhitelistManagementUI === 'function') {
                // 仅在列表容器存在于DOM中时执行（即设置面板已加载）
                if (document.getElementById('qrq-non-whitelisted-list')) {
                    window.quickReplyMenu.populateWhitelistManagementUI();
                }
            }
        }, 200);
    });
    obs.observe(target, { childList: true, subtree: true });
}