<#
.SYNOPSIS
  One-time Windows developer machine setup for this template (Expo Android + Cloudflare Workers).

.DESCRIPTION
  How to run (normal PowerShell window, NOT "Run as administrator", from the repo root):

      powershell -ExecutionPolicy Bypass -File scripts\setup\windows.ps1

  Options:
      -SkipAndroid   do not install JDK 17 / Android Studio / Android env vars
      -SkipVSCode    do not offer Visual Studio Code
      -SkipGlobals   do not install global npm tools (eas-cli, wrangler)
      -UseNodeMsi    install Node.js LTS with the official installer instead of fnm
      -Yes           do not ask (Android Studio, VS Code, execution policy -> RemoteSigned)

  Idempotent: every step checks first, so it is safe to re-run.
  Admin: not needed to start. winget shows a Windows UAC prompt (click Yes) for packages that install
  machine-wide (Git, JDK, Android Studio). Everything else (env vars, PowerShell profile) is per-user.

  NOTE: this file is intentionally pure ASCII (Vietnamese without diacritics). Windows PowerShell 5.1 reads
  BOM-less UTF-8 scripts as ANSI, and accented characters can then break parsing.
#>
[CmdletBinding()]
param(
  [switch]$SkipAndroid,
  [switch]$SkipVSCode,
  [switch]$SkipGlobals,
  [switch]$UseNodeMsi,
  [switch]$Yes
)

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$script:Warnings = 0
$script:Manual = New-Object System.Collections.Generic.List[string]

# ---------------------------------------------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------------------------------------------

function Write-Step([string]$Text) { Write-Host ''; Write-Host "> $Text" -ForegroundColor Cyan }
function Write-Ok([string]$Text) { Write-Host "  [OK] $Text" -ForegroundColor Green }
function Write-Info([string]$Text) { Write-Host "  ...  $Text" -ForegroundColor DarkGray }
function Write-Warn([string]$Text) {
  Write-Host "  [!]  $Text" -ForegroundColor Yellow
  $script:Warnings++
}
function Add-Manual([string]$Text) { $script:Manual.Add($Text) }

function Test-Command([string]$Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

# Ask yes/no (default yes). -Yes or a non-interactive host answers yes.
function Confirm-Step([string]$Question) {
  if ($Yes) { return $true }
  try {
    $answer = Read-Host "  $Question [Y/n]"
  } catch {
    return $true
  }
  return ($answer -eq '' -or $answer -match '^(y|yes|c|co)$')
}

# Reload Path for this session from the registry (machine + user), so freshly installed tools are found.
function Update-SessionPath {
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = (@($machine, $user) | Where-Object { $_ }) -join ';'
}

# winget exit codes meaning "already installed / nothing to upgrade".
$WingetAlreadyOk = @(-1978335189, -1978335135)

# Install a winget package unless it is already there (by command on PATH, or by winget's own list).
# Native output goes to Out-Host so it never leaks into the function's return value.
function Install-WingetPackage([string]$Id, [string]$Name, [string]$Command = '') {
  if ($Command -and (Test-Command $Command)) {
    Write-Ok "$Name da co"
    return $true
  }
  $null = winget list --id $Id --exact --accept-source-agreements 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Ok "$Name da co"
    return $true
  }
  Write-Info "winget install --id $Id"
  winget install --id $Id --exact --silent --accept-package-agreements --accept-source-agreements | Out-Host
  $code = $LASTEXITCODE
  if ($code -eq 0 -or $WingetAlreadyOk -contains $code) {
    Write-Ok "$Name da cai"
    return $true
  }
  Write-Warn "Cai $Name that bai (ma loi $code). Thu lai: winget install --id $Id -e"
  return $false
}

