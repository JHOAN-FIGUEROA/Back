// utils/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'jhoan24figueroa@gmail.com',
    pass: 'jjtm csmk tuqd fnus'
  }
});

const enviarCorreo = async (to, subject, html) => {
  const mailOptions = {
    from: 'jhoan24figueroa@gmail.com',
    to,
    subject: 'Bienvenido a nuestra plataforma de Postware',
    html
  };

  await transporter.sendMail(mailOptions);
};

module.exports = enviarCorreo;
