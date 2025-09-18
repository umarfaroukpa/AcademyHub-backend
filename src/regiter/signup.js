const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
require('dotenv').config();


const router = express.Router();


router.post('/signup', async (req, res) => {
const { email, password, role } = req.body;
if (!email || !password) return res.status(400).json({ error: 'email/password required' });


const hashed = await bcrypt.hash(password, 10);
const result = await pool.query(
'INSERT INTO users(email, password, role) VALUES($1, $2, $3) RETURNING id, email, role',
[email, hashed, role || 'student']
);


const user = result.rows[0];
const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
res.json({ token, user });
});


module.exports = router;