/**
 * 🎵 音频同步系统 - 稳定重构版 v3.0
 * 
 * 特性：
 * - 稳定的ES2020语法
 * - 简化的初始化流程
 * - 增强的错误处理和兼容性
 * - 高性能缓存和DOM优化
 * - 智能高亮决策系统
 * 
 * @author Stable Audio Sync
 * @version 3.0.0
 * @date 2025-01-09
 */

window.EnglishSite = window.EnglishSite || {};

class AudioSync {
    constructor(contentArea, srtText, audioPlayer, options = {}) {
        console.log('[AudioSync] 🎵 开始初始化稳定版音频同步...');
        
        // 基础属性
        this.contentArea = contentArea;
        this.audioPlayer = audioPlayer;
        this.srtText = srtText;
        this.options = options || {};
        
        // 常量定义（避免静态私有字段）
        this.HIGHLIGHT_CLASS = 'highlighted';
        this.SENTENCE_ID_ATTR = 'data-sentence-id';
        
        // 初始化状态
        this.isInitialized = false;
        this.initializationError = null;
        
        // 开始初始化
        this.initPromise = this.initialize();
    }

    async initialize() {
        try {
            console.log('[AudioSync] 🔧 等待核心工具就绪...');
            
            // 等待核心工具
            if (window.EnglishSite.coreToolsReady) {
                await window.EnglishSite.coreToolsReady;
            }
            
            console.log('[AudioSync] ✅ 核心工具就绪，开始配置...');
            
            // 配置管理
            this.config = this.createConfig();
            
            // 性能配置
            this.performanceOpts = {
                timeTolerance: 0.15,
                searchTolerance: 1.0,
                updateThrottle: 20,
                preloadBuffer: 2,
                maxSearchRange: 10,
                batchSize: 5
            };
            
            // DOM查找策略
            this.domStrategies = [
                (id) => `[data-sentence-id="${id}"]`,
                (id) => `[data-sentence-id="s${id}"]`,
                (id) => `#sentence-${id}`,
                (id) => `#s${id}`,
                (id) => `[id="${id}"]`
            ];
            
            // 缓存系统
            this.cache = {
                elements: new Map(),
                strategies: new Map(),
                layouts: new Map(),
                timeIndex: new Map(),
                lastStrategy: 0,
                hit: 0,
                miss: 0
            };

            // 状态管理
            this.state = {
                srtData: [],
                timeIndex: [],
                currentIndex: -1,
                lastElement: null,
                timeOffset: this.config.offset || 0,
                autoscroll: this.config.autoscroll !== false,
                lastUpdateTime: 0,
                lastProcessedTime: -1,
                isUpdating: false,
                updateFrame: null
            };
            
            console.log('[AudioSync] 📊 验证必需参数...');
            
            // 验证参数
            if (!this.contentArea || !this.audioPlayer || !this.srtText) {
                throw new Error('AudioSync: Missing required arguments (contentArea, audioPlayer, or srtText)');
            }

            const perfId = this.startPerformanceMeasure('audioSyncInit');
            
            console.log('[AudioSync] 📝 开始解析SRT数据...');
            
            // 核心初始化步骤
            await this.parseSRTData();
            await this.preCacheDOMElements();
            await this.preAnalyzeLayouts();
            
            this.addEventListeners();
            
            this.endPerformanceMeasure(perfId);
            
            this.isInitialized = true;
            
            console.log('[AudioSync] ✅ 稳定版音频同步初始化完成:', {
                srtCueCount: this.state.srtData.length,
                cachedElements: this.cache.elements.size,
                cacheHitRate: this.getCacheHitRate(),
                workerUsed: this.workerUsed || false
            });
            
        } catch (error) {
            this.initializationError = error;
            console.error('[AudioSync] ❌ 初始化失败:', error);
            
            // 记录错误
            if (window.EnglishSite.SimpleErrorHandler) {
                window.EnglishSite.SimpleErrorHandler.record('audioSync', 'initialization', error);
            }
            
            // 显示用户友好的错误信息
            if (window.EnglishSite.UltraSimpleError) {
                window.EnglishSite.UltraSimpleError.showError('音频同步初始化失败，请刷新页面重试');
            }
            
            throw error;
        }
    }

