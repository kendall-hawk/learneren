// js/utils/module-loader.js - 智能模块懒加载系统
// 🎯 目标：按需加载，首屏性能提升60%+

class ModuleLoader {
    constructor() {
        this.loadedModules = new Set();
        this.loadingModules = new Map(); // Promise缓存
        this.preloadQueue = [];
        this.criticalModules = ['core', 'navigation']; // 关键模块
        
        // 性能监控
        this.loadTimes = new Map();
        this.dependencies = new Map();
        
        console.log('🚀 模块懒加载系统已初始化');
    }

    // 🎯 核心：智能模块加载
    async loadModule(moduleName, options = {}) {
        const startTime = performance.now();
        
        try {
            // 已加载检查
            if (this.loadedModules.has(moduleName)) {
                console.log(`📦 模块 ${moduleName} 已缓存`);
                return this.getModuleFromCache(moduleName);
            }

            // 正在加载检查（防止重复加载）
            if (this.loadingModules.has(moduleName)) {
                console.log(`⏳ 等待模块 ${moduleName} 加载完成`);
                return await this.loadingModules.get(moduleName);
            }

            // 开始加载
            console.log(`🔄 开始加载模块: ${moduleName}`);
            const loadPromise = this._performModuleLoad(moduleName, options);
            this.loadingModules.set(moduleName, loadPromise);

            const result = await loadPromise;
            
            // 记录性能
            const loadTime = performance.now() - startTime;
            this.loadTimes.set(moduleName, loadTime);
            console.log(`✅ 模块 ${moduleName} 加载完成 (${loadTime.toFixed(2)}ms)`);
            
            return result;

        } catch (error) {
            console.error(`❌ 模块 ${moduleName} 加载失败:`, error);
            this.loadingModules.delete(moduleName);
            throw error;
        } finally {
            this.loadingModules.delete(moduleName);
        }
    }

    // 🎯 执行模块加载
    async _performModuleLoad(moduleName, options) {
        const moduleConfig = this.getModuleConfig(moduleName);
        
        // 检查依赖
        if (moduleConfig.dependencies) {
            await this.loadDependencies(moduleConfig.dependencies);
        }

        // 动态导入
        const moduleExports = await this.dynamicImport(moduleConfig.path);
        
        // 初始化模块
        if (moduleConfig.initializer && moduleExports[moduleConfig.initializer]) {
            await moduleExports[moduleConfig.initializer](options);
        }

        // 注册到全局
        if (moduleConfig.globalName && moduleExports.default) {
            window.EnglishSite[moduleConfig.globalName] = moduleExports.default;
        }

        this.loadedModules.add(moduleName);
        return moduleExports;
    }

    // 🎯 动态导入实现
    async dynamicImport(scriptPath) {
        try {
            // 优先使用ES模块导入
            if (this.supportsESModules()) {
                return await import(scriptPath);
            } else {
                // 降级到脚本标签加载
                return await this.loadScript(scriptPath);
            }
        } catch (error) {
            console.warn(`ES模块导入失败，降级到传统加载: ${scriptPath}`);
            return await this.loadScript(scriptPath);
        }
    }

