// 优化后的渲染器主文件
const ipcRenderer = window.electronAPI;

// 全局变量
let isNewInput = true;
const selectedAttributes = new Set();
const ATTRIBUTE_GROUP_ORDER_KEY = 'attributeGroupOrder.v1';
const LEGAL_NOTICE_DISMISSED_KEY = 'legalNoticeDismissed.v1';
let suppressMessageInputNormalization = false;
let draggedAttributeRowIndex = null;
let messageErrorLineNos = [];
let isAttributeEditMode = false;
let attributeSwapSource = null;
let attributeLongPressTimer = null;
let speechVoice = null;
let currentLicenseStatus = null;
let licenseLastUpdatedAt = null;
let appAccessStatus = null;
let currentPlanContext = null;
let planCatalog = null;
let selectedOcrImage = null;
let selectedOcrPreviewUrl = null;
let ocrCandidateResults = [];
let recognizeClipboardMonitoring = false;
let clipboardAssistEnabled = true;
let lastMessageManualInputAt = 0;
let clipboardDuplicateDialogOpen = false;
let clipboardSnapshotImportDialogOpen = false;
let realtimePreviewTimer = null;
let clipboardMonitorStartedAt = 0;
let recognizeEditContext = null;
let recognizeAttributePanelVisible = false;
let recognizeSideGroupState = {
    attributes: true,
    anchors: false
};
let anchorRuleTargetClientId = '';
let anchorGuideState = null;
let anchorGuideHiddenForSession = false;
let anchorGuideAutoExpanded = false;
let anchorGuideFocusTargetIds = [];
let lastRecognizePreviewError = '';
let dashboardSaveState = 'saved';
let dashboardSaveError = '';
let ambiguityChoiceState = null;
let blockedUpgradeAutoShown = false;
let regionWinningNumbers = {
    new_ao: '',
    old_ao: '',
    hongkong: ''
};

const CLIPBOARD_DUP_LEDGER_KEY = 'clipboardDupLedger.v1';
const CLIPBOARD_DUP_KEEP_DAYS = 7;
const CLIPBOARD_ASSIST_HINT_SHOWN_KEY = 'clipboardAssistHintShown.v1';
const CLIPBOARD_ASSIST_ENABLED_KEY = 'clipboardAssistEnabled.v1';
const RECOGNIZE_ATTRIBUTE_PANEL_VISIBLE_KEY = 'recognizeAttributePanelVisible.v1';
const RECOGNIZE_SIDE_GROUP_STATE_KEY = 'recognizeSideGroupState.v1';
const RECOGNIZE_SPLIT_WIDTH_KEY = 'recognizeSplitWidth.v1';
const RECOGNIZE_ATTR_SPLIT_WIDTH_KEY = 'recognizeAttrSplitWidth.v1';
const RECOGNIZE_LAYOUT_PROFILE_VERSION_KEY = 'recognizeLayoutProfileVersion.v3';
const MAIN_SPLIT_USER_WIDTH_KEY = 'mainSplitUserWidth.v1';
const MAIN_SPLIT_MIDDLE_WIDTH_KEY = 'mainSplitMiddleWidth.v1';
const MAIN_SPLIT_ZODIAC_CURRENT_WIDTH_KEY = 'mainSplitZodiacCurrentWidth.v1';
const MAIN_SPLIT_RIGHT_RANK_WIDTH_KEY = 'mainSplitRightRankWidth.v1';
const MAIN_SPLIT_BREAKPOINT = 1200;
const ANCHOR_STRATEGY_GUIDE_STATE_KEY = 'anchorStrategyGuide.v1';
const ANCHOR_SUBGROUP_STATE_KEY = 'anchorSubgroupState.v3';
const RECOGNIZE_SPLIT_MOBILE_BREAKPOINT = 1024;
const RECOGNIZE_SPLIT_MIN_LEFT_DESKTOP = 300;
const RECOGNIZE_SPLIT_MIN_LEFT_COMPACT = 260;
const RECOGNIZE_SPLIT_MIN_RIGHT_DESKTOP = 300;
const RECOGNIZE_SPLIT_MIN_RIGHT_COMPACT = 240;
const RECOGNIZE_ATTR_DOCK_WIDTH_DESKTOP = 480;
const RECOGNIZE_ATTR_DOCK_WIDTH_COMPACT = 420;
const RECOGNIZE_ATTR_MIN_WIDTH_DESKTOP = 280;
const RECOGNIZE_ATTR_MIN_WIDTH_COMPACT = 240;
const RECOGNIZE_ATTR_MAX_WIDTH_DESKTOP = 860;
const RECOGNIZE_ATTR_MAX_WIDTH_COMPACT = 720;
const RECOGNIZE_MESSAGE_MIN_HEIGHT_DESKTOP = 150;
const RECOGNIZE_MESSAGE_MIN_HEIGHT_COMPACT = 132;
const RECOGNIZE_MESSAGE_MAX_VH_RATIO = 0.38;
const REGION_WINNING_NUMBERS_KEY = 'regionWinningNumbers.v1';
const TELEGRAM_SUPPORT_USERNAME = '@Wffftttp';
const TELEGRAM_SUPPORT_LINK = 'https://t.me/Wffftttp';
const TELEGRAM_SUPPORT_QR_PATH = './telegram-braydon-qr.svg?v=20260225';
const ANCHOR_MODE_LABELS = {
    per_number: '每个号码下注金额',
    per_target_equal_split: '每个目标组下注金额（组内平分）',
    per_entry_equal_split: '本段总金额平分到全部号码',
    undetermined: '未确定（解析时弹窗确认）',
    ignore: '忽略该词（不作为锚点）',
    combo_number: '按筛选集合',
    per_animal: '按生肖均分',
};
const ATTRIBUTE_COMBINE_POLICY_LABELS = {
    intersection: '仅交集',
    union: '仅并集',
    intersection_then_union_fallback: '先交集，空则并集',
    confirm: '每次确认'
};
const ANCHOR_PARSE_MODE_LABELS = {
    strict: '严格模式（强制锚点）',
    loose: '宽松模式（自动补锚点）'
};
const ANCHOR_STRATEGY_GROUP_CONFIGS = [
    {
        mode: 'per_number',
        title: '每个号码下注金额',
        summary: '命中到的每一个号码都按同一下注金额计，适合“各/买/都买/每个号”。',
        defaultSample: '猴蛇狗都买10',
        examples: [
            '原始消息：猴蛇狗都买10',
            '锚点词：都买',
            '结果：12个号码每个10，总额120'
        ]
    },
    {
        mode: 'per_target_equal_split',
        title: '每个目标组下注金额（组内平分）',
        summary: '每个目标组先拿下注金额，再在组内号码平分，适合“各肖/各尾/各波/各门”。',
        defaultSample: '猴蛇狗各肖10',
        examples: [
            '原始消息：猴蛇狗各肖10',
            '锚点词：各肖',
            '结果：3组每组10，4个号/组，每号2.5，总额30'
        ]
    },
    {
        mode: 'per_entry_equal_split',
        title: '本段总金额平分到全部号码',
        summary: '把该段金额当总额，平分到该段全部命中号码，适合“平摊/均分/共买”。',
        defaultSample: '猴蛇狗平摊10',
        examples: [
            '原始消息：猴蛇狗平摊10',
            '锚点词：平摊',
            '结果：12个号码平分10，每号0.8333，总额10'
        ]
    },
    {
        mode: 'undetermined',
        title: '未确定（解析时弹窗确认）',
        summary: '出厂默认先不预设策略；首次命中该锚点词时弹窗，让你选择并保存分配策略。',
        defaultSample: '猴蛇狗各肖10',
        examples: [
            '原始消息：猴蛇狗各肖10',
            '锚点词：各肖（未确定）',
            '结果：解析时弹窗选择策略，确认后写入规则并按所选策略继续解析'
        ]
    }
];
const ANCHOR_SOURCE_DISPLAY_ORDER = ['client', 'global', 'system'];
const ANCHOR_SOURCE_HINTS = {
    client: '客户专属层，优先级最高',
    global: '全局层，对所有客户生效',
    system: '系统层，兜底默认'
};
const ANCHOR_SUBGROUP_CONFIGS = [
    { key: 'advanced', toggleId: 'anchorSubgroupToggle_advanced', bodyId: 'anchorSubgroupBody_advanced', rootId: 'anchorSubgroup_advanced' },
    { key: 'library', toggleId: 'anchorSubgroupToggle_library', bodyId: 'anchorSubgroupBody_library', rootId: 'anchorSubgroup_library' }
];
let anchorSubgroupState = {
    advanced: true,
    library: false
};
let anchorStrategyActiveTab = 'per_number';
let anchorRuleDrawerState = {
    open: false,
    editToken: '',
    editSource: '',
    editClientId: ''
};
let anchorRuleDrawerSnapshot = null;

const FALLBACK_PLAN_CATALOG = {
    defaultTier: 'plus',
    defaultBillingCycle: 'lifetime',
    plans: [
        {
            key: 'plus',
            name: 'Plus',
            description: '稳定录入、稳定统计、一次买断（永久授权）',
            prices: { lifetime: 1499 },
            currency: 'CNY',
            features: [
                '录入提效：手动消息批量录入，自动解析数字/生肖并实时校验格式',
                '统计清晰：多用户独立账本 + 多盘口维度统计，切换即看',
                '结果可交付：汇总排序、明细筛选、一键复制导出',
                '规则可控：属性词模板选择与自定义属性库维护',
                '买断可用：本地离线保存与基础授权校验能力'
            ],
            capabilities: {
                ocr: false,
                clipboardAssist: false,
                autoUpdate: false
            }
        },
        {
            key: 'pro',
            name: 'Pro',
            description: '高频场景专用，高自动化、高效率（永久授权）',
            prices: { lifetime: 2999 },
            currency: 'CNY',
            features: [
                '包含 Plus 全部能力，并针对高频业务深度优化',
                'OCR 智能识别引擎：图片批量识别、候选排序、低置信提醒、纠错回填',
                '微信自动监听中枢：复制即识别、同日去重拦截，显著减少重复工作',
                '全链路自动化：识别 -> 统计 -> 导出连续处理，压缩人工操作时间',
                '持续更新（Pro 专属）：优先获得新规则、新能力与性能优化版本'
            ],
            capabilities: {
                ocr: true,
                clipboardAssist: true,
                autoUpdate: true
            }
        }
    ]
};

const ATTRIBUTE_GROUPS = [
    ['单', '双', '大', '小'],
    ['合单', '大单', '小单', '合大', '尾大'],
    ['合双', '大双', '小双', '合小', '尾小'],
    ['天肖', '地肖', '前肖', '后肖', '左肖', '右肖'],
    ['阴肖', '阳肖', '独字肖', '合字肖'],
    ['金', '木', '水', '火', '土'],
    ['红波', '蓝波', '绿波', '家禽', '野兽'],
    ['红单', '红双', '蓝单', '蓝双', '绿单', '绿双'],
    ['0尾', '1尾', '2尾', '3尾', '4尾', '5尾', '6尾', '7尾', '8尾', '9尾', '大尾', '小尾'],
    ['0头', '1头', '2头', '3头', '4头'],
    ['1门', '2门', '3门', '4门', '5门'],
    ['1段', '2段', '3段', '4段', '5段', '6段', '7段'],
    ['1合', '2合', '3合', '4合', '5合', '6合', '7合', '8合', '9合', '10合', '11合', '12合', '13合'],
    ['0合尾', '1合尾', '2合尾', '3合尾', '4合尾', '5合尾', '6合尾', '7合尾', '8合尾', '9合尾'],
    ['0头单', '1头单', '2头单', '3头单', '4头单'],
    ['0头双', '1头双', '2头双', '3头双', '4头双'],
    ['3余0', '3余1', '3余2'],
    ['4余0', '4余1', '4余2', '4余3'],
    ['5余0', '5余1', '5余2', '5余3', '5余4'],
    ['6余0', '6余1', '6余2', '6余3', '6余4', '6余5'],
    ['7余0', '7余1', '7余2', '7余3', '7余4', '7余5', '7余6'],
    ['楼上码', '楼下码', '前落码', '后落码', '左边码', '右边码', '内围码', '外围码', '中数', '边数'],
    ['鼠', '牛', '虎', '兔', '龙', '蛇'],
    ['马', '羊', '猴', '鸡', '狗', '猪']
];

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始初始化...');
    migrateRecognizeLayoutProfile();
    initAppVersion();
    initAppAccessStatus();
    initLicenseStatus();
    applySavedAttributeGroupOrder();
    initializeApplication();
    initMainLayoutResizers();
    renderRecognizeRegionButtons();
    renderViewRegionButtons();
    initRegionPnlPanel();
    setupRecognizeMessageInput();
    initRecognizeIssueActions();
    initRecognizeLayoutResizer();
    initRecognizeAttributeDockResizer();
    initRecognizeAttributePanelToggle();
    initRecognizeSideGroups();
    initClipboardAssistPreference();
    renderAttributePicker();
    initAttributePickerScrollAssist();
    renderCustomAttributeList();
    initAnchorRuleControls();
    initAnchorAliasFilterControls();
    initAnchorStrategyGuide();
    initLegalNotice();
    hookUserManagerSaveState();
    refreshDashboardStatus();

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
                window.userManager.renderAllSections();
            }
            ensureMainLayoutWidths();
            ensureRecognizeSplitWidth();
            ensureRecognizeAttrWidth();
            syncRecognizeMessageAutoHeight();
        }, 120);
    });
});

function migrateRecognizeLayoutProfile() {
    try {
        const current = String(window.localStorage.getItem(RECOGNIZE_LAYOUT_PROFILE_VERSION_KEY) || '');
        if (current === 'v3') return;
        window.localStorage.removeItem(RECOGNIZE_SPLIT_WIDTH_KEY);
        window.localStorage.removeItem(RECOGNIZE_ATTR_SPLIT_WIDTH_KEY);
        window.localStorage.setItem(RECOGNIZE_LAYOUT_PROFILE_VERSION_KEY, 'v3');
    } catch (error) {
        // ignore
    }
}

async function initAppVersion() {
    if (!ipcRenderer || typeof ipcRenderer.invoke !== 'function') return;
    try {
        const version = await ipcRenderer.invoke('app:get-version');
        const badge = document.getElementById('appVersionBadge');
        if (badge) {
            badge.textContent = version ? `v${version}` : 'v-';
        }
    } catch (error) {
        // ignore
    }
}

async function initAppAccessStatus() {
    if (!ipcRenderer || typeof ipcRenderer.invoke !== 'function') {
        return;
    }

    try {
        const status = await ipcRenderer.invoke('app:get-access-status');
        applyAppAccessStatus(status);
    } catch (error) {
        console.warn('获取访问状态失败:', error);
    }

    try {
        const catalog = await ipcRenderer.invoke('plan:get-catalog');
        applyPlanCatalog(catalog);
    } catch (error) {
        applyPlanCatalog(FALLBACK_PLAN_CATALOG);
    }

    ipcRenderer.on('app-access-status-changed', (status) => {
        applyAppAccessStatus(status);
    });
}

function applyAppAccessStatus(status) {
    appAccessStatus = status || null;
    currentPlanContext = resolvePlanContext(status);
    renderPlanBadge();
    renderPlanModal();
    syncPlanCapabilityUI();
    syncBlockedUpgradeOverlay(status);

    const trialWarning = document.getElementById('trialRuntimeWarning');
    if (trialWarning && status && status.mode !== 'trial') {
        trialWarning.remove();
    }

    if (!status) return;
    if (status.mode === 'blocked' && !blockedUpgradeAutoShown) {
        blockedUpgradeAutoShown = true;
        // 仅在进入 A 业务页时自动拉起升级弹窗。
        setTimeout(() => openPlanModal(), 0);
    }
    if (status.mode !== 'blocked') {
        blockedUpgradeAutoShown = false;
    }
    if (status.mode === 'trial' && status.trial) {
        showTrialRuntimeWarning(status.trial.remainingDays || 0, status.trial.endAt);
    }
}

function syncBlockedUpgradeOverlay(status) {
    const overlayId = 'blockedUpgradeOverlay';
    const blocked = Boolean(status && status.mode === 'blocked');
    let overlay = document.getElementById(overlayId);

    if (!blocked) {
        if (overlay) overlay.remove();
        return;
    }

    const blockedReason = String(
        status.reason
        || (status.license && status.license.reason)
        || '未检测到有效授权'
    );
    const machineFingerprint = String(
        (status.license && status.license.machineFingerprint)
        || status.machineFingerprint
        || ''
    );

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = overlayId;
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.55);
            z-index: 40;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;
        overlay.innerHTML = `
            <div style="max-width: 680px; width: 100%; background: #fff; border-radius: 12px; border: 1px solid #dbe4f0; padding: 16px 18px; color: #1e293b;">
                <div style="font-size: 20px; font-weight: 800; color: #0f3558; margin-bottom: 8px;">A业务（六合彩统计）需要有效授权</div>
                <div id="blockedUpgradeReason" style="font-size: 14px; line-height: 1.6; color: #334155;"></div>
                <div id="blockedUpgradeFingerprint" style="font-size: 13px; line-height: 1.5; color: #475569; margin-top: 6px; word-break: break-all;"></div>
                <div style="margin-top: 12px; display: flex; gap: 10px;">
                    <button id="blockedUpgradeOpenBtn" class="edit-button" type="button">打开套餐升级</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const openBtn = overlay.querySelector('#blockedUpgradeOpenBtn');
        if (openBtn) {
            openBtn.addEventListener('click', () => openPlanModal());
        }
    }

    const reasonEl = overlay.querySelector('#blockedUpgradeReason');
    if (reasonEl) {
        reasonEl.textContent = `未授权原因：${blockedReason}`;
    }
    const fingerprintEl = overlay.querySelector('#blockedUpgradeFingerprint');
    if (fingerprintEl) {
        fingerprintEl.textContent = machineFingerprint ? `本机指纹（离线授权设备码）：${machineFingerprint}` : '';
    }
}

function applyPlanCatalog(catalog) {
    planCatalog = normalizePlanCatalog(catalog);
    if (appAccessStatus) {
        currentPlanContext = resolvePlanContext(appAccessStatus);
    }
    renderPlanBadge();
    renderPlanModal();
    syncPlanCapabilityUI();
}

function setRecognizePreviewError(errorMessage = '') {
    lastRecognizePreviewError = String(errorMessage || '').trim();
    refreshDashboardStatus();
}

function getDashboardSaveMeta() {
    if (dashboardSaveState === 'saving') {
        return { text: '保存中...', cls: 'is-saving' };
    }
    if (dashboardSaveState === 'error') {
        return { text: '保存失败', cls: 'is-error' };
    }
    return { text: '已保存', cls: 'is-saved' };
}

function setDashboardSaveState(state, errorMessage = '') {
    dashboardSaveState = state || 'saved';
    dashboardSaveError = String(errorMessage || '').trim();
    refreshDashboardStatus();
}

function hookUserManagerSaveState() {
    const manager = window.userManager;
    if (!manager || manager.__saveStateHooked || typeof manager.saveUserData !== 'function') {
        return;
    }
    const originalSave = manager.saveUserData.bind(manager);
    manager.saveUserData = function patchedSaveUserData(...args) {
        setDashboardSaveState('saving');
        try {
            return originalSave(...args);
        } catch (error) {
            setDashboardSaveState('error', error && error.message ? error.message : '保存异常');
            throw error;
        }
    };
    manager.__saveStateHooked = true;
}

function collectDashboardSummaryMetrics(manager, viewRegions = []) {
    const users = manager && typeof manager.getAllUsers === 'function'
        ? (manager.getAllUsers() || {})
        : {};
    const metrics = { totalStake: 0 };
    Object.keys(users).forEach(userName => {
        viewRegions.forEach(regionKey => {
            const regionData = manager && typeof manager.getUserRegionData === 'function'
                ? manager.getUserRegionData(userName, regionKey)
                : null;
            if (!regionData) return;
            metrics.totalStake += Number(regionData.totalCount) || 0;
        });
    });
    return metrics;
}

function refreshDashboardStatus() {
    const userCountEl = document.getElementById('dashboardUserCount');
    const totalStakeEl = document.getElementById('dashboardTotalStake');
    const regionsEl = document.getElementById('dashboardViewRegions');
    const previewErrorsEl = document.getElementById('dashboardPreviewErrors');
    const saveStateEl = document.getElementById('dashboardSaveState');
    const manager = window.userManager;
    if (
        !userCountEl || !totalStakeEl
        || !regionsEl || !previewErrorsEl || !saveStateEl
    ) {
        return;
    }

    if (!manager) {
        userCountEl.textContent = '0';
        totalStakeEl.textContent = '0';
        regionsEl.textContent = '-';
        previewErrorsEl.textContent = lastRecognizePreviewError ? '1' : '0';
    } else {
        const users = typeof manager.getAllUsers === 'function' ? (manager.getAllUsers() || {}) : {};
        const userCount = Object.keys(users).length;
        const selectedData = typeof manager.getSelectedUserData === 'function'
            ? manager.getSelectedUserData()
            : { totalCount: 0, originalData: [] };
        const viewRegions = typeof manager.getViewRegions === 'function' ? manager.getViewRegions() : ['new_ao'];
        const viewRegionLabels = typeof manager.getViewRegionLabels === 'function' ? manager.getViewRegionLabels() : viewRegions;
        const inSummary = typeof manager.isInSummaryMode === 'function' ? manager.isInSummaryMode() : false;

        let activeTotalStake = Number(selectedData.totalCount) || 0;
        if (inSummary) {
            const summaryMetrics = collectDashboardSummaryMetrics(manager, viewRegions);
            activeTotalStake = summaryMetrics.totalStake;
        }

        userCountEl.textContent = `${userCount}`;
        totalStakeEl.textContent = formatNumericAmount(activeTotalStake);
        regionsEl.textContent = viewRegionLabels.length ? viewRegionLabels.join('、') : '-';
        previewErrorsEl.textContent = lastRecognizePreviewError ? '1' : '0';
    }

    const saveMeta = getDashboardSaveMeta();
    saveStateEl.textContent = saveMeta.text;
    saveStateEl.classList.remove('is-saved', 'is-saving', 'is-error');
    saveStateEl.classList.add(saveMeta.cls);
    saveStateEl.title = dashboardSaveError || '';
}

window.refreshDashboardStatus = refreshDashboardStatus;

function normalizePlanCatalog(catalog) {
    const fallback = JSON.parse(JSON.stringify(FALLBACK_PLAN_CATALOG));
    if (!catalog || typeof catalog !== 'object') {
        return fallback;
    }

    const plans = Array.isArray(catalog.plans) ? catalog.plans : [];
    const normalizedPlans = plans
        .map((plan) => {
            const key = normalizePlanTier(plan && plan.key, '');
            if (!key) return null;
            const fallbackPlan = fallback.plans.find(item => item.key === key) || {};
            const prices = plan && plan.prices && typeof plan.prices === 'object' ? plan.prices : {};
            const capabilities = plan && plan.capabilities && typeof plan.capabilities === 'object'
                ? plan.capabilities
                : {};
            const fallbackCapabilities = fallbackPlan.capabilities || {};
            return {
                key,
                name: String(plan.name || fallbackPlan.name || key.toUpperCase()),
                description: String(plan.description || fallbackPlan.description || ''),
                prices: {
                    lifetime: Number(
                        prices.lifetime
                        || prices.yearly
                        || prices.monthly
                        || (fallbackPlan.prices && (fallbackPlan.prices.lifetime || fallbackPlan.prices.yearly || fallbackPlan.prices.monthly))
                        || 0
                    )
                },
                currency: String(plan.currency || fallbackPlan.currency || 'CNY'),
                features: Array.isArray(plan.features) && plan.features.length > 0
                    ? plan.features.map(item => String(item))
                    : (fallbackPlan.features || []),
                capabilities: {
                    ocr: typeof capabilities.ocr === 'boolean' ? capabilities.ocr : !!fallbackCapabilities.ocr,
                    clipboardAssist: typeof capabilities.clipboardAssist === 'boolean'
                        ? capabilities.clipboardAssist
                        : !!fallbackCapabilities.clipboardAssist,
                    autoUpdate: typeof capabilities.autoUpdate === 'boolean'
                        ? capabilities.autoUpdate
                        : !!fallbackCapabilities.autoUpdate
                }
            };
        })
        .filter(Boolean);

    return {
        defaultTier: normalizePlanTier(catalog.defaultTier, fallback.defaultTier),
        defaultBillingCycle: normalizeBillingCycle(catalog.defaultBillingCycle, fallback.defaultBillingCycle),
        plans: normalizedPlans.length > 0 ? normalizedPlans : fallback.plans
    };
}

function normalizePlanTier(value, fallback = 'plus') {
    const text = String(value || '').toLowerCase();
    if (text === 'plus' || text === 'pro') {
        return text;
    }
    return fallback;
}

function normalizeBillingCycle(value, fallback = 'lifetime') {
    const text = String(value || '').toLowerCase();
    if (text === 'monthly' || text === 'yearly' || text === 'lifetime') {
        return 'lifetime';
    }
    return fallback;
}

function getEffectivePlanCatalog() {
    return planCatalog || FALLBACK_PLAN_CATALOG;
}

function getPlanByTier(tier) {
    const normalizedTier = normalizePlanTier(tier, '');
    if (!normalizedTier) return null;
    const catalog = getEffectivePlanCatalog();
    return catalog.plans.find(plan => plan.key === normalizedTier) || null;
}

function resolvePlanContext(status) {
    const catalog = getEffectivePlanCatalog();
    const rawPlan = status && status.plan && typeof status.plan === 'object' ? status.plan : {};
    const statusTier = rawPlan.tier
        || (status && status.license && status.license.tier)
        || (status && status.mode === 'licensed' ? 'pro' : catalog.defaultTier);
    const tier = normalizePlanTier(statusTier, catalog.defaultTier);
    const plan = getPlanByTier(tier) || getPlanByTier(catalog.defaultTier);
    const billingCycle = normalizeBillingCycle(
        rawPlan.billingCycle
            || (status && status.license && status.license.billingCycle)
            || catalog.defaultBillingCycle,
        catalog.defaultBillingCycle
    );

    const context = {
        tier: plan ? plan.key : tier,
        name: String(rawPlan.name || (plan && plan.name) || tier.toUpperCase()),
        description: String(rawPlan.description || (plan && plan.description) || ''),
        prices: rawPlan.prices && typeof rawPlan.prices === 'object'
            ? { ...rawPlan.prices }
            : (plan && plan.prices ? { ...plan.prices } : { lifetime: 0 }),
        currency: String(rawPlan.currency || (plan && plan.currency) || 'CNY'),
        billingCycle,
        source: String(rawPlan.source || (status && status.mode) || 'license'),
        features: Array.isArray(rawPlan.features) && rawPlan.features.length > 0
            ? rawPlan.features.map(item => String(item))
            : (plan && Array.isArray(plan.features) ? plan.features.slice() : []),
        capabilities: {
            ocr: rawPlan.capabilities && typeof rawPlan.capabilities.ocr === 'boolean'
                ? rawPlan.capabilities.ocr
                : !!(plan && plan.capabilities && plan.capabilities.ocr),
            clipboardAssist: rawPlan.capabilities && typeof rawPlan.capabilities.clipboardAssist === 'boolean'
                ? rawPlan.capabilities.clipboardAssist
                : !!(plan && plan.capabilities && plan.capabilities.clipboardAssist),
            autoUpdate: rawPlan.capabilities && typeof rawPlan.capabilities.autoUpdate === 'boolean'
                ? rawPlan.capabilities.autoUpdate
                : !!(plan && plan.capabilities && plan.capabilities.autoUpdate)
        }
    };
    context.price = Number(rawPlan.price || context.prices[context.billingCycle] || context.prices.lifetime || 0);
    return context;
}

function hasPlanCapability(capabilityKey) {
    return !!(currentPlanContext && currentPlanContext.capabilities && currentPlanContext.capabilities[capabilityKey]);
}

function requirePlanCapability(capabilityKey, featureLabel) {
    if (hasPlanCapability(capabilityKey)) {
        return true;
    }
    const label = featureLabel || '当前功能';
    showError('功能受限', `${label} 为 Pro 专属能力，请在“套餐与升级”中升级后使用。`);
    return false;
}

function formatCurrencyPrice(value, currency = 'CNY') {
    const amount = Number(value) || 0;
    if (currency === 'CNY') {
        return `¥${amount.toLocaleString('zh-CN')}`;
    }
    return `${amount}`;
}

function formatBillingCycleLabel(cycle) {
    if (cycle === 'lifetime') return '永久授权';
    return '-';
}

function renderPlanBadge() {
    const badge = document.getElementById('planBadge');
    if (!badge) return;

    badge.className = 'plan-badge';
    if (!currentPlanContext) {
        badge.textContent = '套餐: -';
        return;
    }

    if (appAccessStatus && appAccessStatus.mode === 'trial') {
        badge.classList.add('plan-trial');
    } else if (currentPlanContext.tier === 'pro') {
        badge.classList.add('plan-pro');
    } else {
        badge.classList.add('plan-plus');
    }

    const suffix = appAccessStatus && appAccessStatus.mode === 'trial' ? '（试用）' : '';
    badge.textContent = `套餐: ${currentPlanContext.name}${suffix}`;
}

function renderPlanModal() {
    const banner = document.getElementById('planCurrentBanner');
    const cards = document.getElementById('planCards');
    if (!banner || !cards) return;

    const context = currentPlanContext || resolvePlanContext(appAccessStatus || {});
    const cycle = normalizeBillingCycle(context.billingCycle, 'lifetime');
    const cycleLabel = formatBillingCycleLabel(cycle);
    const currentPrice = formatCurrencyPrice(context.prices[cycle] || context.prices.lifetime, context.currency);

    if (appAccessStatus && appAccessStatus.mode === 'blocked') {
        const blockedReason = String(
            appAccessStatus.reason
            || (appAccessStatus.license && appAccessStatus.license.reason)
            || '未检测到有效授权'
        );
        const machineFingerprint = String(
            (appAccessStatus.license && appAccessStatus.license.machineFingerprint)
            || appAccessStatus.machineFingerprint
            || ''
        );
        const fingerprintText = machineFingerprint ? ` 本机指纹：${machineFingerprint}` : '';
        banner.textContent = `当前授权不可用（${blockedReason}），请联系升级并导入授权文件。${fingerprintText}`;
    } else if (appAccessStatus && appAccessStatus.mode === 'trial') {
        banner.textContent = `当前为试用模式，已开放 ${context.name} 能力。试用到期后请购买 Plus 或 Pro 授权。`;
    } else {
        banner.textContent = `当前套餐：${context.name}（${cycleLabel}，${currentPrice}）`;
    }

    const catalog = getEffectivePlanCatalog();
    const planCards = catalog.plans.map((plan) => {
        const selected = context.tier === plan.key;
        const lifetimePrice = formatCurrencyPrice(plan.prices.lifetime, plan.currency);
        const featureHtml = (plan.features || [])
            .map(item => `<li>${escapeHtml(item)}</li>`)
            .join('');
        return `
            <section class="plan-card ${selected ? 'current' : ''}">
                <div class="plan-card-header">
                    <h3 class="plan-card-name">${escapeHtml(plan.name)}</h3>
                    <span class="plan-card-price">${lifetimePrice} · 永久授权</span>
                </div>
                <p class="plan-card-desc">${escapeHtml(plan.description || '')}</p>
                <ul class="plan-card-features">${featureHtml}</ul>
            </section>
        `;
    }).join('');

    const contactCard = `
        <section class="plan-contact">
            <div class="plan-contact-title">Telegram 升级客服</div>
            <div class="plan-contact-hint">可通过扫码或用户名搜索两种方式添加客服</div>
            <div class="plan-contact-qr-wrap">
                <img class="plan-contact-qr" src="${TELEGRAM_SUPPORT_QR_PATH}" alt="Telegram客服二维码">
            </div>
            <div class="plan-contact-user">用户名：${escapeHtml(TELEGRAM_SUPPORT_USERNAME)}</div>
            <a
                class="plan-contact-link"
                href="${escapeHtml(TELEGRAM_SUPPORT_LINK)}"
                target="_blank"
                rel="noopener noreferrer"
            >${escapeHtml(TELEGRAM_SUPPORT_LINK)}</a>
            <ol class="plan-contact-steps">
                <li>先安装并登录 Telegram（手机或电脑均可）。</li>
                <li>方式一：打开 Telegram 的扫码入口，扫描上方二维码。</li>
                <li>方式二：在 Telegram 搜索框输入 ${escapeHtml(TELEGRAM_SUPPORT_USERNAME)}，进入主页后点“Start/开始”。</li>
                <li>发送升级指令：<strong>“升级 Plus”</strong> 或 <strong>“升级 Pro”</strong>。</li>
                <li>补充信息：客户ID、当前套餐（试用/Plus/Pro）、设备授权信息（如有截图可一并发送）。</li>
                <li>客服确认后会回复价格、支付方式和授权更新步骤，按步骤操作即可完成升级。</li>
            </ol>
        </section>
    `;

    cards.innerHTML = `${planCards}${contactCard}`;
}

function openPlanModal() {
    const modal = document.getElementById('planModal');
    if (!modal) return;
    renderPlanModal();
    modal.style.display = 'block';
}

function closePlanModal() {
    const modal = document.getElementById('planModal');
    if (!modal) return;
    modal.style.display = 'none';
}

function syncPlanCapabilityUI() {
    syncOcrCapabilityUI();
    syncClipboardCapabilityUI();
}

function syncOcrCapabilityUI() {
    const enabled = hasPlanCapability('ocr');
    const zone = document.getElementById('ocrDropZone');
    const pickBtn = document.getElementById('ocrPickButton');
    const runBtn = document.getElementById('ocrRunButton');
    const lockHint = document.getElementById('ocrLockedHint');

    if (zone) {
        zone.classList.toggle('locked', !enabled);
    }
    if (pickBtn) {
        pickBtn.disabled = !enabled;
    }
    if (runBtn) {
        runBtn.disabled = !enabled;
    }

    if (lockHint) {
        if (enabled) {
            lockHint.style.display = 'none';
            lockHint.textContent = '';
        } else {
            lockHint.style.display = '';
            lockHint.textContent = 'OCR 图片识别为 Pro 专属功能，请升级后使用。';
        }
    }

    if (!enabled) {
        clearOcrCandidates();
    }
}

function syncClipboardCapabilityUI() {
    const capabilityKnown = !!currentPlanContext;
    const enabled = hasPlanCapability('clipboardAssist');
    const toggle = document.getElementById('clipboardAssistToggle');
    const banner = document.getElementById('clipboardAssistBanner');
    if (toggle) {
        toggle.disabled = capabilityKnown && !enabled;
        if (capabilityKnown && !enabled) {
            toggle.checked = false;
        }
    }
    if (banner) {
        banner.classList.toggle('locked', capabilityKnown && !enabled);
    }
    if (capabilityKnown && !enabled) {
        clipboardAssistEnabled = false;
        stopRecognizeClipboardMonitor();
        return;
    }
    if (capabilityKnown && enabled && !clipboardAssistEnabled) {
        const preferred = loadClipboardAssistEnabledPreference();
        if (preferred) {
            clipboardAssistEnabled = true;
        }
    }
    if (isRecognizeModalOpen()) {
        refreshClipboardMonitorState();
    } else {
        updateClipboardAssistBanner(recognizeClipboardMonitoring && (!capabilityKnown || enabled));
    }
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function initLicenseStatus() {
    if (!ipcRenderer || typeof ipcRenderer.invoke !== 'function') {
        return;
    }

    try {
        const status = await ipcRenderer.invoke('license:get-status');
        applyLicenseStatus(status);
    } catch (error) {
        console.warn('获取授权状态失败:', error);
    }

    ipcRenderer.on('license-status-changed', (status) => {
        applyLicenseStatus(status);
    });

    ipcRenderer.on('license-force-exit', (payload) => {
        const reason = payload && payload.reason ? payload.reason : '授权已失效，软件将退出。';
        alert(reason);
    });
}

function applyLicenseStatus(status) {
    currentLicenseStatus = status || null;
    licenseLastUpdatedAt = new Date();
    renderLicenseStatusPanel();

    if (!status || !status.authorized) {
        return;
    }
    if (status.mode === 'grace') {
        showGraceWarning(status.remainingDays || 0);
    }
}

function showGraceWarning(remainingDays) {
    const id = 'licenseGraceWarning';
    const existing = document.getElementById(id);
    if (existing) {
        existing.remove();
    }

    const warning = document.createElement('div');
    warning.id = id;
    warning.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #f59e0b;
        color: #111827;
        border-radius: 8px;
        padding: 10px 14px;
        font-weight: 700;
        box-shadow: 0 8px 20px rgba(0,0,0,0.25);
        z-index: 10001;
    `;
    warning.textContent = `授权已到期，当前处于宽限期，剩余 ${remainingDays} 天`;
    document.body.appendChild(warning);
}

function showTrialRuntimeWarning(remainingDays, endAt) {
    const id = 'trialRuntimeWarning';
    const existing = document.getElementById(id);
    if (existing) {
        existing.remove();
    }

    const warning = document.createElement('div');
    warning.id = id;
    warning.style.cssText = `
        position: fixed;
        top: 62px;
        left: 50%;
        transform: translateX(-50%);
        background: #fef3c7;
        color: #78350f;
        border: 1px solid #facc15;
        border-radius: 8px;
        padding: 8px 12px;
        font-weight: 700;
        box-shadow: 0 8px 20px rgba(0,0,0,0.18);
        z-index: 10001;
    `;
    const endText = endAt ? `，到期时间：${formatTime(endAt)}` : '';
    warning.textContent = `当前为试用模式，剩余 ${remainingDays} 天${endText}`;
    document.body.appendChild(warning);
}

function openLicenseModal() {
    const modal = document.getElementById('licenseModal');
    if (!modal) return;
    renderLicenseStatusPanel();
    modal.style.display = 'block';
    refreshLicenseStatus();
}

function closeLicenseModal() {
    const modal = document.getElementById('licenseModal');
    if (!modal) return;
    modal.style.display = 'none';
}

async function refreshLicenseStatus() {
    if (!ipcRenderer || typeof ipcRenderer.invoke !== 'function') {
        return;
    }
    try {
        const status = await ipcRenderer.invoke('license:get-status');
        applyLicenseStatus(status);
    } catch (error) {
        applyLicenseStatus({
            authorized: false,
            mode: 'blocked',
            reason: `刷新失败: ${error.message}`
        });
    }
}

function renderLicenseStatusPanel() {
    setText('licenseCustomerId', currentLicenseStatus && currentLicenseStatus.customerId ? currentLicenseStatus.customerId : '-');
    setText('licenseMode', formatLicenseMode(currentLicenseStatus ? currentLicenseStatus.mode : null));
    setText('licenseSource', formatLicenseSource(currentLicenseStatus));
    setText('licenseTier', formatLicenseTier(currentLicenseStatus));
    setText('licenseBillingCycle', formatBillingCycle(currentLicenseStatus));
    setText('licenseExpireAt', formatTime(currentLicenseStatus ? currentLicenseStatus.expireAt : null));
    setText('licenseRemainingDays', formatRemainingDays(currentLicenseStatus));
    setText('licenseUsbMountPath', currentLicenseStatus && currentLicenseStatus.usbMountPath ? currentLicenseStatus.usbMountPath : '-');
    setText('licenseMachineFingerprint', currentLicenseStatus && currentLicenseStatus.machineFingerprint ? currentLicenseStatus.machineFingerprint : '-');
    setText('licenseFilePath', currentLicenseStatus && currentLicenseStatus.licensePath ? currentLicenseStatus.licensePath : '-');
    setText('licenseReason', currentLicenseStatus && currentLicenseStatus.reason ? currentLicenseStatus.reason : '-');
    setText('licenseLastUpdated', licenseLastUpdatedAt ? formatTime(licenseLastUpdatedAt.toISOString()) : '-');
    renderLicenseStatusBanner(currentLicenseStatus);
}

function renderLicenseStatusBanner(status) {
    const banner = document.getElementById('licenseStatusBanner');
    if (!banner) return;

    banner.className = 'license-status-banner';

    if (!status) {
        banner.classList.add('license-status-unknown');
        banner.textContent = '尚未获取授权状态';
        return;
    }

    if (!status.authorized) {
        banner.classList.add('license-status-invalid');
        banner.textContent = '授权无效';
        return;
    }

    if (status.mode === 'grace') {
        banner.classList.add('license-status-grace');
        banner.textContent = `授权宽限期（剩余 ${status.remainingDays || 0} 天）`;
        return;
    }

    banner.classList.add('license-status-ok');
    banner.textContent = '授权有效';
}

function formatLicenseMode(mode) {
    if (mode === 'normal') return '正常授权';
    if (mode === 'grace') return '宽限期';
    if (mode === 'blocked') return '已阻止';
    return '-';
}

function formatLicenseSource(status) {
    if (!status || !status.authorized) return '-';
    if (status.licenseSourceLabel) return status.licenseSourceLabel;
    if (status.licenseSource === 'usb') return 'U盘授权';
    if (status.licenseSource === 'offline') return '离线授权';
    return '未知来源';
}

function formatLicenseTier(status) {
    if (!status || !status.authorized) return '-';
    if (status.tierName) return status.tierName;
    if (status.tier === 'pro') return 'Pro';
    if (status.tier === 'plus') return 'Plus';
    return '-';
}

function formatBillingCycle(status) {
    if (!status || !status.authorized) return '-';
    return formatBillingCycleLabel(status.billingCycle);
}

function formatRemainingDays(status) {
    if (!status || !status.authorized) return '-';
    if (status.mode !== 'grace') return '不适用';
    return `${status.remainingDays || 0} 天`;
}

function formatTime(isoText) {
    if (!isoText) return '-';
    const date = new Date(isoText);
    if (Number.isNaN(date.getTime())) return String(isoText);
    return date.toLocaleString();
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value == null ? '-' : String(value);
}

function initLegalNotice() {
    const notice = document.getElementById('legalNoticeBox');
    if (!notice) return;
    try {
        const dismissed = localStorage.getItem(LEGAL_NOTICE_DISMISSED_KEY) === '1';
        notice.style.display = dismissed ? 'none' : '';
    } catch (error) {
        notice.style.display = '';
    }
}

function dismissLegalNotice() {
    const notice = document.getElementById('legalNoticeBox');
    if (notice) {
        notice.style.display = 'none';
    }
    try {
        localStorage.setItem(LEGAL_NOTICE_DISMISSED_KEY, '1');
    } catch (error) {
        // ignore
    }
}

function getSelectableAttributeMap() {
    const map = {};
    if (!window.messageProcessor) return map;

    if (typeof window.messageProcessor.getAttributeMap === 'function') {
        Object.assign(map, window.messageProcessor.getAttributeMap());
    }
    if (window.messageProcessor.animalMap) {
        Object.entries(window.messageProcessor.animalMap).forEach(([animal, nums]) => {
            map[animal] = nums.slice();
        });
    }
    return map;
}

function renderAttributePicker() {
    const picker = document.getElementById('attributePicker');
    if (!picker) {
        return;
    }

    const attributeMap = getSelectableAttributeMap();
    const defaultMap = window.messageProcessor && typeof window.messageProcessor.getDefaultAttributeMap === 'function'
        ? window.messageProcessor.getDefaultAttributeMap()
        : {};
    const defaultKeys = new Set(Object.keys(defaultMap));
    const customFrontKeys = window.messageProcessor && typeof window.messageProcessor.getCustomAttributeMap === 'function'
        ? Object.keys(window.messageProcessor.getCustomAttributeMap()).filter(key => !defaultKeys.has(key) && attributeMap[key])
        : [];
    picker.innerHTML = '';

    if (customFrontKeys.length > 0) {
        const customSection = document.createElement('div');
        customSection.className = 'attribute-group';
        customSection.style.setProperty('--group-columns', String(Math.min(6, Math.max(1, customFrontKeys.length))));
        customSection.draggable = false;
        customSection.setAttribute('data-row-index', '-1');

        customFrontKeys.forEach(attr => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'attribute-chip';
            button.draggable = !!isAttributeEditMode;
            button.setAttribute('data-group-index', '-1');
            if (selectedAttributes.has(attr)) {
                button.classList.add('active');
            }
            if (attributeSwapSource === attr) {
                button.classList.add('swap-source');
            }
            button.textContent = attr;
            button.setAttribute('data-attr', attr);
            button.addEventListener('click', () => handleAttributeChipClick(attr));
            button.addEventListener('dragstart', handleAttributeDragStart);
            button.addEventListener('dragover', event => event.preventDefault());
            button.addEventListener('drop', handleAttributeDrop);
            button.addEventListener('pointerdown', event => handleAttributeChipPointerDown(event, attr));
            button.addEventListener('pointerup', clearAttributeLongPress);
            button.addEventListener('pointerleave', clearAttributeLongPress);
            button.addEventListener('pointercancel', clearAttributeLongPress);
            if (isAttributeEditMode) {
                const deleteBtn = document.createElement('span');
                deleteBtn.className = 'attribute-chip-delete';
                deleteBtn.textContent = '×';
                deleteBtn.title = `删除属性 ${attr}`;
                deleteBtn.onclick = (event) => {
                    event.stopPropagation();
                    confirmDeleteAttribute(attr);
                };
                button.appendChild(deleteBtn);
            }
            customSection.appendChild(button);
        });
        picker.appendChild(customSection);

        const divider = document.createElement('div');
        divider.className = 'attribute-divider';
        picker.appendChild(divider);
    }

    ATTRIBUTE_GROUPS.forEach((group, index) => {
        const section = document.createElement('div');
        section.className = 'attribute-group';
        section.style.setProperty('--group-columns', String(group.length));
        section.draggable = !!isAttributeEditMode;
        section.setAttribute('data-row-index', String(index));
        section.addEventListener('dragstart', handleAttributeRowDragStart);
        section.addEventListener('dragover', event => event.preventDefault());
        section.addEventListener('drop', handleAttributeRowDrop);

        group.forEach(attr => {
            if (!attributeMap[attr]) return;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'attribute-chip';
            button.draggable = !!isAttributeEditMode;
            button.setAttribute('data-group-index', String(index));
            if (selectedAttributes.has(attr)) {
                button.classList.add('active');
            }
            if (attributeSwapSource === attr) {
                button.classList.add('swap-source');
            }
            button.textContent = attr;
            button.setAttribute('data-attr', attr);
            button.addEventListener('click', () => handleAttributeChipClick(attr));
            button.addEventListener('dragstart', handleAttributeDragStart);
            button.addEventListener('dragover', event => event.preventDefault());
            button.addEventListener('drop', handleAttributeDrop);
            button.addEventListener('pointerdown', event => handleAttributeChipPointerDown(event, attr));
            button.addEventListener('pointerup', clearAttributeLongPress);
            button.addEventListener('pointerleave', clearAttributeLongPress);
            button.addEventListener('pointercancel', clearAttributeLongPress);
            if (isAttributeEditMode) {
                const deleteBtn = document.createElement('span');
                deleteBtn.className = 'attribute-chip-delete';
                deleteBtn.textContent = '×';
                deleteBtn.title = `删除属性 ${attr}`;
                deleteBtn.onclick = (event) => {
                    event.stopPropagation();
                    confirmDeleteAttribute(attr);
                };
                button.appendChild(deleteBtn);
            }
            section.appendChild(button);
        });

        picker.appendChild(section);

        if (index < ATTRIBUTE_GROUPS.length - 1) {
            const divider = document.createElement('div');
            divider.className = 'attribute-divider';
            picker.appendChild(divider);
        }
    });

    const groupedKeys = new Set(ATTRIBUTE_GROUPS.flat());
    const remainingKeys = Object.keys(attributeMap)
        .filter(key => !groupedKeys.has(key) && !customFrontKeys.includes(key));
    if (remainingKeys.length > 0) {
        const divider = document.createElement('div');
        divider.className = 'attribute-divider';
        picker.appendChild(divider);

        const section = document.createElement('div');
        section.className = 'attribute-group';
        section.style.setProperty('--group-columns', '6');
        remainingKeys.forEach(attr => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'attribute-chip';
            button.draggable = !!isAttributeEditMode;
            button.setAttribute('data-group-index', '-1');
            if (selectedAttributes.has(attr)) {
                button.classList.add('active');
            }
            if (attributeSwapSource === attr) {
                button.classList.add('swap-source');
            }
            button.textContent = attr;
            button.setAttribute('data-attr', attr);
            button.addEventListener('click', () => handleAttributeChipClick(attr));
            button.addEventListener('dragstart', handleAttributeDragStart);
            button.addEventListener('dragover', event => event.preventDefault());
            button.addEventListener('drop', handleAttributeDrop);
            button.addEventListener('pointerdown', event => handleAttributeChipPointerDown(event, attr));
            button.addEventListener('pointerup', clearAttributeLongPress);
            button.addEventListener('pointerleave', clearAttributeLongPress);
            button.addEventListener('pointercancel', clearAttributeLongPress);
            if (isAttributeEditMode) {
                const deleteBtn = document.createElement('span');
                deleteBtn.className = 'attribute-chip-delete';
                deleteBtn.textContent = '×';
                deleteBtn.title = `删除属性 ${attr}`;
                deleteBtn.onclick = (event) => {
                    event.stopPropagation();
                    confirmDeleteAttribute(attr);
                };
                button.appendChild(deleteBtn);
            }
            section.appendChild(button);
        });
        picker.appendChild(section);
    }

    warmupAttributeRendering(picker);
    initAttributePickerScrollAssist();
    picker.classList.toggle('edit-mode', isAttributeEditMode);
    picker.classList.toggle('swap-enabled', !!attributeSwapSource);
}

function initAttributePickerScrollAssist() {
    const picker = document.getElementById('attributePicker');
    if (!picker || picker.dataset.scrollAssistBound === '1') return;
    picker.dataset.scrollAssistBound = '1';
    picker.addEventListener('wheel', (event) => {
        if (!event || !Number.isFinite(event.deltaY) || Math.abs(event.deltaY) < 0.5) {
            return;
        }
        const canScrollSelf = picker.scrollHeight > picker.clientHeight + 1;
        if (canScrollSelf) return;
        const outer = picker.closest('.attribute-help-body');
        if (!outer) return;
        const before = outer.scrollTop;
        outer.scrollTop += event.deltaY;
        if (outer.scrollTop !== before) {
            event.preventDefault();
        }
    }, { passive: false });
}

function handleAttributeChipClick(attribute) {
    if (isAttributeEditMode) {
        if (attributeSwapSource && attributeSwapSource !== attribute) {
            swapAttributes(attributeSwapSource, attribute);
            attributeSwapSource = null;
            renderAttributePicker();
            return;
        }
        if (attributeSwapSource === attribute) {
            attributeSwapSource = null;
            renderAttributePicker();
            return;
        }
        openAttributeEditModal(attribute);
        return;
    }
    toggleAttributeSelection(attribute);
}

function toggleAttributeEditMode(forceValue = null) {
    isAttributeEditMode = forceValue === null ? !isAttributeEditMode : !!forceValue;
    if (!isAttributeEditMode) {
        attributeSwapSource = null;
    }
    const btn = document.getElementById('toggleAttributeEditBtn');
    if (btn) {
        btn.textContent = isAttributeEditMode ? '取消编辑' : '编辑属性';
        btn.className = isAttributeEditMode ? 'delete-button' : 'cancel-button';
    }
    renderAttributePicker();
}

function handleAttributeChipPointerDown(event, attribute) {
    if (!isAttributeEditMode) return;
    clearAttributeLongPress();
    attributeLongPressTimer = setTimeout(() => {
        attributeSwapSource = attribute;
        renderAttributePicker();
    }, 320);
}

function clearAttributeLongPress() {
    if (attributeLongPressTimer) {
        clearTimeout(attributeLongPressTimer);
        attributeLongPressTimer = null;
    }
}

function findAttributeLocation(attr) {
    for (let groupIndex = 0; groupIndex < ATTRIBUTE_GROUPS.length; groupIndex += 1) {
        const itemIndex = ATTRIBUTE_GROUPS[groupIndex].indexOf(attr);
        if (itemIndex !== -1) {
            return { groupIndex, itemIndex };
        }
    }
    return null;
}

function swapAttributes(fromAttr, toAttr) {
    const from = findAttributeLocation(fromAttr);
    const to = findAttributeLocation(toAttr);
    if (!from || !to) return;
    const temp = ATTRIBUTE_GROUPS[from.groupIndex][from.itemIndex];
    ATTRIBUTE_GROUPS[from.groupIndex][from.itemIndex] = ATTRIBUTE_GROUPS[to.groupIndex][to.itemIndex];
    ATTRIBUTE_GROUPS[to.groupIndex][to.itemIndex] = temp;
    saveAttributeGroupOrder();
}

function confirmDeleteAttribute(attributeName) {
    const ok = confirm(`确定删除属性「${attributeName}」吗？`);
    if (!ok) return;
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.deleteAttributeDefinition !== 'function') {
            throw new Error('当前版本不支持删除属性');
        }
        window.messageProcessor.deleteAttributeDefinition(attributeName);
        selectedAttributes.delete(attributeName);
        ATTRIBUTE_GROUPS.forEach((group, index) => {
            ATTRIBUTE_GROUPS[index] = group.filter(item => item !== attributeName);
        });
        if (attributeSwapSource === attributeName) {
            attributeSwapSource = null;
        }
        updateMessageWithAttributeIntersection();
        saveAttributeGroupOrder();
        renderAttributePicker();
        showSuccess(`已删除属性：${attributeName}`);
    } catch (error) {
        showError('删除属性失败', error.message);
    }
}

function openAttributeEditModal(attributeName) {
    const editModal = document.getElementById('editModal');
    const editModalTitle = document.getElementById('editModalTitle');
    const editModalContent = document.getElementById('editModalContent');
    if (!editModal || !editModalTitle || !editModalContent) return;
    if (!window.messageProcessor || typeof window.messageProcessor.getAttributeMap !== 'function') return;

    const attrMap = window.messageProcessor.getAttributeMap();
    const numbers = Array.isArray(attrMap[attributeName]) ? attrMap[attributeName] : [];
    const formatted = numbers.map(num => (num < 10 ? `0${num}` : `${num}`)).join(',');

    editModalTitle.textContent = `编辑属性：${attributeName}`;
    editModalContent.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <label style="font-weight:700;">属性名</label>
        <input id="attrEditName" type="text" value="${attributeName.replace(/"/g, '&quot;')}" />
        <label style="font-weight:700;">号码集合（01-49，逗号或空格分隔）</label>
        <textarea id="attrEditNumbers" rows="4" placeholder="例如：01,05,12">${formatted}</textarea>
        <div class="modal-buttons">
          <button onclick="confirmAttributeEdit('${attributeName.replace(/'/g, "\\'")}')">确定</button>
          <button onclick="cancelAttributeEdit()">取消</button>
        </div>
      </div>
    `;
    editModal.style.display = 'block';
}

function confirmAttributeEdit(originalName) {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.updateAttributeDefinition !== 'function') {
            throw new Error('当前版本不支持属性编辑');
        }
        const nameInput = document.getElementById('attrEditName');
        const numbersInput = document.getElementById('attrEditNumbers');
        const nextName = nameInput ? nameInput.value.trim() : '';
        const numbersText = numbersInput ? numbersInput.value.trim() : '';
        if (!nextName) {
            throw new Error('属性名不能为空');
        }

        if (!numbersText) {
            const ok = confirm('即将清空该属性的号码集合，是否继续？');
            if (!ok) {
                return;
            }
        }

        const result = window.messageProcessor.updateAttributeDefinition(
            originalName,
            nextName,
            numbersText,
            { allowEmpty: true }
        );

        if (selectedAttributes.has(originalName)) {
            selectedAttributes.delete(originalName);
            selectedAttributes.add(result.name);
        }

        updateMessageWithAttributeIntersection();
        renderAttributePicker();
        renderCustomAttributeList();
        closeEditModal();
        toggleAttributeEditMode(false);
        showSuccess(`属性已更新：${result.name}`);
    } catch (error) {
        showError('编辑属性失败', error.message);
    }
}

function cancelAttributeEdit() {
    closeEditModal();
    toggleAttributeEditMode(false);
}

function warmupAttributeRendering(picker) {
    if (!picker) return;
    requestAnimationFrame(() => {
        const chips = picker.querySelectorAll('.attribute-chip');
        const limit = Math.min(chips.length, 240);
        for (let i = 0; i < limit; i += 1) {
            chips[i].getBoundingClientRect();
        }
    });
}

function handleAttributeRowDragStart(event) {
    if (!isAttributeEditMode) return;
    if (event.target && event.target.closest('.attribute-chip')) {
        return;
    }
    const rowIndex = event.currentTarget.getAttribute('data-row-index');
    const parsed = parseInt(rowIndex, 10);
    if (Number.isNaN(parsed) || parsed < 0) return;
    draggedAttributeRowIndex = parsed;
    event.dataTransfer.setData('text/plain', `row:${parsed}`);
}

function handleAttributeRowDrop(event) {
    if (!isAttributeEditMode) return;
    event.preventDefault();
    const targetRowIndex = parseInt(event.currentTarget.getAttribute('data-row-index'), 10);
    if (Number.isNaN(targetRowIndex) || targetRowIndex < 0) return;
    if (draggedAttributeRowIndex === null || draggedAttributeRowIndex === targetRowIndex) return;

    const tmp = ATTRIBUTE_GROUPS[draggedAttributeRowIndex];
    ATTRIBUTE_GROUPS[draggedAttributeRowIndex] = ATTRIBUTE_GROUPS[targetRowIndex];
    ATTRIBUTE_GROUPS[targetRowIndex] = tmp;
    draggedAttributeRowIndex = null;
    saveAttributeGroupOrder();
    renderAttributePicker();
}

function handleAttributeDragStart(event) {
    if (!isAttributeEditMode) return;
    const attr = event.currentTarget.getAttribute('data-attr');
    const groupIndex = event.currentTarget.getAttribute('data-group-index');
    event.dataTransfer.setData('text/plain', JSON.stringify({ attr, groupIndex }));
}

function handleAttributeDrop(event) {
    if (!isAttributeEditMode) return;
    event.preventDefault();
    const targetAttr = event.currentTarget.getAttribute('data-attr');
    const targetGroupIndex = parseInt(event.currentTarget.getAttribute('data-group-index'), 10);
    if (!targetAttr || Number.isNaN(targetGroupIndex) || targetGroupIndex < 0) {
        return;
    }

    let payload = null;
    try {
        payload = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (error) {
        return;
    }
    if (!payload || payload.groupIndex === undefined || payload.attr === undefined) {
        return;
    }

    const sourceGroupIndex = parseInt(payload.groupIndex, 10);
    const sourceAttr = payload.attr;
    if (Number.isNaN(sourceGroupIndex) || sourceGroupIndex !== targetGroupIndex) {
        return;
    }
    if (sourceAttr === targetAttr) {
        return;
    }

    const group = ATTRIBUTE_GROUPS[sourceGroupIndex];
    const sourceIdx = group.indexOf(sourceAttr);
    const targetIdx = group.indexOf(targetAttr);
    if (sourceIdx === -1 || targetIdx === -1) {
        return;
    }

    group[sourceIdx] = targetAttr;
    group[targetIdx] = sourceAttr;
    saveAttributeGroupOrder();
    renderAttributePicker();
}

function applySavedAttributeGroupOrder() {
    try {
        const raw = localStorage.getItem(ATTRIBUTE_GROUP_ORDER_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        applyAttributeGroupOrderObject(saved);
    } catch (error) {
        console.warn('读取属性布局失败:', error);
    }
}

function saveAttributeGroupOrder() {
    try {
        const payload = {};
        ATTRIBUTE_GROUPS.forEach((group, index) => {
            payload[String(index)] = group.slice();
        });
        localStorage.setItem(ATTRIBUTE_GROUP_ORDER_KEY, JSON.stringify(payload));
        if (ipcRenderer && typeof ipcRenderer.send === 'function') {
            ipcRenderer.send('save-attribute-layout', payload);
        }
    } catch (error) {
        console.warn('保存属性布局失败:', error);
    }
}

function applyAttributeGroupOrderObject(saved) {
    if (!saved || typeof saved !== 'object') return;
    ATTRIBUTE_GROUPS.forEach((group, index) => {
        const key = String(index);
        const savedOrder = Array.isArray(saved[key]) ? saved[key] : null;
        if (!savedOrder) return;
        const keep = savedOrder.filter(item => group.includes(item));
        const missing = group.filter(item => !keep.includes(item));
        ATTRIBUTE_GROUPS[index] = [...keep, ...missing];
    });
}

function toggleAttributeSelection(attribute) {
    if (selectedAttributes.has(attribute)) {
        selectedAttributes.delete(attribute);
    } else {
        selectedAttributes.add(attribute);
    }
    renderAttributePicker();
    updateMessageWithAttributeIntersection();
}

function clearAttributeSelection() {
    if (recognizeEditContext) {
        closeModal();
        return;
    }
    selectedAttributes.clear();
    renderAttributePicker();
    const messageTextarea = document.getElementById('message');
    const resultElement = document.getElementById('result');
    if (messageTextarea) {
        messageTextarea.value = '';
        syncRecognizeMessageAutoHeight();
        messageTextarea.focus();
    }
    if (resultElement) {
        resultElement.innerHTML = '';
    }
    setRecognizePreviewError('');
    clearMessageLineError();
}

function renderCustomAttributeList() {
    // 已按需求移除左侧列表展示区域，保留函数用于兼容调用
}

function getAnchorModeLabel(mode) {
    return ANCHOR_MODE_LABELS[mode] || mode || '-';
}

function getAttributeCombinePolicyLabel(policy) {
    return ATTRIBUTE_COMBINE_POLICY_LABELS[policy] || policy || '-';
}

function getAnchorParseModeLabel(mode) {
    return ANCHOR_PARSE_MODE_LABELS[mode] || mode || '-';
}

function parsePositiveNumericInput(value) {
    const raw = String(value == null ? '' : value).trim();
    if (!raw) {
        return { empty: true, value: NaN };
    }
    const normalized = raw
        .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248))
        .replace(/[．。]/g, '.');
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return { empty: false, value: NaN };
    }
    return { empty: false, value: parsed };
}

function createDefaultAnchorGuideState() {
    return {
        loginCount: 0,
        dismissed: false,
        completed: {
            anchor: false,
            parseMode: false,
            combinePolicy: false
        }
    };
}

function sanitizeAnchorGuideState(rawState) {
    const safe = createDefaultAnchorGuideState();
    if (!rawState || typeof rawState !== 'object') {
        return safe;
    }

    const loginCount = Number(rawState.loginCount);
    safe.loginCount = Number.isFinite(loginCount) ? Math.max(0, Math.min(999, Math.floor(loginCount))) : 0;
    safe.dismissed = rawState.dismissed === true;

    const completed = rawState.completed && typeof rawState.completed === 'object' ? rawState.completed : {};
    safe.completed.anchor = completed.anchor === true;
    safe.completed.parseMode = completed.parseMode === true;
    safe.completed.combinePolicy = completed.combinePolicy === true;
    return safe;
}

function loadAnchorGuideState() {
    try {
        const raw = localStorage.getItem(ANCHOR_STRATEGY_GUIDE_STATE_KEY);
        if (!raw) return createDefaultAnchorGuideState();
        const parsed = JSON.parse(raw);
        return sanitizeAnchorGuideState(parsed);
    } catch (error) {
        return createDefaultAnchorGuideState();
    }
}

function saveAnchorGuideState() {
    if (!anchorGuideState) return;
    try {
        localStorage.setItem(ANCHOR_STRATEGY_GUIDE_STATE_KEY, JSON.stringify(anchorGuideState));
    } catch (error) {
        // ignore
    }
}

function areAllAnchorGuideStepsCompleted() {
    if (!anchorGuideState || !anchorGuideState.completed) return false;
    return anchorGuideState.completed.anchor === true
        && anchorGuideState.completed.parseMode === true
        && anchorGuideState.completed.combinePolicy === true;
}

function getAnchorGuideCurrentStep() {
    const loginCount = Number(anchorGuideState && anchorGuideState.loginCount ? anchorGuideState.loginCount : 0);
    if (loginCount <= 1) return 1;
    if (loginCount === 2) return 2;
    return 3;
}

function getAnchorGuideStepKey(step) {
    if (step === 1) return 'anchor';
    if (step === 2) return 'parseMode';
    return 'combinePolicy';
}

function isAnchorGuideStepDone(stepKey) {
    return !!(anchorGuideState
        && anchorGuideState.completed
        && Object.prototype.hasOwnProperty.call(anchorGuideState.completed, stepKey)
        && anchorGuideState.completed[stepKey] === true);
}

function shouldShowAnchorStrategyGuide() {
    if (!anchorGuideState || anchorGuideHiddenForSession) return false;
    if (anchorGuideState.dismissed === true) return false;
    if (areAllAnchorGuideStepsCompleted()) return false;
    const loginCount = Number(anchorGuideState.loginCount || 0);
    return loginCount >= 1 && loginCount <= 3;
}

function initAnchorStrategyGuide() {
    anchorGuideState = loadAnchorGuideState();
    anchorGuideState.loginCount += 1;
    if (areAllAnchorGuideStepsCompleted()) {
        anchorGuideState.dismissed = true;
    }
    saveAnchorGuideState();
    renderAnchorStrategyGuide();
}

function markAnchorGuideStepCompleted(stepKey) {
    if (!anchorGuideState || !anchorGuideState.completed) return;
    if (!Object.prototype.hasOwnProperty.call(anchorGuideState.completed, stepKey)) return;
    if (anchorGuideState.completed[stepKey] !== true) {
        anchorGuideState.completed[stepKey] = true;
    }
    if (areAllAnchorGuideStepsCompleted()) {
        anchorGuideState.dismissed = true;
    }
    saveAnchorGuideState();
    renderAnchorStrategyGuide();
}

function clearAnchorGuideFocusTargets() {
    if (!Array.isArray(anchorGuideFocusTargetIds) || anchorGuideFocusTargetIds.length === 0) return;
    anchorGuideFocusTargetIds.forEach((id) => {
        const node = document.getElementById(id);
        if (!node) return;
        node.classList.remove('anchor-guide-focus-target');
    });
    anchorGuideFocusTargetIds = [];
}

function applyAnchorGuideFocusTargets(nodeIds = []) {
    clearAnchorGuideFocusTargets();
    if (!Array.isArray(nodeIds) || nodeIds.length === 0) return;
    const applied = [];
    nodeIds.forEach((id) => {
        const node = document.getElementById(id);
        if (!node) return;
        node.classList.add('anchor-guide-focus-target');
        applied.push(id);
    });
    anchorGuideFocusTargetIds = applied;
}

function getAnchorGuideStepConfig(step) {
    if (step === 1) {
        const done = isAnchorGuideStepDone('anchor');
        return {
            title: '第 1 步：先保存 1 个锚点词',
            summary: done
                ? '本步已完成。建议继续补充高频词，减少“金额归属”歧义。'
                : '先在全局规则中保存 1 个高频锚点词，再开始批量识别。',
            examples: [
                '14.21 每个10 -> 两个号码都按 10 计。',
                '鼠牛虎 各肖30 -> 每个目标组下注 30，再在组内平分。',
                '01.02.03 平摊30 -> 本段总额 30，三号均分每号 10。'
            ],
            focusIds: ['createAnchorRuleBtn', 'anchorStrategyTab_per_number', 'anchorRuleDrawerToken', 'anchorRuleDrawerMode'],
            actions: [
                { label: '填入示例：都买 -> 每个号码下注金额', action: 'fill_anchor', token: '都买', mode: 'per_number', primary: true },
                { label: '填入示例：各肖 -> 每个目标组下注金额', action: 'fill_anchor', token: '各肖', mode: 'per_target_equal_split' },
                { label: '填入示例：平摊 -> 本段总金额平分', action: 'fill_anchor', token: '平摊', mode: 'per_entry_equal_split' },
                { label: '保存当前锚点词', action: 'save_anchor' },
                { label: '开启微信剪贴板监听', action: 'enable_clipboard' }
            ]
        };
    }
    if (step === 2) {
        const done = isAnchorGuideStepDone('parseMode');
        return {
            title: '第 2 步：选择锚点解析模式',
            summary: done
                ? '本步已完成。后续可按业务稳定性在严格/宽松之间切换。'
                : '严格模式更稳，宽松模式更快。建议先全局保存“严格模式”。',
            examples: [
                '严格模式：必须出现锚点词（如“每个/各肖”）才入账。',
                '宽松模式：未写锚点也可补全（如“09.21 10元”自动补锚点）。',
                '推荐：新客户先严格，熟悉后再按客户切宽松。'
            ],
            focusIds: ['anchorParseMode', 'saveAnchorParseModeBtn', 'clipboardAssistToggle'],
            actions: [
                { label: '一键保存：严格模式（推荐）', action: 'set_parse_mode', mode: 'strict', primary: true },
                { label: '一键保存：宽松模式', action: 'set_parse_mode', mode: 'loose' },
                { label: '开启微信剪贴板监听', action: 'enable_clipboard' }
            ]
        };
    }
    const done = isAnchorGuideStepDone('combinePolicy');
    return {
        title: '第 3 步：选择属性词叠加策略',
        summary: done
            ? '本步已完成。你已具备“锚点词 + 模式 + 策略”的完整配置。'
            : '当同段出现多个属性词时，先定义叠加策略，避免误判。',
        examples: [
            '先交集，空则并集：稳健默认，优先减少误识别。',
            '仅交集：最严格，命中少但准确。',
            '仅并集：召回高，适合宁可多收后复核的场景。'
        ],
        focusIds: ['attributeCombinePolicy', 'saveAttributeCombinePolicyBtn'],
        actions: [
            { label: '一键保存：先交集，空则并集（推荐）', action: 'set_attribute_policy', policy: 'intersection_then_union_fallback', primary: true },
            { label: '一键保存：仅并集', action: 'set_attribute_policy', policy: 'union' }
        ]
    };
}

function renderAnchorGuideActions(actions = []) {
    const actionList = document.getElementById('anchorGuideActionList');
    if (!actionList) return;
    actionList.innerHTML = '';
    actions.forEach((item) => {
        if (!item || !item.action || !item.label) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `anchor-guide-action-btn ${item.primary ? 'primary' : ''}`.trim();
        btn.textContent = item.label;
        btn.addEventListener('click', () => {
            handleAnchorGuideAction(item.action, item);
        });
        actionList.appendChild(btn);
    });
}

function renderAnchorStrategyGuide() {
    const card = document.getElementById('anchorGuideCard');
    const titleEl = document.getElementById('anchorGuideTitle');
    const progressEl = document.getElementById('anchorGuideProgress');
    const summaryEl = document.getElementById('anchorGuideSummary');
    const examplesEl = document.getElementById('anchorGuideExampleList');
    if (!card || !titleEl || !progressEl || !summaryEl || !examplesEl) return;

    if (!shouldShowAnchorStrategyGuide()) {
        card.style.display = 'none';
        clearAnchorGuideFocusTargets();
        return;
    }

    const step = getAnchorGuideCurrentStep();
    const config = getAnchorGuideStepConfig(step);
    const stepKey = getAnchorGuideStepKey(step);
    const doneTag = isAnchorGuideStepDone(stepKey) ? '（已完成）' : '';
    titleEl.textContent = `${config.title}${doneTag}`;
    progressEl.textContent = `第 ${step} 次登录引导（共 3 次）`;
    summaryEl.textContent = config.summary;

    examplesEl.innerHTML = '';
    (config.examples || []).forEach((line) => {
        const li = document.createElement('li');
        li.textContent = line;
        examplesEl.appendChild(li);
    });
    renderAnchorGuideActions(config.actions || []);
    applyAnchorGuideFocusTargets(config.focusIds || []);
    card.style.display = '';
}

function fillAnchorGuideTokenExample(token, mode) {
    const tokenInput = document.getElementById('anchorAliasToken');
    const modeInput = document.getElementById('anchorAliasMode');
    if (typeof setAnchorConsoleTab === 'function') {
        setAnchorConsoleTab('library');
    }
    if (typeof setAnchorRuleScope === 'function') {
        setAnchorRuleScope('global');
    }
    if (tokenInput) {
        tokenInput.value = String(token || '').trim();
        tokenInput.focus();
        tokenInput.select();
    }
    if (modeInput && modeInput.querySelector(`option[value="${mode}"]`)) {
        modeInput.value = mode;
    }
    if (typeof setAnchorStrategyTab === 'function') {
        setAnchorStrategyTab(mode);
    }
    openAnchorRuleDrawer({
        token,
        mode,
        enabled: true
    });
    showSuccess('示例已填入，请在下方抽屉点击“保存”生效');
}

function handleAnchorGuideAction(action, payload = {}) {
    if (!action) return;
    if (action === 'fill_anchor') {
        fillAnchorGuideTokenExample(payload.token, payload.mode);
        return;
    }
    if (action === 'save_anchor') {
        saveAnchorAliasRule();
        return;
    }
    if (action === 'set_parse_mode') {
        if (typeof setAnchorConsoleTab === 'function') {
            setAnchorConsoleTab('parse_mode');
        }
        if (typeof setAnchorRuleScope === 'function') {
            setAnchorRuleScope('global');
        }
        const modeInput = document.getElementById('anchorParseMode');
        const mode = String(payload.mode || '').trim();
        if (modeInput && modeInput.querySelector(`option[value="${mode}"]`)) {
            modeInput.value = mode;
        }
        saveAnchorParseModeRule();
        return;
    }
    if (action === 'set_attribute_policy') {
        if (typeof setAnchorConsoleTab === 'function') {
            setAnchorConsoleTab('advanced');
        }
        if (typeof setAnchorRuleScope === 'function') {
            setAnchorRuleScope('global');
        }
        const policyInput = document.getElementById('attributeCombinePolicy');
        const policy = String(payload.policy || '').trim();
        if (policyInput && policyInput.querySelector(`option[value="${policy}"]`)) {
            policyInput.value = policy;
        }
        saveAttributeCombinePolicyRule();
        return;
    }
    if (action === 'enable_clipboard') {
        setClipboardAssistEnabled(true);
    }
}

function ensureAnchorGuideVisibleWhenRecognizeOpen() {
    renderAnchorStrategyGuide();
    if (!shouldShowAnchorStrategyGuide()) return;
    if (anchorGuideAutoExpanded) return;
    anchorGuideAutoExpanded = true;

    if (!recognizeAttributePanelVisible) {
        applyRecognizeAttributePanelVisible(true, { persist: true });
    }
    recognizeSideGroupState = {
        attributes: false,
        anchors: true
    };
    applyRecognizeSideGroups();
    saveRecognizeSideGroupState();
}

function snoozeAnchorStrategyGuide() {
    anchorGuideHiddenForSession = true;
    renderAnchorStrategyGuide();
}

function dismissAnchorStrategyGuide() {
    if (!anchorGuideState) return;
    anchorGuideState.dismissed = true;
    saveAnchorGuideState();
    renderAnchorStrategyGuide();
}

function getAnchorRuleScope() {
    const scopeInput = document.getElementById('anchorRuleScope');
    return scopeInput && scopeInput.value === 'client' ? 'client' : 'global';
}

function getScopeDisplayName(scope) {
    return scope === 'client' ? '客户专属' : '全局';
}

function getAnchorAliasSourceLabel(source, scope = 'global') {
    if (source === 'client') return '客户';
    if (source === 'global') return scope === 'client' ? '全局(继承)' : '全局';
    return '系统默认';
}

function getAnchorAliasFilterState() {
    const searchInput = document.getElementById('anchorAliasSearch');
    const sourceInput = document.getElementById('anchorAliasSourceFilter');
    const enabledInput = document.getElementById('anchorAliasEnabledOnly');
    return {
        keyword: searchInput ? String(searchInput.value || '').trim().toLowerCase() : '',
        source: sourceInput ? String(sourceInput.value || 'all').trim() : 'all',
        enabledOnly: !!(enabledInput && enabledInput.checked)
    };
}

function initAnchorAliasFilterControls() {
    const searchInput = document.getElementById('anchorAliasSearch');
    const sourceInput = document.getElementById('anchorAliasSourceFilter');
    const enabledInput = document.getElementById('anchorAliasEnabledOnly');

    [searchInput, sourceInput, enabledInput].forEach((node) => {
        if (!node || node.dataset.bound === '1') return;
        node.dataset.bound = '1';
        const eventName = node === searchInput ? 'input' : 'change';
        node.addEventListener(eventName, () => {
            renderAnchorAliasList();
        });
    });

    const impactInput = document.getElementById('anchorImpactSampleInput');
    if (impactInput && impactInput.dataset.bound !== '1') {
        impactInput.dataset.bound = '1';
        impactInput.addEventListener('input', () => {
            renderAnchorImpactPreview();
        });
    }

    const drawerInputs = [
        document.getElementById('anchorRuleDrawerScope'),
        document.getElementById('anchorRuleDrawerToken'),
        document.getElementById('anchorRuleDrawerMode'),
        document.getElementById('anchorRuleDrawerOdds'),
        document.getElementById('anchorRuleDrawerEnabled')
    ];
    drawerInputs.forEach((node) => {
        if (!node || node.dataset.bound === '1') return;
        node.dataset.bound = '1';
        const eventName = node.tagName === 'SELECT' || node.type === 'checkbox' ? 'change' : 'input';
        node.addEventListener(eventName, () => {
            renderAnchorRuleDrawerPreview();
        });
    });

    const defaultOddsInput = document.getElementById('defaultOddsInput');
    if (defaultOddsInput && defaultOddsInput.dataset.bound !== '1') {
        defaultOddsInput.dataset.bound = '1';
        defaultOddsInput.addEventListener('input', () => {
            if (!window.messageProcessor || typeof window.messageProcessor.getEffectiveDefaultOdds !== 'function') return;
            const input = parsePositiveNumericInput(defaultOddsInput.value);
            if (input.empty) return;
            if (Number.isFinite(input.value)) {
                defaultOddsInput.value = formatNumericAmount(input.value);
            }
        });
    }
}

function sanitizeAnchorSubgroupState(rawState) {
    const safe = {
        advanced: true,
        library: false
    };
    if (!rawState || typeof rawState !== 'object') {
        return safe;
    }
    ANCHOR_SUBGROUP_CONFIGS.forEach((item) => {
        if (Object.prototype.hasOwnProperty.call(rawState, item.key)) {
            safe[item.key] = rawState[item.key] === true;
        }
    });
    return safe;
}

function loadAnchorSubgroupState() {
    try {
        const raw = localStorage.getItem(ANCHOR_SUBGROUP_STATE_KEY);
        if (!raw) return sanitizeAnchorSubgroupState(null);
        const parsed = JSON.parse(raw);
        return sanitizeAnchorSubgroupState(parsed);
    } catch (error) {
        return sanitizeAnchorSubgroupState(null);
    }
}

function saveAnchorSubgroupState() {
    try {
        localStorage.setItem(ANCHOR_SUBGROUP_STATE_KEY, JSON.stringify(anchorSubgroupState));
    } catch (error) {
        // ignore
    }
}

function getAnchorSubgroupConfig(key) {
    const normalizedKey = key === 'parse_mode' ? 'advanced' : key;
    return ANCHOR_SUBGROUP_CONFIGS.find(item => item.key === normalizedKey) || ANCHOR_SUBGROUP_CONFIGS[0];
}

function collectAnchorRuleDrawerState() {
    const scopeSelect = document.getElementById('anchorRuleDrawerScope');
    const tokenInput = document.getElementById('anchorRuleDrawerToken');
    const modeInput = document.getElementById('anchorRuleDrawerMode');
    const oddsInput = document.getElementById('anchorRuleDrawerOdds');
    const enabledInput = document.getElementById('anchorRuleDrawerEnabled');
    const parsedOdds = parsePositiveNumericInput(oddsInput ? oddsInput.value : '');
    return {
        scope: scopeSelect ? String(scopeSelect.value || '').trim() : 'global',
        clientId: scopeSelect ? String(scopeSelect.dataset.clientId || '').trim() : '',
        token: tokenInput ? String(tokenInput.value || '').trim() : '',
        mode: modeInput ? String(modeInput.value || '').trim() : '',
        odds: parsedOdds.empty ? '' : (Number.isFinite(parsedOdds.value) ? formatNumericAmount(parsedOdds.value) : '__invalid__'),
        enabled: !!(enabledInput && enabledInput.checked)
    };
}

function isAnchorRuleDrawerDirty() {
    if (!anchorRuleDrawerState || anchorRuleDrawerState.open !== true || !anchorRuleDrawerSnapshot) {
        return false;
    }
    const current = collectAnchorRuleDrawerState();
    return current.scope !== String(anchorRuleDrawerSnapshot.scope || '').trim()
        || current.clientId !== String(anchorRuleDrawerSnapshot.clientId || '').trim()
        || current.token !== String(anchorRuleDrawerSnapshot.token || '').trim()
        || current.mode !== String(anchorRuleDrawerSnapshot.mode || '').trim()
        || String(current.odds || '').trim() !== String(anchorRuleDrawerSnapshot.odds || '').trim()
        || current.enabled !== !!anchorRuleDrawerSnapshot.enabled;
}

function isAnchorParseModeDirty() {
    const modeInput = document.getElementById('anchorParseMode');
    if (!modeInput) return false;
    const baseline = String(modeInput.dataset.baselineValue || '').trim();
    return baseline && String(modeInput.value || '').trim() !== baseline;
}

function isAttributeCombinePolicyDirty() {
    const policyInput = document.getElementById('attributeCombinePolicy');
    if (!policyInput) return false;
    const baseline = String(policyInput.dataset.baselineValue || '').trim();
    return baseline && String(policyInput.value || '').trim() !== baseline;
}

function isDefaultOddsDirty() {
    const oddsInput = document.getElementById('defaultOddsInput');
    if (!oddsInput) return false;
    const baseline = String(oddsInput.dataset.baselineValue || '').trim();
    if (!baseline) return false;
    const current = parsePositiveNumericInput(oddsInput.value);
    if (current.empty || !Number.isFinite(current.value)) return true;
    return formatNumericAmount(current.value) !== baseline;
}

function getAnchorSubgroupClosePrompt(key) {
    if (key === 'library' && isAnchorRuleDrawerDirty()) {
        return '规则词库中有未保存的锚点词编辑，确定关闭该分组吗？';
    }
    if (key === 'advanced' && (isAnchorParseModeDirty() || isAttributeCombinePolicyDirty() || isDefaultOddsDirty())) {
        return '默认赔率、属性叠加策略或解析模式有未保存修改，确定关闭该分组吗？';
    }
    return '';
}

function renderAnchorSubgroups() {
    ANCHOR_SUBGROUP_CONFIGS.forEach((item) => {
        const isOpen = !!anchorSubgroupState[item.key];
        const root = document.getElementById(item.rootId);
        const toggle = document.getElementById(item.toggleId);
        const body = document.getElementById(item.bodyId);
        if (root) {
            root.classList.toggle('expanded', isOpen);
            root.classList.toggle('collapsed', !isOpen);
        }
        if (toggle) {
            // 二级折叠入口必须始终可点击，不受规则层禁用状态影响
            toggle.disabled = false;
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
        if (body) {
            body.hidden = !isOpen;
            body.style.display = isOpen ? '' : 'none';
            body.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        }
    });
}

function toggleAnchorSubgroup(key) {
    const config = getAnchorSubgroupConfig(key);
    const current = !!anchorSubgroupState[config.key];
    if (current) {
        const promptText = getAnchorSubgroupClosePrompt(config.key);
        if (promptText) {
            const ok = confirm(promptText);
            if (!ok) return;
        }
        if (config.key === 'library') {
            closeAnchorRuleDrawer();
        }
        anchorSubgroupState[config.key] = false;
    } else {
        anchorSubgroupState[config.key] = true;
        if (config.key === 'library') {
            renderAnchorAliasList();
            renderAnchorImpactPreview();
        } else {
            renderAnchorParseModeState();
            renderAttributeCombinePolicyState();
            renderAnchorNoviceGuide();
        }
    }
    saveAnchorSubgroupState();
    renderAnchorSubgroups();
}

function getAnchorRuleClientCandidates() {
    if (window.userManager && typeof window.userManager.getSortedUsers === 'function') {
        return window.userManager.getSortedUsers();
    }
    if (window.userManager && window.userManager.users && typeof window.userManager.users === 'object') {
        return Object.keys(window.userManager.users).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
    }
    return [];
}

function resolveAnchorRuleClientId(options = {}) {
    const clientCandidates = Array.isArray(options.clientCandidates)
        ? options.clientCandidates
        : getAnchorRuleClientCandidates();
    const selectInput = document.getElementById('anchorRuleClientSelect');
    const allowSelectionFallback = !(options && options.allowSelectionFallback === false);

    let resolved = String(anchorRuleTargetClientId || '').trim();
    if (!resolved && selectInput) {
        resolved = String(selectInput.value || '').trim();
    }

    if ((!resolved || !clientCandidates.includes(resolved)) && allowSelectionFallback) {
        const selectedUsers = getEditableUsersForCurrentSelection();
        if (selectedUsers.length === 1 && clientCandidates.includes(selectedUsers[0])) {
            resolved = selectedUsers[0];
        }
    }

    if (!clientCandidates.includes(resolved)) {
        resolved = '';
    }
    return resolved;
}

function syncAnchorRuleScopeButtons() {
    const scope = getAnchorRuleScope();
    const globalBtn = document.getElementById('anchorScopeGlobalBtn');
    const clientBtn = document.getElementById('anchorScopeClientBtn');
    if (globalBtn) {
        const isActive = scope === 'global';
        globalBtn.classList.toggle('active', isActive);
        globalBtn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
    if (clientBtn) {
        const isActive = scope === 'client';
        clientBtn.classList.toggle('active', isActive);
        clientBtn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
}

function renderAnchorRuleClientSelect() {
    const clientRow = document.getElementById('anchorRuleClientRow');
    const selectInput = document.getElementById('anchorRuleClientSelect');
    const scope = getAnchorRuleScope();
    if (clientRow) {
        clientRow.style.display = scope === 'client' ? '' : 'none';
    }
    if (!selectInput) return;

    const clientCandidates = getAnchorRuleClientCandidates();
    const resolved = resolveAnchorRuleClientId({ clientCandidates, allowSelectionFallback: true });
    anchorRuleTargetClientId = resolved || (clientCandidates[0] || '');

    selectInput.innerHTML = '';
    if (clientCandidates.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '暂无客户';
        selectInput.appendChild(option);
        selectInput.value = '';
        selectInput.disabled = true;
        anchorRuleTargetClientId = '';
        return;
    }

    clientCandidates.forEach((clientName) => {
        const option = document.createElement('option');
        option.value = clientName;
        option.textContent = clientName;
        selectInput.appendChild(option);
    });
    selectInput.disabled = false;
    selectInput.value = anchorRuleTargetClientId || clientCandidates[0];
}

function setAnchorRuleScope(scope) {
    const nextScope = scope === 'client' ? 'client' : 'global';
    const scopeInput = document.getElementById('anchorRuleScope');
    if (scopeInput) {
        scopeInput.value = nextScope;
    }
    handleAnchorRuleScopeChange();
}

function handleAnchorRuleClientChange() {
    const selectInput = document.getElementById('anchorRuleClientSelect');
    anchorRuleTargetClientId = selectInput ? String(selectInput.value || '').trim() : '';
    handleAnchorRuleScopeChange();
}

function setAnchorRuleControlsEnabled(enabled) {
    const nodeIds = [
        'anchorParseMode',
        'attributeCombinePolicy',
        'defaultOddsInput',
        'saveAnchorParseModeBtn',
        'resetAnchorParseModeBtn',
        'saveAttributeCombinePolicyBtn',
        'resetAttributeCombinePolicyBtn',
        'saveDefaultOddsBtn',
        'resetDefaultOddsBtn',
        'createAnchorRuleBtn',
        'anchorStrategyTab_per_number',
        'anchorStrategyTab_per_target_equal_split',
        'anchorStrategyTab_per_entry_equal_split',
        'anchorStrategyTab_undetermined',
        'anchorAliasSearch',
        'anchorAliasSourceFilter',
        'anchorAliasEnabledOnly',
        'anchorImpactSampleInput',
        'anchorRuleDrawerScope',
        'anchorRuleDrawerToken',
        'anchorRuleDrawerMode',
        'anchorRuleDrawerOdds',
        'anchorRuleDrawerEnabled'
    ];
    nodeIds.forEach((id) => {
        const node = document.getElementById(id);
        if (!node) return;
        node.disabled = !enabled;
    });
}

function getRuleContext(options = {}) {
    const scope = getAnchorRuleScope();
    const requireClient = !!(options && options.requireClientForClientScope);
    let clientId = '';

    if (scope === 'client') {
        const clientCandidates = getAnchorRuleClientCandidates();
        clientId = resolveAnchorRuleClientId({ clientCandidates, allowSelectionFallback: true });
        if (requireClient) {
            if (clientCandidates.length === 0) {
                throw new Error('请先创建客户后再设置客户专属规则');
            }
            if (!clientId) {
                throw new Error('请选择要编辑的客户');
            }
        }
    }

    return { scope, clientId };
}

function getPreviewClientId() {
    const selectedUsers = getEditableUsersForCurrentSelection();
    return selectedUsers.length === 1 ? selectedUsers[0] : '';
}

function initAnchorRuleControls() {
    const scopeInput = document.getElementById('anchorRuleScope');
    if (scopeInput && !scopeInput.value) {
        scopeInput.value = 'global';
    }
    anchorSubgroupState = loadAnchorSubgroupState();
    const firstConfig = ANCHOR_STRATEGY_GROUP_CONFIGS[0];
    anchorStrategyActiveTab = firstConfig ? firstConfig.mode : 'per_number';
    const selectedUsers = getEditableUsersForCurrentSelection();
    if (selectedUsers.length === 1) {
        anchorRuleTargetClientId = selectedUsers[0];
    }
    const impactInput = document.getElementById('anchorImpactSampleInput');
    if (impactInput && !String(impactInput.value || '').trim()) {
        impactInput.value = (firstConfig && firstConfig.defaultSample) || '猴蛇狗都买10';
    }
    renderAnchorSubgroups();
    syncAnchorRuleScopeButtons();
    renderAnchorRuleClientSelect();
    handleAnchorRuleScopeChange();
}

function handleAnchorRuleScopeChange() {
    renderAnchorSubgroups();
    syncAnchorRuleScopeButtons();
    renderAnchorRuleClientSelect();
    const { scope, clientId } = getRuleContext();
    const resetClientBtn = document.getElementById('resetClientRuleBtn');
    const enableRuleControls = !(scope === 'client' && !clientId);
    setAnchorRuleControlsEnabled(enableRuleControls);
    if (!enableRuleControls) {
        closeAnchorRuleDrawer();
    }

    if (scope === 'client' && clientId) {
        if (resetClientBtn) resetClientBtn.style.display = '';
    } else {
        if (resetClientBtn) resetClientBtn.style.display = 'none';
    }

    renderAnchorScopeExplain(scope, clientId);
    renderAnchorAliasList();
    renderDefaultOddsState();
    renderAnchorParseModeState();
    renderAttributeCombinePolicyState();
    renderAnchorNoviceGuide();
    renderAnchorImpactPreview();
    renderAnchorStrategyGuide();
}

function getAnchorRuleSourceLabel(source) {
    if (source === 'client') return '客户专属';
    if (source === 'global') return '全局';
    return '系统默认';
}

function renderAnchorScopeExplain(scope, clientId) {
    const explainEl = document.getElementById('anchorScopeExplain');
    if (!explainEl) return;
    const currentScope = scope === 'client' ? 'client' : 'global';
    const currentClientId = String(clientId || '').trim();
    explainEl.className = 'anchor-scope-explain';
    if (currentScope === 'client') {
        if (!currentClientId) {
            explainEl.classList.add('is-warning');
            explainEl.textContent = '当前选择：修改客户层。请先选择客户后再保存。生效优先级：客户专属 > 全局 > 系统默认（系统级只读）。';
            return;
        }
        explainEl.classList.add('is-client');
        explainEl.textContent = `当前选择：修改客户「${currentClientId}」层。保存后仅该客户生效，且会覆盖全局与系统默认。优先级：客户专属 > 全局 > 系统默认（系统级只读）。`;
        return;
    }
    explainEl.classList.add('is-global');
    explainEl.textContent = '当前选择：修改全局层。保存后对所有客户生效；若某客户有专属规则，会以客户规则优先。优先级：客户专属 > 全局 > 系统默认（系统级只读）。';
}

function getAnchorParseModeExplainMeta(mode) {
    if (mode === 'loose') {
        return {
            effect: '宽松模式：未写锚点词时也尝试补锚点，识别更“快”。',
            example: '例：`09.21 10元` 也可能入账为标准格式（但建议复核）。'
        };
    }
    return {
        effect: '严格模式：必须出现锚点词（如“各/各号/买”）才入账，最稳。',
        example: '例：`09.21 10元` 会提示缺少锚点；`09.21各10` 正常入账。'
    };
}

function formatExplainNumberList(numbers = []) {
    return numbers
        .map((item) => parseInt(item, 10))
        .filter((item) => Number.isInteger(item) && item >= 1 && item <= 49)
        .sort((a, b) => a - b)
        .map((item) => String(item).padStart(2, '0'))
        .join('.');
}

function getExplainAttributeSet(attributeName, fallback = []) {
    const normalizedFallback = Array.isArray(fallback)
        ? fallback
            .map((item) => parseInt(item, 10))
            .filter((item) => Number.isInteger(item) && item >= 1 && item <= 49)
            .sort((a, b) => a - b)
        : [];
    if (!window.messageProcessor || typeof window.messageProcessor.getAttributeMap !== 'function') {
        return normalizedFallback;
    }
    const map = window.messageProcessor.getAttributeMap();
    const raw = map && Array.isArray(map[attributeName]) ? map[attributeName] : [];
    const normalized = raw
        .map((item) => parseInt(item, 10))
        .filter((item) => Number.isInteger(item) && item >= 1 && item <= 49)
        .sort((a, b) => a - b);
    return normalized.length > 0 ? normalized : normalizedFallback;
}

function buildRedOddCombineExampleDetails() {
    const redFallback = [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46];
    const oddFallback = Array.from({ length: 49 }, (_, i) => i + 1).filter(item => item % 2 === 1);
    const redSet = getExplainAttributeSet('红波', redFallback);
    const oddSet = getExplainAttributeSet('单', oddFallback);
    const oddLookup = new Set(oddSet);
    const intersection = redSet.filter(item => oddLookup.has(item));
    const union = Array.from(new Set([...redSet, ...oddSet])).sort((a, b) => a - b);
    const amountPerNumber = 5;
    const intersectionCanonical = intersection.length > 0 ? `${formatExplainNumberList(intersection)}各${amountPerNumber}` : '（空）';
    const unionCanonical = union.length > 0 ? `${formatExplainNumberList(union)}各${amountPerNumber}` : '（空）';
    return {
        intersection,
        union,
        details: [
            `红波（${redSet.length}个）：${formatExplainNumberList(redSet)}`,
            `单数（${oddSet.length}个）：${formatExplainNumberList(oddSet)}`,
            `交集（${intersection.length}个）：${intersection.length > 0 ? formatExplainNumberList(intersection) : '（空）'}`,
            `并集（${union.length}个）：${formatExplainNumberList(union)}`,
            `按“各数5”计算：交集结果是 ${intersectionCanonical}（总额 ${formatNumericAmount(intersection.length * amountPerNumber)}）；并集结果是 ${unionCanonical}（总额 ${formatNumericAmount(union.length * amountPerNumber)}）。`
        ]
    };
}

function getAttributeCombinePolicyExplainMeta(policy) {
    const example = buildRedOddCombineExampleDetails();
    if (policy === 'intersection') {
        return {
            effect: '仅交集：多个属性词必须同时满足，结果最严格。',
            example: '例：红波单各数5（只取交集）',
            details: [
                ...example.details,
                `当前策略结论：取交集，共 ${example.intersection.length} 个号码。`
            ]
        };
    }
    if (policy === 'union') {
        return {
            effect: '仅并集：满足任一属性词都算，范围更大。',
            example: '例：红波单各数5（只取并集）',
            details: [
                ...example.details,
                `当前策略结论：取并集，共 ${example.union.length} 个号码。`
            ]
        };
    }
    if (policy === 'confirm') {
        return {
            effect: '每次确认：遇到多属性组合时，让你手动选择交集或并集。',
            example: '例：红波单各数5（每次让你选交集或并集）',
            details: [
                ...example.details,
                `当前策略结论：不自动决定，弹窗让你选“交集（${example.intersection.length}个）”或“并集（${example.union.length}个）”。`
            ]
        };
    }
    return {
        effect: '先交集，空则并集：先求精确命中，若无交集再回退并集（推荐）。',
        example: '例：红波单各数5（先看交集，空才并集）',
        details: [
            ...example.details,
            `当前策略结论：本例交集不为空（${example.intersection.length}个），所以最终使用交集，不会走并集回退。`
        ]
    };
}

function renderAnchorParseModeExplain(info = {}) {
    const explainEl = document.getElementById('anchorParseModeExplain');
    if (!explainEl) return;
    if (info.unavailable) {
        explainEl.innerHTML = `<div class="anchor-policy-explain-line">${escapeHtml(info.message || '当前无法读取解析模式说明')}</div>`;
        return;
    }
    const meta = getAnchorParseModeExplainMeta(info.mode);
    explainEl.innerHTML = `
        <div class="anchor-policy-explain-current">当前生效：${escapeHtml(getAnchorParseModeLabel(info.mode))}（来源：${escapeHtml(info.sourceLabel || '-')})</div>
        <div class="anchor-policy-explain-line">效果：${escapeHtml(meta.effect)}</div>
        <div class="anchor-policy-explain-line">${escapeHtml(meta.example)}</div>
    `;
}

function renderAttributeCombinePolicyExplain(info = {}) {
    const explainEl = document.getElementById('attributeCombinePolicyExplain');
    if (!explainEl) return;
    if (info.unavailable) {
        explainEl.innerHTML = `<div class="anchor-policy-explain-line">${escapeHtml(info.message || '当前无法读取叠加策略说明')}</div>`;
        return;
    }
    const meta = getAttributeCombinePolicyExplainMeta(info.policy);
    const detailLines = Array.isArray(meta.details)
        ? meta.details.map((line) => `<div class="anchor-policy-explain-line">${escapeHtml(line)}</div>`).join('')
        : '';
    explainEl.innerHTML = `
        <div class="anchor-policy-explain-current">当前生效：${escapeHtml(getAttributeCombinePolicyLabel(info.policy))}（来源：${escapeHtml(info.sourceLabel || '-')})</div>
        <div class="anchor-policy-explain-line">效果：${escapeHtml(meta.effect)}</div>
        <div class="anchor-policy-explain-line">${escapeHtml(meta.example)}</div>
        ${detailLines}
    `;
}

function recalculateAllUsersByRuleChange() {
    if (!window.userManager || typeof window.userManager.recalculateAllUsersData !== 'function') {
        return;
    }
    window.userManager.recalculateAllUsersData();
    if (typeof window.userManager.saveUserData === 'function') {
        window.userManager.saveUserData();
    }
}

function renderDefaultOddsState() {
    const stateEl = document.getElementById('defaultOddsState');
    const oddsInput = document.getElementById('defaultOddsInput');
    if (!stateEl || !oddsInput) return;

    if (!window.messageProcessor || typeof window.messageProcessor.getEffectiveRuleProfile !== 'function') {
        stateEl.textContent = '当前版本不支持默认赔率设置';
        oddsInput.disabled = true;
        oddsInput.dataset.baselineValue = String(oddsInput.value || '').trim();
        oddsInput.dataset.effectiveValue = '';
        oddsInput.dataset.effectiveSource = 'system';
        return;
    }

    const { scope, clientId } = getRuleContext();
    if (scope === 'client' && !clientId) {
        stateEl.textContent = '请选择目标客户后再设置客户专属默认赔率';
        oddsInput.disabled = true;
        oddsInput.dataset.baselineValue = String(oddsInput.value || '').trim();
        oddsInput.dataset.effectiveValue = '';
        oddsInput.dataset.effectiveSource = 'system';
        return;
    }
    oddsInput.disabled = false;

    const systemProfile = window.messageProcessor.getSystemRuleProfile
        ? window.messageProcessor.getSystemRuleProfile()
        : {};
    const globalProfile = window.messageProcessor.getGlobalRuleProfile
        ? window.messageProcessor.getGlobalRuleProfile()
        : {};
    const clientProfile = clientId && window.messageProcessor.getClientRuleProfile
        ? window.messageProcessor.getClientRuleProfile(clientId)
        : {};
    const effectiveProfile = window.messageProcessor.getEffectiveRuleProfile(clientId || '');

    const effectiveOddsRaw = Number(effectiveProfile.defaultOdds);
    const systemOddsRaw = Number(systemProfile.defaultOdds);
    const effectiveOdds = Number.isFinite(effectiveOddsRaw) && effectiveOddsRaw > 0
        ? effectiveOddsRaw
        : (Number.isFinite(systemOddsRaw) && systemOddsRaw > 0 ? systemOddsRaw : 47);
    const scopedOdds = scope === 'client'
        ? Number(clientProfile.defaultOdds)
        : Number(globalProfile.defaultOdds);
    const displayOdds = Number.isFinite(scopedOdds) && scopedOdds > 0 ? scopedOdds : effectiveOdds;
    oddsInput.value = formatNumericAmount(displayOdds);

    let source = 'system';
    if (clientId && Number.isFinite(Number(clientProfile.defaultOdds)) && Number(clientProfile.defaultOdds) > 0) {
        source = 'client';
    } else if (Number.isFinite(Number(globalProfile.defaultOdds)) && Number(globalProfile.defaultOdds) > 0) {
        source = 'global';
    }
    const sourceLabel = getAnchorRuleSourceLabel(source);
    const scopedTip = Number.isFinite(scopedOdds) && scopedOdds > 0
        ? `本层已设置：${formatNumericAmount(scopedOdds)}。`
        : '本层未设置，继承上层。';
    stateEl.textContent = `当前生效默认赔率：${formatNumericAmount(effectiveOdds)}（来源：${sourceLabel}）。${scopedTip}`;
    oddsInput.dataset.baselineValue = formatNumericAmount(displayOdds);
    oddsInput.dataset.effectiveValue = formatNumericAmount(effectiveOdds);
    oddsInput.dataset.effectiveSource = source;
}

function saveDefaultOddsRule() {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.setDefaultOdds !== 'function') {
            throw new Error('当前版本不支持默认赔率设置');
        }
        const { scope, clientId } = getRuleContext({ requireClientForClientScope: true });
        const oddsInput = document.getElementById('defaultOddsInput');
        const parsed = parsePositiveNumericInput(oddsInput ? oddsInput.value : '');
        if (parsed.empty || !Number.isFinite(parsed.value)) {
            throw new Error('请输入大于0的默认赔率');
        }
        const odds = window.messageProcessor.setDefaultOdds(parsed.value, { scope, clientId });
        renderDefaultOddsState();
        renderAnchorAliasList();
        renderAnchorImpactPreview();
        renderAnchorNoviceGuide();
        recalculateAllUsersByRuleChange();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        } else {
            refreshRegionPnlPanel();
        }
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}默认赔率已保存：${formatNumericAmount(odds)}`);
    } catch (error) {
        showError('保存默认赔率失败', error.message || '未知错误');
    }
}

function resetDefaultOddsRule() {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.clearDefaultOdds !== 'function') {
            throw new Error('当前版本不支持恢复默认赔率');
        }
        const { scope, clientId } = getRuleContext({ requireClientForClientScope: true });
        const ok = confirm(`确定恢复${getScopeDisplayName(scope)}层的默认赔率为上层默认吗？`);
        if (!ok) return;
        window.messageProcessor.clearDefaultOdds({ scope, clientId });
        renderDefaultOddsState();
        renderAnchorAliasList();
        renderAnchorImpactPreview();
        renderAnchorNoviceGuide();
        recalculateAllUsersByRuleChange();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        } else {
            refreshRegionPnlPanel();
        }
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}层默认赔率已恢复为上层默认`);
    } catch (error) {
        showError('恢复默认赔率失败', error.message || '未知错误');
    }
}

function renderAnchorNoviceGuide() {
    const summaryEl = document.getElementById('anchorNoviceGuideSummary');
    const examplesEl = document.getElementById('anchorNoviceGuideExamples');
    if (!summaryEl || !examplesEl) return;
    const { scope, clientId } = getRuleContext();
    if (scope === 'client' && !clientId) {
        summaryEl.textContent = '当前正在修改：客户层（未选择客户）。生效优先级：客户专属 > 全局 > 系统默认（系统级只读）。';
        examplesEl.innerHTML = `
            <div class="anchor-novice-guide-line">请先选择一个客户，再查看该客户当前生效的解析模式和属性叠加策略。</div>
            <div class="anchor-novice-guide-line">你也可以先切回“修改全局”，先配置全局默认策略。</div>
        `;
        return;
    }
    const modeInput = document.getElementById('anchorParseMode');
    const policyInput = document.getElementById('attributeCombinePolicy');
    const oddsInput = document.getElementById('defaultOddsInput');
    const effectiveMode = modeInput
        ? String(modeInput.dataset.effectiveValue || modeInput.value || 'strict').trim() || 'strict'
        : 'strict';
    const effectivePolicy = policyInput
        ? String(policyInput.dataset.effectiveValue || policyInput.value || 'intersection_then_union_fallback').trim() || 'intersection_then_union_fallback'
        : 'intersection_then_union_fallback';
    const modeSource = modeInput ? String(modeInput.dataset.effectiveSource || 'system').trim() : 'system';
    const policySource = policyInput ? String(policyInput.dataset.effectiveSource || 'system').trim() : 'system';
    const effectiveOdds = oddsInput
        ? String(oddsInput.dataset.effectiveValue || oddsInput.value || '47').trim() || '47'
        : '47';
    const oddsSource = oddsInput ? String(oddsInput.dataset.effectiveSource || 'system').trim() : 'system';

    const scopeText = scope === 'client'
        ? (clientId ? `当前正在修改：客户「${clientId}」层` : '当前正在修改：客户层（未选择客户）')
        : '当前正在修改：全局层（所有客户）';
    summaryEl.textContent = `${scopeText}。生效优先级：客户专属 > 全局 > 系统默认（系统级只读）。`;

    const modeMeta = getAnchorParseModeExplainMeta(effectiveMode);
    const policyMeta = getAttributeCombinePolicyExplainMeta(effectivePolicy);
    const policyDetailLines = Array.isArray(policyMeta.details) ? policyMeta.details.slice(0, 5) : [];
    examplesEl.innerHTML = `
        <div class="anchor-novice-guide-line">解析模式：${escapeHtml(getAnchorParseModeLabel(effectiveMode))}（来源：${escapeHtml(getAnchorRuleSourceLabel(modeSource))}）</div>
        <div class="anchor-novice-guide-line">${escapeHtml(modeMeta.effect)}</div>
        <div class="anchor-novice-guide-line">${escapeHtml(modeMeta.example)}</div>
        <div class="anchor-novice-guide-line">叠加策略：${escapeHtml(getAttributeCombinePolicyLabel(effectivePolicy))}（来源：${escapeHtml(getAnchorRuleSourceLabel(policySource))}）</div>
        <div class="anchor-novice-guide-line">${escapeHtml(policyMeta.effect)}</div>
        <div class="anchor-novice-guide-line">${escapeHtml(policyMeta.example)}</div>
        <div class="anchor-novice-guide-line">默认赔率：${escapeHtml(effectiveOdds)}（来源：${escapeHtml(getAnchorRuleSourceLabel(oddsSource))}，锚点可单独覆盖）</div>
        ${policyDetailLines.map((line) => `<div class="anchor-novice-guide-line">${escapeHtml(line)}</div>`).join('')}
    `;
}

function renderAnchorParseModeState() {
    const stateEl = document.getElementById('anchorParseModeState');
    const modeInput = document.getElementById('anchorParseMode');
    if (!stateEl || !modeInput) return;

    if (!window.messageProcessor || typeof window.messageProcessor.getEffectiveRuleProfile !== 'function') {
        stateEl.textContent = '当前版本不支持解析模式设置';
        modeInput.disabled = true;
        modeInput.dataset.baselineValue = String(modeInput.value || '').trim();
        modeInput.dataset.effectiveValue = '';
        modeInput.dataset.effectiveSource = 'system';
        renderAnchorParseModeExplain({ unavailable: true, message: '当前版本不支持解析模式说明。' });
        return;
    }

    const { scope, clientId } = getRuleContext();
    if (scope === 'client' && !clientId) {
        stateEl.textContent = '请选择目标客户后再设置客户专属解析模式';
        modeInput.disabled = true;
        modeInput.dataset.baselineValue = String(modeInput.value || '').trim();
        modeInput.dataset.effectiveValue = '';
        modeInput.dataset.effectiveSource = 'system';
        renderAnchorParseModeExplain({ unavailable: true, message: '当前是客户层，但未选择客户。' });
        return;
    }
    modeInput.disabled = false;

    const systemProfile = window.messageProcessor.getSystemRuleProfile
        ? window.messageProcessor.getSystemRuleProfile()
        : {};
    const globalProfile = window.messageProcessor.getGlobalRuleProfile
        ? window.messageProcessor.getGlobalRuleProfile()
        : {};
    const clientProfile = clientId && window.messageProcessor.getClientRuleProfile
        ? window.messageProcessor.getClientRuleProfile(clientId)
        : {};
    const effectiveProfile = window.messageProcessor.getEffectiveRuleProfile(clientId || '');

    const effectiveMode = effectiveProfile.anchorParseMode
        || systemProfile.anchorParseMode
        || 'strict';
    const scopedMode = scope === 'client'
        ? (clientProfile.anchorParseMode || '')
        : (globalProfile.anchorParseMode || '');

    if (modeInput.querySelector(`option[value="${scopedMode || effectiveMode}"]`)) {
        modeInput.value = scopedMode || effectiveMode;
    }

    let source = 'system';
    if (clientId && clientProfile.anchorParseMode) {
        source = 'client';
    } else if (globalProfile.anchorParseMode) {
        source = 'global';
    }
    const sourceLabel = getAnchorRuleSourceLabel(source);
    const scopedTip = scopedMode
        ? `本层已设置：${getAnchorParseModeLabel(scopedMode)}。`
        : '本层未设置，继承上层。';
    stateEl.textContent = `当前生效模式：${getAnchorParseModeLabel(effectiveMode)}（来源：${sourceLabel}）。${scopedTip}`;
    modeInput.dataset.baselineValue = String(modeInput.value || '').trim();
    modeInput.dataset.effectiveValue = String(effectiveMode || '').trim();
    modeInput.dataset.effectiveSource = source;
    renderAnchorParseModeExplain({ mode: effectiveMode, sourceLabel });
}

function saveAnchorParseModeRule() {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.setAnchorParseMode !== 'function') {
            throw new Error('当前版本不支持解析模式设置');
        }
        const { scope, clientId } = getRuleContext({ requireClientForClientScope: true });
        const modeInput = document.getElementById('anchorParseMode');
        const mode = modeInput ? String(modeInput.value || '').trim() : '';
        if (!mode) {
            throw new Error('请选择解析模式');
        }
        window.messageProcessor.setAnchorParseMode(mode, { scope, clientId });
        renderAnchorParseModeState();
        renderAnchorNoviceGuide();
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}解析模式已保存：${getAnchorParseModeLabel(mode)}`);
        if (scope === 'global') {
            markAnchorGuideStepCompleted('parseMode');
        }
    } catch (error) {
        showError('保存解析模式失败', error.message || '未知错误');
    }
}

function resetAnchorParseModeRule() {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.clearAnchorParseMode !== 'function') {
            throw new Error('当前版本不支持恢复解析模式');
        }
        const { scope, clientId } = getRuleContext({ requireClientForClientScope: true });
        const ok = confirm(`确定恢复${getScopeDisplayName(scope)}层的解析模式为上层默认吗？`);
        if (!ok) return;
        window.messageProcessor.clearAnchorParseMode({ scope, clientId });
        renderAnchorParseModeState();
        renderAnchorNoviceGuide();
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}层解析模式已恢复默认`);
    } catch (error) {
        showError('恢复解析模式失败', error.message || '未知错误');
    }
}

function getAnchorStrategyConfig(mode) {
    return ANCHOR_STRATEGY_GROUP_CONFIGS.find(item => item.mode === mode) || ANCHOR_STRATEGY_GROUP_CONFIGS[0];
}

function setAnchorConsoleTab(tabKey) {
    const config = getAnchorSubgroupConfig(tabKey);
    anchorSubgroupState[config.key] = true;
    saveAnchorSubgroupState();
    renderAnchorSubgroups();
    if (config.key === 'library') {
        renderAnchorAliasList();
        renderAnchorImpactPreview();
    } else {
        renderAnchorParseModeState();
        renderAttributeCombinePolicyState();
        renderAnchorNoviceGuide();
    }
}

function setAnchorStrategyTab(mode) {
    const config = getAnchorStrategyConfig(mode);
    anchorStrategyActiveTab = config.mode;
    renderAnchorStrategyTabs();
    renderAnchorAliasList();
    renderAnchorImpactPreview();
}

function renderAnchorStrategyTabs() {
    ANCHOR_STRATEGY_GROUP_CONFIGS.forEach((item) => {
        const button = document.getElementById(`anchorStrategyTab_${item.mode}`);
        if (!button) return;
        const isActive = item.mode === anchorStrategyActiveTab;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
}

function getAnchorPreviewClientIdByContext() {
    const { scope, clientId } = getRuleContext();
    if (scope === 'client') return clientId || '';
    return getPreviewClientId() || '';
}

function buildAnchorPreviewResultHtml(previewResult) {
    if (!previewResult) {
        return '<div class="anchor-impact-empty">请输入样例消息后查看预览。</div>';
    }
    if (!previewResult.success) {
        const message = previewResult.error || previewResult.message || '解析失败';
        const isAmbiguity = isAmbiguityResult(previewResult);
        const ambiguityOptions = isAmbiguity && previewResult.ambiguity && Array.isArray(previewResult.ambiguity.options)
            ? previewResult.ambiguity.options
            : [];
        const ambiguityType = isAmbiguity && previewResult.ambiguity
            ? String(previewResult.ambiguity.type || '').trim()
            : '';
        const ambiguityTitle = ambiguityType === 'anchor_mode_undetermined'
            ? '检测到锚点策略待确认'
            : '检测到多锚点/跨行歧义';
        const optionsHtml = ambiguityOptions.length > 0
            ? `<div class="anchor-impact-ambiguity-options">${ambiguityOptions.map((item, idx) => `<div>方案${idx + 1}：${escapeHtml(item.title || '')}</div>`).join('')}</div>`
            : '';
        return `
            <div class="anchor-impact-error ${isAmbiguity ? 'ambiguity' : ''}">
                <div class="anchor-impact-error-title">${isAmbiguity ? ambiguityTitle : '当前样例无法稳定解析'}</div>
                <div class="anchor-impact-error-msg">${escapeHtml(message)}</div>
                ${optionsHtml}
            </div>
        `;
    }

    const entries = (((previewResult || {}).result || {}).entries) || [];
    if (!entries.length) {
        return '<div class="anchor-impact-empty">样例消息没有生成有效下注结果。</div>';
    }

    const canonicals = entries
        .map(item => String(item && item.canonical ? item.canonical : '').trim())
        .filter(Boolean);
    const totalAmount = entries.reduce((sum, entry) => {
        const amount = Number(entry && entry.totalAmount != null ? entry.totalAmount : NaN);
        return Number.isFinite(amount) ? sum + amount : sum;
    }, 0);
    return `
        <div class="anchor-impact-success">
            <div class="anchor-impact-success-title">标准格式（${canonicals.length}条，合计${formatNumericAmount(totalAmount)}）</div>
            <div class="anchor-impact-success-list">${canonicals.map(item => `<div>${escapeHtml(item)}</div>`).join('')}</div>
        </div>
    `;
}

function applyAnchorImpactExample() {
    const config = getAnchorStrategyConfig(anchorStrategyActiveTab);
    const sampleInput = document.getElementById('anchorImpactSampleInput');
    if (!sampleInput) return;
    sampleInput.value = config.defaultSample || '';
    renderAnchorImpactPreview();
}

function applyAnchorRulePreviewSample(row) {
    if (!row) return;
    const sampleInput = document.getElementById('anchorImpactSampleInput');
    if (!sampleInput) return;
    const mode = getAnchorStrategyConfig(row.mode).mode;
    const token = String(row.token || '').trim();
    sampleInput.value = buildDrawerDefaultSample(mode, token);
    if (anchorStrategyActiveTab !== mode) {
        setAnchorStrategyTab(mode);
        return;
    }
    renderAnchorImpactPreview();
}

function renderAnchorImpactPreview() {
    const output = document.getElementById('anchorImpactPreview');
    const sampleInput = document.getElementById('anchorImpactSampleInput');
    if (!output || !sampleInput) return;
    const sample = String(sampleInput.value || '').trim();
    if (!sample) {
        output.innerHTML = '<div class="anchor-impact-empty">请输入样例消息后查看预览。</div>';
        return;
    }
    if (!window.messageProcessor || typeof window.messageProcessor.previewMessage !== 'function') {
        output.innerHTML = '<div class="anchor-impact-empty">当前版本不支持预览。</div>';
        return;
    }
    const previewClientId = getAnchorPreviewClientIdByContext();
    const preview = window.messageProcessor.previewMessage(sample, { clientId: previewClientId });
    output.innerHTML = buildAnchorPreviewResultHtml(preview);
}

function buildDrawerDefaultSample(mode, token = '') {
    const normalizedToken = String(token || '').trim();
    const tokenText = normalizedToken || (
        mode === 'per_target_equal_split' ? '各肖' :
            (mode === 'per_entry_equal_split' ? '平摊' : (mode === 'undetermined' ? '各肖' : '都买'))
    );
    if (mode === 'per_target_equal_split') {
        return `猴蛇狗${tokenText}10`;
    }
    if (mode === 'per_entry_equal_split') {
        return `猴蛇狗${tokenText}10`;
    }
    return `猴蛇狗${tokenText}10`;
}

function syncAnchorRuleDrawerSampleWithContext() {
    const tokenInput = document.getElementById('anchorRuleDrawerToken');
    const modeInput = document.getElementById('anchorRuleDrawerMode');
    if (!tokenInput || !modeInput) return '';
    const mode = getAnchorStrategyConfig(String(modeInput.value || 'per_number').trim()).mode;
    const token = String(tokenInput.value || '').trim();
    return buildDrawerDefaultSample(mode, token);
}

function renderAnchorRuleDrawerModeHint(mode = 'per_number', token = '') {
    const hint = document.getElementById('anchorRuleDrawerModeHint');
    if (!hint) return;
    const config = getAnchorStrategyConfig(mode);
    const anchorToken = String(token || '').trim() || (
        config.mode === 'per_target_equal_split' ? '各肖' :
            (config.mode === 'per_entry_equal_split' ? '平摊' : (config.mode === 'undetermined' ? '各肖' : '都买'))
    );
    const suggested = buildDrawerDefaultSample(config.mode, anchorToken);
    hint.innerHTML = `
        <div class="anchor-rule-drawer-mode-hint-main">当前策略：${escapeHtml(config.title)}</div>
        <div class="anchor-rule-drawer-mode-hint-sub">${escapeHtml(config.summary)}</div>
        <div class="anchor-rule-drawer-mode-hint-sub">默认示例：${escapeHtml(suggested)}</div>
    `;
}

function summarizeAnchorPreviewOutcome(previewResult) {
    if (!previewResult) {
        return { state: 'neutral', text: '暂无预览结果' };
    }
    if (!previewResult.success) {
        return {
            state: 'error',
            text: previewResult.error || '解析失败'
        };
    }
    const entries = (((previewResult || {}).result || {}).entries) || [];
    const canonicals = entries
        .map(item => String(item && item.canonical ? item.canonical : '').trim())
        .filter(Boolean);
    if (canonicals.length === 0) {
        return { state: 'neutral', text: '无标准格式输出' };
    }
    return {
        state: 'success',
        text: canonicals.slice(0, 2).join(' / ')
    };
}

function extractAnchorPreviewDetails(previewResult) {
    if (!previewResult) {
        return {
            success: false,
            error: '暂无预览结果',
            canonicals: [],
            totalAmount: 0
        };
    }
    if (!previewResult.success) {
        return {
            success: false,
            error: previewResult.error || previewResult.message || '解析失败',
            canonicals: [],
            totalAmount: 0
        };
    }
    const entries = (((previewResult || {}).result || {}).entries) || [];
    const canonicals = entries
        .map(item => String(item && item.canonical ? item.canonical : '').trim())
        .filter(Boolean);
    const totalAmount = entries.reduce((sum, entry) => {
        const amount = Number(entry && entry.totalAmount != null ? entry.totalAmount : NaN);
        return Number.isFinite(amount) ? sum + amount : sum;
    }, 0);
    if (canonicals.length === 0) {
        return {
            success: false,
            error: '样例消息没有生成有效下注结果。',
            canonicals: [],
            totalAmount: 0
        };
    }
    return {
        success: true,
        error: '',
        canonicals,
        totalAmount
    };
}

function computeAnchorRuleDrawerPreviewPair(sample, targetContext, draftRule) {
    if (!window.messageProcessor || typeof window.messageProcessor.previewMessage !== 'function') {
        return {
            supported: false,
            previewClientId: '',
            currentPreview: null,
            draftPreview: null,
            draftApplied: false,
            draftReason: '当前版本不支持预览。'
        };
    }
    const scope = targetContext && targetContext.scope === 'client' ? 'client' : 'global';
    const scopedClientId = targetContext ? String(targetContext.clientId || '').trim() : '';
    const previewClientId = scope === 'client'
        ? scopedClientId
        : (getAnchorPreviewClientIdByContext() || '');
    const currentPreview = window.messageProcessor.previewMessage(sample, { clientId: previewClientId });
    const token = String(draftRule && draftRule.token ? draftRule.token : '').trim();
    const mode = String(draftRule && draftRule.mode ? draftRule.mode : '').trim();
    const oddsValue = Number(draftRule && draftRule.odds);
    const hasOddsOverride = Number.isFinite(oddsValue) && oddsValue > 0;
    if (!token || !mode) {
        return {
            supported: true,
            previewClientId,
            currentPreview,
            draftPreview: currentPreview,
            draftApplied: false,
            draftReason: '请先输入锚点词并选择分配策略，再看“保存后预期结果”。'
        };
    }
    if (typeof window.messageProcessor.getAttributeConfig !== 'function'
        || typeof window.messageProcessor.setAttributeConfig !== 'function') {
        return {
            supported: true,
            previewClientId,
            currentPreview,
            draftPreview: currentPreview,
            draftApplied: false,
            draftReason: '当前版本不支持“保存后预演”，仅显示当前生效结果。'
        };
    }

    const backupConfig = window.messageProcessor.getAttributeConfig();
    let draftPreview = currentPreview;
    let draftApplied = false;
    let draftReason = '';
    try {
        const tempConfig = JSON.parse(JSON.stringify(backupConfig || {}));
        const normalizedMode = getAnchorStrategyConfig(mode).mode;
        const enabled = !!(draftRule && draftRule.enabled);
        const targetScope = scope;
        if (targetScope === 'client') {
            const targetClientId = scopedClientId;
            if (!targetClientId) {
                return {
                    supported: true,
                    previewClientId,
                    currentPreview,
                    draftPreview: currentPreview,
                    draftApplied: false,
                    draftReason: '未选择客户，无法预演保存到客户层的结果。'
                };
            }
            if (!tempConfig.clientRules || typeof tempConfig.clientRules !== 'object') {
                tempConfig.clientRules = {};
            }
            if (!tempConfig.clientRules[targetClientId] || typeof tempConfig.clientRules[targetClientId] !== 'object') {
                tempConfig.clientRules[targetClientId] = {};
            }
            if (!tempConfig.clientRules[targetClientId].anchorSemantics || typeof tempConfig.clientRules[targetClientId].anchorSemantics !== 'object') {
                tempConfig.clientRules[targetClientId].anchorSemantics = {};
            }
            tempConfig.clientRules[targetClientId].anchorSemantics[token] = {
                amountDistribute: normalizedMode,
                enabled
            };
            if (hasOddsOverride) {
                tempConfig.clientRules[targetClientId].anchorSemantics[token].odds = oddsValue;
            }
        } else {
            if (!tempConfig.globalRules || typeof tempConfig.globalRules !== 'object') {
                tempConfig.globalRules = {};
            }
            if (!tempConfig.globalRules.anchorSemantics || typeof tempConfig.globalRules.anchorSemantics !== 'object') {
                tempConfig.globalRules.anchorSemantics = {};
            }
            tempConfig.globalRules.anchorSemantics[token] = {
                amountDistribute: normalizedMode,
                enabled
            };
            if (hasOddsOverride) {
                tempConfig.globalRules.anchorSemantics[token].odds = oddsValue;
            }
        }

        window.messageProcessor.setAttributeConfig(tempConfig);
        draftPreview = window.messageProcessor.previewMessage(sample, { clientId: previewClientId });
        draftApplied = true;
        draftReason = enabled
            ? '已按当前输入模拟“保存后”解析效果。'
            : '当前设置为“禁用”，保存后不会把该词作为锚点参与解析。';
    } catch (error) {
        draftPreview = currentPreview;
        draftApplied = false;
        draftReason = error && error.message ? `预演失败：${error.message}` : '预演失败';
    } finally {
        try {
            window.messageProcessor.setAttributeConfig(backupConfig);
        } catch (restoreError) {
            // ignore restore errors
        }
    }

    return {
        supported: true,
        previewClientId,
        currentPreview,
        draftPreview,
        draftApplied,
        draftReason
    };
}

function buildAnchorRuleResultPaneHtml(title, rawSample, previewResult, options = {}) {
    const details = extractAnchorPreviewDetails(previewResult);
    const tipText = String(options.tip || '').trim();
    const rawText = String(rawSample || '').trim() || '(空)';
    const statusClass = details.success ? 'success' : 'error';
    const standardHtml = details.success
        ? `
            <div class="anchor-draft-line-label">标准格式：</div>
            <div class="anchor-draft-standard-meta">共 ${details.canonicals.length} 条，合计 ${formatNumericAmount(details.totalAmount)}</div>
            <div class="anchor-draft-standard-list">${details.canonicals.map(item => `<div class="anchor-draft-standard-item mono">${escapeHtml(item)}</div>`).join('')}</div>
        `
        : `
            <div class="anchor-draft-line-label">标准格式：</div>
            <div class="anchor-draft-standard-error">${escapeHtml(details.error)}</div>
        `;
    return `
        <section class="anchor-draft-pane ${statusClass}">
            <div class="anchor-draft-pane-head">${escapeHtml(title)}</div>
            ${tipText ? `<div class="anchor-draft-pane-tip">${escapeHtml(tipText)}</div>` : ''}
            <div class="anchor-draft-line-wrap">
                <div class="anchor-draft-line-label">原始消息：</div>
                <div class="anchor-draft-line-value mono">${escapeHtml(rawText)}</div>
            </div>
            <div class="anchor-draft-line-wrap">
                ${standardHtml}
            </div>
        </section>
    `;
}

function buildAnchorRuleDrawerCompareHtml(previewPair, sample = '') {
    if (!previewPair || previewPair.supported !== true) {
        return `<div class="anchor-impact-empty">${escapeHtml(previewPair && previewPair.draftReason ? previewPair.draftReason : '当前版本不支持预览。')}</div>`;
    }
    const rawSample = String(sample || '').trim();
    const sourcePaneHtml = `
        <section class="anchor-draft-pane neutral source">
            <div class="anchor-draft-pane-head">原始消息（输入）</div>
            <div class="anchor-draft-pane-tip">以下两栏都基于这条原始消息对比“保存前 / 保存后”。</div>
            <div class="anchor-draft-line-wrap">
                <div class="anchor-draft-line-label">原始消息：</div>
                <div class="anchor-draft-line-value mono">${escapeHtml(rawSample || '(空)')}</div>
            </div>
        </section>
    `;
    const draftTip = previewPair.draftApplied
        ? (previewPair.draftReason || '已按当前输入模拟保存后效果。')
        : (previewPair.draftReason || '当前仅显示生效中的规则结果。');
    const currentPaneHtml = buildAnchorRuleResultPaneHtml(
        '当前生效结果',
        rawSample,
        previewPair.currentPreview
    );
    const draftPaneHtml = buildAnchorRuleResultPaneHtml(
        '保存后预期结果（模拟）',
        rawSample,
        previewPair.draftPreview,
        { tip: draftTip }
    );
    return `
        <div class="anchor-draft-compare">
            ${sourcePaneHtml}
            ${currentPaneHtml}
            ${draftPaneHtml}
        </div>
    `;
}

function resolveDrawerClientTargetId(preferredClientId = '') {
    const normalizedPreferred = String(preferredClientId || '').trim();
    const clientCandidates = getAnchorRuleClientCandidates();
    if (normalizedPreferred && clientCandidates.includes(normalizedPreferred)) {
        return normalizedPreferred;
    }
    const { scope, clientId } = getRuleContext();
    if (scope === 'client' && clientId && clientCandidates.includes(clientId)) {
        return clientId;
    }
    const previewClientId = getPreviewClientId();
    if (previewClientId && clientCandidates.includes(previewClientId)) {
        return previewClientId;
    }
    return clientCandidates[0] || '';
}

function renderAnchorRuleDrawerScopeOptions(options = {}) {
    const scopeSelect = document.getElementById('anchorRuleDrawerScope');
    if (!scopeSelect) return { scope: 'global', clientId: '' };
    const defaultScope = String(options.scope || '').trim() === 'client' ? 'client' : 'global';
    const resolvedClientId = resolveDrawerClientTargetId(options.clientId);
    const hasClient = !!resolvedClientId;

    scopeSelect.innerHTML = '';

    const globalOption = document.createElement('option');
    globalOption.value = 'global';
    globalOption.textContent = '保存到：全局规则';
    scopeSelect.appendChild(globalOption);

    const clientOption = document.createElement('option');
    clientOption.value = 'client';
    clientOption.textContent = hasClient ? `保存到：当前客户（${resolvedClientId}）` : '保存到：当前客户（未选择）';
    clientOption.disabled = !hasClient;
    scopeSelect.appendChild(clientOption);

    const finalScope = defaultScope === 'client' && hasClient ? 'client' : 'global';
    scopeSelect.value = finalScope;
    scopeSelect.dataset.clientId = resolvedClientId;
    renderAnchorRuleDrawerScopeHint(finalScope, resolvedClientId);
    return { scope: finalScope, clientId: resolvedClientId };
}

function renderAnchorRuleDrawerScopeHint(scope = 'global', clientId = '') {
    const hint = document.getElementById('anchorRuleDrawerScopeHint');
    if (!hint) return;

    const normalizedScope = scope === 'client' ? 'client' : 'global';
    const normalizedClientId = String(clientId || '').trim();
    hint.className = 'anchor-rule-drawer-scope-hint';

    if (normalizedScope === 'client') {
        if (normalizedClientId) {
            hint.classList.add('is-client');
            hint.textContent = `将保存到客户「${normalizedClientId}」，仅该客户生效（优先级高于全局）。`;
        } else {
            hint.classList.add('is-warning');
            hint.textContent = '请先选择客户，再保存到客户规则。';
        }
        return;
    }

    hint.classList.add('is-global');
    hint.textContent = '将保存到全局规则，对所有客户生效（可被客户专属规则覆盖）。';
}

function getAnchorRuleDrawerTargetContext() {
    const scopeSelect = document.getElementById('anchorRuleDrawerScope');
    if (!scopeSelect) {
        return getRuleContext();
    }
    const scope = scopeSelect.value === 'client' ? 'client' : 'global';
    const clientId = String(scopeSelect.dataset.clientId || '').trim();
    if (scope === 'client' && !clientId) {
        return { scope, clientId: '' };
    }
    return { scope, clientId: scope === 'client' ? clientId : '' };
}

function openAnchorRuleDrawer(options = {}) {
    if (typeof setAnchorConsoleTab === 'function') {
        setAnchorConsoleTab('library');
    }
    const libraryBody = document.getElementById('anchorSubgroupBody_library');
    const drawer = document.getElementById('anchorRuleDrawer');
    const titleEl = document.getElementById('anchorRuleDrawerTitle');
    const scopeSelect = document.getElementById('anchorRuleDrawerScope');
    const tokenInput = document.getElementById('anchorRuleDrawerToken');
    const modeInput = document.getElementById('anchorRuleDrawerMode');
    const oddsInput = document.getElementById('anchorRuleDrawerOdds');
    const enabledInput = document.getElementById('anchorRuleDrawerEnabled');
    if (!drawer || !titleEl || !scopeSelect || !tokenInput || !modeInput || !oddsInput || !enabledInput) return;

    const token = String(options.token || '').trim();
    const mode = String(options.mode || anchorStrategyActiveTab || 'per_number').trim();
    const enabled = options.enabled !== false;
    const oddsInputParsed = parsePositiveNumericInput(options.odds);
    const customOdds = oddsInputParsed.empty ? '' : (Number.isFinite(oddsInputParsed.value) ? formatNumericAmount(oddsInputParsed.value) : '');
    const currentContext = getRuleContext();
    const requestedScope = String(options.scope || options.source || '').trim();
    const sourceScope = (requestedScope ? requestedScope : currentContext.scope) === 'client' ? 'client' : 'global';
    const scopeContext = renderAnchorRuleDrawerScopeOptions({
        scope: sourceScope,
        clientId: options.clientId
    });
    anchorRuleDrawerState.open = true;
    anchorRuleDrawerState.editToken = token;
    anchorRuleDrawerState.editSource = String(options.source || '').trim();
    anchorRuleDrawerState.editClientId = scopeContext.clientId || '';

    titleEl.textContent = token ? `编辑锚点词：${token}` : '增加锚点词';
    tokenInput.value = token;
    if (modeInput.querySelector(`option[value="${mode}"]`)) {
        modeInput.value = mode;
    } else {
        modeInput.value = 'per_number';
    }
    oddsInput.value = customOdds;
    enabledInput.checked = enabled;
    syncAnchorRuleDrawerSampleWithContext();
    anchorRuleDrawerSnapshot = {
        scope: String(scopeSelect.value || '').trim(),
        clientId: String(scopeSelect.dataset.clientId || '').trim(),
        token: tokenInput.value.trim(),
        mode: String(modeInput.value || '').trim(),
        odds: String(oddsInput.value || '').trim(),
        enabled: !!enabledInput.checked
    };
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    if (libraryBody) {
        libraryBody.classList.add('drawer-open');
    }
    tokenInput.focus();
    renderAnchorRuleDrawerPreview();
}

function closeAnchorRuleDrawer() {
    const libraryBody = document.getElementById('anchorSubgroupBody_library');
    const drawer = document.getElementById('anchorRuleDrawer');
    if (!drawer) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    if (libraryBody) {
        libraryBody.classList.remove('drawer-open');
    }
    anchorRuleDrawerState.open = false;
    anchorRuleDrawerState.editToken = '';
    anchorRuleDrawerState.editSource = '';
    anchorRuleDrawerState.editClientId = '';
    anchorRuleDrawerSnapshot = null;
}

function renderAnchorRuleDrawerPreview() {
    const output = document.getElementById('anchorRuleDrawerPreview');
    const tokenInput = document.getElementById('anchorRuleDrawerToken');
    const modeInput = document.getElementById('anchorRuleDrawerMode');
    if (!output || !tokenInput || !modeInput) return;
    const sample = String(syncAnchorRuleDrawerSampleWithContext() || '').trim();
    const targetContext = getAnchorRuleDrawerTargetContext();
    const draftRule = {
        token: String(tokenInput.value || '').trim(),
        mode: String(modeInput.value || 'per_number').trim(),
        odds: (() => {
            const oddsInput = document.getElementById('anchorRuleDrawerOdds');
            const parsed = parsePositiveNumericInput(oddsInput ? oddsInput.value : '');
            return parsed.empty ? null : (Number.isFinite(parsed.value) ? parsed.value : NaN);
        })(),
        enabled: !!(document.getElementById('anchorRuleDrawerEnabled') && document.getElementById('anchorRuleDrawerEnabled').checked)
    };
    const previewPair = computeAnchorRuleDrawerPreviewPair(sample, targetContext, draftRule);
    renderAnchorRuleDrawerScopeHint(targetContext.scope, targetContext.clientId);
    renderAnchorRuleDrawerModeHint(String(modeInput.value || 'per_number').trim(), String(tokenInput.value || '').trim());
    output.innerHTML = buildAnchorRuleDrawerCompareHtml(previewPair, sample);
}

function saveAnchorRuleFromDrawer() {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.upsertAnchorAlias !== 'function') {
            throw new Error('当前版本不支持词义规则');
        }
        const scopeSelect = document.getElementById('anchorRuleDrawerScope');
        const tokenInput = document.getElementById('anchorRuleDrawerToken');
        const modeInput = document.getElementById('anchorRuleDrawerMode');
        const oddsInput = document.getElementById('anchorRuleDrawerOdds');
        const enabledInput = document.getElementById('anchorRuleDrawerEnabled');
        if (!scopeSelect || !tokenInput || !modeInput || !oddsInput || !enabledInput) {
            throw new Error('编辑器未就绪');
        }
        const token = String(tokenInput.value || '').trim();
        const mode = String(modeInput.value || '').trim();
        const parsedOdds = parsePositiveNumericInput(oddsInput.value);
        if (!parsedOdds.empty && !Number.isFinite(parsedOdds.value)) {
            throw new Error('锚点赔率无效，请输入大于0的数字');
        }
        const enabled = !!enabledInput.checked;
        const drawerScope = scopeSelect.value === 'client' ? 'client' : 'global';
        const drawerClientId = String(scopeSelect.dataset.clientId || '').trim();
        if (drawerScope === 'client' && !drawerClientId) {
            throw new Error('请先选择当前客户后再保存到客户规则');
        }
        const scope = drawerScope;
        const clientId = drawerScope === 'client' ? drawerClientId : '';
        const mappedMode = enabled ? mode : 'ignore';
        const result = window.messageProcessor.upsertAnchorAlias(token, mappedMode, {
            scope,
            clientId,
            odds: parsedOdds.empty ? null : parsedOdds.value
        });
        if (getAnchorRuleScope() !== scope) {
            setAnchorRuleScope(scope);
        }
        if (scope === 'client' && clientId && anchorRuleTargetClientId !== clientId) {
            anchorRuleTargetClientId = clientId;
            const selectInput = document.getElementById('anchorRuleClientSelect');
            if (selectInput) {
                selectInput.value = clientId;
            }
            handleAnchorRuleScopeChange();
        }
        const oddsTip = result && result.odds != null && Number.isFinite(Number(result.odds))
            ? `，赔率 ${formatNumericAmount(Number(result.odds))}`
            : '，赔率跟随默认';
        showSuccess(`${getScopeDisplayName(scope)}词义规则已保存：${result.token} -> ${enabled ? getAnchorModeLabel(mode) : getAnchorModeLabel('ignore')}${oddsTip}`);
        recalculateAllUsersByRuleChange();
        closeAnchorRuleDrawer();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        } else {
            renderAnchorAliasList();
            renderAnchorImpactPreview();
            refreshRegionPnlPanel();
        }
        previewMessage({ silent: true });
        if (scope === 'global') {
            markAnchorGuideStepCompleted('anchor');
        }
    } catch (error) {
        showError('保存词义规则失败', error.message || '未知错误');
    }
}

function computeAnchorRuleConflictMap(rows = []) {
    const map = new Map();
    const pushUnique = (key, text) => {
        if (!key || !text) return;
        if (!map.has(key)) map.set(key, []);
        const list = map.get(key);
        if (!list.includes(text)) {
            list.push(text);
        }
    };
    const activeRows = rows.filter(item => item && item.active);
    const tokenBuckets = new Map();
    activeRows.forEach((row) => {
        const token = String(row.token || '');
        if (!tokenBuckets.has(token)) tokenBuckets.set(token, []);
        tokenBuckets.get(token).push(row);
    });

    const priorityWeight = { client: 0, global: 1, system: 2 };
    tokenBuckets.forEach((bucket) => {
        if (!Array.isArray(bucket) || bucket.length <= 1) return;
        const sorted = bucket.slice().sort((a, b) => (priorityWeight[a.source] ?? 99) - (priorityWeight[b.source] ?? 99));
        const winner = sorted[0];
        sorted.slice(1).forEach((item) => {
            const key = `${item.source}::${item.token}`;
            pushUnique(key, `同名词被上层覆盖（当前以「${getAnchorAliasSourceLabel(winner.source)}」为准）`);
        });
    });

    for (let i = 0; i < activeRows.length; i += 1) {
        for (let j = 0; j < activeRows.length; j += 1) {
            if (i === j) continue;
            const a = activeRows[i];
            const b = activeRows[j];
            const tokenA = String(a.token || '');
            const tokenB = String(b.token || '');
            if (!tokenA || !tokenB) continue;
            if (tokenA.length >= tokenB.length) continue;
            if (!tokenB.includes(tokenA)) continue;
            const key = `${a.source}::${a.token}`;
            pushUnique(key, `短词可能与长词冲突（${tokenA} / ${tokenB}）`);
        }
    }

    return map;
}

function batchSetAnchorRowsStatus(rows, shouldEnable) {
    try {
        if (!Array.isArray(rows) || rows.length === 0) return;
        if (!window.messageProcessor || typeof window.messageProcessor.upsertAnchorAlias !== 'function') {
            throw new Error('当前版本不支持词义规则');
        }
        const { scope, clientId } = getRuleContext({ requireClientForClientScope: true });
        const targetSource = scope === 'client' ? 'client' : 'global';
        const editableRows = rows.filter(row => row && row.source === targetSource);
        editableRows.forEach((row) => {
            const mode = shouldEnable ? row.mode : 'ignore';
            const odds = row && row.customOdds ? row.scopedOdds : null;
            window.messageProcessor.upsertAnchorAlias(row.token, mode, { scope, clientId, odds });
        });
        recalculateAllUsersByRuleChange();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        } else {
            renderAnchorAliasList();
            renderAnchorImpactPreview();
            refreshRegionPnlPanel();
        }
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}层已${shouldEnable ? '批量启用' : '批量停用'} ${editableRows.length} 条锚点`);
    } catch (error) {
        showError('批量操作失败', error.message || '未知错误');
    }
}

function copyAnchorRowsToClient(rows) {
    try {
        if (!Array.isArray(rows) || rows.length === 0) return;
        if (!window.messageProcessor || typeof window.messageProcessor.upsertAnchorAlias !== 'function') {
            throw new Error('当前版本不支持词义规则');
        }
        const { scope, clientId } = getRuleContext({ requireClientForClientScope: true });
        if (scope !== 'client' || !clientId) {
            throw new Error('请先切换到客户专属规则后再复制');
        }
        rows.forEach((row) => {
            const mapped = row.active ? row.mode : 'ignore';
            const odds = row && row.customOdds ? row.scopedOdds : null;
            window.messageProcessor.upsertAnchorAlias(row.token, mapped, { scope: 'client', clientId, odds });
        });
        recalculateAllUsersByRuleChange();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        } else {
            renderAnchorAliasList();
            renderAnchorImpactPreview();
            refreshRegionPnlPanel();
        }
        previewMessage({ silent: true });
        showSuccess(`已复制 ${rows.length} 条到客户 ${clientId}`);
    } catch (error) {
        showError('复制规则失败', error.message || '未知错误');
    }
}

function renderAnchorAliasList() {
    const list = document.getElementById('anchorAliasList');
    if (!list) return;
    list.innerHTML = '';
    renderAnchorStrategyTabs();

    if (!window.messageProcessor || typeof window.messageProcessor.getAnchorAliasRows !== 'function') {
        const empty = document.createElement('div');
        empty.className = 'anchor-alias-empty';
        empty.textContent = '当前版本不支持词义规则';
        list.appendChild(empty);
        return;
    }

    const { scope, clientId } = getRuleContext();
    if (scope === 'client' && !clientId) {
        const empty = document.createElement('div');
        empty.className = 'anchor-alias-empty';
        empty.textContent = '请选择目标客户后再查看/编辑客户专属锚点规则';
        list.appendChild(empty);
        return;
    }

    const rows = window.messageProcessor.getAnchorAliasRows({ clientId });
    const allRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
    const targetSource = scope === 'client' ? 'client' : 'global';
    const filterState = getAnchorAliasFilterState();
    const activeMode = getAnchorStrategyConfig(anchorStrategyActiveTab).mode;

    const displayRows = allRows.filter((row) => {
        if (!row) return false;
        if (row.mode !== activeMode) return false;
        if (filterState.source !== 'all' && row.source !== filterState.source) return false;
        if (filterState.enabledOnly && !row.active) return false;
        if (!filterState.keyword) return true;
        const modeText = getAnchorModeLabel(row.mode);
        const sourceText = getAnchorAliasSourceLabel(row.source, scope);
        const statusText = row.active ? '启用' : '禁用';
        const strategyText = getAnchorStrategyConfig(row.mode).title;
        const oddsText = `赔率${formatNumericAmount(row.odds)}`;
        const haystack = [row.token, modeText, sourceText, statusText, strategyText, oddsText]
            .map(item => String(item || '').toLowerCase())
            .join(' ');
        return haystack.includes(filterState.keyword);
    });

    const conflictMap = computeAnchorRuleConflictMap(displayRows);

    const container = document.createElement('div');
    container.className = 'anchor-strategy-lanes';

    const config = getAnchorStrategyConfig(activeMode);
    const intro = document.createElement('div');
    intro.className = 'anchor-strategy-current-intro';
    intro.innerHTML = `
        <div class="anchor-strategy-current-title">${escapeHtml(config.title)}</div>
        <div class="anchor-strategy-current-summary">${escapeHtml(config.summary)}</div>
        <ul class="anchor-strategy-current-examples">${(config.examples || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    `;
    container.appendChild(intro);

    ANCHOR_SOURCE_DISPLAY_ORDER.forEach((sourceKey) => {
        const laneRows = displayRows
            .filter(row => row.source === sourceKey)
            .sort((a, b) => {
                if (a.active !== b.active) return a.active ? -1 : 1;
                if (a.token.length !== b.token.length) return b.token.length - a.token.length;
                return a.token.localeCompare(b.token, 'zh-Hans-CN');
            });

        const lane = document.createElement('section');
        lane.className = `anchor-strategy-lane source-${sourceKey}`;
        const laneHead = document.createElement('div');
        laneHead.className = 'anchor-strategy-lane-head';
        const left = document.createElement('div');
        left.className = 'anchor-strategy-lane-head-left';
        const sourceTag = document.createElement('span');
        sourceTag.className = `anchor-alias-source-tag source-${sourceKey}`;
        sourceTag.textContent = getAnchorAliasSourceLabel(sourceKey, scope);
        const sourceHint = document.createElement('span');
        sourceHint.className = 'anchor-strategy-source-hint';
        sourceHint.textContent = ANCHOR_SOURCE_HINTS[sourceKey] || '';
        left.appendChild(sourceTag);
        left.appendChild(sourceHint);

        const right = document.createElement('div');
        right.className = 'anchor-strategy-lane-head-right';
        const count = document.createElement('span');
        count.className = 'anchor-strategy-lane-count';
        count.textContent = `${laneRows.length} 条`;
        right.appendChild(count);

        if (laneRows.length > 0 && sourceKey === targetSource) {
            const enableAll = document.createElement('button');
            enableAll.type = 'button';
            enableAll.className = 'anchor-lane-action-btn';
            enableAll.textContent = '全部启用';
            enableAll.addEventListener('click', () => batchSetAnchorRowsStatus(laneRows, true));
            const disableAll = document.createElement('button');
            disableAll.type = 'button';
            disableAll.className = 'anchor-lane-action-btn';
            disableAll.textContent = '全部停用';
            disableAll.addEventListener('click', () => batchSetAnchorRowsStatus(laneRows, false));
            right.appendChild(enableAll);
            right.appendChild(disableAll);
        }

        if (laneRows.length > 0 && scope === 'client' && sourceKey !== 'client') {
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'anchor-lane-action-btn';
            copyBtn.textContent = '复制到客户层';
            copyBtn.addEventListener('click', () => copyAnchorRowsToClient(laneRows));
            right.appendChild(copyBtn);
        }

        laneHead.appendChild(left);
        laneHead.appendChild(right);
        lane.appendChild(laneHead);

        if (laneRows.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'anchor-alias-empty';
            empty.textContent = '该来源暂无匹配锚点';
            lane.appendChild(empty);
            container.appendChild(lane);
            return;
        }

        const cards = document.createElement('div');
        cards.className = 'anchor-strategy-source-rows';

        laneRows.forEach((row) => {
            const editable = row.source === targetSource;
            const card = document.createElement('div');
            card.className = `anchor-strategy-rule-card previewable source-${row.source} ${row.active ? '' : 'disabled'} ${editable ? '' : 'readonly'}`.trim();
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `点击预览锚点词「${row.token}」的效果`);
            card.addEventListener('click', (event) => {
                if (event.target.closest('.anchor-strategy-rule-footer')
                    || event.target.closest('.anchor-alias-item-actions')
                    || event.target.closest('.anchor-alias-status-switch')
                    || event.target.closest('button')
                    || event.target.closest('details')
                    || event.target.closest('summary')
                    || event.target.closest('label')
                    || event.target.closest('input')) {
                    return;
                }
                applyAnchorRulePreviewSample(row);
            });
            card.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                applyAnchorRulePreviewSample(row);
            });

            const head = document.createElement('div');
            head.className = 'anchor-strategy-rule-head';
            const token = document.createElement('div');
            token.className = 'anchor-strategy-rule-token';
            token.textContent = row.token;
            token.title = row.token;
            const stateChip = document.createElement('span');
            stateChip.className = `anchor-rule-state-chip ${row.active ? 'active' : 'inactive'}`;
            stateChip.textContent = row.active ? '启用' : '禁用';
            head.appendChild(token);
            head.appendChild(stateChip);

            const desc = document.createElement('div');
            desc.className = 'anchor-strategy-rule-desc';
            const defaultTip = row.defaultMode && row.defaultMode !== row.mode
                ? `（默认：${getAnchorModeLabel(row.defaultMode)}）`
                : '';
            const oddsValue = Number(row.odds);
            const oddsText = Number.isFinite(oddsValue) && oddsValue > 0
                ? `赔率 ${formatNumericAmount(oddsValue)}${row.customOdds ? '（单独设置）' : '（跟随默认）'}`
                : '赔率 --';
            desc.innerHTML = `
                <div>${escapeHtml(`${getAnchorModeLabel(row.mode)}${defaultTip}`)}</div>
                <div class="anchor-strategy-rule-odds">${escapeHtml(oddsText)}</div>
            `;

            const conflictKey = `${row.source}::${row.token}`;
            const warnings = conflictMap.get(conflictKey) || [];
            const warningWrap = document.createElement('div');
            warningWrap.className = 'anchor-rule-warning-wrap';
            if (warnings.length > 0) {
                warnings.slice(0, 2).forEach((text) => {
                    const chip = document.createElement('span');
                    chip.className = 'anchor-rule-warning-chip';
                    chip.textContent = text;
                    warningWrap.appendChild(chip);
                });
            }

            const footer = document.createElement('div');
            footer.className = 'anchor-strategy-rule-footer';
            const statusSwitch = document.createElement('label');
            statusSwitch.className = `anchor-alias-status-switch ${editable ? '' : 'readonly'}`.trim();
            const statusInput = document.createElement('input');
            statusInput.type = 'checkbox';
            statusInput.checked = !!row.active;
            statusInput.disabled = !editable;
            statusInput.addEventListener('click', (event) => {
                event.stopPropagation();
            });
            statusInput.addEventListener('change', (event) => {
                toggleAnchorAliasStatus(
                    row.token,
                    !!event.target.checked,
                    row.mode,
                    row.customOdds ? row.scopedOdds : null
                );
            });
            const statusTrack = document.createElement('span');
            statusTrack.className = 'anchor-alias-status-track';
            const statusText = document.createElement('span');
            statusText.className = 'anchor-alias-status-text';
            statusText.textContent = row.active ? '启用' : '禁用';
            statusSwitch.appendChild(statusInput);
            statusSwitch.appendChild(statusTrack);
            statusSwitch.appendChild(statusText);
            footer.appendChild(statusSwitch);

            const actionWrap = document.createElement('div');
            actionWrap.className = `anchor-alias-item-actions ${editable ? '' : 'readonly'}`.trim();
            actionWrap.addEventListener('click', (event) => {
                event.stopPropagation();
            });
            if (editable) {
                const editBtn = document.createElement('button');
                editBtn.className = 'edit-button anchor-action-primary';
                editBtn.textContent = '编辑';
                editBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    editAnchorAliasRule(
                        row.token,
                        row.active ? row.mode : 'ignore',
                        row.source,
                        row.clientId || '',
                        row.customOdds ? row.scopedOdds : ''
                    );
                });
                actionWrap.appendChild(editBtn);

                const menu = document.createElement('details');
                menu.className = 'anchor-action-menu';
                const menuSummary = document.createElement('summary');
                menuSummary.className = 'anchor-action-menu-trigger';
                menuSummary.textContent = '更多';
                menuSummary.addEventListener('click', (event) => {
                    event.stopPropagation();
                });
                const menuPanel = document.createElement('div');
                menuPanel.className = 'anchor-action-menu-panel';

                const toggleBtn = document.createElement('button');
                toggleBtn.type = 'button';
                toggleBtn.className = 'anchor-action-menu-item';
                toggleBtn.textContent = row.active ? '停用（推荐）' : '启用';
                toggleBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    toggleAnchorAliasStatus(
                        row.token,
                        !row.active,
                        row.mode,
                        row.customOdds ? row.scopedOdds : null
                    );
                    menu.removeAttribute('open');
                });
                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'anchor-action-menu-item danger';
                removeBtn.textContent = '删除本层规则';
                removeBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    removeAnchorAliasRule(row.token);
                    menu.removeAttribute('open');
                });
                menuPanel.appendChild(toggleBtn);
                menuPanel.appendChild(removeBtn);
                menu.appendChild(menuSummary);
                menu.appendChild(menuPanel);
                actionWrap.appendChild(menu);
            } else {
                const readonlyTag = document.createElement('span');
                readonlyTag.className = 'anchor-alias-readonly-tag';
                readonlyTag.textContent = '只读';
                actionWrap.appendChild(readonlyTag);
            }
            footer.appendChild(actionWrap);

            card.appendChild(head);
            card.appendChild(desc);
            card.appendChild(warningWrap);
            card.appendChild(footer);
            cards.appendChild(card);
        });

        lane.appendChild(cards);
        container.appendChild(lane);
    });

    list.appendChild(container);
}

function toggleAnchorAliasStatus(token, shouldEnable, preferredMode = 'per_number', preferredOdds = null) {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.upsertAnchorAlias !== 'function') {
            throw new Error('当前版本不支持词义规则');
        }
        const { scope, clientId } = getRuleContext({ requireClientForClientScope: true });
        const rawMode = String(preferredMode || '').trim();
        const targetMode = shouldEnable
            ? ((rawMode && rawMode !== 'ignore') ? rawMode : 'per_number')
            : 'ignore';
        const parsedOdds = parsePositiveNumericInput(preferredOdds);
        const odds = parsedOdds.empty ? null : parsedOdds.value;
        window.messageProcessor.upsertAnchorAlias(token, targetMode, { scope, clientId, odds });
        recalculateAllUsersByRuleChange();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        } else {
            renderAnchorAliasList();
            renderAnchorImpactPreview();
            renderAttributeCombinePolicyState();
            renderDefaultOddsState();
            refreshRegionPnlPanel();
        }
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}词义规则已${shouldEnable ? '启用' : '禁用'}：${token}`);
    } catch (error) {
        showError('切换词义状态失败', error.message || '未知错误');
    }
}

function editAnchorAliasRule(token, mode, source = '', clientId = '', odds = '') {
    const tokenInput = document.getElementById('anchorAliasToken');
    const modeInput = document.getElementById('anchorAliasMode');
    const normalizedToken = String(token || '').trim();
    const normalizedMode = String(mode || 'per_number').trim() || 'per_number';
    if (tokenInput) {
        tokenInput.value = normalizedToken;
        tokenInput.focus();
        tokenInput.select();
    }
    if (modeInput && modeInput.querySelector(`option[value="${normalizedMode}"]`)) {
        modeInput.value = normalizedMode;
    }
    const sampleInput = document.getElementById('anchorImpactSampleInput');
    const sample = sampleInput ? String(sampleInput.value || '').trim() : '';
    openAnchorRuleDrawer({
        token: normalizedToken,
        mode: normalizedMode,
        odds,
        enabled: mode !== 'ignore',
        source: String(source || '').trim(),
        clientId: String(clientId || '').trim(),
        sample
    });
}

function saveAnchorAliasRule() {
    if (anchorRuleDrawerState && anchorRuleDrawerState.open) {
        saveAnchorRuleFromDrawer();
        return;
    }
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.upsertAnchorAlias !== 'function') {
            throw new Error('当前版本不支持词义规则');
        }
        const { scope, clientId } = getRuleContext({ requireClientForClientScope: true });
        const tokenInput = document.getElementById('anchorAliasToken');
        const modeInput = document.getElementById('anchorAliasMode');
        const token = tokenInput ? tokenInput.value.trim() : '';
        const mode = modeInput ? String(modeInput.value || '').trim() : '';
        const result = window.messageProcessor.upsertAnchorAlias(token, mode, { scope, clientId });
        if (tokenInput) tokenInput.value = '';
        recalculateAllUsersByRuleChange();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        } else {
            renderAnchorAliasList();
            renderAnchorImpactPreview();
            renderAttributeCombinePolicyState();
            renderDefaultOddsState();
            refreshRegionPnlPanel();
        }
        previewMessage({ silent: true });
        const modeLabel = result && result.enabled === false
            ? getAnchorModeLabel('ignore')
            : getAnchorModeLabel((result && (result.amountDistribute || result.mode)) || mode);
        showSuccess(`${getScopeDisplayName(scope)}词义规则已保存：${result.token} -> ${modeLabel}`);
        if (scope === 'global') {
            markAnchorGuideStepCompleted('anchor');
        }
    } catch (error) {
        showError('保存词义规则失败', error.message || '未知错误');
    }
}

function removeAnchorAliasRule(token) {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.removeAnchorAlias !== 'function') {
            throw new Error('当前版本不支持词义规则');
        }
        const { scope, clientId } = getRuleContext({ requireClientForClientScope: true });
        window.messageProcessor.removeAnchorAlias(token, { scope, clientId });
        recalculateAllUsersByRuleChange();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        } else {
            renderAnchorAliasList();
            renderAnchorImpactPreview();
            renderAttributeCombinePolicyState();
            renderDefaultOddsState();
            refreshRegionPnlPanel();
        }
        previewMessage({ silent: true });
    } catch (error) {
        showError('删除词义规则失败', error.message || '未知错误');
    }
}

function resetAnchorAliasRules() {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.resetAnchorAliases !== 'function') {
            throw new Error('当前版本不支持词义规则');
        }
        const { scope, clientId } = getRuleContext({ requireClientForClientScope: true });
        const ok = confirm(`确定清空${getScopeDisplayName(scope)}层的锚点规则吗？`);
        if (!ok) return;
        window.messageProcessor.resetAnchorAliases({ scope, clientId });
        const tokenInput = document.getElementById('anchorAliasToken');
        const modeInput = document.getElementById('anchorAliasMode');
        if (tokenInput) tokenInput.value = '';
        if (modeInput) modeInput.value = 'per_number';
        recalculateAllUsersByRuleChange();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        } else {
            renderAnchorAliasList();
            renderAnchorImpactPreview();
            renderAttributeCombinePolicyState();
            renderDefaultOddsState();
            refreshRegionPnlPanel();
        }
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}层锚点规则已清空`);
    } catch (error) {
        showError('恢复默认失败', error.message || '未知错误');
    }
}

function resetClientRuleProfile() {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.resetClientRules !== 'function') {
            throw new Error('当前版本不支持客户规则恢复');
        }
        const { scope, clientId } = getRuleContext({ requireClientForClientScope: true });
        if (scope !== 'client') {
            throw new Error('请先切换到“客户专属规则”后再操作');
        }
        const ok = confirm(`确定将客户 ${clientId} 的专属规则恢复为全局规则吗？`);
        if (!ok) return;
        window.messageProcessor.resetClientRules(clientId);
        recalculateAllUsersByRuleChange();
        closeAnchorRuleDrawer();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        } else {
            renderAnchorAliasList();
            renderAnchorImpactPreview();
            renderAnchorParseModeState();
            renderAttributeCombinePolicyState();
            renderDefaultOddsState();
            renderAnchorNoviceGuide();
            refreshRegionPnlPanel();
        }
        previewMessage({ silent: true });
        showSuccess(`已恢复 ${clientId} 的专属规则到全局`);
    } catch (error) {
        showError('恢复客户规则失败', error.message || '未知错误');
    }
}

function renderAttributeCombinePolicyState() {
    const stateEl = document.getElementById('attributeCombinePolicyState');
    const policyInput = document.getElementById('attributeCombinePolicy');
    if (!stateEl || !policyInput) return;

    if (!window.messageProcessor || typeof window.messageProcessor.getEffectiveRuleProfile !== 'function') {
        stateEl.textContent = '当前版本不支持属性叠加策略';
        policyInput.disabled = true;
        policyInput.dataset.baselineValue = String(policyInput.value || '').trim();
        policyInput.dataset.effectiveValue = '';
        policyInput.dataset.effectiveSource = 'system';
        renderAttributeCombinePolicyExplain({ unavailable: true, message: '当前版本不支持叠加策略说明。' });
        return;
    }

    const { scope, clientId } = getRuleContext();
    if (scope === 'client' && !clientId) {
        stateEl.textContent = '请选择目标客户后再设置客户专属属性叠加策略';
        policyInput.disabled = true;
        policyInput.dataset.baselineValue = String(policyInput.value || '').trim();
        policyInput.dataset.effectiveValue = '';
        policyInput.dataset.effectiveSource = 'system';
        renderAttributeCombinePolicyExplain({ unavailable: true, message: '当前是客户层，但未选择客户。' });
        return;
    }
    policyInput.disabled = false;

    const systemProfile = window.messageProcessor.getSystemRuleProfile
        ? window.messageProcessor.getSystemRuleProfile()
        : {};
    const globalProfile = window.messageProcessor.getGlobalRuleProfile
        ? window.messageProcessor.getGlobalRuleProfile()
        : {};
    const clientProfile = clientId && window.messageProcessor.getClientRuleProfile
        ? window.messageProcessor.getClientRuleProfile(clientId)
        : {};
    const effectiveProfile = window.messageProcessor.getEffectiveRuleProfile(clientId || '');

    const effectivePolicy = effectiveProfile.attributeCombinePolicy
        || systemProfile.attributeCombinePolicy
        || 'intersection_then_union_fallback';

    const scopedPolicy = scope === 'client'
        ? (clientProfile.attributeCombinePolicy || '')
        : (globalProfile.attributeCombinePolicy || '');

    if (policyInput.querySelector(`option[value="${scopedPolicy || effectivePolicy}"]`)) {
        policyInput.value = scopedPolicy || effectivePolicy;
    }

    let source = 'system';
    if (clientId && clientProfile.attributeCombinePolicy) {
        source = 'client';
    } else if (globalProfile.attributeCombinePolicy) {
        source = 'global';
    }
    const sourceLabel = getAnchorRuleSourceLabel(source);
    const scopedTip = scopedPolicy
        ? `本层已设置：${getAttributeCombinePolicyLabel(scopedPolicy)}。`
        : `本层未设置，继承上层。`;
    stateEl.textContent = `当前生效策略：${getAttributeCombinePolicyLabel(effectivePolicy)}（来源：${sourceLabel}）。${scopedTip}`;
    policyInput.dataset.baselineValue = String(policyInput.value || '').trim();
    policyInput.dataset.effectiveValue = String(effectivePolicy || '').trim();
    policyInput.dataset.effectiveSource = source;
    renderAttributeCombinePolicyExplain({ policy: effectivePolicy, sourceLabel });
}

function saveAttributeCombinePolicyRule() {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.setAttributeCombinePolicy !== 'function') {
            throw new Error('当前版本不支持属性叠加策略');
        }
        const { scope, clientId } = getRuleContext({ requireClientForClientScope: true });
        const policyInput = document.getElementById('attributeCombinePolicy');
        const policy = policyInput ? String(policyInput.value || '').trim() : '';
        if (!policy) {
            throw new Error('请选择属性叠加策略');
        }
        window.messageProcessor.setAttributeCombinePolicy(policy, { scope, clientId });
        renderAttributeCombinePolicyState();
        renderAnchorNoviceGuide();
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}属性叠加策略已保存：${getAttributeCombinePolicyLabel(policy)}`);
        if (scope === 'global') {
            markAnchorGuideStepCompleted('combinePolicy');
        }
    } catch (error) {
        showError('保存属性叠加策略失败', error.message || '未知错误');
    }
}

function resetAttributeCombinePolicyRule() {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.clearAttributeCombinePolicy !== 'function') {
            throw new Error('当前版本不支持恢复属性叠加策略');
        }
        const { scope, clientId } = getRuleContext({ requireClientForClientScope: true });
        const ok = confirm(`确定恢复${getScopeDisplayName(scope)}层的属性叠加策略为上层默认吗？`);
        if (!ok) return;
        window.messageProcessor.clearAttributeCombinePolicy({ scope, clientId });
        renderAttributeCombinePolicyState();
        renderAnchorNoviceGuide();
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}层属性叠加策略已恢复默认`);
    } catch (error) {
        showError('恢复属性叠加策略失败', error.message || '未知错误');
    }
}

function addCustomAttribute() {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.upsertCustomAttribute !== 'function') {
            throw new Error('当前版本不支持自定义属性');
        }
        const nameInput = document.getElementById('customAttrName');
        const numbersInput = document.getElementById('customAttrNumbers');
        const name = nameInput ? nameInput.value.trim() : '';
        const numbers = numbersInput ? numbersInput.value.trim() : '';
        const result = window.messageProcessor.upsertCustomAttribute(name, numbers);
        if (nameInput) nameInput.value = '';
        if (numbersInput) numbersInput.value = '';
        renderAttributePicker();
        renderCustomAttributeList();
        showSuccess(`属性 ${result.name} 已保存`);
    } catch (error) {
        showError('添加属性失败', error.message);
    }
}

function removeCustomAttribute(name) {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.removeCustomAttribute !== 'function') {
            throw new Error('当前版本不支持删除自定义属性');
        }
        window.messageProcessor.removeCustomAttribute(name);
        selectedAttributes.delete(name);
        renderAttributePicker();
        renderCustomAttributeList();
    } catch (error) {
        showError('删除属性失败', error.message);
    }
}

function isCrossLineAmbiguityResult(result) {
    return !!(
        isAmbiguityResult(result)
        && result.code === 'CROSS_LINE_AMBIGUITY'
    );
}

function isUndeterminedAnchorModeResult(result) {
    return !!(
        isAmbiguityResult(result)
        && result.code === 'UNDETERMINED_ANCHOR_MODE'
    );
}

function isAmbiguityResult(result) {
    return !!(
        result
        && result.success === false
        && (result.code === 'CROSS_LINE_AMBIGUITY' || result.code === 'UNDETERMINED_ANCHOR_MODE')
        && result.ambiguity
        && Array.isArray(result.ambiguity.options)
        && result.ambiguity.options.length > 0
    );
}

function isAmbiguityChoiceModalOpen() {
    const modal = document.getElementById('ambiguityChoiceModal');
    return !!(modal && modal.style.display === 'block');
}

function applyAmbiguitySelectionToMessage(message, ambiguity, optionId) {
    const text = String(message || '').replace(/\r/g, '');
    const lines = text.split('\n');
    const options = Array.isArray(ambiguity && ambiguity.options) ? ambiguity.options : [];
    const chosen = options.find(option => option && option.id === optionId);
    if (!chosen) {
        throw new Error('未找到所选歧义方案');
    }
    const replacements = Array.isArray(chosen.replacements) ? chosen.replacements : [];
    replacements.forEach(item => {
        if (!item || typeof item !== 'object') return;
        const lineNo = parseInt(item.lineNo, 10);
        const lineIndex = lineNo - 1;
        if (!Number.isInteger(lineIndex) || lineIndex < 0 || lineIndex >= lines.length) return;
        lines[lineIndex] = String(item.text || '').trim();
    });
    return lines.join('\n');
}

function applyUndeterminedAnchorModeChoice(ambiguity, optionId, fallbackClientId = '') {
    if (!window.messageProcessor || typeof window.messageProcessor.upsertAnchorAlias !== 'function') {
        throw new Error('当前版本不支持自动保存锚点策略');
    }
    const mode = String(optionId || '').trim();
    const validModes = new Set(['per_number', 'per_target_equal_split', 'per_entry_equal_split']);
    if (!validModes.has(mode)) {
        throw new Error('所选分配策略无效');
    }
    const anchorToken = ambiguity && ambiguity.anchorToken ? String(ambiguity.anchorToken).trim() : '';
    if (!anchorToken) {
        throw new Error('缺少锚点词，无法保存策略');
    }
    const scope = ambiguity && ambiguity.scope === 'client' ? 'client' : 'global';
    const clientId = scope === 'client'
        ? String((ambiguity && ambiguity.clientId) || fallbackClientId || '').trim()
        : '';
    if (scope === 'client' && !clientId) {
        throw new Error('缺少客户标识，无法保存客户专属策略');
    }
    window.messageProcessor.upsertAnchorAlias(anchorToken, mode, {
        scope,
        clientId,
        enabled: true
    });
    renderAnchorAliasList();
    renderAnchorImpactPreview();
    renderDefaultOddsState();
    renderAnchorParseModeState();
    renderAttributeCombinePolicyState();
}

function openAmbiguityChoiceModal(ambiguity) {
    return new Promise((resolve, reject) => {
        const modal = document.getElementById('ambiguityChoiceModal');
        const titleEl = document.getElementById('ambiguityChoiceTitle');
        const descEl = document.getElementById('ambiguityChoiceDesc');
        const optionsEl = document.getElementById('ambiguityChoiceOptions');
        const confirmBtn = document.getElementById('ambiguityChoiceConfirmBtn');
        if (!modal || !titleEl || !descEl || !optionsEl || !confirmBtn) {
            reject(new Error('歧义选择弹窗未就绪'));
            return;
        }

        const options = Array.isArray(ambiguity && ambiguity.options) ? ambiguity.options : [];
        if (options.length === 0) {
            reject(new Error('当前歧义没有可选方案'));
            return;
        }

        const ambiguityType = ambiguity && ambiguity.type ? String(ambiguity.type).trim() : '';
        const segmentLineNo = ambiguity && ambiguity.segmentLineNo ? ambiguity.segmentLineNo : '?';
        const currentLineNo = ambiguity && ambiguity.currentLineNo ? ambiguity.currentLineNo : '?';
        const segmentText = ambiguity && ambiguity.segmentText ? String(ambiguity.segmentText) : '';
        const currentAnchorToken = ambiguity && ambiguity.currentAnchorToken ? String(ambiguity.currentAnchorToken) : '';
        const currentAmount = ambiguity && ambiguity.currentAmount ? String(ambiguity.currentAmount) : '';
        const anchorToken = ambiguity && ambiguity.anchorToken ? String(ambiguity.anchorToken) : '';
        const ruleScope = ambiguity && ambiguity.scope === 'client'
            ? `客户「${String(ambiguity.clientId || '').trim() || '?'}」`
            : '全局';

        if (ambiguityType === 'anchor_mode_undetermined') {
            titleEl.textContent = `锚点词「${anchorToken}」策略未确定，请选择一种`;
            descEl.textContent = [
                `触发行：第 ${ambiguity && ambiguity.lineNo ? ambiguity.lineNo : '?'} 行`,
                `锚点词：${anchorToken}`,
                `金额：${ambiguity && ambiguity.amount ? ambiguity.amount : '-'}`,
                `保存范围：${ruleScope}`,
                '说明：选择后点击“确定并保存策略”，系统会保存该锚点词策略并继续解析。'
            ].join('\n');
            confirmBtn.textContent = '确定并保存策略';
        } else {
            titleEl.textContent = `第 ${segmentLineNo} 行有两种解释，请二选一`;
            descEl.textContent = [
                `原始歧义行：第 ${segmentLineNo} 行「${segmentText}」`,
                `参考锚点行：第 ${currentLineNo} 行（锚点「${currentAnchorToken}」，金额「${currentAmount}」）`,
                '说明：选中方案后点击“确定并改写原文”，系统会把对应行改成你选的写法再继续解析。'
            ].join('\n');
            confirmBtn.textContent = '确定并改写原文';
        }
        optionsEl.innerHTML = '';

        ambiguityChoiceState = {
            selectedId: '',
            resolve
        };

        const markSelected = (selectedId) => {
            const cards = optionsEl.querySelectorAll('.ambiguity-choice-item');
            cards.forEach(card => {
                const optionId = card.getAttribute('data-option-id');
                if (optionId === selectedId) {
                    card.classList.add('is-selected');
                } else {
                    card.classList.remove('is-selected');
                }
            });
        };

        options.forEach((option, index) => {
            const optionId = String(option.id || `option_${index}`);
            const wrapper = document.createElement('label');
            wrapper.className = 'ambiguity-choice-item';
            wrapper.setAttribute('data-option-id', optionId);

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'ambiguityChoiceOption';
            radio.value = optionId;
            radio.addEventListener('change', () => {
                if (!ambiguityChoiceState) return;
                ambiguityChoiceState.selectedId = optionId;
                confirmBtn.disabled = false;
                markSelected(optionId);
            });

            const content = document.createElement('div');
            content.className = 'ambiguity-choice-content';

            const optionTitle = document.createElement('div');
            optionTitle.className = 'ambiguity-choice-title';
            optionTitle.textContent = option.title || `方案 ${index + 1}`;

            const optionPreview = document.createElement('div');
            optionPreview.className = 'ambiguity-choice-preview';
            const replacementLines = Array.isArray(option.replacements)
                ? option.replacements
                    .map(item => {
                        const lineNo = item && item.lineNo ? item.lineNo : '?';
                        const text = item && item.text ? String(item.text).trim() : '';
                        return text ? `- 第 ${lineNo} 行改为：${text}` : '';
                    })
                    .filter(Boolean)
                : [];
            const previewBlocks = [];
            if (option.preview) {
                previewBlocks.push(`解析说明：${option.preview}`);
            }
            if (replacementLines.length > 0) {
                previewBlocks.push(`改写动作：\n${replacementLines.join('\n')}`);
            }
            optionPreview.textContent = previewBlocks.join('\n') || '无预览信息';

            content.appendChild(optionTitle);
            content.appendChild(optionPreview);

            wrapper.appendChild(radio);
            wrapper.appendChild(content);
            optionsEl.appendChild(wrapper);
        });

        confirmBtn.disabled = true;
        modal.style.display = 'block';
    });
}

function confirmAmbiguityChoice() {
    const modal = document.getElementById('ambiguityChoiceModal');
    if (!ambiguityChoiceState || !ambiguityChoiceState.selectedId) return;
    const { resolve, selectedId } = ambiguityChoiceState;
    ambiguityChoiceState = null;
    if (modal) modal.style.display = 'none';
    if (typeof resolve === 'function') {
        resolve(selectedId);
    }
}

async function resolveMessageAmbiguityFlow(message, clientId, options = {}) {
    const interactive = !!(options && options.interactive);
    const updateTextarea = !!(options && options.updateTextarea);
    let currentMessage = String(message || '');

    for (let i = 0; i < 8; i += 1) {
        const preview = messageProcessor.previewMessage(currentMessage, { clientId });
        if (!isAmbiguityResult(preview)) {
            return { message: currentMessage, previewResult: preview };
        }
        if (!interactive) {
            return { message: currentMessage, previewResult: preview };
        }

        const ambiguity = preview.ambiguity;
        const selectedOptionId = await openAmbiguityChoiceModal(ambiguity);
        if (ambiguity && String(ambiguity.type || '').trim() === 'anchor_mode_undetermined') {
            applyUndeterminedAnchorModeChoice(ambiguity, selectedOptionId, clientId);
        } else {
            currentMessage = applyAmbiguitySelectionToMessage(currentMessage, ambiguity, selectedOptionId);
        }

        if (updateTextarea) {
            const textarea = document.getElementById('message');
            if (textarea) {
                textarea.value = currentMessage;
                syncRecognizeMessageAutoHeight();
                renderMessageLineNumbers();
            }
        }
    }

    return {
        message: currentMessage,
        previewResult: {
            success: false,
            error: '歧义确认次数过多，请检查消息格式后重试'
        }
    };
}

function getRecognizeMessageHeightBounds() {
    const minHeight = window.innerWidth <= 1280
        ? RECOGNIZE_MESSAGE_MIN_HEIGHT_COMPACT
        : RECOGNIZE_MESSAGE_MIN_HEIGHT_DESKTOP;
    const viewportMax = Math.floor(window.innerHeight * RECOGNIZE_MESSAGE_MAX_VH_RATIO);
    const maxHeight = Math.max(minHeight + 40, viewportMax);
    return { minHeight, maxHeight };
}

function syncRecognizeMessageAutoHeight() {
    const messageTextarea = document.getElementById('message');
    if (!messageTextarea) return;
    const wrap = messageTextarea.closest('.message-input-wrap');
    const { minHeight, maxHeight } = getRecognizeMessageHeightBounds();

    messageTextarea.style.height = 'auto';
    const contentHeight = Math.max(minHeight, messageTextarea.scrollHeight || 0);
    const nextHeight = Math.min(maxHeight, contentHeight);
    messageTextarea.style.height = `${nextHeight}px`;
    messageTextarea.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden';

    if (wrap) {
        wrap.style.minHeight = `${minHeight}px`;
        wrap.style.maxHeight = `${maxHeight}px`;
        wrap.style.height = `${nextHeight}px`;
    }
}

function setupRecognizeMessageInput() {
    const messageTextarea = document.getElementById('message');
    const lineNumberEl = document.getElementById('messageLineNumbers');
    const ocrInput = document.getElementById('ocrImageInput');
    const ocrDropZone = document.getElementById('ocrDropZone');
    if (!messageTextarea) return;

    const syncLineNumbersScroll = () => {
        if (lineNumberEl) {
            lineNumberEl.scrollTop = messageTextarea.scrollTop;
        }
        renderMessageErrorOverlay();
    };

    messageTextarea.addEventListener('keydown', handleMessageManualInputKeydown);
    messageTextarea.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        if (!(event.ctrlKey || event.metaKey)) return;
        if (event.isComposing || event.keyCode === 229) return;
        event.preventDefault();
        confirmEdit();
    });
    messageTextarea.addEventListener('input', () => {
        lastMessageManualInputAt = Date.now();
        clearMessageLineError();
        syncRecognizeMessageAutoHeight();
        renderMessageLineNumbers();
        scheduleRealtimePreview();
    });
    messageTextarea.addEventListener('focus', () => {
        renderMessageErrorOverlay();
    });
    messageTextarea.addEventListener('blur', () => {
        const changed = normalizeMessageTextareaWhitespace(messageTextarea, { preserveSelection: false });
        if (changed) {
            syncRecognizeMessageAutoHeight();
            renderMessageLineNumbers();
            previewMessage({ silent: true, realtime: true });
            return;
        }
        renderMessageErrorOverlay();
    });
    messageTextarea.addEventListener('scroll', syncLineNumbersScroll);
    messageTextarea.addEventListener('paste', (event) => {
        handleOcrPaste(event);
        if (event.defaultPrevented) return;
        setTimeout(() => {
            lastMessageManualInputAt = Date.now();
            normalizeMessageTextareaWhitespace(messageTextarea, { preserveSelection: true });
            syncRecognizeMessageAutoHeight();
            renderMessageLineNumbers();
            previewMessage({ silent: true, realtime: true });
        }, 0);
    });

    if (ocrInput) {
        ocrInput.addEventListener('change', handleOcrFileSelected);
    }
    if (ocrDropZone) {
        ocrDropZone.addEventListener('dragover', handleOcrDragOver);
        ocrDropZone.addEventListener('dragleave', handleOcrDragLeave);
        ocrDropZone.addEventListener('drop', handleOcrDrop);
        ocrDropZone.addEventListener('paste', handleOcrPaste);
    }
    document.addEventListener('paste', handleGlobalOcrPaste, true);

    syncRecognizeMessageAutoHeight();
    renderMessageLineNumbers();
    syncLineNumbersScroll();
    updateOcrHint();
}

function scheduleRealtimePreview() {
    if (realtimePreviewTimer) {
        clearTimeout(realtimePreviewTimer);
        realtimePreviewTimer = null;
    }
    realtimePreviewTimer = setTimeout(() => {
        realtimePreviewTimer = null;
        previewMessage({ silent: true, realtime: true });
    }, 380);
}

function handleGlobalOcrPaste(event) {
    const modal = document.getElementById('myModal');
    if (!modal || modal.style.display !== 'block') return;
    handleOcrPaste(event);
}

function pickOcrImage() {
    if (!requirePlanCapability('ocr', 'OCR 图片识别')) return;
    const ocrInput = document.getElementById('ocrImageInput');
    if (!ocrInput) return;
    ocrInput.value = '';
    ocrInput.click();
}

function handleOcrFileSelected(event) {
    if (!hasPlanCapability('ocr')) return;
    const file = event.target && event.target.files ? event.target.files[0] : null;
    if (!file) return;
    setSelectedOcrImage(file);
}

function handleOcrPaste(event) {
    if (!hasPlanCapability('ocr')) return;
    const target = event && event.target;
    const clipboardData = event ? event.clipboardData : null;
    const plainText = clipboardData && typeof clipboardData.getData === 'function'
        ? String(clipboardData.getData('text/plain') || '').trim()
        : '';
    // 文本优先：在消息输入框中粘贴到可用文本时，不拦截默认粘贴行为。
    if (target && target.id === 'message' && plainText) {
        return;
    }
    const clipboardItems = event.clipboardData && event.clipboardData.items ? event.clipboardData.items : [];
    if (!clipboardItems || !clipboardItems.length) return;

    for (let i = 0; i < clipboardItems.length; i += 1) {
        const item = clipboardItems[i];
        if (!item || !item.type || !item.type.startsWith('image/')) continue;
        const file = item.getAsFile();
        if (file) {
            event.preventDefault();
            setSelectedOcrImage(file);
            runOcrFromSelectedImage();
            return;
        }
    }
}

function handleOcrDragOver(event) {
    event.preventDefault();
    if (!hasPlanCapability('ocr')) return;
    const zone = document.getElementById('ocrDropZone');
    if (zone) zone.classList.add('dragover');
}

function handleOcrDragLeave() {
    const zone = document.getElementById('ocrDropZone');
    if (zone) zone.classList.remove('dragover');
}

function handleOcrDrop(event) {
    event.preventDefault();
    if (!hasPlanCapability('ocr')) return;
    const zone = document.getElementById('ocrDropZone');
    if (zone) zone.classList.remove('dragover');
    const files = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files : [];
    if (!files || !files.length) return;
    const imageFile = Array.from(files).find(file => file.type && file.type.startsWith('image/'));
    if (!imageFile) {
        showError('图片识别失败', '请拖入图片文件');
        return;
    }
    setSelectedOcrImage(imageFile);
}

function setSelectedOcrImage(file) {
    if (!file) return;
    if (selectedOcrPreviewUrl) {
        URL.revokeObjectURL(selectedOcrPreviewUrl);
        selectedOcrPreviewUrl = null;
    }
    selectedOcrImage = {
        name: file.name || 'clipboard-image.png',
        size: file.size || 0,
        path: file.path || '',
        file
    };
    try {
        selectedOcrPreviewUrl = URL.createObjectURL(file);
    } catch (error) {
        selectedOcrPreviewUrl = null;
    }
    updateOcrHint();
    renderOcrPreview();
    clearOcrCandidates();
}

function clearOcrImage() {
    if (selectedOcrPreviewUrl) {
        URL.revokeObjectURL(selectedOcrPreviewUrl);
        selectedOcrPreviewUrl = null;
    }
    selectedOcrImage = null;
    updateOcrHint();
    renderOcrPreview();
    clearOcrCandidates();
}

function updateOcrHint(stateText = '') {
    const hint = document.getElementById('ocrImageHint');
    if (!hint) return;
    if (stateText) {
        hint.textContent = stateText;
        return;
    }
    if (!selectedOcrImage) {
        hint.textContent = '拖拽图片到这里，或在识别区域按 Ctrl/Cmd+V 粘贴截图';
        return;
    }
    const kb = Math.max(1, Math.round((selectedOcrImage.size || 0) / 1024));
    hint.textContent = `已选择图片：${selectedOcrImage.name} (${kb} KB)`;
}

function renderOcrPreview() {
    const wrap = document.getElementById('ocrPreviewWrap');
    const img = document.getElementById('ocrPreviewImage');
    if (!wrap || !img) return;
    if (!selectedOcrPreviewUrl) {
        img.removeAttribute('src');
        wrap.style.display = 'none';
        return;
    }
    img.src = selectedOcrPreviewUrl;
    wrap.style.display = '';
}

function scoreCandidateWithParser(text) {
    const content = String(text || '').trim();
    if (!content) {
        return { ok: false, score: 0, entries: 0, reason: '空内容', richness: 0 };
    }
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    const lineCount = lines.length;
    const digitCount = (content.match(/\d/g) || []).length;
    const amountCount = (content.match(/各\d+/g) || []).length;
    const twoDigitTokenCount = (content.match(/(?:^|[.\s])\d{2}(?=$|[.\s])/g) || []).length;
    const chineseCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
    const regionHint = /(?:^|\n)(?:澳|老奥|香港)(?:$|\n)/.test(content) ? 1 : 0;
    let richness = 0;
    richness += Math.min(60, twoDigitTokenCount * 4);
    richness += Math.min(24, digitCount * 1.2);
    richness += amountCount * 12;
    richness += Math.min(12, lineCount * 3);
    richness += Math.min(10, chineseCount);
    richness += regionHint * 6;
    if (lineCount <= 1) richness -= 18;
    if (digitCount <= 6) richness -= 20;
    richness = Math.max(0, richness);

    if (!window.messageProcessor || typeof window.messageProcessor.previewMessage !== 'function') {
        return { ok: false, score: richness + lineCount * 2, entries: 0, reason: '解析器不可用', richness };
    }
    try {
        const preview = window.messageProcessor.previewMessage(content);
        if (preview && preview.success) {
            const entries = preview.result && Array.isArray(preview.result.entries) ? preview.result.entries.length : 0;
            let score = 70 + entries * 12 + Math.min(20, lineCount * 3) + richness;
            if (entries <= 1 && lineCount <= 1) score -= 35;
            if (digitCount <= 6) score -= 20;
            return { ok: true, score: Math.max(0, score), entries, reason: '', richness };
        }
        return {
            ok: false,
            score: Math.min(40, lineCount * 5) + richness * 0.7,
            entries: 0,
            reason: preview && preview.error ? preview.error : '解析失败',
            richness
        };
    } catch (error) {
        return {
            ok: false,
            score: Math.min(20, lineCount * 3) + richness * 0.6,
            entries: 0,
            reason: error && error.message ? error.message : '解析异常',
            richness
        };
    }
}

function evaluateOcrCandidateSafety(text) {
    const content = String(text || '');
    const hasLatin = /[A-Za-z]/.test(content);
    const allowedChars = /[0-9０-９\s\.\,\，\:：~～\-—=各号澳奥老香港新鼠牛虎兔龙蛇马羊猴鸡狗猪零〇一二两三四五六七八九十百千万亿元米块蚊]/;
    let invalidCharCount = 0;
    for (const ch of content) {
        if (!ch.trim()) continue;
        if (!allowedChars.test(ch)) {
            invalidCharCount += 1;
        }
    }
    const numericDensity = (content.match(/\d/g) || []).length;
    const hasAnchor = /(各|号|澳|奥|香港|老奥|新奥)/.test(content);
    const safe = !hasLatin && invalidCharCount <= 0 && (numericDensity >= 4 || hasAnchor);
    return {
        hasLatin,
        invalidCharCount,
        safe,
    };
}

function normalizeAndRankOcrCandidates(candidates) {
    const map = new Map();
    (Array.isArray(candidates) ? candidates : []).forEach((item) => {
        const text = String(item && item.text ? item.text : '').trim();
        if (!text) return;
        const ocrScore = Number.isFinite(item.score) ? item.score : 0;
        const parser = scoreCandidateWithParser(text);
        const safety = evaluateOcrCandidateSafety(text);
        const penalty = (safety.hasLatin ? 70 : 0) + (safety.invalidCharCount * 8);
        const totalScore = (parser.ok ? 120 : 0) + parser.score * 2 + ocrScore - penalty;
        const merged = {
            text,
            ocrScore,
            parserOk: parser.ok,
            parserScore: parser.score,
            parserEntries: parser.entries,
            parserReason: parser.reason,
            richness: parser.richness || 0,
            hasLatin: safety.hasLatin,
            invalidCharCount: safety.invalidCharCount,
            safetyOk: safety.safe,
            source: item.source || 'offline',
            totalScore,
        };
        const existed = map.get(text);
        if (!existed || merged.totalScore > existed.totalScore) {
            map.set(text, merged);
        }
    });
    return Array.from(map.values()).sort((a, b) => b.totalScore - a.totalScore).slice(0, 3);
}

function renderOcrCandidates(candidates) {
    const panel = document.getElementById('ocrCandidatePanel');
    const list = document.getElementById('ocrCandidateList');
    if (!panel || !list) return;

    ocrCandidateResults = Array.isArray(candidates) ? candidates : [];
    if (ocrCandidateResults.length === 0) {
        panel.style.display = 'none';
        list.innerHTML = '';
        return;
    }

    panel.style.display = '';
    list.innerHTML = '';
    ocrCandidateResults.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'ocr-candidate-item';
        row.onclick = () => applyOcrCandidate(index, true);

        const meta = document.createElement('div');
        meta.className = 'ocr-candidate-meta';
        const parserLabel = item.parserOk ? `解析可用(${item.parserEntries})` : `解析待修正`;
        const riskLabel = item.safetyOk ? '低风险' : '高风险';
        meta.textContent = `候选${index + 1} | ${parserLabel} | ${riskLabel} | OCR:${Math.round(item.ocrScore)} | 源:${item.source}`;

        const text = document.createElement('div');
        text.className = 'ocr-candidate-text';
        text.textContent = item.text;

        row.appendChild(meta);
        row.appendChild(text);
        list.appendChild(row);
    });
}

function clearOcrCandidates() {
    ocrCandidateResults = [];
    renderOcrCandidates([]);
}

function applyOcrCandidate(index, showToast) {
    const item = ocrCandidateResults[index];
    if (!item) return;
    const messageTextarea = document.getElementById('message');
    if (!messageTextarea) return;
    messageTextarea.value = item.text;
    syncRecognizeMessageAutoHeight();
    messageTextarea.focus();
    messageTextarea.setSelectionRange(messageTextarea.value.length, messageTextarea.value.length);
    renderMessageLineNumbers();
    previewMessage({ silent: true });
    if (showToast) {
        showSuccess(`已应用候选${index + 1}${item.parserOk ? '（解析通过）' : ''}`);
    }
}

function shouldAutoApplyBestCandidate(candidate) {
    if (!candidate) return false;
    if (!candidate.parserOk || candidate.parserEntries <= 0) return false;
    if (!candidate.safetyOk) return false;
    if (candidate.parserScore < 70) return false;
    return true;
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('读取图片失败'));
        reader.readAsDataURL(file);
    });
}

async function runOcrFromSelectedImage() {
    if (!requirePlanCapability('ocr', 'OCR 图片识别')) return;
    if (!ipcRenderer || typeof ipcRenderer.invoke !== 'function') {
        showError('图片识别失败', 'OCR通道不可用');
        return;
    }
    if (!selectedOcrImage || (!selectedOcrImage.path && !selectedOcrImage.file)) {
        showError('图片识别失败', '请先选择或粘贴图片');
        return;
    }

    try {
        updateOcrHint('图片识别中，请稍候...');
        const payload = {
            preferOnline: false,
            allowOnlineFallback: typeof navigator !== 'undefined' && navigator.onLine === true,
            mode: 'structured',
            handwriting: true,
        };
        if (selectedOcrImage.path) {
            payload.filePath = selectedOcrImage.path;
        } else if (selectedOcrImage.file) {
            payload.dataUrl = await fileToDataUrl(selectedOcrImage.file);
        } else {
            throw new Error('未找到可用图片数据');
        }

        const result = await ipcRenderer.invoke('ocr:recognize-image', payload);
        const rawCandidates = [];
        if (result && result.text) {
            rawCandidates.push({
                text: result.text,
                score: Number.isFinite(result.score) ? result.score : 0,
                source: result.source || 'offline'
            });
        }
        if (result && Array.isArray(result.candidates)) {
            rawCandidates.push(...result.candidates);
        }

        const ranked = normalizeAndRankOcrCandidates(rawCandidates);
        if (!ranked.length) {
            throw new Error(result && result.message ? result.message : '未识别到可用文本');
        }

        renderOcrCandidates(ranked);
        const best = ranked[0];
        const autoApplied = shouldAutoApplyBestCandidate(best);
        if (autoApplied) {
            applyOcrCandidate(0, false);
        }
        updateOcrHint(`识别完成（${best.source || 'offline'}，候选${ranked.length}条，耗时 ${result && result.elapsedMs ? result.elapsedMs : 0} ms）`);
        if (autoApplied) {
            showSuccess('图片识别成功，已自动应用最优候选');
        } else {
            showError('图片识别提醒', '识别结果不稳定，已停止自动填充。请点击候选手动应用或重拍图片。');
        }
    } catch (error) {
        updateOcrHint();
        clearOcrCandidates();
        showError('图片识别失败', error.message || '未知错误');
    }
}

function renderMessageLineNumbers() {
    const messageTextarea = document.getElementById('message');
    const lineNumberEl = document.getElementById('messageLineNumbers');
    if (!messageTextarea || !lineNumberEl) {
        renderMessageErrorOverlay();
        return;
    }

    const lines = String(messageTextarea.value || '').split('\n');
    const count = Math.max(1, lines.length);
    const rows = [];
    for (let i = 1; i <= count; i += 1) {
        const cls = messageErrorLineNos.includes(i) ? 'message-line-number error' : 'message-line-number';
        rows.push(`<div class="${cls}">${i}</div>`);
    }
    lineNumberEl.innerHTML = rows.join('');
    lineNumberEl.scrollTop = messageTextarea.scrollTop;
    renderMessageErrorOverlay();
}

function setMessageLineErrors(lineNos = []) {
    const normalized = Array.isArray(lineNos)
        ? lineNos
            .map(item => parseInt(item, 10))
            .filter(item => Number.isFinite(item) && item > 0)
        : [];
    messageErrorLineNos = Array.from(new Set(normalized)).sort((a, b) => a - b);
    renderMessageLineNumbers();
}

function renderMessageErrorOverlay() {
    const textarea = document.getElementById('message');
    const overlay = document.getElementById('messageErrorOverlay');
    if (!textarea || !overlay) return;

    const shouldShow = messageErrorLineNos.length > 0 && document.activeElement !== textarea;
    if (!shouldShow) {
        overlay.classList.remove('show');
        overlay.innerHTML = '';
        overlay.style.setProperty('--message-overlay-scroll-top', `${textarea.scrollTop || 0}px`);
        textarea.classList.remove('message-overlay-active');
        return;
    }
    textarea.classList.add('message-overlay-active');

    const errorSet = new Set(messageErrorLineNos);
    const lines = String(textarea.value || '').replace(/\r/g, '').split('\n');
    const rows = lines.map((line, idx) => {
        const lineNo = idx + 1;
        const isError = errorSet.has(lineNo);
        const cls = isError ? 'message-error-overlay-line is-error' : 'message-error-overlay-line';
        const safeText = escapeHtml(line && line.length > 0 ? line : ' ');
        return `<div class="${cls}">${safeText}</div>`;
    }).join('');

    overlay.innerHTML = `<div class="message-error-overlay-content">${rows}</div>`;
    overlay.style.setProperty('--message-overlay-scroll-top', `${textarea.scrollTop || 0}px`);
    overlay.classList.add('show');
}

function clearMessageLineError() {
    const textarea = document.getElementById('message');
    if (textarea) {
        textarea.classList.remove('has-line-error');
        textarea.classList.remove('message-overlay-active');
        textarea.style.removeProperty('--error-line-start');
        textarea.style.removeProperty('--error-line-end');
    }
    messageErrorLineNos = [];
    renderMessageLineNumbers();
}

function normalizeEditorWhitespace(text) {
    return String(text || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[\u3000\u00a0]/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/[ ]{2,}/g, ' ')
        .replace(/[ \t]+$/gm, '');
}

function normalizeMessageTextareaWhitespace(textarea, options = {}) {
    if (!textarea) return false;
    const raw = String(textarea.value || '');
    const normalized = normalizeEditorWhitespace(raw);
    if (normalized === raw) return false;

    const preserveSelection = options.preserveSelection !== false;
    const start = preserveSelection && typeof textarea.selectionStart === 'number'
        ? textarea.selectionStart
        : raw.length;
    const end = preserveSelection && typeof textarea.selectionEnd === 'number'
        ? textarea.selectionEnd
        : start;

    const normalizedStart = normalizeEditorWhitespace(raw.slice(0, start)).length;
    const normalizedEnd = normalizeEditorWhitespace(raw.slice(0, end)).length;

    suppressMessageInputNormalization = true;
    textarea.value = normalized;
    suppressMessageInputNormalization = false;

    if (document.activeElement === textarea && typeof textarea.setSelectionRange === 'function') {
        textarea.setSelectionRange(normalizedStart, normalizedEnd);
    }
    return true;
}

function parseManualInputState(value) {
    const text = String(value || '');
    const amountMatch = text.match(/^([\d.]*)(?:\s*各\s*|=|\s+)([\d.]*)$/);
    const hasAmount = !!amountMatch;
    const numberPart = hasAmount ? (amountMatch[1] || '') : text;
    const amountPart = hasAmount ? (amountMatch[2] || '') : '';

    if (!/^[\d.]*$/.test(numberPart)) return null;
    if (hasAmount && !/^\d*(?:\.\d*)?$/.test(amountPart)) return null;

    const segments = numberPart.split('.').filter(segment => segment.length > 0);
    const tokens = [];
    let pending = '';
    segments.forEach((segment, idx) => {
        if (/^\d{2}$/.test(segment)) {
            tokens.push(segment);
            return;
        }
        if (idx === segments.length - 1 && /^\d$/.test(segment)) {
            pending = segment;
            return;
        }
        pending = '__invalid__';
    });
    if (pending === '__invalid__') return null;

    if (numberPart === '') {
        pending = '';
    } else if (segments.length === 0 && /^\d$/.test(numberPart)) {
        pending = numberPart;
    } else if (segments.length === 0 && !/^\d{2}$/.test(numberPart)) {
        return null;
    }

    return {
        tokens,
        pending,
        inAmount: hasAmount,
        amount: amountPart
    };
}

function renderManualInputState(textarea, state) {
    const numberPart = [
        state.tokens.join('.'),
        state.pending ? (state.tokens.length > 0 ? `.${state.pending}` : state.pending) : ''
    ].join('');
    const fullText = state.inAmount ? `${numberPart} 各 ${state.amount || ''}`.trimEnd() : numberPart;
    suppressMessageInputNormalization = true;
    textarea.value = fullText;
    suppressMessageInputNormalization = false;
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    renderMessageLineNumbers();
}

function speakManualNumber(numberText) {
    try {
        if (typeof window === 'undefined' || !window.speechSynthesis || !numberText) return;
        const synth = window.speechSynthesis;
        // 输入快时打断上一条，优先播报最新号码
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(String(numberText));
        utterance.lang = 'zh-CN';
        utterance.rate = 1.75;
        utterance.pitch = 1;
        utterance.volume = 1;
        if (!speechVoice) {
            const voices = synth.getVoices ? synth.getVoices() : [];
            speechVoice = voices.find(v => (v.lang || '').toLowerCase().includes('zh')) || null;
        }
        if (speechVoice) {
            utterance.voice = speechVoice;
        }
        synth.speak(utterance);
    } catch (error) {
        // 语音失败不影响主输入流程
    }
}

function handleMessageManualInputKeydown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const textarea = event.target;
    const value = textarea.value || '';
    if (!/^[\d.\s]*$/.test(value)) return;

    const state = parseManualInputState(value);
    if (!state) return;

    const key = event.key;
    if (/^\d$/.test(key)) {
        event.preventDefault();
        if (state.inAmount) {
            state.amount += key;
            renderManualInputState(textarea, state);
            return;
        }

        if (!state.pending) {
            if (key > '4') {
                showError('输入错误', '首位数字只能输入 0-4');
                return;
            }
            state.pending = key;
            renderManualInputState(textarea, state);
            return;
        }

        const composed = `${state.pending}${key}`;
        const num = parseInt(composed, 10);
        if (num < 1 || num > 49) {
            showError('输入错误', `非法号码: ${composed}`);
            state.pending = '';
            renderManualInputState(textarea, state);
            return;
        }
        state.tokens.push(composed);
        state.pending = '';
        renderManualInputState(textarea, state);
        speakManualNumber(composed);
        return;
    }

    if (key === ' ' || key === '=') {
        event.preventDefault();
        if (state.pending) {
            showError('输入错误', '号码输入不完整，请补全两位');
            return;
        }
        if (state.tokens.length === 0) {
            showError('输入错误', '请先输入号码');
            return;
        }
        state.inAmount = true;
        renderManualInputState(textarea, state);
        return;
    }

    if (key === '.' || key === '。') {
        event.preventDefault();
        if (!state.inAmount) return;
        if (state.amount.includes('.')) return;
        state.amount = state.amount ? `${state.amount}.` : '0.';
        renderManualInputState(textarea, state);
        return;
    }

    if (key === 'Backspace') {
        event.preventDefault();
        if (state.inAmount) {
            if (state.amount.length > 0) {
                state.amount = state.amount.slice(0, -1);
            } else {
                state.inAmount = false;
            }
            renderManualInputState(textarea, state);
            return;
        }

        if (state.pending) {
            state.pending = '';
            renderManualInputState(textarea, state);
            return;
        }

        if (state.tokens.length > 0) {
            state.tokens.pop();
            renderManualInputState(textarea, state);
        }
    }
}

function normalizeMessageBeforeSubmit(message, options = {}) {
    const trimmed = String(message || '').trim();
    if (!trimmed) return '';

    if (/^(?:\d{2}\.)*\d$/.test(trimmed) || /^(?:\d{2}\.)*\d{2}\s+$/.test(message)) {
        throw new Error('号码输入不完整，请检查是否每个号码均为两位');
    }

    const canonicalizeParsed = !!(options && options.canonicalizeParsed);
    if (canonicalizeParsed && window.messageProcessor && typeof window.messageProcessor.parseMessage === 'function') {
        const parsed = window.messageProcessor.parseMessage(trimmed);
        if (parsed && typeof parsed.original === 'string' && parsed.original.trim()) {
            return parsed.original.trim();
        }
    }

    const numberWithAmount = /^((?:\d{2}\.)*\d{2})(?:\s*各\s*|=|\s+)(\d+(?:\.\d+)?)$/;
    const matched = trimmed.match(numberWithAmount);
    if (matched) {
        return `${matched[1]}各${matched[2]}`;
    }
    return trimmed;
}

function isRecognizeModalOpen() {
    const modal = document.getElementById('myModal');
    return !!(modal && modal.style.display === 'block');
}

function loadClipboardAssistEnabledPreference() {
    try {
        const raw = localStorage.getItem(CLIPBOARD_ASSIST_ENABLED_KEY);
        if (raw === '0') return false;
        if (raw === '1') return true;
    } catch (error) {
        // ignore
    }
    return true;
}

function saveClipboardAssistEnabledPreference(enabled) {
    try {
        localStorage.setItem(CLIPBOARD_ASSIST_ENABLED_KEY, enabled ? '1' : '0');
    } catch (error) {
        // ignore
    }
}

function updateClipboardAssistBanner(monitoringEnabled) {
    const banner = document.getElementById('clipboardAssistBanner');
    const status = document.getElementById('clipboardAssistStatus');
    const toggle = document.getElementById('clipboardAssistToggle');
    const capabilityKnown = !!currentPlanContext;
    const capabilityEnabled = capabilityKnown ? hasPlanCapability('clipboardAssist') : true;
    if (toggle) {
        toggle.checked = capabilityEnabled && !!clipboardAssistEnabled;
    }
    if (!banner || !status) return;
    banner.classList.toggle('active', capabilityEnabled && !!clipboardAssistEnabled);
    banner.classList.toggle('locked', capabilityKnown && !capabilityEnabled);
    if (capabilityKnown && !capabilityEnabled) {
        status.textContent = '自动监听微信复制：Pro 专属';
        return;
    }
    if (!clipboardAssistEnabled) {
        status.textContent = '自动监听微信复制：已关闭';
        return;
    }
    status.textContent = monitoringEnabled ? '自动监听微信复制：已开启' : '自动监听微信复制：待启用';
}

function refreshClipboardMonitorState() {
    if (!isRecognizeModalOpen()) {
        stopRecognizeClipboardMonitor();
        updateClipboardAssistBanner(false);
        return;
    }
    if (currentPlanContext && !hasPlanCapability('clipboardAssist')) {
        stopRecognizeClipboardMonitor();
        updateClipboardAssistBanner(false);
        return;
    }
    if (!clipboardAssistEnabled) {
        stopRecognizeClipboardMonitor();
        updateClipboardAssistBanner(false);
        return;
    }
    startRecognizeClipboardMonitor();
}

function setClipboardAssistEnabled(enabled, options = {}) {
    const next = !!enabled;
    if (next && currentPlanContext && !hasPlanCapability('clipboardAssist')) {
        showError('功能受限', '自动监听微信复制为 Pro 专属能力，请升级后使用。');
        clipboardAssistEnabled = false;
        refreshClipboardMonitorState();
        return;
    }
    const shouldPersist = options.persist !== false;
    const silent = !!options.silent;
    clipboardAssistEnabled = next;
    if (shouldPersist) {
        saveClipboardAssistEnabledPreference(next);
    }
    refreshClipboardMonitorState();
    if (!silent) {
        showSuccess(next ? '自动监听微信复制已开启' : '自动监听微信复制已关闭');
    }
}

function initClipboardAssistPreference() {
    clipboardAssistEnabled = loadClipboardAssistEnabledPreference();
    if (currentPlanContext && !hasPlanCapability('clipboardAssist')) {
        clipboardAssistEnabled = false;
    }
    const toggle = document.getElementById('clipboardAssistToggle');
    if (toggle && !toggle.dataset.bound) {
        toggle.dataset.bound = '1';
        toggle.addEventListener('change', (event) => {
            setClipboardAssistEnabled(!!event.target.checked);
        });
    }
    updateClipboardAssistBanner(false);
}

function showClipboardAssistHintOnce() {
    try {
        const shown = localStorage.getItem(CLIPBOARD_ASSIST_HINT_SHOWN_KEY);
        if (shown === '1') return;
        localStorage.setItem(CLIPBOARD_ASSIST_HINT_SHOWN_KEY, '1');
        showSuccess('已开启自动监听：打开后若剪贴板已有内容会先提示导入，后续新复制会自动填充并解析。');
    } catch (error) {
        // ignore
    }
}

function startRecognizeClipboardMonitor() {
    if (recognizeClipboardMonitoring) return;
    if (currentPlanContext && !hasPlanCapability('clipboardAssist')) {
        updateClipboardAssistBanner(false);
        return;
    }
    if (!clipboardAssistEnabled) {
        updateClipboardAssistBanner(false);
        return;
    }
    if (!ipcRenderer || typeof ipcRenderer.send !== 'function') return;
    recognizeClipboardMonitoring = true;
    clipboardMonitorStartedAt = Date.now();
    ipcRenderer.send('clipboard-monitor:start');
    updateClipboardAssistBanner(true);
    showClipboardAssistHintOnce();
    // 开启监听后读取当前剪贴板，仅在输入框为空时提示是否导入，避免直接覆盖用户输入。
    pullClipboardSnapshotOnce();
}

function stopRecognizeClipboardMonitor() {
    if (recognizeClipboardMonitoring) {
        if (ipcRenderer && typeof ipcRenderer.send === 'function') {
            ipcRenderer.send('clipboard-monitor:stop');
        }
        recognizeClipboardMonitoring = false;
    }
    clipboardMonitorStartedAt = 0;
    updateClipboardAssistBanner(false);
}

function isLikelyClipboardChatMessage(text) {
    const content = String(text || '').trim();
    if (!content || content.length < 4 || content.length > 5000) return false;
    if (!/\d/.test(content)) return false;
    const hasSignal = /(各|号|[鼠牛虎兔龙蛇马羊猴鸡狗猪]|(?:^|\n)\s*(澳|老奥|香港)\s*(?:$|\n)|\d{2}[.\s,，]\d{2})/.test(content);
    return hasSignal;
}

function shouldAutoHandleClipboardText(content, currentText = '') {
    const text = String(content || '').trim();
    if (!text || text.length > 12000) return false;
    if (/^https?:\/\//i.test(text)) return false;

    if (text === String(currentText || '').trim()) return false;
    if (isLikelyClipboardChatMessage(text)) return true;
    if (/[各号买肖数大小单双波鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(text)) return true;
    if (/\d{1,2}\s*[.,，。\-—/~～\s]\s*\d{1,2}/.test(text)) return true;
    if (/\n/.test(text) && /[\u4e00-\u9fa5]/.test(text) && /\d/.test(text)) return true;
    return false;
}

function shouldPromptClipboardSnapshotImport(content) {
    const text = String(content || '').trim();
    if (!text || text.length > 12000) return false;
    if (/^https?:\/\//i.test(text)) return false;
    return shouldAutoHandleClipboardText(text, '');
}

async function pullClipboardSnapshotOnce() {
    if (!ipcRenderer || typeof ipcRenderer.invoke !== 'function') return;
    if (!recognizeClipboardMonitoring || !isRecognizeModalOpen()) return;
    const messageTextarea = document.getElementById('message');
    if (!messageTextarea) return;
    if (String(messageTextarea.value || '').trim()) return;
    try {
        const text = await ipcRenderer.invoke('clipboard:read-text');
        const content = normalizeEditorWhitespace(String(text || '')).trim();
        if (!content) return;
        if (!shouldPromptClipboardSnapshotImport(content)) return;
        if (!recognizeClipboardMonitoring || !isRecognizeModalOpen()) return;
        if (String(messageTextarea.value || '').trim()) return;

        const action = await showClipboardSnapshotImportDialog(content);
        if (action !== 'import') return;
        if (!recognizeClipboardMonitoring || !isRecognizeModalOpen()) return;
        if (String(messageTextarea.value || '').trim()) return;

        messageTextarea.value = content;
        normalizeMessageTextareaWhitespace(messageTextarea, { preserveSelection: false });
        clearMessageLineError();
        syncRecognizeMessageAutoHeight();
        renderMessageLineNumbers();
        previewMessage({ silent: true });
    } catch (error) {
        // ignore clipboard snapshot failures
    }
}

function getTodayDateKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function canonicalizeMessageForDuplicate(rawText) {
    let text = String(rawText || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .join('\n')
        .replace(/[，、]/g, '.')
        .replace(/[。｡]/g, '.')
        .replace(/[：]/g, ':')
        .replace(/各号/g, '各')
        .replace(/[ \t]+/g, '')
        .replace(/\n{2,}/g, '\n')
        .trim();
    if (!text) return '';
    try {
        text = normalizeMessageBeforeSubmit(text, { canonicalizeParsed: true });
    } catch (error) {
        // keep best-effort canonical text
    }
    return text;
}

function hashMessageKey(text) {
    const source = String(text || '');
    let hash = 2166136261;
    for (let i = 0; i < source.length; i += 1) {
        hash ^= source.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16);
}

function loadClipboardDupLedger() {
    try {
        const raw = localStorage.getItem(CLIPBOARD_DUP_LEDGER_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        return {};
    }
}

function clearClipboardDupLedger() {
    try {
        localStorage.removeItem(CLIPBOARD_DUP_LEDGER_KEY);
    } catch (error) {
        // ignore storage failures
    }
}

function saveClipboardDupLedger(ledger) {
    try {
        const map = ledger && typeof ledger === 'object' ? { ...ledger } : {};
        const minTs = Date.now() - (CLIPBOARD_DUP_KEEP_DAYS * 24 * 60 * 60 * 1000);
        Object.keys(map).forEach((key) => {
            const dateKey = String(key).split('|')[0] || '';
            const ts = Date.parse(`${dateKey}T00:00:00`);
            if (!Number.isFinite(ts) || ts < minTs) {
                delete map[key];
            }
        });
        localStorage.setItem(CLIPBOARD_DUP_LEDGER_KEY, JSON.stringify(map));
    } catch (error) {
        // ignore storage failures
    }
}

function buildClipboardDupKey(dateKey, userName, regionKey, canonicalText) {
    const user = encodeURIComponent(String(userName || ''));
    const region = encodeURIComponent(String(regionKey || ''));
    return `${dateKey}|${region}|${user}|${hashMessageKey(canonicalText)}`;
}

function getLedgerEntryMessage(entry) {
    if (!entry) return '';
    if (typeof entry === 'string') return entry.trim();
    if (typeof entry === 'object') {
        const message = String(entry.message || entry.msg || '').trim();
        return message;
    }
    return '';
}

function getActiveRecognizeRegionKey() {
    if (window.userManager && typeof window.userManager.getActiveRegion === 'function') {
        return window.userManager.getActiveRegion() || 'new_ao';
    }
    return 'new_ao';
}

function extractRegionKeysForDuplicate(message) {
    const fallback = getActiveRecognizeRegionKey();
    if (!window.messageProcessor || typeof window.messageProcessor.previewMessage !== 'function') {
        return [fallback];
    }
    try {
        const preview = window.messageProcessor.previewMessage(message);
        if (!preview || !preview.success || !preview.result || !Array.isArray(preview.result.entries)) {
            return [fallback];
        }
        const keys = Array.from(new Set(
            preview.result.entries
                .map(item => (item && item.regionKey ? item.regionKey : fallback))
                .filter(Boolean)
        ));
        return keys.length > 0 ? keys : [fallback];
    } catch (error) {
        return [fallback];
    }
}

function findTodayDuplicateInfo(canonicalText, userNames, regionKeys, fallbackMessage = '') {
    if (!canonicalText || !Array.isArray(userNames) || userNames.length === 0) {
        return { users: [], messages: [] };
    }
    const dateKey = getTodayDateKey();
    const activeRegions = Array.isArray(regionKeys) && regionKeys.length > 0 ? regionKeys : [getActiveRecognizeRegionKey()];
    const ledger = loadClipboardDupLedger();
    const duplicateUsers = [];
    const duplicateMessages = [];
    const seenMessages = new Set();
    const staleKeys = [];

    userNames.forEach((userName) => {
        let hit = false;
        activeRegions.forEach((regionKey) => {
            const key = buildClipboardDupKey(dateKey, userName, regionKey, canonicalText);
            const entry = ledger[key];
            if (!entry) return;
            const stillExists = hasRecordedOriginalMessageForDuplicate(userName, regionKey, canonicalText);
            if (!stillExists) {
                staleKeys.push(key);
                return;
            }
            hit = true;
            const msg = getLedgerEntryMessage(entry) || String(fallbackMessage || '').trim();
            if (msg && !seenMessages.has(msg)) {
                seenMessages.add(msg);
                duplicateMessages.push(msg);
            }
        });
        if (hit) {
            duplicateUsers.push(userName);
        }
    });

    if (staleKeys.length > 0) {
        staleKeys.forEach((key) => {
            delete ledger[key];
        });
        saveClipboardDupLedger(ledger);
    }

    return { users: duplicateUsers, messages: duplicateMessages };
}

function hasRecordedOriginalMessageForDuplicate(userName, regionKey, canonicalText) {
    if (!canonicalText) return false;
    if (!window.userManager || typeof window.userManager.getUserRegionData !== 'function') {
        return true;
    }
    const regionData = window.userManager.getUserRegionData(userName, regionKey);
    if (!regionData || !Array.isArray(regionData.originalData) || regionData.originalData.length === 0) {
        return false;
    }
    return regionData.originalData.some((message) => {
        const normalized = canonicalizeMessageForDuplicate(String(message || ''));
        return normalized === canonicalText;
    });
}

function markMessageRecordedForToday(message, userNames, regionKeys) {
    const canonicalText = canonicalizeMessageForDuplicate(message);
    if (!canonicalText || !Array.isArray(userNames) || userNames.length === 0) return;

    const dateKey = getTodayDateKey();
    const activeRegions = Array.isArray(regionKeys) && regionKeys.length > 0 ? regionKeys : [getActiveRecognizeRegionKey()];
    const ledger = loadClipboardDupLedger();
    const now = Date.now();
    const sourceMessage = String(message || '').trim().slice(0, 6000);
    userNames.forEach((userName) => {
        activeRegions.forEach((regionKey) => {
            const key = buildClipboardDupKey(dateKey, userName, regionKey, canonicalText);
            ledger[key] = {
                ts: now,
                message: sourceMessage,
            };
        });
    });
    saveClipboardDupLedger(ledger);
}

function escapeDialogHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showClipboardSnapshotImportDialog(rawText = '') {
    if (clipboardSnapshotImportDialogOpen || clipboardDuplicateDialogOpen) {
        return Promise.resolve('ignore');
    }
    clipboardSnapshotImportDialogOpen = true;
    return new Promise((resolve) => {
        const previewText = String(rawText || '').trim();
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.45);
            z-index: 12000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            width: min(560px, calc(100vw - 32px));
            background: #ffffff;
            border-radius: 12px;
            padding: 18px;
            box-shadow: 0 10px 26px rgba(0,0,0,0.25);
            color: #1f2937;
            font-size: 16px;
            line-height: 1.55;
        `;
        dialog.innerHTML = `
            <div style="font-size:18px;font-weight:700;margin-bottom:8px;">检测到剪贴板内容</div>
            <div style="margin-bottom:8px;color:#374151;">识别页面打开时剪贴板已有消息，是否导入到输入框？</div>
            <div style="margin-bottom:12px;max-height:220px;overflow:auto;border:1px solid #d7e3ef;border-radius:8px;background:#f8fbff;padding:10px;">
                <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-size:13px;color:#1f2937;">${escapeDialogHtml(previewText)}</pre>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button type="button" data-action="import" style="border:none;background:#2563eb;color:#fff;border-radius:8px;padding:8px 14px;cursor:pointer;">导入</button>
                <button type="button" data-action="ignore" style="border:none;background:#6b7280;color:#fff;border-radius:8px;padding:8px 14px;cursor:pointer;">忽略</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const finalize = (action) => {
            clipboardSnapshotImportDialogOpen = false;
            if (overlay.parentElement) {
                overlay.parentElement.removeChild(overlay);
            }
            resolve(action);
        };

        dialog.querySelectorAll('button[data-action]').forEach((button) => {
            button.addEventListener('click', () => {
                finalize(button.getAttribute('data-action') || 'ignore');
            });
        });

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                finalize('ignore');
            }
        });
    });
}

function showDuplicateClipboardActionDialog(duplicateUsers = [], regionKeys = [], duplicateMessages = []) {
    if (clipboardDuplicateDialogOpen) {
        return Promise.resolve('cancel');
    }
    clipboardDuplicateDialogOpen = true;
    return new Promise((resolve) => {
        const regionLabels = (regionKeys || []).map((key) => {
            if (window.userManager && typeof window.userManager.getRegionLabel === 'function') {
                return window.userManager.getRegionLabel(key);
            }
            return key;
        }).filter(Boolean);

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.45);
            z-index: 12000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            width: min(520px, calc(100vw - 32px));
            background: #ffffff;
            border-radius: 12px;
            padding: 18px;
            box-shadow: 0 10px 26px rgba(0,0,0,0.25);
            color: #1f2937;
            font-size: 16px;
            line-height: 1.55;
        `;

        const usersText = duplicateUsers.length > 0 ? duplicateUsers.join('，') : '当前客户';
        const regionsText = regionLabels.length > 0 ? regionLabels.join('、') : '当前盘口';
        const messageList = (Array.isArray(duplicateMessages) ? duplicateMessages : [])
            .map(msg => String(msg || '').trim())
            .filter(Boolean);
        const messageItems = messageList.length > 0
            ? messageList.map((msg, idx) => `
                <div style="margin-bottom:8px;border:1px solid #d7e3ef;border-radius:8px;padding:8px;background:#f8fbff;">
                    <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">重复消息${idx + 1}</div>
                    <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-size:13px;color:#1f2937;">${escapeDialogHtml(msg)}</pre>
                </div>
            `).join('')
            : '<div style="font-size:13px;color:#6b7280;">未找到已记录消息内容</div>';

        dialog.innerHTML = `
            <div style="font-size:18px;font-weight:700;margin-bottom:8px;">检测到今日重复消息</div>
            <div style="margin-bottom:6px;">客户：${usersText}</div>
            <div style="margin-bottom:8px;">盘口：${regionsText}</div>
            <div style="margin-bottom:8px;color:#374151;">重复内容如下：</div>
            <div style="max-height:190px;overflow:auto;margin-bottom:12px;">${messageItems}</div>
            <div style="margin-bottom:14px;color:#374151;">同一客户当天已录入过相同消息，是否继续添加？</div>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button type="button" data-action="add" style="border:none;background:#2563eb;color:#fff;border-radius:8px;padding:8px 14px;cursor:pointer;">添加</button>
                <button type="button" data-action="cancel" style="border:none;background:#ef4444;color:#fff;border-radius:8px;padding:8px 14px;cursor:pointer;">取消</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const finalize = (action) => {
            clipboardDuplicateDialogOpen = false;
            if (overlay.parentElement) {
                overlay.parentElement.removeChild(overlay);
            }
            resolve(action);
        };

        dialog.querySelectorAll('button[data-action]').forEach((button) => {
            button.addEventListener('click', () => {
                finalize(button.getAttribute('data-action') || 'cancel');
            });
        });

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                finalize('cancel');
            }
        });
    });
}

async function handleClipboardTextChanged(payload) {
    if (!recognizeClipboardMonitoring || !isRecognizeModalOpen() || clipboardDuplicateDialogOpen || clipboardSnapshotImportDialogOpen) {
        return;
    }
    const capturedAt = Number(payload && payload.capturedAt) || 0;
    if (clipboardMonitorStartedAt > 0 && capturedAt > 0 && capturedAt < clipboardMonitorStartedAt) {
        return;
    }
    const content = normalizeEditorWhitespace(String(payload && payload.text ? payload.text : '')).trim();

    const messageTextarea = document.getElementById('message');
    if (!messageTextarea) return;

    if (!shouldAutoHandleClipboardText(content, messageTextarea.value || '')) {
        return;
    }

    if (
        document.activeElement === messageTextarea
        && String(messageTextarea.value || '').trim()
        && (Date.now() - lastMessageManualInputAt) < 450
    ) {
        return;
    }

    const canonicalIncoming = canonicalizeMessageForDuplicate(content);
    if (!canonicalIncoming) return;

    const currentText = String(messageTextarea.value || '').trim();
    const canonicalCurrent = canonicalizeMessageForDuplicate(currentText);
    if (canonicalIncoming === canonicalCurrent) return;

    let action = currentText ? 'append' : 'replace';
    const selectedUsers = getEditableUsersForCurrentSelection();
    if (selectedUsers.length > 0) {
        const regionKeys = extractRegionKeysForDuplicate(content);
        const duplicateInfo = findTodayDuplicateInfo(canonicalIncoming, selectedUsers, regionKeys, content);
        const duplicateUsers = duplicateInfo.users;
        const duplicateMessages = duplicateInfo.messages;
        if (duplicateUsers.length > 0) {
            const duplicateAction = await showDuplicateClipboardActionDialog(duplicateUsers, regionKeys, duplicateMessages);
            if (duplicateAction === 'cancel') return;
            action = 'append';
        }
    }
    const latestCurrentText = String(messageTextarea.value || '').trim();
    if (action === 'append') {
        messageTextarea.value = [latestCurrentText, content].filter(Boolean).join('\n');
    } else {
        messageTextarea.value = content;
    }
    normalizeMessageTextareaWhitespace(messageTextarea, { preserveSelection: false });

    clearMessageLineError();
    syncRecognizeMessageAutoHeight();
    renderMessageLineNumbers();
    previewMessage({ silent: true });
}

function updateMessageWithAttributeIntersection() {
    const messageTextarea = document.getElementById('message');
    const attributeMap = getSelectableAttributeMap();
    if (!messageTextarea) return;

    const selected = Array.from(selectedAttributes).map(attr => attributeMap[attr] || []);
    if (selected.length === 0) {
        messageTextarea.value = '';
        syncRecognizeMessageAutoHeight();
        renderMessageLineNumbers();
        return;
    }

    let intersection = new Set(selected[0]);
    const union = new Set(selected[0]);
    for (let i = 1; i < selected.length; i += 1) {
        const currentSet = new Set(selected[i]);
        intersection = new Set(Array.from(intersection).filter(num => currentSet.has(num)));
        selected[i].forEach(num => union.add(num));
    }

    const targetSet = intersection.size > 0 ? intersection : union;
    const formatted = Array.from(targetSet)
        .sort((a, b) => a - b)
        .map(num => (num < 10 ? `0${num}` : `${num}`))
        .join('.');
    messageTextarea.value = formatted;
    syncRecognizeMessageAutoHeight();
    renderMessageLineNumbers();
}

function resetRecognizeModalState() {
    selectedAttributes.clear();
    renderAttributePicker();
    const messageTextarea = document.getElementById('message');
    const resultElement = document.getElementById('result');
    if (messageTextarea) {
        messageTextarea.value = '';
        syncRecognizeMessageAutoHeight();
    }
    if (realtimePreviewTimer) {
        clearTimeout(realtimePreviewTimer);
        realtimePreviewTimer = null;
    }
    clearMessageLineError();
    if (resultElement) {
        resultElement.innerHTML = '';
    }
    setRecognizePreviewError('');
    const customName = document.getElementById('customAttrName');
    const customNumbers = document.getElementById('customAttrNumbers');
    const anchorAliasToken = document.getElementById('anchorAliasToken');
    const anchorAliasMode = document.getElementById('anchorAliasMode');
    const anchorImpactSampleInput = document.getElementById('anchorImpactSampleInput');
    if (customName) customName.value = '';
    if (customNumbers) customNumbers.value = '';
    if (anchorAliasToken) anchorAliasToken.value = '';
    if (anchorAliasMode) anchorAliasMode.value = 'per_number';
    if (anchorImpactSampleInput && !String(anchorImpactSampleInput.value || '').trim()) {
        anchorImpactSampleInput.value = buildDrawerDefaultSample(anchorStrategyActiveTab || 'per_number');
    }
    closeAnchorRuleDrawer();
    clearOcrImage();
}

// 应用初始化
function initializeApplication() {
    try {
        if (!ipcRenderer || typeof ipcRenderer.send !== 'function') {
            throw new Error('IPC 不可用，请重启应用');
        }
        
        // 设置事件监听器
        setupEventListeners();
        hookUserManagerSaveState();

        // 请求加载用户数据与自定义属性
        ipcRenderer.send('load-user-data');
        ipcRenderer.send('load-custom-attributes');
        ipcRenderer.send('load-attribute-layout');
        ipcRenderer.send('load-attribute-config');
        
        // 设置输入监听器
        setupInputListener(true);
        
        console.log('应用初始化完成');
    } catch (error) {
        console.error('应用初始化失败:', error);
        showError('应用初始化失败', error.message);
    }
}

function renderRecognizeRegionButtons() {
    const container = document.getElementById('recognizeRegionGroup');
    if (!container || !window.userManager || typeof window.userManager.getRegionOptions !== 'function') {
        return;
    }

    container.innerHTML = '';
    const regions = window.userManager.getRegionOptions();
    regions.forEach(region => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'region-chip';
        button.textContent = region.label;
        if (window.userManager.getActiveRegion && window.userManager.getActiveRegion() === region.key) {
            button.classList.add('active');
        }
        button.onclick = () => {
            if (window.userManager && typeof window.userManager.setActiveRegion === 'function') {
                window.userManager.setActiveRegion(region.key);
            }
            renderRecognizeRegionButtons();
        };
        container.appendChild(button);
    });
}

function renderViewRegionButtons() {
    const container = document.getElementById('viewRegionGroup');
    if (!container || !window.userManager || typeof window.userManager.getRegionOptions !== 'function') {
        return;
    }

    container.innerHTML = '';
    const availableRegions = typeof window.userManager.getAvailableViewRegions === 'function'
        ? window.userManager.getAvailableViewRegions()
        : window.userManager.getRegionOptions();

    if (!availableRegions || availableRegions.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'view-region-empty';
        empty.textContent = '暂无盘口数据';
        container.appendChild(empty);
        return;
    }

    const selectedRegions = window.userManager.getViewRegions ? window.userManager.getViewRegions() : ['new_ao'];
    const selectedAvailable = selectedRegions.filter(key => availableRegions.some(r => r.key === key));
    if (selectedAvailable.length === 0 && typeof window.userManager.setViewRegions === 'function') {
        window.userManager.setViewRegions([availableRegions[0].key]);
    }

    availableRegions.forEach(region => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'region-chip';
        if ((selectedAvailable.length ? selectedAvailable : [availableRegions[0].key]).includes(region.key)) {
            button.classList.add('active');
        }
        button.textContent = region.label;
        button.onclick = () => {
            if (window.userManager && typeof window.userManager.toggleViewRegion === 'function') {
                window.userManager.toggleViewRegion(region.key);
            }
            renderViewRegionButtons();
        };
        container.appendChild(button);
    });
}

window.refreshViewRegionBar = renderViewRegionButtons;
window.refreshRegionPnlPanel = refreshRegionPnlPanel;

function normalizeRegionWinningInput(value) {
    const normalized = String(value || '')
        .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248))
        .replace(/[^\d]/g, '')
        .slice(0, 2);
    if (!normalized) return '';
    // 单独的 0/00 没有意义，视为未输入，避免出现“删不掉的0”体验。
    if (/^0+$/.test(normalized)) return '';
    return normalized;
}

function parseRegionWinningNumber(value) {
    const normalized = normalizeRegionWinningInput(value);
    if (!normalized) {
        return { number: null, error: '' };
    }
    const num = parseInt(normalized, 10);
    if (!Number.isInteger(num) || num < 1 || num > 49) {
        return { number: null, error: '请输入01-49' };
    }
    return { number: num, error: '' };
}

function getRegionPnlOdds() {
    if (window.messageProcessor && typeof window.messageProcessor.getEffectiveDefaultOdds === 'function') {
        const odds = Number(window.messageProcessor.getEffectiveDefaultOdds(''));
        if (Number.isFinite(odds) && odds > 0) return odds;
    }
    const legacyOdds = window.messageProcessor ? Number(window.messageProcessor.ODDS) : NaN;
    return Number.isFinite(legacyOdds) && legacyOdds > 0 ? legacyOdds : 47;
}

function formatNumericAmount(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '--';
    if (Math.abs(num) < 1e-9) return '0';
    if (Number.isInteger(num)) return `${num}`;
    return num.toFixed(4).replace(/\.?0+$/, '');
}

function formatSignedAmount(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '--';
    const plain = formatNumericAmount(num);
    return num > 0 ? `+${plain}` : plain;
}

function loadRegionWinningNumbersPreference() {
    try {
        const raw = localStorage.getItem(REGION_WINNING_NUMBERS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        if (!parsed || typeof parsed !== 'object') return;
        regionWinningNumbers = {
            ...regionWinningNumbers,
            new_ao: normalizeRegionWinningInput(parsed.new_ao),
            old_ao: normalizeRegionWinningInput(parsed.old_ao),
            hongkong: normalizeRegionWinningInput(parsed.hongkong)
        };
    } catch (error) {
        // ignore
    }
}

function saveRegionWinningNumbersPreference() {
    try {
        localStorage.setItem(REGION_WINNING_NUMBERS_KEY, JSON.stringify(regionWinningNumbers));
    } catch (error) {
        // ignore
    }
}

function initRegionPnlPanel() {
    loadRegionWinningNumbersPreference();
    const rows = document.getElementById('regionPnlRows');
    if (rows && !rows.dataset.bound) {
        rows.addEventListener('input', handleRegionWinningInput);
        rows.addEventListener('change', handleRegionWinningBlur);
        rows.addEventListener('blur', handleRegionWinningBlur, true);
        rows.dataset.bound = '1';
    }
    refreshRegionPnlPanel();
}

function handleRegionWinningInput(event) {
    const input = event && event.target;
    if (!input || !input.classList || !input.classList.contains('region-winning-input')) return;
    const regionKey = input.getAttribute('data-region-key');
    if (!regionKey) return;
    const normalized = normalizeRegionWinningInput(input.value);
    if (input.value !== normalized) {
        input.value = normalized;
    }
    regionWinningNumbers[regionKey] = normalized;
    saveRegionWinningNumbersPreference();
}

function handleRegionWinningBlur(event) {
    const input = event && event.target;
    if (!input || !input.classList || !input.classList.contains('region-winning-input')) return;
    const regionKey = input.getAttribute('data-region-key');
    if (!regionKey) return;
    const parsed = parseRegionWinningNumber(input.value);
    if (parsed.number !== null) {
        const fixed = String(parsed.number).padStart(2, '0');
        regionWinningNumbers[regionKey] = fixed;
        input.value = fixed;
        saveRegionWinningNumbersPreference();
        refreshRegionPnlPanel();
    }
}

function collectRegionPnlMetrics(regionKey, winningNumber = null) {
    const users = window.userManager && typeof window.userManager.getAllUsers === 'function'
        ? window.userManager.getAllUsers()
        : {};
    const fallbackOdds = getRegionPnlOdds();
    const target = Number.isInteger(winningNumber) ? String(winningNumber).padStart(2, '0') : '';
    let totalStake = 0;
    let hitStake = 0;
    let payout = 0;

    Object.keys(users || {}).forEach(userName => {
        const regionData = window.userManager && typeof window.userManager.getUserRegionData === 'function'
            ? window.userManager.getUserRegionData(userName, regionKey)
            : null;
        if (!regionData || !Array.isArray(regionData.data)) return;

        const regionTotal = Number(regionData.totalCount);
        totalStake += Number.isFinite(regionTotal)
            ? regionTotal
            : regionData.data.reduce((sum, item) => sum + (Number(item && item.value) || 0), 0);

        if (target) {
            const hitItem = regionData.data.find(item => item && item.number === target);
            const hitValue = Number(hitItem && hitItem.value);
            const safeHit = Number.isFinite(hitValue) ? hitValue : 0;
            hitStake += safeHit;

            const payoutByOdds = window.userManager && typeof window.userManager.getUserRegionPayoutByNumber === 'function'
                ? Number(window.userManager.getUserRegionPayoutByNumber(userName, regionKey, target))
                : NaN;
            if (Number.isFinite(payoutByOdds)) {
                payout += payoutByOdds;
            } else {
                payout += safeHit * fallbackOdds;
            }
        }
    });

    const pnl = totalStake - payout;
    return { totalStake, hitStake, payout, pnl };
}

function refreshRegionPnlPanel() {
    const head = document.getElementById('regionPnlHead');
    const rows = document.getElementById('regionPnlRows');
    const summary = document.getElementById('regionPnlSummary');
    if (!head || !rows || !summary) return;

    const defaultOdds = getRegionPnlOdds();
    head.textContent = `盘口中奖盈亏（默认赔率 ${formatNumericAmount(defaultOdds)}，支持锚点独立赔率）`;

    const regionOptions = window.userManager && typeof window.userManager.getRegionOptions === 'function'
        ? window.userManager.getRegionOptions()
        : [
            { key: 'new_ao', label: '新奥' },
            { key: 'old_ao', label: '老奥' },
            { key: 'hongkong', label: '香港' }
        ];

    rows.innerHTML = '';
    let computedCount = 0;
    let invalidCount = 0;
    let totalStake = 0;
    let totalPayout = 0;
    let totalPnl = 0;

    regionOptions.forEach(region => {
        if (typeof regionWinningNumbers[region.key] !== 'string') {
            regionWinningNumbers[region.key] = '';
        }
        const winningRaw = regionWinningNumbers[region.key] || '';
        const parsed = parseRegionWinningNumber(winningRaw);
        const metrics = collectRegionPnlMetrics(region.key, parsed.number);

        const row = document.createElement('div');
        row.className = 'region-pnl-row';
        const top = document.createElement('div');
        top.className = 'region-pnl-row-top';
        const regionLabel = document.createElement('span');
        regionLabel.className = 'region-pnl-region';
        regionLabel.textContent = region.label;
        const input = document.createElement('input');
        input.className = 'region-winning-input';
        input.type = 'text';
        input.inputMode = 'numeric';
        input.maxLength = 2;
        input.placeholder = '01-49';
        input.setAttribute('data-region-key', region.key);
        input.value = winningRaw;
        const status = document.createElement('span');
        status.className = 'region-pnl-status';

        const meta = document.createElement('div');
        meta.className = 'region-pnl-row-meta';

        if (parsed.error) {
            invalidCount += 1;
            status.classList.add('invalid');
            status.textContent = parsed.error;
            meta.textContent = `总注: ${formatNumericAmount(metrics.totalStake)}，请修正中奖号后再计算`;
        } else if (parsed.number === null) {
            status.classList.add('wait');
            status.textContent = '待输入中奖号';
            meta.textContent = `总注: ${formatNumericAmount(metrics.totalStake)}`;
        } else {
            computedCount += 1;
            totalStake += metrics.totalStake;
            totalPayout += metrics.payout;
            totalPnl += metrics.pnl;

            if (Math.abs(metrics.pnl) < 1e-9) {
                status.classList.add('even');
            } else if (metrics.pnl > 0) {
                status.classList.add('profit');
            } else {
                status.classList.add('loss');
            }
            status.textContent = `盈亏 ${formatSignedAmount(metrics.pnl)}`;
            meta.textContent = `总注: ${formatNumericAmount(metrics.totalStake)}，命中: ${formatNumericAmount(metrics.hitStake)}，派彩: ${formatNumericAmount(metrics.payout)}（按锚点赔率）`;
        }

        top.appendChild(regionLabel);
        top.appendChild(input);
        top.appendChild(status);
        row.appendChild(top);
        row.appendChild(meta);
        rows.appendChild(row);
    });

    saveRegionWinningNumbersPreference();
    if (computedCount === 0) {
        summary.textContent = invalidCount > 0
            ? '存在无效中奖号，请输入 01-49。'
            : '输入新奥、老奥、香港中奖号后即可计算各盘口盈亏。';
        return;
    }

    const summaryClass = Math.abs(totalPnl) < 1e-9 ? 'even' : (totalPnl > 0 ? 'profit' : 'loss');
    summary.innerHTML = `已计算 ${computedCount} 个盘口：总注 ${formatNumericAmount(totalStake)}，总派彩 ${formatNumericAmount(totalPayout)}，<span class="region-pnl-status ${summaryClass}">合计盈亏 ${formatSignedAmount(totalPnl)}</span>`;
}

// 设置事件监听器
function setupEventListeners() {
    // 监听用户数据加载完成
    ipcRenderer.on('user-data-loaded', (userData) => {
        console.log('收到用户数据:', userData);
        userManager.init(userData || {});
        renderViewRegionButtons();
        renderRecognizeRegionButtons();
        refreshRegionPnlPanel();
        refreshDashboardStatus();
    });

    // 监听保存成功
    ipcRenderer.on('save-success', () => {
        console.log('数据保存成功');
        setDashboardSaveState('saved');
    });

    // 监听保存失败
    ipcRenderer.on('save-error', (error) => {
        console.error('数据保存失败:', error);
        showError('保存失败', error.message);
        setDashboardSaveState('error', error && error.message ? error.message : '保存失败');
    });

    ipcRenderer.on('custom-attributes-loaded', (customMap) => {
        if (window.messageProcessor && typeof window.messageProcessor.setCustomAttributeMap === 'function') {
            window.messageProcessor.setCustomAttributeMap(customMap || {});
            renderAttributePicker();
            renderCustomAttributeList();
            renderAnchorAliasList();
            renderDefaultOddsState();
            renderAnchorParseModeState();
            renderAttributeCombinePolicyState();
            if (window.userManager
                && typeof window.userManager.hasIncompletePayoutData === 'function'
                && window.userManager.hasIncompletePayoutData()
            ) {
                recalculateAllUsersByRuleChange();
                if (typeof window.userManager.renderAllSections === 'function') {
                    window.userManager.renderAllSections();
                }
            }
        }
    });

    ipcRenderer.on('custom-attributes-save-error', (error) => {
        console.error('自定义属性保存失败:', error);
        showError('自定义属性保存失败', error && error.message ? error.message : '未知错误');
    });

    ipcRenderer.on('attribute-layout-loaded', (layout) => {
        try {
            applyAttributeGroupOrderObject(layout || {});
            renderAttributePicker();
        } catch (error) {
            console.warn('应用属性布局失败:', error);
        }
    });

    ipcRenderer.on('attribute-layout-save-error', (error) => {
        console.error('属性布局保存失败:', error);
    });

    ipcRenderer.on('attribute-config-loaded', (config) => {
        if (window.messageProcessor && typeof window.messageProcessor.setAttributeConfig === 'function') {
            window.messageProcessor.setAttributeConfig(config || {
                overrides: {},
                hidden: [],
                anchorAliases: {},
                globalRules: {},
                clientRules: {}
            });
            renderAttributePicker();
            renderCustomAttributeList();
            renderAnchorAliasList();
            renderDefaultOddsState();
            renderAnchorParseModeState();
            renderAttributeCombinePolicyState();
        }
    });

    ipcRenderer.on('attribute-config-save-error', (error) => {
        console.error('属性配置保存失败:', error);
        showError('属性配置保存失败', error && error.message ? error.message : '未知错误');
    });

    ipcRenderer.on('clipboard:text-changed', (payload) => {
        Promise.resolve(handleClipboardTextChanged(payload)).catch(() => {
            // ignore clipboard auto-fill failures
        });
    });

    document.addEventListener('keydown', handleRecognizeModalGlobalEnterSubmit);
}

function handleRecognizeModalGlobalEnterSubmit(event) {
    if (event.defaultPrevented) return;
    if (event.key === 'Escape' && isRecognizeModalOpen()) {
        if (isAmbiguityChoiceModalOpen()) {
            event.preventDefault();
            return;
        }
        event.preventDefault();
        closeModal();
        return;
    }
    if (event.key !== 'Enter') return;
    if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.isComposing || event.keyCode === 229) return;
    if (!isRecognizeModalOpen() || clipboardDuplicateDialogOpen) return;

    const active = document.activeElement;
    if (active) {
        const activeId = String(active.id || '');
        if (activeId === 'message') return; // textarea 内已单独处理
        if (activeId === 'customAttrName' || activeId === 'customAttrNumbers') return;
        if (activeId === 'anchorAliasToken' || activeId === 'anchorAliasMode') return;
        if (typeof active.closest === 'function' && active.closest('#editOriginalModal')) return;
        if (active.matches && active.matches('input, textarea, select, [contenteditable="true"]')) return;
    }

    event.preventDefault();
    confirmEdit();
}

// 显示错误信息
function showError(title, message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #dc3545;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
    `;
    errorDiv.innerHTML = `
        <h4>${title}</h4>
        <p>${message}</p>
        <button onclick="this.parentElement.remove()" style="background: white; color: #dc3545; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 10px;">关闭</button>
    `;
    document.body.appendChild(errorDiv);
    
    // 5秒后自动消失
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 5000);
}

// 显示成功信息
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
    `;
    successDiv.innerHTML = `
        <p>${message}</p>
        <button onclick="this.parentElement.remove()" style="background: white; color: #28a745; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 10px;">关闭</button>
    `;
    document.body.appendChild(successDiv);
    
    // 3秒后自动消失
    setTimeout(() => {
        if (successDiv.parentElement) {
            successDiv.remove();
        }
    }, 3000);
}

function extractErrorLineNumber(message) {
    const matched = String(message || '').match(/第\s*(\d+)\s*行/);
    if (!matched) return null;
    const lineNo = parseInt(matched[1], 10);
    return Number.isFinite(lineNo) && lineNo > 0 ? lineNo : null;
}

function normalizeParseIssueMessage(message) {
    return String(message || '')
        .replace(/^消息解析失败[:：]\s*/g, '')
        .trim();
}

function normalizeLineIssueReason(message) {
    const text = normalizeParseIssueMessage(message || '格式无法识别')
        .replace(/第\s*\d+\s*行/g, '')
        .replace(/^[，,\s:：]+/, '')
        .trim();
    return text || '格式无法识别';
}

function classifyParseIssue(errorMessage, context = 'preview') {
    const message = normalizeParseIssueMessage(errorMessage || '解析失败');
    const warningPatterns = /(输入不完整|号码输入不完整|存在未绑定数值|请在后面补充|消息不能为空|请输入消息内容)/;
    const severePatterns = /(无效的数字|格式无法识别|数值无效|缺少“各\/各号\/买”标记|未找到有效号码|未找到可识别的消息内容)/;

    let severity = 'blocking';
    if (context !== 'confirm' && warningPatterns.test(message) && !severePatterns.test(message)) {
        severity = 'warning';
    }

    return {
        severity,
        message,
        title: severity === 'warning' ? '识别警告' : '识别错误'
    };
}

function collectLineParseIssues(rawValue, options = {}) {
    const content = String(rawValue || '').replace(/\r/g, '');
    const sourceLines = content.split('\n');
    const clientId = options && options.clientId ? String(options.clientId) : '';
    const issues = [];
    const collectedLineNos = new Set();

    if (!content.trim() || !window.messageProcessor || typeof window.messageProcessor.previewMessage !== 'function') {
        return issues;
    }

    const working = sourceLines.map((text, sourceIndex) => ({
        text: String(text || ''),
        sourceIndex
    }));
    const maxRounds = Math.max(1, working.length * 2);

    for (let round = 0; round < maxRounds; round += 1) {
        const candidate = working.map(item => item.text).join('\n');
        if (!candidate.trim()) {
            break;
        }

        let previewResult = null;
        try {
            previewResult = window.messageProcessor.previewMessage(candidate, { clientId });
        } catch (error) {
            previewResult = {
                success: false,
                error: error && error.message ? error.message : '解析失败'
            };
        }

        if (previewResult && previewResult.success) {
            break;
        }

        const errorMessage = previewResult && previewResult.error ? previewResult.error : '解析失败';
        const relativeLineNo = extractErrorLineNumber(errorMessage);
        if (!Number.isFinite(relativeLineNo) || relativeLineNo <= 0 || relativeLineNo > working.length) {
            break;
        }

        const failedLine = working[relativeLineNo - 1];
        if (!failedLine) {
            break;
        }

        const sourceLineNo = failedLine.sourceIndex + 1;
        if (!collectedLineNos.has(sourceLineNo)) {
            collectedLineNos.add(sourceLineNo);
            issues.push({
                lineNo: sourceLineNo,
                rawText: String(sourceLines[failedLine.sourceIndex] || '').trim() || '（空行）',
                reason: normalizeLineIssueReason(errorMessage)
            });
        }

        working.splice(relativeLineNo - 1, 1);
    }

    if (!issues.length) {
        sourceLines.forEach((rawLine, index) => {
            const text = String(rawLine || '').trim();
            if (!text) return;
            const preview = window.messageProcessor.previewMessage(text, { clientId });
            if (!preview || !preview.success) {
                const reason = normalizeLineIssueReason(preview && preview.error ? preview.error : '格式无法识别');
                issues.push({
                    lineNo: index + 1,
                    rawText: text,
                    reason
                });
            }
        });
    }

    return issues;
}

function buildParseIssueHtml(issue) {
    const safeMessage = escapeHtml(issue.message || '解析失败');
    const badgeClass = issue.severity === 'warning' ? 'warning' : 'blocking';
    const safeItems = Array.isArray(issue.items) ? issue.items.filter(Boolean) : [];
    const listBlock = safeItems.length
        ? `
            <div class="parse-issue-message">共 ${safeItems.length} 条原始消息识别失败：</div>
            <ol class="parse-issue-list">
                ${safeItems.map((item) => `
                    <li class="parse-issue-item">
                        <span class="parse-issue-item-text">${escapeHtml(item.rawText || '（空行）')}</span>
                        <span>原因：${escapeHtml(item.reason || '格式无法识别')}</span>
                    </li>
                `).join('')}
            </ol>
        `
        : `<div class="parse-issue-message">${safeMessage}</div>`;

    return `
        <div class="parse-issue parse-issue-${badgeClass}">
            <div class="parse-issue-head">
                <span class="parse-issue-badge ${badgeClass}">${issue.title}</span>
            </div>
            ${listBlock}
        </div>
    `;
}

function initRecognizeIssueActions() {
    // no-op: 已改为按原始消息逐条显示错误，不再提供“行号定位”按钮。
}

function renderInlineParseError(errorMessage, options = {}) {
    const resultElement = document.getElementById('result');
    if (!resultElement) return;
    const context = options && options.context ? String(options.context) : 'preview';
    const clientId = options && options.clientId ? String(options.clientId) : getPreviewClientId();
    const issue = classifyParseIssue(errorMessage, context);
    const textarea = document.getElementById('message');
    const rawValue = textarea ? String(textarea.value || '') : '';
    const lineIssues = collectLineParseIssues(rawValue, { clientId });

    if (lineIssues.length > 0) {
        issue.items = lineIssues;
        issue.message = `${lineIssues.length} 条原始消息识别失败`;
        setMessageLineErrors(lineIssues.map(item => item.lineNo));
        setRecognizePreviewError(issue.message);
    } else {
        issue.message = normalizeLineIssueReason(issue.message);
        clearMessageLineError();
        setRecognizePreviewError(issue.message);
    }
    resultElement.innerHTML = buildParseIssueHtml(issue);
}

// 添加用户
function addUser() {
    try {
        const newUserName = document.getElementById('newUserName').value.trim();
        userManager.addUser(newUserName);
        document.getElementById('newUserName').value = '';
        showSuccess(`用户 ${newUserName} 添加成功`);
    } catch (error) {
        showError('添加用户失败', error.message);
    }
}

// 处理汇总
function handleSummary() {
    try {
        userManager.setSummaryMode(true);
        console.log('进入汇总模式');
    } catch (error) {
        showError('汇总失败', error.message);
    }
}

// 清空用户数据
function clearUserData() {
    try {
        if (userManager && typeof userManager.clearCurrentUserData === 'function') {
            const result = userManager.clearCurrentUserData();
            if (result && result.cleared) {
                showSuccess(`客户 ${result.userName} 数据已清空（偏好保留）`);
            }
            return;
        }

        const cleared = userManager && typeof userManager.clearAllUserData === 'function'
            ? userManager.clearAllUserData()
            : false;
        if (cleared) {
            clearClipboardDupLedger();
            showSuccess('所有客户数据已清空');
        }
    } catch (error) {
        showError('清空失败', error.message);
    }
}

function getMainLayoutElements() {
    const mainContent = document.querySelector('.main-content');
    const userPanel = mainContent ? mainContent.querySelector('.user-list') : null;
    const leftPanel = mainContent ? mainContent.querySelector('.left-side') : null;
    const rightPanel = mainContent ? mainContent.querySelector('.right-side') : null;
    const mainResizerUser = document.getElementById('mainResizerUser');
    const mainResizerMiddle = document.getElementById('mainResizerMiddle');
    const zodiacGrid = mainContent ? mainContent.querySelector('.zodiac-compare-grid') : null;
    const zodiacCurrentPanel = document.getElementById('section1') ? document.getElementById('section1').closest('.zodiac-panel') : null;
    const zodiacSummaryPanel = document.getElementById('section2') ? document.getElementById('section2').closest('.zodiac-panel') : null;
    const zodiacResizer = document.getElementById('zodiacResizer');
    const rightColumns = mainContent ? mainContent.querySelector('.right-columns') : null;
    const rightRankPanel = rightColumns ? rightColumns.querySelector('.right-column-rank') : null;
    const rightOriginalPanel = rightColumns ? rightColumns.querySelector('.right-column-original') : null;
    const rightColumnsResizer = document.getElementById('rightColumnsResizer');
    return {
        mainContent,
        userPanel,
        leftPanel,
        rightPanel,
        mainResizerUser,
        mainResizerMiddle,
        zodiacGrid,
        zodiacCurrentPanel,
        zodiacSummaryPanel,
        zodiacResizer,
        rightColumns,
        rightRankPanel,
        rightOriginalPanel,
        rightColumnsResizer
    };
}

function isMainSplitEnabled() {
    return window.innerWidth > MAIN_SPLIT_BREAKPOINT;
}

function getMainSplitterWidth(element, fallback = 12) {
    if (!element || typeof element.getBoundingClientRect !== 'function') return fallback;
    const width = element.getBoundingClientRect().width;
    return width > 0 ? width : fallback;
}

function readMainStoredWidth(key) {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = parseFloat(raw);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    } catch (error) {
        return null;
    }
}

function saveMainStoredWidth(key, width) {
    if (!Number.isFinite(width) || !(width > 0)) return;
    try {
        window.localStorage.setItem(key, String(Math.round(width)));
    } catch (error) {
        // ignore
    }
}

function removeMainStoredWidth(key) {
    try {
        window.localStorage.removeItem(key);
    } catch (error) {
        // ignore
    }
}

function clampMainUserWidth(width) {
    const { mainContent, mainResizerUser, mainResizerMiddle } = getMainLayoutElements();
    if (!mainContent || !Number.isFinite(width)) return null;
    const totalWidth = mainContent.clientWidth;
    if (!(totalWidth > 0)) return null;
    const splitter1 = getMainSplitterWidth(mainResizerUser, 12);
    const splitter2 = getMainSplitterWidth(mainResizerMiddle, 12);
    const minUser = window.innerWidth <= 1280 ? 220 : 240;
    const minMiddle = window.innerWidth <= 1280 ? 280 : 340;
    const minRight = window.innerWidth <= 1280 ? 500 : 560;
    const maxUser = Math.max(minUser, totalWidth - splitter1 - splitter2 - minMiddle - minRight);
    return Math.min(Math.max(width, minUser), maxUser);
}

function clampMainMiddleWidth(width) {
    const { mainContent, userPanel, mainResizerUser, mainResizerMiddle } = getMainLayoutElements();
    if (!mainContent || !userPanel || !Number.isFinite(width)) return null;
    const totalWidth = mainContent.clientWidth;
    if (!(totalWidth > 0)) return null;
    const userWidth = userPanel.getBoundingClientRect().width;
    const splitter1 = getMainSplitterWidth(mainResizerUser, 12);
    const splitter2 = getMainSplitterWidth(mainResizerMiddle, 12);
    const minMiddle = window.innerWidth <= 1280 ? 280 : 340;
    const minRight = window.innerWidth <= 1280 ? 500 : 560;
    const maxMiddle = Math.max(minMiddle, totalWidth - splitter1 - splitter2 - userWidth - minRight);
    return Math.min(Math.max(width, minMiddle), maxMiddle);
}

function clampZodiacCurrentWidth(width) {
    const { zodiacGrid, zodiacResizer } = getMainLayoutElements();
    if (!zodiacGrid || !Number.isFinite(width)) return null;
    const totalWidth = zodiacGrid.clientWidth;
    if (!(totalWidth > 0)) return null;
    const splitter = getMainSplitterWidth(zodiacResizer, 12);
    const minEach = window.innerWidth <= 1280 ? 200 : 220;
    const maxWidth = Math.max(minEach, totalWidth - splitter - minEach);
    return Math.min(Math.max(width, minEach), maxWidth);
}

function clampRightRankWidth(width) {
    const { rightColumns, rightColumnsResizer } = getMainLayoutElements();
    if (!rightColumns || !Number.isFinite(width)) return null;
    const totalWidth = rightColumns.clientWidth;
    if (!(totalWidth > 0)) return null;
    const splitter = getMainSplitterWidth(rightColumnsResizer, 12);
    const minEach = window.innerWidth <= 1280 ? 280 : 300;
    const maxWidth = Math.max(minEach, totalWidth - splitter - minEach);
    return Math.min(Math.max(width, minEach), maxWidth);
}

function applyMainUserWidth(width, options = {}) {
    const { mainContent } = getMainLayoutElements();
    if (!mainContent) return;
    if (!isMainSplitEnabled()) {
        mainContent.style.removeProperty('--main-user-width');
        return;
    }
    const clamped = clampMainUserWidth(width);
    if (!Number.isFinite(clamped)) return;
    mainContent.style.setProperty('--main-user-width', `${Math.round(clamped)}px`);
    if (options.save === true) {
        saveMainStoredWidth(MAIN_SPLIT_USER_WIDTH_KEY, clamped);
    }
}

function applyMainMiddleWidth(width, options = {}) {
    const { mainContent } = getMainLayoutElements();
    if (!mainContent) return;
    if (!isMainSplitEnabled()) {
        mainContent.style.removeProperty('--main-middle-width');
        return;
    }
    const clamped = clampMainMiddleWidth(width);
    if (!Number.isFinite(clamped)) return;
    mainContent.style.setProperty('--main-middle-width', `${Math.round(clamped)}px`);
    if (options.save === true) {
        saveMainStoredWidth(MAIN_SPLIT_MIDDLE_WIDTH_KEY, clamped);
    }
}

function applyZodiacCurrentWidth(width, options = {}) {
    const { zodiacGrid } = getMainLayoutElements();
    if (!zodiacGrid) return;
    if (!isMainSplitEnabled()) {
        zodiacGrid.style.removeProperty('--main-zodiac-current-width');
        return;
    }
    const clamped = clampZodiacCurrentWidth(width);
    if (!Number.isFinite(clamped)) return;
    zodiacGrid.style.setProperty('--main-zodiac-current-width', `${Math.round(clamped)}px`);
    if (options.save === true) {
        saveMainStoredWidth(MAIN_SPLIT_ZODIAC_CURRENT_WIDTH_KEY, clamped);
    }
}

function applyRightRankWidth(width, options = {}) {
    const { rightColumns } = getMainLayoutElements();
    if (!rightColumns) return;
    if (!isMainSplitEnabled()) {
        rightColumns.style.removeProperty('--main-right-rank-width');
        return;
    }
    const clamped = clampRightRankWidth(width);
    if (!Number.isFinite(clamped)) return;
    rightColumns.style.setProperty('--main-right-rank-width', `${Math.round(clamped)}px`);
    if (options.save === true) {
        saveMainStoredWidth(MAIN_SPLIT_RIGHT_RANK_WIDTH_KEY, clamped);
    }
}

function ensureMainLayoutWidths() {
    const {
        mainContent,
        userPanel,
        leftPanel,
        zodiacGrid,
        zodiacCurrentPanel,
        rightColumns,
        rightRankPanel
    } = getMainLayoutElements();
    if (!mainContent) return;
    if (!isMainSplitEnabled()) {
        mainContent.style.removeProperty('--main-user-width');
        mainContent.style.removeProperty('--main-middle-width');
        if (zodiacGrid) zodiacGrid.style.removeProperty('--main-zodiac-current-width');
        if (rightColumns) rightColumns.style.removeProperty('--main-right-rank-width');
        return;
    }

    const storedUser = readMainStoredWidth(MAIN_SPLIT_USER_WIDTH_KEY);
    if (Number.isFinite(storedUser)) {
        applyMainUserWidth(storedUser);
    } else if (userPanel) {
        const width = userPanel.getBoundingClientRect().width;
        if (Number.isFinite(width) && width > 0) {
            applyMainUserWidth(width);
        }
    }

    const storedMiddle = readMainStoredWidth(MAIN_SPLIT_MIDDLE_WIDTH_KEY);
    if (Number.isFinite(storedMiddle)) {
        applyMainMiddleWidth(storedMiddle);
    } else if (leftPanel) {
        const width = leftPanel.getBoundingClientRect().width;
        if (Number.isFinite(width) && width > 0) {
            applyMainMiddleWidth(width);
        }
    }

    const storedZodiac = readMainStoredWidth(MAIN_SPLIT_ZODIAC_CURRENT_WIDTH_KEY);
    if (Number.isFinite(storedZodiac)) {
        applyZodiacCurrentWidth(storedZodiac);
    } else if (zodiacCurrentPanel) {
        const width = zodiacCurrentPanel.getBoundingClientRect().width;
        if (Number.isFinite(width) && width > 0) {
            applyZodiacCurrentWidth(width);
        }
    }

    const storedRank = readMainStoredWidth(MAIN_SPLIT_RIGHT_RANK_WIDTH_KEY);
    if (Number.isFinite(storedRank)) {
        applyRightRankWidth(storedRank);
    } else if (rightRankPanel) {
        const width = rightRankPanel.getBoundingClientRect().width;
        if (Number.isFinite(width) && width > 0) {
            applyRightRankWidth(width);
        }
    }
}

function bindMainSplitResizer(config = {}) {
    const resizer = config.resizer;
    const container = config.container;
    const getWidth = typeof config.getWidth === 'function' ? config.getWidth : null;
    const applyWidth = typeof config.applyWidth === 'function' ? config.applyWidth : null;
    const storageKey = String(config.storageKey || '').trim();
    const reset = typeof config.reset === 'function' ? config.reset : null;
    if (!resizer || !container || !getWidth || !applyWidth || !storageKey) return;
    if (resizer.dataset.bound === '1') return;
    resizer.dataset.bound = '1';

    const dragState = {
        active: false,
        pointerId: null,
        startX: 0,
        startWidth: 0
    };

    const stopDrag = (event = null) => {
        if (!dragState.active) return;
        if (event && event.pointerId != null && dragState.pointerId != null && event.pointerId !== dragState.pointerId) {
            return;
        }
        dragState.active = false;
        dragState.pointerId = null;
        container.classList.remove('resizing');
        const finalWidth = getWidth();
        if (Number.isFinite(finalWidth) && finalWidth > 0) {
            applyWidth(finalWidth, { save: true });
        }
    };

    resizer.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || !isMainSplitEnabled()) return;
        event.preventDefault();
        const width = getWidth();
        if (!(width > 0)) return;
        dragState.active = true;
        dragState.pointerId = event.pointerId;
        dragState.startX = event.clientX;
        dragState.startWidth = width;
        container.classList.add('resizing');
        if (typeof resizer.setPointerCapture === 'function') {
            try {
                resizer.setPointerCapture(event.pointerId);
            } catch (error) {
                // ignore
            }
        }
    });

    resizer.addEventListener('pointermove', (event) => {
        if (!dragState.active || dragState.pointerId !== event.pointerId) return;
        const delta = event.clientX - dragState.startX;
        applyWidth(dragState.startWidth + delta);
    });

    resizer.addEventListener('pointerup', stopDrag);
    resizer.addEventListener('pointercancel', stopDrag);
    resizer.addEventListener('lostpointercapture', stopDrag);

    resizer.addEventListener('dblclick', () => {
        if (typeof reset === 'function') {
            reset();
        }
        removeMainStoredWidth(storageKey);
        ensureMainLayoutWidths();
    });
}

function initMainLayoutResizers() {
    const {
        mainContent,
        userPanel,
        leftPanel,
        mainResizerUser,
        mainResizerMiddle,
        zodiacGrid,
        zodiacCurrentPanel,
        zodiacResizer,
        rightColumns,
        rightRankPanel,
        rightColumnsResizer
    } = getMainLayoutElements();
    if (!mainContent) return;

    bindMainSplitResizer({
        resizer: mainResizerUser,
        container: mainContent,
        getWidth: () => (userPanel ? userPanel.getBoundingClientRect().width : 0),
        applyWidth: applyMainUserWidth,
        storageKey: MAIN_SPLIT_USER_WIDTH_KEY,
        reset: () => {
            mainContent.style.removeProperty('--main-user-width');
        }
    });

    bindMainSplitResizer({
        resizer: mainResizerMiddle,
        container: mainContent,
        getWidth: () => (leftPanel ? leftPanel.getBoundingClientRect().width : 0),
        applyWidth: applyMainMiddleWidth,
        storageKey: MAIN_SPLIT_MIDDLE_WIDTH_KEY,
        reset: () => {
            mainContent.style.removeProperty('--main-middle-width');
        }
    });

    bindMainSplitResizer({
        resizer: zodiacResizer,
        container: zodiacGrid,
        getWidth: () => (zodiacCurrentPanel ? zodiacCurrentPanel.getBoundingClientRect().width : 0),
        applyWidth: applyZodiacCurrentWidth,
        storageKey: MAIN_SPLIT_ZODIAC_CURRENT_WIDTH_KEY,
        reset: () => {
            if (zodiacGrid) zodiacGrid.style.removeProperty('--main-zodiac-current-width');
        }
    });

    bindMainSplitResizer({
        resizer: rightColumnsResizer,
        container: rightColumns,
        getWidth: () => (rightRankPanel ? rightRankPanel.getBoundingClientRect().width : 0),
        applyWidth: applyRightRankWidth,
        storageKey: MAIN_SPLIT_RIGHT_RANK_WIDTH_KEY,
        reset: () => {
            if (rightColumns) rightColumns.style.removeProperty('--main-right-rank-width');
        }
    });

    requestAnimationFrame(() => {
        ensureMainLayoutWidths();
    });
}

function getRecognizeLayoutElements() {
    const modal = document.getElementById('myModal');
    const layout = modal ? modal.querySelector('.recognize-layout') : null;
    const leftPanel = modal ? modal.querySelector('.recognize-left-panel') : null;
    const previewPanel = modal ? modal.querySelector('.recognize-preview-column') : null;
    const attrPanel = document.getElementById('attributeHelpPanel');
    const resizer = document.getElementById('recognizeResizer');
    const attrResizer = document.getElementById('recognizeAttrResizer');
    return {
        modal,
        layout,
        leftPanel,
        previewPanel,
        attrPanel,
        resizer,
        attrResizer
    };
}

function isRecognizeSplitEnabled() {
    return window.innerWidth > RECOGNIZE_SPLIT_MOBILE_BREAKPOINT;
}

function getRecognizeSplitterWidth(element, fallback = 12) {
    if (!element || typeof element.getBoundingClientRect !== 'function') return fallback;
    const width = element.getBoundingClientRect().width;
    return width > 0 ? width : fallback;
}

function getRecognizeSplitMinLeft() {
    return window.innerWidth <= 1280 ? RECOGNIZE_SPLIT_MIN_LEFT_COMPACT : RECOGNIZE_SPLIT_MIN_LEFT_DESKTOP;
}

function getRecognizePreviewMinWidth() {
    return window.innerWidth <= 1280 ? RECOGNIZE_SPLIT_MIN_RIGHT_COMPACT : RECOGNIZE_SPLIT_MIN_RIGHT_DESKTOP;
}

function getRecognizeAttrDefaultWidth() {
    return window.innerWidth <= 1280 ? RECOGNIZE_ATTR_DOCK_WIDTH_COMPACT : RECOGNIZE_ATTR_DOCK_WIDTH_DESKTOP;
}

function getRecognizeAttrMinWidth() {
    return window.innerWidth <= 1280 ? RECOGNIZE_ATTR_MIN_WIDTH_COMPACT : RECOGNIZE_ATTR_MIN_WIDTH_DESKTOP;
}

function getRecognizeAttrMaxWidth() {
    return window.innerWidth <= 1280 ? RECOGNIZE_ATTR_MAX_WIDTH_COMPACT : RECOGNIZE_ATTR_MAX_WIDTH_DESKTOP;
}

function getRecognizeCurrentAttrWidth() {
    const { layout, attrPanel } = getRecognizeLayoutElements();
    if (!layout) return getRecognizeAttrDefaultWidth();
    const cssValue = parseFloat(layout.style.getPropertyValue('--recognize-attr-width') || '');
    if (Number.isFinite(cssValue) && cssValue > 0) {
        return cssValue;
    }
    const panelWidth = attrPanel && typeof attrPanel.getBoundingClientRect === 'function'
        ? attrPanel.getBoundingClientRect().width
        : 0;
    if (Number.isFinite(panelWidth) && panelWidth > 0) {
        return panelWidth;
    }
    return getRecognizeAttrDefaultWidth();
}

function getRecognizeSplitMinRight() {
    const baseMinRight = getRecognizePreviewMinWidth();
    if (!recognizeAttributePanelVisible) {
        return baseMinRight;
    }
    const { attrResizer } = getRecognizeLayoutElements();
    const attrWidth = getRecognizeCurrentAttrWidth();
    const attrSplitterWidth = getRecognizeSplitterWidth(attrResizer, 12);
    return baseMinRight + attrSplitterWidth + attrWidth;
}

function readRecognizeStoredWidth() {
    try {
        const raw = window.localStorage.getItem(RECOGNIZE_SPLIT_WIDTH_KEY);
        if (!raw) return null;
        const parsed = parseFloat(raw);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    } catch (error) {
        return null;
    }
}

function readRecognizeStoredAttrWidth() {
    try {
        const raw = window.localStorage.getItem(RECOGNIZE_ATTR_SPLIT_WIDTH_KEY);
        if (!raw) return null;
        const parsed = parseFloat(raw);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    } catch (error) {
        return null;
    }
}

function clampRecognizeSplitWidth(leftWidth) {
    const { layout, resizer } = getRecognizeLayoutElements();
    if (!layout || !Number.isFinite(leftWidth)) return null;
    const totalWidth = layout.clientWidth;
    if (!(totalWidth > 0)) return null;
    const minLeft = getRecognizeSplitMinLeft();
    const minRight = getRecognizeSplitMinRight();
    const splitterWidth = getRecognizeSplitterWidth(resizer, 12);
    const maxLeft = Math.max(minLeft, totalWidth - splitterWidth - minRight);
    return Math.min(Math.max(leftWidth, minLeft), maxLeft);
}

function clampRecognizeAttrWidth(attrWidth) {
    const { layout, leftPanel, resizer, attrResizer } = getRecognizeLayoutElements();
    if (!layout || !Number.isFinite(attrWidth)) return null;
    const totalWidth = layout.clientWidth;
    if (!(totalWidth > 0)) return null;

    const minAttr = getRecognizeAttrMinWidth();
    const attrCap = getRecognizeAttrMaxWidth();
    const previewMin = getRecognizePreviewMinWidth();
    const leftWidth = leftPanel && typeof leftPanel.getBoundingClientRect === 'function'
        ? leftPanel.getBoundingClientRect().width
        : getRecognizeSplitMinLeft();
    const splitter1Width = getRecognizeSplitterWidth(resizer, 12);
    const splitter2Width = getRecognizeSplitterWidth(attrResizer, 12);
    const availableForAttr = totalWidth - leftWidth - splitter1Width - splitter2Width - previewMin;
    const maxAttrByLayout = Math.max(minAttr, availableForAttr);
    const maxAttr = Math.min(attrCap, maxAttrByLayout);
    return Math.min(Math.max(attrWidth, minAttr), maxAttr);
}

function applyRecognizeSplitWidth(leftWidth, options = {}) {
    const save = !!(options && options.save);
    const { layout } = getRecognizeLayoutElements();
    if (!layout) return;
    if (!isRecognizeSplitEnabled()) {
        layout.style.removeProperty('--recognize-left-width');
        return;
    }
    const clamped = clampRecognizeSplitWidth(leftWidth);
    if (!Number.isFinite(clamped)) return;
    const rounded = Math.round(clamped);
    layout.style.setProperty('--recognize-left-width', `${rounded}px`);
    if (save) {
        try {
            window.localStorage.setItem(RECOGNIZE_SPLIT_WIDTH_KEY, String(rounded));
        } catch (error) {
            // ignore
        }
    }
}

function applyRecognizeAttrWidth(attrWidth, options = {}) {
    const save = !!(options && options.save);
    const { layout } = getRecognizeLayoutElements();
    if (!layout) return;
    if (!isRecognizeSplitEnabled() || !recognizeAttributePanelVisible) {
        layout.style.removeProperty('--recognize-attr-width');
        return;
    }
    const clamped = clampRecognizeAttrWidth(attrWidth);
    if (!Number.isFinite(clamped)) return;
    const rounded = Math.round(clamped);
    layout.style.setProperty('--recognize-attr-width', `${rounded}px`);
    if (save) {
        try {
            window.localStorage.setItem(RECOGNIZE_ATTR_SPLIT_WIDTH_KEY, String(rounded));
        } catch (error) {
            // ignore
        }
    }
}

function ensureRecognizeSplitWidth() {
    const { modal, layout, leftPanel } = getRecognizeLayoutElements();
    if (!modal || !layout || !leftPanel) return;
    if (modal.style.display !== 'block') return;
    if (!isRecognizeSplitEnabled()) {
        layout.style.removeProperty('--recognize-left-width');
        return;
    }
    const stored = readRecognizeStoredWidth();
    if (Number.isFinite(stored)) {
        applyRecognizeSplitWidth(stored);
        return;
    }
    const currentWidth = leftPanel.getBoundingClientRect().width;
    if (Number.isFinite(currentWidth) && currentWidth > 0) {
        applyRecognizeSplitWidth(currentWidth);
    }
}

function ensureRecognizeAttrWidth() {
    const { modal, layout, attrPanel } = getRecognizeLayoutElements();
    if (!modal || !layout) return;
    if (modal.style.display !== 'block') return;
    if (!isRecognizeSplitEnabled() || !recognizeAttributePanelVisible) {
        layout.style.removeProperty('--recognize-attr-width');
        return;
    }
    const stored = readRecognizeStoredAttrWidth();
    if (Number.isFinite(stored)) {
        applyRecognizeAttrWidth(stored);
        return;
    }
    const currentWidth = attrPanel && typeof attrPanel.getBoundingClientRect === 'function'
        ? attrPanel.getBoundingClientRect().width
        : 0;
    if (Number.isFinite(currentWidth) && currentWidth > 0) {
        applyRecognizeAttrWidth(currentWidth);
        return;
    }
    applyRecognizeAttrWidth(getRecognizeAttrDefaultWidth());
}

function initRecognizeLayoutResizer() {
    const { layout, leftPanel, resizer } = getRecognizeLayoutElements();
    if (!layout || !leftPanel || !resizer || resizer.dataset.bound === '1') return;
    resizer.dataset.bound = '1';

    const dragState = {
        active: false,
        pointerId: null,
        startX: 0,
        startWidth: 0
    };

    const stopDrag = (event = null) => {
        if (!dragState.active) return;
        if (event && event.pointerId != null && dragState.pointerId != null && event.pointerId !== dragState.pointerId) {
            return;
        }
        dragState.active = false;
        dragState.pointerId = null;
        layout.classList.remove('resizing');
        const finalWidth = leftPanel.getBoundingClientRect().width;
        if (Number.isFinite(finalWidth) && finalWidth > 0) {
            applyRecognizeSplitWidth(finalWidth, { save: true });
        }
    };

    resizer.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !isRecognizeSplitEnabled()) return;
        event.preventDefault();
        const width = leftPanel.getBoundingClientRect().width;
        if (!(width > 0)) return;
        dragState.active = true;
        dragState.pointerId = event.pointerId;
        dragState.startX = event.clientX;
        dragState.startWidth = width;
        layout.classList.add('resizing');
        if (typeof resizer.setPointerCapture === 'function') {
            try {
                resizer.setPointerCapture(event.pointerId);
            } catch (error) {
                // ignore
            }
        }
    });

    resizer.addEventListener('pointermove', event => {
        if (!dragState.active || dragState.pointerId !== event.pointerId) return;
        const delta = event.clientX - dragState.startX;
        const nextWidth = dragState.startWidth + delta;
        applyRecognizeSplitWidth(nextWidth);
    });

    resizer.addEventListener('pointerup', stopDrag);
    resizer.addEventListener('pointercancel', stopDrag);
    resizer.addEventListener('lostpointercapture', stopDrag);

    resizer.addEventListener('dblclick', () => {
        const { layout: currentLayout } = getRecognizeLayoutElements();
        if (!currentLayout) return;
        currentLayout.style.removeProperty('--recognize-left-width');
        try {
            window.localStorage.removeItem(RECOGNIZE_SPLIT_WIDTH_KEY);
        } catch (error) {
            // ignore
        }
        requestAnimationFrame(() => {
            ensureRecognizeSplitWidth();
        });
    });
}

function initRecognizeAttributeDockResizer() {
    const { layout, attrPanel, attrResizer } = getRecognizeLayoutElements();
    if (!layout || !attrPanel || !attrResizer || attrResizer.dataset.bound === '1') return;
    attrResizer.dataset.bound = '1';

    const dragState = {
        active: false,
        pointerId: null,
        startX: 0,
        startWidth: 0
    };

    const stopDrag = (event = null) => {
        if (!dragState.active) return;
        if (event && event.pointerId != null && dragState.pointerId != null && event.pointerId !== dragState.pointerId) {
            return;
        }
        dragState.active = false;
        dragState.pointerId = null;
        layout.classList.remove('resizing');
        const finalWidth = attrPanel.getBoundingClientRect().width;
        if (Number.isFinite(finalWidth) && finalWidth > 0) {
            applyRecognizeAttrWidth(finalWidth, { save: true });
            ensureRecognizeSplitWidth();
        }
    };

    attrResizer.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !isRecognizeSplitEnabled() || !recognizeAttributePanelVisible) return;
        event.preventDefault();
        const width = attrPanel.getBoundingClientRect().width;
        if (!(width > 0)) return;
        dragState.active = true;
        dragState.pointerId = event.pointerId;
        dragState.startX = event.clientX;
        dragState.startWidth = width;
        layout.classList.add('resizing');
        if (typeof attrResizer.setPointerCapture === 'function') {
            try {
                attrResizer.setPointerCapture(event.pointerId);
            } catch (error) {
                // ignore
            }
        }
    });

    attrResizer.addEventListener('pointermove', event => {
        if (!dragState.active || dragState.pointerId !== event.pointerId) return;
        const delta = event.clientX - dragState.startX;
        const nextWidth = dragState.startWidth - delta;
        applyRecognizeAttrWidth(nextWidth);
        ensureRecognizeSplitWidth();
    });

    attrResizer.addEventListener('pointerup', stopDrag);
    attrResizer.addEventListener('pointercancel', stopDrag);
    attrResizer.addEventListener('lostpointercapture', stopDrag);

    attrResizer.addEventListener('dblclick', () => {
        const { layout: currentLayout } = getRecognizeLayoutElements();
        if (!currentLayout) return;
        currentLayout.style.removeProperty('--recognize-attr-width');
        try {
            window.localStorage.removeItem(RECOGNIZE_ATTR_SPLIT_WIDTH_KEY);
        } catch (error) {
            // ignore
        }
        requestAnimationFrame(() => {
            ensureRecognizeAttrWidth();
            ensureRecognizeSplitWidth();
        });
    });
}

function readRecognizeAttributePanelVisible() {
    try {
        const raw = window.localStorage.getItem(RECOGNIZE_ATTRIBUTE_PANEL_VISIBLE_KEY);
        if (raw == null) return true;
        return raw === '1';
    } catch (error) {
        return true;
    }
}

function applyRecognizeAttributePanelVisible(visible, options = {}) {
    const persist = !!(options && options.persist);
    recognizeAttributePanelVisible = !!visible;
    const { layout } = getRecognizeLayoutElements();
    if (layout) {
        layout.classList.toggle('attr-panel-hidden', !recognizeAttributePanelVisible);
        layout.classList.toggle('attr-panel-visible', recognizeAttributePanelVisible);
    }
    const toggleBtn = document.getElementById('toggleAttributePanelBtn');
    if (toggleBtn) {
        toggleBtn.textContent = recognizeAttributePanelVisible ? '隐藏属性面板' : '显示属性面板';
    }
    if (persist) {
        try {
            window.localStorage.setItem(RECOGNIZE_ATTRIBUTE_PANEL_VISIBLE_KEY, recognizeAttributePanelVisible ? '1' : '0');
        } catch (error) {
            // ignore
        }
    }
    requestAnimationFrame(() => {
        ensureRecognizeAttrWidth();
        ensureRecognizeSplitWidth();
        if (recognizeAttributePanelVisible) {
            renderAttributePicker();
        }
    });
}

function initRecognizeAttributePanelToggle() {
    const stored = readRecognizeAttributePanelVisible();
    applyRecognizeAttributePanelVisible(stored);
}

function toggleRecognizeAttributePanel() {
    applyRecognizeAttributePanelVisible(!recognizeAttributePanelVisible, { persist: true });
}

function loadRecognizeSideGroupState() {
    try {
        const raw = window.localStorage.getItem(RECOGNIZE_SIDE_GROUP_STATE_KEY);
        if (!raw) return { attributes: true, anchors: false };
        const parsed = JSON.parse(raw);
        const normalized = {
            attributes: parsed && parsed.attributes !== false,
            anchors: parsed && parsed.anchors === true
        };
        if (normalized.attributes && normalized.anchors) {
            normalized.anchors = false;
        }
        return normalized;
    } catch (error) {
        return { attributes: true, anchors: false };
    }
}

function saveRecognizeSideGroupState() {
    try {
        window.localStorage.setItem(RECOGNIZE_SIDE_GROUP_STATE_KEY, JSON.stringify(recognizeSideGroupState));
    } catch (error) {
        // ignore
    }
}

function applyRecognizeSideGroups() {
    const mappings = [
        { key: 'attributes', rootId: 'recognizeGroupAttributes', toggleId: 'recognizeGroupAttributesToggle' },
        { key: 'anchors', rootId: 'recognizeGroupAnchors', toggleId: 'recognizeGroupAnchorsToggle' }
    ];
    const expandedKeys = mappings
        .filter(({ key }) => recognizeSideGroupState[key] !== false)
        .map(({ key }) => key);
    const hasSingleExpanded = expandedKeys.length === 1;
    mappings.forEach(({ key, rootId, toggleId }) => {
        const root = document.getElementById(rootId);
        const toggle = document.getElementById(toggleId);
        if (!root || !toggle) return;
        const expanded = recognizeSideGroupState[key] !== false;
        root.classList.toggle('collapsed', !expanded);
        root.classList.toggle('expanded-fill', expanded && hasSingleExpanded);
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
}

function initRecognizeSideGroups() {
    recognizeSideGroupState = loadRecognizeSideGroupState();
    applyRecognizeSideGroups();
}

function toggleRecognizeSideGroup(groupKey) {
    if (groupKey !== 'attributes' && groupKey !== 'anchors') return;
    const currentlyExpanded = recognizeSideGroupState[groupKey] !== false;
    if (currentlyExpanded) {
        recognizeSideGroupState[groupKey] = false;
    } else {
        recognizeSideGroupState[groupKey] = true;
        const otherKey = groupKey === 'attributes' ? 'anchors' : 'attributes';
        recognizeSideGroupState[otherKey] = false;
    }
    applyRecognizeSideGroups();
    saveRecognizeSideGroupState();
}

function syncRecognizeModalActionMode() {
    const confirmBtn = document.getElementById('recognizeConfirmBtn');
    const clearBtn = document.getElementById('recognizeClearBtn');
    if (confirmBtn) {
        confirmBtn.textContent = recognizeEditContext ? '确定' : '添加';
    }
    if (clearBtn) {
        clearBtn.textContent = recognizeEditContext ? '取消' : '清空输入';
    }
}

function clearRecognizeEditContext() {
    recognizeEditContext = null;
    syncRecognizeModalActionMode();
}

function openOriginalDataEditInRecognize(payload = {}) {
    const context = payload && typeof payload === 'object' ? payload : {};
    const userName = String(context.userName || '').trim();
    const regionKey = String(context.regionKey || '').trim() || 'new_ao';
    const message = String(context.message || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const index = Number.isInteger(context.index) ? context.index : parseInt(context.index, 10);

    if (!userName || !Number.isInteger(index) || index < 0) {
        showError('编辑失败', '原始消息定位参数无效');
        return;
    }

    openModal('recognize', { keepActiveRegion: true });
    recognizeEditContext = { userName, regionKey, index };
    syncRecognizeModalActionMode();

    if (window.userManager && typeof window.userManager.setActiveRegion === 'function') {
        window.userManager.setActiveRegion(regionKey);
    }
    renderRecognizeRegionButtons();

    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle && window.userManager && typeof window.userManager.getRegionLabel === 'function') {
        modalTitle.textContent = `编辑原始消息：${userName}（${window.userManager.getRegionLabel(regionKey)}）`;
    } else if (modalTitle) {
        modalTitle.textContent = `编辑原始消息：${userName}`;
    }

    const messageTextarea = document.getElementById('message');
    if (messageTextarea) {
        messageTextarea.value = message;
        syncRecognizeMessageAutoHeight();
        messageTextarea.focus();
        messageTextarea.setSelectionRange(messageTextarea.value.length, messageTextarea.value.length);
    }
    clearMessageLineError();
    renderMessageLineNumbers();
    previewMessage({ silent: true });
    stopRecognizeClipboardMonitor();
    updateClipboardAssistBanner(false);
}

// 打开模态框
function openModal(modalType, options = {}) {
    const modal = document.getElementById('myModal');
    const modalTitle = document.getElementById('modalTitle');
    const messageTextarea = document.getElementById('message');
    const resultElement = document.getElementById('result');
    if (modalType === 'recognize') {
        clearRecognizeEditContext();
        const selectedUsers = window.userManager && typeof window.userManager.getSelectedUsers === 'function'
            ? window.userManager.getSelectedUsers()
            : [];
        const userLabel = selectedUsers.length > 0 ? selectedUsers.join('，') : '未选择客户';
        modalTitle.textContent = `${userLabel}: 输入消息自动解析`;
        messageTextarea.placeholder = '可直接在微信复制，或手动输入；输入后会自动解析预览';
        if (!options.keepActiveRegion && window.userManager && typeof window.userManager.setActiveRegion === 'function') {
            window.userManager.setActiveRegion('new_ao');
        }
        renderRecognizeRegionButtons();
        applyRecognizeAttributePanelVisible(recognizeAttributePanelVisible);
        resetRecognizeModalState();
        syncRecognizeModalActionMode();
    }

    modal.style.display = 'block';
    if (modalType === 'recognize') {
        syncPlanCapabilityUI();
        refreshClipboardMonitorState();
        ensureAnchorGuideVisibleWhenRecognizeOpen();
        requestAnimationFrame(() => {
            ensureRecognizeAttrWidth();
            ensureRecognizeSplitWidth();
            syncRecognizeMessageAutoHeight();
            renderAttributePicker();
        });
    }
}

// 关闭模态框
function closeModal() {
    const modal = document.getElementById('myModal');
    modal.style.display = 'none';
    stopRecognizeClipboardMonitor();
    resetRecognizeModalState();
    setRecognizePreviewError('');
    clearRecognizeEditContext();
}

function renderCompareCellValue(value, fallbackText, extraClass = '') {
    const rawText = value == null ? '' : String(value);
    const hasContent = rawText.trim().length > 0;
    const safeText = escapeHtml(hasContent ? rawText : fallbackText).replace(/\n/g, '<br>');
    const cls = hasContent
        ? `recognize-compare-cell-value ${extraClass}`.trim()
        : `recognize-compare-cell-value empty ${extraClass}`.trim();
    return `<div class="${cls}">${safeText}</div>`;
}

function formatRecognizePreviewEntryCore(entry) {
    if (!entry || typeof entry !== 'object') return '';
    const numbers = Array.isArray(entry.numbers)
        ? entry.numbers
            .map(item => String(item && item.number != null ? item.number : '').trim())
            .filter(Boolean)
        : [];
    const amountText = formatNumericAmount(entry.amount);
    if (numbers.length > 0 && amountText !== '--') {
        return `${numbers.join('.')}各${amountText}`;
    }
    const canonical = String(entry.canonical || '').trim();
    if (!canonical) return '';
    return canonical.replace(/^(新奥|老奥|香港)\s*/u, '');
}

function renderCompareStandardEntries(entries, emptyText = '（本行未识别到可用投注）') {
    const safeEntries = Array.isArray(entries) ? entries.filter(Boolean) : [];
    if (!safeEntries.length) {
        return renderCompareCellValue('', emptyText, 'standard');
    }
    const itemsHtml = safeEntries.map((entry) => {
        const coreText = formatRecognizePreviewEntryCore(entry);
        const regionText = String(entry.regionLabel || '新奥').trim() || '新奥';
        return `
            <div class="recognize-standard-item">
                <span class="recognize-standard-text">${escapeHtml(coreText || '（无法生成标准格式）')}</span>
                <span class="recognize-region-tag">${escapeHtml(regionText)}</span>
            </div>
        `;
    }).join('');
    return `<div class="recognize-compare-cell-value standard">${itemsHtml}</div>`;
}

function buildRecognizePreviewHtml(previewResult, rawValue) {
    if (!previewResult || !previewResult.success || !previewResult.result) {
        const errorText = previewResult && previewResult.error ? previewResult.error : '解析失败';
        return `<div class="inline-parse-error">错误：${escapeHtml(errorText)}</div>`;
    }

    const result = previewResult.result || {};
    const entries = Array.isArray(result.entries) ? result.entries : [];
    // 解析器 lineNo 按“输入真实行号”编号（含空白行）；核对表按真实行号映射，
    // 但跳过“空白且无解析结果”的行，兼顾准确定位与阅读密度。
    const rawLines = String(rawValue || '')
        .replace(/\r/g, '')
        .split('\n');
    const lineRows = rawLines.map((lineText, index) => ({
        lineNo: index + 1,
        rawLine: String(lineText || ''),
        displayLine: String(lineText || '').trim(),
        entries: []
    }));
    const floatingEntries = [];

    entries.forEach((entry) => {
        if (!entry) return;
        if (!formatRecognizePreviewEntryCore(entry)) return;
        const lineNo = Number.parseInt(entry.lineNo, 10);
        if (Number.isFinite(lineNo) && lineNo > 0 && lineNo <= lineRows.length) {
            lineRows[lineNo - 1].entries.push(entry);
            return;
        }
        floatingEntries.push(entry);
    });

    const rows = [];

    lineRows.forEach((lineRow) => {
        if (!lineRow.displayLine && !lineRow.entries.length) {
            return;
        }
        rows.push(`
            <div class="recognize-compare-row">
                <div class="recognize-compare-cell">
                    ${renderCompareCellValue(lineRow.displayLine, '（空行）')}
                </div>
                <div class="recognize-compare-cell">
                    ${renderCompareStandardEntries(lineRow.entries)}
                </div>
            </div>
        `);
    });

    if (floatingEntries.length) {
        rows.push(`
            <div class="recognize-compare-row">
                <div class="recognize-compare-cell">
                    ${renderCompareCellValue('（未定位段）', '（无法定位到单行）')}
                </div>
                <div class="recognize-compare-cell">
                    ${renderCompareStandardEntries(floatingEntries, '（无）')}
                </div>
            </div>
        `);
    }

    const listBlock = rows.length
        ? `
            <div class="recognize-compare-table-head">
                <div class="recognize-compare-head-cell">原始消息</div>
                <div class="recognize-compare-head-cell">标准格式</div>
            </div>
            <div class="recognize-compare-list">${rows.join('')}</div>
        `
        : '<div class="recognize-compare-empty">暂无可核对的数据，请继续输入消息。</div>';
    return `<div class="recognize-compare-table">${listBlock}</div>`;
}

// 预览消息
async function previewMessage(options = {}) {
    const silent = !!(options && options.silent);
    const realtime = !!(options && options.realtime);
    try {
        const messageTextarea = document.getElementById('message');
        const resultElement = document.getElementById('result');
        const rawValue = messageTextarea ? String(messageTextarea.value || '') : '';
        if (!rawValue.trim()) {
            if (resultElement) {
                resultElement.innerHTML = '';
            }
            setRecognizePreviewError('');
            clearMessageLineError();
            return;
        }

        const message = normalizeMessageBeforeSubmit(rawValue);
        if (!message) {
            if (resultElement) {
                resultElement.innerHTML = '';
            }
            setRecognizePreviewError('');
            clearMessageLineError();
            if (!silent) {
                showError('预览失败', '请输入消息内容');
            }
            return;
        }

        const previewClientId = getPreviewClientId();
        const resolved = await resolveMessageAmbiguityFlow(message, previewClientId, {
            interactive: !realtime,
            updateTextarea: !realtime
        });
        const previewResult = resolved && resolved.previewResult ? resolved.previewResult : null;
        const previewMessageText = resolved && typeof resolved.message === 'string'
            ? resolved.message
            : message;
        if (!previewResult || !previewResult.success) {
            const errorMessage = previewResult && previewResult.error ? previewResult.error : '解析失败';
            if (isAmbiguityResult(previewResult) && realtime) {
                return;
            }
            const shouldSuppressRealtime = realtime && /(输入不完整|请输入消息内容)/.test(errorMessage);
            if (shouldSuppressRealtime) {
                return;
            }
            renderInlineParseError(errorMessage, { context: 'preview', clientId: previewClientId });
            if (!silent) {
                showError('预览失败', errorMessage);
            }
            return;
        }
        if (resultElement) {
            resultElement.innerHTML = buildRecognizePreviewHtml(previewResult, previewMessageText);
        }
        setRecognizePreviewError('');
        clearMessageLineError();
    } catch (error) {
        const message = error && error.message ? error.message : '解析失败';
        // 实时输入中对“输入不完整”类错误不打断、不刷红错误。
        const shouldSuppressRealtime = realtime && /(输入不完整|请输入消息内容)/.test(message);
        if (shouldSuppressRealtime) {
            return;
        }
        renderInlineParseError(message, { context: 'preview', clientId: getPreviewClientId() });
        if (!silent) {
            showError('预览失败', error.message);
        }
    }
}

// 确认编辑
async function confirmEdit() {
    try {
        const messageTextarea = document.getElementById('message');
        const rawInputMessage = messageTextarea
            ? String(messageTextarea.value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
            : '';
        let message = normalizeMessageBeforeSubmit(rawInputMessage);
        if (recognizeEditContext) {
            if (!message) {
                showError('确认失败', '请输入消息内容');
                return;
            }
            if (!window.userManager || typeof window.userManager.applyEditedOriginalData !== 'function') {
                throw new Error('当前版本不支持原始消息快捷编辑');
            }

            const { userName, index, regionKey } = recognizeEditContext;
            window.userManager.applyEditedOriginalData(userName, index, regionKey, rawInputMessage);
            renderViewRegionButtons();
            closeModal();
            const regionLabel = window.userManager.getRegionLabel ? window.userManager.getRegionLabel(regionKey) : regionKey;
            showSuccess(`消息修改成功：${userName}（${regionLabel}）`);
            return;
        }

        const selectedUsers = typeof userManager.getSelectedUsers === 'function'
            ? userManager.getSelectedUsers()
            : [userManager.getCurrentUser()].filter(Boolean);
        
        if (!selectedUsers.length) {
            showError('确认失败', '请先选择至少一个用户');
            return;
        }

        if (!message) {
            showError('确认失败', '请输入消息内容');
            return;
        }

        let totalAdded = 0;
        for (const userName of selectedUsers) {
            const resolved = await resolveMessageAmbiguityFlow(message, userName, {
                interactive: true,
                updateTextarea: true
            });
            const previewResult = resolved && resolved.previewResult ? resolved.previewResult : null;
            if (!previewResult || !previewResult.success) {
                const errorMessage = previewResult && previewResult.error ? previewResult.error : '解析失败';
                renderInlineParseError(errorMessage, { context: 'confirm', clientId: userName });
                showError('处理失败', `${userName}: ${errorMessage}`);
                return;
            }
            message = resolved.message;

            const originalMessageForStorage = messageTextarea
                ? String(messageTextarea.value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
                : String(message || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            const result = messageProcessor.processMessageForUser(message, userName, {
                clientId: userName,
                originalMessage: originalMessageForStorage
            });
            if (!result.success) {
                renderInlineParseError(result.message, { context: 'confirm', clientId: userName });
                showError('处理失败', `${userName}: ${result.message}`);
                return;
            }
            totalAdded += result.totalAdded || 0;
        }

        const regionKeys = extractRegionKeysForDuplicate(message);
        markMessageRecordedForToday(message, selectedUsers, regionKeys);

        userManager.renderAllSections();
        renderViewRegionButtons();
        const resultElement = document.getElementById('result');
        if (messageTextarea) {
            messageTextarea.value = '';
            syncRecognizeMessageAutoHeight();
            messageTextarea.focus();
        }
        if (resultElement) {
            resultElement.innerHTML = '';
        }
        setRecognizePreviewError('');
        clearMessageLineError();
        renderMessageLineNumbers();
        showSuccess(`消息处理成功，已添加到 ${selectedUsers.length} 位客户，总数: ${totalAdded}`);
    } catch (error) {
        if (error && error.message) {
            renderInlineParseError(error.message, { context: 'confirm', clientId: getPreviewClientId() });
        }
        showError('确认失败', error.message);
    }
}

// 复制客户端数据
function copyClientData() {
    try {
        const scoped = collectCurrentLotteryScopeData();
        if (!scoped.ok) {
            showError('复制失败', scoped.reason || '当前范围无可复制数据');
            return;
        }

        const copyContent = generateCopyContent(scoped.scopeData);
        navigator.clipboard.writeText(copyContent).then(() => {
            showSuccess('数据已复制到剪贴板');
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = copyContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showSuccess('数据已复制到剪贴板');
        });
    } catch (error) {
        showError('复制失败', error.message);
    }
}

function collectCurrentLotteryScopeData() {
    const manager = window.userManager;
    if (!manager) {
        return { ok: false, reason: '用户管理器未就绪，请重试' };
    }

    const inSummaryMode = typeof manager.isInSummaryMode === 'function'
        ? manager.isInSummaryMode()
        : false;
    const viewRegions = typeof manager.getViewRegions === 'function'
        ? manager.getViewRegions()
        : ['new_ao'];
    const viewRegionLabels = typeof manager.getViewRegionLabels === 'function'
        ? manager.getViewRegionLabels()
        : viewRegions;

    let scopedUsers = [];
    if (inSummaryMode && typeof manager.getSortedUsers === 'function') {
        scopedUsers = manager.getSortedUsers();
    } else if (typeof manager.getSelectedUsers === 'function') {
        scopedUsers = manager.getSelectedUsers();
    }

    if (!Array.isArray(scopedUsers) || scopedUsers.length <= 0) {
        const fallbackUser = typeof manager.getCurrentUser === 'function'
            ? manager.getCurrentUser()
            : '';
        scopedUsers = fallbackUser ? [fallbackUser] : [];
    }

    if (!scopedUsers.length) {
        return { ok: false, reason: '请先选择至少一个客户' };
    }

    const merged = mergeLotteryScopeData(manager, scopedUsers, viewRegions);
    if ((merged.totalCount || 0) <= 0 && (!merged.originalData || merged.originalData.length <= 0)) {
        return { ok: false, reason: '当前选择范围没有可导出的数据' };
    }

    return {
        ok: true,
        scopeData: {
            ...merged,
            users: scopedUsers,
            viewRegions,
            viewRegionLabels,
            inSummaryMode,
            scopeLabel: inSummaryMode ? '所有客户汇总范围' : '当前选择客户范围',
            exportedAt: new Date().toLocaleString('zh-CN')
        }
    };
}

function mergeLotteryScopeData(manager, scopedUsers, viewRegions) {
    const template = typeof manager.generateData === 'function'
        ? manager.generateData()
        : [];
    const mergedMap = new Map();
    template.forEach((item) => {
        const key = String(item && item.number ? item.number : '').trim();
        if (!key) return;
        mergedMap.set(key, {
            number: key,
            text: String((item && item.text) || ''),
            value: 0
        });
    });

    const extractOriginalText = typeof manager.extractOriginalMessageText === 'function'
        ? manager.extractOriginalMessageText.bind(manager)
        : (entry) => {
            if (typeof entry === 'string') return entry;
            if (entry && typeof entry === 'object' && typeof entry.message === 'string') return entry.message;
            if (entry == null) return '';
            return String(entry);
        };
    const getRegionLabel = typeof manager.getRegionLabel === 'function'
        ? manager.getRegionLabel.bind(manager)
        : (regionKey) => String(regionKey || '');

    const originalData = [];
    const userTotals = new Map();
    let totalCount = 0;

    scopedUsers.forEach((userName) => {
        userTotals.set(userName, 0);
        viewRegions.forEach((regionKey) => {
            const regionData = typeof manager.getUserRegionData === 'function'
                ? manager.getUserRegionData(userName, regionKey)
                : null;
            if (!regionData) return;

            const regionTotal = Number(regionData.totalCount) || 0;
            totalCount += regionTotal;
            userTotals.set(userName, (userTotals.get(userName) || 0) + regionTotal);

            (regionData.data || []).forEach((item) => {
                const key = String(item && item.number ? item.number : '').trim();
                if (!key) return;
                if (!mergedMap.has(key)) {
                    mergedMap.set(key, {
                        number: key,
                        text: String((item && item.text) || ''),
                        value: 0
                    });
                }
                const row = mergedMap.get(key);
                row.value += Number(item && item.value) || 0;
            });

            (regionData.originalData || []).forEach((message, index) => {
                originalData.push({
                    index: index + 1,
                    userName,
                    regionKey,
                    regionLabel: getRegionLabel(regionKey),
                    message: extractOriginalText(message)
                });
            });
        });
    });

    return {
        data: Array.from(mergedMap.values()),
        originalData,
        totalCount,
        userTotals: Array.from(userTotals.entries())
            .map(([userName, amount]) => ({ userName, amount: Number(amount) || 0 }))
            .sort((a, b) => b.amount - a.amount)
    };
}

function buildGroupedByValueRows(data = []) {
    const groupedByValue = new Map();
    (data || []).forEach((item) => {
        const value = Number(item && item.value) || 0;
        if (value <= 0) return;
        if (!groupedByValue.has(value)) {
            groupedByValue.set(value, []);
        }
        groupedByValue.get(value).push(String((item && item.number) || ''));
    });

    return Array.from(groupedByValue.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([value, numbers]) => ({
            value,
            numbers: numbers
                .filter(Boolean)
                .sort((a, b) => parseInt(a, 10) - parseInt(b, 10)),
        }));
}

function buildLotteryExportDocument(scopeData, format = 'excel') {
    const data = Array.isArray(scopeData.data) ? scopeData.data : [];
    const originalData = Array.isArray(scopeData.originalData) ? scopeData.originalData : [];
    const users = Array.isArray(scopeData.users) ? scopeData.users : [];
    const userTotals = Array.isArray(scopeData.userTotals) ? scopeData.userTotals : [];
    const regionLabels = Array.isArray(scopeData.viewRegionLabels) ? scopeData.viewRegionLabels : [];

    const groupedRows = buildGroupedByValueRows(data);
    const sortedDetails = data
        .filter((item) => (Number(item && item.value) || 0) > 0)
        .sort((a, b) => (Number(b && b.value) || 0) - (Number(a && a.value) || 0));

    const groupedRowsHtml = groupedRows.length > 0
        ? groupedRows.map((row) => `
            <tr>
                <td>${escapeHtml(row.numbers.join('.'))}</td>
                <td style="text-align:right">${escapeHtml(row.value)}</td>
                <td style="text-align:right">${escapeHtml(row.numbers.length)}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="3">暂无数据</td></tr>';

    const detailRowsHtml = sortedDetails.length > 0
        ? sortedDetails.map((item) => `
            <tr>
                <td>${escapeHtml(item.number)}</td>
                <td>${escapeHtml(item.text || '-')}</td>
                <td style="text-align:right">${escapeHtml(item.value)}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="3">暂无数据</td></tr>';

    const userRowsHtml = userTotals.length > 0
        ? userTotals.map((item) => `
            <tr>
                <td>${escapeHtml(item.userName)}</td>
                <td style="text-align:right">${escapeHtml(item.amount)}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="2">暂无数据</td></tr>';

    const originalRowsHtml = originalData.length > 0
        ? originalData.map((item, index) => `
            <tr>
                <td style="text-align:right">${index + 1}</td>
                <td>${escapeHtml(item.userName || '-')}</td>
                <td>${escapeHtml(item.regionLabel || item.regionKey || '-')}</td>
                <td>${escapeHtml(item.message || '').replace(/\n/g, '<br>')}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="4">暂无原始消息</td></tr>';

    const formatLabel = format === 'word' ? 'Word' : 'Excel';
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>统计导出</title>
  <style>
    body { font-family: "PingFang SC", "Microsoft YaHei", sans-serif; color: #1f2937; margin: 18px; }
    h1 { margin: 0 0 12px; font-size: 22px; }
    h2 { margin: 18px 0 8px; font-size: 16px; }
    .meta { margin: 0 0 12px; color: #374151; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 13px; vertical-align: top; }
    th { background: #f1f5f9; text-align: left; }
  </style>
</head>
<body>
  <h1>客户统计导出（${escapeHtml(formatLabel)}）</h1>
  <div class="meta">
    导出范围：${escapeHtml(scopeData.scopeLabel || '-')}<br>
    客户：${escapeHtml(users.join('，') || '-')}<br>
    查看盘口：${escapeHtml(regionLabels.join('、') || '-')}<br>
    总数：${escapeHtml(scopeData.totalCount || 0)}<br>
    导出时间：${escapeHtml(scopeData.exportedAt || new Date().toLocaleString('zh-CN'))}
  </div>

  <h2>客户总数分布</h2>
  <table>
    <thead>
      <tr><th>客户</th><th>累计值</th></tr>
    </thead>
    <tbody>${userRowsHtml}</tbody>
  </table>

  <h2>按金额聚合</h2>
  <table>
    <thead>
      <tr><th>号码组合</th><th>金额</th><th>号码数</th></tr>
    </thead>
    <tbody>${groupedRowsHtml}</tbody>
  </table>

  <h2>号码明细</h2>
  <table>
    <thead>
      <tr><th>号码</th><th>生肖</th><th>累计值</th></tr>
    </thead>
    <tbody>${detailRowsHtml}</tbody>
  </table>

  <h2>原始消息</h2>
  <table>
    <thead>
      <tr><th>序号</th><th>客户</th><th>盘口</th><th>内容</th></tr>
    </thead>
    <tbody>${originalRowsHtml}</tbody>
  </table>
</body>
</html>`;
}

function promptExportDocumentFormat() {
    return new Promise((resolve) => {
        const existed = document.getElementById('exportFormatDialogOverlay');
        if (existed && existed.parentElement) {
            existed.parentElement.removeChild(existed);
        }

        const overlay = document.createElement('div');
        overlay.id = 'exportFormatDialogOverlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.45);
            z-index: 12010;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            width: min(420px, calc(100vw - 32px));
            background: #ffffff;
            border: 1px solid #d8e3ef;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 10px 28px rgba(0,0,0,0.25);
            color: #1f2937;
        `;

        dialog.innerHTML = `
            <div style="font-size:18px;font-weight:700;margin-bottom:8px;">选择导出格式</div>
            <div style="font-size:13px;color:#4b5563;line-height:1.5;margin-bottom:14px;">
                请选择要导出的文档类型。
            </div>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:12px;">
                <button type="button" data-format="excel" style="border:none;background:#2563eb;color:#fff;border-radius:8px;padding:10px 12px;cursor:pointer;font-weight:700;">Excel</button>
                <button type="button" data-format="word" style="border:none;background:#0ea5a4;color:#fff;border-radius:8px;padding:10px 12px;cursor:pointer;font-weight:700;">Word</button>
            </div>
            <div style="display:flex;justify-content:flex-end;">
                <button type="button" data-format="" style="border:none;background:#64748b;color:#fff;border-radius:8px;padding:8px 12px;cursor:pointer;">取消</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        let done = false;
        const finalize = (format) => {
            if (done) return;
            done = true;
            document.removeEventListener('keydown', onKeyDown, true);
            if (overlay.parentElement) {
                overlay.parentElement.removeChild(overlay);
            }
            resolve(format || '');
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                finalize('');
            }
        };
        document.addEventListener('keydown', onKeyDown, true);

        dialog.querySelectorAll('button[data-format]').forEach((button) => {
            button.addEventListener('click', () => {
                finalize(button.getAttribute('data-format') || '');
            });
        });

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                finalize('');
            }
        });

        const excelBtn = dialog.querySelector('button[data-format="excel"]');
        if (excelBtn && typeof excelBtn.focus === 'function') {
            excelBtn.focus();
        }
    });
}

async function exportClientDataDocument() {
    try {
        if (!ipcRenderer || typeof ipcRenderer.invoke !== 'function') {
            showError('导出失败', 'IPC 不可用，请重启应用');
            return;
        }

        const scoped = collectCurrentLotteryScopeData();
        if (!scoped.ok) {
            showError('导出失败', scoped.reason || '当前范围没有可导出的数据');
            return;
        }

        const format = await promptExportDocumentFormat();
        if (!format) {
            showSuccess('已取消导出');
            return;
        }

        const content = buildLotteryExportDocument(scoped.scopeData, format);
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
        const fileName = `lottery_export_${timestamp}_${format}`;
        const result = await ipcRenderer.invoke('lottery:export-document', {
            format,
            fileName,
            content
        });

        if (!result || !result.ok) {
            if (result && result.canceled) {
                showSuccess('已取消导出');
                return;
            }
            showError('导出失败', (result && result.reason) || '保存文件失败');
            return;
        }

        showSuccess(`导出成功：${result.filePath}`);
    } catch (error) {
        showError('导出失败', error.message);
    }
}

// 生成复制内容
function generateCopyContent(scopeData) {
    const userLabel = Array.isArray(scopeData.users) ? scopeData.users.join('，') : '无';
    const regionLabel = Array.isArray(scopeData.viewRegionLabels) ? scopeData.viewRegionLabels.join('、') : '-';
    const groupedRows = buildGroupedByValueRows(scopeData.data || []);

    let content = `范围: ${scopeData.scopeLabel || '-'}\n`;
    content += `盘口: ${regionLabel}\n`;
    content += `用户: ${userLabel}\n`;
    content += `总数: ${scopeData.totalCount}\n`;
    content += `导出时间: ${scopeData.exportedAt || new Date().toLocaleString('zh-CN')}\n`;
    content += `数据统计:\n`;

    groupedRows.forEach((row) => {
        content += `${row.numbers.join('.')} 各 ${row.value}\n`;
    });

    const sortedData = (scopeData.data || [])
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);
    sortedData.forEach(item => {
        content += `${item.number} ${item.text}: ${item.value}\n`;
    });

    content += `\n原始数据:\n`;
    if (Array.isArray(scopeData.originalData) && scopeData.originalData.length > 0 && typeof scopeData.originalData[0] === 'object') {
        scopeData.originalData.forEach(item => {
            const region = item.regionLabel || item.regionKey || '-';
            content += `${item.userName}（${region}）: ${item.message}\n`;
        });
    } else {
        (scopeData.originalData || []).forEach(data => {
            content += `${data}\n`;
        });
    }

    return content;
}

function getEditableUsersForCurrentSelection() {
    if (window.userManager && typeof window.userManager.getSelectedUsers === 'function') {
        return window.userManager.getSelectedUsers();
    }
    const user = window.userManager && typeof window.userManager.getCurrentUser === 'function'
        ? window.userManager.getCurrentUser()
        : null;
    return user ? [user] : [];
}

// 打开关于软件弹窗
function openAboutModal() {
    const modal = document.getElementById('aboutSoftwareModal');
    modal.style.display = 'block';
}

// 关闭关于软件弹窗
function closeAboutModal() {
    const modal = document.getElementById('aboutSoftwareModal');
    modal.style.display = 'none';
}

// 设置输入监听器
function setupInputListener(enabled) {
    const inputField = document.getElementById('inputField');
    const display = document.getElementById('display');
    
    if (!inputField || !display) return;
    
    if (enabled) {
        inputField.addEventListener('input', handleInput);
        inputField.addEventListener('keydown', handleKeyDown);
        inputField.focus();
    } else {
        inputField.removeEventListener('input', handleInput);
        inputField.removeEventListener('keydown', handleKeyDown);
    }
}

// 处理输入
function handleInput(event) {
    const inputField = event.target;
    const display = document.getElementById('display');
    const value = inputField.value;
    
    if (isNewInput) {
        display.textContent = value;
        isNewInput = false;
    } else {
        display.textContent += value;
    }
    
    inputField.value = '';
}

// 处理按键
function handleKeyDown(event) {
    if (event.key === 'Enter') {
        const display = document.getElementById('display');
        const text = display.textContent;
        
        if (text.trim()) {
            speakText(text);
            display.textContent = '';
            isNewInput = true;
        }
    } else if (event.key === 'Escape') {
        const display = document.getElementById('display');
        display.textContent = '';
        isNewInput = true;
    }
}

// 语音播报
function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
    }
}

// 更新文本框
function updateTextarea() {
    const textarea = document.getElementById('message');
    if (textarea) {
        textarea.focus();
    }
}

// 处理单元格点击
function handleCellClick(number) {
    const selectedUsers = getEditableUsersForCurrentSelection();
    if (!selectedUsers.length) {
        showError('操作失败', '请先选择至少一个用户');
        return;
    }

    openEditModal(number, selectedUsers);
}

// 打开编辑模态框
function openEditModal(number, userList) {
    const editModal = document.getElementById('editModal');
    const editModalTitle = document.getElementById('editModalTitle');
    const editModalContent = document.getElementById('editModalContent');
    
    editModalTitle.textContent = `编辑 ${number} 的值`;
    
    let content = '<div style="margin: 10px 0;">';
    userList.forEach(user => {
        const userData = userManager.getUserData(user);
        const dataItem = userData.data.find(item => item.number === number);
        const currentValue = dataItem ? dataItem.value : 0;
        
        content += `<div style="margin: 10px 0;">`;
        content += `<label>${user}:</label> `;
        content += `<input type="number" id="edit_${user}_${number}" value="${currentValue}" min="0" style="margin-left: 10px; padding: 5px;">`;
        content += `</div>`;
    });
    
    content += `<div style="margin-top: 20px;">`;
    content += `<button onclick="saveEditedValues('${number}', ${JSON.stringify(userList)})" style="margin-right: 10px;">保存</button>`;
    content += `<button onclick="closeEditModal()">取消</button>`;
    content += `</div>`;
    content += '</div>';
    
    editModalContent.innerHTML = content;
    editModal.style.display = 'block';
}

// 保存编辑的值
function saveEditedValues(number, userList) {
    try {
        userList.forEach(user => {
            const inputElement = document.getElementById(`edit_${user}_${number}`);
            if (inputElement) {
                const newValue = parseInt(inputElement.value) || 0;
                const userData = userManager.getUserData(user);
                const dataItem = userData.data.find(item => item.number === number);
                
                if (dataItem) {
                    dataItem.value = newValue;
                }
            }
        });
        
        // 重新计算总数
        userList.forEach(user => {
            const userData = userManager.getUserData(user);
            userData.totalCount = userData.data.reduce((sum, item) => sum + item.value, 0);
        });
        
        userManager.saveUserData();
        userManager.renderAllSections();
        closeEditModal();
        showSuccess('数据更新成功');
    } catch (error) {
        showError('保存失败', error.message);
    }
}

// 关闭编辑模态框
function closeEditModal() {
    const editModal = document.getElementById('editModal');
    editModal.style.display = 'none';
    if (isAttributeEditMode) {
        toggleAttributeEditMode(false);
    }
}

// 窗口点击事件（关闭模态框）
window.onclick = function(event) {
    const modal = document.getElementById('myModal');
    const editModal = document.getElementById('editModal');
    const aboutModal = document.getElementById('aboutSoftwareModal');
    const editOriginalModal = document.getElementById('editOriginalModal');
    const licenseModal = document.getElementById('licenseModal');
    const planModal = document.getElementById('planModal');
    
    if (event.target === modal) {
        if (isAmbiguityChoiceModalOpen()) return;
        closeModal();
    }
    if (event.target === editModal) {
        closeEditModal();
    }
    if (event.target === aboutModal) {
        closeAboutModal();
    }
    if (event.target === editOriginalModal && window.userManager) {
        window.userManager.closeEditOriginalModal();
    }
    if (event.target === licenseModal) {
        closeLicenseModal();
    }
    if (event.target === planModal) {
        closePlanModal();
    }
}

// 导出全局函数
window.addUser = addUser;
window.handleSummary = handleSummary;
window.clearUserData = clearUserData;
window.openModal = openModal;
window.closeModal = closeModal;
window.openOriginalDataEditInRecognize = openOriginalDataEditInRecognize;
window.previewMessage = previewMessage;
window.confirmEdit = confirmEdit;
window.copyClientData = copyClientData;
window.exportClientDataDocument = exportClientDataDocument;
window.openAboutModal = openAboutModal;
window.closeAboutModal = closeAboutModal;
window.handleCellClick = handleCellClick;
window.saveEditedValues = saveEditedValues;
window.closeEditModal = closeEditModal;
window.clearAttributeSelection = clearAttributeSelection;
window.toggleRecognizeAttributePanel = toggleRecognizeAttributePanel;
window.toggleRecognizeSideGroup = toggleRecognizeSideGroup;
window.addCustomAttribute = addCustomAttribute;
window.removeCustomAttribute = removeCustomAttribute;
window.setAnchorRuleScope = setAnchorRuleScope;
window.handleAnchorRuleClientChange = handleAnchorRuleClientChange;
window.handleAnchorRuleScopeChange = handleAnchorRuleScopeChange;
window.snoozeAnchorStrategyGuide = snoozeAnchorStrategyGuide;
window.dismissAnchorStrategyGuide = dismissAnchorStrategyGuide;
window.toggleAnchorSubgroup = toggleAnchorSubgroup;
window.setAnchorConsoleTab = setAnchorConsoleTab;
window.setAnchorStrategyTab = setAnchorStrategyTab;
window.openAnchorRuleDrawer = openAnchorRuleDrawer;
window.closeAnchorRuleDrawer = closeAnchorRuleDrawer;
window.saveAnchorRuleFromDrawer = saveAnchorRuleFromDrawer;
window.renderAnchorRuleDrawerPreview = renderAnchorRuleDrawerPreview;
window.renderAnchorImpactPreview = renderAnchorImpactPreview;
window.applyAnchorImpactExample = applyAnchorImpactExample;
window.saveAnchorAliasRule = saveAnchorAliasRule;
window.removeAnchorAliasRule = removeAnchorAliasRule;
window.resetAnchorAliasRules = resetAnchorAliasRules;
window.saveAnchorParseModeRule = saveAnchorParseModeRule;
window.resetAnchorParseModeRule = resetAnchorParseModeRule;
window.saveDefaultOddsRule = saveDefaultOddsRule;
window.resetDefaultOddsRule = resetDefaultOddsRule;
window.confirmAmbiguityChoice = confirmAmbiguityChoice;
window.toggleAttributeEditMode = toggleAttributeEditMode;
window.confirmAttributeEdit = confirmAttributeEdit;
window.cancelAttributeEdit = cancelAttributeEdit;
window.dismissLegalNotice = dismissLegalNotice;
window.openLicenseModal = openLicenseModal;
window.closeLicenseModal = closeLicenseModal;
window.refreshLicenseStatus = refreshLicenseStatus;
window.openPlanModal = openPlanModal;
window.closePlanModal = closePlanModal;
window.pickOcrImage = pickOcrImage;
window.runOcrFromSelectedImage = runOcrFromSelectedImage;
window.clearOcrImage = clearOcrImage;
