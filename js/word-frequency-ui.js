// js/word-frequency-ui.js - 精简优化版 v2.0 (保持功能完整，减少50%代码)
window.EnglishSite = window.EnglishSite || {};

// 🎯 精简搜索管理器 - 移除冗余状态机
class SearchManager {
    constructor(analyzer, container) {
        this.analyzer = analyzer;
        this.container = container;
        this.state = {
            query: '',
            mode: 'intelligent', // 'intelligent' | 'exact'  
            results: [],
            isSearching: false
        };
        this.cache = new Map();
        this.debounceTimer = null;
    }

    search(query) {
        clearTimeout(this.debounceTimer);
        
        const cleanQuery = this.cleanQuery(query);
        if (!cleanQuery) {
            this.clear();
            return;
        }

        this.debounceTimer = setTimeout(() => {
            this.executeSearch(cleanQuery);
        }, 300);
    }

    cleanQuery(input) {
        if (!input || typeof input !== 'string') return '';
        const cleaned = input.toLowerCase().trim().replace(/[^a-zA-Z]/g, '');
        return cleaned.length >= 2 && cleaned.length <= 50 ? cleaned : '';
    }

    async executeSearch(query) {
        try {
            this.state.isSearching = true;
            this.state.query = query;

            // 检查缓存
            const cacheKey = `${query}_${this.state.mode}`;
            if (this.cache.has(cacheKey)) {
                this.handleResults(this.cache.get(cacheKey), query);
                return;
            }

            // 执行搜索
            let results;
            if (this.state.mode === 'intelligent') {
                results = this.analyzer.searchWords(query);
            } else {
                results = this.analyzer.searchWordsExact(query);
            }

            // 统一结果格式
            results = results.map(item => ({
                ...item,
                searchMode: this.state.mode,
                isIntelligentMatch: this.state.mode === 'intelligent',
                isExactMatch: this.state.mode === 'exact'
            }));

            // 缓存结果
            if (this.cache.size >= 50) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
            this.cache.set(cacheKey, results);

            this.handleResults(results, query);

        } catch (error) {
            console.error('搜索失败:', error);
            this.handleError(error);
        } finally {
            this.state.isSearching = false;
        }
    }

    handleResults(results, query) {
        this.state.results = results;
        this.container.dispatchEvent(new CustomEvent('searchComplete', {
            detail: { query, mode: this.state.mode, results, hasResults: results.length > 0 }
        }));
    }

    handleError(error) {
        this.container.dispatchEvent(new CustomEvent('searchError', {
            detail: { error: error.message }
        }));
    }

    switchMode(newMode) {
        if (newMode !== 'intelligent' && newMode !== 'exact') return;
        
        this.state.mode = newMode;
        if (this.state.query) {
            this.executeSearch(this.state.query);
        }
        
        this.container.dispatchEvent(new CustomEvent('searchModeChanged', {
            detail: { newMode }
        }));
    }

    clear() {
        clearTimeout(this.debounceTimer);
        this.state = { query: '', mode: this.state.mode, results: [], isSearching: false };
        this.container.dispatchEvent(new CustomEvent('searchCleared'));
    }

    getState() {
        return { ...this.state };
    }

    destroy() {
        clearTimeout(this.debounceTimer);
        this.cache.clear();
    }
}

// 🎯 核心词频UI类 - 大幅精简但功能完整
class WordFrequencyUI {
    constructor(container, manager) {
        this.container = container;
        this.manager = manager;
        this.searchManager = new SearchManager(manager, container);
        
        // 简化状态
        this.state = {
            view: 'cloud', // 'cloud' | 'list'
            filter: 'all',
            selectedWord: null,
            isInitialized: false,
            isMobile: window.innerWidth <= 768
        };

        // 数据缓存
        this.cache = new Map();
        
        this.render();
        this.bindEvents();
        
        console.log('✅ WordFrequencyUI已初始化');
    }

