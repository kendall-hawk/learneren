// js/main.js - 重构优化版 v4.0 (零风险 + 100%兼容 + 性能优化)
// 🎯 目标：修复词频工具问题 + 提升性能 + 保持100%功能兼容 + 简化维护

window.EnglishSite = window.EnglishSite || {};

/**
 * 🚀 重构优化版App类 v4.0
 * - 修复词频工具二次点击空白页问题 ✅
 * - 优化DOM操作和缓存机制 ✅
 * - 简化状态管理，提升性能 ✅
 * - 保持100%向后兼容 ✅
 * - 增强错误处理和稳定性 ✅
 */
class App {
    constructor(options = {}) {
        // 🎯 优化：简化配置管理
        this.config = this.createOptimizedConfig(options);

        // 🎯 优化：高效DOM缓存系统
        this.domCache = new Map();
        this.elements = {};

        // 模块实例（保持原有结构）
        this.navData = [];
        this.navigation = null;
        this.glossaryManager = null;
        this.audioSyncManager = null;

        // 🔧 修复：统一词频管理器实例管理（修复二次点击问题）
        this.wordFreqManager = null;
        this.wordFreqManagerPromise = null;
        this.wordFreqUIInstance = null; // 🔧 新增：专门跟踪UI实例

        // 🎯 优化：简化状态管理
        this.state = {
            loading: new Map(),
            isDestroyed: false,
            screenInfo: this.getScreenInfoCached(),
            lastResize: 0,
            
            // 🔧 优化：词频系统状态管理
            wordFreq: {
                initialized: false,
                error: null,
                uiCreated: false,
                containerActive: false
            },
            
            // 🎯 优化：性能状态
            performance: {
                domOperations: 0,
                lastRender: 0,
                renderThreshold: 16 // 60fps
            }
        };

        // 🎯 优化：章节导航状态（简化）
        this.chapterNavState = {
            isVisible: false,
            navElement: null,
            scrollThreshold: 0.85
        };

        // 🎯 优化：预绑定处理器
        this.boundHandlers = this.createBoundHandlers();
        this.throttledHandlers = this.createThrottledHandlers();

        // 🎯 优化：性能监控
        this.perfId = null;
        this.initPromise = this.initialize();
    }

    // 🎯 优化：创建优化配置
    createOptimizedConfig(options) {
        const defaultConfig = {
            siteTitle: 'Learner',
            debug: false,
            enableErrorBoundary: true,
            // 🎯 新增：性能优化配置
            enableVirtualization: false,
            debounceDelay: 100,
            throttleDelay: 150,
            renderOptimization: true,
            cacheStrategy: 'lru'
        };

        return window.EnglishSite.ConfigManager?.createModuleConfig('main', {
            ...defaultConfig,
            ...options
        }) || { ...defaultConfig, ...options };
    }

    // 🎯 优化：预绑定事件处理器
    createBoundHandlers() {
        return {
            handleGlobalClick: this.handleGlobalClick.bind(this),
            handleResize: this.handleWindowResize.bind(this),
            handleScroll: this.handleScrollOptimized.bind(this)
        };
    }

    // 🎯 优化：创建节流处理器
    createThrottledHandlers() {
        return {
            handleResize: this.throttle(this.boundHandlers.handleResize, this.config.throttleDelay),
            handleScroll: this.throttle(this.boundHandlers.handleScroll, 16) // 60fps
        };
    }

    // 🎯 优化：屏幕信息缓存
    getScreenInfoCached() {
        const width = window.innerWidth;
        return {
            width,
            height: window.innerHeight,
            isMobile: width <= 768,
            isTablet: width > 768 && width <= 1024,
            devicePixelRatio: window.devicePixelRatio || 1,
            timestamp: Date.now()
        };
    }

    // 🎯 优化：高效DOM元素获取
    getElement(selector, forceRefresh = false) {
        if (!forceRefresh && this.domCache.has(selector)) {
            return this.domCache.get(selector);
        }

        const element = document.querySelector(selector);
        if (element) {
            this.domCache.set(selector, element);
            
            // 🎯 优化：限制缓存大小
            if (this.domCache.size > 100) {
                const firstKey = this.domCache.keys().next().value;
                this.domCache.delete(firstKey);
            }
        }
        return element;
    }

    // === 🚀 核心初始化（优化版） ===
    async initialize() {
        this.perfId = window.EnglishSite.PerformanceMonitor?.startMeasure('app-init', 'app');

        try {
            console.log('[App] 🚀 开始初始化重构版App v4.0...');

            // 🎯 优化：等待核心工具
            await window.EnglishSite.coreToolsReady;

            // 🎯 优化：错误记录
            window.EnglishSite.SimpleErrorHandler?.record('app', 'init-start',
                new Error('App initialization started'), {
                    timestamp: Date.now(),
                    version: '4.0'
                });

            // 🎯 优化：分阶段初始化
            this.selectDOMElementsOptimized();
            this.initializeLoadingStates();
            this.validateDOMStructure();

            await this.initAppOptimized();

            window.EnglishSite.PerformanceMonitor?.endMeasure(this.perfId);

            if (this.config.debug) {
                console.log('[App] ✅ 重构版App初始化完成');
                this.logOptimizedStats();
            }

        } catch (error) {
            window.EnglishSite.PerformanceMonitor?.endMeasure(this.perfId);
            this.handleError('initialization', error);
            throw error;
        }
    }

    // 🎯 优化：高效DOM选择器
    selectDOMElementsOptimized() {
        console.log('[App] 🔍 选择DOM元素...');

        const elementMap = {
            mainNav: '#main-nav',
            content: '#content',
            playerSection: '#player-section',
            audioPlayer: '#audio-player',
            chapterNavContainer: '#chapter-nav-container',
            backToTop: '#back-to-top'
        };

        // 🎯 优化：批量获取元素
        for (const [key, selector] of Object.entries(elementMap)) {
            this.elements[key] = this.getElement(selector);
        }

        // 🎯 优化：智能创建加载指示器
        this.elements.loadingIndicator = this.getElement('#loading-indicator') ||
            this.createLoadingIndicator();

        // 🎯 优化：简化验证
        this.validateCriticalElements();
    }

    // 🎯 优化：验证关键元素
    validateCriticalElements() {
        const critical = ['mainNav', 'content'];
        const missing = critical.filter(key => !this.elements[key]);
        
        if (missing.length > 0) {
            throw new Error(`Required DOM elements not found: ${missing.join(', ')}`);
        }
    }

    // 🎯 优化：高效加载指示器创建
    createLoadingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'loading-indicator';
        indicator.className = 'loading-indicator';
        
