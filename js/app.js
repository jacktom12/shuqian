let bookmarks = [];
let currentCategory = "ALL";
let currentTag = "ALL";
let searchQuery = "";

// 初始数据加载
fetch("bookmarks.json")
    .then(r => r.json())
    .then(data => {
        bookmarks = data;
        initSystem();
    })
    .catch(err => {
        console.error("加载书签数据失败，请检查 bookmarks.json 格式是否正确:", err);
    });

function initSystem() {
    // 渲染整体统计面板、分类树目录、标签云集
    renderStats();
    renderCategoryTree();
    renderTagCloud();
    
    // 触发核心过滤与按需高性能渲染管线
    filterAndRender();

    // 搜索框实时无缝联动与高亮检索
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchQuery = e.target.value.trim();
            filterAndRender();
        });
    }

    // 手机移动端抽屉菜单及遮罩层核心逻辑
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    if (menuToggle && sidebar && overlay) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.add("open");
            overlay.classList.add("show");
        });

        overlay.addEventListener("click", () => {
            sidebar.classList.remove("open");
            overlay.classList.remove("show");
        });
    }
}

// 1. 仪表盘收藏统计核心算法
function renderStats() {
    const total = bookmarks.length;
    const favs = bookmarks.filter(b => b.favorite).length;
    
    // 动态提取并去重所有合法的分类名
    const categories = [...new Set(bookmarks.map(b => b.category).filter(Boolean))].length;
    
    // 扁平化提取所有书签中附带的 Tags 标签
    let allTags = [];
    bookmarks.forEach(b => { 
        if (b.tags && Array.isArray(b.tags)) {
            allTags.push(...b.tags); 
        }
    });
    const uniqueTags = [...new Set(allTags)].length;

    // 安全渲染各统计节点
    const elTotal = document.getElementById("bookmarkCount");
    const elFav = document.getElementById("favCount");
    const elCat = document.getElementById("catCount");
    const elTag = document.getElementById("tagCount");

    if (elTotal) elTotal.innerText = total;
    if (elFav) elFav.innerText = favs;
    if (elCat) elCat.innerText = categories;
    if (elTag) elTag.innerText = uniqueTags;
}

// 2. 左侧美化分类树目录生成器 (带书签实时总数统计)
function renderCategoryTree() {
    const treeContainer = document.getElementById("categoryTree") || document.getElementById("categoryList");
    if (!treeContainer) return;
    
    const counts = {};
    bookmarks.forEach(b => {
        const catName = b.category || "未分类";
        counts[catName] = (counts[catName] || 0) + 1;
    });

    // 构建“全部显示”默认节点
    let html = `
        <button class="tree-node ${currentCategory === 'ALL' && currentTag === 'ALL' ? 'active' : ''}" onclick="selectCategory('ALL')">
            <span>🌐 显示全部</span>
            <span class="tree-count">${bookmarks.length}</span>
        </button>
    `;

    // 排序并迭代渲染每一个真实的分类分支
    Object.keys(counts).sort().forEach(cat => {
        html += `
            <button class="tree-node ${currentCategory === cat ? 'active' : ''}" onclick="selectCategory('${cat}')">
                <span>📁 ${cat}</span>
                <span class="tree-count">${counts[cat]}</span>
            </button>
        `;
    });

    treeContainer.innerHTML = html;
}

// 3. 高颜值热度阶梯权重标签云
function renderTagCloud() {
    const cloudContainer = document.getElementById("tagCloud");
    if (!cloudContainer) return;

    const tagMap = {};
    bookmarks.forEach(b => {
        if (b.tags && Array.isArray(b.tags)) {
            b.tags.forEach(t => { 
                if(t) tagMap[t] = (tagMap[t] || 0) + 1; 
            });
        }
    });

    let html = "";
    Object.keys(tagMap).sort((a, b) => tagMap[b] - tagMap[a]).forEach(tag => {
        const count = tagMap[tag];
        // 根据该标签在全量书签中出现的频次热度，动态匹配阶梯字号布局
        let fontSize = 12;
        if (count > 8) fontSize = 18;
        else if (count > 4) fontSize = 15;
        else if (count > 2) fontSize = 13;

        const isActive = currentTag === tag;
        const activeStyle = isActive ? "background: #3b82f6; color: white;" : "";

        html += `<span class="cloud-tag" 
                       style="font-size: ${fontSize}px; ${activeStyle}" 
                       onclick="event.stopPropagation(); selectTag('${tag}')">#${tag}</span> `;
    });
    
    cloudContainer.innerHTML = html || `<span style="color:var(--text-muted); font-size:13px;">暂无可用标签</span>`;
}

