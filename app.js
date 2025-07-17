const express = require('express');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const path = require('path');
const { sequelize } = require('./models');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const referralRoutes = require('./routes/referrals');
const adminRoutes = require('./routes/admin');
const withdrawalRoutes = require('./routes/withdrawals');
const seedAdminUser = require('./seed/seedAdmin');
const db = require('./models');
const seedProducts = require('./seed/seedProducts');
const { isAdminPage } = require('./middleware/authMiddleware'); 
const sessionStore = new SequelizeStore({ 
  db: db.sequelize,
  tableName: 'Sessions' // Explicitly name the table
});


require('dotenv').config();
const app = express();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'img-src': ["'self'", 'data:', 'https://images.unsplash.com'],
    },
  },
}));
app.use(limiter);
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    domain: 'https://precious-gems-store-v4.vercel.app/',
    httpOnly: true, 
    secure: true,
    sameSite: 'none', 
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/user', userRoutes);

// Views
app.get('/admin', isAdminPage, (req, res) =>
  res.sendFile(path.join(__dirname, 'public','secure', 'admin.html'))
);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));



// Connect to DB and start server
db.sequelize.authenticate()
  .then(() => {
    console.log('✅ DB connected');
    // return sequelize.sync({ alter: true }); // Creates missing tables
  })
  .then(() => {
    console.log('✅ Models synced');
    return seedAdminUser(db);
  })
  .then(() => {
    return seedProducts();
  })
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`🚀 Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => {
    console.error('💥 Startup error:', err);
  });

// Export app for Vercel
module.exports = app;
