// logger.js - 日志核心模块

export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    OFF: 4
};

export const LogCategory = {
    SYSTEM: 'System',
    API: 'API',
    UI: 'UI',
    WHITELIST: 'Whitelist',
    UPDATE: 'Update',
    CORE: 'Core'
};

class LoggerSystem {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000; // 限制内存中存储的日志数量
        this.currentLevel = LogLevel.INFO; // 默认级别 (INFO)
        this.listeners = [];
    }

    /**
     * 设置日志级别
     * @param {number} level
     */
    setLevel(level) {
        this.currentLevel = level;
    }

    /**
     * 添加日志
     * @param {number} level - 日志级别
     * @param {string} category - 日志分类
     * @param {string} message - 消息内容
     * @param {any} [data] - 附加数据
     */
    _add(level, category, message, data = null) {
        // 修改：不再在入口处拦截低等级日志，确保内存中记录所有历史
        // if (level < this.currentLevel) return;

        // 特殊处理 Error 对象，因为 JSON.stringify(new Error()) 会返回 {}
        // 我们需要将其属性显式提取出来，以便后续 JSON 导出和 UI 渲染
        let safeData = data;
        if (data instanceof Error) {
            safeData = {
                name: data.name,
                message: data.message,
                stack: data.stack,
                isError: true // 标记这是一个错误对象
            };
        }

        const timestamp = new Date().toISOString();
        const logEntry = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            timestamp,
            levelName: Object.keys(LogLevel).find(key => LogLevel[key] === level),
            level,
            category,
            message,
            data: safeData
        };

        this.logs.push(logEntry);

        // 维持队列长度
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // 修改：仅当满足当前等级时，才输出到浏览器控制台，避免刷屏
        if (level >= this.currentLevel) {
            this._consolePrint(logEntry);
        }

        // 通知监听器（用于更新UI）
        this._notifyListeners(logEntry);
    }

    _consolePrint(entry) {
        const style = `color: ${this._getColor(entry.level)}; font-weight: bold;`;
        // 修改：增加插件名称前缀，方便在控制台筛选
        const prefix = `[QR助手] [${entry.category}]`;
        if (entry.data) {
            console.log(`%c${prefix} ${entry.message}`, style, entry.data);
        } else {
            console.log(`%c${prefix} ${entry.message}`, style);
        }
    }

    _getColor(level) {
        switch (level) {
            case LogLevel.ERROR: return '#d32f2f';
            case LogLevel.WARN: return '#f57c00';
            case LogLevel.DEBUG: return '#757575';
            default: return '#1976d2';
        }
    }

    debug(category, message, data) { this._add(LogLevel.DEBUG, category, message, data); }
    info(category, message, data) { this._add(LogLevel.INFO, category, message, data); }
    warn(category, message, data) { this._add(LogLevel.WARN, category, message, data); }
    error(category, message, data) { this._add(LogLevel.ERROR, category, message, data); }

    /**
     * 导出日志为文本
     */
    exportLogs() {
        return this.logs.map(log => {
            const dataStr = log.data ? ` | Data: ${JSON.stringify(log.data)}` : '';
            return `[${log.timestamp}] [${log.levelName}] [${log.category}] ${log.message}${dataStr}`;
        }).join('\n');
    }

    /**
     * 清空日志
     */
    clear() {
        this.logs = [];
        this._notifyListeners(null); // null 视为清空信号
    }

    subscribe(callback) {
        this.listeners.push(callback);
    }

    _notifyListeners(entry) {
        this.listeners.forEach(cb => cb(entry, this.logs));
    }

    getDomStructure(rootId = 'send_form') {
        const root = document.getElementById(rootId);
        if (!root) return `[${rootId} not found]`;

        const traverse = (el, depth = 0) => {
            const indent = '  '.repeat(depth);
            let info = `${indent}<${el.tagName.toLowerCase()}`;

            if (el.id) info += ` id="${el.id}"`;
            if (el.className) info += ` class="${el.className}"`;

            if (el.classList.contains('qrq-hidden-by-plugin')) info += ` [HIDDEN]`;
            if (el.classList.contains('qrq-whitelisted-original')) info += ` [WHITELISTED]`;

            info += '>';

            if (el.children.length > 0) {
                const childInfo = Array.from(el.children).map(child => traverse(child, depth + 1)).join('\n');
                return `${info}\n${childInfo}`;
            } else {
                return info;
            }
        };

        return traverse(root);
    }
}

export const Logger = new LoggerSystem();

