// userList.js
const { ipcRenderer } = require('electron');

let users = {};
let currentUser = null;

function loadUserData() {
  ipcRenderer.send('load-user-data');
  ipcRenderer.on('user-data-loaded', (event, userData) => {
    users = userData || {};
    renderUserList();
    const sortedUsers = Object.keys(users).sort((a, b) => (users[b].totalCount || 0) - (users[a].totalCount || 0));
    if (sortedUsers.length > 0) {
      switchUser(sortedUsers[0]);
    }
  });
}

function saveUserData() {
  ipcRenderer.send('save-user-data', users);
}

function addUser(newUserName) {
  if (newUserName && !users[newUserName]) {
    users[newUserName] = { data: generateData(), originalData: [], totalCount: 0 };
    switchUser(newUserName);
    saveUserData();
  } else if (users[newUserName]) {
    alert('该用户名已存在');
  } else {
    alert('请输入有效的用户名');
  }
}

function deleteUser(userName) {
  if (confirm(`确定要删除用户 ${userName} 及其所有数据吗？`)) {
    delete users[userName];
    if (currentUser === userName) {
      currentUser = null;
      resetView();
    }
    saveUserData();
    renderUserList();
  }
}

function switchUser(userName) {
  currentUser = userName;
  updateTitles(currentUser);
  renderUserData(currentUser);
}

function renderUserList() {
  const userListElement = document.getElementById('userList');
  userListElement.innerHTML = '';

  const sortedUsers = Object.keys(users).sort((a, b) => (users[b].totalCount || 0) - (users[a].totalCount || 0));
  sortedUsers.forEach(user => {
    const li = document.createElement('li');
    li.textContent = `${user} (总值: ${users[user].totalCount || 0})`;
    li.onclick = () => switchUser(user);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = '删除';
    deleteButton.onclick = (event) => {
      event.stopPropagation();
      deleteUser(user);
    };

    li.appendChild(deleteButton);
    userListElement.appendChild(li);
  });
}

module.exports = {
  loadUserData,
  addUser,
  deleteUser,
  switchUser,
  renderUserList
};
