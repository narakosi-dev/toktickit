# Lab 4 REST API Specification

**Project:** TokTickIT — IT Service Desk Application  
**Sprint:** Lab 4 — Actions Taken, Dashboards, and Final Regression  
**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents — KMUTT (Semester 1/2026)  
**Author:** Nara Kosiyaporn (Student ID: 67070505218)  
**Status:** Approved Engineering Contract  

---

## 1. Overview & Authentication Conventions

All endpoints in this specification require authentication via JSON Web Token (JWT) transmitted in the standard HTTP header:
```http
Authorization: Bearer <jwt-token>
```
Endpoints return JSON responses. Errors use standard HTTP status codes accompanied by an informative payload:
```json
{
  "error": "Error message summary",
  "details": ["Optional array of specific field validation errors"]
}
```

---

## 2. Actions Taken Endpoints

### 2.1. List Actions Taken for a Ticket
Retrieve all Actions Taken records associated with a specific Ticket in chronological order.

- **Method / Path:** `GET /api/tickets/:id/actions-taken`
- **Access Control:**
  - `Administrator`, `IT_Staff`: Allowed for any ticket.
  - `Requester`: Allowed **only** if the ticket belongs to the authenticated requester (`ticket.requesterId === authUser.id`).
  - Cross-requester access returns `404 Not Found` (zero information leakage).
- **URL Parameters:**
  - `id` (integer, required): Target Ticket ID.
- **Success Response (200 OK):**
```json
{
  "ticketId": 12,
  "ticketNumber": "TKT-2026-000012",
  "totalActions": 2,
  "actionsTaken": [
    {
      "id": 1,
      "ticketId": 12,
      "actionDateTime": "2026-10-29T08:30:00.000Z",
      "description": "Ran hardware diagnostics on Dell Latitude motherboard and battery controller.",
      "result": "Battery cell #2 defective. Disconnected damaged cell to prevent overheating.",
      "followUpRequired": true,
      "followUpNote": "Order replacement 54Wh battery pack from Dell authorized vendor.",
      "attachmentNotes": "diagnostic_log_20261029.txt, battery_health_report.pdf",
      "performedBy": {
        "id": 8,
        "name": "Charlie Staff",
        "email": "charlie.staff@toktick.local",
        "role": "IT_Staff"
      },
      "createdAt": "2026-10-29T08:35:00.000Z",
      "updatedAt": "2026-10-29T08:35:00.000Z"
    },
    {
      "id": 2,
      "ticketId": 12,
      "actionDateTime": "2026-10-29T10:15:00.000Z",
      "description": "Installed replacement battery pack and performed full charge/discharge cycle test.",
      "result": "Battery now charges to 100% and holds normal charge under stress benchmark.",
      "followUpRequired": false,
      "followUpNote": null,
      "attachmentNotes": "post_repair_calibration.png",
      "performedBy": {
        "id": 9,
        "name": "Bob Smith",
        "email": "bob.smith@example.com",
        "role": "IT_Staff"
      },
      "createdAt": "2026-10-29T10:20:00.000Z",
      "updatedAt": "2026-10-29T10:20:00.000Z"
    }
  ]
}
```
- **Error Responses:**
  - `400 Bad Request`: Ticket ID is not a positive integer.
  - `401 Unauthorized`: Missing or invalid Bearer token.
  - `404 Not Found`: Ticket does not exist or belongs to another requester.

---

### 2.2. Create Action Taken
Record a new Action Taken line under a Ticket.

- **Method / Path:** `POST /api/tickets/:id/actions-taken`
- **Access Control:** `IT_Staff`, `Administrator` only (`Requester` returns `403 Forbidden`).
- **URL Parameters:**
  - `id` (integer, required): Target Ticket ID.
