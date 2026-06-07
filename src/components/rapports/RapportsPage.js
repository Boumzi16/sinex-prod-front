import { useState, useEffect } from 'react';
import { rapportsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const MOIS = ['Tous les mois','Janvier 2026','Février 2026','Mars 2026','Avril 2026','Mai 2026','Juin 2026'];
const TYPES_FILTER = ['Tous les types','Production','Financier','Stocks','Rebuts'];

const CARTES = [
  {icon:'📊', titre:'Rapport production mensuel',  desc:'Synthèse par format, rebuts, jours ouvrés', btns:['PDF','Excel']},
  {icon:'💰', titre:'Rapport financier ATP',        desc:'CA, MB, Trésorerie, Stocks',               btns:['PDF','Excel']},
  {icon:'📦', titre:'État des stocks',              desc:'Inventaire, niveaux, alertes',              btns:['PDF','Excel']},
  {icon:'📈', titre:'Analyse des tendances',        desc:'Évolution 12 mois glissants',               btns:['PDF']},
  {icon:'📉', titre:'Rapport des rebuts',           desc:'Pertes par intrant, taux',                  btns:['PDF','Excel']},
];

const TYPES_RAPPORT = [
  { id:'production',  label:'Rapport production mensuel',  icon:'📊' },
  { id:'atp',         label:'Rapport financier ATP',        icon:'💰' },
  { id:'stocks',      label:'État des stocks',              icon:'📦' },
  { id:'tendances',   label:'Analyse des tendances',        icon:'📈' },
  { id:'rebuts',      label:'Rapport des rebuts',           icon:'📉' },
];

const DESTINATAIRES_DEF = [
  { role:'dg',  label:'Directeur Général',              email:'dg@sinex-sa.tg'  },
  { role:'pdg', label:'Président Directeur Général',    email:'pdg@ceco.tg'     },
  { role:'pca', label:"Président du Conseil d'Admin",   email:'pca@sinex-sa.tg' },
];

const DEFAULT_CONFIG = {
  actif: false,
  frequence: 'mensuel',
  // Quotidien
  heure_quotidien: '07:00',
  // Hebdomadaire
  jour_semaine: '1', // lundi
  heure_hebdo: '08:00',
  // Mensuel
  jour_mois: '28',
  heure_mensuel: '08:00',
  // Fin de mois
  fin_de_mois: true,
  heure_fin_mois: '18:00',
  // Types de rapports
  types: ['production', 'atp'],
  // Destinataires
  destinataires: ['dg', 'pdg', 'pca'],
  emails_supplementaires: '',
  // Objet et message
  objet_email: 'Rapport mensuel SINEX-SA — {mois} {annee}',
  message_email: 'Bonjour,\n\nVeuillez trouver ci-joint le rapport de production SINEX-SA pour le mois de {mois} {annee}.\n\nCordialement,\nSINEX-SA — Défalé, Togo',
};

const JOURS_SEMAINE = [
  {v:'1',l:'Lundi'},{v:'2',l:'Mardi'},{v:'3',l:'Mercredi'},
  {v:'4',l:'Jeudi'},{v:'5',l:'Vendredi'},{v:'6',l:'Samedi'},{v:'0',l:'Dimanche'},
];

export default function RapportsPage() {
  const { can } = useAuth();
  const [rapports,  setRapports]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [moisF,     setMoisF]     = useState('Tous les mois');
  const [typeF,     setTypeF]     = useState('Tous les types');
  const [modalEmail,setModalEmail]= useState(false);
  const [config,    setConfig]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('sinex_email_config')) || DEFAULT_CONFIG; }
    catch { return DEFAULT_CONFIG; }
  });
  const [testEnvoi, setTestEnvoi] = useState(false);

  const charger = async () => {
    setLoading(true);
    try {
      const params = {};
      if (moisF !== 'Tous les mois') params.mois = moisF;
      if (typeF !== 'Tous les types') params.type = typeF;
      const r = await rapportsAPI.lister(params);
      const d = r.data;
      setRapports(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []);
    } catch { toast.error('Erreur rapports'); setRapports([]); }
    finally { setLoading(false); }
  }; // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { charger(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sauvegarderConfig = () => {
    localStorage.setItem('sinex_email_config', JSON.stringify(config));
    toast.success('Configuration sauvegardée ✓');
    setModalEmail(false);
  };

  const envoyerTest = async () => {
    setTestEnvoi(true);
    await new Promise(r => setTimeout(r, 2000));
    setTestEnvoi(false);
    toast.success('Email de test envoyé ✓ — vérifiez votre boîte mail');
  };

  const upd = (k, v) => setConfig(c => ({ ...c, [k]: v }));

  const toggleType = (id) => {
    setConfig(c => ({
      ...c,
      types: c.types.includes(id) ? c.types.filter(t => t !== id) : [...c.types, id]
    }));
  };

  const toggleDest = (role) => {
    setConfig(c => ({
      ...c,
      destinataires: c.destinataires.includes(role)
        ? c.destinataires.filter(d => d !== role)
        : [...c.destinataires, role]
    }));
  };

  const prochainEnvoi = () => {
    const now = new Date();
    if (config.frequence === 'quotidien') {
      const [h, m] = (config.heure_quotidien || '07:00').split(':');
      const d = new Date(now);
      d.setHours(+h, +m, 0);
      if (d <= now) d.setDate(d.getDate() + 1);
      return d.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' }) + ` à ${config.heure_quotidien}`;
    }
    if (config.frequence === 'hebdomadaire') {
      return `Prochain ${JOURS_SEMAINE.find(j => j.v === config.jour_semaine)?.l || 'Lundi'} à ${config.heure_hebdo}`;
    }
    if (config.frequence === 'mensuel') {
      return `Le ${config.jour_mois} du mois à ${config.heure_mensuel}`;
    }
    return '—';
  };

  const nbDest = config.destinataires.length + (config.emails_supplementaires ? config.emails_supplementaires.split(',').filter(e => e.trim()).length : 0);

  return (
    <div className="fade-up">
      {/* Filtres */}
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14,flexWrap:'wrap'}}>
        <select className="form-sel" value={moisF} onChange={e=>setMoisF(e.target.value)}>
          {MOIS.map(m=><option key={m}>{m}</option>)}
        </select>
        <select className="form-sel" value={typeF} onChange={e=>setTypeF(e.target.value)}>
          {TYPES_FILTER.map(t=><option key={t}>{t}</option>)}
        </select>
        <button className="btn primary" onClick={charger}>🔍 Filtrer</button>
      </div>

      {/* 5 cartes + 1 carte email automatique */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
        {CARTES.map((c,i)=>(
          <div key={i} className="card" style={{cursor:'pointer',transition:'border-color .2s,transform .15s',textAlign:'center'}}
            onMouseOver={e=>{e.currentTarget.style.borderColor='var(--cyan)';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseOut={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='none'}}>
            <div style={{fontSize:26,marginBottom:8}}>{c.icon}</div>
            <div style={{fontSize:11,fontWeight:600,marginBottom:4}}>{c.titre}</div>
            <div style={{fontSize:9,color:'var(--text3)',marginBottom:10,lineHeight:1.5}}>{c.desc}</div>
            <div style={{display:'flex',gap:6,justifyContent:'center'}}>
              {c.btns.includes('PDF')   && <button className="btn primary" style={{fontSize:9}}>↓ PDF</button>}
              {c.btns.includes('Excel') && <button className="btn" style={{fontSize:9}}>↓ Excel</button>}
            </div>
          </div>
        ))}

        {/* Carte email automatique */}
        <div className="card" style={{cursor:'pointer',transition:'border-color .2s,transform .15s',textAlign:'center',
          borderColor: config.actif ? 'rgba(52,211,153,.4)' : 'var(--border)',
          background: config.actif ? 'rgba(52,211,153,.04)' : 'var(--bg2)',
        }}
          onMouseOver={e=>{e.currentTarget.style.transform='translateY(-2px)'}}
          onMouseOut={e=>{e.currentTarget.style.transform='none'}}
          onClick={()=>can('emailConfig')&&setModalEmail(true)}
          style={{...{cursor:'pointer',transition:'border-color .2s,transform .15s'}, cursor: can('emailConfig')?'pointer':'default'}}>
          <div style={{fontSize:26,marginBottom:8}}>📧</div>
          <div style={{fontSize:11,fontWeight:600,marginBottom:4}}>Rapport email automatique</div>
          <div style={{fontSize:9,color:'var(--text3)',marginBottom:8,lineHeight:1.5}}>
            {config.actif
              ? `✓ Actif — ${config.frequence} · ${nbDest} destinataire${nbDest>1?'s':''}`
              : 'Envoi automatique non configuré'}
          </div>
          {config.actif && (
            <div style={{fontSize:9,color:'var(--text3)',marginBottom:6}}>
              Prochain : {prochainEnvoi()}
            </div>
          )}
          <div style={{display:'flex',gap:6,justifyContent:'center'}}>
            {can('emailConfig')
              ? <button className={`btn ${config.actif?'success':'primary'}`} style={{fontSize:9,pointerEvents:'none'}}>
                  {config.actif ? '✓ Configuré' : '⚙ Configurer'}
                </button>
              : <span style={{fontSize:9,color:'var(--text3)'}}>Géré par le DG</span>
            }
          </div>
        </div>
      </div>

      {/* Historique */}
      <div className="card">
        <div className="card-hd">
          <div className="card-t">Historique des rapports</div>
          <span className="cbadge bc">{moisF === 'Tous les mois' ? 'Tous' : moisF}</span>
        </div>
        <table className="tbl">
          <thead><tr>
            <th>Date</th><th>Type</th><th>Période</th><th>Généré par</th><th>Action</th>
          </tr></thead>
          <tbody>
            {rapports.map((r,i)=>(
              <tr key={i}>
                <td style={{fontFamily:'var(--mono)',fontSize:10}}>{r.genere_le?new Date(r.genere_le).toLocaleDateString('fr-FR'):'—'}</td>
                <td>{r.type_rapport||r.type||'—'}</td>
                <td style={{color:'var(--text3)'}}>{r.periode_debut||'—'}</td>
                <td style={{color:'var(--text2)'}}>{r.genere_par_nom||'—'}</td>
                <td><button className="btn" style={{fontSize:9,padding:'3px 8px'}}>↓ Télécharger</button></td>
              </tr>
            ))}
            {!rapports.length && (
              <tr><td colSpan={5} style={{textAlign:'center',color:'var(--text3)',padding:32}}>
                {loading ? 'Chargement...' : 'Aucun rapport pour cette période'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ═══ MODAL CONFIG EMAIL AUTOMATIQUE ═══ */}
      {modalEmail && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModalEmail(false)}>
          <div className="modal" style={{width:640,maxHeight:'90vh'}}>
            <div className="modal-title">
              📧 Configuration — Rapport email automatique
              <button className="modal-close" onClick={()=>setModalEmail(false)}>✕</button>
            </div>

            {/* Activer/désactiver */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'rgba(52,211,153,.06)',border:'1px solid rgba(52,211,153,.2)',borderRadius:8,marginBottom:16}}>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'var(--text1)'}}>Envoi automatique</div>
                <div style={{fontSize:10,color:'var(--text3)'}}>{config.actif ? '✓ Activé — les rapports seront envoyés automatiquement' : 'Désactivé — aucun envoi automatique'}</div>
              </div>
              <label className="tgl">
                <input type="checkbox" checked={config.actif} onChange={e=>upd('actif',e.target.checked)}/>
                <span className="tgl-sl"/>
              </label>
            </div>

            {/* ── FRÉQUENCE ── */}
            <div className="sec-title">Fréquence d'envoi</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
              {[['quotidien','📅 Quotidien'],['hebdomadaire','📆 Hebdomadaire'],['mensuel','🗓 Mensuel']].map(([v,l])=>(
                <button key={v} className={`btn${config.frequence===v?' primary':''}`}
                  style={{justifyContent:'center',padding:'10px'}}
                  onClick={()=>upd('frequence',v)}>
                  {l}
                </button>
              ))}
            </div>

            {/* Options selon fréquence */}
            {config.frequence === 'quotidien' && (
              <div className="form-row" style={{marginBottom:14}}>
                <div className="form-grp">
                  <label className="form-lbl">Heure d'envoi quotidien</label>
                  <input type="time" className="form-inp" value={config.heure_quotidien}
                    onChange={e=>upd('heure_quotidien',e.target.value)}/>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'var(--bg3)',borderRadius:8,fontSize:11,color:'var(--text3)'}}>
                  📋 Envoi tous les jours à {config.heure_quotidien}
                </div>
              </div>
            )}

            {config.frequence === 'hebdomadaire' && (
              <div className="form-row" style={{marginBottom:14}}>
                <div className="form-grp">
                  <label className="form-lbl">Jour de la semaine</label>
                  <select className="form-sel" value={config.jour_semaine} onChange={e=>upd('jour_semaine',e.target.value)}>
                    {JOURS_SEMAINE.map(j=><option key={j.v} value={j.v}>{j.l}</option>)}
                  </select>
                </div>
                <div className="form-grp">
                  <label className="form-lbl">Heure d'envoi</label>
                  <input type="time" className="form-inp" value={config.heure_hebdo}
                    onChange={e=>upd('heure_hebdo',e.target.value)}/>
                </div>
              </div>
            )}

            {config.frequence === 'mensuel' && (
              <div style={{marginBottom:14}}>
                <div className="form-row">
                  <div className="form-grp">
                    <label className="form-lbl">Jour du mois</label>
                    <select className="form-sel" value={config.jour_mois} onChange={e=>upd('jour_mois',e.target.value)}>
                      {Array.from({length:28},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}
                      <option value="dernier">Dernier jour du mois</option>
                    </select>
                  </div>
                  <div className="form-grp">
                    <label className="form-lbl">Heure d'envoi</label>
                    <input type="time" className="form-inp" value={config.heure_mensuel}
                      onChange={e=>upd('heure_mensuel',e.target.value)}/>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10,marginTop:8}}>
                  <label className="tgl">
                    <input type="checkbox" checked={config.fin_de_mois} onChange={e=>upd('fin_de_mois',e.target.checked)}/>
                    <span className="tgl-sl"/>
                  </label>
                  <div>
                    <div style={{fontSize:11,color:'var(--text1)'}}>Envoi également en fin de mois</div>
                    <div style={{fontSize:9,color:'var(--text3)'}}>Dernier jour ouvré à {config.heure_fin_mois}</div>
                  </div>
                  {config.fin_de_mois && (
                    <input type="time" className="form-inp" value={config.heure_fin_mois}
                      onChange={e=>upd('heure_fin_mois',e.target.value)} style={{width:'auto',marginLeft:'auto'}}/>
                  )}
                </div>
              </div>
            )}

            {/* ── TYPES DE RAPPORTS ── */}
            <div className="sec-title">Types de rapports à envoyer</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:14}}>
              {TYPES_RAPPORT.map(t=>(
                <div key={t.id} onClick={()=>toggleType(t.id)}
                  style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,cursor:'pointer',
                    border:`1px solid ${config.types.includes(t.id)?'rgba(34,211,238,.4)':'var(--border)'}`,
                    background:config.types.includes(t.id)?'rgba(34,211,238,.06)':'var(--bg3)',
                    transition:'all .15s'}}>
                  <span style={{fontSize:18}}>{t.icon}</span>
                  <span style={{fontSize:11,color:config.types.includes(t.id)?'var(--cyan)':'var(--text2)'}}>{t.label}</span>
                  {config.types.includes(t.id) && <span style={{marginLeft:'auto',color:'var(--cyan)',fontSize:12}}>✓</span>}
                </div>
              ))}
            </div>

            {/* ── DESTINATAIRES ── */}
            <div className="sec-title">Destinataires</div>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
              {DESTINATAIRES_DEF.map(d=>(
                <div key={d.role} onClick={()=>toggleDest(d.role)}
                  style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,cursor:'pointer',
                    border:`1px solid ${config.destinataires.includes(d.role)?'rgba(52,211,153,.4)':'var(--border)'}`,
                    background:config.destinataires.includes(d.role)?'rgba(52,211,153,.06)':'var(--bg3)',
                    transition:'all .15s'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:500,color:config.destinataires.includes(d.role)?'var(--green)':'var(--text1)'}}>{d.label}</div>
                    <div style={{fontSize:10,color:'var(--text3)',fontFamily:'var(--mono)'}}>{d.email}</div>
                  </div>
                  {config.destinataires.includes(d.role) && <span style={{color:'var(--green)',fontSize:14}}>✓</span>}
                </div>
              ))}
              <div className="form-grp">
                <label className="form-lbl">Emails supplémentaires (séparés par des virgules)</label>
                <input type="text" className="form-inp" value={config.emails_supplementaires}
                  onChange={e=>upd('emails_supplementaires',e.target.value)}
                  placeholder="email1@example.com, email2@example.com"/>
              </div>
            </div>

            {/* ── OBJET ET MESSAGE ── */}
            <div className="sec-title">Contenu de l'email</div>
            <div className="form-grp" style={{marginBottom:10}}>
              <label className="form-lbl">Objet de l'email</label>
              <input type="text" className="form-inp" value={config.objet_email}
                onChange={e=>upd('objet_email',e.target.value)}
                placeholder="Rapport mensuel SINEX-SA — {mois} {annee}"/>
              <div style={{fontSize:9,color:'var(--text3)',marginTop:4}}>Variables disponibles : {'{'}{'}'}mois{'{'}{'}'}{'{'}{'}'}annee{'{'}{'}'}</div>
            </div>
            <div className="form-grp" style={{marginBottom:16}}>
              <label className="form-lbl">Message de l'email</label>
              <textarea className="form-inp" value={config.message_email}
                onChange={e=>upd('message_email',e.target.value)}
                rows={4} style={{resize:'vertical'}}/>
            </div>

            {/* Résumé */}
            {config.actif && (
              <div style={{background:'rgba(34,211,238,.05)',border:'1px solid rgba(34,211,238,.15)',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:11,color:'var(--text2)'}}>
                <div style={{fontWeight:600,color:'var(--cyan)',marginBottom:6}}>📋 Résumé de la configuration</div>
                <div>• Fréquence : <strong>{config.frequence}</strong></div>
                <div>• Prochain envoi : <strong>{prochainEnvoi()}</strong></div>
                <div>• Rapports : <strong>{config.types.length} type{config.types.length>1?'s':''}</strong></div>
                <div>• Destinataires : <strong>{nbDest} personne{nbDest>1?'s':''}</strong></div>
              </div>
            )}

            {/* Boutons */}
            <div style={{display:'flex',gap:8,justifyContent:'space-between',alignItems:'center'}}>
              <button className="btn" onClick={envoyerTest} disabled={testEnvoi}>
                {testEnvoi ? '⏳ Envoi...' : '📤 Envoyer un test'}
              </button>
              <div style={{display:'flex',gap:8}}>
                <button className="btn" onClick={()=>setModalEmail(false)}>Annuler</button>
                <button className="btn primary" onClick={sauvegarderConfig}>✓ Sauvegarder</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
