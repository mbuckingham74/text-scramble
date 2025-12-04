// Safe localStorage utilities for environments where storage may be blocked
// (Safari private mode, strict privacy settings, etc.)

const isStorageAvailable = () => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

export const storageAvailable = isStorageAvailable();

export const safeGetJSON = (key) => {
  if (!storageAvailable) return null;
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage blocked, ignore cleanup
    }
    return null;
  }
};

export const safeSetItem = (key, value) => {
  if (!storageAvailable) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked or full, ignore
  }
};

export const safeRemoveItem = (key) => {
  if (!storageAvailable) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage blocked, ignore
  }
};
