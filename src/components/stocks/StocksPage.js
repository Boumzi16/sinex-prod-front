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
  const [form,    setForm]    = useState({article:'',type:'entree',qte:0,date:new Date().toISOString().slice(0,10),motif:''});

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

  const saveMvt = async () => {
    if(!form.article||!form.qte){toast.error('Renseignez tous les champs');return;}
    try {
      await stocksAPI.ajouterMouvement({article_id:form.article,type_mouvement:form.type,quantite:+form.qte,date_mouvement:form.date,motif:form.motif});
      toast.success('Mouvement enregistré ✓');
      setModal(false); charger();
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
        <div className="kpi cg"><div className="kpi-lbl">Valeur estimée</div><div className="kpi-val" style={{fontSize:16}}>≈ {fmt(soldes.reduce((s,x)=>s+parseFloat(x.valeur_stock_ht||0),0)/1000000)}M</div><div className="kpi-sub kn">FCFA</div></div>
      </div>

      {/* Import Excel stocks */}
      {isDGwrite&&(
        <ImportDrop type="stocks" icon="📦" color="amber"
          label="Import Stocks Excel — Glissez votre fichier de mouvements ici"
          onSuccess={()=>charger()}/>
      )}

      {/* Filtres */}
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 11px'}}>
          <span style={{color:'var(--text3)',fontSize:12}}>🔍</span>
          <input type="text" placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{background:'none',border:'none',outline:'none',color:'var(--text1)',fontFamily:'var(--font)',fontSize:11,width:160}}/>
        </div>
        {isDGwrite&&<button className="btn primary" onClick={()=>setModal(true)}>+ Nouveau mouvement</button>}
        <select className="form-sel" value={filtre} onChange={e=>setFiltre(e.target.value)}>
          <option value="all">Tous</option>
          <option value="ok">OK</option>
          <option value="low">Faibles</option>
          <option value="out">Ruptures</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="card" style={{overflowX:'auto'}}>
        <table className="tbl">
          <thead><tr>
            <th>Article</th><th>Code</th><th>Unité</th>
            <th style={{textAlign:'right'}}>Dispo avant</th>
            <th style={{textAlign:'right'}}>Consommé</th>
            <th style={{textAlign:'right'}}>Entré</th>
            <th style={{textAlign:'right'}}>Solde</th>
            <th>Niveau</th><th>Statut</th>
          </tr></thead>
          <tbody>
            {filtered.map((s,i)=>{
              const st=getStatut(s);
              const solde=s.stock_actuel||0;
              const avant=s.stock_initial||s.stock_actuel||0;
              const conso=s.total_consomme||0;
              const entree=s.total_entre||0;
              const niv=avant>0?Math.min(100,Math.round(solde/avant*100)):0;
              const barColor=st==='out'?'var(--red)':st==='low'?'var(--amber)':'var(--green)';
              return (
                <tr key={i}>
                  <td style={{fontWeight:500,color:'var(--text1)'}}>{s.libelle}</td>
                  <td style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text3)'}}>{s.code}</td>
                  <td style={{color:'var(--text2)'}}>{s.unite}</td>
                  <td style={{textAlign:'right',fontFamily:'var(--mono)'}}>{fmt(avant)}</td>
                  <td style={{textAlign:'right',fontFamily:'var(--mono)',color:'var(--red)'}}>-{fmt(conso)}</td>
                  <td style={{textAlign:'right',fontFamily:'var(--mono)',color:'var(--green)'}}>{entree>0?'+'+fmt(entree):'-'}</td>
                  <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,color:'var(--text1)'}}>{fmt(solde)}</td>
                  <td style={{minWidth:80}}>
                    <div className="pbar"><div className="pbar-f" style={{width:`${niv}%`,background:barColor}}/></div>
                    <div style={{fontSize:8,color:'var(--text3)',marginTop:2}}>{niv}%</div>
                  </td>
                  <td>
                    {st==='out'?<span className="st sout">Rupture</span>:st==='low'?<span className="st slow">Faible</span>:<span className="st sok">OK</span>}
                  </td>
                </tr>
              );
            })}
            {!filtered.length&&<tr><td colSpan={9} style={{textAlign:'center',color:'var(--text3)',padding:32}}>{loading?'Chargement...':'Aucun article'}</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-title">+ Nouveau mouvement de stock<button className="modal-close" onClick={()=>setModal(false)}>✕</button></div>
            <div className="form-row">
              <div className="form-grp"><label className="form-lbl">Article</label>
                <select className="form-sel" style={{width:'100%'}} value={form.article} onChange={e=>setForm(f=>({...f,article:e.target.value}))}>
                  <option value="">Sélectionner...</option>
                  {soldes.map(s=><option key={s.id} value={s.id}>{s.libelle}</option>)}
                </select>
              </div>
              <div className="form-grp"><label className="form-lbl">Type de mouvement</label>
                <select className="form-sel" style={{width:'100%'}} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                  <option value="entree">Entrée (approvisionnement)</option>
                  <option value="sortie">Sortie (consommation)</option>
                  <option value="inventaire">Inventaire (ajustement)</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-grp"><label className="form-lbl">Quantité</label><input type="number" className="form-inp" value={form.qte} onChange={e=>setForm(f=>({...f,qte:e.target.value}))}/></div>
              <div className="form-grp"><label className="form-lbl">Date</label><input type="date" className="form-inp" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
            </div>
            <div className="form-grp" style={{marginBottom:14}}><label className="form-lbl">Motif</label><input type="text" className="form-inp" value={form.motif} onChange={e=>setForm(f=>({...f,motif:e.target.value}))} placeholder="Raison du mouvement..."/></div>
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
