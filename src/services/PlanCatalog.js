const BILLING_CYCLES = ['lifetime'];
const PLAN_TIERS = ['plus', 'pro'];

const PLAN_DEFINITIONS = {
  plus: {
    key: 'plus',
    name: 'Plus',
    prices: {
      lifetime: 1499,
    },
    currency: 'CNY',
    description: '核心录入与统计场景，适合稳定手工录入（永久授权）',
    features: [
      '手动录入主链路：消息批量录入，自动解析数字/生肖并实时校验格式',
      '统计清晰：多用户独立账本 + 多地区维度统计，切换即看',
      '结果可交付：汇总排序、明细筛选、一键复制导出',
      '规则可控：属性词模板选择与自定义属性库维护',
      '买断可用：本地离线保存与基础授权校验能力',
    ],
    capabilities: {
      ocr: false,
      voiceInput: false,
      localAiRewrite: false,
      clipboardAssist: false,
      autoUpdate: false,
    },
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    prices: {
      lifetime: 2999,
    },
    currency: 'CNY',
    description: '高频场景专用，高自动化、高效率（永久授权）',
    features: [
      '包含 Plus 全部能力，并针对高频业务深度优化',
      'OCR 智能识别引擎：图片批量识别、候选排序、低置信提醒、纠错回填',
      '语音录入：离线麦克风录音转文字，并自动回填消息框',
      '本地 AI 语义修正：针对 OCR 脏文本、口语化输入做纠错标准化',
      '微信自动监听中枢：复制即识别、同日去重拦截，显著减少重复工作',
      '持续更新（Pro 专属）：优先获得新规则、新能力与性能优化版本',
    ],
    capabilities: {
      ocr: true,
      voiceInput: true,
      localAiRewrite: true,
      clipboardAssist: true,
      autoUpdate: true,
    },
  },
};

function normalizeTier(tier, fallback = 'plus') {
  const normalized = String(tier || '').toLowerCase();
  if (PLAN_TIERS.includes(normalized)) {
    return normalized;
  }
  return fallback;
}

function normalizeBillingCycle(cycle, fallback = 'lifetime') {
  const normalized = String(cycle || '').toLowerCase();
  // 兼容历史字段：旧授权中的 monthly/yearly 统一视为永久授权。
  if (normalized === 'monthly' || normalized === 'yearly') {
    return 'lifetime';
  }
  if (BILLING_CYCLES.includes(normalized)) {
    return normalized;
  }
  return fallback;
}

function getPlanDefinition(tier) {
  const normalizedTier = normalizeTier(tier);
  const plan = PLAN_DEFINITIONS[normalizedTier];
  return plan || PLAN_DEFINITIONS.plus;
}

function buildPlanContext(options = {}) {
  const tier = normalizeTier(options.tier);
  const billingCycle = normalizeBillingCycle(options.billingCycle);
  const plan = getPlanDefinition(tier);
  const resolvedPrice = Number(plan.prices[billingCycle] || plan.prices.lifetime || 0);

  return {
    tier,
    name: plan.name,
    description: plan.description,
    features: plan.features.slice(),
    currency: plan.currency,
    prices: { ...plan.prices },
    price: resolvedPrice,
    billingCycle,
    source: options.source || 'license',
    capabilities: { ...plan.capabilities },
  };
}

function getPublicPlanCatalog() {
  return {
    defaultTier: 'plus',
    defaultBillingCycle: 'lifetime',
    plans: PLAN_TIERS.map((tier) => {
      const plan = PLAN_DEFINITIONS[tier];
      return {
        key: plan.key,
        name: plan.name,
        description: plan.description,
        features: plan.features.slice(),
        currency: plan.currency,
        prices: { ...plan.prices },
        capabilities: { ...plan.capabilities },
      };
    }),
  };
}

module.exports = {
  PLAN_TIERS,
  BILLING_CYCLES,
  normalizeTier,
  normalizeBillingCycle,
  getPlanDefinition,
  buildPlanContext,
  getPublicPlanCatalog,
};
