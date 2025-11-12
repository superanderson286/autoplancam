import 'dotenv/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { db } from '../db/index.js';
import fs from 'fs';

async function run() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations applied.');

  // quick test: send a test email if SENDGRID_API_KEY present
  if (process.env.SENDGRID_API_KEY) {
    console.log('SENDGRID_API_KEY present; attempting test send via nodemailer...');
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({ host: 'smtp.sendgrid.net', port: 587, auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY } });
    try {
      const res = await transporter.sendMail({ from: process.env.EMAIL_SENDER, to: process.env.ADMIN_EMAIL, subject: 'Test Email', text: 'This is a test' });
      console.log('Test email sent', res);
    } catch (e) {
      console.error('Test email failed', e);
    }
  } else {
    console.log('No SENDGRID_API_KEY configured; skipping email test.');
  }
}

run().catch(err => { console.error(err); process.exit(1); });
