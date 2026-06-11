import { useState, useEffect } from 'react';
import { stocksAPI } from '../../services/api';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ImportDrop from '../import/ImportDrop';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(parseFloat(n)||0));

const MOIS_LISTE = [
  {v:'all',l:'Tous les mois'},
  {v:'2026-01',l:'Janvier 2026'},{v:'2026-02',l:'Février 2026'},{v:'2026-03',l:'Mars 2026'},
  {v:'2026-04',l:'Avril 2026'},{v:'2026-05',l:'Mai 2026'},{v:'2026-06',l:'Juin 2026'},
  {v:'2026-07',l:'Juillet 2026'},{v:'2026-08',l:'Août 2026'},{v:'2026-09',l:'Septembre 2026'},
  {v:'2026-10',l:'Octobre 2026'},{v:'2026-11',l:'Novembre 2026'},{v:'2026-12',l:'Décembre 2026'},
];

export default function StocksPage() {
  const { can } = useAuth();
  const isDGwrite = can('stocks') === 'write';

  const [onglet,   setOnglet]   = useState('soldes'); // soldes | mouvements
  const [classe,   setClasse]   = useState('1');
  const [search,   setSearch]   = useState('');
  const [soldes,   setSoldes]   = useState([]);
  const [mvts,     setMvts]     = useState([]);
  const [moisF,    setMoisF]    = useState('all');
  const [typeF,    setTypeF]    = useState('all');
  const [classeF,  setClasseF]  = useState('all');
  const [loading,  setLoading]  = useState(true);
  // Modals
  const [modalEntree, setModalEntree] = useState(false);
  const [modalPrix,   setModalPrix]   = useState(false);
  const [modalEditMvt,setModalEditMvt]= useState(null); // mouvement à modifier
  const [formEntree,  setFormEntree]  = useState({article:'',qte:0,date:new Date().toISOString().slice(0,10),motif:''});
  const [formPrix,    setFormPrix]    = useState({id:'',libelle:'',prix:0});
  const [formMvt,     setFormMvt]     = useState({quantite:0,date:'',motif:'',type_mouvement:'entree'});
  const [modalEditArt,setModalEditArt] = useState(null);
  const [formArt,     setFormArt]      = useState({libelle:'',unite:'',seuil_alerte:0});

  const chargerSoldes = async () => {
    setLoading(true);
    try {
      const r = await stocksAPI.soldes();
      const d = r.data;
      setSoldes(Array.isArray(d)?d:Array.isArray(d?.data)?d.data:[]);
    } catch { toast.error('Erreur stocks'); }
    finally { setLoading(false); }
  };

  const chargerMvts = async () => {
    try {
      const params = new URLSearchParams();
      if (moisF !== 'all') params.append('mois', moisF);
      if (classeF !== 'all') params.append('classe', classeF);
      const r = await api.get(`/stocks/mouvements/resume?${params}`);
      setResume(r.data);
    } catch(e) { console.error(e); }
  };
  const chargerMvtsDetail = async () => {
    try {
      const params = {};
      if (moisF !== 'all') params.mois = moisF;
      if (typeF !== 'all') params.type = typeF;
      if (classeF !== 'all') params.classe = classeF;
      const r = await stocksAPI.mouvements(params);
      const d = r.data;
      setMvts(Array.isArray(d)?d:Array.isArray(d?.data)?d.data:[]);
    } catch { setMvts([]); }
  };

  useEffect(() => { chargerSoldes(); }, []);
  useEffect(() => { if (onglet==='mouvements') chargerMvts(); }, [onglet, moisF, typeF, classeF]); // eslint-disable-line

  const getStatut = (s) => {
    const stock = parseFloat(s.stock_actuel||0);
    if (stock <= 0) return 'out';
    if (s.seuil_alerte && stock <= s.seuil_alerte) return 'low';
    return 'ok';
  };

  const cl1 = soldes.filter(s=>String(s.classe)==='1');
  const cl2 = soldes.filter(s=>String(s.classe)==='2');
  const cl3 = soldes.filter(s=>String(s.classe)==='3');

  const filtered = soldes.filter(s => {
    const mC = String(s.classe) === classe;
    const mS = !search || s.libelle?.toLowerCase().includes(search.toLowerCase()) || s.code?.toLowerCase().includes(search.toLowerCase());
    return mC && mS;
  });

  const alertes1 = cl1.filter(s=>getStatut(s)==='low').length + cl1.filter(s=>getStatut(s)==='out').length;
  const alertes2 = cl2.filter(s=>getStatut(s)==='low').length + cl2.filter(s=>getStatut(s)==='out').length;

  const saveEntree = async () => {
    if (!formEntree.article||!formEntree.qte) { toast.error('Renseignez tous les champs'); return; }
    try {
      await stocksAPI.ajouterMouvement({
        article_id: formEntree.article, type_mouvement: 'entree',
        quantite: +formEntree.qte, date_mouvement: formEntree.date,
        motif: formEntree.motif||'Approvisionnement',
      });
      toast.success('Entrée enregistrée ✓');
      setModalEntree(false);
      setFormEntree({article:'',qte:0,date:new Date().toISOString().slice(0,10),motif:''});
      chargerSoldes();
    } catch(e) { toast.error(e.response?.data?.message||'Erreur'); }
  };

  const savePrix = async () => {
    try {
      await api.put(`/stocks/articles/${formPrix.id}/prix`, {prix_unitaire_ht: formPrix.prix});
      toast.success('Prix mis à jour ✓');
      setModalPrix(false);
      chargerSoldes();
    } catch(e) { toast.error(e.response?.data?.message||'Erreur'); }
  };

  const saveEditMvt = async () => {
    try {
      await api.put(`/stocks/mouvements/${modalEditMvt.id}`, formMvt);
      toast.success('Mouvement modifié ✓');
      setModalEditMvt(null);
      chargerMvts();
    } catch(e) { toast.error(e.response?.data?.message||'Erreur'); }
  };

  const deleteMvt = async (id) => {
    if (!window.confirm('Supprimer ce mouvement ?')) return;
    try {
      await api.delete(`/stocks/mouvements/${id}`);
      toast.success('Mouvement supprimé ✓');
      chargerMvts();
    } catch(e) { toast.error(e.response?.data?.message||'Erreur'); }
  };

  const saveEditArt = async () => {
    try {
      await api.put(`/stocks/articles/${modalEditArt.id}`, formArt);
      toast.success('Article modifié ✓');
      setModalEditArt(null); chargerSoldes();
    } catch(e) { toast.error(e.response?.data?.message||'Erreur'); }
  };

  const deleteArt = async (id, libelle) => {
    if (!window.confirm(`Supprimer l'article "${libelle}" ?`)) return;
    try {
      await api.delete(`/stocks/articles/${id}`);
      toast.success('Article supprimé ✓'); chargerSoldes();
    } catch(e) { toast.error(e.response?.data?.message||'Erreur'); }
  };

  const articlesMP = soldes.filter(s=>['1','2'].includes(String(s.classe)));

  return (
    <div className="fade-up">
      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:9,marginBottom:14}}>
        <div className="kpi cc"><div className="kpi-lbl">Classe 1</div><div className="kpi-val">{cl1.length}</div><div className="kpi-sub kn">Articles</div></div>
        <div className="kpi ca"><div className="kpi-lbl">Alertes C1+C2</div><div className="kpi-val">{alertes1+alertes2}</div><div className="kpi-sub kd">Faibles/Ruptures</div></div>
        <div className="kpi cg"><div className="kpi-lbl">Classe 2</div><div className="kpi-val">{cl2.length}</div><div className="kpi-sub kn">Articles</div></div>
        <div className="kpi cp"><div className="kpi-lbl">Produits finis</div><div className="kpi-val">{cl3.length}</div><div className="kpi-sub kn">Classe 3</div></div>
      </div>

      {/* Import + boutons actions */}
      {isDGwrite && (
        <ImportDrop type="stocks" icon="📦" color="amber"
          label="Import Stocks Excel — Entrées d'approvisionnement (Classe 1 & 2)"
          onSuccess={()=>chargerSoldes()}/>
      )}

      {/* Onglets principaux */}
      <div style={{display:'flex',gap:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:9,padding:3,marginBottom:12,width:'fit-content'}}>
        <button className={`treso-tab${onglet==='soldes'?' active':''}`} onClick={()=>setOnglet('soldes')}>📊 Stocks actuels</button>
        <button className={`treso-tab${onglet==='mouvements'?' active':''}`} onClick={()=>setOnglet('mouvements')}>🔄 Mouvements</button>
      </div>

      {/* ── ONGLET STOCKS ACTUELS ── */}
      {onglet==='soldes' && (
        <>
          {/* Sous-onglets par classe */}
          <div style={{display:'flex',gap:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:9,padding:3,marginBottom:12,width:'fit-content'}}>
            {[['1','📦 Classe 1 — Consommables production'],['2','🔧 Classe 2 — EPI & Pièces'],['3','✅ Classe 3 — Produits finis']].map(([v,l])=>(
              <button key={v} className={`treso-tab${classe===v?' active':''}`} onClick={()=>{setClasse(v);setSearch('');}}>
                {l}
                {v!=='3' && (v==='1'?alertes1:alertes2)>0 && (
                  <span style={{marginLeft:6,background:'var(--red)',color:'white',borderRadius:10,padding:'1px 5px',fontSize:8}}>{v==='1'?alertes1:alertes2}</span>
                )}
              </button>
            ))}
          </div>

          <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 11px'}}>
              <span style={{color:'var(--text3)'}}>🔍</span>
              <input type="text" placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{background:'none',border:'none',outline:'none',color:'var(--text1)',fontFamily:'var(--font)',fontSize:11,width:160}}/>
            </div>
            <div style={{display:'flex',gap:8,marginLeft:'auto'}}>
              {isDGwrite && classe!=='3' && (
                <button className="btn success" onClick={()=>{setFormEntree(f=>({...f,type_mouvement:'entree'}));setModalEntree(true);}}>↑ Entrée de stock</button>
              )}
              {isDGwrite && (classe==='2'||classe==='3') && (
                <button className="btn danger" onClick={()=>{setFormEntree(f=>({...f,type_mouvement:'sortie'}));setModalEntree(true);}}>↓ Sortie stock</button>
              )}
            </div>
            {classe==='3' && (
              <div style={{marginLeft:'auto',fontSize:11,color:'var(--cyan)',background:'rgba(34,211,238,.06)',border:'1px solid rgba(34,211,238,.15)',borderRadius:8,padding:'6px 12px'}}>
                ℹ️ Alimenté automatiquement par la production validée
              </div>
            )}
          </div>

          <div className="card" style={{overflowX:'auto'}}>
            <div className="card-hd">
              <div className="card-t">
                {classe==='1'&&'Classe 1 — Consommables de production'}
                {classe==='2'&&'Classe 2 — Consommables, EPI & Pièces de rechange'}
                {classe==='3'&&'Classe 3 — Produits finis'}
              </div>
              <span className="cbadge bc">{filtered.length} articles</span>
            </div>
            <table className="tbl">
              <thead><tr>
                <th>Article</th><th>Code</th><th>Unité</th>
                <th style={{textAlign:'right'}}>Stock actuel</th>
                <th style={{textAlign:'right'}}>Prix HT</th>
                <th style={{textAlign:'right'}}>Valeur HT</th>
                <th style={{textAlign:'right'}}>Seuil alerte</th>
                <th>Niveau</th><th>Statut</th>
                {isDGwrite&&<th>Actions</th>}
              </tr></thead>
              <tbody>
                {filtered.map((s,i)=>{
                  const st = getStatut(s);
                  const stock = parseFloat(s.stock_actuel||0);
                  const niv = s.seuil_alerte>0 ? Math.min(100,Math.round(stock/s.seuil_alerte*50)) : stock>0?100:0;
                  const barColor = st==='out'?'var(--red)':st==='low'?'var(--amber)':'var(--green)';
                  return (
                    <tr key={i}>
                      <td style={{fontWeight:500}}>{s.libelle}</td>
                      <td style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text3)'}}>{s.code}</td>
                      <td>{s.unite}</td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)',color:stock<0?'var(--red)':'var(--text1)'}}>{fmt(stock)}</td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)',color:'var(--text3)'}}>{fmt(s.prix_unitaire_ht||0)}</td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)'}}>{fmt(s.valeur_stock_ht||0)}</td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)'}}>{fmt(s.seuil_alerte||0)}</td>
                      <td style={{minWidth:80}}>
                        <div className="pbar"><div className="pbar-f" style={{width:`${Math.max(0,niv)}%`,background:barColor}}/></div>
                        <div style={{fontSize:8,color:'var(--text3)',marginTop:2}}>{Math.max(0,niv)}%</div>
                      </td>
                      <td>{st==='out'?<span className="st sout">Rupture</span>:st==='low'?<span className="st slow">Faible</span>:<span className="st sok">OK</span>}</td>
                      {isDGwrite && (
                        <td style={{display:'flex',gap:4,flexWrap:'nowrap'}}>
                          <button className="btn amber" style={{fontSize:9,padding:'3px 6px'}}
                            onClick={()=>{setFormPrix({id:s.id,libelle:s.libelle,prix:s.prix_unitaire_ht||0});setModalPrix(true);}}>
                            ✎ Prix
                          </button>
                          <button className="btn" style={{fontSize:9,padding:'3px 6px'}}
                            onClick={()=>{setModalEditArt(s);setFormArt({libelle:s.libelle,unite:s.unite,seuil_alerte:s.seuil_alerte||0});}}>
                            ✎ Art.
                          </button>
                          <button className="btn danger" style={{fontSize:9,padding:'3px 6px'}}
                            onClick={()=>deleteArt(s.id,s.libelle)}>
                            ✕
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr><td colSpan={isDGwrite?10:9} style={{textAlign:'center',color:'var(--text3)',padding:32}}>
                    {loading?'Chargement...':'Aucun article'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── ONGLET MOUVEMENTS ── */}
      {onglet==='mouvements' && (
        <>
          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
            <select className="form-sel" value={moisF} onChange={e=>setMoisF(e.target.value)}>
              {MOIS_LISTE.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <select className="form-sel" value={typeF} onChange={e=>setTypeF(e.target.value)}>
              <option value="all">Tous les mouvements</option>
              <option value="entree">Entrées uniquement</option>
              <option value="sortie">Sorties uniquement</option>
            </select>
            <select className="form-sel" value={classeF} onChange={e=>setClasseF(e.target.value)}>
              <option value="all">Toutes les classes</option>
              <option value="1">Classe 1 — Consommables</option>
              <option value="2">Classe 2 — EPI & Pièces</option>
              <option value="3">Classe 3 — Produits finis</option>
            </select>
            <button className="btn" style={{marginLeft:'auto'}} onClick={chargerMvts}>🔍 Filtrer</button>
            {isDGwrite && (
              <button className="btn danger" style={{fontSize:10}} onClick={effacerMouvements}>🗑 Effacer</button>
            )}
          </div>

          <div className="card" style={{overflowX:'auto'}}>
            <div className="card-hd">
              <div className="card-t">Mouvements de stock — Vue par article</div>
              <span className="cbadge bc">{resume.length} articles</span>
            </div>
            <table className="tbl" style={{minWidth:1100,fontSize:10}}>
              <thead>
                <tr>
                  <th style={{textAlign:'center',width:36}}>N°</th>
                  <th style={{width:90}}>Code</th>
                  <th style={{minWidth:200}}>Désignation / Article</th>
                  <th style={{textAlign:'center',width:60}}>Unité</th>
                  <th style={{textAlign:'right',width:100}}>Prix HT (FCFA)</th>
                  <th style={{textAlign:'right',width:110,background:'rgba(8,145,178,.10)',color:'var(--cyan)'}}>
                    Stock début mois<br/><span style={{fontSize:8,fontWeight:400}}>(solde mois préc.)</span>
                  </th>
                  <th style={{textAlign:'right',width:100,background:'rgba(220,38,38,.08)',color:'var(--red)'}}>
                    Sorties du mois
                  </th>
                  <th style={{textAlign:'right',width:100,background:'rgba(5,150,105,.08)',color:'var(--green)'}}>
                    Entrées du mois
                  </th>
                  <th style={{textAlign:'right',width:110,background:'rgba(8,145,178,.08)',color:'var(--cyan)'}}>
                    Solde fin de mois<br/><span style={{fontSize:8,fontWeight:400}}>(auto)</span>
                  </th>
                  <th style={{textAlign:'right',width:120}}>Valeur HT stock (FCFA)</th>
                </tr>
              </thead>
              <tbody>
                {(resume.length ? resume : []).map((a,i)=>{
                  const bg = i%2===0?'var(--bg2)':undefined;
                  const alerte = parseFloat(a.solde_fin||0) <= 0;
                  return (
                    <tr key={i} style={{background:bg}}>
                      <td style={{textAlign:'center',color:'var(--text3)',fontSize:9}}>{i+1}</td>
                      <td style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)'}}>{a.code}</td>
                      <td style={{fontWeight:600,fontSize:11}}>{a.libelle}</td>
                      <td style={{textAlign:'center',color:'var(--text2)'}}>{a.unite}</td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)',color:'var(--text2)'}}>
                        {a.prix_ht>0?fmt(a.prix_ht):'—'}
                      </td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,color:'var(--cyan)',background:'rgba(8,145,178,.06)'}}>
                        {fmt(a.stock_debut||0)}
                      </td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,color:'var(--red)',background:'rgba(220,38,38,.04)'}}>
                        {parseFloat(a.sorties||0)>0?fmt(a.sorties):'—'}
                      </td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,color:'var(--green)',background:'rgba(5,150,105,.04)'}}>
                        {parseFloat(a.entrees||0)>0?fmt(a.entrees):'—'}
                      </td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:700,
                          color:alerte?'var(--red)':'var(--cyan)',
                          background:'rgba(8,145,178,.06)'}}>
                        {fmt(a.solde_fin||0)}
                        {alerte&&<span style={{fontSize:8,marginLeft:3}}>⚠</span>}
                      </td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)',color:'var(--text2)'}}>
                        {parseFloat(a.valeur_ht||0)>0?fmt(a.valeur_ht):'—'}
                      </td>
                    </tr>
                  );
                })}
                {!resume.length && (
                  <tr><td colSpan={10} style={{textAlign:'center',color:'var(--text3)',padding:32}}>
                    Aucun mouvement — uploadez un fichier STK via Import
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal Entrée */}
      {modalEntree && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModalEntree(false)}>
          <div className="modal" style={{width:480}}>
            <div className="modal-title">{formEntree.type_mouvement==='sortie'?'↓ Sortie de stock':'📦 Entrée de stock'}<button className="modal-close" onClick={()=>setModalEntree(false)}>✕</button></div>
            <div className="form-grp" style={{marginBottom:12}}>
              <label className="form-lbl">Article *</label>
              <select className="form-sel" style={{width:'100%'}} value={formEntree.article} onChange={e=>setFormEntree(f=>({...f,article:e.target.value}))}>
                <option value="">Sélectionner...</option>
                <optgroup label="Classe 1 — Consommables production">
                  {articlesMP.filter(s=>String(s.classe)==='1').map(s=><option key={s.id} value={s.id}>{s.libelle} ({s.unite})</option>)}
                </optgroup>
                <optgroup label="Classe 2 — EPI & Pièces">
                  {articlesMP.filter(s=>String(s.classe)==='2').map(s=><option key={s.id} value={s.id}>{s.libelle} ({s.unite})</option>)}
                </optgroup>
              </select>
            </div>
            <div className="form-row">
              <div className="form-grp">
                <label className="form-lbl">Quantité *</label>
                <input type="number" className="form-inp" min={1} value={formEntree.qte} onChange={e=>setFormEntree(f=>({...f,qte:e.target.value}))}/>
              </div>
              <div className="form-grp">
                <label className="form-lbl">Date</label>
                <input type="date" className="form-inp" value={formEntree.date} onChange={e=>setFormEntree(f=>({...f,date:e.target.value}))}/>
              </div>
            </div>
            <div className="form-grp" style={{marginBottom:16}}>
              <label className="form-lbl">Motif / Fournisseur</label>
              <input type="text" className="form-inp" value={formEntree.motif} onChange={e=>setFormEntree(f=>({...f,motif:e.target.value}))} placeholder="Ex: Livraison fournisseur ABC"/>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn" onClick={()=>setModalEntree(false)}>Annuler</button>
              <button className={`btn ${formEntree.type_mouvement==='sortie'?'danger':'success'}`} onClick={saveEntree}>✓ Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifier Prix */}
      {modalPrix && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModalPrix(false)}>
          <div className="modal" style={{width:400}}>
            <div className="modal-title">✎ Modifier le prix HT<button className="modal-close" onClick={()=>setModalPrix(false)}>✕</button></div>
            <div style={{background:'rgba(251,191,36,.06)',border:'1px solid rgba(251,191,36,.2)',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:11,color:'var(--amber)'}}>
              Article : <strong>{formPrix.libelle}</strong>
            </div>
            <div className="form-grp" style={{marginBottom:16}}>
              <label className="form-lbl">Nouveau prix unitaire HT (FCFA) *</label>
              <input type="number" className="form-inp" min={0} value={formPrix.prix}
                onChange={e=>setFormPrix(f=>({...f,prix:+e.target.value}))} style={{fontFamily:'var(--mono)'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn" onClick={()=>setModalPrix(false)}>Annuler</button>
              <button className="btn primary" onClick={savePrix}>✓ Mettre à jour</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifier Article */}
      {modalEditArt && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModalEditArt(null)}>
          <div className="modal" style={{width:440}}>
            <div className="modal-title">✎ Modifier l'article<button className="modal-close" onClick={()=>setModalEditArt(null)}>✕</button></div>
            <div className="form-grp" style={{marginBottom:10}}>
              <label className="form-lbl">Désignation</label>
              <input type="text" className="form-inp" value={formArt.libelle} onChange={e=>setFormArt(f=>({...f,libelle:e.target.value}))}/>
            </div>
            <div className="form-row">
              <div className="form-grp">
                <label className="form-lbl">Unité</label>
                <input type="text" className="form-inp" value={formArt.unite} onChange={e=>setFormArt(f=>({...f,unite:e.target.value}))}/>
              </div>
              <div className="form-grp">
                <label className="form-lbl">Seuil d'alerte</label>
                <input type="number" className="form-inp" min={0} value={formArt.seuil_alerte} onChange={e=>setFormArt(f=>({...f,seuil_alerte:+e.target.value}))}/>
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}>
              <button className="btn" onClick={()=>setModalEditArt(null)}>Annuler</button>
              <button className="btn primary" onClick={saveEditArt}>✓ Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifier Mouvement */}
      {modalEditMvt && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModalEditMvt(null)}>
          <div className="modal" style={{width:440}}>
            <div className="modal-title">✎ Modifier le mouvement<button className="modal-close" onClick={()=>setModalEditMvt(null)}>✕</button></div>
            <div style={{fontSize:11,color:'var(--text2)',marginBottom:12}}>Article : <strong>{modalEditMvt.article_libelle}</strong></div>
            <div className="form-grp" style={{marginBottom:10}}>
              <label className="form-lbl">Type</label>
              <select className="form-sel" style={{width:'100%'}} value={formMvt.type_mouvement} onChange={e=>setFormMvt(f=>({...f,type_mouvement:e.target.value}))}>
                <option value="entree">Entrée</option>
                <option value="sortie">Sortie</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-grp">
                <label className="form-lbl">Quantité</label>
                <input type="number" className="form-inp" min={0} value={formMvt.quantite} onChange={e=>setFormMvt(f=>({...f,quantite:+e.target.value}))}/>
              </div>
              <div className="form-grp">
                <label className="form-lbl">Date</label>
                <input type="date" className="form-inp" value={formMvt.date} onChange={e=>setFormMvt(f=>({...f,date:e.target.value}))}/>
              </div>
            </div>
            <div className="form-grp" style={{marginBottom:16}}>
              <label className="form-lbl">Motif</label>
              <input type="text" className="form-inp" value={formMvt.motif} onChange={e=>setFormMvt(f=>({...f,motif:e.target.value}))}/>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn" onClick={()=>setModalEditMvt(null)}>Annuler</button>
              <button className="btn primary" onClick={saveEditMvt}>✓ Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
