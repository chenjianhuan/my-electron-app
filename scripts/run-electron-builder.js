#!/usr/bin/env node

const { spawnSync } = require('child_process');

const rawArgs = process.argv.slice(2);
const includeEmbeddedAiModels = rawArgs.includes('--with-ai-models');
const builderArgs = rawArgs.filter((arg) => arg !== '--with-ai-models');
const platformMap = new Map([
  ['--mac', 'darwin'],
  ['--win', 'win32'],
  ['--linux', 'linux'],
]);

const targetPlatforms = builderArgs
  .filter((arg) => platformMap.has(arg))
  .map((arg) => platformMap.get(arg));

function runBuilder(args, ortPlatform) {
  const finalArgs = [...args, '--config', 'scripts/electron-builder.config.js'];
  const result = spawnSync(
    process.execPath,
    [require.resolve('electron-builder/out/cli/cli.js'), ...finalArgs],
    {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: {
        ...process.env,
        MC_INCLUDE_AI_MODELS: includeEmbeddedAiModels ? '1' : '0',
        MC_ORT_PLATFORM: ortPlatform || '',
      },
    }
  );

  if (result.error) {
    throw result.error;
  }

  return result.status === null ? 1 : result.status;
}

if (targetPlatforms.length > 1) {
  for (const [flag, platformName] of platformMap.entries()) {
    if (!builderArgs.includes(flag)) continue;
    const exitCode = runBuilder(
      builderArgs.filter((arg) => !platformMap.has(arg) || arg === flag),
      platformName
    );
    if (exitCode !== 0) {
      process.exit(exitCode);
    }
  }
  process.exit(0);
}

process.exit(runBuilder(builderArgs, targetPlatforms[0] || ''));