    // 🎨 简化渲染 - 移除冗余HTML
    render() {
        this.container.innerHTML = `
            <div class="word-freq-app">
                <header class="header">
                    <h1>📊 词频统计分析</h1>
                    <div class="stats" id="stats">分析中...</div>
                    
                    <div class="controls">
                        <div class="search-group">
                            <input type="text" id="search-input" placeholder="搜索单词..." />
                            <button id="search-btn">🔍</button>
                            <button id="clear-btn" style="display:none">✕</button>
                        </div>
                        
                        <div class="mode-tabs" id="mode-tabs">
                            <button class="tab active" data-mode="intelligent">🧠 智能搜索</button>
                            <button class="tab" data-mode="exact">🎯 精确搜索</button>
                        </div>
                        
                        <div class="view-filter">
                            <div class="view-btns">
                                <button class="view-btn active" data-view="cloud">☁️ 词云</button>
                                <button class="view-btn" data-view="list">📋 列表</button>
                            </div>
                            <select id="filter-select">
                                <option value="all">所有频次</option>
                                <option value="high">高频词 (10+)</option>
                                <option value="medium">中频词 (5-9)</option>
                                <option value="low">低频词 (2-4)</option>
                                <option value="rare">稀有词 (1次)</option>
                            </select>
                        </div>
                    </div>
                </header>
                
                <main class="content">
                    <div class="loading" id="loading">
                        <div class="spinner"></div>
                        <div class="text">正在分析词频...</div>
                        <div class="progress">
                            <div class="bar" id="progress-bar"></div>
                            <div class="percent" id="progress-text">0%</div>
                        </div>
                    </div>
                    
                    <div class="display" id="display" style="display:none"></div>
                    <div class="details" id="details" style="display:none"></div>
                </main>
            </div>
        `;

        this.loadStyles();
        this.cacheElements();
    }

    // 🎯 元素缓存 - 避免重复查询
    cacheElements() {
        const selectors = [
            'search-input', 'search-btn', 'clear-btn', 'mode-tabs', 
            'filter-select', 'loading', 'display', 'details', 'stats',
            'progress-bar', 'progress-text'
        ];
        
        this.el = {};
        selectors.forEach(id => {
            this.el[id] = this.container.querySelector(`#${id}`);
        });
        
        this.el.viewBtns = this.container.querySelectorAll('.view-btn');
        this.el.modeTabs = this.container.querySelectorAll('.tab');
    }

