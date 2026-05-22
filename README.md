[![Deploy to GitHub Pages](https://github.com/fabian20ro/horror-scope/actions/workflows/deploy.yml/badge.svg)](https://github.com/fabian20ro/horror-scope/actions/workflows/deploy.yml)

**[Live Demo](https://fabian20ro.github.io/horror-scope/)**

# Horror-Scope

*Your Browser Knows Your Destiny*

A funny and absurd horoscope generator that reads your browser like a crystal ball. It assigns you a zodiac sign based on your browser fingerprint, then delivers a personalized daily horoscope full of cosmic nonsense — because your browser already knows everything about you.

## Features

- **Browser divination** — your zodiac sign is determined by your browser fingerprint (UA, language, screen, platform, timezone). Same browser, same destiny
- **Daily absurd horoscopes** — generated through a context-free grammar engine with hundreds of mystical/ridiculous sentence fragments. Same sign gets the same baseline horoscope for the same UTC day; the Regenerate button re-rolls it with a consultation counter
- **Bilingual** — Romanian (auto-detected from browser language) and English, with a flag toggle to switch
- **Light + dark theme** — because the stars shine differently depending on your mood
- **Mobile-first** — responsive design that looks good on any screen
- **Installable as a PWA** — add it to your home screen for daily cosmic guidance
- **"We know everything about you"** — an expandable panel that reveals all the browser properties used for your divination
- **Quick actions** — the horoscope card lets you `Copy horoscope text`, `Interpret with AI`, and `Randomize Sign` without leaving the page

## Tech

Vanilla TypeScript, Vite, zero runtime dependencies. The entire horoscope engine — grammar expansion, seeded PRNG, browser fingerprinting — runs client-side with no backend.

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build
```

## Grammar Syntax

The horoscope text is generated from grammar files located in `public/data/`.

### Entries and Weighting

Entries can include weights using the `~~` separator. A higher weight means a higher probability of being selected.
Example: `#signName#~~10 #prediction#~~5` (Sign name is twice as likely as prediction).

### Modifiers

Modifiers are applied to symbols using a dot notation within the `#symbol.modifier#` syntax. Supported modifiers include:
- `capitalize`: Capitalizes the first letter.
- `uppercase`: Converts text to uppercase.
- `lowercase`: Converts text to lowercase.
- `trim`: Removes surrounding whitespace.
- `titlecase`: Capitalizes every word.
