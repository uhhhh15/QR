// settings.js
import { extension_settings } from "./index.js";
import * as Constants from './constants.js';
import { sharedState } from './state.js';
// import { updateMenuVisibilityUI } from './ui.js'; // 不再需要

/**
 * 更新按钮图标显示 (核心逻辑)
 * 根据设置使用不同的图标、大小和颜色风格
 */
export function updateIconDisplay() {
    const button = sharedState.domElements.rocketButton;
    if (!button) return;

    const settings = extension_settings[Constants.EXTENSION_NAME];
    const iconType = settings.iconType || Constants.ICON_TYPES.ROCKET;
    const customIconUrl = settings.customIconUrl || '';
    const customIconSize = settings.customIconSize || Constants.DEFAULT_CUSTOM_ICON_SIZE;
    const faIconCode = settings.faIconCode || '';
    const matchColors = settings.matchButtonColors !== false;

    // 1. 清除按钮现有内容和样式
    button.innerHTML = '';
    // 移除可能存在的 primary/secondary 类，稍后根据 matchColors 再添加
    button.classList.remove('primary-button', 'secondary-button');
    // 重置背景相关样式
    button.style.backgroundImage = '';
    button.style.backgroundSize = '';
    button.style.backgroundPosition = '';
    button.style.backgroundRepeat = '';
    // 添加基础类
    button.classList.add('interactable'); // 保留 interactable

    // 2. 根据图标类型设置内容
    if (iconType === Constants.ICON_TYPES.CUSTOM && customIconUrl) {
        const customContent = customIconUrl.trim();
        const sizeStyle = `${customIconSize}px ${customIconSize}px`;

        if (customContent.startsWith('<svg') && customContent.includes('</svg>')) {
            const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(customContent);
            button.style.backgroundImage = `url('${svgDataUrl}')`;
            button.style.backgroundSize = sizeStyle;
            button.style.backgroundPosition = 'center';
            button.style.backgroundRepeat = 'no-repeat';
        }
        else if (customContent.startsWith('data:') || customContent.startsWith('http') || /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(customContent)) {
            button.style.backgroundImage = `url('${customContent}')`;
            button.style.backgroundSize = sizeStyle;
            button.style.backgroundPosition = 'center';
            button.style.backgroundRepeat = 'no-repeat';
        }
         else if (customContent.includes('base64,')) {
            let imgUrl = customContent;
            if (!customContent.startsWith('data:')) {
                 // 尝试猜测常见的图片类型，如果失败，浏览器可能无法渲染
                const possibleType = customContent.substring(0, 10).includes('PNG') ? 'image/png' : 'image/jpeg';
                imgUrl = `data:${possibleType};base64,` + customContent.split('base64,')[1];
            }
            button.style.backgroundImage = `url('${imgUrl}')`;
            button.style.backgroundSize = sizeStyle;
            button.style.backgroundPosition = 'center';
            button.style.backgroundRepeat = 'no-repeat';
        } else {
            button.textContent = '?'; // 无法识别的格式
            console.warn(`[${Constants.EXTENSION_NAME}] 无法识别的自定义图标格式`);
        }
    } else if (iconType === Constants.ICON_TYPES.FONTAWESOME && faIconCode) {
        // 直接将用户提供的 HTML 代码（应该是 <i> 标签）插入按钮
        // 颜色将由按钮的 primary/secondary 类和 FA 的 CSS 控制
        button.innerHTML = faIconCode.trim();
    } else {
        // 使用预设的 FontAwesome 图标
        const iconClass = Constants.ICON_CLASS_MAP[iconType] || Constants.ICON_CLASS_MAP[Constants.ICON_TYPES.ROCKET];
        if (iconClass) {
            // 创建 i 标签并设置类，插入按钮
            // 颜色将由按钮的 primary/secondary 类和 FA 的 CSS 控制
            button.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        } else {
            // 默认或回退图标
             button.innerHTML = `<i class="fa-solid ${Constants.ICON_CLASS_MAP[Constants.ICON_TYPES.ROCKET]}"></i>`;
        }
    }

    // 3. 应用颜色匹配设置（通过添加类）
    const sendButton = document.getElementById('send_but');
    let buttonClassToAdd = 'secondary-button'; // 默认

    if (matchColors && sendButton) {
        // 如果勾选了匹配颜色，并且发送按钮存在
        if (sendButton.classList.contains('primary-button')) {
            buttonClassToAdd = 'primary-button';
        }
        // 如果发送按钮是 secondary-button 或其他情况，我们使用默认的 secondary-button
    }
    // else: 如果未勾选匹配或找不到发送按钮，也使用默认的 secondary-button

    button.classList.add(buttonClassToAdd); // 添加正确的按钮类
    button.style.color = ''; // 清除可能存在的内联颜色，让 CSS 类生效
}


