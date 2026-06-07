import { useState, useEffect } from 'react';
import { productionAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ImportDrop from '../import/ImportDrop';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(parseFloat(n)||0));

const COMPO = {
  C12:  {p32:12,p17:0, bou:12,e15:12,e05:0, c12:1,c24:0,hil:0,btl:12,unite:'bouteilles 1,5L'},
  C24:  {p32:0, p17:24,bou:24,e15:0, e05:24,c12:0,c24:1,hil:0,btl:24,unite:'bouteilles 0,5L'},
  F615: {p32:6, p17:0, bou:6, e15:6, e05:0, c12:0,c24:0,hil:0,btl:6, unite:'bouteilles 1,5L'},
  F605: {p32:0, p17:6, bou:6, e15:0, e05:6, c12:0,c24:0,hil:0,btl:6, unite:'bouteilles 0,5L'},
  F61:  {p32:0, p17:6, bou:6, e15:0, e05:0, c12:0,c24:0,hil:0,btl:6, unite:'bouteilles 1L'},
  HILIO:{p32:0, p17:0, bou:0, e15:0, e05:0, c12:0,c24:0,hil:30,btl:0,unite:'sachets 0,5L'},
};

function calcTheo(qty) {
  const r={p32:0,p17:0,bou:0,e15:0,e05:0,c12:0,c24:0,hil:0};
  Object.entries(qty).forEach(([k,v])=>{const c=COMPO[k];if(!c)return;Object.keys(r).forEach(m=>{r[m]+=(c[m]||0)*v;});});
  return r;
}

const FORMATS=[
  {key:'C12',nom:'Carton C12',unite:'cartons'},
  {key:'C24',nom:'Carton C24',unite:'cartons'},
  {key:'F615',nom:'F06/1,5L',unite:'fardeaux'},
  {key:'F605',nom:'F06/0,5L',unite:'fardeaux'},
  {key:'F61',nom:'F06/1L',unite:'fardeaux'},
  {key:'HILIO',nom:'HILIO',unite:'packs'},
];

const INTRANTS=[
  {key:'p32',nom:'Préformes 32g',   rKey:'rPref32'},
  {key:'p17',nom:'Préformes 17g',   rKey:'rPref17'},
  {key:'bou',nom:'Bouchons',        rKey:'rBouch'},
  {key:'e15',nom:'Étiq. 1,5L',      rKey:'rEti'},
  {key:'e05',nom:'Étiq. 0,5L',      rKey:'rEti'},
  {key:'c12',nom:'Cartons C12',     rKey:'rCtnC12'},
  {key:'c24',nom:'Cartons C24',     rKey:'rCtnC24'},
  {key:'hil',nom:'Sachets HILIO',   rKey:'rHilio'},
];

const VIDE={date:'',jours:1,C12:0,C24:0,F615:0,F605:0,F61:0,HILIO:0,rPref32:0,rPref17:0,rBouch:0,rCtnC12:0,rCtnC24:0,rHilio:0,rEti:0};

const MOIS_LISTE=[
  {v:'2026-01',l:'Janvier 2026'},{v:'2026-02',l:'Février 2026'},{v:'2026-03',l:'Mars 2026'},
  {v:'2026-04',l:'Avril 2026'},{v:'2026-05',l:'Mai 2026'},{v:'2026-06',l:'Juin 2026'},
  {v:'2026-07',l:'Juillet 2026'},{v:'2026-08',l:'Août 2026'},{v:'2026-09',l:'Septembre 2026'},
  {v:'2026-10',l:'Octobre 2026'},{v:'2026-11',l:'Novembre 2026'},{v:'2026-12',l:'Décembre 2026'},
];