    // 🔧 创建配置（兼容性优先）
    createConfig() {
        try {
            // 尝试使用现代配置管理
            if (window.EnglishSite.ConfigManager && window.EnglishSite.ConfigManager.createModuleConfig) {
                return window.EnglishSite.ConfigManager.createModuleConfig('audioSync', {
                    offset: this.options.offset || 0,
                    autoscroll: this.options.autoscroll !== false,
                    enableWorkers: this.options.enableWorkers !== false && typeof Worker !== 'undefined',
                    workerTimeout: this.options.workerTimeout || 15000,
                    debug: this.options.debug || window.location.hostname === 'localhost',
                    ...this.options
                });
            }
            
            // 降级到简单配置
            return {
                offset: this.options.offset || 0,
                autoscroll: this.options.autoscroll !== false,
                enableWorkers: this.options.enableWorkers !== false && typeof Worker !== 'undefined',
                workerTimeout: this.options.workerTimeout || 15000,
                debug: this.options.debug || window.location.hostname === 'localhost'
            };
        } catch (error) {
            console.warn('[AudioSync] 配置创建失败，使用默认配置:', error);
            return {
                offset: 0,
                autoscroll: true,
                enableWorkers: typeof Worker !== 'undefined',
                workerTimeout: 15000,
                debug: false
            };
        }
    }

    // 📊 性能测量辅助方法
    startPerformanceMeasure(name) {
        try {
            if (window.EnglishSite.PerformanceMonitor && window.EnglishSite.PerformanceMonitor.startMeasure) {
                return window.EnglishSite.PerformanceMonitor.startMeasure(name, 'audioSync');
            }
        } catch (error) {
            console.warn('[AudioSync] 性能测量启动失败:', error);
        }
        return null;
    }

    endPerformanceMeasure(perfId) {
        try {
            if (perfId && window.EnglishSite.PerformanceMonitor && window.EnglishSite.PerformanceMonitor.endMeasure) {
                window.EnglishSite.PerformanceMonitor.endMeasure(perfId);
            }
        } catch (error) {
            console.warn('[AudioSync] 性能测量结束失败:', error);
        }
    }

    // 📝 SRT数据解析
    async parseSRTData() {
        const parseId = this.startPerformanceMeasure('srtParse');
        
        try {
            console.log('[AudioSync] 🔄 解析SRT数据...');
            
            // 尝试Worker解析
            if (this.config.enableWorkers && window.EnglishSite.UltraSimpleWorker) {
                try {
                    console.log('[AudioSync] 🚀 尝试Worker解析...');
                    
                    const result = await window.EnglishSite.UltraSimpleWorker.safeExecute(
                        'js/workers/ultra-simple-srt.worker.js',
                        { srtText: this.srtText },
                        (data) => this.parseSRTMainThread(data.srtText)
                    );
                    
                    this.state.srtData = result || [];
                    this.workerUsed = true;
                    
                    console.log('[AudioSync] ✅ Worker解析成功');
                } catch (error) {
                    console.warn('[AudioSync] ⚠️ Worker解析失败，使用主线程:', error);
                    this.state.srtData = this.parseSRTMainThread(this.srtText);
                    this.workerUsed = false;
                }
            } else {
                console.log('[AudioSync] 🔧 使用主线程解析...');
                this.state.srtData = this.parseSRTMainThread(this.srtText);
                this.workerUsed = false;
            }
            
            // 构建时间索引
            this.buildTimeIndex();
            
            console.log(`[AudioSync] ✅ SRT解析完成: ${this.state.srtData.length} 个字幕段`);
            
        } catch (error) {
            console.error('[AudioSync] ❌ SRT解析失败:', error);
            
            if (window.EnglishSite.SimpleErrorHandler) {
                window.EnglishSite.SimpleErrorHandler.record('audioSync', 'srtParse', error);
            }
            
            throw error;
        } finally {
            this.endPerformanceMeasure(parseId);
        }
    }

