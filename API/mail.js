#!/usr/bin/env node
// mail.js: simple mail sender used by Django via stdin JSON
// Expects JSON: { to, subject, text, html }

const nodemailer = require('nodemailer');

async function main() {
  try {
    let input = '';
    process.stdin.setEncoding('utf8');
    for await (const chunk of process.stdin) input += chunk;
    if (!input) input = '{}';
    const payload = JSON.parse(input);
    const {
      SMTP_HOST = process.env.SMTP_HOST,
      SMTP_PORT = process.env.SMTP_PORT || 587,
      SMTP_USER = process.env.SMTP_USER,
      SMTP_PASS = process.env.SMTP_PASS
    } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.error('SMTP configuration missing in env vars');
      process.exit(2);
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || SMTP_USER,
      to: payload.to,
      subject: payload.subject || '(no subject)',
      text: payload.text || '',
      html: payload.html || undefined
    });

    console.log(JSON.stringify({ ok: true, info }));
    process.exit(0);
  } catch (err) {
    console.error('mail.js error', err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();
