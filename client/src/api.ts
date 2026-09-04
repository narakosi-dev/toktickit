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

