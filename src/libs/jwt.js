import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();



const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';


export function signJwt(payload) {
return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}


export function verifyJwt(token) {
try {
return jwt.verify(token, JWT_SECRET);
} catch (e) {
return null;
}
}