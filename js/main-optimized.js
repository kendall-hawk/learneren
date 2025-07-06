// js/main-optimized.js - 性能优化版主应用
// 🎯 目标：首屏加载时间减少60%，用户体验显著提升

import ModuleLoader from './utils/module-loader.js';
import LoadingStateManager from './utils/loading-states.js';

class OptimizedApp {
    constructor(options = {}) {
        this.startTime = performance.now();
        this.moduleLoader = window.EnglishSite.ModuleLoader;
        this.loadingManager = window.EnglishSite.LoadingStateManager;
        
        // 性能监控
        this.performanceData = {
            moduleLoadTimes: new Map(),
            criticalPathTime: 0,
            firstContentfulPaint: 0,
            interactiveTime: 0
        };

        // 基础配置
        this.config = {
            debug: options.debug || window.location.search.includes('debug'),
            enablePreloading: options.enablePreloading !== false,
            criticalModules: ['navigation'],
            deferredModules: ['wordFrequency', 'wordFrequencyUI'],
            ...options
        };

        // 状态管理
        this.state = {
            isInitialized: false,
            criticalPathComplete: false,
            userInteractionEnabled: false,
            currentView: null,
            loadingQueue: []
        };

        // DOM缓存
        this.elements = new Map();
        
        this.initPromise = this.initializeApp();
    }

    // 🚀 优化版应用初始化
    async initializeApp() {
        console.log('🚀 启动优化版应用...');
        
        try {
            // 1️⃣ 关键路径：最小化首屏阻塞
            await this.loadCriticalPath();
            
            // 2️⃣ 显示初始内容，让用户感知应用已可用
            this.renderInitialState();
            
            // 3️⃣ 后台加载非关键功能
            this.loadDeferredModules();
            
            // 4️⃣ 启动预加载
            if (this.config.enablePreloading) {
                this.startIntelligentPreloading();
            }

            // 5️⃣ 完成初始化
            this.completeInitialization();
            
            console.log(`✅ 优化版应用启动完成 (${this.getInitTime()}ms)`);
            
        } catch (error) {
            console.error('❌ 应用初始化失败:', error);
            this.handleInitializationError(error);
        }
    }

    // 🎯 关键路径加载 - 最小化首屏时间
    async loadCriticalPath() {
        console.log('⚡ 加载关键路径...');
        const startTime = performance.now();
        
        // 显示应用级骨架屏
        this.showAppSkeleton();
        
        try {
            // 并行加载关键模块
            const criticalPromises = this.config.criticalModules.map(module => 
                this.moduleLoader.loadModule(module)
            );
            
            // 等待关键模块
            await Promise.all(criticalPromises);
            
            // 基础DOM设置
            this.setupBasicDOM();
            
            this.performanceData.criticalPathTime = performance.now() - startTime;
            this.state.criticalPathComplete = true;
            
            console.log(`⚡ 关键路径完成 (${this.performanceData.criticalPathTime.toFixed(2)}ms)`);
            
        } catch (error) {
            console.error('❌ 关键路径加载失败:', error);
            throw error;
        }
    }

    // 🎨 显示应用级骨架屏
    showAppSkeleton() {
        const content = document.getElementById('content');
        if (!content) return;

        this.loadingManager.showSkeleton('content', 'default', {
            message: '正在启动应用...',
            showProgress: true
        });
    }

