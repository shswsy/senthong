---
name: เส้นทอง · Senthong Noodles
description: QR table ordering with a realtime kitchen board for a fictional Thai noodle shop.
colors:
  chili-red: "#c0272d"
  chili-red-deep: "#9a1d22"
  egg-noodle-gold: "#f4b400"
  egg-noodle-gold-light: "#ffd45c"
  soy-brown: "#3b2417"
  soy-brown-light: "#5a3a26"
  wok-black: "#1f1a16"
  rice-paper: "#fbf6ee"
  rice-paper-deep: "#f3eadb"
  bowl-white: "#fffdf8"
  pure-white: "#ffffff"
  broth-line: "#eadfcc"
  broth-line-light: "#f1e8d8"
  soy-ink: "#241e19"
  tea-grey: "#776b5d"
  herb-green: "#2f7d4a"
  chili-orange: "#d9731c"
  kitchen-bg: "#f2eee7"
  kitchen-new: "#d4372c"
  kitchen-new-soft: "#fde8e4"
  kitchen-cook-soft: "#fff1cc"
  kitchen-ready: "#23804a"
  kitchen-ready-soft: "#ddf2e3"
  kitchen-done: "#8a7b6b"
  kitchen-done-soft: "#efe9e0"
typography:
  display:
    fontFamily: "Prompt, IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "clamp(36px, 5vw, 60px)"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Prompt, IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Prompt, IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "15.5px"
    fontWeight: 600
    lineHeight: 1.35
  price:
    fontFamily: "Prompt, IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Prompt, IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  pill: "999px"
  sheet: "28px"
  promo: "24px"
  card: "20px"
  column: "18px"
  tile: "16px"
  control: "14px"
  segment: "12px"
spacing:
  gutter: "clamp(16px, 3vw, 40px)"
  wrap: "1440px"
  narrow: "760px"
  card: "20px"
  grid-gap: "12px"
components:
  button-primary:
    backgroundColor: "{colors.chili-red}"
    textColor: "{colors.pure-white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "#c62a37"
  button-gold:
    backgroundColor: "{colors.egg-noodle-gold}"
    textColor: "{colors.wok-black}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
    height: "44px"
  button-gold-hover:
    backgroundColor: "{colors.egg-noodle-gold-light}"
  button-ghost:
    backgroundColor: "{colors.bowl-white}"
    textColor: "{colors.soy-ink}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
    height: "44px"
  category-chip:
    backgroundColor: "{colors.pure-white}"
    textColor: "{colors.soy-brown-light}"
    rounded: "{rounded.pill}"
    padding: "6px 16px"
    height: "40px"
  category-chip-selected:
    backgroundColor: "{colors.soy-brown}"
    textColor: "{colors.pure-white}"
  option-pill:
    backgroundColor: "{colors.pure-white}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  option-pill-selected:
    backgroundColor: "#fff1ed"
    textColor: "{colors.chili-red-deep}"
  dish-card:
    backgroundColor: "{colors.pure-white}"
    rounded: "{rounded.card}"
    padding: "10px 12px 14px"
  add-button:
    backgroundColor: "{colors.chili-red}"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.control}"
    size: "44px"
  cart-bar:
    backgroundColor: "{colors.soy-brown}"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.card}"
    height: "64px"
  kitchen-card:
    backgroundColor: "{colors.pure-white}"
    rounded: "{rounded.tile}"
  kitchen-advance-button:
    textColor: "{colors.pure-white}"
    rounded: "{rounded.control}"
    height: "52px"
  admin-tab-active:
    backgroundColor: "{colors.wok-black}"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
---

# Design System: เส้นทอง · Senthong Noodles

## Overview

**Creative North Star: "The Lantern-Lit Noodle Counter"**

A warm Thai-Chinese noodle shop rendered as an app: chili red and egg-noodle gold over rice-paper cream, with soy brown as the grounding dark. The customer side is appetite-first and phone-first: big illustrated dish cards on soft golden radial "plates", a sticky category chip bar, bottom sheets for options, and a floating soy-brown cart bar. Everything is rounded, soft and tappable (44px minimum).

The staff side keeps the same family but turns functional. The kitchen board is a four-column status rail (new, cooking, ready, served) on a neutral kitchen background, where each card carries a 5px colored top edge and a 52px advance button colored by its next state. The admin uses a white top bar, pill tabs and plain bordered panels.

Depth is soft, warm-brown and layered, with a small hard "lip" (`0 3px 0`) under the primary red and gold buttons that makes them feel pressable.

