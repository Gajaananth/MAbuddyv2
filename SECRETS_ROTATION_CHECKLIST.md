# 🔐 MA Buddy v2 — Secrets Rotation Checklist

**Generated:** 2026-09-28
**Status:** 🚨 ALL SECRETS BELOW ARE EXPOSED — ROTATE IMMEDIATELY

---

## ⚠️ CRITICAL: These credentials have been found in `.env` files and git history

### 1. Database Passwords (Supabase)
- [ ] **Production DB** — `postgresql://postgres.ebuujmdhrpypddxawjif:[REDACTED]@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres`
  - Rotate at: https://supabase.com/dashboard/project/ebuujmdhrpypddxawjif/settings/database
  - Generate new password and update `DATABASE_URL` in Vercel
- [ ] **Dev DB** — `postgresql://postgres:[REDACTED]@db.nyltgmuxvxockuqsqank.supabase.co:5432/postgres`
  - Rotate at: https://supabase.com/dashboard/project/nyltgmuxvxockuqsqank/settings/database

### 2. AI Provider API Keys
- [ ] **OpenAI** — `[REDACTED]`
  - Revoke at: https://platform.openai.com/api-keys
- [ ] **Google Gemini** — `[REDACTED]`
  - Revoke at: https://aistudio.google.com/apikey
- [ ] **Qwen (Alibaba)** — `[REDACTED]`
  - Revoke at: https://dashscope.aliyun.com/api-key
- [ ] **GROQ** — `[REDACTED]`
  - Revoke at: https://console.groq.com/keys
- [ ] **NVIDIA** — `[REDACTED]`
  - Revoke at: https://build.nvidia.com/explore/api-keys
- [ ] **Moltbook** — `[REDACTED]`
  - Revoke at: https://moltbook.com/api-keys

### 3. Authentication Secrets
- [ ] **JWT_SECRET** — `[REDACTED]` (WEAK, static)
  - Generate: `openssl rand -base64 32`
  - Update in Vercel: `JWT_SECRET`, `NEXTAUTH_SECRET`
- [ ] **Vercel OIDC Token** — Hardcoded JWT in `.env.local`
  - Remove from `.env.local` — use Vercel's built-in OIDC

### 4. Push Notification Keys (VAPID)
- [ ] **VAPID_PUBLIC_KEY** — `[REDACTED]`
- [ ] **VAPID_PRIVATE_KEY** — `[REDACTED]`
  - Regenerate: `npx web-push generate-vapid-keys`
  - Update in Vercel: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

---

## ✅ After Rotation

1. Update Vercel Environment Variables dashboard with new values
2. Delete local `.env`, `.env.local`, `.env.vercel` files
3. Verify `.gitignore` covers all `.env*` files
4. Run `git filter-branch` or `BFG Repo-Cleaner` to purge secrets from git history
5. Re-deploy to Vercel

---

## 📋 Verification

- [ ] `npm run dev` starts without TLS errors
- [ ] `backend/diagnose_brain.ts` shows all keys present
- [ ] Database connection succeeds with `rejectUnauthorized: true`
- [ ] `npm audit` shows reduced vulnerabilities
- [ ] Health endpoint `/api/health` returns `brain_status` with live keys