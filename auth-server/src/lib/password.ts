import bcrypt from "bcrypt";
import { BCRYPT_ROUNDS } from "../config/constants.js";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}
