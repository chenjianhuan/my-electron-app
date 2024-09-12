// summary.js

function handleSummary(users) {
    const summaryData = generateData();
    let allOriginalData = [];
    let totalSummaryValue = 0;
  
    Object.entries(users).forEach(([userName, user]) => {
      user.data.forEach((item, index) => {
        summaryData[index].value += item.value;
      });
      totalSummaryValue += user.totalCount || 0;
  
      user.originalData.forEach((data, idx) => {
        allOriginalData.push(`${userName} 的原始数据 ${idx + 1}: ${data}`);
      });
    });
  
    renderSummary(summaryData);
    renderSortedSummary(summaryData);
    renderAllOriginalData(allOriginalData);
    updateSummaryTitle(totalSummaryValue);
  }
  
  function renderSummary(summaryData) {
    const section = document.getElementById('section2');
    section.innerHTML = '';
  
    summaryData.forEach(item => {
      const div = document.createElement('div');
      div.classList.add('item');
      div.innerHTML = `<span>${item.number} ${item.text}</span> <span>${item.value}</span>`;
      section.appendChild(div);
    });
  }
  
  function renderSortedSummary(summaryData) {
    const sortedResultsElement = document.getElementById('sortedResults');
    sortedResultsElement.innerHTML = '';
  
    const sortedData = summaryData.slice().sort((a, b) => b.value - a.value);
    sortedData.forEach(item => {
      if (item.value > 0) {
        const li = document.createElement('li');
        li.textContent = `${item.number} ${item.text} - ${item.value}`;
        sortedResultsElement.appendChild(li);
      }
    });
  }
  
  function renderAllOriginalData(allOriginalData) {
    const originalDataElement = document.getElementById('originalDataList');
    originalDataElement.innerHTML = '';
  
    allOriginalData.forEach(data => {
      const li = document.createElement('li');
      li.textContent = data;
      originalDataElement.appendChild(li);
    });
  }
  
  module.exports = {
    handleSummary
  };
  