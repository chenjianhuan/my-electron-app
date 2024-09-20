// public/renderer.js
const { ipcRenderer } = require('electron');

let users = {};  // 用户数据
let currentUser = null;  // 当前选中的用户
let isSummaryMode = false; // 确保在文件开头定义
// 定义赔率变量
const ODDS = 47;
// 以下是其他逻辑代码


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
  isSummaryMode = false;
  document.getElementById('currentUser').textContent = `当前用户: ${currentUser}`;
  updateTitles();

  renderSection('section1');
  renderSection('section2');
  renderSortedResults();
  renderOriginalData();
  renderUserList();
  console.log('退出汇总模式:', isSummaryMode);

}

// 更新用户列表
function renderUserList() {
  const userListElement = document.getElementById('userList');
  userListElement.innerHTML = '';

  const sortedUsers = Object.keys(users).sort((a, b) => (users[b].totalCount || 0) - (users[a].totalCount || 0));
  sortedUsers.forEach(user => {
    const li = document.createElement('li');
    li.textContent = `${user} (总: ${users[user].totalCount || 0})`;
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
function updateTitles(count = 0) {
  const sortedResultsTitle = document.getElementById('sortedResultsTitle');
  const originalDataTitle = document.getElementById('originalDataTitle');

  if (isSummaryMode) {
    // 汇总模式时显示所有用户的汇总数据
    sortedResultsTitle.textContent = `所有用户累计值排序 (总: ${count})：`; // 显示汇总的总值
    originalDataTitle.textContent = `所有用户的原始输入数据：`;
  } else if (currentUser) {
    // 正常模式时显示当前用户数据
    sortedResultsTitle.textContent = `${currentUser} 累计值排序 (总: ${users[currentUser].totalCount || 0})`;
    originalDataTitle.textContent = `${currentUser} 原始输入数据：`;
  } else {
    // 没有选择用户时的默认标题
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


// 渲染排序结果（单用户模式和汇总模式通用）
function renderSortedResults() {
  const sortedResultsElement = document.getElementById('sortedResults');
  sortedResultsElement.innerHTML = ''; // 清空内容

  // 计算 totalCount，根据模式不同选择合适的 totalCount
  let totalCountSum = 0;
  let dataToRender = [];

  if (isSummaryMode) {
    // 汇总模式下，计算所有用户的 totalCount 累加，并使用 summaryData 渲染
    totalCountSum = Object.values(users).reduce((sum, user) => sum + user.totalCount, 0);
    dataToRender = generateData().map((item, index) => {
      // 汇总每个号码的值
      item.value = Object.values(users).reduce((sum, user) => sum + user.data[index].value, 0);
      return item;
    });
  } else if (currentUser && users[currentUser]) {
    // 单用户模式下，计算当前用户的 totalCount 并使用用户数据渲染
    totalCountSum = users[currentUser].totalCount;
    dataToRender = users[currentUser].data.slice();
  }

  // 排序数据并渲染
  const sortedData = dataToRender.slice().sort((a, b) => b.value - a.value);
  sortedData.forEach(item => {
    if (item.value > 0) { // 只显示累计值大于0的数据
      // 计算盈亏
      const profitOrLoss = totalCountSum - (item.value * ODDS);

      // 创建列表项
      const li = document.createElement('li');

      // 创建盈亏数字部分的 span 标签
      const profitOrLossSpan = document.createElement('span');
      profitOrLossSpan.textContent = `${profitOrLoss}`;

      // 设置盈亏数字的颜色
      if (profitOrLoss < 0) {
        profitOrLossSpan.style.color = 'red'; // 负数为红色
      } else {
        profitOrLossSpan.style.color = 'green'; // 正数为绿色
      }

      // 设置列表项的文本内容
      li.textContent = `${item.number} ${item.text} - 金额：${item.value} 盈亏：`;
      li.appendChild(profitOrLossSpan); // 将盈亏数字部分添加到列表项中

      // 添加点击事件
      li.onclick = () => handleCellClick(item.number);
      sortedResultsElement.appendChild(li);
    }
  });
}




// 渲染原始数据
function renderOriginalData() {
  const originalDataElement = document.getElementById('originalDataList');
  originalDataElement.innerHTML = '';  // 清空内容

  if (currentUser && users[currentUser]) {
    users[currentUser].originalData.forEach(data => {
      const li = document.createElement('li');
      li.innerHTML = data.replace(/\n/g, "<br>"); // 将换行符替换为 <br> 标签，实现换行
      li.style.whiteSpace = 'pre-wrap'; // 保证内容中的换行符生效
      li.style.textAlign = 'left'; // 设置内容靠左对齐
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
    updateTitles(); // 确保清空数据后更新UI标题

  }
}
function openModal(modalType) {
  if (isSummaryMode) {
    alert('请先退出汇总模式并选择用户');
    return;
  }

  const modal = document.getElementById("myModal");
  const modalTitle = document.getElementById('modalTitle');
  const messageTextarea = document.getElementById('message'); // 获取 textarea

  // 设置模态框的内容
  if (modalType === 'recognize') {
    modalTitle.textContent = "粘贴消息进行识别";
    messageTextarea.placeholder = "输入消息，例如: 14.21.13.39.38.30.26.18.33～各20";
    modal.style.display = "block";
    setupInputListener(); // 在这里调用 setupInputListener

  }



}




function previewMessage() {
  // 如果处于汇总模式，则不允许操作
  if (isSummaryMode) {
    alert('请先退出汇总模式并选择用户');
    return;
  }

  // 如果没有选中用户，提示创建新用户
  if (!currentUser) {
    alert('请先选择或创建一个用户');
    return;
  }

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
  setupInputListener(true);
  const messageTextarea = document.getElementById('message');
  const resultArea = document.getElementById('result');

  const resultText = document.getElementById('result').textContent.trim();

  console.log('isSummaryMode', isSummaryMode);
  // 如果处于汇总模式，阻止确认操作
  if (isSummaryMode) {
    alert('请先退出汇总模式并选择用户');
    return;
  }

  // 如果当前没有选中用户，阻止操作并提示创建用户
  if (!currentUser) {
    alert('请先选择或创建一个用户');
    return;
  }

  if (resultText) {
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
        // 只提取 "值" 前面的数字部分
        const allNumbers = match[0].split('值')[0].match(/\d+/g);  // 提取所有号码并去掉空值
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

    // 清空输入框和识别结果
    messageTextarea.value = '';
    resultArea.textContent = '';

    closeModal(); // 关闭模态框
  } else {
    alert('无法更新数据，请确保当前有选中的用户或识别结果有效');
  }
}



// 关闭模态框函数
window.closeModal = function () {
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
    li.textContent = `${user} (总: ${users[user].totalCount || 0})`;
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
  console.log('进入汇总模式:', isSummaryMode);


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

  // 更新汇总标题为所有用户累计值
  updateTitles(totalSummaryValue); // 传递 true 表示汇总模式
  renderSummary(summaryData);  // 渲染汇总区域
  renderAllOriginalData(allOriginalData);  // 显示所有用户的原始输入数据
  saveUserData();  // 保存汇总状态
  renderSortedResults();
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

function copyClientData() {
  const sortedResultsElement = document.getElementById('sortedResults');
  const sortedResultsTitleElement = document.getElementById('sortedResultsTitle');
  let copyText = '';

  // 获取当前用户的累计值标题，包含用户名称和总值
  if (sortedResultsTitleElement) {
    copyText += `${sortedResultsTitleElement.textContent}\n\n`; // 添加标题和换行
  }

  // 用于收集所有值相同的号码列表
  let currentValue = null;
  let currentNumbers = [];

  // 获取当前显示的累计排序数据
  if (sortedResultsElement) {
    const items = sortedResultsElement.querySelectorAll('li');
    items.forEach(item => {
      // 提取号码和值，假设格式为 "号码 生肖 - 值"
      const parts = item.textContent.split(' - ');
      const numberWithAnimal = parts[0].trim();  // 提取包含号码和生肖的部分
      const value = parts[1].trim();   // 提取值

      // 仅提取号码部分，去掉生肖部分（假设生肖在号码后面）
      const number = numberWithAnimal.split(' ')[0];

      // 如果当前号码的值与之前的号码值不同，则拼接现有号码并开始新一行
      if (currentValue !== null && currentValue !== value) {
        // 拼接所有号码，并添加 "各" + 对应的值
        copyText += `${currentNumbers.join('-')}各${currentValue}，\n`;
        currentNumbers = [];  // 重置号码列表
      }

      // 更新当前的值
      currentValue = value;
      currentNumbers.push(number);  // 将当前号码加入列表
    });

    // 拼接最后一组号码
    if (currentNumbers.length > 0) {
      copyText += `${currentNumbers.join('-')}各${currentValue}\n`;
    }
  }

  // 将结果复制到剪贴板
  if (copyText) {
    navigator.clipboard.writeText(copyText)
      .then(() => {
        alert('数据已复制到剪贴板');
      })
      .catch(err => {
        console.error('无法复制文本', err);
        alert('复制失败，请稍后重试');
      });
  } else {
    alert('没有可复制的数据');
  }
}


function updateCurrentValue(number) {
  const input = document.getElementById(`editEaten_${number}`).value;  // 获取用户输入的吃的数量
  const item = users[currentUser].data.find(i => i.number === number.toString().padStart(2, '0')); // 转换为字符串再进行查找

  if (item) {
    const currentValueLabel = document.getElementById('currentValueLabel');
    const totalValue = item.value;  // 总值
    const eatenValue = parseInt(input, 10) || 0;  // 如果用户输入无效的值（如空值），则默认吃的数量为0

    // 实时更新当前值的展示（总值 - 吃的数量）
    const updatedValue = totalValue - eatenValue;
    currentValueLabel.textContent = updatedValue >= 0 ? updatedValue : 0;  // 确保值不为负数
  }
}

function saveSingleUserEditedValue(number) {
  const input = document.getElementById(`editEaten_${number}`);

  if (!input) {
    console.error(`元素 editEaten_${number} 未找到`);
    return;
  }

  const eatenValue = parseInt(input.value, 10);  // 获取用户输入的吃的数量并转为数字

  // 找到当前号码对应的对象
  const item = users[currentUser].data.find(i => i.number === number.padStart(2, '0'));

  if (!item) {
    console.error(`未找到号码 ${number} 的数据`);
    return;
  }

  // 检查吃的数量是否大于当前的值
  if (eatenValue > item.value) {
    alert(`吃的数量不能大于当前的值！当前值为 ${item.value}`);
    return;
  }

  if (!isNaN(eatenValue)) {
    item.eaten = eatenValue;  // 更新吃的数量
    item.value = item.value - eatenValue;  // 更新用户数据中的值
    console.log(`更新号码 ${number} 的值为 ${item.value}，吃了 ${eatenValue}`);

    // 重新计算当前用户的 totalCount，只累加 value
    let totalCount = 0;
    users[currentUser].data.forEach(dataItem => {
      totalCount += dataItem.value;
    });
    users[currentUser].totalCount = totalCount;  // 更新 totalCount
    console.log(`新的 totalCount 为 ${totalCount}`);

    // 更新 UI 和保存数据
    renderSortedResults();  // 重新渲染排序结果
    saveUserData();  // 保存数据
    closeEditModal();  // 关闭模态框
    updateTitles();  // 更新页面标题
    renderUserList();
  } else {
    alert('请输入有效的数字');
  }
}



// 保存编辑后的值 (editModal)
function saveEditedValues(number) {
  Object.entries(users).forEach(([userName, user]) => {
    const input = document.getElementById(`editValue_${userName}`);
    if (input) {
      const newValue = parseInt(input.value, 10);
      const item = user.data.find(i => i.number === number.padStart(2, '0'));
      if (item && !isNaN(newValue)) {
        item.value = newValue;  // 更新用户的号码数据
        console.log(`更新 ${userName} 的号码 ${number} 为 ${newValue}`);
      }
    }
  });

  // 保存数据和更新UI
  saveUserData();
  renderSortedResults();  // 重新渲染排序结果
  closeEditModal();
}

function closeEditModal() {
  const modal = document.getElementById("editModal");
  const modalContent = document.getElementById('editModalContent'); // 这里定义 modalContent
  modal.style.display = "none";
  if (modalContent) {
    modalContent.innerHTML = '';  // 确保 modalContent 存在，并且清空内容
  }
}

// 处理单元格点击，调用通用模态框函数
function handleCellClick(number) {
  return;
  console.log('点击事件触发, 当前是否为汇总模式:', isSummaryMode);
  if (isSummaryMode) {
    // 汇总模式，传入所有用户
    const userList = Object.keys(users);
    openEditModal(number, userList);
  } else {
    // 单用户模式，只传入当前用户
    openEditModal(number, [currentUser]);
  }
}

// 通用的模态框函数，接受号码和用户列表
function openEditModal(number, userList) {
  const modal = document.getElementById("editModal");
  const modalTitle = document.getElementById('editModalTitle');
  const modalContent = document.getElementById('editModalContent');

  modalTitle.textContent = `号码 ${number} 的数据详情`;

  // 清空之前的内容
  let content = '<div style="text-align:left;">';

  userList.forEach(user => {
    const item = users[user].data.find(i => i.number === number.padStart(2, '0'));
    if (item) {
      const animal = item.text; // 获取生肖
      const currentValue = item.value - (item.eaten || 0); // 当前值 = 总值 - 已吃的数量

      // 为每个用户添加当前值和输入框
      content += `
        <div style="margin-bottom: 10px;">
          <span>${user} 的值：</span>
          <span id="currentValueLabel_${user}">${currentValue}</span> <!-- 显示当前值 -->
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <label for="editEaten_${user}" style="margin-right: 10px;">吃的数量：</label>
          <input type="number" id="editEaten_${user}" value="${item.eaten || 0}" style="width:60px; margin-left: 10px;" 
                 oninput="updateCurrentValue('${user}', ${number})" />
        </div>
      `;
    }
  });

  content += '</div>';
  modalContent.innerHTML = content;

  // 添加保存按钮
  modalContent.innerHTML += `<button onclick="saveEditedValues('${number}', ${JSON.stringify(userList)})">保存</button>`;

  modal.style.display = "block";
}

// 更新当前值的函数，适用于通用模态框
function updateCurrentValue(user, number) {
  const input = document.getElementById(`editEaten_${user}`).value; // 获取用户输入的吃的数量
  const item = users[user].data.find(i => i.number === number.toString().padStart(2, '0')); // 查找用户的号码数据

  if (item) {
    const currentValueLabel = document.getElementById(`currentValueLabel_${user}`);
    const totalValue = item.value; // 总值
    const eatenValue = parseInt(input, 10) || 0; // 如果用户输入无效的值（如空值），则默认吃的数量为0

    // 实时更新当前值的展示（总值 - 吃的数量）
    const updatedValue = totalValue - eatenValue;
    currentValueLabel.textContent = updatedValue >= 0 ? updatedValue : 0; // 确保值不为负数
  }
}


// 保存编辑后的值 (editModal)
function saveEditedValues(number, userList) {
  userList.forEach(user => {
    const input = document.getElementById(`editEaten_${user}`);
    if (input) {
      const eatenValue = parseInt(input.value, 10); // 获取用户输入的吃的数量
      const item = users[user].data.find(i => i.number === number.padStart(2, '0'));

      if (item && !isNaN(eatenValue)) {
        // 检查吃的数量是否大于当前的值
        if (eatenValue > item.value) {
          alert(`${user} 的吃的数量不能大于当前的值！当前值为 ${item.value}`);
          return;
        }

        // 更新用户的数据
        item.eaten = eatenValue;
        item.value = item.value - eatenValue; // 更新用户数据中的值
        console.log(`更新 ${user} 的号码 ${number} 的值为 ${item.value}，吃了 ${eatenValue}`);
      }
    }
  });

  // 保存数据和更新UI
  saveUserData();
  renderSortedResults(); // 重新渲染排序结果
  closeEditModal();
}

// 监听识别输入框的输入
function setupInputListener(bool) {

  const messageTextarea = document.getElementById('message'); // 获取输入框
  let afterGe = false; // 标记是否已经输入了“各”
  let currentInput = ''; // 用于存储当前输入的数字
  let displayContent = ''; // 用于存储显示的内容
  let isSpeaking = false; // 标记是否正在进行语音播报

  // 如果传入的参数是 true，则清空所有元素
  if (bool === true) {
    messageTextarea.value = ''; // 清空输入框
    afterGe = false;
    currentInput = '';
    displayContent = '';
    console.log('已清空所有元素 displayContent', displayContent);
    updateTextarea();
    messageTextarea.removeEventListener('input');


    return; // 直接返回，不再继续监听输入
  }

  messageTextarea.addEventListener('input', (event) => {
    let inputValue = messageTextarea.value.replace(/[^0-9=]/g, ''); // 获取输入框的当前值，并移除非数字和 "="
    console.log('inputValue', inputValue);

    // 检查是否按下了删除键
    if (event.inputType === 'deleteContentBackward') {
      displayContent = displayContent.slice(0, -1); // 删除当前输入的最后一个字符
      updateTextarea(); // 更新输入框显示
      return;
    }

    // 只获取新输入的部分（添加到 `currentInput`）
    let newChar = inputValue.slice(-1); // 取出输入的最后一个字符
    console.log('newChar', newChar);
    console.log('newChar====displayContent', displayContent);

    // 检查输入的字符是否是数字或 "="
    if (!/^\d$/.test(newChar) && newChar !== '=') {
      // 非数字字符，弹出提示并移除非法字符
      showTemporaryAlert('请输入数字');
      messageTextarea.value = inputValue.slice(0, -1); // 更新输入框的值，移除最后一个字符
      console.log('messageTextarea.value====displayContent', displayContent);

      return; // 退出当前函数
    }

    // 在输入“各”之前
    if (!afterGe && !displayContent.includes('各')) {
      console.log('在输入各之前====displayContent', displayContent);
      // 检查是否输入了 '=' 符号
      if (newChar === '=') {
        afterGe = true;
        // 移除 '=' 符号并更新显示内容
        displayContent += '各';
        updateTextarea();
        if (!isSpeaking) {
          speakText('各');
        }
        currentInput = ''; // 重置当前输入
        return; // 结束当前函数，避免进一步执行
      }

      // 添加到 currentInput 并检查是否有两位数
      currentInput += newChar;
      if (currentInput.length >= 2) {
        let num = currentInput.slice(0, 2); // 提取前两位数字
        let numValue = parseInt(num, 10); // 将字符串转换为数字

        // 检查数字是否在 01-49 范围内
        if (numValue >= 1 && numValue <= 49) {
          displayContent += num + '-'; // 在数字后面添加 '-'
          updateTextarea();
          if (!isSpeaking) {
            speakText(num);
          }
          currentInput = ''; // 重置 currentInput
          newChar = '';
        } else {
          // 非法输入，移除最后一个字符并弹出提示
          currentInput = ''; // 清空当前输入
          newChar = '';
          showTemporaryAlert('请输入 01-49 范围内的数字');
          messageTextarea.value = displayContent; // 恢复显示内容
        }
      }
    } else {
      console.log('在输入各之后====displayContent', displayContent);
      // 在输入“各”之后，只能输入正整数
      currentInput = newChar; // 重置为新输入的数字，只关注 "各" 后面的数字
      console.log('newChar', newChar);

      let remainingInput = currentInput.replace(/\D/g, ''); // 移除非数字字符
      console.log('remainingInput', remainingInput);

      if (/^[1-9]\d*$/.test(remainingInput)) {
        // 输入的是正整数
        displayContent += remainingInput; // 追加输入的数字到显示内容
        console.log('displayContent', displayContent);

        updateTextarea();
        if (!isSpeaking) {
          speakText('下注' + remainingInput);
        }

      } else if (currentInput.length > 0) {
        // 非法输入，清空当前输入
        currentInput = '';
        messageTextarea.value = displayContent; // 恢复显示内容
        showTemporaryAlert('请输入有效的正整数');
      }
    }
  });

  // 更新输入框内容的函数
  function updateTextarea() {
    messageTextarea.value = displayContent;
    console.log('updateTextarea======displayContent', displayContent);

  }

  // 语音播报的函数
  function speakText(text) {
    if ('speechSynthesis' in window) {
      isSpeaking = true; // 标记为正在播报
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN'; // 设置语言为中文
      utterance.onend = () => {
        isSpeaking = false; // 播报结束后，重置状态
      };
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('当前浏览器不支持语音合成功能');
    }
  }

  // 显示临时提示框
  function showTemporaryAlert(message) {
    const alertBox = document.createElement('div');
    alertBox.textContent = message;
    alertBox.style.position = 'fixed';
    alertBox.style.top = '20px';
    alertBox.style.left = '50%';
    alertBox.style.transform = 'translateX(-50%)';
    alertBox.style.backgroundColor = 'red';
    alertBox.style.color = 'white';
    alertBox.style.padding = '10px';
    alertBox.style.borderRadius = '5px';
    document.body.appendChild(alertBox);

    setTimeout(() => {
      document.body.removeChild(alertBox);
    }, 1000);
  }
}




















