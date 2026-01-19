// update.js
import * as Constants from './constants.js';
// 引入酒馆核心工具函数，用于生成合法的请求头（包含 CSRF Token）
import { getRequestHeaders } from '../../../../script.js';

// 远程仓库配置
const REPO_ROOT = "https://raw.githubusercontent.com/conniegarde8/QR/main";
const MANIFEST_URL = `${REPO_ROOT}/manifest.json`;
const CHANGELOG_URL = `${REPO_ROOT}/CHANGELOG.md`;

const KEY_LAST_CHECK = `${Constants.EXTENSION_NAME}_last_update_check`;
const KEY_UPDATE_INFO = `${Constants.EXTENSION_NAME}_update_info`;

/**
 * 异步获取本地插件版本 (针对 display_name 和 third-party 路径优化)
 */
async function getLocalVersion() {
    try {
        // 1. 调用后端 API 发现所有插件
        // 返回的 ext.name 实际上是路径，例如 "third-party/QR"
        const discoverResponse = await fetch('/api/extensions/discover');
        if (!discoverResponse.ok) return "Error (API)";
        
        const installedExtensions = await discoverResponse.json(); 

        // 2. 并发读取 manifest
        const manifestPromises = installedExtensions.map(async (ext) => {
            try {
                // 注意：这里 fetch 需要用 ext.name (即完整路径)
                const res = await fetch(`/scripts/extensions/${ext.name}/manifest.json`);
                if (res.ok) {
                    const json = await res.json();
                    return {
                        manifest: json,
                        folderPath: ext.name // 保存 "third-party/QR"
                    };
                }
            } catch (e) {}
            return null;
        });

        const results = await Promise.all(manifestPromises);
        const validResults = results.filter(r => r !== null);

        // 3. 匹配逻辑
        const target = validResults.find(item => {
            const m = item.manifest;
            const folder = item.folderPath;
            
            if (m.display_name === "QR助手") return true;

            // 只要路径以 /QR 结尾，或者就是 QR
            if (folder === "QR" || folder.endsWith("/QR") || folder.endsWith("/qr-assistant")) {
                return true;
            }

            return false;
        });

        if (target) {
            console.log(`[${Constants.EXTENSION_NAME}] Found local plugin at: ${target.folderPath}, Version: ${target.manifest.version}`);
            return target.manifest.version || "No Version";
        }

        return "Unknown";

    } catch (error) {
        console.error(`[${Constants.EXTENSION_NAME}] Local version check failed:`, error);
        return "Error";
    }
}

function compareVersions(v1, v2) {
    if (!v1 || !v2) return 0;
    const p1 = v1.replace(/^v/, '').split('.').map(Number);
    const p2 = v2.replace(/^v/, '').split('.').map(Number);
    const len = Math.max(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
        const n1 = p1[i] || 0;
        const n2 = p2[i] || 0;
        if (n1 > n2) return 1;
        if (n1 < n2) return -1;
    }
    return 0;
}

async function getRemoteVersion() {
    try {
        const response = await fetch(MANIFEST_URL + `?t=${Date.now()}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.version;
    } catch (error) {
        return null;
    }
}

export async function checkForUpdates(force = false) {
    const now = Date.now();
    const lastCheck = localStorage.getItem(KEY_LAST_CHECK);
    
    // 1. 每次都实时获取本地版本
    // 这一点开销很小，因为它只读取本地文件
    const localVer = await getLocalVersion();
    
    let remoteVer = null;
    let usedCache = false;

    // 2. 尝试获取远程版本
    // 如果不是强制刷新，且缓存未过期(24h)，则尝试从缓存中提取远程版本号
    if (!force && lastCheck && (now - parseInt(lastCheck) < 86400000)) {
        const cachedStr = localStorage.getItem(KEY_UPDATE_INFO);
        if (cachedStr) {
            try {
                const cachedObj = JSON.parse(cachedStr);
                // 我们只信任缓存里的 latestVersion，不信任它的 localVersion 或 hasUpdate
                if (cachedObj && cachedObj.latestVersion && cachedObj.latestVersion !== "Check Failed") {
                    remoteVer = cachedObj.latestVersion;
                    usedCache = true;
                }
            } catch (e) {
                // JSON 解析失败，忽略缓存
            }
        }
    }

    // 3. 如果没有命中缓存（或强制刷新），则请求 GitHub API
    if (!remoteVer) {
        remoteVer = await getRemoteVersion();
        
        // 只有成功获取到远程版本才更新时间戳
        if (remoteVer) {
            localStorage.setItem(KEY_LAST_CHECK, now.toString());
        }
    }

    // 4. 实时进行版本比对
    // 使用“实时的 localVer”和“可能来自缓存的 remoteVer”进行比对
    const hasUpdate = (remoteVer && localVer !== "Unknown" && localVer !== "Error") 
        ? compareVersions(remoteVer, localVer) > 0 
        : false;

    // 构建结果对象
    const result = {
        hasUpdate: hasUpdate,
        latestVersion: remoteVer || "Check Failed",
        localVersion: localVer, // 这里使用的是最新的本地版本
        checkedAt: usedCache ? parseInt(lastCheck || now) : now
    };

    // 5. 更新缓存内容
    // 即使我们用了缓存的 remoteVer，把最新的 result 存回去也是个好习惯
    // 这样如果用户下次刷新页面，缓存里的 localVersion 就是对的了（虽然我们上面的逻辑已经忽略了它）
    if (remoteVer) {
        localStorage.setItem(KEY_UPDATE_INFO, JSON.stringify(result));
    }

    return result;
}

export async function getChangelog() {
    try {
        const response = await fetch(CHANGELOG_URL + `?t=${Date.now()}`);
        return await response.text();
    } catch (e) {
        return "无法获取更新日志。";
    }
}

export async function performUpdate() {
    try {
        // 重新执行查找逻辑以获取准确的 folderPath
        const discoverResponse = await fetch('/api/extensions/discover');
        const extensions = await discoverResponse.json();
        let targetFolder = null;
        let isGlobal = false;

        // 简单的遍历查找
        for (const ext of extensions) {
            try {
                const res = await fetch(`/scripts/extensions/${ext.name}/manifest.json`);
                if (res.ok) {
                    const m = await res.json();
                    // 同样的匹配逻辑
                    if (m.display_name === "QR助手" ||
                        ext.name.endsWith("/QR") ||
                        ext.name === "QR") {
                        targetFolder = ext.name; // 这里会是 "third-party/QR"
                        isGlobal = ext.type === 'global'; // 捕获扩展类型
                        break;
                    }
                }
            } catch(e) {}
        }

        if (!targetFolder) {
            console.error(`[${Constants.EXTENSION_NAME}] Could not find extension folder for update.`);
            return { ok: false };
        }

        console.log(`[${Constants.EXTENSION_NAME}] Updating extension at: ${targetFolder}`);

        // 修正：后端 API 需要剥离 "third-party/" 前缀的短名称，并显式传递 global 参数
        const shortName = targetFolder.replace(/^third-party\//, '');

        // [修改] 使用 getRequestHeaders() 替代手动拼凑
        // getRequestHeaders() 会自动返回 { 'Content-Type': 'application/json', 'X-CSRF-Token': '...' }
        return await fetch('/api/extensions/update', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({
                extensionName: shortName,
                global: isGlobal
            })
        });
    } catch (e) {
        console.error("Update failed:", e);
        return { ok: false };
    }
}