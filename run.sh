#!/usr/bin/env sh
set -x   # ⭐ 開啟 sh 的 debug mode：每一行執行都會印出來（超好用）

echo "🚀 Node.js Runner Add-on starting..."
echo "--------------------------------------"

# Print environment variables
echo "🔍 ENV CHECK:"
env

echo "--------------------------------------"
echo "📁 DEBUG: Listing important directories..."

echo "🔍 / (root)"
ls -al /

echo "🔍 /usr"
ls -al /usr

echo "🔍 /usr/src"
ls -al /usr/src

echo "🔍 /usr/src/app"
ls -al /usr/src/app

echo "🔍 /usr/src/app/scripts"
ls -al /usr/src/app/scripts

echo "--------------------------------------"
echo "🔍 DEBUG: SCRIPT env var is: '${SCRIPT}'"

if [ -z "$SCRIPT" ]; then
  echo "❌ SCRIPT is empty. Stopping."
  exit 1
fi

echo "▶️ Running script: '$SCRIPT'"
cd /usr/src/app/scripts || exit 1

node "$SCRIPT"