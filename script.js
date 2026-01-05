let mods = [];

/* ========= 工具：解析 CSV ========= */
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");

  return lines.map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = values[i]?.trim() || "";
    });
    return obj;
  });
}

/* ========= 标签解析 ========= */
function parseTags(tagString) {
  if (!tagString) return [];
  return tagString
    .replace(/#/g, "")
    .split(/[，,｜|\/\s]+/)
    .map(t => t.trim())
    .filter(Boolean);
}

// ========= 更新我的收藏 tag 数量 =========
function updateMyFavoritesTagCount() {
  const favs = getFavorites();
  const favChip = document.querySelector(".fav-chip");

  if (favChip) {
    // 已经存在 “我的收藏” tag → 更新数量
    favChip.textContent = `⭐ 我的收藏 (${favs.length})`;
  } else if (favs.length > 0) {
    // 如果不存在，动态创建并加在“全部”之后
    const container = document.getElementById("tagContainer");
    const chip = document.createElement("span");
    chip.className = "tag-chip fav-chip";
    chip.textContent = `⭐ 我的收藏 (${favs.length})`;

    chip.addEventListener("click", () => {
      document.querySelectorAll(".tag-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      showingFavorites = true;
      renderFavoriteCards();
    });

    // 插入在全部之后
    const allChip = container.querySelector(".tag-chip.active") || container.firstChild;
    if (allChip) allChip.after(chip);
    else container.appendChild(chip);
  }
}

/* ========= 收藏（localStorage） ========= */
function getFavorites() {
  return JSON.parse(localStorage.getItem("favorites") || "[]");
}

function toggleFavorite(id) {
  let favs = getFavorites();
  if (favs.includes(id)) {
    favs = favs.filter(x => x !== id);
  } else {
    favs.push(id);
  }
  localStorage.setItem("favorites", JSON.stringify(favs));
}
//========= 主页面收藏列表 ========= */
function renderFavoriteCards() {
  const container = document.getElementById("modContainer");
  container.innerHTML = "";

  const favs = getFavorites();

  if (favs.length === 0) {
    container.innerHTML = "<p>暂无收藏</p>";
    return;
  }

  // 按收藏顺序取 mod（和侧边栏一致）
  const favMods = favs
    .slice()        // 防止 reverse 影响原数组
    .reverse()
    .map(id => mods.find(m => m.mod_id === id))
    .filter(Boolean);

  renderMods(favMods,false);
}

/* ========= 加载 CSV ========= */
async function loadMods() {
  const res = await fetch("./data/mods3.csv");
  const text = await res.text();
  mods = parseCSV(text);
  renderMods(mods);
  renderTagChips();
}

/* ========= 渲染 Mod 卡片 ========= */
function renderMods(list, reverse = true) {
  const container = document.getElementById("modContainer");
  container.innerHTML = "";

  // 普通卡片，按 CSV 最新在前
  const displayList = reverse ? list.slice().reverse() : list.slice();

  const favorites = getFavorites();

  displayList.forEach(mod => {
    const tagsHTML = parseTags(mod.tags)
      .map(tag => `<span class="tag">#${tag}</span>`)
      .join("");

    const isFav = favorites.includes(mod.mod_id);

    const card = document.createElement("div");
    card.className = "mod-card";
    card.id = `mod-${mod.mod_id}`;

    card.innerHTML = `
      <img src="${mod.thumbnail || "https://via.placeholder.com/150"}" class="thumb">
      <div class="mod-header">
        <h3>
          <a href="${mod.nexus_url || '#'}" target="_blank" class="nexus-link-text">
          ${mod.title_en || mod.local_name_en || mod.name_cn || "-"}
          </a>
        </h3>
        <button class="fav-btn" data-id="${mod.mod_id}">${isFav ? "⭐" : "☆"}</button>
      </div>
      <p class="mod-id">尾号: ${mod.mod_id || "-"}</p>
      <p class="mod-cn">中文名: ${mod.name_cn || "-"}</p>
      <p class="mod-author">作者: ${mod.author || "-"}</p>
      <p class="mod-desc">描述：${mod.summary_cn || "-"}</p>
      <p class="mod-last_updated">最后更新: ${mod.last_updated || "-"}</p>
      <p class="mod-mod_downloads">下载次数: ${mod.mod_downloads || "-"}</p>
      <p class="tags">标签：<span class="tag-list">${tagsHTML || "-"}</span></p>
      
    `;
    card.addEventListener("click", () => {
    card.classList.toggle("expanded");
  });

    container.appendChild(card);
  });

  // 收藏按钮事件
  document.querySelectorAll(".fav-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      const id = btn.dataset.id;
      toggleFavorite(id);

      
      btn.textContent = getFavorites().includes(id) ? "⭐" : "☆";
      

      renderFavoriteDrawer();
      //renderTagChips();
      //updateMyFavoritesTag(); 
      updateMyFavoritesTagCount();
    });

    });
}

