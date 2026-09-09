import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { DatabaseService } from './databaseService';
import { TimeTrackerService } from './timeTrackerService';
import { EC2Service } from './ec2Service';
import { DisplayStartData, HeartbeatData } from '../types/websocket.types';
import { randomUUID } from 'crypto';

export class WebSocketService {
  private io: SocketServer;
  private db: DatabaseService;
  private timeTracker: TimeTrackerService;
  private ec2Service: EC2Service;

  // In-memory map: socketId → { instanceUuid, hostToken }
  // This lets us find a session instantly when a socket disconnects
  private socketToSession: Map<string, { instanceUuid: string; hostToken: string }> = new Map();

  // In-memory heartbeat monitors: socketId → interval
  private heartbeatMonitors: Map<string, NodeJS.Timeout> = new Map();

  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: true,           // Allow any origin (EC2 IP will differ per instance)
        credentials: true,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
      },
      pingTimeout: 30000,
      pingInterval: 25000,
    });
    this.db = DatabaseService.getInstance();
    this.timeTracker = TimeTrackerService.getInstance();
    this.ec2Service = new EC2Service();

    // Listen to quota events from time tracker
    this.timeTracker.on('display-quota-exceeded', (uuid: string) => {
      this.handleQuotaExceeded(uuid, 'display');
    });
    this.timeTracker.on('real-quota-exceeded', (uuid: string) => {
      this.handleQuotaExceeded(uuid, 'real');
    });

    this.startSessionCleanupLoop();
    this.setupHandlers();
  }

  private startSessionCleanupLoop(): void {
    // Grace period watchdog: runs every 30 seconds.
    // Handles the "user closed page before redirect" case:
    // The /connect API creates a session but no socket ever arrives,
    // so no disconnect event fires. We detect this and start the grace period.
    const NO_SOCKET_STALE_MS = 60 * 1000; // 60s — if connect was called but no socket joined after 60s, treat as abandoned
    const GHOST_STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes for classic ghost cleanup

    setInterval(async () => {
      const instances = this.db.getInstances();
      const now = Date.now();
      let totalPurged = 0;

      for (const [uuid, instance] of Object.entries(instances)) {
        // Only care about active (non-stopped) instances
        if (instance.status === 'stopped' || instance.status === 'stopping') continue;

        let instanceChanged = false;

        // ── Step 1: Purge stale ghost sessions (no socketId, not seen recently) ──
        for (const [token, session] of instance.activeSessions.entries()) {
          if (!session.socketId && (now - session.lastSeenAt > GHOST_STALE_THRESHOLD)) {
            instance.activeSessions.delete(token);
            instanceChanged = true;
            totalPurged++;
          }
        }

        // ── Step 2: Detect "closed before redirect" — sessions with no socket
        //            that were created recently but have no socket and no display
        // If a session has no socketId and was last seen more than NO_SOCKET_STALE_MS ago,
        // AND the instance is running/pending with no active sockets at all,
        // start the grace period so the server shuts down.
        const hasAnySocket = Array.from(instance.activeSessions.values()).some(s => s.socketId);
        const hasAnyActiveDisplay = Array.from(instance.activeSessions.values()).some(s => s.displayStarted);

        if (!hasAnySocket && !hasAnyActiveDisplay) {
          // No socket connected at all for this running/pending instance.
          // Check if all session entries are "stale enough" to be considered abandoned.
          const allSessionsAbandoned = instance.activeSessions.size === 0 ||
            Array.from(instance.activeSessions.values()).every(
              s => !s.socketId && (now - s.lastSeenAt > NO_SOCKET_STALE_MS)
            );

          if (allSessionsAbandoned && !this.timeTracker.hasGracePeriod(uuid)) {
            console.log(`[WS] Watchdog: Instance ${uuid} is ${instance.status} but has no active sockets. Starting grace period.`);
            this.startGracePeriod(uuid);
          }
        }

        if (instanceChanged) {
          await this.db.saveInstance(uuid, instance);
        }
      }

      if (totalPurged > 0) {
        console.log(`[WS] Garbage Collector: Purged ${totalPurged} stale ghost sessions.`);
      }
    }, 30000); // Check every 30 seconds
  }

  private setupHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[WS] Client connected: ${socket.id}`);

      socket.on('join-instance', (instanceUuid: string) => {
        socket.join(`instance:${instanceUuid}`);
        console.log(`[WS] Socket ${socket.id} joined instance room ${instanceUuid}`);
      });

      socket.on('display-start', async (data: DisplayStartData) => {
        await this.handleDisplayStart(socket, data);
      });

      socket.on('heartbeat', async (data: HeartbeatData) => {
        await this.handleHeartbeat(socket, data);
      });

      socket.on('player-disconnect', async (data: { instanceUuid: string; hostToken: string }) => {
        // Explicit disconnect from player (tab close, navigation away)
        await this.handlePlayerDisconnect(socket, data.instanceUuid, data.hostToken);
      });

      socket.on('disconnect', async () => {
        await this.handleSocketDisconnect(socket);
      });
    });
  }

  private async handleDisplayStart(socket: Socket, data: DisplayStartData): Promise<void> {
    console.log(`[WS] handleDisplayStart called - Socket: ${socket.id}, Instance: ${data.instanceUuid}, Token: ${data.hostToken?.substring(0,8)}...`);
    
    const instance = this.db.getInstance(data.instanceUuid);
    if (!instance) {
      console.error(`[WS] Display start failed: Instance ${data.instanceUuid} not found`);
      socket.emit('error', { message: 'Instance not found' });
      return;
    }

    // Check quotas
    const displayUsed = instance.displayTimeUsedSeconds;
    const displayMax = instance.displayLimitHours * 3600;
    const realUsed = instance.realTimeUsedSeconds;
    const realMax = instance.realLimitHours * 3600;

    if (displayUsed >= displayMax || realUsed >= realMax) {
      console.warn(`[WS] Quota exceeded for ${data.instanceUuid}. Sending stop.`);
      socket.emit('quota-exceeded', { message: 'Your time limit has been exceeded.' });
      await this.stopInstanceAndNotify(instance.uuid);
      return;
    }

    let hostToken = data.hostToken;
    if (!hostToken) {
      hostToken = randomUUID();
      console.log(`[WS] No hostToken provided by socket ${socket.id}. Generated new one: ${hostToken.substring(0,8)}...`);
    }

    // === SESSION KEYED BY hostToken (stable across refreshes) ===
    const existingSession = instance.activeSessions.get(hostToken);

    if (existingSession) {
      // RECONNECT: User refreshed or reconnected — cancel any pending grace period
      console.log(`[WS] Reconnecting session for token ${hostToken.substring(0, 8)}...`);
      this.timeTracker.cancelGracePeriod(data.instanceUuid);

      // Remove old socket mapping if socket changed
      if (existingSession.socketId && existingSession.socketId !== socket.id) {
        this.socketToSession.delete(existingSession.socketId);
        this.clearHeartbeatMonitor(existingSession.socketId);
      }

      // Update session with new socketId
      existingSession.socketId = socket.id;
      existingSession.lastSeenAt = Date.now();
      existingSession.displayStarted = true;
    } else {
      // NEW SESSION
      console.log(`[WS] New display session for token ${hostToken.substring(0, 8)}...`);
      instance.activeSessions.set(hostToken, {
        socketId: socket.id,
        hostToken,
        lastSeenAt: Date.now(),
        displayStarted: true,
        ipAddress: socket.handshake.address,
      });
    }

    // Map this socket → hostToken for fast disconnect lookup
    this.socketToSession.set(socket.id, { instanceUuid: data.instanceUuid, hostToken });

    // Start display timer (idempotent — won't double-start)
    this.timeTracker.startDisplayTimer(data.instanceUuid);

    await this.db.saveInstance(data.instanceUuid, instance);

    // Confirm to client
    socket.emit('display-started', {
      success: true,
      hostToken,
      displayUsed: instance.displayTimeUsedSeconds,
      displayLimit: instance.displayLimitHours * 3600,
      realUsed: instance.realTimeUsedSeconds,
      realLimit: instance.realLimitHours * 3600,
    });

    // Start heartbeat monitor for this socket
    this.startHeartbeatMonitor(socket.id, data.instanceUuid, hostToken);

    console.log(`[WS] Display started. Instance ${data.instanceUuid} active sessions: ${instance.activeSessions.size}`);
  }

  private async handleHeartbeat(socket: Socket, data: HeartbeatData): Promise<void> {
    const mapping = this.socketToSession.get(socket.id);
    if (!mapping) return;

    const instance = this.db.getInstance(mapping.instanceUuid);
    if (!instance) return;

    const session = instance.activeSessions.get(mapping.hostToken);
    if (session) {
      session.lastSeenAt = Date.now();
      await this.db.saveInstance(mapping.instanceUuid, instance);
      socket.emit('heartbeat-ack', {
        timestamp: Date.now(),
        displayUsed: instance.displayTimeUsedSeconds,
        displayLimit: instance.displayLimitHours * 3600,
        realUsed: instance.realTimeUsedSeconds,
        realLimit: instance.realLimitHours * 3600,
      });
    }
  }

  private async handlePlayerDisconnect(socket: Socket, instanceUuid: string, hostToken: string): Promise<void> {
    const instance = this.db.getInstance(instanceUuid);
    if (!instance) return;

    const session = instance.activeSessions.get(hostToken);
    if (!session) return;

    console.log(`[WS] Explicit player-disconnect for token ${hostToken.substring(0, 8)}...`);

    // Mark session as inactive (keep in map for grace period reconnect)
    session.socketId = undefined;
    session.displayStarted = false;
    await this.db.saveInstance(instanceUuid, instance);

    // Stop display timer if no remaining active display sessions
    const hasActiveDisplay = Array.from(instance.activeSessions.values()).some(s => s.displayStarted);
    if (!hasActiveDisplay) {
      this.timeTracker.stopDisplayTimer(instanceUuid);
    }

    // Start grace period — if no one reconnects in time, stop server
    const noActiveSessions = !Array.from(instance.activeSessions.values()).some(s => s.displayStarted);
    if (noActiveSessions) {
      this.startGracePeriod(instanceUuid);
    }
  }

  private async handleSocketDisconnect(socket: Socket): Promise<void> {
    const mapping = this.socketToSession.get(socket.id);
    if (!mapping) return;

    const { instanceUuid, hostToken } = mapping;
    this.socketToSession.delete(socket.id);
    this.clearHeartbeatMonitor(socket.id);

    const instance = this.db.getInstance(instanceUuid);
    if (!instance) return;

    const session = instance.activeSessions.get(hostToken);
    if (session) {
      console.log(`[WS] Socket disconnected for token ${hostToken.substring(0, 8)}... Starting grace period.`);
      // Don't delete the session — keep it for reconnect during grace period
      session.socketId = undefined;
      session.displayStarted = false;
      await this.db.saveInstance(instanceUuid, instance);
    }

    // Stop display timer if no remaining active display sessions
    const hasActiveDisplay = Array.from(instance.activeSessions.values()).some(s => s.displayStarted);
    if (!hasActiveDisplay) {
      this.timeTracker.stopDisplayTimer(instanceUuid);
    }

    // Start grace period if no one active
    const noActiveSessions = !Array.from(instance.activeSessions.values()).some(s => s.displayStarted);
    if (noActiveSessions) {
      this.startGracePeriod(instanceUuid);
    }
  }

  private startGracePeriod(instanceUuid: string): void {
    console.log(`[WS] Grace period started for instance ${instanceUuid}`);

    this.io.to(`instance:${instanceUuid}`).emit('grace-period-started', {
      durationMs: 60000,
      message: 'No active viewers. Server will stop in 60 seconds if no one reconnects.',
    });

    this.timeTracker.startGracePeriod(instanceUuid, async () => {
      // Final check: are there any active sessions now?
      const instance = this.db.getInstance(instanceUuid);
      if (!instance) return;

      const hasActive = Array.from(instance.activeSessions.values()).some(s => s.displayStarted);
      if (!hasActive) {
        console.log(`[WS] Grace period expired for ${instanceUuid}. Stopping instance.`);
        // Clean up stale sessions
        instance.activeSessions.clear();
        await this.db.saveInstance(instanceUuid, instance);
        await this.stopInstanceAndNotify(instanceUuid);
      } else {
        console.log(`[WS] Grace period expired but active viewers found — not stopping.`);
      }
    });
  }

  private startHeartbeatMonitor(socketId: string, instanceUuid: string, hostToken: string): void {
    this.clearHeartbeatMonitor(socketId);

    const TIMEOUT_MS = 35000; // 35s — more than the 10s heartbeat interval
    const interval = setInterval(async () => {
      const instance = this.db.getInstance(instanceUuid);
      if (!instance) {
        this.clearHeartbeatMonitor(socketId);
        return;
      }

      const session = instance.activeSessions.get(hostToken);
      if (!session || session.socketId !== socketId) {
        this.clearHeartbeatMonitor(socketId);
        return;
      }

      if (Date.now() - session.lastSeenAt > TIMEOUT_MS) {
        console.log(`[WS] Heartbeat timeout for token ${hostToken.substring(0, 8)}...`);
        this.clearHeartbeatMonitor(socketId);
        this.socketToSession.delete(socketId);

        session.socketId = undefined;
        session.displayStarted = false;
        await this.db.saveInstance(instanceUuid, instance);

        const hasActive = Array.from(instance.activeSessions.values()).some(s => s.displayStarted);
        if (!hasActive) {
          this.timeTracker.stopDisplayTimer(instanceUuid);
          this.startGracePeriod(instanceUuid);
        }
      }
    }, 10000);

    this.heartbeatMonitors.set(socketId, interval);
  }

  private clearHeartbeatMonitor(socketId: string): void {
    const interval = this.heartbeatMonitors.get(socketId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatMonitors.delete(socketId);
    }
  }

  private async handleQuotaExceeded(instanceUuid: string, type: 'display' | 'real'): Promise<void> {
    const instance = this.db.getInstance(instanceUuid);
    if (!instance) return;

    console.log(`[WS] Quota exceeded (${type}) for instance ${instanceUuid}`);

    this.io.to(`instance:${instanceUuid}`).emit('quota-exceeded', {
      type,
      message: type === 'display'
        ? 'Your display time limit has been reached. The session will end now.'
        : 'The server time limit has been reached. The session will end now.',
    });

    // Stop display, clear sessions, stop server
    this.timeTracker.stopDisplayTimer(instanceUuid);
    this.timeTracker.cancelGracePeriod(instanceUuid);
    instance.activeSessions.clear();
    await this.db.saveInstance(instanceUuid, instance);
    await this.stopInstanceAndNotify(instanceUuid);
  }

  private async stopInstanceAndNotify(instanceUuid: string): Promise<void> {
    const instance = this.db.getInstance(instanceUuid);
    if (!instance) return;
    if (instance.status === 'stopped' || instance.status === 'stopping') return;

    try {
      await this.ec2Service.stopInstance(instance.instanceId);
      instance.status = 'stopping';
      await this.db.saveInstance(instanceUuid, instance);
      console.log(`[WS] Instance ${instance.instanceId} stop command sent`);
    } catch (e: any) {
      console.error(`[WS] Failed to stop instance: ${e.message}`);
    }

    this.io.to(`instance:${instanceUuid}`).emit('instance-stopping', {
      message: 'The server is shutting down.',
      timestamp: Date.now(),
    });

    this.timeTracker.stopRealTimer(instanceUuid);
    this.timeTracker.stopDisplayTimer(instanceUuid);
  }

  broadcastToInstance(instanceUuid: string, event: string, data: any): void {
    this.io.to(`instance:${instanceUuid}`).emit(event, data);
  }
}
