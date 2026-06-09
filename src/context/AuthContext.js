import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const PERMISSIONS = {
  directeur_general:{ saisirProd:true, validerProd:true,  supprimerProd:true,  tresorerie:'write', stocks:'write', atp:true,  atpSaisie:true,  rapports:true,  kpis:true,  parametres:true,  import:true,  utilisateurs:true,  emailConfig:true  },
  operateur:        { saisirProd:true, validerProd:false, supprimerProd:false, tresorerie:false,   stocks:'read',  atp:false, atpSaisie:false, rapports:'partiel', kpis:true,  parametres:true,  import:false, utilisateurs:false, emailConfig:false },
  pdg:              { saisirProd:false,validerProd:false, supprimerProd:false, tresorerie:'read',  stocks:'read',  atp:true,  atpSaisie:false, rapports:true,  kpis:true,  parametres:false, import:false, utilisateurs:false, emailConfig:false },
  pca:              { saisirProd:false,validerProd:false, supprimerProd:false, tresorerie:'read',  stocks:'read',  atp:true,  atpSaisie:false, rapports:true,  kpis:true,  parametres:false, import:false, utilisateurs:false, emailConfig:false },
  conseil_admin:    { saisirProd:false,validerProd:false, supprimerProd:false, tresorerie:false,   stocks:false,   atp:true,  atpSaisie:false, rapports:true,  kpis:true,  parametres:false, import:false, utilisateurs:false, emailConfig:false },
};

export const NAV_ACCESS = {
  directeur_general:['/','/production','/atp','/stocks','/tresorerie','/rapports','/import','/parametres','/utilisateurs'],
  operateur:        ['/','/production','/rapports','/parametres'],
  pdg:              ['/','/atp','/stocks','/tresorerie','/rapports'],
  pca:              ['/','/atp','/stocks','/tresorerie','/rapports'],
  conseil_admin:    ['/','/atp','/rapports'],
};

export const ROLE_LABELS = {
  directeur_general:'Directeur Général',
  operateur:        'Opérateur de Production',
  pdg:              'Président Directeur Général',
  pca:              "Président du Conseil d'Admin",
  conseil_admin:    "Conseil d'Administration",
};

export const ROLE_BADGES = {
  directeur_general:'DG', operateur:'OPÉ', pdg:'PDG', pca:'PCA', conseil_admin:'CA',
};

function normalizeRole(u) {
  if (!u) return 'operateur';
  const raw = (u.role || u.nom_role || u.role_nom || 'operateur').toLowerCase().trim();
  const map = {
    directeur_general:'directeur_general', dg:'directeur_general',
    pdg:'pdg', pca:'pca',
    conseil_admin:'conseil_admin', ca:'conseil_admin',
    operateur:'operateur', superviseur:'directeur_general',
  };
  return map[raw] || raw;
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sinex_token');
    const saved  = localStorage.getItem('sinex_user');
    if (token && saved) {
      try {
        const u = JSON.parse(saved);
        u._role = normalizeRole(u);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(u);
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (email, motDePasse) => {
    const { data } = await api.post('/auth/login', { email, mot_de_passe: motDePasse });
    const u = data.utilisateur || data.user || data;
    u._role = normalizeRole(u);
    localStorage.setItem('sinex_token', data.token);
    localStorage.setItem('sinex_user', JSON.stringify(u));
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('sinex_token');
    localStorage.removeItem('sinex_user');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const getRole   = () => user?._role || normalizeRole(user);
  const can       = (p) => PERMISSIONS[getRole()]?.[p];
  const canAccess = (path) => (NAV_ACCESS[getRole()] || []).includes(path);

  return (
    <AuthContext.Provider value={{ user, login, logout, can, canAccess, getRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
