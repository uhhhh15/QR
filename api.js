// api.js
import * as Constants from './constants.js';

// 新版 JSR key
const JSR_DATA_KEY = "tavern_helper";

/**
 * 获取所有快速回复 (分类为：脚本工具类 vs 标准快速回复)
 */
export function fetchQuickReplies() {
    const stContext = window.SillyTavern?.getContext();
    const finalScriptReplies = []; // 左栏：脚本 (JSR, LWB)
    const finalStandardReplies = []; // 右栏：QR v2
    const processedLabels = new Set();

    // 1. Quick Reply v2 (Standard) -> 归入 Standard
    if (window.quickReplyApi && window.quickReplyApi.settings?.isEnabled !== false) {
        const qrApi = window.quickReplyApi;
        // 增加 scope 参数用于标记来源
        const processQrLevel = (setList, scope) => {
            if (!Array.isArray(setList)) return;
            setList.forEach(setLink => {
                if (setLink?.isVisible && setLink.set?.qrList) {
                    setLink.set.qrList.forEach(qr => {
                        if (qr && !qr.isHidden && qr.label) {
                            const label = qr.label.trim();
                            if (label && !processedLabels.has(label)) {
                                finalStandardReplies.push({
                                    setName: setLink.set.name,
                                    label,
                                    message: qr.message,
                                    isStandard: true,
                                    source: 'QuickReplyV2',
                                    scope: scope // 明确标记 global 或 character
                                });
                                processedLabels.add(label);
                            }
                        }
                    });
                }
            });
        };
        processQrLevel(qrApi.settings?.chatConfig?.setList, 'character');
        processQrLevel(qrApi.settings?.charConfig?.setList, 'character');
        processQrLevel(qrApi.settings?.config?.setList, 'global');
    }

    // 2. Tavern Helper / JSR (Modern API Only) -> 归入 Scripts
    const newApi = window.TavernHelper?.getAllEnabledScriptButtons;
    if (typeof newApi === 'function') {
        const enabledButtonsMap = newApi();
        const scriptNameMap = new Map();
        const globalScriptIds = new Set();

        const flatten = (items) => {
            if (!Array.isArray(items)) return [];
            const res = [];
            items.forEach(item => {
                if (item.type === 'folder' && Array.isArray(item.scripts)) res.push(...item.scripts);
                else if (item.type === 'folder' && Array.isArray(item.value)) res.push(...item.value);
                else if (item.type === 'script' && item.value) res.push(item.value);
                else if (item.id) res.push(item);
            });
            return res;
        };

        const parseJsrData = (data) => {
            if (!data) return null;
            if (Array.isArray(data)) { try { return Object.fromEntries(data); } catch (e) { return null; } }
            return data;
        };

        // A. Global
        const jsrSettings = stContext?.extensionSettings?.[JSR_DATA_KEY];
        const globalScripts = jsrSettings?.script?.scripts || jsrSettings?.scripts;
        if (globalScripts) flatten(globalScripts).forEach(s => {
            scriptNameMap.set(s.id, s.name);
            globalScriptIds.add(s.id);
        });

        // B. Preset
        if (window.TavernHelper?.getLoadedPresetName && window.TavernHelper?.getPreset) {
            try {
                const loadedName = window.TavernHelper.getLoadedPresetName();
                const presetObj = window.TavernHelper.getPreset(loadedName);
                const jsrData = presetObj?.extensions?.[JSR_DATA_KEY];
                const scripts = parseJsrData(jsrData)?.scripts;
                if (scripts) flatten(scripts).forEach(s => {
                    scriptNameMap.set(s.id, s.name);
                    globalScriptIds.add(s.id);
                });
            } catch (e) {}
        }
        const presetData = window.oai_settings?.extensions?.[JSR_DATA_KEY];
        const presetScripts = parseJsrData(presetData)?.scripts;
        if (presetScripts) flatten(presetScripts).forEach(s => {
            scriptNameMap.set(s.id, s.name);
            globalScriptIds.add(s.id);
        });

        // C. Character
        const charDataRaw = stContext?.characters?.[stContext.characterId]?.data?.extensions?.[JSR_DATA_KEY];
        const charScripts = parseJsrData(charDataRaw)?.scripts;
        if (charScripts) flatten(charScripts).forEach(s => scriptNameMap.set(s.id, s.name));

        // 处理按钮
        for (const script_id in enabledButtonsMap) {
            enabledButtonsMap[script_id].forEach(btn => {
                const label = btn.button_name.trim();
                if (label && !processedLabels.has(label)) {
                    const isGlobal = globalScriptIds.has(script_id);

                    finalScriptReplies.push({
                        setName: scriptNameMap.get(script_id) || 'JS Script',
                        label: label,
                        isStandard: false,
                        source: 'JSSlashRunner',
                        isApiBased: true,
                        buttonId: btn.button_id,
                        scriptId: script_id,
                        scope: isGlobal ? 'global' : 'character' // 标记作用域
                    });
                    processedLabels.add(label);
                }
            });
        }
    }

    // 3. LittleWhiteBox (XBTasks Only) -> 归入 Scripts
    if (window.XBTasks) {
        try {
            let lwbTasks = null;

            // 1. 优先尝试直接读取 Getter 属性 (新版 LWB)
            // 原因：window.XBTasks.list() 返回的数据不包含 buttonActivated 字段，会导致无法判断是否显示按钮。
            // 而 .global / .character 属性返回的是原始引用，包含完整字段。
            if ('global' in window.XBTasks || 'character' in window.XBTasks) {
                lwbTasks = {
                    global: window.XBTasks.global || [],
                    character: window.XBTasks.character || [],
                    preset: window.XBTasks.preset || []
                };
            }
            // 2. 回退尝试旧版同步接口 dump (仅当它存在且不是 Promise 时使用)
            else if (typeof window.XBTasks.dump === 'function') {
                const dumpResult = window.XBTasks.dump('all');
                // 确保不是 Promise (旧版是同步对象，新版是 Promise)
                if (dumpResult && typeof dumpResult.then !== 'function') {
                    lwbTasks = dumpResult;
                }
            }

            if (lwbTasks) {
                const processLwb = (tasks, scope) => {
                    if (!Array.isArray(tasks)) return;

                    // 获取当前角色名称（仅当 scope 为 character 时需要）
                    let charName = "Character";
                    if (scope === 'character' && stContext?.characterId) {
                        charName = stContext.characters[stContext.characterId]?.name || "Character";
                    }

                    tasks.forEach(t => {
                        // 增加 t.buttonActivated 检查，确保只获取配置了"按钮激活"的任务
                        if (t && !t.disabled && t.name && t.buttonActivated) {
                            const label = t.name.trim();
                            if (label && !processedLabels.has(label)) {

                                // 逻辑修改：如果是角色任务，setName 设为角色名（用于菜单视觉分组）
                                // 并标记 isLwbCharSet（用于设置界面合并）
                                const isCharSet = scope === 'character';
                                const finalSetName = isCharSet ? charName : `LWB-${scope}-${t.name}`;

                                finalScriptReplies.push({
                                    setName: finalSetName,
                                    label: label,
                                    message: t.commands || '',
                                    isStandard: false,
                                    source: 'LittleWhiteBox',
                                    taskId: t.name,
                                    taskScope: scope,
                                    scope: scope, // 保持统一命名
                                    isLwbCharSet: isCharSet // 新增标记
                                });
                                processedLabels.add(label);
                            }
                        }
                    });
                };
                processLwb(lwbTasks.character, 'character');
                processLwb(lwbTasks.global, 'global');
                processLwb(lwbTasks.preset, 'preset');
            }
        } catch (e) { console.error("LWB Error", e); }
    }

    // 4. 特殊第三方按钮 (pt-wb-common-button)
    const specialBtn = document.getElementById('pt-wb-common-button');
    if (specialBtn) {
        // 优先获取 title，其次是 innerText，最后回退默认值
        let label = specialBtn.title || specialBtn.innerText || "Common Button";
        label = label.trim();

        // 避免空标签
        if (!label) label = "WB Button";

        finalScriptReplies.push({
            setName: 'Third Party',
            label: label,
            isStandard: false,
            source: 'RawDomElement',
            domId: 'pt-wb-common-button', // 记录目标 ID
            scope: 'global'
        });
    }

    return { scripts: finalScriptReplies, standard: finalStandardReplies };
}

export async function triggerQuickReply(setName, label) {
    if (window.quickReplyApi) await window.quickReplyApi.executeQuickReply(setName, label);
}

export async function triggerJsRunnerScript(replyData) {
    const stContext = window.SillyTavern?.getContext();
    if (replyData.isApiBased && replyData.buttonId) {
        await stContext?.eventSource?.emit(replyData.buttonId);
    }
}

export async function triggerLwbTask(taskName) {
    if (typeof window.xbqte === 'function') await window.xbqte(taskName);
}

export function triggerRawDom(domId) {
    const el = document.getElementById(domId);
    if (el) {
        el.click();
    } else {
        console.warn(`[TavernHelper] Target DOM element #${domId} not found.`);
    }
}