    // 🎯 传统脚本加载（兼容性支持）
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                // 从全局获取模块
                const moduleName = this.getModuleNameFromPath(src);
                const moduleExports = this.extractModuleFromGlobal(moduleName);
                resolve(moduleExports);
            };
            
            script.onerror = () => reject(new Error(`Script load failed: ${src}`));
            
            document.head.appendChild(script);
        });
    }

    // 🎯 从全局提取模块
    extractModuleFromGlobal(moduleName) {
        const config = this.getModuleConfig(moduleName);
        if (config.globalName && window.EnglishSite?.[config.globalName]) {
            return { default: window.EnglishSite[config.globalName] };
        }
        return { default: null };
    }

    // 🎯 模块配置
    getModuleConfig(moduleName) {
        const configs = {
            // 核心模块（已加载）
            core: {
                path: 'js/core.js',
                globalName: 'ConfigManager',
                critical: true
            },

            // 导航模块
            navigation: {
                path: 'js/navigation.js',
                globalName: 'Navigation',
                dependencies: ['core'],
                critical: true
            },

            // 功能模块（懒加载）
            glossary: {
                path: 'js/glossary.js',
                globalName: 'Glossary',
                dependencies: ['core'],
                preload: true // 预加载候选
            },

            audioSync: {
                path: 'js/audio-sync.js',
                globalName: 'AudioSync',
                dependencies: ['core'],
                preload: false // 按需加载
            },

            // 词频模块（大型模块，懒加载）
            wordFrequency: {
                path: 'js/word-frequency.js',
                globalName: 'WordFrequencyManager',
                dependencies: ['core'],
                preload: false,
                heavy: true // 标记为重型模块
            },

            wordFrequencyUI: {
                path: 'js/word-frequency-ui.js',
                globalName: 'WordFrequencyUI',
                dependencies: ['wordFrequency'],
                preload: false,
                heavy: true
            },

            // 高亮模块
            wordHighlight: {
                path: 'js/word-highlight.js',
                globalName: 'WordHighlight',
                dependencies: ['core'],
                preload: true
            }
        };

        return configs[moduleName] || {
            path: `js/${moduleName}.js`,
            globalName: moduleName,
            dependencies: ['core']
        };
    }

    // 🎯 依赖加载
    async loadDependencies(dependencies) {
        const loadPromises = dependencies.map(dep => this.loadModule(dep));
        await Promise.all(loadPromises);
    }

    // 🎯 预加载系统
    async preloadModules() {
        console.log('🔮 开始预加载模块...');
        
        const preloadCandidates = Object.entries(this.getModuleConfig())
            .filter(([_, config]) => config.preload)
            .map(([name]) => name);

        // 使用requestIdleCallback进行智能预加载
        if (window.requestIdleCallback) {
            window.requestIdleCallback(() => {
                this.performIdlePreload(preloadCandidates);
            }, { timeout: 5000 });
        } else {
            // 降级到setTimeout
            setTimeout(() => {
                this.performIdlePreload(preloadCandidates);
            }, 2000);
        }
    }

    // 🎯 空闲时预加载
    async performIdlePreload(modules) {
        for (const moduleName of modules) {
            try {
                if (!this.loadedModules.has(moduleName)) {
                    console.log(`🔮 预加载模块: ${moduleName}`);
                    await this.loadModule(moduleName);
                    
                    // 避免阻塞主线程
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (error) {
                console.warn(`预加载失败: ${moduleName}`, error);
            }
        }
    }

    // 🎯 按功能分组加载
    async loadFeatureGroup(groupName) {
        const groups = {
            reading: ['glossary', 'wordHighlight'],
            audio: ['audioSync', 'glossary'],
            analysis: ['wordFrequency', 'wordFrequencyUI'],
            core: ['navigation']
        };

        const modules = groups[groupName] || [];
        console.log(`📦 加载功能组: ${groupName} (${modules.length}个模块)`);

        const loadPromises = modules.map(module => this.loadModule(module));
        const results = await Promise.allSettled(loadPromises);
        
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        console.log(`✅ 功能组 ${groupName} 加载完成: ${succeeded}/${modules.length}`);
        
        return results;
    }

    // 🎯 缓存管理
    getModuleFromCache(moduleName) {
        const config = this.getModuleConfig(moduleName);
        if (config.globalName && window.EnglishSite?.[config.globalName]) {
            return { default: window.EnglishSite[config.globalName] };
        }
        return null;
    }

    // 🎯 工具方法
    supportsESModules() {
        try {
            new Function('import("")');
            return true;
        } catch {
            return false;
        }
    }

    getModuleNameFromPath(path) {
        return path.split('/').pop().replace('.js', '');
    }

    // 🎯 性能统计
    getPerformanceStats() {
        const totalLoadTime = Array.from(this.loadTimes.values())
            .reduce((sum, time) => sum + time, 0);

        return {
            loadedModules: Array.from(this.loadedModules),
            totalModules: this.loadedModules.size,
            totalLoadTime: Math.round(totalLoadTime),
            averageLoadTime: Math.round(totalLoadTime / this.loadedModules.size) || 0,
            moduleDetails: Object.fromEntries(this.loadTimes),
            esModulesSupported: this.supportsESModules()
        };
    }

    // 🎯 清理资源
    cleanup() {
        this.loadingModules.clear();
        this.preloadQueue.length = 0;
        console.log('🧹 模块加载器已清理');
    }
}

// 🌐 全局实例
window.EnglishSite = window.EnglishSite || {};
window.EnglishSite.ModuleLoader = new ModuleLoader();

// 🎯 便捷API
window.loadModule = (name, options) => window.EnglishSite.ModuleLoader.loadModule(name, options);
window.loadFeatureGroup = (group) => window.EnglishSite.ModuleLoader.loadFeatureGroup(group);

export default ModuleLoader;
