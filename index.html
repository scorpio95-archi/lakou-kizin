// ============================================================
// LAKOU KIZIN — dashboard.html
// Réplique du modèle Achitekti : ateliers avec compteurs temps
// réel, mes publications, Statistiques (admin), Modération
// (admin — supprime toute publication contraire aux règles),
// Utilisateurs (admin + enseignant, rôle éditable admin only).
// ============================================================

var SESSION = null;
var ROLE_LABELS_DASH = { etudiant: 'étudiant·e', enseignant: 'enseignant·e', admin: 'administrateur·rice', visiteur: 'visiteur·se' };

(async function initDashboard() {
  SESSION = await sessionActuelle();
  if (!SESSION) { window.location.href = 'connexion.html'; return; }

  document.getElementById('dash-loading').style.display = 'none';
  document.getElementById('dash-content').style.display = 'block';

  var nom = SESSION.profile?.full_name || SESSION.user.email;
  var role = SESSION.profile?.role || 'etudiant';

  document.getElementById('dash-title-bienvenue').textContent = 'Bonjour, ' + nom;
  document.getElementById('dash-sub-role').textContent = 'Connecté·e en tant que ' + (ROLE_LABELS_DASH[role] || role) + ' — Lakou Kizin';

  if (role === 'visiteur') return; // pas d'ateliers/publications pour un visiteur

  document.getElementById('dash-ateliers').style.display = 'block';
  document.getElementById('dash-publications').style.display = 'block';
  chargerDashAteliers();
  chargerDashPublications();

  if (role === 'admin') {
    document.getElementById('dash-stats').style.display = 'block';
    document.getElementById('dash-moderation').style.display = 'block';
    chargerDashStats();
    chargerDashModeration();
  }
  if (role === 'admin' || role === 'enseignant') {
    document.getElementById('dash-users').style.display = 'block';
    chargerDashUsers();
  }
})();

/* ------------------------------------------------------------
   Mes ateliers — compteurs en temps réel, un par atelier
------------------------------------------------------------ */
async function chargerDashAteliers() {
  const supabase = await window.lakouKizinReady;
  const grid = document.getElementById('dash-ateliers-grid');

  const { data: ateliers } = await supabase.from('ateliers').select('id, slug, nom').order('ordre', { ascending: true });
  if (!ateliers || ateliers.length === 0) { grid.innerHTML = '<p class="pub-grid-empty">Aucun atelier configuré.</p>'; return; }

  let html = '';
  for (const a of ateliers) {
    const { count } = await supabase.from('publications').select('*', { count: 'exact', head: true })
      .eq('user_id', SESSION.user.id).eq('atelier_id', a.id);
    html += `<a class="dash-atelier-mini" href="atelier.html?slug=${a.slug}">
      <span class="dash-atelier-mini-num">${count || 0}</span>
      <span class="dash-atelier-mini-label">${a.nom}</span>
    </a>`;
  }
  grid.innerHTML = html;

  // Mise à jour en direct si une publication est ajoutée/supprimée pendant que le dashboard est ouvert
  supabase.channel('dash-publications-' + SESSION.user.id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'publications', filter: 'user_id=eq.' + SESSION.user.id },
      () => chargerDashAteliers())
    .subscribe();
}

/* ------------------------------------------------------------
   Mes publications
------------------------------------------------------------ */
async function chargerDashPublications() {
  const supabase = await window.lakouKizinReady;
  const list = document.getElementById('dash-publications-list');
  const { data } = await supabase.from('publications')
    .select('id, titre, created_at, ateliers(nom)')
    .eq('user_id', SESSION.user.id)
    .order('created_at', { ascending: false });

  if (!data || data.length === 0) {
    list.innerHTML = '<p class="pub-grid-empty">Aucune publication pour le moment.</p>';
    return;
  }
  list.innerHTML = data.map(p => `
    <div class="dash-row" onclick="window.location.href='publication.html?id=${p.id}'">
      <span class="dash-row-titre">${p.titre}</span>
      <span class="dash-row-meta">${p.ateliers?.nom || ''}</span>
    </div>`).join('');
}

