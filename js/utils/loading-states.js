// js/utils/loading-states.js - 智能加载状态和骨架屏系统
// 🎯 目标：提升用户感知性能，减少加载焦虑

class LoadingStateManager {
    constructor() {
        this.activeStates = new Map();
        this.skeletonTemplates = new Map();
        this.loadingOverlays = new Map();
        
        // 配置
        this.config = {
            skeletonDuration: 800,     // 骨架屏最小显示时间
            fadeInDuration: 300,       // 内容淡入时间
            staggerDelay: 100,         // 内容交错显示延迟
            enableProgressBar: true,   // 启用进度条
            enableAnimations: true     // 启用动画效果
        };

        this.initializeStyles();
        console.log('💫 加载状态管理器已初始化');
    }

    // 🎯 显示骨架屏
    showSkeleton(containerId, type = 'default', options = {}) {
        console.log(`💀 显示骨架屏: ${containerId} (${type})`);
        
        const container = this.getContainer(containerId);
        if (!container) return;

        // 保存原始内容
        const originalContent = container.innerHTML;
        this.activeStates.set(containerId, {
            type: 'skeleton',
            originalContent,
            startTime: performance.now(),
            options
        });

        // 显示骨架屏
        const skeletonHTML = this.generateSkeleton(type, options);
        container.innerHTML = skeletonHTML;
        container.classList.add('loading-skeleton');

        return {
            hide: () => this.hideSkeleton(containerId),
            update: (newType) => this.updateSkeleton(containerId, newType)
        };
    }

    // 🎯 隐藏骨架屏
    async hideSkeleton(containerId, newContent = null) {
        const state = this.activeStates.get(containerId);
        if (!state || state.type !== 'skeleton') return;

        const container = this.getContainer(containerId);
        if (!container) return;

        // 确保最小显示时间
        const elapsed = performance.now() - state.startTime;
        if (elapsed < this.config.skeletonDuration) {
            await new Promise(resolve => 
                setTimeout(resolve, this.config.skeletonDuration - elapsed)
            );
        }

        // 淡出骨架屏
        await this.fadeOut(container);

        // 恢复内容
        const contentToShow = newContent || state.originalContent;
        container.innerHTML = contentToShow;
        container.classList.remove('loading-skeleton');

        // 淡入新内容
        await this.fadeInContent(container);

        this.activeStates.delete(containerId);
        console.log(`✨ 骨架屏已隐藏: ${containerId}`);
    }