/**
 * Creates the HTML for the settings panel.
 * @returns {string} HTML string for the settings.
 */
export function createSettingsHtml() {
    // 菜单样式设置面板
    const stylePanel = `
    <div id="${Constants.ID_MENU_STYLE_PANEL}">
        <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
            <h3>菜单样式设置</h3>
            <button class="menu_button" id="${Constants.ID_MENU_STYLE_PANEL}-close" style="width:auto; padding:0 10px;">
                <i class="fa-solid fa-times"></i>
            </button>
        </div>
        
        <div class="quick-reply-style-group">
            <h4>菜单项样式</h4>
            <div class="quick-reply-settings-row">
                <label>菜单项背景:</label>
                <div class="color-picker-container">
                    <input type="color" id="qr-item-bgcolor-picker" class="qr-color-picker">
                    <input type="text" id="qr-item-bgcolor-text" class="qr-color-text-input" placeholder="#RRGGBB">
                </div>
                <div class="slider-container">
                    <input type="range" id="qr-item-opacity" min="0" max="1" step="0.1" value="0.7" class="qr-opacity-slider">
                    <span id="qr-item-opacity-value" class="opacity-value">0.7</span>
                </div>
            </div>
            <div class="quick-reply-settings-row">
                <label>菜单项文字:</label>
                <div class="color-picker-container">
                    <input type="color" id="qr-item-color-picker" class="qr-color-picker">
                    <input type="text" id="qr-item-color-text" class="qr-color-text-input" placeholder="#RRGGBB">
                </div>
            </div>
        </div>
        
        <div class="quick-reply-style-group">
            <h4>标题样式</h4>
            <div class="quick-reply-settings-row">
                <label>标题文字:</label>
                <div class="color-picker-container">
                    <input type="color" id="qr-title-color-picker" class="qr-color-picker">
                    <input type="text" id="qr-title-color-text" class="qr-color-text-input" placeholder="#RRGGBB">
                </div>
            </div>
            <div class="quick-reply-settings-row">
                <label>分割线:</label>
                <div class="color-picker-container">
                    <input type="color" id="qr-title-border-picker" class="qr-color-picker">
                    <input type="text" id="qr-title-border-text" class="qr-color-text-input" placeholder="#RRGGBB">
                </div>
            </div>
        </div>
        
        <div class="quick-reply-style-group">
            <h4>空提示样式</h4>
            <div class="quick-reply-settings-row">
                <label>提示文字:</label>
                <div class="color-picker-container">
                    <input type="color" id="qr-empty-color-picker" class="qr-color-picker">
                    <input type="text" id="qr-empty-color-text" class="qr-color-text-input" placeholder="#RRGGBB">
                </div>
            </div>
        </div>
        
        <div class="quick-reply-style-group">
            <h4>菜单面板样式</h4>
            <div class="quick-reply-settings-row">
                <label>菜单背景:</label>
                <div class="color-picker-container">
                    <input type="color" id="qr-menu-bgcolor-picker" class="qr-color-picker">
                    <input type="text" id="qr-menu-bgcolor-text" class="qr-color-text-input" placeholder="#RRGGBB">
                </div>
                <div class="slider-container">
                    <input type="range" id="qr-menu-opacity" min="0" max="1" step="0.1" value="0.85" class="qr-opacity-slider">
                    <span id="qr-menu-opacity-value" class="opacity-value">0.85</span>
                </div>
            </div>
            <div class="quick-reply-settings-row">
                <label>菜单边框:</label>
                <div class="color-picker-container">
                    <input type="color" id="qr-menu-border-picker" class="qr-color-picker">
                    <input type="text" id="qr-menu-border-text" class="qr-color-text-input" placeholder="#RRGGBB">
                </div>
            </div>
        </div>
        
        <div style="display:flex; justify-content:space-between; margin-top:20px;">
            <button class="menu_button" id="${Constants.ID_RESET_STYLE_BUTTON}" style="width:auto; padding:0 10px;">
                <i class="fa-solid fa-rotate-left"></i> 恢复默认
            </button>
            <button class="menu_button" id="${Constants.ID_MENU_STYLE_PANEL}-apply" style="width:auto; padding:0 10px;">
                <i class="fa-solid fa-check"></i> 应用样式
            </button>
        </div>
    </div>
    `;

    // 使用说明面板 (需要更新内容)
    const usagePanel = `
    <div id="${Constants.ID_USAGE_PANEL}" class="qr-usage-panel">
        <div style="margin-bottom:7px;">
            <h3 style="color: white; font-weight: bold; margin: 0 0 7px 0;">使用说明</h3>
        </div>

        <div class="quick-reply-usage-content">
            <p><strong>该插件主要提供以下基本功能：</strong></p>
            <ul>
                <li>通过点击发送按钮旁边的小图标，快速打开或关闭快速回复菜单。</li>
                <li>支持两种快速回复类型："聊天快速回复"（针对当前聊天）和"全局快速回复"（适用于所有聊天），方便分类管理。而前端助手制作的QR会被合并到聊天快速回复中。</li>
            </ul>

            <p><strong>以下是关于插件的详细设置</strong></p>

            <p><strong>首先，在基本设置中，你可以：</strong></p>
            <ul>
                <li>选择"启用"或"禁用"来控制插件的整体开关状态。</li>
                <li>选择显示在发送按钮旁边的图标样式，可选项包括：
                    <ul>
                        <li>小火箭（默认）</li>
                        <li>调色盘</li>
                        <li>星月</li>
                        <li>五芒星</li>
                        <li>Font Awesome（使用HTML代码复制）</li> 
                        <li>自定义图标（catbox的URL链接/SVG代码/上传的图片，图片形状可自行裁剪）</li> 
                    </ul>
                </li>
            </ul>

            <p><strong>其次，在图标设置部分：</strong></p>
            <ul>
                <li>若选择"自定义图标"：
                    <ul>
                        <li>可以通过输入图标的URL、base64编码或SVG代码来设置。</li>
                        <li>也可以点击"选择文件"上传本地图片。</li>
                        <li>旁边有一个数字输入框，可以调整图标在按钮上显示的大小（单位：像素）。</li>
                    </ul>
                </li>
                <li>若选择"Font Awesome"：
                    <ul>
                        <li>需要在一个文本框中输入完整的 Font Awesome 图标 HTML 代码（fontawesome.com），例如 <code><i class="fa-solid fa-camera"></i></code>。</li>
                        <li>图标的大小和颜色将尽量匹配按钮的样式。</li>
                    </ul>
                </li>
                <li>可以勾选"使用与发送按钮相匹配的颜色风格"，让图标颜色自动适配发送按钮的类别（但也有可能匹配不上o(╥﹏╥)o）。</li>
            </ul>

<p><strong>然后，你可以通过点击"菜单样式"按钮，来自定义快速回复菜单的外观：</strong></p>
            <ul>
                <li><strong>菜单项样式：</strong>
                    <ul>
                        <li>设置菜单项的背景颜色和透明度（通过滑动条调节）。</li>
                        <li>设置菜单项的文字颜色。</li>
                    </ul>
                </li>
                <li><strong>标题样式：</strong>
                    <ul>
                        <li>设置标题文字的颜色。</li>
                        <li>设置分割线的颜色。</li>
                    </ul>
                </li>
                <li><strong>其他样式设置：</strong>
                    <ul>
                        <li>设置无快速回复项时提示文字的颜色。</li>
                        <li>设置整个菜单面板的背景颜色、透明度和边框颜色。</li>
                    </ul>
                </li>
            </ul>
        
            <p><strong>调整样式后，有两个控制按钮可供使用：</strong></p>
            <ul>
                <li>恢复默认：将所有样式设置还原为初始状态。</li>
                <li>应用样式：保存并应用当前的样式修改。</li>
            </ul>
        
            <p><strong>这里有一些使用这款插件的小技巧：</strong></p>
            <ul>
                <li>可以点击QR助手的快速回复菜单的外部的任意区域直接关闭菜单。</li>
                <li>你可以通过更改图标类型和颜色，使其更好地匹配你的界面主题。</li>
                <li>可以直接上传图片、svg图标以及挂在图床上的链接作为按钮。</li>
            </ul>

            <p><strong>最后是关于数据保存：</strong></p>
            <p>完成所有配置（包括图标和样式设置）后，记得点击"保存设置"按钮来手动保存，以确保你的设置不会丢失。Font Awesome 图标（酒馆就是使用的这家免费图标）可以在官网 (fontawesome.com) 查找。</p>
            <p>有任何BUG、疑问或建议都欢迎反馈！</p>
        </div>

        <div style="text-align:center; margin-top:10px;">
            <button class="menu_button" id="${Constants.ID_USAGE_PANEL}-close" style="width:auto; padding:0 10px;">
                确定
            </button>
        </div>
    </div>
    `;

    // 在自定义图标的容器里添加保存按钮和选择下拉菜单
    const customIconContainer = `
        <div class="custom-icon-container" style="display: flex; flex-direction: column; gap: 10px;">
            <!-- 第一行：URL和大小 -->
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="flex: 3;">
                    <label>自定义图标URL:</label>
                    <input type="text" id="${Constants.ID_CUSTOM_ICON_URL}" style="width: 100%;" placeholder="输入URL或上传图片">
                </div>
                <div style="flex: 1;">
                    <label>图标大小:</label>
                    <input type="number" id="${Constants.ID_CUSTOM_ICON_SIZE_INPUT}" min="16" max="40" style="width: 100%;" value="${Constants.DEFAULT_CUSTOM_ICON_SIZE}">
                </div>
            </div>
            
            <!-- 第二行：使用表格布局确保三个元素在一行 -->
            <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0;">
                <tr>
                    <td style="width: 1%; white-space: nowrap;">
                        <label for="icon-file-upload" class="menu_button" style="display: inline-block; cursor: pointer; padding: 0 10px;">
                            <i class="fa-solid fa-upload"></i> 上传图片
                        </label>
                        <input type="file" id="icon-file-upload" accept="image/*" style="display: none;">
                    </td>
                    <td style="width: 1%; white-space: nowrap;">
                        <button id="${Constants.ID_CUSTOM_ICON_SAVE}" class="menu_button" style="padding: 0 10px;">
                            <i class="fa-solid fa-save"></i> 保存
                        </button>
                    </td>
                    <td>
                        <select id="${Constants.ID_CUSTOM_ICON_SELECT}" class="transparent-select" style="width: 100%;">
                            <option value="">-- 选择已保存图标 --</option>
                        </select>
                    </td>
                </tr>
            </table>
        </div>
    `;

    return `
    <div id="${Constants.ID_SETTINGS_CONTAINER}" class="extension-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>QR助手</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="flex-container flexGap5">
                    <label for="${Constants.ID_SETTINGS_ENABLED_DROPDOWN}">插件状态:</label>
                    <select id="${Constants.ID_SETTINGS_ENABLED_DROPDOWN}" class="text_pole">
                        <option value="true">启用</option>
                        <option value="false">禁用</option>
                    </select>
                </div>

                <hr class="sysHR">
                <div class="flex-container flexGap5">
                    <label for="${Constants.ID_ICON_TYPE_DROPDOWN}">图标类型:</label>
                    <select id="${Constants.ID_ICON_TYPE_DROPDOWN}" class="text_pole transparent-select" style="width:120px;">
                        <option value="${Constants.ICON_TYPES.ROCKET}">小火箭</option>
                        <option value="${Constants.ICON_TYPES.COMMENT}">调色盘</option>
                        <option value="${Constants.ICON_TYPES.STAR}">星月</option>
                        <option value="${Constants.ICON_TYPES.BOLT}">五芒星</option>
                        <option value="${Constants.ICON_TYPES.FONTAWESOME}">Font Awesome</option> 
                        <option value="${Constants.ICON_TYPES.CUSTOM}">自定义图标</option>
                    </select>
                </div>

                <div class="flex-container flexGap5 custom-icon-container" style="display: none; margin-top:10px; align-items: center;">
                    ${customIconContainer}
                </div>

                <div class="flex-container flexGap5 fa-icon-container" style="display: none; margin-top:10px;">
                    <label for="${Constants.ID_FA_ICON_CODE_INPUT}">FA 代码（fontawesome.com）:</label>
                    <input type="text" id="${Constants.ID_FA_ICON_CODE_INPUT}" class="text_pole" style="flex-grow:1;"
                           placeholder='粘贴 FontAwesome HTML, 如 <i class="fa-solid fa-house"></i>' />
                </div>

                <div class="flex-container flexGap5" style="margin:10px 0; align-items:center;">
                    <input type="checkbox" id="${Constants.ID_COLOR_MATCH_CHECKBOX}" style="margin-right:5px;" />
                    <label for="${Constants.ID_COLOR_MATCH_CHECKBOX}">
                        使用与发送按钮相匹配的颜色风格
                    </label>
                </div>

                <div style="display:flex; justify-content:space-between; margin-top:15px;">
                    <button id="${Constants.ID_MENU_STYLE_BUTTON}" class="menu_button" style="width:auto; padding:0 10px;">
                        <i class="fa-solid fa-palette"></i> 菜单样式
                    </button>
                    <button id="${Constants.ID_USAGE_BUTTON}" class="menu_button" style="width:auto; padding:0 10px;">
                        <i class="fa-solid fa-circle-info"></i> 使用说明
                    </button>
                    <button id="qr-save-settings" class="menu_button" style="width:auto; padding:0 10px;" onclick="window.quickReplyMenu.saveSettings()">
                        <i class="fa-solid fa-floppy-disk"></i> 保存设置
                    </button>
                </div>

                <hr class="sysHR">
                <div id="qr-save-status" style="text-align: center; color: #4caf50; height: 20px; margin-top: 5px;"></div>
            </div>
        </div>
    </div>${stylePanel}${usagePanel}`;
}


