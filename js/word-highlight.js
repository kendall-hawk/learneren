// js/word-highlight.js - 简化版（保留所有功能）
window.EnglishSite = window.EnglishSite || {};

class WordHighlighter {
    constructor() {
        this.highlightClass = 'word-highlight';
        this.currentClass = 'word-highlight-current';
        this.currentHighlights = [];
        this.currentIndex = 0;
        this.controlsElement = null;
        this.keydownHandler = null;
        this.highlightWord = null;
        this.initialized = false;
        
        if (this.isWordFrequencyPage()) return;
        
        this.init();
    }
    
    init() {
        if (this.initialized) return;
        this.initialized = true;
        
        this.addHighlightStyles();
        this.checkForHighlightData();
    }
    
    isWordFrequencyPage() {
        const url = window.location.href;
        const title = document.title;
        return url.includes('word-frequency') || title.includes('词频');
    }
    
    checkForHighlightData() {
        let attempts = 0;
        const maxAttempts = 5;
        
        const checkData = () => {
            attempts++;
            
            const word = sessionStorage.getItem('highlightWord');
            const source = sessionStorage.getItem('highlightSource');
            const variants = sessionStorage.getItem('highlightVariants');
            
            if (word && word !== 'null' && word.trim() !== '') {
                this.executeHighlight(word.trim(), source, variants);
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(checkData, 200);
            } else {
                this.cleanupSessionStorage();
            }
        };
        
        setTimeout(checkData, 100);
    }
    
    executeHighlight(word, source, storedVariants) {
        this.highlightWord = word;
        this.cleanupSessionStorage();
        
        // 检查内容区域
        const contentArea = this.findContentArea();
        if (!contentArea || contentArea.textContent.trim().length < 100) {
            this.showFailNotification(word, '页面内容不足');
            return;
        }
        
        // 清理现有高亮
        this.clearHighlights();
        
        // 检查是否已存在高亮
        const existingCount = this.countExistingHighlights(word);
        if (existingCount > 0) {
            this.currentHighlights = document.querySelectorAll(`.${this.highlightClass}[data-word="${word}"]`);
            this.showNotification(word, existingCount, source);
            this.showControls();
            this.scrollToFirst();
            return;
        }
        
        // 执行高亮
        const variants = this.getVariants(word, storedVariants);
        const count = this.highlightText(variants);
        
        if (count > 0) {
            this.currentHighlights = document.querySelectorAll(`.${this.highlightClass}[data-word="${word}"]`);
            this.showNotification(word, count, source);
            this.showControls();
            this.scrollToFirst();
        } else {
            this.showFailNotification(word, '在当前页面未找到该单词');
        }
    }
    
    cleanupSessionStorage() {
        ['highlightWord', 'highlightSource', 'highlightVariants'].forEach(key => {
            sessionStorage.removeItem(key);
        });
    }
    
    clearHighlights() {
        document.querySelectorAll(`.${this.highlightClass}`).forEach(element => {
            const parent = element.parentNode;
            if (parent) {
                parent.replaceChild(document.createTextNode(element.textContent), element);
                parent.normalize();
            }
        });
        
        this.currentHighlights = [];
        this.currentIndex = 0;
    }
    
    countExistingHighlights(word) {
        return document.querySelectorAll(`.${this.highlightClass}[data-word="${word}"]`).length;
    }
    
    getVariants(word, storedVariants) {
        const variants = [word];
        
        if (storedVariants) {
            try {
                const parsed = JSON.parse(storedVariants);
                if (Array.isArray(parsed)) {
                    const otherVariants = parsed.filter(v => v !== word && v.trim().length > 0);
                    variants.push(...otherVariants);
                    return [...new Set(variants)];
                }
            } catch (e) {
                console.warn('解析变形词失败:', e);
            }
        }
        
        return this.generateBasicVariants(word);
    }
    
    generateBasicVariants(word) {
        const variants = [word];
        const lower = word.toLowerCase();
        const upper = word.toUpperCase();
        
        if (lower !== word) variants.push(lower);
        if (upper !== word) variants.push(upper);
        
        if (lower.length > 3) {
            variants.push(lower + 's', lower + 'ed', lower + 'ing');
            
            if (lower.endsWith('s')) variants.push(lower.slice(0, -1));
            if (lower.endsWith('ed')) variants.push(lower.slice(0, -2));
            if (lower.endsWith('ing')) variants.push(lower.slice(0, -3));
        }
        
        return [...new Set(variants)].filter(v => v && v.length > 1);
    }
    
