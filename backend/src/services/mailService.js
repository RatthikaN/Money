
const Setting = require('../models/Setting');
const nodemailer = require('nodemailer');

/**
 * Standard SMTP Mail Service using Nodemailer.
 * Handles transactional emails, OTPs, and test connections.
 */
const mailService = {
  /**
   * Send an email using stored SMTP settings.
   */
  send: async ({ to, subject, text, html }) => {
    try {
      const config = await Setting.findByPk('cloudmail');
      console.log('🔍 [Mail] Fetched config from DB. Raw Type:', typeof (config ? config.value : 'NULL'));

      if (!config || !config.value) {
        console.log('⚠️ [Mail] ERROR: No SMTP configuration found in the database.');
        return { success: false, message: 'SMTP configuration missing.' };
      }

      // Defensive Parsing: Some database dialects return JSON as string
      let smtpConfig = config.value;
      if (typeof smtpConfig === 'string') {
        try {
          smtpConfig = JSON.parse(smtpConfig);
          console.log('✨ [Mail] Config parsed from JSON string.');
        } catch (e) {
          console.error('❌ [Mail] Failed to parse config JSON string:', e.message);
          return { success: false, message: 'Invalid SMTP configuration format.' };
        }
      }

      const { host, port, username, password, secure, senderName, senderEmail, isEnabled } = smtpConfig;

      if (!isEnabled) {
        console.log('⚠️ [Mail] INFO: Delivery bypassed. Master Switch (isEnabled) is:', isEnabled);
        return { success: false, message: 'Mail delivery is disabled.' };
      }

      if (!host || !username) {
        console.log('⚠️ [Mail] ERROR: SMTP Host or Username missing.');
        return { success: false, message: 'SMTP credentials incomplete.' };
      }

      console.log(`📡 [Mail] Creating transporter for ${host}:${port}...`);

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: secure || false,
        auth: {
          user: username,
          pass: password
        },
        // Support older SMTP servers if needed
        tls: {
          rejectUnauthorized: false
        }
      });

      console.log(`🚀 [Mail] Sending email to ${to}...`);

      const info = await transporter.sendMail({
        from: `"${senderName || 'MoneyFlow'}" <${senderEmail || username}>`,
        to,
        subject,
        text,
        html
      });

      console.log(`✅ [Mail] SUCCESS: Message sent! MsgID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error('❌ [Mail] CRITICAL ERROR:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Test a specific SMTP configuration (used by settings UI).
   */
  test: async (config) => {
    try {
      const { host, port, username, password, secure, senderEmail, senderName } = config;

      if (!host || !username) {
        throw new Error('Host and Username are required for the test.');
      }

      console.log(`🧪 [Mail] Running SMTP Test for ${host}...`);

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: secure || false,
        auth: {
          user: username,
          pass: password
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection configuration
      await transporter.verify();
      console.log('✅ [Mail] Transporter verified.');

      // Send actual test email
      const info = await transporter.sendMail({
        from: `"${senderName || 'MoneyFlow Test'}" <${senderEmail || username}>`,
        to: senderEmail || username,
        subject: 'MoneyFlow SMTP Connection Test',
        html: `
          <div style="font-family:sans-serif;padding:30px;border:3px solid #4f46e5;border-radius:16px;background-color:#f5f3ff;">
            <h2 style="color:#4f46e5;margin-top:0;">✅ SMTP Connection Successful!</h2>
            <p>Your MoneyFlow application is now successfully connected to your mail server.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
            <p style="font-size:12px;color:#6b7280;">
              <strong>Host:</strong> ${host}<br/>
              <strong>Port:</strong> ${port}<br/>
              <strong>User:</strong> ${username}
            </p>
          </div>
        `
      });

      console.log(`✅ [Mail] Test Successful. MsgID: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error(`❌ [Mail] Test Service Error:`, error.message);
      throw new Error(`SMTP Handshake Failed: ${error.message}`);
    }
  }
};

module.exports = mailService;