// 4. 联动选择控制交互中心
function selectCategory(cat) {
    currentCategory = cat;
    currentTag = "ALL"; // 保证维度互斥
    
    const viewTitle = document.getElementById("currentViewTitle");
    if (viewTitle) {
        viewTitle.innerText = cat === "ALL" ? "📚 全部书签" : `📁 分类: ${cat}`;
    }
    
    updateTreeAndCloudActive();
    filterAndRender();
    closeSidebarOnMobile();
}

function selectTag(tag) {
    currentTag = tag;
    currentCategory = "ALL"; // 保证维度互斥
    
    const viewTitle = document.getElementById("currentViewTitle");
    if (viewTitle) {
        viewTitle.innerText = `🏷️ 标签群: #${tag}`;
    }
    
    updateTreeAndCloudActive();
    filterAndRender();
    closeSidebarOnMobile();
}

function updateTreeAndCloudActive() {
    renderCategoryTree();
    renderTagCloud();
}

function closeSidebarOnMobile() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("show");
}

// 5. 正则非破坏性文本即时高亮算法
function highlightText(text, keyword) {
    if (!text) return "";
    if (!keyword) return text;
    // 过滤掉正则表达式的特殊字符以防运行崩溃，全局且不区分大小写
    const protectedKeyword = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${protectedKeyword})`, 'gi');
    return text.replace(regex, '<mark class="highlight">$1</mark>');
}

// 6. 奢华毛玻璃样式卡片单体生成器
function createCard(bookmark) {
    const displayTitle = highlightText(bookmark.title || "未命名书签", searchQuery);
    const displayDesc = highlightText(bookmark.desc || "暂无描述信息...", searchQuery);
    
    const tagHtml = (bookmark.tags || []).map(t => {
        const highlightedTag = highlightText(t, searchQuery);
        return `<span class="tag" onclick="event.stopPropagation(); selectTag('${t}')">${highlightedTag}</span>`;
    }).join("");

    return `
        <div class="card">
            <div class="card-title-row">
                <a href="${bookmark.url}" target="_blank" rel="noopener noreferrer">${displayTitle}</a>
                ${bookmark.favorite ? '<span style="color: #f59e0b; font-size: 18px;" title="精选星标">★</span>' : ''}
            </div>
            <div class="desc">${displayDesc}</div>
            <div class="tags">${tagHtml}</div>
        </div>
    `;
}

// 7. 核心兼顾大容量数据的过滤与高性能异步渲染管线
function filterAndRender() {
    // 步骤 A: 分类与标签过滤维度
    let filtered = bookmarks;
    if (currentCategory !== "ALL") {
        filtered = filtered.filter(b => (b.category || "未分类") === currentCategory);
    }
    if (currentTag !== "ALL") {
        filtered = filtered.filter(b => b.tags && b.tags.includes(currentTag));
    }

    // 步骤 B: 搜索框字符串联合模糊检索
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(b => {
            const matchTitle = b.title && b.title.toLowerCase().includes(q);
            const matchDesc = b.desc && b.desc.toLowerCase().includes(q);
            const matchTags = b.tags && b.tags.some(t => t.toLowerCase().includes(q));
            return matchTitle || matchDesc || matchTags;
        });
    }

    // 步骤 C: 渲染前置“★精选收藏栏”
    const favs = filtered.filter(b => b.favorite);
    const favSection = document.getElementById("favoriteSection");
    const favContainer = document.getElementById("favoriteContainer");
    const favBadge = document.getElementById("favBadgeCount");
    
    if (favs.length > 0 && favContainer) {
        if (favSection) favSection.style.display = "flex";
        favContainer.innerHTML = favs.map(createCard).join("");
        if (favBadge) favBadge.innerText = favs.length;
    } else {
        if (favSection) favSection.style.display = "none";
    }

    // 步骤 D: 渲染主列表（支持上百条书签的无缝高效率绘制）
    const mainContainer = document.getElementById("bookmarkContainer");
    const listBadge = document.getElementById("listBadgeCount");
    
    if (mainContainer) {
        mainContainer.innerHTML = filtered.map(createCard).join("");
    }
    if (listBadge) {
        listBadge.innerText = filtered.length;
    }
}