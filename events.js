// events.js
import { sharedState, setMenuVisible } from './state.js';
import { updateMenuVisibilityUI } from './ui.js';
import { triggerQuickReply } from './api.js';
import { handleSettingsChange as settingsChangeHandler } from './settings.js'; // Alias import


/**
 * Handles clicks on the main quick reply button. Toggles menu visibility state and updates UI.
 */
export function handleButtonClick() {
    setMenuVisible(!sharedState.menuVisible); // Toggle state
    updateMenuVisibilityUI(); // Update UI based on new state
}

/**
 * Handles clicks outside the menu to close it.
 * @param {Event} event
 */
export function handleOutsideClick(event) {
    const { menu, button } = sharedState.domElements;
    if (sharedState.menuVisible &&
        menu && button &&
        !menu.contains(event.target) &&
        event.target !== button &&
        !button.contains(event.target)
       ) {
        setMenuVisible(false); // Update state
        updateMenuVisibilityUI(); // Update UI
    }
}

/**
 * Handles clicks on individual quick reply items (buttons).
 * Reads data attributes and triggers the API call.
 * @param {Event} event The click event on the button.
 */
export async function handleQuickReplyClick(event) {
    const button = event.currentTarget; // Get the button that was clicked
    const setName = button.dataset.setName;
    const label = button.dataset.label;

    if (!setName || !label) {
        console.error(`[${Constants.EXTENSION_NAME}] Missing data-set-name or data-label on clicked item.`);
        setMenuVisible(false); // Close menu on error
        updateMenuVisibilityUI();
        return;
    }

    await triggerQuickReply(setName, label); // Await the API call

    // Always close the menu after attempting to trigger, regardless of success/failure
    setMenuVisible(false);
    updateMenuVisibilityUI();
}


/**
 * Sets up all event listeners for the plugin.
 */
export function setupEventListeners() {
    const { button, settingsDropdown } = sharedState.domElements;

    button?.addEventListener('click', handleButtonClick);
    document.addEventListener('click', handleOutsideClick);

    // Item click listeners are added dynamically in ui.js (createQuickReplyItem),
    // but they all point to handleQuickReplyClick defined here.

    // Settings listener
    settingsDropdown?.addEventListener('change', settingsChangeHandler); // Use imported handler
}
