/**
 * 📊 词频分析UI系统 - 稳定重构版 v4.0
 * 
 * 特性：
 * - 保持ES2020兼容性
 * - 高性能虚拟渲染和缓存
 * - 智能搜索和双模式切换
 * - 稳定的错误处理和恢复
 * - 100% 向后兼容API
 * - 渐进式现代化架构
 * 
 * @author Stable Word Frequency UI
 * @version 4.0.0
 * @date 2025-01-09
 */

(function() {
    'use strict';
    
    console.log('📊 Loading Stable Word Frequency UI v4.0...');
    
    // 确保全局命名空间
    window.EnglishSite = window.EnglishSite || {};
    
    // =================================================================
    // 1. 稳定的搜索管理器
    // =================================================================
    class StableSearchManager {
        constructor(analyzer, container, options = {}) {
            this.analyzer = analyzer;
            this.container = container;
            
            // 配置管理
            this.config = Object.assign({
                debounceDelay: 300,
                maxCacheSize: 100,
                maxResults: 500,
                debug: false
            }, options);
            
            // 搜索状态
            this.state = {
                isSearching: false,
                query: '',
                mode: 'intelligent', // 'intelligent' | 'exact'
                results: [],
                hasResults: false,
                error: null,
                lastSearchTime: 0
            };
            
            // 性能优化
            this.performance = {
                debounceTimer: null,
                searchCache: new Map(),
                requestId: 0,
                throttleDelay: 100
            };
            
            // 错误处理
            this.errorHandler = this.createErrorHandler();
            
            console.log('✅ StableSearchManager initialized');
        }
        
        createErrorHandler() {
            return {
                handle: (context, error) => {
                    const errorMsg = `[SearchManager.${context}] ${error.message}`;
                    console.warn(errorMsg);
                    
                    if (window.EnglishSite.ErrorHandler) {
                        window.EnglishSite.ErrorHandler.handle(`searchManager.${context}`, error);
                    }
                },
                
                safe: (fn, fallback, context) => {
                    try {
                        return fn();
                    } catch (error) {
                        this.handle(context, error);
                        return fallback;
                    }
                },
                
                safeAsync: async (fn, fallback, context) => {
                    try {
                        return await fn();
                    } catch (error) {
                        this.handle(context, error);
                        return fallback;
                    }
                }
            };
        }
        
        // 🔍 主搜索入口
        handleSearch(query) {
            return this.errorHandler.safe(() => {
                // 清除之前的防抖定时器
                if (this.performance.debounceTimer) {
                    clearTimeout(this.performance.debounceTimer);
                }
                
                // 输入清理和验证
                const cleanQuery = this.cleanAndValidateInput(query);
                
                if (!cleanQuery) {
                    this.clearSearch();
                    return;
                }
                
                // 防抖执行搜索
                this.performance.debounceTimer = setTimeout(() => {
                    this.executeSearch(cleanQuery);
                }, this.config.debounceDelay);
                
            }, null, 'handleSearch');
        }
        
        // 🧹 输入清理和验证
        cleanAndValidateInput(input) {
            if (!input || typeof input !== 'string') return '';
            
            // 简化但有效的清理
            const cleaned = input
                .toLowerCase()
                .trim()
                .replace(/[^a-zA-Z\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            // 验证长度和有效性
            if (cleaned.length < 2 || cleaned.length > 100) return '';
            if (!/[a-zA-Z]/.test(cleaned)) return '';
            
            return cleaned;
        }
        
        // 🚀 执行搜索
        async executeSearch(query) {
            const requestId = ++this.performance.requestId;
            
            return this.errorHandler.safeAsync(async () => {
                // 更新状态
                this.state.isSearching = true;
                this.state.query = query;
                this.state.error = null;
                this.state.lastSearchTime = Date.now();
                
                console.log(`🔍 执行${this.state.mode}搜索: "${query}"`);
                
                // 检查缓存
                const cacheKey = `${query}_${this.state.mode}`;
                if (this.performance.searchCache.has(cacheKey)) {
                    console.log('📦 使用缓存结果');
                    const cachedResults = this.performance.searchCache.get(cacheKey);
                    this.processSearchResults(cachedResults, query, requestId);
                    return;
                }
                
                // 执行搜索
                let results;
                if (this.state.mode === 'intelligent') {
                    results = await this.executeIntelligentSearch(query);
                } else {
                    results = await this.executeExactSearch(query);
                }
                
                // 检查请求是否仍然有效
                if (requestId !== this.performance.requestId) {
                    console.log('🚫 搜索请求已过期，忽略结果');
                    return;
                }
                
                // 缓存结果
                this.setCacheResult(cacheKey, results);
                
                // 处理结果
                this.processSearchResults(results, query, requestId);
                
            }, null, 'executeSearch')
            .finally(() => {
                this.state.isSearching = false;
            });
        }
        
        // 🧠 智能搜索
        async executeIntelligentSearch(query) {
            if (!this.analyzer || typeof this.analyzer.searchWords !== 'function') {
                throw new Error('智能搜索功能不可用');
            }
            
            const results = await this.analyzer.searchWords(query);
            console.log(`📊 智能搜索找到 ${results.length} 个结果`);
            
            return results.map(item => ({
                ...item,
                searchMode: 'intelligent',
                isIntelligentMatch: true,
                isExactMatch: false
            }));
        }
        
        // 🎯 精确搜索
        async executeExactSearch(query) {
            if (!this.analyzer || typeof this.analyzer.searchWordsExact !== 'function') {
                throw new Error('精确搜索功能不可用');
            }
            
            const results = await this.analyzer.searchWordsExact(query);
            console.log(`🎯 精确搜索找到 ${results.length} 个结果`);
            
            return results.map(item => ({
                ...item,
                searchMode: 'exact',
                isIntelligentMatch: false,
                isExactMatch: true
            }));
        }
        
        // 📊 处理搜索结果
        processSearchResults(results, query, requestId) {
            // 再次检查请求有效性
            if (requestId !== this.performance.requestId) {
                return;
            }
            
            this.state.results = results || [];
            this.state.hasResults = this.state.results.length > 0;
            
            console.log(`✅ 搜索完成: ${this.state.results.length} 个结果`);
            
            // 触发UI更新事件
            this.dispatchSearchEvent('searchComplete', {
                query: query,
                mode: this.state.mode,
                results: this.state.results,
                hasResults: this.state.hasResults
            });
        }
        
        // 🔄 切换搜索模式
        switchMode(newMode) {
            return this.errorHandler.safe(() => {
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
                this.dispatchSearchEvent('searchModeChanged', {
                    oldMode,
                    newMode
                });
                
            }, null, 'switchMode');
        }
        
        // 🧹 清除搜索
        clearSearch() {
            return this.errorHandler.safe(() => {
                // 清除防抖定时器
                if (this.performance.debounceTimer) {
                    clearTimeout(this.performance.debounceTimer);
                    this.performance.debounceTimer = null;
                }
                
                // 重置状态
                this.state = {
                    isSearching: false,
                    query: '',
                    mode: this.state.mode, // 保持当前模式
                    results: [],
                    hasResults: false,
                    error: null,
                    lastSearchTime: 0
                };
                
                console.log('🧹 搜索已清除');
                
                // 触发清除事件
                this.dispatchSearchEvent('searchCleared');
                
            }, null, 'clearSearch');
        }
        
        // 💾 缓存管理
        setCacheResult(key, result) {
            if (this.performance.searchCache.size >= this.config.maxCacheSize) {
                const firstKey = this.performance.searchCache.keys().next().value;
                this.performance.searchCache.delete(firstKey);
            }
            this.performance.searchCache.set(key, result);
        }
        
        // 📡 事件分发
        dispatchSearchEvent(eventName, detail = {}) {
            return this.errorHandler.safe(() => {
                this.container.dispatchEvent(new CustomEvent(eventName, {
                    detail: detail,
                    bubbles: false,
                    cancelable: false
                }));
            }, null, 'dispatchSearchEvent');
        }
        
        // 📊 获取状态
        getState() {
            return Object.assign({}, this.state);
        }
        
        // 🧹 销毁
        destroy() {
            if (this.performance.debounceTimer) {
                clearTimeout(this.performance.debounceTimer);
            }
            this.performance.searchCache.clear();
            console.log('🧹 搜索管理器已销毁');
        }
    }
    
    // =================================================================
    // 2. 稳定的词频UI主类
    // =================================================================
    class StableWordFrequencyUI {
        constructor(container, manager, options = {}) {
            console.log('📊 开始初始化稳定版词频UI...');
            
            this.container = container;
            this.manager = manager;
            
            // 配置管理
            this.config = this.createConfig(options);
            
            // 状态管理
            this.state = {
                currentView: 'cloud',
                currentFilter: 'all',
                selectedWord: null,
                isInitialized: false,
                isDestroyed: false
            };
            
            // 性能优化
            this.performance = {
                domCache: new Map(),
                dataCache: new Map(),
                renderFrame: null,
                throttleDelay: 16
            };
            
            // 移动端检测
            this.isMobile = this.detectMobile();
            
            // 错误处理
            this.errorHandler = this.createErrorHandler();
            
            // 搜索管理器
            this.searchManager = new StableSearchManager(manager, container, {
                debug: this.config.debug
            });
            
            // 初始化
            this.initPromise = this.initialize();
        }
        
        // 🔧 创建配置
        createConfig(options) {
            const defaultConfig = {
                debug: false,
                enableVirtualization: false,
                animationDuration: 300,
                maxDisplayItems: 200,
                cacheSize: 50,
                enablePreloading: true
            };
            
            return window.EnglishSite.ConfigManager?.createModuleConfig('wordFrequencyUI', {
                ...defaultConfig,
                ...options
            }) || { ...defaultConfig, ...options };
        }
        
        // 🚨 创建错误处理器
        createErrorHandler() {
            return {
                handle: (context, error) => {
                    const errorMsg = `[WordFrequencyUI.${context}] ${error.message}`;
                    console.error(errorMsg);
                    
                    if (window.EnglishSite.ErrorHandler) {
                        window.EnglishSite.ErrorHandler.handle(`wordFrequencyUI.${context}`, error);
                    }
                },
                
                safe: (fn, fallback, context) => {
                    try {
                        return fn();
                    } catch (error) {
                        this.handle(context, error);
                        return fallback;
                    }
                },
                
                safeAsync: async (fn, fallback, context) => {
                    try {
                        return await fn();
                    } catch (error) {
                        this.handle(context, error);
                        return fallback;
                    }
                }
            };
        }
        
        // 📱 移动端检测
        detectMobile() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   window.innerWidth <= 768;
        }
        
        // 🗂️ DOM缓存获取
        getCachedElement(selector) {
            if (this.performance.domCache.has(selector)) {
                return this.performance.domCache.get(selector);
            }
            
            const element = this.container.querySelector(selector);
            if (element) {
                this.performance.domCache.set(selector, element);
            }
            
            return element;
        }
        
        // 🚀 初始化
        async initialize() {
            return this.errorHandler.safeAsync(async () => {
                console.log('🔧 等待核心工具就绪...');
                
                // 等待核心工具
                if (window.EnglishSite.coreToolsReady) {
                    await window.EnglishSite.coreToolsReady;
                }
                
                // 渲染UI结构
                this.renderUIStructure();
                
                // 缓存关键元素
                this.cacheKeyElements();
                
                // 设置事件监听
                this.setupEventListeners();
                
                // 等待数据管理器就绪
                if (this.manager && this.manager.waitForReady) {
                    await this.manager.waitForReady();
                }
                
                this.state.isInitialized = true;
                
                // 初始化显示
                this.updateStatsSummary();
                this.displayCurrentView();
                
                console.log('✅ 稳定版词频UI初始化完成');
                
            }, null, 'initialize');
        }
        
        // 🎨 渲染UI结构
        renderUIStructure() {
            return this.errorHandler.safe(() => {
                this.container.innerHTML = this.createUITemplate();
                this.loadStyles();
            }, null, 'renderUIStructure');
        }
        
        // 📝 创建UI模板
        createUITemplate() {
            return `
                <div class="word-freq-page stable-ui">
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
                                    <button class="search-mode-tab active" data-mode="intelligent" 
                                            title="智能搜索：基于词干合并，搜索take会找到take/takes/took/taken">
                                        🧠 智能搜索
                                    </button>
                                    <button class="search-mode-tab" data-mode="exact" 
                                            title="精确搜索：基于原文匹配，搜索taken只找包含taken的文章">
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
                            <div class="display-container" id="display-container">
                                <div class="display-content" id="display-content"></div>
                            </div>
                        </div>
                        
                        <div class="word-details-panel" id="word-details" style="display: none;">
                            <!-- 单词详情面板 -->
                        </div>
                    </main>
                </div>
            `;
        }
        
        // 🗂️ 缓存关键元素
        cacheKeyElements() {
            const selectors = [
                '#word-search', '#search-btn', '#clear-search', '#freq-filter',
                '#freq-loading', '#freq-display', '#word-details', '#stats-summary',
                '#progress-fill', '#progress-text', '#display-container', '#display-content',
                '#search-mode-tabs', '.search-mode-tab', '#search-status'
            ];
            
            selectors.forEach(selector => this.getCachedElement(selector));
        }
        
        // 🎧 设置事件监听
        setupEventListeners() {
            return this.errorHandler.safe(() => {
                // 搜索输入事件
                const searchInput = this.getCachedElement('#word-search');
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
                const searchBtn = this.getCachedElement('#search-btn');
                if (searchBtn) {
                    searchBtn.addEventListener('click', () => {
                        this.handleSearchButton();
                    });
                }
                
                // 清除搜索
                const clearBtn = this.getCachedElement('#clear-search');
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
                const filterSelect = this.getCachedElement('#freq-filter');
                if (filterSelect) {
                    filterSelect.addEventListener('change', (e) => {
                        this.handleFilterChange(e.target.value);
                    });
                }
                
                // 搜索管理器事件
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
                
                // 委托点击事件
                this.container.addEventListener('click', (e) => {
                    this.handleDelegatedClick(e);
                });
                
                // 进度事件
                document.addEventListener('wordFreqProgress', (e) => {
                    this.updateProgress(e.detail.progress);
                });
                
                console.log('✅ 事件监听器已设置');
                
            }, null, 'setupEventListeners');
        }
        
        // 🔍 搜索输入处理
        handleSearchInput(value) {
            return this.errorHandler.safe(() => {
                const hasValue = value && value.trim().length > 0;
                this.updateSearchUI(hasValue);
                this.searchManager.handleSearch(value);
            }, null, 'handleSearchInput');
        }
        
        // 🔍 搜索按钮处理
        handleSearchButton() {
            return this.errorHandler.safe(() => {
                const searchInput = this.getCachedElement('#word-search');
                if (searchInput) {
                    const query = searchInput.value.trim();
                    if (query) {
                        this.searchManager.executeSearch(query);
                    }
                }
            }, null, 'handleSearchButton');
        }
        
        // 🔄 模式切换处理
        handleModeSwitch(newMode) {
            return this.errorHandler.safe(() => {
                // 更新UI
                this.container.querySelectorAll('.search-mode-tab').forEach(tab => {
                    tab.classList.toggle('active', tab.dataset.mode === newMode);
                });
                
                // 切换搜索管理器模式
                this.searchManager.switchMode(newMode);
            }, null, 'handleModeSwitch');
        }
        
        // 🎨 视图切换处理
        handleViewToggle(view) {
            return this.errorHandler.safe(() => {
                this.container.querySelectorAll('.view-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.view === view);
                });
                
                this.state.currentView = view;
                this.clearDataCache();
                
                // 重新显示当前视图
                this.displayCurrentView();
            }, null, 'handleViewToggle');
        }
        
        // 🎛️ 筛选变更处理
        handleFilterChange(filter) {
            return this.errorHandler.safe(() => {
                this.state.currentFilter = filter;
                this.clearDataCache();
                
                const searchState = this.searchManager.getState();
                if (!searchState.hasResults) {
                    this.displayCurrentView();
                }
            }, null, 'handleFilterChange');
        }
        
        // ✅ 搜索完成处理
        handleSearchComplete(detail) {
            return this.errorHandler.safe(() => {
                const { query, mode, results, hasResults } = detail;
                
                console.log(`✅ 搜索完成: "${query}" (${mode}模式) - ${results.length}个结果`);
                
                if (hasResults) {
                    this.displaySearchResults(results, query, mode);
                    this.showSearchStatus(`找到 ${results.length} 个结果`, 'success');
                } else {
                    this.showNoResults(`未找到与 "${query}" 相关的结果`);
                    this.showSearchStatus('未找到结果', 'warning');
                }
            }, null, 'handleSearchComplete');
        }
        
        // ❌ 搜索错误处理
        handleSearchError(detail) {
            return this.errorHandler.safe(() => {
                console.error('🚨 搜索错误:', detail.error);
                this.showNoResults(`搜索出现错误: ${detail.error}`);
                this.showSearchStatus('搜索失败', 'error');
            }, null, 'handleSearchError');
        }
        
        // 🧹 搜索清除处理
        handleSearchCleared() {
            return this.errorHandler.safe(() => {
                console.log('🧹 搜索已清除，恢复正常显示');
                this.hideSearchStatus();
                this.displayCurrentView();
            }, null, 'handleSearchCleared');
        }
        
        // 🔄 搜索模式变更处理
        handleSearchModeChanged(detail) {
            return this.errorHandler.safe(() => {
                const { newMode } = detail;
                console.log(`🔄 搜索模式已切换到: ${newMode}`);
                
                const modeText = newMode === 'intelligent' ? '智能搜索模式' : '精确搜索模式';
                this.showSearchStatus(modeText, 'info');
            }, null, 'handleSearchModeChanged');
        }
        
        // 🖱️ 委托点击处理
        handleDelegatedClick(event) {
            return this.errorHandler.safe(() => {
                const target = event.target;
                
                // 关闭详情按钮
                if (target.closest('.close-details-btn')) {
                    event.preventDefault();
                    this.hideWordDetails();
                    return;
                }
                
                // 文章项目点击
                if (target.closest('.article-item')) {
                    event.preventDefault();
                    this.handleArticleClick(target.closest('.article-item'));
                    return;
                }
                
                // 单词项目点击
                if (target.closest('.word-item, .word-list-item')) {
                    event.preventDefault();
                    this.handleWordClick(target.closest('.word-item, .word-list-item'));
                    return;
                }
            }, null, 'handleDelegatedClick');
        }
        
        // 🏷️ 单词点击处理
        handleWordClick(wordElement) {
            return this.errorHandler.safe(() => {
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
                
                this.state.selectedWord = word.trim();
                this.showWordDetails(details);
            }, null, 'handleWordClick');
        }
        
        // 📄 文章点击处理
        handleArticleClick(articleElement) {
            return this.errorHandler.safe(() => {
                const articleId = articleElement.dataset.articleId;
                const word = articleElement.dataset.word || this.state.selectedWord;
                
                if (!word || !articleId) {
                    console.error('跳转数据无效:', { word, articleId });
                    return;
                }
                
                this.prepareHighlightData(word.trim());
                this.performJump(articleId.trim(), word.trim());
            }, null, 'handleArticleClick');
        }
        
        // 🎯 准备高亮数据
        prepareHighlightData(word) {
            return this.errorHandler.safe(() => {
                sessionStorage.removeItem('highlightWord');
                sessionStorage.removeItem('highlightSource');
                sessionStorage.removeItem('highlightVariants');
                
                setTimeout(() => {
                    sessionStorage.setItem('highlightWord', word);
                    sessionStorage.setItem('highlightSource', 'wordFreq');
                    
                    const wordDetails = this.manager.getWordDetails(word);
                    if (wordDetails && wordDetails.variants) {
                        const variants = wordDetails.variants
                            .map(([variant]) => variant)
                            .filter(v => v && v.trim());
                        
                        if (variants.length > 0) {
                            sessionStorage.setItem('highlightVariants', JSON.stringify(variants));
                        }
                    }
                }, 50);
            }, null, 'prepareHighlightData');
        }
        
        // 🚀 执行跳转
        performJump(articleId, word) {
            return this.errorHandler.safe(() => {
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
            }, null, 'performJump');
        }
        
        // 📊 显示当前视图
        displayCurrentView() {
            return this.errorHandler.safe(() => {
                if (!this.state.isInitialized) return;
                
                // 检查是否在搜索状态
                const searchState = this.searchManager.getState();
                if (searchState.hasResults) {
                    return; // 在搜索状态下不覆盖搜索结果
                }
                
                switch (this.state.currentView) {
                    case 'cloud':
                        this.displayWordCloud();
                        break;
                    case 'list':
                        this.displayWordList();
                        break;
                }
            }, null, 'displayCurrentView');
        }
        
        // ☁️ 显示词云
        displayWordCloud() {
            return this.errorHandler.safe(() => {
                const words = this.getFilteredWords();
                
                if (words.length === 0) {
                    this.showNoResults();
                    return;
                }
                
                this.renderWordCloudView(words);
            }, null, 'displayWordCloud');
        }
        
        // 📋 显示词汇列表
        displayWordList() {
            return this.errorHandler.safe(() => {
                const words = this.getFilteredWords();
                
                if (words.length === 0) {
                    this.showNoResults();
                    return;
                }
                
                this.renderWordListView(words);
            }, null, 'displayWordList');
        }
        
        // 📊 获取过滤后的词汇
        getFilteredWords(limit = 500) {
            return this.errorHandler.safe(() => {
                const cacheKey = `${this.state.currentFilter}_${limit}`;
                
                if (this.performance.dataCache.has(cacheKey)) {
                    return this.performance.dataCache.get(cacheKey);
                }
                
                let words = this.manager.getTopWords(limit);
                
                // 应用筛选
                const filterMap = {
                    'high': item => item.totalCount >= 10,
                    'medium': item => item.totalCount >= 5 && item.totalCount <= 9,
                    'low': item => item.totalCount >= 2 && item.totalCount <= 4,
                    'rare': item => item.totalCount === 1
                };
                
                if (this.state.currentFilter !== 'all' && filterMap[this.state.currentFilter]) {
                    words = words.filter(filterMap[this.state.currentFilter]);
                }
                
                // 缓存结果
                this.performance.dataCache.set(cacheKey, words);
                
                // 限制缓存大小
                if (this.performance.dataCache.size > this.config.cacheSize) {
                    const firstKey = this.performance.dataCache.keys().next().value;
                    this.performance.dataCache.delete(firstKey);
                }
                
                return words;
            }, [], 'getFilteredWords');
        }
        
        // ☁️ 渲染词云视图
        renderWordCloudView(words) {
            return this.errorHandler.safe(() => {
                const content = this.getCachedElement('#display-content');
                if (!content) return;
                
                const maxCount = words[0]?.totalCount || 1;
                const minCount = words[words.length - 1]?.totalCount || 1;
                
                content.innerHTML = '';
                
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
                
                // 限制显示数量以提高性能
                const displayWords = words.slice(0, this.config.maxDisplayItems);
                
                displayWords.forEach(item => {
                    const wordElement = this.createWordCloudItem(item, minCount, maxCount);
                    cloudContainer.appendChild(wordElement);
                });
                
                content.appendChild(cloudContainer);
                
                // 显示容器
                this.showDisplayContainer();
            }, null, 'renderWordCloudView');
        }
        
        // 📋 渲染列表视图
        renderWordListView(words) {
            return this.errorHandler.safe(() => {
                const content = this.getCachedElement('#display-content');
                if (!content) return;
                
                content.innerHTML = '';
                
                const listContainer = document.createElement('div');
                listContainer.className = 'word-list-container';
                listContainer.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    padding: 20px;
                `;
                
                // 限制显示数量以提高性能
                const displayWords = words.slice(0, this.config.maxDisplayItems);
                
                displayWords.forEach(item => {
                    const listItem = this.createWordListItem(item);
                    listContainer.appendChild(listItem);
                });
                
                content.appendChild(listContainer);
                
                // 显示容器
                this.showDisplayContainer();
            }, null, 'renderWordListView');
        }
        
        // 🏷️ 创建词云项目
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
                background: rgba(0, 123, 255, 0.1);
                border: 2px solid rgba(0, 123, 255, 0.3);
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
        
        // 📋 创建列表项目
        createWordListItem(item) {
            const listItem = document.createElement('div');
            listItem.className = 'word-list-item';
            listItem.dataset.word = item.word;
            
            listItem.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                border: 2px solid #e9ecef;
                border-radius: 12px;
                cursor: pointer;
                background: white;
                transition: all 0.3s ease;
                box-shadow: 0 2px 6px rgba(0,0,0,0.1);
            `;
            
            listItem.innerHTML = `
                <div class="word-info" style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <strong style="font-size: 18px; color: #2c3e50;">${item.word}</strong>
                        <span style="background: #007bff; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">智能</span>
                    </div>
                    <div style="color: #6c757d; font-size: 14px; display: flex; gap: 20px;">
                        <span>📄 ${item.articleCount} 篇文章</span>
                        <span>🔢 总计 ${item.totalCount} 次</span>
                    </div>
                </div>
                <div class="word-count" style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 12px 20px; border-radius: 20px; font-weight: 700; font-size: 16px;">
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
        
        // 📊 计算字体大小
        calculateFontSize(count, minCount, maxCount) {
            const minSize = this.isMobile ? 12 : 14;
            const maxSize = this.isMobile ? 28 : 36;
            
            if (maxCount === minCount) return minSize;
            
            const ratio = (count - minCount) / (maxCount - minCount);
            return Math.round(minSize + ratio * (maxSize - minSize));
        }
        
        // 🎨 获取词汇颜色
        getWordColor(count, maxCount) {
            const intensity = count / maxCount;
            if (intensity > 0.8) return '#d32f2f';
            if (intensity > 0.6) return '#f57c00';
            if (intensity > 0.4) return '#388e3c';
            if (intensity > 0.2) return '#1976d2';
            return '#757575';
        }
        
        // 🎯 更新搜索UI
        updateSearchUI(hasValue) {
            const clearBtn = this.getCachedElement('#clear-search');
            const modeTabs = this.getCachedElement('#search-mode-tabs');
            
            if (clearBtn) {
                clearBtn.style.display = hasValue ? 'inline-block' : 'none';
            }
            
            if (modeTabs) {
                modeTabs.style.display = 'flex';
            }
        }
        
        // 🧹 清除搜索
        clearSearch() {
            return this.errorHandler.safe(() => {
                const searchInput = this.getCachedElement('#word-search');
                if (searchInput) {
                    searchInput.value = '';
                }
                
                this.searchManager.clearSearch();
                this.updateSearchUI(false);
            }, null, 'clearSearch');
        }
        
        // 📊 显示搜索状态
        showSearchStatus(message, type = 'info') {
            const statusEl = this.getCachedElement('#search-status');
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
        
        // 🚫 隐藏搜索状态
        hideSearchStatus() {
            const statusEl = this.getCachedElement('#search-status');
            if (statusEl) {
                statusEl.style.display = 'none';
            }
        }
        
        // 📺 显示显示容器
        showDisplayContainer() {
            const loading = this.getCachedElement('#freq-loading');
            const display = this.getCachedElement('#freq-display');
            
            if (loading) loading.style.display = 'none';
            if (display) display.style.display = 'block';
        }
        
        // 📭 显示无结果
        showNoResults(message = '暂无数据') {
            const display = this.getCachedElement('#freq-display');
            const container = this.getCachedElement('#display-container');
            
            if (display && container) {
                container.innerHTML = `
                    <div class="no-results" style="text-align: center; padding: 60px 20px; color: #6c757d; background: linear-gradient(135deg, #f8f9fa, #ffffff); border-radius: 12px; margin: 20px 0; border: 2px dashed #dee2e6;">
                        <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.6;">📭</div>
                        <h3 style="color: #495057; margin-bottom: 12px; font-size: 20px;">${message}</h3>
                        <p style="margin-bottom: 20px; font-size: 14px; line-height: 1.6;">尝试调整筛选条件或搜索其他关键词</p>
                        <button onclick="document.querySelector('#clear-search').click()" 
                                style="margin-top: 15px; padding: 12px 24px; background: linear-gradient(135deg, #007bff, #0056b3); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; transition: all 0.3s ease;">
                            🔄 清除搜索，重新开始
                        </button>
                    </div>
                `;
                
                display.style.display = 'block';
            }
        }
        
        // 🧹 清除数据缓存
        clearDataCache() {
            this.performance.dataCache.clear();
        }
        
        // 📊 更新统计摘要
        updateStatsSummary() {
            return this.errorHandler.safe(() => {
                const summary = this.manager.getStatsSummary();
                const summaryEl = this.getCachedElement('#stats-summary');
                
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
            }, null, 'updateStatsSummary');
        }
        
        // 📈 更新进度
        updateProgress(progress) {
            const progressFill = this.getCachedElement('#progress-fill');
            const progressText = this.getCachedElement('#progress-text');
            
            if (progressFill) progressFill.style.width = `${progress}%`;
            if (progressText) progressText.textContent = `${progress}%`;
        }
        
        // 🎨 加载样式
        loadStyles() {
            if (document.getElementById('stable-word-freq-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'stable-word-freq-styles';
            style.textContent = `
                .word-freq-page.stable-ui {
                    padding: 20px;
                    max-width: 1400px;
                    margin: 0 auto;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: #f8f9fa;
                    min-height: 100vh;
                }
                
                .word-freq-header {
                    margin-bottom: 30px;
                    border-bottom: 2px solid #e9ecef;
                    padding-bottom: 20px;
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                }
                
                .header-title h1 {
                    margin: 0 0 16px 0;
                    color: #2c3e50;
                    font-size: 2.2rem;
                    font-weight: 700;
                }
                
                .stats-summary {
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap;
                    margin-bottom: 20px;
                }
                
                .stat-item {
                    background: linear-gradient(135deg, #007bff15, #007bff05);
                    padding: 12px 16px;
                    border-radius: 20px;
                    font-size: 0.9rem;
                    color: #495057;
                    border: 2px solid #007bff20;
                    font-weight: 600;
                    transition: all 0.3s ease;
                }
                
                .stat-item:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
                }
                
                .word-freq-controls {
                    display: flex;
                    gap: 24px;
                    align-items: flex-start;
                    flex-wrap: wrap;
                    margin-top: 20px;
                }
                
                .search-section {
                    flex: 1;
                    min-width: 300px;
                }
                
                .search-box {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 12px;
                }
                
                .search-box input {
                    flex: 1;
                    padding: 12px 20px;
                    border: 2px solid #dee2e6;
                    border-radius: 25px;
                    font-size: 14px;
                    outline: none;
                    transition: all 0.3s ease;
                    background: white;
                }
                
                .search-box input:focus {
                    border-color: #007bff;
                    box-shadow: 0 0 0 4px rgba(0, 123, 255, 0.1);
                    transform: translateY(-1px);
                }
                
                .search-box button {
                    padding: 12px 18px;
                    border: none;
                    border-radius: 20px;
                    background: linear-gradient(135deg, #007bff, #0056b3);
                    color: white;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 14px;
                    min-width: 48px;
                    font-weight: 600;
                }
                
                .search-box button:hover {
                    background: linear-gradient(135deg, #0056b3, #004085);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
                }
                
                #clear-search {
                    background: linear-gradient(135deg, #6c757d, #5a6268) !important;
                    display: none;
                }
                
                #clear-search:hover {
                    background: linear-gradient(135deg, #5a6268, #495057) !important;
                }
                
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
                
                .search-status.success {
                    background: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                }
                
                .search-status.warning {
                    background: #fff3cd;
                    color: #856404;
                    border: 1px solid #ffeaa7;
                }
                
                .search-status.error {
                    background: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                }
                
                .search-status.info {
                    background: #d1ecf1;
                    color: #0c5460;
                    border: 1px solid #bee5eb;
                }
                
                .view-section .view-toggles {
                    display: flex;
                    gap: 8px;
                }
                
                .view-btn {
                    padding: 12px 20px;
                    border: 2px solid #dee2e6;
                    border-radius: 25px;
                    background: white;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 14px;
                    font-weight: 600;
                    color: #6c757d;
                }
                
                .view-btn.active {
                    background: linear-gradient(135deg, #28a745, #20c997);
                    color: white;
                    border-color: #28a745;
                    box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
                    transform: translateY(-1px);
                }
                
                .view-btn:not(.active):hover {
                    background: #f8f9fa;
                    border-color: #adb5bd;
                    transform: translateY(-1px);
                }
                
                .filter-section select {
                    padding: 12px 16px;
                    border: 2px solid #dee2e6;
                    border-radius: 25px;
                    background: white;
                    font-size: 14px;
                    color: #495057;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-weight: 600;
                }
                
                .filter-section select:focus {
                    outline: none;
                    border-color: #007bff;
                    box-shadow: 0 0 0 4px rgba(0, 123, 255, 0.1);
                }
                
                .word-freq-content {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    min-height: 600px;
                }
                
                .loading-section {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 500px;
                    background: linear-gradient(135deg, #f8f9fa, #ffffff);
                    border-radius: 12px;
                }
                
                .loading-indicator {
                    text-align: center;
                    padding: 40px;
                }
                
                .spinner {
                    width: 48px;
                    height: 48px;
                    border: 4px solid #f3f4f6;
                    border-top: 4px solid #007bff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .loading-text {
                    font-size: 18px;
                    font-weight: 600;
                    color: #2c3e50;
                    margin-bottom: 20px;
                }
                
                .progress-container {
                    margin: 20px 0;
                }
                
                .progress-bar {
                    width: 300px;
                    height: 8px;
                    background: #e9ecef;
                    border-radius: 10px;
                    overflow: hidden;
                    margin: 0 auto;
                }
                
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #007bff, #28a745);
                    transition: width 0.3s ease;
                    border-radius: 10px;
                }
                
                .progress-text {
                    margin-top: 12px;
                    font-size: 14px;
                    color: #6c757d;
                    font-weight: 600;
                }
                
                .loading-tips {
                    margin-top: 24px;
                    color: #6c757d;
                    font-size: 13px;
                    line-height: 1.4;
                    max-width: 300px;
                }
                
                .word-freq-display {
                    padding: 20px;
                }
                
                .display-container {
                    border-radius: 8px;
                    overflow: hidden;
                    background: #f8f9fa;
                }
                
                .word-item {
                    display: inline-block;
                    transition: all 0.3s ease;
                }
                
                .word-item:hover {
                    transform: scale(1.05) translateY(-2px);
                    background: rgba(0, 123, 255, 0.15) !important;
                }
                
                .word-list-item:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
                    border-color: #007bff;
                }
                
                .no-results {
                    animation: fadeIn 0.5s ease-out;
                }
                
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                /* 移动端优化 */
                @media (max-width: 768px) {
                    .word-freq-page.stable-ui {
                        padding: 12px;
                    }
                    
                    .word-freq-header {
                        padding: 16px;
                    }
                    
                    .header-title h1 {
                        font-size: 1.8rem;
                    }
                    
                    .word-freq-controls {
                        flex-direction: column;
                        gap: 16px;
                    }
                    
                    .search-section {
                        min-width: auto;
                    }
                    
                    .stats-summary {
                        gap: 12px;
                    }
                    
                    .stat-item {
                        padding: 10px 14px;
                        font-size: 0.85rem;
                    }
                    
                    .view-btn {
                        padding: 10px 16px;
                        font-size: 13px;
                    }
                    
                    .search-mode-tab {
                        min-width: 120px;
                        padding: 8px 14px;
                        font-size: 12px;
                    }
                }
            `;
            
            document.head.appendChild(style);
        }
        
        // 💾 显示搜索结果
        displaySearchResults(results, query, mode) {
            return this.errorHandler.safe(() => {
                const container = this.getCachedElement('#display-content');
                if (!container) return;
                
                container.innerHTML = '';
                
                // 创建搜索结果容器
                const searchContainer = this.createSearchResultsContainer(query, mode, results.length);
                container.appendChild(searchContainer);
                
                // 根据视图模式渲染结果
                const resultsArea = searchContainer.querySelector('.search-results-area');
                if (this.state.currentView === 'cloud') {
                    this.renderSearchResultsAsCloud(resultsArea, results);
                } else {
                    this.renderSearchResultsAsList(resultsArea, results);
                }
                
                // 显示容器
                this.showDisplayContainer();
                
                console.log(`✅ 搜索结果已显示: ${results.length}个结果`);
            }, null, 'displaySearchResults');
        }
        
        // 📦 创建搜索结果容器
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
        
        // 📝 创建搜索标题
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
        
        // ☁️ 以词云形式渲染搜索结果
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
                // 为搜索结果添加特殊样式
                wordElement.style.background = item.isExactMatch ? 
                    'rgba(40, 167, 69, 0.15)' : 
                    'rgba(0, 123, 255, 0.1)';
                wordElement.style.borderColor = item.isExactMatch ? 
                    'rgba(40, 167, 69, 0.4)' : 
                    'rgba(0, 123, 255, 0.3)';
                
                cloudContainer.appendChild(wordElement);
            });
            
            container.appendChild(cloudContainer);
        }
        
        // 📋 以列表形式渲染搜索结果
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
                // 为搜索结果添加特殊样式
                listItem.style.borderColor = item.isExactMatch ? '#28a745' : '#e9ecef';
                listItem.style.background = item.isExactMatch ? 
                    'rgba(40, 167, 69, 0.05)' : 
                    'white';
                
                listContainer.appendChild(listItem);
            });
            
            container.appendChild(listContainer);
        }
        
        // 🔍 显示单词详情
        showWordDetails(details) {
            return this.errorHandler.safe(() => {
                const { word, totalCount, articleCount, articles } = details;
                
                const panel = this.getCachedElement('#word-details');
                if (!panel) return;
                
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
            }, null, 'showWordDetails');
        }
        
        // 🏷️ 创建单词详情HTML
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
        
        // 📄 创建文章项目HTML
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
        
        // 🚫 隐藏单词详情
        hideWordDetails() {
            const panel = this.getCachedElement('#word-details');
            if (panel) {
                panel.style.display = 'none';
                panel.innerHTML = '';
            }
            this.state.selectedWord = null;
        }
        
        // 🚀 显示跳转通知
        showJumpNotification(articleId, word) {
            return this.errorHandler.safe(() => {
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
            }, null, 'showJumpNotification');
        }
        
        // === 公共API方法 ===
        
        async waitForInitialization() {
            return this.initPromise;
        }
        
        // 🔄 刷新数据
        refreshData() {
            return this.errorHandler.safe(() => {
                if (this.state.isInitialized) {
                    this.clearDataCache();
                    this.updateStatsSummary();
                    
                    const searchState = this.searchManager.getState();
                    if (searchState.hasResults) {
                        this.searchManager.executeSearch(searchState.query);
                    } else {
                        this.displayCurrentView();
                    }
                }
            }, null, 'refreshData');
        }
        
        // 📊 获取统计信息
        getStats() {
            return {
                initialized: this.state.isInitialized,
                destroyed: this.state.isDestroyed,
                currentView: this.state.currentView,
                currentFilter: this.state.currentFilter,
                selectedWord: this.state.selectedWord,
                searchManager: this.searchManager.getState(),
                domCacheSize: this.performance.domCache.size,
                dataCacheSize: this.performance.dataCache.size,
                isMobile: this.isMobile
            };
        }
        
        // 🧹 销毁
        destroy() {
            return this.errorHandler.safe(() => {
                if (this.state.isDestroyed) return;
                
                console.log('🧹 开始销毁 StableWordFrequencyUI...');
                
                this.state.isDestroyed = true;
                
                // 清理搜索管理器
                if (this.searchManager) {
                    this.searchManager.destroy();
                }
                
                // 清理渲染帧
                if (this.performance.renderFrame) {
                    cancelAnimationFrame(this.performance.renderFrame);
                }
                
                // 清理缓存
                this.performance.domCache.clear();
                this.performance.dataCache.clear();
                
                // 移除样式
                const styleEl = document.getElementById('stable-word-freq-styles');
                if (styleEl) styleEl.remove();
                
                // 清空引用
                this.container = null;
                this.manager = null;
                this.searchManager = null;
                
                console.log('✅ StableWordFrequencyUI已完全销毁');
            }, null, 'destroy');
        }
    }
    
    // =================================================================
    // 3. 全局注册和导出
    // =================================================================
    
    // 注册到全局命名空间
    window.EnglishSite.WordFrequencyUI = StableWordFrequencyUI;
    window.EnglishSite.SimplifiedSearchManager = StableSearchManager;
    
    // 兼容性别名
    window.EnglishSite.StableWordFrequencyUI = StableWordFrequencyUI;
    window.EnglishSite.StableSearchManager = StableSearchManager;
    
    console.log('✅ Stable Word Frequency UI v4.0 loaded successfully');
    
})();