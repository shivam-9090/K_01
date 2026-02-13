# 🔐 2FA FLOW - COMPLETE ANALYSIS

## 📊 WHAT CHANGES AFTER 2FA ENABLE

### Database Changes (User Table):

```
BEFORE 2FA:
- isTwoFAEnabled: false
- twoFASecret: null
- twoFABackupCodes: []

AFTER 2FA:
- isTwoFAEnabled: true ✅
- twoFASecret: "encrypted_secret_string" ✅
- twoFABackupCodes: [10 hashed backup codes] ✅

UNCHANGED:
- email ❌ (stays same)
- role ❌ (stays same)
- company ❌ (stays same)
- isActive ❌ (stays same)
- companyId ❌ (stays same)
```

## 🔄 2FA ENABLE FLOW

### Step 1: Generate QR Code

**Frontend**: `TwoFASetup.tsx` → Click "Enable 2FA" → Enter password
**API Call**: `POST /2fa/generate-secret`
**Response**:

```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,...",
  "manualEntryKey": "JBSWY3DPEHPK3PXP"
}
```

### Step 2: Verify & Enable

**Frontend**: User scans QR → Enters 6-digit code from authenticator app
**API Call**: `POST /2fa/enable`
**Request**:

```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "token": "123456",
  "password": "current_password"
}
```

**Backend Process** (`2fa.service.ts`):

1. Verify password is correct
2. Verify TOTP code matches secret
3. Generate 10 backup codes
4. Hash backup codes with bcrypt
5. Encrypt secret with AES-256-GCM
6. Update database:
   ```typescript
   await prisma.user.update({
     where: { id: userId },
     data: {
       isTwoFAEnabled: true,
       twoFASecret: encryptedSecret,
       twoFABackupCodes: hashedBackupCodes,
     },
   });
   ```
7. Create audit log
8. Return backup codes to user (ONLY SHOWN ONCE)

**Response**:

```json
{
  "message": "2FA enabled successfully",
  "backupCodes": [
    "ABCD-1234-EFGH-5678",
    "IJKL-9012-MNOP-3456",
    ...8 more codes
  ],
  "warning": "Save these backup codes in a safe place..."
}
```

### Step 3: Frontend Updates Profile

**File**: `Profile.tsx` → `handle2FASuccess()`
**Process**:

1. Fetch fresh user data: `GET /users/me/profile`
2. Update localStorage: `localStorage.setItem('user', JSON.stringify(freshProfile))`
3. Update Zustand store: `updateUser(freshProfile)`
4. Refetch React Query: `await refetch()`
5. Close modal

## 🔓 2FA LOGIN FLOW

### Step 1: Initial Login

**API Call**: `POST /auth/login`
**Request**:

```json
{
  "email": "testboss@company.com",
  "password": "TestPass123!@#"
}
```

**Backend Check** (`auth.service.ts` line 150-180):

```typescript
if (user.isTwoFAEnabled) {
  // Return temporary token (5 min expiry)
  const tempToken = this.jwtService.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      temp: true,
      type: '2fa',
      fp: fingerprint(client),
    },
    { expiresIn: '5m' },
  );

  return {
    token: tempToken,
    requiresTwoFA: true,
  };
}

// Normal login without 2FA
return generateAuthResponse(user, client);
```

**Response** (2FA required):

```json
{
  "token": "eyJhbGc...", // 5-minute temp token
  "requiresTwoFA": true
}
```

### Step 2: Frontend Redirects to 2FA

**File**: `Login.tsx`
**Code**:

```typescript
if (err.response?.data?.requiresTwoFA) {
  navigate('/2fa-verify', {
    state: {
      token: err.response.data.token,
      email: data.email,
    },
  });
}
```

### Step 3: User Enters 2FA Code

**Page**: `/2fa-verify` → `TwoFAVerify.tsx`
**API Call**: `POST /2fa/verify-login`
**Request**:

```json
{
  "token": "eyJhbGc...", // temp token
  "code": "123456" // from authenticator app
}
```

**Backend Process** (`2fa.service.ts` line 150-200):

