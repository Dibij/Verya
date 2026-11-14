// Tailwind class mapping utilities.
//
// All class manipulation is token-based: the className string is split on
// whitespace, and whole tokens are matched with anchored regexes. Regex
// replacement over the raw string (the previous approach) would corrupt
// compound utilities such as `flex-col` or `bg-gradient-to-r`.

// Tailwind spacing scale px values
const TAILWIND_SPACING: Record<string, number> = {
  '0': 0,
  px: 1,
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '2.5': 10,
  '3': 12,
  '3.5': 14,
  '4': 16,
  '5': 20,
  '6': 24,
  '7': 28,
  '8': 32,
  '9': 36,
  '10': 40,
  '11': 44,
  '12': 48,
  '14': 56,
  '16': 64,
  '20': 80,
  '24': 96,
  '28': 112,
  '32': 128,
  '36': 144,
  '40': 160,
  '44': 176,
  '48': 192,
  '52': 208,
  '56': 224,
  '60': 240,
  '64': 256,
  '72': 288,
  '80': 320,
  '96': 384,
};

// Build reverse map: px → tailwind scale key
const PX_TO_SCALE: Map<number, string> = new Map(
  Object.entries(TAILWIND_SPACING).map(([k, v]) => [v, k]),
);

/**
 * Convert a pixel value to a Tailwind spacing scale key.
 * Returns e.g. '6' for 24px, or '[24px]' for arbitrary values.
 */
export function pxToTailwindSpacing(px: number): string {
  if (PX_TO_SCALE.has(px)) return PX_TO_SCALE.get(px)!;
  return `[${px}px]`;
}

// Border radius mapping px → class suffix
const BORDER_RADIUS_MAP: Array<[number, string]> = [
  [0, 'none'],
  [2, 'sm'],
  [4, ''],
  [6, 'md'],
  [8, 'lg'],
  [12, 'xl'],
  [16, '2xl'],
  [24, '3xl'],
  [9999, 'full'],
];

function pxToBorderRadius(px: number): string {
  for (const [val, suffix] of BORDER_RADIUS_MAP) {
    if (px === val) return suffix === '' ? 'rounded' : `rounded-${suffix}`;
  }
  return `rounded-[${px}px]`;
}

// Font size mapping px → tailwind class
const FONT_SIZE_MAP: Record<number, string> = {
  12: 'text-xs',
  14: 'text-sm',
  16: 'text-base',
  18: 'text-lg',
  20: 'text-xl',
  24: 'text-2xl',
  30: 'text-3xl',
  36: 'text-4xl',
  48: 'text-5xl',
  60: 'text-6xl',
  72: 'text-7xl',
  96: 'text-8xl',
  128: 'text-9xl',
};

// Font weight mapping
const FONT_WEIGHT_MAP: Record<string, string> = {
  '100': 'font-thin',
  '200': 'font-extralight',
  '300': 'font-light',
  '400': 'font-normal',
  '500': 'font-medium',
  '600': 'font-semibold',
  '700': 'font-bold',
  '800': 'font-extrabold',
  '900': 'font-black',
};

// Display value to tailwind class
const DISPLAY_MAP: Record<string, string> = {
  flex: 'flex',
  grid: 'grid',
  block: 'block',
  'inline-block': 'inline-block',
  inline: 'inline',
  'inline-flex': 'inline-flex',
  'inline-grid': 'inline-grid',
  none: 'hidden',
  table: 'table',
  'table-row': 'table-row',
  'table-cell': 'table-cell',
};

const SPACING_TOKEN = '(?:\\d+(?:\\.\\d+)?|px|\\[.*?\\])';

/**
 * For each CSS property, a predicate that identifies *whole* class tokens which
 * this property owns. Removing those tokens before appending the new one keeps
 * the class list consistent without touching unrelated utilities.
 */
