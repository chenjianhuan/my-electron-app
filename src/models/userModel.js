// src/models/UserModel.js
const fs = require('fs');
const path = require('path');

class UserModel {
  constructor(app) {
    // 定义存储用户数据的文件路径
    this.userDataPath = path.join(app.getPath('userData'), 'userData.json');
  }

  // 加载用户数据
  loadUserData() {
    try {
      if (fs.existsSync(this.userDataPath)) {
        const data = fs.readFileSync(this.userDataPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    return {};
  }

  // 保存用户数据
  saveUserData(data) {
    try {
      fs.writeFileSync(this.userDataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }
}

module.exports = UserModel;
