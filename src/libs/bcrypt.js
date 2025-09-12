import bcrypt from 'bcrypt';




const SALT_ROUNDS = 10;
export const hash = (plain) => bcrypt.hash(plain, SALT_ROUNDS);
export const compare = (plain, hashVal) => bcrypt.compare(plain, hashVal);