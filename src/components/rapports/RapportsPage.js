import { useState, useEffect } from 'react';
import { rapportsAPI } from '../../services/api';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const MOIS_LISTE = [
  {v:'all',l:'Tous les mois'},
  {v:'2026-01',l:'Janvier 2026'},{v:'2026-02',l:'Février 2026'},{v:'2026-03',l:'Mars 2026'},
  {v:'2026-04',l:'Avril 2026'},{v:'2026-05',l:'Mai 2026'},{v:'2026-06',l:'Juin 2026'},
  {v:'2026-07',l:'Juillet 2026'},{v:'2026-08',l:'Août 2026'},{v:'2026-09',l:'Septembre 2026'},
  {v:'2026-10',l:'Octobre 2026'},{v:'2026-11',l:'Novembre 2026'},{v:'2026-12',l:'Décembre 2026'},
];

const CARTES = [
  {id:'production', icon:'📊', titre:'Rapport production mensuel',  desc:'Synthèse par format, rebuts, jours ouvrés',   formats:['PDF','Excel']},
  {id:'atp',        icon:'💰', titre:'Rapport financier ATP',        desc:'CA, MB, TMBHT, Répartition, CPF',             formats:['PDF','Excel']},
  {id:'stocks',     icon:'📦', titre:'État des stocks',              desc:'Inventaire, niveaux, alertes par classe',     formats:['PDF','Excel']},
  {id:'tendances',  icon:'📈', titre:'Analyse des tendances',        desc:'Évolution 12 mois glissants',                 formats:['PDF']},
  {id:'rebuts',     icon:'📉', titre:'Rapport des rebuts',           desc:'Pertes par intrant, taux',                    formats:['PDF','Excel']},
];

const TYPES_RAPPORT = CARTES.map(c=>({id:c.id, label:c.titre, icon:c.icon}));
const DEST_DEF = [
  {role:'dg',  label:'Directeur Général',           email:'dg@sinex-sa.tg'},
  {role:'pdg', label:'Président Directeur Général', email:'pdg@ceco.tg'},
  {role:'pca', label:"Président du Conseil d'Admin",email:'pca@sinex-sa.tg'},
];
const JOURS_SEM = [{v:'1',l:'Lundi'},{v:'2',l:'Mardi'},{v:'3',l:'Mercredi'},{v:'4',l:'Jeudi'},{v:'5',l:'Vendredi'},{v:'6',l:'Samedi'},{v:'0',l:'Dimanche'}];
const DEFAULT_CFG = {actif:false,frequence:'mensuel',heure_quotidien:'07:00',jour_semaine:'1',heure_hebdo:'08:00',jour_mois:'28',heure_mensuel:'08:00',fin_de_mois:true,heure_fin_mois:'18:00',types:['production','atp'],destinataires:['dg','pdg','pca'],emails_supplementaires:'',objet_email:'Rapport mensuel SINEX-SA — {mois} {annee}',message_email:'Bonjour,\n\nVeuillez trouver ci-joint le rapport de production SINEX-SA.\n\nCordialement,\nSINEX-SA'};

