/* ============================================================
   FORUM — forum-sujet.js (détail d'un sujet)
   Mécanique identique à Achitekti — config/rôles adaptés.
   ============================================================ */

let currentUser = null;
let currentProfile = null;
let topicId = null;
let topicData = null;
let repliesCache = [];
let votesCache = [];

const CAT_LABELS = { questions: 'Questions', projets: 'Projets', ressources: 'Ressources', entraide: 'Entraide', annonces: 'Annonces' };

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
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s || '';
  return div.innerHTML;
}

/* ---------- Garde d'accès + init ---------- */
(async function initSujet() {
  const params = new URLSearchParams(window.location.search);
  topicId = params.get('id');
  if (!topicId) { window.location.href = 'forum.html'; return; }

  const session = await sessionActuelle();
  if (!session) { window.location.href = 'connexion.html'; return; }
  currentUser = session.user;
  currentProfile = session.profile;
  const role = currentProfile?.role;
  if (!role || role === 'visiteur') { window.location.href = 'dashboard.html'; return; }

  await loadTopic();
})();

async function loadTopic() {
  const supabase = await window.lakouKizinReady;
  const res = await supabase.from('forum_topics')
    .select('*, author:profiles!author_id(full_name, avatar_url)')
    .eq('id', topicId)
    .single();

  if (res.error || !res.data) {
    document.getElementById('sujet-guard-msg').textContent = 'Ce sujet est introuvable ou inaccessible.';
    return;
  }
  topicData = res.data;

  document.getElementById('sujet-guard-msg').classList.add('hidden');
  document.getElementById('sujet-content').classList.remove('hidden');
  document.title = topicData.title + ' — Forum Lakou Kizin';
  document.getElementById('sujet-fil').textContent = topicData.title;

  renderTopic();
  renderResolveBar();
  await loadReplies();
}

function renderTopic() {
  const t = topicData;
  const author = t.author ? t.author.full_name : '—';
  const resolved = t.status === 'resolved';
  let html = '';
  html += `<span class="forum-topic-cat">${CAT_LABELS[t.category] || t.category}</span>`;
  if (resolved) html += '<span class="forum-topic-resolved">🔒 Résolu</span>';
  html += `<h1 class="forum-detail-title">${escapeHtml(t.title)}</h1>`;
  html += `<div class="forum-topic-meta">${escapeHtml(author)} · ${formatDate(t.created_at)}</div>`;
  html += `<div class="forum-detail-content">${escapeHtml(t.content).replace(/\n/g, '<br>')}</div>`;
  document.getElementById('forum-topic-detail').innerHTML = html;

  document.getElementById('forum-reply-form').classList.toggle('hidden', resolved);
  document.getElementById('forum-locked-msg').classList.toggle('hidden', !resolved);
}

function renderResolveBar() {
  const bar = document.getElementById('admin-resolve-bar');
  if (!currentProfile || currentProfile.role !== 'admin') { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  const resolved = topicData.status === 'resolved';
  bar.innerHTML = `<button class="btn-secondaire" onclick="toggleResolved()">${resolved ? 'Rouvrir le sujet' : 'Marquer comme résolu'}</button>`;
}

async function toggleResolved() {
  const supabase = await window.lakouKizinReady;
  const newStatus = topicData.status === 'resolved' ? 'open' : 'resolved';
  const res = await supabase.from('forum_topics').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', topicId);
  if (res.error) { toast(res.error.message, 'error'); return; }
  topicData.status = newStatus;
  toast(newStatus === 'resolved' ? 'Sujet marqué comme résolu.' : 'Sujet rouvert.');
  renderTopic();
  renderResolveBar();
}

/* ---------- Réponses + votes ---------- */
async function loadReplies() {
  const supabase = await window.lakouKizinReady;
  const list = document.getElementById('forum-replies-list');
  list.innerHTML = '<p class="pub-grid-empty">Chargement des réponses…</p>';

  const res = await supabase.from('forum_replies')
    .select('*, author:profiles!author_id(full_name, avatar_url)')
    .eq('topic_id', topicId)
    .order('created_at', { ascending: true });

  repliesCache = res.data || [];
  document.getElementById('forum-replies-count').textContent = repliesCache.length + ' réponse' + (repliesCache.length > 1 ? 's' : '');

  if (repliesCache.length === 0) {
    votesCache = [];
    list.innerHTML = '<p class="pub-grid-empty">Aucune réponse pour le moment.</p>';
    return;
  }

  const replyIds = repliesCache.map(r => r.id);
  const votesRes = await supabase.from('forum_reply_votes').select('*').in('reply_id', replyIds);
  votesCache = votesRes.data || [];

  renderReplies();
}

function renderReplies() {
  const list = document.getElementById('forum-replies-list');
  list.innerHTML = repliesCache.map(r => {
    const author = r.author ? r.author.full_name : '—';
    const repliesVotes = votesCache.filter(v => v.reply_id === r.id);
    const usefulCount = repliesVotes.filter(v => v.vote_type === 'useful').length;
    const notRelevantCount = repliesVotes.filter(v => v.vote_type === 'not_relevant').length;
    const myVote = repliesVotes.find(v => v.user_id === currentUser.id);

    return `<div class="forum-reply-card">
      <div class="forum-topic-meta">${escapeHtml(author)} · ${formatDate(r.created_at)}</div>
      <div class="forum-reply-content">${escapeHtml(r.content).replace(/\n/g, '<br>')}</div>
      <div class="forum-vote-row">
        <button class="forum-vote-btn${myVote && myVote.vote_type === 'useful' ? ' active' : ''}" onclick="doVote('${r.id}','useful')">👍 Utile (${usefulCount})</button>
        <button class="forum-vote-btn${myVote && myVote.vote_type === 'not_relevant' ? ' active' : ''}" onclick="doVote('${r.id}','not_relevant')">👎 Non pertinent (${notRelevantCount})</button>
      </div>
    </div>`;
  }).join('');
}

async function doVote(replyId, type) {
  const supabase = await window.lakouKizinReady;
  const existing = votesCache.find(v => v.reply_id === replyId && v.user_id === currentUser.id);

  if (existing && existing.vote_type === type) {
    const delRes = await supabase.from('forum_reply_votes').delete().eq('id', existing.id);
    if (delRes.error) { toast(delRes.error.message, 'error'); return; }
    votesCache = votesCache.filter(v => v.id !== existing.id);
  } else if (existing) {
    const updRes = await supabase.from('forum_reply_votes').update({ vote_type: type }).eq('id', existing.id);
    if (updRes.error) { toast(updRes.error.message, 'error'); return; }
    existing.vote_type = type;
  } else {
    const insRes = await supabase.from('forum_reply_votes').insert({ reply_id: replyId, user_id: currentUser.id, vote_type: type }).select().single();
    if (insRes.error) { toast(insRes.error.message, 'error'); return; }
    votesCache.push(insRes.data);
  }
  renderReplies();
}

async function doPostReply() {
  const supabase = await window.lakouKizinReady;
  const content = document.getElementById('forum-reply-content').value.trim();
  if (!content) { toast("Écris une réponse avant d'envoyer.", 'error'); return; }

  const btn = document.getElementById('forum-reply-submit');
  btn.disabled = true; btn.textContent = 'Envoi…';

  const res = await supabase.from('forum_replies').insert({ topic_id: topicId, content, author_id: currentUser.id });

  btn.disabled = false; btn.textContent = 'Répondre';
  if (res.error) { toast(res.error.message, 'error'); return; }

  document.getElementById('forum-reply-content').value = '';
  toast('Réponse publiée !');
  loadReplies();
}
