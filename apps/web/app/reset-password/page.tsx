import { PasswordRecoveryForm } from '../../components/password-recovery-form';

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <PasswordRecoveryForm mode="reset" initialToken={params.token ?? ''} />;
}
