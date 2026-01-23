import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ResumeBuilder from '@/components/resume/ResumeBuilder';
import { TailoringProvider } from '@/store/TailoringProvider';

export default async function NewResumePage() {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    return (
        <TailoringProvider>
            <ResumeBuilder />
        </TailoringProvider>
    );
}

