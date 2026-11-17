<#
.SYNOPSIS
    Starts the two local model servers (llama.cpp) that the AI service talks to.

.DESCRIPTION
    Two processes, because llama-server serves either chat or embeddings
    (--embedding restricts it), and they are different model files:

      1. chat       -> http://localhost:9931/v1   (extraction + evaluation)
      2. embeddings -> http://localhost:9932/v1   (resume + job vectors)

    The models live outside the repository (default: %USERPROFILE%\models), so
    they can never be committed.

.EXAMPLE
    .\start-llama-servers.ps1
    .\start-llama-servers.ps1 -Threads 2
    .\start-llama-servers.ps1 -ModelsDir D:\models -ChatModel gemma-3-1b-it-Q4_K_M.gguf

.NOTES
    Stop both servers with:  Get-Process llama-server | Stop-Process
#>
[CmdletBinding()]
param(
    [string]$ModelsDir = "$env:USERPROFILE\models",
    [string]$ServerExe = "$env:USERPROFILE\llama.cpp\llama-server.exe",
    [string]$ChatModel = "qwen2.5-0.5b-instruct-q4_k_m.gguf",
    # Deliberately not the upstream file name: several broken conversions ship
    # as "multilingual-e5-small-q8_0.gguf" and Windows would match them by
    # case. This name is unique to the build that actually loads.
    [string]$EmbeddingModel = "e5-small-multilingual-q8_0.gguf",
    [int]$ChatPort = 9931,
    [int]$EmbeddingPort = 9932,
    [int]$Threads = 4,
    [int]$ContextSize = 8192
)

$ErrorActionPreference = 'Stop'

function Assert-File {
    param([string]$Path, [string]$What, [string]$Hint)

    if (-not (Test-Path -LiteralPath $Path)) {
        Write-Host ""
        Write-Host "Missing $What : $Path" -ForegroundColor Red
        Write-Host "  $Hint" -ForegroundColor Yellow
        exit 1
    }
}

Assert-File -Path $ServerExe -What 'llama-server.exe' `
    -Hint 'Download the Windows CPU build from https://github.com/ggml-org/llama.cpp/releases and unzip it, then pass -ServerExe.'

$chatModelPath = Join-Path $ModelsDir $ChatModel
$embeddingModelPath = Join-Path $ModelsDir $EmbeddingModel

Assert-File -Path $chatModelPath -What 'the chat model' `
    -Hint 'See the "Models" section of back-end/ai-platform/README.md for the download links.'
Assert-File -Path $embeddingModelPath -What 'the embedding model' `
    -Hint 'See the "Models" section of back-end/ai-platform/README.md for the download links.'

$logDir = Join-Path $ModelsDir 'logs'
if (-not (Test-Path -LiteralPath $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

function Test-Listening {
    param([int]$Port)
    return $null -ne (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

function Wait-Ready {
    param([int]$Port, [string]$Label, [string]$LogFile)

    # The model may fail to load (a missing GGUF key, a wrong file). Do not
    # report success until the server actually answers.
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        try {
            $null = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/v1/models" -TimeoutSec 2
            Write-Host "  $Label is up on port $Port" -ForegroundColor Green
            return $true
        } catch {
            # keep waiting
        }
    }

    Write-Host "  $Label did NOT come up on port $Port" -ForegroundColor Red
    if (Test-Path -LiteralPath $LogFile) {
        Write-Host '  --- last lines of the log ---' -ForegroundColor Yellow
        Get-Content -LiteralPath $LogFile -Tail 15 | ForEach-Object { Write-Host "  $_" }
    }
    return $false
}

$chatArgs = @(
    '-m', $chatModelPath,
    # Bind every interface: a container reaches the host through the Docker
    # gateway, not through 127.0.0.1.
    '--host', '0.0.0.0',
    '--port', "$ChatPort",
    '--ctx-size', "$ContextSize",
    '--threads', "$Threads",
    '--alias', 'local-chat'
)
$embeddingArgs = @(
    '-m', $embeddingModelPath,
    '--host', '0.0.0.0',
    '--port', "$EmbeddingPort",
    '--threads', "$Threads",
    '--embedding',
    '--pooling', 'mean',
    '--alias', 'multilingual-e5-small'
)

Write-Host 'Starting the model servers...' -ForegroundColor Cyan

if (Test-Listening -Port $ChatPort) {
    Write-Host "  chat       already running on port $ChatPort - left alone" -ForegroundColor Yellow
} else {
    $chat = Start-Process -FilePath $ServerExe -ArgumentList $chatArgs -PassThru `
        -RedirectStandardOutput (Join-Path $logDir 'llama-chat.log') `
        -RedirectStandardError (Join-Path $logDir 'llama-chat.err.log')
    Write-Host "  chat       pid $($chat.Id)  -> http://localhost:$ChatPort/v1" -ForegroundColor Green
    $null = Wait-Ready -Port $ChatPort -Label 'chat' -LogFile (Join-Path $logDir 'llama-chat.err.log')
}

if (Test-Listening -Port $EmbeddingPort) {
    Write-Host "  embeddings already running on port $EmbeddingPort - left alone" -ForegroundColor Yellow
} else {
    $embedding = Start-Process -FilePath $ServerExe -ArgumentList $embeddingArgs -PassThru `
        -RedirectStandardOutput (Join-Path $logDir 'llama-embeddings.log') `
        -RedirectStandardError (Join-Path $logDir 'llama-embeddings.err.log')
    Write-Host "  embeddings pid $($embedding.Id)  -> http://localhost:$EmbeddingPort/v1" -ForegroundColor Green
    $null = Wait-Ready -Port $EmbeddingPort -Label 'embeddings' -LogFile (Join-Path $logDir 'llama-embeddings.err.log')
}

Write-Host ""
Write-Host "  chat       pid $($chat.Id)  -> http://localhost:$ChatPort/v1" -ForegroundColor Green
Write-Host "  embeddings pid $($embedding.Id)  -> http://localhost:$EmbeddingPort/v1" -ForegroundColor Green
Write-Host ""
Write-Host 'The AI service (inside Docker) reaches them at:'
Write-Host "  AI_LOCAL_LLM_BASE_URL=http://host.docker.internal:$ChatPort/v1"
Write-Host "  AI_EMBEDDING_BASE_URL=http://host.docker.internal:$EmbeddingPort/v1"
Write-Host ''
Write-Host "Logs: $logDir"
Write-Host 'Stop both with:  Get-Process llama-server | Stop-Process'
