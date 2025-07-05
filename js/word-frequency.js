// js/word-frequency.js - 完全重构版 v3.0 (稳定集成版)
// 🎯 目标：保持100%功能完整性 + 完全系统兼容性 + 零冲突

(function() {
    'use strict';
    
    console.log('🚀 加载重构版词频系统 v3.0...');
    
    // 确保 EnglishSite 命名空间存在
    window.EnglishSite = window.EnglishSite || {};
    
    // 🛡️ 安全的工具函数
    const SafeUtils = {
        // 安全的对象访问
        safeGet: function(obj, path, defaultValue) {
            try {
                const keys = path.split('.');
                let current = obj;
                for (const key of keys) {
                    if (current == null || typeof current !== 'object') {
                        return defaultValue;
                    }
                    current = current[key];
                }
                return current !== undefined ? current : defaultValue;
            } catch (e) {
                return defaultValue;
            }
        },
        
        // 安全的错误处理
        safeExecute: function(fn, errorMsg, defaultReturn) {
            try {
                return fn();
            } catch (error) {
                console.warn(errorMsg + ':', error.message);
                return defaultReturn;
            }
        },
        
        // 安全的缓存操作
        safeCache: {
            storage: new Map(),
            get: function(key) {
                return this.storage.get(key);
            },
            set: function(key, value) {
                try {
                    if (this.storage.size > 500) {
                        const firstKey = this.storage.keys().next().value;
                        this.storage.delete(firstKey);
                    }
                    this.storage.set(key, value);
                } catch (e) {
                    console.warn('缓存设置失败:', e.message);
                }
            },
            clear: function() {
                this.storage.clear();
            }
        }
    };
    
    // 🎯 重构版词干提取器 - 简化但功能完整
    function WordStemmer() {
        this.stemCache = SafeUtils.safeCache;
        this.irregularVerbs = new Map();
        
        // 初始化不规则动词表
        this.initIrregularVerbs();
        
        console.log('✅ WordStemmer 初始化完成');
    }
    
    WordStemmer.prototype.initIrregularVerbs = function() {
        const irregularList = [
            // 常见不规则动词
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
            ['knew', 'know'], ['known', 'know'], ['knowing', 'know'], ['knows', 'know'],
            ['thought', 'think'], ['thinking', 'think'], ['thinks', 'think'],
            ['found', 'find'], ['finding', 'find'], ['finds', 'find'],
            ['gave', 'give'], ['given', 'give'], ['giving', 'give'], ['gives', 'give']
        ];
        
        irregularList.forEach(pair => {
            this.irregularVerbs.set(pair[0], pair[1]);
        });
    };
    
    WordStemmer.prototype.getStem = function(word) {
        if (!word || typeof word !== 'string') return word;
        
        const lowerWord = word.toLowerCase();
        
        // 检查缓存
        const cached = this.stemCache.get(lowerWord);
        if (cached) return cached;
        
        let stem;
        
        // 检查不规则动词
        if (this.irregularVerbs.has(lowerWord)) {
            stem = this.irregularVerbs.get(lowerWord);
        } else {
            stem = this.applySuffixRules(lowerWord);
        }
        
        // 缓存结果
        this.stemCache.set(lowerWord, stem);
        return stem;
    };
    
    WordStemmer.prototype.applySuffixRules = function(word) {
        if (word.length < 4) return word;
        
        // 简化但有效的后缀规则
        const rules = [
            [/ies$/, 'y', 5],    // cities -> city
            [/ves$/, 'f', 5],    // leaves -> leaf
            [/ses$/, 's', 5],    // classes -> class
            [/ches$/, 'ch', 6],  // watches -> watch
            [/shes$/, 'sh', 6],  // wishes -> wish
            [/s$/, '', 4],       // cats -> cat (但避免 ss -> s)
            [/ied$/, 'y', 5],    // tried -> try
            [/ed$/, '', 4],      // played -> play
            [/ing$/, '', 5],     // playing -> play
            [/ly$/, '', 5],      // quickly -> quick
            [/est$/, '', 5],     // fastest -> fast
            [/er$/, '', 4]       // faster -> fast
        ];
        
        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            const pattern = rule[0];
            const replacement = rule[1];
            const minLength = rule[2];
            
            if (word.length >= minLength && pattern.test(word)) {
                // 特殊处理：避免 ss -> s
                if (pattern.source === 's$' && word.endsWith('ss')) {
                    continue;
                }
                
                const stem = word.replace(pattern, replacement);
                
                // 验证词干有效性
                if (this.isValidStem(stem, word)) {
                    return stem;
                }
            }
        }
        
        return word;
    };
    
    WordStemmer.prototype.isValidStem = function(stem, original) {
        if (stem.length < 2) return false;
        if (stem.length < original.length * 0.4) return false;
        if (stem.length <= 2) return true;
        
        // 检查是否包含元音
        return /[aeiou]/.test(stem);
    };
    
    // 🎯 重构版词频分析器 - 高效稳定
    function WordFrequencyAnalyzer() {
        this.stemmer = new WordStemmer();
        this.wordStats = new Map();
        this.articleContents = new Map();
        this.variantIndex = new Map();
        this.articleVariants = new Map();
        
        // 停用词集合
        this.stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
            'by', 'from', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'shall',
            'not', 'no', 'nor', 'yes', 'all', 'any', 'some', 'each', 'every', 'either', 'neither',
            'both', 'few', 'many', 'much', 'more', 'most', 'other', 'another', 'such', 'what', 'which',
            'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'here', 'there', 'now', 'then',
            'today', 'yesterday', 'tomorrow', 'always', 'never', 'sometimes', 'often', 'usually',
            'neil', 'beth', 'sam', 'dan', 'rob', 'georgina', 'catherine', 'tom', 'alice'
        ]);
        
        console.log('✅ WordFrequencyAnalyzer 初始化完成');
    }
    
    WordFrequencyAnalyzer.prototype.analyzeArticle = function(articleId, content, title) {
        return SafeUtils.safeExecute(() => {
            console.log('📝 分析文章:', articleId);
            
            if (!content || typeof content !== 'string') {
                console.warn('文章内容为空:', articleId);
                return;
            }
            
            const words = this.extractWords(content);
            const wordCounts = new Map();
            
            // 统计词频
            for (let i = 0; i < words.length; i++) {
                const originalWord = words[i];
                if (this.isValidWord(originalWord)) {
                    const baseWord = this.stemmer.getStem(originalWord);
                    
                    if (!wordCounts.has(baseWord)) {
                        wordCounts.set(baseWord, {
                            totalCount: 0,
                            variants: new Map()
                        });
                    }
                    
                    const wordData = wordCounts.get(baseWord);
                    wordData.totalCount++;
                    
                    const currentCount = wordData.variants.get(originalWord) || 0;
                    wordData.variants.set(originalWord, currentCount + 1);
                }
            }
            
            // 更新全局统计
            this.updateGlobalStats(articleId, title, content, wordCounts);
            
            // 保存文章内容信息
            this.articleContents.set(articleId, {
                content: content,
                title: title,
                wordCount: words.length,
                uniqueWords: wordCounts.size
            });
            
            console.log(`✅ 文章分析完成: ${articleId} (${words.length}词, ${wordCounts.size}唯一)`);
            
        }, `分析文章 ${articleId} 失败`, null);
    };
    
    WordFrequencyAnalyzer.prototype.extractWords = function(text) {
        if (!text || typeof text !== 'string') return [];
        
        return SafeUtils.safeExecute(() => {
            // 清理文本并提取单词
            const cleanText = text
                .toLowerCase()
                .replace(/[^\w\s'-]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            if (!cleanText) return [];
            
            const rawWords = cleanText.split(' ');
            const words = [];
            
            for (let i = 0; i < rawWords.length; i++) {
                const word = rawWords[i].replace(/^[-']+|[-']+$/g, '');
                if (this.isValidWord(word)) {
                    words.push(word);
                }
            }
            
            return words;
        }, '提取单词失败', []);
    };
    
    WordFrequencyAnalyzer.prototype.isValidWord = function(word) {
        if (!word || typeof word !== 'string') return false;
        
        const len = word.length;
        if (len < 3 || len > 20) return false;
        
        if (this.stopWords.has(word)) return false;
        if (/^\d+$/.test(word)) return false;
        if (!/^[a-zA-Z]+$/.test(word)) return false;
        
        return true;
    };
    
    WordFrequencyAnalyzer.prototype.updateGlobalStats = function(articleId, title, content, wordCounts) {
        const self = this;
        
        wordCounts.forEach(function(data, baseWord) {
            let stats = self.wordStats.get(baseWord);
            if (!stats) {
                stats = {
                    totalCount: 0,
                    variants: new Map(),
                    articles: new Map()
                };
                self.wordStats.set(baseWord, stats);
            }
            
            stats.totalCount += data.totalCount;
            
            // 更新变形词统计
            data.variants.forEach(function(count, variant) {
                const currentCount = stats.variants.get(variant) || 0;
                stats.variants.set(variant, currentCount + count);
                self.updateVariantIndex(variant, articleId, count);
            });
            
            // 更新文章信息
            const contexts = self.extractContexts(content, baseWord);
            stats.articles.set(articleId, {
                count: data.totalCount,
                title: title,
                contexts: contexts,
                variants: Array.from(data.variants.entries())
            });
        });
    };
    
    WordFrequencyAnalyzer.prototype.updateVariantIndex = function(variant, articleId, count) {
        if (!this.variantIndex.has(variant)) {
            this.variantIndex.set(variant, new Set());
        }
        this.variantIndex.get(variant).add(articleId);
        
        if (!this.articleVariants.has(articleId)) {
            this.articleVariants.set(articleId, new Map());
        }
        this.articleVariants.get(articleId).set(variant, count);
    };
    
    WordFrequencyAnalyzer.prototype.extractContexts = function(content, baseWord) {
        return SafeUtils.safeExecute(() => {
            const contexts = [];
            const sentences = content.split(/[.!?]+/);
            const stats = this.wordStats.get(baseWord);
            const variants = stats ? Array.from(stats.variants.keys()).slice(0, 3) : [baseWord];
            
            let foundCount = 0;
            const maxContexts = 2;
            
            for (let i = 0; i < sentences.length && foundCount < maxContexts; i++) {
                const sentence = sentences[i].trim();
                if (!sentence) continue;
                
                const hasMatch = variants.some(variant => {
                    const regex = new RegExp('\\b' + this.escapeRegex(variant) + '\\b', 'i');
                    return regex.test(sentence);
                });
                
                if (hasMatch) {
                    let context = sentence.substring(0, 100);
                    if (sentence.length > 100) context += '...';
                    
                    // 高亮匹配的词
                    variants.forEach(variant => {
                        const regex = new RegExp('\\b' + this.escapeRegex(variant) + '\\b', 'gi');
                        context = context.replace(regex, '<mark>$&</mark>');
                    });
                    
                    contexts.push(context);
                    foundCount++;
                }
            }
            
            return contexts;
        }, '提取上下文失败', []);
    };
    
    WordFrequencyAnalyzer.prototype.escapeRegex = function(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    
    // 智能搜索 - 基于词干合并
    WordFrequencyAnalyzer.prototype.searchWords = function(query) {
        return SafeUtils.safeExecute(() => {
            console.log('🧠 执行智能搜索:', query);
            
            if (!query || typeof query !== 'string') return [];
            
            const lowerQuery = query.toLowerCase().trim();
            if (!lowerQuery) return [];
            
            const results = [];
            const self = this;
            
            this.wordStats.forEach(function(stats, baseWord) {
                let relevance = 0;
                const matchedVariants = [];
                
                // 词根匹配
                if (baseWord === lowerQuery) {
                    relevance = 10;
                } else if (baseWord.indexOf(lowerQuery) === 0) {
                    relevance = 8;
                } else if (baseWord.indexOf(lowerQuery) > -1) {
                    relevance = 6;
                }
                
                // 变形词匹配
                let variantRelevance = 0;
                stats.variants.forEach(function(count, variant) {
                    if (variant === lowerQuery) {
                        variantRelevance = Math.max(variantRelevance, 9);
                        matchedVariants.push(variant);
                    } else if (variant.indexOf(lowerQuery) === 0) {
                        variantRelevance = Math.max(variantRelevance, 7);
                        matchedVariants.push(variant);
                    } else if (variant.indexOf(lowerQuery) > -1) {
                        variantRelevance = Math.max(variantRelevance, 5);
                        matchedVariants.push(variant);
                    }
                });
                
                const finalRelevance = Math.max(relevance, variantRelevance);
                
                if (finalRelevance > 0) {
                    results.push({
                        word: baseWord,
                        totalCount: stats.totalCount,
                        articleCount: stats.articles.size,
                        variants: Array.from(stats.variants.entries()),
                        mostCommonVariant: self.getMostCommonVariant(stats.variants),
                        relevance: finalRelevance,
                        matchedVariants: matchedVariants,
                        isIntelligentMatch: true,
                        isExactMatch: false
                    });
                }
            });
            
            // 按相关性和频次排序
            results.sort(function(a, b) {
                const relevanceDiff = b.relevance - a.relevance;
                return relevanceDiff !== 0 ? relevanceDiff : b.totalCount - a.totalCount;
            });
            
            console.log('🧠 智能搜索完成:', results.length, '个结果');
            return results;
        }, '智能搜索失败', []);
    };
    
    // 精确搜索 - 基于原文匹配
    WordFrequencyAnalyzer.prototype.searchWordsExact = function(query) {
        return SafeUtils.safeExecute(() => {
            console.log('🎯 执行精确搜索:', query);
            
            if (!query || typeof query !== 'string') return [];
            
            const lowerQuery = query.toLowerCase().trim();
            if (!lowerQuery) return [];
            
            if (!this.variantIndex.has(lowerQuery)) {
                console.log('🎯 精确搜索完成: 未找到', lowerQuery);
                return [];
            }
            
            const matchingArticles = this.variantIndex.get(lowerQuery);
            const articleDetails = [];
            const self = this;
            
            matchingArticles.forEach(function(articleId) {
                try {
                    const articleContent = self.articleContents.get(articleId);
                    const variantCount = self.articleVariants.get(articleId) ?
                        self.articleVariants.get(articleId).get(lowerQuery) || 0 : 0;
                    
                    if (articleContent && variantCount > 0) {
                        articleDetails.push({
                            id: articleId,
                            title: articleContent.title,
                            count: variantCount,
                            contexts: self.extractContextsForExactMatch(articleContent.content, lowerQuery)
                        });
                    }
                } catch (error) {
                    console.warn('处理文章失败:', articleId, error.message);
                }
            });
            
            if (articleDetails.length > 0) {
                const totalCount = articleDetails.reduce(function(sum, art) {
                    return sum + art.count;
                }, 0);
                
                return [{
                    word: lowerQuery,
                    totalCount: totalCount,
                    articleCount: articleDetails.length,
                    variants: [[lowerQuery, totalCount]],
                    mostCommonVariant: lowerQuery,
                    relevance: 10,
                    articles: articleDetails.sort(function(a, b) {
                        return b.count - a.count;
                    }),
                    isIntelligentMatch: false,
                    isExactMatch: true
                }];
            }
            
            console.log('🎯 精确搜索完成: 0个结果');
            return [];
        }, '精确搜索失败', []);
    };
    
    WordFrequencyAnalyzer.prototype.extractContextsForExactMatch = function(content, word) {
        return SafeUtils.safeExecute(() => {
            const contexts = [];
            const sentences = content.split(/[.!?]+/);
            const regex = new RegExp('\\b' + this.escapeRegex(word) + '\\b', 'gi');
            
            let foundCount = 0;
            const maxContexts = 2;
            
            for (let i = 0; i < sentences.length && foundCount < maxContexts; i++) {
                const sentence = sentences[i].trim();
                if (!sentence) continue;
                
                regex.lastIndex = 0;
                if (!regex.test(sentence)) continue;
                
                let context = sentence.substring(0, 100);
                if (sentence.length > 100) context += '...';
                
                regex.lastIndex = 0;
                context = context.replace(regex, '<mark>$&</mark>');
                contexts.push(context);
                foundCount++;
            }
            
            return contexts;
        }, '提取精确匹配上下文失败', []);
    };
    
    WordFrequencyAnalyzer.prototype.getMostCommonVariant = function(variants) {
        let maxCount = 0;
        let mostCommon = '';
        
        variants.forEach(function(count, variant) {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = variant;
            }
        });
        
        return mostCommon;
    };
    
    // 文章难度计算
    WordFrequencyAnalyzer.prototype.calculateSmartArticleDifficulty = function(articleId) {
        return SafeUtils.safeExecute(() => {
            const article = this.articleContents.get(articleId);
            if (!article) {
                return { stars: 3, label: "⭐⭐⭐ 中等", tooltip: "无数据" };
            }
            
            const words = this.extractWords(article.content);
            let totalDifficultyScore = 0;
            let validWordCount = 0;
            const difficultyBreakdown = { easy: 0, medium: 0, hard: 0 };
            
            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                if (this.isValidWord(word)) {
                    validWordCount++;
                    
                    const stem = this.stemmer.getStem(word);
                    const stats = this.wordStats.get(stem);
                    
                    let wordDifficulty;
                    if (stats) {
                        const distributionScore = this.calculateDistributionScore(stem, stats);
                        wordDifficulty = this.convertScoreToDifficulty(distributionScore);
                    } else {
                        wordDifficulty = 5; // 未知词视为最难
                    }
                    
                    totalDifficultyScore += wordDifficulty;
                    
                    // 统计难度分布
                    if (wordDifficulty <= 2) {
                        difficultyBreakdown.easy++;
                    } else if (wordDifficulty <= 3.5) {
                        difficultyBreakdown.medium++;
                    } else {
                        difficultyBreakdown.hard++;
                    }
                }
            }
            
            if (validWordCount === 0) {
                return { stars: 3, label: "⭐⭐⭐ 中等", tooltip: "无可分析词汇" };
            }
            
            const avgDifficulty = totalDifficultyScore / validWordCount;
            const stars = Math.max(1, Math.min(5, Math.round(avgDifficulty)));
            const easyWordRatio = ((difficultyBreakdown.easy / validWordCount) * 100).toFixed(1);
            
            return {
                stars: stars,
                avgDifficulty: avgDifficulty.toFixed(2),
                validWordCount: validWordCount,
                easyWordRatio: easyWordRatio,
                label: this.getStarLabel(stars),
                breakdown: difficultyBreakdown,
                tooltip: easyWordRatio + '% 高频词汇 (' + validWordCount + '个有效词)'
            };
        }, '计算文章难度失败', { stars: 3, label: "⭐⭐⭐ 中等", tooltip: "计算失败" });
    };
    
    WordFrequencyAnalyzer.prototype.calculateDistributionScore = function(baseWord, stats) {
        const frequency = stats.totalCount;
        const articleCount = stats.articles.size;
        const totalArticles = this.articleContents.size;
        
        if (totalArticles === 0 || articleCount === 0) return frequency;
        
        // 分布密度：在多少比例的文章中出现
        const distributionRatio = articleCount / totalArticles;
        
        // 平均密度：每篇文章平均出现次数
        const avgDensity = frequency / articleCount;
        
        // 综合评分公式
        const distributionWeight = Math.sqrt(distributionRatio);
        const stabilityWeight = Math.log(avgDensity + 1) / Math.log(10);
        
        return frequency * distributionWeight * stabilityWeight;
    };
    
    WordFrequencyAnalyzer.prototype.convertScoreToDifficulty = function(distributionScore) {
        if (distributionScore >= 50) return 1;      // 很简单（高频高分布）
        if (distributionScore >= 20) return 2;      // 简单  
        if (distributionScore >= 8) return 3;       // 中等
        if (distributionScore >= 3) return 4;       // 困难
        return 5;                                   // 很困难（低频低分布）
    };
    
    WordFrequencyAnalyzer.prototype.getStarLabel = function(stars) {
        const labels = {
            1: "⭐ 入门级",
            2: "⭐⭐ 简单", 
            3: "⭐⭐⭐ 中等",
            4: "⭐⭐⭐⭐ 困难",
            5: "⭐⭐⭐⭐⭐ 专家级"
        };
        return labels[stars] || "⭐⭐⭐ 中等";
    };
    
    // 获取词频数据
    WordFrequencyAnalyzer.prototype.getWordFrequencyData = function() {
        const data = [];
        const self = this;
        
        this.wordStats.forEach(function(stats, baseWord) {
            data.push({
                word: baseWord,
                totalCount: stats.totalCount,
                articleCount: stats.articles.size,
                variants: Array.from(stats.variants.entries()).sort(function(a, b) {
                    return b[1] - a[1];
                }),
                mostCommonVariant: self.getMostCommonVariant(stats.variants),
                articles: Array.from(stats.articles.entries()).map(function(entry) {
                    const id = entry[0];
                    const articleData = entry[1];
                    return {
                        id: id,
                        title: articleData.title,
                        count: articleData.count,
                        contexts: articleData.contexts,
                        variants: articleData.variants
                    };
                })
            });
        });
        
        data.sort(function(a, b) {
            return b.totalCount - a.totalCount;
        });
        
        return data;
    };
    
    WordFrequencyAnalyzer.prototype.getStatsSummary = function() {
        const totalUniqueWords = this.wordStats.size;
        let totalVariants = 0;
        let totalOccurrences = 0;
        
        this.wordStats.forEach(function(stats) {
            totalVariants += stats.variants.size;
            totalOccurrences += stats.totalCount;
        });
        
        const totalArticles = this.articleContents.size;
        
        return {
            totalUniqueWords: totalUniqueWords,
            totalVariants: totalVariants,
            totalWordOccurrences: totalOccurrences,
            totalArticlesAnalyzed: totalArticles,
            averageWordsPerArticle: totalArticles > 0 ? Math.round(totalOccurrences / totalArticles) : 0,
            exactIndexStats: {
                totalVariants: this.variantIndex.size,
                articlesWithVariants: this.articleVariants.size
            }
        };
    };
    
    // 🎯 重构版词频管理器 - 完全集成兼容
    function WordFrequencyManager(navigationState) {
        this.analyzer = new WordFrequencyAnalyzer();
        this.isInitialized = false;
        this.isInitializing = false;
        this.initializationError = null;
        this.processedArticles = new Set();
        this.processingProgress = 0;
        
        // 保存导航状态
        this.navigationState = navigationState;
        
        // 缓存
        this.cache = SafeUtils.safeCache;
        
        console.log('✅ WordFrequencyManager 创建完成', navigationState ? '(有导航状态)' : '(无导航状态)');
        
        // 延迟自动初始化
        setTimeout(() => {
            this.startInitialization();
        }, 100);
    }
    
    WordFrequencyManager.prototype.startInitialization = function() {
        if (this.isInitializing || this.isInitialized) return;
        
        this.isInitializing = true;
        
        SafeUtils.safeExecute(() => {
            console.log('🚀 开始词频分析器初始化...');
            
            // 检查缓存
            const cachedData = this.cache.get('fullAnalysis');
            if (cachedData && this.isCacheValid(cachedData)) {
                console.log('📦 从缓存加载词频数据');
                this.loadFromCache(cachedData);
                this.isInitialized = true;
                this.isInitializing = false;
                console.log('✅ 词频分析器初始化完成 (从缓存)');
                return;
            }
            
            // 全新分析
            this.analyzeAllArticles().then(() => {
                this.cacheResults();
                this.isInitialized = true;
                this.isInitializing = false;
                console.log('✅ 词频分析器初始化完成 (全新分析)');
            }).catch((error) => {
                console.error('❌ 词频分析器初始化失败:', error);
                this.initializationError = error;
                this.isInitializing = false;
            });
            
        }, '词频管理器初始化失败', null);
    };
    
    WordFrequencyManager.prototype.waitForReady = function() {
        const maxWaitTime = 60000;
        const checkInterval = 100;
        let waitedTime = 0;
        const self = this;
        
        return new Promise(function(resolve, reject) {
            function checkStatus() {
                if (self.isInitialized) {
                    resolve(true);
                } else if (self.initializationError) {
                    reject(self.initializationError);
                } else if (waitedTime >= maxWaitTime) {
                    reject(new Error('初始化超时'));
                } else {
                    waitedTime += checkInterval;
                    setTimeout(checkStatus, checkInterval);
                }
            }
            checkStatus();
        });
    };
    
    WordFrequencyManager.prototype.analyzeAllArticles = function() {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            SafeUtils.safeExecute(() => {
                console.log('📊 开始分析所有文章...');
                
                self.getAllChapters().then(function(allChapters) {
                    if (!Array.isArray(allChapters) || allChapters.length === 0) {
                        throw new Error('未找到任何可分析的文章');
                    }
                    
                    console.log('📋 找到', allChapters.length, '篇文章，开始分析...');
                    
                    let processedCount = 0;
                    
                    function processNext() {
                        if (processedCount >= allChapters.length) {
                            console.log('✅ 文章分析完成:', processedCount + '/' + allChapters.length, '篇成功');
                            resolve();
                            return;
                        }
                        
                        const chapterId = allChapters[processedCount];
                        
                        self.getArticleContent(chapterId).then(function(articleData) {
                            self.analyzer.analyzeArticle(chapterId, articleData.content, articleData.title);
                            self.processedArticles.add(chapterId);
                            
                            processedCount++;
                            self.processingProgress = Math.round((processedCount / allChapters.length) * 100);
                            
                            self.dispatchProgressEvent(self.processingProgress);
                            
                            // 每处理5篇文章暂停一下
                            if (processedCount % 5 === 0) {
                                setTimeout(processNext, 10);
                            } else {
                                processNext();
                            }
                            
                        }).catch(function(error) {
                            console.warn('❌ 分析文章', chapterId, '失败:', error.message);
                            processedCount++;
                            
                            // 继续处理下一篇
                            if (processedCount % 5 === 0) {
                                setTimeout(processNext, 10);
                            } else {
                                processNext();
                            }
                        });
                    }
                    
                    processNext();
                    
                }).catch(function(error) {
                    console.error('❌ 获取文章列表失败:', error);
                    reject(error);
                });
                
            }, '分析所有文章失败', null);
        });
    };
    
    WordFrequencyManager.prototype.getAllChapters = function() {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            console.log('📋 获取文章列表...');
            
            // 方法1: 从导航状态获取
            if (self.navigationState && self.navigationState.available && self.navigationState.chaptersMap) {
                const chaptersMap = self.navigationState.chaptersMap;
                if (chaptersMap.size > 0) {
                    const chapters = Array.from(chaptersMap.keys()).filter(function(id) {
                        return id && typeof id === 'string' && id.trim().length > 0;
                    });
                    
                    if (chapters.length > 0) {
                        console.log('✅ 从构造函数导航状态获取到', chapters.length, '个章节');
                        resolve(chapters);
                        return;
                    }
                }
            }
            
            // 方法2: 从全局navigation获取
            if (window.app && window.app.navigation && window.app.navigation.state && window.app.navigation.state.chaptersMap) {
                const chaptersMap = window.app.navigation.state.chaptersMap;
                if (chaptersMap.size > 0) {
                    const chapters = Array.from(chaptersMap.keys()).filter(function(id) {
                        return id && typeof id === 'string' && id.trim().length > 0;
                    });
                    
                    if (chapters.length > 0) {
                        console.log('✅ 从window.app.navigation获取到', chapters.length, '个章节');
                        resolve(chapters);
                        return;
                    }
                }
            }
            
            // 方法3: 从navigation.json获取
            fetch('data/navigation.json').then(function(response) {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('无法加载navigation.json');
            }).then(function(navData) {
                if (Array.isArray(navData) && navData.length > 0) {
                    const allChapters = [];
                    
                    navData.forEach(function(series) {
                        if (series && Array.isArray(series.chapters)) {
                            series.chapters.forEach(function(chapter) {
                                if (chapter && chapter.id && typeof chapter.id === 'string') {
                                    allChapters.push(chapter.id);
                                }
                            });
                        }
                    });
                    
                    if (allChapters.length > 0) {
                        const uniqueChapters = Array.from(new Set(allChapters));
                        console.log('✅ 从navigation.json获取到', uniqueChapters.length, '个唯一章节');
                        resolve(uniqueChapters);
                        return;
                    }
                }
                
                throw new Error('navigation.json中没有找到章节');
            }).catch(function(error) {
                console.warn('❌ 从navigation.json获取失败:', error.message);
                
                // 方法4: 使用演示数据
                console.warn('⚠️ 使用演示数据');
                const demoChapters = self.generateDemoChapters();
                self.createDemoContent(demoChapters).then(function() {
                    console.log('✅ 创建了', demoChapters.length, '个演示章节');
                    resolve(demoChapters);
                }).catch(function(demoError) {
                    console.error('❌ 创建演示数据失败:', demoError);
                    reject(new Error('所有数据源都失败了'));
                });
            });
        });
    };
    
    WordFrequencyManager.prototype.generateDemoChapters = function() {
        return [
            'demo-introduction-to-english',
            'demo-grammar-fundamentals', 
            'demo-vocabulary-building',
            'demo-pronunciation-guide',
            'demo-reading-skills'
        ];
    };
    
    WordFrequencyManager.prototype.createDemoContent = function(demoChapters) {
        return new Promise(function(resolve) {
            const demoContent = [
                {
                    title: "Introduction to English Learning",
                    content: "English language learning represents one of the most significant educational pursuits in the modern world. Students must develop strong foundation in basic grammar concepts, including proper sentence structure, verb conjugation, and syntactic relationships. Vocabulary acquisition involves memorizing common words, understanding etymology, and practicing contextual usage. Research demonstrates that successful language acquisition depends on multiple factors: motivation, exposure frequency, practice intensity, and methodological approach. Effective learning strategies include immersive practice, structured lessons, and consistent review sessions."
                },
                {
                    title: "Grammar Fundamentals",
                    content: "English grammar forms the structural foundation for effective communication and linguistic competence. Understanding grammatical principles enables speakers to construct meaningful sentences, express complex ideas, and communicate with precision and clarity. Essential grammar components include nouns, verbs, adjectives, adverbs, prepositions, conjunctions, and interjections. Sentence construction follows specific patterns: subject-verb-object arrangements, subordinate clauses, and compound structures. Advanced grammar concepts encompass conditional statements, passive voice constructions, and complex tense relationships."
                },
                {
                    title: "Vocabulary Development", 
                    content: "Vocabulary expansion represents the cornerstone of linguistic proficiency and communication effectiveness. Strategic vocabulary development involves systematic learning, contextual understanding, and practical application of new words and phrases. Word families and etymology provide powerful tools for understanding relationships between related terms. Active vocabulary building strategies include flashcard systems, spaced repetition algorithms, contextual learning exercises, and practical application activities. Advanced learners should focus on colloquial expressions, idiomatic phrases, and technical terminology."
                },
                {
                    title: "Pronunciation and Phonetics",
                    content: "Pronunciation training emphasizes phonetic accuracy, stress patterns, and intonation variations. English phonetics involves understanding individual sounds, syllable structures, and rhythm patterns. Effective pronunciation requires consistent practice, audio feedback, and systematic study of sound combinations. Students should focus on common pronunciation challenges, including vowel sounds, consonant clusters, and word stress patterns. Advanced pronunciation skills include connected speech, linking sounds, and natural rhythm patterns that characterize fluent English speaking."
                },
                {
                    title: "Reading Comprehension Skills",
                    content: "Reading comprehension skills are fundamental for academic success and language proficiency. Effective reading strategies include skimming, scanning, detailed reading, and critical analysis. Students must develop the ability to understand main ideas, identify supporting details, and make inferences from textual information. Advanced reading skills involve analyzing author's purpose, recognizing literary devices, and evaluating arguments and evidence. Critical reading requires understanding implicit meanings, cultural contexts, and sophisticated vocabulary usage throughout complex texts."
                }
            ];
            
            for (let i = 0; i < demoChapters.length; i++) {
                const chapterId = demoChapters[i];
                const content = demoContent[i % demoContent.length];
                
                const htmlContent = '<html><head><title>' + content.title + '</title></head><body><article><h1>' + content.title + '</h1><div class="content"><p>' + content.content + '</p></div></article></body></html>';
                
                try {
                    sessionStorage.setItem('demo_content_' + chapterId, htmlContent);
                } catch (e) {
                    console.warn('保存演示内容失败:', e.message);
                }
            }
            
            resolve();
        });
    };
    
    WordFrequencyManager.prototype.getArticleContent = function(chapterId) {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            // 尝试从演示缓存获取
            try {
                const demoContent = sessionStorage.getItem('demo_content_' + chapterId);
                if (demoContent) {
                    const textContent = self.extractTextFromHTML(demoContent);
                    const title = self.extractTitleFromHTML(demoContent) || chapterId;
                    resolve({ content: textContent, title: title });
                    return;
                }
            } catch (e) {
                console.warn('读取演示内容失败:', e.message);
            }
            
            // 尝试从navigation缓存获取
            if (window.app && window.app.navigation && window.app.navigation.cache) {
                try {
                    const cachedContent = window.app.navigation.cache.get(chapterId);
                    if (cachedContent) {
                        const textContent = self.extractTextFromHTML(cachedContent);
                        const title = self.extractTitleFromHTML(cachedContent) || chapterId;
                        resolve({ content: textContent, title: title });
                        return;
                    }
                } catch (e) {
                    console.warn('读取navigation缓存失败:', e.message);
                }
            }
            
            // 尝试从文件获取
            fetch('chapters/' + chapterId + '.html').then(function(response) {
                if (response.ok) {
                    return response.text();
                }
                throw new Error('HTTP ' + response.status);
            }).then(function(htmlContent) {
                const textContent = self.extractTextFromHTML(htmlContent);
                const title = self.extractTitleFromHTML(htmlContent) || chapterId;
                resolve({ content: textContent, title: title });
            }).catch(function(error) {
                console.warn('无法从文件获取', chapterId + ':', error.message);
                reject(new Error('无法获取文章内容: ' + chapterId));
            });
        });
    };
    
    WordFrequencyManager.prototype.extractTextFromHTML = function(html) {
        return SafeUtils.safeExecute(() => {
            if (typeof DOMParser !== 'undefined') {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // 移除脚本和样式
                const scripts = doc.querySelectorAll('script, style, nav, header, footer');
                for (let i = 0; i < scripts.length; i++) {
                    scripts[i].remove();
                }
                
                return doc.body ? (doc.body.textContent || doc.body.innerText || '') : '';
            } else {
                return html
                    .replace(/<script[^>]*>.*?<\/script>/gis, '')
                    .replace(/<style[^>]*>.*?<\/style>/gis, '')
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            }
        }, 'HTML文本提取失败', '');
    };
    
    WordFrequencyManager.prototype.extractTitleFromHTML = function(html) {
        return SafeUtils.safeExecute(() => {
            const titlePatterns = [
                /<h[1-3][^>]*>(.*?)<\/h[1-3]>/i,
                /<title[^>]*>(.*?)<\/title>/i
            ];
            
            for (let i = 0; i < titlePatterns.length; i++) {
                const match = html.match(titlePatterns[i]);
                if (match && match[1]) {
                    return match[1].replace(/<[^>]*>/g, '').trim();
                }
            }
            
            return null;
        }, '标题提取失败', null);
    };
    
    WordFrequencyManager.prototype.dispatchProgressEvent = function(progress) {
        SafeUtils.safeExecute(() => {
            document.dispatchEvent(new CustomEvent('wordFreqProgress', {
                detail: { progress: progress }
            }));
        }, '进度事件发送失败', null);
    };
    
    WordFrequencyManager.prototype.isCacheValid = function(cachedData) {
        return SafeUtils.safeExecute(() => {
            if (!cachedData || typeof cachedData !== 'object') return false;
            
            const timestamp = cachedData.timestamp;
            const dataSize = cachedData.dataSize;
            
            const maxAge = 24 * 60 * 60 * 1000; // 24小时
            if (!timestamp || Date.now() - timestamp > maxAge) return false;
            
            if (!dataSize || dataSize < 10) return false;
            
            return true;
        }, '缓存验证失败', false);
    };
    
    WordFrequencyManager.prototype.loadFromCache = function(cachedData) {
        SafeUtils.safeExecute(() => {
            const wordStats = cachedData.wordStats;
            const articleContents = cachedData.articleContents;
            const variantIndex = cachedData.variantIndex;
            const articleVariants = cachedData.articleVariants;
            
            if (wordStats) {
                this.analyzer.wordStats = new Map(wordStats);
            }
            if (articleContents) {
                this.analyzer.articleContents = new Map(articleContents);
            }
            if (variantIndex) {
                this.analyzer.variantIndex = new Map(variantIndex.map(function(entry) {
                    return [entry[0], new Set(entry[1])];
                }));
            }
            if (articleVariants) {
                this.analyzer.articleVariants = new Map(articleVariants);
            }
            
            console.log('📦 缓存数据加载完成');
        }, '缓存加载失败', null);
    };
    
    WordFrequencyManager.prototype.cacheResults = function() {
        SafeUtils.safeExecute(() => {
            const cacheData = {
                timestamp: Date.now(),
                version: '3.0',
                wordStats: Array.from(this.analyzer.wordStats.entries()),
                articleContents: Array.from(this.analyzer.articleContents.entries()),
                variantIndex: Array.from(this.analyzer.variantIndex.entries()).map(function(entry) {
                    return [entry[0], Array.from(entry[1])];
                }),
                articleVariants: Array.from(this.analyzer.articleVariants.entries()),
                dataSize: this.analyzer.wordStats.size
            };
            
            this.cache.set('fullAnalysis', cacheData);
            console.log('💾 分析结果已缓存');
        }, '缓存保存失败', null);
    };
    
    // 🎯 公共API方法 - 保持完全兼容
    WordFrequencyManager.prototype.getTopWords = function(limit) {
        limit = limit || 100;
        return SafeUtils.safeExecute(() => {
            const words = this.analyzer.getWordFrequencyData();
            return words.slice(0, limit);
        }, 'getTopWords失败', []);
    };
    
    WordFrequencyManager.prototype.getWordDetails = function(word) {
        return SafeUtils.safeExecute(() => {
            const stats = this.analyzer.wordStats.get(word.toLowerCase());
            if (!stats) return null;
            
            return {
                word: word,
                totalCount: stats.totalCount,
                articleCount: stats.articles.size,
                variants: Array.from(stats.variants.entries()),
                articles: Array.from(stats.articles.entries()).map(function(entry) {
                    const id = entry[0];
                    const data = entry[1];
                    return {
                        id: id,
                        title: data.title,
                        count: data.count,
                        contexts: data.contexts || []
                    };
                })
            };
        }, 'getWordDetails失败', null);
    };
    
    WordFrequencyManager.prototype.getArticleDifficulty = function(articleId) {
        return SafeUtils.safeExecute(() => {
            return this.analyzer.calculateSmartArticleDifficulty(articleId);
        }, 'getArticleDifficulty失败', { stars: 3, label: "⭐⭐⭐ 中等", tooltip: "计算失败" });
    };
    
    WordFrequencyManager.prototype.searchWords = function(query) {
        return SafeUtils.safeExecute(() => {
            return this.analyzer.searchWords(query);
        }, 'searchWords失败', []);
    };
    
    WordFrequencyManager.prototype.searchWordsExact = function(query) {
        return SafeUtils.safeExecute(() => {
            return this.analyzer.searchWordsExact(query);
        }, 'searchWordsExact失败', []);
    };
    
    WordFrequencyManager.prototype.getStatsSummary = function() {
        return SafeUtils.safeExecute(() => {
            return this.analyzer.getStatsSummary();
        }, 'getStatsSummary失败', {
            totalUniqueWords: 0,
            totalVariants: 0,
            totalWordOccurrences: 0,
            totalArticlesAnalyzed: 0,
            averageWordsPerArticle: 0
        });
    };
    
    WordFrequencyManager.prototype.destroy = function() {
        SafeUtils.safeExecute(() => {
            console.log('🧹 开始销毁词频管理器...');
            
            this.analyzer.wordStats.clear();
            this.analyzer.articleContents.clear();
            this.analyzer.variantIndex.clear();
            this.analyzer.articleVariants.clear();
            this.analyzer.stemmer.stemCache.clear();
            this.processedArticles.clear();
            
            this.isInitialized = false;
            this.isInitializing = false;
            this.initializationError = null;
            this.navigationState = null;
            
            console.log('✅ 词频管理器销毁完成');
        }, '词频管理器销毁失败', null);
    };
    
    // 🎯 简化搜索管理器 - 保持API兼容
    function SimplifiedSearchManager(analyzer, container) {
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
        
        console.log('✅ SimplifiedSearchManager 初始化完成');
    }
    
    SimplifiedSearchManager.prototype.handleSearch = function(query) {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        const cleanQuery = this.cleanInput(query);
        
        if (!cleanQuery) {
            this.clearSearch();
            return;
        }
        
        const self = this;
        this.debounceTimer = setTimeout(function() {
            self.executeSearch(cleanQuery);
        }, this.debounceDelay);
    };
    
    SimplifiedSearchManager.prototype.cleanInput = function(input) {
        if (!input || typeof input !== 'string') return '';
        
        const cleaned = input
            .toLowerCase()
            .trim()
            .replace(/[^a-zA-Z]/g, '')
            .trim();
        
        if (cleaned.length < 2 || cleaned.length > 50) return '';
        return cleaned;
    };
    
    SimplifiedSearchManager.prototype.executeSearch = function(query) {
        const self = this;
        
        SafeUtils.safeExecute(() => {
            this.state.isSearching = true;
            this.state.query = query;
            this.state.error = null;
            
            console.log('🔍 执行' + this.state.mode + '搜索:', query);
            
            const cacheKey = query + '_' + this.state.mode;
            if (this.cache.has(cacheKey)) {
                console.log('📦 使用缓存结果');
                const cachedResults = this.cache.get(cacheKey);
                this.handleSearchResults(cachedResults, query);
                return;
            }
            
            let results;
            if (this.state.mode === 'intelligent') {
                results = this.executeIntelligentSearch(query);
            } else {
                results = this.executeExactSearch(query);
            }
            
            this.setCacheResult(cacheKey, results);
            this.handleSearchResults(results, query);
            
        }, '搜索执行失败', null);
        
        this.state.isSearching = false;
    };
    
    SimplifiedSearchManager.prototype.executeIntelligentSearch = function(query) {
        if (!this.analyzer || typeof this.analyzer.searchWords !== 'function') {
            throw new Error('智能搜索功能不可用');
        }
        
        const results = this.analyzer.searchWords(query);
        console.log('📊 智能搜索找到', results.length, '个结果');
        
        return results.map(function(item) {
            return Object.assign({}, item, {
                searchMode: 'intelligent',
                isIntelligentMatch: true,
                isExactMatch: false
            });
        });
    };
    
    SimplifiedSearchManager.prototype.executeExactSearch = function(query) {
        if (!this.analyzer || typeof this.analyzer.searchWordsExact !== 'function') {
            throw new Error('精确搜索功能不可用');
        }
        
        const results = this.analyzer.searchWordsExact(query);
        console.log('🎯 精确搜索找到', results.length, '个结果');
        
        return results.map(function(item) {
            return Object.assign({}, item, {
                searchMode: 'exact',
                isIntelligentMatch: false,
                isExactMatch: true
            });
        });
    };
    
    SimplifiedSearchManager.prototype.handleSearchResults = function(results, query) {
        this.state.results = results || [];
        this.state.hasResults = this.state.results.length > 0;
        
        console.log('✅ 搜索完成:', this.state.results.length, '个结果');
        
        SafeUtils.safeExecute(() => {
            this.container.dispatchEvent(new CustomEvent('searchComplete', {
                detail: {
                    query: query,
                    mode: this.state.mode,
                    results: this.state.results,
                    hasResults: this.state.hasResults
                }
            }));
        }, '搜索结果事件发送失败', null);
    };
    
    SimplifiedSearchManager.prototype.switchMode = function(newMode) {
        if (newMode !== 'intelligent' && newMode !== 'exact') {
            console.warn('无效的搜索模式:', newMode);
            return;
        }
        
        const oldMode = this.state.mode;
        this.state.mode = newMode;
        
        console.log('🔄 搜索模式切换:', oldMode, '->', newMode);
        
        if (this.state.query) {
            this.executeSearch(this.state.query);
        }
        
        SafeUtils.safeExecute(() => {
            this.container.dispatchEvent(new CustomEvent('searchModeChanged', {
                detail: {
                    oldMode: oldMode,
                    newMode: newMode
                }
            }));
        }, '模式切换事件发送失败', null);
    };
    
    SimplifiedSearchManager.prototype.clearSearch = function() {
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
        
        SafeUtils.safeExecute(() => {
            this.container.dispatchEvent(new CustomEvent('searchCleared'));
        }, '清除搜索事件发送失败', null);
    };
    
    SimplifiedSearchManager.prototype.setCacheResult = function(key, result) {
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, result);
    };
    
    SimplifiedSearchManager.prototype.getState = function() {
        return Object.assign({}, this.state);
    };
    
    SimplifiedSearchManager.prototype.destroy = function() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.cache.clear();
        console.log('🧹 搜索管理器已销毁');
    };
    
    // 🌐 全局注册 - 保持100%兼容性
    console.log('📦 注册重构版词频类到 EnglishSite...');
    
    // 核心类注册
    window.EnglishSite.WordFrequencyManager = WordFrequencyManager;
    window.EnglishSite.SimplifiedWordFrequencyAnalyzer = WordFrequencyAnalyzer;
    window.EnglishSite.SimplifiedWordStemmer = WordStemmer;
    window.EnglishSite.SimplifiedSearchManager = SimplifiedSearchManager;
    
    console.log('✅ 重构版词频系统注册完成');
    
    // 🔧 自动检测和初始化逻辑
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🎯 重构版词频系统自动启动检测...');
        
        const isWordFreqPage = window.location.pathname.includes('word-frequency') || 
                              document.querySelector('#word-frequency-container') ||
                              document.querySelector('.word-freq-container');
        
        if (isWordFreqPage) {
            console.log('📄 检测到独立词频页面，启动独立模式');
            
            let container = document.querySelector('#word-frequency-container') || 
                           document.querySelector('.word-freq-container') || 
                           document.querySelector('#content') ||
                           document.querySelector('main');
            
            if (!container) {
                container = document.createElement('div');
                container.id = 'word-frequency-container';
                document.body.appendChild(container);
            }
            
            const manager = new WordFrequencyManager();
            
            if (window.EnglishSite.WordFrequencyUI) {
                const ui = new window.EnglishSite.WordFrequencyUI(container, manager);
                
                manager.waitForReady().then(function() {
                    return ui.initialize();
                }).then(function() {
                    console.log('✅ 独立词频页面启动完成');
                }).catch(function(error) {
                    console.error('词频系统启动失败:', error);
                    if (ui.showError) {
                        ui.showError('系统启动失败: ' + error.message);
                    }
                });
                
                window.wordFreqManager = manager;
                window.wordFreqUI = ui;
            } else {
                console.warn('⚠️ WordFrequencyUI 类未找到');
            }
        } else {
            console.log('🔧 非独立页面，等待系统集成调用');
        }
    });
    
    // 🎯 全局便捷函数 - 保持API完全兼容
    window.navigateToWordFrequency = function(options) {
        options = options || {};
        console.log('🎯 启动词频分析工具...');
        
        return SafeUtils.safeExecute(() => {
            let container = document.querySelector('#word-frequency-container') ||
                           document.querySelector('#content') ||
                           document.querySelector('main');
            
            if (!container) {
                console.error('❌ 未找到合适的容器');
                return false;
            }
            
            container.innerHTML = '';
            
            if (!window.wordFreqManager || !window.wordFreqManager.isInitialized) {
                window.wordFreqManager = new WordFrequencyManager();
            }
            
            if (!window.EnglishSite.WordFrequencyUI) {
                console.error('❌ WordFrequencyUI类不存在');
                return false;
            }
            
            const ui = new window.EnglishSite.WordFrequencyUI(container, window.wordFreqManager);
            
            window.wordFreqManager.waitForReady().then(function() {
                return ui.initialize();
            }).then(function() {
                console.log('✅ 词频分析工具启动成功');
            }).catch(function(error) {
                console.error('词频工具启动失败:', error);
                if (ui.showError) {
                    ui.showError('工具启动失败: ' + error.message);
                }
            });
            
            window.wordFreqUI = ui;
            return true;
            
        }, '词频工具启动异常', false);
    };
    
    window.getArticleDifficulty = function(articleId) {
        return SafeUtils.safeExecute(() => {
            if (window.wordFreqManager && window.wordFreqManager.isInitialized) {
                return window.wordFreqManager.getArticleDifficulty(articleId);
            } else {
                console.warn('词频管理器未就绪，返回默认难度');
                return { 
                    stars: 3, 
                    label: "⭐⭐⭐ 中等", 
                    tooltip: "分析中..." 
                };
            }
        }, '获取文章难度失败', { 
            stars: 3, 
            label: "⭐⭐⭐ 中等", 
            tooltip: "计算失败" 
        });
    };
    
    window.searchWords = function(query, mode) {
        mode = mode || 'intelligent';
        
        return SafeUtils.safeExecute(() => {
            if (!window.wordFreqManager || !window.wordFreqManager.isInitialized) {
                console.warn('词频管理器未就绪');
                return [];
            }
            
            if (mode === 'exact') {
                return window.wordFreqManager.searchWordsExact(query);
            } else {
                return window.wordFreqManager.searchWords(query);
            }
        }, '词频搜索失败', []);
    };
    
    console.log('🚀 重构版词频系统加载完成 v3.0 - 完全集成兼容版');
    console.log('✅ 所有类已注册:', {
        WordFrequencyManager: !!window.EnglishSite.WordFrequencyManager,
        SimplifiedWordFrequencyAnalyzer: !!window.EnglishSite.SimplifiedWordFrequencyAnalyzer,
        SimplifiedWordStemmer: !!window.EnglishSite.SimplifiedWordStemmer,
        SimplifiedSearchManager: !!window.EnglishSite.SimplifiedSearchManager
    });
    
})();