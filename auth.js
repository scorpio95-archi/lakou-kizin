// ============================================================
// LAKOU KIZIN — Authentification
// Nécessite client-supabase.js chargé avant ce fichier.
// ============================================================

async function inscrire({ email, password, fullName, role }) {
  const supabase = await window.lakouKizinReady;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role: role },
      emailRedirectTo: window.location.origin + '/index.html'
    }
  });
  return { data, error };
}

async function connecter({ email, password }) {
  const supabase = await window.lakouKizinReady;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

async function deconnecter() {
  const supabase = await window.lakouKizinReady;
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

async function sessionActuelle() {
  const supabase = await window.lakouKizinReady;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url')
    .eq('id', session.user.id)
    .single();
  if (error) console.error('Profil introuvable pour cet utilisateur :', error.message);
  return { user: session.user, profile: profile || null };
}

// Met à jour le lien d'auth dans le header sur toutes les pages qui incluent ce script
async function majEtatHeader() {
  const el = document.getElementById('authStatus');
  if (!el) return;
  const session = await sessionActuelle();
  if (session) {
    const nom = session.profile?.full_name?.split(' ')[0] || session.user.email;
    el.innerHTML = `<a href="parametres.html" style="display:inline-flex; align-items:center; gap:6px; background:var(--bordeaux); color:#fff8ec; padding:6px 12px; border-radius:20px; font-size:0.85rem;">● ${nom}</a>`;
  } else {
    el.innerHTML = `<a href="connexion.html">Connexion</a>`;
  }
}

if (document.getElementById('authStatus')) {
  majEtatHeader();
}
