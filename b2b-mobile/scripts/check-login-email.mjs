import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { createServer } from 'vite'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const desktopPath = resolve(root, '../b2b-app/src/main/repo/users.ts')
const desktopSource = await readFile(desktopPath, 'utf8')
const sourceFile = ts.createSourceFile(desktopPath, desktopSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const declaration = sourceFile.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === 'loginEmail')
const loginDomain = sourceFile.statements.find((statement) => ts.isVariableStatement(statement) && statement.declarationList.declarations.some((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === 'LOGIN_DOMAIN'))
assert.ok(declaration, 'Desktop loginEmail function not found')
assert.ok(loginDomain, 'Desktop LOGIN_DOMAIN constant not found')
const desktopImplementation = `${desktopSource.slice(loginDomain.getStart(sourceFile), loginDomain.end)}\n${desktopSource.slice(declaration.getStart(sourceFile), declaration.end)}`
const desktopJs = ts.transpileModule(desktopImplementation, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const desktopModuleUrl = `data:text/javascript;base64,${Buffer.from(`import { createHash } from 'node:crypto';\n${desktopJs}`).toString('base64')}`
const desktop = await import(desktopModuleUrl)

const server = await createServer({ configFile: resolve(root, 'vite.config.ts'), server: { middlewareMode: true, hmr: false }, appType: 'custom' })
try {
  const mobile = await server.ssrLoadModule('/src/lib/loginEmail.ts')
  for (const username of ['Onur', 'Yamansa', 'Ahmet Yaman', 'ŞÜKRÜ ığdır']) {
    const expected = desktop.loginEmail(username)
    const actual = await mobile.loginEmail(username)
    assert.equal(actual, expected, `${username}: mobile loginEmail differs from desktop`)
  }
  console.log('loginEmail parity: ok (4 usernames)')
} finally {
  await server.close()
}
