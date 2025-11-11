
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY,
  },
});

export async function sendTrialRequestEmail(data: {
  name: string;
  lastName: string;
  country: string;
  email: string;
}) {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    subject: 'New Trial Request',
    text: `
      Name: ${data.name}
      Last Name: ${data.lastName}
      Country: ${data.country}
      Email: ${data.email}
    `,
  };

  await transporter.sendMail(mailOptions);
}
