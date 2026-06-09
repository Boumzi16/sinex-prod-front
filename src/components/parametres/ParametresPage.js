import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ParametresPage() {
  const { user } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem('sinex_theme')||'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const basculerTheme = () => {
    const n = theme==='dark'?'light':'dark';
    setTheme(n);
    localStorage.setItem('sinex_theme', n);
    document.documentElement.setAttribute('data-theme', n);
    toast.success(n==='light'?'Mode clair activé ✓':'Mode sombre activé ✓');
  };

  const role = user?._role || user?.role || 'operateur';
  const roleLabel = ROLE_LABELS[role] || role;

  return (
    <div className="fade-up">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>

        {/* Apparence */}
        <div className="card">
          <div className="card-hd"><div className="card-t">Apparence</div></div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:18}}>
            <div onClick={()=>theme!=='dark'&&basculerTheme()}
              style={{padding:20,borderRadius:12,textAlign:'center',cursor:'pointer',
                border:`2px solid ${theme==='dark'?'var(--cyan)':'var(--border)'}`,
                background:theme==='dark'?'var(--bg3)':'var(--bg2)',transition:'all .2s'}}>
              <div style={{fontSize:32,marginBottom:8}}>🌙</div>
              <div style={{fontWeight:600,fontSize:12,color:theme==='dark'?'var(--cyan)':'var(--text2)'}}>Mode sombre</div>
              <div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>Fond foncé, texte clair</div>
              {theme==='dark'&&<div style={{marginTop:10,fontSize:10,color:'var(--cyan)',fontWeight:600}}>● Actif</div>}
            </div>
            <div onClick={()=>theme!=='light'&&basculerTheme()}
              style={{padding:20,borderRadius:12,textAlign:'center',cursor:'pointer',
                border:`2px solid ${theme==='light'?'var(--cyan)':'var(--border)'}`,
                background:theme==='light'?'var(--bg3)':'var(--bg2)',transition:'all .2s'}}>
              <div style={{fontSize:32,marginBottom:8}}>☀️</div>
              <div style={{fontWeight:600,fontSize:12,color:theme==='light'?'var(--cyan)':'var(--text2)'}}>Mode clair</div>
              <div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>Fond blanc, texte foncé</div>
              {theme==='light'&&<div style={{marginTop:10,fontSize:10,color:'var(--cyan)',fontWeight:600}}>● Actif</div>}
            </div>
          </div>

          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'12px 16px',background:'var(--bg3)',borderRadius:10,
            border:'1px solid var(--border)'}}>
            <div>
              <div style={{fontSize:12,fontWeight:600}}>Thème actuel</div>
              <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>
                {theme==='dark'?'Interface sombre — confort nocturne':'Interface claire — confort diurne'}
              </div>
            </div>
            <label className="tgl">
              <input type="checkbox" checked={theme==='light'} onChange={basculerTheme}/>
              <span className="tgl-sl"/>
            </label>
          </div>
        </div>

        {/* Mon compte */}
        <div className="card">
          <div className="card-hd"><div className="card-t">Mon compte</div></div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div style={{padding:'14px 16px',background:'var(--bg3)',borderRadius:10,border:'1px solid var(--border)'}}>
              <div style={{fontSize:10,color:'var(--text3)',marginBottom:4,textTransform:'uppercase',letterSpacing:.5}}>Nom complet</div>
              <div style={{fontSize:13,fontWeight:600}}>{user?.nom_complet||'—'}</div>
            </div>
            <div style={{padding:'14px 16px',background:'var(--bg3)',borderRadius:10,border:'1px solid var(--border)'}}>
              <div style={{fontSize:10,color:'var(--text3)',marginBottom:4,textTransform:'uppercase',letterSpacing:.5}}>Adresse e-mail</div>
              <div style={{fontSize:13,fontFamily:'var(--mono)'}}>{user?.email||'—'}</div>
            </div>
            <div style={{padding:'14px 16px',background:'var(--bg3)',borderRadius:10,border:'1px solid var(--border)'}}>
              <div style={{fontSize:10,color:'var(--text3)',marginBottom:4,textTransform:'uppercase',letterSpacing:.5}}>Rôle</div>
              <div style={{fontSize:13,fontWeight:600,color:'var(--cyan)'}}>{roleLabel}</div>
            </div>
          </div>
        </div>

        {/* Informations système */}
        <div className="card" style={{gridColumn:'1 / -1'}}>
          <div className="card-hd"><div className="card-t">Informations système</div></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
            {[
              ['Application','SINEX SA Dashboard'],
              ['Version','1.0.0'],
              ['Société','SINEX SA'],
              ['Site de production','Défalé, Togo'],
              ['Stack technique','React.js · Node.js · PostgreSQL'],
              ['Hébergement','Vercel · Railway'],
              ['Développé par','CECO Group'],
              ['Année','2026'],
            ].map(([l,v])=>(
              <div key={l} style={{padding:'12px 14px',background:'var(--bg3)',borderRadius:10,border:'1px solid var(--border)'}}>
                <div style={{fontSize:9,color:'var(--text3)',marginBottom:4,textTransform:'uppercase',letterSpacing:.5}}>{l}</div>
                <div style={{fontSize:11,fontWeight:500}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
