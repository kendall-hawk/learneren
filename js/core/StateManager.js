// js/core/StateManager.js - 轻量级状态管理器
// 🎯 目标：解决全局变量混乱，提供统一状态管理
// 🛡️ 兼容：100%保持现有API可用

(function() {
    'use strict';
    
    /**
     * 🎯 轻量级状态管理器
     * 特点：类Redux架构 + 发布订阅 + 模块化 + 持久化
     */
    class StateManager {
        constructor() {
            // 🏗️ 核心状态树
            this.state = {
                // 应用级状态
                app: {
                    isInitialized: false,
                    currentView: null,
                    loading: {},
                    errors: {},
                    config: {}
                },
                
                // 模块状态
                modules: {
                    navigation: {
                        isOpen: false,
                        currentPath: [],
                        chaptersMap: null,
                        instance: null
                    },
                    wordFreq: {
                        manager: null,
                        ui: null,
                        isInitialized: false,
                        error: null
                    },
                    audioSync: {
                        instance: null,
                        isPlaying: false,
                        currentTime: 0
                    },
                    glossary: {
                        instance: null,
                        isVisible: false,
                        activeWord: null
                    }
                },
                
                // 用户偏好
                preferences: {
                    theme: 'light',
                    language: 'en',
                    autoplay: true,
                    volume: 1.0
                },
                
                // 缓存和临时数据
                cache: {
                    navigation: null,
                    chapters: {},
                    glossary: {}
                }
            };
            
            // 🔔 订阅系统
            this.subscribers = new Map();
            this.moduleSubscribers = new Map();
            
            // 🕰️ 历史记录（调试用）
            this.history = [];
            this.maxHistorySize = 50;
            
            // ⚙️ 配置
            this.config = {
                debug: window.location.hostname === 'localhost',
                enableHistory: true,
                enablePersistence: true,
                persistenceKey: 'learner-state',
                autoSave: true,
                saveDelay: 1000
            };
            
            // 🔧 内部状态
            this.isUpdating = false;
            this.pendingUpdates = [];
            this.saveTimeout = null;
            
            // 🚀 初始化
            this.#initialize();
        }
        
        /**
         * 🚀 初始化状态管理器
         */
        #initialize() {
            if (this.config.debug) {
                console.log('[StateManager] 🚀 初始化轻量级状态管理器...');
            }
            
            // 恢复持久化状态
            if (this.config.enablePersistence) {
                this.#restorePersistedState();
            }
            
            // 设置自动保存
            if (this.config.autoSave) {
                this.#setupAutoSave();
            }
            
            // 设置全局错误处理
            this.#setupErrorHandling();
            
            if (this.config.debug) {
                this.#setupDebugTools();
            }
        }
        
        /**
         * 📖 获取状态值
         * @param {string} path - 状态路径，如 'modules.navigation.isOpen'
         * @param {any} defaultValue - 默认值
         * @returns {any} 状态值
         */
        get(path, defaultValue = undefined) {
            try {
                const keys = path.split('.');
                let current = this.state;
                
                for (const key of keys) {
                    if (current == null || typeof current !== 'object') {
                        return defaultValue;
                    }
                    current = current[key];
                }
                
                return current !== undefined ? current : defaultValue;
            } catch (error) {
                console.warn('[StateManager] 获取状态失败:', path, error);
                return defaultValue;
            }
        }
        
        /**
         * ✏️ 设置状态值
         * @param {string} path - 状态路径
         * @param {any} value - 新值
         * @param {object} options - 选项
         */
        set(path, value, options = {}) {
            try {
                const {
                    silent = false,          // 静默更新，不触发订阅
                    merge = false,           // 合并对象而非替换
                    validate = null,         // 验证函数
                    source = 'unknown'       // 更新来源（调试用）
                } = options;
                
                // 验证新值
                if (validate && !validate(value)) {
                    throw new Error(`状态验证失败: ${path}`);
                }
                
                // 获取旧值
                const oldValue = this.get(path);
                
                // 如果值没有变化，跳过更新
                if (this.#isEqual(oldValue, value)) {
                    return;
                }
                
                // 更新状态
                const keys = path.split('.');
                let current = this.state;
                
                // 深度克隆状态（避免引用问题）
                this.state = this.#deepClone(this.state);
                current = this.state;
                
                // 导航到目标路径
                for (let i = 0; i < keys.length - 1; i++) {
                    const key = keys[i];
                    if (current[key] == null || typeof current[key] !== 'object') {
                        current[key] = {};
                    }
                    current = current[key];
                }
                
                const finalKey = keys[keys.length - 1];
                
                // 设置新值
                if (merge && typeof current[finalKey] === 'object' && typeof value === 'object') {
                    current[finalKey] = { ...current[finalKey], ...value };
                } else {
                    current[finalKey] = value;
                }
                
                // 记录历史
                if (this.config.enableHistory) {
                    this.#addToHistory({
                        type: 'SET',
                        path,
                        oldValue,
                        newValue: value,
                        timestamp: Date.now(),
                        source
                    });
                }
                
                // 触发订阅
                if (!silent) {
                    this.#notifySubscribers(path, value, oldValue);
                }
                
                // 自动保存
                if (this.config.autoSave) {
                    this.#scheduleAutoSave();
                }
                
                if (this.config.debug) {
                    console.log(`[StateManager] 状态更新: ${path}`, { oldValue, newValue: value, source });
                }
                
            } catch (error) {
                console.error('[StateManager] 设置状态失败:', path, error);
                throw error;
            }
        }
        
        /**
         * 🔔 订阅状态变化
         * @param {string} path - 状态路径或模式
         * @param {function} callback - 回调函数
         * @param {object} options - 选项
         * @returns {function} 取消订阅函数
         */
        subscribe(path, callback, options = {}) {
            try {
                const {
                    immediate = false,       // 立即触发一次
                    deep = false,           // 深度监听子路径
                    throttle = 0            // 节流延迟（ms）
                } = options;
                
                const subscription = {
                    id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    path,
                    callback: throttle > 0 ? this.#throttle(callback, throttle) : callback,
                    deep,
                    created: Date.now()
                };
                
                // 添加到订阅列表
                if (!this.subscribers.has(path)) {
                    this.subscribers.set(path, new Set());
                }
                this.subscribers.get(path).add(subscription);
                
                // 立即触发
                if (immediate) {
                    const currentValue = this.get(path);
                    try {
                        callback(currentValue, undefined, path);
                    } catch (error) {
                        console.error('[StateManager] 订阅回调执行失败:', error);
                    }
                }
                
                if (this.config.debug) {
                    console.log(`[StateManager] 新增订阅: ${path} (${subscription.id})`);
                }
                
                // 返回取消订阅函数
                return () => this.#unsubscribe(path, subscription.id);
                
            } catch (error) {
                console.error('[StateManager] 订阅失败:', path, error);
                return () => {}; // 返回空函数避免错误
            }
        }
        
        /**
         * 📦 注册模块状态
         * @param {string} moduleName - 模块名称
         * @param {object} initialState - 初始状态
         * @param {object} options - 选项
         */
        registerModule(moduleName, initialState = {}, options = {}) {
            try {
                const {
                    merge = true,           // 是否与现有状态合并
                    validate = null,        // 状态验证器
                    namespace = true        // 是否使用命名空间
                } = options;
                
                const modulePath = namespace ? `modules.${moduleName}` : moduleName;
                
                // 验证初始状态
                if (validate && !validate(initialState)) {
                    throw new Error(`模块状态验证失败: ${moduleName}`);
                }
                
                // 注册模块状态
                if (merge) {
                    const currentState = this.get(modulePath, {});
                    this.set(modulePath, { ...currentState, ...initialState }, {
                        source: `module:${moduleName}`,
                        silent: false
                    });
                } else {
                    this.set(modulePath, initialState, {
                        source: `module:${moduleName}`,
                        silent: false
                    });
                }
                
                if (this.config.debug) {
                    console.log(`[StateManager] 模块已注册: ${moduleName}`, initialState);
                }
                
                return {
                    // 模块专用的状态操作方法
                    get: (subPath = '') => this.get(subPath ? `${modulePath}.${subPath}` : modulePath),
                    set: (subPath, value, opts = {}) => {
                        const fullPath = typeof subPath === 'object' ? modulePath : `${modulePath}.${subPath}`;
                        const finalValue = typeof subPath === 'object' ? subPath : value;
                        return this.set(fullPath, finalValue, { ...opts, source: `module:${moduleName}` });
                    },
                    subscribe: (subPath, callback, opts = {}) => {
                        const fullPath = subPath ? `${modulePath}.${subPath}` : modulePath;
                        return this.subscribe(fullPath, callback, opts);
                    },
                    unregister: () => this.set(modulePath, undefined, { source: `module:${moduleName}` })
                };
                
            } catch (error) {
                console.error('[StateManager] 模块注册失败:', moduleName, error);
                throw error;
            }
        }
        
        /**
         * 🎭 获取模块状态管理器
         * @param {string} moduleName - 模块名称
         * @returns {object} 模块状态管理器
         */
        getModule(moduleName) {
            const modulePath = `modules.${moduleName}`;
            const moduleState = this.get(modulePath);
            
            if (!moduleState) {
                console.warn(`[StateManager] 模块未找到: ${moduleName}`);
                return null;
            }
            
            return {
                get: (subPath = '') => this.get(subPath ? `${modulePath}.${subPath}` : modulePath),
                set: (subPath, value, opts = {}) => {
                    const fullPath = typeof subPath === 'object' ? modulePath : `${modulePath}.${subPath}`;
                    const finalValue = typeof subPath === 'object' ? subPath : value;
                    return this.set(fullPath, finalValue, { ...opts, source: `module:${moduleName}` });
                },
                subscribe: (subPath, callback, opts = {}) => {
                    const fullPath = subPath ? `${modulePath}.${subPath}` : modulePath;
                    return this.subscribe(fullPath, callback, opts);
                },
                exists: () => !!this.get(modulePath)
            };
        }
        
        /**
         * 💾 持久化状态到本地存储
         * @param {string|array} paths - 要持久化的路径
         */
        persist(paths = null) {
            try {
                if (!this.config.enablePersistence) return;
                
                let dataToSave;
                
                if (paths === null) {
                    // 保存完整状态（排除临时数据）
                    dataToSave = {
                        app: this.get('app'),
                        modules: this.get('modules'),
                        preferences: this.get('preferences'),
                        // 不保存 cache 数据
                    };
                } else if (Array.isArray(paths)) {
                    // 保存指定路径
                    dataToSave = {};
                    for (const path of paths) {
                        this.#setNestedValue(dataToSave, path, this.get(path));
                    }
                } else if (typeof paths === 'string') {
                    // 保存单个路径
                    dataToSave = this.get(paths);
                }
                
                const saveData = {
                    version: '2.0',
                    timestamp: Date.now(),
                    data: dataToSave
                };
                
                localStorage.setItem(this.config.persistenceKey, JSON.stringify(saveData));
                
                if (this.config.debug) {
                    console.log('[StateManager] 状态已保存到本地存储');
                }
                
            } catch (error) {
                console.error('[StateManager] 持久化失败:', error);
            }
        }
        
        /**
         * 📤 从本地存储恢复状态
         */
        restore() {
            try {
                if (!this.config.enablePersistence) return false;
                
                const saved = localStorage.getItem(this.config.persistenceKey);
                if (!saved) return false;
                
                const saveData = JSON.parse(saved);
                
                // 版本兼容性检查
                if (saveData.version && saveData.version !== '2.0') {
                    console.warn('[StateManager] 状态版本不兼容，跳过恢复');
                    return false;
                }
                
                // 恢复状态
                if (saveData.data) {
                    // 合并恢复的状态
                    for (const [key, value] of Object.entries(saveData.data)) {
                        this.set(key, value, { silent: true, source: 'restore' });
                    }
                }
                
                if (this.config.debug) {
                    console.log('[StateManager] 状态已从本地存储恢复');
                }
                
                return true;
                
            } catch (error) {
                console.error('[StateManager] 恢复状态失败:', error);
                return false;
            }
        }
        
        /**
         * 📸 创建状态快照
         * @returns {object} 状态快照
         */
        snapshot() {
            return {
                id: `snapshot_${Date.now()}`,
                timestamp: Date.now(),
                state: this.#deepClone(this.state),
                history: [...this.history]
            };
        }
        
        /**
         * 🔄 从快照恢复状态
         * @param {object} snapshot - 状态快照
         */
        restoreSnapshot(snapshot) {
            try {
                if (!snapshot || !snapshot.state) {
                    throw new Error('无效的快照数据');
                }
                
                this.state = this.#deepClone(snapshot.state);
                
                if (snapshot.history) {
                    this.history = [...snapshot.history];
                }
                
                // 触发全局更新通知
                this.#notifySubscribers('*', this.state, null);
                
                if (this.config.debug) {
                    console.log('[StateManager] 已从快照恢复状态:', snapshot.id);
                }
                
            } catch (error) {
                console.error('[StateManager] 快照恢复失败:', error);
                throw error;
            }
        }
        
        /**
         * 📊 获取调试信息
         * @returns {object} 调试信息
         */
        getDebugInfo() {
            return {
                state: this.#deepClone(this.state),
                subscribers: {
                    total: Array.from(this.subscribers.values()).reduce((sum, set) => sum + set.size, 0),
                    byPath: Array.from(this.subscribers.entries()).map(([path, subs]) => ({
                        path,
                        count: subs.size
                    }))
                },
                history: this.history.slice(-10), // 最近10条
                config: this.config,
                performance: {
                    memoryUsage: this.#estimateMemoryUsage(),
                    subscriptionCount: this.subscribers.size
                }
            };
        }
        
        /**
         * 🧹 清理方法
         */
        destroy() {
            try {
                // 清理定时器
                if (this.saveTimeout) {
                    clearTimeout(this.saveTimeout);
                }
                
                // 清理订阅
                this.subscribers.clear();
                this.moduleSubscribers.clear();
                
                // 清理历史
                this.history.length = 0;
                
                // 最后保存
                if (this.config.autoSave) {
                    this.persist();
                }
                
                if (this.config.debug) {
                    console.log('[StateManager] 状态管理器已销毁');
                }
                
            } catch (error) {
                console.error('[StateManager] 销毁失败:', error);
            }
        }
        
        // ========================================
        // 🔧 私有方法
        // ========================================
        
        /**
         * 🔔 通知订阅者
         */
        #notifySubscribers(path, newValue, oldValue) {
            try {
                // 直接路径匹配
                const directSubscribers = this.subscribers.get(path);
                if (directSubscribers) {
                    for (const subscription of directSubscribers) {
                        try {
                            subscription.callback(newValue, oldValue, path);
                        } catch (error) {
                            console.error('[StateManager] 订阅回调执行失败:', error);
                        }
                    }
                }
                
                // 深度监听（父路径）
                const pathParts = path.split('.');
                for (let i = 1; i <= pathParts.length; i++) {
                    const parentPath = pathParts.slice(0, i).join('.');
                    const parentSubscribers = this.subscribers.get(parentPath);
                    
                    if (parentSubscribers) {
                        for (const subscription of parentSubscribers) {
                            if (subscription.deep && subscription.path !== path) {
                                try {
                                    const parentValue = this.get(parentPath);
                                    subscription.callback(parentValue, oldValue, path);
                                } catch (error) {
                                    console.error('[StateManager] 深度订阅回调执行失败:', error);
                                }
                            }
                        }
                    }
                }
                
                // 通配符订阅
                const wildcardSubscribers = this.subscribers.get('*');
                if (wildcardSubscribers) {
                    for (const subscription of wildcardSubscribers) {
                        try {
                            subscription.callback(newValue, oldValue, path);
                        } catch (error) {
                            console.error('[StateManager] 通配符订阅回调执行失败:', error);
                        }
                    }
                }
                
            } catch (error) {
                console.error('[StateManager] 通知订阅者失败:', error);
            }
        }
        
        /**
         * 🚫 取消订阅
         */
        #unsubscribe(path, subscriptionId) {
            try {
                const pathSubscribers = this.subscribers.get(path);
                if (pathSubscribers) {
                    for (const subscription of pathSubscribers) {
                        if (subscription.id === subscriptionId) {
                            pathSubscribers.delete(subscription);
                            break;
                        }
                    }
                    
                    // 如果没有订阅者了，删除路径
                    if (pathSubscribers.size === 0) {
                        this.subscribers.delete(path);
                    }
                }
                
                if (this.config.debug) {
                    console.log(`[StateManager] 取消订阅: ${path} (${subscriptionId})`);
                }
                
            } catch (error) {
                console.error('[StateManager] 取消订阅失败:', error);
            }
        }
        
        /**
         * 📝 添加到历史记录
         */
        #addToHistory(entry) {
            this.history.push(entry);
            
            // 限制历史记录大小
            if (this.history.length > this.maxHistorySize) {
                this.history.shift();
            }
        }
        
        /**
         * 💾 设置自动保存
         */
        #setupAutoSave() {
            // 页面卸载时自动保存
            window.addEventListener('beforeunload', () => {
                this.persist();
            });
        }
        
        /**
         * ⏰ 计划自动保存
         */
        #scheduleAutoSave() {
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
            }
            
            this.saveTimeout = setTimeout(() => {
                this.persist();
                this.saveTimeout = null;
            }, this.config.saveDelay);
        }
        
        /**
         * 📤 恢复持久化状态
         */
        #restorePersistedState() {
            this.restore();
        }
        
        /**
         * 🛡️ 设置错误处理
         */
        #setupErrorHandling() {
            window.addEventListener('error', (event) => {
                this.set('app.errors.global', {
                    message: event.error?.message || event.message,
                    stack: event.error?.stack,
                    timestamp: Date.now()
                }, { source: 'errorHandler' });
            });
        }
        
        /**
         * 🔧 设置调试工具
         */
        #setupDebugTools() {
            // 全局调试接口
            window.StateManagerDebug = {
                getState: () => this.#deepClone(this.state),
                getHistory: () => [...this.history],
                getSubscribers: () => Array.from(this.subscribers.entries()),
                getDebugInfo: () => this.getDebugInfo(),
                snapshot: () => this.snapshot(),
                restore: (snapshot) => this.restoreSnapshot(snapshot),
                clear: () => {
                    this.state = {};
                    this.history.length = 0;
                }
            };
            
            console.log('[StateManager] 🔧 调试工具已启用 (window.StateManagerDebug)');
        }
        
        /**
         * 🔄 深度克隆
         */
        #deepClone(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj);
            if (obj instanceof Array) return obj.map(item => this.#deepClone(item));
            if (typeof obj === 'object') {
                const cloned = {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        cloned[key] = this.#deepClone(obj[key]);
                    }
                }
                return cloned;
            }
            return obj;
        }
        
        /**
         * 🔍 检查值是否相等
         */
        #isEqual(a, b) {
            if (a === b) return true;
            if (a == null || b == null) return a === b;
            if (typeof a !== typeof b) return false;
            if (typeof a !== 'object') return a === b;
            
            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
            if (keysA.length !== keysB.length) return false;
            
            for (const key of keysA) {
                if (!keysB.includes(key)) return false;
                if (!this.#isEqual(a[key], b[key])) return false;
            }
            
            return true;
        }
        
        /**
         * 🕰️ 节流函数
         */
        #throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
        
        /**
         * 🎯 设置嵌套值
         */
        #setNestedValue(obj, path, value) {
            const keys = path.split('.');
            let current = obj;
            
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!(key in current) || typeof current[key] !== 'object') {
                    current[key] = {};
                }
                current = current[key];
            }
            
            current[keys[keys.length - 1]] = value;
        }
        
        /**
         * 📊 估算内存使用
         */
        #estimateMemoryUsage() {
            try {
                const jsonString = JSON.stringify(this.state);
                return {
                    stateSize: jsonString.length,
                    historySize: JSON.stringify(this.history).length,
                    subscribersCount: this.subscribers.size,
                    estimatedKB: Math.round(jsonString.length / 1024)
                };
            } catch (error) {
                return { error: error.message };
            }
        }
    }
    
    // 🌐 全局注册
    window.EnglishSite = window.EnglishSite || {};
    window.EnglishSite.StateManager = StateManager;
    
    console.log('🏗️ StateManager 核心类已加载');
    
})();
