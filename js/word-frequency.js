// js/word-frequency.js - 完全修复版 v4.4
window.EnglishSite = window.EnglishSite || {};

// 智能词频分类器
class IntelligentWordFrequencyClassifier {
    constructor() {
        this.classificationMethods = {
            'percentile': this.percentileBasedClassification.bind(this),
            'adaptive': this.adaptiveThresholdClassification.bind(this),
            'statistical': this.statisticalDistributionClassification.bind(this),
            'tfidf': this.tfidfBasedClassification.bind(this),
            'hybrid': this.hybridClassification.bind(this)
        };
        
        this.defaultMethod = 'hybrid';
    }
    
    classifyWords(wordData, globalStats, method = 'auto') {
        if (!wordData || wordData.length === 0) {
            return this.getEmptyClassification();
        }
        
        if (method === 'auto') {
            method = this.selectBestMethod(wordData, globalStats);
        }
        
        const classifier = this.classificationMethods[method] || this.classificationMethods[this.defaultMethod];
        const result = classifier(wordData, globalStats);
        
        result.metadata = {
            method: method,
            totalWords: wordData.length,
            globalStats: globalStats,
            timestamp: Date.now()
        };
        
        return result;
    }
    
    percentileBasedClassification(wordData, globalStats) {
        const frequencies = wordData.map(w => w.totalCount).sort((a, b) => b - a);
        
        const p95 = this.getPercentile(frequencies, 95);
        const p80 = this.getPercentile(frequencies, 80);
        const p60 = this.getPercentile(frequencies, 60);
        const p30 = this.getPercentile(frequencies, 30);
        
        const classification = {
            'ultra-high': [],
            'high': [],
            'medium': [],
            'low': [],
            'rare': []
        };
        
        const thresholds = {
            ultraHigh: p95,
            high: p80,
            medium: p60,
            low: p30
        };
        
        wordData.forEach(word => {
            const count = word.totalCount;
            if (count >= p95) {
                classification['ultra-high'].push(word);
            } else if (count >= p80) {
                classification['high'].push(word);
            } else if (count >= p60) {
                classification['medium'].push(word);
            } else if (count >= p30) {
                classification['low'].push(word);
            } else {
                classification['rare'].push(word);
            }
        });
        
        return {
            classification,
            thresholds,
            method: 'percentile',
            description: '基于统计百分位数的智能分类'
        };
    }
    
    adaptiveThresholdClassification(wordData, globalStats) {
        const { totalArticles, totalWords, totalOccurrences } = globalStats;
        
        const avgWordFrequency = totalOccurrences / totalWords;
        const scaleFactor = Math.log10(Math.max(totalArticles, 10));
        
        const thresholds = {
            ultraHigh: Math.max(30, Math.round(avgWordFrequency * scaleFactor * 3)),
            high: Math.max(15, Math.round(avgWordFrequency * scaleFactor * 2)),
            medium: Math.max(8, Math.round(avgWordFrequency * scaleFactor * 1.2)),
            low: Math.max(3, Math.round(avgWordFrequency * scaleFactor * 0.8))
        };
        
        const docFreqWeight = Math.min(0.3, totalArticles / 1000);
        
        const classification = {
            'ultra-high': [],
            'high': [],
            'medium': [],
            'low': [],
            'rare': []
        };
        
        wordData.forEach(word => {
            const adjustedScore = word.totalCount + (word.articleCount * docFreqWeight * 10);
            
            if (adjustedScore >= thresholds.ultraHigh) {
                classification['ultra-high'].push(word);
            } else if (adjustedScore >= thresholds.high) {
                classification['high'].push(word);
            } else if (adjustedScore >= thresholds.medium) {
                classification['medium'].push(word);
            } else if (adjustedScore >= thresholds.low) {
                classification['low'].push(word);
            } else {
                classification['rare'].push(word);
            }
        });
        
        return {
            classification,
            thresholds,
            scaleFactor,
            method: 'adaptive',
            description: `基于${totalArticles}篇文章的自适应智能分类`
        };
    }
    
    statisticalDistributionClassification(wordData, globalStats) {
        const frequencies = wordData.map(w => w.totalCount);
        const mean = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
        const stdDev = Math.sqrt(frequencies.reduce((sq, f) => sq + Math.pow(f - mean, 2), 0) / frequencies.length);
        
        const thresholds = {
            ultraHigh: mean + 2 * stdDev,
            high: mean + stdDev,
            medium: mean,
            low: mean - 0.5 * stdDev
        };
        
        const classification = {
            'ultra-high': [],
            'high': [],
            'medium': [],
            'low': [],
            'rare': []
        };
        
        wordData.forEach(word => {
            const count = word.totalCount;
            if (count >= thresholds.ultraHigh) {
                classification['ultra-high'].push(word);
            } else if (count >= thresholds.high) {
                classification['high'].push(word);
            } else if (count >= thresholds.medium) {
                classification['medium'].push(word);
            } else if (count >= thresholds.low) {
                classification['low'].push(word);
            } else {
                classification['rare'].push(word);
            }
        });
        
        return {
            classification,
            thresholds,
            statistics: { mean, stdDev },
            method: 'statistical',
            description: '基于统计分布的智能分类'
        };
    }
    
    tfidfBasedClassification(wordData, globalStats) {
        const { totalArticles } = globalStats;
        
        const wordsWithScore = wordData.map(word => {
            const tf = word.totalCount;
            const idf = Math.log(totalArticles / Math.max(word.articleCount, 1));
            const tfidfScore = tf * Math.max(idf, 0.5);
            
            return {
                ...word,
                tfidfScore,
                tf,
                idf
            };
        });
        
        wordsWithScore.sort((a, b) => b.tfidfScore - a.tfidfScore);
        
        const scores = wordsWithScore.map(w => w.tfidfScore);
        const p95 = this.getPercentile(scores, 95);
        const p80 = this.getPercentile(scores, 80);
        const p60 = this.getPercentile(scores, 60);
        const p30 = this.getPercentile(scores, 30);
        
        const classification = {
            'ultra-high': [],
            'high': [],
            'medium': [],
            'low': [],
            'rare': []
        };
        
        const thresholds = {
            ultraHigh: p95,
            high: p80,
            medium: p60,
            low: p30
        };
        
        wordsWithScore.forEach(word => {
            const score = word.tfidfScore;
            if (score >= p95) {
                classification['ultra-high'].push(word);
            } else if (score >= p80) {
                classification['high'].push(word);
            } else if (score >= p60) {
                classification['medium'].push(word);
            } else if (score >= p30) {
                classification['low'].push(word);
            } else {
                classification['rare'].push(word);
            }
        });
        
        return {
            classification,
            thresholds,
            method: 'tfidf',
            description: '基于TF-IDF重要性的智能分类'
        };
    }
    
