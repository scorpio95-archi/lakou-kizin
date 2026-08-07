/* ============================================================
   REVUE — revue.js (page liste)
   Mécanique identique à Achitekti (catégories, recherche,
   pagination, barre admin) — seul le style/habillage change.
   ============================================================ */

var revueCategories  = [];
var revueCategoryId  = '';
var revueSearchTerm  = '';
var revuePage        = 0;
var revueSearchTimer = null;

function formatDuration(seconds) {
  if (!seconds) return '';
  var m = Math.floor(seconds / 60);
  var s = Math.floor(seconds % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}
function formatDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const PAGE_SIZE = 12;

/* ---------- Catégories ---------- */
async function loadRevueCategories() {
  const supabase = await window.lakouKizinReady;
  const res = await supabase.from('revue_categories').select('*').order('sort_order', { ascending: true });
  revueCategories = res.data || [];
  const c = document.getElementById('revue-categories');
  if (!c) return;
  let html = '<button class="revue-cat-pill active" data-slug="" onclick="setRevueCategory(\'\', this)">Tout</button>';
  for (const cat of revueCategories) {
    html += `<button class="revue-cat-pill" data-id="${cat.id}" onclick="setRevueCategory('${cat.id}', this)">${cat.label}</button>`;
  }
  c.innerHTML = html;
}

function setRevueCategory(categoryId, btn) {
  revueCategoryId = categoryId;
  document.querySelectorAll('.revue-cat-pill').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadRevuePosts(true);
}

function onRevueSearchInput() {
  clearTimeout(revueSearchTimer);
  revueSearchTimer = setTimeout(() => {
    revueSearchTerm = document.getElementById('revue-search').value.trim();
    loadRevuePosts(true);
  }, 400);
}

/* ---------- Publications ---------- */
async function loadRevuePosts(reset) {
  const supabase = await window.lakouKizinReady;
  if (reset) { revuePage = 0; document.getElementById('revue-grid').innerHTML = ''; }

  const loadMoreBtn = document.getElementById('revue-load-more-btn');
  const loadMoreWrap = document.getElementById('revue-load-more-wrap');
  if (loadMoreBtn) { loadMoreBtn.disabled = true; loadMoreBtn.textContent = 'Chargement...'; }

  const from = revuePage * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase.from('revue_posts')
    .select('*, category:revue_categories(id, slug, label), author:profiles!author_id(full_name, avatar_url)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(from, to);

  if (revueCategoryId) query = query.eq('category_id', revueCategoryId);
  if (revueSearchTerm) query = query.ilike('title', '%' + revueSearchTerm + '%');

  const res = await query;
  const posts = res.data || [];

  if (reset && posts.length === 0) {
    afficherEtatVide();
  } else {
    document.getElementById('revue-empty-state')?.remove();
    renderRevueCards(posts);
  }

  revuePage++;
  if (loadMoreWrap) loadMoreWrap.classList.toggle('hidden', posts.length < PAGE_SIZE);
  if (loadMoreBtn) { loadMoreBtn.disabled = false; loadMoreBtn.textContent = 'Charger plus'; }
}

/* ---------- État vide — communauté naissante, pas une page morte ---------- */
function afficherEtatVide() {
  const grid = document.getElementById('revue-grid');
  const catsHtml = revueCategories.map(c => `<div class="revue-empty-cat"><span>${c.label}</span></div>`).join('');
  grid.innerHTML = `
    <div id="revue-empty-state" class="revue-empty-state">
      <p class="revue-empty-kicker">La communauté s'écrit</p>
      <h2>Les premières pages de la Revue arrivent bientôt</h2>
      <p class="revue-empty-text">Recettes, portraits d'ateliers et coulisses de Lakou Kizin — les premiers articles seront publiés ici dès qu'ils seront prêts. Voici les rubriques à venir :</p>
      <div class="revue-empty-cats">${catsHtml}</div>
    </div>`;
}

function renderRevueCards(posts) {
  const grid = document.getElementById('revue-grid');
  let html = '';
  for (const p of posts) {
    const catLabel = p.category ? p.category.label : '';
    const author = p.author ? p.author.full_name : '';
    const duration = p.video_duration_seconds ? `<span class="revue-card-duration">▶ ${formatDuration(p.video_duration_seconds)}</span>` : '';
    const imgHtml = p.cover_image_url
      ? `<img src="${p.cover_image_url}" alt="">`
      : `<div class="revue-card-fallback">${p.title.charAt(0)}</div>`;

    html += `<div class="revue-card" onclick="window.location.href='revue-article.html?id=${p.id}'">
      <div class="revue-card-img">${imgHtml}${duration}${catLabel ? `<span class="revue-card-cat">${catLabel}</span>` : ''}</div>
      <div class="revue-card-body">
        <h3 class="revue-card-title">${p.title}</h3>
        ${p.summary ? `<p class="revue-card-summary">${p.summary}</p>` : ''}
        <div class="revue-card-meta">${author ? `<span>${author}</span><span class="dot">·</span>` : ''}<span>${formatDate(p.published_at || p.created_at)}</span></div>
      </div>
    </div>`;
  }
  grid.insertAdjacentHTML('beforeend', html);
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  loadRevueCategories();
  loadRevuePosts(true);

  try {
    const session = await sessionActuelle();
    if (session && session.profile?.role === 'admin') {
      document.getElementById('revue-admin-bar')?.classList.remove('hidden');
    }
  } catch (e) { /* visiteur non connecté */ }
});