/**
 * 处理使用说明按钮点击
 */
export function handleUsageButtonClick() {
     // 确保使用更新后的 usagePanel 内容
    let usagePanel = document.getElementById(Constants.ID_USAGE_PANEL);
    if (usagePanel) {
        // 显示面板
        usagePanel.style.display = 'block';
        // 计算并设置面板位置...
         const windowHeight = window.innerHeight;
         const panelHeight = usagePanel.offsetHeight;
         const topPosition = Math.max(50, (windowHeight - panelHeight) / 2); // 尝试垂直居中，最小top为50px
         usagePanel.style.top = `${topPosition}px`;
         usagePanel.style.transform = 'translateX(-50%)';
    } else {
         // 如果不存在，则在 createSettingsHtml 中已经包含了它
         // 这里理论上不应该执行，除非 createSettingsHtml 失败
         console.error("Usage panel not found in DOM after settings creation.");
    }
}

/**
 * 关闭使用说明面板
 */
export function closeUsagePanel() {
    const usagePanel = document.getElementById(Constants.ID_USAGE_PANEL);
    if (usagePanel) {
        usagePanel.style.display = 'none';
    }
}

// 统一处理设置变更的函数
export function handleSettingsChange(event) {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    const targetId = event.target.id;

    // 处理不同控件的设置变更
    if (targetId === Constants.ID_SETTINGS_ENABLED_DROPDOWN) {
        const enabled = event.target.value === 'true';
        settings.enabled = enabled;
        document.body.classList.remove('qra-enabled', 'qra-disabled');
        document.body.classList.add(enabled ? 'qra-enabled' : 'qra-disabled');
        const rocketButton = document.getElementById(Constants.ID_ROCKET_BUTTON);
        if (rocketButton) {
            rocketButton.style.display = enabled ? 'flex' : 'none';
        }
    }
    else if (targetId === Constants.ID_ICON_TYPE_DROPDOWN) {
        settings.iconType = event.target.value;
        // 根据新选择的类型，更新相关输入框的显示状态
        const customIconContainer = document.querySelector('.custom-icon-container');
        const faIconContainer = document.querySelector('.fa-icon-container');

        if (customIconContainer) {
            customIconContainer.style.display = (settings.iconType === Constants.ICON_TYPES.CUSTOM) ? 'flex' : 'none';
        }
        if (faIconContainer) {
            faIconContainer.style.display = (settings.iconType === Constants.ICON_TYPES.FONTAWESOME) ? 'flex' : 'none';
        }
    }
    else if (targetId === Constants.ID_CUSTOM_ICON_URL) {
        // 获取输入框中的数据
        const inputValue = event.target.value;
        
        // 检查数据大小
        if (inputValue.length > 1000) {
            // 大型数据 - 存储在dataset中并显示占位符
            event.target.dataset.fullValue = inputValue;
            event.target.value = "[图片数据已保存，但不在输入框显示以提高性能]";
        } else {
            // 正常大小数据 - 直接存储
            delete event.target.dataset.fullValue;
        }
        
        // 无论如何都更新settings
        settings.customIconUrl = inputValue;
    }
    else if (targetId === Constants.ID_CUSTOM_ICON_SIZE_INPUT) { 
        settings.customIconSize = parseInt(event.target.value, 10) || Constants.DEFAULT_CUSTOM_ICON_SIZE;
    }
    else if (targetId === Constants.ID_FA_ICON_CODE_INPUT) { 
        settings.faIconCode = event.target.value;
    }
    else if (targetId === Constants.ID_COLOR_MATCH_CHECKBOX) {
        settings.matchButtonColors = event.target.checked;
    }

    // 每次设置变化后都更新火箭按钮图标显示
    updateIconDisplay(); // 使用本文件导出的函数

    // 变更后自动尝试保存 (如果需要的话)
    // saveSettings(); // 暂时注释掉，保留手动保存
}

