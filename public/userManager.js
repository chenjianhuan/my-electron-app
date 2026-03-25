// 用户管理模块
class UserManager {
    constructor() {
        this.users = {};
        this.selectedUsers = new Set();
        this.lastActiveUser = null;
        this.expandedSettlementUser = '';
        this.isMultiSelectEnabled = false;
        this.scopeMode = 'single';
        this.activeRegion = 'new_ao'; // 录入地区（弹窗单选）
        this.viewRegions = new Set(['new_ao']); // 统计查看地区（主页面多选）
        this.isSummaryMode = false;
        this.editingOriginal = null;
        this.virtualListStates = {};
        this.originalOrderTotalCache = new Map();
        this.originalParseSummaryCache = new Map();
        this.originalRowHitCache = new Map();
        this.originalRowHeightCache = new Map();
        this.originalRowsSnapshotCache = {
            key: '',
            rows: []
        };
        this.originalRowsSnapshotVersion = 0;
        this.originalDataSearchTimer = null;
        this.originalDataSearchKeyword = '';
        this.originalDataSortMode = 'serial_asc';
        this.originalDataCollapsed = this.loadOriginalDataCollapsedPreference();
        this.selectedScopeSnapshotVersion = 0;
        this.selectedScopeSnapshotCache = {
            key: '',
            data: null
        };
        this.userSearchTimer = null;
        this.userListDerivedVersion = 0;
        this.sortedUsersCache = {
            key: '',
            users: []
        };
        this.userListSummaryCache = new Map();
        this.numberViewMode = 'sorted';
        this.numberRankingSortKey = 'pnl';
        this.userSearchKeyword = '';
        this.userListSortMode = 'amount_desc';
        this.numberRankingFitRaf = 0;
        this.numberRankingResizeObserver = null;
        this.numberRankingObservedElement = null;
    }

    getVirtualListKey(container) {
        if (!container) return '';
        return container.id || container.getAttribute('data-virtual-key') || '';
    }

    ensureVirtualListState(container, options = {}) {
        if (!container) return null;
        const key = this.getVirtualListKey(container);
        if (!key) return null;

        let state = this.virtualListStates[key];
        if (!state || state.container !== container) {
            state = {
                key,
                container,
                topSpacer: null,
                bottomSpacer: null,
                emptyNode: null,
                items: [],
                renderItem: null,
                options: {},
                dataVersion: 0,
                appliedVersion: -1,
                lastStartIndex: -1,
                lastEndIndex: -1,
                lastTotalCount: -1,
                estimateOffsets: null,
                totalEstimateHeight: 0,
                rafId: null,
                measureRafId: null,
                lastPaintTs: 0,
                measuredHeights: new Map(),
                bound: false,
                disabled: false,
                scrollHandler: null
            };
            this.virtualListStates[key] = state;
        }
        state.disabled = false;

        state.options = {
            estimateItemHeight: 56,
            overscan: 6,
            minRenderCount: 24,
            maxRenderCount: 120,
            emptyText: '',
            getItemKey: null,
            measureRenderedItemHeights: false,
            itemSpacing: 0,
            onItemHeightMeasured: null,
            ...state.options,
            ...options
        };

        this.mountVirtualListScaffold(state);
        return state;
    }

    mountVirtualListScaffold(state) {
        if (!state || !state.container) return;
        const container = state.container;
        if (!state.topSpacer || !state.bottomSpacer || !container.contains(state.topSpacer) || !container.contains(state.bottomSpacer)) {
            container.innerHTML = '';
            const topSpacer = document.createElement('li');
            topSpacer.className = 'virtual-spacer';
            topSpacer.setAttribute('aria-hidden', 'true');
            const bottomSpacer = document.createElement('li');
            bottomSpacer.className = 'virtual-spacer';
            bottomSpacer.setAttribute('aria-hidden', 'true');
            container.appendChild(topSpacer);
            container.appendChild(bottomSpacer);
            state.topSpacer = topSpacer;
            state.bottomSpacer = bottomSpacer;
        }

        if (!state.bound) {
            state.scrollHandler = () => {
                if (state.disabled) return;
                const now = (typeof performance !== 'undefined' && typeof performance.now === 'function')
                    ? performance.now()
                    : Date.now();
                if ((now - (state.lastPaintTs || 0)) >= 14) {
                    this.paintVirtualList(state);
                    state.lastPaintTs = now;
                    return;
                }
                this.scheduleVirtualListRender(state);
            };
            container.addEventListener('scroll', state.scrollHandler, { passive: true });
            state.bound = true;
        }
    }

    deactivateVirtualList(container) {
        if (!container) return;
        const key = this.getVirtualListKey(container);
        if (!key) return;
        const state = this.virtualListStates[key];
        if (!state) return;

        state.disabled = true;
        state.items = [];
        state.renderItem = null;
        state.lastStartIndex = -1;
        state.lastEndIndex = -1;
        state.lastTotalCount = -1;
        state.appliedVersion = -1;
        state.estimateOffsets = null;
        state.totalEstimateHeight = 0;

        if (state.rafId) {
            cancelAnimationFrame(state.rafId);
            state.rafId = null;
        }
        if (state.measureRafId) {
            cancelAnimationFrame(state.measureRafId);
            state.measureRafId = null;
        }
        if (state.emptyNode) {
            state.emptyNode.remove();
            state.emptyNode = null;
        }
        if (state.topSpacer) {
            state.topSpacer.remove();
            state.topSpacer = null;
        }
        if (state.bottomSpacer) {
            state.bottomSpacer.remove();
            state.bottomSpacer = null;
        }
    }

    clearVirtualListRows(state) {
        if (!state || !state.topSpacer || !state.bottomSpacer) return;
        let node = state.topSpacer.nextSibling;
        while (node && node !== state.bottomSpacer) {
            const next = node.nextSibling;
            node.remove();
            node = next;
        }
    }

    scheduleVirtualListRender(state) {
        if (!state || state.rafId) return;
        state.rafId = requestAnimationFrame(() => {
            state.rafId = null;
            this.paintVirtualList(state);
        });
    }

    getVirtualItemKey(state, item, index) {
        if (!state) return String(index);
        if (state.options && typeof state.options.getItemKey === 'function') {
            const customKey = state.options.getItemKey(item, index);
            if (customKey != null && customKey !== '') {
                return String(customKey);
            }
        }
        return String(index);
    }

    scheduleVirtualListMeasurement(state) {
        if (!state || state.measureRafId || !state.options || state.options.measureRenderedItemHeights !== true) return;
        state.measureRafId = requestAnimationFrame(() => {
            state.measureRafId = null;
            this.measureVirtualListRenderedRows(state);
        });
    }

    measureVirtualListRenderedRows(state) {
        if (!state || !state.container || !state.topSpacer || !state.bottomSpacer) return;
        if (!state.options || state.options.measureRenderedItemHeights !== true) return;
        const items = Array.isArray(state.items) ? state.items : [];
        if (items.length === 0) return;

        const itemSpacing = Math.max(0, Number(state.options.itemSpacing) || 0);
        const onItemHeightMeasured = typeof state.options.onItemHeightMeasured === 'function'
            ? state.options.onItemHeightMeasured
            : null;
        let node = state.topSpacer.nextSibling;
        let hasChanges = false;

        while (node && node !== state.bottomSpacer) {
            const index = Number.parseInt(node.getAttribute('data-virtual-index') || '', 10);
            if (Number.isInteger(index) && index >= 0 && index < items.length) {
                const key = this.getVirtualItemKey(state, items[index], index);
                const measuredHeight = Math.max(20, Math.ceil((node.offsetHeight || 0) + itemSpacing));
                const previousHeight = Number(state.measuredHeights.get(key));
                if (!Number.isFinite(previousHeight) || Math.abs(previousHeight - measuredHeight) >= 1) {
                    state.measuredHeights.set(key, measuredHeight);
                    hasChanges = true;
                    if (onItemHeightMeasured) {
                        onItemHeightMeasured(items[index], index, measuredHeight);
                    }
                }
            }
            node = node.nextSibling;
        }

        if (!hasChanges) return;
        this.buildVirtualEstimateOffsets(state);
        this.scheduleVirtualListRender(state);
    }

    setVirtualListData(container, items, renderItem, options = {}) {
        const state = this.ensureVirtualListState(container, options);
        if (!state) return;
        if (state.measureRafId) {
            cancelAnimationFrame(state.measureRafId);
            state.measureRafId = null;
        }
        state.items = Array.isArray(items) ? items : [];
        state.renderItem = typeof renderItem === 'function' ? renderItem : null;
        this.buildVirtualEstimateOffsets(state);
        state.dataVersion += 1;
        state.lastStartIndex = -1;
        state.lastEndIndex = -1;
        state.lastTotalCount = -1;
        this.scheduleVirtualListRender(state);
    }

    getVirtualEstimatedHeight(state, item, index) {
        if (!state) return 56;
        const itemKey = this.getVirtualItemKey(state, item, index);
        const measuredHeight = Number(state.measuredHeights.get(itemKey));
        if (Number.isFinite(measuredHeight) && measuredHeight > 0) {
            return Math.max(20, Math.min(1600, measuredHeight));
        }
        const estimateByItem = state.options && typeof state.options.getItemEstimate === 'function'
            ? Number(state.options.getItemEstimate(item, index))
            : NaN;
        if (Number.isFinite(estimateByItem) && estimateByItem > 0) {
            return Math.max(20, Math.min(1600, estimateByItem));
        }
        const estimate = Number(state.options && state.options.estimateItemHeight);
        if (Number.isFinite(estimate) && estimate > 0) {
            return Math.max(20, Math.min(1600, estimate));
        }
        return 56;
    }

    buildVirtualEstimateOffsets(state) {
        if (!state) return;
        const items = Array.isArray(state.items) ? state.items : [];
        const total = items.length;
        const offsets = new Array(total + 1);
        offsets[0] = 0;
        let acc = 0;
        for (let i = 0; i < total; i += 1) {
            acc += this.getVirtualEstimatedHeight(state, items[i], i);
            offsets[i + 1] = acc;
        }
        state.estimateOffsets = offsets;
        state.totalEstimateHeight = acc;
    }

    findVirtualItemIndexByOffset(offsets, target) {
        if (!Array.isArray(offsets) || offsets.length <= 1) return 0;
        const total = offsets.length - 1;
        if (target <= 0) return 0;
        const totalHeight = offsets[total] || 0;
        if (target >= totalHeight) return Math.max(0, total - 1);

        let left = 0;
        let right = total - 1;
        while (left <= right) {
            const mid = (left + right) >> 1;
            const start = offsets[mid] || 0;
            const end = offsets[mid + 1] || start;
            if (target < start) {
                right = mid - 1;
            } else if (target >= end) {
                left = mid + 1;
            } else {
                return mid;
            }
        }
        return Math.max(0, Math.min(total - 1, left));
    }

    paintVirtualList(state) {
        if (!state || !state.container || !state.topSpacer || !state.bottomSpacer) return;
        state.lastPaintTs = (typeof performance !== 'undefined' && typeof performance.now === 'function')
            ? performance.now()
            : Date.now();
        const container = state.container;
        const items = Array.isArray(state.items) ? state.items : [];
        const totalCount = items.length;

        if (state.emptyNode) {
            state.emptyNode.remove();
            state.emptyNode = null;
        }

        if (totalCount === 0 || typeof state.renderItem !== 'function') {
            this.clearVirtualListRows(state);
            state.topSpacer.style.height = '0px';
            state.bottomSpacer.style.height = '0px';
            if (state.options.emptyText) {
                const emptyNode = document.createElement('li');
                emptyNode.className = 'virtual-empty';
                emptyNode.textContent = state.options.emptyText;
                state.bottomSpacer.before(emptyNode);
                state.emptyNode = emptyNode;
            }
            state.lastStartIndex = -1;
            state.lastEndIndex = -1;
            state.lastTotalCount = totalCount;
            state.appliedVersion = state.dataVersion;
            return;
        }

        const itemHeight = Math.max(24, state.options.estimateItemHeight || 56);
        const viewportHeight = Math.max(itemHeight * 4, container.clientHeight || 0);
        const scrollTop = Math.max(0, container.scrollTop);
        const overscan = Math.max(0, state.options.overscan || 0);
        const minRenderCount = Math.max(1, Number(state.options.minRenderCount) || 1);
        const maxRenderCount = Math.max(minRenderCount, Number(state.options.maxRenderCount) || 160);
        const offsets = Array.isArray(state.estimateOffsets) && state.estimateOffsets.length === totalCount + 1
            ? state.estimateOffsets
            : null;

        let startIndex = 0;
        let endIndex = 0;
        let topHeight = 0;
        let bottomHeight = 0;
        if (offsets) {
            const viewportBottom = scrollTop + viewportHeight;
            const baseIndex = this.findVirtualItemIndexByOffset(offsets, scrollTop);
            startIndex = Math.max(0, baseIndex - overscan);
            const viewportEnd = this.findVirtualItemIndexByOffset(offsets, viewportBottom);
            endIndex = Math.min(totalCount, viewportEnd + 1 + overscan);
            if ((endIndex - startIndex) < minRenderCount) {
                endIndex = Math.min(totalCount, startIndex + minRenderCount);
            }
            if ((endIndex - startIndex) > maxRenderCount) {
                endIndex = Math.min(totalCount, startIndex + maxRenderCount);
            }
            if (endIndex < startIndex) {
                endIndex = startIndex;
            }
            topHeight = Math.max(0, offsets[startIndex] || 0);
            const endOffset = offsets[endIndex] || topHeight;
            const totalHeight = Number.isFinite(state.totalEstimateHeight)
                ? state.totalEstimateHeight
                : (offsets[offsets.length - 1] || endOffset);
            bottomHeight = Math.max(0, totalHeight - endOffset);
        } else {
            const baseIndex = Math.floor(scrollTop / itemHeight);
            startIndex = Math.max(0, baseIndex - overscan);
            const visibleCount = Math.ceil(viewportHeight / itemHeight) + (overscan * 2);
            const renderCount = Math.min(maxRenderCount, Math.max(minRenderCount, visibleCount));
            endIndex = Math.min(totalCount, startIndex + renderCount);
            topHeight = Math.max(0, startIndex * itemHeight);
            bottomHeight = Math.max(0, (totalCount - endIndex) * itemHeight);
        }

        state.topSpacer.style.height = `${topHeight}px`;
        state.bottomSpacer.style.height = `${bottomHeight}px`;

        const sameRange =
            state.lastStartIndex === startIndex &&
            state.lastEndIndex === endIndex &&
            state.lastTotalCount === totalCount &&
            state.appliedVersion === state.dataVersion;
        if (sameRange) {
            return;
        }

        this.clearVirtualListRows(state);
        const fragment = document.createDocumentFragment();
        for (let i = startIndex; i < endIndex; i += 1) {
            const rowNode = state.renderItem(items[i], i);
            if (!rowNode) continue;
            rowNode.setAttribute('data-virtual-index', String(i));
            fragment.appendChild(rowNode);
        }
        state.bottomSpacer.before(fragment);
        state.lastStartIndex = startIndex;
        state.lastEndIndex = endIndex;
        state.lastTotalCount = totalCount;
        state.appliedVersion = state.dataVersion;
        this.scheduleVirtualListMeasurement(state);
    }

    renderVirtualRows(container, rows, renderItem, options = {}) {
        this.setVirtualListData(container, rows, renderItem, options);
    }

    getRegionOptions() {
        return [
            { key: 'new_ao', label: '新奥' },
            { key: 'old_ao', label: '老奥' },
            { key: 'hongkong', label: '香港' }
        ];
    }

    getActiveRegion() {
        return this.activeRegion;
    }

    getActiveRegionLabel() {
        const match = this.getRegionOptions().find(item => item.key === this.activeRegion);
        return match ? match.label : '新奥';
    }

    getRegionLabel(regionKey) {
        const match = this.getRegionOptions().find(item => item.key === regionKey);
        return match ? match.label : regionKey;
    }

    getUserRegionAccountingInfo(userName = '') {
        const fallback = {
            mode: 'split',
            separateStatsByRegion: true,
            defaultRegion: 'new_ao',
            defaultRegionLabel: this.getRegionLabel('new_ao')
        };
        const clientId = String(userName || '').trim();
        if (!clientId
            || !window.messageProcessor
            || typeof window.messageProcessor.getEffectiveRegionAccountingInfo !== 'function'
        ) {
            return fallback;
        }
        try {
            const info = window.messageProcessor.getEffectiveRegionAccountingInfo(clientId);
            if (!info || typeof info !== 'object') return fallback;
            const defaultRegion = String(info.defaultRegion || '').trim() || fallback.defaultRegion;
            return {
                mode: info.separateStatsByRegion === false ? 'merged' : 'split',
                separateStatsByRegion: info.separateStatsByRegion !== false,
                defaultRegion,
                defaultRegionLabel: this.getRegionLabel(defaultRegion)
            };
        } catch (error) {
            return fallback;
        }
    }

    getUserRegionModeSummary(userName = '') {
        const info = this.getUserRegionAccountingInfo(userName);
        if (info.separateStatsByRegion === false) {
            return `不分区域，统一记到${info.defaultRegionLabel}`;
        }
        return '按区域分别统计';
    }

    getUserRegionDisplayLabel(userName = '', regionKey = this.activeRegion) {
        const info = this.getUserRegionAccountingInfo(userName);
        if (info.separateStatsByRegion === false) {
            return `统一区域（记${info.defaultRegionLabel}）`;
        }
        return this.getRegionLabel(regionKey);
    }

    getViewRegions() {
        const order = this.getRegionOptions().map(item => item.key);
        const selected = order.filter(key => this.viewRegions.has(key));
        return selected.length > 0 ? selected : ['new_ao'];
    }

    getViewRegionLabels() {
        return this.getViewRegions().map(key => this.getRegionLabel(key));
    }

    regionHasAnyData(regionKey) {
        return Object.keys(this.users).some(userName => {
            const regionData = this.getUserRegionData(userName, regionKey);
            if (!regionData) return false;
            if ((regionData.totalCount || 0) > 0) return true;
            if (Array.isArray(regionData.originalData) && regionData.originalData.length > 0) return true;
            return Array.isArray(regionData.data) && regionData.data.some(item => (item.value || 0) > 0);
        });
    }

    getAvailableViewRegions() {
        return this.getRegionOptions().filter(region => this.regionHasAnyData(region.key));
    }

    getSystemDefaultSettlementOdds() {
        if (window.messageProcessor && typeof window.messageProcessor.getEffectiveDefaultOdds === 'function') {
            const odds = Number(window.messageProcessor.getEffectiveDefaultOdds(''));
            if (Number.isFinite(odds) && odds > 0) return odds;
        }
        if (window.messageProcessor) {
            const legacyOdds = Number(window.messageProcessor.ODDS);
            if (Number.isFinite(legacyOdds) && legacyOdds > 0) return legacyOdds;
        }
        return 47;
    }

    getSystemDefaultRebateRate() {
        return 4;
    }

    getInitialSettlementOdds(userName = '') {
        if (userName && window.messageProcessor && typeof window.messageProcessor.getEffectiveDefaultOdds === 'function') {
            const odds = Number(window.messageProcessor.getEffectiveDefaultOdds(userName));
            if (Number.isFinite(odds) && odds > 0) return odds;
        }
        return this.getSystemDefaultSettlementOdds();
    }

    normalizeSettlementOddsValue(rawOdds, fallback = this.getSystemDefaultSettlementOdds()) {
        const parsed = Number(rawOdds);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
        return Number.isFinite(fallback) && fallback > 0 ? fallback : this.getSystemDefaultSettlementOdds();
    }

    normalizeRebateRateValue(rawRate, fallback = this.getSystemDefaultRebateRate()) {
        const parsed = Number(rawRate);
        if (Number.isFinite(parsed) && parsed >= 0) {
            return parsed;
        }
        return Number.isFinite(fallback) && fallback >= 0 ? fallback : this.getSystemDefaultRebateRate();
    }