    // 🔧 主线程SRT解析
    parseSRTMainThread(srtText) {
        try {
            if (!srtText || typeof srtText !== 'string') {
                throw new Error('Invalid SRT text');
            }
            
            const blocks = srtText.replace(/\r\n/g, '\n').trim().split('\n\n');
            const cues = [];
            
            console.log(`[AudioSync] 📊 处理 ${blocks.length} 个SRT块...`);
            
            for (let i = 0; i < blocks.length; i++) {
                try {
                    const lines = blocks[i].split('\n');
                    if (lines.length < 2) continue;

                    const id = lines[0].trim();
                    const timeLine = lines[1];
                    
                    if (timeLine && timeLine.includes('-->')) {
                        const arrowIndex = timeLine.indexOf('-->');
                        const startTimeStr = timeLine.substring(0, arrowIndex).trim();
                        const endTimeStr = timeLine.substring(arrowIndex + 3).trim();
                        
                        const startTime = this.timeToSeconds(startTimeStr);
                        const endTime = this.timeToSeconds(endTimeStr);
                        
                        if (!isNaN(startTime) && !isNaN(endTime) && endTime > startTime) {
                            cues.push({
                                id: id,
                                startTime: startTime,
                                endTime: endTime
                            });
                        }
                    }
                } catch (error) {
                    console.warn(`[AudioSync] ⚠️ 跳过无效的SRT块 ${i}:`, error);
                }
            }
            
            console.log(`[AudioSync] ✅ 成功解析 ${cues.length} 个有效字幕段`);
            return cues;
            
        } catch (error) {
            console.error('[AudioSync] ❌ 主线程SRT解析失败:', error);
            return [];
        }
    }

    // ⏰ 时间转换
    timeToSeconds(timeString) {
        // 简单缓存
        if (this.cache.timeIndex.has(timeString)) {
            return this.cache.timeIndex.get(timeString);
        }
        
        try {
            const colonIndex1 = timeString.indexOf(':');
            const colonIndex2 = timeString.indexOf(':', colonIndex1 + 1);
            const commaIndex = timeString.indexOf(',', colonIndex2);
            
            if (colonIndex1 === -1 || colonIndex2 === -1 || commaIndex === -1) {
                throw new Error('Invalid time format');
            }
            
            const hh = parseInt(timeString.substring(0, colonIndex1), 10);
            const mm = parseInt(timeString.substring(colonIndex1 + 1, colonIndex2), 10);
            const ss = parseInt(timeString.substring(colonIndex2 + 1, commaIndex), 10);
            const ms = parseInt(timeString.substring(commaIndex + 1), 10);
            
            const result = hh * 3600 + mm * 60 + ss + ms / 1000;
            
            // 限制缓存大小
            if (this.cache.timeIndex.size < 200) {
                this.cache.timeIndex.set(timeString, result);
            }
            
            return result;
        } catch (error) {
            console.warn('[AudioSync] ⚠️ 时间转换失败:', timeString, error);
            return 0;
        }
    }

    // 📊 构建时间索引
    buildTimeIndex() {
        try {
            this.state.timeIndex = this.state.srtData.map((cue, i) => ({
                start: cue.startTime,
                end: cue.endTime,
                index: i,
                id: cue.id
            }));
            
            // 按开始时间排序
            this.state.timeIndex.sort((a, b) => a.start - b.start);
            
            console.log(`[AudioSync] 📊 时间索引构建完成: ${this.state.timeIndex.length} 项`);
        } catch (error) {
            console.error('[AudioSync] ❌ 时间索引构建失败:', error);
            this.state.timeIndex = [];
        }
    }
    
    // 🗂️ 预缓存DOM元素
    async preCacheDOMElements() {
        const cacheId = this.startPerformanceMeasure('preCacheDOM');
        
        try {
            console.log('[AudioSync] 🗂️ 开始预缓存DOM元素...');
            
            // 一次性获取所有候选元素
            const allElements = this.contentArea.querySelectorAll(`[${this.SENTENCE_ID_ATTR}]`);
            const elementMap = new Map();

            console.log(`[AudioSync] 📊 找到 ${allElements.length} 个候选元素`);

            // 批量处理
            for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i];
                let id = el.dataset.sentenceId;
                if (id && id.startsWith('s')) {
                    id = id.slice(1);
                }
                if (id) {
                    elementMap.set(id, el);
                }
            }

