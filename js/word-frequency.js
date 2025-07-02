// js/word-frequency.js - 精简优化版 v2.1 (移除演示内容+修复导航连接)
window.EnglishSite = window.EnglishSite || {};

// 🎯 简化的词干提取器 - 性能优化版
class SimplifiedWordStemmer {
    constructor() {
        // 🎯 精简不规则动词映射 - 只保留高频词
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
        
        // 🎯 优化缓存 - 使用更高效的缓存策略
        this.stemCache = new Map();
        this.maxCacheSize = 1000; // 增加缓存大小
        
        // 🎯 预编译正则表达式 - 性能优化
        this.regexPool = {
            punctuation: /[^\w\s'-]/g,
            whitespace: /\s+/g,
            trimDashes: /^[-']+|[-']+$/g,
            alphaOnly: /^[a-zA-Z]+$/,
            vowels: /[aeiou]/,
            
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
        
        // 🎯 精简后缀规则 - 优化处理顺序
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
        
        console.log('✅ 精简优化版词干提取器已初始化');
    }
    
    // 🎯 获取词干 - 优化缓存逻辑
    getStem(word) {
        const lowerWord = word.toLowerCase();
        
        // 🔧 优化缓存查找
        if (this.stemCache.has(lowerWord)) {
            return this.stemCache.get(lowerWord);
        }
        
        let result;
        
        // 查找顺序：不规则动词 > 后缀规则
        if (this.irregularVerbsMap.has(lowerWord)) {
            result = this.irregularVerbsMap.get(lowerWord);
        } else {
            result = this.applySuffixRules(lowerWord);
        }
        
        // 🔧 优化缓存管理 - 批量清理策略
        if (this.stemCache.size >= this.maxCacheSize) {
            // 清理最老的25%条目
            const entriesToDelete = Math.floor(this.maxCacheSize * 0.25);
            const iterator = this.stemCache.keys();
            for (let i = 0; i < entriesToDelete; i++) {
                const key = iterator.next().value;
                if (key) this.stemCache.delete(key);
            }
        }
        this.stemCache.set(lowerWord, result);
        
        return result;
    }
    
    // 应用后缀规则 - 保持不变
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
    
    // 词干验证 - 保持不变
    isValidStem(stem, original) {
        const stemLen = stem.length;
        const origLen = original.length;
        
        return stemLen >= 2 && 
               stemLen >= origLen * 0.4 && 
               (stemLen <= 2 || this.regexPool.vowels.test(stem));
    }
    
    // 清理缓存
    clearCache() {
        this.stemCache.clear();
    }
}

// 🎯 优化的词频分析器 - 性能和连接性改进
class SimplifiedWordFrequencyAnalyzer {
    constructor() {
        this.stemmer = new SimplifiedWordStemmer();
        
        // 核心数据结构 - 保持不变
        this.wordStats = new Map();
        this.articleContents = new Map();
        this.variantIndex = new Map(); 
        this.articleVariants = new Map(); 
        
        // 🎯 精简停用词集合 - 保持不变
        this.stopWordsSet = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 
            'by', 'from', 'this', 'that', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
            'is', 'are', 'was', 'were', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'can', 'could', 'should', 'not', 'no', 'all', 'any', 'some',
            'neil', 'beth'
        ]);
        
        // 🎯 预编译正则表达式 - 性能优化
        this.regexPool = {
            punctuation: /[^\w\s'-]/g,
            whitespace: /\s+/g,
            trimDashes: /^[-']+|[-']+$/g,
            alphaOnly: /^[a-zA-Z]+$/,
            digits: /^\d+$/,
            sentences: /[.!?]+/
        };
        
        console.log('✅ 精简优化版词频分析器已初始化');
    }
    
    // 🎯 分析文章 - 保持核心逻辑不变
    analyzeArticle(articleId, content, title) {
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
            console.error(`❌ 文章分析失败 ${articleId}:`, error);
        }
    }
    
    // 🎯 提取单词 - 优化性能
    extractWords(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }
        
        // 🔧 优化文本清理 - 一次性处理
        const cleanText = text
            .toLowerCase()
            .replace(this.regexPool.punctuation, ' ')
            .replace(this.regexPool.whitespace, ' ');
        
