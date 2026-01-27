import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models';
import { logger } from '../helpers';

function getEncryptionKey(): Buffer {
  let key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    key = crypto.randomBytes(32).toString('hex');
    logger.warn('ENCRYPTION_KEY not set in environment. Using generated key (not recommended for production)');
  }
  
  if (key.length < 64) {
    key = key.padEnd(64, '0');
  } else if (key.length > 64) {
    key = key.slice(0, 64);
  }
  
  if (!/^[0-9a-fA-F]+$/.test(key)) {
    throw new Error('ENCRYPTION_KEY must be a valid hex string');
  }
  
  return Buffer.from(key, 'hex');
}

const ENCRYPTION_KEY_BUFFER = getEncryptionKey();
const IV_LENGTH = 16; // For AES, this is always 16

function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      ENCRYPTION_KEY_BUFFER,
      iv
    );
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    logger.error('Encryption error:', error);
    throw error;
  }
}

export function decrypt(text: string): string {
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      ENCRYPTION_KEY_BUFFER,
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    logger.error('Decryption error:', error);
    throw error;
  }
}

export const generateToken = (
  payload: string | object | Buffer,
  expiresIn: string | number = '1d'
): string => {
  try {
    const secret: Secret = process.env.JWT_SECRET || 'default_secret';
    
    const signOptions: SignOptions = { 
      expiresIn: expiresIn as any
    };
    const jwtToken = jwt.sign(payload as object, secret, signOptions);
    
    const encryptedToken = encrypt(jwtToken);
    
    return encryptedToken;
  } catch (error) {
    logger.error('Token generation error:', error);
    throw new Error('Failed to generate token');
  }
};

export const authenticate = async (req: any, res: any, next: any) => {
  try {
    const encryptedToken = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!encryptedToken) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
    }

    let jwtToken: string;
    try {
      jwtToken = decrypt(encryptedToken);
    } catch (decryptError) {
      logger.warn('Token decryption failed:', decryptError);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token format.' 
      });
    }

    const decoded: any = jwt.verify(jwtToken, process.env.JWT_SECRET || 'default_secret');
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token. User not found.' 
      });
    }

    req.user = user;
    next();
  } catch (error: any) {
    logger.error('Authentication error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired.' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token.' 
      });
    }
    
    return res.status(401).json({ 
      success: false,
      message: 'Authentication failed.' 
    });
  }
};
