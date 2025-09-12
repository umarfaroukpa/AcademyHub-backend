import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../libs/jwt';




export const authenticate = (req, res, next) => {
const header = req.headers.authorization;
if (!header) return res.sendStatus(401);
const [, token] = header.split(' ');
if (!token) return res.sendStatus(401);
const payload = verifyJwt(token);
if (!payload) return res.sendStatus(401);
req.user = payload;
next();
};