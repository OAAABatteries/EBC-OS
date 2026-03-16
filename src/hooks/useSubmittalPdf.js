// ═══════════════════════════════════════════════════════════════
//  useSubmittalPdf — IndexedDB-backed PDF storage
//  Stores PDF blobs in IndexedDB (not localStorage) to avoid
//  the ~5MB localStorage limit. Metadata stays in localStorage.
// ═══════════════════════════════════════════════════════════════

const DB_NAME = "ebc_pdfs";
const DB_VERSION = 1;
const STORE_NAME = "submittals";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Store a File/Blob in IndexedDB under the given key */
export async function storePdf(submittalId, file) {
  const pdfKey = `pdf_${submittalId}`;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(file, pdfKey);
    tx.oncomplete = () => {
      resolve({
        pdfKey,
        pdfName: file.name,
        pdfSize: file.size,
      });
    };
    tx.onerror = () => reject(tx.error);
  });
}

/** Retrieve a blob from IndexedDB */
export async function getPdfBlob(pdfKey) {
  if (!pdfKey) return null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(pdfKey);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/** Get an Object URL for a stored PDF (caller must revoke when done) */
export async function getPdfUrl(pdfKey) {
  const blob = await getPdfBlob(pdfKey);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

/** Delete a PDF from IndexedDB */
export async function deletePdf(pdfKey) {
  if (!pdfKey) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(pdfKey);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Format file size for display */
export function fmtSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}