# Append entries to the USER Path without duplicates. Keeps REG_EXPAND_SZ so %VARS% in existing entries still work.
function Add-UserPathEntry([string[]]$Entries) {
  $key = Get-Item -Path 'HKCU:\Environment'
  $raw = [string]$key.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
  $parts = New-Object System.Collections.Generic.List[string]
  foreach ($p in ($raw -split ';')) { if ($p.Trim() -ne '') { $parts.Add($p) } }
  $expanded = New-Object System.Collections.Generic.List[string]
  foreach ($p in $parts) { $expanded.Add([Environment]::ExpandEnvironmentVariables($p).TrimEnd('\').ToLowerInvariant()) }

  $added = @()
  foreach ($entry in $Entries) {
    $exp = [Environment]::ExpandEnvironmentVariables($entry).TrimEnd('\').ToLowerInvariant()
    if (-not $expanded.Contains($exp)) {
      $parts.Add($entry)
      $expanded.Add($exp)
      $added += $entry
    }
  }
  if ($added.Count -gt 0) {
    Set-ItemProperty -Path 'HKCU:\Environment' -Name 'Path' -Value ($parts -join ';') -Type ExpandString
  }
  # Current session too.
  $sessionParts = @($env:Path -split ';' | ForEach-Object { $_.TrimEnd('\').ToLowerInvariant() })
  foreach ($entry in $Entries) {
    $exp = [Environment]::ExpandEnvironmentVariables($entry)
    if ($sessionParts -notcontains $exp.TrimEnd('\').ToLowerInvariant()) { $env:Path = "$env:Path;$exp" }
  }
  return $added
}

# Major Java version from `java -version` ("1.8.0_x" -> 8, "17.0.12" -> 17), or $null.
function Get-JavaMajor([string]$JavaExe) {
  if (-not $JavaExe -or -not (Test-Path $JavaExe)) { return $null }
  $out = (& $JavaExe -version 2>&1 | ForEach-Object { "$_" }) -join "`n"
  if ($out -match 'version "(\d+)(?:\.(\d+))?') {
    if ($Matches[1] -eq '1') { return [int]$Matches[2] }
    return [int]$Matches[1]
  }
  return $null
}

# Append ASCII text to a file in the file's own encoding (profiles may be UTF-16, UTF-8 with BOM, or ANSI).
function Add-TextToFile([string]$Path, [string]$Text) {
  $encoding = 'ASCII'
  if (Test-Path $Path) {
    $head = New-Object byte[] 3
    $fs = [System.IO.File]::OpenRead($Path)
    try { $n = $fs.Read($head, 0, 3) } finally { $fs.Close() }
    if ($n -ge 2 -and $head[0] -eq 0xFF -and $head[1] -eq 0xFE) { $encoding = 'Unicode' }
    elseif ($n -ge 2 -and $head[0] -eq 0xFE -and $head[1] -eq 0xFF) { $encoding = 'BigEndianUnicode' }
    elseif ($n -ge 3 -and $head[0] -eq 0xEF -and $head[1] -eq 0xBB -and $head[2] -eq 0xBF) { $encoding = 'UTF8' }
  }
  Add-Content -Path $Path -Value $Text -Encoding $encoding
}

# Set a USER environment variable (also broadcasts the change to new windows) and this session.
function Set-UserEnv([string]$Name, [string]$Value) {
  [Environment]::SetEnvironmentVariable($Name, $Value, 'User')
  Set-Item -Path "Env:$Name" -Value $Value
}

# ---------------------------------------------------------------------------------------------------------------
# 0. Sanity
# ---------------------------------------------------------------------------------------------------------------

Write-Host 'Cai moi truong lap trinh cho may Windows' -ForegroundColor White
Write-Host ("Repo: {0} | PowerShell {1}" -f $RepoRoot, $PSVersionTable.PSVersion) -ForegroundColor DarkGray

if ($PSVersionTable.PSVersion -lt [Version]'5.1') {
  Write-Host '[X] Can PowerShell 5.1 tro len.' -ForegroundColor Red
  exit 1
}

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = (New-Object Security.Principal.WindowsPrincipal($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
  Write-Warn 'Dang chay voi quyen Administrator. Khong can thiet: nen chay bang cua so PowerShell thuong de bien moi truong va profile thuoc dung tai khoan cua ban.'
}

if (-not (Test-Command 'winget')) {
  Write-Host '[X] Khong tim thay winget.' -ForegroundColor Red
  Write-Host '    Cai "App Installer" tu Microsoft Store: https://apps.microsoft.com/detail/9NBLGGH4NNS1' -ForegroundColor Yellow
  Write-Host '    Sau do mo cua so PowerShell moi va chay lai script nay.' -ForegroundColor Yellow
  exit 1
}
Write-Ok ("winget {0}" -f ((winget --version) | Select-Object -First 1))

# Profile scripts and npm's *.ps1 shims (npm.ps1, npx.ps1, eas.ps1...) need an execution policy that allows
# local scripts. Windows client default is Restricted, which breaks `npm` in PowerShell.
# The Process scope is ignored on purpose: it is Bypass only for this run (-ExecutionPolicy Bypass).
function Get-PersistentExecutionPolicy {
  foreach ($scope in @('MachinePolicy', 'UserPolicy', 'CurrentUser', 'LocalMachine')) {
    $p = [string](Get-ExecutionPolicy -Scope $scope)
    if ($p -ne 'Undefined') { return $p }
  }
  return 'Restricted'
}
$policy = Get-PersistentExecutionPolicy
$policyFix = 'Set-ExecutionPolicy -Scope CurrentUser RemoteSigned'
if (@('RemoteSigned', 'Unrestricted', 'Bypass') -contains $policy) {
  Write-Ok "Execution policy: $policy"
} elseif ([string](Get-ExecutionPolicy -Scope MachinePolicy) -ne 'Undefined' -or [string](Get-ExecutionPolicy -Scope UserPolicy) -ne 'Undefined') {
  Write-Warn "Execution policy = $policy do Group Policy dat (may cong ty). Nho IT cho phep RemoteSigned, hoac dung Command Prompt (npm.cmd)."
} else {
  Write-Warn "Execution policy hien tai: $policy (PowerShell se chan npm.ps1 va profile)."
  if (Confirm-Step 'Doi execution policy cua RIENG tai khoan nay thanh RemoteSigned (khuyen nghi cho Node.js)?') {
    # Setting CurrentUser while the Process scope is Bypass reports an "overridden" error even on success,
    # so the result is checked afterwards instead of trusting the exception.
    try { Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force -ErrorAction Stop } catch { }
    if ([string](Get-ExecutionPolicy -Scope CurrentUser) -eq 'RemoteSigned') {
      Write-Ok 'Execution policy (CurrentUser) = RemoteSigned'
    } else {
      Write-Warn 'Khong doi duoc execution policy.'
      Add-Manual "Chay: $policyFix"
    }
  } else {
    Add-Manual "Chay: $policyFix   (neu khong, lenh npm trong PowerShell se bao loi `"running scripts is disabled`")"
  }
}

# ---------------------------------------------------------------------------------------------------------------
# 1. Packages via winget
# ---------------------------------------------------------------------------------------------------------------

Write-Step 'Git & GitHub CLI'
[void](Install-WingetPackage 'Git.Git' 'Git' 'git')
[void](Install-WingetPackage 'GitHub.cli' 'GitHub CLI' 'gh')

Write-Step 'Node.js'
$useFnm = -not $UseNodeMsi
if ($useFnm) {
  if (-not (Install-WingetPackage 'Schniz.fnm' 'fnm (quan ly phien ban Node)' 'fnm')) {
    Write-Warn 'Chuyen sang cai Node.js LTS ban chinh thuc (OpenJS.NodeJS.LTS).'
    $useFnm = $false
  }
}
if (-not $useFnm) {
  [void](Install-WingetPackage 'OpenJS.NodeJS.LTS' 'Node.js LTS' 'node')
}

if (-not $SkipAndroid) {
  Write-Step 'Android (JDK 17, Android Studio)'
  [void](Install-WingetPackage 'Microsoft.OpenJDK.17' 'Microsoft OpenJDK 17')
  $hasStudio = Test-Path (Join-Path $env:ProgramFiles 'Android\Android Studio')
  if ($hasStudio) {
    Write-Ok 'Android Studio da co'
  } elseif (Confirm-Step 'Cai Android Studio (~1.5 GB)?') {
    [void](Install-WingetPackage 'Google.AndroidStudio' 'Android Studio')
  } else {
    Write-Warn 'Bo qua Android Studio (cai sau: winget install --id Google.AndroidStudio -e)'
  }
}

if (-not $SkipVSCode) {
  Write-Step 'Visual Studio Code (tuy chon)'
  if (Test-Command 'code') {
    Write-Ok 'VS Code da co'
  } elseif (Confirm-Step 'Cai Visual Studio Code?') {
    [void](Install-WingetPackage 'Microsoft.VisualStudioCode' 'Visual Studio Code' 'code')
  } else {
    Write-Info 'Bo qua VS Code'
  }
}

Update-SessionPath

# ---------------------------------------------------------------------------------------------------------------
# 2. Git settings
# ---------------------------------------------------------------------------------------------------------------

Write-Step 'Cau hinh Git'
if (Test-Command 'git') {
  git config --global core.longpaths true
  Write-Ok 'git core.longpaths = true (tranh loi duong dan dai trong node_modules)'
  Write-Ok (git --version)
} else {
  Write-Warn 'Chua thay git trong PATH (mo cua so PowerShell moi roi chay lai script).'
}

# ---------------------------------------------------------------------------------------------------------------
# 3. fnm + Node version from .nvmrc + PowerShell profile
# ---------------------------------------------------------------------------------------------------------------

$NodeVersion = '24'
$nvmrc = Join-Path $RepoRoot '.nvmrc'
if (Test-Path $nvmrc) { $NodeVersion = (Get-Content $nvmrc -Raw).Trim().TrimStart('v') }

if ($useFnm) {
  Write-Step "Node $NodeVersion qua fnm"
  if (Test-Command 'fnm') {
    fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
    fnm install $NodeVersion
    fnm default $NodeVersion
    fnm use $NodeVersion | Out-Null
    if (Test-Command 'node') { Write-Ok ("Node {0} (mac dinh = {1}, theo .nvmrc)" -f (node --version), $NodeVersion) }
    else { Write-Warn "fnm chua cai duoc Node. Thu: fnm install $NodeVersion; fnm default $NodeVersion" }

    # Load fnm in every new PowerShell window (Windows PowerShell 5.1 and PowerShell 7 have separate profiles).
    $profileLine = 'if (Get-Command fnm -ErrorAction SilentlyContinue) { fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression }'
    $docs = [Environment]::GetFolderPath('MyDocuments')
    $profiles = @(
      (Join-Path $docs 'WindowsPowerShell\Microsoft.PowerShell_profile.ps1'),
      (Join-Path $docs 'PowerShell\Microsoft.PowerShell_profile.ps1')
    )
    foreach ($p in $profiles) {
      $existing = ''
      if (Test-Path $p) { $existing = [string](Get-Content $p -Raw) }
      if ($existing -match 'fnm env') {
        Write-Ok "fnm da co trong $p"
      } else {
        $dir = Split-Path $p -Parent
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        Add-TextToFile $p "`r`n# Added by freedom-app setup (scripts/setup/windows.ps1)`r`n$profileLine"
        Write-Ok "Da them fnm vao $p"
      }
    }
  } else {
    Write-Warn 'Chua thay fnm trong PATH. Mo cua so PowerShell moi roi chay lai script.'
  }
}

# ---------------------------------------------------------------------------------------------------------------
# 4. JAVA_HOME, ANDROID_HOME, Path
# ---------------------------------------------------------------------------------------------------------------

if (-not $SkipAndroid) {
  Write-Step 'Bien moi truong Android'

  $jdkRoot = Join-Path $env:ProgramFiles 'Microsoft'
  $jdk = $null
  if (Test-Path $jdkRoot) {
    $jdk = Get-ChildItem -Path $jdkRoot -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue |
      Where-Object { Test-Path (Join-Path $_.FullName 'bin\java.exe') } |
      Sort-Object Name -Descending | Select-Object -First 1
  }
  $currentJavaHome = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User')
  if (-not $currentJavaHome) { $currentJavaHome = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'Machine') }
  $currentIs17 = $false
  if ($currentJavaHome) { $currentIs17 = ((Get-JavaMajor (Join-Path $currentJavaHome 'bin\java.exe')) -eq 17) }

  if ($currentIs17) {
    Write-Ok "JAVA_HOME = $currentJavaHome"
    $env:JAVA_HOME = $currentJavaHome
  } elseif ($jdk) {
    if ($currentJavaHome) { Write-Info "JAVA_HOME cu: $currentJavaHome (khong phai JDK 17) -> doi sang JDK 17" }
    Set-UserEnv 'JAVA_HOME' $jdk.FullName
    Write-Ok "JAVA_HOME = $($jdk.FullName)"
  } else {
    Write-Warn "Khong tim thay Microsoft OpenJDK 17 trong $jdkRoot. Cai: winget install --id Microsoft.OpenJDK.17 -e, roi chay lai script."
  }
  if ($env:JAVA_HOME -and -not (Test-Command 'java')) {
    [void](Add-UserPathEntry @("$env:JAVA_HOME\bin"))
  }

  $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
  $currentAndroidHome = [Environment]::GetEnvironmentVariable('ANDROID_HOME', 'User')
  if ($currentAndroidHome -and ($currentAndroidHome.TrimEnd('\') -ne $sdk) -and (Test-Path $currentAndroidHome)) {
    Write-Ok "ANDROID_HOME = $currentAndroidHome (giu nguyen)"
    $env:ANDROID_HOME = $currentAndroidHome
    $sdkPathEntries = @("$currentAndroidHome\platform-tools", "$currentAndroidHome\emulator")
  } else {
    Set-UserEnv 'ANDROID_HOME' $sdk
    Write-Ok "ANDROID_HOME = $sdk"
    $sdkPathEntries = @('%LOCALAPPDATA%\Android\Sdk\platform-tools', '%LOCALAPPDATA%\Android\Sdk\emulator')
  }
  $added = @(Add-UserPathEntry $sdkPathEntries)
  if ($added.Count -gt 0) { Write-Ok ("Da them vao Path: {0}" -f ($added -join ', ')) }
  else { Write-Ok 'platform-tools + emulator da co trong Path' }

  if (Test-Path (Join-Path $env:ANDROID_HOME 'platforms\android-36')) {
    Write-Ok 'Android SDK Platform 36 da co'
  } else {
    Add-Manual 'Mo Android Studio lan dau -> Next -> chon Standard -> Next -> Accept license (ca 2 muc) -> Finish, cho tai xong SDK.'
    Add-Manual 'Android Studio -> More Actions -> SDK Manager -> tab SDK Platforms -> tick Show Package Details -> mo "Android 16.0 (Baklava)" -> chon Android SDK Platform 36 + Google APIs Intel x86_64 Atom System Image (may ARM: ARM 64 v8a).'
    Add-Manual 'Cung man do -> tab SDK Tools -> tick Show Package Details -> Android SDK Build-Tools 36.x; tick them Android Emulator, Android SDK Platform-Tools -> Apply -> OK.'
  }
  Add-Manual 'Tao may ao: Android Studio -> More Actions -> Virtual Device Manager -> + -> Pixel 9 -> API 36 -> Finish.'
  Add-Manual 'Neu may ao bao thieu tang toc phan cung: bat "Windows Hypervisor Platform" (Turn Windows features on or off) hoac cai Android Emulator hypervisor driver trong SDK Tools.'
}

# ---------------------------------------------------------------------------------------------------------------
# 5. Global npm tools (optional - the repo also runs them via npx)
# ---------------------------------------------------------------------------------------------------------------

if ($SkipGlobals) {
  Write-Step 'Cong cu npm toan cuc - bo qua (-SkipGlobals)'
} elseif (Test-Command 'npm') {
  Write-Step 'Cong cu npm toan cuc (eas-cli, wrangler)'
  foreach ($pair in @(@('eas-cli', 'eas'), @('wrangler', 'wrangler'))) {
    $pkg = $pair[0]; $bin = $pair[1]
    if (Test-Command $bin) {
      Write-Ok "$pkg da co"
    } else {
      Write-Info "npm i -g $pkg"
      npm install -g $pkg *> $null
      if ($LASTEXITCODE -eq 0) { Write-Ok "$pkg da cai" } else { Write-Warn "Cai $pkg that bai. Thu: npm i -g $pkg" }
    }
  }
  if ($useFnm) { Write-Info 'Goi toan cuc gan voi tung ban Node cua fnm; doi ban Node thi cai lai.' }
} else {
  Write-Warn 'Chua thay npm (mo cua so PowerShell moi roi chay lai script).'
}

# Logins need a browser + password/2FA: always manual.
Add-Manual 'Dang nhap GitHub: gh auth login   (GitHub.com -> HTTPS -> Login with a web browser)'
Add-Manual 'Dang nhap Cloudflare (de deploy): npx wrangler login'
Add-Manual 'Dang nhap Expo/EAS (de build app): npx eas-cli login'
Add-Manual 'Cai app Expo Go tren dien thoai (Google Play / App Store) de chay thu bang ma QR.'
Add-Manual 'iPhone: Windows KHONG build/gia lap iOS duoc. Chay thu bang Expo Go tren iPhone that; ban iOS that thi build tren cloud: npm run build:ios (EAS).'
Add-Manual 'Lan dau chay "npm run dev": Windows Firewall hoi quyen cho Node.js -> tick Private networks -> Allow (de dien thoai goi duoc API).'
Add-Manual 'Nen dat repo o duong dan ngan (vd C:\dev\my-app) de tranh loi duong dan dai khi build Android.'

# ---------------------------------------------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------------------------------------------

Write-Host ''
Write-Host '=================================================='
if ($script:Warnings -eq 0) {
  Write-Host '[OK] Phan tu dong da xong.' -ForegroundColor Green
} else {
  Write-Host ("[!] Phan tu dong xong voi {0} canh bao (xem cac dong [!] o tren)." -f $script:Warnings) -ForegroundColor Yellow
}
Write-Host ''
Write-Host 'Quan trong: DONG cua so nay va mo PowerShell MOI de nhan PATH / JAVA_HOME / ANDROID_HOME / fnm.' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Viec can ban tu lam:' -ForegroundColor White
$i = 1
foreach ($m in $script:Manual) {
  Write-Host ("  {0,2}. {1}" -f $i, $m)
  $i++
}
Write-Host ''
Write-Host 'Kiem tra lai: npm run doctor   (chi tiet: docs\01-cai-dat-moi-truong.md)' -ForegroundColor White
Write-Host 'Chay repo lan dau: npm install; npm run db:migrate:local; npm run dev' -ForegroundColor White
Write-Host ''
