/**
 * PATCH — Mois global persistant entre les pages
 * Exécuter : node patch_mois_global.js
 * depuis : C:\Users\HP\Desktop\sinex-prod\sinex-prod-front\
 */
const fs = require('fs');
const path = require('path');

let totalChanges = 0;

function patchFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
    return;
  }
  let c = fs.readFileSync(filePath, 'utf8');
  let changes = 0;
  for (const [old, nw] of replacements) {
    if (c.includes(old)) {
      c = c.replace(old, nw);
      changes++;
    }
  }
  if (changes > 0) {
    fs.writeFileSync(filePath, c, 'utf8');
    console.log(`✅ ${path.basename(filePath)} — ${changes} modification(s)`);
    totalChanges += changes;
  } else {
    console.log(`ℹ️  ${path.basename(filePath)} — déjà à jour ou pattern non trouvé`);
  }
}

const src = path.join(__dirname, 'src');

// ── DashboardPage ──
patchFile(path.join(src,'components','dashboard','DashboardPage.js'), [
  [
    `  const { lastRefresh } = useRefresh();\n  const [mois,   setMois]   = useState(new Date().toISOString().slice(0,7));`,
    `  const { lastRefresh, moisGlobal, changerMois } = useRefresh();\n  const mois = moisGlobal;\n  const setMois = changerMois;`
  ],
  // Supprimer l'import useState si mois était le seul état local (non, il y en a d'autres — garder)
]);

// ── ProductionPage ──
patchFile(path.join(src,'components','production','ProductionPage.js'), [
  [
    `  const [mois,    setMois]    = useState(new Date().toISOString().slice(0,7));`,
    `  const { moisGlobal, changerMois } = useRefresh();\n  const mois = moisGlobal;\n  const setMois = changerMois;`
  ],
  // Ajouter useRefresh à l'import existant
  [
    `import { useRefresh } from '../../context/RefreshContext';`,
    `import { useRefresh } from '../../context/RefreshContext';`
  ],
]);

// ── StocksPage ──
patchFile(path.join(src,'components','stocks','StocksPage.js'), [
  [
    `  const { lastRefresh } = useRefresh();\n  const isDG = can('stocks') === 'write';`,
    `  const { lastRefresh, moisGlobal, changerMois } = useRefresh();\n  const isDG = can('stocks') === 'write';`
  ],
  [
    `  const [moisF, setMoisF] = useState(new Date().toISOString().slice(0,7));`,
    `  const moisF = moisGlobal;\n  const setMoisF = changerMois;`
  ],
]);

// ── AtpPage ──
patchFile(path.join(src,'components','atp','AtpPage.js'), [
  [
    `  const [mois,     setMois]     = useState(new Date().toISOString().slice(0,7));`,
    `  const { moisGlobal, changerMois } = useRefresh();\n  const mois = moisGlobal;\n  const setMois = changerMois;`
  ],
  // Ajouter import useRefresh si pas présent
  [
    `import { tresorerieAPI, stocksAPI } from '../../services/api';`,
    `import { tresorerieAPI, stocksAPI } from '../../services/api';\nimport { useRefresh } from '../../context/RefreshContext';`
  ],
]);

// ── TresoreriePage ──
patchFile(path.join(src,'components','tresorerie','TresoreriePage.js'), [
  [
    `  const [moisF,       setMoisF]       = useState('all');`,
    `  const { moisGlobal, changerMois } = useRefresh();\n  const [moisF,       setMoisF]       = useState(moisGlobal !== 'all' ? moisGlobal : 'all');`
  ],
]);

console.log(`\n✅ Total modifications: ${totalChanges}`);
