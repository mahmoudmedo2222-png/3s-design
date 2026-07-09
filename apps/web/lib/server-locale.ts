import { cookies } from 'next/headers';
import { type AppLocale, isAppLocale, localeCookieName } from './locale';

export async function getRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(localeCookieName)?.value;

  return isAppLocale(locale) ? locale : 'en';
}
