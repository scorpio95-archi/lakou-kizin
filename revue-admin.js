/* ============================================================
   REVUE — revue-admin.js (création / édition, admin uniquement)
   Mécanique identique à Achitekti (compression vidéo côté client,
   catégories extensibles, upload couverture/galerie) — config et
   redirections adaptées à Kizin.
   ============================================================ */

var editingId = null;
var pendingCoverFile = null;
var pendingVideoFile = null;
var pendingVideoDuration = null;
var pendingGalleryFiles = [];
var existingGalleryImages = [];

const REVUE_ADMIN_CONFIG = { maxVideoSeconds: 150, maxVideoBytesBeforeCompression: 30 * 1024 * 1024 };

function toast(msg, type) {
  if (!type) type = 'success';
  var c = document.getElementById('toast');
  if (!c) return;
  var el = document.createElement('div');
  el.className = 'toast-item ' + type;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(function() { el.remove(); }, 3500);
}

function slugify(text) {
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    .substring(0, 60) + '-' + Date.now().toString(36);
}

/* ---------- Garde admin ---------- */
async function guardAdminAccess() {
  const session = await sessionActuelle();
  if (!session) {
    document.getElementById('admin-guard-msg').textContent = 'Connexion requise. Redirection...';
    setTimeout(() => window.location.href = 'connexion.html', 1200);
    return false;
  }
  if (session.profile?.role !== 'admin') {
    document.getElementById('admin-guard-msg').textContent = "Accès réservé à l'administrateur.";
    setTimeout(() => window.location.href = 'revue.html', 1500);
    return false;
  }
  document.getElementById('admin-guard-msg').classList.add('hidden');
  document.getElementById('admin-form-wrap').classList.remove('hidden');
  return true;
}

/* ---------- Catégories ---------- */
async function loadCategoriesIntoSelect(selectedId) {
  const supabase = await window.lakouKizinReady;
  const res = await supabase.from('revue_categories').select('*').order('sort_order', { ascending: true });
  const cats = res.data || [];
  const sel = document.getElementById('f-category');
  let html = '<option value="">— Choisir —</option>';
  for (const c of cats) {
    html += `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.label}</option>`;
  }
  sel.innerHTML = html;
}

async function createRevueCategory() {
  const supabase = await window.lakouKizinReady;
  const input = document.getElementById('f-new-cat');
  const label = input.value.trim();
  if (!label) return;
  const slug = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const res = await supabase.from('revue_categories').insert({ slug, label, sort_order: 99 }).select().single();
  if (res.error) { toast(res.error.message, 'error'); return; }
  input.value = '';
  await loadCategoriesIntoSelect(res.data.id);
  toast('Catégorie ajoutée.');
}

