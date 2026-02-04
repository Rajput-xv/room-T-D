require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('./config/database');
const apiRoutes = require('./routes/api');
const socketHandler = require('./socket/socketHandler');
const RoomService = require('./services/RoomService');

const app = express();
const server = http.createServer(app);

// Environment
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3001;

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Compression for responses
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: isProduction ? 'Internal server error' : err.message
  });
});

// MongoDB connection with retry logic
const connectWithRetry = async () => {
  const maxRetries = 5;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await mongoose.connect(config.url, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      });
      console.log('✅ MongoDB connected successfully');
      return;
    } catch (err) {
      retries++;
      console.error(`MongoDB connection attempt ${retries}/${maxRetries} failed:`, err.message);
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  console.error('❌ Failed to connect to MongoDB after maximum retries');
  process.exit(1);
};

// Initialize socket handler
socketHandler(io);

// Inactivity checker - runs every 30 seconds
let inactivityInterval;
const startInactivityChecker = () => {
  inactivityInterval = setInterval(async () => {
    try {
      await RoomService.checkAndKickInactiveMembers(io);
    } catch (err) {
      console.error('Inactivity check error:', err);
    }
  }, 30000);
};

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  // console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(() => {
    // console.log('HTTP server closed');
  });
  
  // Clear intervals
  if (inactivityInterval) {
    clearInterval(inactivityInterval);
  }
  
  // Close all socket connections
  io.close(() => {
    console.log('Socket.IO connections closed');
  });
  
  // Close MongoDB connection
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (err) {
    console.error('Error closing MongoDB:', err);
  }
  
  console.log('Graceful shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const startServer = async () => {
  await connectWithRetry();
  startInactivityChecker();
  
  server.listen(PORT, () => {
    // console.log(`\n🎮 Truth-Dare Game Backend`);
    // console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    // console.log(`🚀 Server running on port ${PORT}`);
    // console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);
  });
};

startServer();

module.exports = { app, server, io };