// 用户管理模块
class UserManager {
    constructor() {
        this.users = {};
        this.selectedUsers = new Set();
        this.lastActiveUser = null;
        this.isMultiSelectEnabled = false;
        this.activeRegion = 'new_ao'; // 录入地区（弹窗单选）
        this.viewRegions = new Set(['new_ao']); // 统计查看地区（主页面多选）
        this.isSummaryMode = false;
        this.editingOriginal = null;
        this.virtualListStates = {};
        this.originalOrderTotalCache = new Map();
        this.originalParseSummaryCache = new Map();
        this.originalDataSearchKeyword = '';
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
                lastPaintTs: 0,
                bound: false
            };
            this.virtualListStates[key] = state;
        }

        state.options = {
            estimateItemHeight: 56,
            overscan: 6,
            minRenderCount: 24,
            maxRenderCount: 120,
            emptyText: '',
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
            container.addEventListener('scroll', () => {
                const now = (typeof performance !== 'undefined' && typeof performance.now === 'function')
                    ? performance.now()
                    : Date.now();
                if ((now - (state.lastPaintTs || 0)) >= 14) {
                    this.paintVirtualList(state);
                    state.lastPaintTs = now;
                    return;
                }
                this.scheduleVirtualListRender(state);
            }, { passive: true });
            state.bound = true;
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

    setVirtualListData(container, items, renderItem, options = {}) {
        const state = this.ensureVirtualListState(container, options);
        if (!state) return;
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
        const minRenderCount = Math.max(20, state.options.minRenderCount || 72);
        const maxRenderCount = Math.max(minRenderCount, state.options.maxRenderCount || 160);
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

    setOriginalDataSearchKeyword(keyword = '') {
        const next = String(keyword == null ? '' : keyword);
        if (next === this.originalDataSearchKeyword) return;
        this.originalDataSearchKeyword = next;
        this.renderOriginalData();
    }

    getOriginalDataSearchKeyword() {
        return this.originalDataSearchKeyword;
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

    buildStoredOriginalDataEntry(message, totalAmount = null, createdAt = '') {
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
                let regionTotal = 0;
                let allRegionTotal = 0;
                (parsed.entries || []).forEach((entry) => {
                    const amount = Number(entry && entry.amount);
                    const numberCount = Array.isArray(entry && entry.numbers) ? entry.numbers.length : 0;
                    if (!Number.isFinite(amount) || amount <= 0 || numberCount <= 0) return;
                    const entryTotal = numberCount * amount;
                    allRegionTotal += entryTotal;
                    const entryRegion = entry && entry.regionKey ? entry.regionKey : targetRegion;
                    if (entryRegion === targetRegion) {
                        regionTotal += entryTotal;
                    }
                });
                if (regionTotal > 0) {
                    return regionTotal;
                }
                if (allRegionTotal > 0) {
                    // 兼容历史数据：若当前规则默认盘口变更导致分区不匹配，至少展示该条原始消息的总额。
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
                message: `仍有 ${blockingUnresolvedLines.length} 行疑似下注内容未识别，已阻止保存`,
                blockingUnresolvedLines
            };
        }

        return { ok: true, preview };
    }

    getOriginalOrderTotalCached(row) {
        if (!row || typeof row !== 'object') return 0;
        const storedTotal = this.extractOriginalMessageTotal(row.originalEntry);
        if (storedTotal != null) {
            return storedTotal;
        }
        const userName = String(row.userName || '');
        const regionKey = String(row.regionKey || this.activeRegion || '');
        const index = Number.isInteger(row.index) ? row.index : -1;
        const message = this.extractOriginalMessageText(row.message);
        const cacheKey = `${userName}|${regionKey}|${index}|${message}`;
        if (this.originalOrderTotalCache.has(cacheKey)) {
            return this.originalOrderTotalCache.get(cacheKey) || 0;
        }

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
        const index = Number.isInteger(row.index) ? row.index : -1;
        const message = this.extractOriginalMessageText(row.message);
        const cacheKey = `${userName}|${regionKey}|${index}|${message}`;
        if (this.originalParseSummaryCache.has(cacheKey)) {
            return this.originalParseSummaryCache.get(cacheKey);
        }

        const storedTotal = this.extractOriginalMessageTotal(row.originalEntry);
        let summary = null;
        if (window.messageProcessor && typeof window.messageProcessor.previewMessage === 'function') {
            const preview = window.messageProcessor.previewMessage(message, {
                clientId: userName,
                allowPartial: true
            });
            if (preview && preview.success && preview.result) {
                const result = preview.result;
                const allEntries = Array.isArray(result.entries) ? result.entries.filter(Boolean) : [];
                const regionEntries = allEntries.filter((entry) => {
                    const entryRegion = String(entry && entry.regionKey ? entry.regionKey : regionKey).trim() || regionKey;
                    return entryRegion === regionKey;
                });
                const fallbackCountedAmount = Number.isFinite(Number(storedTotal))
                    ? Number(storedTotal)
                    : regionEntries.reduce((sum, entry) => sum + (Number(entry && entry.totalAmount) || 0), 0);
                const regionCountedEntryCount = regionEntries.length > 0
                    ? regionEntries.length
                    : ((fallbackCountedAmount > 0 && allEntries.length > 0) ? allEntries.length : 0);
                const baseSummary = result.summary && typeof result.summary === 'object' ? result.summary : {};
                const issues = Array.isArray(baseSummary.issues) ? baseSummary.issues.filter(Boolean) : [];
                const playCount = Number(baseSummary.playCount) || 0;
                const blockedCount = Number(baseSummary.blockedCount) || 0;
                const ignoredCount = Number(baseSummary.ignoredCount) || 0;
                let status = 'empty_or_noise';
                if (blockedCount > 0) {
                    status = 'blocked';
                } else if (regionCountedEntryCount > 0 && playCount === 0 && ignoredCount === 0) {
                    status = 'complete';
                } else if (regionCountedEntryCount === 0 && playCount > 0 && ignoredCount === 0) {
                    status = 'play_only';
                } else if (regionCountedEntryCount > 0 || playCount > 0 || ignoredCount > 0) {
                    status = 'partial';
                } else if (String(baseSummary.status || '').trim()) {
                    status = String(baseSummary.status).trim();
                }
                const statusLabelMap = {
                    complete: '已完整统计',
                    partial: '部分统计',
                    blocked: '待处理',
                    play_only: '仅未开放玩法',
                    empty_or_noise: '仅噪音/摘要'
                };
                const focusIssues = issues
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

                summary = {
                    status,
                    statusLabel: statusLabelMap[status] || '部分统计',
                    countedEntryCount: regionCountedEntryCount,
                    countedAmount: fallbackCountedAmount,
                    playCount,
                    blockedCount,
                    ignoredCount,
                    issues,
                    focusIssues
                };
            } else if (preview && !preview.success) {
                summary = {
                    status: 'blocked',
                    statusLabel: '待处理',
                    countedEntryCount: 0,
                    countedAmount: Number.isFinite(Number(storedTotal)) ? Number(storedTotal) : 0,
                    playCount: 0,
                    blockedCount: 1,
                    ignoredCount: 0,
                    issues: [{
                        kind: 'blocked',
                        lineNo: null,
                        reason: String(preview.error || '消息解析失败').trim() || '消息解析失败',
                        rawText: message
                    }],
                    focusIssues: [{
                        kind: 'blocked',
                        lineNo: null,
                        reason: String(preview.error || '消息解析失败').trim() || '消息解析失败',
                        rawText: message
                    }]
                };
            }
        }

        if (!summary) {
            const fallbackAmount = Number.isFinite(Number(storedTotal)) ? Number(storedTotal) : 0;
            summary = {
                status: fallbackAmount > 0 ? 'partial' : 'empty_or_noise',
                statusLabel: fallbackAmount > 0 ? '部分统计' : '仅噪音/摘要',
                countedEntryCount: fallbackAmount > 0 ? 1 : 0,
                countedAmount: fallbackAmount,
                playCount: 0,
                blockedCount: 0,
                ignoredCount: 0,
                issues: [],
                focusIssues: []
            };
        }

        summary.summaryText = this.buildOriginalParseSummaryText(summary);
        this.originalParseSummaryCache.set(cacheKey, summary);
        if (this.originalParseSummaryCache.size > 8000) {
            const first = this.originalParseSummaryCache.keys().next();
            if (!first.done) {
                this.originalParseSummaryCache.delete(first.value);
            }
        }
        return summary;
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

    normalizeUserRecord(userRecord) {
        const normalizeOriginalDataArray = (rawList) => {
            if (!Array.isArray(rawList)) return [];
            return rawList.map((item) => {
                const message = this.extractOriginalMessageText(item);
                const createdAt = this.extractOriginalMessageCreatedAt(item);
                if (item && typeof item === 'object') {
                    const totalAmount = this.extractOriginalMessageTotal(item);
                    return this.buildStoredOriginalDataEntry(message, totalAmount, createdAt);
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

        if (!userRecord || typeof userRecord !== 'object') {
            return {
                regions: {
                    new_ao: this.createEmptyRegionData(),
                    old_ao: this.createEmptyRegionData(),
                    hongkong: this.createEmptyRegionData()
                }
            };
        }

        if (!userRecord.regions) {
            const legacyRegion = normalizeRegionPayload({
                data: Array.isArray(userRecord.data) ? userRecord.data : this.generateData(),
                payoutData: Array.isArray(userRecord.payoutData) ? userRecord.payoutData : [],
                originalData: Array.isArray(userRecord.originalData) ? userRecord.originalData : [],
                totalCount: Number(userRecord.totalCount) || 0
            });
            return {
                regions: {
                    new_ao: legacyRegion,
                    old_ao: this.createEmptyRegionData(),
                    hongkong: this.createEmptyRegionData()
                }
            };
        }

        const normalized = { regions: {} };
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

            return { animal, numbers, wave: this.getAnimalWave(animal) };
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
            animalCell.textContent = column.animal;
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
        this.users = {};
        this.activeRegion = 'new_ao';
        this.viewRegions = new Set(['new_ao']);
        Object.entries(initialUsers || {}).forEach(([userName, userRecord]) => {
            this.users[userName] = this.normalizeUserRecord(userRecord);
        });
        const toggle = document.getElementById('multiSelectToggle');
        if (toggle) {
            toggle.checked = this.isMultiSelectEnabled;
        }
        this.renderUserList();
        this.switchToFirstUser();
    }

    // 切换到第一个用户
    switchToFirstUser() {
        const sortedUsers = this.getSortedUsers();
        if (sortedUsers.length > 0) {
            this.setSelectedUsers([sortedUsers[0]]);
            this.lastActiveUser = sortedUsers[0];
            this.isSummaryMode = false;
            this.updateCurrentUserDisplay();
            this.updateTitles();
            this.renderAllSections();
        }
    }

    // 获取排序后的用户列表
    getSortedUsers() {
        return Object.keys(this.users).sort((a, b) => 
            this.getUserTotalInViewRegions(b) - this.getUserTotalInViewRegions(a)
        );
    }

    getSelectedUsers() {
        const selected = this.getSortedUsers().filter(user => this.selectedUsers.has(user));
        return selected;
    }

    getSelectedUserData() {
        const selected = this.getSelectedUsers();
        if (selected.length === 0) {
            return {
                users: [],
                data: this.generateData(),
                totalCount: 0,
                originalData: []
            };
        }

        const mergedMap = new Map(this.generateData().map(item => [item.number, { ...item, value: 0 }]));
        const mergedPayoutMap = new Map(this.generateData().map(item => [item.number, { ...item, value: 0 }]));
        const originalData = [];
        let totalCount = 0;
        const viewRegions = this.getViewRegions();

        selected.forEach(userName => {
            viewRegions.forEach(regionKey => {
                const regionData = this.getUserRegionData(userName, regionKey);
                if (!regionData) return;
                this.ensureRegionPayoutData(regionData);
                totalCount += regionData.totalCount || 0;
                regionData.data.forEach(item => {
                    const merged = mergedMap.get(item.number);
                    if (merged) {
                        merged.value += item.value || 0;
                    }
                });
                (regionData.payoutData || []).forEach(item => {
                    const merged = mergedPayoutMap.get(item.number);
                    if (merged) {
                        merged.value += item.value || 0;
                    }
                });
                regionData.originalData.forEach((message, index) => {
                    originalData.push({
                        userName,
                        index,
                        originalEntry: message,
                        message: this.extractOriginalMessageText(message),
                        createdAt: this.extractOriginalMessageCreatedAt(message),
                        regionKey,
                        regionLabel: this.getRegionLabel(regionKey)
                    });
                });
            });
        });

        return {
            users: selected,
            data: Array.from(mergedMap.values()),
            payoutData: Array.from(mergedPayoutMap.values()),
            totalCount,
            originalData
        };
    }

    setSelectedUsers(userNames = []) {
        this.selectedUsers = new Set((userNames || []).filter(name => this.users[name]));
    }

    // 切换用户（多选）
    switchUser(userName) {
        if (!this.users[userName]) return;

        if (this.isMultiSelectEnabled) {
            if (this.selectedUsers.has(userName)) {
                this.selectedUsers.delete(userName);
            } else {
                this.selectedUsers.add(userName);
            }
        } else {
            this.setSelectedUsers([userName]);
        }
        this.lastActiveUser = userName;
        this.isSummaryMode = false;
        
        // 更新UI
        this.updateCurrentUserDisplay();
        this.updateTitles();
        this.renderAllSections();
        
        console.log('切换用户选择:', this.getSelectedUsers().join(','));
    }

    // 更新当前用户显示
    updateCurrentUserDisplay() {
        const currentUserElement = document.getElementById('currentUser');
        const summarySectionTitle = document.getElementById('summarySectionTitle');
        const selected = this.getSelectedUsers();
        const regionLabel = this.getViewRegionLabels().join('、');
        if (currentUserElement) {
            currentUserElement.textContent = selected.length > 0
                ? `当前客户(${regionLabel}): ${selected.join('，')}`
                : `当前客户(${regionLabel}): 无`;
        }
        if (summarySectionTitle) {
            summarySectionTitle.textContent = `所有客户汇总(${regionLabel})`;
        }
    }

    // 更新标题
    updateTitles(count = 0) {
        const sortedResultsTitle = document.getElementById('sortedResultsTitle');
        const originalDataTitle = document.getElementById('originalDataTitle');
        const regionLabel = this.getViewRegionLabels().join('、');

        if (this.isSummaryMode) {
            const summaryTotal = Object.keys(this.users).reduce((sum, userName) => {
                return sum + this.getUserTotalInViewRegions(userName);
            }, 0);
            const total = Number.isFinite(count) && count > 0 ? count : summaryTotal;
            sortedResultsTitle.textContent = `所有客户累计值排序（${regionLabel}） (总: ${total})：`;
            originalDataTitle.textContent = `所有客户的原始输入数据（${regionLabel}）：`;
        } else {
            const selectedData = this.getSelectedUserData();
            if (selectedData.users.length > 0) {
                const userLabel = selectedData.users.join('，');
                sortedResultsTitle.textContent = `${userLabel} 累计值排序（${regionLabel}） (总: ${selectedData.totalCount || 0})`;
                originalDataTitle.textContent = `${userLabel} 原始输入数据（${regionLabel}）：`;
            } else {
                sortedResultsTitle.textContent = `没有选择客户（${regionLabel}）`;
                originalDataTitle.textContent = `没有原始输入数据（${regionLabel}）`;
            }
        }
    }

    // 渲染所有区域
    renderAllSections() {
        this.renderSection('section1');
        this.renderSection('section2');
        this.renderSortedResults();
        this.renderOriginalData();
        this.renderUserList();
        if (typeof window.refreshViewRegionBar === 'function') {
            window.refreshViewRegionBar();
        }
        if (typeof window.refreshRegionPnlPanel === 'function') {
            window.refreshRegionPnlPanel();
        }
        if (typeof window.refreshDashboardStatus === 'function') {
            window.refreshDashboardStatus();
        }
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

    // 添加用户
    addUser(userName) {
        if (!userName || !userName.trim()) {
            throw new Error('请输入有效的用户名');
        }

        if (this.users[userName]) {
            throw new Error('该用户名已存在');
        }

        this.users[userName] = {
            regions: {
                new_ao: this.createEmptyRegionData(),
                old_ao: this.createEmptyRegionData(),
                hongkong: this.createEmptyRegionData()
            }
        };

        this.setSelectedUsers([userName]);
        this.lastActiveUser = userName;
        this.isSummaryMode = false;
        this.updateCurrentUserDisplay();
        this.updateTitles();
        this.renderAllSections();
        this.saveUserData();
        
        console.log('添加用户:', userName);
        return true;
    }

    // 删除用户
    deleteUser(userName) {
        if (!confirm(`确定要删除用户 ${userName} 及其所有数据吗？`)) {
            return false;
        }

        delete this.users[userName];
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
                this.setSelectedUsers([sortedUsers[0]]);
                this.lastActiveUser = sortedUsers[0];
                this.isSummaryMode = false;
            }
        } else {
            this.selectedUsers.clear();
            this.lastActiveUser = null;
            this.clearSections();
        }

        // 删除后无论当前是否仍有选中客户，都必须统一刷新主页面，
        // 否则右侧累计值/原始消息可能停留在删除前的数据。
        this.updateCurrentUserDisplay();
        this.updateTitles();
        this.renderAllSections();
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

    // 清空当前客户数据（仅消息与统计，不删除客户规则偏好）
    clearCurrentUserData() {
        const userName = this.resolveActionUserName();
        if (!userName || !this.users[userName]) {
            throw new Error('请先选择客户');
        }
        const ok = confirm(`确定清空客户 ${userName} 的消息数据吗？\n仅清空号码统计与原始消息，不会删除该客户的锚点偏好规则。`);
        if (!ok) {
            return { cleared: false, userName };
        }

        const userRecord = this.users[userName];
        if (!userRecord || typeof userRecord !== 'object') {
            throw new Error('客户数据不存在');
        }
        if (!userRecord.regions || typeof userRecord.regions !== 'object') {
            userRecord.regions = {};
        }
        this.getRegionOptions().forEach(region => {
            userRecord.regions[region.key] = this.createEmptyRegionData();
        });

        this.renderAllSections();
        this.saveUserData();
        console.log('已清空客户数据:', userName);
        return { cleared: true, userName };
    }

    // 清空区域
    clearSections() {
        const sections = ['section1', 'section2'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.innerHTML = '';
            }
        });
    }

    // 渲染用户列表
    renderUserList() {
        const userListElement = document.getElementById('userList');
        if (!userListElement) return;

        userListElement.innerHTML = '';
        const sortedUsers = this.getSortedUsers();

        sortedUsers.forEach(user => {
            const li = document.createElement('li');
            li.onclick = () => this.switchUser(user);
            if (this.selectedUsers.has(user)) {
                li.classList.add('is-selected');
            }

            const info = document.createElement('div');
            info.className = 'user-item-info';

            const nameRow = document.createElement('div');
            nameRow.className = 'user-item-name';
            nameRow.textContent = `${user} (总: ${this.getUserTotalInViewRegions(user) || 0})`;
            info.appendChild(nameRow);

            const regionRow = document.createElement('div');
            regionRow.className = 'user-region-state-row';
            this.getRegionOptions().forEach(region => {
                const badge = document.createElement('span');
                const total = this.getUserTotalInRegion(user, region.key);
                badge.className = `user-region-state ${total > 0 ? 'has-data' : 'no-data'}`;
                badge.textContent = region.label;
                regionRow.appendChild(badge);
            });
            info.appendChild(regionRow);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '删除';
            deleteButton.onclick = (event) => {
                event.stopPropagation();
                this.deleteUser(user);
            };

            li.appendChild(info);
            li.appendChild(deleteButton);
            userListElement.appendChild(li);
        });
    }

    // 渲染区域
    renderSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return;

        section.innerHTML = '';

        if (sectionId === 'section1') {
            this.renderCurrentUserSection(section);
        } else if (sectionId === 'section2') {
            this.renderSummarySection(section);
        }
    }

    // 渲染当前用户区域
    renderCurrentUserSection(section) {
        const selectedData = this.getSelectedUserData();
        this.renderZodiacBoard(section, selectedData.data || []);
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

        let rows = [];
        if (this.isSummaryMode) {
            rows = this.buildSummarySortedRows();
        } else if (this.getSelectedUsers().length > 0) {
            rows = this.buildUserSortedRows();
        }

        this.renderVirtualRows(
            sortedResultsElement,
            rows,
            (row) => this.createSortedResultRow(row),
            {
                estimateItemHeight: 66,
                overscan: 6,
                minRenderCount: 24,
                maxRenderCount: 120,
                emptyText: '暂无累计数据'
            }
        );
    }

    buildUserSortedRows() {
        const selectedData = this.getSelectedUserData();
        if (!selectedData.users.length) return [];

        return selectedData.data
            .slice()
            .sort((a, b) => b.value - a.value)
            .map(item => ({
                number: item.number,
                text: item.text,
                value: item.value,
                pnl: null,
                clickable: true
            }));
    }

    buildSummarySortedRows() {
        const summaryData = {};
        const viewRegions = this.getViewRegions();
        const showPnl = this.isSummaryMode && viewRegions.length === 1;

        Object.keys(this.users).forEach(userName => {
            viewRegions.forEach(regionKey => {
                const regionData = this.getUserRegionData(userName, regionKey);
                if (!regionData) return;
                this.ensureRegionPayoutData(regionData);
                regionData.data.forEach(item => {
                    if (!summaryData[item.number]) {
                        summaryData[item.number] = { text: item.text, value: 0, payout: 0 };
                    }
                    summaryData[item.number].value += item.value;
                });
                (regionData.payoutData || []).forEach(item => {
                    if (!summaryData[item.number]) {
                        summaryData[item.number] = { text: item.text, value: 0, payout: 0 };
                    }
                    summaryData[item.number].payout += item.value || 0;
                });
            });
        });

        const sortedSummaryData = Object.entries(summaryData)
            .sort((a, b) => b[1].value - a[1].value);
        const totalValue = showPnl
            ? sortedSummaryData.reduce((sum, [, data]) => sum + (data.value || 0), 0)
            : 0;

        return sortedSummaryData.map(([number, data]) => {
            const payout = Number(data && data.payout);
            const pnl = showPnl ? (totalValue - (Number.isFinite(payout) ? payout : 0)) : null;
            return {
                number,
                text: data.text,
                value: data.value,
                pnl,
                clickable: false
            };
        });
    }

    createSortedResultRow(row) {
        const li = document.createElement('li');
        const number = String(row.number || '').padStart(2, '0');
        const value = Number(row.value) || 0;
        li.innerHTML = `
            <span class="sorted-number-badge wave-${this.getNumberWave(number)}">${number}</span>
            <span class="sorted-text">${row.text}: ${value}</span>
        `;

        if (Number.isFinite(row.pnl)) {
            const pnlValue = Number(row.pnl);
            const pnlClass = row.pnl > 0 ? 'profit' : (row.pnl < 0 ? 'loss' : 'even');
            const formatPnl = (value) => {
                if (!Number.isFinite(value)) return '0';
                if (Math.abs(value) < 1e-9) return '0';
                if (Number.isInteger(value)) return `${value}`;
                return value.toFixed(4).replace(/\.?0+$/, '');
            };
            const pnlText = pnlValue > 0 ? `+${formatPnl(pnlValue)}` : `${formatPnl(pnlValue)}`;
            const pnlSpan = document.createElement('span');
            pnlSpan.className = `sorted-pnl ${pnlClass}`;
            pnlSpan.textContent = pnlText;
            li.appendChild(pnlSpan);
        }

        if (row.clickable) {
            li.title = '点击可编辑该号码数值';
            li.onclick = () => {
                if (window.handleCellClick) {
                    window.handleCellClick(number);
                }
            };
        } else {
            li.style.cursor = 'default';
        }

        return li;
    }

    // 渲染原始数据
    renderOriginalData() {
        const originalDataListElement = document.getElementById('originalDataList');
        if (!originalDataListElement) return;
        this.originalOrderTotalCache.clear();
        this.originalParseSummaryCache.clear();

        let rows = [];
        if (this.isSummaryMode) {
            rows = this.collectAllOriginalRows();
        } else if (this.getSelectedUsers().length > 0) {
            rows = this.collectSelectedOriginalRows();
        }

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
            rows = matchedRows.concat(unmatchedRows);
        }

        this.renderVirtualRows(
            originalDataListElement,
            rows,
            (row, index) => this.createOriginalDataRow(row, index),
            {
                estimateItemHeight: 110,
                getItemEstimate: (row) => this.estimateOriginalRowHeight(row),
                overscan: 6,
                minRenderCount: 24,
                maxRenderCount: 96,
                emptyText: '暂无原始消息'
            }
        );
    }

    collectSelectedOriginalRows() {
        const selectedData = this.getSelectedUserData();
        if (!selectedData.users.length) return [];
        return selectedData.originalData.map(({ userName, index, originalEntry, message, regionKey, regionLabel }) => ({
            userName,
            index,
            originalEntry,
            message: this.extractOriginalMessageText(message),
            createdAt: this.extractOriginalMessageCreatedAt(originalEntry),
            regionKey,
            regionLabel: regionLabel || this.getRegionLabel(regionKey)
        }));
    }

    collectAllOriginalRows() {
        const rows = [];
        const viewRegions = this.getViewRegions();
        Object.entries(this.users).forEach(([userName, _user]) => {
            viewRegions.forEach(regionKey => {
                const regionData = this.getUserRegionData(userName, regionKey);
                if (!regionData) return;
                regionData.originalData.forEach((data, index) => {
                    rows.push({
                        userName,
                        index,
                        originalEntry: data,
                        message: this.extractOriginalMessageText(data),
                        createdAt: this.extractOriginalMessageCreatedAt(data),
                        regionKey,
                        regionLabel: this.getRegionLabel(regionKey)
                    });
                });
            });
        });
        return rows;
    }

    estimateOriginalRowHeight(row) {
        if (!row) return 110;
        const regionLabel = row.regionLabel || this.getRegionLabel(row.regionKey);
        const rawMessage = this.extractOriginalMessageText(row.message);
        const createdAtText = this.formatOriginalMessageCreatedAt(row.createdAt || (row.originalEntry && this.extractOriginalMessageCreatedAt(row.originalEntry)));
        const parseSummary = this.getOriginalParseSummaryCached(row);
        const issueText = (Array.isArray(parseSummary.focusIssues) ? parseSummary.focusIssues : [])
            .map((issue) => this.formatOriginalParseIssue(issue))
            .join('\n');
        const text = `${row.userName || ''}（${regionLabel || ''}）\n添加时间：${createdAtText}\n${parseSummary.summaryText || ''}\n${issueText}\n${rawMessage}`.replace(/\r/g, '');
        const logicalLines = text
            .split('\n')
            .reduce((sum, line) => sum + Math.max(1, Math.ceil(String(line || '').length / 32)), 0);
        const estimated = 64 + (logicalLines * 20);
        return Math.max(72, Math.min(1400, estimated));
    }

    createOriginalDataRow(row, rowIndex = 0) {
        const li = document.createElement('li');
        li.classList.add('original-data-list');
        const regionLabel = row.regionLabel || this.getRegionLabel(row.regionKey);
        const rawMessage = this.extractOriginalMessageText(row.message);
        const serialNo = Number.isInteger(rowIndex) ? (rowIndex + 1) : 0;
        const orderTotal = this.getOriginalOrderTotalCached(row);
        const totalText = orderTotal == null ? '未识别' : this.formatAmountValue(orderTotal);
        const metaText = `${serialNo} ${row.userName}（${regionLabel}）总：${totalText}`;
        const createdAtText = this.formatOriginalMessageCreatedAt(row.createdAt || (row.originalEntry && this.extractOriginalMessageCreatedAt(row.originalEntry)));
        const parseSummary = this.getOriginalParseSummaryCached(row);
        const issueTooltip = (Array.isArray(parseSummary.focusIssues) ? parseSummary.focusIssues : [])
            .map((issue) => this.formatOriginalParseIssue(issue))
            .join('\n');
        const fullMessage = `${metaText}\n添加时间：${createdAtText}\n状态：${parseSummary.statusLabel || ''}\n${parseSummary.summaryText || ''}${issueTooltip ? `\n${issueTooltip}` : ''}\n${rawMessage}`;
        li.title = fullMessage;

        const contentWrap = document.createElement('div');
        contentWrap.classList.add('message-main');

        const metaSpan = document.createElement('span');
        metaSpan.classList.add('message-meta');
        metaSpan.textContent = metaText;

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

        contentWrap.appendChild(metaSpan);
        contentWrap.appendChild(timeSpan);
        contentWrap.appendChild(summaryWrap);
        if (issueWrap.childNodes.length > 0) {
            contentWrap.appendChild(issueWrap);
        }
        contentWrap.appendChild(textSpan);

        const actions = document.createElement('div');
        actions.classList.add('message-actions');

        const primaryActionButton = document.createElement('button');
        const primaryIssue = Array.isArray(parseSummary.focusIssues) ? parseSummary.focusIssues[0] : null;
        const primaryFocusLineNo = Number.isFinite(Number(primaryIssue && primaryIssue.lineNo))
            ? Number(primaryIssue.lineNo)
            : null;
        const needsFollowUp = ['blocked', 'play_only'].includes(String(parseSummary.status || '').trim())
            || (Array.isArray(parseSummary.focusIssues) && parseSummary.focusIssues.length > 0);
        primaryActionButton.classList.add(needsFollowUp ? 'continue-button' : 'edit-button');
        primaryActionButton.textContent = needsFollowUp ? '继续处理' : '编辑';
        primaryActionButton.onclick = () => this.editOriginalData(row.userName, row.index, row.regionKey, {
            focusLineNo: primaryFocusLineNo
        });

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = '删除';
        deleteButton.onclick = () => {
            const scopeLabel = this.isSummaryMode
                ? `${row.userName}（${regionLabel}）`
                : '这条';
            const ok = confirm(`确认删除${scopeLabel}原始数据吗？删除后将重新统计。`);
            if (ok) {
                this.deleteOriginalData(row.userName, row.index, row.regionKey);
            }
        };

        actions.appendChild(primaryActionButton);
        actions.appendChild(deleteButton);
        li.appendChild(contentWrap);
        li.appendChild(actions);
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

    applyEditedOriginalData(userName, index, regionKey = this.activeRegion, nextValue = '') {
        const regionData = this.getUserRegionData(userName, regionKey);
        if (!regionData || !Array.isArray(regionData.originalData)) {
            throw new Error('原始消息不存在或盘口无效');
        }
        if (!this.hasOriginalDataAt(regionData, index)) {
            throw new Error('原始消息已不存在，可能已被删除');
        }

        const message = String(nextValue || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        if (!message.trim()) {
            throw new Error('消息不能为空');
        }

        const validation = this.validateOriginalMessageBeforeSave(message, userName);
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

        const totalAmount = this.calculateOriginalOrderTotal(message, userName, regionKey);
        const createdAt = this.extractOriginalMessageCreatedAt(regionData.originalData[index]);
        regionData.originalData[index] = this.buildStoredOriginalDataEntry(message, totalAmount, createdAt);
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
            this.recalculateUserData(userName, regionKey);
            this.renderAllSections();
            this.saveUserData();
        }
    }

    // 重新计算用户数据
    recalculateUserData(userName, regionKey = this.activeRegion) {
        const regionData = this.getUserRegionData(userName, regionKey);
        if (!regionData) return;

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

    recalculateAllUsersData() {
        const regionKeys = this.getRegionOptions().map(item => item.key);
        Object.keys(this.users || {}).forEach((userName) => {
            regionKeys.forEach((regionKey) => {
                this.recalculateUserData(userName, regionKey);
            });
        });
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
                parsed.entries.forEach(entry => {
                    const entryRegion = entry && entry.regionKey ? entry.regionKey : regionKey;
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
        this.users = {};
        this.selectedUsers.clear();
        this.activeRegion = 'new_ao';
        this.viewRegions = new Set(['new_ao']);
        this.isSummaryMode = false;
        this.updateCurrentUserDisplay();
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

    // 设置汇总模式
    setSummaryMode(enabled) {
        this.isSummaryMode = enabled;
        this.updateCurrentUserDisplay();
        this.updateTitles();
        this.renderAllSections();
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
        this.updateCurrentUserDisplay();
        this.updateTitles();
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
        this.updateCurrentUserDisplay();
        this.updateTitles();
        this.renderAllSections();
    }

    setMultiSelectEnabled(enabled) {
        this.isMultiSelectEnabled = !!enabled;
        const toggle = document.getElementById('multiSelectToggle');
        if (toggle) {
            toggle.checked = this.isMultiSelectEnabled;
        }
        if (!this.isMultiSelectEnabled) {
            const selected = this.getSelectedUsers();
            if (selected.length > 1) {
                const keepUser = this.lastActiveUser && selected.includes(this.lastActiveUser)
                    ? this.lastActiveUser
                    : selected[0];
                this.setSelectedUsers(keepUser ? [keepUser] : []);
            } else if (selected.length === 0) {
                const sortedUsers = this.getSortedUsers();
                if (sortedUsers.length > 0) {
                    this.setSelectedUsers([sortedUsers[0]]);
                    this.lastActiveUser = sortedUsers[0];
                }
            }
        }
        this.updateCurrentUserDisplay();
        this.updateTitles();
        this.renderAllSections();
    }

    isMultiSelectMode() {
        return this.isMultiSelectEnabled;
    }

    // 获取汇总模式状态
    isInSummaryMode() {
        return this.isSummaryMode;
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
