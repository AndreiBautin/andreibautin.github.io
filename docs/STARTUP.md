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
| 1 | The server entry is missing, or the process this launcher started exited early |
| 2 | Node.js is missing or older than the version in `package.json` |
| 3 | Port 4357 is occupied by something that is not this portfolio |
| 4 | The process this launcher started never became ready in time |

## How a running preview is recognized

Something is reused only when `GET http://127.0.0.1:4357/` returns HTTP 200,
the body contains `Andrei Bautin | Software Engineer`, and the response has a
`Content-Security-Policy` header. That is the page and header `serve.cjs`
sends. A listening socket with any other response is refused.

The launcher starts the server through `ShellExecute`, in a `cmd /k` window,
so the preview is not a child of the launcher process. A later tool turn that
ends the launcher does not own that window. On a timeout, only the process
id this launch created is stopped, including its child processes. The
launcher does not search the port for a pid to kill.

`start-app.ps1` holds the same behavior for tests. Its extra switches
(`-Port`, `-Root`, `-ServeEntry`, `-Attached`, `-BrowserSink`,
`-ReadyTimeoutSec`, `-NodeExe`) are a seam for temporary servers. Normal use
is `start-app.bat`.
