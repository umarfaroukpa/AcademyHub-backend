import { Request, Response } from 'express';



const c = await prisma.course.findUnique({ where: { id }, include: { owner: true, department: true } });
if (!c) return res.sendStatus(404);
res.json(c);



export async function createCourse(req, res) {
const { code, title, description, departmentId } = req.body;
const ownerId = req.user.userId;
const c = await prisma.course.create({ data: { code, title, description, ownerId, departmentId } });
res.status(201).json(c);
}


export async function updateCourse(req, res) {
const { id } = req.params;
const { code, title, description } = req.body;
const updated = await prisma.course.update({ where: { id }, data: { code, title, description } });
res.json(updated);
}


// lifecycle transition endpoint: { action: 'submitForReview' | 'publish' | 'archive' }
const transitions = {
DRAFT: ['PENDING_REVIEW', 'PUBLISHED'],
PENDING_REVIEW: ['DRAFT', 'PUBLISHED'],
PUBLISHED: ['ARCHIVED'],
ARCHIVED: []
};


export async function transitionCourse(req, res) {
const { id } = req.params;
const { action } = req.body;
const course = await prisma.course.findUnique({ where: { id } });
if (!course) return res.sendStatus(404);


// map action -> target state
const actionMap = {
submitForReview: 'PENDING_REVIEW',
publish: 'PUBLISHED',
archive: 'ARCHIVED',
saveDraft: 'DRAFT'
};
const target = actionMap[action];
if (!target) return res.status(400).json({ error: 'unknown action' });
const allowed = transitions[course.lifecycle];
if (!allowed.includes(target)) return res.status(400).json({ error: `can't transition ${course.lifecycle} -> ${target}` });


const updated = await prisma.course.update({ where: { id }, data: { lifecycle: target } });
res.json(updated);
}