// 保存设置
function saveSettings() {
    // 确保所有设置都已经更新到 extension_settings 对象
    const settings = extension_settings[Constants.EXTENSION_NAME];

    // 从 DOM 元素获取最新值 (虽然 handleSettingsChange 已经更新了内存中的 settings, 但这里作为双重保险)
    const enabledDropdown = document.getElementById(Constants.ID_SETTINGS_ENABLED_DROPDOWN);
    const iconTypeDropdown = document.getElementById(Constants.ID_ICON_TYPE_DROPDOWN);
    const customIconUrl = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
    const customIconSizeInput = document.getElementById(Constants.ID_CUSTOM_ICON_SIZE_INPUT); 
    const faIconCodeInput = document.getElementById(Constants.ID_FA_ICON_CODE_INPUT); 
    const colorMatchCheckbox = document.getElementById(Constants.ID_COLOR_MATCH_CHECKBOX);

    if (enabledDropdown) settings.enabled = enabledDropdown.value === 'true';
    if (iconTypeDropdown) settings.iconType = iconTypeDropdown.value;
    
    // 检查customIconUrl是否有存储在dataset中的完整值
    if (customIconUrl) {
        if (customIconUrl.dataset.fullValue) {
            settings.customIconUrl = customIconUrl.dataset.fullValue;
        } else {
            settings.customIconUrl = customIconUrl.value;
        }
    }
    
    if (customIconSizeInput) settings.customIconSize = parseInt(customIconSizeInput.value, 10) || Constants.DEFAULT_CUSTOM_ICON_SIZE; 
    if (faIconCodeInput) settings.faIconCode = faIconCodeInput.value; 
    if (colorMatchCheckbox) settings.matchButtonColors = colorMatchCheckbox.checked;

    // 触发一次图标更新，以防万一DOM值和内存值不一致
    updateIconDisplay();

    // 保存设置 (使用 context 或 localStorage)
    let saved = false;
    if (typeof context !== 'undefined' && context.saveExtensionSettings) {
        try {
            context.saveExtensionSettings();
            console.log(`[${Constants.EXTENSION_NAME}] 设置已通过 context.saveExtensionSettings() 保存`);
            saved = true;
        } catch (error) {
            console.error(`[${Constants.EXTENSION_NAME}] 通过 context.saveExtensionSettings() 保存设置失败:`, error);
        }
    }

    // 总是尝试保存到 localStorage 作为备份或主要方式
    try {
        localStorage.setItem('QRA_settings', JSON.stringify(settings));
        console.log(`[${Constants.EXTENSION_NAME}] 设置已保存到 localStorage`);
        saved = true; // 至少有一种方式保存成功
    } catch (e) {
        console.error(`[${Constants.EXTENSION_NAME}] 保存设置到 localStorage 失败:`, e);
    }

    return saved; // 返回保存是否至少有一种方式成功
}

