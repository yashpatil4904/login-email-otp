import { verifyToken } from './utils/auth.js';
import { supabase } from './utils/supabaseClient.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { error, user } = verifyToken(event);

  if (error) {
    return { statusCode: 401, body: JSON.stringify({ error }) };
  }

  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, created_at, last_login')
      .eq('id', user.userId)
      .single();

    if (userError) {
      throw userError;
    }

    return {
      statusCode: 200,
      body: JSON.stringify(userData)
    };

  } catch (err) {
    console.error('Error fetching profile:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch profile data' })
    };
  }
}; 