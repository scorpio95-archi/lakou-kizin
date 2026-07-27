// ============================================================
// LAKOU KIZIN — Page atelier (galerie)
// ============================================================

function svgVideoBadge(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`;
}

function pubCardHTML(pub){
  const media = (pub.publication_media || []).slice().sort((a,b) => a.position - b.position)[0];
  const isVideo = media?.type === 'video';
  const auteur = pub.profiles?.full_name ?? 'Étudiant';
  return `
  <a class="pub-card" href="publication.html?id=${pub.id}">
    <div class="pc-media">
      ${media ? (isVideo
          ? `<video src="${media.url}" muted playsinline></video><span class="pc-video-badge">${svgVideoBadge()}</span>`
          : `<img src="${media.url}" alt="${pub.titre}">`)
        : ''}
    </div>
    <div class="pc-body">
      <div class="pc-titre">${pub.titre}</div>
      <div class="pc-auteur">${auteur}</div>
      <div class="pc-stats">❤ ${pub.likes_count} · 💬 ${pub.comments_count}</div>
    </div>
  </a>`;
}

async function chargerAtelier(){
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const grid = document.getElementById('pubGrid');

  if (!slug) {
    document.getElementById('atelierNom').textContent = 'Atelier introuvable';
    grid.innerHTML = '<div class="pub-grid-empty">Aucun atelier sélectionné.</div>';
    return;
  }

  const supabase = await window.lakouKizinReady;
  const { data: atelier, error: atelierErr } = await supabase
    .from('ateliers')
    .select('id, nom, description, slug')
    .eq('slug', slug)
    .single();

  if (atelierErr || !atelier) {
    document.getElementById('atelierNom').textContent = 'Atelier introuvable';
    grid.innerHTML = '<div class="pub-grid-empty">Cet atelier n\'existe pas encore.</div>';
    return;
  }

  document.getElementById('atelierNom').textContent = atelier.nom;
  document.getElementById('atelierDesc').textContent = atelier.description || '';
  document.getElementById('filArianeAtelier').textContent = atelier.nom;
  document.getElementById('btnPublier').href = `publier.html?atelier=${atelier.slug}`;
  document.title = `${atelier.nom} — Lakou Kizin`;

  const { data: publications, error: pubErr } = await supabase
    .from('publications')
    .select('id, titre, likes_count, comments_count, profiles(full_name), publication_media(url, type, position)')
    .eq('atelier_id', atelier.id)
    .order('created_at', { ascending: false });

  if (pubErr || !publications || publications.length === 0) {
    grid.innerHTML = '<div class="pub-grid-empty">Aucune publication pour l\'instant dans cet atelier — sois le premier à partager !</div>';
    return;
  }

  grid.innerHTML = publications.map(pubCardHTML).join('');
}

chargerAtelier();
