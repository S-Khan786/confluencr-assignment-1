import dotenv from 'dotenv';
import { createApp } from './app.js';

dotenv.config();

const app = createApp();
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Transaction Ledger API is running on http://localhost:${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down server gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
