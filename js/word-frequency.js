// js/word-frequency.js - 核心优化版 v2.0 (集成+修复+性能优化) - 时序冲突修复版
window.EnglishSite = window.EnglishSite || {};

// 🛡️ 兼容性检测 - 安全使用新核心基础设施
class CompatibilityLayer {
    static detectCoreInfrastructure() {
        return {
            hasNewConfig: !!(window.EnglishSite.Config),
            hasNewCache: !!(window.EnglishSite.CacheManager),
            hasNewError: !!(window.EnglishSite.ErrorHandler),
            hasNewPerf: !!(window.EnglishSite.Performance)
        };
    }
    
    static safeGetConfig(path, fallback) {
        const compat = this.detectCoreInfrastructure();
        if (compat.hasNewConfig) {
            try {
                return window.EnglishSite.Config.get(path, fallback);
            } catch (e) {
                console.warn('新Config系统异常，使用降级处理:', e.message);
            }
        }
        return fallback;
    }
    
    static safeCreateCache(name, maxSize = 50, ttl = 300000) {
        const compat = this.detectCoreInfrastructure();
        if (compat.hasNewCache) {
            try {
                return window.EnglishSite.CacheManager.create(name, maxSize, ttl);
            } catch (e) {
                console.warn('新Cache系统异常，使用Map降级:', e.message);
            }
        }
        // 降级到Map
        return new Map();
    }
    
    static safeHandleError(context, error) {
        const compat = this.detectCoreInfrastructure();
        if (compat.hasNewError) {
            try {
                window.EnglishSite.ErrorHandler.handle(context, error);
                return;
            } catch (e) {
                console.warn('新ErrorHandler异常，使用console降级:', e.message);
            }
        }
        // 降级到console
        console.error(`[${context}]`, error);
    }
    
    static safeMeasurePerf(name, fn) {
        const compat = this.detectCoreInfrastructure();
        if (compat.hasNewPerf && window.EnglishSite.Performance.enabled) {
            try {
                return window.EnglishSite.Performance.measure(name, fn);
            } catch (e) {
                console.warn('新Performance系统异常，直接执行:', e.message);
            }
        }
        // 降级到直接执行
        return fn();
    }
}

// 🎯 优化的词干提取器
class SimplifiedWordStemmer {
    constructor() {
        // 🎯 精简不规则动词映射
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
        
        // 🛡️ 智能缓存
        this.stemCache = CompatibilityLayer.safeCreateCache('word-stems', 500, 600000) || new Map();
        this.maxCacheSize = 500;
        
        // 预编译正则表达式
        this.regexPool = {
            punctuation: /[^\w\s'-]/g,
            whitespace: /\s+/g,
            trimDashes: /^[-']+|[-']+$/g,
            alphaOnly: /^[a-zA-Z]+$/,
            vowels: /[aeiou]/,
            suffixes: {
                ies: /ies$/, ves: /ves$/, ses: /ses$/, ches: /ches$/, shes: /shes$/,
                s: /s$/, ss: /ss$/, ied: /ied$/, ed: /ed$/, ing: /ing$/,
                ly: /ly$/, est: /est$/, er: /er$/
            }
        };
        
        this.suffixRules = [
            { pattern: 'ies', replacement: 'y', minLength: 5, regex: this.regexPool.suffixes.ies },
            { pattern: 'ves', replacement: 'f', minLength: 5, regex: this.regexPool.suffixes.ves },
            { pattern: 'ses', replacement: 's', minLength: 5, regex: this.regexPool.suffixes.ses },
            { pattern: 'ches', replacement: 'ch', minLength: 6, regex: this.regexPool.suffixes.ches },
            { pattern: 'shes', replacement: 'sh', minLength: 6, regex: this.regexPool.suffixes.shes },
            { pattern: 's', replacement: '', minLength: 4, regex: this.regexPool.suffixes.s, exclude: this.regexPool.suffixes.ss },
            { pattern: 'ied', replacement: 'y', minLength: 5, regex: this.regexPool.suffixes.ied },
            { pattern: 'ed', replacement: '', minLength: 4, regex: this.regexPool.suffixes.ed },
            { pattern: 'ing', replacement: '', minLength: 5, regex: this.regexPool.suffixes.ing },
            { pattern: 'ly', replacement: '', minLength: 5, regex: this.regexPool.suffixes.ly },
            { pattern: 'est', replacement: '', minLength: 5, regex: this.regexPool.suffixes.est },
            { pattern: 'er', replacement: '', minLength: 4, regex: this.regexPool.suffixes.er }
        ];
    }
    
    getStem(word) {
        const lowerWord = word.toLowerCase();
        
        // 智能缓存查找
        const cachedResult = this.getCachedStem(lowerWord);
        if (cachedResult !== null) {
            return cachedResult;
        }
        
        let result;
        if (this.irregularVerbsMap.has(lowerWord)) {
            result = this.irregularVerbsMap.get(lowerWord);
        } else {
            result = this.applySuffixRules(lowerWord);
        }
        
        this.setCachedStem(lowerWord, result);
        return result;
    }
    
    getCachedStem(word) {
        try {
            if (this.stemCache && typeof this.stemCache.get === 'function') {
                return this.stemCache.get(word);
            } else if (this.stemCache && this.stemCache.has) {
                return this.stemCache.get(word) || null;
            }
        } catch (e) {
            CompatibilityLayer.safeHandleError('stemmer.cache.get', e);
        }
        return null;
    }
    
    setCachedStem(word, result) {
        try {
            if (this.stemCache && typeof this.stemCache.set === 'function') {
                this.stemCache.set(word, result);
            } else if (this.stemCache && this.stemCache.set) {
                if (this.stemCache.size >= this.maxCacheSize) {
                    const firstKey = this.stemCache.keys().next().value;
                    this.stemCache.delete(firstKey);
                }
                this.stemCache.set(word, result);
            }
        } catch (e) {
            CompatibilityLayer.safeHandleError('stemmer.cache.set', e);
        }
    }
    
    applySuffixRules(word) {
        const wordLength = word.length;
        if (wordLength < 4) return word;
        
        for (const rule of this.suffixRules) {
            if (wordLength >= rule.minLength && 
                rule.regex.test(word) && 
                (!rule.exclude || !rule.exclude.test(word))) {
                
                const stem = word.replace(rule.regex, rule.replacement);
                if (this.isValidStem(stem, word)) {
                    return stem;
                }
            }
        }
        return word;
    }
    
    isValidStem(stem, original) {
        const stemLen = stem.length;
        const origLen = original.length;
        return stemLen >= 2 && stemLen >= origLen * 0.4 && (stemLen <= 2 || this.regexPool.vowels.test(stem));
    }
    
    clearCache() {
        try {
            if (this.stemCache && typeof this.stemCache.clear === 'function') {
                this.stemCache.clear();
            }
        } catch (e) {
            CompatibilityLayer.safeHandleError('stemmer.clearCache', e);
        }
    }
}

// 🎯 词频分析器 - 修复智能难度算法
class SimplifiedWordFrequencyAnalyzer {
    constructor() {
        this.stemmer = new SimplifiedWordStemmer();
        
        // 核心数据结构
        this.wordStats = new Map();
        this.articleContents = new Map();
        this.variantIndex = new Map();
        this.articleVariants = new Map();
        
        // 停用词集合
        this.stopWordsSet = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 
            'by', 'from', 'this', 'that', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
            'is', 'are', 'was', 'were', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'can', 'could', 'should', 'not', 'no', 'all', 'any', 'some',
            'neil', 'beth'
        ]);
        
        // 预编译正则表达式
        this.regexPool = {
            punctuation: /[^\w\s'-]/g,
            whitespace: /\s+/g,
            trimDashes: /^[-']+|[-']+$/g,
            alphaOnly: /^[a-zA-Z]+$/,
            digits: /^\d+$/,
            sentences: /[.!?]+/
        };
    }
    
    analyzeArticle(articleId, content, title) {
        return CompatibilityLayer.safeMeasurePerf('analyzeArticle', () => {
            try {
                console.log(`📝 分析文章: ${articleId}`);
                
                const words = this.extractWords(content);
                const wordCounts = new Map();
                
                // 统计词频
                for (const originalWord of words) {
                    if (this.isValidWord(originalWord)) {
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
                
                // 更新全局统计
                this.updateGlobalStats(articleId, title, content, wordCounts);
                
                // 保存文章内容信息
                this.articleContents.set(articleId, {
                    content,
                    title,
                    wordCount: words.length,
                    uniqueWords: wordCounts.size
                });
                
                console.log(`✅ 文章分析完成: ${articleId} (${words.length}词, ${wordCounts.size}唯一)`);
                
            } catch (error) {
                CompatibilityLayer.safeHandleError(`analyzeArticle.${articleId}`, error);
            }
        });
    }
    
    extractWords(text) {
        if (!text || typeof text !== 'string') return [];
        
        const cleanText = text
            .toLowerCase()
            .replace(this.regexPool.punctuation, ' ')
            .replace(this.regexPool.whitespace, ' ');
        
        const rawWords = cleanText.split(' ');
        const words = [];
        
        for (const word of rawWords) {
            const cleanWord = word.replace(this.regexPool.trimDashes, '');
            if (this.isValidWord(cleanWord)) {
                words.push(cleanWord);
            }
        }
        
        return words;
    }
    
    isValidWord(word) {
        if (!word || typeof word !== 'string') return false;
        const len = word.length;
        return len >= 3 && len <= 20 && 
               !this.stopWordsSet.has(word) &&
               !this.regexPool.digits.test(word) &&
               this.regexPool.alphaOnly.test(word);
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
            
            // 更新变形词统计
            data.variants.forEach((count, variant) => {
                const currentCount = stats.variants.get(variant) || 0;
                stats.variants.set(variant, currentCount + count);
                this.updateVariantIndex(variant, articleId, count);
            });
            
            // 更新文章信息
            const contexts = this.extractContexts(content, baseWord);
            stats.articles.set(articleId, {
                count: data.totalCount,
                title,
                contexts,
                variants: Array.from(data.variants.entries())
            });
        });
    }
    
    updateVariantIndex(variant, articleId, count) {
        if (!this.variantIndex.has(variant)) {
            this.variantIndex.set(variant, new Set());
        }
        this.variantIndex.get(variant).add(articleId);
        
        if (!this.articleVariants.has(articleId)) {
            this.articleVariants.set(articleId, new Map());
        }
        this.articleVariants.get(articleId).set(variant, count);
    }
    
