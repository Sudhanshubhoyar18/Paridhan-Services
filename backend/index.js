/**
 * Paridhan Uniforms - Cloud & Local Server Entrypoint
 * Checks runtime environment, Node.js version, and launches server.
 */

console.log('----------------------------------------------------');
console.log('🚀 Initializing Paridhan Uniforms Application...');
console.log(`📌 Node Version: ${process.version}`);
console.log(`📌 Platform: ${process.platform} (${process.arch})`);
console.log(`📌 Process ID: ${process.pid}`);
console.log(`📌 Environment: ${process.env.NODE_ENV || 'production'}`);
console.log(`📌 Port: ${process.env.PORT || 5000}`);
if (process.env.RENDER_EXTERNAL_URL) {
  console.log(`📌 Render External URL: ${process.env.RENDER_EXTERNAL_URL}`);
}
console.log('----------------------------------------------------');

const [major, minor] = process.versions.node.split('.').map(Number);

if (major < 22 || (major === 22 && minor < 5)) {
  console.error('\n================================================================');
  console.error('❌ INCOMPATIBLE NODE.JS VERSION DETECTED ON HOST!');
  console.error(`Current Node.js version: ${process.version}`);
  console.error(`Required Node.js version: >= 22.5.0 (for native node:sqlite engine)`);
  console.error('\n👉 QUICK FIX FOR RENDER DASHBOARD:');
  console.error('1. Open your Render Web Service in https://dashboard.render.com');
  console.error('2. Click on "Environment" in the left sidebar menu');
  console.error('3. Add an Environment Variable:');
  console.error('     Key:   NODE_VERSION');
  console.error('     Value: 22');
  console.error('4. Click "Save Changes" (Render will immediately redeploy with Node 22)');
  console.error('================================================================\n');
  process.exit(1);
}

// Global unhandled error trackers
process.on('uncaughtException', (err) => {
  console.error('💥 FATAL UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 FATAL UNHANDLED REJECTION:', reason);
});

// Launch main server
try {
  await import('./src/server.js');
} catch (err) {
  console.error('💥 FAILED TO START SERVER:', err);
  process.exit(1);
}
