import { useState, useEffect, useRef } from 'react';
import { dashboardAPI, stocksAPI, tresorerieAPI } from '../../services/api';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(parseFloat(n)||0));
const mois = () => new Date().toISOString().slice(0,7);

export default function DashboardPage() {
  const [kpis,   setKpis]   = useState({});
  const [stocks, setStocks] = useState([]);
  const [treso,  setTreso]  = useState([]);
  const [evo,    setEvo]    = useState([]);
  const [fmts,   setFmts]   = useState([]);
  const [rebuts, setRebuts] = useState([]);
  const [loading,setLoading]= useState(true);

  const refFmt = useRef(); const refEvo = useRef(); const refReb = useRef();
  const instFmt= useRef(); const instEvo= useRef(); const instReb= useRef();

  const charger = async () => {
    setLoading(true);
    try {
      const [dRes, sRes, tRes] = await Promise.allSettled([
        dashboardAPI.consolide(mois()),
        stocksAPI.alertes(),
        tresorerieAPI.soldes(),
      ]);
      if (dRes.status==='fulfilled') {
        const d = dRes.value.data;
        const kdata = d?.kpis || d?.data?.kpis || {};
        setKpis(kdata);
        setEvo(d?.evolution || d?.data?.evolution || []);
        setFmts(d?.formats  || d?.data?.formats  || []);
        setRebuts(d?.rebuts || d?.data?.rebuts   || []);
      }
      if (sRes.status==='fulfilled') {
        const d = sRes.value.data;
        setStocks(Array.isArray(d)?d:Array.isArray(d?.data)?d.data:[]);
      }
      if (tRes.status==='fulfilled') {
        const d = tRes.value.data;
        const c = Array.isArray(d)?d:Array.isArray(d?.comptes)?d.comptes:Array.isArray(d?.data)?d.data:[];
        setTreso(c);
      }
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ charger(); },[]);

  useEffect(()=>{
    if(loading) return;
    import('chart.js/auto').then(({default:Chart})=>{
      Chart.defaults.color='#64748b';
      Chart.defaults.borderColor='#1e3a5f';
      Chart.defaults.font.family="'Sora',sans-serif";
      Chart.defaults.font.size=10;

      if(instFmt.current) instFmt.current.destroy();
      if(instEvo.current) instEvo.current.destroy();
      if(instReb.current) instReb.current.destroy();

      const fmtLabels = fmts.length ? fmts.map(f=>f.code||f.label) : ['C12','C24','F06/1,5L','F06/0,5L','F08/1L','HILIO'];
      const fmtUnits  = ['cartons','cartons','fardeaux','fardeaux','fardeaux','packs'];
      const fmtData   = fmts.length ? fmts.map(f=>f.total||f.quantite||0) : [0,0,0,0,0,0];

      if(refFmt.current) instFmt.current = new Chart(refFmt.current,{
        type:'bar',
        data:{ labels:fmtLabels, datasets:[{ label:'Production', data:fmtData,
          backgroundColor:['rgba(34,211,238,.7)','rgba(52,211,153,.7)','rgba(251,191,36,.7)','rgba(45,212,191,.7)','rgba(56,189,248,.7)','rgba(167,139,250,.7)'],
          borderRadius:4 }]},
        options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{display:false}, tooltip:{callbacks:{label:c=>` ${fmt(c.raw)} ${fmtUnits[c.dataIndex]||''}`}} },
          scales:{ x:{grid:{color:'rgba(30,58,95,.5)'},ticks:{color:'#475569'},beginAtZero:true}, y:{grid:{display:false},ticks:{color:'#94a3b8'}} }
        }
      });

      const evoLabels = evo.length ? evo.map(e=>e.mois||e.label) : ['Déc','Jan','Fév','Mar','Avr','Mai'];
      if(refEvo.current) instEvo.current = new Chart(refEvo.current,{
        type:'line',
        data:{ labels:evoLabels, datasets:[
          {label:'C12',  data:evo.length?evo.map(e=>e.c12||0):[0,0,0,0,0,0],  borderColor:'rgba(34,211,238,.9)',  backgroundColor:'rgba(34,211,238,.05)',  fill:true,tension:.4,pointRadius:3,borderWidth:2},
          {label:'C24',  data:evo.length?evo.map(e=>e.c24||0):[0,0,0,0,0,0],  borderColor:'rgba(52,211,153,.9)',  backgroundColor:'rgba(52,211,153,.05)',  fill:true,tension:.4,pointRadius:3,borderWidth:2},
          {label:'HILIO',data:evo.length?evo.map(e=>e.hilio||0):[0,0,0,0,0,0],borderColor:'rgba(167,139,250,.9)',backgroundColor:'rgba(167,139,250,.05)',fill:true,tension:.4,pointRadius:3,borderWidth:2},
        ]},
        options:{ responsive:true, maintainAspectRatio:false,
          plugins:{legend:{position:'bottom',labels:{boxWidth:8,padding:8}}},
          scales:{y:{grid:{color:'rgba(30,58,95,.5)'},ticks:{color:'#475569'}},x:{grid:{display:false},ticks:{color:'#475569'}}}
        }
      });

      const rebLabels = rebuts.length ? rebuts.map(r=>r.nom||r.label) : ['Préformes','Bouchons','Étiquettes','Cartons','Film'];
      const rebData   = rebuts.length ? rebuts.map(r=>r.quantite||r.total||0) : [0,0,0,0,0];
      if(refReb.current) instReb.current = new Chart(refReb.current,{
        type:'doughnut',
        data:{ labels:rebLabels, datasets:[{ data:rebData,
          backgroundColor:['rgba(248,113,113,.8)','rgba(251,191,36,.8)','rgba(167,139,250,.8)','rgba(34,211,238,.8)','rgba(52,211,153,.8)'],
          borderColor:'#0a1628', borderWidth:2 }]},
        options:{ responsive:true, maintainAspectRatio:false,
          plugins:{legend:{position:'bottom',labels:{boxWidth:8,padding:6,font:{size:9}}}}, cutout:'60%'
        }
      });
    });
  },[loading,fmts,evo,rebuts]);

  const tresoTotal = treso.reduce((s,c)=>s+parseFloat(c.solde_fcfa||c.solde||0),0);
  const alertes    = stocks.filter(s=>s.alerte_stock||s.statut==='low'||s.statut==='out');

  return (
    <div className="fade-up">
      {/* 6 KPIs */}
      <div className="kpi-row">
        {[
          {cls:'cc',lbl:'Cartons C12',  val:fmt(kpis.c12||kpis.total_c12||0),    sub:'Cartons',  color:'var(--cyan)',  w:'62%'},
          {cls:'cg',lbl:'Cartons C24',  val:fmt(kpis.c24||kpis.total_c24||0),    sub:'Cartons',  color:'var(--green)', w:'69%'},
          {cls:'cp',lbl:'Packs HILIO',  val:fmt(kpis.hilio||kpis.total_hilio||0),sub:'Sachets',  color:'var(--purple)',w:'38%'},
          {cls:'ca',lbl:'F06 / 1,5L',  val:fmt(kpis.f615||kpis.total_f615||0),  sub:'Fardeaux', color:'var(--amber)', w:'44%'},
          {cls:'ct',lbl:'F06 / 0,5L',  val:fmt(kpis.f605||kpis.total_f605||0),  sub:'Fardeaux', color:'var(--teal)',  w:'35%'},
          {cls:'cr',lbl:'Jours ouvrés', val:kpis.jours_ouvres||kpis.jours||'—',  sub:'Ce mois',  color:'var(--red)',   w:'71%'},
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
          <div className="card-hd"><div className="card-t">Production par format — mois en cours</div><span className="cbadge bc">Cartons</span></div>
          <div style={{position:'relative',height:190}}><canvas ref={refFmt}/></div>
        </div>
        <div className="card">
          <div className="card-hd"><div className="card-t">Évolution 6 mois</div><span className="cbadge bg">Tendance</span></div>
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
              {stocks.slice(0,5).map((s,i)=>(
                <tr key={i}>
                  <td>{s.libelle||s.nom}</td>
                  <td style={{fontFamily:'var(--mono)'}}>{fmt(s.stock_actuel||s.solde||0)}</td>
                  <td>{s.alerte_stock||s.statut==='out' ? <span className="st sout">Rupture</span>
                    : s.statut==='low' ? <span className="st slow">Faible</span>
                    : <span className="st sok">OK</span>}</td>
                </tr>
              ))}
              {!stocks.length && <tr><td colSpan={3} style={{textAlign:'center',color:'var(--text3)',padding:16}}>
                {loading?'Chargement...':'Tous les stocks sont OK'}
              </td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-hd"><div className="card-t">Trésorerie</div><span className="cbadge bg">FCFA</span></div>
          <table className="tbl">
            <thead><tr><th>Compte</th><th>Solde</th></tr></thead>
            <tbody>
              {treso.map((c,i)=>(
                <tr key={i}>
                  <td>{c.libelle||c.nom}</td>
                  <td style={{fontFamily:'var(--mono)',color:'var(--text1)'}}>{fmt(c.solde_fcfa||c.solde||0)}</td>
                </tr>
              ))}
              {!treso.length && <tr><td colSpan={2} style={{textAlign:'center',color:'var(--text3)',padding:16}}>
                {loading?'Chargement...':'Aucun compte'}
              </td></tr>}
            </tbody>
          </table>
          {treso.length>0 && <div className="tot-row"><span className="tot-lbl">TOTAL</span><span className="tot-val">{fmt(tresoTotal)} FCFA</span></div>}
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
