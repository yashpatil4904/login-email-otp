# Email OTP Authentication System 
Link : https://login-email-otp.netlify.app/

A modern, full-stack authentication system using React, TypeScript, Vite, Supabase, Node.js/Express, and Nodemailer. Users log in with their email and a One-Time Password (OTP) sent to their inbox. The backend securely manages OTPs, user sessions, and issues JWT tokens for protected routes.

---

## 🚀 Features
- **Email-based OTP authentication**
- **JWT token issuance and verification**
- **Supabase for user/session storage**
- **Nodemailer for sending OTP emails**
- **React + TypeScript frontend**
- **India timezone support for all timestamps**
- **Production-ready error handling and security**

---

## 🛠️ Tech Stack
- **Frontend:** React, TypeScript, Vite, TailwindCSS
- **Backend:** Node.js, Express, Nodemailer, dotenv, jsonwebtoken
- **Database:** Supabase (Postgres)
- **Email:** Gmail (or any SMTP provider via Nodemailer)

---

## 📁 Project Structure

```
project/
  ├── src/                # Frontend React app
  │   ├── components/     # UI components (LoginForm, OtpInput, Profile, etc.)
  │   ├── hooks/          # Custom React hooks (useAuth)
  │   ├── lib/            # Supabase client and auth API helpers
  │   └── ...
  ├── server/             # Backend Node.js/Express server
  │   ├── index.js        # Main backend logic (OTP, JWT, email)
  │   └── ...
  ├── supabase/           # Supabase migrations and edge functions (if any)
  ├── package.json        # Frontend dependencies
  ├── netlify.toml        # Netlify deployment configuration
  ├── README.md           # This file
  └── ...
```

---

## ⚡ Setup Instructions

### 1. **Clone the repository**
```bash
git clone <your-repo-url>
cd <repo-folder>
```

### 2. **Install Frontend Dependencies**
```bash
npm install
```

### 3. **Install Backend Dependencies**
```bash
cd server
npm install
```

### 4. **Configure Environment Variables**
Create a `.env` file in the `server` directory with the following:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
JWT_SECRET=your_strong_jwt_secret
```
- Get Supabase keys from your [Supabase project dashboard](https://app.supabase.com/)
- For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833?hl=en)

### 5. **Set Up the Database**
- Go to your Supabase dashboard
- Run the provided SQL migrations in `supabase/migrations/` to create the `users` and `sessions` tables:
  - `users`: `email`, `created_at`, `last_login`
  - `sessions`: `email`, `otp_code`, `expiration_time`, `status`, `created_at`

### 6. **Start the Backend Server**
```bash
cd server
npm start
```
- The backend runs on [http://localhost:3001](http://localhost:3001)

### 7. **Start the Frontend**
```bash
cd ..
npm run dev
```
- The frontend runs on [http://localhost:5173](http://localhost:5173)

---

## 🚀 Deployment

### **Backend Deployment (Render/Railway/Heroku)**

1. **Deploy to Render:**
   - Connect your GitHub repository to Render
   - Create a new Web Service
   - Set build command: `npm install`
   - Set start command: `npm start`
   - Add environment variables from your `.env` file
   - Deploy!



### **Frontend Deployment (Netlify)**

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
   - Add:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_BACKEND_URL` (your deployed backend URL)

4. **Deploy!**
   - Netlify will automatically build and deploy your site
   - Your site will be available at `https://your-site-name.netlify.app`

---

## 🧩 How It Works

### **Frontend (React + Vite)**
- User enters their email and requests an OTP
- App calls backend `/api/send-otp` endpoint
- User receives OTP via email, enters it in the app
- App calls backend `/api/verify-otp` endpoint
- On success, receives a JWT token and stores it in localStorage
- Authenticated users can access protected routes (e.g., profile)

### **Backend (Node.js/Express)**
- **/api/send-otp**: Generates a 6-digit OTP, stores it in Supabase, sends it via email
- **/api/verify-otp**: Checks OTP validity and expiration, issues JWT token if valid, updates user last login
- **JWT Middleware**: Protects routes by verifying JWT tokens
- **India timezone**: All timestamps are stored and compared in India time (UTC+5:30)

### **Database (Supabase)**
- **users**: Stores user emails, creation time, and last login
- **sessions**: Stores OTP codes, expiration, status, and creation time for each login attempt

USERS TABLE
![image](https://github.com/user-attachments/assets/625104ac-29c1-41e7-b6c4-f9a3e2df88c5)

SESSIONS TABLE
![image](https://github.com/user-attachments/assets/649f5a7a-e2d2-4274-ab0f-0137b7d6b9ac)
---

## 💡 Technology Choices
- **React + Vite**: Fast, modern frontend development
- **TypeScript**: Type safety for both frontend and backend
- **Supabase**: Managed Postgres with easy REST API
- **Nodemailer**: Reliable email delivery
- **JWT**: Secure, stateless authentication
- **India timezone**: Ensures all times are user-friendly for Indian users

---

## 📝 Notes
- For production, use strong secrets and environment variables
- You can use any SMTP provider, not just Gmail
- Make sure your system clock is correct for OTP expiration
- The backend must be deployed before the frontend
- Update `VITE_BACKEND_URL` in Netlify environment variables after backend deployment

---

