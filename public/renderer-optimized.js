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
let recognizeSpeechRecognition = null;
let recognizeSpeechListening = false;
let recognizeSpeechSupported = false;
let recognizeSpeechFinalText = '';
let recognizeSpeechInterimText = '';
let recognizeSpeechLastError = '';
let recognizeSpeechDiscardOnEnd = false;
let recognizeSpeechManualStop = false;
let currentLicenseStatus = null;
let licenseLastUpdatedAt = null;
let appAccessStatus = null;
let currentPlanContext = null;
let planCatalog = null;
let selectedOcrImage = null;
let selectedOcrPreviewUrl = null;
let ocrCandidateResults = [];
let localAiSemanticStatus = {
    checked: false,
    available: false,
    reason: 'unknown',
    message: '本地 AI 语义修正：检测中...',
    model: '',
    installHint: ''
};
let localAiRewriteBusy = false;
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
    anchors: false,
    noise: false,
    amountUnits: false
};
let anchorRuleTargetClientId = '';
let noiseRuleTargetClientId = '';
let amountUnitTargetClientId = '';
let anchorGuideState = null;
let anchorGuideHiddenForSession = false;
let anchorGuideAutoExpanded = false;
let anchorGuideFocusTargetIds = [];
let lastRecognizePreviewError = '';
let recognizePreviewBlocked = false;
let dashboardSaveState = 'saved';
let dashboardSaveError = '';
let ambiguityChoiceState = null;
let blockedUpgradeAutoShown = false;
let trialRuntimeWarningDismissed = false;
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
const SETTINGS_PASSWORD_MODULE_ID = 'lottery';
const HEDGE_MAX_LOSS_KEY = 'hedgeMaxLoss.v1';
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
const ANCHOR_SUBGROUP_CONFIGS = [];
let anchorSubgroupState = {};
let anchorStrategyActiveTab = 'per_number';
let anchorRuleDrawerState = {
    open: false,
    editToken: '',
    editSource: '',
    editClientId: ''
};
let anchorRuleDrawerSnapshot = null;
let noiseRuleEditorState = {
    editPattern: '',
    editSource: '',
    editClientId: '',
    previewPattern: '',
    previewSource: '',
    previewClientId: ''
};
let amountUnitEditorState = {
    editToken: '',
    editSource: '',
    editClientId: '',
    previewToken: '',
    previewSource: '',
    previewClientId: ''
};

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
        const versionText = version ? `v${version}` : 'v-';
        const badge = document.getElementById('appVersionBadge');
        if (badge) {
            badge.textContent = versionText;
        }
        const settingsVersion = document.getElementById('settingsVersionValue');
        if (settingsVersion) {
            settingsVersion.textContent = versionText;
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
        trialRuntimeWarningDismissed = false;
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
    if (status.mode === 'trial' && status.trial && !trialRuntimeWarningDismissed) {
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

function setRecognizePreviewBlocked(blocked = false) {
    recognizePreviewBlocked = !!blocked;
    syncRecognizeModalActionMode();
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
    const isTrialMode = !!(appAccessStatus && appAccessStatus.mode === 'trial');

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
    } else if (isTrialMode) {
        banner.textContent = `当前为试用模式，已开放 ${context.name} 能力（可在 Plus / Pro 间自由切换）。试用到期后请购买 Plus 或 Pro 授权。`;
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
        const trialActionHtml = isTrialMode
            ? (selected
                ? `<div class="plan-card-actions"><span class="plan-card-state">当前试用套餐</span></div>`
                : `<div class="plan-card-actions"><button class="edit-button plan-switch-btn" type="button" onclick="switchTrialPlanTier('${escapeHtml(plan.key)}')">切换到 ${escapeHtml(plan.name)}</button></div>`)
            : '';
        return `
            <section class="plan-card ${selected ? 'current' : ''}">
                <div class="plan-card-header">
                    <h3 class="plan-card-name">${escapeHtml(plan.name)}</h3>
                    <span class="plan-card-price">${lifetimePrice} · 永久授权</span>
                </div>
                <p class="plan-card-desc">${escapeHtml(plan.description || '')}</p>
                <ul class="plan-card-features">${featureHtml}</ul>
                ${trialActionHtml}
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

async function switchTrialPlanTier(nextTier) {
    const targetTier = normalizePlanTier(nextTier, '');
    if (!targetTier) {
        showError('切换失败', '套餐参数无效');
        return;
    }
    if (!appAccessStatus || appAccessStatus.mode !== 'trial') {
        showError('切换失败', '当前非试用模式，不能切换套餐');
        return;
    }
    if (!ipcRenderer || typeof ipcRenderer.invoke !== 'function') {
        showError('切换失败', 'IPC 不可用，请重启应用');
        return;
    }

    try {
        const result = await ipcRenderer.invoke('plan:switch-trial-tier', { tier: targetTier });
        if (!result || !result.ok) {
            showError('切换失败', (result && result.reason) || '请重试');
            return;
        }
        if (result.status) {
            applyAppAccessStatus(result.status);
        } else {
            currentPlanContext = resolvePlanContext(appAccessStatus || {});
            renderPlanBadge();
            renderPlanModal();
            syncPlanCapabilityUI();
        }

        const targetPlan = getPlanByTier(targetTier);
        const targetName = targetPlan ? targetPlan.name : targetTier.toUpperCase();
        if (result.changed === false) {
            showSuccess(`当前已是 ${targetName}`);
        } else {
            showSuccess(`已切换到 ${targetName}`);
        }
    } catch (error) {
        showError('切换失败', error && error.message ? error.message : '请重试');
    }
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

function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    const settingsVersion = document.getElementById('settingsVersionValue');
    if (settingsVersion && !settingsVersion.textContent) {
        settingsVersion.textContent = 'v-';
    }
    modal.style.display = 'block';
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    modal.style.display = 'none';
}

function openPlanModalFromSettings() {
    closeSettingsModal();
    openPlanModal();
}

function openLicenseModalFromSettings() {
    closeSettingsModal();
    openLicenseModal();
}

function openAboutModalFromSettings() {
    closeSettingsModal();
    openAboutModal();
}

function clearPasswordChangeForm() {
    const ids = ['passwordCurrentInput', 'passwordNextInput', 'passwordConfirmInput'];
    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = '';
        }
    });
    setPasswordChangeStatus('', '');
}

function setPasswordChangeStatus(message, type = 'info') {
    const status = document.getElementById('passwordChangeStatus');
    if (!status) return;
    status.textContent = message || '';
    status.className = 'settings-inline-status';
    if (type === 'success') {
        status.classList.add('is-success');
    } else if (type === 'error') {
        status.classList.add('is-error');
    }
}

function openPasswordChangeModal() {
    const modal = document.getElementById('passwordChangeModal');
    if (!modal) return;
    clearPasswordChangeForm();
    modal.style.display = 'block';
    const currentInput = document.getElementById('passwordCurrentInput');
    if (currentInput) {
        currentInput.focus();
    }
}

function closePasswordChangeModal() {
    const modal = document.getElementById('passwordChangeModal');
    if (!modal) return;
    modal.style.display = 'none';
}

async function submitPasswordChange() {
    const currentInput = document.getElementById('passwordCurrentInput');
    const nextInput = document.getElementById('passwordNextInput');
    const confirmInput = document.getElementById('passwordConfirmInput');
    const currentPassword = currentInput ? String(currentInput.value || '').trim() : '';
    const nextPassword = nextInput ? String(nextInput.value || '').trim() : '';
    const confirmPassword = confirmInput ? String(confirmInput.value || '').trim() : '';

    if (!currentPassword) {
        setPasswordChangeStatus('请输入当前密码。', 'error');
        return;
    }
    if (!nextPassword) {
        setPasswordChangeStatus('请输入新密码。', 'error');
        return;
    }
    if (nextPassword.length < 4) {
        setPasswordChangeStatus('新密码至少 4 位。', 'error');
        return;
    }
    if (nextPassword !== confirmPassword) {
        setPasswordChangeStatus('两次输入的新密码不一致。', 'error');
        return;
    }
    if (currentPassword === nextPassword) {
        setPasswordChangeStatus('新密码不能与当前密码相同。', 'error');
        return;
    }
    if (!ipcRenderer || typeof ipcRenderer.invoke !== 'function') {
        setPasswordChangeStatus('当前环境不支持修改密码。', 'error');
        return;
    }

    setPasswordChangeStatus('正在保存密码...', 'info');
    try {
        const result = await ipcRenderer.invoke('module-auth:update-password', {
            moduleId: SETTINGS_PASSWORD_MODULE_ID,
            currentPassword,
            nextPassword,
        });
        if (!result || !result.ok) {
            const reason = result && result.reason ? result.reason : '密码修改失败';
            setPasswordChangeStatus(reason, 'error');
            return;
        }
        setPasswordChangeStatus(result.reason || '密码修改成功。', 'success');
        if (currentInput) currentInput.value = '';
        if (nextInput) nextInput.value = '';
        if (confirmInput) confirmInput.value = '';
    } catch (error) {
        setPasswordChangeStatus(`密码修改失败: ${error.message}`, 'error');
    }
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

function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    if (trialRuntimeWarningDismissed) return;
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
        padding: 8px 34px 8px 12px;
        font-weight: 700;
        box-shadow: 0 8px 20px rgba(0,0,0,0.18);
        z-index: 10001;
    `;
    const endText = endAt ? `，到期时间：${formatTime(endAt)}` : '';
    warning.textContent = `当前为试用模式，剩余 ${remainingDays} 天${endText}`;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', '关闭试用提示');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
        position: absolute;
        right: 8px;
        top: 4px;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        border: 1px solid rgba(120, 53, 15, 0.35);
        background: rgba(255,255,255,0.55);
        color: #78350f;
        font-size: 14px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
    `;
    closeBtn.onclick = () => {
        trialRuntimeWarningDismissed = true;
        warning.remove();
    };
    warning.appendChild(closeBtn);
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
    stopRecognizeVoiceInput({ discard: true });
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
        && anchorGuideState.completed.combinePolicy === true;
}

function getAnchorGuideCurrentStep() {
    const loginCount = Number(anchorGuideState && anchorGuideState.loginCount ? anchorGuideState.loginCount : 0);
    if (loginCount <= 1) return 1;
    return 2;
}

function getAnchorGuideStepKey(step) {
    if (step === 1) return 'anchor';
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
    const done = isAnchorGuideStepDone('combinePolicy');
    return {
        title: '第 2 步：选择属性词叠加策略',
        summary: done
            ? '本步已完成。你已具备“锚点词 + 属性叠加策略”的完整配置。'
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
    if (action === 'set_attribute_policy') {
        Object.keys(recognizeSideGroupState).forEach((key) => {
            recognizeSideGroupState[key] = key === 'attributes';
        });
        applyRecognizeSideGroups();
        saveRecognizeSideGroupState();
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
        anchors: true,
        noise: false,
        amountUnits: false
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

function getNoiseRuleFilterState() {
    const searchInput = document.getElementById('noiseRuleSearch');
    const sourceInput = document.getElementById('noiseRuleSourceFilter');
    return {
        keyword: searchInput ? String(searchInput.value || '').trim().toLowerCase() : '',
        source: sourceInput ? String(sourceInput.value || 'all').trim() : 'all'
    };
}

function getAmountUnitFilterState() {
    const searchInput = document.getElementById('amountUnitSearch');
    const sourceInput = document.getElementById('amountUnitSourceFilter');
    return {
        keyword: searchInput ? String(searchInput.value || '').trim().toLowerCase() : '',
        source: sourceInput ? String(sourceInput.value || 'all').trim() : 'all'
    };
}

function getNoiseRuleAmountPlaceholder() {
    if (window.messageProcessor && typeof window.messageProcessor.getNoiseRuleCanonicalPlaceholder === 'function') {
        return String(window.messageProcessor.getNoiseRuleCanonicalPlaceholder() || '{金额}');
    }
    return '{金额}';
}

function normalizeAmountUnitInput(token) {
    if (window.messageProcessor && typeof window.messageProcessor.normalizeAmountUnitToken === 'function') {
        return String(window.messageProcessor.normalizeAmountUnitToken(token) || '').trim();
    }
    return String(token || '').replace(/\s+/g, '').trim();
}

function normalizeNoiseRulePatternInput(pattern) {
    if (window.messageProcessor && typeof window.messageProcessor.sanitizeNoiseRulePattern === 'function') {
        return String(window.messageProcessor.sanitizeNoiseRulePattern(pattern) || '').trim();
    }
    return String(pattern || '').replace(/\{amount\}/gi, getNoiseRuleAmountPlaceholder()).trim();
}

function clearNoiseRulePreviewSelection() {
    noiseRuleEditorState.previewPattern = '';
    noiseRuleEditorState.previewSource = '';
    noiseRuleEditorState.previewClientId = '';
}

function selectNoiseRulePreview(pattern, source = '', clientId = '') {
    const normalizedPattern = normalizeNoiseRulePatternInput(pattern);
    if (!normalizedPattern) {
        clearNoiseRulePreviewSelection();
        return;
    }
    noiseRuleEditorState.previewPattern = normalizedPattern;
    noiseRuleEditorState.previewSource = String(source || '').trim();
    noiseRuleEditorState.previewClientId = String(clientId || '').trim();
}

function getNoiseRulePreviewSelection() {
    return {
        pattern: normalizeNoiseRulePatternInput(noiseRuleEditorState.previewPattern),
        source: String(noiseRuleEditorState.previewSource || '').trim(),
        clientId: String(noiseRuleEditorState.previewClientId || '').trim()
    };
}

function clearAmountUnitPreviewSelection() {
    amountUnitEditorState.previewToken = '';
    amountUnitEditorState.previewSource = '';
    amountUnitEditorState.previewClientId = '';
}

function selectAmountUnitPreview(token, source = '', clientId = '') {
    const normalizedToken = normalizeAmountUnitInput(token);
    if (!normalizedToken) {
        clearAmountUnitPreviewSelection();
        return;
    }
    amountUnitEditorState.previewToken = normalizedToken;
    amountUnitEditorState.previewSource = String(source || '').trim();
    amountUnitEditorState.previewClientId = String(clientId || '').trim();
}

function getAmountUnitPreviewSelection() {
    return {
        token: normalizeAmountUnitInput(amountUnitEditorState.previewToken),
        source: String(amountUnitEditorState.previewSource || '').trim(),
        clientId: String(amountUnitEditorState.previewClientId || '').trim()
    };
}

function isAmountUnitPreviewSelected(row, selection = getAmountUnitPreviewSelection()) {
    if (!row || !selection.token) return false;
    return normalizeAmountUnitInput(row.token) === selection.token
        && String(row.source || '').trim() === selection.source
        && String(row.clientId || '').trim() === selection.clientId;
}

function isNoiseRulePreviewSelected(row, selection = getNoiseRulePreviewSelection()) {
    if (!row || !selection.pattern) return false;
    return normalizeNoiseRulePatternInput(row.pattern) === selection.pattern
        && String(row.source || '').trim() === selection.source
        && String(row.clientId || '').trim() === selection.clientId;
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

    const noiseNodes = [
        document.getElementById('noiseRuleSearch'),
        document.getElementById('noiseRuleSourceFilter')
    ];
    noiseNodes.forEach((node) => {
        if (!node || node.dataset.bound === '1') return;
        node.dataset.bound = '1';
        const eventName = node.tagName === 'SELECT' ? 'change' : 'input';
        node.addEventListener(eventName, () => {
            renderNoiseRuleList();
        });
    });

    const noisePatternInput = document.getElementById('noiseRulePatternInput');
    if (noisePatternInput && noisePatternInput.dataset.bound !== '1') {
        noisePatternInput.dataset.bound = '1';
        noisePatternInput.addEventListener('input', () => {
            clearNoiseRulePreviewSelection();
            renderNoiseRuleEditorState();
            renderNoiseRuleList();
            renderNoiseRulePreview();
        });
    }

    const noiseHelperNodes = Array.from(document.querySelectorAll('[data-noise-rule-example]'));
    noiseHelperNodes.forEach((node) => {
        if (!node || node.dataset.bound === '1') return;
        node.dataset.bound = '1';
        node.addEventListener('click', () => {
            fillNoiseRulePattern(node.dataset.noiseRuleExample || '');
        });
    });

    const noiseSampleInput = document.getElementById('noiseRuleSampleInput');
    if (noiseSampleInput && noiseSampleInput.dataset.bound !== '1') {
        noiseSampleInput.dataset.bound = '1';
        noiseSampleInput.addEventListener('input', () => {
            renderNoiseRulePreview();
        });
    }

    const amountUnitNodes = [
        document.getElementById('amountUnitSearch'),
        document.getElementById('amountUnitSourceFilter')
    ];
    amountUnitNodes.forEach((node) => {
        if (!node || node.dataset.bound === '1') return;
        node.dataset.bound = '1';
        const eventName = node.tagName === 'SELECT' ? 'change' : 'input';
        node.addEventListener(eventName, () => {
            renderAmountUnitList();
        });
    });

    const amountUnitInput = document.getElementById('amountUnitTokenInput');
    if (amountUnitInput && amountUnitInput.dataset.bound !== '1') {
        amountUnitInput.dataset.bound = '1';
        amountUnitInput.addEventListener('input', () => {
            clearAmountUnitPreviewSelection();
            renderAmountUnitEditorState();
            renderAmountUnitList();
            renderAmountUnitPreview();
        });
    }

    const amountUnitHelperNodes = Array.from(document.querySelectorAll('[data-amount-unit-example]'));
    amountUnitHelperNodes.forEach((node) => {
        if (!node || node.dataset.bound === '1') return;
        node.dataset.bound = '1';
        node.addEventListener('click', () => {
            fillAmountUnitToken(node.dataset.amountUnitExample || '');
        });
    });

    const amountUnitSampleInput = document.getElementById('amountUnitSampleInput');
    if (amountUnitSampleInput && amountUnitSampleInput.dataset.bound !== '1') {
        amountUnitSampleInput.dataset.bound = '1';
        amountUnitSampleInput.addEventListener('input', () => {
            renderAmountUnitPreview();
        });
    }

    const blockedKeywordNodes = [
        document.getElementById('blockedPlayKeywordInput_pingte_xiao'),
        document.getElementById('blockedPlayKeywordInput_lian_play')
    ];
    blockedKeywordNodes.forEach((node) => {
        if (!node || node.dataset.bound === '1') return;
        node.dataset.bound = '1';
        node.addEventListener('input', () => {
            renderBlockedPlayKeywordState();
        });
    });

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
            const input = parsePositiveNumericInput(defaultOddsInput.value);
            if (input.empty) return;
            if (Number.isFinite(input.value)) {
                defaultOddsInput.value = formatNumericAmount(input.value);
            }
        });
    }

}

function sanitizeAnchorSubgroupState(rawState) {
    const safe = {};
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
    return ANCHOR_SUBGROUP_CONFIGS.find(item => item.key === key) || null;
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

function isAttributeCombinePolicyDirty() {
    const policyInput = document.getElementById('attributeCombinePolicy');
    if (!policyInput) return false;
    const baseline = String(policyInput.dataset.baselineValue || '').trim();
    return baseline && String(policyInput.value || '').trim() !== baseline;
}

function collectNoiseRuleEditorState() {
    const patternInput = document.getElementById('noiseRulePatternInput');
    return {
        pattern: patternInput ? String(patternInput.value || '').trim() : ''
    };
}

function isNoiseRuleEditorDirty() {
    const current = collectNoiseRuleEditorState();
    return current.pattern !== '';
}

function getAnchorSubgroupClosePrompt(key) {
    return '';
}

function renderAnchorSubgroups() {
    // Anchor management is now a flat workspace with no nested subgroup UI.
}

function toggleAnchorSubgroup(key) {
    // No nested subgroup UI remains; keep this as a harmless no-op.
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

function getNoiseRuleScope() {
    const scopeInput = document.getElementById('noiseRuleScope');
    return scopeInput && scopeInput.value === 'client' ? 'client' : 'global';
}

function resolveNoiseRuleClientId(options = {}) {
    const clientCandidates = Array.isArray(options.clientCandidates)
        ? options.clientCandidates
        : getAnchorRuleClientCandidates();
    const selectInput = document.getElementById('noiseRuleClientSelect');
    const allowSelectionFallback = !(options && options.allowSelectionFallback === false);

    let resolved = String(noiseRuleTargetClientId || '').trim();
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

function syncNoiseRuleScopeButtons() {
    const scope = getNoiseRuleScope();
    const globalBtn = document.getElementById('noiseScopeGlobalBtn');
    const clientBtn = document.getElementById('noiseScopeClientBtn');
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

function renderNoiseRuleClientSelect() {
    const clientRow = document.getElementById('noiseRuleClientRow');
    const selectInput = document.getElementById('noiseRuleClientSelect');
    const scope = getNoiseRuleScope();
    if (clientRow) {
        clientRow.style.display = scope === 'client' ? '' : 'none';
    }
    if (!selectInput) return;

    const clientCandidates = getAnchorRuleClientCandidates();
    const resolved = resolveNoiseRuleClientId({ clientCandidates, allowSelectionFallback: true });
    noiseRuleTargetClientId = resolved || (clientCandidates[0] || '');

    selectInput.innerHTML = '';
    if (clientCandidates.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '暂无客户';
        selectInput.appendChild(option);
        selectInput.value = '';
        selectInput.disabled = true;
        noiseRuleTargetClientId = '';
        return;
    }

    clientCandidates.forEach((clientName) => {
        const option = document.createElement('option');
        option.value = clientName;
        option.textContent = clientName;
        selectInput.appendChild(option);
    });
    selectInput.disabled = false;
    selectInput.value = noiseRuleTargetClientId || clientCandidates[0];
}

function setNoiseRuleScope(scope) {
    const nextScope = scope === 'client' ? 'client' : 'global';
    const scopeInput = document.getElementById('noiseRuleScope');
    if (scopeInput) {
        scopeInput.value = nextScope;
    }
    handleNoiseRuleScopeChange();
}

function handleNoiseRuleClientChange() {
    const selectInput = document.getElementById('noiseRuleClientSelect');
    noiseRuleTargetClientId = selectInput ? String(selectInput.value || '').trim() : '';
    handleNoiseRuleScopeChange();
}

function getAmountUnitScope() {
    const scopeInput = document.getElementById('amountUnitScope');
    return scopeInput && scopeInput.value === 'client' ? 'client' : 'global';
}

function resolveAmountUnitClientId(options = {}) {
    const clientCandidates = Array.isArray(options.clientCandidates)
        ? options.clientCandidates
        : getAnchorRuleClientCandidates();
    const selectInput = document.getElementById('amountUnitClientSelect');
    const allowSelectionFallback = !(options && options.allowSelectionFallback === false);

    let resolved = String(amountUnitTargetClientId || '').trim();
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

function syncAmountUnitScopeButtons() {
    const scope = getAmountUnitScope();
    const globalBtn = document.getElementById('amountUnitScopeGlobalBtn');
    const clientBtn = document.getElementById('amountUnitScopeClientBtn');
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

function renderAmountUnitClientSelect() {
    const clientRow = document.getElementById('amountUnitClientRow');
    const selectInput = document.getElementById('amountUnitClientSelect');
    const scope = getAmountUnitScope();
    if (clientRow) {
        clientRow.style.display = scope === 'client' ? '' : 'none';
    }
    if (!selectInput) return;

    const clientCandidates = getAnchorRuleClientCandidates();
    const resolved = resolveAmountUnitClientId({ clientCandidates, allowSelectionFallback: true });
    amountUnitTargetClientId = resolved || (clientCandidates[0] || '');

    selectInput.innerHTML = '';
    if (clientCandidates.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '暂无客户';
        selectInput.appendChild(option);
        selectInput.value = '';
        selectInput.disabled = true;
        amountUnitTargetClientId = '';
        return;
    }

    clientCandidates.forEach((clientName) => {
        const option = document.createElement('option');
        option.value = clientName;
        option.textContent = clientName;
        selectInput.appendChild(option);
    });
    selectInput.disabled = false;
    selectInput.value = amountUnitTargetClientId || clientCandidates[0];
}

function setAmountUnitScope(scope) {
    const nextScope = scope === 'client' ? 'client' : 'global';
    const scopeInput = document.getElementById('amountUnitScope');
    if (scopeInput) {
        scopeInput.value = nextScope;
    }
    handleAmountUnitScopeChange();
}

function handleAmountUnitClientChange() {
    const selectInput = document.getElementById('amountUnitClientSelect');
    amountUnitTargetClientId = selectInput ? String(selectInput.value || '').trim() : '';
    handleAmountUnitScopeChange();
}

function setAnchorRuleControlsEnabled(enabled) {
    const nodeIds = [
        'anchorParseMode',
        'attributeCombinePolicy',
        'regionAccountingMode',
        'regionAccountingDefaultRegion',
        'blockedPlayKeywordInput_pingte_xiao',
        'blockedPlayKeywordInput_lian_play',
        'defaultOddsInput',
        'saveAnchorParseModeBtn',
        'resetAnchorParseModeBtn',
        'saveAttributeCombinePolicyBtn',
        'resetAttributeCombinePolicyBtn',
        'saveRegionAccountingPolicyBtn',
        'resetRegionAccountingPolicyBtn',
        'saveBlockedPlayKeywordBtn',
        'resetBlockedPlayKeywordBtn',
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

function setNoiseRuleControlsEnabled(enabled) {
    const nodeIds = [
        'noiseRuleClientSelect',
        'noiseRulePatternInput',
        'saveNoiseRuleBtn',
        'resetNoiseRuleBtn'
    ];
    nodeIds.forEach((id) => {
        const node = document.getElementById(id);
        if (!node) return;
        if (id === 'noiseRuleClientSelect' && getNoiseRuleScope() !== 'client') {
            node.disabled = true;
            return;
        }
        node.disabled = !enabled;
    });
}

function setAmountUnitControlsEnabled(enabled) {
    const nodeIds = [
        'amountUnitClientSelect',
        'amountUnitTokenInput',
        'saveAmountUnitBtn',
        'resetAmountUnitBtn'
    ];
    nodeIds.forEach((id) => {
        const node = document.getElementById(id);
        if (!node) return;
        if (id === 'amountUnitClientSelect' && getAmountUnitScope() !== 'client') {
            node.disabled = true;
            return;
        }
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

function getNoiseRuleContext(options = {}) {
    const scope = getNoiseRuleScope();
    const requireClient = !!(options && options.requireClientForClientScope);
    let clientId = '';

    if (scope === 'client') {
        const clientCandidates = getAnchorRuleClientCandidates();
        clientId = resolveNoiseRuleClientId({ clientCandidates, allowSelectionFallback: true });
        if (requireClient) {
            if (clientCandidates.length === 0) {
                throw new Error('请先创建客户后再设置客户专属噪音规则');
            }
            if (!clientId) {
                throw new Error('请选择要编辑的客户');
            }
        }
    }

    return { scope, clientId };
}

function getAmountUnitContext(options = {}) {
    const scope = getAmountUnitScope();
    const requireClient = !!(options && options.requireClientForClientScope);
    let clientId = '';

    if (scope === 'client') {
        const clientCandidates = getAnchorRuleClientCandidates();
        clientId = resolveAmountUnitClientId({ clientCandidates, allowSelectionFallback: true });
        if (requireClient) {
            if (clientCandidates.length === 0) {
                throw new Error('请先创建客户后再设置客户专属金额单位');
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

function getNoiseRulePreviewClientIdByContext() {
    const { scope, clientId } = getNoiseRuleContext();
    if (scope === 'client') return clientId || '';
    return getPreviewClientId() || '';
}

function getAmountUnitPreviewClientIdByContext() {
    const { scope, clientId } = getAmountUnitContext();
    if (scope === 'client') return clientId || '';
    return getPreviewClientId() || '';
}

function initAnchorRuleControls() {
    const scopeInput = document.getElementById('anchorRuleScope');
    if (scopeInput && !scopeInput.value) {
        scopeInput.value = 'global';
    }
    const noiseScopeInput = document.getElementById('noiseRuleScope');
    if (noiseScopeInput && !noiseScopeInput.value) {
        noiseScopeInput.value = 'global';
    }
    const amountUnitScopeInput = document.getElementById('amountUnitScope');
    if (amountUnitScopeInput && !amountUnitScopeInput.value) {
        amountUnitScopeInput.value = 'global';
    }
    anchorSubgroupState = loadAnchorSubgroupState();
    const firstConfig = ANCHOR_STRATEGY_GROUP_CONFIGS[0];
    anchorStrategyActiveTab = firstConfig ? firstConfig.mode : 'per_number';
    const selectedUsers = getEditableUsersForCurrentSelection();
    if (selectedUsers.length === 1) {
        anchorRuleTargetClientId = selectedUsers[0];
        noiseRuleTargetClientId = selectedUsers[0];
        amountUnitTargetClientId = selectedUsers[0];
    }
    const impactInput = document.getElementById('anchorImpactSampleInput');
    if (impactInput && !String(impactInput.value || '').trim()) {
        impactInput.value = (firstConfig && firstConfig.defaultSample) || '猴蛇狗都买10';
    }
    const noiseSampleInput = document.getElementById('noiseRuleSampleInput');
    if (noiseSampleInput && !String(noiseSampleInput.value || '').trim()) {
        noiseSampleInput.value = '01 02 03 各十 共30';
    }
    const amountUnitSampleInput = document.getElementById('amountUnitSampleInput');
    if (amountUnitSampleInput && !String(amountUnitSampleInput.value || '').trim()) {
        amountUnitSampleInput.value = '01*10块 23.24各5';
    }
    renderAnchorSubgroups();
    syncAnchorRuleScopeButtons();
    renderAnchorRuleClientSelect();
    handleAnchorRuleScopeChange();
    syncNoiseRuleScopeButtons();
    renderNoiseRuleClientSelect();
    handleNoiseRuleScopeChange();
    syncAmountUnitScopeButtons();
    renderAmountUnitClientSelect();
    handleAmountUnitScopeChange();
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
    renderRegionAccountingPolicyState();
    renderBlockedPlayKeywordState();
    renderAnchorImpactPreview();
    renderAnchorStrategyGuide();
}

function handleNoiseRuleScopeChange() {
    syncNoiseRuleScopeButtons();
    renderNoiseRuleClientSelect();
    const { scope, clientId } = getNoiseRuleContext();
    const enableRuleControls = !(scope === 'client' && !clientId);
    setNoiseRuleControlsEnabled(enableRuleControls);
    renderNoiseRuleScopeExplain(scope, clientId);
    renderNoiseRuleEditorState(scope, clientId);
    renderNoiseRuleList();
    renderNoiseRulePreview();
}

function handleAmountUnitScopeChange() {
    syncAmountUnitScopeButtons();
    renderAmountUnitClientSelect();
    const { scope, clientId } = getAmountUnitContext();
    const enableControls = !(scope === 'client' && !clientId);
    setAmountUnitControlsEnabled(enableControls);
    renderAmountUnitScopeExplain(scope, clientId);
    renderAmountUnitEditorState(scope, clientId);
    renderAmountUnitList();
    renderAmountUnitPreview();
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

function renderNoiseRuleScopeExplain(scope, clientId) {
    const explainEl = document.getElementById('noiseRuleScopeExplain');
    if (!explainEl) return;
    const currentScope = scope === 'client' ? 'client' : 'global';
    const currentClientId = String(clientId || '').trim();
    explainEl.className = 'anchor-scope-explain';
    if (currentScope === 'client') {
        if (!currentClientId) {
            explainEl.classList.add('is-warning');
            explainEl.textContent = '当前选择：仅修改客户层。请先选择客户后再保存；该规则只对该客户生效。';
            return;
        }
        explainEl.classList.add('is-client');
        explainEl.textContent = `当前选择：仅修改客户「${currentClientId}」。保存后只对该客户生效，并优先于全局与系统默认规则。`;
        return;
    }
    explainEl.classList.add('is-global');
    explainEl.textContent = '当前选择：修改全部客户范围。保存后对所有客户生效；若某客户有专属噪音规则，会以客户规则优先。';
}

function renderAmountUnitScopeExplain(scope, clientId) {
    const explainEl = document.getElementById('amountUnitScopeExplain');
    if (!explainEl) return;
    const currentScope = scope === 'client' ? 'client' : 'global';
    const currentClientId = String(clientId || '').trim();
    explainEl.className = 'anchor-scope-explain';
    if (currentScope === 'client') {
        if (!currentClientId) {
            explainEl.classList.add('is-warning');
            explainEl.textContent = '当前选择：仅修改客户层。请先选择客户后再保存；该单位只对该客户的消息解析生效。';
            return;
        }
        explainEl.classList.add('is-client');
        explainEl.textContent = `当前选择：仅修改客户「${currentClientId}」。保存后只对该客户生效，并优先于全局与系统默认金额单位。`;
        return;
    }
    explainEl.classList.add('is-global');
    explainEl.textContent = '当前选择：修改全部客户范围。保存后对所有客户生效；若某客户有专属金额单位，会以客户规则优先。';
}

function getAnchorParseModeExplainMeta(mode) {
    if (mode === 'loose') {
        return {
            effect: '宽松模式：未写锚点词时也尝试补锚点，识别更快，但建议复核。',
            example: '例：`09.21 10元` 也可能直接入账为标准格式。'
        };
    }
    return {
        effect: '严格模式：必须出现锚点词（如“各/各号/买”）才入账，结果更稳。',
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

function getRegionAccountingModeLabel(mode) {
    return mode === 'merged' ? '不分盘口，统一入账' : '按盘口区分统计';
}

function parseRegionAliasInputValue(rawValue = '') {
    return String(rawValue || '')
        .split(/[\n,，、]/)
        .map(item => item.replace(/\s+/g, '').trim())
        .filter(Boolean);
}

function formatRegionAliasList(tokens = []) {
    return (Array.isArray(tokens) ? tokens : [])
        .map(item => String(item || '').trim())
        .filter(Boolean)
        .join('、');
}

function collectRegionAliasInputs() {
    return {
        new_ao: parseRegionAliasInputValue(document.getElementById('regionAliasInput_new_ao')?.value || ''),
        old_ao: parseRegionAliasInputValue(document.getElementById('regionAliasInput_old_ao')?.value || ''),
        hongkong: parseRegionAliasInputValue(document.getElementById('regionAliasInput_hongkong')?.value || '')
    };
}

function normalizeBlockedPlayKeywordInputToken(token) {
    if (window.messageProcessor && typeof window.messageProcessor.normalizeBlockedPlayKeywordToken === 'function') {
        return String(window.messageProcessor.normalizeBlockedPlayKeywordToken(token) || '').trim();
    }
    return String(token || '').replace(/\s+/g, '').trim();
}

function parseBlockedPlayKeywordInputValue(rawValue = '') {
    return String(rawValue || '')
        .split(/[\n,，、]/)
        .map(item => normalizeBlockedPlayKeywordInputToken(item))
        .filter(Boolean);
}

function collectBlockedPlayKeywordInputs() {
    return {
        pingte_xiao: parseBlockedPlayKeywordInputValue(document.getElementById('blockedPlayKeywordInput_pingte_xiao')?.value || ''),
        lian_play: parseBlockedPlayKeywordInputValue(document.getElementById('blockedPlayKeywordInput_lian_play')?.value || '')
    };
}

function formatBlockedPlayKeywordList(tokens = []) {
    return (Array.isArray(tokens) ? tokens : [])
        .map(item => normalizeBlockedPlayKeywordInputToken(item))
        .filter(Boolean)
        .join('、');
}

function getBlockedPlayKeywordFamilyLabel(family) {
    if (family === 'pingte_xiao') return '平特类';
    if (family === 'te_xiao') return '特肖类';
    if (family === 'yi_xiao') return '一肖类';
    if (family === 'lian_play') return '连肖/连码类';
    return '玩法类';
}

function getRegionAccountingPolicyExplainMeta(info = {}) {
    const mode = String(info.mode || 'split').trim() === 'merged' ? 'merged' : 'split';
    const defaultRegionLabel = String(info.defaultRegionLabel || '新奥').trim() || '新奥';
    if (mode === 'merged') {
        return {
            effect: `不分盘口：消息里即使写了“新奥/老奥/香港”，最终也统一记到默认盘口 ${defaultRegionLabel}。`,
            example: '例：`香港09各10 老奥11各20` 会统一记到默认盘口，不拆分三个账本。'
        };
    }
    return {
        effect: '按盘口区分：消息里识别到的新奥/老奥/香港会分别入账；未写盘口时落到默认盘口。',
        example: '例：`香港09各10 老奥11各20` 会分别记到香港和老奥。'
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

function renderRegionAccountingPolicyExplain(info = {}) {
    const explainEl = document.getElementById('regionAccountingPolicyExplain');
    if (!explainEl) return;
    if (info.unavailable) {
        explainEl.innerHTML = `<div class="anchor-policy-explain-line">${escapeHtml(info.message || '当前无法读取盘口规则说明')}</div>`;
        return;
    }
    const meta = getRegionAccountingPolicyExplainMeta(info);
    const aliasLines = ['new_ao', 'old_ao', 'hongkong']
        .map((regionKey) => {
            const label = window.userManager && typeof window.userManager.getRegionLabel === 'function'
                ? window.userManager.getRegionLabel(regionKey)
                : regionKey;
            const tokens = info.effectiveRegionAliases && Array.isArray(info.effectiveRegionAliases[regionKey])
                ? info.effectiveRegionAliases[regionKey]
                : [];
            if (!tokens.length) return '';
            return `<div class="anchor-policy-explain-line">${escapeHtml(`${label}识别词：${formatRegionAliasList(tokens)}`)}</div>`;
        })
        .filter(Boolean)
        .join('');
    explainEl.innerHTML = `
        <div class="anchor-policy-explain-current">当前生效：${escapeHtml(getRegionAccountingModeLabel(info.mode))}（来源：${escapeHtml(info.modeSourceLabel || '-')})</div>
        <div class="anchor-policy-explain-line">统一入账盘口：${escapeHtml(info.defaultRegionLabel || '新奥')}（来源：${escapeHtml(info.defaultRegionSourceLabel || '-')})</div>
        <div class="anchor-policy-explain-line">效果：${escapeHtml(meta.effect)}</div>
        <div class="anchor-policy-explain-line">${escapeHtml(meta.example)}</div>
        ${aliasLines}
    `;
}

function renderBlockedPlayKeywordExplain(info = {}) {
    const explainEl = document.getElementById('blockedPlayKeywordExplain');
    if (!explainEl) return;
    if (info.unavailable) {
        explainEl.innerHTML = `<div class="anchor-policy-explain-line">${escapeHtml(info.message || '当前无法读取未开放玩法关键词说明')}</div>`;
        return;
    }
    const lines = Array.isArray(info.lines) ? info.lines.filter(Boolean) : [];
    explainEl.innerHTML = `
        <div class="anchor-policy-explain-current">当前生效：命中这些关键词后，会按“未开放玩法”拦截，不参与号码统计。</div>
        <div class="anchor-policy-explain-line">适用场景：避免“平/连肖/二连/三连/复式连肖”这类消息被误统进普通号码单。</div>
        ${lines.map(line => `<div class="anchor-policy-explain-line">${escapeHtml(line)}</div>`).join('')}
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
        if (scope === 'client'
            && clientId
            && window.userManager
            && typeof window.userManager.syncUserSettlementOddsFromRule === 'function') {
            window.userManager.syncUserSettlementOddsFromRule(clientId, odds, {
                render: false,
                save: false
            });
        }
        renderDefaultOddsState();
        renderAnchorAliasList();
        renderAnchorImpactPreview();
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
        if (scope === 'client'
            && clientId
            && window.userManager
            && typeof window.userManager.syncUserSettlementOddsFromRule === 'function'
            && typeof window.messageProcessor.getEffectiveDefaultOdds === 'function') {
            const effectiveOdds = Number(window.messageProcessor.getEffectiveDefaultOdds(clientId));
            if (Number.isFinite(effectiveOdds) && effectiveOdds > 0) {
                window.userManager.syncUserSettlementOddsFromRule(clientId, effectiveOdds, {
                    render: false,
                    save: false
                });
            }
        }
        renderDefaultOddsState();
        renderAnchorAliasList();
        renderAnchorImpactPreview();
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
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}解析模式已保存：${getAnchorParseModeLabel(mode)}`);
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
    renderAnchorAliasList();
    renderAnchorImpactPreview();
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

function collectPreviewDisplayEntries(result) {
    if (!result || typeof result !== 'object') return [];
    const combined = [];
    const appendEntries = (rows, kind) => {
        (Array.isArray(rows) ? rows : []).forEach((entry) => {
            combined.push({
                kind,
                order: Number.isFinite(Number(entry && entry.parseOrder)) ? Number(entry.parseOrder) : Number.MAX_SAFE_INTEGER,
                entry
            });
        });
    };
    appendEntries(result.entries, 'standard');
    appendEntries(result.playEntries, 'play');
    return combined
        .sort((left, right) => {
            const leftLine = Number.parseInt(left && left.entry && left.entry.lineNo, 10);
            const rightLine = Number.parseInt(right && right.entry && right.entry.lineNo, 10);
            const safeLeftLine = Number.isFinite(leftLine) ? leftLine : Number.MAX_SAFE_INTEGER;
            const safeRightLine = Number.isFinite(rightLine) ? rightLine : Number.MAX_SAFE_INTEGER;
            if (safeLeftLine !== safeRightLine) {
                return safeLeftLine - safeRightLine;
            }
            const leftSegment = Number.parseInt(left && left.entry && left.entry.segmentNo, 10);
            const rightSegment = Number.parseInt(right && right.entry && right.entry.segmentNo, 10);
            const safeLeftSegment = Number.isFinite(leftSegment) ? leftSegment : Number.MAX_SAFE_INTEGER;
            const safeRightSegment = Number.isFinite(rightSegment) ? rightSegment : Number.MAX_SAFE_INTEGER;
            if (safeLeftSegment !== safeRightSegment) {
                return safeLeftSegment - safeRightSegment;
            }
            return left.order - right.order;
        })
        .map(item => item.entry)
        .filter(Boolean);
}

function collectPreviewStandardEntries(result) {
    if (!result || typeof result !== 'object') return [];
    return Array.isArray(result.entries) ? result.entries.filter(Boolean) : [];
}

function collectPreviewPlayEntries(result) {
    if (!result || typeof result !== 'object') return [];
    return Array.isArray(result.playEntries) ? result.playEntries.filter(Boolean) : [];
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

    const result = (previewResult || {}).result || {};
    const entries = collectPreviewStandardEntries(result);
    const playEntries = collectPreviewPlayEntries(result);
    if (!entries.length && !playEntries.length) {
        return '<div class="anchor-impact-empty">样例消息没有生成有效下注结果。</div>';
    }

    const canonicals = entries
        .map(item => String(item && item.canonical ? item.canonical : '').trim())
        .filter(Boolean);
    const totalAmount = entries.reduce((sum, entry) => {
        const amount = Number(entry && entry.totalAmount != null ? entry.totalAmount : NaN);
        return Number.isFinite(amount) ? sum + amount : sum;
    }, 0);
    if (entries.length === 0 && playEntries.length > 0) {
        return `
            <div class="anchor-impact-error">
                <div class="anchor-impact-error-title">检测到未开放玩法</div>
                <div class="anchor-impact-error-msg">${playEntries.map(item => escapeHtml(String(item && item.canonical ? item.canonical : item && item.rawText ? item.rawText : '').trim())).filter(Boolean).join('<br>')}</div>
            </div>
        `;
    }
    return `
        <div class="anchor-impact-success">
            <div class="anchor-impact-success-title">标准格式（${canonicals.length}条，合计${formatNumericAmount(totalAmount)}）</div>
            <div class="anchor-impact-success-list">${canonicals.map(item => `<div>${escapeHtml(item)}</div>`).join('')}</div>
        </div>
    ` + (playEntries.length > 0 ? `
        <div class="anchor-impact-error" style="margin-top:12px;">
            <div class="anchor-impact-error-title">检测到未开放玩法（不参与号码统计）</div>
            <div class="anchor-impact-error-msg">${playEntries.map(item => escapeHtml(String(item && item.canonical ? item.canonical : item && item.rawText ? item.rawText : '').trim())).filter(Boolean).join('<br>')}</div>
        </div>
    ` : '');
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

function applyNoiseRuleExample() {
    const sampleInput = document.getElementById('noiseRuleSampleInput');
    if (!sampleInput) return;
    const selectedPreview = getNoiseRulePreviewSelection();
    if (selectedPreview.pattern) {
        applyNoiseRulePreviewSample(selectedPreview.pattern, { clientId: selectedPreview.clientId });
    } else {
        sampleInput.value = '01 02 03 各十 共30';
    }
    renderNoiseRulePreview();
}

function resetNoiseRulePatternInput() {
    const input = document.getElementById('noiseRulePatternInput');
    if (input) {
        input.value = '';
    }
    noiseRuleEditorState.editPattern = '';
    noiseRuleEditorState.editSource = '';
    noiseRuleEditorState.editClientId = '';
    clearNoiseRulePreviewSelection();
    renderNoiseRuleEditorState();
    renderNoiseRuleList();
    renderNoiseRulePreview();
}

function fillNoiseRulePattern(pattern, source = '', clientId = '') {
    const input = document.getElementById('noiseRulePatternInput');
    if (!input) return;
    const normalizedPattern = normalizeNoiseRulePatternInput(pattern) || String(pattern || '').trim();
    input.value = normalizedPattern;
    noiseRuleEditorState.editPattern = normalizedPattern;
    noiseRuleEditorState.editSource = String(source || '').trim();
    noiseRuleEditorState.editClientId = String(clientId || '').trim();
    if (source) {
        selectNoiseRulePreview(normalizedPattern, source, clientId);
        applyNoiseRulePreviewSample(normalizedPattern, { clientId });
    } else {
        clearNoiseRulePreviewSelection();
    }
    input.focus();
    input.select();
    renderNoiseRuleEditorState();
    renderNoiseRuleList();
    renderNoiseRulePreview();
}

function renderNoiseRuleEditorState(scope = null, clientId = null) {
    const stateEl = document.getElementById('noiseRuleEditorState');
    const input = document.getElementById('noiseRulePatternInput');
    if (!stateEl) return;
    const context = scope == null ? getNoiseRuleContext() : {
        scope: scope === 'client' ? 'client' : 'global',
        clientId: String(clientId || '').trim()
    };
    const pattern = input ? String(input.value || '').trim() : '';
    stateEl.className = 'anchor-policy-state';
    if (context.scope === 'client' && !context.clientId) {
        stateEl.classList.add('is-warning');
        stateEl.textContent = '当前是客户层，但还没选客户；请先选择客户后再保存噪音规则。';
        return;
    }
    if (!pattern) {
        stateEl.textContent = context.scope === 'client'
            ? `当前保存范围：客户「${context.clientId}」层。可输入固定文本或 ${getNoiseRuleAmountPlaceholder()} 模板。`
            : `当前保存范围：全局层。可输入固定文本或 ${getNoiseRuleAmountPlaceholder()} 模板。`;
        return;
    }
    stateEl.classList.add('is-draft');
    stateEl.textContent = context.scope === 'client'
        ? `准备保存到客户「${context.clientId}」层：${pattern}`
        : `准备保存到全局层：${pattern}`;
}

function buildNoiseRuleExamples(pattern) {
    const normalized = normalizeNoiseRulePatternInput(pattern);
    if (!normalized) return [];
    const placeholder = getNoiseRuleAmountPlaceholder();
    if (normalized.includes(placeholder)) {
        return [
            normalized.replace(new RegExp(escapeRegExp(placeholder), 'g'), '30'),
            normalized.replace(new RegExp(escapeRegExp(placeholder), 'g'), '40'),
            normalized.replace(new RegExp(escapeRegExp(placeholder), 'g'), '五十')
        ];
    }
    const supportsImplicitAmountSuffix = window.messageProcessor
        && typeof window.messageProcessor.supportsImplicitAmountSuffixForNoisePattern === 'function'
        ? window.messageProcessor.supportsImplicitAmountSuffixForNoisePattern(normalized)
        : !/[0-9０-９零〇一二两三四五六七八九十百千万]/.test(normalized);
    if (supportsImplicitAmountSuffix) {
        return [
            normalized,
            `${normalized}30`,
            `${normalized} 40`
        ];
    }
    return [normalized];
}

function collectNoisePreviewCandidateEntries(sample) {
    const normalizedSample = String(sample || '').trim();
    if (!normalizedSample) return [];
    const entries = [];
    const seen = new Set();
    const pushEntry = (value, startIndex) => {
        const text = String(value || '').trim();
        const start = Number.isInteger(startIndex) ? startIndex : normalizedSample.indexOf(text);
        if (!text || start < 0) return;
        const key = `${start}:${text}`;
        if (seen.has(key)) return;
        seen.add(key);
        entries.push({ text, startIndex: start });
    };

    pushEntry(normalizedSample, 0);
    normalizedSample.split(/\r?\n/).forEach((line) => {
        const trimmedLine = String(line || '').trim();
        if (!trimmedLine) return;
        const lineStart = normalizedSample.indexOf(trimmedLine);
        pushEntry(trimmedLine, lineStart);
        const boundaryRegex = /[\s,，;；|｜]+/g;
        let match = null;
        while ((match = boundaryRegex.exec(trimmedLine))) {
            const suffix = trimmedLine.slice(match.index + match[0].length);
            const suffixStart = lineStart + match.index + match[0].length;
            pushEntry(suffix, suffixStart);
        }
    });

    return entries;
}

function collectNoisePreviewCandidates(sample) {
    return collectNoisePreviewCandidateEntries(sample).map(item => item.text);
}

function buildNoiseRulePreviewExampleText(pattern) {
    const examples = buildNoiseRuleExamples(pattern);
    if (!examples.length) return '';
    const preferred = examples.find(example => /[0-9０-９零〇一二两三四五六七八九十百千万]/.test(String(example || '').trim()));
    return String(preferred || examples[0] || '').trim();
}

function findExistingNoiseFragmentInSample(sample, clientId = '') {
    if (!window.messageProcessor) return null;
    const selectedPreview = getNoiseRulePreviewSelection();
    const selectedPattern = normalizeNoiseRulePatternInput(selectedPreview.pattern);
    const draftPattern = normalizeNoiseRulePatternInput(document.getElementById('noiseRulePatternInput')?.value || '');
    const entries = collectNoisePreviewCandidateEntries(sample);
    const canMatchRule = typeof window.messageProcessor.matchesNoiseRule === 'function';
    const canFindSaved = typeof window.messageProcessor.findMatchingNoiseRule === 'function';
    const canCheckSummary = typeof window.messageProcessor.isSummaryLine === 'function';

    let best = null;
    entries.forEach((entry) => {
        if (!entry || !entry.text) return;
        let matched = false;
        if (selectedPattern && canMatchRule && window.messageProcessor.matchesNoiseRule(entry.text, selectedPattern)) {
            matched = true;
        } else if (draftPattern && canMatchRule && window.messageProcessor.matchesNoiseRule(entry.text, draftPattern)) {
            matched = true;
        } else if (canFindSaved && window.messageProcessor.findMatchingNoiseRule(entry.text, { clientId })) {
            matched = true;
        } else if (canCheckSummary && window.messageProcessor.isSummaryLine(entry.text)) {
            matched = true;
        }
        if (!matched) return;
        if (!best || entry.startIndex > best.startIndex || (entry.startIndex === best.startIndex && entry.text.length > best.text.length)) {
            best = entry;
        }
    });
    return best;
}

function applyNoiseRulePreviewSample(pattern, options = {}) {
    const sampleInput = document.getElementById('noiseRuleSampleInput');
    if (!sampleInput) return;
    const exampleText = buildNoiseRulePreviewExampleText(pattern);
    if (!exampleText) return;
    const currentSample = String(sampleInput.value || '').trim();
    const previewClientId = String(options.clientId || getNoiseRulePreviewClientIdByContext() || '').trim();
    const existingFragment = findExistingNoiseFragmentInSample(currentSample, previewClientId);
    let prefix = currentSample;
    if (existingFragment && Number.isInteger(existingFragment.startIndex)) {
        prefix = currentSample.slice(0, existingFragment.startIndex).trim();
    } else {
        prefix = currentSample.trim();
    }
    if (!prefix) {
        prefix = '01 02 03 各十';
    }
    sampleInput.value = `${prefix} ${exampleText}`.trim();
}

function findNoisePreviewMatch(sample, clientId = '', options = {}) {
    if (!window.messageProcessor) return null;
    const selectedPattern = normalizeNoiseRulePatternInput(options && options.selectedPattern ? options.selectedPattern : '');
    const selectedSource = String(options && options.selectedSource ? options.selectedSource : '').trim();
    const draftPattern = normalizeNoiseRulePatternInput(document.getElementById('noiseRulePatternInput')?.value || '');
    const candidates = collectNoisePreviewCandidates(sample);
    const canMatchRule = typeof window.messageProcessor.matchesNoiseRule === 'function';
    const canFindSaved = typeof window.messageProcessor.findMatchingNoiseRule === 'function';
    const canCheckSummary = typeof window.messageProcessor.isSummaryLine === 'function';

    if (selectedPattern) {
        for (const candidate of candidates) {
            if (canMatchRule && window.messageProcessor.matchesNoiseRule(candidate, selectedPattern)) {
                return {
                    kind: 'selected',
                    pattern: selectedPattern,
                    source: selectedSource,
                    fragment: candidate
                };
            }
        }
        return {
            kind: 'selected_pending',
            pattern: selectedPattern,
            source: selectedSource,
            fragment: ''
        };
    }

    for (const candidate of candidates) {
        if (draftPattern && canMatchRule && window.messageProcessor.matchesNoiseRule(candidate, draftPattern)) {
            return { kind: 'draft', pattern: draftPattern, fragment: candidate };
        }
        if (canFindSaved) {
            const savedPattern = String(window.messageProcessor.findMatchingNoiseRule(candidate, { clientId }) || '').trim();
            if (savedPattern) {
                return { kind: 'saved', pattern: savedPattern, fragment: candidate };
            }
        }
        if (canCheckSummary && window.messageProcessor.isSummaryLine(candidate)) {
            return { kind: 'summary', fragment: candidate };
        }
    }

    if (draftPattern) {
        return { kind: 'draft_pending', pattern: draftPattern, fragment: '' };
    }
    return null;
}

function refreshNoiseRuleWorkspace(options = {}) {
    if (options && options.resetEditor) {
        resetNoiseRulePatternInput();
    } else {
        renderNoiseRuleEditorState();
    }
    renderNoiseRuleList();
    renderNoiseRulePreview();
    refreshRegionPnlPanel();
}

function renderNoiseRulePreview() {
    const output = document.getElementById('noiseRulePreview');
    const sampleInput = document.getElementById('noiseRuleSampleInput');
    if (!output || !sampleInput) return;
    const sample = String(sampleInput.value || '').trim();
    if (!sample) {
        output.innerHTML = '<div class="anchor-impact-empty">请输入样例后查看噪音规则预览。</div>';
        return;
    }
    if (!window.messageProcessor) {
        output.innerHTML = '<div class="anchor-impact-empty">当前版本不支持噪音规则预览。</div>';
        return;
    }
    const previewClientId = getNoiseRulePreviewClientIdByContext();
    const selectedPreview = getNoiseRulePreviewSelection();
    const matchDetail = findNoisePreviewMatch(sample, previewClientId, {
        selectedPattern: selectedPreview.pattern,
        selectedSource: selectedPreview.source,
        selectedClientId: selectedPreview.clientId
    });

    let preview = null;
    if (typeof window.messageProcessor.previewMessage === 'function') {
        preview = window.messageProcessor.previewMessage(sample, { clientId: previewClientId });
    }

    let matchedHtml = '';
    if (matchDetail && matchDetail.kind === 'selected') {
        matchedHtml = `
            <div class="noise-rule-preview-tip success">
                当前选中规则已命中：<span class="mono">${escapeHtml(matchDetail.pattern)}</span>
                ${matchDetail.fragment && matchDetail.fragment !== sample ? `<div class="noise-rule-preview-fragment">命中片段：${escapeHtml(matchDetail.fragment)}</div>` : ''}
            </div>
        `;
    } else if (matchDetail && matchDetail.kind === 'selected_pending') {
        matchedHtml = `
            <div class="noise-rule-preview-tip neutral">
                当前选中规则未命中样例：<span class="mono">${escapeHtml(matchDetail.pattern)}</span>
            </div>
        `;
    } else if (matchDetail && matchDetail.kind === 'draft') {
        matchedHtml = `
            <div class="noise-rule-preview-tip success">
                当前输入模板已命中：<span class="mono">${escapeHtml(matchDetail.pattern)}</span>
                ${matchDetail.fragment && matchDetail.fragment !== sample ? `<div class="noise-rule-preview-fragment">命中片段：${escapeHtml(matchDetail.fragment)}</div>` : ''}
            </div>
        `;
    } else if (matchDetail && matchDetail.kind === 'saved') {
        matchedHtml = `
            <div class="noise-rule-preview-tip success">
                命中已保存噪音规则：<span class="mono">${escapeHtml(matchDetail.pattern)}</span>
                ${matchDetail.fragment && matchDetail.fragment !== sample ? `<div class="noise-rule-preview-fragment">命中片段：${escapeHtml(matchDetail.fragment)}</div>` : ''}
            </div>
        `;
    } else if (matchDetail && matchDetail.kind === 'summary') {
        matchedHtml = `
            <div class="noise-rule-preview-tip neutral">
                命中内置摘要忽略规则：该片段不会参与入账。
                ${matchDetail.fragment && matchDetail.fragment !== sample ? `<div class="noise-rule-preview-fragment">命中片段：${escapeHtml(matchDetail.fragment)}</div>` : ''}
            </div>
        `;
    } else if (matchDetail && matchDetail.kind === 'draft_pending') {
        matchedHtml = `
            <div class="noise-rule-preview-tip neutral">
                当前输入模板尚未命中样例：<span class="mono">${escapeHtml(matchDetail.pattern)}</span>
            </div>
        `;
    }

    if (matchDetail && matchDetail.kind === 'selected_pending') {
        output.innerHTML = `
            ${matchedHtml}
            <div class="anchor-impact-error-title">当前选中规则不会忽略这段样例</div>
            <div class="anchor-impact-error-msg">请更换样例，或点击左侧其他噪音规则继续预览。</div>
        `;
        return;
    }

    if (preview && preview.success) {
        output.innerHTML = `
            ${matchedHtml}
            <div class="noise-rule-preview-tip neutral">如果标准格式中没有原文尾巴，说明尾部噪音已被忽略或未参与入账。</div>
            ${buildAnchorPreviewResultHtml(preview)}
        `;
        return;
    }

    if (matchDetail && ['selected', 'draft', 'saved', 'summary'].includes(matchDetail.kind)) {
        output.innerHTML = `
            ${matchedHtml}
            <div class="anchor-impact-success">
                <div class="anchor-impact-success-title">该片段会被忽略</div>
                <div class="anchor-impact-success-list">
                    <div>${escapeHtml(matchDetail.fragment || sample)}</div>
                </div>
            </div>
        `;
        return;
    }

    const errorText = preview && preview.error ? preview.error : '当前样例不会被噪音规则忽略，且未形成有效下注。';
    output.innerHTML = `
        <div class="anchor-impact-error-title">当前不会被忽略</div>
        <div class="anchor-impact-error-msg">${escapeHtml(errorText)}</div>
    `;
}

function copyNoiseRulesToClient(rows) {
    try {
        if (!Array.isArray(rows) || rows.length === 0) return;
        if (!window.messageProcessor || typeof window.messageProcessor.upsertNoiseRule !== 'function') {
            throw new Error('当前版本不支持噪音规则');
        }
        const { scope, clientId } = getNoiseRuleContext({ requireClientForClientScope: true });
        if (scope !== 'client' || !clientId) {
            throw new Error('请先切换到客户专属规则后再复制');
        }
        rows.forEach((row) => {
            const pattern = String(row && row.pattern ? row.pattern : '').trim();
            if (!pattern) return;
            window.messageProcessor.upsertNoiseRule(pattern, { scope: 'client', clientId });
        });
        recalculateAllUsersByRuleChange();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        }
        refreshNoiseRuleWorkspace();
        previewMessage({ silent: true });
        showSuccess(`已复制 ${rows.length} 条噪音规则到客户 ${clientId}`);
    } catch (error) {
        showError('复制噪音规则失败', error.message || '未知错误');
    }
}

function removeNoiseRulePattern(pattern) {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.removeNoiseRule !== 'function') {
            throw new Error('当前版本不支持噪音规则');
        }
        const { scope, clientId } = getNoiseRuleContext({ requireClientForClientScope: true });
        const normalizedPattern = String(pattern || '').trim();
        const input = document.getElementById('noiseRulePatternInput');
        const currentInputPattern = input ? String(input.value || '').trim() : '';
        const shouldResetEditor = currentInputPattern === normalizedPattern;
        if (!normalizedPattern) {
            throw new Error('缺少噪音规则内容');
        }
        window.messageProcessor.removeNoiseRule(normalizedPattern, { scope, clientId });
        if (shouldResetEditor) {
            noiseRuleEditorState.editPattern = '';
            noiseRuleEditorState.editSource = '';
            noiseRuleEditorState.editClientId = '';
        }
        recalculateAllUsersByRuleChange();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        }
        refreshNoiseRuleWorkspace({ resetEditor: shouldResetEditor });
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}噪音规则已删除：${normalizedPattern}`);
    } catch (error) {
        showError('删除噪音规则失败', error.message || '未知错误');
    }
}

