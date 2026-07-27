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
      data: { full_name: fullName, role: role }
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
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url')
    .eq('id', session.user.id)
    .single();
  return { user: session.user, profile };
}

// Met à jour le lien d'auth dans le header sur toutes les pages qui incluent ce script
async function majEtatHeader() {
  const el = document.getElementById('authStatus');
  if (!el) return;
  const session = await sessionActuelle();
  if (session && session.profile) {
    el.innerHTML = `<a href="parametres.html">${session.profile.full_name.split(' ')[0]}</a>`;
  } else {
    el.innerHTML = `<a href="connexion.html">Connexion</a>`;
  }
}

if (document.getElementById('authStatus')) {
  majEtatHeader();
}
