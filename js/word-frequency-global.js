// 🔧 全局便捷函数修复版 - 供主系统集成调用
window.navigateToWordFrequency = function(options = {}) {
    console.log('🎯 启动词频分析工具...');
    
    try {
        // 🔧 修复1：优先使用App实例的词频管理器
        const useAppManager = window.app && typeof window.app.getWordFreqManager === 'function';
        
        if (useAppManager) {
            console.log('[Global] 🎯 使用App实例的词频管理器');
            return handleWordFreqWithAppManager(options);
        } else {
            console.log('[Global] 🔧 使用独立词频管理器');
            return handleWordFreqStandalone(options);
        }
        
    } catch (error) {
        console.error('❌ 词频工具启动异常:', error);
        showWordFreqError('工具启动失败: ' + error.message);
        return false;
    }
};

// 🔧 修复：使用App实例管理器的处理逻辑
async function handleWordFreqWithAppManager(options = {}) {
    try {
        // 1. 查找容器
        const container = findWordFreqContainer();
        if (!container) {
            throw new Error('未找到合适的词频容器');
        }

        // 2. 获取App实例的词频管理器
        console.log('[Global] 📡 获取App实例的词频管理器...');
        const manager = await window.app.getWordFreqManager();
        
        if (!manager) {
            throw new Error('App词频管理器不可用');
        }

        // 3. 检查UI类可用性
        if (!window.EnglishSite.WordFrequencyUI) {
            throw new Error('词频UI类不可用');
        }

        // 4. 清空容器并创建UI
        container.innerHTML = '';
        console.log('[Global] 🎨 创建词频UI...');
        
        const ui = new window.EnglishSite.WordFrequencyUI(container, manager);
        
        // 5. 等待UI初始化
        await ui.initialize();
        
        // 6. 更新全局引用
        window.wordFreqManager = manager;
        window.wordFreqUI = ui;
        
        console.log('[Global] ✅ 词频工具启动成功（使用App管理器）');
        return true;
        
    } catch (error) {
        console.error('[Global] ❌ App管理器模式失败:', error);
        showWordFreqError('使用App管理器启动失败: ' + error.message);
        return false;
    }
}

// 🔧 修复：独立模式的处理逻辑
async function handleWordFreqStandalone(options = {}) {
    try {
        // 1. 查找容器
        const container = findWordFreqContainer();
        if (!container) {
            throw new Error('未找到合适的词频容器');
        }

        // 2. 检查必要的类
        if (!window.EnglishSite.WordFrequencyManager || !window.EnglishSite.WordFrequencyUI) {
            throw new Error('词频系统类不可用');
        }

        // 3. 创建或复用管理器
        let manager = window.wordFreqManager;
        
        if (!manager || !manager.isInitialized) {
            console.log('[Global] 🆕 创建新的词频管理器...');
            
            // 尝试从App获取导航状态
            let navigationState = null;
            if (window.app && typeof window.app.getNavigationState === 'function') {
                try {
                    navigationState = window.app.getNavigationState();
                    console.log('[Global] 📊 获取到App导航状态');
                } catch (error) {
                    console.warn('[Global] ⚠️ 获取App导航状态失败:', error);
                }
            }
            
            manager = new window.EnglishSite.WordFrequencyManager(navigationState);
            window.wordFreqManager = manager;
        }

        // 4. 等待管理器准备就绪
        console.log('[Global] ⏳ 等待管理器准备就绪...');
        await manager.waitForReady();

        // 5. 清空容器并创建UI
        container.innerHTML = '';
        console.log('[Global] 🎨 创建词频UI...');
        
        const ui = new window.EnglishSite.WordFrequencyUI(container, manager);
        
        // 6. 等待UI初始化
        await ui.initialize();
        
        // 7. 更新全局引用
        window.wordFreqUI = ui;
        
        console.log('[Global] ✅ 词频工具启动成功（独立模式）');
        return true;
        
    } catch (error) {
        console.error('[Global] ❌ 独立模式失败:', error);
        showWordFreqError('独立模式启动失败: ' + error.message);
        return false;
    }
}

