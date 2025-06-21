import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// JWT Secret (in production, use a strong secret)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Rate limiting for OTP requests
const otpRequests = new Map();

// Check for required environment variables
const requiredEnvVars = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value || value === 'your_supabase_url_here' || value === 'your_email@gmail.com')
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Missing or invalid environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n📝 Please create a .env file in the server directory with the following variables:');
  console.error('   VITE_SUPABASE_URL=your_actual_supabase_url');
  console.error('   VITE_SUPABASE_ANON_KEY=your_actual_supabase_anon_key');
  console.error('   EMAIL_USER=your_actual_email@gmail.com');
  console.error('   EMAIL_PASS=your_actual_app_password');
  console.error('   JWT_SECRET=your_secure_jwt_secret');
  console.error('\n🚀 For development, you can use these default values:');
  console.error('   VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('   VITE_SUPABASE_ANON_KEY=your_anon_key_from_supabase_dashboard');
  console.error('   EMAIL_USER=your_email@gmail.com');
  console.error('   EMAIL_PASS=your_app_password_from_gmail');
  console.error('   JWT_SECRET=dev-secret-key-change-in-production');
  process.exit(1);
}

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Middleware
app.use(cors());
app.use(express.json());

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can change this to other services like 'outlook', 'yahoo', etc.
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS  // Your email password or app password
  }
});

