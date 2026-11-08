import { redirect } from 'next/navigation';

export const metadata = { title: 'Office — LandLedger' };

export default function OfficePage() {
  redirect('/dashboard#/office-overview');
}
