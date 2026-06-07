import { useState, useEffect } from 'react';
import { stocksAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ImportDrop from '../import/ImportDrop';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(parseFloat(n)||0));

export default function StocksPage() {
  const { can } = useAuth();
  const [soldes,  setSoldes]  = useState([]);
  const [search,  setSearch]  = useState('');
  const [filtre,  setFiltre]  = useState('all');
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState({article:'',qte:0,date:new Date().toISOString().slice(0,10),motif:''});

  const charger = async () => {
    setLoading(true);
    try {
      const r = await stocksAPI.soldes();
      const d = r.data;
      setSoldes(Array.isArray(d)?d:Array.isArray(d?.data)?d.data:[]);
    } catch { toast.error('Erreur stocks'); setSoldes([]); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ charger(); },[]);

  const getStatut = (s) => {
    if(s.alerte_stock||s.stock_actuel===0) return 'out';
    if(s.seuil_alerte&&s.stock_actuel<=s.seuil_alerte) return 'low';
    return 'ok';
  };

  const filtered = soldes.filter(s=>{
    const st=getStatut(s);
    const mF=filtre==='all'||st===filtre;
    const mS=!search||s.libelle?.toLowerCase().includes(search.toLowerCase())||s.code?.toLowerCase().includes(search.toLowerCase());
    return mF&&mS;
  });

  const alertCount = soldes.filter(s=>getStatut(s)==='low').length;
  const outCount   = soldes.filter(s=>getStatut(s)==='out').length;
  const valeurTotale = soldes.reduce((s,x)=>s+parseFloat(x.valeur_stock_ht||0),0);

  const saveMvt = async () => {
    if(!form.article||!form.qte){toast.error('Renseignez tous les champs');return;}
    try {
      await stocksAPI.ajouterMouvement({
        article_id:form.article,
        type_mouvement:'entree',
        quantite:+form.qte,
        date_mouvement:form.date,
        motif:form.motif||'Approvisionnement'
      });
      toast.success('Entrée de stock enregistrée ✓');
      setModal(false);
      setForm({article:'',qte:0,date:new Date().toISOString().slice(0,10),motif:''});
      charger();
    } catch(e){ toast.error(e.response?.data?.message||'Erreur'); }
  };

  const isDGwrite = can('stocks')==='write';

  return (
    <div className="fade-up">
      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:9,marginBottom:14}}>
        <div className="kpi cc"><div className="kpi-lbl">Articles</div><div className="kpi-val">{soldes.length}</div><div className="kpi-sub kn">Références actives</div></div>
        <div className="kpi ca"><div className="kpi-lbl">Alertes faibles</div><div className="kpi-val">{alertCount}</div><div className="kpi-sub kd">↓ Action requise</div></div>
        <div className="kpi cr"><div className="kpi-lbl">Ruptures</div><div className="kpi-val">{outCount}</div><div className="kpi-sub kd">Stock épuisé</div></div>
        <div className="kpi cg"><div className="kpi-lbl">Valeur totale</div><div className="kpi-val" style={{fontSize:16}}>≈{fmt(valeurTotale/1000)}k</div><div className="kpi-sub kn">FCFA</div></div>
      </div>

      {/* Import Excel */}
      {isDGwrite&&(
        <ImportDrop type="stocks" icon="📦" color="amber"
          label="Import Stocks Excel — Entrées d'approvisionnement uniquement"
          onSuccess={()=>charger()}/>
      )}

      {/* Note sur les sorties automatiques */}
      <div style={{background:'rgba(34,211,238,.05)',border:'1px solid rgba(34,211,238,.15)',borderRadius:8,padding:'8px 14px',marginBottom:12,fontSize:11,color:'var(--text2)',display:'flex',alignItems:'center',gap:8}}>
        <span>ℹ️</span>
        <span>Les <strong style={{color:'var(--cyan)'}}>sorties de stocks</strong> (matières premières) sont enregistrées <strong>automatiquement</strong> lors de la validation de la production par le DG.</span>
      </div>

      {/* Filtres */}
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 11px'}}>
          <span style={{color:'var(--text3)'}}>🔍</span>
          <input type="text" placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{background:'none',border:'none',outline:'none',color:'var(--text1)',fontFamily:'var(--font)',fontSize:11,width:160}}/>
        </div>
        <select className="form-sel" value={filtre} onChange={e=>setFiltre(e.target.value)}>
          <option value="all">Tous</option>
          <option value="ok">OK</option>
          <option value="low">Faibles</option>
          <option value="out">Ruptures</option>
        </select>
        {isDGwrite&&<button className="btn primary" style={{marginLeft:'auto'}} onClick={()=>setModal(true)}>+ Entrée de stock</button>}
      </div>

      {/* Tableau */}
      <div className="card" style={{overflowX:'auto'}}>
        <table className="tbl">
          <thead><tr>
            <th>Article</th><th>Code</th><th>Classe</th><th>Unité</th>
            <th style={{textAlign:'right'}}>Stock actuel</th>
            <th style={{textAlign:'right'}}>Valeur HT (FCFA)</th>
            <th style={{textAlign:'right'}}>Seuil alerte</th>
            <th>Niveau</th><th>Statut</th>
          </tr></thead>
          <tbody>
            {filtered.map((s,i)=>{
              const st=getStatut(s);
              const niv=s.seuil_alerte>0?Math.min(100,Math.round(parseFloat(s.stock_actuel||0)/s.seuil_alerte*50)):parseFloat(s.stock_actuel||0)>0?100:0;
              const barColor=st==='out'?'var(--red)':st==='low'?'var(--amber)':'var(--green)';
              return(
                <tr key={i}>
                  <td style={{fontWeight:500,color:'var(--text1)'}}>{s.libelle}</td>
                  <td style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text3)'}}>{s.code}</td>
                  <td style={{color:'var(--text3)'}}>Classe {s.classe}</td>
                  <td style={{color:'var(--text2)'}}>{s.unite}</td>
                  <td style={{textAlign:'right',fontFamily:'var(--mono)'}}>{fmt(s.stock_actuel||0)}</td>
                  <td style={{textAlign:'right',fontFamily:'var(--mono)'}}>{fmt(s.valeur_stock_ht||0)}</td>
                  <td style={{textAlign:'right',fontFamily:'var(--mono)'}}>{fmt(s.seuil_alerte||0)}</td>
                  <td style={{minWidth:80}}>
                    <div className="pbar"><div className="pbar-f" style={{width:`${niv}%`,background:barColor}}/></div>
                    <div style={{fontSize:8,color:'var(--text3)',marginTop:2}}>{niv}%</div>
                  </td>
                  <td>{st==='out'?<span className="st sout">Rupture</span>:st==='low'?<span className="st slow">Faible</span>:<span className="st sok">OK</span>}</td>
                </tr>
              );
            })}
            {!filtered.length&&<tr><td colSpan={9} style={{textAlign:'center',color:'var(--text3)',padding:32}}>{loading?'Chargement...':'Aucun article'}</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal Entrée de stock */}
      {modal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{width:460}}>
            <div className="modal-title">
              📦 Entrée de stock — Approvisionnement
              <button className="modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div style={{background:'rgba(52,211,153,.06)',border:'1px solid rgba(52,211,153,.2)',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:11,color:'var(--green)'}}>
              ℹ️ Uniquement pour les <strong>entrées d'approvisionnement</strong>. Les sorties sont automatiques via la production.
            </div>
            <div className="form-grp" style={{marginBottom:12}}>
              <label className="form-lbl">Article *</label>
              <select className="form-sel" style={{width:'100%'}} value={form.article} onChange={e=>setForm(f=>({...f,article:e.target.value}))}>
                <option value="">Sélectionner un article...</option>
                {soldes.filter(s=>s.classe!==3).map(s=><option key={s.id} value={s.id}>{s.libelle} ({s.unite})</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-grp">
                <label className="form-lbl">Quantité reçue *</label>
                <input type="number" className="form-inp" min={1} value={form.qte} onChange={e=>setForm(f=>({...f,qte:e.target.value}))}/>
              </div>
              <div className="form-grp">
                <label className="form-lbl">Date de réception</label>
                <input type="date" className="form-inp" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
              </div>
            </div>
            <div className="form-grp" style={{marginBottom:16}}>
              <label className="form-lbl">Motif / Fournisseur</label>
              <input type="text" className="form-inp" value={form.motif} onChange={e=>setForm(f=>({...f,motif:e.target.value}))} placeholder="Ex: Livraison fournisseur ABC"/>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn" onClick={()=>setModal(false)}>Annuler</button>
              <button className="btn success" onClick={saveMvt}>✓ Enregistrer l'entrée</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