// Send OTP endpoint
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Rate limiting: Check if user has requested OTP recently
    const now = Date.now();
    const lastRequest = otpRequests.get(email);
    const cooldownPeriod = 60 * 1000; // 1 minute cooldown

    if (lastRequest && (now - lastRequest) < cooldownPeriod) {
      const remainingTime = Math.ceil((cooldownPeriod - (now - lastRequest)) / 1000);
      return res.status(429).json({ 
        error: `Please wait ${remainingTime} seconds before requesting another OTP` 
      });
    }

    // Check for existing active OTP
    const { data: existingOtp } = await supabase
      .from('sessions')
      .select('*')
      .eq('email', email)
      .eq('status', 'active')
      .single();

    if (existingOtp) {
      const otpAge = now - new Date(existingOtp.created_at).getTime();
      if (otpAge < 30 * 1000) { // 30 seconds
        return res.status(429).json({ 
          error: 'Please wait before requesting a new OTP' 
        });
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration time (30 minutes for debugging) - use India timezone
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 30);
    
    // Convert to India timezone (UTC+5:30)
    const indiaTime = new Date(expirationTime.getTime() + (5.5 * 60 * 60 * 1000));
    const expirationTimeISO = indiaTime.toISOString().replace('Z', '+05:30');
    
    console.log(`🕐 OTP expiration set for: ${expirationTimeISO} (India time)`);
    console.log(`🕐 Current time when setting: ${new Date().toISOString().replace('Z', '+05:30')} (India time)`);

    // Store OTP in database using the new schema
    const currentTimeUTC = new Date();
    const currentIndiaTime = new Date(currentTimeUTC.getTime() + (5.5 * 60 * 60 * 1000));
    const indiaTimeISO = currentIndiaTime.toISOString().replace('Z', '+05:30');
    
    const { error: insertError } = await supabase
      .from('sessions')
      .insert({
        email,
        otp_code: otp,
        expiration_time: expirationTimeISO,
        status: 'active',
        created_at: indiaTimeISO // Use proper India timezone
      });

    if (insertError) {
      console.error('Database error:', insertError);
      return res.status(500).json({ error: 'Failed to generate OTP' });
    }

    // Update rate limiting
    otpRequests.set(email, now);

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Login Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🔐 Secure Login</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Your Verification Code</h2>
            <p style="color: #666; margin-bottom: 30px;">
              Use the following 6-digit code to complete your login:
            </p>
            <div style="background: white; padding: 20px; border-radius: 10px; text-align: center; border: 2px solid #667eea;">
              <h1 style="color: #667eea; font-size: 32px; letter-spacing: 5px; margin: 0; font-family: monospace;">
                ${otp}
              </h1>
            </div>
            <p style="color: #999; font-size: 14px; margin-top: 20px;">
              This code will expire in 30 minutes for security reasons.
            </p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">
              If you didn't request this code, please ignore this email.
            </p>
          </div>
        </div>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    console.log(`✅ OTP sent to ${email}: ${otp}`);

    res.json({ 
      message: 'OTP sent successfully'
    });

  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP endpoint
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Find the active OTP session
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otp)
      .eq('status', 'active')
      .single();

    console.log(`🔍 Session query result:`, { sessionData, sessionError });

    if (sessionError || !sessionData) {
      console.log(`❌ No active session found for ${email} with OTP ${otp}`);
      return res.status(400).json({ error: 'Invalid OTP code' });
    }

    console.log(`✅ Found active session:`, sessionData);

    // Check if OTP has expired - use India timezone consistently
    const currentTime = new Date();
    const currentIndiaTime = new Date(currentTime.getTime() + (5.5 * 60 * 60 * 1000));
    const expirationTime = new Date(sessionData.expiration_time.replace('+05:30', 'Z'));
    
    console.log(`🕐 Current time: ${currentIndiaTime.toISOString().replace('Z', '+05:30')} (India time)`);
    console.log(`🕐 OTP expiration time: ${sessionData.expiration_time} (India time)`);
    console.log(`🕐 Raw expiration from DB: ${sessionData.expiration_time}`);
    console.log(`🕐 Is expired: ${currentTime > expirationTime}`);
    console.log(`🕐 Time difference (minutes): ${(currentTime - expirationTime) / (1000 * 60)}`);
    
    if (currentTime > expirationTime) {
      // Mark as expired
      await supabase
        .from('sessions')
        .update({ status: 'expired' })
        .eq('id', sessionData.id);
      
      console.log(`❌ OTP expired for ${email}`);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Mark OTP as used
    await supabase
      .from('sessions')
      .update({ status: 'used' })
      .eq('id', sessionData.id);

    // Check if user exists, if not create them
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create them
      const currentTimeUTC = new Date();
      const currentIndiaTime = new Date(currentTimeUTC.getTime() + (5.5 * 60 * 60 * 1000));
      const indiaTimeISO = currentIndiaTime.toISOString().replace('Z', '+05:30');
      
      console.log(`🕐 Creating new user with created_at: ${indiaTimeISO} (India time)`);
      
      const { error: createError } = await supabase
        .from('users')
        .insert({
          email,
          created_at: indiaTimeISO,
          last_login: indiaTimeISO
        });

      if (createError) {
        console.error('Error creating user:', createError);
        return res.status(500).json({ error: 'Failed to create user account' });
      }
      
      console.log(`✅ New user created for ${email}`);
    } else if (userData) {
      // User exists, update last_login
      const currentTimeUTC = new Date();
      const currentIndiaTime = new Date(currentTimeUTC.getTime() + (5.5 * 60 * 60 * 1000));
      const indiaTimeISO = currentIndiaTime.toISOString().replace('Z', '+05:30');
      
      console.log(`🕐 Updating last_login for existing user: ${indiaTimeISO} (India time)`);
      
      await supabase
        .from('users')
        .update({ last_login: indiaTimeISO })
        .eq('email', email);
        
      console.log(`✅ Last login updated for ${email}`);
    }

    // Generate proper JWT token
    const tokenPayload = {
      sub: email,
      email: email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { algorithm: 'HS256' });

    console.log(`✅ OTP verified for ${email}`);
    console.log(`🔐 JWT token generated`);

    res.json({
      message: 'OTP verified successfully',
      token,
      user: {
        email: email
      }
    });

  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// JWT verification middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Protected route example
app.get('/api/profile', verifyToken, (req, res) => {
  res.json({
    message: 'Access granted to protected route',
    user: req.user
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Email OTP server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Email OTP server running on http://localhost:${PORT}`);
  console.log(`📧 Email configured for: ${process.env.EMAIL_USER || 'NOT SET'}`);
  console.log(`🗄️ Supabase URL: ${supabaseUrl || 'NOT SET'}`);
}); 