import bcryptjs from "bcryptjs";
import { randomBytes } from "crypto";

export async function hashCollaboratorPassword(plainPassword: string): Promise<string> {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(plainPassword, salt);
}

export async function compareCollaboratorPassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcryptjs.compare(plainPassword, hashedPassword);
}

export function generateCollaboratorPassword(length = 10): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += alphabet[bytes[i]! % alphabet.length];
  }
  return result;
}

export function toStaffCollaboratorView<T extends Record<string, unknown>>(doc: T) {
  const { password: _password, ...rest } = doc;
  return rest;
}
