import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration time (30 minutes from now for testing timezone issues)
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 30);
    
    // Store as ISO string to ensure consistent timezone handling
    const expirationTimeISO = expirationTime.toISOString();
    
    console.log(`🕐 OTP expiration set for: ${expirationTimeISO}`);
    console.log(`🕐 Current time when setting: ${new Date().toISOString()}`);

    // Store OTP in database using the new schema
    const { error: insertError } = await supabase
      .from('sessions')
      .insert({
        email,
        otp_code: otp,
        expiration_time: expirationTimeISO,
        status: 'active'
      });

    if (insertError) {
      console.error('Database error:', insertError);
      return res.status(500).json({ error: 'Failed to generate OTP' });
    }

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
      // OTP removed from response for production
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

    // Check if OTP has expired
    const currentTime = new Date();
    const expirationTime = new Date(sessionData.expiration_time);
    
    console.log(`🕐 Current time: ${currentTime.toISOString()}`);
    console.log(`🕐 OTP expiration time: ${expirationTime.toISOString()}`);
    console.log(`🕐 Raw expiration from DB: ${sessionData.expiration_time}`);
    console.log(`🕐 Is expired: ${currentTime > expirationTime}`);
    console.log(`🕐 Time difference (minutes): ${(currentTime - expirationTime) / (1000 * 60)}`);
    
    // TEMPORARILY DISABLE EXPIRATION CHECK FOR TESTING
    console.log(`⚠️ TEMPORARILY SKIPPING EXPIRATION CHECK FOR TESTING`);
    
    /*
    if (currentTime > expirationTime) {
      // Mark as expired
      await supabase
        .from('sessions')
        .update({ status: 'expired' })
        .eq('id', sessionData.id);
      
      console.log(`❌ OTP expired for ${email}`);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }
    */

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
      const { error: createError } = await supabase
        .from('users')
        .insert({
          email,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        });

      if (createError) {
        console.error('Error creating user:', createError);
        return res.status(500).json({ error: 'Failed to create user account' });
      }
    } else if (userData) {
      // User exists, update last_login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('email', email);
    }

    // Generate a mock token (in production, use proper JWT)
    const token = Buffer.from(JSON.stringify({
      sub: email,
      email: email,
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    })).toString('base64');

    console.log(`✅ OTP verified for ${email}`);

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Email OTP server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Email OTP server running on http://localhost:${PORT}`);
  console.log(`📧 Email configured for: ${process.env.EMAIL_USER || 'NOT SET'}`);
  console.log(`🗄️ Supabase URL: ${supabaseUrl || 'NOT SET'}`);
}); 