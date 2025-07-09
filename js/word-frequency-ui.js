// js/word-frequency-ui.js - 简化重构版 v1.0 (专注可用性和双模式搜索)
window.EnglishSite = window.EnglishSite || {};

// 🎯 简化的搜索管理器 - 移除过度复杂的状态机
class SimplifiedSearchManager {
    constructor(analyzer, container) {
        this.analyzer = analyzer;
        this.container = container;

        // 🎯 简单的搜索状态 - 只保留必要信息
        this.state = {
            isSearching: false,
            query: '',
            mode: 'intelligent', // 'intelligent' | 'exact'
            results: [],
            hasResults: false,
            error: null
        };

        // 🎯 简单防抖 - 移除复杂的序列号管理
        this.debounceTimer = null;
        this.debounceDelay = 300;

        // 🎯 简单缓存 - 移除复杂的LRU和Base64编码
        this.cache = new Map();
        this.maxCacheSize = 50;

        console.log('✅ 简化搜索管理器已初始化');
    }

    // 🎯 统一搜索入口 - 简化逻辑
    handleSearch(query) {
        // 清除之前的防抖定时器
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // 输入验证 - 简化规则
        const cleanQuery = this.cleanInput(query);

        if (!cleanQuery) {
            this.clearSearch();
            return;
        }

        // 防抖执行搜索
        this.debounceTimer = setTimeout(() => {
            this.executeSearch(cleanQuery);
        }, this.debounceDelay);
    }

    // 🎯 修复的输入清理 - 解决空格问题
    cleanInput(input) {
        if (!input || typeof input !== 'string') return '';

        // 🔧 修复：简化处理，避免意外插入空格
        const cleaned = input
            .toLowerCase()
            .trim()
            .replace(/[^a-zA-Z]/g, '') // ← 修复：只保留字母，移除所有其他字符
            .trim();

        // 简单验证：长度2-50，包含字母
        if (cleaned.length < 2 || cleaned.length > 50) return '';

        return cleaned;
    }

    // 🎯 执行搜索 - 统一入口
    async executeSearch(query) {
        try {
            this.state.isSearching = true;
            this.state.query = query;
            this.state.error = null;

            console.log(`🔍 执行${this.state.mode}搜索: "${query}"`);

            // 检查缓存
            const cacheKey = `${query}_${this.state.mode}`;
            if (this.cache.has(cacheKey)) {
                console.log('📦 使用缓存结果');
                const cachedResults = this.cache.get(cacheKey);
                this.handleSearchResults(cachedResults, query);
                return;
            }

            // 执行对应模式的搜索
            let results;
            if (this.state.mode === 'intelligent') {
                results = await this.executeIntelligentSearch(query);
            } else {
                results = await this.executeExactSearch(query);
            }

            // 缓存结果
            this.setCacheResult(cacheKey, results);

            // 处理结果
            this.handleSearchResults(results, query);

        } catch (error) {
            console.error('搜索执行失败:', error);
            this.handleSearchError(error);
        } finally {
            this.state.isSearching = false;
        }
    }

    // 🎯 智能搜索 - 基于词干合并
    async executeIntelligentSearch(query) {
        if (!this.analyzer || typeof this.analyzer.searchWords !== 'function') {
            throw new Error('智能搜索功能不可用');
        }

        const results = this.analyzer.searchWords(query);
        console.log(`📊 智能搜索找到 ${results.length} 个结果`);

        // 统一结果格式
        return results.map(item => ({
            ...item,
            searchMode: 'intelligent',
            isIntelligentMatch: true,
            isExactMatch: false
        }));
    }

    // 🎯 精确搜索 - 基于原文匹配
    async executeExactSearch(query) {
        if (!this.analyzer || typeof this.analyzer.searchWordsExact !== 'function') {
            throw new Error('精确搜索功能不可用');
        }

        const results = this.analyzer.searchWordsExact(query);
        console.log(`🎯 精确搜索找到 ${results.length} 个结果`);

        // 统一结果格式
        return results.map(item => ({
            ...item,
            searchMode: 'exact',
            isIntelligentMatch: false,
            isExactMatch: true
        }));
    }

    // 🎯 处理搜索结果
    handleSearchResults(results, query) {
        this.state.results = results || [];
        this.state.hasResults = this.state.results.length > 0;

        console.log(`✅ 搜索完成: ${this.state.results.length} 个结果`);

        // 触发UI更新
        this.container.dispatchEvent(new CustomEvent('searchComplete', {
            detail: {
                query: query,
                mode: this.state.mode,
                results: this.state.results,
                hasResults: this.state.hasResults
            }
        }));
    }

    // 🎯 处理搜索错误
    handleSearchError(error) {
        this.state.error = error.message;
        console.error('🚨 搜索错误:', error);

        this.container.dispatchEvent(new CustomEvent('searchError', {
            detail: {
                error: error.message
            }
        }));
    }

    // 🎯 切换搜索模式
    switchMode(newMode) {
        if (newMode !== 'intelligent' && newMode !== 'exact') {
            console.warn('无效的搜索模式:', newMode);
            return;
        }

        const oldMode = this.state.mode;
        this.state.mode = newMode;

        console.log(`🔄 搜索模式切换: ${oldMode} -> ${newMode}`);

        // 如果有当前查询，重新搜索
        if (this.state.query) {
            this.executeSearch(this.state.query);
        }

        // 触发模式切换事件
        this.container.dispatchEvent(new CustomEvent('searchModeChanged', {
            detail: {
                oldMode,
                newMode
            }
        }));
    }

    // 🎯 清除搜索
    clearSearch() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        this.state = {
            isSearching: false,
            query: '',
            mode: this.state.mode, // 保持当前模式
            results: [],
            hasResults: false,
            error: null
        };

        console.log('🧹 搜索已清除');

        this.container.dispatchEvent(new CustomEvent('searchCleared'));
    }

    // 🎯 简单缓存管理
    setCacheResult(key, result) {
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, result);
    }

    // 🎯 获取当前状态
    getState() {
        return {
            ...this.state
        };
    }

    // 🎯 销毁管理器
    destroy() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.cache.clear();
        console.log('🧹 搜索管理器已销毁');
    }
}

