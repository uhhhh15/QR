// settings.js
import { extension_settings } from "./index.js";
import * as Constants from './constants.js';
import { sharedState } from './state.js';
import { fetchQuickReplies } from './api.js';
import { updateMenuStylesUI } from './events.js'; // 新增：引入样式更新函数
// import { updateMenuVisibilityUI } from './ui.js'; // 不再需要

// 内置美化CSS风格
export const BUILTIN_CSS_STYLES = [
    {
        name: "赛博朋克",
        desc: "霓虹高对比，未来感十足",
        styles: {
            itemBgColor: "rgba(15,32,39,0.85)",
            itemTextColor: "#00fff7",
            titleColor: "#ff00cc",
            titleBorderColor: "#00fff7",
            emptyTextColor: "#ff00cc",
            menuBgColor: "rgba(15,32,39,0.95)",
            menuBorderColor: "#ff00cc",
            itemHoverBgColor: "rgba(0,255,247,0.18)" // 赛博高亮
        }
    },
    {
        name: "古风",
        desc: "淡雅宣纸底色，鎏金边框",
        styles: {
            itemBgColor: "rgba(249,246,242,0.92)",
            itemTextColor: "#5b4636",
            titleColor: "#bfa36f",
            titleBorderColor: "#bfa36f",
            emptyTextColor: "#bfa36f",
            menuBgColor: "rgba(249,246,242,0.98)",
            menuBorderColor: "#bfa36f",
            itemHoverBgColor: "rgba(255,236,179,0.85)" // 柔金高亮
        }
    },
    {
        name: "少女粉",
        desc: "粉嫩可爱，少女心",
        styles: {
            itemBgColor: "rgba(255,182,193,0.92)",
            itemTextColor: "#d63384",
            titleColor: "#ff69b4",
            titleBorderColor: "#ffb6c1",
            emptyTextColor: "#e75480",
            menuBgColor: "rgba(255,240,246,0.96)",
            menuBorderColor: "#ffb6c1",
            itemHoverBgColor: "rgba(255,105,180,0.98)" // 亮粉高亮
        }
    },
    {
        name: "橘子黄",
        desc: "明亮活泼，橙黄系",
        styles: {
            itemBgColor: "rgba(255,213,128,0.92)",
            itemTextColor: "#b85c00",
            titleColor: "#ff9800",
            titleBorderColor: "#ffd180",
            emptyTextColor: "#ffb74d",
            menuBgColor: "rgba(255,243,224,0.96)",
            menuBorderColor: "#ffd180",
            itemHoverBgColor: "rgba(255,171,64,0.98)" // 橙色高亮
        }
    },
    {
        name: "薄荷绿",
        desc: "清新自然，薄荷绿",
        styles: {
            itemBgColor: "rgba(102, 221, 170, 0.96)",
            itemTextColor: "#1a2b2b",
            titleColor: "#009688",
            titleBorderColor: "#26d7ae",
            emptyTextColor: "#4dd0e1",
            menuBgColor: "rgba(232, 250, 245, 0.92)",
            menuBorderColor: "#26d7ae",
            itemHoverBgColor: "rgba(38,215,174,0.98)" // 薄荷高亮
        }
    },
];

/**
 * 动态注入自动伸缩的CSS样式。
 */
function injectAutoShrinkStyle() {
    // 防止重复注入
    if (document.getElementById(Constants.ID_AUTO_SHRINK_STYLE_TAG)) {
        return;
    }

    const style = document.createElement('style');
    style.id = Constants.ID_AUTO_SHRINK_STYLE_TAG;
    // 优化后的CSS：使用SillyTavern的CSS变量并添加过渡效果
    style.innerHTML = `
        #qr--bar {
            height: 0px;
            overflow: hidden; /* 必须加，否则内容会溢出 */
            transition: height 0.3s ease-in-out;
        }
        #send_form:hover #qr--bar {
            /* 使用SillyTavern的变量来确保高度一致，比 'auto' 更平滑 */
            height: var(--buttons-bar-height); 
        }
    `;
    document.head.appendChild(style);
    console.log(`[${Constants.EXTENSION_NAME}] 自动伸缩功能已开启，样式已注入。`);
}

/**
 * 移除自动伸缩的CSS样式。
 */