function saveNoiseRulePattern() {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.upsertNoiseRule !== 'function') {
            throw new Error('当前版本不支持噪音规则');
        }
        const { scope, clientId } = getNoiseRuleContext({ requireClientForClientScope: true });
        const input = document.getElementById('noiseRulePatternInput');
        const pattern = input ? String(input.value || '').trim() : '';
        const result = window.messageProcessor.upsertNoiseRule(pattern, { scope, clientId });
        recalculateAllUsersByRuleChange();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        }
        refreshNoiseRuleWorkspace({ resetEditor: true });
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}噪音规则已保存：${result.pattern}`);
    } catch (error) {
        showError('保存噪音规则失败', error.message || '未知错误');
    }
}

function renderNoiseRuleList() {
    const list = document.getElementById('noiseRuleList');
    if (!list) return;
    list.innerHTML = '';

    if (!window.messageProcessor || typeof window.messageProcessor.getNoiseRuleRows !== 'function') {
        const empty = document.createElement('div');
        empty.className = 'anchor-alias-empty';
        empty.textContent = '当前版本不支持噪音规则';
        list.appendChild(empty);
        return;
    }

    const { scope, clientId } = getNoiseRuleContext();
    if (scope === 'client' && !clientId) {
        const empty = document.createElement('div');
        empty.className = 'anchor-alias-empty';
        empty.textContent = '请选择目标客户后再查看/编辑客户专属噪音规则';
        list.appendChild(empty);
        return;
    }

    const rows = window.messageProcessor.getNoiseRuleRows({ clientId });
    const allRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
    const currentSelection = getNoiseRulePreviewSelection();
    if (currentSelection.pattern && !allRows.some((row) => isNoiseRulePreviewSelected(row, currentSelection))) {
        clearNoiseRulePreviewSelection();
    }
    const activeSelection = getNoiseRulePreviewSelection();
    const filterState = getNoiseRuleFilterState();
    const targetSource = scope === 'client' ? 'client' : 'global';
    const displayRows = allRows.filter((row) => {
        if (!row) return false;
        if (filterState.source !== 'all' && row.source !== filterState.source) return false;
        if (!filterState.keyword) return true;
        const haystack = [
            row.pattern,
            getAnchorAliasSourceLabel(row.source, scope),
            ...buildNoiseRuleExamples(row.pattern)
        ]
            .map(item => String(item || '').toLowerCase())
            .join(' ');
        return haystack.includes(filterState.keyword);
    });

    const container = document.createElement('div');
    container.className = 'anchor-strategy-lanes';

    const intro = document.createElement('div');
    intro.className = 'anchor-strategy-current-intro';
    intro.innerHTML = `
        <div class="anchor-strategy-current-title">模式型噪音忽略</div>
        <div class="anchor-strategy-current-summary">适合忽略统计尾巴、摘要尾巴、图片 OCR 多余尾句。固定词如“总共”会命中“总共30”；需要更明确时可用模板：共{金额}、合计{金额}。</div>
        <ul class="anchor-strategy-current-examples">
            <li>总共 => 命中 总共30 / 总共 40</li>
            <li>共{金额} => 命中 共30 / 共 40 / 共五十</li>
            <li>合计{金额} => 命中 合计30 / 合计30元</li>
            <li>只会忽略匹配到的片段，不会把真正的锚点词误删</li>
        </ul>
    `;
    container.appendChild(intro);

    ANCHOR_SOURCE_DISPLAY_ORDER.forEach((sourceKey) => {
        const laneRows = displayRows.filter(row => row.source === sourceKey);
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
        if (laneRows.length > 0 && scope === 'client' && sourceKey !== 'client') {
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'anchor-lane-action-btn';
            copyBtn.textContent = '复制到客户层';
            copyBtn.addEventListener('click', () => copyNoiseRulesToClient(laneRows));
            right.appendChild(copyBtn);
        }
        laneHead.appendChild(left);
        laneHead.appendChild(right);
        lane.appendChild(laneHead);

        if (laneRows.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'anchor-alias-empty';
            empty.textContent = '该来源暂无匹配噪音规则';
            lane.appendChild(empty);
            container.appendChild(lane);
            return;
        }

        const cards = document.createElement('div');
        cards.className = 'anchor-strategy-source-rows';

        laneRows.forEach((row) => {
            const editable = row.source === targetSource;
            const card = document.createElement('div');
            const isSelected = isNoiseRulePreviewSelected(row, activeSelection);
            card.className = `anchor-strategy-rule-card previewable source-${row.source} ${editable ? '' : 'readonly'} ${isSelected ? 'is-selected' : ''} noise-rule-card`.trim();
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
            card.addEventListener('click', () => {
                selectNoiseRulePreview(row.pattern, row.source, row.clientId || '');
                applyNoiseRulePreviewSample(row.pattern, { clientId: row.clientId || '' });
                renderNoiseRuleList();
                renderNoiseRulePreview();
            });
            card.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                selectNoiseRulePreview(row.pattern, row.source, row.clientId || '');
                applyNoiseRulePreviewSample(row.pattern, { clientId: row.clientId || '' });
                renderNoiseRuleList();
                renderNoiseRulePreview();
            });

            const head = document.createElement('div');
            head.className = 'anchor-strategy-rule-head';
            const token = document.createElement('div');
            token.className = 'anchor-strategy-rule-token noise-rule-pattern';
            token.textContent = row.pattern;
            token.title = row.pattern;
            const stateChip = document.createElement('span');
            stateChip.className = 'anchor-rule-state-chip active';
            stateChip.textContent = '生效中';
            head.appendChild(token);
            head.appendChild(stateChip);

            const desc = document.createElement('div');
            desc.className = 'anchor-strategy-rule-desc';
            const examples = buildNoiseRuleExamples(row.pattern);
            desc.innerHTML = `
                <div>模板规则：命中后该片段直接忽略，不参与入账。</div>
                <div class="noise-rule-card-meta">示例：${escapeHtml(examples.join(' / '))}</div>
            `;

            const footer = document.createElement('div');
            footer.className = 'anchor-strategy-rule-footer';
            const scopeText = document.createElement('div');
            scopeText.className = 'noise-rule-card-scope';
            scopeText.textContent = editable ? '当前层可编辑' : '继承层，只读';
            footer.appendChild(scopeText);

            const actionWrap = document.createElement('div');
            actionWrap.className = `anchor-alias-item-actions ${editable ? '' : 'readonly'}`.trim();
            if (editable) {
                const editBtn = document.createElement('button');
                editBtn.className = 'edit-button anchor-action-primary';
                editBtn.textContent = '编辑';
                editBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    fillNoiseRulePattern(row.pattern, row.source, row.clientId || '');
                });
                const removeBtn = document.createElement('button');
                removeBtn.className = 'cancel-button';
                removeBtn.textContent = '删除';
                removeBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    removeNoiseRulePattern(row.pattern);
                });
                actionWrap.appendChild(editBtn);
                actionWrap.appendChild(removeBtn);
            } else {
                const readonlyTag = document.createElement('span');
                readonlyTag.className = 'anchor-alias-readonly-tag';
                readonlyTag.textContent = '只读';
                actionWrap.appendChild(readonlyTag);
            }
            footer.appendChild(actionWrap);

            card.appendChild(head);
            card.appendChild(desc);
            card.appendChild(footer);
            cards.appendChild(card);
        });

        lane.appendChild(cards);
        container.appendChild(lane);
    });

    list.appendChild(container);
}

function applyAmountUnitExample() {
    const sampleInput = document.getElementById('amountUnitSampleInput');
    if (!sampleInput) return;
    const selectedPreview = getAmountUnitPreviewSelection();
    if (selectedPreview.token) {
        applyAmountUnitPreviewSample(selectedPreview.token, { clientId: selectedPreview.clientId });
    } else {
        sampleInput.value = '01*10块 23.24各5';
    }
    renderAmountUnitPreview();
}

function resetAmountUnitTokenInput() {
    const input = document.getElementById('amountUnitTokenInput');
    if (input) {
        input.value = '';
    }
    amountUnitEditorState.editToken = '';
    amountUnitEditorState.editSource = '';
    amountUnitEditorState.editClientId = '';
    clearAmountUnitPreviewSelection();
    renderAmountUnitEditorState();
    renderAmountUnitList();
    renderAmountUnitPreview();
}

function fillAmountUnitToken(token, source = '', clientId = '') {
    const input = document.getElementById('amountUnitTokenInput');
    if (!input) return;
    const normalizedToken = normalizeAmountUnitInput(token) || String(token || '').trim();
    input.value = normalizedToken;
    amountUnitEditorState.editToken = normalizedToken;
    amountUnitEditorState.editSource = String(source || '').trim();
    amountUnitEditorState.editClientId = String(clientId || '').trim();
    if (source) {
        selectAmountUnitPreview(normalizedToken, source, clientId);
        applyAmountUnitPreviewSample(normalizedToken, { clientId });
    } else {
        clearAmountUnitPreviewSelection();
    }
    input.focus();
    input.select();
    renderAmountUnitEditorState();
    renderAmountUnitList();
    renderAmountUnitPreview();
}

function renderAmountUnitEditorState(scope = null, clientId = null) {
    const stateEl = document.getElementById('amountUnitEditorState');
    const input = document.getElementById('amountUnitTokenInput');
    if (!stateEl) return;
    const context = scope == null ? getAmountUnitContext() : {
        scope: scope === 'client' ? 'client' : 'global',
        clientId: String(clientId || '').trim()
    };
    const token = input ? normalizeAmountUnitInput(input.value) : '';
    stateEl.className = 'anchor-policy-state';
    if (context.scope === 'client' && !context.clientId) {
        stateEl.classList.add('is-warning');
        stateEl.textContent = '当前是客户层，但还没选客户；请先选择客户后再保存金额单位。';
        return;
    }
    if (!token) {
        stateEl.textContent = context.scope === 'client'
            ? `当前保存范围：客户「${context.clientId}」层。适合录入像“块 / 毛 / 闷”这种金额结尾词。`
            : '当前保存范围：全局层。适合录入像“元 / 块 / 米 / 毛”这种金额结尾词。';
        return;
    }
    stateEl.classList.add('is-draft');
    stateEl.textContent = context.scope === 'client'
        ? `准备保存到客户「${context.clientId}」层：${token}`
        : `准备保存到全局层：${token}`;
}

function buildAmountUnitExamples(token) {
    const normalizedToken = normalizeAmountUnitInput(token);
    if (!normalizedToken) return [];
    return [
        `01*10${normalizedToken}`,
        `01.10${normalizedToken}`,
        `23各五${normalizedToken}`
    ];
}

function buildAmountUnitPreviewExampleText(token) {
    const examples = buildAmountUnitExamples(token);
    return examples[0] || '';
}

function applyAmountUnitPreviewSample(token, options = {}) {
    const sampleInput = document.getElementById('amountUnitSampleInput');
    if (!sampleInput) return;
    const exampleText = buildAmountUnitPreviewExampleText(token);
    if (!exampleText) return;
    const suffixExample = buildAmountUnitExamples(token)[2] || `23各五${normalizeAmountUnitInput(token)}`;
    sampleInput.value = `${exampleText} ${suffixExample}`.trim();
}

function refreshAmountUnitWorkspace(options = {}) {
    if (options && options.resetEditor) {
        resetAmountUnitTokenInput();
        return;
    }
    renderAmountUnitEditorState();
    renderAmountUnitList();
    renderAmountUnitPreview();
}

function renderAmountUnitPreview() {
    const output = document.getElementById('amountUnitPreview');
    const sampleInput = document.getElementById('amountUnitSampleInput');
    if (!output || !sampleInput) return;
    const sample = String(sampleInput.value || '').trim();
    if (!sample) {
        output.innerHTML = '<div class="anchor-impact-empty">请输入样例后查看金额单位预览。</div>';
        return;
    }
    if (!window.messageProcessor || typeof window.messageProcessor.previewMessage !== 'function') {
        output.innerHTML = '<div class="anchor-impact-empty">当前版本不支持金额单位预览。</div>';
        return;
    }
    const previewClientId = getAmountUnitPreviewClientIdByContext();
    const selectedPreview = getAmountUnitPreviewSelection();
    const draftToken = normalizeAmountUnitInput(document.getElementById('amountUnitTokenInput')?.value || '');
    const draftContext = getAmountUnitContext();
    let tipHtml = '';
    if (selectedPreview.token) {
        tipHtml = `
            <div class="noise-rule-preview-tip neutral">
                当前选中金额单位：<span class="mono">${escapeHtml(selectedPreview.token)}</span>
            </div>
        `;
    } else if (draftToken) {
        tipHtml = `
            <div class="noise-rule-preview-tip neutral">
                当前输入金额单位：<span class="mono">${escapeHtml(draftToken)}</span>
            </div>
        `;
    }
    let preview = null;
    let simulatedDraft = false;
    if (!selectedPreview.token
        && draftToken
        && (draftContext.scope !== 'client' || draftContext.clientId)
        && typeof window.messageProcessor.getAttributeConfig === 'function'
        && typeof window.messageProcessor.setAttributeConfig === 'function') {
        const backupConfig = window.messageProcessor.getAttributeConfig();
        try {
            const tempConfig = JSON.parse(JSON.stringify(backupConfig || {}));
            if (draftContext.scope === 'client') {
                if (!tempConfig.clientRules || typeof tempConfig.clientRules !== 'object') {
                    tempConfig.clientRules = {};
                }
                if (!tempConfig.clientRules[draftContext.clientId] || typeof tempConfig.clientRules[draftContext.clientId] !== 'object') {
                    tempConfig.clientRules[draftContext.clientId] = {};
                }
                const currentUnits = Array.isArray(tempConfig.clientRules[draftContext.clientId].amountUnits)
                    ? tempConfig.clientRules[draftContext.clientId].amountUnits
                    : [];
                tempConfig.clientRules[draftContext.clientId].amountUnits = Array.from(new Set([
                    ...currentUnits,
                    draftToken
                ]));
            } else {
                if (!tempConfig.globalRules || typeof tempConfig.globalRules !== 'object') {
                    tempConfig.globalRules = {};
                }
                const currentUnits = Array.isArray(tempConfig.globalRules.amountUnits)
                    ? tempConfig.globalRules.amountUnits
                    : [];
                tempConfig.globalRules.amountUnits = Array.from(new Set([
                    ...currentUnits,
                    draftToken
                ]));
            }
            window.messageProcessor.setAttributeConfig(tempConfig);
            preview = window.messageProcessor.previewMessage(sample, { clientId: previewClientId });
            simulatedDraft = true;
        } catch (error) {
            preview = window.messageProcessor.previewMessage(sample, { clientId: previewClientId });
        } finally {
            try {
                window.messageProcessor.setAttributeConfig(backupConfig);
            } catch (restoreError) {
                // ignore
            }
        }
    } else {
        preview = window.messageProcessor.previewMessage(sample, { clientId: previewClientId });
    }
    if (preview && preview.success) {
        output.innerHTML = `
            ${tipHtml}
            <div class="noise-rule-preview-tip neutral">${simulatedDraft ? '当前结果按“保存后预期效果”预演。' : '如果标准格式里出现 01各10、23各五 这类结果，说明该金额单位已被识别。'}</div>
            ${buildAnchorPreviewResultHtml(preview)}
        `;
        return;
    }
    output.innerHTML = `
        ${tipHtml}
        <div class="anchor-impact-error-title">当前样例还没有识别成功</div>
        <div class="anchor-impact-error-msg">${escapeHtml(preview && preview.error ? preview.error : '该金额单位尚未形成有效下注')}</div>
    `;
}

function copyAmountUnitsToClient(rows) {
    try {
        if (!Array.isArray(rows) || rows.length === 0) return;
        if (!window.messageProcessor || typeof window.messageProcessor.upsertAmountUnit !== 'function') {
            throw new Error('当前版本不支持金额单位');
        }
        const { scope, clientId } = getAmountUnitContext({ requireClientForClientScope: true });
        if (scope !== 'client' || !clientId) {
            throw new Error('请先切换到客户专属后再复制');
        }
        rows.forEach((row) => {
            const token = normalizeAmountUnitInput(row && row.token ? row.token : '');
            if (!token) return;
            window.messageProcessor.upsertAmountUnit(token, { scope: 'client', clientId });
        });
        recalculateAllUsersByRuleChange();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        }
        refreshAmountUnitWorkspace();
        previewMessage({ silent: true });
        showSuccess(`已复制 ${rows.length} 个金额单位到客户 ${clientId}`);
    } catch (error) {
        showError('复制金额单位失败', error.message || '未知错误');
    }
}

function removeAmountUnitToken(token) {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.removeAmountUnit !== 'function') {
            throw new Error('当前版本不支持金额单位');
        }
        const { scope, clientId } = getAmountUnitContext({ requireClientForClientScope: true });
        const normalizedToken = normalizeAmountUnitInput(token);
        const input = document.getElementById('amountUnitTokenInput');
        const currentInputToken = normalizeAmountUnitInput(input ? input.value : '');
        const shouldResetEditor = currentInputToken === normalizedToken;
        if (!normalizedToken) {
            throw new Error('缺少金额单位内容');
        }
        window.messageProcessor.removeAmountUnit(normalizedToken, { scope, clientId });
        if (shouldResetEditor) {
            amountUnitEditorState.editToken = '';
            amountUnitEditorState.editSource = '';
            amountUnitEditorState.editClientId = '';
        }
        recalculateAllUsersByRuleChange();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        }
        refreshAmountUnitWorkspace({ resetEditor: shouldResetEditor });
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}金额单位已删除：${normalizedToken}`);
    } catch (error) {
        showError('删除金额单位失败', error.message || '未知错误');
    }
}

