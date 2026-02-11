
const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, status } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    // Hash password (default if not provided, e.g. for clients)
    const salt = await bcrypt.genSalt(10);
    const passToHash = password || 'default123';
    const hashedPassword = await bcrypt.hash(passToHash, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'Manager',
      status: status || 'Active'
    });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, email, role, status, password } = req.body;

    const updates = { name, email, role, status };

    // Only update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }

    await user.update(updates);

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Prevent deleting the last Admin (optional safety check, skipped for now)
    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
};

const Incoming = require('../models/Incoming');
const archiver = require('archiver');

exports.exportClientData = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Client not found' });

    // Fetch transactions linked to this client name
    // Note: Incoming model uses 'client' string field, not foreign key
    const transactions = await Incoming.findAll({ where: { client: user.name } });

    // Create Archive
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.attachment(`client-${user.name.replace(/\s+/g, '_')}-export.zip`);
    archive.pipe(res);

    // 1. Client Details Text File
    const clientDetails = `Client Details\n\n` +
      `Name: ${user.name}\n` +
      `Email: ${user.email}\n` +
      `Role: ${user.role}\n` +
      `Status: ${user.status}\n` +
      `Exported At: ${new Date().toLocaleString()}\n`;

    archive.append(clientDetails, { name: 'client_details.txt' });

    // 2. Transactions CSV
    let csvContent = "Date,Transaction ID,Amount,Paid Amount,Status,Mode,Type\n";
    transactions.forEach(t => {
      const row = [
        t.date,
        t.transactionNo || 'N/A', // Assuming transactionNo exists on Incoming model
        t.actualAmount,
        t.paidAmount,
        t.status,
        t.mode,
        t.paymentType
      ].map(field => `"${field}"`).join(',');
      csvContent += row + "\n";
    });

    archive.append(csvContent, { name: 'transactions.csv' });

    await archive.finalize();

  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({ message: 'Error generating export' });
  }
};