    // 🎯 生成骨架屏HTML
    generateSkeleton(type, options = {}) {
        const templates = {
            // 默认骨架屏
            default: () => `
                <div class="skeleton-container">
                    <div class="skeleton-line skeleton-title"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line skeleton-short"></div>
                </div>
            `,

            // 章节列表骨架屏
            chapters: () => `
                <div class="skeleton-container">
                    ${Array(3).fill().map((_, i) => `
                        <div class="skeleton-chapter-item" style="animation-delay: ${i * 0.1}s">
                            <div class="skeleton-thumbnail"></div>
                            <div class="skeleton-content">
                                <div class="skeleton-line skeleton-title"></div>
                                <div class="skeleton-line"></div>
                                <div class="skeleton-line skeleton-short"></div>
                                <div class="skeleton-tags">
                                    <div class="skeleton-tag"></div>
                                    <div class="skeleton-tag"></div>
                                    <div class="skeleton-tag"></div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `,

            // 文章内容骨架屏
            article: () => `
                <div class="skeleton-container">
                    <div class="skeleton-article-header">
                        <div class="skeleton-line skeleton-title"></div>
                        <div class="skeleton-meta">
                            <div class="skeleton-tag"></div>
                            <div class="skeleton-tag"></div>
                        </div>
                    </div>
                    <div class="skeleton-article-body">
                        ${Array(8).fill().map(() => `
                            <div class="skeleton-paragraph">
                                <div class="skeleton-line"></div>
                                <div class="skeleton-line"></div>
                                <div class="skeleton-line skeleton-short"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `,

            // 词频分析骨架屏
            wordFrequency: () => `
                <div class="skeleton-container">
                    <div class="skeleton-header">
                        <div class="skeleton-line skeleton-title"></div>
                        <div class="skeleton-search-bar"></div>
                        <div class="skeleton-controls">
                            <div class="skeleton-button"></div>
                            <div class="skeleton-button"></div>
                            <div class="skeleton-button"></div>
                        </div>
                    </div>
                    <div class="skeleton-word-cloud">
                        ${Array(20).fill().map((_, i) => `
                            <div class="skeleton-word" style="animation-delay: ${i * 0.05}s"></div>
                        `).join('')}
                    </div>
                </div>
            `,

            // 加载中状态
            loading: (message = '正在加载...') => `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <div class="loading-message">${message}</div>
                    ${this.config.enableProgressBar ? '<div class="loading-progress"><div class="progress-bar"></div></div>' : ''}
                </div>
            `
        };

        return templates[type] ? templates[type](options) : templates.default();
    }

    // 🎯 显示加载覆盖层
    showLoadingOverlay(containerId, message = '正在加载...', options = {}) {
        console.log(`🌀 显示加载覆盖层: ${containerId}`);
        
        const container = this.getContainer(containerId);
        if (!container) return;

        // 创建覆盖层
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-overlay-content">
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
                ${options.showProgress ? '<div class="loading-progress"><div class="progress-bar" id="progress-bar"></div></div>' : ''}
                ${options.showTips ? '<div class="loading-tips">💡 ' + (options.tips || '正在优化您的体验...') + '</div>' : ''}
            </div>
        `;

        // 添加到容器
        container.style.position = 'relative';
        container.appendChild(overlay);
        
        // 淡入动画
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });

        this.loadingOverlays.set(containerId, overlay);

        return {
            hide: () => this.hideLoadingOverlay(containerId),
            updateMessage: (newMessage) => this.updateLoadingMessage(containerId, newMessage),
            updateProgress: (percent) => this.updateProgress(containerId, percent)
        };
    }

    // 🎯 隐藏加载覆盖层
    async hideLoadingOverlay(containerId) {
        const overlay = this.loadingOverlays.get(containerId);
        if (!overlay) return;

        await this.fadeOut(overlay);
        overlay.remove();
        this.loadingOverlays.delete(containerId);
        
        console.log(`✨ 加载覆盖层已隐藏: ${containerId}`);
    }

    // 🎯 更新加载消息
    updateLoadingMessage(containerId, message) {
        const overlay = this.loadingOverlays.get(containerId);
        if (!overlay) return;

        const messageEl = overlay.querySelector('.loading-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
    }

    // 🎯 更新进度
    updateProgress(containerId, percent) {
        const overlay = this.loadingOverlays.get(containerId);
        if (!overlay) return;

        const progressBar = overlay.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        }
    }

    // 🎯 渐进式内容显示
    async showContentProgressively(containerId, newContent, options = {}) {
        const container = this.getContainer(containerId);
        if (!container) return;

        console.log(`🎭 渐进式显示内容: ${containerId}`);

        // 淡出当前内容
        await this.fadeOut(container);

        // 设置新内容（隐藏状态）
        container.innerHTML = newContent;
        container.style.opacity = '0';

        // 查找可动画的元素
        const animatableElements = container.querySelectorAll(
            '.chapter-overview-item, .nav-item, .word-item, .article-section, h1, h2, h3, p'
        );

        // 初始化动画状态
        animatableElements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = `opacity ${this.config.fadeInDuration}ms ease-out, transform ${this.config.fadeInDuration}ms ease-out`;
        });

        // 显示容器
        container.style.opacity = '1';

        // 交错显示元素
        for (let i = 0; i < animatableElements.length; i++) {
            setTimeout(() => {
                const element = animatableElements[i];
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, i * this.config.staggerDelay);
        }

        console.log(`✨ 渐进式显示完成: ${containerId} (${animatableElements.length}个元素)`);
    }

    // 🎯 智能加载状态检测
    detectOptimalLoadingState(containerId, contentType) {
        const container = this.getContainer(containerId);
        if (!container) return 'loading';

        const rect = container.getBoundingClientRect();
        const isLargeArea = rect.width * rect.height > 100000; // 大面积
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

        // 智能选择加载策略
        if (!isVisible) {
            return 'none'; // 不在视口，不显示
        } else if (isLargeArea && contentType) {
            return contentType; // 大面积使用骨架屏
        } else {
            return 'loading'; // 小面积使用简单加载
        }
    }

    // 🎯 动画辅助方法
    async fadeOut(element, duration = this.config.fadeInDuration) {
        return new Promise(resolve => {
            element.style.transition = `opacity ${duration}ms ease-out`;
            element.style.opacity = '0';
            setTimeout(resolve, duration);
        });
    }

    async fadeInContent(element, duration = this.config.fadeInDuration) {
        return new Promise(resolve => {
            element.style.opacity = '0';
            element.style.transition = `opacity ${duration}ms ease-in`;
            
            requestAnimationFrame(() => {
                element.style.opacity = '1';
                setTimeout(resolve, duration);
            });
        });
    }

    // 🎯 工具方法
    getContainer(containerId) {
        if (typeof containerId === 'string') {
            return document.getElementById(containerId) || document.querySelector(containerId);
        }
        return containerId; // 已经是DOM元素
    }

    // 🎯 初始化样式
    initializeStyles() {
        if (document.getElementById('loading-states-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'loading-states-styles';
        styles.textContent = `
            /* 💫 加载状态样式系统 */
            
            /* 骨架屏基础样式 */
            .skeleton-container {
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .skeleton-line {
                height: 16px;
                background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
                background-size: 200% 100%;
                border-radius: 4px;
                margin-bottom: 12px;
                animation: skeletonPulse 1.5s ease-in-out infinite;
            }
            
            .skeleton-title { height: 24px; width: 60%; }
            .skeleton-short { width: 40%; }
            
            /* 章节骨架屏 */
            .skeleton-chapter-item {
                display: flex;
                gap: 16px;
                padding: 20px;
                background: white;
                border-radius: 12px;
                margin-bottom: 16px;
                animation: skeletonFadeIn 0.5s ease-out forwards;
                opacity: 0;
            }
            
            .skeleton-thumbnail {
                width: 120px;
                height: 90px;
                background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
                background-size: 200% 100%;
                border-radius: 8px;
                animation: skeletonPulse 1.5s ease-in-out infinite;
                flex-shrink: 0;
            }
            
            .skeleton-content { flex: 1; }
            
            .skeleton-tags {
                display: flex;
                gap: 8px;
                margin-top: 12px;
            }
            
            .skeleton-tag {
                width: 60px;
                height: 20px;
                background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
                background-size: 200% 100%;
                border-radius: 10px;
                animation: skeletonPulse 1.5s ease-in-out infinite;
            }
            
            /* 词频骨架屏 */
            .skeleton-header {
                margin-bottom: 30px;
            }
            
            .skeleton-search-bar {
                height: 48px;
                background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
                background-size: 200% 100%;
                border-radius: 24px;
                margin: 16px 0;
                animation: skeletonPulse 1.5s ease-in-out infinite;
            }
            
            .skeleton-controls {
                display: flex;
                gap: 12px;
                justify-content: center;
                margin: 20px 0;
            }
            
            .skeleton-button {
                width: 100px;
                height: 36px;
                background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
                background-size: 200% 100%;
                border-radius: 18px;
                animation: skeletonPulse 1.5s ease-in-out infinite;
            }
            
            .skeleton-word-cloud {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                justify-content: center;
                align-items: center;
                padding: 30px;
                background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                border-radius: 12px;
                min-height: 200px;
            }
            
            .skeleton-word {
                height: 20px;
                background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
                background-size: 200% 100%;
                border-radius: 10px;
                animation: skeletonPulse 1.5s ease-in-out infinite, skeletonFadeIn 0.3s ease-out forwards;
                opacity: 0;
            }
            
            .skeleton-word:nth-child(1) { width: 80px; }
            .skeleton-word:nth-child(2) { width: 120px; }
            .skeleton-word:nth-child(3) { width: 60px; }
            .skeleton-word:nth-child(4) { width: 100px; }
            .skeleton-word:nth-child(5) { width: 90px; }
            .skeleton-word:nth-child(6) { width: 110px; }
            .skeleton-word:nth-child(7) { width: 70px; }
            .skeleton-word:nth-child(8) { width: 95px; }
            .skeleton-word:nth-child(9) { width: 85px; }
            .skeleton-word:nth-child(10) { width: 75px; }
            .skeleton-word:nth-child(n+11) { width: 80px; }
            
            /* 加载覆盖层 */
            .loading-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(2px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                opacity: 0;
                transition: opacity 300ms ease-in-out;
            }
            
            .loading-overlay-content {
                text-align: center;
                max-width: 300px;
                padding: 30px;
            }
            
            .loading-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px 20px;
                min-height: 200px;
            }
            
            /* 加载动画 */
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid #f3f4f6;
                border-top: 3px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 16px;
            }
            
            .loading-message {
                font-size: 16px;
                color: #6b7280;
                font-weight: 500;
                margin-bottom: 16px;
            }
            
            .loading-tips {
                font-size: 14px;
                color: #9ca3af;
                margin-top: 12px;
                font-style: italic;
            }
            
            /* 进度条 */
            .loading-progress {
                width: 200px;
                height: 4px;
                background: #e5e7eb;
                border-radius: 2px;
                overflow: hidden;
                margin-top: 16px;
            }
            
            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #3b82f6, #1d4ed8);
                border-radius: 2px;
                width: 0%;
                transition: width 0.3s ease-out;
            }
            
            /* 动画定义 */
            @keyframes skeletonPulse {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
            
            @keyframes skeletonFadeIn {
                to { opacity: 1; }
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* 响应式适配 */
            @media (max-width: 768px) {
                .skeleton-chapter-item {
                    flex-direction: column;
                    gap: 12px;
                }
                
                .skeleton-thumbnail {
                    width: 100%;
                    height: 120px;
                }
                
                .skeleton-word-cloud {
                    padding: 20px;
                }
                
                .loading-overlay-content {
                    padding: 20px;
                }
            }
            
            /* 减少动画模式 */
            @media (prefers-reduced-motion: reduce) {
                .skeleton-line,
                .skeleton-thumbnail,
                .skeleton-tag,
                .skeleton-word,
                .loading-spinner {
                    animation: none;
                }
                
                .loading-overlay,
                .progress-bar {
                    transition: none;
                }
            }
        `;

        document.head.appendChild(styles);
        console.log('🎨 加载状态样式已注入');
    }

    // 🎯 性能统计
    getPerformanceStats() {
        return {
            activeStates: this.activeStates.size,
            activeOverlays: this.loadingOverlays.size,
            currentStates: Array.from(this.activeStates.keys()),
            config: this.config
        };
    }

    // 🎯 清理
    cleanup() {
        // 清理所有活动状态
        for (const [containerId] of this.activeStates) {
            this.hideSkeleton(containerId);
        }

        // 清理所有覆盖层
        for (const [containerId] of this.loadingOverlays) {
            this.hideLoadingOverlay(containerId);
        }

        console.log('🧹 加载状态管理器已清理');
    }
}

// 🌐 全局实例
window.EnglishSite = window.EnglishSite || {};
window.EnglishSite.LoadingStateManager = new LoadingStateManager();

// 🎯 便捷API
window.showSkeleton = (id, type, options) => window.EnglishSite.LoadingStateManager.showSkeleton(id, type, options);
window.hideSkeleton = (id, content) => window.EnglishSite.LoadingStateManager.hideSkeleton(id, content);
window.showLoading = (id, message, options) => window.EnglishSite.LoadingStateManager.showLoadingOverlay(id, message, options);
window.hideLoading = (id) => window.EnglishSite.LoadingStateManager.hideLoadingOverlay(id);

export default LoadingStateManager;