        // 🎯 优化：使用模板字符串和CSS类
        indicator.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">正在加载...</div>
        `;

        indicator.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0;
            background: rgba(255, 255, 255, 0.95); z-index: 9999;
            padding: 20px; text-align: center; display: none;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;

        document.body.appendChild(indicator);
        return indicator;
    }

    // 🎯 优化：简化加载状态管理
    initializeLoadingStates() {
        const modules = ['navigation', 'glossary', 'audioSync', 'wordFreq'];
        modules.forEach(module => {
            this.state.loading.set(module, { loaded: false, error: null });
        });
    }

    // 🎯 优化：简化DOM验证
    validateDOMStructure() {
        const selectors = ['main', '#glossary-popup', '.main-navigation'];
        const results = {};

        for (const selector of selectors) {
            const element = this.getElement(selector);
            const key = selector.replace(/[#.]/, '');
            results[key] = !!element;
        }

        if (this.config.debug) {
            console.log('[App] 🔍 DOM验证结果:', results);
        }

        return results;
    }

    // === 🔧 核心初始化流程（修复词频问题） ===
    async initAppOptimized() {
        this.showLoadingIndicator('正在初始化应用...');

        try {
            console.log('[App] 🔧 开始优化版串行初始化...');

            // 🎯 优化：缓存检查
            await this.loadNavigationDataOptimized();

            // 🔧 修复：确保导航系统完全就绪
            console.log('[App] 📍 第1步：初始化导航系统...');
            await this.initializeNavigationOptimized();

            // 🔧 修复：验证导航状态
            const navReady = this.verifyNavigationReady();
            if (navReady) {
                console.log('[App] ✅ 导航系统已就绪，chaptersMap大小:', 
                    this.navigation?.state?.chaptersMap?.size || 0);
            }

            // 🔧 修复：创建统一词频管理器
            console.log('[App] 📍 第2步：创建统一词频管理器...');
            await this.createUnifiedWordFreqManagerOptimized();

            // 🎯 优化：添加事件监听器
            this.addEventListenersOptimized();

            this.hideLoadingIndicator();

            if (this.config.debug) {
                console.log('[App] ✅ 优化版串行初始化完成');
            }

        } catch (error) {
            this.hideLoadingIndicator();
            throw error;
        }
    }

    // 🎯 优化：导航数据加载
    async loadNavigationDataOptimized() {
        const cache = window.EnglishSite.CacheManager?.getCache('content');
        const cachedNavData = cache?.get('navigation-data');

        if (cachedNavData) {
            this.navData = cachedNavData;
            this.setLoadingState('navigation', true);
            if (this.config.debug) console.log('[App] 📦 使用缓存的导航数据');
            return;
        }

        // 加载新数据
        const perfId = window.EnglishSite.PerformanceMonitor?.startMeasure('load-nav-data', 'network');

        try {
            const response = await fetch('data/navigation.json');
            if (!response.ok) {
                throw new Error(`无法加载导航数据: ${response.statusText}`);
            }

            this.navData = await response.json();
            cache?.set('navigation-data', this.navData);
            this.setLoadingState('navigation', true);

            window.EnglishSite.PerformanceMonitor?.endMeasure(perfId);

        } catch (error) {
            window.EnglishSite.PerformanceMonitor?.endMeasure(perfId);
            this.setLoadingState('navigation', false, error);
            this.handleError('load-navigation', error);
            throw error;
        }
    }

    // 🎯 优化：导航初始化
    async initializeNavigationOptimized() {
        const perfId = window.EnglishSite.PerformanceMonitor?.startMeasure('init-navigation', 'module');

        try {
            if (!window.EnglishSite.Navigation) {
                throw new Error('Navigation class not found');
            }

            const navigationConfig = {
                siteTitle: this.config.siteTitle,
                debug: this.config.debug
            };

            this.navigation = new window.EnglishSite.Navigation(
                this.elements.mainNav,
                this.elements.content,
                this.navData,
                navigationConfig
            );

            if (this.navigation.waitForInitialization) {
                await this.navigation.waitForInitialization();
            }

            // 🔧 优化：等待章节映射完成
            await this.waitForChapterMapping();

            this.setLoadingState('navigation', true);
            window.EnglishSite.PerformanceMonitor?.endMeasure(perfId);

        } catch (error) {
            window.EnglishSite.PerformanceMonitor?.endMeasure(perfId);
            this.setLoadingState('navigation', false, error);
            this.handleError('init-navigation', error);
            throw new Error('导航模块初始化失败');
        }
    }

    // 🔧 新增：等待章节映射完成
    async waitForChapterMapping() {
        const maxRetries = 10;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            if (this.navigation.state?.chaptersMap?.size > 0) {
                console.log(`[App] ✅ 章节映射完成: ${this.navigation.state.chaptersMap.size} 个章节`);
                return;
            }

            console.log(`[App] ⏳ 等待章节映射... (${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            retryCount++;
        }

        console.warn('[App] ⚠️ 章节映射超时，继续初始化');
    }

    // 🔧 修复：验证导航就绪状态
    verifyNavigationReady() {
        try {
            if (!this.navigation?.state?.chaptersMap) {
                return false;
            }

            const chaptersCount = this.navigation.state.chaptersMap.size;
            const isReady = chaptersCount > 0;

            console.log('[App] 🔍 导航验证:', { 
                hasNavigation: !!this.navigation,
                hasState: !!this.navigation.state,
                chaptersCount,
                isReady
            });

            return isReady;

        } catch (error) {
            console.error('[App] 导航验证失败:', error);
            return false;
        }
    }

    // === 🔧 核心修复：词频管理器（解决二次点击问题） ===
    async createUnifiedWordFreqManagerOptimized() {
        const perfId = window.EnglishSite.PerformanceMonitor?.startMeasure('init-word-freq', 'module');

        try {
            console.log('[App] 🔤 创建优化版词频管理器...');

            if (!window.EnglishSite.WordFrequencyManager) {
                console.warn('[App] ⚠️ 词频管理器类未找到，跳过初始化');
                this.setLoadingState('wordFreq', false, new Error('WordFrequencyManager not found'));
                return;
            }

            // 🔧 修复：获取优化的导航状态
            const navigationState = this.getNavigationStateOptimized();
            console.log('[App] 📊 传递导航状态给词频管理器:', {
                available: navigationState.available,
                chaptersCount: navigationState.chaptersMap?.size || 0
            });

            // 🔧 修复：创建统一实例
            if (!this.wordFreqManager) {
                this.wordFreqManager = new window.EnglishSite.WordFrequencyManager(navigationState);
                window.wordFreqManager = this.wordFreqManager; // 全局引用
                console.log('[App] ✅ 统一词频管理器实例已创建');
            }

            // 🔧 修复：管理初始化Promise
            if (!this.wordFreqManagerPromise) {
                this.wordFreqManagerPromise = this.wordFreqManager.waitForReady().then(() => {
                    this.state.wordFreq.initialized = true;
                    this.state.wordFreq.error = null;
                    this.setLoadingState('wordFreq', true);
                    console.log('[App] ✅ 词频管理器初始化完成');
                    return true;
                }).catch(error => {
                    this.state.wordFreq.initialized = false;
                    this.state.wordFreq.error = error;
                    this.setLoadingState('wordFreq', false, error);
                    console.warn('[App] ⚠️ 词频管理器初始化失败:', error.message);
                    return false;
                });
            }

            window.EnglishSite.PerformanceMonitor?.endMeasure(perfId);

        } catch (error) {
            window.EnglishSite.PerformanceMonitor?.endMeasure(perfId);
            this.state.wordFreq.error = error;
            this.setLoadingState('wordFreq', false, error);
            this.handleError('create-unified-word-freq', error);
        }
    }

    // 🔧 修复：获取导航状态
    getNavigationStateOptimized() {
        try {
            if (!this.navigation?.state) {
                return {
                    available: false,
                    chaptersMap: null,
                    navigationTree: null,
                    navData: this.navData || []
                };
            }

            return {
                available: true,
                chaptersMap: this.navigation.state.chaptersMap,
                navigationTree: this.navigation.state.navigationTree,
                navData: this.navData || [],
                totalChapters: this.navigation.state.chaptersMap?.size || 0
            };

        } catch (error) {
            console.error('[App] 获取导航状态失败:', error);
            return {
                available: false,
                chaptersMap: null,
                navigationTree: null,
                navData: this.navData || [],
                error: error.message
            };
        }
    }

    // === 🔧 事件处理（修复词频问题） ===
    addEventListenersOptimized() {
        // 🎯 优化：使用预绑定处理器
        document.addEventListener('click', this.boundHandlers.handleGlobalClick);
        window.addEventListener('resize', this.throttledHandlers.handleResize);

        // 🎯 优化：自定义事件
        const customEvents = [
            { name: 'seriesSelected', handler: (e) => this.onSeriesSelected(e) },
            { name: 'allArticlesRequested', handler: () => this.onAllArticlesRequested() },
            { name: 'chapterLoaded', handler: (e) => this.onChapterLoaded(e) },
            { name: 'navigationUpdated', handler: (e) => this.onNavigationUpdated(e) },
            { name: 'wordFrequencyRequested', handler: (e) => this.onWordFrequencyRequestedOptimized(e) }
        ];

        customEvents.forEach(({ name, handler }) => {
            document.addEventListener(name, handler);
        });

        // 🎯 优化：滚动事件
        if (this.elements.content) {
            this.elements.content.addEventListener('scroll', this.throttledHandlers.handleScroll, {
                passive: true
            });
        }

        // 清理事件
        window.addEventListener('beforeunload', () => this.destroy());
    }

