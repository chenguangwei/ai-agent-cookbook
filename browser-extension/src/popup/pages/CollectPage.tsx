import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ContentType,
  ExtractedPageData,
  TutorialData,
  NewsData,
  ShowcaseData,
  LabData,
  Locale,
  ProcessingTask,
} from '../../shared/types';
import { ContentTypeSelector } from '../components/ContentTypeSelector';
import { FormFields } from '../components/FormFields';
import { PreviewCard } from '../components/PreviewCard';
import { submitContent, generateFileContent } from '../../shared/api';
import { saveDraft, addHistory, getSettings, getExtractCacheEntry, setExtractCacheEntry } from '../../shared/storage';
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
  const [fromCache, setFromCache] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);

  // Background task state (for popup-close-safe processing)
  const [backgroundTask, setBackgroundTask] = useState<ProcessingTask | null>(null);
  const [processingProgress, setProcessingProgress] = useState<string>('');
  const pollingIntervalRef = useRef<number | null>(null);

  // Check LLM availability on mount
  useEffect(() => {
    isLLMAvailable().then(setLlmAvailable);
  }, []);

  // Auto-extract page data on mount
  useEffect(() => {
    extractCurrentPage();
  }, []);

  // ============================================================
  // Poll for background task status (popup-close-safe)
  // ============================================================

  const startPolling = useCallback(() => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 2 seconds
    pollingIntervalRef.current = window.setInterval(async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_PROCESS_STATUS' });
        const { task, status: procStatus } = response || {};

        if (task && task.status !== backgroundTask?.status) {
          setBackgroundTask(task);

          if (procStatus?.progress) {
            setProcessingProgress(procStatus.progress);
          }

          // Handle completion
          if (task.status === 'completed') {
            setAiProgress('');
            setProcessingProgress('');
            if (task.result) {
              setFormData((prev) => ({ ...prev, content: task.result }));
            }
            setMessage('AI processing complete');
            setStatus('success');
            stopPolling();
            setTimeout(() => setStatus('idle'), 2000);
          }

          // Handle failure
          if (task.status === 'failed') {
            setAiProgress('');
            setProcessingProgress('');
            setMessage(`AI error: ${task.error || 'Processing failed'}`);
            setStatus('error');
            stopPolling();
          }
        }
      } catch (err) {
        // Background context might be unavailable
        console.log('Polling error:', err);
        stopPolling();
      }
    }, 2000);
  }, [backgroundTask]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Check for existing background task on mount
  useEffect(() => {
    const checkExistingTask = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_PROCESS_STATUS' });
        if (response?.task && response.task.status === 'processing') {
          setBackgroundTask(response.task);
          setStatus('ai_processing');
          setProcessingProgress(response.status?.progress || 'Processing in background...');
          startPolling();
        }
      } catch (err) {
        // Background context unavailable
      }
    };
    checkExistingTask();
  }, [startPolling]);

  // ============================================================
  // Page extraction + optional auto AI clean
  // ============================================================

  const extractCurrentPage = useCallback(async (forceRefresh = false) => {
    setStatus('extracting');
    setMessage('Extracting page content...');
    setFromCache(false);
    setCacheTimestamp(null);

    try {
      // Check for pending context menu data first
      const pending = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_PENDING_COLLECT' }, resolve);
      });

      let pageData: ExtractedPageData | null = null;

      if (pending?.pendingExtracted) {
        pageData = pending.pendingExtracted;
      } else {
        // Get current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab?.id) {
          setMessage('No active tab found');
          setStatus('idle');
          return;
        }

        // Check if tab is accessible
        if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('about:')) {
          setMessage('Cannot extract from browser pages');
          setStatus('idle');
          return;
        }

        // Check cache unless forceRefresh
        if (!forceRefresh && tab.url) {
          const cached = await getExtractCacheEntry(tab.url);
          if (cached) {
            pageData = cached.data;
            setFromCache(true);
            setCacheTimestamp(cached.timestamp);
          }
        }

        // Fetch from page if no cache hit
        if (!pageData) {
          try {
            const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_PAGE' });
            if (response?.payload) {
              pageData = response.payload;
              // Save to cache
              if (tab.url && pageData) {
                await setExtractCacheEntry(tab.url, pageData);
              }
            } else if (response?.error) {
              setMessage(`Extraction error: ${response.error}`);
              setStatus('idle');
              return;
            }
          } catch (sendError: any) {
            if (sendError.message?.includes('Receiving end does not exist')) {
              setMessage('Content script not loaded. Reload the page and try again.');
            } else {
              setMessage(`Connection error: ${sendError.message || 'Unknown error'}`);
            }
            setStatus('idle');
            return;
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
    } catch (err: any) {
      setMessage(`Extraction failed: ${err.message || 'Unknown error'}`);
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
  // AI-powered processing (Background Mode for Popup-Close-Safe)
  // ============================================================

  async function runAIFullProcess(data: ExtractedPageData, type: ContentType) {
    try {
      setStatus('ai_processing');
      setAiProgress('Starting background processing...');

      // Send to background for processing (popup can close safely after this)
      const response = await chrome.runtime.sendMessage({
        type: 'START_PROCESS_MDX',
        payload: {
          extractedData: { content: data.content },
          title: data.title,
          contentType: type,
        },
      });

      if (response.status === 'started') {
        setBackgroundTask({ ...response.task, status: 'processing' });
        setAiProgress('AI is processing content in background...');
        setProcessingProgress('Starting...');
        startPolling();
      }
    } catch (err: any) {
      // Fallback to inline processing if background fails
      console.warn('Background processing unavailable, falling back to inline');
      await runAIFullProcessInline(data, type);
    }
  }

  // Fallback inline processing (original implementation)
  async function runAIFullProcessInline(data: ExtractedPageData, type: ContentType) {
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
      {/* Header with content type selector and re-extract button */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between gap-2">
        <div className="flex-1">
          <ContentTypeSelector value={contentType} onChange={handleContentTypeChange} />
        </div>
        <button
          className="text-xs py-1.5 px-2 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1 flex-shrink-0"
          onClick={() => extractCurrentPage(true)}
          disabled={status === 'extracting'}
          title="Re-extract content from current page (bypass cache)"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {status === 'extracting' ? 'Extracting...' : 'Re-extract'}
        </button>
      </div>
      {/* Cache indicator */}
      {fromCache && cacheTimestamp && (
        <div className="mx-3 mb-1 px-2 py-1 rounded bg-amber-50 text-amber-700 text-xs flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Cached · {new Date(cacheTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {/* Extraction error with retry button */}
      {!extracted && status === 'idle' && message.includes('Could not extract') && (
        <div className="mx-3 mb-2 px-3 py-3 rounded-lg bg-red-50 text-red-700 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span>{message}</span>
            <button
              className="py-1 px-2 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors font-medium"
              onClick={() => extractCurrentPage(true)}
            >
              Retry
            </button>
          </div>
        </div>
      )}

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

      {/* AI progress indicator (inline mode) */}
      {aiProgress && !backgroundTask && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-700 text-xs flex items-center gap-2">
          <span className="inline-block w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          {aiProgress}
        </div>
      )}

      {/* Background processing indicator (popup-close-safe) */}
      {backgroundTask && backgroundTask.status === 'processing' && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-xs flex items-center gap-2">
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="flex-1">
            Processing in background...
            {processingProgress && <span className="ml-1 opacity-75">({processingProgress})</span>}
          </span>
          <span className="text-xs opacity-60">Can close popup</span>
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
