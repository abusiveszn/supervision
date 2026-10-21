// Local Database Engine for SmartSupervise
// Provides persistent storage for topics, documents, projects, meetings, messages, and reviews
// even when disconnected from Base44 cloud backend.

const DB_PREFIX = 'smartsupervise_db_';
const listeners = new Map();

function getStore(name) {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(DB_PREFIX + name.toLowerCase());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStore(name, items) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(DB_PREFIX + name.toLowerCase(), JSON.stringify(items));
    notify(name, items);
  } catch (err) {
    console.error(`[LocalDB] Failed to persist ${name}:`, err);
  }
}

function notify(name, data) {
  const entityListeners = listeners.get(name.toLowerCase());
  if (entityListeners) {
    entityListeners.forEach((fn) => {
      try { fn(data); } catch { /* ignore */ }
    });
  }
}

function matchesQuery(item, query) {
  if (!query || Object.keys(query).length === 0) return true;
  for (const [key, val] of Object.entries(query)) {
    if (key === '$or') {
      if (Array.isArray(val) && !val.some((subQuery) => matchesQuery(item, subQuery))) {
        return false;
      }
      continue;
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (val.$ne !== undefined && item[key] === val.$ne) return false;
      if (Array.isArray(val.$in) && !val.$in.includes(item[key])) return false;
      if (Array.isArray(val.$nin) && val.$nin.includes(item[key])) return false;
      continue;
    }
    if (item[key] !== val) return false;
  }
  return true;
}

function sortItems(items, sortKey) {
  if (!sortKey || typeof sortKey !== 'string') return items;
  const desc = sortKey.startsWith('-');
  const field = desc ? sortKey.slice(1) : sortKey;
  return [...items].sort((a, b) => {
    const valA = a[field] ?? '';
    const valB = b[field] ?? '';
    if (valA < valB) return desc ? 1 : -1;
    if (valA > valB) return desc ? -1 : 1;
    return 0;
  });
}

function createEntityAdapter(entityName) {
  const normalized = entityName.toLowerCase();

  return {
    async list(sortKey = '-created_date', limit = 1000) {
      let items = getStore(normalized);
      items = sortItems(items, sortKey);
      return limit ? items.slice(0, limit) : items;
    },

    async filter(query = {}, sortKey = '-created_date', limit = 1000) {
      let items = getStore(normalized);
      items = items.filter((item) => matchesQuery(item, query));
      items = sortItems(items, sortKey);
      return limit ? items.slice(0, limit) : items;
    },

    async get(id) {
      const items = getStore(normalized);
      return items.find((i) => i.id === id) || null;
    },

    async getById(id) {
      return this.get(id);
    },

    async create(data) {
      const items = getStore(normalized);
      const newItem = {
        id: data.id || `${normalized}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        created_date: data.created_date || new Date().toISOString(),
        updated_date: new Date().toISOString(),
        ...data,
      };
      items.unshift(newItem);
      setStore(normalized, items);
      return newItem;
    },

    async bulkCreate(records) {
      if (!Array.isArray(records)) return [];
      const items = getStore(normalized);
      const created = records.map((data) => ({
        id: data.id || `${normalized}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        created_date: data.created_date || new Date().toISOString(),
        updated_date: new Date().toISOString(),
        ...data,
      }));
      setStore(normalized, [...created, ...items]);
      return created;
    },

    async update(id, updates) {
      const items = getStore(normalized);
      const idx = items.findIndex((i) => i.id === id);
      if (idx === -1) {
        const created = await this.create({ id, ...updates });
        return created;
      }
      items[idx] = {
        ...items[idx],
        ...updates,
        updated_date: new Date().toISOString(),
      };
      setStore(normalized, items);
      return items[idx];
    },

    async delete(id) {
      const items = getStore(normalized);
      const filtered = items.filter((i) => i.id !== id);
      setStore(normalized, filtered);
      return { success: true };
    },

    subscribe(callback) {
      if (!listeners.has(normalized)) {
        listeners.set(normalized, new Set());
      }
      listeners.get(normalized).add(callback);
      return () => {
        const set = listeners.get(normalized);
        if (set) set.delete(callback);
      };
    },
  };
}

export async function uploadFileLocal({ file }) {
  if (!file) return { file_url: null, name: '' };
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        file_url: reader.result,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    };
    reader.onerror = () => {
      const objectUrl = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(file) : '';
      resolve({
        file_url: objectUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    };
    reader.readAsDataURL(file);
  });
}

// Seed initial default departments if store is empty
const defaultDepartments = [
  { id: 'dept-1', name: 'Computer Science', code: 'CSC', faculty: 'Science & Technology', description: 'Computing, Algorithms and Systems' },
  { id: 'dept-2', name: 'Software Engineering', code: 'SWE', faculty: 'Science & Technology', description: 'Software Architecture and Development' },
  { id: 'dept-3', name: 'Information Technology', code: 'IT', faculty: 'Science & Technology', description: 'Network and Cloud Infrastructure' },
  { id: 'dept-4', name: 'Cybersecurity', code: 'CYB', faculty: 'Science & Technology', description: 'Information Assurance and Cryptography' },
];

if (typeof window !== 'undefined' && window.localStorage) {
  const existingDept = window.localStorage.getItem(DB_PREFIX + 'department');
  if (!existingDept) {
    window.localStorage.setItem(DB_PREFIX + 'department', JSON.stringify(defaultDepartments));
  }
}

export const localDb = {
  entities: new Proxy({}, {
    get(_, entityName) {
      return createEntityAdapter(String(entityName));
    },
  }),
  uploadFileLocal,
};
