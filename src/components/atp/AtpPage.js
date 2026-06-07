import { useState, useEffect } from 'react';
import { atpAPI, tresorerieAPI, stocksAPI } from '../../services/api';
import api from '../../services/api';
import toast from 'react-hot-toast';

const fmt  = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(parseFloat(n)||0));
const fmtP = (n) => (parseFloat(n||0)*100).toFixed(1)+'%';
const p2   = (n) => parseFloat(n||0).toLocaleString('fr-FR',{minimumFractionDigits:2});

const PRODUITS = [
  {nom:'CARTON C24',      key:'C24',  prix:2033.90},
  {nom:'CARTON C12',      key:'C12',  prix:2116.10},
  {nom:'FARDEAU F6/0,5L', key:'F605', prix:429.00 },
  {nom:'FARDEAU F6/1,5L', key:'F615', prix:1032.00},
  {nom:'FARDEAU F6/1L',   key:'F61',  prix:1186.00},
  {nom:'HILIO',           key:'HILIO',prix:169.00 },
];

const MOIS_LISTE=[
  {v:'2026-01',l:'Janvier 2026'},{v:'2026-02',l:'Février 2026'},{v:'2026-03',l:'Mars 2026'},
  {v:'2026-04',l:'Avril 2026'},{v:'2026-05',l:'Mai 2026'},{v:'2026-06',l:'Juin 2026'},
  {v:'2026-07',l:'Juillet 2026'},{v:'2026-08',l:'Août 2026'},{v:'2026-09',l:'Septembre 2026'},
  {v:'2026-10',l:'Octobre 2026'},{v:'2026-11',l:'Novembre 2026'},{v:'2026-12',l:'Décembre 2026'},
];

const MOIS_SUIVANT = {
  '2026-01':'2026-02','2026-02':'2026-03','2026-03':'2026-04',
  '2026-04':'2026-05','2026-05':'2026-06','2026-06':'2026-07',
  '2026-07':'2026-08','2026-08':'2026-09','2026-09':'2026-10',
  '2026-10':'2026-11','2026-11':'2026-12','2026-12':'2026-01',
};

const OBJ_VIDE = {C24:0,C12:0,F605:0,F615:0,F61:0,HILIO:0};
const CHARGES_VIDE = {salaires:0,electricite:0,carburant:0,loyer:0,maintenance:0,autres:0};
const PREV_VIDE = {C24:0,C12:0,F605:0,F615:0,F61:0,HILIO:0};

