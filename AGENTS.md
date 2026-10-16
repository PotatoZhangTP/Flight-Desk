# Flight Desk UI Writing Rules

## English UI casing

All new or modified English UI titles, buttons, labels, navigation items, table headings, filters, status labels, and short action links must use Title Case: capitalize the first letter of every word, including short words such as To, Of, In, For, and And.

This rule applies to user-visible interface labels, not to complete sentences, explanatory paragraphs, error messages, toast messages, user-entered content, external names, URLs, code, database fields, API parameters, or professional abbreviations such as Flight Desk, SimBrief, ICAO, IATA, and UTC. Do not enforce it with CSS; write the correct source text in the i18n catalog or component.

## Date display rules

User-visible dates must use the shared `LocalizedDate` component and `lib/date-format.ts`. The default English display format is `MM/DD/YYYY`; stored ISO dates, UTC values, sorting, filtering, and form input values must not be changed. Future date-format preferences should be added to the shared format configuration rather than implemented per page.

## Button Design Rules

Use the shared `button-primary`, `button-secondary`, and `button-danger` classes for independent actions. Keep their common height, rounded shape, typography, spacing, hover, focus-visible, and disabled behavior consistent across themes and screen sizes. Do not turn ordinary prose links or breadcrumbs into buttons.

Standalone Back, Back To Dashboard, Back To Settings, and Go To Full Settings actions are button links and must use `button-secondary` (or the equivalent shared link treatment) while ordinary prose links and breadcrumbs remain lightweight links.

## Loading And Transition Rules

Every new page, component, or interaction must consider Loading, Transition, Success, and Error states. Use real asynchronous state only for asynchronous work; do not add artificial delays to synchronous interactions. Use the shared 100–150ms interaction feedback, 150–250ms component transitions, and 200–300ms page transitions with an Ease Out curve. Prefer Skeleton or Spinner feedback for data loading, preserve focus and form state, and respect `prefers-reduced-motion`.