export default function ProductionPage(){
  const {can}=useAuth();
  const [saisies,setSaisies]=useState([]);
  const [mois,setMois]=useState(new Date().toISOString().slice(0,7));
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState(VIDE);
  const [theo,setTheo]=useState({});

  const charger=async()=>{
    setLoading(true);
    try{const r=await productionAPI.liste(mois);const d=r.data;setSaisies(Array.isArray(d)?d:Array.isArray(d?.data)?d.data:[]);}
    catch{toast.error('Erreur chargement');setSaisies([]);}
    finally{setLoading(false);}
  };
  useEffect(()=>{charger();},[mois]); // eslint-disable-line

  const upd=(k,v)=>{
    const nf={...form,[k]:v};setForm(nf);
    const qty={C12:+nf.C12||0,C24:+nf.C24||0,F615:+nf.F615||0,F605:+nf.F605||0,F61:+nf.F61||0,HILIO:+nf.HILIO||0};
    setTheo(calcTheo(qty));
  };

  const pending=saisies.filter(s=>s.statut!=='valide').length;
  const conf=saisies.filter(s=>s.statut==='valide');
  const sumQty={C12:0,C24:0,F615:0,F605:0,F61:0,HILIO:0};
  conf.forEach(s=>{FORMATS.forEach(f=>{sumQty[f.key]+=parseFloat(s[f.key.toLowerCase()]||s.productions?.[f.key]||0);});});
  const theoConf=calcTheo(sumQty);

  // Rebuts totaux du mois
  const rebutsConf={rPref32:0,rPref17:0,rBouch:0,rCtnC12:0,rCtnC24:0,rHilio:0,rEti:0};
  conf.forEach(s=>{
    if(s.rebuts){
      rebutsConf.rPref32  += parseFloat(s.rebuts.pref32||0);
      rebutsConf.rPref17  += parseFloat(s.rebuts.pref17||0);
      rebutsConf.rBouch   += parseFloat(s.rebuts.bouchons||0);
      rebutsConf.rCtnC12  += parseFloat(s.rebuts.ctn_c12||0);
      rebutsConf.rCtnC24  += parseFloat(s.rebuts.ctn_c24||0);
      rebutsConf.rHilio   += parseFloat(s.rebuts.hilio||0);
      rebutsConf.rEti     += parseFloat(s.rebuts.etiquettes||0);
    }
  });

  const sauvegarder=async()=>{
    if(!form.date){toast.error('Sélectionnez une date');return;}
    try{
      await productionAPI.creer({
        date_production:form.date,jours_ouvres:form.jours,
        productions:FORMATS.map(f=>({code:f.key,quantite:+form[f.key]||0})),
        rebuts:{pref32:+form.rPref32||0,pref17:+form.rPref17||0,bouchons:+form.rBouch||0,
          ctn_c12:+form.rCtnC12||0,ctn_c24:+form.rCtnC24||0,hilio:+form.rHilio||0,etiquettes:+form.rEti||0},
      });
      toast.success('Saisie enregistrée — en attente de validation DG');
      setModal(false);setForm(VIDE);charger();
    }catch(e){toast.error(e.response?.data?.message||'Erreur');}
  };

  const valider=async(id)=>{
    try{await productionAPI.valider(id);toast.success('✓ Production validée — Stocks et ATP mis à jour');charger();}
    catch(e){toast.error(e.response?.data?.message||'Erreur validation');}
  };

  return(
    <div className="fade-up">
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14,flexWrap:'wrap'}}>
        <select className="form-sel" value={mois} onChange={e=>setMois(e.target.value)}>
          {MOIS_LISTE.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
        {can('saisirProd')&&<button className="btn primary" onClick={()=>{setForm({...VIDE,date:new Date().toISOString().slice(0,10)});setTheo({});setModal(true);}}>+ Saisir journée</button>}
        <span className="cbadge bp" style={{marginLeft:'auto'}}>{pending} en attente de validation</span>
      </div>

      {can('saisirProd')&&<ImportDrop type="production" icon="🏭" color="cyan"
        label="Import Production Excel — PDT_MOIS_ANNEE_SINEX_SA.xlsx"
        onSuccess={()=>charger()}/>}

      {/* Tableau saisies */}
      <div className="card" style={{marginBottom:12,overflowX:'auto'}}>
        <div className="card-hd">
          <div className="card-t">Saisies — {MOIS_LISTE.find(m=>m.v===mois)?.l}</div>
          <span className="cbadge bc">Journalier</span>
        </div>
        <table className="tbl" style={{minWidth:900}}>
          <thead>
            <tr>
              <th rowSpan={2}>Date</th>
              <th colSpan={6} style={{textAlign:'center',borderBottom:'1px solid var(--border)'}}>Produits finis</th>
              <th colSpan={6} style={{textAlign:'center',borderBottom:'1px solid var(--border)',color:'var(--amber)'}}>Rebuts par matière</th>
              <th rowSpan={2}>Jours</th><th rowSpan={2}>Opérateur</th><th rowSpan={2}>Statut</th><th rowSpan={2}>Action</th>
            </tr>
            <tr>
              <th>C12</th><th>C24</th><th>F6/1,5L</th><th>F6/0,5L</th><th>F6/1L</th><th>HILIO</th>
              <th style={{color:'var(--amber)'}}>P.32g</th><th style={{color:'var(--amber)'}}>P.17g</th>
              <th style={{color:'var(--amber)'}}>Bouch.</th><th style={{color:'var(--amber)'}}>Ctn C12</th>
              <th style={{color:'var(--amber)'}}>Ctn C24</th><th style={{color:'var(--amber)'}}>Étiq.</th>
            </tr>
          </thead>
          <tbody>
            {saisies.map((s,i)=>(
              <tr key={i}>
                <td style={{fontFamily:'var(--mono)',fontSize:9,whiteSpace:'nowrap'}}>{s.date_production?.slice(0,10)||'—'}</td>
                {['c12','c24','f615','f605','f61','hilio'].map(k=><td key={k} style={{fontFamily:'var(--mono)'}}>{s[k]||s.productions?.[k.toUpperCase()]||0}</td>)}
                <td style={{fontFamily:'var(--mono)',color:'var(--amber)'}}>{s.rebuts?.pref32||0}</td>
                <td style={{fontFamily:'var(--mono)',color:'var(--amber)'}}>{s.rebuts?.pref17||0}</td>
                <td style={{fontFamily:'var(--mono)',color:'var(--amber)'}}>{s.rebuts?.bouchons||0}</td>
                <td style={{fontFamily:'var(--mono)',color:'var(--amber)'}}>{s.rebuts?.ctn_c12||0}</td>
                <td style={{fontFamily:'var(--mono)',color:'var(--amber)'}}>{s.rebuts?.ctn_c24||0}</td>
                <td style={{fontFamily:'var(--mono)',color:'var(--amber)'}}>{s.rebuts?.etiquettes||0}</td>
                <td style={{fontFamily:'var(--mono)'}}>{s.jours_ouvres||1}</td>
                <td style={{color:'var(--text3)',fontSize:10}}>{s.saisi_par_nom||'—'}</td>
                <td>{s.statut==='valide'?<span className="st sconf">✓ Confirmé</span>:<span className="st spend">⏳ En attente</span>}</td>
                <td>{can('validerProd')&&s.statut!=='valide'&&<button className="btn success" style={{fontSize:9,padding:'3px 8px'}} onClick={()=>valider(s.id)}>✓ Valider</button>}</td>
              </tr>
            ))}
            {!saisies.length&&<tr><td colSpan={18} style={{textAlign:'center',color:'var(--text3)',padding:32}}>{loading?'Chargement...':'Aucune saisie pour ce mois'}</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Totaux + Consommations */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div className="card">
          <div className="card-hd"><div className="card-t">Totaux — productions confirmées</div><span className="cbadge bg">Cumulé</span></div>
          <table className="tbl">
            <thead><tr><th>Format</th><th>Qté produite</th><th>Contenu</th></tr></thead>
            <tbody>
              {FORMATS.map(f=>{
                const q=sumQty[f.key]||0;const c=COMPO[f.key];
                const contenu=f.key==='HILIO'?`${q*30} sachets`:`${q*(c?.btl||0)} ${c?.unite||''}`;
                return <tr key={f.key}><td>{f.nom}</td><td style={{fontFamily:'var(--mono)'}}>{fmt(q)} {f.unite}</td><td style={{fontFamily:'var(--mono)',color:'var(--cyan)'}}>{contenu}</td></tr>;
              })}
            </tbody>
            <tfoot><tr>
              <td style={{fontWeight:600,color:'var(--text1)'}}>TOTAL</td>
              <td style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--cyan)'}}>{fmt(Object.values(sumQty).reduce((a,b)=>a+b,0))} unités</td>
              <td style={{fontFamily:'var(--mono)',color:'var(--cyan)',fontSize:10}}>{fmt(sumQty.C12*12+sumQty.C24*24+sumQty.F615*6+sumQty.F605*6+sumQty.F61*6)} btl + {fmt(sumQty.HILIO*30)} sachets</td>
            </tr></tfoot>
          </table>
        </div>

        <div className="card">
          <div className="card-hd"><div className="card-t">Consommations théoriques déduites</div><span className="cbadge ba">Calculé auto</span></div>
          <table className="tbl">
            <thead><tr><th>Intrant</th><th>Consommé théorique</th><th>Rebuts saisis</th><th style={{color:'var(--amber)'}}>Total utilisé</th></tr></thead>
            <tbody>
              {INTRANTS.map(it=>{
                const t=theoConf[it.key]||0;
                const reb=parseFloat(rebutsConf[it.rKey]||0);
                return(
                  <tr key={it.key+it.nom}>
                    <td>{it.nom}</td>
                    <td style={{fontFamily:'var(--mono)',color:'var(--text1)'}}>{fmt(t)}</td>
                    <td style={{fontFamily:'var(--mono)',color:'var(--amber)'}}>{reb>0?'+'+fmt(reb):'-'}</td>
                    <td style={{fontFamily:'var(--mono)',fontWeight:600,color:'var(--amber)'}}>{fmt(t+reb)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr>
              <td colSpan={3} style={{fontWeight:600,color:'var(--text1)'}}>TOTAL CONSOMMÉ</td>
              <td style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--amber)'}}>
                {fmt(INTRANTS.reduce((s,it)=>{
                  const t=theoConf[it.key]||0;
                  const reb=parseFloat(rebutsConf[it.rKey]||0);
                  return s+t+reb;
                },0))} unités
              </td>
            </tr></tfoot>
          </table>
        </div>
      </div>

      {/* Modal saisie */}
      {modal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{width:640}}>
            <div className="modal-title">+ Saisie journée de production<button className="modal-close" onClick={()=>setModal(false)}>✕</button></div>
            <div className="form-row">
              <div className="form-grp"><label className="form-lbl">Date</label>
                <input type="date" className="form-inp" value={form.date} onChange={e=>upd('date',e.target.value)}/></div>
              <div className="form-grp"><label className="form-lbl">Jours ouvrés</label>
                <select className="form-sel" value={form.jours} onChange={e=>setForm(f=>({...f,jours:+e.target.value}))}>
                  <option value={1}>1 — Journée complète</option><option value={0.5}>0,5 — Demi-journée</option><option value={0}>0 — Arrêt</option>
                </select></div>
            </div>
            <div className="sec-title">Produits finis</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:4}}>
              {[['C12','C12 (12 btl 1,5L)'],['C24','C24 (24 btl 0,5L)'],['F615','F06/1,5L (6 btl)'],['F605','F06/0,5L (6 btl)'],['F61','F06/1L (6 btl)'],['HILIO','HILIO (30 sachets)']].map(([k,lbl])=>(
                <div className="form-grp" key={k}><label className="form-lbl">{lbl}</label>
                  <input type="number" className="form-inp" min={0} value={form[k]} onChange={e=>upd(k,+e.target.value)} style={{fontFamily:'var(--mono)'}}/></div>
              ))}
            </div>
            <div style={{background:'rgba(34,211,238,.05)',border:'1px solid rgba(34,211,238,.15)',borderRadius:8,padding:'10px 12px',marginBottom:12}}>
              <div style={{fontSize:9,color:'var(--cyan)',textTransform:'uppercase',letterSpacing:.6,marginBottom:8}}>⟳ Consommations théoriques calculées automatiquement</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                {[['p32','Préf. 32g'],['p17','Préf. 17g'],['bou','Bouchons'],['e15','Étiq. 1,5L'],['e05','Étiq. 0,5L'],['c12','Ctn C12'],['c24','Ctn C24'],['hil','Sachets HILIO']].map(([k,lbl])=>(
                  <div key={k}><div style={{fontSize:9,color:'var(--text3)'}}>{lbl}</div><div style={{fontFamily:'var(--mono)',color:'var(--text1)',fontWeight:600}}>{fmt(theo[k]||0)}</div></div>
                ))}
              </div>
            </div>
            <div className="sec-title" style={{color:'var(--amber)'}}>Rebuts par matière</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
              {[['rPref32','Préformes 32g'],['rPref17','Préformes 17g'],['rBouch','Bouchons'],['rCtnC12','Cartons C12'],['rCtnC24','Cartons C24'],['rHilio','Sachets HILIO'],['rEti','Étiquettes']].map(([k,lbl])=>(
                <div className="form-grp" key={k}><label className="form-lbl" style={{color:'var(--amber)'}}>{lbl}</label>
                  <input type="number" className="form-inp" min={0} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:+e.target.value}))} style={{fontFamily:'var(--mono)'}}/></div>
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn" onClick={()=>setModal(false)}>Annuler</button>
              <button className="btn primary" onClick={sauvegarder}>✓ Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
