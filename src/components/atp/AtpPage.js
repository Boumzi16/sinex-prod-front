import { useState, useEffect } from 'react';
import { atpAPI, tresorerieAPI, stocksAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PRODUITS = [
  {nom:'CARTON C24',      key:'C24',  prix:2033.90},
  {nom:'CARTON C12',      key:'C12',  prix:2116.1 },
  {nom:'FARDEAU F6/0,5L', key:'F605', prix:429    },
  {nom:'FARDEAU F6/1,5L', key:'F615', prix:1032   },
  {nom:'FARDEAU F6/1L',   key:'F61',  prix:1186   },
  {nom:'HILIO',           key:'HILIO',prix:169     },
];

export default function AtpPage() {
  const [mois,    setMois]    = useState(new Date().toISOString().slice(0,7));
  const [treso,   setTreso]   = useState(0);
  const [stkVal,  setStkVal]  = useState(0);
  const [objQty,  setObjQty]  = useState({C24:0,C12:0,F605:0,F615:0,F61:0,HILIO:0});
  const [realQty, setRealQty] = useState({C24:0,C12:0,F605:0,F615:0,F61:0,HILIO:0});
  const [prevQty, setPrevQty] = useState({C24:0,C12:0,F605:0,F615:0,F61:0,HILIO:0});
  const [, setLoading] = useState(false);

  const charger = async () => {
    setLoading(true);
    try {
      const [aRes, tRes, sRes] = await Promise.allSettled([
        atpAPI.dashboard(mois),
        tresorerieAPI.soldes(),
        stocksAPI.alertes(),
      ]);
      if (tRes.status === 'fulfilled') {
        const d = tRes.value.data;
        const c = Array.isArray(d) ? d : Array.isArray(d?.comptes) ? d.comptes : Array.isArray(d?.data) ? d.data : [];
        setTreso(c.reduce((s, x) => s + parseFloat(x.solde_fcfa || x.solde || 0), 0));
      }
      if (sRes.status === 'fulfilled') {
        const d = sRes.value.data;
        const a = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
        setStkVal(a.reduce((s, x) => s + parseFloat(x.valeur_stock_ht || 0), 0));
      }
      if (aRes.status === 'fulfilled') {
        const d = aRes.value.data;
        const arr = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
        if (arr.length > 0) {
          const a = arr[0];
          // Objectifs
          const oq = {C24:0,C12:0,F605:0,F615:0,F61:0,HILIO:0};
          if (a.objectifs) a.objectifs.forEach(o => { if (oq.hasOwnProperty(o.code)) oq[o.code] = parseFloat(o.quantite||0); });
          setObjQty(oq);
          // Réalisations
          const rq = {C24:0,C12:0,F605:0,F615:0,F61:0,HILIO:0};
          if (a.realisations) a.realisations.forEach(r => { if (rq.hasOwnProperty(r.code)) rq[r.code] = parseFloat(r.quantite||0); });
          setRealQty(rq);
          // Prévisions mois suivant
          const pq = {C24:0,C12:0,F605:0,F615:0,F61:0,HILIO:0};
          if (a.previsions) a.previsions.forEach(p => { if (pq.hasOwnProperty(p.code)) pq[p.code] = parseFloat(p.quantite||0); });
          setPrevQty(pq);
        }
      }
    } catch { toast.error('Erreur chargement ATP'); }
    finally { setLoading(false); }
  };

  useEffect(() => { charger(); }, [mois]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculs CA
  const caObj  = PRODUITS.reduce((s,p) => s + objQty[p.key]  * p.prix, 0);
  const caReal = PRODUITS.reduce((s,p) => s + realQty[p.key] * p.prix, 0);
  const caPrev = PRODUITS.reduce((s,p) => s + prevQty[p.key] * p.prix, 0);

  // Marges projection
  const cdP  = caObj * 0.65;
  const mbP  = caObj - cdP;
  const tmbP = caObj > 0 ? mbP / caObj : 0;

  // Marges réalisation
  const cdR  = caReal * 0.65;
  const mbR  = caReal - cdR;
  const tmbR = caReal > 0 ? mbR / caReal : 0;

  // Répartition MB — formules du document
  const bmfP = tmbP > 0 ? (caObj * 0.35) / (tmbP * 0.15) : 0;
  const fsP  = tmbP > 0 ? (caObj * 0.35) / (tmbP * 0.1)  : 0;
  const ammP = tmbP > 0 ? (caObj * 0.35) / (tmbP * 0.1)  : 0;
  const tBmfP = tmbP * 0.15 / 0.35;
  const tFsP  = tmbP * 0.1  / 0.35;
  const tAmmP = tmbP * 0.1  / 0.35;

  const bmfR = tmbR > 0 ? (caReal * 0.35) / (tmbR * 0.15) : 0;
  const fsR  = tmbR > 0 ? (caReal * 0.35) / (tmbR * 0.1)  : 0;
  const ammR = tmbR > 0 ? (caReal * 0.35) / (tmbR * 0.1)  : 0;
  const tBmfR = tmbR * 0.15 / 0.35;
  const tFsR  = tmbR * 0.1  / 0.35;
  const tAmmR = tmbR * 0.1  / 0.35;

  // Prévisions chiffres
  const cdPrev  = caPrev * 0.65;
  const mbPrev  = caPrev - cdPrev;
  const tmbPrev = caPrev > 0 ? mbPrev / caPrev : 0;

  const f  = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(parseFloat(n)||0));
  const fp = (n) => (parseFloat(n||0)*100).toFixed(1) + '%';
  const p2 = (n) => parseFloat(n||0).toLocaleString('fr-FR', {minimumFractionDigits:2});

  return (
    <div className="fade-up">
      {/* Barre contrôle */}
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14}}>
        <select className="form-sel" value={mois} onChange={e => setMois(e.target.value)}>
          {['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'].map(m => (
            <option key={m} value={m}>
              {new Date(m+'-01').toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}
            </option>
          ))}
        </select>
        <button className="btn primary" onClick={charger}>⟳ Recalculer</button>
        <button className="btn" onClick={() => alert('Export PDF en cours...')}>↓ Exporter PDF</button>
      </div>

      {/* Trésorerie disponible projet */}
      <div className="card" style={{marginBottom:12,background:'linear-gradient(135deg,rgba(34,211,238,.08),rgba(52,211,153,.05))'}}>
        <div className="card-hd">
          <div className="card-t">💰 Trésorerie disponible — Projet de production</div>
          <span className="cbadge bc">FCFA</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          <div className="fin-card"><div className="fin-lbl">Trésorerie totale</div><div className="fin-val">{f(treso)}</div><div className="fin-sub">FCFA</div></div>
          <div className="fin-card"><div className="fin-lbl">Valeur stocks</div><div className="fin-val">{f(stkVal)}</div><div className="fin-sub">FCFA estimé</div></div>
          <div className="fin-card" style={{borderColor:'rgba(34,211,238,.3)'}}><div className="fin-lbl">Total disponible</div><div className="fin-val" style={{color:'var(--cyan)'}}>{f(treso+stkVal)}</div><div className="fin-sub">Tréso + Stocks</div></div>
          <div className="fin-card"><div className="fin-lbl">Objectif CA HT</div><div className="fin-val" style={{color:'var(--amber)'}}>{caObj > 0 ? f(caObj) : '—'}</div><div className="fin-sub">Prévisionnel</div></div>
        </div>
      </div>

      {/* Objectifs (gauche) + Réalisations (droite) */}
      <div className="atp-grid">
        {/* OBJECTIFS / PROJECTION */}
        <div className="card">
          <div className="card-hd"><div className="card-t">📊 Objectifs de production — Projection</div><span className="cbadge ba">Prévisionnel</span></div>
          <table className="tbl">
            <thead><tr><th>Produit</th><th>Qté obj.</th><th>Prix unit. HT</th><th>Montant FCFA</th></tr></thead>
            <tbody>
              {PRODUITS.map(p => (
                <tr key={p.key}>
                  <td>{p.nom}</td>
                  <td style={{fontFamily:'var(--mono)'}}>{objQty[p.key] > 0 ? f(objQty[p.key]) : '—'}</td>
                  <td style={{fontFamily:'var(--mono)'}}>{p2(p.prix)}</td>
                  <td style={{fontFamily:'var(--mono)',color:'var(--text1)'}}>{objQty[p.key] > 0 ? f(objQty[p.key]*p.prix) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr style={{borderTop:'1px solid var(--border)'}}>
              <td colSpan={3} style={{fontWeight:600,color:'var(--text1)',fontSize:10}}>TOTAL CA HT Prévisionnel</td>
              <td style={{fontWeight:700,color:'var(--cyan)',fontFamily:'var(--mono)'}}>{caObj > 0 ? f(caObj) : '—'}</td>
            </tr></tfoot>
          </table>
        </div>

        {/* RÉALISATIONS EN COURS */}
        <div className="card">
          <div className="card-hd"><div className="card-t">✅ Réalisation en cours</div><span className="cbadge bg">Cumulé</span></div>
          <table className="tbl">
            <thead><tr><th>Produit</th><th>Qté réal.</th><th>Prix unit. HT</th><th>Montant FCFA</th><th>Taux %</th></tr></thead>
            <tbody>
              {PRODUITS.map(p => {
                const mt  = realQty[p.key] * p.prix;
                const obj = objQty[p.key]  * p.prix;
                const tx  = obj > 0 ? mt / obj * 100 : 0;
                return (
                  <tr key={p.key}>
                    <td>{p.nom}</td>
                    <td style={{fontFamily:'var(--mono)'}}>{realQty[p.key] > 0 ? f(realQty[p.key]) : '—'}</td>
                    <td style={{fontFamily:'var(--mono)'}}>{p2(p.prix)}</td>
                    <td style={{fontFamily:'var(--mono)',color:'var(--green)'}}>{realQty[p.key] > 0 ? f(mt) : '—'}</td>
                    <td style={{fontFamily:'var(--mono)',color:tx>=100?'var(--green)':'var(--amber)'}}>{realQty[p.key] > 0 ? tx.toFixed(1)+'%' : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr style={{borderTop:'1px solid var(--border)'}}>
              <td colSpan={3} style={{fontWeight:600,color:'var(--text1)',fontSize:10}}>TOTAL CA HT Réalisé</td>
              <td style={{fontWeight:700,color:'var(--green)',fontFamily:'var(--mono)'}}>{caReal > 0 ? f(caReal) : '—'}</td>
              <td style={{fontWeight:700,color:'var(--green)',fontFamily:'var(--mono)'}}>{caObj > 0 && caReal > 0 ? (caReal/caObj*100).toFixed(1)+'%' : '—'}</td>
            </tr></tfoot>
          </table>
        </div>
      </div>

      {/* MARGES BRUTES */}
      <div className="atp-grid" style={{marginBottom:14}}>
        {/* Projection */}
        <div className="card">
          <div className="card-hd"><div className="card-t">📐 Marges brutes — Projection</div><span className="cbadge ba">Prévisionnel</span></div>
          <table className="tbl">
            <thead><tr><th>#</th><th>Libellé</th><th>Montant FCFA</th></tr></thead>
            <tbody>
              <tr><td>1</td><td>CA HT</td><td style={{fontFamily:'var(--mono)',color:'var(--text1)'}}>{caObj > 0 ? f(caObj) : '—'}</td></tr>
              <tr><td>2</td><td>Charges directes HT (CD)</td><td style={{fontFamily:'var(--mono)',color:'var(--red)'}}>{cdP > 0 ? f(cdP) : '—'}</td></tr>
              <tr><td>3</td><td style={{fontWeight:600,color:'var(--cyan)'}}>Marge brute HT (MB)</td><td style={{fontFamily:'var(--mono)',color:'var(--cyan)',fontWeight:700}}>{mbP > 0 ? f(mbP) : '—'}</td></tr>
              <tr><td>4</td><td>Taux MB HT</td><td style={{fontFamily:'var(--mono)',color:'var(--amber)',fontWeight:600}}>{tmbP > 0 ? fp(tmbP) : '—'}</td></tr>
            </tbody>
          </table>
          <div style={{height:1,background:'var(--border)',margin:'10px 0'}}/>
          <div className="sec-title">Répartition MB HT prévisionnelle</div>
          <table className="tbl">
            <thead><tr><th>Rubrique</th><th>Montant</th><th>Taux</th></tr></thead>
            <tbody>
              <tr><td>BMF</td><td style={{fontFamily:'var(--mono)'}}>{bmfP > 0 ? f(bmfP) : '—'}</td><td style={{fontFamily:'var(--mono)',color:'var(--amber)'}}>{tBmfP > 0 ? fp(tBmfP) : '—'}</td></tr>
              <tr><td>Frais de siège</td><td style={{fontFamily:'var(--mono)'}}>{fsP > 0 ? f(fsP) : '—'}</td><td style={{fontFamily:'var(--mono)',color:'var(--amber)'}}>{tFsP > 0 ? fp(tFsP) : '—'}</td></tr>
              <tr><td>Amortissement</td><td style={{fontFamily:'var(--mono)'}}>{ammP > 0 ? f(ammP) : '—'}</td><td style={{fontFamily:'var(--mono)',color:'var(--amber)'}}>{tAmmP > 0 ? fp(tAmmP) : '—'}</td></tr>
              <tr>
                <td style={{fontWeight:600,color:'var(--text1)'}}>TOTAL</td>
                <td style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--cyan)'}}>{(bmfP+fsP+ammP) > 0 ? f(bmfP+fsP+ammP) : '—'}</td>
                <td style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--cyan)'}}>32%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Réalisation */}
        <div className="card">
          <div className="card-hd"><div className="card-t">📐 Marges brutes — Réalisation</div><span className="cbadge bg">Cumulé</span></div>
          <table className="tbl">
            <thead><tr><th>#</th><th>Libellé</th><th>Montant FCFA</th></tr></thead>
            <tbody>
              <tr><td>5</td><td>CA HT réalisé</td><td style={{fontFamily:'var(--mono)',color:'var(--text1)'}}>{caReal > 0 ? f(caReal) : '—'}</td></tr>
              <tr><td>6</td><td>Charges directes HT (CD)</td><td style={{fontFamily:'var(--mono)',color:'var(--red)'}}>{cdR > 0 ? f(cdR) : '—'}</td></tr>
              <tr><td>7</td><td style={{fontWeight:600,color:'var(--green)'}}>Marge brute HT (MB)</td><td style={{fontFamily:'var(--mono)',color:'var(--green)',fontWeight:700}}>{mbR > 0 ? f(mbR) : '—'}</td></tr>
              <tr><td>8</td><td>Taux MB HT</td><td style={{fontFamily:'var(--mono)',color:'var(--amber)',fontWeight:600}}>{tmbR > 0 ? fp(tmbR) : '—'}</td></tr>
            </tbody>
          </table>
          <div style={{height:1,background:'var(--border)',margin:'10px 0'}}/>
          <div className="sec-title">Répartition MB HT réalisée</div>
          <table className="tbl">
            <thead><tr><th>Rubrique</th><th>Montant</th><th>Taux</th></tr></thead>
            <tbody>
              <tr><td>BMF</td><td style={{fontFamily:'var(--mono)'}}>{bmfR > 0 ? f(bmfR) : '—'}</td><td style={{fontFamily:'var(--mono)',color:'var(--green)'}}>{tBmfR > 0 ? fp(tBmfR) : '—'}</td></tr>
              <tr><td>Frais de siège</td><td style={{fontFamily:'var(--mono)'}}>{fsR > 0 ? f(fsR) : '—'}</td><td style={{fontFamily:'var(--mono)',color:'var(--green)'}}>{tFsR > 0 ? fp(tFsR) : '—'}</td></tr>
              <tr><td>Amortissement</td><td style={{fontFamily:'var(--mono)'}}>{ammR > 0 ? f(ammR) : '—'}</td><td style={{fontFamily:'var(--mono)',color:'var(--green)'}}>{tAmmR > 0 ? fp(tAmmR) : '—'}</td></tr>
              <tr>
                <td style={{fontWeight:600,color:'var(--text1)'}}>TOTAL</td>
                <td style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--green)'}}>{(bmfR+fsR+ammR) > 0 ? f(bmfR+fsR+ammR) : '—'}</td>
                <td style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--green)'}}>{(tBmfR+tFsR+tAmmR) > 0 ? fp(tBmfR+tFsR+tAmmR) : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* PRÉVISIONS MOIS PROCHAIN */}
      <div className="card">
        <div className="card-hd">
          <div className="card-t">🔮 Prévisions — Mois prochain</div>
          <span className="cbadge bp">Projection</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <table className="tbl">
            <thead><tr><th>Produit</th><th>Qté prévisionnelle</th><th>CA HT estimé</th></tr></thead>
            <tbody>
              {PRODUITS.map(p => (
                <tr key={p.key}>
                  <td>{p.nom}</td>
                  <td style={{fontFamily:'var(--mono)'}}>{prevQty[p.key] > 0 ? f(prevQty[p.key]) : '—'}</td>
                  <td style={{fontFamily:'var(--mono)',color:'var(--purple)'}}>{prevQty[p.key] > 0 ? f(prevQty[p.key]*p.prix) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr>
              <td colSpan={2} style={{fontWeight:600,color:'var(--text1)',fontSize:10}}>TOTAL CA HT estimé</td>
              <td style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--purple)'}}>{caPrev > 0 ? f(caPrev) : '—'}</td>
            </tr></tfoot>
          </table>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,alignContent:'start'}}>
            <div className="fin-card"><div className="fin-lbl">CA HT prévisionnel</div><div className="fin-val" style={{color:'var(--purple)'}}>{caPrev > 0 ? f(caPrev) : '—'}</div></div>
            <div className="fin-card"><div className="fin-lbl">CD HT estimé</div><div className="fin-val" style={{color:'var(--red)'}}>{cdPrev > 0 ? f(cdPrev) : '—'}</div></div>
            <div className="fin-card"><div className="fin-lbl">MB HT estimée</div><div className="fin-val" style={{color:'var(--green)'}}>{mbPrev > 0 ? f(mbPrev) : '—'}</div></div>
            <div className="fin-card"><div className="fin-lbl">Taux MB HT</div><div className="fin-val" style={{color:'var(--amber)'}}>{tmbPrev > 0 ? fp(tmbPrev) : '—'}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
