#!/usr/bin/env bash
set -e

# ==============================================================================
# Autonomous Coding Agent Pipeline: BKSDA SuperApp
# Menjamin runnable check mandatory sebelum membuka GitHub Pull Request
# ==============================================================================

WORKSPACE="/opt/hermes/coding-sandbox/workspace/bksda-superapp"
BRANCH_NAME="$1"
COMMIT_MSG="$2"

if [ -z "$BRANCH_NAME" ] || [ -z "$COMMIT_MSG" ]; then
    echo "Penggunaan: ./run-agent-task.sh <branch-name> <commit-message>"
    echo "Contoh: ./run-agent-task.sh feat/st-approval-fix 'fix: perbaiki validasi role pimpinan'"
    exit 1
fi

echo "============================================================"
echo " [Hermes Coding Agent] Memulai Pipeline Eksekusi Tugas"
echo " Target Workspace: $WORKSPACE"
echo " Target Branch:    $BRANCH_NAME"
echo "============================================================"

cd "$WORKSPACE"

# 1. Pastikan repository bersih dan tersinkronisasi
echo "[1/5] Sinkronisasi branch upstream..."
git checkout development || git checkout main
git pull origin $(git branch --show-current)

# 2. Checkout atau buat branch baru
echo "[2/5] Checkout branch tugas: $BRANCH_NAME..."
git checkout -B "$BRANCH_NAME"

# 3. Eksekusi Runnable Checks (Backend PHPUnit)
echo "[3/5] Menjalankan Runnable Checks: Backend PHPUnit Tests..."
cd "$WORKSPACE/backend"
php artisan test --stop-on-failure

# 4. Eksekusi Runnable Checks (Frontend Next.js Build)
echo "[4/5] Menjalankan Runnable Checks: Frontend Next.js Production Build..."
cd "$WORKSPACE/frontend"
npm run build

# 5. Jika kedua pengujian 100% lulus, lakukan Git Push dan buka PR
echo "[5/5] Seluruh tes 100% HIJAU. Menerbitkan commit dan membuka GitHub PR..."
cd "$WORKSPACE"
git add .
git commit -m "$COMMIT_MSG" || echo "Tidak ada perubahan berkas baru."
git push origin "$BRANCH_NAME"

# Buat Pull Request jika belum ada
gh pr create \
    --title "$COMMIT_MSG" \
    --body "### Autonomous Coding Agent PR Summary
- **Branch**: \`$BRANCH_NAME\`
- **Runnable Checks**: Backend PHPUnit (PASS), Frontend Next.js Build (PASS)
- **Dihasilkan oleh**: Hermes Agent Sandbox (VM 108)" \
    --base development || echo "PR sudah terbuka atau perlu review."

echo "============================================================"
echo "✅ Pipeline Sukses! Pull Request siap direview di GitHub."
echo "============================================================"