export default function AtpPage() {
  const [mois,      setMois]      = useState(new Date().toISOString().slice(0,7));
  const [treso,     setTreso]     = useState(0);
  const [stkVal,    setStkVal]    = useState(0);
  const [objQty,    setObjQty]    = useState(OBJ_VIDE);
  const [realQty,   setRealQty]   = useState(OBJ_VIDE);
  const [prevQty,   setPrevQty]   = useState(PREV_VIDE);
  const [charges,   setCharges]   = useState(CHARGES_VIDE);
  const [atpId,     setAtpId]     = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [modalObj,  setModalObj]  = useState(false);
  const [modalCh,   setModalCh]   = useState(false);
  const [modalPrev, setModalPrev] = useState(false);
  const [formObj,   setFormObj]   = useState(OBJ_VIDE);
  const [formCh,    setFormCh]    = useState(CHARGES_VIDE);
  const [formPrev,  setFormPrev]  = useState(PREV_VIDE);

  const charger = async () => {
    setLoading(true);
    try {
      const [aRes,tRes,sRes] = await Promise.allSettled([
        atpAPI.dashboard(mois),
        tresorerieAPI.soldes(),
        stocksAPI.alertes(),
      ]);
      if(tRes.status==='fulfilled'){
        const d=tRes.value.data;
        const c=Array.isArray(d)?d:Array.isArray(d?.comptes)?d.comptes:[];
        setTreso(c.reduce((s,x)=>s+parseFloat(x.solde_fcfa||0),0));
      }
      if(sRes.status==='fulfilled'){
        const d=sRes.value.data;
        const a=Array.isArray(d)?d:Array.isArray(d?.data)?d.data:[];
        setStkVal(a.reduce((s,x)=>s+parseFloat(x.valeur_stock_ht||0),0));
      }
      if(aRes.status==='fulfilled'){
        const d=aRes.value.data;
        const arr=Array.isArray(d)?d:Array.isArray(d?.data)?d.data:[];
        if(arr.length>0){
          const a=arr[0];
          setAtpId(a.id||null);
          // Objectifs
          const oq={...OBJ_VIDE};
          if(a.objectifs) a.objectifs.forEach(o=>{if(oq.hasOwnProperty(o.code)) oq[o.code]=parseFloat(o.quantite||0);});
          else if(a.proj_ca_ht>0){
            // Charger depuis la table atp_objectifs
          }
          setObjQty(oq);
          // Réalisations depuis productions validées
          const rq={...OBJ_VIDE};
          if(a.realisations) a.realisations.forEach(r=>{if(rq.hasOwnProperty(r.code)) rq[r.code]=parseFloat(r.quantite||0);});
          setRealQty(rq);
          // Prévisions
          const pq={...PREV_VIDE};
          if(a.previsions) a.previsions.forEach(p=>{if(pq.hasOwnProperty(p.code)) pq[p.code]=parseFloat(p.quantite||0);});
          setPrevQty(pq);
          // Charges indirectes
          if(a.charges_indirectes){
            setCharges({
              salaires:    parseFloat(a.charges_indirectes.salaires||0),
              electricite: parseFloat(a.charges_indirectes.electricite||0),
              carburant:   parseFloat(a.charges_indirectes.carburant||0),
              loyer:       parseFloat(a.charges_indirectes.loyer||0),
              maintenance: parseFloat(a.charges_indirectes.maintenance||0),
              autres:      parseFloat(a.charges_indirectes.autres||0),
            });
          }
        } else {
          setObjQty(OBJ_VIDE); setRealQty(OBJ_VIDE); setPrevQty(PREV_VIDE);
          setCharges(CHARGES_VIDE); setAtpId(null);
        }
      }
    } catch { toast.error('Erreur ATP'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ charger(); },[mois]); // eslint-disable-line

  // Calculs
  const caObj  = PRODUITS.reduce((s,p)=>s+objQty[p.key] *p.prix,0);
  const caReal = PRODUITS.reduce((s,p)=>s+realQty[p.key]*p.prix,0);
  const caPrev = PRODUITS.reduce((s,p)=>s+prevQty[p.key]*p.prix,0);

  const totalChargesI = Object.values(charges).reduce((a,b)=>a+parseFloat(b||0),0);

  // Charges directes = 65% du CA (consommations MP)
  const cdObjP  = caObj  * 0.65;
  const cdRealP = caReal * 0.65;

  // Charges totales = CD + Charges indirectes
  const ctObjP  = cdObjP  + totalChargesI;
  const ctRealP = cdRealP + totalChargesI;

  const mbObjP  = caObj  - ctObjP;
  const mbRealP = caReal - ctRealP;
  const tmbObjP  = caObj  > 0 ? mbObjP  / caObj  : 0;
  const tmbRealP = caReal > 0 ? mbRealP / caReal : 0;

  const rep=(mb,tmb)=>({
    bmfMt:mb*(0.15/0.35), fsMt:mb*(0.1/0.35), ammMt:mb*(0.1/0.35),
    bmfTx:tmb*0.15/0.35,  fsTx:tmb*0.1/0.35,  ammTx:tmb*0.1/0.35,
  });
  const repP=rep(mbObjP, tmbObjP);
  const repR=rep(mbRealP,tmbRealP);

  const cdPrev=caPrev*0.65+totalChargesI;
  const mbPrev=caPrev-cdPrev;
  const tmbPrev=caPrev>0?mbPrev/caPrev:0;

  // Sauvegarder objectifs
  const sauverObjectifs = async () => {
    try {
      await api.post('/atp/objectifs', { mois, objectifs: formObj });
      setObjQty({...formObj});
      toast.success('Objectifs enregistrés ✓');
      setModalObj(false);
      charger();
    } catch { toast.error('Erreur enregistrement objectifs'); }
  };

  // Sauvegarder charges indirectes
  const sauverCharges = async () => {
    try {
      await api.post('/atp/charges', { mois, charges: formCh });
      setCharges({...formCh});
      toast.success('Charges enregistrées ✓');
      setModalCh(false);
    } catch { toast.error('Erreur enregistrement charges'); }
  };

  // Sauvegarder prévisions (deviennent objectifs mois suivant)
  const sauverPrevisions = async () => {
    try {
      const moisSuiv = MOIS_SUIVANT[mois] || mois;
      await api.post('/atp/objectifs', { mois: moisSuiv, objectifs: formPrev });
      setPrevQty({...formPrev});
      toast.success(`Prévisions enregistrées → Objectifs de ${MOIS_LISTE.find(m=>m.v===moisSuiv)?.l} ✓`);
      setModalPrev(false);
    } catch { toast.error('Erreur enregistrement prévisions'); }
  };

  if(loading) return <div className="loader-wrap"><div className="spinner"/></div>;

  return (
    <div className="fade-up">
      {/* Barre contrôle */}
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14,flexWrap:'wrap'}}>
        <select className="form-sel" value={mois} onChange={e=>setMois(e.target.value)}>
          {MOIS_LISTE.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
        <button className="btn primary" onClick={()=>{setFormObj({...objQty});setModalObj(true);}}>
          📊 Saisir objectifs
        </button>
        <button className="btn amber" onClick={()=>{setFormCh({...charges});setModalCh(true);}}>
          💼 Charges indirectes
        </button>
        <button className="btn" style={{marginLeft:'auto'}} onClick={()=>{setFormPrev({...prevQty});setModalPrev(true);}}>
          🔮 Prévisions mois suivant
        </button>
      </div>

      {/* Trésorerie disponible */}
      <div className="card" style={{marginBottom:12,background:'linear-gradient(135deg,rgba(34,211,238,.08),rgba(52,211,153,.05))'}}>
        <div className="card-hd"><div className="card-t">💰 Trésorerie disponible — Projet de production</div><span className="cbadge bc">FCFA</span></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          <div className="fin-card"><div className="fin-lbl">Trésorerie totale</div><div className="fin-val">{fmt(treso)}</div><div className="fin-sub">FCFA</div></div>
          <div className="fin-card"><div className="fin-lbl">Valeur stocks</div><div className="fin-val">{fmt(stkVal)}</div><div className="fin-sub">FCFA estimé</div></div>
          <div className="fin-card" style={{borderColor:'rgba(34,211,238,.3)'}}><div className="fin-lbl">Total disponible</div><div className="fin-val" style={{color:'var(--cyan)'}}>{fmt(treso+stkVal)}</div><div className="fin-sub">Tréso + Stocks</div></div>
          <div className="fin-card"><div className="fin-lbl">Objectif CA HT</div><div className="fin-val" style={{color:'var(--amber)'}}>{caObj>0?fmt(caObj):'—'}</div><div className="fin-sub">Prévisionnel</div></div>
        </div>
      </div>

      {/* Objectifs + Réalisations */}
      <div className="atp-grid">
        <div className="card">
          <div className="card-hd"><div className="card-t">📊 Objectifs de production — Projection</div><span className="cbadge ba">Prévisionnel</span></div>
          <table className="tbl">
            <thead><tr><th>Produit</th><th>Qté obj.</th><th>Prix unit. HT</th><th>Montant FCFA</th></tr></thead>
            <tbody>
              {PRODUITS.map(p=>(
                <tr key={p.key}>
                  <td>{p.nom}</td>
                  <td style={{fontFamily:'var(--mono)'}}>{objQty[p.key]>0?fmt(objQty[p.key]):'—'}</td>
                  <td style={{fontFamily:'var(--mono)'}}>{p2(p.prix)}</td>
                  <td style={{fontFamily:'var(--mono)',color:'var(--text1)'}}>{objQty[p.key]>0?fmt(objQty[p.key]*p.prix):'—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr style={{borderTop:'1px solid var(--border)'}}>
              <td colSpan={3} style={{fontWeight:600,color:'var(--text1)',fontSize:10}}>TOTAL CA HT Prévisionnel</td>
              <td style={{fontWeight:700,color:'var(--cyan)',fontFamily:'var(--mono)'}}>{caObj>0?fmt(caObj):'—'}</td>
            </tr></tfoot>
          </table>
        </div>

        <div className="card">
          <div className="card-hd"><div className="card-t">✅ Réalisation en cours</div><span className="cbadge bg">Cumulé automatique</span></div>
          <table className="tbl">
            <thead><tr><th>Produit</th><th>Qté réal.</th><th>Prix unit. HT</th><th>Montant FCFA</th><th>Taux %</th></tr></thead>
            <tbody>
              {PRODUITS.map(p=>{
                const mt=realQty[p.key]*p.prix;
                const obj=objQty[p.key]*p.prix;
                const tx=obj>0?mt/obj*100:0;
                return(
                  <tr key={p.key}>
                    <td>{p.nom}</td>
                    <td style={{fontFamily:'var(--mono)'}}>{realQty[p.key]>0?fmt(realQty[p.key]):'—'}</td>
                    <td style={{fontFamily:'var(--mono)'}}>{p2(p.prix)}</td>
                    <td style={{fontFamily:'var(--mono)',color:'var(--green)'}}>{realQty[p.key]>0?fmt(mt):'—'}</td>
                    <td style={{fontFamily:'var(--mono)',color:tx>=100?'var(--green)':'var(--amber)'}}>{realQty[p.key]>0?tx.toFixed(1)+'%':'—'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr style={{borderTop:'1px solid var(--border)'}}>
              <td colSpan={3} style={{fontWeight:600,color:'var(--text1)',fontSize:10}}>TOTAL CA HT Réalisé</td>
              <td style={{fontWeight:700,color:'var(--green)',fontFamily:'var(--mono)'}}>{caReal>0?fmt(caReal):'—'}</td>
              <td style={{fontWeight:700,color:'var(--green)',fontFamily:'var(--mono)'}}>{caObj>0&&caReal>0?(caReal/caObj*100).toFixed(1)+'%':'—'}</td>
            </tr></tfoot>
          </table>
        </div>
      </div>

      {/* Charges indirectes résumé */}
      {totalChargesI>0&&(
        <div className="card" style={{marginBottom:14}}>
          <div className="card-hd"><div className="card-t">💼 Charges indirectes du mois</div><span className="cbadge bp">Saisies manuellement</span></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:8}}>
            {[['Salaires',charges.salaires],['Électricité',charges.electricite],['Carburant',charges.carburant],['Loyer',charges.loyer],['Maintenance',charges.maintenance],['Autres',charges.autres]].map(([l,v])=>(
              <div key={l} className="fin-card">
                <div className="fin-lbl">{l}</div>
                <div className="fin-val" style={{color:'var(--purple)',fontSize:13}}>{fmt(v)}</div>
                <div className="fin-sub">FCFA</div>
              </div>
            ))}
          </div>
          <div className="tot-row" style={{marginTop:10}}>
            <span className="tot-lbl">TOTAL CHARGES INDIRECTES</span>
            <span className="tot-val">{fmt(totalChargesI)} FCFA</span>
          </div>
        </div>
      )}

      {/* Marges */}
      <div className="atp-grid" style={{marginBottom:14}}>
        {[
          {title:'📐 Marges brutes — Projection',badge:'ba',color:'var(--cyan)',ca:caObj,cd:ctObjP,mb:mbObjP,tmb:tmbObjP,r:repP,ids:[1,2,3,4],label:'prévisionnelle'},
          {title:'📐 Marges brutes — Réalisation',badge:'bg',color:'var(--green)',ca:caReal,cd:ctRealP,mb:mbRealP,tmb:tmbRealP,r:repR,ids:[5,6,7,8],label:'réalisée'},
        ].map((s,si)=>(
          <div className="card" key={si}>
            <div className="card-hd"><div className="card-t">{s.title}</div><span className={`cbadge ${s.badge}`}>{si===0?'Prévisionnel':'Cumulé'}</span></div>
            <table className="tbl">
              <thead><tr><th>#</th><th>Libellé</th><th>Montant FCFA</th></tr></thead>
              <tbody>
                <tr><td>{s.ids[0]}</td><td>CA HT{si===1?' réalisé':''}</td><td style={{fontFamily:'var(--mono)',color:'var(--text1)'}}>{s.ca>0?fmt(s.ca):'—'}</td></tr>
                <tr><td>{s.ids[1]}</td><td>Charges directes HT (65% CA)</td><td style={{fontFamily:'var(--mono)',color:'var(--red)'}}>{s.ca>0?fmt(s.ca*0.65):'—'}</td></tr>
                <tr><td></td><td style={{color:'var(--text3)',fontSize:10}}>+ Charges indirectes</td><td style={{fontFamily:'var(--mono)',color:'var(--purple)'}}>{totalChargesI>0?fmt(totalChargesI):'—'}</td></tr>
                <tr><td>{s.ids[2]}</td><td style={{fontWeight:600,color:s.color}}>Marge brute HT (MB)</td><td style={{fontFamily:'var(--mono)',color:s.color,fontWeight:700}}>{s.ca>0?fmt(s.mb):'—'}</td></tr>
                <tr><td>{s.ids[3]}</td><td>Taux MB HT</td><td style={{fontFamily:'var(--mono)',color:'var(--amber)',fontWeight:600}}>{s.ca>0?fmtP(s.tmb):'—'}</td></tr>
              </tbody>
            </table>
            <div style={{height:1,background:'var(--border)',margin:'10px 0'}}/>
            <div className="sec-title">Répartition MB HT {s.label}</div>
            <table className="tbl">
              <thead><tr><th>Rubrique</th><th>Montant</th><th>Taux</th></tr></thead>
              <tbody>
                <tr><td>BMF</td><td style={{fontFamily:'var(--mono)'}}>{s.mb>0?fmt(s.r.bmfMt):'—'}</td><td style={{fontFamily:'var(--mono)',color:s.color}}>{s.mb>0?fmtP(s.r.bmfTx):'—'}</td></tr>
                <tr><td>Frais de siège</td><td style={{fontFamily:'var(--mono)'}}>{s.mb>0?fmt(s.r.fsMt):'—'}</td><td style={{fontFamily:'var(--mono)',color:s.color}}>{s.mb>0?fmtP(s.r.fsTx):'—'}</td></tr>
                <tr><td>Amortissement</td><td style={{fontFamily:'var(--mono)'}}>{s.mb>0?fmt(s.r.ammMt):'—'}</td><td style={{fontFamily:'var(--mono)',color:s.color}}>{s.mb>0?fmtP(s.r.ammTx):'—'}</td></tr>
                <tr>
                  <td style={{fontWeight:600,color:'var(--text1)'}}>TOTAL</td>
                  <td style={{fontFamily:'var(--mono)',fontWeight:700,color:s.color}}>{s.mb>0?fmt(s.r.bmfMt+s.r.fsMt+s.r.ammMt):'—'}</td>
                  <td style={{fontFamily:'var(--mono)',fontWeight:700,color:s.color}}>32%</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Prévisions mois prochain */}
      <div className="card">
        <div className="card-hd">
          <div className="card-t">🔮 Prévisions — {MOIS_LISTE.find(m=>m.v===MOIS_SUIVANT[mois])?.l||'Mois prochain'}</div>
          <span className="cbadge bp">→ Objectifs mois suivant</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <table className="tbl">
            <thead><tr><th>Produit</th><th>Qté prévisionnelle</th><th>CA HT estimé</th></tr></thead>
            <tbody>
              {PRODUITS.map(p=>(
                <tr key={p.key}>
                  <td>{p.nom}</td>
                  <td style={{fontFamily:'var(--mono)'}}>{prevQty[p.key]>0?fmt(prevQty[p.key]):'—'}</td>
                  <td style={{fontFamily:'var(--mono)',color:'var(--purple)'}}>{prevQty[p.key]>0?fmt(prevQty[p.key]*p.prix):'—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr>
              <td colSpan={2} style={{fontWeight:600,color:'var(--text1)',fontSize:10}}>TOTAL CA HT estimé</td>
              <td style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--purple)'}}>{caPrev>0?fmt(caPrev):'—'}</td>
            </tr></tfoot>
          </table>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,alignContent:'start'}}>
            <div className="fin-card"><div className="fin-lbl">CA HT prévisionnel</div><div className="fin-val" style={{color:'var(--purple)'}}>{caPrev>0?fmt(caPrev):'—'}</div></div>
            <div className="fin-card"><div className="fin-lbl">Charges estimées</div><div className="fin-val" style={{color:'var(--red)'}}>{caPrev>0?fmt(cdPrev):'—'}</div></div>
            <div className="fin-card"><div className="fin-lbl">MB HT estimée</div><div className="fin-val" style={{color:'var(--green)'}}>{caPrev>0?fmt(mbPrev):'—'}</div></div>
            <div className="fin-card"><div className="fin-lbl">Taux MB HT</div><div className="fin-val" style={{color:'var(--amber)'}}>{caPrev>0?fmtP(tmbPrev):'—'}</div></div>
          </div>
        </div>
      </div>

      {/* ── MODAL OBJECTIFS ── */}
      {modalObj&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModalObj(false)}>
          <div className="modal" style={{width:560}}>
            <div className="modal-title">
              📊 Saisir les objectifs — {MOIS_LISTE.find(m=>m.v===mois)?.l}
              <button className="modal-close" onClick={()=>setModalObj(false)}>✕</button>
            </div>
            <div style={{background:'rgba(251,191,36,.06)',border:'1px solid rgba(251,191,36,.2)',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:11,color:'var(--amber)'}}>
              ℹ️ Saisissez les quantités prévisionnelles pour chaque format. Les marges seront calculées automatiquement.
            </div>
            <table className="tbl" style={{marginBottom:16}}>
              <thead><tr><th>Produit</th><th>Prix unit. HT</th><th>Qté objectif</th><th>CA prévisionnel</th></tr></thead>
              <tbody>
                {PRODUITS.map(p=>(
                  <tr key={p.key}>
                    <td>{p.nom}</td>
                    <td style={{fontFamily:'var(--mono)',color:'var(--text3)'}}>{p2(p.prix)}</td>
                    <td>
                      <input type="number" className="form-inp" min={0} style={{width:120,fontFamily:'var(--mono)'}}
                        value={formObj[p.key]||0}
                        onChange={e=>setFormObj(f=>({...f,[p.key]:+e.target.value}))}/>
                    </td>
                    <td style={{fontFamily:'var(--mono)',color:'var(--cyan)'}}>{fmt((formObj[p.key]||0)*p.prix)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr>
                <td colSpan={3} style={{fontWeight:600,color:'var(--text1)'}}>TOTAL CA HT Prévisionnel</td>
                <td style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--cyan)'}}>
                  {fmt(PRODUITS.reduce((s,p)=>s+(formObj[p.key]||0)*p.prix,0))}
                </td>
              </tr></tfoot>
            </table>
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
              💼 Charges indirectes — {MOIS_LISTE.find(m=>m.v===mois)?.l}
              <button className="modal-close" onClick={()=>setModalCh(false)}>✕</button>
            </div>
            <div style={{background:'rgba(167,139,250,.06)',border:'1px solid rgba(167,139,250,.2)',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:11,color:'var(--purple)'}}>
              ℹ️ Saisissez les charges indirectes du mois (salaires, électricité, etc.). Elles seront déduites du CA pour calculer la marge brute réelle.
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              {[['salaires','Salaires & charges sociales'],['electricite','Électricité'],['carburant','Carburant & gasoil'],['loyer','Loyer & charges locatives'],['maintenance','Maintenance & réparations'],['autres','Autres charges']].map(([k,lbl])=>(
                <div className="form-grp" key={k}>
                  <label className="form-lbl">{lbl}</label>
                  <input type="number" className="form-inp" min={0} value={formCh[k]||0}
                    onChange={e=>setFormCh(f=>({...f,[k]:+e.target.value}))}
                    style={{fontFamily:'var(--mono)'}}/>
                </div>
              ))}
            </div>
            <div className="tot-row" style={{marginBottom:16}}>
              <span className="tot-lbl">TOTAL CHARGES INDIRECTES</span>
              <span className="tot-val">{fmt(Object.values(formCh).reduce((a,b)=>a+parseFloat(b||0),0))} FCFA</span>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn" onClick={()=>setModalCh(false)}>Annuler</button>
              <button className="btn primary" onClick={sauverCharges}>✓ Enregistrer les charges</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PRÉVISIONS MOIS SUIVANT ── */}
      {modalPrev&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModalPrev(false)}>
          <div className="modal" style={{width:560}}>
            <div className="modal-title">
              🔮 Prévisions → Objectifs {MOIS_LISTE.find(m=>m.v===MOIS_SUIVANT[mois])?.l}
              <button className="modal-close" onClick={()=>setModalPrev(false)}>✕</button>
            </div>
            <div style={{background:'rgba(167,139,250,.06)',border:'1px solid rgba(167,139,250,.2)',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:11,color:'var(--purple)'}}>
              ℹ️ Ces prévisions deviendront automatiquement les objectifs du mois suivant ({MOIS_LISTE.find(m=>m.v===MOIS_SUIVANT[mois])?.l}).
            </div>
            <table className="tbl" style={{marginBottom:16}}>
              <thead><tr><th>Produit</th><th>Prix unit. HT</th><th>Qté prévisionnelle</th><th>CA estimé</th></tr></thead>
              <tbody>
                {PRODUITS.map(p=>(
                  <tr key={p.key}>
                    <td>{p.nom}</td>
                    <td style={{fontFamily:'var(--mono)',color:'var(--text3)'}}>{p2(p.prix)}</td>
                    <td>
                      <input type="number" className="form-inp" min={0} style={{width:120,fontFamily:'var(--mono)'}}
                        value={formPrev[p.key]||0}
                        onChange={e=>setFormPrev(f=>({...f,[p.key]:+e.target.value}))}/>
                    </td>
                    <td style={{fontFamily:'var(--mono)',color:'var(--purple)'}}>{fmt((formPrev[p.key]||0)*p.prix)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr>
                <td colSpan={3} style={{fontWeight:600,color:'var(--text1)'}}>TOTAL CA HT estimé</td>
                <td style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--purple)'}}>
                  {fmt(PRODUITS.reduce((s,p)=>s+(formPrev[p.key]||0)*p.prix,0))}
                </td>
              </tr></tfoot>
            </table>
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
