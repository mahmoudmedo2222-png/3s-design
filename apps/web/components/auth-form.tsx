'use client';

import { ArrowRight, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { loginCustomer, registerCustomer, type AuthResponse } from '../lib/api';
import { accessTokenKey, authChangedEvent, refreshTokenExpiresAtKey, refreshTokenKey, userKey } from '../lib/auth-session';
import { type AppLocale, authCopy } from '../lib/locale';
import { Button, Input, Notice, Panel } from './ui';

type AuthMode = 'login' | 'register';

const englishEmailInputPattern = '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}';
const englishEmailTitle = 'Use an English email like name@example.com';

function storeAuthSession(response: AuthResponse) {
  window.localStorage.setItem(accessTokenKey, response.accessToken);
  window.localStorage.setItem(userKey, JSON.stringify(response.user));
  if (response.refreshToken) {
    window.localStorage.setItem(refreshTokenKey, response.refreshToken);
  } else {
    window.localStorage.removeItem(refreshTokenKey);
  }
  if (response.refreshTokenExpiresAt) {
    window.localStorage.setItem(refreshTokenExpiresAtKey, response.refreshTokenExpiresAt);
  } else {
    window.localStorage.removeItem(refreshTokenExpiresAtKey);
  }
  window.dispatchEvent(new Event(authChangedEvent));
}

function readSafeNextPath() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/account';
  }

  return next;
}

function authSwitchPath(path: '/login' | '/register') {
  if (typeof window === 'undefined') {
    return path as Route;
  }

  const next = readSafeNextPath();
  return (next === '/account' ? path : `${path}?next=${encodeURIComponent(next)}`) as Route;
}

export function AuthForm({ mode, locale }: { mode: AuthMode; locale: AppLocale }) {
  const router = useRouter();
  const isRegister = mode === 'register';
  const copy = authCopy[locale];
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = isRegister ? await registerCustomer({ fullName, email, password }) : await loginCustomer({ email, password });

      storeAuthSession(response);
      router.push(readSafeNextPath() as Route);
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : copy.unknownError;
      setError(message === 'Failed to fetch' ? copy.apiDown : message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-5 dark:bg-[#0b0f0e]">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-5xl items-center">
        <Panel className="grid w-full overflow-hidden shadow-panel lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative hidden min-h-[460px] overflow-hidden bg-ink p-6 text-white lg:block">
            <div className="absolute inset-0 opacity-70">
              <div className="intro-grid" />
              <div className="intro-strike intro-strike-one" />
              <div className="intro-strike intro-strike-two" />
            </div>
            <div className="relative z-10 flex h-full flex-col justify-between">
              <Link href="/" className="brand-lockup" aria-label={copy.back}>
                <span className="brand-mark" aria-hidden="true">
                  <span className="brand-mark__stroke brand-mark__stroke--one" />
                  <span className="brand-mark__stroke brand-mark__stroke--two" />
                  <span className="brand-mark__spark" />
                </span>
                <span>
                  <span className="block text-[0.68rem] font-extrabold uppercase leading-none tracking-[0.16em] text-white/70">
                    {copy.clientAccess}
                  </span>
                  <span className="mt-1 block text-2xl font-black text-saffron">3S Design</span>
                </span>
              </Link>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-saffron">{copy.privateShelf}</p>
                <h1 className="mt-3 max-w-sm text-3xl font-black leading-tight">{copy.sideTitle}</h1>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/72">{copy.sideText}</p>
              </div>

              <div className="grid gap-3 text-sm text-white/75">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-saffron" size={18} />
                  {copy.secureDownloads}
                </div>
                <div className="flex items-center gap-2">
                  <LockKeyhole className="text-saffron" size={18} />
                  {copy.fraudChecks}
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-pine">
                <ArrowRight className="icon-back" size={16} />
                {copy.back}
              </Link>
            </div>

            <div className="mb-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-pine text-white dark:bg-[#1f6b59]">
                {isRegister ? <UserRound size={18} /> : <LockKeyhole size={18} />}
              </span>
              <h1 className="mt-3 text-2xl font-black text-ink">{isRegister ? copy.createTitle : copy.loginTitle}</h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted">{isRegister ? copy.createText : copy.loginText}</p>
            </div>

            <form className="grid gap-3" onSubmit={handleSubmit}>
              {isRegister ? (
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  {copy.fullName}
                  <span className="relative">
                    <UserRound className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                    <Input
                      required
                      minLength={2}
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="ps-11"
                      placeholder={copy.fullNamePlaceholder}
                    />
                  </span>
                </label>
              ) : null}

              <label className="grid gap-2 text-sm font-semibold text-ink">
                {copy.email}
                <span className="relative">
                  <Mail className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <Input
                    required
                    type="email"
                    dir="ltr"
                    lang="en"
                    inputMode="email"
                    autoCapitalize="none"
                    pattern={englishEmailInputPattern}
                    title={locale === 'ar' ? copy.emailTitle : englishEmailTitle}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="ps-11"
                    placeholder="you@example.com"
                  />
                </span>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-ink">
                {copy.password}
                <span className="relative">
                  <LockKeyhole className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <Input
                    required
                    type="password"
                    minLength={isRegister ? 12 : 8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="ps-11"
                    placeholder={isRegister ? copy.registerPasswordPlaceholder : copy.loginPasswordPlaceholder}
                  />
                </span>
              </label>

              {error ? <Notice tone="error">{error}</Notice> : null}

              {!isRegister ? (
                <Link
                  href={'/forgot-password' as Route}
                  className="justify-self-start text-sm font-bold text-pine transition hover:underline"
                >
                  Forgot password?
                </Link>
              ) : null}

              <Button type="submit" disabled={isSubmitting} className="mt-2 h-11">
                {isSubmitting ? copy.wait : isRegister ? copy.createAccount : copy.signIn}
                <ArrowRight size={17} />
              </Button>
            </form>

            <Notice className="mt-5 bg-paper text-muted dark:bg-[#0f1513]">
              {isRegister ? copy.haveAccount : copy.newCustomer}{' '}
              <Link href={authSwitchPath(isRegister ? '/login' : '/register')} className="font-bold text-pine hover:underline">
                {isRegister ? copy.signIn : copy.createAccount}
              </Link>
            </Notice>
          </div>
        </Panel>
      </div>
    </main>
  );
}
