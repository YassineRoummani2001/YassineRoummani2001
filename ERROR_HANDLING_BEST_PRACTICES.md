# Error Handling Best Practices - Email Validation

This document outlines the best practices implemented for handling unique email validation in the Vibe application.

## Table of Contents

1. [Backend Error Handling](#backend-error-handling)
2. [Frontend Error Handling](#frontend-error-handling)
3. [UX Best Practices](#ux-best-practices)
4. [Accessibility](#accessibility)

---

## Backend Error Handling

### 1. Database-Level Enforcement

**MongoDB Schema Configuration:**

```javascript
email: { 
  type: String, 
  required: true, 
  unique: true,        // Enforces uniqueness at DB level
  lowercase: true,     // Normalizes email to lowercase
  trim: true,          // Removes whitespace
  index: true          // Creates index for fast lookups
}
```

**Benefits:**

- Prevents race conditions (two simultaneous requests with same email)
- Ensures data integrity even if application-level validation is bypassed
- Improves query performance with indexed field

### 2. Application-Level Validation

**Pre-Database Validation:**

```javascript
// 1. Check required fields
if (!name || !email || !password) {
    return res.status(400).json({ 
        message: 'All fields are required',
        field: !name ? 'name' : !email ? 'email' : 'password'
    });
}

// 2. Validate email format
if (!isValidEmail(email)) {
    return res.status(400).json({ 
        message: 'Please enter a valid email address',
        field: 'email'
    });
}

// 3. Check for existing user
const normalizedEmail = email.toLowerCase().trim();
const userExists = await User.findOne({ email: normalizedEmail });

if (userExists) {
    return res.status(409).json({ 
        message: 'This email is already in use',
        field: 'email',
        code: 'EMAIL_EXISTS'
    });
}
```

### 3. Proper HTTP Status Codes

| Status Code | Use Case | Example |
|------------|----------|---------|
| **200 OK** | Successful GET request | Fetching user data |
| **201 Created** | Successful resource creation | User registered successfully |
| **400 Bad Request** | Validation error (format, length, etc.) | Invalid email format |
| **401 Unauthorized** | Authentication failed | Wrong password |
| **409 Conflict** | Resource already exists | Duplicate email |
| **500 Internal Server Error** | Server-side error | Database connection failed |

### 4. MongoDB Duplicate Key Error Handling

```javascript
catch (error) {
    // Handle MongoDB duplicate key error (E11000)
    if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(409).json({ 
            message: field === 'email' 
                ? 'This email is already in use' 
                : 'This handle is already taken',
            field: field,
            code: 'DUPLICATE_KEY'
        });
    }
    
    // Generic server error
    res.status(500).json({ 
        message: 'Server error. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
}
```

---

## Frontend Error Handling

### 1. Client-Side Validation

**Email Format Validation:**

```typescript
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (email: string) => {
    if (!email) return '';
    if (!EMAIL_REGEX.test(email)) {
        return 'Please enter a valid email address';
    }
    return '';
};
```

**Benefits:**

- Immediate feedback to users
- Reduces unnecessary API calls
- Improves user experience

### 2. Field-Specific Error States

```typescript
// Separate error state for each field
const [nameError, setNameError] = useState('');
const [emailError, setEmailError] = useState('');
const [passwordError, setPasswordError] = useState('');

// Clear error when user starts typing
const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) {
        setEmailError('');
    }
};
```

### 3. Response Status Code Handling

```typescript
if (response.ok) {
    // Success (200-299)
    Toast.show({
        type: 'success',
        text1: 'Account Created! 🎉',
        text2: 'Welcome to Vibe! Please login.',
    });
    router.replace('/auth/login');
} else if (response.status === 409) {
    // Conflict - Duplicate email
    if (data.field === 'email') {
        setEmailError('This email is already in use');
        Toast.show({
            type: 'error',
            text1: 'Email Already Registered',
            text2: 'This email is already in use. Try logging in instead.',
        });
    }
} else if (response.status === 400) {
    // Bad Request - Validation error
    if (data.field === 'email') {
        setEmailError(data.message);
    }
    Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: data.message || 'Please check your input',
    });
}
```

### 4. Loading State Management

```typescript
const [loading, setLoading] = useState(false);

const handleSignup = async () => {
    setLoading(true);
    try {
        // API call
    } catch (error) {
        // Error handling
    } finally {
        setLoading(false); // Always reset loading state
    }
};

// Disable button during loading
<TouchableOpacity 
    disabled={loading}
    style={[
        styles.signupButton,
        loading && styles.signupButtonDisabled
    ]}
>
```

**Benefits:**

- Prevents multiple simultaneous requests
- Provides visual feedback to users
- Prevents race conditions

---

## UX Best Practices

### 1. Visual Error Indicators

**Red Border on Error:**

```typescript
<View style={[
    styles.inputContainer,
    {
        borderColor: emailError ? '#FF3B30' : 'rgba(0,0,0,0.1)',
        borderWidth: emailError ? 2 : 1
    }
]}>
```

**Red Icon on Error:**

```typescript
<Mail 
    size={20} 
    color={emailError ? '#FF3B30' : isDark ? "#ccc" : "#666"} 
/>
```

**Error Text Below Input:**

```typescript
{emailError ? (
    <Text style={styles.errorText}>{emailError}</Text>
) : null}
```

### 2. User-Friendly Error Messages

| Technical Error | User-Friendly Message |
|----------------|----------------------|
| "Validation failed: email" | "Please enter a valid email address" |
| "Duplicate key error" | "This email is already in use" |
| "Network request failed" | "Please check your connection and try again" |
| "500 Internal Server Error" | "Server error. Please try again later" |

### 3. Toast Notifications

```typescript
// Success
Toast.show({
    type: 'success',
    text1: 'Account Created! 🎉',
    text2: 'Welcome to Vibe! Please login.',
});

// Error
Toast.show({
    type: 'error',
    text1: 'Email Already Registered',
    text2: 'This email is already in use. Try logging in instead.',
});
```

### 4. Progressive Disclosure

1. **Inline validation** - Show errors as user types (optional)
2. **Submit validation** - Validate all fields on submit
3. **Server validation** - Final check with database
4. **Clear feedback** - Show specific error messages

---

## Accessibility

### 1. Semantic HTML/Components

```typescript
<TextInput
    accessibilityLabel="Email address"
    accessibilityHint="Enter your email address"
    aria-invalid={!!emailError}
    aria-describedby={emailError ? "email-error" : undefined}
/>

{emailError ? (
    <Text 
        id="email-error" 
        style={styles.errorText}
        accessibilityRole="alert"
    >
        {emailError}
    </Text>
) : null}
```

### 2. Color Contrast

- Error text: `#FF3B30` (red) with sufficient contrast
- Error border: 2px width for visibility
- Icon color changes to match error state

### 3. Keyboard Navigation

```typescript
<TextInput
    editable={!loading}  // Disable during loading
    returnKeyType="next" // Navigate to next field
    onSubmitEditing={() => passwordRef.current?.focus()}
/>
```

### 4. Screen Reader Support

- Use `accessibilityLabel` for input fields
- Use `accessibilityRole="alert"` for error messages
- Announce errors immediately when they occur

---

## Testing Checklist

### Backend Tests

- [ ] Valid email creates user successfully
- [ ] Duplicate email returns 409 status
- [ ] Invalid email format returns 400 status
- [ ] Missing fields return 400 status
- [ ] Case-insensitive email matching works
- [ ] MongoDB unique constraint is enforced

### Frontend Tests

- [ ] Email validation regex works correctly
- [ ] Error states display properly
- [ ] Loading state prevents multiple submissions
- [ ] Error messages are user-friendly
- [ ] Visual indicators (red border, icon) appear
- [ ] Toast notifications show correct messages
- [ ] Form clears errors when user types
- [ ] Button is disabled during loading

### Integration Tests

- [ ] Full signup flow works end-to-end
- [ ] Duplicate email scenario handled gracefully
- [ ] Network errors handled properly
- [ ] Success redirects to login page
- [ ] Token is generated and returned

---

## Security Considerations

1. **Never expose internal errors** in production
2. **Hash passwords** before storing (already implemented with bcrypt)
3. **Use HTTPS** for all API requests
4. **Implement rate limiting** to prevent brute force attacks
5. **Validate on both client and server** (defense in depth)
6. **Sanitize user input** to prevent injection attacks
7. **Use environment variables** for sensitive data

---

## Performance Optimization

1. **Database indexing** on email field for fast lookups
2. **Client-side validation** to reduce unnecessary API calls
3. **Debounce real-time validation** (if implemented)
4. **Efficient error state management** (only update when needed)
5. **Lazy loading** of validation utilities

---

## Future Enhancements

1. **Real-time email availability check** (with debouncing)
2. **Email verification** via confirmation link
3. **Social login** (Google, Facebook, etc.)
4. **Password strength meter**
5. **Captcha** for bot prevention
6. **Two-factor authentication**
7. **Account recovery** via email

---

## Summary

This implementation provides:

- ✅ Database-level uniqueness enforcement
- ✅ Application-level validation
- ✅ Proper HTTP status codes (409 for duplicates)
- ✅ User-friendly error messages
- ✅ Visual error indicators
- ✅ Loading state management
- ✅ Accessibility support
- ✅ Security best practices

The combination of database constraints, application validation, and excellent UX creates a robust and user-friendly signup experience.
