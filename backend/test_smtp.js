
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testSMTP() {
    console.log('🧪 Starting SMTP Test...');

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const username = process.env.SMTP_USER;
    const password = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true';
    const senderName = process.env.SMTP_SENDER_NAME;
    const senderEmail = process.env.SMTP_SENDER_EMAIL;

    console.log(`📡 Attempting connection to ${host}:${port}...`);
    console.log(`👤 User: ${username}`);

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: secure,
        auth: {
            user: username,
            pass: password
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        await transporter.verify();
        console.log('✅ Connection verified successfully!');

        const info = await transporter.sendMail({
            from: `"${senderName}" <${senderEmail}>`,
            to: senderEmail, // Sending to yourself
            subject: 'SMTP Connection Test',
            text: 'If you see this, your SMTP configuration is working correctly!'
        });

        console.log('🚀 Test email sent successfully!');
        console.log('MsgID:', info.messageId);
        process.exit(0);
    } catch (error) {
        console.error('❌ SMTP Test Failed:');
        console.error(error);
        process.exit(1);
    }
}

testSMTP();
