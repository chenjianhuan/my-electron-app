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
        return {
            data: this.generateData(),
            originalData: [],
            totalCount: 0
        };
    }

    normalizeUserRecord(userRecord) {
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
            return {
                regions: {
                    new_ao: {
                        data: Array.isArray(userRecord.data) ? userRecord.data : this.generateData(),
                        originalData: Array.isArray(userRecord.originalData) ? userRecord.originalData : [],
                        totalCount: Number(userRecord.totalCount) || 0
                    },
                    old_ao: this.createEmptyRegionData(),
                    hongkong: this.createEmptyRegionData()
                }
            };
        }

        const normalized = { regions: {} };
        this.getRegionOptions().forEach(region => {
            const source = userRecord.regions[region.key];
            if (source && Array.isArray(source.data) && Array.isArray(source.originalData)) {
                normalized.regions[region.key] = {
                    data: source.data,
                    originalData: source.originalData,
                    totalCount: Number(source.totalCount) || 0
                };
            } else {
                normalized.regions[region.key] = this.createEmptyRegionData();
            }
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
        board.classList.add('zodiac-board');
        const maxValue = (sourceData || []).reduce((max, item) => {
            const v = Number(item.value) || 0;
            return v > max ? v : max;
        }, 0);

        const bar = document.createElement('div');
        bar.classList.add('zodiac-bar');

        const columnsContainer = document.createElement('div');
        columnsContainer.classList.add('zodiac-columns');

        const columns = this.buildZodiacColumns(sourceData);
        const minSize = 54;
        const maxSize = 106;
        const noValueSize = 38;
        const columnGap = 8;
        const columnPadding = 6;
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const calcSingleLineFontSize = (size, text, prefer) => {
            const len = Math.max(1, String(text).length);
            const maxByWidth = Math.floor((size * 0.84) / (0.62 * len));
            return clamp(Math.min(prefer, maxByWidth), 10, prefer);
        };
        const calcValueFontSize = (size, valueText) => {
            const len = Math.max(1, String(valueText).length);
            // 优先保证完整显示：用保守字符宽度系数和更小的可用宽度估算
            const preferred = Math.round(size * 0.30);
            const maxByWidth = Math.floor((size * 0.72) / (0.68 * len));
            const maxByHeight = Math.floor(size * 0.30);
            return clamp(Math.min(preferred, maxByWidth, maxByHeight), 8, Math.round(size * 0.34));
        };

        board.style.setProperty('--zodiac-gap', `${columnGap}px`);

        const columnLayouts = columns.map(column => {
            const cards = column.numbers.map(item => {
                if (item.value > 0) {
                    const scale = maxValue > 0 ? (1 + 0.6 * (item.value / maxValue)) : 1;
                    const size = Math.round(minSize * Math.min(1.6, scale));
                    const finalSize = Math.min(maxSize, size);
                    const valueFontSize = calcValueFontSize(finalSize, item.value);
                    const numberFontSize = clamp(Math.round(valueFontSize * 0.98), 8, valueFontSize);
                    return { ...item, size: finalSize, fontSize: valueFontSize, numberFontSize, valueFontSize, hasValue: true };
                }

                const text = item.number;
                const fontSize = calcSingleLineFontSize(noValueSize, text, 24);
                return { ...item, size: noValueSize, fontSize, hasValue: false, text };
            });
            return { ...column, cards };
        });

        const sectionInnerWidth = Math.max(0, section.clientWidth - 16);
        const totalGap = columnGap * (columnLayouts.length - 1);
        const equalFillWidth = Math.max(72, Math.floor((sectionInnerWidth - totalGap) / 12));
        const columnWidths = columnLayouts.map(column => {
            const required = column.cards.reduce((m, c) => Math.max(m, c.size), 0) + columnPadding;
            return Math.max(equalFillWidth, required);
        });
        const gridTemplate = columnWidths.map(w => `${w}px`).join(' ');
        bar.style.gridTemplateColumns = gridTemplate;
        columnsContainer.style.gridTemplateColumns = gridTemplate;

        columnLayouts.forEach(column => {
            const barCell = document.createElement('div');
            barCell.classList.add('zodiac-bar-cell');
            barCell.classList.add(`wave-${column.wave}`);
            barCell.textContent = column.animal;
            bar.appendChild(barCell);

            const col = document.createElement('div');
            col.classList.add('zodiac-column');

            column.cards.forEach(item => {
                const card = document.createElement('div');
                card.classList.add('number-card');
                card.classList.add(`wave-${item.wave}`);
                card.style.setProperty('--card-size', `${item.size}px`);
                card.style.setProperty('--card-font-size', `${item.fontSize}px`);
                if (item.numberFontSize) {
                    card.style.setProperty('--card-number-font-size', `${item.numberFontSize}px`);
                }
                if (item.valueFontSize) {
                    card.style.setProperty('--card-value-font-size', `${item.valueFontSize}px`);
                }

                if (item.hasValue) {
                    card.classList.add('has-value');
                    card.innerHTML = `
                        <span class="number-stack-layout">
                            <span class="number-stack-top number-stack-chip">${item.number}</span>
                            <span class="number-stack-bottom">${item.value}</span>
                        </span>
                    `;
                    this.fitValueText(card);
                } else {
                    card.classList.add('no-value');
                    card.textContent = item.text;
                }
                col.appendChild(card);
            });

            columnsContainer.appendChild(col);
        });

        board.appendChild(bar);
        board.appendChild(columnsContainer);
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
        const originalData = [];
        let totalCount = 0;
        const viewRegions = this.getViewRegions();

        selected.forEach(userName => {
            viewRegions.forEach(regionKey => {
                const regionData = this.getUserRegionData(userName, regionKey);
                if (!regionData) return;
                totalCount += regionData.totalCount || 0;
                regionData.data.forEach(item => {
                    const merged = mergedMap.get(item.number);
                    if (merged) {
                        merged.value += item.value || 0;
                    }
                });
                regionData.originalData.forEach((message, index) => {
                    originalData.push({ userName, index, message, regionKey, regionLabel: this.getRegionLabel(regionKey) });
                });
            });
        });

        return {
            users: selected,
            data: Array.from(mergedMap.values()),
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
                ? `当前网友(${regionLabel}): ${selected.join('，')}`
                : `当前网友(${regionLabel}): 无`;
        }
        if (summarySectionTitle) {
            summarySectionTitle.textContent = `所有网友汇总(${regionLabel})`;
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
            sortedResultsTitle.textContent = `所有网友累计值排序（${regionLabel}） (总: ${total})：`;
            originalDataTitle.textContent = `所有网友的原始输入数据（${regionLabel}）：`;
        } else {
            const selectedData = this.getSelectedUserData();
            if (selectedData.users.length > 0) {
                const userLabel = selectedData.users.join('，');
                sortedResultsTitle.textContent = `${userLabel} 累计值排序（${regionLabel}） (总: ${selectedData.totalCount || 0})`;
                originalDataTitle.textContent = `${userLabel} 原始输入数据（${regionLabel}）：`;
            } else {
                sortedResultsTitle.textContent = `没有选择网友（${regionLabel}）`;
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
                this.updateCurrentUserDisplay();
                this.updateTitles();
                this.renderAllSections();
            }
        } else {
            this.selectedUsers.clear();
            this.lastActiveUser = null;
            this.updateCurrentUserDisplay();
            this.clearSections();
        }

        this.renderUserList();
        this.saveUserData();
        
        console.log('删除用户:', userName);
        return true;
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

        sortedResultsElement.innerHTML = '';

        if (this.isSummaryMode) {
            this.renderSummarySortedResults(sortedResultsElement);
        } else if (this.getSelectedUsers().length > 0) {
            this.renderUserSortedResults(sortedResultsElement);
        }
    }

    // 渲染用户排序结果
    renderUserSortedResults(container) {
        const selectedData = this.getSelectedUserData();
        if (!selectedData.users.length) return;

        const sortedData = selectedData.data
            .slice()
            .sort((a, b) => b.value - a.value);

        sortedData.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="sorted-number-badge wave-${this.getNumberWave(item.number)}">${item.number}</span>
                <span class="sorted-text">${item.text}: ${item.value}</span>
            `;
            li.title = '点击可编辑该号码数值';
            li.onclick = () => {
                if (window.handleCellClick) {
                    window.handleCellClick(item.number);
                }
            };
            container.appendChild(li);
        });
    }

    // 渲染汇总排序结果
    renderSummarySortedResults(container) {
        const summaryData = {};
        const viewRegions = this.getViewRegions();
        const showPnl = this.isSummaryMode && viewRegions.length === 1;

        Object.keys(this.users).forEach(userName => {
            viewRegions.forEach(regionKey => {
                const regionData = this.getUserRegionData(userName, regionKey);
                if (!regionData) return;
                regionData.data.forEach(item => {
                    if (!summaryData[item.number]) {
                        summaryData[item.number] = { text: item.text, value: 0 };
                    }
                    summaryData[item.number].value += item.value;
                });
            });
        });

        const sortedSummaryData = Object.entries(summaryData)
            .sort((a, b) => b[1].value - a[1].value);
        const totalValue = showPnl
            ? sortedSummaryData.reduce((sum, [, data]) => sum + (data.value || 0), 0)
            : 0;

        sortedSummaryData.forEach(([number, data]) => {
            const li = document.createElement('li');
            if (showPnl) {
                const pnl = totalValue - (47 * (data.value || 0));
                const pnlClass = pnl > 0 ? 'profit' : (pnl < 0 ? 'loss' : 'even');
                const pnlText = pnl > 0 ? `+${pnl}` : `${pnl}`;
                li.innerHTML = `
                    <span class="sorted-number-badge wave-${this.getNumberWave(number)}">${number}</span>
                    <span class="sorted-text">${data.text}: ${data.value}</span>
                    <span class="sorted-pnl ${pnlClass}">${pnlText}</span>
                `;
            } else {
                li.innerHTML = `
                    <span class="sorted-number-badge wave-${this.getNumberWave(number)}">${number}</span>
                    <span class="sorted-text">${data.text}: ${data.value}</span>
                `;
            }
            container.appendChild(li);
        });
    }

    // 渲染原始数据
    renderOriginalData() {
        const originalDataListElement = document.getElementById('originalDataList');
        if (!originalDataListElement) return;

        originalDataListElement.innerHTML = '';

        if (this.isSummaryMode) {
            this.renderAllOriginalData(originalDataListElement);
        } else if (this.getSelectedUsers().length > 0) {
            this.renderUserOriginalData(originalDataListElement);
        }
    }

    // 渲染用户原始数据
    renderUserOriginalData(container) {
        const selectedData = this.getSelectedUserData();
        if (!selectedData.users.length) return;

        selectedData.originalData.forEach(({ userName, index, message, regionKey, regionLabel }) => {
            const li = document.createElement('li');
            li.classList.add('original-data-list');

            const textSpan = document.createElement('span');
            textSpan.classList.add('message-text');
            textSpan.textContent = `${userName}（${regionLabel || this.getRegionLabel(regionKey)}）：\n${message}`;

            const actions = document.createElement('div');
            actions.classList.add('message-actions');

            const editButton = document.createElement('button');
            editButton.classList.add('edit-button');
            editButton.textContent = '编辑';
            editButton.onclick = () => this.editOriginalData(userName, index, regionKey);

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-button');
            deleteButton.textContent = '删除';
            deleteButton.onclick = () => {
                const ok = confirm('确认删除这条原始数据吗？删除后将重新统计该用户数据。');
                if (ok) {
                    this.deleteOriginalData(userName, index, regionKey);
                }
            };

            actions.appendChild(editButton);
            actions.appendChild(deleteButton);
            li.appendChild(textSpan);
            li.appendChild(actions);
            container.appendChild(li);
        });
    }

    // 渲染所有原始数据
    renderAllOriginalData(container) {
        const viewRegions = this.getViewRegions();
        Object.entries(this.users).forEach(([userName, _user]) => {
            viewRegions.forEach(regionKey => {
                const regionData = this.getUserRegionData(userName, regionKey);
                if (!regionData) return;
                regionData.originalData.forEach((data, index) => {
                    const li = document.createElement('li');
                    li.classList.add('original-data-list');

                    const textSpan = document.createElement('span');
                    textSpan.classList.add('message-text');
                    textSpan.textContent = `${userName}（${this.getRegionLabel(regionKey)}）：\n${data}`;

                    const actions = document.createElement('div');
                    actions.classList.add('message-actions');

                    const editButton = document.createElement('button');
                    editButton.classList.add('edit-button');
                    editButton.textContent = '编辑';
                    editButton.onclick = () => this.editOriginalData(userName, index, regionKey);

                    const deleteButton = document.createElement('button');
                    deleteButton.classList.add('delete-button');
                    deleteButton.textContent = '删除';
                    deleteButton.onclick = () => {
                        const ok = confirm(`确认删除 ${userName}（${this.getRegionLabel(regionKey)}）的这条原始数据吗？删除后将重新统计。`);
                        if (ok) {
                            this.deleteOriginalData(userName, index, regionKey);
                        }
                    };

                    actions.appendChild(editButton);
                    actions.appendChild(deleteButton);
                    li.appendChild(textSpan);
                    li.appendChild(actions);
                    container.appendChild(li);
                });
            });
        });
    }

    // 编辑原始数据
    editOriginalData(userName, index, regionKey = this.activeRegion) {
        const regionData = this.getUserRegionData(userName, regionKey);
        if (!regionData || !regionData.originalData[index]) return;

        const modal = document.getElementById('editOriginalModal');
        const input = document.getElementById('editOriginalMessageInput');
        const title = document.getElementById('editOriginalModalTitle');
        if (!modal || !input) return;

        this.editingOriginal = { userName, index, regionKey };
        input.value = regionData.originalData[index];
        if (title) {
            title.textContent = `编辑 ${userName} 的原始消息`;
        }
        modal.style.display = 'block';
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
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
        if (!regionData || !input || !regionData.originalData[index]) {
            this.closeEditOriginalModal();
            return;
        }

        const nextValue = input.value.trim();
        if (!nextValue) {
            alert('消息不能为空');
            return;
        }

        regionData.originalData[index] = nextValue;
        this.recalculateUserData(userName, regionKey);
        this.renderAllSections();
        this.saveUserData();
        this.closeEditOriginalModal();
    }

    // 删除原始数据
    deleteOriginalData(userName, index, regionKey = this.activeRegion) {
        const regionData = this.getUserRegionData(userName, regionKey);
        if (regionData && regionData.originalData[index]) {
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

        // 重新计算
        regionData.originalData.forEach(data => {
            this.processMessageData(data, userName, regionKey);
        });

        // 计算总数
        regionData.totalCount = regionData.data.reduce((sum, item) => sum + item.value, 0);
    }

    // 处理消息数据
    processMessageData(message, userName, regionKey = this.activeRegion) {
        const regionData = this.getUserRegionData(userName, regionKey);
        if (!regionData || !message) return;

        const applyParsedData = (numbers, amount) => {
            if (!Array.isArray(numbers) || numbers.length === 0 || !Number.isFinite(amount) || amount <= 0) {
                return;
            }

            numbers.forEach(number => {
                const normalized = String(number).padStart(2, '0');
                const item = regionData.data.find(entry => entry.number === normalized);
                if (item) {
                    item.value += amount;
                }
            });
        };

        // 优先复用统一解析器，确保与录入逻辑一致（支持属性词、生肖、多段金额）
        if (window.messageProcessor && typeof window.messageProcessor.parseMessage === 'function') {
            try {
                const parsed = window.messageProcessor.parseMessage(message);
                parsed.entries.forEach(entry => {
                    applyParsedData(entry.numbers, entry.amount);
                });
                return;
            } catch (error) {
                // 解析失败时回退到旧规则，保持兼容历史数据
            }
        }

        // 兼容旧格式: "11 22 33 值：55"
        const legacyMatches = [...message.matchAll(/((\d+)[\s.,\-]*)+值[:：]\s*(\d+)/g)];
        if (legacyMatches.length > 0) {
            legacyMatches.forEach(match => {
                const numbers = match[0].split('值')[0].match(/\d+/g) || [];
                const amount = parseInt(match[match.length - 1], 10);
                applyParsedData(numbers, amount);
            });
            return;
        }

        // 新格式: "14.21.13～各20" / "14.21.13～各号20"
        const modernMatch = message.match(/([\d\s.,\-—，。]+)[～~]\s*各(?:号)?\s*(\d+)/);
        if (modernMatch) {
            const numbers = (modernMatch[1].match(/\d+/g) || []).map(n => parseInt(n, 10));
            const amount = parseInt(modernMatch[2], 10);
            applyParsedData(numbers, amount);
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
