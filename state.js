export const sharedState = {
    menuVisible: false,
    domElements: {
        rocketButton: null,
        menu: null,
        backdrop: null 
    }
};

export function setMenuVisible(visible) {
    sharedState.menuVisible = visible;
}
