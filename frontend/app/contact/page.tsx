'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  MessageSquare,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  company: z.string().min(1, 'Company name is required'),
  phone: z.string().min(7, 'Invalid phone number'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
  });

  const onSubmit = async (_data: ContactFormData) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitted(true);
    reset();
    setTimeout(() => setIsSubmitted(false), 5000);
  };

  const contactMethods = [
    {
      icon: Mail,
      title: 'Email Us',
      description: 'Our team typically responds within 24 hours',
      value: 'sales@nulogic.io',
      color: 'from-accent-500 to-accent-600',
    },
    {
      icon: Phone,
      title: 'Call Us',
      description: 'Monday to Friday, 9AM - 6PM IST',
      value: '+1 865 408 7639',
      color: 'from-success-500 to-success-600',
    },
    {
      icon: MessageSquare,
      title: 'Live Chat',
      description: 'Chat with our support team',
      value: 'Available 24/7',
      color: 'from-accent-700 to-accent-800',
    },
  ];

  const offices = [
    {
      city: 'Bangalore',
      country: 'India',
      address: 'Koramangala, Bangalore - 560034',
      timezone: 'IST (UTC+5:30)',
    },
    {
      city: 'San Francisco',
      country: 'USA',
      address: 'Market Street, San Francisco, CA 94103',
      timezone: 'PST (UTC-8)',
    },
    {
      city: 'London',
      country: 'UK',
      address: 'Canary Wharf, London E14 5AB',
      timezone: 'GMT (UTC+0)',
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
          <Badge size="lg" variant="primary" className="mb-6">
            Contact Us
          </Badge>
          <h1 className="text-5xl font-bold text-[var(--text-primary)] skeuo-emboss mb-4">
            Let&apos;s start a conversation
          </h1>
          <p className="text-xl text-[var(--text-secondary)] mb-8">
            Have questions? We&apos;d love to hear from you. Send us a message and we&apos;ll respond as soon as possible.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {contactMethods.map((method, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card padding="lg" className="text-center h-full">
                  <div
                    className={`w-14 h-14 rounded-lg bg-gradient-to-br ${method.color} flex items-center justify-center mx-auto mb-4`}
                  >
                    <method.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    {method.title}
                  </h3>
                  <p className="text-body-muted mb-2">{method.description}</p>
                  <p className="text-sm font-medium text-accent-700 dark:text-accent-400">
                    {method.value}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Form */}
            <div>
              <h2 className="text-2xl font-bold skeuo-emboss">
                Send us a message
              </h2>
              <p className="text-[var(--text-secondary)] mb-8">
                Fill out the form below and our team will get back to you within 24 hours
              </p>

              {isSubmitted && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-lg bg-success-50 dark:bg-success-950 border border-success-200 dark:border-success-800 flex items-start gap-4"
                >
                  <CheckCircle2 className="h-5 w-5 text-success-600 dark:text-success-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-success-700 dark:text-success-300">
                      Message sent successfully!
                    </p>
                    <p className="text-sm text-success-600 dark:text-success-400 mt-1">
                      We&apos;ll get back to you shortly.
                    </p>
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Name *
                    </label>
                    <Input
                      type="text"
                      placeholder="John Doe"
                      {...register('name')}
                      className={errors.name ? 'border-danger-500' : ''}
                    />
                    {errors.name && (
                      <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Email *
                    </label>
                    <Input
                      type="email"
                      placeholder="john@company.com"
                      {...register('email')}
                      className={errors.email ? 'border-danger-500' : ''}
                    />
                    {errors.email && (
                      <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Company *
                    </label>
                    <Input
                      type="text"
                      placeholder="Acme Inc."
                      {...register('company')}
                      className={errors.company ? 'border-danger-500' : ''}
                    />
                    {errors.company && (
                      <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">
                        {errors.company.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Phone *
                    </label>
                    <Input
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      {...register('phone')}
                      className={errors.phone ? 'border-danger-500' : ''}
                    />
                    {errors.phone && (
                      <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Subject *
                  </label>
                  <Input
                    type="text"
                    placeholder="How can we help?"
                    {...register('subject')}
                    className={errors.subject ? 'border-danger-500' : ''}
                  />
                  {errors.subject && (
                    <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">
                      {errors.subject.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Message *
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Tell us more about your inquiry..."
                    className={`input-aura w-full px-4 py-2 rounded-lg bg-[var(--bg-input)] border ${
                      errors.message ? 'border-danger-500' : 'border-[var(--border-main)]'
                    } text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent-500`}
                    {...register('message')}
                  />
                  {errors.message && (
                    <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">
                      {errors.message.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="btn-primary w-full gap-2"
                  isLoading={isSubmitting}
                  loadingText="Sending..."
                >
                  <Send className="h-5 w-5" />
                  Send Message
                </Button>
              </form>
            </div>

            {/* FAQ */}
            <div>
              <h2 className="text-2xl  font-bold text-[var(--text-primary)] mb-4">
                Quick Answers
              </h2>
              <p className="text-[var(--text-secondary)] mb-8">
                Common questions we receive
              </p>

              <div className="space-y-4">
                {[
                  {
                    question: 'What is the pricing?',
                    answer: 'Our plans start at $12/user/month. Visit our pricing page for details.',
                  },
                  {
                    question: 'Is there a free trial?',
                    answer: 'Yes! We offer a 14-day free trial with no credit card required.',
                  },
                  {
                    question: 'How long does implementation take?',
                    answer: 'Most companies are up and running within 48 hours.',
                  },
                  {
                    question: 'Do you provide data migration?',
                    answer: 'Yes, we provide free data migration assistance for all Enterprise plans.',
                  },
                ].map((faq, index) => (
                  <Card key={index} padding="md">
                    <div className="flex items-start gap-4">
                      <HelpCircle className="h-5 w-5 text-accent-700 dark:text-accent-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                          {faq.question}
                        </h3>
                        <p className="text-body-secondary">{faq.answer}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Office Locations */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl  font-bold text-[var(--text-primary)] mb-4">
              Our Offices
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              We&apos;re a global team with offices around the world
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {offices.map((office, index) => (
              <Card key={index} padding="lg">
                <div className="w-12 h-12 rounded-xl bg-accent-50 dark:bg-accent-950 flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-accent-700 dark:text-accent-400" />
                </div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
                  {office.city}, {office.country}
                </h3>
                <p className="text-body-secondary mb-2">{office.address}</p>
                <div className="flex items-center gap-2 text-body-muted">
                  <Clock className="h-4 w-4" />
                  {office.timezone}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
