import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function test() {
  const { aiModerate } = await import('../services/moderation.service');

  const texts = [
    '加我 薇信 haopian2024 每天更新 高质两资源',
    '加我薇信 看资原 每天更新',
    '有需要代做课程设计的可以联系我',
  ];

  for (const text of texts) {
    const t = Date.now();
    const r = await aiModerate(text);
    console.log(`[${r}] ${Date.now() - t}ms: ${text.slice(0, 60)}`);
  }
}
test();
