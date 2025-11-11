
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY,
  },
});

export async function sendTrialRequestEmail(requesterEmail: string, name: string, country: string) {
  const mailOptions = {
    from: process.env.EMAIL_SENDER, // sender address
    to: process.env.ADMIN_EMAIL, // list of receivers
    subject: 'New Trial Request', // Subject line
    text: `New trial request:\n\nName: ${name}\nEmail: ${requesterEmail}\nCountry: ${country}`, // plain text body
    html: `<p><strong>New trial request</strong></p><p><strong>Name:</strong> ${name}<br/><strong>Email:</strong> ${requesterEmail}<br/><strong>Country:</strong> ${country}</p>`, // html body
  };

  await transporter.sendMail(mailOptions);
}

export async function sendTrialCredentialsEmail(email: string, name: string, username: string, password: string) {
    const mailOptions = {
        from: process.env.EMAIL_SENDER,
        to: email,
        subject: 'Your AutoPlanCam Trial Credentials',
  text: `Hi ${name},

Welcome to AutoPlanCam! Your trial account has been activated.

Here are your credentials to access the AutoPlanCam trial:

Email/Username: ${username}
Password: ${password}

Trial Details:
- Duration: 3 days
- Report Limit: 5 reports
- Access URL: https://autoplancam.vercel.app/

If you have any questions, feel free to reach out to our support team.

Thanks,
The AutoPlanCam Team`,
  html: `<p>Hi ${name},</p><p>Welcome to AutoPlanCam! Your trial account has been activated.</p><p><b>Here are your credentials to access the AutoPlanCam trial:</b></p><p><strong>Email/Username:</strong> ${username}<br><strong>Password:</strong> ${password}</p><p><b>Trial Details:</b><br>- Duration: 3 days<br>- Report Limit: 5 reports<br>- Access URL: <a href="https://autoplancam.vercel.app/">https://autoplancam.vercel.app/</a></p><p>If you have any questions, feel free to reach out to our support team.</p><p>Thanks,<br>The AutoPlanCam Team</p>`,
    };

    await transporter.sendMail(mailOptions);
}
