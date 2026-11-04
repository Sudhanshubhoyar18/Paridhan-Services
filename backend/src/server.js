import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { seedDatabase } from './database/seed.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import customerRoutes from './routes/customers.js';
import billRoutes from './routes/bills.js';
import publicRoutes from './routes/public.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';
import settingRoutes from './routes/settings.js';
import systemRoutes from './routes/system.js';
import errorHandler from './middleware/errorHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize and seed database if necessary
try {
  seedDatabase();
  console.log('✅ Database schema verified & seeded successfully');
} catch (seedErr) {
  console.error('⚠️ Database seed error:', seedErr);
}

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  process.env.CLIENT_URL,
  process.env.PUBLIC_BASE_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev to avoid local network issues
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logger
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Helper to detect LAN IPv4
function getLocalIp() {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  } catch (_) {}
  return 'localhost';
}

const TUNNEL_FILE = path.resolve(__dirname, '../data/tunnel.json');
let memoryTunnelUrl = null;

export function getTunnelUrl() {
  // If deployed on Render cloud, auto-use Render's public URL
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '');
  }
  if (memoryTunnelUrl) return memoryTunnelUrl;
  try {
    if (fs.existsSync(TUNNEL_FILE)) {
      const data = JSON.parse(fs.readFileSync(TUNNEL_FILE, 'utf8'));
      if (data && data.url) return data.url;
    }
  } catch (_) {}
  return null;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Paridhan Uniforms Billing System',
    localIp: getLocalIp(),
    tunnelUrl: getTunnelUrl(),
    timestamp: new Date().toISOString()
  });
});

// Direct tunnel-url endpoints for frontend auto-discovery
app.get('/api/system/tunnel-url', (req, res) => {
  res.json({ success: true, tunnelUrl: getTunnelUrl() });
});

app.post('/api/system/tunnel-url', (req, res) => {
  const { url } = req.body;
  if (url && typeof url === 'string') {
    memoryTunnelUrl = url.trim();
    try {
      const dataDir = path.dirname(TUNNEL_FILE);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(TUNNEL_FILE, JSON.stringify({ url: memoryTunnelUrl, updatedAt: new Date().toISOString() }), 'utf8');
    } catch (_) {}
    return res.json({ success: true, tunnelUrl: memoryTunnelUrl });
  }
  return res.status(400).json({ success: false, message: 'Invalid URL' });
});

// Public invoice routes (without auth)
app.use(publicRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/system', systemRoutes);

// Serve frontend static build if dist exists (production / single-server mode)
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/invoice')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Centralized error handler
app.use(errorHandler);

// Start server on 0.0.0.0 for local network & mobile access
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Paridhan Uniforms Backend running on http://localhost:${PORT} and network http://0.0.0.0:${PORT}`);
  console.log(`📑 Public invoice share configured with base: ${process.env.PUBLIC_BASE_URL || 'http://localhost:5173'}`);
});

export default app;
