/**
 * PATCH — à exécuter depuis C:\Users\HP\Desktop\sinex-prod\sinex-prod-front\
 * node patch_production_rebuts.js
 * 
 * Modifie ProductionPage.js pour :
 * 1. Utiliser etiq_c12 et etiq_c24 au lieu de etiquettes
 * 2. Supprimer les références aux étiquettes 1L dans les rebuts
 * 3. Ajouter sachets HILIO dans les rebuts
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/production/ProductionPage.js');

if (!fs.existsSync(filePath)) {
  console.error('❌ Fichier non trouvé:', filePath);
  process.exit(1);
}

let c = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// ── 1. Formulaire de saisie rebuts — remplacer champ étiquettes par etiq_c12 + etiq_c24 ──
const OLD_ETIQ_INPUT = `<div className="form-grp">
              <label className="form-lbl">Étiquettes</label>
              <input type="number" min={0} className="form-inp"
                value={formRebuts.etiquettes||0}
                onChange={e=>setFormRebuts(f=>({...f,etiquettes:+e.target.value}))}
                style={{fontFamily:'var(--mono)'}}/>
            </div>`;

const NEW_ETIQ_INPUT = `<div className="form-grp">
              <label className="form-lbl" style={{color:'#3B82F6'}}>Étiq C12 (1,5L)</label>
              <input type="number" min={0} className="form-inp"
                value={formRebuts.etiq_c12||0}
                onChange={e=>setFormRebuts(f=>({...f,etiq_c12:+e.target.value}))}
                style={{fontFamily:'var(--mono)',color:'#3B82F6'}}/>
            </div>
            <div className="form-grp">
              <label className="form-lbl" style={{color:'#8B5CF6'}}>Étiq C24 (0,5L)</label>
              <input type="number" min={0} className="form-inp"
                value={formRebuts.etiq_c24||0}
                onChange={e=>setFormRebuts(f=>({...f,etiq_c24:+e.target.value}))}
                style={{fontFamily:'var(--mono)',color:'#8B5CF6'}}/>
            </div>`;

if (c.includes(OLD_ETIQ_INPUT)) {
  c = c.replace(OLD_ETIQ_INPUT, NEW_ETIQ_INPUT);
  changes++;
  console.log('✅ Champ étiquettes scindé en etiq_c12 + etiq_c24');
}

// ── 2. Champ sachets HILIO dans les rebuts ──
const OLD_CTN_C24 = `<div className="form-grp">
              <label className="form-lbl">Cartons C24</label>
              <input type="number" min={0} className="form-inp"
                value={formRebuts.ctn_c24||0}
                onChange={e=>setFormRebuts(f=>({...f,ctn_c24:+e.target.value}))}
                style={{fontFamily:'var(--mono)'}}/>
            </div>`;

const NEW_CTN_C24 = `<div className="form-grp">
              <label className="form-lbl">Cartons C24</label>
              <input type="number" min={0} className="form-inp"
                value={formRebuts.ctn_c24||0}
                onChange={e=>setFormRebuts(f=>({...f,ctn_c24:+e.target.value}))}
                style={{fontFamily:'var(--mono)'}}/>
            </div>
            <div className="form-grp">
              <label className="form-lbl" style={{color:'var(--green)'}}>Sachets HILIO</label>
              <input type="number" min={0} className="form-inp"
                value={formRebuts.hilio||0}
                onChange={e=>setFormRebuts(f=>({...f,hilio:+e.target.value}))}
                style={{fontFamily:'var(--mono)',color:'var(--green)'}}/>
            </div>`;

if (c.includes(OLD_CTN_C24)) {
  c = c.replace(OLD_CTN_C24, NEW_CTN_C24);
  changes++;
  console.log('✅ Champ Sachets HILIO ajouté dans les rebuts');
}

// ── 3. Initialisation formRebuts — ajouter etiq_c12, etiq_c24, hilio ──
// Remplacer les initialisations qui utilisent etiquettes
[
  ['etiquettes:r.etiquettes||0', 'etiq_c12:r.etiq_c12||0, etiq_c24:r.etiq_c24||0, hilio:r.hilio||r.hilio_rebut||0'],
  ['etiquettes:0,', 'etiq_c12:0, etiq_c24:0, hilio:0,'],
  ["etiquettes:s.rebuts?.etiquettes||0", "etiq_c12:s.rebuts?.etiq_c12||0, etiq_c24:s.rebuts?.etiq_c24||0, hilio:s.rebuts?.hilio||0"],
].forEach(([old, nw]) => {
  if (c.includes(old)) {
    c = c.replace(new RegExp(old.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'), nw);
    changes++;
    console.log(`✅ Remplacé: ${old.substring(0,40)}...`);
  }
});

// ── 4. Affichage rebuts dans le tableau — remplacer colonne étiquettes ──
// Chercher les affichages type r.etiquettes ou rebuts.etiquettes
const etiq_replacements = [
  ['r.rebuts?.etiquettes||0', '(r.rebuts?.etiq_c12||0)+(r.rebuts?.etiq_c24||0)'],
  ['s.rebuts?.etiquettes||0', '(s.rebuts?.etiq_c12||0)+(s.rebuts?.etiq_c24||0)'],
  ["rb.etiquettes", "(rb.etiq_c12||0)+(rb.etiq_c24||0)"],
];
etiq_replacements.forEach(([old, nw]) => {
  if (c.includes(old)) {
    c = c.replace(new RegExp(old.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'), nw);
    changes++;
    console.log(`✅ Affichage étiquettes unifié: ${old}`);
  }
});

// ── 5. Supprimer toute référence aux étiquettes 1L (ETI_1L, etiq_1l) ──
if (c.includes("ETI_1L")) {
  c = c.replace(/ETI_1L/g, '/* ETI_1L supprimé */');
  changes++;
  console.log('✅ Référence ETI_1L supprimée');
}

if (changes === 0) {
  console.log('⚠️  Aucune modification effectuée — le fichier est peut-être déjà à jour ou utilise une structure différente');
  console.log('    Vérifiez manuellement src/components/production/ProductionPage.js');
} else {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log(`\n✅ ProductionPage.js mis à jour — ${changes} modification(s)`);
}
