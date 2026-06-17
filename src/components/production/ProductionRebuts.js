// Composant rebuts — étiquettes C12 (1,5L) et C24 (0,5L) distinctes — sans étiquettes 1L
import React from 'react';

const fmt = n => new Intl.NumberFormat('fr-FR').format(Math.round(parseFloat(n)||0));

// Colonnes rebuts — sans étiquettes 1L, avec distinction C12/C24
export const REBUTS_COLS = [
  { key:'pref32',     label:'Préf. 32g',        color:'var(--amber)' },
  { key:'pref17',     label:'Préf. 17g',        color:'var(--amber)' },
  { key:'bouchons',   label:'Bouchons',          color:'var(--amber)' },
  { key:'ctn_c12',    label:'Ctn C12',           color:'var(--amber)' },
  { key:'ctn_c24',    label:'Ctn C24',           color:'var(--amber)' },
  { key:'hilio',      label:'Sachets HILIO',     color:'var(--green)' },
  { key:'etiq_c12',   label:'Étiq C12 (1,5L)',  color:'#3B82F6'      },
  { key:'etiq_c24',   label:'Étiq C24 (0,5L)',  color:'#8B5CF6'      },
];

// Total rebuts — sans étiquettes 1L
export const totalRebuts = (r) =>
  (r?.pref32||0)+(r?.pref17||0)+(r?.bouchons||0)+
  (r?.ctn_c12||0)+(r?.ctn_c24||0)+(r?.hilio||0)+
  (r?.etiq_c12||0)+(r?.etiq_c24||0);

// Tableau rebuts journalier
export function TableauRebuts({ saisies = [] }) {
  const totaux = REBUTS_COLS.reduce((acc,col)=>{
    acc[col.key] = saisies.reduce((s,r)=>s+(r.rebuts?.[col.key]||0),0);
    return acc;
  },{});

  return (
    <table className="tbl" style={{minWidth:900}}>
      <thead>
        <tr>
          <th>Date</th>
          {REBUTS_COLS.map(c=>(
            <th key={c.key} style={{textAlign:'right',color:c.color,whiteSpace:'nowrap'}}>{c.label}</th>
          ))}
          <th style={{textAlign:'right',color:'var(--red)'}}>Total</th>
        </tr>
      </thead>
      <tbody>
        {saisies.map((s,i)=>{
          const rb = s.rebuts || {};
          const total = totalRebuts(rb);
          return (
            <tr key={i} style={{background:i%2===0?'var(--bg2)':undefined}}>
              <td style={{fontFamily:'var(--mono)',whiteSpace:'nowrap'}}>
                {new Date(s.date_production).toLocaleDateString('fr-FR')}
              </td>
              {REBUTS_COLS.map(c=>(
                <td key={c.key} style={{textAlign:'right',fontFamily:'var(--mono)',
                    color:(rb[c.key]||0)>0?c.color:'var(--text3)'}}>
                  {(rb[c.key]||0)>0?fmt(rb[c.key]):'—'}
                </td>
              ))}
              <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,
                  color:total>0?'var(--red)':'var(--text3)'}}>
                {total>0?fmt(total):'—'}
              </td>
            </tr>
          );
        })}
        {/* Ligne totaux */}
        {saisies.length>0 && (
          <tr style={{background:'var(--bg0)'}}>
            <td style={{fontWeight:700,color:'var(--cyan)'}}>TOTAUX</td>
            {REBUTS_COLS.map(c=>(
              <td key={c.key} style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:700,
                  color:totaux[c.key]>0?c.color:'var(--text3)'}}>
                {totaux[c.key]>0?fmt(totaux[c.key]):'—'}
              </td>
            ))}
            <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:700,color:'var(--red)'}}>
              {fmt(Object.values(totaux).reduce((a,v)=>a+v,0))}
            </td>
          </tr>
        )}
        {!saisies.length && (
          <tr><td colSpan={REBUTS_COLS.length+2} style={{textAlign:'center',color:'var(--text3)',padding:32}}>
            Aucune donnée de rebuts ce mois
          </td></tr>
        )}
      </tbody>
    </table>
  );
}

// Badge résumé rebuts pour une ligne
export function BadgeRebuts({ rebuts }) {
  if (!rebuts) return null;
  const total = totalRebuts(rebuts);
  if (!total) return <span style={{color:'var(--text3)',fontSize:10}}>—</span>;
  return (
    <div style={{display:'flex',gap:4,flexWrap:'wrap',fontSize:9}}>
      {REBUTS_COLS.map(c=>(rebuts[c.key]||0)>0&&(
        <span key={c.key} style={{
          background:`${c.color}18`,color:c.color,
          border:`1px solid ${c.color}40`,
          borderRadius:6,padding:'1px 5px',
          fontFamily:'var(--mono)',whiteSpace:'nowrap'
        }}>
          {c.label}: {fmt(rebuts[c.key])}
        </span>
      ))}
    </div>
  );
}

// Formulaire de saisie des rebuts (dans le modal production)
export function FormRebuts({ values, onChange }) {
  const handleChange = (key, val) => {
    onChange({...values, [key]: Math.max(0, parseInt(val)||0)});
  };

  return (
    <div>
      <div style={{fontSize:12,fontWeight:600,color:'var(--amber)',marginBottom:10,
          borderBottom:'1px solid var(--border)',paddingBottom:6}}>
        Rebuts par intrant (saisir 0 si aucun)
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        {REBUTS_COLS.map(col=>(
          <div key={col.key} className="form-grp">
            <label className="form-lbl" style={{color:col.color}}>{col.label}</label>
            <input
              type="number" min={0} className="form-inp"
              value={values[col.key]||0}
              onChange={e=>handleChange(col.key, e.target.value)}
              style={{fontFamily:'var(--mono)',color:col.color}}
            />
          </div>
        ))}
      </div>
      <div style={{marginTop:10,fontSize:11,color:'var(--text3)',
          background:'rgba(220,38,38,.05)',borderRadius:7,padding:'6px 10px'}}>
        Total rebuts : <strong style={{color:'var(--red)',fontFamily:'var(--mono)'}}>
          {fmt(totalRebuts(values))}
        </strong>
      </div>
    </div>
  );
}

export default { TableauRebuts, BadgeRebuts, FormRebuts, REBUTS_COLS, totalRebuts };