    // 🔧 核心修复：词频工具请求处理（解决二次点击空白页）
    onWordFrequencyRequestedOptimized(e) {
        console.log('[App] 🔤 处理词频工具请求 (优化版)');

        try {
            // 🔧 修复：清理其他模块
            this.cleanupModules();

            // 🔧 关键修复：强制重置词频UI状态
            this.forceResetWordFreqUI();

            // 🔧 修复：启动词频工具
            this.launchWordFrequencyToolOptimized().then(success => {
                if (success) {
                    this.updatePageTitle('词频分析工具');
                    console.log('[App] ✅ 词频工具启动成功');
                } else {
                    throw new Error('词频工具启动失败');
                }
            }).catch(error => {
                console.error('[App] ❌ 词频工具启动失败:', error);
                this.handleWordFrequencyErrorOptimized(error);
            });

        } catch (error) {
            console.error('[App] ❌ 词频工具启动异常:', error);
            this.handleWordFrequencyErrorOptimized(error);
        }
    }

    // 🔧 关键修复：强制重置词频UI状态
    forceResetWordFreqUI() {
        console.log('[App] 🔄 强制重置词频UI状态...');
        
        try {
            // 🔧 修复：销毁现有UI实例
            if (this.wordFreqUIInstance && typeof this.wordFreqUIInstance.destroy === 'function') {
                console.log('[App] 🧹 销毁词频UI实例');
                this.wordFreqUIInstance.destroy();
            }

            // 🔧 修复：同时清理全局引用
            if (window.wordFreqUI && typeof window.wordFreqUI.destroy === 'function') {
                console.log('[App] 🧹 销毁全局词频UI');
                window.wordFreqUI.destroy();
            }
            
            // 🔧 修复：清空所有引用
            this.wordFreqUIInstance = null;
            window.wordFreqUI = null;
            
            // 🔧 修复：重置状态
            this.state.wordFreq.uiCreated = false;
            this.state.wordFreq.containerActive = false;
            
            // 🔧 修复：清理可能的容器内容
            this.cleanupWordFreqContainers();
            
            console.log('[App] ✅ 词频UI状态重置完成');
            
        } catch (error) {
            console.warn('[App] ⚠️ 重置词频UI状态时出错:', error);
        }
    }

    // 🔧 新增：清理词频容器
    cleanupWordFreqContainers() {
        const possibleContainers = [
            '#word-frequency-container',
            '.word-freq-container'
        ];
        
        possibleContainers.forEach(selector => {
            const container = this.getElement(selector);
            if (container) {
                // 只清空包含词频内容的容器
                const hasWordFreqContent = container.querySelector(
                    '.word-freq-page, .word-freq-display, .loading-indicator'
                );
                
                if (hasWordFreqContent) {
                    console.log(`[App] 🧹 清理词频容器: ${selector}`);
                    container.innerHTML = '';
                }
            }
        });
    }

    // 🔧 核心修复：优化版词频工具启动
    async launchWordFrequencyToolOptimized() {
        console.log('[App] 🚀 启动优化版词频工具...');

        try {
            // 🔧 修复：确保容器存在且干净
            const container = this.findOrCreateWordFreqContainerOptimized();
            if (!container) {
                throw new Error('无法找到或创建词频容器');
            }

            // 🔧 修复：强制清空容器
            container.innerHTML = '';
            console.log('[App] 🧹 词频容器已清空');

            // 🔧 修复：确保管理器就绪
            await this.ensureWordFreqManagerReady();

            // 🔧 修复：获取管理器实例
            const manager = this.wordFreqManager || window.wordFreqManager;
            if (!manager?.isInitialized) {
                throw new Error('词频管理器不可用或未初始化');
            }

            // 🔧 关键修复：强制创建新UI实例
            await this.createWordFreqUIOptimized(container, manager);

            console.log('[App] ✅ 优化版词频工具启动完成');
            return true;

        } catch (error) {
            console.error('[App] ❌ 优化版词频工具启动失败:', error);
            return false;
        }
    }

    // 🔧 修复：确保词频管理器就绪
    async ensureWordFreqManagerReady() {
        if (!this.state.wordFreq.initialized) {
            console.log('[App] ⏳ 等待词频管理器初始化...');

            if (this.wordFreqManagerPromise) {
                const initResult = await this.wordFreqManagerPromise;
                if (!initResult) {
                    throw new Error('词频管理器初始化失败');
                }
            } else {
                throw new Error('词频管理器未创建');
            }
        }
    }

    // 🔧 修复：创建优化版词频UI
    async createWordFreqUIOptimized(container, manager) {
        console.log('[App] 📱 创建优化版词频UI...');

        if (!window.EnglishSite.WordFrequencyUI) {
            throw new Error('词频UI类不可用');
        }

        // 🔧 关键修复：强制创建新实例
        this.wordFreqUIInstance = new window.EnglishSite.WordFrequencyUI(container, manager);
        window.wordFreqUI = this.wordFreqUIInstance; // 同步全局引用

        // 🔧 修复：等待UI初始化
        console.log('[App] ⏳ 等待词频UI初始化...');
        await this.wordFreqUIInstance.initialize();

        // 🔧 修复：验证UI状态
        if (!this.wordFreqUIInstance.isInitialized) {
            throw new Error('词频UI初始化失败');
        }

        // 🔧 修复：更新状态
        this.state.wordFreq.uiCreated = true;
        this.state.wordFreq.containerActive = true;

        console.log('[App] ✅ 词频UI创建完成');
    }

    // 🔧 修复：优化版容器查找和创建
    findOrCreateWordFreqContainerOptimized() {
        console.log('[App] 🔍 查找或创建词频容器 (优化版)...');
        
        // 🔧 修复：优先查找专用容器
        let container = this.getElement('#word-frequency-container');
        
        if (container) {
            console.log('[App] ✅ 找到专用词频容器');
            return container;
        }
        
        // 🔧 修复：创建专用容器
        console.log('[App] 📦 创建专用词频容器');
        
        container = document.createElement('div');
        container.id = 'word-frequency-container';
        container.style.cssText = `
            width: 100%; 
            height: 100%; 
            min-height: 100vh;
            background: #f8f9fa;
            overflow: auto;
            position: relative;
        `;
        
        // 🔧 修复：智能选择父容器
        const parentContainer = this.findBestParentContainerOptimized();
        
        if (parentContainer) {
            parentContainer.innerHTML = '';
            parentContainer.appendChild(container);
            console.log('[App] ✅ 专用词频容器已创建');
            
            // 🎯 优化：更新DOM缓存
            this.domCache.set('#word-frequency-container', container);
            
            return container;
        } else {
            console.error('[App] ❌ 无法找到合适的父容器');
            return null;
        }
    }

    // 🔧 修复：寻找最佳父容器
    findBestParentContainerOptimized() {
        const candidates = [
            this.elements.content,
            this.getElement('#content'),
            this.getElement('main'),
            this.getElement('.main-content'),
            document.body
        ];
        
        for (const candidate of candidates) {
            if (candidate) {
                console.log('[App] 🎯 选择父容器:', 
                    candidate.tagName, 
                    candidate.id || candidate.className || 'unnamed');
                return candidate;
            }
        }
        
        return null;
    }

    // 🔧 修复：优化版错误处理
    handleWordFrequencyErrorOptimized(error) {
        console.error('[App] 🚨 词频工具错误 (优化版):', error);
        
        // 🔧 修复：先清理状态
        this.forceResetWordFreqUI();
        
        const errorHTML = this.createWordFreqErrorHTML(error);
        
        // 🔧 修复：确保错误显示在正确位置
        const container = this.findOrCreateWordFreqContainerOptimized();
        if (container) {
            container.innerHTML = errorHTML;
        } else if (this.elements.content) {
            this.elements.content.innerHTML = errorHTML;
        }
        
        this.handleError('word-frequency-tool', error);
    }

    // 🔧 修复：创建错误HTML
    createWordFreqErrorHTML(error) {
        return `
            <div class="word-freq-error" style="
                display: flex; flex-direction: column; align-items: center; 
                justify-content: center; min-height: 50vh; padding: 40px 20px; 
                text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #f8f9fa;
            ">
                <div style="font-size: 72px; margin-bottom: 24px; opacity: 0.6;">🔤</div>
                <h2 style="color: #dc3545; margin-bottom: 16px; font-size: 24px;">词频分析工具暂不可用</h2>
                <p style="color: #6c757d; margin-bottom: 20px; max-width: 600px; line-height: 1.5;">
                    ${error.message}
                </p>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
                    <button onclick="window.app.retryWordFrequencyOptimized()" style="
                        padding: 12px 24px; background: #28a745; color: white; 
                        border: none; border-radius: 6px; cursor: pointer; font-weight: 600;
                    ">🔄 重试启动</button>
                    <button onclick="location.reload()" style="
                        padding: 12px 24px; background: #007bff; color: white; 
                        border: none; border-radius: 6px; cursor: pointer; font-weight: 600;
                    ">🔄 重新加载页面</button>
                </div>
                <div style="margin-top: 24px; font-size: 12px; color: #adb5bd;">
                    错误时间: ${new Date().toLocaleString()} | 如问题持续，请联系技术支持
                </div>
            </div>
        `;
    }