    highlightText(variants) {
        const contentArea = this.findContentArea();
        if (!contentArea) return 0;
        
        let html = contentArea.innerHTML;
        let totalCount = 0;
        const maxHighlights = 50;
        
        // 预检查匹配数量
        let estimatedMatches = 0;
        variants.forEach(variant => {
            const regex = new RegExp(`\\b${this.escapeRegex(variant)}\\b`, 'gi');
            const matches = html.match(regex);
            if (matches) estimatedMatches += matches.length;
        });
        
        if (estimatedMatches > 200) return 0;
        
        // 按优先级处理变形词
        variants.forEach((variant, index) => {
            if (totalCount >= maxHighlights) return;
            
            const regex = new RegExp(`\\b${this.escapeRegex(variant)}\\b`, 'gi');
            const matches = html.match(regex);
            
            if (matches) {
                const allowedCount = Math.min(
                    matches.length, 
                    maxHighlights - totalCount,
                    index === 0 ? 20 : 10
                );
                
                let replaceCount = 0;
                html = html.replace(regex, (match) => {
                    if (replaceCount < allowedCount) {
                        replaceCount++;
                        totalCount++;
                        return `<span class="${this.highlightClass}" 
                                      data-word="${this.highlightWord}"
                                      title="高亮: ${match}">
                                  ${match}
                                </span>`;
                    }
                    return match;
                });
            }
        });
        
        if (totalCount > 0) {
            contentArea.innerHTML = html;
        }
        
        return totalCount;
    }
    
    findContentArea() {
        const selectors = [
            '#chapter-content',
            '.chapter-content',
            '#main-content', 
            '.main-content',
            'main',
            'article'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim().length > 50) {
                return element;
            }
        }
        
        return document.body;
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    scrollToFirst() {
        if (this.currentHighlights.length > 0) {
            this.currentIndex = 0;
            setTimeout(() => {
                this.currentHighlights[0].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                this.currentHighlights[0].classList.add(this.currentClass);
            }, 300);
        }
    }
    
    showNotification(word, count, source) {
        document.querySelectorAll('[data-highlight-notification]').forEach(el => el.remove());
        
        const notification = document.createElement('div');
        notification.setAttribute('data-highlight-notification', 'true');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: linear-gradient(135deg, #00b894, #00cec9);
            color: white; padding: 15px 20px; border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0, 184, 148, 0.3);
            z-index: 10000; font-size: 14px; max-width: 350px;
        `;
        
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">🎯 高亮成功</div>
            <div style="font-size: 13px;">
                已高亮 <strong>"${word}"</strong> ${count} 处
                ${source === 'wordFreq' ? '<br><small>来自词频分析</small>' : ''}
            </div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }
    
    showFailNotification(word, reason = '在当前页面未找到该单词') {
        document.querySelectorAll('[data-highlight-notification]').forEach(el => el.remove());
        
        const notification = document.createElement('div');
        notification.setAttribute('data-highlight-notification', 'true');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: linear-gradient(135deg, #fab1a0, #e17055);
            color: white; padding: 15px 20px; border-radius: 8px;
            box-shadow: 0 4px 15px rgba(250, 177, 160, 0.3);
            z-index: 10000; font-size: 14px; max-width: 350px;
        `;
        
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">❌ 未找到</div>
            <div style="font-size: 13px;">
                <strong>"${word}"</strong><br>
                <small>${reason}</small>
            </div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }
    