        const rawWords = cleanText.split(' ');
        const words = [];
        
        // 🔧 优化单词处理 - 减少函数调用
        for (const word of rawWords) {
            const cleanWord = word.replace(this.regexPool.trimDashes, '');
            
            if (this.isValidWord(cleanWord)) {
                words.push(cleanWord);
            }
        }
        
        return words;
    }
    
    // 🎯 验证单词 - 保持不变
    isValidWord(word) {
        if (!word || typeof word !== 'string') return false;
        
        const len = word.length;
        return len >= 3 && 
               len <= 20 && 
               !this.stopWordsSet.has(word) &&
               !this.regexPool.digits.test(word) &&
               this.regexPool.alphaOnly.test(word);
    }
    
    // 🎯 更新全局统计 - 保持不变
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
                
                // 为精确搜索建立索引
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
    
    // 🎯 更新变形词索引 - 用于精确搜索，保持不变
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
    
    // 🎯 提取上下文 - 优化性能
    extractContexts(content, baseWord) {
        const contexts = [];
        
        try {
            const sentences = content.split(this.regexPool.sentences);
            const stats = this.wordStats.get(baseWord);
            const variants = stats ? Array.from(stats.variants.keys()).slice(0, 3) : [baseWord];
            
            let foundCount = 0;
            const maxContexts = 2;
            
            // 🔧 优化上下文提取 - 减少正则表达式创建
            const variantRegexes = variants.map(variant => 
                new RegExp(`\\b${this.escapeRegex(variant)}\\b`, 'i')
            );
            
            for (const sentence of sentences) {
                if (foundCount >= maxContexts) break;
                
                const trimmed = sentence.trim();
                if (!trimmed) continue;
                
                const hasMatch = variantRegexes.some(regex => regex.test(trimmed));
                
                if (hasMatch) {
                    let context = trimmed.substring(0, 100);
                    if (trimmed.length > 100) context += '...';
                    
                    // 高亮匹配的词
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
    
    // 🎯 转义正则表达式 - 保持不变
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // 🎯 智能搜索 - 基于词干合并，保持不变
    searchWords(query) {
        console.log(`🧠 执行智能搜索: "${query}"`);
        
        if (!query || typeof query !== 'string') {
            return [];
        }
        
        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) {
            return [];
        }
        
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
        
        // 按相关性和频次排序
        results.sort((a, b) => {
            const relevanceDiff = b.relevance - a.relevance;
            return relevanceDiff !== 0 ? relevanceDiff : b.totalCount - a.totalCount;
        });
        
        console.log(`🧠 智能搜索完成: 找到 ${results.length} 个结果`);
        return results;
    }
    
    // 🎯 精确搜索 - 基于原文匹配，保持不变
    searchWordsExact(query) {
        console.log(`🎯 执行精确搜索: "${query}"`);
        
        if (!query || typeof query !== 'string') {
            return [];
        }
        
        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) {
            return [];
        }
        
        const results = [];
        
        // 在变形词索引中查找
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
    
    // 🎯 为精确匹配提取上下文 - 保持不变
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
                
                // 高亮匹配的词
                context = context.replace(regex, `<mark>$&</mark>`);
                
                contexts.push(context);
                foundCount++;
                
                // 重置正则表达式的lastIndex
                regex.lastIndex = 0;
            }
        } catch (error) {
            console.warn('提取精确匹配上下文失败:', error);
        }
        
        return contexts;
    }
    
    // 🎯 获取最常见变形词 - 保持不变
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

    // 🎯 分布密度算法 - 保持不变
    calculateDistributionScore(baseWord, stats) {
        const frequency = stats.totalCount;
        const articleCount = stats.articles.size;
        const totalArticles = this.articleContents.size;
        
        if (totalArticles === 0 || articleCount === 0) return frequency;
        
        const distributionRatio = articleCount / totalArticles;
        const avgDensity = frequency / articleCount;
        const distributionWeight = Math.sqrt(distributionRatio);
        const stabilityWeight = Math.log(avgDensity + 1) / Math.log(10);
        
        return frequency * distributionWeight * stabilityWeight;
    }

    // 🎯 获取智能排序的词频数据 - 保持不变
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
        
        data.sort((a, b) => b.distributionScore - a.distributionScore);
        return data;
    }

    // 🎯 基于分布评分的章节难度计算 - 保持不变
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
                    const distributionScore = this.calculateDistributionScore(stem, stats);
                    const wordDifficulty = this.convertScoreToDifficulty(distributionScore);
                    totalDifficultyScore += wordDifficulty;
                    
                    if (wordDifficulty <= 2) difficultyBreakdown.easy++;
                    else if (wordDifficulty <= 3.5) difficultyBreakdown.medium++;
                    else difficultyBreakdown.hard++;
                }
            }
        });
        
        if (validWordCount === 0) return { stars: 3, label: "⭐⭐⭐ 中等" };
        
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
            tooltip: `${easyWordRatio}% 高频词汇`
        };
    }

    // 🎯 将分布评分转换为难度等级 - 保持不变
    convertScoreToDifficulty(distributionScore) {
        if (distributionScore >= 20) return 1;
        if (distributionScore >= 10) return 2;
        if (distributionScore >= 5) return 3;
        if (distributionScore >= 2) return 4;
        return 5;
    }

    // 🎯 星级标签 - 保持不变
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
    
    // 🎯 获取词频数据 - 保持不变
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
    
    // 🎯 按频次筛选 - 保持不变
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
    
    // 🎯 获取统计摘要 - 保持不变
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

