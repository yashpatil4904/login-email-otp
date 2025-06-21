import { supabase } from './utils/supabaseClient.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const currentTime = new Date();
    console.log(`🕐 Cleanup started at: ${currentTime.toISOString()}`);

    // Find all active sessions that have expired
    const { data: expiredSessions, error: fetchError } = await supabase
      .from('sessions')
      .select('id, email, created_at, expiration_time, status')
      .eq('status', 'active')
      .lt('expiration_time', currentTime.toISOString());

    if (fetchError) {
      console.error('Error fetching expired sessions:', fetchError);
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: 'Failed to fetch expired sessions' }) 
      };
    }

    console.log(`📊 Found ${expiredSessions?.length || 0} expired sessions`);

    if (expiredSessions && expiredSessions.length > 0) {
      // Update all expired sessions to 'expired' status
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ status: 'expired' })
        .in('id', expiredSessions.map(session => session.id));

      if (updateError) {
        console.error('Error updating expired sessions:', updateError);
        return { 
          statusCode: 500, 
          body: JSON.stringify({ error: 'Failed to update expired sessions' }) 
        };
      }

      console.log(`✅ Successfully marked ${expiredSessions.length} sessions as expired`);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: `Successfully cleaned up ${expiredSessions.length} expired sessions`,
          expiredSessions: expiredSessions.map(session => ({
            id: session.id,
            email: session.email,
            expiredAt: session.expiration_time
          }))
        })
      };
    } else {
      console.log('✅ No expired sessions found');
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'No expired sessions found',
          expiredSessions: []
        })
      };
    }

  } catch (error) {
    console.error('Error in cleanup function:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Cleanup failed', details: error.message }) 
    };
  }
}; 