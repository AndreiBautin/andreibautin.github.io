# Starting the portfolio preview

`start-app.bat` is the one-click launcher. It checks Node.js, starts
`serve.cjs` on http://127.0.0.1:4357, and waits until that URL serves this
portfolio. The site has no package dependencies, so the launcher does not
run `npm install` and it does not change Git hooks or other repo config.

## Everyday launch

Double-click `start-app.bat`, or run it from the repo root. Node.js 20 or
newer must be on `PATH` (https://nodejs.org). After the page responds, the
launcher opens that URL once. The server keeps a console window of its own;
closing that window stops the preview. The launcher window itself can close.

A second launch does not start another server and does not open another
browser tab when the existing listener is this portfolio. It prints the URL
and exits. If port 4357 is taken by anything else, the launcher stops with
an error and leaves that process alone.

## Automated launch

```bat
start-app.bat --no-browser
```

`--no-browser` is for the parent operator and for tests. It still waits for
a real HTTP response, then exits without opening a browser and without
pausing. Exit 0 means the preview is ready or was already this portfolio.
Any other exit code is a failure; the messages name the reason.

To keep the preview's console hidden while preserving an existing desktop
layout, the operator can use the same launcher directly:

```powershell
powershell.exe -NoProfile -File .\start-app.ps1 -NoBrowser -DetachedHidden
```

The batch file and helper run under the current PowerShell policy. Neither
changes policy or passes an execution-policy override. Detached startup quotes
the resolved Node executable and full server path, including spaces.

| Code | Meaning |
|---|---|
| 0 | Ready, or an already-running portfolio preview was reused |
| 1 | The server entry is missing, the process this launcher started exited early, or stopping it after a timeout could not be confirmed |
| 2 | Node.js is missing or older than the version in `package.json` |
| 3 | Port 4357 is occupied by something that is not this portfolio |
| 4 | The process this launcher started never became ready in time, and was confirmed stopped |

## How a running preview is recognized

Something is reused only when `GET http://127.0.0.1:4357/` returns HTTP 200,
the body contains `Andrei Bautin | Software Engineer`, and the response has a
`Content-Security-Policy` header. That is the page and header `serve.cjs`
sends. A listening socket with any other response is refused.

The launcher starts the server through `ShellExecute`, in a `cmd /k` window,
so the preview is not a child of the launcher process. A later tool turn that
ends the launcher does not own that window. On a timeout, only what this
launch started is stopped (`scripts/launcher-cleanup.ps1`, dot-sourced by the
launcher): the launched process, by its own handle, and its descendants. A
descendant is a process whose recorded parent is an owned process and that
was created at or after that parent; the check is made against each parent
in turn. Windows keeps a dead process's id as the parent of its surviving
children, so a reused id can name processes this launch never started;
`taskkill /T` would have stopped those too, and is no longer used. Before a
descendant is stopped it is opened by handle and its creation time is checked
against the listing, so an id reused after the listing is never stopped.
Every stop is confirmed by waiting for the process to exit. Exit 4 means the
launched process was confirmed stopped; if any owned process did not stop,
or its children could not be listed, the launcher exits 1 and names what
was not confirmed. The launcher does not search the port for a pid to kill.

The timeout is reported before that cleanup runs, so the reason is on record
even if the stop goes wrong. An attached server's output is drained by .NET's
own tasks rather than PowerShell script blocks, so closing its pipes calls
nothing back into the launcher as it exits.

`scripts/startup.test.cjs` covers the stop twice. Natively, a server that
writes to both pipes and starts a child times out: both are stopped and a
process the test started itself is left running. Against a fake process
table, `Stop-OwnedTree` itself is run in PowerShell: it stops a tree deepest
first and nothing outside it, reports a child, the launched process or the
listing that could not be stopped or read instead of claiming success, and
leaves an id reused after the listing and a survivor created before its
listed parent alone. A failed launcher assertion reports the exit code, any
signal, the elapsed time and everything the launcher wrote to stdout and
stderr.

`start-app.ps1` holds the same behavior for tests. Its extra switches
(`-Port`, `-Root`, `-ServeEntry`, `-Attached`, `-BrowserSink`,
`-ReadyTimeoutSec`, `-NodeExe`) are a seam for temporary servers. Normal use
is `start-app.bat`. Tests invoke that script with `powershell.exe -NoProfile
-File`. They do not pass `-ExecutionPolicy Bypass` and they do not change the
machine or user execution policy.

## Where launcher checks run

`scripts/startup.test.cjs` splits the gate on purpose.

The source checks read `start-app.bat` on every operating system. They require
CRLF, the Node.js download link, `--no-browser`, and the absence of
`core.hooksPath` and `npm install`. They do not start PowerShell. The existing
`verify` job on `ubuntu-latest` (`.github/workflows/pages.yml`) runs
`npm run verify` and therefore runs those checks. A Linux run must not call
`powershell.exe`.

Native behavior — foreign listeners, identity, reuse, missing Node, timeout,
detach, and a temporary root whose path contains spaces — runs only when
`process.platform` is `win32`. Anywhere else those cases are skipped and the
report says they were skipped. A skip is not a result for the Windows
scenario. The spaced-root case uses an ephemeral port and `-DetachedHidden`,
so both the Node executable and server entry path are quoted for the detached
command. The test waits for the launcher to exit, confirms HTTP readiness,
then stops only the process id that launch printed and its children.

Root owns a `verify-windows` job in that same workflow. It runs the same
`npm run verify` on Windows. That job is what actually executes the native
launcher cases. This file records the boundary. The workflow file itself is
root-owned and is not edited with the startup tests.

Local acceptance on November 26 replaced the known original preview with
the hidden detached launcher. A subsequent tool call confirmed HTTP smoke
and the verified-bundle token endpoint still passed after the launcher exited.
A second launch reused the same server PID without opening a browser tab.
Native Chrome retained its fullscreen particle scene. This does not prove
survival across host shutdown or reboot: no service or scheduled task is installed.
