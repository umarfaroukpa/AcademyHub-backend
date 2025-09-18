const { Request, Response, NextFunction } = require('express');
const { verifyJwt } = require('../libs/jwt');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.sendStatus(401);
  const [, token] = header.split(' ');
  if (!token) return res.sendStatus(401);
  const payload = verifyJwt(token);
  if (!payload) return res.sendStatus(401);
  req.user = payload;
  next();
};

module.exports = { authenticate };