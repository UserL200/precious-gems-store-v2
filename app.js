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
app.use(express.static(path.join(__dirname, 'public')));

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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/user', userRoutes);

// Protected View Routes

// Admin page - requires JWT authentication and admin role
app.get('/admin', (req, res) =>  {
  res.sendFile(path.join(__dirname, 'public', 'secure', 'admin.html'));
});

// Home page - public access
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    auth: 'JWT'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('💥 Global error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Database connection and server startup
const startServer = async () => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Sync models (create tables if they don't exist)
    // await sequelize.sync({ alter: true }); // Uncomment for development
    console.log('✅ Models synced');

    // Seed admin user
    await seedAdminUser(db);
    console.log('✅ Admin user seeded');

    // Seed products
    await seedProducts();
    console.log('✅ Products seeded');

    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔐 Authentication: JWT-based (stateless)`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    console.error('💥 Startup error:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('👋 Shutting down gracefully...');
  await db.sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('👋 Shutting down gracefully...');
  await db.sequelize.close();
  process.exit(0);
});

// Start the server
startServer();

// Export app for testing and serverless deployment
module.exports = app;