
const User = require('../models/User');
const Setting = require('../models/Setting');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mailService = require('../services/mailService');
const { Op } = require('sequelize');

// Helper to generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.login = async (req, res) => {
  const { email, password, otp } = req.body;
  console.log(`\n🔑 Login Attempt received for: ${email}`);

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.log(`❌ Login Failed: User with email ${email} NOT FOUND.`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      console.log(`⚠️ Login Blocked: Email not verified for ${email}`);
      return res.status(403).json({ message: 'Please verify your email first', needsVerification: true });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`❌ Login Failed: Password incorrect for ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // 2FA Check (Email OTP)
    if (user.twoFactorEnabled) {
      if (!otp) {
        const code = generateOTP();
        user.otpCode = code;
        user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
        await user.save();

        const mailResult = await mailService.send({
          to: user.email,
          subject: 'Your Login Verification Code',
          html: `<p>Your verification code is: <strong>${code}</strong>. It expires in 5 minutes.</p>`
        });

        if (!mailResult.success) {
          console.error("❌ Failed to send 2FA email:", mailResult.message || mailResult.error);
          return res.status(500).json({ message: 'Failed to send verification code. Please check SMTP settings.', error: mailResult.message || mailResult.error });
        }

        console.log(`ℹ️ 2FA OTP sent to ${email}`);
        return res.json({ twoFactorRequired: true });
      }

      if (user.otpCode !== otp || user.otpExpires < new Date()) {
        console.log(`❌ 2FA Failed: Invalid or Expired OTP for ${email}`);
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      // Clear OTP after success
      user.otpCode = null;
      user.otpExpires = null;
      await user.save();
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
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      if (!existingUser.isVerified) {
        // Allow re-registration/OTP resend if not verified
        const code = generateOTP();
        existingUser.otpCode = code;
        existingUser.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
        await existingUser.save();

        await mailService.send({
          to: email,
          subject: 'Verify Your Email',
          html: `<p>Your verification code is: <strong>${code}</strong>. It expires in 5 minutes.</p>`
        });
        return res.status(200).json({ message: 'Existing unverified user. New OTP sent.', needsVerification: true });
      }
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const code = generateOTP();

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'Manager',
      status: 'Active',
      isVerified: false,
      otpCode: code,
      otpExpires: new Date(Date.now() + 5 * 60 * 1000)
    });

    const mailResult = await mailService.send({
      to: email,
      subject: 'Verify Your Email',
      html: `<p>Thank you for signing up! Your verification code is: <strong>${code}</strong>. It expires in 5 minutes.</p>`
    });

    if (!mailResult.success) {
      console.error("❌ Failed to send verification email:", mailResult.message || mailResult.error);
      return res.status(201).json({
        message: 'Registration successful, but failed to send verification email. Please check SMTP settings.',
        needsVerification: true,
        error: mailResult.message || mailResult.error
      });
    }

    res.status(201).json({ message: 'Registration successful. OTP sent to email.', needsVerification: true });

  } catch (error) {
    console.error("❌ Registration Error:", error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ where: { email, otpCode: otp, otpExpires: { [Op.gt]: new Date() } } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otpCode = null;
    user.otpExpires = null;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying OTP' });
  }
};

exports.resendOTP = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const code = generateOTP();
    user.otpCode = code;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    const mailResult = await mailService.send({
      to: email,
      subject: 'Your Verification Code',
      html: `<p>Your new verification code is: <strong>${code}</strong>. It expires in 5 minutes.</p>`
    });

    if (!mailResult.success) {
      console.error("❌ Failed to resend OTP email:", mailResult.message || mailResult.error);
      return res.status(500).json({ message: 'Failed to send OTP. Please check SMTP settings.', error: mailResult.message || mailResult.error });
    }

    res.json({ message: 'OTP resent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error resending OTP' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const code = generateOTP();
    user.otpCode = code;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    const mailResult = await mailService.send({
      to: email,
      subject: 'Password Reset Code',
      html: `<p>Your password reset code is: <strong>${code}</strong>. It expires in 5 minutes.</p>`
    });

    if (!mailResult.success) {
      console.error("❌ Failed to send password reset email:", mailResult.message || mailResult.error);
      return res.status(500).json({ message: 'Failed to send reset code. Please check SMTP settings.', error: mailResult.message || mailResult.error });
    }

    res.json({ message: 'Password reset code sent' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending reset code' });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await User.findOne({ where: { email, otpCode: otp, otpExpires: { [Op.gt]: new Date() } } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.otpCode = null;
    user.otpExpires = null;
    user.isVerified = true; // Ensure user is verified after successful reset
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password' });
  }
};
