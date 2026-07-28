// ============================================================
// LAKOU KIZIN — logique page d'accueil
// Nécessite supabase-client.js chargé avant ce fichier.
// ============================================================

const ATELIERS = [
  { slug: 'patisserie', nom: 'Pâtisserie', desc: 'Gâteaux, entremets, viennoiseries — la précision sucrée.' },
  { slug: 'boulangerie', nom: 'Boulangerie', desc: 'Pains, levains et fournées du quotidien.' },
  { slug: 'cuisine-locale', nom: 'Cuisine locale', desc: 'Les saveurs haïtiennes, du fondamental au raffiné.' },
  { slug: 'art-de-la-table', nom: 'Art de la table', desc: 'Dressage, service et présentation.' }
];

function svgPhoto(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 15l-5-5-4 4-3-3-6 6"/></svg>`;
}
function svgHeart(){
  return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-10-9.3C.4 8 2 4.5 5.5 4.5c2 0 3.5 1.2 4.5 2.7 1-1.5 2.5-2.7 4.5-2.7C18 4.5 19.6 8 22 11.7 19.5 16.4 12 21 12 21z"/></svg>`;
}

function ateliersCardHTML(atelier, count){
  return `
  <a class="atelier-card" href="atelier.html?slug=${atelier.slug}">
    <div class="ac-image">
      <img id="img-${atelier.slug}" src="" alt="${atelier.nom}" onerror="this.style.display='none'">
    </div>
    <div class="ac-body">
      <h3>${atelier.nom}</h3>
      <p>${atelier.desc}</p>
      <div class="ac-meta">${svgPhoto()} <span data-count="${atelier.slug}">${count ?? '…'}</span> créations partagées</div>
    </div>
  </a>`;
}

function creationCardHTML(pub){
  const img = (pub.publication_media && pub.publication_media[0]) ? pub.publication_media[0].url : '';
  return `
  <a class="creation-card" href="publication.html?id=${pub.id}">
    <div class="cc-image">${img ? `<img src="${img}" alt="${pub.titre}">` : ''}</div>
    <div class="cc-body">
      <div class="cc-titre">${pub.titre}</div>
      <div class="cc-auteur">${pub.profiles?.full_name ?? 'Étudiant Lakou Kizin'}</div>
      <div class="cc-stats"><span>${svgHeart()} ${pub.likes_count}</span></div>
    </div>
  </a>`;
}

async function chargerAteliers(){
  const grid = document.getElementById('ateliersGrid');
  grid.innerHTML = ATELIERS.map(a => ateliersCardHTML(a, null)).join('');

  const supabase = await window.lakouKizinReady;

  // Récupère les vrais IDs d'ateliers puis les compteurs réels (connecté à Supabase)
  const { data: ateliersData } = await supabase.from('ateliers').select('id, slug, image_url');
  if (!ateliersData) return;
  for (const a of ateliersData) {
    const { count } = await supabase
      .from('publications')
      .select('id', { count: 'exact', head: true })
      .eq('atelier_id', a.id);
    const compteurEl = document.querySelector(`[data-count="${a.slug}"]`);
    if (compteurEl) compteurEl.textContent = count ?? 0;

    const imgEl = document.getElementById(`img-${a.slug}`);
    if (imgEl && a.image_url) {
      imgEl.src = a.image_url;
      imgEl.style.display = '';
    }
  }
}

async function chargerCreations(){
  const wrap = document.getElementById('creationsScroll');
  const supabase = await window.lakouKizinReady;
  const { data, error } = await supabase
    .from('publications')
    .select('id, titre, likes_count, profiles(full_name), publication_media(url, position)')
    .eq('est_creation', true)
    .order('created_at', { ascending: false })
    .limit(12);

  if (error || !data || data.length === 0) {
    wrap.outerHTML = `<div class="creations-empty" id="creationsScroll">Aucune création mise en avant pour l'instant — les premiers succès des étudiants apparaîtront ici.</div>`;
    return;
  }
  wrap.innerHTML = data.map(creationCardHTML).join('');
}

chargerAteliers();
chargerCreations();
