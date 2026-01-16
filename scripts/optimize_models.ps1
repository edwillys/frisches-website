<#
.SYNOPSIS
    Optimizes all .glb files in a directory that do not already have the specified suffix.

.EXAMPLE
    .\optimize-models.ps1
    (Runs on default folder ".\src\assets\private\threed" with suffix "_simplified")

.EXAMPLE
    .\optimize-models.ps1 -TargetFolder "C:\MyModels" -Suffix "_opt"
#>

param (
    [string]$TargetFolder = ".\src\assets\private\threed",
    [string]$Suffix = "_simplified"
)

# 1. Validate Target Folder
if (-not (Test-Path $TargetFolder)) {
    Write-Error "The target folder '$TargetFolder' does not exist."
    exit 1
}

# 2. Get files to process
$glbFiles = Get-ChildItem -Path $TargetFolder -Filter "*.glb" | 
            Where-Object { $_.BaseName -notmatch "$([regex]::Escape($Suffix))$" }

Write-Host "Found $( $glbFiles.Count ) files to process..." -ForegroundColor Cyan

foreach ($file in $glbFiles) {
    $outputName = $file.BaseName + $Suffix + ".glb"
    $outputPath = Join-Path $TargetFolder $outputName
    
    # We use a temporary file to hold the intermediate steps
    $tempFile = Join-Path $TargetFolder ($file.BaseName + ".temp.glb")

    Write-Host "Processing: $($file.Name)" -ForegroundColor Yellow

    try {
        # --- Step 1: Create initial Temp file with Simplify ---
        # We start by simplifying the original file into the temp file
        Write-Host "  > Simplifying..." -NoNewline
        gltf-transform simplify $file.FullName $tempFile --ratio 0.1 --error 0.001
        Write-Host " Done." -ForegroundColor Green

        # --- Step 2: Resize (Overwrite Temp) ---
        # Note: We read from $tempFile and write back to $tempFile
        Write-Host "  > Resizing..." -NoNewline
        gltf-transform resize $tempFile $tempFile --width 2048 --height 2048
        Write-Host " Done." -ForegroundColor Green

        # --- Step 3: Prune ---
        Write-Host "  > Pruning..." -NoNewline
        gltf-transform prune $tempFile $tempFile
        Write-Host " Done." -ForegroundColor Green

        # --- Step 4: Dedup ---
        Write-Host "  > Deduping..." -NoNewline
        gltf-transform dedup $tempFile $tempFile
        Write-Host " Done." -ForegroundColor Green

        # --- Step 5: WebP Compression ---
        Write-Host "  > Compressing Textures (WebP)..." -NoNewline
        gltf-transform webp $tempFile $tempFile
        Write-Host " Done." -ForegroundColor Green

        # --- Step 6: Draco Compression (Final Save) ---
        # We read the temp file and write to the FINAL output path
        Write-Host "  > Compressing Mesh (Draco)..." -NoNewline
        gltf-transform draco $tempFile $outputPath
        Write-Host " Done." -ForegroundColor Green

        Write-Host "✅ Saved to $outputName" -ForegroundColor Cyan
    }
    catch {
        Write-Host "❌ ERROR processing $($file.Name): $_" -ForegroundColor Red
    }
    finally {
        # Cleanup: Always remove the temp file, even if errors occurred
        if (Test-Path $tempFile) {
            Remove-Item $tempFile -Force
        }
    }
    
    Write-Host "--------------------------------"
}