function removeAutoShrinkStyle() {
    const style = document.getElementById(Constants.ID_AUTO_SHRINK_STYLE_TAG);
    if (style) {
        style.remove();
        console.log(`[${Constants.EXTENSION_NAME}] 自动伸缩功能已关闭，样式已移除。`);
    }
}


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
    const customIconSizeSetting = settings.customIconSize || Constants.DEFAULT_CUSTOM_ICON_SIZE; // 自定义图标大小
    const globalIconSizeSetting = settings.globalIconSize; // 全局图标大小 (可能为 null)
    const faIconCode = settings.faIconCode || '';

    // 1. 清除按钮现有内容和样式
    button.innerHTML = '';
    button.classList.remove('primary-button', 'secondary-button');
    button.style.backgroundImage = '';
    button.style.backgroundSize = '';
    button.style.backgroundPosition = '';
    button.style.backgroundRepeat = '';
    button.style.fontSize = ''; // 清除可能存在的字体大小
    button.classList.add('interactable');

    let iconAppliedSize = null; // 用于跟踪实际应用的像素大小或 null

    // 2. 根据图标类型设置内容和大小
    if (iconType === Constants.ICON_TYPES.CUSTOM && customIconUrl) {
        iconAppliedSize = `${customIconSizeSetting}px`;
        const customContent = customIconUrl.trim();
        const sizeStyle = `${iconAppliedSize} ${iconAppliedSize}`;
        // ... (SVG/图片/Base64 背景图逻辑保持不变，使用 sizeStyle) ...
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
    } else { // 默认图标或 Font Awesome
        let useGlobalSize = globalIconSizeSetting && !isNaN(parseFloat(globalIconSizeSetting)) && parseFloat(globalIconSizeSetting) > 0;

        if (iconType === Constants.ICON_TYPES.FONTAWESOME && faIconCode) {
            button.innerHTML = faIconCode.trim();
            if (useGlobalSize) {
                iconAppliedSize = `${parseFloat(globalIconSizeSetting)}px`;
                // 优先将大小应用到图标元素本身
                const iconEl = button.firstElementChild;
                if (iconEl) {
                    iconEl.style.fontSize = iconAppliedSize;
                } else {
                    button.style.fontSize = iconAppliedSize;
                }
            }
        } else { // 预设的 FontAwesome 图标
            const iconClass = Constants.ICON_CLASS_MAP[iconType] || Constants.ICON_CLASS_MAP[Constants.ICON_TYPES.ROCKET];
            if (iconClass) {
                button.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
                if (useGlobalSize) {
                    iconAppliedSize = `${parseFloat(globalIconSizeSetting)}px`;
                    const iconEl = button.querySelector('i');
                    if (iconEl) {
                        iconEl.style.fontSize = iconAppliedSize;
                    } else {
                        button.style.fontSize = iconAppliedSize;
                    }
                }
            } else {
                button.innerHTML = `<i class="fa-solid ${Constants.ICON_CLASS_MAP[Constants.ICON_TYPES.ROCKET]}"></i>`;
                if (useGlobalSize) {
                    iconAppliedSize = `${parseFloat(globalIconSizeSetting)}px`;
                    const iconEl = button.querySelector('i');
                    if (iconEl) {
                        iconEl.style.fontSize = iconAppliedSize;
                    } else {
                        button.style.fontSize = iconAppliedSize;
                    }
                }
            }
        }
        // 确保非自定义图标继承发送按钮的颜色风格
        if (iconType !== Constants.ICON_TYPES.CUSTOM) {
            const iconEl = button.querySelector('i') || button.firstElementChild;
            if (iconEl) {
                iconEl.style.color = 'inherit';
            }
        }
    }

    // 3. 应用颜色匹配设置（通过添加类） - 这部分逻辑总是执行
    const sendButton = document.getElementById('send_but');
    let buttonClassToAdd = 'secondary-button';
    if (sendButton) {
        if (sendButton.classList.contains('primary-button')) {
            buttonClassToAdd = 'primary-button';
        }
    }
    button.classList.add(buttonClassToAdd);
    button.style.color = ''; // 清除内联颜色，让CSS类生效

    // 如果没有应用特定的大小 (iconAppliedSize is null)，
    // 并且不是自定义图标类型，则其大小会自然地跟随 primary/secondary button的风格。
    // 如果应用了特定大小 (iconAppliedSize is not null)，则该大小优先。
    // 对于背景图类型的自定义图标，大小是通过 background-size 设置的。
    // 对于字体图标（FA或预设），大小是通过 font-size 设置的。
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
            <button class="menu_button" id="qrq-builtin-css-btn" style="width:auto; padding:0 10px;">
                <i class="fa-solid fa-magic"></i> 内置css
            </button>
            <button class="menu_button" id="${Constants.ID_MENU_STYLE_PANEL}-apply" style="width:auto; padding:0 10px;">
                <i class="fa-solid fa-check"></i> 应用样式
            </button>
        </div>
    </div>
    <!-- 内置CSS弹窗 -->
    <div id="qrq-builtin-css-modal" style="display:none; position:fixed; left:50%; top:15%; transform:translateX(-50%); z-index:2000; background:#222; color:#fff; border-radius:12px; box-shadow:0 8px 32px #0008; width:420px; max-width:95vw; padding:24px 18px;">
        <h3 style="margin-top:0; text-align:center;">选择内置美化风格</h3>
        <div id="qrq-builtin-css-list" style="margin:18px 0 12px 0;"></div>
        <div id="qrq-builtin-css-preview" style="margin:10px 0 18px 0; min-height:40px; text-align:center;"></div>
        <div style="text-align:center;">
            <div id="qrq-builtin-css-btn-row" style="display:flex; justify-content:space-between; margin-top:18px;">
                <button class="menu_button" id="qrq-builtin-css-apply" style="width:auto;">应用此风格</button>
                <button class="menu_button" id="qrq-builtin-css-cancel" style="width:auto;">取消</button>
            </div>
        </div>
    </div>
    `;

    // --- 替换开始：使用说明面板 ---
    const usagePanel = `
        <div id="${Constants.ID_USAGE_PANEL}" class="qr-usage-panel">
            <style>
            /* 使用更具体的选择器确保样式只影响面板内部 */
            #${Constants.ID_USAGE_PANEL} .container {
              max-width: 880px;
              margin: auto;
              border-radius: 18px;
              padding: 20px 25px 30px 25px;
            }
            #${Constants.ID_USAGE_PANEL} h1 {
              color: #6c9be5;
              font-size: 2.3em;
              margin-bottom: 16px;
              font-weight: bold;
              letter-spacing: 1px;
              text-align: center;
            }
            #${Constants.ID_USAGE_PANEL} h2 {
              color: #6c9be5;
              margin-top: 35px;
              border-left: 4px solid #6c9be5;
              padding-left: 12px;
              font-size: 1.32em;
              margin-bottom: 16px;
            }
            #${Constants.ID_USAGE_PANEL} h3 {
              color: #81abeb;
              margin-top: 26px;
              font-size: 1.11em;
            }
            #${Constants.ID_USAGE_PANEL} p, 
            #${Constants.ID_USAGE_PANEL} ul, 
            #${Constants.ID_USAGE_PANEL} li {
              color: #e8e8e8;
              line-height: 1.84;
              font-size: 1.06em;
            }
            #${Constants.ID_USAGE_PANEL} ul {
              padding-left: 22px;
              margin-top: 7px;
              margin-bottom: 7px;
            }
            #${Constants.ID_USAGE_PANEL} li {
              margin-bottom: 4px;
            }
            #${Constants.ID_USAGE_PANEL} .tip, 
            #${Constants.ID_USAGE_PANEL} .important, 
            #${Constants.ID_USAGE_PANEL} .footer-tip {
              border-radius: 8px;
              padding: 11px 18px;
              margin: 18px 0 13px 0;
              font-size: 1em;
            }
            #${Constants.ID_USAGE_PANEL} .tip {
              background: rgba(30, 85, 138, 0.3);
              color: #83c6ff;
              border-left: 4px solid #46afe4;
            }
            #${Constants.ID_USAGE_PANEL} .important {
              background: rgba(94, 53, 0, 0.3);
              color: #ffca73;
              border-left: 4px solid #ffc247;
            }
            #${Constants.ID_USAGE_PANEL} .footer-tip {
              background: rgba(94, 53, 0, 0.2);
              border-left: 4px solid #f7c066;
              color: #ffca73;
              margin-top: 24px;
            }
            #${Constants.ID_USAGE_PANEL} .btn {
              display: inline-block;
              background: #2441e7;
              color: #fff;
              padding: 2px 12px;
              border-radius: 7px;
              font-size: 0.99em;
              margin: 0 3px;
            }
            #${Constants.ID_USAGE_PANEL} code {
              background: rgba(43, 43, 50, 0.5);
              color: #ff9191;
              border-radius: 4px;
              padding: 2px 6px;
              font-size: 0.98em;
            }
            #${Constants.ID_USAGE_PANEL} .step-title {
              font-weight: bold;
              color: #83c6ff;
              margin-top: 20px;
              margin-bottom: 6px;
            }
            #${Constants.ID_USAGE_PANEL} ol {
              margin-left: 16px;
              margin-bottom: 8px;
            }
            #${Constants.ID_USAGE_PANEL} b {
              color: #fff;
            }
            </style>
            <div class="container">
              <h1>使用说明</h1>
    
              <h2>一、目的与作用</h2>
              <p>
                本插件可将快速回复和酒馆助手脚本按钮，统一收纳【快速回复菜单】面板中，点击发送按钮左侧的图标（默认为小火箭）中即可打开面板，同时其隐藏QR和脚本按钮，以节省输入区域空间，使界面更加整洁。
              </p>
              <p>
                除了收纳功能外，插件还支持将指定的QR/脚本按钮通过【白名单管理】加入"白名单"，这些按钮将不会被收纳和隐藏，而是继续显示在输入框区域上方。简单来说，QR助手不会处理已加入白名单的按钮，就像不会处理输入助手按键一样。
              </p>
              <p>
                插件内置了多种图标，也支持通过上传图片（可使用网络链接如catbox等图床）作为图标。同时，插件还支持更换【快速回复菜单】的UI样式。下面将详细说明如何更换图标及菜单UI。
              </p>
              <div class="important">
                <b>特别说明：</b> QR助手始终不会对输入助手按键进行处理。
              </div>
    
              <h2>二、插件设置详细说明</h2>
              <p>以下将按页面布局顺序，详细说明插件设置页面的各项功能：</p>
    
              <h3>1. 第一行：启用/禁用QR助手</h3>
              <ul>
                <li>页面最上方有一个下拉选项框，可直接切换启用或禁用QR助手。</li>
              </ul>
    
              <h3>2. 第二行："开启按钮自动伸缩"与"白名单管理"</h3>
              <ul>
                <li>
                  <b>开启按钮自动伸缩：</b> 该选项默认关闭。勾选后，输入区域会根据需求自动伸缩。
                  <ul>
                    <li>举例：当使用了输入助手或将部分按钮移入"白名单"时，若未点击聊天输入框，这些按钮不会显示；当点击输入框准备发送消息时，这些按钮会自动出现。</li>
                  </ul>
                </li>
                <li>
                  <b>白名单管理：</b> 这是管理哪些QR/脚本按钮需要加入白名单的入口。被移入白名单的按钮不会被QR助手收纳，始终显示在输入框上方。
                  <ul>
                    <li>左侧为非白名单（默认收纳），右侧为白名单。</li>
                    <li>直接点击相应选项即可转入或移出白名单。</li>
                  </ul>
                </li>
              </ul>
    
              <h3>3. 第三至四行：图标设置相关</h3>
              <div class="step-title">3.1 图标选择下拉框（第三行）</div>
              <ul>
                <li>前四个内置图标：小火箭、调色盘、五芒星、星月。</li>
                <li>支持选择Font Awesome网站上的图标（需填写HTML代码）。</li>
                <li>选择"自定义图标"后，可上传本地图片或输入网络图片链接（如catbox）。</li>
              </ul>
    
              <div class="step-title">3.2 图标设置面板（第四行）</div>
              <ul>
                <li>
                  <b>内置图标和Font Awesome图标设置：</b>
                  <ul>
                    <li>左侧有"图标大小 (默认/FA)"输入框，可调整图标尺寸。</li>
                    <li>右侧有"恢复默认大小"按钮，一键还原图标大小和颜色（与发送按钮保持一致）。</li>
                    <li>在部分UI下，如出现颜色或大小不匹配，可手动调整。</li>
                  </ul>
                </li>
                <li>
                  <b>非自定义图标面板：</b>
                  <ul>
                    <li>可直接上传本地图片，或输入图片链接（如catbox）更换图标。</li>
                    <li>支持保存多个已上传图片，方便随时切换。</li>
                  </ul>
                  <ol>
                    <li>
                      <b>第一行：</b> 左侧为"自定义图标URL"输入框，右侧为"上传图片"按钮。
                    </li>
                    <li>
                      <b>第二行：</b> 左侧为"图标大小(px)"输入框，可按需调节图片尺寸。
                    </li>
                    <li>
                      <b>第三行：</b> 左为"保存图标"按钮，中间为下拉选择已保存图标，右为"删除图标"按钮（需选择图标后出现）。
                    </li>
                  </ol>
                </li>
              </ul>
              <div class="tip">
                上传图片或输入图片链接后，务必点击"保存图标"按钮进行保存，并进行重命名，方便管理和快速切换不同图标。
              </div>
    
              <h3>4. 第四行："菜单样式"与"使用说明"按钮</h3>
              <ul>
                <li>
                  <b>菜单样式：</b>
                  <ul>
                    <li>点击"菜单样式"弹出面板。</li>
                    <li>面板底部的"内置CSS"提供5种内置的快速回复菜单UI主题，可直接应用。</li>
                    <li>支持自定义菜单颜色、样式，满足个性化需求。</li>
                  </ul>
                </li>
                <li>
                  <b>样式调整说明：</b>
                  <ul>
                    <li>菜单项样式：设置菜单项的背景色和透明度（滑动条调节），以及文字颜色。</li>
                    <li>标题样式：设置标题文字和分割线颜色。</li>
                    <li>其他样式设置：设置无快速回复项时的提示文字颜色，整体菜单面板的背景、透明度和边框色。</li>
                    <li>支持"一键恢复默认"和"应用样式"按钮，分别用于恢复初始（黑底白字）和应用当前样式。</li>
                  </ul>
                </li>
                <li>
                  <b>使用说明：</b> 查看当前说明文档。
                </li>
              </ul>
    
              <h2>三、补充说明与使用技巧</h2>
              <ul>
                <li>可直接点击QR助手的快速回复菜单外部区域，关闭菜单。</li>
                <li>所有的改动会进行自动保存，因此旧版本的"保存设置"按钮已被删除。</li>
                <li>如遇任何BUG、疑问或有建议，欢迎在帖子内反馈。</li>
              </ul>
    
              <div class="footer-tip">
                <b>小技巧：</b> 
                <br>善用"白名单管理"与自定义图标功能，可以让你的输入区域既整洁又个性化，提升使用体验！
              </div>
            </div>
            <div style="text-align:center; margin-top:10px;">
              <button class="menu_button" id="${Constants.ID_USAGE_PANEL}-close" style="width:auto; padding:0 10px;">
                确定
              </button>
            </div>
        </div>
    `;
    // --- 替换结束 ---

    // --- 更改开始：使用 DIV 列表替换原生 select，下拉菜单改为可滚动的列表 ---
    const whitelistPanel = `
    <div id="${Constants.ID_WHITELIST_PANEL}" class="qr-whitelist-panel">
        <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
            <h3>白名单管理</h3>
            <button class="menu_button" id="${Constants.ID_WHITELIST_PANEL}-close" style="width:auto; padding:0 10px;">
                <i class="fa-solid fa-times"></i>
            </button>
        </div>
        <div style="display:flex; justify-content:space-between; gap:10px;">
            <div style="width:48%;">
                <label>非白名单列表</label>
                <div id="qrq-non-whitelisted-list" class="qrq-whitelist-list"></div>
            </div>
            <div style="width:48%;">
                <label>白名单列表</label>
                <div id="qrq-whitelisted-list" class="qrq-whitelist-list"></div>
            </div>
        </div>
        <div id="qrq-whitelist-save-status" style="text-align:center; color:#4caf50; height:20px; margin-top:5px;"></div>
    </div>
    `;
    // --- 更改结束 ---

    // 在自定义图标的容器里添加保存按钮和选择下拉菜单以及删除按钮
    const customIconContainer = `
        <div class="custom-icon-container" style="
            display: grid;
            grid-template-columns: auto auto auto;
            grid-auto-rows: auto;
            column-gap: 10px;
            row-gap: 12px;
            align-items: center;
        ">
            <!-- 第一行：URL 左对齐，上传按钮 右对齐 -->
            <label style="grid-column: 1; justify-self: start;">自定义图标URL:</label>
            <input type="text" id="${Constants.ID_CUSTOM_ICON_URL}"
                   style="grid-column: 2; width:auto; justify-self: start;"
                   placeholder="输入URL或上传图片">
            <button for="icon-file-upload" class="menu_button"
                    style="grid-column: 3; justify-self: end; width:auto;">
                <i class="fa-solid fa-upload"></i> 上传图片
            </button>
            <input type="file" id="icon-file-upload" accept="image/*" style="display:none;" />

            <!-- 第二行：图标大小 输入长度增至原来的1.5倍 -->
            <label style="grid-column: 1; justify-self: start;">图标大小 (px):</label>
            <input type="number" id="${Constants.ID_CUSTOM_ICON_SIZE_INPUT}" min="16" max="40"
                   style="grid-column: 2; width:auto; transform: scaleX(0.75); transform-origin: left center; justify-self: start;"/>

            <!-- 第三行：保存图标 按钮左对齐 -->
            <button id="${Constants.ID_CUSTOM_ICON_SAVE}" class="menu_button"
                    style="grid-column: 1; justify-self: start; width:auto;">
                <i class="fa-solid fa-save"></i>保存图标
            </button>

            <!-- 第三行：选择已保存图标 下拉框长度降为原来的0.8倍 -->
            <select id="${Constants.ID_CUSTOM_ICON_SELECT}" class="transparent-select"
                    style="grid-column: 2; justify-self: center; width: 80%;">
                <option value="">-- 选择已保存图标 --</option>
            </select>

            <!-- 第四行：删除图标按钮右对齐 -->
            <button id="${Constants.ID_DELETE_SAVED_ICON_BUTTON}" class="menu_button"
                    style="grid-column: 3; justify-self: end; width:auto;">
                <i class="fa-solid fa-trash-can"></i> 删除图标
            </button>
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
                    <select id="${Constants.ID_SETTINGS_ENABLED_DROPDOWN}" class="text_pole">
                        <option value="true">启用</option>
                        <option value="false">禁用</option>
                    </select>
                </div>

                <div class="flex-container flexGap5" style="align-items: center; justify-content: space-between; margin-bottom: 15px;">
                    <div class="flex-container flexGap5" style="align-items: center;">
                        <input type="checkbox" id="${Constants.ID_AUTO_SHRINK_CHECKBOX}" style="margin:0; height:auto;">
                        <label for="${Constants.ID_AUTO_SHRINK_CHECKBOX}" style="margin:0; text-align:left;">开启按钮自动伸缩</label>
                    </div>
                    <button id="${Constants.ID_WHITELIST_BUTTON}" class="menu_button" style="width:auto; padding:0 10px;">
                        <i class="fa-solid fa-list-check"></i> 白名单管理
                    </button>
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

                <div class="flex-container flexGap5 global-icon-container" style="margin-top:10px;">
                    <label for="${Constants.ID_GLOBAL_ICON_SIZE_INPUT}">图标大小 (默认/FA):</label>
                    <input type="number" id="${Constants.ID_GLOBAL_ICON_SIZE_INPUT}" min="10" max="40"
                           style="width: auto;
                                  height: var(--buttons-bar-height);
                                  min-width: 2.5em;
                                  margin-right: 10px;"
                           placeholder="默认">
                    <button id="${Constants.ID_RESET_ICON_SIZE_BUTTON}" class="menu_button"
                            style="width: auto;
                                     padding: 0 5px;
                                     margin-left: auto;"
                            title="恢复为匹配发送按钮的默认大小和颜色风格">
                        <i class="fa-solid fa-arrow-rotate-left"></i> 恢复默认大小
                    </button>
                </div>

                <div class="flex-container flexGap5 custom-icon-container" style="display: none; margin-top:10px; align-items: center;">
                    ${customIconContainer}
                </div>

                <div class="flex-container flexGap5 fa-icon-container" style="display: none; margin-top:10px;">
                    <label for="${Constants.ID_FA_ICON_CODE_INPUT}">FA 代码（fontawesome.com）:</label>
                    <input type="text" id="${Constants.ID_FA_ICON_CODE_INPUT}" class="text_pole" style="flex-grow:1;"
                           placeholder='粘贴 FontAwesome HTML, 如 <i class="fa-solid fa-house"></i>' />
                </div>

                <hr class="sysHR">
                <div style="display:flex; justify-content:space-between; margin-top:15px;">
                    <button id="${Constants.ID_MENU_STYLE_BUTTON}" class="menu_button" style="width:auto; padding:0 10px;">
                        <i class="fa-solid fa-palette"></i> 菜单样式
                    </button>
                    <button id="${Constants.ID_USAGE_BUTTON}" class="menu_button" style="width:auto; padding:0 10px;">
                        <i class="fa-solid fa-circle-info"></i> 使用说明
                    </button>
                </div>

                <div id="qr-save-status" style="text-align: center; color: #4caf50; height: 20px; margin-top: 5px;"></div>
            </div>
        </div>
    </div>${stylePanel}${usagePanel}${whitelistPanel}`;
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

// 打开白名单管理弹窗
export function handleWhitelistButtonClick() {
  const panel = document.getElementById(Constants.ID_WHITELIST_PANEL);
  if (!panel) return;
  panel.style.display = 'block';
  // 垂直居中
  const top = Math.max(50, (window.innerHeight - panel.offsetHeight) / 2);
  panel.style.top = `${top}px`;
  panel.style.transform = 'translateX(-50%)';
  populateWhitelistManagementUI();
  scheduleAutoSave();
}

// 关闭白名单管理弹窗，并自动保存设置
export function closeWhitelistPanel() {
  const panel = document.getElementById(Constants.ID_WHITELIST_PANEL);
  if (panel && panel.style.display !== 'none') {
    console.log(`[${Constants.EXTENSION_NAME}] Closing whitelist panel and saving settings.`);
    saveSettings(); // 调用保存函数
    
    // 显示一个短暂的保存提示
    const status = document.getElementById('qrq-whitelist-save-status');
    if (status) {
        status.textContent = '设置已在关闭时自动保存。';
        status.style.color = '#4caf50';
        setTimeout(() => { if (status.textContent.includes('自动保存')) status.textContent = ''; }, 2000);
    }
    
    // 稍作延迟后关闭面板，让用户能看到提示
    setTimeout(() => {
        panel.style.display = 'none';
    }, 300);
  }
}
// --- 更改结束 ---


// 统一处理设置变更的函数
export function handleSettingsChange(event) {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    const targetId = event.target.id;
    const targetElement = event.target; // 缓存目标元素

    // 处理不同控件的设置变更
    if (targetId === Constants.ID_SETTINGS_ENABLED_DROPDOWN) {
        const enabled = targetElement.value === 'true';
        settings.enabled = enabled;
        document.body.classList.remove('qra-enabled', 'qra-disabled');
        document.body.classList.add(enabled ? 'qra-enabled' : 'qra-disabled');
        const rocketButton = document.getElementById(Constants.ID_ROCKET_BUTTON);
        if (rocketButton) {
            rocketButton.style.display = enabled ? 'flex' : 'none';
        }
    }
    else if (targetId === Constants.ID_ICON_TYPE_DROPDOWN) {
        settings.iconType = targetElement.value;
        const customIconContainer = document.querySelector('.custom-icon-container');
        const faIconContainer = document.querySelector('.fa-icon-container');
        if (customIconContainer) {
            customIconContainer.style.display = (settings.iconType === Constants.ICON_TYPES.CUSTOM) ? 'flex' : 'none';
        }
        if (faIconContainer) {
            faIconContainer.style.display = (settings.iconType === Constants.ICON_TYPES.FONTAWESOME) ? 'flex' : 'none';
        }
        // 新增：自定义图标时隐藏全局大小行，其他类型显示
        const globalIconContainer = document.querySelector('.global-icon-container');
        if (globalIconContainer) {
            globalIconContainer.style.display = (settings.iconType === Constants.ICON_TYPES.CUSTOM) ? 'none' : 'flex';
        }
    }
    else if (targetId === Constants.ID_CUSTOM_ICON_URL) {
        let newUrlFromInput = targetElement.value;

        if (newUrlFromInput === "[图片数据已保存，但不在输入框显示以提高性能]") {
            // 如果输入框的值是占位符，这意味着实际的URL在 dataset.fullValue 中 (由 handleFileUpload 设置)。
            // 此时 settings.customIconUrl 应该已经被 handleFileUpload 更新为真实数据。
            // 我们不应使用占位符覆盖 settings.customIconUrl。
            // 如果 dataset.fullValue 存在，则 settings.customIconUrl 应该等于它。
            // 如果 dataset.fullValue 不存在（不应该发生此情况，除非逻辑错误），则保留 settings.customIconUrl。
            // 实际上，这里的 settings.customIconUrl 几乎不需要改变，因为它已被上游函数（如 handleFileUpload）正确设置。
        } else if (newUrlFromInput.length > 1000) {
            // 用户输入或粘贴了一个长URL
            settings.customIconUrl = newUrlFromInput;      // 1. 更新 settings (真实数据)
            targetElement.dataset.fullValue = newUrlFromInput; // 2. 更新 dataset (真实数据备份)
            targetElement.value = "[图片数据已保存，但不在输入框显示以提高性能]"; // 3. 更新输入框显示 (占位符)
        } else {
            // 用户输入了一个短URL，或者清空了输入框
            settings.customIconUrl = newUrlFromInput;      // 1. 更新 settings (真实数据)
            delete targetElement.dataset.fullValue;    // 2. 清除旧的 dataset (如果存在)
                                                        // targetElement.value 已经是 newUrlFromInput (短的或空的)
        }
    }
    else if (targetId === Constants.ID_CUSTOM_ICON_SIZE_INPUT) {
        settings.customIconSize = parseInt(targetElement.value, 10) || Constants.DEFAULT_CUSTOM_ICON_SIZE;
    }
    else if (targetId === Constants.ID_FA_ICON_CODE_INPUT) {
        settings.faIconCode = targetElement.value;
    }
    else if (targetId === Constants.ID_GLOBAL_ICON_SIZE_INPUT) {
        const sizeVal = targetElement.value.trim();
        if (sizeVal === "" || isNaN(parseFloat(sizeVal))) {
            settings.globalIconSize = null;
        } else {
            settings.globalIconSize = parseFloat(sizeVal);
        }
    }
    else if (targetId === Constants.ID_AUTO_SHRINK_CHECKBOX) {
        settings.autoShrinkEnabled = targetElement.checked;
        if (settings.autoShrinkEnabled) {
            injectAutoShrinkStyle();
        } else {
            removeAutoShrinkStyle();
        }
    }

    // 如果自定义图标URL或大小被手动修改，检查是否仍与已保存图标匹配
    if (targetId === Constants.ID_CUSTOM_ICON_URL || targetId === Constants.ID_CUSTOM_ICON_SIZE_INPUT) {
        const currentUrl = settings.customIconUrl; // 现在这里总是完整的真实URL
        const currentSize = settings.customIconSize;
        const isStillSaved = settings.savedCustomIcons && settings.savedCustomIcons.some(
            icon => icon.url === currentUrl && icon.size === currentSize
        );
        if (!isStillSaved) {
            sharedState.currentSelectedSavedIconId = null;
            const deleteBtn = document.getElementById(Constants.ID_DELETE_SAVED_ICON_BUTTON);
            if (deleteBtn) deleteBtn.style.display = 'none';
            const selectElement = document.getElementById(Constants.ID_CUSTOM_ICON_SELECT);
            if (selectElement) selectElement.value = "";
        }
    }

    updateIconDisplay(); // 每次设置变化后都更新火箭按钮图标显示
    scheduleAutoSave();
}

// 保存设置
export function saveSettings() {
    const settings = extension_settings[Constants.EXTENSION_NAME];

    const enabledDropdown = document.getElementById(Constants.ID_SETTINGS_ENABLED_DROPDOWN);
    const iconTypeDropdown = document.getElementById(Constants.ID_ICON_TYPE_DROPDOWN);
    const customIconUrlInput = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
    const customIconSizeInput = document.getElementById(Constants.ID_CUSTOM_ICON_SIZE_INPUT);
    const faIconCodeInput = document.getElementById(Constants.ID_FA_ICON_CODE_INPUT);
    const globalIconSizeInput = document.getElementById(Constants.ID_GLOBAL_ICON_SIZE_INPUT);
    const autoShrinkCheckbox = document.getElementById(Constants.ID_AUTO_SHRINK_CHECKBOX);

    if (enabledDropdown) settings.enabled = enabledDropdown.value === 'true';
    if (iconTypeDropdown) settings.iconType = iconTypeDropdown.value;

    // customIconUrl 已经被 handleSettingsChange 或 handleFileUpload 正确更新到 settings.customIconUrl
    // 所以这里理论上不需要再次从 DOM 读取并判断。
    // 但为保险起见，如果直接调用 saveSettings 而没有经过事件，可以保留从 DOM 读取的逻辑，
    // 或者，更好地是确保 settings.customIconUrl 总是权威来源。
    // 当前的 handleSettingsChange 已经维护了 settings.customIconUrl 的正确性。
    // 所以，我们信任 settings.customIconUrl。
    // if (customIconUrlInput) {
    //     if (customIconUrlInput.dataset.fullValue &&
    //         customIconUrlInput.value === "[图片数据已保存，但不在输入框显示以提高性能]") {
    //         settings.customIconUrl = customIconUrlInput.dataset.fullValue;
    //     } else {
    //         settings.customIconUrl = customIconUrlInput.value;
    //     }
    // }
    // (上面的注释掉的逻辑是确保从DOM读取，但如果 handleSettingsChange 正常工作，则不需要)

    if (customIconSizeInput) settings.customIconSize = parseInt(customIconSizeInput.value, 10) || Constants.DEFAULT_CUSTOM_ICON_SIZE;
    if (faIconCodeInput) settings.faIconCode = faIconCodeInput.value;
    if (globalIconSizeInput) {
        const sizeVal = globalIconSizeInput.value.trim();
        if (sizeVal === "" || isNaN(parseFloat(sizeVal))) {
            settings.globalIconSize = null;
        } else {
            settings.globalIconSize = parseFloat(sizeVal);
        }
    }
    if (autoShrinkCheckbox) {
        settings.autoShrinkEnabled = autoShrinkCheckbox.checked;
    }

    updateIconDisplay(); // 确保图标基于最新的 settings 对象显示

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

    try {
        localStorage.setItem('QRA_settings', JSON.stringify(settings));
        console.log(`[${Constants.EXTENSION_NAME}] 设置已保存到 localStorage`);
        saved = true;
    } catch (e) {
        console.error(`[${Constants.EXTENSION_NAME}] 保存设置到 localStorage 失败:`, e);
    }

    return saved;
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
 * 设置所有设置相关的事件监听器。
 * 这个函数是幂等的，可以安全地多次调用。
 */
export function setupSettingsEventListeners() {
    // 幂等性保护：如果已经绑定过，则直接返回，防止重复监听。
    if (window._qraSettingsListenersBound) {
        return;
    }

    // --- 注册通用的设置事件监听 ---
    const usageButton = document.getElementById(Constants.ID_USAGE_BUTTON);
    usageButton?.addEventListener('click', handleUsageButtonClick);

    const usageCloseButton = document.getElementById(`${Constants.ID_USAGE_PANEL}-close`);
    usageCloseButton?.addEventListener('click', closeUsagePanel);

    const fileUpload = document.getElementById('icon-file-upload');
    fileUpload?.addEventListener('change', handleFileUpload);
    
    // [已恢复] "上传图片"按钮的点击逻辑，这是必需的
    const uploadButton = document.querySelector('button[for="icon-file-upload"]');
    if (uploadButton) {
        uploadButton.addEventListener('click', () => {
            fileUpload?.click(); // 触发隐藏的文件输入框
        });
    }

    /* 
    const saveButton = document.getElementById('qr-save-settings');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            const success = saveSettings();
            const saveStatus = document.getElementById('qr-save-status');
            
            if (saveStatus) {
                saveStatus.textContent = success ? '✓ 设置已保存' : '✗ 保存失败';
                saveStatus.style.color = success ? '#4caf50' : '#f44336';
                setTimeout(() => { saveStatus.textContent = ''; }, 2000);
            }
            
            // [已恢复] 完整的按钮样式反馈逻辑
            if (success) {
                const originalHTML = saveButton.innerHTML;
                const originalBg = saveButton.style.backgroundColor;
                saveButton.innerHTML = '<i class="fa-solid fa-check"></i> 已保存';
                saveButton.style.backgroundColor = '#4caf50';
                setTimeout(() => {
                    saveButton.innerHTML = originalHTML;
                    saveButton.style.backgroundColor = originalBg;
                }, 2000);
            }
        });
    }
    */

    safeAddListener(Constants.ID_CUSTOM_ICON_SAVE, 'click', saveCustomIcon);
    safeAddListener(Constants.ID_CUSTOM_ICON_SELECT, 'change', handleCustomIconSelect);
    safeAddListener(Constants.ID_RESET_ICON_SIZE_BUTTON, 'click', handleResetIconSize);
    safeAddListener(Constants.ID_DELETE_SAVED_ICON_BUTTON, 'click', handleDeleteSavedIcon);

    const wlBtn = document.getElementById(Constants.ID_WHITELIST_BUTTON);
    wlBtn?.addEventListener('click', handleWhitelistButtonClick);

    const wlClose = document.getElementById(`${Constants.ID_WHITELIST_PANEL}-close`);
    wlClose?.addEventListener('click', closeWhitelistPanel);

    // --- 注册白名单列表的点击事件 ---
    ['qrq-non-whitelisted-list', 'qrq-whitelisted-list'].forEach(listId => {
        const listElement = document.getElementById(listId);
        listElement?.addEventListener('click', (event) => {
            const item = event.target.closest('.qrq-whitelist-item');
            if (!item) return;

            const settings = extension_settings[Constants.EXTENSION_NAME];
            const id = item.dataset.value;
            const isAddingToWhitelist = listId === 'qrq-non-whitelisted-list';

            if (isAddingToWhitelist) {
                if (!settings.whitelist.includes(id)) {
                    settings.whitelist.push(id);
                }
            } else {
                const idx = settings.whitelist.indexOf(id);
                if (idx > -1) {
                    settings.whitelist.splice(idx, 1);
                }
            }

            populateWhitelistManagementUI();
            window.quickReplyMenu.applyWhitelistDOMChanges?.();

            const status = document.getElementById('qrq-whitelist-save-status');
            if (status) {
                status.textContent = '已更新，关闭面板时将自动保存。';
                status.style.color = '#ff9800';
            }
        });
    });
    
    // 标记为已绑定，防止重复执行
    window._qraSettingsListenersBound = true;
    console.log(`[${Constants.EXTENSION_NAME}] Settings event listeners have been bound.`);

    // 内置css按钮事件
    const builtinCssBtn = document.getElementById('qrq-builtin-css-btn');
    const builtinCssModal = document.getElementById('qrq-builtin-css-modal');
    const builtinCssList = document.getElementById('qrq-builtin-css-list');
    const builtinCssPreview = document.getElementById('qrq-builtin-css-preview');
    let selectedBuiltinIndex = 0;

    if (builtinCssBtn && builtinCssModal && builtinCssList && builtinCssPreview) {
        builtinCssBtn.addEventListener('click', () => {
            // 构建风格列表
            builtinCssList.innerHTML = '';
            BUILTIN_CSS_STYLES.forEach((style, idx) => {
                const btn = document.createElement('button');
                btn.className = 'menu_button';
                btn.style.margin = '6px 8px';
                btn.style.width = 'auto'; // 关键：自适应宽度
                btn.textContent = style.name + '（' + style.desc + '）';
                if (idx === selectedBuiltinIndex) btn.style.background = '#4caf50';
                btn.onclick = () => {
                    selectedBuiltinIndex = idx;
                    updatePreview();
                    Array.from(builtinCssList.children).forEach((b, i) => {
                        b.style.background = (i === idx) ? '#4caf50' : '';
                    });
                };
                builtinCssList.appendChild(btn);
            });
            updatePreview();
            builtinCssModal.style.display = 'block';
        });

        function updatePreview() {
            const style = BUILTIN_CSS_STYLES[selectedBuiltinIndex];
            builtinCssPreview.innerHTML = `
                <div style="padding:12px; border-radius:8px; background:${style.styles.menuBgColor} !important; color:${style.styles.itemTextColor} !important; border:2px solid ${style.styles.menuBorderColor} !important; display:flex; gap:18px; justify-content:space-between;">
                    <div style="width:48%; border:1.5px solid ${style.styles.menuBorderColor} !important; border-radius:6px; background:transparent; padding:8px 4px;">
                        <div style="font-weight:bold; color:${style.styles.titleColor} !important; border-bottom:1px solid ${style.styles.titleBorderColor} !important; margin-bottom:8px; text-align:center;">聊天快速回复</div>
                        <button style="display:block;width:100%;margin:6px 0;padding:6px 0;background:${style.styles.itemBgColor} !important;color:${style.styles.itemTextColor} !important;border-radius:4px;border:none;cursor:pointer;">测试项A</button>
                        <button style="display:block;width:100%;margin:6px 0;padding:6px 0;background:${style.styles.itemBgColor} !important;color:${style.styles.itemTextColor} !important;border-radius:4px;border:none;cursor:pointer;">测试项B</button>
                        <div style="color:${style.styles.emptyTextColor} !important; font-size:12px; margin-top:10px; text-align:center;">空提示示例</div>
                    </div>
                    <div style="width:48%; border:1.5px solid ${style.styles.menuBorderColor} !important; border-radius:6px; background:transparent; padding:8px 4px;">
                        <div style="font-weight:bold; color:${style.styles.titleColor} !important; border-bottom:1px solid ${style.styles.titleBorderColor} !important; margin-bottom:8px; text-align:center;">全局快速回复</div>
                        <button style="display:block;width:100%;margin:6px 0;padding:6px 0;background:${style.styles.itemBgColor} !important;color:${style.styles.itemTextColor} !important;border-radius:4px;border:none;cursor:pointer;">测试项C</button>
                        <button style="display:block;width:100%;margin:6px 0;padding:6px 0;background:${style.styles.itemBgColor} !important;color:${style.styles.itemTextColor} !important;border-radius:4px;border:none;cursor:pointer;">测试项D</button>
                        <div style="color:${style.styles.emptyTextColor} !important; font-size:12px; margin-top:10px; text-align:center;">空提示示例</div>
                    </div>
                </div>
            `;
        }

        document.getElementById('qrq-builtin-css-apply').onclick = function() {
            // 应用选中风格到设置
            const settings = window.extension_settings[Constants.EXTENSION_NAME];
            settings.menuStyles = { ...BUILTIN_CSS_STYLES[selectedBuiltinIndex].styles };
            // 立即更新菜单样式（应用到 UI）
            updateMenuStylesUI();
            saveSettings();
            // 隐藏内置 CSS 弹窗
            builtinCssModal.style.display = 'none';
        };
        document.getElementById('qrq-builtin-css-cancel').onclick = function() {
            builtinCssModal.style.display = 'none'; // 只隐藏内置css弹窗
        };
    }
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
            const fileData = e.target.result; // 完整的 Data URL
            const settings = extension_settings[Constants.EXTENSION_NAME];

            // 1. 首先更新 settings 对象中的真实数据
            settings.customIconUrl = fileData;

            // 2. 然后更新 DOM 元素 (dataset 和 value)
            if (fileData.length > 1000) {
                customIconUrlInput.dataset.fullValue = fileData;
                customIconUrlInput.value = "[图片数据已保存，但不在输入框显示以提高性能]"; // 这可能会触发 input 事件 -> handleSettingsChange
            } else {
                delete customIconUrlInput.dataset.fullValue; // 清除旧的 dataset (如果适用)
                customIconUrlInput.value = fileData;          // 这也可能触发 input 事件
            }

            // 3. 更新图标显示 (它会从 settings.customIconUrl 读取)
            updateIconDisplay();
            scheduleAutoSave();

            // 4. 如果需要，标记"未保存"状态或提示用户保存。
            // (handleSettingsChange 会被触发，但其逻辑已调整，不会错误覆盖 settings.customIconUrl)
            // 检查是否与已保存的图标匹配，并相应地更新选择下拉框和删除按钮状态
            const currentSize = settings.customIconSize;
            const isStillSaved = settings.savedCustomIcons && settings.savedCustomIcons.some(
                icon => icon.url === fileData && icon.size === currentSize
            );
            if (!isStillSaved) {
                sharedState.currentSelectedSavedIconId = null;
                const deleteBtn = document.getElementById(Constants.ID_DELETE_SAVED_ICON_BUTTON);
                if (deleteBtn) deleteBtn.style.display = 'none';
                const selectElement = document.getElementById(Constants.ID_CUSTOM_ICON_SELECT);
                if (selectElement) selectElement.value = "";
            } else {
                // 如果上传的图标恰好是已保存的某个，可以考虑自动选中它
                const savedMatch = settings.savedCustomIcons.find(icon => icon.url === fileData && icon.size === currentSize);
                if (savedMatch) {
                    sharedState.currentSelectedSavedIconId = savedMatch.id;
                    const deleteBtn = document.getElementById(Constants.ID_DELETE_SAVED_ICON_BUTTON);
                    if (deleteBtn) deleteBtn.style.display = 'inline-block';
                    const selectElement = document.getElementById(Constants.ID_CUSTOM_ICON_SELECT);
                    if (selectElement) selectElement.value = savedMatch.id;
                }
            }
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
    const settings = extension_settings[Constants.EXTENSION_NAME] = extension_settings[Constants.EXTENSION_NAME] || {};

    settings.enabled = settings.enabled !== false;
    settings.iconType = settings.iconType || Constants.ICON_TYPES.ROCKET;
    settings.customIconUrl = settings.customIconUrl || ''; // 这个是权威数据
    settings.customIconSize = settings.customIconSize || Constants.DEFAULT_CUSTOM_ICON_SIZE;
    settings.faIconCode = settings.faIconCode || '';
    settings.globalIconSize = typeof settings.globalIconSize !== 'undefined' ? settings.globalIconSize : null;
    settings.savedCustomIcons = Array.isArray(settings.savedCustomIcons) ? settings.savedCustomIcons : []; // 确保是数组
    settings.whitelist = Array.isArray(settings.whitelist) ? settings.whitelist : [];
    settings.autoShrinkEnabled = settings.autoShrinkEnabled === true; // 新增：确保是布尔值

    const enabledDropdown = document.getElementById(Constants.ID_SETTINGS_ENABLED_DROPDOWN);
    if (enabledDropdown) enabledDropdown.value = String(settings.enabled);

    const iconTypeDropdown = document.getElementById(Constants.ID_ICON_TYPE_DROPDOWN);
    if (iconTypeDropdown) iconTypeDropdown.value = settings.iconType;

    const customIconUrlInput = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
    if (customIconUrlInput) {
        // 根据 settings.customIconUrl (权威数据) 来设置 input.value 和 input.dataset.fullValue
        if (settings.customIconUrl && settings.customIconUrl.length > 1000) {
            customIconUrlInput.dataset.fullValue = settings.customIconUrl;
            customIconUrlInput.value = "[图片数据已保存，但不在输入框显示以提高性能]";
        } else {
            customIconUrlInput.value = settings.customIconUrl;
            delete customIconUrlInput.dataset.fullValue;
        }
    }

    const customIconSizeInput = document.getElementById(Constants.ID_CUSTOM_ICON_SIZE_INPUT);
    if (customIconSizeInput) customIconSizeInput.value = settings.customIconSize;

    const faIconCodeInput = document.getElementById(Constants.ID_FA_ICON_CODE_INPUT);
    if (faIconCodeInput) faIconCodeInput.value = settings.faIconCode;

    const customIconContainer = document.querySelector('.custom-icon-container');
    const faIconContainer = document.querySelector('.fa-icon-container');
    if (customIconContainer) {
        customIconContainer.style.display = (settings.iconType === Constants.ICON_TYPES.CUSTOM) ? 'flex' : 'none';
    }
    if (faIconContainer) {
        faIconContainer.style.display = (settings.iconType === Constants.ICON_TYPES.FONTAWESOME) ? 'flex' : 'none';
    }

    // 新增：加载时同步隐藏/显示全局大小行
    const globalIconContainer = document.querySelector('.global-icon-container');
    if (globalIconContainer) {
        globalIconContainer.style.display = (settings.iconType === Constants.ICON_TYPES.CUSTOM) ? 'none' : 'flex';
    }

    setupSettingsEventListeners();
    if (!settings.enabled && sharedState.domElements.rocketButton) {
        sharedState.domElements.rocketButton.style.display = 'none';
    }

    updateIconDisplay();
    updateCustomIconSelect(); // 确保加载后下拉列表也更新

    const globalIconSizeInput = document.getElementById(Constants.ID_GLOBAL_ICON_SIZE_INPUT);
    if (globalIconSizeInput) {
        globalIconSizeInput.value = settings.globalIconSize !== null ? settings.globalIconSize : "";
    }

    // 更新删除按钮的初始状态，基于当前 customIconUrl 和 customIconSize 是否匹配某个已保存项
    const isCurrentIconSaved = settings.savedCustomIcons.some(
        icon => icon.url === settings.customIconUrl && icon.size === settings.customIconSize
    );
    const savedMatch = settings.savedCustomIcons.find(icon => icon.url === settings.customIconUrl && icon.size === settings.customIconSize);

    const deleteBtn = document.getElementById(Constants.ID_DELETE_SAVED_ICON_BUTTON);
    const selectElement = document.getElementById(Constants.ID_CUSTOM_ICON_SELECT);

    if (savedMatch) {
        sharedState.currentSelectedSavedIconId = savedMatch.id;
        if (deleteBtn) deleteBtn.style.display = 'inline-block';
        if (selectElement) selectElement.value = savedMatch.id;
    } else {
        sharedState.currentSelectedSavedIconId = null;
        if (deleteBtn) deleteBtn.style.display = 'none';
        if (selectElement) selectElement.value = "";
    }

    populateWhitelistManagementUI();
    if (window.quickReplyMenu?.applyWhitelistDOMChanges) window.quickReplyMenu.applyWhitelistDOMChanges();
    
    // 加载并应用自动伸缩设置
    const autoShrinkCheckbox = document.getElementById(Constants.ID_AUTO_SHRINK_CHECKBOX);
    if (autoShrinkCheckbox) {
        autoShrinkCheckbox.checked = settings.autoShrinkEnabled;
    }
    // 根据加载的设置，决定是注入还是移除样式
    if (settings.autoShrinkEnabled) {
        injectAutoShrinkStyle();
    } else {
        // 这一步至关重要：确保在设置为false时，任何残留的样式都会被移除
        removeAutoShrinkStyle();
    }

    console.log(`[${Constants.EXTENSION_NAME}] Settings loaded and applied to settings panel.`);
}

/**
 * 保存当前自定义图标设置到列表
 */
function saveCustomIcon() {
    const settings = window.extension_settings[Constants.EXTENSION_NAME];
    const customIconUrlInput = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
    const customIconSize = parseInt(document.getElementById(Constants.ID_CUSTOM_ICON_SIZE_INPUT).value, 10);

    // 核心修复：优先从 dataset.fullValue 获取 URL，如果它存在且输入框是占位符。
    // 否则，使用输入框的当前 .value。
    // "别人"的简洁方案: const urlToSave = customIconUrlInput.dataset.fullValue ? customIconUrlInput.dataset.fullValue : customIconUrlInput.value;
    // 我们的 settings.customIconUrl 应该已经是权威的了，由 handleSettingsChange 和 handleFileUpload 维护。
    const urlToSave = settings.customIconUrl; // 直接从 settings 对象取，它应该是最新的真实数据

    if (!urlToSave || !urlToSave.trim()) { // 检查 settings.customIconUrl
        const saveStatus = document.getElementById('qr-save-status');
        if (saveStatus) {
            saveStatus.textContent = '请先输入图标URL或上传图片';
            saveStatus.style.color = '#f44336';
            setTimeout(() => { saveStatus.textContent = ''; }, 2000);
        }
        return;
    }

    if (!settings.savedCustomIcons) {
        settings.savedCustomIcons = [];
    }

    // 优化默认名称生成
    let defaultName = '';
    try {
        if (urlToSave.startsWith('data:image')) {
            const typePart = urlToSave.substring(5, urlToSave.indexOf(';')); // e.g., "image/png"
            const ext = typePart.split('/')[1] || 'img';
            defaultName = `${ext.toUpperCase()}_${new Date().getTime().toString().slice(-6)}`;
        } else if (urlToSave.startsWith('<svg')) {
            defaultName = `SVG_${new Date().getTime().toString().slice(-6)}`;
        } else {
            const urlObj = new URL(urlToSave); // 尝试解析为URL
            const pathParts = urlObj.pathname.split('/');
            let filename = decodeURIComponent(pathParts[pathParts.length - 1]);
            if (filename.includes('.')) filename = filename.substring(0, filename.lastIndexOf('.')); //移除扩展名
            defaultName = filename.substring(0, 20) || `WebIcon_${new Date().getTime().toString().slice(-6)}`;
        }
    } catch (e) {
        defaultName = `图标_${new Date().getTime().toString().slice(-6)}`;
    }
    defaultName = defaultName.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 25); // 清理并截断

    const iconName = prompt("请输入图标名称:", defaultName);
    if (iconName === null) return; // 用户取消

    const newIconData = {
        id: `icon_${new Date().getTime()}`,
        name: iconName.trim() || defaultName,
        url: urlToSave, // 使用来自 settings.customIconUrl 的真实数据
        size: customIconSize
    };

    settings.savedCustomIcons.push(newIconData);
    updateCustomIconSelect();
    scheduleAutoSave();

    // 保存后，自动选中新保存的项，并更新删除按钮状态
    const selectElement = document.getElementById(Constants.ID_CUSTOM_ICON_SELECT);
    if (selectElement) selectElement.value = newIconData.id;
    sharedState.currentSelectedSavedIconId = newIconData.id;
    const deleteBtn = document.getElementById(Constants.ID_DELETE_SAVED_ICON_BUTTON);
    if (deleteBtn) deleteBtn.style.display = 'inline-block';


    const saveStatus = document.getElementById('qr-save-status');
    if (saveStatus) {
        saveStatus.textContent = `✓ 图标"${newIconData.name}"已保存`;
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
    const deleteBtn = document.getElementById(Constants.ID_DELETE_SAVED_ICON_BUTTON);

    if (!selectedId) {
        sharedState.currentSelectedSavedIconId = null;
        if (deleteBtn) deleteBtn.style.display = 'none';
        // 可选：如果取消选择，是否要清除当前输入框？或者保留？当前逻辑是保留。
        return;
    }

    const settings = window.extension_settings[Constants.EXTENSION_NAME];
    if (!settings.savedCustomIcons) {
        sharedState.currentSelectedSavedIconId = null;
        if (deleteBtn) deleteBtn.style.display = 'none';
        return;
    }

    const selectedIcon = settings.savedCustomIcons.find(icon => icon.id === selectedId);
    if (!selectedIcon) {
        sharedState.currentSelectedSavedIconId = null;
        if (deleteBtn) deleteBtn.style.display = 'none';
        return;
    }

    // 1. 更新 settings 对象 (权威数据源)
    settings.iconType = Constants.ICON_TYPES.CUSTOM;
    settings.customIconUrl = selectedIcon.url; // 真实数据
    settings.customIconSize = selectedIcon.size;

    // 2. 更新 DOM 元素以反映 settings
    document.getElementById(Constants.ID_ICON_TYPE_DROPDOWN).value = Constants.ICON_TYPES.CUSTOM;
    const customIconUrlInput = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
    if (selectedIcon.url.length > 1000) {
        customIconUrlInput.dataset.fullValue = selectedIcon.url;
        customIconUrlInput.value = "[图片数据已保存，但不在输入框显示以提高性能]";
    } else {
        customIconUrlInput.value = selectedIcon.url;
        delete customIconUrlInput.dataset.fullValue;
    }
    document.getElementById(Constants.ID_CUSTOM_ICON_SIZE_INPUT).value = selectedIcon.size;

    // 3. 更新共享状态和UI
    sharedState.currentSelectedSavedIconId = selectedId;
    if (deleteBtn) deleteBtn.style.display = 'inline-block';

    updateIconDisplay(); // 使用更新后的 settings 来刷新按钮
    scheduleAutoSave();

    const saveStatus = document.getElementById('qr-save-status');
    if (saveStatus) {
        saveStatus.textContent = '图标已应用';
        saveStatus.style.color = '#ff9800';
        setTimeout(() => { if(saveStatus.textContent === '图标已应用') saveStatus.textContent = ''; }, 3000);
    }
}

// 新增函数处理全局图标大小重置
function handleResetIconSize() {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    settings.globalIconSize = null; // 重置为 null
    const globalIconSizeInput = document.getElementById(Constants.ID_GLOBAL_ICON_SIZE_INPUT);
    if (globalIconSizeInput) {
        globalIconSizeInput.value = ""; // 清空输入框
    }
    updateIconDisplay();
    // 可以在这里加一个提示，提示用户保存设置
    scheduleAutoSave();
    const saveStatus = document.getElementById('qr-save-status');
    if (saveStatus) {
        saveStatus.textContent = '全局图标大小已重置';
        saveStatus.style.color = '#ff9800';
        setTimeout(() => { if(saveStatus.textContent.includes('全局图标大小已重置')) saveStatus.textContent = ''; }, 3000);
    }
}

/**
 * 处理删除已保存图标的操作
 */
function handleDeleteSavedIcon() {
    const settings = window.extension_settings[Constants.EXTENSION_NAME];
    const selectedId = sharedState.currentSelectedSavedIconId;
    
    if (!selectedId || !settings.savedCustomIcons) {
        return;
    }

    // 找到要删除的图标及其索引
    const iconIndex = settings.savedCustomIcons.findIndex(icon => icon.id === selectedId);
    if (iconIndex === -1) {
        return;
    }
    
    // 获取要删除的图标
    const deletedIcon = settings.savedCustomIcons[iconIndex];
    
    // 确认删除
    if (!confirm(`确定要删除图标"${deletedIcon.name}"吗？`)) {
        return;
    }

    // 检查是否正在使用这个被删除的图标（通过URL和尺寸比对）
    const isCurrentlyUsed = 
        settings.customIconUrl === deletedIcon.url && 
        settings.customIconSize === deletedIcon.size;

    // 从数组中移除图标
    settings.savedCustomIcons.splice(iconIndex, 1);

    if (isCurrentlyUsed) {
        // 清理图标相关状态
        settings.customIconUrl = '';  // 清空URL
        
        // 清理输入框状态
        const customIconUrlInput = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
        if (customIconUrlInput) {
            customIconUrlInput.value = '';  // 清空输入框显示值
            delete customIconUrlInput.dataset.fullValue;  // 清除保存的完整值
        }
        
        // 重置图标尺寸为默认值
        const customIconSizeInput = document.getElementById(Constants.ID_CUSTOM_ICON_SIZE_INPUT);
        if (customIconSizeInput) {
            settings.customIconSize = Constants.DEFAULT_CUSTOM_ICON_SIZE;
            customIconSizeInput.value = Constants.DEFAULT_CUSTOM_ICON_SIZE;
        }

        // 重置选中状态
        sharedState.currentSelectedSavedIconId = null;
        
        // 隐藏删除按钮
        const deleteBtn = document.getElementById(Constants.ID_DELETE_SAVED_ICON_BUTTON);
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }
        
        // 更新图标显示
        updateIconDisplay();
        
        // 显示提示消息
        const saveStatus = document.getElementById('qr-save-status');
        if (saveStatus) {
            saveStatus.textContent = '已删除当前使用的图标';
            saveStatus.style.color = '#ff9800';
            setTimeout(() => { 
                if (saveStatus.textContent === '已删除当前使用的图标') {
                    saveStatus.textContent = '';
                }
            }, 3000);
        }
    } else {
        // 非当前使用的图标被删除时的提示
        const saveStatus = document.getElementById('qr-save-status');
        if (saveStatus) {
            saveStatus.textContent = `✓ 图标"${deletedIcon.name}"已删除`;
            saveStatus.style.color = '#4caf50';
            setTimeout(() => { saveStatus.textContent = ''; }, 2000);
        }
    }

    // 更新下拉选择框
    updateCustomIconSelect();
    
    // 若被删除的是当前选中项，重置选择框
    const selectElement = document.getElementById(Constants.ID_CUSTOM_ICON_SELECT);
    if (selectElement && selectedId === sharedState.currentSelectedSavedIconId) {
        selectElement.value = "";
    }

    // 确保任何删除操作都会触发自动保存
    scheduleAutoSave();
}

export async function populateWhitelistManagementUI() {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    const { chat, global } = fetchQuickReplies();
    const allReplies = [...(chat || []), ...(global || [])];
    const map = new Map();
    allReplies.forEach(r => {
        if (r.source === 'QuickReplyV2') {
            const id = `QRV2::${r.setName}`;
            if (!map.has(id)) map.set(id, { scopedId: id, displayName: `[QRv2] ${r.setName}` });
        } else if (r.source === 'JSSlashRunner') {
            const id = `JSR::${r.scriptId}`;
            if (!map.has(id)) map.set(id, { scopedId: id, displayName: `[JSR] ${r.setName}` });
        }
    });

    const nonList = document.getElementById('qrq-non-whitelisted-list');
    const wlList  = document.getElementById('qrq-whitelisted-list');
    if (!nonList || !wlList) return;
    nonList.innerHTML = '';
    wlList.innerHTML  = '';

    map.forEach(({ scopedId, displayName }) => {
        const item = document.createElement('div');
        item.className = 'qrq-whitelist-item';

        // 区分 JSR/QR，加 class
        if (scopedId.startsWith('JSR::')) {
            item.classList.add('jsr-item');
            // 去掉前缀
            item.textContent = displayName.replace(/^\[JSR\]\s*/, '');
        } else {
            item.classList.add('qr-item');
            item.textContent = displayName.replace(/^\[QRv2\]\s*/, '');
        }
        item.dataset.value = scopedId;

        if (settings.whitelist.includes(scopedId)) {
            wlList.appendChild(item);
        } else {
            nonList.appendChild(item);
        }
    });

    // 新增：为空时显示占位符
    const emptyTip = '点击对应选项即可转移到对面的列表，QR助手将不会隐藏白名单列表中的选项按钮。<br><br>更详细的信息可在插件页面查看"使用说明"。';
    if (!nonList.hasChildNodes()) {
        nonList.innerHTML = `<div class="qrq-whitelist-empty-tip"><em>${emptyTip}</em></div>`;
    }
    if (!wlList.hasChildNodes()) {
        wlList.innerHTML = `<div class="qrq-whitelist-empty-tip"><em>${emptyTip}</em></div>`;
    }
}

let autoSaveTimer = null;
function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveSettings();
  }, 300);  // 300ms 防抖
}
