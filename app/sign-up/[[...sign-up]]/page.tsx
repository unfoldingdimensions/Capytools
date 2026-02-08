import { SignUp } from '@clerk/nextjs';

export default async function SignUpPage({
    searchParams,
}: {
    searchParams: Promise<{ redirect_url?: string }>;
}) {
    const params = await searchParams;
    const redirectUrl = params.redirect_url || '/dashboard';

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md">
                <SignUp
                    forceRedirectUrl={redirectUrl}
                    appearance={{
                        elements: {
                            rootBox: 'mx-auto',
                            card: 'shadow-lg',
                        },
                    }}
                />
            </div>
        </div>
    );
}
