import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Office | TGNE Solutions',
  robots: { index: false, follow: false }
};

export default function OfficePage() {
  redirect('/dashboard#/office-overview');
}
