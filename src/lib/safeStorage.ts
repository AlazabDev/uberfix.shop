interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memoryStorage = new Map<string, string>();

export const canUseLocalStorage = (): boolean => {
  if (typeof window === "undefined") return false;

  try {
    const storage = window.localStorage;
    const testKey = "__uf_storage_test__";
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

export const safeStorage: StorageLike = {
  getItem(key) {
    try {
      if (canUseLocalStorage()) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Ignore and fall back to memory storage.
    }

    return memoryStorage.get(key) ?? null;
  },

  setItem(key, value) {
    try {
      if (canUseLocalStorage()) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Ignore and fall back to memory storage.
    }

    memoryStorage.set(key, value);
  },

  removeItem(key) {
    try {
      if (canUseLocalStorage()) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore and always clear memory fallback too.
    }

    memoryStorage.delete(key);
  },
};