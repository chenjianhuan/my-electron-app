// 优化后的渲染器主文件
const ipcRenderer = window.electronAPI;

// 全局变量
let isNewInput = true;
const selectedAttributes = new Set();
const ATTRIBUTE_GROUP_ORDER_KEY = 'attributeGroupOrder.v1';
const LEGAL_NOTICE_DISMISSED_KEY = 'legalNoticeDismissed.v1';
let suppressMessageInputNormalization = false;
let draggedAttributeRowIndex = null;
let messageErrorLineNo = null;
let isAttributeEditMode = false;
let attributeSwapSource = null;
let attributeLongPressTimer = null;
let speechVoice = null;
let currentLicenseStatus = null;
let licenseLastUpdatedAt = null;
let selectedOcrImage = null;

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
    initAppAccessStatus();
    initLicenseStatus();
    applySavedAttributeGroupOrder();
    initializeApplication();
    renderRecognizeRegionButtons();
    renderViewRegionButtons();
    setupRecognizeMessageInput();
    renderAttributePicker();
    renderCustomAttributeList();
    initLegalNotice();

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.userManager && typeof window.userManager.renderAllSections === 'function') {
                window.userManager.renderAllSections();
            }
        }, 120);
    });
});

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
}

function applyAppAccessStatus(status) {
    if (!status) return;
    if (status.mode === 'trial' && status.trial) {
        showTrialRuntimeWarning(status.trial.remainingDays || 0, status.trial.endAt);
    }
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
        const reason = payload && payload.reason ? payload.reason : '授权U盘已移除，软件将退出。';
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
    setText('licenseExpireAt', formatTime(currentLicenseStatus ? currentLicenseStatus.expireAt : null));
    setText('licenseRemainingDays', formatRemainingDays(currentLicenseStatus));
    setText('licenseUsbMountPath', currentLicenseStatus && currentLicenseStatus.usbMountPath ? currentLicenseStatus.usbMountPath : '-');
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
    picker.classList.toggle('edit-mode', isAttributeEditMode);
    picker.classList.toggle('swap-enabled', !!attributeSwapSource);
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
    selectedAttributes.clear();
    renderAttributePicker();
    const messageTextarea = document.getElementById('message');
    if (messageTextarea) {
        messageTextarea.value = '';
    }
    clearMessageLineError();
}

function renderCustomAttributeList() {
    // 已按需求移除左侧列表展示区域，保留函数用于兼容调用
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
    };

    messageTextarea.addEventListener('keydown', handleMessageManualInputKeydown);
    messageTextarea.addEventListener('input', () => {
        messageErrorLineNo = null;
        messageTextarea.classList.remove('has-line-error');
        renderMessageLineNumbers();
    });
    messageTextarea.addEventListener('scroll', syncLineNumbersScroll);
    messageTextarea.addEventListener('paste', handleOcrPaste);

    if (ocrInput) {
        ocrInput.addEventListener('change', handleOcrFileSelected);
    }
    if (ocrDropZone) {
        ocrDropZone.addEventListener('dragover', handleOcrDragOver);
        ocrDropZone.addEventListener('dragleave', handleOcrDragLeave);
        ocrDropZone.addEventListener('drop', handleOcrDrop);
    }

    renderMessageLineNumbers();
    syncLineNumbersScroll();
    updateOcrHint();
}

function pickOcrImage() {
    const ocrInput = document.getElementById('ocrImageInput');
    if (!ocrInput) return;
    ocrInput.value = '';
    ocrInput.click();
}

function handleOcrFileSelected(event) {
    const file = event.target && event.target.files ? event.target.files[0] : null;
    if (!file) return;
    setSelectedOcrImage(file);
}

function handleOcrPaste(event) {
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
    const zone = document.getElementById('ocrDropZone');
    if (zone) zone.classList.add('dragover');
}

function handleOcrDragLeave() {
    const zone = document.getElementById('ocrDropZone');
    if (zone) zone.classList.remove('dragover');
}

function handleOcrDrop(event) {
    event.preventDefault();
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
    selectedOcrImage = {
        name: file.name || 'clipboard-image.png',
        size: file.size || 0,
        path: file.path || '',
        file
    };
    updateOcrHint();
}

function clearOcrImage() {
    selectedOcrImage = null;
    updateOcrHint();
}

