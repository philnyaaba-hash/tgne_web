import ResetPasswordForm from './ResetPasswordForm';

export const dynamic = 'force-dynamic';

export default function ResetPasswordPage({ params }) {
  return <ResetPasswordForm token={params.token} />;
}