- **Request Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body:**
```json
{
  "actionDateTime": "2026-10-29T09:00:00.000Z",
  "description": "Reconfigured local DNS resolver and flushed client cache on workstation.",
  "result": "Workstation can now resolve corporate intranet services successfully.",
  "followUpRequired": true,
  "followUpNote": "Monitor workstation connectivity during afternoon peak hours.",
  "attachmentNotes": "dns_cache_dump.log",
  "performedById": 8
}
```
- **Field Constraints:**
  - `actionDateTime` (ISO 8601 string, optional): Defaults to current server time if omitted.
  - `description` (string, required): Minimum 5 characters, non-empty.
  - `result` (string, required): Minimum 5 characters, non-empty.
  - `followUpRequired` (boolean, required): `true` or `false`.
  - `followUpNote` (string, conditional): **Mandatory** ($\ge 5$ characters) if `followUpRequired === true`. Optional/ignored if `false`.
  - `attachmentNotes` (string, optional): Notes on related file attachments (e.g. filenames).
  - `performedById` (integer, optional): ID of active IT Staff or Administrator. If omitted, defaults to the authenticated user's ID.
- **Success Response (201 Created):**
```json
{
  "id": 3,
  "ticketId": 12,
  "actionDateTime": "2026-10-29T09:00:00.000Z",
  "description": "Reconfigured local DNS resolver and flushed client cache on workstation.",
  "result": "Workstation can now resolve corporate intranet services successfully.",
  "followUpRequired": true,
  "followUpNote": "Monitor workstation connectivity during afternoon peak hours.",
  "attachmentNotes": "dns_cache_dump.log",
  "performedBy": {
    "id": 8,
    "name": "Charlie Staff",
    "email": "charlie.staff@toktick.local",
    "role": "IT_Staff"
  },
  "createdAt": "2026-10-29T09:01:23.000Z",
  "updatedAt": "2026-10-29T09:01:23.000Z"
}
```
- **Error Responses:**
  - `400 Bad Request`: Validation failure (missing description, missing follow-up note when required, inactive assignee).
  - `401 Unauthorized`: Missing or invalid token.
  - `403 Forbidden`: Authenticated user is a Requester.
  - `404 Not Found`: Ticket not found.

---

### 2.3. Update Action Taken
Update an existing Action Taken record.

- **Method / Path:** `PATCH /api/tickets/:id/actions-taken/:actionId`
- **Access Control:** `IT_Staff`, `Administrator` only.
- **URL Parameters:**
  - `id` (integer, required): Ticket ID.
  - `actionId` (integer, required): Action Taken record ID.
- **Request Body:** Partial object containing fields to update:
```json
{
  "description": "Updated diagnostic description with firmware revisions.",
  "result": "Hardware firmware updated to version 1.4.2.",
  "followUpRequired": false,
  "followUpNote": null
}
```
- **Success Response (200 OK):** Updated `ActionTaken` object.
- **Error Responses:**
  - `400 Bad Request`: Validation failure.
  - `403 Forbidden`: Requester role.
  - `404 Not Found`: Action Taken record or ticket not found.

---

## 3. Ticket Status & Workflow Transition Endpoints

### 3.1. Update Ticket Status (with Concurrency Protection)
Perform an authorized status transition according to the Status Transition Matrix with optimistic concurrency control.

- **Method / Path:** `PATCH /api/tickets/:id/status`
- **Access Control:** `IT_Staff`, `Administrator` only.
- **URL Parameters:**
  - `id` (integer, required): Ticket ID.
- **Request Body:**
```json
{
  "status": "In_Progress",
  "version": 1,
  "comment": "Beginning hardware teardown and inspection."
}
```
- **Field Constraints:**
  - `status` (string, required): One of `New`, `Open`, `In_Progress`, `Waiting_for_Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`. Must be a valid next status from the current status per the Status Transition Matrix.
  - `version` (integer, required): Expected current version of the ticket (for atomic optimistic concurrency control).
  - `comment` (string, optional): Optional comment to be logged into activity log.
