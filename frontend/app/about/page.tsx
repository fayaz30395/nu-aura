'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Target,
  Heart,
  Users,
  Globe,
  Zap,
  TrendingUp,
  Award,
  Rocket,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function AboutPage() {
  const values = [
    {
      icon: Users,
      title: 'People First',
      description: 'We build technology that puts people at the center of every decision',
    },
    {
      icon: Rocket,
      title: 'Innovation',
      description: 'Constantly pushing boundaries to deliver cutting-edge HR solutions',
    },
    {
      icon: Shield,
      title: 'Trust & Security',
      description: 'Your data security and privacy are our highest priorities',
    },
    {
      icon: Heart,
      title: 'Customer Success',
      description: 'Your success is our success. We grow when you grow',
    },
  ];

  const milestones = [
    {
      year: '2020',
      title: 'Founded',
      description: 'NULogic Technologies established with a vision to modernize HR',
    },
    {
      year: '2021',
      title: 'Product Launch',
      description: 'NU-AURA platform goes live with first 50 customers',
    },
    {
      year: '2023',
      title: '500+ Companies',
      description: 'Crossed 500 companies milestone managing 50K+ employees',
    },
    {
      year: '2024',
      title: 'SOC 2 Certified',
      description: 'Achieved SOC 2 Type II certification for enterprise security',
    },
  ];

  const stats = [
    { icon: Users, value: '500+', label: 'Companies' },
    { icon: Globe, value: '50K+', label: 'Employees Managed' },
    { icon: Award, value: '99.9%', label: 'Uptime' },
    { icon: TrendingUp, value: '4.8/5', label: 'Customer Rating' },
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
              <Link href="/careers">
                <Button variant="ghost" size="sm">
                  Careers
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
          <Badge size="lg" variant="primary" className="mb-6">
            About Us
          </Badge>
          <h1 className="text-5xl font-bold text-[var(--text-primary)] skeuo-emboss mb-4">
            Building the future of HR technology
          </h1>
          <p className="text-xl text-[var(--text-secondary)] mb-8">
            We&apos;re on a mission to make HR management effortless, empowering companies to focus on what matters most—their people.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card padding="lg" className="border-l-4 border-l-accent-500">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent-50 dark:bg-accent-950 flex items-center justify-center">
                  <Target className="h-6 w-6 text-accent-700 dark:text-accent-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
                    Our Mission
                  </h3>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    To empower organizations with intelligent HR technology that streamlines operations, enhances employee experience, and drives business growth through data-driven insights.
                  </p>
                </div>
              </div>
            </Card>

            <Card padding="lg" className="border-l-4 border-l-info-500">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-info-50 dark:bg-info-950 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-info-600 dark:text-info-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
                    Our Vision
                  </h3>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    To become the world&apos;s most trusted HR platform, enabling every organization to build thriving workplaces where people and businesses grow together.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss mb-4">
              Our Core Values
            </h2>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card padding="lg" className="text-center h-full">
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    {value.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {value.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss mb-4">
              Our Journey
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              Milestones that shaped NU-AURA
            </p>
          </div>

          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-6"
              >
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center text-white font-bold shadow-lg">
                    {milestone.year}
                  </div>
                </div>
                <Card padding="lg" className="flex-1">
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                    {milestone.title}
                  </h3>
                  <p className="text-[var(--text-secondary)]">{milestone.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <stat.icon className="h-10 w-10 text-accent-700 dark:text-accent-400 mx-auto mb-3" />
                <div className="text-4xl font-bold text-[var(--text-primary)] skeuo-emboss mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-[var(--text-muted)]">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl  font-bold text-[var(--text-primary)] mb-4">
            Join our growing team
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-8">
            We&apos;re always looking for talented people who share our passion for building great products
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/careers">
              <Button size="lg" className="gap-2">
                View Open Positions
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline">
                Get in Touch
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
