import { useState, useEffect } from 'react';
import { tresorerieAPI, stocksAPI } from '../../services/api';
import api from '../../services/api';
import toast from 'react-hot-toast';

const fmt  = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(parseFloat(n)||0));
const fmtP = (n) => (parseFloat(n||0)*100).toFixed(2)+'%';
const p2   = (n) => parseFloat(n||0).toLocaleString('fr-FR',{minimumFractionDigits:2});

const PRODUITS = [
  {nom:'CARTON C24',      key:'C24',  prix:2033.90},
  {nom:'CARTON C12',      key:'C12',  prix:2116.10},
  {nom:'FARDEAU F6/0,5L', key:'F605', prix:429.00 },
  {nom:'FARDEAU F6/1,5L', key:'F615', prix:1032.00},
  {nom:'FARDEAU F6/1L',   key:'F61',  prix:1186.00},
  {nom:'HILIO',           key:'HILIO',prix:169.00 },
];

const MOIS_LISTE = [
  {v:'2026-01',l:'Janvier 2026'},{v:'2026-02',l:'Février 2026'},{v:'2026-03',l:'Mars 2026'},
  {v:'2026-04',l:'Avril 2026'},{v:'2026-05',l:'Mai 2026'},{v:'2026-06',l:'Juin 2026'},
  {v:'2026-07',l:'Juillet 2026'},{v:'2026-08',l:'Août 2026'},{v:'2026-09',l:'Septembre 2026'},
  {v:'2026-10',l:'Octobre 2026'},{v:'2026-11',l:'Novembre 2026'},{v:'2026-12',l:'Décembre 2026'},
];

function getMoisSuivant(mois) {
  const [a,m] = mois.split('-').map(Number);
  return m===12?`${a+1}-01`:`${a}-${String(m+1).padStart(2,'0')}`;
}

const VIDE_QTY = {C24:0,C12:0,F605:0,F615:0,F61:0,HILIO:0};
const VIDE_CH  = {salaires:0,electricite:0,carburant:0,loyer:0,maintenance:0,autres:0};