function updateOcrHint(stateText = '') {
    const hint = document.getElementById('ocrImageHint');
    if (!hint) return;
    if (stateText) {
        hint.textContent = stateText;
        return;
    }
    if (!selectedOcrImage) {
        hint.textContent = '拖拽图片到这里，或在输入框中粘贴截图';
        return;
    }
    const kb = Math.max(1, Math.round((selectedOcrImage.size || 0) / 1024));
    hint.textContent = `已选择图片：${selectedOcrImage.name} (${kb} KB)`;
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
            allowOnlineFallback: typeof navigator !== 'undefined' && navigator.onLine === true
        };
        if (selectedOcrImage.path) {
            payload.filePath = selectedOcrImage.path;
        } else if (selectedOcrImage.file) {
            payload.dataUrl = await fileToDataUrl(selectedOcrImage.file);
        } else {
            throw new Error('未找到可用图片数据');
        }

        const result = await ipcRenderer.invoke('ocr:recognize-image', payload);
        if (!result || !result.success) {
            throw new Error(result && result.message ? result.message : '识别失败');
        }

        const text = String(result.text || '').trim();
        if (!text) {
            throw new Error('未识别到可用文本');
        }

        const messageTextarea = document.getElementById('message');
        if (!messageTextarea) {
            throw new Error('消息输入框不存在');
        }
        const merged = [String(messageTextarea.value || '').trim(), text].filter(Boolean).join('\n');
        messageTextarea.value = merged;
        renderMessageLineNumbers();
        updateOcrHint(`识别完成（${result.source || 'offline'}，耗时 ${result.elapsedMs || 0} ms）`);
        showSuccess('图片识别成功，结果已写入输入框');
    } catch (error) {
        updateOcrHint();
        showError('图片识别失败', error.message || '未知错误');
    }
}

function renderMessageLineNumbers() {
    const messageTextarea = document.getElementById('message');
    const lineNumberEl = document.getElementById('messageLineNumbers');
    if (!messageTextarea || !lineNumberEl) return;

    const lines = String(messageTextarea.value || '').split('\n');
    const count = Math.max(1, lines.length);
    const rows = [];
    for (let i = 1; i <= count; i += 1) {
        const cls = i === messageErrorLineNo ? 'message-line-number error' : 'message-line-number';
        rows.push(`<div class="${cls}">${i}</div>`);
    }
    lineNumberEl.innerHTML = rows.join('');
    lineNumberEl.scrollTop = messageTextarea.scrollTop;
}

function clearMessageLineError() {
    const textarea = document.getElementById('message');
    if (textarea) {
        textarea.classList.remove('has-line-error');
    }
    messageErrorLineNo = null;
    renderMessageLineNumbers();
}

