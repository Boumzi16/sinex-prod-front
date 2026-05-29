import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './components/auth/LoginPage';
import DashboardPage from './components/dashboard/DashboardPage';
import ProductionPage from './components/production/ProductionPage';
import AtpPage from './components/atp/AtpPage';
import StocksPage from './components/stocks/StocksPage';
import TresoreriePage from './components/tresorerie/TresoreriePage';
import RapportsPage from './components/rapports/RapportsPage';
import ImportPage from './components/import/ImportPage';
import ParametresPage from './components/parametres/ParametresPage';
import UtilisateursPage from './components/utilisateurs/UtilisateursPage';

function Guard({ path, element }) {
  const { user, canAccess, loading, getRole } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace/>;
  if (!canAccess(path)) {
    const role = getRole();
    const dest = {
      directeur_general:'/', operateur:'/production',
      pdg:'/', pca:'/', conseil_admin:'/rapports',
    }[role] || '/';
    return <Navigate to={dest} replace/>;
  }
  return element;
}

function DGOnly({ element }) {
  const { user, getRole, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace/>;
  if (getRole() !== 'directeur_general') return <Navigate to="/" replace/>;
  return element;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#070f1e',color:'#22d3ee',fontFamily:'Sora,sans-serif',fontSize:14}}>
      Chargement...
    </div>
  );
  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage/> : <Navigate to="/" replace/>}/>
      <Route element={user ? <AppLayout/> : <Navigate to="/login" replace/>}>
        <Route path="/"              element={<Guard path="/"           element={<DashboardPage/>}/>}/>
        <Route path="/production"    element={<Guard path="/production" element={<ProductionPage/>}/>}/>
        <Route path="/atp"           element={<Guard path="/atp"        element={<AtpPage/>}/>}/>
        <Route path="/stocks"        element={<Guard path="/stocks"     element={<StocksPage/>}/>}/>
        <Route path="/tresorerie"    element={<Guard path="/tresorerie" element={<TresoreriePage/>}/>}/>
        <Route path="/rapports"      element={<Guard path="/rapports"   element={<RapportsPage/>}/>}/>
        <Route path="/import"        element={<Guard path="/import"     element={<ImportPage/>}/>}/>
        <Route path="/parametres"    element={<Guard path="/parametres" element={<ParametresPage/>}/>}/>
        <Route path="/utilisateurs"  element={<DGOnly element={<UtilisateursPage/>}/>}/>
        <Route path="*"              element={<Navigate to="/" replace/>}/>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{
          style:{background:'#0d1f3c',color:'#f1f5f9',border:'1px solid #1e3a5f',fontSize:12},
          success:{iconTheme:{primary:'#34d399',secondary:'#0d1f3c'}},
          error:{iconTheme:{primary:'#f87171',secondary:'#0d1f3c'}},
        }}/>
        <AppRoutes/>
      </AuthProvider>
    </BrowserRouter>
  );
}