/**
 * 辅助函数，安全地添加事件监听器
 */
function safeAddListener(id, event, handler) {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener(event, handler);
    } else {
        console.warn(`[${Constants.EXTENSION_NAME} Settings] Element not found: #${id}. Cannot add listener.`);
    }
}

/**
 * 设置事件监听器 (文件上传等)
 */
export function setupSettingsEventListeners() {
    // 使用说明按钮监听器
    const usageButton = document.getElementById(Constants.ID_USAGE_BUTTON); // 使用常量
    if (usageButton) {
        usageButton.addEventListener('click', handleUsageButtonClick);
    }

    // 使用说明面板关闭按钮监听器 (确保在 usagePanel 创建后或一直存在时能找到)
    // 注意：关闭按钮现在是 usagePanel 的一部分，监听器应在其显示时确保已添加
    // handleUsageButtonClick 函数内部可以处理添加监听器，或者假设它已在 createSettingsHtml 中设置好
    const usageCloseButton = document.getElementById(`${Constants.ID_USAGE_PANEL}-close`);
     if (usageCloseButton) {
         usageCloseButton.addEventListener('click', closeUsagePanel);
     }


    // 文件上传监听器
    const fileUpload = document.getElementById('icon-file-upload');
    if (fileUpload) {
        fileUpload.addEventListener('change', handleFileUpload);
    } else {
        console.warn(`[${Constants.EXTENSION_NAME}] 文件上传输入框未找到 (#icon-file-upload)`);
    }

    // 上传按钮点击事件 - 如果使用了label+input方案，这部分可能不需要
    const uploadButton = document.getElementById('custom-icon-upload');
    if (uploadButton) {
        uploadButton.addEventListener('click', () => {
            // 查找或创建文件输入框
            let fileInput = document.getElementById('icon-file-upload');
            if (!fileInput) {
                fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.id = 'icon-file-upload';
                fileInput.accept = 'image/*';
                fileInput.style.display = 'none';
                document.body.appendChild(fileInput);
                fileInput.addEventListener('change', handleFileUpload);
            }
            fileInput.click(); // 触发文件选择对话框
        });
    }

    // 添加保存按钮监听器
    const saveButton = document.getElementById('qr-save-settings');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            const success = saveSettings(); // 调用保存函数

            // 显示保存反馈
            const saveStatus = document.getElementById('qr-save-status');
            if (saveStatus) {
                if (success) {
                    saveStatus.textContent = '✓ 设置已保存';
                    saveStatus.style.color = '#4caf50';
                } else {
                    saveStatus.textContent = '✗ 保存失败';
                    saveStatus.style.color = '#f44336';
                }
                setTimeout(() => { saveStatus.textContent = ''; }, 2000);
            }

            // 更新按钮视觉反馈
             if (success) {
                const originalHTML = saveButton.innerHTML;
                const originalBg = saveButton.style.backgroundColor;
                saveButton.innerHTML = '<i class="fa-solid fa-check"></i> 已保存';
                saveButton.style.backgroundColor = '#4caf50'; // Green success
                setTimeout(() => {
                    saveButton.innerHTML = originalHTML;
                    saveButton.style.backgroundColor = originalBg;
                }, 2000);
             }
        });
    }

    safeAddListener(Constants.ID_CUSTOM_ICON_SAVE, 'click', saveCustomIcon);
    safeAddListener(Constants.ID_CUSTOM_ICON_SELECT, 'change', handleCustomIconSelect);
}

