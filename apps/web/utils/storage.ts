/**
 * Utility functions for safe localStorage access with SSR support
 */

/**
 * Safely gets an item from localStorage
 */
export function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error(`Failed to read localStorage[${key}]:`, e);
    return null;
  }
}

/**
 * Safely sets an item in localStorage
 */
export function setStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(`Failed to write localStorage[${key}]:`, e);
  }
}

/**
 * Safely removes an item from localStorage
 */
export function removeStorageItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Failed to remove localStorage[${key}]:`, e);
  }
}

/**
 * Safely clears all items from localStorage
 */
export function clearStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.clear();
  } catch (e) {
    console.error('Failed to clear localStorage:', e);
  }
}
