const MODULE_IDS = Object.freeze({
  AUTH: 'auth',
  LOTTERY: 'lottery',
  WECHAT: 'wechat',
});

const MODULE_DEFINITIONS = Object.freeze({
  [MODULE_IDS.AUTH]: {
    id: MODULE_IDS.AUTH,
    name: '安全入口',
    file: 'auth.html',
    title: 'MessageCounter - 安全入口',
  },
  [MODULE_IDS.LOTTERY]: {
    id: MODULE_IDS.LOTTERY,
    name: '六合彩统计',
    file: 'index.html',
    title: 'MessageCounter - 网友消息统计',
  },
  [MODULE_IDS.WECHAT]: {
    id: MODULE_IDS.WECHAT,
    name: '微信聊天记录统计',
    file: 'wechat-shell.html',
    title: 'MessageCounter - 微信聊天记录统计',
  },
});

const DEFAULT_PASSWORD_A = '123456';
const DEFAULT_PASSWORD_B = '110';

function normalizePassword(raw) {
  return String(raw || '').normalize('NFKC').trim();
}

function canonicalPassword(raw) {
  return normalizePassword(raw).toLowerCase();
}

function normalizeRouteList(routeList) {
  if (!Array.isArray(routeList)) return [];
  const normalized = [];
  for (const item of routeList) {
    if (!item || typeof item !== 'object') continue;
    const password = normalizePassword(item.password);
    const moduleId = String(item.moduleId || '');
    if (!password) continue;
    if (!MODULE_DEFINITIONS[moduleId] || moduleId === MODULE_IDS.AUTH) continue;
    normalized.push({
      password,
      passwordCanonical: canonicalPassword(password),
      moduleId,
    });
  }
  return normalized;
}

function buildPasswordRoutesFromEnv(env = process.env) {
  const passwordA = normalizePassword(env.MC_PASSWORD_A || DEFAULT_PASSWORD_A);
  const passwordB = normalizePassword(env.MC_PASSWORD_B || DEFAULT_PASSWORD_B);
  return normalizeRouteList([
    { password: passwordA, moduleId: MODULE_IDS.LOTTERY },
    { password: passwordB, moduleId: MODULE_IDS.WECHAT },
  ]);
}

class ModulePasswordRouter {
  constructor(options = {}) {
    this.passwordRoutes = normalizeRouteList(options.passwordRoutes || []);
    this.maxAttempts = Number.isInteger(options.maxAttempts) && options.maxAttempts > 0
      ? options.maxAttempts
      : 5;
    this.lockDurationMs = Number.isInteger(options.lockDurationMs) && options.lockDurationMs > 0
      ? options.lockDurationMs
      : 10_000;

    this.failedAttempts = 0;
    this.lockUntil = 0;
  }

  getLockState(now = Date.now()) {
    const remainingMs = Math.max(0, this.lockUntil - now);
    return {
      locked: remainingMs > 0,
      remainingMs,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      attemptsRemaining: Math.max(0, this.maxAttempts - this.failedAttempts),
      maxAttempts: this.maxAttempts,
    };
  }

  resetFailures() {
    this.failedAttempts = 0;
    this.lockUntil = 0;
  }

  verifyPassword(rawPassword) {
    const password = normalizePassword(rawPassword);
    const passwordCanonical = canonicalPassword(password);
    const matched = this.passwordRoutes.find((item) => item.passwordCanonical === passwordCanonical);
    if (matched) {
      this.resetFailures();
      const module = MODULE_DEFINITIONS[matched.moduleId];
      return {
        ok: true,
        moduleId: matched.moduleId,
        moduleName: module ? module.name : matched.moduleId,
        // Use configured password as stable secret key for encryption/decryption.
        secretKey: matched.password,
      };
    }

    const lockState = this.getLockState();
    if (lockState.locked) {
      return {
        ok: false,
        code: 'LOCKED',
        reason: `尝试次数过多，请 ${lockState.remainingSeconds} 秒后重试`,
        ...lockState,
      };
    }

    if (!password) {
      return {
        ok: false,
        code: 'EMPTY_PASSWORD',
        reason: '请输入密码',
        ...lockState,
      };
    }

    this.failedAttempts += 1;
    let nextState = this.getLockState();
    if (this.failedAttempts >= this.maxAttempts) {
      this.lockUntil = Date.now() + this.lockDurationMs;
      this.failedAttempts = 0;
      nextState = this.getLockState();
      return {
        ok: false,
        code: 'LOCKED',
        reason: `尝试次数过多，请 ${nextState.remainingSeconds} 秒后重试`,
        ...nextState,
      };
    }

    return {
      ok: false,
      code: 'INVALID_PASSWORD',
      reason: '密码错误，请重试',
      ...nextState,
    };
  }
}

module.exports = {
  MODULE_IDS,
  MODULE_DEFINITIONS,
  ModulePasswordRouter,
  buildPasswordRoutesFromEnv,
  DEFAULT_PASSWORD_A,
  DEFAULT_PASSWORD_B,
};
