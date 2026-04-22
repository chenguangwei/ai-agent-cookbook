import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, locales, type Locale } from './config';

type MessageTree = Record<string, unknown>;

function mergeMessages(base: MessageTree, override: MessageTree): MessageTree {
  const result: MessageTree = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const current = result[key];

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      current &&
      typeof current === 'object' &&
      !Array.isArray(current)
    ) {
      result[key] = mergeMessages(current as MessageTree, value as MessageTree);
    } else {
      result[key] = value;
    }
  }

  return result;
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate that the incoming locale is valid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  const baseMessages = (await import(`../messages/${defaultLocale}.json`)).default;
  const localeMessages =
    locale === defaultLocale
      ? baseMessages
      : (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages: mergeMessages(baseMessages, localeMessages),
  };
});