// 🚀 优化的词频管理器 - 修复导航连接问题
class SimplifiedWordFrequencyManager {
    constructor() {
        this.analyzer = new SimplifiedWordFrequencyAnalyzer();
        this.isInitialized = false;
        this.isInitializing = false;
        this.initializationError = null;
        this.processedArticles = new Set();
        this.processingProgress = 0;
        
        // 🔧 优化缓存策略 - 统一使用navigation的缓存
        this.cache = window.EnglishSite.CacheManager?.get('wordFreq') ||
            window.EnglishSite.CacheManager?.create('wordFreq', 100, 3600000);
        
        console.log('✅ 精简优化版词频管理器已创建');
        
        // 🔧 优化初始化时序 - 确保导航系统就绪
        setTimeout(async () => {
            await this.waitForNavigationReady();
            this.startInitialization();
        }, 0);
    }
    
    // 🆕 等待导航系统就绪 - 增强版
    async waitForNavigationReady() {
        const maxWaitTime = 45000; // 45秒超时（增加等待时间）
        const checkInterval = 200; // 减少检查间隔
        let waitedTime = 0;
        
        console.log('⏳ 等待完整应用初始化...');
        
        return new Promise((resolve) => {
            const checkAppReady = () => {
                // 🔧 更全面的就绪检查
                const appExists = !!window.app;
                const appInitialized = window.app?.initPromise;
                const navExists = !!window.app?.navigation;
                const navInitialized = window.app?.navigation?.state?.chaptersMap?.size > 0;
                const hasGetAllChapters = typeof window.app?.navigation?.getAllChapters === 'function';
                
                const isReady = appExists && navExists && (navInitialized || hasGetAllChapters);
                
                if (this.config?.debug) {
                    console.log(`[${waitedTime}ms] 应用状态检查:`, {
                        appExists,
                        appInitialized: !!appInitialized,
                        navExists,
                        navInitialized,
                        hasGetAllChapters,
                        isReady
                    });
                }
                
                if (isReady) {
                    console.log('✅ 完整应用初始化完成');
                    resolve(true);
                } else if (waitedTime >= maxWaitTime) {
                    console.warn('⚠️ 应用等待超时，尝试继续初始化');
                    console.warn('当前状态:', { appExists, navExists, navInitialized, hasGetAllChapters });
                    resolve(false);
                } else {
                    waitedTime += checkInterval;
                    setTimeout(checkAppReady, checkInterval);
                }
            };
            checkAppReady();
        });
    }
    
