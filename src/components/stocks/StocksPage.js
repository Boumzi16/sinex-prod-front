import { useState, useEffect } from 'react';
import { useRefresh } from '../../context/RefreshContext';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ImportDrop from '../import/ImportDrop';
import toast from 'react-hot-toast';

const fmt = n => new Intl.NumberFormat('fr-FR').format(Math.round(parseFloat(n)||0));

const MOIS_LISTE = [
  {v:'all',l:'Tous les mois'},
  {v:'2026-01',l:'Janvier 2026'},{v:'2026-02',l:'Février 2026'},{v:'2026-03',l:'Mars 2026'},
  {v:'2026-04',l:'Avril 2026'},{v:'2026-05',l:'Mai 2026'},{v:'2026-06',l:'Juin 2026'},
  {v:'2026-07',l:'Juillet 2026'},{v:'2026-08',l:'Août 2026'},{v:'2026-09',l:'Septembre 2026'},
  {v:'2026-10',l:'Octobre 2026'},{v:'2026-11',l:'Novembre 2026'},{v:'2026-12',l:'Décembre 2026'},
];

const TH = ({children, right, cyan, red, green, w, style={}}) => (
  <th style={{
    textAlign:right?'right':'left', width:w||undefined,
    background:cyan?'rgba(8,145,178,.12)':red?'rgba(220,38,38,.10)':green?'rgba(5,150,105,.10)':undefined,
    color:cyan?'var(--cyan)':red?'var(--red)':green?'var(--green)':undefined,
    whiteSpace:'nowrap', padding:'10px 11px', ...style,
  }}>{children}</th>
);

