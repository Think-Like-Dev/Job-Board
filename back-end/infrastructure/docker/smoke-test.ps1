# Smoke test: a message from the core API (node) to the AI service (python)
# through RabbitMQ.
#
# It does not need a real resume: it inserts a synthetic row into the core
# API's outbox, exactly the way a submitted application would. The core API's
# relay picks it up, publishes it to the broker, and the AI service's scoring
# consumer picks it up and tries to run the scoring. The run then fails (there
# is no such file in object storage) — which is the proof we want: the
# message travelled from node to python.
#
#   cd back-end
#   .\infrastructure\docker\smoke-test.ps1
#
# Everything runs against the `job-board-smoke` project only.

$ErrorActionPreference = 'Stop'

$Project = 'job-board-smoke'
$EnvFile = './env/.env.local'
$Compose = @(
    '-f', 'infrastructure/docker/compose.yml',
    '-f', 'infrastructure/docker/compose.smoke.yml'
)

# The database credentials come from the env file, so the script does not have
# to know them.
$dbUser = (Select-String -Path $EnvFile -Pattern '^DATABASE_USER=(.+)$').Matches[0].Groups[1].Value.Trim()
$dbName = (Select-String -Path $EnvFile -Pattern '^DATABASE_NAME=(.+)$').Matches[0].Groups[1].Value.Trim()

function Invoke-Compose {
    param([string[]]$Args)
    docker compose -p $Project --env-file $EnvFile @Compose @Args
}

$applicationId = [guid]::NewGuid().ToString()
$eventId = [guid]::NewGuid().ToString()
$candidateId = [guid]::NewGuid().ToString()
$jobId = [guid]::NewGuid().ToString()
$fileId = [guid]::NewGuid().ToString()
# The colons have to be escaped: in a .NET format string a bare ":" is the
# culture's time separator, which is a dot in some locales.
$occurredAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH\:mm\:ss.fffZ', [System.Globalization.CultureInfo]::InvariantCulture)

$payload = @{
    eventId           = $eventId
    eventType         = 'application.submitted'
    occurredAt        = $occurredAt
    applicationId     = $applicationId
    candidateId       = $candidateId
    jobId             = $jobId
    jobCode           = 'SMOKE-1'
    jobTitle          = 'Smoke Test Engineer'
    jobDescriptionText = 'A smoke test job description used to prove that a message travels from the core API to the AI service.'
    jobSkills         = @('Node.js', 'RabbitMQ')
    jobYearsOfExperience = '3-5 years'
    outputLanguage    = 'en'
    profileSnapshot   = @{
        firstName = 'Smoke'
        lastName  = 'Test'
        email     = 'smoke@example.com'
        skills    = @(@{ id = '1'; name = 'Node.js' })
        experience = @()
        education  = @()
        certifications = @()
    }
    resume            = @{
        fileId     = $fileId
        storageKey = 'resumes/smoke-test.pdf'
        filename   = 'smoke-test.pdf'
        mimeType   = 'application/pdf'
    }
} | ConvertTo-Json -Depth 8 -Compress

Write-Host "Inserting an outbox row for application $applicationId" -ForegroundColor Cyan

$sql = @"
INSERT INTO event_outbox (id, aggregate_type, aggregate_id, event_type, routing_key, payload, status, attempts, next_attempt_at, created_at)
VALUES ('$eventId', 'application', '$applicationId', 'application.submitted', 'application.submitted', '$payload', 'PENDING', 0, now(), now());
"@

$sql | docker compose -p $Project --env-file $EnvFile @Compose exec -T postgres psql -U $dbUser -d $dbName -v ON_ERROR_STOP=1

if ($LASTEXITCODE -ne 0) {
    Write-Host 'Could not insert the outbox row.' -ForegroundColor Red
    exit 1
}

Write-Host 'Waiting for the AI service to receive it (the relay polls every 5s)...' -ForegroundColor Cyan

$deadline = (Get-Date).AddSeconds(90)
$found = $false
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 5
    $logs = docker compose -p $Project --env-file $EnvFile @Compose logs --no-color ai-platform 2>&1
    if ($logs -match $applicationId) {
        $found = $true
        break
    }
}

if (-not $found) {
    Write-Host 'The AI service never mentioned the application.' -ForegroundColor Red
    docker compose -p $Project --env-file $EnvFile @Compose logs --no-color --tail 40 ai-platform
    exit 1
}

Write-Host ''
Write-Host '=== the AI service received the message ===' -ForegroundColor Green
docker compose -p $Project --env-file $EnvFile @Compose logs --no-color ai-platform 2>&1 |
    Select-String -Pattern $applicationId -Context 1, 3 |
    Select-Object -Last 3

Write-Host ''
Write-Host '=== the core API published it ===' -ForegroundColor Green
docker compose -p $Project --env-file $EnvFile @Compose logs --no-color --tail 40 platform-api 2>&1 |
    Select-String -Pattern 'outbox|Outbox' |
    Select-Object -Last 6

exit 0
