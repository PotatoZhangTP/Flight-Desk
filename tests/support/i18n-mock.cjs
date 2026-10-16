// English presentation boundary for existing focused unit tests.
// Real language switching is exercised separately in i18n browser tests.
const fs = require('node:fs');
const path = require('node:path');
const entries = fs.readFileSync(path.join(__dirname, '../../lib/i18n/catalog.ts'), 'utf8').split('\n').filter(line => /^[a-z]+\./.test(line) && line.includes('|')).map(line => line.split('|'));
const byKey = Object.fromEntries(entries.map(([key, en]) => [key, en]));
const text = source => byKey[source] ?? source;
module.exports = {
  T: ({ id, source, children }) => text(id ?? source ?? children ?? ''), useText: () => text, useLanguage: () => ({ locale: 'en' }),
  UiError: ({message}) => message,
  CmsText: ({source}) => source,
  LocalizedNav: ({label, children, ...props}) => require('react').createElement('nav', {...props, 'aria-label': label}, children),
  StatisticValue: ({value}) => value,
  StatisticDetail: ({value}) => text(value),
  LocalizedDate: ({value, monthOnly}) => new Intl.DateTimeFormat('en-GB', {timeZone: 'UTC', year: 'numeric', month: monthOnly ? 'long' : 'short', ...(monthOnly ? {} : {day: '2-digit'})}).format(new Date(value)),
};
