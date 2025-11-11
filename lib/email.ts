
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY,
  },
});

function loadTranslations(lang: string) {
  try {
    const file = path.join(process.cwd(), 'public', 'locales', lang, 'translation.json');
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    // fallback to English
    try {
      const file = path.join(process.cwd(), 'public', 'locales', 'en', 'translation.json');
      const raw = fs.readFileSync(file, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      return {};
    }
  }
}

export async function sendTrialRequestEmail(requesterEmail: string, name: string, country: string, lang: string = 'en') {
  const t = loadTranslations(lang);
  const subject = (t['email.trial.subject_admin'] as string) || 'New Trial Request';
  const template = (t['email.trial.body_admin'] as string) || 'New trial request:\n\nName: {{name}}\nEmail: {{email}}\nCountry: {{country}}';
  const text = template.replace('{{name}}', name).replace('{{email}}', requesterEmail).replace('{{country}}', country);
  const html = `<p><strong>New trial request</strong></p><p><strong>Name:</strong> ${name}<br/><strong>Email:</strong> ${requesterEmail}<br/><strong>Country:</strong> ${country}</p>`;

  const mailOptions = {
    from: process.env.EMAIL_SENDER,
    to: process.env.ADMIN_EMAIL,
    subject,
    text,
    html,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendTrialCredentialsEmail(email: string, name: string, username: string, password: string, lang: string = 'en') {
    const t = loadTranslations(lang);
    const subject = (t['email.trial.subject_user'] as string) || 'Your AutoPlanCam Trial Credentials';
    const template = (t['email.trial.body_user'] as string) || '';
    const accessUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://autoplancam.vercel.app/';
    const text = template
      .replace('{{name}}', name)
      .replace('{{username}}', username)
      .replace('{{password}}', password)
      .replace('{{access_url}}', accessUrl);

    const html = `<p>Hi ${name},</p><p>Welcome to AutoPlanCam! Your trial account has been activated.</p><p><b>Here are your credentials to access the AutoPlanCam trial:</b></p><p><strong>Email/Username:</strong> ${username}<br><strong>Password:</strong> ${password}</p><p><b>Trial Details:</b><br>- Duration: 3 days<br>- Report Limit: 5 reports<br>- Access URL: <a href="${accessUrl}">${accessUrl}</a></p><p>If you have any questions, feel free to reach out to our support team.</p><p>Thanks,<br>The AutoPlanCam Team</p>`;

    const mailOptions = {
        from: process.env.EMAIL_SENDER,
        to: email,
        subject,
        text,
        html,
    };

    await transporter.sendMail(mailOptions);
}
