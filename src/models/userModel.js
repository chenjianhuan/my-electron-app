// models/userModel.js

const users = {}; // 用于存储所有用户及其数据

// 初始化用户数据
function createUser(name) {
    if (!users[name]) {
        users[name] = {
            data: generateData(),
            originalData: [],
            totalCount: 0
        };
    }
}

// 删除用户
function deleteUser(name) {
    delete users[name];
}

// 获取用户数据
function getUser(name) {
    return users[name];
}

// 更新用户数据
function updateUser(name, newData) {
    users[name] = newData;
}

// 生成初始数据
function generateData() {
    const animals = ['龙', '虎', '兔', '鼠', '蛇', '猪', '马', '羊', '猴', '鸡', '狗', '猪'];
    const data = [];
    for (let i = 1; i <= 49; i++) {
        const number = i < 10 ? `0${i}` : `${i}`;
        const text = animals[i % animals.length];
        data.push({ number, text, value: 0 });
    }
    return data;
}

module.exports = {
    users,
    createUser,
    deleteUser,
    getUser,
    updateUser
};
