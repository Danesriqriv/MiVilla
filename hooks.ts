import { useState, useEffect, useCallback } from 'react';

// Custom hook for localStorage persistence with error handling and SSR safety
export function useLocalStorage<T>(key: string, initialValue: T) {
  // 1. Initialize state from local storage or initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });

  // 2. Sync to local storage whenever storedValue changes
  // Using useEffect ensures the side effect (writing to disk) happens after the render commit
  // and doesn't interfere with the state update batching.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      } catch (error) {
        console.warn(`Error setting localStorage key “${key}”:`, error);
      }
    }
  }, [key, storedValue]);

  // 3. Stable setter function
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue(value);
  }, []);

  return [storedValue, setValue] as const;
}