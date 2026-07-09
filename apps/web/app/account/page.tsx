import { AccountDashboard } from '../../components/account-dashboard';
import { getRequestLocale } from '../../lib/server-locale';

export default async function AccountPage() {
  const locale = await getRequestLocale();

  return <AccountDashboard locale={locale} />;
}
