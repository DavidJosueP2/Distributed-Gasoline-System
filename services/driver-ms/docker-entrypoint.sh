#!/bin/sh
set -e

echo "🚀 Starting Driver Service..."


# Iniciar la aplicación normalmente
echo "✅ Starting application..."
exec node dist/main.js
