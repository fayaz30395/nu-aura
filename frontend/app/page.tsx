'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  UserPlus,
  BookOpen,
  Shield,
  Zap,
  Globe,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Building2,
  BarChart3,
  Lock,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-aura">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Image
                src="/images/logo.png"
                alt="NU-AURA"
                width={140}
                height={42}
                className="h-9 w-auto object-contain dark:brightness-0 dark:invert"
                priority
              />
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="#features"
                className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Features
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/integrations"
                className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Integrations
              </Link>
              <Link
                href="/security"
                className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Security
              </Link>
            </nav>
            <div className="flex items-center gap-3">
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

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-primary-200/20 dark:bg-primary-800/10 blur-[120px]" />
          <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-info-200/15 dark:bg-info-800/8 blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div variants={fadeInUp} className="mb-6">
              <Badge size="lg" variant="outline-primary" className="gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                NU-AURA Platform v1.0
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[var(--text-primary)] leading-tight mb-6"
            >
              Your People.
              <br />
              <span className="bg-gradient-to-r from-primary-600 via-info-600 to-primary-500 dark:from-primary-400 dark:via-info-400 dark:to-primary-300 bg-clip-text text-transparent">
                Amplified.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-xl text-[var(--text-secondary)] leading-relaxed mb-10 max-w-2xl mx-auto"
            >
              One platform for HR, Recruitment, Performance, and Knowledge Management.
              Built for teams that move fast.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            >
              <Link href="/auth/login">
                <Button size="xl" className="gap-2 shadow-lg">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="xl" variant="outline" className="gap-2">
                  <Play className="h-4 w-4" />
                  Watch Demo
                </Button>
              </Link>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="flex flex-wrap items-center justify-center gap-4 text-sm text-[var(--text-muted)]"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                Enterprise Security
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                Smart Workflows
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                Multi-Tenant SaaS
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge size="md" variant="primary" className="mb-4">
              Features
            </Badge>
            <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
              Everything you need to manage your workforce
            </h2>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              From hiring to retirement, NU-AURA streamlines every HR process with intelligent automation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: 'Core HR Management',
                description:
                  'Complete employee lifecycle management from onboarding to offboarding. Centralized data, org charts, and compliance.',
                color: 'from-blue-500 to-blue-600',
              },
              {
                icon: Clock,
                title: 'Smart Attendance',
                description:
                  'Biometric integration, geofencing, shift management, and flexible leave policies with real-time insights.',
                color: 'from-emerald-500 to-emerald-600',
              },
              {
                icon: DollarSign,
                title: 'Payroll & Compliance',
                description:
                  'Automated salary calculations, tax compliance, statutory filings, and instant payslip generation.',
                color: 'from-amber-500 to-orange-500',
              },
              {
                icon: TrendingUp,
                title: 'Performance & OKRs',
                description:
                  'OKRs, 360° feedback, 9-box calibration, and continuous performance tracking for growth.',
                color: 'from-violet-500 to-purple-600',
              },
              {
                icon: UserPlus,
                title: 'Recruitment & ATS',
                description:
                  'Post jobs, track candidates, schedule interviews, and manage offers—streamline your hiring funnel.',
                color: 'from-pink-500 to-rose-600',
              },
              {
                icon: BookOpen,
                title: 'Learning & Development',
                description:
                  'LMS with course catalogs, certifications, skill gap analysis, and personalized learning paths.',
                color: 'from-cyan-500 to-blue-600',
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card hover padding="lg" className="h-full">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}
                  >
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Overview */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge size="md" variant="info" className="mb-4">
              Platform
            </Badge>
            <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
              4 powerful apps. One unified platform.
            </h2>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              Access everything through a single login with seamless navigation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                name: 'NU-HRMS',
                icon: '👥',
                gradient: 'from-blue-600 to-blue-700',
                description: 'Core HR Operations',
                features: [
                  'Employee Management',
                  'Attendance & Leave',
                  'Payroll & Benefits',
                  'Compliance & Statutory',
                ],
              },
              {
                name: 'NU-Hire',
                icon: '🎯',
                gradient: 'from-emerald-500 to-emerald-600',
                description: 'Recruitment Excellence',
                features: [
                  'Job Postings & ATS',
                  'Candidate Pipeline',
                  'Onboarding & Preboarding',
                  'Offer Management',
                ],
              },
              {
                name: 'NU-Grow',
                icon: '📈',
                gradient: 'from-amber-500 to-orange-600',
                description: 'Performance & Learning',
                features: [
                  'OKRs & Reviews',
                  '360° Feedback',
                  'Learning Management',
                  'Recognition & Wellness',
                ],
              },
              {
                name: 'NU-Fluence',
                icon: '💡',
                gradient: 'from-violet-500 to-purple-600',
                description: 'Knowledge Hub',
                features: [
                  'Wiki & Documentation',
                  'Team Blogs',
                  'Template Library',
                  'Drive Integration',
                ],
              },
            ].map((app, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card hover padding="lg">
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${app.gradient} flex items-center justify-center text-3xl shadow-lg`}
                    >
                      {app.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-[var(--text-primary)]">
                        {app.name}
                      </h3>
                      <p className="text-sm text-[var(--text-muted)]">{app.description}</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {app.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <CheckCircle2 className="h-4 w-4 text-success-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '500+', label: 'Companies', icon: Building2 },
              { value: '50K+', label: 'Employees', icon: Users },
              { value: '99.9%', label: 'Uptime', icon: Zap },
              { value: '24/7', label: 'Support', icon: Shield },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <stat.icon className="h-8 w-8 text-primary-600 dark:text-primary-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-[var(--text-primary)] mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-[var(--text-muted)]">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Security */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-surface)]">
        <div className="max-w-5xl mx-auto text-center">
          <Badge size="md" variant="success" className="mb-4">
            Security & Compliance
          </Badge>
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
            Enterprise-grade security you can trust
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-12">
            Bank-level encryption, SOC 2 certified, and GDPR compliant
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8">
            {[
              { icon: Shield, label: 'SOC 2 Type II' },
              { icon: Lock, label: '256-bit Encryption' },
              { icon: Globe, label: 'GDPR Compliant' },
              { icon: BarChart3, label: 'ISO 27001' },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success-50 dark:bg-success-950 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-success-600 dark:text-success-400" />
                </div>
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
            Ready to transform your HR operations?
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-8">
            Start your 14-day free trial. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/login">
              <Button size="xl" className="gap-2 shadow-lg">
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="xl" variant="outline">
                Book a Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-main)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                Product
              </h3>
              <ul className="space-y-2">
                {['Features', 'Pricing', 'Integrations', 'Security'].map((item) => (
                  <li key={item}>
                    <Link
                      href={`/${item.toLowerCase()}`}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                Company
              </h3>
              <ul className="space-y-2">
                {['About', 'Careers', 'Contact', 'Blog'].map((item) => (
                  <li key={item}>
                    <Link
                      href={`/${item.toLowerCase()}`}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                Resources
              </h3>
              <ul className="space-y-2">
                {['Documentation', 'API Reference', 'Help Center', 'Status'].map((item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                Legal
              </h3>
              <ul className="space-y-2">
                {['Privacy', 'Terms', 'Security', 'Compliance'].map((item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-[var(--border-subtle)] text-center text-sm text-[var(--text-muted)]">
            <p>© {new Date().getFullYear()} NuLogic Technologies. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
