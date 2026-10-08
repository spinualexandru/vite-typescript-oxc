# Vite + TypeScript + Oxc

A minimal vanilla TypeScript starter with Vite, Oxlint, and Oxfmt. The npm package
`create-vite-typescript-oxc` generates an app with no framework or extra runtime
dependencies.

## Create an app

Requires Node.js 20.19+ on the 20.x line, or 22.12+, and pnpm.

```bash
pnpm create vite-typescript-oxc@latest my-app
cd my-app
pnpm install
pnpm dev
```

`pnpm create vite-typescript-oxc my-app` also works. Omit the directory to get a
terminal prompt; noninteractive invocations default to `vite-typescript-oxc-app`.
Use `.` to create the app in an empty current directory. The generator refuses
nonempty directories, files, and symlink destinations.

With npm:

```bash
npm create vite-typescript-oxc@latest my-app
cd my-app
npm install
npm run dev
```

The generator prints next steps but does not install dependencies or initialize
Git. Generated apps are private packages, have strict TypeScript checking, and
create their own lockfile on installation.

## App commands

| Command          | Purpose                                 |
| ---------------- | --------------------------------------- |
| `pnpm dev`       | Start Vite with hot module replacement  |
| `pnpm typecheck` | Check TypeScript without emitting files |
| `pnpm build`     | Check TypeScript and build into `dist/` |
| `pnpm preview`   | Preview the production build locally    |
| `pnpm lint`      | Run Oxlint                              |
| `pnpm lint:fix`  | Apply available lint fixes              |
| `pnpm fmt`       | Format files with Oxfmt                 |
| `pnpm fmt:check` | Check formatting                        |

Edit `src/main.ts` and `src/style.css` to get started. Configure linting in
`.oxlintrc.json` and formatting in `.oxfmtrc.json`.

## Develop the generator

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm test:smoke
```

The starter lives in `template/`; root `dev`, `build`, and `preview` commands run
that starter. The CLI lives in `bin/create.mjs`. Its only dependencies are Node.js
built-ins. Root development dependencies are not installed for CLI consumers.

`pnpm test` checks CLI behavior, including overwrite protection. `pnpm test:smoke`
packs the npm artifact, installs it in a temporary directory, runs its installed
command, then installs and checks a generated app with pnpm. GitHub Actions runs
both checks on Linux with Node.js 22 and 24.

The template stores `.gitignore` as `_gitignore` so npm includes it; the generator
renames it when copying. `template/.npmignore` excludes build output from the
published package and is not copied into generated projects. The template's
`pnpm-workspace.yaml` retains the original Vite release-age exception.

## Publish

For the first release, sign in to npm using an account that can publish the
unscoped package name:

```bash
npm login
npm whoami
npm publish --dry-run
npm publish --access public
```

The publish hook runs `pnpm check` and `pnpm test:smoke`. The first release is
`0.1.0`. The create commands above become available after npm accepts the publish.

After the first publish, configure an npm trusted publisher in the package
settings with:

| Setting              | Value                 |
| -------------------- | --------------------- |
| Organization or user | `spinualexandru`      |
| Repository           | `vite-typescript-oxc` |
| Workflow filename    | `publish.yml`         |
| Environment          | Leave blank           |

See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) for setup.
The workflow uses GitHub OIDC and does not need an npm token secret.

For subsequent releases, increment the package version, commit it, and push a
matching tag such as `v0.1.1`. The publish workflow verifies that the tag matches
`package.json`, runs checks, and publishes with provenance. Do not tag the already
published first version for another publish. An npm version can only be published
once.

## License

MIT. See [LICENSE](LICENSE).
