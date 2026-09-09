import { InstanceRegistry, InstanceWithSessions } from '../types/instance.types';
import { InstanceModel } from '../data/models/InstanceModel';

export class DatabaseService {
  private static instance: DatabaseService;
  private cache: InstanceRegistry = {
    instances: {},
    lastBackup: new Date().toISOString(),
    version: 1,
  };

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // -----------------------------------------------------------------------
  // Startup: pull all documents from Mongo into the in-memory cache
  // -----------------------------------------------------------------------
  async init(): Promise<void> {
    try {
      const docs = await InstanceModel.find({}).lean();
      for (const doc of docs) {
        // Revive activeSessions plain-object → Map
        const sessionsPlain: Record<string, any> = doc.activeSessions || {};
        const sessionsMap = new Map(Object.entries(sessionsPlain));
        this.cache.instances[doc.uuid] = {
          uuid: doc.uuid,
          instanceId: doc.instanceId,
          displayLimitHours: doc.displayLimitHours,
          realLimitHours: doc.realLimitHours,
          displayTimeUsedSeconds: doc.displayTimeUsedSeconds ?? 0,
          realTimeUsedSeconds: doc.realTimeUsedSeconds ?? 0,
          status: doc.status as any,
          createdAt: doc.createdAt,
          lastActiveAt: doc.lastActiveAt,
          expiresAt: doc.expiresAt,
          assignedTo: doc.assignedTo ?? null,
          ec2Config: doc.ec2Config,
          activeSessions: sessionsMap,
        } as InstanceWithSessions;
        // Preserve lastError which is an extended runtime field
        if ((doc as any).lastError != null) {
          (this.cache.instances[doc.uuid] as any).lastError = (doc as any).lastError;
        }
      }
      console.log(`[DatabaseService] Loaded ${docs.length} instance(s) from MongoDB.`);
    } catch (err: any) {
      console.error('[DatabaseService] Failed to load instances from MongoDB:', err.message);
      throw err;
    }
  }

  // -----------------------------------------------------------------------
  // Synchronous reads — always served from cache (0 ms latency)
  // -----------------------------------------------------------------------
  getInstances(): Record<string, InstanceWithSessions> {
    return this.cache.instances;
  }

  getInstance(uuid: string): InstanceWithSessions | null {
    return this.cache.instances[uuid] ?? null;
  }

  // -----------------------------------------------------------------------
  // Writes — update cache first, then persist to Mongo asynchronously
  // -----------------------------------------------------------------------
  async saveInstance(uuid: string, instance: InstanceWithSessions): Promise<void> {
    // 1. Update in-memory cache immediately (keeps WebSocket / timer code snappy)
    this.cache.instances[uuid] = instance;

    // 2. Serialize Map → plain object for Mongo storage
    const sessionsPlain = Object.fromEntries(instance.activeSessions);

    const payload = {
      uuid: instance.uuid,
      instanceId: instance.instanceId,
      displayLimitHours: instance.displayLimitHours,
      realLimitHours: instance.realLimitHours,
      displayTimeUsedSeconds: instance.displayTimeUsedSeconds,
      realTimeUsedSeconds: instance.realTimeUsedSeconds,
      status: instance.status,
      createdAt: instance.createdAt,
      lastActiveAt: instance.lastActiveAt,
      expiresAt: instance.expiresAt,
      assignedTo: instance.assignedTo,
      lastError: (instance as any).lastError ?? null,
      ec2Config: instance.ec2Config,
      activeSessions: sessionsPlain,
    };

    // 3. Upsert to MongoDB (non-blocking — errors are logged, not thrown)
    InstanceModel.findOneAndUpdate({ uuid }, payload, { upsert: true, returnDocument: 'after' })
      .catch((err: any) => {
        console.error(`[DatabaseService] Failed to persist instance ${uuid}:`, err.message);
      });
  }

  async deleteInstance(uuid: string): Promise<boolean> {
    if (!this.cache.instances[uuid]) return false;

    // 1. Remove from cache immediately
    delete this.cache.instances[uuid];

    // 2. Remove from MongoDB (non-blocking)
    InstanceModel.deleteOne({ uuid })
      .catch((err: any) => {
        console.error(`[DatabaseService] Failed to delete instance ${uuid} from MongoDB:`, err.message);
      });

    return true;
  }
}
