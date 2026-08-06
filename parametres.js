// ============================================================
// LAKOU KIZIN — Paramètres du profil
// ============================================================

const BUCKET_AVATARS = 'lakou-kizin-avatars';
let SESSION = null;

function initiales(nom){
  return (nom || '?').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
}

function renderAvatar(url, nom){
  const el = document.getElementById('avatarPreview');
  el.innerHTML = url ? `<img src="${url}">` : initiales(nom);
}

async function init(){
  SESSION = await sessionActuelle();
  if (!SESSION) {
    document.getElementById('blocConnexionRequise').style.display = 'block';
    return;
  }
  document.getElementById('contenuParametres').style.display = 'block';

  const p = SESSION.profile;
  document.getElementById('fullName').value = p?.full_name || '';
  const ROLE_LABELS = { etudiant: 'Étudiant', enseignant: 'Enseignant', visiteur: 'Visiteur', admin: 'Admin' };
  document.getElementById('roleAffichage').textContent = ROLE_LABELS[p?.role] || p?.role || '—';
  document.getElementById('atelierPrincipal').value = p?.atelier_principal || '';
  document.getElementById('bio').value = p?.bio || '';
  renderAvatar(p?.avatar_url, p?.full_name);

  document.getElementById('btnDeconnexion').addEventListener('click', deconnecter);

  // ---- Avatar ----
  const avatarInput = document.getElementById('avatarInput');
  document.getElementById('btnChangerAvatar').addEventListener('click', () => avatarInput.click());
  avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const supabase = await window.lakouKizinReady;
    const ext = file.name.split('.').pop() || 'jpg';
    const chemin = `${SESSION.user.id}/avatar.${ext}`;

    const { error: upErr } = await supabase.storage.from(BUCKET_AVATARS).upload(chemin, file, {
      upsert: true, contentType: file.type
    });
    if (upErr) { alert('Erreur upload avatar : ' + upErr.message); return; }

    const { data: urlData } = supabase.storage.from(BUCKET_AVATARS).getPublicUrl(chemin);
    const urlAvecCache = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updErr } = await supabase.from('profiles')
      .update({ avatar_url: urlAvecCache })
      .eq('id', SESSION.user.id);
    if (updErr) { alert('Erreur enregistrement avatar : ' + updErr.message); return; }

    renderAvatar(urlAvecCache, p?.full_name);
  });

  // ---- Profil ----
  document.getElementById('formProfil').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSauverProfil');
    const msg = document.getElementById('messageProfil');
    btn.disabled = true;
    msg.className = 'message';

    const supabase = await window.lakouKizinReady;
    const { error } = await supabase.from('profiles').update({
      full_name: document.getElementById('fullName').value.trim(),
      atelier_principal: document.getElementById('atelierPrincipal').value.trim(),
      bio: document.getElementById('bio').value.trim()
    }).eq('id', SESSION.user.id);

    if (error) {
      msg.textContent = 'Erreur : ' + error.message;
      msg.className = 'message erreur';
    } else {
      msg.textContent = 'Profil mis à jour.';
      msg.className = 'message succes';
    }
    btn.disabled = false;
  });

  // ---- Mot de passe ----
  document.getElementById('formMotDePasse').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSauverMdp');
    const msg = document.getElementById('messageMdp');
    msg.className = 'message';

    const mdp1 = document.getElementById('nouveauMdp').value;
    const mdp2 = document.getElementById('confirmMdp').value;
    if (mdp1 !== mdp2) {
      msg.textContent = 'Les mots de passe ne correspondent pas.';
      msg.className = 'message erreur';
      return;
    }

    btn.disabled = true;
    const supabase = await window.lakouKizinReady;
    const { error } = await supabase.auth.updateUser({ password: mdp1 });

    if (error) {
      msg.textContent = 'Erreur : ' + error.message;
      msg.className = 'message erreur';
    } else {
      msg.textContent = 'Mot de passe mis à jour.';
      msg.className = 'message succes';
      document.getElementById('formMotDePasse').reset();
    }
    btn.disabled = false;
  });
}

init();
