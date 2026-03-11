// 消息处理模块
class MessageProcessor {
    constructor() {
        this.SYSTEM_DEFAULT_ODDS = 47;
        this.ODDS = this.SYSTEM_DEFAULT_ODDS; // 兼容旧逻辑：当前生效默认倍率
        this.CUSTOM_ATTRIBUTE_STORAGE_KEY = 'customAttributeMap.v1';
        this.customAttributeCache = null;
        this.attributeOverrides = {};
        this.hiddenAttributeKeys = new Set();
        this.globalRuleProfile = {};
        this.clientRuleProfiles = {};
        this.activeRuleClientId = '';
        this.activeRuleProfileCache = null;
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
            '单数': [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49],
            '双数': [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48],
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
            '家禽': [1, 6, 8, 9, 10, 12, 13, 18, 20, 21, 22, 24, 25, 30, 32, 33, 34, 36, 37, 42, 44, 45, 46, 48, 49],
            '野兽': [2, 3, 4, 5, 7, 11, 14, 15, 16, 17, 19, 23, 26, 27, 28, 29, 31, 35, 38, 39, 40, 41, 43, 47],
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

    emitAttributeConfigChanged() {
        if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function' || typeof window.CustomEvent !== 'function') {
            return;
        }
        window.dispatchEvent(new window.CustomEvent('message-processor-config-changed', {
            detail: this.getAttributeConfig()
        }));
    }

    setCustomAttributeMap(customMap) {
        const sanitized = this.sanitizeCustomAttributeMap(customMap);
        this.attributeOverrides = sanitized;
        this.customAttributeCache = sanitized;
        this.emitAttributeConfigChanged();
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
        this.emitAttributeConfigChanged();
    }

    getAttributeConfig() {
        return {
            overrides: this.sanitizeCustomAttributeMap(this.attributeOverrides),
            hidden: Array.from(this.hiddenAttributeKeys),
            anchorAliases: this.getAnchorAliasOverrides(),
            globalRules: this.getGlobalRuleProfile(),
            clientRules: this.getClientRuleProfiles()
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
        this.globalRuleProfile = this.sanitizeRuleProfile(payload.globalRules || {}, { forOverride: true });
        this.clientRuleProfiles = this.sanitizeClientRuleProfiles(payload.clientRules || {});

        // 兼容旧版本配置：anchorAliases 视为全局锚点覆盖。
        if (!payload.globalRules && payload.anchorAliases && typeof payload.anchorAliases === 'object') {
            const legacyAnchorRules = this.convertLegacyAnchorAliasMapToRules(payload.anchorAliases);
            this.globalRuleProfile = this.mergeRuleProfiles(this.globalRuleProfile, {
                anchorSemantics: legacyAnchorRules
            });
        }
        this.customAttributeCache = this.attributeOverrides;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(this.CUSTOM_ATTRIBUTE_STORAGE_KEY, JSON.stringify(this.attributeOverrides));
        }
        this.ODDS = this.getEffectiveDefaultOdds('');
        this.emitAttributeConfigChanged();
    }

    getSystemRuleProfile() {
        return {
            version: 'v1.1',
            defaultOdds: this.SYSTEM_DEFAULT_ODDS,
            tailShorthandAsSeparateGroups: true,
            amountUnits: this.getSystemAmountUnits(),
            anchorSemantics: {
                '各': { amountDistribute: 'per_number', enabled: true },
                '各号': { amountDistribute: 'per_number', enabled: true },
                '个': { amountDistribute: 'per_number', enabled: true },
                '个号': { amountDistribute: 'per_number', enabled: true },
                '个码': { amountDistribute: 'per_number', enabled: true },
                '个号码': { amountDistribute: 'per_number', enabled: true },
                '个数': { amountDistribute: 'per_number', enabled: true },
                '买': { amountDistribute: 'per_number', enabled: true },
                '连': { amountDistribute: 'per_number', enabled: true },
                'X': { amountDistribute: 'per_number', enabled: true },
                'x': { amountDistribute: 'per_number', enabled: true },
                '每个': { amountDistribute: 'per_number', enabled: true },
                '每个号': { amountDistribute: 'per_number', enabled: true },
                '每个码': { amountDistribute: 'per_number', enabled: true },
                '每个号码': { amountDistribute: 'per_number', enabled: true },
                '各个': { amountDistribute: 'per_number', enabled: true },
                '各子': { amountDistribute: 'per_number', enabled: true },
                '各数': { amountDistribute: 'per_number', enabled: true },
                '每个数': { amountDistribute: 'per_number', enabled: true },
                '各个数': { amountDistribute: 'per_number', enabled: true }
            },
            attributeCombinePolicy: 'intersection_then_union_fallback',
            symbolPolicy: {
                '#': 'noise',
                '井': 'noise',
                '*': 'noise'
            },
            ambiguityPolicy: 'confirm',
            anchorParseMode: 'strict',
            blockedPlayKeywords: this.getSystemBlockedPlayKeywordMap(),
            messageTypeWhitelist: this.getSystemMessageTypeWhitelist(),
            regionPolicy: {
                defaultRegion: 'new_ao',
                separateStatsByRegion: true,
                regionAliases: this.getSystemRegionAliasMap(),
                canonicalAlwaysShowRegion: true
            }
        };
    }

    getDefaultGlobalRuleProfile() {
        return {
            anchorSemantics: {
                '都': { amountDistribute: 'undetermined', enabled: true },
                '都买': { amountDistribute: 'undetermined', enabled: true },
                '全买': { amountDistribute: 'undetermined', enabled: true },
                '全下': { amountDistribute: 'undetermined', enabled: true },
                '通买': { amountDistribute: 'undetermined', enabled: true },
                '每号': { amountDistribute: 'undetermined', enabled: true },
                '每码': { amountDistribute: 'undetermined', enabled: true },
                '每数': { amountDistribute: 'undetermined', enabled: true },
                '各肖': { amountDistribute: 'per_target_equal_split', enabled: true },
                '每肖': { amountDistribute: 'per_target_equal_split', enabled: true },
                '每个肖': { amountDistribute: 'per_target_equal_split', enabled: true },
                '每个生肖': { amountDistribute: 'per_target_equal_split', enabled: true },
                '各尾': { amountDistribute: 'undetermined', enabled: true },
                '每尾': { amountDistribute: 'undetermined', enabled: true },
                '各波': { amountDistribute: 'undetermined', enabled: true },
                '每波': { amountDistribute: 'undetermined', enabled: true },
                '各门': { amountDistribute: 'undetermined', enabled: true },
                '每门': { amountDistribute: 'undetermined', enabled: true },
                '平摊': { amountDistribute: 'undetermined', enabled: true },
                '均分': { amountDistribute: 'undetermined', enabled: true },
                '共买': { amountDistribute: 'undetermined', enabled: true },
                '共下': { amountDistribute: 'undetermined', enabled: true },
                '一共': { amountDistribute: 'undetermined', enabled: true },
                '合共': { amountDistribute: 'undetermined', enabled: true },
                '全部': { amountDistribute: 'undetermined', enabled: true }
            }
        };
    }

    getAllowedBlockedPlayKeywordFamilies() {
        return ['pingte_xiao', 'te_xiao', 'yi_xiao', 'lian_play'];
    }

    getSystemBlockedPlayKeywordMap() {
        return {
            pingte_xiao: ['平特一肖', '平特肖', '平特', '平肖', '平'],
            te_xiao: ['特肖'],
            yi_xiao: ['一肖'],
            lian_play: [
                '二连', '二联', '三连', '三联', '四连', '五连',
                '二连肖', '三连肖', '四连肖', '五连肖',
                '二肖连', '三肖连', '四肖连', '五肖连',
                '连肖',
                '复式', '复试',
                '复式连肖', '复试连肖',
                '复式二连', '复试二连',
                '复式三连', '复试三连',
                '复式四连', '复试四连',
                '复式五连', '复试五连'
            ]
        };
    }

    getAllowedMessageTypeWhitelistKeys() {
        return [
            'bulk_equals_groups',
            'single_number_amount_shorthand',
            'number_pair_with_explicit_anchor',
            'implicit_amount_rewrite',
            'composite_attribute_shorthand'
        ];
    }

    getSystemMessageTypeWhitelist() {
        return {
            bulk_equals_groups: true,
            single_number_amount_shorthand: true,
            number_pair_with_explicit_anchor: true,
            implicit_amount_rewrite: true,
            composite_attribute_shorthand: true
        };
    }

    normalizeBlockedPlayKeywordToken(token) {
        return String(token || '').replace(/\s+/g, '').trim();
    }

    sanitizeBlockedPlayKeywordTokens(tokens, family = '') {
        const familyKey = String(family || '').trim();
        const seen = new Set();
        const safe = [];
        const rawTokens = Array.isArray(tokens)
            ? tokens
            : String(tokens || '')
                .split(/[\n,，、]/)
                .map(item => item.trim())
                .filter(Boolean);
        rawTokens.forEach((item) => {
            const token = this.normalizeBlockedPlayKeywordToken(item);
            if (!token || token.length > 16) return;
            if (/[\r\n]/.test(token)) return;
            if (!/[\u4e00-\u9fa5A-Za-z]/.test(token)) return;
            if (/^[0-9０-９]+$/.test(token)) return;
            if (token.length < 2 && !['pingte_xiao'].includes(familyKey)) return;
            if (/^(?:元|块|米|蚊|毛|角|分|闷|号|碼|码|各|买|都)$/u.test(token)) return;
            if (seen.has(token)) return;
            seen.add(token);
            safe.push(token);
        });
        return safe;
    }

    sanitizeBlockedPlayKeywordMap(rawMap, options = {}) {
        const rejectSystemTokens = !!(options && options.rejectSystemTokens);
        const safe = {};
        const systemMap = this.getSystemBlockedPlayKeywordMap();
        if (!rawMap || typeof rawMap !== 'object') return safe;
        this.getAllowedBlockedPlayKeywordFamilies().forEach((family) => {
            let tokens = this.sanitizeBlockedPlayKeywordTokens(rawMap[family], family);
            if (rejectSystemTokens) {
                const systemTokens = new Set(Array.isArray(systemMap[family]) ? systemMap[family] : []);
                tokens = tokens.filter(token => !systemTokens.has(token));
            }
            if (tokens.length > 0) {
                safe[family] = tokens;
            }
        });
        return safe;
    }

    mergeBlockedPlayKeywordMap(baseMap, patchMap) {
        const safeBase = this.sanitizeBlockedPlayKeywordMap(baseMap || {}, { rejectSystemTokens: false });
        const safePatch = this.sanitizeBlockedPlayKeywordMap(patchMap || {}, { rejectSystemTokens: false });
        const merged = {};
        this.getAllowedBlockedPlayKeywordFamilies().forEach((family) => {
            const tokens = Array.from(new Set([
                ...(Array.isArray(safeBase[family]) ? safeBase[family] : []),
                ...(Array.isArray(safePatch[family]) ? safePatch[family] : [])
            ]));
            if (tokens.length > 0) {
                merged[family] = tokens;
            }
        });
        return merged;
    }

    sanitizeMessageTypeWhitelist(rawWhitelist) {
        const safe = {};
        if (!rawWhitelist || typeof rawWhitelist !== 'object') return safe;
        this.getAllowedMessageTypeWhitelistKeys().forEach((key) => {
            if (typeof rawWhitelist[key] !== 'boolean') return;
            safe[key] = rawWhitelist[key];
        });
        return safe;
    }

    mergeMessageTypeWhitelist(baseWhitelist, patchWhitelist) {
        return {
            ...this.sanitizeMessageTypeWhitelist(baseWhitelist || {}),
            ...this.sanitizeMessageTypeWhitelist(patchWhitelist || {})
        };
    }

    getResolvedGlobalRuleProfile() {
        const resolved = this.mergeRuleProfiles(
            this.getDefaultGlobalRuleProfile(),
            this.globalRuleProfile || {}
        );
        if (resolved.anchorSemantics && typeof resolved.anchorSemantics === 'object') {
            const anchors = this.sanitizeAnchorSemanticsMap(resolved.anchorSemantics);
            if (Object.keys(anchors).length > 0) {
                resolved.anchorSemantics = anchors;
            } else {
                delete resolved.anchorSemantics;
            }
        }
        resolved.noiseRules = this.sanitizeNoiseRules(resolved.noiseRules || []);
        if (resolved.noiseRules.length === 0) {
            delete resolved.noiseRules;
        }
        resolved.ignoreTokens = this.sanitizeIgnoreTokens(resolved.ignoreTokens || []);
        if (resolved.ignoreTokens.length === 0) {
            delete resolved.ignoreTokens;
        }
        resolved.amountUnits = this.sanitizeAmountUnits(resolved.amountUnits || []);
        if (resolved.amountUnits.length === 0) {
            delete resolved.amountUnits;
        }
        resolved.messageTypeWhitelist = this.sanitizeMessageTypeWhitelist(resolved.messageTypeWhitelist || {});
        if (Object.keys(resolved.messageTypeWhitelist).length === 0) {
            delete resolved.messageTypeWhitelist;
        }
        return resolved;
    }

    getAllowedAmountDistributeValues() {
        return ['per_number', 'per_target_equal_split', 'per_entry_equal_split', 'undetermined'];
    }

    getAllowedAttributeCombinePolicyValues() {
        return ['intersection', 'union', 'intersection_then_union_fallback', 'confirm'];
    }

    getAllowedSymbolPolicyValues() {
        return ['noise', 'unit', 'marker', 'error'];
    }

    getAllowedAmbiguityPolicyValues() {
        return ['confirm', 'auto', 'error'];
    }

    getAllowedAnchorParseModeValues() {
        return ['strict', 'loose'];
    }

    getAllowedAnchorTokenTypeValues() {
        return ['word', 'symbol', 'mixed'];
    }

    getAllowedAnchorPositionValues() {
        return ['before_amount', 'after_target', 'standalone'];
    }

    getAllowedAnchorBoundaryValues() {
        return ['strict', 'soft'];
    }

    getSystemAmountUnits() {
        return ['元', '块', '米', '蚊', '井', '斤', '毛', '角', '分', '闷'];
    }

    getStaticAmountSuffixTokens() {
        return ['注', '码', '碼'];
    }

    getSafeSingleNumberSuffixTokens() {
        return [
            ...this.getActiveAmountUnits(),
            '注'
        ];
    }

    normalizeAmountUnitToken(rawToken) {
        return String(rawToken || '')
            .replace(/\s+/g, '')
            .trim();
    }

    sanitizeAmountUnits(rawAmountUnits) {
        if (!Array.isArray(rawAmountUnits)) return [];
        const seen = new Set();
        const safe = [];
        rawAmountUnits.forEach((item) => {
            const candidate = item && typeof item === 'object' && !Array.isArray(item)
                ? item.token
                : item;
            const token = this.normalizeAmountUnitToken(candidate);
            if (!token || token.length > 6) return;
            if (/[\r\n]/.test(token)) return;
            if (/^[0-9０-９零〇一二两三四五六七八九十百千万]+$/.test(token)) return;
            if (!/[\u4e00-\u9fa5A-Za-z]/.test(token)) return;
            if (/^(?:新|老|香|港|奥|澳|新奥|新澳|老奥|老澳|澳门|香港)$/.test(token)) return;
            if (seen.has(token)) return;
            seen.add(token);
            safe.push(token);
        });
        return safe;
    }

    mergeAmountUnits(baseAmountUnits, patchAmountUnits) {
        return this.sanitizeAmountUnits([
            ...(Array.isArray(baseAmountUnits) ? baseAmountUnits : []),
            ...(Array.isArray(patchAmountUnits) ? patchAmountUnits : [])
        ]);
    }

    collectConfiguredAmountSuffixTokens() {
        const collected = [
            ...this.getSystemAmountUnits(),
            ...this.getStaticAmountSuffixTokens()
        ];
        if (this.globalRuleProfile && Array.isArray(this.globalRuleProfile.amountUnits)) {
            collected.push(...this.globalRuleProfile.amountUnits);
        }
        Object.values(this.clientRuleProfiles || {}).forEach((profile) => {
            if (!profile || !Array.isArray(profile.amountUnits)) return;
            collected.push(...profile.amountUnits);
        });
        return this.sanitizeAmountUnits(collected);
    }

    getActiveAmountUnits(clientId = null) {
        const profile = clientId == null
            ? this.getActiveRuleProfile()
            : this.getEffectiveRuleProfile(clientId);
        const configured = this.sanitizeAmountUnits(profile && profile.amountUnits ? profile.amountUnits : []);
        if (configured.length > 0) return configured;
        return this.sanitizeAmountUnits(this.getSystemAmountUnits());
    }

    getAmountSuffixTokens(options = {}) {
        const clientId = options && Object.prototype.hasOwnProperty.call(options, 'clientId')
            ? options.clientId
            : null;
        const includeGeneric = !options || options.includeGeneric !== false;
        const units = this.getActiveAmountUnits(clientId);
        return this.sanitizeAmountUnits([
            ...units,
            ...(includeGeneric ? this.getStaticAmountSuffixTokens() : [])
        ]);
    }

    normalizeIgnoreToken(rawToken) {
        return String(rawToken || '')
            .replace(/\s+/g, '')
            .trim();
    }

    getStaticReservedIgnoreTokens() {
        return new Set([
            ...Object.keys(this.getSystemRegionAliasMap() || {}),
            ...this.getSystemAmountUnits(),
            ...this.getStaticAmountSuffixTokens(),
            ...Object.keys((this.getSystemRuleProfile() || {}).anchorSemantics || {}),
            ...Object.keys((this.getDefaultGlobalRuleProfile() || {}).anchorSemantics || {})
        ]);
    }

    isSeparatorOnlyIgnoreToken(token) {
        return /^[,，.．。:：;；~～\-_=/+\\#*'"$￥¥!！?？|｜()（）[\]【】<>《》]+$/u.test(String(token || '').trim());
    }

    sanitizeIgnoreTokens(rawIgnoreTokens) {
        if (!Array.isArray(rawIgnoreTokens)) return [];
        const seen = new Set();
        const safe = [];
        const staticReservedTokens = this.getStaticReservedIgnoreTokens();
        rawIgnoreTokens.forEach((item) => {
            const candidate = item && typeof item === 'object' && !Array.isArray(item)
                ? item.token
                : item;
            const token = this.normalizeIgnoreToken(candidate);
            if (!token || token.length > 12) return;
            if (/[\r\n]/.test(token)) return;
            if (/[0-9０-９]/.test(token)) return;
            if (/^[零〇一二两三四五六七八九十百千万]+$/u.test(token)) return;
            if (this.isSeparatorOnlyIgnoreToken(token)) return;
            if (staticReservedTokens.has(token)) return;
            if (seen.has(token)) return;
            seen.add(token);
            safe.push(token);
        });
        return safe;
    }

    mergeIgnoreTokens(baseIgnoreTokens, patchIgnoreTokens) {
        return this.sanitizeIgnoreTokens([
            ...(Array.isArray(baseIgnoreTokens) ? baseIgnoreTokens : []),
            ...(Array.isArray(patchIgnoreTokens) ? patchIgnoreTokens : [])
        ]);
    }

    getIgnoreTokenValidationError(token, options = {}) {
        const normalized = this.normalizeIgnoreToken(token);
        if (!normalized) {
            return '忽略字符/词不能为空';
        }
        if (normalized.length > 12) {
            return '忽略字符/词长度不能超过12个字符';
        }
        if (/[\r\n]/.test(normalized)) {
            return '忽略字符/词不能包含换行';
        }
        if (/[0-9０-９]/.test(normalized) || /^[零〇一二两三四五六七八九十百千万]+$/u.test(normalized)) {
            return '忽略字符/词不能包含数字';
        }
        if (this.isSeparatorOnlyIgnoreToken(normalized)) {
            return '忽略字符/词不能只包含分隔符';
        }
        if (this.getStaticReservedIgnoreTokens().has(normalized)) {
            return '忽略字符/词不能与系统地区词、金额单位或默认锚点冲突';
        }
        const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
        const effectiveProfile = this.getEffectiveRuleProfile(clientId);
        const regionAliases = this.mergeRegionAliasMap(
            this.getSystemRegionAliasMap(),
            effectiveProfile && effectiveProfile.regionPolicy && effectiveProfile.regionPolicy.regionAliases
                ? effectiveProfile.regionPolicy.regionAliases
                : {}
        );
        const reservedTokens = new Set([
            ...Object.keys(regionAliases || {}),
            ...this.getActiveAmountUnits(clientId),
            ...Array.from(this.getEffectiveAnchorTokenSet(clientId))
        ]);
        if (reservedTokens.has(normalized)) {
            return '忽略字符/词不能与当前客户的地区词、金额单位或锚点冲突';
        }
        return '';
    }

    getActiveIgnoreTokens(clientId = null) {
        const profile = clientId == null
            ? this.getActiveRuleProfile()
            : this.getEffectiveRuleProfile(clientId);
        return this.sanitizeIgnoreTokens(profile && profile.ignoreTokens ? profile.ignoreTokens : []);
    }

    isNumberLikeTextChar(char) {
        return /[0-9０-９零〇一二两三四五六七八九十百千万]/u.test(String(char || ''));
    }

    getIgnoreTokenReplacement(text, startIndex, tokenLength) {
        const raw = String(text || '');
        const prevChar = startIndex > 0 ? raw[startIndex - 1] : '';
        const nextChar = startIndex + tokenLength < raw.length ? raw[startIndex + tokenLength] : '';
        if (this.isNumberLikeTextChar(prevChar) && this.isNumberLikeTextChar(nextChar)) {
            return ' ';
        }
        return '';
    }

    stripConfiguredIgnoreTokens(text, options = {}) {
        const rawText = String(text || '');
        if (!rawText) {
            return { text: '', matchedTokens: [] };
        }
        const clientId = options && Object.prototype.hasOwnProperty.call(options, 'clientId')
            ? options.clientId
            : null;
        const tokens = clientId == null
            ? this.getActiveIgnoreTokens()
            : this.getActiveIgnoreTokens(clientId);
        if (!Array.isArray(tokens) || tokens.length === 0) {
            return { text: rawText, matchedTokens: [] };
        }

        let cleaned = rawText;
        const matchedTokens = [];
        tokens
            .slice()
            .sort((a, b) => {
                if (b.length !== a.length) return b.length - a.length;
                return a.localeCompare(b, 'zh-Hans-CN');
            })
            .forEach((token) => {
                if (!token || !cleaned.includes(token)) return;
                let cursor = 0;
                let nextText = '';
                let matched = false;
                while (cursor < cleaned.length) {
                    const hitIndex = cleaned.indexOf(token, cursor);
                    if (hitIndex < 0) {
                        nextText += cleaned.slice(cursor);
                        break;
                    }
                    matched = true;
                    nextText += cleaned.slice(cursor, hitIndex);
                    nextText += this.getIgnoreTokenReplacement(cleaned, hitIndex, token.length);
                    cursor = hitIndex + token.length;
                }
                if (!matched) return;
                cleaned = nextText;
                matchedTokens.push(token);
            });

        if (matchedTokens.length > 0) {
            cleaned = cleaned
                .replace(/[ \t]{2,}/g, ' ')
                .replace(/[ \t]*\n[ \t]*/g, '\n');
        }

        return {
            text: cleaned,
            matchedTokens
        };
    }

    buildTokenAlternation(tokens) {
        const normalizedTokens = Array.from(new Set(
            (Array.isArray(tokens) ? tokens : [])
                .map(token => this.normalizeAmountUnitToken(token))
                .filter(Boolean)
        ));
        if (normalizedTokens.length === 0) return '';
        return normalizedTokens
            .sort((a, b) => {
                if (b.length !== a.length) return b.length - a.length;
                return a.localeCompare(b, 'zh-Hans-CN');
            })
            .map(token => this.escapeRegex(token))
            .join('|');
    }

    buildAmountUnitPattern(options = {}) {
        return this.buildTokenAlternation(this.getActiveAmountUnits(
            options && Object.prototype.hasOwnProperty.call(options, 'clientId') ? options.clientId : null
        ));
    }

    buildAmountSuffixPattern(options = {}) {
        return this.buildTokenAlternation(this.getAmountSuffixTokens(options));
    }

    buildSafeSingleNumberSuffixPattern(options = {}) {
        const clientId = options && Object.prototype.hasOwnProperty.call(options, 'clientId')
            ? options.clientId
            : null;
        return this.buildTokenAlternation(
            clientId == null
                ? this.getSafeSingleNumberSuffixTokens()
                : this.sanitizeAmountUnits([
                    ...this.getActiveAmountUnits(clientId),
                    '注'
                ])
        );
    }

    buildAmountPatternWithOptionalSuffix(options = {}) {
        const amountPattern = String(options && options.amountPattern ? options.amountPattern : this.getFlexibleAmountPatternSource());
        const suffixPattern = options && options.safeSingleNumber
            ? this.buildSafeSingleNumberSuffixPattern(options)
            : (options && options.includeGeneric === false
                ? this.buildAmountUnitPattern(options)
                : this.buildAmountSuffixPattern(options));
        if (!suffixPattern) {
            return `(?:${amountPattern})`;
        }
        return `(?:${amountPattern})(?:\\s*(?:${suffixPattern}))?`;
    }

    matchConfiguredAmountSuffixAt(text, startIndex, options = {}) {
        const tokens = options && options.safeSingleNumber
            ? this.sanitizeAmountUnits(this.getSafeSingleNumberSuffixTokens())
            : this.getAmountSuffixTokens(options);
        if (!Array.isArray(tokens) || tokens.length === 0) return '';
        const slice = String(text || '').slice(startIndex);
        const token = tokens
            .sort((a, b) => {
                if (b.length !== a.length) return b.length - a.length;
                return a.localeCompare(b, 'zh-Hans-CN');
            })
            .find(item => slice.startsWith(item));
        return token || '';
    }

    stripConfiguredAmountTokens(text, options = {}) {
        let normalized = String(text || '');
        const tokens = options && options.safeSingleNumber
            ? this.sanitizeAmountUnits(this.getSafeSingleNumberSuffixTokens())
            : this.getAmountSuffixTokens(options);
        tokens
            .sort((a, b) => {
                if (b.length !== a.length) return b.length - a.length;
                return a.localeCompare(b, 'zh-Hans-CN');
            })
            .forEach((token) => {
                if (!token) return;
                normalized = normalized.split(token).join('');
            });
        return normalized;
    }

    getNoiseRuleAmountPattern() {
        return this.buildAmountPatternWithOptionalSuffix({ includeGeneric: false });
    }

    getNoiseRuleCanonicalPlaceholder() {
        return '{金额}';
    }

    getNoiseRulePlaceholderAliases() {
        return [this.getNoiseRuleCanonicalPlaceholder(), '{amount}'];
    }

    normalizeNoiseRulePlaceholders(patternRaw) {
        const canonical = this.getNoiseRuleCanonicalPlaceholder();
        return String(patternRaw || '').replace(/\{amount\}/gi, canonical);
    }

    normalizeOddsValue(rawOdds, fallback = NaN) {
        const parsed = Number(rawOdds);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
        return Number.isFinite(fallback) && fallback > 0 ? fallback : NaN;
    }

    getActiveDefaultOdds() {
        const activeProfile = this.getActiveRuleProfile();
        const activeOdds = this.normalizeOddsValue(
            activeProfile && activeProfile.defaultOdds,
            this.SYSTEM_DEFAULT_ODDS
        );
        return Number.isFinite(activeOdds) ? activeOdds : this.SYSTEM_DEFAULT_ODDS;
    }

    getEffectiveDefaultOdds(clientId = '') {
        const effectiveProfile = this.getEffectiveRuleProfile(clientId);
        const effectiveOdds = this.normalizeOddsValue(
            effectiveProfile && effectiveProfile.defaultOdds,
            this.SYSTEM_DEFAULT_ODDS
        );
        return Number.isFinite(effectiveOdds) ? effectiveOdds : this.SYSTEM_DEFAULT_ODDS;
    }

    normalizeRuleClientId(clientId) {
        return String(clientId || '').trim();
    }

    normalizeAnchorAliasToken(token) {
        return String(token || '')
            .replace(/\s+/g, '')
            .replace(/[：:]+$/g, '')
            .trim();
    }

    inferAnchorTokenType(token) {
        const normalized = this.normalizeAnchorAliasToken(token);
        if (!normalized) return '';
        if (/^[\u4e00-\u9fa5A-Za-z]+$/.test(normalized)) return 'word';
        if (/^[^0-9０-９\u4e00-\u9fa5A-Za-z]+$/.test(normalized)) return 'symbol';
        return 'mixed';
    }

    normalizeAnchorTokenType(valueRaw, token = '') {
        const value = String(valueRaw || '').trim();
        if (this.getAllowedAnchorTokenTypeValues().includes(value)) return value;
        return this.inferAnchorTokenType(token);
    }

    normalizeAnchorPosition(valueRaw) {
        const value = String(valueRaw || '').trim();
        return this.getAllowedAnchorPositionValues().includes(value) ? value : 'before_amount';
    }

    normalizeAnchorBoundary(valueRaw) {
        const value = String(valueRaw || '').trim();
        return this.getAllowedAnchorBoundaryValues().includes(value) ? value : 'strict';
    }

    normalizeAnchorPriority(valueRaw) {
        const parsed = Number.parseInt(valueRaw, 10);
        if (!Number.isFinite(parsed)) return 100;
        if (parsed < 0) return 0;
        if (parsed > 9999) return 9999;
        return parsed;
    }

    getReservedAnchorTokens() {
        return new Set([
            '新', '老', '香', '港', '奥', '澳',
            '新奥', '新澳', '老奥', '老澳', '澳门', '香港',
            ...this.collectConfiguredAmountSuffixTokens()
        ]);
    }

    getAnchorTokenValidationError(token) {
        const normalized = this.normalizeAnchorAliasToken(token);
        if (!normalized) {
            return '词语不能为空';
        }
        if (normalized.length > 12) {
            return '词语长度不能超过12个字符';
        }
        if (!/[^\s]/.test(normalized)) {
            return '词语不能为空';
        }
        if (/^[0-9０-９零〇一二两三四五六七八九十百千万]+$/.test(normalized)) {
            return '词语不能只包含数字';
        }
        if (this.getReservedAnchorTokens().has(normalized)) {
            return '词语不能与地区词或金额单位冲突';
        }
        return '';
    }

    isSupportedAnchorToken(token) {
        return !this.getAnchorTokenValidationError(token);
    }

    sanitizeNoiseRulePattern(patternRaw) {
        const normalized = this.normalizeNoiseRulePlaceholders(patternRaw).replace(/\s+/g, ' ').trim();
        if (!normalized) return '';
        if (normalized.length > 40) return '';
        const placeholders = normalized.match(/\{[^}]+\}/g) || [];
        const canonical = this.getNoiseRuleCanonicalPlaceholder();
        if (placeholders.some(token => token !== canonical)) return '';
        const literal = normalized.replace(new RegExp(this.escapeRegex(canonical), 'g'), '').trim();
        if (!literal) return '';
        return normalized;
    }

