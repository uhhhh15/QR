// state.js

// Use an object to allow modifications from other modules
export const sharedState = {
    menuVisible: false,
    domElements: {
        rocketButton: null,
        menu: null,
        chatItemsContainer: null,
        globalItemsContainer: null,
        settingsDropdown: null,
    }
};

/**
 * Updates the menu visibility state.
 * @param {boolean} visible
 */
export function setMenuVisible(visible) {
    sharedState.menuVisible = visible;
}