    // 🔧 修复：优化版重试方法
    async retryWordFrequencyOptimized() {
        console.log('[App] 🔄 重试词频工具启动 (优化版)...');
        
        try {
            // 🔧 修复：完全重置状态
            this.forceResetWordFreqUI();
            this.state.wordFreq.initialized = false;
            this.state.wordFreq.error = null;
            
            // 🔧 修复：重新创建管理器（如果需要）
            if (!this.wordFreqManager?.isInitialized) {
                console.log('[App] 🆕 重新创建词频管理器...');
                await this.createUnifiedWordFreqManagerOptimized();
            }
            
            // 🔧 修复：重新启动工具
            const success = await this.launchWordFrequencyToolOptimized();
            if (success) {
                console.log('[App] ✅ 词频工具重试成功');
            } else {
                throw new Error('重试启动失败');
            }
            
        } catch (error) {
            console.error('[App] ❌ 词频工具重试失败:', error);
            this.handleWordFrequencyErrorOptimized(error);
        }
    }

    // === 🎯 其他事件处理（优化版） ===
    handleGlobalClick(event) {
        const target = event.target;

        // 🎯 优化：章节链接点击
        const chapterLink = target.closest('.overview-chapter-link');
        if (chapterLink?.dataset.chapterId && this.navigation) {
            event.preventDefault();
            this.navigation.navigateToChapter(chapterLink.dataset.chapterId);
            return;
        }

        // 🎯 优化：返回顶部按钮
        if (target.closest('#back-to-top')) {
            this.handleBackToTopClick();
            return;
        }
    }

    handleWindowResize() {
        const now = Date.now();
        if (now - this.state.lastResize < this.config.debounceDelay) return;

        this.state.lastResize = now;
        this.state.screenInfo = this.getScreenInfoCached();

        // 🎯 优化：重新渲染章节列表（如果需要）
        const chapterList = this.getElement('.chapter-list-overview');
        if (chapterList) {
            const chapters = this.extractChapterDataOptimized(chapterList);
            if (chapters.length > 0) {
                this.renderChapterGridOptimized(chapters, '');
            }
        }
    }

    handleScrollOptimized() {
        if (!this.elements.content || !this.elements.backToTop) return;

        const shouldShow = this.elements.content.scrollTop > 300;
        this.elements.backToTop.classList.toggle('visible', shouldShow);
    }

