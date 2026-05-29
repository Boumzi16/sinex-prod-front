import { useState, useRef } from 'react';
import { importAPI } from '../../services/api';
import toast from 'react-hot-toast';

/**
 * Composant drag & drop réutilisable
 * Props:
 *   type        : 'production' | 'stocks' | 'tresorerie'
 *   label       : texte affiché
 *   icon        : emoji
 *   color       : 'cyan' | 'green' | 'amber'
 *   onSuccess   : callback(data) après import réussi
 */
const COLORS = {
  cyan:  { border:'rgba(34,211,238,.4)',  bg:'rgba(34,211,238,.06)',  text:'var(--cyan)',  badge:'bc' },
  green: { border:'rgba(52,211,153,.4)',  bg:'rgba(52,211,153,.06)',  text:'var(--green)', badge:'bg' },
  amber: { border:'rgba(251,191,36,.4)',  bg:'rgba(251,191,36,.06)',  text:'var(--amber)', badge:'ba' },
};

export default function ImportDrop({ type, label, icon, color='cyan', onSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [resultat, setResultat] = useState(null);
  const inputRef = useRef();
  const c = COLORS[color] || COLORS.cyan;

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Seuls les fichiers Excel (.xlsx, .xls) sont acceptés');
      return;
    }
    setLoading(true); setResultat(null);
    const fd = new FormData();
    fd.append('fichier', file);
    fd.append('type', type);
    try {
      const r = await importAPI.excel(fd);
      const d = r.data;
      setResultat({ succes: true, lignes: d.importes || d.lignes || 0, message: d.message });
      toast.success(`✓ ${label} — ${d.importes || 0} lignes importées`);
      onSuccess?.(d);
    } catch (e) {
      const msg = e.response?.data?.message || 'Erreur lors de l\'import';
      setResultat({ succes: false, message: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          border: `2px dashed ${dragging ? c.text : 'var(--border2)'}`,
          borderRadius: 10,
          padding: '14px 16px',
          background: dragging ? c.bg : 'var(--bg3)',
          cursor: 'pointer',
          transition: 'all .2s',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef} type="file" accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: c.text }}>{label}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
            {loading ? 'Import en cours...' : 'Glissez un fichier Excel ici ou cliquez pour sélectionner'}
          </div>
        </div>
        {loading && <div className="spinner" style={{ width: 18, height: 18, flexShrink: 0 }}/>}
        {!loading && resultat && (
          <span className={`st ${resultat.succes ? 'sok' : 'sout'}`} style={{ flexShrink: 0 }}>
            {resultat.succes ? `✓ ${resultat.lignes} lignes` : '✗ Erreur'}
          </span>
        )}
        {!loading && !resultat && (
          <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>↑ Excel</span>
        )}
      </div>
    </div>
  );
}