export default function RapportsPage() {
  const { can } = useAuth();
  const [rapports,   setRapports]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [moisF,      setMoisF]      = useState('all');
  const [modalEmail, setModalEmail] = useState(false);
  const [generating, setGenerating] = useState({});
  const [config,     setConfig]     = useState(() => { try{return JSON.parse(localStorage.getItem('sinex_email_config'))||DEFAULT_CFG;}catch{return DEFAULT_CFG;} });

  const [envoyant, setEnvoyant] = useState(false);

  const chargerConfig = async () => {
    try {
      const r = await api.get('/email/config');
      if (r.data && Object.keys(r.data).length > 0) {
        setConfig(prev => ({...prev, ...r.data,
          destinataires: Array.isArray(r.data.destinataires) ? r.data.destinataires : JSON.parse(r.data.destinataires||'["dg"]'),
          actif: r.data.actif||false,
        }));
      }
    } catch {}
  };

  const sauverConfigEmail = async () => {
    try {
      await api.post('/email/config', config);
      toast.success('Configuration sauvegardée ✓');
      setModalEmail(false);
    } catch(e) { toast.error(e.response?.data?.message||'Erreur'); }
  };

  const testerSMTP = async () => {
    try {
      await api.post('/email/tester', config);
      toast.success('Email de test envoyé ✓ — vérifiez votre boîte mail');
    } catch(e) { toast.error(e.response?.data?.message||'Erreur envoi email'); }
  };

  const envoyerMaintenant = async (type) => {
    setEnvoyant(true);
    try {
      const moisRap = moisF!=='all' ? moisF : new Date().toISOString().slice(0,7);
      const r = await api.post('/email/envoyer', {type_rapport:type, mois:moisRap});
      toast.success(r.data.message);
      charger();
    } catch(e) { toast.error(e.response?.data?.message||'Erreur envoi'); }
    finally { setEnvoyant(false); }
  };

  const charger = async () => {
    setLoading(true);
    try {
      const params = {};
      if (moisF!=='all') params.mois = moisF;
      const r = await rapportsAPI.lister(params);
      const d = r.data;
      setRapports(Array.isArray(d)?d:Array.isArray(d?.data)?d.data:[]);
    } catch { setRapports([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { charger(); chargerConfig(); }, [moisF]); // eslint-disable-line

  // Télécharger depuis historique = regénérer le même rapport
  const telecharger = async (rapport, format) => {
    const key = `dl_${rapport.id}_${format}`;
    setGenerating(g=>({...g,[key]:true}));
    try {
      const r = await api.post('/rapports/generer',
        {type_rapport: rapport.type_rapport, format, mois: rapport.periode_debut},
        {responseType:'blob', timeout:60000}
      );
      const ext = format==='PDF'?'pdf':'xlsx';
      const mime = format==='PDF'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = new Blob([r.data], {type: mime});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SINEX_${rapport.type_rapport}_${rapport.periode_debut}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${format} téléchargé ✓`);
    } catch(e) {
      toast.error(e.response?.data?.message||'Erreur téléchargement');
    } finally { setGenerating(g=>({...g,[key]:false})); }
  };

  // Générer un rapport
  const supprimerRapport = async (id) => {
    if (!window.confirm('Supprimer ce rapport de l\'historique ?')) return;
    try {
      await api.delete(`/rapports/${id}`);
      toast.success('Rapport supprimé ✓');
      charger();
    } catch { toast.error('Erreur suppression'); }
  };

  const viderHistorique = async () => {
    if (!window.confirm('Effacer tout l\'historique des rapports ?')) return;
    try {
      await api.delete('/rapports/historique');
      toast.success('Historique effacé ✓');
      setRapports([]);
    } catch { toast.error('Erreur'); }
  };

  const generer = async (type, format) => {
    const key = `${type}_${format}`;
    setGenerating(g=>({...g,[key]:true}));
    try {
      const moisRap = moisF!=='all' ? moisF : new Date().toISOString().slice(0,7);
      const r = await api.post('/rapports/generer',
        {type_rapport:type, format, mois:moisRap},
        {responseType:'blob', timeout:60000}
      );
      const blob = new Blob([r.data], {
        type: format==='PDF' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SINEX_${type}_${moisRap}.${format==='PDF'?'pdf':'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Rapport ${format} téléchargé ✓`);
      charger();
    } catch(err) {
      if (err.response?.status === 404 || err.response?.status === 501) {
        toast.error('Génération de rapports PDF/Excel en cours de développement');
      } else {
        toast.error('Erreur lors de la génération du rapport');
      }
    } finally { setGenerating(g=>({...g,[key]:false})); }
  };

  const upd = (k,v) => setConfig(c=>({...c,[k]:v}));
  const toggleType = (id) => setConfig(c=>({...c,types:c.types.includes(id)?c.types.filter(t=>t!==id):[...c.types,id]}));
  const toggleDest = (role) => setConfig(c=>({...c,destinataires:c.destinataires.includes(role)?c.destinataires.filter(d=>d!==role):[...c.destinataires,role]}));

  // sauverConfig remplacé par sauverConfigEmail (API réelle)

  const nbDest = config.destinataires.length + (config.emails_supplementaires?config.emails_supplementaires.split(',').filter(e=>e.trim()).length:0);
  const prochainEnvoi = () => {
    if (config.frequence==='quotidien') return `Demain à ${config.heure_quotidien}`;
    if (config.frequence==='hebdomadaire') return `Prochain ${JOURS_SEM.find(j=>j.v===config.jour_semaine)?.l} à ${config.heure_hebdo}`;
    return `Le ${config.jour_mois} du mois à ${config.heure_mensuel}`;
  };

  return (
    <div className="fade-up">
      {/* Filtre mois */}
      <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
        <select className="form-sel" value={moisF} onChange={e=>setMoisF(e.target.value)}>
          {MOIS_LISTE.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
        <button className="btn" onClick={charger}>🔍 Filtrer</button>
      </div>

      {/* Cartes rapports */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
        {CARTES.map(c=>(
          <div key={c.id} className="card" style={{textAlign:'center',transition:'transform .15s'}}
            onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'}
            onMouseOut={e=>e.currentTarget.style.transform='none'}>
            <div style={{fontSize:26,marginBottom:8}}>{c.icon}</div>
            <div style={{fontSize:11,fontWeight:600,marginBottom:4}}>{c.titre}</div>
            <div style={{fontSize:9,color:'var(--text3)',marginBottom:12,lineHeight:1.5}}>{c.desc}</div>
            <div style={{display:'flex',gap:6,justifyContent:'center'}}>
              {c.formats.includes('PDF') && (
                <button className="btn primary" style={{fontSize:9}}
                  disabled={generating[`${c.id}_PDF`]}
                  onClick={()=>generer(c.id,'PDF')}>
                  {generating[`${c.id}_PDF`]?'⏳':'↓'} PDF
                </button>
              )}
              {c.formats.includes('Excel') && (
                <button className="btn" style={{fontSize:9}}
                  disabled={generating[`${c.id}_Excel`]}
                  onClick={()=>generer(c.id,'Excel')}>
                  {generating[`${c.id}_Excel`]?'⏳':'↓'} Excel
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Carte email auto */}
        {can('emailConfig') && (
          <div className="card" style={{textAlign:'center',cursor:'pointer',
            borderColor:config.actif?'rgba(52,211,153,.4)':'var(--border)',
            background:config.actif?'rgba(52,211,153,.04)':'var(--bg2)',
            transition:'transform .15s'}}
            onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'}
            onMouseOut={e=>e.currentTarget.style.transform='none'}
            onClick={()=>setModalEmail(true)}>
            <div style={{fontSize:26,marginBottom:8}}>📧</div>
            <div style={{fontSize:11,fontWeight:600,marginBottom:4}}>Rapport email automatique</div>
            <div style={{fontSize:9,color:'var(--text3)',marginBottom:8,lineHeight:1.5}}>
              {config.actif?`✓ Actif — ${config.frequence} · ${nbDest} destinataire${nbDest>1?'s':''}` : 'Envoi automatique non configuré'}
            </div>
            {config.actif && <div style={{fontSize:9,color:'var(--text3)',marginBottom:6}}>Prochain : {prochainEnvoi()}</div>}
            <div style={{display:'flex',justifyContent:'center'}}>
              <button className={`btn ${config.actif?'success':'primary'}`} style={{fontSize:9,pointerEvents:'none'}}>
                {config.actif?'✓ Configuré':'⚙ Configurer'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Historique */}
      <div className="card">
        <div className="card-hd">
          <div className="card-t">Historique des rapports générés</div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <span className="cbadge bc">{rapports.length}</span>
            {rapports.length>0&&<button className="btn danger" style={{fontSize:9,padding:'3px 10px'}} onClick={viderHistorique}>🗑 Tout effacer</button>}
          </div>
        </div>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Type</th><th>Période</th><th>Généré par</th><th>Télécharger</th></tr></thead>
          <tbody>
            {rapports.map((r,i)=>(
              <tr key={i}>
                <td style={{fontFamily:'var(--mono)',fontSize:10}}>{r.genere_le?new Date(r.genere_le).toLocaleDateString('fr-FR'):'—'}</td>
                <td>{r.type_rapport||r.type||'—'}</td>
                <td style={{color:'var(--text3)'}}>{r.periode_debut||'—'}</td>
                <td style={{color:'var(--text2)'}}>{r.genere_par_nom||'—'}</td>
                <td style={{display:'flex',gap:4}}>
                  <button className="btn danger" style={{fontSize:9,padding:'3px 6px'}} onClick={()=>supprimerRapport(r.id)}>✕</button>
                  <button className="btn primary" style={{fontSize:9,padding:'3px 8px'}}
                    disabled={generating[`dl_${r.id}_PDF`]}
                    onClick={()=>telecharger(r,'PDF')}>
                    {generating[`dl_${r.id}_PDF`]?'⏳':'↓'} PDF
                  </button>
                  <button className="btn" style={{fontSize:9,padding:'3px 8px'}}
                    disabled={generating[`dl_${r.id}_Excel`]}
                    onClick={()=>telecharger(r,'Excel')}>
                    {generating[`dl_${r.id}_Excel`]?'⏳':'↓'} Excel
                  </button>
                </td>
              </tr>
            ))}
            {!rapports.length && (
              <tr><td colSpan={5} style={{textAlign:'center',color:'var(--text3)',padding:32}}>
                {loading?'Chargement...':'Aucun rapport généré — cliquez sur un rapport ci-dessus pour en créer un'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Config Email */}
      {modalEmail && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModalEmail(false)}>
          <div className="modal" style={{width:640,maxHeight:'90vh'}}>
            <div className="modal-title">
              📧 Configuration — Rapport email automatique
              <button className="modal-close" onClick={()=>setModalEmail(false)}>✕</button>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'rgba(52,211,153,.06)',border:'1px solid rgba(52,211,153,.2)',borderRadius:8,marginBottom:14}}>
              <div>
                <div style={{fontSize:12,fontWeight:600}}>Envoi automatique</div>
                <div style={{fontSize:10,color:'var(--text3)'}}>{config.actif?'✓ Activé':'Désactivé'}</div>
              </div>
              <label className="tgl"><input type="checkbox" checked={config.actif} onChange={e=>upd('actif',e.target.checked)}/><span className="tgl-sl"/></label>
            </div>

            <div className="sec-title">Configuration Resend (service email)</div>
            <div style={{background:'rgba(34,211,238,.05)',border:'1px solid rgba(34,211,238,.15)',borderRadius:8,padding:'10px 12px',marginBottom:10,fontSize:10,color:'var(--text3)'}}>
              ℹ️ Utilisez <strong style={{color:'var(--cyan)'}}>Resend</strong> pour l'envoi d'emails. Créez un compte gratuit sur{' '}
              <a href="https://resend.com" target="_blank" rel="noreferrer" style={{color:'var(--cyan)'}}>resend.com</a>{' '}
              et copiez votre clé API ci-dessous.
            </div>
            <div className="form-grp" style={{marginBottom:10}}>
              <label className="form-lbl">Clé API Resend *</label>
              <input type="password" className="form-inp"
                value={config.resend_api_key||''}
                onChange={e=>upd('resend_api_key',e.target.value)}
                placeholder="re_xxxxxxxxxxxxxxxxxxxx"/>
              <div style={{fontSize:9,color:'var(--text3)',marginTop:4}}>
                Dashboard Resend → API Keys → Create API Key
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <button className="btn" style={{fontSize:10}} onClick={testerSMTP}>🔌 Tester l'envoi email</button>
            </div>
            <div className="sec-title">Fréquence</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
              {[['quotidien','📅 Quotidien'],['hebdomadaire','📆 Hebdo'],['mensuel','🗓 Mensuel']].map(([v,l])=>(
                <button key={v} className={`btn${config.frequence===v?' primary':''}`} style={{justifyContent:'center'}} onClick={()=>upd('frequence',v)}>{l}</button>
              ))}
            </div>

            {config.frequence==='mensuel' && (
              <div className="form-row" style={{marginBottom:14}}>
                <div className="form-grp">
                  <label className="form-lbl">Jour du mois</label>
                  <select className="form-sel" value={config.jour_mois} onChange={e=>upd('jour_mois',e.target.value)}>
                    {Array.from({length:28},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}
                    <option value="dernier">Dernier jour</option>
                  </select>
                </div>
                <div className="form-grp">
                  <label className="form-lbl">Heure</label>
                  <input type="time" className="form-inp" value={config.heure_mensuel} onChange={e=>upd('heure_mensuel',e.target.value)}/>
                </div>
              </div>
            )}

            <div className="sec-title">Types de rapports</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:14}}>
              {TYPES_RAPPORT.map(t=>(
                <div key={t.id} onClick={()=>toggleType(t.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,cursor:'pointer',
                  border:`1px solid ${config.types.includes(t.id)?'rgba(34,211,238,.4)':'var(--border)'}`,
                  background:config.types.includes(t.id)?'rgba(34,211,238,.06)':'var(--bg3)'}}>
                  <span>{t.icon}</span>
                  <span style={{fontSize:11,color:config.types.includes(t.id)?'var(--cyan)':'var(--text2)'}}>{t.label}</span>
                  {config.types.includes(t.id)&&<span style={{marginLeft:'auto',color:'var(--cyan)'}}>✓</span>}
                </div>
              ))}
            </div>

            <div className="sec-title">Destinataires</div>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
              {DEST_DEF.map(d=>(
                <div key={d.role} onClick={()=>toggleDest(d.role)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,cursor:'pointer',
                  border:`1px solid ${config.destinataires.includes(d.role)?'rgba(52,211,153,.4)':'var(--border)'}`,
                  background:config.destinataires.includes(d.role)?'rgba(52,211,153,.06)':'var(--bg3)'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:500}}>{d.label}</div>
                    <div style={{fontSize:10,color:'var(--text3)',fontFamily:'var(--mono)'}}>{d.email}</div>
                  </div>
                  {config.destinataires.includes(d.role)&&<span style={{color:'var(--green)'}}>✓</span>}
                </div>
              ))}
              <div className="form-grp">
                <label className="form-lbl">Emails supplémentaires (séparés par virgules)</label>
                <input type="text" className="form-inp" value={config.emails_supplementaires} onChange={e=>upd('emails_supplementaires',e.target.value)} placeholder="email1@ex.com, email2@ex.com"/>
              </div>
            </div>

            <div className="form-grp" style={{marginBottom:10}}>
              <label className="form-lbl">Objet de l'email</label>
              <input type="text" className="form-inp" value={config.objet_email} onChange={e=>upd('objet_email',e.target.value)}/>
            </div>
            <div className="form-grp" style={{marginBottom:16}}>
              <label className="form-lbl">Message</label>
              <textarea className="form-inp" value={config.message_email} onChange={e=>upd('message_email',e.target.value)} rows={4} style={{resize:'vertical'}}/>
            </div>

            <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
              <button className="btn success" style={{fontSize:10}} onClick={()=>envoyerMaintenant('production')}>
                📧 Envoyer maintenant (Production)
              </button>
              <button className="btn" onClick={()=>setModalEmail(false)}>Annuler</button>
              <button className="btn primary" onClick={sauverConfigEmail}>✓ Sauvegarder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
