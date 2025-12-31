# Email Validation Flow Diagram

## Visual Flow Chart

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER SIGNUP FLOW                             │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │  User enters     │
                    │  email in form   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Frontend        │
                    │  validates       │
                    │  email format    │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Valid format?   │◄─── EMAIL_REGEX test
                    └────┬─────────┬───┘
                         │         │
                    NO   │         │  YES
                         │         │
                         ▼         ▼
              ┌──────────────┐   ┌──────────────────┐
              │  Show error  │   │  Submit to       │
              │  "Invalid    │   │  Backend API     │
              │   email"     │   │  POST /register  │
              └──────────────┘   └────────┬─────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │  Backend         │
                                  │  validates       │
                                  │  email format    │
                                  └────────┬─────────┘
                                           │
                                  ┌────────▼─────────┐
                                  │  Valid format?   │
                                  └────┬─────────┬───┘
                                       │         │
                                  NO   │         │  YES
                                       │         │
                                       ▼         ▼
                            ┌──────────────┐   ┌──────────────────┐
                            │  Return 400  │   │  Check database  │
                            │  Bad Request │   │  for existing    │
                            └──────────────┘   │  email           │
                                               └────────┬─────────┘
                                                        │
                                               ┌────────▼─────────┐
                                               │  Email exists?   │
                                               └────┬─────────┬───┘
                                                    │         │
                                               YES  │         │  NO
                                                    │         │
                                                    ▼         ▼
                                         ┌──────────────┐   ┌──────────────────┐
                                         │  Return 409  │   │  Create user     │
                                         │  Conflict    │   │  Hash password   │
                                         │  "Email in   │   │  Generate token  │
                                         │   use"       │   └────────┬─────────┘
                                         └──────┬───────┘            │
                                                │                    ▼
                                                │           ┌──────────────────┐
                                                │           │  Return 201      │
                                                │           │  Created         │
                                                │           │  + User data     │
                                                │           │  + Token         │
                                                │           └────────┬─────────┘
                                                │                    │
                                                ▼                    ▼
                                         ┌──────────────┐   ┌──────────────────┐
                                         │  Frontend    │   │  Frontend        │
                                         │  shows error │   │  shows success   │
                                         │  - Red border│   │  - Success toast │
                                         │  - Error text│   │  - Redirect to   │
                                         │  - Toast msg │   │    login page    │
                                         └──────────────┘   └──────────────────┘
```

---

## Detailed Component Breakdown

### 1. Frontend Validation (Client-Side)

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND VALIDATION                                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Input: email = "user@example.com"                      │
│                                                          │
│  Step 1: Check if empty                                 │
│  ├─ if (!email) → Show error                           │
│  └─ Continue ✓                                          │
│                                                          │
│  Step 2: Validate format                                │
│  ├─ Regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/               │
│  ├─ if (!EMAIL_REGEX.test(email)) → Show error         │
│  └─ Continue ✓                                          │
│                                                          │
│  Step 3: Normalize                                       │
│  ├─ email = email.toLowerCase().trim()                  │
│  └─ Result: "user@example.com"                          │
│                                                          │
│  Step 4: Submit to backend                              │
│  └─ fetch('/api/auth/register', { email, ... })        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 2. Backend Validation (Server-Side)

```
┌─────────────────────────────────────────────────────────┐
│  BACKEND VALIDATION                                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Input: { email: "user@example.com", ... }             │
│                                                          │
│  Step 1: Validate required fields                       │
│  ├─ if (!email) → Return 400                           │
│  └─ Continue ✓                                          │
│                                                          │
│  Step 2: Validate email format                          │
│  ├─ if (!isValidEmail(email)) → Return 400             │
│  └─ Continue ✓                                          │
│                                                          │
│  Step 3: Normalize email                                │
│  ├─ normalizedEmail = email.toLowerCase().trim()        │
│  └─ Result: "user@example.com"                          │
│                                                          │
│  Step 4: Check database                                 │
│  ├─ userExists = await User.findOne({ email })         │
│  ├─ if (userExists) → Return 409 Conflict              │
│  └─ Continue ✓                                          │
│                                                          │
│  Step 5: Create user                                    │
│  ├─ Hash password with bcrypt                           │
│  ├─ Generate unique handle                              │
│  ├─ Save to database                                    │
│  └─ Return 201 Created + token                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 3. Error Handling Flow

