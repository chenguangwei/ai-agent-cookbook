import type { Locale } from '@/i18n/config';
import { defaultLocale } from '@/i18n/config';
export interface PageSeo {
  title: string;
  description: string;
  keywords: string[];
  openGraphLocale: string;
}

export const openGraphLocales: Record<Locale, string> = {
  en: 'en_US',
  zh: 'zh_CN',
  ja: 'ja_JP',
  ko: 'ko_KR',
};

export const homeSeoByLocale: Record<Locale, PageSeo> = {
  en: {
    title: 'AI Agent Tutorials, AI Tools & Software Guides',
    description:
      'Learn AI agents, AI tools, and AI software development through practical tutorials, framework guides, tool comparisons, and real-world workflows.',
    keywords: [
      'AI Agent tutorials',
      'AI tools',
      'AI software tutorials',
      'build AI agents',
      'AI agent development',
      'LangChain tutorial',
      'LangGraph tutorial',
      'CrewAI tutorial',
      'Claude Code tutorial',
      'multi-agent systems',
    ],
    openGraphLocale: openGraphLocales.en,
  },
  zh: {
    title: 'AI Agent 教程、AI 工具与 AI 软件教程',
    description:
      '围绕 AI Agent、AI 工具和 AI 软件教程，系统整理智能体开发教程、工具选型、框架实战与真实工作流案例。',
    keywords: [
      'AI Agent 教程',
      'AI 工具',
      'AI 软件教程',
      'AI 智能体开发',
      'Agent 实战',
      'LangChain 教程',
      'LangGraph 教程',
      'CrewAI 教程',
      'Claude Code 教程',
      '多智能体系统',
    ],
    openGraphLocale: openGraphLocales.zh,
  },
  ja: {
    title: 'AIエージェントチュートリアル、AIツール、AIソフトウェア開発',
    description:
      'AIエージェント、AIツール、AIソフトウェア開発を実践的に学べるチュートリアル、フレームワーク解説、ツール比較をまとめています。',
    keywords: [
      'AIエージェント チュートリアル',
      'AIツール',
      'AIソフトウェア 開発',
      'AIエージェント 開発',
      'LangChain チュートリアル',
      'LangGraph チュートリアル',
      'CrewAI 使い方',
      'Claude Code チュートリアル',
      'マルチエージェント',
    ],
    openGraphLocale: openGraphLocales.ja,
  },
  ko: {
    title: 'AI 에이전트 튜토리얼, AI 도구와 AI 소프트웨어 가이드',
    description:
      'AI 에이전트, AI 도구, AI 소프트웨어 개발을 실전 튜토리얼, 프레임워크 가이드, 도구 비교, 워크플로 사례로 학습하세요.',
    keywords: [
      'AI 에이전트 튜토리얼',
      'AI 도구',
      'AI 소프트웨어 튜토리얼',
      'AI 에이전트 개발',
      'LangChain 튜토리얼',
      'LangGraph 튜토리얼',
      'CrewAI 튜토리얼',
      'Claude Code 튜토리얼',
      '멀티 에이전트 시스템',
    ],
    openGraphLocale: openGraphLocales.ko,
  },
};

export const defaultSiteSeo = homeSeoByLocale[defaultLocale];

export function getHomeSeo(locale: string): PageSeo {
  return homeSeoByLocale[locale as Locale] ?? defaultSiteSeo;
}