    extractContexts(content, baseWord) {
        const contexts = [];
        try {
            const sentences = content.split(this.regexPool.sentences);
            const stats = this.wordStats.get(baseWord);
            const variants = stats ? Array.from(stats.variants.keys()).slice(0, 3) : [baseWord];
            
            let foundCount = 0;
            const maxContexts = 2;
            
            for (const sentence of sentences) {
                if (foundCount >= maxContexts) break;
                
                const trimmed = sentence.trim();
                if (!trimmed) continue;
                
                const hasMatch = variants.some(variant => 
                    new RegExp(`\\b${this.escapeRegex(variant)}\\b`, 'i').test(trimmed)
                );
                
                if (hasMatch) {
                    let context = trimmed.substring(0, 100);
                    if (trimmed.length > 100) context += '...';
                    
                    variants.forEach(variant => {
                        const regex = new RegExp(`\\b${this.escapeRegex(variant)}\\b`, 'gi');
                        context = context.replace(regex, `<mark>$&</mark>`);
                    });
                    
                    contexts.push(context);
                    foundCount++;
                }
            }
        } catch (error) {
            console.warn('提取上下文失败:', error);
        }
        return contexts;
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // 🎯 智能搜索 - 基于词干合并
    searchWords(query) {
        console.log(`🧠 执行智能搜索: "${query}"`);
        
        if (!query || typeof query !== 'string') return [];
        
        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) return [];
        
        const results = [];
        
        this.wordStats.forEach((stats, baseWord) => {
            let relevance = 0;
            let matchedVariants = [];
            
            // 词根匹配
            if (baseWord === lowerQuery) {
                relevance = 10;
            } else if (baseWord.startsWith(lowerQuery)) {
                relevance = 8;
            } else if (baseWord.includes(lowerQuery)) {
                relevance = 6;
            }
            
            // 变形词匹配
            let variantRelevance = 0;
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
            
            const finalRelevance = Math.max(relevance, variantRelevance);
            
            if (finalRelevance > 0) {
                results.push({
                    word: baseWord,
                    totalCount: stats.totalCount,
                    articleCount: stats.articles.size,
                    variants: Array.from(stats.variants.entries()),
                    mostCommonVariant: this.getMostCommonVariant(stats.variants),
                    relevance: finalRelevance,
                    matchedVariants: matchedVariants,
                    isIntelligentMatch: true,
                    isExactMatch: false
                });
            }
        });
        
        results.sort((a, b) => {
            const relevanceDiff = b.relevance - a.relevance;
            return relevanceDiff !== 0 ? relevanceDiff : b.totalCount - a.totalCount;
        });
        
        console.log(`🧠 智能搜索完成: 找到 ${results.length} 个结果`);
        return results;
    }
    
    // 🎯 精确搜索 - 基于原文匹配
    searchWordsExact(query) {
        console.log(`🎯 执行精确搜索: "${query}"`);
        
        if (!query || typeof query !== 'string') return [];
        
        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) return [];
        
        const results = [];
        
        if (!this.variantIndex.has(lowerQuery)) {
            console.log(`🎯 精确搜索完成: 未找到 "${lowerQuery}"`);
            return [];
        }
        
        const matchingArticles = this.variantIndex.get(lowerQuery);
        const articleDetails = [];
        
        matchingArticles.forEach(articleId => {
            try {
                const articleContent = this.articleContents.get(articleId);
                const variantCount = this.articleVariants.get(articleId)?.get(lowerQuery) || 0;
                
                if (articleContent && variantCount > 0) {
                    articleDetails.push({
                        id: articleId,
                        title: articleContent.title,
                        count: variantCount,
                        contexts: this.extractContextsForExactMatch(articleContent.content, lowerQuery)
                    });
                }
            } catch (error) {
                console.warn(`处理文章 ${articleId} 时出错:`, error);
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
                isIntelligentMatch: false,
                isExactMatch: true
            });
        }
        
