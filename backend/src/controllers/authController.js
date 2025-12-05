
const User = require('../models/User');
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
  const { name, email, password, role } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashedPassword, role: role || 'Manager' });
    res.status(201).json({ message: 'User registered', user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error });
  }
};
