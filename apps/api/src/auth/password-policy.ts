import { BadRequestException } from '@nestjs/common';

export const strongPasswordMessage = 'Password must be at least 12 characters and include uppercase, lowercase, and number characters';

export function isStrongPassword(password: string) {
  return password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
}

export function assertStrongPassword(password: string) {
  if (!isStrongPassword(password)) {
    throw new BadRequestException(strongPasswordMessage);
  }
}