    normalizePositiveDecimalInput(rawValue = '') {
        const normalized = String(rawValue == null ? '' : rawValue)
            .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248))
            .replace(/[．。]/g, '.')
            .replace(/[^\d.]/g, '');
        let result = '';
        let dotUsed = false;
        for (const ch of normalized) {
            if (/\d/.test(ch)) {
                result += ch;
                continue;
            }
            if (ch === '.' && !dotUsed) {
                if (!result) {
                    result = '0';
                }
                result += '.';
                dotUsed = true;
            }
        }
        return result;
    }

    bindSettlementNumericInput(input) {
        if (!input) return;
        const normalize = () => {
            const next = this.normalizePositiveDecimalInput(input.value);
            if (input.value !== next) {
                input.value = next;
            }
        };
        input.type = 'text';
        input.inputMode = 'decimal';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.addEventListener('input', normalize);
        input.addEventListener('paste', () => {
            requestAnimationFrame(normalize);
        });
    }

    getDefaultUserSettlementConfig(userName = '') {
        return {
            odds: this.getInitialSettlementOdds(userName),
            rebateRate: this.getSystemDefaultRebateRate()
        };
    }

    getUserSettlementConfig(userName = '') {
        const user = this.users[userName];
        const fallback = this.getDefaultUserSettlementConfig(userName);
        if (!user || typeof user !== 'object') {
            return {
                odds: fallback.odds,
                rebateRate: fallback.rebateRate,
                rebateRatio: 0
            };
        }
        const odds = this.normalizeSettlementOddsValue(user.settlementOdds, fallback.odds);
        const rebateRate = this.normalizeRebateRateValue(
            Object.prototype.hasOwnProperty.call(user, 'rebateRate')
                ? user.rebateRate
                : user.rebate,
            fallback.rebateRate
        );
        return {
            odds,
            rebateRate,
            rebateRatio: rebateRate / 100
        };
    }

    getUserSettlementOdds(userName = '') {
        return this.getUserSettlementConfig(userName).odds;
    }

    getUserRebateRate(userName = '') {
        return this.getUserSettlementConfig(userName).rebateRate;
    }

    getDefaultUserParsePreference(userName = '') {
        const tailShorthandAsSeparateGroups = !!(
            userName
            && window.messageProcessor
            && typeof window.messageProcessor.getEffectiveTailShorthandAsSeparateGroups === 'function'
            && window.messageProcessor.getEffectiveTailShorthandAsSeparateGroups(userName)
        );
        return {
            tailShorthandAsSeparateGroups: tailShorthandAsSeparateGroups || !userName || !window.messageProcessor
        };
    }

    getUserParsePreference(userName = '') {
        const user = this.users[userName];
        const fallback = this.getDefaultUserParsePreference(userName);
        if (!user || typeof user !== 'object') {
            return fallback;
        }
        if (Object.prototype.hasOwnProperty.call(user, 'tailShorthandAsSeparateGroups')) {
            return {
                tailShorthandAsSeparateGroups: user.tailShorthandAsSeparateGroups === true
            };
        }
        return fallback;
    }

    hasStoredUserParsePreference(userName = '') {
        const user = this.users[userName];
        return !!(user
            && typeof user === 'object'
            && Object.prototype.hasOwnProperty.call(user, 'tailShorthandAsSeparateGroups'));
    }

    updateUserParsePreference(userName, nextPreference = {}, options = {}) {
        const user = this.users[userName];
        if (!user || typeof user !== 'object') {
            throw new Error('客户不存在');
        }
        const current = this.getUserParsePreference(userName);
        const nextEnabled = Object.prototype.hasOwnProperty.call(nextPreference, 'tailShorthandAsSeparateGroups')
            ? nextPreference.tailShorthandAsSeparateGroups === true
            : current.tailShorthandAsSeparateGroups === true;

        user.tailShorthandAsSeparateGroups = nextEnabled;

        if (options.syncRulePreference !== false
            && window.messageProcessor
            && typeof window.messageProcessor.setTailShorthandAsSeparateGroups === 'function') {
            try {
                window.messageProcessor.setTailShorthandAsSeparateGroups(nextEnabled, {
                    scope: 'client',
                    clientId: userName
                });
            } catch (error) {
                console.warn(`同步客户尾数简写规则失败(${userName}):`, error);
            }
        }

        this.invalidateOriginalDataDerivedCaches();
        this.invalidateUserListDerivedCaches();

        if (options.render !== false) {
            const affectsCurrentScope = this.isUserInCurrentScope(userName);
            this.renderAllSections({
                refreshCurrentUserDisplay: false,
                refreshTitles: false,
                refreshSection: false,
                refreshSortedResults: false,
                refreshOriginalData: affectsCurrentScope,
                refreshViewRegionBar: false,
                refreshRegionPnlPanel: false,
                refreshDashboardStatus: false,
                refreshRecognizePreviousMessagePreview: affectsCurrentScope ? 'auto' : false,
                refreshRecognizePanels: false
            });
        }
        if (options.save !== false) {
            this.saveUserData();
        }

        return {
            tailShorthandAsSeparateGroups: nextEnabled
        };
    }

    syncStoredUserParsePreferencesToRules() {
        if (!window.messageProcessor || typeof window.messageProcessor.setTailShorthandAsSeparateGroups !== 'function') {
            return;
        }
        Object.keys(this.users).forEach((userName) => {
            if (!this.hasStoredUserParsePreference(userName)) return;
            const preference = this.getUserParsePreference(userName);
            try {
                window.messageProcessor.setTailShorthandAsSeparateGroups(preference.tailShorthandAsSeparateGroups, {
                    scope: 'client',
                    clientId: userName
                });
            } catch (error) {
                console.warn(`同步客户尾数简写规则失败(${userName}):`, error);
            }
        });
    }

    syncUserSettlementOddsFromRule(userName, odds, options = {}) {
        const user = this.users[userName];
        if (!user || typeof user !== 'object') return null;
        user.settlementOdds = this.normalizeSettlementOddsValue(odds, this.getInitialSettlementOdds(userName));
        this.invalidateUserListDerivedCaches();
        if (options.render !== false) {
            const affectsCurrentScope = this.isUserInCurrentScope(userName);
            this.renderAllSections({
                refreshCurrentUserDisplay: false,
                refreshTitles: false,
                refreshSection: false,
                refreshSortedResults: affectsCurrentScope,
                refreshOriginalData: false,
                refreshViewRegionBar: false,
                refreshRegionPnlPanel: affectsCurrentScope,
                refreshDashboardStatus: affectsCurrentScope,
                refreshRecognizePreviousMessagePreview: false,
                refreshRecognizePanels: false
            });
        }
        if (options.save !== false) {
            this.saveUserData();
        }
        return user.settlementOdds;
    }

    updateUserSettlementConfig(userName, nextConfig = {}, options = {}) {
        const user = this.users[userName];
        if (!user || typeof user !== 'object') {
            throw new Error('客户不存在');
        }

        const current = this.getUserSettlementConfig(userName);
        const nextOdds = this.normalizeSettlementOddsValue(
            Object.prototype.hasOwnProperty.call(nextConfig, 'odds')
                ? nextConfig.odds
                : current.odds,
            current.odds
        );
        const nextRebateRate = this.normalizeRebateRateValue(
            Object.prototype.hasOwnProperty.call(nextConfig, 'rebateRate')
                ? nextConfig.rebateRate
                : current.rebateRate,
            current.rebateRate
        );

        user.settlementOdds = nextOdds;
        user.rebateRate = nextRebateRate;
        this.invalidateUserListDerivedCaches();

        if (options.syncRuleOdds !== false
            && window.messageProcessor
            && typeof window.messageProcessor.setDefaultOdds === 'function') {
            try {
                window.messageProcessor.setDefaultOdds(nextOdds, {
                    scope: 'client',
                    clientId: userName
                });
            } catch (error) {
                console.warn(`同步客户识别倍率失败(${userName}):`, error);
            }
        }

        if (options.keepExpanded !== true && this.expandedSettlementUser === userName) {
            this.expandedSettlementUser = '';
        }

        if (options.render !== false) {
            const affectsCurrentScope = this.isUserInCurrentScope(userName);
            this.renderAllSections({
                refreshCurrentUserDisplay: false,
                refreshTitles: false,
                refreshSection: false,
                refreshSortedResults: affectsCurrentScope,
                refreshOriginalData: false,
                refreshViewRegionBar: false,
                refreshRegionPnlPanel: affectsCurrentScope,
                refreshDashboardStatus: affectsCurrentScope,
                refreshRecognizePreviousMessagePreview: false,
                refreshRecognizePanels: false
            });
        }
        if (options.save !== false) {
            this.saveUserData();
        }

        return {
            odds: nextOdds,
            rebateRate: nextRebateRate
        };
    }

    toggleSettlementEditor(userName) {
        if (!this.users[userName]) return;
        this.expandedSettlementUser = this.expandedSettlementUser === userName ? '' : userName;
        this.renderUserList();
    }

    createDefaultUserRecord(userName = '') {
        const settlement = this.getDefaultUserSettlementConfig(userName);
        return {
            settlementOdds: settlement.odds,
            rebateRate: settlement.rebateRate,
            regions: {
                new_ao: this.createEmptyRegionData(),
                old_ao: this.createEmptyRegionData(),
                hongkong: this.createEmptyRegionData()
            }
        };
    }

    createEmptyRegionData() {
        const data = this.generateData();
        return {
            data,
            payoutData: data.map(item => ({ ...item, value: 0 })),
            originalData: [],
            totalCount: 0
        };
    }

    getDefaultPayoutOdds() {
        if (window.messageProcessor && typeof window.messageProcessor.getEffectiveDefaultOdds === 'function') {
            const odds = Number(window.messageProcessor.getEffectiveDefaultOdds(''));
            if (Number.isFinite(odds) && odds > 0) return odds;
        }
        if (window.messageProcessor) {
            const legacyOdds = Number(window.messageProcessor.ODDS);
            if (Number.isFinite(legacyOdds) && legacyOdds > 0) return legacyOdds;
        }
        return 47;
    }

    createPayoutDataFromStakeData(stakeData = [], odds = this.getDefaultPayoutOdds()) {
        const safeOdds = Number.isFinite(Number(odds)) && Number(odds) > 0 ? Number(odds) : 47;
        return (Array.isArray(stakeData) ? stakeData : this.generateData()).map(item => ({
            number: item.number,
            text: item.text,
            value: (Number(item.value) || 0) * safeOdds
        }));
    }

    normalizeNumberDataSeries(source = [], fallbackSeries = []) {
        const template = this.generateData().map(item => ({
            number: item.number,
            text: item.text,
            value: 0
        }));
        const map = new Map(template.map(item => [item.number, { ...item }]));
        const applyFallback = (series) => {
            if (!Array.isArray(series)) return;
            series.forEach((item) => {
                if (!item || typeof item !== 'object') return;
                const number = String(item.number || '').padStart(2, '0');
                if (!map.has(number)) return;
                const value = Number(item.value);
                if (!Number.isFinite(value)) return;
                map.get(number).value = value;
            });
        };
        const sourceAgg = new Map();
        if (Array.isArray(source)) {
            source.forEach((item) => {
                if (!item || typeof item !== 'object') return;
                const number = String(item.number || '').padStart(2, '0');
                if (!map.has(number)) return;
                const value = Number(item.value);
                if (!Number.isFinite(value)) return;
                sourceAgg.set(number, (sourceAgg.get(number) || 0) + value);
            });
        }
        applyFallback(fallbackSeries);
        sourceAgg.forEach((value, number) => {
            if (!map.has(number)) return;
            map.get(number).value = value;
        });
        return template.map(item => map.get(item.number) || item);
    }

    ensureRegionPayoutData(regionData, options = {}) {
        if (!regionData || !Array.isArray(regionData.data)) return [];
        const fallbackOdds = Number(options && options.fallbackOdds);
        const odds = Number.isFinite(fallbackOdds) && fallbackOdds > 0
            ? fallbackOdds
            : this.getDefaultPayoutOdds();
        const fallback = this.createPayoutDataFromStakeData(regionData.data, odds);
        regionData.payoutData = this.normalizeNumberDataSeries(regionData.payoutData, fallback);
        return regionData.payoutData;
    }

    hasIncompletePayoutData() {
        const regionKeys = this.getRegionOptions().map(item => item.key);
        return Object.keys(this.users || {}).some((userName) => {
            return regionKeys.some((regionKey) => {
                const regionData = this.getUserRegionData(userName, regionKey);
                if (!regionData || !Array.isArray(regionData.data)) return false;
                if (!Array.isArray(regionData.payoutData)) return true;
                return regionData.payoutData.length !== regionData.data.length;
            });
        });
    }

    extractOriginalMessageText(entry) {
        if (typeof entry === 'string') {
            return entry.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        }
        if (entry && typeof entry === 'object') {
            const candidates = ['raw', 'message', 'text', 'original', 'value', 'canonical'];
            for (const key of candidates) {
                if (typeof entry[key] === 'string') {
                    return entry[key].replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                }
            }
        }
        if (entry == null) return '';
        return String(entry).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }

    extractOriginalMessageCreatedAt(entry) {
        if (!entry || typeof entry !== 'object') return '';
        const candidates = ['createdAt', 'addedAt', 'timestamp', 'time'];
        for (const key of candidates) {
            if (typeof entry[key] === 'string' && String(entry[key]).trim()) {
                return String(entry[key]).trim();
            }
        }
        return '';
    }

    extractOriginalMessageEditedAt(entry) {
        if (!entry || typeof entry !== 'object') return '';
        const candidates = ['editedAt', 'updatedAt', 'modifiedAt', 'editTime'];
        for (const key of candidates) {
            if (typeof entry[key] === 'string' && String(entry[key]).trim()) {
                return String(entry[key]).trim();
            }
        }
        return '';
    }

    normalizeOriginalMessageCreatedAt(value) {
        const raw = String(value || '').trim();
        if (!raw) return '';
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) {
            return raw;
        }
        return parsed.toISOString();
    }

    formatOriginalMessageCreatedAt(value) {
        const normalized = this.normalizeOriginalMessageCreatedAt(value);
        if (!normalized) return '未记录';
        const parsed = new Date(normalized);
        if (Number.isNaN(parsed.getTime())) {
            return normalized;
        }
        return parsed.toLocaleString('zh-CN', { hour12: false });
    }

    escapeHtmlText(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    cancelPendingOriginalDataSearchRender() {
        if (this.originalDataSearchTimer == null) return;
        clearTimeout(this.originalDataSearchTimer);
        this.originalDataSearchTimer = null;
    }

    cancelPendingUserListRender() {
        if (this.userSearchTimer == null) return;
        clearTimeout(this.userSearchTimer);
        this.userSearchTimer = null;
    }

    scheduleOriginalDataSearchRender(delay = 140) {
        this.cancelPendingOriginalDataSearchRender();
        this.originalDataSearchTimer = setTimeout(() => {
            this.originalDataSearchTimer = null;
            this.renderOriginalData();
        }, Math.max(0, Number(delay) || 0));
    }

    scheduleUserListRender(delay = 120) {
        this.cancelPendingUserListRender();
        this.userSearchTimer = setTimeout(() => {
            this.userSearchTimer = null;
            this.renderUserList();
        }, Math.max(0, Number(delay) || 0));
    }

    invalidateOriginalDataDerivedCaches() {
        this.cancelPendingOriginalDataSearchRender();
        this.originalOrderTotalCache.clear();
        this.originalParseSummaryCache.clear();
        this.originalRowHitCache.clear();
        this.originalRowHeightCache.clear();
        this.originalRowsSnapshotVersion += 1;
        this.originalRowsSnapshotCache = {
            key: '',
            rows: []
        };
        this.invalidateSelectedScopeSnapshot();
    }

    invalidateUserListDerivedCaches() {
        this.cancelPendingUserListRender();
        this.userListDerivedVersion += 1;
        this.sortedUsersCache = {
            key: '',
            users: []
        };
        this.userListSummaryCache.clear();
        this.invalidateSelectedScopeSnapshot();
    }

    invalidateSelectedScopeSnapshot() {
        this.selectedScopeSnapshotVersion += 1;
        this.selectedScopeSnapshotCache = {
            key: '',
            data: null
        };
    }

    getUserListDerivedBaseKey() {
        return `${this.userListDerivedVersion}|${this.getViewRegions().join(',')}`;
    }

    normalizeUserListSortMode(mode = 'amount_desc') {
        const normalized = String(mode || '').trim();
        return ['serial_asc', 'serial_desc', 'amount_asc', 'amount_desc'].includes(normalized) ? normalized : 'amount_desc';
    }

    getUserListSortMode() {
        return this.normalizeUserListSortMode(this.userListSortMode);
    }

    setUserListSortMode(mode = 'amount_desc') {
        const nextMode = this.normalizeUserListSortMode(mode);
        if (nextMode === this.userListSortMode) {
            this.syncUserListSortControls();
            return;
        }
        this.userListSortMode = nextMode;
        this.renderUserList();
    }

    syncUserListSortControls() {
        const mode = this.getUserListSortMode();
        const mappings = [
            { mode: 'serial_asc', id: 'userSortSerialAscBtn' },
            { mode: 'serial_desc', id: 'userSortSerialDescBtn' },
            { mode: 'amount_asc', id: 'userSortAmountAscBtn' },
            { mode: 'amount_desc', id: 'userSortAmountDescBtn' }
        ];
        mappings.forEach(({ mode: key, id }) => {
            const button = document.getElementById(id);
            if (!button) return;
            const active = mode === key;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', active ? 'true' : 'false');
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    }

    getUserSerialMap() {
        const serialMap = new Map();
        Object.keys(this.users).forEach((userName, index) => {
            serialMap.set(userName, index + 1);
        });
        return serialMap;
    }

    getOriginalRowDerivedCacheKey(row) {
        if (!row || typeof row !== 'object') return '';
        const userName = String(row.userName || '').trim();
        const regionKey = String(row.regionKey || this.activeRegion || 'new_ao').trim() || 'new_ao';
        const index = Number.isInteger(row.index) ? row.index : -1;
        const message = this.extractOriginalMessageText(row.message);
        return `${userName}|${regionKey}|${index}|${message}`;
    }

    getOriginalStoredParseSummary(row) {
        if (!row || typeof row !== 'object') return null;
        const cacheKey = this.getOriginalRowDerivedCacheKey(row);
        if (cacheKey && this.originalParseSummaryCache.has(cacheKey)) {
            return this.originalParseSummaryCache.get(cacheKey);
        }
        const storedSummary = this.extractOriginalMessageParseSummary(row.originalEntry);
        return storedSummary || null;
    }

    setOriginalDataSearchKeyword(keyword = '') {
        const next = String(keyword == null ? '' : keyword);
        if (next === this.originalDataSearchKeyword) return;
        this.originalDataSearchKeyword = next;
        this.scheduleOriginalDataSearchRender();
    }

    getOriginalDataSearchKeyword() {
        return this.originalDataSearchKeyword;
    }

    loadOriginalDataCollapsedPreference() {
        if (typeof window === 'undefined' || !window.localStorage) return false;
        try {
            return window.localStorage.getItem('messagecounter.originalDataCollapsed.v1') === '1';
        } catch (error) {
            return false;
        }
    }

    saveOriginalDataCollapsedPreference() {
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            window.localStorage.setItem('messagecounter.originalDataCollapsed.v1', this.originalDataCollapsed ? '1' : '0');
        } catch (error) {
            // ignore
        }
    }

    getOriginalDataCollapsed() {
        return this.originalDataCollapsed === true;
    }

    setOriginalDataCollapsed(collapsed) {
        const next = collapsed === true;
        if (next === this.originalDataCollapsed) {
            this.syncOriginalDataCollapseControl();
            return;
        }
        this.originalDataCollapsed = next;
        this.saveOriginalDataCollapsedPreference();
        this.renderOriginalData();
    }

    toggleOriginalDataCollapsed() {
        this.setOriginalDataCollapsed(!this.getOriginalDataCollapsed());
    }

    normalizeOriginalDataSortMode(mode = 'serial_asc') {
        const normalized = String(mode || '').trim();
        return ['serial_asc', 'serial_desc', 'amount_asc', 'amount_desc'].includes(normalized) ? normalized : 'serial_asc';
    }

    getOriginalDataSortMode() {
        return this.normalizeOriginalDataSortMode(this.originalDataSortMode);
    }

    setOriginalDataSortMode(mode = 'serial_asc') {
        const nextMode = this.normalizeOriginalDataSortMode(mode);
        if (nextMode === this.originalDataSortMode) {
            this.syncOriginalDataSortControls();
            return;
        }
        this.originalDataSortMode = nextMode;
        this.renderOriginalData();
    }

    syncOriginalDataSortControls() {
        const mode = this.getOriginalDataSortMode();
        const mappings = [
            { mode: 'serial_asc', id: 'originalDataSortSerialAscBtn' },
            { mode: 'serial_desc', id: 'originalDataSortSerialDescBtn' },
            { mode: 'amount_asc', id: 'originalDataSortAmountAscBtn' },
            { mode: 'amount_desc', id: 'originalDataSortAmountDescBtn' }
        ];
        mappings.forEach(({ mode: key, id }) => {
            const button = document.getElementById(id);
            if (!button) return;
            const active = mode === key;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', active ? 'true' : 'false');
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    }

    syncOriginalDataCollapseControl() {
        const button = document.getElementById('originalDataCollapseToggleBtn');
        if (!button) return;
        const collapsed = this.getOriginalDataCollapsed();
        button.classList.toggle('active', collapsed);
        button.textContent = collapsed ? '展开详情' : '折叠摘要';
        button.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
    }

    attachOriginalRowSerial(rows = []) {
        if (!Array.isArray(rows) || rows.length === 0) return [];
        return rows.map((row, index) => ({
            ...row,
            sourceSerial: Number.isInteger(row && row.sourceSerial) ? row.sourceSerial : (index + 1)
        }));
    }

    sortOriginalRows(rows = []) {
        if (!Array.isArray(rows) || rows.length <= 1) {
            return Array.isArray(rows) ? rows.slice() : [];
        }
        const mode = this.getOriginalDataSortMode();
        if (mode === 'serial_asc') {
            return rows
                .slice()
                .sort((left, right) => (Number(left && left.sourceSerial) || 0) - (Number(right && right.sourceSerial) || 0));
        }
        if (mode === 'serial_desc') {
            return rows
                .slice()
                .sort((left, right) => (Number(right && right.sourceSerial) || 0) - (Number(left && left.sourceSerial) || 0));
        }

        const factor = mode === 'amount_asc' ? 1 : -1;
        return rows
            .map((row, index) => ({
                row,
                index,
                total: this.getOriginalOrderTotalCached(row),
                sourceSerial: Number(row && row.sourceSerial) || (index + 1)
            }))
            .sort((left, right) => {
                const leftHasTotal = Number.isFinite(Number(left.total));
                const rightHasTotal = Number.isFinite(Number(right.total));
                if (leftHasTotal !== rightHasTotal) {
                    return leftHasTotal ? -1 : 1;
                }
                const leftTotal = leftHasTotal ? Number(left.total) : 0;
                const rightTotal = rightHasTotal ? Number(right.total) : 0;
                if (leftTotal !== rightTotal) {
                    return (leftTotal - rightTotal) * factor;
                }
                if (left.sourceSerial !== right.sourceSerial) {
                    return left.sourceSerial - right.sourceSerial;
                }
                return left.index - right.index;
            })
            .map((entry) => entry.row);
    }

    shouldPrewarmOriginalRowHeights() {
        return false;
    }

    shouldUseOriginalDataVirtualList(rows = []) {
        return Array.isArray(rows) && rows.length >= 36;
    }

    shouldUseUserListVirtualList(userNames = []) {
        return Array.isArray(userNames) && userNames.length >= 18;
    }

    estimateUserListRowHeight() {
        return 148;
    }

    getOriginalVirtualRowEstimate(row) {
        if (this.getOriginalDataCollapsed()) {
            return 64;
        }
        return this.estimateOriginalRowHeight(row);
    }

    prewarmOriginalRowHeights(rows = []) {
        if (!Array.isArray(rows) || rows.length === 0) return;
        rows.forEach((row) => {
            this.getOriginalParseSummaryCached(row);
            this.estimateOriginalRowHeight(row);
        });
    }

    renderOriginalDataStaticRows(container, rows = []) {
        if (!container) return;
        this.deactivateVirtualList(container);
        container.innerHTML = '';
        if (!Array.isArray(rows) || rows.length === 0) {
            const emptyNode = document.createElement('li');
            emptyNode.className = 'virtual-empty';
            emptyNode.textContent = '暂无原始消息';
            container.appendChild(emptyNode);
            return;
        }

        const fragment = document.createDocumentFragment();
        const collapsed = this.getOriginalDataCollapsed();
        rows.forEach((row, index) => {
            const rowNode = collapsed
                ? this.createCollapsedOriginalDataRow(row, index)
                : this.createOriginalDataRow(row, index);
            if (!rowNode) return;
            fragment.appendChild(rowNode);
        });
        container.appendChild(fragment);
    }

    renderUserListStaticRows(container, userNames = [], serialMap = new Map()) {
        if (!container) return;
        this.deactivateVirtualList(container);
        container.innerHTML = '';

        if (!Array.isArray(userNames) || userNames.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'user-list-empty';
            empty.textContent = this.userSearchKeyword ? '没有匹配的客户' : '暂无客户';
            container.appendChild(empty);
            return;
        }

        const fragment = document.createDocumentFragment();
        userNames.forEach((userName, index) => {
            fragment.appendChild(this.createUserListRow(userName, {
                serialNo: serialMap.get(userName) || (index + 1)
            }));
        });
        container.appendChild(fragment);
    }

    isOriginalMessageMatched(message, keyword = this.originalDataSearchKeyword) {
        const raw = this.extractOriginalMessageText(message);
        const needle = String(keyword || '').trim().toLocaleLowerCase();
        if (!needle) return false;
        return raw.toLocaleLowerCase().includes(needle);
    }

    renderOriginalMessageHighlightHtml(message) {
        const raw = this.extractOriginalMessageText(message);
        const keyword = String(this.originalDataSearchKeyword || '').trim();
        if (!keyword) return this.escapeHtmlText(raw);

        const lowerRaw = raw.toLocaleLowerCase();
        const lowerKeyword = keyword.toLocaleLowerCase();
        if (!lowerKeyword) return this.escapeHtmlText(raw);

        let cursor = 0;
        let html = '';
        while (cursor < raw.length) {
            const matchIndex = lowerRaw.indexOf(lowerKeyword, cursor);
            if (matchIndex < 0) {
                html += this.escapeHtmlText(raw.slice(cursor));
                break;
            }
            html += this.escapeHtmlText(raw.slice(cursor, matchIndex));
            html += `<span class="message-text-highlight">${this.escapeHtmlText(raw.slice(matchIndex, matchIndex + keyword.length))}</span>`;
            cursor = matchIndex + keyword.length;
        }
        return html;
    }

    extractOriginalMessageTotal(entry) {
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

    extractOriginalMessageParseSummary(entry) {
        if (!entry || typeof entry !== 'object' || !entry.parseSummary || typeof entry.parseSummary !== 'object') {
            return null;
        }
        return this.normalizeOriginalParseSummary(entry.parseSummary, {
            fallbackAmount: this.extractOriginalMessageTotal(entry)
        });
    }

    normalizeOriginalHitNumberAmounts(hitNumberAmounts) {
        if (!hitNumberAmounts || typeof hitNumberAmounts !== 'object') return null;
        const normalized = {};
        const appendAmount = (rawNumber, rawAmount) => {
            const numericNumber = Number.parseInt(rawNumber, 10);
            const amount = Number(rawAmount);
            if (!Number.isInteger(numericNumber) || numericNumber < 1 || numericNumber > 49) return;
            if (!Number.isFinite(amount) || amount <= 0) return;
            const formattedNumber = String(numericNumber).padStart(2, '0');
            normalized[formattedNumber] = (Number(normalized[formattedNumber]) || 0) + amount;
        };

        if (hitNumberAmounts instanceof Map) {
            hitNumberAmounts.forEach((amount, number) => appendAmount(number, amount));
        } else {
            Object.entries(hitNumberAmounts).forEach(([number, amount]) => appendAmount(number, amount));
        }

        const keys = Object.keys(normalized).sort((left, right) => Number(left) - Number(right));
        if (keys.length === 0) return null;
        const ordered = {};
        keys.forEach((key) => {
            ordered[key] = normalized[key];
        });
        return ordered;
    }

    extractOriginalMessageHitNumberAmounts(entry) {
        if (!entry || typeof entry !== 'object') return null;
        const candidate = entry.hitNumberAmounts || entry.hitAmounts || entry.hitNumberIndex;
        return this.normalizeOriginalHitNumberAmounts(candidate);
    }

    normalizeOriginalParseIssue(issue) {
        if (!issue || typeof issue !== 'object') return null;
        const rawKind = String(issue.kind || '').trim();
        const kind = ['blocked', 'play', 'ignored'].includes(rawKind) ? rawKind : 'ignored';
        const lineNo = Number.isFinite(Number(issue.lineNo)) ? Number(issue.lineNo) : null;
        const reason = String(issue.reason || '').trim();
        const rawText = String(issue.rawText || '').trim();
        if (!reason && !rawText && !lineNo) {
            return null;
        }
        return {
            kind,
            lineNo,
            reason: reason || (kind === 'blocked' ? '疑似录入条目内容未识别' : (kind === 'play' ? '未开放玩法' : '格式无法识别')),
            rawText
        };
    }

    normalizeOriginalParseSummary(summary, options = {}) {
        if (!summary || typeof summary !== 'object') return null;
        const fallbackAmount = Number.isFinite(Number(options && options.fallbackAmount))
            ? Number(options.fallbackAmount)
            : 0;
        const countedEntryCount = Number.isFinite(Number(summary.countedEntryCount))
            ? Number(summary.countedEntryCount)
            : 0;
        const countedAmount = Number.isFinite(Number(summary.countedAmount))
            ? Number(summary.countedAmount)
            : fallbackAmount;
        const playCount = Number.isFinite(Number(summary.playCount)) ? Number(summary.playCount) : 0;
        const blockedCount = Number.isFinite(Number(summary.blockedCount)) ? Number(summary.blockedCount) : 0;
        const ignoredCount = Number.isFinite(Number(summary.ignoredCount)) ? Number(summary.ignoredCount) : 0;
        const unresolvedCount = Number.isFinite(Number(summary.unresolvedCount)) ? Number(summary.unresolvedCount) : 0;
        const issues = Array.isArray(summary.issues)
            ? summary.issues.map((issue) => this.normalizeOriginalParseIssue(issue)).filter(Boolean)
            : [];

        let status = String(summary.status || '').trim();
        if (!status) {
            if (blockedCount > 0) {
                status = 'blocked';
            } else if (countedEntryCount > 0 && playCount === 0 && ignoredCount === 0) {
                status = 'complete';
            } else if (countedEntryCount === 0 && playCount > 0 && ignoredCount === 0) {
                status = 'play_only';
            } else if (countedEntryCount > 0 || playCount > 0 || ignoredCount > 0 || unresolvedCount > 0) {
                status = 'partial';
            } else {
                status = countedAmount > 0 ? 'partial' : 'empty_or_noise';
            }
        }

        const statusLabelMap = {
            complete: '已完整统计',
            partial: '部分统计',
            blocked: '待处理',
            play_only: '仅未开放玩法',
            empty_or_noise: '仅噪音/摘要'
        };

        const derivedFocusIssues = issues
            .filter((issue) => issue && issue.kind !== 'ignored')
            .sort((left, right) => {
                const order = { blocked: 0, play: 1, ignored: 2 };
                const leftOrder = order[String(left && left.kind ? left.kind : 'ignored')] ?? 9;
                const rightOrder = order[String(right && right.kind ? right.kind : 'ignored')] ?? 9;
                if (leftOrder !== rightOrder) return leftOrder - rightOrder;
                const leftLine = Number.isFinite(Number(left && left.lineNo)) ? Number(left.lineNo) : Number.MAX_SAFE_INTEGER;
                const rightLine = Number.isFinite(Number(right && right.lineNo)) ? Number(right.lineNo) : Number.MAX_SAFE_INTEGER;
                return leftLine - rightLine;
            })
            .slice(0, 3);
        const explicitFocusIssues = Array.isArray(summary.focusIssues)
            ? summary.focusIssues.map((issue) => this.normalizeOriginalParseIssue(issue)).filter(Boolean)
            : [];
        const focusIssues = explicitFocusIssues.length > 0 ? explicitFocusIssues.slice(0, 3) : derivedFocusIssues;

        const normalized = {
            status,
            statusLabel: statusLabelMap[status] || '部分统计',
            countedEntryCount,
            countedAmount,
            playCount,
            blockedCount,
            ignoredCount,
            unresolvedCount,
            issues,
            focusIssues
        };
        const providedSummaryText = String(summary.summaryText || '').trim();
        normalized.summaryText = providedSummaryText || this.buildOriginalParseSummaryText(normalized);
        return normalized;
    }

    buildStoredOriginalDataEntry(message, totalAmount = null, createdAt = '', editedAt = '', parseSummary = null, hitNumberAmounts = null) {
        const entry = {
            message: this.extractOriginalMessageText(message)
        };
        const normalizedTotal = Number(totalAmount);
        if (Number.isFinite(normalizedTotal) && normalizedTotal >= 0) {
            entry.totalAmount = normalizedTotal;
        }
        const normalizedCreatedAt = this.normalizeOriginalMessageCreatedAt(createdAt);
        if (normalizedCreatedAt) {
            entry.createdAt = normalizedCreatedAt;
        }
        const normalizedEditedAt = this.normalizeOriginalMessageCreatedAt(editedAt);
        if (normalizedEditedAt) {
            entry.editedAt = normalizedEditedAt;
        }
        if (parseSummary && typeof parseSummary === 'object') {
            const normalizedParseSummary = this.normalizeOriginalParseSummary(parseSummary, {
                fallbackAmount: Number.isFinite(normalizedTotal) && normalizedTotal >= 0 ? normalizedTotal : 0
            });
            if (normalizedParseSummary) {
                entry.parseSummary = normalizedParseSummary;
            }
        }
        const normalizedHitNumberAmounts = this.normalizeOriginalHitNumberAmounts(hitNumberAmounts);
        if (normalizedHitNumberAmounts) {
            entry.hitNumberAmounts = normalizedHitNumberAmounts;
        }
        return entry;
    }

    formatAmountValue(value) {
        const amount = Number(value);
        if (!Number.isFinite(amount) || Math.abs(amount) < 1e-9) return '0';
        if (Number.isInteger(amount)) return `${amount}`;
        return amount.toFixed(4).replace(/\.?0+$/, '');
    }

    calculateOriginalOrderTotalLegacy(sourceMessage) {
        const raw = String(sourceMessage || '');
        let total = 0;

        const legacyMatches = [...raw.matchAll(/((\d+)[\s.,\-]*)+值[:：]\s*(\d+(?:\.\d+)?)/g)];
        legacyMatches.forEach((match) => {
            const numbers = String(match[0] || '').split('值')[0].match(/\d+/g) || [];
            const amount = Number.parseFloat(match[match.length - 1]);
            if (!numbers.length || !Number.isFinite(amount) || amount <= 0) return;
            total += numbers.length * amount;
        });
        if (total > 0) return total;

        const modernMatches = [...raw.matchAll(/([\d\s.,\-—，。]+)[～~]\s*各(?:号)?\s*(\d+(?:\.\d+)?)/g)];
        modernMatches.forEach((match) => {
            const numbers = String(match[1] || '').match(/\d+/g) || [];
            const amount = Number.parseFloat(match[2]);
            if (!numbers.length || !Number.isFinite(amount) || amount <= 0) return;
            total += numbers.length * amount;
        });
        return total;
    }

    calculateOriginalOrderTotal(sourceMessage, userName, regionKey = this.activeRegion) {
        const raw = this.extractOriginalMessageText(sourceMessage);
        if (!raw.trim()) return 0;
        const targetRegion = regionKey || this.activeRegion;
        let parseFailed = false;

        if (window.messageProcessor && typeof window.messageProcessor.parseMessage === 'function') {
            try {
                const parsed = window.messageProcessor.parseMessage(raw, { clientId: userName, allowPartial: true });
                const regionAccounting = window.messageProcessor.getEffectiveRegionAccountingInfo
                    ? window.messageProcessor.getEffectiveRegionAccountingInfo(userName)
                    : {
                        separateStatsByRegion: true,
                        defaultRegion: targetRegion
                    };
                let regionTotal = 0;
                let allRegionTotal = 0;
                (parsed.entries || []).forEach((entry) => {
                    const amount = Number(entry && entry.amount);
                    const numberCount = Array.isArray(entry && entry.numbers) ? entry.numbers.length : 0;
                    if (!Number.isFinite(amount) || amount <= 0 || numberCount <= 0) return;
                    const entryTotal = numberCount * amount;
                    allRegionTotal += entryTotal;
                    const parsedRegion = entry && entry.regionKey ? entry.regionKey : targetRegion;
                    const entryRegion = regionAccounting && regionAccounting.separateStatsByRegion === false
                        ? (regionAccounting.defaultRegion || targetRegion)
                        : parsedRegion;
                    if (entryRegion === targetRegion) {
                        regionTotal += entryTotal;
                    }
                });
                if (regionTotal > 0) {
                    return regionTotal;
                }
                if (allRegionTotal > 0) {
                    // 兼容历史数据：若当前规则默认区域变更导致分区不匹配，至少展示该条原始消息的总额。
                    return allRegionTotal;
                }
            } catch (error) {
                parseFailed = true;
            }
        }

        const legacyTotal = this.calculateOriginalOrderTotalLegacy(raw);
        if (legacyTotal > 0) {
            return legacyTotal;
        }
        if (parseFailed) {
            return null;
        }
        return 0;
    }

    validateOriginalMessageBeforeSave(sourceMessage, userName) {
        const raw = this.extractOriginalMessageText(sourceMessage);
        if (!raw.trim()) {
            return {
                ok: false,
                message: '消息不能为空'
            };
        }
        if (!window.messageProcessor || typeof window.messageProcessor.previewMessage !== 'function') {
            return { ok: true };
        }

        const preview = window.messageProcessor.previewMessage(raw, {
            clientId: userName,
            allowPartial: true
        });
        if (!preview || !preview.success) {
            return {
                ok: false,
                code: preview && preview.code ? preview.code : 'PREVIEW_VALIDATION_FAILED',
                message: preview && preview.error ? preview.error : '消息校验失败'
            };
        }

        const blockingUnresolvedLines = Array.isArray(preview.result && preview.result.blockingUnresolvedLines)
            ? preview.result.blockingUnresolvedLines.filter(Boolean)
            : [];
        if (blockingUnresolvedLines.length > 0) {
            return {
                ok: false,
                code: 'BLOCKING_UNRESOLVED_LINES',
                message: `仍有 ${blockingUnresolvedLines.length} 行疑似录入条目内容未识别，已阻止保存`,
                blockingUnresolvedLines
            };
        }

        return { ok: true, preview };
    }

    buildOriginalParseSummaryFromPreview(preview, regionKey = this.activeRegion, fallbackAmount = 0) {
        const safeRegionKey = String(regionKey || this.activeRegion || 'new_ao').trim() || 'new_ao';
        if (preview && preview.success && preview.result) {
            const result = preview.result;
            const allEntries = Array.isArray(result.entries) ? result.entries.filter(Boolean) : [];
            const regionEntries = allEntries.filter((entry) => {
                const entryRegion = String(entry && entry.regionKey ? entry.regionKey : safeRegionKey).trim() || safeRegionKey;
                return entryRegion === safeRegionKey;
            });
            const baseSummary = result.summary && typeof result.summary === 'object' ? result.summary : {};
            const storedAmount = Number.isFinite(Number(fallbackAmount)) ? Number(fallbackAmount) : 0;
            const countedAmount = regionEntries.length > 0
                ? regionEntries.reduce((sum, entry) => sum + (Number(entry && entry.totalAmount) || 0), 0)
                : storedAmount;
            const countedEntryCount = regionEntries.length > 0
                ? regionEntries.length
                : ((countedAmount > 0 && allEntries.length > 0) ? allEntries.length : 0);
            return this.normalizeOriginalParseSummary({
                status: String(baseSummary.status || '').trim(),
                countedEntryCount,
                countedAmount,
                playCount: Number(baseSummary.playCount) || 0,
                blockedCount: Number(baseSummary.blockedCount) || 0,
                ignoredCount: Number(baseSummary.ignoredCount) || 0,
                unresolvedCount: Number(baseSummary.unresolvedCount) || 0,
                issues: Array.isArray(baseSummary.issues) ? baseSummary.issues.filter(Boolean) : []
            }, {
                fallbackAmount: countedAmount
            });
        }

        if (preview && !preview.success) {
            return this.normalizeOriginalParseSummary({
                status: 'blocked',
                countedEntryCount: 0,
                countedAmount: Number.isFinite(Number(fallbackAmount)) ? Number(fallbackAmount) : 0,
                playCount: 0,
                blockedCount: 1,
                ignoredCount: 0,
                issues: [{
                    kind: 'blocked',
                    lineNo: null,
                    reason: String(preview.error || '消息解析失败').trim() || '消息解析失败',
                    rawText: ''
                }]
            }, {
                fallbackAmount
            });
        }

        return null;
    }

    buildOriginalHitNumberAmountsFromPreview(preview, regionKey = this.activeRegion, userName = '') {
        const safeRegionKey = String(regionKey || this.activeRegion || 'new_ao').trim() || 'new_ao';
        if (!preview || !preview.success || !preview.result) return null;
        const previewEntries = Array.isArray(preview.result.entries) ? preview.result.entries.filter(Boolean) : [];
        if (previewEntries.length === 0) return null;

        if (window.messageProcessor && typeof window.messageProcessor.buildHitNumberAmountsForRegion === 'function') {
            return this.normalizeOriginalHitNumberAmounts(
                window.messageProcessor.buildHitNumberAmountsForRegion(previewEntries, {
                    clientId: String(userName || '').trim(),
                    regionKey: safeRegionKey
                })
            );
        }

        const hitNumberAmounts = {};
        previewEntries.forEach((entry) => {
            const entryRegion = String(entry && entry.regionKey ? entry.regionKey : safeRegionKey).trim() || safeRegionKey;
            if (entryRegion !== safeRegionKey) return;
            const amount = Number(entry && entry.amount);
            const numbers = Array.isArray(entry && entry.numbers) ? entry.numbers : [];
            if (!Number.isFinite(amount) || amount <= 0 || numbers.length === 0) return;
            numbers.forEach((number) => {
                const numericNumber = Number.parseInt(number, 10);
                if (!Number.isInteger(numericNumber) || numericNumber < 1 || numericNumber > 49) return;
                const formattedNumber = String(numericNumber).padStart(2, '0');
                hitNumberAmounts[formattedNumber] = (Number(hitNumberAmounts[formattedNumber]) || 0) + amount;
            });
        });

        return this.normalizeOriginalHitNumberAmounts(hitNumberAmounts);
    }

    getOriginalOrderTotalCached(row) {
        if (!row || typeof row !== 'object') return 0;
        const storedTotal = this.extractOriginalMessageTotal(row.originalEntry);
        if (storedTotal != null) {
            return storedTotal;
        }
        const cacheKey = this.getOriginalRowDerivedCacheKey(row);
        if (this.originalOrderTotalCache.has(cacheKey)) {
            return this.originalOrderTotalCache.get(cacheKey) || 0;
        }
        if (this.originalParseSummaryCache.has(cacheKey)) {
            const cachedSummary = this.originalParseSummaryCache.get(cacheKey);
            const cachedAmount = Number(cachedSummary && cachedSummary.countedAmount);
            if (Number.isFinite(cachedAmount) && cachedAmount >= 0) {
                this.originalOrderTotalCache.set(cacheKey, cachedAmount);
                return cachedAmount;
            }
        }

        const userName = String(row.userName || '');
        const regionKey = String(row.regionKey || this.activeRegion || '');
        const message = this.extractOriginalMessageText(row.message);
        const total = this.calculateOriginalOrderTotal(message, userName, regionKey);
        this.originalOrderTotalCache.set(cacheKey, total);
        if (this.originalOrderTotalCache.size > 8000) {
            const first = this.originalOrderTotalCache.keys().next();
            if (!first.done) {
                this.originalOrderTotalCache.delete(first.value);
            }
        }
        return total;
    }

    getOriginalParseSummaryCached(row) {
        if (!row || typeof row !== 'object') {
            return {
                status: 'empty_or_noise',
                statusLabel: '仅噪音/摘要',
                countedEntryCount: 0,
                countedAmount: 0,
                playCount: 0,
                blockedCount: 0,
                ignoredCount: 0,
                issues: [],
                focusIssues: [],
                summaryText: '仅噪音/摘要，未参与统计'
            };
        }
        const userName = String(row.userName || '').trim();
        const regionKey = String(row.regionKey || this.activeRegion || 'new_ao').trim() || 'new_ao';
        const cacheKey = this.getOriginalRowDerivedCacheKey(row);
        if (this.originalParseSummaryCache.has(cacheKey)) {
            return this.originalParseSummaryCache.get(cacheKey);
        }

        const storedTotal = this.extractOriginalMessageTotal(row.originalEntry);
        const storedSummary = this.extractOriginalMessageParseSummary(row.originalEntry);
        if (storedSummary) {
            this.originalParseSummaryCache.set(cacheKey, storedSummary);
            if (this.originalParseSummaryCache.size > 8000) {
                const first = this.originalParseSummaryCache.keys().next();
                if (!first.done) {
                    this.originalParseSummaryCache.delete(first.value);
                }
            }
            return storedSummary;
        }

        const message = this.extractOriginalMessageText(row.message);
        let summary = null;
        if (window.messageProcessor && typeof window.messageProcessor.previewMessage === 'function') {
            const preview = window.messageProcessor.previewMessage(message, {
                clientId: userName,
                allowPartial: true
            });
            summary = this.buildOriginalParseSummaryFromPreview(preview, regionKey, storedTotal);
        }

        if (!summary) {
            const fallbackAmount = Number.isFinite(Number(storedTotal)) ? Number(storedTotal) : 0;
            summary = this.normalizeOriginalParseSummary({
                status: fallbackAmount > 0 ? 'partial' : 'empty_or_noise',
                countedEntryCount: fallbackAmount > 0 ? 1 : 0,
                countedAmount: fallbackAmount,
                playCount: 0,
                blockedCount: 0,
                ignoredCount: 0,
                unresolvedCount: 0,
                issues: []
            }, {
                fallbackAmount
            });
        }

        this.originalParseSummaryCache.set(cacheKey, summary);
        if (this.originalParseSummaryCache.size > 8000) {
            const first = this.originalParseSummaryCache.keys().next();
            if (!first.done) {
                this.originalParseSummaryCache.delete(first.value);
            }
        }
        return summary;
    }

    getCurrentWinningNumberForRegion(regionKey = '') {
        if (typeof window === 'undefined' || typeof window.getRegionWinningNumber !== 'function') {
            return '';
        }
        return String(window.getRegionWinningNumber(regionKey) || '').trim();
    }

    getOriginalRowHitAmount(row) {
        if (!row || typeof row !== 'object') return 0;
        const winningNumber = this.getCurrentWinningNumberForRegion(row.regionKey);
        if (!winningNumber) return 0;
        const cacheKey = `${this.getOriginalRowDerivedCacheKey(row)}|hit|${winningNumber}`;
        if (this.originalRowHitCache.has(cacheKey)) {
            return this.originalRowHitCache.get(cacheKey) || 0;
        }

        const raw = this.extractOriginalMessageText(row.message);
        const userName = String(row.userName || '').trim();
        const targetRegion = String(row.regionKey || this.activeRegion || 'new_ao').trim() || 'new_ao';
        let hitAmount = 0;
        const storedHitNumberAmounts = this.extractOriginalMessageHitNumberAmounts(row.originalEntry);

        if (storedHitNumberAmounts) {
            hitAmount = Number(storedHitNumberAmounts[winningNumber]) || 0;
        } else if (raw && window.messageProcessor && typeof window.messageProcessor.parseMessage === 'function') {
            try {
                const parsed = window.messageProcessor.parseMessage(raw, {
                    clientId: userName,
                    allowPartial: true
                });
                const preview = {
                    success: true,
                    result: {
                        entries: Array.isArray(parsed && parsed.entries) ? parsed.entries : []
                    }
                };
                const hitNumberAmounts = this.buildOriginalHitNumberAmountsFromPreview(preview, targetRegion, userName);
                if (hitNumberAmounts) {
                    hitAmount = Number(hitNumberAmounts[winningNumber]) || 0;
                    if (row.originalEntry && typeof row.originalEntry === 'object') {
                        row.originalEntry.hitNumberAmounts = hitNumberAmounts;
                    }
                }
            } catch (error) {
                hitAmount = 0;
            }
        }

        this.originalRowHitCache.set(cacheKey, hitAmount);
        if (this.originalRowHitCache.size > 8000) {
            const first = this.originalRowHitCache.keys().next();
            if (!first.done) {
                this.originalRowHitCache.delete(first.value);
            }
        }
        return hitAmount;
    }

    buildOriginalParseSummaryText(summary) {
        const safeSummary = summary && typeof summary === 'object' ? summary : {};
        const countedEntryCount = Number(safeSummary.countedEntryCount) || 0;
        const countedAmount = Number(safeSummary.countedAmount) || 0;
        const playCount = Number(safeSummary.playCount) || 0;
        const blockedCount = Number(safeSummary.blockedCount) || 0;
        const ignoredCount = Number(safeSummary.ignoredCount) || 0;

        if (countedEntryCount <= 0 && playCount <= 0 && blockedCount <= 0 && ignoredCount <= 0) {
            return '仅噪音/摘要，未参与统计';
        }

        const parts = [];
        if (countedEntryCount > 0 || countedAmount > 0) {
            parts.push(`已计入 ${countedEntryCount} 条 / ${this.formatAmountValue(countedAmount)}`);
        }
        if (playCount > 0) {
            parts.push(`未统计 ${playCount} 条玩法`);
        }
        if (blockedCount > 0) {
            parts.push(`待处理 ${blockedCount} 行`);
        }
        if (ignoredCount > 0) {
            parts.push(`已忽略 ${ignoredCount} 行`);
        }
        return parts.join('，');
    }

    formatOriginalParseIssue(issue) {
        const kind = String(issue && issue.kind ? issue.kind : 'ignored').trim();
        const lineNo = Number.isFinite(Number(issue && issue.lineNo)) ? Number(issue.lineNo) : null;
        const reason = String(issue && issue.reason ? issue.reason : '格式无法识别').trim() || '格式无法识别';
        const rawText = String(issue && issue.rawText ? issue.rawText : '').replace(/\s+/g, ' ').trim();
        const prefixMap = {
            blocked: '待处理',
            play: '未统计',
            ignored: '已忽略'
        };
        const locationText = lineNo ? `第${lineNo}行` : '未定位';
        const snippet = rawText && rawText !== reason
            ? `：${rawText.length > 28 ? `${rawText.slice(0, 28)}...` : rawText}`
            : '';
        return `${prefixMap[kind] || '已忽略'} ${locationText} ${reason}${snippet}`;
    }

    hasOriginalDataAt(regionData, index) {
        return !!(regionData
            && Array.isArray(regionData.originalData)
            && Number.isInteger(index)
            && index >= 0
            && index < regionData.originalData.length);
    }

    normalizeUserRecord(userRecord, userName = '') {
        const normalizeOriginalDataArray = (rawList) => {
            if (!Array.isArray(rawList)) return [];
            return rawList.map((item) => {
                const message = this.extractOriginalMessageText(item);
                const createdAt = this.extractOriginalMessageCreatedAt(item);
                const editedAt = this.extractOriginalMessageEditedAt(item);
                if (item && typeof item === 'object') {
                    const totalAmount = this.extractOriginalMessageTotal(item);
                    const hitNumberAmounts = this.extractOriginalMessageHitNumberAmounts(item);
                    return this.buildStoredOriginalDataEntry(message, totalAmount, createdAt, editedAt, item.parseSummary, hitNumberAmounts);
                }
                return message;
            });
        };

        const normalizeRegionPayload = (sourceRegion) => {
            const source = sourceRegion && typeof sourceRegion === 'object' ? sourceRegion : {};
            const normalizedData = this.normalizeNumberDataSeries(Array.isArray(source.data) ? source.data : []);
            const normalizedPayoutData = this.normalizeNumberDataSeries(
                Array.isArray(source.payoutData) ? source.payoutData : [],
                this.createPayoutDataFromStakeData(normalizedData, this.getDefaultPayoutOdds())
            );
            const totalCount = normalizedData.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
            return {
                data: normalizedData,
                payoutData: normalizedPayoutData,
                originalData: normalizeOriginalDataArray(source.originalData),
                totalCount
            };
        };

        const fallbackSettlement = this.getDefaultUserSettlementConfig(userName);
        const resolveSettlementOdds = (source) => this.normalizeSettlementOddsValue(
            source && typeof source === 'object'
                ? (Object.prototype.hasOwnProperty.call(source, 'settlementOdds')
                    ? source.settlementOdds
                    : (Object.prototype.hasOwnProperty.call(source, 'odds')
                        ? source.odds
                        : source.defaultOdds))
                : undefined,
            fallbackSettlement.odds
        );
        const resolveRebateRate = (source) => this.normalizeRebateRateValue(
            source && typeof source === 'object'
                ? (Object.prototype.hasOwnProperty.call(source, 'rebateRate')
                    ? source.rebateRate
                    : (Object.prototype.hasOwnProperty.call(source, 'rebate')
                        ? source.rebate
                        : source.rebatePercent))
                : undefined,
            fallbackSettlement.rebateRate
        );

        if (!userRecord || typeof userRecord !== 'object') {
            return this.createDefaultUserRecord(userName);
        }

        if (!userRecord.regions) {
            const legacyRegion = normalizeRegionPayload({
                data: Array.isArray(userRecord.data) ? userRecord.data : this.generateData(),
                payoutData: Array.isArray(userRecord.payoutData) ? userRecord.payoutData : [],
                originalData: Array.isArray(userRecord.originalData) ? userRecord.originalData : [],
                totalCount: Number(userRecord.totalCount) || 0
            });
            const normalizedLegacy = {
                settlementOdds: resolveSettlementOdds(userRecord),
                rebateRate: resolveRebateRate(userRecord),
                regions: {
                    new_ao: legacyRegion,
                    old_ao: this.createEmptyRegionData(),
                    hongkong: this.createEmptyRegionData()
                }
            };
            if (Object.prototype.hasOwnProperty.call(userRecord, 'tailShorthandAsSeparateGroups')) {
                normalizedLegacy.tailShorthandAsSeparateGroups = userRecord.tailShorthandAsSeparateGroups === true;
            }
            return normalizedLegacy;
        }

        const normalized = {
            settlementOdds: resolveSettlementOdds(userRecord),
            rebateRate: resolveRebateRate(userRecord),
            regions: {}
        };
        if (Object.prototype.hasOwnProperty.call(userRecord, 'tailShorthandAsSeparateGroups')) {
            normalized.tailShorthandAsSeparateGroups = userRecord.tailShorthandAsSeparateGroups === true;
        }
        this.getRegionOptions().forEach(region => {
            const source = userRecord.regions[region.key];
            normalized.regions[region.key] = normalizeRegionPayload(source || {});
        });
        return normalized;
    }

    getUserRegionData(userName, regionKey = this.activeRegion) {
        const user = this.users[userName];
        if (!user || !user.regions || !user.regions[regionKey]) return null;
        return user.regions[regionKey];
    }

    getLatestOriginalMessageRow(userName = '', regionKey = this.activeRegion) {
        const targetUser = String(userName || '').trim() || this.resolveActionUserName();
        const targetRegion = String(regionKey || this.activeRegion || 'new_ao').trim() || 'new_ao';
        if (!targetUser) return null;
        const regionData = this.getUserRegionData(targetUser, targetRegion);
        if (!regionData || !Array.isArray(regionData.originalData) || regionData.originalData.length <= 0) {
            return null;
        }
        const index = regionData.originalData.length - 1;
        const originalEntry = regionData.originalData[index];
        return {
            index,
            userName: targetUser,
            regionKey: targetRegion,
            regionLabel: this.getRegionLabel(targetRegion),
            message: this.extractOriginalMessageText(originalEntry),
            createdAt: this.extractOriginalMessageCreatedAt(originalEntry),
            editedAt: this.extractOriginalMessageEditedAt(originalEntry),
            originalEntry
        };
    }

    getUserTotalInRegion(userName, regionKey = this.activeRegion) {
        const regionData = this.getUserRegionData(userName, regionKey);
        return regionData ? (regionData.totalCount || 0) : 0;
    }

    getUserTotalInViewRegions(userName) {
        return this.getViewRegions().reduce((sum, regionKey) => {
            return sum + this.getUserTotalInRegion(userName, regionKey);
        }, 0);
    }

    getZodiacOrder() {
        return ['牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪', '鼠'];
    }

    getZodiacAnimalMap() {
        return {
            '鼠': [7, 19, 31, 43],
            '牛': [6, 18, 30, 42],
            '虎': [5, 17, 29, 41],
            '兔': [4, 16, 28, 40],
            '龙': [3, 15, 27, 39],
            '蛇': [2, 14, 26, 38],
            '马': [1, 13, 25, 37, 49],
            '羊': [12, 24, 36, 48],
            '猴': [11, 23, 35, 47],
            '鸡': [10, 22, 34, 46],
            '狗': [9, 21, 33, 45],
            '猪': [8, 20, 32, 44]
        };
    }

    getAnimalWave(animal) {
        if (['鼠', '兔', '鸡'].includes(animal)) return 'red';
        if (['牛', '龙', '羊', '狗'].includes(animal)) return 'blue';
        return 'green';
    }

    getNumberWave(number) {
        const red = new Set(['01', '02', '07', '08', '12', '13', '18', '19', '23', '24', '29', '30', '34', '35', '40', '45', '46']);
        const blue = new Set(['03', '04', '09', '10', '14', '15', '20', '25', '26', '31', '36', '37', '41', '42', '47', '48']);
        return red.has(number) ? 'red' : blue.has(number) ? 'blue' : 'green';
    }

    formatNumber(num) {
        const n = parseInt(num, 10);
        return n < 10 ? `0${n}` : `${n}`;
    }

    buildZodiacColumns(sourceData = []) {
        const sourceMap = new Map((sourceData || []).map(item => [item.number, item.value || 0]));
        const animalMap = this.getZodiacAnimalMap();

        return this.getZodiacOrder().map(animal => {
            const numbers = animalMap[animal].map(num => {
                const number = this.formatNumber(num);
                return {
                    number,
                    value: sourceMap.get(number) || 0,
                    wave: this.getNumberWave(number)
                };
            });
            const totalValue = numbers.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

            return {
                animal,
                numbers,
                totalValue,
                totalText: this.formatAmountValue(totalValue),
                wave: this.getAnimalWave(animal)
            };
        });
    }

    renderZodiacBoard(section, sourceData = []) {
        const board = document.createElement('div');
        board.classList.add('zodiac-board', 'zodiac-board-vertical');
        const maxValue = (sourceData || []).reduce((max, item) => {
            const v = Number(item.value) || 0;
            return v > max ? v : max;
        }, 0);
        const columns = this.buildZodiacColumns(sourceData);
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const rowsContainer = document.createElement('div');
        rowsContainer.classList.add('zodiac-rows');

        columns.forEach(column => {
            const row = document.createElement('div');
            row.classList.add('zodiac-row');

            const animalCell = document.createElement('div');
            animalCell.classList.add('zodiac-row-animal');
            animalCell.classList.add(`wave-${column.wave}`);
            animalCell.innerHTML = `
                <span class="number-stack-layout zodiac-stack-layout">
                    <span class="number-stack-top number-stack-chip zodiac-stack-top">${column.animal}</span>
                    <span class="number-stack-bottom zodiac-stack-bottom">${column.totalText}</span>
                </span>
            `;
            this.fitValueText(animalCell);
            row.appendChild(animalCell);

            const numbersContainer = document.createElement('div');
            numbersContainer.classList.add('zodiac-row-numbers');

            column.numbers.forEach(item => {
                const card = document.createElement('div');
                card.classList.add('number-card');
                card.classList.add(`wave-${item.wave}`);
                const value = Number(item.value) || 0;
                if (value > 0) {
                    const scale = maxValue > 0 ? (1 + 0.55 * (value / maxValue)) : 1;
                    const size = clamp(Math.round(40 * Math.min(1.45, scale)), 40, 58);
                    const valueFontSize = clamp(Math.round(size * 0.28), 10, 18);
                    const numberFontSize = clamp(Math.round(valueFontSize * 0.95), 9, valueFontSize);
                    card.style.setProperty('--card-size', `${size}px`);
                    card.style.setProperty('--card-number-font-size', `${numberFontSize}px`);
                    card.style.setProperty('--card-value-font-size', `${valueFontSize}px`);
                    card.classList.add('has-value');
                    card.innerHTML = `
                        <span class="number-stack-layout">
                            <span class="number-stack-top number-stack-chip">${item.number}</span>
                            <span class="number-stack-bottom">${value}</span>
                        </span>
                    `;
                    this.fitValueText(card);
                } else {
                    card.classList.add('no-value');
                    card.style.setProperty('--card-size', '40px');
                    card.style.setProperty('--card-font-size', '16px');
                    card.textContent = item.number;
                }
                numbersContainer.appendChild(card);
            });

            row.appendChild(numbersContainer);
            rowsContainer.appendChild(row);
        });

        board.appendChild(rowsContainer);
        section.appendChild(board);
    }

    fitValueText(card) {
        const valueEl = card.querySelector('.number-stack-bottom');
        if (!valueEl) return;

        const adjust = () => {
            let current = parseFloat(getComputedStyle(valueEl).fontSize);
            if (!Number.isFinite(current) || current <= 0) return;
            // 使用真实布局测量，确保文本完整显示
            while (valueEl.scrollWidth > valueEl.clientWidth && current > 8) {
                current -= 0.5;
                valueEl.style.fontSize = `${current}px`;
            }
        };

        requestAnimationFrame(adjust);
    }

    // 初始化用户数据
    init(initialUsers = {}) {
        this.invalidateOriginalDataDerivedCaches();
        this.invalidateUserListDerivedCaches();
        this.users = {};
        this.expandedSettlementUser = '';
        this.scopeMode = 'single';
        this.userSearchKeyword = '';
        this.activeRegion = 'new_ao';
        this.viewRegions = new Set(['new_ao']);
        Object.entries(initialUsers || {}).forEach(([userName, userRecord]) => {
            this.users[userName] = this.normalizeUserRecord(userRecord, userName);
        });
        if (typeof window !== 'undefined' && window.__attributeConfigReady === true) {
            this.syncStoredUserParsePreferencesToRules();
        }
        this.applyScopeModeFlags();
        this.renderUserList();
        this.switchToFirstUser();
    }

    // 切换到第一个用户
    switchToFirstUser() {
        const sortedUsers = this.getSortedUsers();
        if (sortedUsers.length > 0) {
            this.setScopeMode('single', {
                userName: sortedUsers[0]
            });
        }
    }

    // 获取排序后的用户列表
    getSortedUsers() {
        const cacheKey = `${this.getUserListDerivedBaseKey()}|sort:${this.getUserListSortMode()}`;
        if (this.sortedUsersCache.key === cacheKey) {
            return this.sortedUsersCache.users.slice();
        }

        const users = Object.keys(this.users).map((userName, index) => ({
            userName,
            serialNo: index + 1,
            totalInView: this.getUserTotalInViewRegions(userName)
        }));
        const mode = this.getUserListSortMode();
        users.sort((left, right) => {
            if (mode === 'serial_asc') {
                return left.serialNo - right.serialNo;
            }
            if (mode === 'serial_desc') {
                return right.serialNo - left.serialNo;
            }

            if (left.totalInView !== right.totalInView) {
                return mode === 'amount_asc'
                    ? (left.totalInView - right.totalInView)
                    : (right.totalInView - left.totalInView);
            }
            if (left.serialNo !== right.serialNo) {
                return left.serialNo - right.serialNo;
            }
            return String(left.userName || '').localeCompare(String(right.userName || ''), 'zh-Hans-CN');
        });

        const sortedUsers = users.map((item) => item.userName);
        this.sortedUsersCache = {
            key: cacheKey,
            users: sortedUsers
        };
        return sortedUsers.slice();
    }

    normalizeScopeMode(modeRaw) {
        const mode = String(modeRaw || '').trim();
        if (mode === 'all') return 'all';
        if (mode === 'multi') return 'multi';
        return 'single';
    }

    normalizeNumberViewMode(modeRaw) {
        return String(modeRaw || '').trim() === 'overview' ? 'overview' : 'sorted';
    }

    getNumberViewMode() {
        this.numberViewMode = this.normalizeNumberViewMode(this.numberViewMode);
        return this.numberViewMode;
    }

    normalizeNumberRankingSortKey(sortKeyRaw) {
        const sortKey = String(sortKeyRaw || '').trim().toLowerCase();
        if (sortKey === 'number' || sortKey === 'value' || sortKey === 'sequence' || sortKey === 'pnl') {
            return sortKey;
        }
        return 'pnl';
    }

    getNumberRankingSortKey() {
        this.numberRankingSortKey = this.normalizeNumberRankingSortKey(this.numberRankingSortKey);
        return this.numberRankingSortKey;
    }

    setNumberRankingSortKey(sortKeyRaw) {
        const nextKey = this.normalizeNumberRankingSortKey(sortKeyRaw);
        if (nextKey === this.getNumberRankingSortKey()) return;
        this.numberRankingSortKey = nextKey;
        this.renderSortedResults();
    }

    setNumberViewMode(modeRaw) {
        const nextMode = this.normalizeNumberViewMode(modeRaw);
        if (nextMode === this.getNumberViewMode()) return;
        this.numberViewMode = nextMode;
        this.updateCurrentUserDisplay();
    }

    applyScopeModeFlags() {
        this.scopeMode = this.normalizeScopeMode(this.scopeMode);
        this.isSummaryMode = this.scopeMode === 'all';
        this.isMultiSelectEnabled = this.scopeMode !== 'single';
    }

    getScopeMode() {
        this.applyScopeModeFlags();
        return this.scopeMode;
    }

    getScopeUsers() {
        return this.getScopeMode() === 'all'
            ? this.getSortedUsers()
            : this.getSelectedUsers();
    }

    getScopeSummary() {
        const mode = this.getScopeMode();
        const users = this.getScopeUsers();
        const count = users.length;
        const joined = users.join('，');

        if (mode === 'all') {
            return {
                mode,
                users,
                count,
                titleLabel: '全部客户',
                statusText: count > 0 ? `当前：全部客户，已选中 ${count} 人` : '当前：全部客户',
                panelLabel: count > 0 ? `全部客户（${count}人）` : '全部客户'
            };
        }

        if (count <= 0) {
            return {
                mode,
                users,
                count: 0,
                titleLabel: '未选择客户',
                statusText: mode === 'multi' ? '当前：多人模式，尚未选择客户' : '当前：单人模式，尚未选择客户',
                panelLabel: '未选择客户'
            };
        }

        if (count === 1) {
            return {
                mode,
                users,
                count,
                titleLabel: users[0],
                statusText: mode === 'multi'
                    ? `当前：多人模式，已选 1 人（${users[0]}）`
                    : `当前：${users[0]}`,
                panelLabel: users[0]
            };
        }

        return {
            mode,
            users,
            count,
            titleLabel: count <= 3 ? joined : `已选${count}人`,
            statusText: count <= 3 ? `当前：已选 ${count} 人（${joined}）` : `当前：已选 ${count} 人`,
            panelLabel: count <= 3 ? joined : `已选${count}人`
        };
    }

    isUserInCurrentScope(userName = '') {
        const targetUser = String(userName || '').trim();
        if (!targetUser) return false;
        return this.getScopeUsers().includes(targetUser);
    }

    isRecognizeModalOpen() {
        if (typeof document === 'undefined') return false;
        const recognizeModal = document.getElementById('myModal');
        return !!(recognizeModal && recognizeModal.style.display === 'block');
    }

    shouldRefreshOptionalPanel(optionValue, autoCondition = false) {
        return optionValue === true || (optionValue !== false && autoCondition);
    }

    buildEmptySelectedScopeSnapshot(users = []) {
        const baseData = this.generateData();
        return {
            users: Array.isArray(users) ? users.slice() : [],
            data: baseData,
            payoutData: this.createPayoutDataFromStakeData(baseData, this.getDefaultPayoutOdds()),
            totalCount: 0
        };
    }

    getSelectedScopeSnapshotKey() {
        return [
            this.selectedScopeSnapshotVersion,
            this.getScopeMode(),
            this.getViewRegions().join(','),
            this.getScopeUsers().join(',')
        ].join('|');
    }

    getSelectedScopeSnapshot() {
        const cacheKey = this.getSelectedScopeSnapshotKey();
        if (this.selectedScopeSnapshotCache.key === cacheKey && this.selectedScopeSnapshotCache.data) {
            return this.selectedScopeSnapshotCache.data;
        }

        const scopeUsers = this.getScopeUsers();
        if (scopeUsers.length === 0) {
            const emptySnapshot = this.buildEmptySelectedScopeSnapshot([]);
            this.selectedScopeSnapshotCache = {
                key: cacheKey,
                data: emptySnapshot
            };
            return emptySnapshot;
        }

        const baseData = this.generateData();
        const mergedMap = new Map(baseData.map(item => [item.number, { ...item, value: 0 }]));
        const mergedPayoutMap = new Map(baseData.map(item => [item.number, { ...item, value: 0 }]));
        let totalCount = 0;
        const viewRegions = this.getViewRegions();

        scopeUsers.forEach((userName) => {
            viewRegions.forEach((regionKey) => {
                const regionData = this.getUserRegionData(userName, regionKey);
                if (!regionData) return;
                this.ensureRegionPayoutData(regionData);
                totalCount += Number(regionData.totalCount) || 0;
                regionData.data.forEach((item) => {
                    const merged = mergedMap.get(item.number);
                    if (merged) {
                        merged.value += item.value || 0;
                    }
                });
                (regionData.payoutData || []).forEach((item) => {
                    const merged = mergedPayoutMap.get(item.number);
                    if (merged) {
                        merged.value += item.value || 0;
                    }
                });
            });
        });

        const snapshot = {
            users: scopeUsers.slice(),
            data: Array.from(mergedMap.values()),
            payoutData: Array.from(mergedPayoutMap.values()),
            totalCount
        };
        this.selectedScopeSnapshotCache = {
            key: cacheKey,
            data: snapshot
        };
        return snapshot;
    }

    renderScopeModeControls() {
        const mode = this.getScopeMode();
        const summary = this.getScopeSummary();
        const buttonMap = {
            single: document.getElementById('scopeModeSingleBtn'),
            multi: document.getElementById('scopeModeMultiBtn'),
            all: document.getElementById('scopeModeAllBtn')
        };
        Object.entries(buttonMap).forEach(([key, button]) => {
            if (!button) return;
            const active = key === mode;
            button.classList.toggle('is-active', active);
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        const summaryElement = document.getElementById('scopeModeSummary');
        if (summaryElement) {
            summaryElement.textContent = summary.statusText;
        }
    }

    getSelectedUsers() {
        const selected = this.getSortedUsers().filter(user => this.selectedUsers.has(user));
        return selected;
    }

    getSelectedUserData(options = {}) {
        const snapshot = this.getSelectedScopeSnapshot();
        const includeOriginalData = !options || options.includeOriginalData !== false;
        return {
            users: snapshot.users,
            data: snapshot.data,
            payoutData: snapshot.payoutData,
            totalCount: snapshot.totalCount,
            originalData: includeOriginalData ? this.collectSelectedOriginalRows() : []
        };
    }

    setSelectedUsers(userNames = [], options = {}) {
        const validUsers = new Set((Array.isArray(userNames) ? userNames : []).filter(name => this.users[name]));
        const orderedUsers = this.getSortedUsers().filter(name => validUsers.has(name));
        this.selectedUsers = new Set(orderedUsers);
        if (orderedUsers.length > 0) {
            if (!this.lastActiveUser || !this.selectedUsers.has(this.lastActiveUser)) {
                this.lastActiveUser = orderedUsers[0];
            }
        } else if (this.lastActiveUser && !this.users[this.lastActiveUser]) {
            this.lastActiveUser = null;
        }
        if (options && options.syncScope !== false) {
            if (this.getScopeMode() === 'all') {
                const allUsers = this.getSortedUsers();
                const isAllSelected = allUsers.length > 0 && orderedUsers.length === allUsers.length;
                if (!isAllSelected) {
                    this.scopeMode = orderedUsers.length > 1 ? 'multi' : 'single';
                }
            }
            this.applyScopeModeFlags();
        }
    }

    // 切换用户（多选）
    switchUser(userName) {
        if (!this.users[userName]) return;
        const scopeMode = this.getScopeMode();
        const sortedUsers = this.getSortedUsers();

        if (scopeMode === 'single') {
            this.lastActiveUser = userName;
            this.setSelectedUsers([userName], { syncScope: false });
        } else if (scopeMode === 'all') {
            if (sortedUsers.length <= 1) {
                this.scopeMode = 'single';
                this.setSelectedUsers([userName], { syncScope: false });
                this.lastActiveUser = userName;
            } else {
                const remainingUsers = sortedUsers.filter(name => name !== userName);
                this.scopeMode = remainingUsers.length > 1 ? 'multi' : 'single';
                this.setSelectedUsers(remainingUsers, { syncScope: false });
                this.lastActiveUser = remainingUsers.includes(this.lastActiveUser) ? this.lastActiveUser : (remainingUsers[0] || null);
            }
        } else {
            if (this.selectedUsers.has(userName)) {
                if (this.selectedUsers.size > 1) {
                    this.selectedUsers.delete(userName);
                }
            } else {
                this.selectedUsers.add(userName);
            }
            this.lastActiveUser = userName;
        }

        this.applyScopeModeFlags();
        this.renderAllSections({
            refreshViewRegionBar: false
        });

        console.log('切换用户选择:', this.getScopeUsers().join(','));
    }

    // 更新当前用户显示
    updateCurrentUserDisplay() {
        const titleElement = document.getElementById('numberPanelTitle');
        const sortedView = document.getElementById('numberSortedView');
        const overviewView = document.getElementById('numberOverviewView');
        const sortedBtn = document.getElementById('numberViewSortedBtn');
        const overviewBtn = document.getElementById('numberViewOverviewBtn');
        const mode = this.getNumberViewMode();
        const summary = this.getScopeSummary();
        const regionLabel = this.getViewRegionLabels().join('、');
        const scopeSnapshot = this.getSelectedScopeSnapshot();
        const total = scopeSnapshot.totalCount || 0;
        if (titleElement) {
            if (mode === 'overview') {
                titleElement.textContent = `生肖总览（${regionLabel}）：${summary.panelLabel}`;
            } else if (summary.count > 0) {
                titleElement.textContent = `${summary.titleLabel} 号码累计排行（${regionLabel}） (总: ${total})`;
            } else {
                titleElement.textContent = `当前范围暂无累计数据（${regionLabel}）`;
            }
        }
        if (sortedView) sortedView.hidden = mode !== 'sorted';
        if (overviewView) overviewView.hidden = mode !== 'overview';
        if (sortedBtn) {
            const active = mode === 'sorted';
            sortedBtn.classList.toggle('active', active);
            sortedBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
        if (overviewBtn) {
            const active = mode === 'overview';
            overviewBtn.classList.toggle('active', active);
            overviewBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
        this.renderScopeModeControls();
        this.scheduleNumberRankingAutoFit();
    }

    // 更新标题
    updateTitles(count = 0) {
        const originalDataTitle = document.getElementById('originalDataTitle');
        const regionLabel = this.getViewRegionLabels().join('、');
        const scopeSummary = this.getScopeSummary();
        if (scopeSummary.count > 0) {
            originalDataTitle.textContent = `${scopeSummary.titleLabel} 原始消息（${regionLabel}）`;
        } else {
            originalDataTitle.textContent = `当前范围暂无原始消息（${regionLabel}）`;
        }
    }

    // 渲染所有区域
    renderAllSections(options = {}) {
        const config = {
            refreshCurrentUserDisplay: true,
            refreshTitles: true,
            refreshSection: true,
            refreshSortedResults: true,
            refreshOriginalData: true,
            refreshUserList: true,
            refreshViewRegionBar: true,
            refreshRegionPnlPanel: true,
            refreshDashboardStatus: true,
            refreshRecognizePreviousMessagePreview: 'auto',
            refreshRecognizePanels: 'auto',
            ...options
        };

        if (config.refreshCurrentUserDisplay) {
            this.updateCurrentUserDisplay();
        }
        if (config.refreshTitles) {
            this.updateTitles();
        }
        if (config.refreshSection) {
            this.renderSection('section1');
        }
        if (config.refreshSortedResults) {
            this.renderSortedResults();
        }
        if (config.refreshOriginalData) {
            this.renderOriginalData();
        }
        if (config.refreshUserList) {
            this.renderUserList();
        }
        if (config.refreshViewRegionBar && typeof window.refreshViewRegionBar === 'function') {
            window.refreshViewRegionBar();
        }
        if (config.refreshRegionPnlPanel && typeof window.refreshRegionPnlPanel === 'function') {
            window.refreshRegionPnlPanel();
        }
        if (config.refreshDashboardStatus && typeof window.refreshDashboardStatus === 'function') {
            window.refreshDashboardStatus();
        }
        const recognizeModalOpen = this.isRecognizeModalOpen();
        if (this.shouldRefreshOptionalPanel(config.refreshRecognizePreviousMessagePreview, recognizeModalOpen)
            && typeof window.refreshRecognizePreviousMessagePreview === 'function'
        ) {
            window.refreshRecognizePreviousMessagePreview();
        }
        const shouldRefreshRecognizePanels = this.shouldRefreshOptionalPanel(config.refreshRecognizePanels, recognizeModalOpen);
        if (shouldRefreshRecognizePanels) {
            if (typeof window.handleAnchorRuleScopeChange === 'function') {
                window.handleAnchorRuleScopeChange();
            } else {
                if (typeof window.renderAnchorAliasList === 'function') {
                    window.renderAnchorAliasList();
                }
                if (typeof window.renderAnchorParseModeState === 'function') {
                    window.renderAnchorParseModeState();
                }
                if (typeof window.renderAttributeCombinePolicyState === 'function') {
                    window.renderAttributeCombinePolicyState();
                }
            }
        }
    }

    // 添加用户
    addUser(userName) {
        if (!userName || !userName.trim()) {
            throw new Error('请输入有效的用户名');
        }

        if (this.users[userName]) {
            throw new Error('该用户名已存在');
        }

        this.users[userName] = this.createDefaultUserRecord(userName);
        this.invalidateUserListDerivedCaches();
        this.lastActiveUser = userName;
        this.setScopeMode('single', {
            userName,
            render: false
        });
        this.renderAllSections({
            refreshViewRegionBar: false
        });
        this.saveUserData();
        
        console.log('添加用户:', userName);
        return true;
    }

    // 删除用户
    deleteUser(userName) {
        if (!confirm(`确定要删除用户 ${userName} 及其所有数据吗？`)) {
            return false;
        }

        const affectsCurrentScope = this.isUserInCurrentScope(userName);
        delete this.users[userName];
        this.invalidateUserListDerivedCaches();
        if (this.expandedSettlementUser === userName) {
            this.expandedSettlementUser = '';
        }
        if (window.messageProcessor && typeof window.messageProcessor.resetClientRules === 'function') {
            try {
                window.messageProcessor.resetClientRules(userName);
            } catch (error) {
                console.warn(`删除客户规则失败(${userName}):`, error);
            }
        }
        const remainingUsers = Object.keys(this.users);
        this.selectedUsers.delete(userName);
        if (this.lastActiveUser === userName) {
            this.lastActiveUser = null;
        }

        if (remainingUsers.length > 0) {
            if (this.getSelectedUsers().length === 0) {
                const sortedUsers = remainingUsers.sort((a, b) => 
                    this.getUserTotalInRegion(b) - this.getUserTotalInRegion(a)
                );
                this.scopeMode = 'single';
                this.setSelectedUsers([sortedUsers[0]], { syncScope: false });
                this.lastActiveUser = sortedUsers[0];
            }
        } else {
            this.selectedUsers.clear();
            this.lastActiveUser = null;
            this.scopeMode = 'single';
            this.clearSections();
        }

        this.applyScopeModeFlags();

        if (affectsCurrentScope || remainingUsers.length === 0) {
            this.renderAllSections();
        } else {
            this.renderAllSections({
                refreshCurrentUserDisplay: false,
                refreshTitles: false,
                refreshSection: false,
                refreshSortedResults: false,
                refreshOriginalData: false,
                refreshRegionPnlPanel: false,
                refreshDashboardStatus: false,
                refreshRecognizePreviousMessagePreview: false,
                refreshRecognizePanels: false
            });
        }
        this.saveUserData();
        
        console.log('删除用户:', userName);
        return true;
    }

    resolveActionUserName() {
        if (this.lastActiveUser && this.users[this.lastActiveUser]) {
            return this.lastActiveUser;
        }
        const selected = this.getSelectedUsers();
        if (selected.length > 0) {
            return selected[0];
        }
        const sorted = this.getSortedUsers();
        return sorted.length > 0 ? sorted[0] : '';
    }

    clearUserBetData(userName = '') {
        const targetUser = String(userName || '').trim() || this.resolveActionUserName();
        if (!targetUser || !this.users[targetUser]) {
            throw new Error('请先选择客户');
        }
        const affectsCurrentScope = this.isUserInCurrentScope(targetUser);
        const ok = confirm(`确定清空客户 ${targetUser} 的录入条目数据吗？\n仅清空号码统计与原始消息，不会删除该客户的结算设置和解析偏好。`);
        if (!ok) {
            return { cleared: false, userName: targetUser };
        }

        const userRecord = this.users[targetUser];
        if (!userRecord || typeof userRecord !== 'object') {
            throw new Error('客户数据不存在');
        }
        if (!userRecord.regions || typeof userRecord.regions !== 'object') {
            userRecord.regions = {};
        }
        this.getRegionOptions().forEach(region => {
            userRecord.regions[region.key] = this.createEmptyRegionData();
        });

        this.invalidateOriginalDataDerivedCaches();
        this.invalidateUserListDerivedCaches();
        if (affectsCurrentScope) {
            this.renderAllSections();
        } else {
            this.renderAllSections({
                refreshCurrentUserDisplay: false,
                refreshTitles: false,
                refreshSection: false,
                refreshSortedResults: false,
                refreshOriginalData: false,
                refreshRegionPnlPanel: false,
                refreshDashboardStatus: false,
                refreshRecognizePreviousMessagePreview: false,
                refreshRecognizePanels: false
            });
        }
        this.saveUserData();
        console.log('已清空录入条目数据:', targetUser);
        return { cleared: true, userName: targetUser };
    }

    // 清空当前客户数据（仅消息与统计，不删除客户规则偏好）
    clearCurrentUserData() {
        const userName = this.resolveActionUserName();
        return this.clearUserBetData(userName);
    }

    setUserSearchKeyword(keyword = '') {
        const next = String(keyword == null ? '' : keyword);
        if (next === this.userSearchKeyword) return;
        this.userSearchKeyword = next;
        this.scheduleUserListRender();
    }

    // 清空区域
    clearSections() {
        const section = document.getElementById('section1');
        if (section) {
            section.innerHTML = '';
        }
    }

    getFilteredUserNames(keyword = this.userSearchKeyword) {
        const needle = String(keyword || '').trim().toLocaleLowerCase();
        const sortedUsers = this.getSortedUsers();
        if (!needle) return sortedUsers;
        return sortedUsers.filter((userName) => String(userName || '').toLocaleLowerCase().includes(needle));
    }

    getUserListSummary(userName = '') {
        const cacheKey = `${this.getUserListDerivedBaseKey()}|${String(userName || '').trim()}`;
        if (this.userListSummaryCache.has(cacheKey)) {
            return this.userListSummaryCache.get(cacheKey);
        }

        const totalInView = this.getUserTotalInViewRegions(userName) || 0;
        const regionStates = this.getRegionOptions().map((region) => ({
            key: region.key,
            label: region.label,
            total: this.getUserTotalInRegion(userName, region.key)
        }));
        const settlementConfig = this.getUserSettlementConfig(userName);
        const parsePreference = this.getUserParsePreference(userName);
        const summary = {
            userName,
            totalInView,
            regionStates,
            settlementConfig,
            regionModeSummary: this.getUserRegionModeSummary(userName),
            parsePreference,
            parsePreferenceText: parsePreference.tailShorthandAsSeparateGroups
                ? '解析习惯：尾数简写开启'
                : '解析习惯：默认'
        };
        this.userListSummaryCache.set(cacheKey, summary);
        if (this.userListSummaryCache.size > 4000) {
            const first = this.userListSummaryCache.keys().next();
            if (!first.done) {
                this.userListSummaryCache.delete(first.value);
            }
        }
        return summary;
    }

    createUserListRow(userName = '', options = {}) {
        const summary = this.getUserListSummary(userName);
        const settlementConfig = summary.settlementConfig || this.getUserSettlementConfig(userName);
        const parsePreference = summary.parsePreference || this.getUserParsePreference(userName);
        const serialNo = Number.isInteger(options && options.serialNo) ? options.serialNo : (this.getUserSerialMap().get(userName) || 0);
        const li = document.createElement('li');
        li.onclick = () => this.switchUser(userName);
        if (this.selectedUsers.has(userName)) {
            li.classList.add('is-selected');
        }

        const info = document.createElement('div');
        info.className = 'user-item-info';

        const nameRow = document.createElement('div');
        nameRow.className = 'user-item-name';
        nameRow.textContent = `${serialNo} ${userName} (总: ${this.formatAmountValue(summary.totalInView || 0)})`;
        info.appendChild(nameRow);

        const regionRow = document.createElement('div');
        regionRow.className = 'user-region-state-row';
        (summary.regionStates || []).forEach((region) => {
            const badge = document.createElement('span');
            badge.className = `user-region-state ${Number(region && region.total) > 0 ? 'has-data' : 'no-data'}`;
            badge.textContent = region && region.label ? region.label : '-';
            regionRow.appendChild(badge);
        });
        info.appendChild(regionRow);

        const settlementSummary = document.createElement('div');
        settlementSummary.className = 'user-settlement-summary';
        settlementSummary.textContent = `倍率 ${this.formatAmountValue(settlementConfig.odds)} | 返利 ${this.formatAmountValue(settlementConfig.rebateRate)}%`;
        info.appendChild(settlementSummary);

        const regionModeSummary = document.createElement('div');
        regionModeSummary.className = 'user-region-mode-summary';
        regionModeSummary.textContent = `区域模式：${summary.regionModeSummary || '按区域分别统计'}`;
        info.appendChild(regionModeSummary);

        const parseSummary = document.createElement('div');
        parseSummary.className = 'user-region-mode-summary';
        parseSummary.textContent = summary.parsePreferenceText || '解析习惯：默认';
        info.appendChild(parseSummary);

        const actions = document.createElement('div');
        actions.className = 'user-item-actions';

        const settlementButton = document.createElement('button');
        settlementButton.className = 'user-settlement-toggle';
        settlementButton.textContent = '客户设置';
        const isSettingsOpen = typeof window.isCustomerSettingsListDockOpenForUser === 'function'
            && window.isCustomerSettingsListDockOpenForUser(userName);
        if (isSettingsOpen) {
            settlementButton.classList.add('active');
            settlementButton.setAttribute('aria-expanded', 'true');
        } else {
            settlementButton.setAttribute('aria-expanded', 'false');
        }
        settlementButton.onclick = (event) => {
            event.stopPropagation();
            if (typeof window.openCustomerSettings === 'function') {
                window.openCustomerSettings(userName, {
                    source: 'list',
                    defaultTab: 'settlement'
                });
            }
        };

        const clearBetDataButton = document.createElement('button');
        clearBetDataButton.className = 'cancel-button';
        clearBetDataButton.textContent = '清空数据';
        clearBetDataButton.onclick = (event) => {
            event.stopPropagation();
            try {
                this.clearUserBetData(userName);
            } catch (error) {
                if (window.showError) {
                    window.showError('清空失败', error && error.message ? error.message : '未知错误');
                }
            }
        };

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '删除客户';
        deleteButton.onclick = (event) => {
            event.stopPropagation();
            this.deleteUser(userName);
        };

        actions.appendChild(settlementButton);
        actions.appendChild(clearBetDataButton);
        actions.appendChild(deleteButton);
        li.appendChild(info);
        li.appendChild(actions);
        return li;
    }

    // 渲染用户列表
    renderUserList() {
        const userListElement = document.getElementById('userList');
        if (!userListElement) return;
        this.cancelPendingUserListRender();
        this.syncUserListSortControls();
        const userSearchInput = document.getElementById('userSearchInput');
        if (userSearchInput && userSearchInput.value !== this.userSearchKeyword) {
            userSearchInput.value = this.userSearchKeyword;
        }

        const keyword = String(this.userSearchKeyword || '').trim();
        const sortedUsers = this.getFilteredUserNames(keyword);
        const serialMap = this.getUserSerialMap();

        if (!this.shouldUseUserListVirtualList(sortedUsers)) {
            this.renderUserListStaticRows(userListElement, sortedUsers, serialMap);
            return;
        }

        this.renderVirtualRows(
            userListElement,
            sortedUsers,
            (userName, index) => this.createUserListRow(userName, {
                serialNo: serialMap.get(userName) || (index + 1)
            }),
            {
                estimateItemHeight: this.estimateUserListRowHeight(),
                getItemKey: (userName, index) => String(userName || index),
                overscan: 5,
                minRenderCount: 10,
                maxRenderCount: 36,
                measureRenderedItemHeights: true,
                itemSpacing: 8,
                emptyText: keyword ? '没有匹配的客户' : '暂无客户'
            }
        );
    }

    // 渲染区域
    renderSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return;

        section.innerHTML = '';

        if (sectionId === 'section1') {
            this.renderCurrentUserSection(section);
        }
    }

    // 渲染当前用户区域
    renderCurrentUserSection(section) {
        const scopeSnapshot = this.getSelectedScopeSnapshot();
        this.renderZodiacBoard(section, scopeSnapshot.data || []);
    }

    // 渲染汇总区域
    renderSummarySection(section) {
        const summaryValueMap = new Map();
        const viewRegions = this.getViewRegions();

        Object.keys(this.users).forEach(userName => {
            viewRegions.forEach(regionKey => {
                const regionData = this.getUserRegionData(userName, regionKey);
                if (!regionData) return;
                regionData.data.forEach(item => {
                    const current = summaryValueMap.get(item.number) || 0;
                    summaryValueMap.set(item.number, current + item.value);
                });
            });
        });

        const summaryData = this.generateData().map(item => ({
            ...item,
            value: summaryValueMap.get(item.number) || 0
        }));

        this.renderZodiacBoard(section, summaryData);
    }

    // 渲染排序结果
    renderSortedResults() {
        const sortedResultsElement = document.getElementById('sortedResults');
        if (!sortedResultsElement) return;
        this.deactivateVirtualList(sortedResultsElement);

        const scopeMode = this.getScopeMode();
        const scopeUsers = this.getScopeUsers();
        let rows = [];
        if (scopeUsers.length > 0) {
            rows = scopeMode === 'all'
                ? this.buildSummarySortedRows()
                : this.buildUserSortedRows();
        }
        rows = this.sortNumberRankingRows(rows);

        sortedResultsElement.innerHTML = '';
        if (!rows.length) {
            const empty = document.createElement('div');
            empty.className = 'virtual-empty';
            empty.textContent = '暂无累计数据';
            sortedResultsElement.appendChild(empty);
            return;
        }

        const table = document.createElement('table');
        table.className = 'number-ranking-table';
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        [
            { key: 'number', label: '号码' },
            { key: 'value', label: '累计' },
            { key: 'pnl', label: '盈亏' },
            { key: 'sequence', label: '序号' }
        ].forEach((column) => {
            const th = document.createElement('th');
            const button = document.createElement('button');
            const active = this.getNumberRankingSortKey() === column.key;
            button.type = 'button';
            button.className = `number-ranking-sort ${active ? 'active' : ''}`;
            button.textContent = column.label;
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
            button.onclick = () => {
                this.setNumberRankingSortKey(column.key);
            };
            th.appendChild(button);
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        rows.forEach((row, index) => {
            tbody.appendChild(this.createSortedResultRow(row, index));
        });
        table.appendChild(tbody);
        sortedResultsElement.appendChild(table);
        this.scheduleNumberRankingAutoFit();
    }

    sortNumberRankingRows(rows = []) {
        const list = Array.isArray(rows) ? rows.slice() : [];
        const sortKey = this.getNumberRankingSortKey();
        const zodiacOrder = this.getZodiacOrder();
        const animalMap = this.getZodiacAnimalMap();
        const zodiacIndexMap = new Map(zodiacOrder.map((animal, index) => [animal, index]));
        const animalNumberIndexMap = new Map();

        Object.entries(animalMap).forEach(([animal, numbers]) => {
            (Array.isArray(numbers) ? numbers : []).forEach((num, index) => {
                animalNumberIndexMap.set(this.formatNumber(num), {
                    animal,
                    animalIndex: zodiacIndexMap.has(animal) ? zodiacIndexMap.get(animal) : 999,
                    numberIndex: index
                });
            });
        });

        const compareBySequence = (left, right) => {
            const sequenceDiff = (Number(left.defaultSequence) || 0) - (Number(right.defaultSequence) || 0);
            if (Math.abs(sequenceDiff) > 1e-9) {
                return sequenceDiff;
            }
            return (Number(left.number) || 0) - (Number(right.number) || 0);
        };

        return list.sort((left, right) => {
            if (sortKey === 'number') {
                const leftMeta = animalNumberIndexMap.get(String(left.number || '').padStart(2, '0')) || { animalIndex: 999, numberIndex: 999 };
                const rightMeta = animalNumberIndexMap.get(String(right.number || '').padStart(2, '0')) || { animalIndex: 999, numberIndex: 999 };
                if (leftMeta.animalIndex !== rightMeta.animalIndex) {
                    return leftMeta.animalIndex - rightMeta.animalIndex;
                }
                if (leftMeta.numberIndex !== rightMeta.numberIndex) {
                    return leftMeta.numberIndex - rightMeta.numberIndex;
                }
                return compareBySequence(left, right);
            }

            if (sortKey === 'value') {
                const valueDiff = (Number(left.value) || 0) - (Number(right.value) || 0);
                if (Math.abs(valueDiff) > 1e-9) {
                    return valueDiff;
                }
                return compareBySequence(left, right);
            }

            if (sortKey === 'sequence') {
                return compareBySequence(left, right);
            }

            const leftPnl = Number(left.pnl);
            const rightPnl = Number(right.pnl);
            const leftHasPnl = Number.isFinite(leftPnl);
            const rightHasPnl = Number.isFinite(rightPnl);
            if (leftHasPnl && rightHasPnl) {
                const pnlDiff = leftPnl - rightPnl;
                if (Math.abs(pnlDiff) > 1e-9) {
                    return pnlDiff;
                }
            } else if (leftHasPnl !== rightHasPnl) {
                return leftHasPnl ? -1 : 1;
            }
            return compareBySequence(left, right);
        });
    }

    ensureNumberRankingResizeObserver() {
        if (typeof ResizeObserver !== 'function') return;
        const shell = document.getElementById('sortedResults');
        if (!shell) return;
        if (!this.numberRankingResizeObserver) {
            this.numberRankingResizeObserver = new ResizeObserver(() => {
                this.scheduleNumberRankingAutoFit();
            });
        }
        if (this.numberRankingObservedElement === shell) return;
        if (this.numberRankingObservedElement) {
            try {
                this.numberRankingResizeObserver.unobserve(this.numberRankingObservedElement);
            } catch (error) {
                // ignore
            }
        }
        this.numberRankingObservedElement = shell;
        this.numberRankingResizeObserver.observe(shell);
    }

    scheduleNumberRankingAutoFit() {
        if (this.numberRankingFitRaf) {
            cancelAnimationFrame(this.numberRankingFitRaf);
        }
        this.numberRankingFitRaf = requestAnimationFrame(() => {
            this.numberRankingFitRaf = 0;
            this.syncNumberRankingAutoFit();
        });
    }

    syncNumberRankingAutoFit() {
        this.ensureNumberRankingResizeObserver();
        const shell = document.getElementById('sortedResults');
        if (!shell) return;
        if (this.getNumberViewMode() !== 'sorted' || shell.offsetParent === null) return;

        const table = shell.querySelector('.number-ranking-table');
        const header = table ? table.querySelector('thead') : null;
        const rowCount = table ? table.querySelectorAll('tbody tr').length : 0;
        if (!table || !header || !(rowCount > 0)) return;

        const shellHeight = shell.clientHeight || 0;
        if (!(shellHeight > 0)) return;

        const headerHeight = Math.max(16, Math.ceil(header.getBoundingClientRect().height || 0));
        const rawRowHeight = (shellHeight - headerHeight - 2) / rowCount;
        const rowHeight = Math.max(10, Math.min(22, rawRowHeight));
        const fontSize = Math.max(9, Math.min(12, rowHeight - 4));
        const headerFontSize = Math.max(9, Math.min(11, fontSize));
        const cellPadY = rawRowHeight <= 11.5 ? 0 : (rawRowHeight <= 14 ? 1 : 2);
        const headPadY = rawRowHeight <= 11.5 ? 1 : 2;
        const needsOverflow = (headerHeight + (rowHeight * rowCount)) > (shellHeight + 1);

        shell.style.setProperty('--number-ranking-row-height', `${rowHeight.toFixed(2)}px`);
        shell.style.setProperty('--number-ranking-font-size', `${fontSize.toFixed(2)}px`);
        shell.style.setProperty('--number-ranking-head-font-size', `${headerFontSize.toFixed(2)}px`);
        shell.style.setProperty('--number-ranking-cell-pad-y', `${cellPadY}px`);
        shell.style.setProperty('--number-ranking-cell-pad-x', '6px');
        shell.style.setProperty('--number-ranking-head-pad-y', `${headPadY}px`);
        shell.style.setProperty('--number-ranking-head-pad-x', '6px');
        shell.classList.toggle('is-overflowing', needsOverflow);
    }

    buildScopedSortedRows(scopedUsers = [], options = {}) {
        const users = Array.isArray(scopedUsers) ? scopedUsers.filter(userName => this.users[userName]) : [];
        if (!users.length) return [];

        const summaryData = new Map();
        const viewRegions = this.getViewRegions();
        const showPnl = (options && options.includePnl !== false) && viewRegions.length === 1;
        let totalStake = 0;
        let totalRebate = 0;

        this.generateData().forEach((item) => {
            const number = String(item && item.number ? item.number : '').padStart(2, '0');
            if (!number) return;
            summaryData.set(number, {
                text: String((item && item.text) || ''),
                value: 0,
                payout: 0
            });
        });

        users.forEach(userName => {
            const settlement = this.getUserSettlementConfig(userName);
            const odds = Number(settlement && settlement.odds) || 0;
            const rebateRatio = Number(settlement && settlement.rebateRatio) || 0;
            viewRegions.forEach(regionKey => {
                const regionData = this.getUserRegionData(userName, regionKey);
                if (!regionData) return;

                const regionTotal = Number(regionData.totalCount);
                const safeRegionTotal = Number.isFinite(regionTotal)
                    ? regionTotal
                    : (Array.isArray(regionData.data)
                        ? regionData.data.reduce((sum, item) => sum + (Number(item && item.value) || 0), 0)
                        : 0);
                totalStake += safeRegionTotal;
                totalRebate += safeRegionTotal * rebateRatio;

                (regionData.data || []).forEach(item => {
                    const number = String(item && item.number ? item.number : '').padStart(2, '0');
                    if (!number) return;
                    if (!summaryData.has(number)) {
                        summaryData.set(number, {
                            text: String((item && item.text) || ''),
                            value: 0,
                            payout: 0
                        });
                    }
                    const stake = Number(item && item.value) || 0;
                    const summaryRow = summaryData.get(number);
                    summaryRow.value += stake;
                    summaryRow.payout += stake * odds;
                });
            });
        });

        const baseRows = Array.from(summaryData.entries())
            .map(([number, data]) => ({
                number,
                text: data.text,
                value: Number(data && data.value) || 0,
                payout: Number(data && data.payout) || 0
            }))
            .sort((a, b) => {
                const pnlA = showPnl ? (totalStake - totalRebate - (Number(a && a.payout) || 0)) : Number.POSITIVE_INFINITY;
                const pnlB = showPnl ? (totalStake - totalRebate - (Number(b && b.payout) || 0)) : Number.POSITIVE_INFINITY;
                if (showPnl) {
                    const pnlDiff = pnlA - pnlB;
                    if (Math.abs(pnlDiff) > 1e-9) {
                        return pnlDiff;
                    }
                }
                const valueDiff = (Number(b.value) || 0) - (Number(a.value) || 0);
                if (Math.abs(valueDiff) > 1e-9) {
                    return valueDiff;
                }
                return (Number(a.number) || 0) - (Number(b.number) || 0);
            });

        return baseRows
            .map((row, index) => ({
                number: row.number,
                text: row.text,
                value: row.value,
                pnl: showPnl ? (totalStake - totalRebate - row.payout) : null,
                defaultSequence: index + 1,
                clickable: options && options.clickable === true
            }));
    }

    buildUserSortedRows() {
        return this.buildScopedSortedRows(this.getSelectedUsers(), {
            clickable: true,
            includePnl: true
        });
    }

    buildSummarySortedRows() {
        return this.buildScopedSortedRows(this.getSortedUsers(), {
            clickable: false,
            includePnl: true
        });
    }

    createSortedResultRow(row, rowIndex = 0) {
        const tr = document.createElement('tr');
        const number = String(row.number || '').padStart(2, '0');
        const value = Number(row.value) || 0;
        const serialNo = Number.isInteger(rowIndex) ? rowIndex + 1 : 0;
        const wave = this.getNumberWave(number);
        const waveClass = `rank-wave-${wave}`;
        if (!(value > 0)) {
            tr.classList.add('is-empty');
        }

        const numberCell = document.createElement('td');
        numberCell.className = `number-ranking-cell number-ranking-identity ${waveClass}`;
        numberCell.textContent = `${number}${String(row.text || '').trim()}`;
        tr.appendChild(numberCell);

        const valueCell = document.createElement('td');
        valueCell.className = `number-ranking-cell number-ranking-value ${waveClass}`;
        valueCell.textContent = this.formatAmountValue(value);
        tr.appendChild(valueCell);

        const pnlCell = document.createElement('td');
        pnlCell.className = `number-ranking-cell number-ranking-pnl ${waveClass}`;
        pnlCell.textContent = Number.isFinite(row.pnl) ? this.formatAmountValue(row.pnl) : '-';
        tr.appendChild(pnlCell);

        const rankCell = document.createElement('td');
        rankCell.className = `number-ranking-cell number-ranking-rank ${waveClass}`;
        rankCell.textContent = String(Number(row.defaultSequence) || serialNo);
        tr.appendChild(rankCell);

        if (row.clickable) {
            tr.classList.add('is-clickable');
            tr.title = '点击可编辑该号码数值';
            tr.onclick = () => {
                if (window.handleCellClick) {
                    window.handleCellClick(number);
                }
            };
        }

        return tr;
    }

    // 渲染原始数据
    renderOriginalData() {
        const originalDataListElement = document.getElementById('originalDataList');
        if (!originalDataListElement) return;
        this.cancelPendingOriginalDataSearchRender();
        this.syncOriginalDataSortControls();
        this.syncOriginalDataCollapseControl();
        let rows = this.attachOriginalRowSerial(this.getOriginalRowsForCurrentScope());

        const keyword = String(this.originalDataSearchKeyword || '').trim();
        if (keyword) {
            const matchedRows = [];
            const unmatchedRows = [];
            rows.forEach((row) => {
                if (this.isOriginalMessageMatched(row && row.message, keyword)) {
                    matchedRows.push(row);
                } else {
                    unmatchedRows.push(row);
                }
            });
            rows = this.sortOriginalRows(matchedRows).concat(this.sortOriginalRows(unmatchedRows));
        } else {
            rows = this.sortOriginalRows(rows);
        }

        if (!this.shouldUseOriginalDataVirtualList(rows)) {
            this.renderOriginalDataStaticRows(originalDataListElement, rows);
            return;
        }

        const collapsed = this.getOriginalDataCollapsed();
        const virtualModeKey = collapsed ? 'collapsed' : 'expanded';

        this.renderVirtualRows(
            originalDataListElement,
            rows,
            (row, index) => collapsed
                ? this.createCollapsedOriginalDataRow(row, index)
                : this.createOriginalDataRow(row, index),
            {
                estimateItemHeight: collapsed ? 64 : 110,
                getItemEstimate: (row) => this.getOriginalVirtualRowEstimate(row),
                getItemKey: (row, index) => `${virtualModeKey}:${this.getOriginalRowDerivedCacheKey(row) || `original:${index}`}`,
                overscan: collapsed ? 6 : 4,
                minRenderCount: collapsed ? 16 : 12,
                maxRenderCount: 48,
                measureRenderedItemHeights: collapsed !== true,
                itemSpacing: 8,
                onItemHeightMeasured: (row, _index, height) => {
                    const cacheKey = this.getOriginalRowDerivedCacheKey(row);
                    if (!cacheKey) return;
                    this.originalRowHeightCache.set(cacheKey, height);
                    if (this.originalRowHeightCache.size > 8000) {
                        const first = this.originalRowHeightCache.keys().next();
                        if (!first.done) {
                            this.originalRowHeightCache.delete(first.value);
                        }
                    }
                },
                emptyText: '暂无原始消息'
            }
        );
    }

    getOriginalRowsSnapshotKey() {
        const scopeMode = this.getScopeMode();
        const scopeUsers = this.getScopeUsers();
        const viewRegions = this.getViewRegions();
        return [
            this.originalRowsSnapshotVersion,
            scopeMode,
            viewRegions.join(','),
            scopeUsers.join(',')
        ].join('|');
    }

    getOriginalRowsForCurrentScope() {
        const cacheKey = this.getOriginalRowsSnapshotKey();
        if (this.originalRowsSnapshotCache.key === cacheKey) {
            return this.originalRowsSnapshotCache.rows;
        }

        const scopeMode = this.getScopeMode();
        const scopeUsers = this.getScopeUsers();
        let rows = [];
        if (scopeUsers.length > 0) {
            rows = scopeMode === 'all'
                ? this.collectAllOriginalRows()
                : this.collectSelectedOriginalRows();
        }

        this.originalRowsSnapshotCache = {
            key: cacheKey,
            rows
        };
        return rows;
    }

    collectSelectedOriginalRows() {
        const selectedUsers = this.getSelectedUsers();
        if (!selectedUsers.length) return [];
        const rows = [];
        const viewRegions = this.getViewRegions();
        selectedUsers.forEach((userName) => {
            viewRegions.forEach((regionKey) => {
                const regionData = this.getUserRegionData(userName, regionKey);
                if (!regionData || !Array.isArray(regionData.originalData)) return;
                const regionLabel = this.getUserRegionDisplayLabel(userName, regionKey);
                regionData.originalData.forEach((originalEntry, index) => {
                    rows.push({
                        userName,
                        index,
                        originalEntry,
                        message: this.extractOriginalMessageText(originalEntry),
                        createdAt: this.extractOriginalMessageCreatedAt(originalEntry),
                        editedAt: this.extractOriginalMessageEditedAt(originalEntry),
                        regionKey,
                        regionLabel
                    });
                });
            });
        });
        return rows;
    }

    collectAllOriginalRows() {
        const rows = [];
        const viewRegions = this.getViewRegions();
        Object.entries(this.users).forEach(([userName, _user]) => {
            viewRegions.forEach(regionKey => {
                const regionData = this.getUserRegionData(userName, regionKey);
                if (!regionData) return;
                const regionLabel = this.getUserRegionDisplayLabel(userName, regionKey);
                regionData.originalData.forEach((data, index) => {
                    rows.push({
                        userName,
                        index,
                        originalEntry: data,
                        message: this.extractOriginalMessageText(data),
                        createdAt: this.extractOriginalMessageCreatedAt(data),
                        editedAt: this.extractOriginalMessageEditedAt(data),
                        regionKey,
                        regionLabel
                    });
                });
            });
        });
        return rows;
    }

    estimateOriginalRowHeight(row) {
        if (!row) return 110;
        const cacheKey = this.getOriginalRowDerivedCacheKey(row);
        if (cacheKey && this.originalRowHeightCache.has(cacheKey)) {
            return this.originalRowHeightCache.get(cacheKey) || 110;
        }
        const regionLabel = row.regionLabel || this.getRegionLabel(row.regionKey);
        const rawMessage = this.extractOriginalMessageText(row.message);
        const createdAtText = this.formatOriginalMessageCreatedAt(row.createdAt || (row.originalEntry && this.extractOriginalMessageCreatedAt(row.originalEntry)));
        const storedSummary = this.getOriginalStoredParseSummary(row);
        const issueText = storedSummary
            ? (Array.isArray(storedSummary.focusIssues) ? storedSummary.focusIssues : [])
                .map((issue) => this.formatOriginalParseIssue(issue))
                .join('\n')
            : '';
        const summaryText = storedSummary && storedSummary.summaryText
            ? String(storedSummary.summaryText)
            : '';
        const text = storedSummary
            ? `${row.userName || ''}（${regionLabel || ''}）\n添加时间：${createdAtText}\n${summaryText}\n${issueText}\n${rawMessage}`.replace(/\r/g, '')
            : `${row.userName || ''}（${regionLabel || ''}）\n添加时间：${createdAtText}\n${rawMessage}`.replace(/\r/g, '');
        const logicalLines = text
            .split('\n')
            .reduce((sum, line) => sum + Math.max(1, Math.ceil(String(line || '').length / 30)), 0);
        const estimated = 72 + (logicalLines * 20) + 8;
        const height = Math.max(72, Math.min(1400, estimated));
        if (cacheKey) {
            this.originalRowHeightCache.set(cacheKey, height);
            if (this.originalRowHeightCache.size > 8000) {
                const first = this.originalRowHeightCache.keys().next();
                if (!first.done) {
                    this.originalRowHeightCache.delete(first.value);
                }
            }
        }
        return height;
    }

    createOriginalDataRow(row, rowIndex = 0) {
        const li = document.createElement('li');
        li.classList.add('original-data-list');
        const regionLabel = row.regionLabel || this.getRegionLabel(row.regionKey);
        const rawMessage = this.extractOriginalMessageText(row.message);
        const serialNo = Number.isInteger(row && row.sourceSerial) ? row.sourceSerial : (Number.isInteger(rowIndex) ? (rowIndex + 1) : 0);
        const parseSummary = this.getOriginalParseSummaryCached(row);
        const orderTotal = this.getOriginalOrderTotalCached(row);
        const hitAmount = this.getOriginalRowHitAmount(row);
        const totalText = orderTotal == null ? '未识别' : this.formatAmountValue(orderTotal);
        const createdAtText = this.formatOriginalMessageCreatedAt(row.createdAt || (row.originalEntry && this.extractOriginalMessageCreatedAt(row.originalEntry)));
        const issueTooltip = (Array.isArray(parseSummary.focusIssues) ? parseSummary.focusIssues : [])
            .map((issue) => this.formatOriginalParseIssue(issue))
            .join('\n');

        const headerWrap = document.createElement('div');
        headerWrap.classList.add('message-header');

        const contentWrap = document.createElement('div');
        contentWrap.classList.add('message-main');

        const metaRow = document.createElement('div');
        metaRow.classList.add('message-meta-row');

        const metaSpan = document.createElement('span');
        metaSpan.classList.add('message-meta');
        metaSpan.textContent = `${serialNo} ${row.userName}（${regionLabel}）`;

        const totalInline = document.createElement('span');
        totalInline.classList.add('message-meta-total');
        if (orderTotal == null) {
            totalInline.classList.add('is-unresolved');
        }
        totalInline.textContent = `总：${totalText}`;

        const hitInline = document.createElement('span');
        hitInline.classList.add('message-meta-hit');
        if (hitAmount > 0) {
            hitInline.textContent = `命中：${this.formatAmountValue(hitAmount)}`;
        }

        const timeSpan = document.createElement('span');
        timeSpan.classList.add('message-time');
        timeSpan.textContent = `添加时间：${createdAtText}`;

        const summaryWrap = document.createElement('div');
        summaryWrap.classList.add('message-parse-overview');

        const statusBadge = document.createElement('span');
        statusBadge.classList.add('message-parse-badge', `status-${parseSummary.status || 'partial'}`);
        statusBadge.textContent = parseSummary.statusLabel || '部分统计';

        const summaryTextSpan = document.createElement('span');
        summaryTextSpan.classList.add('message-parse-summary');
        summaryTextSpan.textContent = parseSummary.summaryText || '暂无统计摘要';

        summaryWrap.appendChild(statusBadge);
        summaryWrap.appendChild(summaryTextSpan);

        const issueWrap = document.createElement('div');
        issueWrap.classList.add('message-issue-list');
        (Array.isArray(parseSummary.focusIssues) ? parseSummary.focusIssues : []).forEach((issue) => {
            const issueNode = document.createElement('div');
            issueNode.classList.add('message-issue-item', `kind-${String(issue && issue.kind ? issue.kind : 'ignored').trim() || 'ignored'}`);
            issueNode.textContent = this.formatOriginalParseIssue(issue);
            issueWrap.appendChild(issueNode);
        });

        const textSpan = document.createElement('span');
        textSpan.classList.add('message-text');
        textSpan.innerHTML = this.renderOriginalMessageHighlightHtml(rawMessage);

        metaRow.appendChild(metaSpan);
        metaRow.appendChild(totalInline);
        if (hitAmount > 0) {
            metaRow.appendChild(hitInline);
        }

        contentWrap.appendChild(metaRow);
        contentWrap.appendChild(timeSpan);
        contentWrap.appendChild(summaryWrap);

        const actions = this.createOriginalDataRowActions(row, parseSummary, regionLabel);

        headerWrap.appendChild(contentWrap);
        headerWrap.appendChild(actions);

        li.appendChild(headerWrap);
        if (issueWrap.childNodes.length > 0) {
            li.appendChild(issueWrap);
        }
        li.appendChild(textSpan);
        return li;
    }

    createOriginalDataRowActions(row, parseSummary, regionLabel) {
        const actions = document.createElement('div');
        actions.classList.add('message-actions');

        const primaryActionButton = document.createElement('button');
        const primaryIssue = Array.isArray(parseSummary && parseSummary.focusIssues) ? parseSummary.focusIssues[0] : null;
        const primaryFocusLineNo = Number.isFinite(Number(primaryIssue && primaryIssue.lineNo))
            ? Number(primaryIssue.lineNo)
            : null;
        const needsFollowUp = ['blocked', 'play_only'].includes(String(parseSummary && parseSummary.status || '').trim())
            || (Array.isArray(parseSummary && parseSummary.focusIssues) && parseSummary.focusIssues.length > 0);
        primaryActionButton.classList.add(needsFollowUp ? 'continue-button' : 'edit-button');
        primaryActionButton.textContent = needsFollowUp ? '继续处理' : '编辑';
        primaryActionButton.onclick = () => this.editOriginalData(row.userName, row.index, row.regionKey, {
            focusLineNo: primaryFocusLineNo
        });

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = '删除';
        deleteButton.onclick = () => {
            const scopeMode = this.getScopeMode();
            const scopeLabel = scopeMode === 'single'
                ? '这条'
                : `${row.userName}（${regionLabel}）`;
            const ok = confirm(`确认删除${scopeLabel}原始数据吗？删除后将重新统计。`);
            if (ok) {
                this.deleteOriginalData(row.userName, row.index, row.regionKey);
            }
        };

        actions.appendChild(primaryActionButton);
        actions.appendChild(deleteButton);
        return actions;
    }

    createCollapsedOriginalDataRow(row, rowIndex = 0) {
        const li = document.createElement('li');
        li.classList.add('original-data-list', 'is-collapsed');
        const regionLabel = row.regionLabel || this.getRegionLabel(row.regionKey);
        const serialNo = Number.isInteger(row && row.sourceSerial) ? row.sourceSerial : (Number.isInteger(rowIndex) ? (rowIndex + 1) : 0);
        const parseSummary = this.getOriginalParseSummaryCached(row);
        const orderTotal = this.getOriginalOrderTotalCached(row);
        const totalText = orderTotal == null ? '未识别' : this.formatAmountValue(orderTotal);
        const hitAmount = this.getOriginalRowHitAmount(row);

        const summary = document.createElement('div');
        summary.classList.add('original-data-collapsed-summary');

        const mainText = document.createElement('span');
        mainText.classList.add('original-data-collapsed-main');
        mainText.textContent = `${serialNo} ${row.userName}（${regionLabel}）`;
        summary.appendChild(mainText);

        const totalNode = document.createElement('span');
        totalNode.classList.add('original-data-collapsed-total');
        if (orderTotal == null) {
            totalNode.classList.add('is-unresolved');
        }
        totalNode.textContent = `总：${totalText}`;
        summary.appendChild(totalNode);

        const hitText = document.createElement('span');
        hitText.classList.add('original-data-collapsed-hit');
        if (hitAmount > 0) {
            hitText.textContent = `命中：${this.formatAmountValue(hitAmount)}`;
        } else {
            hitText.classList.add('is-empty');
            hitText.textContent = '命中：';
        }
        summary.appendChild(hitText);

        li.appendChild(summary);
        li.appendChild(this.createOriginalDataRowActions(row, parseSummary, regionLabel));
        return li;
    }

    // 编辑原始数据
    editOriginalData(userName, index, regionKey = this.activeRegion, options = {}) {
        const regionData = this.getUserRegionData(userName, regionKey);
        if (!this.hasOriginalDataAt(regionData, index)) return;
        const message = this.extractOriginalMessageText(regionData.originalData[index]);
        const focusLineNo = Number.isFinite(Number(options && options.focusLineNo))
            ? Number(options.focusLineNo)
            : null;

        if (typeof window !== 'undefined' && typeof window.openOriginalDataEditInRecognize === 'function') {
            window.openOriginalDataEditInRecognize({
                userName,
                index,
                regionKey,
                message,
                focusLineNo
            });
            return;
        }

        const modal = document.getElementById('editOriginalModal');
        const input = document.getElementById('editOriginalMessageInput');
        const title = document.getElementById('editOriginalModalTitle');
        if (!modal || !input) return;

        this.editingOriginal = { userName, index, regionKey };
        input.value = message;
        if (title) {
            title.textContent = `编辑 ${userName} 的原始消息`;
        }
        modal.style.display = 'block';
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    }

    applyEditedOriginalData(userName, index, regionKey = this.activeRegion, nextValue = '', options = {}) {
        const regionData = this.getUserRegionData(userName, regionKey);
        if (!regionData || !Array.isArray(regionData.originalData)) {
            throw new Error('原始消息不存在或区域无效');
        }
        if (!this.hasOriginalDataAt(regionData, index)) {
            throw new Error('原始消息已不存在，可能已被删除');
        }

        const message = String(nextValue || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        if (!message.trim()) {
            throw new Error('消息不能为空');
        }

        const providedPreview = options && options.preview && options.preview.success ? options.preview : null;
        const blockingUnresolvedLines = Array.isArray(providedPreview && providedPreview.result && providedPreview.result.blockingUnresolvedLines)
            ? providedPreview.result.blockingUnresolvedLines.filter(Boolean)
            : [];
        const validation = providedPreview
            ? (blockingUnresolvedLines.length > 0
                ? {
                    ok: false,
                    code: 'BLOCKING_UNRESOLVED_LINES',
                    message: `仍有 ${blockingUnresolvedLines.length} 行疑似录入条目内容未识别，已阻止保存`,
                    blockingUnresolvedLines
                }
                : { ok: true, preview: providedPreview })
            : this.validateOriginalMessageBeforeSave(message, userName);
        if (!validation.ok) {
            const error = new Error(validation.message || '消息校验失败');
            if (validation.code) {
                error.code = validation.code;
            }
            if (Array.isArray(validation.blockingUnresolvedLines)) {
                error.blockingUnresolvedLines = validation.blockingUnresolvedLines;
            }
            throw error;
        }

        let totalAmount = null;
        if (validation.preview && validation.preview.success && validation.preview.result) {
            const previewEntries = Array.isArray(validation.preview.result.entries)
                ? validation.preview.result.entries.filter(Boolean)
                : [];
            const regionEntries = previewEntries.filter((entry) => {
                const entryRegion = String(entry && entry.regionKey ? entry.regionKey : regionKey).trim() || regionKey;
                return entryRegion === regionKey;
            });
            const regionTotal = regionEntries.reduce((sum, entry) => sum + (Number(entry && entry.totalAmount) || 0), 0);
            if (regionTotal > 0) {
                totalAmount = regionTotal;
            } else {
                const previewTotal = Number(validation.preview.result.totalAmount);
                if (previewEntries.length > 0 && Number.isFinite(previewTotal) && previewTotal > 0) {
                    totalAmount = previewTotal;
                }
            }
        }
        if (!Number.isFinite(totalAmount)) {
            totalAmount = this.calculateOriginalOrderTotal(message, userName, regionKey);
        }
        const parseSummary = this.buildOriginalParseSummaryFromPreview(validation.preview, regionKey, totalAmount);
        const hitNumberAmounts = this.buildOriginalHitNumberAmountsFromPreview(validation.preview, regionKey, userName);
        const createdAt = this.extractOriginalMessageCreatedAt(regionData.originalData[index]);
        const editedAt = new Date().toISOString();
        regionData.originalData[index] = this.buildStoredOriginalDataEntry(message, totalAmount, createdAt, editedAt, parseSummary, hitNumberAmounts);
        this.invalidateOriginalDataDerivedCaches();
        this.recalculateUserData(userName, regionKey);
        this.renderAllSections();
        this.saveUserData();
    }

    closeEditOriginalModal() {
        const modal = document.getElementById('editOriginalModal');
        const input = document.getElementById('editOriginalMessageInput');
        const title = document.getElementById('editOriginalModalTitle');
        if (modal) modal.style.display = 'none';
        if (input) input.value = '';
        if (title) title.textContent = '编辑原始消息';
        this.editingOriginal = null;
    }

    saveEditedOriginalData() {
        if (!this.editingOriginal) return;

        const { userName, index, regionKey } = this.editingOriginal;
        const regionData = this.getUserRegionData(userName, regionKey);
        const input = document.getElementById('editOriginalMessageInput');
        if (!input || !this.hasOriginalDataAt(regionData, index)) {
            this.closeEditOriginalModal();
            return;
        }

        const nextValue = String(input.value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        if (!nextValue.trim()) {
            alert('消息不能为空');
            return;
        }

        try {
            this.applyEditedOriginalData(userName, index, regionKey, nextValue);
            this.closeEditOriginalModal();
        } catch (error) {
            alert(error && error.message ? error.message : '保存失败');
        }
    }

    // 删除原始数据
    deleteOriginalData(userName, index, regionKey = this.activeRegion) {
        const regionData = this.getUserRegionData(userName, regionKey);
        if (this.hasOriginalDataAt(regionData, index)) {
            regionData.originalData.splice(index, 1);
            this.invalidateOriginalDataDerivedCaches();
            this.recalculateUserData(userName, regionKey);
            this.renderAllSections();
            this.saveUserData();
        }
    }

    // 重新计算用户数据
    recalculateUserData(userName, regionKey = this.activeRegion) {
        const regionData = this.getUserRegionData(userName, regionKey);
        if (!regionData) return;
        this.invalidateUserListDerivedCaches();

        // 重置所有值为0
        regionData.data.forEach(item => {
            item.value = 0;
        });
        const payoutData = this.ensureRegionPayoutData(regionData, {
            fallbackOdds: this.getDefaultPayoutOdds()
        });
        payoutData.forEach(item => {
            item.value = 0;
        });

        // 重新计算
        regionData.originalData.forEach(data => {
            const rawMessage = this.extractOriginalMessageText(data);
            if (!rawMessage.trim()) return;
            this.processMessageData(rawMessage, userName, regionKey);
        });

        // 计算总数
        regionData.totalCount = regionData.data.reduce((sum, item) => sum + item.value, 0);
    }

    collectUserOriginalEntriesForRebuild(userName) {
        const userRecord = this.users && this.users[userName];
        if (!userRecord || !userRecord.regions || typeof userRecord.regions !== 'object') {
            return [];
        }
        const seen = new Set();
        const rows = [];
        this.getRegionOptions().forEach((region) => {
            const regionData = userRecord.regions[region.key];
            if (!regionData || !Array.isArray(regionData.originalData)) return;
            regionData.originalData.forEach((entry) => {
                const message = this.extractOriginalMessageText(entry);
                if (!message.trim()) return;
                const createdAt = this.extractOriginalMessageCreatedAt(entry);
                const editedAt = this.extractOriginalMessageEditedAt(entry);
                const dedupeKey = `${createdAt}|${message}`;
                if (seen.has(dedupeKey)) return;
                seen.add(dedupeKey);
                rows.push({
                    message,
                    createdAt,
                    editedAt
                });
            });
        });
        rows.sort((left, right) => {
            const leftTime = new Date(left.createdAt || 0).getTime();
            const rightTime = new Date(right.createdAt || 0).getTime();
            const safeLeft = Number.isFinite(leftTime) ? leftTime : 0;
            const safeRight = Number.isFinite(rightTime) ? rightTime : 0;
            return safeLeft - safeRight;
        });
        return rows;
    }

    resetUserAllRegionBuckets(userName, options = {}) {
        const clearOriginalData = !!(options && options.clearOriginalData);
        const userRecord = this.users && this.users[userName];
        if (!userRecord || !userRecord.regions || typeof userRecord.regions !== 'object') {
            return;
        }
        this.getRegionOptions().forEach((region) => {
            const regionData = userRecord.regions[region.key];
            if (!regionData) return;
            if (Array.isArray(regionData.data)) {
                regionData.data.forEach((item) => {
                    item.value = 0;
                });
            }
            const payoutData = this.ensureRegionPayoutData(regionData, {
                fallbackOdds: this.getDefaultPayoutOdds()
            });
            if (Array.isArray(payoutData)) {
                payoutData.forEach((item) => {
                    item.value = 0;
                });
            }
            regionData.totalCount = 0;
            if (clearOriginalData) {
                regionData.originalData = [];
            }
        });
    }

    recalculateAllUsersData() {
        this.invalidateOriginalDataDerivedCaches();
        if (!window.messageProcessor || typeof window.messageProcessor.processMessageForUser !== 'function') {
            const regionKeys = this.getRegionOptions().map(item => item.key);
            Object.keys(this.users || {}).forEach((userName) => {
                regionKeys.forEach((regionKey) => {
                    this.recalculateUserData(userName, regionKey);
                });
            });
            this.saveUserData();
            return;
        }
        Object.keys(this.users || {}).forEach((userName) => {
            const originalEntries = this.collectUserOriginalEntriesForRebuild(userName);
            this.resetUserAllRegionBuckets(userName, { clearOriginalData: true });
            originalEntries.forEach((entry) => {
                const rawMessage = this.extractOriginalMessageText(entry.message);
                if (!rawMessage.trim()) return;
                window.messageProcessor.processMessageForUser(rawMessage, userName, {
                    clientId: userName,
                    originalMessage: rawMessage,
                    createdAt: entry.createdAt,
                    editedAt: entry.editedAt,
                    allowPartial: true,
                    persist: false
                });
            });
        });
        this.saveUserData();
    }

    getUserRegionPayoutByNumber(userName, regionKey = this.activeRegion, number = '') {
        const regionData = this.getUserRegionData(userName, regionKey);
        if (!regionData) return 0;
        const payoutData = this.ensureRegionPayoutData(regionData);
        const target = String(number || '').padStart(2, '0');
        const found = payoutData.find(item => item && item.number === target);
        const value = Number(found && found.value);
        return Number.isFinite(value) ? value : 0;
    }

    // 处理消息数据
    processMessageData(message, userName, regionKey = this.activeRegion) {
        const sourceMessage = this.extractOriginalMessageText(message);
        const regionData = this.getUserRegionData(userName, regionKey);
        if (!regionData || !sourceMessage.trim()) return;
        const payoutData = this.ensureRegionPayoutData(regionData, {
            fallbackOdds: this.getDefaultPayoutOdds()
        });

        const applyParsedData = (numbers, amount, odds = this.getDefaultPayoutOdds()) => {
            if (!Array.isArray(numbers) || numbers.length === 0 || !Number.isFinite(amount) || amount <= 0) {
                return;
            }
            const safeOdds = Number.isFinite(Number(odds)) && Number(odds) > 0 ? Number(odds) : this.getDefaultPayoutOdds();

            numbers.forEach(number => {
                const normalized = String(number).padStart(2, '0');
                const item = regionData.data.find(entry => entry.number === normalized);
                const payoutItem = payoutData.find(entry => entry.number === normalized);
                if (item) {
                    item.value += amount;
                }
                if (payoutItem) {
                    payoutItem.value += amount * safeOdds;
                }
            });
        };

        // 优先复用统一解析器，确保与录入逻辑一致（支持属性词、生肖、多段金额）
        if (window.messageProcessor && typeof window.messageProcessor.parseMessage === 'function') {
            try {
                const parsed = window.messageProcessor.parseMessage(sourceMessage, { clientId: userName, allowPartial: true });
                const regionAccounting = window.messageProcessor.getEffectiveRegionAccountingInfo
                    ? window.messageProcessor.getEffectiveRegionAccountingInfo(userName)
                    : {
                        separateStatsByRegion: true,
                        defaultRegion: regionKey
                    };
                parsed.entries.forEach(entry => {
                    const parsedRegion = entry && entry.regionKey ? entry.regionKey : regionKey;
                    const entryRegion = regionAccounting && regionAccounting.separateStatsByRegion === false
                        ? (regionAccounting.defaultRegion || regionKey)
                        : parsedRegion;
                    if (entryRegion !== regionKey) return;
                    applyParsedData(entry.numbers, entry.amount, entry.odds);
                });
                return;
            } catch (error) {
                // 解析失败时回退到旧规则，保持兼容历史数据
            }
        }

        // 兼容旧格式: "11 22 33 值：55"
        const legacyMatches = [...sourceMessage.matchAll(/((\d+)[\s.,\-]*)+值[:：]\s*(\d+)/g)];
        if (legacyMatches.length > 0) {
            const legacyOdds = this.getDefaultPayoutOdds();
            legacyMatches.forEach(match => {
                const numbers = match[0].split('值')[0].match(/\d+/g) || [];
                const amount = parseInt(match[match.length - 1], 10);
                applyParsedData(numbers, amount, legacyOdds);
            });
            return;
        }

        // 新格式: "14.21.13～各20" / "14.21.13～各号20"
        const modernMatch = sourceMessage.match(/([\d\s.,\-—，。]+)[～~]\s*各(?:号)?\s*(\d+)/);
        if (modernMatch) {
            const numbers = (modernMatch[1].match(/\d+/g) || []).map(n => parseInt(n, 10));
            const amount = parseInt(modernMatch[2], 10);
            applyParsedData(numbers, amount, this.getDefaultPayoutOdds());
        }
    }

    // 生成数据
    generateData() {
        const animalMap = {
            '鼠': [7, 19, 31, 43],
            '牛': [6, 18, 30, 42],
            '虎': [5, 17, 29, 41],
            '兔': [4, 16, 28, 40],
            '龙': [3, 15, 27, 39],
            '蛇': [2, 14, 26, 38],
            '马': [1, 13, 25, 37, 49],
            '羊': [12, 24, 36, 48],
            '猴': [11, 23, 35, 47],
            '鸡': [10, 22, 34, 46],
            '狗': [9, 21, 33, 45],
            '猪': [8, 20, 32, 44]
        };

        const data = [];

        for (const [animal, numbers] of Object.entries(animalMap)) {
            numbers.forEach(number => {
                const formattedNumber = number < 10 ? `0${number}` : `${number}`;
                data.push({ number: formattedNumber, text: animal, value: 0 });
            });
        }

        return data;
    }

    // 保存用户数据
    saveUserData() {
        const ipc = window.electronAPI || window.ipcRenderer;
        if (ipc && typeof ipc.send === 'function') {
            ipc.send('save-user-data', this.users);
        } else {
            console.error('IPC 不可用，数据未保存');
        }
    }

    // 清空所有用户数据
    clearAllUserData() {
        if (!confirm('确定要清空所有用户数据吗？此操作不可恢复！')) {
            return false;
        }
        this.invalidateOriginalDataDerivedCaches();
        this.invalidateUserListDerivedCaches();
        this.users = {};
        this.selectedUsers.clear();
        this.expandedSettlementUser = '';
        this.scopeMode = 'single';
        this.userSearchKeyword = '';
        this.activeRegion = 'new_ao';
        this.viewRegions = new Set(['new_ao']);
        this.applyScopeModeFlags();
        const userSearchInput = document.getElementById('userSearchInput');
        if (userSearchInput) {
            userSearchInput.value = '';
        }
        this.clearSections();
        this.renderAllSections();
        this.saveUserData();
        console.log('已清空所有用户数据');
        return true;
    }

    // 获取当前用户
    getCurrentUser() {
        const selected = this.getSelectedUsers();
        return selected.length > 0 ? selected[0] : null;
    }

    // 获取用户数据
    getUserData(userName) {
        return this.getUserRegionData(userName);
    }

    // 获取所有用户
    getAllUsers() {
        return this.users;
    }

    setScopeMode(mode, options = {}) {
        const nextMode = this.normalizeScopeMode(mode);
        const sortedUsers = this.getSortedUsers();

        this.scopeMode = nextMode;
        if (nextMode === 'all') {
            this.setSelectedUsers(sortedUsers, { syncScope: false });
            if (!this.lastActiveUser || !this.users[this.lastActiveUser]) {
                this.lastActiveUser = sortedUsers[0] || null;
            }
        } else if (nextMode === 'multi') {
            const selected = this.getSelectedUsers();
            if (selected.length === 0 && sortedUsers.length > 0) {
                const keepUser = String(options && options.userName ? options.userName : '').trim();
                const fallbackUser = (keepUser && this.users[keepUser]) ? keepUser : (this.lastActiveUser && this.users[this.lastActiveUser] ? this.lastActiveUser : sortedUsers[0]);
                this.setSelectedUsers(fallbackUser ? [fallbackUser] : [], { syncScope: false });
                this.lastActiveUser = fallbackUser || null;
            }
        } else {
            const keepUser = String(options && options.userName ? options.userName : '').trim();
            const selected = this.getSelectedUsers();
            const nextUser = (keepUser && this.users[keepUser])
                ? keepUser
                : ((this.lastActiveUser && this.users[this.lastActiveUser] && (selected.includes(this.lastActiveUser) || selected.length === 0))
                    ? this.lastActiveUser
                    : (selected[0] || sortedUsers[0] || ''));
            this.setSelectedUsers(nextUser ? [nextUser] : [], { syncScope: false });
            this.lastActiveUser = nextUser || null;
        }

        this.applyScopeModeFlags();
        if (options && options.render === false) {
            return;
        }
        this.renderAllSections({
            refreshViewRegionBar: false
        });
    }

    // 设置汇总模式
    setSummaryMode(enabled) {
        if (enabled) {
            this.setScopeMode('all');
            return;
        }
        this.setScopeMode(this.getSelectedUsers().length > 1 ? 'multi' : 'single');
    }

    setActiveRegion(regionKey) {
        const validKeys = this.getRegionOptions().map(item => item.key);
        if (!validKeys.includes(regionKey)) return;
        this.activeRegion = regionKey;
    }

    setViewRegions(regionKeys = []) {
        const validKeys = this.getRegionOptions().map(item => item.key);
        const normalized = (regionKeys || []).filter(key => validKeys.includes(key));
        this.viewRegions = new Set(normalized.length > 0 ? normalized : ['new_ao']);
        this.renderAllSections();
    }

    toggleViewRegion(regionKey) {
        const validKeys = this.getRegionOptions().map(item => item.key);
        if (!validKeys.includes(regionKey)) return;
        if (this.viewRegions.has(regionKey)) {
            if (this.viewRegions.size > 1) {
                this.viewRegions.delete(regionKey);
            }
        } else {
            this.viewRegions.add(regionKey);
        }
        if (this.viewRegions.size === 0) {
            this.viewRegions.add('new_ao');
        }
        this.renderAllSections();
    }

    setMultiSelectEnabled(enabled) {
        if (enabled) {
            this.setScopeMode(this.getScopeMode() === 'all' ? 'all' : 'multi');
            return;
        }
        this.setScopeMode('single');
    }

    isMultiSelectMode() {
        return this.getScopeMode() !== 'single';
    }

    // 获取汇总模式状态
    isInSummaryMode() {
        return this.getScopeMode() === 'all';
    }
}

// 创建全局用户管理器实例
const userManager = new UserManager();

// 导出给其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManager;
}
// 挂载到window，确保全局可用
if (typeof window !== 'undefined') {
    window.userManager = userManager;
} 
