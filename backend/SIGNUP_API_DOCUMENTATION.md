# User Registration API - Email Validation Example

## Endpoint

`POST /api/auth/register`

## Description

Creates a new user account with comprehensive validation including unique email enforcement at the database level.

## Request Body

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

## Validation Rules

### Name

- **Required**: Yes
- **Min Length**: 2 characters
- **Max Length**: 50 characters
- **Trimmed**: Whitespace removed from start/end

### Email

- **Required**: Yes
- **Format**: Valid email format (<user@domain.com>)
- **Unique**: Must not already exist in database
- **Case-Insensitive**: Automatically converted to lowercase
- **Trimmed**: Whitespace removed

### Password

- **Required**: Yes
- **Min Length**: 6 characters

## Success Response (201 Created)

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "avatar": "https://cdn-icons-png.flaticon.com/512/149/149071.png",
  "handle": "@johndoe123",
  "coverImage": "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&fit=crop&q=80",
  "bio": "",
  "pronouns": "",
  "gender": "",
  "links": [],
  "phone": "",
  "stories": [],
  "following": [],
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Error Responses

### 400 Bad Request - Missing Fields

```json
{
  "message": "All fields are required",
  "field": "email"
}
```

### 400 Bad Request - Invalid Email Format

```json
{
  "message": "Please enter a valid email address",
  "field": "email"
}
```

### 400 Bad Request - Invalid Name

```json
{
  "message": "Name must be between 2 and 50 characters",
  "field": "name"
}
```

### 400 Bad Request - Weak Password

```json
{
  "message": "Password must be at least 6 characters long",
  "field": "password"
}
```

### 409 Conflict - Email Already Exists

```json
{
  "message": "This email is already in use",
  "field": "email",
  "code": "EMAIL_EXISTS"
}
```

### 500 Internal Server Error

```json
{
  "message": "Server error. Please try again later.",
  "error": "Detailed error message (development only)"
}
```

## Database Schema

The User model enforces uniqueness at the database level:

```javascript
email: { 
  type: String, 
  required: true, 
  unique: true,        // MongoDB unique index
  lowercase: true,     // Auto-convert to lowercase
  trim: true,          // Remove whitespace
  index: true          // Create index for fast lookups
}
```

## Frontend Integration Example

```javascript
const handleSignup = async () => {
  setLoading(true);
  setEmailError(''); // Clear previous errors
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Success - redirect to login or home
      Toast.show({
        type: 'success',
        text1: 'Account Created',
        text2: 'Welcome to Vibe!',
      });
      router.replace('/auth/login');
    } else {
      // Handle specific errors
      if (response.status === 409 && data.field === 'email') {
        setEmailError('This email is already in use');
        Toast.show({
          type: 'error',
          text1: 'Email Already Registered',
          text2: 'This email is already in use. Try logging in instead.',
        });
      } else if (response.status === 400 && data.field === 'email') {
        setEmailError(data.message);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Signup Failed',
          text2: data.message || 'Could not create account',
        });
      }
    }
  } catch (error) {
    console.error('Signup error:', error);
    Toast.show({
      type: 'error',
      text1: 'Network Error',
      text2: 'Please check your connection and try again.',
    });
  } finally {
    setLoading(false);
  }
};
```

## Best Practices

1. **Database Level**: Unique constraint prevents duplicates even if validation is bypassed
2. **Application Level**: Pre-validation provides better UX with specific error messages
3. **Case Insensitivity**: Emails are normalized to lowercase to prevent case-sensitive duplicates
4. **Error Codes**: Use 409 (Conflict) for duplicate resources, 400 for validation errors
5. **Field Identification**: Return the specific field that failed validation
6. **Security**: Never expose internal error details in production
7. **User Experience**: Provide clear, actionable error messages
