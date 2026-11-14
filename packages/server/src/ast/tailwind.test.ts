import { describe, it, expect } from 'vitest';
import { transformTailwindClass, canMapToTailwind, pxToTailwindSpacing } from './tailwind.js';

describe('pxToTailwindSpacing', () => {
  it('maps known scale values', () => {
    expect(pxToTailwindSpacing(0)).toBe('0');
    expect(pxToTailwindSpacing(4)).toBe('1');
    expect(pxToTailwindSpacing(24)).toBe('6');
  });

  it('falls back to arbitrary values', () => {
    expect(pxToTailwindSpacing(23)).toBe('[23px]');
  });
});

describe('transformTailwindClass', () => {
  it('replaces padding without touching compound utilities', () => {
    const result = transformTailwindClass('flex flex-col p-2 items-center', 'padding', '24px');
    expect(result).toBe('flex flex-col items-center p-6');
  });

  it('keeps flex-col when changing display', () => {
    const result = transformTailwindClass('flex flex-col items-center', 'display', 'grid');
    expect(result?.split(' ')).toContain('flex-col');
    expect(result?.split(' ')).toContain('grid');
    expect(result?.split(' ')).not.toContain('flex');
  });

  it('does not strip bg-gradient utilities when changing background colour', () => {
    const result = transformTailwindClass(
      'bg-gradient-to-r from-indigo-500 bg-gray-100',
      'backgroundColor',
      '#ff0000',
    );
    const tokens = result!.split(' ');
    expect(tokens).toContain('bg-gradient-to-r');
    expect(tokens).toContain('bg-[#ff0000]');
    expect(tokens).not.toContain('bg-gray-100');
  });

  it('does not strip text-sm when changing text colour', () => {
    const result = transformTailwindClass('text-sm text-gray-500', 'color', '#00ff00');
    const tokens = result!.split(' ');
    expect(tokens).toContain('text-sm');
    expect(tokens).toContain('text-[#00ff00]');
    expect(tokens).not.toContain('text-gray-500');
  });

  it('replaces font size without removing text colour', () => {
    const result = transformTailwindClass('text-gray-500 text-sm', 'fontSize', '24px');
    const tokens = result!.split(' ');
    expect(tokens).toContain('text-gray-500');
    expect(tokens).toContain('text-2xl');
    expect(tokens).not.toContain('text-sm');
  });

  it('supports backdrop-filter, box-shadow and border colours (glassmorphism)', () => {
    expect(canMapToTailwind('backdropFilter')).toBe(true);
    expect(canMapToTailwind('boxShadow')).toBe(true);
    expect(canMapToTailwind('borderColor')).toBe(true);
    expect(canMapToTailwind('borderWidth')).toBe(true);

    expect(transformTailwindClass('', 'backdropFilter', 'blur(16px)')).toBe('backdrop-blur-xl');
    expect(transformTailwindClass('', 'borderWidth', '1px')).toBe('border');
    expect(transformTailwindClass('', 'boxShadow', '0 8px 32px 0 rgba(0,0,0,0.37)')).toBe(
      'shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]',
    );
  });

  it('returns null for properties with no Tailwind representation', () => {
    expect(transformTailwindClass('', 'cursor', 'pointer')).toBeNull();
    expect(canMapToTailwind('cursor')).toBe(false);
  });
});