    hybridClassification(wordData, globalStats) {
        const { totalArticles, totalWords, totalOccurrences } = globalStats;
        
        const wordsWithHybridScore = wordData.map(word => {
            const freq = word.totalCount;
            const docFreq = word.articleCount;
            
            const maxFreq = Math.max(...wordData.map(w => w.totalCount));
            const freqScore = freq / maxFreq;
            
            const docFreqScore = docFreq / totalArticles;
            
            const totalWordTypes = wordData.length;
            const rarityScore = 1 - (wordData.filter(w => w.totalCount >= freq).length / totalWordTypes);
            
            const avgFreqPerDoc = docFreq > 0 ? freq / docFreq : 0;
            const distributionScore = Math.min(1, avgFreqPerDoc / (totalOccurrences / totalArticles));
            
            const hybridScore = (
                freqScore * 0.4 +
                docFreqScore * 0.3 +
                rarityScore * 0.2 +
                distributionScore * 0.1
            );
            
            return {
                ...word,
                hybridScore,
                freqScore,
                docFreqScore,
                rarityScore,
                distributionScore
            };
        });
        
        wordsWithHybridScore.sort((a, b) => b.hybridScore - a.hybridScore);
        
        let ratios;
        if (totalWords < 1000) {
            ratios = { ultraHigh: 0.05, high: 0.15, medium: 0.30, low: 0.35 };
        } else if (totalWords < 5000) {
            ratios = { ultraHigh: 0.03, high: 0.12, medium: 0.35, low: 0.35 };
        } else {
            ratios = { ultraHigh: 0.02, high: 0.08, medium: 0.25, low: 0.40 };
        }
        
        const scores = wordsWithHybridScore.map(w => w.hybridScore);
        const thresholds = {
            ultraHigh: this.getPercentile(scores, (1 - ratios.ultraHigh) * 100),
            high: this.getPercentile(scores, (1 - ratios.ultraHigh - ratios.high) * 100),
            medium: this.getPercentile(scores, (1 - ratios.ultraHigh - ratios.high - ratios.medium) * 100),
            low: this.getPercentile(scores, (1 - ratios.ultraHigh - ratios.high - ratios.medium - ratios.low) * 100)
        };
        
        const classification = {
            'ultra-high': [],
            'high': [],
            'medium': [],
            'low': [],
            'rare': []
        };
        
        wordsWithHybridScore.forEach(word => {
            const score = word.hybridScore;
            if (score >= thresholds.ultraHigh) {
                classification['ultra-high'].push(word);
            } else if (score >= thresholds.high) {
                classification['high'].push(word);
            } else if (score >= thresholds.medium) {
                classification['medium'].push(word);
            } else if (score >= thresholds.low) {
                classification['low'].push(word);
            } else {
                classification['rare'].push(word);
            }
        });
        
        return {
            classification,
            thresholds,
            ratios,
            method: 'hybrid',
            description: '综合多种因素的混合智能分类',
            algorithmWeights: {
                frequency: 0.4,
                documentFrequency: 0.3,
                rarity: 0.2,
                distribution: 0.1
            }
        };
    }
    
    selectBestMethod(wordData, globalStats) {
        const { totalArticles, totalWords } = globalStats;
        
        if (totalArticles < 50) {
            return 'percentile';
        } else if (totalArticles < 500) {
            return 'adaptive';
        } else if (totalWords > 10000) {
            return 'hybrid';
        } else {
            return 'statistical';
        }
    }
    
    getPercentile(arr, percentile) {
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
    }
    
    getEmptyClassification() {
        return {
            classification: {
                'ultra-high': [],
                'high': [],
                'medium': [],
                'low': [],
                'rare': []
            },
            thresholds: {},
            method: 'empty',
            description: '空数据集'
        };
    }
    
    getClassificationLabels(method, totalArticles = 0) {
        const baseLabels = {
            'ultra-high': { emoji: '🔥', name: '极高频词', color: '#d32f2f' },
            'high': { emoji: '📈', name: '高频词', color: '#f57c00' },
            'medium': { emoji: '📊', name: '中频词', color: '#388e3c' },
            'low': { emoji: '📉', name: '低频词', color: '#1976d2' },
            'rare': { emoji: '💎', name: '稀有词', color: '#757575' }
        };
        
        if (totalArticles > 1000) {
            baseLabels['ultra-high'].description = '核心关键词，出现频率极高';
            baseLabels['high'].description = '重要词汇，经常出现';
            baseLabels['medium'].description = '常用词汇，适中出现';
            baseLabels['low'].description = '一般词汇，偶尔出现';
            baseLabels['rare'].description = '特殊词汇，很少出现';
        } else {
            baseLabels['ultra-high'].description = '最常见词汇';
            baseLabels['high'].description = '常见词汇';
            baseLabels['medium'].description = '一般词汇';
            baseLabels['low'].description = '较少词汇';
            baseLabels['rare'].description = '稀有词汇';
        }
        
        return baseLabels;
    }
}

// 性能优化器
class PerformanceOptimizer {
    constructor() {
        this.regexPool = {
            punctuation: /[^\w\s'-]/g,
            whitespace: /\s+/g,
            trimDashes: /^[-']+|[-']+$/g,
            alphaOnly: /^[a-zA-Z]+$/,
            digits: /^\d+$/,
            sentences: /[.!?]+/,
            vowels: /[aeiou]/,
            escapeChars: /[.*+?^${}()|[\]\\]/g,
            suffixes: {
                ies: /ies$/,
                ves: /ves$/,
                ses: /ses$/,
                ches: /ches$/,
                shes: /shes$/,
                s: /s$/,
                ss: /ss$/,
                ied: /ied$/,
                ed: /ed$/,
                ing: /ing$/,
                ly: /ly$/,
                est: /est$/,
                er: /er$/
            }
        };
        
        this.objectPool = {
            arrays: [],
            maps: [],
            maxPoolSize: 30
        };
        
        this.perfCounters = {
            regexReuse: 0,
            objectReuse: 0,
            cacheHits: 0
        };
    }
    
    getArray() {
        this.perfCounters.objectReuse++;
        return this.objectPool.arrays.pop() || [];
    }
    
    releaseArray(arr) {
        if (this.objectPool.arrays.length < this.objectPool.maxPoolSize) {
            arr.length = 0;
            this.objectPool.arrays.push(arr);
        }
    }
    
    getMap() {
        this.perfCounters.objectReuse++;
        const map = this.objectPool.maps.pop() || new Map();
        map.clear();
        return map;
    }
    
    releaseMap(map) {
        if (this.objectPool.maps.length < this.objectPool.maxPoolSize) {
            map.clear();
            this.objectPool.maps.push(map);
        }
    }
    
    escapeRegex(string) {
        this.perfCounters.regexReuse++;
        return string.replace(this.regexPool.escapeChars, '\\$&');
    }
    
    getStats() {
        return { ...this.perfCounters };
    }
    
    resetStats() {
        Object.keys(this.perfCounters).forEach(key => {
            this.perfCounters[key] = 0;
        });
    }
}

// 词干提取器 - 修复noodle问题
class WordStemmer {
    constructor() {
        this.optimizer = new PerformanceOptimizer();
        
        this.irregularVerbsMap = new Map([
            ['am', 'be'], ['is', 'be'], ['are', 'be'], ['was', 'be'], ['were', 'be'], ['been', 'be'], ['being', 'be'],
            ['took', 'take'], ['taken', 'take'], ['taking', 'take'], ['takes', 'take'],
            ['went', 'go'], ['gone', 'go'], ['going', 'go'], ['goes', 'go'],
            ['came', 'come'], ['coming', 'come'], ['comes', 'come'],
            ['saw', 'see'], ['seen', 'see'], ['seeing', 'see'], ['sees', 'see'],
            ['did', 'do'], ['done', 'do'], ['doing', 'do'], ['does', 'do'],
            ['had', 'have'], ['having', 'have'], ['has', 'have'],
            ['said', 'say'], ['saying', 'say'], ['says', 'say'],
            ['got', 'get'], ['gotten', 'get'], ['getting', 'get'], ['gets', 'get'],
            ['made', 'make'], ['making', 'make'], ['makes', 'make'],
            ['knew', 'know'], ['known', 'know'], ['knowing', 'know'], ['knows', 'know']
        ]);
        
        this.stemCache = new Map();
        this.maxCacheSize = 3000;
        this.customMergeRules = new Map();
        
        this.suffixRules = [
            { pattern: 'ies', replacement: 'y', minLength: 5, regex: this.optimizer.regexPool.suffixes.ies },
            { pattern: 'ves', replacement: 'f', minLength: 5, regex: this.optimizer.regexPool.suffixes.ves },
            { pattern: 'ses', replacement: 's', minLength: 5, regex: this.optimizer.regexPool.suffixes.ses },
            { pattern: 'ches', replacement: 'ch', minLength: 6, regex: this.optimizer.regexPool.suffixes.ches },
            { pattern: 'shes', replacement: 'sh', minLength: 6, regex: this.optimizer.regexPool.suffixes.shes },
            { pattern: 's', replacement: '', minLength: 4, regex: this.optimizer.regexPool.suffixes.s, exclude: this.optimizer.regexPool.suffixes.ss },
            { pattern: 'ied', replacement: 'y', minLength: 5, regex: this.optimizer.regexPool.suffixes.ied },
            { pattern: 'ed', replacement: '', minLength: 4, regex: this.optimizer.regexPool.suffixes.ed },
            { pattern: 'ing', replacement: '', minLength: 5, regex: this.optimizer.regexPool.suffixes.ing },
            { pattern: 'ly', replacement: '', minLength: 5, regex: this.optimizer.regexPool.suffixes.ly },
            { pattern: 'est', replacement: '', minLength: 5, regex: this.optimizer.regexPool.suffixes.est },
            { pattern: 'er', replacement: '', minLength: 4, regex: this.optimizer.regexPool.suffixes.er }
        ];
        
        this.loadPresetRules();
    }
    
