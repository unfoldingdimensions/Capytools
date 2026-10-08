import type { Metadata } from 'next';
import { CapyResume } from '@/components/tool/CapyResume';

export const metadata: Metadata = {
  title: 'CapyResume — free resume builder in your browser',
  description:
    'Build a clean, single-column resume and export a real PDF or DOCX — no signup, no watermark. Your details never leave this tab.',
  alternates: { canonical: '/capyresume' },
};

export default function CapyResumePage() {
  return <CapyResume />;
}
