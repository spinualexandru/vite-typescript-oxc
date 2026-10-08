import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const cli = fileURLToPath(new URL('../bin/create.mjs', import.meta.url))
const generator = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
)

async function temporary(t) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'create-vite-oxc-test-'),
  )
  t.after(() => rm(directory, { recursive: true, force: true }))
  return directory
}

function run(cwd, ...args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' })
}

test('creates a private app and includes hidden config and favicon', async (t) => {
  const cwd = await temporary(t)
  const result = run(cwd, 'My App')
  assert.equal(result.status, 0, result.stderr)
  const app = path.join(cwd, 'My App')
  const metadata = JSON.parse(
    await readFile(path.join(app, 'package.json'), 'utf8'),
  )
  assert.equal(metadata.name, 'my-app')
  assert.equal(metadata.private, true)
  assert.equal(metadata.bin, undefined)
  for (const file of [
    '.gitignore',
    '.oxlintrc.json',
    '.oxfmtrc.json',
    'public/favicon.svg',
    'README.md',
  ]) {
    assert.ok(await readFile(path.join(app, file), 'utf8'))
  }
  assert.ok(
    (await readFile(path.join(app, 'index.html'), 'utf8')).includes(
      '<title>my-app</title>',
    ),
  )
  assert.ok(!(await readdir(app)).includes('_gitignore'))
  assert.ok(!(await readdir(app)).includes('.npmignore'))
  assert.ok(!(await readdir(app)).includes('dist'))
  assert.ok(!(await readdir(app)).includes('node_modules'))
})

test('refuses to overwrite an existing file or nonempty directory', async (t) => {
  const cwd = await temporary(t)
  await writeFile(path.join(cwd, 'keep.txt'), 'keep me')
  assert.equal(run(cwd, '.').status, 1)
  assert.equal(run(cwd, 'keep.txt').status, 1)
  assert.equal(await readFile(path.join(cwd, 'keep.txt'), 'utf8'), 'keep me')
  assert.deepEqual(await readdir(cwd), ['keep.txt'])
})

test('refuses a symlink destination', async (t) => {
  const cwd = await temporary(t)
  const target = await temporary(t)
  await symlink(target, path.join(cwd, 'linked'), 'dir')
  assert.equal(run(cwd, 'linked').status, 1)
  assert.deepEqual(await readdir(target), [])
})

test('supports an empty current directory and a noninteractive default', async (t) => {
  const cwd = await temporary(t)
  assert.equal(run(cwd, '.').status, 0)
  const other = await temporary(t)
  assert.equal(run(other).status, 0)
  assert.ok((await readdir(other)).includes('vite-typescript-oxc-app'))
})

test('help, version, and invalid arguments do not create files', async (t) => {
  const cwd = await temporary(t)
  assert.match(run(cwd, '--help').stdout, /Usage:/)
  assert.equal(run(cwd, '--version').stdout.trim(), generator.version)
  assert.equal(run(cwd, '--force').status, 1)
  assert.equal(run(cwd, 'one', 'two').status, 1)
  assert.deepEqual(await readdir(cwd), [])
})