/* ------------------------------------------------------------
   Statistiques — admin uniquement
------------------------------------------------------------ */
async function chargerDashStats() {
  const supabase = await window.lakouKizinReady;

  const { count: inscrits } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  document.getElementById('dash-stats-inscrits').textContent = inscrits ?? 0;

  supabase.channel('dash-profiles-count')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
      const el = document.getElementById('dash-stats-inscrits');
      el.textContent = (parseInt(el.textContent, 10) || 0) + 1;
    })
    .subscribe();

  const { data: ateliers } = await supabase.from('ateliers').select('id, nom').order('ordre', { ascending: true });
  const { data: pubs } = await supabase.from('publications').select('atelier_id');

  document.getElementById('dash-stats-publications').textContent = (pubs || []).length;

  const counts = {};
  (ateliers || []).forEach(a => counts[a.id] = 0);
  (pubs || []).forEach(p => { if (counts[p.atelier_id] !== undefined) counts[p.atelier_id]++; });

  new Chart(document.getElementById('dash-stats-chart'), {
    type: 'bar',
    data: {
      labels: (ateliers || []).map(a => a.nom),
      datasets: [{ data: (ateliers || []).map(a => counts[a.id]), backgroundColor: '#c1481d', borderRadius: 4 }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } } }, x: { ticks: { font: { size: 9 } } } }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('dash-btn-rapport');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const supabase = await window.lakouKizinReady;
    const msg = document.getElementById('dash-rapport-msg');
    btn.disabled = true; btn.textContent = 'Envoi…';
    msg.textContent = '';
    const res = await supabase.functions.invoke('send-dashboard-report');
    btn.disabled = false; btn.textContent = 'Envoyer un rapport';
    if (res.error) {
      let detail = res.error.message || 'Erreur inconnue.';
      if (res.error.context && typeof res.error.context.json === 'function') {
        try { const body = await res.error.context.json(); if (body?.error) detail = body.error; } catch (e) {}
      }
      msg.textContent = "Échec de l'envoi : " + detail;
      msg.style.color = '#991b1b';
      return;
    }
    msg.textContent = 'Rapport envoyé par email.';
    msg.style.color = '#166534';
  });
});

/* ------------------------------------------------------------
   Modération — admin uniquement, supprime toute publication
------------------------------------------------------------ */
async function chargerDashModeration() {
  const supabase = await window.lakouKizinReady;
  const list = document.getElementById('dash-moderation-list');
  const { data } = await supabase.from('publications')
    .select('id, titre, created_at, profiles(full_name), ateliers(nom)')
    .order('created_at', { ascending: false })
    .limit(30);

  if (!data || data.length === 0) { list.innerHTML = '<p class="pub-grid-empty">Aucune publication.</p>'; return; }

  list.innerHTML = data.map(p => `
    <div class="dash-row" id="mod-${p.id}">
      <div>
        <span class="dash-row-titre">${p.titre}</span>
        <span class="dash-row-meta">${p.profiles?.full_name || '—'} · ${p.ateliers?.nom || ''}</span>
      </div>
      <button class="dash-btn-supprimer" onclick="supprimerPublicationModeration('${p.id}')">Supprimer</button>
    </div>`).join('');
}

async function supprimerPublicationModeration(id) {
  if (!confirm('Supprimer définitivement cette publication ?')) return;
  const supabase = await window.lakouKizinReady;
  const { error } = await supabase.from('publications').delete().eq('id', id);
  if (error) { alert("Échec de la suppression : " + error.message); return; }
  const row = document.getElementById('mod-' + id);
  if (row) row.remove();
}

/* ------------------------------------------------------------
   Utilisateurs — admin + enseignant (rôle éditable admin only)
------------------------------------------------------------ */
async function chargerDashUsers() {
  const supabase = await window.lakouKizinReady;
  const list = document.getElementById('dash-users-list');
  const { data: users } = await supabase.from('profiles').select('id, full_name, role, created_at').order('created_at', { ascending: false });

  if (!users || users.length === 0) { list.innerHTML = '<p class="pub-grid-empty">Aucun inscrit.</p>'; return; }

  const canEditRoles = SESSION.profile?.role === 'admin';

  list.innerHTML = users.map(u => {
    if (canEditRoles) {
      return `<div class="dash-row">
        <span class="dash-row-titre">${u.full_name || 'Sans nom'}</span>
        <select class="dash-role-select" data-id="${u.id}">
          <option value="etudiant" ${u.role === 'etudiant' ? 'selected' : ''}>etudiant</option>
          <option value="enseignant" ${u.role === 'enseignant' ? 'selected' : ''}>enseignant</option>
          <option value="visiteur" ${u.role === 'visiteur' ? 'selected' : ''}>visiteur</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
        </select>
        <span class="dash-role-status" data-statut></span>
      </div>`;
    }
    return `<div class="dash-row">
      <span class="dash-row-titre">${u.full_name || 'Sans nom'}</span>
      <span class="dash-row-meta" style="font-style:italic;">${u.role}</span>
    </div>`;
  }).join('');

  if (!canEditRoles) return;

  document.querySelectorAll('.dash-role-select').forEach(select => {
    select.addEventListener('change', async () => {
      const id = select.getAttribute('data-id');
      const statusEl = select.parentElement.querySelector('[data-statut]');
      statusEl.textContent = '…';
      const { error } = await supabase.from('profiles').update({ role: select.value }).eq('id', id);
      statusEl.textContent = error ? '✕' : '✓';
      statusEl.style.color = error ? '#991b1b' : '#166534';
    });
  });
}
