'use client';

import React, {useEffect} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {PageTransition, Reveal, Stagger, StaggerItem} from '@/components/motion';
import {
  Check,
  CloudLightning,
  Database,
  Download,
  Eye,
  FileCheck,
  Globe,
  Key,
  Lock,
  Server,
  Shield,
} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {Badge} from '@/components/ui/Badge';
import {Stat} from '@/components/ui/Stat';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';

export default function SecurityPage() {
  const {hasPermission, isReady} = usePermissions();
  const router = useRouter();

  const hasAccess = hasPermission(Permissions.SYSTEM_ADMIN);

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard?denied=1');
    }
  }, [isReady, hasAccess, router]);

  if (!isReady || !hasAccess) return null;
  const certifications = [
    {
      icon: Shield,
      name: 'Security Controls',
      description: 'Audited internal security controls aligned with SOC 2 framework; formal certification in progress',
      color: 'from-accent-500 to-accent-600',
    },
    {
      icon: Globe,
      name: 'Privacy Practices',
      description: 'GDPR-aligned data handling practices; DPIA in progress',
      color: 'from-success-500 to-success-600',
    },
    {
      icon: FileCheck,
      name: 'ISMS Practices',
      description: 'Information-security-management practices aligned with ISO 27001; certification roadmap',
      color: 'from-accent-700 to-accent-800',
    },
    {
      icon: Lock,
      name: 'Cross-Border Transfers',
      description: 'EU-US DPF-aligned data transfers (Privacy Shield was invalidated 2020)',
      color: 'from-warning-500 to-warning-600',
    },
  ];

  const securityFeatures = [
    {
      icon: Lock,
      title: 'Data Encryption',
      description:
        'Bank-grade 256-bit AES encryption for data at rest and TLS 1.3 for data in transit',
      details: [
        'Encrypted backups',
        'Secure key management',
        'End-to-end encryption',
        'Zero-knowledge architecture',
      ],
    },
    {
      icon: Shield,
      title: 'Access Control',
      description:
        'Role-based access control with 300+ granular permission nodes',
      details: [
        'Multi-factor authentication',
        'SSO integration',
        'Session management',
        'IP whitelisting',
      ],
    },
    {
      icon: Eye,
      title: 'Audit & Monitoring',
      description:
        'Comprehensive audit logs and real-time security monitoring',
      details: [
        'Activity logging',
        'Change tracking',
        'Anomaly detection',
        'Compliance reports',
      ],
    },
    {
      icon: Database,
      title: 'Data Isolation',
      description:
        'Multi-tenant architecture with strict logical data separation',
      details: [
        'Tenant-level isolation',
        'Separate schemas',
        'Query-level filtering',
        'Secure APIs',
      ],
    },
    {
      icon: CloudLightning,
      title: 'Infrastructure Security',
      description:
        'Enterprise-grade cloud infrastructure with 99.9% uptime SLA',
      details: [
        'DDoS protection',
        'WAF enabled',
        'Intrusion detection',
        'Automated failover',
      ],
    },
    {
      icon: Key,
      title: 'Authentication',
      description:
        'Secure identity management with modern authentication protocols',
      details: [
        'OAuth 2.0 / OIDC',
        'SAML 2.0 support',
        'Passwordless login',
        'Biometric support',
      ],
    },
  ];

  const complianceFeatures = [
    {
      title: 'Data Subject Rights',
      description: 'Coming Soon. Data Subject Rights endpoints (Article 15/17/20) are on the platform roadmap. Tenants can submit manual DSR requests via support@nulogic.io.',
    },
    {
      title: 'Data Portability',
      description: 'Coming Soon. Data Subject Rights endpoints (Article 15/17/20) are on the platform roadmap. Tenants can submit manual DSR requests via support@nulogic.io.',
    },
    {
      title: 'Right to Erasure',
      description: 'Coming Soon. Data Subject Rights endpoints (Article 15/17/20) are on the platform roadmap. Tenants can submit manual DSR requests via support@nulogic.io.',
    },
    {
      title: 'Data Processing Agreements',
      description: 'Standard DPA templates available',
    },
  ];

  return (
    <PageTransition className="page-shell-centered">
      {/* Header */}
      <header
        className="border-b border-[var(--border-main)] sticky top-0 z-50 bg-[var(--bg-elevated)] backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="row-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-[var(--text-primary)]">NU-AURA</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/pricing">
                <Button variant="ghost" size="sm">
                  Pricing
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 text-center">
        <Reveal className="max-w-4xl mx-auto">
          <Badge size="lg" variant="success" className="mb-6">
            Security & Compliance
          </Badge>
          <h1 className="text-5xl font-bold text-[var(--text-primary)] mb-4">
            Enterprise-grade security you can trust
          </h1>
          <p className="text-xl text-[var(--text-secondary)] mb-8">
            AES-256-GCM field-level encryption, security practices aligned with SOC 2 and GDPR; certifications in
            progress.
          </p>
          <Button size="lg" variant="outline" className="gap-2">
            <Download className="h-5 w-5"/>
            Download Security White Paper
          </Button>
        </Reveal>
      </section>

      {/* Certifications — list form. Each is a status item, not a marketing tile. */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <Card padding="none">
            <Stagger inView className="divide-y divide-[var(--border-subtle)]">
              {certifications.map((cert, index) => (
                <StaggerItem
                  key={index}
                  className="flex items-start gap-4 p-4 sm:p-6"
                >
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-br ${cert.color} flex items-center justify-center flex-shrink-0`}
                  >
                    <cert.icon className="h-6 w-6 text-white"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      {cert.name}
                    </h3>
                    <p className="text-body-secondary mt-1 leading-relaxed">{cert.description}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </Card>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
              Comprehensive security architecture
            </h2>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              Multiple layers of protection keep your sensitive HR data secure
            </p>
          </div>

          <Stagger inView className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityFeatures.map((feature, index) => (
              <StaggerItem
                key={index}
                className="h-full"
              >
                <Card padding="lg" className="h-full hover-lift">
                  <div
                    className="w-12 h-12 rounded-xl bg-success-50 dark:bg-success-950 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-success-600 dark:text-success-400"/>
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-body-secondary mb-4 leading-relaxed">
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.details.map((detail, i) => (
                      <li key={i} className="flex items-center gap-2 text-body-secondary">
                        <Check className="h-4 w-4 text-success-500 flex-shrink-0"/>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Compliance */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge size="md" variant="info" className="mb-4">
              Compliance
            </Badge>
            <h2 className="text-2xl  font-bold text-[var(--text-primary)] mb-4">
              GDPR & data privacy compliance
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              Full compliance with global data protection regulations
            </p>
          </div>

          {/* Compliance — list form. Each row is a discrete capability, not a marketing tile. */}
          <Card padding="none" className="divide-y divide-[var(--border-subtle)]">
            {complianceFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-4 p-4 sm:p-6">
                <Check className="h-5 w-5 text-success-500 flex-shrink-0 mt-1"/>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    {feature.title}
                  </h3>
                  <p className="text-body-secondary mt-1 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </section>

      {/* Infrastructure */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-surface)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge size="md" variant="primary" className="mb-4">
              Infrastructure
            </Badge>
            <h2 className="text-2xl  font-bold text-[var(--text-primary)] mb-4">
              Enterprise cloud infrastructure
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              Hosted on AWS/GCP with enterprise SLA and 24/7 monitoring
            </p>
          </div>

          <Stagger inView className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: CloudLightning,
                value: '99.9%',
                label: 'Uptime SLA',
              },
              {
                icon: Database,
                value: 'Daily',
                label: 'Automated Backups',
              },
              {
                icon: Server,
                value: '24/7',
                label: 'Security Monitoring',
              },
            ].map((stat, index) => (
              <StaggerItem key={index}>
                <Card padding="lg" className="hover-lift h-full">
                  <stat.icon className="h-10 w-10 text-accent-700 dark:text-accent-400 mb-4"/>
                  <Stat label={stat.label} value={stat.value} />
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <Reveal inView className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl  font-bold text-[var(--text-primary)] mb-4">
            Have security questions?
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-8">
            Our security team is here to answer any questions you may have
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/contact">
              <Button size="lg" className="btn-primary">Contact Security Team</Button>
            </Link>
            <Button size="lg" variant="outline" className="gap-2">
              <Download className="h-5 w-5"/>
              Download Security Docs
            </Button>
          </div>
        </Reveal>
      </section>
    </PageTransition>
  );
}
