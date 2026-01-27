import { sharedState, setMenuVisible } from './state.js';
import { updateMenuVisibilityUI } from './ui.js';
import { triggerQuickReply, triggerJsRunnerScript, triggerLwbTask, triggerRawDom } from './api.js';
import * as Constants from './constants.js';
import { Logger, LogCategory } from './logger.js';

export function handleRocketButtonClick() {
    Logger.info(LogCategory.CORE, '用户点击菜单按钮 - DOM 快照:', {
        domStructure: Logger.getDomStructure('send_form')
    });

    setMenuVisible(!sharedState.menuVisible);
    updateMenuVisibilityUI();
}

export function handleOutsideClick(event) {
    const { menu, rocketButton } = sharedState.domElements;
    // 点击菜单外部关闭
    if (sharedState.menuVisible && menu && !menu.contains(event.target) && !rocketButton.contains(event.target)) {
        setMenuVisible(false);
        updateMenuVisibilityUI();
    }
}

export function handleQuickReplyClick(event) {
    const button = event.currentTarget;
    // 增加 domId 到解构列表
    const { label, isStandard, setName, source, isApiBased, buttonId, scriptId, taskId, domId } = button.dataset;

    // 关闭菜单
    setMenuVisible(false);
    updateMenuVisibilityUI();

    if (source === 'JSSlashRunner') {
        triggerJsRunnerScript({ isApiBased: isApiBased === 'true', buttonId, scriptId });
    } else if (source === 'LittleWhiteBox') {
        triggerLwbTask(taskId);
    } else if (source === 'RawDomElement') {
        // 触发原生 DOM 点击
        triggerRawDom(domId);
    } else {
        triggerQuickReply(setName, label);
    }
}

export function setupEventListeners() {
    const btn = sharedState.domElements.rocketButton;
    if (btn) btn.addEventListener('click', handleRocketButtonClick);
    document.addEventListener('click', handleOutsideClick, true);
    // 设置面板监听在 settings.js 中处理
}
