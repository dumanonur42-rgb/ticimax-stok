import { readFile, writeFile } from 'node:fs/promises'

const version = process.argv[2]
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  throw new Error('Kullanım: npm run version:set -- x.y.z')
}

const packagePath = new URL('../package.json', import.meta.url)
const lockPath = new URL('../package-lock.json', import.meta.url)
const androidPath = new URL('../android/app/build.gradle', import.meta.url)
const iosPath = new URL('../ios/App/App.xcodeproj/project.pbxproj', import.meta.url)
const packageJson = JSON.parse(await readFile(packagePath, 'utf8'))
const lockJson = JSON.parse(await readFile(lockPath, 'utf8'))
const android = await readFile(androidPath, 'utf8')
const ios = await readFile(iosPath, 'utf8')
const androidCode = Number(android.match(/versionCode\s+(\d+)/)?.[1])
const iosBuild = Number(ios.match(/CURRENT_PROJECT_VERSION = (\d+);/)?.[1])

if (!androidCode || !iosBuild) throw new Error('Sürüm numarası bulunamadı.')

packageJson.version = version
lockJson.version = version
if (lockJson.packages?.['']) lockJson.packages[''].version = version

await Promise.all([
  writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`),
  writeFile(lockPath, `${JSON.stringify(lockJson, null, 2)}\n`),
  writeFile(androidPath, android
    .replace(/versionCode\s+\d+/, `versionCode ${androidCode + 1}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${version}"`)),
  writeFile(iosPath, ios
    .replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${iosBuild + 1};`)
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`))
])
