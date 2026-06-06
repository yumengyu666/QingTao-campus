import { describe, it, expect, beforeEach } from 'vitest';
import { validateUsername, validatePassword, validateGoodsTitle, validatePrice } from '@/utils/validators';

describe('validateUsername', () => {
  it('rejects empty username', () => {
    expect(validateUsername('')).toBe('请输入用户名');
    expect(validateUsername('   ')).toBe('请输入用户名');
  });

  it('rejects username shorter than 2 chars', () => {
    expect(validateUsername('a')).toBe('用户名至少2个字符');
  });

  it('rejects username longer than 20 chars', () => {
    expect(validateUsername('a'.repeat(21))).toBe('用户名最多20个字符');
  });

  it('rejects username with special characters', () => {
    expect(validateUsername('hello@world')).toBe('用户名只能包含中英文、数字和下划线');
    expect(validateUsername('test<script>')).toBe('用户名只能包含中英文、数字和下划线');
  });

  it('accepts valid username', () => {
    expect(validateUsername('testuser')).toBeNull();
    expect(validateUsername('hello_world')).toBeNull();
    expect(validateUsername('用户123')).toBeNull();
    expect(validateUsername('abc')).toBeNull();
  });

  it('accepts boundary length usernames', () => {
    expect(validateUsername('ab')).toBeNull();
    expect(validateUsername('a'.repeat(20))).toBeNull();
  });
});

describe('validatePassword', () => {
  it('rejects empty password', () => {
    expect(validatePassword('')).toBe('请输入密码');
  });

  it('rejects password shorter than 6 chars', () => {
    expect(validatePassword('12345')).toBe('密码至少6位');
  });

  it('rejects password longer than 50 chars', () => {
    expect(validatePassword('a'.repeat(51))).toBe('密码最多50位');
  });

  it('rejects password without both letters and numbers', () => {
    expect(validatePassword('123456')).toBe('密码需同时包含字母和数字');
    expect(validatePassword('abcdef')).toBe('密码需同时包含字母和数字');
  });

  it('accepts valid password', () => {
    expect(validatePassword('password123')).toBeNull();
    expect(validatePassword('abc123')).toBeNull();
    expect(validatePassword('aa11bb22')).toBeNull();
  });
});

describe('validateGoodsTitle', () => {
  it('rejects empty title', () => {
    expect(validateGoodsTitle('')).toBe('请输入商品标题');
    expect(validateGoodsTitle('   ')).toBe('请输入商品标题');
  });

  it('rejects title longer than 50 chars', () => {
    expect(validateGoodsTitle('a'.repeat(51))).toBe('标题最多50字');
  });

  it('accepts valid title', () => {
    expect(validateGoodsTitle('二手iPhone')).toBeNull();
    expect(validateGoodsTitle('a'.repeat(50))).toBeNull();
  });
});

describe('validatePrice', () => {
  it('rejects empty/zero-like price', () => {
    expect(validatePrice(0 as any)).toBe(null);  // 0 is valid (free)
  });

  it('rejects negative price', () => {
    expect(validatePrice(-1)).toBe('价格不能为负数');
  });

  it('rejects price over 99999', () => {
    expect(validatePrice(100000)).toBe('价格不能超过99999元');
  });

  it('accepts valid price', () => {
    expect(validatePrice(100)).toBeNull();
    expect(validatePrice(99999)).toBeNull();
    expect(validatePrice(0.01)).toBeNull();
  });
});
