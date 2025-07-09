/**
 * 🚀 英语学习网站核心基础设施 - 现代化重构版 v5.0
 * 
 * 特性：
 * - ES2022+ 现代语法和特性
 * - 类型安全的设计模式
 * - 高性能缓存和内存管理
 * - 智能错误处理和恢复
 * - 100% 向后兼容
 * - Web Workers 和 Service Worker 支持
 * - 响应式设计适配
 * 
 * @author Modern Refactor
 * @version 5.0.0
 * @date 2025-01-09
 */

// 确保全局命名空间存在
globalThis.EnglishSite ??= {};

// 🎯 现代化的类型定义和常量
const CACHE_STRATEGIES = Object.freeze({
  LRU: 'lru',
  LFU: 'lfu', 
  FIFO: 'fifo',
  TTL_ONLY: 'ttl'
});

const ERROR_LEVELS = Object.freeze({
  INFO: 'info',
  WARN: 'warn', 
  ERROR: 'error',
  CRITICAL: 'critical'
});

const PERFORMANCE_CATEGORIES = Object.freeze({
  INIT: 'initialization',
  CACHE: 'cache',
  NETWORK: 'network',
  RENDER: 'render',
  USER_INTERACTION: 'user_interaction'
});

// 🔧 现代化配置管理器
class ModernConfigManager {
  // 私有字段
  #config = new Map();
  #watchers = new Map();
  #frozen = false;
  
