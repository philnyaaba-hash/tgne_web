import ClientPortal from '../../components/client-portal/client-portal';

export const metadata = {
  title: 'Admin dashboard | TGNE Solutions',
  robots: { index: false, follow: false }
};

export default function AdminPage() {
  return <ClientPortal mode="admin" />;
}
