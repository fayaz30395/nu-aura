'use client';

import React from 'react';
import Link from 'next/link';
import {ArrowRight, Award, Globe, Heart, Rocket, Shield, Target, TrendingUp, Users, Zap,} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {Badge} from '@/components/ui/Badge';
import {Stat} from '@/components/ui/Stat';
import {PageTransition, Reveal, Stagger, StaggerItem} from '@/components/motion';

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
      title: 'Security-first engineering',
      description: 'SOC 2 Type II audit in progress',
    },
  ];

  const stats = [
    {icon: Users, value: '500+', label: 'Companies'},
    {icon: Globe, value: '50K+', label: 'Employees Managed'},
    {icon: Award, value: '99.9%', label: 'Uptime'},
    {icon: TrendingUp, value: '4.8/5', label: 'Customer Rating'},
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
        <Reveal className="max-w-4xl mx-auto">
          <Badge size="lg" variant="primary" className="mb-6">
            About Us
          </Badge>
          <h1 className="text-5xl font-bold text-[var(--text-primary)] mb-4">
            Building the future of HR technology
          </h1>
          <p className="text-xl text-[var(--text-secondary)] mb-8">
            We&apos;re on a mission to make HR management effortless, empowering companies to focus on what matters
            most: their people.
          </p>
        </Reveal>
      </section>

      {/* Mission & Vision */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Stagger inView className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <StaggerItem>
              <Card padding="lg" className="h-full border border-accent-200 dark:border-accent-800 bg-accent-50 dark:bg-accent-950/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent-100 dark:bg-accent-500/10 flex items-center justify-center">
                  <Target className="h-6 w-6 text-accent-600 dark:text-accent-400"/>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">
                    Our Mission
                  </h3>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    To empower organizations with intelligent HR technology that streamlines operations, enhances
                    employee experience, and drives business growth through data-driven insights.
                  </p>
                </div>
              </div>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card padding="lg" className="h-full border border-info-200 dark:border-info-800 bg-info-50 dark:bg-info-950/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-info-100 dark:bg-info-500/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-info-600 dark:text-info-400"/>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">
                    Our Vision
                  </h3>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    To become the world&apos;s most trusted HR platform, enabling every organization to build thriving
                    workplaces where people and businesses grow together.
                  </p>
                </div>
              </div>
              </Card>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
              Our Core Values
            </h2>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          {/* Featured value spans 2 cols on lg; supporting values are smaller. Avoids the
              identical-card-grid pattern by varying weight: one statement card + 3 satellites. */}
          <Stagger inView className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value, index) => {
              const isFeatured = index === 0;
              return (
                <StaggerItem
                  key={index}
                  className={isFeatured ? 'md:col-span-2 lg:col-span-3 lg:row-span-1' : ''}
                >
                  {isFeatured ? (
                    <Card padding="lg" className="h-full bg-accent-50 dark:bg-accent-950/20 border border-accent-200 dark:border-accent-800">
                      <div className="flex flex-col md:flex-row items-start gap-6">
                        <div className="w-16 h-16 rounded-xl bg-accent-100 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400 flex items-center justify-center flex-shrink-0">
                          <value.icon className="h-8 w-8"/>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                            {value.title}
                          </h3>
                          <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
                            {value.description}. It&apos;s the lens we apply to every product decision and every
                            line of code.
                          </p>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Card padding="lg" className="h-full">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400 flex items-center justify-center flex-shrink-0">
                          <value.icon className="h-5 w-5"/>
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                            {value.title}
                          </h3>
                          <p className="text-body-secondary leading-relaxed">
                            {value.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
              Our Journey
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              Milestones that shaped NU-AURA
            </p>
          </div>

          <Stagger inView className="space-y-8">
            {milestones.map((milestone, index) => (
              <StaggerItem
                key={index}
                className="flex gap-6"
              >
                <div className="flex-shrink-0">
                  <div
                    className="w-16 h-16 rounded-full bg-accent-100 dark:bg-accent-500/10 text-accent-700 dark:text-accent-400 flex items-center justify-center font-bold">
                    {milestone.year}
                  </div>
                </div>
                <Card padding="lg" className="flex-1">
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                    {milestone.title}
                  </h3>
                  <p className="text-[var(--text-secondary)]">{milestone.description}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto">
          <Stagger inView className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <StaggerItem key={index}>
                <Stat
                  label={stat.label}
                  value={stat.value}
                  icon={<stat.icon className="h-3.5 w-3.5"/>}
                />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <Reveal inView className="max-w-4xl mx-auto text-center">
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
                <ArrowRight className="h-5 w-5"/>
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline">
                Get in Touch
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>
    </PageTransition>
  );
}
