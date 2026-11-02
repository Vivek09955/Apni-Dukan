import { app } from './app';
import { connectDB, disconnectDB } from './config/db';
import { config } from './config/env';

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start HTTP server
    const server = app.listen(config.PORT, () => {
      console.log(`=================================================`);
      console.log(`🚀 Apni Dukan API Server running on port ${config.PORT}`);
      console.log(`📡 Environment: ${config.NODE_ENV}`);
      console.log(`🌐 Base URL: http://localhost:${config.PORT}/api`);
      console.log(`=================================================`);
    });

    // Graceful shutdown helper
    const handleShutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        console.log('[Server] HTTP server closed');
        try {
          await disconnectDB();
          console.log('[Server] Graceful shutdown completed');
          process.exit(0);
        } catch (err) {
          console.error('[Server] Error during database disconnect:', err);
          process.exit(1);
        }
      });

      // Force shutdown after timeout
      setTimeout(() => {
        console.error('[Server] Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // Process event listeners
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

    process.on('unhandledRejection', (reason: any) => {
      console.error('[Server] Unhandled Promise Rejection:', reason);
      // In production, log and optionally restart/shutdown safely
    });

    process.on('uncaughtException', (error: Error) => {
      console.error('[Server] Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
