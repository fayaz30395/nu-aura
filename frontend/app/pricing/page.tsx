'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Check,
  X,
  ArrowRight,
  Zap,
  Building2,
  Users,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const plans = [
    {
      name: 'Starter',
      icon: Zap,
      price: billingCycle === 'monthly' ? 12 : 10,
      description: 'Perfect for growing teams',
      popular: false,
      features: [
        'Up to 50 employees',
        'Core HRMS (attendance, leave, payroll)',
        'Employee self-service portal',
        'Basic reports & analytics',
        'Mobile app access',
        'Email support',
        'Data export',
      ],
      notIncluded: [
        'Performance management',
        'Recruitment & ATS',
        'Learning & Development',
        'API access',
        'Custom workflows',
      ],
    },
    {
      name: 'Professional',
      icon: Users,
      price: billingCycle === 'monthly' ? 18 : 15,
      description: 'For scaling organizations',
      popular: true,
      features: [
        'Up to 500 employees',
        'Everything in Starter',
        'Performance management & OKRs',
        'Recruitment & ATS',
        'Advanced reports & analytics',
        'Custom workflows & approvals',
        'API access & webhooks',
        'Priority support',
        'SSO integration',
        'Biometric integrations',
      ],
      notIncluded: [
        'Unlimited employees',
        'White-label options',
        'Dedicated account manager',
      ],
    },
    {
      name: 'Enterprise',
      icon: Building2,
      price: null,
      description: 'For large organizations',
      popular: false,
      features: [
        'Unlimited employees',
        'Everything in Professional',
        'Learning & Development (LMS)',
        'Advanced AI analytics',
        'Custom integrations',
        'Dedicated account manager',
        'Custom SLA & support',
        'White-label options',
        'On-premise deployment',
        'Advanced security controls',
        'Migration assistance',
      ],
      notIncluded: [],
    },
  ];

  const addons = [
    {
      name: 'NU-Fluence',
      description: 'Knowledge management & collaboration',
      price: 3,
    },
    {
      name: 'Advanced Analytics',
      description: 'AI-powered insights & predictions',
      price: 5,
    },
    {
      name: 'Custom Integrations',
      description: 'Build custom workflows & integrations',
      price: 'Custom',
    },
  ];

  const faqs = [
    {
      question: "What's included in the free trial?",
      answer:
        'The 14-day free trial includes full access to all Professional plan features with up to 25 employees. No credit card required.',
    },
    {
      question: 'Can I change plans later?',
      answer:
        'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we will prorate any charges.',
    },
    {
      question: 'What payment methods do you accept?',
      answer:
        'We accept all major credit cards (Visa, Mastercard, Amex), ACH transfers, and wire transfers for annual contracts.',
    },
    {
      question: 'Is there a setup fee?',
      answer:
        'No setup fees for Starter and Professional plans. Enterprise plans include dedicated onboarding and migration support at no extra cost.',
    },
    {
      question: 'What happens to my data if I cancel?',
      answer:
        'You can export all your data at any time. We retain your data for 30 days after cancellation, then permanently delete it.',
    },
    {
      question: 'Do you offer discounts for non-profits?',
      answer:
        'Yes, we offer 20% discounts for registered non-profit organizations and educational institutions. Contact sales for details.',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      {/* Header */}
      <header className="border-b border-[var(--border-main)] sticky top-0 z-50 bg-[var(--bg-elevated)] backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="row-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-[var(--text-primary)]">NU-AURA</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Sign In
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
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            transition={{ duration: 0.5 }}
          >
            <Badge size="lg" variant="primary" className="mb-6">
              Pricing
            </Badge>
            <h1 className="text-5xl font-bold text-[var(--text-primary)] mb-4">
              Simple, transparent pricing
            </h1>
            <p className="text-xl text-[var(--text-secondary)] mb-8">
              Choose the plan that fits your team. Scale as you grow.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-main)]">
              <button
                onClick={() => setBillingCycle('monthly')}
                aria-label="Switch to monthly billing"
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                  billingCycle === 'monthly'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-card)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                aria-label="Switch to annual billing"
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                  billingCycle === 'annual'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-card)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                Annual
                <Badge size="sm" variant="success">
                  Save 17%
                </Badge>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center z-10">
                    <Badge variant="primary" size="md" className="shadow-[var(--shadow-dropdown)]">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <Card
                  variant={plan.popular ? 'elevated' : 'default'}
                  padding="lg"
                  className={`h-full ${
                    plan.popular ? 'ring-2 ring-accent-500/50 scale-105' : ''
                  }`}
                >
                  <CardHeader className="pb-6">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                        plan.popular
                          ? 'from-accent-500 to-accent-700'
                          : 'from-surface-600 to-surface-700'
                      } flex items-center justify-center mb-4`}
                    >
                      <plan.icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <p className="text-body-muted">{plan.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      {plan.price !== null ? (
                        <>
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-[var(--text-primary)]">
                              ${plan.price}
                            </span>
                            <span className="text-[var(--text-muted)]">/user/month</span>
                          </div>
                          {billingCycle === 'annual' && (
                            <p className="text-sm text-success-600 dark:text-success-400 mt-1">
                              Billed annually
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="text-2xl font-bold skeuo-emboss">
                          Custom
                        </div>
                      )}
                    </div>

                    <Link href={plan.price !== null ? '/auth/login' : '/contact'}>
                      <Button
                        className="w-full"
                        variant={plan.popular ? 'primary' : 'outline'}
                        size="lg"
                      >
                        {plan.price !== null ? 'Start Free Trial' : 'Contact Sales'}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>

                    <div className="space-y-4 pt-4">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-4">
                          <Check className="h-5 w-5 text-success-500 flex-shrink-0 mt-0.5" />
                          <span className="text-body-secondary">{feature}</span>
                        </div>
                      ))}
                      {plan.notIncluded.map((feature, i) => (
                        <div key={i} className="flex items-start gap-4 opacity-40">
                          <X className="h-5 w-5 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
                          <span className="text-body-muted">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl  font-bold text-[var(--text-primary)] mb-4">
              Enhance with add-ons
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              Extend your platform capabilities with optional modules
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {addons.map((addon, index) => (
              <motion.div
                key={addon.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card hover padding="lg">
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    {addon.name}
                  </h3>
                  <p className="text-body-secondary mb-4">
                    {addon.description}
                  </p>
                  <div className="flex items-baseline gap-1">
                    {typeof addon.price === 'number' ? (
                      <>
                        <span className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                          ${addon.price}
                        </span>
                        <span className="text-body-muted">/user/month</span>
                      </>
                    ) : (
                      <span className="text-xl font-semibold text-[var(--text-primary)]">
                        {addon.price}
                      </span>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-surface)]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl  font-bold text-[var(--text-primary)] mb-4">
              Frequently asked questions
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              Everything you need to know about pricing and billing
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index} padding="none" className="overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 row-between text-left hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <HelpCircle className="h-5 w-5 text-accent-700 dark:text-accent-400 flex-shrink-0" />
                    <span className="font-medium text-[var(--text-primary)]">
                      {faq.question}
                    </span>
                  </div>
                  {openFaq === index ? (
                    <ChevronUp className="h-5 w-5 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-[var(--text-muted)]" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4 pt-2">
                    <p className="text-body-secondary leading-relaxed pl-8">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl  font-bold text-[var(--text-primary)] mb-4">
            Still have questions?
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-8">
            Our team is here to help you find the perfect plan for your organization
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/contact">
              <Button size="lg" variant="outline">
                Contact Sales
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg">Start Free Trial</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
