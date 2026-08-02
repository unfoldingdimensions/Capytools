import { NextApiRequest, NextApiResponse } from 'next';
import { Webhook } from 'svix';
import { prisma } from '@/lib/db/prisma';
import { buffer } from 'micro';

/**
 * Clerk Webhook Handler
 * 
 * Syncs Clerk user events with our database
 */

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

interface ClerkWebhookEvent {
    type: string;
    data: {
        id: string;
        email_addresses: Array<{ email_address: string }>;
        first_name: string | null;
        last_name: string | null;
        profile_image_url: string | null;
    };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!webhookSecret) {
        console.error('CLERK_WEBHOOK_SECRET is not set');
        return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    try {
        const payload = (await buffer(req)).toString();
        const headers = req.headers;

        const svix = new Webhook(webhookSecret);
        const evt = svix.verify(payload, {
            'svix-id': headers['svix-id'] as string,
            'svix-timestamp': headers['svix-timestamp'] as string,
            'svix-signature': headers['svix-signature'] as string,
        }) as ClerkWebhookEvent;

        const { type, data } = evt;
        const clerkUserId = data.id;
        const email = data.email_addresses[0]?.email_address;

        if (!email) {
            throw new Error('No email found in Clerk webhook data');
        }

        switch (type) {
            case 'user.created':
            case 'user.updated':
                // Upsert so event order and races don't matter:
                // - user.created can arrive after requireAuth already auto-created the row
                //   (previously a unique-constraint 500 that made Clerk retry forever).
                // - user.updated can arrive before user.created (previously P2025 -> 500).
                // The update path only touches profile fields, never resetting credits.
                await prisma.user.upsert({
                    where: { clerkUserId },
                    update: {
                        email,
                        firstName: data.first_name,
                        lastName: data.last_name,
                        profileImageUrl: data.profile_image_url,
                    },
                    create: {
                        clerkUserId,
                        email,
                        firstName: data.first_name,
                        lastName: data.last_name,
                        profileImageUrl: data.profile_image_url,
                        subscriptionTier: 'FREE',
                        creditsRemaining: 3,
                        creditsUsed: 0,
                    },
                });

                console.log(`User synced (${type}): ${clerkUserId}`);
                break;

            case 'user.deleted':
                // deleteMany is idempotent - no error if the row is already gone.
                await prisma.user.deleteMany({ where: { clerkUserId } });

                console.log(`User deleted: ${clerkUserId}`);
                break;

            default:
                console.log(`Unhandled webhook event type: ${type}`);
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

export default handler;

export const config = {
    api: {
        bodyParser: false,
    },
};

