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

/* ========= 加载 CSV ========= */
async function loadMods() {
  const res = await fetch("./data/mods.csv");
  const text = await res.text();
  mods = parseCSV(text);
  renderMods(mods);
  renderTagChips();
}

/* ========= 渲染 Mod 卡片 ========= */
function renderMods(list) {
  const container = document.getElementById("modContainer");
  container.innerHTML = "";

  const favorites = getFavorites();

  list.forEach(mod => {
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
      <p class="mod-desc">描述：${mod.summary || "-"}</p>
      <p class="tags">标签：<span class="tag-list">${tagsHTML || "-"}</span></p>
      
    `;

    container.appendChild(card);
  });

  // 收藏按钮事件
  document.querySelectorAll(".fav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      toggleFavorite(id);
      btn.textContent = getFavorites().includes(id) ? "⭐" : "☆";
    });
  });
}

/* ========= 标签统计 + 筛选 ========= */
function renderTagChips() {
  const tagCountMap = new Map();

  mods.forEach(mod => {
    parseTags(mod.tags).forEach(tag => {
      tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
    });
  });

  const container = document.getElementById("tagContainer");
  container.innerHTML = "";

  const allChip = document.createElement("span");
  allChip.className = "tag-chip active";
  allChip.textContent = `全部 (${mods.length})`;
  allChip.addEventListener("click", () => {
    document.querySelectorAll(".tag-chip").forEach(c => c.classList.remove("active"));
    allChip.classList.add("active");
    renderMods(mods);
  });
  container.appendChild(allChip);

  Array.from(tagCountMap.entries()).forEach(([tag, count]) => {
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
      parseTags(m.tags).some(tag => tag.toLowerCase().includes(query))
    );
    renderMods(filtered);
  });
}

/* ========= 主页面收藏列表 ========= */
let showingFavorites = false;
function renderFavoriteList() {
  const container = document.getElementById("modContainer");
  container.innerHTML = "";

  const favs = getFavorites();
  const favMods = mods.filter(m => favs.includes(m.mod_id));

  if (favMods.length === 0) {
    container.innerHTML = "<p>暂无收藏</p>";
    return;
  }

  favMods.forEach(mod => {
    const div = document.createElement("div");
    div.className = "fav-item";
    div.textContent = `${mod.name_cn || mod.title_en} (#${mod.mod_id})`;
    container.appendChild(div);
  });
}

document.getElementById("favToggleBtn")?.addEventListener("click", () => {
  showingFavorites = !showingFavorites;

  if (showingFavorites) {
    renderFavoriteList();
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
  const favMods = mods.filter(m => favs.includes(m.mod_id));

  if (favMods.length === 0) {
    list.innerHTML = "<li>暂无收藏</li>";
    return;
  }

  favMods.forEach((mod, index) => {
    const li = document.createElement("li");
    li.style.cursor = "pointer";
    li.style.padding = "8px 12px";
    li.style.borderBottom = "1px solid #eee";
    li.innerHTML = `<span class="fav-index">${index + 1}.</span> 
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