/* ========= 标签统计 + 筛选 ========= */
/* ========= 标签统计 + 筛选 ========= */
function renderTagChips() {
  const tagCountMap = new Map();

  // 统计所有普通标签数量
  mods.forEach(mod => {
    parseTags(mod.tags).forEach(tag => {
      tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
    });
  });

  const container = document.getElementById("tagContainer");
  container.innerHTML = "";

  // ===== 1️⃣ 全部 chip（固定第一个） =====
  const allChip = document.createElement("span");
  allChip.className = "tag-chip active";
  allChip.textContent = `全部 (${mods.length})`;
  allChip.addEventListener("click", () => {
    document.querySelectorAll(".tag-chip").forEach(c => c.classList.remove("active"));
    allChip.classList.add("active");
    renderMods(mods);
  });
  container.appendChild(allChip);

  // ===== 2️⃣ 我的收藏 chip（固定第二个） =====
  const favs = getFavorites();
  let favChip = null;
  if (favs.length > 0) {
    favChip = document.createElement("span");
    favChip.className = "tag-chip fav-chip";
    favChip.textContent = `⭐ 我的收藏 (${favs.length})`;

    favChip.addEventListener("click", () => {
      document.querySelectorAll(".tag-chip").forEach(c => c.classList.remove("active"));
      favChip.classList.add("active");
      showingFavorites = true;
      renderFavoriteCards();
    });

    container.appendChild(favChip);
  }

  // ===== 3️⃣ 其他标签按数量排序（数量多的在前） =====
  const sortedTags = Array.from(tagCountMap.entries())
    .sort((a, b) => b[1] - a[1]); // b[1] - a[1] 表示数量多的在前

  sortedTags.forEach(([tag, count]) => {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.textContent = `#${tag} (${count})`;

    chip.addEventListener("click", () => {
      document.querySelectorAll(".tag-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");

      const filtered = mods.filter(mod =>
        parseTags(mod.tags).includes(tag)
      );
      renderMods(filtered);
    });

    container.appendChild(chip);
  });
}

/* ========= 搜索 ========= */
const searchInput = document.getElementById("search");
if (searchInput) {
  searchInput.addEventListener("input", e => {
    const query = e.target.value.toLowerCase();
    const filtered = mods.filter(m =>
      (m.title_en && m.title_en.toLowerCase().includes(query)) ||
      (m.local_name_en && m.local_name_en.toLowerCase().includes(query)) ||
      (m.name_cn && m.name_cn.toLowerCase().includes(query)) ||
      ((m.mod_id + "").includes(query)) ||
      (m.summary && m.summary.toLowerCase().includes(query)) ||
      (m.author && m.author.toLowerCase().includes(query)) ||
      parseTags(m.tags).some(tag => tag.toLowerCase().includes(query))
    );
    renderMods(filtered);
  });
}

/* ========= 主页面收藏列表 ========= */
let showingFavorites = false;
// function renderFavoriteList() {
//   const container = document.getElementById("modContainer");
//   container.innerHTML = "";

//   const favs = getFavorites();
//   const favMods = mods.filter(m => favs.includes(m.mod_id));

//   if (favMods.length === 0) {
//     container.innerHTML = "<p>暂无收藏</p>";
//     return;
//   }

//   favMods.forEach(mod => {
//     const div = document.createElement("div");
//     div.className = "fav-item";
//     div.textContent = `${mod.name_cn || mod.title_en} (#${mod.mod_id})`;
//     container.appendChild(div);
//   });
// }

document.getElementById("favToggleBtn")?.addEventListener("click", () => {
  showingFavorites = !showingFavorites;

  if (showingFavorites) {
    renderFavoriteCards();
    document.getElementById("favToggleBtn").textContent = "⬅ 返回";
  } else {
    renderMods(mods);
    document.getElementById("favToggleBtn").textContent = "⭐ 收藏";
  }
});

/* ========= 左上角侧边栏收藏 ========= */
const menuBtn = document.getElementById("menuBtn");
const drawer = document.getElementById("sideDrawer");
const mask = document.getElementById("drawerMask");
const closeBtn = document.getElementById("drawerCloseBtn");

// 打开侧边栏
menuBtn?.addEventListener("click", () => {
  drawer.classList.add("open");
  mask.style.display = "block";
  renderFavoriteDrawer();
});

closeBtn.addEventListener("click", closeDrawer);
mask?.addEventListener("click", closeDrawer);

function closeDrawer() {
  drawer.classList.remove("open");
  mask.style.display = "none";
}

function renderFavoriteDrawer() {
  const list = document.getElementById("favoriteList");
  list.innerHTML = "";

  const favs = getFavorites();
  //const favMods = mods.filter(m => favs.includes(m.mod_id));

  //const favs = getFavorites(); // 获取收藏列表
  // 确保最新收藏在最前面
  favs.reverse(); // 如果 getFavorites 返回的是旧→新顺序

  // 根据收藏顺序取 mod 对象,确保最新收藏在最前面
  const favMods = favs
  .map(id => mods.find(m => m.mod_id === id))
  .filter(Boolean); // 过滤可能不存在的 mod
  //更新收藏总数
  document.getElementById("favCount").textContent = favs.length;

  if (favMods.length === 0) {
    list.innerHTML = "<li>暂无收藏</li>";
    return;
  }

  favMods.forEach((mod, index) => {
    const li = document.createElement("li");
    li.style.cursor = "pointer";
    li.style.padding = "8px 12px";
    li.style.borderBottom = "1px solid #eee";
    li.innerHTML = `
    <span class="fav-title">${mod.name_cn || mod.title_en} (#${mod.mod_id})</span>
    <button class="nexus-btn" data-url="${mod.nexus_url}">N</button>
    `;

    // 给 N 按钮绑定打开链接事件
    li.querySelector(".nexus-btn").addEventListener("click", (e) => {
      e.stopPropagation(); // 阻止父元素点击
      window.open(mod.nexus_url, "_blank");
    });

    li.addEventListener("click", () => {
      closeDrawer();
      scrollToMod(mod.mod_id);
    });
    list.appendChild(li);
  });

  // 允许侧边栏滚动
  list.style.maxHeight = "80vh";
  list.style.overflowY = "auto";
}

/* ========= 滚动到对应卡片 ========= */
function scrollToMod(id) {
  const el = document.getElementById(`mod-${id}`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.style.outline = "2px solid #ED974F";
    setTimeout(() => el.style.outline = "", 1200);
  }
}



/* ========= 初始化 ========= */
document.addEventListener("DOMContentLoaded", () => {
  loadMods();
});