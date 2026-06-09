import { useState, useEffect, useRef } from 'react';
import { tresorerieAPI } from '../../services/api';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ImportDrop from '../import/ImportDrop';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(parseFloat(n)||0));
const fmtDate = (d) => { try{return new Date(d).toLocaleDateString('fr-FR');}catch{return'—';} };

const MOIS_LISTE = [
  {v:'all',l:'Tous les mois'},
  {v:'2026-01',l:'Janvier 2026'},{v:'2026-02',l:'Février 2026'},{v:'2026-03',l:'Mars 2026'},
  {v:'2026-04',l:'Avril 2026'},{v:'2026-05',l:'Mai 2026'},{v:'2026-06',l:'Juin 2026'},
  {v:'2026-07',l:'Juillet 2026'},{v:'2026-08',l:'Août 2026'},{v:'2026-09',l:'Septembre 2026'},
  {v:'2026-10',l:'Octobre 2026'},{v:'2026-11',l:'Novembre 2026'},{v:'2026-12',l:'Décembre 2026'},
];

const TYPE_OPS_CREDIT = [
  {v:'vente',l:'Vente produits'},{v:'recouvrement',l:'Recouvrement client'},
  {v:'apport',l:'Apport en capital'},{v:'autre_credit',l:'Autre entrée'},
];
const TYPE_OPS_DEBIT = [
  {v:'achat_mp',l:'Achat matières premières'},{v:'salaire',l:'Salaires'},
  {v:'frais_gen',l:'Frais généraux'},{v:'maintenance',l:'Maintenance'},
  {v:'transport',l:'Transport'},{v:'autre_debit',l:'Autre sortie'},
];
const CCOLORS = ['var(--cyan)','var(--purple)','var(--amber)','var(--green)'];

