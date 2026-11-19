# 心命 · dsh-context-heart

> Your context budget, as a heart that cracks.

DSH ships a context meter — a tiny, faint ring below the composer.
You look at it every day. You rarely *see* it.

This plugin turns it into a heart on your screen:
**the more you use, the more it breaks.**

Not for decoration. Numbers are for other people to read.
**A heart is for you to feel.**

---

## States

| Usage | Heart |
|---|---|
| 0–25% | Bright red, full, gently beating |
| 25–50% | Darker, first crack appears |
| 50–75% | More cracks, edges blacken, small chips fall off |
| 75–100% | Shattered, dark core exposed, almost still |

---

## Usage

- **Drag** (left button): move it — position is remembered
- **Click** (left): open the detail panel
- **Right click**: menu (details / size / reset position / hide)
- **Wheel**: zoom

The panel shows a health bar, remaining percentage, and the breakdown
across system / tools / conversation.

---

## Ring health bar (v2)

A thin ring around the heart is the health bar: **whatever is left of your budget is
how much of the ring is lit**, clockwise from 12 o'clock. Colour follows the tier
(pink → dark red → deep red, flashing when low). If the reading fails the ring fades to
45% instead of pretending to be full.

---

## Squeeze / Extract (v3)

The first two right-click items. **The plugin does not compress and does not write
memory itself** — it presses send for you; DSH does the compaction, the agent does the
extraction.

| Item | What it does | How |
|---|---|---|
| **Squeeze** | Compress old turns, free budget | Types `/compact` and presses Enter → DSH built-in compaction |
| **Extract** | Persist what matters, leave one pointer | Sends a fixed prompt; **click twice** to confirm (starts a real turn) |

Guards: never acts when the composer already has a draft, when a turn is running,
or when the text did not actually land. It never edits the session or fabricates messages.

### v3.1 — explanations, cautions, icons

Each item is now a card: inline-SVG icon, name, a grey line saying what it does, and an
orange 「注意」 line with the risk. Clicking Extract once highlights the card in pink and
flips its badge to 「确认？」 for 4 seconds. Icons are inline SVG with `fill`/`stroke` written
as attributes, so a stale stylesheet cannot turn them into black blobs.


---

## Install

1. Put this directory at `dsh-home/plugins/dsh-context-heart/`
2. Edit `dsh-home/profiles/web/package.json`:

```json
{
  "dependencies": {
    "dsh-context-heart": "file:../../plugins/dsh-context-heart"
  },
  "dsh": {
    "profile": {
      "bundles": ["...", "dsh-context-heart"]
    }
  }
}
```

3. Refresh the page. **No restart needed.**

**Back up `package.json` before editing.** A broken one can stop DSH from starting.

---

## How it gets the number (important)

The DSH plugin API does **not** expose live context usage.
So this plugin takes another route: **it reads the DOM of the built-in meter.**

- Primary selector: `[class*="JObwrW_trigger"]`
- Fallback: `[aria-label*="%"]`
- Poll interval: 2s

If you are modifying this plugin, knowing this will save you half a day.

---

## Known issues (read this first)

1. **`JObwrW_*` is a CSS Modules hash and may change between DSH versions.**
   When it does, the plugin stops updating — the heart freezes on its last value.
   Fix: open DevTools, find the meter element, update the selector.

2. **It never falls back to zero when reading fails.** It keeps the last value.
   That is intentional — better a stale number than lying 「100% left」.

3. **The breakdown only exists in the DOM while the panel is open.**
   The plugin reads it once, on demand, rather than clicking repeatedly.

4. **The three segments usually sum to less than the total.**
   The difference is memory injection, persona cards, old snapshots — unclassified.
   The panel has an 「other / unclassified」 row so the numbers don't contradict each other.

---

## Why it exists

The built-in meter gets covered or squeezed out by many custom skins.
This plugin is a standalone element: **change the skin, the heart stays.**

---

## Compatibility

- Verified on DSH Web (`dsh web`)
- Coexists with custom skins; layout changes don't move it

---

## License

MIT
