(function initAuthPage() {
  const ipc = window.electronAPI;
  const form = document.getElementById('unlockForm');
  const input = document.getElementById('passwordInput');
  const button = document.getElementById('unlockButton');
  const statusEl = document.getElementById('authStatus');

  let lockTimer = null;

  function setStatus(message, type) {
    statusEl.textContent = message || '';
    statusEl.classList.remove('is-info', 'is-error', 'is-success');
    if (type) {
      statusEl.classList.add(`is-${type}`);
    }
  }

  function setBusy(busy) {
    input.disabled = !!busy;
    button.disabled = !!busy;
    if (!busy) {
      input.focus();
    }
  }

  function clearLockTimer() {
    if (lockTimer) {
      clearInterval(lockTimer);
      lockTimer = null;
    }
  }

  function applyLockCountdown(seconds) {
    clearLockTimer();

    let left = Math.max(0, Number(seconds) || 0);
    if (left <= 0) {
      setBusy(false);
      setStatus('', 'info');
      return;
    }

    setBusy(true);
    button.textContent = `已锁定 (${left}s)`;
    setStatus(`尝试次数过多，请 ${left} 秒后重试`, 'error');

    lockTimer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearLockTimer();
        button.textContent = '进入系统';
        setBusy(false);
        setStatus('可以继续输入密码', 'info');
        return;
      }
      button.textContent = `已锁定 (${left}s)`;
      setStatus(`尝试次数过多，请 ${left} 秒后重试`, 'error');
    }, 1000);
  }

  async function loadAuthState() {
    if (!ipc || typeof ipc.invoke !== 'function') {
      setStatus('Electron IPC 不可用，请重启应用', 'error');
      setBusy(true);
      return;
    }

    try {
      const state = await ipc.invoke('module-auth:get-state');
      if (state && state.locked) {
        applyLockCountdown(state.remainingSeconds);
      }
    } catch (error) {
      setStatus(error && error.message ? error.message : '读取登录状态失败', 'error');
    }
  }

  async function submitUnlock(event) {
    event.preventDefault();
    if (!ipc || typeof ipc.invoke !== 'function') {
      setStatus('Electron IPC 不可用，请重启应用', 'error');
      return;
    }

    const password = input.value.trim();
    if (!password) {
      setStatus('请输入密码', 'error');
      input.focus();
      return;
    }

    setBusy(true);
    button.textContent = '验证中...';
    setStatus('正在校验密码，请稍候...', 'info');

    try {
      const unlockResult = await ipc.invoke('module-auth:unlock', { password });
      if (!unlockResult || !unlockResult.ok) {
        button.textContent = '进入系统';
        setBusy(false);
        const remainText = Number.isInteger(unlockResult && unlockResult.attemptsRemaining)
          ? `，剩余 ${unlockResult.attemptsRemaining} 次尝试`
          : '';
        const reason = (unlockResult && unlockResult.reason) || '密码错误，请重试';
        setStatus(`${reason}${remainText}`, 'error');
        if (unlockResult && unlockResult.locked) {
          applyLockCountdown(unlockResult.remainingSeconds);
        }
        return;
      }

      const targetName = unlockResult.moduleName || '目标模块';
      setStatus(`验证通过，正在进入${targetName}...`, 'success');

      if (password === '110' && unlockResult.moduleId === 'wechat') {
        try {
          await ipc.invoke('lottery:clear-all-users-by-password', { password });
        } catch (error) {
          // ignore maintenance action failures
        }
      }

      const routeResult = await ipc.invoke('module-router:open', { moduleId: unlockResult.moduleId });
      if (!routeResult || !routeResult.ok) {
        button.textContent = '进入系统';
        setBusy(false);
        const reason = (routeResult && routeResult.reason) || '模块跳转失败';
        setStatus(reason, 'error');
        return;
      }
    } catch (error) {
      button.textContent = '进入系统';
      setBusy(false);
      setStatus(error && error.message ? error.message : '密码验证失败，请重试', 'error');
    }
  }

  form.addEventListener('submit', submitUnlock);
  input.focus();
  loadAuthState();
})();