/**
 * 处理文件上传事件
 * @param {Event} event 文件上传事件
 */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const customIconUrlInput = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
        if (customIconUrlInput) {
            // 获取文件数据
            const fileData = e.target.result;
            
            // 检查数据大小并决定如何处理
            if (fileData.length > 1000) {
                // 大型数据 - 存储在dataset中并显示占位符
                customIconUrlInput.dataset.fullValue = fileData;
                customIconUrlInput.value = "[图片数据已保存，但不在输入框显示以提高性能]";
            } else {
                // 正常大小数据 - 直接存储
                customIconUrlInput.value = fileData;
                delete customIconUrlInput.dataset.fullValue;
            }
            
            // 更新设置对象 (始终使用完整数据)
            const settings = extension_settings[Constants.EXTENSION_NAME];
            settings.customIconUrl = fileData;

            // 更新图标显示
            updateIconDisplay();

            // 可以选择在这里自动保存或等待用户点击保存按钮
            // saveSettings(); // 如果需要自动保存
        }
    };
    reader.onerror = function(error) {
        console.error(`[${Constants.EXTENSION_NAME}] 读取文件失败:`, error);
    };
    reader.readAsDataURL(file);
}

/**
 * Loads initial settings and applies them to the UI elements in the settings panel.
 */