```
┌─────────────────────────────────────────────────────────┐
│  ERROR HANDLING                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  400 Bad Request (Validation Error)                     │
│  ├─ Invalid email format                                │
│  ├─ Missing required fields                             │
│  ├─ Weak password                                       │
│  └─ Frontend: Show red border + error text              │
│                                                          │
│  409 Conflict (Duplicate Email)                         │
│  ├─ Email already exists in database                    │
│  ├─ Response: { message, field: "email", code }        │
│  └─ Frontend: Show "Email already in use"               │
│                                                          │
│  500 Server Error                                       │
│  ├─ Database connection failed                          │
│  ├─ Unexpected server error                             │
│  └─ Frontend: Show "Server error, try again"            │
│                                                          │
│  Network Error (catch block)                            │
│  ├─ No internet connection                              │
│  ├─ Backend server down                                 │
│  └─ Frontend: Show "Check your connection"              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## State Transitions

### Email Input States

```
┌──────────┐
│  EMPTY   │ ──── User types ────▶ ┌──────────┐
└──────────┘                        │  TYPING  │
                                    └────┬─────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
            ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
            │  VALID       │    │  INVALID     │    │  DUPLICATE   │
            │  (Normal)    │    │  (Red)       │    │  (Red)       │
            └──────────────┘    └──────────────┘    └──────────────┘
                    │                    │                    │
                    └────────────────────┴────────────────────┘
                                         │
                                         ▼
                                 ┌──────────────┐
                                 │  User types  │
                                 │  again       │
                                 └──────┬───────┘
                                        │
                                        ▼
                                 ┌──────────────┐
                                 │  Error       │
                                 │  cleared     │
                                 └──────────────┘
```

### Button States

```
┌──────────────┐
│  ENABLED     │ ──── User clicks ────▶ ┌──────────────┐
│  "Sign Up"   │                         │  LOADING     │
└──────────────┘                         │  "Creating   │
                                         │   account..."│
                                         └──────┬───────┘
                                                │
                        ┌───────────────────────┼───────────────────────┐
                        │                       │                       │
                        ▼                       ▼                       ▼
                ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
                │  SUCCESS     │        │  ERROR       │        │  NETWORK     │
                │  Redirect    │        │  Show error  │        │  ERROR       │
                └──────────────┘        └──────────────┘        └──────────────┘
```

---

## Data Flow

### Request Flow

```
Frontend                    Backend                     Database
   │                          │                            │
   │  1. User enters email    │                            │
   │─────────────────────────▶│                            │
   │                          │                            │
   │  2. Validate format      │                            │
   │  (client-side)           │                            │
   │                          │                            │
   │  3. POST /register       │                            │
   │─────────────────────────▶│                            │
   │                          │  4. Validate format        │
   │                          │     (server-side)          │
   │                          │                            │
   │                          │  5. Check for duplicate    │
   │                          │───────────────────────────▶│
   │                          │                            │
   │                          │  6. Query result           │
   │                          │◀───────────────────────────│
   │                          │                            │
   │                          │  7. If new, create user    │
   │                          │───────────────────────────▶│
   │                          │                            │
   │  8. Response (201/409)   │                            │
   │◀─────────────────────────│                            │
   │                          │                            │
   │  9. Update UI            │                            │
   │  (success or error)      │                            │
   │                          │                            │
```

### Error Response Flow

```
Backend Error                Frontend Handling
     │                            │
     │  409 Conflict              │
     ├──────────────────────────▶ │  1. Check status code
     │  { message, field, code }  │  2. if (status === 409)
     │                            │  3. setEmailError(message)
     │                            │  4. Show red border
     │                            │  5. Show error text
     │                            │  6. Show toast
     │                            │
     │  400 Bad Request           │
     ├──────────────────────────▶ │  1. Check status code
     │  { message, field }        │  2. if (status === 400)
     │                            │  3. Set error for field
     │                            │  4. Show validation error
     │                            │
     │  500 Server Error          │
     ├──────────────────────────▶ │  1. Check status code
     │  { message }               │  2. if (status === 500)
     │                            │  3. Show generic error
     │                            │  4. Log for debugging
```

---

## Visual UI States

### Normal State

```
┌─────────────────────────────────┐
│ 📧  john@example.com            │  ← Gray border (1px)
└─────────────────────────────────┘
```

### Error State (Invalid Format)

```
┌═════════════════════════════════┐
│ 📧  invalid-email               │  ← Red border (2px)
└═════════════════════════════════┘
⚠️ Please enter a valid email address  ← Red text
```

### Error State (Duplicate)

```
┌═════════════════════════════════┐
│ 📧  existing@example.com        │  ← Red border (2px)
└═════════════════════════════════┘
⚠️ This email is already in use  ← Red text

┌─────────────────────────────────┐
│  ❌ Email Already Registered    │  ← Toast notification
│  This email is already in use.  │
│  Try logging in instead.        │
└─────────────────────────────────┘
```

### Loading State

```
┌─────────────────────────────────┐
│ 📧  john@example.com            │  ← Disabled (grayed)
└─────────────────────────────────┘

┌─────────────────────────────────┐
│    Creating account...          │  ← Button disabled
└─────────────────────────────────┘  ← Opacity: 0.6
```

---

## Summary

This flow ensures:

1. ✅ **Client-side validation** for immediate feedback
2. ✅ **Server-side validation** for security
3. ✅ **Database uniqueness** for data integrity
4. ✅ **Proper error codes** for clear communication
5. ✅ **User-friendly messages** for better UX
6. ✅ **Visual indicators** for accessibility
7. ✅ **Loading states** to prevent duplicate submissions

The multi-layered approach provides defense in depth while maintaining excellent user experience.
