const express = require('express');
const router = express.Router();
const { register, login, verifyEmail, verifyOTP, resendOTP, forgotPassword, resetPassword, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { registerValidation, loginValidation, resetPasswordValidation, validate } = require('../middleware/validate');

router.post('/register', registerValidation, validate, register);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', loginValidation, validate, login);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPasswordValidation, validate, resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
