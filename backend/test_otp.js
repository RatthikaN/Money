const { authenticator } = require('otplib');
const qrcode = require('qrcode');

async function test() {
    try {
        console.log('Generating secret...');
        const secret = authenticator.generateSecret();
        console.log('Secret:', secret);

        console.log('Generating keyuri...');
        const otpauth = authenticator.keyuri('test@example.com', 'MoneyFlow', secret);
        console.log('KeyURI:', otpauth);

        console.log('Generating QR...');
        const imageUrl = await qrcode.toDataURL(otpauth);
        console.log('QR Code URL length:', imageUrl.length);
        console.log('Test Success!');
    } catch (err) {
        console.error('Test Failed:', err);
    }
}

test();
