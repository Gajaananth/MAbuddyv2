# 🔐 LOGIN RECOVERY GUIDE - MA BUDDY v2

## Problem Summary
You've hit the **3-device login limit** because you changed your mobile and PC. The system doesn't recognize your new devices, so you're locked out.

**Device Limit Rules:**
- Admin (first user): 5 devices allowed
- Standard operators: 3 devices allowed

---

## ✅ SOLUTION: Two Recovery Methods

### **Method 1: Use Security Questions (Recommended) ⭐**

This is the fastest recovery method using your security identifiers.

#### Step 1: Reset Your PIN
Use the **Forgot PIN** endpoint with your security identifiers:

**Endpoint:** `POST /api/auth/forgot-pin`

**Request Body:**
```json
{
  "dob": "1998-08-17",           // Your Date of Birth (YYYY-MM-DD format)
  "q1": "your answer to Q1",     // First security question answer
  "q2": "your answer to Q2",     // Second security question answer  
  "q3": 2024,                    // Third security question answer (year)
  "newPin": "123456"             // Your new PIN (6-12 digits)
}
```

**Example curl command:**
```bash
curl -X POST http://localhost:3001/api/auth/forgot-pin \
  -H "Content-Type: application/json" \
  -d '{
    "dob": "1998-08-17",
    "q1": "pet name",
    "q2": "first car",
    "q3": 2024,
    "newPin": "654321"
  }'
```

#### Step 2: Login on Your New Device
Once PIN is reset, login normally:

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "pin": "654321",
  "identifiers": {
    "dob": "1998-08-17",
    "q1": "your answer to Q1",
    "q2": "your answer to Q2",
    "q3": 2024
  },
  "device": {
    "identifier": "device-name",
    "fingerprint": "device-fingerprint",
    "os": "Windows/iOS/Android"
  }
}
```

**What happens:**
- ✅ System verifies your security questions
- ✅ Your new device is **auto-linked** to your account
- ✅ You receive a JWT token for authentication
- ✅ You're back in! 🎉

---

### **Method 2: Remove Old Devices (If You Have Access)**

If you still have access on one of your old devices:

#### Step 1: Login on the Old Device
Get authenticated with a valid token.

#### Step 2: View Your Registered Devices
**Endpoint:** `GET /api/auth/devices`

**Headers:**
```
Authorization: Bearer {your-jwt-token}
```

**Response:**
```json
{
  "success": true,
  "devices": [
    {
      "id": "device-id-1",
      "device_identifier": "iPhone-12",
      "os_type": "iOS",
      "created_at": "2024-01-01T10:00:00Z"
    },
    {
      "id": "device-id-2",
      "device_identifier": "MacBook-Pro",
      "os_type": "macOS",
      "created_at": "2024-02-15T14:30:00Z"
    },
    {
      "id": "device-id-3",
      "device_identifier": "Dell-Laptop",
      "os_type": "Windows",
      "created_at": "2024-06-20T09:15:00Z"
    }
  ]
}
```

#### Step 3: Remove Old Devices
**Endpoint:** `DELETE /api/auth/devices/{device-id}`

**Example:**
```bash
curl -X DELETE http://localhost:3001/api/auth/devices/device-id-2 \
  -H "Authorization: Bearer {your-jwt-token}"
```

**Repeat** for all old devices until you free up slots.

#### Step 4: Login on New Device
Now you have room to link your new devices! Login normally:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "your-pin",
    "device": {
      "identifier": "new-mobile-name",
      "fingerprint": "new-device-fingerprint",
      "os": "iOS"
    }
  }'
```

---

## 🔧 Testing the Recovery

### Frontend Testing (React/Web)
```typescript
// Forgot PIN
async function recoverAccount() {
  const response = await fetch('/api/auth/forgot-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dob: '1998-08-17',
      q1: 'Your Q1 Answer',
      q2: 'Your Q2 Answer',
      q3: 2024,
      newPin: '123456'
    })
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('PIN reset successful! Now login with new PIN.');
  }
}

// Login on new device
async function loginNewDevice() {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pin: '123456',
      identifiers: {
        dob: '1998-08-17',
        q1: 'Your Q1 Answer',
        q2: 'Your Q2 Answer',
        q3: 2024
      },
      device: {
        identifier: 'new-mobile',
        fingerprint: navigator.userAgent,
        os: 'iOS'
      }
    })
  });
  
  const { token, user } = await response.json();
  if (token) {
    localStorage.setItem('authToken', token);
    console.log('✅ Logged in! User ID:', user.id);
  }
}
```

---

## ⚠️ Security Notes

### What You Need to Remember:
1. **DOB Format:** Must match exactly (YYYY-MM-DD)
2. **Security Answers:** Case-insensitive, spaces trimmed
3. **Device Fingerprint:** Use browser userAgent or device ID
4. **JWT Token:** Valid for 72 hours after login

### What Happens During Recovery:
- ✅ System verifies DOB matches your registration
- ✅ System verifies all 3 security questions match
- ✅ Only then is PIN changed
- ✅ No email or SMS confirmations needed (trusted recovery)

---

## 🚨 If Recovery Doesn't Work

### Issue: "VERIFICATION FAILED: Security identifiers do not match"

**Possible causes:**
1. ❌ DOB doesn't match registration format
2. ❌ Security answers have typos
3. ❌ You're using the wrong account

**Solutions:**
1. Double-check DOB format: `YYYY-MM-DD`
2. Try security answers without extra spaces/punctuation
3. Make sure you're using the email/identifiers from registration

### Issue: "DEVICE_LIMIT_EXCEEDED"

This means you still have 3 devices linked:
1. Use Method 2 to remove old devices first
2. Then login on new device

---

## 📱 How Device Fingerprints Work

The system uses a combination of:
- Device identifier (phone model, computer name)
- Device fingerprint (browser userAgent or hardware ID)
- OS type (iOS, Android, Windows, macOS)

**Example fingerprints:**
```
Web Browser:
"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."

Mobile:
"iPhone-13-Pro-Max"

Desktop:
"MacBook-Pro-M1"
```

---

## ✅ Complete Login Recovery Checklist

- [ ] Remember your DOB (in YYYY-MM-DD format)
- [ ] Remember answers to 3 security questions
- [ ] Call `/api/auth/forgot-pin` with new PIN
- [ ] Get confirmation: `"success": true`
- [ ] Call `/api/auth/login` with new PIN + identifiers
- [ ] Receive JWT token
- [ ] Store token in localStorage/sessionStorage
- [ ] ✅ You're logged in!

---

## 🔗 Related Authentication Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|----------------|
| `/api/auth/register` | POST | Create new account | ❌ No |
| `/api/auth/login` | POST | Login with PIN | ❌ No |
| `/api/auth/forgot-pin` | POST | Reset PIN via security Q | ❌ No |
| `/api/auth/change-pin` | POST | Change PIN (logged in) | ✅ Yes |
| `/api/auth/devices` | GET | List your devices | ✅ Yes |
| `/api/auth/devices/:id` | DELETE | Remove a device | ✅ Yes |
| `/api/auth/biometrics/register-options` | GET | Setup fingerprint | ✅ Yes |

---

## 💡 Pro Tips

1. **Save your security answers** somewhere safe for future recovery
2. **Remove old devices regularly** to avoid hitting the 3-device limit
3. **Enable biometrics** on new devices after login for faster access
4. **Keep one device** on your old PIN until you fully migrate to new one

---

**Generated:** August 15, 2026  
**For:** MA Buddy v2 Authentication Recovery
