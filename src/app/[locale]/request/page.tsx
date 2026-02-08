'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useTranslations } from 'next-intl';

const CATEGORIES = [
  'Frameworks',
  'LLM Models',
  'Agentic Workflows',
  'Real-world Cases',
  'Other',
];

export default function RequestPage() {
  const t = useTranslations('RequestForm');
  const [formData, setFormData] = useState({
    topic: '',
    category: '',
    description: '',
    email: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      const response = await fetch('/api/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStatus('success');
        setFormData({ topic: '', category: '', description: '', email: '' });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-6 py-8 lg:py-12">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black font-display mb-4">
              {t('title')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              {t('subtitle')}
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl"
          >
            {/* Topic */}
            <div className="space-y-1.5 mb-6">
              <label
                htmlFor="topic"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
              >
                {t('topic')}
              </label>
              <input
                type="text"
                id="topic"
                name="topic"
                value={formData.topic}
                onChange={handleChange}
                placeholder={t('topicPlaceholder')}
                required
                className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5 mb-6">
              <label
                htmlFor="category"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
              >
                {t('category')}
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              >
                <option value="">{t('categoryPlaceholder')}</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1.5 mb-6">
              <label
                htmlFor="description"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
              >
                {t('description')}
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={t('descriptionPlaceholder')}
                required
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5 mb-8">
              <label
                htmlFor="email"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
              >
                {t('email')}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t('emailPlaceholder')}
                className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-500/20"
            >
              {status === 'submitting' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('submit')}
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {t('submit')}
                </>
              )}
            </button>

            {/* Success Message */}
            {status === 'success' && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3 text-green-700 dark:text-green-400">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{t('success')}</span>
              </div>
            )}

            {/* Error Message */}
            {status === 'error' && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{t('error')}</span>
              </div>
            )}
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
