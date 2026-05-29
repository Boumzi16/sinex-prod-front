import { useState, useRef } from 'react';
import { importAPI } from '../../services/api';
import toast from 'react-hot-toast';

const DROPS = [
  {id:'production',icon:'🏭',titre:'Import Production',desc:'Fichier mensuel de production journalière\nPDT_MOIS_ANNEE_SINEX_SA.xlsx',badge:'bc',badgeTxt:'C12 · C24 · F06 · HILIO · Rebuts',btnCls:'primary'},
  {id:'tresorerie',icon:'💰',titre:'Import Trésorerie',desc:'Compte de trésorerie du fichier ATP\nFeuille "Compte de trésorerie"',badge:'bg',badgeTxt:'Caisse · BOA · BSIC · BATG',btnCls:'success'},
  {id:'stocks',    icon:'📦',titre:'Import Stocks',    desc:'Compte des stocks du fichier ATP\nFeuille "Compte des stocks"',badge:'ba',badgeTxt:'Préformes · Bouchons · Étiquettes',btnCls:'amber'},
];

function DropCard({config,onDone}){
  const [loading,setLoading]=useState(false);
  const [statut,setStatut]=useState(null);
  const inputRef=useRef();

  const handleFile=async(file)=>{
    if(!file)return;
    if(!file.name.match(/\.(xlsx|xls)$/i)){toast.error('Seuls les fichiers Excel sont acceptés');return;}
    setLoading(true);setStatut(null);
    const fd=new FormData();fd.append('fichier',file);fd.append('type',config.id);
    try{
      const r=await importAPI.excel(fd);const d=r.data;
      setStatut({ok:true,lignes:d.importes||0});
      toast.success(`✓ Import ${config.titre} — ${d.importes||0} lignes importées`);
      onDone?.({type:config.id,fichier:file.name,lignes:d.importes||0});
    }catch(e){
      const msg=e.response?.data?.message||'Erreur import';
      setStatut({ok:false,msg});toast.error(msg);
    }finally{setLoading(false);}
  };

  return(
    <div className="import-card"
      onClick={()=>!loading&&inputRef.current?.click()}
      onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor='var(--cyan)';}}
      onDragLeave={e=>{e.currentTarget.style.borderColor='';}}
      onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor='';handleFile(e.dataTransfer.files[0]);}}>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
      <div className="import-ico">{config.icon}</div>
      <div className="import-title">{config.titre}</div>
      <div className="import-desc">{config.desc.split('\n').map((l,i)=><span key={i}>{l}{i===0&&<br/>}</span>)}</div>
      <div style={{marginBottom:8}}><span className={`cbadge ${config.badge}`}>{config.badgeTxt}</span></div>
      {loading
        ? <div style={{display:'flex',alignItems:'center',gap:8,justifyContent:'center',color:'var(--cyan)',fontSize:11}}><div className="spinner" style={{width:16,height:16}}/>Import en cours...</div>
        : statut
          ? <div style={{fontSize:11,fontWeight:600,color:statut.ok?'var(--green)':'var(--red)'}}>{statut.ok?`✓ ${statut.lignes} lignes importées`:`✗ ${statut.msg}`}</div>
          : <button className={`btn ${config.btnCls}`} style={{margin:'0 auto',pointerEvents:'none'}}>↑ Sélectionner fichier Excel</button>
      }
    </div>
  );
}

export default function ImportPage(){
  const [historique,setHistorique]=useState([
    {date:'16/05/2026',type:'Production',fichier:'PDT_AOUT_25_SINEX.xlsx',lignes:26},
    {date:'16/05/2026',type:'Stocks',fichier:'ATP_01_-26.xlsx',lignes:12},
  ]);

  const onDone=(d)=>{
    setHistorique(h=>[{date:new Date().toLocaleDateString('fr-FR'),type:DROPS.find(x=>x.id===d.type)?.titre||d.type,fichier:d.fichier,lignes:d.lignes},...h]);
  };

  return(
    <div className="fade-up">
      <div className="import-grid">
        {DROPS.map(c=><DropCard key={c.id} config={c} onDone={onDone}/>)}
      </div>
      <div className="card">
        <div className="card-hd"><div className="card-t">Historique des imports</div><span className="cbadge bc">Récents</span></div>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Type</th><th>Fichier</th><th>Lignes importées</th><th>Statut</th></tr></thead>
          <tbody>
            {historique.map((h,i)=>(
              <tr key={i}>
                <td style={{fontFamily:'var(--mono)',fontSize:10}}>{h.date}</td>
                <td>{h.type}</td>
                <td>{h.fichier}</td>
                <td style={{fontFamily:'var(--mono)'}}>{h.lignes}</td>
                <td><span className="st sok">✓ Succès</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
