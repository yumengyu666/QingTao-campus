/**
 * 商品状态机 — 合法状态流转规则
 * 
 * pending  → approved  (AI审核通过/管理员通过)
 * pending  → rejected  (管理员拒绝)
 * pending  → offline   (AI审核违规下架)
 * approved → sold      (卖家标记已售)
 * approved → reserved  (卖家标记已订)
 * approved → offline   (管理员下架/AI违规)
 * sold     → (终态)
 * rejected → (终态)
 * offline  → approved  (申诉恢复/管理员恢复)
 */

const GOODS_TRANSITIONS: Record<string, string[]> = {
  pending:  ['approved', 'rejected', 'offline'],
  approved: ['sold', 'reserved', 'offline'],
  sold:     [],
  reserved: ['approved', 'sold'],
  rejected: [],
  offline:  ['approved'],
};

export function isValidGoodsTransition(from: string, to: string): boolean {
  const allowed = GOODS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function getGoodsAllowedTransitions(status: string): string[] {
  return GOODS_TRANSITIONS[status] || [];
}
