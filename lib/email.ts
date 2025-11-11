
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY,
  },
});

export async function sendTrialRequestEmail(email: string, name: string) {
  const mailOptions = {
    from: process.env.EMAIL_SENDER, // sender address
    to: process.env.ADMIN_EMAIL, // list of receivers
    subject: 'New Trial Request', // Subject line
    text: `You have a new trial request from ${name} (${email}).`, // plain text body
    html: `<b>You have a new trial request from ${name} (${email}).</b>`, // html body
  };

  await transporter.sendMail(mailOptions);
}

export async function sendTrialCredentialsEmail(email: string, name: string) {
    const mailOptions = {
        from: process.env.EMAIL_SENDER,
        to: email,
        subject: 'Your AutoPlanCam Trial Credentials',
        text: `Hi ${name},

Here are your credentials to access the AutoPlanCam trial:

[credentials]

Thanks,
The AutoPlanCam Team`,
        html: `<p>Hi ${name},</p><p>Here are your credentials to access the AutoPlanCam trial:</p><p><b>[credentials]</b></p><p>Thanks,<br>The AutoPlanCam Team</p>`,
    };

    await transporter.sendMail(mailOptions);
}