// 🔧 修复：统一的容器查找逻辑
function findWordFreqContainer() {
    console.log('[Global] 🔍 查找词频容器...');
    
    // 优先级排序的容器查找策略
    const containerStrategies = [
        // 策略1: 专用词频容器
        {
            name: '专用词频容器',
            selectors: ['#word-frequency-container', '.word-freq-container']
        },
        // 策略2: 主内容区域
        {
            name: '主内容区域',
            selectors: ['#content', 'main', '.main-content']
        },
        // 策略3: 通用容器
        {
            name: '通用容器',
            selectors: ['.container', '#app', 'body > div']
        }
    ];

    for (const strategy of containerStrategies) {
        console.log(`[Global] 🎯 尝试策略: ${strategy.name}`);
        
        for (const selector of strategy.selectors) {
            const container = document.querySelector(selector);
            if (container) {
                console.log(`[Global] ✅ 找到容器: ${selector} (策略: ${strategy.name})`);
                return container;
            }
        }
    }

    // 策略4: 创建新容器
    console.log('[Global] 🆕 创建新容器...');
    return createWordFreqContainer();
}

// 🔧 新增：创建词频容器
function createWordFreqContainer() {
    try {
        const container = document.createElement('div');
        container.id = 'word-frequency-container';
        container.style.cssText = `
            width: 100%; 
            height: 100%; 
            overflow: auto;
            background: #f8f9fa;
            min-height: 100vh;
        `;
        
        // 查找合适的父容器
        const parentCandidates = [
            document.querySelector('#content'),
            document.querySelector('main'),
            document.querySelector('.main-content'),
            document.body
        ];
        
        const parent = parentCandidates.find(el => el) || document.body;
        
        // 清空父容器并添加新容器
        if (parent !== document.body) {
            parent.innerHTML = '';
        }
        parent.appendChild(container);
        
        console.log('[Global] ✅ 已创建新的词频容器');
        return container;
        
    } catch (error) {
        console.error('[Global] ❌ 创建容器失败:', error);
        return null;
    }
}

// 🔧 修复：统一错误显示
function showWordFreqError(message) {
    // 尝试查找现有容器显示错误
    const container = findWordFreqContainer();
    
    const errorHTML = `
        <div class="word-freq-error" style="
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            min-height: 50vh; 
            padding: 40px 20px; 
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8f9fa;
        ">
            <div style="font-size: 72px; margin-bottom: 24px; opacity: 0.6;">🔤</div>
            <h2 style="color: #dc3545; margin-bottom: 16px; font-size: 24px;">词频分析工具启动失败</h2>
            <p style="color: #6c757d; margin-bottom: 20px; max-width: 600px; line-height: 1.5;">${message}</p>
            <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
                <button onclick="location.reload()" style="
                    padding: 12px 24px; 
                    background: #007bff; 
                    color: white; 
                    border: none; 
                    border-radius: 6px; 
                    cursor: pointer; 
                    font-weight: 600;
                    transition: background 0.3s;
                ">🔄 重新加载页面</button>
                <button onclick="window.location.hash = ''" style="
                    padding: 12px 24px; 
                    background: #6c757d; 
                    color: white; 
                    border: none; 
                    border-radius: 6px; 
                    cursor: pointer; 
                    font-weight: 600;
                    transition: background 0.3s;
                ">🏠 返回首页</button>
            </div>
            <div style="margin-top: 24px; font-size: 12px; color: #adb5bd;">
                错误时间: ${new Date().toLocaleString()} | 如问题持续，请联系技术支持
            </div>
        </div>
    `;

    if (container) {
        container.innerHTML = errorHTML;
    } else {
        // 使用全局错误提示作为后备
        if (window.EnglishSite?.UltraSimpleError?.showError) {
            window.EnglishSite.UltraSimpleError.showError('词频分析工具启动失败：' + message);
        } else {
            alert('词频分析工具启动失败：' + message);
        }
    }
}

