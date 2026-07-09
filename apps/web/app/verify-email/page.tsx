import { EmailVerificationForm } from '../../components/email-verification-form';

export const dynamic = 'force-dynamic';

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <EmailVerificationForm initialToken={params.token ?? ''} />;
}
