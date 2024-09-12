// public/renderer.js
const { ipcRenderer } = require('electron');

let users = {};  // 用户数据
let currentUser = null;  // 当前选中的用户

// 页面加载时请求主进程加载用户数据
ipcRenderer.send('load-user-data');

// 当收到用户数据加载完成的消息时，更新视图
ipcRenderer.on('user-data-loaded', (event, userData) => {
  console.log('Received user data:', userData);
  users = userData || {};
  renderUserList();
  const sortedUsers = Object.keys(users).sort((a, b) => (users[b].totalCount || 0) - (users[a].totalCount || 0));
  if (sortedUsers.length > 0) {
    switchUser(sortedUsers[0]);
  }
});

// 保存用户数据
function saveUserData() {
  ipcRenderer.send('save-user-data', users);
}

// 切换用户
function switchUser(userName) {
  currentUser = userName;
  document.getElementById('currentUser').textContent = `当前用户: ${currentUser}`;
  renderSection('section1');
  renderSection('section2');
  renderSortedResults();
  renderOriginalData();
  renderUserList();
  updateTitles();
}

// 更新用户列表
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

// 删除用户
function deleteUser(userName) {
  if (confirm(`确定要删除用户 ${userName} 及其所有数据吗？`)) {
    delete users[userName];
    if (currentUser === userName) {
      currentUser = null;
      document.getElementById('currentUser').textContent = "当前用户: 无";
      document.getElementById('section1').innerHTML = '';
      document.getElementById('section2').innerHTML = '';
    }
    renderUserList();
    saveUserData();
  }
}

// 添加新用户
function addUser() {
  const newUserName = document.getElementById('newUserName').value.trim();
  if (newUserName && !users[newUserName]) {
    users[newUserName] = { data: generateData(), originalData: [], totalCount: 0 };
    switchUser(newUserName);
    saveUserData();
    document.getElementById('newUserName').value = '';
  } else if (users[newUserName]) {
    alert('该用户名已存在');
  } else {
    alert('请输入有效的用户名');
  }
}

// 数据生成（从1到49编号）
function generateData() {
  const animals = ['龙', '虎', '兔', '鼠', '蛇', '猪', '马', '羊', '猴', '鸡', '狗', '猪'];
  const data = [];
  for (let i = 1; i <= 49; i++) {
    const number = i < 10 ? `0${i}` : `${i}`;
    const text = animals[i % animals.length];
    data.push({ number, text, value: 0 });  // 初始值为0
  }
  return data;
}

// 更新页面标题
function updateTitles() {
  const sortedResultsTitle = document.getElementById('sortedResultsTitle');
  const originalDataTitle = document.getElementById('originalDataTitle');

  if (currentUser) {
    sortedResultsTitle.textContent = `${currentUser} 累计值排序 (总值: ${users[currentUser].totalCount || 0})：`;
    originalDataTitle.textContent = `${currentUser} 原始输入数据：`;
  } else {
    sortedResultsTitle.textContent = '没有选择用户';
    originalDataTitle.textContent = '没有原始输入数据';
  }
}

// 渲染汇总部分
function renderSection(sectionId) {
  const section = document.getElementById(sectionId);
  section.innerHTML = '';  // 清空内容

  if (currentUser && users[currentUser]) {
    users[currentUser].data.forEach(item => {
      const div = document.createElement('div');
      div.classList.add('item');
      div.innerHTML = `<span>${item.number} ${item.text}</span> <span>${item.value}</span>`;
      section.appendChild(div);
    });
  }
}

// 渲染排序结果
function renderSortedResults() {
  const sortedResultsElement = document.getElementById('sortedResults');
  sortedResultsElement.innerHTML = '';  // 清空内容

  if (currentUser && users[currentUser]) {
    const sortedData = users[currentUser].data.slice().sort((a, b) => b.value - a.value);

    sortedData.forEach(item => {
      if (item.value > 0) {  // 只显示累计值大于0的数据
        const li = document.createElement('li');
        li.textContent = `${item.number} ${item.text} - ${item.value}`;
        sortedResultsElement.appendChild(li);
      }
    });
  }
}

// 渲染原始数据
function renderOriginalData() {
  const originalDataElement = document.getElementById('originalDataList');
  originalDataElement.innerHTML = '';  // 清空内容

  if (currentUser && users[currentUser]) {
    users[currentUser].originalData.forEach(data => {
      const li = document.createElement('li');
      li.textContent = data;
      originalDataElement.appendChild(li);
    });
  }
}

// 清除用户数据
function clearUserData() {
  if (confirm('确定要清空所有用户的账号和数据吗？')) {
    users = {};  // 清空整个 users 对象
    currentUser = null;  // 清空当前用户
    document.getElementById('currentUser').textContent = "当前用户: 无";
    renderUserList();
    document.getElementById('section1').innerHTML = '';  // 清空表格显示
    document.getElementById('section2').innerHTML = '';
    document.getElementById('sortedResults').innerHTML = '';  // 清空排序结果
    document.getElementById('originalDataList').innerHTML = '';  // 清空原始数据
    saveUserData();  // 保存清空操作
  }
}
function openModal(modalType) {
  const modal = document.getElementById("myModal");
  const modalTitle = document.getElementById('modalTitle');
  const modalContent = document.getElementById('modalContent');

  if (modalType === 'recognize') {
    modalTitle.textContent = "粘贴消息进行识别";
    modalContent.innerHTML = `
      <textarea id="message" rows="4" cols="50" placeholder="输入消息，例如: 14.21.13.39.38.30.26.18.33～各20"></textarea>
      <button onclick="previewMessage()">识别</button>
      <pre id="result"></pre> <!-- 确保此元素存在 -->
    `;
  }

  modal.style.display = "block";
}