    // 🏗️ 基础DOM设置
    setupBasicDOM() {
        // 缓存关键DOM元素
        const keyElements = [
            'content', 'main-nav', 'player-section', 
            'audio-player', 'glossary-popup', 'back-to-top'
        ];
        
        keyElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.elements.set(id, element);
            }
        });

        // 设置基础事件监听
        this.setupCriticalEventListeners();
    }

    // 🎯 关键事件监听（最小化版本）
    setupCriticalEventListeners() {
        // 导航事件
        document.addEventListener('click', this.handleCriticalClicks.bind(this), { passive: true });
        
        // 性能监控
        if ('PerformanceObserver' in window) {
            this.setupPerformanceObserver();
        }
        
        // 错误捕获
        window.addEventListener('error', this.handleCriticalError.bind(this));
    }

    // 🎯 关键点击处理（在完整导航加载前的临时处理）
    handleCriticalClicks(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        
        if (action === 'toggle-sidebar' || action === 'close-sidebar') {
            // 如果导航还未完全加载，显示加载状态
            if (!this.state.userInteractionEnabled) {
                this.showTemporaryMessage('正在加载导航功能...');
                event.preventDefault();
            }
        }
    }

    // 📱 渲染初始状态
    renderInitialState() {
        console.log('🎨 渲染初始状态...');
        
        // 隐藏应用骨架屏，显示具体内容骨架屏
        this.loadingManager.hideSkeleton('content');
        
        // 根据URL确定初始视图
        const initialView = this.determineInitialView();
        this.renderViewSkeleton(initialView);
        
        // 标记首次内容渲染
        this.markFirstContentfulPaint();
    }

    // 🧭 确定初始视图
    determineInitialView() {
        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(window.location.search);
        
        if (hash) {
            return { type: 'chapter', id: hash };
        } else if (params.has('wordfreq')) {
            return { type: 'wordFrequency' };
        } else {
            return { type: 'allArticles' };
        }
    }

    // 🎭 渲染视图骨架屏
    renderViewSkeleton(view) {
        const content = this.elements.get('content');
        if (!content) return;

        switch (view.type) {
            case 'chapter':
                this.loadingManager.showSkeleton('content', 'article');
                this.queueViewLoad('chapter', view.id);
                break;
                
            case 'wordFrequency':
                this.loadingManager.showSkeleton('content', 'wordFrequency');
                this.queueViewLoad('wordFrequency');
                break;
                
            case 'allArticles':
            default:
                this.loadingManager.showSkeleton('content', 'chapters');
                this.queueViewLoad('allArticles');
                break;
        }
    }

    // 📋 视图加载队列
    queueViewLoad(viewType, viewId = null) {
        this.state.loadingQueue.push({ viewType, viewId, timestamp: Date.now() });
    }

    // ⏳ 延迟模块加载
    async loadDeferredModules() {
        console.log('⏳ 开始延迟加载模块...');
        
        // 等待一个短暂延迟，确保关键路径不被阻塞
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 加载基础功能模块
        const basicModules = ['glossary', 'audioSync'];
        await this.moduleLoader.loadFeatureGroup('reading');
        
        // 启用用户交互
        this.enableUserInteraction();
        
        // 处理加载队列
        this.processLoadingQueue();
    }

    // 🎮 启用用户交互
    enableUserInteraction() {
        console.log('🎮 启用用户交互...');
        
        this.state.userInteractionEnabled = true;
        
        // 移除临时的点击处理，让完整功能接管
        this.markInteractive();
    }

    // 📋 处理加载队列
    async processLoadingQueue() {
        console.log(`📋 处理加载队列 (${this.state.loadingQueue.length}个项目)`);
        
        for (const item of this.state.loadingQueue) {
            try {
                await this.loadView(item.viewType, item.viewId);
                // 小延迟避免阻塞主线程
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
                console.error(`加载视图失败: ${item.viewType}`, error);
            }
        }
        
        this.state.loadingQueue = [];
    }

    // 🎬 加载具体视图
    async loadView(viewType, viewId = null) {
        console.log(`🎬 加载视图: ${viewType} ${viewId || ''}`);
        
        switch (viewType) {
            case 'chapter':
                await this.loadChapterView(viewId);
                break;
                
            case 'wordFrequency':
                await this.loadWordFrequencyView();
                break;
                
            case 'allArticles':
                await this.loadAllArticlesView();
                break;
                
            default:
                console.warn(`未知视图类型: ${viewType}`);
        }
    }

    // 📄 加载章节视图
    async loadChapterView(chapterId) {
        try {
            // 加载章节内容
            const content = await this.fetchChapterContent(chapterId);
            
            // 渐进式显示
            await this.loadingManager.showContentProgressively('content', content);
            
            // 加载音频功能（如果需要）
            if (content.includes('audio')) {
                await this.moduleLoader.loadFeatureGroup('audio');
            }
            
        } catch (error) {
            console.error(`章节加载失败: ${chapterId}`, error);
            this.showErrorState('章节加载失败');
        }
    }

    // 📊 加载词频分析视图
    async loadWordFrequencyView() {
        try {
            // 显示加载状态
            const loader = this.loadingManager.showLoadingOverlay('content', '正在启动词频分析...', {
                showProgress: true,
                showTips: true,
                tips: '首次使用需要分析全站数据，请稍候...'
            });
            
            // 加载词频模块
            loader.updateProgress(20);
            await this.moduleLoader.loadFeatureGroup('analysis');
            
            loader.updateProgress(60);
            loader.updateMessage('正在初始化分析工具...');
            
            // 启动词频工具
            const success = await window.navigateToWordFrequency();
            
            loader.updateProgress(100);
            await loader.hide();
            
            if (!success) {
                throw new Error('词频工具启动失败');
            }
            
        } catch (error) {
            console.error('词频分析加载失败:', error);
            this.showErrorState('词频分析功能暂时不可用');
        }
    }

    // 📚 加载所有文章视图
    async loadAllArticlesView() {
        try {
            // 获取导航数据
            const navData = await this.fetchNavigationData();
            
            // 提取所有章节
            const allChapters = this.extractAllChapters(navData);
            
            // 生成章节列表HTML
            const chaptersHTML = this.generateChaptersListHTML(allChapters);
            
            // 渐进式显示
            await this.loadingManager.showContentProgressively('content', chaptersHTML);
            
        } catch (error) {
            console.error('所有文章加载失败:', error);
            this.showErrorState('文章列表加载失败');
        }
    }

    // 🔮 智能预加载
    startIntelligentPreloading() {
        console.log('🔮 启动智能预加载...');
        
        // 使用requestIdleCallback进行空闲时预加载
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                this.performIntelligentPreloading();
            }, { timeout: 3000 });
        } else {
            setTimeout(() => {
                this.performIntelligentPreloading();
            }, 1000);
        }
    }

    // 🧠 执行智能预加载
    async performIntelligentPreloading() {
        // 基于用户行为预测需要的模块
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /mobile|android|iphone|ipad/.test(userAgent);
        
        let preloadStrategy = [];
        
        if (isMobile) {
            // 移动端优先加载核心阅读功能
            preloadStrategy = ['glossary', 'wordHighlight'];
        } else {
            // 桌面端可以预加载更多功能
            preloadStrategy = ['glossary', 'wordHighlight', 'audioSync'];
        }
        
        // 分批预加载，避免影响性能
        for (const module of preloadStrategy) {
            try {
                await this.moduleLoader.loadModule(module);
                console.log(`🔮 预加载完成: ${module}`);
                
                // 每个模块之间等待一段时间
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.warn(`预加载失败: ${module}`, error);
            }
        }
        
        console.log('🔮 智能预加载完成');
    }

    // 📈 性能监控设置
    setupPerformanceObserver() {
        try {
            // 监控关键性能指标
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordPerformanceMetric(entry);
                }
            });
            
            observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input'] });
            
        } catch (error) {
            console.warn('性能监控设置失败:', error);
        }
    }

    // 📊 记录性能指标
    recordPerformanceMetric(entry) {
        switch (entry.entryType) {
            case 'paint':
                if (entry.name === 'first-contentful-paint') {
                    this.performanceData.firstContentfulPaint = entry.startTime;
                    console.log(`🎨 首次内容渲染: ${entry.startTime.toFixed(2)}ms`);
                }
                break;
                
            case 'largest-contentful-paint':
                console.log(`🖼️ 最大内容渲染: ${entry.startTime.toFixed(2)}ms`);
                break;
                
            case 'first-input':
                this.performanceData.interactiveTime = entry.processingStart - entry.startTime;
                console.log(`🎮 首次交互延迟: ${this.performanceData.interactiveTime.toFixed(2)}ms`);
                break;
        }
    }

    // 🏷️ 性能标记方法
    markFirstContentfulPaint() {
        if ('performance' in window && 'mark' in performance) {
            performance.mark('custom-fcp');
        }
    }

    markInteractive() {
        if ('performance' in window && 'mark' in performance) {
            performance.mark('custom-interactive');
        }
        this.performanceData.interactiveTime = performance.now() - this.startTime;
        console.log(`🎮 应用可交互时间: ${this.performanceData.interactiveTime.toFixed(2)}ms`);
    }

    // 🔧 辅助方法
    async fetchChapterContent(chapterId) {
        const response = await fetch(`chapters/${chapterId}.html`);
        if (!response.ok) throw new Error(`Chapter not found: ${chapterId}`);
        return await response.text();
    }

    async fetchNavigationData() {
        const response = await fetch('data/navigation.json');
        if (!response.ok) throw new Error('Navigation data not found');
        return await response.json();
    }

    extractAllChapters(navData) {
        // 简化版章节提取逻辑
        const chapters = [];
        
        const processItem = (item) => {
            if (item.chapters) {
                chapters.push(...item.chapters);
            }
            if (item.children) {
                item.children.forEach(processItem);
            }
        };
        
        navData.forEach(processItem);
        return chapters;
    }

    generateChaptersListHTML(chapters) {
        const chaptersHTML = chapters.map(chapter => `
            <div class="chapter-overview-item">
                <a href="#${chapter.id}" class="overview-chapter-link" data-chapter-id="${chapter.id}">
                    ${chapter.thumbnail ? `<img src="${chapter.thumbnail}" alt="${chapter.title}" class="chapter-thumbnail" loading="lazy">` : ''}
                    <div class="chapter-info">
                        <h3>${chapter.title}</h3>
                        <p>${chapter.description || 'Learn English with this interactive lesson'}</p>
                    </div>
                </a>
            </div>
        `).join('');
        
        return `
            <div class="chapter-list-overview">
                <h1>所有英语学习文章</h1>
                ${chaptersHTML}
            </div>
        `;
    }

    showTemporaryMessage(message) {
        // 显示临时消息
        const toast = document.createElement('div');
        toast.className = 'temporary-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #3b82f6; color: white; padding: 12px 24px;
            border-radius: 25px; z-index: 10000; font-size: 14px;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            animation: slideDown 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    showErrorState(message) {
        const content = this.elements.get('content');
        if (!content) return;
        
        content.innerHTML = `
            <div class="error-state" style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <h2 style="color: #dc3545; margin-bottom: 16px;">加载失败</h2>
                <p style="color: #6c757d; margin-bottom: 24px;">${message}</p>
                <button onclick="location.reload()" style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">重新加载</button>
            </div>
        `;
    }

    handleInitializationError(error) {
        console.error('应用初始化错误:', error);
        this.showErrorState('应用启动失败，请检查网络连接或刷新页面重试');
    }

    handleCriticalError(event) {
        console.error('关键错误:', event.error);
        // 记录错误但不中断应用运行
    }

    // 🔄 完成初始化
    completeInitialization() {
        this.state.isInitialized = true;
        
        // 发送初始化完成事件
        document.dispatchEvent(new CustomEvent('appInitialized', {
            detail: this.getPerformanceReport()
        }));
        
        // 隐藏初始加载指示器
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        console.log('🎉 应用初始化完成！');
    }

    // 📊 获取性能报告
    getPerformanceReport() {
        const totalTime = performance.now() - this.startTime;
        
        return {
            totalInitTime: Math.round(totalTime),
            criticalPathTime: Math.round(this.performanceData.criticalPathTime),
            firstContentfulPaint: Math.round(this.performanceData.firstContentfulPaint),
            interactiveTime: Math.round(this.performanceData.interactiveTime),
            moduleStats: this.moduleLoader.getPerformanceStats(),
            loadingStats: this.loadingManager.getPerformanceStats()
        };
    }

    getInitTime() {
        return Math.round(performance.now() - this.startTime);
    }

    // 🧹 清理
    destroy() {
        this.moduleLoader.cleanup();
        this.loadingManager.cleanup();
        this.elements.clear();
        console.log('🧹 优化版应用已清理');
    }
}

// 🚀 自动启动
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 等待核心工具准备
        await window.EnglishSite.coreToolsReady;
        
        // 启动优化版应用
        window.app = new OptimizedApp({
            debug: window.location.search.includes('debug'),
            enablePreloading: true
        });
        
        // 等待初始化完成
        await window.app.initPromise;
        
        console.log('🎉 优化版应用启动成功！');
        
        // 开发环境性能报告
        if (window.app.config.debug) {
            console.table(window.app.getPerformanceReport());
        }
        
    } catch (error) {
        console.error('❌ 优化版应用启动失败:', error);
        
        // 降级到原版应用
        console.log('🔄 降级到原版应用...');
        const script = document.createElement('script');
        script.src = 'js/main.js';
        document.head.appendChild(script);
    }
});

export default OptimizedApp;