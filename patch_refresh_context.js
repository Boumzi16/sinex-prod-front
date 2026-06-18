/**
 * PATCH — Ajouter RefreshProvider dans App.js
 * Exécuter depuis C:\Users\HP\Desktop\sinex-prod\sinex-prod-front\
 * node patch_refresh_context.js
 */
const fs = require('fs');
const path = require('path');

// Trouver App.js
const appPath = path.join(__dirname, 'src', 'App.js');
if (!fs.existsSync(appPath)) {
  console.error('❌ App.js introuvable à:', appPath);
  process.exit(1);
}

let c = fs.readFileSync(appPath, 'utf8');
let changes = 0;

// 1. Ajouter import RefreshProvider
if (!c.includes('RefreshProvider') && !c.includes('RefreshContext')) {
  // Trouver le dernier import et ajouter après
  const lastImport = c.lastIndexOf("import ");
  const endOfLastImport = c.indexOf('\n', lastImport) + 1;
  c = c.slice(0, endOfLastImport) +
    "import { RefreshProvider } from './context/RefreshContext';\n" +
    c.slice(endOfLastImport);
  changes++;
  console.log('✅ Import RefreshProvider ajouté');
}

// 2. Envelopper AuthProvider avec RefreshProvider
if (!c.includes('RefreshProvider') || c.includes('RefreshProvider') && !c.includes('<RefreshProvider>')) {
  // Chercher <AuthProvider> et l'envelopper
  if (c.includes('<AuthProvider>')) {
    c = c.replace('<AuthProvider>', '<RefreshProvider>\n      <AuthProvider>');
    c = c.replace('</AuthProvider>', '</AuthProvider>\n    </RefreshProvider>');
    changes++;
    console.log('✅ RefreshProvider enveloppé autour de AuthProvider');
  } else {
    console.log('⚠️  AuthProvider non trouvé — ajoutez manuellement RefreshProvider autour du contenu principal');
  }
}

if (changes > 0) {
  fs.writeFileSync(appPath, c, 'utf8');
  console.log(`\n✅ App.js mis à jour — ${changes} modification(s)`);
} else {
  console.log('ℹ️  App.js déjà à jour');
}
