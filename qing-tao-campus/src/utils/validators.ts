export function validateUsername(username: string): string | null {
  if (!username.trim()) return '请输入用户名';
  if (username.length < 2) return '用户名至少2个字符';
  if (username.length > 20) return '用户名最多20个字符';
  if (!/^[a-zA-Z0-9_一-龥]+$/.test(username)) return '用户名只能包含中英文、数字和下划线';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return '请输入密码';
  if (password.length < 6) return '密码至少6位';
  if (password.length > 50) return '密码最多50位';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return '密码需同时包含字母和数字';
  return null;
}

export function validateGoodsTitle(title: string): string | null {
  if (!title.trim()) return '请输入商品标题';
  if (title.length > 50) return '标题最多50字';
  return null;
}

export function validatePrice(price: number): string | null {
  if (!price && price !== 0) return '请输入价格';
  if (price < 0) return '价格不能为负数';
  if (price > 99999) return '价格不能超过99999元';
  return null;
}
