import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ResumeBuilder from '@/components/resume/ResumeBuilder';
import { TailoringProvider } from '@/store/TailoringProvider';

export default async function EditResumePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    const { id } = await params;

    return (
        <TailoringProvider>
            <ResumeBuilder resumeId={id} />
        </TailoringProvider>
    );
}

