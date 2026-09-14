// Tailwind class mapping utilities

// Tailwind spacing scale px values
const TAILWIND_SPACING: Record<string, number> = {
  '0': 0,
  'px': 1,
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
  Object.entries(TAILWIND_SPACING).map(([k, v]) => [v, k])
);

/**
 * Convert a pixel value to a Tailwind spacing scale key.
 * Returns e.g. '6' for 24px, or '[24px]' for arbitrary values.
 */
export function pxToTailwindSpacing(px: number): string {
  if (PX_TO_SCALE.has(px)) {
    return PX_TO_SCALE.get(px)!;
  }
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
    if (px === val) {
      return suffix === '' ? 'rounded' : `rounded-${suffix}`;
    }
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
  'table': 'table',
  'table-row': 'table-row',
  'table-cell': 'table-cell',
};

// Regex patterns to find and remove existing tailwind classes for each property
const PROPERTY_PATTERNS: Record<string, RegExp> = {
  padding: /\bp-(\d+(\.\d+)?|\[.*?\])\b/g,
  paddingTop: /\bpt-(\d+(\.\d+)?|\[.*?\])\b/g,
  paddingBottom: /\bpb-(\d+(\.\d+)?|\[.*?\])\b/g,
  paddingLeft: /\bpl-(\d+(\.\d+)?|\[.*?\])\b/g,
  paddingRight: /\bpr-(\d+(\.\d+)?|\[.*?\])\b/g,
  paddingX: /\bpx-(\d+(\.\d+)?|\[.*?\])\b/g,
  paddingY: /\bpy-(\d+(\.\d+)?|\[.*?\])\b/g,
  margin: /\bm-(\d+(\.\d+)?|\[.*?\])\b/g,
  marginTop: /\bmt-(\d+(\.\d+)?|\[.*?\])\b/g,
  marginBottom: /\bmb-(\d+(\.\d+)?|\[.*?\])\b/g,
  marginLeft: /\bml-(\d+(\.\d+)?|\[.*?\])\b/g,
  marginRight: /\bmr-(\d+(\.\d+)?|\[.*?\])\b/g,
  marginX: /\bmx-(\d+(\.\d+)?|\[.*?\])\b/g,
  marginY: /\bmy-(\d+(\.\d+)?|\[.*?\])\b/g,
  backgroundColor: /\bbg-[a-zA-Z0-9_/\-.\[\]#%]+/g,
  color: /\btext-(?:(?:inherit|current|transparent|black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+|(?:inherit|current|transparent|black|white)|\[.*?\])/g,
  fontSize: /\btext-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|\[.*?\])\b/g,
  fontWeight: /\bfont-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[.*?\])\b/g,
  lineHeight: /\bleading-(?:none|tight|snug|normal|relaxed|loose|\d+|\[.*?\])\b/g,
  letterSpacing: /\btracking-(?:tighter|tight|normal|wide|wider|widest|\[.*?\])\b/g,
  textAlign: /\btext-(?:left|center|right|justify|start|end)\b/g,
  borderRadius: /\brounded(?:-(?:none|sm|md|lg|xl|2xl|3xl|full|\[.*?\]))?\b/g,
  width: /\bw-(?:\d+(\.\d+)?|auto|full|screen|min|max|fit|\[.*?\])\b/g,
  height: /\bh-(?:\d+(\.\d+)?|auto|full|screen|min|max|fit|\[.*?\])\b/g,
  opacity: /\bopacity-(?:\d+|\[.*?\])\b/g,
  display: /\b(?:block|inline-block|inline|flex|inline-flex|grid|inline-grid|table|hidden)\b/g,
  gap: /\bgap-(?:\d+(\.\d+)?|\[.*?\])\b/g,
  flexDirection: /\bflex-(?:row|col|row-reverse|col-reverse)\b/g,
  alignItems: /\bitems-(?:start|end|center|baseline|stretch)\b/g,
  justifyContent: /\bjustify-(?:start|end|center|between|around|evenly|stretch)\b/g,
  position: /\b(?:static|fixed|absolute|relative|sticky)\b/g,
  overflow: /\boverflow-(?:auto|hidden|clip|visible|scroll|x-auto|y-auto|x-hidden|y-hidden|\[.*?\])\b/g,
};

function parsePxValue(value: string): number | null {
  const match = value.match(/^([\d.]+)px$/);
  if (match) return parseFloat(match[1]!);
  const num = parseFloat(value);
  if (!isNaN(num)) return num;
  return null;
}

function colorToTailwind(property: string, value: string): string {
  // For named colors or hex, use arbitrary value
  const prefix = property === 'backgroundColor' ? 'bg' : 'text';
  // Clean up color value for class name
  const cleaned = value.replace(/\s+/g, '').replace('#', '#');
  if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
    return `${prefix}-[${cleaned}]`;
  }
  // Named color mapping attempts (basic)
  const namedMap: Record<string, string> = {
    white: `${prefix}-white`,
    black: `${prefix}-black`,
    transparent: `${prefix}-transparent`,
    inherit: `${prefix}-inherit`,
    current: `${prefix}-current`,
  };
  if (namedMap[value.toLowerCase()]) return namedMap[value.toLowerCase()]!;
  return `${prefix}-[${cleaned}]`;
}

/**
 * Replaces or adds the appropriate tailwind class for a given CSS property/value pair.
 * Returns the modified className string.
 */
