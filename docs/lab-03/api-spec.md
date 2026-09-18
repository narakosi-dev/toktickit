# Lab 3 REST API Specification

**Project:** TokTickIT — IT Service Desk Application  
**Sprint:** Lab 3 — Users, Roles, IT Staff Ticketing, and Admin Screens  
**Course:** CPE 334 Software Engineering — KMUTT (1/2026)  
**Author:** Nara Kosiyaporn (67070505218)  
**Status:** Approved API Specification  

---

## 1. Global API Conventions

### 1.1. Base URL & Protocol
- All endpoints are prefixed with `/api`.
- Transport protocol: HTTP/1.1 (JSON payload for request and response, UTF-8 encoded).

### 1.2. Authentication Header
All protected endpoints require the standard Bearer token header:
```http
Authorization: Bearer <jwt-or-session-token>
```
If the header is missing, malformed, or invalid, the server responds with:
```json
{ "error": "Unauthorized: Missing or invalid authentication token" }
```
Status: `401 Unauthorized`.

### 1.3. Mandatory Password Change Guard
If the authenticated user has `mustChangePassword === true`, requests to normal application routes are blocked:
```json
{
  "error": "Password change required",
  "code": "PASSWORD_CHANGE_REQUIRED"
}
```
Status: `403 Forbidden`. The user is permitted to call only `/api/auth/me`, `/api/auth/change-password`, and `/api/auth/logout`.

### 1.4. Role-Based Access Control (RBAC) Guard
If the authenticated user lacks the required role for a protected route, the server responds with:
```json
{ "error": "Forbidden: Insufficient role permissions" }
```
Status: `403 Forbidden`.

---

## 2. Authentication & Credential Endpoints

### 2.1. User Login
- **Method / Path:** `POST /api/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "jennifer.anderson@example.com",
    "password": "Password123!"
  }
  ```
- **Validation:**
  - `email`: Required, valid email string format.
  - `password`: Required string.
- **Success Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "jennifer.anderson@example.com",
      "name": "Jennifer Anderson",
      "role": "Requester",
      "active": true,
      "mustChangePassword": false
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing email or password.
  - `401 Unauthorized`: Invalid credentials (`{ "error": "Invalid email or password" }`).
  - `403 Forbidden`: Account inactive (`{ "error": "Account is inactive. Please contact an administrator." }`).

### 2.2. User Logout
- **Method / Path:** `POST /api/auth/logout`
- **Access:** Authenticated user
- **Headers:** `Authorization: Bearer <token>`
- **Success Response (200 OK):**
  ```json
  { "message": "Logged out successfully" }
  ```

### 2.3. Current Authenticated User Profile
- **Method / Path:** `GET /api/auth/me`
- **Access:** Authenticated user
- **Headers:** `Authorization: Bearer <token>`
- **Success Response (200 OK):**
  ```json
  {
    "user": {
      "id": 1,
      "email": "jennifer.anderson@example.com",
      "name": "Jennifer Anderson",
      "role": "Requester",
      "active": true,
      "mustChangePassword": false
    }
  }
  ```
- **Error Response (401 Unauthorized):** Invalid or expired token.

