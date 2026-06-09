import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ParametresPage() {
  const { user } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem('sinex_theme')||'dark');
  const [notifs, setNotifs] = useState({
    email: localStorage.getItem('sinex_notif_email')!=='false',
    stock: localStorage.getItem('sinex_notif_stock')!=='false',
    atp:   localStorage.getItem('sinex_notif_atp')  !=='false',
  });

  const appliquerTheme = (t) => {
    setTheme(t);
    localStorage.setItem('sinex_theme', t);
    document.documentElement.setAttribute('data-theme', t);
    toast.success(t==='light'?'Mode clair activé ✓':'Mode sombre activé ✓');
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []); // eslint-disable-line

  const sauverNotifs = () => {
    Object.entries(notifs).forEach(([k,v]) => localStorage.setItem(`sinex_notif_${k}`, String(v)));
    toast.success('Préférences sauvegardées ✓');
  };

  return (
    <div className="fade-up">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>

        {/* Apparence */}
        <div className="card">
          <div className="card-hd"><div className="card-t">🎨 Apparence</div></div>

          <div className="sec-title">Thème de l'interface</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
            <div onClick={()=>appliquerTheme('dark')}
              style={{cursor:'pointer',padding:16,borderRadius:10,textAlign:'center',
                border:`2px solid ${theme==='dark'?'var(--cyan)':'var(--border)'}`,
                background:theme==='dark'?'rgba(34,211,238,.06)':'var(--bg3)',
                transition:'all .2s'}}>
              <div style={{fontSize:28,marginBottom:6}}>🌙</div>
              <div style={{fontSize:12,fontWeight:600,color:theme==='dark'?'var(--cyan)':'var(--text2)'}}>Mode sombre</div>
              <div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>Interface foncée</div>
              {theme==='dark'&&<div style={{marginTop:8,fontSize:10,color:'var(--cyan)'}}>✓ Actif</div>}
            </div>
            <div onClick={()=>appliquerTheme('light')}
              style={{cursor:'pointer',padding:16,borderRadius:10,textAlign:'center',
                border:`2px solid ${theme==='light'?'var(--cyan)':'var(--border)'}`,
                background:theme==='light'?'rgba(34,211,238,.06)':'var(--bg3)',
                transition:'all .2s'}}>
              <div style={{fontSize:28,marginBottom:6}}>☀️</div>
              <div style={{fontSize:12,fontWeight:600,color:theme==='light'?'var(--cyan)':'var(--text2)'}}>Mode clair</div>
              <div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>Interface claire</div>
              {theme==='light'&&<div style={{marginTop:8,fontSize:10,color:'var(--cyan)'}}>✓ Actif</div>}
            </div>
          </div>

          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'var(--bg3)',borderRadius:8}}>
            <div>
              <div style={{fontSize:11,fontWeight:500}}>Basculer le thème</div>
              <div style={{fontSize:10,color:'var(--text3)'}}>Actuel : {theme==='dark'?'Mode sombre':'Mode clair'}</div>
            </div>
            <label className="tgl">
              <input type="checkbox" checked={theme==='light'} onChange={e=>appliquerTheme(e.target.checked?'light':'dark')}/>
              <span className="tgl-sl"/>
            </label>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="card-hd"><div className="card-t">🔔 Notifications</div></div>
          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
            {[
              ['email','Notifications par email','Recevoir les alertes par email'],
              ['stock','Alertes de stocks','Être notifié en cas de rupture ou stock faible'],
              ['atp','Alertes ATP','Être notifié si le taux d\'avancement est insuffisant'],
            ].map(([k,titre,desc])=>(
              <div key={k} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'var(--bg3)',borderRadius:8}}>
                <div>
                  <div style={{fontSize:11,fontWeight:500}}>{titre}</div>
                  <div style={{fontSize:10,color:'var(--text3)'}}>{desc}</div>
                </div>
                <label className="tgl">
                  <input type="checkbox" checked={notifs[k]} onChange={e=>setNotifs(n=>({...n,[k]:e.target.checked}))}/>
                  <span className="tgl-sl"/>
                </label>
              </div>
            ))}
          </div>
          <button className="btn primary" style={{width:'100%',justifyContent:'center'}} onClick={sauverNotifs}>
            ✓ Sauvegarder les préférences
          </button>
        </div>

        {/* Compte */}
        <div className="card">
          <div className="card-hd"><div className="card-t">👤 Mon compte</div></div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              ['Nom complet', user?.nom_complet||'—'],
              ['Email', user?.email||'—'],
              ['Rôle', user?.role||user?.nom_role||'—'],
            ].map(([l,v])=>(
              <div key={l} style={{padding:'10px 14px',background:'var(--bg3)',borderRadius:8}}>
                <div style={{fontSize:10,color:'var(--text3)',marginBottom:2}}>{l}</div>
                <div style={{fontSize:12,fontWeight:500,color:'var(--text1)'}}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Infos système */}
        <div className="card">
          <div className="card-hd"><div className="card-t">ℹ️ Informations système</div></div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[
              ['Application','SINEX-SA Production Dashboard'],
              ['Version','1.0.0'],
              ['Société','SINEX-SA — Eau Minérale HILIO'],
              ['Site','Défalé, Togo'],
              ['Développé par','CECO Group'],
            ].map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 14px',background:'var(--bg3)',borderRadius:8}}>
                <span style={{fontSize:10,color:'var(--text3)'}}>{l}</span>
                <span style={{fontSize:11,fontWeight:500,color:'var(--text1)'}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
