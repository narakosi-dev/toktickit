const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export interface Requester {
  id: number;
  name: string;
  email: string;
  active: boolean;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// Lab 1: System check
export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) throw new Error("Health check failed");

  const categoriesRes = await fetch(`${API_URL}/api/categories`);
  if (!categoriesRes.ok) throw new Error("Categories fetch failed");
  const categories: Category[] = await categoriesRes.json();

  return { online: true, categories };
}

// Lab 2 — Issue 2: Fetch Active Development Requesters
export async function fetchRequesters(): Promise<Requester[]> {
  const res = await fetch(`${API_URL}/api/requesters`);
  if (!res.ok) throw new Error("Failed to fetch requesters");
  return res.json();
}

// Lab 2 — Issue 2: Fetch Related Systems
export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`);
  if (!res.ok) throw new Error("Failed to fetch related systems");
  return res.json();
}

// Lab 2 — Issue 3: Fetch Categories (standalone)
export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

// Lab 2 — Issue 3: Ticket Types & Creation
export interface Ticket {
  id: number;
  ticketNumber: string;
  ticketDate: string;
  summary: string;
  description: string;
  priority: string;
  status: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketPayload {
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  priority: string;
  summary: string;
  description: string;
}

export async function createTicket(payload: CreateTicketPayload): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to create ticket");
  }
  return res.json();
}

// Lab 2 — Issue 4: Ticket Listing & Pagination Types
export interface TicketListItem {
  id: number;
  ticketNumber: string;
  ticketDate: string;
  summary: string;
  description?: string;
  priority: string;
  status: string;
  requesterId?: number;
  categoryId?: number;
  relatedSystemId?: number;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface TicketListResponse {
  tickets: TicketListItem[];
  pagination: PaginationMetadata;
}

export interface TicketQueryFilters {
  requesterId: number;
  search?: string;
  categoryId?: string | number;
  priority?: string;
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export async function fetchTickets(filters: TicketQueryFilters): Promise<TicketListResponse> {
  const params = new URLSearchParams();
  params.set("requesterId", String(filters.requesterId));

  if (filters.search) params.set("search", filters.search);
  if (filters.categoryId) params.set("categoryId", String(filters.categoryId));
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.status) params.set("status", filters.status);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const res = await fetch(`${API_URL}/api/tickets?${params.toString()}`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to fetch tickets");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 2 — Issue 5: Ticket Detail & Attachment Types & Functions
// ---------------------------------------------------------------------------
export interface AttachmentItem {
  id: number;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  active: boolean;
  removalReason?: string | null;
  removedAt?: string | null;
  createdAt: string;
}

export interface TicketDetail {
  id: number;
  ticketNumber: string;
  ticketDate: string;
  summary: string;
  description: string;
  priority: string;
  status: string;
  requester: { id: number; name: string; email: string };
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  attachments: AttachmentItem[];
  resolvedIndicated?: boolean;
  resolvedByRequester?: boolean;
  publicComments?: CommentItem[];
  createdAt: string;
  updatedAt: string;
}

export async function fetchTicketDetail(
  ticketId: number,
  requesterId: number
): Promise<TicketDetail> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}?requesterId=${requesterId}`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to fetch ticket detail");
  }
  return res.json();
}

export async function uploadAttachment(
  ticketId: number,
  requesterId: number,
  file: File
): Promise<AttachmentItem> {
  const formData = new FormData();
  formData.append("requesterId", String(requesterId));
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to upload attachment");
  }
  return res.json();
}

export function getAttachmentDownloadUrl(
  attachmentId: number,
  requesterId: number
): string {
  return `${API_URL}/api/attachments/${attachmentId}/download?requesterId=${requesterId}`;
}