- **Success Response (200 OK):**
```json
{
  "id": 12,
  "ticketNumber": "TKT-2026-000012",
  "status": "In_Progress",
  "previousStatus": "Open",
  "version": 2,
  "resolvedIndicated": false,
  "updatedAt": "2026-10-29T10:30:00.000Z"
}
```
- **Error Responses & Machine-Readable Codes:**
  - `400 Bad Request` (Missing version):
    ```json
    {
      "error": "version is required for optimistic concurrency control",
      "code": "VERSION_REQUIRED",
      "details": ["A valid integer 'version' must be supplied in the request body."]
    }
    ```
  - `400 Bad Request` (Invalid version):
    ```json
    {
      "error": "version must be a valid integer",
      "code": "INVALID_VERSION"
    }
    ```
  - `400 Bad Request` (Missing status):
    ```json
    {
      "error": "status is required",
      "code": "STATUS_REQUIRED"
    }
    ```
  - `400 Bad Request` (Illegal status transition):
    ```json
    {
      "error": "Invalid status transition from 'New' to 'Resolved'",
      "code": "INVALID_STATUS_TRANSITION",
      "details": ["Permitted transitions from New: Open, Cancelled"]
    }
    ```
  - `400 Bad Request` (Resolution prerequisite violation):
    ```json
    {
      "error": "Cannot resolve ticket without at least one recorded Action Taken",
      "code": "ACTION_TAKEN_REQUIRED",
      "details": ["At least one technical action must be documented before resolving the ticket."]
    }
    ```
  - `404 Not Found` (Non-existent ticket):
    ```json
    {
      "error": "Ticket not found",
      "code": "TICKET_NOT_FOUND"
    }
    ```
  - `409 Conflict` (Optimistic Concurrency Control collision):
    ```json
    {
      "error": "Conflict: Ticket has been modified concurrently",
      "code": "CONCURRENCY_CONFLICT",
      "currentVersion": 3,
      "currentStatus": "In_Progress",
      "message": "The ticket was updated by another technician while you were viewing it. Please refresh and review the latest changes.",
      "updatedAt": "2026-10-31T10:00:00.000Z"
    }
    ```

### 3.2. Scope of Ticket Versioning and OCC Design Intent
The `Ticket.version` integer field is an atomic monotonic revision counter designed to eliminate lost updates without heavy pessimistic database locks.

#### Architectural Rationale: Mandatory vs Increment-Only Operations
- **Status Transitions (`PATCH /api/tickets/:id/status` and `PATCH /api/staff/tickets/:id/status`):**
  - **Behavior:** Strictly **requires** `version` in the request body (HTTP 400 `VERSION_REQUIRED` if omitted or null).
  - **Design Intent:** Changing a ticket's status advances the finite state machine (FSM) and enforces hard preconditions (such as requiring at least 1 Action Taken before transitioning to `Resolved` per AC-07, and freezing terminal states per BR-09). Allowing a technician to change status based on stale ticket data could lead to severe business errors (e.g., resolving a ticket that another technician just marked `Waiting_for_Requester` or `Cancelled`). Therefore, status transitions must pass an explicit OCC gate using atomic database compare-and-swap (`updateMany({ where: { id, version } })`), returning HTTP 409 `CONCURRENCY_CONFLICT` on mismatch.
- **Triage Mutations (`assign` and `priority`):**
  - **Behavior:** Bumps `version = version + 1` without strictly requiring `version` in the request payload upfront.
  - **Design Intent:** Assigning a technician (`handleAssign`) and overriding IT priority (`handlePriority`) are rapid triage actions often performed in high-frequency batch or queue workflows. Mandating version on simple triage would introduce high friction if technicians reassign tickets rapidly. However, **every assignment and priority change must increment `version` in the database**. This ensures that any other technician currently viewing the ticket has their local cached version invalidated—protecting subsequent status transitions from executing against stale assumptions.
- **Requester Resolution Indication (`POST /api/tickets/:id/resolve-indication`):**
  - **Behavior:** Monotonically increments `version = version + 1` upon setting `resolvedIndicated = true`.
  - **Design Intent:** Alerts technicians that the customer provided feedback while preserving the state machine integrity.

---

## 4. Role Dashboard Endpoints

### 4.1. IT Staff & Administrator Dashboard Metrics
Return authoritative aggregated operational metrics and urgent ticket summaries for IT Staff and Administrators.

