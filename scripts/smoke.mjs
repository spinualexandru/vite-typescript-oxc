import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(
  path.join(os.tmpdir(), 'create-vite-oxc-smoke-'),
)
const packageManager = JSON.parse(
  await readFile(path.join(root, 'package.json'), 'utf8'),
).packageManager

function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    // A publish dry run must still create and install our temporary test tarball.
    env: { ...process.env, npm_config_dry_run: 'false' },
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    timeout: 180_000,
  })
  if (result.error) throw result.error
  if (result.status !== 0)
    throw new Error(
      `${command} ${args.join(' ')} failed: ${result.stderr || result.status}`,
    )
  return result.stdout
}

function pnpm(args, cwd) {
  if (process.env.npm_execpath?.includes('pnpm')) {
    if (/\.[cm]?js$/.test(process.env.npm_execpath)) {
      return run(process.execPath, [process.env.npm_execpath, ...args], cwd)
    }
    return run(process.env.npm_execpath, args, cwd)
  }
  return run('npx', ['--yes', packageManager, ...args], cwd)
}

try {
  const output = JSON.parse(
    run(
      'npm',
      ['pack', '--ignore-scripts', '--json', '--pack-destination', temporary],
      root,
      true,
    ),
  )
  const packed = Array.isArray(output) ? output[0] : Object.values(output)[0]
  const files = packed.files.map((entry) => entry.path)
  for (const required of [
    'bin/create.mjs',
    'template/_gitignore',
    'template/.oxlintrc.json',
    'template/.oxfmtrc.json',
    'template/public/favicon.svg',
    'LICENSE',
  ]) {
    assert.ok(files.includes(required), `Missing packed file: ${required}`)
  }
  assert.ok(
    !files.some((file) =>
      /(^|\/)(node_modules|dist|test|scripts|\.github)\//.test(file),
    ),
  )

  // Install the tarball so this checks npm's bin mapping, not just source code.
  run(
    'npm',
    [
      'install',
      '--prefix',
      temporary,
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      path.join(temporary, packed.filename),
    ],
    temporary,
  )
  run(
    'npm',
    ['exec', '--offline', '--', 'create-vite-typescript-oxc', '--help'],
    temporary,
  )
  pnpm(['dlx', path.join(temporary, packed.filename), 'smoke-app'], temporary)
  const app = path.join(temporary, 'smoke-app')
  const metadata = JSON.parse(
    await readFile(path.join(app, 'package.json'), 'utf8'),
  )
  assert.equal(metadata.name, 'smoke-app')
  assert.equal(metadata.private, true)
  assert.ok((await readdir(app)).includes('.gitignore'))
  pnpm(['install'], app)
  for (const script of ['typecheck', 'lint', 'fmt:check', 'build']) {
    pnpm(['run', script], app)
  }
  assert.ok(
    (await readFile(path.join(app, 'dist/index.html'), 'utf8')).includes(
      '<title>smoke-app</title>',
    ),
  )
  console.log('\nPacked generator and generated app passed the smoke test.')
} finally {
  await rm(temporary, { recursive: true, force: true })
}