function previewMessage() {
  const message = document.getElementById('message').value.trim(); // 获取输入的消息内容
  if (!message) {
      alert('请输入消息');
      return;
  }

  // 更新正则表达式，支持 "各" 或 "各号" 的情况
  const regex = /([\d\s\-—,，.。、]+)各(号)?(\d+)[米]?/g;
  let resultText = '';
  let match;

  while ((match = regex.exec(message)) !== null) {
      const numbers = match[1].trim().split(/[\s\-—,，.。、]+/).filter(Boolean); // 提取所有数字并去掉空值
      const value = match[3]; // 提取 "各" 或 "号" 后面的值
      resultText += `${numbers.join(' ')} 值：${value}\n`; // 将数字和值按格式拼接
  }

  document.getElementById('result').textContent = resultText || '无法解析消息，请检查输入格式';
}

function confirmEdit() {
  const resultText = document.getElementById('result').textContent.trim();

  if (currentUser && resultText) {
      // 将识别出的数字与对应的值更新到当前用户的数据中
      const resultLines = resultText.split('\n');
      // 保存识别到的原始消息
      if (!users[currentUser]) {
          console.error('当前用户不存在');
          return;
      }
      users[currentUser].originalData.push(resultText);

      resultLines.forEach(line => {
          // 先匹配所有的数字和对应的值
          const match = line.match(/((\d+)[\s.,\-]*)+值[:：]\s*(\d+)/);

          if (match) {
              const allNumbers = match[0].match(/\d+/g);  // 提取出所有的数字
              const value = parseInt(match[match.length - 1], 10);  // 获取 "值: " 后的数值

              if (!isNaN(value)) {
                  allNumbers.forEach(number => {
                      // 查找当前用户的数据并更新
                      const item = users[currentUser].data.find(i => i.number === number.padStart(2, '0'));
                      if (item) {
                          // 累加相应数字的值
                          item.value += value;
                      } else {
                          console.warn(`未找到匹配的号码: ${number}`);
                      }
                  });
              }
          }
      });

      // 重新计算当前用户的总值 (totalCount)
      let totalCount = 0;
      if (users[currentUser] && users[currentUser].data) {
          users[currentUser].data.forEach(item => {
              totalCount += item.value;
          });
      }
      users[currentUser].totalCount = totalCount; // 更新用户总值

      // 更新用户显示
      renderSortedResults();
      renderOriginalData();
      updateTitles();
      renderUserList();
      saveUserData();

      // 确保保存了正确的用户数据
      console.log("更新后的用户总值:", users[currentUser].totalCount);
      console.log("保存后的用户数据:", users[currentUser]);

      // 关闭模态框
      closeModal();
  } else {
      alert('无法更新数据，请确保当前有选中的用户或识别结果有效');
  }
}

// 关闭模态框函数
window.closeModal = function() {
  const modal = document.getElementById("myModal");
  modal.style.display = "none";
}
// 渲染用户列表，确保UI更新
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

function handleSummary() {
  const summaryData = generateData(); // 初始化汇总数据
  let allOriginalData = []; // 存储所有用户的原始输入数据
  let totalSummaryValue = 0; // 汇总的总值
  isSummaryMode = true; // 标记为汇总模式

  // 遍历所有用户并累计每个号码的值，同时收集原始输入数据
  Object.entries(users).forEach(([userName, user]) => {
      user.data.forEach((item, index) => {
          summaryData[index].value += item.value; // 累加每个号码的值
      });
      totalSummaryValue += user.totalCount || 0;  // 汇总所有用户的总值

      // 收集所有用户的原始输入数据
      user.originalData.forEach((data, idx) => {
          allOriginalData.push(`${userName} 的原始数据 ${idx + 1}: ${data}`);
      });
  });

  // 更新汇总标题，显示总汇总值
  document.getElementById('sortedResultsTitle').textContent = `所有用户累计值排序 (总值: ${totalSummaryValue})：`;

  renderSummary(summaryData);  // 渲染汇总区域
  renderSortedSummary(summaryData);  // 渲染汇总排序结果
  renderAllOriginalData(allOriginalData);  // 显示所有用户的原始输入数据
  saveUserData();  // 保存汇总状态
}

// 渲染汇总区域
function renderSummary(summaryData) {
  const section = document.getElementById('section2');
  section.innerHTML = ''; // 清空汇总区域

  summaryData.forEach(item => {
      const div = document.createElement('div');
      div.classList.add('item');
      div.innerHTML = `<span>${item.number} ${item.text}</span> <span>${item.value}</span>`;
      section.appendChild(div);
  });
}

// 渲染汇总排序结果
function renderSortedSummary(summaryData) {
  const sortedResultsElement = document.getElementById('sortedResults');
  sortedResultsElement.innerHTML = ''; // 清空排序结果

  const sortedData = summaryData.slice().sort((a, b) => b.value - a.value);

  sortedData.forEach(item => {
      if (item.value > 0) { // 只显示累计值大于0的数据
          const li = document.createElement('li');
          li.textContent = `${item.number} ${item.text} - ${item.value}`;
          sortedResultsElement.appendChild(li);
      }
  });
}

// 显示所有用户的原始输入数据
function renderAllOriginalData(allOriginalData) {
  const originalDataElement = document.getElementById('originalDataList');
  originalDataElement.innerHTML = ''; // 清空原始数据

  allOriginalData.forEach(data => {
      const li = document.createElement('li');
      li.textContent = data;
      originalDataElement.appendChild(li);
  });
}
