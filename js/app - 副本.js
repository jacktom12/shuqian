let bookmarks = [];
let currentCategory = "ALL";
let currentTag = "ALL";
let searchQuery = "";

// 首期数据载入
fetch("bookmarks.json")
    .then(r => r.json())
    .then(data => {
        bookmarks = data;
        initSystem();
    });

function initSystem() {
    // 渲染各种面板状态
    renderStats();
    renderCategoryTree();
    renderTagCloud();
    filterAndRender();

    // 搜索实时联动与即时高亮
    document.getElementById("searchInput").addEventListener("input", (e) => {
        searchQuery = e.target.value.trim();
        filterAndRender();
    });

    // 抽屉菜单逻辑
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    if (menuToggle) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.add("open");
            overlay.classList.add("show");
        });
    }

    if (overlay) {
        overlay.addEventListener("click", () => {
            sidebar.classList.remove("open");
            overlay.classList.remove("show");
        });
    }
}

// 统计面板更新
function renderStats() {
    const total = bookmarks.length;
    const favs = bookmarks.filter(b => b.favorite).length;
    const categories = [...new Set(bookmarks.map(b => b.category).filter(Boolean))].length;
    
    let allTags = [];
    bookmarks.forEach(b => { if(b.tags) allTags.push(...b.tags); });
    const uniqueTags = [...new Set(allTags)].length;

    document.getElementById("bookmarkCount").innerText = total;
    document.getElementById("favCount").innerText = favs;
    document.getElementById("catCount").innerText = categories;
    document.getElementById("tagCount").innerText = uniqueTags;
}

// 渲染左侧分类树
function renderCategoryTree() {
    const treeContainer = document.getElementById("categoryTree");
    
    // 归纳分类计数
    const counts = {};
    bookmarks.forEach(b => {
        if(b.category) counts[b.category] = (counts[b.category] || 0) + 1;
    });

    let html = `
        <button class="tree-node ${currentCategory==='ALL'&&currentTag==='ALL'?'active':''}" onclick="selectCategory('ALL')">
            <span>🌐 显示全部</span>
            <span class="tree-count">${bookmarks.length}</span>
        </button>
    `;

    Object.keys(counts).sort().forEach(cat => {
        html += `
            <button class="tree-node ${currentCategory===cat?'active':''}" onclick="selectCategory('${cat}')">
                <span>📁 ${cat}</span>
                <span class="tree-count">${counts[cat]}</span>
            </button>
        `;
    });

    treeContainer.innerHTML = html;
}

// 渲染大气的标签云 (带权重粗略分级)
function renderTagCloud() {
    const cloudContainer = document.getElementById("tagCloud");
    const tagMap = {};
    
    bookmarks.forEach(b => {
        if(b.tags) {
            b.tags.forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; });
        }
    });

    let html = "";
    Object.keys(tagMap).forEach(tag => {
        const count = tagMap[tag];
        // 动态计算阶梯字体大小
        let fontSize = 12;
        if (count > 5) fontSize = 18;
        else if (count > 2) fontSize = 15;

        html += `<span class="cloud-tag ${currentTag===tag?'active':''}" 
                       style="font-size: ${fontSize}px; ${currentTag===tag?'background:#3b82f6;color:white;':''}" 
                       onclick="selectTag('${tag}')">#${tag}</span> `;
    });
    cloudContainer.innerHTML = html;
}

// 分类与标签动作切换
function selectCategory(cat) {
    currentCategory = cat;
    currentTag = "ALL"; // 互斥
    document.getElementById("currentViewTitle").innerText = cat === "ALL" ? "📚 全部书签" : `📁 分类: ${cat}`;
    updateTreeAndCloudActive();
    filterAndRender();
    closeSidebarOnMobile();
}

function selectTag(tag) {
    currentTag = tag;
    currentCategory = "ALL"; // 互斥
    document.getElementById("currentViewTitle").innerText = `🏷️ 标签: ${tag}`;
    updateTreeAndCloudActive();
    filterAndRender();
    closeSidebarOnMobile();
}

function updateTreeAndCloudActive() {
    renderCategoryTree();
    renderTagCloud();
}

function closeSidebarOnMobile() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebarOverlay").classList.remove("show");
}

// 即时关键字高亮底层算法
function highlightText(text, keyword) {
    if (!keyword) return text;
    // 忽略大小写并全局匹配包装mark
    const regex = new RegExp(`(${keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="highlight">$1</mark>');
}

// 核心卡片生成器
function createCard(bookmark) {
    const displayTitle = highlightText(bookmark.title, searchQuery);
    const displayDesc = highlightText(bookmark.desc || "暂无描述信息...", searchQuery);
    
    const tagHtml = (bookmark.tags || []).map(t => {
        const highlightedTag = highlightText(t, searchQuery);
        return `<span class="tag" onclick="event.stopPropagation(); selectTag('${t}')">${highlightedTag}</span>`;
    }).join("");

    return `
        <div class="card">
            <div class="card-title-row">
                <a href="${bookmark.url}" target="_blank">${displayTitle}</a>
                ${bookmark.favorite ? '<span style="color:#f59e0b; font-size:18px;">★</span>' : ''}
            </div>
            <div class="desc">${displayDesc}</div>
            <div class="tags">${tagHtml}</div>
        </div>
    `;
}

// 过滤核心管线
function filterAndRender() {
    // 1. 基于分类和标签过滤
    let filtered = bookmarks;
    if (currentCategory !== "ALL") {
        filtered = filtered.filter(b => b.category === currentCategory);
    }
    if (currentTag !== "ALL") {
        filtered = filtered.filter(b => b.tags && b.tags.includes(currentTag));
    }

    // 2. 搜索框过滤匹配 (支持标题、描述、标签联合搜索)
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(b => {
            const matchTitle = b.title.toLowerCase().includes(q);
            const matchDesc = b.desc && b.desc.toLowerCase().includes(q);
            const matchTags = b.tags && b.tags.some(t => t.toLowerCase().includes(q));
            return matchTitle || matchDesc || matchTags;
        });
    }

    // 3. 剥离并渲染精选栏
    const favs = filtered.filter(b => b.favorite);
    const favSection = document.getElementById("favoriteSection");
    
    if (favs.length > 0) {
        favSection.style.display = "flex";
        document.getElementById("favoriteContainer").innerHTML = favs.map(createCard).join("");
        document.getElementById("favBadgeCount").innerText = favs.length;
    } else {
        favSection.style.display = "none";
    }

    // 4. 渲染全部或当前维度栏
    document.getElementById("bookmarkContainer").innerHTML = filtered.map(createCard).join("");
    document.getElementById("listBadgeCount").innerText = filtered.length;
}