# Lab 2 REST API Specification

## Base URL
`/api`

All JSON request bodies must include header `Content-Type: application/json` unless using `multipart/form-data` for file uploads.

---

## 1. Development Requester Endpoints

### 1.1 List Active Development Requesters
- **Method:** `GET`
- **Path:** `/api/requesters`
- **Description:** Returns all development requesters flagged with `active: true`. Inactive requesters are excluded.
- **Query Parameters:** None.
- **Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@example.com",
    "active": true
  },
  {
    "id": 2,
    "name": "Michael Brown",
    "email": "michael.brown@example.com",
    "active": true
  }
]
```
- **Error Responses:**
  - `500 Internal Server Error`: `{"error": "Failed to retrieve development requesters"}`

---

## 2. Master Catalog Endpoints

### 2.1 List Categories (Existing from Lab 1)
- **Method:** `GET`
- **Path:** `/api/categories`
- **Success Response (200 OK):**
```json
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" }
]
```

### 2.2 List Related Systems
- **Method:** `GET`
- **Path:** `/api/related-systems`
- **Success Response (200 OK):**
```json
[
  { "id": 1, "name": "Email" },
  { "id": 2, "name": "Campus Wi-Fi" },
  { "id": 3, "name": "VPN" },
  { "id": 4, "name": "LEB2 App" },
  { "id": 5, "name": "Grade Submission App" },
  { "id": 6, "name": "Printer" },
  { "id": 7, "name": "Corporate Laptop" }
]
```

---

## 3. Ticket Endpoints

### 3.1 Create Ticket
- **Method:** `POST`
- **Path:** `/api/tickets`
- **Request Body:**
```json
{
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 7,
  "priority": "High",
  "summary": "Laptop battery drains in less than 30 minutes",
  "description": "After applying the recent OS update last night, the battery drains extremely fast even while idle on desktop."
}
```
- **Validation Rules:**
  - `requesterId`: Required, positive integer, must correspond to an active Requester.
  - `categoryId`: Required, positive integer, must correspond to a valid Category.
  - `relatedSystemId`: Required, positive integer, must correspond to a valid RelatedSystem.
  - `priority`: Required, enum: `Low`, `Medium`, `High`, `Critical`.
  - `summary`: Required, trimmed, length between 5 and 120 characters.
  - `description`: Required, trimmed, length between 10 and 2000 characters.
- **Success Response (201 Created):**
```json
{
  "id": 12,
  "ticketNumber": "TKT-2026-000012",
  "ticketDate": "2026-09-03T16:50:00.000Z",
  "summary": "Laptop battery drains in less than 30 minutes",
  "description": "After applying the recent OS update last night, the battery drains extremely fast even while idle on desktop.",
  "priority": "High",
  "status": "New",
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 7,
  "createdAt": "2026-09-03T16:50:00.000Z",
  "updatedAt": "2026-09-03T16:50:00.000Z"
}
```
- **Error Responses:**
  - `400 Bad Request`: `{"error": "Validation failed", "details": ["Summary must be at least 5 characters"]}`
  - `404 Not Found`: `{"error": "Invalid requester, category, or related system"}`
  - `500 Internal Server Error`: `{"error": "Failed to create ticket"}`

---

### 3.2 List Requester's Tickets
- **Method:** `GET`
- **Path:** `/api/tickets`
- **Description:** Queries tickets belonging strictly to the requested `requesterId`.
- **Query Parameters:**
  - `requesterId` (required, integer): Identifies the requesting owner.
  - `search` (optional, string): Case-insensitive match on `ticketNumber` or `summary`.
  - `categoryId` (optional, integer): Filter by Category ID.
  - `priority` (optional, string): Filter by Priority (`Low`, `Medium`, `High`, `Critical`).
  - `status` (optional, string): Filter by Status (`New`, `In Progress`, `Resolved`).
  - `sort` (optional, string): `newest` (default), `oldest`, `priority`.
  - `page` (optional, integer, default: `1`): Current page number (1-based).
  - `limit` (optional, integer, default: `8`): Items per page.
- **Success Response (200 OK):**
```json
{
  "tickets": [
    {
      "id": 12,
      "ticketNumber": "TKT-2026-000012",
      "ticketDate": "2026-09-03T16:50:00.000Z",
      "summary": "Laptop battery drains in less than 30 minutes",
      "priority": "High",
      "status": "New",
      "category": { "id": 2, "name": "Hardware" },
      "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
      "attachmentCount": 1,
      "createdAt": "2026-09-03T16:50:00.000Z",
      "updatedAt": "2026-09-03T16:50:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 8,
    "totalCount": 1,
    "totalPages": 1
  }
}
```
- **Error Responses:**
  - `400 Bad Request`: `{"error": "requesterId query parameter is required"}`
  - `500 Internal Server Error`: `{"error": "Failed to query tickets"}`

---

### 3.3 Get Ticket Detail
- **Method:** `GET`
- **Path:** `/api/tickets/:id`
- **Query Parameters:**
  - `requesterId` (required, integer): Verifies that the ticket belongs to this requester.
- **Ownership Verification:**
  If the ticket does not belong to the provided `requesterId`, the server returns `404 Not Found` (or `403 Forbidden`) to prevent enumeration or unauthorized access.
- **Success Response (200 OK):**
```json
{
  "id": 12,
  "ticketNumber": "TKT-2026-000012",
  "ticketDate": "2026-09-03T16:50:00.000Z",
  "summary": "Laptop battery drains in less than 30 minutes",
  "description": "After applying the recent OS update last night, the battery drains extremely fast even while idle on desktop.",
  "priority": "High",
  "status": "New",
  "requester": { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.anderson@example.com" },
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
  "attachments": [
    {
      "id": 5,
      "originalName": "battery-report.pdf",
      "sizeBytes": 142050,
      "mimeType": "application/pdf",
      "active": true,
      "removalReason": null,
      "removedAt": null,
      "createdAt": "2026-09-03T16:55:00.000Z"
    }
  ],
  "createdAt": "2026-09-03T16:50:00.000Z",
  "updatedAt": "2026-09-03T16:50:00.000Z"
}
```
- **Error Responses:**
  - `400 Bad Request`: `{"error": "requesterId is required"}`
  - `404 Not Found`: `{"error": "Ticket not found or unauthorized access"}`

---

## 4. Attachment Endpoints

### 4.1 Upload Attachment
- **Method:** `POST`
- **Path:** `/api/tickets/:id/attachments`
- **Content-Type:** `multipart/form-data`
- **Form Data Fields:**
  - `requesterId` (integer, required): Ownership check.
  - `file` (binary file, required): Uploaded document or image.
- **Attachment Validation Rules:**
  - Permitted MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
  - Max file size: `5 MB` (`5,242,880` bytes).
  - Maximum active attachments: If the ticket currently has 5 attachments with `active: true`, reject with HTTP 400.
- **Success Response (201 Created):**
```json
{
  "id": 6,
  "originalName": "error-screen.png",
  "sizeBytes": 420500,
  "mimeType": "image/png",
  "active": true,
  "createdAt": "2026-09-03T17:00:00.000Z"
}
```
- **Error Responses:**
  - `400 Bad Request`: `{"error": "Maximum 5 active attachments allowed per ticket"}` or `{"error": "File size exceeds 5MB limit"}` or `{"error": "Unsupported file type"}`
  - `404 Not Found`: `{"error": "Ticket not found or unauthorized"}`

---

### 4.2 Download Attachment
- **Method:** `GET`
- **Path:** `/api/attachments/:id/download`
- **Query Parameters:**
  - `requesterId` (required, integer)
- **Rules:**
  - If `active: false` (soft-removed), the server returns `410 Gone` with message `{"error": "This attachment has been removed and cannot be downloaded"}`.
  - Enforces ticket ownership through the ticket's `requesterId`.
- **Success Response (200 OK):**
  - Binary stream with appropriate headers:
    - `Content-Type: <mimeType>`
    - `Content-Disposition: attachment; filename="<originalName>"`

---

### 4.3 Soft-Remove Attachment
- **Method:** `PATCH`
- **Path:** `/api/attachments/:id/remove`
- **Request Body:**
```json
{
  "requesterId": 1,
  "reason": "Uploaded screenshot contained sensitive personal account info"
}
```
- **Validation:**
  - `reason`: Required, minimum 5 characters.
  - Requester must own the ticket holding this attachment.
- **Success Response (200 OK):**
```json
{
  "id": 5,
  "originalName": "battery-report.pdf",
  "active": false,
  "removalReason": "Uploaded screenshot contained sensitive personal account info",
  "removedAt": "2026-09-03T17:05:00.000Z"
}
```
- **Error Responses:**
  - `400 Bad Request`: `{"error": "Removal reason must be at least 5 characters"}`
  - `404 Not Found`: `{"error": "Attachment not found or unauthorized"}`
  - `409 Conflict`: `{"error": "Attachment is already removed"}`
