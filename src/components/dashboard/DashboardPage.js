import { useState, useEffect, useRef } from 'react';
import { dashboardAPI, stocksAPI, tresorerieAPI } from '../../services/api';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(parseFloat(n)||0));
const PRIX = {C12:2116.10, C24:2033.90, F615:1032.00, F605:429.00, F61:1186.00, HILIO:169.00};

const MOIS_LISTE = [
  {v:'2026-01',l:'Janvier 2026'},{v:'2026-02',l:'Février 2026'},{v:'2026-03',l:'Mars 2026'},
  {v:'2026-04',l:'Avril 2026'},{v:'2026-05',l:'Mai 2026'},{v:'2026-06',l:'Juin 2026'},
  {v:'2026-07',l:'Juillet 2026'},{v:'2026-08',l:'Août 2026'},{v:'2026-09',l:'Septembre 2026'},
  {v:'2026-10',l:'Octobre 2026'},{v:'2026-11',l:'Novembre 2026'},{v:'2026-12',l:'Décembre 2026'},
];

export default function DashboardPage() {
  const [mois,   setMois]   = useState(new Date().toISOString().slice(0,7));
  const [kpis,   setKpis]   = useState({});
  const [stocks, setStocks] = useState([]);
  const [treso,  setTreso]  = useState([]);
  const [evo,    setEvo]    = useState([]);
  const [rebuts, setRebuts] = useState([]);
  const [loading,setLoading]= useState(true);

  const refFmt=useRef(); const refEvo=useRef(); const refReb=useRef();
  const instFmt=useRef(); const instEvo=useRef(); const instReb=useRef();

  const charger = async () => {
    setLoading(true);
    try {
      const [dRes,sRes,tRes] = await Promise.allSettled([
        dashboardAPI.consolide(mois),
        stocksAPI.alertes(),
        tresorerieAPI.soldes(),
      ]);
      if(dRes.status==='fulfilled'){
        const d=dRes.value.data;
        setKpis(d?.kpis||{});
        setEvo(d?.evolution||[]);
        setRebuts(d?.rebuts||[]);
      }
      if(sRes.status==='fulfilled'){
        const d=sRes.value.data;
        setStocks(Array.isArray(d)?d:Array.isArray(d?.data)?d.data:[]);
      }
      if(tRes.status==='fulfilled'){
        const d=tRes.value.data;
        const c=Array.isArray(d)?d:Array.isArray(d?.comptes)?d.comptes:Array.isArray(d?.data)?d.data:[];
        setTreso(c);
      }
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ charger(); },[mois]); // eslint-disable-line

  // CA du mois calculé à partir des KPIs
  const caMois = (parseFloat(kpis.c12||0)*PRIX.C12) + (parseFloat(kpis.c24||0)*PRIX.C24) +
    (parseFloat(kpis.f615||0)*PRIX.F615) + (parseFloat(kpis.f605||0)*PRIX.F605) +
    (parseFloat(kpis.f61||0)*PRIX.F61) + (parseFloat(kpis.hilio||0)*PRIX.HILIO);

  // CA cumulé annuel = somme de tous les mois de l'année en cours depuis janvier
  const [caCumule, setCaCumule] = useState(0);
  useEffect(()=>{
    const annee = mois.slice(0,4);
    const moisCourant = parseInt(mois.slice(5,7));
    Promise.all(
      Array.from({length:moisCourant},(_,i)=>{
        const m = `${annee}-${String(i+1).padStart(2,'0')}`;
        return dashboardAPI.consolide(m).then(r=>r.data?.kpis||{}).catch(()=>({}));
      })
    ).then(results=>{
      const total = results.reduce((s,k)=>{
        return s + (parseFloat(k.c12||0)*PRIX.C12) + (parseFloat(k.c24||0)*PRIX.C24) +
          (parseFloat(k.f615||0)*PRIX.F615) + (parseFloat(k.f605||0)*PRIX.F605) +
          (parseFloat(k.f61||0)*PRIX.F61) + (parseFloat(k.hilio||0)*PRIX.HILIO);
      },0);
      setCaCumule(total);
    });
  },[mois]); // eslint-disable-line

  useEffect(()=>{
    if(loading) return;
    import('chart.js/auto').then(({default:Chart})=>{
      Chart.defaults.color='#64748b';Chart.defaults.borderColor='#1e3a5f';
      Chart.defaults.font.family="'Sora',sans-serif";Chart.defaults.font.size=10;

      if(instFmt.current) instFmt.current.destroy();
      if(instEvo.current)  instEvo.current.destroy();
      if(instReb.current)  instReb.current.destroy();

      const fmtLabels=['C12','C24','F06/1,5L','F06/0,5L','F06/1L','HILIO'];
      const fmtData=[
        parseFloat(kpis.c12||0),parseFloat(kpis.c24||0),
        parseFloat(kpis.f615||0),parseFloat(kpis.f605||0),
        parseFloat(kpis.f61||0),parseFloat(kpis.hilio||0)
      ];

      if(refFmt.current) instFmt.current = new Chart(refFmt.current,{
        type:'bar',
        data:{labels:fmtLabels,datasets:[{label:'Production',data:fmtData,
          backgroundColor:['rgba(34,211,238,.7)','rgba(52,211,153,.7)','rgba(251,191,36,.7)','rgba(45,212,191,.7)','rgba(56,189,248,.7)','rgba(167,139,250,.7)'],
          borderRadius:4}]},
        options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{x:{grid:{color:'rgba(30,58,95,.5)'},ticks:{color:'#475569'},beginAtZero:true},
            y:{grid:{display:false},ticks:{color:'#94a3b8'}}}}
      });

      // Évolution CA depuis janvier jusqu'au mois sélectionné
      const annee = mois.slice(0,4);
      const moisIdx = parseInt(mois.slice(5,7));
      const moisLabels = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'].slice(0,moisIdx);
      const caParMois = moisLabels.map((_,i)=>{
        const m = `${annee}-${String(i+1).padStart(2,'0')}`;
        const e = evo.find(x=>x.mois===m)||{c12:0,c24:0,hilio:0};
        const ca = (e.c12||0)*2116.10 + (e.c24||0)*2033.90 + (e.hilio||0)*169.00;
        return Math.round(ca/1000);
      });

      if(refEvo.current) instEvo.current = new Chart(refEvo.current,{
        type:'bar',
        data:{labels:moisLabels,datasets:[
          {label:'CA HT (×1000 FCFA)',data:caParMois,backgroundColor:'rgba(34,211,238,.7)',borderRadius:4,borderColor:'rgba(34,211,238,.9)',borderWidth:1},
        ]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{position:'bottom',labels:{boxWidth:8,padding:8}},tooltip:{callbacks:{label:(ctx)=>`${ctx.raw.toLocaleString('fr-FR')} k FCFA`}}},
          scales:{y:{grid:{color:'rgba(30,58,95,.5)'},ticks:{color:'#475569',callback:v=>v+'k'}},x:{grid:{display:false},ticks:{color:'#475569'}}}}
      });

      const rebLabels=rebuts.length?rebuts.map(r=>r.nom||r.label):['Préformes','Bouchons','Étiquettes','Cartons','Film'];
      const rebData=rebuts.length?rebuts.map(r=>parseFloat(r.quantite||r.total||0)):[0,0,0,0,0];
      if(refReb.current) instReb.current = new Chart(refReb.current,{
        type:'doughnut',
        data:{labels:rebLabels,datasets:[{data:rebData,
          backgroundColor:['rgba(248,113,113,.8)','rgba(251,191,36,.8)','rgba(167,139,250,.8)','rgba(34,211,238,.8)','rgba(52,211,153,.8)'],
          borderColor:'#0a1628',borderWidth:2}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{position:'bottom',labels:{boxWidth:8,padding:6,font:{size:9}}}},cutout:'60%'}
      });
    });
  },[loading,kpis,evo,rebuts]);

  const tresoTotal = treso.reduce((s,c)=>s+parseFloat(c.solde_fcfa||c.solde||0),0);
  const alertes = stocks.filter(s=>s.alerte_stock||s.statut==='low'||s.statut==='out');

  return (
    <div className="fade-up">
      {/* Filtre mois + CA annuel */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:11,color:'var(--text3)'}}>Mois :</span>
          <select className="form-sel" value={mois} onChange={e=>setMois(e.target.value)}>
            {MOIS_LISTE.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12,background:'rgba(34,211,238,.06)',border:'1px solid rgba(34,211,238,.2)',borderRadius:9,padding:'8px 16px',flexWrap:'wrap'}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
            <span style={{fontSize:9,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.5}}>CA HT mensuel</span>
            <span style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--cyan)',fontSize:15}}>{fmt(caMois)}</span>
            <span style={{fontSize:9,color:'var(--text3)'}}>FCFA</span>
          </div>
          <span style={{color:'var(--border2)',fontSize:18}}>|</span>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
            <span style={{fontSize:9,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.5}}>CA HT cumulé {mois.slice(0,4)}</span>
            <span style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--amber)',fontSize:15}}>{fmt(caCumule)}</span>
            <span style={{fontSize:9,color:'var(--text3)'}}>FCFA</span>
          </div>
        </div>
      </div>

      {/* 6 KPIs */}
      <div className="kpi-row">
        {[
          {cls:'cc',lbl:'Cartons C12',  val:fmt(kpis.c12||0),    sub:'cartons',  color:'var(--cyan)',  w:`${Math.min(100,parseFloat(kpis.c12||0)/100)}%`},
          {cls:'cg',lbl:'Cartons C24',  val:fmt(kpis.c24||0),    sub:'cartons',  color:'var(--green)', w:`${Math.min(100,parseFloat(kpis.c24||0)/200)}%`},
          {cls:'cp',lbl:'Packs HILIO',  val:fmt(kpis.hilio||0),  sub:'packs',    color:'var(--purple)',w:`${Math.min(100,parseFloat(kpis.hilio||0)/60)}%`},
          {cls:'ca',lbl:'F06 / 1,5L',  val:fmt(kpis.f615||0),   sub:'fardeaux', color:'var(--amber)', w:`${Math.min(100,parseFloat(kpis.f615||0)/30)}%`},
          {cls:'ct',lbl:'F06 / 0,5L',  val:fmt(kpis.f605||0),   sub:'fardeaux', color:'var(--teal)',  w:`${Math.min(100,parseFloat(kpis.f605||0)/30)}%`},
          {cls:'cr',lbl:'Jours ouvrés', val:kpis.jours_ouvres||'—',sub:'ce mois',color:'var(--red)',  w:`${Math.min(100,parseFloat(kpis.jours_ouvres||0)/26*100)}%`},
        ].map((k,i)=>(
          <div key={i} className={`kpi ${k.cls}`}>
            <div className="kpi-lbl">{k.lbl}</div>
            <div className="kpi-val">{k.val}</div>
            <div className="kpi-sub kn">{k.sub}</div>
            <div className="kbar"><div className="kbar-f" style={{background:k.color,width:k.w}}/></div>
          </div>
        ))}
      </div>

      {/* 2 graphiques */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <div className="card">
          <div className="card-hd"><div className="card-t">Production par format — {MOIS_LISTE.find(m=>m.v===mois)?.l}</div><span className="cbadge bc">Validé</span></div>
          <div style={{position:'relative',height:190}}><canvas ref={refFmt}/></div>
        </div>
        <div className="card">
          <div className="card-hd"><div className="card-t">Évolution</div><span className="cbadge bg">Tendance</span></div>
          <div style={{position:'relative',height:190}}><canvas ref={refEvo}/></div>
        </div>
      </div>

      {/* 3 cartes basses */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
        <div className="card">
          <div className="card-hd">
            <div className="card-t">Alertes stocks</div>
            <span className="cbadge ba">{alertes.length} alerte{alertes.length!==1?'s':''}</span>
          </div>
          <table className="tbl">
            <thead><tr><th>Article</th><th>Solde</th><th>Statut</th></tr></thead>
            <tbody>
              {stocks.filter(s=>s.alerte_stock||s.statut==='out'||s.statut==='low').slice(0,5).map((s,i)=>(
                <tr key={i}>
                  <td>{s.libelle||s.nom}</td>
                  <td style={{fontFamily:'var(--mono)'}}>{fmt(s.stock_actuel||0)}</td>
                  <td>{s.alerte_stock||s.statut==='out'?<span className="st sout">Rupture</span>
                    :<span className="st slow">Faible</span>}</td>
                </tr>
              ))}
              {!alertes.length&&<tr><td colSpan={3} style={{textAlign:'center',color:'var(--text3)',padding:16}}>
                {loading?'Chargement...':'✓ Tous les stocks sont OK'}
              </td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-hd"><div className="card-t">Trésorerie</div><span className="cbadge bg">FCFA</span></div>
          <table className="tbl">
            <thead><tr><th>Compte</th><th style={{textAlign:'right'}}>Solde</th></tr></thead>
            <tbody>
              {treso.filter(c=>{
                const l=(c.libelle||c.nom||'').toLowerCase();
                return l.includes('caisse')||l.includes('boa')||l.includes('bsic')||l.includes('batg');
              }).map((c,i)=>(
                <tr key={i}>
                  <td>{c.libelle||c.nom}</td>
                  <td style={{fontFamily:'var(--mono)',color:'var(--text1)',textAlign:'right'}}>{fmt(c.solde_fcfa||c.solde||0)}</td>
                </tr>
              ))}
              {!treso.length&&<tr><td colSpan={2} style={{textAlign:'center',color:'var(--text3)',padding:16}}>
                {loading?'Chargement...':'Aucun compte'}
              </td></tr>}
            </tbody>
          </table>
          {treso.length>0&&<div className="tot-row"><span className="tot-lbl">TOTAL</span><span className="tot-val">{fmt(tresoTotal)} FCFA</span></div>}
        </div>

        <div className="card">
          <div className="card-hd"><div className="card-t">Rebuts du mois</div><span className="cbadge br">Détail</span></div>
          <div style={{position:'relative',height:165}}><canvas ref={refReb}/></div>
          {!rebuts.length&&!loading&&<div style={{textAlign:'center',color:'var(--text3)',fontSize:11,marginTop:8}}>Aucun rebut enregistré</div>}
        </div>
      </div>
    </div>
  );
}