### 2.4. Mandatory / Profile Password Change
- **Method / Path:** `POST /api/auth/change-password`
- **Access:** Authenticated user (permitted even if `mustChangePassword = true`)
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "currentPassword": "Password123!",
    "newPassword": "NewSecurePassword456!",
    "confirmPassword": "NewSecurePassword456!"
  }
  ```
- **Validation:**
  - `currentPassword`: Must match current hashed password in database.
  - `newPassword`: Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.
  - `confirmPassword`: Must match `newPassword` exactly.
  - `newPassword` must not equal `currentPassword`.
- **Success Response (200 OK):**
  ```json
  {
    "message": "Password updated successfully",
    "user": {
      "id": 1,
      "email": "jennifer.anderson@example.com",
      "name": "Jennifer Anderson",
      "role": "Requester",
      "active": true,
      "mustChangePassword": false
    }
  }
  ```
- **Error Response (400 Bad Request):** Password does not meet criteria or confirmation mismatch.
- **Error Response (401 Unauthorized):** Current password incorrect.

---

## 3. Requester Ticket Endpoints (Lab 2 Continuation)

### 3.1. Create Ticket
- **Method / Path:** `POST /api/tickets`
- **Access:** Authenticated `Requester` (or any authenticated role)
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "categoryId": 1,
    "relatedSystemId": 2,
    "priority": "High",
    "summary": "VPN connection drops every 10 minutes",
    "description": "After the recent network maintenance, the VPN client disconnects repeatedly during conference calls."
  }
  ```
  *(Note: `requesterId` is automatically bound from `req.user.id`)*
- **Success Response (201 Created):**
  ```json
  {
    "id": 101,
    "ticketNumber": "TKT-2026-000101",
    "ticketDate": "2026-09-19T01:50:00.000Z",
    "summary": "VPN connection drops every 10 minutes",
    "description": "...",
    "priority": "High",
    "itPriority": "High",
    "status": "New",
    "resolvedByRequester": false,
    "requesterId": 1,
    "ownerId": null,
    "categoryId": 1,
    "relatedSystemId": 2
  }
  ```

### 3.2. List My Tickets
- **Method / Path:** `GET /api/tickets`
- **Access:** Authenticated `Requester`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:** `search`, `categoryId`, `priority`, `status`, `page` (default 1), `limit` (default 8)
- **Ownership Isolation:** Automatically filters by `where: { requesterId: req.user.id }`.
- **Success Response (200 OK):**
  ```json
  {
    "tickets": [...],
    "pagination": { "page": 1, "limit": 8, "total": 12, "totalPages": 2 }
  }
  ```

### 3.3. Get Ticket Detail (Requester View)
- **Method / Path:** `GET /api/tickets/:id`
- **Access:** Authenticated `Requester`
- **Ownership Protection:** If ticket is not owned by `req.user.id`, returns `404 Not Found` (BR-07, prevents ID enumeration).
- **Success Response (200 OK):** Full ticket detail with category, related system, attachments, and public comments. Does NOT include internal notes.

### 3.4. Problem Appears Resolved Indicator
- **Method / Path:** `PATCH /api/tickets/:id/resolve-indication`
- **Access:** Authenticated `Requester` (owner only)
- **Request Body:** `{ "resolved": true }`
- **Success Response (200 OK):**
  ```json
  {
    "id": 101,
    "resolvedByRequester": true,
    "status": "In Progress"
  }
  ```

---

## 4. IT Staff Queue & Operational Endpoints

### 4.1. Retrieve IT Staff Ticket Queue
- **Method / Path:** `GET /api/staff/tickets`
- **Access:** Role `IT_Staff` or `Administrator`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `search`: Keyword matching `ticketNumber` or `summary` (case-insensitive).
  - `categoryId`: Filter by Category ID.
  - `relatedSystemId`: Filter by Related System ID.
  - `priority`: Filter by Requested Priority (`Low`, `Medium`, `High`, `Critical`).
  - `itPriority`: Filter by IT Priority.
  - `status`: Filter by status (`New`, `Open`, `In Progress`, etc.).
  - `ownerId`: `unassigned`, `mine`, or specific staff ID.
  - `sortBy`: `ticketDate`, `updatedAt`, `ticketNumber`, `priority`, `itPriority`, `status`.
  - `sortOrder`: `asc` or `desc` (default `desc`).
  - `page`: Page number (default 1).
  - `limit`: Items per page (default 10).
