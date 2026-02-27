
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const sequelize = require('./config/db');
const User = require('./models/User');
const Expense = require('./models/Expense');
const Incoming = require('./models/Incoming');
const Recurring = require('./models/Recurring');
const Setting = require('./models/Setting');

// Config
dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true, parameterLimit: 50000 }));

// Request Logger Middleware
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url} (Original: ${req.originalUrl})`);
  next();
});

// Create a central router for all API and backend routes
const mainRouter = express.Router();

// Health check on the main router
mainRouter.get('/', (req, res) => {
  res.json({
    message: '🚀 Kanakkan Backend is Running!',
    status: 'OK',
    timestamp: new Date().toISOString(),
    requestedUrl: req.originalUrl,
    baseUrl: req.baseUrl
  });
});

// Register API routes on the main router
console.log('🛣️ Registering Routes on Main Router...');
mainRouter.use('/auth', require('./routes/authRoutes'));
mainRouter.use('/expenses', require('./routes/expenseRoutes'));
mainRouter.use('/incoming', require('./routes/incomingRoutes'));
mainRouter.use('/recurring', require('./routes/recurringRoutes'));
mainRouter.use('/dashboard', require('./routes/dashboardRoutes'));
mainRouter.use('/users', require('./routes/userRoutes'));
mainRouter.use('/settings', require('./routes/settingsRoutes'));
mainRouter.use('/notifications', require('./routes/notificationRoutes'));

// Mount the main router at multiple possible paths to handle prefixing
app.use('/backend/api', mainRouter);
app.use('/backend', mainRouter);
app.use('/api', mainRouter);
app.use('/', mainRouter);

console.log('✅ Routes Registered');

// 404 Handler for undefined routes
app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.url} (Original: ${req.originalUrl})`);
  res.status(404).json({
    error: 'Route Not Found',
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    message: 'If you expect this route to work, please check your server logs and routing configuration.'
  });
});

// Start Job Scheduler
require('./jobs/cron');

// Server & Database Logic
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    let retries = 5;
    while (retries) {
      try {
        await sequelize.authenticate();
        console.log('✅ Database Connection Established');
        break;
      } catch (err) {
        console.log(`⚠️ Database connection failed. Retrying in 5s... (${retries} attempts left)`);
        retries -= 1;
        await new Promise(res => setTimeout(res, 5000));
      }
    }

    if (retries === 0) {
      throw new Error('❌ Could not connect to Database after multiple attempts.');
    }

    await sequelize.sync({ alter: true });
    console.log('✅ Models Synced');

    const allUsers = await User.findAll();
    if (allUsers.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('demo', salt);
      await User.bulkCreate([
        { name: 'Admin User', email: 'admin@demo.com', password: hashedPassword, role: 'Admin', status: 'Active' },
        { name: 'Manager User', email: 'manager@demo.com', password: hashedPassword, role: 'Manager', status: 'Active' },
        { name: 'Accountant User', email: 'accountant@demo.com', password: hashedPassword, role: 'Accountant', status: 'Active' },
        { name: 'Auditor User', email: 'auditor@demo.com', password: hashedPassword, role: 'Auditor', status: 'Active' },
      ]);
    }

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Server Startup Failed:', err.message);
    process.exit(1);
  }
};

startServer();
