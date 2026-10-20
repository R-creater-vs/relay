/**
 * Local namespaced persistence for each replica.
 * Uses IndexedDB in browser environments, with in-memory fallback in Node.js tests.
 */

const memoryStore = new Map<string, Uint8Array>();

export async function saveReplicaDoc(
  replicaNamespace: string,
  docBytes: Uint8Array
): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    memoryStore.set(replicaNamespace, docBytes);
    return;
  }

  return new Promise((resolve, reject) => {
    const req = indexedDB.open('RelayCRDTStorage', 1);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('replicas')) {
        db.createObjectStore('replicas');
      }
    };

    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('replicas', 'readwrite');
      const store = tx.objectStore('replicas');
      store.put(docBytes, replicaNamespace);

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };

    req.onerror = () => {
      // Fallback to memory
      memoryStore.set(replicaNamespace, docBytes);
      resolve();
    };
  });
}

export async function loadReplicaDoc(
  replicaNamespace: string
): Promise<Uint8Array | null> {
  if (typeof indexedDB === 'undefined') {
    return memoryStore.get(replicaNamespace) || null;
  }

  return new Promise((resolve) => {
    const req = indexedDB.open('RelayCRDTStorage', 1);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('replicas')) {
        db.createObjectStore('replicas');
      }
    };

    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('replicas', 'readonly');
      const store = tx.objectStore('replicas');
      const getReq = store.get(replicaNamespace);

      getReq.onsuccess = () => {
        const val = getReq.result as Uint8Array | undefined;
        db.close();
        resolve(val || null);
      };
      getReq.onerror = () => {
        db.close();
        resolve(memoryStore.get(replicaNamespace) || null);
      };
    };

    req.onerror = () => {
      resolve(memoryStore.get(replicaNamespace) || null);
    };
  });
}

export function clearReplicaStorage(replicaNamespace?: string): void {
  if (replicaNamespace) {
    memoryStore.delete(replicaNamespace);
  } else {
    memoryStore.clear();
  }
}
