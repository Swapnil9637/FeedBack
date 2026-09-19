const { User, OtpToken } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { track } = require('@swapnil454/tracepilot');

const generateOTP = require('../utils/generateOTP');
const sendOTP = require('../utils/sendOTP');
const { checkOtpCooldown } = require("../utils/otpRateLimiter");

async function upsertOtp(email, otp) {
  let record = await OtpToken.findOne({ where: { email } });
  if (record) {
    record.otp = otp;
    record.changed('updatedAt', true);
    await record.save();
  } else {
    await OtpToken.create({ email, otp });
  }
}

function isOtpExpired(record) {
  const diff = Date.now() - new Date(record.updatedAt || record.createdAt).getTime();
  return diff > 10 * 60 * 1000;
}

exports.signup = async (req, res) => {
  try {
    const { name, email, address, password, role } = req.body;

    if (!name || name.length < 20 || name.length > 60)
      return res.status(400).json({ error: 'Name must be 20-60 chars.' });

    if (!address || address.length > 400)
      return res.status(400).json({ error: 'Address is required (max 400 chars).' });

    if (!password)
      return res.status(400).json({ error: "Password is required." });

    if (password.length < 8 || password.length > 16)
      return res.status(400).json({ error: "Password must be 8-16 chars long." });

    if (!/[A-Z]/.test(password))
      return res.status(400).json({ error: "Must include at least one uppercase letter." });

    if (!/[a-z]/.test(password))
      return res.status(400).json({ error: "Must include at least one lowercase letter." });

    if (!/[^A-Za-z0-9]/.test(password))
      return res.status(400).json({ error: "Must include at least one special character." });

    if (!email || !/^\S+@\S+\.\S+$/.test(email))
      return res.status(400).json({ error: 'Invalid email.' });

    if (!role || !['user', 'owner'].includes(role))
      return res.status(400).json({ error: 'You cannot sign up as an administrator. Invalid role.' });

    let existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ error: 'Email already exists and is verified.' });
      } else {
        
        existingUser.name = name;
        existingUser.address = address;
        existingUser.role = role;
        existingUser.password = await bcrypt.hash(password, 10);
        await existingUser.save();
      }
    } else {
      const hash = await bcrypt.hash(password, 10);
      existingUser = await User.create({
        name, email, address, password: hash, role, isVerified: false
      });
    }

    const otp = generateOTP();

    await upsertOtp(email, otp);

    try {
      sendOTP(email, otp);
      res.status(200).json({ message: 'OTP sent to email.' });
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
      res.status(200).json({ 
        message: 'Account created! Email service is temporarily unavailable. Please check your console for the OTP or try resending.',
        emailError: true,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined 
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifyAndCreateUser = async (req, res) => {
  try {
    const { email, otpInput } = req.body;

    const otpRecord = await OtpToken.findOne({ where: { email } });
    if (!otpRecord)
      return res.status(400).json({ error: 'OTP missing.' });

    if (isOtpExpired(otpRecord)) {
      await otpRecord.destroy();
      return res.status(400).json({ error: 'OTP expired.' });
    }

    if (otpRecord.otp !== otpInput)
      return res.status(400).json({ error: 'Invalid OTP.' });

    const user = await User.findOne({ where: { email } });
    if (!user)
      return res.status(400).json({ error: 'User not found.' });

    user.isVerified = true;
    await user.save();

    await OtpToken.destroy({ where: { email } });
     track('user_signup', {
      role: user.role
    });

    res.status(201).json({ message: 'Signup & verification complete.', userId: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user || user.isVerified) {
       return res.status(404).json({ error: 'User not found or already verified.' });
    }

    const newOtp = generateOTP();
    await upsertOtp(email, newOtp);

    sendOTP(email, newOtp);

    res.json({ message: 'OTP resent to email.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user)
      return res.status(400).json({ error: 'Invalid credentials.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ error: 'Invalid credentials.' });

    if (!user.isVerified)
      return res.status(403).json({ error: 'Please verify your email first.' });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    track('user_login', {
      role: user.role
    });

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (
      !password ||
      password.length < 8 ||
      password.length > 16 ||
      !/[A-Z]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      return res.status(400).json({
        error: "Password must be 8-16 characters and include at least one uppercase letter and one special character.",
      });
    }

    const hash = await bcrypt.hash(password, 10);
    await User.update({ password: hash }, { where: { _id: userId } });

    res.json({ message: 'Password updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required." });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    if (!checkOtpCooldown(email)) {
      return res.status(429).json({ success: false, error: "Please wait 1 minute before requesting another OTP." });
    }

    const otp = generateOTP();
    await upsertOtp(email, otp);

    sendOTP(email, otp);

    return res.status(200).json({ success: true, message: "OTP sent to your email." });

  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ success: false, error: "Failed to send OTP. Please try again later." });
  }
};

exports.verifyResetOTP = async (req, res) => {
  try {
    const { email, otpInput } = req.body;

    const otpRecord = await OtpToken.findOne({ where: { email } });
    if (!otpRecord)
      return res.status(400).json({ error: 'OTP missing.' });

    if (isOtpExpired(otpRecord)) {
      await otpRecord.destroy();
      return res.status(400).json({ error: 'OTP expired.' });
    }

    if (otpRecord.otp !== otpInput)
      return res.status(400).json({ error: 'Incorrect OTP.' });

    res.json({ message: 'OTP verified successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    if (!email || !newPassword)
      return res.status(400).json({ error: 'Missing fields.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.update({ password: hashed }, { where: { email } });

    await OtpToken.destroy({ where: { email } });

    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
