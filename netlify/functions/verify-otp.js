import { supabase } from './utils/supabaseClient.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Missing environment variable: JWT_SECRET');
}

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

// Helper function to convert IST string to UTC Date object for comparison
function istStringToUTCDate(istString) {
  // Remove the +05:30 and parse as UTC
  const utcString = istString.replace('+05:30', 'Z');
  return new Date(utcString);
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, otp } = JSON.parse(event.body);

    if (!email || !otp) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email and OTP are required' }) };
    }

    // Find the active OTP session
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otp)
      .eq('status', 'active')
      .single();

    if (sessionError || !sessionData) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid OTP code' }) };
    }
    
    // Check if OTP has expired - convert IST from database to UTC for comparison
    const currentTime = new Date(); // Current UTC time
    const currentIST = getISTISOString(currentTime);
    const currentISTTimestamp = getISTTimestamp(currentTime);
    const expirationIST = sessionData.expiration_time;
    
    // Convert IST strings to UTC Date objects for comparison
    const expirationUTC = istStringToUTCDate(expirationIST);
    
    console.log(`🕐 Current time info:`);
    console.log(`   - Current UTC: ${currentTime.toISOString()}`);
    console.log(`   - Current IST: ${currentIST}`);
    console.log(`   - Current IST for DB: ${currentISTTimestamp}`);
    console.log(`🕐 Expiration time info:`);
    console.log(`   - Expiration IST from DB: ${expirationIST}`);
    console.log(`   - Expiration UTC: ${expirationUTC.toISOString()}`);
    console.log(`🕐 Is expired: ${currentTime > expirationUTC}`);
    
    if (currentTime > expirationUTC) {
      // Mark as expired
      await supabase
        .from('sessions')
        .update({ status: 'expired' })
        .eq('id', sessionData.id);
      
      console.log(`❌ OTP expired for ${email}`);
      return { statusCode: 400, body: JSON.stringify({ error: 'OTP has expired. Please request a new one.' }) };
    }

    // Mark OTP as used
    await supabase
      .from('sessions')
      .update({ status: 'used' })
      .eq('id', sessionData.id);

    // Find or create user
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError && userError.code === 'PGRST116') { // "Not found"
      const { data: newUser, error: newUserError } = await supabase
        .from('users')
        .insert({ 
          email, 
          last_login: currentISTTimestamp,
          created_at: currentISTTimestamp
        })
        .select()
        .single();
      
      if (newUserError) throw newUserError;
      user = newUser;
    } else if (userError) {
      throw userError;
    } else {
      // Update last_login for existing user
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ last_login: currentISTTimestamp })
        .eq('email', email)
        .select()
        .single();
      if (updateError) throw updateError;
      user = updatedUser;
    }
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'OTP verified successfully',
        token,
        user: { email: user.email }
      })
    };

  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Failed to verify OTP', details: error.message }) 
    };
  }
}; 