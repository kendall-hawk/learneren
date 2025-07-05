// js/navigation.js - 增强版自定义导航系统
window.EnglishSite = window.EnglishSite || {};

/**
 * 🚀 增强版自定义导航系统
 * - 支持位置对齐的子菜单展开
 * - 保持100%兼容性
 * - 主-从菜单结构
 */
class Navigation {
    constructor(navContainer, contentArea, navData, options = {}) {
        this.navContainer = navContainer;
        this.contentArea = contentArea;
        this.navData = navData || [];
        this.options = options;

        // 🎯 自定义导航状态管理
        this.state = {
            // 侧边栏状态
            isOpen: false,
            isMobile: window.innerWidth <= 768,

            // 🔑 自定义导航核心状态
            currentPath: [], // 当前导航路径 [{id, title, level, data}, ...]
            currentLevel: 0, // 当前显示层级
            navigationStack: [], // 导航栈，支持任意深度

            // 🆕 增强功能状态
            activeCategory: null, // 当前激活的主分类
            submenuVisible: false, // 子菜单显示状态
            submenuPosition: null, // 子菜单位置信息

            // DOM和数据缓存
            elements: {},
            linksMap: new Map(),
            chaptersMap: new Map(),
            navigationTree: null, // 🔑 自动解析的导航树

            // 兼容性状态
            activeLink: null,
            hasInitialContent: false,
            isMainPage: false
        };

        this.config = window.EnglishSite.ConfigManager?.createModuleConfig('navigation', {
            siteTitle: options.siteTitle || 'Learner',
            debug: true,
            animationDuration: 250,
            autoLoadDefaultContent: true,
            defaultContentType: 'all-articles',
            // 🔑 自定义导航配置
            maxDepth: 10,
            autoDetectStructure: true,
            supportDynamicLoading: true,
            // 🆕 增强功能配置
            submenuAnimationDuration: 300, // 子菜单动画时长
            submenuOffset: 10, // 子菜单偏移量
            enablePositionAlignment: true, // 启用位置对齐
            ...options
        }) || {
            siteTitle: options.siteTitle || 'Learner',
            debug: true,
            animationDuration: 250,
            autoLoadDefaultContent: true,
            defaultContentType: 'all-articles',
            maxDepth: 10,
            autoDetectStructure: true,
            supportDynamicLoading: true,
            submenuAnimationDuration: 300,
            submenuOffset: 10,
            enablePositionAlignment: true,
            ...options
        };

        this.cache = window.EnglishSite.CacheManager?.createCache('navigation', {
            maxSize: 50,
            ttl: 300000,
            strategy: 'lru'
        }) || new Map();

        this.initPromise = this.initialize();
    }

    // === 🚀 核心初始化 ===
    async initialize() {
        try {
            console.log('[Navigation] 🚀 开始初始化增强版导航...');

            if (window.EnglishSite.coreToolsReady) {
                await window.EnglishSite.coreToolsReady;
            }

            this.validateRequiredElements();
            this.createSidebarStructure();

            // 🔑 自定义导航核心：自动解析JSON结构
            this.parseNavigationStructure();
            this.buildChaptersMapping();

            this.setupEventListeners();
            this.renderCurrentLevel();
            this.ensureCorrectInitialState();

            // 确保兼容性
            await this.ensureInitialContentDisplay();

            console.log('[Navigation] ✅ 增强版导航初始化完成');
            console.log('[Navigation] 📊 导航树:', this.state.navigationTree);
            console.log('[Navigation] 📚 章节映射:', this.state.chaptersMap.size);

        } catch (error) {
            console.error('[Navigation] ❌ 初始化失败:', error);
            this.handleInitializationError(error);
            throw error;
        }
    }

    // === 🔑 自定义导航核心：自动解析任意JSON结构 ===
    parseNavigationStructure() {
        this.state.navigationTree = this.buildNavigationTree(this.navData, 0);
        console.log('[Navigation] 🌳 导航结构解析完成');
    }

    // 🔑 递归构建导航树（支持任意嵌套）
    buildNavigationTree(items, level) {
        if (!Array.isArray(items)) return [];

        return items.map(item => {
            const node = {
                // 基础信息
                id: item.seriesId || item.id || this.generateId(),
                title: item.series || item.title || 'Untitled',
                level: level,

                // 原始数据
                originalData: item,

                // 🔑 自动检测节点类型
                type: this.detectNodeType(item),

                // 🔑 自动解析子节点
                children: [],
                chapters: [],

                // 扩展属性
                url: item.url,
                description: item.description,
                thumbnail: item.thumbnail,
                icon: item.icon,
                openInNewTab: item.openInNewTab,

                // 🔑 自定义属性支持
                customProps: this.extractCustomProps(item)
            };

            // 🔑 自动解析子结构（支持多种命名方式）
            const childrenSources = [
                item.children,
                item.subItems,
                item.subSeries,
                item.categories,
                item.sections
            ].filter(Boolean);

            if (childrenSources.length > 0) {
                node.children = this.buildNavigationTree(childrenSources[0], level + 1);
            }

            // 🔑 自动解析章节（支持多种命名方式）
            const chapterSources = [
                item.chapters,
                item.articles,
                item.pages,
                item.items,
                item.content
            ].filter(Boolean);

            if (chapterSources.length > 0) {
                node.chapters = this.normalizeChapters(chapterSources[0], node.id);
            }

            return node;
        });
    }

    // 🔑 自动检测节点类型（增强版）
    detectNodeType(item) {
        // 明确指定的类型
        if (item.type) return item.type;

        // 自动推断
        if (item.url && item.url.startsWith('http')) return 'external';
        if (item.seriesId === 'tools' || item.category === 'tools') return 'tools';
        if (item.seriesId === 'all-articles') return 'all-articles';

        // 🆕 检测新的类型
        if (item.type === 'category-with-submenu') return 'category-with-submenu';

        // 根据内容推断
        const hasChildren = this.hasAnyChildren(item);
        const hasChapters = this.hasAnyChapters(item);

        if (hasChildren && hasChapters) return 'category-with-content';
        if (hasChildren) return 'category';
        if (hasChapters) return 'series';

        return 'page';
    }

    hasAnyChildren(item) {
        return !!(item.children || item.subItems || item.subSeries ||
            item.categories || item.sections);
    }

    hasAnyChapters(item) {
        return !!(item.chapters || item.articles || item.pages ||
            item.items || item.content);
    }

    normalizeChapters(chapters, parentId) {
        if (!Array.isArray(chapters)) return [];

        return chapters.map(chapter => ({
            ...chapter,
            id: chapter.id || this.generateId(),
            title: chapter.title || 'Untitled Chapter',
            seriesId: parentId,
            type: chapter.type || 'chapter'
        }));
    }

    extractCustomProps(item) {
        const standardProps = new Set([
            'id', 'seriesId', 'title', 'series', 'children', 'chapters',
            'type', 'url', 'description', 'thumbnail', 'icon', 'openInNewTab',
            'subItems', 'subSeries', 'categories', 'sections',
            'articles', 'pages', 'items', 'content'
        ]);

        const customProps = {};
        Object.keys(item).forEach(key => {
            if (!standardProps.has(key)) {
                customProps[key] = item[key];
            }
        });

        return customProps;
    }

