#!/usr/bin/env node
import {
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const template = path.join(root, 'template')
const defaultDirectory = 'vite-typescript-oxc-app'

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: pnpm create vite-typescript-oxc [directory]

Create a Vite + TypeScript app with Oxlint and Oxfmt.
Use . to scaffold into an empty current directory.
Without a directory, prompts in a terminal or uses ${defaultDirectory}.
Existing nonempty directories are never overwritten.

Options:
  -h, --help     Show this help
  -v, --version  Show the generator version`)
    return
  }
  if (args.includes('--version') || args.includes('-v')) {
    const metadata = JSON.parse(
      await readFile(path.join(root, 'package.json'), 'utf8'),
    )
    console.log(metadata.version)
    return
  }
  if (args.length > 1 || args.some((arg) => arg.startsWith('-'))) {
    throw new Error('Expected one directory. Use --help for usage.')
  }

  let directory = args[0]
  if (!directory && process.stdin.isTTY && process.stdout.isTTY) {
    const prompt = createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    try {
      directory = (
        await prompt.question(`Project directory (${defaultDirectory}): `)
      ).trim()
    } finally {
      prompt.close()
    }
  }
  directory ||= defaultDirectory
  const destination = path.resolve(directory)
  const stats = await lstat(destination).catch((error) => {
    if (error.code === 'ENOENT') return null
    throw error
  })
  if (stats && (!stats.isDirectory() || stats.isSymbolicLink())) {
    throw new Error(`Destination is not a regular directory: ${destination}`)
  }
  if (stats && (await readdir(destination)).length > 0) {
    throw new Error(`Destination is not empty: ${destination}`)
  }

  const name =
    path
      .basename(destination)
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^[._-]+|[._-]+$/g, '')
      .slice(0, 214) || defaultDirectory
  const metadata = JSON.parse(
    await readFile(path.join(template, 'package.json'), 'utf8'),
  )
  metadata.name = name
  await mkdir(destination, { recursive: true })
  for (const entry of await readdir(template)) {
    if (
      [
        '.npmignore',
        'package.json',
        'dist',
        'dist-ssr',
        'node_modules',
        'pnpm-lock.yaml',
      ].includes(entry)
    )
      continue
    await cp(
      path.join(template, entry),
      path.join(destination, entry === '_gitignore' ? '.gitignore' : entry),
      {
        recursive: true,
        force: false,
        errorOnExist: true,
      },
    )
  }
  await writeFile(
    path.join(destination, 'package.json'),
    `${JSON.stringify(metadata, null, 2)}\n`,
    { flag: 'wx' },
  )
  const htmlPath = path.join(destination, 'index.html')
  const html = await readFile(htmlPath, 'utf8')
  await writeFile(
    htmlPath,
    html.replace(
      '<title>vite-typescript-oxc</title>',
      `<title>${name}</title>`,
    ),
  )

  console.log(`\nCreated ${name} in ${destination}\n`)
  if (destination !== process.cwd()) {
    console.log(`  cd ${JSON.stringify(directory)}`)
  }
  console.log('  pnpm install\n  pnpm dev\n')
}

main().catch((error) => {
  console.error(`Error: ${error.message}`)
  process.exitCode = 1
})
