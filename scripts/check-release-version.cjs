// Input is one previously published stable release tag per line (including older pages).
const { readFileSync } = require('node:fs')
const semver = require('semver')

const tag = process.argv[2]
const version = semver.valid(tag)
if (!version || tag !== `v${version}`) {
  throw new Error(
    `Expected a v-prefixed semantic version, received ${tag}`
  )
}
const published = readFileSync(0, 'utf8')
  .trim()
  .split(/\s+/)
// 1.1.11 was distributed before the version rollback; deleted releases may
// disappear from the API while their installed copies still check for updates.
if (semver.lte(version, '1.1.11')) {
  throw new Error(
    `${tag} must be newer than the historical release v1.1.11`
  )
}
for (const previous of published) {
  if (
    previous !== tag &&
    semver.valid(previous) &&
    semver.lte(version, previous)
  ) {
    throw new Error(
      `${tag} must be newer than published release ${previous}`
    )
  }
}
