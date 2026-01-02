<#
PowerShell helper to initialize a local git repo, make the initial commit
and (optionally) create and push to a GitHub repo using the GitHub CLI (`gh`).

Usage examples:
  # Basic: run interactively and provide repo name when asked
  .\scripts\push-to-github.ps1

  # Non-interactive with owner and public flag
  .\scripts\push-to-github.ps1 -RepoName "CannonFodderKlon" -Owner "myuser" -Public

Notes:
- Run this locally where `git` (and optionally `gh`) are installed.
- If `gh` is not available the script will print next steps to complete manually.
#>

param(
    [string]$RepoName,
    [string]$Owner,
    [switch]$Public
)

function ErrorExit($msg) {
    Write-Error $msg
    exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    ErrorExit "git is not installed or not in PATH. Install Git and re-run this script."
}

if (-not $RepoName) {
    $RepoName = Read-Host "Enter repository name to create on GitHub (or leave empty to only init local git)"
}

Write-Host "Initializing local git repository..."
git init || ErrorExit "git init failed"
git add -A || ErrorExit "git add failed"
try {
    git commit -m "Initial commit: project files and Copilot instructions" -q
} catch {
    Write-Host "No files to commit or commit failed. Continuing..."
}

if (Get-Command gh -ErrorAction SilentlyContinue) {
    if ($RepoName) {
        $full = if ($Owner) { "$Owner/$RepoName" } else { $RepoName }
        $pubFlag = $Public.IsPresent ? "--public" : "--private"
        Write-Host "Creating repository on GitHub via gh: $full"
        gh repo create $full $pubFlag --source=. --remote=origin --push --confirm
        if ($LASTEXITCODE -ne 0) {
            Write-Host "gh reported an error. You can still add a remote manually."
        } else {
            Write-Host "Repository created and pushed. Done."
            exit 0
        }
    } else {
        Write-Host "No repo name provided; skipping gh repo create. You can still add a remote manually."
    }
} else {
    Write-Host "GitHub CLI (gh) not found. To push to GitHub, create a repository on github.com and then run:"
    Write-Host "  git remote add origin https://github.com/<OWNER>/$RepoName.git"
    Write-Host "  git branch -M main"
    Write-Host "  git push -u origin main"
}

Write-Host "If you prefer, create the repo on GitHub first, then run the commands above locally."
