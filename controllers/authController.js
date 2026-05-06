const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendResetEmail, sendOTPEmail } = require('../utils/email');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// STEP 1: Register — save user and send OTP
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing && existing.isVerified) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    let user;
    if (existing && !existing.isVerified) {
      user = existing;
      user.name = name;
      user.password = password;
    } else {
      user = new User({ name, email, password });
    }

    const otp = user.generateOTP();
    await user.save();

    try {
      await sendOTPEmail(user, otp);
      console.log(`✅ OTP sent to ${email}: ${otp}`);
    } catch (e) {
      console.error('❌ OTP email error:', e.message);
    }

    res.status(201).json({ success: true, message: 'OTP sent to your email. Please verify to complete registration.' });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// STEP 2: Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log(`Verifying OTP for ${email}: ${otp}`);

    const user = await User.findOne({ email, otpExpire: { $gt: Date.now() } }).select('+otp');

    if (!user) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found. Please register again.' });
    }

    if (user.otp !== otp) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save({ validateBeforeSave: false });
      if (user.otpAttempts >= 5) {
        user.otp = undefined; user.otpExpire = undefined;
        await user.save({ validateBeforeSave: false });
        return res.status(400).json({ success: false, message: 'Too many incorrect attempts. Please register again.' });
      }
      return res.status(400).json({ success: false, message: `Invalid OTP. ${5 - user.otpAttempts} attempts remaining.` });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    user.otpAttempts = 0;
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);
    res.json({
      success: true,
      message: 'Email verified successfully!',
      token,
      user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar, upiId: user.upiId, currency: user.currency }
    });
  } catch (err) {
    console.error('VerifyOTP error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email, isVerified: false });
    if (!user) return res.status(404).json({ success: false, message: 'No pending verification for this email.' });

    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });

    try {
      await sendOTPEmail(user, otp);
      console.log(`✅ OTP resent to ${email}: ${otp}`);
    } catch (e) {
      console.error('❌ Resend OTP email error:', e.message);
    }

    res.json({ success: true, message: 'New OTP sent to your email.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'Email verified successfully! You can now login.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.isVerified) {
      return res.status(401).json({ success: false, message: 'Please verify your email before logging in' });
    }
    const token = signToken(user._id);
    res.json({
      success: true, token,
      user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar, upiId: user.upiId, currency: user.currency }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ success: false, message: 'No account with that email' });
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    try {
      await sendResetEmail(user, token);
      res.json({ success: true, message: 'Password reset link sent to your email' });
    } catch (e) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ resetPasswordToken: hashedToken, resetPasswordExpire: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.json({ success: true, message: 'Password reset successful. Please login.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};