function parseManualInputState(value) {
    const text = String(value || '');
    const amountMatch = text.match(/^([\d.]*)(?:\s*各\s*|=|\s+)(\d*)$/);
    const hasAmount = !!amountMatch;
    const numberPart = hasAmount ? (amountMatch[1] || '') : text;
    const amountPart = hasAmount ? (amountMatch[2] || '') : '';

    if (!/^[\d.]*$/.test(numberPart)) return null;
    if (hasAmount && !/^\d*$/.test(amountPart)) return null;

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
        if (state.tokens.includes(composed)) {
            showError('输入错误', `重复号码: ${composed}`);
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

function normalizeMessageBeforeSubmit(message) {
    const trimmed = String(message || '').trim();
    const numberWithAmount = /^((?:\d{2}\.)*\d{2})(?:\s*各\s*|=|\s+)(\d+)$/;
    const matched = trimmed.match(numberWithAmount);
    if (matched) {
        const nums = matched[1].split('.');
        if (new Set(nums).size !== nums.length) {
            throw new Error('号码不能重复，请检查输入');
        }
        return `${matched[1]}各${matched[2]}`;
    }
    if (/^(?:\d{2}\.)*\d$/.test(trimmed) || /^(?:\d{2}\.)*\d{2}\s+$/.test(message)) {
        throw new Error('号码输入不完整，请检查是否每个号码均为两位');
    }
    return trimmed;
}

function updateMessageWithAttributeIntersection() {
    const messageTextarea = document.getElementById('message');
    const attributeMap = getSelectableAttributeMap();
    if (!messageTextarea) return;

    const selected = Array.from(selectedAttributes).map(attr => attributeMap[attr] || []);
    if (selected.length === 0) {
        messageTextarea.value = '';
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
    renderMessageLineNumbers();
}

function resetRecognizeModalState() {
    selectedAttributes.clear();
    renderAttributePicker();
    const messageTextarea = document.getElementById('message');
    const resultElement = document.getElementById('result');
    if (messageTextarea) {
        messageTextarea.value = '';
    }
    clearMessageLineError();
    if (resultElement) {
        resultElement.innerHTML = '';
    }
    const customName = document.getElementById('customAttrName');
    const customNumbers = document.getElementById('customAttrNumbers');
    if (customName) customName.value = '';
    if (customNumbers) customNumbers.value = '';
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
        empty.textContent = '暂无地区数据';
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

// 设置事件监听器
function setupEventListeners() {
    // 监听用户数据加载完成
    ipcRenderer.on('user-data-loaded', (userData) => {
        console.log('收到用户数据:', userData);
        userManager.init(userData || {});
        renderViewRegionButtons();
        renderRecognizeRegionButtons();
    });

    // 监听保存成功
    ipcRenderer.on('save-success', () => {
        console.log('数据保存成功');
    });

    // 监听保存失败
    ipcRenderer.on('save-error', (error) => {
        console.error('数据保存失败:', error);
        showError('保存失败', error.message);
    });

    ipcRenderer.on('custom-attributes-loaded', (customMap) => {
        if (window.messageProcessor && typeof window.messageProcessor.setCustomAttributeMap === 'function') {
            window.messageProcessor.setCustomAttributeMap(customMap || {});
            renderAttributePicker();
            renderCustomAttributeList();
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
            window.messageProcessor.setAttributeConfig(config || { overrides: {}, hidden: [] });
            renderAttributePicker();
            renderCustomAttributeList();
        }
    });

    ipcRenderer.on('attribute-config-save-error', (error) => {
        console.error('属性配置保存失败:', error);
        showError('属性配置保存失败', error && error.message ? error.message : '未知错误');
    });
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

function focusErrorLine(lineNo) {
    if (!lineNo) return;
    const textarea = document.getElementById('message');
    if (!textarea) return;
    const content = textarea.value || '';
    const lines = content.split('\n');
    let start = 0;
    for (let i = 0; i < lineNo - 1 && i < lines.length; i += 1) {
        start += lines[i].length + 1;
    }
    const target = lines[lineNo - 1] || '';
    const end = start + target.length;

    const computed = window.getComputedStyle(textarea);
    const fontSize = parseFloat(computed.fontSize) || 16;
    const lineHeight = parseFloat(computed.lineHeight) || fontSize * 1.5;
    const lineTop = Math.max(0, (lineNo - 1) * lineHeight);
    const lineBottom = lineTop + lineHeight;
    const viewTop = textarea.scrollTop;
    const viewBottom = viewTop + textarea.clientHeight;
    if (lineTop < viewTop || lineBottom > viewBottom) {
        const nextScrollTop = Math.max(0, lineTop - (textarea.clientHeight / 2) + (lineHeight / 2));
        textarea.scrollTop = nextScrollTop;
    }

    textarea.classList.add('has-line-error');
    textarea.style.setProperty('--error-line-start', `${lineTop}px`);
    textarea.style.setProperty('--error-line-end', `${lineBottom}px`);
    messageErrorLineNo = lineNo;
    renderMessageLineNumbers();

    textarea.focus();
    textarea.setSelectionRange(start, end);
}

function renderInlineParseError(errorMessage) {
    const resultElement = document.getElementById('result');
    if (!resultElement) return;
    const lineNo = extractErrorLineNumber(errorMessage);
    resultElement.innerHTML = `<div class="inline-parse-error">错误：${errorMessage}</div>`;
    clearMessageLineError();
    if (lineNo) {
        focusErrorLine(lineNo);
    }
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
        const cleared = userManager.clearAllUserData();
        if (cleared) {
            showSuccess('所有用户数据已清空');
        }
    } catch (error) {
        showError('清空失败', error.message);
    }
}

// 打开模态框
function openModal(modalType) {
    const modal = document.getElementById('myModal');
    const modalTitle = document.getElementById('modalTitle');
    const messageTextarea = document.getElementById('message');
    const resultElement = document.getElementById('result');
    if (modalType === 'recognize') {
        const selectedUsers = window.userManager && typeof window.userManager.getSelectedUsers === 'function'
            ? window.userManager.getSelectedUsers()
            : [];
        const userLabel = selectedUsers.length > 0 ? selectedUsers.join('，') : '未选择网友';
        modalTitle.textContent = `${userLabel}: 输入消息进行识别`;
        messageTextarea.placeholder = '输入消息，例如: 14.21.13.39.38.30.26.18.33～各20';
        if (window.userManager && typeof window.userManager.setActiveRegion === 'function') {
            window.userManager.setActiveRegion('new_ao');
        }
        renderRecognizeRegionButtons();
        resetRecognizeModalState();
    }

    modal.style.display = 'block';
    if (modalType === 'recognize') {
        requestAnimationFrame(() => {
            renderAttributePicker();
        });
    }
}

// 关闭模态框
function closeModal() {
    const modal = document.getElementById('myModal');
    modal.style.display = 'none';
    resetRecognizeModalState();
}

// 预览消息
function previewMessage() {
    try {
        const message = normalizeMessageBeforeSubmit(document.getElementById('message').value);
        if (!message) {
            showError('预览失败', '请输入消息内容');
            return;
        }

        const previewResult = messageProcessor.previewMessage(message);
        const resultElement = document.getElementById('result');
        resultElement.innerHTML = messageProcessor.generatePreviewHTML(previewResult);
        clearMessageLineError();
    } catch (error) {
        renderInlineParseError(error.message);
        showError('预览失败', error.message);
    }
}

// 确认编辑
function confirmEdit() {
    try {
        const message = normalizeMessageBeforeSubmit(document.getElementById('message').value);
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
            const result = messageProcessor.processMessageForUser(message, userName);
            if (!result.success) {
                renderInlineParseError(result.message);
                showError('处理失败', `${userName}: ${result.message}`);
                return;
            }
            totalAdded += result.totalAdded || 0;
        }

        userManager.renderAllSections();
        renderViewRegionButtons();
        clearMessageLineError();
        closeModal();
        showSuccess(`消息处理成功，已添加到 ${selectedUsers.length} 位网友，总金额: ${totalAdded}`);
    } catch (error) {
        showError('确认失败', error.message);
    }
}

// 复制客户端数据
function copyClientData() {
    try {
        const selectedData = typeof userManager.getSelectedUserData === 'function'
            ? userManager.getSelectedUserData()
            : null;
        if (!selectedData || !selectedData.users || selectedData.users.length === 0) {
            showError('复制失败', '请先选择至少一个用户');
            return;
        }
        if (selectedData.totalCount === 0) {
            showError('复制失败', '当前用户没有数据');
            return;
        }

        // 生成复制内容
        const copyContent = generateCopyContent(selectedData);
        
        // 复制到剪贴板
        navigator.clipboard.writeText(copyContent).then(() => {
            showSuccess('数据已复制到剪贴板');
        }).catch(() => {
            // 降级方案
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

// 生成复制内容
function generateCopyContent(userData) {
    const userLabel = Array.isArray(userData.users) ? userData.users.join('，') : '无';
    let content = `用户: ${userLabel}\n`;
    content += `总金额: ${userData.totalCount}\n`;
    content += `数据统计:\n`;
    
    // 按数值排序
    const sortedData = userData.data
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);

    const groupedByValue = new Map();
    sortedData.forEach(item => {
        const value = Number(item.value) || 0;
        if (!groupedByValue.has(value)) {
            groupedByValue.set(value, []);
        }
        groupedByValue.get(value).push(item.number);
    });

    Array.from(groupedByValue.entries())
        .sort((a, b) => b[0] - a[0])
        .forEach(([value, numbers]) => {
            const formattedNumbers = numbers
                .slice()
                .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
                .join('.');
            content += `${formattedNumbers} 各 ${value}\n`;
        });
    
    sortedData.forEach(item => {
        content += `${item.number} ${item.text}: ${item.value}\n`;
    });
    
    content += `\n原始数据:\n`;
    if (Array.isArray(userData.originalData) && userData.originalData.length > 0 && typeof userData.originalData[0] === 'object') {
        userData.originalData.forEach(item => {
            content += `${item.userName}: ${item.message}\n`;
        });
    } else {
        (userData.originalData || []).forEach(data => {
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
    
    if (event.target === modal) {
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
}

// 导出全局函数
window.addUser = addUser;
window.handleSummary = handleSummary;
window.clearUserData = clearUserData;
window.openModal = openModal;
window.closeModal = closeModal;
window.previewMessage = previewMessage;
window.confirmEdit = confirmEdit;
window.copyClientData = copyClientData;
window.openAboutModal = openAboutModal;
window.closeAboutModal = closeAboutModal;
window.handleCellClick = handleCellClick;
window.saveEditedValues = saveEditedValues;
window.closeEditModal = closeEditModal;
window.clearAttributeSelection = clearAttributeSelection;
window.addCustomAttribute = addCustomAttribute;
window.removeCustomAttribute = removeCustomAttribute;
window.toggleAttributeEditMode = toggleAttributeEditMode;
window.confirmAttributeEdit = confirmAttributeEdit;
window.cancelAttributeEdit = cancelAttributeEdit;
window.dismissLegalNotice = dismissLegalNotice;
window.openLicenseModal = openLicenseModal;
window.closeLicenseModal = closeLicenseModal;
window.refreshLicenseStatus = refreshLicenseStatus;
window.pickOcrImage = pickOcrImage;
window.runOcrFromSelectedImage = runOcrFromSelectedImage;
window.clearOcrImage = clearOcrImage;
