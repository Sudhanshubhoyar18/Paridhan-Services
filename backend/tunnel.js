import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TUNNEL_FILE = path.resolve(__dirname, 'data/tunnel.json');

console.log('\n========================================================================');
console.log('   CONNECTING PARIDHAN UNIFORMS TO SECURE CLOUDFLARE TUNNEL...');
console.log('========================================================================\n');
console.log('[*] Initializing encrypted tunnel for port 5000...');
console.log('[*] Generating public HTTPS link for Android/iPhone & remote access...\n');

// Clean up stale tunnel file on boot
try {
  if (fs.existsSync(TUNNEL_FILE)) {
    fs.unlinkSync(TUNNEL_FILE);
  }
} catch (_) {}

const cloudflared = spawn('npx', ['cloudflared', 'tunnel', '--url', 'http://localhost:5000'], {
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe']
});

let tunnelUrlFound = false;

function handleOutput(data) {
  const text = data.toString();

  // Search for trycloudflare.com URL
  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/i);
  if (match && !tunnelUrlFound) {
    tunnelUrlFound = true;
    const tunnelUrl = match[0];

    // Save to local data file
    try {
      const dataDir = path.dirname(TUNNEL_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(TUNNEL_FILE, JSON.stringify({ url: tunnelUrl, updatedAt: new Date().toISOString() }), 'utf8');
    } catch (e) {
      console.error('[!] Failed to write tunnel.json:', e.message);
    }

    // Notify local Express server if running
    fetch('http://localhost:5000/api/system/tunnel-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: tunnelUrl })
    }).catch(() => {});

    console.log('\n========================================================================');
    console.log('   🎉 PARIDHAN UNIFORMS - WORLDWIDE ACCESS IS READY!');
    console.log('========================================================================\n');
    console.log(`   👉 Public HTTPS URL: \x1b[32m\x1b[1m${tunnelUrl}\x1b[0m\n`);
    console.log('   📲 HOW TO OPEN & DOWNLOAD ON YOUR PHONE:');
    console.log('   1. Point your phone camera at the screen in "Phone Access", OR');
    console.log(`      type this in your mobile browser: ${tunnelUrl}`);
    console.log('   2. Log in with your admin credentials.');
    console.log('   3. Tap "Install App" or tap 3 dots -> "Add to Home screen" / "Install".');
    console.log('   4. Paridhan POS installs directly onto your phone as a mobile app!\n');
    console.log('   [IMPORTANT] Keep this window open while using the app remotely.');
    console.log('========================================================================\n');
  }
}

cloudflared.stdout.on('data', handleOutput);
cloudflared.stderr.on('data', handleOutput);

function cleanup() {
  try {
    if (fs.existsSync(TUNNEL_FILE)) {
      fs.unlinkSync(TUNNEL_FILE);
    }
  } catch (_) {}
  try {
    cloudflared.kill('SIGINT');
  } catch (_) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', () => {
  try {
    if (fs.existsSync(TUNNEL_FILE)) {
      fs.unlinkSync(TUNNEL_FILE);
    }
  } catch (_) {}
});

