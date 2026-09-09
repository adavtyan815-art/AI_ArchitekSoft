import { DatabaseService } from './databaseService';
import { EventEmitter } from 'events';

export class TimeTrackerService extends EventEmitter {
  private static instance: TimeTrackerService;
  private db: DatabaseService;
  private displayTimers: Map<string, NodeJS.Timeout> = new Map();
  private realTimers: Map<string, NodeJS.Timeout> = new Map();
  private gracePeriodTimers: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): TimeTrackerService {
    if (!TimeTrackerService.instance) {
      TimeTrackerService.instance = new TimeTrackerService();
    }
    return TimeTrackerService.instance;
  }

  private constructor() {
    super();
    this.db = DatabaseService.getInstance();
    this.recoverTimers();
    this.startGlobalInterval();
  }

  private recoverTimers(): void {
    const instances = this.db.getInstances();
    console.log('[TimeTracker] Recovering timers from database...');
    for (const [uuid, instance] of Object.entries(instances)) {
      if (instance.status === 'running') {
        console.log(`[TimeTracker] Resuming real-time timer for ${uuid}`);
        this.startRealTimer(uuid);
      }
      
      // Also recover display timer if there's an active display session
      const hasActiveDisplay = Array.from(instance.activeSessions.values()).some((s: any) => s.displayStarted);
      if (hasActiveDisplay) {
        console.log(`[TimeTracker] Resuming display timer for ${uuid}`);
        this.startDisplayTimer(uuid);
      }
    }
  }

  private startGlobalInterval(): void {
    // Every second, update time for all active instances
    setInterval(async () => {
      const instances = this.db.getInstances();
      let changed = false;
      
      for (const [uuid, instance] of Object.entries(instances)) {
        let updated = false;
        
        // Update display time if any active session with displayStarted
        const hasActiveDisplay = Array.from(instance.activeSessions.values()).some((s: any) => s.displayStarted);
        if (hasActiveDisplay && this.displayTimers.has(uuid)) {
          instance.displayTimeUsedSeconds += 1;
          updated = true;
          
          // Check if display quota exceeded
          const displayMax = instance.displayLimitHours * 3600;
          if (instance.displayTimeUsedSeconds >= displayMax) {
            this.emit('display-quota-exceeded', uuid);
          }
        }
        
        // Update real time if instance is running
        if (instance.status === 'running' && this.realTimers.has(uuid)) {
          instance.realTimeUsedSeconds += 1;
          updated = true;
          
          const realMax = instance.realLimitHours * 3600;
          if (instance.realTimeUsedSeconds >= realMax) {
            this.emit('real-quota-exceeded', uuid);
          }
        }
        
        if (updated) {
          await this.db.saveInstance(uuid, instance);
          changed = true;
        }
      }
    }, 1000);
  }

  startDisplayTimer(instanceUuid: string): void {
    if (!this.displayTimers.has(instanceUuid)) {
      this.displayTimers.set(instanceUuid, setTimeout(() => {}, 0));
    }
  }

  stopDisplayTimer(instanceUuid: string): void {
    const timer = this.displayTimers.get(instanceUuid);
    if (timer) {
      clearTimeout(timer);
      this.displayTimers.delete(instanceUuid);
    }
  }

  startRealTimer(instanceUuid: string): void {
    if (!this.realTimers.has(instanceUuid)) {
      this.realTimers.set(instanceUuid, setTimeout(() => {}, 0));
    }
  }

  stopRealTimer(instanceUuid: string): void {
    const timer = this.realTimers.get(instanceUuid);
    if (timer) {
      clearTimeout(timer);
      this.realTimers.delete(instanceUuid);
    }
  }

  startGracePeriod(instanceUuid: string, onTimeout: () => Promise<void>): void {
    // Clear existing grace period
    const existing = this.gracePeriodTimers.get(instanceUuid);
    if (existing) clearTimeout(existing);
    
    // Start new 60-second grace period
    const timer = setTimeout(async () => {
      await onTimeout();
      this.gracePeriodTimers.delete(instanceUuid);
    }, 60000);
    
    this.gracePeriodTimers.set(instanceUuid, timer);
  }

  cancelGracePeriod(instanceUuid: string): void {
    const timer = this.gracePeriodTimers.get(instanceUuid);
    if (timer) {
      clearTimeout(timer);
      this.gracePeriodTimers.delete(instanceUuid);
    }
  }

  hasGracePeriod(instanceUuid: string): boolean {
    return this.gracePeriodTimers.has(instanceUuid);
  }
}
