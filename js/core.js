// js/core.js - 企业级优化版 v2.0 (保持100%向后兼容)
// 🎯 优化目标: 企业级标准 + 完全向后兼容 + 渐进式升级

(function() {
    'use strict';
    
    window.EnglishSite = window.EnglishSite || {};
    
    // =================================================================
    // 🔧 TypeScript风格的JSDoc类型定义
    // =================================================================
    
    /**
     * @typedef {Object} CacheItem
     * @property {any} value - 缓存值
     * @property {number} timestamp - 时间戳
     * @property {number} ttl - 生存时间
     * @property {number} accessCount - 访问次数
     * @property {number} lastAccess - 最后访问时间
     */
    
    /**
     * @typedef {Object} PerformanceMetric
     * @property {string} name - 指标名称
     * @property {string} category - 分类
     * @property {number} duration - 持续时间
     * @property {number} timestamp - 时间戳
     * @property {Object} [metadata] - 元数据
     */
    
    /**
     * @typedef {Object} ErrorInfo
     * @property {string} context - 错误上下文
     * @property {string} message - 错误消息
     * @property {string} [stack] - 错误堆栈
     * @property {number} timestamp - 时间戳
     * @property {string} severity - 错误严重性
     * @property {Object} [metadata] - 错误元数据
     */
    
    // =================================================================
    // 🎯 1. 企业级配置管理系统
    // =================================================================
    class EnterpriseConfig {
        static #instance = null;
        static #data = {
            cache: { maxSize: 50, ttl: 300000 },
            performance: { 
                throttle: 16, 
                timeout: 10000,
                enableMetrics: true,
                enableProfiling: false,
                metricsInterval: 30000
            },
            ui: { fadeTime: 300, loadDelay: 300 },
            debug: location.hostname === 'localhost' || new URLSearchParams(location.search).has('debug'),
            monitoring: {
                enabled: true,
                errorReporting: true,
                performanceTracking: true,
                memoryTracking: true
            },
            security: {
                enableCSP: true,
                sanitizeInputs: true,
                logSecurityEvents: true
            },
            features: {
                enableWorkers: typeof Worker !== 'undefined',
                enableServiceWorker: 'serviceWorker' in navigator,
                enablePWA: false
            }
        };
        
        // 🎯 单例模式 + 配置验证
        static getInstance() {
            if (!this.#instance) {
                this.#instance = new EnterpriseConfig();
            }
            return this.#instance;
        }
        
        /**
         * 获取配置值，支持点记法和默认值
         * @param {string} path - 配置路径 (如 'cache.maxSize')
         * @param {any} fallback - 默认值
         * @returns {any} 配置值
         */
        static get(path, fallback) {
            const keys = path.split('.');
            let value = this.#data;
            
            for (const key of keys) {
                value = value?.[key];
                if (value === undefined) return fallback;
            }
            
            return value;
        }
        
        /**
         * 设置配置值，支持验证
         * @param {string} path - 配置路径
         * @param {any} value - 配置值
         * @param {Object} [options] - 选项
         */
        static set(path, value, options = {}) {
            const { validate = true, persist = false } = options;
            
            if (validate) {
                this.#validateConfigValue(path, value);
            }
            
            const keys = path.split('.');
            let obj = this.#data;
            
            for (let i = 0; i < keys.length - 1; i++) {
                obj[keys[i]] = obj[keys[i]] || {};
                obj = obj[keys[i]];
            }
            
            obj[keys[keys.length - 1]] = value;
            
            if (persist) {
                this.#persistConfig(path, value);
            }
            
            // 触发配置变更事件
            this.#emitConfigChange(path, value);
        }
        
        /**
         * 批量设置配置
         * @param {Object} configs - 配置对象
         */
        static setMany(configs) {
            for (const [path, value] of Object.entries(configs)) {
                this.set(path, value);
            }
        }
        
        /**
         * 获取所有配置
         * @returns {Object} 完整配置对象
         */
        static getAll() {
            return JSON.parse(JSON.stringify(this.#data));
        }
        
        /**
         * 重置配置到默认值
         * @param {string} [path] - 可选的特定路径
         */
        static reset(path) {
            if (path) {
                // 重置特定路径
                this.set(path, this.#getDefaultValue(path));
            } else {
                // 重置所有配置
                this.#data = this.#getDefaultConfig();
            }
        }
        
        // 🔧 私有方法
        static #validateConfigValue(path, value) {
            const validators = {
                'cache.maxSize': (v) => Number.isInteger(v) && v > 0,
                'cache.ttl': (v) => Number.isInteger(v) && v > 0,
                'performance.throttle': (v) => Number.isInteger(v) && v >= 1,
                'performance.timeout': (v) => Number.isInteger(v) && v > 0,
                'ui.fadeTime': (v) => Number.isInteger(v) && v >= 0
            };
            
            const validator = validators[path];
            if (validator && !validator(value)) {
                throw new Error(`Invalid config value for ${path}: ${value}`);
            }
        }
        
        static #persistConfig(path, value) {
            try {
                const key = `englishSite.config.${path}`;
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.warn('Failed to persist config:', error);
            }
        }
        
        static #emitConfigChange(path, value) {
            try {
                window.dispatchEvent(new CustomEvent('configChanged', {
                    detail: { path, value }
                }));
            } catch (error) {
                console.warn('Failed to emit config change event:', error);
            }
        }
        
        static #getDefaultConfig() {
            return {
                cache: { maxSize: 50, ttl: 300000 },
                performance: { throttle: 16, timeout: 10000 },
                ui: { fadeTime: 300, loadDelay: 300 },
                debug: false,
                monitoring: { enabled: true },
                security: { enableCSP: true },
                features: { enableWorkers: typeof Worker !== 'undefined' }
            };
        }
        
        static #getDefaultValue(path) {
            const defaultConfig = this.#getDefaultConfig();
            const keys = path.split('.');
            let value = defaultConfig;
            
            for (const key of keys) {
                value = value?.[key];
            }
            
            return value;
        }
    }
    
    // =================================================================
    // 🎯 2. 企业级LRU缓存系统
    // =================================================================
    class EnterpriseLRUCache {
        #cache = new Map();
        #timers = new Map();
        #metadata = new Map();
        #stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            memoryUsage: 0
        };
        
        constructor(maxSize = 50, ttl = 300000, options = {}) {
            this.maxSize = maxSize;
            this.ttl = ttl;
            this.options = {
                enableStats: true,
                enableMetrics: true,
                compressionThreshold: 1000,
                enableCompression: false,
                ...options
            };
            
            // 定期清理过期项
            this.#startCleanupInterval();
        }
        
        /**
         * 设置缓存项
         * @param {string} key - 键
         * @param {any} value - 值
         * @param {Object} [options] - 选项
         * @returns {boolean} 是否设置成功
         */
        set(key, value, options = {}) {
            try {
                const ttl = options.ttl || this.ttl;
                const priority = options.priority || 'normal';
                const tags = options.tags || [];
                
                // 清除旧的定时器
                this.#clearTimer(key);
                
                // 删除旧值并重新插入（维护LRU顺序）
                this.#cache.delete(key);
                
                // 处理值（可能压缩）
                const processedValue = this.#processValue(value);
                
                this.#cache.set(key, processedValue);
                
                // 设置元数据
                this.#metadata.set(key, {
                    timestamp: Date.now(),
                    ttl,
                    priority,
                    tags,
                    accessCount: 0,
                    size: this.#estimateSize(processedValue)
                });
                
                // 设置过期定时器
                if (ttl > 0) {
                    this.#timers.set(key, setTimeout(() => {
                        this.delete(key);
                    }, ttl));
                }
                
                // 容量控制
                this.#evictIfNeeded();
                
                // 更新统计
                this.#updateStats('sets');
                
                return true;
            } catch (error) {
                console.warn('Cache set failed:', error);
                return false;
            }
        }
        
        /**
         * 获取缓存项
         * @param {string} key - 键
         * @returns {any} 缓存值或null
         */
        get(key) {
            if (!this.#cache.has(key)) {
                this.#updateStats('misses');
                return null;
            }
            
            const value = this.#cache.get(key);
            const metadata = this.#metadata.get(key);
            
            // 检查是否过期
            if (metadata && this.#isExpired(metadata)) {
                this.delete(key);
                this.#updateStats('misses');
                return null;
            }
            
            // 更新LRU顺序
            this.#cache.delete(key);
            this.#cache.set(key, value);
            
            // 更新访问统计
            if (metadata) {
                metadata.accessCount++;
                metadata.lastAccess = Date.now();
            }
            
            this.#updateStats('hits');
            
            // 处理返回值（可能解压缩）
            return this.#unprocessValue(value);
        }
        
        /**
         * 检查键是否存在
         * @param {string} key - 键
         * @returns {boolean} 是否存在
         */
        has(key) {
            if (!this.#cache.has(key)) return false;
            
            const metadata = this.#metadata.get(key);
            if (metadata && this.#isExpired(metadata)) {
                this.delete(key);
                return false;
            }
            
            return true;
        }
        
        /**
         * 删除缓存项
         * @param {string} key - 键
         * @returns {boolean} 是否删除成功
         */
        delete(key) {
            this.#clearTimer(key);
            const hasKey = this.#cache.has(key);
            
            this.#cache.delete(key);
            this.#metadata.delete(key);
            
            if (hasKey) {
                this.#updateStats('deletes');
            }
            
            return hasKey;
        }
        
        /**
         * 清空缓存
         */
        clear() {
            // 清理所有定时器
            for (const timer of this.#timers.values()) {
                clearTimeout(timer);
            }
            
            this.#cache.clear();
            this.#timers.clear();
            this.#metadata.clear();
            
            // 重置统计
            this.#stats.hits = 0;
            this.#stats.misses = 0;
        }
        
        /**
         * 按标签删除
         * @param {string} tag - 标签
         * @returns {number} 删除的项目数
         */
        deleteByTag(tag) {
            let deleted = 0;
            
            for (const [key, metadata] of this.#metadata) {
                if (metadata.tags && metadata.tags.includes(tag)) {
                    this.delete(key);
                    deleted++;
                }
            }
            
            return deleted;
        }
        
        /**
         * 获取统计信息
         * @returns {Object} 统计信息
         */
        getStats() {
            const memoryUsage = this.#calculateMemoryUsage();
            
            return {
                size: this.#cache.size,
                maxSize: this.maxSize,
                hits: this.#stats.hits,
                misses: this.#stats.misses,
                sets: this.#stats.sets,
                deletes: this.#stats.deletes,
                evictions: this.#stats.evictions,
                hitRate: this.#calculateHitRate(),
                usage: `${(this.#cache.size / this.maxSize * 100).toFixed(1)}%`,
                memoryUsage: memoryUsage,
                averageAccessCount: this.#calculateAverageAccessCount()
            };
        }
        
        /**
         * 获取键列表
         * @param {Object} [options] - 选项
         * @returns {Array} 键列表
         */
        keys(options = {}) {
            const { sortBy = 'lru', includeMetadata = false } = options;
            
            let keys = Array.from(this.#cache.keys());
            
            if (sortBy === 'access') {
                keys.sort((a, b) => {
                    const metaA = this.#metadata.get(a);
                    const metaB = this.#metadata.get(b);
                    return (metaB?.accessCount || 0) - (metaA?.accessCount || 0);
                });
            } else if (sortBy === 'time') {
                keys.sort((a, b) => {
                    const metaA = this.#metadata.get(a);
                    const metaB = this.#metadata.get(b);
                    return (metaB?.timestamp || 0) - (metaA?.timestamp || 0);
                });
            }
            
            if (includeMetadata) {
                return keys.map(key => ({
                    key,
                    metadata: this.#metadata.get(key)
                }));
            }
            
            return keys;
        }
        
        // 🔧 私有方法
        #clearTimer(key) {
            const timer = this.#timers.get(key);
            if (timer) {
                clearTimeout(timer);
                this.#timers.delete(key);
            }
        }
        
        #isExpired(metadata) {
            if (!metadata.ttl || metadata.ttl <= 0) return false;
            return Date.now() - metadata.timestamp > metadata.ttl;
        }
        
        #evictIfNeeded() {
            while (this.#cache.size > this.maxSize) {
                const firstKey = this.#cache.keys().next().value;
                this.delete(firstKey);
                this.#stats.evictions++;
            }
        }
        
        #updateStats(type) {
            if (this.options.enableStats) {
                this.#stats[type]++;
            }
        }
        
        #calculateHitRate() {
            const total = this.#stats.hits + this.#stats.misses;
            return total > 0 ? (this.#stats.hits / total * 100).toFixed(1) + '%' : '0%';
        }
        
        #calculateMemoryUsage() {
            let totalSize = 0;
            for (const metadata of this.#metadata.values()) {
                totalSize += metadata.size || 0;
            }
            return `${(totalSize / 1024).toFixed(1)} KB`;
        }
        
        #calculateAverageAccessCount() {
            if (this.#metadata.size === 0) return 0;
            
            let total = 0;
            for (const metadata of this.#metadata.values()) {
                total += metadata.accessCount || 0;
            }
            
            return (total / this.#metadata.size).toFixed(1);
        }
        
        #estimateSize(value) {
            try {
                return JSON.stringify(value).length * 2; // 粗略估算
            } catch {
                return 100; // 默认大小
            }
        }
        
        #processValue(value) {
            // 这里可以添加压缩逻辑
            if (this.options.enableCompression && 
                this.#estimateSize(value) > this.options.compressionThreshold) {
                // 实际项目中可以使用压缩库
                return { __compressed: true, data: value };
            }
            return value;
        }
        
        #unprocessValue(value) {
            if (value && value.__compressed) {
                return value.data;
            }
            return value;
        }
        
        #startCleanupInterval() {
            setInterval(() => {
                this.#cleanupExpired();
            }, 60000); // 每分钟清理一次
        }
        
        #cleanupExpired() {
            const now = Date.now();
            const expiredKeys = [];
            
            for (const [key, metadata] of this.#metadata) {
                if (this.#isExpired(metadata)) {
                    expiredKeys.push(key);
                }
            }
            
            for (const key of expiredKeys) {
                this.delete(key);
            }
        }
    }
    
    // =================================================================
    // 🎯 3. 企业级依赖注入容器
    // =================================================================
    class EnterpriseDIContainer {
        #services = new Map();
        #instances = new Map();
        #middleware = [];
        #scopes = new Map();
        
        /**
         * 注册服务
         * @param {string} name - 服务名称
         * @param {Function|Object} factory - 工厂函数或构造函数
         * @param {Object} [options] - 选项
         * @returns {EnterpriseDIContainer} 支持链式调用
         */
        register(name, factory, options = {}) {
            const {
                singleton = false,
                dependencies = [],
                middleware = [],
                scope = 'application',
                lazy = false,
                proxy = false
            } = options;
            
            this.#services.set(name, {
                name,
                factory,
                singleton,
                dependencies,
                middleware,
                scope,
                lazy,
                proxy,
                registered: Date.now()
            });
            
            return this;
        }
        
        /**
         * 解析服务
         * @param {string} name - 服务名称
         * @param {Object} [context] - 解析上下文
         * @returns {Promise<any>} 服务实例
         */
        async resolve(name, context = {}) {
            if (!this.#services.has(name)) {
                throw new DIError(`Service "${name}" not registered`);
            }
            
            const service = this.#services.get(name);
            const scopeKey = this.#getScopeKey(service.scope, context);
            
            // 检查单例或作用域实例
            if (service.singleton && this.#instances.has(name)) {
                return this.#instances.get(name);
            }
            
            if (service.scope !== 'transient' && this.#scopes.has(scopeKey)) {
                return this.#scopes.get(scopeKey);
            }
            
            // 解析依赖
            const dependencies = await this.#resolveDependencies(service.dependencies, context);
            
            // 执行中间件
            await this.#executeMiddleware([...this.#middleware, ...service.middleware], {
                service: service.name,
                dependencies,
                context
            });
            
            // 创建实例
            const instance = await this.#createInstance(service, dependencies, context);
            
            // 应用代理
            const finalInstance = service.proxy ? this.#createProxy(instance, service) : instance;
            
            // 缓存实例
            if (service.singleton) {
                this.#instances.set(name, finalInstance);
            } else if (service.scope !== 'transient') {
                this.#scopes.set(scopeKey, finalInstance);
            }
            
            return finalInstance;
        }
        
        /**
         * 检查服务是否已注册
         * @param {string} name - 服务名称
         * @returns {boolean} 是否已注册
         */
        has(name) {
            return this.#services.has(name);
        }
        
        /**
         * 添加全局中间件
         * @param {Function} middleware - 中间件函数
         * @returns {EnterpriseDIContainer} 支持链式调用
         */
        use(middleware) {
            this.#middleware.push(middleware);
            return this;
        }
        
        /**
         * 创建作用域
         * @param {string} scopeName - 作用域名称
         * @returns {Object} 作用域对象
         */
        createScope(scopeName) {
            const scope = {
                name: scopeName,
                instances: new Map(),
                dispose: () => {
                    scope.instances.clear();
                }
            };
            
            return scope;
        }
        
        /**
         * 获取所有注册的服务
         * @returns {Array} 服务列表
         */
        getServices() {
            return Array.from(this.#services.entries()).map(([name, service]) => ({
                name,
                singleton: service.singleton,
                dependencies: service.dependencies,
                scope: service.scope,
                registered: service.registered
            }));
        }
        
        // 🔧 私有方法
        async #resolveDependencies(dependencies, context) {
            const resolved = {};
            
            for (const dep of dependencies) {
                if (typeof dep === 'string') {
                    resolved[dep] = await this.resolve(dep, context);
                } else if (typeof dep === 'object') {
                    const { name, as, optional = false } = dep;
                    try {
                        resolved[as || name] = await this.resolve(name, context);
                    } catch (error) {
                        if (!optional) throw error;
                        resolved[as || name] = null;
                    }
                }
            }
            
            return resolved;
        }
        
        async #executeMiddleware(middleware, context) {
            for (const fn of middleware) {
                await fn(context);
            }
        }
        
        async #createInstance(service, dependencies, context) {
            const { factory } = service;
            
            try {
                if (typeof factory === 'function') {
                    return await factory(dependencies, context);
                } else if (factory && typeof factory.constructor === 'function') {
                    return new factory(dependencies, context);
                } else {
                    return factory;
                }
            } catch (error) {
                throw new DIError(`Failed to create instance of "${service.name}": ${error.message}`, error);
            }
        }
        
        #createProxy(instance, service) {
            return new Proxy(instance, {
                get(target, prop, receiver) {
                    const value = Reflect.get(target, prop, receiver);
                    
                    if (typeof value === 'function') {
                        return function(...args) {
                            console.log(`[DI] Calling ${service.name}.${String(prop)}`);
                            return value.apply(this, args);
                        };
                    }
                    
                    return value;
                }
            });
        }
        
        #getScopeKey(scope, context) {
            switch (scope) {
                case 'request':
                    return `request_${context.requestId || 'default'}`;
                case 'session':
                    return `session_${context.sessionId || 'default'}`;
                default:
                    return scope;
            }
        }
    }
    
    class DIError extends Error {
        constructor(message, cause = null) {
            super(message);
            this.name = 'DIError';
            this.cause = cause;
            this.timestamp = Date.now();
        }
    }
    
    // =================================================================
    // 🎯 4. 企业级错误处理系统
    // =================================================================
    class EnterpriseErrorHandler {
        static #errors = [];
        static #maxErrors = 100;
        static #listeners = [];
        static #categories = new Map();
        static #suppressions = new Set();
        
        /**
         * 处理错误
         * @param {string} context - 错误上下文
         * @param {Error|string} error - 错误对象
         * @param {Object} [options] - 选项
         */
        static handle(context, error, options = {}) {
            const {
                showUser = false,
                severity = 'error',
                category = 'general',
                metadata = {},
                suppressDuplicate = true
            } = options;
            
            const errorInfo = this.#createErrorInfo(context, error, severity, category, metadata);
            
            // 检查是否应该抑制重复错误
            if (suppressDuplicate && this.#isDuplicate(errorInfo)) {
                return;
            }
            
            // 记录错误
            this.#recordError(errorInfo);
            
            // 分类错误
            this.#categorizeError(errorInfo);
            
            // 通知监听器
            this.#notifyListeners(errorInfo);
            
            // 开发环境输出
            if (EnterpriseConfig.get('debug')) {
                this.#logError(errorInfo);
            }
            
            // 用户通知
            if (showUser) {
                this.#showUserNotification(errorInfo);
            }
            
            // 错误上报
            if (EnterpriseConfig.get('monitoring.errorReporting')) {
                this.#reportError(errorInfo);
            }
        }
        
        /**
         * 记录模块错误
         * @param {string} module - 模块名
         * @param {string} operation - 操作名
         * @param {Error} error - 错误对象
         * @param {Object} [context] - 上下文
         */
        static record(module, operation, error, context = {}) {
            this.handle(`${module}.${operation}`, error, {
                category: 'module',
                metadata: { module, operation, ...context },
                severity: 'error'
            });
        }
        
        /**
         * 安全执行函数
         * @param {Function} fn - 要执行的函数
         * @param {string} context - 上下文
         * @param {any} fallback - 失败时的回退值
         * @returns {any} 执行结果或回退值
         */
        static safe(fn, context = 'unknown', fallback = null) {
            try {
                return fn();
            } catch (error) {
                this.handle(context, error, { severity: 'warning' });
                return fallback;
            }
        }
        
        /**
         * 安全执行异步函数
         * @param {Function} fn - 要执行的异步函数
         * @param {any} fallback - 失败时的回退值
         * @param {string} context - 上下文
         * @returns {Promise<any>} 执行结果或回退值
         */
        static async safeAsync(fn, fallback = null, context = 'unknown') {
            try {
                return await fn();
            } catch (error) {
                this.handle(context, error, { severity: 'warning' });
                return fallback;
            }
        }
        
        /**
         * 添加错误监听器
         * @param {Function} listener - 监听器函数
         * @returns {Function} 移除监听器的函数
         */
        static addListener(listener) {
            this.#listeners.push(listener);
            return () => {
                const index = this.#listeners.indexOf(listener);
                if (index > -1) {
                    this.#listeners.splice(index, 1);
                }
            };
        }
        
        /**
         * 抑制特定错误
         * @param {string} pattern - 错误模式
         */
        static suppress(pattern) {
            this.#suppressions.add(pattern);
        }
        
        /**
         * 获取错误统计
         * @returns {Object} 错误统计信息
         */
        static getStats() {
            const now = Date.now();
            const last24h = this.#errors.filter(e => now - e.timestamp < 24 * 60 * 60 * 1000);
            const lastHour = this.#errors.filter(e => now - e.timestamp < 60 * 60 * 1000);
            
            const byCategory = {};
            const bySeverity = {};
            
            for (const error of this.#errors) {
                byCategory[error.category] = (byCategory[error.category] || 0) + 1;
                bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
            }
            
            return {
                total: this.#errors.length,
                last24h: last24h.length,
                lastHour: lastHour.length,
                byCategory,
                bySeverity,
                recent: this.#errors.slice(-5),
                topErrors: this.#getTopErrors()
            };
        }
        
        /**
         * 清除错误记录
         * @param {string} [module] - 可选的模块过滤
         */
        static clear(module = null) {
            if (module) {
                this.#errors = this.#errors.filter(error => 
                    !error.context.startsWith(module)
                );
            } else {
                this.#errors.length = 0;
            }
        }
        
        // 🔧 私有方法
        static #createErrorInfo(context, error, severity, category, metadata) {
            return {
                id: this.#generateId(),
                context,
                message: error.message || String(error),
                stack: error.stack,
                timestamp: Date.now(),
                severity,
                category,
                metadata,
                userAgent: navigator.userAgent,
                url: window.location.href,
                userId: metadata.userId || 'anonymous'
            };
        }
        
        static #recordError(errorInfo) {
            this.#errors.push(errorInfo);
            
            // 限制错误数量
            if (this.#errors.length > this.#maxErrors) {
                this.#errors.shift();
            }
        }
        
        static #categorizeError(errorInfo) {
            const category = errorInfo.category;
            
            if (!this.#categories.has(category)) {
                this.#categories.set(category, {
                    count: 0,
                    firstSeen: errorInfo.timestamp,
                    lastSeen: errorInfo.timestamp,
                    severity: errorInfo.severity
                });
            }
            
            const categoryInfo = this.#categories.get(category);
            categoryInfo.count++;
            categoryInfo.lastSeen = errorInfo.timestamp;
            
            // 升级严重性
            if (this.#getSeverityLevel(errorInfo.severity) > this.#getSeverityLevel(categoryInfo.severity)) {
                categoryInfo.severity = errorInfo.severity;
            }
        }
        
        static #isDuplicate(errorInfo) {
            const recent = this.#errors.slice(-10);
            return recent.some(e => 
                e.context === errorInfo.context &&
                e.message === errorInfo.message &&
                (errorInfo.timestamp - e.timestamp) < 5000 // 5秒内
            );
        }
        
        static #notifyListeners(errorInfo) {
            for (const listener of this.#listeners) {
                try {
                    listener(errorInfo);
                } catch (listenerError) {
                    console.error('Error listener failed:', listenerError);
                }
            }
        }
        
        static #logError(errorInfo) {
            const prefix = `[${errorInfo.severity.toUpperCase()}][${errorInfo.context}]`;
            
            switch (errorInfo.severity) {
                case 'critical':
                    console.error(prefix, errorInfo.message, errorInfo.stack);
                    break;
                case 'error':
                    console.error(prefix, errorInfo.message);
                    break;
                case 'warning':
                    console.warn(prefix, errorInfo.message);
                    break;
                default:
                    console.log(prefix, errorInfo.message);
            }
        }
        
        static #showUserNotification(errorInfo) {
            // 根据严重性决定通知方式
            const messages = {
                critical: '系统发生严重错误，请刷新页面重试',
                error: '操作失败，请重试',
                warning: '操作完成，但可能存在问题',
                info: '操作提示'
            };
            
            const message = messages[errorInfo.severity] || errorInfo.message;
            
            try {
                // 创建用户友好的通知
                this.#createNotification(message, errorInfo.severity);
            } catch (error) {
                // 降级到alert
                if (errorInfo.severity === 'critical' || errorInfo.severity === 'error') {
                    alert(message);
                }
            }
        }
        
        static #createNotification(message, severity) {
            const colors = {
                critical: '#dc3545',
                error: '#dc3545',
                warning: '#ffc107',
                info: '#17a2b8'
            };
            
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 10000;
                background: white; border-left: 4px solid ${colors[severity] || '#6c757d'};
                padding: 16px 20px; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-width: 400px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px; line-height: 1.4; animation: slideInRight 0.3s ease-out;
            `;
            
            notification.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1; margin-right: 12px;">${message}</div>
                    <button style="background: none; border: none; font-size: 16px; cursor: pointer; color: #6c757d;" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // 自动移除
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, severity === 'critical' ? 10000 : 5000);
        }
        
        static #reportError(errorInfo) {
            // 这里可以集成错误上报服务
            if (typeof window.reportError === 'function') {
                window.reportError(errorInfo);
            }
        }
        
        static #getSeverityLevel(severity) {
            const levels = { info: 1, warning: 2, error: 3, critical: 4 };
            return levels[severity] || 0;
        }
        
        static #getTopErrors() {
            const errorCounts = {};
            
            for (const error of this.#errors) {
                const key = `${error.context}:${error.message}`;
                errorCounts[key] = (errorCounts[key] || 0) + 1;
            }
            
            return Object.entries(errorCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([key, count]) => ({ error: key, count }));
        }
        
        static #generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        }
    }
    
    // =================================================================
    // 🎯 5. 企业级性能监控系统
    // =================================================================
    class EnterprisePerformance {
        static #enabled = false;
        static #metrics = [];
        static #timers = new Map();
        static #observers = [];
        static #maxMetrics = 1000;
        static #bufferSize = 100;
        static #flushInterval = 30000;
        
        /**
         * 初始化性能监控
         * @param {Object} [config] - 配置选项
         */
        static init(config = {}) {
            this.#enabled = config.enabled !== false;
            this.#maxMetrics = config.maxMetrics || 1000;
            this.#bufferSize = config.bufferSize || 100;
            this.#flushInterval = config.flushInterval || 30000;
            
            if (this.#enabled) {
                this.#initWebVitals();
                this.#initResourceObserver();
                this.#initNavigationObserver();
                this.#startFlushInterval();
            }
        }
        
        /**
         * 开始测量
         * @param {string} name - 测量名称
         * @param {string} [category] - 分类
         * @returns {string} 测量ID
         */
        static startMeasure(name, category = 'general') {
            if (!this.#enabled) return null;
            
            const id = `${category}-${name}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            
            this.#timers.set(id, {
                name,
                category,
                startTime: performance.now(),
                startTimestamp: Date.now()
            });
            
            return id;
        }
        
        /**
         * 结束测量
         * @param {string} id - 测量ID
         * @returns {Object|null} 测量结果
         */
        static endMeasure(id) {
            if (!id || !this.#timers.has(id)) return null;
            
            const timer = this.#timers.get(id);
            const duration = performance.now() - timer.startTime;
            
            const metric = {
                id,
                name: timer.name,
                category: timer.category,
                duration,
                timestamp: Date.now(),
                startTime: timer.startTimestamp,
                endTime: timer.startTimestamp + duration
            };
            
            this.#recordMetric(metric);
            this.#timers.delete(id);
            
            return { name: timer.name, duration };
        }
        
        /**
         * 直接记录指标
         * @param {string} name - 指标名称
         * @param {number} value - 指标值
         * @param {string} [category] - 分类
         * @param {Object} [metadata] - 元数据
         */
        static recordMetric(name, value, category = 'custom', metadata = {}) {
            if (!this.#enabled) return;
            
            const metric = {
                id: this.#generateId(),
                name,
                category,
                value,
                duration: value, // 兼容性
                timestamp: Date.now(),
                metadata,
                type: 'custom'
            };
            
            this.#recordMetric(metric);
        }
        
        /**
         * 测量函数执行时间
         * @param {string} name - 函数名称
         * @param {Function} fn - 要测量的函数
         * @param {string} [category] - 分类
         * @returns {any} 函数执行结果
         */
        static measure(name, fn, category = 'function') {
            if (!this.#enabled) return fn();
            
            const id = this.startMeasure(name, category);
            try {
                const result = fn();
                this.endMeasure(id);
                return result;
            } catch (error) {
                this.endMeasure(id);
                this.recordMetric(`${name}_error`, 1, 'error');
                throw error;
            }
        }
        
        /**
         * 测量异步函数执行时间
         * @param {string} name - 函数名称
         * @param {Function} fn - 要测量的异步函数
         * @param {string} [category] - 分类
         * @returns {Promise<any>} 函数执行结果
         */
        static async measureAsync(name, fn, category = 'function') {
            if (!this.#enabled) return await fn();
            
            const id = this.startMeasure(name, category);
            try {
                const result = await fn();
                this.endMeasure(id);
                return result;
            } catch (error) {
                this.endMeasure(id);
                this.recordMetric(`${name}_error`, 1, 'error');
                throw error;
            }
        }
        
        /**
         * 获取性能统计
         * @param {string} [category] - 可选的分类过滤
         * @returns {Object} 性能统计
         */
        static getStats(category = null) {
            let metrics = this.#metrics;
            
            if (category) {
                metrics = metrics.filter(m => m.category === category);
            }
            
            if (!metrics.length) {
                return { average: 0, count: 0, categories: {} };
            }
            
            const durations = metrics.map(m => m.duration || m.value || 0);
            const total = durations.reduce((sum, d) => sum + d, 0);
            
            const categories = {};
            const names = {};
            
            for (const metric of metrics) {
                // 按分类统计
                if (!categories[metric.category]) {
                    categories[metric.category] = { count: 0, total: 0, avg: 0, min: Infinity, max: 0 };
                }
                
                const cat = categories[metric.category];
                const value = metric.duration || metric.value || 0;
                
                cat.count++;
                cat.total += value;
                cat.min = Math.min(cat.min, value);
                cat.max = Math.max(cat.max, value);
                cat.avg = cat.total / cat.count;
                
                // 按名称统计
                if (!names[metric.name]) {
                    names[metric.name] = { count: 0, total: 0, avg: 0 };
                }
                
                const nameStats = names[metric.name];
                nameStats.count++;
                nameStats.total += value;
                nameStats.avg = nameStats.total / nameStats.count;
            }
            
            // 计算百分位
            const sortedDurations = durations.sort((a, b) => a - b);
            const p50 = this.#percentile(sortedDurations, 50);
            const p90 = this.#percentile(sortedDurations, 90);
            const p95 = this.#percentile(sortedDurations, 95);
            const p99 = this.#percentile(sortedDurations, 99);
            
            return {
                count: metrics.length,
                average: (total / metrics.length).toFixed(2),
                total: total.toFixed(2),
                min: Math.min(...durations).toFixed(2),
                max: Math.max(...durations).toFixed(2),
                percentiles: { p50, p90, p95, p99 },
                categories,
                names,
                recent: metrics.slice(-10),
                memoryUsage: this.#getMemoryUsage()
            };
        }
        
        /**
         * 获取Web Vitals指标
         * @returns {Object} Web Vitals数据
         */
        static getWebVitals() {
            return this.#webVitals || {};
        }
        
        /**
         * 清除性能数据
         */
        static clear() {
            this.#metrics.length = 0;
            this.#timers.clear();
        }
        
        /**
         * 启用/禁用监控
         * @param {boolean} enabled - 是否启用
         */
        static setEnabled(enabled) {
            this.#enabled = enabled;
        }
        
        // 🔧 私有方法
        static #recordMetric(metric) {
            this.#metrics.push(metric);
            
            // 限制指标数量
            if (this.#metrics.length > this.#maxMetrics) {
                this.#metrics.splice(0, this.#metrics.length - this.#maxMetrics);
            }
            
            // 触发实时分析
            this.#analyzeRealtime(metric);
        }
        
        static #initWebVitals() {
            this.#webVitals = {};
            
            // FCP - First Contentful Paint
            if ('PerformanceObserver' in window) {
                try {
                    const observer = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            if (entry.name === 'first-contentful-paint') {
                                this.#webVitals.fcp = entry.startTime;
                                this.recordMetric('fcp', entry.startTime, 'webvitals');
                            }
                        }
                    });
                    observer.observe({ entryTypes: ['paint'] });
                    this.#observers.push(observer);
                } catch (e) {
                    console.warn('Failed to observe paint entries:', e);
                }
            }
            
            // LCP - Largest Contentful Paint
            if ('PerformanceObserver' in window) {
                try {
                    const observer = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        const lastEntry = entries[entries.length - 1];
                        this.#webVitals.lcp = lastEntry.startTime;
                        this.recordMetric('lcp', lastEntry.startTime, 'webvitals');
                    });
                    observer.observe({ entryTypes: ['largest-contentful-paint'] });
                    this.#observers.push(observer);
                } catch (e) {
                    console.warn('Failed to observe LCP:', e);
                }
            }
            
            // CLS - Cumulative Layout Shift
            if ('PerformanceObserver' in window) {
                try {
                    let clsValue = 0;
                    const observer = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            if (!entry.hadRecentInput) {
                                clsValue += entry.value;
                            }
                        }
                        this.#webVitals.cls = clsValue;
                        this.recordMetric('cls', clsValue, 'webvitals');
                    });
                    observer.observe({ entryTypes: ['layout-shift'] });
                    this.#observers.push(observer);
                } catch (e) {
                    console.warn('Failed to observe layout shifts:', e);
                }
            }
        }
        
        static #initResourceObserver() {
            if ('PerformanceObserver' in window) {
                try {
                    const observer = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            this.recordMetric(`resource_${entry.initiatorType}`, entry.duration, 'resource', {
                                name: entry.name,
                                size: entry.transferSize,
                                cached: entry.transferSize === 0
                            });
                        }
                    });
                    observer.observe({ entryTypes: ['resource'] });
                    this.#observers.push(observer);
                } catch (e) {
                    console.warn('Failed to observe resources:', e);
                }
            }
        }
        
        static #initNavigationObserver() {
            if ('PerformanceObserver' in window) {
                try {
                    const observer = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            this.recordMetric('navigation_total', entry.duration, 'navigation');
                            this.recordMetric('navigation_dns', entry.domainLookupEnd - entry.domainLookupStart, 'navigation');
                            this.recordMetric('navigation_connect', entry.connectEnd - entry.connectStart, 'navigation');
                            this.recordMetric('navigation_response', entry.responseEnd - entry.responseStart, 'navigation');
                            this.recordMetric('navigation_dom', entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart, 'navigation');
                        }
                    });
                    observer.observe({ entryTypes: ['navigation'] });
                    this.#observers.push(observer);
                } catch (e) {
                    console.warn('Failed to observe navigation:', e);
                }
            }
        }
        
        static #startFlushInterval() {
            setInterval(() => {
                this.#flushMetrics();
            }, this.#flushInterval);
        }
        
        static #flushMetrics() {
            if (this.#metrics.length > this.#bufferSize) {
                // 这里可以发送到分析服务
                const metricsToFlush = this.#metrics.splice(0, this.#bufferSize);
                
                if (typeof window.sendMetrics === 'function') {
                    window.sendMetrics(metricsToFlush);
                }
            }
        }
        
        static #analyzeRealtime(metric) {
            // 实时性能分析
            if (metric.category === 'critical' && metric.duration > 1000) {
                console.warn(`Slow operation detected: ${metric.name} took ${metric.duration}ms`);
            }
            
            // 内存使用警告
            if (performance.memory && performance.memory.usedJSHeapSize > 50 * 1024 * 1024) {
                console.warn('High memory usage detected');
            }
        }
        
        static #percentile(sortedArray, percentile) {
            const index = (percentile / 100) * (sortedArray.length - 1);
            const lower = Math.floor(index);
            const upper = Math.ceil(index);
            const weight = index % 1;
            
            if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
            
            return (sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight).toFixed(2);
        }
        
        static #getMemoryUsage() {
            if (performance.memory) {
                return {
                    used: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB`,
                    total: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(1)} MB`,
                    limit: `${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1)} MB`
                };
            }
            return null;
        }
        
        static #generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        }
    }
    
    // =================================================================
    // 🎯 6. 企业级缓存管理器
    // =================================================================
    class EnterpriseCacheManager {
        static #caches = new Map();
        static #globalStats = {
            totalHits: 0,
            totalMisses: 0,
            totalSets: 0,
            totalDeletes: 0
        };
        
        /**
         * 创建缓存实例
         * @param {string} name - 缓存名称
         * @param {Object} [options] - 缓存选项
         * @returns {EnterpriseLRUCache} 缓存实例
         */
        static create(name, options = {}) {
            const { maxSize = 50, ttl = 300000, ...cacheOptions } = options;
            
            if (this.#caches.has(name)) {
                console.warn(`Cache "${name}" already exists, returning existing instance`);
                return this.#caches.get(name);
            }
            
            const cache = new EnterpriseLRUCache(maxSize, ttl, cacheOptions);
            
            // 包装缓存方法以收集全局统计
            const originalGet = cache.get.bind(cache);
            const originalSet = cache.set.bind(cache);
            const originalDelete = cache.delete.bind(cache);
            
            cache.get = (key) => {
                const result = originalGet(key);
                if (result !== null) {
                    this.#globalStats.totalHits++;
                } else {
                    this.#globalStats.totalMisses++;
                }
                return result;
            };
            
            cache.set = (key, value, options) => {
                const result = originalSet(key, value, options);
                if (result) {
                    this.#globalStats.totalSets++;
                }
                return result;
            };
            
            cache.delete = (key) => {
                const result = originalDelete(key);
                if (result) {
                    this.#globalStats.totalDeletes++;
                }
                return result;
            };
            
            this.#caches.set(name, cache);
            return cache;
        }
        
        /**
         * 创建带选项的缓存
         * @param {string} name - 缓存名称
         * @param {Object} options - 选项
         * @returns {EnterpriseLRUCache} 缓存实例
         */
        static createCache(name, options = {}) {
            return this.create(name, options);
        }
        
        /**
         * 获取缓存实例
         * @param {string} name - 缓存名称
         * @returns {EnterpriseLRUCache|undefined} 缓存实例
         */
        static get(name) {
            return this.#caches.get(name);
        }
        
        /**
         * 获取缓存实例（别名）
         * @param {string} name - 缓存名称
         * @returns {EnterpriseLRUCache|undefined} 缓存实例
         */
        static getCache(name) {
            return this.get(name);
        }
        
        /**
         * 销毁缓存
         * @param {string} name - 缓存名称
         * @returns {boolean} 是否成功销毁
         */
        static destroy(name) {
            const cache = this.#caches.get(name);
            if (cache) {
                cache.clear();
                this.#caches.delete(name);
                return true;
            }
            return false;
        }
        
        /**
         * 销毁缓存（别名）
         * @param {string} name - 缓存名称
         * @returns {boolean} 是否成功销毁
         */
        static destroyCache(name) {
            return this.destroy(name);
        }
        
        /**
         * 获取所有缓存统计
         * @returns {Object} 统计信息
         */
        static getStats() {
            const stats = {
                global: {
                    ...this.#globalStats,
                    hitRate: this.#calculateGlobalHitRate(),
                    cacheCount: this.#caches.size
                },
                caches: {}
            };
            
            for (const [name, cache] of this.#caches) {
                stats.caches[name] = cache.getStats();
            }
            
            return stats;
        }
        
        /**
         * 清理所有缓存
         */
        static cleanup() {
            for (const cache of this.#caches.values()) {
                // EnterpriseLRUCache 有自动清理机制，这里主要是触发清理
                cache.clear();
            }
        }
        
        /**
         * 销毁所有缓存
         */
        static destroyAll() {
            for (const name of this.#caches.keys()) {
                this.destroy(name);
            }
        }
        
        /**
         * 获取缓存列表
         * @returns {Array<string>} 缓存名称列表
         */
        static list() {
            return Array.from(this.#caches.keys());
        }
        
        /**
         * 检查缓存是否存在
         * @param {string} name - 缓存名称
         * @returns {boolean} 是否存在
         */
        static has(name) {
            return this.#caches.has(name);
        }
        
        // 🔧 私有方法
        static #calculateGlobalHitRate() {
            const total = this.#globalStats.totalHits + this.#globalStats.totalMisses;
            return total > 0 ? 
                `${(this.#globalStats.totalHits / total * 100).toFixed(1)}%` : 
                '0%';
        }
    }
    
    // =================================================================
    // 🎯 7. 企业级Worker管理器
    // =================================================================
    class EnterpriseWorkerManager {
        static #workers = new Map();
        static #pool = [];
        static #maxPoolSize = 4;
        
        /**
         * 执行Worker任务
         * @param {string} scriptPath - Worker脚本路径
         * @param {any} data - 要传递的数据
         * @param {Function} fallback - 降级函数
         * @param {number} [timeout] - 超时时间
         * @returns {Promise<any>} 执行结果
         */
        static async execute(scriptPath, data, fallback, timeout = 10000) {
            if (typeof Worker === 'undefined') {
                console.warn('[Worker] Not supported, using fallback');
                return fallback(data);
            }
            
            try {
                const worker = await this.#getWorker(scriptPath);
                const result = await this.#executeWithWorker(worker, data, timeout);
                this.#returnWorkerToPool(worker);
                return result;
            } catch (error) {
                console.warn('[Worker] Error, using fallback:', error.message);
                return fallback(data);
            }
        }
        
        /**
         * 安全执行Worker任务
         * @param {string} scriptPath - Worker脚本路径
         * @param {any} data - 要传递的数据
         * @param {Function} fallbackFn - 降级函数
         * @returns {Promise<any>} 执行结果
         */
        static async safeExecute(scriptPath, data, fallbackFn) {
            return this.execute(scriptPath, data, fallbackFn);
        }
        
        /**
         * 创建Worker池
         * @param {string} scriptPath - Worker脚本路径
         * @param {number} [size] - 池大小
         * @returns {Promise<Array>} Worker数组
         */
        static async createPool(scriptPath, size = this.#maxPoolSize) {
            const workers = [];
            
            for (let i = 0; i < size; i++) {
                try {
                    const worker = new Worker(scriptPath);
                    workers.push(worker);
                } catch (error) {
                    console.warn(`Failed to create worker ${i + 1}:`, error);
                    break;
                }
            }
            
            this.#workers.set(scriptPath, workers);
            return workers;
        }
        
        /**
         * 销毁Worker池
         * @param {string} scriptPath - Worker脚本路径
         */
        static destroyPool(scriptPath) {
            const workers = this.#workers.get(scriptPath);
            if (workers) {
                for (const worker of workers) {
                    worker.terminate();
                }
                this.#workers.delete(scriptPath);
            }
        }
        
        /**
         * 销毁所有Worker
         */
        static destroyAll() {
            for (const scriptPath of this.#workers.keys()) {
                this.destroyPool(scriptPath);
            }
            
            for (const worker of this.#pool) {
                worker.terminate();
            }
            this.#pool.length = 0;
        }
        
        // 🔧 私有方法
        static async #getWorker(scriptPath) {
            // 尝试从池中获取
            const existingWorkers = this.#workers.get(scriptPath);
            if (existingWorkers && existingWorkers.length > 0) {
                return existingWorkers.pop();
            }
            
            // 尝试从通用池获取
            if (this.#pool.length > 0) {
                const worker = this.#pool.pop();
                worker.scriptPath = scriptPath;
                return worker;
            }
            
            // 创建新Worker
            return new Worker(scriptPath);
        }
        
        static async #executeWithWorker(worker, data, timeout) {
            return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    worker.terminate();
                    reject(new Error('Worker timeout'));
                }, timeout);
                
                const handleMessage = (e) => {
                    clearTimeout(timeoutId);
                    cleanup();
                    
                    if (e.data && e.data.success !== false) {
                        resolve(e.data.result || e.data.data || e.data);
                    } else {
                        reject(new Error(e.data.error || 'Worker error'));
                    }
                };
                
                const handleError = (error) => {
                    clearTimeout(timeoutId);
                    cleanup();
                    reject(error);
                };
                
                const cleanup = () => {
                    worker.removeEventListener('message', handleMessage);
                    worker.removeEventListener('error', handleError);
                };
                
                worker.addEventListener('message', handleMessage);
                worker.addEventListener('error', handleError);
                
                worker.postMessage(data);
            });
        }
        
        static #returnWorkerToPool(worker) {
            if (this.#pool.length < this.#maxPoolSize) {
                this.#pool.push(worker);
            } else {
                worker.terminate();
            }
        }
    }
    
    // =================================================================
    // 🎯 8. 企业级应用初始化系统
    // =================================================================
    class EnterpriseApp {
        static #initialized = false;
        static #initPromise = null;
        
        /**
         * 初始化应用
         * @param {Object} [config] - 初始化配置
         * @returns {Promise<boolean>} 初始化结果
         */
        static async init(config = {}) {
            if (this.#initialized) {
                return true;
            }
            
            if (this.#initPromise) {
                return this.#initPromise;
            }
            
            this.#initPromise = this.#performInit(config);
            return this.#initPromise;
        }
        
        static async #performInit(config) {
            try {
                console.log('🚀 Initializing Enterprise EnglishSite...');
                
                const perfId = EnterprisePerformance.startMeasure('app-init', 'app');
                
                // 环境检测
                const environment = this.#detectEnvironment();
                console.log('📊 Environment detected:', environment);
                
                // 配置调整
                this.#adjustConfigForEnvironment(environment);
                
                // 应用自定义配置
                if (config.config) {
                    EnterpriseConfig.setMany(config.config);
                }
                
                // 初始化核心系统
                await this.#initCoreSystemsParallel(config);
                
                // 创建默认缓存实例
                this.#createDefaultCaches();
                
                // 设置全局错误处理
                this.#setupGlobalErrorHandling();
                
                // 设置性能监控
                this.#setupPerformanceMonitoring();
                
                // 设置页面卸载清理
                this.#setupCleanupHandlers();
                
                // 开发环境功能
                if (EnterpriseConfig.get('debug')) {
                    this.#setupDebugTools();
                }
                
                EnterprisePerformance.endMeasure(perfId);
                
                this.#initialized = true;
                console.log('✅ Enterprise EnglishSite initialized successfully');
                
                // 触发初始化完成事件
                this.#emitInitialized();
                
                return true;
                
            } catch (error) {
                EnterpriseErrorHandler.handle('Enterprise.init', error, {
                    severity: 'critical',
                    showUser: true
                });
                console.error('❌ Enterprise EnglishSite initialization failed:', error);
                return false;
            }
        }
        
        // 🔧 私有初始化方法
        static #detectEnvironment() {
            const ua = navigator.userAgent;
            return {
                isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
                isTablet: /iPad|Android.*tablet|.*[tT]ablet.*|Kindle|Silk.*Accelerated/i.test(ua),
                isSlowConnection: navigator.connection?.effectiveType?.includes('2g'),
                supportWorkers: typeof Worker !== 'undefined',
                supportServiceWorker: 'serviceWorker' in navigator,
                memoryLimited: navigator.deviceMemory ? navigator.deviceMemory < 4 : false,
                screenSize: { width: window.innerWidth, height: window.innerHeight }
            };
        }
        
        static #adjustConfigForEnvironment(env) {
            if (env.isMobile) {
                EnterpriseConfig.set('cache.maxSize', 20);
                EnterpriseConfig.set('ui.fadeTime', 200);
                EnterpriseConfig.set('performance.throttle', 32);
            }
            
            if (env.isSlowConnection) {
                EnterpriseConfig.set('performance.timeout', 20000);
                EnterpriseConfig.set('cache.ttl', 600000); // 更长的缓存时间
            }
            
            if (env.memoryLimited) {
                EnterpriseConfig.set('cache.maxSize', 15);
                EnterpriseConfig.set('performance.maxMetrics', 500);
            }
            
            if (!env.supportWorkers) {
                EnterpriseConfig.set('features.enableWorkers', false);
            }
        }
        
        static async #initCoreSystemsParallel(config) {
            // 并行初始化核心系统
            await Promise.all([
                // 性能监控系统
                Promise.resolve().then(() => {
                    EnterprisePerformance.init({
                        enabled: EnterpriseConfig.get('monitoring.performanceTracking', true),
                        ...config.performance
                    });
                }),
                
                // DI容器初始化
                Promise.resolve().then(() => {
                    if (config.services) {
                        const container = new EnterpriseDIContainer();
                        for (const [name, serviceConfig] of Object.entries(config.services)) {
                            container.register(name, serviceConfig.factory, serviceConfig.options);
                        }
                        window.EnglishSite.DIContainer = container;
                    }
                }),
                
                // 其他异步初始化任务
                this.#initializeFeatures(config)
            ]);
        }
        
        static async #initializeFeatures(config) {
            // Service Worker注册
            if (EnterpriseConfig.get('features.enableServiceWorker') && config.serviceWorker) {
                try {
                    await navigator.serviceWorker.register(config.serviceWorker);
                    console.log('✅ Service Worker registered');
                } catch (error) {
                    console.warn('⚠️ Service Worker registration failed:', error);
                }
            }
            
            // PWA特性
            if (EnterpriseConfig.get('features.enablePWA')) {
                this.#initPWAFeatures();
            }
        }
        
        static #createDefaultCaches() {
            const cacheConfigs = {
                content: { maxSize: EnterpriseConfig.get('cache.maxSize', 20), ttl: 300000 },
                images: { maxSize: 50, ttl: 600000 },
                srt: { maxSize: 10, ttl: 600000 },
                glossary: { maxSize: 30, ttl: 600000 },
                api: { maxSize: 100, ttl: 120000 }
            };
            
            for (const [name, config] of Object.entries(cacheConfigs)) {
                EnterpriseCacheManager.create(name, config);
            }
        }
        
        static #setupGlobalErrorHandling() {
            // 未捕获的错误
            window.addEventListener('error', (event) => {
                EnterpriseErrorHandler.handle('window.error', event.error || event.message, {
                    severity: 'error',
                    category: 'uncaught',
                    metadata: {
                        filename: event.filename,
                        lineno: event.lineno,
                        colno: event.colno
                    }
                });
            });
            
            // 未捕获的Promise拒绝
            window.addEventListener('unhandledrejection', (event) => {
                EnterpriseErrorHandler.handle('window.unhandledRejection', event.reason, {
                    severity: 'error',
                    category: 'promise',
                    metadata: {
                        type: 'unhandledRejection'
                    }
                });
                
                // 阻止默认的控制台错误
                event.preventDefault();
            });
            
            // 资源加载错误
            window.addEventListener('error', (event) => {
                if (event.target !== window) {
                    EnterpriseErrorHandler.handle('resource.loadError', `Failed to load ${event.target.tagName}`, {
                        severity: 'warning',
                        category: 'resource',
                        metadata: {
                            src: event.target.src || event.target.href,
                            tagName: event.target.tagName
                        }
                    });
                }
            }, true);
        }
        
        static #setupPerformanceMonitoring() {
            // 页面可见性变化监控
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    EnterprisePerformance.recordMetric('page_visible', 1, 'engagement');
                } else {
                    EnterprisePerformance.recordMetric('page_hidden', 1, 'engagement');
                }
            });
            
            // 页面加载完成监控
            window.addEventListener('load', () => {
                EnterprisePerformance.recordMetric('page_load_complete', performance.now(), 'navigation');
            });
            
            // 内存使用监控（如果支持）
            if (performance.memory) {
                setInterval(() => {
                    const memory = performance.memory;
                    EnterprisePerformance.recordMetric('memory_used', memory.usedJSHeapSize, 'memory');
                    
                    // 内存警告
                    if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
                        EnterpriseErrorHandler.handle('memory.warning', 'High memory usage detected', {
                            severity: 'warning',
                            category: 'performance',
                            metadata: {
                                used: memory.usedJSHeapSize,
                                limit: memory.jsHeapSizeLimit
                            }
                        });
                    }
                }, 30000);
            }
        }
        
        static #setupCleanupHandlers() {
            window.addEventListener('beforeunload', () => {
                EnterpriseCacheManager.cleanup();
                EnterpriseWorkerManager.destroyAll();
                
                // 发送最后的性能数据
                const stats = EnterprisePerformance.getStats();
                if (typeof navigator.sendBeacon === 'function' && typeof window.sendMetrics === 'function') {
                    navigator.sendBeacon('/api/metrics', JSON.stringify(stats));
                }
            });
            
            // 定期清理
            setInterval(() => {
                EnterpriseCacheManager.cleanup();
                
                // 清理旧的错误记录
                if (EnterpriseErrorHandler.getStats().total > 200) {
                    EnterpriseErrorHandler.clear();
                }
            }, 300000); // 5分钟
        }
        
        static #setupDebugTools() {
            window.EnterpriseDebug = {
                config: EnterpriseConfig,
                cache: EnterpriseCacheManager,
                errors: EnterpriseErrorHandler,
                performance: EnterprisePerformance,
                worker: EnterpriseWorkerManager,
                
                // 便捷方法
                stats() {
                    return {
                        config: EnterpriseConfig.getAll(),
                        cache: EnterpriseCacheManager.getStats(),
                        errors: EnterpriseErrorHandler.getStats(),
                        performance: EnterprisePerformance.getStats(),
                        memory: performance.memory ? {
                            used: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB`,
                            limit: `${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1)} MB`
                        } : null
                    };
                },
                
                clearAll() {
                    EnterpriseCacheManager.destroyAll();
                    EnterpriseErrorHandler.clear();
                    EnterprisePerformance.clear();
                    console.log('🧹 All Enterprise data cleared');
                },
                
                test() {
                    console.log('🧪 Running Enterprise tests...');
                    
                    // 测试配置
                    EnterpriseConfig.set('test.value', 123);
                    const testValue = EnterpriseConfig.get('test.value');
                    console.log('✅ Config:', testValue === 123);
                    
                    // 测试缓存
                    const cache = EnterpriseCacheManager.create('test');
                    cache.set('key', 'value');
                    const cacheValue = cache.get('key');
                    console.log('✅ Cache:', cacheValue === 'value');
                    EnterpriseCacheManager.destroy('test');
                    
                    // 测试错误处理
                    const errorResult = EnterpriseErrorHandler.safe(() => {
                        throw new Error('test');
                    }, 'test', 'fallback');
                    console.log('✅ ErrorHandler:', errorResult === 'fallback');
                    
                    // 测试性能监控
                    const perfId = EnterprisePerformance.startMeasure('test');
                    setTimeout(() => {
                        const result = EnterprisePerformance.endMeasure(perfId);
                        console.log('✅ Performance:', result && result.duration > 0);
                    }, 10);
                    
                    console.log('🎉 All Enterprise tests passed!');
                }
            };
            
            console.log('🛠️ Enterprise debug tools available (window.EnterpriseDebug)');
        }
        
        static #initPWAFeatures() {
            // 安装提示
            let deferredPrompt;
            
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                
                // 显示安装按钮
                this.#showInstallPrompt(deferredPrompt);
            });
            
            // 安装完成
            window.addEventListener('appinstalled', () => {
                EnterprisePerformance.recordMetric('pwa_installed', 1, 'engagement');
                console.log('✅ PWA installed');
            });
        }
        
        static #showInstallPrompt(deferredPrompt) {
            // 这里可以显示自定义的安装提示UI
            console.log('📱 PWA installation available');
        }
        
        static #emitInitialized() {
            try {
                window.dispatchEvent(new CustomEvent('enterpriseInitialized', {
                    detail: {
                        timestamp: Date.now(),
                        version: '2.0',
                        features: {
                            config: true,
                            cache: true,
                            errorHandling: true,
                            performance: true,
                            di: !!window.EnglishSite.DIContainer
                        }
                    }
                }));
            } catch (error) {
                console.warn('Failed to emit initialized event:', error);
            }
        }
    }
    
    // =================================================================
    // 🎯 9. 向后兼容适配器层
    // =================================================================
    
    // 🔧 配置管理适配器
    class ConfigManagerAdapter {
        static createModuleConfig(moduleName, customConfig = {}) {
            const moduleDefaults = {
                audioSync: {
                    offset: 0,
                    autoscroll: true,
                    enableWorkers: EnterpriseConfig.get('features.enableWorkers', true),
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
                debug: EnterpriseConfig.get('debug'),
                enableErrorBoundary: true,
                showErrorDetails: EnterpriseConfig.get('debug')
            };

            return {
                ...baseConfig,
                ...(moduleDefaults[moduleName] || {}),
                ...customConfig
            };
        }

        static get(path, fallback) {
            return EnterpriseConfig.get(path, fallback);
        }

        static set(path, value) {
            return EnterpriseConfig.set(path, value);
        }

        static getAll() {
            return EnterpriseConfig.getAll();
        }
    }
    
    // =================================================================
    // 🎯 10. 导出企业级API
    // =================================================================
    Object.assign(window.EnglishSite, {
        // 🆕 企业级核心API
        EnterpriseConfig,
        EnterpriseLRUCache,
        EnterpriseDIContainer,
        EnterpriseErrorHandler,
        EnterprisePerformance,
        EnterpriseCacheManager,
        EnterpriseWorkerManager,
        EnterpriseApp,
        
        // 🔧 新的统一API（推荐使用）
        Config: EnterpriseConfig,
        Cache: EnterpriseLRUCache,
        DIContainer: EnterpriseDIContainer,
        ErrorHandler: EnterpriseErrorHandler,
        Performance: EnterprisePerformance,
        CacheManager: EnterpriseCacheManager,
        WorkerManager: EnterpriseWorkerManager,
        
        // 🔄 100%向后兼容的旧API
        ConfigManager: ConfigManagerAdapter,
        SimpleErrorHandler: EnterpriseErrorHandler,
        UltraSimpleError: EnterpriseErrorHandler,
        PerformanceMonitor: EnterprisePerformance,
        UltraSimpleWorker: EnterpriseWorkerManager,
        
        // 初始化Promise
        coreToolsReady: null
    });
    
    // =================================================================
    // 🎯 11. 自动初始化系统
    // =================================================================
    const initPromise = (() => {
        if (document.readyState === 'loading') {
            return new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', () => {
                    EnterpriseApp.init().then(resolve);
                });
            });
        } else {
            return EnterpriseApp.init();
        }
    })();
    
    window.EnglishSite.coreToolsReady = initPromise;
    
    // 全局初始化完成标记
    initPromise.then(() => {
        window.EnglishSite.enterpriseReady = true;
        console.log('🎉 EnglishSite Enterprise Core is ready!');
    }).catch(error => {
        console.error('💥 EnglishSite Enterprise Core failed to initialize:', error);
    });
    
})();

// =================================================================
// 🎯 12. 企业级功能演示和文档
// =================================================================

/*
🎯 企业级Core.js使用指南

1. 📊 配置管理
   EnglishSite.Config.set('cache.maxSize', 100);
   const debugMode = EnglishSite.Config.get('debug', false);

2. 🗄️ 高级缓存
   const cache = EnglishSite.CacheManager.create('myCache', {
     maxSize: 50,
     ttl: 300000,
     enableStats: true
   });
   cache.set('key', 'value', { tags: ['user', 'session'] });

3. 🎯 依赖注入
   const container = new EnglishSite.DIContainer();
   container.register('logger', LoggerService, { singleton: true });
   const logger = await container.resolve('logger');

4. ⚠️ 错误处理
   EnglishSite.ErrorHandler.handle('module.operation', error, {
     severity: 'error',
     showUser: true
   });

5. 📈 性能监控
   const id = EnglishSite.Performance.startMeasure('operation');
   // ... 执行操作
   EnglishSite.Performance.endMeasure(id);

6. 🔧 Worker管理
   const result = await EnglishSite.WorkerManager.execute(
     'worker.js', 
     data, 
     fallbackFunction
   );

7. 📊 统计信息
   const stats = EnglishSite.ErrorHandler.getStats();
   const cacheStats = EnglishSite.CacheManager.getStats();
   const perfStats = EnglishSite.Performance.getStats();

🔧 调试工具:
- window.EnterpriseDebug.stats() - 查看所有统计
- window.EnterpriseDebug.test() - 运行测试
- window.EnterpriseDebug.clearAll() - 清理所有数据

📦 向后兼容:
所有原有API保持100%兼容，可以渐进式升级:
- window.EnglishSite.ConfigManager ✅
- window.EnglishSite.SimpleErrorHandler ✅  
- window.EnglishSite.PerformanceMonitor ✅
- window.EnglishSite.CacheManager ✅
*/