    buildChaptersMapping() {
        this.state.chaptersMap.clear();
        this.walkNavigationTree(this.state.navigationTree, (node) => {
            if (node.chapters && node.chapters.length > 0) {
                node.chapters.forEach(chapter => {
                    const chapterWithMeta = {
                        ...chapter,
                        seriesId: node.id,
                        seriesTitle: node.title,
                        parentNode: node
                    };
                    this.state.chaptersMap.set(chapter.id, chapterWithMeta);
                });
            }
        });

        console.log(`[Navigation] 📚 构建章节映射: ${this.state.chaptersMap.size} 个章节`);
    }

    walkNavigationTree(nodes, callback) {
        if (!Array.isArray(nodes)) return;

        nodes.forEach(node => {
            callback(node);
            if (node.children && node.children.length > 0) {
                this.walkNavigationTree(node.children, callback);
            }
        });
    }

    // === 🎨 渲染系统 ===

    renderCurrentLevel() {
        const currentNodes = this.getCurrentLevelNodes();
        this.renderBreadcrumb();
        this.renderNavigationLevel(currentNodes, this.state.elements.mainContent);
        this.hideSubmenu();
    }

    getCurrentLevelNodes() {
        if (this.state.currentPath.length === 0) {
            return this.state.navigationTree;
        }

        const currentParent = this.state.currentPath[this.state.currentPath.length - 1];
        return currentParent.data.children || [];
    }

    renderBreadcrumb() {
        const breadcrumbEl = this.state.elements.breadcrumb;
        if (!breadcrumbEl) return;

        if (this.state.currentPath.length === 0) {
            breadcrumbEl.style.display = 'none';
            return;
        }

        breadcrumbEl.style.display = 'block';
        const pathHtml = this.state.currentPath
            .map((pathItem, index) => {
                const isLast = index === this.state.currentPath.length - 1;
                if (isLast) {
                    return `<span class="breadcrumb-current">${pathItem.title}</span>`;
                } else {
                    return `<a href="#" class="breadcrumb-link" data-action="breadcrumb-link" data-level="${pathItem.level}" data-id="${pathItem.id}">${pathItem.title}</a>`;
                }
            })
            .join('<span class="breadcrumb-separator"> > </span>');

        breadcrumbEl.innerHTML = `
            <div class="breadcrumb-container">
                <button class="breadcrumb-back" data-action="breadcrumb-back" aria-label="返回上级">‹</button>
                <div class="breadcrumb-path">${pathHtml}</div>
            </div>
        `;
    }

    renderNavigationLevel(nodes, container) {
        if (!container || !nodes) {
            console.warn('[Navigation] ⚠️ 渲染失败：容器或节点为空', {
                container,
                nodes
            });
            return;
        }

        console.log('[Navigation] 📝 渲染导航层级:', nodes.length, '个节点');

        const fragment = document.createDocumentFragment();

        nodes.forEach(node => {
            const element = this.createNavigationItem(node);
            fragment.appendChild(element);
            this.state.linksMap.set(node.id, element);
        });

        container.innerHTML = '';
        container.appendChild(fragment);
    }

    createNavigationItem(node) {
        const hasChildren = node.children && node.children.length > 0;
        const hasChapters = node.chapters && node.chapters.length > 0;
        const isExpandable = hasChildren || hasChapters;

        const element = document.createElement('div');
        element.className = this.getItemClasses(node, isExpandable);
        element.setAttribute('data-id', node.id);
        element.setAttribute('data-level', node.level);
        element.setAttribute('data-type', node.type);
        element.setAttribute('data-action', 'nav-item');

        const iconHtml = node.icon ? `<span class="nav-icon">${node.icon}</span>` : '';

        // 🆕 为主分类添加特殊标识
        const submenuIndicator = (node.type === 'category-with-submenu' ||
                (hasChildren && node.level === 0)) ?
            '<span class="submenu-arrow">></span>' : '';

        element.innerHTML = `
            ${iconHtml}
            <span class="nav-title">${node.title}</span>
            ${isExpandable ? '<span class="expand-arrow">></span>' : ''}
            ${submenuIndicator}
        `;

        return element;
    }

    getItemClasses(node, isExpandable) {
        const classes = ['nav-item', `level-${node.level}`];

        if (isExpandable) {
            classes.push('expandable');
        } else {
            classes.push('clickable');
        }

        // 🆕 新增类型的样式类
        if (node.type === 'category-with-submenu') {
            classes.push('category-with-submenu');
        }

        if (node.type === 'tool' || node.type === 'tools') {
            classes.push('tools-item');
        }
        if (node.type === 'external') {
            classes.push('external-item');
        }
        if (node.type === 'all-articles') {
            classes.push('all-articles-item');
        }

        return classes.join(' ');
    }

    // 🔧 渲染章节列表（兼容原有功能）
    renderChaptersList(chapters, container) {
        if (!container) {
            console.error('[Navigation] ❌ 子菜单容器不存在！无法渲染章节列表');
            return;
        }

        if (!chapters || chapters.length === 0) {
            console.warn('[Navigation] ⚠️ 没有章节数据');
            return;
        }

        console.log('[Navigation] 📚 渲染章节列表:', chapters.length, '个章节');

        const fragment = document.createDocumentFragment();

        chapters.forEach(chapter => {
            const element = document.createElement('div');
            element.className = `nav-item level-${this.state.currentLevel + 1} clickable chapter-item`;
            element.setAttribute('data-id', chapter.id);
            element.setAttribute('data-action', 'navigate-chapter');

            const iconHtml = chapter.icon ? `<span class="nav-icon">${chapter.icon}</span>` : '';
            element.innerHTML = `${iconHtml}<span class="nav-title">${chapter.title}</span>`;

            fragment.appendChild(element);
        });

        container.innerHTML = '';
        container.appendChild(fragment);

        console.log('[Navigation] ✅ 章节列表渲染完成');
    }

    // 🆕 渲染子分类菜单（新功能）
    renderSubcategoryMenu(children, container) {
        if (!container) {
            console.error('[Navigation] ❌ 子菜单容器不存在！无法渲染子分类菜单');
            return;
        }

        if (!children || children.length === 0) {
            console.warn('[Navigation] ⚠️ 没有子分类数据');
            return;
        }

        console.log('[Navigation] 📂 渲染子分类菜单:', children.length, '个子分类');

        const fragment = document.createDocumentFragment();

        children.forEach(child => {
            const element = document.createElement('div');
            element.className = `nav-item level-${child.level} clickable subcategory-item`;
            element.setAttribute('data-id', child.id);
            element.setAttribute('data-action', 'nav-item');
            element.setAttribute('data-type', child.type);

            const iconHtml = child.icon ? `<span class="nav-icon">${child.icon}</span>` : '';
            const description = child.description ? `<span class="nav-description">${child.description}</span>` : '';

            element.innerHTML = `
                ${iconHtml}
                <div class="nav-content">
                    <span class="nav-title">${child.title}</span>
                    ${description}
                </div>
            `;

            fragment.appendChild(element);
        });

        container.innerHTML = '';
        container.appendChild(fragment);

        console.log('[Navigation] ✅ 子分类菜单渲染完成');
    }

    // === 🎯 核心导航逻辑（增强版） ===

