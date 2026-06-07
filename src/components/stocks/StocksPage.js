import { useState, useEffect } from 'react';
import { stocksAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ImportDrop from '../import/ImportDrop';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(parseFloat(n)||0));

export default function StocksPage() {
  const { can } = useAuth();
  const [soldes,  setSoldes]  = useState([]);
  const [onglet,  setOnglet]  = useState('1');
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState({article:'',qte:0,date:new Date().toISOString().slice(0,10),motif:''});

  const isDGwrite = can('stocks') === 'write';

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
    const stock = parseFloat(s.stock_actuel||0);
    if(stock <= 0) return 'out';
    if(s.seuil_alerte && stock <= s.seuil_alerte) return 'low';
    return 'ok';
  };

  // Filtrer par onglet et recherche
  const filtered = soldes.filter(s => {
    const mC = String(s.classe) === onglet;
    const mS = !search || s.libelle?.toLowerCase().includes(search.toLowerCase()) || s.code?.toLowerCase().includes(search.toLowerCase());
    return mC && mS;
  });

  // Stats par onglet
  const cl1 = soldes.filter(s=>String(s.classe)==='1');
  const cl2 = soldes.filter(s=>String(s.classe)==='2');
  const cl3 = soldes.filter(s=>String(s.classe)==='3');

  const alertes1 = cl1.filter(s=>getStatut(s)==='low').length;
  const ruptures1 = cl1.filter(s=>getStatut(s)==='out').length;
  const alertes2 = cl2.filter(s=>getStatut(s)==='low').length;
  const ruptures2 = cl2.filter(s=>getStatut(s)==='out').length;

  const saveMvt = async () => {
    if(!form.article||!form.qte){toast.error('Renseignez tous les champs');return;}
    try {
      await stocksAPI.ajouterMouvement({
        article_id: form.article,
        type_mouvement: 'entree',
        quantite: +form.qte,
        date_mouvement: form.date,
        motif: form.motif || 'Approvisionnement',
      });
      toast.success('Entrée de stock enregistrée ✓');
      setModal(false);
      setForm({article:'',qte:0,date:new Date().toISOString().slice(0,10),motif:''});
      charger();
    } catch(e){ toast.error(e.response?.data?.message||'Erreur'); }
  };

  const articlesModal = soldes.filter(s=>['1','2'].includes(String(s.classe)));

  return (
    <div className="fade-up">

      {/* KPIs globaux */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:9,marginBottom:14}}>
        <div className="kpi cc">
          <div className="kpi-lbl">Consommables prod.</div>
          <div className="kpi-val">{cl1.length}</div>
          <div className="kpi-sub kn">Classe 1</div>
        </div>
        <div className="kpi ca">
          <div className="kpi-lbl">Alertes Classe 1+2</div>
          <div className="kpi-val">{alertes1+alertes2}</div>
          <div className="kpi-sub kd">↓ Faible</div>
        </div>
        <div className="kpi cr">
          <div className="kpi-lbl">Ruptures Classe 1+2</div>
          <div className="kpi-val">{ruptures1+ruptures2}</div>
          <div className="kpi-sub kd">Stock épuisé</div>
        </div>
        <div className="kpi cg">
          <div className="kpi-lbl">Produits finis</div>
          <div className="kpi-val">{cl3.length}</div>
          <div className="kpi-sub kn">Classe 3</div>
        </div>
      </div>

      {/* Import Excel — uniquement Classe 1 & 2 */}
      {isDGwrite && onglet !== '3' && (
        <ImportDrop type="stocks" icon="📦" color="amber"
          label="Import Stocks Excel — Entrées d'approvisionnement (Classe 1 & 2)"
          onSuccess={()=>charger()}/>
      )}

      {/* Onglets */}
      <div style={{display:'flex',gap:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:9,padding:3,marginBottom:12,width:'fit-content'}}>
        <button className={`treso-tab${onglet==='1'?' active':''}`} onClick={()=>{setOnglet('1');setSearch('');}}>
          📦 Classe 1 — Consommables production
          {(alertes1+ruptures1)>0&&<span style={{marginLeft:6,background:'var(--red)',color:'white',borderRadius:10,padding:'1px 6px',fontSize:9}}>{alertes1+ruptures1}</span>}
        </button>
        <button className={`treso-tab${onglet==='2'?' active':''}`} onClick={()=>{setOnglet('2');setSearch('');}}>
          🔧 Classe 2 — Consommables & Pièces
          {(alertes2+ruptures2)>0&&<span style={{marginLeft:6,background:'var(--red)',color:'white',borderRadius:10,padding:'1px 6px',fontSize:9}}>{alertes2+ruptures2}</span>}
        </button>
        <button className={`treso-tab${onglet==='3'?' active':''}`} onClick={()=>{setOnglet('3');setSearch('');}}>
          ✅ Classe 3 — Produits finis
        </button>
      </div>

      {/* Barre actions */}
      <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 11px'}}>
          <span style={{color:'var(--text3)'}}>🔍</span>
          <input type="text" placeholder="Rechercher article..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{background:'none',border:'none',outline:'none',color:'var(--text1)',fontFamily:'var(--font)',fontSize:11,width:180}}/>
        </div>

        {/* Bouton entrée uniquement pour Classe 1 & 2 */}
        {isDGwrite && onglet !== '3' && (
          <button className="btn success" style={{marginLeft:'auto'}} onClick={()=>setModal(true)}>
            + Entrée de stock
          </button>
        )}

        {/* Info Classe 3 */}
        {onglet === '3' && (
          <div style={{marginLeft:'auto',fontSize:11,color:'var(--cyan)',background:'rgba(34,211,238,.06)',border:'1px solid rgba(34,211,238,.15)',borderRadius:8,padding:'6px 12px'}}>
            ℹ️ Alimenté automatiquement par la production validée
          </div>
        )}
      </div>

      {/* Tableau */}
      <div className="card" style={{overflowX:'auto'}}>
        <div className="card-hd">
          <div className="card-t">
            {onglet==='1'&&'Classe 1 — Consommables de production'}
            {onglet==='2'&&'Classe 2 — Consommables, EPI & Pièces de rechange'}
            {onglet==='3'&&'Classe 3 — Produits finis (mise à jour automatique)'}
          </div>
          <span className="cbadge bc">{filtered.length} articles</span>
        </div>
        <table className="tbl">
          <thead><tr>
            <th>Article</th><th>Code</th><th>Unité</th>
            <th style={{textAlign:'right'}}>Stock actuel</th>
            <th style={{textAlign:'right'}}>Valeur HT (FCFA)</th>
            <th style={{textAlign:'right'}}>Seuil alerte</th>
            <th>Niveau</th><th>Statut</th>
          </tr></thead>
          <tbody>
            {filtered.map((s,i)=>{
              const st = getStatut(s);
              const stock = parseFloat(s.stock_actuel||0);
              const niv = s.seuil_alerte>0 ? Math.min(100,Math.round(stock/s.seuil_alerte*50)) : stock>0?100:0;
              const barColor = st==='out'?'var(--red)':st==='low'?'var(--amber)':'var(--green)';
              return(
                <tr key={i}>
                  <td style={{fontWeight:500,color:'var(--text1)'}}>{s.libelle}</td>
                  <td style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text3)'}}>{s.code}</td>
                  <td style={{color:'var(--text2)'}}>{s.unite}</td>
                  <td style={{textAlign:'right',fontFamily:'var(--mono)',color:stock<0?'var(--red)':'var(--text1)'}}>{fmt(stock)}</td>
                  <td style={{textAlign:'right',fontFamily:'var(--mono)'}}>{fmt(s.valeur_stock_ht||0)}</td>
                  <td style={{textAlign:'right',fontFamily:'var(--mono)'}}>{fmt(s.seuil_alerte||0)}</td>
                  <td style={{minWidth:80}}>
                    <div className="pbar"><div className="pbar-f" style={{width:`${Math.max(0,niv)}%`,background:barColor}}/></div>
                    <div style={{fontSize:8,color:'var(--text3)',marginTop:2}}>{Math.max(0,niv)}%</div>
                  </td>
                  <td>
                    {st==='out'?<span className="st sout">Rupture</span>
                    :st==='low'?<span className="st slow">Faible</span>
                    :<span className="st sok">OK</span>}
                  </td>
                </tr>
              );
            })}
            {!filtered.length&&(
              <tr><td colSpan={8} style={{textAlign:'center',color:'var(--text3)',padding:32}}>
                {loading?'Chargement...':'Aucun article'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Entrée de stock */}
      {modal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{width:480}}>
            <div className="modal-title">
              📦 Entrée de stock — Approvisionnement
              <button className="modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>

            <div style={{background:'rgba(52,211,153,.06)',border:'1px solid rgba(52,211,153,.2)',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:11,color:'var(--green)'}}>
              ℹ️ Pour les <strong>entrées d'approvisionnement</strong> uniquement.<br/>
              Les sorties sont calculées automatiquement lors de la validation de la production.
            </div>

            <div className="form-grp" style={{marginBottom:12}}>
              <label className="form-lbl">Article *</label>
              <select className="form-sel" style={{width:'100%'}} value={form.article}
                onChange={e=>setForm(f=>({...f,article:e.target.value}))}>
                <option value="">Sélectionner un article...</option>
                <optgroup label="Classe 1 — Consommables production">
                  {articlesModal.filter(s=>String(s.classe)==='1').map(s=>(
                    <option key={s.id} value={s.id}>{s.libelle} ({s.unite})</option>
                  ))}
                </optgroup>
                <optgroup label="Classe 2 — Consommables, EPI & Pièces">
                  {articlesModal.filter(s=>String(s.classe)==='2').map(s=>(
                    <option key={s.id} value={s.id}>{s.libelle} ({s.unite})</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="form-row">
              <div className="form-grp">
                <label className="form-lbl">Quantité reçue *</label>
                <input type="number" className="form-inp" min={1} value={form.qte}
                  onChange={e=>setForm(f=>({...f,qte:e.target.value}))}/>
              </div>
              <div className="form-grp">
                <label className="form-lbl">Date de réception</label>
                <input type="date" className="form-inp" value={form.date}
                  onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
              </div>
            </div>

            <div className="form-grp" style={{marginBottom:16}}>
              <label className="form-lbl">Motif / Fournisseur</label>
              <input type="text" className="form-inp" value={form.motif}
                onChange={e=>setForm(f=>({...f,motif:e.target.value}))}
                placeholder="Ex: Livraison fournisseur ABC"/>
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