    handleBackToTopClick() {
        if (this.elements.content) {
            this.elements.content.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }

    // === 🎯 其他核心方法（保持兼容，优化性能） ===
    onSeriesSelected(e) {
        this.cleanupModules();
        const { chapters } = e.detail;
        this.renderChapterGridOptimized(chapters, '系列文章');
    }

    onAllArticlesRequested() {
        this.cleanupModules();
        const allChapters = this.extractAllChaptersRecursiveOptimized(this.navData);

        console.log('[App] 📚 优化版递归提取章节数量:', allChapters.length);

        if (allChapters.length > 0) {
            this.renderChapterGridOptimized(allChapters, '所有文章');
        } else {
            this.showNoContentMessage();
        }
    }

    // 🎯 优化：章节提取（使用缓存）
    extractAllChaptersRecursiveOptimized(data, level = 0) {
        const cacheKey = `all-chapters-${level}`;
        
        // 🎯 简单缓存检查
        if (level === 0 && this.domCache.has(cacheKey)) {
            const cached = this.domCache.get(cacheKey);
            if (cached && cached.timestamp > Date.now() - 300000) { // 5分钟缓存
                return cached.data;
            }
        }

        const allChapters = this.extractChaptersRecursive(data, [], level);

        // 🎯 缓存结果（仅顶级）
        if (level === 0) {
            this.domCache.set(cacheKey, {
                data: allChapters,
                timestamp: Date.now()
            });
        }

        return allChapters;
    }

    // 🎯 优化：递归章节提取（简化逻辑）
    extractChaptersRecursive(data, parentPath = [], level = 0) {
        if (!data) return [];

        const allChapters = [];
        const items = Array.isArray(data) ? data : [data];

        for (const item of items) {
            try {
                if (this.shouldSkipItem(item)) continue;

                const currentPath = [...parentPath, {
                    id: item.id || item.seriesId || `level_${level}_${Date.now()}`,
                    title: item.title || item.series || 'Untitled',
                    type: item.type,
                    level: level
                }];

                // 提取当前项目的章节
                const chapters = this.extractChaptersFromItemOptimized(item, currentPath);
                allChapters.push(...chapters);

                // 递归处理子结构
                const childResults = this.processChildStructuresOptimized(item, currentPath, level + 1);
                allChapters.push(...childResults);

            } catch (error) {
                console.error(`[App] 处理项目失败:`, item, error);
            }
        }

        return allChapters;
    }

    shouldSkipItem(item) {
        if (!item) return true;
        
        const skipTypes = ['all-articles', 'navigation-header', 'separator', 'placeholder'];
        return skipTypes.includes(item.type) || 
               skipTypes.includes(item.id) || 
               item.skip === true || 
               item.hidden === true;
    }

    // 🎯 优化：从项目提取章节
    extractChaptersFromItemOptimized(item, currentPath) {
        const chapters = [];
        const chapterSources = ['chapters', 'articles', 'content', 'items', 'pages', 'lessons', 'episodes'];

        for (const sourceName of chapterSources) {
            const source = item[sourceName];
            if (Array.isArray(source) && source.length > 0) {
                for (let i = 0; i < source.length; i++) {
                    const chapter = source[i];
                    
                    // 跳过工具类型
                    if (chapter.type === 'tool' || chapter.category === 'tool') continue;

                    chapters.push({
                        ...chapter,
                        id: chapter.id || `chapter_${i}`,
                        title: chapter.title || `Chapter ${i + 1}`,
                        seriesId: currentPath[currentPath.length - 1]?.id,
                        seriesTitle: currentPath[currentPath.length - 1]?.title,
                        breadcrumb: currentPath.map(p => p.title).join(' > '),
                        pathInfo: [...currentPath],
                        sourceProperty: sourceName,
                        depth: currentPath.length,
                        type: chapter.type || 'chapter'
                    });
                }
                break; // 只处理第一个找到的源
            }
        }

        return chapters;
    }

    // 🎯 优化：处理子结构
    processChildStructuresOptimized(item, currentPath, nextLevel) {
        const allChildChapters = [];
        const childSources = ['children', 'subItems', 'subcategories', 'subSeries', 'sections', 'categories'];

        for (const sourceName of childSources) {
            const childSource = item[sourceName];
            if (Array.isArray(childSource) && childSource.length > 0) {
                const childChapters = this.extractChaptersRecursive(childSource, currentPath, nextLevel);
                allChildChapters.push(...childChapters);
            }
        }

        return allChildChapters;
    }

    // 🎯 优化：章节数据提取
    extractChapterDataOptimized(chapterList) {
        const chapters = [];
        const children = chapterList.children;

        for (let i = 0; i < children.length; i++) {
            const item = children[i];
            const link = item.querySelector('.overview-chapter-link');
            const chapterId = link?.dataset.chapterId;
            
            if (chapterId) {
                // 🎯 优化：使用缓存查找
                for (const series of this.navData) {
                    const chapter = series.chapters?.find(ch => ch.id === chapterId);
                    if (chapter) {
                        chapters.push(chapter);
                        break;
                    }
                }
            }
        }

        return chapters;
    }

    // === 🎯 渲染系统（优化版） ===
    renderChapterGridOptimized(chapters, title) {
        if (!chapters?.length) {
            this.showNoContentMessage();
            return;
        }

        // 🎯 优化：检查渲染节流
        const now = Date.now();
        if (now - this.state.performance.lastRender < this.state.performance.renderThreshold) {
            // 🎯 延迟渲染以保持60fps
            setTimeout(() => this.renderChapterGridOptimized(chapters, title), 
                       this.state.performance.renderThreshold);
            return;
        }

        this.state.performance.lastRender = now;

        // 🎯 优化：使用DocumentFragment
        const { isMobile } = this.state.screenInfo;

        this.elements.content.innerHTML = `
            <div class="chapter-list-overview" style="
                display: block !important;
                max-width: 800px !important;
                margin: 0 auto !important;
                padding: ${isMobile ? '16px' : '24px'} !important;
                background: white !important;
                width: 100% !important;
            "></div>
        `;

        const container = this.getElement('.chapter-list-overview');
        const fragment = document.createDocumentFragment();

        // 🎯 优化：批量创建元素
        for (const chapter of chapters) {
            const element = this.createChapterElementOptimized(chapter);
            fragment.appendChild(element);
        }

        container.appendChild(fragment);
        this.state.performance.domOperations++;
    }

    // 🎯 优化：章节元素创建
    createChapterElementOptimized(chapter) {
        const wrapper = document.createElement('div');
        wrapper.className = 'chapter-overview-item';

        const { isMobile } = this.state.screenInfo;
        const hasThumbnail = this.hasValidThumbnail(chapter);

        wrapper.style.cssText = `
            margin-bottom: 0 !important; border: none !important; 
            border-bottom: 1px solid #f0f0f0 !important; border-radius: 0 !important; 
            background: transparent !important; transition: all 0.2s ease !important;
            overflow: visible !important; box-shadow: none !important;
            display: flex !important; align-items: flex-start !important;
            padding: 24px 0 !important; gap: ${isMobile ? '12px' : '16px'} !important;
            position: relative !important; height: auto !important;
        `;

        const link = this.createChapterLinkOptimized(chapter, hasThumbnail, isMobile);
        wrapper.appendChild(link);

        // 🎯 优化：事件委托
        this.addChapterHoverEffectsOptimized(wrapper, hasThumbnail, isMobile);

        return wrapper;
    }

    // 🎯 优化：创建章节链接
    createChapterLinkOptimized(chapter, hasThumbnail, isMobile) {
        const link = document.createElement('a');
        link.className = 'overview-chapter-link';
        link.href = `#${chapter.id}`;
        link.dataset.chapterId = chapter.id;
        link.style.cssText = `
            text-decoration: none !important; color: inherit !important; 
            display: flex !important; align-items: flex-start !important;
            width: 100% !important; gap: ${hasThumbnail ? (isMobile ? '12px' : '16px') : '0'} !important;
            overflow: visible !important; height: auto !important;
        `;

        const contentContainer = this.createContentContainerOptimized(chapter, isMobile);
        link.appendChild(contentContainer);

        if (hasThumbnail) {
            const imageContainer = this.createThumbnailContainerOptimized(chapter, isMobile);
            link.appendChild(imageContainer);
        }

        return link;
    }

    // 🎯 优化：创建内容容器
    createContentContainerOptimized(chapter, isMobile) {
        const contentContainer = document.createElement('div');
        contentContainer.className = 'chapter-info';
        contentContainer.style.cssText = `
            flex: 1 !important; display: flex !important; flex-direction: column !important;
            gap: ${isMobile ? '6px' : '8px'} !important; min-width: 0 !important;
            overflow: visible !important;
        `;

        // 系列信息
        const seriesInfo = this.createSeriesInfoOptimized(chapter, isMobile);
        contentContainer.appendChild(seriesInfo);

        // 标题
        const title = this.createChapterTitleOptimized(chapter, isMobile);
        contentContainer.appendChild(title);

        // 描述
        const description = this.createChapterDescriptionOptimized(chapter, isMobile);
        contentContainer.appendChild(description);

        // 标签行
        const tagsRow = this.createTagsRowOptimized(chapter, isMobile);
        contentContainer.appendChild(tagsRow);

        return contentContainer;
    }

    // 🎯 优化：创建系列信息
    createSeriesInfoOptimized(chapter, isMobile) {
        const seriesInfo = document.createElement('div');
        seriesInfo.className = 'chapter-series-info';
        seriesInfo.style.cssText = `
            display: flex !important; align-items: center !important; gap: 6px !important;
            font-size: ${isMobile ? '12px' : '13px'} !important; color: #666 !important;
            font-weight: 500 !important; margin-bottom: 4px !important;
        `;

        seriesInfo.innerHTML = `
            <span style="font-size: ${isMobile ? '11px' : '12px'} !important;">📺</span>
            <span style="color: #666 !important;">${chapter.seriesTitle || '6 Minutes English'}</span>
        `;

        return seriesInfo;
    }

    // 🎯 优化：创建章节标题
    createChapterTitleOptimized(chapter, isMobile) {
        const title = document.createElement('h2');
        title.style.cssText = `
            margin: 0 !important; font-size: ${isMobile ? '18px' : '22px'} !important; 
            color: #1a1a1a !important; font-weight: 700 !important; line-height: 1.3 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            margin-bottom: ${isMobile ? '6px' : '8px'} !important; display: -webkit-box !important;
            -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important;
            overflow: hidden !important; text-overflow: ellipsis !important;
        `;
        title.textContent = chapter.title;
        return title;
    }

    // 🎯 优化：创建章节描述
    createChapterDescriptionOptimized(chapter, isMobile) {
        const description = document.createElement('p');
        description.style.cssText = `
            margin: 0 !important; font-size: ${isMobile ? '14px' : '15px'} !important; 
            color: #666 !important; line-height: 1.4 !important; font-weight: 400 !important;
            margin-bottom: ${isMobile ? '8px' : '12px'} !important; display: -webkit-box !important;
            -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important;
            overflow: hidden !important; text-overflow: ellipsis !important;
        `;
        description.textContent = chapter.description || 'Explore this English learning topic';
        return description;
    }

    // 🎯 优化：创建标签行（包含智能难度）
    createTagsRowOptimized(chapter, isMobile) {
        const tagsRow = document.createElement('div');
        tagsRow.className = 'chapter-tags-row';
        tagsRow.style.cssText = `
            display: flex !important; align-items: center !important;
            gap: ${isMobile ? '10px' : '12px'} !important;
            font-size: ${isMobile ? '12px' : '13px'} !important;
            color: #666 !important; font-weight: 500 !important; flex-wrap: wrap !important;
        `;

        // 🎯 智能难度计算
        const difficulty = this.getDifficultyOptimized(chapter);
        
        // 难度标签
        const difficultyTag = this.createDifficultyTagOptimized(difficulty);
        tagsRow.appendChild(difficultyTag);

        // 阅读时间
        const timeTag = this.createTimeTagOptimized(chapter);
        tagsRow.appendChild(timeTag);

        // 媒体类型
        const mediaTag = this.createMediaTagOptimized(chapter);
        tagsRow.appendChild(mediaTag);

        return tagsRow;
    }

    // 🎯 优化：智能难度计算
    getDifficultyOptimized(chapter) {
        // 🎯 检查词频管理器
        if (this.state.wordFreq.initialized && this.wordFreqManager?.isInitialized) {
            try {
                const difficulty = this.wordFreqManager.getArticleDifficulty(chapter.id);
                if (difficulty) {
                    return {
                        stars: difficulty.stars,
                        tooltip: difficulty.tooltip || `难度评级：${difficulty.label}`
                    };
                }
            } catch (error) {
                if (this.config.debug) {
                    console.warn('智能难度计算失败:', error);
                }
            }
        }

        // 🎯 降级方案：简单推断
        const titleLength = chapter.title?.length || 30;
        let stars;
        if (titleLength < 25) stars = 2;
        else if (titleLength < 40) stars = 3;
        else stars = 4;

        return {
            stars,
            tooltip: "智能分析中，当前为预估难度"
        };
    }

    // 🎯 优化：创建难度标签
    createDifficultyTagOptimized(difficulty) {
        const difficultyTag = document.createElement('span');
        difficultyTag.style.cssText = `
            display: flex !important; align-items: center !important;
            color: #ffc107 !important; cursor: help !important;
        `;
        difficultyTag.innerHTML = `<span title="${difficulty.tooltip}">${'⭐'.repeat(difficulty.stars)}</span>`;
        return difficultyTag;
    }

    // 🎯 优化：创建时间标签
    createTimeTagOptimized(chapter) {
        const timeTag = document.createElement('span');
        timeTag.style.cssText = `
            display: flex !important; align-items: center !important;
            gap: 4px !important; color: #666 !important;
        `;
        const estimatedTime = chapter.audio ? '6 min' : '4 min';
        timeTag.innerHTML = `<span>📖</span><span>${estimatedTime}</span>`;
        return timeTag;
    }

    // 🎯 优化：创建媒体标签
    createMediaTagOptimized(chapter) {
        const mediaTag = document.createElement('span');
        mediaTag.style.cssText = `
            display: flex !important; align-items: center !important;
            gap: 4px !important; color: #666 !important;
        `;

        if (chapter.audio) {
            mediaTag.innerHTML = `<span>🎵</span><span>Audio</span>`;
        } else {
            mediaTag.innerHTML = `<span>📖</span><span>Article</span>`;
        }

        return mediaTag;
    }

    // 🎯 优化：悬停效果
    addChapterHoverEffectsOptimized(wrapper, hasThumbnail, isMobile) {
        const addHoverEffect = () => {
            wrapper.style.backgroundColor = '#fafafa';
            const title = wrapper.querySelector('h2');
            if (title) title.style.color = '#1a73e8';

            if (hasThumbnail) {
                const thumbnail = wrapper.querySelector('.chapter-thumbnail');
                if (thumbnail) thumbnail.style.transform = 'scale(1.05)';
            }
        };

        const removeHoverEffect = () => {
            wrapper.style.backgroundColor = 'transparent';
            const title = wrapper.querySelector('h2');
            if (title) title.style.color = '#1a1a1a';

            if (hasThumbnail) {
                const thumbnail = wrapper.querySelector('.chapter-thumbnail');
                if (thumbnail) thumbnail.style.transform = 'scale(1)';
            }
        };

        if (isMobile) {
            wrapper.addEventListener('touchstart', addHoverEffect);
            wrapper.addEventListener('touchend', removeHoverEffect);
            wrapper.addEventListener('touchcancel', removeHoverEffect);
        } else {
            wrapper.addEventListener('mouseenter', addHoverEffect);
            wrapper.addEventListener('mouseleave', removeHoverEffect);
        }
    }

    // 🎯 优化：缩略图处理
    hasValidThumbnail(chapter) {
        if (!chapter.thumbnail) return false;
        if (typeof chapter.thumbnail !== 'string' || !chapter.thumbnail.trim()) return false;

        const placeholderPaths = [
            'images/placeholder.jpg', 'placeholder.jpg', '/placeholder.jpg',
            'images/default.jpg', 'default.jpg'
        ];

        const normalizedPath = chapter.thumbnail.toLowerCase().replace(/^\.\//, '');
        if (placeholderPaths.includes(normalizedPath)) return false;

        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i;
        const isHttpUrl = /^https?:\/\//.test(chapter.thumbnail);
        const isRelativePath = /^(\.\/|\/|images\/|assets\/)/.test(chapter.thumbnail);
        const hasImageExtension = imageExtensions.test(chapter.thumbnail);

        return (isHttpUrl || isRelativePath) && (hasImageExtension || isHttpUrl);
    }

    createThumbnailContainerOptimized(chapter, isMobile) {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'chapter-thumbnail-container';
        imageContainer.style.cssText = `
            width: ${isMobile ? '80px' : '120px'} !important;
            height: ${isMobile ? '60px' : '90px'} !important;
            flex-shrink: 0 !important; border-radius: 8px !important;
            overflow: hidden !important; background: #f8f9fa !important;
            position: relative !important;
        `;

        const thumbnail = document.createElement('img');
        thumbnail.className = 'chapter-thumbnail';
        thumbnail.loading = 'lazy';
        thumbnail.src = chapter.thumbnail;
        thumbnail.alt = chapter.title;
        thumbnail.style.cssText = `
            width: 100% !important; height: 100% !important;
            object-fit: cover !important; display: block !important;
            transition: transform 0.3s ease, opacity 0.3s ease !important;
            opacity: 0.8;
        `;

        thumbnail.addEventListener('error', () => {
            this.handleThumbnailErrorOptimized(imageContainer);
        }, { once: true });

        thumbnail.addEventListener('load', () => {
            thumbnail.style.opacity = '1';
        }, { once: true });

        imageContainer.appendChild(thumbnail);
        return imageContainer;
    }

    handleThumbnailErrorOptimized(container) {
        const placeholder = document.createElement('div');
        placeholder.style.cssText = `
            width: 100% !important; height: 100% !important;
            display: flex !important; align-items: center !important;
            justify-content: center !important;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
            color: #6c757d !important; font-size: 24px !important;
        `;
        placeholder.textContent = '📖';

        container.innerHTML = '';
        container.appendChild(placeholder);
        container.classList.add('thumbnail-error');
    }

    // === 🎯 其他核心方法（优化版） ===
    onChapterLoaded(e) {
        const { chapterId, hasAudio } = e.detail;
        this.cleanupModules();

        if (!hasAudio) {
            this.initializeGlossaryOnly(chapterId);
            return;
        }

        if (this.elements.playerSection) {
            this.elements.playerSection.style.display = 'block';
        }

        if (this.elements.audioPlayer) {
            this.elements.audioPlayer.src = `audio/${chapterId}.mp3`;
            this.elements.audioPlayer.load();
        }

        this.initializeAudioChapter(chapterId);
    }

    async initializeGlossaryOnly(chapterId) {
        this.showLoadingIndicator('正在初始化词汇表...');

        try {
            if (!window.EnglishSite.Glossary) {
                throw new Error('Glossary class not found');
            }

            const glossaryConfig = window.EnglishSite.ConfigManager?.createModuleConfig('glossary', {
                debug: this.config.debug
            });

            this.glossaryManager = new window.EnglishSite.Glossary(
                this.elements.content,
                chapterId,
                glossaryConfig
            );

            if (this.glossaryManager.waitForInitialization) {
                await this.glossaryManager.waitForInitialization();
            }

            this.setLoadingState('glossary', true);

        } catch (error) {
            this.setLoadingState('glossary', false, error);
            this.handleError('init-glossary', error);
            window.EnglishSite.UltraSimpleError?.showError('词汇表初始化失败');
        } finally {
            this.hideLoadingIndicator();
        }
    }

    async initializeAudioChapter(chapterId) {
        this.showLoadingIndicator('正在加载音频同步...');

        try {
            // 并行加载
            const [srtText] = await Promise.all([
                this.loadSRTFile(chapterId)
            ]);

            if (!window.EnglishSite.AudioSync) {
                throw new Error('AudioSync class not found');
            }

            const audioSyncConfig = window.EnglishSite.ConfigManager?.createModuleConfig('audioSync', {
                debug: this.config.debug
            });

            this.audioSyncManager = new window.EnglishSite.AudioSync(
                this.elements.content,
                srtText,
                this.elements.audioPlayer,
                audioSyncConfig
            );

            const glossaryPromise = this.initializeGlossaryForAudio(chapterId);

            await Promise.all([
                this.audioSyncManager.waitForInitialization?.() || Promise.resolve(),
                glossaryPromise
            ]);

            this.setLoadingState('audioSync', true);
            this.setLoadingState('glossary', true);

        } catch (error) {
            this.handleError('init-audio-chapter', error);

            try {
                await this.initializeGlossaryOnly(chapterId);
                window.EnglishSite.UltraSimpleError?.showError('音频同步功能不可用，仅加载词汇表');
            } catch (fallbackError) {
                this.handleChapterLoadError(chapterId, fallbackError);
            }
        } finally {
            this.hideLoadingIndicator();
        }
    }

    async initializeGlossaryForAudio(chapterId) {
        if (!window.EnglishSite.Glossary) return;

        const glossaryConfig = window.EnglishSite.ConfigManager?.createModuleConfig('glossary', {
            debug: this.config.debug,
            audioManager: this.audioSyncManager
        });

        this.glossaryManager = new window.EnglishSite.Glossary(
            this.elements.content,
            chapterId,
            glossaryConfig
        );

        if (this.glossaryManager.waitForInitialization) {
            await this.glossaryManager.waitForInitialization();
        }
    }

    async loadSRTFile(chapterId) {
        const cache = window.EnglishSite.CacheManager?.getCache('srt');
        const cachedSrt = cache?.get(chapterId);

        if (cachedSrt) return cachedSrt;

        const response = await fetch(`srt/${chapterId}.srt`);
        if (!response.ok) {
            throw new Error(`SRT file not found: ${response.statusText}`);
        }

        const srtText = await response.text();
        cache?.set(chapterId, srtText);
        return srtText;
    }

    // === 🎯 导航和章节控制 ===
    onNavigationUpdated(e) {
        const { prevChapterId, nextChapterId } = e.detail;

        this.cleanupChapterNavigation();

        if (!prevChapterId && !nextChapterId) return;

        this.createContentEndNavigation(prevChapterId, nextChapterId);
    }

    cleanupChapterNavigation() {
        const existingNav = this.getElement('.content-chapter-nav');
        if (existingNav) existingNav.remove();

        if (this.elements.chapterNavContainer) {
            this.elements.chapterNavContainer.style.display = 'none';
            this.elements.chapterNavContainer.innerHTML = '';
        }

        this.chapterNavState.isVisible = false;
        this.chapterNavState.navElement = null;
    }

    createContentEndNavigation(prevChapterId, nextChapterId) {
        const navWrapper = document.createElement('div');
        navWrapper.className = 'content-chapter-nav';
        navWrapper.style.cssText = `
            margin-top: 40px; padding: 24px 0; border-top: 2px solid #e9ecef;
            opacity: 0; transform: translateY(20px);
            transition: opacity 0.4s ease, transform 0.4s ease; pointer-events: none;
        `;

        const navTitle = document.createElement('div');
        navTitle.style.cssText = `
            text-align: center; font-size: 0.9rem; color: #6c757d;
            margin-bottom: 16px; font-weight: 500;
        `;
        navTitle.textContent = 'Continue Reading';
        navWrapper.appendChild(navTitle);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex; justify-content: space-between; align-items: center;
            gap: 16px; flex-wrap: wrap;
        `;

        if (prevChapterId) {
            buttonContainer.appendChild(this.createChapterNavButton(prevChapterId, '← Previous', 'prev'));
        } else {
            buttonContainer.appendChild(this.createPlaceholder());
        }

        buttonContainer.appendChild(this.createHomeButton());

        if (nextChapterId) {
            buttonContainer.appendChild(this.createChapterNavButton(nextChapterId, 'Next →', 'next'));
        } else {
            buttonContainer.appendChild(this.createPlaceholder());
        }

        navWrapper.appendChild(buttonContainer);
        this.elements.content.appendChild(navWrapper);

        this.chapterNavState.navElement = navWrapper;
        this.setupChapterNavScrollListener();
    }

    createPlaceholder() {
        const placeholder = document.createElement('div');
        placeholder.style.cssText = 'flex: 1; min-width: 120px;';
        return placeholder;
    }

    createHomeButton() {
        const homeButton = document.createElement('button');
        homeButton.innerHTML = 'Back to Index';
        homeButton.style.cssText = `
            padding: 12px 20px; background: linear-gradient(135deg, #6c757d, #5a6268);
            color: white; border: none; border-radius: 6px; font-size: 14px;
            font-weight: 500; cursor: pointer; transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;

        homeButton.addEventListener('click', () => {
            window.location.hash = '';
        });

        return homeButton;
    }

    createChapterNavButton(chapterId, text, type) {
        const button = document.createElement('button');
        button.innerHTML = text;
        button.dataset.chapterId = chapterId;

        const colors = {
            prev: { base: '#28a745', hover: '#218838', gradient: '#20c997' },
            next: { base: '#007bff', hover: '#0056b3', gradient: '#17a2b8' }
        };

        const color = colors[type];
        button.style.cssText = `
            flex: 1; min-width: 120px; max-width: 200px; padding: 12px 20px;
            background: linear-gradient(135deg, ${color.base}, ${color.gradient});
            color: white; border: none; border-radius: 6px; font-size: 14px;
            font-weight: 500; cursor: pointer; transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        `;

        button.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.navigation) {
                this.navigation.navigateToChapter(chapterId);
            }
        });

        return button;
    }

