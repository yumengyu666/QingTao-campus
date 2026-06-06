import { describe, it, expect } from 'vitest';
import { CAMPUS_MAP, CONDITION_COLORS, HOME_CATEGORIES, ALL_CATEGORIES } from '@/utils/constants';

describe('CAMPUS_MAP', () => {
  it('maps kexue to 科学校区', () => {
    expect(CAMPUS_MAP.kexue).toBe('科学校区');
  });

  it('maps dongfeng to 东风校区', () => {
    expect(CAMPUS_MAP.dongfeng).toBe('东风校区');
  });
});

describe('CONDITION_COLORS', () => {
  it('has entries for all conditions', () => {
    expect(CONDITION_COLORS).toHaveProperty('brand_new');
    expect(CONDITION_COLORS).toHaveProperty('like_new');
    expect(CONDITION_COLORS).toHaveProperty('used');
    expect(CONDITION_COLORS).toHaveProperty('worn');
  });
});

describe('HOME_CATEGORIES', () => {
  it('has exactly 8 categories', () => {
    expect(HOME_CATEGORIES).toHaveLength(8);
  });

  it('each category has id, name, icon', () => {
    for (const cat of HOME_CATEGORIES) {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('name');
      expect(cat).toHaveProperty('icon');
      expect(typeof cat.id).toBe('number');
      expect(typeof cat.name).toBe('string');
      expect(typeof cat.icon).toBe('string');
    }
  });
});

describe('ALL_CATEGORIES', () => {
  it('has at least 8 categories', () => {
    expect(ALL_CATEGORIES.length).toBeGreaterThanOrEqual(8);
  });

  it('includes all HOME_CATEGORIES at the start', () => {
    for (let i = 0; i < HOME_CATEGORIES.length; i++) {
      expect(ALL_CATEGORIES[i].id).toBe(HOME_CATEGORIES[i].id);
    }
  });
});
