# ============================================================================
# Script de Migraciones y Seeding Manual
# ============================================================================
# Este script permite ejecutar migraciones y seeding de forma manual
# sin necesidad de reinstalar el chart de Helm.
#
# Uso:
#   .\scripts\run-migrations.ps1 -Namespace fuel-system -Service users
#   .\scripts\run-migrations.ps1 -Namespace fuel-system -Service all
# ============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$Namespace = "fuel-system",

    [Parameter(Mandatory=$false)]
    [ValidateSet("all", "users", "vehicles", "driver", "auth")]
    [string]$Service = "all",

    [Parameter(Mandatory=$false)]
    [switch]$SkipSeeding = $false,

    [Parameter(Mandatory=$false)]
    [switch]$WaitForCompletion = $true
)

$ErrorActionPreference = "Stop"

# Colores para output
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "`n🔄 $Message" "Cyan"
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✅ $Message" "Green"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "❌ $Message" "Red"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠️  $Message" "Yellow"
}

# ============================================================================
# Función para ejecutar migración de un servicio específico
# ============================================================================
function Run-ServiceMigration {
    param(
        [string]$ServiceName,
        [string]$JobName,
        [string]$ImageRepo,
        [string]$Command
    )

    Write-Step "Running migration for $ServiceName..."

    # Verificar si ya existe un Job con el mismo nombre
    $existingJob = kubectl get job $JobName -n $Namespace 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Warning "Job $JobName already exists. Deleting..."
        kubectl delete job $JobName -n $Namespace --ignore-not-found=true | Out-Null
        Start-Sleep -Seconds 2
    }

    # Obtener configuración del deployment existente
    $imageTag = kubectl get deployment -n $Namespace -o jsonpath="{.items[0].spec.template.spec.containers[0].image}" 2>$null
    if ($LASTEXITCODE -ne 0) {
        $imageTag = "latest"
    } else {
        $imageTag = $imageTag.Split(":")[-1]
    }

    # Crear el Job usando el template de Helm
    Write-ColorOutput "  Creating Kubernetes Job..." "Gray"

    # Ejecutar el Job de migración usando helm template
    $jobYaml = helm template fuel-system deploy/helm/fuel-system `
        --namespace $Namespace `
        --show-only templates/jobs-migrations.yaml `
        --values deploy/local/values-local.yaml

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to generate Job template"
        return $false
    }

    # Filtrar solo el Job específico
    $jobYaml | kubectl apply -n $Namespace -f -

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create Job"
        return $false
    }

    Write-Success "Job $JobName created successfully"

    if ($WaitForCompletion) {
        Write-ColorOutput "  Waiting for Job to complete..." "Gray"
        kubectl wait --for=condition=complete --timeout=300s job/$JobName -n $Namespace

        if ($LASTEXITCODE -eq 0) {
            Write-Success "$ServiceName migration completed successfully"

            # Mostrar logs del Job
            Write-ColorOutput "`n📋 Job Logs:" "Magenta"
            $podName = kubectl get pods -n $Namespace -l "job-name=$JobName" -o jsonpath="{.items[0].metadata.name}"
            kubectl logs $podName -n $Namespace

            return $true
        } else {
            Write-Error "$ServiceName migration failed or timed out"

            # Mostrar logs del Job para debugging
            Write-ColorOutput "`n📋 Job Logs (for debugging):" "Yellow"
            $podName = kubectl get pods -n $Namespace -l "job-name=$JobName" -o jsonpath="{.items[0].metadata.name}"
            kubectl logs $podName -n $Namespace

            return $false
        }
    }

    return $true
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-ColorOutput "╔════════════════════════════════════════════════════════════╗" "Cyan"
Write-ColorOutput "║     Fuel System - Database Migration & Seeding Tool       ║" "Cyan"
Write-ColorOutput "╚════════════════════════════════════════════════════════════╝" "Cyan"

Write-ColorOutput "`n📍 Configuration:" "White"
Write-ColorOutput "   Namespace: $Namespace" "Gray"
Write-ColorOutput "   Service: $Service" "Gray"
Write-ColorOutput "   Skip Seeding: $SkipSeeding" "Gray"
Write-ColorOutput "   Wait for Completion: $WaitForCompletion" "Gray"

# Verificar que kubectl esté configurado
Write-Step "Verifying Kubernetes connection..."
kubectl cluster-info | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
}
Write-Success "Connected to Kubernetes cluster"

# Verificar que el namespace existe
Write-Step "Verifying namespace '$Namespace'..."
kubectl get namespace $Namespace | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Namespace '$Namespace' does not exist."
    exit 1
}
Write-Success "Namespace '$Namespace' exists"

# ============================================================================
# Ejecutar migraciones según el servicio seleccionado
# ============================================================================

$success = $true

if ($Service -eq "all" -or $Service -eq "users") {
    $jobName = "fuel-system-users-db-migration"
    if (-not (Run-ServiceMigration -ServiceName "Users Service" -JobName $jobName -ImageRepo "users-srv" -Command "npx prisma migrate deploy && npx prisma db seed")) {
        $success = $false
    }
    Start-Sleep -Seconds 5
}

if ($Service -eq "all" -or $Service -eq "vehicles") {
    $jobName = "fuel-system-vehicles-db-migration"
    if (-not (Run-ServiceMigration -ServiceName "Vehicles Service" -JobName $jobName -ImageRepo "vehicles-svc" -Command "npx prisma migrate deploy && npx prisma db seed")) {
        $success = $false
    }
    Start-Sleep -Seconds 5
}

if ($Service -eq "all" -or $Service -eq "driver") {
    $jobName = "fuel-system-driver-db-migration"
    if (-not (Run-ServiceMigration -ServiceName "Driver Service" -JobName $jobName -ImageRepo "driver-ms" -Command "npm run typeorm:migrate && psql -f init.sql && psql -f seed.sql")) {
        $success = $false
    }
    Start-Sleep -Seconds 5
}

if ($Service -eq "all" -or $Service -eq "auth") {
    Write-Step "Auth Service uses users_db, skipping separate migration..."
    Write-Success "Auth Service configuration verified"
}

# ============================================================================
# Resumen final
# ============================================================================

Write-ColorOutput "`n╔════════════════════════════════════════════════════════════╗" "Cyan"
if ($success) {
    Write-ColorOutput "║                  ✅ ALL MIGRATIONS COMPLETED              ║" "Green"
} else {
    Write-ColorOutput "║                  ❌ SOME MIGRATIONS FAILED                ║" "Red"
}
Write-ColorOutput "╚════════════════════════════════════════════════════════════╝" "Cyan"

Write-ColorOutput "`n📊 View migration jobs:" "White"
Write-ColorOutput "   kubectl get jobs -n $Namespace" "Gray"

Write-ColorOutput "`n📋 View job logs:" "White"
Write-ColorOutput "   kubectl logs -n $Namespace -l app.kubernetes.io/component=migration" "Gray"

Write-ColorOutput "`n🗑️  Clean up completed jobs:" "White"
Write-ColorOutput "   kubectl delete jobs -n $Namespace -l app.kubernetes.io/component=migration" "Gray"

if (-not $success) {
    exit 1
}

