import { supabase } from './utils/supabaseClient.js';
import { transporter } from './utils/transporter.js';

// In-memory store for rate limiting.
// Note: In a serverless environment, this state is not shared across function invocations.
// A more robust solution would use a database or a service like Redis.
const otpRequests = new Map();

// Helper function to get IST time as ISO string for display
function getISTISOString(date = new Date()) {
  // Get UTC time, add 5.5 hours for IST
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffsetMs);
  // Return as ISO string with IST timezone
  return istDate.toISOString().replace('Z', '+05:30');
}

// Helper function to get IST timestamp for database storage
function getISTTimestamp(date = new Date()) {
  // Get UTC time, add 5.5 hours for IST
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffsetMs);
  // Return as ISO string that will be interpreted as IST
  return istDate.toISOString();
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email } = JSON.parse(event.body);

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) };
    }

    // Rate limiting
    const now = Date.now();
    const lastRequest = otpRequests.get(email);
    const cooldownPeriod = 60 * 1000; // 1 minute

    if (lastRequest && (now - lastRequest) < cooldownPeriod) {
      const remainingTime = Math.ceil((cooldownPeriod - (now - lastRequest)) / 1000);
      return { 
        statusCode: 429, 
        body: JSON.stringify({ error: `Please wait ${remainingTime} seconds before requesting another OTP` })
      };
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Get current time in multiple formats for debugging
    const currentTime = new Date();
    const currentUTC = currentTime.toISOString();
    const currentLocal = currentTime.toString();
    const currentTimestamp = currentTime.getTime();
    
    // Calculate expiration time (30 minutes from now)
    const expirationTime = new Date(currentTimestamp + (30 * 60 * 1000));
    const expirationUTC = expirationTime.toISOString();
    const expirationLocal = expirationTime.toString();
    
    // Convert to IST for storage and display
    const currentIST = getISTISOString(currentTime);
    const expirationIST = getISTISOString(expirationTime);
    const currentISTTimestamp = getISTTimestamp(currentTime);
    const expirationISTTimestamp = getISTTimestamp(expirationTime);

    console.log(`🕐 Server time info:`);
    console.log(`   - Current local: ${currentLocal}`);
    console.log(`   - Current UTC: ${currentUTC}`);
    console.log(`   - Current IST: ${currentIST}`);
    console.log(`   - Current IST for DB: ${currentISTTimestamp}`);
    console.log(`   - Current timestamp: ${currentTimestamp}`);
    console.log(`🕐 Expiration time info:`);
    console.log(`   - Expiration local: ${expirationLocal}`);
    console.log(`   - Expiration UTC: ${expirationUTC}`);
    console.log(`   - Expiration IST: ${expirationIST}`);
    console.log(`   - Expiration IST for DB: ${expirationISTTimestamp}`);

    // Store OTP in database (using IST timestamps)
    const { error: insertError } = await supabase
      .from('sessions')
      .insert({
        email,
        otp_code: otp,
        expiration_time: expirationISTTimestamp,
        status: 'active',
        created_at: currentISTTimestamp
      });

    if (insertError) {
      console.error('Database error:', insertError);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to generate OTP' }) };
    }

    otpRequests.set(email, now);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Login Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #f8f8f8; padding: 20px; text-align: center;">
            <h1 style="color: #333;">Your Verification Code</h1>
          </div>
          <div style="padding: 30px;">
            <p style="color: #555; font-size: 16px;">Please use the following code to complete your login:</p>
            <div style="font-size: 24px; font-weight: bold; color: #000; text-align: center; padding: 15px; background-color: #eee; border-radius: 5px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #777; font-size: 14px;">This code will expire in 30 minutes.</p>
            <p style="color: #999; font-size: 12px;">Sent at: ${currentIST}</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    
    console.log(`✅ OTP sent to ${email}: ${otp}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'OTP sent successfully' })
    };

  } catch (error) {
    console.error('Error sending OTP:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Failed to send OTP', details: error.message }) 
    };
  }
}; 