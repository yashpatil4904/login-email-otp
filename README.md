# Email OTP Authentication System

A modern, full-stack authentication system using React, TypeScript, Vite, Supabase, and Netlify Functions. Users log in with their email and a One-Time Password (OTP) sent to their inbox. The backend uses serverless functions to securely manage OTPs, user sessions, and issue JWT tokens for protected routes.

---

## 🚀 Features
- **Email-based OTP authentication**
- **JWT token issuance and verification**
- **Supabase for user/session storage**
- **Nodemailer for sending OTP emails**
- **React + TypeScript frontend**
- **Netlify Functions (serverless backend)**
- **India timezone support for all timestamps**
- **Production-ready error handling and security**
- **Automatic OTP expiration cleanup**

---

## 🛠️ Tech Stack
- **Frontend:** React, TypeScript, Vite, TailwindCSS
- **Backend:** Netlify Functions (serverless), Nodemailer, jsonwebtoken
- **Database:** Supabase (Postgres)
- **Email:** Gmail (or any SMTP provider via Nodemailer)
- **Deployment:** Netlify (frontend + functions)

---

## 📁 Project Structure

```
project/
  ├── src/                    # Frontend React app
  │   ├── components/         # UI components (LoginForm, OtpInput, Profile, etc.)
  │   ├── hooks/              # Custom React hooks (useAuth)
  │   ├── lib/                # Supabase client configuration
  │   └── ...
  ├── netlify/
  │   └── functions/          # Serverless backend functions
  │       ├── send-otp.js     # OTP generation and email sending
  │       ├── verify-otp.js   # OTP verification and JWT issuance
  │       ├── profile.js      # Protected route example
  │       ├── cleanup-expired.js # Automatic OTP cleanup
  │       ├── debug-time.js   # Debug endpoint for timezone info
  │       ├── utils/          # Shared utilities
  │       │   ├── supabaseClient.js
  │       │   ├── transporter.js
  │       │   └── auth.js
  │       └── package.json    # Function dependencies
  ├── supabase/               # Database migrations
  │   └── migrations/
  ├── package.json            # Frontend dependencies
  ├── netlify.toml           # Netlify deployment configuration
  ├── README.md              # This file
  └── ...
```

---

## ⚡ Local Development Setup

### 1. **Clone the repository**
```bash
git clone <your-repo-url>
cd <repo-folder>
```

### 2. **Install Dependencies**
```bash
# Install frontend dependencies
npm install

# Install Netlify Functions dependencies
cd netlify/functions
npm install
cd ../..
```

### 3. **Configure Environment Variables**
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
JWT_SECRET=your_strong_jwt_secret
```

**How to get these values:**
- **Supabase keys:** Get from your [Supabase project dashboard](https://app.supabase.com/)
- **Gmail App Password:** Follow [Google's guide](https://support.google.com/accounts/answer/185833?hl=en) to create an app password
- **JWT Secret:** Generate a strong random string (at least 32 characters)

### 4. **Set Up the Database**
1. Go to your [Supabase dashboard](https://app.supabase.com/)
2. Navigate to SQL Editor
3. Run the migration files from `supabase/migrations/`:

```sql
-- Run the main schema migration
-- Copy content from: supabase/migrations/20250621070000_simplified_schema.sql

-- Run the timezone fix migration
-- Copy content from: supabase/migrations/20250621080000_fix_timezone.sql
```

### 5. **Install Netlify CLI (for local development)**
```bash
npm install -g netlify-cli
```

### 6. **Start Local Development**
```bash
# Start the frontend development server
npm run dev

# In another terminal, start Netlify Functions locally
netlify dev
```

**Access your app:**
- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Functions:** [http://localhost:8888](http://localhost:8888)

---

## 🚀 Production Deployment

### **Deploy to Netlify (Recommended)**

1. **Connect to Netlify:**
   - Go to [Netlify](https://netlify.com) and sign up/login
   - Click "New site from Git"
   - Connect your GitHub repository

2. **Configure Build Settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `18`

3. **Add Environment Variables:**
   - Go to Site settings > Environment variables
   - Add all variables from your `.env` file:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `EMAIL_USER`
     - `EMAIL_PASS`
     - `JWT_SECRET`

4. **Deploy!**
   - Netlify will automatically build and deploy your site
   - Your site will be available at `https://your-site-name.netlify.app`

