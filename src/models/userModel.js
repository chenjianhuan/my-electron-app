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

    for (const originalData of regionData.originalData) {
      if (typeof originalData !== 'string') {
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
    const safe = {
      overrides: {},
      hidden: []
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
    return safe;
  }

  loadAttributeConfig() {
    try {
      if (!fs.existsSync(this.attributeConfigPath)) {
        return { overrides: {}, hidden: [] };
      }
      const raw = fs.readFileSync(this.attributeConfigPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return this.sanitizeAttributeConfig(parsed);
    } catch (error) {
      console.error('加载属性配置失败:', error);
      return { overrides: {}, hidden: [] };
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
