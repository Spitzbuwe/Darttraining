#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chokidar = require('chokidar');

console.log('🤖 Automatisches Cloudflare Deployment');
console.log('=====================================');

// Cloudflare-Konfiguration
const CLOUDFLARE_CONFIG = {
  projectName: 'autodarts-trainer',
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID || 'YOUR_ACCOUNT_ID',
  apiToken: process.env.CLOUDFLARE_API_TOKEN || 'YOUR_API_TOKEN'
};

// Dateien die überwacht werden sollen
const WATCH_FILES = [
  'play-interface.html',
  'index.html',
  'assets/**/*',
  'README.md',
  '.nojekyll'
];

// Build-Funktion
function buildForCloudflare() {
  console.log('🔨 Building for Cloudflare...');
  
  const buildDir = './cloudflare-build';
  
  // Lösche altes Build
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
  }
  fs.mkdirSync(buildDir, { recursive: true });
  
  // Kopiere nur die notwendigen Dateien (ohne große Dateien)
  const filesToCopy = [
    'play-interface.html',
    'index.html',
    '.nojekyll',
    'README.md',
    'wrangler.toml',
    'assets'
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
    }
  });
  
  // Erstelle _redirects
  fs.writeFileSync(path.join(buildDir, '_redirects'), '/*    /play-interface.html   200');
  
  // Bereinige große Dateien
  console.log('🧹 Bereinige große Dateien...');
  
  // Entferne alle DLL und EXE Dateien
  const cleanDir = (dir) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (file === 'AutodartsTrainer' || file === 'node_modules' || file === 'Desktop app') {
          fs.rmSync(filePath, { recursive: true });
          console.log(`🗑️ Verzeichnis entfernt: ${file}`);
        } else {
          cleanDir(filePath);
        }
      } else if (file.endsWith('.dll') || file.endsWith('.exe') || file.endsWith('.so') || file.endsWith('.dylib')) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Datei entfernt: ${file}`);
      }
    });
  };
  
  cleanDir(buildDir);
  
  // Prüfe Dateigrößen
  console.log('📊 Prüfe Dateigrößen...');
  const checkSizes = (dir) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        checkSizes(filePath);
      } else {
        const sizeMB = stat.size / (1024 * 1024);
        if (sizeMB > 25) {
          console.log(`❌ Große Datei gefunden: ${file} (${sizeMB.toFixed(2)} MB)`);
          fs.unlinkSync(filePath);
          console.log(`🗑️ Datei entfernt: ${file}`);
        } else if (sizeMB > 1) {
          console.log(`⚠️ Große Datei: ${file} (${sizeMB.toFixed(2)} MB)`);
        }
      }
    });
  };
  
  checkSizes(buildDir);
  
  console.log('✅ Build completed!');
  return buildDir;
}

// Deploy-Funktion
async function deployToCloudflare() {
  try {
    console.log('🚀 Deploying to Cloudflare...');
    
    const buildDir = buildForCloudflare();
    
    // Prüfe ob Wrangler installiert ist
    try {
      execSync('npx wrangler --version', { stdio: 'pipe' });
    } catch (error) {
      console.log('📦 Installing Wrangler...');
      execSync('npm install -g wrangler', { stdio: 'inherit' });
    }
    
    // Deploy zu Cloudflare
    const deployCommand = `npx wrangler pages deploy ${buildDir} --project-name=${CLOUDFLARE_CONFIG.projectName}`;
    
    if (CLOUDFLARE_CONFIG.accountId !== 'YOUR_ACCOUNT_ID') {
      execSync(`${deployCommand} --account-id=${CLOUDFLARE_CONFIG.accountId}`, { 
        stdio: 'inherit',
        env: { ...process.env, CLOUDFLARE_API_TOKEN: CLOUDFLARE_CONFIG.apiToken }
      });
    } else {
      console.log('⚠️ Cloudflare-Konfiguration erforderlich!');
      console.log('Setzen Sie CLOUDFLARE_ACCOUNT_ID und CLOUDFLARE_API_TOKEN');
      console.log('Beispiel: CLOUDFLARE_ACCOUNT_ID=your_id CLOUDFLARE_API_TOKEN=your_token node auto-deploy.js');
    }
    
    console.log('🎉 Deployment erfolgreich!');
    console.log('🌐 URL: https://autodarts-trainer.pages.dev');
    
  } catch (error) {
    console.error('❌ Deployment fehlgeschlagen:', error.message);
  }
}

// File Watcher
function startWatching() {
  console.log('👀 Überwache Dateien...');
  console.log('Drücken Sie Ctrl+C zum Beenden');
  
  const watcher = chokidar.watch(WATCH_FILES, {
    ignored: /(^|[\/\\])\../, // ignoriere versteckte Dateien
    persistent: true
  });
  
  let timeout;
  
  watcher.on('change', (path) => {
    console.log(`📝 Datei geändert: ${path}`);
    
    // Debounce - warte 2 Sekunden nach der letzten Änderung
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      console.log('🔄 Änderungen erkannt, starte Deployment...');
      deployToCloudflare();
    }, 2000);
  });
  
  watcher.on('add', (path) => {
    console.log(`➕ Datei hinzugefügt: ${path}`);
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      deployToCloudflare();
    }, 2000);
  });
}

// Hauptfunktion
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--deploy')) {
    await deployToCloudflare();
  } else if (args.includes('--watch')) {
    startWatching();
  } else {
    console.log('Verwendung:');
    console.log('  node auto-deploy.js --deploy    # Einmaliges Deployment');
    console.log('  node auto-deploy.js --watch     # Automatisches Deployment bei Änderungen');
    console.log('');
    console.log('Umgebung:');
    console.log('  CLOUDFLARE_ACCOUNT_ID=your_id CLOUDFLARE_API_TOKEN=your_token node auto-deploy.js --watch');
  }
}

main().catch(console.error);
