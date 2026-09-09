import http from 'http';
import app from './app';
import { config } from './config';
import { connectDB } from './data/db';
import { DatabaseService } from './services/databaseService';
import { SettingsService } from './services/settingsService';
import { WebSocketService } from './services/websocketService';

const PORT = config.PORT;

async function bootstrap() {
  try {
    // 1. Connect to MongoDB Atlas first — nothing else should start without a DB
    await connectDB();

    // 2. Initialize Database (hydrates in-memory cache from MongoDB)
    const db = DatabaseService.getInstance();
    await db.init();
    console.log('[Server] Database initialized');

    // 3. Initialize Settings
    const settings = SettingsService.getInstance();
    await settings.init();
    console.log('[Server] Settings initialized');

    // 4. Create HTTP Server
    const server = http.createServer(app);

    // 5. Initialize WebSockets
    const wsService = new WebSocketService(server);
    console.log('[Server] WebSocket service initialized');

    // 6. Start Server
    server.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

bootstrap();
