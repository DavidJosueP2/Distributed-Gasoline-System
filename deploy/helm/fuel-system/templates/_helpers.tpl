{{/*
Chart base name
*/}}
{{- define "fuel-system.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Fully-qualified release name
*/}}
{{- define "fuel-system.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Chart label (name + version)
*/}}
{{- define "fuel-system.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Immutable selector labels
*/}}
{{- define "fuel-system.selectorLabels" -}}
app.kubernetes.io/name: {{ include "fuel-system.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "fuel-system.labels" -}}
helm.sh/chart: {{ include "fuel-system.chart" . }}
{{ include "fuel-system.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- end }}

{{/*
ServiceAccount name
If Values.serviceAccount.create=true, default to fullname unless overridden.
Else use "default" or provided name.
*/}}
{{- define "fuel-system.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "fuel-system.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
PostgreSQL host with safe fallback
- If in-cluster Postgres is enabled (and external is not), use "<fullname>-postgresql"
- Else use external.host or "postgres"
*/}}
{{- define "fuel-system.postgresql.host" -}}
{{- $ext := .Values.postgresql.external | default (dict) -}}
{{- if and .Values.postgresql.enabled (not $ext.enabled) -}}
{{- printf "%s-postgresql" (include "fuel-system.fullname" .) -}}
{{- else -}}
{{- default "postgres" $ext.host -}}
{{- end -}}
{{- end }}

{{/*
PostgreSQL connection string (safe defaults)
Requires a dict with key "db" when included: {{ include "fuel-system.postgresql.connectionString" (dict "db" "users_db" "Values" .Values "Chart" .Chart "Release" .Release) }}
*/}}
{{- define "fuel-system.postgresql.connectionString" -}}
{{- $root := . -}}
{{- $values := $root.Values | default dict -}}
{{- $ext := $values.postgresql.external | default (dict) -}}
{{- $user := default "pgadmin" $ext.username -}}
{{- $pass := default "" $ext.password -}}
{{- $host := default (include "fuel-system.postgresql.host" $root) $ext.host -}}
{{- $port := default 5432 $ext.port -}}
{{- $ssl  := default "require" $ext.sslMode -}}
{{- $db   := default "postgres" $root.db -}}
{{- printf "postgresql://%s:%s@%s:%v/%s?sslmode=%s" $user $pass $host $port $db $ssl -}}
{{- end }}

{{/*
RabbitMQ host with safe fallback
- If in-cluster Rabbit is enabled -> "<fullname>-rabbitmq"
- Else external.host or "rabbitmq"
*/}}
{{- define "fuel-system.rabbitmq.host" -}}
{{- $ext := .Values.rabbitmq.external | default (dict) -}}
{{- if .Values.rabbitmq.enabled -}}
{{- printf "%s-rabbitmq" (include "fuel-system.fullname" .) -}}
{{- else -}}
{{- default "rabbitmq" $ext.host -}}
{{- end -}}
{{- end }}

{{/*
Elasticsearch host with safe fallback
- If in-cluster ES is enabled -> "<fullname>-elasticsearch"
- Else external.host or "elasticsearch"
*/}}
{{- define "fuel-system.elasticsearch.host" -}}
{{- $ext := .Values.elasticsearch.external | default (dict) -}}
{{- if .Values.elasticsearch.enabled -}}
{{- printf "%s-elasticsearch" (include "fuel-system.fullname" .) -}}
{{- else -}}
{{- default "elasticsearch" $ext.host -}}
{{- end -}}
{{- end }}

{{/*
Eureka host (always in-cluster when enabled)
*/}}
{{- define "fuel-system.eureka.host" -}}
{{- printf "%s-eureka-server" (include "fuel-system.fullname" .) }}
{{- end }}

{{/*
imagePullSecrets helper (optional)
Usage in a Pod spec:
{{ include "fuel-system.imagePullSecrets" . | nindent 2 }}
*/}}
{{- define "fuel-system.imagePullSecrets" -}}
{{- if .Values.global.imagePullSecrets }}
imagePullSecrets:
{{- range .Values.global.imagePullSecrets }}
  - name: {{ . }}
{{- end }}
{{- end }}
{{- end }}
