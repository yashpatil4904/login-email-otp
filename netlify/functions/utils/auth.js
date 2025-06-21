import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Missing environment variable: JWT_SECRET');
}

export const verifyToken = (event) => {
  const authHeader = event.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No token provided or invalid format', user: null };
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { error: null, user: decoded };
  } catch (err) {
    return { error: 'Invalid or expired token', user: null };
  }
}; 