function saveAmountUnitToken() {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.upsertAmountUnit !== 'function') {
            throw new Error('当前版本不支持金额单位');
        }
        const { scope, clientId } = getAmountUnitContext({ requireClientForClientScope: true });
        const input = document.getElementById('amountUnitTokenInput');
        const token = input ? String(input.value || '').trim() : '';
        const result = window.messageProcessor.upsertAmountUnit(token, { scope, clientId });
        recalculateAllUsersByRuleChange();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        }
        refreshAmountUnitWorkspace({ resetEditor: true });
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}金额单位已保存：${result.token}`);
    } catch (error) {
        showError('保存金额单位失败', error.message || '未知错误');
    }
}

function renderAmountUnitList() {
    const list = document.getElementById('amountUnitList');
    if (!list) return;
    list.innerHTML = '';

    if (!window.messageProcessor || typeof window.messageProcessor.getAmountUnitRows !== 'function') {
        const empty = document.createElement('div');
        empty.className = 'anchor-alias-empty';
        empty.textContent = '当前版本不支持金额单位';
        list.appendChild(empty);
        return;
    }

    const { scope, clientId } = getAmountUnitContext();
    if (scope === 'client' && !clientId) {
        const empty = document.createElement('div');
        empty.className = 'anchor-alias-empty';
        empty.textContent = '请选择目标客户后再查看/编辑客户专属金额单位';
        list.appendChild(empty);
        return;
    }

    const rows = window.messageProcessor.getAmountUnitRows({ clientId });
    const allRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
    const currentSelection = getAmountUnitPreviewSelection();
    if (currentSelection.token && !allRows.some((row) => isAmountUnitPreviewSelected(row, currentSelection))) {
        clearAmountUnitPreviewSelection();
    }
    const activeSelection = getAmountUnitPreviewSelection();
    const filterState = getAmountUnitFilterState();
    const targetSource = scope === 'client' ? 'client' : 'global';
    const displayRows = allRows.filter((row) => {
        if (!row) return false;
        if (filterState.source !== 'all' && row.source !== filterState.source) return false;
        if (!filterState.keyword) return true;
        const haystack = [
            row.token,
            getAnchorAliasSourceLabel(row.source, scope),
            ...buildAmountUnitExamples(row.token)
        ]
            .map(item => String(item || '').toLowerCase())
            .join(' ');
        return haystack.includes(filterState.keyword);
    });

    const container = document.createElement('div');
    container.className = 'anchor-strategy-lanes';

    const intro = document.createElement('div');
    intro.className = 'anchor-strategy-current-intro';
    intro.innerHTML = `
        <div class="anchor-strategy-current-title">金额边界词表</div>
        <div class="anchor-strategy-current-summary">这些词告诉解析器“金额已经结束”。适合补齐 块 / 毛 / 角 / 分 / 闷 这类口语或客户自定义写法。</div>
        <ul class="anchor-strategy-current-examples">
            <li>块 => 命中 01*10块 / 23各五块</li>
            <li>毛 => 命中 01*10毛 / 23各五毛</li>
            <li>闷 => 仅当你确认它在当前客户里表示金额单位时再加</li>
            <li>这里只负责识别金额结尾，不会把它当锚点</li>
        </ul>
    `;
    container.appendChild(intro);

    ANCHOR_SOURCE_DISPLAY_ORDER.forEach((sourceKey) => {
        const laneRows = displayRows.filter(row => row.source === sourceKey);
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
        if (laneRows.length > 0 && scope === 'client' && sourceKey !== 'client') {
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'anchor-lane-action-btn';
            copyBtn.textContent = '复制到客户层';
            copyBtn.addEventListener('click', () => copyAmountUnitsToClient(laneRows));
            right.appendChild(copyBtn);
        }
        laneHead.appendChild(left);
        laneHead.appendChild(right);
        lane.appendChild(laneHead);

        if (laneRows.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'anchor-alias-empty';
            empty.textContent = '该来源暂无匹配金额单位';
            lane.appendChild(empty);
            container.appendChild(lane);
            return;
        }

        const cards = document.createElement('div');
        cards.className = 'anchor-strategy-source-rows';

        laneRows.forEach((row) => {
            const editable = row.source === targetSource;
            const card = document.createElement('div');
            const isSelected = isAmountUnitPreviewSelected(row, activeSelection);
            card.className = `anchor-strategy-rule-card previewable source-${row.source} ${editable ? '' : 'readonly'} ${isSelected ? 'is-selected' : ''} noise-rule-card`.trim();
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
            card.addEventListener('click', () => {
                selectAmountUnitPreview(row.token, row.source, row.clientId || '');
                applyAmountUnitPreviewSample(row.token, { clientId: row.clientId || '' });
                renderAmountUnitList();
                renderAmountUnitPreview();
            });
            card.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                selectAmountUnitPreview(row.token, row.source, row.clientId || '');
                applyAmountUnitPreviewSample(row.token, { clientId: row.clientId || '' });
                renderAmountUnitList();
                renderAmountUnitPreview();
            });

            const head = document.createElement('div');
            head.className = 'anchor-strategy-rule-head';
            const token = document.createElement('div');
            token.className = 'anchor-strategy-rule-token noise-rule-pattern';
            token.textContent = row.token;
            token.title = row.token;
            const stateChip = document.createElement('span');
            stateChip.className = 'anchor-rule-state-chip active';
            stateChip.textContent = '生效中';
            head.appendChild(token);
            head.appendChild(stateChip);

            const desc = document.createElement('div');
            desc.className = 'anchor-strategy-rule-desc';
            const examples = buildAmountUnitExamples(row.token);
            desc.innerHTML = `
                <div>金额单位：命中后用于识别金额结尾，不作为锚点参与分配。</div>
                <div class="noise-rule-card-meta">示例：${escapeHtml(examples.join(' / '))}</div>
            `;

            const footer = document.createElement('div');
            footer.className = 'anchor-strategy-rule-footer';
            const scopeText = document.createElement('div');
            scopeText.className = 'noise-rule-card-scope';
            scopeText.textContent = editable ? '当前层可编辑' : '继承层，只读';
            footer.appendChild(scopeText);

            const actionWrap = document.createElement('div');
            actionWrap.className = `anchor-alias-item-actions ${editable ? '' : 'readonly'}`.trim();
            if (editable) {
                const editBtn = document.createElement('button');
                editBtn.className = 'edit-button anchor-action-primary';
                editBtn.textContent = '编辑';
                editBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    fillAmountUnitToken(row.token, row.source, row.clientId || '');
                });
                const removeBtn = document.createElement('button');
                removeBtn.className = 'cancel-button';
                removeBtn.textContent = '删除';
                removeBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    removeAmountUnitToken(row.token);
                });
                actionWrap.appendChild(editBtn);
                actionWrap.appendChild(removeBtn);
            } else {
                const readonlyTag = document.createElement('span');
                readonlyTag.className = 'anchor-alias-readonly-tag';
                readonlyTag.textContent = '只读';
                actionWrap.appendChild(readonlyTag);
            }
            footer.appendChild(actionWrap);

            card.appendChild(head);
            card.appendChild(desc);
            card.appendChild(footer);
            cards.appendChild(card);
        });

        lane.appendChild(cards);
        container.appendChild(lane);
    });

    list.appendChild(container);
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
    const entries = collectPreviewStandardEntries((previewResult || {}).result || {});
    const canonicals = entries
        .map(item => String(item && item.canonical ? item.canonical : '').trim())
        .filter(Boolean);
    if (canonicals.length === 0) {
        const playEntries = collectPreviewPlayEntries((previewResult || {}).result || {});
        if (playEntries.length > 0) {
            return { state: 'neutral', text: '仅识别到未开放玩法' };
        }
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
    const entries = collectPreviewStandardEntries((previewResult || {}).result || {});
    const canonicals = entries
        .map(item => String(item && item.canonical ? item.canonical : '').trim())
        .filter(Boolean);
    const totalAmount = entries.reduce((sum, entry) => {
        const amount = Number(entry && entry.totalAmount != null ? entry.totalAmount : NaN);
        return Number.isFinite(amount) ? sum + amount : sum;
    }, 0);
    if (canonicals.length === 0) {
        const playEntries = collectPreviewPlayEntries((previewResult || {}).result || {});
        if (playEntries.length > 0) {
            return {
                success: false,
                error: '仅识别到未开放玩法，当前不参与号码统计。',
                canonicals: [],
                totalAmount: 0
            };
        }
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
    const libraryBody = document.getElementById('anchorLibraryWorkspace');
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
    const libraryBody = document.getElementById('anchorLibraryWorkspace');
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
            renderDefaultOddsState();
            renderAnchorParseModeState();
            renderAttributeCombinePolicyState();
            renderRegionAccountingPolicyState();
            renderBlockedPlayKeywordState();
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
            renderDefaultOddsState();
            renderAnchorParseModeState();
            renderAttributeCombinePolicyState();
            renderRegionAccountingPolicyState();
            renderBlockedPlayKeywordState();
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
            renderDefaultOddsState();
            renderAnchorParseModeState();
            renderAttributeCombinePolicyState();
            renderRegionAccountingPolicyState();
            renderBlockedPlayKeywordState();
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
            renderDefaultOddsState();
            renderAnchorParseModeState();
            renderAttributeCombinePolicyState();
            renderRegionAccountingPolicyState();
            renderBlockedPlayKeywordState();
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
        if (window.userManager && typeof window.userManager.syncStoredUserParsePreferencesToRules === 'function') {
            window.userManager.syncStoredUserParsePreferencesToRules();
        }
        recalculateAllUsersByRuleChange();
        closeAnchorRuleDrawer();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        } else {
            renderAnchorAliasList();
            renderAnchorImpactPreview();
            renderDefaultOddsState();
            renderAnchorParseModeState();
            renderAttributeCombinePolicyState();
            renderRegionAccountingPolicyState();
            renderBlockedPlayKeywordState();
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

function renderRegionAccountingPolicyState() {
    const stateEl = document.getElementById('regionAccountingPolicyState');
    const modeInput = document.getElementById('regionAccountingMode');
    const defaultRegionInput = document.getElementById('regionAccountingDefaultRegion');
    const aliasInputs = {
        new_ao: document.getElementById('regionAliasInput_new_ao'),
        old_ao: document.getElementById('regionAliasInput_old_ao'),
        hongkong: document.getElementById('regionAliasInput_hongkong')
    };
    if (!stateEl || !modeInput || !defaultRegionInput) return;

    if (!window.messageProcessor
        || typeof window.messageProcessor.getEffectiveRuleProfile !== 'function'
        || typeof window.messageProcessor.getEffectiveRegionAccountingInfo !== 'function'
    ) {
        stateEl.textContent = '当前版本不支持盘口统计模式';
        modeInput.disabled = true;
        defaultRegionInput.disabled = true;
        Object.values(aliasInputs).forEach((node) => { if (node) node.disabled = true; });
        renderRegionAccountingPolicyExplain({ unavailable: true, message: '当前版本不支持盘口规则说明。' });
        return;
    }

    const { scope, clientId } = getRuleContext();
    if (scope === 'client' && !clientId) {
        stateEl.textContent = '请选择目标客户后再设置客户专属盘口规则';
        modeInput.disabled = true;
        defaultRegionInput.disabled = true;
        Object.values(aliasInputs).forEach((node) => { if (node) node.disabled = true; });
        renderRegionAccountingPolicyExplain({ unavailable: true, message: '当前是客户层，但未选择客户。' });
        return;
    }
    modeInput.disabled = false;
    defaultRegionInput.disabled = false;
    Object.values(aliasInputs).forEach((node) => { if (node) node.disabled = false; });

    const systemProfile = window.messageProcessor.getSystemRuleProfile
        ? window.messageProcessor.getSystemRuleProfile()
        : {};
    const globalProfile = window.messageProcessor.getGlobalRuleProfile
        ? window.messageProcessor.getGlobalRuleProfile()
        : {};
    const clientProfile = clientId && window.messageProcessor.getClientRuleProfile
        ? window.messageProcessor.getClientRuleProfile(clientId)
        : {};
    const effectiveInfo = window.messageProcessor.getEffectiveRegionAccountingInfo(clientId || '');

    const systemRegionPolicy = systemProfile && systemProfile.regionPolicy ? systemProfile.regionPolicy : {};
    const globalRegionPolicy = globalProfile && globalProfile.regionPolicy ? globalProfile.regionPolicy : {};
    const clientRegionPolicy = clientProfile && clientProfile.regionPolicy ? clientProfile.regionPolicy : {};
    const scopedRegionPolicy = scope === 'client' ? clientRegionPolicy : globalRegionPolicy;
    const scopedRegionAliases = scopedRegionPolicy && scopedRegionPolicy.regionAliases && typeof scopedRegionPolicy.regionAliases === 'object'
        ? scopedRegionPolicy.regionAliases
        : {};

    const effectiveMode = effectiveInfo && effectiveInfo.separateStatsByRegion === false ? 'merged' : 'split';
    const effectiveDefaultRegion = String(effectiveInfo && effectiveInfo.defaultRegion ? effectiveInfo.defaultRegion : 'new_ao').trim() || 'new_ao';

    const scopedMode = Object.prototype.hasOwnProperty.call(scopedRegionPolicy, 'separateStatsByRegion')
        ? (scopedRegionPolicy.separateStatsByRegion === false ? 'merged' : 'split')
        : '';
    const scopedDefaultRegion = String(scopedRegionPolicy.defaultRegion || '').trim();

    const modeSource = Object.prototype.hasOwnProperty.call(clientRegionPolicy, 'separateStatsByRegion')
        ? 'client'
        : (Object.prototype.hasOwnProperty.call(globalRegionPolicy, 'separateStatsByRegion') ? 'global' : 'system');
    const defaultRegionSource = clientRegionPolicy.defaultRegion
        ? 'client'
        : (globalRegionPolicy.defaultRegion ? 'global' : 'system');

    if (modeInput.querySelector(`option[value="${scopedMode || effectiveMode}"]`)) {
        modeInput.value = scopedMode || effectiveMode;
    }
    if (defaultRegionInput.querySelector(`option[value="${scopedDefaultRegion || effectiveDefaultRegion}"]`)) {
        defaultRegionInput.value = scopedDefaultRegion || effectiveDefaultRegion;
    }
    ['new_ao', 'old_ao', 'hongkong'].forEach((regionKey) => {
        const node = aliasInputs[regionKey];
        if (!node) return;
        const scopedAliases = Array.isArray(scopedRegionAliases[regionKey]) ? scopedRegionAliases[regionKey] : [];
        node.value = scopedAliases.join(',');
    });

    const aliasScopedCount = ['new_ao', 'old_ao', 'hongkong']
        .reduce((sum, regionKey) => sum + (Array.isArray(scopedRegionAliases[regionKey]) ? scopedRegionAliases[regionKey].length : 0), 0);
    const modeScopeTip = scopedMode
        ? `本层已设置：${getRegionAccountingModeLabel(scopedMode)}。`
        : '本层未设置盘口统计模式，继承上层。';
    const defaultRegionScopeTip = scopedDefaultRegion
        ? `本层已设置默认盘口：${window.userManager && typeof window.userManager.getRegionLabel === 'function' ? window.userManager.getRegionLabel(scopedDefaultRegion) : scopedDefaultRegion}。`
        : '本层未设置默认盘口，继承上层。';
    const aliasScopeTip = aliasScopedCount > 0
        ? `本层已追加 ${aliasScopedCount} 个盘口别名。`
        : '本层未追加盘口别名，继承系统/上层识别词。';
    const effectiveDefaultRegionLabel = window.userManager && typeof window.userManager.getRegionLabel === 'function'
        ? window.userManager.getRegionLabel(effectiveDefaultRegion)
        : effectiveDefaultRegion;

    stateEl.textContent = `当前生效：${getRegionAccountingModeLabel(effectiveMode)}；统一入账盘口：${effectiveDefaultRegionLabel}。${modeScopeTip}${defaultRegionScopeTip}${aliasScopeTip}`;
    renderRegionAccountingPolicyExplain({
        mode: effectiveMode,
        defaultRegion: effectiveDefaultRegion,
        defaultRegionLabel: effectiveDefaultRegionLabel,
        modeSourceLabel: getAnchorRuleSourceLabel(modeSource),
        defaultRegionSourceLabel: getAnchorRuleSourceLabel(defaultRegionSource),
        effectiveRegionAliases: effectiveInfo && effectiveInfo.regionAliases ? effectiveInfo.regionAliases : {}
    });
}

function renderBlockedPlayKeywordState() {
    const stateEl = document.getElementById('blockedPlayKeywordState');
    const pingteInput = document.getElementById('blockedPlayKeywordInput_pingte_xiao');
    const lianInput = document.getElementById('blockedPlayKeywordInput_lian_play');
    if (!stateEl || !pingteInput || !lianInput) return;

    if (!window.messageProcessor
        || typeof window.messageProcessor.getEffectiveRuleProfile !== 'function'
        || typeof window.messageProcessor.getEffectiveBlockedPlayKeywordMap !== 'function'
        || typeof window.messageProcessor.getSystemBlockedPlayKeywordMap !== 'function'
    ) {
        stateEl.textContent = '当前版本不支持未开放玩法关键词';
        pingteInput.disabled = true;
        lianInput.disabled = true;
        renderBlockedPlayKeywordExplain({ unavailable: true, message: '当前版本不支持未开放玩法关键词说明。' });
        return;
    }

    const { scope, clientId } = getRuleContext();
    if (scope === 'client' && !clientId) {
        stateEl.textContent = '请选择目标客户后再设置客户专属未开放玩法关键词';
        pingteInput.disabled = true;
        lianInput.disabled = true;
        renderBlockedPlayKeywordExplain({ unavailable: true, message: '当前是客户层，但未选择客户。' });
        return;
    }

    pingteInput.disabled = false;
    lianInput.disabled = false;

    const systemProfile = window.messageProcessor.getSystemRuleProfile
        ? window.messageProcessor.getSystemRuleProfile()
        : {};
    const globalProfile = window.messageProcessor.getGlobalRuleProfile
        ? window.messageProcessor.getGlobalRuleProfile()
        : {};
    const clientProfile = clientId && window.messageProcessor.getClientRuleProfile
        ? window.messageProcessor.getClientRuleProfile(clientId)
        : {};
    const effectiveKeywordMap = window.messageProcessor.getEffectiveBlockedPlayKeywordMap(clientId || '');
    const systemKeywordMap = systemProfile && systemProfile.blockedPlayKeywords
        ? systemProfile.blockedPlayKeywords
        : (window.messageProcessor.getSystemBlockedPlayKeywordMap() || {});
    const globalKeywordMap = globalProfile && globalProfile.blockedPlayKeywords
        ? globalProfile.blockedPlayKeywords
        : {};
    const clientKeywordMap = clientProfile && clientProfile.blockedPlayKeywords
        ? clientProfile.blockedPlayKeywords
        : {};
    const scopedKeywordMap = scope === 'client' ? clientKeywordMap : globalKeywordMap;

    const scopedPingteTokens = Array.isArray(scopedKeywordMap.pingte_xiao) ? scopedKeywordMap.pingte_xiao : [];
    const scopedLianTokens = Array.isArray(scopedKeywordMap.lian_play) ? scopedKeywordMap.lian_play : [];
    if (document.activeElement !== pingteInput) {
        pingteInput.value = scopedPingteTokens.join(',');
    }
    if (document.activeElement !== lianInput) {
        lianInput.value = scopedLianTokens.join(',');
    }
    const currentDraft = collectBlockedPlayKeywordInputs();
    const hasDraft = currentDraft.pingte_xiao.length > 0 || currentDraft.lian_play.length > 0;

    const getFamilySource = (family) => {
        if (clientId && Array.isArray(clientKeywordMap[family]) && clientKeywordMap[family].length > 0) return 'client';
        if (Array.isArray(globalKeywordMap[family]) && globalKeywordMap[family].length > 0) return 'global';
        return 'system';
    };

    const familyKeys = ['pingte_xiao', 'te_xiao', 'yi_xiao', 'lian_play'];
    const explainLines = familyKeys.map((family) => {
        const effectiveTokens = Array.isArray(effectiveKeywordMap[family]) ? effectiveKeywordMap[family] : [];
        return `${getBlockedPlayKeywordFamilyLabel(family)}：${formatBlockedPlayKeywordList(effectiveTokens) || '未设置'}（来源：${getAnchorRuleSourceLabel(getFamilySource(family))}）`;
    });

    const scopedCount = scopedPingteTokens.length + scopedLianTokens.length;
    const effectivePingteCount = Array.isArray(effectiveKeywordMap.pingte_xiao) ? effectiveKeywordMap.pingte_xiao.length : 0;
    const effectiveLianCount = Array.isArray(effectiveKeywordMap.lian_play) ? effectiveKeywordMap.lian_play.length : 0;
    const scopedTip = scopedCount > 0
        ? `本层已补充 ${scopedCount} 个关键词。`
        : '本层未补充关键词，继承上层与系统默认。';
    const draftTip = hasDraft
        ? ` 当前输入：平特类 ${currentDraft.pingte_xiao.length} 个，连肖/连码类 ${currentDraft.lian_play.length} 个。`
        : '';
    stateEl.textContent = `当前生效：平特类 ${effectivePingteCount} 个，连肖/连码类 ${effectiveLianCount} 个。${scopedTip}${draftTip}`;
    renderBlockedPlayKeywordExplain({ lines: explainLines });
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
        renderRegionAccountingPolicyState();
        renderBlockedPlayKeywordState();
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}属性叠加策略已保存：${getAttributeCombinePolicyLabel(policy)}`);
        if (scope === 'global') {
            markAnchorGuideStepCompleted('combinePolicy');
        }
    } catch (error) {
        showError('保存属性叠加策略失败', error.message || '未知错误');
    }
}

