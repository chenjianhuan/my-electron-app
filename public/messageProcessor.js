// 消息处理模块
class MessageProcessor {
    constructor() {
        this.ODDS = 47; // 赔率
        this.CUSTOM_ATTRIBUTE_STORAGE_KEY = 'customAttributeMap.v1';
        this.customAttributeCache = null;
        this.attributeOverrides = {};
        this.hiddenAttributeKeys = new Set();
        this.animalMap = {
            '鼠': [7, 19, 31, 43],
            '牛': [6, 18, 30, 42],
            '虎': [5, 17, 29, 41],
            '兔': [4, 16, 28, 40],
            '龙': [3, 15, 27, 39],
            '蛇': [2, 14, 26, 38],
            '马': [1, 13, 25, 37, 49],
            '羊': [12, 24, 36, 48],
            '猴': [11, 23, 35, 47],
            '鸡': [10, 22, 34, 46],
            '狗': [9, 21, 33, 45],
            '猪': [8, 20, 32, 44]
        };
    }

    getAnimalPattern() {
        return /[鼠牛虎兔龙蛇马羊猴鸡狗猪]/g;
    }

    getDefaultAttributeMap() {
        const attributeMap = {
            '单': [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49],
            '双': [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48],
            '大': [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49],
            '小': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
            '合单': [1, 3, 5, 7, 9, 10, 12, 14, 16, 18, 21, 23, 25, 27, 29, 30, 32, 34, 36, 38, 41, 43, 45, 47, 49],
            '大单': [25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49],
            '小单': [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23],
            '合大': [7, 8, 9, 16, 17, 18, 19, 25, 26, 27, 28, 29, 34, 35, 36, 37, 38, 39, 43, 44, 45, 46, 47, 48, 49],
            '尾大': [5, 6, 7, 8, 9, 15, 16, 17, 18, 19, 25, 26, 27, 28, 29, 35, 36, 37, 38, 39, 45, 46, 47, 48, 49],
            '合双': [2, 4, 6, 8, 11, 13, 15, 17, 19, 20, 22, 24, 26, 28, 31, 33, 35, 37, 39, 40, 42, 44, 46, 48],
            '大双': [26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48],
            '小双': [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24],
            '合小': [1, 2, 3, 4, 5, 6, 10, 11, 12, 13, 14, 15, 20, 21, 22, 23, 24, 30, 31, 32, 33, 40, 41, 42],
            '尾小': [1, 2, 3, 4, 10, 11, 12, 13, 14, 20, 21, 22, 23, 24, 30, 31, 32, 33, 34, 40, 41, 42, 43, 44],
            '金': [3, 4, 11, 12, 25, 26, 33, 34, 41, 42],
            '木': [7, 8, 15, 16, 23, 24, 37, 38, 45, 46],
            '水': [13, 14, 21, 22, 29, 30, 43, 44],
            '火': [1, 2, 9, 10, 17, 18, 31, 32, 39, 40, 47, 48],
            '土': [5, 6, 19, 20, 27, 28, 35, 36, 49],
            '红波': [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46],
            '蓝波': [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48],
            '绿波': [5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49],
            '家禽': [5, 7, 8, 9, 11, 12, 17, 19, 20, 21, 23, 24, 29, 31, 32, 33, 35, 36, 41, 43, 44, 45, 47, 48],
            '野兽': [1, 2, 3, 4, 6, 10, 13, 14, 15, 16, 18, 22, 25, 26, 27, 28, 30, 34, 37, 38, 39, 40, 42, 46, 49],
            '红单': [1, 7, 13, 19, 23, 29, 35, 45],
            '红双': [2, 8, 12, 18, 24, 30, 34, 40, 46],
            '蓝单': [3, 9, 15, 25, 31, 37, 41, 47],
            '蓝双': [4, 10, 14, 20, 26, 36, 42, 48],
            '绿单': [5, 11, 17, 21, 27, 33, 39, 43, 49],
            '绿双': [6, 16, 22, 28, 32, 38, 44],
            '天肖': [2, 3, 5, 7, 10, 12, 14, 15, 17, 19, 22, 24, 26, 27, 29, 31, 34, 36, 38, 39, 41, 43, 46, 48],
            '左肖': [1, 2, 5, 6, 9, 10, 13, 14, 17, 18, 21, 22, 25, 26, 29, 30, 33, 34, 37, 38, 41, 42, 45, 46, 49],
            '前肖': [1, 2, 3, 4, 5, 6, 13, 14, 15, 16, 17, 18, 25, 26, 27, 28, 29, 30, 37, 38, 39, 40, 41, 42, 49],
            '独字肖': [3, 4, 5, 6, 11, 12, 15, 16, 17, 18, 23, 24, 27, 28, 29, 30, 35, 36, 39, 40, 41, 42, 47, 48],
            '阴肖': [1, 2, 6, 7, 8, 12, 13, 14, 18, 19, 20, 24, 25, 26, 30, 31, 32, 36, 37, 38, 42, 43, 44, 48, 49],
            '地肖': [1, 4, 6, 8, 9, 11, 13, 16, 18, 20, 21, 23, 25, 28, 30, 32, 33, 35, 37, 40, 42, 44, 45, 47, 49],
            '右肖': [3, 4, 7, 8, 11, 12, 15, 16, 19, 20, 23, 24, 27, 28, 31, 32, 35, 36, 39, 40, 43, 44, 47, 48],
            '后肖': [7, 8, 9, 10, 11, 12, 19, 20, 21, 22, 23, 24, 31, 32, 33, 34, 35, 36, 43, 44, 45, 46, 47, 48],
            '合字肖': [1, 2, 7, 8, 9, 10, 13, 14, 19, 20, 21, 22, 25, 26, 31, 32, 33, 34, 37, 38, 43, 44, 45, 46, 49],
            '阳肖': [3, 4, 5, 9, 10, 11, 15, 16, 17, 21, 22, 23, 27, 28, 29, 33, 34, 35, 39, 40, 41, 45, 46, 47],
            '0尾': [10, 20, 30, 40],
            '1尾': [1, 11, 21, 31, 41],
            '2尾': [2, 12, 22, 32, 42],
            '3尾': [3, 13, 23, 33, 43],
            '4尾': [4, 14, 24, 34, 44],
            '5尾': [5, 15, 25, 35, 45],
            '6尾': [6, 16, 26, 36, 46],
            '7尾': [7, 17, 27, 37, 47],
            '8尾': [8, 18, 28, 38, 48],
            '9尾': [9, 19, 29, 39, 49],
            '大尾': [5, 6, 7, 8, 9, 15, 16, 17, 18, 19, 25, 26, 27, 28, 29, 35, 36, 37, 38, 39, 45, 46, 47, 48, 49],
            '小尾': [1, 2, 3, 4, 10, 11, 12, 13, 14, 20, 21, 22, 23, 24, 30, 31, 32, 33, 34, 40, 41, 42, 43, 44],
            '0头': [1, 2, 3, 4, 5, 6, 7, 8, 9],
            '1头': [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
            '2头': [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
            '3头': [30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
            '4头': [40, 41, 42, 43, 44, 45, 46, 47, 48, 49],
            '1门': [1, 2, 3, 4, 5, 6, 7, 8, 9],
            '2门': [10, 11, 12, 13, 14, 15, 16, 17, 18],
            '3门': [19, 20, 21, 22, 23, 24, 25, 26, 27],
            '4门': [28, 29, 30, 31, 32, 33, 34, 35, 36, 37],
            '5门': [38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49],
            '1段': [1, 2, 3, 4, 5, 6, 7],
            '2段': [8, 9, 10, 11, 12, 13, 14],
            '3段': [15, 16, 17, 18, 19, 20, 21],
            '4段': [22, 23, 24, 25, 26, 27, 28],
            '5段': [29, 30, 31, 32, 33, 34, 35],
            '6段': [36, 37, 38, 39, 40, 41, 42],
            '7段': [43, 44, 45, 46, 47, 48, 49],
            '1合': [1, 10],
            '2合': [2, 11, 20],
            '3合': [3, 12, 21, 30],
            '4合': [4, 13, 22, 31, 40],
            '5合': [5, 14, 23, 32, 41],
            '6合': [6, 15, 24, 33, 42],
            '7合': [7, 16, 25, 34, 43],
            '8合': [8, 17, 26, 35, 44],
            '9合': [9, 18, 27, 36, 45],
            '10合': [19, 28, 37, 46],
            '11合': [29, 38, 47],
            '12合': [39, 48],
            '13合': [49],
            '0合尾': [19, 28, 37, 46],
            '1合尾': [1, 10, 29, 38, 47],
            '2合尾': [2, 11, 20, 39, 48],
            '3合尾': [3, 12, 21, 30, 49],
            '4合尾': [4, 13, 22, 31, 40],
            '5合尾': [5, 14, 23, 32, 41],
            '6合尾': [6, 15, 24, 33, 42],
            '7合尾': [7, 16, 25, 34, 43],
            '8合尾': [8, 17, 26, 35, 44],
            '9合尾': [9, 18, 27, 36, 45],
            '楼上码': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 25, 26, 27, 28],
            '前落码': [1, 2, 3, 4, 5, 6, 7, 8, 17, 18, 19, 20, 21, 22, 23, 24, 33, 34, 35, 36, 37, 38, 39, 40],
            '左边码': [1, 2, 3, 4, 8, 9, 10, 11, 15, 16, 17, 18, 22, 23, 24, 29, 30, 31, 36, 37, 38, 43, 44, 45],
            '内围码': [9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 23, 24, 25, 26, 27, 30, 31, 32, 33, 34, 37, 38, 39, 40, 41],
            '中数': [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37],
            '楼下码': [22, 23, 24, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49],
            '后落码': [9, 10, 11, 12, 13, 14, 15, 16, 25, 26, 27, 28, 29, 30, 31, 32, 41, 42, 43, 44, 45, 46, 47, 48, 49],
            '右边码': [5, 6, 7, 12, 13, 14, 19, 20, 21, 25, 26, 27, 28, 32, 33, 34, 35, 39, 40, 41, 42, 46, 47, 48, 49],
            '外围码': [1, 2, 3, 4, 5, 6, 7, 8, 14, 15, 21, 22, 28, 29, 35, 36, 42, 43, 44, 45, 46, 47, 48, 49],
            '边数': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49]
        };

        for (let head = 0; head <= 4; head += 1) {
            const headNumbers = Array.from({ length: 49 }, (_, i) => i + 1).filter(num => {
                if (head === 0) return num >= 1 && num <= 9;
                return Math.floor(num / 10) === head;
            });
            attributeMap[`${head}头单`] = headNumbers.filter(num => num % 2 === 1);
            attributeMap[`${head}头双`] = headNumbers.filter(num => num % 2 === 0);
        }

        [3, 4, 5, 6, 7].forEach(mod => {
            for (let remainder = 0; remainder < mod; remainder += 1) {
                attributeMap[`${mod}余${remainder}`] = Array.from({ length: 49 }, (_, i) => i + 1)
                    .filter(num => num % mod === remainder);
            }
        });

        return attributeMap;
    }

    getAttributeMap() {
        const attributeMap = this.getDefaultAttributeMap();
        this.hiddenAttributeKeys.forEach(key => {
            delete attributeMap[key];
        });
        Object.entries(this.attributeOverrides || {}).forEach(([key, values]) => {
            attributeMap[key] = Array.isArray(values) ? values.slice() : [];
        });
        return attributeMap;
    }

    getCustomAttributeMap() {
        return this.attributeOverrides || {};
    }

    sanitizeCustomAttributeMap(customMap) {
        const sanitized = {};
        if (!customMap || typeof customMap !== 'object') return sanitized;
        Object.entries(customMap).forEach(([key, values]) => {
            if (!key || !Array.isArray(values)) return;
            const numbers = values
                .map(v => parseInt(v, 10))
                .filter(v => Number.isInteger(v) && v >= 1 && v <= 49);
            if (numbers.length > 0) {
                sanitized[key] = Array.from(new Set(numbers)).sort((a, b) => a - b);
            }
        });
        return sanitized;
    }

    setCustomAttributeMap(customMap) {
        const sanitized = this.sanitizeCustomAttributeMap(customMap);
        this.attributeOverrides = sanitized;
        this.customAttributeCache = sanitized;
    }

    saveCustomAttributeMap(customMap) {
        const sanitized = this.sanitizeCustomAttributeMap(customMap);
        this.attributeOverrides = sanitized;
        this.customAttributeCache = sanitized;
        this.persistAttributeConfig();
    }

    persistAttributeConfig() {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(this.CUSTOM_ATTRIBUTE_STORAGE_KEY, JSON.stringify(this.attributeOverrides));
        }
        const ipc = (typeof window !== 'undefined' && window.electronAPI) ? window.electronAPI : null;
        if (ipc && typeof ipc.send === 'function') {
            ipc.send('save-custom-attributes', this.attributeOverrides);
            ipc.send('save-attribute-config', this.getAttributeConfig());
        }
    }