export function loadAndApplySettings() {
    // 确保设置对象存在并设置默认值
    const settings = extension_settings[Constants.EXTENSION_NAME] = extension_settings[Constants.EXTENSION_NAME] || {};

    // 设置默认值
    settings.enabled = settings.enabled !== false; // 默认启用
    settings.iconType = settings.iconType || Constants.ICON_TYPES.ROCKET;
    settings.customIconUrl = settings.customIconUrl || '';
    settings.customIconSize = settings.customIconSize || Constants.DEFAULT_CUSTOM_ICON_SIZE; 
    settings.faIconCode = settings.faIconCode || ''; 
    settings.matchButtonColors = settings.matchButtonColors !== false; // 默认匹配颜色

    // 应用设置到UI元素
    const enabledDropdown = document.getElementById(Constants.ID_SETTINGS_ENABLED_DROPDOWN);
    if (enabledDropdown) enabledDropdown.value = String(settings.enabled);

    const iconTypeDropdown = document.getElementById(Constants.ID_ICON_TYPE_DROPDOWN);
    if (iconTypeDropdown) iconTypeDropdown.value = settings.iconType;

    const customIconUrlInput = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
    if (customIconUrlInput) {
        // 检查customIconUrl的大小并相应处理
        if (settings.customIconUrl && settings.customIconUrl.length > 1000) {
            // 大型数据 - 存储在dataset中并显示占位符
            customIconUrlInput.dataset.fullValue = settings.customIconUrl;
            customIconUrlInput.value = "[图片数据已保存，但不在输入框显示以提高性能]";
        } else {
            // 正常大小数据 - 直接显示
            customIconUrlInput.value = settings.customIconUrl;
            delete customIconUrlInput.dataset.fullValue;
        }
    }

    const customIconSizeInput = document.getElementById(Constants.ID_CUSTOM_ICON_SIZE_INPUT); 
    if (customIconSizeInput) customIconSizeInput.value = settings.customIconSize;

    const faIconCodeInput = document.getElementById(Constants.ID_FA_ICON_CODE_INPUT); 
    if (faIconCodeInput) faIconCodeInput.value = settings.faIconCode;

    const colorMatchCheckbox = document.getElementById(Constants.ID_COLOR_MATCH_CHECKBOX);
    if (colorMatchCheckbox) colorMatchCheckbox.checked = settings.matchButtonColors;

    // 根据加载的 iconType 设置输入容器的初始可见性
    const customIconContainer = document.querySelector('.custom-icon-container');
    const faIconContainer = document.querySelector('.fa-icon-container');
    if (customIconContainer) {
        customIconContainer.style.display = (settings.iconType === Constants.ICON_TYPES.CUSTOM) ? 'flex' : 'none';
    }
    if (faIconContainer) {
        faIconContainer.style.display = (settings.iconType === Constants.ICON_TYPES.FONTAWESOME) ? 'flex' : 'none';
    }

    // 设置文件上传等其他监听器 (如果尚未设置)
    setupSettingsEventListeners(); // 确保监听器已设置

    // 如果禁用则隐藏按钮 (在 index.js 中也做，这里是针对设置面板加载时的状态)
    if (!settings.enabled && sharedState.domElements.rocketButton) {
        sharedState.domElements.rocketButton.style.display = 'none';
    }

    // 最后，调用统一的图标更新函数来应用初始图标
    updateIconDisplay();

    // 在加载设置后刷新自定义图标选择下拉菜单
    updateCustomIconSelect();

    console.log(`[${Constants.EXTENSION_NAME}] Settings loaded and applied to settings panel.`);
}

