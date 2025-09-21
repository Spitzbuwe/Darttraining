#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Cloudflare Pages Deployment Script');
console.log('=====================================');

// Erstelle Build-Verzeichnis
const buildDir = './cloudflare-build';
if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
}
fs.mkdirSync(buildDir, { recursive: true });

console.log('📁 Erstelle Build-Verzeichnis...');

// Kopiere alle notwendigen Dateien
const filesToCopy = [
    'play-interface.html',
    'index.html',
    '.nojekyll',
    'assets/',
    'README.md'
];

filesToCopy.forEach(file => {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(buildDir, file);
    
    if (fs.existsSync(srcPath)) {
        if (fs.statSync(srcPath).isDirectory()) {
            fs.cpSync(srcPath, destPath, { recursive: true });
            console.log(`✅ Verzeichnis kopiert: ${file}`);
        } else {
            fs.copyFileSync(srcPath, destPath);
            console.log(`✅ Datei kopiert: ${file}`);
        }
    } else {
        console.log(`⚠️ Datei nicht gefunden: ${file}`);
    }
});

// Erstelle _redirects für SPA
const redirectsContent = `/*    /play-interface.html   200`;
fs.writeFileSync(path.join(buildDir, '_redirects'), redirectsContent);
console.log('✅ _redirects erstellt');

// Erstelle wrangler.toml
const wranglerConfig = `name = "autodarts-trainer"
compatibility_date = "2024-01-01"

[env.production]
name = "autodarts-trainer"

[[pages_functions]]
# Für zukünftige API-Funktionen
`;

fs.writeFileSync(path.join(buildDir, 'wrangler.toml'), wranglerConfig);
console.log('✅ wrangler.toml erstellt');

console.log('\n🎉 Build abgeschlossen!');
console.log(`📁 Build-Verzeichnis: ${buildDir}`);
console.log('\n📋 Nächste Schritte:');
console.log('1. Gehen Sie zu https://dash.cloudflare.com/pages');
console.log('2. Klicken Sie auf "Upload assets"');
console.log(`3. Ziehen Sie den Inhalt von "${buildDir}" in das Upload-Fenster`);
console.log('4. Warten Sie auf das Deployment');
console.log('\n🌐 Oder verwenden Sie Wrangler CLI:');
console.log(`cd ${buildDir} && npx wrangler pages deploy . --project-name=autodarts-trainer`);
