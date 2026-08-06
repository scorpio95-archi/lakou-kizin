// ============================================================
// LAKOU KIZIN — annuaire.html
// Liste parcourable de la communauté (étudiant·e·s/enseignant·e·s),
// chaque carte mène vers la galerie publique de la personne.
// Les comptes "visiteur" (pas encore membres validés) n'apparaissent
// pas ici — l'annuaire représente la communauté active.
// ============================================================

const ROLE_LABELS = { etudiant: 'Étudiant', enseignant: 'Enseignant', admin: 'Administration' };
let annuaireData = [];
let filtreActuel = '';

function annuaireCardHTML(p) {
  const initiale = (p.full_name || '?').charAt(0).toUpperCase();
  const avatarHtml = p.avatar_url ? `<img src="${p.avatar_url}" alt="">` : initiale;
  return `
  <a class="annuaire-card" href="galerie.html?id=${p.id}">
    <div class="annuaire-avatar">${avatarHtml}</div>
    <div class="annuaire-body">
      <div class="annuaire-role">${ROLE_LABELS[p.role] || p.role}</div>
      <div class="annuaire-nom">${p.full_name}</div>
      ${p.atelier_principal ? `<div class="annuaire-atelier">${p.atelier_principal}</div>` : ''}
    </div>
  </a>`;
}

function filtrerAnnuaire(role, btn) {
  filtreActuel = role;
  document.querySelectorAll('.annuaire-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  rendreAnnuaire();
}

function rendreAnnuaire() {
  const grille = document.getElementById('annuaireGrille');
  const liste = filtreActuel ? annuaireData.filter(p => p.role === filtreActuel) : annuaireData;
  if (liste.length === 0) {
    grille.innerHTML = `<p class="pub-grid-empty">Personne à afficher pour cette catégorie.</p>`;
    return;
  }
  grille.innerHTML = liste.map(annuaireCardHTML).join('');
}

async function chargerAnnuaire() {
  const supabase = await window.lakouKizinReady;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, atelier_principal, avatar_url')
    .in('role', ['etudiant', 'enseignant', 'admin'])
    .order('full_name', { ascending: true });

  const grille = document.getElementById('annuaireGrille');
  if (error) {
    grille.innerHTML = `<p class="pub-grid-empty">Erreur de chargement.</p>`;
    return;
  }
  annuaireData = data || [];
  rendreAnnuaire();
}

chargerAnnuaire();
