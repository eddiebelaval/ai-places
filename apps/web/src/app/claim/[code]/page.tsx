import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function ClaimPage({ params }: PageProps) {
  const { code } = await params;

  // Redirect to unified setup page with claim code
  redirect(`/setup?claim=${code}`);
}
