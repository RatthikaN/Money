
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const sequelize = require('./config/db');
const User = require('./models/User');
const Expense = require('./models/Expense');
const Incoming = require('./models/Incoming');
const Recurring = require('./models/Recurring');
const Setting = require('./models/Setting'); // Import Setting Model

// Config
dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/incoming', require('./routes/incomingRoutes'));
app.use('/api/recurring', require('./routes/recurringRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes')); // Register Settings Route

// Start Job Scheduler
require('./jobs/cron');

// Server & Database Logic
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Retry logic for DB connection
    let retries = 5;
    while (retries) {
      try {
        await sequelize.authenticate();
        console.log('✅ Database Connection Established');
        break;
      } catch (err) {
        console.log(`⚠️ Database connection failed. Retrying in 5s... (${retries} attempts left)`);
        console.log(`   Error: ${err.message}`);
        retries -= 1;
        await new Promise(res => setTimeout(res, 5000));
      }
    }

    if (retries === 0) {
      throw new Error('❌ Could not connect to Database after multiple attempts. Is MySQL running?');
    }

    // Sync models
    await sequelize.sync({ alter: true });
    console.log('✅ Models Synced');

    // CHECK & LIST USERS
    const allUsers = await User.findAll();
    
    if (allUsers.length > 0) {
      console.log('\n---------------------------------------------------');
      console.log('✅ CURRENT ACTIVE USERS IN DATABASE (Login with these):');
      allUsers.forEach(u => {
        console.log(`   👉 Email: ${u.email.padEnd(25)} | Role: ${u.role}`);
      });
      console.log('   🔑 Password for all default users: "demo"');
      console.log('---------------------------------------------------\n');
    } else {
      console.log('🌱 Database is empty. Seeding default users...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('demo', salt);

      await User.bulkCreate([
        { name: 'Admin User', email: 'admin@demo.com', password: hashedPassword, role: 'Admin', status: 'Active' },
        { name: 'Manager User', email: 'manager@demo.com', password: hashedPassword, role: 'Manager', status: 'Active' },
        { name: 'Accountant User', email: 'accountant@demo.com', password: hashedPassword, role: 'Accountant', status: 'Active' },
        { name: 'Auditor User', email: 'auditor@demo.com', password: hashedPassword, role: 'Auditor', status: 'Active' },
      ]);
      console.log('✅ Default users created! Use email: admin@demo.com / password: demo');
    }

    // Start Server
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

  } catch (err) {
    console.error('❌ Server Startup Failed:', err.message);
    process.exit(1);
  }
};

startServer();
