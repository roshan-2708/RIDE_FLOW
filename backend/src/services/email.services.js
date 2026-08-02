const SibApiV3Sdk = require('sib-api-v3-sdk');

const mailSender = async (email, title, body) => {
    try {
        const defaultClient = SibApiV3Sdk.ApiClient.instance;

        // API Key setup
        const apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = process.env.BREVO_API_KEY;

        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

        const fromEmail = process.env.FROM_EMAIL || process.env.BREVO_SMTP_USER || 'roshanpatra275@gmail.com';
        const fromName = process.env.FROM_NAME || 'RideFlow';

        // Email Configuration
        sendSmtpEmail.subject = title;
        sendSmtpEmail.htmlContent = body;
        sendSmtpEmail.sender = { name: fromName, email: fromEmail };
        sendSmtpEmail.to = [{ email: email }];

        // Send call
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log("✅ OTP Sent Successfully via Brevo SDK:", data.messageId || data);
        return data;

    } catch (error) {
        console.error("❌ Brevo SDK Error:", error.response ? error.response.body : error.message);
        throw error;
    }
};

const sendOTPEmail = async (email, name, otp, purpose) => {
    const subject = purpose === 'LOGIN' 
      ? 'Your RideFlow Login OTP' 
      : 'Verify your RideFlow Account';

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #000; padding: 20px; text-align: center;">
        <h1 style="color: #FFD700; margin: 0;">🚗 RideFlow</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2>Hello, ${name}! 👋</h2>
        <p>Your One-Time Password (OTP) is:</p>
        <div style="background: #000; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
          <h1 style="color: #FFD700; font-size: 40px; letter-spacing: 10px; margin: 0;">${otp}</h1>
        </div>
        <p style="color: #666;">⏰ This OTP expires in <strong>5 minutes</strong></p>
        <p style="color: #666;">🔒 Never share this OTP with anyone</p>
      </div>
      <div style="background: #eee; padding: 15px; text-align: center; color: #999; font-size: 12px;">
        © 2024 RideFlow. All rights reserved.
      </div>
    </div>
    `;

    try {
        return await mailSender(email, subject, htmlContent);
    } catch (error) {
        console.log(`🔑 [DEV MODE FALLBACK] OTP for ${email}: ${otp}`);
        if (process.env.NODE_ENV === 'production') {
            throw error;
        }
    }
};

module.exports = { mailSender, sendOTPEmail };