    getStem(word) {
        const lowerWord = word.toLowerCase();
        
        if (this.stemCache.has(lowerWord)) {
            this.optimizer.perfCounters.cacheHits++;
            return this.stemCache.get(lowerWord);
        }
        
        let result;
        
        if (this.customMergeRules.has(lowerWord)) {
            result = this.customMergeRules.get(lowerWord);
        } else if (this.irregularVerbsMap.has(lowerWord)) {
            result = this.irregularVerbsMap.get(lowerWord);
        } else {
            result = this.applySuffixRulesOptimized(lowerWord);
        }
        
        if (this.stemCache.size >= this.maxCacheSize) {
            const firstKey = this.stemCache.keys().next().value;
            this.stemCache.delete(firstKey);
        }
        this.stemCache.set(lowerWord, result);
        
        return result;
    }
    
    applySuffixRulesOptimized(word) {
        const wordLength = word.length;
        if (wordLength < 4) return word;
        
        for (const rule of this.suffixRules) {
            if (wordLength >= rule.minLength && 
                rule.regex.test(word) && 
                (!rule.exclude || !rule.exclude.test(word))) {
                
                const stem = word.replace(rule.regex, rule.replacement);
                if (this.isValidStemOptimized(stem, word)) {
                    return stem;
                }
            }
        }
        return word;
    }
    
    isValidStemOptimized(stem, original) {
        const stemLen = stem.length;
        if (stemLen < 2) return false;
        
        const origLen = original.length;
        if (stemLen < origLen * 0.4) return false;
        
        return stemLen <= 2 || this.optimizer.regexPool.vowels.test(stem);
    }
    
    addCustomRule(variant, baseForm) {
        this.customMergeRules.set(variant.toLowerCase(), baseForm.toLowerCase());
        this.clearCacheEntry(variant.toLowerCase());
    }
    
    addCustomRules(rules) {
        rules.forEach(([variant, baseForm]) => {
            this.addCustomRule(variant, baseForm);
        });
    }
    
    clearCacheEntry(word) {
        this.stemCache.delete(word.toLowerCase());
    }
    
    clearCache() {
        this.stemCache.clear();
    }
    
    loadPresetRules() {
        const presetRules = [
            // 修复：确保noodle不会被错误处理
            ['noodles', 'noodle'], 
            ['cookies', 'cookie'], 
            ['studies', 'study'],
            ['countries', 'country'], 
            ['companies', 'company'], 
            ['stories', 'story'],
            ['cities', 'city'], 
            ['families', 'family'], 
            ['activities', 'activity']
        ];
        
        this.addCustomRules(presetRules);
    }
    
    getCacheStats() {
        return {
            cacheSize: this.stemCache.size,
            maxCacheSize: this.maxCacheSize,
            hitRate: this.optimizer.perfCounters.cacheHits
        };
    }
}

// Web Worker管理器
class WebWorkerManager {
    constructor() {
        this.worker = null;
        this.isWorkerSupported = typeof Worker !== 'undefined';
        this.isWorkerReady = false;
        this.requestId = 0;
        this.pendingRequests = new Map();
        this.workerUrl = null;
        
        this.workerConfig = {
            enabled: false,
            maxRetries: 2,
            timeout: 25000,
            batchSize: 4
        };
        
        this.workerStats = {
            messagesProcessed: 0,
            errors: 0,
            avgResponseTime: 0,
            totalResponseTime: 0
        };
    }
    
    async initWorker() {
        if (!this.isWorkerSupported) {
            console.warn('当前浏览器不支持Web Worker');
            return false;
        }
        
        try {
            try {
                const response = await fetch('js/word-frequency-worker.js');
                if (!response.ok) {
                    console.warn('Worker文件不存在，跳过Worker初始化');
                    return false;
                }
            } catch (error) {
                console.warn('无法访问Worker文件，跳过Worker初始化');
                return false;
            }
            
            this.worker = new Worker('js/word-frequency-worker.js');
            
            this.setupWorkerListeners();
            await this.waitForWorkerReady();
            
            this.workerConfig.enabled = true;
            this.isWorkerReady = true;
            
            console.log('✅ Web Worker已成功初始化');
            return true;
            
        } catch (error) {
            console.error('❌ Web Worker初始化失败:', error);
            this.cleanup();
            return false;
        }
    }
    
    setupWorkerListeners() {
        this.worker.addEventListener('message', (e) => {
            this.handleWorkerMessage(e.data);
        });
        
        this.worker.addEventListener('error', (error) => {
            console.error('Web Worker错误:', error);
            this.workerStats.errors++;
            this.handleWorkerError(error);
        });
    }
    
    waitForWorkerReady() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Worker初始化超时'));
            }, 8000);
            
            const messageHandler = (e) => {
                if (e.data.type === 'ready') {
                    clearTimeout(timeout);
                    this.worker.removeEventListener('message', messageHandler);
                    resolve();
                }
            };
            
            this.worker.addEventListener('message', messageHandler);
        });
    }
    
    handleWorkerMessage(message) {
        const { type, data, requestId } = message;
        
        this.workerStats.messagesProcessed++;
        
        if (requestId && this.pendingRequests.has(requestId)) {
            const request = this.pendingRequests.get(requestId);
            const responseTime = Date.now() - request.startTime;
            this.updateResponseTimeStats(responseTime);
        }
        
        switch (type) {
            case 'ready':
                console.log('🚀 Worker就绪:', data.message);
                break;
                
            case 'analyzeResult':
            case 'batchResult':
            case 'stats':
            case 'pong':
            case 'rulesUpdated':
                this.resolveRequest(requestId, data);
                break;
                
            case 'progress':
                this.handleProgress(requestId, data);
                break;
                
            case 'error':
                this.rejectRequest(requestId, new Error(data.message));
                break;
        }
    }
    
    handleWorkerError(error) {
        this.pendingRequests.forEach((request, requestId) => {
            this.rejectRequest(requestId, error);
        });
        
        this.isWorkerReady = false;
        
        if (this.workerStats.errors < this.workerConfig.maxRetries) {
            console.log('🔄 尝试重新启动Worker...');
            setTimeout(() => {
                this.initWorker();
            }, 1500);
        } else {
            console.error('❌ Worker重启次数过多，禁用Worker模式');
            this.workerConfig.enabled = false;
        }
    }
    
    resolveRequest(requestId, data) {
        const request = this.pendingRequests.get(requestId);
        if (request) {
            clearTimeout(request.timeoutId);
            this.pendingRequests.delete(requestId);
            request.resolve(data);
        }
    }
    
    rejectRequest(requestId, error) {
        const request = this.pendingRequests.get(requestId);
        if (request) {
            clearTimeout(request.timeoutId);
            this.pendingRequests.delete(requestId);
            request.reject(error);
        }
    }
    
    handleProgress(requestId, data) {
        const request = this.pendingRequests.get(requestId);
        if (request && request.onProgress) {
            request.onProgress(data.progress);
        }
    }
    
    updateResponseTimeStats(responseTime) {
        this.workerStats.totalResponseTime += responseTime;
        this.workerStats.avgResponseTime = Math.round(
            this.workerStats.totalResponseTime / this.workerStats.messagesProcessed
        );
    }
    
    async analyzeBatch(articles, onProgress) {
        if (!this.isAvailable()) {
            throw new Error('Worker不可用');
        }
        
        return new Promise((resolve, reject) => {
            const requestId = ++this.requestId;
            const timeoutId = setTimeout(() => {
                this.rejectRequest(requestId, new Error('Worker请求超时'));
            }, this.workerConfig.timeout);
            
            this.pendingRequests.set(requestId, {
                resolve,
                reject,
                timeoutId,
                startTime: Date.now(),
                onProgress
            });
            
            this.worker.postMessage({
                type: 'analyzeBatch',
                requestId,
                payload: {
                    articles,
                    batchSize: this.workerConfig.batchSize
                }
            });
        });
    }
    
    async updateCustomRules(rules) {
        if (!this.isAvailable()) {
            return false;
        }
        
        return new Promise((resolve, reject) => {
            const requestId = ++this.requestId;
            const timeoutId = setTimeout(() => {
                this.rejectRequest(requestId, new Error('规则更新超时'));
            }, 5000);
            
            this.pendingRequests.set(requestId, {
                resolve,
                reject,
                timeoutId,
                startTime: Date.now()
            });
            
            this.worker.postMessage({
                type: 'updateCustomRules',
                requestId,
                payload: { rules }
            });
        });
    }
    
    async getWorkerStats() {
        if (!this.isAvailable()) {
            return null;
        }
        
        return new Promise((resolve, reject) => {
            const requestId = ++this.requestId;
            const timeoutId = setTimeout(() => {
                this.rejectRequest(requestId, new Error('获取统计超时'));
            }, 3000);
            
            this.pendingRequests.set(requestId, {
                resolve,
                reject,
                timeoutId,
                startTime: Date.now()
            });
            
            this.worker.postMessage({
                type: 'getStats',
                requestId
            });
        });
    }
    
    isAvailable() {
        return this.isWorkerReady && this.workerConfig.enabled;
    }
    
    configure(config) {
        this.workerConfig = { ...this.workerConfig, ...config };
    }
    
    cleanup() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        
        if (this.workerUrl) {
            URL.revokeObjectURL(this.workerUrl);
            this.workerUrl = null;
        }
        
        this.pendingRequests.clear();
        this.isWorkerReady = false;
        this.workerConfig.enabled = false;
    }
}