const PROPERTY_TOKEN_MATCHERS: Record<string, RegExp> = {
  padding: new RegExp(`^p-${SPACING_TOKEN}$`),
  paddingTop: new RegExp(`^pt-${SPACING_TOKEN}$`),
  paddingBottom: new RegExp(`^pb-${SPACING_TOKEN}$`),
  paddingLeft: new RegExp(`^pl-${SPACING_TOKEN}$`),
  paddingRight: new RegExp(`^pr-${SPACING_TOKEN}$`),

  margin: new RegExp(`^m-${SPACING_TOKEN}$`),
  marginTop: new RegExp(`^mt-${SPACING_TOKEN}$`),
  marginBottom: new RegExp(`^mb-${SPACING_TOKEN}$`),
  marginLeft: new RegExp(`^ml-${SPACING_TOKEN}$`),
  marginRight: new RegExp(`^mr-${SPACING_TOKEN}$`),

  // Only colour-and-shade utilities, never `bg-gradient-*`, `bg-clip-*`, `bg-cover`.
  backgroundColor:
    /^bg-(?:transparent|current|inherit|black|white|\[.*?\]|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{1,3})?(?:\/\d{1,3})?)$/,

  // Same rule for text colour; requires a colour name/shade or arbitrary value.
  color:
    /^text-(?:transparent|current|inherit|black|white|\[.*?\]|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{1,3})?(?:\/\d{1,3})?)$/,

  fontSize: /^text-(?:xs|sm|base|lg|xl|[2-9]xl|\[.*?\])$/,
  fontWeight: /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[.*?\])$/,
  lineHeight: /^leading-(?:none|tight|snug|normal|relaxed|loose|\d+|\[.*?\])$/,
  letterSpacing: /^tracking-(?:tighter|tight|normal|wide|wider|widest|\[.*?\])$/,
  textAlign: /^text-(?:left|center|right|justify|start|end)$/,

  borderRadius:
    /^rounded(?:-(?:none|sm|md|lg|xl|2xl|3xl|full|\[.*?\]))?$/,

  width: /^w-(?:\d+(?:\.\d+)?|px|auto|full|screen|min|max|fit|\[.*?\])$/,
  height: /^h-(?:\d+(?:\.\d+)?|px|auto|full|screen|min|max|fit|\[.*?\])$/,

  opacity: /^opacity-(?:\d+|\[.*?\])$/,

  display:
    /^(?:block|inline-block|inline|flex|inline-flex|grid|inline-grid|table|table-row|table-cell|hidden)$/,

  gap: new RegExp(`^gap-${SPACING_TOKEN}$`),

  flexDirection: /^flex-(?:row|row-reverse|col|col-reverse)$/,
  alignItems: /^items-(?:start|end|center|baseline|stretch)$/,
  justifyContent:
    /^justify-(?:start|end|center|between|around|evenly|stretch)$/,

  position: /^(?:static|fixed|absolute|relative|sticky)$/,
  overflow:
    /^overflow-(?:auto|hidden|clip|visible|scroll|x-auto|y-auto|x-hidden|y-hidden|\[.*?\])$/,

  borderWidth: /^border(?:-[trblxy])?(?:-\d+|\[\d+px\])?$/,
  borderColor:
    /^border-(?:transparent|current|inherit|black|white|\[.*?\]|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{1,3})?(?:\/\d{1,3})?)$/,

  boxShadow:
    /^shadow(?:-(?:none|sm|md|lg|xl|2xl|inner|\[.*?\]))?$/,

  backgroundImage: /^bg-(?:none|gradient-to-[trbl]|\[.*?\])$/,
  backdropFilter: /^backdrop-(?:none|blur|blur-(?:sm|md|lg|xl|2xl|3xl)|\[.*?\])$/,
};

/**
 * Properties that the class-based transformer can express. Anything else must be
 * written as an inline style rather than silently dropped.
 */
export function canMapToTailwind(property: string): boolean {
  return property in PROPERTY_TOKEN_MATCHERS || property in CASE_HANDLERS;
}

