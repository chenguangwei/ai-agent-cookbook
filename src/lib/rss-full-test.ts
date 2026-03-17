/**
 * Test ALL RSS sources from database and generate report
 */

import { parseRssFeed, parseRssFeedViaProxy } from './rss-parser';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    process.env[key] = value;
  }
});

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Source {
  id: string;
  name: string;
  url: string;
  language: string;
  category: string;
}

async function getAllSources(): Promise<Source[]> {
  const { data, error } = await supabase
    .from('rss_sources')
    .select('id, name, url, language, category')
    .eq('enabled', 1)
    .order('language', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to fetch sources:', error);
    return [];
  }

  return data || [];
}

async function testSource(source: Source) {
  try {
    const feed = await parseRssFeed(source.url);
    return { success: true, method: 'direct', items: feed.items.length, error: null };
  } catch (directError: any) {
    try {
      const feed = await parseRssFeedViaProxy(source.url);
      return { success: true, method: 'proxy', items: feed.items.length, error: null };
    } catch (proxyError: any) {
      return { success: false, method: 'both', items: 0, error: proxyError.message };
    }
  }
}

async function runFullTest() {
  console.log('Fetching all RSS sources from database...\n');
  const sources = await getAllSources();
  console.log(`Found ${sources.length} enabled sources\n`);

  const results: Array<Source & { success: boolean; method: string; items: number; error: string | null }> = [];
  let successDirect = 0;
  let successProxy = 0;
  let failed = 0;

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const progress = `[${i + 1}/${sources.length}]`;
    process.stdout.write(`${progress} ${source.name.substring(0, 30).padEnd(30)}... `);

    const result = await testSource(source);
    results.push({ ...source, ...result });

    if (result.success) {
      if (result.method === 'direct') {
        successDirect++;
        console.log(`✅ (direct, ${result.items})`);
      } else {
        successProxy++;
        console.log(`✅ (proxy, ${result.items})`);
      }
    } else {
      failed++;
      console.log(`❌ ${result.error?.substring(0, 40)}`);
    }
  }

  // Generate report
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total: ${sources.length}`);
  console.log(`Direct: ${successDirect} (${Math.round(successDirect/sources.length*100)}%)`);
  console.log(`Proxy: ${successProxy} (${Math.round(successProxy/sources.length*100)}%)`);
  console.log(`Failed: ${failed} (${Math.round(failed/sources.length*100)}%)`);

  // Group by language
  console.log('\n' + '='.repeat(70));
  console.log('BY LANGUAGE');
  console.log('='.repeat(70));

  for (const lang of ['en', 'zh', 'ja']) {
    const langSources = results.filter(r => r.language === lang);
    const langSuccess = langSources.filter(r => r.success).length;
    console.log(`\n${lang.toUpperCase()}: ${langSuccess}/${langSources.length} (${Math.round(langSuccess/langSources.length*100)}%)`);
  }

  // Collect broken sources
  const brokenSources = results.filter(r => !r.success);

  // Generate markdown report
  let mdContent = `# RSS Source Test Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
|--------|-------|
| Total Sources | ${sources.length} |
| Direct Success | ${successDirect} (${Math.round(successDirect/sources.length*100)}%) |
| Proxy Success | ${successProxy} (${Math.round(successProxy/sources.length*100)}%) |
| Failed | ${failed} (${Math.round(failed/sources.length*100)}%) |

## Failed Sources (${brokenSources.length} sources)

These sources are broken and should be removed from the database:

| # | Name | Language | Category | URL | Error |
|---|------|----------|----------|-----|-------|
`;

  brokenSources.forEach((source, index) => {
    mdContent += `| ${index + 1} | ${source.name} | ${source.language} | ${source.category} | ${source.url} | ${source.error?.substring(0, 50) || 'Unknown'} |\n`;
  });

  // Group by error type
  const errorTypes: Record<string, typeof brokenSources> = {};
  brokenSources.forEach(source => {
    const errorKey = source.error?.substring(0, 30) || 'Unknown';
    if (!errorTypes[errorKey]) errorTypes[errorKey] = [];
    errorTypes[errorKey].push(source);
  });

  mdContent += `\n## Error Analysis\n\n`;
  Object.entries(errorTypes).sort((a, b) => b[1].length - a[1].length).forEach(([error, sources]) => {
    mdContent += `### ${error} (${sources.length} sources)\n`;
    sources.forEach(s => {
      mdContent += `- ${s.name} (${s.language}): ${s.url}\n`;
    });
    mdContent += '\n';
  });

  // Save report
  fs.writeFileSync('docs/rss-source-test-report.md', mdContent);
  console.log('\n✅ Report saved to docs/rss-source-test-report.md');

  // Generate SQL to disable broken sources
  let sqlContent = `-- SQL to disable broken RSS sources
-- Run this to remove broken sources

UPDATE rss_sources SET enabled = 0 WHERE id IN (
`;
  brokenSources.forEach(source => {
    sqlContent += `  '${source.id}', -- ${source.name}\n`;
  });
  sqlContent = sqlContent.replace(/,\n$/, '\n');
  sqlContent += ');\n';

  fs.writeFileSync('docs/rss-sources-disable.sql', sqlContent);
  console.log('✅ SQL saved to docs/rss-sources-disable.sql');

  return results;
}

runFullTest().catch(console.error);
