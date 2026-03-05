(function bootstrapReader() {
  const STORAGE_KEY = 'book-reader-state-v2';
  const CUSTOM_BOOKS_KEY = 'book-reader-custom-books-v1';
  const A_MODULE_ID = 'lottery';

  const BUILT_IN_MANIFEST = [
    {
      id: 'jinpingmei',
      title: '金瓶梅',
      label: '明代长篇 · 内置全本',
      author: '兰陵笑笑生',
      desc: '内置公共领域版本，全本分章阅读。',
      file: 'jinpingmei.txt',
    },
    {
      id: 'hongloumeng',
      title: '红楼梦',
      label: '清代章回 · 内置全本',
      author: '曹雪芹',
      desc: '内置公共领域版本，全本分章阅读。',
      file: 'hongloumeng.txt',
    },
    {
      id: 'sanguo',
      title: '三国演义',
      label: '历史演义 · 内置全本',
      author: '罗贯中',
      desc: '内置公共领域版本，全本分章阅读。',
      file: 'sanguo.txt',
    },
    {
      id: 'xiyouji',
      title: '西游记',
      label: '神魔小说 · 内置全本',
      author: '吴承恩',
      desc: '内置公共领域版本，全本分章阅读。',
      file: 'xiyouji.txt',
    },
    {
      id: 'shuihuzhuan',
      title: '水浒传',
      label: '英雄传奇 · 内置全本',
      author: '施耐庵',
      desc: '内置公共领域版本，全本分章阅读。',
      file: 'shuihuzhuan.txt',
    },
    {
      id: 'rulinwaishi',
      title: '儒林外史',
      label: '讽刺小说 · 内置全本',
      author: '吴敬梓',
      desc: '内置公共领域版本，全本分章阅读。',
      file: 'rulinwaishi.txt',
    },
    {
      id: 'fengshenyanyi',
      title: '封神演义',
      label: '神魔小说 · 内置全本',
      author: '许仲琳（传）',
      desc: '内置公共领域版本，全本分章阅读。',
      file: 'fengshenyanyi.txt',
    },
    {
      id: 'ernvyingxiongzhuan',
      title: '儿女英雄传',
      label: '章回小说 · 内置全本',
      author: '文康',
      desc: '内置公共领域版本，全本分章阅读。',
      file: 'ernvyingxiongzhuan.txt',
    },
    {
      id: 'laocanyouji',
      title: '老残游记',
      label: '晚清小说 · 内置全本',
      author: '刘鹗',
      desc: '内置公共领域版本，全本分章阅读。',
      file: 'laocanyouji.txt',
    },
    {
      id: 'chukepaianjingqi',
      title: '初刻拍案惊奇',
      label: '话本传奇 · 内置全本',
      author: '凌濛初',
      desc: '内置公共领域版本，全本分章阅读。',
      file: 'chukepaianjingqi.txt',
    },
    {
      id: 'erkepaianjingqi',
      title: '二刻拍案惊奇',
      label: '话本传奇 · 内置全本',
      author: '凌濛初',
      desc: '内置公共领域版本，全本分章阅读。',
      file: 'erkepaianjingqi.txt',
    },
    {
      id: 'jingshitongyan',
      title: '警世通言',
      label: '短篇话本 · 内置全本',
      author: '冯梦龙',
      desc: '内置公共领域版本，全本分章阅读。',
      file: 'jingshitongyan.txt',
    },
    {
      id: 'yushimingyan',
      title: '喻世明言',
      label: '短篇话本 · 内置全本',
      author: '冯梦龙',
      desc: '内置公共领域版本，全本分章阅读。',
      file: 'yushimingyan.txt',
    },
    {
      id: 'huayuehen',
      title: '花月痕',
      label: '言情小说 · 内置全本',
      author: '魏子安',
      desc: '内置公共领域版本，全本分章阅读。',
      file: 'huayuehen.txt',
    },
  ];

  const state = {
    builtInLibrary: [],
    library: [],
    activeBookId: '',
    activeChapterIndex: 0,
    theme: 'paper',
    fontSize: 18,
    searchTerm: '',
    passwordCandidates: ['123456'],
    autoAttemptedPassword: '',
    autoRouteInFlight: false,
  };

  const el = {
    bookList: document.getElementById('bookList'),
    chapterStrip: document.getElementById('chapterStrip'),
    readerContent: document.getElementById('readerContent'),
    bookMeta: document.getElementById('bookMeta'),
    bookTitle: document.getElementById('bookTitle'),
    bookDesc: document.getElementById('bookDesc'),
    themeSelect: document.getElementById('themeSelect'),
    fontSizeRange: document.getElementById('fontSizeRange'),
    fontSizeValue: document.getElementById('fontSizeValue'),
    prevChapterBtn: document.getElementById('prevChapterBtn'),
    nextChapterBtn: document.getElementById('nextChapterBtn'),
    importTxtBtn: document.getElementById('importTxtBtn'),
    resetCustomBtn: document.getElementById('resetCustomBtn'),
    txtFileInput: document.getElementById('txtFileInput'),
    bookCardTemplate: document.getElementById('bookCardTemplate'),
    chapterChipTemplate: document.getElementById('chapterChipTemplate'),
    appVersionBadge: document.getElementById('appVersionBadge'),
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    searchTip: document.getElementById('searchTip'),
  };

  function safeParse(jsonText, fallback) {
    if (!jsonText) return fallback;
    try {
      return JSON.parse(jsonText);
    } catch (error) {
      return fallback;
    }
  }

  function setSearchTip(message, type) {
    el.searchTip.textContent = message || '';
    el.searchTip.classList.remove('error', 'success');
    if (type) {
      el.searchTip.classList.add(type);
    }
  }

  function getCustomBooks() {
    const data = safeParse(localStorage.getItem(CUSTOM_BOOKS_KEY), []);
    return Array.isArray(data) ? data : [];
  }

  function setCustomBooks(customBooks) {
    localStorage.setItem(CUSTOM_BOOKS_KEY, JSON.stringify(customBooks));
  }

  function loadState() {
    const saved = safeParse(localStorage.getItem(STORAGE_KEY), {});
    if (saved && typeof saved === 'object' && Object.prototype.hasOwnProperty.call(saved, 'searchTerm')) {
      const { searchTerm: _removed, ...rest } = saved;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    }
    state.theme = ['paper', 'sepia', 'night'].includes(saved.theme) ? saved.theme : 'paper';
    state.fontSize = Number.isFinite(saved.fontSize) ? Math.min(28, Math.max(14, saved.fontSize)) : 18;
    state.activeBookId = typeof saved.activeBookId === 'string' ? saved.activeBookId : '';
    state.activeChapterIndex = Number.isInteger(saved.activeChapterIndex) ? saved.activeChapterIndex : 0;
    // Do not persist search keywords across restarts to avoid retaining sensitive input.
    state.searchTerm = '';
  }

  function saveState() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        theme: state.theme,
        fontSize: state.fontSize,
        activeBookId: state.activeBookId,
        activeChapterIndex: state.activeChapterIndex,
      })
    );
  }

  function getActiveBook() {
    return state.library.find((book) => book.id === state.activeBookId) || null;
  }

  function normalizeImportedText(text) {
    return String(text || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\uFEFF/g, '')
      .trim();
  }

  function stripGutenbergHeaderAndFooter(rawText) {
    const text = normalizeImportedText(rawText);
    if (!text) return text;

    let startIndex = 0;
    const startMarks = [
      '*** START OF THE PROJECT GUTENBERG EBOOK',
      '*** START OF THIS PROJECT GUTENBERG EBOOK',
    ];
    for (const marker of startMarks) {
      const idx = text.indexOf(marker);
      if (idx >= 0) {
        const lineEnd = text.indexOf('\n', idx);
        startIndex = lineEnd >= 0 ? lineEnd + 1 : idx;
        break;
      }
    }

    let endIndex = text.length;
    const endMarks = [
      '*** END OF THE PROJECT GUTENBERG EBOOK',
      '*** END OF THIS PROJECT GUTENBERG EBOOK',
    ];
    for (const marker of endMarks) {
      const idx = text.indexOf(marker);
      if (idx >= 0) {
        endIndex = idx;
        break;
      }
    }

    return text.slice(startIndex, endIndex).trim();
  }

  function parseChaptersFromText(rawText) {
    const text = stripGutenbergHeaderAndFooter(rawText);
    if (!text) return [];

    const lines = text.split('\n');
    const chapterPattern = /^(?:\s*第[〇零一二三四五六七八九十百千万两兩壹贰貳叁參肆伍陆陸柒捌玖拾佰仟\d]{1,12}[章回节節卷].*|\s*卷[〇零一二三四五六七八九十百千万两兩壹贰貳叁參肆伍陆陸柒捌玖拾佰仟\d]{1,12}.*|\s*卷之[〇零一二三四五六七八九十百千万两兩壹贰貳叁參肆伍陆陸柒捌玖拾佰仟\d]{1,12}.*)$/u;

    const chapters = [];
    let currentTitle = '正文';
    let currentLines = [];

    const pushCurrent = () => {
      const content = currentLines.join('\n').trim();
      if (!content) return;
      chapters.push({
        title: currentTitle,
        content,
      });
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (currentLines.length) {
          currentLines.push('');
        }
        continue;
      }

      if (chapterPattern.test(trimmed)) {
        pushCurrent();
        currentTitle = trimmed;
        currentLines = [];
        continue;
      }

      currentLines.push(trimmed);
    }

    pushCurrent();

    if (chapters.length >= 2) {
      return chapters;
    }

    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (!paragraphs.length) {
      return [];
    }

    return [
      {
        title: '正文',
        content: paragraphs.join('\n\n'),
      },
    ];
  }

  function buildBookFromText(meta, text, options) {
    const chapters = parseChaptersFromText(text);
    return {
      id: options.id,
      title: options.title,
      label: options.label,
      author: options.author,
      desc: options.desc,
      custom: !!options.custom,
      chapters: chapters.length
        ? chapters
        : [
            {
              title: '正文',
              content: normalizeImportedText(text),
            },
          ],
    };
  }

  async function readBuiltInBookText(fileName) {
    if (window.electronAPI && typeof window.electronAPI.invoke === 'function') {
      const result = await window.electronAPI.invoke('reader:read-book-file', { path: `books/${fileName}` });
      if (result && result.ok && typeof result.text === 'string') {
        return result.text;
      }
      throw new Error((result && result.reason) || '读取内置书籍失败');
    }

    const response = await fetch(`./books/${fileName}`);
    if (!response.ok) {
      throw new Error(`读取内置书籍失败 (${response.status})`);
    }
    return response.text();
  }

  async function loadBuiltInLibrary() {
    return Promise.all(
      BUILT_IN_MANIFEST.map(async (meta) => {
        try {
          const text = await readBuiltInBookText(meta.file);
          return buildBookFromText(meta, text, {
            id: meta.id,
            title: meta.title,
            label: meta.label,
            author: meta.author,
            desc: meta.desc,
            custom: false,
          });
        } catch (error) {
          return {
            id: meta.id,
            title: meta.title,
            label: meta.label,
            author: meta.author,
            desc: `${meta.desc}（加载失败：${error && error.message ? error.message : '未知错误'}）`,
            custom: false,
            chapters: [
              {
                title: '提示',
                content: '内置文件读取失败，请检查 public/books 目录。',
              },
            ],
          };
        }
      })
    );
  }

  function parseTxtIntoBook(fileName, rawText) {
    const normalized = normalizeImportedText(rawText);
    if (!normalized) return null;

    const title = fileName.replace(/\.txt$/i, '') || '导入小说';
    const book = buildBookFromText({}, normalized, {
      id: `custom-${Date.now()}`,
      title,
      label: '本地导入 · TXT',
      author: '本地文件',
      desc: '从本地 TXT 导入，可长期保存到本机。',
      custom: true,
    });

    if (book.chapters.length > 1) {
      book.desc = `从本地 TXT 导入，共识别 ${book.chapters.length} 章。`;
    }

    return book;
  }

  function mergeLibrary() {
    state.library = [...state.builtInLibrary, ...getCustomBooks()];
    const hasActive = state.library.some((book) => book.id === state.activeBookId);
    if (!hasActive && state.library.length) {
      state.activeBookId = state.library[0].id;
      state.activeChapterIndex = 0;
    }
  }

  function normalizeSearchKeyword(keyword) {
    return String(keyword || '').trim().toLowerCase();
  }

  function detectPasswordCandidate(inputValue) {
    const source = String(inputValue || '');
    if (!source) return '';
    for (const candidate of state.passwordCandidates) {
      if (candidate && source.includes(candidate)) {
        return candidate;
      }
    }
    return '';
  }

  function getVisibleBooks() {
    const term = normalizeSearchKeyword(state.searchTerm);
    if (!term) {
      return state.library;
    }

    return state.library.filter((book) => {
      const searchText = [book.title, book.author, book.desc, book.label].join(' ').toLowerCase();
      return searchText.includes(term);
    });
  }

  function renderBooks() {
    el.bookList.innerHTML = '';
    const visibleBooks = getVisibleBooks();

    if (!visibleBooks.length) {
      const emptyNode = document.createElement('li');
      emptyNode.className = 'book-empty';
      emptyNode.textContent = `未找到“${state.searchTerm}”相关书籍，可换关键词继续搜索。`;
      el.bookList.appendChild(emptyNode);
      return;
    }

    visibleBooks.forEach((book, index) => {
      const node = el.bookCardTemplate.content.firstElementChild.cloneNode(true);
      const btn = node.querySelector('.book-card-btn');
      node.style.animationDelay = `${Math.min(index * 0.04, 0.25)}s`;

      node.querySelector('.book-card-tag').textContent = book.label;
      node.querySelector('.book-card-title').textContent = book.title;
      node.querySelector('.book-card-author').textContent = `作者：${book.author}`;
      node.querySelector('.book-card-desc').textContent = book.desc;

      if (book.id === state.activeBookId) {
        node.classList.add('active');
      }

      btn.addEventListener('click', () => {
        if (state.activeBookId === book.id) return;
        state.activeBookId = book.id;
        state.activeChapterIndex = 0;
        saveState();
        renderAll();
      });

      el.bookList.appendChild(node);
    });
  }

  function renderChapters() {
    const activeBook = getActiveBook();
    el.chapterStrip.innerHTML = '';

    if (!activeBook) {
      el.prevChapterBtn.disabled = true;
      el.nextChapterBtn.disabled = true;
      return;
    }

    activeBook.chapters.forEach((chapter, idx) => {
      const chip = el.chapterChipTemplate.content.firstElementChild.cloneNode(true);
      chip.textContent = chapter.title;
      if (idx === state.activeChapterIndex) {
        chip.classList.add('active');
      }
      chip.addEventListener('click', () => {
        state.activeChapterIndex = idx;
        saveState();
        renderReader();
        renderChapters();
      });
      el.chapterStrip.appendChild(chip);
    });

    const maxIndex = activeBook.chapters.length - 1;
    el.prevChapterBtn.disabled = state.activeChapterIndex <= 0;
    el.nextChapterBtn.disabled = state.activeChapterIndex >= maxIndex;
  }

  function renderReader() {
    const activeBook = getActiveBook();
    if (!activeBook) {
      el.bookMeta.textContent = '-';
      el.bookTitle.textContent = '未找到图书';
      el.bookDesc.textContent = '请调整搜索词，或从左侧列表选择一本书。';
      el.readerContent.innerHTML = '<p class="empty">当前没有可展示内容。</p>';
      return;
    }

    const chapter = activeBook.chapters[state.activeChapterIndex] || activeBook.chapters[0];
    state.activeChapterIndex = Math.max(0, activeBook.chapters.indexOf(chapter));

    el.bookMeta.textContent = `${activeBook.label} · ${activeBook.author} · 共 ${activeBook.chapters.length} 章`;
    el.bookTitle.textContent = activeBook.title;
    el.bookDesc.textContent = activeBook.desc;

    const paragraphs = String(chapter.content || '')
      .split(/\n{1,2}/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!paragraphs.length) {
      el.readerContent.innerHTML = `<h3>${chapter.title}</h3><p class="empty">该章节暂无内容。</p>`;
    } else {
      el.readerContent.innerHTML = [
        `<h3>${chapter.title}</h3>`,
        ...paragraphs.map((paragraph) => `<p>${paragraph}</p>`),
      ].join('');
    }

    el.readerContent.scrollTop = 0;
  }

  function renderTheme() {
    document.body.classList.remove('theme-sepia', 'theme-night');
    if (state.theme === 'sepia') {
      document.body.classList.add('theme-sepia');
    }
    if (state.theme === 'night') {
      document.body.classList.add('theme-night');
    }
    el.themeSelect.value = state.theme;
  }

  function renderFontSize() {
    document.documentElement.style.setProperty('--reader-font-size', `${state.fontSize}px`);
    el.fontSizeRange.value = String(state.fontSize);
    el.fontSizeValue.textContent = `${state.fontSize}px`;
  }

  function renderSearch() {
    el.searchInput.value = state.searchTerm;
  }

  function renderAll() {
    renderTheme();
    renderFontSize();
    renderSearch();
    renderBooks();
    renderChapters();
    renderReader();
  }

  async function tryEnterABusinessByPassword(passwordText) {
    const password = String(passwordText || '').trim();
    if (!password) {
      return;
    }

    if (!window.electronAPI || typeof window.electronAPI.invoke !== 'function') {
      return;
    }

    if (state.autoRouteInFlight) return;
    state.autoRouteInFlight = true;

    try {
      const unlockResult = await window.electronAPI.invoke('module-auth:unlock', { password });
      if (!unlockResult || !unlockResult.ok) {
        return;
      }

      if (unlockResult.moduleId !== A_MODULE_ID) {
        return;
      }

      await window.electronAPI.invoke('module-router:open', { moduleId: A_MODULE_ID });
    } catch (error) {
      // ignore auto-routing errors
    } finally {
      state.autoRouteInFlight = false;
    }
  }

  function bindEvents() {
    el.themeSelect.addEventListener('change', (event) => {
      state.theme = event.target.value;
      saveState();
      renderTheme();
    });

    el.fontSizeRange.addEventListener('input', (event) => {
      state.fontSize = Number(event.target.value);
      renderFontSize();
      saveState();
    });

    el.prevChapterBtn.addEventListener('click', () => {
      const activeBook = getActiveBook();
      if (!activeBook) return;
      if (state.activeChapterIndex <= 0) return;
      state.activeChapterIndex -= 1;
      saveState();
      renderChapters();
      renderReader();
    });

    el.nextChapterBtn.addEventListener('click', () => {
      const activeBook = getActiveBook();
      if (!activeBook) return;
      if (state.activeChapterIndex >= activeBook.chapters.length - 1) return;
      state.activeChapterIndex += 1;
      saveState();
      renderChapters();
      renderReader();
    });

    el.searchInput.addEventListener('input', (event) => {
      state.searchTerm = event.target.value || '';
      saveState();
      renderBooks();

      const candidate = detectPasswordCandidate(state.searchTerm);
      if (!candidate) {
        state.autoAttemptedPassword = '';
        setSearchTip('在此框输入关键词可筛选书籍。', '');
        return;
      }

      if (state.autoAttemptedPassword === candidate) {
        return;
      }
      state.autoAttemptedPassword = candidate;
      tryEnterABusinessByPassword(candidate);
    });

    el.searchInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const value = String(el.searchInput.value || '').trim();
      state.searchTerm = value;
      saveState();
      renderBooks();
      setSearchTip('已按关键词筛选书籍。', 'success');
    });

    el.searchBtn.addEventListener('click', () => {
      state.searchTerm = String(el.searchInput.value || '').trim();
      saveState();
      renderBooks();
      setSearchTip('已按关键词筛选书籍。', 'success');
    });

    el.importTxtBtn.addEventListener('click', () => {
      el.txtFileInput.value = '';
      el.txtFileInput.click();
    });

    el.txtFileInput.addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const text = await file.text();
      const parsedBook = parseTxtIntoBook(file.name, text);
      if (!parsedBook) {
        setSearchTip('导入失败：TXT 内容为空。', 'error');
        return;
      }

      const customBooks = getCustomBooks();
      customBooks.unshift(parsedBook);
      setCustomBooks(customBooks.slice(0, 12));

      state.activeBookId = parsedBook.id;
      state.activeChapterIndex = 0;
      mergeLibrary();
      saveState();
      renderAll();
      setSearchTip(`已导入《${parsedBook.title}》。`, 'success');
    });

    el.resetCustomBtn.addEventListener('click', () => {
      setCustomBooks([]);
      mergeLibrary();
      saveState();
      renderAll();
      setSearchTip('已清空本地导入书籍。', 'success');
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        el.prevChapterBtn.click();
      }
      if (event.key === 'ArrowRight') {
        el.nextChapterBtn.click();
      }
    });
  }

  async function initVersion() {
    try {
      if (!window.electronAPI || typeof window.electronAPI.invoke !== 'function') {
        return;
      }
      const version = await window.electronAPI.invoke('app:get-version');
      if (version) {
        el.appVersionBadge.textContent = `v${version}`;
      }
    } catch (error) {
      // ignore version loading errors
    }
  }

  async function initPasswordCandidates() {
    if (!window.electronAPI || typeof window.electronAPI.invoke !== 'function') {
      return;
    }
    try {
      const authState = await window.electronAPI.invoke('module-auth:get-state');
      const fromState = authState && authState.defaultPasswords && authState.defaultPasswords.lottery;
      if (typeof fromState === 'string' && fromState.trim()) {
        const merged = new Set([fromState.trim(), ...state.passwordCandidates]);
        state.passwordCandidates = Array.from(merged);
      }
    } catch (error) {
      // ignore and use fallback candidate
    }
  }

  async function init() {
    loadState();
    bindEvents();
    renderTheme();
    renderFontSize();
    renderSearch();
    el.readerContent.innerHTML = '<p class="empty">正在加载内置全本书库...</p>';

    await initPasswordCandidates();
    state.builtInLibrary = await loadBuiltInLibrary();
    mergeLibrary();
    renderAll();
    initVersion();

    if (!state.searchTerm) {
      setSearchTip('在此框输入关键词可筛选书籍。', '');
    }
  }

  init();
})();