function parsePxValue(value: string): number | null {
  const match = value.match(/^(-?[\d.]+)px$/);
  if (match) return parseFloat(match[1]!);
  const num = parseFloat(value);
  if (!isNaN(num)) return num;
  return null;
}

function colorToTailwind(property: string, value: string): string {
  const prefix = property === 'backgroundColor' ? 'bg' : 'text';
  const namedMap: Record<string, string> = {
    white: `${prefix}-white`,
    black: `${prefix}-black`,
    transparent: `${prefix}-transparent`,
    inherit: `${prefix}-inherit`,
    current: `${prefix}-current`,
  };
  if (namedMap[value.toLowerCase()]) return namedMap[value.toLowerCase()]!;

  // Tailwind arbitrary values cannot contain bare spaces.
  const cleaned = value.replace(/\s+/g, '').replace(/,/g, ',');
  return `${prefix}-[${cleaned}]`;
}

type Handler = (value: string, pxVal: number | null) => string | null;

const CASE_HANDLERS: Record<string, Handler> = {
  padding: (v, px) => `p-${px !== null ? pxToTailwindSpacing(px) : `[${v}]`}`,
  paddingTop: (v, px) => `pt-${px !== null ? pxToTailwindSpacing(px) : `[${v}]`}`,
  paddingBottom: (v, px) => `pb-${px !== null ? pxToTailwindSpacing(px) : `[${v}]`}`,
  paddingLeft: (v, px) => `pl-${px !== null ? pxToTailwindSpacing(px) : `[${v}]`}`,
  paddingRight: (v, px) => `pr-${px !== null ? pxToTailwindSpacing(px) : `[${v}]`}`,
  margin: (v, px) => `m-${px !== null ? pxToTailwindSpacing(px) : `[${v}]`}`,
  marginTop: (v, px) => `mt-${px !== null ? pxToTailwindSpacing(px) : `[${v}]`}`,
  marginBottom: (v, px) => `mb-${px !== null ? pxToTailwindSpacing(px) : `[${v}]`}`,
  marginLeft: (v, px) => `ml-${px !== null ? pxToTailwindSpacing(px) : `[${v}]`}`,
  marginRight: (v, px) => `mr-${px !== null ? pxToTailwindSpacing(px) : `[${v}]`}`,

  backgroundColor: (v) => colorToTailwind('backgroundColor', v),
  color: (v) => colorToTailwind('color', v),

  fontSize: (v, px) => (px !== null && FONT_SIZE_MAP[px] ? FONT_SIZE_MAP[px]! : `text-[${v}]`),
  fontWeight: (v) =>
    FONT_WEIGHT_MAP[v] || FONT_WEIGHT_MAP[String(parseInt(v, 10))] || `font-[${v}]`,
  lineHeight: (v) => `leading-[${v}]`,
  letterSpacing: (v) => `tracking-[${v}]`,
  textAlign: (v) => {
    const alignMap: Record<string, string> = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify',
      start: 'text-start',
      end: 'text-end',
    };
    return alignMap[v] ?? `text-${v}`;
  },

  borderRadius: (v, px) => (px !== null ? pxToBorderRadius(px) : `rounded-[${v}]`),

  width: (v, px) => {
    if (v === 'auto') return 'w-auto';
    if (v === '100%') return 'w-full';
    if (px !== null) return `w-${pxToTailwindSpacing(px)}`;
    return `w-[${v}]`;
  },
  height: (v, px) => {
    if (v === 'auto') return 'h-auto';
    if (v === '100%') return 'h-full';
    if (px !== null) return `h-${pxToTailwindSpacing(px)}`;
    return `h-[${v}]`;
  },

  opacity: (v) => {
    const opacityVal = parseFloat(v);
    return !isNaN(opacityVal) ? `opacity-${Math.round(opacityVal * 100)}` : `opacity-[${v}]`;
  },

  display: (v) => DISPLAY_MAP[v] ?? v,

  gap: (v, px) => `gap-${px !== null ? pxToTailwindSpacing(px) : `[${v}]`}`,

  flexDirection: (v) => {
    const dirMap: Record<string, string> = {
      row: 'flex-row',
      column: 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'column-reverse': 'flex-col-reverse',
    };
    return dirMap[v] ?? `flex-${v}`;
  },
  alignItems: (v) => {
    const aiMap: Record<string, string> = {
      'flex-start': 'items-start',
      'flex-end': 'items-end',
      center: 'items-center',
      baseline: 'items-baseline',
      stretch: 'items-stretch',
    };
    return aiMap[v] ?? `items-${v}`;
  },
  justifyContent: (v) => {
    const jcMap: Record<string, string> = {
      'flex-start': 'justify-start',
      'flex-end': 'justify-end',
      center: 'justify-center',
      'space-between': 'justify-between',
      'space-around': 'justify-around',
      'space-evenly': 'justify-evenly',
      stretch: 'justify-stretch',
    };
    return jcMap[v] ?? `justify-${v}`;
  },

  position: (v) => v,

  overflow: (v) => {
    const overflowMap: Record<string, string> = {
      auto: 'overflow-auto',
      hidden: 'overflow-hidden',
      visible: 'overflow-visible',
      scroll: 'overflow-scroll',
    };
    return overflowMap[v] ?? `overflow-[${v}]`;
  },

  borderWidth: (v, px) => {
    if (px === null) return `border-[${v}]`;
    if (px === 0) return 'border-0';
    if (px === 1) return 'border';
    const scale: Record<number, string> = { 2: 'border-2', 4: 'border-4', 8: 'border-8' };
    return scale[px] ?? `border-[${px}px]`;
  },
  borderColor: (v) => {
    const named: Record<string, string> = {
      transparent: 'border-transparent',
      current: 'border-current',
      inherit: 'border-inherit',
      black: 'border-black',
      white: 'border-white',
    };
    return named[v.toLowerCase()] ?? `border-[${v.replace(/\s+/g, '')}]`;
  },
  boxShadow: (v) => (v === 'none' ? 'shadow-none' : `shadow-[${v.replace(/\s+/g, '_')}]`),

  backgroundImage: (v) => {
    if (v === 'none') return 'bg-none';
    return `bg-[image:${v.replace(/\s+/g, '_')}]`;
  },
  backdropFilter: (v) => {
    const blur = v.match(/^blur\((\d+(?:\.\d+)?)px\)$/);
    if (!blur) return null;
    const px = parseFloat(blur[1]!);
    const scale: Record<number, string> = {
      4: 'sm',
      8: 'md',
      12: 'lg',
      16: 'xl',
      24: '2xl',
      40: '3xl',
    };
    const suffix = scale[px];
    // Only emit a class for values on Tailwind's blur scale; arbitrary blur
    // values are not expressible as `backdrop-[…]` and must be inline styles.
    return suffix ? `backdrop-blur-${suffix}` : null;
  },
};

/**
 * Replaces or adds the appropriate tailwind class for a given CSS property/value
 * pair. Returns the modified className string, or `null` when the property has no
 * Tailwind representation (callers should fall back to inline styles).
 */
export function transformTailwindClass(
  className: string,
  property: string,
  value: string,
): string | null {
  const handler = CASE_HANDLERS[property];
  if (!handler) return null;

  const matcher = PROPERTY_TOKEN_MATCHERS[property];
  const tokens = className.trim().split(/\s+/).filter(Boolean);

  const kept = matcher ? tokens.filter((token) => !matcher.test(token)) : tokens;

  const pxVal = parsePxValue(value);
  const newClass = handler(value, pxVal);
  if (!newClass) return null;

  // Only remove the new class's own token if it would duplicate.
  const withoutDuplicate = kept.filter((token) => token !== newClass);
  return [...withoutDuplicate, newClass].join(' ').trim();
}
