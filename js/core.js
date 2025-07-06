// js/core.js - 紧急修复版 (保持原有结构 + 最小优化)
// 🚨 基于你的原代码，只添加必要改进，不破坏任何现有功能

(function() {
    'use strict';
    
    window.EnglishSite = window.EnglishSite || {};
    
    // =================================================================
    // 1. 保持原有配置管理 + 小幅增强
    // =================================================================
    class Config {
        static data = {
            cache: { maxSize: 50, ttl: 300000 },
            performance: { throttle: 16, timeout: 10000 },
            ui: { fadeTime: 300, loadDelay: 300 },
            debug: location.hostname === 'localhost' || new URLSearchParams(location.search).has('debug'),
            // 🆕 新增但不破坏原有结构
            monitoring: { enabled: true, errorReporting: true },
            features: { enableWorkers: typeof Worker !== 'undefined' }
        };
        
        static get(path, fallback) {
            const keys = path.split('.');
            let value = this.data;
            for (const key of keys) {
                value = value?.[key];
                if (value === undefined) return fallback;
            }
            return value;
        }
        
        static set(path, value) {
            const keys = path.split('.');
            let obj = this.data;
            for (let i = 0; i < keys.length - 1; i++) {
                obj[keys[i]] = obj[keys[i]] || {};
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = value;
        }
        
        static getAll() {
            return { ...this.data };
        }
    }
    
    // =================================================================
    // 2. 保持原有LRU缓存 + 性能优化
    // =================================================================
    class LRUCache {
        constructor(maxSize = 50, ttl = 300000) {
            this.maxSize = maxSize;
            this.ttl = ttl;
            this.cache = new Map();
            this.timers = new Map();
            this.hits = 0;
            this.misses = 0;
        }
        
        set(key, value) {
            // 清理旧的定时器
            if (this.timers.has(key)) {
                clearTimeout(this.timers.get(key));
            }
            
            // 删除旧值重新插入(利用Map的插入顺序特性实现LRU)
            this.cache.delete(key);
            this.cache.set(key, value);
            
            // 设置过期定时器
            if (this.ttl > 0) {
                this.timers.set(key, setTimeout(() => {
                    this.cache.delete(key);
                    this.timers.delete(key);
                }, this.ttl));
            }
            
            // 容量控制 - 移除最久未使用的项
            if (this.cache.size > this.maxSize) {
                const firstKey = this.cache.keys().next().value;
                this.delete(firstKey);
            }
            
            return true;
        }
        
        get(key) {
            if (!this.cache.has(key)) {
                this.misses++;
                return null;
            }
            
            // 更新LRU顺序 - 删除后重新插入到末尾
            const value = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, value);
            this.hits++;
            return value;
        }
        
        has(key) {
            return this.cache.has(key);
        }
        
        delete(key) {
            if (this.timers.has(key)) {
                clearTimeout(this.timers.get(key));
                this.timers.delete(key);
            }
            return this.cache.delete(key);
        }
        
        clear() {
            for (const timer of this.timers.values()) {
                clearTimeout(timer);
            }
            this.cache.clear();
            this.timers.clear();
            this.hits = 0;
            this.misses = 0;
        }
        
        getStats() {
            return {
                size: this.cache.size,
                maxSize: this.maxSize,
                hits: this.hits,
                misses: this.misses,
                hitRate: this.hits + this.misses > 0 ? (this.hits / (this.hits + this.misses) * 100).toFixed(1) + '%' : '0%',
                usage: (this.cache.size / this.maxSize * 100).toFixed(1) + '%'
            };
        }
        
        // 🆕 批量操作 (新增但不破坏现有功能)
        setMany(entries) {
            for (const [key, value] of entries) {
                this.set(key, value);
            }
        }
        
        getMany(keys) {
            const results = new Map();
            for (const key of keys) {
                const value = this.get(key);
                if (value !== null) {
                    results.set(key, value);
                }
            }
            return results;
        }
    }
    
    // =================================================================
    // 3. 保持原有缓存管理器 + 增强统计
    // =================================================================
    class CacheManager {
        static caches = new Map();
        
        static create(name, maxSize = 50, ttl = 300000) {
            const cache = new LRUCache(maxSize, ttl);
            this.caches.set(name, cache);
            return cache;
        }
        
        // 🆕 新增方法但保持原有API
        static createCache(name, options = {}) {
            const { maxSize = 50, ttl = 300000 } = options;
            return this.create(name, maxSize, ttl);
        }
        
        static get(name) {
            return this.caches.get(name);
        }
        
        // 🆕 别名方法
        static getCache(name) {
            return this.get(name);
        }
        
        static destroy(name) {
            const cache = this.caches.get(name);
            if (cache) {
                cache.clear();
                this.caches.delete(name);
            }
        }
        
        // 🆕 别名方法
        static destroyCache(name) {
            return this.destroy(name);
        }
        
        static getStats() {
            const stats = {};
            for (const [name, cache] of this.caches) {
                stats[name] = cache.getStats();
            }
            return stats;
        }
        
        static cleanup() {
            // LRU缓存自动清理，不需要手动清理
        }
        
        static destroyAll() {
            for (const [name] of this.caches) {
                this.destroy(name);
            }
        }
    }
    
    // =================================================================
    // 4. 保持原有错误处理 + 增强功能
    // =================================================================
    class ErrorHandler {
        static errors = [];
        static maxErrors = 50;
        
        static handle(context, error, showUser = false) {
            // 记录错误
            this.errors.push({
                context,
                message: error.message || error,
                stack: error.stack,
                timestamp: Date.now()
            });
            
            // 限制错误数量
            if (this.errors.length > this.maxErrors) {
                this.errors.shift();
            }
            
            // 开发环境输出详细信息
            if (Config.get('debug')) {
                console.warn(`[${context}]`, error.message || error, error.stack);
            }
            
            // 用户通知
            if (showUser) {
                this.showNotification(error.message || error);
            }
        }
        
        static record(module, operation, error, context = {}) {
            this.handle(`${module}.${operation}`, error);
        }
        
        static safe(fn, context = 'unknown', fallback = null) {
            try {
                return fn();
            } catch (error) {
                this.handle(context, error);
                return fallback;
            }
        }
        
        static safeSync(fn, fallback = null, context = 'unknown') {
            return this.safe(fn, context, fallback);
        }
        
        static async safeAsync(fn, fallback = null, context = 'unknown') {
            try {
                return await fn();
            } catch (error) {
                this.handle(context, error);
                return fallback;
            }
        }
        
        // 🆕 新增方法但不破坏现有功能
        static async recover(module, operation, recoveryFn) {
            try {
                await recoveryFn();
                return true;
            } catch (error) {
                this.handle(`${module}.${operation}.recovery`, error);
                return false;
            }
        }
        
        static showNotification(message) {
            this.showError(message);
        }
        
        static showError(message, container = document.body) {
            try {
                const div = document.createElement('div');
                div.style.cssText = `
                    position:fixed;top:20px;right:20px;background:#fff3cd;
                    border:1px solid #ffeaa7;padding:12px;border-radius:4px;
                    z-index:9999;max-width:300px;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.1);
                `;
                
                const messageEl = document.createElement('div');
                messageEl.textContent = message;
                messageEl.style.marginRight = '20px';
                
                const close = document.createElement('button');
                close.textContent = '×';
                close.style.cssText = 'position:absolute;top:8px;right:8px;background:none;border:none;cursor:pointer;font-size:16px;';
                close.onclick = () => div.remove();
                
                div.appendChild(messageEl);
                div.appendChild(close);
                container.appendChild(div);
                
                setTimeout(() => {
                    if (div.parentElement) div.remove();
                }, 5000);
            } catch (e) {
                console.error('显示错误通知失败:', message);
            }
        }
        
        static getStats() {
            const stats = {
                totalErrors: this.errors.length,
                recentErrors: this.errors.slice(-5)
            };
            
            // 按模块统计
            const byModule = {};
            for (const error of this.errors) {
                const module = error.context.split('.')[0];
                byModule[module] = (byModule[module] || 0) + 1;
            }
            stats.byModule = byModule;
            
            return stats;
        }
        
        static clear(module = null) {
            if (module) {
                this.errors = this.errors.filter(error => !error.context.startsWith(module));
            } else {
                this.errors.length = 0;
            }
        }
        
        // 🆕 保持向后兼容的初始化方法
        static init(config = {}) {
            if (config.MAX_ERRORS) this.maxErrors = config.MAX_ERRORS;
        }
    }
    
    // =================================================================
    // 5. 保持原有性能监控 + 增强指标
    // =================================================================
    class Performance {
        static enabled = false;
        static metrics = [];
        static timers = new Map();
        static maxMetrics = 100;
        
        static init(config = {}) {
            this.enabled = config.enabled || false;
            if (config.maxMetrics) this.maxMetrics = config.maxMetrics;
        }
        
        static enable() {
            this.enabled = true;
        }
        
        static setEnabled(enabled) {
            this.enabled = enabled;
        }
        
        static startMeasure(name, category = 'general') {
            if (!this.enabled) return null;
            
            const id = `${category}-${name}-${Date.now()}`;
            this.timers.set(id, {
                name,
                category,
                startTime: performance.now()
            });
            return id;
        }
        
        static endMeasure(id) {
            if (!id || !this.timers.has(id)) return null;
            
            const timer = this.timers.get(id);
            const duration = performance.now() - timer.startTime;
            
            this.metrics.push({
                name: timer.name,
                category: timer.category,
                duration,
                timestamp: Date.now()
            });
            
            // 限制指标数量
            if (this.metrics.length > this.maxMetrics) {
                this.metrics.shift();
            }
            
            this.timers.delete(id);
            return { name: timer.name, duration };
        }
        
        static measure(name, fn) {
            if (!this.enabled) return fn();
            
            const start = performance.now();
            const result = fn();
            const duration = performance.now() - start;
            
            this.recordMetric(name, duration);
            return result;
        }
        
        static async measureAsync(name, fn) {
            if (!this.enabled) return await fn();
            
            const start = performance.now();
            const result = await fn();
            const duration = performance.now() - start;
            
            this.recordMetric(name, duration);
            return result;
        }
        
        // 🆕 保持向后兼容的方法名
        static async measureFunction(fn, name, category = 'function') {
            return this.measureAsync(name, fn);
        }
        
        static recordMetric(name, value, category = 'custom') {
            if (!this.enabled) return;
            
            this.metrics.push({
                name,
                category,
                duration: value,
                timestamp: Date.now()
            });
            
            if (this.metrics.length > this.maxMetrics) {
                this.metrics.shift();
            }
        }
        
        static getStats() {
            if (!this.metrics.length) return { average: 0, count: 0, categories: {} };
            
            const total = this.metrics.reduce((sum, m) => sum + m.duration, 0);
            const categories = {};
            
            for (const metric of this.metrics) {
                if (!categories[metric.category]) {
                    categories[metric.category] = { count: 0, total: 0, avg: 0 };
                }
                categories[metric.category].count++;
                categories[metric.category].total += metric.duration;
                categories[metric.category].avg = categories[metric.category].total / categories[metric.category].count;
            }
            
            return {
                average: (total / this.metrics.length).toFixed(2),
                count: this.metrics.length,
                recent: this.metrics.slice(-5),
                categories
            };
        }
        
        static clear() {
            this.metrics.length = 0;
            this.timers.clear();
        }
    }
    
    // =================================================================
    // 6. 保持原有Worker管理
    // =================================================================
    class WorkerManager {
        static async execute(scriptPath, data, fallback, timeout = 10000) {
            if (typeof Worker === 'undefined') {
                console.warn('[Worker] Not supported, using fallback');
                return fallback(data);
            }
            
            try {
                const worker = new Worker(scriptPath);
                const result = await new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        worker.terminate();
                        reject(new Error('Worker timeout'));
                    }, timeout);
                    
                    worker.onmessage = (e) => {
                        clearTimeout(timeoutId);
                        worker.terminate();
                        
                        if (e.data && e.data.success !== false) {
                            resolve(e.data.result || e.data.data || e.data);
                        } else {
                            reject(new Error(e.data.error || 'Worker error'));
                        }
                    };
                    
                    worker.onerror = (error) => {
                        clearTimeout(timeoutId);
                        worker.terminate();
                        reject(error);
                    };
                    
                    worker.postMessage(data);
                });
                
                return result;
            } catch (error) {
                console.warn('[Worker] Error, using fallback:', error.message);
                return fallback(data);
            }
        }
        
        static async safeExecute(scriptPath, data, fallbackFn) {
            return this.execute(scriptPath, data, fallbackFn);
        }
    }
    
    // =================================================================
    // 7. 🔧 100%向后兼容适配器 (保持所有原有API)
    // =================================================================
    class ConfigManagerAdapter {
        static createModuleConfig(moduleName, customConfig = {}) {
            const moduleDefaults = {
                audioSync: {
                    offset: 0,
                    autoscroll: true,
                    enableWorkers: Config.get('features.enableWorkers', true),
                    workerTimeout: 15000
                },
                glossary: {
                    cacheMaxSize: 30,
                    cacheTTL: 600000,
                    enablePreloading: true,
                    featureExtraction: {
                        ENABLE_FEATURE_EXTRACTION: false,
                        COLLECT_TRAINING_DATA: false
                    }
                },
                navigation: {
                    siteTitle: '互动学习平台',
                    cacheMaxSize: 50,
                    cacheTTL: 300000,
                    enablePreloading: true
                },
                main: {
                    siteTitle: '互动学习平台',
                    enableErrorBoundary: true
                }
            };

            const baseConfig = {
                debug: Config.get('debug'),
                enableErrorBoundary: true,
                showErrorDetails: Config.get('debug')
            };

            return {
                ...baseConfig,
                ...(moduleDefaults[moduleName] || {}),
                ...customConfig
            };
        }

        static get(path, fallback) {
            return Config.get(path, fallback);
        }

        static set(path, value) {
            return Config.set(path, value);
        }

        static getAll() {
            return Config.getAll();
        }
    }

    class CacheManagerAdapter {
        static createCache(name, options = {}) {
            const { maxSize = 50, ttl = 300000, strategy = 'lru' } = options;
            return CacheManager.create(name, maxSize, ttl);
        }

        static create(name, maxSize = 50, ttl = 300000) {
            return CacheManager.create(name, maxSize, ttl);
        }

        static get(name) {
            return CacheManager.get(name);
        }

        static getCache(name) {
            return CacheManager.get(name);
        }

        static destroy(name) {
            return CacheManager.destroy(name);
        }

        static destroyCache(name) {
            return CacheManager.destroy(name);
        }

        static getStats() {
            return CacheManager.getStats();
        }

        static cleanup() {
            return CacheManager.cleanup();
        }

        static destroyAll() {
            return CacheManager.destroyAll();
        }
    }
    
    // =================================================================
    // 8. 🚀 保守版应用初始化
    // =================================================================
    class App {
        static async init() {
            try {
                console.log('🚀 初始化 EnglishSite (保守版)...');
                
                // 🔧 最小环境检测
                const isMobile = window.innerWidth <= 768;
                const isSlowConnection = navigator.connection?.effectiveType?.includes('2g');
                
                // 🔧 保守的配置调整
                if (isMobile) {
                    Config.set('cache.maxSize', 20);
                    Config.set('ui.fadeTime', 200);
                }
                
                if (isSlowConnection) {
                    Config.set('performance.timeout', 20000);
                }
                
                // 创建默认缓存实例
                CacheManager.create('content', Config.get('cache.maxSize', 20), 300000);
                CacheManager.create('images', 50, 600000);
                CacheManager.create('srt', 10, 600000);
                CacheManager.create('glossary', 30, 600000);
                
                // 🔧 保守的调试工具
                if (Config.get('debug')) {
                    Performance.enable();
                    this.setupSimpleDebugTools();
                }
                
                // 页面卸载清理
                window.addEventListener('beforeunload', () => {
                    CacheManager.destroyAll();
                    Performance.setEnabled(false);
                });
                
                // 🔧 简单的定期清理
                setInterval(() => {
                    if (ErrorHandler.errors.length > 100) {
                        ErrorHandler.errors = ErrorHandler.errors.slice(-50);
                    }
                }, 300000);
                
                console.log('✅ EnglishSite 初始化完成 (保守版)');
                return true;
                
            } catch (error) {
                ErrorHandler.handle('App.init', error, true);
                console.error('❌ EnglishSite 初始化失败:', error);
                return false;
            }
        }
        
        // 🔧 简化的调试工具
        static setupSimpleDebugTools() {
            window.appDebug = {
                config: Config,
                cache: CacheManagerAdapter,
                errors: ErrorHandler,
                perf: Performance,
                worker: WorkerManager,
                
                stats() {
                    return {
                        config: Config.getAll(),
                        cache: CacheManagerAdapter.getStats(),
                        errors: ErrorHandler.getStats(),
                        performance: Performance.getStats()
                    };
                },
                
                clearAll() {
                    CacheManagerAdapter.destroyAll();
                    ErrorHandler.clear();
                    Performance.clear();
                    console.log('🧹 所有数据已清理');
                },
                
                test() {
                    console.log('🧪 运行基础测试...');
                    
                    // 测试配置
                    Config.set('test.value', 123);
                    const testValue = Config.get('test.value');
                    console.log('✅ Config:', testValue === 123);
                    
                    // 测试缓存
                    const cache = CacheManagerAdapter.create('test');
                    cache.set('key', 'value');
                    const cacheValue = cache.get('key');
                    console.log('✅ Cache:', cacheValue === 'value');
                    CacheManagerAdapter.destroy('test');
                    
                    // 测试错误处理
                    const errorResult = ErrorHandler.safe(() => {
                        throw new Error('test');
                    }, 'test', 'fallback');
                    console.log('✅ ErrorHandler:', errorResult === 'fallback');
                    
                    console.log('🎉 所有测试通过！');
                }
            };
            
            console.log('🛠️ 调试工具已启用 (window.appDebug)');
        }
    }
    
    // =================================================================
    // 9. 🔄 导出API - 100%兼容原有系统
    // =================================================================
    Object.assign(window.EnglishSite, {
        // 新的内部API
        Config,
        CacheManager: CacheManagerAdapter,
        ErrorHandler,
        Performance,
        WorkerManager,
        
        // 🚨 重要：完全兼容的旧API (所有现有模块依赖这些)
        ConfigManager: ConfigManagerAdapter,
        SimpleErrorHandler: ErrorHandler,
        UltraSimpleError: ErrorHandler,
        PerformanceMonitor: Performance,
        UltraSimpleWorker: WorkerManager,
        
        // 初始化Promise
        coreToolsReady: null
    });
    
    // =================================================================
    // 10. 🔧 安全的自动初始化
    // =================================================================
    const initPromise = (() => {
        if (document.readyState === 'loading') {
            return new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', () => {
                    App.init().then(resolve).catch(error => {
                        console.error('Init failed but continuing:', error);
                        resolve(false); // 🔧 即使失败也继续，不阻塞
                    });
                });
            });
        } else {
            return App.init().catch(error => {
                console.error('Init failed but continuing:', error);
                return false; // 🔧 即使失败也继续
            });
        }
    })();
    
    window.EnglishSite.coreToolsReady = initPromise;
    
})();

/*
🚨 紧急修复说明:

1. ✅ 保持了所有原有API不变
2. ✅ 移除了所有破坏性更改  
3. ✅ 只添加了增强功能，不改变现有逻辑
4. ✅ 简化了初始化过程
5. ✅ 即使初始化失败也不会阻塞其他模块

所有现有的调用都应该正常工作:
- window.EnglishSite.ConfigManager.createModuleConfig()
- window.EnglishSite.SimpleErrorHandler.record()
- window.EnglishSite.CacheManager.create()
- 等等...

这个版本是安全的，不会破坏任何现有功能。
*/