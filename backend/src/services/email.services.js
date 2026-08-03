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
    <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>RideFlow OTP Email</title>
</head>
<body style="margin:0; padding:0; background-color:#ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff; padding:48px 0;">
    <tr>
      <td align="center">

        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px; width:100%; border:1px solid #e5e7eb; border-radius:20px;">

          <!-- Logo row, minimal, no color block -->
          <tr>
            <td style="padding:40px 40px 0 40px; text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="font-size:20px; font-weight:800; color:#0f172a; letter-spacing:-0.5px; font-family: Arial, sans-serif;">🚗 RideFlow</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Circular icon badge -->
          <tr>
            <td style="padding:32px 40px 0 40px; text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="width:64px; height:64px; border-radius:50%; background-color:#f1f5f9; text-align:center; vertical-align:middle; font-size:28px;">🔐</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:20px 40px 0 40px; text-align:center;">
              <p style="margin:0 0 8px 0; color:#0f172a; font-size:20px; font-weight:700;">Verify it's you, ${name}</p>
              <p style="margin:0; color:#64748b; font-size:14.5px; line-height:1.6;">
                Enter the code below to continue. It's only valid for a few minutes, so don't keep it waiting.
              </p>
            </td>
          </tr>

          <!-- OTP - bordered outline style instead of solid block -->
          <tr>
            <td style="padding:28px 40px 0 40px; text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto; border:2px dashed #cbd5e1; border-radius:12px;">
                <tr>
                  <td style="padding:20px 36px; text-align:center;">
                    <p style="margin:0; color:#0f172a; font-size:36px; font-weight:800; letter-spacing:10px; font-family: 'Courier New', monospace;">${otp}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Expiry pill -->
          <tr>
            <td style="padding:20px 40px 0 40px; text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto; background-color:#f1f5f9; border-radius:999px;">
                <tr>
                  <td style="padding:8px 18px; color:#475569; font-size:12.5px; font-weight:600;">⏰ Expires in 5 minutes</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Security note, plain text, no colored box -->
          <tr>
            <td style="padding:28px 40px 0 40px; text-align:center;">
              <p style="margin:0; color:#94a3b8; font-size:13px; line-height:1.6;">
                🔒 RideFlow will never ask for this code. If you didn't request it, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:32px 40px 0 40px;">
              <div style="border-top:1px solid #f1f5f9;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 36px 40px; text-align:center;">
              <p style="margin:0 0 4px 0; color:#94a3b8; font-size:12px;">Need help? <a href="#" style="color:#0f172a; text-decoration:underline;">Contact support</a></p>
              <p style="margin:0; color:#cbd5e1; font-size:11px;">© 2026 RideFlow. All rights reserved.</p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
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