### **Alternative: Manual Deployment**
```bash
# Build the project
npm run build

# Deploy to Netlify
netlify deploy --prod
```

---

## 🧩 How It Works

### **Frontend (React + Vite)**
- User enters their email and requests an OTP
- App calls `/api/send-otp` Netlify Function
- User receives OTP via email, enters it in the app
- App calls `/api/verify-otp` Netlify Function
- On success, receives a JWT token and stores it in localStorage
- Authenticated users can access protected routes

### **Backend (Netlify Functions)**
- **`/api/send-otp`**: Generates 6-digit OTP, stores in Supabase, sends via email
- **`/api/verify-otp`**: Checks OTP validity, issues JWT token, updates user last login
- **`/api/profile`**: Protected route example with JWT verification
- **`/api/cleanup-expired`**: Automatically marks expired OTPs as expired
- **India timezone**: All timestamps stored and compared in IST (UTC+5:30)

### **Database (Supabase)**
- **`users`**: Stores user emails, creation time, and last login
- **`sessions`**: Stores OTP codes, expiration, status, and creation time
- **Automatic cleanup**: Expired sessions are marked as expired

---

## 🔧 API Endpoints

### **Public Endpoints**
- `POST /api/send-otp` - Send OTP to email
- `POST /api/verify-otp` - Verify OTP and get JWT token

### **Protected Endpoints**
- `GET /api/profile` - Get user profile (requires JWT)

### **Utility Endpoints**
- `GET /api/debug-time` - Debug timezone information
- `POST /api/cleanup-expired` - Manually trigger expired OTP cleanup

---

## 🕐 Timezone Handling

The system is configured for **India Standard Time (IST, UTC+5:30)**:
- All timestamps are stored in IST format
- OTP expiration is calculated in IST
- Database uses `timestamptz` columns for proper timezone support
- Automatic cleanup respects IST timezone

---

## 🔒 Security Features

- **JWT tokens** with 24-hour expiration
- **Rate limiting** on OTP requests (1 minute cooldown)
- **OTP expiration** after 30 minutes
- **Secure email delivery** via Nodemailer
- **Environment variable protection**
- **Automatic session cleanup**

---

## 🐛 Debugging

### **Check Timezone Information**
Visit: `https://your-site.netlify.app/.netlify/functions/debug-time`

### **Manual Cleanup**
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/cleanup-expired
```

### **Function Logs**
- Check Netlify Function logs in the Netlify dashboard
- Use `netlify dev` for local debugging

---

## 📝 Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | ✅ |
| `EMAIL_USER` | Email address for sending OTPs | ✅ |
| `EMAIL_PASS` | Email password/app password | ✅ |
| `JWT_SECRET` | Secret key for JWT signing | ✅ |

---

## 🚨 Troubleshooting

### **Common Issues**

1. **OTP not sending:**
   - Check email credentials in environment variables
   - Verify Gmail app password is correct
   - Check Netlify Function logs

2. **Timezone issues:**
   - Ensure database migration is applied
   - Check debug endpoint for timezone info
   - Verify IST timezone is working

3. **JWT errors:**
   - Ensure `JWT_SECRET` is set
   - Check token expiration (24 hours)

4. **Database errors:**
   - Verify Supabase credentials
   - Check if migrations are applied
   - Ensure RLS policies are configured

---

## 📬 Need Help?

- **Check the debug endpoint** for system information
- **Review Netlify Function logs** for errors
- **Open an issue** on GitHub with detailed error information
- **Contact the maintainer** for support

---

## 🎯 Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Email service configured
- [ ] JWT secret set
- [ ] Netlify Functions deployed
- [ ] Frontend deployed
- [ ] Timezone settings verified
- [ ] Security measures in place

---