export default function TresoreriePage() {
  const { can } = useAuth();
  const isDGwrite = can('tresorerie') === 'write';

  const [comptes,    setComptes]    = useState([]);
  const [mvts,       setMvts]       = useState([]);
  const [flux,       setFlux]       = useState([]);
  const [tabActif,   setTabActif]   = useState('all');
  const [moisF,      setMoisF]      = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [anneeF,     setAnneeF]     = useState('all');
  const [modal,      setModal]      = useState(false);
  const [typeModal,  setTypeModal]  = useState('credit');
  const [modalEdit,  setModalEdit]  = useState(null);
  const [form,       setForm]       = useState({compte_id:'',montant:0,date:new Date().toISOString().slice(0,10),libelle:'',type_operation:'vente'});
  const [formEdit,   setFormEdit]   = useState({});
  const fluxRef=useRef(); const fluxInst=useRef();
  const annuelRef=useRef(); const annuelInst=useRef();

  const charger = async () => {
    try {
      const r = await tresorerieAPI.soldes();
      const d = r.data;
      const c = Array.isArray(d)?d:Array.isArray(d?.comptes)?d.comptes:Array.isArray(d?.data)?d.data:[];
      const filtres = c.filter(x=>{
        const l=(x.libelle||x.nom||'').toLowerCase();
        return l.includes('caisse')||l.includes('batg')||l.includes('boa')||l.includes('bsic');
      });
      setComptes(filtres);
      if (filtres.length>0) setForm(f=>({...f,compte_id:filtres[0].id}));
    } catch { toast.error('Erreur trésorerie'); }
  };

  const chargerMvts = async () => {
    try {
      const params = {};
      if (moisF !== 'all') params.mois = moisF;
      if (anneeF !== 'all') params.annee = anneeF;
      if (typeFilter !== 'all') params.type = typeFilter;
      if (tabActif !== 'all') params.compte_id = tabActif;
      const r = await tresorerieAPI.mouvements(params);
      const d = r.data;
      setMvts(Array.isArray(d)?d:Array.isArray(d?.data)?d.data:[]);
    } catch { setMvts([]); }
  };

  const chargerFlux = async () => {
    try {
      const annee = anneeF!=='all' ? anneeF : '2026';
      const r = await api.get(`/tresorerie/flux?annee=${annee}`);
      setFlux(r.data||[]);
    } catch { setFlux([]); }
  };

  useEffect(() => { charger(); }, []);
  useEffect(() => { chargerMvts(); chargerFlux(); }, [tabActif, moisF, typeFilter, anneeF]); // eslint-disable-line

  // Graphiques flux réels
  useEffect(() => {
    if (!flux.length) return;
    import('chart.js/auto').then(({default:Chart}) => {
      Chart.defaults.color='#64748b'; Chart.defaults.borderColor='#1e3a5f';
      Chart.defaults.font.family="'Sora',sans-serif"; Chart.defaults.font.size=10;
      const opts = {
        responsive:true, maintainAspectRatio:false,
        plugins:{legend:{position:'bottom',labels:{boxWidth:8,padding:8}}},
        scales:{y:{grid:{color:'rgba(30,58,95,.5)'}},x:{grid:{display:false}}}
      };
      const labels = flux.map(f=>f.mois?.slice(5)||f.mois);
      const entrees = flux.map(f=>parseFloat(f.entrees||0)/1000);
      const sorties = flux.map(f=>parseFloat(f.sorties||0)/1000);

      if (fluxInst.current) fluxInst.current.destroy();
      if (fluxRef.current) fluxInst.current = new Chart(fluxRef.current,{
        type:'bar',
        data:{labels,datasets:[
          {label:'Entrées',data:entrees,backgroundColor:'rgba(52,211,153,.7)',borderRadius:4},
          {label:'Sorties',data:sorties,backgroundColor:'rgba(248,113,113,.7)',borderRadius:4},
        ]},
        options:opts
      });

      if (annuelInst.current) annuelInst.current.destroy();
      if (annuelRef.current) annuelInst.current = new Chart(annuelRef.current,{
        type:'bar',
        data:{
          labels:['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'],
          datasets:[
            {label:'Entrées',data:Array.from({length:12},(_,i)=>{const m=flux.find(f=>f.mois?.endsWith(`-${String(i+1).padStart(2,'0')}`));return m?parseFloat(m.entrees)/1000:0;}),backgroundColor:'rgba(52,211,153,.7)',borderRadius:4},
            {label:'Sorties',data:Array.from({length:12},(_,i)=>{const m=flux.find(f=>f.mois?.endsWith(`-${String(i+1).padStart(2,'0')}`));return m?parseFloat(m.sorties)/1000:0;}),backgroundColor:'rgba(248,113,113,.7)',borderRadius:4},
          ]},
        options:opts
      });
    });
  },[flux]);

  const total = comptes.reduce((s,c)=>s+parseFloat(c.solde_fcfa||0),0);
  const maxS  = Math.max(...comptes.map(c=>Math.abs(parseFloat(c.solde_fcfa||0))),1);

  const ouvrirModal = (type) => {
    setTypeModal(type);
    setForm({compte_id:comptes[0]?.id||'',montant:0,date:new Date().toISOString().slice(0,10),libelle:'',type_operation:type==='credit'?'vente':'achat_mp'});
    setModal(true);
  };

  const saveMvt = async () => {
    if (!form.compte_id||!form.montant){toast.error('Renseignez tous les champs');return;}
    try {
      await tresorerieAPI.ajouterMouvement({
        compte_id:form.compte_id, sens:typeModal, montant_fcfa:+form.montant,
        date_mouvement:form.date, description:form.libelle, type_operation:form.type_operation,
      });
      toast.success(typeModal==='credit'?'Entrée enregistrée ✓':'Sortie enregistrée ✓');
      setModal(false); charger(); chargerMvts();
    } catch(e) { toast.error(e.response?.data?.message||'Erreur'); }
  };

  const saveEditMvt = async () => {
    try {
      await api.put(`/tresorerie/mouvements/${modalEdit.id}`, formEdit);
      toast.success('Mouvement modifié ✓');
      setModalEdit(null); charger(); chargerMvts();
    } catch(e) { toast.error(e.response?.data?.message||'Erreur'); }
  };

  const deleteMvt = async (id) => {
    if (!window.confirm('Supprimer ce mouvement ?')) return;
    try {
      await api.delete(`/tresorerie/mouvements/${id}`);
      toast.success('Supprimé ✓'); charger(); chargerMvts();
    } catch(e) { toast.error(e.response?.data?.message||'Erreur'); }
  };

  const TABS = [{key:'all',label:'Tous'},...comptes.map(c=>({
    key:c.id,
    label:c.libelle?.includes('Caisse')?'Caisse':c.libelle?.includes('BOA')?'BOA':c.libelle?.includes('BSIC')?'BSIC':c.libelle?.includes('BATG')?'BATG':c.libelle
  }))];

  return (
    <div className="fade-up">
      {isDGwrite && (
        <ImportDrop type="tresorerie" icon="💰" color="green"
          label="Import Trésorerie Excel"
          onSuccess={()=>{ charger(); chargerMvts(); }}/>
      )}

      {/* 4 cartes comptes */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:10}}>
        {comptes.map((c,i)=>(
          <div key={i} className="kpi" style={{borderTop:`2px solid ${CCOLORS[i%4]}`,cursor:'pointer'}}
            onClick={()=>setTabActif(c.id)}>
            <div className="kpi-lbl">{c.libelle}</div>
            <div className="kpi-val" style={{fontSize:16,color:CCOLORS[i%4]}}>{fmt(c.solde_fcfa||0)}</div>
            <div className="kpi-sub kn">FCFA</div>
            <div className="kbar"><div className="kbar-f" style={{width:`${Math.round(Math.abs(parseFloat(c.solde_fcfa||0))/maxS*100)}%`,background:CCOLORS[i%4]}}/></div>
          </div>
        ))}
      </div>

      <div className="tot-row" style={{marginBottom:14}}>
        <span className="tot-lbl">TOTAL TRÉSORERIE</span>
        <span className="tot-val">{fmt(total)} FCFA</span>
      </div>

      {/* Boutons entrée/sortie */}
      {isDGwrite && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          <button className="btn success" style={{justifyContent:'center',padding:'11px',fontSize:13,fontWeight:600}} onClick={()=>ouvrirModal('credit')}>
            ↑ Enregistrer une entrée d'argent
          </button>
          <button className="btn danger" style={{justifyContent:'center',padding:'11px',fontSize:13,fontWeight:600}} onClick={()=>ouvrirModal('debit')}>
            ↓ Enregistrer une sortie d'argent
          </button>
        </div>
      )}

      {/* Filtres */}
      <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:9,padding:3}}>
          {TABS.map(t=>(
            <button key={t.key} className={`treso-tab${tabActif===t.key?' active':''}`} onClick={()=>setTabActif(t.key)}>{t.label}</button>
          ))}
        </div>
        <select className="form-sel" value={moisF} onChange={e=>{setMoisF(e.target.value);setAnneeF('all');}}>
          {MOIS_LISTE.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
        <select className="form-sel" value={anneeF} onChange={e=>{setAnneeF(e.target.value);setMoisF('all');}}>
          <option value="all">Toutes les années</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
        <select className="form-sel" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{marginLeft:'auto'}}>
          <option value="all">Tous mouvements</option>
          <option value="credit">Entrées</option>
          <option value="debit">Sorties</option>
        </select>
      </div>

      {/* Brouillard + graphique flux */}
      <div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:12,marginBottom:12}}>
        <div className="card">
          <div className="card-hd">
            <div className="card-t">{tabActif==='all'?'Brouillard de caisse — Tous comptes':`Relevé — ${comptes.find(c=>c.id===tabActif)?.libelle||''}`}</div>
            <span className="cbadge bc">Temps réel</span>
          </div>
          <div style={{overflowX:'auto'}}>
            <table className="tbl" style={{minWidth:500}}>
              <thead><tr>
                <th>Date</th><th>Compte</th><th>Libellé</th>
                <th style={{textAlign:'right'}}>Entrée</th>
                <th style={{textAlign:'right'}}>Sortie</th>
                <th style={{textAlign:'right'}}>Solde</th>
                {isDGwrite&&<th>Actions</th>}
              </tr></thead>
              <tbody>
                {mvts.map((m,i)=>{
                  const isC = m.sens==='credit';
                  return (
                    <tr key={i}>
                      <td style={{fontFamily:'var(--mono)',fontSize:9,whiteSpace:'nowrap'}}>{fmtDate(m.date_mouvement)}</td>
                      <td><span className="st sconf" style={{fontSize:8}}>{m.compte_libelle||'—'}</span></td>
                      <td style={{maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:11}}>{m.description||'—'}</td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)',color:'var(--green)',whiteSpace:'nowrap'}}>{isC?`+${fmt(m.montant_fcfa||0)}`:'-'}</td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)',color:'var(--red)',whiteSpace:'nowrap'}}>{!isC?`-${fmt(m.montant_fcfa||0)}`:'-'}</td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,color:'var(--cyan)',whiteSpace:'nowrap'}}>{fmt(m.solde_apres||0)}</td>
                      {isDGwrite && (
                        <td style={{display:'flex',gap:3}}>
                          <button className="btn amber" style={{fontSize:9,padding:'2px 6px'}}
                            onClick={()=>{setModalEdit(m);setFormEdit({sens:m.sens,montant_fcfa:m.montant_fcfa,date_mouvement:m.date_mouvement?.slice(0,10),description:m.description,type_operation:m.type_operation});}}>
                            ✎
                          </button>
                          <button className="btn danger" style={{fontSize:9,padding:'2px 6px'}} onClick={()=>deleteMvt(m.id)}>✕</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {!mvts.length && <tr><td colSpan={isDGwrite?7:6} style={{textAlign:'center',color:'var(--text3)',padding:20}}>Aucun mouvement</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><div className="card-t">Flux mensuels</div><span className="cbadge bc">×1000 FCFA</span></div>
          <div style={{position:'relative',height:200}}><canvas ref={fluxRef}/></div>
          {!flux.length && <div style={{textAlign:'center',color:'var(--text3)',fontSize:11,marginTop:8}}>Aucun flux enregistré</div>}
        </div>
      </div>

      {/* Graphique annuel */}
      <div className="card">
        <div className="card-hd">
          <div className="card-t">📈 Flux annuels — Entrées vs Sorties {anneeF!=='all'?anneeF:'2026'}</div>
          <span className="cbadge bg">×1000 FCFA</span>
        </div>
        <div style={{position:'relative',height:220}}><canvas ref={annuelRef}/></div>
      </div>

      {/* Modal Entrée/Sortie */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{width:480}}>
            <div className="modal-title" style={{color:typeModal==='credit'?'var(--green)':'var(--red)'}}>
              {typeModal==='credit'?'↑ Entrée d\'argent':'↓ Sortie d\'argent'}
              <button className="modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="form-grp" style={{marginBottom:12}}>
              <label className="form-lbl">Compte *</label>
              <select className="form-sel" style={{width:'100%'}} value={form.compte_id} onChange={e=>setForm(f=>({...f,compte_id:e.target.value}))}>
                {comptes.map(c=><option key={c.id} value={c.id}>{c.libelle}</option>)}
              </select>
            </div>
            <div className="form-grp" style={{marginBottom:12}}>
              <label className="form-lbl">Nature *</label>
              <select className="form-sel" style={{width:'100%'}} value={form.type_operation} onChange={e=>setForm(f=>({...f,type_operation:e.target.value}))}>
                {(typeModal==='credit'?TYPE_OPS_CREDIT:TYPE_OPS_DEBIT).map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
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
              <label className="form-lbl">Libellé</label>
              <input type="text" className="form-inp" value={form.libelle} onChange={e=>setForm(f=>({...f,libelle:e.target.value}))}
                placeholder={typeModal==='credit'?'Ex: Vente C24 — Client ABC':'Ex: Achat préformes — Fournisseur XYZ'}/>
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

      {/* Modal Modifier Mouvement */}
      {modalEdit && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModalEdit(null)}>
          <div className="modal" style={{width:460}}>
            <div className="modal-title">✎ Modifier le mouvement<button className="modal-close" onClick={()=>setModalEdit(null)}>✕</button></div>
            <div className="form-grp" style={{marginBottom:10}}>
              <label className="form-lbl">Sens</label>
              <select className="form-sel" style={{width:'100%'}} value={formEdit.sens} onChange={e=>setFormEdit(f=>({...f,sens:e.target.value}))}>
                <option value="credit">↑ Entrée</option>
                <option value="debit">↓ Sortie</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-grp">
                <label className="form-lbl">Montant (FCFA)</label>
                <input type="number" className="form-inp" min={0} value={formEdit.montant_fcfa} onChange={e=>setFormEdit(f=>({...f,montant_fcfa:+e.target.value}))}/>
              </div>
              <div className="form-grp">
                <label className="form-lbl">Date</label>
                <input type="date" className="form-inp" value={formEdit.date_mouvement} onChange={e=>setFormEdit(f=>({...f,date_mouvement:e.target.value}))}/>
              </div>
            </div>
            <div className="form-grp" style={{marginBottom:16}}>
              <label className="form-lbl">Description</label>
              <input type="text" className="form-inp" value={formEdit.description} onChange={e=>setFormEdit(f=>({...f,description:e.target.value}))}/>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn" onClick={()=>setModalEdit(null)}>Annuler</button>
              <button className="btn primary" onClick={saveEditMvt}>✓ Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
