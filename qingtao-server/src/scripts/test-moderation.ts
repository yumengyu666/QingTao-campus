import { aiModerate } from '../services/moderation.service';

async function test() {
  console.log('=== AI Moderation Diagnostic ===\n');

  console.log('Config:');
  console.log('  URL:', process.env.MODERATION_API_URL ? 'SET' : 'MISSING');
  console.log('  KEY:', process.env.MODERATION_API_KEY ? `SET (len=${process.env.MODERATION_API_KEY.length})` : 'MISSING');
  console.log('  MODEL:', process.env.MODERATION_MODEL || 'default');

  // Test 1
  console.log('\n--- Test 1: Clearly violative ---');
  try {
    const t1 = Date.now();
    const r1 = await aiModerate('加我微信看片 +V XXXXX');
    console.log('  Result:', r1, `(${Date.now() - t1}ms)`);
  } catch(e: any) { console.log('  ERROR:', e.message); }

  // Test 2
  console.log('\n--- Test 2: Variant bypass ---');
  try {
    const t2 = Date.now();
    const r2 = await aiModerate('加我薇信 看资原 每天更新');
    console.log('  Result:', r2, `(${Date.now() - t2}ms)`);
  } catch(e: any) { console.log('  ERROR:', e.message); }

  // Test 3
  console.log('\n--- Test 3: Safe text ---');
  try {
    const t3 = Date.now();
    const r3 = await aiModerate('你好这本书还在吗');
    console.log('  Result:', r3, `(${Date.now() - t3}ms)`);
  } catch(e: any) { console.log('  ERROR:', e.message); }

  console.log('\n=== Done ===');
  process.exit(0);
}

test();