- **Method / Path:** `GET /api/dashboard/staff`
- **Access Control:** `IT_Staff`, `Administrator` only (`Requester` returns `403 Forbidden`).
- **Success Response (200 OK):**
```json
{
  "metrics": {
    "unassignedCount": 5,
    "myAssignedCount": 8,
    "statusCounts": {
      "New": 5,
      "Open": 8,
      "In_Progress": 12,
      "Waiting_for_Requester": 4,
      "Resolved": 15,
      "Reopened": 1,
      "Closed": 42,
      "Cancelled": 3
    },
    "priorityCounts": {
      "Critical": 3,
      "High": 11,
      "Medium": 18,
      "Low": 13
    }
  },
  "urgentTickets": [
    {
      "id": 14,
      "ticketNumber": "TKT-2026-000014",
      "summary": "Core router link failure in engineering wing",
      "priority": "Critical",
      "itPriority": "Critical",
      "status": "Open",
      "requester": { "id": 1, "name": "Nara Kosiyaporn" },
      "assignedTo": null,
      "createdAt": "2026-10-29T07:15:00.000Z"
    }
  ],
  "recentUpdatedTickets": [
    {
      "id": 12,
      "ticketNumber": "TKT-2026-000012",
      "summary": "Laptop battery drains in less than 30 minutes",
      "priority": "High",
      "itPriority": "High",
      "status": "In_Progress",
      "requester": { "id": 2, "name": "Sunny farmhouse" },
      "assignedTo": { "id": 8, "name": "Charlie Staff" },
      "updatedAt": "2026-10-29T10:15:00.000Z"
    }
  ]
}
```

---

### 4.2. Requester Dashboard Metrics
Return personalized operational metrics for the authenticated Requester.

- **Method / Path:** `GET /api/dashboard/requester`
- **Access Control:** `Requester`, `Administrator` (`IT_Staff` can also access if viewing personal tickets).
- **Success Response (200 OK):**
```json
{
  "metrics": {
    "totalOpen": 3,
    "inProgress": 1,
    "waitingForRequester": 1,
    "recentlyResolved": 2,
    "closed": 5
  },
  "recentTickets": [
    {
      "id": 18,
      "ticketNumber": "TKT-2026-000018",
      "summary": "VPN connection drops every 10 minutes",
      "priority": "High",
      "status": "Waiting_for_Requester",
      "resolvedIndicated": false,
      "category": { "id": 4, "name": "Network" },
      "updatedAt": "2026-10-29T09:45:00.000Z"
    },
    {
      "id": 12,
      "ticketNumber": "TKT-2026-000012",
      "summary": "Laptop battery drains in less than 30 minutes",
      "priority": "High",
      "status": "In_Progress",
      "resolvedIndicated": false,
      "category": { "id": 2, "name": "Hardware" },
      "updatedAt": "2026-10-29T08:30:00.000Z"
    }
  ]
}
```

---

## 5. Regression Endpoints Continuity (Labs 1–3)

All existing endpoints from earlier sprints remain active and backward-compatible:
- **Auth:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`
- **Users (Admin):** `GET /api/admin/users`, `POST /api/admin/users`, `PATCH /api/admin/users/:id`, `POST /api/admin/users/:id/reset-password`
- **Categories & Systems:** `GET /api/categories`, `GET /api/related-systems`
- **Tickets (Requester):** `GET /api/tickets`, `POST /api/tickets`, `GET /api/tickets/:id`
- **Attachments:** `POST /api/tickets/:id/attachments`, `GET /api/attachments/:id`, `DELETE /api/attachments/:id`
- **Staff Operations:** `GET /api/staff/tickets`, `PATCH /api/staff/tickets/:id` (claim, assign, priority)
- **Comments & Notes:** `GET /api/tickets/:id/comments`, `POST /api/tickets/:id/comments`, `GET /api/tickets/:id/internal-notes`, `POST /api/tickets/:id/internal-notes`
- **Advisory Resolution:** `POST /api/tickets/:id/resolve-indication`
