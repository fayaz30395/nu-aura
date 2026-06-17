import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | NU-AURA',
  description: 'NU-AURA Privacy Policy.',
  robots: {index: false, follow: false},
};

const LAST_UPDATED = '17 June 2026';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/auth/login"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--text-3)] transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <ArrowLeft className="h-4 w-4"/> Back to sign in
        </Link>

        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[var(--text-3)]">Last updated: {LAST_UPDATED}</p>

        <div
          className="mt-6 rounded-aura-md border border-[var(--warn-bd)] bg-[var(--warn-bg)] px-4 py-3 text-sm text-[var(--warn-fg)]">
          <strong>Template notice:</strong> This is placeholder text provided to wire up the
          product flow. It is not legal advice and must be replaced with a counsel-reviewed,
          jurisdiction-appropriate privacy policy before public launch.
        </div>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-[var(--text-2)]">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-[var(--text-1)]">1. Overview</h2>
            <p>
              NU-AURA is an HR and people-operations platform operated by NULogic Technologies. We
              process personal data on behalf of subscribing organizations (employers) as a data
              processor, and a limited amount of data as a controller for operating the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-[var(--text-1)]">2. Data we process</h2>
            <p>
              Depending on how your organization configures the Service, we may process identity and
              contact details, employment and payroll records, attendance and leave data, documents
              you upload, and usage and audit logs needed to secure and operate the platform.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-[var(--text-1)]">3. How we use data</h2>
            <p>
              We use personal data solely to provide, secure, and support the Service for your
              organization &mdash; for example, authenticating users, enforcing role-based access,
              processing HR workflows, and maintaining audit trails. We do not sell personal data.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-[var(--text-1)]">4. Data isolation and security</h2>
            <p>
              Each organization&rsquo;s data is logically isolated by tenant. We apply access
              controls, encryption in transit, and audit logging. Access to your data is restricted
              to authorized users within your organization and to our personnel as needed to operate
              the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-[var(--text-1)]">5. Your rights</h2>
            <p>
              Subject to applicable law, individuals may request access to, correction of, or
              deletion of their personal data. Because we act as a processor for your employer, such
              requests are generally directed to and fulfilled by your organization through the
              platform&rsquo;s data-subject-request tools.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-[var(--text-1)]">6. Retention</h2>
            <p>
              We retain personal data for as long as needed to provide the Service and as instructed
              by your organization, after which it is deleted or anonymized in line with the
              applicable services agreement and legal obligations.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-[var(--text-1)]">7. Contact</h2>
            <p>
              For privacy questions, contact your organization&rsquo;s administrator or NULogic
              Technologies at the contact address provided in your services agreement. See also our{' '}
              <Link href="/terms" className="text-[var(--accent)] hover:underline">Terms of Service</Link>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
