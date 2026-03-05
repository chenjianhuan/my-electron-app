// 消息处理模块
class MessageProcessor {
    constructor() {
        this.SYSTEM_DEFAULT_ODDS = 47;
        this.ODDS = this.SYSTEM_DEFAULT_ODDS; // 兼容旧逻辑：当前生效默认赔率
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
    }

    getSystemRuleProfile() {
        return {
            version: 'v1.1',
            defaultOdds: this.SYSTEM_DEFAULT_ODDS,
            anchorSemantics: {
                '各': { amountDistribute: 'per_number', enabled: true },
                '各号': { amountDistribute: 'per_number', enabled: true },
                '买': { amountDistribute: 'per_number', enabled: true },
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
            regionPolicy: {
                defaultRegion: 'new_ao',
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
                '各肖': { amountDistribute: 'undetermined', enabled: true },
                '每肖': { amountDistribute: 'undetermined', enabled: true },
                '每个肖': { amountDistribute: 'undetermined', enabled: true },
                '每个生肖': { amountDistribute: 'undetermined', enabled: true },
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

    getResolvedGlobalRuleProfile() {
        return this.mergeRuleProfiles(
            this.getDefaultGlobalRuleProfile(),
            this.globalRuleProfile || {}
        );
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

    sanitizeAnchorRuleItem(rawRule) {
        if (!rawRule || typeof rawRule !== 'object') {
            return null;
        }
        const distribute = this.normalizeAmountDistributeValue(rawRule.amountDistribute);
        if (!distribute) return null;
        const item = {
            amountDistribute: distribute,
            enabled: rawRule.enabled !== false
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
            const anchors = {};
            Object.entries(profile.anchorSemantics).forEach(([rawToken, rawRule]) => {
                const token = this.normalizeAnchorAliasToken(rawToken);
                if (!token || token.length > 12) return;
                if (!/[\u4e00-\u9fa5A-Za-z]/.test(token)) return;
                const item = this.sanitizeAnchorRuleItem(rawRule);
                if (!item) return;
                anchors[token] = item;
            });
            if (Object.keys(anchors).length > 0) {
                safe.anchorSemantics = anchors;
            }
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

        if (profile.regionPolicy && typeof profile.regionPolicy === 'object') {
            const regionPolicy = {};
            if (profile.regionPolicy.defaultRegion) {
                regionPolicy.defaultRegion = this.normalizeRegionKey(profile.regionPolicy.defaultRegion, 'new_ao');
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
            if (key === 'regionPolicy' && value && typeof value === 'object') {
                merged.regionPolicy = {
                    ...(merged.regionPolicy || {}),
                    ...value
                };
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

        if (!effective.anchorSemantics || typeof effective.anchorSemantics !== 'object') {
            effective.anchorSemantics = {};
        }
        if (!Object.values(effective.anchorSemantics).some(item => item && item.enabled !== false)) {
            effective.anchorSemantics['各'] = { amountDistribute: 'per_number', enabled: true };
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
        if (!normalizedToken) {
            throw new Error('词语不能为空');
        }
        if (normalizedToken.length > 12) {
            throw new Error('词语长度不能超过12个字符');
        }
        if (!/[\u4e00-\u9fa5A-Za-z]/.test(normalizedToken)) {
            throw new Error('词语必须包含中文或英文');
        }
        const normalizedDistribute = this.normalizeAmountDistributeValue(amountDistribute);
        if (!normalizedDistribute) {
            throw new Error('分配策略无效');
        }

        const scope = options && options.scope === 'client' ? 'client' : 'global';
        const enabled = options && options.enabled === false ? false : true;
        const inputHasOdds = options && Object.prototype.hasOwnProperty.call(options, 'odds');
        const normalizedOdds = inputHasOdds ? this.normalizeOddsValue(options.odds) : NaN;
        const patch = {
            anchorSemantics: {
                [normalizedToken]: {
                    amountDistribute: normalizedDistribute,
                    enabled
                }
            }
        };
        if (inputHasOdds && Number.isFinite(normalizedOdds)) {
            patch.anchorSemantics[normalizedToken].odds = normalizedOdds;
        }
        this.updateRuleProfile(scope, patch, { clientId: options && options.clientId ? options.clientId : '' });
        this.persistAttributeConfig();
        this.ODDS = this.getEffectiveDefaultOdds('');
        return {
            token: normalizedToken,
            amountDistribute: normalizedDistribute,
            odds: inputHasOdds && Number.isFinite(normalizedOdds) ? normalizedOdds : null,
            enabled,
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
                const sanitizedDefault = this.sanitizeAnchorRuleItem(defaultRule);
                if (sanitizedDefault) {
                    if (!this.globalRuleProfile || typeof this.globalRuleProfile !== 'object') {
                        this.globalRuleProfile = {};
                    }
                    if (!this.globalRuleProfile.anchorSemantics || typeof this.globalRuleProfile.anchorSemantics !== 'object') {
                        this.globalRuleProfile.anchorSemantics = {};
                    }
                    this.globalRuleProfile.anchorSemantics[normalizedToken] = {
                        amountDistribute: sanitizedDefault.amountDistribute,
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

    setDefaultOdds(odds, options = {}) {
        const normalizedOdds = this.normalizeOddsValue(odds);
        if (!Number.isFinite(normalizedOdds)) {
            throw new Error('默认赔率无效，请输入大于0的数字');
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
            throw new Error('请先选择客户后再恢复默认赔率');
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

    getEffectiveAttributeCombinePolicy(clientId = '') {
        return this.getEffectiveRuleProfile(clientId).attributeCombinePolicy || 'intersection_then_union_fallback';
    }

    getEffectiveAnchorParseMode(clientId = '') {
        const mode = this.getEffectiveRuleProfile(clientId).anchorParseMode;
        return this.getAllowedAnchorParseModeValues().includes(mode) ? mode : 'strict';
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
            const effectiveRule = effective.anchorSemantics[token] || null;
            const source = Object.prototype.hasOwnProperty.call(clientAnchors, token)
                ? 'client'
                : (Object.prototype.hasOwnProperty.call(globalAnchors, token) ? 'global' : 'system');
            const defaultRule = systemAnchors[token] || null;
            const scopedRule = source === 'client'
                ? clientAnchors[token]
                : (source === 'global' ? globalAnchors[token] : systemAnchors[token]);
            const scopedOdds = this.normalizeOddsValue(scopedRule && scopedRule.odds);
            const effectiveOdds = this.normalizeOddsValue(effectiveRule && effectiveRule.odds, effective.defaultOdds);
            return {
                token,
                mode: effectiveRule && effectiveRule.amountDistribute ? effectiveRule.amountDistribute : 'per_number',
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

    containsConfiguredAnchor(text) {
        const raw = String(text || '');
        if (!raw.trim()) return false;
        const amountRegex = this.buildAmountAnchorRegex();
        amountRegex.lastIndex = 0;
        return amountRegex.test(raw);
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
        return new RegExp(
            `(${anchorPattern})${betweenPattern}(${amountPattern})\\s*(?:米|元|块|蚊|井|斤|注|码|碼)?(?:[#*\`'"$￥¥,，。:：;；~～!！?？]*)`,
            'g'
        );
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
                const entries = this.parseEntries(normalizedMessage);
                if (entries.length === 0) {
                    throw new Error('未找到可识别的消息内容');
                }
                const canonicalMessage = this.buildCanonicalMessage(entries) || String(normalizedMessage || '').trim();
                return {
                    entries,
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
                throw wrapped;
            }
        });
    }

    normalizeMessage(message) {
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
            // 中文波浪与特殊连字符统一
            .replace(/[﹣－]/g, '-')
            .replace(/[～〜]/g, '～')
            // 常见中文分隔符统一
            .replace(/[、；;]/g, ' ')
            .replace(/[：]/g, ':');
    }

    parseEntries(message) {
        const lines = String(message || '')
            .replace(/\r/g, '')
            .split('\n');

        const entries = [];
        const pendingSegments = [];
        let currentRegion = this.getDefaultRegionKey();
        let nextSegmentNo = 1;

        lines.forEach((rawLine, lineIndex) => {
            const sourceLine = String(rawLine || '');
            const trimmedSourceLine = sourceLine.trim();
            if (!trimmedSourceLine) {
                // 空白行不参与下注解析，但必须保留真实行号用于报错定位。
                return;
            }
            const activeMode = this.getEffectiveAnchorParseMode(this.activeRuleClientId);
            const line = activeMode === 'loose'
                ? this.rewriteImplicitAmountLine(trimmedSourceLine)
                : trimmedSourceLine;
            const currentLineNo = lineIndex + 1;
            const amountRegex = this.buildAmountAnchorRegex();
            let lastCursor = 0;
            let match = null;
            let hasAmountAnchor = false;
            let lineHasRegionMarker = false;
            const appendSplitSegments = (splitResult) => {
                splitResult.segments.forEach(segment => {
                    pendingSegments.push({
                        ...segment,
                        segmentNo: nextSegmentNo
                    });
                    nextSegmentNo += 1;
                });
                currentRegion = splitResult.currentRegion;
                if (splitResult.containsRegionMarker) {
                    lineHasRegionMarker = true;
                }
            };

            while ((match = amountRegex.exec(line)) !== null) {
                hasAmountAnchor = true;
                const beforeAmount = line.slice(lastCursor, match.index).trim();
                if (beforeAmount) {
                    const splitResult = this.splitTextByRegion(beforeAmount, currentRegion, currentLineNo);
                    appendSplitSegments(splitResult);
                }

                const anchorToken = match[1];
                const amount = this.parseFlexibleAmount(match[2]);
                const detachedEntries = this.resolveCrossLineAnchorAmbiguity(
                    pendingSegments,
                    currentLineNo,
                    anchorToken,
                    amount
                );
                if (detachedEntries.length > 0) {
                    entries.push(...detachedEntries);
                }
                const parsedEntries = this.buildEntriesFromPendingSegments(
                    pendingSegments,
                    amount,
                    currentLineNo,
                    anchorToken
                );
                entries.push(...parsedEntries);
                pendingSegments.length = 0;

                lastCursor = match.index + match[0].length;
            }

            if (!hasAmountAnchor) {
                // 兼容摘要行：如“合计100/总计一百”，不参与下注解析。
                if (pendingSegments.length === 0 && this.isSummaryLine(line)) {
                    return;
                }

                if (this.containsAmountUnitWithoutAnchor(line)) {
                    throw new Error(`第 ${currentLineNo} 行包含金额但缺少“各/各号/买”标记`);
                }
            }

            const tail = line.slice(lastCursor).trim();
            if (tail) {
                const splitResult = this.splitTextByRegion(tail, currentRegion, currentLineNo);
                appendSplitSegments(splitResult);
            }
            this.compactPendingSegments(pendingSegments);

            if (!hasAmountAnchor && pendingSegments.length === 0 && !lineHasRegionMarker) {
                throw new Error(`第 ${currentLineNo} 行格式无法识别`);
            }
        });

        this.compactPendingSegments(pendingSegments);
        if (pendingSegments.length > 0) {
            const firstPending = pendingSegments[0];
            const lineText = String(firstPending.text || '').slice(0, 30);
            throw new Error(`第 ${firstPending.lineNo || '?'} 行存在未绑定数值: ${lineText}，请在后面补充“各/各号/买/各肖/各数+数值”`);
        }

        return entries;
    }

    parseImplicitStandaloneSegment(segment) {
        const rawText = String(segment && segment.text ? segment.text : '').trim();
        if (!rawText) return null;
        if (this.containsConfiguredAnchor(rawText)) return null;

        const rewritten = this.rewriteImplicitAmountLine(rawText);
        if (!rewritten || rewritten === rawText || !this.containsConfiguredAnchor(rewritten)) {
            return null;
        }

        const amountRegex = this.buildAmountAnchorRegex();
        const match = amountRegex.exec(rewritten);
        if (!match) return null;

        const beforeAmount = rewritten.slice(0, match.index).trim();
        const afterAmount = rewritten.slice(match.index + match[0].length).trim();
        if (!beforeAmount || afterAmount) return null;

        const amount = this.parseFlexibleAmount(match[2]);
        const anchorToken = match[1];
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
                        title: `方案1：第 ${segment.lineNo || '?'} 行独立下注`,
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
        if (this.containsConfiguredAnchor(raw)) return raw;

        const match = raw.match(/^(.*?)([0-9０-９]+(?:[.．。][0-9０-９]+)?|[零〇一二两三四五六七八九十百千万]+)\s*([米元块蚊井斤注码碼#*`'"$￥¥,，。:：;；~～!！?？]*)$/);
        if (!match) return raw;

        let prefix = this.normalizeImplicitPrefix(match[1]);
        if (!prefix) return raw;
        const amountToken = match[2];
        const suffix = match[3] || '';

        const explicitPrefixNumbers = this.safeExtractExplicitNumbers(prefix);
        const amountValue = this.safeParseAmountCandidate(amountToken);
        const hasAmountSuffixHint = /[米元块蚊井斤#*￥¥]/.test(suffix);
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
        return String(text || '')
            .replace(/^[,，。；;:：~～\-—./\\+=*#`'"$￥¥\s]+/g, '')
            .replace(/[,，。；;:：~～\-—./\\+=*#`'"$￥¥\s]+$/g, '')
            .trim();
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
        if (this.getRegionMarkerRegex().test(compact)) return false;
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

        const stripped = normalized.replace(/[号碼码各买肖数子每个注米元块蚊井斤#*`'"$￥¥.,，。:：;；~～\-—_=+\/\\!！?？]/g, '');
        return stripped.length === 0;
    }

    containsAmountUnitWithoutAnchor(line) {
        const normalized = String(line || '').trim();
        if (!normalized) return false;
        if (this.containsConfiguredAnchor(normalized)) return false;
        return /(?:[0-9０-９]+(?:[.．。][0-9０-９]+)?|[零〇一二两三四五六七八九十百千万]+)\s*(?:米|元|块|蚊|井|斤|注|码|碼)/.test(normalized);
    }

    isSummaryLine(line) {
        const normalized = String(line || '')
            .replace(/[，。；;,.]/g, '')
            .replace(/\s+/g, '')
            .trim();
        if (!normalized) return true;
        return /^(合计|总计|累计|共|总)[:：=]?[0-9０-９零〇一二两三四五六七八九十百千万]+(?:米|元|块|蚊)?$/.test(normalized);
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
                        title: '方案1：每个号码下注金额',
                        preview: '同一锚点命中的每个号码都按该金额计。例：猴蛇狗各10 => 每个命中号码都是10。'
                    },
                    {
                        id: 'per_target_equal_split',
                        title: '方案2：每个目标组下注金额（组内平分）',
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
        const singleTokenPattern = '(?:(?<=^)|(?<=[\\s:：,，.。;；\\-—/~～]))(?:老|新|香|港|奥|澳)(?=[\\s:：,，.。;；\\-—/~～0-9０-９]|$)';
        const pattern = `(老奥|新奥|澳门|香港|${singleTokenPattern})`;
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
            currentRegion = this.resolveRegionFromToken(match[1], currentRegion);
            cursor = match.index + match[1].length;
        }

        const tail = this.normalizeSegmentText(text.slice(cursor));
        if (tail) {
            segments.push({ text: tail, regionKey: currentRegion, lineNo });
        }

        return { segments, currentRegion, containsRegionMarker };
    }

    normalizeSegmentText(text) {
        const raw = String(text || '').trim();
        if (!raw) return '';
        const trimmed = raw
            .replace(/^[,，。；;:：~～\-—#*`'"$￥¥!！?？_=+\s]+/g, '')
            .replace(/[,，。；;:：~～\-—#*`'"$￥¥!！?？_=+\s]+$/g, '')
            .trim();
        if (!trimmed) return '';
        if (this.isIgnorableResidualSegment(trimmed)) return '';
        // 纯符号残片（如单独一个“，”）直接忽略。
        if (!/[\d０-９A-Za-z\u4e00-\u9fa5]/.test(trimmed)) return '';
        return trimmed;
    }

    resolveRegionFromToken(token, fallback = 'new_ao') {
        if (token === '老奥' || token === '老') return 'old_ao';
        if (token === '香港' || token === '香' || token === '港') return 'hongkong';
        if (token === '新奥' || token === '澳门' || token === '奥' || token === '澳' || token === '新') return 'new_ao';
        return fallback || 'new_ao';
    }

    getDefaultRegionKey() {
        const activeProfile = this.getActiveRuleProfile();
        const regionPolicy = activeProfile && activeProfile.regionPolicy ? activeProfile.regionPolicy : {};
        return this.normalizeRegionKey(regionPolicy.defaultRegion, 'new_ao');
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

        const chineseNumber = normalizedDigits.replace(/[^零〇一二两三四五六七八九十百千万]/g, '');
        const parsedChinese = this.chineseToNumber(chineseNumber);
        if (Number.isFinite(parsedChinese) && parsedChinese > 0) {
            return parsedChinese;
        }
        throw new Error(`无效数值: ${token}`);
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

        const explicitNumbers = this.extractExplicitNumbers(text);
        const tokenMatches = this.extractStructuredTokenMatches(text);

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
                const chooseIntersection = window.confirm('该段同时命中多个属性词。点击“确定”按交集，点击“取消”按并集。');
                return chooseIntersection ? intersection : union;
            }
            throw new Error('该网友“属性词叠加策略”为确认模式，请先确认本段按交集还是并集');
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
        const tokenNumberSet = new Set();
        tokenMatches.forEach(item => {
            const numbers = Array.isArray(item.numbers)
                ? Array.from(new Set(item.numbers.filter(num => this.validateNumber(num))))
                : [];
            if (numbers.length > 0) {
                groups.push(numbers);
                numbers.forEach(num => tokenNumberSet.add(num));
            }
        });

        const explicitNumbers = this.extractExplicitNumbers(text);
        explicitNumbers.forEach(num => {
            if (!this.validateNumber(num)) return;
            // 避免“1门/2尾”里的数字重复算成独立目标。
            if (tokenNumberSet.has(num)) return;
            groups.push([num]);
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

    extractStructuredTokenMatches(text) {
        const attrMap = this.getAttributeMap();
        const attrKeys = Object.keys(attrMap).sort((a, b) => b.length - a.length);
        const compact = String(text || '')
            .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248))
            .replace(/[^0-9A-Za-z\u4e00-\u9fa5]/g, '');
        const matches = [];
        let i = 0;

        while (i < compact.length) {
            let matched = false;
            for (const key of attrKeys) {
                if (!compact.startsWith(key, i)) continue;
                const rawNumbers = Array.isArray(attrMap[key]) ? attrMap[key] : [];
                const numbers = [];
                const numberSet = new Set();
                rawNumbers.forEach(num => {
                    if (!this.validateNumber(num) || numberSet.has(num)) return;
                    numberSet.add(num);
                    numbers.push(num);
                });
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

    buildCanonicalMessage(entries) {
        if (!Array.isArray(entries) || entries.length === 0) return '';
        return entries
            .map(entry => this.buildCanonicalEntryText(entry))
            .filter(Boolean)
            .join('\n');
    }

    // 处理消息并更新用户数据
    processMessageForUser(message, userName, options = {}) {
        try {
            const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : userName);
            const parsedMessage = this.parseMessage(message, { clientId });
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
            const allUsers = userManager.getAllUsers ? userManager.getAllUsers() : {};
            if (!allUsers || !allUsers[userName]) {
                throw new Error('用户不存在');
            }

            let totalAdded = 0;
            const touchedRegionKeys = new Set();
            const orderTotalsByRegion = new Map();
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
                const regionKey = entry.regionKey || (userManager.getActiveRegion ? userManager.getActiveRegion() : 'new_ao');
                const userData = userManager.getUserRegionData
                    ? userManager.getUserRegionData(userName, regionKey)
                    : userManager.getUserData(userName);
                if (!userData) {
                    throw new Error(`地区数据不存在: ${regionKey}`);
                }
                touchedRegionKeys.add(regionKey);
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
                userData.originalData.push({
                    message: originalMessageForStorage,
                    totalAmount: Number(orderTotalsByRegion.get(regionKey)) || 0,
                });
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
            return response;
        }
    }

    // 预览消息解析结果
    previewMessage(message, options = {}) {
        try {
            const clientId = this.normalizeRuleClientId(options && options.clientId ? options.clientId : '');
            return this.withRuleContext(clientId, () => {
                const parsedMessage = this.parseMessage(message, { clientId });
                const resultEntries = parsedMessage.entries.map(entry => ({
                    numbers: entry.numbers.map(num => ({
                        number: this.formatNumber(num),
                        animal: this.getAnimalByNumber(num),
                    })),
                    regionKey: entry.regionKey || this.getDefaultRegionKey(),
                    regionLabel: this.getRegionLabelByKey(entry.regionKey || this.getDefaultRegionKey()),
                    amount: entry.amount,
                    odds: this.normalizeOddsValue(entry.odds, this.getEffectiveDefaultOdds(clientId)),
                    lineNo: entry.lineNo || null,
                    segmentNo: entry.segmentNo || null,
                    anchorToken: String(entry.anchorToken || '').trim(),
                    anchorMode: String(entry.anchorMode || 'per_number').trim(),
                    canonical: this.buildCanonicalEntryText(entry),
                    totalAmount: entry.numbers.length * entry.amount,
                    totalPayout: entry.numbers.length * entry.amount * this.normalizeOddsValue(entry.odds, this.getEffectiveDefaultOdds(clientId)),
                }));
                const totalAmount = resultEntries.reduce((sum, entry) => sum + entry.totalAmount, 0);
                const totalPayout = resultEntries.reduce((sum, entry) => {
                    const value = Number(entry && entry.totalPayout);
                    return Number.isFinite(value) ? sum + value : sum;
                }, 0);

                return {
                    success: true,
                    result: {
                        entries: resultEntries,
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
            return response;
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
        if (result.canonicalMessage) {
            html += `<div style="margin-bottom:8px;padding:6px 8px;background:#eef6ff;border:1px solid #c7ddff;border-radius:4px;">标准格式：${result.canonicalMessage.replace(/\n/g, ' / ')}</div>`;
        }

        result.entries.forEach((entry, index) => {
            const amountText = this.formatAmount(entry.amount);
            const segmentNo = entry.segmentNo || (index + 1);
            const lineLabel = entry.lineNo ? `，第 ${entry.lineNo} 行` : '';
            html += `<div style="margin: 8px 0; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">`;
            html += `<div style="font-size: 12px; color: #666;">第 ${segmentNo} 段${lineLabel}，地区 ${entry.regionLabel}，每码 ${amountText}</div>`;
            if (entry.canonical) {
                html += `<div style="font-size: 12px; color: #0f4c81; margin-top: 2px;">标准段: ${entry.canonical}</div>`;
            }
            entry.numbers.forEach(item => {
                html += `<div style="margin: 4px 0;">`;
                html += `<span style="font-weight: bold;">${item.number}</span> `;
                html += `<span style="color: #666;">${item.animal}</span> `;
                html += `<span style="color: #28a745;">+${amountText}</span>`;
                html += '</div>';
            });
            html += '</div>';
        });
        
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
// 挂载到window，确保全局可用
if (typeof window !== 'undefined') {
    window.messageProcessor = messageProcessor;
} 
