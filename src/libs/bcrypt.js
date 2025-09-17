const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

const hash = (plain) => bcrypt.hash(plain, SALT_ROUNDS);
const compare = (plain, hashVal) => bcrypt.compare(plain, hashVal);

module.exports = { hash, compare };