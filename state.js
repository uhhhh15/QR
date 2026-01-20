export const sharedState = {
    menuVisible: false,
    domElements: {
        rocketButton: null,
        menu: null,
        backdrop: null // 新增
    }
};

export function setMenuVisible(visible) {
    sharedState.menuVisible = visible;
}