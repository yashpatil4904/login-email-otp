import { createClient } from 'npm:@supabase/supabase-js@2';
import { create, verify } from 'jsr:@zaubrik/djwt@3.0.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface VerifyOtpRequest {
  email: string;
  otp: string;
}

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { email, otp }: VerifyOtpRequest = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: 'Email and OTP are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find active OTP session
    const { data: otpSession, error: fetchError } = await supabase
      .from('otp_sessions')
      .select('*')
      .eq('email', email)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpSession) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired OTP' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if OTP has expired
    const now = new Date();
    const expirationTime = new Date(otpSession.expiration_time);
    
    if (now > expirationTime) {
      // Mark as expired
      await supabase
        .from('otp_sessions')
        .update({ status: 'expired' })
        .eq('id', otpSession.id);

      return new Response(
        JSON.stringify({ error: 'OTP has expired' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if too many attempts
    if (otpSession.attempts >= 3) {
      await supabase
        .from('otp_sessions')
        .update({ status: 'expired' })
        .eq('id', otpSession.id);

      return new Response(
        JSON.stringify({ error: 'Too many failed attempts' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify OTP
    if (otpSession.otp_code !== otp) {
      // Increment attempts
      await supabase
        .from('otp_sessions')
        .update({ attempts: otpSession.attempts + 1 })
        .eq('id', otpSession.id);

      return new Response(
        JSON.stringify({ error: 'Invalid OTP' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Mark OTP as used
    await supabase
      .from('otp_sessions')
      .update({ status: 'used' })
      .eq('id', otpSession.id);

    // Create or update user
    const { error: upsertError } = await supabase
      .from('users')
      .upsert({
        email,
        last_login: new Date().toISOString(),
        created_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      });

    if (upsertError) {
      console.error('User upsert error:', upsertError);
    }

    // Generate JWT token
    const jwtSecret = Deno.env.get('JWT_SECRET') || 'your-secret-key';
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    const payload = {
      sub: email,
      email: email,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      iat: Math.floor(Date.now() / 1000),
    };

    const token = await create({ alg: 'HS256', typ: 'JWT' }, payload, key);

    return new Response(
      JSON.stringify({ 
        message: 'OTP verified successfully',
        token,
        user: { email }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Verify OTP error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});