**Key Characteristics:**
- Chili red (#c0272d) for actions and prices, egg-noodle gold (#f4b400) for highlights and "in cart", soy brown (#3b2417) for the cart bar, selected chips and headings.
- Pill buttons and chips; 20px dish cards; 28px bottom sheets.
- Hand-drawn SVG food on tinted radial plates (five tones), never photos.
- Warm brown-tinted soft shadows; red and gold buttons carry a solid 3px lip.
- Realtime cues: pulsing green live dot, flashing gold outline on new kitchen cards, ringing bell on tables that call staff.

## Colors

A warm food palette: red and gold on cream, with brown as the dark and a separate status set for the kitchen.

### Primary
- **Chili Red** (#c0272d): primary buttons, prices, add-to-cart buttons, count badges, links, eyebrows, the home hero background, selected option border, theme color.
- **Chili Red Deep** (#9a1d22): the primary button lip, add-button hover, selected option text, emphasis in the promo.

### Secondary
- **Egg-Noodle Gold** (#f4b400): gold buttons, focus outline, in-cart dish ring, cart icon tile, table number, cart total, hero emphasis.
- **Egg-Noodle Gold Light** (#ffd45c): gold hover, demo strip text, hero eyebrow.

### Neutral
- **Soy Brown** (#3b2417): headings and brand, cart bar, selected category chip, table badge, dish flags. **Soy Brown Light** (#5a3a26): unselected chip text.
- **Wok Black** (#1f1a16): demo strip, toasts, active admin tab, selected table outline.
- **Rice Paper** (#fbf6ee): page background. **Rice Paper Deep** (#f3eadb): segmented track, icon buttons, served status, tab hover.
- **Bowl White** (#fffdf8): card token used by ghost buttons, panels, stats, table cells, admin bar. **Pure White** (#ffffff): dish cards, sheets, chips, option pills, kitchen cards.
- **Soy Ink** (#241e19): body text. **Tea Grey** (#776b5d): muted text. **Broth Line** (#eadfcc) / **Broth Line Light** (#f1e8d8): borders and dividers.
- **Herb Green** (#2f7d4a): success toast, live state. **Chili Orange** (#d9731c): staff-call bell and option notes.

### Kitchen status set
- **New** (#d4372c on #fde8e4), **Cooking** (amber text #b87500 on #fff1cc), **Ready** (#23804a on #ddf2e3), **Served** (#8a7b6b on #efe9e0), on a **Kitchen Background** (#f2eee7).

### Named Rules
**The Red Means Buy Rule.** Chili red is for the action that spends money (add, order, primary) and for the price itself. Gold says "you have this"; brown says "you are here".

**The Status Lane Rule.** In the kitchen, each status owns one hue and every element in that lane (dot, count, top edge) uses it. The advance button takes the color of the next status.

## Typography

**Display Font:** Prompt 500-700
**Body Font:** IBM Plex Sans Thai 400-600 (with system-ui)

**Character:** One friendly, rounded Thai geometric sans does all the talking (names, prices, buttons, numbers); Plex Sans Thai handles descriptions and body text. No mono or serif.

### Hierarchy
- **Display** (700, clamp(36px, 5vw, 60px), 1.2): home hero; promo heading clamp(20px, 5.4vw, 34px).
- **Headline** (600, 21px): menu section titles in soy brown.
- **Title** (600, 15.5px, 1.35): dish names, clamped to two lines.
- **Price** (700, 18px): dish prices in chili red; cart total 21px gold; stats 30px.
- **Body** (400, 16px, 1.6): copy; dish descriptions 12.5px muted.
- **Label** (Prompt 600, 14-15px): buttons, chips, eyebrows; badges 12.5px.

## Layout

Wrap `min(1440px, 100% - 2 × clamp(16px, 3vw, 40px))`, with a 760px narrow wrap for focused pages. The menu is a two-column grid on phones (gap 12px) and auto-fills at min 210px from 640px (gap 18px). The category chip bar is sticky with a blurred cream background; the cart bar floats at the bottom (max 560px wide) over a cream fade. Option sheets are bottom sheets on phones and centered dialogs from 700px.

Kitchen: full-height board, `repeat(3, 1fr) 0.72fr` columns (the served lane narrower), each column scrolling on its own. Admin: top bar plus content with a sticky side panel. Breakpoints: 480, 560, 639/640, 700, 900, 1000, 1100px.

## Elevation & Depth

Soft and warm. Cards sit on two-layer shadows tinted brown (`rgb(60 36 20)`), lifting further on hover. Overlays use deeper shadows. Red and gold buttons add a solid, unblurred 3px lip beneath them.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 1px 2px rgb(60 40 20 / 0.06), 0 8px 24px -12px rgb(60 40 20 / 0.18)`): panels and the base token.
- **Dish rest / hover** (`0 1px 2px rgb(60 36 20 / 0.06), 0 10px 24px -16px rgb(60 36 20 / 0.35)` to `... 0 16px 30px -16px rgb(60 36 20 / 0.45)`): dish cards.
- **Kitchen card** (`0 1px 2px rgb(60 36 20 / 0.06), 0 8px 18px -12px rgb(60 36 20 / 0.3)`).
- **Button lip** (`0 3px 0 #9a1d22` red, `0 3px 0 #c99504` gold).
- **Floating bar** (`0 16px 30px -12px rgb(40 22 10 / 0.6)`): cart bar. **Sheet** (`0 -20px 50px -20px rgb(0 0 0 / 0.4)`).
- **In-cart ring** (`0 0 0 2px #f4b400`) and **new-order flash** (`0 0 0 4px rgb(244 180 0 / 0.65)`, three pulses).

## Shapes

Round and soft throughout. Buttons, chips, tabs, badges and status tags are pills; add buttons, option pills, kitchen buttons and toasts are 14px; dish art and kitchen cards 16px; dish cards, cart bar and panels 20px; promo 24px; bottom sheets 28px on top corners. The segmented control uses a 16px track with 12px segments. Table cells for free tables use a dashed border.

## Components

### Buttons
- **Shape:** full pill, 1.5px border slot, min-height 44px (36px small, 52px large).
- **Primary:** chili red, white Prompt 600 15px text, padding 10px 20px, 3px deep-red lip.
- **Hover / Focus:** primary shifts to #c62a37, gold to light gold, ghost gets an ink border; press moves 1px down; disabled is 50% opacity. Focus is a 3px gold outline, 2px offset.
- **Gold:** gold fill, ink text, darker gold lip. **Ghost:** bowl white with broth-line border. **On-dark variants:** translucent white borders.

### Chips
- **Category chips:** white pills with a broth-line border, Prompt 600 14.5px soy-brown-light text; selected = solid soy brown with white text.
- **Order status:** pill tags; received red-tint, cooking amber, ready green, served cream, cancelled grey.

### Cards / Containers
- **Dish card:** white, 20px, soft card shadow, 5:4 radial-gradient art plate inset 6px with 16px corners, two-line name, red price, and a 44px red add button pinned bottom-right with a gold quantity badge. Lifts 2px on hover while the food rotates -4deg. In cart = gold ring. Sold out = desaturated.
- **Panels / stats:** bowl white, 1px broth-line border, 16-20px radius, padding 16-20px.

### Inputs / Fields
- **Option pills:** 44px white, 14px radius, broth-line border; selected = red border, light red tint, deep red 600 text.
- **Quantity stepper:** a rice-paper-deep pill track holding 40px round white buttons around a Prompt 700 17px numeral.
- **Selects:** white, bordered, rounded, used in admin forms.

### Navigation
- **Customer:** brand + soy-brown table badge (gold number) at top; segmented "menu / my orders" control (selected segment white with soft shadow); sticky category chips.
- **Admin:** white top bar with pill tabs; hover rice-paper-deep, current = wok black with white text.
- **Mobile:** floating cart bar / order-tracking bar at the bottom.

### Kitchen Order Card (signature)
- White 16px card with a 5px status-colored top border, table number, wait timer (amber when slow, pulsing red when late), item lines with quantity badges, and a 52px advance button colored by the next status (new → red, cooking → green, ready → brown). New cards flash a gold ring three times.

### Bottom Sheet
- Full-width white sheet with 28px top corners and a grab handle over a brown 50% scrim; slides up (0.28s); a centered dialog on wide screens.

## Do's and Don'ts

### Do:
- **Do** use chili red (#c0272d) for buy actions and prices, gold (#f4b400) for "in cart" and focus, soy brown (#3b2417) for selected navigation.
- **Do** keep touch targets at 44px or more on the customer side and 52px for kitchen actions.
- **Do** draw food as SVG on one of the five radial plate tones.
- **Do** keep each kitchen status in its own hue across dot, count, card edge and button.
- **Do** use two-step inline confirms for destructive actions.

### Don't:
- **Don't** use photos of food.
- **Don't** use `window.alert` or `confirm`.
- **Don't** use cool greys or pure-black shadows on cards; shadows are brown-tinted.
- **Don't** introduce a second display font; Prompt carries all headings, prices and numbers.
