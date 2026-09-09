import mongoose from 'mongoose';
import { config } from '../config';

let isConnected = false;

/**
 * Establishes a singleton connection to MongoDB Atlas.
 * Safe to call multiple times — will only connect once.
 */
export async function connectDB(): Promise<void> {
  if (isConnected) return;

  if (!config.MONGODB_URI) {
    throw new Error('[MongoDB] MONGODB_URI is not set in environment variables.');
  }

  try {
    await mongoose.connect(config.MONGODB_URI, {
      // Keep connection alive through network hiccups
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    isConnected = true;
    console.log('[MongoDB] Connected to Atlas successfully.');

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected from Atlas. Attempting to reconnect...');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[MongoDB] Reconnected to Atlas.');
      isConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err.message);
    });

  } catch (err: any) {
    console.error('[MongoDB] Initial connection failed:', err.message);
    throw err; // Let server.ts handle the crash gracefully
  }
}