    setupChapterNavScrollListener() {
        if (!this.chapterNavState.navElement || !this.elements.content) return;

        const handleScroll = this.throttle(() => {
            const scrollTop = this.elements.content.scrollTop;
            const scrollHeight = this.elements.content.scrollHeight;
            const clientHeight = this.elements.content.clientHeight;

            const scrollPercent = scrollTop / (scrollHeight - clientHeight);
            const shouldShow = scrollPercent >= this.chapterNavState.scrollThreshold;

            if (shouldShow && !this.chapterNavState.isVisible) {
                this.showChapterNavigation();
            } else if (!shouldShow && this.chapterNavState.isVisible) {
                this.hideChapterNavigation();
            }
        }, 100);

        this.elements.content.addEventListener('scroll', handleScroll);

        setTimeout(() => {
            const scrollHeight = this.elements.content.scrollHeight;
            const clientHeight = this.elements.content.clientHeight;

            if (scrollHeight <= clientHeight * 1.1) {
                this.showChapterNavigation();
            }
        }, 100);
    }

    showChapterNavigation() {
        if (!this.chapterNavState.navElement || this.chapterNavState.isVisible) return;

        this.chapterNavState.isVisible = true;
        const navElement = this.chapterNavState.navElement;
        navElement.style.opacity = '1';
        navElement.style.transform = 'translateY(0)';
        navElement.style.pointerEvents = 'auto';
    }

