import { useState } from 'react';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Toggle=({defaultChecked})=>{
  const [v,setV]=useState(defaultChecked||false);
  return(
    <label className="tgl">
      <input type="checkbox" checked={v} onChange={e=>setV(e.target.checked)}/>
      <span className="tgl-sl"/>
    </label>
  );
};

const Cdot=({color,active,onClick})=>(
  <div className="cdot" style={{background:color,border:active?'2px solid white':'2px solid transparent',transform:active?'scale(1.15)':'none'}} onClick={onClick}/>
);

export default function ParametresPage(){
  const {user,getRole}=useAuth();
  const role=getRole();
  const [accent,setAccent]=useState('#22d3ee');
  const COULEURS=['#22d3ee','#34d399','#a78bfa','#f87171','#fbbf24'];

  const setAcc=(c)=>{
    setAccent(c);
    document.documentElement.style.setProperty('--cyan',c);
    document.documentElement.style.setProperty('--c-accent',c);
  };

  return(
    <div className="fade-up">
      <div className="sett-grid">
        {/* Société */}
        <div className="sett-sec">
          <div className="sett-t">🏢 Société</div>
          <div className="sett-row"><div><div className="sett-lbl">Nom société</div></div><input className="form-inp" defaultValue="SINEX-SA" style={{width:130,padding:'5px 9px'}}/></div>
          <div className="sett-row"><div><div className="sett-lbl">Site</div></div><input className="form-inp" defaultValue="Défalé" style={{width:130,padding:'5px 9px'}}/></div>
          <div className="sett-row"><div><div className="sett-lbl">Devise</div></div><select className="form-sel"><option>FCFA</option><option>EUR</option></select></div>
        </div>

        {/* Apparence */}
        <div className="sett-sec">
          <div className="sett-t">🎨 Apparence</div>
          <div className="sett-row">
            <div><div className="sett-lbl">Couleur accent</div><div className="sett-sub">Couleur principale</div></div>
            <div style={{display:'flex',gap:6}}>
              {COULEURS.map(c=><Cdot key={c} color={c} active={accent===c} onClick={()=>setAcc(c)}/>)}
            </div>
          </div>
          <div className="sett-row">
            <div><div className="sett-lbl">Sidebar compacte</div></div>
            <Toggle defaultChecked={false}/>
          </div>
        </div>

        {/* Notifications */}
        <div className="sett-sec">
          <div className="sett-t">🔔 Notifications</div>
          <div className="sett-row"><div><div className="sett-lbl">Rapport quotidien 07h00</div></div><Toggle defaultChecked={true}/></div>
          <div className="sett-row"><div><div className="sett-lbl">Alerte rupture stock</div></div><Toggle defaultChecked={true}/></div>
          <div className="sett-row"><div><div className="sett-lbl">Rapport hebdomadaire</div></div><Toggle defaultChecked={false}/></div>
        </div>

        {/* Mon compte */}
        <div className="sett-sec">
          <div className="sett-t">👤 Mon compte</div>
          <div className="sett-row"><div><div className="sett-lbl">Nom</div></div><input className="form-inp" defaultValue={user?.nom_complet||''} style={{width:150,padding:'5px 9px'}}/></div>
          <div className="sett-row"><div><div className="sett-lbl">Email</div></div><input className="form-inp" defaultValue={user?.email||''} style={{width:150,padding:'5px 9px'}}/></div>
          <div className="sett-row"><div><div className="sett-lbl">Rôle actuel</div></div><span className="cbadge bp">{ROLE_LABELS[role]||role}</span></div>
        </div>
      </div>

      <div style={{marginTop:12,display:'flex',justifyContent:'flex-end',gap:8}}>
        <button className="btn">Annuler</button>
        <button className="btn primary" onClick={()=>toast.success('Paramètres sauvegardés ✓')}>✓ Sauvegarder</button>
      </div>
    </div>
  );
}
