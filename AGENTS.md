# Flight Desk UI Writing Rules

## English UI casing

All new or modified English UI titles, buttons, labels, navigation items, table headings, filters, status labels, and short action links must use Title Case: capitalize the first letter of every word, including short words such as To, Of, In, For, and And.

This rule applies to user-visible interface labels, not to complete sentences, explanatory paragraphs, error messages, toast messages, user-entered content, external names, URLs, code, database fields, API parameters, or professional abbreviations such as Flight Desk, SimBrief, ICAO, IATA, and UTC. Do not enforce it with CSS; write the correct source text in the i18n catalog or component.

## Date display rules

User-visible dates must use the shared `LocalizedDate` component and `lib/date-format.ts`. The default English display format is `MM/DD/YYYY`; stored ISO dates, UTC values, sorting, filtering, and form input values must not be changed. Future date-format preferences should be added to the shared format configuration rather than implemented per page.