export async function removeAttachment(
  attachmentId: number,
  requesterId: number,
  reason: string
): Promise<AttachmentItem> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}/remove`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requesterId, reason }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to remove attachment");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 3 — Issue 4: Authentication API Functions
// ---------------------------------------------------------------------------
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface ChangePasswordResponse {
  message: string;
  token: string;
  user: AuthUser;
}

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Login failed");
  }
  return res.json();
}

export async function logoutUser(): Promise<void> {
  await fetch(`${API_URL}/api/auth/logout`, { method: "POST" });
}

export async function getMe(token: string): Promise<{ user: AuthUser }> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to fetch profile");
  }
  return res.json();
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResponse> {
  const res = await fetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to change password");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 3 — Issue 5 & 6: IT Staff Queue Types & API
// ---------------------------------------------------------------------------
export interface StaffTicketItem {
  id: number;
  ticketNumber: string;
  ticketDate: string;
  summary: string;
  description: string;
  priority: string;
  itPriority?: string | null;
  status: string;
  resolvedIndicated?: boolean;
  resolvedByRequester?: boolean;
  requesterId?: number;
  ownerId?: number | null;
  requester: { id: number; name: string; email: string; role?: string };
  assignedTo?: { id: number; name: string; email: string; role?: string } | null;
  owner?: { id: number; name: string; email: string; role?: string } | null;
  assignee?: { id: number; name: string; email: string; role?: string } | null;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  _count?: {
    attachments: number;
    publicComments: number;
    internalNotes: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StaffTicketListResponse {
  tickets: StaffTicketItem[];
  items?: StaffTicketItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  total?: number;
  stats?: {
    total: number;
    newCount: number;
    inProgressCount: number;
    pendingCount: number;
    resolvedCount: number;
  };
}

export interface StaffTicketQueryFilters {
  search?: string;
  q?: string;
  status?: string;
  priority?: string;
  itPriority?: string;
  assigneeId?: string | number;
  ownerId?: string | number;
  categoryId?: string | number;
  relatedSystemId?: string | number;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

export async function fetchStaffTickets(
  token: string,
  filters: StaffTicketQueryFilters = {}
): Promise<StaffTicketListResponse> {
  const params = new URLSearchParams();
  const searchVal = filters.q || filters.search;
  if (searchVal && searchVal.trim()) params.set("q", searchVal.trim());
  if (filters.status && filters.status !== "All") params.set("status", filters.status);
  if (filters.priority && filters.priority !== "All") params.set("priority", filters.priority);
  if (filters.itPriority && filters.itPriority !== "All") params.set("itPriority", filters.itPriority);
  if (filters.assigneeId !== undefined && filters.assigneeId !== "All") params.set("assigneeId", String(filters.assigneeId));
  if (filters.ownerId !== undefined && filters.ownerId !== "All") params.set("ownerId", String(filters.ownerId));
  if (filters.categoryId && filters.categoryId !== "All") params.set("categoryId", String(filters.categoryId));
  if (filters.relatedSystemId && filters.relatedSystemId !== "All") params.set("relatedSystemId", String(filters.relatedSystemId));
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const queryStr = params.toString();
  const url = `${API_URL}/api/staff/tickets${queryStr ? `?${queryStr}` : ""}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to fetch staff tickets queue");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 3 — Issue 7, 8 & 9: Staff Ticket Detail, Ops, Comments & Notes API
// ---------------------------------------------------------------------------
export interface CommentItem {
  id: number;
  ticketId: number;
  userId: number;
  content: string;
  createdAt: string;
  user?: { id: number; name: string; email?: string; role?: string };
  author?: { id: number; name: string; email?: string; role?: string };
}

export interface InternalNoteItem {
  id: number;
  ticketId: number;
  userId: number;
  content: string;
  createdAt: string;
  user?: { id: number; name: string; email?: string; role?: string };
  author?: { id: number; name: string; email?: string; role?: string };
}

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface StaffTicketDetailData extends StaffTicketItem {
  publicComments?: CommentItem[];
  internalNotes?: InternalNoteItem[];
  activityLogs?: any[];
  attachments: AttachmentItem[];
}

export async function fetchStaffTicketDetail(
  token: string,
  ticketId: number
): Promise<StaffTicketDetailData> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to fetch staff ticket detail");
  }
  return res.json();
}