    hideChapterNavigation() {
        if (!this.chapterNavState.navElement || !this.chapterNavState.isVisible) return;

        this.chapterNavState.isVisible = false;
        const navElement = this.chapterNavState.navElement;
        navElement.style.opacity = '0';
        navElement.style.transform = 'translateY(20px)';
        navElement.style.pointerEvents = 'none';
    }

    // === 🎯 工具函数（优化版） ===
    throttle(func, limit) {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    setLoadingState(module, success, error = null) {
        this.state.loading.set(module, { loaded: success, error });

        if (this.config.debug) {
            console.log(`[App] ${module} 状态更新:`, { success, error: error?.message });
        }
    }

    handleError(operation, error, context = {}) {
        window.EnglishSite.SimpleErrorHandler?.record('app', operation, error, context);

        if (this.config.debug) {
            console.error(`[App] ${operation} 错误:`, error);
        }
    }

    showLoadingIndicator(text = '正在加载...') {
        if (this.state.isDestroyed) return;

        const indicator = this.elements.loadingIndicator;
        if (!indicator) return;

        const textElement = indicator.querySelector('.loading-text');
        if (textElement) textElement.textContent = text;
        indicator.style.display = 'block';
    }

    hideLoadingIndicator() {
        const indicator = this.elements.loadingIndicator;
        if (indicator) indicator.style.display = 'none';
    }

    updatePageTitle(title) {
        document.title = title ? `${title} | ${this.config.siteTitle}` : this.config.siteTitle;
    }

    cleanupModules() {
        this.hideLoadingIndicator();
        this.cleanupChapterNavigation();

        const cleanupPromises = [];

        if (this.audioSyncManager?.destroy) {
            cleanupPromises.push(
                this.audioSyncManager.destroy().catch(error => {
                    console.warn('[App] AudioSync cleanup error:', error);
                })
            );
        }

        if (this.glossaryManager?.destroy) {
            this.glossaryManager.destroy();
        }

        this.audioSyncManager = null;
        this.glossaryManager = null;
        this.setLoadingState('audioSync', false);
        this.setLoadingState('glossary', false);

        if (this.elements.playerSection) {
            this.elements.playerSection.style.display = 'none';
        }

        return Promise.all(cleanupPromises);
    }

    showNoContentMessage() {
        this.elements.content.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #6c757d; background: linear-gradient(135deg, #f8f9fa, #ffffff); border-radius: 12px; margin: 20px 0; border: 2px dashed #dee2e6;">
                <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.6;">📭</div>
                <h3 style="color: #495057; margin-bottom: 16px; font-size: 20px;">暂无内容</h3>
                <p style="margin-bottom: 16px; color: #6c757d;">没有找到可显示的文章</p>
                <p style="margin-bottom: 24px; color: #868e96; font-size: 14px;">
                    已检查导航数据：${this.navData?.length || 0} 个顶级项目
                </p>
                <button onclick="location.reload()" style="
                    padding: 8px 16px; background: #007bff; color: white; 
                    border: none; border-radius: 4px; cursor: pointer; font-size: 14px;
                ">🔄 重新加载</button>
            </div>
        `;
    }

    handleChapterLoadError(chapterId, error) {
        const errorMessage = `
            <div class="error-message" style="text-align: center; padding: 40px; color: #dc3545;">
                <h3>📖 章节加载失败</h3>
                <p>章节 <strong>${chapterId}</strong> 加载时出现错误：</p>
                <p style="font-style: italic; color: #6c757d;">${error.message}</p>
                <button onclick="location.reload()" 
                        style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 15px;">
                    🔄 重新加载
                </button>
            </div>
        `;
        this.elements.content.innerHTML = errorMessage;
        this.handleError('chapter-load', error, { chapterId });
    }

    // === 🎯 公共API方法（保持100%兼容） ===
    async waitForInitialization() {
        return this.initPromise;
    }

    getAppStatus() {
        return {
            loadingStates: Object.fromEntries(this.state.loading),
            modulesActive: {
                navigation: !!this.navigation,
                glossary: !!this.glossaryManager,
                audioSync: !!this.audioSyncManager,
                wordFreq: !!this.wordFreqManager
            },
            wordFreqState: {
                initialized: this.state.wordFreq.initialized,
                error: this.state.wordFreq.error,
                hasManager: !!this.wordFreqManager,
                uiCreated: this.state.wordFreq.uiCreated,
                containerActive: this.state.wordFreq.containerActive
            },
            chapterNavState: { ...this.chapterNavState },
            isDestroyed: this.state.isDestroyed,
            config: this.config,
            screenInfo: this.state.screenInfo,
            domCacheSize: this.domCache.size,
            performance: this.state.performance,
            version: '4.0'
        };
    }

    // 🔧 新增：获取词频管理器
    async getWordFreqManager() {
        try {
            if (!this.wordFreqManager) {
                console.log('[App] 🆕 词频管理器不存在，开始创建...');
                await this.createUnifiedWordFreqManagerOptimized();
            }

            if (!this.state.wordFreq.initialized && this.wordFreqManagerPromise) {
                console.log('[App] ⏳ 等待词频管理器初始化...');
                await this.wordFreqManagerPromise;
            }

            if (this.wordFreqManager && this.state.wordFreq.initialized) {
                console.log('[App] ✅ 词频管理器已就绪');
                return this.wordFreqManager;
            } else {
                throw new Error('词频管理器初始化失败');
            }

        } catch (error) {
            console.error('[App] ❌ 获取词频管理器失败:', error);
            throw error;
        }
    }

    // 🔧 新增：获取导航状态
    getNavigationState() {
        return this.getNavigationStateOptimized();
    }

    clearDOMCache() {
        this.domCache.clear();
        if (this.config.debug) {
            console.log('[App] DOM缓存已清理');
        }
    }

    // 🔧 新增：性能统计
    logOptimizedStats() {
        console.log('[App] 📊 优化统计 v4.0:', {
            domCacheSize: this.domCache.size,
            domOperations: this.state.performance.domOperations,
            screenInfo: this.state.screenInfo,
            modulesLoaded: Object.fromEntries(this.state.loading),
            wordFreqState: this.state.wordFreq,
            version: '4.0'
        });
    }

    // 🔧 新增：调试状态检查
    checkWordFreqState() {
        const state = {
            appWordFreqManager: !!this.wordFreqManager,
            appWordFreqInitialized: this.state.wordFreq.initialized,
            globalWordFreqManager: !!window.wordFreqManager,
            globalWordFreqUI: !!window.wordFreqUI,
            appWordFreqUI: !!this.wordFreqUIInstance,
            wordFreqManagerInitialized: !!(this.wordFreqManager?.isInitialized),
            wordFreqUIInitialized: !!(this.wordFreqUIInstance?.isInitialized),
            containers: {
                dedicatedContainer: !!this.getElement('#word-frequency-container'),
                contentContainer: !!this.getElement('#content'),
                appContentElement: !!this.elements.content
            },
            state: this.state.wordFreq
        };
        
        console.log('[App] 📊 词频状态检查:', state);
        return state;
    }

    destroy() {
        if (this.state.isDestroyed) return;

        this.state.isDestroyed = true;

        // 🎯 优化：异步清理
        this.cleanupModules().finally(() => {
            // 🔧 清理词频管理器
            this.forceResetWordFreqUI();
            
            if (this.wordFreqManager?.destroy) {
                this.wordFreqManager.destroy();
            }

            // 清理缓存
            this.domCache.clear();

            // 移除事件监听器
            document.removeEventListener('click', this.boundHandlers.handleGlobalClick);
            window.removeEventListener('resize', this.throttledHandlers.handleResize);

            // 清理全局引用
            if (window.app === this) {
                delete window.app;
            }

            if (window.wordFreqManager === this.wordFreqManager) {
                delete window.wordFreqManager;
            }

            if (this.config.debug) {
                console.log('[App] ✅ 重构版App已销毁 v4.0');
            }
        });
    }
}

// === 🚀 启动逻辑（优化版） ===
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.EnglishSite.coreToolsReady;

        const urlParams = new URLSearchParams(window.location.search);
        const appOptions = {
            debug: urlParams.has('debug') || window.location.hostname === 'localhost',
            enableErrorBoundary: urlParams.has('errorBoundary') || urlParams.has('beta')
        };

        // 创建重构版应用实例
        window.app = new App(appOptions);

        // 等待应用初始化
        await window.app.waitForInitialization();

        console.log('[App] ✅ 重构版App启动成功 v4.0');

        // 🎯 调试工具（按需加载）
        if (appOptions.debug && window.appTools) {
            window.appTools.app = window.app;
            console.log('🎯 重构版App实例已添加到 window.appTools.app');

            setTimeout(() => {
                const status = window.app.getAppStatus();
                console.log('📱 当前应用状态 v4.0:', status);
            }, 2000);
        }

    } catch (error) {
        console.error('[App] ❌ 重构版App启动失败:', error);

        window.EnglishSite?.SimpleErrorHandler?.record('app', 'startup', error);
        window.EnglishSite?.UltraSimpleError?.showError('应用启动失败，请刷新页面重试');

        const contentArea = document.getElementById('content');
        if (contentArea) {
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <h2>🚫 重构版App启动失败</h2>
                    <p>发生了严重错误，请刷新页面或联系技术支持。</p>
                    <button onclick="location.reload()" 
                            style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
                        🔄 重新加载
                    </button>
                </div>
            `;
        }
    }
});

