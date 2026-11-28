# One-click launcher for the static portfolio preview.
# Windows PowerShell 5.1. The batch file is the double-click entry.
#requires -Version 5.1
param(
  [int]$Port = 4357,
  [string]$Root = "",
  [string]$ServeEntry = "serve.cjs",
  [string]$Marker = "Andrei Bautin | Software Engineer",
  [switch]$NoBrowser,
  [switch]$Attached,
  [switch]$DetachedHidden,
  [int]$ReadyTimeoutSec = 20,
  [string]$NodeExe = "node",
  [string]$BrowserSink = ""
)

$ErrorActionPreference = "Stop"

if ($Root -eq "") {
  $Root = Split-Path -Parent $PSCommandPath
}
$Root = (Resolve-Path -LiteralPath $Root).Path

function Write-Info([string]$Message) {
  Write-Host "[start] $Message"
}

function Fail([int]$Code, [string]$Message) {
  Write-Host "[ERROR] $Message"
  [Environment]::Exit($Code)
}

function Test-TcpOpen([int]$LocalPort) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $wait = $client.BeginConnect("127.0.0.1", $LocalPort, $null, $null)
    $opened = $wait.AsyncWaitHandle.WaitOne(400, $false)
    if (-not $opened) { return $false }
    try { $client.EndConnect($wait) } catch { return $false }
    return [bool]$client.Connected
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function Test-PortfolioIdentity([int]$LocalPort, [string]$ExpectedMarker) {
  # A direct socket avoids the system proxy, which can stall HttpWebRequest
  # on loopback until a long default timeout.
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $wait = $client.BeginConnect("127.0.0.1", $LocalPort, $null, $null)
    if (-not $wait.AsyncWaitHandle.WaitOne(800, $false)) { return $false }
    try { $client.EndConnect($wait) } catch { return $false }
    $stream = $client.GetStream()
    $stream.ReadTimeout = 800
    $stream.WriteTimeout = 800
    $payload = [System.Text.Encoding]::ASCII.GetBytes("GET / HTTP/1.0`r`nHost: 127.0.0.1`r`nConnection: close`r`n`r`n")
    $stream.Write($payload, 0, $payload.Length)
    $buffer = New-Object byte[] 8192
    $builder = New-Object System.Text.StringBuilder
    while ($builder.Length -lt 200000) {
      $read = 0
      try { $read = $stream.Read($buffer, 0, $buffer.Length) } catch { break }
      if ($read -le 0) { break }
      [void]$builder.Append([System.Text.Encoding]::UTF8.GetString($buffer, 0, $read))
    }
    $raw = $builder.ToString()
    if ($raw -notmatch "^HTTP/1\.[01] 200\b") { return $false }
    $splitAt = $raw.IndexOf("`r`n`r`n")
    if ($splitAt -lt 0) { return $false }
    $headers = $raw.Substring(0, $splitAt)
    $body = $raw.Substring($splitAt + 4)
    if ($headers -notmatch "(?i)(^|`r`n)Content-Security-Policy:") { return $false }
    if (-not $body.Contains($ExpectedMarker)) { return $false }
    return $true
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function Resolve-NodeCommand([string]$Requested) {
  if ($Requested -eq "node") {
    $command = Get-Command node -ErrorAction SilentlyContinue
    if ($null -eq $command) { return "" }
    return [string]$command.Source
  }
  if (Test-Path -LiteralPath $Requested) {
    return (Resolve-Path -LiteralPath $Requested).Path
  }
  return ""
}

function Get-MinimumNodeMajor([string]$RepoRoot) {
  $packagePath = Join-Path $RepoRoot "package.json"
  if (-not (Test-Path -LiteralPath $packagePath)) { return 20 }
  $package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
  $spec = [string]$package.engines.node
  $digits = [regex]::Match($spec, "(\d+)")
  if (-not $digits.Success) { return 20 }
  return [int]$digits.Groups[1].Value
}

# Stopping what this launcher started, and only that (scripts/launcher-cleanup.ps1).
. (Join-Path $PSScriptRoot "scripts\launcher-cleanup.ps1")

function Stop-LaunchedProcess($Process) {
  if ($null -eq $Process) { return [pscustomobject]@{ Stopped = $true; StoppedIds = @(); Failures = @() } }
  return Stop-OwnedTree -Root $Process -Adapter (New-ProcessAdapter)
}

function Complete-Reuse([int]$LocalPort) {
  $url = "http://127.0.0.1:$LocalPort/"
  Write-Info "Portfolio preview is already running at $url"
  Write-Info "Not opening another browser tab."
  exit 0
}

$url = "http://127.0.0.1:$Port/"

if (Test-PortfolioIdentity -LocalPort $Port -ExpectedMarker $Marker) {
  Complete-Reuse -LocalPort $Port
}

if (Test-TcpOpen -LocalPort $Port) {
  Fail 3 "Port $Port is already in use and it is not this portfolio preview. This launcher did not stop or replace that process. $url"
}

$nodePath = Resolve-NodeCommand -Requested $NodeExe
if ($nodePath -eq "") {
  Fail 2 "Node.js was not found. Install Node.js 20 or newer from https://nodejs.org and then run start-app.bat again."
}

$versionText = ""
try {
  $versionText = [string](& $nodePath -v 2>&1 | Select-Object -First 1)
} catch {
  Fail 2 "Node.js did not run ($nodePath). Install Node.js 20 or newer from https://nodejs.org"
}
$versionMatch = [regex]::Match($versionText, "v?(\d+)\.")
if (-not $versionMatch.Success) {
  Fail 2 "Node.js did not report a version (got '$versionText'). Install Node.js 20 or newer from https://nodejs.org"
}
$major = [int]$versionMatch.Groups[1].Value
$minimum = Get-MinimumNodeMajor -RepoRoot $Root
if ($major -lt $minimum) {
  Fail 2 "Node.js $minimum or newer is required. This launcher found $versionText. Install it from https://nodejs.org"
}

$entry = Join-Path $Root $ServeEntry
if (-not (Test-Path -LiteralPath $entry)) {
  Fail 1 "Portfolio server entry was not found: $entry"
}

Write-Info "Starting $entry"
$process = $null
if ($Attached) {
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $nodePath
  $startInfo.Arguments = '"' + $entry + '"'
  $startInfo.WorkingDirectory = $Root
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $startInfo
  if (-not $process.Start()) {
    Fail 1 "Could not start the portfolio server process."
  }
  # Drain the server's output into nothing on .NET's own tasks. No
  # PowerShell script block runs on those threads, so closing the pipes
  # when the server stops calls nothing back into this runspace as it exits.
  [void]$process.StandardOutput.BaseStream.CopyToAsync([System.IO.Stream]::Null)
  [void]$process.StandardError.BaseStream.CopyToAsync([System.IO.Stream]::Null)
} else {
  # ShellExecute starts the preview outside this launcher process so a
  # transient terminal or tool turn can exit without owning the server.
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $env:ComSpec
  # /s removes the enclosing pair; the inner pairs protect both absolute
  # paths, including a Node installation or checkout containing spaces.
  $startInfo.Arguments = '/d /s /k ""' + $nodePath + '" "' + $entry + '""'
  $startInfo.WorkingDirectory = $Root
  $startInfo.UseShellExecute = $true
  if ($DetachedHidden) {
    $startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
  } else {
    $startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Normal
  }
  $process = [System.Diagnostics.Process]::Start($startInfo)
  if ($null -eq $process) {
    Fail 1 "Could not start the portfolio server window."
  }
}

Write-Host "LAUNCHED_PID=$($process.Id)"

$deadline = (Get-Date).AddSeconds($ReadyTimeoutSec)
$ready = $false
while ((Get-Date) -lt $deadline) {
  $exited = $false
  try { $exited = $process.HasExited } catch { $exited = $false }
  if ($exited) {
    $codeText = ""
    try { $codeText = [string]$process.ExitCode } catch { $codeText = "unknown" }
    $stop = Stop-LaunchedProcess -Process $process
    if (Test-PortfolioIdentity -LocalPort $Port -ExpectedMarker $Marker) {
      Complete-Reuse -LocalPort $Port
    }
    $left = if ($stop.Stopped) { "" } else { " Cleanup was not confirmed: $($stop.Failures -join ' ')" }
    Fail 1 "The preview process started by this launcher exited ($codeText) before http://127.0.0.1:$Port/ accepted the portfolio.$left No other process was stopped."
  }
  if (Test-PortfolioIdentity -LocalPort $Port -ExpectedMarker $Marker) {
    $ready = $true
    break
  }
  Start-Sleep -Milliseconds 250
}

if (-not $ready) {
  # Said before the cleanup, so the reason is on record even if stopping
  # the server goes wrong.
  Write-Info "Timed out after $ReadyTimeoutSec seconds; stopping the process this launcher started (PID $($process.Id))."
  $stop = Stop-LaunchedProcess -Process $process
  if (Test-PortfolioIdentity -LocalPort $Port -ExpectedMarker $Marker) {
    Complete-Reuse -LocalPort $Port
  }
  if (-not $stop.Stopped) {
    # Code 4 says the launched process was stopped; that could not be confirmed.
    Fail 1 "Timed out after $ReadyTimeoutSec seconds waiting for $url, and stopping the process this launcher started was not confirmed: $($stop.Failures -join ' ') No other process was stopped."
  }
  Fail 4 "Timed out after $ReadyTimeoutSec seconds waiting for $url to serve this portfolio. The process this launcher started was stopped. No other process was stopped."
}

Write-Info "Preview is ready at $url"
if ($NoBrowser) {
  Write-Info "Browser not opened."
  exit 0
}
if ($BrowserSink -ne "") {
  Add-Content -LiteralPath $BrowserSink -Value $url -Encoding ascii
  Write-Info "Recorded the preview URL once."
  exit 0
}
Start-Process $url
Write-Info "Opened one preview window."
exit 0
