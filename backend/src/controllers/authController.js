
const User = require('../models/User');
const Setting = require('../models/Setting');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  console.log(`\n🔑 Login Attempt received for: ${email}`);

  try {
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log(`❌ Login Failed: User with email ${email} NOT FOUND in database.`);
      return res.status(400).json({ message: 'Invalid credentials (User not found)' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`❌ Login Failed: Password incorrect for ${email}`);
      return res.status(400).json({ message: 'Invalid credentials (Wrong password)' });
    }

    console.log(`✅ Login Successful for ${email} (${user.role})`);
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.register = async (req, res) => {
  const { 
    name, email, password, role, 
    companyName, companyAddress, city, state, zipCode, gstNumber, phoneNumber 
  } = req.body;

  try {
    // 1. Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 2. Create User
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Explicitly select fields to avoid passing unknowns to Sequelize
    const newUser = await User.create({ 
      name, 
      email, 
      password: hashedPassword, 
      role: role || 'Manager',
      status: 'Active'
    });

    console.log(`✅ User created: ${newUser.email}`);

    // 3. Save Settings (Business & General) if provided
    // We wrap this in a try/catch so user creation doesn't fail if settings fail
    if (companyName) {
      try {
        const fullAddress = [companyAddress, city, state, zipCode].filter(Boolean).join(', ');
        
        // Save Business Settings
        await Setting.upsert({
          key: 'business',
          value: {
            businessName: companyName,
            taxId: gstNumber || '',
            address: fullAddress
          }
        });

        // Save General Settings
        await Setting.upsert({
          key: 'general',
          value: {
            companyName: companyName,
            email: email, // Official email
            phoneNumber: phoneNumber || '',
            address: fullAddress,
            currency: 'USD',
            timezone: 'UTC',
            dateFormat: 'YYYY-MM-DD'
          }
        });

        // Save Personal Settings
        await Setting.upsert({
          key: 'personal',
          value: {
            name: name,
            email: email,
            twoFactorEnabled: false
          }
        });
        console.log(`✅ Default settings configured for ${companyName}`);
      } catch (settingsError) {
        console.error("⚠️ Failed to save default settings:", settingsError.message);
        // We do NOT return error here, as the user account is already created.
      }
    }

    res.status(201).json({ 
      message: 'User registered successfully', 
      user: { id: newUser.id, name: newUser.name, email: newUser.email } 
    });

  } catch (error) {
    console.error("❌ Registration Error:", error);
    // Return the specific error message to the frontend
    res.status(500).json({ 
      message: 'Error registering user', 
      error: error.message || 'Unknown server error' 
    });
  }
};
