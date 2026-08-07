/* ============================================================
   REVUE — revue-article.js (page détail)
   Mécanique identique à Achitekti — seule la config et les
   textes changent.
   ============================================================ */

var currentArticleId = null;
var isRevueAdmin = false;

function toast(msg, type) {
  if (!type) type = 'success';
  var c = document.getElementById('toast');
  if (!c) return;
  var el = document.createElement('div');
  el.className = 'toast-item ' + type;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(function() { el.remove(); }, 3500);
}
function formatDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
function youtubeIconSvg() {
  return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.5V8.5L15.8 12Z"/></svg>';
}
function tiktokIconSvg() {
  return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.3c-.8-.7-1.3-1.7-1.4-2.8h-3.1v13.4c0 1.5-1.2 2.7-2.7 2.7s-2.7-1.2-2.7-2.7 1.2-2.7 2.7-2.7c.3 0 .6 0 .9.1V9.9c-.3 0-.6-.1-.9-.1-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6V9.2c1.2.9 2.7 1.4 4.3 1.4V7.5c-1 0-1.9-.4-2.6-1a4.6 4.6 0 0 1-.5-1.2Z"/></svg>';
}

async function loadArticle() {
  const supabase = await window.lakouKizinReady;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  currentArticleId = id;
  if (!id) { document.getElementById('revue-article-loading').textContent = 'Publication introuvable.'; return; }

  const res = await supabase.from('revue_posts')
    .select('*, category:revue_categories(id, slug, label), author:profiles!author_id(full_name, avatar_url), images:revue_post_images(id, url, order_index)')
    .eq('id', id)
    .single();

  const p = res.data;
  if (!p) { document.getElementById('revue-article-loading').textContent = 'Publication introuvable.'; return; }

  document.getElementById('revue-article-loading').classList.add('hidden');
  document.title = p.title + ' — Revue Lakou Kizin';
  document.getElementById('article-fil').textContent = p.title;

  supabase.rpc('increment_revue_view', { post_id: id }).then(() => {}, () => {});

  const catEl = document.getElementById('article-cat');
  if (p.category) { catEl.textContent = p.category.label; catEl.classList.remove('hidden'); }

  const titleEl = document.getElementById('article-title');
  titleEl.textContent = p.title;
  titleEl.classList.remove('hidden');

  const metaEl = document.getElementById('article-meta');
  const metaParts = [];
  if (p.author) metaParts.push(p.author.full_name);
  metaParts.push(formatDate(p.published_at || p.created_at));
  metaParts.push((p.view_count || 0) + 1 + ' vues');
  metaEl.textContent = metaParts.join(' · ');
  metaEl.classList.remove('hidden');

  if (p.cover_image_url) {
    document.getElementById('article-cover-img').src = p.cover_image_url;
    document.getElementById('article-cover-wrap').classList.remove('hidden');
  }
  if (p.video_url) {
    const videoEl = document.getElementById('article-video');
    videoEl.src = p.video_url;
    document.getElementById('article-video-wrap').classList.remove('hidden');
  }

  let socialHtml = '';
  if (p.youtube_url) socialHtml += `<a class="revue-social-link" href="${p.youtube_url}" target="_blank" rel="noopener">${youtubeIconSvg()} YouTube</a>`;
  if (p.tiktok_url)  socialHtml += `<a class="revue-social-link" href="${p.tiktok_url}" target="_blank" rel="noopener">${tiktokIconSvg()} TikTok</a>`;
  if (socialHtml) {
    document.getElementById('article-social-links').innerHTML = socialHtml;
    document.getElementById('article-social-links').classList.remove('hidden');
  }

  if (p.body) {
    const rawHtml = marked.parse(p.body);
    document.getElementById('article-body').innerHTML = DOMPurify.sanitize(rawHtml);
  }

  if (p.images && p.images.length) {
    p.images.sort((a, b) => a.order_index - b.order_index);
    let galHtml = '';
    for (const img of p.images) {
      galHtml += `<img src="${img.url}" alt="" onclick="window.open('${img.url}','_blank')">`;
    }
    document.getElementById('article-gallery').innerHTML = galHtml;
    document.getElementById('article-gallery').classList.remove('hidden');
  }

  await checkAdminActions();
}

async function checkAdminActions() {
  try {
    const supabase = await window.lakouKizinReady;
    const session = await sessionActuelle();
    if (!session || session.profile?.role !== 'admin') return;
    isRevueAdmin = true;
    document.getElementById('article-admin-actions').classList.remove('hidden');
  } catch (e) { /* visiteur non connecté */ }
}

function editArticle() {
  window.location.href = 'revue-admin.html?id=' + currentArticleId;
}

async function deleteArticle() {
  if (!isRevueAdmin) return;
  if (!confirm('Supprimer définitivement cette publication ?')) return;
  const supabase = await window.lakouKizinReady;
  const res = await supabase.from('revue_posts').delete().eq('id', currentArticleId);
  if (res.error) { toast(res.error.message, 'error'); return; }
  toast('Publication supprimée.');
  window.location.href = 'revue.html';
}

document.addEventListener('DOMContentLoaded', loadArticle);
