'use client';

import { ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { requestPasswordReset, resetPassword } from '../lib/api';
import { ActionLink, Button, Input, Notice, Panel } from './ui';

const englishEmailInputPattern = '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}';

export function PasswordRecoveryForm({ mode, initialToken = '' }: { mode: 'request' | 'reset'; initialToken?: string }) {
  const isReset = mode === 'reset';
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetHref = useMemo(() => {
    const value = devToken || token;
    return value ? (`/reset-password?token=${encodeURIComponent(value)}` as Route) : ('/reset-password' as Route);
  }, [devToken, token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      if (isReset) {
        await resetPassword({ token: token.trim(), password });
        setMessage('Password changed. Sign in again with the new password.');
        setPassword('');
        return;
      }

      const response = await requestPasswordReset({ email });
      setDevToken(response.devPasswordResetToken ?? null);
      setMessage('If this email exists, a reset link has been issued.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Password recovery failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-5 dark:bg-[#0b0f0e]">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-4xl items-center">
        <Panel className="grid w-full overflow-hidden shadow-panel lg:grid-cols-[0.85fr_1.15fr]">
          <div className="relative hidden min-h-[430px] overflow-hidden bg-ink p-6 text-white lg:block">
            <div className="absolute inset-0 opacity-70">
              <div className="intro-grid" />
              <div className="intro-strike intro-strike-one" />
              <div className="intro-strike intro-strike-two" />
            </div>
            <div className="relative z-10 flex h-full flex-col justify-between">
              <Link href="/?intro=0" className="brand-lockup" aria-label="Back to 3S Design home">
                <span className="brand-mark" aria-hidden="true">
                  <span className="brand-mark__stroke brand-mark__stroke--one" />
                  <span className="brand-mark__stroke brand-mark__stroke--two" />
                  <span className="brand-mark__spark" />
                </span>
                <span>
                  <span className="block text-[0.68rem] font-extrabold uppercase leading-none tracking-[0.16em] text-white/70">
                    Account recovery
                  </span>
                  <span className="mt-1 block text-2xl font-black text-saffron">3S Design</span>
                </span>
              </Link>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-saffron">Protected purchases</p>
                <h1 className="mt-3 max-w-sm text-3xl font-black leading-tight">Recover access without exposing your downloads.</h1>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/72">
                  Reset links are single-use. Existing sessions are revoked after the password changes.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-white/75">
                <ShieldCheck className="text-saffron" size={18} />
                Order ownership stays locked to the verified account.
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-pine">
              <ArrowRight className="icon-back" size={16} />
              Back to sign in
            </Link>

            <div className="mb-5 mt-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-pine text-white dark:bg-[#1f6b59]">
                {isReset ? <LockKeyhole size={18} /> : <KeyRound size={18} />}
              </span>
              <h1 className="mt-3 text-2xl font-black text-ink">{isReset ? 'Set a new password' : 'Reset your password'}</h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                {isReset
                  ? 'Use the reset token from your email. In local development, paste the dev token shown after requesting reset.'
                  : 'Enter your account email. The response stays private so nobody can enumerate customers.'}
              </p>
            </div>

            <form className="grid gap-3" onSubmit={handleSubmit}>
              {isReset ? (
                <>
                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    Reset token
                    <span className="relative">
                      <KeyRound className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                      <Input
                        required
                        minLength={32}
                        dir="ltr"
                        value={token}
                        onChange={(event) => setToken(event.target.value)}
                        className="ps-11"
                        placeholder="Paste reset token"
                      />
                    </span>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    New password
                    <span className="relative">
                      <LockKeyhole className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                      <Input
                        required
                        minLength={12}
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="ps-11"
                        placeholder="12+ chars, upper, lower, number"
                      />
                    </span>
                  </label>
                </>
              ) : (
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  Email
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
                      title="Use an English email like name@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="ps-11"
                      placeholder="you@example.com"
                    />
                  </span>
                </label>
              )}

              {error ? <Notice tone="error">{error}</Notice> : null}
              {message ? <Notice tone="success">{message}</Notice> : null}
              {devToken ? (
                <Notice tone="info" className="border-saffron/35 bg-saffron/10 text-ink">
                  <p className="font-black">Development reset token</p>
                  <p className="mt-1 break-all font-mono text-xs">{devToken}</p>
                  <ActionLink href={resetHref} intent="secondary" className="mt-3 h-9 px-3 text-xs">
                    Continue to reset
                  </ActionLink>
                </Notice>
              ) : null}

              <Button type="submit" disabled={isSubmitting} className="mt-2 h-11">
                {isSubmitting ? 'Please wait...' : isReset ? 'Change password' : 'Send reset link'}
                <ArrowRight size={17} />
              </Button>
            </form>
          </div>
        </Panel>
      </div>
    </main>
  );
}