    getAttributeConfig() {
        return {
            overrides: this.sanitizeCustomAttributeMap(this.attributeOverrides),
            hidden: Array.from(this.hiddenAttributeKeys)
        };
    }

    setAttributeConfig(config) {
        const payload = config && typeof config === 'object' ? config : {};
        this.attributeOverrides = this.sanitizeCustomAttributeMap(payload.overrides || {});
        this.hiddenAttributeKeys = new Set(
            Array.isArray(payload.hidden)
                ? payload.hidden.filter(item => typeof item === 'string' && item.trim().length > 0)
                : []
        );
        this.customAttributeCache = this.attributeOverrides;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(this.CUSTOM_ATTRIBUTE_STORAGE_KEY, JSON.stringify(this.attributeOverrides));
        }
    }

    normalizeAttributeNameKey(name) {
        return String(name || '').replace(/\s+/g, '').toLowerCase();
    }

    hasNameConflict(name, exceptName = '') {
        const target = this.normalizeAttributeNameKey(name);
        const except = this.normalizeAttributeNameKey(exceptName);
        if (!target) return false;
        const keys = Object.keys(this.getAttributeMap());
        return keys.some(key => {
            const normalized = this.normalizeAttributeNameKey(key);
            if (except && normalized === except) return false;
            return normalized === target;
        });
    }

    updateAttributeDefinition(oldName, nextName, numbersText, options = {}) {
        const prevName = String(oldName || '').trim();
        const name = String(nextName || '').trim();
        if (!prevName || !name) {
            throw new Error('属性名不能为空');
        }
        if (/\s/.test(name)) {
            throw new Error('属性名不能包含空格');
        }
        if (this.hasNameConflict(name, prevName)) {
            throw new Error('属性名重复，请使用其他名称');
        }

        const baseMap = this.getDefaultAttributeMap();
        const prevIsBase = Object.prototype.hasOwnProperty.call(baseMap, prevName);
        const parsedNumbers = this.parseNumbersFromText(numbersText);
        const allowEmpty = !!options.allowEmpty;
        if (!allowEmpty && parsedNumbers.length === 0) {
            throw new Error('请至少输入一个 01-49 的号码');
        }

        const overrides = { ...(this.attributeOverrides || {}) };
        if (Object.prototype.hasOwnProperty.call(overrides, prevName)) {
            delete overrides[prevName];
        }

        if (prevIsBase && name !== prevName) {
            this.hiddenAttributeKeys.add(prevName);
        }
        if (prevIsBase && name === prevName) {
            this.hiddenAttributeKeys.delete(prevName);
        }

        overrides[name] = parsedNumbers;
        this.saveCustomAttributeMap(overrides);
        return { name, numbers: parsedNumbers };
    }

    deleteAttributeDefinition(name) {
        const attrName = String(name || '').trim();
        if (!attrName) {
            throw new Error('属性名不能为空');
        }
        const baseMap = this.getDefaultAttributeMap();
        const currentMap = this.getAttributeMap();
        if (!Object.prototype.hasOwnProperty.call(currentMap, attrName)) {
            throw new Error('属性不存在');
        }

        const overrides = { ...(this.attributeOverrides || {}) };
        if (Object.prototype.hasOwnProperty.call(overrides, attrName)) {
            delete overrides[attrName];
        }

        if (Object.prototype.hasOwnProperty.call(baseMap, attrName)) {
            this.hiddenAttributeKeys.add(attrName);
        } else {
            this.hiddenAttributeKeys.delete(attrName);
        }

        this.saveCustomAttributeMap(overrides);
    }

    parseNumbersFromText(text) {
        if (!text) return [];
        const matches = String(text).match(/\d{1,2}/g) || [];
        const numbers = matches
            .map(token => parseInt(token, 10))
            .filter(num => Number.isInteger(num) && num >= 1 && num <= 49);
        return Array.from(new Set(numbers)).sort((a, b) => a - b);
    }

    upsertCustomAttribute(name, numbersText) {
        const attrName = String(name || '').trim();
        if (!attrName) {
            throw new Error('属性名不能为空');
        }
        if (/\s/.test(attrName)) {
            throw new Error('属性名不能包含空格');
        }
        const numbers = this.parseNumbersFromText(numbersText);
        if (numbers.length === 0) {
            throw new Error('请至少输入一个 01-49 的号码');
        }

        if (this.hasNameConflict(attrName)) {
            throw new Error('属性名重复，请使用其他名称');
        }
        const currentMap = { ...(this.attributeOverrides || {}) };
        if (Object.prototype.hasOwnProperty.call(currentMap, attrName)) {
            delete currentMap[attrName];
        }
        const customMap = { [attrName]: numbers, ...currentMap };
        this.saveCustomAttributeMap(customMap);
        return {
            name: attrName,
            numbers
        };
    }

    removeCustomAttribute(name) {
        const attrName = String(name || '').trim();
        if (!attrName) return;
        const customMap = { ...(this.attributeOverrides || {}) };
        if (customMap[attrName]) {
            delete customMap[attrName];
            this.saveCustomAttributeMap(customMap);
        }
    }

    // 解析消息（支持多行、生肖、金额继承）
    parseMessage(message) {
        try {
            const normalizedMessage = this.normalizeMessage(message);
            const trimmedMessage = normalizedMessage.trim();
            if (!trimmedMessage) {
                throw new Error('消息不能为空');
            }
            const entries = this.parseEntries(trimmedMessage);
            if (entries.length === 0) {
                throw new Error('未找到可识别的消息内容');
            }
            return {
                entries,
                original: trimmedMessage
            };
        } catch (error) {
            throw new Error(`消息解析失败: ${error.message}`);
        }
    }

    normalizeMessage(message) {
        if (!message) return '';
        return String(message)
            // 全角数字转半角数字
            .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248))
            // 全角空格转半角空格
            .replace(/\u3000/g, ' ')
            // 中文波浪与特殊连字符统一
            .replace(/[﹣－]/g, '-')
            .replace(/[～〜]/g, '～')
            // 常见中文分隔符统一
            .replace(/[、；;]/g, ' ')
            .replace(/[：]/g, ':');
    }

    parseEntries(message) {
        const lines = message
            .split(/\n+/)
            .map(line => line.trim())
            .filter(Boolean);

        const entries = [];
        const pendingSegments = [];
        let currentRegion = 'new_ao';

        lines.forEach((line, lineIndex) => {
            const amountRegex = /各(?:号)?[\u4e00-\u9fa5A-Za-z:：\s]*?([0-9０-９]+|[零〇一二两三四五六七八九十百千万]+)\s*(?:米|元|块|蚊)?/g;
            let lastCursor = 0;
            let match = null;
            let hasAmountAnchor = false;
            let lineHasRegionMarker = false;

            while ((match = amountRegex.exec(line)) !== null) {
                hasAmountAnchor = true;
                const beforeAmount = line.slice(lastCursor, match.index).trim();
                if (beforeAmount) {
                    const splitResult = this.splitTextByRegion(beforeAmount, currentRegion, lineIndex + 1);
                    pendingSegments.push(...splitResult.segments);
                    currentRegion = splitResult.currentRegion;
                    if (splitResult.containsRegionMarker) {
                        lineHasRegionMarker = true;
                    }
                }

                const amount = this.parseFlexibleAmount(match[1]);
                const parsedEntries = this.buildEntriesFromPendingSegments(pendingSegments, amount, lineIndex + 1);
                entries.push(...parsedEntries);
                pendingSegments.length = 0;

                lastCursor = match.index + match[0].length;
            }

            if (!hasAmountAnchor) {
                const looseAmount = this.tryParseLooseAmountLine(line);
                if (looseAmount.matched) {
                    if (pendingSegments.length === 0) {
                        throw new Error(`第 ${lineIndex + 1} 行是金额行但前面没有可绑定的号码`);
                    }
                    const parsedEntries = this.buildEntriesFromPendingSegments(
                        pendingSegments,
                        looseAmount.amount,
                        lineIndex + 1
                    );
                    entries.push(...parsedEntries);
                    pendingSegments.length = 0;
                    return;
                }

                if (/[米元块蚊]/.test(line)) {
                    const lineNumbers = this.parseNumbersFromText(line);
                    if (lineNumbers.length >= 2) {
                        throw new Error(`第 ${lineIndex + 1} 行格式有歧义: "${line}"，包含单位但未使用“各”`);
                    }
                }
            }

            const tail = line.slice(lastCursor).trim();
            if (tail) {
                const splitResult = this.splitTextByRegion(tail, currentRegion, lineIndex + 1);
                pendingSegments.push(...splitResult.segments);
                currentRegion = splitResult.currentRegion;
                if (splitResult.containsRegionMarker) {
                    lineHasRegionMarker = true;
                }
            }

            if (!hasAmountAnchor && pendingSegments.length === 0 && !lineHasRegionMarker) {
                throw new Error(`第 ${lineIndex + 1} 行格式无法识别`);
            }
        });

        if (pendingSegments.length > 0) {
            const firstPending = pendingSegments[0];
            const lineText = String(firstPending.text || '').slice(0, 30);
            throw new Error(`第 ${firstPending.lineNo || '?'} 行存在未绑定金额: ${lineText}，请在后面补充“各XX”`);
        }

        return entries;
    }

    tryParseLooseAmountLine(line) {
        const normalized = String(line || '').trim();
        if (!normalized) {
            return { matched: false, amount: NaN };
        }
        const matched = normalized.match(/^([0-9０-９]+|[零〇一二两三四五六七八九十百千万]+)\s*(?:米|元|块|蚊)\s*$/);
        if (!matched) {
            return { matched: false, amount: NaN };
        }
        const amount = this.parseFlexibleAmount(matched[1]);
        return { matched: true, amount };
    }

    buildEntriesFromPendingSegments(pendingSegments, amount, lineNo) {
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error(`第 ${lineNo} 行金额无效`);
        }

        const regionNumberMap = new Map();
        pendingSegments.forEach(segment => {
            const numbers = this.extractNumbers(segment.text || '');
            if (numbers.length === 0) return;
            if (!regionNumberMap.has(segment.regionKey)) {
                regionNumberMap.set(segment.regionKey, new Set());
            }
            const numberSet = regionNumberMap.get(segment.regionKey);
            numbers.forEach(num => numberSet.add(num));
        });

        if (regionNumberMap.size === 0) {
            throw new Error(`第 ${lineNo} 行未找到有效号码`);
        }

        return Array.from(regionNumberMap.entries()).map(([regionKey, numberSet]) => ({
            regionKey,
            amount,
            numbers: Array.from(numberSet)
        }));
    }

    splitTextByRegion(text, initialRegion = 'new_ao', lineNo = null) {
        const markerRegex = /(老奥|新奥|澳门|香港|香|港|奥|澳)/g;
        const segments = [];
        let currentRegion = initialRegion || 'new_ao';
        let containsRegionMarker = false;
        let cursor = 0;
        let match = null;

        while ((match = markerRegex.exec(text)) !== null) {
            containsRegionMarker = true;
            const left = text.slice(cursor, match.index).trim();
            if (left) {
                segments.push({ text: left, regionKey: currentRegion, lineNo });
            }
            currentRegion = this.resolveRegionFromToken(match[1], currentRegion);
            cursor = match.index + match[1].length;
        }

        const tail = text.slice(cursor).trim();
        if (tail) {
            segments.push({ text: tail, regionKey: currentRegion, lineNo });
        }

        return { segments, currentRegion, containsRegionMarker };
    }

    resolveRegionFromToken(token, fallback = 'new_ao') {
        if (token === '老奥') return 'old_ao';
        if (token === '香港' || token === '香' || token === '港') return 'hongkong';
        if (token === '新奥' || token === '澳门' || token === '奥' || token === '澳') return 'new_ao';
        return fallback || 'new_ao';
    }

    parseFlexibleAmount(token) {
        const raw = String(token || '').trim();
        if (!raw) {
            throw new Error('缺少金额');
        }

        const normalizedDigits = raw.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248));
        if (/^\d+$/.test(normalizedDigits)) {
            const amount = parseInt(normalizedDigits, 10);
            if (Number.isFinite(amount) && amount > 0) {
                return amount;
            }
            throw new Error(`无效金额: ${token}`);
        }

        const chineseNumber = normalizedDigits.replace(/[^零〇一二两三四五六七八九十百千万]/g, '');
        const parsedChinese = this.chineseToNumber(chineseNumber);
        if (Number.isFinite(parsedChinese) && parsedChinese > 0) {
            return parsedChinese;
        }
        throw new Error(`无效金额: ${token}`);
    }

    chineseToNumber(chinese) {
        if (!chinese) return NaN;
        const digitMap = {
            '零': 0,
            '〇': 0,
            '一': 1,
            '二': 2,
            '两': 2,
            '三': 3,
            '四': 4,
            '五': 5,
            '六': 6,
            '七': 7,
            '八': 8,
            '九': 9
        };
        const unitMap = {
            '十': 10,
            '百': 100,
            '千': 1000,
            '万': 10000
        };

        let total = 0;
        let section = 0;
        let number = 0;

        for (const ch of chinese) {
            if (Object.prototype.hasOwnProperty.call(digitMap, ch)) {
                number = digitMap[ch];
                continue;
            }

            const unit = unitMap[ch];
            if (!unit) continue;

            if (unit === 10000) {
                section = (section + (number || 0)) * unit;
                total += section;
                section = 0;
                number = 0;
                continue;
            }

            const base = number === 0 ? 1 : number;
            section += base * unit;
            number = 0;
        }

        return total + section + number;
    }

    extractNumbers(text) {
        const numbers = [];
        const numberSet = new Set();

        const numberStrings = text
            .split(/[\s.,，。:：\-—/~～]+/)
            .map(s => s.trim())
            .filter(Boolean);

        numberStrings.forEach(numStr => {
            if (!/^\d+$/.test(numStr)) return;
            const num = parseInt(numStr, 10);
            if (!this.validateNumber(num)) {
                throw new Error(`无效的数字: ${numStr}`);
            }
            if (!numberSet.has(num)) {
                numberSet.add(num);
                numbers.push(num);
            }
        });

        const attrMap = this.getAttributeMap();
        const attrKeys = Object.keys(attrMap).sort((a, b) => b.length - a.length);
        const cleaned = text.replace(/[\s.,，。:：\-—/~～]/g, '');
        let i = 0;

        while (i < cleaned.length) {
            const ch = cleaned[i];

            if (this.animalMap[ch]) {
                this.animalMap[ch].forEach(num => {
                    if (!numberSet.has(num)) {
                        numberSet.add(num);
                        numbers.push(num);
                    }
                });
                i += 1;
                continue;
            }

            let matched = false;
            for (const key of attrKeys) {
                if (cleaned.startsWith(key, i)) {
                    attrMap[key].forEach(num => {
                        if (!numberSet.has(num)) {
                            numberSet.add(num);
                            numbers.push(num);
                        }
                    });
                    i += key.length;
                    matched = true;
                    break;
                }
            }

            if (!matched) i += 1;
        }

        return numbers;
    }

    // 解析数字列表
    parseNumbers(numbersPart) {
        const numbers = [];
        const numberStrings = numbersPart
            .split(/[\s.,，。:：\-—/~～]+/)
            .map(s => s.trim())
            .filter(Boolean);

        for (const numStr of numberStrings) {
            const num = parseInt(numStr.trim(), 10);
            if (isNaN(num) || num < 1 || num > 49) {
                throw new Error(`无效的数字: ${numStr}`);
            }
            numbers.push(num);
        }

        return numbers;
    }

    // 解析金额
    parseAmount(amountPart) {
        const normalized = amountPart
            .trim()
            .replace(/^各(?:号)?/u, '')
            .trim();
        return this.parseFlexibleAmount(normalized);
    }

    // 验证数字是否有效
    validateNumber(number) {
        return number >= 1 && number <= 49;
    }

    // 获取数字对应的生肖
    getAnimalByNumber(number) {
        for (const [animal, numbers] of Object.entries(this.animalMap)) {
            if (numbers.includes(number)) {
                return animal;
            }
        }
        return null;
    }

    // 格式化数字为两位数
    formatNumber(number) {
        return number < 10 ? `0${number}` : `${number}`;
    }

    // 处理消息并更新用户数据
    processMessageForUser(message, userName) {
        try {
            const parsedMessage = this.parseMessage(message);
            const allUsers = userManager.getAllUsers ? userManager.getAllUsers() : {};
            if (!allUsers || !allUsers[userName]) {
                throw new Error('用户不存在');
            }

            let totalAdded = 0;
            const touchedRegionKeys = new Set();
            parsedMessage.entries.forEach(entry => {
                const regionKey = entry.regionKey || (userManager.getActiveRegion ? userManager.getActiveRegion() : 'new_ao');
                const userData = userManager.getUserRegionData
                    ? userManager.getUserRegionData(userName, regionKey)
                    : userManager.getUserData(userName);
                if (!userData) {
                    throw new Error(`地区数据不存在: ${regionKey}`);
                }
                touchedRegionKeys.add(regionKey);
                entry.numbers.forEach(number => {
                    const formattedNumber = this.formatNumber(number);
                    const dataItem = userData.data.find(item => item.number === formattedNumber);
                    if (dataItem) {
                        dataItem.value += entry.amount;
                        totalAdded += entry.amount;
                    }
                });
            });

            touchedRegionKeys.forEach(regionKey => {
                const userData = userManager.getUserRegionData
                    ? userManager.getUserRegionData(userName, regionKey)
                    : userManager.getUserData(userName);
                if (!userData) return;
                userData.originalData.push(parsedMessage.original);
                userData.totalCount = userData.data.reduce((sum, item) => sum + item.value, 0);
            });

            // 保存数据
            userManager.saveUserData();

            let newTotal = 0;
            const userRecord = allUsers[userName];
            if (userRecord && userRecord.regions && typeof userRecord.regions === 'object') {
                Object.values(userRecord.regions).forEach(regionData => {
                    if (!regionData || !Array.isArray(regionData.data)) return;
                    newTotal += regionData.data.reduce((sum, item) => sum + (item.value || 0), 0);
                });
            }

            return {
                success: true,
                message: '消息处理成功',
                parsed: parsedMessage,
                totalAdded,
                newTotal
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    // 预览消息解析结果
    previewMessage(message) {
        try {
            const parsedMessage = this.parseMessage(message);
            const resultEntries = parsedMessage.entries.map(entry => ({
                numbers: entry.numbers.map(num => ({
                    number: this.formatNumber(num),
                    animal: this.getAnimalByNumber(num),
                })),
                regionKey: entry.regionKey || 'new_ao',
                regionLabel: this.getRegionLabelByKey(entry.regionKey || 'new_ao'),
                amount: entry.amount,
                totalAmount: entry.numbers.length * entry.amount,
            }));
            const totalAmount = resultEntries.reduce((sum, entry) => sum + entry.totalAmount, 0);

            return {
                success: true,
                result: {
                    entries: resultEntries,
                    totalAmount,
                    original: parsedMessage.original,
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 生成预览HTML
    generatePreviewHTML(previewResult) {
        if (!previewResult.success) {
            return `<div style="color: red;">错误: ${previewResult.error}</div>`;
        }

        const result = previewResult.result;
        let html = '<div style="margin: 10px 0;">';
        html += '<h4>解析结果:</h4>';
        html += '<div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">';

        result.entries.forEach((entry, index) => {
            html += `<div style="margin: 8px 0; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">`;
            html += `<div style="font-size: 12px; color: #666;">第 ${index + 1} 段，地区 ${entry.regionLabel}，各 ${entry.amount}</div>`;
            entry.numbers.forEach(item => {
                html += `<div style="margin: 4px 0;">`;
                html += `<span style="font-weight: bold;">${item.number}</span> `;
                html += `<span style="color: #666;">${item.animal}</span> `;
                html += `<span style="color: #28a745;">+${entry.amount}</span>`;
                html += '</div>';
            });
            html += '</div>';
        });
        
        html += '<hr style="margin: 10px 0;">';
        html += `<div style="font-weight: bold; color: #007bff;">总金额: ${result.totalAmount}</div>`;
        html += '</div>';
        html += '</div>';

        return html;
    }

    getRegionLabelByKey(regionKey) {
        if (regionKey === 'old_ao') return '老奥';
        if (regionKey === 'hongkong') return '香港';
        return '新奥';
    }

    // 批量处理消息
    processBatchMessages(messages, userName) {
        const results = [];
        let successCount = 0;
        let errorCount = 0;

        for (const message of messages) {
            const result = this.processMessageForUser(message, userName);
            results.push(result);
            
            if (result.success) {
                successCount++;
            } else {
                errorCount++;
            }
        }

        return {
            results: results,
            summary: {
                total: messages.length,
                success: successCount,
                error: errorCount
            }
        };
    }

    // 导出用户数据
    exportUserData(userName) {
        const userData = userManager.getUserData(userName);
        if (!userData) {
            throw new Error('用户不存在');
        }

        const exportData = {
            userName: userName,
            totalCount: userData.totalCount,
            data: userData.data.filter(item => item.value > 0),
            originalData: userData.originalData,
            exportTime: new Date().toISOString()
        };

        return exportData;
    }

    // 导入用户数据
    importUserData(importData) {
        try {
            if (!importData.userName || !importData.data) {
                throw new Error('导入数据格式错误');
            }

            // 验证数据格式
            if (!Array.isArray(importData.data)) {
                throw new Error('数据格式错误');
            }

            // 创建或更新用户
            if (!userManager.getAllUsers()[importData.userName]) {
                userManager.addUser(importData.userName);
            }

            const userData = userManager.getUserData(importData.userName);
            
            // 更新数据
            userData.data = importData.data;
            userData.originalData = importData.originalData || [];
            userData.totalCount = importData.totalCount || 0;

            // 保存并刷新显示
            userManager.saveUserData();
            userManager.renderAllSections();

            return {
                success: true,
                message: `成功导入用户 ${importData.userName} 的数据`
            };
        } catch (error) {
            return {
                success: false,
                message: `导入失败: ${error.message}`
            };
        }
    }

    // 获取统计信息
    getStatistics(userName) {
        const userData = userManager.getUserData(userName);
        if (!userData) {
            return null;
        }

        const stats = {
            totalCount: userData.totalCount,
            messageCount: userData.originalData.length,
            topNumbers: userData.data
                .filter(item => item.value > 0)
                .sort((a, b) => b.value - a.value)
                .slice(0, 5),
            animalStats: this.getAnimalStatistics(userData.data)
        };

        return stats;
    }

    // 获取生肖统计
    getAnimalStatistics(data) {
        const animalStats = {};
        
        data.forEach(item => {
            if (item.value > 0) {
                if (!animalStats[item.text]) {
                    animalStats[item.text] = 0;
                }
                animalStats[item.text] += item.value;
            }
        });

        return Object.entries(animalStats)
            .sort((a, b) => b[1] - a[1])
            .map(([animal, value]) => ({ animal, value }));
    }
}

// 创建全局消息处理器实例
const messageProcessor = new MessageProcessor();

// 导出给其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessageProcessor;
}
// 挂载到window，确保全局可用
if (typeof window !== 'undefined') {
    window.messageProcessor = messageProcessor;
} 
