import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | NU-AURA',
  description: 'NU-AURA Terms of Service.',
  robots: {index: false, follow: false},
};

const LAST_UPDATED = '17 June 2026';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/auth/login"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--text-3)] transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <ArrowLeft className="h-4 w-4"/> Back to sign in
        </Link>

        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-[var(--text-3)]">Last updated: {LAST_UPDATED}</p>

        <div
          className="mt-6 rounded-aura-md border border-[var(--warn-bd)] bg-[var(--warn-bg)] px-4 py-3 text-sm text-[var(--warn-fg)]">
          <strong>Template notice:</strong> This is placeholder text provided to wire up the
          product flow. It is not legal advice and must be replaced with counsel-reviewed terms
          before public launch.
        </div>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-[var(--text-2)]">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-[var(--text-1)]">1. Agreement to terms</h2>
            <p>
              By accessing or using the NU-AURA platform (the &ldquo;Service&rdquo;), operated by
              NULogic Technologies (&ldquo;we&rdquo;, &ldquo;us&rdquo;), you agree to be bound by
              these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-[var(--text-1)]">2. Accounts and access</h2>
            <p>
              Access is provided to authorized employees and administrators of subscribing
              organizations. You are responsible for safeguarding your credentials and for all
              activity that occurs under your account. Notify your administrator immediately of any
              unauthorized use.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-[var(--text-1)]">3. Acceptable use</h2>
            <p>
              You agree not to misuse the Service, including by attempting to access data belonging
              to other tenants or users, probing or testing the vulnerability of the system without
              authorization, or interfering with its normal operation.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-[var(--text-1)]">4. Customer data</h2>
            <p>
              Your organization retains ownership of the data it submits. We process that data to
              provide the Service in accordance with our{' '}
              <Link href="/privacy" className="text-[var(--accent)] hover:underline">Privacy Policy</Link>{' '}
              and the applicable services agreement with your organization.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-[var(--text-1)]">5. Availability and changes</h2>
            <p>
              We may modify, suspend, or discontinue features of the Service at any time. We aim to
              provide reasonable notice of material changes through the Service or to your
              administrator.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-[var(--text-1)]">6. Disclaimers and liability</h2>
            <p>
              The Service is provided on an &ldquo;as is&rdquo; basis without warranties of any
              kind to the maximum extent permitted by law. The full warranty and liability terms
              will be set out in the executed services agreement.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-[var(--text-1)]">7. Contact</h2>
            <p>
              Questions about these terms can be directed to your organization&rsquo;s
              administrator or to NULogic Technologies at the contact address provided in your
              services agreement.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