        console.log(`🎯 精确搜索完成: 找到 ${results.length} 个结果`);
        return results;
    }
    
    extractContextsForExactMatch(content, word) {
        const contexts = [];
        try {
            const sentences = content.split(this.regexPool.sentences);
            const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
            
            let foundCount = 0;
            const maxContexts = 2;
            
            for (const sentence of sentences) {
                if (foundCount >= maxContexts) break;
                
                const trimmed = sentence.trim();
                if (!trimmed || !regex.test(trimmed)) continue;
                
                let context = trimmed.substring(0, 100);
                if (trimmed.length > 100) context += '...';
                
                context = context.replace(regex, `<mark>$&</mark>`);
                contexts.push(context);
                foundCount++;
                regex.lastIndex = 0;
            }
        } catch (error) {
            console.warn('提取精确匹配上下文失败:', error);
        }
        return contexts;
    }
    
    getMostCommonVariant(variants) {
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
    
    // 🎯 修复的智能难度算法
    calculateSmartArticleDifficulty(articleId) {
        const article = this.articleContents.get(articleId);
        if (!article) return null;
        
        const words = this.extractWords(article.content);
        let totalDifficultyScore = 0;
        let validWordCount = 0;
        let difficultyBreakdown = { easy: 0, medium: 0, hard: 0 };
        
        words.forEach(word => {
            if (this.isValidWord(word)) {
                const stem = this.stemmer.getStem(word);
                const stats = this.wordStats.get(stem);
                
                if (stats) {
                    validWordCount++;
                    
                    // 🔧 修复的分布评分计算
                    const distributionScore = this.calculateDistributionScore(stem, stats);
                    const wordDifficulty = this.convertScoreToDifficulty(distributionScore);
                    totalDifficultyScore += wordDifficulty;
                    
                    // 统计难度分布
                    if (wordDifficulty <= 2) difficultyBreakdown.easy++;
                    else if (wordDifficulty <= 3.5) difficultyBreakdown.medium++;
                    else difficultyBreakdown.hard++;
                }
            }
        });
        
        if (validWordCount === 0) return { stars: 3, label: "⭐⭐⭐ 中等", tooltip: "无可分析词汇" };
        
        const avgDifficulty = totalDifficultyScore / validWordCount;
        const stars = Math.round(avgDifficulty);
        const easyWordRatio = (difficultyBreakdown.easy / validWordCount * 100).toFixed(1);
        
        return {
            stars: Math.max(1, Math.min(5, stars)),
            avgDifficulty: avgDifficulty.toFixed(2),
            validWordCount: validWordCount,
            easyWordRatio: easyWordRatio,
            label: this.getStarLabel(stars),
            breakdown: difficultyBreakdown,
            tooltip: `${easyWordRatio}% 高频词汇 (${validWordCount}个有效词)`
        };
    }
    
    // 🔧 修复的分布评分算法
    calculateDistributionScore(baseWord, stats) {
        const frequency = stats.totalCount;
        const articleCount = stats.articles.size;
        const totalArticles = this.articleContents.size;
        
        if (totalArticles === 0 || articleCount === 0) return frequency;
        
        // 分布密度：在多少比例的文章中出现
        const distributionRatio = articleCount / totalArticles;
        
        // 平均密度：每篇文章平均出现次数
        const avgDensity = frequency / articleCount;
        
        // 🔧 修复的综合评分公式
        const distributionWeight = Math.sqrt(distributionRatio); // 分布广度权重
        const stabilityWeight = Math.log(avgDensity + 1) / Math.log(10); // 稳定性权重
        
        return frequency * distributionWeight * stabilityWeight;
    }
    
    // 🔧 修复的难度转换
    convertScoreToDifficulty(distributionScore) {
        // 根据实际分布情况调整难度映射
        if (distributionScore >= 50) return 1;      // 很简单（高频高分布）
        if (distributionScore >= 20) return 2;      // 简单  
        if (distributionScore >= 8) return 3;       // 中等
        if (distributionScore >= 3) return 4;       // 困难
        return 5;                                   // 很困难（低频低分布）
    }
    
    getStarLabel(stars) {
        const labels = {
            1: "⭐ 入门级",
            2: "⭐⭐ 简单", 
            3: "⭐⭐⭐ 中等",
            4: "⭐⭐⭐⭐ 困难",
            5: "⭐⭐⭐⭐⭐ 专家级"
        };
        return labels[stars] || "⭐⭐⭐ 中等";
    }
    
    // 🎯 获取智能排序的词频数据
    getWordFrequencyDataSmart() {
        const data = [];
        
        this.wordStats.forEach((stats, baseWord) => {
            const distributionScore = this.calculateDistributionScore(baseWord, stats);
            
            data.push({
                word: baseWord,
                totalCount: stats.totalCount,
                articleCount: stats.articles.size,
                distributionScore: distributionScore,
                distributionRatio: stats.articles.size / this.articleContents.size,
                avgPerArticle: (stats.totalCount / stats.articles.size).toFixed(1),
                variants: Array.from(stats.variants.entries()).sort((a, b) => b[1] - a[1]),
                mostCommonVariant: this.getMostCommonVariant(stats.variants),
                articles: Array.from(stats.articles.entries()).map(([id, articleData]) => ({
                    id,
                    title: articleData.title,
                    count: articleData.count,
                    contexts: articleData.contexts,
                    variants: articleData.variants
                }))
            });
        });
        
        // 按智能评分排序
        data.sort((a, b) => b.distributionScore - a.distributionScore);
        return data;
    }
    
    // 🎯 标准词频数据
    getWordFrequencyData() {
        const data = [];
        
        this.wordStats.forEach((stats, baseWord) => {
            data.push({
                word: baseWord,
                totalCount: stats.totalCount,
                articleCount: stats.articles.size,
                variants: Array.from(stats.variants.entries()).sort((a, b) => b[1] - a[1]),
                mostCommonVariant: this.getMostCommonVariant(stats.variants),
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
        return data;
    }
    
    filterByFrequency(minCount = 1, maxCount = Infinity) {
        const results = [];
        
        this.wordStats.forEach((stats, baseWord) => {
            const count = stats.totalCount;
            if (count >= minCount && count <= maxCount) {
                results.push({
                    word: baseWord,
                    totalCount: count,
                    articleCount: stats.articles.size,
                    variants: Array.from(stats.variants.entries()),
                    mostCommonVariant: this.getMostCommonVariant(stats.variants)
                });
            }
        });
        
        results.sort((a, b) => b.totalCount - a.totalCount);
        return results;
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
        
        return {
            totalUniqueWords,
            totalVariants,
            totalWordOccurrences: totalOccurrences,
            totalArticlesAnalyzed: totalArticles,
            averageWordsPerArticle: totalArticles > 0 ? Math.round(totalOccurrences / totalArticles) : 0,
            exactIndexStats: {
                totalVariants: this.variantIndex.size,
                articlesWithVariants: this.articleVariants.size
            }
        };
    }
}

// 🎯 词频管理器 - 时序冲突修复版
class SimplifiedWordFrequencyManager {
    constructor(navigationState = null) {
        this.analyzer = new SimplifiedWordFrequencyAnalyzer();
        this.isInitialized = false;
        this.isInitializing = false;
        this.initializationError = null;
        this.processedArticles = new Set();
        this.processingProgress = 0;
        
        // 🔧 修复：保存导航状态
        this.navigationState = navigationState;
        
        // 🛡️ 智能缓存
        this.cache = CompatibilityLayer.safeCreateCache('wordFreq', 100, 3600000);
        
        console.log('✅ 词频管理器已创建', navigationState ? '(接收到导航状态)' : '(无导航状态)');
        
        // 🎯 延迟自动初始化，给导航系统更多时间
        setTimeout(() => {
            this.startInitialization();
        }, 100); // 增加延迟时间
    }
    
    async startInitialization() {
        if (this.isInitializing || this.isInitialized) return;
        
        this.isInitializing = true;
        
        try {
            console.log('🚀 开始词频分析器初始化...');
            
            // 检查缓存
            const cachedData = this.cache?.get('fullAnalysis');
            if (cachedData && this.isCacheValid(cachedData)) {
                console.log('📦 从缓存加载词频数据');
                this.loadFromCache(cachedData);
                this.isInitialized = true;
                this.isInitializing = false;
                console.log('✅ 词频分析器初始化完成 (从缓存)');
                return;
            }
            
            // 全新分析
            await this.analyzeAllArticles();
            this.cacheResults();
            
            this.isInitialized = true;
            this.isInitializing = false;
            
            console.log('✅ 词频分析器初始化完成 (全新分析)');
            
        } catch (error) {
            console.error('❌ 词频分析器初始化失败:', error);
            this.initializationError = error;
            this.isInitializing = false;
        }
    }
    
    async waitForReady() {
        const maxWaitTime = 60000;
        const checkInterval = 100;
        let waitedTime = 0;
        
        return new Promise((resolve, reject) => {
            const checkStatus = () => {
                if (this.isInitialized) {
                    resolve(true);
                } else if (this.initializationError) {
                    reject(this.initializationError);
                } else if (waitedTime >= maxWaitTime) {
                    reject(new Error('初始化超时'));
                } else {
                    waitedTime += checkInterval;
                    setTimeout(checkStatus, checkInterval);
                }
            };
            checkStatus();
        });
    }
    
    async analyzeAllArticles() {
        console.log('📊 开始分析所有文章...');
        
        try {
            const allChapters = await this.getAllChapters();
            
            if (!Array.isArray(allChapters) || allChapters.length === 0) {
                throw new Error('未找到任何可分析的文章');
            }
            
            console.log(`📋 找到 ${allChapters.length} 篇文章，开始分析...`);
            
            let processedCount = 0;
            
            for (const chapterId of allChapters) {
                try {
                    const articleData = await this.getArticleContent(chapterId);
                    this.analyzer.analyzeArticle(chapterId, articleData.content, articleData.title);
                    this.processedArticles.add(chapterId);
                    
                    processedCount++;
                    this.processingProgress = Math.round((processedCount / allChapters.length) * 100);
                    
                    this.dispatchProgressEvent(this.processingProgress);
                    
                    if (processedCount % 5 === 0) {
                        await this.sleep(10);
                    }
                    
                } catch (error) {
                    console.warn(`❌ 分析文章 ${chapterId} 失败:`, error.message);
                }
            }
            
            console.log(`✅ 文章分析完成: ${processedCount}/${allChapters.length} 篇成功`);
            
        } catch (error) {
            console.error('❌ 文章分析失败:', error);
            throw error;
        }
    }
    
    // 🔧 修复：增加导航就绪检测和重试机制的getAllChapters
    async getAllChapters() {
        console.log('📋 获取文章列表...');
        
        // 🔧 方法1: 智能检测Navigation系统就绪状态（增加重试机制）
        try {
            console.log('🔧 方法1：尝试从Navigation系统获取章节...');
            
            const chapters = await this.getChaptersFromNavigation();
            if (chapters && chapters.length > 0) {
                console.log(`✅ 从Navigation系统获取到 ${chapters.length} 个章节`);
                return chapters;
            } else {
                console.warn('⚠️ Navigation系统返回空章节列表');
            }
        } catch (error) {
            console.warn('❌ 方法1失败:', error.message);
        }
        
        // 方法2: 从navigation.json获取（保持原有逻辑）
        try {
            console.log('🔧 方法2：尝试从navigation.json获取章节...');
            
            const response = await fetch('data/navigation.json', {
                method: 'GET',
                cache: 'no-store'
            });
            
            if (response.ok) {
                const navData = await response.json();
                
                if (Array.isArray(navData) && navData.length > 0) {
                    const allChapters = [];
                    
                    navData.forEach(series => {
                        if (series && Array.isArray(series.chapters)) {
                            series.chapters.forEach(chapter => {
                                if (chapter && chapter.id && typeof chapter.id === 'string') {
                                    allChapters.push(chapter.id);
                                }
                            });
                        }
                    });
                    
                    if (allChapters.length > 0) {
                        const uniqueChapters = [...new Set(allChapters)];
                        console.log(`✅ 从navigation.json获取到 ${uniqueChapters.length} 个唯一章节`);
                        return uniqueChapters;
                    }
                }
            }
        } catch (error) {
            console.warn('❌ 方法2失败:', error.message);
        }
        
        // 方法3: 使用演示数据（最后备选）
        console.warn('⚠️ 所有数据源检测失败，使用演示数据');
        const demoChapters = this.generateDemoChapters();
        await this.createDemoContent(demoChapters);
        console.log(`✅ 创建了 ${demoChapters.length} 个演示章节`);
        return demoChapters;
    }
    
    // 🔧 新增：智能获取Navigation系统章节（重试机制）
    async getChaptersFromNavigation() {
        const maxRetries = 20; // 增加重试次数
        const retryInterval = 200; // 重试间隔
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📍 第${attempt}次尝试获取Navigation章节...`);
                
                // 🔧 优先使用构造函数传入的导航状态
                if (this.navigationState?.available && this.navigationState?.chaptersMap) {
                    const chaptersMap = this.navigationState.chaptersMap;
                    if (chaptersMap.size > 0) {
                        const chapters = Array.from(chaptersMap.keys()).filter(id => 
                            id && typeof id === 'string' && id.trim().length > 0
                        );
                        
                        if (chapters.length > 0) {
                            console.log(`✅ 从构造函数导航状态获取到 ${chapters.length} 个章节 (第${attempt}次尝试)`);
                            return chapters;
                        }
                    }
                }
                
                // 🔧 检查全局window.app.navigation状态
                if (window.app?.navigation?.state?.chaptersMap) {
                    const chaptersMap = window.app.navigation.state.chaptersMap;
                    const chaptersCount = chaptersMap.size;
                    
                    console.log(`📊 Navigation状态检查 (第${attempt}次): chaptersMap.size = ${chaptersCount}`);
                    
                    if (chaptersCount > 0) {
                        const chapters = Array.from(chaptersMap.keys()).filter(id => 
                            id && typeof id === 'string' && id.trim().length > 0
                        );
                        
                        if (chapters.length > 0) {
                            console.log(`✅ 从window.app.navigation获取到 ${chapters.length} 个章节 (第${attempt}次尝试)`);
                            return chapters;
                        }
                    } else if (attempt < maxRetries) {
                        // chaptersMap为空，继续重试
                        console.log(`⏳ chaptersMap为空，等待${retryInterval}ms后重试...`);
                        await this.sleep(retryInterval);
                        continue;
                    }
                } else {
                    console.log(`⏳ Navigation系统尚未就绪 (第${attempt}次)，继续等待...`);
                    if (attempt < maxRetries) {
                        await this.sleep(retryInterval);
                        continue;
                    }
                }
                
            } catch (error) {
                console.warn(`❌ 第${attempt}次获取Navigation章节失败:`, error.message);
                if (attempt < maxRetries) {
                    await this.sleep(retryInterval);
                    continue;
                }
            }
        }
        
        console.warn(`⚠️ Navigation章节获取失败：尝试了${maxRetries}次仍未成功`);
        throw new Error(`Navigation系统在${maxRetries}次重试后仍未就绪`);
    }
    
    generateDemoChapters() {
        return [
            'demo-introduction-to-english',
            'demo-grammar-fundamentals',
            'demo-vocabulary-building',
            'demo-pronunciation-guide',
            'demo-reading-skills'
        ];
    }
    
    async createDemoContent(demoChapters) {
        const demoContent = [
            {
                title: "Introduction to English Learning",
                content: `English language learning represents one of the most significant educational pursuits in the modern world. Students must develop strong foundation in basic grammar concepts, including proper sentence structure, verb conjugation, and syntactic relationships. Vocabulary acquisition involves memorizing common words, understanding etymology, and practicing contextual usage. Research demonstrates that successful language acquisition depends on multiple factors: motivation, exposure frequency, practice intensity, and methodological approach. Effective learning strategies include immersive practice, structured lessons, and consistent review sessions.`
            },
            {
                title: "Grammar Fundamentals",
                content: `English grammar forms the structural foundation for effective communication and linguistic competence. Understanding grammatical principles enables speakers to construct meaningful sentences, express complex ideas, and communicate with precision and clarity. Essential grammar components include nouns, verbs, adjectives, adverbs, prepositions, conjunctions, and interjections. Sentence construction follows specific patterns: subject-verb-object arrangements, subordinate clauses, and compound structures. Advanced grammar concepts encompass conditional statements, passive voice constructions, and complex tense relationships.`
            },
            {
                title: "Vocabulary Development",
                content: `Vocabulary expansion represents the cornerstone of linguistic proficiency and communication effectiveness. Strategic vocabulary development involves systematic learning, contextual understanding, and practical application of new words and phrases. Word families and etymology provide powerful tools for understanding relationships between related terms. Active vocabulary building strategies include flashcard systems, spaced repetition algorithms, contextual learning exercises, and practical application activities. Advanced learners should focus on colloquial expressions, idiomatic phrases, and technical terminology.`
            },
            {
                title: "Pronunciation and Phonetics",
                content: `Pronunciation training emphasizes phonetic accuracy, stress patterns, and intonation variations. English phonetics involves understanding individual sounds, syllable structures, and rhythm patterns. Effective pronunciation requires consistent practice, audio feedback, and systematic study of sound combinations. Students should focus on common pronunciation challenges, including vowel sounds, consonant clusters, and word stress patterns. Advanced pronunciation skills include connected speech, linking sounds, and natural rhythm patterns that characterize fluent English speaking.`
            },
            {
                title: "Reading Comprehension Skills",
                content: `Reading comprehension skills are fundamental for academic success and language proficiency. Effective reading strategies include skimming, scanning, detailed reading, and critical analysis. Students must develop the ability to understand main ideas, identify supporting details, and make inferences from textual information. Advanced reading skills involve analyzing author's purpose, recognizing literary devices, and evaluating arguments and evidence. Critical reading requires understanding implicit meanings, cultural contexts, and sophisticated vocabulary usage throughout complex texts.`
            }
        ];
        
        for (let i = 0; i < demoChapters.length; i++) {
            const chapterId = demoChapters[i];
            const content = demoContent[i % demoContent.length];
            
            const htmlContent = `
                <html>
                    <head><title>${content.title}</title></head>
                    <body>
                        <article>
                            <h1>${content.title}</h1>
                            <div class="content">
                                <p>${content.content}</p>
                            </div>
                        </article>
                    </body>
                </html>
            `;
            
            sessionStorage.setItem(`demo_content_${chapterId}`, htmlContent);
        }
    }
    
    async getArticleContent(chapterId) {
        // 尝试从缓存获取
        const demoContent = sessionStorage.getItem(`demo_content_${chapterId}`);
        if (demoContent) {
            const textContent = this.extractTextFromHTML(demoContent);
            const title = this.extractTitleFromHTML(demoContent) || chapterId;
            return { content: textContent, title };
        }
        
        // 尝试从navigation缓存获取
        if (window.app?.navigation?.cache) {
            const cachedContent = window.app.navigation.cache.get(chapterId);
            if (cachedContent) {
                const textContent = this.extractTextFromHTML(cachedContent);
                const title = this.extractTitleFromHTML(cachedContent) || chapterId;
                return { content: textContent, title };
            }
        }
        
        // 尝试从文件获取
        try {
            const response = await fetch(`chapters/${chapterId}.html`);
            if (response.ok) {
                const htmlContent = await response.text();
                const textContent = this.extractTextFromHTML(htmlContent);
                const title = this.extractTitleFromHTML(htmlContent) || chapterId;
                return { content: textContent, title };
            }
        } catch (error) {
            console.warn(`无法从文件获取 ${chapterId}:`, error.message);
        }
        
        throw new Error(`无法获取文章内容: ${chapterId}`);
    }
    
    extractTextFromHTML(html) {
        try {
            if (typeof DOMParser !== 'undefined') {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                const scripts = doc.querySelectorAll('script, style, nav, header, footer');
                scripts.forEach(el => el.remove());
                
                return doc.body ? doc.body.textContent || doc.body.innerText || '' : '';
            } else {
                return html
                    .replace(/<script[^>]*>.*?<\/script>/gis, '')
                    .replace(/<style[^>]*>.*?<\/style>/gis, '')
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            }
        } catch (error) {
            console.warn('HTML文本提取失败:', error);
            return '';
        }
    }
    
    extractTitleFromHTML(html) {
        try {
            const titlePatterns = [
                /<h[1-3][^>]*>(.*?)<\/h[1-3]>/i,
                /<title[^>]*>(.*?)<\/title>/i
            ];
            
            for (const pattern of titlePatterns) {
                const match = html.match(pattern);
                if (match && match[1]) {
                    return match[1].replace(/<[^>]*>/g, '').trim();
                }
            }
            
            return null;
        } catch (error) {
            console.warn('标题提取失败:', error);
            return null;
        }
    }
    
    dispatchProgressEvent(progress) {
        try {
            document.dispatchEvent(new CustomEvent('wordFreqProgress', {
                detail: { progress }
            }));
        } catch (error) {
            console.warn('进度事件发送失败:', error);
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    isCacheValid(cachedData) {
        try {
            if (!cachedData || typeof cachedData !== 'object') return false;
            
            const { timestamp, dataSize } = cachedData;
            
            const maxAge = 24 * 60 * 60 * 1000;
            if (!timestamp || Date.now() - timestamp > maxAge) return false;
            
            if (!dataSize || dataSize < 10) return false;
            
            return true;
        } catch (error) {
            console.warn('缓存验证失败:', error);
            return false;
        }
    }
    
    loadFromCache(cachedData) {
        try {
            const { wordStats, articleContents, variantIndex, articleVariants } = cachedData;
            
            if (wordStats) {
                this.analyzer.wordStats = new Map(wordStats);
            }
            if (articleContents) {
                this.analyzer.articleContents = new Map(articleContents);
            }
            if (variantIndex) {
                this.analyzer.variantIndex = new Map(variantIndex.map(([k, v]) => [k, new Set(v)]));
            }
            if (articleVariants) {
                this.analyzer.articleVariants = new Map(articleVariants);
            }
            
            console.log('📦 缓存数据加载完成');
        } catch (error) {
            console.error('缓存加载失败:', error);
            throw error;
        }
    }
    
    cacheResults() {
        try {
            const cacheData = {
                timestamp: Date.now(),
                version: '2.0',
                wordStats: Array.from(this.analyzer.wordStats.entries()),
                articleContents: Array.from(this.analyzer.articleContents.entries()),
                variantIndex: Array.from(this.analyzer.variantIndex.entries()).map(([k, v]) => [k, Array.from(v)]),
                articleVariants: Array.from(this.analyzer.articleVariants.entries()),
                dataSize: this.analyzer.wordStats.size
            };
            
            if (this.cache) {
                this.cache.set('fullAnalysis', cacheData);
                console.log('💾 分析结果已缓存');
            }
        } catch (error) {
            console.warn('缓存保存失败:', error);
        }
    }
    
    // 🎯 公共API方法
    getTopWords(limit = 100) {
        try {
            const words = this.analyzer.getWordFrequencyData();
            return words.slice(0, limit);
        } catch (error) {
            CompatibilityLayer.safeHandleError('getTopWords', error);
            return [];
        }
    }
    
    // 🎯 智能排序API
    getTopWordsSmart(limit = 100) {
        try {
            const words = this.analyzer.getWordFrequencyDataSmart();
            return words.slice(0, limit);
        } catch (error) {
            CompatibilityLayer.safeHandleError('getTopWordsSmart', error);
            return [];
        }
    }
    
    getWordDetails(word) {
        try {
            const stats = this.analyzer.wordStats.get(word.toLowerCase());
            if (!stats) return null;
            
            return {
                word: word,
                totalCount: stats.totalCount,
                articleCount: stats.articles.size,
                variants: Array.from(stats.variants.entries()),
                articles: Array.from(stats.articles.entries()).map(([id, data]) => ({
                    id,
                    title: data.title,
                    count: data.count,
                    contexts: data.contexts || []
                }))
            };
        } catch (error) {
            CompatibilityLayer.safeHandleError('getWordDetails', error);
            return null;
        }
    }
    
    // 🎯 章节难度计算API
    getArticleDifficulty(articleId) {
        try {
            return this.analyzer.calculateSmartArticleDifficulty(articleId);
        } catch (error) {
            CompatibilityLayer.safeHandleError('getArticleDifficulty', error);
            return { stars: 3, label: "⭐⭐⭐ 中等", tooltip: "计算失败" };
        }
    }
    
    searchWords(query) {
        try {
            return this.analyzer.searchWords(query);
        } catch (error) {
            CompatibilityLayer.safeHandleError('searchWords', error);
            return [];
        }
    }
    
    searchWordsExact(query) {
        try {
            return this.analyzer.searchWordsExact(query);
        } catch (error) {
            CompatibilityLayer.safeHandleError('searchWordsExact', error);
            return [];
        }
    }
    
    getStatsSummary() {
        try {
            return this.analyzer.getStatsSummary();
        } catch (error) {
            CompatibilityLayer.safeHandleError('getStatsSummary', error);
            return {
                totalUniqueWords: 0,
                totalVariants: 0,
                totalWordOccurrences: 0,
                totalArticlesAnalyzed: 0,
                averageWordsPerArticle: 0
            };
        }
    }
    
    destroy() {
        try {
            console.log('🧹 开始销毁词频管理器...');
            
            this.analyzer.wordStats.clear();
            this.analyzer.articleContents.clear();
            this.analyzer.variantIndex.clear();
            this.analyzer.articleVariants.clear();
            this.analyzer.stemmer.clearCache();
            this.processedArticles.clear();
            
            this.isInitialized = false;
            this.isInitializing = false;
            this.initializationError = null;
            this.navigationState = null; // 🔧 清理导航状态
            
            console.log('✅ 词频管理器销毁完成');
        } catch (error) {
            console.error('销毁过程中出错:', error);
        }
    }
}

// 🎯 简化的搜索管理器
class SimplifiedSearchManager {
    constructor(analyzer, container) {
        this.analyzer = analyzer;
        this.container = container;
        
        this.state = {
            isSearching: false,
            query: '',
            mode: 'intelligent',
            results: [],
            hasResults: false,
            error: null
        };
        
        this.debounceTimer = null;
        this.debounceDelay = 300;
        this.cache = new Map();
        this.maxCacheSize = 50;
        
        console.log('✅ 简化搜索管理器已初始化');
    }
    
    handleSearch(query) {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        const cleanQuery = this.cleanInput(query);
        
        if (!cleanQuery) {
            this.clearSearch();
            return;
        }
        
        this.debounceTimer = setTimeout(() => {
            this.executeSearch(cleanQuery);
        }, this.debounceDelay);
    }
    
    cleanInput(input) {
        if (!input || typeof input !== 'string') return '';
        
        const cleaned = input
            .toLowerCase()
            .trim()
            .replace(/[^a-zA-Z]/g, '')
            .trim();
        
        if (cleaned.length < 2 || cleaned.length > 50) return '';
        return cleaned;
    }
    
    async executeSearch(query) {
        try {
            this.state.isSearching = true;
            this.state.query = query;
            this.state.error = null;
            
            console.log(`🔍 执行${this.state.mode}搜索: "${query}"`);
            
            const cacheKey = `${query}_${this.state.mode}`;
            if (this.cache.has(cacheKey)) {
                console.log('📦 使用缓存结果');
                const cachedResults = this.cache.get(cacheKey);
                this.handleSearchResults(cachedResults, query);
                return;
            }
            
            let results;
            if (this.state.mode === 'intelligent') {
                results = await this.executeIntelligentSearch(query);
            } else {
                results = await this.executeExactSearch(query);
            }
            
            this.setCacheResult(cacheKey, results);
            this.handleSearchResults(results, query);
            
        } catch (error) {
            console.error('搜索执行失败:', error);
            this.handleSearchError(error);
        } finally {
            this.state.isSearching = false;
        }
    }
    
    async executeIntelligentSearch(query) {
        if (!this.analyzer || typeof this.analyzer.searchWords !== 'function') {
            throw new Error('智能搜索功能不可用');
        }
        
        const results = this.analyzer.searchWords(query);
        console.log(`📊 智能搜索找到 ${results.length} 个结果`);
        
        return results.map(item => ({
            ...item,
            searchMode: 'intelligent',
            isIntelligentMatch: true,
            isExactMatch: false
        }));
    }
    
    async executeExactSearch(query) {
        if (!this.analyzer || typeof this.analyzer.searchWordsExact !== 'function') {
            throw new Error('精确搜索功能不可用');
        }
        
        const results = this.analyzer.searchWordsExact(query);
        console.log(`🎯 精确搜索找到 ${results.length} 个结果`);
        
        return results.map(item => ({
            ...item,
            searchMode: 'exact',
            isIntelligentMatch: false,
            isExactMatch: true
        }));
    }
    
    handleSearchResults(results, query) {
        this.state.results = results || [];
        this.state.hasResults = this.state.results.length > 0;
        
        console.log(`✅ 搜索完成: ${this.state.results.length} 个结果`);
        
        this.container.dispatchEvent(new CustomEvent('searchComplete', {
            detail: {
                query: query,
                mode: this.state.mode,
                results: this.state.results,
                hasResults: this.state.hasResults
            }
        }));
    }
    
    handleSearchError(error) {
        this.state.error = error.message;
        console.error('🚨 搜索错误:', error);
        
        this.container.dispatchEvent(new CustomEvent('searchError', {
            detail: {
                error: error.message
            }
        }));
    }
    
    switchMode(newMode) {
        if (newMode !== 'intelligent' && newMode !== 'exact') {
            console.warn('无效的搜索模式:', newMode);
            return;
        }
        
        const oldMode = this.state.mode;
        this.state.mode = newMode;
        
        console.log(`🔄 搜索模式切换: ${oldMode} -> ${newMode}`);
        
        if (this.state.query) {
            this.executeSearch(this.state.query);
        }
        
        this.container.dispatchEvent(new CustomEvent('searchModeChanged', {
            detail: {
                oldMode,
                newMode
            }
        }));
    }
    
    clearSearch() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        
        this.state = {
            isSearching: false,
            query: '',
            mode: this.state.mode,
            results: [],
            hasResults: false,
            error: null
        };
        
        console.log('🧹 搜索已清除');
        this.container.dispatchEvent(new CustomEvent('searchCleared'));
    }
    
    setCacheResult(key, result) {
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, result);
    }
    
    getState() {
        return {
            ...this.state
        };
    }
    
    destroy() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.cache.clear();
        console.log('🧹 搜索管理器已销毁');
    }
}

// 🎯 词频UI - 保持原有功能，增加集成能力
class WordFrequencyUI {
    constructor(container, manager) {
        this.container = container;
        this.manager = manager;
        this.currentView = 'cloud';
        this.currentFilter = 'all';
        this.selectedWord = null;
        this.isInitialized = false;

        // 🔧 环境检测
        this.isStandalonePage = window.location.pathname.includes('word-frequency');
        this.isIntegratedMode = !this.isStandalonePage && window.app;

        // 创建搜索管理器
        this.searchManager = new SimplifiedSearchManager(manager, container);

        // DOM缓存
        this.domCache = new Map();

        // 虚拟滚动设置
        this.virtualScroll = {
            containerHeight: 600,
            itemHeight: 50,
            isEnabled: true
        };

        // 移动端检测
        this.isMobile = this.detectMobile();

        // 数据缓存
        this.dataCache = new Map();
        this.currentWordsData = null;

        // 渲染和初始化
        this.render();
        this.setupEventListeners();
        this.initializeVirtualScroll();

        console.log(`✅ WordFrequencyUI已初始化 (${this.isStandalonePage ? '独立' : '集成'}模式)`);
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            window.innerWidth <= 768;
    }

    getElement(selector) {
        if (!this.domCache.has(selector)) {
            const element = this.container.querySelector(selector);
            if (element) {
                this.domCache.set(selector, element);
            }
        }
        return this.domCache.get(selector);
    }

    render() {
        // 🔧 根据模式调整UI
        const headerTitle = this.isIntegratedMode ? '词频分析工具' : '📊 词频统计分析';
        const containerClass = this.isIntegratedMode ? 'word-freq-tool' : 'word-freq-page';

        this.container.innerHTML = `
            <div class="${containerClass}">
                <header class="word-freq-header">
                    <div class="header-title">
                        <h1>${headerTitle}</h1>
                        <div class="stats-summary" id="stats-summary">
                            <span class="stat-item">分析中...</span>
                        </div>
                    </div>
                    
                    <div class="word-freq-controls">
                        <div class="search-section">
                            <div class="search-box">
                                <input type="text" id="word-search" placeholder="搜索单词..." autocomplete="off" />
                                <button id="search-btn" title="搜索">🔍</button>
                                <button id="clear-search" title="清除搜索">✕</button>
                            </div>
                            
                            <div class="search-mode-tabs" id="search-mode-tabs">
                                <button class="search-mode-tab active" data-mode="intelligent" title="智能搜索：基于词干合并">
                                    🧠 智能搜索
                                </button>
                                <button class="search-mode-tab" data-mode="exact" title="精确搜索：基于原文匹配">
                                    🎯 精确搜索
                                </button>
                            </div>
                            
                            <div class="search-status" id="search-status" style="display: none;">
                                <small class="status-text"></small>
                            </div>
                        </div>
                        
                        <div class="view-section">
                            <div class="view-toggles">
                                <button class="view-btn active" data-view="cloud" title="词云视图">☁️ 词云</button>
                                <button class="view-btn" data-view="list" title="列表视图">📋 列表</button>
                            </div>
                        </div>
                        
                        <div class="filter-section">
                            <select id="freq-filter" title="频次筛选">
                                <option value="all">所有频次</option>
                                <option value="high">高频词 (10+)</option>
                                <option value="medium">中频词 (5-9)</option>
                                <option value="low">低频词 (2-4)</option>
                                <option value="rare">稀有词 (1次)</option>
                            </select>
                        </div>
                    </div>
                </header>
                
                <main class="word-freq-content">
                    <div class="loading-section" id="freq-loading">
                        <div class="loading-indicator">
                            <div class="spinner"></div>
                            <div class="loading-text">正在分析全站词频...</div>
                            <div class="progress-container">
                                <div class="progress-bar">
                                    <div class="progress-fill" id="progress-fill"></div>
                                </div>
                                <div class="progress-text" id="progress-text">0%</div>
                            </div>
                            <div class="loading-tips">
                                <small>💡 首次分析需要一些时间，后续访问将使用缓存数据</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="word-freq-display" id="freq-display" style="display: none;">
                        <div class="virtual-scroll-container" id="virtual-container">
                            <div class="virtual-scroll-content" id="virtual-content"></div>
                        </div>
                    </div>
                    
                    <div class="word-details-panel" id="word-details" style="display: none;">
                        <!-- 单词详情面板 -->
                    </div>
                </main>
            </div>
        `;

        this.loadStyles();
        this.cacheKeyElements();
    }

    cacheKeyElements() {
        const selectors = [
            '#word-search', '#search-btn', '#clear-search', '#freq-filter',
            '#freq-loading', '#freq-display', '#word-details', '#stats-summary',
            '#progress-fill', '#progress-text', '.view-btn',
            '#virtual-container', '#virtual-content',
            '#search-mode-tabs', '.search-mode-tab', '#search-status'
        ];

        selectors.forEach(selector => this.getElement(selector));
    }

    setupEventListeners() {
        // 搜索输入事件
        const searchInput = this.getElement('#word-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSearchButton();
                }
            });
        }

        // 搜索按钮
        const searchBtn = this.getElement('#search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.handleSearchButton();
            });
        }

        // 清除搜索按钮
        const clearBtn = this.getElement('#clear-search');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }

        // 搜索模式切换
        const modeTabs = this.container.querySelectorAll('.search-mode-tab');
        modeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.handleModeSwitch(tab.dataset.mode);
            });
        });

        // 视图切换
        const viewBtns = this.container.querySelectorAll('.view-btn');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleViewToggle(btn.dataset.view);
            });
        });

        // 频次筛选
        const filterSelect = this.getElement('#freq-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.handleFilterChange(e.target.value);
            });
        }

        // 搜索管理器事件
        this.container.addEventListener('searchComplete', (e) => {
            this.handleSearchComplete(e.detail);
        });

        this.container.addEventListener('searchError', (e) => {
            this.handleSearchError(e.detail);
        });

        this.container.addEventListener('searchCleared', () => {
            this.handleSearchCleared();
        });

        this.container.addEventListener('searchModeChanged', (e) => {
            this.handleSearchModeChanged(e.detail);
        });

        // 单词和文章点击事件
        this.container.addEventListener('click', (e) => {
            this.handleDelegatedClick(e);
        });

        // 虚拟滚动
        const virtualContainer = this.getElement('#virtual-container');
        if (virtualContainer) {
            virtualContainer.addEventListener('scroll', this.throttle(this.handleVirtualScroll.bind(this), 50));
        }

        // 进度事件
        document.addEventListener('wordFreqProgress', (e) => {
            this.updateProgress(e.detail.progress);
        });

        console.log('✅ 事件监听器已设置');
    }

    // 🎯 搜索输入处理
    handleSearchInput(value) {
        const hasValue = value && value.trim().length > 0;
        this.updateSearchUI(hasValue);
        this.searchManager.handleSearch(value);
    }

    updateSearchUI(hasValue) {
        const clearBtn = this.getElement('#clear-search');
        const modeTabs = this.getElement('#search-mode-tabs');

        if (clearBtn) {
            clearBtn.style.display = hasValue ? 'inline-block' : 'none';
        }

        if (modeTabs) {
            modeTabs.style.display = hasValue ? 'flex' : 'flex';
        }
    }

    handleSearchButton() {
        const searchInput = this.getElement('#word-search');
        if (searchInput) {
            const query = searchInput.value.trim();
            if (query) {
                this.searchManager.executeSearch(query);
            }
        }
    }

    handleModeSwitch(newMode) {
        this.container.querySelectorAll('.search-mode-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === newMode);
        });

        this.searchManager.switchMode(newMode);
    }

    clearSearch() {
        const searchInput = this.getElement('#word-search');
        if (searchInput) {
            searchInput.value = '';
        }

        this.searchManager.clearSearch();
        this.updateSearchUI(false);
    }

    handleSearchComplete(detail) {
        const { query, mode, results, hasResults } = detail;
        
        console.log(`🎯 搜索完成: "${query}" (${mode}模式) - ${results.length}个结果`);
        
        const display = this.getElement('#freq-display');
        const container = this.getElement('#virtual-container');
        
        if (display && container) {
            display.innerHTML = '';
            container.innerHTML = '';
            
            display.innerHTML = `
                <div class="word-freq-display" style="padding: 20px;">
                    <div class="virtual-scroll-container" id="virtual-container">
                        <div class="virtual-scroll-content" id="virtual-content"></div>
                    </div>
                </div>
            `;
        }
        
        this.domCache.clear();
        
        if (hasResults) {
            this.displaySearchResults(results, query, mode);
            this.showSearchStatus(`找到 ${results.length} 个结果`, 'success');
        } else {
            this.showNoResults(`未找到与 "${query}" 相关的结果`);
            this.showSearchStatus('未找到结果', 'warning');
        }
    }

    handleSearchError(detail) {
        console.error('🚨 搜索错误:', detail.error);
        this.showNoResults(`搜索出现错误: ${detail.error}`);
        this.showSearchStatus('搜索失败', 'error');
    }

    handleSearchCleared() {
        console.log('🧹 搜索已清除，恢复正常显示');
        this.hideSearchStatus();
        this.displayCurrentView();
    }

    handleSearchModeChanged(detail) {
        const { newMode } = detail;
        console.log(`🔄 搜索模式已切换到: ${newMode}`);

        const modeText = newMode === 'intelligent' ? '智能搜索模式' : '精确搜索模式';
        this.showSearchStatus(modeText, 'info');
    }

    showSearchStatus(message, type = 'info') {
        const statusEl = this.getElement('#search-status');
        const textEl = statusEl?.querySelector('.status-text');

        if (statusEl && textEl) {
            textEl.textContent = message;
            statusEl.className = `search-status ${type}`;
            statusEl.style.display = 'block';

            if (type !== 'error') {
                setTimeout(() => {
                    this.hideSearchStatus();
                }, 3000);
            }
        }
    }

    hideSearchStatus() {
        const statusEl = this.getElement('#search-status');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
    }

    displaySearchResults(results, query, mode) {
        try {
            const container = this.getElement('#virtual-container');
            const content = this.getElement('#virtual-content');
            const display = this.getElement('#freq-display');

            if (!container || !content || !display) {
                throw new Error('搜索结果容器未找到');
            }

            content.innerHTML = '';
            content.style.height = 'auto';
            content.style.position = 'static';

            const searchContainer = this.createSearchResultsContainer(query, mode, results.length);
            content.appendChild(searchContainer);

            const resultsArea = searchContainer.querySelector('.search-results-area');
            if (this.currentView === 'cloud') {
                this.renderSearchResultsAsCloud(resultsArea, results);
            } else {
                this.renderSearchResultsAsList(resultsArea, results);
            }

            container.style.display = 'block';
            display.style.display = 'block';
            container.scrollTop = 0;

            console.log(`✅ 搜索结果已显示: ${results.length}个结果`);

        } catch (error) {
            console.error('显示搜索结果失败:', error);
            this.showNoResults('显示搜索结果时出错');
        }
    }

    createSearchResultsContainer(query, mode, resultCount) {
        const container = document.createElement('div');
        container.className = 'search-results-wrapper';
        container.style.cssText = `
            width: 100%;
            background: white;
            overflow: visible;
            padding: 20px;
        `;

        const header = this.createSearchHeader(query, mode, resultCount);
        container.appendChild(header);

        const resultsArea = document.createElement('div');
        resultsArea.className = 'search-results-area';
        resultsArea.style.cssText = `
            margin-top: 20px;
            background: white;
        `;
        container.appendChild(resultsArea);

        return container;
    }

    createSearchHeader(query, mode, resultCount) {
        const header = document.createElement('div');
        header.className = 'search-results-header';
        header.style.cssText = `
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        `;

        const modeText = mode === 'intelligent' ? '智能搜索' : '精确搜索';
        const modeDescription = mode === 'intelligent' ?
            '找到了所有相关变形词的合并结果' :
            `只显示包含确切词汇 "${query}" 的文章`;

        header.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 20px; font-weight: 600;">
                    ${mode === 'intelligent' ? '🧠' : '🎯'} ${modeText}结果
                </h3>
                <div style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 15px; font-size: 14px; font-weight: 500;">
                    ${resultCount} 个结果
                </div>
            </div>
            <div style="background: rgba(255,255,255,0.1); padding: 12px 16px; border-radius: 6px; font-size: 14px; line-height: 1.4;">
                <div style="margin-bottom: 8px;">
                    <strong>搜索词：</strong> "${query}"
                </div>
                <div style="opacity: 0.9;">
                    ${modeDescription}
                </div>
            </div>
            <div style="margin-top: 12px; font-size: 12px; opacity: 0.8; text-align: center;">
                💡 可以通过上方的模式选项卡切换搜索方式
            </div>
        `;

        return header;
    }

    renderSearchResultsAsCloud(container, results) {
        const maxCount = results[0]?.totalCount || 1;
        const minCount = results[results.length - 1]?.totalCount || 1;

        const cloudContainer = document.createElement('div');
        cloudContainer.className = 'search-word-cloud';
        cloudContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            gap: 15px;
            padding: 30px 20px;
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-radius: 12px;
            min-height: 150px;
            border: 2px solid #dee2e6;
        `;

        results.forEach(item => {
            const wordElement = this.createWordCloudItem(item, minCount, maxCount);
            cloudContainer.appendChild(wordElement);
        });

        container.appendChild(cloudContainer);
    }

    createWordCloudItem(item, minCount, maxCount) {
        const wordElement = document.createElement('span');
        wordElement.className = 'word-item';
        wordElement.dataset.word = item.word;

        const fontSize = this.calculateFontSize(item.totalCount, minCount, maxCount);
        const color = this.getWordColor(item.totalCount, maxCount);

        wordElement.style.cssText = `
            font-size: ${fontSize}px; 
            color: ${color};
            margin: 5px 8px;
            padding: 8px 12px;
            cursor: pointer;
            border-radius: 20px;
            background: ${item.isExactMatch ? 'rgba(40, 167, 69, 0.15)' : 'rgba(0, 123, 255, 0.1)'};
            border: 2px solid ${item.isExactMatch ? 'rgba(40, 167, 69, 0.4)' : 'rgba(0, 123, 255, 0.3)'};
            transition: all 0.3s ease;
            font-weight: 600;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;

        wordElement.textContent = item.word;
        wordElement.title = `${item.word}: ${item.totalCount} 次，出现在 ${item.articleCount} 篇文章中`;

        wordElement.addEventListener('mouseenter', () => {
            wordElement.style.transform = 'translateY(-2px)';
            wordElement.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        });

        wordElement.addEventListener('mouseleave', () => {
            wordElement.style.transform = 'translateY(0)';
            wordElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });

        return wordElement;
    }

    renderSearchResultsAsList(container, results) {
        const listContainer = document.createElement('div');
        listContainer.className = 'search-word-list';
        listContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 16px;
        `;

        results.forEach(item => {
            const listItem = this.createWordListItem(item);
            listContainer.appendChild(listItem);
        });

        container.appendChild(listContainer);
    }

    createWordListItem(item) {
        const listItem = document.createElement('div');
        listItem.className = 'word-list-item';
        listItem.dataset.word = item.word;

        listItem.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border: 2px solid ${item.isExactMatch ? '#28a745' : '#e9ecef'};
            border-radius: 12px;
            cursor: pointer;
            background: ${item.isExactMatch ? 'rgba(40, 167, 69, 0.05)' : 'white'};
            transition: all 0.3s ease;
            box-sizing: border-box;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        `;

        const matchTypeText = item.isExactMatch ? '精确匹配' : '智能匹配';
        const matchColor = item.isExactMatch ? '#28a745' : '#007bff';

        listItem.innerHTML = `
            <div class="word-info" style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <strong style="font-size: 18px; color: #2c3e50;">${item.word}</strong>
                    <span style="background: ${matchColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase;">${matchTypeText}</span>
                </div>
                <div style="color: #6c757d; font-size: 14px; display: flex; gap: 20px;">
                    <span>📄 ${item.articleCount} 篇文章</span>
                    <span>🔢 总计 ${item.totalCount} 次</span>
                </div>
            </div>
            <div class="word-count" style="background: linear-gradient(135deg, ${matchColor}, ${matchColor}dd); color: white; padding: 12px 20px; border-radius: 20px; font-weight: 700; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                ${item.totalCount}
            </div>
        `;

        listItem.addEventListener('mouseenter', () => {
            listItem.style.transform = 'translateY(-2px)';
            listItem.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        });

        listItem.addEventListener('mouseleave', () => {
            listItem.style.transform = 'translateY(0)';
            listItem.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
        });

        return listItem;
    }

    // 工具方法
    calculateFontSize(count, minCount, maxCount) {
        const minSize = this.isMobile ? 12 : 14;
        const maxSize = this.isMobile ? 28 : 36;

        if (maxCount === minCount) return minSize;

        const ratio = (count - minCount) / (maxCount - minCount);
        return Math.round(minSize + ratio * (maxSize - minSize));
    }

    getWordColor(count, maxCount) {
        const intensity = count / maxCount;
        if (intensity > 0.8) return '#d32f2f';
        if (intensity > 0.6) return '#f57c00';
        if (intensity > 0.4) return '#388e3c';
        if (intensity > 0.2) return '#1976d2';
        return '#757575';
    }

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    handleDelegatedClick(e) {
        const target = e.target;

        try {
            if (target.closest('.close-details-btn')) {
                e.preventDefault();
                this.hideWordDetails();
                return;
            }

            if (target.closest('.article-item')) {
                e.preventDefault();
                this.handleArticleClick(target.closest('.article-item'));
                return;
            }

            if (target.closest('.word-item, .word-list-item')) {
                e.preventDefault();
                this.handleWordClick(target.closest('.word-item, .word-list-item'));
                return;
            }

        } catch (error) {
            console.error('点击处理失败:', error);
        }
    }

    handleWordClick(wordElement) {
        const word = wordElement.dataset.word;

        if (!word || word.trim() === '') {
            console.error('无效的单词数据:', word);
            return;
        }

        const details = this.manager.getWordDetails(word.trim());
        if (!details) {
            console.warn('未找到单词详情:', word);
            return;
        }

        this.selectedWord = word.trim();
        this.showWordDetails(details);
    }

    showWordDetails(details) {
        const { word, totalCount, articleCount, articles } = details;

        const panel = this.getElement('#word-details');
        if (!panel) return;

        const detailsHTML = this.createWordDetailsHTML(word, totalCount, articleCount, articles);
        panel.innerHTML = detailsHTML;
        panel.style.display = 'block';

        setTimeout(() => {
            panel.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }, 100);
    }

    createWordDetailsHTML(word, totalCount, articleCount, articles) {
        const statsItems = [
            ['总出现次数', totalCount, '#007bff'],
            ['出现文章数', articleCount, '#28a745'],
            ['平均每篇', (totalCount / articleCount).toFixed(1), '#fd7e14']
        ];

        const statsHTML = statsItems.map(([label, value, color]) => `
            <div class="stat" style="background: linear-gradient(135deg, ${color}15, ${color}05); border: 2px solid ${color}30; padding: 16px; border-radius: 12px; text-align: center; transition: transform 0.2s ease;">
                <div style="color: ${color}; font-weight: 700; font-size: 24px; margin-bottom: 4px;">${value}</div>
                <div style="color: #6c757d; font-size: 14px; font-weight: 500;">${label}</div>
            </div>
        `).join('');

        const articlesHTML = articles.map(article => this.createArticleItemHTML(article, word)).join('');

        return `
            <div class="word-details" style="background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); padding: 24px; margin: 20px 0;">
                <h3 style="margin: 0 0 20px 0; color: #2c3e50; border-bottom: 2px solid #007bff; padding-bottom: 10px; font-size: 24px;">
                    📝 "${word}" 详细分析
                </h3>
                
                <div class="word-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 25px;">
                    ${statsHTML}
                </div>
                
                <h4 style="color: #2c3e50; margin: 30px 0 15px 0; font-size: 18px;">
                    📚 相关文章 (按出现频次排序)
                </h4>
                
                <div class="article-list" style="display: grid; gap: 16px; margin-top: 20px; max-height: 500px; overflow-y: auto; padding-right: 8px;">
                    ${articlesHTML}
                </div>
                
                <button class="close-details-btn" style="background: linear-gradient(135deg, #6c757d, #5a6268); color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; margin-top: 24px; font-size: 14px; font-weight: 600; transition: all 0.3s ease; display: block; margin-left: auto; margin-right: auto;">
                    ✕ 关闭详情
                </button>
            </div>
        `;
    }

    createArticleItemHTML(article, word) {
        const contextsHTML = article.contexts && article.contexts.length > 0 ?
            article.contexts.map(ctx => `
                <div class="context" style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); padding: 12px 16px; border-radius: 8px; margin: 8px 0; font-size: 13px; line-height: 1.5; border-left: 3px solid #28a745; font-family: 'Segoe UI', system-ui, sans-serif;">
                    ${ctx}
                </div>
            `).join('') : '';

        return `
            <div class="article-item" data-article-id="${article.id}" data-word="${word}" style="position: relative; padding: 20px 24px; background: white; border-radius: 12px; border-left: 4px solid #007bff; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); border: 1px solid #e9ecef;">
                <div class="article-title" style="font-weight: 600; color: #2c3e50; margin-bottom: 12px; font-size: 16px; line-height: 1.4;">
                    ${article.title}
                </div>
                <div class="article-stats" style="margin-bottom: 12px;">
                    <span style="color: #6c757d; font-size: 14px;">在此文章中出现 </span>
                    <strong style="color: #007bff; font-size: 16px; font-weight: 700;">${article.count}</strong>
                    <span style="color: #6c757d; font-size: 14px;"> 次</span>
                    <span class="click-hint" style="font-size: 12px; color: #007bff; opacity: 0; transition: opacity 0.3s; margin-left: 15px; font-weight: 500;">👆 点击跳转并高亮</span>
                </div>
                ${contextsHTML ? `<div class="contexts" style="margin-top: 16px;">${contextsHTML}</div>` : ''}
            </div>
        `;
    }

    hideWordDetails() {
        const panel = this.getElement('#word-details');
        if (panel) {
            panel.style.display = 'none';
            panel.innerHTML = '';
        }
        this.selectedWord = null;
    }

    handleArticleClick(articleElement) {
        const articleId = articleElement.dataset.articleId;
        const word = articleElement.dataset.word || this.selectedWord;

        if (!word || !articleId) {
            console.error('跳转数据无效:', { word, articleId });
            return;
        }

        this.prepareHighlightData(word.trim());
        this.performJump(articleId.trim(), word.trim());
    }

    prepareHighlightData(word) {
        sessionStorage.removeItem('highlightWord');
        sessionStorage.removeItem('highlightSource');
        sessionStorage.removeItem('highlightVariants');

        setTimeout(() => {
            sessionStorage.setItem('highlightWord', word);
            sessionStorage.setItem('highlightSource', 'wordFreq');

            const wordDetails = this.manager.getWordDetails(word);
            if (wordDetails && wordDetails.variants) {
                const variants = wordDetails.variants.map(([variant]) => variant).filter(v => v && v.trim());
                if (variants.length > 0) {
                    sessionStorage.setItem('highlightVariants', JSON.stringify(variants));
                }
            }
        }, 50);
    }

    performJump(articleId, word) {
        this.showJumpNotification(articleId, word);

        setTimeout(() => {
            if (this.isIntegratedMode && window.app?.navigation?.navigateToChapter) {
                window.app.navigation.navigateToChapter(articleId);
            } else if (window.location.pathname.includes('word-frequency.html')) {
                window.location.href = `index.html#${articleId}`;
            } else {
                window.location.hash = articleId;
            }
        }, 100);
    }

    showJumpNotification(articleId, word) {
        document.querySelectorAll('[data-jump-notification]').forEach(el => el.remove());

        const notification = document.createElement('div');
        notification.setAttribute('data-jump-notification', 'true');
        notification.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: linear-gradient(135deg, #28a745, #20c997); color: white;
            padding: 12px 20px; border-radius: 25px; z-index: 10000;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
            font-size: 14px; font-weight: 500; max-width: 400px;
            backdrop-filter: blur(10px);
        `;

        notification.innerHTML = `🚀 正在跳转到文章 (高亮 "${word}")`;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 4000);
    }

    // 其他核心方法
    handleViewToggle(view) {
        this.container.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        this.currentView = view;
        this.clearDataCache();
        this.initializeVirtualScroll();

        const searchState = this.searchManager.getState();
        if (searchState.hasResults) {
            this.displaySearchResults(searchState.results, searchState.query, searchState.mode);
        } else {
            this.displayCurrentView();
        }
    }

    handleFilterChange(filter) {
        this.currentFilter = filter;
        this.clearDataCache();

        const searchState = this.searchManager.getState();
        if (searchState.hasResults) {
            return;
        }

        this.displayCurrentView();
    }

    async initialize() {
        this.showLoading();

        try {
            await this.manager.waitForReady();
            this.isInitialized = true;
            this.hideLoading();
            this.updateStatsSummary();
            this.displayCurrentView();
        } catch (error) {
            console.error('UI初始化失败:', error);
            this.showError('初始化失败: ' + error.message);
        }
    }

    displayCurrentView() {
        if (!this.isInitialized) return;

        const searchState = this.searchManager.getState();
        if (searchState.hasResults) {
            return;
        }

        switch (this.currentView) {
            case 'cloud':
                this.displayWordCloudVirtual();
                break;
            case 'list':
                this.displayWordListVirtual();
                break;
        }
    }

    displayWordCloudVirtual() {
        const words = this.getFilteredWords();

        if (words.length === 0) {
            this.showNoResults();
            return;
        }

        this.currentWordsData = words;
        this.setupVirtualScrollForNormalView(words);
        this.renderWordCloudView(words);
    }

    displayWordListVirtual() {
        const words = this.getFilteredWords();

        if (words.length === 0) {
            this.showNoResults();
            return;
        }

        this.currentWordsData = words;
        this.setupVirtualScrollForNormalView(words);
        this.renderWordListView(words);
    }

    setupVirtualScrollForNormalView(words) {
        const container = this.getElement('#virtual-container');
        const content = this.getElement('#virtual-content');
        const display = this.getElement('#freq-display');

        if (container && content && display) {
            this.virtualScroll.totalItems = words.length;
            this.virtualScroll.itemHeight = this.currentView === 'list' ? 80 : 35;
            this.virtualScroll.isEnabled = true;

            container.style.display = 'block';
            display.style.display = 'block';
            container.scrollTop = 0;
        }
    }

    renderWordCloudView(words) {
        const content = this.getElement('#virtual-content');
        if (!content) return;

        const maxCount = words[0]?.totalCount || 1;
        const minCount = words[words.length - 1]?.totalCount || 1;

        content.innerHTML = '';
        content.style.height = 'auto';
        content.style.position = 'static';

        const cloudContainer = document.createElement('div');
        cloudContainer.className = 'word-cloud-container';
        cloudContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            gap: 15px;
            padding: 30px 20px;
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-radius: 12px;
            min-height: 200px;
        `;

        words.slice(0, 200).forEach(item => {
            const wordElement = this.createWordCloudItem(item, minCount, maxCount);
            cloudContainer.appendChild(wordElement);
        });

        content.appendChild(cloudContainer);
    }

    renderWordListView(words) {
        const content = this.getElement('#virtual-content');
        if (!content) return;

        content.innerHTML = '';
        content.style.height = 'auto';
        content.style.position = 'static';

        const listContainer = document.createElement('div');
        listContainer.className = 'word-list-container';
        listContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding: 20px;
        `;

        words.slice(0, 100).forEach(item => {
            const listItem = this.createWordListItem(item);
            listContainer.appendChild(listItem);
        });

        content.appendChild(listContainer);
    }

    getFilteredWords(limit = 1000) {
        const cacheKey = `${this.currentFilter}_${limit}`;

        if (this.dataCache.has(cacheKey)) {
            return this.dataCache.get(cacheKey);
        }

        let words = this.manager.getTopWords(limit);

        const filterMap = {
            'high': item => item.totalCount >= 10,
            'medium': item => item.totalCount >= 5 && item.totalCount <= 9,
            'low': item => item.totalCount >= 2 && item.totalCount <= 4,
            'rare': item => item.totalCount === 1
        };

        if (this.currentFilter !== 'all' && filterMap[this.currentFilter]) {
            words = words.filter(filterMap[this.currentFilter]);
        }

        this.dataCache.set(cacheKey, words);

        if (this.dataCache.size > 10) {
            const firstKey = this.dataCache.keys().next().value;
            this.dataCache.delete(firstKey);
        }

        return words;
    }

    clearDataCache() {
        this.dataCache.clear();
        this.currentWordsData = null;
    }

    showNoResults(message = '暂无数据') {
        const display = this.getElement('#freq-display');
        const container = this.getElement('#virtual-container');

        if (display && container) {
            container.innerHTML = '';
            container.style.display = 'none';

            display.innerHTML = `
            <div class="no-results" style="text-align: center; padding: 60px 20px; color: #6c757d; background: linear-gradient(135deg, #f8f9fa, #ffffff); border-radius: 12px; margin: 20px 0; border: 2px dashed #dee2e6;">
                <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.6;">📭</div>
                <h3 style="color: #495057; margin-bottom: 12px; font-size: 20px;">${message}</h3>
                <p style="margin-bottom: 20px; font-size: 14px; line-height: 1.6;">尝试调整筛选条件或搜索其他关键词</p>
                <button onclick="document.querySelector('#clear-search').click()" 
                        style="margin-top: 15px; padding: 12px 24px; background: linear-gradient(135deg, #007bff, #0056b3); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);">
                    🔄 清除搜索，重新开始
                </button>
            </div>
        `;
        // 从 display.style 处继续补全

.display = 'block';
        }
    }

    // 其他必要方法（保持简化）
    initializeVirtualScroll() {
        const container = this.getElement('#virtual-container');
        if (!container) return;

        this.virtualScroll.containerHeight = this.isMobile ?
            Math.min(window.innerHeight * 0.6, 500) :
            Math.min(window.innerHeight * 0.7, 600);

        container.style.height = `${this.virtualScroll.containerHeight}px`;
        container.style.overflowY = 'auto';
        container.style.position = 'relative';
    }

    handleVirtualScroll(e) {
        // 简化的虚拟滚动处理
        // 在搜索状态下不使用虚拟滚动
        if (this.searchManager.getState().hasResults) {
            return;
        }

        // 正常浏览状态的虚拟滚动逻辑
        // 这里可以根据需要实现具体的虚拟滚动逻辑
    }

    updateStatsSummary() {
        const summary = this.manager.getStatsSummary();
        const summaryEl = this.getElement('#stats-summary');

        if (summaryEl && summary) {
            const statsHTML = [
                `📚 ${summary.totalArticlesAnalyzed} 篇文章`,
                `📝 ${summary.totalUniqueWords.toLocaleString()} 个不同单词`,
                `🔢 ${summary.totalWordOccurrences.toLocaleString()} 总词次`,
                `📊 平均 ${summary.averageWordsPerArticle} 词/篇`
            ];

            summaryEl.innerHTML = statsHTML.map(stat =>
                `<span class="stat-item">${stat}</span>`
            ).join('');
        }
    }

    showLoading() {
        const loading = this.getElement('#freq-loading');
        const display = this.getElement('#freq-display');

        if (loading) loading.style.display = 'flex';
        if (display) display.style.display = 'none';
    }

    hideLoading() {
        const loading = this.getElement('#freq-loading');
        const display = this.getElement('#freq-display');

        if (loading) loading.style.display = 'none';
        if (display) display.style.display = 'block';
    }

    updateProgress(progress) {
        const progressFill = this.getElement('#progress-fill');
        const progressText = this.getElement('#progress-text');

        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${progress}%`;
    }

    showError(message) {
        const display = this.getElement('#freq-display');
        const container = this.getElement('#virtual-container');

        if (display && container) {
            container.style.display = 'none';
            display.innerHTML = `
                <div class="no-results" style="text-align: center; padding: 60px 20px; color: #6c757d; background: linear-gradient(135deg, #fff5f5, #ffffff); border-radius: 12px; margin: 20px 0; border: 2px solid #f56565;">
                    <div style="font-size: 48px; margin-bottom: 16px; color: #e53e3e;">❌</div>
                    <h2 style="color: #e53e3e; margin-bottom: 16px;">发生错误</h2>
                    <p style="margin-bottom: 24px; font-size: 14px; line-height: 1.6;">${message}</p>
                    <button onclick="location.reload()" style="margin-top: 15px; padding: 12px 24px; background: linear-gradient(135deg, #e53e3e, #c53030); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(229, 62, 62, 0.3);">
                        🔄 重新加载页面
                    </button>
                </div>
            `;
            display.style.display = 'block';
        }
        this.hideLoading();
    }

    refreshData() {
        if (this.isInitialized) {
            this.clearDataCache();
            this.updateStatsSummary();

            const searchState = this.searchManager.getState();
            if (searchState.hasResults) {
                this.searchManager.executeSearch(searchState.query);
            } else {
                this.displayCurrentView();
            }
        }
    }

    destroy() {
        console.log('🧹 开始销毁 WordFrequencyUI...');

        try {
            // 销毁搜索管理器
            if (this.searchManager) {
                this.searchManager.destroy();
            }

            // 清理缓存
            this.domCache.clear();
            this.dataCache.clear();

            // 移除样式
            const styleEl = document.getElementById('word-freq-styles');
            if (styleEl) styleEl.remove();

            // 清空引用
            this.container = null;
            this.manager = null;
            this.currentWordsData = null;
            this.searchManager = null;

            console.log('✅ WordFrequencyUI已完全销毁');

        } catch (error) {
            console.error('销毁过程中出错:', error);
        }
    }

    loadStyles() {
        if (document.getElementById('word-freq-styles')) return;

        const style = document.createElement('style');
        style.id = 'word-freq-styles';
        style.textContent = `
            .word-freq-page { padding: 20px; max-width: 1400px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; min-height: 100vh; }
            .word-freq-header { margin-bottom: 30px; border-bottom: 2px solid #e9ecef; padding-bottom: 20px; background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
            .header-title h1 { margin: 0 0 16px 0; color: #2c3e50; font-size: 2.2rem; font-weight: 700; }
            .stats-summary { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
            .stat-item { background: linear-gradient(135deg, #007bff15, #007bff05); padding: 12px 16px; border-radius: 20px; font-size: 0.9rem; color: #495057; border: 2px solid #007bff20; font-weight: 600; transition: all 0.3s ease; }
            .stat-item:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15); }
            .word-freq-controls { display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; margin-top: 20px; }
            .search-section { flex: 1; min-width: 300px; }
            .search-box { display: flex; gap: 8px; margin-bottom: 12px; }
            .search-box input { flex: 1; padding: 12px 20px; border: 2px solid #dee2e6; border-radius: 25px; font-size: 14px; outline: none; transition: all 0.3s ease; background: white; }
            .search-box input:focus { border-color: #007bff; box-shadow: 0 0 0 4px rgba(0, 123, 255, 0.1); transform: translateY(-1px); }
            .search-box button { padding: 12px 18px; border: none; border-radius: 20px; background: linear-gradient(135deg, #007bff, #0056b3); color: white; cursor: pointer; transition: all 0.3s ease; font-size: 14px; min-width: 48px; font-weight: 600; }
            .search-box button:hover { background: linear-gradient(135deg, #0056b3, #004085); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3); }
            #clear-search { background: linear-gradient(135deg, #6c757d, #5a6268) !important; }
            #clear-search:hover { background: linear-gradient(135deg, #5a6268, #495057) !important; }
            
            .search-mode-tabs { 
                display: flex; 
                gap: 6px; 
                background: #f8f9fa; 
                padding: 6px; 
                border-radius: 25px; 
                border: 2px solid #dee2e6; 
                margin-bottom: 12px;
                box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
            }
            .search-mode-tab { 
                padding: 10px 18px; 
                border: none; 
                background: transparent; 
                cursor: pointer; 
                border-radius: 20px; 
                transition: all 0.3s ease; 
                font-size: 13px; 
                white-space: nowrap; 
                min-width: 140px;
                color: #6c757d;
                font-weight: 600;
            }
            .search-mode-tab.active { 
                background: linear-gradient(135deg, #007bff, #0056b3); 
                color: white; 
                box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
                transform: translateY(-1px);
            }
            .search-mode-tab:not(.active):hover { 
                background: #e9ecef; 
                color: #495057;
                transform: translateY(-1px);
            }
            
            .search-status {
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                margin-top: 8px;
            }
            .search-status.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .search-status.warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
            .search-status.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            .search-status.info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
            
            .view-section .view-toggles { display: flex; gap: 8px; }
            .view-btn { padding: 12px 20px; border: 2px solid #dee2e6; border-radius: 25px; background: white; cursor: pointer; transition: all 0.3s ease; font-size: 14px; font-weight: 600; color: #6c757d; }
            .view-btn.active { background: linear-gradient(135deg, #28a745, #20c997); color: white; border-color: #28a745; box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3); transform: translateY(-1px); }
            .view-btn:not(.active):hover { background: #f8f9fa; border-color: #adb5bd; transform: translateY(-1px); }
            
            .filter-section select { padding: 12px 16px; border: 2px solid #dee2e6; border-radius: 25px; background: white; font-size: 14px; color: #495057; cursor: pointer; transition: all 0.3s ease; font-weight: 600; }
            .filter-section select:focus { outline: none; border-color: #007bff; box-shadow: 0 0 0 4px rgba(0, 123, 255, 0.1); }
            
            .word-freq-content { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); min-height: 600px; }
            
            .loading-section { display: flex; align-items: center; justify-content: center; height: 500px; background: linear-gradient(135deg, #f8f9fa, #ffffff); border-radius: 12px; }
            .loading-indicator { text-align: center; padding: 40px; }
            .spinner { width: 48px; height: 48px; border: 4px solid #f3f4f6; border-top: 4px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .loading-text { font-size: 18px; font-weight: 600; color: #2c3e50; margin-bottom: 20px; }
            .progress-container { margin: 20px 0; }
            .progress-bar { width: 300px; height: 8px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 0 auto; }
            .progress-fill { height: 100%; background: linear-gradient(90deg, #007bff, #28a745); transition: width 0.3s ease; border-radius: 10px; }
            .progress-text { margin-top: 12px; font-size: 14px; color: #6c757d; font-weight: 600; }
            .loading-tips { margin-top: 24px; color: #6c757d; font-size: 13px; line-height: 1.4; max-width: 300px; }
            
            .word-freq-display { padding: 20px; }
            .virtual-scroll-container { border-radius: 8px; overflow: hidden; background: #f8f9fa; }
            .virtual-scroll-content { position: relative; }
            
            .search-results-wrapper { background: white; border-radius: 8px; overflow: hidden; }
            .search-word-cloud .word-item:hover { transform: scale(1.05) translateY(-2px); }
            .search-word-list .word-list-item:hover { border-color: #007bff; }
            
            .word-item { display: inline-block; transition: all 0.2s ease; }
            .word-item:hover { transform: scale(1.05); background: rgba(0, 123, 255, 0.15) !important; }
            
            .word-list-item:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15); border-color: #007bff; }
            
            .word-details-panel { padding: 20px; background: #f8f9fa; border-radius: 12px; margin-top: 20px; }
            .article-item:hover .click-hint { opacity: 1 !important; }
            
            .no-results { animation: fadeIn 0.5s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            
            /* 移动端优化 */
            @media (max-width: 768px) {
                .word-freq-page { padding: 12px; }
                .word-freq-header { padding: 16px; }
                .header-title h1 { font-size: 1.8rem; }
                .word-freq-controls { flex-direction: column; gap: 16px; }
                .search-section { min-width: auto; }
                .stats-summary { gap: 12px; }
                .stat-item { padding: 10px 14px; font-size: 0.85rem; }
                .view-btn { padding: 10px 16px; font-size: 13px; }
                .search-mode-tab { min-width: 120px; padding: 8px 14px; font-size: 12px; }
                .word-details-panel { padding: 16px; }
                .virtual-scroll-container { margin: 0 -8px; }
            }
        `;

        document.head.appendChild(style);
    }
}

