// ============================================================
// LAKOU KIZIN — Page publication (détail)
// ============================================================

let PUB_ID = null;
let SESSION = null;

function initiales(nom){
  return (nom || '?').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
}

function formatDate(iso){
  return new Date(iso).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
}

function renderCarousel(medias){
  const track = document.getElementById('carouselTrack');
  const dots = document.getElementById('carouselDots');
  const tries = medias.slice().sort((a,b) => a.position - b.position);

  track.innerHTML = tries.map(m => `
    <div class="carousel-slide">
      ${m.type === 'video'
        ? `<video src="${m.url}" controls playsinline preload="metadata"></video>`
        : `<img src="${m.url}" alt="">`}
    </div>`).join('');

  if (tries.length > 1) {
    dots.innerHTML = tries.map((_, i) => `<span class="${i === 0 ? 'active' : ''}"></span>`).join('');
    track.addEventListener('scroll', () => {
      const index = Math.round(track.scrollLeft / track.clientWidth);
      dots.querySelectorAll('span').forEach((d, i) => d.classList.toggle('active', i === index));
    });
  }
}

function renderComments(comments){
  const list = document.getElementById('commentsList');
  if (!comments || comments.length === 0) {
    list.innerHTML = '<div class="comments-empty">Aucun commentaire — sois le premier à encourager !</div>';
    return;
  }
  list.innerHTML = comments.map(c => `
    <div class="comment-item">
      <div class="comment-avatar">${initiales(c.profiles?.full_name)}</div>
      <div class="comment-body">
        <div class="comment-auteur">${c.profiles?.full_name ?? 'Étudiant'}</div>
        <div class="comment-texte">${c.contenu}</div>
        <div class="comment-date">${formatDate(c.created_at)}</div>
      </div>
    </div>`).join('');
}

function renderCommentZone(){
  const zone = document.getElementById('commentZone');
  if (!SESSION) {
    zone.innerHTML = `<div class="connexion-requise"><a href="connexion.html">Connecte-toi</a> pour commenter.</div>`;
    return;
  }
  zone.innerHTML = `
    <form class="form-commentaire" id="formCommentaire">
      <textarea id="texteCommentaire" placeholder="Écris un commentaire encourageant…" required maxlength="500"></textarea>
      <button type="submit">Envoyer</button>
    </form>`;
  document.getElementById('formCommentaire').addEventListener('submit', async (e) => {
    e.preventDefault();
    const textarea = document.getElementById('texteCommentaire');
    const contenu = textarea.value.trim();
    if (!contenu) return;
    const supabase = await window.lakouKizinReady;
    const { error } = await supabase.from('comments').insert({
      publication_id: PUB_ID, user_id: SESSION.user.id, contenu
    });
    if (!error) {
      textarea.value = '';
      await chargerCommentaires();
    }
  });
}

async function chargerCommentaires(){
  const supabase = await window.lakouKizinReady;
  const { data } = await supabase
    .from('comments')
    .select('id, contenu, created_at, profiles(full_name)')
    .eq('publication_id', PUB_ID)
    .order('created_at', { ascending: true });
  renderComments(data);
}

async function initLike(likesCountInitial){
  const supabase = await window.lakouKizinReady;
  const btn = document.getElementById('btnLike');
  const countEl = document.getElementById('likeCount');
  countEl.textContent = likesCountInitial;

  let dejaLike = false;
  if (SESSION) {
    const { data } = await supabase
      .from('likes').select('id')
      .eq('publication_id', PUB_ID).eq('user_id', SESSION.user.id)
      .maybeSingle();
    dejaLike = !!data;
    btn.classList.toggle('liked', dejaLike);
  }

  btn.addEventListener('click', async () => {
    if (!SESSION) { window.location.href = 'connexion.html'; return; }
    btn.disabled = true;
    if (dejaLike) {
      await supabase.from('likes').delete().eq('publication_id', PUB_ID).eq('user_id', SESSION.user.id);
      countEl.textContent = parseInt(countEl.textContent) - 1;
    } else {
      await supabase.from('likes').insert({ publication_id: PUB_ID, user_id: SESSION.user.id });
      countEl.textContent = parseInt(countEl.textContent) + 1;
    }
    dejaLike = !dejaLike;
    btn.classList.toggle('liked', dejaLike);
    btn.disabled = false;
  });
}

async function chargerPublication(){
  const params = new URLSearchParams(window.location.search);
  PUB_ID = params.get('id');
  if (!PUB_ID) { document.getElementById('pubTitre').textContent = 'Publication introuvable'; return; }

  SESSION = await sessionActuelle();
  const supabase = await window.lakouKizinReady;

  const { data: pub, error } = await supabase
    .from('publications')
    .select('id, titre, description, created_at, views_count, likes_count, profiles(full_name), ateliers(nom, slug), publication_media(url, type, position)')
    .eq('id', PUB_ID)
    .single();

  if (error || !pub) {
    document.getElementById('pubTitre').textContent = 'Publication introuvable';
    return;
  }

  document.title = `${pub.titre} — Lakou Kizin`;
  document.getElementById('pubTitre').textContent = pub.titre;
  document.getElementById('pubAuteur').textContent = pub.profiles?.full_name ?? 'Étudiant';
  document.getElementById('pubDate').textContent = formatDate(pub.created_at);
  document.getElementById('pubDesc').textContent = pub.description || '';
  document.getElementById('vuesCount').textContent = pub.views_count;

  const lienAtelier = document.getElementById('filArianeAtelier');
  lienAtelier.textContent = pub.ateliers?.nom ?? 'Atelier';
  lienAtelier.href = `atelier.html?slug=${pub.ateliers?.slug ?? ''}`;

  renderCarousel(pub.publication_media || []);
  await initLike(pub.likes_count);
  renderCommentZone();
  await chargerCommentaires();

  // Compteur de vues réel — incrémenté une fois par affichage
  supabase.rpc('increment_views', { pub_id: PUB_ID }).then(() => {
    document.getElementById('vuesCount').textContent = pub.views_count + 1;
  });
}

chargerPublication();