1. Verify temp token (check not expired, fingerprint matches)
2. Get user from database with `include: { company: true }`
3. Check if user is locked (too many failed attempts)
4. Decrypt 2FA secret
5. Verify TOTP code OR check backup codes
6. If valid:
   - Reset failed attempts
   - Create audit log
   - Call `authService.generateAuthResponse(user, client)`
7. If invalid:
   - Increment failed attempts
   - Lock account after 5 attempts (10 min)
   - Throw error

**Response** (successful):

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "cmk144x02...",
    "email": "testboss@company.com",
    "role": "BOSS",
    "isTwoFAEnabled": true,
    "mobile": null,
    "companyId": "cmk144x0e...",
    "isActive": true,
    "lastLogin": "2026-01-07T...",
    "company": {
      "id": "cmk144x0e...",
      "name": "Tech Solutions Inc",
      "ownerId": "cmk144x02..."
    }
  }
}
```

### Step 4: Save Auth Data & Redirect

**File**: `TwoFAVerify.tsx` → `handleSubmit()`
**Process**:

```typescript
// Save to localStorage
localStorage.setItem('accessToken', response.accessToken);
localStorage.setItem('refreshToken', response.refreshToken);
localStorage.setItem('user', JSON.stringify(response.user));

// Update Zustand store
updateUser(response.user);

// Hard redirect to dashboard
window.location.href = '/dashboard';
```

## 🐛 COMMON ISSUES & FIXES

### Issue 1: Wrong API Endpoint

**Problem**: Frontend calls `/auth/profile` but backend has `/users/me/profile`
**Fix**: Changed `auth.service.ts`:

```typescript
async getProfile() {
  const response = await api.get("/users/me/profile"); // ✅ Fixed
  return response.data;
}
```

### Issue 2: Login Not Saving to localStorage

**Problem**: Login only updated Zustand state, not localStorage
**Result**: Auth lost on page navigation
**Fix**: Updated `AuthContext.tsx`:

```typescript
// Save to localStorage AND Zustand
localStorage.setItem('accessToken', response.accessToken);
localStorage.setItem('refreshToken', response.refreshToken);
localStorage.setItem('user', JSON.stringify(response.user));

set({
  user: response.user,
  accessToken: response.accessToken,
  isAuthenticated: true,
  isLoading: false,
});
```

### Issue 3: localStorage Corruption with 2FA

**Problem**: When 2FA required, login tried to save incomplete response
**Fix**: Added check in `AuthContext.tsx`:

```typescript
if (response.requiresTwoFA) {
  console.log('🔒 2FA required - not saving to storage yet');
  set({ isLoading: false });
  throw { response: { data: response } }; // Let Login handle redirect
}
```

## 📋 API ENDPOINTS SUMMARY

### Auth Endpoints:

- `POST /auth/login` - Initial login (may require 2FA)
- `POST /auth/register` - Create new user
- `POST /auth/logout` - Logout user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/change-password` - Change password
- `GET /auth/me` - Get current user (basic info)

### 2FA Endpoints:

- `POST /2fa/generate-secret` - Generate QR code
- `POST /2fa/enable` - Enable 2FA with verification
- `POST /2fa/disable` - Disable 2FA
- `POST /2fa/verify-login` - Verify 2FA code during login

### User Endpoints:

- `GET /users/me` - Get current user
- `GET /users/me/profile` - Get full profile with company ✅ (CORRECT ONE)

## 🔑 KEY POINTS

1. **2FA ONLY changes 3 fields**: `isTwoFAEnabled`, `twoFASecret`, `twoFABackupCodes`
2. **All other user data stays the same**: email, role, company, etc.
3. **Backup codes shown ONCE**: Save them immediately after enabling
4. **Login with 2FA**: Returns temp token first, then full token after code verification
5. **Failed attempts**: Account locks after 5 failed 2FA attempts for 10 minutes
6. **Profile refresh**: Always fetch from API after 2FA enable/disable

## ✅ VERIFICATION CHECKLIST

After enabling 2FA:

- [ ] Profile shows "2FA Enabled" badge
- [ ] Backup codes downloaded/saved
- [ ] Logout and login again
- [ ] Asked for 2FA code
- [ ] Enter code from authenticator app
- [ ] Successfully logged in
- [ ] Profile still shows all data correctly
- [ ] Company name visible (for BOSS)
- [ ] Email, role unchanged
