import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Backend server URL
const BACKEND_URL = 'http://localhost:3001';

// Auth helper functions
export const authApi = {
  async sendOtp(email: string) {
    console.log('🔍 Attempting to send OTP for:', email);
    
    try {
      // Call our backend server with Nodemailer
      console.log('📡 Calling backend server...');
      const response = await fetch(`${BACKEND_URL}/api/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      console.log('📡 Backend response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend successful:', data);
        return data;
      } else {
        const errorData = await response.json();
        console.log('❌ Backend failed:', errorData);
        throw new Error(errorData.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('❌ Error calling backend:', error);
      throw new Error('Failed to connect to email service. Please try again.');
    }
  },

  async verifyOtp(email: string, otp: string) {
    console.log('🔍 Attempting to verify OTP for:', email, 'OTP:', otp);
    
    try {
      // Call our backend server for verification
      console.log('📡 Calling backend server for verification...');
      console.log('📡 Backend URL:', `${BACKEND_URL}/api/verify-otp`);
      console.log('📡 Request payload:', { email, otp });
      
      const response = await fetch(`${BACKEND_URL}/api/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      console.log('📡 Backend verification response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend verification successful:', data);
        return data;
      } else {
        const errorData = await response.json();
        console.log('❌ Backend verification failed:', errorData);
        throw new Error(errorData.error || 'Failed to verify OTP');
      }
    } catch (error) {
      console.error('❌ Error calling backend for verification:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      throw new Error('Failed to connect to verification service. Please try again.');
    }
  },
};

// Token management
export const tokenManager = {
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  },

  removeToken(): void {
    localStorage.removeItem('auth_token');
  },

  getUserFromToken(): { id: string; email: string } | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      // Simple JWT payload extraction (in production, use proper JWT library)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.sub,
        email: payload.email,
      };
    } catch {
      return null;
    }
  },

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  },
};