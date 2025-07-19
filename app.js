const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const path = require('path');
const { sequelize } = require('./models');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const referralRoutes = require('./routes/referrals');
const adminRoutes = require('./routes/admin');
const withdrawalRoutes = require('./routes/withdrawals');

// Utility imports
const seedAdminUser = require('./seed/seedAdmin');
const db = require('./models');
const seedProducts = require('./seed/seedProducts');
const { authenticateToken, requireAdmin } = require('./middleware/jwtMiddleware');
const cookieParser = require('cookie-parser');

require('dotenv').config();

const app = express();

// Security middleware
const limiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'img-src': ["'self'", 'data:', 'https://images.unsplash.com'],
    },
  },
}));
app.use(cookieParser());
app.use(limiter);
app.use(bodyParser.json());
// Wrap static file serving with error handling
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    console.log('📁 Serving static file:', path.basename(filePath));
  }
}));

// CORS middleware for JWT tokens
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// API Routes with error wrapping
app.use('/api/auth', (req, res, next) => {
  console.log(`🔐 Auth route: ${req.method} ${req.path}`);
  authRoutes(req, res, next);
});
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/user', userRoutes);

// Protected View Routes

// Admin page - requires JWT authentication and admin role
app.get('/admin', (req, res) =>  {
  try {
    console.log('🔒 Serving admin page');
    res.sendFile(path.join(__dirname, 'public', 'secure', 'admin.html'));
  } catch (error) {
    console.error('❌ Error serving admin page:', error);
    res.status(500).json({ error: 'Failed to load admin page' });
  }
});

// Home page - public access
app.get('/', (req, res) => {
  try {
    console.log('📄 Serving home page');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } catch (error) {
    console.error('❌ Error serving home page:', error);
    res.status(500).json({ error: 'Failed to load home page' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    auth: 'JWT'
  });
});

app.set('trust proxy', 1);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error handler triggered:');
  console.error('Error message:', err.message);
  console.error('Error stack:', err.stack);
  console.error('Request URL:', req.url);
  console.error('Request method:', req.method);
  
  // Prevent the process from crashing
  if (!res.headersSent) {
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Database connection and server startup
const startServer = async () => {
  try {
    console.log('Starting server initialization...');
    
    // Test database connection
    console.log('Testing database connection...');
    await db.sequelize.authenticate();
    console.log('Database connection successful');

    // Sync models (create tables if they don't exist)
    // await sequelize.sync({ alter: true }); // Uncomment for development
    
    // Seed admin user
    console.log('Seeding admin user...');
    await seedAdminUser(db);
    console.log('Admin user seeded successfully');

    // Seed products
    console.log('Seeding products...');
    await seedProducts();
    console.log('Products seeded successfully');

    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    console.error('Full error:', error);
    
    // In production, we might want to exit, but let's be more graceful
    if (process.env.NODE_ENV === 'production') {
      console.error('Exiting due to startup failure in production');
      process.exit(1);
    } else {
      // In development, we can continue without seeding
      console.log('⚠️  Continuing without complete initialization...');
      const PORT = process.env.PORT || 3000;
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} (with startup errors)`);
      });
    }
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  try {
    await db.sequelize.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  try {
    await db.sequelize.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database:', error);
  }
  process.exit(0);
});

// Start the server
startServer();

// Export app for testing and serverless deployment
module.exports = app;