// 🎯 简化的WordFrequencyUI - 专注核心功能
class WordFrequencyUI {
    constructor(container, manager) {
        this.container = container;
        this.manager = manager;
        this.currentView = 'cloud';
        this.currentFilter = 'all';
        this.selectedWord = null;
        this.isInitialized = false;

        // 🎯 创建简化的搜索管理器
        this.searchManager = new SimplifiedSearchManager(manager, container);

        // DOM缓存
        this.domCache = new Map();

        // 虚拟滚动设置
        this.virtualScroll = {
            containerHeight: 600,
            itemHeight: 50,
            isEnabled: true
        };

        // 移动端检测
        this.isMobile = this.detectMobile();

        // 数据缓存
        this.dataCache = new Map();
        this.currentWordsData = null;

        // 渲染和初始化
        this.render();
        this.setupEventListeners();
        this.initializeVirtualScroll();

        console.log('✅ WordFrequencyUI已初始化');
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            window.innerWidth <= 768;
    }

    getElement(selector) {
        if (!this.domCache.has(selector)) {
            const element = this.container.querySelector(selector);
            if (element) {
                this.domCache.set(selector, element);
            }
        }
        return this.domCache.get(selector);
    }

    render() {
        this.container.innerHTML = `
            <div class="word-freq-page">
                <header class="word-freq-header">
                    <div class="header-title">
                        <h1>📊 词频统计分析</h1>
                        <div class="stats-summary" id="stats-summary">
                            <span class="stat-item">分析中...</span>
                        </div>
                    </div>
                    
                    <div class="word-freq-controls">
                        <div class="search-section">
                            <div class="search-box">
                                <input type="text" id="word-search" placeholder="搜索单词..." autocomplete="off" />
                                <button id="search-btn" title="搜索">🔍</button>
                                <button id="clear-search" title="清除搜索">✕</button>
                            </div>
                            
                            <div class="search-mode-tabs" id="search-mode-tabs">
                                <button class="search-mode-tab active" data-mode="intelligent" title="智能搜索：基于词干合并，搜索take会找到take/takes/took/taken">
                                    🧠 智能搜索
                                </button>
                                <button class="search-mode-tab" data-mode="exact" title="精确搜索：基于原文匹配，搜索taken只找包含taken的文章">
                                    🎯 精确搜索
                                </button>
                            </div>
                            
                            <div class="search-status" id="search-status" style="display: none;">
                                <small class="status-text"></small>
                            </div>
                        </div>
                        
                        <div class="view-section">
                            <div class="view-toggles">
                                <button class="view-btn active" data-view="cloud" title="词云视图">☁️ 词云</button>
                                <button class="view-btn" data-view="list" title="列表视图">📋 列表</button>
                            </div>
                        </div>
                        
                        <div class="filter-section">
                            <select id="freq-filter" title="频次筛选">
                                <option value="all">所有频次</option>
                                <option value="high">高频词 (10+)</option>
                                <option value="medium">中频词 (5-9)</option>
                                <option value="low">低频词 (2-4)</option>
                                <option value="rare">稀有词 (1次)</option>
                            </select>
                        </div>
                    </div>
                </header>
                
                <main class="word-freq-content">
                    <div class="loading-section" id="freq-loading">
                        <div class="loading-indicator">
                            <div class="spinner"></div>
                            <div class="loading-text">正在分析全站词频...</div>
                            <div class="progress-container">
                                <div class="progress-bar">
                                    <div class="progress-fill" id="progress-fill"></div>
                                </div>
                                <div class="progress-text" id="progress-text">0%</div>
                            </div>
                            <div class="loading-tips">
                                <small>💡 首次分析需要一些时间，后续访问将使用缓存数据</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="word-freq-display" id="freq-display" style="display: none;">
                        <div class="virtual-scroll-container" id="virtual-container">
                            <div class="virtual-scroll-content" id="virtual-content"></div>
                        </div>
                    </div>
                    
                    <div class="word-details-panel" id="word-details" style="display: none;">
                        <!-- 单词详情面板 -->
                    </div>
                </main>
            </div>
        `;

        this.loadStyles();
        this.cacheKeyElements();
    }

    cacheKeyElements() {
        const selectors = [
            '#word-search', '#search-btn', '#clear-search', '#freq-filter',
            '#freq-loading', '#freq-display', '#word-details', '#stats-summary',
            '#progress-fill', '#progress-text', '.view-btn',
            '#virtual-container', '#virtual-content',
            '#search-mode-tabs', '.search-mode-tab', '#search-status'
        ];

        selectors.forEach(selector => this.getElement(selector));
    }

    // 🎯 简化的事件监听 - 移除复杂的事件委托
    setupEventListeners() {
        // 搜索输入事件
        const searchInput = this.getElement('#word-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSearchButton();
                }
            });
        }

        // 搜索按钮
        const searchBtn = this.getElement('#search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.handleSearchButton();
            });
        }

        // 清除搜索按钮
        const clearBtn = this.getElement('#clear-search');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }

        // 搜索模式切换
        const modeTabs = this.container.querySelectorAll('.search-mode-tab');
        modeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.handleModeSwitch(tab.dataset.mode);
            });
        });

        // 视图切换
        const viewBtns = this.container.querySelectorAll('.view-btn');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleViewToggle(btn.dataset.view);
            });
        });

        // 频次筛选
        const filterSelect = this.getElement('#freq-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.handleFilterChange(e.target.value);
            });
        }

        // 🎯 搜索管理器事件
        this.container.addEventListener('searchComplete', (e) => {
            this.handleSearchComplete(e.detail);
        });

        this.container.addEventListener('searchError', (e) => {
            this.handleSearchError(e.detail);
        });

        this.container.addEventListener('searchCleared', () => {
            this.handleSearchCleared();
        });

        this.container.addEventListener('searchModeChanged', (e) => {
            this.handleSearchModeChanged(e.detail);
        });

        // 单词和文章点击事件 - 使用事件委托
        this.container.addEventListener('click', (e) => {
            this.handleDelegatedClick(e);
        });

        // 虚拟滚动
        const virtualContainer = this.getElement('#virtual-container');
        if (virtualContainer) {
            virtualContainer.addEventListener('scroll', this.throttle(this.handleVirtualScroll.bind(this), 50));
        }

        // 进度事件
        document.addEventListener('wordFreqProgress', (e) => {
            this.updateProgress(e.detail.progress);
        });

        console.log('✅ 事件监听器已设置');
    }

    // 🎯 搜索输入处理 - 简化逻辑
    handleSearchInput(value) {
        const hasValue = value && value.trim().length > 0;

        // 更新UI状态
        this.updateSearchUI(hasValue);

        // 执行搜索
        this.searchManager.handleSearch(value);
    }

    // 🎯 更新搜索UI状态
    updateSearchUI(hasValue) {
        const clearBtn = this.getElement('#clear-search');
        const modeTabs = this.getElement('#search-mode-tabs');

        if (clearBtn) {
            clearBtn.style.display = hasValue ? 'inline-block' : 'none';
        }

        if (modeTabs) {
            modeTabs.style.display = hasValue ? 'flex' : 'flex'; // 始终显示模式选择
        }
    }

    // 🎯 搜索按钮处理
    handleSearchButton() {
        const searchInput = this.getElement('#word-search');
        if (searchInput) {
            const query = searchInput.value.trim();
            if (query) {
                this.searchManager.executeSearch(query);
            }
        }
    }

    // 🎯 模式切换处理
    handleModeSwitch(newMode) {
        // 更新UI
        this.container.querySelectorAll('.search-mode-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === newMode);
        });

        // 切换搜索管理器模式
        this.searchManager.switchMode(newMode);
    }

    // 🎯 清除搜索
    clearSearch() {
        const searchInput = this.getElement('#word-search');
        if (searchInput) {
            searchInput.value = '';
        }

        this.searchManager.clearSearch();
        this.updateSearchUI(false);
    }

