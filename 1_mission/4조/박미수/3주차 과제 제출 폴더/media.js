/* ============================================================
   media.js — 라운드 사진/영상 저장 (IndexedDB, 대용량)
   · 실제 파일(blob)은 IndexedDB에, 참조(id/type)는 라운드 데이터(localStorage)에.
============================================================ */
const MEDIA_DB = 'golfrank-media';
const MEDIA_STORE = 'media';

function mediaOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(MEDIA_DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(MEDIA_STORE)) r.result.createObjectStore(MEDIA_STORE); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function mediaPut(id, blob) {
  const db = await mediaOpen();
  return new Promise((res, rej) => { const tx = db.transaction(MEDIA_STORE, 'readwrite'); tx.objectStore(MEDIA_STORE).put(blob, id); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}
async function mediaGet(id) {
  const db = await mediaOpen();
  return new Promise((res) => { const tx = db.transaction(MEDIA_STORE, 'readonly'); const rq = tx.objectStore(MEDIA_STORE).get(id); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null); });
}
async function mediaDel(id) {
  const db = await mediaOpen();
  return new Promise((res) => { const tx = db.transaction(MEDIA_STORE, 'readwrite'); tx.objectStore(MEDIA_STORE).delete(id); tx.oncomplete = () => res(); tx.onerror = () => res(); });
}

/* 파일 → 저장용 blob
   - 사진(jpg/png): 1080px로 줄여 용량↓
   - gif/영상: 원본 그대로 (애니메이션 유지) */
function fileToMediaBlob(file) {
  return new Promise((res) => {
    if (file.type.startsWith('video/') || file.type === 'image/gif') { res(file); return; }
    const img = new Image();
    img.onload = () => {
      const MAX = 1080;
      const sc = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      cv.toBlob((b) => res(b || file), 'image/jpeg', 0.82);
    };
    img.onerror = () => res(file);
    img.src = URL.createObjectURL(file);
  });
}

function mediaKind(file) { return file.type.startsWith('video/') ? 'video' : 'image'; }
function newMediaId() { return 'md_' + Date.now() + '_' + Math.floor(Math.random() * 100000); }
