// Tarayıcı İçi Kalıcı IndexedDB Kütüphane Depolama Motoru
// Bu modül sayesinde Render sunucusu kapansa, yeniden başlasa veya güncellense bile
// kullanıcının yüklediği PDF kitapları asla kaybolmaz ve sadece o kullanıcının cihazında saklanır.

const DB_NAME = 'altug_ai_library_db';
const DB_VERSION = 1;
const STORE_NAME = 'user_documents';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      console.warn('IndexedDB desteklenmiyor, localStorage kullanılacak.');
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB açılırken hata:', event.target.error);
      resolve(null);
    };
  });
}

export async function getLocalDocuments() {
  const db = await openDatabase();
  if (!db) {
    // Fallback: localStorage
    try {
      const raw = localStorage.getItem('altug_ai_local_docs');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(req.result || []);
      };

      req.onerror = () => {
        resolve([]);
      };
    } catch (err) {
      console.error('Belgeler okunurken hata:', err);
      resolve([]);
    }
  });
}

export async function saveLocalDocument(doc) {
  if (!doc || !doc.id) return;
  const db = await openDatabase();

  // localStorage yedekleme
  try {
    const raw = localStorage.getItem('altug_ai_local_docs');
    const existing = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter((d) => d.id !== doc.id);
    filtered.unshift(doc);
    localStorage.setItem('altug_ai_local_docs', JSON.stringify(filtered.slice(0, 50)));
  } catch (err) {
    console.warn('localStorage kaydı başarısız:', err);
  }

  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(doc);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (err) {
      console.error('Belge kaydedilirken hata:', err);
      resolve(false);
    }
  });
}

export async function deleteLocalDocument(docId) {
  if (!docId) return;
  const db = await openDatabase();

  // localStorage temizleme
  try {
    const raw = localStorage.getItem('altug_ai_local_docs');
    if (raw) {
      const existing = JSON.parse(raw);
      const filtered = existing.filter((d) => d.id !== docId);
      localStorage.setItem('altug_ai_local_docs', JSON.stringify(filtered));
    }
  } catch (err) {
    console.warn('localStorage silme hatası:', err);
  }

  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(docId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (err) {
      console.error('Belge silinirken hata:', err);
      resolve(false);
    }
  });
}
