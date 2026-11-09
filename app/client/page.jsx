import ClientPortal from '../../components/client-portal/client-portal';

export const metadata = {
  title: 'Corporate client portal | TGNE Solutions',
  robots: { index: false, follow: false }
};

export default function ClientPage() {
  return <ClientPortal mode="client" />;
}
