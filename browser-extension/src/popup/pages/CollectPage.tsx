import React, { useState, useEffect, useCallback } from 'react';
import type {
  ContentType,
  ExtractedPageData,
  TutorialData,
  NewsData,
  ShowcaseData,
  LabData,
  Locale,
} from '../../shared/types';
import { ContentTypeSelector } from '../components/ContentTypeSelector';
import { FormFields } from '../components/FormFields';
import { PreviewCard } from '../components/PreviewCard';
import { submitContent, generateFileContent } from '../../shared/api';
import { saveDraft, addHistory, getSettings } from '../../shared/storage';
import {
  aiCleanContent,
  aiExtractMetadata,
  aiFullProcess,
  isLLMAvailable,
} from '../../shared/llm';
import {
  detectTutorialCategory,
  detectNewsCategory,
  detectContentType,
  suggestTags,
  detectLocale,
  estimateReadTime,
  formatDate,
  formatDateTime,
} from '../../shared/utils';

type Status = 'idle' | 'extracting' | 'ai_processing' | 'submitting' | 'success' | 'error';

export function CollectPage() {
  const [contentType, setContentType] = useState<ContentType>('tutorial');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [extracted, setExtracted] = useState<ExtractedPageData | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [llmAvailable, setLlmAvailable] = useState(false);
  const [aiProgress, setAiProgress] = useState('');

  // Check LLM availability on mount
  useEffect(() => {
    isLLMAvailable().then(setLlmAvailable);
  }, []);

  // Auto-extract page data on mount
  useEffect(() => {
    extractCurrentPage();
  }, []);

  // ============================================================
  // Page extraction + optional auto AI clean
  // ============================================================

  const extractCurrentPage = useCallback(async () => {
    setStatus('extracting');
    setMessage('Extracting page content...');

    try {
      // Check for pending context menu data first
      const pending = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_PENDING_COLLECT' }, resolve);
      });

      let pageData: ExtractedPageData | null = null;

      if (pending?.pendingExtracted) {
        pageData = pending.pendingExtracted;
      } else {
        // Extract from current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_PAGE' });
          if (response?.payload) {
            pageData = response.payload;
          }
        }
      }

      if (pageData) {
        setExtracted(pageData);
        const detectedType =
          pending?.pendingCollect?.contentType || detectContentType(pageData);
        setContentType(detectedType);

        // Fill form with rule-based extraction first
        autoFillForm(pageData, detectedType);
        setMessage('Page extracted (Markdown)');

        // Check if auto AI clean is enabled
        const settings = await getSettings();
        if (settings.llm.enabled && settings.llm.autoClean) {
          setStatus('ai_processing');
          setMessage('');
          setAiProgress('AI cleaning content...');
          await runAIFullProcess(pageData, detectedType);
        } else {
          setStatus('idle');
        }
      } else {
        setMessage('Could not extract page content');
        setStatus('idle');
      }
    } catch {
      setMessage('Extraction failed');
      setStatus('idle');
    }
  }, []);

  // ============================================================
  // Rule-based auto fill (fast, no LLM)
  // ============================================================

  function autoFillForm(data: ExtractedPageData, type: ContentType) {
    const locale = detectLocale(data.language) as Locale;
    const textForTags = `${data.title} ${data.description} ${data.content}`;
    const tags = suggestTags(textForTags);

    const base: Record<string, any> = {
      title: data.title,
      locale,
    };

    switch (type) {
      case 'tutorial': {
        const { category } = detectTutorialCategory(textForTags);
        Object.assign(base, {
          description: data.description,
          category,
          tags,
          techStack: [],
          difficulty: 'Beginner',
          duration: estimateReadTime(data.content),
          thumbnail: data.images[0] || '',
          featured: false,
          date: formatDate(),
          content: data.content,
        });
        break;
      }
      case 'news': {
        const newsCategory = detectNewsCategory(`${data.title} ${data.description}`);
        Object.assign(base, {
          summary: data.description,
          source: data.siteName,
          sourceUrl: data.url,
          author: data.author,
          imageUrl: data.images[0] || '',
          publishedAt: data.publishedDate || formatDateTime(),
          category: newsCategory,
          readTime: estimateReadTime(data.content),
          content: data.content,
        });
        break;
      }
      case 'showcase':
        Object.assign(base, {
          description: data.description,
          authorName: data.author,
          tags,
          stars: 0,
          demoUrl: '',
          repoUrl: data.url.includes('github.com') ? data.url : '',
          thumbnail: data.images[0] || '',
        });
        break;
      case 'lab':
        Object.assign(base, {
          description: data.description,
          environment: 'Python',
          difficulty: 'Beginner',
          status: 'Online',
          usersOnline: 0,
          launchUrl: data.url,
          launchMode: 'external',
          thumbnail: data.images[0] || '',
        });
        break;
    }

    setFormData(base);
  }

  // ============================================================
  // AI-powered processing
  // ============================================================

  async function runAIFullProcess(data: ExtractedPageData, type: ContentType) {
    try {
      setStatus('ai_processing');
      setAiProgress('AI analyzing content and extracting metadata...');

      const result = await aiFullProcess(data, type);

      // Merge AI results into form
      setFormData((prev) => {
        const updated = { ...prev };
        if (result.content) updated.content = result.content;
        if (result.metadata.description) {
          if (type === 'news') updated.summary = result.metadata.description;
          else updated.description = result.metadata.description;
        }
        if (result.metadata.category) {
          if (type === 'news')
            updated.category = result.metadata.newsCategory || result.metadata.category;
          else updated.category = result.metadata.category;
        }
        if (result.metadata.tags?.length) updated.tags = result.metadata.tags;
        if (result.metadata.techStack?.length) updated.techStack = result.metadata.techStack;
        if (result.metadata.difficulty) updated.difficulty = result.metadata.difficulty;
        if (result.metadata.duration) updated.duration = result.metadata.duration;
        if (result.metadata.title) updated.title = result.metadata.title;
        return updated;
      });

      setAiProgress('');
      setMessage('AI processing complete');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err: any) {
      setAiProgress('');
      setMessage(`AI error: ${err.message}`);
      setStatus('error');
    }
  }

  async function handleAICleanContent() {
    if (!extracted) return;
    setStatus('ai_processing');
    setAiProgress('AI cleaning content to MDX...');
    try {
      const cleaned = await aiCleanContent(
        formData.content || extracted.content,
        formData.title || extracted.title
      );
      setFormData((prev) => ({ ...prev, content: cleaned }));
      setAiProgress('');
      setMessage('Content cleaned by AI');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err: any) {
      setAiProgress('');
      setMessage(`AI error: ${err.message}`);
      setStatus('error');
    }
  }

  async function handleAIExtractMeta() {
    if (!extracted) return;
    setStatus('ai_processing');
    setAiProgress('AI extracting metadata...');
    try {
      const meta = await aiExtractMetadata(
        formData.title || extracted.title,
        formData.content || extracted.content,
        contentType
      );
      setFormData((prev) => ({
        ...prev,
        ...(meta.description &&
          (contentType === 'news'
            ? { summary: meta.description }
            : { description: meta.description })),
        ...(meta.category && {
          category:
            contentType === 'news'
              ? meta.newsCategory || meta.category
              : meta.category,
        }),
        ...(meta.tags?.length && { tags: meta.tags }),
        ...(meta.techStack?.length && { techStack: meta.techStack }),
        ...(meta.difficulty && { difficulty: meta.difficulty }),
        ...(meta.duration && { duration: meta.duration }),
      }));
      setAiProgress('');
      setMessage('Metadata extracted by AI');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err: any) {
      setAiProgress('');
      setMessage(`AI error: ${err.message}`);
      setStatus('error');
    }
  }

  async function handleAIFullProcess() {
    if (!extracted) return;
    await runAIFullProcess(extracted, contentType);
  }

  // ============================================================
  // Form handlers
  // ============================================================

  function handleFieldChange(key: string, value: any) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function handleContentTypeChange(type: ContentType) {
    setContentType(type);
    if (extracted) {
      autoFillForm(extracted, type);
    }
  }

  function buildSubmitData(): TutorialData | NewsData | ShowcaseData | LabData {
    switch (contentType) {
      case 'tutorial':
        return {
          title: formData.title || '',
          locale: formData.locale || 'en',
          description: formData.description || '',
          category: formData.category || 'Frameworks',
          tags: formData.tags || [],
          techStack: formData.techStack || [],
          difficulty: formData.difficulty || 'Beginner',
          duration: formData.duration || '',
          videoUrl: formData.videoUrl,
          thumbnail: formData.thumbnail,
          featured: false,
          date: formData.date || formatDate(),
          content: formData.content || '',
        } as TutorialData;

      case 'news':
        return {
          title: formData.title || '',
          locale: formData.locale || 'en',
          summary: formData.summary || '',
          source: formData.source || '',
          sourceUrl: formData.sourceUrl || '',
          author: formData.author || '',
          imageUrl: formData.imageUrl,
          publishedAt: formData.publishedAt || formatDateTime(),
          category: formData.category || 'Tech',
          readTime: formData.readTime || '',
          content: formData.content || '',
        } as NewsData;

      case 'showcase':
        return {
          title: formData.title || '',
          locale: formData.locale || 'en',
          author: { name: formData.authorName || '', avatar: '' },
          description: formData.description || '',
          tags: formData.tags || [],
          stars: 0,
          demoUrl: formData.demoUrl,
          repoUrl: formData.repoUrl,
          thumbnail: formData.thumbnail,
        } as ShowcaseData;

      case 'lab':
        return {
          title: formData.title || '',
          locale: formData.locale || 'en',
          description: formData.description || '',
          environment: formData.environment || 'Python',
          difficulty: formData.difficulty || 'Beginner',
          status: 'Online',
          usersOnline: 0,
          thumbnail: formData.thumbnail,
          launchUrl: formData.launchUrl || '',
          launchMode: formData.launchMode || 'external',
        } as LabData;
    }
  }

  async function handleSubmit() {
    if (!formData.title) {
      setMessage('Title is required');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setMessage('');
    try {
      const data = buildSubmitData();
      const result = await submitContent(contentType, data);
      if (result.success) {
        await addHistory({
          contentType,
          title: formData.title,
          sourceUrl: extracted?.url || '',
          submittedAt: new Date().toISOString(),
          status: 'submitted',
          slug: result.slug,
        });
        setStatus('success');
        setMessage(result.message);
      } else {
        setStatus('error');
        setMessage(result.message);
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Submission failed. Is the Agent Hub server running?');
    }
  }

  async function handleSaveDraft() {
    const data = buildSubmitData();
    await saveDraft(contentType, data, extracted?.url || '');
    setMessage('Draft saved!');
    setStatus('success');
    setTimeout(() => setStatus('idle'), 2000);
  }

  async function handleCopyFile() {
    const data = buildSubmitData();
    const file = generateFileContent(contentType, data);
    await navigator.clipboard.writeText(file.content);
    await addHistory({
      contentType,
      title: formData.title,
      sourceUrl: extracted?.url || '',
      submittedAt: new Date().toISOString(),
      status: 'saved_local',
    });
    setMessage(`Copied! Save to: ${file.filename}`);
    setStatus('success');
    setTimeout(() => setStatus('idle'), 3000);
  }

  const isProcessing =
    status === 'extracting' || status === 'ai_processing' || status === 'submitting';

  return (
    <div className="flex flex-col h-full">
      {/* Content type selector */}
      <div className="px-3 pt-3 pb-2">
        <ContentTypeSelector value={contentType} onChange={handleContentTypeChange} />
      </div>

      {/* Preview card + AI toolbar */}
      {extracted && (
        <div className="px-3 pb-2 space-y-2">
          <PreviewCard
            contentType={contentType}
            title={formData.title || ''}
            description={formData.description || formData.summary || ''}
            sourceUrl={extracted.url}
            thumbnail={formData.thumbnail || formData.imageUrl}
          />

          {/* AI Action Bar */}
          {llmAvailable && (
            <div className="flex gap-1.5">
              <button
                className="flex-1 text-xs py-1.5 px-2 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors font-medium disabled:opacity-50"
                onClick={handleAIFullProcess}
                disabled={isProcessing}
                title="Clean content + extract metadata"
              >
                AI Full Process
              </button>
              <button
                className="text-xs py-1.5 px-2 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                onClick={handleAICleanContent}
                disabled={isProcessing}
                title="Clean and format content as MDX"
              >
                Clean MDX
              </button>
              <button
                className="text-xs py-1.5 px-2 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                onClick={handleAIExtractMeta}
                disabled={isProcessing}
                title="Auto-detect category, tags, difficulty"
              >
                Extract Meta
              </button>
            </div>
          )}

          {!llmAvailable && (
            <button
              className="w-full text-xs py-1.5 px-2 rounded bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
              onClick={() => chrome.runtime.openOptionsPage()}
            >
              Configure AI model in Settings for auto-cleaning
            </button>
          )}
        </div>
      )}

      {/* AI progress indicator */}
      {aiProgress && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-700 text-xs flex items-center gap-2">
          <span className="inline-block w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          {aiProgress}
        </div>
      )}

      {/* Extracting indicator */}
      {status === 'extracting' && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs flex items-center gap-2">
          <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          Extracting page content as Markdown...
        </div>
      )}

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        <FormFields
          contentType={contentType}
          formData={formData}
          onChange={handleFieldChange}
        />
      </div>

      {/* Status message */}
      {message && status !== 'extracting' && !aiProgress && (
        <div
          className={`mx-3 mb-2 px-3 py-2 rounded-lg text-xs ${
            status === 'success'
              ? 'bg-green-50 text-green-700'
              : status === 'error'
              ? 'bg-red-50 text-red-700'
              : 'bg-blue-50 text-blue-700'
          }`}
        >
          {message}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 px-3 pb-3 pt-1 border-t border-gray-100">
        <button
          className="btn-ghost flex-shrink-0"
          onClick={handleSaveDraft}
          disabled={isProcessing}
        >
          Draft
        </button>
        <button
          className="btn-secondary flex-shrink-0"
          onClick={handleCopyFile}
          disabled={isProcessing}
        >
          Copy MDX
        </button>
        <button
          className="btn-primary flex-1"
          onClick={handleSubmit}
          disabled={isProcessing || !formData.title}
        >
          {status === 'submitting' ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
