# Authentication System - Step-by-Step Explanation

## Overview
This system implements time-based session expiry where all users are automatically logged out at 12:00 PM (Europe/Athens timezone) every day. Users must re-enter their password after this time.

---

## 📁 File Functions

### 1. `src/util/sessionExpiry.ts` - **Session Expiry Calculator**
**Purpose:** Calculates when a JWT token should expire based on Athens timezone rules.

**What it does:**
- Gets current time in Europe/Athens timezone
- Determines if it's before or after 12:00 PM Athens time
- If **before 12:00 PM** → Token expires at 12:00 PM **same day**
- If **after 12:00 PM** → Token expires at 12:00 PM **next day**
- Returns Unix timestamp (in seconds) for JWT `exp` claim

**Example:**
```
Login at 10:00 AM Athens → Expires at 12:00 PM same day
Login at 2:00 PM Athens → Expires at 12:00 PM next day
```

---

### 2. `src/lib/axios.ts` - **HTTP Request Interceptor**
**Purpose:** Intercepts all HTTP requests/responses to handle session expiration automatically.

**What it does:**

#### Request Interceptor (Lines 15-25):
- Runs **before** every API request
- Ensures `withCredentials: true` is set
- This allows HttpOnly cookies to be sent with requests

#### Response Interceptor (Lines 28-72):
- Runs **after** every API response
- **If response is 401 (Unauthorized):**
  - Checks if error is `SESSION_EXPIRED` or `UNAUTHORIZED`
  - Clears client-side storage (localStorage, sessionStorage)
  - Clears Zustand auth store
  - **Automatically redirects to `/login`**
  - Logs the session expiry message

**Why this is important:**
- No need to manually check for 401 in every component
- Automatic logout happens globally
- User is immediately redirected when session expires

---

### 3. `src/components/AxiosProvider.tsx` - **Interceptor Initializer**
**Purpose:** Ensures axios interceptors are set up when the app loads.

**What it does:**
- Client-side component that runs on app mount
- Imports `@/lib/axios` which sets up the interceptors
- Wraps the entire app in the layout

**Why needed:**
- Interceptors must be set up on client-side only
- This component ensures they're initialized once when app starts

---

### 4. `src/app/api/employeelogin/route.ts` - **Login Endpoint**
**Purpose:** Handles user login and creates JWT token with timezone-aware expiry.

**Step-by-step:**
1. Validates email/password
2. Checks password expiry (for non-SuperAdmin users)
3. **Calls `getSessionExpiryTimestamp()`** to calculate expiry
4. Creates JWT token with calculated expiry time
5. **Sets HttpOnly cookie** with:
   - `httpOnly: true` (prevents JavaScript access)
   - `secure: true` (HTTPS only in production)
   - `sameSite: "strict"` (prevents CSRF)
   - `expires: calculated expiry date`
6. Returns token data to frontend
7. Logs login event with expiry timestamp

**Key point:** Cookie is set **server-side**, frontend cannot access it (security)

---

### 5. `src/app/api/verify-otp/route.ts` - **OTP Verification Endpoint**
**Purpose:** Handles OTP verification for SuperAdmin users.

**Same flow as login:**
- Verifies OTP
- Calculates session expiry
- Creates JWT with timezone-aware expiry
- Sets secure HttpOnly cookie

---

### 6. `src/util/getDataFromToken.ts` - **Token Validator**
**Purpose:** Validates JWT token from cookies and extracts user data.

**What it does:**
1. Gets token from HttpOnly cookie
2. Verifies token signature using `jose` library
3. Checks if token is expired
4. **If expired/invalid:** Throws `SessionExpiredError` with code `SESSION_EXPIRED`
5. **If valid:** Returns token payload (user data)

**Error handling:**
- `SessionExpiredError` - Custom error with `SESSION_EXPIRED` code
- Used by middleware to return proper 401 responses

---

### 7. `src/middleware.ts` - **Route Protector**
**Purpose:** Protects all routes (pages and API) by validating tokens.

**What it does:**

#### For API Routes (`/api/*`):
1. Checks for token in cookie
2. If token exists → Validates it using `getDataFromToken()`
3. **If expired/invalid:**
   - Returns **401 JSON response** with `{ error: "SESSION_EXPIRED", message: "..." }`
   - Deletes cookie
4. **If valid:** Allows request to proceed

#### For Page Routes (non-API):
1. Checks for token in cookie
2. Validates token
3. **If expired/invalid:**
   - Redirects to `/login`
   - Deletes cookie
4. **If valid:** Checks role-based access
5. Allows or redirects based on user role

**Key point:** This runs **before** any route handler, ensuring all routes are protected

---

### 8. `src/app/login/page.tsx` - **Login Page**
**Purpose:** User interface for login.

**What changed:**
- **Removed** `Cookies.set("token", ...)` calls
- Cookie is now **only** set server-side
- Frontend just stores token data in Zustand store (for UI display)
- Token itself is in HttpOnly cookie (secure)

---

## 🔄 Complete Flow Examples

### Example 1: User Logs In at 10:00 AM (Athens Time)

```
1. User enters email/password → POST /api/employeelogin
2. Server validates credentials
3. Server calls getSessionExpiryTimestamp()
   - Current time: 10:00 AM Athens
   - Since < 12:00 PM → Expires at 12:00 PM same day
   - Returns: Unix timestamp for today 12:00 PM
4. Server creates JWT with exp = 12:00 PM today
5. Server sets HttpOnly cookie with token
6. Server returns success + token data
7. Frontend stores token data in Zustand (for UI)
8. User is redirected to dashboard
```

