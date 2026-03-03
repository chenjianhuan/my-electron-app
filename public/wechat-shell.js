(function initWechatShell() {
  const ipc = window.electronAPI;

  const DEFAULT_UI_SETTINGS = {
    chatView: {
      mode: 'chat',
      left: { name: '对方', avatar: '' },
      right: { name: '我', avatar: '' },
    },
    clipboard: {
      enabled: true,
      autoCommit: false,
    },
  };

  const state = {
    sessions: [],
    selectedSessionId: '',
    records: [],
    recordTotal: 0,
    stats: {
      totalMessages: 0,
      totalSenders: 0,
      activeDays: 0,
      averageDailyMessages: 0,
      dailyTrend: [],
      senderTop: [],
      keywordTop: [],
    },
    pendingMessages: [],
    pendingErrors: [],
    pendingSource: '',
    activeTab: 'records',
    importContext: null,
    filters: {
      startAt: '',
      endAt: '',
    },
    editingMessageId: '',
    uiSettings: JSON.parse(JSON.stringify(DEFAULT_UI_SETTINGS)),
    clipboardMonitoring: false,
    clipboardStartedAt: 0,
    lastClipboardCanonical: '',
    clipboardBusy: false,
  };
  let removeClipboardListener = null;

  const dom = {
    statusMessage: document.getElementById('statusMessage'),
    createSessionBtn: document.getElementById('createSessionBtn'),
    openAddMessageBtn: document.getElementById('openAddMessageBtn'),
    openPasteBtn: document.getElementById('openPasteBtn'),
    openImportBtn: document.getElementById('openImportBtn'),
    openChatSettingsBtn: document.getElementById('openChatSettingsBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    openSecurityBtn: document.getElementById('openSecurityBtn'),
    backToAuthBtn: document.getElementById('backToAuthBtn'),

    sessionSearchInput: document.getElementById('sessionSearchInput'),
    sessionList: document.getElementById('sessionList'),
    sessionEmpty: document.getElementById('sessionEmpty'),

    tabRecords: document.getElementById('tabRecords'),
    tabPreview: document.getElementById('tabPreview'),
    tabStats: document.getElementById('tabStats'),
    viewRecords: document.getElementById('viewRecords'),
    viewPreview: document.getElementById('viewPreview'),
    viewStats: document.getElementById('viewStats'),

    filterStartAt: document.getElementById('filterStartAt'),
    filterEndAt: document.getElementById('filterEndAt'),
    quickLast7Btn: document.getElementById('quickLast7Btn'),
    quickLast30Btn: document.getElementById('quickLast30Btn'),
    applyFilterBtn: document.getElementById('applyFilterBtn'),
    clearFilterBtn: document.getElementById('clearFilterBtn'),

    recordCountLabel: document.getElementById('recordCountLabel'),
    recordModeChatBtn: document.getElementById('recordModeChatBtn'),
    recordModeTableBtn: document.getElementById('recordModeTableBtn'),
    clipboardStatusBadge: document.getElementById('clipboardStatusBadge'),
    recordsChatWrap: document.getElementById('recordsChatWrap'),
    chatTimeline: document.getElementById('chatTimeline'),
    recordsTableWrap: document.getElementById('recordsTableWrap'),
    recordsTableBody: document.getElementById('recordsTableBody'),
    recordsEmpty: document.getElementById('recordsEmpty'),

    previewSummary: document.getElementById('previewSummary'),
    previewTableBody: document.getElementById('previewTableBody'),
    previewErrors: document.getElementById('previewErrors'),
    commitPreviewBtn: document.getElementById('commitPreviewBtn'),

    statsTotalMessages: document.getElementById('statsTotalMessages'),
    statsTotalSenders: document.getElementById('statsTotalSenders'),
    statsActiveDays: document.getElementById('statsActiveDays'),
    statsAverageDaily: document.getElementById('statsAverageDaily'),
    trendList: document.getElementById('trendList'),
    senderTopList: document.getElementById('senderTopList'),
    keywordTopList: document.getElementById('keywordTopList'),
    trendChart: document.getElementById('trendChart'),
    senderChart: document.getElementById('senderChart'),

    summarySessionName: document.getElementById('summarySessionName'),
    summarySessionCount: document.getElementById('summarySessionCount'),
    summaryTotalMessages: document.getElementById('summaryTotalMessages'),
    summaryTotalSenders: document.getElementById('summaryTotalSenders'),
    summaryActiveDays: document.getElementById('summaryActiveDays'),
    summaryPendingCount: document.getElementById('summaryPendingCount'),

    sessionModal: document.getElementById('sessionModal'),
    sessionNameInput: document.getElementById('sessionNameInput'),
    saveSessionBtn: document.getElementById('saveSessionBtn'),

    pasteModal: document.getElementById('pasteModal'),
    pasteSessionSelect: document.getElementById('pasteSessionSelect'),
    pasteSourceInput: document.getElementById('pasteSourceInput'),
    pasteTextarea: document.getElementById('pasteTextarea'),
    parsePasteBtn: document.getElementById('parsePasteBtn'),
    confirmPasteBtn: document.getElementById('confirmPasteBtn'),

    addMessageModal: document.getElementById('addMessageModal'),
    addMessageSessionSelect: document.getElementById('addMessageSessionSelect'),
    addMessageTimestamp: document.getElementById('addMessageTimestamp'),
    addMessageSender: document.getElementById('addMessageSender'),
    addMessageSource: document.getElementById('addMessageSource'),
    addMessageContent: document.getElementById('addMessageContent'),
    saveAddMessageBtn: document.getElementById('saveAddMessageBtn'),

    importModal: document.getElementById('importModal'),
    importSessionSelect: document.getElementById('importSessionSelect'),
    importFileInput: document.getElementById('importFileInput'),
    importMappingBox: document.getElementById('importMappingBox'),
    importMapTime: document.getElementById('importMapTime'),
    importMapSender: document.getElementById('importMapSender'),
    importMapContent: document.getElementById('importMapContent'),
    previewImportBtn: document.getElementById('previewImportBtn'),
    confirmImportBtn: document.getElementById('confirmImportBtn'),

    editMessageModal: document.getElementById('editMessageModal'),
    editMessageSender: document.getElementById('editMessageSender'),
    editMessageTimestamp: document.getElementById('editMessageTimestamp'),
    editMessageContent: document.getElementById('editMessageContent'),
    saveEditMessageBtn: document.getElementById('saveEditMessageBtn'),

    exportModal: document.getElementById('exportModal'),
    exportRangeSelect: document.getElementById('exportRangeSelect'),
    exportFileNameInput: document.getElementById('exportFileNameInput'),
    confirmExportBtn: document.getElementById('confirmExportBtn'),
    fieldTimestamp: document.getElementById('fieldTimestamp'),
    fieldSender: document.getElementById('fieldSender'),
    fieldContent: document.getElementById('fieldContent'),
    fieldSessionName: document.getElementById('fieldSessionName'),
    fieldSource: document.getElementById('fieldSource'),
    fieldKeywordTags: document.getElementById('fieldKeywordTags'),

    securityModal: document.getElementById('securityModal'),
    securityAlgorithm: document.getElementById('securityAlgorithm'),
    securityFileSize: document.getElementById('securityFileSize'),
    securitySessionCount: document.getElementById('securitySessionCount'),
    securityMessageCount: document.getElementById('securityMessageCount'),
    securityUpdatedAt: document.getElementById('securityUpdatedAt'),
    clearConfirmInput: document.getElementById('clearConfirmInput'),
    clearAllDataBtn: document.getElementById('clearAllDataBtn'),

    chatSettingsModal: document.getElementById('chatSettingsModal'),
    chatLeftNameInput: document.getElementById('chatLeftNameInput'),
    chatRightNameInput: document.getElementById('chatRightNameInput'),
    chatLeftAvatarInput: document.getElementById('chatLeftAvatarInput'),
    chatRightAvatarInput: document.getElementById('chatRightAvatarInput'),
    chatLeftAvatarPreview: document.getElementById('chatLeftAvatarPreview'),
    chatRightAvatarPreview: document.getElementById('chatRightAvatarPreview'),
    chatLeftAvatarFallback: document.getElementById('chatLeftAvatarFallback'),
    chatRightAvatarFallback: document.getElementById('chatRightAvatarFallback'),
    clearChatLeftAvatarBtn: document.getElementById('clearChatLeftAvatarBtn'),
    clearChatRightAvatarBtn: document.getElementById('clearChatRightAvatarBtn'),
    clipboardEnabledToggle: document.getElementById('clipboardEnabledToggle'),
    clipboardAutoCommitToggle: document.getElementById('clipboardAutoCommitToggle'),
    chatDefaultViewSelect: document.getElementById('chatDefaultViewSelect'),
    saveChatSettingsBtn: document.getElementById('saveChatSettingsBtn'),
  };

  function setStatus(message, type) {
    const text = String(message || '');
    dom.statusMessage.textContent = text;
    dom.statusMessage.classList.remove('status-error', 'status-success');
    if (type === 'error') dom.statusMessage.classList.add('status-error');
    if (type === 'success') dom.statusMessage.classList.add('status-success');
  }

  function callIpc(channel, payload) {
    if (!ipc || typeof ipc.invoke !== 'function') {
      return Promise.resolve({ ok: false, reason: 'IPC 不可用，请重启应用' });
    }
    return ipc.invoke(channel, payload);
  }

  function formatDateTime(isoValue) {
    const date = new Date(isoValue);
    if (!Number.isFinite(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', { hour12: false });
  }

  function formatNumber(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '0';
    return numeric.toLocaleString('zh-CN');
  }

  function formatFileSize(bytesValue) {
    const bytes = Number(bytesValue);
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let idx = 0;
    while (value >= 1024 && idx < units.length - 1) {
      value /= 1024;
      idx += 1;
    }
    const display = idx === 0 ? String(Math.round(value)) : value.toFixed(2);
    return `${display} ${units[idx]}`;
  }

  function normalizeUiSettings(rawSettings) {
    const base = DEFAULT_UI_SETTINGS;
    const raw = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};
    const rawChat = raw.chatView && typeof raw.chatView === 'object' ? raw.chatView : {};
    const rawLeft = rawChat.left && typeof rawChat.left === 'object' ? rawChat.left : {};
    const rawRight = rawChat.right && typeof rawChat.right === 'object' ? rawChat.right : {};
    const rawClipboard = raw.clipboard && typeof raw.clipboard === 'object' ? raw.clipboard : {};
    const mode = String(rawChat.mode || '').toLowerCase() === 'table' ? 'table' : 'chat';
    return {
      chatView: {
        mode,
        left: {
          name: String(rawLeft.name || base.chatView.left.name).trim() || base.chatView.left.name,
          avatar: String(rawLeft.avatar || '').trim(),
        },
        right: {
          name: String(rawRight.name || base.chatView.right.name).trim() || base.chatView.right.name,
          avatar: String(rawRight.avatar || '').trim(),
        },
      },
      clipboard: {
        enabled: rawClipboard.enabled !== false,
        autoCommit: rawClipboard.autoCommit === true,
      },
    };
  }

  function firstDisplayChar(text) {
    const value = String(text || '').trim();
    if (!value) return '?';
    return value.slice(0, 1);
  }

  function normalizeClipboardText(rawText) {
    return String(rawText || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  function toDateInputValue(isoValue) {
    const date = new Date(isoValue);
    if (!Number.isFinite(date.getTime())) return '';
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function fromDateInputValue(localValue) {
    const text = String(localValue || '').trim();
    if (!text) return '';
    const parsed = new Date(text);
    if (!Number.isFinite(parsed.getTime())) return '';
    return parsed.toISOString();
  }

  function activeSession() {
    return state.sessions.find((item) => item.id === state.selectedSessionId) || null;
  }

  function currentFilters() {
    return {
      sessionId: state.selectedSessionId,
      startAt: state.filters.startAt,
      endAt: state.filters.endAt,
    };
  }

  function validateFilterRange() {
    if (!state.filters.startAt || !state.filters.endAt) return true;
    return state.filters.startAt <= state.filters.endAt;
  }

  function syncFilterInputsFromState() {
    dom.filterStartAt.value = state.filters.startAt ? toDateInputValue(state.filters.startAt) : '';
    dom.filterEndAt.value = state.filters.endAt ? toDateInputValue(state.filters.endAt) : '';
  }

  function readFiltersFromInputs() {
    state.filters.startAt = fromDateInputValue(dom.filterStartAt.value);
    state.filters.endAt = fromDateInputValue(dom.filterEndAt.value);
    if (!validateFilterRange()) {
      setStatus('筛选时间范围无效：开始时间不能晚于结束时间。', 'error');
      return false;
    }
    return true;
  }

  function setQuickRange(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - Math.max(1, Number(days) || 7));
    state.filters.startAt = start.toISOString();
    state.filters.endAt = end.toISOString();
    syncFilterInputsFromState();
  }

  function fillSessionSelect(selectEl, selectedId) {
    if (!selectEl) return;
    const prevValue = selectedId || selectEl.value;
    selectEl.innerHTML = '';

    for (const session of state.sessions) {
      const option = document.createElement('option');
      option.value = session.id;
      option.textContent = session.name;
      selectEl.appendChild(option);
    }

    if (!state.sessions.length) {
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = '请先新建会话';
      selectEl.appendChild(empty);
      selectEl.value = '';
      return;
    }

    const matched = state.sessions.find((item) => item.id === prevValue) || activeSession() || state.sessions[0];
    if (matched) selectEl.value = matched.id;
  }

  function refreshSessionSelects() {
    fillSessionSelect(dom.addMessageSessionSelect, state.selectedSessionId);
    fillSessionSelect(dom.pasteSessionSelect, state.selectedSessionId);
    fillSessionSelect(dom.importSessionSelect, state.selectedSessionId);
  }

  function renderSessions() {
    const keyword = String(dom.sessionSearchInput.value || '').trim().toLowerCase();
    const sessions = keyword
      ? state.sessions.filter((session) => session.name.toLowerCase().includes(keyword))
      : state.sessions;

    dom.sessionList.innerHTML = '';
    dom.sessionEmpty.hidden = sessions.length > 0;

    for (const session of sessions) {
      const li = document.createElement('li');
      li.className = 'session-item';
      if (session.id === state.selectedSessionId) li.classList.add('active');

      const titleRow = document.createElement('div');
      titleRow.className = 'session-title';
      const strong = document.createElement('strong');
      strong.textContent = session.name;
      const count = document.createElement('span');
      count.textContent = formatNumber(session.messageCount);
      titleRow.appendChild(strong);
      titleRow.appendChild(count);

      const metaRow = document.createElement('div');
      metaRow.className = 'session-meta';
      metaRow.textContent = session.lastMessageAt ? `最后消息：${formatDateTime(session.lastMessageAt)}` : '暂无消息';

      li.appendChild(titleRow);
      li.appendChild(metaRow);
      li.addEventListener('click', () => {
        if (state.selectedSessionId === session.id) return;
        state.selectedSessionId = session.id;
        renderSessions();
        refreshSessionSelects();
        void loadMessagesAndStats();
      });
      dom.sessionList.appendChild(li);
    }
  }

  function renderRecordTable() {
    dom.recordsTableBody.innerHTML = '';
    dom.recordCountLabel.textContent = `共 ${formatNumber(state.recordTotal)} 条消息（当前筛选）`;

    for (const message of state.records) {
      const tr = document.createElement('tr');

      const tdTime = document.createElement('td');
      tdTime.className = 'mono';
      tdTime.textContent = formatDateTime(message.timestamp);

      const tdSender = document.createElement('td');
      tdSender.textContent = message.sender || '未知';

      const tdContent = document.createElement('td');
      tdContent.textContent = message.content || '';

      const tdSource = document.createElement('td');
      tdSource.className = 'mono';
      tdSource.textContent = message.source || 'manual';

      const tdActions = document.createElement('td');
      const actionWrap = document.createElement('div');
      actionWrap.className = 'row-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'row-action-btn';
      editBtn.textContent = '编辑';
      editBtn.addEventListener('click', () => openEditModal(message));

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'row-action-btn danger';
      deleteBtn.textContent = '删除';
      deleteBtn.addEventListener('click', () => {
        void handleDeleteMessage(message);
      });

      actionWrap.appendChild(editBtn);
      actionWrap.appendChild(deleteBtn);
      tdActions.appendChild(actionWrap);

      tr.appendChild(tdTime);
      tr.appendChild(tdSender);
      tr.appendChild(tdContent);
      tr.appendChild(tdSource);
      tr.appendChild(tdActions);
      dom.recordsTableBody.appendChild(tr);
    }
  }

  function setAvatarPreview(wrapImageEl, fallbackEl, avatarUrl, fallbackText) {
    if (!wrapImageEl || !fallbackEl) return;
    const parent = wrapImageEl.parentElement;
    wrapImageEl.src = avatarUrl || '';
    fallbackEl.textContent = firstDisplayChar(fallbackText || '?');
    if (avatarUrl) {
      if (parent) parent.classList.add('has-image');
    } else if (parent) {
      parent.classList.remove('has-image');
    }
  }

  function updateClipboardStatusBadge() {
    const enabled = state.uiSettings && state.uiSettings.clipboard && state.uiSettings.clipboard.enabled;
    const active = enabled && state.clipboardMonitoring;
    dom.clipboardStatusBadge.textContent = active ? '监听复制：已开启' : '监听复制：已关闭';
    dom.clipboardStatusBadge.classList.toggle('active', !!active);
  }

  function switchRecordMode(mode) {
    const targetMode = mode === 'table' ? 'table' : 'chat';
    const isChat = targetMode === 'chat';
    dom.recordsChatWrap.hidden = !isChat;
    dom.recordsTableWrap.hidden = isChat;
    dom.recordModeChatBtn.classList.toggle('active', isChat);
    dom.recordModeTableBtn.classList.toggle('active', !isChat);
    state.uiSettings.chatView.mode = targetMode;
    dom.recordsEmpty.hidden = state.records.length > 0;
  }

  function resolveChatSideBySender(senderName) {
    const sender = String(senderName || '').trim();
    const rightName = String(state.uiSettings.chatView.right.name || '').trim();
    const leftName = String(state.uiSettings.chatView.left.name || '').trim();
    if (rightName && sender === rightName) return 'right';
    if (leftName && sender === leftName) return 'left';
    return 'left';
  }

  function renderChatTimeline() {
    dom.chatTimeline.innerHTML = '';
    const list = state.records.slice().sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')));
    for (const message of list) {
      const side = resolveChatSideBySender(message.sender);
      const sideConfig = side === 'right' ? state.uiSettings.chatView.right : state.uiSettings.chatView.left;

      const item = document.createElement('article');
      item.className = `chat-item ${side}`;

      const main = document.createElement('div');
      main.className = 'chat-main';

      const avatar = document.createElement('img');
      avatar.className = 'chat-avatar';
      avatar.alt = `${sideConfig.name || '用户'}头像`;
      if (sideConfig.avatar) avatar.src = sideConfig.avatar;
      avatar.hidden = !sideConfig.avatar;

      const avatarFallback = document.createElement('div');
      avatarFallback.className = 'chat-avatar-fallback';
      avatarFallback.textContent = firstDisplayChar(sideConfig.name || message.sender || '?');
      avatarFallback.hidden = !!sideConfig.avatar;

      const bubbleWrap = document.createElement('div');
      bubbleWrap.className = 'chat-bubble-wrap';

      const name = document.createElement('span');
      name.className = 'chat-name';
      name.textContent = message.sender || sideConfig.name || '未知';

      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble';
      bubble.textContent = message.content || '';

      const time = document.createElement('div');
      time.className = 'chat-time';
      time.textContent = formatDateTime(message.timestamp);

      bubbleWrap.appendChild(name);
      bubbleWrap.appendChild(bubble);
      bubbleWrap.appendChild(time);

      main.appendChild(avatar);
      main.appendChild(avatarFallback);
      main.appendChild(bubbleWrap);
      item.appendChild(main);
      dom.chatTimeline.appendChild(item);
    }
  }

  function renderChatSettingsPreview() {
    const leftName = String(dom.chatLeftNameInput.value || '').trim() || '对方';
    const rightName = String(dom.chatRightNameInput.value || '').trim() || '我';
    setAvatarPreview(
      dom.chatLeftAvatarPreview,
      dom.chatLeftAvatarFallback,
      dom.chatLeftAvatarPreview.dataset.avatar || '',
      leftName
    );
    setAvatarPreview(
      dom.chatRightAvatarPreview,
      dom.chatRightAvatarFallback,
      dom.chatRightAvatarPreview.dataset.avatar || '',
      rightName
    );
  }

  function populateChatSettingsModal() {
    const settings = normalizeUiSettings(state.uiSettings);
    state.uiSettings = settings;

    dom.chatLeftNameInput.value = settings.chatView.left.name;
    dom.chatRightNameInput.value = settings.chatView.right.name;
    dom.chatLeftAvatarPreview.dataset.avatar = settings.chatView.left.avatar || '';
    dom.chatRightAvatarPreview.dataset.avatar = settings.chatView.right.avatar || '';
    dom.chatLeftAvatarInput.value = '';
    dom.chatRightAvatarInput.value = '';
    dom.clipboardEnabledToggle.checked = !!settings.clipboard.enabled;
    dom.clipboardAutoCommitToggle.checked = !!settings.clipboard.autoCommit;
    dom.chatDefaultViewSelect.value = settings.chatView.mode === 'table' ? 'table' : 'chat';
    renderChatSettingsPreview();
  }

  function renderStatsList(target, entries, leftKey, rightKey) {
    target.innerHTML = '';
    if (!Array.isArray(entries) || entries.length === 0) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = '暂无数据';
      const strong = document.createElement('strong');
      strong.textContent = '-';
      li.appendChild(span);
      li.appendChild(strong);
      target.appendChild(li);
      return;
    }

    for (const item of entries) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = item[leftKey] || '-';
      const strong = document.createElement('strong');
      strong.textContent = formatNumber(item[rightKey] || 0);
      li.appendChild(span);
      li.appendChild(strong);
      target.appendChild(li);
    }
  }

  function renderBarChart(target, entries, labelKey, valueKey, maxItems) {
    target.innerHTML = '';
    const list = Array.isArray(entries) ? entries.slice(0, maxItems) : [];
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = '暂无图表数据';
      target.appendChild(empty);
      return;
    }

    const maxValue = Math.max(1, ...list.map((item) => Number(item[valueKey]) || 0));
    for (const item of list) {
      const row = document.createElement('div');
      row.className = 'bar-item';

      const label = document.createElement('span');
      label.className = 'bar-label';
      label.textContent = item[labelKey] || '-';

      const track = document.createElement('div');
      track.className = 'bar-track';
      const fill = document.createElement('div');
      fill.className = 'bar-fill';
      const ratio = (Number(item[valueKey]) || 0) / maxValue;
      fill.style.width = `${Math.max(2, Math.round(ratio * 100))}%`;
      track.appendChild(fill);

      const value = document.createElement('strong');
      value.className = 'bar-value';
      value.textContent = formatNumber(item[valueKey] || 0);

      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(value);
      target.appendChild(row);
    }
  }

  function renderStatsView() {
    dom.statsTotalMessages.textContent = formatNumber(state.stats.totalMessages);
    dom.statsTotalSenders.textContent = formatNumber(state.stats.totalSenders);
    dom.statsActiveDays.textContent = formatNumber(state.stats.activeDays);
    dom.statsAverageDaily.textContent = formatNumber(state.stats.averageDailyMessages);

    const trendData = Array.isArray(state.stats.dailyTrend) ? state.stats.dailyTrend.slice(-14) : [];
    renderStatsList(dom.trendList, trendData, 'date', 'count');
    renderStatsList(dom.senderTopList, state.stats.senderTop || [], 'sender', 'count');
    renderStatsList(dom.keywordTopList, state.stats.keywordTop || [], 'keyword', 'count');

    renderBarChart(dom.trendChart, trendData, 'date', 'count', 14);
    renderBarChart(dom.senderChart, state.stats.senderTop || [], 'sender', 'count', 10);
  }

  function renderPendingPreview() {
    dom.previewTableBody.innerHTML = '';
    dom.previewErrors.innerHTML = '';

    const total = state.pendingMessages.length;
    const errors = state.pendingErrors.length;
    dom.previewSummary.textContent = total > 0
      ? `可入库 ${formatNumber(total)} 条，异常 ${formatNumber(errors)} 条`
      : '暂无预览数据';

    for (const message of state.pendingMessages.slice(0, 500)) {
      const tr = document.createElement('tr');
      const tdTime = document.createElement('td');
      tdTime.className = 'mono';
      tdTime.textContent = formatDateTime(message.timestamp);

      const tdSender = document.createElement('td');
      tdSender.textContent = message.sender || '未知';

      const tdContent = document.createElement('td');
      tdContent.textContent = message.content || '';

      const tdSource = document.createElement('td');
      tdSource.className = 'mono';
      tdSource.textContent = message.source || state.pendingSource || 'manual';

      tr.appendChild(tdTime);
      tr.appendChild(tdSender);
      tr.appendChild(tdContent);
      tr.appendChild(tdSource);
      dom.previewTableBody.appendChild(tr);
    }

    for (const errorText of state.pendingErrors.slice(0, 200)) {
      const li = document.createElement('li');
      li.textContent = errorText;
      dom.previewErrors.appendChild(li);
    }

    dom.commitPreviewBtn.disabled = total <= 0 || !state.selectedSessionId;
    dom.summaryPendingCount.textContent = formatNumber(total);
  }

  function renderSummary() {
    const session = activeSession();
    dom.summarySessionName.textContent = session ? session.name : '-';
    dom.summarySessionCount.textContent = formatNumber(session ? session.messageCount : 0);
    dom.summaryTotalMessages.textContent = formatNumber(state.stats.totalMessages);
    dom.summaryTotalSenders.textContent = formatNumber(state.stats.totalSenders);
    dom.summaryActiveDays.textContent = formatNumber(state.stats.activeDays);
    dom.summaryPendingCount.textContent = formatNumber(state.pendingMessages.length);
  }

  function renderSecurityStatus(security) {
    const info = security || {};
    dom.securityAlgorithm.textContent = info.algorithm ? `${info.algorithm} + scrypt` : '未知';
    dom.securityFileSize.textContent = formatFileSize(info.fileSizeBytes);
    dom.securitySessionCount.textContent = formatNumber(info.sessionCount);
    dom.securityMessageCount.textContent = formatNumber(info.messageCount);
    dom.securityUpdatedAt.textContent = info.fileUpdatedAt ? formatDateTime(info.fileUpdatedAt) : '-';
  }

  async function loadSecurityStatus() {
    const result = await callIpc('wechat:get-security-status');
    if (!result || !result.ok) {
      setStatus((result && result.reason) || '加载安全状态失败', 'error');
      renderSecurityStatus(null);
      return;
    }
    renderSecurityStatus(result.security);
  }

  function switchTab(tabName) {
    state.activeTab = tabName;
    const tabButtonMap = {
      records: dom.tabRecords,
      preview: dom.tabPreview,
      stats: dom.tabStats,
    };
    const viewMap = {
      records: dom.viewRecords,
      preview: dom.viewPreview,
      stats: dom.viewStats,
    };

    Object.entries(tabButtonMap).forEach(([name, btn]) => {
      const active = name === tabName;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    Object.entries(viewMap).forEach(([name, view]) => {
      const active = name === tabName;
      view.classList.toggle('active', active);
      view.hidden = !active;
    });
  }

  function openModal(modal) {
    if (!modal) return;
    modal.hidden = false;
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
  }

  function normalizeTimestamp(raw) {
    const text = String(raw || '').trim();
    if (!text) return new Date().toISOString();
    const normalized = text
      .replace(/[./]/g, '-')
      .replace(/年/g, '-')
      .replace(/月/g, '-')
      .replace(/[日号]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const maybeDateTime = /\d{4}-\d{1,2}-\d{1,2}/.test(normalized)
      ? normalized
      : `${new Date().toISOString().slice(0, 10)} ${normalized}`;
    const parsed = new Date(maybeDateTime);
    if (!Number.isFinite(parsed.getTime())) return new Date().toISOString();
    return parsed.toISOString();
  }

  function parseChatLine(lineText, lineNo, sourceTag) {
    const line = String(lineText || '').trim();
    if (!line) {
      return { ok: false, error: `第 ${lineNo} 行为空，已忽略` };
    }

    const fullPattern = /^\s*\[?(\d{4}[\-\/.]\d{1,2}[\-\/.]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)\]?\s+([^:：]{1,40})[:：]\s*(.+)$/;
    const senderPattern = /^\s*([^:：]{1,40})[:：]\s*(.+)$/;

    let timestamp = new Date().toISOString();
    let sender = '未知';
    let content = '';

    const fullMatch = line.match(fullPattern);
    if (fullMatch) {
      timestamp = normalizeTimestamp(fullMatch[1]);
      sender = String(fullMatch[2] || '').trim() || '未知';
      content = String(fullMatch[3] || '').trim();
    } else {
      const senderMatch = line.match(senderPattern);
      if (senderMatch) {
        sender = String(senderMatch[1] || '').trim() || '未知';
        content = String(senderMatch[2] || '').trim();
      } else {
        content = line;
      }
    }

    if (!content) {
      return { ok: false, error: `第 ${lineNo} 行缺少消息内容` };
    }

    return {
      ok: true,
      message: {
        timestamp,
        sender,
        content,
        type: 'text',
        source: sourceTag,
        raw: line,
      },
    };
  }

  function parseTranscriptHeader(lineText) {
    const line = String(lineText || '').trim();
    if (!line) return null;

    const patternSenderFirst = /^([^:：]{1,40})\s+(\d{4}(?:[-/.年])\d{1,2}(?:[-/.月])\d{1,2}(?:[日号]?)\s+\d{1,2}:\d{2}(?::\d{2})?)$/;
    const patternTimeFirst = /^(\d{4}(?:[-/.年])\d{1,2}(?:[-/.月])\d{1,2}(?:[日号]?)\s+\d{1,2}:\d{2}(?::\d{2})?)\s+([^:：]{1,40})$/;

    let matched = line.match(patternSenderFirst);
    if (matched) {
      return {
        sender: String(matched[1] || '').trim(),
        timestamp: normalizeTimestamp(matched[2]),
      };
    }

    matched = line.match(patternTimeFirst);
    if (matched) {
      return {
        sender: String(matched[2] || '').trim(),
        timestamp: normalizeTimestamp(matched[1]),
      };
    }

    return null;
  }

  function parseWechatTranscript(rawText, sourceTag) {
    const lines = String(rawText || '').split(/\r?\n/);
    const messages = [];
    const errors = [];
    let matchedHeaders = 0;
    let index = 0;

    while (index < lines.length) {
      const currentLine = String(lines[index] || '').trim();
      if (!currentLine) {
        index += 1;
        continue;
      }

      const header = parseTranscriptHeader(currentLine);
      if (!header) {
        index += 1;
        continue;
      }

      matchedHeaders += 1;
      const contentLines = [];
      let cursor = index + 1;
      while (cursor < lines.length) {
        const line = String(lines[cursor] || '').trim();
        if (!line) {
          cursor += 1;
          continue;
        }
        if (parseTranscriptHeader(line)) break;
        contentLines.push(line);
        cursor += 1;
      }

      const content = contentLines.join('\n').trim();
      if (!content) {
        errors.push(`第 ${index + 1} 行已识别到时间和发送者，但缺少消息内容`);
        index = cursor;
        continue;
      }

      messages.push({
        timestamp: header.timestamp,
        sender: header.sender || '未知',
        content,
        type: 'text',
        source: sourceTag,
        raw: [currentLine, ...contentLines].join('\n'),
      });
      index = cursor;
    }

    return { messages, errors, matchedHeaders };
  }

  function parseRawTextToMessages(rawText, sourceTag) {
    const transcriptParsed = parseWechatTranscript(rawText, sourceTag);
    if (transcriptParsed.messages.length > 0 && transcriptParsed.matchedHeaders > 0) {
      return {
        messages: transcriptParsed.messages,
        errors: transcriptParsed.errors,
      };
    }

    const lines = String(rawText || '').split(/\r?\n/);
    const messages = [];
    const errors = [];

    lines.forEach((line, index) => {
      const lineNo = index + 1;
      if (!String(line || '').trim()) return;
      const parsed = parseChatLine(line, lineNo, sourceTag);
      if (!parsed.ok) {
        errors.push(parsed.error);
        return;
      }
      messages.push(parsed.message);
    });

    if (messages.length <= 0) errors.push('未解析出可入库消息，请检查输入内容或格式。');
    return { messages, errors };
  }

  function isLikelyClipboardChatText(rawText) {
    const text = normalizeClipboardText(rawText);
    if (!text || text.length < 3 || text.length > 12000) return false;
    if (/^https?:\/\//i.test(text)) return false;
    if (/\n/.test(text)) return true;
    if (/[:：]/.test(text)) return true;
    if (/(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/.test(text)) return true;
    return false;
  }

  function canonicalizeClipboardText(rawText) {
    return normalizeClipboardText(rawText)
      .replace(/[：]/g, ':')
      .replace(/[，]/g, ',')
      .replace(/[。]/g, '.')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function startClipboardMonitor() {
    if (state.clipboardMonitoring) return;
    if (!ipc || typeof ipc.send !== 'function') return;
    state.clipboardMonitoring = true;
    state.clipboardStartedAt = Date.now();
    ipc.send('clipboard-monitor:start');
    updateClipboardStatusBadge();
    void pullClipboardSnapshotOnce();
  }

  function stopClipboardMonitor() {
    if (!state.clipboardMonitoring) {
      updateClipboardStatusBadge();
      return;
    }
    if (ipc && typeof ipc.send === 'function') {
      ipc.send('clipboard-monitor:stop');
    }
    state.clipboardMonitoring = false;
    state.clipboardStartedAt = 0;
    updateClipboardStatusBadge();
  }

  function ensureClipboardMonitorState() {
    if (state.uiSettings.clipboard.enabled) {
      startClipboardMonitor();
    } else {
      stopClipboardMonitor();
    }
  }

  async function pullClipboardSnapshotOnce() {
    if (!state.clipboardMonitoring) return;
    if (!ipc || typeof ipc.invoke !== 'function') return;
    try {
      const text = await ipc.invoke('clipboard:read-text');
      if (!text) return;
      await handleClipboardTextChanged({
        text,
        capturedAt: Date.now(),
        forced: true,
      });
    } catch (error) {
      // ignore clipboard snapshot errors
    }
  }

  async function autoCommitMessagesFromClipboard(messages) {
    const result = await callIpc('wechat:add-messages', {
      sessionId: state.selectedSessionId,
      messages,
    });
    if (!result || !result.ok) {
      setStatus((result && result.reason) || '剪贴板自动入库失败', 'error');
      return false;
    }
    state.sessions = Array.isArray(result.sessions) ? result.sessions : state.sessions;
    renderSessions();
    refreshSessionSelects();
    await loadMessagesAndStats();
    switchTab('records');
    setStatus(`监听复制已入库 ${formatNumber(result.insertedCount)} 条消息。`, 'success');
    return true;
  }

  async function handleClipboardTextChanged(payload) {
    if (!state.clipboardMonitoring || state.clipboardBusy) return;
    const capturedAt = Number(payload && payload.capturedAt) || 0;
    if (state.clipboardStartedAt > 0 && capturedAt > 0 && capturedAt < state.clipboardStartedAt) {
      return;
    }
    const content = String(payload && payload.text ? payload.text : '');
    if (!isLikelyClipboardChatText(content)) return;
    if (!state.selectedSessionId) return;

    const canonical = canonicalizeClipboardText(content);
    if (!canonical) return;
    if (!(payload && payload.forced) && canonical === state.lastClipboardCanonical) return;

    state.clipboardBusy = true;
    try {
      const parsed = parseRawTextToMessages(content, 'clipboard_auto');
      if (!parsed.messages.length) return;

      state.lastClipboardCanonical = canonical;
      if (state.uiSettings.clipboard.autoCommit) {
        await autoCommitMessagesFromClipboard(parsed.messages);
      } else {
        setPendingPreview(parsed.messages, parsed.errors, 'clipboard_auto');
        switchTab('preview');
        setStatus(`已监听到复制内容，识别 ${formatNumber(parsed.messages.length)} 条，请确认入库。`, 'success');
      }
    } finally {
      state.clipboardBusy = false;
    }
  }

  function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    const source = String(text || '');

    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      const next = source[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (!inQuotes && char === ',') {
        row.push(cell);
        cell = '';
        continue;
      }

      if (!inQuotes && (char === '\n' || char === '\r')) {
        if (char === '\r' && next === '\n') i += 1;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
        continue;
      }

      cell += char;
    }

    if (cell.length > 0 || row.length > 0) {
      row.push(cell);
      rows.push(row);
    }

    return rows.filter((item) => item.some((cellText) => String(cellText || '').trim() !== ''));
  }

  function guessField(headers, aliases) {
    const lowerHeaders = headers.map((h) => String(h || '').toLowerCase());
    for (const alias of aliases) {
      const index = lowerHeaders.findIndex((item) => item.includes(alias));
      if (index >= 0) return headers[index];
    }
    return headers[0] || '';
  }

  function setPendingPreview(messages, errors, sourceTag) {
    state.pendingMessages = messages;
    state.pendingErrors = errors;
    state.pendingSource = sourceTag;
    renderPendingPreview();
    renderSummary();
  }

  async function commitPendingMessages() {
    if (!state.selectedSessionId) {
      setStatus('请先选择会话再入库。', 'error');
      return;
    }
    if (!state.pendingMessages.length) {
      setStatus('当前没有可入库的预览消息。', 'error');
      return;
    }

    dom.commitPreviewBtn.disabled = true;
    setStatus('正在写入加密存储...', 'info');

    const result = await callIpc('wechat:add-messages', {
      sessionId: state.selectedSessionId,
      messages: state.pendingMessages,
    });

    dom.commitPreviewBtn.disabled = false;

    if (!result || !result.ok) {
      setStatus((result && result.reason) || '写入失败', 'error');
      return;
    }

    state.sessions = Array.isArray(result.sessions) ? result.sessions : state.sessions;
    state.pendingMessages = [];
    state.pendingErrors = [];
    state.pendingSource = '';

    renderSessions();
    refreshSessionSelects();
    renderPendingPreview();
    renderSummary();

    closeModal(dom.pasteModal);
    closeModal(dom.importModal);
    switchTab('records');
    await loadMessagesAndStats();

    setStatus(`已加密入库 ${formatNumber(result.insertedCount)} 条消息。`, 'success');
  }

  async function loadMessages() {
    if (!state.selectedSessionId) {
      state.records = [];
      state.recordTotal = 0;
      renderRecordTable();
      renderChatTimeline();
      dom.recordsEmpty.hidden = false;
      return;
    }

    const result = await callIpc('wechat:list-messages', {
      ...currentFilters(),
      limit: 500,
      offset: 0,
    });

    if (!result || !result.ok) {
      setStatus((result && result.reason) || '加载消息失败', 'error');
      state.records = [];
      state.recordTotal = 0;
      renderRecordTable();
      renderChatTimeline();
      dom.recordsEmpty.hidden = false;
      return;
    }

    state.records = Array.isArray(result.items) ? result.items : [];
    state.recordTotal = Number.isFinite(result.total) ? result.total : state.records.length;
    renderRecordTable();
    renderChatTimeline();
    dom.recordsEmpty.hidden = state.records.length > 0;
    switchRecordMode(state.uiSettings.chatView.mode);
  }

  async function loadStats() {
    if (!state.selectedSessionId) {
      state.stats = {
        totalMessages: 0,
        totalSenders: 0,
        activeDays: 0,
        averageDailyMessages: 0,
        dailyTrend: [],
        senderTop: [],
        keywordTop: [],
      };
      renderStatsView();
      renderSummary();
      return;
    }

    const result = await callIpc('wechat:get-stats', currentFilters());
    if (!result || !result.ok) {
      setStatus((result && result.reason) || '加载统计失败', 'error');
      return;
    }

    state.stats = result.stats || state.stats;
    renderStatsView();
    renderSummary();
  }

  async function loadMessagesAndStats() {
    await Promise.all([loadMessages(), loadStats()]);
    renderSummary();
  }

  async function bootstrap() {
    const route = await callIpc('module-router:get-current');
    if (!route || route.activeModuleId !== 'wechat') {
      await callIpc('module-router:open', { moduleId: 'auth' });
      return;
    }

    const result = await callIpc('wechat:get-bootstrap');
    if (!result || !result.ok) {
      setStatus((result && result.reason) || '微信模块初始化失败', 'error');
      return;
    }

    state.sessions = Array.isArray(result.sessions) ? result.sessions : [];
    state.selectedSessionId = result.currentSessionId || (state.sessions[0] && state.sessions[0].id) || '';
    state.stats = result.stats || state.stats;
    state.uiSettings = normalizeUiSettings(result.settings);

    syncFilterInputsFromState();
    renderSessions();
    refreshSessionSelects();
    await loadMessages();
    renderStatsView();
    renderPendingPreview();
    renderSummary();
    applyUiSettingsToScreen();

    if (!state.sessions.length) {
      setStatus('暂无会话，请先新建会话后再录入。', 'info');
    } else {
      setStatus('微信模块已就绪。', 'success');
    }
  }

  function listAllModals() {
    return [
      dom.sessionModal,
      dom.addMessageModal,
      dom.pasteModal,
      dom.importModal,
      dom.editMessageModal,
      dom.exportModal,
      dom.securityModal,
      dom.chatSettingsModal,
    ];
  }

  function closeAllModals() {
    listAllModals().forEach((modal) => closeModal(modal));
  }

  async function handleCreateSession() {
    const name = String(dom.sessionNameInput.value || '').trim();
    if (!name) {
      setStatus('请输入会话名称。', 'error');
      dom.sessionNameInput.focus();
      return;
    }

    dom.saveSessionBtn.disabled = true;
    const result = await callIpc('wechat:create-session', { name });
    dom.saveSessionBtn.disabled = false;

    if (!result || !result.ok) {
      setStatus((result && result.reason) || '会话创建失败', 'error');
      return;
    }

    state.sessions = Array.isArray(result.sessions) ? result.sessions : state.sessions;
    state.selectedSessionId = result.session ? result.session.id : state.selectedSessionId;
    dom.sessionNameInput.value = '';

    renderSessions();
    refreshSessionSelects();
    renderSummary();
    await loadMessagesAndStats();
    closeModal(dom.sessionModal);

    setStatus(`会话“${result.session.name}”已创建。`, 'success');
  }

  function openAddMessageModal() {
    if (!state.sessions.length) {
      setStatus('请先新建会话。', 'error');
      return;
    }
    fillSessionSelect(dom.addMessageSessionSelect, state.selectedSessionId);
    dom.addMessageTimestamp.value = toDateInputValue(new Date().toISOString());
    dom.addMessageSender.value = state.uiSettings.chatView.right.name || '';
    dom.addMessageSource.value = 'manual_add';
    dom.addMessageContent.value = '';
    openModal(dom.addMessageModal);
    dom.addMessageContent.focus();
  }

  async function handleSaveAddMessage() {
    const sessionId = String(dom.addMessageSessionSelect.value || '').trim();
    const content = String(dom.addMessageContent.value || '').trim();
    const sender = String(dom.addMessageSender.value || '').trim() || '未知';
    const source = String(dom.addMessageSource.value || '').trim() || 'manual_add';
    const timestamp = fromDateInputValue(dom.addMessageTimestamp.value) || new Date().toISOString();

    if (!sessionId) {
      setStatus('请选择目标会话。', 'error');
      return;
    }
    if (!content) {
      setStatus('请输入消息内容。', 'error');
      dom.addMessageContent.focus();
      return;
    }

    dom.saveAddMessageBtn.disabled = true;
    const result = await callIpc('wechat:add-messages', {
      sessionId,
      messages: [{
        timestamp,
        sender,
        content,
        type: 'text',
        source,
        raw: content,
      }],
    });
    dom.saveAddMessageBtn.disabled = false;

    if (!result || !result.ok) {
      setStatus((result && result.reason) || '新增消息失败', 'error');
      return;
    }

    state.selectedSessionId = sessionId;
    state.sessions = Array.isArray(result.sessions) ? result.sessions : state.sessions;
    closeModal(dom.addMessageModal);
    renderSessions();
    refreshSessionSelects();
    await loadMessagesAndStats();
    switchTab('records');
    setStatus('消息已保存并加密入库。', 'success');
  }

  async function handleParsePaste() {
    state.selectedSessionId = dom.pasteSessionSelect.value || state.selectedSessionId;
    const source = String(dom.pasteSourceInput.value || '').trim() || 'paste';
    const parsed = parseRawTextToMessages(dom.pasteTextarea.value, source);
    setPendingPreview(parsed.messages, parsed.errors, source);
    renderSessions();
    refreshSessionSelects();
    switchTab('preview');

    if (parsed.messages.length > 0) {
      setStatus(`已解析 ${formatNumber(parsed.messages.length)} 条消息，请核对后入库。`, 'info');
    } else {
      setStatus('没有解析出可入库内容，请检查文本格式。', 'error');
    }
  }

  async function handleConfirmPaste() {
    if (!state.pendingMessages.length) {
      await handleParsePaste();
      if (!state.pendingMessages.length) return;
    }

    state.selectedSessionId = dom.pasteSessionSelect.value || state.selectedSessionId;
    renderSessions();
    refreshSessionSelects();
    await commitPendingMessages();
  }

  function normalizeJsonRows(parsed) {
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      const directList = Object.values(parsed).find((value) => Array.isArray(value));
      if (Array.isArray(directList)) return directList;
    }
    return [];
  }

  function buildSelectOptions(selectEl, fields, fallbackText) {
    selectEl.innerHTML = '';
    if (!fields.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = fallbackText;
      selectEl.appendChild(option);
      return;
    }

    for (const field of fields) {
      const option = document.createElement('option');
      option.value = field;
      option.textContent = field;
      selectEl.appendChild(option);
    }
  }

  async function loadImportFile(file) {
    if (!file) {
      state.importContext = null;
      dom.importMappingBox.hidden = true;
      return;
    }

    const maxBytes = 20 * 1024 * 1024;
    if (Number(file.size) > maxBytes) {
      throw new Error('文件超过 20MB，请拆分后分批导入。');
    }

    const fileName = String(file.name || '').toLowerCase();
    const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.') + 1) : '';
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file, 'utf-8');
    });

    if (ext === 'txt') {
      state.importContext = { kind: 'txt', fileName, rawText: text };
      dom.importMappingBox.hidden = true;
      setStatus('TXT 文件已读取，点击“生成预览”。', 'info');
      return;
    }

    if (ext === 'csv') {
      const rows = parseCsvRows(text);
      if (!rows.length) throw new Error('CSV 文件为空');
      const headers = rows[0].map((item) => String(item || '').trim());
      state.importContext = {
        kind: 'csv',
        fileName,
        headers,
        rows: rows.slice(1),
      };

      buildSelectOptions(dom.importMapTime, headers, '未发现字段');
      buildSelectOptions(dom.importMapSender, headers, '未发现字段');
      buildSelectOptions(dom.importMapContent, headers, '未发现字段');

      dom.importMapTime.value = guessField(headers, ['time', 'timestamp', 'date', '时间', '日期']);
      dom.importMapSender.value = guessField(headers, ['sender', 'from', 'name', '发送者', '昵称']);
      dom.importMapContent.value = guessField(headers, ['content', 'message', 'text', '内容', '消息']);
      dom.importMappingBox.hidden = false;
      setStatus('CSV 文件已读取，请检查字段映射后生成预览。', 'info');
      return;
    }

    if (ext === 'json') {
      const parsed = JSON.parse(text);
      const rows = normalizeJsonRows(parsed).filter((item) => item && typeof item === 'object');
      if (!rows.length) throw new Error('JSON 中未找到对象数组');

      const keySet = new Set();
      rows.slice(0, 100).forEach((item) => {
        Object.keys(item).forEach((key) => keySet.add(key));
      });
      const fields = Array.from(keySet);

      state.importContext = { kind: 'json', fileName, rows, fields };

      buildSelectOptions(dom.importMapTime, fields, '未发现字段');
      buildSelectOptions(dom.importMapSender, fields, '未发现字段');
      buildSelectOptions(dom.importMapContent, fields, '未发现字段');

      dom.importMapTime.value = guessField(fields, ['time', 'timestamp', 'date', '时间', '日期']);
      dom.importMapSender.value = guessField(fields, ['sender', 'from', 'name', '发送者', '昵称']);
      dom.importMapContent.value = guessField(fields, ['content', 'message', 'text', '内容', '消息']);
      dom.importMappingBox.hidden = false;
      setStatus('JSON 文件已读取，请检查字段映射后生成预览。', 'info');
      return;
    }

    throw new Error('仅支持 txt/csv/json 文件');
  }

  function buildMessagesFromImportContext() {
    const context = state.importContext;
    if (!context) {
      return { messages: [], errors: ['请先选择导入文件。'] };
    }

    if (context.kind === 'txt') {
      return parseRawTextToMessages(context.rawText, 'file_import_txt');
    }

    const timeField = dom.importMapTime.value;
    const senderField = dom.importMapSender.value;
    const contentField = dom.importMapContent.value;

    if (!contentField) {
      return { messages: [], errors: ['请指定“内容字段”后再预览。'] };
    }

    if (context.kind === 'csv') {
      const headers = context.headers || [];
      const rows = Array.isArray(context.rows) ? context.rows : [];
      const messages = [];
      const errors = [];

      rows.forEach((row, idx) => {
        const rowObj = {};
        headers.forEach((header, index) => {
          rowObj[header] = row[index];
        });

        const content = String(rowObj[contentField] || '').trim();
        if (!content) {
          errors.push(`CSV 第 ${idx + 2} 行内容为空，已忽略。`);
          return;
        }

        messages.push({
          timestamp: normalizeTimestamp(rowObj[timeField]),
          sender: String(rowObj[senderField] || '未知').trim() || '未知',
          content,
          type: 'text',
          source: 'file_import_csv',
          raw: row.join(','),
        });
      });

      return { messages, errors };
    }

    if (context.kind === 'json') {
      const rows = Array.isArray(context.rows) ? context.rows : [];
      const messages = [];
      const errors = [];

      rows.forEach((rowObj, index) => {
        const content = String((rowObj && rowObj[contentField]) || '').trim();
        if (!content) {
          errors.push(`JSON 第 ${index + 1} 行内容为空，已忽略。`);
          return;
        }

        messages.push({
          timestamp: normalizeTimestamp(rowObj && rowObj[timeField]),
          sender: String((rowObj && rowObj[senderField]) || '未知').trim() || '未知',
          content,
          type: 'text',
          source: 'file_import_json',
          raw: JSON.stringify(rowObj),
        });
      });

      return { messages, errors };
    }

    return { messages: [], errors: ['文件类型暂不支持'] };
  }

  async function handlePreviewImport() {
    state.selectedSessionId = dom.importSessionSelect.value || state.selectedSessionId;
    const parsed = buildMessagesFromImportContext();
    setPendingPreview(parsed.messages, parsed.errors, 'file_import');
    renderSessions();
    refreshSessionSelects();
    switchTab('preview');

    if (parsed.messages.length > 0) {
      setStatus(`已生成导入预览 ${formatNumber(parsed.messages.length)} 条。`, 'info');
    } else {
      setStatus('导入预览为空，请检查字段映射或文件内容。', 'error');
    }
  }

  async function handleConfirmImport() {
    if (!state.pendingMessages.length) {
      await handlePreviewImport();
      if (!state.pendingMessages.length) return;
    }
    state.selectedSessionId = dom.importSessionSelect.value || state.selectedSessionId;
    renderSessions();
    refreshSessionSelects();
    await commitPendingMessages();
  }

  function collectExportFields() {
    const checked = [];
    const fieldMap = [
      ['timestamp', dom.fieldTimestamp],
      ['sender', dom.fieldSender],
      ['content', dom.fieldContent],
      ['sessionName', dom.fieldSessionName],
      ['source', dom.fieldSource],
      ['keywordTags', dom.fieldKeywordTags],
    ];

    for (const [field, el] of fieldMap) {
      if (el && el.checked) checked.push(field);
    }
    return checked;
  }

  function buildExportPayload() {
    const range = String(dom.exportRangeSelect.value || 'current_session');
    const fields = collectExportFields();
    if (fields.length <= 0) {
      return { ok: false, reason: '请至少勾选一个导出字段。' };
    }

    const fileName = String(dom.exportFileNameInput.value || '').trim();
    if (range !== 'all_data' && !state.selectedSessionId) {
      return { ok: false, reason: '当前没有可导出的会话。' };
    }

    if (range === 'current_filter') {
      return {
        ok: true,
        payload: {
          sessionId: state.selectedSessionId,
          startAt: state.filters.startAt,
          endAt: state.filters.endAt,
          fields,
          fileName,
        },
      };
    }

    if (range === 'all_data') {
      return {
        ok: true,
        payload: {
          sessionId: '',
          startAt: '',
          endAt: '',
          fields,
          fileName,
        },
      };
    }

    return {
      ok: true,
      payload: {
        sessionId: state.selectedSessionId,
        startAt: '',
        endAt: '',
        fields,
        fileName,
      },
    };
  }

  function openExportModal() {
    dom.exportRangeSelect.value = state.filters.startAt || state.filters.endAt ? 'current_filter' : 'current_session';
    dom.exportFileNameInput.value = '';
    openModal(dom.exportModal);
  }

  async function handleConfirmExport() {
    const built = buildExportPayload();
    if (!built.ok) {
      setStatus(built.reason || '导出参数无效', 'error');
      return;
    }

    dom.confirmExportBtn.disabled = true;
    setStatus('正在生成导出文件...', 'info');

    const result = await callIpc('wechat:export-csv', built.payload);
    dom.confirmExportBtn.disabled = false;

    if (!result || !result.ok) {
      if (result && result.canceled) {
        setStatus('已取消导出。', 'info');
        return;
      }
      setStatus((result && result.reason) || '导出失败', 'error');
      return;
    }

    closeModal(dom.exportModal);
    setStatus(`导出成功：${result.filePath}（${formatNumber(result.rowCount)} 行）`, 'success');
  }

  async function readImageFileAsDataUrl(file) {
    if (!file) return '';
    if (Number(file.size) > 400 * 1024) {
      throw new Error('头像图片请控制在 400KB 以内');
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('头像读取失败'));
      reader.readAsDataURL(file);
    });
  }

  function applyUiSettingsToScreen() {
    state.uiSettings = normalizeUiSettings(state.uiSettings);
    renderChatTimeline();
    switchRecordMode(state.uiSettings.chatView.mode);
    updateClipboardStatusBadge();
    ensureClipboardMonitorState();
  }

  function openChatSettingsModal() {
    populateChatSettingsModal();
    openModal(dom.chatSettingsModal);
  }

  async function handleAvatarFileSelect(side) {
    const isRight = side === 'right';
    const input = isRight ? dom.chatRightAvatarInput : dom.chatLeftAvatarInput;
    const preview = isRight ? dom.chatRightAvatarPreview : dom.chatLeftAvatarPreview;
    const file = input && input.files && input.files[0];
    if (!file) return;
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      preview.dataset.avatar = dataUrl;
      renderChatSettingsPreview();
      setStatus('头像已读取，保存设置后生效。', 'info');
    } catch (error) {
      setStatus(error.message || '头像读取失败', 'error');
    }
  }

  function clearAvatarDraft(side) {
    const isRight = side === 'right';
    const preview = isRight ? dom.chatRightAvatarPreview : dom.chatLeftAvatarPreview;
    const input = isRight ? dom.chatRightAvatarInput : dom.chatLeftAvatarInput;
    preview.dataset.avatar = '';
    if (input) input.value = '';
    renderChatSettingsPreview();
  }

  async function handleSaveChatSettings() {
    const payload = normalizeUiSettings({
      chatView: {
        mode: dom.chatDefaultViewSelect.value,
        left: {
          name: String(dom.chatLeftNameInput.value || '').trim(),
          avatar: dom.chatLeftAvatarPreview.dataset.avatar || '',
        },
        right: {
          name: String(dom.chatRightNameInput.value || '').trim(),
          avatar: dom.chatRightAvatarPreview.dataset.avatar || '',
        },
      },
      clipboard: {
        enabled: !!dom.clipboardEnabledToggle.checked,
        autoCommit: !!dom.clipboardAutoCommitToggle.checked,
      },
    });

    dom.saveChatSettingsBtn.disabled = true;
    const result = await callIpc('wechat:update-ui-settings', payload);
    dom.saveChatSettingsBtn.disabled = false;

    if (!result || !result.ok) {
      setStatus((result && result.reason) || '保存聊天设置失败', 'error');
      return;
    }

    state.uiSettings = normalizeUiSettings(result.settings);
    applyUiSettingsToScreen();
    closeModal(dom.chatSettingsModal);
    setStatus('聊天样式与监听设置已保存。', 'success');
  }

  async function handleBackToAuth() {
    if (state.pendingMessages.length > 0) {
      const ok = window.confirm('当前有未入库预览数据，确认退出到密码页吗？');
      if (!ok) return;
    }

    dom.backToAuthBtn.disabled = true;
    dom.backToAuthBtn.textContent = '正在返回...';
    stopClipboardMonitor();
    await callIpc('module-router:open', { moduleId: 'auth' });
    dom.backToAuthBtn.disabled = false;
    dom.backToAuthBtn.textContent = '退出到密码页';
  }

  async function handleOpenSecurity() {
    await loadSecurityStatus();
    dom.clearConfirmInput.value = '';
    openModal(dom.securityModal);
  }

  async function handleClearAllData() {
    const token = String(dom.clearConfirmInput.value || '').trim().toUpperCase();
    if (token !== 'DELETE') {
      setStatus('请输入 DELETE 后再执行清空。', 'error');
      dom.clearConfirmInput.focus();
      return;
    }

    const confirmed = window.confirm('清空后不可恢复，确定删除微信模块全部数据吗？');
    if (!confirmed) return;

    dom.clearAllDataBtn.disabled = true;
    const result = await callIpc('wechat:clear-all-data', { confirmToken: 'DELETE_WECHAT_DATA' });
    dom.clearAllDataBtn.disabled = false;

    if (!result || !result.ok) {
      setStatus((result && result.reason) || '清空数据失败', 'error');
      return;
    }

    state.sessions = Array.isArray(result.sessions) ? result.sessions : [];
    state.selectedSessionId = state.sessions[0] ? state.sessions[0].id : '';
    state.pendingMessages = [];
    state.pendingErrors = [];
    state.pendingSource = '';
    state.records = [];
    state.recordTotal = 0;
    state.stats = result.stats || {
      totalMessages: 0,
      totalSenders: 0,
      activeDays: 0,
      averageDailyMessages: 0,
      dailyTrend: [],
      senderTop: [],
      keywordTop: [],
    };
    state.uiSettings = normalizeUiSettings(result.settings);

    renderSessions();
    refreshSessionSelects();
    renderRecordTable();
    renderChatTimeline();
    applyUiSettingsToScreen();
    renderPendingPreview();
    renderStatsView();
    renderSummary();
    await loadSecurityStatus();

    closeModal(dom.securityModal);
    setStatus('微信模块数据已清空并重新加密初始化。', 'success');
  }

  function openEditModal(message) {
    if (!message || !message.id) return;
    state.editingMessageId = message.id;
    dom.editMessageSender.value = message.sender || '';
    dom.editMessageContent.value = message.content || '';
    dom.editMessageTimestamp.value = toDateInputValue(message.timestamp);
    openModal(dom.editMessageModal);
    dom.editMessageContent.focus();
  }

  async function handleSaveEditedMessage() {
    if (!state.editingMessageId) {
      setStatus('未选择要编辑的消息。', 'error');
      return;
    }

    const sender = String(dom.editMessageSender.value || '').trim() || '未知';
    const content = String(dom.editMessageContent.value || '').trim();
    const timestamp = fromDateInputValue(dom.editMessageTimestamp.value) || new Date().toISOString();
    if (!content) {
      setStatus('消息内容不能为空。', 'error');
      dom.editMessageContent.focus();
      return;
    }

    dom.saveEditMessageBtn.disabled = true;
    const result = await callIpc('wechat:update-message', {
      messageId: state.editingMessageId,
      sender,
      content,
      timestamp,
      startAt: state.filters.startAt,
      endAt: state.filters.endAt,
    });
    dom.saveEditMessageBtn.disabled = false;

    if (!result || !result.ok) {
      setStatus((result && result.reason) || '消息更新失败', 'error');
      return;
    }

    state.sessions = Array.isArray(result.sessions) ? result.sessions : state.sessions;
    closeModal(dom.editMessageModal);
    await loadMessagesAndStats();
    renderSessions();
    refreshSessionSelects();
    setStatus('消息已更新。', 'success');
  }

  async function handleDeleteMessage(message) {
    if (!message || !message.id) return;
    const ok = window.confirm('删除后不可恢复，确认删除这条消息吗？');
    if (!ok) return;

    const result = await callIpc('wechat:delete-message', {
      messageId: message.id,
      startAt: state.filters.startAt,
      endAt: state.filters.endAt,
    });

    if (!result || !result.ok) {
      setStatus((result && result.reason) || '消息删除失败', 'error');
      return;
    }

    state.sessions = Array.isArray(result.sessions) ? result.sessions : state.sessions;
    await loadMessagesAndStats();
    renderSessions();
    refreshSessionSelects();
    setStatus('消息已删除。', 'success');
  }

  async function applyFiltersAndReload() {
    if (!readFiltersFromInputs()) return;
    await loadMessagesAndStats();
    setStatus('筛选条件已生效。', 'success');
  }

  async function clearFiltersAndReload() {
    state.filters.startAt = '';
    state.filters.endAt = '';
    syncFilterInputsFromState();
    await loadMessagesAndStats();
    setStatus('已清空筛选条件。', 'success');
  }

  function registerEvents() {
    dom.tabRecords.addEventListener('click', () => switchTab('records'));
    dom.tabPreview.addEventListener('click', () => switchTab('preview'));
    dom.tabStats.addEventListener('click', () => switchTab('stats'));
    dom.recordModeChatBtn.addEventListener('click', () => {
      switchRecordMode('chat');
    });
    dom.recordModeTableBtn.addEventListener('click', () => {
      switchRecordMode('table');
    });

    dom.createSessionBtn.addEventListener('click', () => {
      openModal(dom.sessionModal);
      dom.sessionNameInput.focus();
    });
    dom.openAddMessageBtn.addEventListener('click', () => {
      openAddMessageModal();
    });
    dom.saveSessionBtn.addEventListener('click', () => {
      void handleCreateSession();
    });
    dom.saveAddMessageBtn.addEventListener('click', () => {
      void handleSaveAddMessage();
    });

    dom.openPasteBtn.addEventListener('click', () => {
      if (!state.sessions.length) {
        setStatus('请先新建会话。', 'error');
        return;
      }
      fillSessionSelect(dom.pasteSessionSelect, state.selectedSessionId);
      openModal(dom.pasteModal);
      dom.pasteTextarea.focus();
    });

    dom.openImportBtn.addEventListener('click', () => {
      if (!state.sessions.length) {
        setStatus('请先新建会话。', 'error');
        return;
      }
      fillSessionSelect(dom.importSessionSelect, state.selectedSessionId);
      openModal(dom.importModal);
    });

    dom.parsePasteBtn.addEventListener('click', () => {
      void handleParsePaste();
    });
    dom.confirmPasteBtn.addEventListener('click', () => {
      void handleConfirmPaste();
    });
    dom.commitPreviewBtn.addEventListener('click', () => {
      void commitPendingMessages();
    });

    dom.importFileInput.addEventListener('change', (event) => {
      const file = event.target && event.target.files && event.target.files[0];
      loadImportFile(file).catch((error) => {
        state.importContext = null;
        dom.importMappingBox.hidden = true;
        setStatus(error.message || '文件解析失败', 'error');
      });
    });

    [dom.importMapTime, dom.importMapSender, dom.importMapContent].forEach((el) => {
      el.addEventListener('change', () => {
        if (!state.importContext) return;
        setStatus('字段映射已更新，可重新生成预览。', 'info');
      });
    });

    dom.previewImportBtn.addEventListener('click', () => {
      void handlePreviewImport();
    });
    dom.confirmImportBtn.addEventListener('click', () => {
      void handleConfirmImport();
    });

    dom.applyFilterBtn.addEventListener('click', () => {
      void applyFiltersAndReload();
    });
    dom.clearFilterBtn.addEventListener('click', () => {
      void clearFiltersAndReload();
    });
    dom.quickLast7Btn.addEventListener('click', () => {
      setQuickRange(7);
      void applyFiltersAndReload();
    });
    dom.quickLast30Btn.addEventListener('click', () => {
      setQuickRange(30);
      void applyFiltersAndReload();
    });

    dom.exportCsvBtn.addEventListener('click', () => {
      openExportModal();
    });
    dom.confirmExportBtn.addEventListener('click', () => {
      void handleConfirmExport();
    });

    dom.openChatSettingsBtn.addEventListener('click', () => {
      openChatSettingsModal();
    });
    dom.saveChatSettingsBtn.addEventListener('click', () => {
      void handleSaveChatSettings();
    });
    dom.chatLeftNameInput.addEventListener('input', () => {
      renderChatSettingsPreview();
    });
    dom.chatRightNameInput.addEventListener('input', () => {
      renderChatSettingsPreview();
    });
    dom.chatLeftAvatarInput.addEventListener('change', () => {
      void handleAvatarFileSelect('left');
    });
    dom.chatRightAvatarInput.addEventListener('change', () => {
      void handleAvatarFileSelect('right');
    });
    dom.clearChatLeftAvatarBtn.addEventListener('click', () => {
      clearAvatarDraft('left');
    });
    dom.clearChatRightAvatarBtn.addEventListener('click', () => {
      clearAvatarDraft('right');
    });

    dom.openSecurityBtn.addEventListener('click', () => {
      void handleOpenSecurity();
    });
    dom.clearAllDataBtn.addEventListener('click', () => {
      void handleClearAllData();
    });

    dom.backToAuthBtn.addEventListener('click', () => {
      void handleBackToAuth();
    });

    dom.sessionSearchInput.addEventListener('input', () => {
      renderSessions();
    });

    dom.saveEditMessageBtn.addEventListener('click', () => {
      void handleSaveEditedMessage();
    });

    if (!removeClipboardListener && ipc && typeof ipc.on === 'function') {
      removeClipboardListener = ipc.on('clipboard:text-changed', (payload) => {
        Promise.resolve(handleClipboardTextChanged(payload)).catch(() => {
          // ignore clipboard handler errors
        });
      });
    }

    document.querySelectorAll('[data-close-modal]').forEach((button) => {
      button.addEventListener('click', () => {
        const modalId = button.getAttribute('data-close-modal');
        closeModal(document.getElementById(modalId));
      });
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeAllModals();
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        if (!dom.pasteModal.hidden) {
          event.preventDefault();
          void handleConfirmPaste();
        }
        if (!dom.addMessageModal.hidden) {
          event.preventDefault();
          void handleSaveAddMessage();
        }
      }
    });

    window.addEventListener('beforeunload', () => {
      stopClipboardMonitor();
      if (typeof removeClipboardListener === 'function') {
        removeClipboardListener();
        removeClipboardListener = null;
      }
    });
  }

  registerEvents();
  void bootstrap();
})();