    handleNavItemClick(itemId, clickedElement = null) {
        const node = this.findNodeById(itemId);
        if (!node) {
            console.error('[Navigation] ❌ 找不到节点:', itemId);
            return;
        }

        console.log('[Navigation] 🎯 点击节点:', node.title, '类型:', node.type);

        const hasChildren = node.children && node.children.length > 0;
        const hasChapters = node.chapters && node.chapters.length > 0;

        console.log('[Navigation] 📊 节点分析:', {
            hasChildren: hasChildren,
            hasChapters: hasChapters,
            childrenCount: node.children?.length || 0,
            chaptersCount: node.chapters?.length || 0,
            nodeType: node.type
        });

        // 🆕 增强逻辑：处理新的节点类型
        if (node.type === 'category-with-submenu' && hasChildren) {
            console.log('[Navigation] 🔄 显示对齐子菜单');
            this.showAlignedSubmenu(node, clickedElement);
        } else if (hasChildren && node.level === 0) {
            console.log('[Navigation] 📁 顶级分类 - 显示对齐子菜单');
            this.showAlignedSubmenu(node, clickedElement);
        } else if (hasChildren) {
            console.log('[Navigation] 📁 进入子级别');
            this.navigateToLevel(node);
        } else if (node.type === 'series' && hasChapters) {
            console.log('[Navigation] 📚 系列类型 - 在主内容区显示章节');
            this.handleDirectNavigation(node);
        } else if (hasChapters) {
            console.log('[Navigation] 📚 显示章节列表（侧边栏）');
            this.showChaptersList(node);
        } else {
            console.log('[Navigation] 🔗 直接导航');
            this.handleDirectNavigation(node);
        }
    }
    // 🆕 核心新功能：显示位置对齐的子菜单
    showAlignedSubmenu(node, clickedElement) {
        console.log('[Navigation] 🚀 显示位置对齐的子菜单:', node.title);

        // 验证子菜单容器
        const submenuContent = this.state.elements.submenuContent;
        if (!submenuContent) {
            console.error('[Navigation] ❌ 子菜单内容容器不存在！');
            this.emergencyFixSubmenuContainer();
            return;
        }

        // 🔑 计算位置信息
        let position = null;
        if (clickedElement && this.config.enablePositionAlignment) {
            position = this.calculateSubmenuPosition(clickedElement);
        }

        // 更新状态
        this.state.activeCategory = node.id;
        this.state.submenuVisible = true;
        this.state.submenuPosition = position;

        // 渲染子分类菜单
        this.renderSubcategoryMenu(node.children, submenuContent);

        // 显示子菜单并应用位置
        this.showSubmenuWithPosition(position);

        // 更新活跃状态
        this.updateActiveState(node.id);

        console.log('[Navigation] ✅ 位置对齐子菜单显示完成', {
            position
        });
    }

    // 🆕 计算子菜单位置
    calculateSubmenuPosition(clickedElement) {
        if (!clickedElement) return null;

        try {
            const rect = clickedElement.getBoundingClientRect();
            const sidebar = this.state.elements.container.getBoundingClientRect();

            // 计算相对于侧边栏的位置
            const relativeTop = rect.top - sidebar.top;
            const elementHeight = rect.height;

            const position = {
                top: relativeTop,
                height: elementHeight,
                offset: this.config.submenuOffset
            };

            console.log('[Navigation] 📐 计算位置:', position);
            return position;

        } catch (error) {
            console.warn('[Navigation] ⚠️ 位置计算失败:', error);
            return null;
        }
    }

    // 🆕 带位置的子菜单显示
    showSubmenuWithPosition(position) {
        console.log('[Navigation] 👁️ 显示带位置的子菜单');

        const submenu = this.state.elements.submenuPanel;
        if (!submenu) {
            console.error('[Navigation] ❌ 子菜单面板不存在！');
            return;
        }

        // 基础显示样式
        submenu.classList.remove('hidden');
        submenu.classList.add('expanded', 'aligned-submenu');
        submenu.style.display = 'block';
        submenu.style.visibility = 'visible';
        submenu.style.opacity = '1';
        submenu.style.transform = 'translateX(0)';
        submenu.style.pointerEvents = 'auto';

        // 🔑 应用位置对齐
        if (position && this.config.enablePositionAlignment) {
            submenu.style.top = `${position.top + position.offset}px`;
            submenu.style.paddingTop = '0';

            // 添加位置对齐的样式类
            submenu.classList.add('position-aligned');

            console.log('[Navigation] 📍 应用位置对齐:', `top: ${position.top + position.offset}px`);
        } else {
            // 默认位置
            submenu.style.top = '0';
            submenu.style.paddingTop = '20px';
            submenu.classList.remove('position-aligned');
        }

        console.log('[Navigation] ✅ 带位置的子菜单已显示');
    }

    navigateToLevel(node) {
        this.state.currentPath.push({
            id: node.id,
            title: node.title,
            level: node.level,
            data: node
        });

        this.state.currentLevel = node.level + 1;

        this.renderBreadcrumb();
        this.renderNavigationLevel(node.children, this.state.elements.mainContent);
        this.updateActiveState(node.id);

        console.log('[Navigation] 📁 导航到层级:', this.state.currentPath.map(p => p.title).join(' > '));
    }

    // 🔧 保持原有的章节列表显示功能
    showChaptersList(node) {
        console.log('[Navigation] 🚀 开始显示章节列表:', node.title);

        const submenuContent = this.state.elements.submenuContent;
        if (!submenuContent) {
            console.error('[Navigation] ❌ 子菜单内容容器不存在！');
            this.emergencyFixSubmenuContainer();
            return;
        }

        this.state.currentPath.push({
            id: node.id,
            title: node.title,
            level: node.level,
            data: node
        });

        this.state.currentLevel = node.level + 1;

        this.renderBreadcrumb();
        this.renderChaptersList(node.chapters, submenuContent);
        this.showSubmenu();
        this.updateActiveState(node.id);

        console.log('[Navigation] ✅ 章节列表显示完成');
    }

    handleDirectNavigation(node) {
        this.close();
        this.state.isMainPage = false;

        switch (node.type) {
            case 'external':
                this.handleExternalNavigation(node);
                break;
            case 'all-articles':
                this.handleAllArticlesNavigation(node);
                break;
            case 'tools':
                this.handleToolsNavigation(node);
                break;
            case 'tool':
                this.handleSingleToolNavigation(node);
                break;
            case 'chapter':
                this.navigateToChapter(node.id);
                break;
            case 'series':
                this.handleSeriesNavigation(node);
                break;
            default:
                this.handleCustomNavigation(node);
                break;
        }

        this.setActiveLink(node.id);
    }

    handleExternalNavigation(node) {
        const openInNew = node.openInNewTab !== false;
        if (openInNew) {
            window.open(node.url, '_blank', 'noopener,noreferrer');
            this.displayExternalLinkMessage(node);
        } else {
            window.location.href = node.url;
        }
    }

    handleAllArticlesNavigation(node) {
        this.state.isMainPage = true;
        const allChapters = this.getAllChapters();
        this.dispatchEvent('allArticlesRequested', {
            chapters: allChapters
        });
        this.updateTitle('所有文章');
    }

    handleToolsNavigation(node) {
        this.dispatchEvent('toolsRequested');
        this.updateTitle('学习工具');
    }

