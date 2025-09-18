import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { User } from '../models';

export const generateToken = (
  payload: string | object | Buffer,
  expiresIn: string = '1d'
): string => {
  const secret: Secret = process.env.JWT_SECRET || 'default_secret';
  return jwt.sign(payload as any, secret);
};

export const authenticate = async (req: any, res: any, next: any) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};