    sanitizeNoiseRules(rawNoiseRules) {
        if (!Array.isArray(rawNoiseRules)) return [];
        const seen = new Set();
        const safe = [];
        rawNoiseRules.forEach(item => {
            const candidate = item && typeof item === 'object' && !Array.isArray(item)
                ? item.pattern
                : item;
            const pattern = this.sanitizeNoiseRulePattern(candidate);
            if (!pattern || seen.has(pattern)) return;
            seen.add(pattern);
            safe.push(pattern);
        });
        return safe;
    }

    mergeNoiseRules(baseNoiseRules, patchNoiseRules) {
        return this.sanitizeNoiseRules([
            ...(Array.isArray(baseNoiseRules) ? baseNoiseRules : []),
            ...(Array.isArray(patchNoiseRules) ? patchNoiseRules : [])
        ]);
    }

    supportsImplicitAmountSuffixForNoisePattern(pattern) {
        const sanitizedPattern = this.sanitizeNoiseRulePattern(pattern);
        if (!sanitizedPattern) return false;
        if (sanitizedPattern.includes(this.getNoiseRuleCanonicalPlaceholder())) return false;
        if (/[0-9０-９零〇一二两三四五六七八九十百千万]/.test(sanitizedPattern)) return false;
        return true;
    }

    buildNoiseRuleRegex(pattern) {
        const sanitizedPattern = this.sanitizeNoiseRulePattern(pattern);
        if (!sanitizedPattern) return null;
        const amountPattern = this.getNoiseRuleAmountPattern();
        const canonicalPlaceholder = this.getNoiseRuleCanonicalPlaceholder();
        if (!sanitizedPattern.includes(canonicalPlaceholder)) {
            const source = this.escapeRegex(sanitizedPattern).replace(/\s+/g, '\\s*');
            if (!source) return null;
            if (this.supportsImplicitAmountSuffixForNoisePattern(sanitizedPattern)) {
                return new RegExp(`^${source}(?:\\s*${amountPattern})?$`, 'u');
            }
            return new RegExp(`^${source}$`, 'u');
        }
        const segments = sanitizedPattern.split(canonicalPlaceholder);
        const source = segments
            .map(segment => this.escapeRegex(segment).replace(/\s+/g, '\\s*'))
            .join(amountPattern);
        if (!source) return null;
        return new RegExp(`^${source}$`, 'u');
    }

    matchesNoiseRule(text, pattern) {
        const regex = this.buildNoiseRuleRegex(pattern);
        if (!regex) return false;
        const normalizedText = String(text || '').trim();
        if (!normalizedText) return false;
        return regex.test(normalizedText);
    }

    getActiveNoiseRules(clientId = '') {
        const profile = arguments.length === 0
            ? this.getActiveRuleProfile()
            : this.getEffectiveRuleProfile(clientId);
        return this.sanitizeNoiseRules(profile && profile.noiseRules ? profile.noiseRules : []);
    }

    findMatchingNoiseRule(text, options = {}) {
        const normalizedText = String(text || '').trim();
        if (!normalizedText) return '';
        const hasExplicitClientContext = typeof options === 'string'
            || !!(options && typeof options === 'object' && Object.prototype.hasOwnProperty.call(options, 'clientId'));
        const clientId = typeof options === 'string'
            ? options
            : (options && options.clientId ? options.clientId : '');
        const noiseRules = hasExplicitClientContext
            ? this.getActiveNoiseRules(clientId)
            : this.getActiveNoiseRules();
        const matched = noiseRules.find(pattern => this.matchesNoiseRule(normalizedText, pattern));
        return matched || '';
    }

    matchesConfiguredNoiseRule(text, options = {}) {
        const normalizedText = String(text || '').trim();
        if (!normalizedText) return false;
        if (arguments.length <= 1) {
            return !!this.findMatchingNoiseRule(normalizedText);
        }
        return !!this.findMatchingNoiseRule(normalizedText, options);
    }

    upsertNoiseRule(pattern, options = {}) {
        const normalizedPattern = this.sanitizeNoiseRulePattern(pattern);
        if (!normalizedPattern) {
            throw new Error('噪音规则无效，请使用固定文本或包含 {金额} 的模板');
        }
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        const clientId = scope === 'client'
            ? this.normalizeRuleClientId(options && options.clientId ? options.clientId : '')
            : '';
        if (scope === 'client' && !clientId) {
            throw new Error('请先选择网友后再设置专属噪音规则');
        }
        this.updateRuleProfile(
            scope,
            { noiseRules: [normalizedPattern] },
            { clientId }
        );
        this.persistAttributeConfig();
        return {
            pattern: normalizedPattern,
            scope,
            clientId
        };
    }

    removeNoiseRule(pattern, options = {}) {
        const normalizedPattern = this.sanitizeNoiseRulePattern(pattern);
        if (!normalizedPattern) return;
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        if (scope === 'global') {
            if (!this.globalRuleProfile || !Array.isArray(this.globalRuleProfile.noiseRules)) return;
            this.globalRuleProfile.noiseRules = this.sanitizeNoiseRules(
                this.globalRuleProfile.noiseRules.filter(item => item !== normalizedPattern)
            );
            if (this.globalRuleProfile.noiseRules.length === 0) {
                delete this.globalRuleProfile.noiseRules;
            }
            if (this.isRuleProfileEmpty(this.globalRuleProfile)) {
                this.globalRuleProfile = {};
            }
            this.persistAttributeConfig();
            return;
        }
        const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
        if (!clientId) return;
        const profile = this.clientRuleProfiles[clientId];
        if (!profile || !Array.isArray(profile.noiseRules)) return;
        profile.noiseRules = this.sanitizeNoiseRules(profile.noiseRules.filter(item => item !== normalizedPattern));
        if (profile.noiseRules.length === 0) {
            delete profile.noiseRules;
        }
        if (this.isRuleProfileEmpty(profile)) {
            delete this.clientRuleProfiles[clientId];
        }
        this.persistAttributeConfig();
    }

    getNoiseRuleRows(options = {}) {
        const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
        const systemRules = this.sanitizeNoiseRules((this.getSystemRuleProfile() || {}).noiseRules || []);
        const globalRules = this.sanitizeNoiseRules((this.getResolvedGlobalRuleProfile() || {}).noiseRules || []);
        const clientRules = clientId && this.clientRuleProfiles && this.clientRuleProfiles[clientId]
            ? this.sanitizeNoiseRules(this.clientRuleProfiles[clientId].noiseRules || [])
            : [];

        const rows = [];
        systemRules.forEach(pattern => {
            rows.push({ pattern, source: 'system', clientId: '', active: true });
        });
        globalRules.forEach(pattern => {
            rows.push({ pattern, source: 'global', clientId: '', active: true });
        });
        clientRules.forEach(pattern => {
            rows.push({ pattern, source: 'client', clientId, active: true });
        });

        rows.sort((a, b) => {
            const sourceOrder = { client: 0, global: 1, system: 2 };
            if ((sourceOrder[a.source] ?? 99) !== (sourceOrder[b.source] ?? 99)) {
                return (sourceOrder[a.source] ?? 99) - (sourceOrder[b.source] ?? 99);
            }
            if (a.pattern.length !== b.pattern.length) {
                return b.pattern.length - a.pattern.length;
            }
            return a.pattern.localeCompare(b.pattern, 'zh-Hans-CN');
        });
        return rows;
    }

    getEffectiveAnchorTokenSet(clientId = '') {
        const profile = this.getEffectiveRuleProfile(clientId);
        const anchorSemantics = profile && profile.anchorSemantics && typeof profile.anchorSemantics === 'object'
            ? profile.anchorSemantics
            : {};
        return new Set(
            Object.keys(anchorSemantics)
                .map(token => this.normalizeAnchorAliasToken(token))
                .filter(Boolean)
        );
    }

    upsertIgnoreToken(token, options = {}) {
        const normalizedToken = this.normalizeIgnoreToken(token);
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        const clientId = scope === 'client'
            ? this.normalizeRuleClientId(options && options.clientId ? options.clientId : '')
            : '';
        if (scope === 'client' && !clientId) {
            throw new Error('请先选择网友后再设置专属忽略字符/词');
        }
        const validationError = this.getIgnoreTokenValidationError(normalizedToken, { clientId });
        if (validationError) {
            throw new Error(validationError);
        }
        const sanitizedTokens = this.sanitizeIgnoreTokens([normalizedToken]);
        if (sanitizedTokens.length === 0) {
            throw new Error('忽略字符/词无效，请输入 1 到 12 个字符');
        }
        this.updateRuleProfile(
            scope,
            { ignoreTokens: sanitizedTokens },
            { clientId }
        );
        this.persistAttributeConfig();
        return {
            token: sanitizedTokens[0],
            scope,
            clientId
        };
    }

    removeIgnoreToken(token, options = {}) {
        const normalizedToken = this.normalizeIgnoreToken(token);
        if (!normalizedToken) return;
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        if (scope === 'global') {
            if (!this.globalRuleProfile || !Array.isArray(this.globalRuleProfile.ignoreTokens)) return;
            this.globalRuleProfile.ignoreTokens = this.sanitizeIgnoreTokens(
                this.globalRuleProfile.ignoreTokens.filter(item => item !== normalizedToken)
            );
            if (this.globalRuleProfile.ignoreTokens.length === 0) {
                delete this.globalRuleProfile.ignoreTokens;
            }
            if (this.isRuleProfileEmpty(this.globalRuleProfile)) {
                this.globalRuleProfile = {};
            }
            this.persistAttributeConfig();
            return;
        }
        const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
        if (!clientId) return;
        const profile = this.clientRuleProfiles[clientId];
        if (!profile || !Array.isArray(profile.ignoreTokens)) return;
        profile.ignoreTokens = this.sanitizeIgnoreTokens(profile.ignoreTokens.filter(item => item !== normalizedToken));
        if (profile.ignoreTokens.length === 0) {
            delete profile.ignoreTokens;
        }
        if (this.isRuleProfileEmpty(profile)) {
            delete this.clientRuleProfiles[clientId];
        }
        this.persistAttributeConfig();
    }

    getIgnoreTokenRows(options = {}) {
        const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
        const systemTokens = this.sanitizeIgnoreTokens((this.getSystemRuleProfile() || {}).ignoreTokens || []);
        const globalTokens = this.sanitizeIgnoreTokens((this.getResolvedGlobalRuleProfile() || {}).ignoreTokens || []);
        const clientTokens = clientId && this.clientRuleProfiles && this.clientRuleProfiles[clientId]
            ? this.sanitizeIgnoreTokens(this.clientRuleProfiles[clientId].ignoreTokens || [])
            : [];

        const rows = [];
        systemTokens.forEach(token => {
            rows.push({ token, source: 'system', clientId: '', active: true });
        });
        globalTokens.forEach(token => {
            rows.push({ token, source: 'global', clientId: '', active: true });
        });
        clientTokens.forEach(token => {
            rows.push({ token, source: 'client', clientId, active: true });
        });

        rows.sort((a, b) => {
            const sourceOrder = { client: 0, global: 1, system: 2 };
            if ((sourceOrder[a.source] ?? 99) !== (sourceOrder[b.source] ?? 99)) {
                return (sourceOrder[a.source] ?? 99) - (sourceOrder[b.source] ?? 99);
            }
            if (a.token.length !== b.token.length) {
                return b.token.length - a.token.length;
            }
            return a.token.localeCompare(b.token, 'zh-Hans-CN');
        });
        return rows;
    }

    upsertAmountUnit(token, options = {}) {
        const normalizedToken = this.normalizeAmountUnitToken(token);
        const sanitizedTokens = this.sanitizeAmountUnits([normalizedToken]);
        if (sanitizedTokens.length === 0) {
            throw new Error('金额单位无效，请输入 1 到 6 个字符的单位词');
        }
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        const clientId = scope === 'client'
            ? this.normalizeRuleClientId(options && options.clientId ? options.clientId : '')
            : '';
        if (scope === 'client' && !clientId) {
            throw new Error('请先选择网友后再设置专属金额单位');
        }
        this.updateRuleProfile(
            scope,
            { amountUnits: sanitizedTokens },
            { clientId }
        );
        this.persistAttributeConfig();
        return {
            token: sanitizedTokens[0],
            scope,
            clientId
        };
    }

    removeAmountUnit(token, options = {}) {
        const normalizedToken = this.normalizeAmountUnitToken(token);
        if (!normalizedToken) return;
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        if (scope === 'global') {
            if (!this.globalRuleProfile || !Array.isArray(this.globalRuleProfile.amountUnits)) return;
            this.globalRuleProfile.amountUnits = this.sanitizeAmountUnits(
                this.globalRuleProfile.amountUnits.filter(item => item !== normalizedToken)
            );
            if (this.globalRuleProfile.amountUnits.length === 0) {
                delete this.globalRuleProfile.amountUnits;
            }
            if (this.isRuleProfileEmpty(this.globalRuleProfile)) {
                this.globalRuleProfile = {};
            }
            this.persistAttributeConfig();
            return;
        }
        const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
        if (!clientId) return;
        const profile = this.clientRuleProfiles[clientId];
        if (!profile || !Array.isArray(profile.amountUnits)) return;
        profile.amountUnits = this.sanitizeAmountUnits(profile.amountUnits.filter(item => item !== normalizedToken));
        if (profile.amountUnits.length === 0) {
            delete profile.amountUnits;
        }
        if (this.isRuleProfileEmpty(profile)) {
            delete this.clientRuleProfiles[clientId];
        }
        this.persistAttributeConfig();
    }

    getAmountUnitRows(options = {}) {
        const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
        const systemUnits = this.sanitizeAmountUnits((this.getSystemRuleProfile() || {}).amountUnits || this.getSystemAmountUnits());
        const globalUnits = this.sanitizeAmountUnits((this.getResolvedGlobalRuleProfile() || {}).amountUnits || []);
        const clientUnits = clientId && this.clientRuleProfiles && this.clientRuleProfiles[clientId]
            ? this.sanitizeAmountUnits(this.clientRuleProfiles[clientId].amountUnits || [])
            : [];

        const rows = [];
        systemUnits.forEach(token => {
            rows.push({ token, source: 'system', clientId: '', active: true });
        });
        globalUnits.forEach(token => {
            rows.push({ token, source: 'global', clientId: '', active: true });
        });
        clientUnits.forEach(token => {
            rows.push({ token, source: 'client', clientId, active: true });
        });

        rows.sort((a, b) => {
            const sourceOrder = { client: 0, global: 1, system: 2 };
            if ((sourceOrder[a.source] ?? 99) !== (sourceOrder[b.source] ?? 99)) {
                return (sourceOrder[a.source] ?? 99) - (sourceOrder[b.source] ?? 99);
            }
            if (a.token.length !== b.token.length) {
                return b.token.length - a.token.length;
            }
            return a.token.localeCompare(b.token, 'zh-Hans-CN');
        });
        return rows;
    }

    normalizeAmountDistributeValue(valueRaw) {
        const value = String(valueRaw || '').trim();
        if (this.getAllowedAmountDistributeValues().includes(value)) return value;
        if (value === 'combo_number') return 'per_number';
        if (value === 'per_animal') return 'per_target_equal_split';
        return '';
    }

    normalizeLegacyAliasMode(modeRaw) {
        const mode = String(modeRaw || '').trim();
        if (mode === 'ignore') return 'ignore';
        if (mode === 'per_animal') return 'per_target_equal_split';
        if (mode === 'combo_number') return 'per_number';
        if (mode === 'per_number') return 'per_number';
        const normalized = this.normalizeAmountDistributeValue(mode);
        return normalized || '';
    }

    normalizeRegionKey(input, fallback = 'new_ao') {
        const value = String(input || '').trim();
        if (value === 'new_ao' || value === 'old_ao' || value === 'hongkong') return value;
        return fallback;
    }

