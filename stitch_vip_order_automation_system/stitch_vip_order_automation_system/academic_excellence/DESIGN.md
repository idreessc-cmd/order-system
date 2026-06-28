---
name: Academic Excellence
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#43474e'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#74777f'
  outline-variant: '#c4c6d0'
  surface-tint: '#455f8a'
  primary: '#000e24'
  on-primary: '#ffffff'
  primary-container: '#00234b'
  on-primary-container: '#718bb9'
  inverse-primary: '#adc7f8'
  secondary: '#775a19'
  on-secondary: '#ffffff'
  secondary-container: '#fed488'
  on-secondary-container: '#785a1a'
  tertiary: '#00110b'
  on-tertiary: '#ffffff'
  tertiary-container: '#00291f'
  on-tertiary-container: '#44997f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#adc7f8'
  on-primary-fixed: '#001b3d'
  on-primary-fixed-variant: '#2c4771'
  secondary-fixed: '#ffdea5'
  secondary-fixed-dim: '#e9c176'
  on-secondary-fixed: '#261900'
  on-secondary-fixed-variant: '#5d4201'
  tertiary-fixed: '#9ef3d6'
  tertiary-fixed-dim: '#82d7ba'
  on-tertiary-fixed: '#002118'
  on-tertiary-fixed-variant: '#00513f'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: IBM Plex Sans Arabic
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 60px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: IBM Plex Sans Arabic
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: IBM Plex Sans Arabic
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 42px
  headline-sm:
    fontFamily: IBM Plex Sans Arabic
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: IBM Plex Sans Arabic
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: IBM Plex Sans Arabic
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: IBM Plex Sans Arabic
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: IBM Plex Sans Arabic
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style
The design system is built on the pillars of academic prestige, intellectual clarity, and professional trust. It targets learners and educators who value a focused, distraction-free environment that feels both high-end and accessible. 

The style is **Sophisticated Minimalism**. It leverages heavy whitespace to denote "breathing room" for complex thoughts, paired with a disciplined application of deep tones and metallic or jewel-toned accents. This approach moves away from loud, aggressive trends in favor of a quiet, authoritative confidence that mirrors the atmosphere of a world-class institution. Every element exists to facilitate the absorption of knowledge, using subtle depth and refined typography to guide the user’s journey.

## Colors
The palette is rooted in tradition but rendered with modern precision. 

- **Primary (Deep Navy):** Used for headers, primary navigation, and high-level structural elements to establish authority.
- **Secondary (Academic Gold):** Reserved for "Success" states, premium badges, and high-value call-to-actions. It signifies achievement and excellence.
- **Tertiary (Emerald Green):** An alternative accent for growth-related indicators, progress bars, and positive feedback loops.
- **Neutral (Slate Grey):** Employed for body text, secondary labels, and icon outlines to maintain a soft, legible contrast against the clean white background.
- **Background:** A pure White (#FFFFFF) or an extremely subtle off-white (#F8FAFC) to maximize the sense of space and cleanliness.

## Typography
This design system utilizes **IBM Plex Sans Arabic** for its exceptional clarity and technical precision. It bridges the gap between traditional calligraphic roots and modern geometric sans-serifs, making it ideal for educational content.

- **Headlines:** Set in Bold or SemiBold weights using the Primary Navy color to anchor the page.
- **Body Text:** Uses a generous line height (1.5x - 1.6x) in Slate Grey to reduce eye strain during long reading sessions.
- **Labels:** Small caps or medium weights are used for metadata and utility links to provide a distinct visual layer from the primary narrative text.

## Layout & Spacing
The layout follows a **Fluid-to-Fixed** hybrid grid. On desktop, content is centered within a 1200px container to ensure optimal line lengths for reading. 

- **The 8px Rhythm:** All spacing (padding, margins, gaps) must be a multiple of 8px to maintain a mathematical, organized feel.
- **Whitespace:** Use "Stack LG" (48px+) between major sections to emphasize the premium, unhurried nature of the brand.
- **Breakpoints:** 
  - **Mobile (<640px):** 4-column grid, 16px side margins.
  - **Tablet (640px - 1024px):** 8-column grid, 24px side margins.
  - **Desktop (>1024px):** 12-column grid, 40px side margins, fixed center container.

## Elevation & Depth
Depth is signaled through **Ambient Shadows** and **Tonal Layering**. The design system avoids heavy, dark shadows in favor of light-dispersed elevation.

- **Level 0 (Base):** The main canvas, pure white.
- **Level 1 (Cards/Surface):** A subtle 1px border in a very light grey (#E2E8F0) with a soft, 4px blur shadow (Opacity 5%, Navy tint) to suggest it is slightly lifted.
- **Level 2 (Hover/Active):** An increased shadow (12px blur, 8% opacity) to provide tactile feedback without looking "heavy."
- **Interactive Elements:** Use background-tinted surfaces (e.g., 5% Navy background) for inputs and secondary buttons instead of deep shadows.

## Shapes
The shape language is defined by **Soft Geometric Precision**. 

The standard radius is **8px** (0.5rem), providing a friendly but structured appearance. Larger containers like modals or hero images use **16px** (1rem) to feel more contemporary and welcoming. Buttons and input fields must strictly adhere to the 8px rule to maintain the "Academic" rigor—avoiding the overly casual nature of full-pill (rounded-full) buttons.

## Components
- **Buttons:** 
  - *Primary:* Solid Deep Navy with White text. 8px radius. Subtle scale-down effect on press.
  - *Secondary:* Transparent background, Deep Navy border (1px), Deep Navy text.
  - *Success:* Solid Gold with White text, used sparingly for "Enroll" or "Complete."
- **Input Fields:** 1px border in light Slate. On focus, the border transitions to Deep Navy with a 2px "soft halo" (glow) of the same color at 10% opacity.
- **Cards:** White background, Level 1 elevation (see Elevation & Depth). Cards should have a generous 24px internal padding.
- **Chips/Badges:** Used for course categories or tags. Light grey background with Slate text, using a 4px radius (sharper than buttons) to differentiate metadata from actions.
- **Progress Bars:** Use a thin (4px or 8px) track. The progress indicator should use the Emerald Green or Gold to provide a sense of achievement.
- **Navigation:** Top-tier navigation uses the Primary Navy for text. Active states are indicated by a subtle 2px Gold underline rather than a background change.