// 🔧 自动启动逻辑 - 检测环境并初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 词频系统自动启动检测...');
    
    // 🔧 检测是否为独立词频页面
    const isWordFreqPage = window.location.pathname.includes('word-frequency') || 
                          document.querySelector('#word-frequency-container') ||
                          document.querySelector('.word-freq-container');
    
    if (isWordFreqPage) {
        console.log('📄 检测到独立词频页面，启动独立模式');
        
        // 查找容器
        let container = document.querySelector('#word-frequency-container') || 
                       document.querySelector('.word-freq-container') || 
                       document.querySelector('#content') ||
                       document.querySelector('main');
        
        if (!container) {
            // 创建容器
            container = document.createElement('div');
            container.id = 'word-frequency-container';
            document.body.appendChild(container);
        }
        
        // 启动独立模式
        const manager = new SimplifiedWordFrequencyManager();
        const ui = new WordFrequencyUI(container, manager);
        
        // 等待管理器准备就绪后初始化UI
        manager.waitForReady().then(() => {
            ui.initialize();
        }).catch(error => {
            console.error('词频系统启动失败:', error);
            ui.showError('系统启动失败: ' + error.message);
        });
        
        // 全局暴露
        window.wordFreqManager = manager;
        window.wordFreqUI = ui;
        
        console.log('✅ 独立词频页面启动完成');
    } else {
        console.log('🔧 非独立页面，等待系统集成调用');
    }
});

