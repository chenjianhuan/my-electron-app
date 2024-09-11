// controllers/userController.js
const userModel = require('../models/userModel');

// 添加用户
function addUser(name) {
    userModel.createUser(name);
}

// 删除用户
function removeUser(name) {
    userModel.deleteUser(name);
}

// 识别消息内容
function recognizeMessage(message, currentUser) {
    const regex = /(\d+)[\s,.\-、]*?(各)?\s*(\d+)?/g;
    let match;
    let currentCount = 1; // 默认值为1
    const user = userModel.getUser(currentUser);

    while ((match = regex.exec(message)) !== null) {
        const number = match[1];
        const hasGe = match[2];
        const geValue = match[3];

        if (hasGe && geValue) {
            currentCount = parseInt(geValue, 10);
        }

        // 更新用户数据
        const item = user.data.find(i => i.number === number.padStart(2, '0'));
        if (item) {
            item.value += currentCount;
        }
    }

    userModel.updateUser(currentUser, user);  // 更新用户
}

// 获取用户数据
function getUserData(name) {
    return userModel.getUser(name);
}

module.exports = {
    addUser,
    removeUser,
    recognizeMessage,
    getUserData
};
