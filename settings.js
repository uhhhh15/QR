// settings.js
import { extension_settings } from "../../../extensions.js";
import * as Constants from './constants.js';
import { sharedState, setMenuVisible } from './state.js';
import { updateMenuVisibilityUI } from './ui.js'; // To hide menu when disabled

/**
 * Creates the HTML for the settings panel.
 * @returns {string} HTML string for the settings.
 */
export function createSettingsHtml() {
    return `
    <div id="${Constants.ID_SETTINGS_CONTAINER}" class="extension-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>快速回复增强菜单</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
            </div>
            <div class="inline-drawer-content">
                <p>此插件隐藏了原有的快捷回复栏，并创建了一个新的快速回复菜单。</p>
                <p>点击屏幕中央顶部的"[快速回复]"按钮可以打开菜单。</p>
                <div class="flex-container flexGap5">
                    <label for="${Constants.ID_SETTINGS_ENABLED_DROPDOWN}">插件状态:</label>
                    <select id="${Constants.ID_SETTINGS_ENABLED_DROPDOWN}" class="text_pole">
                        <option value="true">启用</option>
                        <option value="false">禁用</option>
                    </select>
                </div>
                <hr class="sysHR">
            </div>
        </div>
    </div>`;
}

// Debounce function (simple version)
let saveTimeout;
function saveSettingsDebounced() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        console.log(`[${Constants.EXTENSION_NAME}] (Debounced) Settings would be saved now.`);
        // Placeholder for actual save call, e.g., using context if available
        // if (typeof context !== 'undefined' && context.saveExtensionSettings) {
        //     context.saveExtensionSettings();
        // }
    }, 500);
}


/**
 * Handles changes in the extension's enabled setting dropdown.
 * @param {Event} event
 */
export function handleSettingsChange(event) {
    const isEnabled = event.target.value === 'true';
    extension_settings[Constants.EXTENSION_NAME].enabled = isEnabled;
    saveSettingsDebounced();

    if (sharedState.domElements.button) {
        sharedState.domElements.button.style.display = isEnabled ? '' : 'none';
    }
    if (!isEnabled) {
        setMenuVisible(false); // Update state
        updateMenuVisibilityUI(); // Update UI based on new state
    }
    console.log(`[${Constants.EXTENSION_NAME}] Enabled status set to: ${isEnabled}`);
}

/**
 * Loads initial settings and applies them.
 */
export function loadAndApplySettings() {
     // Ensure settings object exists and default to enabled=true if not set
    const currentSetting = extension_settings[Constants.EXTENSION_NAME]?.enabled;
    const isEnabled = currentSetting !== false; // Treat undefined as true
    extension_settings[Constants.EXTENSION_NAME] = { enabled: isEnabled }; // Store consistent state

    // Apply initial state to UI elements
    const dropdown = sharedState.domElements.settingsDropdown;
     if (dropdown) {
        dropdown.value = String(isEnabled);
     }
    if (!isEnabled && sharedState.domElements.button) {
        sharedState.domElements.button.style.display = 'none';
    }

     console.log(`[${Constants.EXTENSION_NAME}] Initial enabled state: ${isEnabled}`);
}
