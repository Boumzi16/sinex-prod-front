import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('sinex_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sinex_token');
      localStorage.removeItem('sinex_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

export const authAPI = {
  login:  (data) => api.post('/auth/login', data),
  logout: ()     => api.post('/auth/logout'),
};

export const dashboardAPI = {
  consolide: (mois) => api.get('/dashboard/consolide', {params:{mois}}),
};

export const productionAPI = {
  liste:    (mois)     => api.get('/production', {params:{mois}}),
  creer:    (data)     => api.post('/production', data),
  valider:  (id)       => api.put(`/production/${id}/valider`),
  modifier: (id, data) => api.put(`/production/${id}`, data),
  supprimer:(id)       => api.delete(`/production/${id}`),
};

export const stocksAPI = {
  soldes:          ()       => api.get('/stocks/soldes'),
  alertes:         ()       => api.get('/stocks/alertes'),
  mouvements:      (params) => api.get('/stocks/mouvements', {params}),
  ajouterMouvement:(data)   => api.post('/stocks/mouvements', data),
};

export const tresorerieAPI = {
  soldes:          ()       => api.get('/tresorerie/soldes'),
  mouvements:      (params) => api.get('/tresorerie/mouvements', {params}),
  ajouterMouvement:(data)   => api.post('/tresorerie/mouvements', data),
  flux:            (annee)  => api.get('/tresorerie/flux', {params:{annee}}),
};

export const atpAPI = {
  dashboard: (mois) => api.get('/atp/mois', {params:{mois}}),
  objectifs: (data) => api.post('/atp/objectifs', data),
  charges:   (data) => api.post('/atp/charges', data),
  previsions:(data) => api.post('/atp/previsions', data),
};

export const rapportsAPI = {
  lister:      (params)        => api.get('/rapports', {params}),
  generer:     (data)          => api.post('/rapports/generer', data),
  telecharger: (id, format)    => api.get(`/rapports/${id}/telecharger`, {params:{format}, responseType:'blob'}),
};

export const utilisateursAPI = {
  lister:    ()        => api.get('/utilisateurs'),
  creer:     (data)    => api.post('/utilisateurs', data),
  modifier:  (id,data) => api.put(`/utilisateurs/${id}`, data),
  supprimer: (id)      => api.delete(`/utilisateurs/${id}`),
  mdp:       (id,data) => api.put(`/utilisateurs/${id}/mdp`, data),
};

export const importAPI = {
  historique: () => api.get('/import/historique'),
  importer:   (type, data) => api.post(`/import/${type}`, data),
};
