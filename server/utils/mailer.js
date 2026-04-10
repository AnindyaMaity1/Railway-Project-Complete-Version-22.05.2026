const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS // Use App Password for Gmail
  }
});

/**
 * Send email notification to inspector
 * @param {string} to - Inspector's email
 * @param {string} subject - Email subject
 * @param {string} html - Email content (HTML)
 */
const sendEmail = async (to, subject, html) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.warn('Gmail credentials not found. Email not sent.');
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Railway Admin" <admin@gmail.com>`,
      to,
      subject,
      html
    });
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { sendEmail };