            // 按批次缓存元素
            let cached = 0;
            for (let i = 0; i < this.state.srtData.length; i += this.performanceOpts.batchSize) {
                const batch = this.state.srtData.slice(i, i + this.performanceOpts.batchSize);
                
                for (const cue of batch) {
                    const el = elementMap.get(cue.id);
                    if (el) {
                        this.cache.elements.set(cue.id, el);
                        cached++;
                    }
                }
                
                // 让出主线程
                if (i % (this.performanceOpts.batchSize * 4) === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
            
            console.log(`[AudioSync] ✅ DOM元素预缓存完成: ${cached}/${this.state.srtData.length}`);
            
        } catch (error) {
            console.error('[AudioSync] ❌ DOM预缓存失败:', error);
            
            if (window.EnglishSite.SimpleErrorHandler) {
                window.EnglishSite.SimpleErrorHandler.record('audioSync', 'preCacheDOM', error);
            }
        } finally {
            this.endPerformanceMeasure(cacheId);
        }
    }

    // 🎨 预分析布局
    async preAnalyzeLayouts() {
        const analysisId = this.startPerformanceMeasure('preAnalyzeLayouts');
        
        try {
            console.log('[AudioSync] 🎨 开始预分析布局...');
            
            // 只分析前10个元素
            const elementsToAnalyze = Math.min(10, this.state.srtData.length);
            
            for (let i = 0; i < elementsToAnalyze; i++) {
                const cue = this.state.srtData[i];
                const element = this.cache.elements.get(cue.id);
                
                if (element) {
                    const layoutInfo = this.getElementLayoutInfo(element);
                    this.cache.layouts.set(cue.id, layoutInfo);
                }
                
                // 每分析5个元素就让出主线程
                if (i % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
            
            console.log(`[AudioSync] ✅ 预分析布局完成: ${this.cache.layouts.size} 个元素`);
            
        } catch (error) {
            console.error('[AudioSync] ❌ 布局预分析失败:', error);
            
            if (window.EnglishSite.SimpleErrorHandler) {
                window.EnglishSite.SimpleErrorHandler.record('audioSync', 'preAnalyzeLayouts', error);
            }
        } finally {
            this.endPerformanceMeasure(analysisId);
        }
    }

    // 🎧 事件监听器
    addEventListeners() {
        try {
            console.log('[AudioSync] 🎧 添加事件监听器...');
            
            if (this.audioPlayer) {
                // 使用箭头函数避免bind开销
                this.audioPlayer.addEventListener('timeupdate', (e) => this.handleTimeUpdate(e), { passive: true });
                this.audioPlayer.addEventListener('ended', () => this.handleAudioEnded(), { passive: true });
                this.audioPlayer.addEventListener('error', (e) => this.handleAudioError(e), { passive: true });
            }
            
            if (this.contentArea) {
                this.contentArea.addEventListener('click', (e) => this.handleTextClick(e), { passive: true });
            }
            
            console.log('[AudioSync] ✅ 事件监听器添加完成');
        } catch (error) {
            console.error('[AudioSync] ❌ 事件监听器添加失败:', error);
        }
    }

    // 🔄 时间更新处理
    handleTimeUpdate() {
        // 防重入检查
        if (this.state.isUpdating) return;
        
        try {
            if (!this.audioPlayer || this.audioPlayer.paused) return;
            
            const now = performance.now();
            if (now - this.state.lastUpdateTime < this.performanceOpts.updateThrottle) return;
            
            this.state.lastUpdateTime = now;
            this.state.isUpdating = true;
            
            const currentTime = this.audioPlayer.currentTime + this.state.timeOffset;
            
            // 只在时间有显著变化时更新
            if (Math.abs(currentTime - this.state.lastProcessedTime) < 0.05) {
                this.state.isUpdating = false;
                return;
            }
            
            this.state.lastProcessedTime = currentTime;
            
            // 查找当前字幕
            const newIndex = this.findCueIndex(currentTime);
            
            if (newIndex !== this.state.currentIndex) {
                // 使用requestAnimationFrame确保平滑更新
                if (this.state.updateFrame) {
                    cancelAnimationFrame(this.state.updateFrame);
                }
                
                this.state.updateFrame = requestAnimationFrame(() => {
                    this.updateHighlight(newIndex);
                    this.state.currentIndex = newIndex;
                    this.state.isUpdating = false;
                    this.state.updateFrame = null;
                });
            } else {
                this.state.isUpdating = false;
            }
            
        } catch (error) {
            this.state.isUpdating = false;
            console.warn('[AudioSync] ⚠️ 时间更新处理失败:', error);
        }
    }

    // 🔍 查找字幕索引
    findCueIndex(time) {
        try {
            const timeIndex = this.state.timeIndex;
            if (!timeIndex.length) return -1;
            
            // 局部搜索优化
            if (this.state.currentIndex >= 0) {
                const searchStart = Math.max(0, this.state.currentIndex - 2);
                const searchEnd = Math.min(timeIndex.length - 1, this.state.currentIndex + 3);
                
                for (let i = searchStart; i <= searchEnd; i++) {
                    const cue = this.state.srtData[timeIndex[i].index];
                    if (time >= (cue.startTime - this.performanceOpts.timeTolerance) && 
                        time <= (cue.endTime + this.performanceOpts.timeTolerance)) {
                        return timeIndex[i].index;
                    }
                }
            }
            
            // 二分查找
            let left = 0;
            let right = timeIndex.length - 1;
            let bestMatch = -1;
            let bestDistance = Infinity;
            
            while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                const entry = timeIndex[mid];
                const cue = this.state.srtData[entry.index];
                
                if (time >= (cue.startTime - this.performanceOpts.timeTolerance) && 
                    time <= (cue.endTime + this.performanceOpts.timeTolerance)) {
                    return entry.index;
                }
                
                // 寻找最佳匹配
                const startDistance = Math.abs(time - cue.startTime);
                const endDistance = Math.abs(time - cue.endTime);
                const minDistance = Math.min(startDistance, endDistance);
                
                if (minDistance < bestDistance && minDistance < this.performanceOpts.searchTolerance) {
                    bestDistance = minDistance;
                    bestMatch = entry.index;
                }
                
                if (time < cue.startTime) {
                    right = mid - 1;
                } else {
                    left = mid + 1;
                }
            }
            
            return bestMatch;
            
        } catch (error) {
            console.warn('[AudioSync] ⚠️ 字幕索引查找失败:', error);
            return -1;
        }
    }

    // 🖱️ 文本点击处理
    handleTextClick(event) {
        try {
            if (event.target.closest('.glossary-term')) return;

            const target = event.target.closest(`[${this.SENTENCE_ID_ATTR}]`);
            if (!target) return;

            let id = target.dataset.sentenceId;
            if (id && id.startsWith('s')) {
                id = id.slice(1);
            }

            const cueIndex = this.state.srtData.findIndex(c => c.id === id);
            if (cueIndex === -1) return;
            
            if (this.state.currentIndex === cueIndex && !this.isPaused()) return;
            
            const cue = this.state.srtData[cueIndex];
            this.state.currentIndex = cueIndex;
            this.audioPlayer.currentTime = Math.max(0, cue.startTime - this.state.timeOffset);
            this.play();
            this.updateHighlight(cueIndex);
        } catch (error) {
            console.warn('[AudioSync] ⚠️ 文本点击处理失败:', error);
        }
    }

    // 🔚 音频结束处理
    handleAudioEnded() {
        try {
            if (this.state.lastElement) {
                this.removeHighlight(this.state.lastElement);
            }
            this.state.currentIndex = -1;
            this.state.lastElement = null;
        } catch (error) {
            console.warn('[AudioSync] ⚠️ 音频结束处理失败:', error);
        }
    }

    // ❌ 音频错误处理
    handleAudioError(event) {
        console.error('[AudioSync] ❌ 音频错误:', event);
        
        if (window.EnglishSite.SimpleErrorHandler) {
            window.EnglishSite.SimpleErrorHandler.record('audioSync', 'audioError', 
                event.error || new Error('Audio error'));
        }
        
        if (window.EnglishSite.UltraSimpleError) {
            window.EnglishSite.UltraSimpleError.showError('音频播放出现问题');
        }
    }

    // 🔍 查找DOM元素
    findElement(cueId) {
        try {
            // 缓存命中
            if (this.cache.elements.has(cueId)) {
                const element = this.cache.elements.get(cueId);
                if (document.contains(element)) {
                    this.cache.hit++;
                    return element;
                } else {
                    this.cache.elements.delete(cueId);
                }
            }
            
            this.cache.miss++;
            
            // 策略缓存
            let element = null;
            const cachedStrategy = this.cache.strategies.get(cueId);
            
            if (cachedStrategy !== undefined) {
                const selector = this.domStrategies[cachedStrategy](cueId);
                element = this.contentArea.querySelector(selector);
                if (element) {
                    this.cache.elements.set(cueId, element);
                    return element;
                }
            }
            
            // 遍历策略
            for (let i = 0; i < this.domStrategies.length; i++) {
                if (i === cachedStrategy) continue;
                
                const selector = this.domStrategies[i](cueId);
                element = this.contentArea.querySelector(selector);
                
                if (element) {
                    this.cache.elements.set(cueId, element);
                    this.cache.strategies.set(cueId, i);
                    this.cache.lastStrategy = i;
                    return element;
                }
            }
            
            // 模糊搜索
            if (!element) {
                element = this.fuzzySearch(cueId);
                if (element) {
                    this.cache.elements.set(cueId, element);
                }
            }
            
            return element;
            
        } catch (error) {
            console.warn('[AudioSync] ⚠️ 元素查找失败:', cueId, error);
            return null;
        }
    }

    // 🔍 模糊搜索
    fuzzySearch(cueId) {
        try {
            const selectors = [
                `[id*="${cueId}"]`,
                `[class*="sentence-${cueId}"]`,
                `[class*="s${cueId}"]`
            ];
            
            for (const selector of selectors) {
                const element = this.contentArea.querySelector(selector);
                if (element) return element;
            }
            
            return null;
        } catch (error) {
            console.warn('[AudioSync] ⚠️ 模糊搜索失败:', cueId, error);
            return null;
        }
    }

    // ✨ 更新高亮
    updateHighlight(index) {
        try {
            // 移除之前的高亮
            if (this.state.lastElement) {
                this.removeHighlight(this.state.lastElement);
            }

            if (index === -1) {
                this.state.lastElement = null;
                return;
            }
            
            const cue = this.state.srtData[index];
            if (!cue) return;
            
            const element = this.findElement(cue.id);
            
            if (element) {
                this.applySmartHighlight(element, cue.id);
                this.state.lastElement = element;
                
                // 自动滚动
                if (this.state.autoscroll) {
                    this.scrollToElement(element);
                }
                
                if (this.config.debug) {
                    console.log(`[AudioSync] ✨ 高亮: ${cue.id} (${cue.startTime.toFixed(1)}s)`);
                }
                
            } else if (this.config.debug) {
                console.warn(`[AudioSync] ⚠️ 元素未找到: ${cue.id}`);
            }
            
        } catch (error) {
            console.warn('[AudioSync] ⚠️ 高亮更新失败:', error);
        }
    }

    // 🎨 智能高亮决策
    applySmartHighlight(element, cueId) {
        try {
            // 获取布局信息
            let layoutInfo = this.cache.layouts.get(cueId);
            if (!layoutInfo) {
                layoutInfo = this.getElementLayoutInfo(element);
                this.cache.layouts.set(cueId, layoutInfo);
            }
            
            // 智能决策
            if (layoutInfo.isDenseText && layoutInfo.isInline && layoutInfo.hasSiblings) {
                this.applyMinimalHighlight(element);
            } else if (layoutInfo.isInline && layoutInfo.hasSiblings) {
                this.applyMediumHighlight(element);
            } else if (layoutInfo.isInParagraph && layoutInfo.parentWidth > 0 && 
                       layoutInfo.elementWidth / layoutInfo.parentWidth > 0.8) {
                this.applyAdvancedHighlight(element);
            } else {
                this.applyStandardHighlight(element);
            }
        } catch (error) {
            console.warn('[AudioSync] ⚠️ 智能高亮失败，使用默认高亮:', error);
            this.applyStandardHighlight(element);
        }
    }

    // 📊 获取元素布局信息
    getElementLayoutInfo(element) {
        try {
            const computedStyle = getComputedStyle(element);
            const parentP = element.closest('p');
            const parentContainer = element.closest('div, section, article') || element.parentElement;
            
            return {
                isInline: computedStyle.display === 'inline' || computedStyle.display === 'inline-block',
                isInParagraph: !!parentP,
                hasSiblings: parentP ? parentP.children.length > 1 : false,
                parentWidth: parentContainer ? parentContainer.offsetWidth : 0,
                elementWidth: element.offsetWidth,
                elementHeight: element.offsetHeight,
                position: computedStyle.position,
                isDenseText: this.isDenseTextEnvironment(element)
            };
        } catch (error) {
            console.warn('[AudioSync] ⚠️ 布局信息获取失败:', error);
            return {};
        }
    }

    // 📝 检测密集文本环境
    isDenseTextEnvironment(element) {
        try {
            const parent = element.parentElement;
            if (!parent) return false;
            
            const textNodes = Array.from(parent.childNodes).filter(node => 
                node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
            );
            
            const elementNodes = Array.from(parent.children);
            
            return textNodes.length >= elementNodes.length;
        } catch (error) {
            return false;
        }
    }

    // 🎨 高亮样式应用方法
    applyMinimalHighlight(element) {
        this.clearHighlightClasses(element);
        element.classList.add('highlighted-minimal', 'highlight-fade-in');
    }

    applyMediumHighlight(element) {
        this.clearHighlightClasses(element);
        element.classList.add('highlighted-medium', 'highlight-fade-in');
    }

    applyStandardHighlight(element) {
        this.clearHighlightClasses(element);
        element.classList.add('highlighted-standard', 'highlight-fade-in');
    }

    applyAdvancedHighlight(element) {
        this.clearHighlightClasses(element);
        element.classList.add('highlighted-advanced', 'highlight-fade-in');
    }

    clearHighlightClasses(element) {
        try {
            element.classList.remove(
                'highlighted', 
                'highlighted-minimal', 
                'highlighted-medium',
                'highlighted-standard',
                'highlighted-advanced',
                'highlight-fade-in',
                'highlight-fade-out'
            );
            element.offsetHeight; // 强制重绘
        } catch (error) {
            console.warn('[AudioSync] ⚠️ 清理高亮类失败:', error);
        }
    }

    // 🗑️ 移除高亮
    removeHighlight(element) {
        try {
            if (!element) return;
            
            element.classList.add('highlight-fade-out');
            element.classList.remove('highlight-fade-in');
            
            setTimeout(() => {
                this.clearHighlightClasses(element);
            }, 150);
        } catch (error) {
            console.warn('[AudioSync] ⚠️ 移除高亮失败:', error);
        }
    }

    // 📜 滚动到元素
    scrollToElement(element) {
        try {
            const rect = element.getBoundingClientRect();
            const containerRect = this.contentArea.getBoundingClientRect();
            
            const isVisible = (
                rect.top >= containerRect.top + 30 &&
                rect.bottom <= containerRect.bottom - 30
            );
            
            if (!isVisible) {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest'
                });
            }
        } catch (error) {
            console.warn('[AudioSync] ⚠️ 滚动失败:', error);
        }
    }

    // 📊 获取缓存命中率
    getCacheHitRate() {
        const total = this.cache.hit + this.cache.miss;
        return total > 0 ? `${(this.cache.hit / total * 100).toFixed(1)}%` : '0%';
    }

    // === 公共API方法 ===

    async waitForInitialization() {
        return this.initPromise;
    }

    play() {
        try {
            if (this.audioPlayer) {
                this.audioPlayer.play();
            }
        } catch (error) {
            console.warn('[AudioSync] ⚠️ 播放失败:', error);
        }
    }

    pause() {
        try {
            if (this.audioPlayer) {
                this.audioPlayer.pause();
            }
        } catch (error) {
            console.warn('[AudioSync] ⚠️ 暂停失败:', error);
        }
    }

    isPaused() {
        try {
            return this.audioPlayer ? this.audioPlayer.paused : true;
        } catch (error) {
            return true;
        }
    }

    toggleAutoscroll(enabled) {
        this.state.autoscroll = typeof enabled === 'boolean' ? enabled : !this.state.autoscroll;
        return this.state.autoscroll;
    }
    
    setPlaybackRate(rate) {
        try {
            if (this.audioPlayer) {
                this.audioPlayer.playbackRate = rate;
            }
        } catch (error) {
            console.warn('[AudioSync] ⚠️ 设置播放速度失败:', error);
        }
    }
    
    getPlaybackRate() {
        try {
            return this.audioPlayer ? this.audioPlayer.playbackRate : 1;
        } catch (error) {
            return 1;
        }
    }

    getCacheStats() {
        return {
            elements: this.cache.elements.size,
            strategies: this.cache.strategies.size,
            layouts: this.cache.layouts.size,
            timeIndex: this.cache.timeIndex.size,
            hitRate: this.getCacheHitRate(),
            hits: this.cache.hit,
            misses: this.cache.miss
        };
    }

    getHighlightStats() {
        const stats = {
            totalElements: this.cache.elements.size,
            cachedStrategies: this.cache.strategies.size,
            cachedLayouts: this.cache.layouts.size,
            cacheHitRate: this.getCacheHitRate(),
            lastStrategy: this.cache.lastStrategy,
            byType: {
                minimal: 0,
                medium: 0,
                standard: 0,
                advanced: 0,
                unknown: 0
            }
        };
        
        // 统计布局类型
        for (const [cueId, layoutInfo] of this.cache.layouts) {
            if (layoutInfo.isDenseText && layoutInfo.isInline && layoutInfo.hasSiblings) {
                stats.byType.minimal++;
            } else if (layoutInfo.isInline && layoutInfo.hasSiblings) {
                stats.byType.medium++;
            } else if (layoutInfo.isInParagraph && layoutInfo.parentWidth > 0 && 
                       layoutInfo.elementWidth / layoutInfo.parentWidth > 0.8) {
                stats.byType.advanced++;
            } else if (Object.keys(layoutInfo).length > 0) {
                stats.byType.standard++;
            } else {
                stats.byType.unknown++;
            }
        }
        
        return stats;
    }

    getPerformanceStats() {
        try {
            return window.EnglishSite.PerformanceMonitor ? 
                   window.EnglishSite.PerformanceMonitor.getStats('audioSync') : {};
        } catch (error) {
            return {};
        }
    }

    getErrorState() {
        try {
            return window.EnglishSite.SimpleErrorHandler ? 
                   window.EnglishSite.SimpleErrorHandler.getStats() : {};
        } catch (error) {
            return {};
        }
    }

    // 🧹 销毁
    async destroy() {
        try {
            console.log('[AudioSync] 🧹 开始销毁...');
            
            // 等待初始化完成
            try {
                await this.initPromise;
            } catch (error) {
                // 忽略初始化错误
            }
            
            // 清理动画帧
            if (this.state.updateFrame) {
                cancelAnimationFrame(this.state.updateFrame);
                this.state.updateFrame = null;
            }
            
            // 移除事件监听器
            if (this.audioPlayer) {
                this.audioPlayer.removeEventListener('timeupdate', this.handleTimeUpdate);
                this.audioPlayer.removeEventListener('ended', this.handleAudioEnded);
                this.audioPlayer.removeEventListener('error', this.handleAudioError);
            }
            if (this.contentArea) {
                this.contentArea.removeEventListener('click', this.handleTextClick);
            }
            
            // 清理高亮
            if (this.state.lastElement) {
                this.removeHighlight(this.state.lastElement);
            }

            // 清理缓存
            this.cache.elements.clear();
            this.cache.strategies.clear();
            this.cache.layouts.clear();
            this.cache.timeIndex.clear();
            
            // 清理状态
            this.state.srtData.length = 0;
            this.state.timeIndex.length = 0;
            this.state.currentIndex = -1;
            this.state.lastElement = null;
            
            this.isInitialized = false;
            
            console.log('[AudioSync] ✅ 销毁完成');
            
        } catch (error) {
            console.error('[AudioSync] ❌ 销毁失败:', error);
            
            if (window.EnglishSite.SimpleErrorHandler) {
                window.EnglishSite.SimpleErrorHandler.record('audioSync', 'destroy', error);
            }
        }
    }
}

// 注册到全局命名空间
window.EnglishSite.AudioSync = AudioSync;

console.log('🎵 AudioSync 稳定重构版 v3.0 加载完成');