export default function StocksPage() {
  const { can } = useAuth();
  const { lastRefresh } = useRefresh();
  const isDG = can('stocks') === 'write';

  const [onglet,    setOnglet]    = useState('stocks');
  const [classeTab, setClasseTab] = useState('1');
  const [search,    setSearch]    = useState('');
  const [moisF,     setMoisF]     = useState('2026-06');
  const [classeF,   setClasseF]   = useState('all');
  const [loading,   setLoading]   = useState(true);
  const [soldes,    setSoldes]    = useState([]);
  const [resume,    setResume]    = useState([]);

  // Modals
  const [modalMvt,   setModalMvt]   = useState(false);
  const [typeMvt,    setTypeMvt]    = useState('entree');
  const [formMvt,    setFormMvt]    = useState({article:'',qte:0,date:new Date().toISOString().slice(0,10),motif:''});
  const [modalPrix,  setModalPrix]  = useState(false);
  const [formPrix,   setFormPrix]   = useState({id:'',libelle:'',prix:0});
  const [modalArt,   setModalArt]   = useState(null);
  const [formArt,    setFormArt]    = useState({libelle:'',unite:'',seuil_alerte:0});
  const [modalSeuil, setModalSeuil] = useState(null);
  const [formSeuil,  setFormSeuil]  = useState({seuil:0});

  // ── Chargement ────────────────────────────────────
  const chargerSoldes = async (mois) => {
    setLoading(true);
    try {
      const m = mois !== undefined ? mois : moisF;
      const p = new URLSearchParams();
      if (m && m !== 'all') p.append('mois', m);
      const r = await api.get(`/stocks/soldes?${p}`);
      setSoldes(Array.isArray(r.data) ? r.data : r.data?.data || []);
    } catch(e) {
      console.error('[STOCKS SOLDES]', e.message);
      toast.error('Erreur chargement stocks');
    } finally { setLoading(false); }
  };

  const chargerResume = async (mois, classe) => {
    try {
      const m = mois !== undefined ? mois : moisF;
      const cl = classe !== undefined ? classe : classeF;
      const p = new URLSearchParams();
      if (m && m !== 'all') p.append('mois', m);
      if (cl && cl !== 'all') p.append('classe', cl);
      const r = await api.get(`/stocks/mouvements/resume?${p}`);
      setResume(Array.isArray(r.data) ? r.data : []);
    } catch(e) {
      console.error('[STOCKS RESUME]', e.message);
      setResume([]);
    }
  };

  // Chargement initial + rechargement sur changement de mois
  useEffect(() => { chargerSoldes(moisF); }, [moisF, lastRefresh]); // eslint-disable-line
  useEffect(() => {
    if (onglet === 'mouvements') chargerResume(moisF, classeF);
  }, [onglet, moisF, classeF]); // eslint-disable-line

  // ── Après import : recharger tout ─────────────────
  const apresImport = () => {
    chargerSoldes(moisF);
    if (onglet === 'mouvements') chargerResume(moisF, classeF);
  };

  // ── Effacer mouvements ─────────────────────────────
  const effacerMouvements = async () => {
    const txt = moisF !== 'all' ? ` du mois ${moisF}` : ' de TOUS les mois';
    if (!window.confirm(`⚠ Effacer tous les mouvements${txt} ? Action irréversible.`)) return;
    try {
      const p = moisF !== 'all' ? `?mois=${moisF}` : '';
      await api.delete(`/stocks/mouvements/effacer${p}`);
      toast.success('Mouvements effacés ✓');
      chargerSoldes(moisF);
      chargerResume(moisF, classeF);
    } catch(e) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  // ── Helpers ───────────────────────────────────────
  const getStatut = s => {
    const q = parseFloat(s.stock_actuel || s.solde_fin || 0);
    if (q <= 0) return 'out';
    if (s.seuil_alerte && q <= s.seuil_alerte) return 'low';
    return 'ok';
  };

  const cl1 = soldes.filter(s => String(s.classe) === '1');
  const cl2 = soldes.filter(s => String(s.classe) === '2');
  const cl3 = soldes.filter(s => String(s.classe) === '3');
  const al1 = cl1.filter(s => getStatut(s) !== 'ok').length;
  const al2 = cl2.filter(s => getStatut(s) !== 'ok').length;

  const filtered = soldes.filter(s =>
    String(s.classe) === classeTab &&
    (!search || s.libelle?.toLowerCase().includes(search.toLowerCase()) ||
                s.code?.toLowerCase().includes(search.toLowerCase()))
  );

  const resumeFiltre = classeF === 'all' ? resume : resume.filter(a => String(a.classe) === classeF);

  // ── Actions ───────────────────────────────────────
  const savePrix = async () => {
    try {
      await api.put(`/stocks/articles/${formPrix.id}/prix`, {prix_unitaire_ht: formPrix.prix});
      toast.success('Prix mis à jour ✓'); setModalPrix(false); chargerSoldes(moisF);
    } catch(e) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const saveArt = async () => {
    try {
      await api.put(`/stocks/articles/${modalArt.id}`, formArt);
      toast.success('Article modifié ✓'); setModalArt(null); chargerSoldes(moisF);
    } catch(e) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const saveSeuil = async () => {
    try {
      await api.put(`/stocks/articles/${modalSeuil.id}`, {seuil_alerte: formSeuil.seuil});
      toast.success('Seuil mis à jour ✓'); setModalSeuil(null); chargerSoldes(moisF);
    } catch(e) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const deleteArt = async (id, lib) => {
    if (!window.confirm(`Supprimer "${lib}" ?`)) return;
    try {
      await api.delete(`/stocks/articles/${id}`);
      toast.success('Supprimé ✓'); chargerSoldes(moisF);
    } catch(e) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const saveMvt = async () => {
    if (!formMvt.article || !formMvt.qte) { toast.error('Renseignez tous les champs'); return; }
    try {
      await api.post('/stocks/mouvements', {
        article_id: formMvt.article, type_mouvement: typeMvt,
        quantite: +formMvt.qte, date_mouvement: formMvt.date,
        motif: formMvt.motif || 'Saisie manuelle',
      });
      toast.success('Mouvement enregistré ✓'); setModalMvt(false);
      setFormMvt({article:'',qte:0,date:new Date().toISOString().slice(0,10),motif:''});
      chargerSoldes(moisF); chargerResume(moisF, classeF);
    } catch(e) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const articlesMP = soldes.filter(s => ['1','2'].includes(String(s.classe)));

  // ── Tableau articles ──────────────────────────────
  const TableauArticles = ({articles}) => (
    <table className="tbl" style={{minWidth:1100}}>
      <thead>
        <tr>
          <TH w={40} style={{textAlign:'center'}}>N°</TH>
          <TH w={95}>Code</TH>
          <TH style={{minWidth:200}}>Désignation / Article</TH>
          <TH w={65} style={{textAlign:'center'}}>Unité</TH>
          <TH right w={110}>Prix HT (FCFA)</TH>
          <TH right cyan w={120}>Stock début mois<br/><span style={{fontSize:9,fontWeight:400,display:'block'}}>(solde mois préc.)</span></TH>
          <TH right red w={105}>Sorties du mois</TH>
          <TH right green w={105}>Entrées du mois</TH>
          <TH right cyan w={120}>Solde fin de mois<br/><span style={{fontSize:9,fontWeight:400,display:'block'}}>(auto)</span></TH>
          <TH right w={130}>Valeur HT stock (FCFA)</TH>
          <TH w={85} style={{textAlign:'center'}}>Seuil alerte</TH>
          <TH w={90} style={{textAlign:'center'}}>Niveau</TH>
          <TH w={85} style={{textAlign:'center'}}>Statut</TH>
          {isDG && <TH w={120} style={{textAlign:'center'}}>Actions</TH>}
        </tr>
      </thead>
      <tbody>
        {articles.map((s,i) => {
          const st = getStatut(s);
          const stock    = parseFloat(s.stock_actuel || 0);
          const debut    = parseFloat(s.stock_debut  || 0);
          const sorties  = parseFloat(s.sorties_mois || 0);
          const entrees  = parseFloat(s.entrees_mois || 0);
          const soldeFin = parseFloat(s.solde_fin    || stock);
          const valeur   = soldeFin * parseFloat(s.prix_unitaire_ht || 0);
          const niv      = s.seuil_alerte > 0
            ? Math.min(100, Math.round(stock / s.seuil_alerte * 50))
            : stock > 0 ? 100 : 0;
          const barC = st === 'out' ? 'var(--red)' : st === 'low' ? 'var(--amber)' : 'var(--green)';
          const bg   = i % 2 === 0 ? 'var(--bg2)' : undefined;
          return (
            <tr key={s.id||i} style={{background:bg}}>
              <td style={{textAlign:'center',color:'var(--text3)'}}>{i+1}</td>
              <td style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--text3)'}}>{s.code}</td>
              <td style={{fontWeight:600}}>{s.libelle}</td>
              <td style={{textAlign:'center',color:'var(--text2)'}}>{s.unite}</td>
              <td style={{textAlign:'right',fontFamily:'var(--mono)',color:'var(--text2)'}}>
                {s.prix_unitaire_ht > 0 ? fmt(s.prix_unitaire_ht) : '—'}
              </td>
              <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,color:'var(--cyan)',background:'rgba(8,145,178,.06)'}}>
                {fmt(debut)}
              </td>
              <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,color:'var(--red)',background:'rgba(220,38,38,.04)'}}>
                {sorties > 0 ? fmt(sorties) : '—'}
              </td>
              <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,color:'var(--green)',background:'rgba(5,150,105,.04)'}}>
                {entrees > 0 ? fmt(entrees) : '—'}
              </td>
              <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:700,
                  color:st==='out'?'var(--red)':'var(--cyan)',background:'rgba(8,145,178,.06)'}}>
                {fmt(soldeFin)}{st === 'out' && <span style={{fontSize:10,marginLeft:3}}>⚠</span>}
              </td>
              <td style={{textAlign:'right',fontFamily:'var(--mono)',color:'var(--text2)'}}>
                {valeur > 0 ? fmt(valeur) : '—'}
              </td>
              <td style={{textAlign:'center',fontFamily:'var(--mono)'}}>
                {s.seuil_alerte > 0 ? fmt(s.seuil_alerte) : <span style={{color:'var(--text3)'}}>—</span>}
              </td>
              <td>
                <div className="pbar">
                  <div className="pbar-f" style={{width:`${Math.max(0,Math.min(100,niv))}%`,background:barC}}/>
                </div>
                <div style={{fontSize:9,color:'var(--text3)',marginTop:1,textAlign:'center'}}>{Math.max(0,niv)}%</div>
              </td>
              <td style={{textAlign:'center'}}>
                {st==='out'?<span className="st sout">Rupture</span>
                :st==='low'?<span className="st slow">Faible</span>
                :<span className="st sok">OK</span>}
              </td>
              {isDG && (
                <td>
                  <div style={{display:'flex',gap:3,justifyContent:'center',flexWrap:'wrap'}}>
                    <button className="btn" style={{fontSize:9,padding:'3px 6px'}} title="Modifier prix"
                      onClick={()=>{setFormPrix({id:s.id,libelle:s.libelle,prix:s.prix_unitaire_ht||0});setModalPrix(true);}}>
                      💰
                    </button>
                    <button className="btn" style={{fontSize:9,padding:'3px 6px'}} title="Seuil alerte"
                      onClick={()=>{setModalSeuil(s);setFormSeuil({seuil:s.seuil_alerte||0});}}>
                      🔔
                    </button>
                    <button className="btn amber" style={{fontSize:9,padding:'3px 6px'}} title="Modifier"
                      onClick={()=>{setModalArt(s);setFormArt({libelle:s.libelle,unite:s.unite,seuil_alerte:s.seuil_alerte||0});}}>
                      ✎
                    </button>
                    <button className="btn danger" style={{fontSize:9,padding:'3px 6px'}} title="Supprimer"
                      onClick={()=>deleteArt(s.id,s.libelle)}>
                      ✕
                    </button>
                  </div>
                </td>
              )}
            </tr>
          );
        })}
        {!articles.length && (
          <tr><td colSpan={isDG?14:13} style={{textAlign:'center',color:'var(--text3)',padding:40}}>
            {loading ? 'Chargement...' : 'Aucun article — uploadez un fichier STK via Import'}
          </td></tr>
        )}
      </tbody>
    </table>
  );

  // ── Tableau mouvements ─────────────────────────────
  const TableauMovements = ({data}) => (
    <table className="tbl" style={{minWidth:1100}}>
      <thead>
        <tr>
          <TH w={40} style={{textAlign:'center'}}>N°</TH>
          <TH w={95}>Code</TH>
          <TH style={{minWidth:200}}>Désignation / Article</TH>
          <TH w={65} style={{textAlign:'center'}}>Unité</TH>
          <TH right w={110}>Prix HT (FCFA)</TH>
          <TH right cyan w={120}>Stock début mois<br/><span style={{fontSize:9,fontWeight:400,display:'block'}}>(solde mois préc.)</span></TH>
          <TH right red w={105}>Sorties du mois</TH>
          <TH right green w={105}>Entrées du mois</TH>
          <TH right cyan w={120}>Solde fin de mois<br/><span style={{fontSize:9,fontWeight:400,display:'block'}}>(auto)</span></TH>
          <TH right w={130}>Valeur HT stock (FCFA)</TH>
        </tr>
      </thead>
      <tbody>
        {data.map((a,i) => {
          const alerte = parseFloat(a.solde_fin||0) <= 0;
          const bg = i % 2 === 0 ? 'var(--bg2)' : undefined;
          return (
            <tr key={i} style={{background:bg}}>
              <td style={{textAlign:'center',color:'var(--text3)'}}>{i+1}</td>
              <td style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--text3)'}}>{a.code}</td>
              <td style={{fontWeight:600}}>{a.libelle}</td>
              <td style={{textAlign:'center',color:'var(--text2)'}}>{a.unite}</td>
              <td style={{textAlign:'right',fontFamily:'var(--mono)',color:'var(--text2)'}}>
                {parseFloat(a.prix_ht||0) > 0 ? fmt(a.prix_ht) : '—'}
              </td>
              <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,color:'var(--cyan)',background:'rgba(8,145,178,.06)'}}>
                {fmt(a.stock_debut||0)}
              </td>
              <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,color:'var(--red)',background:'rgba(220,38,38,.04)'}}>
                {parseFloat(a.sorties||0) > 0 ? fmt(a.sorties) : '—'}
              </td>
              <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,color:'var(--green)',background:'rgba(5,150,105,.04)'}}>
                {parseFloat(a.entrees||0) > 0 ? fmt(a.entrees) : '—'}
              </td>
              <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:700,
                  color:alerte?'var(--red)':'var(--cyan)',background:'rgba(8,145,178,.06)'}}>
                {fmt(a.solde_fin||0)}{alerte && <span style={{fontSize:10,marginLeft:3}}>⚠</span>}
              </td>
              <td style={{textAlign:'right',fontFamily:'var(--mono)',color:'var(--text2)'}}>
                {parseFloat(a.valeur_ht||0) > 0 ? fmt(a.valeur_ht) : '—'}
              </td>
            </tr>
          );
        })}
        {!data.length && (
          <tr><td colSpan={10} style={{textAlign:'center',color:'var(--text3)',padding:40}}>
            Aucun mouvement — uploadez un fichier STK ou changez le filtre mois
          </td></tr>
        )}
      </tbody>
    </table>
  );

  // ── Rendu ─────────────────────────────────────────
  return (
    <div className="fade-up">

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        <div className="kpi cc">
          <div className="kpi-lbl">Classe 1 — Consommables</div>
          <div className="kpi-val">{cl1.length}</div>
          <div className="kpi-sub kn">articles</div>
        </div>
        <div className="kpi ca">
          <div className="kpi-lbl">Alertes (Cl.1 + Cl.2)</div>
          <div className="kpi-val" style={{color:'var(--amber)'}}>{al1+al2}</div>
          <div className="kpi-sub kd">faibles / ruptures</div>
        </div>
        <div className="kpi cg">
          <div className="kpi-lbl">Classe 2 — EPI & Pièces</div>
          <div className="kpi-val">{cl2.length}</div>
          <div className="kpi-sub kn">articles</div>
        </div>
        <div className="kpi cp">
          <div className="kpi-lbl">Classe 3 — Produits finis</div>
          <div className="kpi-val">{cl3.length}</div>
          <div className="kpi-sub kn">articles</div>
        </div>
      </div>

      {/* Import */}
      {isDG && (
        <ImportDrop type="stocks" icon="📦" color="amber"
          label="Import Stocks Excel — STK_MM_YYYY_SINEX_SA.xlsx (Classe 1 & 2)"
          onSuccess={apresImport}/>
      )}

      {/* Onglets principaux */}
      <div style={{display:'flex',gap:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:9,padding:3,marginBottom:14,width:'fit-content'}}>
        {[['stocks','📊 Stocks actuels'],['mouvements','🔄 Mouvements par article']].map(([v,l])=>(
          <button key={v} className={`treso-tab${onglet===v?' active':''}`} onClick={()=>setOnglet(v)}>{l}</button>
        ))}
      </div>

      {/* ── ONGLET STOCKS ─────────────────────────────── */}
      {onglet==='stocks' && (
        <>
          {/* Sous-onglets classes */}
          <div style={{display:'flex',gap:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:9,padding:3,marginBottom:12,width:'fit-content'}}>
            {[['1','📦 Classe 1 — Consommables',al1],['2','🔧 Classe 2 — EPI & Pièces',al2],['3','✅ Classe 3 — Produits finis',0]].map(([v,l,al])=>(
              <button key={v} className={`treso-tab${classeTab===v?' active':''}`}
                onClick={()=>{setClasseTab(v);setSearch('');}}>
                {l}
                {al>0&&<span style={{marginLeft:5,background:'var(--red)',color:'white',borderRadius:10,padding:'1px 5px',fontSize:9}}>{al}</span>}
              </button>
            ))}
          </div>

          {/* Filtres */}
          <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
            <select className="form-sel" value={moisF} onChange={e=>setMoisF(e.target.value)}>
              {MOIS_LISTE.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <div style={{display:'flex',alignItems:'center',gap:6,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 13px'}}>
              <span style={{color:'var(--text3)'}}>🔍</span>
              <input type="text" placeholder="Rechercher article ou code..." value={search}
                onChange={e=>setSearch(e.target.value)}
                style={{background:'none',border:'none',outline:'none',color:'var(--text1)',fontFamily:'var(--font)',fontSize:13,width:220}}/>
            </div>
            {isDG && classeTab !== '3' && (
              <>
                <button className="btn success" onClick={()=>{setTypeMvt('entree');setModalMvt(true);}}>↑ Entrée de stock</button>
                <button className="btn danger"  onClick={()=>{setTypeMvt('sortie');setModalMvt(true);}}>↓ Sortie de stock</button>
              </>
            )}
            {classeTab==='3' && (
              <div style={{fontSize:12,color:'var(--cyan)',background:'rgba(34,211,238,.06)',border:'1px solid rgba(34,211,238,.15)',borderRadius:8,padding:'7px 13px'}}>
                ℹ️ Classe 3 alimentée automatiquement par la production validée
              </div>
            )}
          </div>

          <div className="card" style={{overflowX:'auto'}}>
            <div className="card-hd">
              <div className="card-t">
                {classeTab==='1'&&'Classe 1 — Consommables de production'}
                {classeTab==='2'&&'Classe 2 — EPI & Pièces de rechange'}
                {classeTab==='3'&&'Classe 3 — Produits finis'}
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span className="cbadge bc">{filtered.length} articles</span>
                <span style={{fontSize:11,color:'var(--text3)'}}>
                  {moisF!=='all'?MOIS_LISTE.find(m=>m.v===moisF)?.l:'Tous les mois'}
                </span>
              </div>
            </div>
            <TableauArticles articles={filtered}/>
          </div>
        </>
      )}

      {/* ── ONGLET MOUVEMENTS ─────────────────────────── */}
      {onglet==='mouvements' && (
        <>
          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
            <select className="form-sel" value={moisF} onChange={e=>setMoisF(e.target.value)}>
              {MOIS_LISTE.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <select className="form-sel" value={classeF} onChange={e=>setClasseF(e.target.value)}>
              <option value="all">Toutes les classes</option>
              <option value="1">Classe 1 — Consommables</option>
              <option value="2">Classe 2 — EPI & Pièces</option>
              <option value="3">Classe 3 — Produits finis</option>
            </select>
            <button className="btn" onClick={()=>chargerResume(moisF,classeF)}>🔍 Filtrer</button>
            {isDG && (
              <button className="btn danger" style={{fontSize:11}} onClick={effacerMouvements}>
                🗑 Effacer les mouvements
              </button>
            )}
          </div>

          <div className="card" style={{overflowX:'auto'}}>
            <div className="card-hd">
              <div className="card-t">Mouvements de stock — Vue par article</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span className="cbadge bc">{resumeFiltre.length} articles</span>
                <span style={{fontSize:11,color:'var(--text3)'}}>
                  {moisF!=='all'?MOIS_LISTE.find(m=>m.v===moisF)?.l:'Tous les mois'}
                </span>
              </div>
            </div>
            <TableauMovements data={resumeFiltre}/>
          </div>
        </>
      )}

      {/* ── MODALS ────────────────────────────────────── */}

      {/* Entrée / Sortie */}
      {modalMvt && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModalMvt(false)}>
          <div className="modal" style={{width:480}}>
            <div className="modal-title">
              {typeMvt==='sortie'?'↓ Sortie de stock':'↑ Entrée de stock'}
              <button className="modal-close" onClick={()=>setModalMvt(false)}>✕</button>
            </div>
            <div className="form-grp" style={{marginBottom:12}}>
              <label className="form-lbl">Article *</label>
              <select className="form-sel" style={{width:'100%'}} value={formMvt.article}
                onChange={e=>setFormMvt(f=>({...f,article:e.target.value}))}>
                <option value="">Sélectionner...</option>
                <optgroup label="Classe 1 — Consommables">
                  {articlesMP.filter(s=>String(s.classe)==='1').map(s=>(
                    <option key={s.id} value={s.id}>{s.libelle} ({s.unite})</option>
                  ))}
                </optgroup>
                <optgroup label="Classe 2 — EPI & Pièces">
                  {articlesMP.filter(s=>String(s.classe)==='2').map(s=>(
                    <option key={s.id} value={s.id}>{s.libelle} ({s.unite})</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="form-row">
              <div className="form-grp">
                <label className="form-lbl">Quantité *</label>
                <input type="number" className="form-inp" min={1} value={formMvt.qte}
                  onChange={e=>setFormMvt(f=>({...f,qte:e.target.value}))}/>
              </div>
              <div className="form-grp">
                <label className="form-lbl">Date</label>
                <input type="date" className="form-inp" value={formMvt.date}
                  onChange={e=>setFormMvt(f=>({...f,date:e.target.value}))}/>
              </div>
            </div>
            <div className="form-grp" style={{marginBottom:16}}>
              <label className="form-lbl">Motif / Fournisseur</label>
              <input type="text" className="form-inp" value={formMvt.motif}
                placeholder="Ex: Livraison LGEP, Consommation production..."
                onChange={e=>setFormMvt(f=>({...f,motif:e.target.value}))}/>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn" onClick={()=>setModalMvt(false)}>Annuler</button>
              <button className={`btn ${typeMvt==='sortie'?'danger':'success'}`} onClick={saveMvt}>✓ Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Prix */}
      {modalPrix && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModalPrix(false)}>
          <div className="modal" style={{width:400}}>
            <div className="modal-title">💰 Modifier le prix HT<button className="modal-close" onClick={()=>setModalPrix(false)}>✕</button></div>
            <div style={{background:'rgba(251,191,36,.06)',border:'1px solid rgba(251,191,36,.2)',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:12,color:'var(--amber)'}}>
              Article : <strong>{formPrix.libelle}</strong>
            </div>
            <div className="form-grp" style={{marginBottom:16}}>
              <label className="form-lbl">Prix unitaire HT (FCFA)</label>
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

      {/* Seuil alerte */}
      {modalSeuil && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModalSeuil(null)}>
          <div className="modal" style={{width:400}}>
            <div className="modal-title">🔔 Seuil d'alerte<button className="modal-close" onClick={()=>setModalSeuil(null)}>✕</button></div>
            <div style={{background:'rgba(8,145,178,.06)',border:'1px solid rgba(8,145,178,.2)',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:12,color:'var(--cyan)'}}>
              Article : <strong>{modalSeuil.libelle}</strong>
            </div>
            <div className="form-grp" style={{marginBottom:8}}>
              <label className="form-lbl">Quantité minimale avant alerte</label>
              <input type="number" className="form-inp" min={0} value={formSeuil.seuil}
                onChange={e=>setFormSeuil({seuil:+e.target.value})} style={{fontFamily:'var(--mono)'}}/>
            </div>
            <div style={{fontSize:11,color:'var(--text3)',marginBottom:16}}>
              ℹ️ Statut "Faible" quand stock ≤ seuil. "Rupture" si stock = 0.
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn" onClick={()=>setModalSeuil(null)}>Annuler</button>
              <button className="btn primary" onClick={saveSeuil}>✓ Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modifier article */}
      {modalArt && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModalArt(null)}>
          <div className="modal" style={{width:440}}>
            <div className="modal-title">✎ Modifier l'article<button className="modal-close" onClick={()=>setModalArt(null)}>✕</button></div>
            <div className="form-grp" style={{marginBottom:10}}>
              <label className="form-lbl">Désignation</label>
              <input type="text" className="form-inp" value={formArt.libelle}
                onChange={e=>setFormArt(f=>({...f,libelle:e.target.value}))}/>
            </div>
            <div className="form-row">
              <div className="form-grp">
                <label className="form-lbl">Unité</label>
                <input type="text" className="form-inp" value={formArt.unite}
                  onChange={e=>setFormArt(f=>({...f,unite:e.target.value}))}/>
              </div>
              <div className="form-grp">
                <label className="form-lbl">Seuil d'alerte</label>
                <input type="number" className="form-inp" min={0} value={formArt.seuil_alerte}
                  onChange={e=>setFormArt(f=>({...f,seuil_alerte:+e.target.value}))}/>
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}>
              <button className="btn" onClick={()=>setModalArt(null)}>Annuler</button>
              <button className="btn primary" onClick={saveArt}>✓ Enregistrer</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
