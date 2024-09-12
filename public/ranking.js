// ranking.js

function updateRanking(users) {
    const sortedUsers = Object.keys(users).sort((a, b) => users[b].totalCount - users[a].totalCount);
    const rankingElement = document.getElementById('ranking');
    rankingElement.innerHTML = '';
  
    sortedUsers.forEach(user => {
      const li = document.createElement('li');
      li.textContent = `${user} - 总值: ${users[user].totalCount}`;
      rankingElement.appendChild(li);
    });
  }
  
  module.exports = {
    updateRanking
  };
  