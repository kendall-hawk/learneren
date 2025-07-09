/**
 * 🚀 英语学习网站核心基础设施 - 稳定重构版 v4.0
 * 
 * 特性：
 * - 保持ES2020兼容性
 * - 性能优化和内存管理
 * - 智能错误处理
 * - 100% 向后兼容
 * - 渐进式现代化
 * 
 * @author Stable Refactor
 * @version 4.0.0
 * @date 2025-01-09
 */

(function() {
    'use strict';
    
    // 确保全局命名空间
    window.EnglishSite = window.EnglishSite || {};
    
    console.log('🚀 Loading Stable EnglishSite Core v4.0...');
    
    // =================================================================
    // 1. 稳定配置管理器
    // =================================================================
    class StableConfigManager {
        constructor(initialConfig = {}) {
            this.config = new Map();
            this.watchers = new Map();
            this.frozen = false;
            
            // 默认配置
            this.defaultConfig = {
                cache: {
                    maxSize: 100,
                    ttl: 300000, // 5分钟
                    strategy: 'lru',
                    autoCleanup: true
                },
                performance: {
                    throttleMs: 16,
                    debounceMs: 100,
                    timeoutMs: 10000,
                    enableMetrics: window.location.hostname === 'localhost',
                    maxMetrics: 1000
                },
                ui: {
                    animationDuration: 300,
                    fadeTime: 200,
                    loadDelay: 150,
                    theme: 'auto'
                },
                features: {
                    enableWorkers: typeof Worker !== 'undefined',
                    enableCompression: false,
                    enableStreaming: typeof ReadableStream !== 'undefined'
                },
                debug: {
                    enabled: window.location.hostname === 'localhost' || 
                            new URLSearchParams(window.location.search).has('debug'),
                    verbose: new URLSearchParams(window.location.search).has('verbose'),
                    logLevel: 'warn'
                }
            };
            
            this.initializeConfig(initialConfig);
            this.setupEnvironmentDetection();
        }
        
        initializeConfig(initialConfig) {
            // 深度合并配置
            const mergedConfig = this.deepMerge(
                JSON.parse(JSON.stringify(this.defaultConfig)),
                initialConfig
            );
            
            // 转换为扁平结构提升性能
            this.flattenToMap(mergedConfig);
        }
        
        deepMerge(target, source) {
            const result = Object.assign({}, target);
            
            for (const key in source) {
                if (source.hasOwnProperty(key)) {
                    const value = source[key];
                    if (value && typeof value === 'object' && !Array.isArray(value)) {
                        result[key] = this.deepMerge(target[key] || {}, value);
                    } else {
                        result[key] = value;
                    }
                }
            }
            
            return result;
        }
        
        flattenToMap(obj, prefix = '') {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const value = obj[key];
                    const fullKey = prefix ? `${prefix}.${key}` : key;
                    
                    if (value && typeof value === 'object' && !Array.isArray(value)) {
                        this.flattenToMap(value, fullKey);
                    } else {
                        this.config.set(fullKey, value);
                    }
                }
            }
        }
        
        setupEnvironmentDetection() {
            try {
                // 环境检测
                const isMobile = window.innerWidth <= 768;
                const isSlowConnection = navigator.connection && 
                    navigator.connection.effectiveType && 
                    navigator.connection.effectiveType.includes('2g');
                const isLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
                
                // 根据环境调整配置
                if (isMobile) {
                    this.set('cache.maxSize', 50);
                    this.set('ui.animationDuration', 200);
                    this.set('performance.maxMetrics', 500);
                }
                
                if (isSlowConnection) {
                    this.set('performance.timeoutMs', 20000);
                    this.set('cache.ttl', 600000);
                }
                
                if (isLowMemory) {
                    this.set('cache.maxSize', Math.min(this.get('cache.maxSize'), 30));
                    this.set('performance.maxMetrics', 200);
                }
                
                // 保存环境信息
                this.set('environment.isMobile', isMobile);
                this.set('environment.isSlowConnection', isSlowConnection);
                this.set('environment.isLowMemory', isLowMemory);
                
            } catch (error) {
                console.warn('[Config] Environment detection failed:', error);
            }
        }
        
        get(path, defaultValue) {
            if (this.config.has(path)) {
                return this.config.get(path);
            }
            
            // 尝试点语法获取
            try {
                const parts = path.split('.');
                let current = this.getAll();
                
                for (const part of parts) {
                    current = current && current[part];
                    if (current === undefined) break;
                }
                
                return current !== undefined ? current : defaultValue;
            } catch (error) {
                return defaultValue;
            }
        }
        
        set(path, value, options = {}) {
            const notify = options.notify || false;
            
            if (this.frozen) {
                console.warn(`Configuration is frozen. Cannot set ${path}`);
                return this;
            }
            
            const oldValue = this.config.get(path);
            this.config.set(path, value);
            
            // 通知观察者
            if (notify && oldValue !== value) {
                this.notifyWatchers(path, value, oldValue);
            }
            
            return this;
        }
        
        watch(path, callback) {
            if (!this.watchers.has(path)) {
                this.watchers.set(path, new Set());
            }
            
            this.watchers.get(path).add(callback);
            
            // 返回取消订阅函数
            return () => {
                const pathWatchers = this.watchers.get(path);
                if (pathWatchers) {
                    pathWatchers.delete(callback);
                    if (pathWatchers.size === 0) {
                        this.watchers.delete(path);
                    }
                }
            };
        }
        
        notifyWatchers(path, newValue, oldValue) {
            const watchers = this.watchers.get(path);
            if (watchers) {
                watchers.forEach(callback => {
                    try {
                        callback(newValue, oldValue, path);
                    } catch (error) {
                        console.warn(`Config watcher error for ${path}:`, error);
                    }
                });
            }
        }
        
        getAll() {
            const result = {};
            
            for (const [key, value] of this.config) {
                const parts = key.split('.');
                let current = result;
                
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!current[parts[i]]) {
                        current[parts[i]] = {};
                    }
                    current = current[parts[i]];
                }
                
                current[parts[parts.length - 1]] = value;
            }
            
            return result;
        }
        
        freeze() {
            this.frozen = true;
            return this;
        }
        
        unfreeze() {
            this.frozen = false;
            return this;
        }
        
        destroy() {
            this.config.clear();
            this.watchers.clear();
            this.frozen = false;
        }
        
        // 静态方法 - 兼容性
        static createModuleConfig(moduleName, customConfig = {}) {
            const moduleDefaults = {
                audioSync: {
                    offset: 0,
                    autoscroll: true,
                    enableWorkers: typeof Worker !== 'undefined',
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
                debug: window.location.hostname === 'localhost' || 
                       new URLSearchParams(window.location.search).has('debug'),
                enableErrorBoundary: true,
                showErrorDetails: window.location.hostname === 'localhost'
            };

            return Object.assign({}, baseConfig, moduleDefaults[moduleName] || {}, customConfig);
        }
    }
    
    // =================================================================
    // 2. 高性能LRU缓存
    // =================================================================
    class StableLRUCache {
        constructor(options = {}) {
            this.maxSize = options.maxSize || 100;
            this.ttl = options.ttl || 300000;
            this.enableStats = options.enableStats !== false;
            this.onEviction = options.onEviction;
            
            this.data = new Map();
            this.timers = new Map();
            this.stats = {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0,
                evictions: 0,
                startTime: Date.now()
            };
        }
        
        set(key, value) {
            this.enableStats && this.stats.sets++;
            
            // 清理旧的定时器
            this.clearTimer(key);
            
            // LRU: 删除后重新插入
            this.data.delete(key);
            this.data.set(key, value);
            
            // 设置TTL
            if (this.ttl > 0) {
                this.timers.set(key, setTimeout(() => {
                    this.delete(key);
                }, this.ttl));
            }
            
            // 容量控制
            if (this.data.size > this.maxSize) {
                this.evictLRU();
            }
            
            return this;
        }
        
        get(key) {
            if (!this.data.has(key)) {
                this.enableStats && this.stats.misses++;
                return null;
            }
            
            const value = this.data.get(key);
            
            // LRU: 重新插入到末尾
            this.data.delete(key);
            this.data.set(key, value);
            
            this.enableStats && this.stats.hits++;
            return value;
        }
        
        has(key) {
            return this.data.has(key);
        }
        
        delete(key) {
            if (this.data.has(key)) {
                this.data.delete(key);
                this.clearTimer(key);
                this.enableStats && this.stats.deletes++;
                return true;
            }
            return false;
        }
        
        clear() {
            // 清理所有定时器
            for (const timer of this.timers.values()) {
                clearTimeout(timer);
            }
            
            this.data.clear();
            this.timers.clear();
        }
        
        get size() {
            return this.data.size;
        }
        
        setMany(entries) {
            for (const [key, value] of entries) {
                this.set(key, value);
            }
            return this;
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
        
        getStats() {
            const total = this.stats.hits + this.stats.misses;
            
            return {
                size: this.data.size,
                maxSize: this.maxSize,
                hits: this.stats.hits,
                misses: this.stats.misses,
                sets: this.stats.sets,
                deletes: this.stats.deletes,
                evictions: this.stats.evictions,
                hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(1) + '%' : '0%',
                usage: (this.data.size / this.maxSize * 100).toFixed(1) + '%',
                uptime: Date.now() - this.stats.startTime
            };
        }
        
        evictLRU() {
            const firstKey = this.data.keys().next().value;
            if (firstKey !== undefined) {
                const evictedValue = this.data.get(firstKey);
                this.delete(firstKey);
                this.enableStats && this.stats.evictions++;
                
                if (this.onEviction) {
                    try {
                        this.onEviction(firstKey, evictedValue);
                    } catch (error) {
                        console.warn('Eviction callback error:', error);
                    }
                }
            }
        }
        
        clearTimer(key) {
            const timer = this.timers.get(key);
            if (timer) {
                clearTimeout(timer);
                this.timers.delete(key);
            }
        }
        
        cleanup() {
            // TTL会自动清理，这里做额外清理
        }
        
        destroy() {
            this.clear();
        }
    }
    
    // =================================================================
    // 3. 缓存管理器
    // =================================================================
    class StableCacheManager {
        constructor() {
            this.caches = new Map();
            this.globalStats = {
                totalHits: 0,
                totalMisses: 0,
                totalSets: 0,
                totalDeletes: 0,
                startTime: Date.now()
            };
            
            this.setupCleanup();
        }
        
        setupCleanup() {
            // 定期清理
            this.cleanupInterval = setInterval(() => {
                this.performGlobalCleanup();
            }, 60000); // 每分钟
        }
        
        create(name, options = {}) {
            const config = Object.assign({
                maxSize: 100,
                ttl: 300000,
                enableStats: true
            }, options);
            
            const cache = new StableLRUCache(config);
            this.caches.set(name, cache);
            
            return cache;
        }
        
        get(name) {
            return this.caches.get(name);
        }
        
        has(name) {
            return this.caches.has(name);
        }
        
        destroy(name) {
            const cache = this.caches.get(name);
            if (cache) {
                cache.clear();
                this.caches.delete(name);
                return true;
            }
            return false;
        }
        
        performGlobalCleanup() {
            for (const [name, cache] of this.caches) {
                if (cache.cleanup) {
                    cache.cleanup();
                }
            }
        }
        
        getGlobalStats() {
            const cacheStats = {};
            
            for (const [name, cache] of this.caches) {
                cacheStats[name] = cache.getStats ? cache.getStats() : {};
            }
            
            return {
                global: this.globalStats,
                caches: cacheStats,
                totalCaches: this.caches.size
            };
        }
        
        destroyAll() {
            for (const [name] of this.caches) {
                this.destroy(name);
            }
            
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
            }
        }
        
        // 兼容性方法
        createCache(name, options = {}) {
            return this.create(name, options);
        }
        
        getCache(name) {
            return this.get(name);
        }
        
        destroyCache(name) {
            return this.destroy(name);
        }
        
        getStats() {
            return this.getGlobalStats();
        }
        
        cleanup() {
            return this.performGlobalCleanup();
        }
    }
    
    // =================================================================
    // 4. 错误处理系统
    // =================================================================
    class StableErrorHandler {
        constructor(config = {}) {
            this.errors = [];
            this.errorCounts = new Map();
            this.rateLimits = new Map();
            
            this.config = Object.assign({
                maxErrors: 1000,
                rateLimitWindow: 60000, // 1分钟
                rateLimitMax: 10, // 每分钟最多10个相同错误
                enableReporting: false
            }, config);
            
            this.setupGlobalErrorHandling();
        }
        
        setupGlobalErrorHandling() {
            // 全局错误捕获
            if (window.addEventListener) {
                window.addEventListener('error', (event) => {
                    this.handle('global.uncaught', event.error || new Error(event.message), {
                        filename: event.filename,
                        line: event.lineno,
                        column: event.colno
                    });
                });
                
                window.addEventListener('unhandledrejection', (event) => {
                    this.handle('global.unhandledRejection', 
                        event.reason || new Error('Unhandled Promise rejection'));
                    event.preventDefault();
                });
            }
        }
        
        handle(context, error, metadata = {}) {
            try {
                const errorObj = this.normalizeError(error);
                const errorKey = `${context}:${errorObj.message}`;
                
                // 速率限制检查
                if (this.isRateLimited(errorKey)) {
                    return false;
                }
                
                // 错误增强
                const enhancedError = Object.assign({}, errorObj, {
                    context: context,
                    metadata: metadata,
                    timestamp: Date.now(),
                    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    level: this.determineErrorLevel(errorObj, context)
                });
                
                // 存储错误
                this.storeError(enhancedError);
                
                // 开发环境输出
                if (this.config.debug || window.location.hostname === 'localhost') {
                    this.devOutput(enhancedError);
                }
                
                return true;
            } catch (handlingError) {
                console.error('Error handling failed:', handlingError);
                return false;
            }
        }
        
        normalizeError(error) {
            if (error instanceof Error) {
                return {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                };
            }
            
            if (typeof error === 'string') {
                return {
                    name: 'StringError',
                    message: error,
                    stack: new Error().stack
                };
            }
            
            return {
                name: 'UnknownError',
                message: String(error),
                stack: new Error().stack
            };
        }
        
        isRateLimited(errorKey) {
            const now = Date.now();
            const windowStart = now - this.config.rateLimitWindow;
            
            // 清理过期记录
            for (const [key, timestamps] of this.rateLimits) {
                const filteredTimestamps = timestamps.filter(t => t > windowStart);
                if (filteredTimestamps.length === 0) {
                    this.rateLimits.delete(key);
                } else {
                    this.rateLimits.set(key, filteredTimestamps);
                }
            }
            
            // 检查当前错误
            const timestamps = this.rateLimits.get(errorKey) || [];
            if (timestamps.length >= this.config.rateLimitMax) {
                return true;
            }
            
            // 记录新的时间戳
            timestamps.push(now);
            this.rateLimits.set(errorKey, timestamps);
            
            return false;
        }
        
        determineErrorLevel(error, context) {
            if (context.includes('critical') || error.name === 'SecurityError') {
                return 'critical';
            }
            
            if (context.includes('network') || error.name === 'NetworkError') {
                return 'error';
            }
            
            if (context.includes('warn') || error.name === 'ValidationError') {
                return 'warn';
            }
            
            return 'info';
        }
        
        storeError(errorObj) {
            this.errors.push(errorObj);
            
            // 限制存储数量
            if (this.errors.length > this.config.maxErrors) {
                this.errors.shift();
            }
            
            // 更新计数
            const key = `${errorObj.context}:${errorObj.name}`;
            this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
        }
        
        devOutput(errorObj) {
            const styles = {
                'info': 'color: #007bff; background: #e7f3ff;',
                'warn': 'color: #856404; background: #fff3cd;',
                'error': 'color: #721c24; background: #f8d7da;',
                'critical': 'color: #fff; background: #dc3545;'
            };
            
            const style = styles[errorObj.level] || styles.error;
            
            console.group(`%c[${errorObj.level.toUpperCase()}] ${errorObj.context}`, style);
            console.error(errorObj.message);
            if (errorObj.stack) console.log('Stack:', errorObj.stack);
            if (Object.keys(errorObj.metadata).length > 0) {
                console.log('Metadata:', errorObj.metadata);
            }
            console.log('Timestamp:', new Date(errorObj.timestamp).toISOString());
            console.groupEnd();
        }
        
        getStats() {
            const now = Date.now();
            const last24h = now - 86400000;
            const recentErrors = this.errors.filter(e => e.timestamp > last24h);
            
            return {
                total: this.errors.length,
                recent24h: recentErrors.length,
                byLevel: this.groupByLevel(recentErrors),
                byContext: this.groupByContext(recentErrors),
                topErrors: this.getTopErrors(),
                rateLimited: this.rateLimits.size
            };
        }
        
        groupByLevel(errors) {
            return errors.reduce((acc, error) => {
                acc[error.level] = (acc[error.level] || 0) + 1;
                return acc;
            }, {});
        }
        
        groupByContext(errors) {
            return errors.reduce((acc, error) => {
                acc[error.context] = (acc[error.context] || 0) + 1;
                return acc;
            }, {});
        }
        
        getTopErrors() {
            return Array.from(this.errorCounts.entries())
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([key, count]) => ({ error: key, count: count }));
        }
        
        clear(context = null) {
            if (context) {
                this.errors = this.errors.filter(e => !e.context.includes(context));
            } else {
                this.errors.length = 0;
                this.errorCounts.clear();
                this.rateLimits.clear();
            }
        }
        
        // 兼容性方法
        record(module, operation, error, context = {}) {
            return this.handle(`${module}.${operation}`, error, context);
        }
        
        safe(fn, fallback = null, context = 'unknown') {
            try {
                return fn();
            } catch (error) {
                this.handle(context, error);
                return fallback;
            }
        }
        
        safeSync(fn, fallback = null, context = 'unknown') {
            return this.safe(fn, fallback, context);
        }
        
        async safeAsync(fn, fallback = null, context = 'unknown') {
            try {
                return await fn();
            } catch (error) {
                this.handle(context, error);
                return fallback;
            }
        }
        
        showError(message) {
            try {
                const div = document.createElement('div');
                div.style.cssText = `
                    position:fixed;top:20px;right:20px;background:#fff3cd;
                    border:1px solid #ffeaa7;padding:12px;border-radius:4px;
                    z-index:9999;max-width:300px;font-size:14px;
                    box-shadow:0 2px 8px rgba(0,0,0,0.1);
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
                document.body.appendChild(div);
                
                setTimeout(() => {
                    if (div.parentElement) div.remove();
                }, 5000);
            } catch (e) {
                console.error('显示错误通知失败:', message);
            }
        }
        
        showNotification(message) {
            this.showError(message);
        }
    }
    
    // =================================================================
    // 5. 性能监控系统
    // =================================================================
    class StablePerformanceMonitor {
        constructor(config = {}) {
            this.config = Object.assign({
                enabled: false,
                maxMetrics: 1000
            }, config);
            
            this.metrics = [];
            this.timers = new Map();
        }
        
        enable() {
            this.config.enabled = true;
        }
        
        setEnabled(enabled) {
            this.config.enabled = enabled;
        }
        
        startMeasure(name, category = 'general') {
            if (!this.config.enabled) return null;
            
            const id = `${category}-${name}-${Date.now()}`;
            this.timers.set(id, {
                name: name,
                category: category,
                startTime: performance.now()
            });
            return id;
        }
        
        endMeasure(id) {
            if (!id || !this.timers.has(id)) return null;
            
            const timer = this.timers.get(id);
            const duration = performance.now() - timer.startTime;
            
            this.recordMetric(timer.name, duration, timer.category);
            
            this.timers.delete(id);
            return { name: timer.name, duration: duration };
        }
        
        recordMetric(name, value, category = 'custom') {
            if (!this.config.enabled) return;
            
            this.metrics.push({
                name: name,
                value: value,
                category: category,
                timestamp: Date.now()
            });
            
            // 限制指标数量
            if (this.metrics.length > this.config.maxMetrics) {
                this.metrics.shift();
            }
        }
        
        async measureFunction(fn, name, category = 'function') {
            if (!this.config.enabled) return await fn();
            
            const start = performance.now();
            try {
                const result = await fn();
                this.recordMetric(name, performance.now() - start, category);
                return result;
            } catch (error) {
                this.recordMetric(name + '.error', performance.now() - start, category);
                throw error;
            }
        }
        
        getStats(category = null) {
            const filteredMetrics = category ? 
                this.metrics.filter(m => m.category === category) : 
                this.metrics;
            
            if (filteredMetrics.length === 0) {
                return { count: 0, average: 0, min: 0, max: 0 };
            }
            
            const values = filteredMetrics.map(m => m.value);
            const sum = values.reduce((a, b) => a + b, 0);
            
            return {
                count: filteredMetrics.length,
                average: +(sum / filteredMetrics.length).toFixed(2),
                min: Math.min(...values),
                max: Math.max(...values),
                recent: filteredMetrics.slice(-10),
                byCategory: this.groupByCategory(filteredMetrics)
            };
        }
        
        groupByCategory(metrics) {
            return metrics.reduce((acc, metric) => {
                const cat = metric.category;
                if (!acc[cat]) {
                    acc[cat] = { count: 0, total: 0, avg: 0 };
                }
                acc[cat].count++;
                acc[cat].total += metric.value;
                acc[cat].avg = +(acc[cat].total / acc[cat].count).toFixed(2);
                return acc;
            }, {});
        }
        
        clear() {
            this.metrics.length = 0;
            this.timers.clear();
        }
        
        destroy() {
            this.clear();
        }
    }
    
    // =================================================================
    // 6. Worker管理器
    // =================================================================
    class StableWorkerManager {
        constructor(config = {}) {
            this.config = Object.assign({
                timeout: 30000,
                retries: 3,
                enableFallback: true
            }, config);
        }
        
        async execute(scriptPath, data, fallbackFn, options = {}) {
            const config = Object.assign({}, this.config, options);
            
            if (!this.isWorkerSupported()) {
                console.warn('[Worker] Not supported, using fallback');
                return fallbackFn ? fallbackFn(data) : null;
            }
            
            try {
                return await this.executeWithWorker(scriptPath, data, config);
            } catch (error) {
                console.warn('[Worker] Execution failed:', error.message);
                
                if (config.enableFallback && fallbackFn) {
                    return fallbackFn(data);
                }
                
                throw error;
            }
        }
        
        isWorkerSupported() {
            return typeof Worker !== 'undefined' && typeof Blob !== 'undefined';
        }
        
        async executeWithWorker(scriptPath, data, config) {
            const worker = new Worker(scriptPath);
            const timeoutId = setTimeout(() => {
                worker.terminate();
            }, config.timeout);
            
            try {
                const result = await new Promise((resolve, reject) => {
                    worker.onmessage = (event) => {
                        clearTimeout(timeoutId);
                        worker.terminate();
                        
                        const response = event.data;
                        if (response && response.success !== false) {
                            resolve(response.result || response.data || response);
                        } else {
                            reject(new Error(response.error || 'Worker execution failed'));
                        }
                    };
                    
                    worker.onerror = (error) => {
                        clearTimeout(timeoutId);
                        worker.terminate();
                        reject(new Error(`Worker error: ${error.message}`));
                    };
                    
                    worker.postMessage(data);
                });
                
                return result;
            } finally {
                clearTimeout(timeoutId);
            }
        }
        
        // 兼容性方法
        safeExecute(scriptPath, data, fallbackFn) {
            return this.execute(scriptPath, data, fallbackFn);
        }
    }
    
    // =================================================================
    // 7. 应用初始化器
    // =================================================================
    class StableAppInitializer {
        static async initialize(options = {}) {
            try {
                console.log('🚀 Initializing Stable EnglishSite v4.0...');
                
                // 创建核心实例
                const config = new StableConfigManager(options);
                const cacheManager = new StableCacheManager();
                const errorHandler = new StableErrorHandler(config.get('error', {}));
                const performanceMonitor = new StablePerformanceMonitor(config.get('performance', {}));
                const workerManager = new StableWorkerManager(config.get('worker', {}));
                
                // 注册到全局命名空间
                Object.assign(window.EnglishSite, {
                    // 现代化API
                    Config: config,
                    CacheManager: cacheManager,
                    ErrorHandler: errorHandler,
                    PerformanceMonitor: performanceMonitor,
                    WorkerManager: workerManager,
                    
                    // 兼容性API (重要!)
                    ConfigManager: StableConfigManager,
                    SimpleErrorHandler: errorHandler,
                    UltraSimpleError: errorHandler,
                    UltraSimpleWorker: workerManager
                });
                
                // 创建默认缓存实例
                cacheManager.create('content', { 
                    maxSize: config.get('cache.maxSize', 50), 
                    ttl: config.get('cache.ttl', 300000) 
                });
                cacheManager.create('images', { maxSize: 50, ttl: 600000 });
                cacheManager.create('srt', { maxSize: 10, ttl: 600000 });
                cacheManager.create('glossary', { maxSize: 30, ttl: 600000 });
                
                // 性能监控
                if (config.get('performance.enableMetrics')) {
                    performanceMonitor.enable();
                }
                
                // 设置清理
                window.addEventListener('beforeunload', () => {
                    cacheManager.destroyAll();
                    performanceMonitor.destroy();
                });
                
                // 定期维护
                setInterval(() => {
                    cacheManager.performGlobalCleanup();
                    
                    const errorStats = errorHandler.getStats();
                    if (errorStats.total > 500) {
                        errorHandler.clear();
                    }
                }, 300000); // 5分钟
                
                console.log('✅ Stable EnglishSite v4.0 initialized successfully');
                console.log('📊 Created caches:', Array.from(cacheManager.caches.keys()));
                
                return true;
                
            } catch (error) {
                console.error('❌ Stable EnglishSite initialization failed:', error);
                
                // 降级处理 - 确保基本功能可用
                window.EnglishSite.SimpleErrorHandler = window.EnglishSite.SimpleErrorHandler || {
                    record: function(module, operation, error) {
                        console.warn(`[${module}.${operation}]`, error);
                    },
                    safe: function(fn, fallback) {
                        try {
                            return fn();
                        } catch (err) {
                            console.warn('Safe execution failed:', err);
                            return fallback;
                        }
                    },
                    safeSync: function(fn, fallback) {
                        return this.safe(fn, fallback);
                    },
                    safeAsync: async function(fn, fallback) {
                        try {
                            return await fn();
                        } catch (err) {
                            console.warn('Safe async execution failed:', err);
                            return fallback;
                        }
                    },
                    showError: function(message) {
                        console.error('Error:', message);
                    }
                };
                
                window.EnglishSite.UltraSimpleError = window.EnglishSite.SimpleErrorHandler;
                
                return false;
            }
        }
    }
    
    // =================================================================
    // 8. 兼容性适配器
    // =================================================================
    const CompatibilityAdapter = {
        createModuleConfig: StableConfigManager.createModuleConfig,
        
        createCache: function(name, options = {}) {
            return window.EnglishSite.CacheManager && 
                   window.EnglishSite.CacheManager.create(name, options);
        },
        
        getCache: function(name) {
            return window.EnglishSite.CacheManager && 
                   window.EnglishSite.CacheManager.get(name);
        },
        
        get: function(path, fallback) {
            return window.EnglishSite.Config && 
                   window.EnglishSite.Config.get(path, fallback);
        },
        
        set: function(path, value) {
            return window.EnglishSite.Config && 
                   window.EnglishSite.Config.set(path, value);
        }
    };
    
    // =================================================================
    // 9. 自动初始化
    // =================================================================
    const initializeStableCore = async () => {
        if (document.readyState === 'loading') {
            return new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', async () => {
                    const success = await StableAppInitializer.initialize();
                    resolve(success);
                }, { once: true });
            });
        } else {
            return StableAppInitializer.initialize();
        }
    };
    
    // 设置核心就绪Promise
    window.EnglishSite.coreToolsReady = initializeStableCore();
    
    // 导出兼容性适配器
    Object.assign(window.EnglishSite, {
        // 兼容适配器
        ConfigManagerAdapter: CompatibilityAdapter,
        CacheManagerAdapter: CompatibilityAdapter,
        
        // 核心类
        StableConfigManager: StableConfigManager,
        StableCacheManager: StableCacheManager,
        StableLRUCache: StableLRUCache,
        StableErrorHandler: StableErrorHandler,
        StablePerformanceMonitor: StablePerformanceMonitor,
        StableWorkerManager: StableWorkerManager
    });
    
    console.log('✅ Stable EnglishSite Core v4.0 loaded successfully');
    
})();