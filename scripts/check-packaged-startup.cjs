const { spawn } = require('node:child_process')
const { once } = require('node:events')
const {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync
} = require('node:fs')
const { tmpdir } = require('node:os')
const path = require('node:path')
const {
  setTimeout: delay
} = require('node:timers/promises')

async function checkStartup(executable) {
  const profile = mkdtempSync(
    path.join(tmpdir(), 'chathub-startup-')
  )
  const child = spawn(
    path.resolve(executable),
    [
      `--user-data-dir=${profile}`,
      '--proxy-server=http://127.0.0.1:1',
      '--remote-debugging-port=0'
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  )
  let output = ''
  child.stderr.on('data', (chunk) => {
    output += chunk
  })
  const exited = new Promise((resolve) =>
    child.once('exit', resolve)
  )
  const portFile = path.join(profile, 'DevToolsActivePort')

  try {
    await once(child, 'spawn')
    const deadline = Date.now() + 60000
    while (
      Date.now() < deadline &&
      child.exitCode === null &&
      !child.signalCode
    ) {
      const port = existsSync(portFile)
        ? readFileSync(portFile, 'utf8').split(/\r?\n/)[0]
        : output.match(
            /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/
          )?.[1]
      if (port) {
        const targets = await fetch(
          `http://127.0.0.1:${port}/json/list`,
          { signal: AbortSignal.timeout(2000) }
        )
          .then((response) => response.json())
          .catch(() => [])
        if (
          targets.some((t) =>
            t.url.endsWith(
              '/renderer/main_window/index.html'
            )
          ) &&
          targets.some((t) => t.type === 'webview')
        ) {
          console.log(
            'Packaged shell and model WebView started.'
          )
          return
        }
      }
      await delay(200)
    }
    throw new Error(
      `Packaged app failed to start.\n${output}`
    )
  } finally {
    if (
      child.pid &&
      child.exitCode === null &&
      !child.signalCode
    ) {
      child.kill('SIGKILL')
      await exited
    }
    rmSync(profile, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100
    })
  }
}

checkStartup(process.argv[2]).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