// 词频分析器 - 修复搜索逻辑
class WordFrequencyAnalyzer {
    constructor() {
        this.wordStats = new Map();
        this.articleContents = new Map();
        this.variantIndex = new Map(); // variant -> Set<articleId>
        this.articleVariants = new Map(); // articleId -> Map<variant, {count, contexts}>
        
        this.stemmer = new WordStemmer();
        this.optimizer = new PerformanceOptimizer();
        
        this.stopWordsSet = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 
            'by', 'from', 'this', 'that', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
            'is', 'are', 'was', 'were', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'can', 'could', 'should', 'not', 'no', 'all', 'any', 'some',
            'neil', 'beth'
        ]);
        
        this.cache = window.EnglishSite.CacheManager?.get('wordFreq') || 
                     window.EnglishSite.CacheManager?.create('wordFreq', 150, 3600000);
        
        this.batchConfig = {
            chunkSize: 1500,
            maxConcurrent: 2,
            yieldInterval: 80
        };
    }

    processWorkerResult(result) {
        const { articleId, title, wordCount, uniqueWords, wordCounts } = result;
        
        if (!wordCounts || !Array.isArray(wordCounts)) {
            console.warn('Invalid worker result for article:', articleId);
            return;
        }
        
        wordCounts.forEach(({ baseWord, totalCount, variants, contexts }) => {
            if (!baseWord || !variants) return;
            
            if (!this.wordStats.has(baseWord)) {
                this.wordStats.set(baseWord, { 
                    totalCount: 0, 
                    variants: new Map(),
                    articles: new Map()
                });
            }
            
            const stats = this.wordStats.get(baseWord);
            stats.totalCount += totalCount;
            
            const variantsArray = Array.isArray(variants) ? variants : Array.from(variants || []);
            
            variantsArray.forEach(([variant, count]) => {
                if (!variant || typeof variant !== 'string') return;
                
                stats.variants.set(variant, (stats.variants.get(variant) || 0) + count);
                this.updateVariantIndex(variant, articleId, count, contexts || []);
            });
            
            stats.articles.set(articleId, {
                count: totalCount,
                title,
                contexts: contexts || [],
                variants: variantsArray
            });
        });
        
        this.articleContents.set(articleId, { 
            content: '',
            title, 
            wordCount: wordCount || 0,
            uniqueWords: uniqueWords || 0
        });
    }

    analyzeArticle(articleId, content, title) {
        const words = this.extractWordsOptimized(content);
        const wordCounts = this.optimizer.getMap();
        
        try {
            this.processWordsBatchOptimized(words, wordCounts);
            this.updateGlobalStats(articleId, title, content, wordCounts);
            
            this.articleContents.set(articleId, { 
                content, 
                title, 
                wordCount: words.length,
                uniqueWords: wordCounts.size
            });
            
        } finally {
            this.optimizer.releaseMap(wordCounts);
        }
    }
    
    updateVariantIndex(variant, articleId, count, contexts) {
        if (!variant || !articleId) return;
        
        try {
            if (!this.variantIndex.has(variant)) {
                this.variantIndex.set(variant, new Set());
            }
            this.variantIndex.get(variant).add(articleId);
            
            if (!this.articleVariants.has(articleId)) {
                this.articleVariants.set(articleId, new Map());
            }
            this.articleVariants.get(articleId).set(variant, {
                count: count || 0,
                contexts: Array.isArray(contexts) ? contexts : []
            });
        } catch (error) {
            console.warn('Failed to update variant index:', error);
        }
    }
    
    extractWordsOptimized(text) {
        const words = this.optimizer.getArray();
        
        try {
            const cleanText = text
                .toLowerCase()
                .replace(this.optimizer.regexPool.punctuation, ' ')
                .replace(this.optimizer.regexPool.whitespace, ' ');
            
            const rawWords = cleanText.split(' ');
            
            for (let i = 0; i < rawWords.length; i++) {
                const word = rawWords[i].replace(this.optimizer.regexPool.trimDashes, '');
                
                if (this.isValidWordOptimized(word)) {
                    words.push(word);
                }
            }
            
            return words.slice();
            
        } finally {
            this.optimizer.releaseArray(words);
        }
    }
    
    isValidWordOptimized(word) {
        const len = word.length;
        return len >= 3 && 
               len <= 18 &&
               !this.stopWordsSet.has(word) &&
               !this.optimizer.regexPool.digits.test(word) &&
               this.optimizer.regexPool.alphaOnly.test(word);
    }
    
    processWordsBatchOptimized(words, wordCounts) {
        for (let i = 0; i < words.length; i++) {
            const originalWord = words[i];
            const baseWord = this.stemmer.getStem(originalWord);
            
            let wordData = wordCounts.get(baseWord);
            if (!wordData) {
                wordData = { totalCount: 0, variants: new Map() };
                wordCounts.set(baseWord, wordData);
            }
            
            wordData.totalCount++;
            const currentCount = wordData.variants.get(originalWord) || 0;
            wordData.variants.set(originalWord, currentCount + 1);
        }
    }
    
    updateGlobalStats(articleId, title, content, wordCounts) {
        wordCounts.forEach((data, baseWord) => {
            let stats = this.wordStats.get(baseWord);
            if (!stats) {
                stats = { 
                    totalCount: 0, 
                    variants: new Map(),
                    articles: new Map()
                };
                this.wordStats.set(baseWord, stats);
            }
            
            stats.totalCount += data.totalCount;
            
            data.variants.forEach((count, variant) => {
                const currentCount = stats.variants.get(variant) || 0;
                stats.variants.set(variant, currentCount + count);
                
                const contexts = this.extractContextsOptimized(content, variant);
                this.updateVariantIndex(variant, articleId, count, contexts);
            });
            
            stats.articles.set(articleId, {
                count: data.totalCount,
                title,
                contexts: this.extractContextsOptimized(content, baseWord),
                variants: Array.from(data.variants.entries())
            });
        });
    }
    
    extractContextsOptimized(content, baseWord) {
        const contexts = this.optimizer.getArray();
        
        try {
            const sentences = content.split(this.optimizer.regexPool.sentences);
            const stats = this.wordStats.get(baseWord);
            const allVariants = stats ? Array.from(stats.variants.keys()).slice(0, 5) : [baseWord];
            
            const patterns = allVariants.map(variant => 
                new RegExp(`\\b${this.optimizer.escapeRegex(variant)}\\b`, 'gi')
            );
            
            let foundCount = 0;
            const maxContexts = 2;
            
            for (let i = 0; i < sentences.length && foundCount < maxContexts; i++) {
                const sentence = sentences[i];
                const trimmed = sentence.trim();
                
                if (trimmed && patterns.some(pattern => pattern.test(trimmed))) {
                    let context = trimmed.substring(0, 100);
                    if (trimmed.length > 100) context += '...';
                    
                    patterns.forEach(pattern => {
                        context = context.replace(pattern, `<mark>$&</mark>`);
                    });
                    
                    contexts.push(context);
                    foundCount++;
                }
            }
            
            return contexts.slice();
            
        } finally {
            this.optimizer.releaseArray(contexts);
        }
    }

    getWordFrequencyData() {
        const data = this.optimizer.getArray();
        
        try {
            this.wordStats.forEach((stats, baseWord) => {
                data.push({
                    word: baseWord,
                    totalCount: stats.totalCount,
                    articleCount: stats.articles.size,
                    variants: Array.from(stats.variants.entries()).sort((a, b) => b[1] - a[1]),
                    mostCommonVariant: this.getMostCommonVariantOptimized(stats.variants),
                    articles: Array.from(stats.articles.entries()).map(([id, articleData]) => ({
                        id,
                        title: articleData.title,
                        count: articleData.count,
                        contexts: articleData.contexts,
                        variants: articleData.variants
                    }))
                });
            });
            
            data.sort((a, b) => b.totalCount - a.totalCount);
            return data.slice();
            
        } finally {
            this.optimizer.releaseArray(data);
        }
    }
    
    getMostCommonVariantOptimized(variants) {
        let maxCount = 0;
        let mostCommon = '';
        
        for (const [variant, count] of variants) {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = variant;
            }
        }
        
        return mostCommon;
    }

    // 修复：智能搜索 - 支持部分匹配和完整匹配
    searchWords(query) {
        const lowerQuery = query.toLowerCase().trim();
        const results = this.optimizer.getArray();
        
        try {
            this.wordStats.forEach((stats, baseWord) => {
                // 检查基础词匹配
                let relevance = 0;
                
                // 完全匹配最高优先级
                if (baseWord === lowerQuery) {
                    relevance = 10;
                } else if (baseWord.startsWith(lowerQuery)) {
                    relevance = 8;
                } else if (baseWord.includes(lowerQuery)) {
                    relevance = 6;
                }
                
                // 检查变形词匹配
                let variantRelevance = 0;
                let matchedVariants = [];
                
                for (const [variant] of stats.variants) {
                    if (variant === lowerQuery) {
                        variantRelevance = Math.max(variantRelevance, 9);
                        matchedVariants.push(variant);
                    } else if (variant.startsWith(lowerQuery)) {
                        variantRelevance = Math.max(variantRelevance, 7);
                        matchedVariants.push(variant);
                    } else if (variant.includes(lowerQuery)) {
                        variantRelevance = Math.max(variantRelevance, 5);
                        matchedVariants.push(variant);
                    }
                }
                
                // 使用最高相关性
                const finalRelevance = Math.max(relevance, variantRelevance);
                
                if (finalRelevance > 0) {
                    results.push({
                        word: baseWord,
                        totalCount: stats.totalCount,
                        articleCount: stats.articles.size,
                        variants: Array.from(stats.variants.entries()),
                        mostCommonVariant: this.getMostCommonVariantOptimized(stats.variants),
                        relevance: finalRelevance,
                        matchedVariants: matchedVariants,
                        isIntelligentMatch: true
                    });
                }
            });
            
            // 按相关性和频次排序
            results.sort((a, b) => {
                const relevanceDiff = b.relevance - a.relevance;
                return relevanceDiff !== 0 ? relevanceDiff : b.totalCount - a.totalCount;
            });
            
            return results.slice();
            
        } finally {
            this.optimizer.releaseArray(results);
        }
    }
    
    // 修复：精确搜索
    searchWordsExact(query) {
        const lowerQuery = query.toLowerCase().trim();
        const results = this.optimizer.getArray();
        
        if (!lowerQuery) {
            return results.slice();
        }
        
        try {
            if (!this.variantIndex.has(lowerQuery)) {
                return results.slice();
            }
            
            const matchingArticles = this.variantIndex.get(lowerQuery);
            const articleDetails = [];
            
            matchingArticles.forEach(articleId => {
                try {
                    const articleContent = this.articleContents.get(articleId);
                    const variantData = this.articleVariants.get(articleId)?.get(lowerQuery);
                    
                    if (articleContent && variantData) {
                        articleDetails.push({
                            id: articleId,
                            title: articleContent.title,
                            count: variantData.count || 0,
                            contexts: variantData.contexts || []
                        });
                    }
                } catch (error) {
                    console.warn('Error processing article in exact search:', articleId, error);
                }
            });
            
            if (articleDetails.length > 0) {
                results.push({
                    word: lowerQuery,
                    totalCount: articleDetails.reduce((sum, art) => sum + art.count, 0),
                    articleCount: articleDetails.length,
                    variants: [[lowerQuery, articleDetails.reduce((sum, art) => sum + art.count, 0)]],
                    mostCommonVariant: lowerQuery,
                    relevance: 10,
                    articles: articleDetails.sort((a, b) => b.count - a.count),
                    isExactMatch: true
                });
            }
            
            return results.slice();
            
        } catch (error) {
            console.warn('Error in exact search:', error);
            return results.slice();
        } finally {
            this.optimizer.releaseArray(results);
        }
    }

    filterByFrequency(minCount = 1, maxCount = Infinity) {
        const results = this.optimizer.getArray();
        
        try {
            this.wordStats.forEach((stats, baseWord) => {
                const count = stats.totalCount;
                if (count >= minCount && count <= maxCount) {
                    results.push({
                        word: baseWord,
                        totalCount: count,
                        articleCount: stats.articles.size,
                        variants: Array.from(stats.variants.entries()),
                        mostCommonVariant: this.getMostCommonVariantOptimized(stats.variants)
                    });
                }
            });
            
            results.sort((a, b) => b.totalCount - a.totalCount);
            return results.slice();
            
        } finally {
            this.optimizer.releaseArray(results);
        }
    }

    getStatsSummary() {
        const totalUniqueWords = this.wordStats.size;
        let totalVariants = 0;
        let totalOccurrences = 0;
        
        this.wordStats.forEach(stats => {
            totalVariants += stats.variants.size;
            totalOccurrences += stats.totalCount;
        });
        
        const totalArticles = this.articleContents.size;
        
        const freqDistribution = { high: 0, medium: 0, low: 0 };
        this.wordStats.forEach(stats => {
            const count = stats.totalCount;
            if (count >= 10) freqDistribution.high++;
            else if (count >= 5) freqDistribution.medium++;
            else freqDistribution.low++;
        });

        return {
            totalUniqueWords,
            totalVariants,
            compressionRatio: totalVariants > 0 ? (totalVariants / totalUniqueWords).toFixed(2) : 0,
            totalWordOccurrences: totalOccurrences,
            totalArticlesAnalyzed: totalArticles,
            averageWordsPerArticle: totalArticles > 0 ? Math.round(totalOccurrences / totalArticles) : 0,
            frequencyDistribution: freqDistribution,
            performance: this.optimizer.getStats(),
            exactIndexStats: {
                totalVariants: this.variantIndex.size,
                articlesWithVariants: this.articleVariants.size
            }
        };
    }
    
    addCustomMergeRule(variant, baseForm) {
        this.stemmer.addCustomRule(variant, baseForm);
        this.markForReanalysis();
    }
    
    addCustomMergeRules(rules) {
        this.stemmer.addCustomRules(rules);
        this.markForReanalysis();
    }
    
    markForReanalysis() {
        if (this.cache) {
            this.cache.delete('fullAnalysis');
        }
        this.stemmer.clearCache();
    }
    
    getPerformanceStats() {
        return {
            optimizer: this.optimizer.getStats(),
            stemmerCache: this.stemmer.getCacheStats(),
            memoryUsage: {
                wordStats: this.wordStats.size,
                articleContents: this.articleContents.size,
                variantIndex: this.variantIndex.size,
                articleVariants: this.articleVariants.size
            }
        };
    }
}