    // 🎯 启动初始化 - 保持核心逻辑
    async startInitialization() {
        if (this.isInitializing || this.isInitialized) {
            return;
        }
        
        this.isInitializing = true;
        
        try {
            console.log('🚀 开始精简优化版词频分析器初始化...');
            
            // 🎯 检查缓存
            const cachedData = this.cache?.get('fullAnalysis');
            if (cachedData && this.isCacheValid(cachedData)) {
                console.log('📦 从缓存加载词频数据');
                this.loadFromCache(cachedData);
                this.isInitialized = true;
                this.isInitializing = false;
                console.log('✅ 词频分析器初始化完成 (从缓存)');
                return;
            }
            
            // 🎯 全新分析
            await this.analyzeAllArticles();
            this.cacheResults();
            
            this.isInitialized = true;
            this.isInitializing = false;
            
            console.log('✅ 精简优化版词频分析器初始化完成 (全新分析)');
            
        } catch (error) {
            console.error('❌ 精简优化版词频分析器初始化失败:', error);
            this.initializationError = error;
            this.isInitializing = false;
        }
    }
    
    // 🎯 等待就绪 - 保持接口不变
    async waitForReady() {
        const maxWaitTime = 60000; // 60秒超时
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
    
    // 🔧 优化分析所有文章 - 修复数据连接问题
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
                    
                    // 发送进度事件
                    this.dispatchProgressEvent(this.processingProgress);
                    
                    // 适当让出控制权
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
    
    // 🔧 优化获取所有章节 - 修复数据连接问题
    async getAllChapters() {
        console.log('📋 获取文章列表...');
        
        // 🆕 方法1: 优先使用navigation系统的API
        try {
            if (window.app?.navigation?.getAllChapters) {
                const chapters = window.app.navigation.getAllChapters();
                if (chapters && chapters.length > 0) {
                    // 提取ID列表，确保数据格式一致
                    const chapterIds = chapters.map(ch => ch.id || ch).filter(id => 
                        id && typeof id === 'string' && id.trim().length > 0
                    );
                    
                    if (chapterIds.length > 0) {
                        console.log(`✅ 从navigation.getAllChapters()获取到 ${chapterIds.length} 个章节`);
                        return chapterIds;
                    }
                }
            }
        } catch (error) {
            console.warn('navigation.getAllChapters()调用失败:', error.message);
        }
        
        // 🔧 方法2: 直接访问chaptersMap（修复数据格式问题）
        try {
            if (window.app?.navigation?.state?.chaptersMap) {
                const chaptersMap = window.app.navigation.state.chaptersMap;
                if (chaptersMap.size > 0) {
                    // 获取完整章节对象的ID列表
                    const chapters = Array.from(chaptersMap.values());
                    const chapterIds = chapters.map(ch => ch.id).filter(id => 
                        id && typeof id === 'string' && id.trim().length > 0
                    );
                    
                    if (chapterIds.length > 0) {
                        console.log(`✅ 从navigation.chaptersMap获取到 ${chapterIds.length} 个章节`);
                        // 🆕 缓存完整的章节数据，供后续使用
                        this.cachedChaptersData = new Map();
                        chapters.forEach(ch => {
                            if (ch.id) {
                                this.cachedChaptersData.set(ch.id, ch);
                            }
                        });
                        return chapterIds;
                    }
                }
            }
        } catch (error) {
            console.warn('方法2失败:', error.message);
        }
        
        // 🎯 方法3: 从navigation.json获取
        try {
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
            console.warn('方法3失败:', error.message);
        }
        
        // 🚨 所有数据源失败
        throw new Error('无法获取章节数据：所有数据源都不可用');
    }
    

    
    // 🔧 优化获取文章内容 - 复用navigation系统
    async getArticleContent(chapterId) {
        // 🆕 优先使用navigation系统的缓存和获取机制
        if (window.app?.navigation) {
            try {
                const content = await this.getContentViaNavigation(chapterId);
                if (content) {
                    return content;
                }
            } catch (error) {
                console.warn(`通过navigation获取${chapterId}失败:`, error.message);
            }
        }
        
        // 回退到原有逻辑
        return await this.getContentFallback(chapterId);
    }
    
    // 🆕 通过navigation系统获取内容
    async getContentViaNavigation(chapterId) {
        const navigation = window.app.navigation;
        
        // 尝试从navigation缓存获取
        if (navigation.cache && typeof navigation.cache.get === 'function') {
            const cachedContent = navigation.cache.get(chapterId);
            if (cachedContent) {
                const textContent = this.extractTextFromHTML(cachedContent);
                const title = this.extractTitleFromHTML(cachedContent) || chapterId;
                console.log(`📦 从navigation缓存获取: ${chapterId}`);
                return { content: textContent, title };
            }
        }
        
        // 尝试使用navigation的章节数据
        if (this.cachedChaptersData && this.cachedChaptersData.has(chapterId)) {
            const chapterData = this.cachedChaptersData.get(chapterId);
            
            // 如果有URL，尝试获取内容
            if (chapterData.url) {
                const contentUrl = chapterData.url.startsWith('http') ? 
                    chapterData.url : chapterData.url;
                    
                try {
                    const response = await fetch(contentUrl);
                    if (response.ok) {
                        const htmlContent = await response.text();
                        const textContent = this.extractTextFromHTML(htmlContent);
                        const title = this.extractTitleFromHTML(htmlContent) || chapterData.title || chapterId;
                        
                        // 缓存到navigation系统
                        if (navigation.cache && typeof navigation.cache.set === 'function') {
                            navigation.cache.set(chapterId, htmlContent);
                        }
                        
                        console.log(`🌐 通过navigation URL获取: ${chapterId}`);
                        return { content: textContent, title };
                    }
                } catch (error) {
                    console.warn(`获取${contentUrl}失败:`, error.message);
                }
            }
        }
        
        // 尝试标准文件路径
        try {
            const response = await fetch(`chapters/${chapterId}.html`);
            if (response.ok) {
                const htmlContent = await response.text();
                const textContent = this.extractTextFromHTML(htmlContent);
                const title = this.extractTitleFromHTML(htmlContent) || chapterId;
                
                // 缓存到navigation系统
                if (navigation.cache && typeof navigation.cache.set === 'function') {
                    navigation.cache.set(chapterId, htmlContent);
                }
                
                console.log(`📁 通过标准路径获取: ${chapterId}`);
                return { content: textContent, title };
            }
        } catch (error) {
            console.warn(`获取chapters/${chapterId}.html失败:`, error.message);
        }
        
        return null;
    }
    
    // 🔧 回退获取内容机制
    async getContentFallback(chapterId) {
        // 尝试从文件获取
        try {
            const response = await fetch(`chapters/${chapterId}.html`);
            if (response.ok) {
                const htmlContent = await response.text();
                const textContent = this.extractTextFromHTML(htmlContent);
                const title = this.extractTitleFromHTML(htmlContent) || chapterId;
                console.log(`📄 从文件获取: ${chapterId}`);
                return { content: textContent, title };
            }
        } catch (error) {
            console.warn(`无法从文件获取 ${chapterId}:`, error.message);
        }
        
        throw new Error(`无法获取文章内容: ${chapterId}`);
    }
    
    // 🎯 从HTML提取文本 - 保持不变
    extractTextFromHTML(html) {
        try {
            if (typeof DOMParser !== 'undefined') {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // 移除脚本和样式
                const scripts = doc.querySelectorAll('script, style, nav, header, footer');
                scripts.forEach(el => el.remove());
                
                return doc.body ? doc.body.textContent || doc.body.innerText || '' : '';
            } else {
                // 降级处理
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
    
    // 🎯 从HTML提取标题 - 保持不变
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
    
    // 🎯 发送进度事件 - 保持不变
    dispatchProgressEvent(progress) {
        try {
            document.dispatchEvent(new CustomEvent('wordFreqProgress', {
                detail: { progress }
            }));
        } catch (error) {
            console.warn('进度事件发送失败:', error);
        }
    }
    
    // 🎯 睡眠函数 - 保持不变
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 🎯 缓存验证 - 保持不变
    isCacheValid(cachedData) {
        try {
            if (!cachedData || typeof cachedData !== 'object') {
                return false;
            }
            
            const { timestamp, dataSize } = cachedData;
            
            // 检查时间（24小时有效期）
            const maxAge = 24 * 60 * 60 * 1000;
            if (!timestamp || Date.now() - timestamp > maxAge) {
                return false;
            }
            
            // 检查数据大小
            if (!dataSize || dataSize < 10) {
                return false;
            }
            
            return true;
        } catch (error) {
            console.warn('缓存验证失败:', error);
            return false;
        }
    }
    
    // 🎯 从缓存加载 - 保持不变
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
    
    // 🎯 缓存结果 - 保持不变
    cacheResults() {
        try {
            const cacheData = {
                timestamp: Date.now(),
                version: '2.1', // 🆕 更新版本号
                wordStats: Array.from(this.analyzer.wordStats.entries()),
                articleContents: Array.from(this.analyzer.articleContents.entries()),
                variantIndex: Array.from(this.analyzer.variantIndex.entries()).map(([k, v]) => [k, Array.from(v)]),
                articleVariants: Array.from(this.analyzer.articleVariants.entries()),
                dataSize: this.analyzer.wordStats.size
            };
            
            if (this.cache) {
                this.cache.set('fullAnalysis', cacheData);
                console.log('💾 精简优化版分析结果已缓存');
            }
        } catch (error) {
            console.warn('缓存保存失败:', error);
        }
    }
    
    // 🎯 公共API方法 - 保持接口完全不变
    
    // 获取高频词
    getTopWords(limit = 100) {
        try {
            const words = this.analyzer.getWordFrequencyData();
            return words.slice(0, limit);
        } catch (error) {
            console.error('获取高频词失败:', error);
            return [];
        }
    }
    
    // 🆕 智能排序的公开API
    getTopWordsSmart(limit = 100) {
        try {
            const words = this.analyzer.getWordFrequencyDataSmart();
            return words.slice(0, limit);
        } catch (error) {
            console.error('获取智能排序词频失败:', error);
            return [];
        }
    }

    // 🆕 章节难度计算的公开API
    getArticleDifficulty(articleId) {
        try {
            return this.analyzer.calculateSmartArticleDifficulty(articleId);
        } catch (error) {
            console.error('计算章节难度失败:', error);
            return { stars: 3, label: "⭐⭐⭐ 中等" };
        }
    }
    
    // 获取单词详情
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
            console.error('获取单词详情失败:', error);
            return null;
        }
    }
    
    // 🎯 智能搜索 - 对外接口，保持不变
    searchWords(query) {
        try {
            return this.analyzer.searchWords(query);
        } catch (error) {
            console.error('智能搜索失败:', error);
            return [];
        }
    }
    
    // 🎯 精确搜索 - 对外接口，保持不变
    searchWordsExact(query) {
        try {
            return this.analyzer.searchWordsExact(query);
        } catch (error) {
            console.error('精确搜索失败:', error);
            return [];
        }
    }
    
    // 获取统计摘要
    getStatsSummary() {
        try {
            return this.analyzer.getStatsSummary();
        } catch (error) {
            console.error('获取统计摘要失败:', error);
            return {
                totalUniqueWords: 0,
                totalVariants: 0,
                totalWordOccurrences: 0,
                totalArticlesAnalyzed: 0,
                averageWordsPerArticle: 0
            };
        }
    }
    
    // 🎯 销毁管理器 - 保持不变
    destroy() {
        try {
            console.log('🧹 开始销毁精简优化版词频管理器...');
            
            // 清理数据
            this.analyzer.wordStats.clear();
            this.analyzer.articleContents.clear();
            this.analyzer.variantIndex.clear();
            this.analyzer.articleVariants.clear();
            this.analyzer.stemmer.clearCache();
            this.processedArticles.clear();
            
            // 🆕 清理新增的缓存
            if (this.cachedChaptersData) {
                this.cachedChaptersData.clear();
                this.cachedChaptersData = null;
            }
            
            // 重置状态
            this.isInitialized = false;
            this.isInitializing = false;
            this.initializationError = null;
            
            console.log('✅ 精简优化版词频管理器销毁完成');
        } catch (error) {
            console.error('销毁过程中出错:', error);
        }
    }
}

// 🎯 导出到全局 - 保持完全不变
window.EnglishSite.WordFrequencyManager = SimplifiedWordFrequencyManager;
window.EnglishSite.SimplifiedWordFrequencyAnalyzer = SimplifiedWordFrequencyAnalyzer;
window.EnglishSite.SimplifiedWordStemmer = SimplifiedWordStemmer;

console.log('📊 精简优化版词频管理系统已加载 v2.1 - 移除演示内容+修复导航连接');