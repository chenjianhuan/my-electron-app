// src/models/UserModel.js
const fs = require('fs');
const path = require('path');

class UserModel {
  constructor(app) {
    // 定义存储用户数据的文件路径
    this.userDataPath = path.join(app.getPath('userData'), 'userData.json');
    this.backupPath = path.join(app.getPath('userData'), 'userData.backup.json');
    this.customAttributePath = path.join(app.getPath('userData'), 'customAttributes.json');
    this.attributeLayoutPath = path.join(app.getPath('userData'), 'attributeLayout.json');
    this.attributeConfigPath = path.join(app.getPath('userData'), 'attributeConfig.json');
    
    // 确保目录存在
    this.ensureDirectoryExists();
  }

  // 确保目录存在
  ensureDirectoryExists() {
    const dir = path.dirname(this.userDataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // 验证数据格式
  validateUserData(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // 检查每个用户的数据格式
    for (const [userName, userData] of Object.entries(data)) {
      if (!this.validateSingleUserData(userName, userData)) {
        return false;
      }
    }

    return true;
  }

  // 验证单个用户数据
  validateSingleUserData(userName, userData) {
    if (!userName || typeof userName !== 'string') {
      return false;
    }

    if (!userData || typeof userData !== 'object') {
      return false;
    }

    // 兼容新结构：{ regions: { new_ao|old_ao|hongkong: { data, originalData, totalCount } } }
    if (userData.regions && typeof userData.regions === 'object') {
      const regionEntries = Object.entries(userData.regions);
      if (regionEntries.length === 0) {
        return false;
      }
      for (const [, regionData] of regionEntries) {
        if (!this.validateRegionData(regionData)) {
          return false;
        }
      }
      return true;
    }

    // 兼容旧结构：{ data, originalData, totalCount }
    return this.validateRegionData(userData);
  }

  // 验证单个地区数据
  validateRegionData(regionData) {
    if (!regionData || typeof regionData !== 'object') {
      return false;
    }

    if (!Array.isArray(regionData.data) || !Array.isArray(regionData.originalData)) {
      return false;
    }

    if (typeof regionData.totalCount !== 'number' || regionData.totalCount < 0) {
      return false;
    }

    for (const item of regionData.data) {
      if (!this.validateDataItem(item)) {
        return false;
      }
    }

    if (Array.isArray(regionData.payoutData)) {
      for (const item of regionData.payoutData) {
        if (!this.validateDataItem(item)) {
          return false;
        }
      }
    }

    for (const originalData of regionData.originalData) {
      if (!this.validateOriginalDataEntry(originalData)) {
        return false;
      }
    }

    return true;
  }

  validateOriginalDataEntry(entry) {
    if (typeof entry === 'string') {
      return true;
    }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return false;
    }

    const messageKeys = ['raw', 'message', 'text', 'original', 'value', 'canonical'];
    const hasMessage = messageKeys.some((key) => typeof entry[key] === 'string' && String(entry[key]).trim());
    if (!hasMessage) {
      return false;
    }

    const amountKeys = ['totalAmount', 'orderTotal', 'total', 'sum'];
    for (const key of amountKeys) {
      if (!Object.prototype.hasOwnProperty.call(entry, key)) continue;
      const value = Number(entry[key]);
      if (!Number.isFinite(value) || value < 0) {
        return false;
      }
    }

    const timeKeys = ['createdAt', 'addedAt', 'timestamp', 'time'];
    for (const key of timeKeys) {
      if (!Object.prototype.hasOwnProperty.call(entry, key)) continue;
      if (typeof entry[key] !== 'string') {
        return false;
      }
    }

    return true;
  }

  // 验证数据项
  validateDataItem(item) {
    if (!item || typeof item !== 'object') {
      return false;
    }

    if (typeof item.number !== 'string' || typeof item.text !== 'string' || typeof item.value !== 'number') {
      return false;
    }

    if (item.value < 0) {
      return false;
    }

    return true;
  }

  // 创建数据备份
  createBackup() {
    try {
      if (fs.existsSync(this.userDataPath)) {
        const data = fs.readFileSync(this.userDataPath, 'utf-8');
        fs.writeFileSync(this.backupPath, data);
        console.log('数据备份已创建');
        return true;
      }
    } catch (error) {
      console.error('创建备份失败:', error);
      return false;
    }
  }

  // 从备份恢复数据
  restoreFromBackup() {
    try {
      if (fs.existsSync(this.backupPath)) {
        const data = fs.readFileSync(this.backupPath, 'utf-8');
        const parsedData = JSON.parse(data);
        
        if (this.validateUserData(parsedData)) {
          fs.writeFileSync(this.userDataPath, data);
          console.log('数据已从备份恢复');
          return parsedData;
        } else {
          console.error('备份数据格式无效');
          return null;
        }
      }
    } catch (error) {
      console.error('从备份恢复失败:', error);
      return null;
    }
  }

  // 加载用户数据
  loadUserData() {
    try {
      if (fs.existsSync(this.userDataPath)) {
        const data = fs.readFileSync(this.userDataPath, 'utf-8');
        const parsedData = JSON.parse(data);
        
        // 验证数据格式
        if (this.validateUserData(parsedData)) {
          console.log('用户数据加载成功');
          return parsedData;
        } else {
          console.warn('数据格式无效，尝试从备份恢复');
          const restoredData = this.restoreFromBackup();
          if (restoredData) {
            return restoredData;
          } else {
            console.error('无法恢复数据，返回空对象');
            return {};
          }
        }
      } else {
        console.log('用户数据文件不存在，返回空对象');
        return {};
      }
    } catch (error) {
      console.error('加载用户数据失败:', error);
      
      // 尝试从备份恢复
      console.log('尝试从备份恢复数据');
      const restoredData = this.restoreFromBackup();
      if (restoredData) {
        return restoredData;
      }
      
      return {};
    }
  }

  // 保存用户数据
  saveUserData(data) {
    try {
      // 验证数据格式
      if (!this.validateUserData(data)) {
        throw new Error('数据格式无效');
      }

      // 创建备份
      this.createBackup();

      // 保存数据
      const jsonData = JSON.stringify(data, null, 2);
      fs.writeFileSync(this.userDataPath, jsonData);
      
      console.log('用户数据保存成功');
      return true;
    } catch (error) {
      console.error('保存用户数据失败:', error);
      throw error;
    }
  }

  sanitizeCustomAttributeMap(customMap) {
    if (!customMap || typeof customMap !== 'object') {
      return {};
    }
    const sanitized = {};
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

  loadCustomAttributes() {
    try {
      if (!fs.existsSync(this.customAttributePath)) {
        return {};
      }
      const raw = fs.readFileSync(this.customAttributePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return this.sanitizeCustomAttributeMap(parsed);
    } catch (error) {
      console.error('加载自定义属性失败:', error);
      return {};
    }
  }

  saveCustomAttributes(customMap) {
    try {
      const sanitized = this.sanitizeCustomAttributeMap(customMap);
      fs.writeFileSync(this.customAttributePath, JSON.stringify(sanitized, null, 2));
      return true;
    } catch (error) {
      console.error('保存自定义属性失败:', error);
      throw error;
    }
  }

  sanitizeAttributeLayout(layout) {
    if (!layout || typeof layout !== 'object') {
      return {};
    }
    const sanitized = {};
    Object.entries(layout).forEach(([rowIndex, rowValues]) => {
      if (!/^\d+$/.test(String(rowIndex))) return;
      if (!Array.isArray(rowValues)) return;
      const values = rowValues
        .filter(v => typeof v === 'string' && v.trim().length > 0)
        .map(v => v.trim());
      if (values.length > 0) {
        sanitized[String(rowIndex)] = values;
      }
    });
    return sanitized;
  }

  loadAttributeLayout() {
    try {
      if (!fs.existsSync(this.attributeLayoutPath)) {
        return {};
      }
      const raw = fs.readFileSync(this.attributeLayoutPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return this.sanitizeAttributeLayout(parsed);
    } catch (error) {
      console.error('加载属性布局失败:', error);
      return {};
    }
  }

  saveAttributeLayout(layout) {
    try {
      const sanitized = this.sanitizeAttributeLayout(layout);
      fs.writeFileSync(this.attributeLayoutPath, JSON.stringify(sanitized, null, 2));
      return true;
    } catch (error) {
      console.error('保存属性布局失败:', error);
      throw error;
    }
  }

  sanitizeAttributeConfig(config) {
    const normalizeAnchorToken = (rawToken) => String(rawToken || '').replace(/\s+/g, '').replace(/[：:]+$/g, '').trim();
    const inferAnchorTokenType = (rawToken) => {
      const token = normalizeAnchorToken(rawToken);
      if (!token) return '';
      if (/^[\u4e00-\u9fa5A-Za-z]+$/.test(token)) return 'word';
      if (/^[^0-9０-９\u4e00-\u9fa5A-Za-z]+$/.test(token)) return 'symbol';
      return 'mixed';
    };
    const normalizeAnchorTokenType = (rawValue, rawToken) => {
      const value = String(rawValue || '').trim();
      if (['word', 'symbol', 'mixed'].includes(value)) return value;
      return inferAnchorTokenType(rawToken);
    };
    const normalizeAnchorPosition = (rawValue) => {
      const value = String(rawValue || '').trim();
      return ['before_amount', 'after_target', 'standalone'].includes(value) ? value : 'before_amount';
    };
    const normalizeAnchorBoundary = (rawValue) => {
      const value = String(rawValue || '').trim();
      return ['strict', 'soft'].includes(value) ? value : 'strict';
    };
    const normalizeAnchorPriority = (rawValue) => {
      const parsed = Number.parseInt(rawValue, 10);
      if (!Number.isFinite(parsed)) return 100;
      if (parsed < 0) return 0;
      if (parsed > 9999) return 9999;
      return parsed;
    };
    const reservedAnchorTokens = new Set([
      '新', '老', '香', '港', '奥', '澳',
      '新奥', '新澳', '老奥', '老澳', '澳门', '香港',
      '米', '元', '块', '蚊', '井', '斤', '注', '码', '碼', '毛', '角', '分', '闷'
    ]);
    const sanitizeAmountUnits = (rawAmountUnits) => {
      if (!Array.isArray(rawAmountUnits)) return [];
      const seen = new Set();
      const safeUnits = [];
      rawAmountUnits.forEach((item) => {
        const candidate = item && typeof item === 'object' && !Array.isArray(item)
          ? item.token
          : item;
        const token = String(candidate || '').replace(/\s+/g, '').trim();
        if (!token || token.length > 6) return;
        if (/[\r\n]/.test(token)) return;
        if (/^[0-9０-９零〇一二两三四五六七八九十百千万]+$/.test(token)) return;
        if (!/[\u4e00-\u9fa5A-Za-z]/.test(token)) return;
        if (/^(?:新|老|香|港|奥|澳|新奥|新澳|老奥|老澳|澳门|香港)$/.test(token)) return;
        if (seen.has(token)) return;
        seen.add(token);
        safeUnits.push(token);
      });
      return safeUnits;
    };
    const sanitizeRegionAliasMap = (rawRegionAliases) => {
      const systemAliasLookup = new Set([
        '新奥', '新澳', '澳门', '奥', '澳', '新',
        '老奥', '老澳', '老',
        '香港', '香', '港'
      ]);
      const safeMap = {};
      if (!rawRegionAliases || typeof rawRegionAliases !== 'object') return safeMap;
      ['new_ao', 'old_ao', 'hongkong'].forEach((regionKey) => {
        const rawTokens = Array.isArray(rawRegionAliases[regionKey])
          ? rawRegionAliases[regionKey]
          : [];
        const seen = new Set();
        const safeTokens = [];
        rawTokens.forEach((tokenRaw) => {
          const token = String(tokenRaw || '').replace(/\s+/g, '').trim();
          if (!token || token.length > 12) return;
          if (/[\r\n]/.test(token)) return;
          if (/^[0-9０-９零〇一二两三四五六七八九十百千万]+$/.test(token)) return;
          if (!/[\u4e00-\u9fa5A-Za-z]/.test(token)) return;
          if (/^(?:元|块|米|蚊|毛|角|分|闷|号|碼|码|各|买|都)$/u.test(token)) return;
          if (systemAliasLookup.has(token)) return;
          if (seen.has(token)) return;
          seen.add(token);
          safeTokens.push(token);
        });
        if (safeTokens.length > 0) {
          safeMap[regionKey] = safeTokens;
        }
      });
      return safeMap;
    };
    const sanitizeBlockedPlayKeywordMap = (rawKeywordMap) => {
      const safeMap = {};
      const allowedFamilies = ['pingte_xiao', 'te_xiao', 'yi_xiao', 'lian_play'];
      const systemKeywordLookup = new Map([
        ['pingte_xiao', new Set(['平特一肖', '平特肖', '平特', '平肖', '平'])],
        ['te_xiao', new Set(['特肖'])],
        ['yi_xiao', new Set(['一肖'])],
        ['lian_play', new Set([
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
        ])]
      ]);
      if (!rawKeywordMap || typeof rawKeywordMap !== 'object') return safeMap;
      allowedFamilies.forEach((family) => {
        const rawTokens = Array.isArray(rawKeywordMap[family]) ? rawKeywordMap[family] : [];
        const seen = new Set();
        const safeTokens = [];
        rawTokens.forEach((tokenRaw) => {
          const token = String(tokenRaw || '').replace(/\s+/g, '').trim();
          if (!token || token.length > 16) return;
          if (/[\r\n]/.test(token)) return;
          if (!/[\u4e00-\u9fa5A-Za-z]/.test(token)) return;
          if (/^[0-9０-９]+$/.test(token)) return;
          if (token.length < 2 && family !== 'pingte_xiao') return;
          if (/^(?:元|块|米|蚊|毛|角|分|闷|号|碼|码|各|买|都)$/u.test(token)) return;
          if ((systemKeywordLookup.get(family) || new Set()).has(token)) return;
          if (seen.has(token)) return;
          seen.add(token);
          safeTokens.push(token);
        });
        if (safeTokens.length > 0) {
          safeMap[family] = safeTokens;
        }
      });
      return safeMap;
    };
    const isSupportedAnchorToken = (rawToken) => {
      const token = normalizeAnchorToken(rawToken);
      if (!token || token.length > 12) return false;
      if (/^[0-9０-９零〇一二两三四五六七八九十百千万]+$/.test(token)) return false;
      if (reservedAnchorTokens.has(token)) return false;
      return true;
    };
    const sanitizeNoiseRulePattern = (rawPattern) => {
      const normalized = String(rawPattern || '')
        .replace(/\{amount\}/gi, '{金额}')
        .replace(/\s+/g, ' ')
        .trim();
      if (!normalized || normalized.length > 40) return '';
      const placeholders = normalized.match(/\{[^}]+\}/g) || [];
      if (placeholders.some(token => token !== '{金额}')) return '';
      const literal = normalized.replace(/\{金额\}/g, '').trim();
      if (!literal) return '';
      return normalized;
    };
    const sanitizeNoiseRules = (rawNoiseRules) => {
      if (!Array.isArray(rawNoiseRules)) return [];
      const seen = new Set();
      const safeRules = [];
      rawNoiseRules.forEach(item => {
        const candidate = item && typeof item === 'object' && !Array.isArray(item)
          ? item.pattern
          : item;
        const pattern = sanitizeNoiseRulePattern(candidate);
        if (!pattern || seen.has(pattern)) return;
        seen.add(pattern);
        safeRules.push(pattern);
      });
      return safeRules;
    };
    const normalizeAmountDistribute = (rawValue) => {
      const value = String(rawValue || '').trim();
      if (['per_number', 'per_target_equal_split', 'per_entry_equal_split', 'undetermined'].includes(value)) return value;
      if (value === 'combo_number') return 'per_number';
      if (value === 'per_animal') return 'per_target_equal_split';
      return '';
    };
    const normalizeLegacyAliasMode = (rawMode) => {
      const mode = String(rawMode || '').trim();
      if (mode === 'ignore') return 'ignore';
      if (mode === 'per_number') return 'per_number';
      if (mode === 'combo_number') return 'per_number';
      if (mode === 'per_animal') return 'per_target_equal_split';
      const normalized = normalizeAmountDistribute(mode);
      return normalized || '';
    };
    const normalizeOdds = (rawOdds) => {
      const parsed = Number(rawOdds);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
      return NaN;
    };
    const sanitizeAnchorSemantics = (rawSemantics) => {
      const safeAnchors = {};
      if (!rawSemantics || typeof rawSemantics !== 'object') return safeAnchors;
      Object.entries(rawSemantics).forEach(([rawToken, rawRule]) => {
        const token = normalizeAnchorToken(rawToken);
        if (!isSupportedAnchorToken(token)) return;
        if (!rawRule || typeof rawRule !== 'object') return;
        const amountDistribute = normalizeAmountDistribute(rawRule.amountDistribute);
        if (!amountDistribute) return;
        const rule = {
          amountDistribute,
          enabled: rawRule.enabled !== false,
          tokenType: normalizeAnchorTokenType(rawRule.tokenType, token),
          position: normalizeAnchorPosition(rawRule.position),
          boundary: normalizeAnchorBoundary(rawRule.boundary),
          priority: normalizeAnchorPriority(rawRule.priority)
        };
        const odds = normalizeOdds(rawRule.odds);
        if (Number.isFinite(odds)) {
          rule.odds = odds;
        }
        if (typeof rawRule.notes === 'string' && rawRule.notes.trim()) {
          rule.notes = rawRule.notes.trim().slice(0, 80);
        }
        safeAnchors[token] = rule;
      });
      return safeAnchors;
    };
    const sanitizeRuleProfile = (rawProfile) => {
      const profile = rawProfile && typeof rawProfile === 'object' ? rawProfile : {};
      const safeProfile = {};

      const defaultOdds = normalizeOdds(profile.defaultOdds);
      if (Number.isFinite(defaultOdds)) {
        safeProfile.defaultOdds = defaultOdds;
      }

      const anchors = sanitizeAnchorSemantics(profile.anchorSemantics);
      if (Object.keys(anchors).length > 0) {
        safeProfile.anchorSemantics = anchors;
      }

      const noiseRules = sanitizeNoiseRules(profile.noiseRules);
      if (noiseRules.length > 0) {
        safeProfile.noiseRules = noiseRules;
      }

      const amountUnits = sanitizeAmountUnits(profile.amountUnits);
      if (amountUnits.length > 0) {
        safeProfile.amountUnits = amountUnits;
      }

      const combinePolicy = String(profile.attributeCombinePolicy || '').trim();
      if (['intersection', 'union', 'intersection_then_union_fallback', 'confirm'].includes(combinePolicy)) {
        safeProfile.attributeCombinePolicy = combinePolicy;
      }

      const ambiguityPolicy = String(profile.ambiguityPolicy || '').trim();
      if (['confirm', 'auto', 'error'].includes(ambiguityPolicy)) {
        safeProfile.ambiguityPolicy = ambiguityPolicy;
      }

      const anchorParseMode = String(profile.anchorParseMode || '').trim();
      if (['strict', 'loose'].includes(anchorParseMode)) {
        safeProfile.anchorParseMode = anchorParseMode;
      }

      if (profile.symbolPolicy && typeof profile.symbolPolicy === 'object') {
        const symbolPolicy = {};
        Object.entries(profile.symbolPolicy).forEach(([rawSymbol, rawPolicy]) => {
          const symbol = String(rawSymbol || '').trim();
          const policy = String(rawPolicy || '').trim();
          if (!symbol || symbol.length > 3) return;
          if (!['noise', 'unit', 'marker', 'error'].includes(policy)) return;
          symbolPolicy[symbol] = policy;
        });
        if (Object.keys(symbolPolicy).length > 0) {
          safeProfile.symbolPolicy = symbolPolicy;
        }
      }

      if (profile.regionPolicy && typeof profile.regionPolicy === 'object') {
        const regionPolicy = {};
        const defaultRegion = String(profile.regionPolicy.defaultRegion || '').trim();
        if (['new_ao', 'old_ao', 'hongkong'].includes(defaultRegion)) {
          regionPolicy.defaultRegion = defaultRegion;
        }
        if (typeof profile.regionPolicy.separateStatsByRegion === 'boolean') {
          regionPolicy.separateStatsByRegion = profile.regionPolicy.separateStatsByRegion;
        }
        const regionAliases = sanitizeRegionAliasMap(profile.regionPolicy.regionAliases);
        if (Object.keys(regionAliases).length > 0) {
          regionPolicy.regionAliases = regionAliases;
        }
        if (typeof profile.regionPolicy.canonicalAlwaysShowRegion === 'boolean') {
          regionPolicy.canonicalAlwaysShowRegion = profile.regionPolicy.canonicalAlwaysShowRegion;
        }
        if (Object.keys(regionPolicy).length > 0) {
          safeProfile.regionPolicy = regionPolicy;
        }
      }

      const blockedPlayKeywords = sanitizeBlockedPlayKeywordMap(profile.blockedPlayKeywords);
      if (Object.keys(blockedPlayKeywords).length > 0) {
        safeProfile.blockedPlayKeywords = blockedPlayKeywords;
      }

      if (typeof profile.tailShorthandAsSeparateGroups === 'boolean') {
        safeProfile.tailShorthandAsSeparateGroups = profile.tailShorthandAsSeparateGroups;
      }

      return safeProfile;
    };
    const isRuleProfileEmpty = (profile) => !profile || Object.keys(profile).length === 0;

    const safe = {
      overrides: {},
      hidden: [],
      anchorAliases: {},
      globalRules: {},
      clientRules: {}
    };
    if (!config || typeof config !== 'object') return safe;

    if (config.overrides && typeof config.overrides === 'object') {
      Object.entries(config.overrides).forEach(([key, values]) => {
        if (!key || !Array.isArray(values)) return;
        const numbers = values
          .map(v => parseInt(v, 10))
          .filter(v => Number.isInteger(v) && v >= 1 && v <= 49);
        safe.overrides[key] = Array.from(new Set(numbers)).sort((a, b) => a - b);
      });
    }

    if (Array.isArray(config.hidden)) {
      safe.hidden = Array.from(new Set(config.hidden.filter(v => typeof v === 'string' && v.trim())));
    }

    const anchorAliasesFromInput = {};
    if (config.anchorAliases && typeof config.anchorAliases === 'object') {
      Object.entries(config.anchorAliases).forEach(([rawToken, rawMode]) => {
        const token = normalizeAnchorToken(rawToken);
        const mode = String(rawMode || '').trim();
        if (!token) return;
        if (token.length > 12) return;
        if (!/[\u4e00-\u9fa5A-Za-z]/.test(token)) return;
        if (!['per_number', 'combo_number', 'per_animal', 'ignore'].includes(mode)) return;
        anchorAliasesFromInput[token] = mode;
      });
    }

    safe.anchorAliases = anchorAliasesFromInput;

    if (config.globalRules && typeof config.globalRules === 'object') {
      safe.globalRules = sanitizeRuleProfile(config.globalRules);
    }

    if (config.clientRules && typeof config.clientRules === 'object') {
      Object.entries(config.clientRules).forEach(([rawClientId, rawProfile]) => {
        const clientId = String(rawClientId || '').trim();
        if (!clientId) return;
        const sanitizedProfile = sanitizeRuleProfile(rawProfile);
        if (isRuleProfileEmpty(sanitizedProfile)) return;
        safe.clientRules[clientId] = sanitizedProfile;
      });
    }

    if (Object.keys(safe.globalRules).length === 0 && Object.keys(anchorAliasesFromInput).length > 0) {
      const anchorSemantics = {};
      Object.entries(anchorAliasesFromInput).forEach(([token, mode]) => {
        const mapped = normalizeLegacyAliasMode(mode);
        if (!mapped) return;
        if (mapped === 'ignore') {
          anchorSemantics[token] = { amountDistribute: 'per_number', enabled: false };
          return;
        }
        anchorSemantics[token] = { amountDistribute: mapped, enabled: true };
      });
      if (Object.keys(anchorSemantics).length > 0) {
        safe.globalRules = { anchorSemantics };
      }
    }

    if (Object.keys(safe.anchorAliases).length === 0 && safe.globalRules.anchorSemantics && typeof safe.globalRules.anchorSemantics === 'object') {
      Object.entries(safe.globalRules.anchorSemantics).forEach(([token, rule]) => {
        if (!rule || typeof rule !== 'object') return;
        if (rule.enabled === false) {
          safe.anchorAliases[token] = 'ignore';
          return;
        }
        const distribute = normalizeAmountDistribute(rule.amountDistribute);
        if (!distribute) return;
        if (distribute === 'per_target_equal_split') {
          safe.anchorAliases[token] = 'per_animal';
          return;
        }
        if (distribute === 'per_entry_equal_split') {
          safe.anchorAliases[token] = 'combo_number';
          return;
        }
        safe.anchorAliases[token] = 'per_number';
      });
    }

    return safe;
  }

  loadAttributeConfig() {
    try {
      if (!fs.existsSync(this.attributeConfigPath)) {
        return { overrides: {}, hidden: [], anchorAliases: {}, globalRules: {}, clientRules: {} };
      }
      const raw = fs.readFileSync(this.attributeConfigPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return this.sanitizeAttributeConfig(parsed);
    } catch (error) {
      console.error('加载属性配置失败:', error);
      return { overrides: {}, hidden: [], anchorAliases: {}, globalRules: {}, clientRules: {} };
    }
  }

  saveAttributeConfig(config) {
    try {
      const sanitized = this.sanitizeAttributeConfig(config);
      fs.writeFileSync(this.attributeConfigPath, JSON.stringify(sanitized, null, 2));
      return true;
    } catch (error) {
      console.error('保存属性配置失败:', error);
      throw error;
    }
  }

  // 导出用户数据
  exportUserData(filePath) {
    try {
      const data = this.loadUserData();
      const exportData = {
        version: '1.0',
        exportTime: new Date().toISOString(),
        data: data
      };
      
      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
      console.log('用户数据导出成功:', filePath);
      return true;
    } catch (error) {
      console.error('导出用户数据失败:', error);
      throw error;
    }
  }

  // 导入用户数据
  importUserData(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('导入文件不存在');
      }

      const data = fs.readFileSync(filePath, 'utf-8');
      const parsedData = JSON.parse(data);
      
      // 检查导入数据格式
      if (!parsedData.data || !this.validateUserData(parsedData.data)) {
        throw new Error('导入数据格式无效');
      }

      // 创建备份
      this.createBackup();

      // 保存导入的数据
      this.saveUserData(parsedData.data);
      
      console.log('用户数据导入成功');
      return parsedData.data;
    } catch (error) {
      console.error('导入用户数据失败:', error);
      throw error;
    }
  }

  // 获取数据统计信息
  getDataStatistics() {
    try {
      const data = this.loadUserData();
      const stats = {
        totalUsers: Object.keys(data).length,
        totalRecords: 0,
        totalOriginalData: 0,
        lastModified: null
      };

      for (const userData of Object.values(data)) {
        if (userData && userData.regions && typeof userData.regions === 'object') {
          for (const regionData of Object.values(userData.regions)) {
            stats.totalRecords += Array.isArray(regionData.data) ? regionData.data.length : 0;
            stats.totalOriginalData += Array.isArray(regionData.originalData) ? regionData.originalData.length : 0;
          }
        } else {
          stats.totalRecords += Array.isArray(userData.data) ? userData.data.length : 0;
          stats.totalOriginalData += Array.isArray(userData.originalData) ? userData.originalData.length : 0;
        }
      }

      // 获取文件修改时间
      if (fs.existsSync(this.userDataPath)) {
        const stat = fs.statSync(this.userDataPath);
        stats.lastModified = stat.mtime;
      }

      return stats;
    } catch (error) {
      console.error('获取数据统计失败:', error);
      return null;
    }
  }

  // 清理无效数据
  cleanupData() {
    try {
      const data = this.loadUserData();
      let cleanedCount = 0;

      for (const [userName, userData] of Object.entries(data)) {
        // 移除值为0的数据项
        userData.data = userData.data.filter(item => item.value > 0);
        
        // 重新计算总数
        userData.totalCount = userData.data.reduce((sum, item) => sum + item.value, 0);
        
        cleanedCount++;
      }

      if (cleanedCount > 0) {
        this.saveUserData(data);
        console.log(`数据清理完成，处理了 ${cleanedCount} 个用户`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('数据清理失败:', error);
      return 0;
    }
  }

  // 删除用户数据
  deleteUserData(userName) {
    try {
      const data = this.loadUserData();
      
      if (data[userName]) {
        delete data[userName];
        this.saveUserData(data);
        console.log(`用户 ${userName} 的数据已删除`);
        return true;
      } else {
        console.warn(`用户 ${userName} 不存在`);
        return false;
      }
    } catch (error) {
      console.error('删除用户数据失败:', error);
      return false;
    }
  }

  // 清空所有数据
  clearAllData() {
    try {
      this.createBackup();
      fs.writeFileSync(this.userDataPath, JSON.stringify({}, null, 2));
      console.log('所有用户数据已清空');
      return true;
    } catch (error) {
      console.error('清空数据失败:', error);
      return false;
    }
  }
}

module.exports = UserModel;
