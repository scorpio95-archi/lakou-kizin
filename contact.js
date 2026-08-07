/* ============================================================
   CONTACT — contact.html
   Passe par la Edge Function send-contact-message (pas d'écriture
   directe côté client) — accessible à tout le monde, connecté ou non.
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const session = await sessionActuelle();
    if (session) {
      document.getElementById('c-nom').value = session.profile?.full_name || '';
      document.getElementById('c-email').value = session.user.email || '';
    }
  } catch (e) { /* visiteur non connecté, formulaire vide */ }
});

async function envoyerMessage() {
  const nom = document.getElementById('c-nom').value.trim();
  const email = document.getElementById('c-email').value.trim();
  const sujet = document.getElementById('c-sujet').value;
  const message = document.getElementById('c-message').value.trim();
  const msg = document.getElementById('c-msg');

  if (!nom || !email || !message) {
    msg.textContent = 'Nom, email et message sont obligatoires.';
    msg.style.color = '#a3341f';
    return;
  }

  const btn = document.getElementById('c-submit');
  btn.disabled = true;
  btn.textContent = 'Envoi…';
  msg.textContent = '';

  const supabase = await window.lakouKizinReady;
  const res = await supabase.functions.invoke('send-contact-message', {
    body: { nom, email, sujet, message }
  });

  btn.disabled = false;
  btn.textContent = 'Envoyer';

  if (res.error) {
    let detail = res.error.message || 'Erreur inconnue.';
    if (res.error.context && typeof res.error.context.json === 'function') {
      try { const body = await res.error.context.json(); if (body?.error) detail = body.error; } catch (e) {}
    }
    msg.textContent = "Échec de l'envoi : " + detail;
    msg.style.color = '#a3341f';
    return;
  }

  msg.textContent = 'Message envoyé — merci, on te répond bientôt !';
  msg.style.color = '#166534';
  document.getElementById('c-message').value = '';
}