    showControls() {
        if (this.currentHighlights.length === 0) return;
        
        if (this.controlsElement) {
            this.controlsElement.remove();
        }
        
        this.controlsElement = document.createElement('div');
        this.controlsElement.style.cssText = `
            position: fixed; 
            bottom: max(20px, 3vh); 
            right: max(15px, 2vw);
            background: white; 
            border: 1px solid #ddd; 
            border-radius: clamp(8px, 1.5vw, 16px);
            padding: clamp(12px, 2vw, 20px); 
            box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
            z-index: 9999; 
            min-width: clamp(200px, 25vw, 350px);
            max-width: min(400px, 90vw);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: clamp(13px, 1.2vw, 16px);
        `;
        
        this.controlsElement.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: clamp(8px, 1.5vw, 15px);">
                <div style="display: flex; align-items: center; gap: clamp(8px, 1.5vw, 15px);">
                    <strong style="color: #007bff; font-size: clamp(14px, 1.3vw, 18px);">"${this.highlightWord}"</strong>
                    <span style="font-size: clamp(12px, 1.1vw, 16px); color: #666;">
                        <span id="current-pos">1</span>/<span id="total-count">${this.currentHighlights.length}</span>
                    </span>
                </div>
                <button onclick="window.wordHighlighter.hideControls()" 
                        style="border: none; background: none; font-size: clamp(16px, 2vw, 22px); cursor: pointer; line-height: 1;">×</button>
            </div>
            <div style="display: flex; justify-content: center; gap: clamp(6px, 1vw, 12px);">
                <button onclick="window.wordHighlighter.prevHighlight()" 
                        style="padding: clamp(6px, 1.2vw, 10px) clamp(10px, 2vw, 16px); border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer; font-size: clamp(12px, 1.2vw, 16px);">Previous</button>
                <button onclick="window.wordHighlighter.nextHighlight()" 
                        style="padding: clamp(6px, 1.2vw, 10px) clamp(10px, 2vw, 16px); border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer; font-size: clamp(12px, 1.2vw, 16px);">Next</button>
            </div>
        `;
        
        document.body.appendChild(this.controlsElement);
        this.setupKeyboardEvents();
    }
    
    setupKeyboardEvents() {
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
        
        this.keydownHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideControls();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.prevHighlight();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.nextHighlight();
            }
        };
        
        document.addEventListener('keydown', this.keydownHandler);
    }
    
    nextHighlight() {
        if (this.currentHighlights.length === 0) return;
        
        this.currentHighlights[this.currentIndex].classList.remove(this.currentClass);
        this.currentIndex = (this.currentIndex + 1) % this.currentHighlights.length;
        this.jumpToIndex(this.currentIndex);
    }
    
    prevHighlight() {
        if (this.currentHighlights.length === 0) return;
        
        this.currentHighlights[this.currentIndex].classList.remove(this.currentClass);
        this.currentIndex = this.currentIndex <= 0 ? this.currentHighlights.length - 1 : this.currentIndex - 1;
        this.jumpToIndex(this.currentIndex);
    }
    
    jumpToIndex(index) {
        const element = this.currentHighlights[index];
        element.classList.add(this.currentClass);
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        const posEl = document.getElementById('current-pos');
        if (posEl) {
            posEl.textContent = index + 1;
        }
    }
    
    hideControls() {
        if (this.controlsElement) {
            this.controlsElement.remove();
            this.controlsElement = null;
        }
        
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
        
        this.clearHighlights();
    }
    
    addHighlightStyles() {
        if (document.getElementById('word-highlight-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'word-highlight-styles';
        style.textContent = `
            .${this.highlightClass} {
                background: linear-gradient(120deg, #fff3cd 0%, #ffeaa7 50%, #fff3cd 100%) !important;
                padding: 2px 4px !important;
                border-radius: 4px !important;
                border: 1px solid #f39c12 !important;
                font-weight: 600 !important;
                animation: pulse 2s ease-in-out !important;
            }
            .${this.currentClass} {
                background: linear-gradient(120deg, #ff7675 0%, #fd79a8 50%, #ff7675 100%) !important;
                border-color: #e84393 !important;
                transform: scale(1.05) !important;
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // 手动高亮（用于测试）
    manualHighlight(word) {
        if (!word) return;
        
        this.highlightWord = word.trim();
        this.clearHighlights();
        
        const variants = this.generateBasicVariants(word.trim());
        const count = this.highlightText(variants);
        
        if (count > 0) {
            this.currentHighlights = document.querySelectorAll(`.${this.highlightClass}[data-word="${this.highlightWord}"]`);
            this.showNotification(this.highlightWord, count, 'manual');
            this.showControls();
            this.scrollToFirst();
        } else {
            this.showFailNotification(this.highlightWord, '在当前页面未找到该单词');
        }
    }
    
    destroy() {
        this.clearHighlights();
        this.hideControls();
        
        const styleEl = document.getElementById('word-highlight-styles');
        if (styleEl) styleEl.remove();
    }
}

// 初始化函数
function initWordHighlighter() {
    if (window.wordHighlighter) {
        try {
            window.wordHighlighter.destroy();
        } catch (e) {
            console.warn('清理旧实例失败:', e);
        }
        window.wordHighlighter = null;
    }
    
    // 清理现有高亮
    document.querySelectorAll('.word-highlight').forEach(el => {
        try {
            const parent = el.parentNode;
            if (parent) {
                parent.replaceChild(document.createTextNode(el.textContent), el);
            }
        } catch (e) {
            el.remove();
        }
    });
    
    setTimeout(() => {
        window.wordHighlighter = new WordHighlighter();
        
        // 调试工具
        window.testHighlight = (word) => {
            window.wordHighlighter.manualHighlight(word);
        };
    }, 200);
}

// 绑定初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWordHighlighter, { once: true });
} else {
    setTimeout(initWordHighlighter, 300);
}

// 导出
window.EnglishSite.WordHighlighter = WordHighlighter;

window.highlightWordInPage = function(word) {
    if (window.wordHighlighter) {
        window.wordHighlighter.manualHighlight(word);
    } else {
        sessionStorage.setItem('highlightWord', word);
        sessionStorage.setItem('highlightSource', 'manual');
    }
};

console.log('🎯 单词高亮系统已加载（简化版）');
