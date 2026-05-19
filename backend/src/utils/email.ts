import nodemailer from 'nodemailer';

export const sendEmailOTP = async (email: string, otp: string) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('-------------------------------------------');
    console.log(`[MOCK EMAIL] To: ${email}`);
    console.log(`[MOCK EMAIL] YOUR CODE IS: ${otp}`);
    console.log('-------------------------------------------');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your SecureTodo MFA Code',
    text: `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Successfully sent OTP to ${email}`);
  } catch (error) {
    console.error(`[EMAIL] Failed to send email to ${email}:`, error);
    throw error;
  }
};

