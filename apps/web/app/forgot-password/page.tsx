import { PasswordRecoveryForm } from '../../components/password-recovery-form';

export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  return <PasswordRecoveryForm mode="request" />;
}
