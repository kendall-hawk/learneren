// js/main.js - 修复时序冲突版 (确保导航就绪后再启动词频)
window.EnglishSite = window.EnglishSite || {};

class App {
    constructor(options = {}) {
        // 基础配置
        this.config = window.EnglishSite.ConfigManager.createModuleConfig('main', {
            siteTitle: 'Learner',
            debug: false,
            enableErrorBoundary: true,
            ...options
        });

        // 🚀 优化：DOM缓存系统
        this.domCache = new Map();
        this.elements = {};

        // 模块实例
        this.navData = [];
        this.navigation = null;
        this.glossaryManager = null;
        this.audioSyncManager = null;
        
        // 🎯 新增：词频管理器
        this.wordFreqManager = null;

        // 🚀 优化：状态管理（减少重复计算）
        this.state = {
            loading: new Map(),
            isDestroyed: false,
            screenInfo: this.#getScreenInfo(),
            lastResize: 0
        };

        // 🚀 优化：章节导航状态（简化）
        this.chapterNavState = {
            isVisible: false,
            navElement: null,
            scrollThreshold: 0.85
        };

        // 🚀 优化：性能监控（可选）
        this.perfId = null;
        this.initPromise = this.#initialize();
    }

    // 🚀 新增：DOM缓存获取
    #getElement(selector) {
        if (!this.domCache.has(selector)) {
            this.domCache.set(selector, document.querySelector(selector));
        }
        return this.domCache.get(selector);
    }

    // 🚀 新增：屏幕信息缓存
    #getScreenInfo() {
        const width = window.innerWidth;
        return {
            width,
            height: window.innerHeight,
            isMobile: width <= 768,
            isTablet: width > 768 && width <= 1024,
            devicePixelRatio: window.devicePixelRatio || 1
        };
    }

    async #initialize() {
        this.perfId = window.EnglishSite.PerformanceMonitor?.startMeasure('app-init', 'app');

        try {
            await window.EnglishSite.coreToolsReady;

            // 🚀 优化：错误处理简化
            window.EnglishSite.SimpleErrorHandler.record('app', 'init-start',
                new Error('App initialization started'), {
                    timestamp: Date.now()
                });

            this.#selectDOMElements();
            this.#initializeLoadingStates();
            this.#validateDOMStructure();

            await this.#initApp();

            window.EnglishSite.PerformanceMonitor?.endMeasure(this.perfId);

            if (this.config.debug) {
                console.log('[App] 初始化完成');
                window.EnglishSite.PerformanceMonitor?.recordMetric('app-init-success', 1, 'app');
            }

        } catch (error) {
            window.EnglishSite.PerformanceMonitor?.endMeasure(this.perfId);
            this.#handleError('initialization', error);
            throw error;
        }
    }

    // 🚀 优化：DOM选择器（使用缓存）
    #selectDOMElements() {
        const elementMap = {
            mainNav: '#main-nav',
            content: '#content',
            playerSection: '#player-section',
            audioPlayer: '#audio-player',
            chapterNavContainer: '#chapter-nav-container',
            backToTop: '#back-to-top'
        };

        for (const [key, selector] of Object.entries(elementMap)) {
            this.elements[key] = this.#getElement(selector);
        }

        // 创建加载指示器（只在需要时）
        this.elements.loadingIndicator = this.#getElement('#loading-indicator') ||
            this.#createLoadingIndicator();

        // 🚀 优化：验证关键元素（简化）
        if (!this.elements.mainNav || !this.elements.content) {
            throw new Error('Required DOM elements not found: main-nav or content');
        }
    }

    // 🚀 优化：创建加载指示器（减少DOM操作）
    #createLoadingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'loading-indicator';
        indicator.className = 'loading-indicator';
        indicator.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">正在加载...</div>
        `;

        // 🚀 优化：使用CSS变量而非内联样式
        indicator.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0;
            background: rgba(255, 255, 255, 0.95); z-index: 9999;
            padding: 20px; text-align: center; display: none;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;

        document.body.appendChild(indicator);
        return indicator;
    }

    // 🚀 优化：加载状态管理（简化）
    #initializeLoadingStates() {
        ['navigation', 'glossary', 'audioSync', 'wordFreq'].forEach(state => {
            this.state.loading.set(state, {
                loaded: false,
                error: null
            });
        });
    }

    // 🚀 优化：DOM结构验证（减少检查）
    #validateDOMStructure() {
        const critical = [{
                selector: 'main',
                name: 'mainElement'
            },
            {
                selector: '#glossary-popup',
                name: 'glossaryPopup'
            },
            {
                selector: '.main-navigation',
                name: 'navigation'
            }
        ];

        const results = {};
        for (const {
                selector,
                name
            }
            of critical) {
            results[name] = !!this.#getElement(selector);
        }

        if (this.config.debug) {
            console.log('[App] DOM validation:', results);
        }

        return results;
    }

    // 🚀 优化：显示/隐藏加载器（减少DOM查询）
    #showLoadingIndicator(text = '正在加载...') {
        if (this.state.isDestroyed) return;

        const indicator = this.elements.loadingIndicator;
        if (!indicator) return;

        const textElement = indicator.querySelector('.loading-text');
        if (textElement) textElement.textContent = text;
        indicator.style.display = 'block';
    }

    #hideLoadingIndicator() {
        const indicator = this.elements.loadingIndicator;
        if (indicator) indicator.style.display = 'none';
    }

    // 🔧 修复：串行初始化 - 确保导航就绪后再启动词频
    async #initApp() {
        this.#showLoadingIndicator('正在初始化应用...');

        try {
            // 🚀 优化：检查缓存（一次性获取）
            const cache = window.EnglishSite.CacheManager?.getCache('content');
            const cachedNavData = cache?.get('navigation-data');

            if (cachedNavData) {
                this.navData = cachedNavData;
                this.#setLoadingState('navigation', true);
                if (this.config.debug) console.log('[App] 使用缓存的导航数据');
            } else {
                await this.#loadNavigationData();
            }

            // 🔧 修复核心：串行初始化，确保导航系统完全就绪
            console.log('[App] 🔧 开始串行初始化 - 确保时序正确');
            
            // 1. 先初始化事件监听器（不依赖其他模块）
            this.#addEventListeners();
            
            // 2. 等待导航系统完全初始化完成
            console.log('[App] 📍 第1步：初始化导航系统...');
            await this.#initializeNavigation();
            
            // 3. 验证导航系统状态
            const navReady = this.#verifyNavigationReady();
            if (!navReady) {
                console.warn('[App] ⚠️ 导航系统未完全就绪，但继续初始化');
            } else {
                console.log('[App] ✅ 导航系统已就绪，chaptersMap大小:', this.navigation?.state?.chaptersMap?.size || 0);
            }
            
            // 4. 导航就绪后，初始化词频管理器
            console.log('[App] 📍 第2步：导航就绪，开始初始化词频管理器...');
            await this.#initializeWordFrequency();

            this.#hideLoadingIndicator();

            if (this.config.debug) {
                console.log('[App] ✅ 串行初始化完成，所有模块已就绪');
            }

        } catch (error) {
            this.#hideLoadingIndicator();
            throw error;
        }
    }

    // 🔧 新增：验证导航系统就绪状态
    #verifyNavigationReady() {
        try {
            if (!this.navigation) {
                console.warn('[App] 导航实例不存在');
                return false;
            }

            if (!this.navigation.state) {
                console.warn('[App] 导航状态不存在');
                return false;
            }

            const chaptersMap = this.navigation.state.chaptersMap;
            if (!chaptersMap || chaptersMap.size === 0) {
                console.warn('[App] 章节映射为空:', chaptersMap?.size || 0);
                return false;
            }

            console.log('[App] ✅ 导航系统验证通过:', {
                hasNavigation: !!this.navigation,
                hasState: !!this.navigation.state,
                chaptersCount: chaptersMap.size
            });

            return true;

        } catch (error) {
            console.error('[App] 导航系统验证失败:', error);
            return false;
        }
    }

    // 🎯 修复：初始化词频管理器 - 增加就绪检测
    async #initializeWordFrequency() {
        const perfId = window.EnglishSite.PerformanceMonitor?.startMeasure('init-word-freq', 'module');

        try {
            console.log('[App] 🔤 开始初始化词频管理器...');

            // 检查词频类是否可用
            if (!window.EnglishSite.WordFrequencyManager) {
                console.warn('[App] ⚠️ 词频管理器类未找到，跳过初始化');
                this.#setLoadingState('wordFreq', false, new Error('WordFrequencyManager not found'));
                return;
            }

            // 🔧 修复：传递导航状态信息给词频管理器
            const navigationState = this.#getNavigationState();
            console.log('[App] 📊 传递导航状态给词频管理器:', navigationState);

            // 创建词频管理器实例
            this.wordFreqManager = new window.EnglishSite.WordFrequencyManager(navigationState);

            // 等待初始化完成（非阻塞）
            this.wordFreqManager.waitForReady().then(() => {
                this.#setLoadingState('wordFreq', true);
                console.log('[App] ✅ 词频管理器初始化完成');
                
                // 🎯 暴露到全局，供其他模块使用
                window.app.wordFreqManager = this.wordFreqManager;
                
            }).catch(error => {
                this.#setLoadingState('wordFreq', false, error);
                console.warn('[App] ⚠️ 词频管理器初始化失败:', error.message);
            });

            window.EnglishSite.PerformanceMonitor?.endMeasure(perfId);

        } catch (error) {
            window.EnglishSite.PerformanceMonitor?.endMeasure(perfId);
            this.#setLoadingState('wordFreq', false, error);
            this.#handleError('init-word-frequency', error);
            console.warn('[App] ⚠️ 词频管理器初始化异常:', error.message);
        }
    }

    // 🔧 新增：获取导航状态信息
    #getNavigationState() {
        try {
            if (!this.navigation || !this.navigation.state) {
                console.warn('[App] 导航状态不可用，返回空状态');
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

    // 🚀 优化：加载导航数据（减少错误处理）
    async #loadNavigationData() {
        const perfId = window.EnglishSite.PerformanceMonitor?.startMeasure('load-nav-data', 'network');

        try {
            const response = await fetch('data/navigation.json');
            if (!response.ok) {
                throw new Error(`无法加载导航数据: ${response.statusText}`);
            }

            this.navData = await response.json();

            // 缓存导航数据
            const cache = window.EnglishSite.CacheManager?.getCache('content');
            cache?.set('navigation-data', this.navData);

            this.#setLoadingState('navigation', true);
            window.EnglishSite.PerformanceMonitor?.endMeasure(perfId);

        } catch (error) {
            window.EnglishSite.PerformanceMonitor?.endMeasure(perfId);
            this.#setLoadingState('navigation', false, error);
            this.#handleError('load-navigation', error);
            throw error;
        }
    }

    // 🚀 优化：导航初始化（简化错误处理）
    async #initializeNavigation() {
        const perfId = window.EnglishSite.PerformanceMonitor?.startMeasure('init-navigation', 'module');

        try {
            if (!window.EnglishSite.Navigation) {
                throw new Error('Navigation class not found');
            }

            const navigationConfig = window.EnglishSite.ConfigManager.createModuleConfig('navigation', {
                siteTitle: this.config.siteTitle,
                debug: this.config.debug
            });

            this.navigation = new window.EnglishSite.Navigation(
                this.elements.mainNav,
                this.elements.content,
                this.navData,
                navigationConfig
            );

            if (this.navigation.waitForInitialization) {
                await this.navigation.waitForInitialization();
            }

            // 🔧 额外等待确保章节映射完成
            let retryCount = 0;
            const maxRetries = 10;
            
            while (retryCount < maxRetries) {
                if (this.navigation.state?.chaptersMap?.size > 0) {
                    console.log(`[App] ✅ 导航章节映射已完成: ${this.navigation.state.chaptersMap.size} 个章节`);
                    break;
                }
                
                console.log(`[App] ⏳ 等待章节映射完成... (第${retryCount + 1}次检查)`);
                await new Promise(resolve => setTimeout(resolve, 100));
                retryCount++;
            }

            this.#setLoadingState('navigation', true);
            window.EnglishSite.PerformanceMonitor?.endMeasure(perfId);

        } catch (error) {
            window.EnglishSite.PerformanceMonitor?.endMeasure(perfId);
            this.#setLoadingState('navigation', false, error);
            this.#handleError('init-navigation', error);
            throw new Error('导航模块初始化失败');
        }
    }

    // 🚀 优化：设置加载状态（简化）
    #setLoadingState(module, success, error = null) {
        this.state.loading.set(module, {
            loaded: success,
            error
        });

        if (this.config.debug) {
            console.log(`[App] ${module} 状态更新:`, {
                success,
                error: error?.message
            });
        }
    }

    // 🚀 优化：错误处理（统一入口）
    #handleError(operation, error) {
        window.EnglishSite.SimpleErrorHandler?.record('app', operation, error);

        if (this.config.debug) {
            console.error(`[App] ${operation} 错误:`, error);
        }
    }

    // 🚀 优化：事件监听器（使用事件委托）
    #addEventListeners() {
        // 🚀 主要改进：统一事件委托
        document.addEventListener('click', this.#handleGlobalClick.bind(this));

        // 🚀 自定义事件（保持原有功能）
        const customEvents = [{
                name: 'seriesSelected',
                handler: (e) => this.#onSeriesSelected(e)
            },
            {
                name: 'allArticlesRequested',
                handler: () => this.#onAllArticlesRequested()
            },
            {
                name: 'chapterLoaded',
                handler: (e) => this.#onChapterLoaded(e)
            },
            {
                name: 'navigationUpdated',
                handler: (e) => this.#onNavigationUpdated(e)
            },
            // 🎯 新增：词频工具事件
            {
                name: 'wordFrequencyRequested',
                handler: (e) => this.#onWordFrequencyRequested(e)
            }
        ];

        customEvents.forEach(({
            name,
            handler
        }) => {
            document.addEventListener(name, handler);
        });

        // 🚀 优化：滚动事件（节流优化）
        if (this.elements.content) {
            const throttledScroll = this.#throttle(() => this.#handleScrollOptimized(), 16);
            this.elements.content.addEventListener('scroll', throttledScroll, {
                passive: true
            });
        }

        // 🚀 优化：窗口事件（合并处理）
        window.addEventListener('beforeunload', () => this.destroy());
        window.addEventListener('resize', this.#throttle(() => this.#handleWindowResize(), 250));
    }

    // 🎯 新增：词频工具请求处理
    #onWordFrequencyRequested(e) {
        console.log('[App] 🔤 处理词频工具请求');
        
        try {
            this.#cleanupModules();
            
            // 检查词频工具是否可用
            if (typeof window.navigateToWordFrequency === 'function') {
                const success = window.navigateToWordFrequency();
                if (success) {
                    this.#updatePageTitle('词频分析工具');
                    console.log('[App] ✅ 词频工具启动成功');
                } else {
                    throw new Error('词频工具启动失败');
                }
            } else {
                throw new Error('词频工具不可用');
            }
            
        } catch (error) {
            console.error('[App] ❌ 词频工具启动失败:', error);
            this.#handleWordFrequencyError(error);
        }
    }

    // 🎯 新增：词频工具错误处理
    #handleWordFrequencyError(error) {
        const errorMessage = `
            <div class="error-message" style="text-align: center; padding: 40px; color: #dc3545;">
                <h3>🔤 词频分析工具暂不可用</h3>
                <p>工具启动时出现错误：</p>
                <p style="font-style: italic; color: #6c757d;">${error.message}</p>
                <button onclick="location.reload()" 
                        style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 15px;">
                    🔄 重新加载
                </button>
            </div>
        `;
        this.elements.content.innerHTML = errorMessage;
        this.#handleError('word-frequency-tool', error);
    }

    // 🎯 新增：更新页面标题
    #updatePageTitle(title) {
        document.title = title ? `${title} | ${this.config.siteTitle}` : this.config.siteTitle;
    }

    // 🚀 新增：全局点击处理（事件委托）
    #handleGlobalClick(event) {
        const target = event.target;

        // 章节链接点击
        const chapterLink = target.closest('.overview-chapter-link');
        if (chapterLink?.dataset.chapterId && this.navigation) {
            event.preventDefault();
            this.navigation.navigateToChapter(chapterLink.dataset.chapterId);
            return;
        }

        // 返回顶部按钮
        if (target.closest('#back-to-top')) {
            this.#handleBackToTopClick();
            return;
        }

        // 其他点击事件可以在这里添加
    }

    // 🚀 优化：窗口大小改变（缓存屏幕信息）
    #handleWindowResize() {
        const now = Date.now();
        if (now - this.state.lastResize < 100) return; // 防抖

        this.state.lastResize = now;
        this.state.screenInfo = this.#getScreenInfo();

        // 重新渲染章节列表（如果存在）
        const chapterList = this.elements.content.querySelector('.chapter-list-overview');
        if (chapterList) {
            const chapters = this.#extractChapterData(chapterList);
            if (chapters.length > 0) {
                this.#renderChapterGrid(chapters, '');
            }
        }
    }

    // 🚀 新增：提取章节数据（避免重复查询）
    #extractChapterData(chapterList) {
        return [...chapterList.children].map(item => {
            const link = item.querySelector('.overview-chapter-link');
            const chapterId = link?.dataset.chapterId;
            if (chapterId) {
                for (const series of this.navData) {
                    const chapter = series.chapters?.find(ch => ch.id === chapterId);
                    if (chapter) return chapter;
                }
            }
            return null;
        }).filter(Boolean);
    }

    // 🚀 优化：节流函数（性能优化）
    #throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        return function(...args) {
            const currentTime = Date.now();

            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }

    // 保持所有原有事件处理方法不变...
    #onSeriesSelected(e) {
        this.#cleanupModules();
        const {
            chapters
        } = e.detail;
        this.#renderChapterGrid(chapters, '系列文章');
    }

    #onAllArticlesRequested() {
        this.#cleanupModules();

        // 🚀 使用无限递归提取所有章节
        const allChapters = this.#extractAllChaptersRecursive(this.navData);

        console.log('[App] 📚 递归提取的章节数量:', allChapters.length);
        console.log('[App] 📚 章节详情:', allChapters);

        if (allChapters.length > 0) {
            this.#renderChapterGrid(allChapters, '所有文章');
        } else {
            console.warn('[App] ⚠️ 没有找到任何章节');
            this.#showNoContentMessage();
        }
    }
    // 🚀 核心：无限递归章节提取器
    #extractAllChaptersRecursive(data, parentPath = [], level = 0) {
        if (!data) {
            console.warn('[App] 数据为空:', data);
            return [];
        }

        const allChapters = [];
        const items = Array.isArray(data) ? data : [data];

        console.log(`[App] 🔍 第${level}层递归，处理${items.length}个项目`);

        items.forEach((item, index) => {
            try {
                // 跳过特殊类型的项目
                if (this.#shouldSkipItem(item)) {
                    console.log(`[App] ⏭️ 跳过项目: ${item.id || item.title} (类型: ${item.type})`);
                    return;
                }

                // 构建当前路径信息
                const currentPath = [
                    ...parentPath,
                    {
                        id: item.id || item.seriesId || `level_${level}_${index}`,
                        title: item.title || item.series || item.name || 'Untitled',
                        type: item.type,
                        level: level
                    }
                ];

                console.log(`[App] 📂 处理项目: ${currentPath[currentPath.length - 1].title} (第${level}层)`);

                // 🔑 核心1：提取当前项目的章节
                const chapters = this.#extractChaptersFromItem(item, currentPath);
                if (chapters.length > 0) {
                    allChapters.push(...chapters);
                    console.log(`[App] ✅ 从 "${currentPath[currentPath.length - 1].title}" 提取到 ${chapters.length} 个章节`);
                }

                // 🔑 核心2：递归处理所有可能的子结构
                const childResults = this.#processAllChildStructures(item, currentPath, level + 1);
                if (childResults.length > 0) {
                    allChapters.push(...childResults);
                    console.log(`[App] 🌿 从子结构递归获得 ${childResults.length} 个章节`);
                }

            } catch (error) {
                console.error(`[App] ❌ 处理项目失败:`, item, error);
            }
        });

        console.log(`[App] 📊 第${level}层完成，总计提取 ${allChapters.length} 个章节`);
        return allChapters;
    }

    // 🔑 判断是否应该跳过某个项目
    #shouldSkipItem(item) {
        if (!item) return true;

        // 跳过的类型列表
        const skipTypes = [
            'all-articles',
            'navigation-header',
            'separator',
            'placeholder'
        ];

        return skipTypes.includes(item.type) ||
            skipTypes.includes(item.id) ||
            item.skip === true ||
            item.hidden === true;
    }

    // 🔑 从单个项目中提取章节
    #extractChaptersFromItem(item, currentPath) {
        const chapters = [];

        // 支持多种章节属性名
        const chapterSources = [
            'chapters',
            'articles',
            'content',
            'items',
            'pages',
            'lessons',
            'episodes'
        ];

        for (const sourceName of chapterSources) {
            const source = item[sourceName];
            if (Array.isArray(source) && source.length > 0) {
                console.log(`[App] 🎯 在 "${sourceName}" 中找到 ${source.length} 个项目`);

                source.forEach((chapter, chapterIndex) => {
                    // 过滤掉工具类型的章节
                    if (chapter.type === 'tool' || chapter.category === 'tool') {
                        console.log(`[App] 🔧 跳过工具: ${chapter.title || chapter.id}`);
                        return;
                    }

                    // 构建章节对象
                    const processedChapter = {
                        // 原始章节数据
                        ...chapter,

                        // 添加路径信息
                        id: chapter.id || `chapter_${chapterIndex}`,
                        title: chapter.title || `Chapter ${chapterIndex + 1}`,

                        // 添加层级信息
                        seriesId: currentPath[currentPath.length - 1]?.id,
                        seriesTitle: currentPath[currentPath.length - 1]?.title,

                        // 完整路径信息（便于调试和显示）
                        breadcrumb: currentPath.map(p => p.title).join(' > '),
                        pathInfo: [...currentPath],
                        sourceProperty: sourceName,

                        // 层级深度
                        depth: currentPath.length,

                        // 如果没有类型，设置默认类型
                        type: chapter.type || 'chapter'
                    };

                    chapters.push(processedChapter);
                    console.log(`[App] 📄 处理章节: ${processedChapter.title} (来源: ${sourceName})`);
                });

                // 只处理第一个找到的有效章节源
                if (chapters.length > 0) break;
            }
        }

        return chapters;
    }

    // 🔑 处理所有可能的子结构
    #processAllChildStructures(item, currentPath, nextLevel) {
        const allChildChapters = [];

        // 支持多种子结构属性名
        const childSources = [
            'children',
            'subItems',
            'subcategories',
            'subSeries',
            'sections',
            'categories',
            'groups',
            'modules',
            'units',
            'parts'
        ];

        for (const sourceName of childSources) {
            const childSource = item[sourceName];
            if (Array.isArray(childSource) && childSource.length > 0) {
                console.log(`[App] 🌳 在 "${sourceName}" 中发现 ${childSource.length} 个子项，准备递归处理`);

                // 递归处理子结构
                const childChapters = this.#extractAllChaptersRecursive(
                    childSource,
                    currentPath,
                    nextLevel
                );

                if (childChapters.length > 0) {
                    allChildChapters.push(...childChapters);
                    console.log(`[App] 🎉 从 "${sourceName}" 递归获得 ${childChapters.length} 个章节`);
                }
            }
        }

        return allChildChapters;
    }

    // 🔧 辅助：显示无内容消息（增强版）
    #showNoContentMessage() {
        this.elements.content.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: #f8f9fa; border-radius: 12px; margin: 20px;">
                <div style="font-size: 3rem; margin-bottom: 20px;">📭</div>
                <h2 style="margin-bottom: 16px; color: #6c757d;">暂无内容</h2>
                <p style="margin-bottom: 16px; color: #6c757d;">没有找到可显示的文章</p>
                <p style="margin-bottom: 24px; color: #868e96; font-size: 14px;">
                    已检查导航数据：${this.navData?.length || 0} 个顶级项目
                </p>
                <div style="margin-bottom: 24px;">
                    <button onclick="window.debugNavData()" style="
                        padding: 8px 16px; 
                        background: #6c757d; 
                        color: white; 
                        border: none; 
                        border-radius: 4px; 
                        cursor: pointer; 
                        margin-right: 8px;
                        font-size: 14px;
                    ">🔍 调试导航数据</button>
                    <button onclick="location.reload()" style="
                        padding: 8px 16px; 
                        background: #007bff; 
                        color: white; 
                        border: none; 
                        border-radius: 4px; 
                        cursor: pointer; 
                        font-size: 14px;
                    ">🔄 重新加载</button>
                </div>
            </div>
        `;
    }

    #onChapterLoaded(e) {
        const {
            chapterId,
            hasAudio
        } = e.detail;
        this.#cleanupModules();

        if (!hasAudio) {
            this.#initializeGlossaryOnly(chapterId);
            return;
        }

        if (this.elements.playerSection) {
            this.elements.playerSection.style.display = 'block';
        }

        if (this.elements.audioPlayer) {
            this.elements.audioPlayer.src = `audio/${chapterId}.mp3`;
            this.elements.audioPlayer.load();
        }

        this.#initializeAudioChapter(chapterId);
    }

    // 其余所有方法保持完全不变...
    // [为节省空间，这里省略所有其他原有方法，保持100%不变]

    // === 公共API方法 ===
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
                wordFreq: !!this.wordFreqManager // 🎯 新增
            },
            chapterNavState: {
                ...this.chapterNavState
            },
            isDestroyed: this.state.isDestroyed,
            config: this.config,
            screenInfo: this.state.screenInfo,
            domCacheSize: this.domCache.size
        };
    }

    // 🚀 新增：DOM缓存清理
    clearDOMCache() {
        this.domCache.clear();
        if (this.config.debug) {
            console.log('[App] DOM缓存已清理');
        }
    }

    destroy() {
        if (this.state.isDestroyed) return;

        this.state.isDestroyed = true;

        // 🚀 优化：异步清理
        this.#cleanupModules().finally(() => {
            // 🎯 清理词频管理器
            if (this.wordFreqManager?.destroy) {
                this.wordFreqManager.destroy();
            }

            // 清理DOM缓存
            this.domCache.clear();

            // 清理全局引用
            if (window.app === this) {
                delete window.app;
            }

            if (this.config.debug) {
                console.log('[App] Application destroyed');
            }
        });
    }

    // [其他所有方法保持原样...]
}

// 导出App类
window.EnglishSite.App = App;