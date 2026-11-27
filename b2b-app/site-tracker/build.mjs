import { createHash } from 'node:crypto'
import { readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { transform } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { gzipSync } from 'node:zlib'

const exec = promisify(execFile)
const root = dirname(fileURLToPath(import.meta.url))
const endpoint = 'https://wxcbajukvxmerdjaikuw.supabase.co/functions/v1/site-track'
const template = await readFile(join(root, 'yb-track.js'), 'utf8')
const builds = [
  { adapter: 'woo', file: 'yb-track.woo.min.js' },
  { adapter: 'ticimax', file: 'yb-track.ticimax.min.js' }
]
const output = new Map()
for (const build of builds) {
  let source = template.replace('__YB_TRACK_ENDPOINT__', endpoint)
  for (const adapter of ['WOO', 'TICIMAX']) {
    const startMarker = `/*<${adapter}>*/`
    const endMarker = `/*</${adapter}>*/`
    const start = source.indexOf(startMarker)
    const end = source.indexOf(endMarker, start)
    if (start < 0 || end < 0) throw new Error(`Missing ${adapter} adapter markers`)
    const body = source.slice(start + startMarker.length, end)
    source = source.slice(0, start) + (adapter.toLowerCase() === build.adapter ? body : '') + source.slice(end + endMarker.length)
  }
  source = source.replace('__YB_TRACK_ADAPTER_INIT__', `${build.adapter}()`)
  const { code } = await transform(source, {
    loader: 'js',
    target: 'es2017',
    minify: true
  })
  const bytes = Buffer.byteLength(code)
  const gzipBytes = gzipSync(code).byteLength
  if (bytes > 8192 || gzipBytes > 3584) throw new Error(`${build.file} exceeds tracker limit: ${bytes} bytes minified, ${gzipBytes} bytes gzip`)
  output.set(build.file, code)
  await writeFile(join(root, build.file), code)
  console.log(`${build.file}: ${bytes} bytes minified, ${gzipBytes} bytes gzip`)
}
const wordpress = output.get('yb-track.woo.min.js')
const ticimax = output.get('yb-track.ticimax.min.js')
const assetName = `yb-track.woo.${createHash('sha256').update(wordpress).digest('hex').slice(0, 10)}.min.js`
const assetDir = join(root, 'wp-plugin/yamansa-hareket/assets')
for (const file of await readdir(assetDir)) {
  if (file.startsWith('yb-track.woo') && file.endsWith('.min.js') && file !== assetName) {
    await rm(join(assetDir, file), { force: true })
  }
}
await writeFile(join(assetDir, assetName), wordpress)
const pluginPath = join(root, 'wp-plugin/yamansa-hareket/yamansa-hareket.php')
const pluginSource = await readFile(pluginPath, 'utf8')
const assetConstant = /^const YAMANSA_HAREKET_ASSET = '[^']+';$/m
if (!assetConstant.test(pluginSource)) throw new Error('Missing YAMANSA_HAREKET_ASSET constant in plugin')
await writeFile(
  pluginPath,
  pluginSource.replace(assetConstant, `const YAMANSA_HAREKET_ASSET = '${assetName}';`)
)
await writeFile(join(root, 'woo-snippet.html'), `<script defer>\n${wordpress}\n</script>\n`)
await writeFile(join(root, 'ticimax-snippet.html'), `<script defer>\n${ticimax}\n</script>\n`)
const archive = join(root, 'yamansa-hareket-plugin.zip')
await rm(archive, { force: true })
await exec('zip', ['-q', '-r', archive, 'yamansa-hareket'], { cwd: join(root, 'wp-plugin') })
