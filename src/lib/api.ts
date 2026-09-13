import type { Note } from "@/lib/notes"

export interface ApiUser {
  id: number
  username: string
  createdAt: number
}

export const API_BASE_URL = ""

const TOKEN_KEY = "m-notes.token"

export function getSavedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function apiEnabled(): boolean {
  return API_BASE_URL !== ""
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  const token = getSavedToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    let detail = "Something went wrong"
    try {
      const data = (await res.json()) as { detail?: string }
      if (data.detail) detail = data.detail
    } catch {
      // keep default message
    }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

interface AuthResponse {
  token: string
  user: ApiUser
}

export async function signUp(username: string, password: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })
  saveToken(data.token)
  return data
}

export async function signIn(username: string, password: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })
  saveToken(data.token)
  return data
}

export async function signOut(): Promise<void> {
  try {
    await request("/api/auth/logout", { method: "POST" })
  } catch {
    // ignore network errors — clear the local session regardless
  }
  clearToken()
}

export async function currentUser(): Promise<ApiUser | null> {
  if (!apiEnabled() || !getSavedToken()) return null
  try {
    const data = await request<{ user: ApiUser }>("/api/auth/me")
    return data.user
  } catch {
    clearToken()
    return null
  }
}

export async function listNotes(): Promise<Note[]> {
  const data = await request<{ notes: Note[] }>("/api/notes")
  return data.notes
}

export async function putNote(note: Note): Promise<void> {
  await request(`/api/notes/${encodeURIComponent(note.id)}`, {
    method: "PUT",
    body: JSON.stringify({
      id: note.id,
      title: note.title,
      body: note.body,
      pinned: note.pinned,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }),
  })
}

export async function deleteNote(id: string): Promise<void> {
  await request(`/api/notes/${encodeURIComponent(id)}`, { method: "DELETE" })
}