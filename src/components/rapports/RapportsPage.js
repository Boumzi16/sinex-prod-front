import { useState, useEffect } from 'react';
import { rapportsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const CARTES = [
  {icon:'📊',titre:'Rapport production mensuel',desc:'Synthèse par format, rebuts, jours ouvrés',btns:['PDF','Excel']},
  {icon:'💰',titre:'Rapport financier ATP',desc:'CA, MB, Trésorerie, Stocks',btns:['PDF','Excel']},
  {icon:'📦',titre:'État des stocks',desc:'Inventaire, niveaux, alertes',btns:['PDF','Excel']},
  {icon:'📈',titre:'Analyse des tendances',desc:'Évolution 12 mois glissants',btns:['PDF']},
  {icon:'📉',titre:'Rapport des rebuts',desc:'Pertes par intrant, taux',btns:['PDF','Excel']},
  {icon:'📧',titre:'Rapport email automatique',desc:'Envoi quotidien 07h00',btns:['config']},
];

const MOIS = ['Tous les mois','Janvier 2026','Février 2026','Mars 2026','Avril 2026','Mai 2026'];
const TYPES = ['Tous les types','Production','Financier','Stocks'];

export default function RapportsPage(){
  const [rapports,setRapports]=useState([]);
  const [moisF,setMoisF]=useState('Tous les mois');
  const [typeF,setTypeF]=useState('Tous les types');
  const [loading,setLoading]=useState(true);

  const charger=async()=>{
    setLoading(true);
    try{
      const params={};
      if(moisF!=='Tous les mois') params.mois=moisF;
      if(typeF!=='Tous les types') params.type=typeF;
      const r=await rapportsAPI.lister(params);
      const d=r.data;
      setRapports(Array.isArray(d)?d:Array.isArray(d?.data)?d.data:[]);
    }catch{toast.error('Erreur rapports');setRapports([]);}
    finally{setLoading(false);}
  };
  useEffect(()=>{charger();},[]);

  return(
    <div className="fade-up">
      {/* Filtres */}
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14,flexWrap:'wrap'}}>
        <select className="form-sel" value={moisF} onChange={e=>setMoisF(e.target.value)}>
          {MOIS.map(m=><option key={m}>{m}</option>)}
        </select>
        <select className="form-sel" value={typeF} onChange={e=>setTypeF(e.target.value)}>
          {TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
        <button className="btn primary" onClick={charger}>🔍 Filtrer</button>
      </div>

      {/* 6 cartes */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
        {CARTES.map((c,i)=>(
          <div key={i} className="card" style={{cursor:'pointer',transition:'border-color .2s',textAlign:'center'}}
            onMouseOver={e=>e.currentTarget.style.borderColor='var(--cyan)'}
            onMouseOut={e=>e.currentTarget.style.borderColor='var(--border)'}>
            <div style={{fontSize:26,marginBottom:8}}>{c.icon}</div>
            <div style={{fontSize:11,fontWeight:600,marginBottom:4}}>{c.titre}</div>
            <div style={{fontSize:9,color:'var(--text3)',marginBottom:10}}>{c.desc}</div>
            <div style={{display:'flex',gap:6,justifyContent:'center'}}>
              {c.btns.includes('PDF')   && <button className="btn primary" style={{fontSize:9}}>↓ PDF</button>}
              {c.btns.includes('Excel') && <button className="btn" style={{fontSize:9}}>↓ Excel</button>}
              {c.btns.includes('config')&& <button className="btn primary" style={{fontSize:9,margin:'0 auto'}}>⚙ Configurer</button>}
            </div>
          </div>
        ))}
      </div>

      {/* Historique */}
      <div className="card">
        <div className="card-hd">
          <div className="card-t">Historique des rapports</div>
          <span className="cbadge bc">{moisF==='Tous les mois'?'Tous':moisF}</span>
        </div>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Type</th><th>Période</th><th>Généré par</th><th>Action</th></tr></thead>
          <tbody>
            {rapports.map((r,i)=>(
              <tr key={i}>
                <td style={{fontFamily:'var(--mono)',fontSize:10}}>{r.genere_le?new Date(r.genere_le).toLocaleDateString('fr-FR'):'—'}</td>
                <td>{r.type_rapport||r.type||'—'}</td>
                <td style={{color:'var(--text3)'}}>{r.periode_debut||'—'}</td>
                <td style={{color:'var(--text2)'}}>{r.genere_par_nom||'—'}</td>
                <td><button className="btn" style={{fontSize:9,padding:'3px 8px'}}>↓ Télécharger</button></td>
              </tr>
            ))}
            {!rapports.length&&<tr><td colSpan={5} style={{textAlign:'center',color:'var(--text3)',padding:32}}>{loading?'Chargement...':'Aucun rapport pour cette période'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