export async function assignTicket(
  token: string,
  ticketId: number,
  staffId: number | null
): Promise<any> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/assign`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ staffId, ownerId: staffId }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to assign ticket");
  }
  return res.json();
}

export async function updateTicketPriority(
  token: string,
  ticketId: number,
  itPriority: string
): Promise<any> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/priority`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ itPriority }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to update IT priority");
  }
  return res.json();
}

export async function updateTicketStatus(
  token: string,
  ticketId: number,
  status: string
): Promise<any> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to update ticket status");
  }
  return res.json();
}

export async function fetchStaffMembers(token: string): Promise<StaffMember[]> {
  const res = await fetch(`${API_URL}/api/staff/members`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to fetch staff members");
  }
  return res.json();
}

export async function fetchPublicComments(
  token: string,
  ticketId: number
): Promise<CommentItem[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to fetch comments");
  }
  return res.json();
}

export async function createPublicComment(
  token: string,
  ticketId: number,
  content: string
): Promise<CommentItem> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to post public comment");
  }
  return res.json();
}

export async function fetchInternalNotes(
  token: string,
  ticketId: number
): Promise<InternalNoteItem[]> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/internal-notes`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to fetch internal notes");
  }
  return res.json();
}

export async function createInternalNote(
  token: string,
  ticketId: number,
  content: string
): Promise<InternalNoteItem> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/internal-notes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to post internal note");
  }
  return res.json();
}

export async function indicateProblemResolved(
  token: string,
  ticketId: number
): Promise<any> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/resolve-indication`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to indicate problem resolved");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 3 — Issue 10 & 11: Administrator User Management Types & Functions
// ---------------------------------------------------------------------------
export interface AdminUserItem {
  id: number;
  name: string;
  email: string;
  role: "Requester" | "IT_Staff" | "Administrator";
  isActive: boolean;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminUserInput {
  name: string;
  email: string;
  role: "Requester" | "IT_Staff" | "Administrator";
  active?: boolean;
  initialPassword?: string;
}

export interface CreateAdminUserResponse extends AdminUserItem {
  temporaryPassword: string;
  initialPassword?: string;
  message?: string;
}

export interface UpdateAdminUserInput {
  name?: string;
  email?: string;
  role?: "Requester" | "IT_Staff" | "Administrator";
  active?: boolean;
  isActive?: boolean;
}

export interface ResetPasswordResponse {
  message: string;
  temporaryPassword: string;
  mustChangePassword: boolean;
}

export async function fetchAdminUsers(
  token: string,
  params?: { search?: string; role?: string }
): Promise<AdminUserItem[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.role && params.role !== "All") query.set("role", params.role);
  const qStr = query.toString();

  const res = await fetch(`${API_URL}/api/admin/users${qStr ? `?${qStr}` : ""}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to fetch users");
  }
  return res.json();
}

export async function createAdminUser(
  token: string,
  input: CreateAdminUserInput
): Promise<CreateAdminUserResponse> {
  const res = await fetch(`${API_URL}/api/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to create user");
  }
  return res.json();
}

export async function updateAdminUser(
  token: string,
  id: number,
  input: UpdateAdminUserInput
): Promise<AdminUserItem> {
  const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to update user");
  }
  return res.json();
}

export async function resetUserPassword(
  token: string,
  id: number,
  newInitialPassword?: string
): Promise<ResetPasswordResponse> {
  const res = await fetch(`${API_URL}/api/admin/users/${id}/reset-password`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newInitialPassword ? { newInitialPassword } : {}),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to reset password");
  }
  return res.json();
}

/**
 * Validates password complexity on the client:
 * >= 8 characters, at least one uppercase, one lowercase, and one number or symbol.
 */
export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 8) {
    return { valid: false, reason: "Password must be at least 8 characters long" };
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumberOrSymbol = /[\d\W]/.test(password);

  if (!hasUpper) {
    return { valid: false, reason: "Password must contain at least one uppercase letter" };
  }
  if (!hasLower) {
    return { valid: false, reason: "Password must contain at least one lowercase letter" };
  }
  if (!hasNumberOrSymbol) {
    return { valid: false, reason: "Password must contain at least one number or special symbol" };
  }
  return { valid: true };
}