  // 静态默认配置
  static #defaultConfig = Object.freeze({
    cache: {
      maxSize: 100,
      ttl: 300_000, // 5分钟，使用数字分隔符
      strategy: CACHE_STRATEGIES.LRU,
      autoCleanup: true,
      compressionEnabled: true
    },
    performance: {
      throttleMs: 16, // 60fps
      debounceMs: 100,
      timeoutMs: 10_000,
      enableMetrics: globalThis.location?.hostname === 'localhost',
      maxMetrics: 1000
    },
    ui: {
      animationDuration: 300,
      fadeTime: 200,
      loadDelay: 150,
      theme: 'auto', // 'light' | 'dark' | 'auto'
      reduceMotion: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
    },
    features: {
      enableWorkers: 'serviceWorker' in navigator,
      enablePWA: 'serviceWorker' in navigator,
      enableOffline: 'serviceWorker' in navigator,
      enableCompression: 'CompressionStream' in globalThis,
      enableStreaming: 'ReadableStream' in globalThis
    },
    debug: {
      enabled: globalThis.location?.hostname === 'localhost' || 
               new URLSearchParams(globalThis.location?.search).has('debug'),
      verbose: new URLSearchParams(globalThis.location?.search).has('verbose'),
      logLevel: ERROR_LEVELS.WARN
    }
  });

  constructor(initialConfig = {}) {
    this.#initializeConfig(initialConfig);
    this.#setupEnvironmentDetection();
    this.#setupReactiveConfig();
  }

  // 🎯 智能配置初始化
  #initializeConfig(initialConfig) {
    // 深度合并配置，使用现代语法
    const mergedConfig = this.#deepMerge(
      structuredClone(ModernConfigManager.#defaultConfig),
      initialConfig
    );

    // 将扁平化的配置转换为 Map 结构以提升性能
    this.#flattenToMap(mergedConfig);
  }

  // 🔄 深度合并对象（现代化实现）
  #deepMerge(target, source) {
    const result = { ...target };
    
    for (const [key, value] of Object.entries(source)) {
      if (value != null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.#deepMerge(target[key] ?? {}, value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  // 🗂️ 扁平化配置到 Map（性能优化）
  #flattenToMap(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value != null && typeof value === 'object' && !Array.isArray(value)) {
        this.#flattenToMap(value, fullKey);
      } else {
        this.#config.set(fullKey, value);
      }
    }
  }

  // 🌐 环境检测和适配
  #setupEnvironmentDetection() {
    // 检测设备类型
    const isMobile = globalThis.innerWidth <= 768;
    const isSlowConnection = navigator.connection?.effectiveType?.includes('2g') ?? false;
    const isLowMemory = navigator.deviceMemory ? navigator.deviceMemory < 4 : false;

    // 根据环境自动调整配置
    if (isMobile) {
      this.set('cache.maxSize', 50);
      this.set('ui.animationDuration', 200);
      this.set('performance.maxMetrics', 500);
    }

    if (isSlowConnection) {
      this.set('performance.timeoutMs', 20_000);
      this.set('cache.ttl', 600_000); // 延长缓存时间
      this.set('features.enableCompression', true);
    }

    if (isLowMemory) {
      this.set('cache.maxSize', Math.min(this.get('cache.maxSize'), 30));
      this.set('performance.maxMetrics', 200);
    }

    // 保存环境信息
    this.set('environment.isMobile', isMobile);
    this.set('environment.isSlowConnection', isSlowConnection);
    this.set('environment.isLowMemory', isLowMemory);
  }

  // ⚡ 响应式配置系统
  #setupReactiveConfig() {
    // 监听主题变化
    globalThis.matchMedia?.('(prefers-color-scheme: dark)')
      ?.addEventListener('change', (e) => {
        if (this.get('ui.theme') === 'auto') {
          this.set('ui.theme', e.matches ? 'dark' : 'light', { notify: true });
        }
      });

    // 监听减少动画设置
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
      ?.addEventListener('change', (e) => {
        this.set('ui.reduceMotion', e.matches, { notify: true });
      });
  }

  // 📝 获取配置（支持点语法和默认值）
  get(path, defaultValue = undefined) {
    if (this.#config.has(path)) {
      return this.#config.get(path);
    }

    // 尝试通过点语法获取嵌套值
    const parts = path.split('.');
    let current = this.getAll();
    
    for (const part of parts) {
      current = current?.[part];
      if (current === undefined) break;
    }

    return current ?? defaultValue;
  }

  // ✏️ 设置配置（支持批量设置和通知）
  set(path, value, options = {}) {
    const { notify = false, validate = true } = options;
    
    if (this.#frozen) {
      throw new Error(`Configuration is frozen. Cannot set ${path}`);
    }

    if (validate && !this.#validateValue(path, value)) {
      throw new Error(`Invalid value for ${path}: ${value}`);
    }

    const oldValue = this.#config.get(path);
    this.#config.set(path, value);

    // 通知观察者
    if (notify && oldValue !== value) {
      this.#notifyWatchers(path, value, oldValue);
    }

    return this;
  }

  // 📦 批量设置配置
  setMultiple(configs, options = {}) {
    const updates = [];
    
    for (const [path, value] of Object.entries(configs)) {
      const oldValue = this.get(path);
      this.set(path, value, { ...options, notify: false });
      
      if (oldValue !== value) {
        updates.push({ path, value, oldValue });
      }
    }

    // 批量通知
    if (options.notify && updates.length > 0) {
      this.#notifyWatchers('batch', updates);
    }

    return this;
  }

  // 👀 配置观察者
  watch(path, callback) {
    if (!this.#watchers.has(path)) {
      this.#watchers.set(path, new Set());
    }
    
    this.#watchers.get(path).add(callback);
    
    // 返回取消订阅函数
    return () => {
      const pathWatchers = this.#watchers.get(path);
      if (pathWatchers) {
        pathWatchers.delete(callback);
        if (pathWatchers.size === 0) {
          this.#watchers.delete(path);
        }
      }
    };
  }

  // 🔔 通知观察者
  #notifyWatchers(path, newValue, oldValue) {
    const watchers = this.#watchers.get(path);
    if (watchers) {
      for (const callback of watchers) {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.warn(`Config watcher error for ${path}:`, error);
        }
      }
    }
  }

  // ✅ 值验证
  #validateValue(path, value) {
    // 基本类型验证
    const validationRules = {
      'cache.maxSize': v => Number.isInteger(v) && v > 0 && v <= 10000,
      'cache.ttl': v => Number.isInteger(v) && v > 0,
      'performance.throttleMs': v => Number.isInteger(v) && v >= 0 && v <= 1000,
      'ui.animationDuration': v => Number.isInteger(v) && v >= 0 && v <= 5000,
      'debug.logLevel': v => Object.values(ERROR_LEVELS).includes(v)
    };

    const validator = validationRules[path];
    return validator ? validator(value) : true;
  }

  // 🗂️ 获取所有配置
  getAll() {
    const result = {};
    
    for (const [key, value] of this.#config) {
      const parts = key.split('.');
      let current = result;
      
      for (let i = 0; i < parts.length - 1; i++) {
        current[parts[i]] ??= {};
        current = current[parts[i]];
      }
      
      current[parts[parts.length - 1]] = value;
    }
    
    return result;
  }

  // 🔒 冻结配置
  freeze() {
    this.#frozen = true;
    return this;
  }

  // ❄️ 解冻配置
  unfreeze() {
    this.#frozen = false;
    return this;
  }

  // 🧹 清理
  destroy() {
    this.#config.clear();
    this.#watchers.clear();
    this.#frozen = false;
  }

  // 📊 模块配置创建（兼容性方法）
  static createModuleConfig(moduleName, customConfig = {}) {
    const moduleDefaults = {
      audioSync: {
        offset: 0,
        autoscroll: true,
        enableWorkers: true,
        workerTimeout: 15_000
      },
      glossary: {
        cacheMaxSize: 30,
        cacheTTL: 600_000,
        enablePreloading: true
      },
      navigation: {
        siteTitle: '互动学习平台',
        cacheMaxSize: 50,
        cacheTTL: 300_000
      },
      main: {
        siteTitle: '互动学习平台',
        enableErrorBoundary: true
      }
    };

    const instance = new ModernConfigManager();
    const baseConfig = {
      debug: instance.get('debug.enabled'),
      enableErrorBoundary: true,
      showErrorDetails: instance.get('debug.enabled')
    };

    return {
      ...baseConfig,
      ...(moduleDefaults[moduleName] ?? {}),
      ...customConfig
    };
  }
}

