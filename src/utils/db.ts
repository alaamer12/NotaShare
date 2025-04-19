import { Note, User, Stats } from '@/types';

const DB_NAME = 'Notashare-db';
const DB_VERSION = 1;

const STORES = {
  NOTES: 'notes',
  USERS: 'users',
  STATS: 'stats'
};

// Initialize the IndexedDB
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Error opening database:', event);
      reject(new Error('Could not open database'));
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.NOTES)) {
        db.createObjectStore(STORES.NOTES, { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains(STORES.USERS)) {
        db.createObjectStore(STORES.USERS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.STATS)) {
        db.createObjectStore(STORES.STATS, { keyPath: 'id' });
      }
    };
  });
};

// Generic function to open a transaction
const transaction = <T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);

      const request = callback(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);

      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        console.error('Transaction error:', tx.error);
        reject(tx.error);
        db.close();
      };
    } catch (error) {
      reject(error);
    }
  });
};

// Notes CRUD operations
export const saveNote = (note: Note): Promise<number> => {
  return transaction<number>(STORES.NOTES, 'readwrite', (store) => {
    return store.put(note) as IDBRequest<number>;
  });
};

export const getNotes = (): Promise<Note[]> => {
  return transaction<Note[]>(STORES.NOTES, 'readonly', (store) => {
    return store.getAll();
  });
};

export const getNote = (id: number): Promise<Note> => {
  return transaction<Note>(STORES.NOTES, 'readonly', (store) => {
    return store.get(id);
  });
};

// User operations
export const saveUser = (user: User): Promise<string> => {
  return transaction<string>(STORES.USERS, 'readwrite', (store) => {
    return store.put(user) as IDBRequest<string>;
  });
};

export const getUser = (id: string): Promise<User> => {
  return transaction<User>(STORES.USERS, 'readonly', (store) => {
    return store.get(id);
  });
};

// Stats operations
export const incrementUniqueUsers = async (): Promise<number> => {
  try {
    // Get current stats
    let stats: Stats;
    try {
      stats = await transaction<Stats>(STORES.STATS, 'readonly', (store) => {
        return store.get('global');
      });
    } catch (error) {
      // If not found, initialize with 0
      stats = { id: 'global', uniqueUsers: 0 };
    }

    // Increment and save
    stats.uniqueUsers = (stats.uniqueUsers || 0) + 1;
    await transaction(STORES.STATS, 'readwrite', (store) => {
      return store.put(stats);
    });

    return stats.uniqueUsers;
  } catch (error) {
    console.error('Error incrementing unique users:', error);
    return 0;
  }
};

export const getStats = (): Promise<Stats> => {
  return transaction<Stats>(STORES.STATS, 'readonly', (store) => {
    return store.get('global');
  });
};

// Initialize stats if they don't exist
export const initStats = async (): Promise<void> => {
  try {
    console.log('Initializing stats...');
    let stats;
    try {
      stats = await getStats();
      console.log('Current stats:', stats);
    } catch (error) {
      console.error('Error getting stats:', error);
    }
    
    if (!stats || stats === undefined) {
      console.log('No stats found, creating initial stats');
      await transaction(STORES.STATS, 'readwrite', (store) => {
        const initialStats = { id: 'global', uniqueUsers: 0 };
        console.log('Setting initial stats:', initialStats);
        return store.put(initialStats);
      });
    }
  } catch (error) {
    console.error('Error in initStats:', error);
    try {
      await transaction(STORES.STATS, 'readwrite', (store) => {
        return store.put({ id: 'global', uniqueUsers: 0 });
      });
    } catch (retryError) {
      console.error('Failed to initialize stats after retry:', retryError);
    }
  }
};
