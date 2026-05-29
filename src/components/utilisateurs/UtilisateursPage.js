import { useState, useEffect } from 'react';
import api from '../../services/api';
import { ROLE_LABELS } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const fmt = (d) => { try{ return new Date(d).toLocaleDateString('fr-FR'); }catch{ return '—'; } };

const ROLES = [
  { value:'directeur_general', label:'Directeur Général'           },
  { value:'operateur',         label:'Opérateur de Production'     },
  { value:'pdg',               label:'Président Directeur Général' },
  { value:'pca',               label:'Président du Conseil Admin'  },
  { value:'conseil_admin',     label:"Membre Conseil d'Admin"      },
];

const ROLE_COLORS = {
  directeur_general:'bc', operateur:'bg', pdg:'bp', pca:'ba', conseil_admin:'br',
};

const VIDE = { nom_complet:'', email:'', role:'operateur', mot_de_passe:'', confirm_mdp:'' };

export default function UtilisateursPage() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);  // 'create' | 'edit' | 'mdp' | false
  const [sel,     setSel]     = useState(null);   // utilisateur sélectionné
  const [form,    setForm]    = useState(VIDE);
  const [showMdp, setShowMdp] = useState(false);
  const [search,  setSearch]  = useState('');

  const charger = async () => {
    setLoading(true);
    try {
      const r = await api.get('/utilisateurs');
      const d = r.data;
      setUsers(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []);
    } catch { toast.error('Erreur chargement utilisateurs'); setUsers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { charger(); }, []);

  const openCreate = () => {
    setForm(VIDE); setSel(null); setModal('create'); setShowMdp(false);
  };

  const openEdit = (u) => {
    setForm({ nom_complet:u.nom_complet||'', email:u.email||'', role:u.nom_role||u.role||'operateur', mot_de_passe:'', confirm_mdp:'' });
    setSel(u); setModal('edit'); setShowMdp(false);
  };

  const openMdp = (u) => {
    setForm({ ...VIDE, mot_de_passe:'', confirm_mdp:'' });
    setSel(u); setModal('mdp'); setShowMdp(false);
  };

  const creer = async () => {
    if (!form.nom_complet || !form.email || !form.mot_de_passe) { toast.error('Renseignez tous les champs obligatoires'); return; }
    if (form.mot_de_passe !== form.confirm_mdp) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (form.mot_de_passe.length < 8) { toast.error('Le mot de passe doit faire au moins 8 caractères'); return; }
    try {
      await api.post('/utilisateurs', { nom_complet:form.nom_complet, email:form.email, nom_role:form.role, mot_de_passe:form.mot_de_passe });
      toast.success('Utilisateur créé ✓');
      setModal(false); charger();
    } catch(e) { toast.error(e.response?.data?.message || 'Erreur création'); }
  };

  const modifier = async () => {
    if (!form.nom_complet || !form.email) { toast.error('Renseignez tous les champs'); return; }
    try {
      await api.put(`/utilisateurs/${sel.id}`, { nom_complet:form.nom_complet, email:form.email, nom_role:form.role });
      toast.success('Utilisateur modifié ✓');
      setModal(false); charger();
    } catch(e) { toast.error(e.response?.data?.message || 'Erreur modification'); }
  };

  const changerMdp = async () => {
    if (!form.mot_de_passe) { toast.error('Renseignez le nouveau mot de passe'); return; }
    if (form.mot_de_passe !== form.confirm_mdp) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (form.mot_de_passe.length < 8) { toast.error('Minimum 8 caractères'); return; }
    try {
      await api.put(`/utilisateurs/${sel.id}/mot-de-passe`, { mot_de_passe:form.mot_de_passe });
      toast.success('Mot de passe modifié ✓');
      setModal(false);
    } catch(e) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const supprimer = async (u) => {
    if (!window.confirm(`Supprimer l'utilisateur "${u.nom_complet}" ?`)) return;
    try {
      await api.delete(`/utilisateurs/${u.id}`);
      toast.success('Utilisateur supprimé');
      charger();
    } catch(e) { toast.error(e.response?.data?.message || 'Erreur suppression'); }
  };

  const toggleActif = async (u) => {
    try {
      await api.put(`/utilisateurs/${u.id}`, { actif: !u.actif });
      toast.success(u.actif ? 'Compte désactivé' : 'Compte activé');
      charger();
    } catch { toast.error('Erreur'); }
  };

  const filtered = users.filter(u =>
    !search ||
    u.nom_complet?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const inp = (k) => ({
    className: 'form-inp',
    value: form[k] || '',
    onChange: e => setForm(f => ({...f, [k]: e.target.value})),
  });

  return (
    <div className="fade-up">
      {/* En-tête */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:18}}>
        <div>
          <h1 className="page-title">Gestion des utilisateurs</h1>
          <p className="page-subtitle">Créer, modifier et gérer les accès — Réservé au Directeur Général</p>
        </div>
        <button className="btn primary" onClick={openCreate}>+ Nouvel utilisateur</button>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:9,marginBottom:14}}>
        {ROLES.map(r => {
          const count = users.filter(u => (u.nom_role||u.role) === r.value).length;
          return (
            <div key={r.value} className={`kpi cc`} style={{borderTop:`2px solid var(--cyan)`}}>
              <div className="kpi-lbl">{r.label}</div>
              <div className="kpi-val" style={{fontSize:24}}>{count}</div>
              <div className="kpi-sub kn">utilisateur{count!==1?'s':''}</div>
            </div>
          );
        })}
      </div>

      {/* Filtres */}
      <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 11px'}}>
          <span style={{color:'var(--text3)'}}>🔍</span>
          <input type="text" placeholder="Rechercher nom ou email..."
            value={search} onChange={e=>setSearch(e.target.value)}
            style={{background:'none',border:'none',outline:'none',color:'var(--text1)',fontFamily:'var(--font)',fontSize:11,width:200}}/>
        </div>
        <span style={{marginLeft:'auto',fontSize:11,color:'var(--text3)'}}>{filtered.length} utilisateur{filtered.length!==1?'s':''}</span>
      </div>

      {/* Tableau */}
      <div className="card" style={{overflowX:'auto'}}>
        <table className="tbl">
          <thead><tr>
            <th>Nom complet</th><th>Email</th><th>Rôle</th>
            <th>Statut</th><th>Créé le</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map((u,i) => (
              <tr key={i}>
                <td style={{fontWeight:500,color:'var(--text1)'}}>{u.nom_complet}</td>
                <td style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text3)'}}>{u.email}</td>
                <td>
                  <span className={`cbadge ${ROLE_COLORS[u.nom_role||u.role]||'bc'}`}>
                    {ROLE_LABELS[u.nom_role||u.role] || u.nom_role || u.role || '—'}
                  </span>
                </td>
                <td>
                  {u.actif !== false
                    ? <span className="st sok">● Actif</span>
                    : <span className="st sout">● Inactif</span>
                  }
                </td>
                <td style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text3)'}}>{fmt(u.created_at||u.cree_le)}</td>
                <td>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                    <button className="btn" style={{fontSize:9,padding:'3px 8px'}} onClick={()=>openEdit(u)}>✏ Modifier</button>
                    <button className="btn" style={{fontSize:9,padding:'3px 8px'}} onClick={()=>openMdp(u)}>🔑 MDP</button>
                    <button className={`btn ${u.actif!==false?'amber':'success'}`} style={{fontSize:9,padding:'3px 8px'}} onClick={()=>toggleActif(u)}>
                      {u.actif!==false?'⏸ Désactiver':'▶ Activer'}
                    </button>
                    <button className="btn danger" style={{fontSize:9,padding:'3px 8px'}} onClick={()=>supprimer(u)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={6} style={{textAlign:'center',color:'var(--text3)',padding:32}}>
                {loading ? 'Chargement...' : 'Aucun utilisateur'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── MODAL CRÉER / MODIFIER ── */}
      {(modal==='create'||modal==='edit') && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-title">
              {modal==='create'?'+ Nouvel utilisateur':'✏ Modifier l\'utilisateur'}
              <button className="modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>

            <div className="form-row">
              <div className="form-grp">
                <label className="form-lbl">Nom complet *</label>
                <input {...inp('nom_complet')} placeholder="Prénom NOM"/>
              </div>
              <div className="form-grp">
                <label className="form-lbl">Email *</label>
                <input type="email" {...inp('email')} placeholder="prenom@sinex-sa.tg"/>
              </div>
            </div>

            <div className="form-grp" style={{marginBottom:14}}>
              <label className="form-lbl">Rôle *</label>
              <select className="form-sel" style={{width:'100%'}} value={form.role}
                onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                {ROLES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {modal==='create' && (
              <>
                <div className="sec-title">Mot de passe initial</div>
                <div className="form-row">
                  <div className="form-grp">
                    <label className="form-lbl">Mot de passe *</label>
                    <div style={{position:'relative'}}>
                      <input type={showMdp?'text':'password'} {...inp('mot_de_passe')} placeholder="Min. 8 caractères" style={{paddingRight:40}}/>
                      <button type="button" onClick={()=>setShowMdp(s=>!s)}
                        style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:13}}>
                        {showMdp?'🙈':'👁'}
                      </button>
                    </div>
                  </div>
                  <div className="form-grp">
                    <label className="form-lbl">Confirmer *</label>
                    <input type={showMdp?'text':'password'} {...inp('confirm_mdp')} placeholder="Répéter le mot de passe"/>
                  </div>
                </div>
              </>
            )}

            <div style={{background:'rgba(34,211,238,.05)',border:'1px solid rgba(34,211,238,.15)',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:11,color:'var(--text2)'}}>
              💡 L'utilisateur se connectera avec cet email et ce mot de passe sur l'application.
            </div>

            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn" onClick={()=>setModal(false)}>Annuler</button>
              <button className="btn primary" onClick={modal==='create'?creer:modifier}>
                {modal==='create'?'✓ Créer l\'utilisateur':'✓ Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CHANGER MOT DE PASSE ── */}
      {modal==='mdp' && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{width:420}}>
            <div className="modal-title">
              🔑 Changer le mot de passe
              <button className="modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>

            <div style={{background:'rgba(167,139,250,.08)',border:'1px solid rgba(167,139,250,.2)',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:12,color:'var(--purple)'}}>
              Utilisateur : <strong>{sel?.nom_complet}</strong>
            </div>

            <div className="form-grp" style={{marginBottom:12}}>
              <label className="form-lbl">Nouveau mot de passe *</label>
              <div style={{position:'relative'}}>
                <input type={showMdp?'text':'password'} {...inp('mot_de_passe')}
                  placeholder="Min. 8 caractères" style={{paddingRight:40}}/>
                <button type="button" onClick={()=>setShowMdp(s=>!s)}
                  style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:13}}>
                  {showMdp?'🙈':'👁'}
                </button>
              </div>
            </div>

            <div className="form-grp" style={{marginBottom:16}}>
              <label className="form-lbl">Confirmer *</label>
              <input type={showMdp?'text':'password'} {...inp('confirm_mdp')} placeholder="Répéter le mot de passe"/>
            </div>

            {form.mot_de_passe && form.confirm_mdp && form.mot_de_passe!==form.confirm_mdp && (
              <div style={{fontSize:11,color:'var(--red)',marginBottom:12}}>⚠ Les mots de passe ne correspondent pas</div>
            )}

            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn" onClick={()=>setModal(false)}>Annuler</button>
              <button className="btn primary" onClick={changerMdp}>✓ Changer le mot de passe</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
