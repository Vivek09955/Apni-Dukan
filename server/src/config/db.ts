import mongoose from 'mongoose';
import { config } from './env';

export const connectDB = async (): Promise<typeof mongoose> => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI, {
      autoIndex: config.NODE_ENV !== 'production',
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);

    // Check if replica set is available (needed for transactions)
    try {
      const adminDb = conn.connection.db!.admin();
      const status = await adminDb.command({ replSetGetStatus: 1 });
      if (status.ok) {
        console.log('[MongoDB] Replica set detected — transactions enabled.');
      }
    } catch {
      console.warn('[MongoDB] ⚠ Running without replica set — transactions disabled.');
      console.warn('[MongoDB]   Multi-document operations will run without atomicity.');
      console.warn('[MongoDB]   For production, enable replica set: ?replicaSet=rs0');
    }

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected from database');
    });

    return conn;
  } catch (error) {
    console.error('[MongoDB] Connection failed:', error);
    console.error('[MongoDB] Make sure MongoDB is running on the configured host.');
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected successfully');
  } catch (error) {
    console.error('[MongoDB] Error during disconnection:', error);
    throw error;
  }
};

export default connectDB;
