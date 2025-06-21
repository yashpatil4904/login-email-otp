import { supabase } from './utils/supabaseClient.js';

// Helper function to get IST time as ISO string
function getISTISOString(date = new Date()) {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffsetMs);
  return istDate.toISOString().replace('Z', '+05:30');
}

// Helper function to convert IST string to UTC Date object for comparison
function istStringToUTCDate(istString) {
  const utcString = istString.replace('+05:30', 'Z');
  return new Date(utcString);
}

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const currentTime = new Date();
    const currentUTC = currentTime.toISOString();
    const currentIST = getISTISOString(currentTime);
    
    // Get the latest session and user records
    const { data: latestSession } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const { data: latestUser } = await supabase
      .from('users')
      .select('*')
      .order('last_login', { ascending: false })
      .limit(1)
      .single();

    // Get all active sessions that should be expired
    const { data: expiredSessions } = await supabase
      .from('sessions')
      .select('id, email, created_at, expiration_time, status')
      .eq('status', 'active')
      .lt('expiration_time', currentTime.toISOString());

    // Get session statistics
    const { data: sessionStats } = await supabase
      .from('sessions')
      .select('status');

    const stats = {
      total: sessionStats?.length || 0,
      active: sessionStats?.filter(s => s.status === 'active').length || 0,
      expired: sessionStats?.filter(s => s.status === 'expired').length || 0,
      used: sessionStats?.filter(s => s.status === 'used').length || 0
    };

    const debugInfo = {
      currentTime: {
        utc: currentUTC,
        ist: currentIST,
        local: currentTime.toString(),
        timestamp: currentTime.getTime()
      },
      latestSession: latestSession ? {
        email: latestSession.email,
        created_at: latestSession.created_at,
        created_at_utc: latestSession.created_at ? istStringToUTCDate(latestSession.created_at).toISOString() : null,
        expiration_time: latestSession.expiration_time,
        expiration_utc: latestSession.expiration_time ? istStringToUTCDate(latestSession.expiration_time).toISOString() : null,
        status: latestSession.status,
        is_expired: latestSession.expiration_time ? currentTime > istStringToUTCDate(latestSession.expiration_time) : null
      } : null,
      latestUser: latestUser ? {
        email: latestUser.email,
        created_at: latestUser.created_at,
        created_at_utc: latestUser.created_at ? istStringToUTCDate(latestUser.created_at).toISOString() : null,
        last_login: latestUser.last_login,
        last_login_utc: latestUser.last_login ? istStringToUTCDate(latestUser.last_login).toISOString() : null
      } : null,
      sessionStats: stats,
      expiredSessions: expiredSessions || [],
      cleanupInfo: {
        message: "To manually cleanup expired sessions, make a POST request to /.netlify/functions/cleanup-expired",
        expiredCount: expiredSessions?.length || 0
      },
      note: "All timestamps are stored in IST (India Standard Time, UTC+5:30) and converted to UTC for comparison"
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(debugInfo, null, 2)
    };

  } catch (error) {
    console.error('Debug error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Debug failed', details: error.message }) 
    };
  }
}; 