// 词频管理器 - 修复双模式搜索
class WordFrequencyManager {
    constructor() {
        this.analyzer = new WordFrequencyAnalyzer();
        this.workerManager = new WebWorkerManager();
        this.intelligentClassifier = new IntelligentWordFrequencyClassifier();
        this.isProcessing = false;
        this.processedArticles = new Set();
        this.processingProgress = 0;
        
        this.classificationMethod = 'auto';
        this.classificationCache = new Map();
        
        // 修复：搜索配置
        this.searchConfig = {
            defaultMode: 'intelligent',
            enableSuggestions: true,
            suggestionTimeout: 10000,
            cacheSearchResults: true
        };
        
        this.searchCache = {
            intelligent: new Map(),
            exact: new Map(),
            maxCacheSize: 50
        };
        
        this.processingMode = {
            useWorker: false,
            autoDetect: true,
            fallbackOnError: true,
            workerThreshold: 80
        };
        
        this.performanceConfig = {
            batchSize: 2,
            maxConcurrentBatches: 1,
            yieldInterval: 150,
            useStreamProcessing: true
        };
        
        this.initPromise = this.initializeFromNavigation();
    }

    async initializeFromNavigation() {
        try {
            await window.EnglishSite.coreToolsReady;
            
            const cachedData = this.analyzer.cache?.get('fullAnalysis');
            if (cachedData && this.isCacheValid(cachedData)) {
                this.loadFromCache(cachedData);
                return true;
            }
            
            await this.analyzeAllArticlesOptimized();
            return true;
            
        } catch (error) {
            console.error('词频管理器初始化失败:', error);
            if (window.EnglishSite?.ErrorHandler) {
                window.EnglishSite.ErrorHandler.record('wordFreq', 'initialization', error);
            }
            throw error;
        }
    }

