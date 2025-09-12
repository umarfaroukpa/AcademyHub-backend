const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('./db');
require('dotenv').config();


const router = express.Router();


router.post('/login', async (req, res) => {
const { email, password } = req.body;
const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
const user = result.rows[0];
if (!user) return res.status(401).json({ error: 'invalid credentials' });
const ok = await bcrypt.compare(password, user.password);
if (!ok) return res.status(401).json({ error: 'invalid credentials' });
const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

module.exports = router;