### Example 2: User Makes API Request at 11:30 AM

```
1. User clicks button → Component calls axios.get("/api/some-endpoint")
2. Axios request interceptor adds withCredentials: true
3. Browser automatically sends HttpOnly cookie with request
4. Middleware intercepts request
5. Middleware calls getDataFromToken()
6. Token is validated → Still valid (expires at 12:00 PM)
7. Request proceeds to API handler
8. API returns data
9. User sees data
```

### Example 3: Session Expires at 12:00 PM

```
1. User makes API request at 12:01 PM
2. Middleware intercepts request
3. Middleware calls getDataFromToken()
4. Token validation fails → Token expired (exp was 12:00 PM)
5. getDataFromToken() throws SessionExpiredError
6. Middleware catches error
7. For API route:
   - Returns 401 JSON: { error: "SESSION_EXPIRED", message: "..." }
8. Axios response interceptor catches 401
9. Interceptor:
   - Clears localStorage/sessionStorage
   - Clears Zustand store
   - Redirects to /login
10. User sees login page
```

### Example 4: User Logs In at 2:00 PM (After Cutoff)

```
1. User enters credentials → POST /api/employeelogin
2. Server calls getSessionExpiryTimestamp()
   - Current time: 2:00 PM Athens
   - Since > 12:00 PM → Expires at 12:00 PM next day
   - Returns: Unix timestamp for tomorrow 12:00 PM
3. Server creates JWT with exp = 12:00 PM tomorrow
4. User can work until 12:00 PM next day
```

---

## 🔒 Security Features

### 1. HttpOnly Cookies
- Cookie cannot be accessed by JavaScript
- Prevents XSS attacks from stealing tokens
- Only sent automatically by browser

### 2. SameSite: Strict
- Cookie only sent on same-site requests
- Prevents CSRF attacks
- External sites cannot use the cookie

### 3. Secure Flag (Production)
- Cookie only sent over HTTPS
- Prevents man-in-the-middle attacks

### 4. Server-Side Validation
- Every request validated by middleware
- Frontend cannot bypass validation
- No client-side timers (unreliable)

### 5. Automatic Logout
- Axios interceptor handles 401 globally
- No need to check in every component
- Consistent behavior across app

---

## 🎯 Key Design Decisions

### Why HttpOnly Cookies?
- **Security:** JavaScript cannot access them (XSS protection)
- **Automatic:** Browser sends them with every request
- **No manual handling:** No need to add Authorization headers

### Why Middleware?
- **Centralized:** All routes protected in one place
- **Consistent:** Same validation logic everywhere
- **Early:** Runs before route handlers

### Why Axios Interceptor?
- **Global:** Handles 401 for all API calls
- **Automatic:** No need to check in every component
- **Clean:** Components don't need error handling for auth

### Why Timezone-Aware Expiry?
- **Business requirement:** All users logout at same time (12:00 PM Athens)
- **Fair:** Everyone gets same session duration
- **Predictable:** Users know when they'll be logged out

---

## 📊 Flow Diagram

```
┌─────────────┐
│   User      │
│   Login     │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  /api/employeelogin │
│  - Validate creds   │
│  - Calculate expiry  │
│  - Create JWT        │
│  - Set HttpOnly      │
│    cookie            │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Browser stores     │
│  HttpOnly cookie    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  User makes request │
│  axios.get("/api/") │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Axios Interceptor  │
│  (Request)          │
│  - Add credentials   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Middleware         │
│  - Get token        │
│  - Validate token   │
│  - Check expiry     │
└──────┬──────────────┘
       │
       ├─── Valid ────► API Handler ──► Response
       │
       └─── Invalid ──► 401 Response
                        │
                        ▼
                   ┌─────────────────────┐
                   │  Axios Interceptor  │
                   │  (Response)         │
                   │  - Clear storage     │
                   │  - Redirect /login  │
                   └─────────────────────┘
```

---

## 🧪 Testing Scenarios

### Scenario 1: Login Before Noon
- **Time:** 10:00 AM Athens
- **Expected:** Token expires at 12:00 PM same day
- **Test:** Make request at 11:59 AM → Should work
- **Test:** Make request at 12:01 PM → Should get 401

### Scenario 2: Login After Noon
- **Time:** 2:00 PM Athens
- **Expected:** Token expires at 12:00 PM next day
- **Test:** Make request at 11:59 PM → Should work
- **Test:** Make request at 12:01 PM next day → Should get 401

### Scenario 3: Multiple Users
- **User A:** Logs in at 10:00 AM → Expires 12:00 PM
- **User B:** Logs in at 2:00 PM → Expires 12:00 PM next day
- **Both:** Get logged out at their respective expiry times

---

## 🔍 Debugging Tips

### Check Token Expiry
```javascript
// In browser console (if token was accessible, but it's HttpOnly)
// Check server logs for expiry calculation
```

### Check Middleware
- Look for middleware logs in server console
- Check if token validation is happening

### Check Axios Interceptor
- Look for "🔒 Session expired" in browser console
- Check if redirect to /login happens

### Common Issues
1. **Cookie not being sent:** Check `withCredentials: true`
2. **Token expired immediately:** Check timezone calculation
3. **401 but no redirect:** Check axios interceptor setup
4. **Middleware not running:** Check matcher pattern in config

---

## 📝 Summary

This system ensures:
- ✅ All users logged out at 12:00 PM Athens time
- ✅ Secure token storage (HttpOnly cookies)
- ✅ Automatic session expiry handling
- ✅ Server-side enforcement (no client-side timers)
- ✅ Scalable (stateless JWT)
- ✅ No refresh tokens (simpler, more secure)