    handleSingleToolNavigation(node) {
        console.log('[Navigation] 🔧 处理工具导航:', node.title, node);

        // 🔧 修复：新增基于action属性的智能处理
        if (node.action) {
            console.log('[Navigation] 📋 检测到action属性:', node.action);

            switch (node.action) {
                case 'wordFrequency':
                    this.handleWordFrequencyTool(node);
                    return;
                default:
                    console.log('[Navigation] 🔄 使用自定义action处理:', node.action);
                    this.handleCustomActionTool(node);
                    return;
            }
        }

        // 🔧 保持原有的URL处理逻辑
        if (node.url) {
            if (node.url.startsWith('http')) {
                window.open(node.url, '_blank', 'noopener,noreferrer');
                this.displayToolRedirectMessage(node.title, node.url);
            } else {
                window.location.href = node.url;
            }

            this.updateTitle(node.title);
            this.dispatchEvent('toolPageLoaded', {
                toolId: node.id,
                toolUrl: node.url,
                chapterData: node
            });
            return;
        }

        console.warn('[Navigation] ⚠️ 工具配置不完整:', node.id);
    }

    handleSeriesNavigation(node) {
        this.dispatchEvent('seriesSelected', {
            seriesId: node.id,
            chapters: node.chapters,
            item: node
        });
        this.updateTitle(`系列: ${node.title}`);
    }

    handleCustomNavigation(node) {
        if (node.customProps.customAction) {
            this.dispatchEvent('customNavigation', {
                action: node.customProps.customAction,
                node: node
            });
        } else if (node.url) {
            window.location.href = node.url;
        } else if (node.chapters && node.chapters.length > 0) {
            this.handleSeriesNavigation(node);
        } else {
            this.dispatchEvent('navigationItemSelected', {
                item: node
            });
        }

        this.updateTitle(node.title);
    }

    navigateBack() {
        if (this.state.currentPath.length === 0) {
            this.close();
            return;
        }

        this.state.currentPath.pop();
        this.state.currentLevel--;

        if (this.state.currentPath.length === 0) {
            this.renderCurrentLevel();
        } else {
            const parentNode = this.state.currentPath[this.state.currentPath.length - 1];

            this.renderBreadcrumb();

            if (parentNode.data.children && parentNode.data.children.length > 0) {
                this.renderNavigationLevel(parentNode.data.children, this.state.elements.mainContent);
            } else if (parentNode.data.chapters && parentNode.data.chapters.length > 0) {
                this.renderChaptersList(parentNode.data.chapters, this.state.elements.submenuContent);
                this.showSubmenu();
            }
        }
    }

    navigateToSpecificLevel(level, nodeId) {
        const targetLevel = parseInt(level);

        this.state.currentPath = this.state.currentPath.filter(p => p.level <= targetLevel);
        this.state.currentLevel = targetLevel + 1;

        if (this.state.currentPath.length === 0) {
            this.renderCurrentLevel();
        } else {
            const targetNode = this.findNodeById(nodeId);
            if (targetNode) {
                this.navigateToLevel(targetNode);
            }
        }
    }

    // === 🔧 工具函数 ===