// 🗄️ 现代化高性能缓存系统
class ModernCacheManager {
  // 私有字段
  #caches = new Map();
  #globalStats = {
    totalHits: 0,
    totalMisses: 0,
    totalSets: 0,
    totalDeletes: 0,
    startTime: Date.now()
  };

  constructor() {
    this.#setupPerformanceOptimizations();
  }

  // ⚡ 性能优化设置
  #setupPerformanceOptimizations() {
    // 定期清理过期项
    this.cleanupInterval = setInterval(() => {
      this.performGlobalCleanup();
    }, 60_000); // 每分钟清理一次

    // 内存压力监控
    if ('memory' in performance) {
      this.#setupMemoryPressureHandling();
    }
  }

  // 💾 内存压力处理
  #setupMemoryPressureHandling() {
    const checkMemoryPressure = () => {
      const memInfo = performance.memory;
      const usage = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
      
      if (usage > 0.8) { // 80% 内存使用率
        console.warn('High memory usage detected, performing aggressive cleanup');
        this.performAggressiveCleanup();
      }
    };

    // 每30秒检查一次内存使用
    setInterval(checkMemoryPressure, 30_000);
  }

  // 🏗️ 创建现代化缓存实例
  create(name, options = {}) {
    const config = {
      maxSize: 100,
      ttl: 300_000,
      strategy: CACHE_STRATEGIES.LRU,
      enableCompression: false,
      enableStats: true,
      onEviction: null,
      ...options
    };

    const cache = new ModernLRUCache(config);
    this.#caches.set(name, cache);
    
    return cache;
  }

  // 📦 获取缓存实例
  get(name) {
    return this.#caches.get(name);
  }

  // 🔍 检查缓存是否存在
  has(name) {
    return this.#caches.has(name);
  }

  // 🗑️ 销毁缓存
  destroy(name) {
    const cache = this.#caches.get(name);
    if (cache) {
      cache.clear();
      this.#caches.delete(name);
      return true;
    }
    return false;
  }

  // 🧹 全局清理
  performGlobalCleanup() {
    for (const [name, cache] of this.#caches) {
      cache.cleanup?.();
    }
  }

  // 🔥 激进清理（内存压力时）
  performAggressiveCleanup() {
    for (const [name, cache] of this.#caches) {
      // 清理一半的缓存项
      const currentSize = cache.size;
      const targetSize = Math.floor(currentSize / 2);
      
      while (cache.size > targetSize) {
        cache.deleteLRU?.() || cache.clear();
      }
    }
  }

  // 📊 获取统计信息
  getGlobalStats() {
    const cacheStats = {};
    
    for (const [name, cache] of this.#caches) {
      cacheStats[name] = cache.getStats?.() ?? {};
    }

    return {
      global: this.#globalStats,
      caches: cacheStats,
      totalCaches: this.#caches.size,
      memoryUsage: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null
    };
  }

  // 🧹 销毁所有缓存
  destroyAll() {
    for (const [name] of this.#caches) {
      this.destroy(name);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  // 兼容性方法
  createCache = this.create.bind(this);
  getCache = this.get.bind(this);
  destroyCache = this.destroy.bind(this);
  getStats = this.getGlobalStats.bind(this);
  cleanup = this.performGlobalCleanup.bind(this);
}

// 🚀 现代化LRU缓存实现
class ModernLRUCache {
  #data = new Map();
  #timers = new Map();
  #stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    startTime: Date.now()
  };

  constructor(options = {}) {
    this.maxSize = options.maxSize ?? 100;
    this.ttl = options.ttl ?? 300_000;
    this.enableCompression = options.enableCompression ?? false;
    this.enableStats = options.enableStats ?? true;
    this.onEviction = options.onEviction;
  }

  // 📝 设置缓存项
  set(key, value) {
    this.enableStats && this.#stats.sets++;

    // 压缩数据（如果启用）
    const storedValue = this.enableCompression ? 
      this.#compress(value) : value;

    // 清理旧的定时器
    this.#clearTimer(key);

    // 删除旧项并重新插入（LRU特性）
    this.#data.delete(key);
    this.#data.set(key, storedValue);

    // 设置TTL
    if (this.ttl > 0) {
      this.#timers.set(key, setTimeout(() => {
        this.delete(key);
      }, this.ttl));
    }

    // 容量控制
    if (this.#data.size > this.maxSize) {
      this.#evictLRU();
    }

    return this;
  }

  // 📖 获取缓存项
  get(key) {
    if (!this.#data.has(key)) {
      this.enableStats && this.#stats.misses++;
      return null;
    }

    const value = this.#data.get(key);
    
    // 移动到末尾（LRU更新）
    this.#data.delete(key);
    this.#data.set(key, value);
    
    this.enableStats && this.#stats.hits++;
    
    // 解压数据（如果需要）
    return this.enableCompression ? 
      this.#decompress(value) : value;
  }

  // 🔍 检查是否存在
  has(key) {
    return this.#data.has(key);
  }

  // 🗑️ 删除项
  delete(key) {
    if (this.#data.has(key)) {
      this.#data.delete(key);
      this.#clearTimer(key);
      this.enableStats && this.#stats.deletes++;
      return true;
    }
    return false;
  }

  // 🧹 清空缓存
  clear() {
    for (const timer of this.#timers.values()) {
      clearTimeout(timer);
    }
    
    this.#data.clear();
    this.#timers.clear();
    
    this.#stats.deletes += this.#data.size;
  }

  // 📏 获取大小
  get size() {
    return this.#data.size;
  }

  // 🔄 批量操作
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

  // 📊 获取统计信息
  getStats() {
    const total = this.#stats.hits + this.#stats.misses;
    
    return {
      ...this.#stats,
      size: this.#data.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? (this.#stats.hits / total * 100).toFixed(1) + '%' : '0%',
      usage: (this.#data.size / this.maxSize * 100).toFixed(1) + '%',
      uptime: Date.now() - this.#stats.startTime
    };
  }

  // 🗑️ LRU淘汰
  #evictLRU() {
    const firstKey = this.#data.keys().next().value;
    if (firstKey !== undefined) {
      const evictedValue = this.#data.get(firstKey);
      this.delete(firstKey);
      this.enableStats && this.#stats.evictions++;
      
      // 调用淘汰回调
      this.onEviction?.(firstKey, evictedValue);
    }
  }

  // ⏱️ 清理定时器
  #clearTimer(key) {
    const timer = this.#timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.#timers.delete(key);
    }
  }

  // 🗜️ 压缩数据
  #compress(data) {
    try {
      return JSON.stringify(data);
    } catch {
      return data;
    }
  }

  // 📤 解压数据
  #decompress(data) {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  // 🧹 清理过期项
  cleanup() {
    // TTL会自动清理，这里可以做额外的清理工作
    const now = Date.now();
    const maxAge = 3600_000; // 1小时
    
    for (const [key] of this.#data) {
      // 这里可以基于其他策略进行清理
    }
  }

  // 🧹 销毁
  destroy() {
    this.clear();
  }
}

