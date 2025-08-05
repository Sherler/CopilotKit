# Cookie Authentication Implementation

## Overview

This Vue2 example supports both token-based and HttpOnly cookie-based authentication, depending on how your backend is configured.

## Cookie Format

The backend sets cookies in the following format:
```
AuthorizationToken=<token_value>; Path=/; Expires=Tue, 02 Sep 2025 12:09:34 GMT; HttpOnly; SameSite=Lax
```

## Authentication Flow

### 1. Login Process

**Request:**
```javascript
POST /api/v2/user/auth_token/get_token
Content-Type: application/json
credentials: include

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response Options:**

**Option A: JSON Token Response**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Option B: HttpOnly Cookie Response**
```
Set-Cookie: AuthorizationToken=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...; Path=/; Expires=Tue, 02 Sep 2025 12:09:34 GMT; HttpOnly; SameSite=Lax
```

### 2. API Requests

For subsequent API calls (like fetching agents), the implementation:

1. **Always includes `credentials: 'include'`** to ensure HttpOnly cookies are sent automatically
2. **Adds manual Cookie header** if access_token is available as fallback
3. **Handles both authentication methods** seamlessly

**Example Request:**
```javascript
GET /api/user/resources/suggestion_assistant
Content-Type: application/json
credentials: include
Cookie: AuthorizationToken=<token_value>  // Added manually if token available
```

## Implementation Details

### Login Method (`handleLogin`)

```javascript
const response = await fetch(`${this.basePath}/api/v2/user/auth_token/get_token`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // 重要：确保cookies被包含在请求中
  body: JSON.stringify({
    email: this.loginForm.email,
    password: this.loginForm.password,
  }),
});

// 检查服务器是否设置了HttpOnly cookie
const setCookieHeader = response.headers.get('Set-Cookie');
console.log('Set-Cookie header:', setCookieHeader);

// 如果服务器返回了access_token，保存到组件数据中作为备用
if (data.access_token) {
  this.accessToken = data.access_token;
  this.refreshToken = data.refresh_token;
} else {
  // 如果没有返回token但登录成功，说明使用的是HttpOnly cookie
  console.log('Login successful, using HttpOnly cookie authentication');
}
```

### API Requests (`fetchAgents`)

```javascript
// 构建请求配置
const requestConfig = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include' // 确保HttpOnly cookies被自动包含
};

// 如果有access_token作为备用，也添加到Cookie头中
if (this.accessToken) {
  console.log('Adding authorization token to request');
  requestConfig.headers['Cookie'] = `AuthorizationToken=${this.accessToken}`;
}

const response = await fetch(baseUrl, requestConfig);
```

## Security Benefits

### HttpOnly Cookies
- **XSS Protection**: HttpOnly cookies cannot be accessed by JavaScript, preventing XSS attacks from stealing tokens
- **Automatic Management**: Browser automatically includes cookies in requests
- **Secure Transmission**: Can be configured with Secure flag for HTTPS-only transmission

### SameSite Protection
- **CSRF Protection**: SameSite=Lax helps prevent CSRF attacks
- **Cross-origin Security**: Limits when cookies are sent with cross-site requests

## Browser Compatibility

- **credentials: 'include'**: Supported in all modern browsers
- **HttpOnly cookies**: Universally supported
- **SameSite attribute**: Supported in modern browsers (IE11+ with polyfills)

## Debugging

### Console Logs
The implementation includes detailed console logging:

```javascript
console.log('Set-Cookie header:', setCookieHeader);
console.log('Login successful, using HttpOnly cookie authentication');
console.log('Adding authorization token to request');
```

### Browser DevTools
1. **Network Tab**: Check if `Set-Cookie` headers are present in login response
2. **Application Tab**: View cookies in the Cookies section (only non-HttpOnly cookies visible)
3. **Console**: Monitor authentication flow logs

## Error Handling

### 401 Unauthorized
```javascript
if (response.status === 401) {
  // Token过期，需要重新登录
  this.handleLogout();
  throw new Error('Authentication expired. Please login again.');
}
```

### Token Refresh
The implementation stores refresh tokens for future token refresh functionality:

```javascript
// Future enhancement: automatic token refresh
if (data.refresh_token) {
  this.refreshToken = data.refresh_token;
}
```

## Configuration

### Environment Variables
```bash
# Backend base path
VUE_APP_BASE_PATH=https://your-api-domain.com

# Optional: Debug mode
VUE_APP_DEBUG=true
```

### Backend Requirements
Your backend should:
1. Set HttpOnly cookies in login response OR return JSON tokens
2. Accept cookies in subsequent API requests
3. Handle both Cookie header and automatic cookie transmission
4. Return proper CORS headers if frontend is on different domain

## Testing

### Local Development
```bash
# Start the Vue2 example
cd packages/vue2-example
npm run serve

# Test login flow
# 1. Enter credentials
# 2. Check browser DevTools Network tab for Set-Cookie headers
# 3. Verify agent list loads successfully
```

### Production Considerations
- Ensure HTTPS is used in production for secure cookie transmission
- Configure proper CORS headers on backend
- Set appropriate cookie expiration times
- Consider implementing refresh token rotation
