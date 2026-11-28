# Stopping only what start-app.ps1 started. Dot-sourced by the launcher;
# scripts/startup.test.cjs drives Stop-OwnedTree with a fake adapter.
#
# A descendant is a process whose recorded parent is an owned process AND
# that was created at or after that parent. Windows keeps a dead process's
# id as the parent of its surviving children, so the creation check is made
# against each parent in turn, not only against the launched process. Before
# a descendant is stopped it is opened by handle and its creation time is
# checked against the listing, so an id reused after the listing is never
# stopped. Each stop is confirmed; nothing is reported stopped unless it is.

function New-ProcessAdapter {
  return @{
    Snapshot = {
      @(Get-CimInstance -ClassName Win32_Process -Property ProcessId, ParentProcessId, CreationDate -ErrorAction Stop |
        ForEach-Object {
          [pscustomobject]@{ Id = [int]$_.ProcessId; Parent = [int]$_.ParentProcessId; Created = $_.CreationDate }
        })
    }
    Open = {
      param([int]$Id)
      try {
        $opened = [System.Diagnostics.Process]::GetProcessById($Id)
        # Holding the handle pins the process: its id cannot be reused now.
        [void]$opened.Handle
        return $opened
      } catch {
        return $null
      }
    }
    StartOf = {
      param($Handle)
      try { return $Handle.StartTime } catch { return $null }
    }
    Kill = {
      param($Handle)
      $Handle.Kill()
    }
    WaitExit = {
      param($Handle, [int]$Milliseconds)
      return $Handle.WaitForExit($Milliseconds)
    }
  }
}

# The same process: the handle's creation time is the listing's, to within
# the listing's microsecond rounding.
function Test-SameCreation($A, $B) {
  if ($null -eq $A -or $null -eq $B) { return $false }
  return [Math]::Abs(([datetime]$A - [datetime]$B).TotalMilliseconds) -lt 2
}

function Stop-OwnedTree($Root, $Adapter) {
  $failures = New-Object System.Collections.Generic.List[string]
  $owned = New-Object System.Collections.Generic.List[object]
  $rootStart = & $Adapter.StartOf $Root
  if ($null -eq $rootStart) {
    $failures.Add("Could not read when the launched process $($Root.Id) started, so its children were not looked for.")
  } else {
    $snapshot = @()
    try {
      $snapshot = @(& $Adapter.Snapshot)
    } catch {
      $failures.Add("Could not list the launched process's children: $($_.Exception.Message)")
    }
    $seen = New-Object System.Collections.Generic.HashSet[int]
    [void]$seen.Add([int]$Root.Id)
    $parents = New-Object System.Collections.Generic.Queue[object]
    $parents.Enqueue([pscustomobject]@{ Id = [int]$Root.Id; Start = $rootStart })
    while ($parents.Count -gt 0) {
      $parent = $parents.Dequeue()
      foreach ($row in $snapshot) {
        if ([int]$row.Parent -ne $parent.Id) { continue }
        if ($null -eq $row.Created -or [datetime]$row.Created -lt [datetime]$parent.Start) { continue }
        if ($seen.Contains([int]$row.Id)) { continue }
        $handle = & $Adapter.Open ([int]$row.Id)
        if ($null -eq $handle) { continue }
        $start = & $Adapter.StartOf $handle
        if (-not (Test-SameCreation $start $row.Created)) { continue }
        [void]$seen.Add([int]$row.Id)
        $owned.Add([pscustomobject]@{ Id = [int]$row.Id; Handle = $handle })
        $parents.Enqueue([pscustomobject]@{ Id = [int]$row.Id; Start = $start })
      }
    }
  }
  # Deepest first, then the launched process, each through its own handle.
  $order = New-Object System.Collections.Generic.List[object]
  for ($at = $owned.Count - 1; $at -ge 0; $at -= 1) { $order.Add($owned[$at]) }
  $order.Add([pscustomobject]@{ Id = [int]$Root.Id; Handle = $Root })
  $stopped = New-Object System.Collections.Generic.List[int]
  foreach ($item in $order) {
    # Kill throws for a process already gone; the wait below is the answer.
    try { & $Adapter.Kill $item.Handle } catch { }
    $exited = $false
    try { $exited = [bool](& $Adapter.WaitExit $item.Handle 3000) } catch { $exited = $false }
    if ($exited) { $stopped.Add($item.Id) } else { $failures.Add("Process $($item.Id) did not stop.") }
  }
  return [pscustomobject]@{
    Stopped = ($failures.Count -eq 0)
    StoppedIds = @($stopped)
    Failures = @($failures)
  }
}
