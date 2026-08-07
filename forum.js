/* ============================================================
   FORUM — forum.js (liste des sujets)
   Réservé aux connectés dont le rôle est etudiant/enseignant/admin
   (les comptes "visiteur" n'y ont pas accès).
   ============================================================ */

let forumCategory = '';
const CAT_LABELS = { questions: 'Questions', projets: 'Projets', ressources: 'Ressources', entraide: 'Entraide', annonces: 'Annonces' };
let currentUser = null;

function toast(msg, type) {
  if (!type) type = 'success';
  const c = document.getElementById('toast');
  if (!c) return;
  const el = document.createElement('div');
  el.className = 'toast-item ' + type;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ---------- Garde d'accès ---------- */
(async function initForum() {
  const session = await sessionActuelle();
  if (!session) {
    document.getElementById('forum-guard-msg').textContent = 'Connexion requise. Redirection…';
    setTimeout(() => window.location.href = 'connexion.html', 1200);
    return;
  }
  currentUser = session.user;
  const role = session.profile?.role;

  if (!role || role === 'visiteur') {
    document.getElementById('forum-guard-msg').textContent = "Le forum est réservé aux étudiant·e·s et enseignant·e·s. Ton compte n'y a pas encore accès.";
    setTimeout(() => window.location.href = 'dashboard.html', 2200);
    return;
  }

  document.getElementById('forum-guard-msg').classList.add('hidden');
  document.getElementById('forum-content').classList.remove('hidden');
  loadTopics();
})();

/* ---------- Catégories ---------- */
function setForumCategory(cat, btn) {
  forumCategory = cat;
  document.querySelectorAll('.forum-cat-pill').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadTopics();
}

/* ---------- Liste des sujets ---------- */
async function loadTopics() {
  const supabase = await window.lakouKizinReady;
  const list = document.getElementById('forum-topics-list');
  list.innerHTML = '<p class="pub-grid-empty">Chargement…</p>';

  let query = supabase.from('forum_topics')
    .select('*, author:profiles!author_id(full_name, avatar_url)')
    .order('created_at', { ascending: false });
  if (forumCategory) query = query.eq('category', forumCategory);

  const res = await query;
  if (res.error) { list.innerHTML = `<p class="pub-grid-empty">Erreur de chargement : ${res.error.message}</p>`; return; }

  const topics = res.data || [];
  if (topics.length === 0) {
    list.innerHTML = '<p class="pub-grid-empty">Aucun sujet pour le moment — sois le·la premier·ère à en ouvrir un.</p>';
    return;
  }

  const counts = {};
  await Promise.all(topics.map(async (t) => {
    const r = await supabase.from('forum_replies').select('*', { count: 'exact', head: true }).eq('topic_id', t.id);
    counts[t.id] = r.count || 0;
  }));

  list.innerHTML = topics.map(t => {
    const author = t.author ? t.author.full_name : '—';
    const resolved = t.status === 'resolved';
    return `<div class="forum-topic-row${resolved ? ' resolved' : ''}" onclick="window.location.href='forum-sujet.html?id=${t.id}'">
      <div class="forum-topic-main">
        <span class="forum-topic-cat">${CAT_LABELS[t.category] || t.category}</span>
        ${resolved ? '<span class="forum-topic-resolved">🔒 Résolu</span>' : ''}
        <h3 class="forum-topic-title">${t.title}</h3>
        <div class="forum-topic-meta">${author} · ${formatDate(t.created_at)} · ${counts[t.id]} réponse${counts[t.id] > 1 ? 's' : ''}</div>
      </div>
    </div>`;
  }).join('');
}

/* ---------- Nouveau sujet ---------- */
function ouvrirNouveauSujet() {
  document.getElementById('forum-new-title').value = '';
  document.getElementById('forum-new-content').value = '';
  document.getElementById('forum-new-category').value = forumCategory || 'questions';
  document.getElementById('forum-modal-msg').textContent = '';
  document.getElementById('forum-modal-overlay').classList.add('open');
}
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('forum-modal-close');
  const overlay = document.getElementById('forum-modal-overlay');
  if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
  if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
});

async function doCreateTopic() {
  const supabase = await window.lakouKizinReady;
  const title = document.getElementById('forum-new-title').value.trim();
  const content = document.getElementById('forum-new-content').value.trim();
  const category = document.getElementById('forum-new-category').value;
  const msg = document.getElementById('forum-modal-msg');
  if (!title) { msg.textContent = 'Le titre est obligatoire.'; msg.style.color = '#a3341f'; return; }
  if (!content) { msg.textContent = 'Le message est obligatoire.'; msg.style.color = '#a3341f'; return; }

  const btn = document.getElementById('forum-new-submit');
  btn.disabled = true; btn.textContent = 'Publication…';

  const res = await supabase.from('forum_topics').insert({
    title, content, category, author_id: currentUser.id, status: 'open'
  }).select().single();

  btn.disabled = false; btn.textContent = 'Publier';
  if (res.error) { msg.textContent = res.error.message; msg.style.color = '#a3341f'; return; }

  document.getElementById('forum-modal-overlay').classList.remove('open');
  window.location.href = 'forum-sujet.html?id=' + res.data.id;
}
