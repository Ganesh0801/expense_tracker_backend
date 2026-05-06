const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

exports.sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to, subject, html
  });
};

exports.sendOTPEmail = async (user, otp) => {
  await exports.sendEmail({
    to: user.email,
    subject: 'Your OTP - ExpenseTracker',
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:40px 36px;border-radius:16px;border:1px solid #1e293b;">
        <div style="margin-bottom:28px;">
          <span style="color:#fff;font-weight:700;font-size:20px;">💰 ExpenseTracker</span>
        </div>
        <h2 style="color:#f1f5f9;font-size:22px;margin:0 0 8px;">Verify your account</h2>
        <p style="color:#94a3b8;margin:0 0 28px;font-size:14px;">Hi ${user.name}, use the OTP below to complete your registration. It expires in <strong style="color:#e2e8f0;">10 minutes</strong>.</p>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
          <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;">Your OTP Code</p>
          <p style="font-size:40px;font-weight:900;letter-spacing:12px;color:#6366f1;margin:0;">${otp}</p>
        </div>
        <p style="color:#64748b;font-size:12px;text-align:center;margin:0;">If you didn't create an account, you can safely ignore this email.</p>
      </div>`
  });
};

exports.sendVerificationEmail = async (user, token) => {
  const url = `${process.env.CLIENT_URL}/verify-email/${token}`;
  await exports.sendEmail({
    to: user.email,
    subject: 'Verify Your Email - ExpenseTracker',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:12px;">
        <h1 style="color:#6366f1;margin-bottom:8px;">ExpenseTracker</h1>
        <h2 style="color:#f1f5f9;">Verify your email</h2>
        <p>Hi ${user.name}, click the button below to verify your account:</p>
        <a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:20px 0;">Verify Email</a>
        <p style="color:#94a3b8;font-size:12px;">This link expires in 24 hours.</p>
      </div>`
  });
};

exports.sendResetEmail = async (user, token) => {
  const url = `${process.env.CLIENT_URL}/reset-password/${token}`;
  await exports.sendEmail({
    to: user.email,
    subject: 'Reset Your Password - ExpenseTracker',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:12px;">
        <h1 style="color:#6366f1;">ExpenseTracker</h1>
        <h2 style="color:#f1f5f9;">Reset your password</h2>
        <p>Hi ${user.name}, click the button to reset your password:</p>
        <a href="${url}" style="display:inline-block;background:#ef4444;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:20px 0;">Reset Password</a>
        <p style="color:#94a3b8;font-size:12px;">Expires in 10 minutes.</p>
      </div>`
  });
};

exports.sendMonthlyReportEmail = async (user, pdfBuffer, month, year) => {
  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to: user.email,
    subject: `Your Monthly Report - ${month} ${year}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:12px;"><h1 style="color:#6366f1;">ExpenseTracker</h1><h2>Your ${month} ${year} Report is Ready!</h2><p>Hi ${user.name}, please find your monthly financial report attached.</p></div>`,
    attachments: [{ filename: `report-${month}-${year}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
  });
};
