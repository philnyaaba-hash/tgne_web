import LoginForm from './LoginForm';

export const metadata = {
  title: 'Sign in | TGNE Solutions',
  description: 'Sign in to your TGNE Solutions workspace. Manage service requests, orders, invoices and team collaboration.',
  robots: { index: false, follow: false }
};

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return <LoginForm />;
}
