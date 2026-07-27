// ============================================================
// LAKOU KIZIN — Client Supabase partagé
// UN SEUL client pour tout le site (évite les conflits GoTrueClient
// multiples, comme réglé sur Architecture Intérieure).
// Charger ce fichier AVANT tout autre script sur chaque page.
// ============================================================

// TODO : remplacer par les clés du NOUVEAU projet Supabase "lakou-kizin"
// (Dashboard → Settings → API)
const LAKOU_KIZIN_SUPABASE_URL = "https://xhjmmvpicywuyinzizal.supabase.co";
const LAKOU_KIZIN_SUPABASE_ANON_KEY = "sb_publishable_BARlvQhTDzVzyzq2otHRaQ_sa35jZc7";

// Charge le SDK Supabase depuis le CDN si pas déjà présent, puis initialise.
// Utilisation dans les autres scripts : attendre window.lakouKizinReady
window.supabaseClient = null;
window.lakouKizinReady = new Promise((resolve) => {
  function init() {
    if (!window.supabase) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = create;
      document.head.appendChild(script);
    } else {
      create();
    }
  }
  function create() {
    if (!window.supabaseClient) {
      window.supabaseClient = window.supabase.createClient(
        LAKOU_KIZIN_SUPABASE_URL,
        LAKOU_KIZIN_SUPABASE_ANON_KEY
      );
    }
    resolve(window.supabaseClient);
  }
  init();
});
