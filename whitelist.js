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
    const elementsToReset = qrBar.querySelectorAll('.qrq-whitelisted-original, .qrq-hidden-by-plugin, .qrq-wrapper-visible');
    elementsToReset.forEach(el => el.classList.remove('qrq-whitelisted-original', 'qrq-hidden-by-plugin', 'qrq-wrapper-visible'));

    if (!pluginEnabled) {
        document.body.classList.remove('qra-enabled');
        document.body.classList.add('qra-disabled');
        return;
    }
    document.body.classList.add('qra-enabled');

    // --- LWB 按钮特殊处理 (因为它们没有容器，是单个按钮) ---
    if (window.XBTasks) {
        const lwbButtons = qrBar.querySelectorAll('.xiaobaix-task-button');
        lwbButtons.forEach(btn => {
            const taskName = btn.dataset.taskName;
            // 查找 scope 需要遍历任务列表，这里简化假设或需优化。
            // 暂时尝试匹配 ID 格式
            // 由于 LWB 按钮不像容器那么好定位，我们尝试所有可能的 scope 组合
            // 或者更简单的：如果白名单里有包含该 taskName 的 LWB 项
            const isWhite = userWhitelist.some(wid => wid.includes(`::${taskName}`) && wid.startsWith('LWB::'));
            if (isWhite) {
                btn.classList.add('qrq-whitelisted-original');
            } else {
                btn.classList.add('qrq-hidden-by-plugin');
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

    if (wrapper) {
        // 处理 Wrapper 内部
        processList(wrapper.querySelectorAll('.qr--buttons, [id^="script_container_"]'));
        
        // 决定 Wrapper 是否可见：只要内部有任何白名单元素 (class qrq-whitelisted-original) 或 内置白名单元素
        const hasWhitelistedInner = wrapper.querySelector('.qrq-whitelisted-original');
        // 同时检查内置白名单元素是否存在于 wrapper 内 (例如 input_helper_toolbar)
        const hasBuiltIn = Constants.BUILTIN_WHITELIST.some(id => wrapper.querySelector(`#${id}`));

        if (hasWhitelistedInner || hasBuiltIn) {
            wrapper.classList.add('qrq-wrapper-visible');
        } else {
            wrapper.classList.add('qrq-hidden-by-plugin');
        }
    }

    // 处理直接子元素 (无论是否有 Wrapper，有些元素可能还在外面)
    processList(qrBar.querySelectorAll('#qr--bar > .qr--buttons, #qr--bar > [id^="script_container_"]'));

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
        else if (source === 'LittleWhiteBox') id = `LWB::${btn.dataset.taskScope}::${btn.dataset.taskId}`;

        // 同时检查用户白名单和内置白名单
        if (id && checkIsWhitelisted(id, whitelist)) {
            btn.style.display = 'none';
        } else {
            btn.style.display = 'flex'; // action-item 是 flex
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