    findNodeById(id, nodes = null) {
        nodes = nodes || this.state.navigationTree;

        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children && node.children.length > 0) {
                const found = this.findNodeById(id, node.children);
                if (found) return found;
            }
        }
        return null;
    }

    generateId() {
        return 'nav_' + Math.random().toString(36).substr(2, 9);
    }

    // === 🔧 DOM和UI控制（增强版） ===

    validateRequiredElements() {
        if (!this.navContainer || !this.contentArea) {
            throw new Error('Navigation: 缺少必需的DOM元素');
        }
    }

    createSidebarStructure() {
        console.log('[Navigation] 🏗️ 创建增强版侧边栏结构');
        this.hideOriginalNavigation();
        this.createHeaderElements();
        this.createSidebarContainer();
        this.createOverlay();
        this.cacheElements();
    }

    hideOriginalNavigation() {
        const originalNav = document.querySelector('.main-navigation');
        if (originalNav) {
            originalNav.style.display = 'none';
            originalNav.setAttribute('data-backup', 'true');
        }
    }

    createHeaderElements() {
        let header = document.querySelector('.site-header');
        if (!header) {
            header = document.createElement('header');
            header.className = 'site-header';
            header.innerHTML = '<div class="brand-logo">Learner</div>';
            document.body.insertBefore(header, document.body.firstChild);
        }

        if (!header.querySelector('.nav-toggle')) {
            const hamburger = document.createElement('button');
            hamburger.className = 'nav-toggle';
            hamburger.setAttribute('aria-label', '打开导航菜单');
            hamburger.setAttribute('data-action', 'toggle-sidebar');
            hamburger.innerHTML = `
                <span class="hamburger-icon">
                    <span></span><span></span><span></span>
                </span>
            `;
            header.insertBefore(hamburger, header.firstChild);
        }
    }

    // 🔧 创建增强版侧边栏容器
    createSidebarContainer() {
        console.log('[Navigation] 📦 创建增强版侧边栏容器...');

        // 清除旧的侧边栏
        const oldSidebar = document.querySelector('.sidebar-container');
        if (oldSidebar) {
            console.log('[Navigation] 🗑️ 移除旧侧边栏');
            oldSidebar.remove();
        }

        // 🔧 创建增强版侧边栏结构

        // 1. 创建侧边栏容器
        const sidebarContainer = document.createElement('div');
        sidebarContainer.className = 'sidebar-container enhanced-sidebar';
        sidebarContainer.setAttribute('data-state', 'closed');
        console.log('[Navigation] ✅ 创建增强版侧边栏容器');

        // 2. 创建主导航面板
        const sidebarMain = document.createElement('nav');
        sidebarMain.className = 'sidebar-main';
        console.log('[Navigation] ✅ 创建主导航面板');

        // 3. 创建面包屑导航
        const breadcrumb = document.createElement('div');
        breadcrumb.className = 'nav-breadcrumb';
        console.log('[Navigation] ✅ 创建面包屑导航');

        // 4. 创建导航内容区
        const navContent = document.createElement('div');
        navContent.className = 'nav-content';
        console.log('[Navigation] ✅ 创建导航内容区');

        // 5. 组装主导航面板
        sidebarMain.appendChild(breadcrumb);
        sidebarMain.appendChild(navContent);
        console.log('[Navigation] ✅ 组装主导航面板');

        // 6. 🆕 创建增强版子菜单面板
        const submenu = document.createElement('div');
        submenu.className = 'sidebar-submenu enhanced-submenu';
        console.log('[Navigation] ✅ 创建增强版子菜单面板');

        // 7. 🆕 创建增强版子菜单内容区
        const submenuContent = document.createElement('div');
        submenuContent.className = 'submenu-content enhanced-submenu-content';
        console.log('[Navigation] ✅ 创建增强版子菜单内容区');

        // 8. 🆕 创建位置指示器
        const positionIndicator = document.createElement('div');
        positionIndicator.className = 'submenu-position-indicator';
        console.log('[Navigation] ✅ 创建位置指示器');

        // 9. 组装子菜单
        submenu.appendChild(positionIndicator);
        submenu.appendChild(submenuContent);
        console.log('[Navigation] ✅ 组装增强版子菜单');

        // 10. 组装整个侧边栏容器
        sidebarContainer.appendChild(sidebarMain);
        sidebarContainer.appendChild(submenu);
        console.log('[Navigation] ✅ 组装完整增强版侧边栏容器');

        // 11. 添加增强版样式
        this.addEnhancedStyles(sidebarContainer);

        // 12. 添加到页面
        document.body.appendChild(sidebarContainer);
        console.log('[Navigation] ✅ 增强版侧边栏容器添加到页面');

        // 13. 立即验证DOM结构
        const verification = {
            sidebarContainer: !!document.querySelector('.sidebar-container'),
            sidebarMain: !!document.querySelector('.sidebar-main'),
            submenuPanel: !!document.querySelector('.sidebar-submenu'),
            submenuContent: !!document.querySelector('.submenu-content'),
            breadcrumb: !!document.querySelector('.nav-breadcrumb'),
            navContent: !!document.querySelector('.nav-content'),
            positionIndicator: !!document.querySelector('.submenu-position-indicator')
        };

        console.log('[Navigation] 📊 增强版DOM结构验证:', verification);

        const failed = Object.entries(verification).filter(([key, value]) => !value);
        if (failed.length > 0) {
            console.error('[Navigation] ❌ 增强版DOM创建失败:', failed.map(([key]) => key));
            throw new Error(`增强版DOM创建失败: ${failed.map(([key]) => key).join(', ')}`);
        }

        console.log('[Navigation] ✅ 增强版侧边栏容器创建完成');
    }

    // 🆕 添加增强版样式
    addEnhancedStyles(container) {
        const styleId = 'enhanced-navigation-styles';

        // 避免重复添加样式
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* 🎨 增强版导航样式 */
            
            .enhanced-sidebar {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100vh;
                background: transparent;
                z-index: 9999;
                transform: translateX(-100%);
                transition: transform ${this.config.animationDuration}ms ease-in-out;
                display: flex;
            }
            
            .enhanced-sidebar.open {
                transform: translateX(0);
            }
            
            .sidebar-main {
                width: 280px;
                background: #ffffff;
                box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
                height: 100vh;
                overflow-y: auto;
                flex-shrink: 0;
            }
            
            .enhanced-submenu {
                width: 300px;
                background: #f8f9fa;
                box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
                height: 100vh;
                overflow-y: auto;
                transform: translateX(-100%);
                transition: transform ${this.config.submenuAnimationDuration}ms ease-in-out;
                position: relative;
            }
            
            .enhanced-submenu.expanded {
                transform: translateX(0);
            }
            
            .enhanced-submenu.position-aligned {
                /* 位置对齐模式的特殊样式 */
            }
            
            .submenu-position-indicator {
                position: absolute;
                left: -4px;
                width: 4px;
                height: 40px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 0 4px 4px 0;
                opacity: 0;
                transition: opacity ${this.config.submenuAnimationDuration}ms ease-in-out;
            }
            
            .enhanced-submenu.position-aligned .submenu-position-indicator {
                opacity: 1;
            }
            
            .enhanced-submenu-content {
                padding: 20px;
            }
            
            .nav-item.category-with-submenu {
                position: relative;
            }
            
            .nav-item.category-with-submenu::after {
                content: '';
                position: absolute;
                right: 15px;
                top: 50%;
                transform: translateY(-50%);
                width: 0;
                height: 0;
                border-left: 6px solid #667eea;
                border-top: 4px solid transparent;
                border-bottom: 4px solid transparent;
                opacity: 0.7;
            }
            
            .nav-item.category-with-submenu:hover::after {
                opacity: 1;
            }
            
            .nav-item.category-with-submenu.active {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .nav-item.category-with-submenu.active::after {
                border-left-color: white;
            }
            
            .subcategory-item {
                margin-bottom: 10px;
                padding: 15px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                transition: all 0.2s ease;
                cursor: pointer;
            }
            
            .subcategory-item:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            }
            
            .nav-description {
                display: block;
                font-size: 0.85em;
                color: #6c757d;
                margin-top: 4px;
            }
            
            .nav-content {
                display: flex;
                flex-direction: column;
            }
            
            /* 🎯 响应式设计 */
            @media (max-width: 768px) {
                .enhanced-sidebar {
                    width: 100vw;
                }
                
                .sidebar-main {
                    width: 100vw;
                }
                
                .enhanced-submenu {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    z-index: 10;
                }
            }
            
            /* 🎨 动画增强 */
            .nav-item {
                transition: all 0.2s ease;
            }
            
            .nav-item:hover {
                background-color: rgba(102, 126, 234, 0.1);
                border-radius: 4px;
            }
            
            .nav-item.active {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 4px;
            }
        `;

        document.head.appendChild(style);
        console.log('[Navigation] 🎨 增强版样式已添加');
    }

    createOverlay() {
        const oldOverlay = document.querySelector('.sidebar-overlay');
        if (oldOverlay) oldOverlay.remove();

        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay enhanced-overlay';
        overlay.setAttribute('aria-label', '点击关闭导航');
        overlay.setAttribute('data-action', 'close-sidebar');

        // 🆕 增强版覆盖层样式
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9998;
            opacity: 0;
            visibility: hidden;
            transition: all ${this.config.animationDuration}ms ease-in-out;
            pointer-events: none;
        `;

        document.body.appendChild(overlay);
    }

    // 🔧 完全重写：cacheElements方法
    cacheElements() {
        console.log('[Navigation] 🗃️ 缓存增强版DOM元素...');

        this.state.elements = {
            hamburger: document.querySelector('.nav-toggle'),
            container: document.querySelector('.sidebar-container'),
            mainPanel: document.querySelector('.sidebar-main'),
            submenuPanel: document.querySelector('.sidebar-submenu'),
            overlay: document.querySelector('.sidebar-overlay'),
            breadcrumb: document.querySelector('.nav-breadcrumb'),
            mainContent: document.querySelector('.nav-content'),
            submenuContent: document.querySelector('.submenu-content'),
            positionIndicator: document.querySelector('.submenu-position-indicator')
        };

        // 🔧 严格验证每个关键元素
        console.log('[Navigation] 🔗 增强版元素缓存验证:');
        Object.entries(this.state.elements).forEach(([key, element]) => {
            const status = element ? '✅' : '❌';
            console.log(`[Navigation] - ${key}: ${status}`);

            if (!element && ['container', 'mainContent', 'submenuContent'].includes(key)) {
                throw new Error(`关键元素缺失: ${key}`);
            }
        });

        console.log('[Navigation] ✅ 增强版元素缓存完成');
    }

    // 🔧 修复：showSubmenu方法（保持兼容性）
    showSubmenu() {
        console.log('[Navigation] 👁️ 显示子菜单面板（兼容模式）');

        const submenu = this.state.elements.submenuPanel;
        if (!submenu) {
            console.error('[Navigation] ❌ 子菜单面板不存在！');
            return;
        }

        // 兼容原有的显示方式
        submenu.classList.remove('hidden');
        submenu.classList.add('expanded');
        submenu.style.display = 'block';
        submenu.style.visibility = 'visible';
        submenu.style.opacity = '1';
        submenu.style.transform = 'translateX(0)';
        submenu.style.pointerEvents = 'auto';

        // 重置位置（兼容模式不使用位置对齐）
        submenu.style.top = '0';
        submenu.classList.remove('position-aligned');

        console.log('[Navigation] ✅ 子菜单面板已显示（兼容模式）');
    }

    hideSubmenu() {
        const submenu = this.state.elements.submenuPanel;
        if (!submenu) return;

        // 🆕 增强版隐藏动画
        submenu.style.transform = 'translateX(-100%)';
        submenu.style.opacity = '0';

        setTimeout(() => {
            submenu.style.display = 'none';
            submenu.style.visibility = 'hidden';
            submenu.style.pointerEvents = 'none';
            submenu.classList.remove('expanded', 'position-aligned');
            submenu.classList.add('hidden');

            // 清空内容
            if (submenu.querySelector('.submenu-content')) {
                submenu.querySelector('.submenu-content').innerHTML = '';
            }

            // 重置状态
            this.state.submenuVisible = false;
            this.state.activeCategory = null;
            this.state.submenuPosition = null;

        }, this.config.submenuAnimationDuration);
    }

    // 🔧 应急修复：重新创建子菜单容器
    emergencyFixSubmenuContainer() {
        console.log('[Navigation] 🚑 应急修复：重新创建增强版子菜单容器');

        let submenu = document.querySelector('.sidebar-submenu');
        if (!submenu) {
            console.log('[Navigation] 📦 创建增强版子菜单面板');
            submenu = document.createElement('div');
            submenu.className = 'sidebar-submenu enhanced-submenu';

            const sidebarContainer = document.querySelector('.sidebar-container');
            if (sidebarContainer) {
                sidebarContainer.appendChild(submenu);
            } else {
                console.error('[Navigation] ❌ 连侧边栏容器都找不到了！');
                return;
            }
        }

        let submenuContent = submenu.querySelector('.submenu-content');
        if (!submenuContent) {
            console.log('[Navigation] 📦 创建增强版子菜单内容区');
            submenuContent = document.createElement('div');
            submenuContent.className = 'submenu-content enhanced-submenu-content';
            submenu.appendChild(submenuContent);
        }

        let positionIndicator = submenu.querySelector('.submenu-position-indicator');
        if (!positionIndicator) {
            console.log('[Navigation] 📦 创建位置指示器');
            positionIndicator = document.createElement('div');
            positionIndicator.className = 'submenu-position-indicator';
            submenu.insertBefore(positionIndicator, submenuContent);
        }

        // 重新缓存元素
        this.state.elements.submenuPanel = submenu;
        this.state.elements.submenuContent = submenuContent;
        this.state.elements.positionIndicator = positionIndicator;

        console.log('[Navigation] ✅ 增强版应急修复完成');
    }

    setupEventListeners() {
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        window.addEventListener('resize', this.throttle(this.handleResize.bind(this), 250));
        window.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    handleGlobalClick(event) {
        const target = event.target;
    
    // 🔧 临时修复：直接检查词频工具点击
    const wordFreqTool = target.closest('[data-id="word-frequency-tool"]') || 
                        target.closest('.tools-item');
    if (wordFreqTool) {
        console.log('[Navigation] 🔤 直接处理词频工具点击');
        event.preventDefault();
        this.handleWordFrequencyTool({
            id: 'word-frequency-tool',
            title: '词频分析',
            action: 'wordFrequency'
        });
        return;
    }

        const actionElement = target.closest('[data-action]');

        if (!actionElement) {
            this.handleOutsideClick(event);
            return;
        }

        const action = actionElement.dataset.action;
        const id = actionElement.dataset.id;

        event.preventDefault();
        event.stopPropagation();

        console.log('[Navigation] 🖱️ 点击事件:', action, id);

        switch (action) {
            case 'toggle-sidebar':
                this.toggle();
                break;
            case 'close-sidebar':
                this.close();
                break;
            case 'nav-item':
                // 🆕 传递点击元素给处理函数
                this.handleNavItemClick(id, actionElement);
                break;
            case 'navigate-chapter':
                this.navigateToChapter(id);
                this.close();
                break;
            case 'breadcrumb-back':
                this.navigateBack();
                break;
            case 'breadcrumb-link':
                this.navigateToSpecificLevel(actionElement.dataset.level, id);
                break;
        }
    }

    handleOutsideClick(event) {
        if (!this.state.isOpen) return;

        const sidebar = this.state.elements.container;
        const hamburger = this.state.elements.hamburger;
        const overlay = this.state.elements.overlay;

        if (event.target === overlay ||
            (!sidebar.contains(event.target) && !hamburger.contains(event.target))) {
            this.close();
        }
    }

    handleResize() {
        this.state.isMobile = window.innerWidth <= 768;

        // 🆕 响应式处理：移动端重置子菜单位置
        if (this.state.isMobile && this.state.submenuVisible) {
            const submenu = this.state.elements.submenuPanel;
            if (submenu) {
                submenu.style.top = '0';
                submenu.classList.remove('position-aligned');
            }
        }
    }

    handleKeydown(event) {
        if (event.key === 'Escape' && this.state.isOpen) {
            event.preventDefault();
            this.close();
        }
    }

    throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        return function(...args) {
            const currentTime = Date.now();

            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }

    toggle() {
        this.state.isOpen ? this.close() : this.open();
    }

    open() {
        console.log('[Navigation] 🔓 打开增强版侧边栏');
        this.state.isOpen = true;

        const {
            container,
            overlay
        } = this.state.elements;

        container.setAttribute('data-state', 'open');
        container.classList.add('open');

        // 🆕 增强版覆盖层显示
        overlay.style.opacity = '1';
        overlay.style.visibility = 'visible';
        overlay.style.pointerEvents = 'auto';
        overlay.classList.add('visible');

        document.body.style.overflow = 'hidden';
        document.body.classList.add('sidebar-open');

        this.updateHamburgerAction();
    }

    close() {
        console.log('[Navigation] 🔒 关闭增强版侧边栏');
        this.state.isOpen = false;

        const {
            container,
            overlay
        } = this.state.elements;

        container.setAttribute('data-state', 'closed');
        container.classList.remove('open');

        // 🆕 增强版覆盖层隐藏
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        overlay.style.pointerEvents = 'none';
        overlay.classList.remove('visible');

        document.body.style.overflow = '';
        document.body.classList.remove('sidebar-open');

        this.resetNavigationState();
        this.updateHamburgerAction();
    }

    resetNavigationState() {
        this.state.currentPath = [];
        this.state.currentLevel = 0;

        // 🆕 重置增强版状态
        this.state.activeCategory = null;
        this.state.submenuVisible = false;
        this.state.submenuPosition = null;

        this.hideSubmenu();
        this.renderCurrentLevel();
    }

    updateHamburgerAction() {
        const hamburger = this.state.elements.hamburger;
        if (hamburger) {
            hamburger.setAttribute('data-action', this.state.isOpen ? 'close-sidebar' : 'toggle-sidebar');
        }
    }

    ensureCorrectInitialState() {
        this.close();
        this.hideSubmenu();

        if (this.contentArea) {
            this.contentArea.style.marginLeft = '0';
            this.contentArea.style.width = '100%';
        }
    }

    // === 🔗 兼容性API（保持100%兼容） ===

    async waitForInitialization() {
        return this.initPromise;
    }

    async ensureInitialContentDisplay() {
        if (this.state.hasInitialContent) return;

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const chapterId = urlParams.get('chapter');
            const seriesId = urlParams.get('series');

            if (chapterId) {
                this.navigateToChapter(chapterId);
                this.state.hasInitialContent = true;
                return;
            }

            if (seriesId) {
                const node = this.findNodeById(seriesId);
                if (node) {
                    this.handleDirectNavigation(node);
                    this.state.hasInitialContent = true;
                    return;
                }
            }

            if (this.config.autoLoadDefaultContent) {
                await this.loadDefaultContent();
            }

        } catch (error) {
            console.error('[Navigation] 初始内容加载失败:', error);
            this.displayFallbackContent();
        }
    }

    async loadDefaultContent() {
        if (this.config.defaultContentType === 'all-articles') {
            this.showAllArticles();
            this.state.isMainPage = true;
        }

        this.state.hasInitialContent = true;
    }

    showAllArticles() {
        this.state.isMainPage = true;
        const allChapters = this.getAllChapters();
        this.dispatchEvent('allArticlesRequested', {
            chapters: allChapters
        });
        this.setActiveLink('all-articles');
        this.updateTitle('所有文章');
    }

    getAllChapters() {
        return Array.from(this.state.chaptersMap.values());
    }

    navigateToChapter(chapterId) {
        const chapterData = this.state.chaptersMap.get(chapterId);
        if (!chapterData) {
            console.error('Chapter not found:', chapterId);
            return;
        }

        this.state.isMainPage = false;
        this.loadChapterContent(chapterId, chapterData);
    }

    async loadChapterContent(chapterId, chapterData) {
        try {
            if (chapterData.externalUrl) {
                const openInNew = chapterData.openInNewTab !== false;
                if (openInNew) {
                    window.open(chapterData.externalUrl, '_blank', 'noopener,noreferrer');
                    this.displayExternalLinkMessage(chapterData);
                } else {
                    window.location.href = chapterData.externalUrl;
                }
                return;
            }

            if (chapterData.type === 'tool' && chapterData.url) {
                this.handleToolPageNavigation(chapterData);
                return;
            }

            let content = this.cache.get ? this.cache.get(chapterId) : null;

            if (!content) {
                const contentUrl = this.getContentUrl(chapterData);
                const response = await fetch(contentUrl);

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                content = await response.text();

                if (this.cache.set) {
                    this.cache.set(chapterId, content);
                }
            }

            this.displayChapterContent(chapterId, content, chapterData);

        } catch (error) {
            console.error('Chapter loading failed:', error);
            this.displayError('章节加载失败，请检查网络连接');
            this.dispatchEvent('chapterLoadError', {
                chapterId,
                error
            });
        }
    }

    getContentUrl(chapterData) {
        if (chapterData.url) {
            return chapterData.url.startsWith('http') ? chapterData.url : chapterData.url;
        }
        return `chapters/${chapterData.id}.html`;
    }

    handleToolPageNavigation(chapterData) {
        const {
            id,
            url,
            title
        } = chapterData;

        if (url.startsWith('http')) {
            window.open(url, '_blank', 'noopener,noreferrer');
            this.displayToolRedirectMessage(title, url);
        } else {
            window.location.href = url;
        }

        this.updateTitle(title);
        this.setActiveLink(id);
        this.dispatchEvent('toolPageLoaded', {
            toolId: id,
            toolUrl: url,
            chapterData
        });
    }

    displayChapterContent(chapterId, content, chapterData) {
        this.contentArea.innerHTML = content;
        this.updateTitle(chapterData.title);
        this.setActiveLink(chapterData.id);

        const hasAudio = chapterData.audio === true ||
            !!chapterData.audioFile ||
            !!chapterData.audio ||
            !!chapterData.srtFile;

        this.dispatchEvent('chapterLoaded', {
            chapterId,
            hasAudio: hasAudio,
            chapterData: {
                ...chapterData,
                audioFile: chapterData.audioFile || chapterData.audio || `audio/${chapterId}.mp3`,
                srtFile: chapterData.srtFile || `srt/${chapterId}.srt`,
                duration: chapterData.duration,
                difficulty: chapterData.difficulty,
                tags: chapterData.tags,
                publishDate: chapterData.publishDate,
                description: chapterData.description,
                thumbnail: chapterData.thumbnail
            }
        });

        const {
            prevChapterId,
            nextChapterId
        } = this.getChapterNav(chapterId);
        this.dispatchEvent('navigationUpdated', {
            prevChapterId,
            nextChapterId
        });
    }

    setActiveLink(id) {
        this.state.linksMap.forEach(link => link.classList.remove('active'));

        const newActiveLink = this.state.linksMap.get(id);
        if (newActiveLink) {
            newActiveLink.classList.add('active');
            this.state.activeLink = newActiveLink;
        }
    }

    updateActiveState(itemId) {
        this.setActiveLink(itemId);
    }

    getChapterNav(chapterId) {
        const chapterData = this.state.chaptersMap.get(chapterId);
        if (!chapterData) return {
            prevChapterId: null,
            nextChapterId: null
        };

        const parentItem = this.findParentItem(chapterId);
        if (!parentItem || !parentItem.chapters) {
            return {
                prevChapterId: null,
                nextChapterId: null
            };
        }

        const currentIndex = parentItem.chapters.findIndex(c => c.id === chapterId);
        const prevChapter = parentItem.chapters[currentIndex - 1];
        const nextChapter = parentItem.chapters[currentIndex + 1];

        return {
            prevChapterId: prevChapter?.id || null,
            nextChapterId: nextChapter?.id || null
        };
    }

    findParentItem(chapterId) {
        const chapterData = this.state.chaptersMap.get(chapterId);
        if (!chapterData) return null;

        return this.findNodeById(chapterData.seriesId);
    }

    updateTitle(text) {
        document.title = text ? `${text} | ${this.config.siteTitle}` : this.config.siteTitle;
    }

    displayError(message) {
        this.contentArea.innerHTML = `<p class="error-message" style="text-align: center; padding: 40px; color: #dc3545;">${message}</p>`;
    }

    displayExternalLinkMessage(data) {
        this.contentArea.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; border-radius: 12px; margin: 20px 0;">
                <div style="font-size: 3rem; margin-bottom: 20px;">🌐</div>
                <h2 style="margin-bottom: 16px;">${data.title}</h2>
                <p style="margin-bottom: 24px; opacity: 0.9;">${data.description || '外部链接已在新窗口打开'}</p>
            </div>
        `;
    }

    displayToolRedirectMessage(title, url) {
        this.contentArea.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; margin: 20px 0;">
                <div style="font-size: 3rem; margin-bottom: 20px;">🚀</div>
                <h2 style="margin-bottom: 16px;">${title}</h2>
                <p style="margin-bottom: 24px; opacity: 0.9;">工具页面已在新窗口打开</p>
            </div>
        `;
    }

    displayFallbackContent() {
        this.contentArea.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; margin: 20px 0;">
                <div style="font-size: 3rem; margin-bottom: 20px;">📚</div>
                <h1 style="margin-bottom: 16px; font-size: 2rem;">Learner</h1>
                <p style="margin-bottom: 24px; opacity: 0.9;">正在加载内容，请稍候...</p>
            </div>
        `;

        this.updateTitle('加载中');
        this.state.hasInitialContent = true;
    }

    dispatchEvent(eventName, detail = {}) {
        document.dispatchEvent(new CustomEvent(eventName, {
            detail
        }));
    }

    handleInitializationError(error) {
        this.contentArea.innerHTML = `
            <div style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #dc3545; margin-bottom: 16px;">增强版导航初始化失败</h2>
                <p>遇到了一些问题：${error.message}</p>
                <button onclick="location.reload()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                    重新加载
                </button>
            </div>
        `;
    }

    // === 🆕 增强功能API ===

    // 获取增强版导航统计
    getEnhancedNavigationStats() {
        return {
            ...this.getNavigationStats(),
            submenuVisible: this.state.submenuVisible,
            activeCategory: this.state.activeCategory,
            submenuPosition: this.state.submenuPosition,
            enhancedFeatures: {
                positionAlignment: this.config.enablePositionAlignment,
                submenuAnimation: true,
                responsiveDesign: true
            }
        };
    }

    // 手动触发位置对齐的子菜单
    showAlignedSubmenuById(categoryId, options = {}) {
        const node = this.findNodeById(categoryId);
        if (!node) {
            console.error('[Navigation] ❌ 找不到分类节点:', categoryId);
            return false;
        }

        const element = this.state.linksMap.get(categoryId);
        this.showAlignedSubmenu(node, element);
        return true;
    }

    // 手动设置子菜单位置
    setSubmenuPosition(position) {
        this.state.submenuPosition = position;
        if (this.state.submenuVisible) {
            this.showSubmenuWithPosition(position);
        }
    }

    // 获取当前子菜单状态
    getSubmenuState() {
        return {
            visible: this.state.submenuVisible,
            activeCategory: this.state.activeCategory,
            position: this.state.submenuPosition,
            element: this.state.elements.submenuPanel
        };
    }

    getNavigationStats() {
        return {
            totalNodes: this.countTotalNodes(this.state.navigationTree),
            totalChapters: this.state.chaptersMap.size,
            maxDepth: this.getMaxDepth(this.state.navigationTree),
            currentLevel: this.state.currentLevel,
            currentPath: this.state.currentPath.map(p => p.title),
            nodeTypes: this.getNodeTypeStats()
        };
    }

    countTotalNodes(nodes) {
        let count = nodes.length;
        nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
                count += this.countTotalNodes(node.children);
            }
        });
        return count;
    }

    getMaxDepth(nodes, currentDepth = 0) {
        let maxDepth = currentDepth;
        nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
                const childDepth = this.getMaxDepth(node.children, currentDepth + 1);
                maxDepth = Math.max(maxDepth, childDepth);
            }
        });
        return maxDepth;
    }

    getNodeTypeStats() {
        const stats = {};
        this.walkNavigationTree(this.state.navigationTree, (node) => {
            stats[node.type] = (stats[node.type] || 0) + 1;
        });
        return stats;
    }
    // 🔧 新增：词频工具专用处理方法
    handleWordFrequencyTool(node) {
        console.log('[Navigation] 🔤 启动词频分析工具...');
        
        this.close();

        this.updateTitle(node.title);
        this.setActiveLink(node.id);

        // 🔧 关键修复：发送正确的事件名称
        this.dispatchEvent('wordFrequencyRequested', {
            toolId: node.id,
            toolTitle: node.title,
            toolAction: node.action,
            toolData: node,
            source: 'navigation'
        });

        console.log('[Navigation] ✅ 词频工具事件已发送');
    }

    // 🔧 新增：自定义action工具处理
    handleCustomActionTool(node) {
        console.log('[Navigation] 🔄 处理自定义工具:', node.action);

        this.updateTitle(node.title);
        this.setActiveLink(node.id);

        // 发送基于action的特定事件
        const specificEventName = `${node.action}Requested`;
        this.dispatchEvent(specificEventName, {
            toolId: node.id,
            toolTitle: node.title,
            toolAction: node.action,
            toolData: node,
            source: 'navigation'
        });
    }

    destroy() {

        this.close();

        const elementsToRemove = ['container', 'overlay'];
        elementsToRemove.forEach(key => {
            const element = this.state.elements[key];
            if (element && element.parentElement) {
                element.remove();
            }
        });

        const hamburger = this.state.elements.hamburger;
        if (hamburger && hamburger.parentElement) {
            hamburger.remove();
        }

        // 🆕 移除增强版样式
        const enhancedStyles = document.getElementById('enhanced-navigation-styles');
        if (enhancedStyles) {
            enhancedStyles.remove();
        }

        this.state.linksMap.clear();
        this.state.chaptersMap.clear();
        this.state.currentPath = [];

        // 🆕 重置增强版状态
        this.state.activeCategory = null;
        this.state.submenuVisible = false;
        this.state.submenuPosition = null;

        document.body.style.overflow = '';
        document.body.classList.remove('sidebar-open');

        console.log('[Navigation] 🧹 增强版自定义导航已销毁');
    }
}

// 注册到全局（保持100%兼容性）
window.EnglishSite.Navigation = Navigation;

// 🔗 便捷的全局函数（保持兼容）
window.navigateToWordFrequency = function() {
    if (window.app && window.app.navigation) {
        return window.app.navigation.navigateToTool('word-frequency');
    }
    return false;
};

window.closeSidebarNavigation = function() {
    if (window.app && window.app.navigation && window.app.navigation.state.isOpen) {
        window.app.navigation.close();
        return true;
    }
    return false;
};

// 🆕 新增全局便捷函数
window.showAlignedSubmenu = function(categoryId) {
    if (window.app && window.app.navigation) {
        return window.app.navigation.showAlignedSubmenuById(categoryId);
    }
    return false;
};

window.getEnhancedNavigationState = function() {
    if (window.app && window.app.navigation) {
        return window.app.navigation.getEnhancedNavigationStats();
    }
    return null;
};

// 🔍 调试函数（增强版）
window.debugEnhancedNavigation = function() {
    if (window.app && window.app.navigation) {
        const nav = window.app.navigation;
        console.log('=== 🔍 增强版自定义导航调试信息 ===');
        console.log('📊 增强版导航统计:', nav.getEnhancedNavigationStats());
        console.log('🌳 导航树:', nav.state.navigationTree);
        console.log('📚 章节映射:', nav.state.chaptersMap);
        console.log('🗂️ 当前路径:', nav.state.currentPath);
        console.log('🎯 子菜单状态:', nav.getSubmenuState());
        console.log('🎨 DOM元素:', nav.state.elements);
        return nav.getEnhancedNavigationStats();
    }
    return null;
};

// 🆕 增强版事件监听器（用于外部集成）
window.addEnhancedNavigationListener = function(eventType, callback) {
    const supportedEvents = [
        'submenuOpened', // 子菜单打开时
        'submenuClosed', // 子菜单关闭时
        'categoryActivated', // 分类激活时
        'positionAligned' // 位置对齐完成时
    ];

    if (!supportedEvents.includes(eventType)) {
        console.warn('[Navigation] ⚠️ 不支持的事件类型:', eventType);
        return false;
    }

    document.addEventListener(`enhanced-navigation-${eventType}`, callback);
    return true;
};

console.log('[Navigation] ✅ 增强版自定义导航系统加载完成');
console.log('[Navigation] 🚀 新功能: 位置对齐子菜单、增强动画、响应式设计');
console.log('[Navigation] 🛡️ 兼容性: 100% 向后兼容，所有原有API保持不变');