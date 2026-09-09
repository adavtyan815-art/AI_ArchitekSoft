import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import { config } from './config';

// Import services and db init
import { DatabaseService } from './services/databaseService';
import { SettingsService } from './services/settingsService';

const app = express();

// Middleware
app.use(cors({
  origin: true,               // Reflect the request origin (allows any)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.options('*', cors());    // Pre-flight for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

import crypto from 'crypto';
import { EC2Service } from './services/ec2Service';
import { TimeTrackerService } from './services/timeTrackerService';

// Authentication Middleware
app.use((req, res, next) => {
  if (req.path === '/admin.html' || req.path.startsWith('/api/admin') || req.path.startsWith('/api/debug')) {
    if (req.path === '/api/admin/login' || req.path === '/api/admin/logout') {
      return next();
    }
    if (!(req.session as any).isAdmin) {
      if (req.path === '/admin.html') {
        return res.redirect('/login.html');
      } else {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
  }
  next();
});

// Setup static files
app.use(express.static(path.join(__dirname, '../public')));

const ec2Service = new EC2Service();

app.get('/api/admin/instances', (req, res) => {
  const db = DatabaseService.getInstance();
  res.json(db.getInstances());
});

app.get('/api/settings', (req, res) => {
  res.json(SettingsService.getInstance().getSettings());
});

app.put('/api/admin/settings', async (req, res) => {
  const settings = SettingsService.getInstance();
  await settings.save(req.body);
  res.json({ success: true, settings: settings.getSettings() });
});

app.post('/api/admin/instances', async (req, res) => {
  const db = DatabaseService.getInstance();
  const settings = SettingsService.getInstance().getSettings();
  const uuid = crypto.randomUUID();
  await db.saveInstance(uuid, {
    uuid,
    instanceId: req.body.explicitInstanceId || ('i-mock' + Math.floor(Math.random()*10000)),
    displayLimitHours: req.body.displayLimitHours || settings.defaultDisplayLimitHours,
    realLimitHours: req.body.realLimitHours || settings.defaultRealLimitHours,
    displayTimeUsedSeconds: 0,
    realTimeUsedSeconds: 0,
    status: 'stopped',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    expiresAt: req.body.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: req.body.assignedTo || 'Unassigned',
    ec2Config: {
      instanceType: req.body.instanceType || 'g4dn.2xlarge',
      region: 'us-east-2',
      amiId: 'ami-123',
      securityGroupId: 'sg-123',
      subnetId: 'sub-123'
    },
    activeSessions: new Map()
  });
  res.json({ success: true, uuid });
});

app.post('/api/admin/instances/:uuid/start', async (req, res) => {
  const db = DatabaseService.getInstance();
  const inst = db.getInstance(req.params.uuid);
  if (inst && inst.instanceId) {
    try {
      await ec2Service.startInstance(inst.instanceId);
      inst.status = 'pending';
      await db.saveInstance(req.params.uuid, inst);
      res.json({ success: true, status: inst.status });
    } catch(e: any) {
      console.error('AWS Start Failed', e);
      res.status(500).json({ success: false, error: e.message || 'AWS Start Failed' });
    }
  } else {
    res.status(404).json({ success: false, error: 'Instance Not Found' });
  }
});

app.post('/api/admin/instances/:uuid/stop', async (req, res) => {
  const db = DatabaseService.getInstance();
  const inst = db.getInstance(req.params.uuid);
  if (inst && inst.instanceId) {
    try {
      await ec2Service.stopInstance(inst.instanceId);
      inst.status = 'stopped';
      TimeTrackerService.getInstance().stopRealTimer(req.params.uuid);
      await db.saveInstance(req.params.uuid, inst);
      res.json({ success: true, status: inst.status });
    } catch(e: any) {
      console.error('AWS Stop Failed', e);
      res.status(500).json({ success: false, error: e.message || 'AWS Stop Failed' });
    }
  } else {
    res.status(404).json({ success: false, error: 'Instance Not Found' });
  }
});

app.delete('/api/admin/instances/:uuid', async (req, res) => {
  const db = DatabaseService.getInstance();
  await db.deleteInstance(req.params.uuid);
  res.json({ success: true });
});

app.put('/api/admin/instances/:uuid', async (req, res) => {
  const db = DatabaseService.getInstance();
  const inst = db.getInstance(req.params.uuid);
  if (!inst) return res.status(404).json({ error: 'Not found' });

  if (req.body.displayLimitHours !== undefined) {
    inst.displayLimitHours = Number(req.body.displayLimitHours);
  }
  if (req.body.realLimitHours !== undefined) {
    inst.realLimitHours = Number(req.body.realLimitHours);
  }
  if (req.body.expiresAt !== undefined) {
    inst.expiresAt = req.body.expiresAt;
  }
  
  await db.saveInstance(req.params.uuid, inst);
  res.json({ success: true, inst });
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === config.ADMIN_USERNAME && password === config.ADMIN_PASSWORD_HASH) {
    (req.session as any).isAdmin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/instances/:uuid/balance', (req, res) => {
  const db = DatabaseService.getInstance();
  const inst = db.getInstance(req.params.uuid);
  if (!inst) return res.status(404).json({ error: 'Not found' });

  const limitHours = inst.displayLimitHours || 0;
  const usedSeconds = inst.displayTimeUsedSeconds || 0;
  const limitSeconds = limitHours * 3600;
  
  let remainingSeconds = limitSeconds - usedSeconds;
  if (remainingSeconds < 0) remainingSeconds = 0;
  
  const now = Date.now();
  const expireDateStr = (inst as any).expiresAt || new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
  const expireDate = new Date(expireDateStr).getTime();
  const diffDays = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24));
  const linkExpired = diffDays <= 0;
  
  const expired = (remainingSeconds <= 0 && limitSeconds > 0) || linkExpired;
  let displayLimitText = `${limitHours} ժամ`;
  
  const remainingHours = Math.floor(remainingSeconds / 3600);
  const remainingMinutes = Math.floor((remainingSeconds % 3600) / 60);
  let timeLeft = remainingHours > 0 ? `${remainingHours} ժ. ${remainingMinutes} ր.` : `${remainingMinutes} րոպե`;
  if (remainingSeconds <= 0 && limitSeconds > 0) timeLeft = '0 րոպե';
  
  if (limitSeconds === 0) {
     timeLeft = 'Անսահմանափակ';
     displayLimitText = 'Անսահմանափակ';
  }

  res.json({ success: true, timeLeft, displayLimitText, expired, remainingDays: diffDays > 0 ? diffDays : 0, linkExpired });
});

import http from 'http';

app.get('/api/instances/:uuid/status', async (req, res) => {
  const db = DatabaseService.getInstance();
  const inst = db.getInstance(req.params.uuid);
  if (!inst) return res.status(404).json({ error: 'Not found' });
  
  let targetHost: string | null = null;
  let finalStatus: string = inst.status;

  if (inst.status === 'pending' || inst.status === 'running' || inst.status === 'stopping') {
    try {
      const status = await ec2Service.getInstanceStatus(inst.instanceId);
      
      if (inst.status === 'stopping') {
        if (status.state === 'stopped' || status.state === 'terminated') {
          console.log(`[Status] Instance ${inst.uuid} is now fully stopped.`);
          inst.status = 'stopped';
          await db.saveInstance(inst.uuid, inst);
          finalStatus = 'stopped';
        } else {
          finalStatus = 'stopping';
        }
      } 
      else if (status.state === 'running') {
        if (inst.status !== 'running') {
          inst.status = 'running';
          TimeTrackerService.getInstance().startRealTimer(req.params.uuid);
          await db.saveInstance(inst.uuid, inst);
        }
        
        // Use Real AWS IP
        if (status.ip) {
          targetHost = `http://${status.ip}:80`;
          
          // VERIFY THE WEB SERVER IS ACTUALLY ALIVE AND ANSWERING HTTP
          const isReady = await new Promise((resolve) => {
            const reqUrl = targetHost as string;
            const pingReq = http.get(reqUrl, { timeout: 2000 }, (pingRes) => {
              // If we get any HTTP code, the UE web server is fully booted!
              resolve(true); 
            });
            pingReq.on('error', () => resolve(false));
            pingReq.on('timeout', () => { pingReq.destroy(); resolve(false); });
          });

          if (!isReady) {
            finalStatus = 'booting_server'; // AWS is running, but Unreal WebServer isn't up yet
          } else {
            finalStatus = 'running';
          }
        }
      } else if (status.state === 'stopped') {
        inst.status = 'stopped';
        finalStatus = 'stopped';
        TimeTrackerService.getInstance().stopRealTimer(req.params.uuid);
        await db.saveInstance(inst.uuid, inst);
      }
    } catch(e: any) { 
      console.error("AWS Status Check failed", e.message);
    }
  }

  res.json({ success: true, status: finalStatus, ip: targetHost, lastError: (inst as any).lastError || null });
});

app.post('/api/instances/:uuid/connect', async (req, res) => {
  const db = DatabaseService.getInstance();
  const inst = db.getInstance(req.params.uuid);
  if (!inst) return res.status(404).json({ error: 'Not found' });

  let hostToken = req.body.hostToken;
  
  // Purge stale sessions (no heartbeat for > HEARTBEAT_TIMEOUT_MS)
  const TIMEOUT = Number(config.HEARTBEAT_TIMEOUT_MS) || 30000;
  for (const [token, session] of inst.activeSessions.entries()) {
    if (Date.now() - session.lastSeenAt > TIMEOUT * 3) {
      inst.activeSessions.delete(token);
    }
  }

  if (!hostToken || !inst.activeSessions.has(hostToken)) {
    hostToken = crypto.randomUUID();
    inst.activeSessions.set(hostToken, {
      hostToken: hostToken,
      lastSeenAt: Date.now(),
      displayStarted: false
    });
    await db.saveInstance(inst.uuid, inst);
  } else {
    // Refresh existing session timestamp
    const existing = inst.activeSessions.get(hostToken)!;
    existing.lastSeenAt = Date.now();
    await db.saveInstance(inst.uuid, inst);
  }

  // If already pending or running, just return current status + token
  if (inst.status === 'pending' || inst.status === 'running') {
    return res.json({ success: true, status: inst.status, hostToken });
  }

  const expireDateStr = (inst as any).expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  if (Date.now() > new Date(expireDateStr).getTime()) {
    return res.json({ success: false, quotaExceeded: true, error: "Link expired" });
  }

  // Boot it up if stopped — respond IMMEDIATELY, start AWS in background
  inst.status = 'pending';
  await db.saveInstance(req.params.uuid, inst);

  // Respond fast before AWS call (avoids ERR_CONNECTION_RESET on slow networks)
  res.json({ success: true, status: 'pending', hostToken });

  // Now kick off AWS in background (non-blocking)
  ec2Service.startInstance(inst.instanceId).then(() => {
    console.log(`[AWS] Instance ${inst.instanceId} start command accepted`);
  }).catch(async (e: any) => {
    const errMsg = e.message || 'Unknown AWS error';
    console.error('[AWS] startInstance failed:', errMsg);
    // Store error on instance so frontend can surface it
    const current = db.getInstance(req.params.uuid);
    if (current) {
      current.status = 'stopped';
      (current as any).lastError = errMsg;
      await db.saveInstance(req.params.uuid, current).catch(() => {});
    }
  });
});

// Debug: test AWS connectivity
app.get('/api/debug/aws-test', async (req, res) => {
  try {
    const status = await ec2Service.getInstanceStatus('i-027f86f5e9e0720c6');
    res.json({ success: true, result: status });
  } catch(e: any) {
    res.json({ success: false, error: e.message, code: e.name });
  }
});

// Fallback to index.html if no route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

export default app;