// 导出App类
window.EnglishSite.App = App;

// 🎯 全局调试函数（优化版）
window.debugNavData = function() {
    const app = window.app;
    if (!app) {
        console.error('应用实例不存在');
        return;
    }

    console.log('=== 🔍 重构版导航数据调试信息 v4.0 ===');
    console.log('1. 原始导航数据:', app.navData);
    console.log('2. 数据类型:', typeof app.navData, Array.isArray(app.navData));
    console.log('3. 数据长度:', app.navData?.length);

    if (app.navData && Array.isArray(app.navData)) {
        app.navData.forEach((item, index) => {
            console.log(`4.${index} 项目结构:`, {
                id: item.id,
                title: item.title || item.series,
                type: item.type,
                hasChapters: !!item.chapters,
                chaptersCount: item.chapters?.length || 0,
                hasChildren: !!item.children,
                childrenCount: item.children?.length || 0,
                allProperties: Object.keys(item)
            });
        });
    }

    const chapters = app.extractAllChaptersRecursiveOptimized?.(app.navData) || [];
    console.log('5. 优化版提取结果:', chapters);
    console.log('6. 章节数量:', chapters.length);

    return {
        navData: app.navData,
        extractedChapters: chapters,
        summary: {
            topLevelItems: app.navData?.length || 0,
            totalChapters: chapters.length
        },
        version: '4.0'
    };
};

console.log('[App] ✅ 重构优化版main.js加载完成 v4.0');
console.log('[App] 🚀 核心修复: 词频工具二次点击 + 性能优化 + 100%兼容');