- **Success Response (200 OK):**
  ```json
  {
    "tickets": [
      {
        "id": 101,
        "ticketNumber": "TKT-2026-000101",
        "ticketDate": "2026-09-19T01:50:00.000Z",
        "summary": "VPN connection drops every 10 minutes",
        "priority": "High",
        "itPriority": "High",
        "status": "Open",
        "resolvedByRequester": false,
        "requester": { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.anderson@example.com" },
        "owner": { "id": 6, "name": "Michael Brown", "email": "michael.brown@toktickit.com" },
        "category": { "id": 1, "name": "Network" },
        "relatedSystem": { "id": 2, "name": "Corporate VPN" },
        "_count": { "attachments": 2, "publicComments": 3, "internalNotes": 1 }
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 45, "totalPages": 5 }
  }
  ```

### 4.2. Retrieve Staff Ticket Detail
- **Method / Path:** `GET /api/staff/tickets/:id`
- **Access:** Role `IT_Staff` or `Administrator`
- **Success Response (200 OK):** Full ticket detail including attachments, public comments, and internal notes.

### 4.3. Claim or Reassign Ticket
- **Method / Path:** `PATCH /api/staff/tickets/:id/assign`
- **Access:** Role `IT_Staff` or `Administrator`
- **Request Body:**
  ```json
  { "ownerId": 6 }
  ```
  *(Pass `null` to unassign, or the current user's ID to claim)*
- **Validation:** `ownerId` must be `null` or reference an active `IT_Staff` or `Administrator`.
- **Success Response (200 OK):**
  ```json
  {
    "id": 101,
    "ownerId": 6,
    "owner": { "id": 6, "name": "Michael Brown", "role": "IT_Staff" }
  }
  ```

### 4.4. Update IT Priority
- **Method / Path:** `PATCH /api/staff/tickets/:id/priority`
- **Access:** Role `IT_Staff` or `Administrator`
- **Request Body:**
  ```json
  { "itPriority": "Critical" }
  ```
- **Validation:** Must be one of `Low`, `Medium`, `High`, `Critical`.
- **Success Response (200 OK):**
  ```json
  { "id": 101, "itPriority": "Critical" }
  ```

### 4.5. Transition Ticket Status
- **Method / Path:** `PATCH /api/staff/tickets/:id/status`
- **Access:** Role `IT_Staff` or `Administrator`
- **Request Body:**
  ```json
  { "status": "In Progress" }
  ```
- **Validation:** Must follow the Status Transition Matrix (BR-13).
- **Success Response (200 OK):**
  ```json
  { "id": 101, "status": "In Progress" }
  ```
- **Error Response (400 Bad Request):**
  ```json
  { "error": "Invalid status transition from 'New' to 'Resolved'" }
  ```

### 4.6. Active IT Staff Members List (for assignment dropdown)
- **Method / Path:** `GET /api/staff/members`
- **Access:** Role `IT_Staff` or `Administrator`
- **Success Response (200 OK):**
  ```json
  [
    { "id": 6, "name": "Michael Brown", "email": "michael.brown@toktickit.com" },
    { "id": 7, "name": "Sarah Johnson", "email": "sarah.johnson@toktickit.com" }
  ]
  ```

---

## 5. Public Comments & Internal Notes Endpoints

### 5.1. List Public Comments
- **Method / Path:** `GET /api/tickets/:id/comments`
- **Access:** Ticket's Requester, IT Staff, Administrator
- **Success Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "content": "I have uploaded the diagnostic log file as requested.",
      "createdAt": "2026-09-19T02:00:00.000Z",
      "author": { "id": 1, "name": "Jennifer Anderson", "role": "Requester" }
    }
  ]
  ```

### 5.2. Post Public Comment
- **Method / Path:** `POST /api/tickets/:id/comments`
- **Access:** Ticket's Requester, IT Staff, Administrator
- **Request Body:**
  ```json
  { "content": "Thank you, we are reviewing the logs now." }
  ```
- **Validation:** Content required, trimmed, 1–1,000 characters.
- **Success Response (201 Created):** Created comment with author and timestamp.

### 5.3. List Internal Notes
- **Method / Path:** `GET /api/tickets/:id/notes`
- **Access:** Role `IT_Staff` or `Administrator` ONLY
- **Requester Attempt (403 Forbidden):**
  ```json
  { "error": "Forbidden: Internal notes are restricted to IT Staff and Administrators" }
  ```
- **Success Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "content": "ISP gateway had intermittent packet loss on VLAN 20.",
      "createdAt": "2026-09-19T02:05:00.000Z",
      "author": { "id": 6, "name": "Michael Brown", "role": "IT_Staff" }
    }
  ]
  ```

