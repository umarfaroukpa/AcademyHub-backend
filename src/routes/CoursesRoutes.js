const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/rbac.middleware');


const router = express.Router();


router.get('/', authenticate, async (req, res) => {
const result = await pool.query('SELECT * FROM courses');
res.json(result.rows);
});


router.post('/', authenticate, requireRole('admin','instructor'), async (req, res) => {
const { code, title, description } = req.body;
const result = await pool.query(
'INSERT INTO courses(code,title,description,lifecycle) VALUES($1,$2,$3,$4) RETURNING *',
[code, title, description, 'draft']
);
res.status(201).json(result.rows[0]);
});


router.put('/:id', authenticate, requireRole('admin','instructor'), async (req, res) => {
const { code, title, description } = req.body;
const result = await pool.query(
'UPDATE courses SET code=$1,title=$2,description=$3 WHERE id=$4 RETURNING *',
[code, title, description, req.params.id]
);
res.json(result.rows[0]);
});


router.post('/:id/transition', authenticate, requireRole('admin','instructor'), async (req, res) => {
const { action } = req.body;
const lifecycleMap = { submitForReview: 'pending_review', publish: 'published', archive: 'archived' };
const newState = lifecycleMap[action];
if (!newState) return res.status(400).json({ error: 'invalid action' });
const result = await pool.query(
'UPDATE courses SET lifecycle=$1 WHERE id=$2 RETURNING *',
[newState, req.params.id]
);
res.json(result.rows[0]);
});


module.exports = router;