/* ---------- Aperçus fichiers ---------- */
function previewImageFile(input, previewId) {
  const file = input.files[0];
  if (!file) return;
  if (previewId === 'cover-preview') pendingCoverFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById(previewId);
    img.src = e.target.result;
    img.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function previewGalleryFiles(input) {
  pendingGalleryFiles = Array.prototype.slice.call(input.files);
  const wrap = document.getElementById('gallery-preview');
  wrap.innerHTML = '';
  pendingGalleryFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement('img');
      img.src = e.target.result;
      wrap.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

/* ---------- Vidéo : durée + compression (identique Achitekti) ---------- */
function onRevueVideoSelected(input) {
  const file = input.files[0];
  if (!file) return;
  const statusEl = document.getElementById('video-status-msg');
  statusEl.textContent = 'Vérification de la vidéo...';

  const tempVideo = document.createElement('video');
  tempVideo.preload = 'metadata';
  tempVideo.src = URL.createObjectURL(file);
  tempVideo.onloadedmetadata = async () => {
    const duration = tempVideo.duration;
    URL.revokeObjectURL(tempVideo.src);

    if (duration > REVUE_ADMIN_CONFIG.maxVideoSeconds) {
      statusEl.textContent = `Vidéo trop longue (${Math.round(duration)}s). Maximum ${REVUE_ADMIN_CONFIG.maxVideoSeconds}s.`;
      toast('Vidéo trop longue.', 'error');
      input.value = '';
      pendingVideoFile = null;
      pendingVideoDuration = null;
      return;
    }

    pendingVideoDuration = Math.round(duration);
    let finalFile = file;

    if (file.size > REVUE_ADMIN_CONFIG.maxVideoBytesBeforeCompression) {
      statusEl.textContent = `Compression en cours (fichier de ${Math.round(file.size / 1024 / 1024)} Mo)...`;
      try {
        finalFile = await compressVideoFile(file);
        statusEl.textContent = `Compressée : ${Math.round(finalFile.size / 1024 / 1024 * 10) / 10} Mo (originale ${Math.round(file.size / 1024 / 1024)} Mo).`;
      } catch (e) {
        statusEl.textContent = 'Compression impossible sur cet appareil, envoi du fichier original.';
        finalFile = file;
      }
    } else {
      statusEl.textContent = `Vidéo prête (${Math.round(file.size / 1024 / 1024 * 10) / 10} Mo, ${pendingVideoDuration}s).`;
    }

    pendingVideoFile = finalFile;
    const preview = document.getElementById('video-preview');
    preview.src = URL.createObjectURL(finalFile);
    preview.style.display = 'block';
  };
  tempVideo.onerror = () => {
    statusEl.textContent = 'Impossible de lire cette vidéo.';
    toast('Fichier vidéo invalide.', 'error');
  };
}

function compressVideoFile(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.addEventListener('loadedmetadata', () => {
      const maxWidth = 854;
      const scale = video.videoWidth > maxWidth ? maxWidth / video.videoWidth : 1;
      const w = Math.round(video.videoWidth * scale);
      const h = Math.round(video.videoHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(25);
      const mimeType = (window.MediaRecorder && MediaRecorder.isTypeSupported('video/webm;codecs=vp9'))
        ? 'video/webm;codecs=vp9' : 'video/webm';

      if (!window.MediaRecorder) { reject(new Error('MediaRecorder non supporté')); return; }

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1200000 });
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const newName = file.name.replace(/\.[^.]+$/, '') + '.webm';
        resolve(new File([blob], newName, { type: mimeType }));
      };
      recorder.onerror = e => reject(e.error || new Error('Erreur MediaRecorder'));

      function drawFrame() {
        if (video.paused || video.ended) return;
        ctx.drawImage(video, 0, 0, w, h);
        requestAnimationFrame(drawFrame);
      }

      video.addEventListener('play', () => { recorder.start(); drawFrame(); });
      video.addEventListener('ended', () => recorder.stop());
      video.play().catch(reject);
    });

    video.addEventListener('error', () => reject(new Error('Lecture vidéo impossible')));
  });
}

/* ---------- Chargement (mode édition) ---------- */
async function loadExistingPost(id) {
  const supabase = await window.lakouKizinReady;
  const res = await supabase.from('revue_posts')
    .select('*, images:revue_post_images(id, url, order_index)')
    .eq('id', id)
    .single();
  const p = res.data;
  if (!p) { toast('Publication introuvable.', 'error'); return; }

  document.getElementById('admin-form-eyebrow').textContent = 'Modifier';
  document.getElementById('admin-form-title').textContent = p.title;

  document.getElementById('f-title').value = p.title || '';
  document.getElementById('f-summary').value = p.summary || '';
  document.getElementById('f-body').value = p.body || '';
  document.getElementById('f-status').value = p.status || 'draft';
  document.getElementById('f-youtube').value = p.youtube_url || '';
  document.getElementById('f-tiktok').value = p.tiktok_url || '';

  await loadCategoriesIntoSelect(p.category_id);

  if (p.cover_image_url) {
    const img = document.getElementById('cover-preview');
    img.src = p.cover_image_url;
    img.style.display = 'block';
  }
  if (p.video_url) {
    const v = document.getElementById('video-preview');
    v.src = p.video_url;
    v.style.display = 'block';
    document.getElementById('video-status-msg').textContent = `Vidéo actuelle (${p.video_duration_seconds || '?'}s). Choisis un fichier pour la remplacer.`;
    pendingVideoDuration = p.video_duration_seconds;
  }
  if (p.images && p.images.length) {
    existingGalleryImages = p.images;
    const wrap = document.getElementById('gallery-preview');
    wrap.innerHTML = '';
    p.images.forEach(img => {
      const el = document.createElement('img');
      el.src = img.url;
      wrap.appendChild(el);
    });
  }
}

