function checkTrialExpiration() {
    console.log('检查看看有没有过期');
    const installDateKey = 'installDate'; // 首次安装日期的键
    const lastRunDateKey = 'lastRunDate'; // 上次运行日期的键
    const expirationDays = 1; // 试用期7天
    const currentDate = new Date(); // 当前日期
    
    let installDate = localStorage.getItem(installDateKey);
    let lastRunDate = localStorage.getItem(lastRunDateKey);

    if (!installDate) {
      installDate = currentDate.toISOString();
      localStorage.setItem(installDateKey, installDate);
      console.log('首次运行，记录安装日期:', installDate);
    }

    if (lastRunDate) {
      const savedLastRunDate = new Date(lastRunDate);
      if (currentDate < savedLastRunDate) {
        alert('检测到系统时间异常，软件功能已禁用。');
        disableSoftware(); // 禁用软件功能
        return;
      }
    }
  
    localStorage.setItem(lastRunDateKey, currentDate.toISOString());

    const savedInstallDate = new Date(installDate);
    const timeDiff = currentDate.getTime() - savedInstallDate.getTime();
    const dayDiff = timeDiff / (1000 * 60 * 60 * 24); // 转换为天数
    
    if (dayDiff > expirationDays) {
      alert('您的试用期已过，软件功能已禁用。');
      disableSoftware(); // 禁用软件功能
    } else {
      console.log(`软件正常运行，已使用 ${Math.floor(dayDiff)} 天。`);
    }
}

function disableSoftware() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      button.disabled = true; // 禁用所有按钮
    });
  
    document.body.innerHTML = '<h1>试用期已过，软件已禁用。</h1>';
}
