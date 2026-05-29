import { useState, useEffect, useRef } from 'react';
import { tresorerieAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ImportDrop from '../import/ImportDrop';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(parseFloat(n)||0));
const fmtDate = (d) => { try{return new Date(d).toLocaleDateString('fr-FR');}catch{return'—';} };

const COMPTES_DEF = [
  {key:'caisse',label:'Caisse Défalé',color:'var(--cyan)'},
  {key:'boa',   label:'BOA-TOGO',     color:'var(--purple)'},
  {key:'bsic',  label:'BSIC-TOGO',   color:'var(--amber)'},
  {key:'batg',  label:'BATG',         color:'var(--green)'},
];

const TABS = [
  {key:'all',   label:'Tous comptes'},
  {key:'caisse',label:'Caisse Défalé'},
  {key:'boa',   label:'BOA-TOGO'},
  {key:'bsic',  label:'BSIC-TOGO'},
  {key:'batg',  label:'BATG'},
];

export default function TresoreriePage() {
  const { can } = useAuth();
  const [comptes,    setComptes]    = useState([]);
  const [soldesEdit, setSoldesEdit] = useState({caisse:0,boa:0,bsic:0,batg:0});
  const [mvts,       setMvts]       = useState([]);
  const [tabActif,   setTabActif]   = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [, setLoading] = useState(true);
  const [modal,      setModal]      = useState(false);
  const [form,       setForm]       = useState({compte_id:'',type:'credit',montant:0,date:new Date().toISOString().slice(0,10),libelle:''});
  const fluxRef   = useRef(); const fluxInst   = useRef();
  const annuelRef = useRef(); const annuelInst = useRef();

  const isDGwrite = can('tresorerie') === 'write';

  const charger = async () => {
    setLoading(true);
    try {
      const r = await tresorerieAPI.soldes();
      const d = r.data;
      const c = Array.isArray(d)?d:Array.isArray(d?.comptes)?d.comptes:Array.isArray(d?.data)?d.data:[];
      setComptes(c);
      const ns={caisse:0,boa:0,bsic:0,batg:0};
      c.forEach(x=>{
        const lbl=(x.libelle||x.nom||'').toLowerCase();
        const s=parseFloat(x.solde_fcfa||x.solde||0);
        if(lbl.includes('fal')) ns.caisse=s;
        else if(lbl.includes('boa')) ns.boa=s;
        else if(lbl.includes('bsic')) ns.bsic=s;
        else if(lbl.includes('batg')||lbl.includes('atlantique')) ns.batg=s;
      });
      setSoldesEdit(ns);
      if(c.length>0) setForm(f=>({...f,compte_id:c[0].id}));
    } catch { toast.error('Erreur trésorerie'); }
    finally { setLoading(false); }
  };

  const chargerMvts = async () => {
    try {
      const params={};
      if(tabActif!=='all') params.compte_id=tabActif;
      if(typeFilter!=='all') params.type=typeFilter;
      const r=await tresorerieAPI.mouvements(params);
      const d=r.data;
      setMvts(Array.isArray(d)?d:Array.isArray(d?.data)?d.data:[]);
    } catch { setMvts([]); }
  };

  useEffect(()=>{ charger(); },[]);
  useEffect(()=>{ chargerMvts(); },[tabActif,typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Graphique flux 6 mois
  useEffect(()=>{
    import('chart.js/auto').then(({default:Chart})=>{
      Chart.defaults.color='#64748b';Chart.defaults.borderColor='#1e3a5f';
      Chart.defaults.font.family="'Sora',sans-serif";Chart.defaults.font.size=10;
      if(fluxInst.current) fluxInst.current.destroy();
      if(!fluxRef.current) return;
      fluxInst.current = new Chart(fluxRef.current,{
        type:'bar',
        data:{
          labels:['Déc','Jan','Fév','Mar','Avr','Mai'],
          datasets:[
            {label:'Entrées',data:[2400,3100,2800,3500,4200,3800],backgroundColor:'rgba(52,211,153,.7)',borderColor:'rgba(52,211,153,1)',borderWidth:1,borderRadius:4},
            {label:'Sorties', data:[1800,2400,2100,2900,3100,2600],backgroundColor:'rgba(248,113,113,.7)',borderColor:'rgba(248,113,113,1)',borderWidth:1,borderRadius:4},
          ]
        },
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{position:'bottom',labels:{boxWidth:8,padding:8}}},
          scales:{y:{grid:{color:'rgba(30,58,95,.5)'},ticks:{color:'#475569'}},x:{grid:{display:false},ticks:{color:'#475569'}}}}
      });
      // Graphique annuel 12 mois
      if(annuelInst.current) annuelInst.current.destroy();
      if(!annuelRef.current) return;
      annuelInst.current = new Chart(annuelRef.current,{
        type:'bar',
        data:{
          labels:['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'],
          datasets:[
            {label:'Entrées',data:[3100,2800,3500,4200,3800,0,0,0,0,0,0,0],backgroundColor:'rgba(52,211,153,.7)',borderColor:'rgba(52,211,153,1)',borderWidth:1,borderRadius:4},
            {label:'Sorties', data:[2400,2100,2900,3100,2600,0,0,0,0,0,0,0],backgroundColor:'rgba(248,113,113,.7)',borderColor:'rgba(248,113,113,1)',borderWidth:1,borderRadius:4},
          ]
        },
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{position:'bottom',labels:{boxWidth:8,padding:8}}},
          scales:{y:{grid:{color:'rgba(30,58,95,.5)'},ticks:{color:'#475569'}},x:{grid:{display:false},ticks:{color:'#475569'}}}}
      });
    });
  },[]);

  const updateSolde = (key,val) => setSoldesEdit(s=>({...s,[key]:parseFloat(val)||0}));
  const total = Object.values(soldesEdit).reduce((a,b)=>a+b,0);
  const maxS  = Math.max(...Object.values(soldesEdit),1);

  const saveMvt = async () => {
    if(!form.compte_id||!form.montant){toast.error('Renseignez tous les champs');return;}
    try {
      await tresorerieAPI.ajouterMouvement({
        compte_id:form.compte_id,sens:form.type,montant_fcfa:+form.montant,
        date_mouvement:form.date,description:form.libelle,
        type_operation:form.type==='credit'?'autre_credit':'autre_debit',
      });
      toast.success('Mouvement enregistré ✓'); setModal(false); charger(); chargerMvts();
    } catch(e){ toast.error(e.response?.data?.message||'Erreur'); }
  };

  const cardTitle = {
    all:'Brouillard de caisse — Tous comptes',
    caisse:'Relevé — Caisse Défalé', boa:'Relevé — BOA-TOGO',
    bsic:'Relevé — BSIC-TOGO', batg:'Relevé — BATG',
  };

  return (
    <div className="fade-up">

      {/* Import Excel */}
      {isDGwrite && (
        <ImportDrop type="tresorerie" icon="💰" color="green"
          label="Import Trésorerie Excel — Glissez votre fichier de mouvements ici"
          onSuccess={()=>{ charger(); chargerMvts(); }}/>
      )}

      {/* Cartes soldes éditables */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:10}}>
        {COMPTES_DEF.map(c=>(
          <div key={c.key} className="kpi" style={{borderTop:`2px solid ${c.color}`}}>
            <div className="kpi-lbl">{c.label}</div>
            <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
              <input type="number" className="form-inp"
                style={{fontFamily:'var(--mono)',fontSize:16,fontWeight:700,padding:'4px 8px',width:'100%',color:c.color}}
                value={soldesEdit[c.key]||''}
                onChange={e=>updateSolde(c.key,e.target.value)}
                readOnly={!isDGwrite}/>
            </div>
            <div style={{fontSize:9,color:'var(--text3)',marginTop:4}}>FCFA</div>
            <div className="pbar" style={{marginTop:8}}>
              <div className="pbar-f" style={{width:`${Math.round(soldesEdit[c.key]/maxS*100)}%`,background:c.color}}/>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="tot-row" style={{marginBottom:14}}>
        <span className="tot-lbl">TOTAL TRÉSORERIE</span>
        <span className="tot-val">{fmt(total)} FCFA</span>
      </div>

      {/* Onglets + filtres */}
      <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:9,padding:3,flexWrap:'wrap'}}>
          {TABS.map(t=>(
            <button key={t.key} className={`treso-tab${tabActif===t.key?' active':''}`} onClick={()=>setTabActif(t.key)}>{t.label}</button>
          ))}
        </div>
        {isDGwrite && <button className="btn primary" onClick={()=>setModal(true)}>+ Ajouter mouvement</button>}
        <select className="form-sel" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
          <option value="all">Tous mouvements</option>
          <option value="credit">Entrées</option>
          <option value="debit">Sorties</option>
        </select>
        <span style={{marginLeft:'auto',fontSize:10,color:'var(--text3)'}}>Brouillard mis à jour en temps réel</span>
      </div>

      {/* Brouillard + Flux 6 mois */}
      <div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:12,marginBottom:12}}>
        <div className="card">
          <div className="card-hd">
            <div className="card-t">{cardTitle[tabActif]||'Brouillard de caisse'}</div>
            <span className="cbadge bc">Tous</span>
          </div>
          <div style={{overflowX:'auto'}}>
            <table className="tbl" style={{minWidth:480}}>
              <thead><tr><th>Date</th><th>Compte</th><th>Libellé</th><th style={{textAlign:'right'}}>Entrée</th><th style={{textAlign:'right'}}>Sortie</th><th style={{textAlign:'right'}}>Solde cumulé</th></tr></thead>
              <tbody>
                {mvts.map((m,i)=>{
                  const isC=m.sens==='credit'||m.type_operation?.includes('credit');
                  return(
                    <tr key={i}>
                      <td style={{fontFamily:'var(--mono)',fontSize:9,whiteSpace:'nowrap'}}>{fmtDate(m.date_mouvement)}</td>
                      <td><span className="st sconf" style={{fontSize:8}}>{m.compte_libelle||m.compte||'—'}</span></td>
                      <td style={{maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.description||m.libelle||'—'}</td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)',color:'var(--green)',whiteSpace:'nowrap'}}>{isC?`+${fmt(m.montant_fcfa||m.montant||0)}`:'-'}</td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)',color:'var(--red)',whiteSpace:'nowrap'}}>{!isC?`-${fmt(m.montant_fcfa||m.montant||0)}`:'-'}</td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,color:'var(--cyan)',whiteSpace:'nowrap'}}>{fmt(m.solde_apres||0)}</td>
                    </tr>
                  );
                })}
                {!mvts.length&&<tr><td colSpan={6} style={{textAlign:'center',color:'var(--text3)',padding:20}}>Aucun mouvement</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><div className="card-t">Flux 6 mois</div><span className="cbadge bc">×1000 FCFA</span></div>
          <div style={{position:'relative',height:200}}><canvas ref={fluxRef}/></div>
        </div>
      </div>

      {/* Graphique flux annuels */}
      <div className="card">
        <div className="card-hd">
          <div className="card-t">📈 Flux annuels — Entrées vs Sorties</div>
          <span className="cbadge bg">×1000 FCFA</span>
        </div>
        <div style={{position:'relative',height:220}}>
          <canvas ref={annuelRef}/>
        </div>
      </div>

      {/* Modal */}
      {modal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-title">+ Nouveau mouvement de trésorerie<button className="modal-close" onClick={()=>setModal(false)}>✕</button></div>
            <div className="form-row">
              <div className="form-grp"><label className="form-lbl">Compte</label>
                <select className="form-sel" style={{width:'100%'}} value={form.compte_id} onChange={e=>setForm(f=>({...f,compte_id:e.target.value}))}>
                  {comptes.map(c=><option key={c.id} value={c.id}>{c.libelle||c.nom}</option>)}
                </select>
              </div>
              <div className="form-grp"><label className="form-lbl">Type</label>
                <select className="form-sel" style={{width:'100%'}} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                  <option value="credit">Entrée (crédit)</option>
                  <option value="debit">Sortie (débit)</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-grp"><label className="form-lbl">Montant (FCFA)</label><input type="number" className="form-inp" value={form.montant} onChange={e=>setForm(f=>({...f,montant:e.target.value}))}/></div>
              <div className="form-grp"><label className="form-lbl">Date</label><input type="date" className="form-inp" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
            </div>
            <div className="form-grp" style={{marginBottom:14}}><label className="form-lbl">Libellé</label><input type="text" className="form-inp" value={form.libelle} onChange={e=>setForm(f=>({...f,libelle:e.target.value}))} placeholder="Description du mouvement..."/></div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn" onClick={()=>setModal(false)}>Annuler</button>
              <button className="btn primary" onClick={saveMvt}>✓ Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
