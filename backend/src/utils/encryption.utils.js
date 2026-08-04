const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.CHAT_ENCRYPTION_KEY || 'rideflow_chat_key_32charslong123';
const KEY = crypto.scryptSync(SECRET_KEY, 'salt', 32);

// Encrypt message before saving to DB
const encryptMessage = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
};

//  Decrypt message when reading from DB
const decryptMessage = (encryptedText) => {
  try {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    return '[Encrypted Message]';
  }
};

module.exports = { encryptMessage, decryptMessage };