### 5.4. Post Internal Note
- **Method / Path:** `POST /api/tickets/:id/notes`
- **Access:** Role `IT_Staff` or `Administrator` ONLY
- **Request Body:**
  ```json
  { "content": "Contacted tier-2 network engineer to reboot switch." }
  ```
- **Validation:** Content required, trimmed, 1–1,000 characters.
- **Success Response (201 Created):** Created note with author and timestamp.

---

## 6. Administrator User Management Endpoints

### 6.1. List Users
- **Method / Path:** `GET /api/admin/users`
- **Access:** Role `Administrator` ONLY
- **Query Parameters:** `search`, `role` (`Requester`, `IT_Staff`, `Administrator`)
- **Success Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.anderson@example.com",
      "role": "Requester",
      "active": true,
      "mustChangePassword": false,
      "createdAt": "2026-09-19T00:00:00.000Z"
    },
    {
      "id": 6,
      "name": "Michael Brown",
      "email": "michael.brown@toktickit.com",
      "role": "IT_Staff",
      "active": true,
      "mustChangePassword": false,
      "createdAt": "2026-09-19T00:00:00.000Z"
    }
  ]
  ```

### 6.2. Create User
- **Method / Path:** `POST /api/admin/users`
- **Access:** Role `Administrator` ONLY
- **Request Body:**
  ```json
  {
    "name": "Alex Thompson",
    "email": "alex.thompson@toktickit.com",
    "role": "IT_Staff",
    "active": true,
    "initialPassword": "TempPassword123!"
  }
  ```
- **Validation:**
  - `name`: Required, 2–100 characters.
  - `email`: Required, valid email, must be unique across all users.
  - `role`: One of `Requester`, `IT_Staff`, `Administrator`.
  - `initialPassword`: Required, minimum 8 characters.
- **Success Response (201 Created):** Created user with `mustChangePassword: true`.
- **Error Responses:**
  - `400 Bad Request`: Validation failure or duplicate email (`{ "error": "Email address already registered" }`).

### 6.3. Edit User
- **Method / Path:** `PATCH /api/admin/users/:id`
- **Access:** Role `Administrator` ONLY
- **Request Body:**
  ```json
  {
    "name": "Alex Thompson",
    "email": "alex.thompson@toktickit.com",
    "role": "IT_Staff",
    "active": false
  }
  ```
- **Safety Invariant Enforcements (BR-16, BR-17):**
  - If `id === req.user.id` and `active === false`: Reject with `400 Bad Request` (`{ "error": "Administrators cannot deactivate their own account" }`).
  - If target user is the sole active Administrator and `active === false` or `role !== 'Administrator'`: Reject with `400 Bad Request` (`{ "error": "Cannot deactivate or change role of the last active Administrator" }`).
- **Success Response (200 OK):** Updated user object.

### 6.4. Reset User Password
- **Method / Path:** `POST /api/admin/users/:id/reset-password`
- **Access:** Role `Administrator` ONLY
- **Request Body:**
  ```json
  { "newInitialPassword": "TempPassword456!" }
  ```
- **Behavior:** Updates password hash and sets `mustChangePassword = true`.
- **Success Response (200 OK):**
  ```json
  { "message": "Initial password reset successfully. User must change it at next login." }
  ```
