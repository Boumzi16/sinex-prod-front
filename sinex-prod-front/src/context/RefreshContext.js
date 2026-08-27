import { createContext, useContext, useState, useCallback } from 'react';

const RefreshContext = createContext(null);

const moisCourant = new Date().toISOString().slice(0,7);

export function RefreshProvider({ children }) {
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [moisGlobal,  setMoisGlobal]  = useState(moisCourant);
  const [anneeGlobal, setAnneeGlobal] = useState(moisCourant.slice(0,4));

  const triggerRefresh = useCallback(() => {
    setLastRefresh(Date.now());
  }, []);

  const changerMois = useCallback((mois) => {
    setMoisGlobal(mois);
    setAnneeGlobal(mois.slice(0,4));
  }, []);

  const changerAnnee = useCallback((annee) => {
    setAnneeGlobal(annee);
    // Mettre à jour le mois global vers janvier de cette année si l'année change
    setMoisGlobal(a => a.slice(0,4) === annee ? a : `${annee}-01`);
  }, []);

  return (
    <RefreshContext.Provider value={{
      lastRefresh, triggerRefresh,
      moisGlobal, anneeGlobal,
      changerMois, changerAnnee,
    }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() { return useContext(RefreshContext); }
