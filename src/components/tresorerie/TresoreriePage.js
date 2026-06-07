import { useState, useEffect, useRef } from 'react';
import { tresorerieAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ImportDrop from '../import/ImportDrop';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(parseFloat(n)||0));
const fmtDate = (d) => { try{return new Date(d).toLocaleDateString('fr-FR');}catch{return'—';} };

const TABS = [
  {key:'all',   label:'Tous comptes'},
  {key:'caisse',label:'Caisses'},
  {key:'banque',label:'Banques'},
];

export default function TresoreriePage() {
  const { can } = useAuth();
  const [comptes,    setComptes]    = useState([]);
  const [mvts,       setMvts]       = useState([]);
  const [tabActif,   setTabActif]   = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(false);
  const [typeModal,  setTypeModal]  = useState('credit'); // 'credit' | 'debit'
  const [form,       setForm]       = useState({compte_id:'',montant:0,date:new Date().toISOString().slice(0,10),libelle:'',type_operation:'vente'});
  const fluxRef = useRef(); const fluxInst = useRef();
  const annuelRef = useRef(); const annuelInst = useRef();

  const isDGwrite = can('tresorerie')==='write';

  const charger = async () => {
    setLoading(true);
    try {
      const r = await tresorerieAPI.soldes();
      const d = r.data;
      const c = Array.isArray(d)?d:Array.isArray(d?.comptes)?d.comptes:Array.isArray(d?.data)?d.data:[];
      setComptes(c);
      if(c.length>0) setForm(f=>({...f,compte_id:c[0].id}));
    } catch { toast.error('Erreur trésorerie'); }
    finally { setLoading(false); }
  };

  const chargerMvts = async () => {
    try {
      const params={};
      if(tabActif!=='all') params.type_compte=tabActif;
      if(typeFilter!=='all') params.type=typeFilter;
      const r=await tresorerieAPI.mouvements(params);
      const d=r.data;
      setMvts(Array.isArray(d)?d:Array.isArray(d?.data)?d.data:[]);
    } catch { setMvts([]); }
  };

  useEffect(()=>{ charger(); },[]);
  useEffect(()=>{ chargerMvts(); },[tabActif,typeFilter]); // eslint-disable-line

  // Graphiques
  useEffect(()=>{
    import('chart.js/auto').then(({default:Chart})=>{
      if(fluxInst.current) fluxInst.current.destroy();
      if(annuelInst.current) annuelInst.current.destroy();
      Chart.defaults.color='#64748b';Chart.defaults.borderColor='#1e3a5f';
      Chart.defaults.font.family="'Sora',sans-serif";Chart.defaults.font.size=10;

      if(fluxRef.current) fluxInst.current = new Chart(fluxRef.current,{
        type:'bar',
        data:{labels:['Déc','Jan','Fév','Mar','Avr','Mai'],
          datasets:[
            {label:'Entrées',data:[2400,3100,2800,3500,4200,3800],backgroundColor:'rgba(52,211,153,.7)',borderRadius:4},
            {label:'Sorties',data:[1800,2400,2100,2900,3100,2600],backgroundColor:'rgba(248,113,113,.7)',borderRadius:4},
          ]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{position:'bottom',labels:{boxWidth:8,padding:8}}},
          scales:{y:{grid:{color:'rgba(30,58,95,.5)'}},x:{grid:{display:false}}}}
      });
      if(annuelRef.current) annuelInst.current = new Chart(annuelRef.current,{
        type:'bar',
        data:{labels:['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'],
          datasets:[
            {label:'Entrées',data:[3100,2800,3500,4200,3800,0,0,0,0,0,0,0],backgroundColor:'rgba(52,211,153,.7)',borderRadius:4},
            {label:'Sorties',data:[2400,2100,2900,3100,2600,0,0,0,0,0,0,0],backgroundColor:'rgba(248,113,113,.7)',borderRadius:4},
          ]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{position:'bottom',labels:{boxWidth:8,padding:8}}},
          scales:{y:{grid:{color:'rgba(30,58,95,.5)'}},x:{grid:{display:false}}}}
      });
    });
  },[]);

  const total = comptes.reduce((s,c)=>s+parseFloat(c.solde_fcfa||c.solde||0),0);
  const maxS  = Math.max(...comptes.map(c=>Math.abs(parseFloat(c.solde_fcfa||0))),1);
  const CCOLORS=['var(--cyan)','var(--purple)','var(--amber)','var(--green)','var(--teal)'];

  const TYPE_OPS_CREDIT = [
    {v:'vente',      l:'Vente produits'},
    {v:'recouvrement',l:'Recouvrement client'},
    {v:'apport',     l:'Apport en capital'},
    {v:'autre_credit',l:'Autre entrée'},
  ];
  const TYPE_OPS_DEBIT = [
    {v:'achat_mp',   l:'Achat matières premières'},
    {v:'salaire',    l:'Salaires'},
    {v:'frais_gen',  l:'Frais généraux'},
    {v:'maintenance',l:'Maintenance'},
    {v:'transport',  l:'Transport'},
    {v:'autre_debit',l:'Autre sortie'},
  ];

  const ouvrirModal = (type) => {
    setTypeModal(type);
    setForm({compte_id:comptes[0]?.id||'',montant:0,date:new Date().toISOString().slice(0,10),libelle:'',type_operation:type==='credit'?'vente':'achat_mp'});
    setModal(true);
  };

  const saveMvt = async () => {
    if(!form.compte_id||!form.montant){toast.error('Renseignez tous les champs');return;}
    try {
      await tresorerieAPI.ajouterMouvement({
        compte_id:form.compte_id,
        sens:typeModal,
        montant_fcfa:+form.montant,
        date_mouvement:form.date,
        description:form.libelle,
        type_operation:form.type_operation,
      });
      toast.success(typeModal==='credit'?'Entrée enregistrée ✓':'Sortie enregistrée ✓');
      setModal(false); charger(); chargerMvts();
    } catch(e){ toast.error(e.response?.data?.message||'Erreur'); }
  };

  return (
    <div className="fade-up">
      {/* Import Excel */}
      {isDGwrite&&(
        <ImportDrop type="tresorerie" icon="💰" color="green"
          label="Import Trésorerie Excel — Glissez votre fichier de mouvements ici"
          onSuccess={()=>{ charger(); chargerMvts(); }}/>
      )}

      {/* Cartes comptes */}
      <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(comptes.length||1,5)},1fr)`,gap:10,marginBottom:10}}>
        {comptes.map((c,i)=>(
          <div key={i} className="kpi" style={{borderTop:`2px solid ${CCOLORS[i%CCOLORS.length]}`}}>
            <div className="kpi-lbl">{c.libelle||c.nom}</div>
            <div className="kpi-val" style={{fontSize:16,color:CCOLORS[i%CCOLORS.length]}}>{fmt(c.solde_fcfa||c.solde||0)}</div>
            <div className="kpi-sub kn">FCFA</div>
            <div className="kbar"><div className="kbar-f" style={{width:`${Math.round(Math.abs(parseFloat(c.solde_fcfa||0))/maxS*100)}%`,background:CCOLORS[i%CCOLORS.length]}}/></div>
          </div>
        ))}
      </div>

      <div className="tot-row" style={{marginBottom:14}}>
        <span className="tot-lbl">TOTAL TRÉSORERIE</span>
        <span className="tot-val">{fmt(total)} FCFA</span>
      </div>

      {/* Boutons entrée/sortie */}
      {isDGwrite&&(
        <div style={{display:'flex',gap:10,marginBottom:14}}>
          <button className="btn success" style={{flex:1,justifyContent:'center',padding:'10px',fontSize:12,fontWeight:600}} onClick={()=>ouvrirModal('credit')}>
            ↑ Enregistrer une entrée d'argent
          </button>
          <button className="btn danger" style={{flex:1,justifyContent:'center',padding:'10px',fontSize:12,fontWeight:600}} onClick={()=>ouvrirModal('debit')}>
            ↓ Enregistrer une sortie d'argent
          </button>
        </div>
      )}

      {/* Onglets + filtres */}
      <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:9,padding:3}}>
          {TABS.map(t=>(
            <button key={t.key} className={`treso-tab${tabActif===t.key?' active':''}`} onClick={()=>setTabActif(t.key)}>{t.label}</button>
          ))}
          {comptes.map(c=>(
            <button key={c.id} className={`treso-tab${tabActif===c.id?' active':''}`} onClick={()=>setTabActif(c.id)}>
              {c.libelle||c.nom}
            </button>
          ))}
        </div>
        <select className="form-sel" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{marginLeft:'auto'}}>
          <option value="all">Tous mouvements</option>
          <option value="credit">Entrées</option>
          <option value="debit">Sorties</option>
        </select>
      </div>

      {/* Brouillard + graphique flux */}
      <div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:12,marginBottom:12}}>
        <div className="card">
          <div className="card-hd"><div className="card-t">Brouillard de caisse</div><span className="cbadge bc">Temps réel</span></div>
          <div style={{overflowX:'auto'}}>
            <table className="tbl" style={{minWidth:480}}>
              <thead><tr><th>Date</th><th>Compte</th><th>Libellé</th><th style={{textAlign:'right'}}>Entrée</th><th style={{textAlign:'right'}}>Sortie</th><th style={{textAlign:'right'}}>Solde</th></tr></thead>
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

      {/* Graphique annuel */}
      <div className="card">
        <div className="card-hd"><div className="card-t">📈 Flux annuels — Entrées vs Sorties</div><span className="cbadge bg">×1000 FCFA</span></div>
        <div style={{position:'relative',height:220}}><canvas ref={annuelRef}/></div>
      </div>

      {/* Modal entrée/sortie */}
      {modal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{width:480}}>
            <div className="modal-title" style={{color:typeModal==='credit'?'var(--green)':'var(--red)'}}>
              {typeModal==='credit'?'↑ Entrée d\'argent':'↓ Sortie d\'argent'}
              <button className="modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="form-grp" style={{marginBottom:12}}>
              <label className="form-lbl">Compte *</label>
              <select className="form-sel" style={{width:'100%'}} value={form.compte_id} onChange={e=>setForm(f=>({...f,compte_id:e.target.value}))}>
                {comptes.map(c=><option key={c.id} value={c.id}>{c.libelle||c.nom}</option>)}
              </select>
            </div>
            <div className="form-grp" style={{marginBottom:12}}>
              <label className="form-lbl">Nature de l'opération *</label>
              <select className="form-sel" style={{width:'100%'}} value={form.type_operation} onChange={e=>setForm(f=>({...f,type_operation:e.target.value}))}>
                {(typeModal==='credit'?TYPE_OPS_CREDIT:TYPE_OPS_DEBIT).map(t=>(
                  <option key={t.v} value={t.v}>{t.l}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-grp">
                <label className="form-lbl">Montant (FCFA) *</label>
                <input type="number" className="form-inp" min={1} value={form.montant} onChange={e=>setForm(f=>({...f,montant:e.target.value}))}/>
              </div>
              <div className="form-grp">
                <label className="form-lbl">Date *</label>
                <input type="date" className="form-inp" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
              </div>
            </div>
            <div className="form-grp" style={{marginBottom:16}}>
              <label className="form-lbl">Libellé / Description</label>
              <input type="text" className="form-inp" value={form.libelle} onChange={e=>setForm(f=>({...f,libelle:e.target.value}))}
                placeholder={typeModal==='credit'?'Ex: Vente C24 - Client ABC':'Ex: Achat préformes - Fournisseur XYZ'}/>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn" onClick={()=>setModal(false)}>Annuler</button>
              <button className={`btn ${typeModal==='credit'?'success':'danger'}`} onClick={saveMvt}>
                {typeModal==='credit'?'✓ Enregistrer l\'entrée':'✓ Enregistrer la sortie'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
