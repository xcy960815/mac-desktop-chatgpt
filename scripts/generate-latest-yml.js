/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const version = process.argv[2]
const artifactsDir = process.argv[3]

if (!version || !artifactsDir) {
  console.error(
    'Usage: node generate-latest-yml.js <version> <artifacts_dir>'
  )
  process.exit(1)
}

function getFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath)
  const hashSum = crypto.createHash('sha512')
  hashSum.update(fileBuffer)
  return hashSum.digest('base64')
}

function getFileSize(filePath) {
  const stats = fs.statSync(filePath)
  return stats.size
}

const macFiles = []

function findZips(dir) {
  if (!fs.existsSync(dir)) return
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      findZips(fullPath)
    } else if (file.endsWith('.zip')) {
      if (file.includes('darwin') || file.includes('mac')) {
        macFiles.push(fullPath)
      }
    }
  }
}

findZips(artifactsDir)

function generateYml(files, fileName) {
  if (files.length === 0) {
    console.log(`No files found for ${fileName}, skipping.`)
    return
  }

  let ymlContent = `version: ${version}\nfiles:\n`

  files.forEach((filePath) => {
    const name = path.basename(filePath)
    const sha512 = getFileHash(filePath)
    const size = getFileSize(filePath)

    ymlContent += `  - url: ${name}\n`
    ymlContent += `    sha512: ${sha512}\n`
    ymlContent += `    size: ${size}\n`
  })

  // Legacy fields (usually points to x64 or the first one)
  const mainFile =
    files.find((f) => f.includes('x64')) || files[0]
  if (mainFile) {
    const name = path.basename(mainFile)
    const sha512 = getFileHash(mainFile)
    ymlContent += `path: ${name}\n`
    ymlContent += `sha512: ${sha512}\n`
  }

  ymlContent += `releaseDate: ${new Date().toISOString()}\n`

  const outputPath = path.join(artifactsDir, fileName)
  fs.writeFileSync(outputPath, ymlContent)
  console.log(`Generated ${outputPath}`)
  console.log('Content:')
  console.log(ymlContent)
}

generateYml(macFiles, 'latest-mac.yml')
