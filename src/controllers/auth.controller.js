import { Request, Response } from 'express';
import { prisma } from '../prismaClient';
import { hash, compare } from '../libs/bcrypt';
import { signJwt } from '../libs/jwt';


export async function signup(req, res) {
const { email, password, fullName, role } = req.body;
if (!email || !password) return res.status(400).json({ error: 'email+password required' });
const existing = await prisma.user.findUnique({ where: { email } });
if (existing) return res.status(400).json({ error: 'email exists' });
const passwordHash = await hash(password);
const user = await prisma.user.create({ data: { email, password: passwordHash, fullName, role } });
const token = signJwt({ userId: user.id, role: user.role });
res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
}


export async function login(req, res) {
const { email, password } = req.body;
if (!email || !password) return res.status(400).json({ error: 'email+password required' });
const user = await prisma.user.findUnique({ where: { email } });
if (!user) return res.status(401).json({ error: 'invalid' });
const ok = await compare(password, user.password);
if (!ok) return res.status(401).json({ error: 'invalid' });
const token = signJwt({ userId: user.id, role: user.role });
res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
}