// 🎯 搜索完成处理 - 修复版
handleSearchComplete(detail) {
    const { query, mode, results, hasResults } = detail;
    
    console.log(`🎯 搜索完成: "${query}" (${mode}模式) - ${results.length}个结果`);
    
    // 🔧 强制清空DOM
    const display = this.getElement('#freq-display');
    const container = this.getElement('#virtual-container');
    
    if (display && container) {
        // 完全清空
        display.innerHTML = '';
        container.innerHTML = '';
        
        // 重建基础结构
        display.innerHTML = `
            <div class="word-freq-display" style="padding: 20px;">
                <div class="virtual-scroll-container" id="virtual-container">
                    <div class="virtual-scroll-content" id="virtual-content"></div>
                </div>
            </div>
        `;
    }
    
    // 重新获取元素
    this.domCache.clear();
    
    if (hasResults) {
        this.displaySearchResults(results, query, mode);
        this.showSearchStatus(`找到 ${results.length} 个结果`, 'success');
    } else {
        this.showNoResults(`未找到与 "${query}" 相关的结果`);
        this.showSearchStatus('未找到结果', 'warning');
    }
}

    // 🎯 搜索错误处理
    handleSearchError(detail) {
        console.error('🚨 搜索错误:', detail.error);
        this.showNoResults(`搜索出现错误: ${detail.error}`);
        this.showSearchStatus('搜索失败', 'error');
    }

    // 🎯 搜索清除处理
    handleSearchCleared() {
        console.log('🧹 搜索已清除，恢复正常显示');
        this.hideSearchStatus();
        this.displayCurrentView();
    }

    // 🔧 新增：清理之前的搜索结果显示
    clearPreviousResults() {
        const container = this.getElement('#virtual-container');
        const content = this.getElement('#virtual-content');
        const display = this.getElement('#freq-display');

        if (content) {
            content.innerHTML = '';
            content.style.height = 'auto';
            content.style.position = 'static';
        }

        if (container) {
            container.style.display = 'block';
        }

        if (display) {
            display.style.display = 'block';
        }

        console.log('🧹 已清理之前的搜索结果显示');
    }
    // 🎯 搜索模式变更处理
    handleSearchModeChanged(detail) {
        const {
            newMode
        } = detail;
        console.log(`🔄 搜索模式已切换到: ${newMode}`);

        const modeText = newMode === 'intelligent' ? '智能搜索模式' : '精确搜索模式';
        this.showSearchStatus(modeText, 'info');
    }

    // 🎯 显示搜索状态
    showSearchStatus(message, type = 'info') {
        const statusEl = this.getElement('#search-status');
        const textEl = statusEl?.querySelector('.status-text');

        if (statusEl && textEl) {
            textEl.textContent = message;
            statusEl.className = `search-status ${type}`;
            statusEl.style.display = 'block';

            // 自动隐藏非错误状态
            if (type !== 'error') {
                setTimeout(() => {
                    this.hideSearchStatus();
                }, 3000);
            }
        }
    }

    // 🎯 隐藏搜索状态
    hideSearchStatus() {
        const statusEl = this.getElement('#search-status');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
    }

    // 🎯 显示搜索结果 - 统一格式
    displaySearchResults(results, query, mode) {
        try {
            const container = this.getElement('#virtual-container');
            const content = this.getElement('#virtual-content');
            const display = this.getElement('#freq-display');

            if (!container || !content || !display) {
                throw new Error('搜索结果容器未找到');
            }

            // 清空内容
            content.innerHTML = '';
            content.style.height = 'auto';
            content.style.position = 'static';

            // 创建搜索结果容器
            const searchContainer = this.createSearchResultsContainer(query, mode, results.length);
            content.appendChild(searchContainer);

            // 根据视图模式渲染结果
            const resultsArea = searchContainer.querySelector('.search-results-area');
            if (this.currentView === 'cloud') {
                this.renderSearchResultsAsCloud(resultsArea, results);
            } else {
                this.renderSearchResultsAsList(resultsArea, results);
            }

            // 显示容器
            container.style.display = 'block';
            display.style.display = 'block';
            container.scrollTop = 0;

            console.log(`✅ 搜索结果已显示: ${results.length}个结果`);

        } catch (error) {
            console.error('显示搜索结果失败:', error);
            this.showNoResults('显示搜索结果时出错');
        }
    }

    // 🎯 创建搜索结果容器
    createSearchResultsContainer(query, mode, resultCount) {
        const container = document.createElement('div');
        container.className = 'search-results-wrapper';
        container.style.cssText = `
            width: 100%;
            background: white;
            overflow: visible;
            padding: 20px;
        `;

        // 搜索标题
        const header = this.createSearchHeader(query, mode, resultCount);
        container.appendChild(header);

        // 结果区域
        const resultsArea = document.createElement('div');
        resultsArea.className = 'search-results-area';
        resultsArea.style.cssText = `
            margin-top: 20px;
            background: white;
        `;
        container.appendChild(resultsArea);

        return container;
    }

    // 🎯 创建搜索标题
    createSearchHeader(query, mode, resultCount) {
        const header = document.createElement('div');
        header.className = 'search-results-header';
        header.style.cssText = `
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        `;

        const modeText = mode === 'intelligent' ? '智能搜索' : '精确搜索';
        const modeDescription = mode === 'intelligent' ?
            '找到了所有相关变形词的合并结果' :
            `只显示包含确切词汇 "${query}" 的文章`;

        header.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 20px; font-weight: 600;">
                    ${mode === 'intelligent' ? '🧠' : '🎯'} ${modeText}结果
                </h3>
                <div style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 15px; font-size: 14px; font-weight: 500;">
                    ${resultCount} 个结果
                </div>
            </div>
            <div style="background: rgba(255,255,255,0.1); padding: 12px 16px; border-radius: 6px; font-size: 14px; line-height: 1.4;">
                <div style="margin-bottom: 8px;">
                    <strong>搜索词：</strong> "${query}"
                </div>
                <div style="opacity: 0.9;">
                    ${modeDescription}
                </div>
            </div>
            <div style="margin-top: 12px; font-size: 12px; opacity: 0.8; text-align: center;">
                💡 可以通过上方的模式选项卡切换搜索方式
            </div>
        `;

        return header;
    }

    // 🎯 以词云形式渲染搜索结果
    renderSearchResultsAsCloud(container, results) {
        const maxCount = results[0]?.totalCount || 1;
        const minCount = results[results.length - 1]?.totalCount || 1;

        const cloudContainer = document.createElement('div');
        cloudContainer.className = 'search-word-cloud';
        cloudContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            gap: 15px;
            padding: 30px 20px;
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-radius: 12px;
            min-height: 150px;
            border: 2px solid #dee2e6;
        `;

        results.forEach(item => {
            const wordElement = this.createWordCloudItem(item, minCount, maxCount);
            cloudContainer.appendChild(wordElement);
        });

        container.appendChild(cloudContainer);
    }

    // 🎯 创建词云项目
    createWordCloudItem(item, minCount, maxCount) {
        const wordElement = document.createElement('span');
        wordElement.className = 'word-item';
        wordElement.dataset.word = item.word;

        const fontSize = this.calculateFontSize(item.totalCount, minCount, maxCount);
        const color = this.getWordColor(item.totalCount, maxCount);

        wordElement.style.cssText = `
            font-size: ${fontSize}px; 
            color: ${color};
            margin: 5px 8px;
            padding: 8px 12px;
            cursor: pointer;
            border-radius: 20px;
            background: ${item.isExactMatch ? 'rgba(40, 167, 69, 0.15)' : 'rgba(0, 123, 255, 0.1)'};
            border: 2px solid ${item.isExactMatch ? 'rgba(40, 167, 69, 0.4)' : 'rgba(0, 123, 255, 0.3)'};
            transition: all 0.3s ease;
            font-weight: 600;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;

        wordElement.textContent = item.word;
        wordElement.title = `${item.word}: ${item.totalCount} 次，出现在 ${item.articleCount} 篇文章中`;

        // 添加悬停效果
        wordElement.addEventListener('mouseenter', () => {
            wordElement.style.transform = 'translateY(-2px)';
            wordElement.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        });

        wordElement.addEventListener('mouseleave', () => {
            wordElement.style.transform = 'translateY(0)';
            wordElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });

        return wordElement;
    }

    // 🎯 以列表形式渲染搜索结果
    renderSearchResultsAsList(container, results) {
        const listContainer = document.createElement('div');
        listContainer.className = 'search-word-list';
        listContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 16px;
        `;

        results.forEach(item => {
            const listItem = this.createWordListItem(item);
            listContainer.appendChild(listItem);
        });

        container.appendChild(listContainer);
    }

    // 🎯 创建列表项目
    createWordListItem(item) {
        const listItem = document.createElement('div');
        listItem.className = 'word-list-item';
        listItem.dataset.word = item.word;

        listItem.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border: 2px solid ${item.isExactMatch ? '#28a745' : '#e9ecef'};
            border-radius: 12px;
            cursor: pointer;
            background: ${item.isExactMatch ? 'rgba(40, 167, 69, 0.05)' : 'white'};
            transition: all 0.3s ease;
            box-sizing: border-box;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        `;

        const matchTypeText = item.isExactMatch ? '精确匹配' : '智能匹配';
        const matchColor = item.isExactMatch ? '#28a745' : '#007bff';

        listItem.innerHTML = `
            <div class="word-info" style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <strong style="font-size: 18px; color: #2c3e50;">${item.word}</strong>
                    <span style="background: ${matchColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase;">${matchTypeText}</span>
                </div>
                <div style="color: #6c757d; font-size: 14px; display: flex; gap: 20px;">
                    <span>📄 ${item.articleCount} 篇文章</span>
                    <span>🔢 总计 ${item.totalCount} 次</span>
                </div>
            </div>
            <div class="word-count" style="background: linear-gradient(135deg, ${matchColor}, ${matchColor}dd); color: white; padding: 12px 20px; border-radius: 20px; font-weight: 700; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                ${item.totalCount}
            </div>
        `;

        // 添加悬停效果
        listItem.addEventListener('mouseenter', () => {
            listItem.style.transform = 'translateY(-2px)';
            listItem.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        });

        listItem.addEventListener('mouseleave', () => {
            listItem.style.transform = 'translateY(0)';
            listItem.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
        });

        return listItem;
    }

    // 工具方法
    calculateFontSize(count, minCount, maxCount) {
        const minSize = this.isMobile ? 12 : 14;
        const maxSize = this.isMobile ? 28 : 36;

        if (maxCount === minCount) return minSize;

        const ratio = (count - minCount) / (maxCount - minCount);
        return Math.round(minSize + ratio * (maxSize - minSize));
    }

    getWordColor(count, maxCount) {
        const intensity = count / maxCount;
        if (intensity > 0.8) return '#d32f2f';
        if (intensity > 0.6) return '#f57c00';
        if (intensity > 0.4) return '#388e3c';
        if (intensity > 0.2) return '#1976d2';
        return '#757575';
    }

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 🎯 委托点击处理 - 简化逻辑
    handleDelegatedClick(e) {
        const target = e.target;

        try {
            // 关闭详情按钮
            if (target.closest('.close-details-btn')) {
                e.preventDefault();
                this.hideWordDetails();
                return;
            }

            // 文章项目点击
            if (target.closest('.article-item')) {
                e.preventDefault();
                this.handleArticleClick(target.closest('.article-item'));
                return;
            }

            // 单词项目点击
            if (target.closest('.word-item, .word-list-item')) {
                e.preventDefault();
                this.handleWordClick(target.closest('.word-item, .word-list-item'));
                return;
            }

        } catch (error) {
            console.error('点击处理失败:', error);
        }
    }

    // 处理单词点击
    handleWordClick(wordElement) {
        const word = wordElement.dataset.word;

        if (!word || word.trim() === '') {
            console.error('无效的单词数据:', word);
            return;
        }

        const details = this.manager.getWordDetails(word.trim());
        if (!details) {
            console.warn('未找到单词详情:', word);
            return;
        }

        this.selectedWord = word.trim();
        this.showWordDetails(details);
    }

    // 显示单词详情
    showWordDetails(details) {
        const {
            word,
            totalCount,
            articleCount,
            articles
        } = details;

        const panel = this.getElement('#word-details');
        if (!panel) return;

        // 创建详情内容
        const detailsHTML = this.createWordDetailsHTML(word, totalCount, articleCount, articles);
        panel.innerHTML = detailsHTML;
        panel.style.display = 'block';

        // 滚动到详情面板
        setTimeout(() => {
            panel.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }, 100);
    }

    // 创建单词详情HTML
    createWordDetailsHTML(word, totalCount, articleCount, articles) {
        const statsItems = [
            ['总出现次数', totalCount, '#007bff'],
            ['出现文章数', articleCount, '#28a745'],
            ['平均每篇', (totalCount / articleCount).toFixed(1), '#fd7e14']
        ];

        const statsHTML = statsItems.map(([label, value, color]) => `
            <div class="stat" style="background: linear-gradient(135deg, ${color}15, ${color}05); border: 2px solid ${color}30; padding: 16px; border-radius: 12px; text-align: center; transition: transform 0.2s ease;">
                <div style="color: ${color}; font-weight: 700; font-size: 24px; margin-bottom: 4px;">${value}</div>
                <div style="color: #6c757d; font-size: 14px; font-weight: 500;">${label}</div>
            </div>
        `).join('');

        const articlesHTML = articles.map(article => this.createArticleItemHTML(article, word)).join('');

        return `
            <div class="word-details" style="background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); padding: 24px; margin: 20px 0;">
                <h3 style="margin: 0 0 20px 0; color: #2c3e50; border-bottom: 2px solid #007bff; padding-bottom: 10px; font-size: 24px;">
                    📝 "${word}" 详细分析
                </h3>
                
                <div class="word-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 25px;">
                    ${statsHTML}
                </div>
                
                <h4 style="color: #2c3e50; margin: 30px 0 15px 0; font-size: 18px;">
                    📚 相关文章 (按出现频次排序)
                </h4>
                
                <div class="article-list" style="display: grid; gap: 16px; margin-top: 20px; max-height: 500px; overflow-y: auto; padding-right: 8px;">
                    ${articlesHTML}
                </div>
                
                <button class="close-details-btn" style="background: linear-gradient(135deg, #6c757d, #5a6268); color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; margin-top: 24px; font-size: 14px; font-weight: 600; transition: all 0.3s ease; display: block; margin-left: auto; margin-right: auto;">
                    ✕ 关闭详情
                </button>
            </div>
        `;
    }

    // 创建文章项目HTML
    createArticleItemHTML(article, word) {
        const contextsHTML = article.contexts && article.contexts.length > 0 ?
            article.contexts.map(ctx => `
                <div class="context" style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); padding: 12px 16px; border-radius: 8px; margin: 8px 0; font-size: 13px; line-height: 1.5; border-left: 3px solid #28a745; font-family: 'Segoe UI', system-ui, sans-serif;">
                    ${ctx}
                </div>
            `).join('') : '';

        return `
            <div class="article-item" data-article-id="${article.id}" data-word="${word}" style="position: relative; padding: 20px 24px; background: white; border-radius: 12px; border-left: 4px solid #007bff; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); border: 1px solid #e9ecef;">
                <div class="article-title" style="font-weight: 600; color: #2c3e50; margin-bottom: 12px; font-size: 16px; line-height: 1.4;">
                    ${article.title}
                </div>
                <div class="article-stats" style="margin-bottom: 12px;">
                    <span style="color: #6c757d; font-size: 14px;">在此文章中出现 </span>
                    <strong style="color: #007bff; font-size: 16px; font-weight: 700;">${article.count}</strong>
                    <span style="color: #6c757d; font-size: 14px;"> 次</span>
                    <span class="click-hint" style="font-size: 12px; color: #007bff; opacity: 0; transition: opacity 0.3s; margin-left: 15px; font-weight: 500;">👆 点击跳转并高亮</span>
                </div>
                ${contextsHTML ? `<div class="contexts" style="margin-top: 16px;">${contextsHTML}</div>` : ''}
            </div>
        `;
    }

    // 隐藏单词详情
    hideWordDetails() {
        const panel = this.getElement('#word-details');
        if (panel) {
            panel.style.display = 'none';
            panel.innerHTML = '';
        }
        this.selectedWord = null;
    }

    // 处理文章点击
    handleArticleClick(articleElement) {
        const articleId = articleElement.dataset.articleId;
        const word = articleElement.dataset.word || this.selectedWord;

        if (!word || !articleId) {
            console.error('跳转数据无效:', {
                word,
                articleId
            });
            return;
        }

        this.prepareHighlightData(word.trim());
        this.performJump(articleId.trim(), word.trim());
    }

    // 准备高亮数据
    prepareHighlightData(word) {
        sessionStorage.removeItem('highlightWord');
        sessionStorage.removeItem('highlightSource');
        sessionStorage.removeItem('highlightVariants');

        setTimeout(() => {
            sessionStorage.setItem('highlightWord', word);
            sessionStorage.setItem('highlightSource', 'wordFreq');

            const wordDetails = this.manager.getWordDetails(word);
            if (wordDetails && wordDetails.variants) {
                const variants = wordDetails.variants.map(([variant]) => variant).filter(v => v && v.trim());
                if (variants.length > 0) {
                    sessionStorage.setItem('highlightVariants', JSON.stringify(variants));
                }
            }
        }, 50);
    }

    // 执行跳转
    performJump(articleId, word) {
        this.showJumpNotification(articleId, word);

        setTimeout(() => {
            if (window.app?.navigation?.navigateToChapter) {
                window.app.navigation.navigateToChapter(articleId);
            } else if (window.location.pathname.includes('word-frequency.html')) {
                window.location.href = `index.html#${articleId}`;
            } else {
                window.location.hash = articleId;
            }
        }, 100);
    }

    // 显示跳转通知
    showJumpNotification(articleId, word) {
        document.querySelectorAll('[data-jump-notification]').forEach(el => el.remove());

        const notification = document.createElement('div');
        notification.setAttribute('data-jump-notification', 'true');
        notification.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: linear-gradient(135deg, #28a745, #20c997); color: white;
            padding: 12px 20px; border-radius: 25px; z-index: 10000;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
            font-size: 14px; font-weight: 500; max-width: 400px;
            backdrop-filter: blur(10px);
        `;

        notification.innerHTML = `🚀 正在跳转到文章 (高亮 "${word}")`;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 4000);
    }

    // 其他必要方法（保持简化）
    handleViewToggle(view) {
        this.container.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        this.currentView = view;
        this.clearDataCache();
        this.initializeVirtualScroll();

        // 如果在搜索状态，重新显示搜索结果
        const searchState = this.searchManager.getState();
        if (searchState.hasResults) {
            this.displaySearchResults(searchState.results, searchState.query, searchState.mode);
        } else {
            this.displayCurrentView();
        }
    }

    handleFilterChange(filter) {
        this.currentFilter = filter;
        this.clearDataCache();

        const searchState = this.searchManager.getState();
        if (searchState.hasResults) {
            // 在搜索状态下不应用频次筛选
            return;
        }

        this.displayCurrentView();
    }

    // 初始化和其他核心方法保持不变...
    async initialize() {
        this.showLoading();

        try {
            await this.manager.waitForReady();
            this.isInitialized = true;
            this.hideLoading();
            this.updateStatsSummary();
            this.displayCurrentView();
        } catch (error) {
            console.error('UI初始化失败:', error);
            this.showError('初始化失败: ' + error.message);
        }
    }

    displayCurrentView() {
        if (!this.isInitialized) return;

        // 检查是否在搜索状态
        const searchState = this.searchManager.getState();
        if (searchState.hasResults) {
            return; // 在搜索状态下不覆盖搜索结果
        }

        switch (this.currentView) {
            case 'cloud':
                this.displayWordCloudVirtual();
                break;
            case 'list':
                this.displayWordListVirtual();
                break;
        }
    }

    displayWordCloudVirtual() {
        const words = this.getFilteredWords();

        if (words.length === 0) {
            this.showNoResults();
            return;
        }

        this.currentWordsData = words;
        this.setupVirtualScrollForNormalView(words);
        this.renderWordCloudView(words);
    }

    displayWordListVirtual() {
        const words = this.getFilteredWords();

        if (words.length === 0) {
            this.showNoResults();
            return;
        }

        this.currentWordsData = words;
        this.setupVirtualScrollForNormalView(words);
        this.renderWordListView(words);
    }

    setupVirtualScrollForNormalView(words) {
        const container = this.getElement('#virtual-container');
        const content = this.getElement('#virtual-content');
        const display = this.getElement('#freq-display');

        if (container && content && display) {
            this.virtualScroll.totalItems = words.length;
            this.virtualScroll.itemHeight = this.currentView === 'list' ? 80 : 35;
            this.virtualScroll.isEnabled = true;

            container.style.display = 'block';
            display.style.display = 'block';
            container.scrollTop = 0;
        }
    }

    renderWordCloudView(words) {
        const content = this.getElement('#virtual-content');
        if (!content) return;

        const maxCount = words[0]?.totalCount || 1;
        const minCount = words[words.length - 1]?.totalCount || 1;

        content.innerHTML = '';
        content.style.height = 'auto';
        content.style.position = 'static';

        const cloudContainer = document.createElement('div');
        cloudContainer.className = 'word-cloud-container';
        cloudContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            gap: 15px;
            padding: 30px 20px;
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-radius: 12px;
            min-height: 200px;
        `;

        words.slice(0, 200).forEach(item => { // 限制显示数量以提高性能
            const wordElement = this.createWordCloudItem(item, minCount, maxCount);
            cloudContainer.appendChild(wordElement);
        });

        content.appendChild(cloudContainer);
    }

    renderWordListView(words) {
        const content = this.getElement('#virtual-content');
        if (!content) return;

        content.innerHTML = '';
        content.style.height = 'auto';
        content.style.position = 'static';

        const listContainer = document.createElement('div');
        listContainer.className = 'word-list-container';
        listContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding: 20px;
        `;

        words.slice(0, 100).forEach(item => { // 限制显示数量以提高性能
            const listItem = this.createWordListItem(item);
            listContainer.appendChild(listItem);
        });

        content.appendChild(listContainer);
    }

    getFilteredWords(limit = 1000) {
        const cacheKey = `${this.currentFilter}_${limit}`;

        if (this.dataCache.has(cacheKey)) {
            return this.dataCache.get(cacheKey);
        }

        let words = this.manager.getTopWords(limit);

        const filterMap = {
            'high': item => item.totalCount >= 10,
            'medium': item => item.totalCount >= 5 && item.totalCount <= 9,
            'low': item => item.totalCount >= 2 && item.totalCount <= 4,
            'rare': item => item.totalCount === 1
        };

        if (this.currentFilter !== 'all' && filterMap[this.currentFilter]) {
            words = words.filter(filterMap[this.currentFilter]);
        }

        this.dataCache.set(cacheKey, words);

        if (this.dataCache.size > 10) {
            const firstKey = this.dataCache.keys().next().value;
            this.dataCache.delete(firstKey);
        }

        return words;
    }

    clearDataCache() {
        this.dataCache.clear();
        this.currentWordsData = null;
    }

    showNoResults(message = '暂无数据') {
        const display = this.getElement('#freq-display');
        const container = this.getElement('#virtual-container');

        if (display && container) {
            // 🔧 修复：先清空容器内容
            container.innerHTML = '';
            container.style.display = 'none';

            // 然后显示无结果消息
            display.innerHTML = `
            <div class="no-results" style="text-align: center; padding: 60px 20px; color: #6c757d; background: linear-gradient(135deg, #f8f9fa, #ffffff); border-radius: 12px; margin: 20px 0; border: 2px dashed #dee2e6;">
                <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.6;">📭</div>
                <h3 style="color: #495057; margin-bottom: 12px; font-size: 20px;">${message}</h3>
                <p style="margin-bottom: 20px; font-size: 14px; line-height: 1.6;">尝试调整筛选条件或搜索其他关键词</p>
                <button onclick="document.querySelector('#clear-search').click()" 
                        style="margin-top: 15px; padding: 12px 24px; background: linear-gradient(135deg, #007bff, #0056b3); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);">
                    🔄 清除搜索，重新开始
                </button>
            </div>
        `;
            display.style.display = 'block';
        }
    }

    // 其他必要的工具方法...
    initializeVirtualScroll() {
        const container = this.getElement('#virtual-container');
        if (!container) return;

        this.virtualScroll.containerHeight = this.isMobile ?
            Math.min(window.innerHeight * 0.6, 500) :
            Math.min(window.innerHeight * 0.7, 600);

        container.style.height = `${this.virtualScroll.containerHeight}px`;
        container.style.overflowY = 'auto';
        container.style.position = 'relative';
    }

    handleVirtualScroll(e) {
        // 简化的虚拟滚动处理
        // 在搜索状态下不使用虚拟滚动
        if (this.searchManager.getState().hasResults) {
            return;
        }

        // 正常浏览状态的虚拟滚动逻辑
        // 这里可以根据需要实现具体的虚拟滚动逻辑
    }

    updateStatsSummary() {
        const summary = this.manager.getStatsSummary();
        const summaryEl = this.getElement('#stats-summary');

        if (summaryEl && summary) {
            const statsHTML = [
                `📚 ${summary.totalArticlesAnalyzed} 篇文章`,
                `📝 ${summary.totalUniqueWords.toLocaleString()} 个不同单词`,
                `🔢 ${summary.totalWordOccurrences.toLocaleString()} 总词次`,
                `📊 平均 ${summary.averageWordsPerArticle} 词/篇`
            ];

            summaryEl.innerHTML = statsHTML.map(stat =>
                `<span class="stat-item">${stat}</span>`
            ).join('');
        }
    }

    showLoading() {
        const loading = this.getElement('#freq-loading');
        const display = this.getElement('#freq-display');

        if (loading) loading.style.display = 'flex';
        if (display) display.style.display = 'none';
    }

    hideLoading() {
        const loading = this.getElement('#freq-loading');
        const display = this.getElement('#freq-display');

        if (loading) loading.style.display = 'none';
        if (display) display.style.display = 'block';
    }

    updateProgress(progress) {
        const progressFill = this.getElement('#progress-fill');
        const progressText = this.getElement('#progress-text');

        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${progress}%`;
    }

    showError(message) {
        const display = this.getElement('#freq-display');
        const container = this.getElement('#virtual-container');

        if (display && container) {
            container.style.display = 'none';
            display.innerHTML = `
                <div class="no-results" style="text-align: center; padding: 60px 20px; color: #6c757d; background: linear-gradient(135deg, #fff5f5, #ffffff); border-radius: 12px; margin: 20px 0; border: 2px solid #f56565;">
                    <div style="font-size: 48px; margin-bottom: 16px; color: #e53e3e;">❌</div>
                    <h2 style="color: #e53e3e; margin-bottom: 16px;">发生错误</h2>
                    <p style="margin-bottom: 24px; font-size: 14px; line-height: 1.6;">${message}</p>
                    <button onclick="location.reload()" style="margin-top: 15px; padding: 12px 24px; background: linear-gradient(135deg, #e53e3e, #c53030); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(229, 62, 62, 0.3);">
                        🔄 重新加载页面
                    </button>
                </div>
            `;
            display.style.display = 'block';
        }
        this.hideLoading();
    }

    refreshData() {
        if (this.isInitialized) {
            this.clearDataCache();
            this.updateStatsSummary();

            const searchState = this.searchManager.getState();
            if (searchState.hasResults) {
                this.searchManager.executeSearch(searchState.query);
            } else {
                this.displayCurrentView();
            }
        }
    }

    destroy() {
        console.log('🧹 开始销毁 WordFrequencyUI...');

        try {
            // 销毁搜索管理器
            if (this.searchManager) {
                this.searchManager.destroy();
            }

            // 清理缓存
            this.domCache.clear();
            this.dataCache.clear();

            // 移除样式
            const styleEl = document.getElementById('word-freq-styles');
            if (styleEl) styleEl.remove();

            // 清空引用
            this.container = null;
            this.manager = null;
            this.currentWordsData = null;
            this.searchManager = null;

            console.log('✅ WordFrequencyUI已完全销毁');

        } catch (error) {
            console.error('销毁过程中出错:', error);
        }
    }

    loadStyles() {
        if (document.getElementById('word-freq-styles')) return;

        const style = document.createElement('style');
        style.id = 'word-freq-styles';
        style.textContent = `
            .word-freq-page { padding: 20px; max-width: 1400px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; min-height: 100vh; }
            .word-freq-header { margin-bottom: 30px; border-bottom: 2px solid #e9ecef; padding-bottom: 20px; background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
            .header-title h1 { margin: 0 0 16px 0; color: #2c3e50; font-size: 2.2rem; font-weight: 700; }
            .stats-summary { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
            .stat-item { background: linear-gradient(135deg, #007bff15, #007bff05); padding: 12px 16px; border-radius: 20px; font-size: 0.9rem; color: #495057; border: 2px solid #007bff20; font-weight: 600; transition: all 0.3s ease; }
            .stat-item:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15); }
            .word-freq-controls { display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; margin-top: 20px; }
            .search-section { flex: 1; min-width: 300px; }
            .search-box { display: flex; gap: 8px; margin-bottom: 12px; }
            .search-box input { flex: 1; padding: 12px 20px; border: 2px solid #dee2e6; border-radius: 25px; font-size: 14px; outline: none; transition: all 0.3s ease; background: white; }
            .search-box input:focus { border-color: #007bff; box-shadow: 0 0 0 4px rgba(0, 123, 255, 0.1); transform: translateY(-1px); }
            .search-box button { padding: 12px 18px; border: none; border-radius: 20px; background: linear-gradient(135deg, #007bff, #0056b3); color: white; cursor: pointer; transition: all 0.3s ease; font-size: 14px; min-width: 48px; font-weight: 600; }
            .search-box button:hover { background: linear-gradient(135deg, #0056b3, #004085); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3); }
            #clear-search { background: linear-gradient(135deg, #6c757d, #5a6268) !important; }
            #clear-search:hover { background: linear-gradient(135deg, #5a6268, #495057) !important; }
            
            .search-mode-tabs { 
                display: flex; 
                gap: 6px; 
                background: #f8f9fa; 
                padding: 6px; 
                border-radius: 25px; 
                border: 2px solid #dee2e6; 
                margin-bottom: 12px;
                box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
            }
            .search-mode-tab { 
                padding: 10px 18px; 
                border: none; 
                background: transparent; 
                cursor: pointer; 
                border-radius: 20px; 
                transition: all 0.3s ease; 
                font-size: 13px; 
                white-space: nowrap; 
                min-width: 140px;
                color: #6c757d;
                font-weight: 600;
            }
            .search-mode-tab.active { 
                background: linear-gradient(135deg, #007bff, #0056b3); 
                color: white; 
                box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
                transform: translateY(-1px);
            }
            .search-mode-tab:not(.active):hover { 
                background: #e9ecef; 
                color: #495057;
                transform: translateY(-1px);
            }
            
            .search-status {
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                margin-top: 8px;
            }
            .search-status.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .search-status.warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
            .search-status.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            .search-status.info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
            
            .view-section .view-toggles { display: flex; gap: 8px; }
            .view-btn { padding: 12px 20px; border: 2px solid #dee2e6; border-radius: 25px; background: white; cursor: pointer; transition: all 0.3s ease; font-size: 14px; font-weight: 600; color: #6c757d; }
            .view-btn.active { background: linear-gradient(135deg, #28a745, #20c997); color: white; border-color: #28a745; box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3); transform: translateY(-1px); }
            .view-btn:not(.active):hover { background: #f8f9fa; border-color: #adb5bd; transform: translateY(-1px); }
            
            .filter-section select { padding: 12px 16px; border: 2px solid #dee2e6; border-radius: 25px; background: white; font-size: 14px; color: #495057; cursor: pointer; transition: all 0.3s ease; font-weight: 600; }
            .filter-section select:focus { outline: none; border-color: #007bff; box-shadow: 0 0 0 4px rgba(0, 123, 255, 0.1); }
            
            .word-freq-content { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); min-height: 600px; }
            
            .loading-section { display: flex; align-items: center; justify-content: center; height: 500px; background: linear-gradient(135deg, #f8f9fa, #ffffff); border-radius: 12px; }
            .loading-indicator { text-align: center; padding: 40px; }
            .spinner { width: 48px; height: 48px; border: 4px solid #f3f4f6; border-top: 4px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .loading-text { font-size: 18px; font-weight: 600; color: #2c3e50; margin-bottom: 20px; }
            .progress-container { margin: 20px 0; }
            .progress-bar { width: 300px; height: 8px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 0 auto; }
            .progress-fill { height: 100%; background: linear-gradient(90deg, #007bff, #28a745); transition: width 0.3s ease; border-radius: 10px; }
            .progress-text { margin-top: 12px; font-size: 14px; color: #6c757d; font-weight: 600; }
            .loading-tips { margin-top: 24px; color: #6c757d; font-size: 13px; line-height: 1.4; max-width: 300px; }
            
            .word-freq-display { padding: 20px; }
            .virtual-scroll-container { border-radius: 8px; overflow: hidden; background: #f8f9fa; }
            .virtual-scroll-content { position: relative; }
            
            .search-results-wrapper { background: white; border-radius: 8px; overflow: hidden; }
            .search-word-cloud .word-item:hover { transform: scale(1.05) translateY(-2px); }
            .search-word-list .word-list-item:hover { border-color: #007bff; }
            
            .word-item { display: inline-block; transition: all 0.2s ease; }
            .word-item:hover { transform: scale(1.05); background: rgba(0, 123, 255, 0.15) !important; }
            
            .word-list-item:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15); border-color: #007bff; }
            
            .word-details-panel { padding: 20px; background: #f8f9fa; border-radius: 12px; margin-top: 20px; }
            .article-item:hover .click-hint { opacity: 1 !important; }
            
            .no-results { animation: fadeIn 0.5s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            
            /* 移动端优化 */
            @media (max-width: 768px) {
                .word-freq-page { padding: 12px; }
                .word-freq-header { padding: 16px; }
                .header-title h1 { font-size: 1.8rem; }
                .word-freq-controls { flex-direction: column; gap: 16px; }
                .search-section { min-width: auto; }
                .stats-summary { gap: 12px; }
                .stat-item { padding: 10px 14px; font-size: 0.85rem; }
                .view-btn { padding: 10px 16px; font-size: 13px; }
                .search-mode-tab { min-width: 120px; padding: 8px 14px; font-size: 12px; }
                .word-details-panel { padding: 16px; }
                .virtual-scroll-container { margin: 0 -8px; }
            }
        `;

        document.head.appendChild(style);
    }
}

// 导出到全局
window.EnglishSite.WordFrequencyUI = WordFrequencyUI;
window.EnglishSite.SimplifiedSearchManager = SimplifiedSearchManager;

console.log('📊 词频UI模块已加载（简化重构版v1.0）- 专注可用性和双模式搜索');