// 🌐 全局API暴露 - 供主系统调用
window.EnglishSite = window.EnglishSite || {};
Object.assign(window.EnglishSite, {
    // 保持原有API完全兼容
    WordFrequencyManager: SimplifiedWordFrequencyManager,
    SimplifiedWordFrequencyAnalyzer: SimplifiedWordFrequencyAnalyzer,
    SimplifiedWordStemmer: SimplifiedWordStemmer,
    WordFrequencyUI: WordFrequencyUI,
    SimplifiedSearchManager: SimplifiedSearchManager
});

// 🔧 全局便捷函数 - 供主系统集成调用
window.navigateToWordFrequency = function(options = {}) {
    console.log('🎯 启动词频分析工具...');
    
    try {
        // 查找或创建容器
        let container = document.querySelector('#word-frequency-container') ||
                       document.querySelector('#content') ||
                       document.querySelector('main');
        
        if (!container) {
            console.error('❌ 未找到合适的容器');
            return false;
        }
        
        // 清空容器
        container.innerHTML = '';
        
        // 创建管理器和UI
        if (!window.wordFreqManager || !window.wordFreqManager.isInitialized) {
            window.wordFreqManager = new SimplifiedWordFrequencyManager();
        }
        
        const ui = new WordFrequencyUI(container, window.wordFreqManager);
        
        // 等待初始化完成
        window.wordFreqManager.waitForReady().then(() => {
            ui.initialize();
        }).catch(error => {
            console.error('词频工具启动失败:', error);
            ui.showError('工具启动失败: ' + error.message);
        });
        
        window.wordFreqUI = ui;
        
        console.log('✅ 词频分析工具启动成功');
        return true;
        
    } catch (error) {
        console.error('❌ 词频工具启动异常:', error);
        return false;
    }
};

// 🎯 章节难度API - 供主系统调用
window.getArticleDifficulty = function(articleId) {
    try {
        if (window.wordFreqManager?.isInitialized) {
            return window.wordFreqManager.getArticleDifficulty(articleId);
        } else {
            console.warn('词频管理器未就绪，返回默认难度');
            return { 
                stars: 3, 
                label: "⭐⭐⭐ 中等", 
                tooltip: "分析中..." 
            };
        }
    } catch (error) {
        console.error('获取文章难度失败:', error);
        return { 
            stars: 3, 
            label: "⭐⭐⭐ 中等", 
            tooltip: "计算失败" 
        };
    }
};

// 🎯 词频查询API - 供其他模块调用
window.searchWords = function(query, mode = 'intelligent') {
    try {
        if (!window.wordFreqManager?.isInitialized) {
            console.warn('词频管理器未就绪');
            return [];
        }
        
        if (mode === 'exact') {
            return window.wordFreqManager.searchWordsExact(query);
        } else {
            return window.wordFreqManager.searchWords(query);
        }
    } catch (error) {
        console.error('词频搜索失败:', error);
        return [];
    }
};

console.log('📊 词频系统已加载（时序冲突修复版v2.0）- 支持独立+集成双模式运行');