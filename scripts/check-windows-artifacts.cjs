const {
  readdirSync,
  readFileSync,
  statSync
} = require('node:fs')
const { createHash } = require('node:crypto')
const path = require('node:path')

const makeDir = path.resolve('out', 'make')
const squirrel = path.join(
  makeDir,
  'squirrel.windows',
  'x64'
)
function requireArtifact(dir, suffix) {
  const names = readdirSync(dir).filter((name) =>
    name.endsWith(suffix)
  )
  if (
    names.length !== 1 ||
    !statSync(path.join(dir, names[0])).size
  ) {
    throw new Error(
      `Expected one non-empty ${suffix} in ${dir}`
    )
  }
  return names[0]
}

requireArtifact(path.join(makeDir, 'zip'), '.zip')
requireArtifact(squirrel, 'Setup.exe')
const name = requireArtifact(squirrel, '-full.nupkg')
const index = readFileSync(
  path.join(squirrel, 'RELEASES'),
  'utf8'
).trim()
const entry = index
  .split(/\r?\n/)
  .map((line) => line.trim().split(/\s+/))
  .find(([, file]) => file === name)
const bytes = readFileSync(path.join(squirrel, name))
const sha1 = createHash('sha1').update(bytes).digest('hex')
if (
  !entry ||
  entry[0].toLowerCase() !== sha1 ||
  Number(entry[2]) !== bytes.length
) {
  throw new Error(`RELEASES does not match ${name}`)
}
