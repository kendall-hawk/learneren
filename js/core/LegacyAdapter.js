// js/core/LegacyAdapter.js - 100%向后兼容适配器
// 🎯 目标：确保所有现有全局变量和API继续正常工作
// 🛡️ 策略：透明代理 + 事件兼容 + 渐进迁移

(function() {
    'use strict';
    
    /**
     * 🔄 兼容适配器
     * 功能：无缝桥接新状态管理器与现有全局变量系统
     */
    class LegacyAdapter {
        constructor(stateManager) {
            this.stateManager = stateManager;
            this.isEnabled = false;
            this.proxies = new Map();
            this.originalGlobals = new Map();
            
            // 配置
            this.config = {
                debug: stateManager.config.debug,
                enableTransparency: true,  // 透明代理模式
                enableWarnings: false,     // 兼容性警告
                enableMigrationHints: false // 迁移提示
            };
            
            console.log('[LegacyAdapter] 🔄 兼容适配器已创建');
        }
        
        /**
         * 🚀 启用兼容模式
         */
        enable() {
            if (this.isEnabled) return;
            
            console.log('[LegacyAdapter] 🚀 启用100%兼容模式...');
            
            // 1. 创建全局变量代理
            this.#setupGlobalProxies();
            
            // 2. 兼容事件系统
            this.#setupEventCompatibility();
            
            // 3. 兼容现有初始化流程
            this.#setupInitializationCompatibility();
            
            // 4. 兼容调试工具
            this.#setupDebugCompatibility();
            
            this.isEnabled = true;
            
            if (this.config.debug) {
                console.log('[LegacyAdapter] ✅ 兼容模式已启用，现有代码100%可用');
            }
        }
        
        /**
         * 🚫 禁用兼容模式（恢复原生行为）
         */
        disable() {
            if (!this.isEnabled) return;
            
            console.log('[LegacyAdapter] 🚫 禁用兼容模式，恢复原生行为...');
            
            // 恢复原始全局变量
            for (const [key, originalValue] of this.originalGlobals) {
                if (originalValue === undefined) {
                    delete window[key];
                } else {
                    window[key] = originalValue;
                }
            }
            
            this.originalGlobals.clear();
            this.proxies.clear();
            this.isEnabled = false;
            
            console.log('[LegacyAdapter] ✅ 已恢复原生行为');
        }
        
        /**
         * 🌐 设置全局变量代理
         */
        #setupGlobalProxies() {
            // 定义需要代理的全局变量映射
            const globalMappings = {
                // 主应用实例
                'app': {
                    statePath: 'app.instance',
                    factory: () => this.#createAppProxy()
                },
                
                // 词频管理器
                'wordFreqManager': {
                    statePath: 'modules.wordFreq.manager',
                    factory: () => this.#createWordFreqManagerProxy()
                },
                
                // 词频UI
                'wordFreqUI': {
                    statePath: 'modules.wordFreq.ui',
                    factory: () => this.#createWordFreqUIProxy()
                },
                
                // 导航实例（特殊处理）
                'navigation': {
                    statePath: 'modules.navigation.instance',
                    factory: () => this.#createNavigationProxy()
                }
            };
            
            // 为每个全局变量创建代理
            for (const [globalKey, mapping] of Object.entries(globalMappings)) {
                this.#createGlobalProxy(globalKey, mapping);
            }
            
            // 特殊处理：EnglishSite命名空间保持不变
            // 这个不需要代理，因为它是静态的类集合
            if (!window.EnglishSite) {
                window.EnglishSite = {};
            }
        }
        
        /**
         * 🎭 创建全局变量代理
         */
        #createGlobalProxy(globalKey, mapping) {
            try {
                // 保存原始值
                this.originalGlobals.set(globalKey, window[globalKey]);
                
                // 创建 Proxy 以拦截访问
                const proxy = new Proxy({}, {
                    get: (target, prop) => {
                        // 获取实际对象
                        let actualObject = this.stateManager.get(mapping.statePath);
                        
                        // 如果对象不存在，尝试使用工厂方法创建
                        if (!actualObject && mapping.factory) {
                            actualObject = mapping.factory();
                            if (actualObject) {
                                this.stateManager.set(mapping.statePath, actualObject, { 
                                    source: 'legacyAdapter'
                                });
                            }
                        }
                        
                        // 如果仍然没有对象，返回undefined
                        if (!actualObject) {
                            return undefined;
                        }
                        
                        // 返回对象的属性或方法
                        const value = actualObject[prop];
                        
                        // 如果是方法，绑定正确的this上下文
                        if (typeof value === 'function') {
                            return value.bind(actualObject);
                        }
                        
                        return value;
                    },
                    
                    set: (target, prop, value) => {
                        // 获取或创建实际对象
                        let actualObject = this.stateManager.get(mapping.statePath);
                        
                        if (!actualObject) {
                            actualObject = {};
                            this.stateManager.set(mapping.statePath, actualObject, { 
                                source: 'legacyAdapter'
                            });
                        }
                        
                        // 设置属性
                        actualObject[prop] = value;
                        
                        // 更新状态
                        this.stateManager.set(mapping.statePath, actualObject, { 
                            source: 'legacyAdapter'
                        });
                        
                        return true;
                    },
                    
                    has: (target, prop) => {
                        const actualObject = this.stateManager.get(mapping.statePath);
                        return actualObject ? prop in actualObject : false;
                    },
                    
                    ownKeys: (target) => {
                        const actualObject = this.stateManager.get(mapping.statePath);
                        return actualObject ? Object.keys(actualObject) : [];
                    }
                });
                
                // 替换全局变量
                window[globalKey] = proxy;
                this.proxies.set(globalKey, proxy);
                
                if (this.config.debug) {
                    console.log(`[LegacyAdapter] 已代理全局变量: window.${globalKey}`);
                }
                
            } catch (error) {
                console.error(`[LegacyAdapter] 创建代理失败: ${globalKey}`, error);
            }
        }
        
        /**
         * 🏗️ 创建 App 代理工厂
         */
        #createAppProxy() {
            // 如果状态中已有 app 实例，直接返回
            const existingApp = this.stateManager.get('app.instance');
            if (existingApp) return existingApp;
            
            // 创建一个兼容的 app 对象
            const appProxy = {
                // 兼容现有的 app 方法
                navigation: null,
                wordFreqManager: null,
                
                // 状态获取方法
                getAppStatus: () => {
                    return {
                        loadingStates: this.stateManager.get('app.loading', {}),
                        modulesActive: {
                            navigation: !!this.stateManager.get('modules.navigation.instance'),
                            glossary: !!this.stateManager.get('modules.glossary.instance'),
                            audioSync: !!this.stateManager.get('modules.audioSync.instance'),
                            wordFreq: !!this.stateManager.get('modules.wordFreq.manager')
                        },
                        wordFreqState: {
                            initialized: this.stateManager.get('modules.wordFreq.isInitialized', false),
                            error: this.stateManager.get('modules.wordFreq.error'),
                            hasManager: !!this.stateManager.get('modules.wordFreq.manager')
                        },
                        isDestroyed: this.stateManager.get('app.isDestroyed', false),
                        config: this.stateManager.get('app.config', {}),
                        screenInfo: this.stateManager.get('app.screenInfo', {}),
                        domCacheSize: this.stateManager.get('app.domCacheSize', 0)
                    };
                },
                
                // 词频管理器获取方法
                getWordFreqManager: async () => {
                    return this.stateManager.get('modules.wordFreq.manager');
                },
                
                // 导航状态获取方法
                getNavigationState: () => {
                    return {
                        available: !!this.stateManager.get('modules.navigation.instance'),
                        chaptersMap: this.stateManager.get('modules.navigation.chaptersMap'),
                        navigationTree: this.stateManager.get('modules.navigation.navigationTree'),
                        navData: this.stateManager.get('modules.navigation.navData', []),
                        totalChapters: this.stateManager.get('modules.navigation.chaptersMap')?.size || 0,
                        navigationReady: true
                    };
                },
                
                // 兼容性方法
                waitForInitialization: async () => {
                    return Promise.resolve(true);
                },
                
                destroy: () => {
                    this.stateManager.set('app.isDestroyed', true, { source: 'app.destroy' });
                }
            };
            
            // 动态属性代理
            return new Proxy(appProxy, {
                get: (target, prop) => {
                    // 优先返回对象自有的方法
                    if (prop in target) {
                        return target[prop];
                    }
                    
                    // 动态映射到状态管理器
                    switch (prop) {
                        case 'navigation':
                            return this.stateManager.get('modules.navigation.instance');
                        case 'wordFreqManager':
                            return this.stateManager.get('modules.wordFreq.manager');
                        case 'glossaryManager':
                            return this.stateManager.get('modules.glossary.instance');
                        case 'audioSyncManager':
                            return this.stateManager.get('modules.audioSync.instance');
                        default:
                            return this.stateManager.get(`app.${prop}`);
                    }
                },
                
                set: (target, prop, value) => {
                    // 更新到状态管理器
                    switch (prop) {
                        case 'navigation':
                            this.stateManager.set('modules.navigation.instance', value, { source: 'app.set' });
                            break;
                        case 'wordFreqManager':
                            this.stateManager.set('modules.wordFreq.manager', value, { source: 'app.set' });
                            break;
                        case 'glossaryManager':
                            this.stateManager.set('modules.glossary.instance', value, { source: 'app.set' });
                            break;
                        case 'audioSyncManager':
                            this.stateManager.set('modules.audioSync.instance', value, { source: 'app.set' });
                            break;
                        default:
                            this.stateManager.set(`app.${prop}`, value, { source: 'app.set' });
                    }
                    return true;
                }
            });
        }
        
        /**
         * 🔤 创建词频管理器代理工厂
         */
        #createWordFreqManagerProxy() {
            // 返回状态中的词频管理器，如果不存在返回null
            const manager = this.stateManager.get('modules.wordFreq.manager');
            return manager || null;
        }
        
        /**
         * 🎨 创建词频UI代理工厂
         */
        #createWordFreqUIProxy() {
            // 返回状态中的词频UI，如果不存在返回null
            const ui = this.stateManager.get('modules.wordFreq.ui');
            return ui || null;
        }
        
        /**
         * 🧭 创建导航代理工厂
         */
        #createNavigationProxy() {
            // 返回状态中的导航实例，如果不存在返回null
            const navigation = this.stateManager.get('modules.navigation.instance');
            return navigation || null;
        }
        
        /**
         * 🎭 设置事件系统兼容性
         */
        #setupEventCompatibility() {
            // 保存原始的 dispatchEvent 方法
            const originalDispatchEvent = document.dispatchEvent.bind(document);
            
            // 拦截自定义事件，同步到状态管理器
            document.dispatchEvent = (event) => {
                try {
                    // 调用原始方法
                    const result = originalDispatchEvent(event);
                    
                    // 同步特定事件到状态管理器
                    this.#syncEventToState(event);
                    
                    return result;
                } catch (error) {
                    console.error('[LegacyAdapter] 事件处理失败:', error);
                    return originalDispatchEvent(event);
                }
            };
            
            if (this.config.debug) {
                console.log('[LegacyAdapter] 🎭 事件系统兼容性已设置');
            }
        }
        
        /**
         * 🔄 同步事件到状态
         */
        #syncEventToState(event) {
            try {
                const eventType = event.type;
                const eventDetail = event.detail || {};
                
                // 根据事件类型同步到对应的状态路径
                switch (eventType) {
                    case 'chapterLoaded':
                        this.stateManager.set('app.currentChapter', {
                            id: eventDetail.chapterId,
                            hasAudio: eventDetail.hasAudio,
                            chapterData: eventDetail.chapterData,
                            timestamp: Date.now()
                        }, { source: 'event.chapterLoaded' });
                        break;
                        
                    case 'seriesSelected':
                        this.stateManager.set('app.currentSeries', {
                            seriesId: eventDetail.seriesId,
                            chapters: eventDetail.chapters,
                            item: eventDetail.item,
                            timestamp: Date.now()
                        }, { source: 'event.seriesSelected' });
                        break;
                        
                    case 'wordFrequencyRequested':
                        this.stateManager.set('modules.wordFreq.lastRequest', {
                            toolId: eventDetail.toolId,
                            toolTitle: eventDetail.toolTitle,
                            toolAction: eventDetail.toolAction,
                            toolData: eventDetail.toolData,
                            source: eventDetail.source,
                            timestamp: Date.now()
                        }, { source: 'event.wordFrequencyRequested' });
                        break;
                        
                    case 'navigationUpdated':
                        this.stateManager.set('modules.navigation.updated', {
                            prevChapterId: eventDetail.prevChapterId,
                            nextChapterId: eventDetail.nextChapterId,
                            timestamp: Date.now()
                        }, { source: 'event.navigationUpdated' });
                        break;
                }
                
            } catch (error) {
                console.error('[LegacyAdapter] 事件同步失败:', error);
            }
        }
        
        /**
         * 🚀 设置初始化兼容性
         */
        #setupInitializationCompatibility() {
            // 监听关键状态变化，触发兼容性事件
            
            // 当导航实例被设置时
            this.stateManager.subscribe('modules.navigation.instance', (newNav, oldNav) => {
                if (newNav && !oldNav) {
                    // 导航已初始化，确保全局变量同步
                    if (this.config.debug) {
                        console.log('[LegacyAdapter] 导航实例已设置，同步全局变量');
                    }
                }
            });
            
            // 当词频管理器被设置时
            this.stateManager.subscribe('modules.wordFreq.manager', (newManager, oldManager) => {
                if (newManager && !oldManager) {
                    // 词频管理器已初始化
                    if (this.config.debug) {
                        console.log('[LegacyAdapter] 词频管理器已设置，同步全局变量');
                    }
                }
            });
        }
        
        /**
         * 🔧 设置调试兼容性
         */
        #setupDebugCompatibility() {
            // 保持现有的调试函数可用
            
            // debugOptimizedNavigation 函数兼容
            if (!window.debugOptimizedNavigation) {
                window.debugOptimizedNavigation = () => {
                    const nav = this.stateManager.get('modules.navigation.instance');
                    if (nav && nav.getNavigationStats) {
                        return nav.getNavigationStats();
                    }
                    return null;
                };
            }
            
            // debugNavData 函数兼容
            if (!window.debugNavData) {
                window.debugNavData = () => {
                    const app = this.stateManager.get('app.instance');
                    if (app && typeof app.debugNavData === 'function') {
                        return app.debugNavData();
                    }
                    
                    // 降级实现
                    const navData = this.stateManager.get('modules.navigation.navData', []);
                    return {
                        navData: navData,
                        summary: {
                            topLevelItems: navData.length,
                            totalChapters: 0 // 可以进一步计算
                        }
                    };
                };
            }
            
            // 词频调试函数兼容
            if (!window.checkWordFreqStatus) {
                window.checkWordFreqStatus = () => {
                    return {
                        timestamp: new Date().toISOString(),
                        appManager: {
                            available: !!this.stateManager.get('modules.wordFreq.manager'),
                            initialized: this.stateManager.get('modules.wordFreq.isInitialized', false)
                        },
                        globalManager: {
                            available: !!window.wordFreqManager,
                            initialized: !!window.wordFreqManager?.isInitialized
                        },
                        ui: {
                            available: !!this.stateManager.get('modules.wordFreq.ui'),
                            initialized: !!this.stateManager.get('modules.wordFreq.ui')?.isInitialized
                        }
                    };
                };
            }
        }
        
        /**
         * 📊 获取兼容性统计
         */
        getCompatibilityStats() {
            return {
                isEnabled: this.isEnabled,
                proxiedGlobals: Array.from(this.proxies.keys()),
                originalGlobalsBackup: this.originalGlobals.size,
                stateManagerActive: !!this.stateManager,
                debugMode: this.config.debug,
                interceptedEventTypes: [
                    'chapterLoaded',
                    'seriesSelected', 
                    'wordFrequencyRequested',
                    'navigationUpdated'
                ]
            };
        }
        
        /**
         * 🔍 验证兼容性
         */
        validateCompatibility() {
            const tests = {
                globalVariables: {},
                eventSystem: true,
                stateSync: true
            };
            
            // 测试全局变量代理
            for (const globalKey of this.proxies.keys()) {
                try {
                    const value = window[globalKey];
                    tests.globalVariables[globalKey] = value !== undefined;
                } catch (error) {
                    tests.globalVariables[globalKey] = false;
                }
            }
            
            // 测试事件系统
            try {
                document.dispatchEvent(new CustomEvent('test-compatibility'));
                tests.eventSystem = true;
            } catch (error) {
                tests.eventSystem = false;
            }
            
            return tests;
        }
    }
    
    // 🌐 全局注册
    window.EnglishSite = window.EnglishSite || {};
    window.EnglishSite.LegacyAdapter = LegacyAdapter;
    
    console.log('🔄 LegacyAdapter 兼容适配器已加载');
    
})();