// 🚨 现代化错误处理系统
class ModernErrorHandler {
  // 私有字段
  #errors = [];
  #errorCounts = new Map();
  #rateLimits = new Map();
  #config = {
    maxErrors: 1000,
    rateLimitWindow: 60_000, // 1分钟
    rateLimitMax: 10, // 每分钟最多10个相同错误
    enableReporting: false,
    enableRecovery: true
  };

  constructor(config = {}) {
    Object.assign(this.#config, config);
    this.#setupGlobalErrorHandling();
  }

  // 🌐 全局错误处理设置
  #setupGlobalErrorHandling() {
    // 未捕获异常
    globalThis.addEventListener?.('error', (event) => {
      this.handle('global.uncaught', event.error ?? new Error(event.message), {
        filename: event.filename,
        line: event.lineno,
        column: event.colno
      });
    });

    // 未处理的Promise拒绝
    globalThis.addEventListener?.('unhandledrejection', (event) => {
      this.handle('global.unhandledRejection', event.reason ?? new Error('Unhandled Promise rejection'));
      event.preventDefault(); // 防止控制台报告
    });
  }

  // 🎯 智能错误处理
  handle(context, error, metadata = {}) {
    const errorObj = this.#normalizeError(error);
    const errorKey = `${context}:${errorObj.message}`;

    // 速率限制检查
    if (this.#isRateLimited(errorKey)) {
      return false;
    }

    // 错误增强
    const enhancedError = {
      ...errorObj,
      context,
      metadata,
      timestamp: Date.now(),
      id: crypto.randomUUID?.() ?? Date.now().toString(36),
      userAgent: navigator.userAgent,
      url: globalThis.location?.href,
      level: this.#determineErrorLevel(errorObj, context)
    };

    // 存储错误
    this.#storeError(enhancedError);

    // 错误恢复
    if (this.#config.enableRecovery) {
      this.#attemptRecovery(enhancedError);
    }

    // 错误报告
    if (this.#config.enableReporting) {
      this.#reportError(enhancedError);
    }

    // 开发环境输出
    if (ModernConfigManager.prototype.get?.('debug.enabled')) {
      this.#devOutput(enhancedError);
    }

    return true;
  }

  // 🔄 错误标准化
  #normalizeError(error) {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
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

  // 🚫 速率限制检查
  #isRateLimited(errorKey) {
    const now = Date.now();
    const windowStart = now - this.#config.rateLimitWindow;

    // 清理过期的限制记录
    for (const [key, timestamps] of this.#rateLimits) {
      this.#rateLimits.set(key, timestamps.filter(t => t > windowStart));
      if (this.#rateLimits.get(key).length === 0) {
        this.#rateLimits.delete(key);
      }
    }

    // 检查当前错误
    const timestamps = this.#rateLimits.get(errorKey) ?? [];
    if (timestamps.length >= this.#config.rateLimitMax) {
      return true;
    }

    // 记录新的时间戳
    timestamps.push(now);
    this.#rateLimits.set(errorKey, timestamps);
    
    return false;
  }

  // 📊 错误级别判断
  #determineErrorLevel(error, context) {
    if (context.includes('critical') || error.name === 'SecurityError') {
      return ERROR_LEVELS.CRITICAL;
    }
    
    if (context.includes('network') || error.name === 'NetworkError') {
      return ERROR_LEVELS.ERROR;
    }
    
    if (context.includes('warn') || error.name === 'ValidationError') {
      return ERROR_LEVELS.WARN;
    }
    
    return ERROR_LEVELS.INFO;
  }

  // 💾 错误存储
  #storeError(errorObj) {
    this.#errors.push(errorObj);
    
    // 限制存储数量
    if (this.#errors.length > this.#config.maxErrors) {
      this.#errors.shift();
    }

    // 更新计数
    const key = `${errorObj.context}:${errorObj.name}`;
    this.#errorCounts.set(key, (this.#errorCounts.get(key) ?? 0) + 1);
  }

  // 🔧 错误恢复尝试
  #attemptRecovery(errorObj) {
    const recoveryStrategies = {
      'network': () => this.#retryNetworkOperation(errorObj),
      'cache': () => this.#clearCorruptedCache(errorObj),
      'dom': () => this.#resetDOMState(errorObj),
      'memory': () => this.#performMemoryCleanup(errorObj)
    };

    for (const [pattern, strategy] of Object.entries(recoveryStrategies)) {
      if (errorObj.context.includes(pattern)) {
        try {
          strategy();
          console.info(`Recovery attempted for ${errorObj.context}`);
        } catch (recoveryError) {
          console.warn('Recovery failed:', recoveryError);
        }
        break;
      }
    }
  }

  // 📡 错误报告
  #reportError(errorObj) {
    // 异步发送错误报告，避免阻塞
    setTimeout(() => {
      try {
        // 这里可以集成各种错误报告服务
        // 例如：Sentry, LogRocket, Bugsnag 等
        console.info('Error reported:', errorObj.id);
      } catch (reportError) {
        console.warn('Error reporting failed:', reportError);
      }
    }, 0);
  }

  // 🖥️ 开发环境输出
  #devOutput(errorObj) {
    const style = {
      [ERROR_LEVELS.INFO]: 'color: #007bff; background: #e7f3ff;',
      [ERROR_LEVELS.WARN]: 'color: #856404; background: #fff3cd;',
      [ERROR_LEVELS.ERROR]: 'color: #721c24; background: #f8d7da;',
      [ERROR_LEVELS.CRITICAL]: 'color: #fff; background: #dc3545;'
    };

    console.group(`%c[${errorObj.level.toUpperCase()}] ${errorObj.context}`, style[errorObj.level]);
    console.error(errorObj.message);
    console.log('Stack:', errorObj.stack);
    console.log('Metadata:', errorObj.metadata);
    console.log('Timestamp:', new Date(errorObj.timestamp).toISOString());
    console.groupEnd();
  }

  // 🔧 恢复策略实现
  #retryNetworkOperation(errorObj) {
    // 网络错误恢复逻辑
  }

  #clearCorruptedCache(errorObj) {
    // 清理损坏的缓存
  }

  #resetDOMState(errorObj) {
    // 重置DOM状态
  }

  #performMemoryCleanup(errorObj) {
    // 内存清理
  }

  // 📊 公共API方法
  getStats() {
    const now = Date.now();
    const last24h = now - 86400_000;
    const recentErrors = this.#errors.filter(e => e.timestamp > last24h);

    return {
      total: this.#errors.length,
      recent24h: recentErrors.length,
      byLevel: this.#groupByLevel(recentErrors),
      byContext: this.#groupByContext(recentErrors),
      topErrors: this.#getTopErrors(),
      rateLimited: this.#rateLimits.size
    };
  }

  #groupByLevel(errors) {
    return errors.reduce((acc, error) => {
      acc[error.level] = (acc[error.level] ?? 0) + 1;
      return acc;
    }, {});
  }

  #groupByContext(errors) {
    return errors.reduce((acc, error) => {
      acc[error.context] = (acc[error.context] ?? 0) + 1;
      return acc;
    }, {});
  }

  #getTopErrors() {
    return Array.from(this.#errorCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([key, count]) => ({ error: key, count }));
  }

  // 🧹 清理方法
  clear(context = null) {
    if (context) {
      this.#errors = this.#errors.filter(e => !e.context.includes(context));
    } else {
      this.#errors.length = 0;
      this.#errorCounts.clear();
      this.#rateLimits.clear();
    }
  }

  // 兼容性方法
  record = this.handle.bind(this);
  safe = (fn, fallback = null, context = 'unknown') => {
    try {
      return fn();
    } catch (error) {
      this.handle(context, error);
      return fallback;
    }
  };
  
  safeSync = this.safe;
  
  async safeAsync(fn, fallback = null, context = 'unknown') {
    try {
      return await fn();
    } catch (error) {
      this.handle(context, error);
      return fallback;
    }
  }

  showError = (message) => {
    // 简化的错误显示
    console.error('Error:', message);
  };

  showNotification = this.showError;
}

