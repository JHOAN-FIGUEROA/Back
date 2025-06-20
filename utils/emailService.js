// utils/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'postwaret@gmail.com',
    pass: 'qbau mkje qwml bgof'
  }
});

const enviarCorreo = async (to, subject, html) => {
  const mailOptions = {
    from: '"Postware Soporte" <postwaret@gmail.com>',
    to,
    subject,
    html
  };

  await transporter.sendMail(mailOptions);
};

module.exports = enviarCorreo;
