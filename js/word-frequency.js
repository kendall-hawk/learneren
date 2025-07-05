// 在word-frequency.js开头添加这个简化版本
(function() {
    'use strict';
    
    console.log('🔧 加载简化但完整的词频系统...');
    
    // 简化的词干提取器
    class SimpleWordStemmer {
        constructor() {
            this.stemCache = new Map();
            this.irregularVerbs = new Map();
            
            // 简化的不规则动词表
            const irregulars = [
                ['am', 'be'], ['is', 'be'], ['are', 'be'], ['was', 'be'], ['were', 'be'],
                ['took', 'take'], ['taken', 'take'], ['taking', 'take'], ['takes', 'take'],
                ['went', 'go'], ['gone', 'go'], ['going', 'go'], ['goes', 'go'],
                ['came', 'come'], ['coming', 'come'], ['comes', 'come'],
                ['saw', 'see'], ['seen', 'see'], ['seeing', 'see'], ['sees', 'see']
            ];
            
            irregulars.forEach(([variant, base]) => {
                this.irregularVerbs.set(variant, base);
            });
        }
        
        getStem(word) {
            const lowerWord = word.toLowerCase();
            
            if (this.stemCache.has(lowerWord)) {
                return this.stemCache.get(lowerWord);
            }
            
            let stem;
            if (this.irregularVerbs.has(lowerWord)) {
                stem = this.irregularVerbs.get(lowerWord);
            } else {
                stem = this.applySuffixRules(lowerWord);
            }
            
            this.stemCache.set(lowerWord, stem);
            return stem;
        }
        
        applySuffixRules(word) {
            if (word.length < 4) return word;
            
            // 简化的后缀规则
            if (word.endsWith('ies') && word.length > 4) {
                return word.slice(0, -3) + 'y';
            }
            if (word.endsWith('ed') && word.length > 3) {
                return word.slice(0, -2);
            }
            if (word.endsWith('ing') && word.length > 4) {
                return word.slice(0, -3);
            }
            if (word.endsWith('s') && word.length > 3 && !word.endsWith('ss')) {
                return word.slice(0, -1);
            }
            
            return word;
        }
    }
    
    // 简化的词频分析器  
    class SimpleWordFreqAnalyzer {
        constructor() {
            this.stemmer = new SimpleWordStemmer();
            this.wordStats = new Map();
            this.articleContents = new Map();
            this.variantIndex = new Map();
            
            // 停用词
            this.stopWords = new Set([
                'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
                'is', 'are', 'was', 'were', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
                'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that'
            ]);
        }
        
        analyzeArticle(articleId, content, title) {
            console.log('分析文章:', articleId);
            
            const words = this.extractWords(content);
            const wordCounts = new Map();
            
            words.forEach(word => {
                if (this.isValidWord(word)) {
                    const stem = this.stemmer.getStem(word);
                    
                    if (!wordCounts.has(stem)) {
                        wordCounts.set(stem, { totalCount: 0, variants: new Map() });
                    }
                    
                    const data = wordCounts.get(stem);
                    data.totalCount++;
                    
                    const variantCount = data.variants.get(word) || 0;
                    data.variants.set(word, variantCount + 1);
                }
            });
            
            this.updateGlobalStats(articleId, title, content, wordCounts);
            this.articleContents.set(articleId, { content, title, wordCount: words.length });
        }
        
        extractWords(text) {
            if (!text) return [];
            
            return text
                .toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length >= 3)
                .slice(0, 5000); // 限制处理的词数，避免性能问题
        }
        
        isValidWord(word) {
            return word.length >= 3 && 
                   word.length <= 20 && 
                   !this.stopWords.has(word) &&
                   /^[a-zA-Z]+$/.test(word);
        }
        
        updateGlobalStats(articleId, title, content, wordCounts) {
            wordCounts.forEach((data, stem) => {
                if (!this.wordStats.has(stem)) {
                    this.wordStats.set(stem, {
                        totalCount: 0,
                        variants: new Map(),
                        articles: new Map()
                    });
                }
                
                const stats = this.wordStats.get(stem);
                stats.totalCount += data.totalCount;
                
                data.variants.forEach((count, variant) => {
                    const currentCount = stats.variants.get(variant) || 0;
                    stats.variants.set(variant, currentCount + count);
                    
                    if (!this.variantIndex.has(variant)) {
                        this.variantIndex.set(variant, new Set());
                    }
                    this.variantIndex.get(variant).add(articleId);
                });
                
                stats.articles.set(articleId, {
                    count: data.totalCount,
                    title: title,
                    contexts: this.extractContexts(content, stem)
                });
            });
        }
        
        extractContexts(content, baseWord) {
            const sentences = content.split(/[.!?]+/);
            const contexts = [];
            
            for (let i = 0; i < Math.min(sentences.length, 20); i++) {
                const sentence = sentences[i].trim();
                if (sentence && sentence.toLowerCase().includes(baseWord)) {
                    let context = sentence.substring(0, 100);
                    if (sentence.length > 100) context += '...';
                    contexts.push(context);
                    
                    if (contexts.length >= 2) break;
                }
            }
            
            return contexts;
        }
        
        searchWords(query) {
            const results = [];
            const lowerQuery = query.toLowerCase();
            
            this.wordStats.forEach((stats, stem) => {
                let relevance = 0;
                
                if (stem === lowerQuery) relevance = 10;
                else if (stem.startsWith(lowerQuery)) relevance = 8;
                else if (stem.includes(lowerQuery)) relevance = 6;
                
                // 检查变形词
                for (const [variant] of stats.variants) {
                    if (variant === lowerQuery) relevance = Math.max(relevance, 9);
                    else if (variant.startsWith(lowerQuery)) relevance = Math.max(relevance, 7);
                    else if (variant.includes(lowerQuery)) relevance = Math.max(relevance, 5);
                }
                
                if (relevance > 0) {
                    results.push({
                        word: stem,
                        totalCount: stats.totalCount,
                        articleCount: stats.articles.size,
                        variants: Array.from(stats.variants.entries()),
                        relevance: relevance
                    });
                }
            });
            
            return results.sort((a, b) => b.relevance - a.relevance);
        }
        
        searchWordsExact(query) {
            const lowerQuery = query.toLowerCase();
            
            if (!this.variantIndex.has(lowerQuery)) {
                return [];
            }
            
            const matchingArticles = this.variantIndex.get(lowerQuery);
            const articleDetails = [];
            
            matchingArticles.forEach(articleId => {
                const articleContent = this.articleContents.get(articleId);
                if (articleContent) {
                    const count = (articleContent.content.toLowerCase().match(new RegExp(lowerQuery, 'g')) || []).length;
                    
                    articleDetails.push({
                        id: articleId,
                        title: articleContent.title,
                        count: count,
                        contexts: this.extractContexts(articleContent.content, lowerQuery)
                    });
                }
            });
            
            if (articleDetails.length > 0) {
                return [{
                    word: lowerQuery,
                    totalCount: articleDetails.reduce((sum, art) => sum + art.count, 0),
                    articleCount: articleDetails.length,
                    variants: [[lowerQuery, articleDetails.reduce((sum, art) => sum + art.count, 0)]],
                    articles: articleDetails.sort((a, b) => b.count - a.count),
                    isExactMatch: true
                }];
            }
            
            return [];
        }
        
        getWordFrequencyData() {
            const data = [];
            
            this.wordStats.forEach((stats, stem) => {
                data.push({
                    word: stem,
                    totalCount: stats.totalCount,
                    articleCount: stats.articles.size,
                    variants: Array.from(stats.variants.entries()),
                    articles: Array.from(stats.articles.entries()).map(([id, articleData]) => ({
                        id,
                        title: articleData.title,
                        count: articleData.count,
                        contexts: articleData.contexts
                    }))
                });
            });
            
            return data.sort((a, b) => b.totalCount - a.totalCount);
        }
        
        getStatsSummary() {
            const totalUniqueWords = this.wordStats.size;
            let totalOccurrences = 0;
            
            this.wordStats.forEach(stats => {
                totalOccurrences += stats.totalCount;
            });
            
            const totalArticles = this.articleContents.size;
            
            return {
                totalUniqueWords,
                totalWordOccurrences: totalOccurrences,
                totalArticlesAnalyzed: totalArticles,
                averageWordsPerArticle: totalArticles > 0 ? Math.round(totalOccurrences / totalArticles) : 0
            };
        }
        
        calculateSmartArticleDifficulty(articleId) {
            const article = this.articleContents.get(articleId);
            if (!article) {
                return { stars: 3, label: "⭐⭐⭐ 中等", tooltip: "无数据" };
            }
            
            const words = this.extractWords(article.content);
            let difficultyScore = 0;
            let validWords = 0;
            
            words.forEach(word => {
                if (this.isValidWord(word)) {
                    validWords++;
                    const stem = this.stemmer.getStem(word);
                    const stats = this.wordStats.get(stem);
                    
                    if (stats) {
                        // 简化的难度计算：频次越高越简单
                        const frequency = stats.totalCount;
                        if (frequency >= 50) difficultyScore += 1;
                        else if (frequency >= 20) difficultyScore += 2;
                        else if (frequency >= 10) difficultyScore += 3;
                        else if (frequency >= 5) difficultyScore += 4;
                        else difficultyScore += 5;
                    } else {
                        difficultyScore += 5; // 未知词视为困难
                    }
                }
            });
            
            if (validWords === 0) {
                return { stars: 3, label: "⭐⭐⭐ 中等", tooltip: "无可分析词汇" };
            }
            
            const avgDifficulty = difficultyScore / validWords;
            const stars = Math.round(Math.max(1, Math.min(5, avgDifficulty)));
            
            const labels = {
                1: "⭐ 入门级",
                2: "⭐⭐ 简单",
                3: "⭐⭐⭐ 中等", 
                4: "⭐⭐⭐⭐ 困难",
                5: "⭐⭐⭐⭐⭐ 专家级"
            };
            
            return {
                stars: stars,
                label: labels[stars],
                tooltip: `基于${validWords}个词汇的分析`
            };
        }
    }
    
    // 简化的词频管理器
    class SimpleWordFreqManager {
        constructor(navigationState = null) {
            this.analyzer = new SimpleWordFreqAnalyzer();
            this.isInitialized = false;
            this.isInitializing = false;
            this.navigationState = navigationState;
            
            console.log('✅ 简化词频管理器已创建');
            
            // 延迟初始化
            setTimeout(() => {
                this.startInitialization();
            }, 100);
        }
        
        async startInitialization() {
            if (this.isInitializing || this.isInitialized) return;
            
            this.isInitializing = true;
            
            try {
                console.log('🚀 开始分析文章...');
                
                const allChapters = await this.getAllChapters();
                
                if (allChapters.length === 0) {
                    throw new Error('未找到任何文章');
                }
                
                console.log(`📋 找到 ${allChapters.length} 篇文章`);
                
                for (let i = 0; i < allChapters.length; i++) {
                    const chapterId = allChapters[i];
                    
                    try {
                        const articleData = await this.getArticleContent(chapterId);
                        this.analyzer.analyzeArticle(chapterId, articleData.content, articleData.title);
                        
                        // 发送进度事件
                        const progress = Math.round(((i + 1) / allChapters.length) * 100);
                        this.dispatchProgressEvent(progress);
                        
                        // 每5篇文章暂停一下，避免阻塞UI
                        if (i % 5 === 0) {
                            await new Promise(resolve => setTimeout(resolve, 10));
                        }
                        
                    } catch (error) {
                        console.warn(`分析文章 ${chapterId} 失败:`, error.message);
                    }
                }
                
                this.isInitialized = true;
                this.isInitializing = false;
                
                console.log('✅ 词频分析完成');
                
            } catch (error) {
                console.error('❌ 初始化失败:', error);
                this.isInitializing = false;
                throw error;
            }
        }
        
        async getAllChapters() {
            // 尝试从Navigation系统获取
            if (this.navigationState && this.navigationState.chaptersMap) {
                const chapters = Array.from(this.navigationState.chaptersMap.keys());
                if (chapters.length > 0) {
                    return chapters;
                }
            }
            
            if (window.app && window.app.navigation && window.app.navigation.state && window.app.navigation.state.chaptersMap) {
                const chapters = Array.from(window.app.navigation.state.chaptersMap.keys());
                if (chapters.length > 0) {
                    return chapters;
                }
            }
            
            // 尝试从navigation.json获取
            try {
                const response = await fetch('data/navigation.json');
                if (response.ok) {
                    const navData = await response.json();
                    const allChapters = [];
                    
                    navData.forEach(series => {
                        if (series && series.chapters) {
                            series.chapters.forEach(chapter => {
                                if (chapter && chapter.id) {
                                    allChapters.push(chapter.id);
                                }
                            });
                        }
                    });
                    
                    return [...new Set(allChapters)];
                }
            } catch (error) {
                console.warn('从navigation.json获取章节失败:', error);
            }
            
            // 返回演示数据
            return ['demo-article-1', 'demo-article-2', 'demo-article-3'];
        }
        
        async getArticleContent(chapterId) {
            // 尝试从章节文件获取
            try {
                const response = await fetch(`chapters/${chapterId}.html`);
                if (response.ok) {
                    const htmlContent = await response.text();
                    const textContent = this.extractTextFromHTML(htmlContent);
                    const title = this.extractTitleFromHTML(htmlContent) || chapterId;
                    return { content: textContent, title };
                }
            } catch (error) {
                console.warn(`获取章节 ${chapterId} 失败:`, error);
            }
            
            // 返回演示内容
            const demoContent = {
                'demo-article-1': {
                    title: "English Learning Fundamentals",
                    content: "Learning English requires practice and dedication. Students must focus on vocabulary, grammar, pronunciation, and listening skills. Reading comprehension and writing abilities develop through consistent practice. Communication skills improve with regular conversation practice."
                },
                'demo-article-2': {
                    title: "Advanced Grammar Concepts", 
                    content: "Advanced English grammar includes complex sentence structures, conditional statements, and passive voice constructions. Understanding these concepts helps students express sophisticated ideas clearly and accurately."
                },
                'demo-article-3': {
                    title: "Vocabulary Building Strategies",
                    content: "Effective vocabulary building involves systematic learning approaches. Students should focus on word families, contextual usage, and practical applications. Regular review and active usage reinforce memory retention."
                }
            };
            
            return demoContent[chapterId] || { 
                title: chapterId, 
                content: "This is a sample article for demonstration purposes. It contains various English words for analysis." 
            };
        }
        
        extractTextFromHTML(html) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // 移除脚本和样式
                const scripts = doc.querySelectorAll('script, style');
                scripts.forEach(el => el.remove());
                
                return doc.body ? doc.body.textContent || doc.body.innerText || '' : '';
            } catch (error) {
                return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            }
        }
        
        extractTitleFromHTML(html) {
            const titleMatch = html.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i) || 
                             html.match(/<title[^>]*>(.*?)<\/title>/i);
            
            if (titleMatch && titleMatch[1]) {
                return titleMatch[1].replace(/<[^>]*>/g, '').trim();
            }
            
            return null;
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
        
        async waitForReady() {
            const maxWait = 60000;
            const checkInterval = 100;
            let waited = 0;
            
            return new Promise((resolve, reject) => {
                const check = () => {
                    if (this.isInitialized) {
                        resolve(true);
                    } else if (waited >= maxWait) {
                        reject(new Error('初始化超时'));
                    } else {
                        waited += checkInterval;
                        setTimeout(check, checkInterval);
                    }
                };
                check();
            });
        }
        
        // 公共API方法
        getTopWords(limit = 100) {
            const words = this.analyzer.getWordFrequencyData();
            return words.slice(0, limit);
        }
        
        getWordDetails(word) {
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
        }
        
        getArticleDifficulty(articleId) {
            return this.analyzer.calculateSmartArticleDifficulty(articleId);
        }
        
        searchWords(query) {
            return this.analyzer.searchWords(query);
        }
        
        searchWordsExact(query) {
            return this.analyzer.searchWordsExact(query);
        }
        
        getStatsSummary() {
            return this.analyzer.getStatsSummary();
        }
        
        destroy() {
            this.isInitialized = false;
            this.isInitializing = false;
            this.analyzer.wordStats.clear();
            this.analyzer.articleContents.clear();
            this.analyzer.variantIndex.clear();
        }
    }
    
    // 注册到全局
    window.EnglishSite = window.EnglishSite || {};
    window.EnglishSite.WordFrequencyManager = SimpleWordFreqManager;
    window.EnglishSite.SimplifiedWordFrequencyAnalyzer = SimpleWordFreqAnalyzer;
    window.EnglishSite.SimplifiedWordStemmer = SimpleWordStemmer;
    
    console.log('✅ 简化但完整的词频系统加载成功');
    
})();