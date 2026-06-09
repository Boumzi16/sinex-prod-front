import { useState, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const COLORS = {
  cyan:  { border:'rgba(34,211,238,.3)',  bg:'rgba(34,211,238,.05)',  text:'var(--cyan)'  },
  amber: { border:'rgba(251,191,36,.3)',  bg:'rgba(251,191,36,.05)',  text:'var(--amber)' },
  green: { border:'rgba(52,211,153,.3)',  bg:'rgba(52,211,153,.05)',  text:'var(--green)' },
};

export default function ImportDrop({ type, icon, color='cyan', label, onSuccess }) {
  const [dragging,  setDragging]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [resultat,  setResultat]  = useState(null);
  const inputRef = useRef();
  const col = COLORS[color] || COLORS.cyan;

  const envoyer = async (file) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Fichier Excel requis (.xlsx ou .xls)');
      return;
    }
    setLoading(true);
    setResultat(null);
    try {
      const form = new FormData();
      form.append('fichier', file);
      const r = await api.post(`/import/${type}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      const data = r.data;
      setResultat({ ok: true, message: data.message, importes: data.importes, erreurs: data.erreurs||[] });
      toast.success(data.message || `Import ${type} réussi ✓`);
      if (onSuccess) onSuccess();
    } catch(e) {
      const msg = e.response?.data?.message || e.message || 'Erreur lors de l\'import';
      setResultat({ ok: false, message: msg });
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) envoyer(file);
  };

  return (
    <div>
      <div
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={e=>{e.preventDefault();setDragging(true);}}
        onDragLeave={()=>setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragging?col.text:col.border}`,
          background: dragging?col.bg:'transparent',
          borderRadius: 10, padding: '18px 14px',
          textAlign: 'center', cursor: loading?'wait':'pointer',
          transition: 'all .2s', marginBottom: 8,
        }}>
        <input ref={inputRef} type="file" accept=".xlsx,.xls"
          style={{display:'none'}} onChange={e=>envoyer(e.target.files[0])}/>
        {loading ? (
          <div>
            <div style={{fontSize:22,marginBottom:6}}>⏳</div>
            <div style={{fontSize:11,color:'var(--text3)'}}>Import en cours...</div>
          </div>
        ) : (
          <div>
            <div style={{fontSize:24,marginBottom:6}}>{icon}</div>
            <div style={{fontSize:11,fontWeight:600,color:col.text,marginBottom:4}}>
              Cliquer ou glisser le fichier ici
            </div>
            <div style={{fontSize:9,color:'var(--text3)',lineHeight:1.5}}>{label}</div>
          </div>
        )}
      </div>

      {resultat && (
        <div style={{
          padding:'8px 12px', borderRadius:8, fontSize:10, marginBottom:4,
          background: resultat.ok ? 'rgba(52,211,153,.08)' : 'rgba(239,68,68,.08)',
          border: `1px solid ${resultat.ok ? 'rgba(52,211,153,.25)' : 'rgba(239,68,68,.25)'}`,
          color: resultat.ok ? 'var(--green)' : 'var(--red)',
        }}>
          {resultat.ok ? '✓' : '✗'} {resultat.message}
          {resultat.ok && resultat.importes > 0 && (
            <span style={{marginLeft:8,opacity:.7}}>{resultat.importes} ligne(s)</span>
          )}
          {resultat.erreurs?.length > 0 && (
            <div style={{marginTop:4,color:'var(--amber)',fontSize:9}}>
              ⚠ {resultat.erreurs.length} avertissement(s) : {resultat.erreurs[0]}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
