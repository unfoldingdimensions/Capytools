import { redirect } from 'next/navigation';

/**
 * The tool lives at /capyresume. The marketing page is a later, separate pass,
 * so the root redirects for now rather than duplicating the tool.
 */
export default function HomePage() {
  redirect('/capyresume');
}
