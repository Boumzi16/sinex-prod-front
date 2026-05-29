import axios from 'axios';
const api = axios.create({ baseURL: process.env.REACT_APP_API_URL || '/api', timeout: 30000 });
api.interceptors.response.use(res => res, err => {
  if (err.response?.status === 401) { localStorage.removeItem('sinex_token'); localStorage.removeItem('sinex_user'); window.location.href = '/login'; }
  return Promise.reject(err);
});
export default api;
export const authAPI = { login:(data)=>api.post('/auth/login',data), profil:()=>api.get('/auth/profil') };
export const dashboardAPI = { consolide:(mois)=>api.get(`/dashboard/consolide?mois=${mois}`) };
export const productionAPI = {
  liste:(mois)=>api.get(`/production?mois=${mois}`), creer:(data)=>api.post('/production',data),
  valider:(id)=>api.put(`/production/${id}/valider`), supprimer:(id)=>api.delete(`/production/${id}`),
  kpis:(mois)=>api.get(`/production/kpis/mois-courant?mois=${mois}`),
  evolution:(d,f)=>api.get(`/production/kpis/evolution?debut=${d}&fin=${f}`),
};
export const stocksAPI = {
  soldes:(c)=>api.get('/stocks/soldes'+(c?`?classe=${c}`:'')),
  mouvements:(p)=>api.get('/stocks/mouvements',{params:p}),
  ajouterMouvement:(data)=>api.post('/stocks/mouvements',data),
  alertes:()=>api.get('/stocks/alertes'),
};
export const tresorerieAPI = {
  soldes:()=>api.get('/tresorerie/soldes'),
  mouvements:(p)=>api.get('/tresorerie/mouvements',{params:p}),
  ajouterMouvement:(data)=>api.post('/tresorerie/mouvements',data),
  updateSolde:(id,data)=>api.put(`/tresorerie/comptes/${id}`,data),
};
export const atpAPI = { dashboard:(mois)=>api.get('/dashboard/consolide'+(mois?`?mois=${mois}`:'')), objectifs:(mois)=>api.get(`/atp/objectifs?mois=${mois}`), realisations:(mois)=>api.get(`/atp/realisations?mois=${mois}`) };
export const rapportsAPI = { lister:(p)=>api.get('/rapports',{params:p}) };
export const importAPI = { excel:(fd)=>api.post('/import/excel',fd,{headers:{'Content-Type':'multipart/form-data'},timeout:120000}) };
export const refAPI = { formats:()=>api.get('/referentiels/formats'), intrants:()=>api.get('/referentiels/intrants') };
