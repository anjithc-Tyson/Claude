# Halloween components for React 18 and 19

Plain React versions of the Halloween section, with no `framer` package. Tested on React 19.2.3: strict TypeScript, server rendering and browser interaction.

Don't install `framer` in a React or Next.js app. It only runs inside Framer and requires React 18, which causes the `ERESOLVE` error. If you already added it, remove it:

```bash
npm uninstall framer
```

## Files

Copy all four into your project, for example `components/halloween/`. They need nothing beyond `react` and `react-dom`.

| File | What it is | Replaces (Framer) |
| --- | --- | --- |
| `SpookyLayer.tsx` | Spiders, webs and pumpkins around the page edges; never blocks clicks | `SpookyLayer.tsx` |
| `PumpkinGame.tsx` | Three pumpkins, one hides a treat (random on every load) | Pumpkin Game component + `RandomTreat.tsx` |
| `SpellPrompt.tsx` | "Design a Spell" bar with idea chips; opens the Design Studio with the spell | Design a Spell bar + `SpellToStudio.tsx` |
| `studioHandoff.ts` | Sends a brief to the Design Studio (`sessionStorage["tks-studio-handoff"]`) | shared helper |

Each component starts with `"use client"`, so it works in the Next.js App Router as is.

## Use

```tsx
import SpookyLayer from "@/components/halloween/SpookyLayer"
import PumpkinGame from "@/components/halloween/PumpkinGame"
import SpellPrompt from "@/components/halloween/SpellPrompt"

export default function HalloweenSection() {
    return (
        <section>
            <SpookyLayer active />
            <PumpkinGame theme="light" treatCode="SPELL13" treatText="13% off any custom design" />
            <SpellPrompt theme="light" />
        </section>
    )
}
```

### Props

**SpookyLayer**: `active` (default `true`): turn it on or off; it fades out when switched off.

**PumpkinGame**:

| Prop | Default |
| --- | --- |
| `theme` | `"light"` (or `"dark"`) |
| `treatCode` | `"SPELL13"` |
| `treatText` | `"13% off any custom design"` |
| `intro` | `"Three pumpkins. One hides a treat. Tap one, if you dare."` |
| `studioPath` | `"/design-studio"` |

**SpellPrompt**:

| Prop | Default |
| --- | --- |
| `theme` | `"light"` (or `"dark"`) |
| `placeholder` | `"a bat-wing ear cuff in rose gold, with one tiny ruby"` |
| `ideas` | Spider-web pendant, Crescent moonstone ring, Ghost charm in white gold |
| `buttonLabel` | `"Design it"` |
| `studioPath` | `"/design-studio"` |

All three components take a `style` prop too.

## Notes

- Fonts: the components ask for Afacad Flux and Cormorant Garamond and fall back to system fonts. Load both in your app (for example with `next/font/google`) to match the site.
- Reduced motion: every animation stops when the visitor prefers reduced motion.
- The Design Studio must read `tks-studio-handoff` on load. The Framer Design Studio already does. If your Next.js app has its own studio page, read and clear that key there.