// 🎯 章节难度API修复版 - 供主系统调用
window.getArticleDifficulty = function(articleId) {
    try {
        // 优先使用App实例的词频管理器
        if (window.app?.wordFreqManager?.isInitialized) {
            return window.app.wordFreqManager.getArticleDifficulty(articleId);
        }
        
        // 备选：使用全局词频管理器
        if (window.wordFreqManager?.isInitialized) {
            return window.wordFreqManager.getArticleDifficulty(articleId);
        } 
        
        // 降级：返回默认难度
        console.warn('词频管理器未就绪，返回默认难度');
        return { 
            stars: 3, 
            label: "⭐⭐⭐ 中等", 
            tooltip: "分析中..." 
        };
    } catch (error) {
        console.error('获取文章难度失败:', error);
        return { 
            stars: 3, 
            label: "⭐⭐⭐ 中等", 
            tooltip: "计算失败" 
        };
    }
};

// 🎯 词频查询API修复版 - 供其他模块调用
window.searchWords = function(query, mode = 'intelligent') {
    try {
        // 优先使用App实例的词频管理器
        let manager = null;
        
        if (window.app?.wordFreqManager?.isInitialized) {
            manager = window.app.wordFreqManager;
        } else if (window.wordFreqManager?.isInitialized) {
            manager = window.wordFreqManager;
        }
        
        if (!manager) {
            console.warn('词频管理器未就绪');
            return [];
        }
        
        if (mode === 'exact') {
            return manager.searchWordsExact(query);
        } else {
            return manager.searchWords(query);
        }
    } catch (error) {
        console.error('词频搜索失败:', error);
        return [];
    }
};

// 🔧 新增：全局状态检查函数
window.checkWordFreqStatus = function() {
    const status = {
        timestamp: new Date().toISOString(),
        appManager: {
            available: !!(window.app?.wordFreqManager),
            initialized: !!(window.app?.wordFreqManager?.isInitialized)
        },
        globalManager: {
            available: !!window.wordFreqManager,
            initialized: !!(window.wordFreqManager?.isInitialized)
        },
        ui: {
            available: !!window.wordFreqUI,
            initialized: !!(window.wordFreqUI?.isInitialized)
        },
        classes: {
            manager: !!window.EnglishSite?.WordFrequencyManager,
            ui: !!window.EnglishSite?.WordFrequencyUI,
            analyzer: !!window.EnglishSite?.SimplifiedWordFrequencyAnalyzer
        },
        navigation: {
            available: !!window.app?.navigation,
            hasState: !!(window.app?.navigation?.state),
            chaptersCount: window.app?.navigation?.state?.chaptersMap?.size || 0
        }
    };
    
    console.log('📊 词频系统状态:', status);
    return status;
};

// 🔧 新增：强制重新初始化函数
window.reinitializeWordFreq = async function() {
    console.log('🔄 强制重新初始化词频系统...');
    
    try {
        // 清理现有实例
        if (window.wordFreqUI?.destroy) {
            window.wordFreqUI.destroy();
        }
        if (window.wordFreqManager?.destroy) {
            window.wordFreqManager.destroy();
        }
        
        // 清理全局引用
        delete window.wordFreqUI;
        delete window.wordFreqManager;
        
        // 清理App实例引用
        if (window.app) {
            window.app.wordFreqManager = null;
        }
        
        console.log('🧹 清理完成，重新启动...');
        
        // 重新启动
        const success = await window.navigateToWordFrequency();
        
        if (success) {
            console.log('✅ 词频系统重新初始化成功');
        } else {
            console.error('❌ 词频系统重新初始化失败');
        }
        
        return success;
        
    } catch (error) {
        console.error('❌ 重新初始化过程中出错:', error);
        return false;
    }
};

console.log('🔧 词频系统全局函数已修复 - 支持App集成 + 独立模式双重运行');
