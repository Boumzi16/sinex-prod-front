import { createContext, useContext, useState, useCallback } from 'react';

const RefreshContext = createContext(null);

export function RefreshProvider({ children }) {
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const triggerRefresh = useCallback(() => {
    setLastRefresh(Date.now());
  }, []);

  return (
    <RefreshContext.Provider value={{ lastRefresh, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() { return useContext(RefreshContext); }
