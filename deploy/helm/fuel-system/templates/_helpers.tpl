{{/*
Expand the name of the chart.
*/}}
{{- define "fuel-system.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
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
Create chart name and version as used by the chart label.
*/}}
{{- define "fuel-system.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "fuel-system.labels" -}}
helm.sh/chart: {{ include "fuel-system.chart" . }}
{{ include "fuel-system.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "fuel-system.selectorLabels" -}}
app.kubernetes.io/name: {{ include "fuel-system.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "fuel-system.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "fuel-system.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
PostgreSQL host (Azure Flexible Server)
*/}}
{{- define "fuel-system.postgresql.host" -}}
{{- if .Values.postgresql.external.enabled }}
{{- .Values.postgresql.external.host }}
{{- else }}
{{- printf "%s-postgresql" (include "fuel-system.fullname" .) }}
{{- end }}
{{- end }}

{{/*
PostgreSQL connection string con SSL para Azure
*/}}
{{- define "fuel-system.postgresql.connectionString" -}}
postgresql://{{ .Values.postgresql.external.username }}:{{ .Values.postgresql.external.password }}@{{ .Values.postgresql.external.host }}:{{ .Values.postgresql.external.port }}/{{ .db }}?sslmode={{ .Values.postgresql.external.sslMode }}
{{- end }}

{{/*
RabbitMQ host
*/}}
{{- define "fuel-system.rabbitmq.host" -}}
{{- if .Values.rabbitmq.enabled }}
{{- printf "%s-rabbitmq" (include "fuel-system.fullname" .) }}
{{- else }}
{{- .Values.rabbitmq.external.host }}
{{- end }}
{{- end }}

{{/*
Elasticsearch host
*/}}
{{- define "fuel-system.elasticsearch.host" -}}
{{- if .Values.elasticsearch.enabled }}
{{- printf "%s-elasticsearch" (include "fuel-system.fullname" .) }}
{{- else }}
{{- .Values.elasticsearch.external.host }}
{{- end }}
{{- end }}

{{/*
Eureka Server host
*/}}
{{- define "fuel-system.eureka.host" -}}
{{- printf "%s-eureka-server" (include "fuel-system.fullname" .) }}
{{- end }}

{{/*
Image pull secrets
*/}}
{{- define "fuel-system.imagePullSecrets" -}}
{{- if .Values.global.imagePullSecrets }}
imagePullSecrets:
{{- range .Values.global.imagePullSecrets }}
  - name: {{ . }}
{{- end }}
{{- end }}
{{- end }}

