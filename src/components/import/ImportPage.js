import { useState, useEffect } from 'react';
import api from '../../services/api';
import ImportDrop from './ImportDrop';
import toast from 'react-hot-toast';

const fmtDate = (d) => { try{return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch{return'—';} };

export default function ImportPage() {
  const [historique, setHistorique] = useState([]);
  const [loading,    setLoading]    = useState(true);

  const charger = async () => {
    setLoading(true);
    try {
      const r = await api.get('/import/historique');
      const d = r.data;
      setHistorique(Array.isArray(d)?d:Array.isArray(d?.data)?d.data:[]);
    } catch {
      setHistorique([]); // Pas d'erreur affichée — historique vide si pas de données
    } finally { setLoading(false); }
  };

  useEffect(() => { charger(); }, []);

  return (
    <div className="fade-up">
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:14}}>
        <ImportDrop type="production" icon="🏭" color="cyan"
          label="Import Production — PDT_MOIS_ANNEE_SINEX_SA.xlsx"
          onSuccess={()=>charger()}/>
        <ImportDrop type="stocks" icon="📦" color="amber"
          label="Import Stocks — STK_MOIS_ANNEE_SINEX_SA.xlsx"
          onSuccess={()=>charger()}/>
        <ImportDrop type="tresorerie" icon="💰" color="green"
          label="Import Trésorerie — TRES_MOIS_ANNEE_SINEX_SA.xlsx"
          onSuccess={()=>charger()}/>
      </div>

      {/* Historique réel depuis la base */}
      <div className="card">
        <div className="card-hd">
          <div className="card-t">Historique des importations</div>
          <span className="cbadge bc">{historique.length} import{historique.length!==1?'s':''}</span>
        </div>
        <table className="tbl">
          <thead><tr>
            <th>Date</th><th>Type</th><th>Fichier</th><th>Lignes importées</th><th>Statut</th><th>Par</th>
          </tr></thead>
          <tbody>
            {historique.map((h,i)=>(
              <tr key={i}>
                <td style={{fontFamily:'var(--mono)',fontSize:10,whiteSpace:'nowrap'}}>{fmtDate(h.date_import||h.created_at)}</td>
                <td><span className="cbadge bc" style={{fontSize:9}}>{h.type_import||h.type||'—'}</span></td>
                <td style={{color:'var(--text2)',fontSize:11}}>{h.nom_fichier||h.fichier||'—'}</td>
                <td style={{fontFamily:'var(--mono)'}}>{h.lignes_importees||h.lignes||0}</td>
                <td>{h.statut==='success'||h.statut==='succes'
                  ?<span className="st sok">✓ Succès</span>
                  :h.statut==='erreur'||h.statut==='error'
                    ?<span className="st sout">✗ Erreur</span>
                    :<span className="st spend">En cours</span>}
                </td>
                <td style={{color:'var(--text3)',fontSize:10}}>{h.importe_par_nom||h.importe_par||'—'}</td>
              </tr>
            ))}
            {!historique.length && (
              <tr><td colSpan={6} style={{textAlign:'center',color:'var(--text3)',padding:32}}>
                {loading?'Chargement...':'Aucun historique d\'importation'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