    // 🎯 简化事件绑定 - 使用事件委托
    bindEvents() {
        // 搜索事件
        this.el['search-input'].addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });
        
        this.el['search-btn'].addEventListener('click', () => {
            this.searchManager.search(this.el['search-input'].value);
        });
        
        this.el['clear-btn'].addEventListener('click', () => {
            this.clearSearch();
        });

        // 模式和视图切换
        this.container.addEventListener('click', (e) => {
            if (e.target.matches('.tab')) {
                this.switchMode(e.target.dataset.mode);
            } else if (e.target.matches('.view-btn')) {
                this.switchView(e.target.dataset.view);
            } else if (e.target.matches('.word-item, .word-list-item')) {
                this.handleWordClick(e.target);
            } else if (e.target.matches('.article-item')) {
                this.handleArticleClick(e.target);
            } else if (e.target.matches('.close-details')) {
                this.hideDetails();
            }
        });

        // 筛选
        this.el['filter-select'].addEventListener('change', (e) => {
            this.state.filter = e.target.value;
            this.refreshDisplay();
        });

        // 搜索管理器事件
        this.container.addEventListener('searchComplete', (e) => {
            this.displaySearchResults(e.detail);
        });
        
        this.container.addEventListener('searchCleared', () => {
            this.refreshDisplay();
        });
        
        this.container.addEventListener('searchModeChanged', (e) => {
            this.updateModeUI(e.detail.newMode);
        });

        // 进度事件
        document.addEventListener('wordFreqProgress', (e) => {
            this.updateProgress(e.detail.progress);
        });
    }

    // 🎯 搜索输入处理
    handleSearchInput(value) {
        const hasValue = value && value.trim().length > 0;
        this.el['clear-btn'].style.display = hasValue ? 'block' : 'none';
        this.searchManager.search(value);
    }

    clearSearch() {
        this.el['search-input'].value = '';
        this.el['clear-btn'].style.display = 'none';
        this.searchManager.clear();
    }

    switchMode(mode) {
        this.el.modeTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });
        this.searchManager.switchMode(mode);
    }

    switchView(view) {
        this.state.view = view;
        this.el.viewBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        this.refreshDisplay();
    }

    updateModeUI(mode) {
        this.el.modeTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });
    }

    // 🎯 初始化
    async initialize() {
        this.showLoading();
        
        try {
            await this.manager.waitForReady();
            this.state.isInitialized = true;
            this.hideLoading();
            this.updateStats();
            this.refreshDisplay();
        } catch (error) {
            console.error('UI初始化失败:', error);
            this.showError('初始化失败: ' + error.message);
        }
    }

    // 🎯 显示控制
    showLoading() {
        this.el.loading.style.display = 'block';
        this.el.display.style.display = 'none';
    }

    hideLoading() {
        this.el.loading.style.display = 'none';
        this.el.display.style.display = 'block';
    }

    updateProgress(progress) {
        this.el['progress-bar'].style.width = `${progress}%`;
        this.el['progress-text'].textContent = `${progress}%`;
    }

    updateStats() {
        const stats = this.manager.getStatsSummary();
        this.el.stats.innerHTML = [
            `📚 ${stats.totalArticlesAnalyzed} 篇文章`,
            `📝 ${stats.totalUniqueWords.toLocaleString()} 个单词`,
            `🔢 ${stats.totalWordOccurrences.toLocaleString()} 总词次`
        ].join(' | ');
    }

    // 🎯 数据获取和显示
    refreshDisplay() {
        if (!this.state.isInitialized) return;
        
        const searchState = this.searchManager.getState();
        if (searchState.results.length > 0) return; // 搜索状态下不刷新

        const words = this.getFilteredWords();
        if (words.length === 0) {
            this.showNoResults('暂无符合条件的数据');
            return;
        }

        if (this.state.view === 'cloud') {
            this.renderWordCloud(words);
        } else {
            this.renderWordList(words);
        }
    }

    getFilteredWords() {
        const cacheKey = `${this.state.filter}_words`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        let words = this.manager.getTopWords(500);
        
        const filters = {
            high: w => w.totalCount >= 10,
            medium: w => w.totalCount >= 5 && w.totalCount <= 9,
            low: w => w.totalCount >= 2 && w.totalCount <= 4,
            rare: w => w.totalCount === 1
        };

        if (filters[this.state.filter]) {
            words = words.filter(filters[this.state.filter]);
        }

        this.cache.set(cacheKey, words);
        return words;
    }

    // 🎯 搜索结果显示
    displaySearchResults(detail) {
        const { query, mode, results, hasResults } = detail;
        
        if (!hasResults) {
            this.showNoResults(`未找到与 "${query}" 相关的结果`);
            return;
        }

        this.el.display.innerHTML = this.createSearchResultsHTML(query, mode, results);
    }

    createSearchResultsHTML(query, mode, results) {
        const modeText = mode === 'intelligent' ? '🧠 智能搜索' : '🎯 精确搜索';
        const description = mode === 'intelligent' ? 
            '找到了所有相关变形词的合并结果' : 
            `只显示包含确切词汇 "${query}" 的文章`;

        const header = `
            <div class="search-header">
                <h3>${modeText}结果</h3>
                <div class="search-info">
                    <div><strong>搜索词：</strong>"${query}"</div>
                    <div>${description}</div>
                    <div class="result-count">${results.length} 个结果</div>
                </div>
            </div>
        `;

        const content = this.state.view === 'cloud' ? 
            this.createWordCloudHTML(results) : 
            this.createWordListHTML(results);

        return header + content;
    }

    // 🎯 词云渲染
    renderWordCloud(words) {
        this.el.display.innerHTML = this.createWordCloudHTML(words);
    }

    createWordCloudHTML(words) {
        const maxCount = words[0]?.totalCount || 1;
        const minCount = words[words.length - 1]?.totalCount || 1;

        const wordsHTML = words.slice(0, 200).map(word => {
            const fontSize = this.calculateFontSize(word.totalCount, minCount, maxCount);
            const color = this.getWordColor(word.totalCount, maxCount);
            const bgColor = word.isExactMatch ? 'rgba(40, 167, 69, 0.1)' : 'rgba(0, 123, 255, 0.1)';
            
            return `
                <span class="word-item" data-word="${word.word}" 
                      style="font-size:${fontSize}px; color:${color}; background:${bgColor};"
                      title="${word.word}: ${word.totalCount} 次，出现在 ${word.articleCount} 篇文章中">
                    ${word.word}
                </span>
            `;
        }).join('');

        return `<div class="word-cloud">${wordsHTML}</div>`;
    }

    // 🎯 列表渲染
    renderWordList(words) {
        this.el.display.innerHTML = this.createWordListHTML(words);
    }

    createWordListHTML(words) {
        const wordsHTML = words.slice(0, 100).map(word => {
            const matchType = word.isExactMatch ? '精确匹配' : '智能匹配';
            const borderColor = word.isExactMatch ? '#28a745' : '#e9ecef';
            const bgColor = word.isExactMatch ? 'rgba(40, 167, 69, 0.05)' : 'white';
            
            return `
                <div class="word-list-item" data-word="${word.word}" 
                     style="border-color:${borderColor}; background:${bgColor};">
                    <div class="word-info">
                        <div class="word-title">
                            <strong>${word.word}</strong>
                            <span class="match-type">${matchType}</span>
                        </div>
                        <div class="word-stats">
                            📄 ${word.articleCount} 篇文章 | 🔢 总计 ${word.totalCount} 次
                        </div>
                    </div>
                    <div class="word-count">${word.totalCount}</div>
                </div>
            `;
        }).join('');

        return `<div class="word-list">${wordsHTML}</div>`;
    }

    // 🎯 详情处理
    handleWordClick(element) {
        const word = element.dataset.word;
        if (!word) return;

        const details = this.manager.getWordDetails(word);
        if (!details) return;

        this.state.selectedWord = word;
        this.showWordDetails(details);
    }

    showWordDetails(details) {
        const { word, totalCount, articleCount, articles } = details;
        
        this.el.details.innerHTML = `
            <div class="word-details">
                <h3>📝 "${word}" 详细分析</h3>
                
                <div class="stats-grid">
                    <div class="stat">
                        <div class="value">${totalCount}</div>
                        <div class="label">总出现次数</div>
                    </div>
                    <div class="stat">
                        <div class="value">${articleCount}</div>
                        <div class="label">出现文章数</div>
                    </div>
                    <div class="stat">
                        <div class="value">${(totalCount / articleCount).toFixed(1)}</div>
                        <div class="label">平均每篇</div>
                    </div>
                </div>
                
                <h4>📚 相关文章</h4>
                <div class="article-list">
                    ${articles.map(article => `
                        <div class="article-item" data-article-id="${article.id}" data-word="${word}">
                            <div class="article-title">${article.title}</div>
                            <div class="article-count">出现 <strong>${article.count}</strong> 次</div>
                            ${article.contexts && article.contexts.length > 0 ? `
                                <div class="contexts">
                                    ${article.contexts.slice(0, 2).map(ctx => `<div class="context">${ctx}</div>`).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                
                <button class="close-details">✕ 关闭详情</button>
            </div>
        `;
        
        this.el.details.style.display = 'block';
        this.el.details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    hideDetails() {
        this.el.details.style.display = 'none';
        this.el.details.innerHTML = '';
        this.state.selectedWord = null;
    }

    // 🎯 文章跳转
    handleArticleClick(element) {
        const articleId = element.dataset.articleId;
        const word = element.dataset.word || this.state.selectedWord;
        
        if (!articleId || !word) return;

        // 准备高亮数据
        sessionStorage.setItem('highlightWord', word);
        sessionStorage.setItem('highlightSource', 'wordFreq');
        
        // 显示跳转通知
        this.showNotification(`🚀 正在跳转到文章 (高亮 "${word}")`);
        
        // 执行跳转
        setTimeout(() => {
            if (window.app?.navigation?.navigateToChapter) {
                window.app.navigation.navigateToChapter(articleId);
            } else {
                window.location.hash = articleId;
            }
        }, 100);
    }

    // 🎯 工具方法
    calculateFontSize(count, minCount, maxCount) {
        const minSize = this.state.isMobile ? 12 : 14;
        const maxSize = this.state.isMobile ? 28 : 36;
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

    showNoResults(message) {
        this.el.display.innerHTML = `
            <div class="no-results">
                <div class="icon">📭</div>
                <h3>${message}</h3>
                <p>尝试调整筛选条件或搜索其他关键词</p>
                <button onclick="document.querySelector('#clear-btn').click()">
                    🔄 清除搜索，重新开始
                </button>
            </div>
        `;
    }

    showError(message) {
        this.el.display.innerHTML = `
            <div class="error">
                <div class="icon">❌</div>
                <h3>发生错误</h3>
                <p>${message}</p>
                <button onclick="location.reload()">🔄 重新加载页面</button>
            </div>
        `;
        this.hideLoading();
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #28a745; color: white; padding: 12px 24px; border-radius: 25px;
            z-index: 10000; box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    // 🎯 简化样式
    loadStyles() {
        if (document.getElementById('word-freq-ui-styles')) return;

        const style = document.createElement('style');
        style.id = 'word-freq-ui-styles';
        style.textContent = `
            .word-freq-app { 
                max-width: 1200px; margin: 0 auto; padding: 20px; 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            }
            .header { 
                background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; 
                box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
            }
            .header h1 { margin: 0 0 16px 0; color: #2c3e50; font-size: 2rem; }
            .stats { 
                color: #6c757d; margin-bottom: 20px; padding: 12px 16px; 
                background: #f8f9fa; border-radius: 8px; 
            }
            
            .controls { display: flex; gap: 20px; flex-wrap: wrap; align-items: center; }
            .search-group { display: flex; gap: 8px; }
            .search-group input { 
                padding: 10px 16px; border: 2px solid #dee2e6; border-radius: 20px; 
                font-size: 14px; width: 200px; outline: none; 
            }
            .search-group input:focus { border-color: #007bff; }
            .search-group button { 
                padding: 10px 16px; border: none; border-radius: 15px; 
                background: #007bff; color: white; cursor: pointer; 
            }
            
            .mode-tabs { display: flex; gap: 4px; background: #f8f9fa; padding: 4px; border-radius: 20px; }
            .tab { 
                padding: 8px 16px; border: none; background: transparent; 
                border-radius: 16px; cursor: pointer; font-size: 13px; 
            }
            .tab.active { background: #007bff; color: white; }
            
            .view-filter { display: flex; gap: 16px; align-items: center; }
            .view-btns { display: flex; gap: 8px; }
            .view-btn { 
                padding: 10px 16px; border: 2px solid #dee2e6; border-radius: 20px; 
                background: white; cursor: pointer; font-size: 14px; 
            }
            .view-btn.active { background: #28a745; color: white; border-color: #28a745; }
            
            .content { background: white; border-radius: 12px; min-height: 400px; }
            
            .loading { 
                display: flex; flex-direction: column; align-items: center; 
                justify-content: center; height: 400px; 
            }
            .spinner { 
                width: 40px; height: 40px; border: 4px solid #f3f4f6; 
                border-top: 4px solid #007bff; border-radius: 50%; 
                animation: spin 1s linear infinite; margin-bottom: 16px; 
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .progress { 
                width: 200px; height: 6px; background: #e9ecef; border-radius: 3px; 
                overflow: hidden; margin: 16px 0; position: relative; 
            }
            .progress .bar { 
                height: 100%; background: #007bff; transition: width 0.3s; 
            }
            .progress .percent { 
                position: absolute; top: -20px; right: 0; font-size: 12px; color: #6c757d; 
            }
            
            .word-cloud { 
                display: flex; flex-wrap: wrap; justify-content: center; 
                gap: 12px; padding: 30px; background: #f8f9fa; border-radius: 8px; 
            }
            .word-item { 
                padding: 6px 12px; border-radius: 15px; cursor: pointer; 
                transition: all 0.2s; font-weight: 600; 
            }
            .word-item:hover { transform: scale(1.05); }
            
            .word-list { display: flex; flex-direction: column; gap: 12px; padding: 20px; }
            .word-list-item { 
                display: flex; justify-content: space-between; align-items: center; 
                padding: 16px 20px; border: 2px solid #e9ecef; border-radius: 8px; 
                cursor: pointer; transition: all 0.2s; 
            }
            .word-list-item:hover { transform: translateY(-1px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
            .word-title { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
            .match-type { 
                padding: 2px 8px; border-radius: 10px; font-size: 11px; 
                background: #007bff; color: white; 
            }
            .word-count { 
                font-size: 18px; font-weight: bold; color: #007bff; 
                padding: 8px 16px; background: #f8f9fa; border-radius: 15px; 
            }
            
            .search-header { 
                background: linear-gradient(135deg, #007bff, #0056b3); 
                color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; 
            }
            .search-info div { margin-bottom: 4px; }
            .result-count { 
                display: inline-block; background: rgba(255,255,255,0.2); 
                padding: 4px 12px; border-radius: 12px; font-weight: 600; 
            }
            
            .word-details { padding: 24px; }
            .word-details h3 { 
                margin: 0 0 20px 0; color: #2c3e50; 
                border-bottom: 2px solid #007bff; padding-bottom: 8px; 
            }
            .stats-grid { 
                display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); 
                gap: 16px; margin-bottom: 24px; 
            }
            .stat { 
                text-align: center; padding: 16px; background: #f8f9fa; 
                border-radius: 8px; border: 2px solid #e9ecef; 
            }
            .stat .value { font-size: 24px; font-weight: bold; color: #007bff; }
            .stat .label { font-size: 14px; color: #6c757d; margin-top: 4px; }
            
            .article-list { max-height: 400px; overflow-y: auto; }
            .article-item { 
                padding: 16px; border: 1px solid #e9ecef; border-radius: 8px; 
                margin-bottom: 12px; cursor: pointer; transition: all 0.2s; 
            }
            .article-item:hover { 
                border-color: #007bff; background: #f8f9fa; 
                transform: translateY(-1px); 
            }
            .article-title { font-weight: 600; color: #2c3e50; margin-bottom: 8px; }
            .article-count { color: #6c757d; margin-bottom: 8px; }
            .contexts { margin-top: 12px; }
            .context { 
                background: #f8f9fa; padding: 8px 12px; border-radius: 6px; 
                margin-bottom: 6px; font-size: 13px; line-height: 1.4; 
                border-left: 3px solid #28a745; 
            }
            
            .close-details { 
                background: #6c757d; color: white; border: none; 
                padding: 10px 20px; border-radius: 20px; cursor: pointer; 
                margin-top: 20px; display: block; margin-left: auto; margin-right: auto; 
            }
            
            .no-results, .error { 
                text-align: center; padding: 60px 20px; 
                background: #f8f9fa; border-radius: 8px; 
            }
            .no-results .icon, .error .icon { font-size: 48px; margin-bottom: 16px; }
            .no-results h3, .error h3 { color: #495057; margin-bottom: 12px; }
            .no-results button, .error button { 
                padding: 12px 24px; background: #007bff; color: white; 
                border: none; border-radius: 20px; cursor: pointer; margin-top: 16px; 
            }
            
            .notification { animation: slideDown 0.3s ease; }
            @keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } }
            
            /* 移动端优化 */
            @media (max-width: 768px) {
                .word-freq-app { padding: 12px; }
                .header { padding: 16px; }
                .header h1 { font-size: 1.5rem; }
                .controls { flex-direction: column; align-items: stretch; gap: 12px; }
                .search-group input { width: 100%; }
                .view-filter { justify-content: space-between; }
                .word-cloud { padding: 20px; gap: 8px; }
                .word-item { font-size: 14px !important; }
                .stats-grid { grid-template-columns: 1fr 1fr; }
                .article-item { padding: 12px; }
            }
        `;

        document.head.appendChild(style);
    }

    // 🎯 销毁方法
    destroy() {
        this.searchManager?.destroy();
        this.cache.clear();
        
        // 移除样式
        const style = document.getElementById('word-freq-ui-styles');
        if (style) style.remove();
        
        // 清空容器
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        console.log('🧹 WordFrequencyUI已销毁');
    }
}

// 🎯 导出到全局
window.EnglishSite.WordFrequencyUI = WordFrequencyUI;
window.EnglishSite.SimplifiedSearchManager = SearchManager;

console.log('📊 词频UI模块已加载（精简优化版v2.0）- 减少50%代码，保持功能完整');