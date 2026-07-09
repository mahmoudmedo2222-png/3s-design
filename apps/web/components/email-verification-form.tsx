'use client';

import { ArrowRight, MailCheck, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { verifyEmail } from '../lib/api';
import { Button, Input, Notice, Panel } from './ui';

export function EmailVerificationForm({ initialToken = '' }: { initialToken?: string }) {
  const [token, setToken] = useState(initialToken);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      await verifyEmail({ token: token.trim() });
      setMessage('Email verified. Sign in again to refresh your protected account status.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Email verification failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-5 dark:bg-[#0b0f0e]">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-4xl items-center">
        <Panel className="grid w-full overflow-hidden shadow-panel lg:grid-cols-[0.85fr_1.15fr]">
          <div className="relative hidden min-h-[410px] overflow-hidden bg-ink p-6 text-white lg:block">
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
                    Account trust
                  </span>
                  <span className="mt-1 block text-2xl font-black text-saffron">3S Design</span>
                </span>
              </Link>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-saffron">Verify ownership</p>
                <h1 className="mt-3 max-w-sm text-3xl font-black leading-tight">Confirm the email that owns purchases.</h1>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/72">
                  Verified email status protects invoices, support, payment review, and download recovery.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/75">
                <ShieldCheck className="text-saffron" size={18} />
                Tokens are single-use and expire.
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <Link href="/account" className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-pine">
              <ArrowRight className="icon-back" size={16} />
              Back to account
            </Link>

            <div className="mb-5 mt-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-pine text-white dark:bg-[#1f6b59]">
                <MailCheck size={18} />
              </span>
              <h1 className="mt-3 text-2xl font-black text-ink">Verify your email</h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                Paste the verification token from email. In local development, use the dev token shown in your account.
              </p>
            </div>

            <form className="grid gap-3" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Verification token
                <Input
                  required
                  minLength={32}
                  dir="ltr"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="Paste email verification token"
                />
              </label>

              {error ? <Notice tone="error">{error}</Notice> : null}
              {message ? <Notice tone="success">{message}</Notice> : null}

              <Button type="submit" disabled={isSubmitting} className="mt-2 h-11">
                {isSubmitting ? 'Verifying...' : 'Verify email'}
                <ArrowRight size={17} />
              </Button>
            </form>
          </div>
        </Panel>
      </div>
    </main>
  );
}
