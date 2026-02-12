const Setting = require('../models/Setting');
const User = require('../models/User');
const mailService = require('../services/mailService');
const bcrypt = require('bcryptjs');

exports.getSection = async (req, res) => {
  try {
    const { section } = req.params;
    const cleanSection = section.toLowerCase();

    if (cleanSection === 'personal') {
      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.json({ name: user.name, email: user.email, twoFactorEnabled: user.twoFactorEnabled || false });
    }

    const setting = await Setting.findByPk(cleanSection);
    res.json(setting ? setting.value : {});
  } catch (error) {
    console.error(`❌ [Settings] Get Section Error (${req.params.section}):`, error);
    res.status(500).json({ message: 'Server error fetching configuration' });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const { section } = req.params;
    const cleanSection = section.toLowerCase();
    const data = req.body;

    // Handle internal push-subscription update
    if (cleanSection === 'push-subscription') {
      const user = await User.findByPk(req.user.id);
      if (user) {
        user.pushSubscription = data;
        await user.save();
        return res.json({ message: 'Push subscription updated' });
      }
    }

    // Handle Security Settings (Change Password)
    if (cleanSection === 'security') {
      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const { currentPassword, newPassword } = data;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and New Password are required.' });
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect current password.' });
      }

      // Hash and update new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();

      return res.json({ message: 'Password updated successfully.' });
    }

    if (cleanSection === 'personal') {
      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (data.name) user.name = data.name;
      if (typeof data.twoFactorEnabled !== 'undefined') user.twoFactorEnabled = data.twoFactorEnabled;
      await user.save();
      return res.json({ message: 'Profile updated successfully', data: { name: user.name, email: user.email, twoFactorEnabled: user.twoFactorEnabled } });
    }

    // Handle Generic Settings Sections
    // Using FindOne + Save which is more reliable for JSON types in some Sequelize environments
    let settingRecord = await Setting.findByPk(cleanSection);

    if (settingRecord) {
      settingRecord.value = data;
      await settingRecord.save();
    } else {
      await Setting.create({
        key: cleanSection,
        value: data
      });
    }

    res.json({
      message: `${section} settings saved successfully`,
      data: data
    });
  } catch (error) {
    console.error(`❌ [Settings] Update Failure (${req.params.section}):`, error);
    res.status(500).json({ message: 'Database storage failure', details: error.message });
  }
};

exports.testConnection = async (req, res) => {
  try {
    if (!req.body.host || !req.body.username) {
      return res.status(400).json({ message: 'Missing SMTP Host or Username.' });
    }
    const result = await mailService.test(req.body);
    if (result === true) {
      return res.json({ message: "SMTP Connection Successful!" });
    } else {
      return res.status(400).json({ message: 'SMTP Connection Failed' });
    }
  } catch (error) {
    return res.status(400).json({ message: 'SMTP Connection Failed', error: error.message });
  }
};

exports.send2FA = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate TOTP Secret
    const { authenticator } = require('otplib');
    const qrcode = require('qrcode');

    // Generate a new secret for the user
    const secret = authenticator.generateSecret();

    // Save secret to user but keep 2FA disabled until verified
    user.twoFactorSecret = secret;
    await user.save();

    // Create otpauth URL (Standard format for Authenticator apps)
    // Label: MoneyFlow (User Email)
    const otpauth = authenticator.keyuri(user.email, 'MoneyFlow', secret);

    // Generate QR Code as Data URL
    const imageUrl = await qrcode.toDataURL(otpauth);

    res.json({
      message: 'Scan the QR code with your Authenticator App',
      qrCode: imageUrl,
      secret: secret
    });
  } catch (error) {
    console.error("2FA Gen Error:", error);
    res.status(500).json({ message: 'Error generating 2FA QR code.' });
  }
};

exports.verify2FA = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ message: '2FA setup not initiated.' });
    }

    const { authenticator } = require('otplib');

    // Verify the token against the secret
    // authenticator.check(token, secret)
    const isValid = authenticator.check(code, user.twoFactorSecret);

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid Verification Code' });
    }

    user.twoFactorEnabled = true;
    await user.save();

    res.json({ message: 'Two-factor authentication enabled successfully.' });
  } catch (error) {
    console.error("2FA Verify Error:", error);
    res.status(500).json({ message: 'Verification failed.' });
  }
};
