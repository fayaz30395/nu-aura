'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  Globe,
  Server,
  Database,
  Key,
  FileCheck,
  Eye,
  CloudLightning,
  Check,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function SecurityPage() {
  const certifications = [
    {
      icon: Shield,
      name: 'SOC 2 Type II',
      description: 'Audited security controls and processes',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: Globe,
      name: 'GDPR Compliant',
      description: 'EU data protection regulation compliance',
      color: 'from-green-500 to-green-600',
    },
    {
      icon: FileCheck,
      name: 'ISO 27001',
      description: 'Information security management',
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: Lock,
      name: 'Privacy Shield',
      description: 'Cross-border data transfer framework',
      color: 'from-orange-500 to-orange-600',
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
      description: 'Full support for GDPR data subject access requests',
    },
    {
      title: 'Data Portability',
      description: 'Export all data in standard formats',
    },
    {
      title: 'Right to Erasure',
      description: 'Permanent data deletion with audit trail',
    },
    {
      title: 'Data Processing Agreements',
      description: 'Standard DPA templates available',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      {/* Header */}
      <header className="border-b border-[var(--border-main)] sticky top-0 z-50 bg-[var(--bg-elevated)] backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
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
        <div className="max-w-4xl mx-auto">
          <Badge size="lg" variant="success" className="mb-6">
            Security & Compliance
          </Badge>
          <h1 className="text-5xl font-bold text-[var(--text-primary)] mb-4">
            Enterprise-grade security you can trust
          </h1>
          <p className="text-xl text-[var(--text-secondary)] mb-8">
            Bank-level encryption, SOC 2 certified, and GDPR compliant. Your data security is our top priority.
          </p>
          <Button size="lg" variant="outline" className="gap-2">
            <Download className="h-5 w-5" />
            Download Security White Paper
          </Button>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {certifications.map((cert, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card hover padding="lg" className="text-center h-full">
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cert.color} flex items-center justify-center mx-auto mb-4`}
                  >
                    <cert.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                    {cert.name}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">{cert.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
              Comprehensive security architecture
            </h2>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              Multiple layers of protection keep your sensitive HR data secure
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card padding="lg" className="h-full">
                  <div className="w-12 h-12 rounded-xl bg-success-50 dark:bg-success-950 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-success-600 dark:text-success-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.details.map((detail, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Check className="h-4 w-4 text-success-500 flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge size="md" variant="info" className="mb-4">
              Compliance
            </Badge>
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
              GDPR & data privacy compliance
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              Full compliance with global data protection regulations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {complianceFeatures.map((feature, index) => (
              <Card key={index} padding="lg">
                <div className="flex items-start gap-4">
                  <Check className="h-6 w-6 text-success-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">{feature.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-surface)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge size="md" variant="primary" className="mb-4">
              Infrastructure
            </Badge>
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
              Enterprise cloud infrastructure
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              Hosted on AWS/GCP with enterprise SLA and 24/7 monitoring
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <Card key={index} padding="lg" className="text-center">
                <stat.icon className="h-10 w-10 text-primary-600 dark:text-primary-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-[var(--text-primary)] mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-[var(--text-muted)]">{stat.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
            Have security questions?
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-8">
            Our security team is here to answer any questions you may have
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/contact">
              <Button size="lg">Contact Security Team</Button>
            </Link>
            <Button size="lg" variant="outline" className="gap-2">
              <Download className="h-5 w-5" />
              Download Security Docs
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
