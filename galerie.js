// ============================================================
// LAKOU KIZIN — galerie.html
// Profil public d'un·e étudiant·e/enseignant·e : avatar, atelier
// principal, bio, et toutes ses publications. Générique par
// ?id=<user_id> — sans id, on affiche le profil de la personne
// connectée si elle l'est.
// Consultation libre (comme atelier.html/publication.html) —
// pas de mur de connexion pour VOIR une galerie.
// ============================================================

const ROLE_LABELS = { etudiant: 'Étudiant', enseignant: 'Enseignant', admin: 'Administration', visiteur: 'Visiteur' };

function svgVideoBadge() {
  return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
}

function galerieCardHTML(pub) {
  const media = (pub.publication_media || []).slice().sort((a, b) => a.position - b.position)[0];
  const isVideo = media?.type === 'video';
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
      <div class="pc-auteur">${pub.ateliers?.nom || ''}</div>
      <div class="pc-stats">❤ ${pub.likes_count || 0}</div>
    </div>
  </a>`;
}

async function chargerGalerie() {
  const params = new URLSearchParams(window.location.search);
  let userId = params.get('id');

  if (!userId) {
    const session = await sessionActuelle();
    if (session) userId = session.user.id;
  }

  if (!userId) {
    document.getElementById('galerieIntrouvable').style.display = 'block';
    document.getElementById('galerieIntrouvable').textContent =
      "Aucun profil à afficher — connecte-toi pour voir ta propre galerie, ou ouvre le lien d'un profil précis.";
    return;
  }

  const supabase = await window.lakouKizinReady;

  const { data: profil, error: profilErr } = await supabase
    .from('profiles')
    .select('id, full_name, role, atelier_principal, avatar_url, bio')
    .eq('id', userId)
    .single();

  if (profilErr || !profil) {
    document.getElementById('galerieIntrouvable').style.display = 'block';
    return;
  }

  document.title = `${profil.full_name} — Galerie Lakou Kizin`;
  document.getElementById('filArianeGalerie').textContent = profil.full_name;

  const avatarEl = document.getElementById('galerieAvatar');
  if (profil.avatar_url) {
    avatarEl.innerHTML = `<img src="${profil.avatar_url}" alt="">`;
  } else {
    avatarEl.textContent = (profil.full_name || '?').charAt(0).toUpperCase();
  }

  document.getElementById('galerieRole').textContent = ROLE_LABELS[profil.role] || profil.role;
  document.getElementById('galerieNom').textContent = profil.full_name;
  document.getElementById('galerieAtelier').textContent = profil.atelier_principal || '';
  document.getElementById('galerieAtelier').style.display = profil.atelier_principal ? 'block' : 'none';
  document.getElementById('galerieBio').textContent = profil.bio || '';
  document.getElementById('galerieBio').style.display = profil.bio ? 'block' : 'none';

  document.getElementById('galerieContenu').style.display = 'block';

  const { data: pubs, error: pubsErr } = await supabase
    .from('publications')
    .select('id, titre, likes_count, created_at, ateliers(nom), publication_media(url, type, position)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const grille = document.getElementById('pubGrid');
  if (pubsErr || !pubs || pubs.length === 0) {
    grille.innerHTML = `<p class="pub-grid-empty">Aucune création publiée pour le moment.</p>`;
    return;
  }
  grille.innerHTML = pubs.map(galerieCardHTML).join('');
}

chargerGalerie();