    escapeRegex(text) {
        return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    getSystemRegionAliasMap() {
        return {
            new_ao: ['新奥', '新澳', '澳门', '奥', '澳', '新'],
            old_ao: ['老奥', '老澳', '老'],
            hongkong: ['香港', '香', '港']
        };
    }

    normalizeRegionAliasToken(token) {
        return String(token || '').replace(/\s+/g, '').trim();
    }

    sanitizeRegionAliasTokens(tokens, regionKey = 'new_ao', options = {}) {
        const safeRegionKey = this.normalizeRegionKey(regionKey, 'new_ao');
        const systemAliasMap = this.getSystemRegionAliasMap();
        const rejectSystemAliases = !!(options && options.rejectSystemAliases);
        const seen = new Set();
        const result = [];
        const rawTokens = Array.isArray(tokens)
            ? tokens
            : String(tokens || '')
                .split(/[\n,，、]/)
                .map(item => item.trim())
                .filter(Boolean);
        rawTokens.forEach((item) => {
            const token = this.normalizeRegionAliasToken(item);
            if (!token || token.length > 12) return;
            if (/[\r\n]/.test(token)) return;
            if (/^[0-9０-９零〇一二两三四五六七八九十百千万]+$/.test(token)) return;
            if (!/[\u4e00-\u9fa5A-Za-z]/.test(token)) return;
            if (/^(?:元|块|米|蚊|毛|角|分|闷|号|碼|码|各|买|都)$/u.test(token)) return;
            const systemResolved = this.resolveRegionFromToken(token, '', { systemOnly: true });
            if (rejectSystemAliases && systemResolved) return;
            if (seen.has(token)) return;
            seen.add(token);
            result.push(token);
        });
        return rejectSystemAliases
            ? result.filter((token) => !(Array.isArray(systemAliasMap[safeRegionKey]) && systemAliasMap[safeRegionKey].includes(token)))
            : result;
    }

    sanitizeRegionAliasMap(regionAliases, options = {}) {
        const safe = {};
        if (!regionAliases || typeof regionAliases !== 'object') return safe;
        ['new_ao', 'old_ao', 'hongkong'].forEach((regionKey) => {
            const tokens = this.sanitizeRegionAliasTokens(regionAliases[regionKey], regionKey, options);
            if (tokens.length > 0) {
                safe[regionKey] = tokens;
            }
        });
        return safe;
    }

    mergeRegionAliasMap(baseAliases, patchAliases) {
        const safeBase = this.sanitizeRegionAliasMap(baseAliases || {}, { rejectSystemAliases: false });
        const safePatch = this.sanitizeRegionAliasMap(patchAliases || {}, { rejectSystemAliases: false });
        const merged = {};
        ['new_ao', 'old_ao', 'hongkong'].forEach((regionKey) => {
            const tokens = Array.from(new Set([
                ...(Array.isArray(safeBase[regionKey]) ? safeBase[regionKey] : []),
                ...(Array.isArray(safePatch[regionKey]) ? safePatch[regionKey] : [])
            ]));
            if (tokens.length > 0) {
                merged[regionKey] = tokens;
            }
        });
        return merged;
    }

    getActiveRegionAliasMap() {
        const activeProfile = this.getActiveRuleProfile();
        const customAliases = activeProfile && activeProfile.regionPolicy && activeProfile.regionPolicy.regionAliases
            ? activeProfile.regionPolicy.regionAliases
            : {};
        return this.mergeRegionAliasMap(this.getSystemRegionAliasMap(), customAliases);
    }

    getEffectiveRegionAliasMap(clientId = '') {
        const effectiveProfile = clientId
            ? this.getEffectiveRuleProfile(clientId)
            : this.getActiveRuleProfile();
        const customAliases = effectiveProfile && effectiveProfile.regionPolicy && effectiveProfile.regionPolicy.regionAliases
            ? effectiveProfile.regionPolicy.regionAliases
            : {};
        return this.mergeRegionAliasMap(this.getSystemRegionAliasMap(), customAliases);
    }

    getEffectiveBlockedPlayKeywordMap(clientId = '') {
        const effectiveProfile = clientId
            ? this.getEffectiveRuleProfile(clientId)
            : this.getActiveRuleProfile();
        const customKeywords = effectiveProfile && effectiveProfile.blockedPlayKeywords
            ? effectiveProfile.blockedPlayKeywords
            : {};
        return this.mergeBlockedPlayKeywordMap(this.getSystemBlockedPlayKeywordMap(), customKeywords);
    }

    getEffectiveMessageTypeWhitelist(clientId = '') {
        const effectiveProfile = clientId
            ? this.getEffectiveRuleProfile(clientId)
            : this.getActiveRuleProfile();
        const customWhitelist = effectiveProfile && effectiveProfile.messageTypeWhitelist
            ? effectiveProfile.messageTypeWhitelist
            : {};
        return this.mergeMessageTypeWhitelist(this.getSystemMessageTypeWhitelist(), customWhitelist);
    }

    isMessageTypeWhitelistEnabled(typeKey, clientId = '') {
        const key = String(typeKey || '').trim();
        if (!this.getAllowedMessageTypeWhitelistKeys().includes(key)) return false;
        const effective = this.getEffectiveMessageTypeWhitelist(clientId);
        return effective[key] !== false;
    }

    sanitizeAnchorRuleItem(rawRule, token = '') {
        if (!rawRule || typeof rawRule !== 'object') {
            return null;
        }
        const distribute = this.normalizeAmountDistributeValue(rawRule.amountDistribute);
        if (!distribute) return null;
        const normalizedToken = this.normalizeAnchorAliasToken(token);
        const item = {
            amountDistribute: distribute,
            enabled: rawRule.enabled !== false,
            tokenType: this.normalizeAnchorTokenType(rawRule.tokenType, normalizedToken),
            position: this.normalizeAnchorPosition(rawRule.position),
            boundary: this.normalizeAnchorBoundary(rawRule.boundary),
            priority: this.normalizeAnchorPriority(rawRule.priority)
        };
        const odds = this.normalizeOddsValue(rawRule.odds);
        if (Number.isFinite(odds)) {
            item.odds = odds;
        }
        if (typeof rawRule.notes === 'string' && rawRule.notes.trim()) {
            item.notes = rawRule.notes.trim().slice(0, 80);
        }
        return item;
    }

    sanitizeAnchorSemanticsMap(anchorSemantics) {
        const anchors = {};
        if (!anchorSemantics || typeof anchorSemantics !== 'object') {
            return anchors;
        }
        Object.entries(anchorSemantics).forEach(([rawToken, rawRule]) => {
            const token = this.normalizeAnchorAliasToken(rawToken);
            if (!this.isSupportedAnchorToken(token)) return;
            const item = this.sanitizeAnchorRuleItem(rawRule, token);
            if (!item) return;
            anchors[token] = item;
        });
        return anchors;
    }

    sanitizeRuleProfile(profile, options = {}) {
        const forOverride = !!(options && options.forOverride);
        const safe = {};
        if (!profile || typeof profile !== 'object') {
            return safe;
        }

        if (!forOverride && typeof profile.version === 'string' && profile.version.trim()) {
            safe.version = profile.version.trim();
        }

        const defaultOdds = this.normalizeOddsValue(profile.defaultOdds);
        if (Number.isFinite(defaultOdds)) {
            safe.defaultOdds = defaultOdds;
        }

        if (profile.anchorSemantics && typeof profile.anchorSemantics === 'object') {
            const anchors = this.sanitizeAnchorSemanticsMap(profile.anchorSemantics);
            if (Object.keys(anchors).length > 0) {
                safe.anchorSemantics = anchors;
            }
        }

        const noiseRules = this.sanitizeNoiseRules(profile.noiseRules);
        if (noiseRules.length > 0) {
            safe.noiseRules = noiseRules;
        }

        const ignoreTokens = this.sanitizeIgnoreTokens(profile.ignoreTokens);
        if (ignoreTokens.length > 0) {
            safe.ignoreTokens = ignoreTokens;
        }

        const amountUnits = this.sanitizeAmountUnits(profile.amountUnits);
        if (amountUnits.length > 0) {
            safe.amountUnits = amountUnits;
        }

        const combinePolicy = String(profile.attributeCombinePolicy || '').trim();
        if (this.getAllowedAttributeCombinePolicyValues().includes(combinePolicy)) {
            safe.attributeCombinePolicy = combinePolicy;
        }

        if (profile.symbolPolicy && typeof profile.symbolPolicy === 'object') {
            const symbolPolicy = {};
            Object.entries(profile.symbolPolicy).forEach(([rawSymbol, rawPolicy]) => {
                const symbol = String(rawSymbol || '').trim();
                const policy = String(rawPolicy || '').trim();
                if (!symbol || symbol.length > 3) return;
                if (!this.getAllowedSymbolPolicyValues().includes(policy)) return;
                symbolPolicy[symbol] = policy;
            });
            if (Object.keys(symbolPolicy).length > 0) {
                safe.symbolPolicy = symbolPolicy;
            }
        }

        const ambiguityPolicy = String(profile.ambiguityPolicy || '').trim();
        if (this.getAllowedAmbiguityPolicyValues().includes(ambiguityPolicy)) {
            safe.ambiguityPolicy = ambiguityPolicy;
        }

        const anchorParseMode = String(profile.anchorParseMode || '').trim();
        if (this.getAllowedAnchorParseModeValues().includes(anchorParseMode)) {
            safe.anchorParseMode = anchorParseMode;
        }

        const blockedPlayKeywords = this.sanitizeBlockedPlayKeywordMap(
            profile.blockedPlayKeywords,
            { rejectSystemTokens: true }
        );
        if (Object.keys(blockedPlayKeywords).length > 0) {
            safe.blockedPlayKeywords = blockedPlayKeywords;
        }

        const messageTypeWhitelist = this.sanitizeMessageTypeWhitelist(profile.messageTypeWhitelist);
        if (Object.keys(messageTypeWhitelist).length > 0) {
            safe.messageTypeWhitelist = messageTypeWhitelist;
        }

        if (typeof profile.tailShorthandAsSeparateGroups === 'boolean') {
            safe.tailShorthandAsSeparateGroups = profile.tailShorthandAsSeparateGroups;
        }

        if (profile.regionPolicy && typeof profile.regionPolicy === 'object') {
            const regionPolicy = {};
            if (profile.regionPolicy.defaultRegion) {
                regionPolicy.defaultRegion = this.normalizeRegionKey(profile.regionPolicy.defaultRegion, 'new_ao');
            }
            if (typeof profile.regionPolicy.separateStatsByRegion === 'boolean') {
                regionPolicy.separateStatsByRegion = profile.regionPolicy.separateStatsByRegion;
            }
            const regionAliases = this.sanitizeRegionAliasMap(profile.regionPolicy.regionAliases, { rejectSystemAliases: true });
            if (Object.keys(regionAliases).length > 0) {
                regionPolicy.regionAliases = regionAliases;
            }
            if (typeof profile.regionPolicy.canonicalAlwaysShowRegion === 'boolean') {
                regionPolicy.canonicalAlwaysShowRegion = profile.regionPolicy.canonicalAlwaysShowRegion;
            }
            if (Object.keys(regionPolicy).length > 0) {
                safe.regionPolicy = regionPolicy;
            }
        }

        return safe;
    }

    isRuleProfileEmpty(profile) {
        if (!profile || typeof profile !== 'object') return true;
        return Object.keys(profile).length === 0;
    }

    sanitizeClientRuleProfiles(clientRules) {
        const safe = {};
        if (!clientRules || typeof clientRules !== 'object') {
            return safe;
        }
        Object.entries(clientRules).forEach(([rawClientId, rawProfile]) => {
            const clientId = this.normalizeRuleClientId(rawClientId);
            if (!clientId) return;
            const profile = this.sanitizeRuleProfile(rawProfile || {}, { forOverride: true });
            if (this.isRuleProfileEmpty(profile)) return;
            safe[clientId] = profile;
        });
        return safe;
    }

    mergeRuleProfiles(baseProfile, patchProfile) {
        const base = baseProfile && typeof baseProfile === 'object' ? baseProfile : {};
        const patch = patchProfile && typeof patchProfile === 'object' ? patchProfile : {};
        const merged = { ...base };

        Object.entries(patch).forEach(([key, value]) => {
            if (value === undefined) return;
            if (key === 'anchorSemantics' && value && typeof value === 'object') {
                merged.anchorSemantics = {
                    ...(merged.anchorSemantics || {}),
                    ...value
                };
                return;
            }
            if (key === 'symbolPolicy' && value && typeof value === 'object') {
                merged.symbolPolicy = {
                    ...(merged.symbolPolicy || {}),
                    ...value
                };
                return;
            }
            if (key === 'noiseRules' && Array.isArray(value)) {
                merged.noiseRules = this.mergeNoiseRules(merged.noiseRules, value);
                return;
            }
            if (key === 'ignoreTokens' && Array.isArray(value)) {
                merged.ignoreTokens = this.mergeIgnoreTokens(merged.ignoreTokens, value);
                return;
            }
            if (key === 'amountUnits' && Array.isArray(value)) {
                merged.amountUnits = this.mergeAmountUnits(merged.amountUnits, value);
                return;
            }
            if (key === 'regionPolicy' && value && typeof value === 'object') {
                const baseRegionPolicy = merged.regionPolicy && typeof merged.regionPolicy === 'object'
                    ? merged.regionPolicy
                    : {};
                const nextRegionPolicy = {
                    ...baseRegionPolicy,
                    ...value
                };
                if (baseRegionPolicy.regionAliases || value.regionAliases) {
                    nextRegionPolicy.regionAliases = this.mergeRegionAliasMap(
                        baseRegionPolicy.regionAliases || {},
                        value.regionAliases || {}
                    );
                }
                merged.regionPolicy = {
                    ...nextRegionPolicy
                };
                return;
            }
            if (key === 'blockedPlayKeywords' && value && typeof value === 'object') {
                merged.blockedPlayKeywords = this.mergeBlockedPlayKeywordMap(
                    merged.blockedPlayKeywords || {},
                    value
                );
                return;
            }
            if (key === 'messageTypeWhitelist' && value && typeof value === 'object') {
                merged.messageTypeWhitelist = this.mergeMessageTypeWhitelist(
                    merged.messageTypeWhitelist || {},
                    value
                );
                return;
            }
            merged[key] = value;
        });

        return merged;
    }

    getGlobalRuleProfile() {
        return JSON.parse(JSON.stringify(this.getResolvedGlobalRuleProfile()));
    }

    getClientRuleProfiles() {
        return JSON.parse(JSON.stringify(this.clientRuleProfiles || {}));
    }

    getClientRuleProfile(clientId) {
        const normalizedId = this.normalizeRuleClientId(clientId);
        if (!normalizedId) return {};
        const profile = (this.clientRuleProfiles || {})[normalizedId] || {};
        return JSON.parse(JSON.stringify(profile));
    }

    getEffectiveRuleProfile(clientId = '') {
        const normalizedId = this.normalizeRuleClientId(clientId);
        const systemProfile = this.getSystemRuleProfile();
        const globalProfile = this.getResolvedGlobalRuleProfile();
        const clientProfile = normalizedId ? ((this.clientRuleProfiles || {})[normalizedId] || {}) : {};

        let effective = this.mergeRuleProfiles(systemProfile, globalProfile);
        effective = this.mergeRuleProfiles(effective, clientProfile);

        effective.anchorSemantics = this.sanitizeAnchorSemanticsMap(effective.anchorSemantics || {});
        if (!Object.values(effective.anchorSemantics).some(item => item && item.enabled !== false)) {
            effective.anchorSemantics['各'] = this.sanitizeAnchorRuleItem({
                amountDistribute: 'per_number',
                enabled: true
            }, '各');
        }
        if (!this.getAllowedAttributeCombinePolicyValues().includes(effective.attributeCombinePolicy)) {
            effective.attributeCombinePolicy = 'intersection_then_union_fallback';
        }
        if (!this.getAllowedAmbiguityPolicyValues().includes(effective.ambiguityPolicy)) {
            effective.ambiguityPolicy = 'confirm';
        }
        if (!this.getAllowedAnchorParseModeValues().includes(effective.anchorParseMode)) {
            effective.anchorParseMode = 'strict';
        }
        effective.blockedPlayKeywords = this.sanitizeBlockedPlayKeywordMap(
            effective.blockedPlayKeywords || {},
            { rejectSystemTokens: true }
        );
        effective.messageTypeWhitelist = this.mergeMessageTypeWhitelist(
            this.getSystemMessageTypeWhitelist(),
            effective.messageTypeWhitelist || {}
        );
        effective.noiseRules = this.sanitizeNoiseRules(effective.noiseRules || []);
        effective.ignoreTokens = this.sanitizeIgnoreTokens(effective.ignoreTokens || []);
        effective.amountUnits = this.sanitizeAmountUnits(effective.amountUnits || this.getSystemAmountUnits());
        effective.defaultOdds = this.normalizeOddsValue(
            effective.defaultOdds,
            this.SYSTEM_DEFAULT_ODDS
        );
        if (!Number.isFinite(effective.defaultOdds) || effective.defaultOdds <= 0) {
            effective.defaultOdds = this.SYSTEM_DEFAULT_ODDS;
        }
        if (!effective.regionPolicy || typeof effective.regionPolicy !== 'object') {
            effective.regionPolicy = {};
        }
        effective.regionPolicy.defaultRegion = this.normalizeRegionKey(effective.regionPolicy.defaultRegion, 'new_ao');
        if (typeof effective.regionPolicy.separateStatsByRegion !== 'boolean') {
            effective.regionPolicy.separateStatsByRegion = true;
        }
        effective.regionPolicy.regionAliases = this.sanitizeRegionAliasMap(effective.regionPolicy.regionAliases || {}, { rejectSystemAliases: true });
        if (typeof effective.regionPolicy.canonicalAlwaysShowRegion !== 'boolean') {
            effective.regionPolicy.canonicalAlwaysShowRegion = true;
        }

        return effective;
    }

    setGlobalRuleProfile(profile) {
        this.globalRuleProfile = this.sanitizeRuleProfile(profile || {}, { forOverride: true });
        this.ODDS = this.getEffectiveDefaultOdds('');
    }

    setClientRuleProfile(clientId, profile) {
        const normalizedId = this.normalizeRuleClientId(clientId);
        if (!normalizedId) {
            throw new Error('网友标识不能为空');
        }
        const sanitized = this.sanitizeRuleProfile(profile || {}, { forOverride: true });
        if (this.isRuleProfileEmpty(sanitized)) {
            delete this.clientRuleProfiles[normalizedId];
        } else {
            this.clientRuleProfiles[normalizedId] = sanitized;
        }
    }

    updateRuleProfile(scope = 'global', patch = {}, options = {}) {
        const normalizedScope = scope === 'client' ? 'client' : 'global';
        const sanitizedPatch = this.sanitizeRuleProfile(patch || {}, { forOverride: true });
        if (this.isRuleProfileEmpty(sanitizedPatch)) {
            return;
        }

        if (normalizedScope === 'global') {
            this.globalRuleProfile = this.mergeRuleProfiles(this.globalRuleProfile || {}, sanitizedPatch);
            this.ODDS = this.getEffectiveDefaultOdds('');
            return;
        }

        const clientId = this.normalizeRuleClientId(options.clientId);
        if (!clientId) {
            throw new Error('请先选择网友后再设置专属规则');
        }
        const current = this.clientRuleProfiles[clientId] || {};
        const next = this.mergeRuleProfiles(current, sanitizedPatch);
        this.clientRuleProfiles[clientId] = this.sanitizeRuleProfile(next, { forOverride: true });
    }

    resetRuleProfile(scope = 'global', options = {}) {
        const normalizedScope = scope === 'client' ? 'client' : 'global';
        if (normalizedScope === 'global') {
            this.globalRuleProfile = {};
            this.ODDS = this.getEffectiveDefaultOdds('');
            return;
        }
        const clientId = this.normalizeRuleClientId(options.clientId);
        if (!clientId) {
            throw new Error('请先选择网友后再恢复默认');
        }
        delete this.clientRuleProfiles[clientId];
    }

    withRuleContext(clientId, fn) {
        const prevClientId = this.activeRuleClientId;
        const prevProfile = this.activeRuleProfileCache;
        this.activeRuleClientId = this.normalizeRuleClientId(clientId);
        this.activeRuleProfileCache = this.getEffectiveRuleProfile(this.activeRuleClientId);
        try {
            return fn();
        } finally {
            this.activeRuleClientId = prevClientId;
            this.activeRuleProfileCache = prevProfile;
        }
    }

    getActiveRuleProfile() {
        if (this.activeRuleProfileCache && typeof this.activeRuleProfileCache === 'object') {
            return this.activeRuleProfileCache;
        }
        return this.getEffectiveRuleProfile('');
    }

    convertLegacyAnchorAliasMapToRules(anchorAliases) {
        const rules = {};
        if (!anchorAliases || typeof anchorAliases !== 'object') return rules;
        Object.entries(anchorAliases).forEach(([rawToken, rawMode]) => {
            const token = this.normalizeAnchorAliasToken(rawToken);
            const mapped = this.normalizeLegacyAliasMode(rawMode);
            if (!token || !mapped) return;
            if (mapped === 'ignore') {
                rules[token] = { amountDistribute: 'per_number', enabled: false };
                return;
            }
            rules[token] = { amountDistribute: mapped, enabled: true };
        });
        return rules;
    }

    exportLegacyAnchorAliasMap(anchorSemantics) {
        const map = {};
        if (!anchorSemantics || typeof anchorSemantics !== 'object') return map;
        Object.entries(anchorSemantics).forEach(([token, rule]) => {
            if (!rule || typeof rule !== 'object') return;
            if (rule.enabled === false) {
                map[token] = 'ignore';
                return;
            }
            const distribute = this.normalizeAmountDistributeValue(rule.amountDistribute);
            if (!distribute) return;
            if (distribute === 'per_target_equal_split') {
                map[token] = 'per_animal';
                return;
            }
            map[token] = 'per_number';
        });
        return map;
    }

    getDefaultAnchorAliasMap() {
        const defaults = {};
        const mergedDefaults = this.mergeRuleProfiles(
            this.getSystemRuleProfile(),
            this.getDefaultGlobalRuleProfile()
        );
        Object.entries(mergedDefaults.anchorSemantics || {}).forEach(([token, rule]) => {
            if (rule && rule.enabled !== false && rule.amountDistribute) {
                defaults[token] = rule.amountDistribute;
            }
        });
        return defaults;
    }

    sanitizeAnchorAliasMap(anchorAliases) {
        return this.exportLegacyAnchorAliasMap(this.convertLegacyAnchorAliasMapToRules(anchorAliases));
    }

    getAnchorAliasOverrides() {
        const globalAnchors = (this.getResolvedGlobalRuleProfile().anchorSemantics)
            ? this.getResolvedGlobalRuleProfile().anchorSemantics
            : {};
        return this.exportLegacyAnchorAliasMap(globalAnchors);
    }

    setAnchorAliasOverrides(anchorAliases) {
        const patch = this.convertLegacyAnchorAliasMapToRules(anchorAliases);
        this.globalRuleProfile = this.mergeRuleProfiles(
            this.globalRuleProfile || {},
            { anchorSemantics: patch }
        );
    }

    saveAnchorAliasOverrides(anchorAliases) {
        this.setAnchorAliasOverrides(anchorAliases);
        this.persistAttributeConfig();
        return this.getAnchorAliasOverrides();
    }

    upsertAnchorRule(token, amountDistribute, options = {}) {
        const normalizedToken = this.normalizeAnchorAliasToken(token);
        const tokenError = this.getAnchorTokenValidationError(normalizedToken);
        if (tokenError) {
            throw new Error(tokenError);
        }
        const normalizedDistribute = this.normalizeAmountDistributeValue(amountDistribute);
        if (!normalizedDistribute) {
            throw new Error('分配策略无效');
        }

        const scope = options && options.scope === 'client' ? 'client' : 'global';
        const enabled = options && options.enabled === false ? false : true;
        const inputHasOdds = options && Object.prototype.hasOwnProperty.call(options, 'odds');
        const normalizedOdds = inputHasOdds ? this.normalizeOddsValue(options.odds) : NaN;
        const rawRuleItem = {
            amountDistribute: normalizedDistribute,
            enabled,
            tokenType: options && options.tokenType,
            position: options && options.position,
            boundary: options && options.boundary,
            priority: options && options.priority,
            notes: options && options.notes
        };
        if (inputHasOdds && Number.isFinite(normalizedOdds)) {
            rawRuleItem.odds = normalizedOdds;
        }
        const sanitizedRuleItem = this.sanitizeAnchorRuleItem(rawRuleItem, normalizedToken);
        if (!sanitizedRuleItem) {
            throw new Error('分配策略无效');
        }
        const patch = {
            anchorSemantics: {
                [normalizedToken]: sanitizedRuleItem
            }
        };
        this.updateRuleProfile(scope, patch, { clientId: options && options.clientId ? options.clientId : '' });
        this.persistAttributeConfig();
        this.ODDS = this.getEffectiveDefaultOdds('');
        return {
            token: normalizedToken,
            amountDistribute: normalizedDistribute,
            tokenType: sanitizedRuleItem.tokenType,
            position: sanitizedRuleItem.position,
            boundary: sanitizedRuleItem.boundary,
            priority: sanitizedRuleItem.priority,
            odds: Object.prototype.hasOwnProperty.call(sanitizedRuleItem, 'odds') ? sanitizedRuleItem.odds : null,
            enabled: sanitizedRuleItem.enabled,
            scope
        };
    }

    removeAnchorRule(token, options = {}) {
        const normalizedToken = this.normalizeAnchorAliasToken(token);
        if (!normalizedToken) return;
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        if (scope === 'global') {
            const defaultAnchors = (this.getDefaultGlobalRuleProfile().anchorSemantics) || {};
            const defaultRule = defaultAnchors[normalizedToken];
            if (defaultRule) {
                const sanitizedDefault = this.sanitizeAnchorRuleItem(defaultRule, normalizedToken);
                if (sanitizedDefault) {
                    if (!this.globalRuleProfile || typeof this.globalRuleProfile !== 'object') {
                        this.globalRuleProfile = {};
                    }
                    if (!this.globalRuleProfile.anchorSemantics || typeof this.globalRuleProfile.anchorSemantics !== 'object') {
                        this.globalRuleProfile.anchorSemantics = {};
                    }
                    this.globalRuleProfile.anchorSemantics[normalizedToken] = {
                        ...sanitizedDefault,
                        enabled: false
                    };
                }
            } else if (this.globalRuleProfile && this.globalRuleProfile.anchorSemantics) {
                delete this.globalRuleProfile.anchorSemantics[normalizedToken];
                if (Object.keys(this.globalRuleProfile.anchorSemantics).length === 0) {
                    delete this.globalRuleProfile.anchorSemantics;
                }
            }
            if (this.isRuleProfileEmpty(this.globalRuleProfile)) {
                this.globalRuleProfile = {};
            }
            this.persistAttributeConfig();
            return;
        }

        const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
        if (!clientId) return;
        const profile = this.clientRuleProfiles[clientId];
        if (!profile || !profile.anchorSemantics) return;
        delete profile.anchorSemantics[normalizedToken];
        if (Object.keys(profile.anchorSemantics).length === 0) {
            delete profile.anchorSemantics;
        }
        if (this.isRuleProfileEmpty(profile)) {
            delete this.clientRuleProfiles[clientId];
        }
        this.persistAttributeConfig();
    }

    setAttributeCombinePolicy(policy, options = {}) {
        const normalizedPolicy = String(policy || '').trim();
        if (!this.getAllowedAttributeCombinePolicyValues().includes(normalizedPolicy)) {
            throw new Error('属性叠加策略无效');
        }
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        this.updateRuleProfile(
            scope,
            { attributeCombinePolicy: normalizedPolicy },
            { clientId: options && options.clientId ? options.clientId : '' }
        );
        this.persistAttributeConfig();
        return normalizedPolicy;
    }

    setAnchorParseMode(mode, options = {}) {
        const normalizedMode = String(mode || '').trim();
        if (!this.getAllowedAnchorParseModeValues().includes(normalizedMode)) {
            throw new Error('解析模式无效');
        }
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        this.updateRuleProfile(
            scope,
            { anchorParseMode: normalizedMode },
            { clientId: options && options.clientId ? options.clientId : '' }
        );
        this.persistAttributeConfig();
        return normalizedMode;
    }

    getAllowedRegionAccountingModeValues() {
        return ['split', 'merged'];
    }

    normalizeRegionAccountingModeValue(mode) {
        const normalized = String(mode || '').trim();
        return this.getAllowedRegionAccountingModeValues().includes(normalized) ? normalized : '';
    }

    setRegionAccountingPolicy(policy = {}, options = {}) {
        const normalizedPolicy = policy && typeof policy === 'object' ? policy : {};
        const normalizedMode = this.normalizeRegionAccountingModeValue(normalizedPolicy.mode);
        if (!normalizedMode) {
            throw new Error('区域统计模式无效');
        }
        const normalizedDefaultRegion = this.normalizeRegionKey(
            normalizedPolicy.defaultRegion,
            'new_ao'
        );
        const normalizedRegionAliases = this.sanitizeRegionAliasMap(normalizedPolicy.regionAliases || {}, { rejectSystemAliases: true });
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        const applyRegionPolicy = (targetProfile = {}) => {
            const nextProfile = targetProfile && typeof targetProfile === 'object'
                ? JSON.parse(JSON.stringify(targetProfile))
                : {};
            nextProfile.regionPolicy = {
                ...(nextProfile.regionPolicy && typeof nextProfile.regionPolicy === 'object' ? nextProfile.regionPolicy : {}),
                defaultRegion: normalizedDefaultRegion,
                separateStatsByRegion: normalizedMode === 'split',
                regionAliases: normalizedRegionAliases
            };
            return this.sanitizeRuleProfile(nextProfile, { forOverride: true });
        };

        if (scope === 'global') {
            this.globalRuleProfile = applyRegionPolicy(this.globalRuleProfile || {});
        } else {
            const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
            if (!clientId) {
                throw new Error('请先选择客户后再设置区域规则');
            }
            const current = this.clientRuleProfiles[clientId] || {};
            const next = applyRegionPolicy(current);
            if (this.isRuleProfileEmpty(next)) {
                delete this.clientRuleProfiles[clientId];
            } else {
                this.clientRuleProfiles[clientId] = next;
            }
        }
        this.persistAttributeConfig();
        return {
            mode: normalizedMode,
            defaultRegion: normalizedDefaultRegion,
            regionAliases: normalizedRegionAliases
        };
    }

    setDefaultOdds(odds, options = {}) {
        const normalizedOdds = this.normalizeOddsValue(odds);
        if (!Number.isFinite(normalizedOdds)) {
            throw new Error('默认倍率无效，请输入大于0的数字');
        }
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        this.updateRuleProfile(
            scope,
            { defaultOdds: normalizedOdds },
            { clientId: options && options.clientId ? options.clientId : '' }
        );
        this.persistAttributeConfig();
        this.ODDS = this.getEffectiveDefaultOdds('');
        return normalizedOdds;
    }

    clearDefaultOdds(options = {}) {
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        if (scope === 'global') {
            if (this.globalRuleProfile && Object.prototype.hasOwnProperty.call(this.globalRuleProfile, 'defaultOdds')) {
                delete this.globalRuleProfile.defaultOdds;
            }
            if (this.isRuleProfileEmpty(this.globalRuleProfile)) {
                this.globalRuleProfile = {};
            }
            this.persistAttributeConfig();
            this.ODDS = this.getEffectiveDefaultOdds('');
            return;
        }

        const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
        if (!clientId) {
            throw new Error('请先选择客户后再恢复默认倍率');
        }
        const profile = this.clientRuleProfiles[clientId];
        if (!profile) return;
        if (Object.prototype.hasOwnProperty.call(profile, 'defaultOdds')) {
            delete profile.defaultOdds;
        }
        if (this.isRuleProfileEmpty(profile)) {
            delete this.clientRuleProfiles[clientId];
        }
        this.persistAttributeConfig();
    }

    clearAttributeCombinePolicy(options = {}) {
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        if (scope === 'global') {
            if (this.globalRuleProfile && Object.prototype.hasOwnProperty.call(this.globalRuleProfile, 'attributeCombinePolicy')) {
                delete this.globalRuleProfile.attributeCombinePolicy;
            }
            if (this.isRuleProfileEmpty(this.globalRuleProfile)) {
                this.globalRuleProfile = {};
            }
            this.persistAttributeConfig();
            return;
        }

        const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
        if (!clientId) {
            throw new Error('请先选择网友后再恢复默认');
        }
        const profile = this.clientRuleProfiles[clientId];
        if (!profile) return;
        if (Object.prototype.hasOwnProperty.call(profile, 'attributeCombinePolicy')) {
            delete profile.attributeCombinePolicy;
        }
        if (this.isRuleProfileEmpty(profile)) {
            delete this.clientRuleProfiles[clientId];
        }
        this.persistAttributeConfig();
    }

    clearAnchorParseMode(options = {}) {
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        if (scope === 'global') {
            if (this.globalRuleProfile && Object.prototype.hasOwnProperty.call(this.globalRuleProfile, 'anchorParseMode')) {
                delete this.globalRuleProfile.anchorParseMode;
            }
            if (this.isRuleProfileEmpty(this.globalRuleProfile)) {
                this.globalRuleProfile = {};
            }
            this.persistAttributeConfig();
            return;
        }

        const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
        if (!clientId) {
            throw new Error('请先选择网友后再恢复默认');
        }
        const profile = this.clientRuleProfiles[clientId];
        if (!profile) return;
        if (Object.prototype.hasOwnProperty.call(profile, 'anchorParseMode')) {
            delete profile.anchorParseMode;
        }
        if (this.isRuleProfileEmpty(profile)) {
            delete this.clientRuleProfiles[clientId];
        }
        this.persistAttributeConfig();
    }

    setTailShorthandAsSeparateGroups(enabled, options = {}) {
        const normalizedEnabled = enabled === true;
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        this.updateRuleProfile(
            scope,
            { tailShorthandAsSeparateGroups: normalizedEnabled },
            { clientId: options && options.clientId ? options.clientId : '' }
        );
        this.persistAttributeConfig();
        return normalizedEnabled;
    }

    clearRegionAccountingPolicy(options = {}) {
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        const clearRegionPolicyKeys = (profile) => {
            if (!profile || !profile.regionPolicy || typeof profile.regionPolicy !== 'object') return;
            if (Object.prototype.hasOwnProperty.call(profile.regionPolicy, 'defaultRegion')) {
                delete profile.regionPolicy.defaultRegion;
            }
            if (Object.prototype.hasOwnProperty.call(profile.regionPolicy, 'separateStatsByRegion')) {
                delete profile.regionPolicy.separateStatsByRegion;
            }
            if (Object.prototype.hasOwnProperty.call(profile.regionPolicy, 'regionAliases')) {
                delete profile.regionPolicy.regionAliases;
            }
            if (Object.keys(profile.regionPolicy).length === 0) {
                delete profile.regionPolicy;
            }
        };

        if (scope === 'global') {
            clearRegionPolicyKeys(this.globalRuleProfile);
            if (this.isRuleProfileEmpty(this.globalRuleProfile)) {
                this.globalRuleProfile = {};
            }
            this.persistAttributeConfig();
            return;
        }

        const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
        if (!clientId) {
            throw new Error('请先选择客户后再恢复区域规则');
        }
        const profile = this.clientRuleProfiles[clientId];
        if (!profile) return;
        clearRegionPolicyKeys(profile);
        if (this.isRuleProfileEmpty(profile)) {
            delete this.clientRuleProfiles[clientId];
        }
        this.persistAttributeConfig();
    }

    setBlockedPlayKeywordMap(keywordMap = {}, options = {}) {
        const normalizedMap = this.sanitizeBlockedPlayKeywordMap(keywordMap || {}, { rejectSystemTokens: true });
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        const applyKeywords = (targetProfile = {}) => {
            const nextProfile = targetProfile && typeof targetProfile === 'object'
                ? JSON.parse(JSON.stringify(targetProfile))
                : {};
            nextProfile.blockedPlayKeywords = normalizedMap;
            return this.sanitizeRuleProfile(nextProfile, { forOverride: true });
        };

        if (scope === 'global') {
            this.globalRuleProfile = applyKeywords(this.globalRuleProfile || {});
        } else {
            const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
            if (!clientId) {
                throw new Error('请先选择客户后再设置玩法关键词');
            }
            const current = this.clientRuleProfiles[clientId] || {};
            const next = applyKeywords(current);
            if (this.isRuleProfileEmpty(next)) {
                delete this.clientRuleProfiles[clientId];
            } else {
                this.clientRuleProfiles[clientId] = next;
            }
        }
        this.persistAttributeConfig();
        return normalizedMap;
    }

    setMessageTypeWhitelist(whitelistMap = {}, options = {}) {
        const normalizedMap = this.sanitizeMessageTypeWhitelist(whitelistMap || {});
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        const applyWhitelist = (targetProfile = {}) => {
            const nextProfile = targetProfile && typeof targetProfile === 'object'
                ? JSON.parse(JSON.stringify(targetProfile))
                : {};
            nextProfile.messageTypeWhitelist = normalizedMap;
            return this.sanitizeRuleProfile(nextProfile, { forOverride: true });
        };

        if (scope === 'global') {
            this.globalRuleProfile = applyWhitelist(this.globalRuleProfile || {});
        } else {
            const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
            if (!clientId) {
                throw new Error('请先选择客户后再设置消息类型白名单');
            }
            const current = this.clientRuleProfiles[clientId] || {};
            const next = applyWhitelist(current);
            if (this.isRuleProfileEmpty(next)) {
                delete this.clientRuleProfiles[clientId];
            } else {
                this.clientRuleProfiles[clientId] = next;
            }
        }
        this.persistAttributeConfig();
        return normalizedMap;
    }

    clearBlockedPlayKeywordMap(options = {}) {
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        const clearKeywords = (profile) => {
            if (!profile || typeof profile !== 'object') return;
            if (Object.prototype.hasOwnProperty.call(profile, 'blockedPlayKeywords')) {
                delete profile.blockedPlayKeywords;
            }
        };

        if (scope === 'global') {
            clearKeywords(this.globalRuleProfile);
            if (this.isRuleProfileEmpty(this.globalRuleProfile)) {
                this.globalRuleProfile = {};
            }
            this.persistAttributeConfig();
            return;
        }

        const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
        if (!clientId) {
            throw new Error('请先选择客户后再恢复玩法关键词');
        }
        const profile = this.clientRuleProfiles[clientId];
        if (!profile) return;
        clearKeywords(profile);
        if (this.isRuleProfileEmpty(profile)) {
            delete this.clientRuleProfiles[clientId];
        }
        this.persistAttributeConfig();
    }

    clearMessageTypeWhitelist(options = {}) {
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        const clearWhitelist = (profile) => {
            if (!profile || typeof profile !== 'object') return;
            if (Object.prototype.hasOwnProperty.call(profile, 'messageTypeWhitelist')) {
                delete profile.messageTypeWhitelist;
            }
        };

        if (scope === 'global') {
            clearWhitelist(this.globalRuleProfile);
            if (this.isRuleProfileEmpty(this.globalRuleProfile)) {
                this.globalRuleProfile = {};
            }
            this.persistAttributeConfig();
            return;
        }

        const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
        if (!clientId) {
            throw new Error('请先选择客户后再恢复消息类型白名单');
        }
        const profile = this.clientRuleProfiles[clientId];
        if (!profile) return;
        clearWhitelist(profile);
        if (this.isRuleProfileEmpty(profile)) {
            delete this.clientRuleProfiles[clientId];
        }
        this.persistAttributeConfig();
    }

    getEffectiveAttributeCombinePolicy(clientId = '') {
        return this.getEffectiveRuleProfile(clientId).attributeCombinePolicy || 'intersection_then_union_fallback';
    }

    getEffectiveAnchorParseMode(clientId = '') {
        const mode = this.getEffectiveRuleProfile(clientId).anchorParseMode;
        return this.getAllowedAnchorParseModeValues().includes(mode) ? mode : 'strict';
    }

    getEffectiveTailShorthandAsSeparateGroups(clientId = '') {
        return this.getEffectiveRuleProfile(clientId).tailShorthandAsSeparateGroups === true;
    }

    getEffectiveAnchorOdds(anchorToken, clientId = '') {
        const profile = this.getEffectiveRuleProfile(clientId);
        const defaultOdds = this.normalizeOddsValue(profile.defaultOdds, this.SYSTEM_DEFAULT_ODDS);
        const token = this.normalizeAnchorAliasToken(anchorToken);
        const rule = token && profile.anchorSemantics ? profile.anchorSemantics[token] : null;
        const overrideOdds = this.normalizeOddsValue(rule && rule.odds);
        return Number.isFinite(overrideOdds) ? overrideOdds : defaultOdds;
    }

    resetAnchorRules(scope = 'global', options = {}) {
        const normalizedScope = scope === 'client' ? 'client' : 'global';
        if (normalizedScope === 'global') {
            if (this.globalRuleProfile && this.globalRuleProfile.anchorSemantics) {
                delete this.globalRuleProfile.anchorSemantics;
            }
            this.persistAttributeConfig();
            return;
        }
        const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
        if (!clientId || !this.clientRuleProfiles[clientId]) return;
        if (this.clientRuleProfiles[clientId].anchorSemantics) {
            delete this.clientRuleProfiles[clientId].anchorSemantics;
        }
        if (this.isRuleProfileEmpty(this.clientRuleProfiles[clientId])) {
            delete this.clientRuleProfiles[clientId];
        }
        this.persistAttributeConfig();
    }

    resetClientRules(clientId) {
        this.resetRuleProfile('client', { clientId });
        this.persistAttributeConfig();
    }

    upsertAnchorAlias(token, mode, options = {}) {
        const mapped = this.normalizeLegacyAliasMode(mode);
        if (!mapped) {
            throw new Error('词义类型无效');
        }
        if (mapped === 'ignore') {
            return this.upsertAnchorRule(token, 'per_number', {
                ...options,
                enabled: false
            });
        }
        return this.upsertAnchorRule(token, mapped, {
            ...options,
            enabled: true
        });
    }

    removeAnchorAlias(token, options = {}) {
        this.removeAnchorRule(token, options);
    }

    resetAnchorAliases(options = {}) {
        const scope = options && options.scope === 'client' ? 'client' : 'global';
        this.resetAnchorRules(scope, options);
    }

    getActiveAnchorAliasMap() {
        const active = {};
        const anchorSemantics = this.getActiveRuleProfile().anchorSemantics || {};
        Object.entries(anchorSemantics).forEach(([token, rule]) => {
            if (!rule || rule.enabled === false) return;
            const distribute = this.normalizeAmountDistributeValue(rule.amountDistribute);
            if (!distribute) return;
            active[token] = distribute;
        });
        return active;
    }

    getMergedAnchorAliasMap(clientId = '') {
        const profile = arguments.length === 0
            ? this.getActiveRuleProfile()
            : this.getEffectiveRuleProfile(clientId);
        return this.exportLegacyAnchorAliasMap(profile.anchorSemantics || {});
    }

    getAnchorAliasRows(options = {}) {
        const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
        const effective = this.getEffectiveRuleProfile(clientId);
        const systemAnchors = this.getSystemRuleProfile().anchorSemantics || {};
        const globalAnchors = (this.getResolvedGlobalRuleProfile().anchorSemantics) || {};
        const clientAnchors = clientId && this.clientRuleProfiles[clientId]
            ? (this.clientRuleProfiles[clientId].anchorSemantics || {})
            : {};

        const tokenSet = new Set([
            ...Object.keys(systemAnchors),
            ...Object.keys(globalAnchors),
            ...Object.keys(clientAnchors)
        ]);

        const rows = Array.from(tokenSet).map(token => {
            const effectiveRule = this.sanitizeAnchorRuleItem(effective.anchorSemantics[token], token) || null;
            const source = Object.prototype.hasOwnProperty.call(clientAnchors, token)
                ? 'client'
                : (Object.prototype.hasOwnProperty.call(globalAnchors, token) ? 'global' : 'system');
            const defaultRule = this.sanitizeAnchorRuleItem(systemAnchors[token], token) || null;
            const scopedRuleRaw = source === 'client'
                ? clientAnchors[token]
                : (source === 'global' ? globalAnchors[token] : systemAnchors[token]);
            const scopedRule = this.sanitizeAnchorRuleItem(scopedRuleRaw, token) || null;
            const scopedOdds = this.normalizeOddsValue(scopedRule && scopedRule.odds);
            const effectiveOdds = this.normalizeOddsValue(effectiveRule && effectiveRule.odds, effective.defaultOdds);
            return {
                token,
                mode: effectiveRule && effectiveRule.amountDistribute ? effectiveRule.amountDistribute : 'per_number',
                tokenType: effectiveRule && effectiveRule.tokenType ? effectiveRule.tokenType : this.inferAnchorTokenType(token),
                position: effectiveRule && effectiveRule.position ? effectiveRule.position : 'before_amount',
                boundary: effectiveRule && effectiveRule.boundary ? effectiveRule.boundary : 'strict',
                priority: Number.isFinite(Number(effectiveRule && effectiveRule.priority))
                    ? Number(effectiveRule.priority)
                    : 100,
                source,
                active: !!(effectiveRule && effectiveRule.enabled !== false),
                defaultMode: defaultRule && defaultRule.amountDistribute ? defaultRule.amountDistribute : null,
                odds: Number.isFinite(effectiveOdds) ? effectiveOdds : this.SYSTEM_DEFAULT_ODDS,
                customOdds: Number.isFinite(scopedOdds),
                scopedOdds: Number.isFinite(scopedOdds) ? scopedOdds : null,
                defaultOdds: this.normalizeOddsValue(effective.defaultOdds, this.SYSTEM_DEFAULT_ODDS),
                clientId: source === 'client' ? clientId : ''
            };
        });

        rows.sort((a, b) => {
            const sourceOrder = { client: 0, global: 1, system: 2 };
            if (sourceOrder[a.source] !== sourceOrder[b.source]) {
                return sourceOrder[a.source] - sourceOrder[b.source];
            }
            if (a.token.length !== b.token.length) {
                return b.token.length - a.token.length;
            }
            return a.token.localeCompare(b.token, 'zh-Hans-CN');
        });
        return rows;
    }

    getSortedActiveAnchorRules() {
        const anchorSemantics = this.getActiveRuleProfile().anchorSemantics || {};
        const rules = [];
        Object.entries(anchorSemantics).forEach(([token, rawRule]) => {
            const rule = this.sanitizeAnchorRuleItem(rawRule, token);
            if (!rule || rule.enabled === false) return;
            rules.push({
                token,
                ...rule
            });
        });
        rules.sort((a, b) => {
            const priorityA = Number.isFinite(Number(a.priority)) ? Number(a.priority) : 100;
            const priorityB = Number.isFinite(Number(b.priority)) ? Number(b.priority) : 100;
            if (priorityA !== priorityB) {
                return priorityB - priorityA;
            }
            if (a.token.length !== b.token.length) {
                return b.token.length - a.token.length;
            }
            return a.token.localeCompare(b.token, 'zh-Hans-CN');
        });
        return rules;
    }

    supportsInlineAnchorPosition(rule) {
        const position = String(rule && rule.position ? rule.position : 'before_amount').trim();
        return position === 'before_amount' || position === 'after_target';
    }

    isAnchorGapChar(ch) {
        return /[\s,，.．。:：;；~～\-—_=+/\\#*'"$￥¥!！?？]/.test(ch);
    }

    isAnchorTrailingChar(ch) {
        return /[#*`'"$￥¥,，。:：;；~～!！?？]/.test(ch);
    }

    skipAnchorGap(text, startIndex) {
        let cursor = startIndex;
        while (cursor < text.length && this.isAnchorGapChar(text[cursor])) {
            cursor += 1;
        }
        return cursor;
    }

    parseAmountTokenAt(text, startIndex) {
        const slice = String(text || '').slice(startIndex);
        const match = slice.match(/^(?:[0-9０-９]+(?:[.．][0-9０-９]+)?|[零〇一二两三四五六七八九十百千万]+)/);
        if (!match) return null;
        const amountText = match[0];
        let amount = NaN;
        try {
            amount = this.parseFlexibleAmount(amountText);
        } catch (error) {
            amount = NaN;
        }
        if (!Number.isFinite(amount) || amount <= 0) return null;
        let endIndex = startIndex + amountText.length;
        while (endIndex < text.length && /\s/.test(text[endIndex])) {
            endIndex += 1;
        }
        const unitToken = this.matchConfiguredAmountSuffixAt(text, endIndex, { includeGeneric: true });
        if (unitToken) {
            endIndex += unitToken.length;
        }
        while (endIndex < text.length && this.isAnchorTrailingChar(text[endIndex])) {
            endIndex += 1;
        }
        return {
            amount,
            amountText,
            unitToken,
            endIndex
        };
    }

    matchInlineAnchorAt(text, index, sortedRules) {
        for (const rule of sortedRules) {
            if (!this.supportsInlineAnchorPosition(rule)) continue;
            const token = String(rule && rule.token ? rule.token : '');
            if (!token) continue;
            if (!String(text || '').startsWith(token, index)) continue;
            const amountStart = this.skipAnchorGap(text, index + token.length);
            const amountMatch = this.parseAmountTokenAt(text, amountStart);
            if (!amountMatch) continue;
            return {
                startIndex: index,
                endIndex: amountMatch.endIndex,
                anchorToken: token,
                amount: amountMatch.amount,
                amountText: amountMatch.amountText,
                rule
            };
        }
        return null;
    }

    scanLineForAmountAnchors(text) {
        const line = String(text || '');
        if (!line.trim()) return [];
        const sortedRules = this.getSortedActiveAnchorRules();
        if (sortedRules.length === 0) return [];
        const matches = [];
        let cursor = 0;
        while (cursor < line.length) {
            let found = null;
            for (let index = cursor; index < line.length; index += 1) {
                const candidate = this.matchInlineAnchorAt(line, index, sortedRules);
                if (candidate) {
                    found = candidate;
                    break;
                }
            }
            if (!found) break;
            matches.push(found);
            const nextCursor = Math.max(found.endIndex, found.startIndex + String(found.anchorToken || '').length, cursor + 1);
            cursor = nextCursor;
        }
        return matches;
    }

    containsConfiguredAnchor(text) {
        const raw = String(text || '');
        if (!raw.trim()) return false;
        return raw
            .replace(/\r/g, '')
            .split('\n')
            .some(line => this.scanLineForAmountAnchors(line).length > 0);
    }

    escapeRegex(text) {
        return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    buildAnchorTokenPattern() {
        const tokens = Object.keys(this.getActiveAnchorAliasMap())
            .filter(Boolean)
            .sort((a, b) => b.length - a.length);
        if (tokens.length === 0) {
            return '各|买';
        }
        return tokens.map(token => this.escapeRegex(token)).join('|');
    }

    buildAmountAnchorRegex() {
        const amountPattern = '[0-9０-９]+(?:[.．。][0-9０-９]+)?|[零〇一二两三四五六七八九十百千万]+';
        const anchorPattern = this.buildAnchorTokenPattern();
        const betweenPattern = '[\\s,，.．。:：;；~～\\-—_=+/\\\\#*\'"$￥¥!！?？]*';
        const suffixPattern = this.buildAmountSuffixPattern({ includeGeneric: true });
        return new RegExp(
            `(${anchorPattern})${betweenPattern}(${amountPattern})${suffixPattern ? `\\s*(?:${suffixPattern})?` : ''}(?:[#*\`'"$￥¥,，。:：;；~～!！?？]*)`,
            'g'
        );
    }

    getFlexibleAmountPatternSource() {
        return '[0-9０-９]+(?:[.．。][0-9０-９]+)?|[零〇一二两三四五六七八九十百千万]+';
    }

    getImplicitShorthandAmountPatternSource() {
        return '[0-9０-９]+|[零〇一二两三四五六七八九十百千万]+';
    }

    getActiveAnchorTokenSet() {
        return new Set(
            this.getSortedActiveAnchorRules()
                .map(rule => this.normalizeAnchorAliasToken(rule && rule.token ? rule.token : ''))
                .filter(Boolean)
        );
    }

    buildUnknownAnchorLikeRegex() {
        const amountPattern = this.getFlexibleAmountPatternSource();
        const gapPattern = `[\\s,，.．。:：;；~～\\-—_=+/\\\\#*'"$￥¥!！?？]*`;
        return new RegExp(
            `((?:各|每)\\s*(?:个\\s*)?(?:号码|码|号|数|肖|尾|波|门|组)|个\\s*(?:号码|码|号|数)|每个\\s*(?:号码|码|号|数|肖|生肖))(?=${gapPattern}(?:${amountPattern}))`,
            'gu'
        );
    }

    findUnknownAnchorLikeTokens(text) {
        const raw = this.stripLeadingOcrPrefix(
            this.stripTrailingSummaryTail(String(text || '').trim())
        );
        if (!raw) return [];
        const activeTokenSet = this.getActiveAnchorTokenSet();
        const regex = this.buildUnknownAnchorLikeRegex();
        const counts = new Map();
        let match = null;
        while ((match = regex.exec(raw)) !== null) {
            const token = this.normalizeAnchorAliasToken(match[1]);
            if (!token || activeTokenSet.has(token)) continue;
            counts.set(token, (counts.get(token) || 0) + 1);
        }
        return Array.from(counts.entries())
            .map(([token, count]) => ({ token, count }))
            .sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count;
                return a.token.localeCompare(b.token, 'zh-Hans-CN');
            });
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
    parseMessage(message, options = {}) {
        const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
        return this.withRuleContext(clientId, () => {
            try {
                const normalizedMessage = this.normalizeMessage(message);
                if (!String(normalizedMessage || '').trim()) {
                    throw new Error('消息不能为空');
                }
                const allowPartial = !!(options && options.allowPartial);
                const parsed = this.parseEntries(normalizedMessage, { allowPartial });
                const entries = Array.isArray(parsed && parsed.entries) ? parsed.entries : [];
                const playEntries = Array.isArray(parsed && parsed.playEntries) ? parsed.playEntries : [];
                const unresolvedLines = Array.isArray(parsed && parsed.unresolvedLines) ? parsed.unresolvedLines : [];
                if (entries.length === 0 && playEntries.length === 0) {
                    if (unresolvedLines.length > 0) {
                        const partialError = new Error(`消息中没有可识别的有效录入条目，剩余 ${unresolvedLines.length} 行未识别`);
                        partialError.code = 'NO_VALID_PARSED_CONTENT';
                        partialError.unresolvedLines = unresolvedLines;
                        throw partialError;
                    }
                    throw new Error('未找到可识别的消息内容');
                }
                const canonicalMessage = this.buildCanonicalMessage(entries) || String(normalizedMessage || '').trim();
                return {
                    entries,
                    playEntries,
                    unresolvedLines,
                    partial: unresolvedLines.length > 0,
                    original: canonicalMessage,
                    raw: normalizedMessage
                };
            } catch (error) {
                const wrapped = new Error(`消息解析失败: ${error.message}`);
                if (error && error.code) {
                    wrapped.code = error.code;
                }
                if (error && error.ambiguity) {
                    wrapped.ambiguity = error.ambiguity;
                }
                if (error && Array.isArray(error.unresolvedLines)) {
                    wrapped.unresolvedLines = error.unresolvedLines;
                }
                throw wrapped;
            }
        });
    }

    normalizeMessage(message) {
        if (!message) return '';
        const normalized = this.normalizeMessageCharacters(message);
        const stripped = this.stripConfiguredIgnoreTokens(normalized, {
            clientId: this.activeRuleClientId || ''
        });
        return this.expandTailShorthandGroupMessage(stripped && typeof stripped.text === 'string' ? stripped.text : normalized);
    }

    normalizeMessageCharacters(message) {
        if (!message) return '';
        return String(message)
            // 全角数字转半角数字
            .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248))
            // 全角空格转半角空格
            .replace(/\u3000/g, ' ')
            // OCR 常见异体字归一
            .replace(/號/g, '号')
            .replace(/免/g, '兔')
            .replace(/個/g, '个')
            .replace(/買/g, '买')
            .replace(/數/g, '数')
            .replace(/每\s*个/g, '每个')
            .replace(/各\s*个/g, '各个')
            // 常见 shorthand/OCR 连接符归一
            .replace(/([0-9])一(?=[0-9])/g, '$1=')
            .replace(/[＃﹟]/g, '#')
            // 中文波浪与特殊连字符统一
            .replace(/[﹣－]/g, '-')
            .replace(/[～〜]/g, '～')
            // 常见中文分隔符统一
            .replace(/[、；;]/g, ' ')
            .replace(/[：]/g, ':');
    }

    expandTailShorthandGroupMessage(message) {
        const raw = String(message || '');
        if (!raw || !this.getEffectiveTailShorthandAsSeparateGroups(this.activeRuleClientId || '')) {
            return raw;
        }
        return raw
            .replace(/\r/g, '')
            .split('\n')
            .map(line => this.expandTailShorthandGroupLine(line))
            .join('\n');
    }

    expandTailShorthandGroupLine(line) {
        const raw = String(line || '');
        if (!raw.trim()) return raw;
        const anchorPattern = this.buildAnchorTokenPattern();
        const amountPattern = this.getFlexibleAmountPatternSource();
        const amountSuffixPattern = this.buildAmountSuffixPattern({ includeGeneric: true });
        const amountWithSuffixPattern = amountSuffixPattern
            ? `(?:${amountPattern})(?:\\s*(?:${amountSuffixPattern}))?`
            : `(?:${amountPattern})`;
        const digitListPattern = '(?:\\d(?:[\\s,，/、]*)){2,}|\\d{2,}';
        const gapPattern = `[\\s,，.．。:：;；~～\\-—_=+/\\\\#*'"$￥¥!！?？]*`;
        const shorthandRegex = new RegExp(
            `(${digitListPattern})尾(${gapPattern}(?:${anchorPattern})${gapPattern}(?:${amountWithSuffixPattern})(?:[#*\`'"$￥¥,，。:：;；~～!！?？]*)?)`,
            'gu'
        );
        return raw.replace(shorthandRegex, (match, rawDigits, suffix) => {
            const digits = Array.from(String(rawDigits || '').match(/\d/g) || []);
            if (digits.length < 2) return match;
            return digits.map(digit => `${digit}尾${suffix}`).join(' ');
        });
    }

    normalizePartialParseReason(reason) {
        const raw = String(reason || '').replace(/^消息解析失败[:：]?\s*/u, '').trim();
        if (!raw) return '格式无法识别';
        return raw
            .replace(/^第\s*\d+\s*行[，,:：\s]*/u, '')
            .trim() || raw;
    }

    isBlockingUnresolvedLine(issue) {
        const rawText = String(issue && issue.rawText ? issue.rawText : '').trim();
        if (!rawText) return false;
        const normalized = this.stripLeadingOcrPrefix(
            this.stripTrailingSummaryTail(rawText)
        );
        if (!normalized) return false;
        if (this.matchesConfiguredNoiseRule(normalized)) return false;
        if (this.isSummaryLine(normalized)) return false;
        if (this.isIgnorableStandaloneLine(normalized)) return false;
        return true;
    }

    getBlockingUnresolvedLines(unresolvedLines) {
        if (!Array.isArray(unresolvedLines) || unresolvedLines.length === 0) return [];
        return unresolvedLines.filter(issue => this.isBlockingUnresolvedLine(issue));
    }

    shouldRethrowPartialParseError(error) {
        const code = String(error && error.code ? error.code : '').trim();
        return code === 'CROSS_LINE_AMBIGUITY' || code === 'UNDETERMINED_ANCHOR_MODE';
    }

    parseEntries(message, options = {}) {
        const allowPartial = !!(options && options.allowPartial);
        const lines = String(message || '')
            .replace(/\r/g, '')
            .split('\n');

        const entries = [];
        const playEntries = [];
        const unresolvedLines = [];
        const pendingSegments = [];
        let currentRegion = this.getDefaultRegionKey();
        let nextSegmentNo = 1;
        let nextParseOrder = 1;
        const unresolvedLineKeys = new Set();
        const assignParseOrder = (rows) => (Array.isArray(rows) ? rows.map((row) => ({
            ...row,
            parseOrder: nextParseOrder++
        })) : []);
        const addUnresolvedLine = (lineNo, rawText, reason) => {
            const safeLineNo = Number.isFinite(Number(lineNo)) ? Number(lineNo) : null;
            const sourceText = String(rawText || '').trim();
            if (!sourceText) return;
            const key = `${safeLineNo || '?'}|${sourceText}`;
            if (unresolvedLineKeys.has(key)) return;
            unresolvedLineKeys.add(key);
            unresolvedLines.push({
                lineNo: safeLineNo,
                rawText: sourceText,
                reason: this.normalizePartialParseReason(reason)
            });
        };
        const snapshotState = () => ({
            pendingSegments: pendingSegments.map(segment => ({ ...segment })),
            currentRegion,
            nextSegmentNo,
            nextParseOrder,
            entriesLength: entries.length,
            playEntriesLength: playEntries.length
        });
        const restoreState = (snapshot) => {
            if (!snapshot) return;
            pendingSegments.length = 0;
            pendingSegments.push(...snapshot.pendingSegments.map(segment => ({ ...segment })));
            currentRegion = snapshot.currentRegion;
            nextSegmentNo = snapshot.nextSegmentNo;
            nextParseOrder = snapshot.nextParseOrder;
            entries.length = snapshot.entriesLength;
            playEntries.length = snapshot.playEntriesLength;
        };

        lines.forEach((rawLine, lineIndex) => {
            const sourceLine = String(rawLine || '');
            const trimmedSourceLine = sourceLine.trim();
            if (!trimmedSourceLine) {
                // 空白行不参与录入条目解析，但必须保留真实行号用于报错定位。
                return;
            }
            const currentLineNo = lineIndex + 1;
            const snapshot = allowPartial ? snapshotState() : null;
            try {
                const activeMode = this.getEffectiveAnchorParseMode(this.activeRuleClientId);
                const line = activeMode === 'loose'
                    ? this.rewriteImplicitAmountLine(trimmedSourceLine)
                    : trimmedSourceLine;
                const standaloneRegionContext = this.resolveStandaloneRegionContextLine(line, currentRegion, currentLineNo);
                if (standaloneRegionContext) {
                    currentRegion = standaloneRegionContext.regionKey;
                    return;
                }
                const blockedPlayLine = this.parseBlockedPlayLine(line, currentRegion, currentLineNo);
                if (blockedPlayLine) {
                    playEntries.push(...assignParseOrder(blockedPlayLine.entries));
                    currentRegion = blockedPlayLine.currentRegion;
                    return;
                }
                this.assertNoAmbiguousSingleNumberShorthand(trimmedSourceLine, currentLineNo);
                this.assertNoUnknownAnchorLikeTokens(trimmedSourceLine, currentLineNo);
                this.assertNoDisabledCompositeAttributeShorthand(trimmedSourceLine, currentLineNo);
                const amountMatches = this.scanLineForAmountAnchors(line);
                let lastCursor = 0;
                let hasAmountAnchor = false;
                let lineHasRegionMarker = false;
                let lineResolvedImplicitly = false;
                let lineHasAmountUnitWithoutAnchor = false;
                let recognizedLineGroupCount = 0;
                const appendSplitSegments = (splitResult) => {
                    splitResult.segments.forEach(segment => {
                        const expandedSegments = this.splitSegmentBySafeSingleNumberImplicitChunks(segment);
                        expandedSegments.forEach(expandedSegment => {
                            const mixedBlockedResult = this.splitSegmentByMixedBlockedPlayChunks(expandedSegment, {
                                allowTargetOnlyOrdinary: true
                            });
                            let stagedNormalSegments = mixedBlockedResult.normalSegments;
                            if (mixedBlockedResult.playEntries.length > 0) {
                                recognizedLineGroupCount += mixedBlockedResult.playEntries.length;
                                playEntries.push(...assignParseOrder(mixedBlockedResult.playEntries));
                            }
                            stagedNormalSegments.forEach(normalSegment => {
                                const whitespaceBlockedResult = this.splitSegmentByTrailingBlockedPlayTarget(normalSegment);
                                if (whitespaceBlockedResult.playEntries.length > 0) {
                                    recognizedLineGroupCount += whitespaceBlockedResult.playEntries.length;
                                    playEntries.push(...assignParseOrder(whitespaceBlockedResult.playEntries));
                                }
                                whitespaceBlockedResult.normalSegments.forEach(finalNormalSegment => {
                                    if (!this.shouldKeepPendingSegment(finalNormalSegment && finalNormalSegment.text)) {
                                        return;
                                    }
                                    pendingSegments.push({
                                        ...finalNormalSegment,
                                        segmentNo: nextSegmentNo
                                    });
                                    nextSegmentNo += 1;
                                });
                            });
                        });
                    });
                    currentRegion = splitResult.currentRegion;
                    if (splitResult.containsRegionMarker) {
                        lineHasRegionMarker = true;
                    }
                };

                amountMatches.forEach(match => {
                    hasAmountAnchor = true;
                    const beforeAmount = line.slice(lastCursor, match.startIndex).trim();
                    if (beforeAmount) {
                        const splitResult = this.splitTextByRegion(beforeAmount, currentRegion, currentLineNo);
                        appendSplitSegments(splitResult);
                    }

                    const inlineImplicitEntries = this.resolveInlineSafeSingleNumberSegments(pendingSegments, currentLineNo);
                    if (inlineImplicitEntries.length > 0) {
                        recognizedLineGroupCount += inlineImplicitEntries.length;
                        entries.push(...assignParseOrder(inlineImplicitEntries));
                    }

                    const anchorToken = match.anchorToken;
                    const amount = match.amount;
                    const anchoredBlockedEntries = this.extractInlineAnchoredBlockedPlayEntries(
                        pendingSegments,
                        currentLineNo,
                        anchorToken,
                        amount
                    );
                    if (anchoredBlockedEntries.length > 0) {
                        recognizedLineGroupCount += anchoredBlockedEntries.length;
                        playEntries.push(...assignParseOrder(anchoredBlockedEntries));
                        if (pendingSegments.length === 0) {
                            lastCursor = match.endIndex;
                            return;
                        }
                    }
                    recognizedLineGroupCount += 1;
                    const detachedEntries = this.resolveCrossLineAnchorAmbiguity(
                        pendingSegments,
                        currentLineNo,
                        anchorToken,
                        amount
                    );
                    if (detachedEntries.length > 0) {
                        entries.push(...assignParseOrder(detachedEntries));
                    }
                    const parsedEntries = this.buildEntriesFromPendingSegments(
                        pendingSegments,
                        amount,
                        currentLineNo,
                        anchorToken
                    );
                    entries.push(...assignParseOrder(parsedEntries));
                    pendingSegments.length = 0;

                    lastCursor = match.endIndex;
                });

                if (!hasAmountAnchor) {
                    // 兼容摘要行：如“合计100/总计一百”，不参与录入条目解析。
                    if (pendingSegments.length === 0 && this.isIgnorableStandaloneLine(line)) {
                        return;
                    }

                    lineHasAmountUnitWithoutAnchor = this.containsAmountUnitWithoutAnchor(line);
                }

                const tail = line.slice(lastCursor).trim();
                if (tail) {
                    const splitResult = this.splitTextByRegion(tail, currentRegion, currentLineNo);
                    appendSplitSegments(splitResult);
                }
                this.compactPendingSegments(pendingSegments);

                const implicitEntries = this.resolveImplicitCurrentLineSegments(pendingSegments, currentLineNo);
                if (implicitEntries.length > 0) {
                    recognizedLineGroupCount += implicitEntries.length;
                    entries.push(...assignParseOrder(implicitEntries));
                    lineResolvedImplicitly = true;
                    this.compactPendingSegments(pendingSegments);
                }

                this.assertNoAmountGroupConflict(trimmedSourceLine, recognizedLineGroupCount, currentLineNo);

                if (!hasAmountAnchor && !lineResolvedImplicitly && pendingSegments.length === 0 && !lineHasRegionMarker) {
                    throw new Error(`第 ${currentLineNo} 行格式无法识别`);
                }
                if (!hasAmountAnchor && !lineResolvedImplicitly && lineHasAmountUnitWithoutAnchor) {
                    throw new Error(`第 ${currentLineNo} 行包含金额但缺少“各/各号/买”标记`);
                }
            } catch (error) {
                if (!allowPartial || this.shouldRethrowPartialParseError(error)) {
                    throw error;
                }
                restoreState(snapshot);
                addUnresolvedLine(
                    currentLineNo,
                    trimmedSourceLine,
                    error && error.message ? error.message : '格式无法识别'
                );
            }
        });

        this.compactPendingSegments(pendingSegments);
        if (pendingSegments.length > 0) {
            if (allowPartial) {
                pendingSegments.forEach((segment) => {
                    const lineNo = Number.isFinite(Number(segment && segment.lineNo)) ? Number(segment.lineNo) : null;
                    const rawText = lineNo && lines[lineNo - 1]
                        ? String(lines[lineNo - 1] || '').trim()
                        : String(segment && segment.text ? segment.text : '').trim();
                    addUnresolvedLine(
                        lineNo,
                        rawText,
                        `存在未绑定数值: ${String(segment && segment.text ? segment.text : '').trim()}，请在后面补充“各/各号/买/各肖/各数+数值”`,
                    );
                });
                pendingSegments.length = 0;
            } else {
                const firstPending = pendingSegments[0];
                const lineText = String(firstPending.text || '').slice(0, 30);
                throw new Error(`第 ${firstPending.lineNo || '?'} 行存在未绑定数值: ${lineText}，请在后面补充“各/各号/买/各肖/各数+数值”`);
            }
        }

        return {
            entries,
            playEntries,
            unresolvedLines
        };
    }

    getBlockedPingPlayDefinitions() {
        const keywordMap = this.getEffectiveBlockedPlayKeywordMap();
        return [
            { playType: 'pingte_xiao', playLabel: '平特一肖', tokens: keywordMap.pingte_xiao || [] },
            { playType: 'te_xiao', playLabel: '特肖', tokens: keywordMap.te_xiao || [] },
            { playType: 'yi_xiao', playLabel: '一肖', tokens: keywordMap.yi_xiao || [] }
        ].flatMap((definition) => {
            return (Array.isArray(definition.tokens) ? definition.tokens : []).map((token) => ({
                token,
                playType: definition.playType,
                playLabel: definition.playLabel
            }));
        }).sort((a, b) => b.token.length - a.token.length);
    }

    getBlockedLianPlayKeywords() {
        const keywordMap = this.getEffectiveBlockedPlayKeywordMap();
        return Array.from(new Set(Array.isArray(keywordMap.lian_play) ? keywordMap.lian_play : []))
            .sort((a, b) => b.length - a.length);
    }

    buildBlockedPlayEntry(entry = {}) {
        const regionKey = entry.regionKey || this.getDefaultRegionKey();
        const displayText = String(entry.displayText || entry.rawText || '').trim();
        const regionPrefix = this.getRegionPrefixByKey(regionKey);
        return {
            kind: 'play',
            playType: String(entry.playType || '').trim(),
            playFamily: String(entry.playFamily || '').trim(),
            playLabel: String(entry.playLabel || '未开放玩法').trim(),
            playStatus: 'blocked',
            blockReason: String(entry.blockReason || '当前玩法未开放，不参与号码统计').trim(),
            blocking: entry.blocking === true || this.isBlockingPlayEntry(entry),
            rawText: String(entry.rawText || '').trim(),
            displayText,
            regionKey,
            lineNo: entry.lineNo || null,
            segmentNo: entry.segmentNo || null,
            amount: Number.isFinite(Number(entry.amount)) ? Number(entry.amount) : NaN,
            totalAmount: 0,
            canonical: `${regionPrefix}未开放玩法：${displayText || entry.playLabel || '未知玩法'}`
        };
    }

    isBlockingPlayEntry(entry = {}) {
        if (!entry || typeof entry !== 'object') return false;
        if (entry.blocking === true) return true;
        return String(entry.playType || '').trim() === 'pingte_xiao';
    }

    buildBlockingIssueFromPlayEntry(entry = {}) {
        return {
            lineNo: Number.isFinite(Number(entry && entry.lineNo)) ? Number(entry.lineNo) : null,
            rawText: String(entry && (entry.displayText || entry.rawText || entry.canonical) ? (entry.displayText || entry.rawText || entry.canonical) : '').trim(),
            reason: String(entry && (entry.blockReason || entry.playLabel || entry.playType || '未开放玩法') ? (entry.blockReason || entry.playLabel || entry.playType || '未开放玩法') : '未开放玩法').trim()
        };
    }

    parseBlockedPingPlaySegment(segment) {
        const gapPattern = `[\\s,，。．；;:：~～\\-—_/\\\\#*'"$￥¥!！?？]*`;
        const amountPattern = '[0-9]+(?:[.．。][0-9]+)?|[零〇一二两三四五六七八九十百千万]+';
        const rawSegmentText = String(segment && segment.text ? segment.text : '').trim();
        const animalPattern = '[鼠牛虎兔龙蛇马羊猴鸡狗猪]';
        const inlineAnchorPattern = this.buildAnchorTokenPattern();
        const amountSuffixPattern = this.buildAmountSuffixPattern({ includeGeneric: true });
        const candidateTexts = Array.from(new Set([
            this.stripTrailingSummaryTail(rawSegmentText),
            this.stripTrailingSummaryTailForSpecialPlay(rawSegmentText),
            rawSegmentText
        ].map(item => String(item || '').trim()).filter(Boolean)));

        for (const rawText of candidateTexts) {
            if (!rawText) continue;
            const normalizedText = String(rawText || '')
                .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248))
                .trim();
            if (!normalizedText) continue;
            const compactText = normalizedText
                .replace(/[\s,，。．；;:：~～\-—_/\\#*'"$￥¥!！?？]+/g, '')
                .trim();

            let matchedDefinition = null;
            let targetToken = '';
            let amount = NaN;

            for (const definition of this.getBlockedPingPlayDefinitions()) {
                const tokenPattern = this.escapeRegex(definition.token);
                const singleTargetPattern = new RegExp(
                    `^${tokenPattern}${gapPattern}(${animalPattern})${gapPattern}(${amountPattern})${amountSuffixPattern ? `(?:\\s*(?:${amountSuffixPattern}))?` : ''}${gapPattern}$`,
                    'u'
                );
                const multiTargetPattern = new RegExp(
                    `^${tokenPattern}((?:${animalPattern})+)(?:${inlineAnchorPattern})?(${amountPattern})(?:${amountSuffixPattern})?$`,
                    'u'
                );
                const match = normalizedText.match(singleTargetPattern)
                    || compactText.match(multiTargetPattern);
                if (!match) continue;
                targetToken = String(match[1] || '').trim();
                try {
                    amount = this.parseFlexibleAmount(match[2]);
                } catch (error) {
                    amount = NaN;
                }
                const hasValidAnimalTarget = targetToken
                    && Array.from(targetToken).every(token => !!this.animalMap[token]);
                if (!hasValidAnimalTarget || !Number.isFinite(amount) || amount <= 0) {
                    matchedDefinition = null;
                    break;
                }
                matchedDefinition = definition;
                break;
            }
            if (!matchedDefinition) continue;

            return this.buildBlockedPlayEntry({
                playType: matchedDefinition.playType,
                playFamily: 'ping',
                playLabel: matchedDefinition.playLabel,
                rawText: rawSegmentText,
                displayText: normalizedText,
                amount,
                regionKey: segment.regionKey || this.getDefaultRegionKey(),
                lineNo: segment.lineNo || null,
                segmentNo: segment.segmentNo || null
            });
        }

        for (const rawText of candidateTexts) {
            if (!rawText) continue;
            const normalizedText = String(rawText || '')
                .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248))
                .trim();
            const compactText = normalizedText
                .replace(/[\s,，。．；;:：~～\-—_/\\#*'"$￥¥!！?？]+/g, '')
                .trim();
            if (!compactText) continue;
            for (const definition of this.getBlockedPingPlayDefinitions()) {
                if (!compactText.includes(String(definition.token || '').trim())) continue;
                return this.buildBlockedPlayEntry({
                    playType: definition.playType,
                    playFamily: 'ping',
                    playLabel: definition.playLabel,
                    rawText: rawSegmentText,
                    displayText: normalizedText,
                    blockReason: '命中特平特类关键词，已按未开放玩法拦截',
                    regionKey: segment.regionKey || this.getDefaultRegionKey(),
                    lineNo: segment.lineNo || null,
                    segmentNo: segment.segmentNo || null
                });
            }
        }

        return null;
    }

    parseBlockedTemaPlaySegment(segment) {
        const rawText = String(segment && segment.text ? segment.text : '').trim();
        if (!rawText) return null;
        const candidateTexts = Array.from(new Set([
            this.stripTrailingSummaryTail(rawText),
            this.stripTrailingSummaryTailForSpecialPlay(rawText),
            rawText
        ].map(item => String(item || '').trim()).filter(Boolean)));
        const detector = /^特(?:码|肖|尾|波|[\d０-９鼠牛虎兔龙蛇马羊猴鸡狗猪大小单双红蓝绿波头尾合门段数号碼码])/u;
        for (const candidate of candidateTexts) {
            const normalized = String(candidate || '')
                .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248))
                .replace(/\s+/g, '')
                .trim();
            if (!normalized || !detector.test(normalized)) continue;
            return this.buildBlockedPlayEntry({
                playType: 'tema_generic',
                playFamily: 'te',
                playLabel: normalized.startsWith('特码') ? '特码' : '特',
                rawText,
                displayText: normalized,
                regionKey: segment.regionKey || this.getDefaultRegionKey(),
                lineNo: segment.lineNo || null,
                segmentNo: segment.segmentNo || null
            });
        }
        return null;
    }

    parseBlockedLianPlaySegment(segment) {
        const rawText = String(segment && segment.text ? segment.text : '').trim();
        if (!rawText) return null;
        const normalized = String(rawText || '').replace(/\s+/g, '');
        if (!normalized) return null;
        const keywords = this.getBlockedLianPlayKeywords();
        const explicitPattern = keywords.length > 0
            ? new RegExp(`(${keywords.map(token => this.escapeRegex(token)).join('|')})`, 'u')
            : /(三连|四连|五连|连肖|复式)/u;
        const implicitPattern = /^[鼠牛虎兔龙蛇马羊猴鸡狗猪]{2,}连(?:[0-9０-９零〇一二两三四五六七八九十百千万]+)/u;
        if (!explicitPattern.test(normalized) && !implicitPattern.test(normalized)) {
            return null;
        }
        const labelMatch = normalized.match(explicitPattern);
        const playLabel = labelMatch ? labelMatch[1] : '连肖';
        return this.buildBlockedPlayEntry({
            playType: 'lian_play',
            playFamily: 'lian',
            playLabel,
            rawText,
            displayText: normalized,
            regionKey: segment.regionKey || this.getDefaultRegionKey(),
            lineNo: segment.lineNo || null,
            segmentNo: segment.segmentNo || null
        });
    }

    parseBlockedComboPlaySegment(segment) {
        const rawText = String(segment && segment.text ? segment.text : '').trim();
        if (!rawText) return null;
        const normalized = String(rawText || '').replace(/\s+/g, '');
        if (!normalized) return null;
        if (!/(二中二|三中二|二全中|三全中|四全中|每组)/u.test(normalized)) {
            return null;
        }
        return this.buildBlockedPlayEntry({
            playType: 'combo_play',
            playFamily: 'combo',
            playLabel: '二中二/组合玩法',
            rawText,
            displayText: normalized,
            regionKey: segment.regionKey || this.getDefaultRegionKey(),
            lineNo: segment.lineNo || null,
            segmentNo: segment.segmentNo || null
        });
    }

    parseBlockedMenPlaySegment(segment) {
        const rawText = String(segment && segment.text ? segment.text : '').trim();
        if (!rawText || this.containsConfiguredAnchor(rawText)) return null;
        if (this.getActiveAmountUnits().includes('闷')) return null;
        const strippedText = this.stripTrailingSummaryTail(rawText);
        const normalized = String(strippedText || '').replace(/\s+/g, '');
        if (!normalized || !/闷$/u.test(normalized)) return null;
        const candidate = normalized.replace(/闷+$/u, '');
        if (!candidate || !this.hasPotentialBetTargets(candidate)) return null;
        return this.buildBlockedPlayEntry({
            playType: 'men_play',
            playFamily: 'men',
            playLabel: '闷号',
            rawText,
            displayText: normalized,
            regionKey: segment.regionKey || this.getDefaultRegionKey(),
            lineNo: segment.lineNo || null,
            segmentNo: segment.segmentNo || null
        });
    }

    parseBlockedPlaySegment(segment) {
        return this.parseBlockedPingPlaySegment(segment)
            || this.parseBlockedTemaPlaySegment(segment)
            || this.parseBlockedLianPlaySegment(segment)
            || this.parseBlockedMenPlaySegment(segment)
            || this.parseBlockedComboPlaySegment(segment);
    }

    containsBlockedPlayKeyword(text) {
        const normalized = String(text || '').replace(/\s+/g, '').trim();
        if (!normalized) return false;
        const pingTokens = this.getBlockedPingPlayDefinitions().map(item => item.token);
        const lianTokens = this.getBlockedLianPlayKeywords();
        const combinedTokens = Array.from(new Set([
            ...pingTokens,
            ...lianTokens,
            '特码', '二中二', '三中二', '二全中', '三全中', '四全中', '每组'
        ]))
            .filter(Boolean)
            .sort((a, b) => b.length - a.length);
        const basePattern = combinedTokens.length > 0
            ? `(?:${combinedTokens.map(token => this.escapeRegex(token)).join('|')})`
            : '(?:特码|二中二|三中二|二全中|三全中|四全中|每组)';
        if (this.getActiveAmountUnits().includes('闷')) {
            return new RegExp(basePattern, 'u').test(normalized);
        }
        return new RegExp(`${basePattern}|闷`, 'u').test(normalized);
    }

    isOrdinaryDelimitedChunk(text, options = {}) {
        const raw = String(text || '').trim();
        if (!raw) return false;
        if (this.parseBlockedPlaySegment({ text: raw, regionKey: this.getDefaultRegionKey() })) return false;
        if (this.containsConfiguredAnchor(raw)) return true;
        if (this.parseSafeSingleNumberImplicitChunk(raw)) return true;
        if (this.extractBulkEqualsChunks(raw).length > 0) return true;
        if (options && options.allowTargetOnlyOrdinary && this.hasPotentialBetTargets(raw)) return true;
        return false;
    }

    splitSegmentByMixedBlockedPlayChunks(segment, options = {}) {
        const rawText = String(segment && segment.text ? segment.text : '').trim();
        if (!rawText || !/[，,；;]/.test(rawText)) {
            return {
                normalSegments: rawText ? [{ ...segment, text: rawText }] : [],
                playEntries: []
            };
        }

        const rawChunks = rawText
            .split(/[，,；;]/)
            .map(item => String(item || '').trim())
            .filter(Boolean);
        if (rawChunks.length < 2) {
            return {
                normalSegments: rawText ? [{ ...segment, text: rawText }] : [],
                playEntries: []
            };
        }

        const ordinaryFlags = rawChunks.map(chunk => this.isOrdinaryDelimitedChunk(chunk, options));
        if (!ordinaryFlags.some(Boolean)) {
            return {
                normalSegments: [{ ...segment, text: rawText }],
                playEntries: []
            };
        }

        const playEntries = [];
        const normalSegments = [];
        let hasSplitPlay = false;

        for (let index = 0; index < rawChunks.length; index += 1) {
            if (ordinaryFlags[index]) {
                normalSegments.push({
                    ...segment,
                    text: rawChunks[index]
                });
                continue;
            }

            let runEnd = index;
            while (runEnd + 1 < rawChunks.length && !ordinaryFlags[runEnd + 1]) {
                runEnd += 1;
            }

            const combinedText = rawChunks.slice(index, runEnd + 1).join('，');
            const parsedPlay = this.parseBlockedPlaySegment({
                ...segment,
                text: combinedText
            });

            if (parsedPlay) {
                playEntries.push(parsedPlay);
                hasSplitPlay = true;
            } else {
                normalSegments.push({
                    ...segment,
                    text: combinedText
                });
            }

            index = runEnd;
        }

        if (!hasSplitPlay) {
            return {
                normalSegments: [{ ...segment, text: rawText }],
                playEntries: []
            };
        }

        return {
            normalSegments: normalSegments.filter(item => String(item && item.text ? item.text : '').trim()),
            playEntries
        };
    }

    splitSegmentByTrailingBlockedPlayTarget(segment) {
        const rawText = String(segment && segment.text ? segment.text : '').trim();
        if (!rawText || !/\s/.test(rawText)) {
            return {
                normalSegments: rawText ? [{ ...segment, text: rawText }] : [],
                playEntries: []
            };
        }

        const boundaryMatches = Array.from(rawText.matchAll(/\s+/g));
        for (let i = boundaryMatches.length - 1; i >= 0; i -= 1) {
            const boundary = boundaryMatches[i];
            const splitIndex = boundary.index || 0;
            const leftText = rawText.slice(0, splitIndex).trim();
            const rightText = rawText.slice(splitIndex).trim();
            if (!leftText || !rightText) continue;
            if (!this.hasPotentialBetTargets(rightText)) continue;
            const parsedPlay = this.parseBlockedPlaySegment({
                ...segment,
                text: leftText
            });
            if (!parsedPlay) continue;
            return {
                normalSegments: [{ ...segment, text: rightText }],
                playEntries: [parsedPlay]
            };
        }

        return {
            normalSegments: [{ ...segment, text: rawText }],
            playEntries: []
        };
    }

    extractInlineAnchoredBlockedPlayEntries(pendingSegments, currentLineNo, anchorToken, amount) {
        if (!Array.isArray(pendingSegments) || pendingSegments.length === 0) return [];
        const extractedEntries = [];
        const amountText = this.formatAmount(amount);
        for (let i = pendingSegments.length - 1; i >= 0; i -= 1) {
            const segment = pendingSegments[i];
            if (!segment || parseInt(segment.lineNo, 10) !== currentLineNo) continue;
            const segmentText = String(segment.text || '').trim();
            if (!segmentText) continue;
            const combinedSegment = {
                ...segment,
                text: `${segmentText}${anchorToken}${amountText}`
            };
            const parsedPlay = this.parseBlockedPlaySegment(combinedSegment);
            if (!parsedPlay) continue;
            pendingSegments.splice(i, 1);
            extractedEntries.unshift(parsedPlay);
        }
        return extractedEntries;
    }

    shouldBypassWholeLineBlockedPlay(line) {
        const raw = String(line || '').trim();
        if (!raw || !this.containsBlockedPlayKeyword(raw)) return false;
        return this.scanLineForAmountAnchors(raw).length > 1;
    }

    parseBlockedPlayLine(line, initialRegion = 'new_ao', lineNo = null) {
        const rawLine = String(line || '').trim();
        if (this.shouldBypassWholeLineBlockedPlay(rawLine)) {
            return null;
        }
        if (rawLine && !this.getActiveAmountUnits().includes('闷') && /闷\s*$/u.test(rawLine) && !this.containsConfiguredAnchor(rawLine)) {
            const splitMenResult = this.splitTextByRegion(rawLine.replace(/闷+\s*$/u, ''), initialRegion, lineNo);
            if (Array.isArray(splitMenResult.segments) && splitMenResult.segments.length === 1) {
                const onlySegment = splitMenResult.segments[0];
                if (onlySegment && this.hasPotentialBetTargets(onlySegment.text)) {
                    return {
                        entries: [this.buildBlockedPlayEntry({
                            playType: 'men_play',
                            playFamily: 'men',
                            playLabel: '闷号',
                            rawText: rawLine,
                            displayText: `${String(onlySegment.text || '').replace(/\s+/g, '')}闷`,
                            regionKey: onlySegment.regionKey || splitMenResult.currentRegion || this.getDefaultRegionKey(),
                            lineNo: onlySegment.lineNo || lineNo || null,
                            segmentNo: onlySegment.segmentNo || null
                        })],
                        currentRegion: splitMenResult.currentRegion
                    };
                }
            }
        }
        const splitResult = this.splitTextByRegion(line, initialRegion, lineNo);
        if (!splitResult.segments || splitResult.segments.length !== 1) {
            return null;
        }
        const mixedSplit = this.splitSegmentByMixedBlockedPlayChunks(splitResult.segments[0]);
        if (mixedSplit.playEntries.length > 0 && mixedSplit.normalSegments.length > 0) {
            return null;
        }
        if (mixedSplit.playEntries.length > 0) {
            return {
                entries: mixedSplit.playEntries,
                currentRegion: splitResult.currentRegion
            };
        }
        const parsedEntry = this.parseBlockedPlaySegment(splitResult.segments[0]);
        if (!parsedEntry) return null;
        return {
            entries: [parsedEntry],
            currentRegion: splitResult.currentRegion
        };
    }

    resolveStandaloneRegionContextLine(line, initialRegion = 'new_ao', lineNo = null) {
        const splitResult = this.splitTextByRegion(line, initialRegion, lineNo);
        if (!splitResult.containsRegionMarker) return null;
        if (Array.isArray(splitResult.segments) && splitResult.segments.length > 0) return null;
        return {
            regionKey: splitResult.currentRegion
        };
    }

    parseImplicitStandaloneSegment(segment) {
        const rawText = this.stripTrailingSummaryTail(String(segment && segment.text ? segment.text : '').trim());
        if (!rawText) return null;
        if (this.containsConfiguredAnchor(rawText)) return null;

        const safeSingleNumberChunk = this.parseSafeSingleNumberImplicitChunk(rawText);
        if (safeSingleNumberChunk) {
            const pseudoPending = [{
                text: this.formatNumber(safeSingleNumberChunk.number),
                regionKey: segment.regionKey || this.getDefaultRegionKey(),
                lineNo: segment.lineNo || null,
                segmentNo: segment.segmentNo || null
            }];
            const entries = this.buildEntriesFromPendingSegments(
                pseudoPending,
                safeSingleNumberChunk.amount,
                segment.lineNo || null,
                '各'
            );
            if (!Array.isArray(entries) || entries.length === 0) return null;
            return {
                rewritten: safeSingleNumberChunk.rewritten,
                entries
            };
        }

        const rewritten = this.rewriteImplicitAmountLine(rawText);
        if (!rewritten || rewritten === rawText || !this.containsConfiguredAnchor(rewritten)) {
            return null;
        }

        const matches = this.scanLineForAmountAnchors(rewritten);
        if (!Array.isArray(matches) || matches.length !== 1) return null;
        const match = matches[0];

        const beforeAmount = rewritten.slice(0, match.startIndex).trim();
        const afterAmount = rewritten.slice(match.endIndex).trim();
        if (!beforeAmount || afterAmount) return null;

        const amount = match.amount;
        const anchorToken = match.anchorToken;
        const pseudoPending = [{
            text: beforeAmount,
            regionKey: segment.regionKey || this.getDefaultRegionKey(),
            lineNo: segment.lineNo || null,
            segmentNo: segment.segmentNo || null
        }];
        const entries = this.buildEntriesFromPendingSegments(
            pseudoPending,
            amount,
            segment.lineNo || null,
            anchorToken
        );
        if (!Array.isArray(entries) || entries.length === 0) return null;
        return {
            rewritten,
            entries
        };
    }

    parseImplicitSegmentChunks(segment) {
        const chunks = this.splitImplicitSegmentChunks(segment && segment.text ? segment.text : '');
        if (chunks.length === 0) return null;
        const entries = [];
        chunks.forEach((chunk, chunkIndex) => {
            const pseudoSegment = {
                text: chunk,
                regionKey: segment.regionKey || this.getDefaultRegionKey(),
                lineNo: segment.lineNo || null,
                segmentNo: segment.segmentNo != null ? segment.segmentNo + chunkIndex : null
            };
            const implicitParsed = this.parseImplicitStandaloneSegment(pseudoSegment);
            if (!implicitParsed || !Array.isArray(implicitParsed.entries) || implicitParsed.entries.length === 0) {
                throw new Error(`第 ${segment.lineNo || '?'} 行存在未绑定数值: ${segment.text}，请在后面补充“各/各号/买/各肖/各数+数值”`);
            }
            entries.push(...implicitParsed.entries);
        });
        return entries.length > 0 ? entries : null;
    }

    resolveImplicitCurrentLineSegments(pendingSegments, currentLineNo) {
        if (!Array.isArray(pendingSegments) || pendingSegments.length === 0) return [];
        const resolvedEntries = [];
        for (let i = pendingSegments.length - 1; i >= 0; i -= 1) {
            const segment = pendingSegments[i];
            if (!segment || parseInt(segment.lineNo, 10) !== currentLineNo) continue;
            let parsedEntries = null;
            try {
                parsedEntries = this.parseImplicitSegmentChunks(segment);
            } catch (error) {
                parsedEntries = null;
            }
            if (!parsedEntries || parsedEntries.length === 0) continue;
            pendingSegments.splice(i, 1);
            resolvedEntries.unshift(...parsedEntries);
        }
        return resolvedEntries;
    }

    resolveInlineSafeSingleNumberSegments(pendingSegments, currentLineNo) {
        if (!Array.isArray(pendingSegments) || pendingSegments.length === 0) return [];
        const resolvedEntries = [];
        for (let i = pendingSegments.length - 1; i >= 0; i -= 1) {
            const segment = pendingSegments[i];
            if (!segment || parseInt(segment.lineNo, 10) !== currentLineNo) continue;
            if (segment.implicitKind !== 'safe_single_number') continue;
            const parsedChunk = this.parseSafeSingleNumberImplicitChunk(segment.text);
            if (!parsedChunk) continue;
            const pseudoPending = [{
                text: this.formatNumber(parsedChunk.number),
                regionKey: segment.regionKey || this.getDefaultRegionKey(),
                lineNo: segment.lineNo || null,
                segmentNo: segment.segmentNo || null
            }];
            const entries = this.buildEntriesFromPendingSegments(
                pseudoPending,
                parsedChunk.amount,
                segment.lineNo || currentLineNo,
                '各'
            );
            pendingSegments.splice(i, 1);
            resolvedEntries.unshift(...entries);
        }
        return resolvedEntries;
    }

    resolveCrossLineAnchorAmbiguity(pendingSegments, currentLineNo, anchorToken, amount) {
        if (!Array.isArray(pendingSegments) || pendingSegments.length === 0) return [];

        const previousLineSegments = pendingSegments.filter(segment => {
            const lineNo = parseInt(segment && segment.lineNo, 10);
            return Number.isInteger(lineNo) && lineNo < currentLineNo;
        });
        if (previousLineSegments.length === 0) return [];

        const ambiguityPolicy = String(this.getActiveRuleProfile().ambiguityPolicy || 'confirm').trim();
        if (ambiguityPolicy === 'auto') {
            return [];
        }

        const detachedEntries = [];
        for (const segment of previousLineSegments) {
            let implicitParsed = null;
            try {
                implicitParsed = this.parseImplicitStandaloneSegment(segment);
            } catch (error) {
                implicitParsed = null;
            }
            if (!implicitParsed) continue;

            if (ambiguityPolicy === 'error') {
                throw new Error(`第 ${segment.lineNo || '?'} 行“${segment.text}”存在跨行歧义，请补充锚点后再提交`);
            }

            const standalonePreview = implicitParsed.entries
                .map(item => this.buildCanonicalEntryText(item))
                .filter(Boolean)
                .join(' / ');
            const amountText = this.formatAmount(amount);
            const segmentText = String(segment.text || '').trim();
            const segmentLineNo = parseInt(segment.lineNo, 10) || null;
            let mergePreview = '';
            let mergeRewrite = '';
            try {
                const mergedCandidates = this.buildEntriesFromPendingSegments(
                    [{
                        text: segmentText,
                        regionKey: segment.regionKey || this.getDefaultRegionKey(),
                        lineNo: segment.lineNo || currentLineNo,
                        segmentNo: segment.segmentNo || null
                    }],
                    amount,
                    currentLineNo,
                    anchorToken
                );
                mergePreview = mergedCandidates
                    .map(item => this.buildCanonicalEntryText(item))
                    .filter(Boolean)
                    .join(' / ');
                const mergeNumbers = [];
                mergedCandidates.forEach(item => {
                    (item.numbers || []).forEach(num => {
                        if (this.validateNumber(num)) {
                            mergeNumbers.push(this.formatNumber(num));
                        }
                    });
                });
                if (mergeNumbers.length > 0) {
                    mergeRewrite = mergeNumbers.join('.');
                }
            } catch (error) {
                mergePreview = '';
                mergeRewrite = '';
            }
            const ambiguityError = new Error(`第 ${segment.lineNo || '?'} 行“${segment.text}”存在跨行歧义，请先选择解释方案`);
            ambiguityError.code = 'CROSS_LINE_AMBIGUITY';
            ambiguityError.ambiguity = {
                type: 'cross_line_anchor',
                segmentLineNo,
                currentLineNo,
                segmentText,
                currentAnchorToken: anchorToken,
                currentAmount: amountText,
                options: [
                    {
                        id: 'standalone',
                        title: `方案1：第 ${segment.lineNo || '?'} 行独立录入`,
                        preview: `第 ${segment.lineNo || '?'} 行 => ${standalonePreview || implicitParsed.rewritten}\n第 ${currentLineNo} 行 => 保持原写法继续解析`,
                        replacements: segmentLineNo
                            ? [{ lineNo: segmentLineNo, text: implicitParsed.rewritten }]
                            : []
                    },
                    {
                        id: 'merge',
                        title: `方案2：第 ${segment.lineNo || '?'} 行并入第 ${currentLineNo} 行锚点`,
                        preview: `第 ${segment.lineNo || '?'} 行 => ${mergePreview || `${segmentText} + ${anchorToken}${amountText}`}\n第 ${currentLineNo} 行 => 保持原写法继续解析`,
                        replacements: segmentLineNo
                            ? [{ lineNo: segmentLineNo, text: mergeRewrite || segmentText.replace(/-/g, '.') }]
                            : []
                    }
                ]
            };
            throw ambiguityError;
        }

        return detachedEntries;
    }

    rewriteImplicitAmountLine(line) {
        const raw = String(line || '').trim();
        if (!raw) return '';
        if (!this.isMessageTypeWhitelistEnabled('implicit_amount_rewrite', this.activeRuleClientId || '')) {
            return raw;
        }
        if (this.containsConfiguredAnchor(raw)) return raw;
        const amountSuffixPattern = this.buildAmountSuffixPattern({ includeGeneric: true });
        const suffixChars = amountSuffixPattern
            ? `(?:${amountSuffixPattern}|[#*\`'"$￥¥,，。:：;；~～!！?？])*`
            : `[#*\`'"$￥¥,，。:：;；~～!！?？]*`;
        const match = raw.match(new RegExp(
            `^(.*?)(${this.getFlexibleAmountPatternSource()})\\s*(${suffixChars})$`,
            'u'
        ));
        if (!match) return raw;

        let prefix = this.normalizeImplicitPrefix(match[1]);
        if (!prefix) return raw;
        const amountToken = match[2];
        const suffix = match[3] || '';
        const normalizedAmountToken = String(amountToken || '').replace(/[．。]/g, '.');

        if (normalizedAmountToken.includes('.')) {
            return raw;
        }

        const explicitPrefixNumbers = this.safeExtractExplicitNumbers(prefix);
        const amountValue = this.safeParseAmountCandidate(amountToken);
        const hasAmountSuffixHint = !!this.matchConfiguredAmountSuffixAt(suffix, 0, { includeGeneric: true }) || /[#*￥¥]/.test(suffix);
        const hasAnchorHint = /[号肖数]$/.test(prefix);

        if (!hasAmountSuffixHint && !hasAnchorHint) {
            if (explicitPrefixNumbers.length > 1 && Number.isFinite(amountValue) && amountValue <= 49) {
                return raw;
            }
        }

        let anchorToken = '各';
        if (/号$/.test(prefix)) {
            anchorToken = '各号';
            prefix = prefix.slice(0, -1);
        } else if (/肖$/.test(prefix)) {
            anchorToken = '各肖';
            prefix = prefix.slice(0, -1);
        } else if (/数$/.test(prefix)) {
            anchorToken = '各数';
            prefix = prefix.slice(0, -1);
        }

        prefix = this.normalizeImplicitPrefix(prefix);
        if (!prefix || !this.hasPotentialBetTargets(prefix)) {
            return raw;
        }

        return `${prefix}${anchorToken}${amountToken}`;
    }

    normalizeImplicitPrefix(text) {
        const trimChars = this.getActiveAmountUnits().includes('闷')
            ? `[,，。；;:：~～\\-—./\\\\+=*#\`'"$￥¥\\s]+`
            : `[,，。；;:：~～\\-—./\\\\+=*#\`'"$￥¥闷\\s]+`;
        return String(text || '')
            .replace(new RegExp(`^${trimChars}`, 'g'), '')
            .replace(new RegExp(`${trimChars}$`, 'g'), '')
            .trim();
    }

    stripLeadingOcrPrefix(text) {
        const raw = String(text || '').trim();
        if (!raw) return '';
        return raw.replace(
            /^(?:0\d{2})\s*#\s*(?=(?:\d{1,2}[,，.．。/\-—]|[鼠牛虎兔龙蛇马羊猴鸡狗猪大小单双红蓝绿波头尾合门段]))/u,
            ''
        );
    }

    stripTrailingSummaryTail(text) {
        const raw = String(text || '').trim();
        if (!raw) return '';
        const amountPattern = this.buildAmountPatternWithOptionalSuffix({
            amountPattern: '[0-9０-９零〇一二两三四五六七八九十百千万]+',
            includeGeneric: false
        });
        const separatorPattern = this.getActiveAmountUnits().includes('闷')
            ? `[\\s,，。；;:：~～\\-—_=+/\\\\#*'"$￥¥!！?？]*`
            : `[\\s,，。；;:：~～\\-—_=+/\\\\#*'"$￥¥!！?？闷]*`;
        const tailRegex = new RegExp(`^(.*?)(?:${separatorPattern})(合计|总计|累计|总共|共|总|=)\\s*(${amountPattern})\\s*$`, 'u');
        const match = raw.match(tailRegex);
        if (!match) return raw;
        const body = String(match[1] || '').trim();
        const marker = String(match[2] || '').trim();
        if (marker === '=' && body && !this.containsConfiguredAnchor(body)) {
            return raw;
        }
        return body;
    }

    stripTrailingSummaryTailForSpecialPlay(text) {
        const raw = String(text || '').trim();
        if (!raw) return '';
        const amountPattern = this.buildAmountPatternWithOptionalSuffix({
            amountPattern: '[0-9０-９零〇一二两三四五六七八九十百千万]+',
            includeGeneric: false
        });
        const separatorPattern = this.getActiveAmountUnits().includes('闷')
            ? `[\\s,，。；;:：~～\\-—_=+/\\\\#*'"$￥¥!！?？]*`
            : `[\\s,，。；;:：~～\\-—_=+/\\\\#*'"$￥¥!！?？闷]*`;
        const tailRegex = new RegExp(`^(.*?)(?:${separatorPattern})(合计|总计|累计|总共|共|总|=)\\s*(${amountPattern})\\s*$`, 'u');
        const match = raw.match(tailRegex);
        if (!match) return raw;
        return String(match[1] || '').trim();
    }

    containsAmountCandidate(text) {
        return /[0-9０-９零〇一二两三四五六七八九十百千万]/.test(String(text || '').trim());
    }

    shouldKeepPendingSegment(text) {
        const raw = String(text || '').trim();
        if (!raw) return false;
        if (this.isIgnorableResidualSegment(raw)) return false;
        if (this.containsConfiguredAnchor(raw)) return true;
        if (this.hasPotentialBetTargets(raw)) return true;
        if (this.canParseImplicitSegmentText(raw)) return true;
        if (this.containsAmountUnitWithoutAnchor(raw)) return true;
        return false;
    }

    canParseImplicitSegmentText(text) {
        const pseudoSegment = {
            text: String(text || '').trim(),
            regionKey: this.getDefaultRegionKey(),
            lineNo: null,
            segmentNo: null
        };
        if (!pseudoSegment.text) return false;
        try {
            const parsedEntries = this.parseImplicitSegmentChunks(pseudoSegment);
            return Array.isArray(parsedEntries) && parsedEntries.length > 0;
        } catch (error) {
            return false;
        }
    }

    splitImplicitSegmentChunks(text) {
        const normalized = this.stripTrailingSummaryTail(text);
        if (!normalized) return [];
        const bulkEqualsChunks = this.extractBulkEqualsChunks(normalized);
        if (bulkEqualsChunks.length > 0) {
            return bulkEqualsChunks
                .map(item => this.normalizeImplicitPrefix(item))
                .filter(Boolean);
        }
        const menSplitPattern = this.getActiveAmountUnits().includes('闷')
            ? /(?:[。．，,；;:：~～\-_—=+#*\/\\]{2,})/
            : /(?:[。．，,；;:：~～\-_—=+#*\/\\]{2,}|闷+)/;
        return String(normalized)
            .split(menSplitPattern)
            .map(item => this.normalizeImplicitPrefix(item))
            .filter(Boolean);
    }

    extractBulkEqualsChunks(text) {
        if (!this.isMessageTypeWhitelistEnabled('bulk_equals_groups', this.activeRuleClientId || '')) {
            return [];
        }
        const raw = String(text || '').trim();
        if (!raw || this.containsConfiguredAnchor(raw)) return [];
        const chunkRegex = new RegExp(
            `\\d{1,2}\\s*(?:号|碼|码)?\\s*=\\s*${this.buildAmountPatternWithOptionalSuffix({ includeGeneric: true })}`,
            'gu'
        );
        const chunks = raw.match(chunkRegex) || [];
        if (chunks.length < 2) return [];
        const remainder = raw.replace(chunkRegex, '').replace(/[\s,，；;、]+/g, '');
        if (remainder) return [];
        return chunks;
    }

    parseSafeSingleNumberImplicitChunk(text) {
        if (!this.isMessageTypeWhitelistEnabled('single_number_amount_shorthand', this.activeRuleClientId || '')) {
            return null;
        }
        const raw = String(text || '').trim();
        if (!raw || this.containsConfiguredAnchor(raw)) return null;
        const normalized = raw
            .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248))
            .trim();
        if (!normalized) return null;
        const amountPattern = this.getImplicitShorthandAmountPatternSource();
        const suffixPattern = this.buildSafeSingleNumberSuffixPattern();
        const optionalSuffix = suffixPattern ? `(?:\\s*(${suffixPattern}))?` : '';
        const dottedRequiredSuffix = suffixPattern ? `\\s*(${suffixPattern})` : '';
        const primaryPattern = new RegExp(
            `^(\\d{1,2})\\s*(?:[-=/#*])\\s*(${amountPattern})${optionalSuffix}(?:[#*\`'"$￥¥]*)$`,
            'u'
        );
        const dottedUnitPattern = new RegExp(
            `^(\\d{1,2})\\s*[.．。]\\s*(${amountPattern})${dottedRequiredSuffix}(?:[#*\`'"$￥¥]*)$`,
            'u'
        );
        const match = normalized.match(primaryPattern) || normalized.match(dottedUnitPattern);
        if (!match) return null;
        const number = parseInt(match[1], 10);
        if (!this.validateNumber(number)) return null;
        const amountText = String(match[2] || '').trim();
        const amount = this.safeParseAmountCandidate(amountText);
        const unitToken = String(match[3] || '').trim();
        if (!Number.isFinite(amount)) return null;
        if (amount <= 49 && !unitToken) return null;
        return {
            number,
            amount,
            amountText,
            unitToken,
            rewritten: `${this.formatNumber(number)}各${amountText}`
        };
    }

    isSafeSingleNumberImplicitBoundary(ch) {
        return !ch || /[\s,，。；;:：~～!！?？]/.test(ch);
    }

    splitSegmentBySafeSingleNumberImplicitChunks(segment) {
        const rawText = String(segment && segment.text ? segment.text : '');
        if (!rawText.trim()) return [];
        const amountPattern = `(?:${this.getImplicitShorthandAmountPatternSource()})`;
        const suffixPattern = this.buildSafeSingleNumberSuffixPattern();
        const candidateRegex = new RegExp(
            `\\d{1,2}\\s*(?:(?:[-=/#*])\\s*${amountPattern}${suffixPattern ? `(?:\\s*(?:${suffixPattern}))?` : ''}|(?:[.．。])\\s*${amountPattern}${suffixPattern ? `\\s*(?:${suffixPattern})` : ''})(?:[#*\`'"$￥¥]*)`,
            'gu'
        );
        const parts = [];
        let cursor = 0;
        let matched = false;
        let match = null;
        while ((match = candidateRegex.exec(rawText)) !== null) {
            const startIndex = match.index;
            const endIndex = candidateRegex.lastIndex;
            const prevChar = startIndex > 0 ? rawText[startIndex - 1] : '';
            const nextChar = endIndex < rawText.length ? rawText[endIndex] : '';
            const candidateText = rawText.slice(startIndex, endIndex).trim();
            const parsedCandidate = this.parseSafeSingleNumberImplicitChunk(candidateText);
            const allowDigitContinuation = !!(
                parsedCandidate
                && parsedCandidate.unitToken
                && /[.．。]/.test(candidateText)
                && /[0-9０-９]/.test(nextChar)
            );
            if (!this.isSafeSingleNumberImplicitBoundary(prevChar) || (!this.isSafeSingleNumberImplicitBoundary(nextChar) && !allowDigitContinuation)) {
                continue;
            }
            if (!parsedCandidate) {
                continue;
            }
            if (startIndex > cursor) {
                parts.push({
                    ...segment,
                    text: rawText.slice(cursor, startIndex)
                });
            }
            parts.push({
                ...segment,
                text: candidateText,
                implicitKind: 'safe_single_number'
            });
            cursor = endIndex;
            matched = true;
        }
        if (!matched) {
            return [{ ...segment, text: rawText }];
        }
        if (cursor < rawText.length) {
            parts.push({
                ...segment,
                text: rawText.slice(cursor)
            });
        }
        return parts.filter(item => String(item && item.text ? item.text : '').trim());
    }

    countSafeSingleNumberImplicitGroups(text) {
        const parts = this.splitSegmentBySafeSingleNumberImplicitChunks({ text });
        return parts.filter(item => item && item.implicitKind === 'safe_single_number').length;
    }

    countLikelyBetAmountGroups(text) {
        const raw = this.stripLeadingOcrPrefix(
            this.stripTrailingSummaryTail(String(text || '').trim())
        );
        if (!raw) return 0;
        const anchorGroupCount = this.scanLineForAmountAnchors(raw).length;
        const safeSingleGroupCount = this.countSafeSingleNumberImplicitGroups(raw);
        const unknownAnchorGroupCount = this.findUnknownAnchorLikeTokens(raw)
            .reduce((sum, item) => sum + (Number.isFinite(Number(item && item.count)) ? Number(item.count) : 0), 0);
        return anchorGroupCount + safeSingleGroupCount + unknownAnchorGroupCount;
    }

    findAmbiguousSingleNumberImplicitChunks(text) {
        const raw = this.stripLeadingOcrPrefix(
            this.stripTrailingSummaryTail(String(text || '').trim())
        );
        if (!raw) return [];
        if (this.extractBulkEqualsChunks(raw).length > 0) {
            return [];
        }
        const amountPattern = `(?:${this.getImplicitShorthandAmountPatternSource()})`;
        const candidateRegex = new RegExp(
            `\\d{1,2}\\s*(?:[-=/#*])\\s*${amountPattern}(?:[#*\`'"$￥¥]*)`,
            'gu'
        );
        const ambiguous = [];
        let match = null;
        while ((match = candidateRegex.exec(raw)) !== null) {
            const startIndex = match.index;
            const endIndex = candidateRegex.lastIndex;
            const prevChar = startIndex > 0 ? raw[startIndex - 1] : '';
            const nextChar = endIndex < raw.length ? raw[endIndex] : '';
            if (!this.isSafeSingleNumberImplicitBoundary(prevChar) || !this.isSafeSingleNumberImplicitBoundary(nextChar)) {
                continue;
            }
            const candidateText = raw.slice(startIndex, endIndex).trim();
            if (this.parseSafeSingleNumberImplicitChunk(candidateText)) continue;
            if (this.isLikelyNumberPairBeforeExplicitAnchor(raw, startIndex, endIndex)) continue;
            const normalized = candidateText
                .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248))
                .trim();
            const parsed = normalized.match(new RegExp(`^(\\d{1,2})\\s*(?:[-=/#*])\\s*(${amountPattern})$`, 'u'));
            if (!parsed) continue;
            const number = parseInt(parsed[1], 10);
            const amount = this.safeParseAmountCandidate(parsed[2]);
            if (!this.validateNumber(number)) continue;
            if (!Number.isFinite(amount) || amount > 49) continue;
            ambiguous.push({
                text: candidateText,
                number,
                amount
            });
        }
        return ambiguous;
    }

    isLikelyNumberPairBeforeExplicitAnchor(rawText, startIndex, endIndex) {
        if (!this.isMessageTypeWhitelistEnabled('number_pair_with_explicit_anchor', this.activeRuleClientId || '')) {
            return false;
        }
        const raw = String(rawText || '');
        if (!raw) return false;
        const anchorMatches = this.scanLineForAmountAnchors(raw);
        if (!Array.isArray(anchorMatches) || anchorMatches.length === 0) return false;
        const nextAnchor = anchorMatches.find((item) => Number(item && item.startIndex) >= endIndex);
        if (!nextAnchor) return false;
        const gapText = raw.slice(endIndex, nextAnchor.startIndex);
        if (gapText && !/^[\s,，；;]*$/u.test(gapText)) {
            return false;
        }
        const previousAnchors = anchorMatches.filter((item) => Number(item && item.endIndex) <= startIndex);
        const segmentStart = previousAnchors.length > 0
            ? Number(previousAnchors[previousAnchors.length - 1].endIndex)
            : 0;
        const targetPrefix = raw.slice(segmentStart, nextAnchor.startIndex).trim();
        if (!targetPrefix) return false;
        const strippedTargetPrefix = this.stripConfiguredAmountTokens(targetPrefix, { includeGeneric: true });
        if (strippedTargetPrefix !== targetPrefix) return false;
        const explicitNumbers = this.safeExtractExplicitNumbers(targetPrefix);
        return explicitNumbers.length >= 2;
    }

    assertNoUnknownAnchorLikeTokens(text, lineNo) {
        const unknownTokens = this.findUnknownAnchorLikeTokens(text);
        if (unknownTokens.length === 0) return;
        const detail = unknownTokens
            .map(item => `${item.token}${item.count > 1 ? `（${item.count}次）` : ''}`)
            .join('、');
        const error = new Error(`第 ${lineNo} 行检测到未配置锚点：${detail}`);
        error.code = 'UNKNOWN_ANCHOR_TOKEN';
        error.unknownAnchorTokens = unknownTokens;
        throw error;
    }

    findCompositeStructuredTokens(text) {
        const compact = String(text || '')
            .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248))
            .replace(/[^0-9A-Za-z\u4e00-\u9fa5]/g, '');
        if (!compact) return [];
        const attrMap = this.getAttributeMap();
        const matched = [];
        let index = 0;
        while (index < compact.length) {
            const compositeMatch = this.matchCompositeWaveToken(compact, index, attrMap)
                || this.matchCompositeHeadToken(compact, index, attrMap)
                || null;
            if (!compositeMatch || !compositeMatch.item || !compositeMatch.item.key) {
                index += 1;
                continue;
            }
            matched.push(compositeMatch.item.key);
            index += Math.max(compositeMatch.length, 1);
        }
        return Array.from(new Set(matched));
    }

    assertNoDisabledCompositeAttributeShorthand(text, lineNo) {
        if (this.isMessageTypeWhitelistEnabled('composite_attribute_shorthand', this.activeRuleClientId || '')) {
            return;
        }
        const tokens = this.findCompositeStructuredTokens(text);
        if (tokens.length === 0) return;
        const detail = tokens.join('、');
        const error = new Error(`第 ${lineNo} 行检测到组合属性 shorthand：${detail}，当前已在消息类型白名单中关闭`);
        error.code = 'DISABLED_COMPOSITE_ATTRIBUTE_SHORTHAND';
        error.compositeTokens = tokens;
        throw error;
    }

    assertNoAmountGroupConflict(lineText, recognizedGroupCount, lineNo) {
        const apparentGroupCount = this.countLikelyBetAmountGroups(lineText);
        if (apparentGroupCount <= 1) return;
        if (recognizedGroupCount >= apparentGroupCount) return;
        const error = new Error(`第 ${lineNo} 行检测到 ${apparentGroupCount} 组金额，但当前只识别出 ${recognizedGroupCount} 组录入条目，已阻止自动入账`);
        error.code = 'AMOUNT_GROUP_CONFLICT';
        error.apparentGroupCount = apparentGroupCount;
        error.recognizedGroupCount = recognizedGroupCount;
        throw error;
    }

    assertNoAmbiguousSingleNumberShorthand(text, lineNo) {
        const ambiguous = this.findAmbiguousSingleNumberImplicitChunks(text);
        if (ambiguous.length === 0) return;
        const detail = ambiguous
            .map(item => `${item.text}`)
            .join('、');
        const error = new Error(`第 ${lineNo} 行检测到歧义简写：${detail}，缺少明确金额单位或高额特征，已阻止自动入账`);
        error.code = 'AMBIGUOUS_SINGLE_NUMBER_SHORTHAND';
        error.ambiguousChunks = ambiguous;
        throw error;
    }

    safeParseAmountCandidate(token) {
        try {
            return this.parseFlexibleAmount(token);
        } catch (error) {
            return NaN;
        }
    }

    safeExtractExplicitNumbers(text) {
        try {
            return this.extractExplicitNumbers(text);
        } catch (error) {
            return [];
        }
    }

    maskStructuredNumericTokensForExplicitExtraction(text) {
        const raw = String(text || '');
        if (!raw) return '';
        let masked = raw.replace(/[0-4０-４]{2,}头/gu, ' ');
        const attrKeys = Object.keys(this.getAttributeMap())
            .filter(key => /[0-9０-９]/.test(String(key || '')) && /[\u4e00-\u9fa5A-Za-z]/.test(String(key || '')))
            .sort((a, b) => b.length - a.length);
        if (attrKeys.length === 0) return masked;
        attrKeys.forEach((key) => {
            const pattern = new RegExp(this.escapeRegex(key), 'gu');
            masked = masked.replace(pattern, ' ');
        });
        return masked;
    }

    hasPotentialBetTargets(text) {
        const normalized = this.normalizeSegmentText(text);
        if (!normalized) return false;

        const withoutRegion = normalized.replace(this.getRegionMarkerRegex(true), '');
        const candidate = withoutRegion || normalized;
        if (!candidate.trim()) return false;

        if (this.safeExtractExplicitNumbers(candidate).length > 0) {
            return true;
        }
        if (this.extractAnimalTokens(candidate).length > 0) {
            return true;
        }
        return this.extractStructuredTokenMatches(candidate).length > 0;
    }

    compactPendingSegments(pendingSegments) {
        if (!Array.isArray(pendingSegments) || pendingSegments.length === 0) return;
        const compacted = pendingSegments.filter(segment => !this.isIgnorableResidualSegment(segment && segment.text));
        pendingSegments.length = 0;
        pendingSegments.push(...compacted);
    }

    isIgnorableResidualSegment(text) {
        const compact = String(text || '').replace(/\s+/g, '');
        if (!compact) return true;
        if (this.matchesConfiguredNoiseRule(String(text || '').trim())) return true;
        if (this.isSummaryLine(compact)) return true;
        const withoutRegionMarker = compact.replace(this.getRegionMarkerRegex(true), '').trim();
        if (compact && withoutRegionMarker.length === 0) return true;
        if (/[0-9０-９零〇一二两三四五六七八九十百千万]/.test(compact)) return false;
        if (this.extractAnimalTokens(compact).length > 0) return false;
        if (this.extractStructuredTokenMatches(compact).length > 0) return false;
        const ignoredTokens = Object.entries(this.getMergedAnchorAliasMap())
            .filter(([, mode]) => mode === 'ignore')
            .map(([token]) => token)
            .sort((a, b) => b.length - a.length);
        let normalized = compact;
        ignoredTokens.forEach(token => {
            if (!token) return;
            normalized = normalized.split(token).join('');
        });
        normalized = this.stripConfiguredAmountTokens(normalized, { includeGeneric: true });
        const stripped = normalized.replace(/[号碼码各买肖数子每个注闷#*`'"$￥¥.,，。:：;；~～\-—_=+\/\\!！?？@\[\]]/g, '');
        return stripped.length === 0;
    }

    containsAmountUnitWithoutAnchor(line) {
        const normalized = String(line || '').trim();
        if (!normalized) return false;
        if (this.containsConfiguredAnchor(normalized)) return false;
        const suffixPattern = this.buildAmountSuffixPattern({ includeGeneric: true });
        if (!suffixPattern) return false;
        return new RegExp(
            `(?:[0-9０-９]+(?:[.．。][0-9０-９]+)?|[零〇一二两三四五六七八九十百千万]+)\\s*(?:${suffixPattern})`,
            'u'
        ).test(normalized);
    }

    isSummaryLine(line) {
        const normalized = String(line || '')
            .replace(/[，。；;,.]/g, '')
            .replace(/\s+/g, '')
            .trim();
        if (!normalized) return true;
        return new RegExp(
            `^(?:合计|总计|累计|总共|共|总|=)[:：=]?${this.buildAmountPatternWithOptionalSuffix({
                amountPattern: '[0-9０-９零〇一二两三四五六七八九十百千万]+',
                includeGeneric: false
            })}$`,
            'u'
        ).test(normalized);
    }

    isIgnorableStandaloneLine(line) {
        const normalized = String(line || '').trim();
        if (!normalized) return true;
        if (this.matchesConfiguredNoiseRule(normalized)) return true;
        if (this.isSummaryLine(normalized)) return true;
        if (/^\[[^\]]+\]$/u.test(normalized)) return true;
        if (/^@[^\s]+$/u.test(normalized)) return true;
        const withoutRegion = normalized.replace(this.getRegionMarkerRegex(true), '').trim();
        if (!withoutRegion) return true;
        if (this.containsConfiguredAnchor(withoutRegion)) return false;
        if (this.hasPotentialBetTargets(withoutRegion)) return false;
        if (this.containsAmountCandidate(withoutRegion)) return false;
        return /^[A-Za-z\u4e00-\u9fa5]+$/u.test(withoutRegion);
    }

    resolveAnchorRule(anchorToken) {
        const normalized = this.normalizeAnchorAliasToken(anchorToken);
        const activeClientId = this.normalizeRuleClientId(this.activeRuleClientId || '');
        const systemAnchors = (this.getSystemRuleProfile() || {}).anchorSemantics || {};
        const globalAnchors = (this.getResolvedGlobalRuleProfile() || {}).anchorSemantics || {};
        const clientAnchors = activeClientId && this.clientRuleProfiles && this.clientRuleProfiles[activeClientId]
            ? (this.clientRuleProfiles[activeClientId].anchorSemantics || {})
            : {};
        const source = Object.prototype.hasOwnProperty.call(clientAnchors, normalized)
            ? 'client'
            : (Object.prototype.hasOwnProperty.call(globalAnchors, normalized)
                ? 'global'
                : (Object.prototype.hasOwnProperty.call(systemAnchors, normalized) ? 'system' : 'inferred'));
        const activeAnchors = (this.getActiveRuleProfile() || {}).anchorSemantics || {};
        const configuredRule = activeAnchors[normalized];
        const defaultOdds = this.getActiveDefaultOdds();
        if (configuredRule && configuredRule.enabled === false) {
            return {
                token: normalized,
                source,
                mode: 'ignore',
                odds: defaultOdds,
                hasCustomOdds: Number.isFinite(this.normalizeOddsValue(configuredRule.odds)),
                defaultOdds
            };
        }
        let mode = 'per_number';
        if (configuredRule) {
            const configuredMode = this.normalizeAmountDistributeValue(configuredRule.amountDistribute);
            if (configuredMode) {
                mode = configuredMode;
            }
        } else if (normalized.includes('肖')) {
            mode = 'per_target_equal_split';
        }
        const oddsOverride = this.normalizeOddsValue(configuredRule && configuredRule.odds);
        return {
            token: normalized,
            source,
            mode,
            odds: Number.isFinite(oddsOverride) ? oddsOverride : defaultOdds,
            hasCustomOdds: Number.isFinite(oddsOverride),
            defaultOdds
        };
    }

    resolveAnchorMode(anchorToken) {
        return this.resolveAnchorRule(anchorToken).mode;
    }

    buildEntriesFromPendingSegments(pendingSegments, amount, lineNo, anchorToken = '各') {
        const displayLineNo = Number.isInteger(parseInt(lineNo, 10)) ? parseInt(lineNo, 10) : '?';
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error(`第 ${displayLineNo} 行数值无效`);
        }

        const anchorRule = this.resolveAnchorRule(anchorToken);
        const anchorMode = this.normalizeAmountDistributeValue(anchorRule.mode) || 'per_number';
        const normalizedAnchorToken = this.normalizeAnchorAliasToken(anchorToken);
        if (anchorMode === 'undetermined') {
            const activeClientId = this.normalizeRuleClientId(this.activeRuleClientId || '');
            const preferredScope = anchorRule.source === 'client' && activeClientId ? 'client' : 'global';
            const ambiguityError = new Error(`第 ${displayLineNo} 行锚点词「${normalizedAnchorToken || anchorToken}」分配策略未确定，请先选择策略`);
            ambiguityError.code = 'UNDETERMINED_ANCHOR_MODE';
            ambiguityError.ambiguity = {
                type: 'anchor_mode_undetermined',
                lineNo: displayLineNo,
                anchorToken: normalizedAnchorToken || String(anchorToken || '').trim(),
                source: anchorRule.source || 'global',
                scope: preferredScope,
                clientId: preferredScope === 'client' ? activeClientId : '',
                amount: this.formatAmount(amount),
                options: [
                    {
                        id: 'per_number',
                        title: '方案1：每个号码录入金额',
                        preview: '同一锚点命中的每个号码都按该金额计。例：猴蛇狗各10 => 每个命中号码都是10。'
                    },
                    {
                        id: 'per_target_equal_split',
                        title: '方案2：每个目标组录入金额（组内平分）',
                        preview: '每个目标组先拿到金额，再均分到该组号码。例：猴蛇狗各肖10 => 每个肖各10，组内平分。'
                    },
                    {
                        id: 'per_entry_equal_split',
                        title: '方案3：本段总金额平分到全部号码',
                        preview: '该段金额作为总额，平分到全部命中号码。例：猴蛇狗平摊10 => 全部命中号平分10。'
                    }
                ]
            };
            throw ambiguityError;
        }
        const odds = this.normalizeOddsValue(anchorRule.odds, this.getActiveDefaultOdds());
        const builtEntries = [];
        pendingSegments.forEach(segment => {
            let segmentEntries = [];
            try {
                segmentEntries = this.buildEntriesFromSegment(segment, amount, anchorMode, lineNo);
            } catch (error) {
                const text = error && error.message ? String(error.message) : '格式无法识别';
                if (/^第\s*\d+\s*行/.test(text)) {
                    throw error;
                }
                throw new Error(`第 ${segment.lineNo || lineNo} 行${text}`);
            }
            segmentEntries.forEach(item => {
                builtEntries.push({
                    regionKey: segment.regionKey,
                    amount: item.amount,
                    numbers: item.numbers,
                    lineNo: segment.lineNo || lineNo,
                    segmentNo: segment.segmentNo || null,
                    anchorToken: normalizedAnchorToken,
                    anchorMode,
                    odds
                });
            });
        });

        if (builtEntries.length === 0) {
            throw new Error(`第 ${displayLineNo} 行未找到有效号码`);
        }

        return builtEntries;
    }

    buildEntriesFromSegment(segment, amount, anchorMode, lineNo) {
        const text = String(segment && segment.text ? segment.text : '').trim();
        if (!text) return [];

        const normalizedMode = this.normalizeAmountDistributeValue(anchorMode) || 'per_number';

        if (normalizedMode === 'per_target_equal_split') {
            const groups = this.extractTargetGroups(text);
            if (groups.length === 0) {
                throw new Error(`第 ${lineNo} 行“各肖/每肖”前未找到可识别目标`);
            }
            return groups.map(group => ({
                numbers: group,
                amount: amount / group.length
            }));
        }

        const numbers = this.extractNumbers(text, {
            preserveDuplicates: normalizedMode === 'per_number'
        });
        if (numbers.length === 0) return [];
        if (normalizedMode === 'per_entry_equal_split') {
            return [{
                numbers,
                amount: amount / numbers.length
            }];
        }
        return [{
            numbers,
            amount
        }];
    }

    getRegionMarkerRegex(global = false) {
        // 单字地区词仅在“像地区的位置”生效：行首/分隔符后 + 分隔符/数字/行尾前。
        // 这样可避免“老虎”“新单”等普通词被误识别为地区标记。
        const aliasMap = this.getActiveRegionAliasMap();
        const tokens = [];
        Object.entries(aliasMap).forEach(([regionKey, aliases]) => {
            (Array.isArray(aliases) ? aliases : []).forEach((alias) => {
                const token = this.normalizeRegionAliasToken(alias);
                if (!token) return;
                tokens.push(token);
            });
        });
        const uniqueTokens = Array.from(new Set(tokens)).sort((a, b) => b.length - a.length);
        const singleTokens = uniqueTokens.filter(token => token.length === 1);
        const multiTokens = uniqueTokens.filter(token => token.length > 1);
        const parts = [];
        if (multiTokens.length > 0) {
            parts.push(`(?:${multiTokens.map(token => this.escapeRegex(token)).join('|')})`);
        }
        if (singleTokens.length > 0) {
            parts.push(`(?:(?<=^)|(?<=[\\s:：,，.。;；\\-—/~～]))(?:${singleTokens.map(token => this.escapeRegex(token)).join('|')})(?=[\\s:：,，.。;；\\-—/~～0-9０-９]|$)`);
        }
        const pattern = parts.length > 0 ? parts.join('|') : '(?!)';
        return new RegExp(pattern, global ? 'g' : '');
    }

    splitTextByRegion(text, initialRegion = 'new_ao', lineNo = null) {
        const markerRegex = this.getRegionMarkerRegex(true);
        const segments = [];
        let currentRegion = initialRegion || 'new_ao';
        let containsRegionMarker = false;
        let cursor = 0;
        let match = null;

        while ((match = markerRegex.exec(text)) !== null) {
            containsRegionMarker = true;
            const left = this.normalizeSegmentText(text.slice(cursor, match.index));
            if (left) {
                segments.push({ text: left, regionKey: currentRegion, lineNo });
            }
            const matchedToken = String(match[0] || '').trim();
            currentRegion = this.resolveRegionFromToken(matchedToken, currentRegion);
            cursor = match.index + matchedToken.length;
        }

        const tail = this.normalizeSegmentText(text.slice(cursor));
        if (tail) {
            segments.push({ text: tail, regionKey: currentRegion, lineNo });
        }

        return { segments, currentRegion, containsRegionMarker };
    }

    normalizeSegmentText(text) {
        const raw = this.stripLeadingOcrPrefix(
            this.stripTrailingSummaryTail(String(text || '').trim())
        );
        if (!raw) return '';
        if (this.isIgnorableResidualSegment(raw)) return '';
        const trimChars = this.getActiveAmountUnits().includes('闷')
            ? `[,，。；;:：~～\\-—#*\`'"$￥¥!！?？_=+@[\\]/\\\\\\s]+`
            : `[,，。；;:：~～\\-—#*\`'"$￥¥!！?？_=+@[\\]/\\\\闷\\s]+`;
        const trimmed = raw
            .replace(new RegExp(`^${trimChars}`, 'g'), '')
            .replace(new RegExp(`${trimChars}$`, 'g'), '')
            .trim();
        if (!trimmed) return '';
        if (this.isIgnorableResidualSegment(trimmed)) return '';
        // 纯符号残片（如单独一个“，”）直接忽略。
        if (!/[\d０-９A-Za-z\u4e00-\u9fa5]/.test(trimmed)) return '';
        return trimmed;
    }

    resolveRegionFromToken(token, fallback = 'new_ao', options = {}) {
        const normalizedToken = this.normalizeRegionAliasToken(token);
        if (!normalizedToken) return fallback == null ? 'new_ao' : fallback;
        const aliasMap = options && options.systemOnly
            ? this.getSystemRegionAliasMap()
            : this.getActiveRegionAliasMap();
        if ((aliasMap.old_ao || []).includes(normalizedToken)) return 'old_ao';
        if ((aliasMap.hongkong || []).includes(normalizedToken)) return 'hongkong';
        if ((aliasMap.new_ao || []).includes(normalizedToken)) return 'new_ao';
        return fallback == null ? 'new_ao' : fallback;
    }

    getDefaultRegionKey() {
        const activeProfile = this.getActiveRuleProfile();
        const regionPolicy = activeProfile && activeProfile.regionPolicy ? activeProfile.regionPolicy : {};
        return this.normalizeRegionKey(regionPolicy.defaultRegion, 'new_ao');
    }

    getEffectiveRegionAccountingInfo(clientId = '') {
        const effectiveProfile = clientId
            ? this.getEffectiveRuleProfile(clientId)
            : this.getActiveRuleProfile();
        const regionPolicy = effectiveProfile && effectiveProfile.regionPolicy ? effectiveProfile.regionPolicy : {};
        const defaultRegion = this.normalizeRegionKey(regionPolicy.defaultRegion, 'new_ao');
        const separateStatsByRegion = regionPolicy.separateStatsByRegion !== false;
        return {
            mode: separateStatsByRegion ? 'split' : 'merged',
            separateStatsByRegion,
            defaultRegion,
            defaultRegionLabel: this.getRegionLabelByKey(defaultRegion),
            regionAliases: this.getEffectiveRegionAliasMap(clientId || ''),
            canonicalAlwaysShowRegion: regionPolicy.canonicalAlwaysShowRegion !== false
        };
    }

    resolveEntryAccountingInfo(entryRegionKey, options = {}) {
        const accountingInfo = options && options.accountingInfo
            ? options.accountingInfo
            : this.getEffectiveRegionAccountingInfo(options && options.clientId ? options.clientId : '');
        const defaultRegion = this.normalizeRegionKey(
            accountingInfo && accountingInfo.defaultRegion ? accountingInfo.defaultRegion : '',
            'new_ao'
        );
        const parsedRegionKey = this.normalizeRegionKey(entryRegionKey, defaultRegion);
        const separateStatsByRegion = !(accountingInfo && accountingInfo.separateStatsByRegion === false);
        const accountingRegionKey = separateStatsByRegion ? parsedRegionKey : defaultRegion;
        return {
            mode: separateStatsByRegion ? 'split' : 'merged',
            separateStatsByRegion,
            defaultRegion,
            parsedRegionKey,
            parsedRegionLabel: this.getRegionLabelByKey(parsedRegionKey),
            accountingRegionKey,
            accountingRegionLabel: this.getRegionLabelByKey(accountingRegionKey)
        };
    }

    parseFlexibleAmount(token) {
        const raw = String(token || '').trim();
        if (!raw) {
            throw new Error('缺少数值');
        }

        const normalizedDigits = raw
            .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248))
            .replace(/[．。]/g, '.');
        if (/^\d+(?:\.\d+)?$/.test(normalizedDigits)) {
            const amount = parseFloat(normalizedDigits);
            if (Number.isFinite(amount) && amount > 0) {
                return amount;
            }
            throw new Error(`无效数值: ${token}`);
        }

        const chineseNumber = this.normalizeColloquialChineseAmount(
            normalizedDigits.replace(/[^零〇一二两三四五六七八九十百千万]/g, '')
        );
        const parsedChinese = this.chineseToNumber(chineseNumber);
        if (Number.isFinite(parsedChinese) && parsedChinese > 0) {
            return parsedChinese;
        }
        throw new Error(`无效数值: ${token}`);
    }

    normalizeColloquialChineseAmount(chinese) {
        const raw = String(chinese || '').trim();
        if (!raw) return '';
        const digitPattern = '[一二两三四五六七八九]';
        const rules = [
            { pattern: new RegExp(`(${digitPattern})万(${digitPattern})(?![千百十零〇一二两三四五六七八九])`, 'gu'), replacement: '$1万$2千' },
            { pattern: new RegExp(`(${digitPattern})千(${digitPattern})(?![百十零〇一二两三四五六七八九])`, 'gu'), replacement: '$1千$2百' },
            { pattern: new RegExp(`(${digitPattern})百(${digitPattern})(?![十零〇一二两三四五六七八九])`, 'gu'), replacement: '$1百$2十' }
        ];

        let normalized = raw;
        let previous = '';
        while (normalized !== previous) {
            previous = normalized;
            rules.forEach(rule => {
                normalized = normalized.replace(rule.pattern, rule.replacement);
            });
        }
        return normalized;
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

    extractNumbers(text, options = {}) {
        const preserveDuplicates = !!options.preserveDuplicates;
        return this.extractNumbersByPolicy(text, {
            preserveDuplicates,
            combinePolicy: this.getActiveRuleProfile().attributeCombinePolicy || 'intersection_then_union_fallback'
        });
    }

    extractNumbersByPolicy(text, options = {}) {
        const preserveDuplicates = !!options.preserveDuplicates;
        const combinePolicyRaw = String(options.combinePolicy || this.getActiveRuleProfile().attributeCombinePolicy || 'intersection_then_union_fallback').trim();
        const combinePolicy = this.getAllowedAttributeCombinePolicyValues().includes(combinePolicyRaw)
            ? combinePolicyRaw
            : 'intersection_then_union_fallback';

        const explicitNumbers = this.extractExplicitNumbers(
            this.maskStructuredNumericTokensForExplicitExtraction(text)
        );
        const tokenMatches = this.extractStructuredTokenMatches(text);
        const hasStructuredTargets = tokenMatches.some(item => Array.isArray(item && item.numbers) && item.numbers.length > 0);

        // 业务规则：显性号码和属性词同时出现时按“叠加”处理，不做交并集，也不去重。
        if (explicitNumbers.length > 0 && hasStructuredTargets) {
            return this.buildExplicitAndStructuredAdditiveNumbers(explicitNumbers, tokenMatches);
        }

        const components = [];
        const explicitUnique = Array.from(new Set(explicitNumbers));
        if (explicitUnique.length > 0) {
            components.push(explicitUnique);
        }
        tokenMatches.forEach(item => {
            if (Array.isArray(item.numbers) && item.numbers.length > 0) {
                components.push(Array.from(new Set(item.numbers)));
            }
        });

        if (components.length === 0) return [];
        if (components.length === 1) {
            if (preserveDuplicates && explicitNumbers.length > 0) {
                const withTokens = explicitNumbers.slice();
                const mergedSet = new Set(withTokens);
                components[0].forEach(num => {
                    if (!mergedSet.has(num)) withTokens.push(num);
                });
                return withTokens;
            }
            return components[0].slice();
        }

        const mergeUnion = () => {
            const merged = [];
            const mergedSet = new Set();
            components.forEach(component => {
                component.forEach(num => {
                    if (mergedSet.has(num)) return;
                    mergedSet.add(num);
                    merged.push(num);
                });
            });
            return merged;
        };

        const mergeIntersection = () => {
            let merged = components[0].slice();
            for (let i = 1; i < components.length; i += 1) {
                const nextSet = new Set(components[i]);
                merged = merged.filter(num => nextSet.has(num));
            }
            return merged;
        };

        if (combinePolicy === 'union') {
            return mergeUnion();
        }
        if (combinePolicy === 'intersection') {
            return mergeIntersection();
        }
        if (combinePolicy === 'confirm') {
            const intersection = mergeIntersection();
            const union = mergeUnion();
            if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
                const chooseIntersection = window.confirm('该段同时命中多个属性词。点击“确定”取共同号，点击“取消”按全部叠加。');
                return chooseIntersection ? intersection : union;
            }
            throw new Error('该网友“属性词叠加策略”为确认模式，请先确认本段是取共同号还是全部叠加');
        }

        const intersection = mergeIntersection();
        if (intersection.length > 0) {
            return intersection;
        }
        return mergeUnion();
    }

    extractTargetGroups(text) {
        const groups = [];
        const tokenMatches = this.extractStructuredTokenMatches(text);
        const explicitNumbers = this.extractExplicitNumbers(
            this.maskStructuredNumericTokensForExplicitExtraction(text)
        );
        explicitNumbers.forEach(num => {
            if (!this.validateNumber(num)) return;
            groups.push([num]);
        });
        tokenMatches.forEach(item => {
            const numbers = Array.isArray(item.numbers)
                ? Array.from(new Set(item.numbers.filter(num => this.validateNumber(num))))
                : [];
            if (numbers.length > 0) {
                groups.push(numbers);
            }
        });

        return groups;
    }

    extractAnimalTokens(text) {
        const compact = String(text || '').replace(/[^鼠牛虎兔龙蛇马羊猴鸡狗猪]/g, '');
        return compact ? compact.split('') : [];
    }

    extractExplicitNumbers(text) {
        const normalized = String(text || '')
            .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248));
        const runs = normalized.match(/\d+/g) || [];
        const numbers = [];
        runs.forEach(run => {
            numbers.push(...this.decodeDigitRun(run));
        });
        return numbers;
    }

    decodeDigitRun(run) {
        const token = String(run || '').trim();
        if (!token) return [];

        if (token.length <= 2) {
            const num = parseInt(token, 10);
            if (!this.validateNumber(num)) {
                throw new Error(`无效的数字: ${token}`);
            }
            return [num];
        }

        if (token.length % 2 !== 0) {
            throw new Error(`号码输入不完整: ${token}`);
        }

        const numbers = [];
        for (let i = 0; i < token.length; i += 2) {
            const pair = token.slice(i, i + 2);
            const num = parseInt(pair, 10);
            if (!this.validateNumber(num)) {
                throw new Error(`无效的数字: ${pair}`);
            }
            numbers.push(num);
        }
        return numbers;
    }

    buildStructuredNumbers(rawNumbers) {
        const numbers = [];
        const seen = new Set();
        (Array.isArray(rawNumbers) ? rawNumbers : []).forEach(num => {
            if (!this.validateNumber(num) || seen.has(num)) return;
            seen.add(num);
            numbers.push(num);
        });
        return numbers;
    }

    mergeStructuredNumberGroups(groups) {
        const merged = [];
        const seen = new Set();
        (Array.isArray(groups) ? groups : []).forEach(group => {
            (Array.isArray(group) ? group : []).forEach(num => {
                if (!this.validateNumber(num) || seen.has(num)) return;
                seen.add(num);
                merged.push(num);
            });
        });
        return merged.sort((a, b) => a - b);
    }

    buildExplicitAndStructuredAdditiveNumbers(explicitNumbers, tokenMatches) {
        const merged = [];
        (Array.isArray(explicitNumbers) ? explicitNumbers : []).forEach(num => {
            const parsed = parseInt(num, 10);
            if (!this.validateNumber(parsed)) return;
            merged.push(parsed);
        });
        (Array.isArray(tokenMatches) ? tokenMatches : []).forEach(item => {
            (Array.isArray(item && item.numbers) ? item.numbers : []).forEach(num => {
                const parsed = parseInt(num, 10);
                if (!this.validateNumber(parsed)) return;
                merged.push(parsed);
            });
        });
        return merged;
    }

    matchCompositeWaveToken(compact, index, attrMap) {
        const colorChars = [];
        let cursor = index;
        while (cursor < compact.length && /[红蓝绿]/u.test(compact[cursor])) {
            colorChars.push(compact[cursor]);
            cursor += 1;
        }
        if (colorChars.length < 2) return null;

        const orderedColors = [];
        const seenColors = new Set();
        colorChars.forEach(color => {
            if (seenColors.has(color)) return;
            seenColors.add(color);
            orderedColors.push(color);
        });
        if (orderedColors.length < 2) return null;

        let suffix = '';
        if (compact[cursor] === '波') {
            suffix = '波';
            cursor += 1;
        }

        const keys = orderedColors
            .map(color => `${color}波`)
            .filter(key => Array.isArray(attrMap[key]) && attrMap[key].length > 0);
        if (keys.length < 2) return null;

        return {
            length: cursor - index,
            item: {
                key: `${orderedColors.join('')}${suffix}`,
                numbers: this.mergeStructuredNumberGroups(keys.map(key => attrMap[key])),
                compositeGroup: 'wave',
                compositeMembers: keys.slice()
            }
        };
    }

    matchCompositeHeadToken(compact, index, attrMap) {
        const headMatch = compact.slice(index).match(/^([0-4]{2,})头/u);
        if (!headMatch) return null;

        const orderedDigits = [];
        const seenDigits = new Set();
        headMatch[1].split('').forEach(digit => {
            if (seenDigits.has(digit)) return;
            seenDigits.add(digit);
            orderedDigits.push(digit);
        });
        if (orderedDigits.length < 2) return null;

        const keys = orderedDigits
            .map(digit => `${digit}头`)
            .filter(key => Array.isArray(attrMap[key]) && attrMap[key].length > 0);
        if (keys.length < 2) return null;

        return {
            length: headMatch[0].length,
            item: {
                key: `${orderedDigits.join('')}头`,
                numbers: this.mergeStructuredNumberGroups(keys.map(key => attrMap[key])),
                compositeGroup: 'head',
                compositeMembers: keys.slice()
            }
        };
    }

    matchCompositeStructuredToken(compact, index, attrMap) {
        if (!this.isMessageTypeWhitelistEnabled('composite_attribute_shorthand', this.activeRuleClientId || '')) {
            return null;
        }
        return this.matchCompositeWaveToken(compact, index, attrMap)
            || this.matchCompositeHeadToken(compact, index, attrMap)
            || null;
    }

    extractStructuredTokenMatches(text) {
        const attrMap = this.getAttributeMap();
        const attrKeys = Object.keys(attrMap).sort((a, b) => b.length - a.length);
        const compact = String(text || '')
            .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248))
            .replace(/[^0-9A-Za-z\u4e00-\u9fa5]/g, '');
        const matches = [];
        let i = 0;

        while (i < compact.length) {
            const compositeMatch = this.matchCompositeStructuredToken(compact, i, attrMap);
            if (compositeMatch && compositeMatch.item && Array.isArray(compositeMatch.item.numbers) && compositeMatch.item.numbers.length > 0) {
                matches.push(compositeMatch.item);
                i += compositeMatch.length;
                continue;
            }

            let matched = false;
            for (const key of attrKeys) {
                if (!compact.startsWith(key, i)) continue;
                const numbers = this.buildStructuredNumbers(attrMap[key]);
                if (numbers.length > 0) {
                    matches.push({ key, numbers });
                }
                i += key.length;
                matched = true;
                break;
            }

            if (matched) continue;

            const ch = compact[i];
            if (this.animalMap[ch]) {
                matches.push({ key: ch, numbers: this.animalMap[ch].slice() });
            }
            i += 1;
        }

        return matches;
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
        const anchorPattern = this.buildAnchorTokenPattern();
        const normalized = amountPart
            .trim()
            .replace(new RegExp(`^(?:${anchorPattern})`, 'u'), '')
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

    formatAmount(amount) {
        const value = Number(amount);
        if (!Number.isFinite(value)) return String(amount);
        if (Number.isInteger(value)) return `${value}`;
        return value.toFixed(4).replace(/\.?0+$/, '');
    }

    getRegionPrefixByKey(regionKey, options = {}) {
        const activeProfile = this.getActiveRuleProfile();
        const regionPolicy = activeProfile && activeProfile.regionPolicy ? activeProfile.regionPolicy : {};
        const canonicalAlwaysShow = typeof options.canonicalAlwaysShowRegion === 'boolean'
            ? options.canonicalAlwaysShowRegion
            : regionPolicy.canonicalAlwaysShowRegion !== false;
        const normalizedRegion = this.normalizeRegionKey(regionKey, this.getDefaultRegionKey());
        if (normalizedRegion === 'old_ao') return '老奥';
        if (normalizedRegion === 'hongkong') return '香港';
        return canonicalAlwaysShow ? '新奥' : '';
    }

    buildCanonicalEntryText(entry) {
        const numbers = Array.isArray(entry && entry.numbers)
            ? entry.numbers
                .map(num => parseInt(num, 10))
                .filter(num => this.validateNumber(num))
            : [];
        if (numbers.length === 0) return '';
        const regionPrefix = this.getRegionPrefixByKey(entry.regionKey || 'new_ao');
        const numberText = numbers.map(num => this.formatNumber(num)).join('.');
        return `${regionPrefix}${numberText}各${this.formatAmount(entry.amount)}`;
    }

    buildCanonicalPlayText(entry) {
        if (!entry || typeof entry !== 'object') return '';
        if (typeof entry.canonical === 'string' && entry.canonical.trim()) {
            return entry.canonical.trim();
        }
        const displayText = String(entry.displayText || entry.rawText || '').trim();
        if (!displayText) return '';
        const regionPrefix = this.getRegionPrefixByKey(entry.regionKey || 'new_ao');
        return `${regionPrefix}未开放玩法：${displayText}`;
    }

    collectCanonicalMessageEntries(entries = []) {
        const combined = [];
        const appendEntries = (rows, kind) => {
            (Array.isArray(rows) ? rows : []).forEach((entry) => {
                combined.push({
                    kind,
                    order: Number.isFinite(Number(entry && entry.parseOrder)) ? Number(entry.parseOrder) : Number.MAX_SAFE_INTEGER,
                    entry
                });
            });
        };
        appendEntries(entries, 'standard');
        return combined.sort((left, right) => {
            const leftLine = Number.parseInt(left && left.entry && left.entry.lineNo, 10);
            const rightLine = Number.parseInt(right && right.entry && right.entry.lineNo, 10);
            const safeLeftLine = Number.isFinite(leftLine) ? leftLine : Number.MAX_SAFE_INTEGER;
            const safeRightLine = Number.isFinite(rightLine) ? rightLine : Number.MAX_SAFE_INTEGER;
            if (safeLeftLine !== safeRightLine) {
                return safeLeftLine - safeRightLine;
            }
            const leftSegment = Number.parseInt(left && left.entry && left.entry.segmentNo, 10);
            const rightSegment = Number.parseInt(right && right.entry && right.entry.segmentNo, 10);
            const safeLeftSegment = Number.isFinite(leftSegment) ? leftSegment : Number.MAX_SAFE_INTEGER;
            const safeRightSegment = Number.isFinite(rightSegment) ? rightSegment : Number.MAX_SAFE_INTEGER;
            if (safeLeftSegment !== safeRightSegment) {
                return safeLeftSegment - safeRightSegment;
            }
            return left.order - right.order;
        });
    }

    buildCanonicalMessage(entries) {
        const combined = this.collectCanonicalMessageEntries(entries);
        if (combined.length === 0) return '';
        return combined
            .map((item) => this.buildCanonicalEntryText(item.entry))
            .filter(Boolean)
            .join('\n');
    }

    // 处理消息并更新用户数据
    processMessageForUser(message, userName, options = {}) {
        try {
            const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : userName);
            const allowPartial = !options || options.allowPartial !== false;
            const parsedMessage = this.parseMessage(message, { clientId, allowPartial });
            const regionAccountingInfo = this.getEffectiveRegionAccountingInfo(clientId);
            const providedOriginalMessage = options && Object.prototype.hasOwnProperty.call(options, 'originalMessage')
                ? String(options.originalMessage == null ? '' : options.originalMessage)
                : '';
            const normalizedProvidedOriginalMessage = providedOriginalMessage
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n');
            const fallbackOriginalMessage = String(message || '')
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n');
            const originalMessageForStorage = normalizedProvidedOriginalMessage.trim()
                ? normalizedProvidedOriginalMessage
                : (parsedMessage && typeof parsedMessage.raw === 'string' && parsedMessage.raw.trim()
                    ? parsedMessage.raw
                    : (parsedMessage && typeof parsedMessage.original === 'string' && parsedMessage.original.trim()
                        ? parsedMessage.original
                        : fallbackOriginalMessage));
            const createdAtRaw = options && Object.prototype.hasOwnProperty.call(options, 'createdAt')
                ? options.createdAt
                : new Date().toISOString();
            const createdAtDate = new Date(createdAtRaw);
            const createdAt = Number.isNaN(createdAtDate.getTime())
                ? new Date().toISOString()
                : createdAtDate.toISOString();
            const editedAtRaw = options && Object.prototype.hasOwnProperty.call(options, 'editedAt')
                ? options.editedAt
                : '';
            const editedAtDate = editedAtRaw ? new Date(editedAtRaw) : null;
            const editedAt = editedAtDate && !Number.isNaN(editedAtDate.getTime())
                ? editedAtDate.toISOString()
                : '';
            const allUsers = userManager.getAllUsers ? userManager.getAllUsers() : {};
            if (!allUsers || !allUsers[userName]) {
                throw new Error('用户不存在');
            }
            const blockedPlayEntries = Array.isArray(parsedMessage.playEntries) ? parsedMessage.playEntries : [];
            const unresolvedLines = Array.isArray(parsedMessage.unresolvedLines) ? parsedMessage.unresolvedLines : [];
            const blockingPlayIssues = blockedPlayEntries
                .filter(entry => this.isBlockingPlayEntry(entry))
                .map(entry => this.buildBlockingIssueFromPlayEntry(entry));
            const blockingUnresolvedLines = [
                ...blockingPlayIssues,
                ...this.getBlockingUnresolvedLines(unresolvedLines)
            ];
            const blockingIssueKeys = new Set(blockingUnresolvedLines.map((issue) => this.buildPreviewIssueKey(issue)));
            const ignoredUnresolvedLines = unresolvedLines.filter((issue) => !blockingIssueKeys.has(this.buildPreviewIssueKey(issue)));
            if (blockingPlayIssues.length > 0) {
                const previewText = blockedPlayEntries
                    .slice(0, 2)
                    .map(entry => String(entry && (entry.displayText || entry.rawText) ? (entry.displayText || entry.rawText) : '').trim())
                    .filter(Boolean)
                    .join(' / ');
                const blockingPlayError = new Error(previewText
                    ? `检测到未开放玩法：${previewText}`
                    : '检测到未开放玩法，已阻止自动入账');
                blockingPlayError.code = 'BLOCKING_UNSUPPORTED_PLAY';
                blockingPlayError.playEntries = blockedPlayEntries;
                blockingPlayError.unresolvedLines = unresolvedLines;
                blockingPlayError.blockingUnresolvedLines = blockingUnresolvedLines;
                throw blockingPlayError;
            }
            if (parsedMessage.entries.length === 0 && blockedPlayEntries.length > 0) {
                const previewText = blockedPlayEntries
                    .slice(0, 2)
                    .map(entry => String(entry && entry.displayText ? entry.displayText : entry && entry.rawText ? entry.rawText : '').trim())
                    .filter(Boolean)
                    .join(' / ');
                const unsupportedError = new Error(previewText
                    ? `仅识别到未开放玩法：${previewText}`
                    : '仅识别到未开放玩法，当前不参与号码统计');
                unsupportedError.code = 'UNSUPPORTED_PLAY_ONLY';
                unsupportedError.playEntries = blockedPlayEntries;
                throw unsupportedError;
            }
            if (parsedMessage.entries.length === 0 && blockedPlayEntries.length === 0 && unresolvedLines.length > 0) {
                const partialError = new Error(`消息中没有可识别的有效录入条目，剩余 ${unresolvedLines.length} 行未识别`);
                partialError.code = 'NO_VALID_PARSED_CONTENT';
                partialError.unresolvedLines = unresolvedLines;
                throw partialError;
            }
            if (blockingUnresolvedLines.length > 0) {
                const blockingError = new Error(`仍有 ${blockingUnresolvedLines.length} 行疑似录入条目内容未识别，已阻止自动入账`);
                blockingError.code = 'BLOCKING_UNRESOLVED_LINES';
                blockingError.unresolvedLines = unresolvedLines;
                blockingError.blockingUnresolvedLines = blockingUnresolvedLines;
                throw blockingError;
            }

            let totalAdded = 0;
            const touchedRegionKeys = new Set();
            const orderTotalsByRegion = new Map();
            const entryCountsByRegion = new Map();
            const defaultOdds = this.getEffectiveDefaultOdds(clientId);
            const ensureRegionPayoutData = (regionData) => {
                if (!regionData || !Array.isArray(regionData.data)) return null;
                if (!Array.isArray(regionData.payoutData)) {
                    const seededOdds = this.normalizeOddsValue(defaultOdds, this.SYSTEM_DEFAULT_ODDS);
                    regionData.payoutData = regionData.data.map(item => ({
                        number: item.number,
                        text: item.text,
                        value: (Number(item.value) || 0) * seededOdds
                    }));
                }
                const payoutMap = new Map();
                regionData.payoutData.forEach(item => {
                    if (!item || typeof item.number !== 'string') return;
                    const value = Number(item.value);
                    payoutMap.set(item.number, {
                        number: item.number,
                        text: item.text,
                        value: Number.isFinite(value) ? value : 0
                    });
                });
                regionData.data.forEach(item => {
                    if (!item || typeof item.number !== 'string') return;
                    if (!payoutMap.has(item.number)) {
                        payoutMap.set(item.number, {
                            number: item.number,
                            text: item.text,
                            value: 0
                        });
                    }
                });
                regionData.payoutData = regionData.data.map(item => {
                    const base = payoutMap.get(item.number);
                    return {
                        number: item.number,
                        text: item.text,
                        value: base ? base.value : 0
                    };
                });
                return regionData.payoutData;
            };
            parsedMessage.entries.forEach(entry => {
                const accounting = this.resolveEntryAccountingInfo(entry && entry.regionKey ? entry.regionKey : '', {
                    clientId,
                    accountingInfo: regionAccountingInfo
                });
                const regionKey = accounting.accountingRegionKey || (userManager.getActiveRegion ? userManager.getActiveRegion() : 'new_ao');
                const userData = userManager.getUserRegionData
                    ? userManager.getUserRegionData(userName, regionKey)
                    : userManager.getUserData(userName);
                if (!userData) {
                    throw new Error(`地区数据不存在: ${regionKey}`);
                }
                touchedRegionKeys.add(regionKey);
                entryCountsByRegion.set(regionKey, (Number(entryCountsByRegion.get(regionKey)) || 0) + 1);
                const payoutData = ensureRegionPayoutData(userData);
                const entryOdds = this.normalizeOddsValue(entry.odds, defaultOdds);
                entry.numbers.forEach(number => {
                    const formattedNumber = this.formatNumber(number);
                    const dataItem = userData.data.find(item => item.number === formattedNumber);
                    const payoutItem = Array.isArray(payoutData)
                        ? payoutData.find(item => item.number === formattedNumber)
                        : null;
                    if (dataItem) {
                        dataItem.value += entry.amount;
                        totalAdded += entry.amount;
                        orderTotalsByRegion.set(
                            regionKey,
                            (Number(orderTotalsByRegion.get(regionKey)) || 0) + entry.amount
                        );
                    }
                    if (payoutItem) {
                        payoutItem.value += entry.amount * entryOdds;
                    }
                });
            });

            touchedRegionKeys.forEach(regionKey => {
                const userData = userManager.getUserRegionData
                    ? userManager.getUserRegionData(userName, regionKey)
                    : userManager.getUserData(userName);
                if (!userData) return;
                const totalAmountForRegion = Number(orderTotalsByRegion.get(regionKey)) || 0;
                const parseSummary = this.buildStoredOriginalParseSummary({
                    playEntries: blockedPlayEntries,
                    unresolvedLines,
                    blockingUnresolvedLines,
                    ignoredUnresolvedLines,
                    countedEntryCount: Number(entryCountsByRegion.get(regionKey)) || 0,
                    countedAmount: totalAmountForRegion
                });
                userData.originalData.push({
                    message: originalMessageForStorage,
                    totalAmount: totalAmountForRegion,
                    createdAt,
                    parseSummary,
                    ...(editedAt ? { editedAt } : {}),
                });
                userData.totalCount = userData.data.reduce((sum, item) => sum + item.value, 0);
            });

            if (userManager && typeof userManager.invalidateOriginalDataDerivedCaches === 'function' && touchedRegionKeys.size > 0) {
                userManager.invalidateOriginalDataDerivedCaches();
            }
            if (userManager && typeof userManager.invalidateUserListDerivedCaches === 'function' && touchedRegionKeys.size > 0) {
                userManager.invalidateUserListDerivedCaches();
            }

            // 保存数据
            if (!options || options.persist !== false) {
                userManager.saveUserData();
            }

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
                regionAccounting: regionAccountingInfo,
                ignoredPlayCount: blockedPlayEntries.length,
                ignoredPlayEntries: blockedPlayEntries,
                ignoredLineCount: unresolvedLines.length,
                ignoredLines: unresolvedLines,
                blockingUnresolvedLineCount: blockingUnresolvedLines.length,
                blockingUnresolvedLines,
                totalAdded,
                newTotal
            };
        } catch (error) {
            const response = {
                success: false,
                message: error.message
            };
            if (error && error.code) {
                response.code = error.code;
            }
            if (error && error.ambiguity) {
                response.ambiguity = error.ambiguity;
            }
            if (error && Array.isArray(error.playEntries)) {
                response.playEntries = error.playEntries;
                response.ignoredPlayCount = error.playEntries.length;
            }
            if (error && Array.isArray(error.unresolvedLines)) {
                response.ignoredLines = error.unresolvedLines;
                response.ignoredLineCount = error.unresolvedLines.length;
            }
            if (error && Array.isArray(error.blockingUnresolvedLines)) {
                response.blockingUnresolvedLines = error.blockingUnresolvedLines;
                response.blockingUnresolvedLineCount = error.blockingUnresolvedLines.length;
            }
            return response;
        }
    }

    buildPreviewIssueKey(issue) {
        const lineNo = Number.parseInt(issue && issue.lineNo, 10);
        const safeLineNo = Number.isFinite(lineNo) ? lineNo : '?';
        const rawText = String(issue && issue.rawText ? issue.rawText : '').trim();
        const reason = String(issue && issue.reason ? issue.reason : '').trim();
        return `${safeLineNo}|${rawText}|${reason}`;
    }

    buildPreviewSummary(payload = {}) {
        const entries = Array.isArray(payload.entries) ? payload.entries.filter(Boolean) : [];
        const playEntries = Array.isArray(payload.playEntries) ? payload.playEntries.filter(Boolean) : [];
        const nonBlockingPlayEntries = playEntries.filter(entry => !this.isBlockingPlayEntry(entry));
        const unresolvedLines = Array.isArray(payload.unresolvedLines) ? payload.unresolvedLines.filter(Boolean) : [];
        const blockingUnresolvedLines = Array.isArray(payload.blockingUnresolvedLines)
            ? payload.blockingUnresolvedLines.filter(Boolean)
            : [];
        const ignoredUnresolvedLines = Array.isArray(payload.ignoredUnresolvedLines)
            ? payload.ignoredUnresolvedLines.filter(Boolean)
            : [];
        const countedAmount = Number.isFinite(Number(payload.totalAmount))
            ? Number(payload.totalAmount)
            : entries.reduce((sum, entry) => sum + (Number(entry && entry.totalAmount) || 0), 0);

        let status = 'empty_or_noise';
        if (blockingUnresolvedLines.length > 0) {
            status = 'blocked';
        } else if (entries.length > 0 && nonBlockingPlayEntries.length === 0 && ignoredUnresolvedLines.length === 0) {
            status = 'complete';
        } else if (entries.length === 0 && nonBlockingPlayEntries.length > 0 && ignoredUnresolvedLines.length === 0) {
            status = 'play_only';
        } else if (entries.length > 0 || playEntries.length > 0 || ignoredUnresolvedLines.length > 0 || unresolvedLines.length > 0) {
            status = 'partial';
        }

        const statusLabelMap = {
            complete: '已完整统计',
            partial: '部分统计',
            blocked: '待处理',
            play_only: '仅未开放玩法',
            empty_or_noise: '仅噪音/摘要'
        };

        const issues = [];
        nonBlockingPlayEntries.forEach((entry) => {
            issues.push({
                kind: 'play',
                lineNo: Number.isFinite(Number(entry && entry.lineNo)) ? Number(entry.lineNo) : null,
                reason: String(entry && (entry.blockReason || entry.playLabel || entry.playType || '未开放玩法') ? (entry.blockReason || entry.playLabel || entry.playType || '未开放玩法') : '未开放玩法').trim(),
                rawText: String(entry && (entry.displayText || entry.rawText || entry.canonical) ? (entry.displayText || entry.rawText || entry.canonical) : '').trim()
            });
        });
        blockingUnresolvedLines.forEach((issue) => {
            issues.push({
                kind: 'blocked',
                lineNo: Number.isFinite(Number(issue && issue.lineNo)) ? Number(issue.lineNo) : null,
                reason: String(issue && issue.reason ? issue.reason : '疑似录入条目内容未识别').trim(),
                rawText: String(issue && issue.rawText ? issue.rawText : '').trim()
            });
        });
        ignoredUnresolvedLines.forEach((issue) => {
            issues.push({
                kind: 'ignored',
                lineNo: Number.isFinite(Number(issue && issue.lineNo)) ? Number(issue.lineNo) : null,
                reason: String(issue && issue.reason ? issue.reason : '格式无法识别').trim(),
                rawText: String(issue && issue.rawText ? issue.rawText : '').trim()
            });
        });

        return {
            status,
            statusLabel: statusLabelMap[status] || '部分统计',
            countedEntryCount: entries.length,
            countedAmount,
            playCount: nonBlockingPlayEntries.length,
            blockedCount: blockingUnresolvedLines.length,
            ignoredCount: ignoredUnresolvedLines.length,
            unresolvedCount: unresolvedLines.length,
            issues
        };
    }

    buildStoredOriginalParseSummary(payload = {}) {
        const playEntries = Array.isArray(payload.playEntries) ? payload.playEntries.filter(Boolean) : [];
        const unresolvedLines = Array.isArray(payload.unresolvedLines) ? payload.unresolvedLines.filter(Boolean) : [];
        const blockingUnresolvedLines = Array.isArray(payload.blockingUnresolvedLines)
            ? payload.blockingUnresolvedLines.filter(Boolean)
            : [];
        const ignoredUnresolvedLines = Array.isArray(payload.ignoredUnresolvedLines)
            ? payload.ignoredUnresolvedLines.filter(Boolean)
            : [];
        const countedEntryCount = Number.isFinite(Number(payload.countedEntryCount))
            ? Number(payload.countedEntryCount)
            : 0;
        const countedAmount = Number.isFinite(Number(payload.countedAmount))
            ? Number(payload.countedAmount)
            : 0;
        const nonBlockingPlayEntries = playEntries.filter(entry => !this.isBlockingPlayEntry(entry));

        let status = String(payload.status || '').trim();
        if (!status) {
            if (blockingUnresolvedLines.length > 0) {
                status = 'blocked';
            } else if (countedEntryCount > 0 && nonBlockingPlayEntries.length === 0 && ignoredUnresolvedLines.length === 0) {
                status = 'complete';
            } else if (countedEntryCount === 0 && nonBlockingPlayEntries.length > 0 && ignoredUnresolvedLines.length === 0) {
                status = 'play_only';
            } else if (countedEntryCount > 0 || playEntries.length > 0 || ignoredUnresolvedLines.length > 0 || unresolvedLines.length > 0) {
                status = 'partial';
            } else {
                status = 'empty_or_noise';
            }
        }

        const issues = [];
        nonBlockingPlayEntries.forEach((entry) => {
            issues.push({
                kind: 'play',
                lineNo: Number.isFinite(Number(entry && entry.lineNo)) ? Number(entry.lineNo) : null,
                reason: String(entry && (entry.blockReason || entry.playLabel || entry.playType || '未开放玩法')
                    ? (entry.blockReason || entry.playLabel || entry.playType || '未开放玩法')
                    : '未开放玩法').trim(),
                rawText: String(entry && (entry.displayText || entry.rawText || entry.canonical)
                    ? (entry.displayText || entry.rawText || entry.canonical)
                    : '').trim()
            });
        });
        blockingUnresolvedLines.forEach((issue) => {
            issues.push({
                kind: 'blocked',
                lineNo: Number.isFinite(Number(issue && issue.lineNo)) ? Number(issue.lineNo) : null,
                reason: String(issue && issue.reason ? issue.reason : '疑似录入条目内容未识别').trim(),
                rawText: String(issue && issue.rawText ? issue.rawText : '').trim()
            });
        });
        ignoredUnresolvedLines.forEach((issue) => {
            issues.push({
                kind: 'ignored',
                lineNo: Number.isFinite(Number(issue && issue.lineNo)) ? Number(issue.lineNo) : null,
                reason: String(issue && issue.reason ? issue.reason : '格式无法识别').trim(),
                rawText: String(issue && issue.rawText ? issue.rawText : '').trim()
            });
        });

        const statusLabelMap = {
            complete: '已完整统计',
            partial: '部分统计',
            blocked: '待处理',
            play_only: '仅未开放玩法',
            empty_or_noise: '仅噪音/摘要'
        };

        return {
            status,
            statusLabel: statusLabelMap[status] || '部分统计',
            countedEntryCount,
            countedAmount,
            playCount: nonBlockingPlayEntries.length,
            blockedCount: blockingUnresolvedLines.length,
            ignoredCount: ignoredUnresolvedLines.length,
            unresolvedCount: unresolvedLines.length,
            issues
        };
    }

    // 预览消息解析结果
    previewMessage(message, options = {}) {
        try {
            const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
            return this.withRuleContext(clientId, () => {
                const allowPartial = !options || options.allowPartial !== false;
                const parsedMessage = this.parseMessage(message, { clientId, allowPartial });
                const regionAccountingInfo = this.getEffectiveRegionAccountingInfo(clientId);
                const resultEntries = parsedMessage.entries.map(entry => {
                    const accounting = this.resolveEntryAccountingInfo(entry.regionKey || this.getDefaultRegionKey(), {
                        clientId,
                        accountingInfo: regionAccountingInfo
                    });
                    return {
                        ...accounting,
                        numbers: entry.numbers.map(num => ({
                            number: this.formatNumber(num),
                            animal: this.getAnimalByNumber(num),
                        })),
                        parseOrder: entry.parseOrder || null,
                        regionKey: accounting.accountingRegionKey,
                        regionLabel: accounting.accountingRegionLabel,
                        amount: entry.amount,
                        odds: this.normalizeOddsValue(entry.odds, this.getEffectiveDefaultOdds(clientId)),
                        lineNo: entry.lineNo || null,
                        segmentNo: entry.segmentNo || null,
                        anchorToken: String(entry.anchorToken || '').trim(),
                        anchorMode: String(entry.anchorMode || 'per_number').trim(),
                        canonical: this.buildCanonicalEntryText({
                            ...entry,
                            regionKey: accounting.accountingRegionKey
                        }),
                        totalAmount: entry.numbers.length * entry.amount,
                        totalPayout: entry.numbers.length * entry.amount * this.normalizeOddsValue(entry.odds, this.getEffectiveDefaultOdds(clientId)),
                    };
                });
                const playResultEntries = (Array.isArray(parsedMessage.playEntries) ? parsedMessage.playEntries : []).map(entry => ({
                    kind: 'play',
                    parseOrder: entry.parseOrder || null,
                    playType: String(entry && entry.playType ? entry.playType : '').trim(),
                    playFamily: String(entry && entry.playFamily ? entry.playFamily : '').trim(),
                    playLabel: String(entry && entry.playLabel ? entry.playLabel : '').trim(),
                    playStatus: String(entry && entry.playStatus ? entry.playStatus : 'blocked').trim(),
                    blocking: !!(entry && entry.blocking),
                    blockReason: String(entry && entry.blockReason ? entry.blockReason : '').trim(),
                    rawText: String(entry && entry.rawText ? entry.rawText : '').trim(),
                    displayText: String(entry && entry.displayText ? entry.displayText : '').trim(),
                    regionKey: entry.regionKey || this.getDefaultRegionKey(),
                    regionLabel: this.getRegionLabelByKey(entry.regionKey || this.getDefaultRegionKey()),
                    amount: Number.isFinite(Number(entry && entry.amount)) ? Number(entry.amount) : NaN,
                    lineNo: entry.lineNo || null,
                    segmentNo: entry.segmentNo || null,
                    canonical: this.buildCanonicalPlayText(entry),
                    totalAmount: 0,
                    totalPayout: 0
                }));
                const totalAmount = resultEntries.reduce((sum, entry) => sum + entry.totalAmount, 0);
                const totalPayout = resultEntries.reduce((sum, entry) => {
                    const value = Number(entry && entry.totalPayout);
                    return Number.isFinite(value) ? sum + value : sum;
                }, 0);
                const unresolvedLines = Array.isArray(parsedMessage.unresolvedLines) ? parsedMessage.unresolvedLines : [];
                const blockingPlayIssues = playResultEntries
                    .filter(entry => this.isBlockingPlayEntry(entry))
                    .map(entry => this.buildBlockingIssueFromPlayEntry(entry));
                const blockingUnresolvedLines = [
                    ...blockingPlayIssues,
                    ...this.getBlockingUnresolvedLines(unresolvedLines)
                ];
                const blockingIssueKeys = new Set(blockingUnresolvedLines.map((issue) => this.buildPreviewIssueKey(issue)));
                const ignoredUnresolvedLines = unresolvedLines.filter((issue) => !blockingIssueKeys.has(this.buildPreviewIssueKey(issue)));
                const summary = this.buildPreviewSummary({
                    entries: resultEntries,
                    playEntries: playResultEntries,
                    unresolvedLines,
                    blockingUnresolvedLines,
                    ignoredUnresolvedLines,
                    totalAmount
                });

                return {
                    success: true,
                    result: {
                        entries: resultEntries,
                        playEntries: playResultEntries,
                        regionAccounting: regionAccountingInfo,
                        unresolvedLines,
                        ignoredUnresolvedLines,
                        blockingUnresolvedLines,
                        blockingUnresolvedLineCount: blockingUnresolvedLines.length,
                        summary,
                        partial: !!parsedMessage.partial,
                        totalAmount,
                        totalPayout,
                        original: parsedMessage.original,
                        canonicalMessage: parsedMessage.original,
                    }
                };
            });
        } catch (error) {
            const response = {
                success: false,
                error: error.message
            };
            if (error && error.code) {
                response.code = error.code;
            }
            if (error && error.ambiguity) {
                response.ambiguity = error.ambiguity;
            }
            if (error && Array.isArray(error.unresolvedLines)) {
                response.unresolvedLines = error.unresolvedLines;
            }
            return response;
        }
    }

    // 生成预览HTML
    generatePreviewHTML(previewResult) {
        if (!previewResult.success) {
            return `<div style="color: red;">错误: ${previewResult.error}</div>`;
        }

        const result = previewResult.result;
        const displayEntries = Array.isArray(result.entries) ? result.entries : [];
        const playEntries = Array.isArray(result.playEntries) ? result.playEntries : [];
        let html = '<div style="margin: 10px 0;">';
        html += '<h4>解析结果:</h4>';
        html += '<div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">';
        if (result.canonicalMessage) {
            html += `<div style="margin-bottom:8px;padding:6px 8px;background:#eef6ff;border:1px solid #c7ddff;border-radius:4px;">标准格式：${result.canonicalMessage.replace(/\n/g, ' / ')}</div>`;
        }

        displayEntries.forEach((entry, index) => {
            const amountText = this.formatAmount(entry.amount);
            const segmentNo = entry.segmentNo || (index + 1);
            const lineLabel = entry.lineNo ? `，第 ${entry.lineNo} 行` : '';
            html += `<div style="margin: 8px 0; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">`;
            html += `<div style="font-size: 12px; color: #666;">第 ${segmentNo} 段${lineLabel}，地区 ${entry.regionLabel}，每码 ${amountText}</div>`;
            if (entry.canonical) {
                html += `<div style="font-size: 12px; color: #0f4c81; margin-top: 2px;">标准段: ${entry.canonical}</div>`;
            }
            if (Array.isArray(entry.numbers) && entry.numbers.length > 0) {
                entry.numbers.forEach(item => {
                    html += `<div style="margin: 4px 0;">`;
                    html += `<span style="font-weight: bold;">${item.number}</span> `;
                    html += `<span style="color: #666;">${item.animal}</span> `;
                    html += `<span style="color: #28a745;">+${amountText}</span>`;
                    html += '</div>';
                });
            }
            html += '</div>';
        });
        if (playEntries.length > 0) {
            html += '<hr style="margin: 10px 0;">';
            html += '<div style="font-weight: bold; color: #a14d00; margin-bottom: 6px;">未开放玩法（不参与号码统计）</div>';
            playEntries.forEach((entry, index) => {
                const segmentNo = entry.segmentNo || (index + 1);
                const lineLabel = entry.lineNo ? `，第 ${entry.lineNo} 行` : '';
                html += `<div style="margin: 8px 0; padding: 6px; border: 1px dashed #e0a15d; border-radius: 4px; background: #fff7ee;">`;
                html += `<div style="font-size: 12px; color: #8b5b25;">第 ${segmentNo} 段${lineLabel}，地区 ${entry.regionLabel}，玩法 ${entry.playLabel || entry.playType || '未开放玩法'}</div>`;
                if (entry.canonical) {
                    html += `<div style="font-size: 12px; color: #8b5b25; margin-top: 2px;">${entry.canonical}</div>`;
                }
                if (entry.blockReason) {
                    html += `<div style="font-size: 12px; color: #a14d00; margin-top: 2px;">${entry.blockReason}</div>`;
                }
                html += '</div>';
            });
        }
        
        html += '<hr style="margin: 10px 0;">';
        html += `<div style="font-weight: bold; color: #007bff;">总数: ${this.formatAmount(result.totalAmount)}</div>`;
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
if (typeof globalThis !== 'undefined') {
    globalThis.MessageProcessor = MessageProcessor;
    if (typeof globalThis.messageProcessor === 'undefined') {
        globalThis.messageProcessor = messageProcessor;
    }
}
// 挂载到window，确保全局可用
if (typeof window !== 'undefined') {
    window.messageProcessor = messageProcessor;
}