function saveRegionAccountingPolicyRule() {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.setRegionAccountingPolicy !== 'function') {
            throw new Error('当前版本不支持盘口统计模式');
        }
        const { scope, clientId } = getRuleContext({ requireClientForClientScope: true });
        const modeInput = document.getElementById('regionAccountingMode');
        const defaultRegionInput = document.getElementById('regionAccountingDefaultRegion');
        const mode = modeInput ? String(modeInput.value || '').trim() : '';
        const defaultRegion = defaultRegionInput ? String(defaultRegionInput.value || '').trim() : '';
        if (!mode || !defaultRegion) {
            throw new Error('请选择盘口统计模式和默认盘口');
        }
        const regionAliases = collectRegionAliasInputs();
        const saved = window.messageProcessor.setRegionAccountingPolicy({ mode, defaultRegion, regionAliases }, { scope, clientId });
        recalculateAllUsersByRuleChange();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        }
        renderRegionAccountingPolicyState();
        renderBlockedPlayKeywordState();
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}盘口规则已保存：${getRegionAccountingModeLabel(saved.mode)}，默认盘口 ${window.userManager && typeof window.userManager.getRegionLabel === 'function' ? window.userManager.getRegionLabel(saved.defaultRegion) : saved.defaultRegion}`);
    } catch (error) {
        showError('保存盘口规则失败', error.message || '未知错误');
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
        renderRegionAccountingPolicyState();
        renderBlockedPlayKeywordState();
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}层属性叠加策略已恢复默认`);
    } catch (error) {
        showError('恢复属性叠加策略失败', error.message || '未知错误');
    }
}

