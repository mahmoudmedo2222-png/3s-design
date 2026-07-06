export const englishEmailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
export const englishEmailMessage = 'Email must be written in English, for example name@example.com';

export function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

export function isEnglishEmail(email: string) {
  return englishEmailPattern.test(email);
}