export function transformTailwindClass(
  className: string,
  property: string,
  value: string,
): string {
  let classes = className.trim();

  // Remove existing classes for this property
  const pattern = PROPERTY_PATTERNS[property];
  if (pattern) {
    pattern.lastIndex = 0;
    classes = classes.replace(pattern, '').replace(/\s+/g, ' ').trim();
  }

  // Determine new class to add
  let newClass = '';

  const pxVal = parsePxValue(value);

  switch (property) {
    case 'padding':
      newClass = `p-${pxVal !== null ? pxToTailwindSpacing(pxVal) : `[${value}]`}`;
      break;
    case 'paddingTop':
      newClass = `pt-${pxVal !== null ? pxToTailwindSpacing(pxVal) : `[${value}]`}`;
      break;
    case 'paddingBottom':
      newClass = `pb-${pxVal !== null ? pxToTailwindSpacing(pxVal) : `[${value}]`}`;
      break;
    case 'paddingLeft':
      newClass = `pl-${pxVal !== null ? pxToTailwindSpacing(pxVal) : `[${value}]`}`;
      break;
    case 'paddingRight':
      newClass = `pr-${pxVal !== null ? pxToTailwindSpacing(pxVal) : `[${value}]`}`;
      break;
    case 'margin':
      newClass = `m-${pxVal !== null ? pxToTailwindSpacing(pxVal) : `[${value}]`}`;
      break;
    case 'marginTop':
      newClass = `mt-${pxVal !== null ? pxToTailwindSpacing(pxVal) : `[${value}]`}`;
      break;
    case 'marginBottom':
      newClass = `mb-${pxVal !== null ? pxToTailwindSpacing(pxVal) : `[${value}]`}`;
      break;
    case 'marginLeft':
      newClass = `ml-${pxVal !== null ? pxToTailwindSpacing(pxVal) : `[${value}]`}`;
      break;
    case 'marginRight':
      newClass = `mr-${pxVal !== null ? pxToTailwindSpacing(pxVal) : `[${value}]`}`;
      break;
    case 'backgroundColor':
      newClass = colorToTailwind('backgroundColor', value);
      break;
    case 'color':
      newClass = colorToTailwind('color', value);
      break;
    case 'fontSize': {
      const px = pxVal !== null ? pxVal : null;
      if (px !== null && FONT_SIZE_MAP[px]) {
        newClass = FONT_SIZE_MAP[px]!;
      } else {
        newClass = `text-[${value}]`;
      }
      break;
    }
    case 'fontWeight': {
      const mapped = FONT_WEIGHT_MAP[value] || FONT_WEIGHT_MAP[String(parseInt(value))] || `font-[${value}]`;
      newClass = mapped;
      break;
    }
    case 'lineHeight':
      newClass = `leading-[${value}]`;
      break;
    case 'letterSpacing':
      newClass = `tracking-[${value}]`;
      break;
    case 'textAlign': {
      const alignMap: Record<string, string> = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
        justify: 'text-justify',
        start: 'text-start',
        end: 'text-end',
      };
      newClass = alignMap[value] || `text-${value}`;
      break;
    }
    case 'borderRadius':
      newClass = pxVal !== null ? pxToBorderRadius(pxVal) : `rounded-[${value}]`;
      break;
    case 'width':
      if (value === 'auto') newClass = 'w-auto';
      else if (value === '100%') newClass = 'w-full';
      else if (pxVal !== null) newClass = `w-${pxToTailwindSpacing(pxVal)}`;
      else newClass = `w-[${value}]`;
      break;
    case 'height':
      if (value === 'auto') newClass = 'h-auto';
      else if (value === '100%') newClass = 'h-full';
      else if (pxVal !== null) newClass = `h-${pxToTailwindSpacing(pxVal)}`;
      else newClass = `h-[${value}]`;
      break;
    case 'opacity': {
      const opacityVal = parseFloat(value);
      if (!isNaN(opacityVal)) {
        newClass = `opacity-${Math.round(opacityVal * 100)}`;
      } else {
        newClass = `opacity-[${value}]`;
      }
      break;
    }
    case 'display': {
      newClass = DISPLAY_MAP[value] || value;
      break;
    }
    case 'gap':
      newClass = `gap-${pxVal !== null ? pxToTailwindSpacing(pxVal) : `[${value}]`}`;
      break;
    case 'flexDirection': {
      const dirMap: Record<string, string> = {
        row: 'flex-row',
        column: 'flex-col',
        'row-reverse': 'flex-row-reverse',
        'column-reverse': 'flex-col-reverse',
      };
      newClass = dirMap[value] || `flex-${value}`;
      break;
    }
    case 'alignItems': {
      const aiMap: Record<string, string> = {
        'flex-start': 'items-start',
        'flex-end': 'items-end',
        center: 'items-center',
        baseline: 'items-baseline',
        stretch: 'items-stretch',
      };
      newClass = aiMap[value] || `items-${value}`;
      break;
    }
    case 'justifyContent': {
      const jcMap: Record<string, string> = {
        'flex-start': 'justify-start',
        'flex-end': 'justify-end',
        center: 'justify-center',
        'space-between': 'justify-between',
        'space-around': 'justify-around',
        'space-evenly': 'justify-evenly',
        stretch: 'justify-stretch',
      };
      newClass = jcMap[value] || `justify-${value}`;
      break;
    }
    case 'position': {
      newClass = value; // static, fixed, absolute, relative, sticky — all map directly
      break;
    }
    case 'overflow': {
      const overflowMap: Record<string, string> = {
        auto: 'overflow-auto',
        hidden: 'overflow-hidden',
        visible: 'overflow-visible',
        scroll: 'overflow-scroll',
      };
      newClass = overflowMap[value] || `overflow-[${value}]`;
      break;
    }
    default:
      // Arbitrary value fallback — can't map it, return unchanged
      return classes;
  }

  if (newClass) {
    classes = classes ? `${classes} ${newClass}` : newClass;
  }

  return classes;
}
