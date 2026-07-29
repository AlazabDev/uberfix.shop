#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';

function readProjectRef() {
  if (process.env.SUPABASE_PROJECT_REF?.trim()) {
    return process.env.SUPABASE_PROJECT_REF.trim();
  }

  const config = readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8');
  const match = config.match(/^project_id\s*=\s*"([a-z0-9]+)"/m);
  if (!match) {
    throw new Error('SUPABASE_PROJECT_REF غير موجود ولم يمكن قراءته من supabase/config.toml');
  }
  return match[1];
}

function run(command, args) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`فشل الأمر برمز خروج ${result.status}`);
  }
}

async function verifyHealth(projectRef) {
  const baseUrl = (process.env.SUPABASE_URL || `https://${projectRef}.supabase.co`).replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/functions/v1/gateway/health`, {
    headers: process.env.SUPABASE_ANON_KEY
      ? { apikey: process.env.SUPABASE_ANON_KEY }
      : undefined,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`فشل فحص gateway health (${response.status}): ${text}`);
  }

  console.log(`\n✓ Gateway health: ${text}`);
}

async function main() {
  const projectRef = readProjectRef();
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  console.log('UberFix — Module 01 deployment');
  console.log(`Project ref: ${projectRef}`);
  console.log('Functions: gateway, submit-public-request');

  run(npx, ['supabase', '--version']);
  run(npx, [
    'supabase', 'functions', 'deploy', 'gateway',
    '--project-ref', projectRef,
    '--no-verify-jwt',
  ]);
  run(npx, [
    'supabase', 'functions', 'deploy', 'submit-public-request',
    '--project-ref', projectRef,
    '--no-verify-jwt',
  ]);

  await verifyHealth(projectRef);

  console.log('\n✓ تم نشر Module 01 بنجاح.');
  console.log('الخطوة التالية: npm run test:e2e:module01');
}

main().catch((error) => {
  console.error(`\n✗ فشل النشر: ${error instanceof Error ? error.message : String(error)}`);
  console.error('تأكد من تنفيذ: npx supabase login');
  process.exit(1);
});
