import { describe, it, expect } from 'vitest';

describe('Size Sorting Logic', () => {
  // Helper function to normalize size for sorting (same as in Products.tsx)
  const normalizeSize = (sizeStr: string): number => {
    if (!sizeStr) return 999; // Put empty sizes at the end
    
    // Remove whitespace
    const cleaned = sizeStr.trim();
    
    // Handle CM sizes (20CM → 20)
    if (cleaned.toUpperCase().includes('CM')) {
      const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
      return isNaN(num) ? 999 : num;
    }
    
    // Handle Kids sizes (10.5K → 10.5, treat as smaller than adult sizes)
    if (cleaned.toUpperCase().includes('K')) {
      const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
      return isNaN(num) ? 999 : num; // Kids sizes are typically smaller
    }
    
    // Regular numeric sizes
    const num = parseFloat(cleaned);
    return isNaN(num) ? 999 : num;
  };

  it('should normalize regular numeric sizes correctly', () => {
    expect(normalizeSize('20')).toBe(20);
    expect(normalizeSize('22')).toBe(22);
    expect(normalizeSize('23.5')).toBe(23.5);
    expect(normalizeSize('30')).toBe(30);
  });

  it('should normalize CM sizes correctly', () => {
    expect(normalizeSize('20CM')).toBe(20);
    expect(normalizeSize('21CM')).toBe(21);
    expect(normalizeSize('19.5 CM')).toBe(19.5);
    expect(normalizeSize('22 CM')).toBe(22);
  });

  it('should normalize Kids sizes correctly', () => {
    expect(normalizeSize('10.5K')).toBe(10.5);
    expect(normalizeSize('4.5K')).toBe(4.5);
    expect(normalizeSize('5.5K')).toBe(5.5);
  });

  it('should handle empty or invalid sizes', () => {
    expect(normalizeSize('')).toBe(999);
    expect(normalizeSize('invalid')).toBe(999);
  });

  it('should sort sizes from smallest to largest', () => {
    const sizes = ['30', '20CM', '10.5K', '22', '4.5K', '23.5', '21CM'];
    const normalized = sizes.map(normalizeSize);
    const sorted = [...normalized].sort((a, b) => a - b);
    
    // Expected order: 4.5K (4.5), 10.5K (10.5), 20CM (20), 21CM (21), 22, 23.5, 30
    expect(sorted).toEqual([4.5, 10.5, 20, 21, 22, 23.5, 30]);
  });

  it('should handle mixed format product sizes', () => {
    const products = [
      { sizes: ['30', '28', '27'] },
      { sizes: ['20CM', '21CM', '22 CM'] },
      { sizes: ['10.5K', '4.5K'] },
      { sizes: ['25', '26', '27'] },
    ];

    const getMinSize = (product: { sizes: string[] }) => {
      const normalized = product.sizes.map(normalizeSize);
      return Math.min(...normalized);
    };

    const sorted = [...products].sort((a, b) => getMinSize(a) - getMinSize(b));

    // Expected order: Kids (4.5), CM (20), Regular (25), Regular (27)
    expect(getMinSize(sorted[0])).toBe(4.5); // Kids sizes first
    expect(getMinSize(sorted[1])).toBe(20); // CM sizes
    expect(getMinSize(sorted[2])).toBe(25); // Regular
    expect(getMinSize(sorted[3])).toBe(27); // Regular
  });
});
