// ============================================================
// LAKOU KIZIN — Formulaire de publication
// ============================================================

const LIMITE_TAILLE = 10 * 1024 * 1024; // 10 Mo
const LIMITE_DUREE = 60; // secondes
const BUCKET = 'lakou-kizin-media';

let fichiersSelectionnes = []; // { file, type, id, statut }
let SESSION = null;

function genId(){ return Math.random().toString(36).slice(2); }

function obtenirMetadonneesVideo(file){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.onloadedmetadata = () => {
      resolve({ duree: video.duration, largeur: video.videoWidth, hauteur: video.videoHeight, url });
    };
    video.onerror = () => reject(new Error('Vidéo illisible'));
  });
}

// Compression best-effort côté navigateur : redessine la vidéo sur un canvas
// à résolution réduite et ré-encode en webm à faible bitrate.
function comprimerVideo(file, meta){
  return new Promise((resolve, reject) => {
    const targetWidth = Math.min(640, meta.largeur);
    const scale = targetWidth / meta.largeur;
    const width = targetWidth;
    const height = Math.round(meta.hauteur * scale);

    const video = document.createElement('video');
    video.src = meta.url;
    video.muted = true;
    video.playsInline = true;

    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!canvas.captureStream || !window.MediaRecorder) {
      reject(new Error('Compression non supportée sur ce navigateur'));
      return;
    }

    const stream = canvas.captureStream(24);
    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 700000 });
    } catch (e) {
      reject(e); return;
    }
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
    recorder.onerror = reject;

    let dessiner = false;
    function boucle(){
      if (!dessiner) return;
      ctx.drawImage(video, 0, 0, width, height);
      requestAnimationFrame(boucle);
    }
    video.addEventListener('play', () => { dessiner = true; boucle(); });
    video.addEventListener('ended', () => { dessiner = false; recorder.stop(); });
    video.addEventListener('error', reject);

    recorder.start();
    video.play().catch(reject);
  });
}
function renderPreviews(){
  const wrap = document.getElementById('previews');
  wrap.innerHTML = fichiersSelectionnes.map(f => `
    <div class="preview-item" data-id="${f.id}">
      ${f.type === 'video'
        ? `<video src="${URL.createObjectURL(f.file)}" muted></video>`
        : `<img src="${URL.createObjectURL(f.file)}">`}
      <button type="button" class="retirer" data-remove="${f.id}">✕</button>
      ${f.statut ? `<div class="statut">${f.statut}</div>` : ''}
    </div>`).join('');

  wrap.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      fichiersSelectionnes = fichiersSelectionnes.filter(f => f.id !== btn.dataset.remove);
      renderPreviews();
    });
  });
}

async function gererNouveauxFichiers(fileList){
  const msg = document.getElementById('message');
  msg.className = 'message';

  for (const file of Array.from(fileList)) {
    const type = file.type.startsWith('video') ? 'video' : 'image';

    if (type === 'video') {
      try {
        const meta = await obtenirMetadonneesVideo(file);
        if (meta.duree > LIMITE_DUREE) {
          msg.textContent = `"${file.name}" dépasse 60 secondes — non ajoutée.`;
          msg.className = 'message erreur';
          continue;
        }
        fichiersSelectionnes.push({ id: genId(), file, type, meta, statut: file.size > LIMITE_TAILLE ? 'à compresser' : null });
      } catch {
        msg.textContent = `Impossible de lire "${file.name}".`;
        msg.className = 'message erreur';
        continue;
      }
    } else {
      fichiersSelectionnes.push({ id: genId(), file, type, statut: null });
    }
  }
  renderPreviews();
}

async function uploaderFichier(item, publicationId, position){
  const supabase = await window.lakouKizinReady;
  let blobAEnvoyer = item.file;
  let extension = item.type === 'video' ? 'webm' : (item.file.name.split('.').pop() || 'jpg');
  let contentType = item.file.type;

  if (item.type === 'video' && item.file.size > LIMITE_TAILLE) {
    try {
      blobAEnvoyer = await comprimerVideo(item.file, item.meta);
      contentType = 'video/webm';
    } catch (e) {
      console.warn('Compression échouée, envoi original :', e.message);
      blobAEnvoyer = item.file;
      extension = item.file.name.split('.').pop() || 'mp4';
      contentType = item.file.type;
    }
  }

  const chemin = `${SESSION.user.id}/${publicationId}-${position}.${extension}`;
  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(chemin, blobAEnvoyer, {
    contentType, upsert: true
  });
  if (uploadErr) throw uploadErr;

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(chemin);

  const { error: insertErr } = await supabase.from('publication_media').insert({
    publication_id: publicationId,
    type: item.type,
    url: urlData.publicUrl,
    storage_path: chemin,
    position,
    duree_secondes: item.type === 'video' ? item.meta.duree : null,
    taille_octets: blobAEnvoyer.size
  });
  if (insertErr) throw insertErr;
}

async function chargerAteliers(){
  const supabase = await window.lakouKizinReady;
  const { data } = await supabase.from('ateliers').select('id, nom, slug').order('ordre');
  const select = document.getElementById('atelier');
  select.innerHTML = (data || []).map(a => `<option value="${a.id}">${a.nom}</option>`).join('');

  const params = new URLSearchParams(window.location.search);
  const slugPresel = params.get('atelier');
  if (slugPresel && data) {
    const match = data.find(a => a.slug === slugPresel);
    if (match) select.value = match.id;
  }
}

async function init(){
  SESSION = await sessionActuelle();
  if (!SESSION) {
    document.getElementById('blocConnexionRequise').style.display = 'block';
    document.getElementById('formPublication').style.display = 'none';
    return;
  }
  await chargerAteliers();

  const zone = document.getElementById('zoneUpload');
  const input = document.getElementById('fichierInput');
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', (e) => gererNouveauxFichiers(e.target.files));

  const form = document.getElementById('formPublication');
  const btn = document.getElementById('btnSubmit');
  const msg = document.getElementById('message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (fichiersSelectionnes.length === 0) {
      msg.textContent = 'Ajoute au moins une photo ou une vidéo.';
      msg.className = 'message erreur';
      return;
    }

    btn.disabled = true;
    const supabase = await window.lakouKizinReady;

    const { data: pub, error: pubErr } = await supabase.from('publications').insert({
      user_id: SESSION.user.id,
      atelier_id: document.getElementById('atelier').value,
      titre: document.getElementById('titre').value.trim(),
      description: document.getElementById('description').value.trim(),
      est_creation: document.getElementById('estCreation').checked
    }).select().single();

    if (pubErr || !pub) {
      msg.textContent = 'Erreur lors de la création : ' + (pubErr?.message || '');
      msg.className = 'message erreur';
      btn.disabled = false;
      return;
    }

    let position = 0;
    for (const item of fichiersSelectionnes) {
      btn.textContent = `Envoi ${position + 1}/${fichiersSelectionnes.length}…`;
      try {
        await uploaderFichier(item, pub.id, position);
      } catch (err) {
        console.error('Échec upload média :', err.message);
        msg.textContent = `Un média n'a pas pu être envoyé (${err.message}). La publication a été créée sans lui.`;
        msg.className = 'message info';
      }
      position++;
    }

    window.location.href = `publication.html?id=${pub.id}`;
  });
}

init();