export default function AtpPage() {
  const [mois,     setMois]     = useState(new Date().toISOString().slice(0,7));
  const [treso,    setTreso]    = useState(0);
  const [stkVal,   setStkVal]   = useState(0);
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);

  const [modalObj,  setModalObj]  = useState(false);
  const [modalCh,   setModalCh]   = useState(false);
  const [modalPrev, setModalPrev] = useState(false);
  const [formObj,   setFormObj]   = useState({...VIDE_QTY, cdhtp_manuel:0});
  const [formCh,    setFormCh]    = useState({...VIDE_CH});
  const [formPrev,  setFormPrev]  = useState({...VIDE_QTY, cdhtp_manuel:0});

  const charger = async () => {
    setLoading(true);
    try {
      const [aRes, tRes, sRes] = await Promise.allSettled([
        api.get(`/atp/mois?mois=${mois}`),
        tresorerieAPI.soldes(),
        stocksAPI.alertes(),
      ]);
      if (aRes.status==='fulfilled') setData(aRes.value.data);
      if (tRes.status==='fulfilled') {
        const d=tRes.value.data;
        const c=Array.isArray(d)?d:Array.isArray(d?.comptes)?d.comptes:[];
        setTreso(c.reduce((s,x)=>s+parseFloat(x.solde_fcfa||0),0));
      }
      if (sRes.status==='fulfilled') {
        const d=sRes.value.data;
        const a=Array.isArray(d)?d:Array.isArray(d?.data)?d.data:[];
        setStkVal(a.reduce((s,x)=>s+parseFloat(x.valeur_stock_ht||0),0));
      }
    } catch { toast.error('Erreur ATP'); }
    finally { setLoading(false); }
  };

  useEffect(() => { charger(); }, [mois]); // eslint-disable-line

  const moisSuiv = getMoisSuivant(mois);
  const moisSuivLabel = MOIS_LISTE.find(m=>m.v===moisSuiv)?.l || moisSuiv;

  const obj  = data?.objectifs    || VIDE_QTY;
  const real = data?.realisations  || VIDE_QTY;
  const prev = data?.previsions    || VIDE_QTY;
  const ch   = data?.charges       || VIDE_CH;

  const CAHTP  = data?.CAHTP  || 0;
  const CDHTP  = data?.CDHTP  || 0;
  const MBHTP  = data?.MBHTP  || 0;
  const TMBHTP = data?.TMBHTP || 0;
  const bmfMtP = data?.bmfMtP || 0;
  const fsMtP  = data?.fsMtP  || 0;
  const ammMtP = data?.ammMtP || 0;
  const bmfTxP = data?.bmfTxP || 0;
  const fsTxP  = data?.fsTxP  || 0;
  const ammTxP = data?.ammTxP || 0;

  const CAHTR  = data?.CAHTR  || 0;
  const CDHTR  = data?.CDHTR  || 0;
  const MBHTR  = data?.MBHTR  || 0;
  const TMBHTR = data?.TMBHTR || 0;
  const bmfMtR = data?.bmfMtR || 0;
  const fsMtR  = data?.fsMtR  || 0;
  const ammMtR = data?.ammMtR || 0;
  const bmfTxR = data?.bmfTxR || 0;
  const fsTxR  = data?.fsTxR  || 0;
  const ammTxR = data?.ammTxR || 0;
  const totalCI = data?.totalCI || 0;
  const tauxAv  = data?.taux_avancement || 0;

  const CAPrev = PRODUITS.reduce((s,p)=>s+(parseFloat(prev[p.key]||0)*p.prix),0);

  // CAHTP calculé dans le modal objectifs
  const cahtp_modal = PRODUITS.reduce((s,p)=>s+(formObj[p.key]||0)*p.prix,0);
  // MBHTP calculé dans le modal = CAHTP - CDHTP manuel
  const mbhtp_modal = cahtp_modal - (formObj.cdhtp_manuel||0);
  const tmbhtp_modal = cahtp_modal>0 ? mbhtp_modal/cahtp_modal : 0;

  // CAHTP prévisions modal
  const cahtp_prev = PRODUITS.reduce((s,p)=>s+(formPrev[p.key]||0)*p.prix,0);
  const mbhtp_prev = cahtp_prev - (formPrev.cdhtp_manuel||0);

  const sauverObjectifs = async () => {
    try {
      await api.post('/atp/objectifs', {
        mois,
        objectifs: formObj,
        cdhtp_manuel: formObj.cdhtp_manuel||0,
      });
      toast.success('Objectifs enregistrés ✓');
      setModalObj(false); charger();
    } catch { toast.error('Erreur enregistrement'); }
  };

  const sauverCharges = async () => {
    try {
      await api.post('/atp/charges', { mois, charges: formCh });
      toast.success('Charges indirectes enregistrées ✓');
      setModalCh(false); charger();
    } catch { toast.error('Erreur enregistrement'); }
  };

  const sauverPrevisions = async () => {
    try {
      await api.post('/atp/previsions', {
        mois,
        previsions: formPrev,
        cdhtp_manuel: formPrev.cdhtp_manuel||0,
      });
      toast.success(`Prévisions enregistrées → Objectifs ${moisSuivLabel} ✓`);
      setModalPrev(false); charger();
    } catch { toast.error('Erreur enregistrement'); }
  };

  if (loading) return <div className="loader-wrap"><div className="spinner"/></div>;

  return (
    <div className="fade-up">
      {/* Barre contrôle */}
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14,flexWrap:'wrap'}}>
        <select className="form-sel" value={mois} onChange={e=>setMois(e.target.value)}>
          {MOIS_LISTE.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
        <button className="btn primary" onClick={()=>{setFormObj({...VIDE_QTY,...obj,cdhtp_manuel:data?.CDHTP||0});setModalObj(true);}}>
          📊 Saisir objectifs
        </button>
        <button className="btn amber" onClick={()=>{setFormCh({...VIDE_CH,...ch});setModalCh(true);}}>
          💼 Charges indirectes
        </button>
        <button className="btn" style={{marginLeft:'auto'}} onClick={()=>{setFormPrev({...VIDE_QTY,...prev,cdhtp_manuel:data?.CDHTR||0});setModalPrev(true);}}>
          🔮 Prévisions {moisSuivLabel}
        </button>
      </div>

      {/* Trésorerie disponible */}
      <div className="card" style={{marginBottom:12,background:'linear-gradient(135deg,rgba(34,211,238,.08),rgba(52,211,153,.05))'}}>
        <div className="card-hd"><div className="card-t">💰 Trésorerie disponible</div><span className="cbadge bc">FCFA</span></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          <div className="fin-card"><div className="fin-lbl">Trésorerie totale</div><div className="fin-val">{fmt(treso)}</div><div className="fin-sub">FCFA</div></div>
          <div className="fin-card"><div className="fin-lbl">Valeur stocks</div><div className="fin-val">{fmt(stkVal)}</div><div className="fin-sub">FCFA</div></div>
          <div className="fin-card" style={{borderColor:'rgba(34,211,238,.3)'}}><div className="fin-lbl">Total disponible</div><div className="fin-val" style={{color:'var(--cyan)'}}>{fmt(treso+stkVal)}</div><div className="fin-sub">Tréso + Stocks</div></div>
          <div className="fin-card"><div className="fin-lbl">CAHTP</div><div className="fin-val" style={{color:'var(--amber)'}}>{CAHTP>0?fmt(CAHTP):'—'}</div><div className="fin-sub">Prévisionnel</div></div>
        </div>
      </div>

      {/* Objectifs + Réalisations */}
      <div className="atp-grid">
        <div className="card">
          <div className="card-hd"><div className="card-t">📊 Objectifs — Projection</div><span className="cbadge ba">Prévisionnel</span></div>
          <table className="tbl">
            <thead><tr><th>Produit</th><th>Qté obj.</th><th>Prix unit. HT</th><th>Montant FCFA</th></tr></thead>
            <tbody>
              {PRODUITS.map(p=>(
                <tr key={p.key}>
                  <td>{p.nom}</td>
                  <td style={{fontFamily:'var(--mono)'}}>{obj[p.key]>0?fmt(obj[p.key]):'—'}</td>
                  <td style={{fontFamily:'var(--mono)'}}>{p2(p.prix)}</td>
                  <td style={{fontFamily:'var(--mono)',color:'var(--text1)'}}>{obj[p.key]>0?fmt(obj[p.key]*p.prix):'—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={3} style={{fontWeight:600,fontSize:10}}>CAHTP</td><td style={{fontWeight:700,color:'var(--cyan)',fontFamily:'var(--mono)'}}>{CAHTP>0?fmt(CAHTP):'—'}</td></tr>
              <tr><td colSpan={3} style={{fontWeight:600,fontSize:10,color:'var(--red)'}}>CDHTP <span style={{fontSize:9,color:'var(--text3)'}}>(saisi manuellement)</span></td><td style={{fontWeight:700,color:'var(--red)',fontFamily:'var(--mono)'}}>{CDHTP>0?fmt(CDHTP):'—'}</td></tr>
              <tr><td colSpan={3} style={{fontWeight:600,fontSize:10,color:'var(--cyan)'}}>MBHTP</td><td style={{fontWeight:700,color:'var(--cyan)',fontFamily:'var(--mono)'}}>{MBHTP!==0?fmt(MBHTP):'—'}</td></tr>
            </tfoot>
          </table>
        </div>

        <div className="card">
          <div className="card-hd"><div className="card-t">✅ Réalisation en cours</div><span className="cbadge bg">Cumulé automatique</span></div>
          <table className="tbl">
            <thead><tr><th>Produit</th><th>Qté réal.</th><th>Prix unit. HT</th><th>Montant FCFA</th><th>Avancement</th></tr></thead>
            <tbody>
              {PRODUITS.map(p=>{
                const r=parseFloat(real[p.key]||0);
                const o=parseFloat(obj[p.key]||0);
                const tx=o>0?r/o*100:0;
                return(
                  <tr key={p.key}>
                    <td>{p.nom}</td>
                    <td style={{fontFamily:'var(--mono)'}}>{r>0?fmt(r):'—'}</td>
                    <td style={{fontFamily:'var(--mono)'}}>{p2(p.prix)}</td>
                    <td style={{fontFamily:'var(--mono)',color:'var(--green)'}}>{r>0?fmt(r*p.prix):'—'}</td>
                    <td style={{fontFamily:'var(--mono)',color:tx>=100?'var(--green)':'var(--amber)'}}>{r>0?tx.toFixed(1)+'%':'—'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr><td colSpan={3} style={{fontWeight:600,fontSize:10}}>CAHTR</td><td style={{fontWeight:700,color:'var(--green)',fontFamily:'var(--mono)'}}>{CAHTR>0?fmt(CAHTR):'—'}</td><td style={{fontWeight:700,color:'var(--green)',fontFamily:'var(--mono)'}}>{CAHTP>0&&CAHTR>0?fmtP(tauxAv):'—'}</td></tr>
              <tr><td colSpan={3} style={{fontWeight:600,fontSize:10,color:'var(--red)'}}>CDHTR <span style={{fontSize:9,color:'var(--text3)'}}>(saisi manuellement)</span></td><td style={{fontWeight:700,color:'var(--red)',fontFamily:'var(--mono)'}} colSpan={2}>{CDHTR>0?fmt(CDHTR):'—'}</td></tr>
              <tr><td colSpan={3} style={{fontWeight:600,fontSize:10,color:'var(--green)'}}>MBHTR</td><td style={{fontWeight:700,color:'var(--green)',fontFamily:'var(--mono)'}} colSpan={2}>{MBHTR!==0?fmt(MBHTR):'—'}</td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Charges indirectes */}
      {totalCI>0&&(
        <div className="card" style={{marginBottom:14}}>
          <div className="card-hd"><div className="card-t">💼 Charges indirectes (CIHT)</div><span className="cbadge bp">Saisies manuellement</span></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:8}}>
            {[['salaires','Salaires'],['electricite','Électricité'],['carburant','Carburant'],['loyer','Loyer'],['maintenance','Maintenance'],['autres','Autres']].map(([k,l])=>(
              <div key={k} className="fin-card">
                <div className="fin-lbl">{l}</div>
                <div className="fin-val" style={{color:'var(--purple)',fontSize:13}}>{fmt(ch[k]||0)}</div>
              </div>
            ))}
          </div>
          <div className="tot-row" style={{marginTop:10}}>
            <span className="tot-lbl">TOTAL CIHT</span>
            <span className="tot-val">{fmt(totalCI)} FCFA</span>
          </div>
        </div>
      )}

      {/* Marges */}
      <div className="atp-grid" style={{marginBottom:14}}>
        <div className="card">
          <div className="card-hd"><div className="card-t">📐 Marges — Projection</div><span className="cbadge ba">Prévisionnel</span></div>
          <table className="tbl">
            <thead><tr><th>#</th><th>Libellé</th><th>Montant FCFA</th></tr></thead>
            <tbody>
              <tr><td>1</td><td>CAHTP</td><td style={{fontFamily:'var(--mono)'}}>{CAHTP>0?fmt(CAHTP):'—'}</td></tr>
              <tr><td>2</td><td style={{color:'var(--red)'}}>CDHTP <span style={{fontSize:9,color:'var(--text3)'}}>(manuel)</span></td><td style={{fontFamily:'var(--mono)',color:'var(--red)'}}>{CDHTP>0?fmt(CDHTP):'—'}</td></tr>
              <tr><td>3</td><td style={{fontWeight:600,color:'var(--cyan)'}}>MBHTP</td><td style={{fontFamily:'var(--mono)',color:'var(--cyan)',fontWeight:700}}>{MBHTP!==0?fmt(MBHTP):'—'}</td></tr>
              <tr><td>4</td><td>TMBHTP</td><td style={{fontFamily:'var(--mono)',color:'var(--amber)',fontWeight:600}}>{TMBHTP!==0?fmtP(TMBHTP):'—'}</td></tr>
            </tbody>
          </table>
          <div style={{height:1,background:'var(--border)',margin:'10px 0'}}/>
          <div className="sec-title">Répartition MBHTP</div>
          <table className="tbl">
            <thead><tr><th>Rubrique</th><th>Montant</th><th>Taux</th></tr></thead>
            <tbody>
              <tr><td>BMF</td><td style={{fontFamily:'var(--mono)'}}>{bmfMtP>0?fmt(bmfMtP):'—'}</td><td style={{fontFamily:'var(--mono)',color:'var(--amber)'}}>{bmfTxP>0?fmtP(bmfTxP):'—'}</td></tr>
              <tr><td>Frais de siège</td><td style={{fontFamily:'var(--mono)'}}>{fsMtP>0?fmt(fsMtP):'—'}</td><td style={{fontFamily:'var(--mono)',color:'var(--amber)'}}>{fsTxP>0?fmtP(fsTxP):'—'}</td></tr>
              <tr><td>Amortissement</td><td style={{fontFamily:'var(--mono)'}}>{ammMtP>0?fmt(ammMtP):'—'}</td><td style={{fontFamily:'var(--mono)',color:'var(--amber)'}}>{ammTxP>0?fmtP(ammTxP):'—'}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-hd"><div className="card-t">📐 Marges — Réalisation</div><span className="cbadge bg">Cumulé automatique</span></div>
          <table className="tbl">
            <thead><tr><th>#</th><th>Libellé</th><th>Montant FCFA</th></tr></thead>
            <tbody>
              <tr><td>5</td><td>CAHTR</td><td style={{fontFamily:'var(--mono)'}}>{CAHTR>0?fmt(CAHTR):'—'}</td></tr>
              <tr><td>6</td><td style={{color:'var(--red)'}}>CDHTR <span style={{fontSize:9,color:'var(--text3)'}}>(manuel)</span></td><td style={{fontFamily:'var(--mono)',color:'var(--red)'}}>{CDHTR>0?fmt(CDHTR):'—'}</td></tr>
              <tr><td>7</td><td style={{fontWeight:600,color:'var(--green)'}}>MBHTR</td><td style={{fontFamily:'var(--mono)',color:'var(--green)',fontWeight:700}}>{MBHTR!==0?fmt(MBHTR):'—'}</td></tr>
              <tr><td>8</td><td>TMBHTR</td><td style={{fontFamily:'var(--mono)',color:'var(--amber)',fontWeight:600}}>{TMBHTR!==0?fmtP(TMBHTR):'—'}</td></tr>
            </tbody>
          </table>
          <div style={{height:1,background:'var(--border)',margin:'10px 0'}}/>
          <div className="sec-title">Répartition MBHTR</div>
          <table className="tbl">
            <thead><tr><th>Rubrique</th><th>Montant</th><th>Taux</th></tr></thead>
            <tbody>
              <tr><td>BMF</td><td style={{fontFamily:'var(--mono)'}}>{bmfMtR>0?fmt(bmfMtR):'—'}</td><td style={{fontFamily:'var(--mono)',color:'var(--green)'}}>{bmfTxR>0?fmtP(bmfTxR):'—'}</td></tr>
              <tr><td>Frais de siège</td><td style={{fontFamily:'var(--mono)'}}>{fsMtR>0?fmt(fsMtR):'—'}</td><td style={{fontFamily:'var(--mono)',color:'var(--green)'}}>{fsTxR>0?fmtP(fsTxR):'—'}</td></tr>
              <tr><td>Amortissement</td><td style={{fontFamily:'var(--mono)'}}>{ammMtR>0?fmt(ammMtR):'—'}</td><td style={{fontFamily:'var(--mono)',color:'var(--green)'}}>{ammTxR>0?fmtP(ammTxR):'—'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Prévisions mois suivant */}
      <div className="card">
        <div className="card-hd">
          <div className="card-t">🔮 Prévisions — {moisSuivLabel}</div>
          <span className="cbadge bp">→ Objectifs {moisSuivLabel}</span>
        </div>
        <table className="tbl">
          <thead><tr><th>Produit</th><th>Qté prévisionnelle</th><th>CA HT estimé</th></tr></thead>
          <tbody>
            {PRODUITS.map(p=>(
              <tr key={p.key}>
                <td>{p.nom}</td>
                <td style={{fontFamily:'var(--mono)'}}>{parseFloat(prev[p.key]||0)>0?fmt(prev[p.key]):'—'}</td>
                <td style={{fontFamily:'var(--mono)',color:'var(--purple)'}}>{parseFloat(prev[p.key]||0)>0?fmt(prev[p.key]*p.prix):'—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr>
            <td colSpan={2} style={{fontWeight:600,fontSize:10}}>CAHTP estimé ({moisSuivLabel})</td>
            <td style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--purple)'}}>{CAPrev>0?fmt(CAPrev):'—'}</td>
          </tr></tfoot>
        </table>
      </div>

      {/* ── MODAL OBJECTIFS ── */}
      {modalObj&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModalObj(false)}>
          <div className="modal" style={{width:600}}>
            <div className="modal-title">
              📊 Objectifs — {MOIS_LISTE.find(m=>m.v===mois)?.l}
              <button className="modal-close" onClick={()=>setModalObj(false)}>✕</button>
            </div>
            <div style={{background:'rgba(251,191,36,.06)',border:'1px solid rgba(251,191,36,.2)',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:11,color:'var(--amber)'}}>
              Saisissez les quantités prévisionnelles et le CDHTP réel.
            </div>
            <table className="tbl" style={{marginBottom:12}}>
              <thead><tr><th>Produit</th><th>Prix vente HT</th><th>Qté objectif</th><th>CAHTP partiel</th></tr></thead>
              <tbody>
                {PRODUITS.map(p=>(
                  <tr key={p.key}>
                    <td>{p.nom}</td>
                    <td style={{fontFamily:'var(--mono)',color:'var(--text3)'}}>{p2(p.prix)}</td>
                    <td>
                      <input type="number" className="form-inp" min={0} style={{width:110,fontFamily:'var(--mono)'}}
                        value={formObj[p.key]||0}
                        onChange={e=>setFormObj(f=>({...f,[p.key]:+e.target.value}))}/>
                    </td>
                    <td style={{fontFamily:'var(--mono)',color:'var(--cyan)'}}>{fmt((formObj[p.key]||0)*p.prix)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={3} style={{fontWeight:600}}>CAHTP Total</td>
                  <td style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--cyan)'}}>{fmt(cahtp_modal)}</td></tr>
              </tfoot>
            </table>

            {/* CDHTP manuel */}
            <div style={{background:'rgba(248,113,113,.06)',border:'1px solid rgba(248,113,113,.2)',borderRadius:8,padding:'12px',marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--red)',marginBottom:8}}>
                CDHTP — Coût direct HT prévisionnel <span style={{fontWeight:400,color:'var(--text3)'}}>(à saisir manuellement)</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <input type="number" className="form-inp" min={0} style={{flex:1,fontFamily:'var(--mono)',fontSize:14,color:'var(--red)',fontWeight:700}}
                  value={formObj.cdhtp_manuel||0}
                  onChange={e=>setFormObj(f=>({...f,cdhtp_manuel:+e.target.value}))}/>
                <div style={{fontSize:11,color:'var(--text3)'}}>FCFA</div>
              </div>
              <div style={{display:'flex',gap:16,marginTop:10,fontSize:11}}>
                <div>MBHTP = <strong style={{color:mbhtp_modal>=0?'var(--green)':'var(--red)',fontFamily:'var(--mono)'}}>{fmt(mbhtp_modal)}</strong> FCFA</div>
                <div>TMBHTP = <strong style={{color:'var(--amber)',fontFamily:'var(--mono)'}}>{cahtp_modal>0?fmtP(mbhtp_modal/cahtp_modal):'—'}</strong></div>
              </div>
            </div>

            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn" onClick={()=>setModalObj(false)}>Annuler</button>
              <button className="btn primary" onClick={sauverObjectifs}>✓ Enregistrer les objectifs</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CHARGES INDIRECTES ── */}
      {modalCh&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModalCh(false)}>
          <div className="modal" style={{width:480}}>
            <div className="modal-title">
              💼 CIHT — {MOIS_LISTE.find(m=>m.v===mois)?.l}
              <button className="modal-close" onClick={()=>setModalCh(false)}>✕</button>
            </div>
            <div style={{background:'rgba(167,139,250,.06)',border:'1px solid rgba(167,139,250,.2)',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:11,color:'var(--purple)'}}>
              Charges indirectes = dépenses non liées directement à la production.
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              {[['salaires','Salaires & charges'],['electricite','Électricité'],['carburant','Carburant / Gasoil'],['loyer','Loyer & charges'],['maintenance','Maintenance'],['autres','Autres charges']].map(([k,l])=>(
                <div className="form-grp" key={k}>
                  <label className="form-lbl">{l}</label>
                  <input type="number" className="form-inp" min={0} style={{fontFamily:'var(--mono)'}}
                    value={formCh[k]||0} onChange={e=>setFormCh(f=>({...f,[k]:+e.target.value}))}/>
                </div>
              ))}
            </div>
            <div className="tot-row" style={{marginBottom:14}}>
              <span className="tot-lbl">TOTAL CIHT</span>
              <span className="tot-val">{fmt(Object.values(formCh).reduce((a,b)=>a+parseFloat(b||0),0))} FCFA</span>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn" onClick={()=>setModalCh(false)}>Annuler</button>
              <button className="btn primary" onClick={sauverCharges}>✓ Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PRÉVISIONS ── */}
      {modalPrev&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModalPrev(false)}>
          <div className="modal" style={{width:600}}>
            <div className="modal-title">
              🔮 Prévisions → Objectifs {moisSuivLabel}
              <button className="modal-close" onClick={()=>setModalPrev(false)}>✕</button>
            </div>
            <div style={{background:'rgba(167,139,250,.06)',border:'1px solid rgba(167,139,250,.2)',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:11,color:'var(--purple)'}}>
              Ces prévisions deviendront automatiquement les objectifs de {moisSuivLabel}.
            </div>
            <table className="tbl" style={{marginBottom:12}}>
              <thead><tr><th>Produit</th><th>Prix vente HT</th><th>Qté prévisionnelle</th><th>CAHTP estimé</th></tr></thead>
              <tbody>
                {PRODUITS.map(p=>(
                  <tr key={p.key}>
                    <td>{p.nom}</td>
                    <td style={{fontFamily:'var(--mono)',color:'var(--text3)'}}>{p2(p.prix)}</td>
                    <td>
                      <input type="number" className="form-inp" min={0} style={{width:110,fontFamily:'var(--mono)'}}
                        value={formPrev[p.key]||0}
                        onChange={e=>setFormPrev(f=>({...f,[p.key]:+e.target.value}))}/>
                    </td>
                    <td style={{fontFamily:'var(--mono)',color:'var(--purple)'}}>{fmt((formPrev[p.key]||0)*p.prix)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr>
                <td colSpan={3} style={{fontWeight:600}}>CAHTP estimé {moisSuivLabel}</td>
                <td style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--purple)'}}>{fmt(cahtp_prev)}</td>
              </tr></tfoot>
            </table>

            {/* CDHTP manuel pour prévisions */}
            <div style={{background:'rgba(248,113,113,.06)',border:'1px solid rgba(248,113,113,.2)',borderRadius:8,padding:'12px',marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--red)',marginBottom:8}}>
                CDHTP prévisionnel {moisSuivLabel} <span style={{fontWeight:400,color:'var(--text3)'}}>(à saisir manuellement)</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <input type="number" className="form-inp" min={0} style={{flex:1,fontFamily:'var(--mono)',fontSize:14,color:'var(--red)',fontWeight:700}}
                  value={formPrev.cdhtp_manuel||0}
                  onChange={e=>setFormPrev(f=>({...f,cdhtp_manuel:+e.target.value}))}/>
                <div style={{fontSize:11,color:'var(--text3)'}}>FCFA</div>
              </div>
              <div style={{display:'flex',gap:16,marginTop:10,fontSize:11}}>
                <div>MBHTP = <strong style={{color:mbhtp_prev>=0?'var(--green)':'var(--red)',fontFamily:'var(--mono)'}}>{fmt(mbhtp_prev)}</strong> FCFA</div>
                <div>TMBHTP = <strong style={{color:'var(--amber)',fontFamily:'var(--mono)'}}>{cahtp_prev>0?fmtP(mbhtp_prev/cahtp_prev):'—'}</strong></div>
              </div>
            </div>

            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn" onClick={()=>setModalPrev(false)}>Annuler</button>
              <button className="btn primary" onClick={sauverPrevisions}>✓ Enregistrer les prévisions</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
