/* ============================================================
   CALENDRIER — calendrier.html
   Lecture publique (comme le reste de Kizin), écriture réservée
   à admin + enseignant (même logique que le Tableau de bord).
   ============================================================ */

const TYPE_LABELS = { degustation: 'Dégustation', concours: 'Concours', 'portes-ouvertes': 'Portes ouvertes', autre: 'Autre' };
let calMode = 'a-venir';
let peutGererEvenements = false;
let editingEventId = null;

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

function formatDateHeure(iso) {
  const d = new Date(iso);
  const jour = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return jour.charAt(0).toUpperCase() + jour.slice(1) + ' · ' + heure;
}
function jourCourt(iso) {
  const d = new Date(iso);
  return { num: d.getDate(), mois: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') };
}

function setCalMode(mode, btn) {
  calMode = mode;
  document.querySelectorAll('.cal-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  chargerEvenements();
}

async function chargerEvenements() {
  const supabase = await window.lakouKizinReady;
  const list = document.getElementById('cal-list');
  const now = new Date().toISOString();

  let query = supabase.from('evenements').select('*');
  if (calMode === 'a-venir') {
    query = query.gte('date_debut', now).order('date_debut', { ascending: true });
  } else {
    query = query.lt('date_debut', now).order('date_debut', { ascending: false });
  }

  const { data, error } = await query;
  if (error) { list.innerHTML = '<p class="pub-grid-empty">Erreur de chargement.</p>'; return; }
  if (!data || data.length === 0) {
    list.innerHTML = `<p class="pub-grid-empty">${calMode === 'a-venir' ? "Aucun événement prévu pour l'instant." : "Aucun événement passé."}</p>`;
    return;
  }

  list.innerHTML = data.map(ev => {
    const j = jourCourt(ev.date_debut);
    return `
    <div class="cal-card" ${peutGererEvenements ? `onclick="ouvrirEditionEvenement('${ev.id}')"` : ''}>
      <div class="cal-card-date"><span class="cal-card-num">${j.num}</span><span class="cal-card-mois">${j.mois}</span></div>
      <div class="cal-card-body">
        <span class="cal-card-type">${TYPE_LABELS[ev.type] || ev.type}</span>
        <h3 class="cal-card-titre">${ev.titre}</h3>
        <div class="cal-card-meta">${formatDateHeure(ev.date_debut)}${ev.lieu ? ' · ' + ev.lieu : ''}</div>
        ${ev.description ? `<p class="cal-card-desc">${ev.description}</p>` : ''}
      </div>
    </div>`;
  }).join('');
}

/* ---------- Modal création / édition (admin + enseignant) ---------- */
function ouvrirNouvelEvenement() {
  editingEventId = null;
  document.getElementById('cal-modal-title').textContent = 'Nouvel événement';
  document.getElementById('ev-titre').value = '';
  document.getElementById('ev-type').value = 'degustation';
  document.getElementById('ev-debut').value = '';
  document.getElementById('ev-fin').value = '';
  document.getElementById('ev-lieu').value = '';
  document.getElementById('ev-description').value = '';
  document.getElementById('ev-delete-btn').style.display = 'none';
  document.getElementById('cal-modal-msg').textContent = '';
  document.getElementById('cal-modal-overlay').classList.add('open');
}

async function ouvrirEditionEvenement(id) {
  const supabase = await window.lakouKizinReady;
  const { data: ev } = await supabase.from('evenements').select('*').eq('id', id).single();
  if (!ev) return;

  editingEventId = id;
  document.getElementById('cal-modal-title').textContent = 'Modifier l\'événement';
  document.getElementById('ev-titre').value = ev.titre || '';
  document.getElementById('ev-type').value = ev.type || 'autre';
  document.getElementById('ev-debut').value = ev.date_debut ? ev.date_debut.slice(0, 16) : '';
  document.getElementById('ev-fin').value = ev.date_fin ? ev.date_fin.slice(0, 16) : '';
  document.getElementById('ev-lieu').value = ev.lieu || '';
  document.getElementById('ev-description').value = ev.description || '';
  document.getElementById('ev-delete-btn').style.display = 'inline-block';
  document.getElementById('cal-modal-msg').textContent = '';
  document.getElementById('cal-modal-overlay').classList.add('open');
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('cal-modal-overlay');
  document.getElementById('cal-modal-close').addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
});

async function enregistrerEvenement() {
  const titre = document.getElementById('ev-titre').value.trim();
  const debut = document.getElementById('ev-debut').value;
  const msg = document.getElementById('cal-modal-msg');
  if (!titre) { msg.textContent = 'Le titre est obligatoire.'; msg.style.color = '#a3341f'; return; }
  if (!debut) { msg.textContent = 'La date de début est obligatoire.'; msg.style.color = '#a3341f'; return; }

  const supabase = await window.lakouKizinReady;
  const session = await sessionActuelle();
  const btn = document.getElementById('ev-save-btn');
  btn.disabled = true; btn.textContent = 'Enregistrement…';

  const payload = {
    titre,
    type: document.getElementById('ev-type').value,
    date_debut: new Date(debut).toISOString(),
    date_fin: document.getElementById('ev-fin').value ? new Date(document.getElementById('ev-fin').value).toISOString() : null,
    lieu: document.getElementById('ev-lieu').value.trim() || null,
    description: document.getElementById('ev-description').value.trim() || null
  };

  let res;
  if (editingEventId) {
    res = await supabase.from('evenements').update(payload).eq('id', editingEventId);
  } else {
    payload.created_by = session.user.id;
    res = await supabase.from('evenements').insert(payload);
  }

  btn.disabled = false; btn.textContent = 'Enregistrer';
  if (res.error) { msg.textContent = res.error.message; msg.style.color = '#a3341f'; return; }

  document.getElementById('cal-modal-overlay').classList.remove('open');
  toast('Événement enregistré.');
  chargerEvenements();
}

async function supprimerEvenement() {
  if (!editingEventId) return;
  if (!confirm('Supprimer définitivement cet événement ?')) return;
  const supabase = await window.lakouKizinReady;
  const res = await supabase.from('evenements').delete().eq('id', editingEventId);
  if (res.error) { toast(res.error.message, 'error'); return; }
  document.getElementById('cal-modal-overlay').classList.remove('open');
  toast('Événement supprimé.');
  chargerEvenements();
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const session = await sessionActuelle();
    if (session && (session.profile?.role === 'admin' || session.profile?.role === 'enseignant')) {
      peutGererEvenements = true;
      document.getElementById('cal-admin-bar').classList.remove('hidden');
    }
  } catch (e) { /* visiteur non connecté */ }
  chargerEvenements();
});
