param(
  [Parameter(Mandatory = $true)]
  [string]$ArtifactPath,
  [Parameter(Mandatory = $true)]
  [string]$HashFilePath,
  [string]$OutputPath = '.\clean-machine-result.json'
)

$ErrorActionPreference = 'Stop'
$artifact = (Resolve-Path $ArtifactPath).Path
$hashFile = (Resolve-Path $HashFilePath).Path
$expected = ((Get-Content $hashFile -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
$actual = (Get-FileHash -Algorithm SHA256 $artifact).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw "Artifact hash mismatch. Expected $expected, observed $actual." }

$root = Join-Path $env:TEMP "sprite-project-clean-$([guid]::NewGuid())"
New-Item -ItemType Directory -Path $root | Out-Null
Expand-Archive -Path $artifact -DestinationPath $root
$executable = Get-ChildItem -Path $root -Filter 'The Sprite Project.exe' -Recurse | Select-Object -First 1
if (-not $executable) { throw 'The Sprite Project.exe was not found in the portable ZIP.' }

Write-Host 'Launching the unsigned portable app without elevation.'
Write-Host 'Observe whether Windows SmartScreen appears. Do not bypass it until the application name and SHA-256 match the supplied release files.'
$smartScreen = Read-Host 'SmartScreen observation (not-shown / unrecognized-app / blocked / other)'
$process = Start-Process -FilePath $executable.FullName -PassThru
$deadline = [DateTime]::UtcNow.AddSeconds(30)
while (-not $process.HasExited -and $process.MainWindowHandle -eq 0 -and [DateTime]::UtcNow -lt $deadline) {
  $process.Refresh()
  [Threading.Thread]::Sleep(250)
}
$launched = -not $process.HasExited -and $process.MainWindowHandle -ne 0
$windowTitle = if ($launched) { $process.MainWindowTitle } else { '' }
if (-not $process.HasExited) { $process.CloseMainWindow() | Out-Null }

$result = [ordered]@{
  id = 'CLEAN-MACHINE-UPD002-001'
  observedAt = [DateTime]::UtcNow.ToString('o')
  machine = [ordered]@{
    os = (Get-CimInstance Win32_OperatingSystem).Caption
    osVersion = [Environment]::OSVersion.Version.ToString()
    architecture = $env:PROCESSOR_ARCHITECTURE
    user = $env:USERNAME
  }
  artifact = [ordered]@{
    path = $artifact
    sha256 = $actual
    expectedSha256 = $expected
  }
  launch = [ordered]@{
    withoutElevation = $true
    launched = $launched
    windowTitle = $windowTitle
    smartScreen = $smartScreen
  }
  status = if ($launched -and $smartScreen -notin @('blocked', 'other')) { 'passed' } else { 'needs-review' }
}
$result | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 $OutputPath
Write-Host "Result written to $OutputPath"
if (-not $launched) { exit 1 }
