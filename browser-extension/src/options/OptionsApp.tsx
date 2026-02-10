import React, { useState, useEffect } from 'react';
import type { Settings } from '../shared/types';
import { getSettings, updateSettings } from '../shared/storage';
import { LOCALES, CONTENT_TYPES } from '../shared/constants';

export function OptionsApp() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  async function handleSave() {
    if (!settings) return;
    await updateSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTestLLM() {
    if (!settings?.llm.apiKey || !settings?.llm.baseUrl) {
      setTestStatus('error');
      setTestMsg('Please fill in API Key and Base URL first');
      return;
    }

    setTestStatus('testing');
    setTestMsg('');

    try {
      const res = await fetch(`${settings.llm.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.llm.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.llm.model,
          messages: [{ role: 'user', content: 'Reply with just: OK' }],
          max_tokens: 10,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || '';
        setTestStatus('success');
        setTestMsg(`Connected! Model replied: "${reply.slice(0, 50)}"`);
      } else {
        const text = await res.text();
        setTestStatus('error');
        setTestMsg(`HTTP ${res.status}: ${text.slice(0, 100)}`);
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMsg(`Connection failed: ${err.message}`);
    }
  }

  if (!settings) return <div className="p-8 text-gray-500">Loading...</div>;

  const inputClass =
    'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const hintClass = 'text-xs text-gray-400 mt-1';

  return (
    <div className="max-w-lg mx-auto p-8">
      <div className="flex items-center gap-3 mb-8">
        <span className="text-3xl">🤖</span>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Agent Hub Collector</h1>
          <p className="text-sm text-gray-500">Extension Settings</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* ====== General Settings ====== */}
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b">General</h2>
          <div className="space-y-4">
            {/* API URL */}
            <div>
              <label className={labelClass}>Agent Hub API URL</label>
              <input
                type="url"
                className={inputClass}
                value={settings.apiUrl}
                onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                placeholder="http://localhost:3000"
              />
              <p className={hintClass}>The base URL of your Agent Hub website</p>
            </div>

            {/* Default Locale */}
            <div>
              <label className={labelClass}>Default Language</label>
              <select
                className={inputClass}
                value={settings.defaultLocale}
                onChange={(e) =>
                  setSettings({ ...settings, defaultLocale: e.target.value as any })
                }
              >
                {LOCALES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Default Content Type */}
            <div>
              <label className={labelClass}>Default Content Type</label>
              <select
                className={inputClass}
                value={settings.defaultContentType}
                onChange={(e) =>
                  setSettings({ ...settings, defaultContentType: e.target.value as any })
                }
              >
                {CONTENT_TYPES.map((ct) => (
                  <option key={ct.id} value={ct.id}>{ct.icon} {ct.label}</option>
                ))}
              </select>
            </div>

            {/* Auto Extract */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Auto Extract</label>
                <p className={hintClass}>
                  Automatically extract page content when opening the popup
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings({ ...settings, autoExtract: !settings.autoExtract })
                }
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings.autoExtract ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.autoExtract ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ====== LLM / AI Settings ====== */}
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b">
            AI Model (LLM)
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Connect a custom LLM for AI-powered content cleaning, MDX formatting, and auto metadata
            extraction. Supports any OpenAI-compatible API (OpenAI, DeepSeek, Ollama, etc.)
          </p>

          <div className="space-y-4">
            {/* Enable LLM */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Enable AI Features</label>
                <p className={hintClass}>Use LLM for content cleaning and metadata extraction</p>
              </div>
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    llm: { ...settings.llm, enabled: !settings.llm.enabled },
                  })
                }
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings.llm.enabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.llm.enabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {settings.llm.enabled && (
              <>
                {/* API Key */}
                <div>
                  <label className={labelClass}>API Key</label>
                  <input
                    type="password"
                    className={inputClass}
                    value={settings.llm.apiKey}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        llm: { ...settings.llm, apiKey: e.target.value },
                      })
                    }
                    placeholder="sk-..."
                  />
                  <p className={hintClass}>Your API key (stored locally, never sent elsewhere)</p>
                </div>

                {/* Base URL */}
                <div>
                  <label className={labelClass}>API Base URL</label>
                  <input
                    type="url"
                    className={inputClass}
                    value={settings.llm.baseUrl}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        llm: { ...settings.llm, baseUrl: e.target.value },
                      })
                    }
                    placeholder="https://api.openai.com/v1"
                  />
                  <p className={hintClass}>
                    OpenAI: https://api.openai.com/v1 | DeepSeek: https://api.deepseek.com/v1 | Ollama: http://localhost:11434/v1
                  </p>
                </div>

                {/* Model */}
                <div>
                  <label className={labelClass}>Model Name</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={settings.llm.model}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        llm: { ...settings.llm, model: e.target.value },
                      })
                    }
                    placeholder="gpt-4o"
                  />
                  <p className={hintClass}>
                    Examples: gpt-4o, gpt-4o-mini, deepseek-chat, llama3.1, qwen2.5
                  </p>
                </div>

                {/* Auto Clean */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Auto AI Clean</label>
                    <p className={hintClass}>
                      Automatically clean and format content with AI after page extraction
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings({
                        ...settings,
                        llm: { ...settings.llm, autoClean: !settings.llm.autoClean },
                      })
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      settings.llm.autoClean ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        settings.llm.autoClean ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Test Connection */}
                <div>
                  <button
                    onClick={handleTestLLM}
                    disabled={testStatus === 'testing'}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                  </button>
                  {testMsg && (
                    <p
                      className={`text-xs mt-2 ${
                        testStatus === 'success' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {testMsg}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Save Button */}
        <div className="pt-4">
          <button
            onClick={handleSave}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