    getIntelligentClassification(method = this.classificationMethod) {
        const cacheKey = `${method}_${this.analyzer.wordStats.size}`;
        
        if (this.classificationCache.has(cacheKey)) {
            return this.classificationCache.get(cacheKey);
        }
        
        const wordData = this.analyzer.getWordFrequencyData();
        const globalStats = {
            totalArticles: this.analyzer.articleContents.size,
            totalWords: this.analyzer.wordStats.size,
            totalOccurrences: Array.from(this.analyzer.wordStats.values())
                .reduce((sum, stats) => sum + stats.totalCount, 0)
        };
        
        const result = this.intelligentClassifier.classifyWords(wordData, globalStats, method);
        
        this.classificationCache.set(cacheKey, result);
        
        return result;
    }

    filterWords(options = {}) {
        const { 
            minFreq = 1, 
            maxFreq = Infinity, 
            searchQuery = '',
            intelligentCategory = 'all',
            sortBy = 'frequency'
        } = options;
        
        let results;
        
        if (intelligentCategory !== 'all') {
            try {
                const classification = this.getIntelligentClassification();
                results = classification.classification[intelligentCategory] || [];
            } catch (error) {
                console.warn('智能分类失败，回退到传统筛选:', error);
                results = this.analyzer.filterByFrequency(minFreq, maxFreq);
            }
        } else {
            results = this.analyzer.filterByFrequency(minFreq, maxFreq);
        }
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            results = results.filter(item => 
                item.word.includes(query) || 
                item.variants?.some(([variant]) => variant.includes(query))
            );
        }
        
        switch (sortBy) {
            case 'frequency':
                results.sort((a, b) => b.totalCount - a.totalCount);
                break;
            case 'alphabetical':
                results.sort((a, b) => a.word.localeCompare(b.word));
                break;
            case 'articles':
                results.sort((a, b) => b.articleCount - a.articleCount);
                break;
            case 'hybrid':
                if (results[0]?.hybridScore !== undefined) {
                    results.sort((a, b) => b.hybridScore - a.hybridScore);
                } else {
                    results.sort((a, b) => b.totalCount - a.totalCount);
                }
                break;
            default:
                results.sort((a, b) => b.totalCount - a.totalCount);
        }
        
