import { useState, useEffect, useRef } from 'react';
import { tresorerieAPI } from '../../services/api';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ImportDrop from '../import/ImportDrop';
import { useRefresh } from '../../context/RefreshContext';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(parseFloat(n)||0));
const fmtDate = (d) => { try{return new Date(d).toLocaleDateString('fr-FR');}catch{return'—';} };

const MOIS_LISTE = [
  {v:'all',l:'Tous les mois'},
  {v:'2026-01',l:'Janvier'},{v:'2026-02',l:'Février'},{v:'2026-03',l:'Mars'},
  {v:'2026-04',l:'Avril'},{v:'2026-05',l:'Mai'},{v:'2026-06',l:'Juin'},
  {v:'2026-07',l:'Juillet'},{v:'2026-08',l:'Août'},{v:'2026-09',l:'Septembre'},
  {v:'2026-10',l:'Octobre'},{v:'2026-11',l:'Novembre'},{v:'2026-12',l:'Décembre'},
];

const NATURES = [
  'Vente eau','Règlement client','Dépôt espèces','Virement reçu','Apport capital',
  'Achat consommables','Achat pièces de rechange','Paiement salaires','Paiement transport',
  'Frais généraux','Remise en banque','Remboursement crédit','Frais bancaires',
  'Virement siège CECO','Paiement CNSS','Paiement OTR','Autres',
];

const CCOLORS = ['var(--cyan)','var(--purple)','var(--amber)','var(--green)'];

const VIDE_MVT = {
  compte_id:'', entree:0, sortie:0,
  date:new Date().toISOString().slice(0,10),
  nature_operation:'', description:'', piece_justificative:'',
};

