"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '../../../lib/auth-client';

export default function SignOutPage() {
    const router = useRouter();
    const running = useRef(false);

    useEffect(() => {
        if (running.current) return;
        running.current = true;

        // Call signOut and on success redirect to home page
        authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.replace('/');
                }
            }
        }).catch(() => {
            // Even if signOut fails, ensure user is sent to home
            try { router.replace('/'); } catch (e) { /* ignore */ }
        });
    }, [router]);

    return (
        <main className="min-h-screen flex items-center justify-center p-8">
            <div className="text-center">
                <p className="text-lg font-medium">Cerrando sesión…</p>
            </div>
        </main>
    );
}