/* ---------- Sauvegarde ---------- */
async function saveRevuePost() {
  const supabase = await window.lakouKizinReady;
  const title = document.getElementById('f-title').value.trim();
  if (!title) { toast('Le titre est obligatoire.', 'error'); return; }

  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.textContent = 'Enregistrement...';

  try {
    const session = await sessionActuelle();
    const payload = {
      title,
      category_id: document.getElementById('f-category').value || null,
      summary: document.getElementById('f-summary').value || null,
      body: document.getElementById('f-body').value || null,
      status: document.getElementById('f-status').value,
      youtube_url: document.getElementById('f-youtube').value || null,
      tiktok_url: document.getElementById('f-tiktok').value || null,
      updated_at: new Date().toISOString()
    };
    if (payload.status === 'published') payload.published_at = new Date().toISOString();

    if (pendingCoverFile) {
      const coverPath = 'covers/' + Date.now() + '-' + pendingCoverFile.name;
      const upCover = await supabase.storage.from('revue-covers').upload(coverPath, pendingCoverFile, { upsert: true });
      if (upCover.error) throw upCover.error;
      payload.cover_image_url = supabase.storage.from('revue-covers').getPublicUrl(coverPath).data.publicUrl;
    }

    if (pendingVideoFile) {
      const videoPath = 'videos/' + Date.now() + '-' + pendingVideoFile.name;
      const upVideo = await supabase.storage.from('revue-videos').upload(videoPath, pendingVideoFile, { upsert: true });
      if (upVideo.error) throw upVideo.error;
      payload.video_url = supabase.storage.from('revue-videos').getPublicUrl(videoPath).data.publicUrl;
      payload.video_duration_seconds = pendingVideoDuration;
    }

    let postId = editingId;
    if (editingId) {
      const upd = await supabase.from('revue_posts').update(payload).eq('id', editingId);
      if (upd.error) throw upd.error;
    } else {
      payload.slug = slugify(title);
      payload.author_id = session.user.id;
      const ins = await supabase.from('revue_posts').insert(payload).select().single();
      if (ins.error) throw ins.error;
      postId = ins.data.id;
    }

    if (pendingGalleryFiles.length) {
      const startOrder = existingGalleryImages.length;
      for (let i = 0; i < pendingGalleryFiles.length; i++) {
        const gFile = pendingGalleryFiles[i];
        const gPath = 'gallery/' + postId + '/' + Date.now() + '-' + i + '-' + gFile.name;
        const upG = await supabase.storage.from('revue-gallery').upload(gPath, gFile, { upsert: true });
        if (upG.error) throw upG.error;
        const gUrl = supabase.storage.from('revue-gallery').getPublicUrl(gPath).data.publicUrl;
        await supabase.from('revue_post_images').insert({ post_id: postId, url: gUrl, order_index: startOrder + i });
      }
    }

    toast('Publication enregistrée !');
    window.location.href = 'revue-article.html?id=' + postId;
  } catch (e) {
    toast('Erreur : ' + (e.message || e), 'error');
    btn.disabled = false;
    btn.textContent = 'Enregistrer';
  }
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  const ok = await guardAdminAccess();
  if (!ok) return;

  const params = new URLSearchParams(window.location.search);
  editingId = params.get('id');

  if (editingId) {
    await loadExistingPost(editingId);
  } else {
    await loadCategoriesIntoSelect(null);
  }
});
