/**
 * DeepSeek API 原始响应诊断 — 逐层检查 API 返回结构
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_URL = process.env.MODERATION_API_URL!;
const API_KEY = process.env.MODERATION_API_KEY!;
const MODEL = process.env.MODERATION_MODEL || 'deepseek-chat';

const SYSTEM_PROMPT = `你是内容安全哨兵。你的唯一功能是判断输入文本是否违规。
你只能回复一个字符：0 或 1。0 = 安全，1 = 违规。
绝对不要输出：空格、换行、标点、解释、表情、任何其他文字。`;

async function testAPI(text: string, label: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${label}`);
  console.log(`INPUT: ${text.slice(0, 80)}`);
  console.log(`${'='.repeat(60)}`);

  const t0 = Date.now();

  // Test 1: max_tokens=1 (current config)
  console.log('\n--- Request with max_tokens=1 ---');
  const body1 = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    temperature: 0,
    max_tokens: 1,
  };

  const res1 = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body1),
  });
  const json1: any = await res1.json();
  console.log(`HTTP ${res1.status} (${Date.now() - t0}ms)`);
  console.log('Full response structure:');
  console.log(JSON.stringify(json1, null, 2));

  // Check all possible output locations
  const choice = json1?.choices?.[0];
  console.log('\nOutput extraction:');
  console.log('  message.content:', JSON.stringify(choice?.message?.content));
  console.log('  message.reasoning_content:', JSON.stringify(choice?.message?.reasoning_content));
  console.log('  message.role:', choice?.message?.role);
  console.log('  finish_reason:', choice?.finish_reason);
  if (choice?.message) {
    console.log('  message keys:', Object.keys(choice.message));
  }

  // Test 2: max_tokens=10 (more tokens to see if model wants to output more)
  console.log('\n--- Request with max_tokens=10 ---');
  const body2 = { ...body1, max_tokens: 10 };
  const res2 = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body2),
  });
  const json2: any = await res2.json();
  console.log(`HTTP ${res2.status} (${Date.now() - t0}ms)`);
  const choice2 = json2?.choices?.[0];
  console.log('  message.content:', JSON.stringify(choice2?.message?.content));
  console.log('  finish_reason:', choice2?.finish_reason);

  // Test 3: Without max_tokens (model can output freely)
  console.log('\n--- Request WITHOUT max_tokens ---');
  const body3 = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    temperature: 0,
  };
  const res3 = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body3),
  });
  const json3: any = await res3.json();
  console.log(`HTTP ${res3.status} (${Date.now() - t0}ms)`);
  const choice3 = json3?.choices?.[0];
  console.log('  message.content:', JSON.stringify(choice3?.message?.content));
  console.log('  finish_reason:', choice3?.finish_reason);
}

async function main() {
  console.log(`API: ${API_URL}`);
  console.log(`MODEL: ${MODEL}`);
  console.log(`KEY: ${API_KEY.slice(0, 8)}...`);

  await testAPI('你好，这本书还在吗', 'SAFE - normal text');
  await testAPI('加我微信看片 +V XXXXX 每天更新 质量很高', 'VIOLATION - obvious spam');

  console.log('\n\n=== ALL TESTS COMPLETE ===');
}

main().catch(e => console.error('FATAL:', e));