/**
 * 保存当前自定义图标设置到列表
 */
function saveCustomIcon() {
    const settings = window.extension_settings[Constants.EXTENSION_NAME];
    const customIconUrl = document.getElementById(Constants.ID_CUSTOM_ICON_URL).value;
    const customIconSize = parseInt(document.getElementById(Constants.ID_CUSTOM_ICON_SIZE_INPUT).value, 10);
    
    if (!customIconUrl.trim()) {
        // 如果URL为空，显示错误提示
        const saveStatus = document.getElementById('qr-save-status');
        if (saveStatus) {
            saveStatus.textContent = '请先输入图标URL或上传图片';
            saveStatus.style.color = '#f44336';
            setTimeout(() => { saveStatus.textContent = ''; }, 2000);
        }
        return;
    }
    
    // 检查是否已存在该URL的保存，避免重复
    if (!settings.savedCustomIcons) {
        settings.savedCustomIcons = [];
    }
    
    // 生成默认名称（使用URL的最后部分或时间戳）
    let defaultName = '';
    try {
        const urlParts = customIconUrl.split('/');
        defaultName = urlParts[urlParts.length - 1].substring(0, 20); // 取URL最后部分，最多20个字符
        if (!defaultName) {
            throw new Error('无效名称');
        }
    } catch (e) {
        // 如果无法从URL提取名称，使用时间戳
        defaultName = `图标_${new Date().getTime()}`;
    }
    
    // 弹出重命名对话框
    const iconName = prompt("请输入图标名称:", defaultName);
    
    // 如果用户取消了输入，则中止保存
    if (iconName === null) return;
    
    // 保存图标数据
    const iconData = {
        id: `icon_${new Date().getTime()}`, // 唯一ID
        name: iconName || defaultName, // 如果用户输入为空，使用默认名称
        url: customIconUrl,
        size: customIconSize
    };
    
    settings.savedCustomIcons.push(iconData);
    
    // 刷新下拉选择菜单
    updateCustomIconSelect();
    
    // 显示保存成功信息
    const saveStatus = document.getElementById('qr-save-status');
    if (saveStatus) {
        saveStatus.textContent = `✓ 图标"${iconData.name}"已保存`;
        saveStatus.style.color = '#4caf50';
        setTimeout(() => { saveStatus.textContent = ''; }, 2000);
    }
}

/**
 * 更新自定义图标选择下拉菜单
 */
function updateCustomIconSelect() {
    const settings = window.extension_settings[Constants.EXTENSION_NAME];
    const selectElement = document.getElementById(Constants.ID_CUSTOM_ICON_SELECT);
    
    if (!selectElement || !settings.savedCustomIcons) return;
    
    // 清空当前选项（保留第一个默认选项）
    while (selectElement.options.length > 1) {
        selectElement.remove(1);
    }
    
    // 添加已保存的图标选项
    settings.savedCustomIcons.forEach(icon => {
        const option = document.createElement('option');
        option.value = icon.id;
        option.textContent = icon.name;
        selectElement.appendChild(option);
    });
}

/**
 * 选择并应用已保存的自定义图标
 */
function handleCustomIconSelect(event) {
    const selectedId = event.target.value;
    if (!selectedId) return; // 如果选择的是默认选项，则不处理
    
    const settings = window.extension_settings[Constants.EXTENSION_NAME];
    if (!settings.savedCustomIcons) return;
    
    // 查找选中的图标数据
    const selectedIcon = settings.savedCustomIcons.find(icon => icon.id === selectedId);
    if (!selectedIcon) return;
    
    // 应用选中的图标设置
    document.getElementById(Constants.ID_ICON_TYPE_DROPDOWN).value = Constants.ICON_TYPES.CUSTOM;
    document.getElementById(Constants.ID_CUSTOM_ICON_URL).value = selectedIcon.url;
    document.getElementById(Constants.ID_CUSTOM_ICON_SIZE_INPUT).value = selectedIcon.size;
    
    // 更新设置对象
    settings.iconType = Constants.ICON_TYPES.CUSTOM;
    settings.customIconUrl = selectedIcon.url;
    settings.customIconSize = selectedIcon.size;
    
    // 更新显示
    updateIconDisplay();
    
    // 重置选择下拉菜单到默认选项
    event.target.value = '';
    
    // 提示用户需要保存全局设置
    const saveStatus = document.getElementById('qr-save-status');
    if (saveStatus) {
        saveStatus.textContent = '图标已应用，请保存设置';
        saveStatus.style.color = '#ff9800';
        setTimeout(() => { saveStatus.textContent = ''; }, 2000);
    }
}