function resetRegionAccountingPolicyRule() {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.clearRegionAccountingPolicy !== 'function') {
            throw new Error('当前版本不支持恢复盘口规则');
        }
        const { scope, clientId } = getRuleContext({ requireClientForClientScope: true });
        const ok = confirm(`确定恢复${getScopeDisplayName(scope)}层的盘口规则为上层默认吗？`);
        if (!ok) return;
        window.messageProcessor.clearRegionAccountingPolicy({ scope, clientId });
        recalculateAllUsersByRuleChange();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        }
        renderRegionAccountingPolicyState();
        renderBlockedPlayKeywordState();
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}层盘口规则已恢复默认`);
    } catch (error) {
        showError('恢复盘口规则失败', error.message || '未知错误');
    }
}

function saveBlockedPlayKeywordRule() {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.setBlockedPlayKeywordMap !== 'function') {
            throw new Error('当前版本不支持未开放玩法关键词');
        }
        const { scope, clientId } = getRuleContext({ requireClientForClientScope: true });
        const nextInputMap = collectBlockedPlayKeywordInputs();
        const scopedProfile = scope === 'client'
            ? (window.messageProcessor.getClientRuleProfile ? window.messageProcessor.getClientRuleProfile(clientId) : {})
            : (window.messageProcessor.getGlobalRuleProfile ? window.messageProcessor.getGlobalRuleProfile() : {});
        const existingScopedMap = scopedProfile && scopedProfile.blockedPlayKeywords && typeof scopedProfile.blockedPlayKeywords === 'object'
            ? scopedProfile.blockedPlayKeywords
            : {};
        const nextMap = {
            ...existingScopedMap,
            pingte_xiao: nextInputMap.pingte_xiao,
            lian_play: nextInputMap.lian_play
        };
        if (!nextInputMap.pingte_xiao.length) {
            delete nextMap.pingte_xiao;
        }
        if (!nextInputMap.lian_play.length) {
            delete nextMap.lian_play;
        }
        const saved = window.messageProcessor.setBlockedPlayKeywordMap(nextMap, { scope, clientId });
        recalculateAllUsersByRuleChange();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        }
        renderBlockedPlayKeywordState();
        previewMessage({ silent: true });
        const pingteCount = Array.isArray(saved && saved.pingte_xiao) ? saved.pingte_xiao.length : 0;
        const lianCount = Array.isArray(saved && saved.lian_play) ? saved.lian_play.length : 0;
        showSuccess(`${getScopeDisplayName(scope)}玩法关键词已保存：平特类 ${pingteCount} 个，连肖/连码类 ${lianCount} 个`);
    } catch (error) {
        showError('保存玩法关键词失败', error.message || '未知错误');
    }
}

function resetBlockedPlayKeywordRule() {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.clearBlockedPlayKeywordMap !== 'function') {
            throw new Error('当前版本不支持恢复玩法关键词');
        }
        const { scope, clientId } = getRuleContext({ requireClientForClientScope: true });
        const ok = confirm(`确定恢复${getScopeDisplayName(scope)}层的未开放玩法关键词为上层默认吗？`);
        if (!ok) return;
        window.messageProcessor.clearBlockedPlayKeywordMap({ scope, clientId });
        recalculateAllUsersByRuleChange();
        if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
            window.userManager.renderAllSections();
        }
        renderBlockedPlayKeywordState();
        previewMessage({ silent: true });
        showSuccess(`${getScopeDisplayName(scope)}层未开放玩法关键词已恢复默认`);
    } catch (error) {
        showError('恢复玩法关键词失败', error.message || '未知错误');
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
    renderRegionAccountingPolicyState();
    renderBlockedPlayKeywordState();
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

function canSubmitRecognizeMessageOnEnter() {
    if (recognizeEditContext) return false;
    if (!window.messageProcessor || typeof window.messageProcessor.previewMessage !== 'function') {
        return false;
    }

    const messageTextarea = document.getElementById('message');
    const rawValue = messageTextarea ? String(messageTextarea.value || '') : '';
    if (!rawValue.trim()) return false;

    let message = '';
    try {
        message = normalizeMessageBeforeSubmit(rawValue);
    } catch (error) {
        return false;
    }
    if (!message) return false;

    const selectedUsers = typeof userManager.getSelectedUsers === 'function'
        ? userManager.getSelectedUsers()
        : [userManager.getCurrentUser()].filter(Boolean);
    if (!Array.isArray(selectedUsers) || selectedUsers.length <= 0) {
        return false;
    }

    return selectedUsers.every((userName) => {
        try {
            const preview = window.messageProcessor.previewMessage(message, { clientId: userName });
            return !!(preview && preview.success && !isAmbiguityResult(preview));
        } catch (error) {
            return false;
        }
    });
}

function getRecognizeSpeechRecognitionCtor() {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function resetRecognizeSpeechBuffer() {
    recognizeSpeechFinalText = '';
    recognizeSpeechInterimText = '';
    recognizeSpeechLastError = '';
}

function normalizeRecognizeSpeechTranscript(text) {
    return String(text || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function getRecognizeSpeechErrorMessage(errorCode) {
    const code = String(errorCode || '').trim();
    if (code === 'not-allowed' || code === 'service-not-allowed') {
        return '麦克风权限未开启，请在系统设置里允许当前应用使用麦克风。';
    }
    if (code === 'audio-capture') {
        return '未检测到可用麦克风，请检查设备后重试。';
    }
    if (code === 'network') {
        return '语音识别服务暂不可用，请检查网络后重试。';
    }
    if (code === 'no-speech') {
        return '没有识别到语音，请重新说一遍。';
    }
    if (code === 'aborted') {
        return '语音录入已停止。';
    }
    return code ? `语音录入失败：${code}` : '语音录入失败，请重试。';
}

function renderRecognizeVoiceUi() {
    const button = document.getElementById('recognizeVoiceButton');
    const statusEl = document.getElementById('recognizeVoiceStatus');
    recognizeSpeechSupported = !!getRecognizeSpeechRecognitionCtor();

    if (button) {
        button.disabled = !recognizeSpeechSupported;
        button.classList.toggle('unsupported', !recognizeSpeechSupported);
        button.classList.toggle('listening', recognizeSpeechListening);
        button.textContent = recognizeSpeechListening ? '停止语音' : '语音录入';
        button.setAttribute('aria-pressed', recognizeSpeechListening ? 'true' : 'false');
        button.title = recognizeSpeechSupported ? '使用麦克风把语音转成文字' : '当前环境不支持语音录入';
    }

    if (!statusEl) return;
    statusEl.className = 'recognize-voice-status';
    if (!recognizeSpeechSupported) {
        statusEl.classList.add('error');
        statusEl.textContent = '当前环境不支持语音录入。';
        return;
    }
    if (recognizeSpeechListening) {
        statusEl.classList.add('listening');
        statusEl.textContent = recognizeSpeechInterimText
            ? `正在听写：${recognizeSpeechInterimText}`
            : '正在听写，请开始说话。';
        return;
    }
    if (recognizeSpeechLastError) {
        statusEl.classList.add('error');
        statusEl.textContent = getRecognizeSpeechErrorMessage(recognizeSpeechLastError);
        return;
    }
    if (recognizeSpeechFinalText) {
        statusEl.textContent = `已识别：${recognizeSpeechFinalText}`;
        return;
    }
    statusEl.textContent = '语音录入可用，点击“语音录入”开始听写。';
}

function appendRecognizeSpeechText(fragment) {
    const messageTextarea = document.getElementById('message');
    if (!messageTextarea) return;
    const normalizedFragment = normalizeRecognizeSpeechTranscript(fragment);
    if (!normalizedFragment) return;
    const current = normalizeRecognizeSpeechTranscript(messageTextarea.value || '');
    const nextText = current ? `${current}\n${normalizedFragment}` : normalizedFragment;
    applyRecognizeMessageText(nextText);
    clearMessageLineError();
    previewMessage({ silent: true, realtime: true });
}

function ensureRecognizeSpeechRecognition() {
    const RecognitionCtor = getRecognizeSpeechRecognitionCtor();
    if (!RecognitionCtor) {
        recognizeSpeechSupported = false;
        renderRecognizeVoiceUi();
        return null;
    }
    if (recognizeSpeechRecognition) {
        return recognizeSpeechRecognition;
    }

    const recognition = new RecognitionCtor();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        recognizeSpeechListening = true;
        recognizeSpeechLastError = '';
        renderRecognizeVoiceUi();
    };

    recognition.onresult = (event) => {
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const result = event.results[i];
            const transcript = normalizeRecognizeSpeechTranscript(result && result[0] ? result[0].transcript : '');
            if (!transcript) continue;
            if (result.isFinal) {
                recognizeSpeechFinalText = normalizeRecognizeSpeechTranscript(`${recognizeSpeechFinalText} ${transcript}`);
            } else {
                interimText = normalizeRecognizeSpeechTranscript(`${interimText} ${transcript}`);
            }
        }
        recognizeSpeechInterimText = interimText;
        renderRecognizeVoiceUi();
    };

    recognition.onerror = (event) => {
        const code = event && event.error ? String(event.error) : 'unknown';
        if (recognizeSpeechManualStop && code === 'aborted') {
            return;
        }
        recognizeSpeechLastError = code;
        renderRecognizeVoiceUi();
        if (code !== 'no-speech' && code !== 'aborted') {
            showError('语音录入失败', getRecognizeSpeechErrorMessage(code));
        }
    };

    recognition.onend = () => {
        const shouldDiscard = recognizeSpeechDiscardOnEnd;
        const finalText = recognizeSpeechFinalText;
        recognizeSpeechListening = false;
        recognizeSpeechInterimText = '';
        recognizeSpeechDiscardOnEnd = false;
        recognizeSpeechManualStop = false;

        if (!shouldDiscard && finalText) {
            appendRecognizeSpeechText(finalText);
            showSuccess('语音已转成文字');
            recognizeSpeechLastError = '';
        } else if (!shouldDiscard && recognizeSpeechLastError === 'no-speech') {
            showError('语音录入失败', getRecognizeSpeechErrorMessage('no-speech'));
        }

        recognizeSpeechFinalText = '';
        renderRecognizeVoiceUi();
    };

    recognizeSpeechRecognition = recognition;
    recognizeSpeechSupported = true;
    return recognition;
}

function startRecognizeVoiceInput() {
    const recognition = ensureRecognizeSpeechRecognition();
    if (!recognition) {
        showError('语音录入不可用', '当前环境不支持语音录入。');
        return;
    }
    if (recognizeSpeechListening) return;

    resetRecognizeSpeechBuffer();
    recognizeSpeechDiscardOnEnd = false;
    recognizeSpeechManualStop = false;
    renderRecognizeVoiceUi();
    try {
        recognition.start();
    } catch (error) {
        const message = error && error.message ? error.message : '';
        if (/already started/i.test(message)) {
            recognizeSpeechListening = true;
            renderRecognizeVoiceUi();
            return;
        }
        showError('语音录入失败', message || '无法启动麦克风听写');
    }
}

function stopRecognizeVoiceInput(options = {}) {
    recognizeSpeechManualStop = true;
    recognizeSpeechDiscardOnEnd = !!(options && options.discard);
    if (recognizeSpeechRecognition && recognizeSpeechListening) {
        try {
            recognizeSpeechRecognition.stop();
        } catch (error) {
            recognizeSpeechListening = false;
            renderRecognizeVoiceUi();
        }
        return;
    }
    if (recognizeSpeechDiscardOnEnd) {
        resetRecognizeSpeechBuffer();
    }
    recognizeSpeechListening = false;
    renderRecognizeVoiceUi();
}

function toggleRecognizeVoiceInput() {
    if (recognizeSpeechListening) {
        stopRecognizeVoiceInput();
        return;
    }
    startRecognizeVoiceInput();
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
        if (event.isComposing || event.keyCode === 229) return;
        if (event.shiftKey || event.altKey) return;
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            confirmEdit();
            return;
        }
        if (!canSubmitRecognizeMessageOnEnter()) return;
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
    renderRecognizeVoiceUi();

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

function getLocalAiUnavailableHint(status = localAiSemanticStatus) {
    const hint = status && status.installHint
        ? String(status.installHint)
        : '内置模型文件缺失，请重新安装软件或检查 assets/ai 资源。';
    return hint;
}

function setLocalAiRewriteButtonState() {
    const button = document.getElementById('localAiFixButton');
    if (!button) return;
    button.disabled = localAiRewriteBusy;
    button.textContent = localAiRewriteBusy ? '本地AI修正中...' : '本地AI修正';
}

function renderLocalAiSemanticStatus(status = {}) {
    const nextStatus = status && typeof status === 'object' ? status : {};
    localAiSemanticStatus = {
        ...localAiSemanticStatus,
        ...nextStatus,
        checked: true,
    };

    const el = document.getElementById('localAiAssistStatus');
    if (el) {
        el.className = 'local-ai-assist-status';
        if (localAiRewriteBusy && localAiSemanticStatus.message) {
            el.classList.add('working');
            el.textContent = localAiSemanticStatus.message;
        } else if (localAiSemanticStatus.reason === 'loading') {
            el.classList.add('working');
            el.textContent = localAiSemanticStatus.message || '本地 AI 语义修正：内置模型加载中...';
        } else if (localAiSemanticStatus.available) {
            el.classList.add('ready');
            el.textContent = `本地 AI 语义修正：内置模型已就绪（${localAiSemanticStatus.model || '中文小模型'}）`;
        } else if (localAiSemanticStatus.reason === 'missing_files') {
            el.classList.add('warning');
            el.textContent = `本地 AI 语义修正：内置模型文件缺失。${getLocalAiUnavailableHint(localAiSemanticStatus)}`;
        } else if (localAiSemanticStatus.reason === 'load_failed') {
            el.classList.add('warning');
            el.textContent = localAiSemanticStatus.message || '本地 AI 语义修正：内置模型初始化失败';
        } else {
            el.textContent = localAiSemanticStatus.message || '本地 AI 语义修正：检测中...';
        }
        el.title = localAiSemanticStatus.detail || '';
    }

    setLocalAiRewriteButtonState();
}

async function refreshLocalAiSemanticStatus(options = {}) {
    if (!ipcRenderer || typeof ipcRenderer.invoke !== 'function') {
        renderLocalAiSemanticStatus({
            available: false,
            reason: 'ipc_unavailable',
            message: '本地 AI 语义修正：IPC 不可用',
        });
        return localAiSemanticStatus;
    }

    try {
        const result = await ipcRenderer.invoke('ai:get-semantic-status', {
            forceRefresh: !!(options && options.forceRefresh),
        });
        renderLocalAiSemanticStatus(result || {
            available: false,
            reason: 'empty',
            message: '本地 AI 状态读取失败',
        });
    } catch (error) {
        renderLocalAiSemanticStatus({
            available: false,
            reason: 'status_failed',
            message: error && error.message ? error.message : '本地 AI 状态读取失败',
        });
    }
    return localAiSemanticStatus;
}

async function ensureLocalAiSemanticStatusReady(forceRefresh = false) {
    if (!localAiSemanticStatus.checked || forceRefresh) {
        return refreshLocalAiSemanticStatus({ forceRefresh });
    }
    return localAiSemanticStatus;
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
        return { ok: false, score: 0, entries: 0, playEntries: 0, unresolvedCount: 0, reason: '空内容', richness: 0 };
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
        return { ok: false, score: richness + lineCount * 2, entries: 0, playEntries: 0, unresolvedCount: 0, reason: '解析器不可用', richness };
    }
    try {
        const preview = window.messageProcessor.previewMessage(content, { allowPartial: true });
        if (preview && preview.success) {
            const entries = collectPreviewStandardEntries(preview.result || {}).length;
            const playEntries = collectPreviewPlayEntries(preview.result || {}).length;
            const unresolvedCount = Array.isArray(preview.result && preview.result.unresolvedLines)
                ? preview.result.unresolvedLines.length
                : 0;
            let score = 70 + entries * 12 + playEntries * 4 + Math.min(20, lineCount * 3) + richness - unresolvedCount * 45;
            if (entries <= 1 && lineCount <= 1) score -= 35;
            if (digitCount <= 6) score -= 20;
            if (unresolvedCount > 0) score -= 20;
            return {
                ok: unresolvedCount === 0 && entries > 0,
                score: Math.max(0, score),
                entries,
                playEntries,
                unresolvedCount,
                reason: unresolvedCount > 0 ? `仍有 ${unresolvedCount} 行未识别` : '',
                richness
            };
        }
        return {
            ok: false,
            score: Math.min(40, lineCount * 5) + richness * 0.7,
            entries: 0,
            playEntries: 0,
            unresolvedCount: 0,
            reason: preview && preview.error ? preview.error : '解析失败',
            richness
        };
    } catch (error) {
        return {
            ok: false,
            score: Math.min(20, lineCount * 3) + richness * 0.6,
            entries: 0,
            playEntries: 0,
            unresolvedCount: 0,
            reason: error && error.message ? error.message : '解析异常',
            richness
        };
    }
}

function summarizePreviewQuality(previewResult) {
    if (!previewResult || !previewResult.success || !previewResult.result) {
        return {
            success: false,
            entries: 0,
            playEntries: 0,
            unresolvedCount: Number.MAX_SAFE_INTEGER,
            totalAmount: 0,
            score: -1000000,
            reason: previewResult && previewResult.error ? previewResult.error : '解析失败'
        };
    }

    const result = previewResult.result || {};
    const entries = collectPreviewStandardEntries(result).length;
    const playEntries = collectPreviewPlayEntries(result).length;
    const unresolvedCount = Array.isArray(result.unresolvedLines) ? result.unresolvedLines.length : 0;
    const totalAmount = Number(result.totalAmount) || 0;
    let score = entries * 100 + playEntries * 25 + Math.min(totalAmount, 99999) * 0.001;
    score -= unresolvedCount * 180;
    if (entries > 0) score += 30;
    if (playEntries > 0) score += 10;
    if (unresolvedCount === 0) score += 40;
    return {
        success: true,
        entries,
        playEntries,
        unresolvedCount,
        totalAmount,
        score,
        reason: ''
    };
}

function evaluateLocalAiRewriteCandidate(text, options = {}) {
    const candidateText = String(text || '').trim();
    const clientId = options && options.clientId ? String(options.clientId) : '';
    if (!candidateText || !window.messageProcessor || typeof window.messageProcessor.previewMessage !== 'function') {
        return null;
    }

    const preview = window.messageProcessor.previewMessage(candidateText, {
        clientId,
        allowPartial: true
    });
    const quality = summarizePreviewQuality(preview);
    const baselineScore = Number(options && options.baselineQuality && Number.isFinite(Number(options.baselineQuality.score))
        ? options.baselineQuality.score
        : -1000000);
    return {
        text: candidateText,
        preview,
        quality,
        improvement: quality.score - baselineScore
    };
}

function pickBestLocalAiRewriteCandidate(texts, options = {}) {
    const uniqueTexts = Array.from(new Set((Array.isArray(texts) ? texts : []).map(item => String(item || '').trim()).filter(Boolean)));
    const evaluations = uniqueTexts
        .map(text => evaluateLocalAiRewriteCandidate(text, options))
        .filter(Boolean)
        .sort((left, right) => {
            if (right.improvement !== left.improvement) {
                return right.improvement - left.improvement;
            }
            if (right.quality.score !== left.quality.score) {
                return right.quality.score - left.quality.score;
            }
            return right.text.length - left.text.length;
        });
    return evaluations.length > 0 ? evaluations[0] : null;
}

function evaluateOcrCandidateSafety(text) {
    const content = String(text || '');
    const hasLatin = /[A-Za-z]/.test(content);
    const allowedChars = /[0-9０-９\s\.\,\，\:：~～\-—=各号澳奥老香港新鼠牛虎兔龙蛇马羊猴鸡狗猪零〇一二两三四五六七八九十百千万亿元米块蚊买都全平摊均分共每个肖尾波门数连特注碼码子合通下]/;
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

function buildLocalAiRewriteCandidates(result) {
    const texts = [];
    const normalizedText = result && result.normalizedText ? String(result.normalizedText).trim() : '';
    if (normalizedText) {
        texts.push(normalizedText);
    }
    if (result && Array.isArray(result.alternatives)) {
        result.alternatives.forEach((item) => {
            const text = String(item || '').trim();
            if (text) {
                texts.push(text);
            }
        });
    }

    const seen = new Set();
    const confidence = Math.round(
        Math.max(0, Math.min(1, Number(result && result.confidence))) * 100
    );
    const shouldApply = !(result && result.shouldApply === false);
    const source = `local-ai:${result && result.model ? result.model : 'embedded-model'}`;
    return texts
        .filter((text) => {
            if (!text || seen.has(text)) return false;
            seen.add(text);
            return true;
        })
        .map((text, index) => ({
            text,
            score: Math.max(0, confidence - index * 6 - (shouldApply ? 0 : 40)),
            source,
        }));
}

async function requestLocalAiRewrite(rawText, options = {}) {
    if (!ipcRenderer || typeof ipcRenderer.invoke !== 'function') {
        return {
            ok: false,
            available: false,
            reason: 'ipc_unavailable',
            message: 'IPC 不可用',
        };
    }
    const payload = {
        text: String(rawText || ''),
        source: options && options.source ? String(options.source) : 'manual',
        parserError: options && options.parserError ? String(options.parserError) : '',
        clientId: options && options.clientId ? String(options.clientId) : '',
        rewriteMode: options && options.rewriteMode ? String(options.rewriteMode) : 'full_message',
        unresolvedLines: Array.isArray(options && options.unresolvedLines)
            ? options.unresolvedLines.map((item) => ({
                lineNo: Number.isFinite(Number(item && item.lineNo)) ? Number(item.lineNo) : null,
                rawText: String(item && item.rawText ? item.rawText : '').trim(),
                reason: String(item && item.reason ? item.reason : '').trim()
            })).filter(item => item.rawText)
            : [],
    };
    const safePayload = JSON.parse(JSON.stringify(payload));
    const encodedPayload = encodeURIComponent(JSON.stringify(safePayload));
    return ipcRenderer.invoke('ai:rewrite-message', encodedPayload);
}

function applyRecognizeMessageText(nextText) {
    const messageTextarea = document.getElementById('message');
    if (!messageTextarea) return;
    messageTextarea.value = String(nextText || '');
    syncRecognizeMessageAutoHeight();
    messageTextarea.focus();
    messageTextarea.setSelectionRange(messageTextarea.value.length, messageTextarea.value.length);
    renderMessageLineNumbers();
}

async function tryEnhanceOcrCandidatesWithLocalAi(rankedCandidates) {
    const ranked = Array.isArray(rankedCandidates) ? rankedCandidates : [];
    if (!ranked.length) {
        return { candidates: ranked, used: false, model: '' };
    }

    const best = ranked[0];
    if (best && best.parserOk && best.parserScore >= 70) {
        return { candidates: ranked, used: false, model: '' };
    }

    const status = await ensureLocalAiSemanticStatusReady();
    if (!status.available) {
        return { candidates: ranked, used: false, model: '' };
    }

    const parserError = best && best.parserReason ? best.parserReason : '';
    const result = await requestLocalAiRewrite(best && best.text ? best.text : '', {
        source: 'ocr',
        parserError,
        clientId: getPreviewClientId(),
    });
    if (!result || !result.ok) {
        if (result && result.reason) {
            renderLocalAiSemanticStatus(result);
        }
        return { candidates: ranked, used: false, model: '' };
    }

    const aiCandidates = buildLocalAiRewriteCandidates(result);
    if (!aiCandidates.length) {
        return { candidates: ranked, used: false, model: result.model || '' };
    }

    return {
        candidates: normalizeAndRankOcrCandidates([
            ...ranked.map((item) => ({
                text: item.text,
                score: item.ocrScore,
                source: item.source,
            })),
            ...aiCandidates,
        ]),
        used: true,
        model: result.model || '',
    };
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
    applyRecognizeMessageText(item.text);
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

        let ranked = normalizeAndRankOcrCandidates(rawCandidates);
        if (!ranked.length) {
            throw new Error(result && result.message ? result.message : '未识别到可用文本');
        }

        const aiEnhanced = await tryEnhanceOcrCandidatesWithLocalAi(ranked);
        ranked = aiEnhanced && Array.isArray(aiEnhanced.candidates) && aiEnhanced.candidates.length
            ? aiEnhanced.candidates
            : ranked;

        renderOcrCandidates(ranked);
        const best = ranked[0];
        const autoApplied = shouldAutoApplyBestCandidate(best);
        if (autoApplied) {
            applyOcrCandidate(0, false);
        }
        const aiLabel = aiEnhanced && aiEnhanced.used
            ? `，本地AI:${aiEnhanced.model || 'embedded-model'}`
            : '';
        updateOcrHint(`识别完成（${best.source || 'offline'}，候选${ranked.length}条${aiLabel}，耗时 ${result && result.elapsedMs ? result.elapsedMs : 0} ms）`);
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

async function rewriteMessageWithLocalAi(options = {}) {
    const messageTextarea = document.getElementById('message');
    const rawValue = messageTextarea ? String(messageTextarea.value || '') : '';
    if (!rawValue.trim()) {
        showError('本地AI修正失败', '请先输入需要修正的消息');
        return;
    }
    if (localAiRewriteBusy) {
        return;
    }

    localAiRewriteBusy = true;
    setLocalAiRewriteButtonState();

    try {
        const status = await ensureLocalAiSemanticStatusReady(true);
        if (!status.available) {
            showError('本地AI不可用', getLocalAiUnavailableHint(status));
            return;
        }

        const clientId = options && options.clientId ? String(options.clientId) : getPreviewClientId();
        let parserError = options && options.parserError ? String(options.parserError) : '';
        let baselinePreview = null;
        let unresolvedLines = [];
        let blockingUnresolvedLines = [];
        if (window.messageProcessor && typeof window.messageProcessor.previewMessage === 'function') {
            try {
                baselinePreview = window.messageProcessor.previewMessage(rawValue, { clientId, allowPartial: true });
                if (baselinePreview && baselinePreview.success) {
                    unresolvedLines = Array.isArray(baselinePreview.result && baselinePreview.result.unresolvedLines)
                        ? baselinePreview.result.unresolvedLines.filter(Boolean)
                        : [];
                    blockingUnresolvedLines = Array.isArray(baselinePreview.result && baselinePreview.result.blockingUnresolvedLines)
                        ? baselinePreview.result.blockingUnresolvedLines.filter(Boolean)
                        : [];
                    if (!parserError && unresolvedLines.length > 0) {
                        parserError = `当前有 ${unresolvedLines.length} 行未识别`;
                    }
                } else if (!parserError) {
                    parserError = baselinePreview && baselinePreview.error ? baselinePreview.error : '';
                }
            } catch (error) {
                if (!parserError) {
                    parserError = error && error.message ? error.message : '';
                }
            }
        }
        const baselineQuality = summarizePreviewQuality(baselinePreview);
        if (baselinePreview && baselinePreview.success && unresolvedLines.length === 0 && (!options || options.forceFullRewrite !== true)) {
            showError('本地AI修正失败', '当前消息已可稳定解析，无需本地AI修正');
            return;
        }
        const targetBlockingOnly = options && options.source === 'blocking_lines';
        const targetLines = targetBlockingOnly ? blockingUnresolvedLines : unresolvedLines;
        if (targetBlockingOnly && targetLines.length === 0) {
            showError('本地AI修正失败', '当前没有待人工处理行，无需使用“只修待处理”');
            return;
        }
        const rewriteMode = targetLines.length > 0 ? 'target_unresolved' : 'full_message';
        const unresolvedPayload = targetLines.slice(0, 12).map((item) => ({
            lineNo: item.lineNo,
            rawText: item.rawText,
            reason: item.reason
        }));
        if (targetBlockingOnly) {
            const blockingReasonSummary = unresolvedPayload
                .map((item) => `第${item.lineNo || '?'}行：${item.reason || '格式无法识别'}`)
                .join('；');
            parserError = blockingReasonSummary || parserError || '当前存在待人工处理行';
        } else if (!parserError && unresolvedPayload.length > 0) {
            parserError = unresolvedPayload.map((item) => `第${item.lineNo || '?'}行：${item.reason || '格式无法识别'}`).join('；');
        }

        renderLocalAiSemanticStatus({
            ...status,
            message: `本地 AI 语义修正：${status.model || '内置模型'} 修正中...`,
        });

        const result = await requestLocalAiRewrite(rawValue, {
            source: options && options.source ? String(options.source) : 'manual',
            parserError,
            clientId,
            rewriteMode,
            unresolvedLines: unresolvedPayload,
        });
        if (!result || !result.ok) {
            if (result && typeof result === 'object') {
                renderLocalAiSemanticStatus(result);
            }
            const detail = result && result.message ? result.message : '未返回可用结果';
            const reasonHint = unresolvedPayload.length > 0
                ? `待处理原因：${unresolvedPayload.map((item) => `第${item.lineNo || '?'}行${item.reason || '格式无法识别'}`).join('；')}；`
                : '';
            showError('本地AI修正失败', `${reasonHint}${detail}`);
            return;
        }
        if (result.shouldApply === false) {
            const issueText = Array.isArray(result.issues) && result.issues.length
                ? result.issues.join('；')
                : '模型认为当前语义仍不够明确';
            showError('本地AI修正失败', issueText);
            return;
        }

        const candidateTexts = buildLocalAiRewriteCandidates(result).map(item => item && item.text ? item.text : '');
        const best = pickBestLocalAiRewriteCandidate(candidateTexts, {
            clientId,
            baselineQuality
        });
        if (!best || !best.text) {
            showError('本地AI修正失败', '模型已返回结果，但未生成可应用文本');
            return;
        }
        if (!best.preview || !best.preview.success) {
            const issueText = Array.isArray(result.issues) && result.issues.length
                ? `；${result.issues.join('；')}`
                : '';
            showError('本地AI修正失败', `模型已返回结果，但仍未通过本地解析${issueText}`);
            return;
        }
        if (best.improvement <= 0) {
            const issueText = Array.isArray(result.issues) && result.issues.length
                ? `；${result.issues.join('；')}`
                : '';
            showError('本地AI修正失败', `模型已返回结果，但没有让当前解析更好${issueText}`);
            return;
        }

        applyRecognizeMessageText(best.text);
        await previewMessage({ silent: true });
        const improvementHint = baselineQuality && Number.isFinite(Number(baselineQuality.unresolvedCount)) && baselineQuality.unresolvedCount !== Number.MAX_SAFE_INTEGER
            ? `，未识别行 ${baselineQuality.unresolvedCount} -> ${best.quality.unresolvedCount}`
            : '';
        showSuccess(`已使用本地AI修正（${result.model || '内置模型'}${improvementHint}）`);
        await refreshLocalAiSemanticStatus();
    } catch (error) {
        showError('本地AI修正失败', error && error.message ? error.message : '未知错误');
        await refreshLocalAiSemanticStatus({ forceRefresh: true });
    } finally {
        localAiRewriteBusy = false;
        setLocalAiRewriteButtonState();
        renderLocalAiSemanticStatus(localAiSemanticStatus);
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

function extractRegionKeysForDuplicate(message, clientId = '') {
    const fallback = getActiveRecognizeRegionKey();
    if (!window.messageProcessor || typeof window.messageProcessor.previewMessage !== 'function') {
        return [fallback];
    }
    try {
        const preview = window.messageProcessor.previewMessage(message, { clientId: String(clientId || '').trim() });
        if (!preview || !preview.success || !preview.result) {
            return [fallback];
        }
        const keys = Array.from(new Set(
            collectPreviewStandardEntries(preview.result)
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
        const regionKeys = Array.from(new Set(
            selectedUsers.flatMap((userName) => extractRegionKeysForDuplicate(content, userName))
        ));
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
    setRecognizePreviewBlocked(false);
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

function getUserSettlementConfigSnapshot(userName = '') {
    const manager = window.userManager;
    const fallbackOdds = getRegionPnlOdds();
    if (manager && typeof manager.getUserSettlementConfig === 'function') {
        const config = manager.getUserSettlementConfig(userName);
        const odds = Number(config && config.odds);
        const rebateRate = Number(config && config.rebateRate);
        const safeOdds = Number.isFinite(odds) && odds > 0 ? odds : fallbackOdds;
        const safeRebateRate = Number.isFinite(rebateRate) && rebateRate >= 0 ? rebateRate : 0;
        return {
            odds: safeOdds,
            rebateRate: safeRebateRate,
            rebateRatio: safeRebateRate / 100
        };
    }
    return {
        odds: fallbackOdds,
        rebateRate: 0,
        rebateRatio: 0
    };
}

function getCurrentSettlementScopeUsers() {
    if (typeof collectCurrentLotteryScopeData === 'function') {
        const scopeResult = collectCurrentLotteryScopeData();
        if (scopeResult && scopeResult.ok) {
            return {
                users: Array.isArray(scopeResult.scopeData && scopeResult.scopeData.users)
                    ? scopeResult.scopeData.users
                    : [],
                scopeLabel: String(scopeResult.scopeData && scopeResult.scopeData.scopeLabel ? scopeResult.scopeData.scopeLabel : '')
            };
        }
    }
    const manager = window.userManager;
    const selectedUsers = manager && typeof manager.getSelectedUsers === 'function'
        ? manager.getSelectedUsers()
        : [];
    return {
        users: Array.isArray(selectedUsers) ? selectedUsers : [],
        scopeLabel: '当前选择客户范围'
    };
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

function collectRegionPnlMetrics(regionKey, winningNumber = null, scopedUsers = []) {
    const manager = window.userManager;
    const target = Number.isInteger(winningNumber) ? String(winningNumber).padStart(2, '0') : '';
    let totalStake = 0;
    let hitStake = 0;
    let payout = 0;
    let rebate = 0;

    (Array.isArray(scopedUsers) ? scopedUsers : []).forEach(userName => {
        const regionData = manager && typeof manager.getUserRegionData === 'function'
            ? manager.getUserRegionData(userName, regionKey)
            : null;
        if (!regionData || !Array.isArray(regionData.data)) return;

        const regionTotal = Number(regionData.totalCount);
        const safeRegionTotal = Number.isFinite(regionTotal)
            ? regionTotal
            : regionData.data.reduce((sum, item) => sum + (Number(item && item.value) || 0), 0);
        totalStake += safeRegionTotal;

        const settlement = getUserSettlementConfigSnapshot(userName);
        rebate += safeRegionTotal * settlement.rebateRatio;

        if (target) {
            const hitItem = regionData.data.find(item => item && item.number === target);
            const hitValue = Number(hitItem && hitItem.value);
            const safeHit = Number.isFinite(hitValue) ? hitValue : 0;
            hitStake += safeHit;
            payout += safeHit * settlement.odds;
        }
    });

    const pnl = totalStake - payout - rebate;
    return { totalStake, hitStake, payout, rebate, pnl };
}

function refreshRegionPnlPanel() {
    const head = document.getElementById('regionPnlHead');
    const rows = document.getElementById('regionPnlRows');
    const summary = document.getElementById('regionPnlSummary');
    if (!head || !rows || !summary) return;

    const scopeInfo = getCurrentSettlementScopeUsers();
    head.textContent = '盘口庄家盈亏（按客户赔率/返水结算）';

    const regionOptions = window.userManager && typeof window.userManager.getRegionOptions === 'function'
        ? window.userManager.getRegionOptions()
        : [
            { key: 'new_ao', label: '新奥' },
            { key: 'old_ao', label: '老奥' },
            { key: 'hongkong', label: '香港' }
        ];

    rows.innerHTML = '';
    if (!Array.isArray(scopeInfo.users) || scopeInfo.users.length <= 0) {
        summary.textContent = '请先选择至少一个客户后再查看庄家盈亏。';
        return;
    }

    let computedCount = 0;
    let invalidCount = 0;
    let totalStake = 0;
    let totalPayout = 0;
    let totalRebate = 0;
    let totalPnl = 0;
    let visibleStakeTotal = 0;
    let visibleRebateTotal = 0;

    regionOptions.forEach(region => {
        if (typeof regionWinningNumbers[region.key] !== 'string') {
            regionWinningNumbers[region.key] = '';
        }
        const winningRaw = regionWinningNumbers[region.key] || '';
        const parsed = parseRegionWinningNumber(winningRaw);
        const metrics = collectRegionPnlMetrics(region.key, parsed.number, scopeInfo.users);
        visibleStakeTotal += metrics.totalStake;
        visibleRebateTotal += metrics.rebate;

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
            meta.textContent = `总注: ${formatNumericAmount(metrics.totalStake)}，返水: ${formatNumericAmount(metrics.rebate)}，请修正中奖号后再计算`;
        } else if (parsed.number === null) {
            status.classList.add('wait');
            status.textContent = '待输入中奖号';
            meta.textContent = `总注: ${formatNumericAmount(metrics.totalStake)}，返水: ${formatNumericAmount(metrics.rebate)}`;
        } else {
            computedCount += 1;
            totalStake += metrics.totalStake;
            totalPayout += metrics.payout;
            totalRebate += metrics.rebate;
            totalPnl += metrics.pnl;

            if (Math.abs(metrics.pnl) < 1e-9) {
                status.classList.add('even');
            } else if (metrics.pnl > 0) {
                status.classList.add('profit');
            } else {
                status.classList.add('loss');
            }
            status.textContent = `盈亏 ${formatSignedAmount(metrics.pnl)}`;
            meta.textContent = `总注: ${formatNumericAmount(metrics.totalStake)}，命中: ${formatNumericAmount(metrics.hitStake)}，派彩: ${formatNumericAmount(metrics.payout)}，返水: ${formatNumericAmount(metrics.rebate)}`;
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
            ? `当前范围总注 ${formatNumericAmount(visibleStakeTotal)}，总返水 ${formatNumericAmount(visibleRebateTotal)}；存在无效中奖号，请输入 01-49。`
            : `当前范围总注 ${formatNumericAmount(visibleStakeTotal)}，总返水 ${formatNumericAmount(visibleRebateTotal)}；输入中奖号后可继续计算派彩与盈亏。`;
        return;
    }

    const summaryClass = Math.abs(totalPnl) < 1e-9 ? 'even' : (totalPnl > 0 ? 'profit' : 'loss');
    summary.innerHTML = `已计算 ${computedCount} 个盘口：总注 ${formatNumericAmount(totalStake)}，总派彩 ${formatNumericAmount(totalPayout)}，总返水 ${formatNumericAmount(totalRebate)}，<span class="region-pnl-status ${summaryClass}">合计盈亏 ${formatSignedAmount(totalPnl)}</span>`;
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
            handleNoiseRuleScopeChange();
            handleAmountUnitScopeChange();
            renderDefaultOddsState();
            renderAnchorParseModeState();
            renderAttributeCombinePolicyState();
            renderRegionAccountingPolicyState();
            renderBlockedPlayKeywordState();
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
            window.__attributeConfigReady = true;
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
            handleNoiseRuleScopeChange();
            handleAmountUnitScopeChange();
            renderDefaultOddsState();
            renderAnchorParseModeState();
            renderAttributeCombinePolicyState();
            renderRegionAccountingPolicyState();
            renderBlockedPlayKeywordState();
            if (window.userManager && typeof window.userManager.syncStoredUserParsePreferencesToRules === 'function') {
                window.userManager.syncStoredUserParsePreferencesToRules();
            }
            if (window.userManager && typeof window.userManager.renderUserList === 'function') {
                window.userManager.renderUserList();
            }
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
        const sortedUsers = userManager && typeof userManager.getSortedUsers === 'function'
            ? userManager.getSortedUsers()
            : [];
        if (!sortedUsers.length) {
            showError('汇总失败', '当前没有客户可汇总');
            return;
        }
        if (userManager && typeof userManager.setMultiSelectEnabled === 'function') {
            userManager.setMultiSelectEnabled(true);
        }
        if (userManager && typeof userManager.setSelectedUsers === 'function') {
            userManager.setSelectedUsers(sortedUsers);
        }
        userManager.setSummaryMode(true);
        console.log('进入汇总模式');
    } catch (error) {
        showError('汇总失败', error.message);
    }
}

function handleOriginalDataSearchInput(value) {
    if (!window.userManager || typeof window.userManager.setOriginalDataSearchKeyword !== 'function') {
        return;
    }
    window.userManager.setOriginalDataSearchKeyword(value);
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
        if (!raw) return { attributes: true, anchors: false, noise: false, amountUnits: false };
        const parsed = JSON.parse(raw);
        const normalized = {
            attributes: parsed && parsed.attributes !== false,
            anchors: parsed && parsed.anchors === true,
            noise: parsed && parsed.noise === true,
            amountUnits: parsed && parsed.amountUnits === true
        };
        const expandedKeys = Object.keys(normalized).filter((key) => normalized[key]);
        if (expandedKeys.length > 1) {
            const keepKey = expandedKeys[0];
            Object.keys(normalized).forEach((key) => {
                normalized[key] = key === keepKey;
            });
        }
        return normalized;
    } catch (error) {
        return { attributes: true, anchors: false, noise: false, amountUnits: false };
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
        { key: 'anchors', rootId: 'recognizeGroupAnchors', toggleId: 'recognizeGroupAnchorsToggle' },
        { key: 'noise', rootId: 'recognizeGroupNoise', toggleId: 'recognizeGroupNoiseToggle' },
        { key: 'amountUnits', rootId: 'recognizeGroupAmountUnits', toggleId: 'recognizeGroupAmountUnitsToggle' }
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
    if (!['attributes', 'anchors', 'noise', 'amountUnits'].includes(groupKey)) return;
    const currentlyExpanded = recognizeSideGroupState[groupKey] !== false;
    if (currentlyExpanded) {
        recognizeSideGroupState[groupKey] = false;
    } else {
        Object.keys(recognizeSideGroupState).forEach((key) => {
            recognizeSideGroupState[key] = key === groupKey;
        });
        if (groupKey === 'attributes') {
            renderAttributeCombinePolicyState();
            renderRegionAccountingPolicyState();
            renderBlockedPlayKeywordState();
        } else if (groupKey === 'anchors') {
            renderDefaultOddsState();
            renderAnchorParseModeState();
            renderAnchorAliasList();
            renderAnchorImpactPreview();
        } else if (groupKey === 'noise') {
            handleNoiseRuleScopeChange();
        } else if (groupKey === 'amountUnits') {
            handleAmountUnitScopeChange();
        }
    }
    applyRecognizeSideGroups();
    saveRecognizeSideGroupState();
}

function syncRecognizeModalActionMode() {
    const confirmBtn = document.getElementById('recognizeConfirmBtn');
    const clearBtn = document.getElementById('recognizeClearBtn');
    if (confirmBtn) {
        confirmBtn.textContent = recognizeEditContext ? '保存' : '添加';
        confirmBtn.disabled = recognizePreviewBlocked;
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
    const focusLineNo = Number.isFinite(Number(context.focusLineNo)) ? Number(context.focusLineNo) : null;
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
    Promise.resolve(previewMessage({ silent: true })).finally(() => {
        if (Number.isFinite(focusLineNo) && focusLineNo > 0) {
            focusRecognizeMessageLine(focusLineNo);
        }
    });
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
        renderRecognizeVoiceUi();
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
    stopRecognizeVoiceInput({ discard: true });
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

function buildRecognizeIssueKey(issue) {
    const lineNo = Number.parseInt(issue && issue.lineNo, 10);
    const safeLineNo = Number.isFinite(lineNo) ? lineNo : '?';
    const rawText = String(issue && issue.rawText ? issue.rawText : '').trim();
    const reason = String(issue && issue.reason ? issue.reason : '').trim();
    return `${safeLineNo}|${rawText}|${reason}`;
}

function getRecognizeConfirmActionVerb() {
    return recognizeEditContext ? '保存' : '添加';
}

function getRecognizeBlockedBadgeText() {
    return recognizeEditContext ? '不可保存' : '不可添加';
}

function getRecognizeActiveClientId() {
    if (recognizeEditContext && recognizeEditContext.userName) {
        return String(recognizeEditContext.userName || '').trim();
    }
    return getPreviewClientId() || '';
}

function encodeRecognizeActionArg(value) {
    return encodeURIComponent(String(value == null ? '' : value));
}

function decodeRecognizeActionArg(value) {
    try {
        return decodeURIComponent(String(value == null ? '' : value));
    } catch (error) {
        return String(value == null ? '' : value);
    }
}

function inferQuickAnchorModeFromToken(token) {
    const normalized = String(token || '').replace(/\s+/g, '');
    if (!normalized) return 'per_number';
    if (/肖|生肖/u.test(normalized)) {
        return 'per_target_equal_split';
    }
    return 'per_number';
}

function extractUnknownAnchorTokensFromReason(reason) {
    const raw = String(reason || '').trim();
    const match = raw.match(/未配置锚点：(.+)$/u);
    if (!match) return [];
    return String(match[1] || '')
        .split('、')
        .map((item) => String(item || '').replace(/（\d+次）/gu, '').trim())
        .filter(Boolean);
}

function extractAmbiguousChunksFromReason(reason) {
    const raw = String(reason || '').trim();
    const match = raw.match(/歧义简写：(.+?)(?:，|,)\s*缺少明确金额单位或高额特征/u);
    if (!match) return [];
    return String(match[1] || '')
        .split('、')
        .map(item => String(item || '').trim())
        .filter(Boolean);
}

function buildAmbiguousRewriteSuggestion(rawText, reason) {
    const source = String(rawText || '').trim();
    if (!source) return null;
    const chunks = extractAmbiguousChunksFromReason(reason);
    if (!chunks.length) return null;
    let nextText = source;
    let changed = false;
    chunks.forEach((chunk) => {
        const normalized = String(chunk || '')
            .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248))
            .trim();
        const parsed = normalized.match(/^(\d{1,2})\s*[-=/#*]\s*([0-9]+|[零〇一二两三四五六七八九十百千万]+)$/u);
        if (!parsed) return;
        const numberText = String(parsed[1] || '').padStart(2, '0');
        const amountText = String(parsed[2] || '').trim();
        const replacement = `${numberText}各${amountText}元`;
        if (!replacement) return;
        nextText = nextText.replace(chunk, replacement);
        changed = true;
    });
    if (!changed || nextText === source) return null;
    return {
        nextText,
        previewText: nextText.length > 36 ? `${nextText.slice(0, 36)}...` : nextText
    };
}

function detectAmountUnitCandidatesFromIssue(rawText) {
    const source = String(rawText || '').trim();
    if (!source) return [];
    const pattern = /(?:\d{1,2}\s*(?:[-=/#*]|[.．。])\s*(?:[0-9０-９]+|[零〇一二两三四五六七八九十百千万]+)|各\s*(?:[0-9０-９]+|[零〇一二两三四五六七八九十百千万]+))\s*([A-Za-z\u4e00-\u9fa5]{1,4})/gu;
    const tokens = new Set();
    let match = null;
    while ((match = pattern.exec(source)) !== null) {
        const token = normalizeAmountUnitInput(match[1]);
        if (!token) continue;
        tokens.add(token);
    }
    return Array.from(tokens);
}

function buildRecognizeBlockingActionPlan(warning, row) {
    const issue = warning && typeof warning === 'object' ? warning : {};
    const lineNo = Number.isFinite(Number(row && row.lineNo)) ? Number(row.lineNo) : null;
    const rawText = String((row && row.sourceText) || issue.rawText || '').trim();
    const reason = String(issue.reason || '').trim() || '格式无法识别';
    const currentClientId = getRecognizeActiveClientId();
    const actions = [];
    let suggestion = '';

    const unknownTokens = extractUnknownAnchorTokensFromReason(reason);
    if (unknownTokens.length > 0) {
        const limitedTokens = unknownTokens.slice(0, 2);
        suggestion = limitedTokens.length === 1
            ? `建议把「${limitedTokens[0]}」加入锚点；如果它不是锚点，请直接改写这一行。`
            : `建议先补齐锚点：${limitedTokens.map(token => `「${token}」`).join('、')}。`;
        limitedTokens.forEach((token) => {
            if (currentClientId) {
                actions.push({
                    label: `当前客户加锚点：${token}`,
                    handler: 'handleRecognizeQuickAddAnchor',
                    args: [token, 'client', currentClientId, lineNo || '']
                });
            }
            actions.push({
                label: `全部客户加锚点：${token}`,
                handler: 'handleRecognizeQuickAddAnchor',
                args: [token, 'global', '', lineNo || '']
            });
        });
    }

    const rewriteSuggestion = buildAmbiguousRewriteSuggestion(rawText, reason);
    if (rewriteSuggestion) {
        if (!suggestion) {
            suggestion = `如果这里表达的是金额，建议改成「${rewriteSuggestion.previewText}」。`;
        }
        actions.unshift({
            label: '按建议改写本行',
            handler: 'applyRecognizeSuggestedLineRewrite',
            args: [lineNo || '', rewriteSuggestion.nextText]
        });
    }

    const amountUnitTokens = detectAmountUnitCandidatesFromIssue(rawText);
    if (!suggestion && amountUnitTokens.length > 0 && /无效的数字|格式无法识别|缺少明确金额单位/u.test(reason)) {
        suggestion = `这一行可能缺少金额单位配置，可尝试把 ${amountUnitTokens.map(token => `「${token}」`).join('、')} 加入金额单位。`;
        amountUnitTokens.slice(0, 2).forEach((token) => {
            if (currentClientId) {
                actions.push({
                    label: `当前客户加单位：${token}`,
                    handler: 'handleRecognizeQuickAddAmountUnit',
                    args: [token, 'client', currentClientId, lineNo || '']
                });
            }
            actions.push({
                label: `全部客户加单位：${token}`,
                handler: 'handleRecognizeQuickAddAmountUnit',
                args: [token, 'global', '', lineNo || '']
            });
        });
    }

    if (!suggestion && /检测到\s*\d+\s*组金额/u.test(reason)) {
        suggestion = '这一行看起来有多组下注，建议拆成多行，或补清楚锚点后再保存。';
    }
    if (!suggestion && /无效的数字/u.test(reason)) {
        suggestion = '这一行里可能把金额写成了号码，建议检查金额边界，必要时补“元/块/米”等单位。';
    }
    if (!suggestion && /存在未绑定数值/u.test(reason)) {
        suggestion = '这一行还有号码没绑到金额，建议补上“各/各号/买 + 金额”。';
    }
    if (!suggestion) {
        suggestion = '请先定位这一行，手动改清楚后再重新预览。';
    }

    if (lineNo) {
        actions.push({
            label: '定位本行',
            handler: 'focusRecognizeMessageLine',
            args: [lineNo]
        });
    }

    return { suggestion, actions };
}

function buildRecognizeActionButtonHtml(action) {
    if (!action || !action.handler || !action.label) return '';
    const args = Array.isArray(action.args) ? action.args : [];
    const encodedArgs = args.map((item) => `'${encodeRecognizeActionArg(item)}'`).join(', ');
    return `
        <button
            type="button"
            class="parse-issue-action-button"
            onclick="${action.handler}(${encodedArgs}); return false;"
        >${escapeHtml(String(action.label || '').trim())}</button>
    `;
}

function renderRecognizeBlockedWarnings(row) {
    const safeWarnings = Array.isArray(row && row.warnings) ? row.warnings.filter(Boolean) : [];
    if (!safeWarnings.length) return '';
    return `
        <div class="recognize-compare-warning-list">
            ${safeWarnings.map((warning) => {
                const actionPlan = buildRecognizeBlockingActionPlan(warning, row);
                const actionsHtml = (Array.isArray(actionPlan.actions) ? actionPlan.actions : [])
                    .map(buildRecognizeActionButtonHtml)
                    .join('');
                return `
                    <div class="recognize-compare-warning-item blocking">
                        <div>已拦截：${escapeHtml(String(warning.reason || '格式无法识别').trim() || '格式无法识别')}</div>
                        ${actionPlan.suggestion
                            ? `<div class="recognize-issue-suggestion">建议：${escapeHtml(actionPlan.suggestion)}</div>`
                            : ''}
                        ${actionsHtml ? `<div class="recognize-issue-actions">${actionsHtml}</div>` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function getMessageLineRange(text, lineNo) {
    const raw = String(text || '').replace(/\r/g, '');
    const normalizedLineNo = Number.parseInt(lineNo, 10);
    if (!Number.isFinite(normalizedLineNo) || normalizedLineNo <= 0) {
        return null;
    }
    const lines = raw.split('\n');
    if (normalizedLineNo > lines.length) {
        return null;
    }
    let start = 0;
    for (let i = 0; i < normalizedLineNo - 1; i += 1) {
        start += lines[i].length + 1;
    }
    const end = start + lines[normalizedLineNo - 1].length;
    return { start, end, lineText: lines[normalizedLineNo - 1], lines };
}

function focusRecognizeMessageLine(encodedLineNo) {
    const lineNo = Number.parseInt(decodeRecognizeActionArg(encodedLineNo), 10);
    const textarea = document.getElementById('message');
    if (!textarea || !Number.isFinite(lineNo) || lineNo <= 0) return false;
    const range = getMessageLineRange(textarea.value, lineNo);
    if (!range) return false;
    textarea.focus();
    if (typeof textarea.setSelectionRange === 'function') {
        textarea.setSelectionRange(range.start, range.end);
    }
    const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight || '24') || 24;
    textarea.scrollTop = Math.max(0, (lineNo - 1) * lineHeight - lineHeight * 2);
    setMessageLineErrors([lineNo]);
    return true;
}

function replaceRecognizeMessageLine(lineNo, nextText) {
    const textarea = document.getElementById('message');
    if (!textarea) return false;
    const raw = String(textarea.value || '').replace(/\r/g, '');
    const lines = raw.split('\n');
    const normalizedLineNo = Number.parseInt(lineNo, 10);
    if (!Number.isFinite(normalizedLineNo) || normalizedLineNo <= 0 || normalizedLineNo > lines.length) {
        return false;
    }
    lines[normalizedLineNo - 1] = String(nextText || '');
    textarea.value = lines.join('\n');
    syncRecognizeMessageAutoHeight();
    renderMessageLineNumbers();
    focusRecognizeMessageLine(normalizedLineNo);
    previewMessage({ silent: true });
    return true;
}

function applyRecognizeSuggestedLineRewrite(encodedLineNo, encodedNextText) {
    const lineNo = Number.parseInt(decodeRecognizeActionArg(encodedLineNo), 10);
    const nextText = decodeRecognizeActionArg(encodedNextText);
    if (!Number.isFinite(lineNo) || !nextText) {
        showError('处理失败', '缺少可应用的改写内容');
        return;
    }
    if (replaceRecognizeMessageLine(lineNo, nextText)) {
        showSuccess(`已按建议改写第 ${lineNo} 行`);
    } else {
        showError('处理失败', `无法定位第 ${lineNo} 行`);
    }
}

function refreshAfterRecognizeQuickRuleChange(lineNo = null) {
    recalculateAllUsersByRuleChange();
    if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
        window.userManager.renderAllSections();
    }
    Promise.resolve(previewMessage({ silent: true })).finally(() => {
        if (Number.isFinite(Number(lineNo)) && Number(lineNo) > 0) {
            focusRecognizeMessageLine(lineNo);
        }
    });
}

function handleRecognizeQuickAddAnchor(encodedToken, encodedScope, encodedClientId, encodedLineNo) {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.upsertAnchorAlias !== 'function') {
            throw new Error('当前版本不支持锚点快捷处理');
        }
        const token = decodeRecognizeActionArg(encodedToken).trim();
        const scope = decodeRecognizeActionArg(encodedScope) === 'client' ? 'client' : 'global';
        const clientId = decodeRecognizeActionArg(encodedClientId).trim();
        const lineNo = Number.parseInt(decodeRecognizeActionArg(encodedLineNo), 10);
        if (!token) {
            throw new Error('缺少锚点内容');
        }
        if (scope === 'client' && !clientId) {
            throw new Error('当前没有可用的客户可保存专属锚点');
        }
        const mode = inferQuickAnchorModeFromToken(token);
        window.messageProcessor.upsertAnchorAlias(token, mode, { scope, clientId });
        refreshAfterRecognizeQuickRuleChange(lineNo);
        showSuccess(`${getScopeDisplayName(scope)}锚点已保存：${token}`);
    } catch (error) {
        showError('快捷保存锚点失败', error.message || '未知错误');
    }
}

function handleRecognizeQuickAddAmountUnit(encodedToken, encodedScope, encodedClientId, encodedLineNo) {
    try {
        if (!window.messageProcessor || typeof window.messageProcessor.upsertAmountUnit !== 'function') {
            throw new Error('当前版本不支持金额单位快捷处理');
        }
        const token = normalizeAmountUnitInput(decodeRecognizeActionArg(encodedToken));
        const scope = decodeRecognizeActionArg(encodedScope) === 'client' ? 'client' : 'global';
        const clientId = decodeRecognizeActionArg(encodedClientId).trim();
        const lineNo = Number.parseInt(decodeRecognizeActionArg(encodedLineNo), 10);
        if (!token) {
            throw new Error('缺少金额单位内容');
        }
        if (scope === 'client' && !clientId) {
            throw new Error('当前没有可用的客户可保存专属金额单位');
        }
        window.messageProcessor.upsertAmountUnit(token, { scope, clientId });
        refreshAfterRecognizeQuickRuleChange(lineNo);
        showSuccess(`${getScopeDisplayName(scope)}金额单位已保存：${token}`);
    } catch (error) {
        showError('快捷保存金额单位失败', error.message || '未知错误');
    }
}

function handleRecognizeBlockedAiRewrite() {
    rewriteMessageWithLocalAi({ source: 'blocking_lines' });
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

function getRecognizePreviewSummary(result) {
    const summary = result && result.summary && typeof result.summary === 'object'
        ? result.summary
        : {};
    const entries = Array.isArray(result && result.entries) ? result.entries.filter(Boolean) : [];
    const playEntries = Array.isArray(result && result.playEntries) ? result.playEntries.filter(Boolean) : [];
    const blockingLines = Array.isArray(result && result.blockingUnresolvedLines)
        ? result.blockingUnresolvedLines.filter(Boolean)
        : [];
    const ignoredLines = Array.isArray(result && result.ignoredUnresolvedLines)
        ? result.ignoredUnresolvedLines.filter(Boolean)
        : [];
    const countedAmount = Number.isFinite(Number(summary.countedAmount))
        ? Number(summary.countedAmount)
        : entries.reduce((sum, entry) => sum + (Number(entry && entry.totalAmount) || 0), 0);
    return {
        status: String(summary.status || '').trim() || 'partial',
        statusLabel: String(summary.statusLabel || '').trim() || '部分统计',
        countedEntryCount: Number(summary.countedEntryCount) || entries.length,
        countedAmount,
        playCount: Number(summary.playCount) || playEntries.length,
        blockedCount: Number(summary.blockedCount) || blockingLines.length,
        ignoredCount: Number(summary.ignoredCount) || ignoredLines.length
    };
}

function renderRecognizePreviewSummary(summary) {
    if (!summary || typeof summary !== 'object') return '';
    const blocks = [
        {
            label: '待处理',
            value: `${Number(summary.blockedCount) || 0}行`,
            note: '高风险内容，需修改后再入账',
            tone: 'blocked'
        },
        {
            label: '未统计',
            value: `${Number(summary.playCount) || 0}条`,
            note: '已识别但不入号码统计',
            tone: 'play'
        },
        {
            label: '已忽略',
            value: `${Number(summary.ignoredCount) || 0}行`,
            note: '摘要尾巴或噪音，不影响统计',
            tone: 'ignored'
        },
        {
            label: '已计入',
            value: `${Number(summary.countedEntryCount) || 0}条`,
            note: Number(summary.countedAmount) > 0 ? `金额 ${formatNumericAmount(summary.countedAmount)}` : '未计金额',
            tone: 'counted'
        }
    ];
    return `
        <div class="recognize-preview-summary">
            ${blocks.map((block) => `
                <div class="recognize-preview-summary-card tone-${block.tone}">
                    <div class="recognize-preview-summary-label">${escapeHtml(block.label)}</div>
                    <div class="recognize-preview-summary-value">${escapeHtml(block.value)}</div>
                    <div class="recognize-preview-summary-note">${escapeHtml(block.note)}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderCompareStandardEntries(entries, emptyText = '（本行未识别到可用投注）') {
    const safeEntries = Array.isArray(entries) ? entries.filter(Boolean) : [];
    if (!safeEntries.length) {
        return renderCompareCellValue('', emptyText, 'standard');
    }
    const itemsHtml = safeEntries.map((entry) => {
        const coreText = formatRecognizePreviewEntryCore(entry);
        const accountingRegionText = String(entry.accountingRegionLabel || entry.regionLabel || '新奥').trim() || '新奥';
        const parsedRegionText = String(entry.parsedRegionLabel || '').trim();
        const mergedRegionText = entry && entry.separateStatsByRegion === false
            ? `统一记${accountingRegionText}`
            : accountingRegionText;
        const showParsedRegionTag = entry
            && entry.separateStatsByRegion === false
            && parsedRegionText
            && parsedRegionText !== accountingRegionText;
        const isPlay = String(entry && entry.kind ? entry.kind : '').trim() === 'play';
        return `
            <div class="recognize-standard-item ${isPlay ? 'play' : 'counted'}">
                <span class="recognize-standard-text">${escapeHtml(coreText || '（无法生成标准格式）')}</span>
                <span class="recognize-standard-tags">
                    <span class="recognize-entry-state-tag ${isPlay ? 'play' : 'counted'}">${isPlay ? '未统计' : '已计入'}</span>
                    <span class="recognize-region-tag">${escapeHtml(mergedRegionText)}</span>
                    ${showParsedRegionTag ? `<span class="recognize-region-tag">${escapeHtml(`识别${parsedRegionText}`)}</span>` : ''}
                </span>
            </div>
        `;
    }).join('');
    return `<div class="recognize-compare-cell-value standard">${itemsHtml}</div>`;
}

function renderCompareLineWarnings(warnings) {
    const safeWarnings = Array.isArray(warnings) ? warnings.filter(Boolean) : [];
    if (!safeWarnings.length) return '';
    return `
        <div class="recognize-compare-warning-list">
            ${safeWarnings.map((warning) => `
                <div class="recognize-compare-warning-item ${warning && warning.blocking ? 'blocking' : 'ignored'}">
                    ${warning && warning.blocking ? '已拦截' : '已忽略'}：${escapeHtml(String(warning.reason || '格式无法识别').trim() || '格式无法识别')}
                </div>
            `).join('')}
        </div>
    `;
}

function formatRecognizePreviewLineLabel(lineNo, fallback = '未定位') {
    const parsed = Number.parseInt(lineNo, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
        return `第 ${parsed} 行`;
    }
    return fallback;
}

function renderRecognizePreviewSourceCell(row) {
    return `
        <div class="recognize-preview-source-cell">
            <div class="recognize-preview-source-meta">
                <span class="recognize-preview-line-tag">${escapeHtml(formatRecognizePreviewLineLabel(row && row.lineNo, '未定位段'))}</span>
            </div>
            ${renderCompareCellValue(row && row.sourceText, '（无法定位到原文）')}
        </div>
    `;
}

function buildRecognizePreviewGroupedRows(result, rawValue) {
    const rawLines = String(rawValue || '')
        .replace(/\r/g, '')
        .split('\n');
    const getSourceText = (lineNo, fallbackText = '') => {
        const parsed = Number.parseInt(lineNo, 10);
        const fallback = String(fallbackText || '').trim();
        if (Number.isFinite(parsed) && parsed > 0 && parsed <= rawLines.length) {
            const rawLine = String(rawLines[parsed - 1] || '');
            const displayLine = rawLine.trim();
            return displayLine || rawLine || fallback;
        }
        return fallback;
    };
    const sortRows = (rows) => rows.sort((left, right) => {
        const leftLine = Number.parseInt(left && left.lineNo, 10);
        const rightLine = Number.parseInt(right && right.lineNo, 10);
        const safeLeftLine = Number.isFinite(leftLine) && leftLine > 0 ? leftLine : Number.MAX_SAFE_INTEGER;
        const safeRightLine = Number.isFinite(rightLine) && rightLine > 0 ? rightLine : Number.MAX_SAFE_INTEGER;
        if (safeLeftLine !== safeRightLine) {
            return safeLeftLine - safeRightLine;
        }
        const safeLeftOrder = Number.isFinite(Number(left && left.order)) ? Number(left.order) : Number.MAX_SAFE_INTEGER;
        const safeRightOrder = Number.isFinite(Number(right && right.order)) ? Number(right.order) : Number.MAX_SAFE_INTEGER;
        return safeLeftOrder - safeRightOrder;
    });

    const buildEntryRows = (items = [], kind = 'counted') => {
        const rows = [];
        const map = new Map();
        (Array.isArray(items) ? items : []).forEach((entry, index) => {
            if (!entry) return;
            const parsedLineNo = Number.parseInt(entry.lineNo, 10);
            const parsedOrder = Number.isFinite(Number(entry && entry.parseOrder)) ? Number(entry.parseOrder) : (index + 1);
            const key = Number.isFinite(parsedLineNo) && parsedLineNo > 0
                ? `line:${parsedLineNo}`
                : `${kind}:floating:${index}`;
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    lineNo: Number.isFinite(parsedLineNo) && parsedLineNo > 0 ? parsedLineNo : null,
                    order: parsedOrder,
                    sourceText: getSourceText(parsedLineNo, entry.rawText || entry.displayText || entry.canonical || ''),
                    entries: []
                });
            }
            const row = map.get(key);
            row.entries.push(entry);
            row.order = Math.min(row.order, parsedOrder);
            rows.push(row);
        });
        return sortRows(Array.from(new Set(rows)));
    };

    const buildIssueRows = (issues = [], kind = 'blocked') => {
        const rows = [];
        const map = new Map();
        (Array.isArray(issues) ? issues : []).forEach((issue, index) => {
            if (!issue) return;
            const parsedLineNo = Number.parseInt(issue.lineNo, 10);
            const keyBase = Number.isFinite(parsedLineNo) && parsedLineNo > 0
                ? `line:${parsedLineNo}`
                : `${kind}:floating:${index}`;
            const rawText = String(issue.rawText || '').trim();
            const key = rawText ? `${keyBase}:${rawText}` : keyBase;
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    lineNo: Number.isFinite(parsedLineNo) && parsedLineNo > 0 ? parsedLineNo : null,
                    order: Number.isFinite(parsedLineNo) && parsedLineNo > 0 ? parsedLineNo : (index + 1),
                    sourceText: getSourceText(parsedLineNo, rawText),
                    warnings: []
                });
            }
            map.get(key).warnings.push({
                ...issue,
                blocking: kind === 'blocked'
            });
        });
        map.forEach(row => rows.push(row));
        return sortRows(rows);
    };

    return {
        countedRows: buildEntryRows(Array.isArray(result && result.entries) ? result.entries : [], 'counted'),
        playRows: buildEntryRows(Array.isArray(result && result.playEntries) ? result.playEntries : [], 'play'),
        blockedRows: buildIssueRows(Array.isArray(result && result.blockingUnresolvedLines) ? result.blockingUnresolvedLines : [], 'blocked'),
        ignoredRows: buildIssueRows(Array.isArray(result && result.ignoredUnresolvedLines) ? result.ignoredUnresolvedLines : [], 'ignored')
    };
}

function renderRecognizePreviewGroupedCompareRows(rows, kind = 'counted') {
    const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
    if (!safeRows.length) return '';
    return safeRows.map((row) => `
        <div class="recognize-compare-row tone-${kind}">
            <div class="recognize-compare-cell">
                ${renderRecognizePreviewSourceCell(row)}
            </div>
            <div class="recognize-compare-cell">
                ${kind === 'counted' || kind === 'play'
                    ? renderCompareStandardEntries(row.entries, kind === 'counted' ? '（本组暂无安全识别）' : '（本组暂无未统计内容）')
                    : (kind === 'blocked'
                        ? (renderRecognizeBlockedWarnings(row) || renderCompareCellValue('', '（暂无处理建议）'))
                        : (renderCompareLineWarnings(row.warnings) || renderCompareCellValue('', '（暂无忽略原因）')))
                }
            </div>
        </div>
    `).join('');
}

function renderRecognizePreviewGroupSection(config = {}) {
    const title = String(config.title || '').trim() || '未命名分组';
    const note = String(config.note || '').trim();
    const countLabel = String(config.countLabel || '').trim();
    const tone = String(config.tone || 'counted').trim();
    const rowsHtml = String(config.rowsHtml || '').trim();
    const emptyText = String(config.emptyText || '当前分组暂无内容').trim();
    const leftHeader = String(config.leftHeader || '原始消息').trim();
    const rightHeader = String(config.rightHeader || '核对结果').trim();
    return `
        <section class="recognize-preview-group tone-${tone}">
            <div class="recognize-preview-group-head">
                <div class="recognize-preview-group-title-wrap">
                    <div class="recognize-preview-group-title">${escapeHtml(title)}</div>
                    ${note ? `<div class="recognize-preview-group-note">${escapeHtml(note)}</div>` : ''}
                </div>
                ${countLabel ? `<div class="recognize-preview-group-count">${escapeHtml(countLabel)}</div>` : ''}
            </div>
            ${rowsHtml
                ? `
                    <div class="recognize-compare-table-head in-group">
                        <div class="recognize-compare-head-cell">${escapeHtml(leftHeader)}</div>
                        <div class="recognize-compare-head-cell">${escapeHtml(rightHeader)}</div>
                    </div>
                    <div class="recognize-compare-list">${rowsHtml}</div>
                `
                : `<div class="recognize-preview-group-empty">${escapeHtml(emptyText)}</div>`}
        </section>
    `;
}

function buildRecognizePreviewHtml(previewResult, rawValue) {
    if (!previewResult || !previewResult.success || !previewResult.result) {
        const errorText = previewResult && previewResult.error ? previewResult.error : '解析失败';
        return `<div class="inline-parse-error">错误：${escapeHtml(errorText)}</div>`;
    }

    const result = previewResult.result || {};
    const summary = getRecognizePreviewSummary(result);
    const regionAccounting = result && result.regionAccounting && typeof result.regionAccounting === 'object'
        ? result.regionAccounting
        : null;
    const groupedRows = buildRecognizePreviewGroupedRows(result, rawValue);
    const blockedLineLabels = groupedRows.blockedRows
        .map((row) => formatRecognizePreviewLineLabel(row && row.lineNo, '未定位段'))
        .filter(Boolean)
        .slice(0, 4);
    const blockedLineSummaryText = blockedLineLabels.length > 0
        ? `待人工处理：${blockedLineLabels.join('、')}${groupedRows.blockedRows.length > blockedLineLabels.length ? ' 等' : ''}`
        : '待人工处理内容请看下方红色分组。';
    const blockedReasonSummaryText = groupedRows.blockedRows
        .flatMap((row) => Array.isArray(row && row.warnings) ? row.warnings : [])
        .filter(Boolean)
        .slice(0, 3)
        .map((issue) => {
            const lineLabel = formatRecognizePreviewLineLabel(issue && issue.lineNo, '未定位段');
            const reason = String(issue && issue.reason ? issue.reason : '格式无法识别').trim() || '格式无法识别';
            return `${lineLabel}：${reason}`;
        })
        .join('；');
    const firstBlockedLineNo = groupedRows.blockedRows.find((row) => Number.isFinite(Number(row && row.lineNo)) && Number(row.lineNo) > 0)?.lineNo || '';
    const sections = [
        {
            title: '待人工处理',
            note: '这些内容当前不会入账。请先看建议并处理后，再重新预览。',
            countLabel: `${Number(summary.blockedCount) || 0} 行`,
            tone: 'blocked',
            rowsHtml: renderRecognizePreviewGroupedCompareRows(groupedRows.blockedRows, 'blocked'),
            rightHeader: '处理建议',
            emptyText: '当前没有需要立即处理的高风险内容。'
        },
        {
            title: '已识别但未统计',
            note: '这些内容识别到了，但当前不进入号码统计。',
            countLabel: `${Number(summary.playCount) || 0} 条`,
            tone: 'play',
            rowsHtml: renderRecognizePreviewGroupedCompareRows(groupedRows.playRows, 'play'),
            emptyText: '当前没有“已识别但未统计”的内容。'
        },
        {
            title: '已忽略',
            note: '这些内容被当作摘要尾巴或噪音忽略，不影响统计。',
            countLabel: `${Number(summary.ignoredCount) || 0} 行`,
            tone: 'ignored',
            rowsHtml: renderRecognizePreviewGroupedCompareRows(groupedRows.ignoredRows, 'ignored'),
            emptyText: '当前没有被忽略的内容。'
        },
        {
            title: '安全识别',
            note: '这些内容已经安全计入号码统计。',
            countLabel: `${Number(summary.countedEntryCount) || 0} 条`,
            tone: 'counted',
            rowsHtml: renderRecognizePreviewGroupedCompareRows(groupedRows.countedRows, 'counted'),
            emptyText: '当前没有已安全计入的内容。'
        }
    ];
    const sectionsHtml = sections
        .filter((section) => String(section.rowsHtml || '').trim())
        .map(section => renderRecognizePreviewGroupSection(section))
        .join('');
    const emptySectionsHtml = sectionsHtml
        ? ''
        : renderRecognizePreviewGroupSection({
            title: '安全识别',
            note: '当前没有可展示的识别结果。',
            countLabel: '0 条',
            tone: 'counted',
            rowsHtml: '',
            emptyText: '当前没有可核对的识别结果。'
        });

    const confirmActionVerb = getRecognizeConfirmActionVerb();
    const blockedBadgeText = getRecognizeBlockedBadgeText();
    const blockingUnresolvedLines = Array.isArray(result.blockingUnresolvedLines)
        ? result.blockingUnresolvedLines.filter(Boolean)
        : [];
    const unresolvedLines = Array.isArray(result.unresolvedLines) ? result.unresolvedLines.filter(Boolean) : [];
    const summaryBlock = renderRecognizePreviewSummary(summary);
    const warningBlock = blockingUnresolvedLines.length > 0
        ? `
            <div class="parse-issue parse-issue-blocking" style="margin-bottom: 12px;">
                <div class="parse-issue-head">
                    <span class="parse-issue-badge blocking">当前消息${blockedBadgeText}</span>
                </div>
                <div class="parse-issue-message">当前仍有 ${blockingUnresolvedLines.length} 行待人工处理，已阻止${confirmActionVerb}。${escapeHtml(blockedLineSummaryText)}${blockedReasonSummaryText ? `<br>原因：${escapeHtml(blockedReasonSummaryText)}` : ''}</div>
                ${firstBlockedLineNo
                    ? `
                        <div class="parse-issue-actions">
                            <button type="button" class="parse-issue-action-button" onclick="focusRecognizeMessageLine('${encodeRecognizeActionArg(firstBlockedLineNo)}'); return false;">定位第一条待处理</button>
                        </div>
                    `
                    : ''}
            </div>
        `
        : (unresolvedLines.length
            ? `
                <div class="parse-issue parse-issue-warning" style="margin-bottom: 12px;">
                    <div class="parse-issue-head">
                        <span class="parse-issue-badge warning">部分未识别</span>
                    </div>
                    <div class="parse-issue-message">当前消息已按可识别部分统计，另有 ${unresolvedLines.length} 行内容暂未识别，已忽略。</div>
                </div>
            `
            : '');
    const accountingNotice = regionAccounting && regionAccounting.separateStatsByRegion === false
        ? `
            <div class="parse-issue parse-issue-warning" style="margin-bottom: 12px;">
                <div class="parse-issue-head">
                    <span class="parse-issue-badge warning">当前客户不分盘口统计</span>
                </div>
                <div class="parse-issue-message">消息里识别到的新奥/老奥/香港不会拆账，最终统一记到 ${escapeHtml(String(regionAccounting.defaultRegionLabel || '新奥').trim() || '新奥')}。</div>
            </div>
        `
        : '';
    return `<div class="recognize-compare-table">${summaryBlock}${accountingNotice}${warningBlock}<div class="recognize-preview-groups">${sectionsHtml || emptySectionsHtml}</div></div>`;
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
            setRecognizePreviewBlocked(false);
            setRecognizePreviewError('');
            clearMessageLineError();
            return;
        }

        const message = normalizeMessageBeforeSubmit(rawValue);
        if (!message) {
            if (resultElement) {
                resultElement.innerHTML = '';
            }
            setRecognizePreviewBlocked(false);
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
        const unresolvedLines = Array.isArray(previewResult.result && previewResult.result.unresolvedLines)
            ? previewResult.result.unresolvedLines.filter(Boolean)
            : [];
        const blockingUnresolvedLines = Array.isArray(previewResult.result && previewResult.result.blockingUnresolvedLines)
            ? previewResult.result.blockingUnresolvedLines.filter(Boolean)
            : [];
        if (unresolvedLines.length > 0) {
            setMessageLineErrors(unresolvedLines.map(item => item.lineNo).filter(lineNo => Number.isFinite(Number(lineNo))));
            if (blockingUnresolvedLines.length > 0) {
                setRecognizePreviewBlocked(true);
                setRecognizePreviewError(`当前消息${getRecognizeBlockedBadgeText()}：仍有 ${blockingUnresolvedLines.length} 行待人工处理`);
            } else {
                setRecognizePreviewBlocked(false);
                setRecognizePreviewError(`已忽略 ${unresolvedLines.length} 行暂未识别内容`);
            }
        } else {
            setRecognizePreviewBlocked(false);
            setRecognizePreviewError('');
            clearMessageLineError();
        }
    } catch (error) {
        const message = error && error.message ? error.message : '解析失败';
        // 实时输入中对“输入不完整”类错误不打断、不刷红错误。
        const shouldSuppressRealtime = realtime && /(输入不完整|请输入消息内容)/.test(message);
        if (shouldSuppressRealtime) {
            return;
        }
        setRecognizePreviewBlocked(true);
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
            const resolved = await resolveMessageAmbiguityFlow(message, userName, {
                interactive: true,
                updateTextarea: true
            });
            const previewResult = resolved && resolved.previewResult ? resolved.previewResult : null;
            if (!previewResult || !previewResult.success) {
                const errorMessage = previewResult && previewResult.error ? previewResult.error : '解析失败';
                renderInlineParseError(errorMessage, { context: 'confirm', clientId: userName });
                showError('确认失败', `${userName}: ${errorMessage}`);
                return;
            }
            const blockingUnresolvedLines = Array.isArray(previewResult.result && previewResult.result.blockingUnresolvedLines)
                ? previewResult.result.blockingUnresolvedLines.filter(Boolean)
                : [];
            if (blockingUnresolvedLines.length > 0) {
                const blockedMessage = `当前消息不可保存：仍有 ${blockingUnresolvedLines.length} 行待人工处理`;
                setRecognizePreviewBlocked(true);
                setRecognizePreviewError(blockedMessage);
                renderInlineParseError(blockedMessage, { context: 'confirm', clientId: userName });
                showError('确认失败', `${userName}: 仍有 ${blockingUnresolvedLines.length} 行疑似下注内容未识别，已阻止保存`);
                return;
            }
            const originalMessageForStorage = messageTextarea
                ? String(messageTextarea.value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
                : String((resolved && typeof resolved.message === 'string' ? resolved.message : message) || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            window.userManager.applyEditedOriginalData(userName, index, regionKey, originalMessageForStorage);
            renderViewRegionButtons();
            closeModal();
            const regionLabel = window.userManager.getUserRegionDisplayLabel
                ? window.userManager.getUserRegionDisplayLabel(userName, regionKey)
                : (window.userManager.getRegionLabel ? window.userManager.getRegionLabel(regionKey) : regionKey);
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
        let maxIgnoredLineCount = 0;
        const createdAt = new Date().toISOString();
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
                originalMessage: originalMessageForStorage,
                createdAt
            });
            if (!result.success) {
                renderInlineParseError(result.message, { context: 'confirm', clientId: userName });
                showError('处理失败', `${userName}: ${result.message}`);
                return;
            }
            totalAdded += result.totalAdded || 0;
            maxIgnoredLineCount = Math.max(maxIgnoredLineCount, Number(result.ignoredLineCount) || 0);
        }

        selectedUsers.forEach((userName) => {
            const regionKeys = extractRegionKeysForDuplicate(message, userName);
            markMessageRecordedForToday(message, [userName], regionKeys);
        });

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
        const ignoredHint = maxIgnoredLineCount > 0
            ? `，另有 ${maxIgnoredLineCount} 行未识别内容已忽略`
            : '';
        showSuccess(`消息处理成功，已添加到 ${selectedUsers.length} 位客户，总数: ${totalAdded}${ignoredHint}`);
    } catch (error) {
        if (error && error.message) {
            renderInlineParseError(error.message, {
                context: 'confirm',
                clientId: recognizeEditContext ? recognizeEditContext.userName : getPreviewClientId()
            });
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
    const extractOriginalCreatedAt = typeof manager.extractOriginalMessageCreatedAt === 'function'
        ? manager.extractOriginalMessageCreatedAt.bind(manager)
        : (entry) => {
            if (!entry || typeof entry !== 'object') return '';
            return typeof entry.createdAt === 'string' ? String(entry.createdAt || '').trim() : '';
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
                    message: extractOriginalText(message),
                    createdAt: extractOriginalCreatedAt(message),
                    originalEntry: message
                });
            });
        });
    });

    return {
        data: Array.from(mergedMap.values()),
        originalData,
        totalCount,
        userConfigs: scopedUsers.map((userName) => {
            const settlement = typeof manager.getUserSettlementConfig === 'function'
                ? manager.getUserSettlementConfig(userName)
                : { odds: getRegionPnlOdds(), rebateRate: 0 };
            return {
                userName,
                odds: Number(settlement && settlement.odds) || getRegionPnlOdds(),
                rebateRate: Number(settlement && settlement.rebateRate) || 0
            };
        }),
        userTotals: Array.from(userTotals.entries())
            .map(([userName, amount]) => ({ userName, amount: Number(amount) || 0 }))
            .sort((a, b) => b.amount - a.amount)
    };
}

function getHedgeRegionMessagePrefix(regionKey) {
    if (regionKey === 'old_ao') return '老奥';
    if (regionKey === 'hongkong') return '香港';
    return '新奥';
}

function roundUpAmount(value) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return 0;
    return Math.ceil(num - 1e-12);
}

function collectHedgeScopeByRegion(scopeData) {
    const manager = window.userManager;
    if (!manager) {
        return { regionRows: [], totalStake: 0, totalRebate: 0 };
    }

    const scopedUsers = Array.isArray(scopeData && scopeData.users) ? scopeData.users : [];
    const viewRegions = Array.isArray(scopeData && scopeData.viewRegions) && scopeData.viewRegions.length > 0
        ? scopeData.viewRegions
        : ['new_ao'];
    const regionRows = [];
    let totalStake = 0;
    let totalRebate = 0;

    viewRegions.forEach((regionKey) => {
        const numberMap = new Map();
        let regionTotalStake = 0;
        let regionTotalRebate = 0;
        scopedUsers.forEach((userName) => {
            const regionData = typeof manager.getUserRegionData === 'function'
                ? manager.getUserRegionData(userName, regionKey)
                : null;
            if (!regionData || !Array.isArray(regionData.data)) return;

            const regionStake = Number(regionData.totalCount);
            const safeRegionStake = Number.isFinite(regionStake)
                ? regionStake
                : regionData.data.reduce((sum, item) => sum + (Number(item && item.value) || 0), 0);
            regionTotalStake += safeRegionStake;

            const settlement = getUserSettlementConfigSnapshot(userName);
            regionTotalRebate += safeRegionStake * settlement.rebateRatio;

            (regionData.data || []).forEach((item) => {
                const number = String(item && item.number ? item.number : '').padStart(2, '0');
                if (!number) return;
                if (!numberMap.has(number)) {
                    numberMap.set(number, {
                        number,
                        text: String((item && item.text) || ''),
                        stake: 0,
                        payout: 0,
                    });
                }
                const row = numberMap.get(number);
                const stake = Number(item && item.value) || 0;
                row.stake += stake;
                row.payout += stake * settlement.odds;
            });
        });

        const numbers = Array.from(numberMap.values())
            .filter((row) => (Number(row.stake) || 0) > 0)
            .sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
        if (!numbers.length && !(regionTotalStake > 0)) {
            return;
        }
        const regionLabel = manager && typeof manager.getRegionLabel === 'function'
            ? manager.getRegionLabel(regionKey)
            : getHedgeRegionMessagePrefix(regionKey);

        regionRows.push({
            regionKey,
            regionLabel,
            totalStake: regionTotalStake,
            totalRebate: regionTotalRebate,
            numbers,
        });
        totalStake += regionTotalStake;
        totalRebate += regionTotalRebate;
    });

    return { regionRows, totalStake, totalRebate };
}

function buildHedgeSuggestions(regionScope, maxLoss) {
    const lossLimit = Number(maxLoss);
    if (!(lossLimit >= 0)) {
        return [];
    }

    const suggestions = [];
    (regionScope && Array.isArray(regionScope.regionRows) ? regionScope.regionRows : []).forEach((regionRow) => {
        const regionTotalStake = Number(regionRow && regionRow.totalStake) || 0;
        const regionRebate = Number(regionRow && regionRow.totalRebate) || 0;
        (regionRow && Array.isArray(regionRow.numbers) ? regionRow.numbers : []).forEach((row) => {
            const payout = Number(row && row.payout) || 0;
            const stake = Number(row && row.stake) || 0;
            const currentPnl = regionTotalStake - payout - regionRebate;
            if (currentPnl >= -lossLimit) return;
            const needImprove = (-lossLimit) - currentPnl;
            const unitImprove = payout > 0 && stake > 0 ? (payout / stake) - 1 : 0;
            if (!Number.isFinite(unitImprove) || unitImprove <= 0) return;
            const hedgeAmount = roundUpAmount(needImprove / unitImprove);
            if (!(hedgeAmount > 0)) return;
            suggestions.push({
                regionKey: regionRow.regionKey,
                regionLabel: regionRow.regionLabel,
                number: String(row.number || '').padStart(2, '0'),
                text: String(row.text || ''),
                stake,
                payout,
                rebate: regionRebate,
                odds: payout > 0 && stake > 0 ? payout / stake : 0,
                currentPnl,
                hedgeAmount,
            });
        });
    });

    const regionOrder = { new_ao: 0, old_ao: 1, hongkong: 2 };
    return suggestions.sort((a, b) => {
        if (a.regionKey !== b.regionKey) {
            return (regionOrder[a.regionKey] ?? 99) - (regionOrder[b.regionKey] ?? 99);
        }
        return (Number(a.number) || 0) - (Number(b.number) || 0);
    });
}

function buildHedgeReportMessage(suggestions = []) {
    if (!Array.isArray(suggestions) || suggestions.length === 0) return '';

    const regionMap = new Map();
    suggestions.forEach((row) => {
        const regionKey = String(row && row.regionKey ? row.regionKey : 'new_ao');
        const amount = Number(row && row.hedgeAmount) || 0;
        const amountKey = formatNumericAmount(amount);
        if (!regionMap.has(regionKey)) {
            regionMap.set(regionKey, new Map());
        }
        const amountMap = regionMap.get(regionKey);
        if (!amountMap.has(amountKey)) {
            amountMap.set(amountKey, []);
        }
        amountMap.get(amountKey).push(String(row && row.number ? row.number : '').padStart(2, '0'));
    });

    const regionOrder = ['new_ao', 'old_ao', 'hongkong'];
    const lines = [];
    regionOrder.forEach((regionKey) => {
        if (!regionMap.has(regionKey)) return;
        const amountMap = regionMap.get(regionKey);
        const entries = Array.from(amountMap.entries())
            .map(([amountText, numbers]) => ({
                amountText,
                amountValue: Number(amountText) || 0,
                numbers: Array.from(new Set(numbers))
                    .filter(Boolean)
                    .sort((a, b) => (Number(a) || 0) - (Number(b) || 0)),
            }))
            .sort((a, b) => b.amountValue - a.amountValue);

        entries.forEach((entry) => {
            if (!entry.numbers.length) return;
            lines.push(`${getHedgeRegionMessagePrefix(regionKey)}${entry.numbers.join('-')}各${entry.amountText}`);
        });
    });

    return lines.join('\n');
}

function renderHedgeReportRows(suggestions = []) {
    const rowsWrap = document.getElementById('hedgeReportRows');
    if (!rowsWrap) return;
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
        rowsWrap.innerHTML = '<div class="virtual-empty">当前范围在该阈值下无需抛单。</div>';
        return;
    }

    const bodyRows = suggestions.map((row) => `
        <tr>
            <td>${escapeHtml(row.regionLabel || '-')}</td>
            <td>${escapeHtml(row.number || '-')}</td>
            <td>${escapeHtml(formatNumericAmount(row.stake))}</td>
            <td>${escapeHtml(formatNumericAmount(row.payout))}</td>
            <td>${escapeHtml(formatNumericAmount(row.rebate))}</td>
            <td class="is-negative">${escapeHtml(formatSignedAmount(row.currentPnl))}</td>
            <td class="is-hedge">${escapeHtml(formatNumericAmount(row.hedgeAmount))}</td>
        </tr>
    `).join('');

    rowsWrap.innerHTML = `
        <table class="hedge-report-table">
            <thead>
                <tr>
                    <th>盘口</th>
                    <th>号码</th>
                    <th>当前总注</th>
                    <th>当前派彩</th>
                    <th>当前返水</th>
                    <th>当前盈亏</th>
                    <th>建议抛量</th>
                </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
        </table>
    `;
}

function openHedgeReportModal() {
    const modal = document.getElementById('hedgeReportModal');
    if (!modal) return;

    const oddsEl = document.getElementById('hedgeReportOdds');
    if (oddsEl) {
        oddsEl.textContent = '按客户赔率 / 返水';
    }

    const scopeTextEl = document.getElementById('hedgeReportScope');
    const scopeResult = collectCurrentLotteryScopeData();
    if (scopeTextEl) {
        if (scopeResult.ok) {
            const scope = scopeResult.scopeData;
            const usersLabel = scope.inSummaryMode
                ? '所有客户汇总'
                : (Array.isArray(scope.users) ? scope.users.join('、') : '-');
            const regionsLabel = Array.isArray(scope.viewRegionLabels) ? scope.viewRegionLabels.join('、') : '-';
            scopeTextEl.textContent = `范围：${usersLabel}｜盘口：${regionsLabel}`;
        } else {
            scopeTextEl.textContent = `范围：${scopeResult.reason || '-'}`;
        }
    }

    const lossInput = document.getElementById('hedgeMaxLossInput');
    if (lossInput) {
        try {
            const saved = String(localStorage.getItem(HEDGE_MAX_LOSS_KEY) || '');
            if (saved && !Number.isNaN(Number(saved))) {
                lossInput.value = saved;
            }
        } catch (error) {
            // ignore
        }
    }

    const summary = document.getElementById('hedgeReportSummary');
    if (summary) {
        summary.textContent = '请输入“最多可亏损”后点击“计算并生成”。';
    }
    renderHedgeReportRows([]);
    const message = document.getElementById('hedgeReportMessage');
    if (message) {
        message.value = '';
    }

    modal.style.display = 'block';
}

function closeHedgeReportModal() {
    const modal = document.getElementById('hedgeReportModal');
    if (!modal) return;
    modal.style.display = 'none';
}

function calculateHedgeReport() {
    const summary = document.getElementById('hedgeReportSummary');
    const messageEl = document.getElementById('hedgeReportMessage');
    const lossInput = document.getElementById('hedgeMaxLossInput');
    const rawLoss = lossInput ? String(lossInput.value || '').trim() : '';
    const maxLoss = Number(rawLoss);

    if (!Number.isFinite(maxLoss) || maxLoss < 0) {
        if (summary) summary.textContent = '最多可亏损请输入大于等于 0 的数字。';
        renderHedgeReportRows([]);
        if (messageEl) messageEl.value = '';
        return;
    }

    try {
        localStorage.setItem(HEDGE_MAX_LOSS_KEY, String(maxLoss));
    } catch (error) {
        // ignore
    }

    const scopeResult = collectCurrentLotteryScopeData();
    if (!scopeResult.ok) {
        if (summary) summary.textContent = scopeResult.reason || '无法读取当前范围数据。';
        renderHedgeReportRows([]);
        if (messageEl) messageEl.value = '';
        return;
    }

    const scope = scopeResult.scopeData;
    const regionScope = collectHedgeScopeByRegion(scope);
    if (!(regionScope.totalStake > 0)) {
        if (summary) summary.textContent = '当前范围没有总注数据，无需上报。';
        renderHedgeReportRows([]);
        if (messageEl) messageEl.value = '';
        return;
    }

    const suggestions = buildHedgeSuggestions(regionScope, maxLoss);
    const message = buildHedgeReportMessage(suggestions);
    const totalHedgeAmount = suggestions.reduce((sum, row) => sum + (Number(row.hedgeAmount) || 0), 0);
    const minPnl = suggestions.reduce((min, row) => {
        const value = Number(row.currentPnl);
        if (!Number.isFinite(value)) return min;
        return value < min ? value : min;
    }, Number.POSITIVE_INFINITY);

    if (summary) {
        if (!suggestions.length) {
            summary.textContent = `阈值 -${formatNumericAmount(maxLoss)} 下无需抛单。`;
        } else {
            const worstText = Number.isFinite(minPnl) ? formatSignedAmount(minPnl) : '-';
            summary.textContent = `命中 ${suggestions.length} 个风险号码，建议总抛量 ${formatNumericAmount(totalHedgeAmount)}。当前最差盈亏 ${worstText}，目标不低于 -${formatNumericAmount(maxLoss)}。`;
        }
    }
    renderHedgeReportRows(suggestions);
    if (messageEl) {
        messageEl.value = message;
    }
}

function copyHedgeReportMessage() {
    const messageEl = document.getElementById('hedgeReportMessage');
    const text = messageEl ? String(messageEl.value || '').trim() : '';
    if (!text) {
        showError('复制失败', '请先计算并生成上报消息');
        return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showSuccess('上报消息已复制');
        }).catch(() => {
            showError('复制失败', '请重试');
        });
        return;
    }

    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    document.body.removeChild(area);
    showSuccess('上报消息已复制');
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

function getExportOriginalStoredTotal(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const candidates = ['totalAmount', 'orderTotal', 'total', 'sum'];
    for (const key of candidates) {
        const value = Number(entry[key]);
        if (Number.isFinite(value) && value >= 0) {
            return value;
        }
    }
    return null;
}

function getExportRegionLabel(regionKey = '') {
    if (window.userManager && typeof window.userManager.getRegionLabel === 'function') {
        return window.userManager.getRegionLabel(regionKey);
    }
    return getHedgeRegionMessagePrefix(regionKey);
}

function collectExportWinningConfigs(viewRegions = []) {
    const fallback = ['new_ao', 'old_ao', 'hongkong'];
    const regionKeys = Array.from(new Set(
        (Array.isArray(viewRegions) && viewRegions.length > 0 ? viewRegions : fallback)
            .map(key => String(key || '').trim())
            .filter(Boolean)
    ));

    const result = {};
    regionKeys.forEach((regionKey) => {
        const raw = normalizeRegionWinningInput(regionWinningNumbers[regionKey] || '');
        const parsed = parseRegionWinningNumber(raw);
        result[regionKey] = {
            regionKey,
            regionLabel: getExportRegionLabel(regionKey),
            raw,
            number: parsed.number,
            numberText: parsed.number === null ? '' : String(parsed.number).padStart(2, '0'),
            error: parsed.error || ''
        };
    });
    return result;
}

function computeOriginalRowExportPnl(row, winningConfigs = {}) {
    const manager = window.userManager;
    const processor = window.messageProcessor;
    const regionKey = String(row && row.regionKey ? row.regionKey : 'new_ao');
    const userName = String(row && row.userName ? row.userName : '');
    const settlement = getUserSettlementConfigSnapshot(userName);
    const extractMessage = manager && typeof manager.extractOriginalMessageText === 'function'
        ? manager.extractOriginalMessageText.bind(manager)
        : (entry) => {
            if (typeof entry === 'string') return entry;
            if (entry && typeof entry === 'object' && typeof entry.message === 'string') return entry.message;
            if (entry == null) return '';
            return String(entry);
        };
    const rawMessage = extractMessage(row && Object.prototype.hasOwnProperty.call(row, 'message')
        ? row.message
        : (row && row.originalEntry));

    const storedTotalFromEntry = getExportOriginalStoredTotal(row && row.originalEntry);
    const storedTotalFromRow = getExportOriginalStoredTotal(row);
    let orderTotal = storedTotalFromEntry != null ? storedTotalFromEntry : storedTotalFromRow;
    const winning = winningConfigs[regionKey] || {
        numberText: '',
        error: ''
    };
    const hasStoredTotal = Number.isFinite(orderTotal) && orderTotal >= 0;
    const canUseLegacyTotalCalc = manager && typeof manager.calculateOriginalOrderTotal === 'function';
    const needParseForPnl = !!winning.numberText;
    const needParseForTotalFallback = !hasStoredTotal && !canUseLegacyTotalCalc;
    const shouldParseMessage = needParseForPnl || needParseForTotalFallback;

    let parsedRegionTotal = 0;
    let hitStake = 0;
    let payout = 0;
    let parseError = '';

    if (shouldParseMessage && (!processor || typeof processor.parseMessage !== 'function')) {
        parseError = '解析器不可用';
    } else if (shouldParseMessage && String(rawMessage || '').trim()) {
        try {
            const parsed = processor.parseMessage(rawMessage, { clientId: userName, allowPartial: true });
            const targetNumber = winning.numberText || '';

            (parsed && Array.isArray(parsed.entries) ? parsed.entries : []).forEach((entry) => {
                const entryRegion = String(entry && entry.regionKey ? entry.regionKey : regionKey);
                if (entryRegion !== regionKey) return;
                const amount = Number(entry && entry.amount);
                const sourceNumbers = Array.isArray(entry && entry.numbers) ? entry.numbers : [];
                const numbers = sourceNumbers
                    .map(num => parseInt(num, 10))
                    .filter(num => Number.isInteger(num) && num >= 1 && num <= 49);
                if (!Number.isFinite(amount) || amount <= 0 || numbers.length <= 0) return;

                parsedRegionTotal += amount * numbers.length;

                if (!targetNumber) return;
                const hit = numbers.some(num => String(num).padStart(2, '0') === targetNumber);
                if (!hit) return;
                hitStake += amount;
                payout += amount * settlement.odds;
            });
        } catch (error) {
            parseError = error && error.message ? String(error.message) : '解析失败';
        }
    }

    if (!(Number.isFinite(orderTotal) && orderTotal >= 0)) {
        if (parsedRegionTotal > 0) {
            orderTotal = parsedRegionTotal;
        } else if (manager && typeof manager.calculateOriginalOrderTotal === 'function') {
            const calculated = Number(manager.calculateOriginalOrderTotal(rawMessage, userName, regionKey));
            if (Number.isFinite(calculated) && calculated >= 0) {
                orderTotal = calculated;
            }
        }
    }
    if (!(Number.isFinite(orderTotal) && orderTotal >= 0)) {
        orderTotal = null;
    }

    let winLoss = '-';
    let payoutValue = null;
    let rebateValue = Number.isFinite(orderTotal) ? Number(orderTotal) * settlement.rebateRatio : null;
    let pnlValue = null;
    let computable = false;

    if (winning.numberText) {
        if (parseError) {
            winLoss = '无法计算';
        } else {
            const totalStake = Number.isFinite(orderTotal) ? Number(orderTotal) : parsedRegionTotal;
            payoutValue = payout;
            rebateValue = Number.isFinite(totalStake) ? totalStake * settlement.rebateRatio : null;
            pnlValue = totalStake - payout - (Number(rebateValue) || 0);
            winLoss = hitStake > 0 ? '赢' : '输';
            computable = Number.isFinite(pnlValue);
        }
    } else if (winning.error) {
        winLoss = '中奖号无效';
    }

    return {
        orderTotal,
        hitStake,
        odds: settlement.odds,
        rebateRate: settlement.rebateRate,
        rebate: rebateValue,
        payout: payoutValue,
        pnl: pnlValue,
        winLoss,
        winningNumber: winning.numberText || '',
        pnlComputable: computable
    };
}

function buildLotteryExportDocument(scopeData, format = 'excel') {
    const data = Array.isArray(scopeData.data) ? scopeData.data : [];
    const originalData = Array.isArray(scopeData.originalData) ? scopeData.originalData : [];
    const users = Array.isArray(scopeData.users) ? scopeData.users : [];
    const userTotals = Array.isArray(scopeData.userTotals) ? scopeData.userTotals : [];
    const userConfigs = Array.isArray(scopeData.userConfigs) ? scopeData.userConfigs : [];
    const viewRegions = Array.isArray(scopeData.viewRegions) ? scopeData.viewRegions : [];
    const regionLabels = Array.isArray(scopeData.viewRegionLabels) ? scopeData.viewRegionLabels : viewRegions;
    const userConfigMap = new Map(userConfigs.map((item) => [item.userName, item]));
    const winningConfigs = collectExportWinningConfigs(viewRegions);
    const exportOriginalRows = originalData.map((item, index) => {
        const metrics = computeOriginalRowExportPnl(item, winningConfigs);
        return {
            ...item,
            serialNo: index + 1,
            regionLabel: item && item.regionLabel ? item.regionLabel : getExportRegionLabel(item && item.regionKey ? item.regionKey : ''),
            ...metrics
        };
    });

    const groupedRows = buildGroupedByValueRows(data);
    const sortedDetails = data
        .filter((item) => (Number(item && item.value) || 0) > 0)
        .sort((a, b) => (Number(b && b.value) || 0) - (Number(a && a.value) || 0));

    const groupedRowsHtml = groupedRows.length > 0
        ? groupedRows.map((row) => `
            <tr>
                <td>${escapeHtml(row.numbers.join('.'))}</td>
                <td style="text-align:right">${escapeHtml(formatNumericAmount(row.value))}</td>
                <td style="text-align:right">${escapeHtml(row.numbers.length)}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="3">暂无数据</td></tr>';

    const detailRowsHtml = sortedDetails.length > 0
        ? sortedDetails.map((item) => `
            <tr>
                <td>${escapeHtml(item.number)}</td>
                <td>${escapeHtml(item.text || '-')}</td>
                <td style="text-align:right">${escapeHtml(formatNumericAmount(item.value))}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="3">暂无数据</td></tr>';

    const userRowsHtml = userTotals.length > 0
        ? userTotals.map((item) => `
            <tr>
                <td>${escapeHtml(item.userName)}</td>
                <td style="text-align:right">${escapeHtml(formatNumericAmount(item.amount))}</td>
                <td style="text-align:right">${escapeHtml(formatNumericAmount((userConfigMap.get(item.userName) || {}).odds))}</td>
                <td style="text-align:right">${escapeHtml(formatNumericAmount((userConfigMap.get(item.userName) || {}).rebateRate))}%</td>
            </tr>
        `).join('')
        : '<tr><td colspan="4">暂无数据</td></tr>';

    const winningSummaryText = (viewRegions.length > 0 ? viewRegions : ['new_ao', 'old_ao', 'hongkong'])
        .map((regionKey) => {
            const config = winningConfigs[regionKey];
            if (!config) return '';
            if (config.numberText) return `${config.regionLabel}${config.numberText}`;
            if (config.error) return `${config.regionLabel}无效`;
            return `${config.regionLabel}未填`;
        })
        .filter(Boolean)
        .join('，') || '-';

    const rowsWithWinning = exportOriginalRows.filter((item) => {
        const config = winningConfigs[item.regionKey];
        return !!(config && config.numberText);
    });
    const computablePnlRows = rowsWithWinning.filter(item => Number.isFinite(item.pnl));
    const unresolvedPnlRows = rowsWithWinning.length - computablePnlRows.length;
    const totalOrderForPnl = computablePnlRows.reduce((sum, item) => sum + (Number(item.orderTotal) || 0), 0);
    const totalRebateForPnl = computablePnlRows.reduce((sum, item) => sum + (Number(item.rebate) || 0), 0);
    const totalPayoutForPnl = computablePnlRows.reduce((sum, item) => sum + (Number(item.payout) || 0), 0);
    const totalPnl = computablePnlRows.reduce((sum, item) => sum + (Number(item.pnl) || 0), 0);
    const totalRebateAll = exportOriginalRows.reduce((sum, item) => sum + (Number(item.rebate) || 0), 0);
    const hasWinningInput = Object.values(winningConfigs).some(config => !!(config && config.numberText));
    const hasWinningRows = rowsWithWinning.length > 0;
    const totalPnlMetaText = hasWinningInput
        ? (hasWinningRows
            ? (computablePnlRows.length > 0 ? formatSignedAmount(totalPnl) : '无法计算')
            : '当前范围无对应盘口数据')
        : '未填写中奖号';
    const totalPnlMetaClass = !hasWinningInput || !hasWinningRows || computablePnlRows.length <= 0
        ? 'muted'
        : (Math.abs(totalPnl) < 1e-9 ? 'pnl-even' : (totalPnl > 0 ? 'pnl-profit' : 'pnl-loss'));
    const pnlCoverageMetaText = hasWinningInput
        ? (hasWinningRows
            ? `${computablePnlRows.length}/${rowsWithWinning.length}${unresolvedPnlRows > 0 ? `（${unresolvedPnlRows}条未算）` : ''}`
            : '当前范围无对应盘口数据')
        : '-';

    const originalRowsHtml = exportOriginalRows.length > 0
        ? exportOriginalRows.map((item) => {
            const payout = Number(item.payout);
            const rebate = Number(item.rebate);
            const pnl = Number(item.pnl);
            const totalText = Number.isFinite(item.orderTotal) ? formatNumericAmount(item.orderTotal) : '-';
            const oddsText = Number.isFinite(item.odds) ? formatNumericAmount(item.odds) : '-';
            const rebateText = Number.isFinite(rebate) ? formatNumericAmount(rebate) : '-';
            const payoutText = Number.isFinite(payout) ? formatNumericAmount(payout) : '-';
            const pnlText = Number.isFinite(pnl) ? formatSignedAmount(pnl) : '-';
            const pnlClass = Number.isFinite(pnl)
                ? (Math.abs(pnl) < 1e-9 ? 'pnl-even' : (pnl > 0 ? 'pnl-profit' : 'pnl-loss'))
                : 'muted';
            const winLossClass = item.winLoss === '赢'
                ? 'result-win'
                : (item.winLoss === '输' ? 'result-loss' : 'muted');
            return `
            <tr>
                <td style="text-align:right">${item.serialNo}</td>
                <td>${escapeHtml(item.userName || '-')}</td>
                <td>${escapeHtml(item.regionLabel || item.regionKey || '-')}</td>
                <td style="text-align:right">${escapeHtml(item.winningNumber || '-')}</td>
                <td class="${winLossClass}">${escapeHtml(item.winLoss || '-')}</td>
                <td style="text-align:right">${escapeHtml(totalText)}</td>
                <td style="text-align:right">${escapeHtml(oddsText)}</td>
                <td style="text-align:right">${escapeHtml(rebateText)}</td>
                <td style="text-align:right">${escapeHtml(payoutText)}</td>
                <td style="text-align:right" class="${pnlClass}">${escapeHtml(pnlText)}</td>
                <td>${escapeHtml(item.message || '').replace(/\n/g, '<br>')}</td>
            </tr>
        `;
        }).join('')
        : '<tr><td colspan="11">暂无原始消息</td></tr>';

    const originalSummaryRowHtml = hasWinningRows
        ? `
            <tr class="summary-row">
                <td colspan="5">盈亏合计（${escapeHtml(`${computablePnlRows.length}/${rowsWithWinning.length}`)}）</td>
                <td style="text-align:right">${escapeHtml(computablePnlRows.length > 0 ? formatNumericAmount(totalOrderForPnl) : '-')}</td>
                <td style="text-align:right">-</td>
                <td style="text-align:right">${escapeHtml(computablePnlRows.length > 0 ? formatNumericAmount(totalRebateForPnl) : '-')}</td>
                <td style="text-align:right">${escapeHtml(computablePnlRows.length > 0 ? formatNumericAmount(totalPayoutForPnl) : '-')}</td>
                <td style="text-align:right" class="${totalPnlMetaClass}">${escapeHtml(computablePnlRows.length > 0 ? formatSignedAmount(totalPnl) : '-')}</td>
                <td>${escapeHtml(unresolvedPnlRows > 0 ? `${unresolvedPnlRows}条无法计算` : '全部可计算')}</td>
            </tr>
        `
        : '';

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
    .summary-row td { background: #f8fafc; font-weight: 700; }
    .pnl-profit { color: #047857; font-weight: 700; }
    .pnl-loss { color: #b91c1c; font-weight: 700; }
    .pnl-even { color: #0f766e; font-weight: 700; }
    .muted { color: #64748b; }
    .result-win { color: #15803d; font-weight: 700; }
    .result-loss { color: #b91c1c; font-weight: 700; }
  </style>
</head>
<body>
  <h1>客户统计导出（${escapeHtml(formatLabel)}）</h1>
  <div class="meta">
    导出范围：${escapeHtml(scopeData.scopeLabel || '-')}<br>
    客户：${escapeHtml(users.join('，') || '-')}<br>
    查看盘口：${escapeHtml(regionLabels.join('、') || '-')}<br>
    总数：${escapeHtml(scopeData.totalCount || 0)}<br>
    总返水：${escapeHtml(formatNumericAmount(totalRebateAll))}<br>
    中奖号：${escapeHtml(winningSummaryText)}<br>
    总盈亏：<span class="${totalPnlMetaClass}">${escapeHtml(totalPnlMetaText)}</span><br>
    盈亏计算条数：${escapeHtml(pnlCoverageMetaText)}<br>
    导出时间：${escapeHtml(scopeData.exportedAt || new Date().toLocaleString('zh-CN'))}
  </div>

  <h2>客户总数分布</h2>
  <table>
    <thead>
      <tr><th>客户</th><th>累计值</th><th>赔率</th><th>返水%</th></tr>
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
      <tr><th>序号</th><th>客户</th><th>盘口</th><th>中奖号</th><th>输赢</th><th>本条总注</th><th>结算赔率</th><th>本条返水</th><th>本条派彩</th><th>本条盈亏</th><th>内容</th></tr>
    </thead>
    <tbody>${originalRowsHtml}${originalSummaryRowHtml}</tbody>
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
    const userTotals = Array.isArray(scopeData.userTotals) ? scopeData.userTotals : [];
    const userConfigs = Array.isArray(scopeData.userConfigs) ? scopeData.userConfigs : [];
    const userConfigMap = new Map(userConfigs.map((item) => [item.userName, item]));
    const groupedRows = buildGroupedByValueRows(scopeData.data || []);
    const totalRebate = userTotals.reduce((sum, item) => {
        const config = userConfigMap.get(item.userName) || {};
        const rebateRate = Number(config.rebateRate) || 0;
        return sum + ((Number(item.amount) || 0) * rebateRate / 100);
    }, 0);

    let content = `范围: ${scopeData.scopeLabel || '-'}\n`;
    content += `盘口: ${regionLabel}\n`;
    content += `用户: ${userLabel}\n`;
    content += `总数: ${scopeData.totalCount}\n`;
    content += `总返水: ${formatNumericAmount(totalRebate)}\n`;
    content += `导出时间: ${scopeData.exportedAt || new Date().toLocaleString('zh-CN')}\n`;
    if (userConfigs.length > 0) {
        content += `结算参数:\n`;
        userConfigs.forEach((item) => {
            content += `${item.userName}: 赔率 ${formatNumericAmount(item.odds)} / 返水 ${formatNumericAmount(item.rebateRate)}%\n`;
        });
    }
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
    const hedgeReportModal = document.getElementById('hedgeReportModal');
    const settingsModal = document.getElementById('settingsModal');
    const passwordChangeModal = document.getElementById('passwordChangeModal');
    
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
    if (event.target === hedgeReportModal) {
        closeHedgeReportModal();
    }
    if (event.target === settingsModal) {
        closeSettingsModal();
    }
    if (event.target === passwordChangeModal) {
        closePasswordChangeModal();
    }
}

// 导出全局函数
window.addUser = addUser;
window.handleSummary = handleSummary;
window.handleOriginalDataSearchInput = handleOriginalDataSearchInput;
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
window.setNoiseRuleScope = setNoiseRuleScope;
window.handleNoiseRuleClientChange = handleNoiseRuleClientChange;
window.saveNoiseRulePattern = saveNoiseRulePattern;
window.resetNoiseRulePatternInput = resetNoiseRulePatternInput;
window.applyNoiseRuleExample = applyNoiseRuleExample;
window.renderNoiseRulePreview = renderNoiseRulePreview;
window.setAmountUnitScope = setAmountUnitScope;
window.handleAmountUnitClientChange = handleAmountUnitClientChange;
window.saveAmountUnitToken = saveAmountUnitToken;
window.resetAmountUnitTokenInput = resetAmountUnitTokenInput;
window.applyAmountUnitExample = applyAmountUnitExample;
window.renderAmountUnitPreview = renderAmountUnitPreview;
window.saveAnchorAliasRule = saveAnchorAliasRule;
window.removeAnchorAliasRule = removeAnchorAliasRule;
window.resetAnchorAliasRules = resetAnchorAliasRules;
window.saveAnchorParseModeRule = saveAnchorParseModeRule;
window.resetAnchorParseModeRule = resetAnchorParseModeRule;
window.saveRegionAccountingPolicyRule = saveRegionAccountingPolicyRule;
window.resetRegionAccountingPolicyRule = resetRegionAccountingPolicyRule;
window.saveBlockedPlayKeywordRule = saveBlockedPlayKeywordRule;
window.resetBlockedPlayKeywordRule = resetBlockedPlayKeywordRule;
window.saveDefaultOddsRule = saveDefaultOddsRule;
window.resetDefaultOddsRule = resetDefaultOddsRule;
window.confirmAmbiguityChoice = confirmAmbiguityChoice;
window.toggleAttributeEditMode = toggleAttributeEditMode;
window.confirmAttributeEdit = confirmAttributeEdit;
window.cancelAttributeEdit = cancelAttributeEdit;
window.dismissLegalNotice = dismissLegalNotice;
window.openHedgeReportModal = openHedgeReportModal;
window.closeHedgeReportModal = closeHedgeReportModal;
window.calculateHedgeReport = calculateHedgeReport;
window.copyHedgeReportMessage = copyHedgeReportMessage;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.openPlanModalFromSettings = openPlanModalFromSettings;
window.openLicenseModalFromSettings = openLicenseModalFromSettings;
window.openAboutModalFromSettings = openAboutModalFromSettings;
window.openPasswordChangeModal = openPasswordChangeModal;
window.closePasswordChangeModal = closePasswordChangeModal;
window.submitPasswordChange = submitPasswordChange;
window.openLicenseModal = openLicenseModal;
window.closeLicenseModal = closeLicenseModal;
window.refreshLicenseStatus = refreshLicenseStatus;
window.openPlanModal = openPlanModal;
window.closePlanModal = closePlanModal;
window.switchTrialPlanTier = switchTrialPlanTier;
window.pickOcrImage = pickOcrImage;
window.runOcrFromSelectedImage = runOcrFromSelectedImage;
window.rewriteMessageWithLocalAi = rewriteMessageWithLocalAi;
window.focusRecognizeMessageLine = focusRecognizeMessageLine;
window.applyRecognizeSuggestedLineRewrite = applyRecognizeSuggestedLineRewrite;
window.handleRecognizeQuickAddAnchor = handleRecognizeQuickAddAnchor;
window.handleRecognizeQuickAddAmountUnit = handleRecognizeQuickAddAmountUnit;
window.handleRecognizeBlockedAiRewrite = handleRecognizeBlockedAiRewrite;
window.clearOcrImage = clearOcrImage;