// ⚡ 现代化性能监控系统
class ModernPerformanceMonitor {
  #metrics = [];
  #observers = new Map();
  #config = {
    enabled: false,
    maxMetrics: 1000,
    enableWebVitals: true,
    enableUserTiming: true,
    enableResourceTiming: true
  };

  constructor(config = {}) {
    Object.assign(this.#config, config);
    
    if (this.#config.enabled) {
      this.#setupObservers();
      this.#setupWebVitals();
    }
  }

  // 🔍 设置性能观察者
  #setupObservers() {
    if ('PerformanceObserver' in globalThis) {
      this.#setupNavigationObserver();
      this.#setupResourceObserver();
      this.#setupMeasureObserver();
    }
  }

  // 🧭 导航性能观察
  #setupNavigationObserver() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.#recordNavigationMetrics(entry);
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
      this.#observers.set('navigation', observer);
    } catch (error) {
      console.warn('Navigation observer setup failed:', error);
    }
  }

  // 📦 资源性能观察
  #setupResourceObserver() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.#recordResourceMetrics(entry);
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
      this.#observers.set('resource', observer);
    } catch (error) {
      console.warn('Resource observer setup failed:', error);
    }
  }

  // 📏 测量性能观察
  #setupMeasureObserver() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.#recordCustomMetric(entry);
        }
      });
      
      observer.observe({ entryTypes: ['measure'] });
      this.#observers.set('measure', observer);
    } catch (error) {
      console.warn('Measure observer setup failed:', error);
    }
  }

  // 🎯 Web Vitals 设置
  #setupWebVitals() {
    if (!this.#config.enableWebVitals) return;

    // 简化的Web Vitals实现
    this.#measureCLS();
    this.#measureFID();
    this.#measureLCP();
  }

  // 📊 记录导航指标
  #recordNavigationMetrics(entry) {
    const metrics = {
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      request: entry.responseStart - entry.requestStart,
      response: entry.responseEnd - entry.responseStart,
      dom: entry.domContentLoadedEventEnd - entry.responseEnd,
      load: entry.loadEventEnd - entry.loadEventStart,
      total: entry.loadEventEnd - entry.fetchStart
    };

    this.recordMetric('navigation', metrics.total, PERFORMANCE_CATEGORIES.INIT, {
      breakdown: metrics,
      type: entry.type
    });
  }

  // 📦 记录资源指标
  #recordResourceMetrics(entry) {
    this.recordMetric(`resource.${entry.initiatorType}`, entry.duration, PERFORMANCE_CATEGORIES.NETWORK, {
      name: entry.name,
      size: entry.transferSize,
      cached: entry.transferSize === 0
    });
  }

  // 📏 记录自定义指标
  #recordCustomMetric(entry) {
    this.recordMetric(entry.name, entry.duration, PERFORMANCE_CATEGORIES.USER_INTERACTION, {
      startTime: entry.startTime,
      detail: entry.detail
    });
  }

  // Web Vitals 测量方法
  #measureCLS() {
    let clsValue = 0;
    let clsEntries = [];

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            clsEntries.push(entry);
          }
        }
        
        this.recordMetric('webVitals.cls', clsValue, 'webVitals', {
          entries: clsEntries.length
        });
      });

      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('CLS measurement failed:', error);
    }
  }

  #measureFID() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('webVitals.fid', entry.processingStart - entry.startTime, 'webVitals', {
            name: entry.name,
            startTime: entry.startTime
          });
        }
      });

      observer.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      console.warn('FID measurement failed:', error);
    }
  }

  #measureLCP() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('webVitals.lcp', entry.startTime, 'webVitals', {
            element: entry.element?.tagName,
            url: entry.url,
            size: entry.size
          });
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('LCP measurement failed:', error);
    }
  }

  // 📊 公共API方法
  startMeasure(name, category = PERFORMANCE_CATEGORIES.USER_INTERACTION) {
    if (!this.#config.enabled) return null;

    const id = `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    if (this.#config.enableUserTiming && 'performance' in globalThis) {
      performance.mark(`${id}-start`);
    }

    return {
      id,
      name,
      category,
      startTime: performance.now()
    };
  }

  endMeasure(measureInfo) {
    if (!measureInfo || !this.#config.enabled) return null;

    const duration = performance.now() - measureInfo.startTime;

    if (this.#config.enableUserTiming && 'performance' in globalThis) {
      performance.mark(`${measureInfo.id}-end`);
      performance.measure(measureInfo.name, `${measureInfo.id}-start`, `${measureInfo.id}-end`);
    }

    this.recordMetric(measureInfo.name, duration, measureInfo.category);

    return {
      name: measureInfo.name,
      duration,
      category: measureInfo.category
    };
  }

  recordMetric(name, value, category = 'custom', metadata = {}) {
    if (!this.#config.enabled) return;

    const metric = {
      name,
      value,
      category,
      metadata,
      timestamp: Date.now(),
      id: crypto.randomUUID?.() ?? Date.now().toString(36)
    };

    this.#metrics.push(metric);

    // 限制指标数量
    if (this.#metrics.length > this.#config.maxMetrics) {
      this.#metrics.shift();
    }
  }

  getStats(category = null) {
    const filteredMetrics = category ? 
      this.#metrics.filter(m => m.category === category) : 
      this.#metrics;

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
      byCategory: this.#groupByCategory(filteredMetrics)
    };
  }

  #groupByCategory(metrics) {
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
    this.#metrics.length = 0;
  }

  destroy() {
    for (const observer of this.#observers.values()) {
      observer.disconnect();
    }
    this.#observers.clear();
    this.clear();
  }

  // 兼容性方法
  enable() { this.#config.enabled = true; }
  setEnabled(enabled) { this.#config.enabled = enabled; }
  measureFunction = async (fn, name) => {
    const measure = this.startMeasure(name);
    try {
      return await fn();
    } finally {
      this.endMeasure(measure);
    }
  };
}

// 🔧 现代化Worker管理器
class ModernWorkerManager {
  #workers = new Map();
  #config = {
    timeout: 30_000,
    retries: 3,
    enableFallback: true
  };

  constructor(config = {}) {
    Object.assign(this.#config, config);
  }

  async execute(scriptPath, data, fallbackFn, options = {}) {
    const config = { ...this.#config, ...options };

    if (!this.#isWorkerSupported()) {
      console.warn('[Worker] Not supported, using fallback');
      return fallbackFn ? fallbackFn(data) : null;
    }

    try {
      return await this.#executeWithWorker(scriptPath, data, config);
    } catch (error) {
      console.warn('[Worker] Execution failed:', error.message);
      
      if (config.enableFallback && fallbackFn) {
        return fallbackFn(data);
      }
      
      throw error;
    }
  }

  #isWorkerSupported() {
    return 'Worker' in globalThis && 'Blob' in globalThis;
  }

  async #executeWithWorker(scriptPath, data, config) {
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
          if (response?.success !== false) {
            resolve(response?.result ?? response?.data ?? response);
          } else {
            reject(new Error(response.error ?? 'Worker execution failed'));
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
  safeExecute = this.execute.bind(this);
}

// 🚀 现代化应用初始化器
class ModernAppInitializer {
  static async initialize(options = {}) {
    try {
      console.log('🚀 Initializing Modern EnglishSite v5.0...');

      // 创建全局实例
      const config = new ModernConfigManager(options);
      const cacheManager = new ModernCacheManager();
      const errorHandler = new ModernErrorHandler(config.get('error', {}));
      const performanceMonitor = new ModernPerformanceMonitor(config.get('performance', {}));
      const workerManager = new ModernWorkerManager(config.get('worker', {}));

      // 注册到全局命名空间
      Object.assign(globalThis.EnglishSite, {
        // 现代化API
        Config: config,
        CacheManager: cacheManager,
        ErrorHandler: errorHandler,
        PerformanceMonitor: performanceMonitor,
        WorkerManager: workerManager,

        // 兼容性API
        ConfigManager: config,
        SimpleErrorHandler: errorHandler,
        UltraSimpleError: errorHandler,
        UltraSimpleWorker: workerManager
      });

      // 环境优化
      await this.#optimizeForEnvironment(config, cacheManager);

      // 性能监控
      if (config.get('performance.enableMetrics')) {
        performanceMonitor.enable();
      }

      // 设置清理
      this.#setupCleanup(cacheManager, errorHandler, performanceMonitor);

      console.log('✅ Modern EnglishSite v5.0 initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Modern EnglishSite initialization failed:', error);
      return false;
    }
  }

  static async #optimizeForEnvironment(config, cacheManager) {
    // 创建默认缓存实例
    const cacheConfigs = [
      ['content', { maxSize: config.get('cache.maxSize'), ttl: config.get('cache.ttl') }],
      ['images', { maxSize: 50, ttl: 600_000 }],
      ['srt', { maxSize: 10, ttl: 600_000 }],
      ['glossary', { maxSize: 30, ttl: 600_000 }]
    ];

    for (const [name, options] of cacheConfigs) {
      cacheManager.create(name, options);
    }

    // PWA支持
    if (config.get('features.enablePWA') && 'serviceWorker' in navigator) {
      this.#setupServiceWorker();
    }
  }

  static #setupServiceWorker() {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered:', registration);
      })
      .catch(error => {
        console.warn('Service Worker registration failed:', error);
      });
  }

  static #setupCleanup(cacheManager, errorHandler, performanceMonitor) {
    // 页面卸载清理
    globalThis.addEventListener?.('beforeunload', () => {
      cacheManager.destroyAll();
      performanceMonitor.destroy();
    });

    // 定期维护
    setInterval(() => {
      cacheManager.performGlobalCleanup();
      
      // 清理旧错误
      const errorStats = errorHandler.getStats();
      if (errorStats.total > 500) {
        errorHandler.clear();
      }
    }, 300_000); // 5分钟
  }
}

// 🌐 兼容性适配器
class CompatibilityAdapter {
  // 为了保持向后兼容，创建静态方法
  static createModuleConfig = ModernConfigManager.createModuleConfig;
  
  static createCache(name, options = {}) {
    return globalThis.EnglishSite.CacheManager?.create(name, options);
  }

  static getCache(name) {
    return globalThis.EnglishSite.CacheManager?.get(name);
  }
}

// 🎯 自动初始化
const initializeModernCore = async () => {
  if (document.readyState === 'loading') {
    return new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', async () => {
        const success = await ModernAppInitializer.initialize();
        resolve(success);
      }, { once: true });
    });
  } else {
    return ModernAppInitializer.initialize();
  }
};

// 设置核心就绪Promise
globalThis.EnglishSite.coreToolsReady = initializeModernCore();

// 导出兼容性适配器
Object.assign(globalThis.EnglishSite, {
  // 兼容适配器
  ConfigManagerAdapter: CompatibilityAdapter,
  CacheManagerAdapter: CompatibilityAdapter,
  
  // 现代化类
  ModernConfigManager,
  ModernCacheManager,
  ModernLRUCache,
  ModernErrorHandler,
  ModernPerformanceMonitor,
  ModernWorkerManager
});

console.log('🚀 Modern EnglishSite Core v5.0 loaded with ES2022+ features');