        return results;
    }

    setClassificationMethod(method) {
        if (this.intelligentClassifier.classificationMethods[method] || method === 'auto') {
            this.classificationMethod = method;
            this.classificationCache.clear();
            return true;
        }
        return false;
    }

    getAvailableClassificationMethods() {
        return {
            'auto': '🤖 自动选择最佳方法',
            'percentile': '📊 百分位数分类（适合任何规模）',
            'adaptive': '📈 自适应分类（根据文章数量调整）',
            'statistical': '📉 统计分布分类（基于标准差）',
            'tfidf': '🎯 TF-IDF重要性分类（突出重要词汇）',
            'hybrid': '🧠 混合智能分类（推荐使用）'
        };
    }

    getClassificationDetails() {
        try {
            const classification = this.getIntelligentClassification();
            const labels = this.intelligentClassifier.getClassificationLabels(
                classification.method,
                this.analyzer.articleContents.size
            );
            
            return {
                method: classification.method,
                description: classification.description,
                categories: Object.keys(classification.classification).map(category => ({
                    key: category,
                    count: classification.classification[category].length,
                    label: labels[category]?.name || category,
                    emoji: labels[category]?.emoji || '📊',
                    color: labels[category]?.color || '#666',
                    description: labels[category]?.description || ''
                })),
                thresholds: classification.thresholds,
                metadata: classification.metadata
            };
        } catch (error) {
            console.warn('获取分类详情失败:', error);
            return {
                method: 'error',
                description: '分类信息获取失败',
                categories: [],
                thresholds: {},
                metadata: {}
            };
        }
    }

    getStatsSummary() {
        const basicStats = this.analyzer.getStatsSummary();
        
        try {
            const classification = this.getIntelligentClassification();
            
            return {
                ...basicStats,
                intelligentClassification: {
                    method: classification.method,
                    description: classification.description,
                    distribution: {
                        ultraHigh: classification.classification['ultra-high'].length,
                        high: classification.classification['high'].length,
                        medium: classification.classification['medium'].length,
                        low: classification.classification['low'].length,
                        rare: classification.classification['rare'].length
                    },
                    thresholds: classification.thresholds,
                    labels: this.intelligentClassifier.getClassificationLabels(
                        classification.method, 
                        basicStats.totalArticlesAnalyzed
                    )
                }
            };
        } catch (error) {
            console.warn('智能分类生成失败，使用基础统计:', error);
            return basicStats;
        }
    }

    // 修复：双模式搜索接口
    searchWordsDual(query, mode = 'intelligent') {
        const normalizedQuery = query.toLowerCase().trim();
        
        if (!normalizedQuery) {
            return {
                currentMode: mode,
                currentResults: [],
                alternativeMode: mode === 'intelligent' ? 'exact' : 'intelligent',
                alternativeResults: [],
                suggestions: null,
                currentQuery: query || ''
            };
        }
        
        const currentCacheKey = `${normalizedQuery}_${mode}`;
        const altMode = mode === 'intelligent' ? 'exact' : 'intelligent';
        const altCacheKey = `${normalizedQuery}_${altMode}`;
        
        let currentResults = this.searchCache[mode].get(currentCacheKey);
        let alternativeResults = this.searchCache[altMode].get(altCacheKey);
        
        // 执行当前模式搜索
        if (!currentResults) {
            try {
                currentResults = mode === 'intelligent' 
                    ? this.analyzer.searchWords(normalizedQuery)
                    : this.analyzer.searchWordsExact(normalizedQuery);
                
                if (!Array.isArray(currentResults)) {
                    currentResults = [];
                }
                
                if (this.searchConfig.cacheSearchResults) {
                    this.cacheSearchResult(mode, currentCacheKey, currentResults);
                }
            } catch (error) {
                console.warn('Current search failed:', error);
                currentResults = [];
            }
        }
        
        // 执行替代模式搜索（用于智能提示）
        if (!alternativeResults && this.searchConfig.enableSuggestions) {
            try {
                alternativeResults = altMode === 'intelligent'
                    ? this.analyzer.searchWords(normalizedQuery)
                    : this.analyzer.searchWordsExact(normalizedQuery);
                
                if (!Array.isArray(alternativeResults)) {
                    alternativeResults = [];
                }
                
                if (this.searchConfig.cacheSearchResults) {
                    this.cacheSearchResult(altMode, altCacheKey, alternativeResults);
                }
            } catch (error) {
                console.warn('Alternative search failed:', error);
                alternativeResults = [];
            }
        }
        
        // 生成智能建议
        const suggestions = this.generateSearchSuggestions(
            normalizedQuery, 
            mode, 
            currentResults, 
            alternativeResults || []
        );
        
        return {
            currentMode: mode,
            currentResults: currentResults || [],
            alternativeMode: altMode,
            alternativeResults: alternativeResults || [],
            suggestions: suggestions,
            currentQuery: normalizedQuery
        };
    }
    
    cacheSearchResult(mode, cacheKey, results) {
        const cache = this.searchCache[mode];
        
        if (cache.size >= this.searchCache.maxCacheSize) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }
        
        cache.set(cacheKey, results);
    }
    
    generateSearchSuggestions(query, currentMode, currentResults, alternativeResults) {
        if (!this.searchConfig.enableSuggestions) {
            return null;
        }
        
        const currentCount = currentResults ? currentResults.length : 0;
        const altCount = alternativeResults ? alternativeResults.length : 0;
        
        let suggestion = null;
        
        if (currentMode === 'intelligent') {
            if (currentCount > 0 && altCount > 0 && altCount !== currentCount) {
                if (altCount < currentCount) {
                    suggestion = {
                        type: 'exact-fewer',
                        message: `精确搜索 "${query}" 有 ${altCount} 个结果`,
                        action: 'switch-to-exact',
                        count: altCount
                    };
                } else {
                    suggestion = {
                        type: 'exact-more',
                        message: `精确搜索 "${query}" 有 ${altCount} 个结果`,
                        action: 'switch-to-exact', 
                        count: altCount
                    };
                }
            } else if (currentCount === 0 && altCount > 0) {
                suggestion = {
                    type: 'try-exact',
                    message: `试试精确搜索 "${query}"，找到 ${altCount} 个结果`,
                    action: 'switch-to-exact',
                    count: altCount
                };
            }
        } else { // exact mode
            if (currentCount > 0 && altCount > currentCount) {
                suggestion = {
                    type: 'intelligent-more',
                    message: `智能匹配还有 ${altCount - currentCount} 个相关结果`,
                    action: 'switch-to-intelligent',
                    count: altCount
                };
            } else if (currentCount === 0 && altCount > 0) {
                suggestion = {
                    type: 'try-intelligent',
                    message: `精确搜索无结果，智能匹配找到 ${altCount} 个相关结果`,
                    action: 'switch-to-intelligent',
                    count: altCount
                };
            }
        }
        
        return suggestion;
    }
    
    clearSearchCache(mode = null) {
        if (mode) {
            this.searchCache[mode].clear();
        } else {
            this.searchCache.intelligent.clear();
            this.searchCache.exact.clear();
        }
    }

    async enableWebWorker() {
        if (!this.workerManager.isWorkerSupported) {
            console.warn('当前浏览器不支持Web Worker');
            return false;
        }
        
        try {
            const success = await this.workerManager.initWorker();
            if (success) {
                this.processingMode.useWorker = true;
                console.log('✅ Web Worker模式已启用');
                
                const customRules = Array.from(this.analyzer.stemmer.customMergeRules.entries());
                if (customRules.length > 0) {
                    await this.workerManager.updateCustomRules(customRules);
                }
                
                return true;
            }
        } catch (error) {
            console.error('启用Web Worker失败:', error);
        }
        
        return false;
    }
    
    disableWebWorker() {
        this.processingMode.useWorker = false;
        this.workerManager.cleanup();
        console.log('🔄 已切换到主线程模式');
    }
    
    async autoSelectProcessingMode(articleCount) {
        if (!this.processingMode.autoDetect) {
            return this.processingMode.useWorker;
        }
        
        if (articleCount >= this.processingMode.workerThreshold) {
            if (!this.processingMode.useWorker) {
                console.log(`📊 检测到${articleCount}篇文章，启用Web Worker模式以提升性能`);
                return await this.enableWebWorker();
            }
        }
        
        return this.processingMode.useWorker;
    }

    async waitForReady() {
        return this.initPromise;
    }

    getTopWords(limit = 100) {
        return this.analyzer.getWordFrequencyData().slice(0, limit);
    }

    searchWords(query) {
        return this.analyzer.searchWords(query);
    }

    getWordDetails(word) {
        let stats = this.analyzer.wordStats.get(word);
        
        if (!stats) {
            const baseForm = this.analyzer.stemmer.getStem(word);
            stats = this.analyzer.wordStats.get(baseForm);
        }
        
        if (!stats) {
            for (const [baseWord, wordStats] of this.analyzer.wordStats.entries()) {
                if (wordStats.variants.has(word)) {
                    stats = wordStats;
                    word = baseWord;
                    break;
                }
            }
        }
        
        if (!stats) return null;
        
        return {
            word,
            totalCount: stats.totalCount,
            articleCount: stats.articles.size,
            variants: Array.from(stats.variants.entries()).sort((a, b) => b[1] - a[1]),
            mostCommonVariant: this.analyzer.getMostCommonVariantOptimized(stats.variants),
            articles: Array.from(stats.articles.entries()).map(([id, data]) => ({
                id,
                title: data.title,
                count: data.count,
                contexts: data.contexts,
                variants: data.variants
            })).sort((a, b) => b.count - a.count)
        };
    }
    
    addMergeRule(variant, baseForm) {
        this.analyzer.addCustomMergeRule(variant, baseForm);
        
        if (this.processingMode.useWorker && this.workerManager.isAvailable()) {
            this.workerManager.updateCustomRules([[variant, baseForm]]).catch(console.warn);
        }
    }
    
    addMergeRules(rules) {
        this.analyzer.addCustomMergeRules(rules);
        
        if (this.processingMode.useWorker && this.workerManager.isAvailable()) {
            this.workerManager.updateCustomRules(rules).catch(console.warn);
        }
    }
    
    async forceReanalyze() {
        this.analyzer.markForReanalysis();
        this.processedArticles.clear();
        this.classificationCache.clear();
        this.clearSearchCache();
        await this.analyzeAllArticlesOptimized();
    }
    
    async getWorkerStats() {
        if (this.workerManager.isAvailable()) {
            return await this.workerManager.getWorkerStats();
        }
        return { error: 'Worker未启用或不可用' };
    }
    
    configureWorker(config) {
        this.workerManager.configure(config);
    }
    
    configureProcessing(config) {
        this.processingMode = { ...this.processingMode, ...config };
    }
    
    getPerformanceMetrics() {
        return {
            analyzer: this.analyzer.getPerformanceStats(),
            worker: this.workerManager.isAvailable() ? this.workerManager.workerStats : null,
            processing: {
                isProcessing: this.isProcessing,
                progress: this.processingProgress,
                processedArticles: this.processedArticles.size,
                mode: this.processingMode.useWorker ? 'worker' : 'main',
                workerAvailable: this.workerManager.isAvailable()
            },
            config: {
                processing: this.processingMode,
                performance: this.performanceConfig
            },
            intelligentClassification: {
                method: this.classificationMethod,
                cacheSize: this.classificationCache.size,
                availableMethods: Object.keys(this.intelligentClassifier.classificationMethods)
            }
        };
    }
    
    updatePerformanceConfig(config) {
        this.performanceConfig = { ...this.performanceConfig, ...config };
    }

    async analyzeAllArticlesOptimized() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.processingProgress = 0;
        
        try {
            const allChapters = await this.getAllChapters();
            
            if (allChapters.length === 0) {
                throw new Error('未找到任何文章');
            }
            
            await this.autoSelectProcessingMode(allChapters.length);
            
            if (this.processingMode.useWorker && this.workerManager.isAvailable()) {
                await this.analyzeWithWorker(allChapters);
            } else {
                if (this.performanceConfig.useStreamProcessing) {
                    await this.streamProcessArticles(allChapters);
                } else {
                    await this.batchProcessArticles(allChapters);
                }
            }
            
            this.cacheResults();
            
        } catch (error) {
            console.error('词频分析失败:', error);
            
            if (this.processingMode.useWorker && this.processingMode.fallbackOnError) {
                console.log('🔄 Worker模式出错，回退到主线程模式');
                this.disableWebWorker();
                
                if (this.performanceConfig.useStreamProcessing) {
                    await this.streamProcessArticles(await this.getAllChapters());
                } else {
                    await this.batchProcessArticles(await this.getAllChapters());
                }
                
                this.cacheResults();
            } else {
                throw error;
            }
            
        } finally {
            this.isProcessing = false;
            this.processingProgress = 100;
        }
    }
    
    async analyzeWithWorker(chapters) {
        console.log('🚀 使用Web Worker模式进行词频分析');
        
        const articles = [];
        
        for (const chapterId of chapters) {
            if (this.processedArticles.has(chapterId)) continue;
            
            try {
                const { content, title } = await this.getArticleContent(chapterId);
                articles.push({ id: chapterId, content, title });
            } catch (error) {
                console.warn(`获取文章 ${chapterId} 失败:`, error.message);
            }
        }
        
        if (articles.length === 0) return;
        
        try {
            const result = await this.workerManager.analyzeBatch(articles, (progress) => {
                this.processingProgress = progress;
                this.notifyProgress(this.processingProgress);
            });
            
            if (result && result.results && Array.isArray(result.results)) {
                result.results.forEach(articleResult => {
                    if (articleResult.error) {
                        console.warn(`文章 ${articleResult.articleId} 分析失败:`, articleResult.error);
                    } else if (articleResult.articleId) {
                        this.analyzer.processWorkerResult(articleResult);
                        this.processedArticles.add(articleResult.articleId);
                    }
                });
            } else {
                console.warn('Worker返回了无效结果:', result);
            }
            
            console.log('✅ Web Worker分析完成，性能统计:', result?.stats);
            
        } catch (error) {
            console.error('Worker批量分析失败:', error);
            throw error;
        }
    }
    
    async getArticleContent(chapterId) {
        let content = null;
        const navigation = window.app?.navigation;
        
        if (navigation?.cache) {
            content = navigation.cache.get(chapterId);
        }
        
        if (!content) {
            const response = await fetch(`chapters/${chapterId}.html`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            content = await response.text();
        }
        
        const textContent = this.extractTextFromHTMLOptimized(content);
        const title = this.extractTitleOptimized(content) || chapterId;
        
        if (!textContent || textContent.length < 50) {
            throw new Error('文章内容为空或过短');
        }
        
        return { content: textContent, title };
    }
    
    async streamProcessArticles(chapters) {
        console.log('🔄 使用主线程流式处理模式');
        const { batchSize, yieldInterval } = this.performanceConfig;
        
        for (let i = 0; i < chapters.length; i += batchSize) {
            const batch = chapters.slice(i, i + batchSize);
            
            const promises = batch.map(id => this.processArticleOptimized(id));
            await Promise.allSettled(promises);
            
            this.processingProgress = Math.round(((i + batch.length) / chapters.length) * 100);
            this.notifyProgress(this.processingProgress);
            
            if (i % 6 === 0) {
                await this.sleep(yieldInterval);
            }
        }
    }
    
    async batchProcessArticles(chapters) {
        console.log('🔄 使用主线程批处理模式');
        const { batchSize } = this.performanceConfig;
        
        for (let i = 0; i < chapters.length; i += batchSize) {
            const batch = chapters.slice(i, i + batchSize);
            await this.processBatch(batch);
            
            this.processingProgress = Math.round(((i + batch.length) / chapters.length) * 100);
            this.notifyProgress(this.processingProgress);
            
            await this.sleep(150);
        }
    }

    async getAllChapters() {
        if (window.app?.navigation?.chaptersMap) {
            return Array.from(window.app.navigation.chaptersMap.keys());
        }
        
        try {
            const response = await fetch('data/navigation.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const navData = await response.json();
            return navData.flatMap(series => 
                (series.chapters || []).map(ch => ch.id)
            ).filter(Boolean);
        } catch (error) {
            console.warn('无法从navigation.json获取章节列表:', error);
            return [];
        }
    }

    async processBatch(chapterIds) {
        const promises = chapterIds.map(id => this.processArticleOptimized(id));
        await Promise.allSettled(promises);
    }

    async processArticleOptimized(chapterId) {
        if (this.processedArticles.has(chapterId)) return;
        
        try {
            const { content, title } = await this.getArticleContent(chapterId);
            this.analyzer.analyzeArticle(chapterId, content, title);
            this.processedArticles.add(chapterId);
            
        } catch (error) {
            console.warn(`处理文章 ${chapterId} 时出错:`, error.message);
        }
    }

    extractTextFromHTMLOptimized(html) {
        try {
            const temp = document.createElement('div');
            temp.innerHTML = html;
            
            const removeSelectors = ['script', 'style', 'nav', 'header', 'footer', '.nav', '.navigation'];
            removeSelectors.forEach(selector => {
                temp.querySelectorAll(selector).forEach(el => el.remove());
            });
            
            return temp.textContent || temp.innerText || '';
        } catch (error) {
            return '';
        }
    }

    extractTitleOptimized(html) {
        const patterns = [
            /<h[1-3][^>]*>(.*?)<\/h[1-3]>/i,
            /<title[^>]*>(.*?)<\/title>/i
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) {
                return match[1].replace(/<[^>]*>/g, '').trim();
            }
        }
        
        return null;
    }

    loadFromCache(cachedData) {
        this.analyzer.wordStats = new Map(cachedData.wordStats);
        this.analyzer.articleContents = new Map(cachedData.articleContents);
        
        if (cachedData.variantIndex) {
            try {
                this.analyzer.variantIndex = new Map(
                    cachedData.variantIndex.map(([k, v]) => [k, new Set(v)])
                );
            } catch (error) {
                console.warn('Failed to load variant index from cache:', error);
                this.analyzer.variantIndex = new Map();
            }
        }
        
        if (cachedData.articleVariants) {
            try {
                this.analyzer.articleVariants = new Map(
                    cachedData.articleVariants.map(([k, v]) => [k, new Map(v)])
                );
            } catch (error) {
                console.warn('Failed to load article variants from cache:', error);
                this.analyzer.articleVariants = new Map();
            }
        }
        
        this.processedArticles = new Set(cachedData.processedArticles || []);
    }

    cacheResults() {
        if (!this.analyzer.cache) return;
        
        try {
            const cacheData = {
                wordStats: Array.from(this.analyzer.wordStats.entries()),
                articleContents: Array.from(this.analyzer.articleContents.entries()),
                variantIndex: Array.from(this.analyzer.variantIndex.entries()).map(
                    ([k, v]) => [k, Array.from(v)]
                ),
                articleVariants: Array.from(this.analyzer.articleVariants.entries()).map(
                    ([k, v]) => [k, Array.from(v.entries())]
                ),
                processedArticles: Array.from(this.processedArticles),
                timestamp: Date.now(),
                version: '4.4'
            };
            
            this.analyzer.cache.set('fullAnalysis', cacheData);
        } catch (error) {
            console.warn('Failed to cache results:', error);
        }
    }

    isCacheValid(cachedData) {
        const maxAge = 24 * 60 * 60 * 1000;
        return cachedData.timestamp && 
               cachedData.version >= '4.0' && 
               (Date.now() - cachedData.timestamp) < maxAge;
    }
    
    notifyProgress(progress) {
        document.dispatchEvent(new CustomEvent('wordFreqProgress', { 
            detail: { progress, isProcessing: this.isProcessing }
        }));
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    destroy() {
        this.workerManager.cleanup();
        
        if (this.performanceUpdateInterval) {
            clearInterval(this.performanceUpdateInterval);
        }
        
        if (this.analyzer.cache) {
            this.analyzer.cache.clear();
        }
        this.classificationCache.clear();
        this.clearSearchCache();
        
        this.analyzer.wordStats.clear();
        this.analyzer.articleContents.clear();
        this.analyzer.variantIndex.clear();
        this.analyzer.articleVariants.clear();
        this.processedArticles.clear();
        
        this.isProcessing = false;
        this.processingProgress = 0;
        
        console.log('📊 词频管理器已销毁并清理资源');
    }
}

// 导出到全局
window.EnglishSite.IntelligentWordFrequencyClassifier = IntelligentWordFrequencyClassifier;
window.EnglishSite.WordStemmer = WordStemmer;
window.EnglishSite.WordFrequencyAnalyzer = WordFrequencyAnalyzer;
window.EnglishSite.WordFrequencyManager = WordFrequencyManager;
window.EnglishSite.PerformanceOptimizer = PerformanceOptimizer;
window.EnglishSite.WebWorkerManager = WebWorkerManager;

console.log('📊 词频分析模块已加载（完全修复版v4.4）- 搜索功能已彻底修复');