export default function TresoreriePage() {
  const { can } = useAuth();
  const { triggerRefresh } = useRefresh();
  const isDGwrite = can('tresorerie') === 'write';

  const [onglet,      setOnglet]      = useState('brouillard');
  const [comptes,     setComptes]     = useState([]);
  const [mvts,        setMvts]        = useState([]);
  const [flux,        setFlux]        = useState([]);
  const [tabActif,    setTabActif]    = useState('all');
  const { moisGlobal, changerMois } = useRefresh();
  const [moisF,       setMoisF]       = useState(moisGlobal !== 'all' ? moisGlobal : 'all');
  const [typeFilter,  setTypeFilter]  = useState('all');
  const [anneeF,      setAnneeF]      = useState('all');
  const [modal,       setModal]       = useState(false);
  const [modalEdit,   setModalEdit]   = useState(null);
  const [form,        setForm]        = useState({...VIDE_MVT});
  const [formEdit,    setFormEdit]    = useState({});

  const fluxRef=useRef(); const fluxInst=useRef();

  const charger = async () => {
    try {
      const r = await tresorerieAPI.soldes();
      const d = r.data;
      const c = Array.isArray(d)?d:Array.isArray(d?.comptes)?d.comptes:[];
      setComptes(c);
      if(c.length>0 && !form.compte_id) setForm(f=>({...f,compte_id:c[0].id}));
    } catch(e) { toast.error('Erreur chargement trésorerie'); }
  };

  const chargerMvts = async () => {
    try {
      const params={};
      if(moisF!=='all')       params.mois=moisF;
      if(anneeF!=='all')      params.annee=anneeF;
      if(typeFilter!=='all')  params.type=typeFilter;
      if(tabActif!=='all')    params.compte_id=tabActif;
      const r = await tresorerieAPI.mouvements(params);
      const d = r.data;
      setMvts(Array.isArray(d)?d:[]);
    } catch { setMvts([]); }
  };

  const chargerFlux = async () => {
    try {
      const annee = anneeF!=='all'?anneeF:'2026';
      const r = await api.get(`/tresorerie/flux?annee=${annee}`);
      setFlux(r.data||[]);
    } catch { setFlux([]); }
  };

  useEffect(()=>{ charger(); },[]);  // eslint-disable-line
  useEffect(()=>{ chargerMvts(); chargerFlux(); },[tabActif,moisF,typeFilter,anneeF]); // eslint-disable-line

  useEffect(()=>{
    if(!flux.length) return;
    import('chart.js/auto').then(({default:Chart})=>{
      Chart.defaults.color='#64748b'; Chart.defaults.borderColor='#1e3a5f';
      Chart.defaults.font.family="'Sora',sans-serif"; Chart.defaults.font.size=10;
      const opts={responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'bottom',labels:{boxWidth:8,padding:8}}},
        scales:{y:{grid:{color:'rgba(30,58,95,.5)'}},x:{grid:{display:false}}}};
      const labels=flux.map(f=>f.mois?.slice(5)||f.mois);
      const entrees=flux.map(f=>parseFloat(f.entrees||0)/1000);
      const sorties=flux.map(f=>parseFloat(f.sorties||0)/1000);
      if(fluxInst.current) fluxInst.current.destroy();
      if(fluxRef.current) fluxInst.current=new Chart(fluxRef.current,{
        type:'bar',
        data:{labels,datasets:[
          {label:'Entrées',data:entrees,backgroundColor:'rgba(52,211,153,.7)',borderRadius:4},
          {label:'Sorties',data:sorties,backgroundColor:'rgba(248,113,113,.7)',borderRadius:4},
        ]},options:opts
      });
    });
  },[flux]);

  const total  = comptes.reduce((s,c)=>s+parseFloat(c.solde_fcfa||0),0);
  const maxS   = Math.max(...comptes.map(c=>Math.abs(parseFloat(c.solde_fcfa||0))),1);

  const ouvrirModal = () => {
    setForm({...VIDE_MVT, compte_id: comptes[0]?.id||''});
    setModal(true);
  };

  const saveMvt = async () => {
    if(!form.compte_id){ toast.error('Sélectionnez un compte'); return; }
    if(!form.entree && !form.sortie){ toast.error('Saisissez au moins une entrée ou une sortie'); return; }
    try {
      // Si entrée et sortie sur la même ligne → deux mouvements
      if(+form.entree > 0) {
        await tresorerieAPI.ajouterMouvement({
          compte_id: form.compte_id, sens:'credit',
          montant_fcfa: +form.entree,
          date_mouvement: form.date,
          description: form.description,
          nature_operation: form.nature_operation,
          piece_justificative: form.piece_justificative,
        });
      }
      if(+form.sortie > 0) {
        await tresorerieAPI.ajouterMouvement({
          compte_id: form.compte_id, sens:'debit',
          montant_fcfa: +form.sortie,
          date_mouvement: form.date,
          description: form.description,
          nature_operation: form.nature_operation,
          piece_justificative: form.piece_justificative,
        });
      }
      toast.success('Mouvement(s) enregistré(s) ✓');
      setModal(false); charger(); chargerMvts(); triggerRefresh();
    } catch(e){ toast.error(e.response?.data?.message||'Erreur'); }
  };

  const saveEditMvt = async () => {
    try {
      await api.put(`/tresorerie/mouvements/${modalEdit.id}`, formEdit);
      toast.success('Mouvement modifié ✓');
      setModalEdit(null); charger(); chargerMvts();
    } catch(e){ toast.error(e.response?.data?.message||'Erreur'); }
  };

  const deleteMvt = async (id) => {
    if(!window.confirm('Supprimer ce mouvement ?')) return;
    try {
      await api.delete(`/tresorerie/mouvements/${id}`);
      toast.success('Supprimé ✓'); charger(); chargerMvts();
    } catch(e){ toast.error(e.response?.data?.message||'Erreur'); }
  };

  const TABS=[{key:'all',label:'Tous'},...comptes.map(c=>({key:c.id,label:c.code||c.libelle}))];

  return(
    <div className="fade-up">
      {/* 4 cartes comptes */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:10}}>
        {comptes.map((c,i)=>(
          <div key={i} className="kpi" style={{borderTop:`2px solid ${CCOLORS[i%4]}`,cursor:'pointer'}} onClick={()=>setTabActif(c.id)}>
            <div className="kpi-lbl">{c.libelle}</div>
            <div className="kpi-val" style={{fontSize:16,color:CCOLORS[i%4]}}>{fmt(c.solde_fcfa||0)}</div>
            <div className="kpi-sub kn">FCFA</div>
            <div className="kbar"><div className="kbar-f" style={{width:`${Math.round(Math.abs(parseFloat(c.solde_fcfa||0))/maxS*100)}%`,background:CCOLORS[i%4]}}/></div>
          </div>
        ))}
        {!comptes.length && [0,1,2,3].map(i=>(
          <div key={i} className="kpi"><div className="kpi-lbl">—</div><div className="kpi-val">0</div></div>
        ))}
      </div>

      <div className="tot-row" style={{marginBottom:12}}>
        <span className="tot-lbl">TOTAL TRÉSORERIE</span>
        <span className="tot-val">{fmt(total)} FCFA</span>
      </div>

      {isDGwrite&&(
        <div style={{display:'flex',gap:10,marginBottom:14}}>
          <ImportDrop type="tresorerie" icon="💰" color="green"
            label="Import Trésorerie Excel — TRES_MOIS_ANNEE_SINEX_SA.xlsx"
            onSuccess={()=>{ charger(); chargerMvts(); triggerRefresh(); }}/>
          <button className="btn primary" style={{whiteSpace:'nowrap',padding:'11px 18px',fontSize:13,fontWeight:600}}
            onClick={ouvrirModal}>
            + Saisir un mouvement
          </button>
        </div>
      )}

      {/* Onglets */}
      <div style={{display:'flex',gap:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:9,padding:3,marginBottom:14,width:'fit-content'}}>
        <button className={`treso-tab${onglet==='brouillard'?' active':''}`} onClick={()=>setOnglet('brouillard')}>📋 Brouillard</button>
        <button className={`treso-tab${onglet==='flux'?' active':''}`} onClick={()=>setOnglet('flux')}>📈 Flux mensuels</button>
      </div>

      {/* ── BROUILLARD ── */}
      {onglet==='brouillard'&&(
        <>
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
              <option value="all">Toutes années</option>
              <option value="2025">2025</option><option value="2026">2026</option>
            </select>
            <select className="form-sel" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{marginLeft:'auto'}}>
              <option value="all">Tous</option>
              <option value="credit">Entrées</option>
              <option value="debit">Sorties</option>
            </select>
          </div>

          <div className="card">
            <div className="card-hd">
              <div className="card-t">{tabActif==='all'?'Tous comptes':`Relevé — ${comptes.find(c=>c.id===tabActif)?.libelle||''}`}</div>
              <span className="cbadge bc">{mvts.length} opération(s)</span>
            </div>
            <div style={{overflowX:'auto'}}>
              <table className="tbl" style={{minWidth:600}}>
                <thead><tr>
                  <th>Date</th><th>Compte</th><th>Nature</th><th>Libellé</th>
                  <th style={{textAlign:'right',color:'var(--green)'}}>Entrée</th>
                  <th style={{textAlign:'right',color:'var(--red)'}}>Sortie</th>
                  <th>Pièce</th>
                  {isDGwrite&&<th>Actions</th>}
                </tr></thead>
                <tbody>
                  {mvts.map((m,i)=>{
                    const isC=m.sens==='credit';
                    return(
                      <tr key={i}>
                        <td style={{fontFamily:'var(--mono)',fontSize:10,whiteSpace:'nowrap'}}>{fmtDate(m.date_mouvement)}</td>
                        <td><span className="st sconf" style={{fontSize:8}}>{m.compte_code||'—'}</span></td>
                        <td style={{fontSize:10,color:'var(--text3)'}}>{m.nature_operation||'—'}</td>
                        <td style={{maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:11}}>{m.description||'—'}</td>
                        <td style={{textAlign:'right',fontFamily:'var(--mono)',color:'var(--green)',fontWeight:isC?700:400}}>
                          {isC?`+${fmt(m.montant_fcfa||0)}`:'—'}
                        </td>
                        <td style={{textAlign:'right',fontFamily:'var(--mono)',color:'var(--red)',fontWeight:!isC?700:400}}>
                          {!isC?`-${fmt(m.montant_fcfa||0)}`:'—'}
                        </td>
                        <td style={{fontSize:9,color:'var(--text3)'}}>{m.piece_justificative||'—'}</td>
                        {isDGwrite&&(
                          <td style={{display:'flex',gap:3}}>
                            <button className="btn amber" style={{fontSize:9,padding:'2px 6px'}}
                              onClick={()=>{
                                setModalEdit(m);
                                setFormEdit({
                                  sens:m.sens, montant_fcfa:m.montant_fcfa,
                                  date_mouvement:m.date_mouvement?.slice(0,10),
                                  description:m.description,
                                  nature_operation:m.nature_operation,
                                  piece_justificative:m.piece_justificative,
                                });
                              }}>✎</button>
                            <button className="btn danger" style={{fontSize:9,padding:'2px 6px'}} onClick={()=>deleteMvt(m.id)}>✕</button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {!mvts.length&&<tr><td colSpan={isDGwrite?8:7} style={{textAlign:'center',color:'var(--text3)',padding:24}}>Aucun mouvement</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── FLUX MENSUELS ── */}
      {onglet==='flux'&&(
        <>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <select className="form-sel" value={anneeF} onChange={e=>setAnneeF(e.target.value)}>
              <option value="all">2026</option><option value="2025">2025</option>
            </select>
          </div>
          <div className="card">
            <div className="card-hd"><div className="card-t">Flux mensuels (×1 000 FCFA)</div><span className="cbadge bc">Réel</span></div>
            <div style={{position:'relative',height:260}}><canvas ref={fluxRef}/></div>
            {!flux.length&&<div style={{textAlign:'center',color:'var(--text3)',fontSize:11,padding:20}}>Aucun flux enregistré</div>}
          </div>
        </>
      )}

      {/* ── MODAL SAISIE MOUVEMENT ── */}
      {modal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{width:520}}>
            <div className="modal-title">
              + Saisir un mouvement de trésorerie
              <button className="modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>

            <div style={{background:'rgba(34,211,238,.05)',border:'1px solid rgba(34,211,238,.15)',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:11,color:'var(--cyan)'}}>
              ℹ️ Vous pouvez renseigner une entrée ET une sortie sur la même ligne — deux mouvements seront créés.
            </div>

            <div className="form-grp" style={{marginBottom:10}}>
              <label className="form-lbl">Compte *</label>
              <select className="form-sel" style={{width:'100%'}} value={form.compte_id} onChange={e=>setForm(f=>({...f,compte_id:e.target.value}))}>
                {comptes.map(c=><option key={c.id} value={c.id}>{c.libelle}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-grp">
                <label className="form-lbl" style={{color:'var(--green)'}}>↑ Entrée (FCFA)</label>
                <input type="number" className="form-inp" min={0} value={form.entree||0}
                  onChange={e=>setForm(f=>({...f,entree:e.target.value}))}
                  style={{color:'var(--green)',fontFamily:'var(--mono)',fontWeight:600}}/>
              </div>
              <div className="form-grp">
                <label className="form-lbl" style={{color:'var(--red)'}}>↓ Sortie (FCFA)</label>
                <input type="number" className="form-inp" min={0} value={form.sortie||0}
                  onChange={e=>setForm(f=>({...f,sortie:e.target.value}))}
                  style={{color:'var(--red)',fontFamily:'var(--mono)',fontWeight:600}}/>
              </div>
            </div>

            <div className="form-row">
              <div className="form-grp">
                <label className="form-lbl">Date *</label>
                <input type="date" className="form-inp" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
              </div>
              <div className="form-grp">
                <label className="form-lbl">Nature opération</label>
                <select className="form-sel" value={form.nature_operation} onChange={e=>setForm(f=>({...f,nature_operation:e.target.value}))}>
                  <option value="">— Choisir —</option>
                  {NATURES.map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-grp">
                <label className="form-lbl">Libellé / Description</label>
                <input type="text" className="form-inp" value={form.description}
                  onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                  placeholder="Ex: Vente C24 client X"/>
              </div>
              <div className="form-grp">
                <label className="form-lbl">Pièce justificative</label>
                <input type="text" className="form-inp" value={form.piece_justificative}
                  onChange={e=>setForm(f=>({...f,piece_justificative:e.target.value}))}
                  placeholder="N° facture, reçu..."/>
              </div>
            </div>

            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:8}}>
              <button className="btn" onClick={()=>setModal(false)}>Annuler</button>
              <button className="btn primary" onClick={saveMvt}>✓ Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL MODIFIER ── */}
      {modalEdit&&(
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
            <div className="form-grp" style={{marginBottom:10}}>
              <label className="form-lbl">Nature opération</label>
              <select className="form-sel" style={{width:'100%'}} value={formEdit.nature_operation} onChange={e=>setFormEdit(f=>({...f,nature_operation:e.target.value}))}>
                <option value="">— Choisir —</option>
                {NATURES.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
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
