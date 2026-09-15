// 原生 IndexedDB 封装：公告、个人资料、材料卡勾选、结论确认状态全部只存浏览器
const DB_NAME = 'court-visit-prep';
const DB_VERSION = 1;

export type StoreName = 'ann' | 'kv' | 'cardState' | 'findingState';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('ann')) db.createObjectStore('ann', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('cardState')) db.createObjectStore('cardState');
      if (!db.objectStoreNames.contains('findingState')) db.createObjectStore('findingState');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = run(t.objectStore(store));
        t.oncomplete = () => { resolve(req.result); db.close(); };
        t.onerror = () => { reject(t.error); db.close(); };
      }),
  );
}

export function idbGetAll<T>(store: StoreName): Promise<T[]> {
  return tx(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>);
}

export function idbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return tx(store, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>);
}

export function idbPut(store: StoreName, value: unknown, key?: IDBValidKey): Promise<IDBValidKey> {
  return tx(store, 'readwrite', (s) => (key === undefined ? s.put(value) : s.put(value, key)));
}

export function idbDelete(store: StoreName, key: IDBValidKey): Promise<undefined> {
  return tx(store, 'readwrite', (s) => s.delete(key) as IDBRequest<undefined>);
}

export function idbClear(store: StoreName): Promise<undefined> {
  return tx(store, 'readwrite', (s) => s.clear() as IDBRequest<undefined>);
}
