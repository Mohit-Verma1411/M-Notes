import hashlib
import hmac
import os
import secrets
import sqlite3
import time

from fastapi import Depends, FastAPI, Header, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("MNOTES_DB", os.path.join(BASE_DIR, "m_notes.db"))
PBKDF2_ITERATIONS = 200_000
TOKEN_TTL_SECONDS = 90 * 24 * 3600

app = FastAPI(title="M Notes API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

WELCOME_BODY = (
    "This is a quieter place to keep notes. Sign in on any device and "
    "your notes stay in step with you.\n\nA few things to try:\n\n"
    "\u2022 Press Ctrl+N (Cmd+N on Mac) to start a new note\n"
    "\u2022 Pin anything important with the pin icon\n"
    "\u2022 Search across every note from the sidebar\n\n"
    "Your notes are saved as you type, so you can close the tab and pick up "
    "where you left off."
)


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id         INTEGER PRIMARY KEY AUTOINCREMENT,
              username   TEXT NOT NULL UNIQUE,
              pw_hash    TEXT NOT NULL,
              created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tokens (
              token_hash TEXT PRIMARY KEY,
              user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS notes (
              user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              id         TEXT NOT NULL,
              title      TEXT NOT NULL DEFAULT '',
              body       TEXT NOT NULL DEFAULT '',
              pinned     INTEGER NOT NULL DEFAULT 0,
              created_at INTEGER NOT NULL,
              updated_at INTEGER NOT NULL,
              PRIMARY KEY (user_id, id)
            );
            """
        )
        columns = {row[1] for row in conn.execute("PRAGMA table_info(users)")}
        if "email" in columns and "username" not in columns:
            conn.execute("ALTER TABLE users RENAME COLUMN email TO username")


init_db()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt, PBKDF2_ITERATIONS
    )
    return f"{PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        iterations, salt_hex, digest_hex = stored.split("$")
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode(),
            bytes.fromhex(salt_hex),
            int(iterations),
        )
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def create_token(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    digest = hashlib.sha256(token.encode()).hexdigest()
    with connect() as conn:
        conn.execute(
            "INSERT INTO tokens (token_hash, user_id, created_at) VALUES (?, ?, ?)",
            (digest, user_id, int(time.time())),
        )
    return token


def user_row_for_token(token: str) -> sqlite3.Row | None:
    digest = hashlib.sha256(token.encode()).hexdigest()
    with connect() as conn:
        row = conn.execute(
            """
            SELECT u.id, u.username, u.created_at AS user_created,
                   t.created_at AS token_created
            FROM tokens t
            JOIN users u ON u.id = t.user_id
            WHERE t.token_hash = ?
            """,
            (digest,),
        ).fetchone()
    if row is None:
        return None
    if time.time() - row["token_created"] > TOKEN_TTL_SECONDS:
        with connect() as conn:
            conn.execute("DELETE FROM tokens WHERE token_hash = ?", (digest,))
        return None
    return row


def require_user(
    authorization: str | None = Header(None),
) -> sqlite3.Row:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not signed in")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not signed in")
    row = user_row_for_token(token)
    if row is None:
        raise HTTPException(status_code=401, detail="Session expired")
    return row


class Credentials(BaseModel):
    username: str
    password: str


class NotePayload(BaseModel):
    id: str
    title: str = ""
    body: str = ""
    pinned: bool = False
    createdAt: int = 0
    updatedAt: int = 0


def user_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "username": row["username"],
        "createdAt": row["user_created"],
    }


def note_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "body": row["body"],
        "pinned": bool(row["pinned"]),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


@app.post("/api/auth/signup")
def signup(body: Credentials):
    username = (body.username or "").strip()
    password = body.password or ""
    if not (2 <= len(username) <= 32) or any(ch.isspace() for ch in username):
        raise HTTPException(
            status_code=400,
            detail="Username must be 2–32 characters with no spaces",
        )
    if len(password) < 6:
        raise HTTPException(
            status_code=400, detail="Password must be at least 6 characters"
        )
    now = int(time.time() * 1000)
    try:
        with connect() as conn:
            cur = conn.execute(
                "INSERT INTO users (username, pw_hash, created_at) VALUES (?, ?, ?)",
                (username, hash_password(password), now),
            )
            user_id = cur.lastrowid
            conn.execute(
                """
                INSERT INTO notes (user_id, id, title, body, pinned, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    "welcome",
                    "Welcome to M Notes",
                    WELCOME_BODY,
                    1,
                    now - 86400000,
                    now - 7200000,
                ),
            )
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=409, detail="That username is already taken"
        )
    token = create_token(user_id)
    with connect() as conn:
        user = conn.execute(
            "SELECT id, username, created_at AS user_created FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    return {"token": token, "user": user_dict(user)}


@app.post("/api/auth/login")
def login(body: Credentials):
    username = (body.username or "").strip()
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        ).fetchone()
    if row is None or not verify_password(body.password or "", row["pw_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = create_token(row["id"])
    user = {
        "id": row["id"],
        "username": row["username"],
        "createdAt": row["created_at"],
    }
    return {"token": token, "user": user}


@app.post("/api/auth/logout")
def logout(authorization: str | None = Header(None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        digest = hashlib.sha256(token.encode()).hexdigest()
        with connect() as conn:
            conn.execute("DELETE FROM tokens WHERE token_hash = ?", (digest,))
    return {"ok": True}


@app.get("/api/auth/me")
def me(user: sqlite3.Row = Depends(require_user)):
    return {"user": user_dict(user)}


@app.get("/api/notes")
def list_notes(user: sqlite3.Row = Depends(require_user)):
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT * FROM notes
            WHERE user_id = ?
            ORDER BY pinned DESC, updated_at DESC
            """,
            (user["id"],),
        ).fetchall()
    return {"notes": [note_dict(r) for r in rows]}


@app.put("/api/notes/{note_id}")
def upsert_note(
    note_id: str,
    body: NotePayload,
    user: sqlite3.Row = Depends(require_user),
):
    now = int(time.time() * 1000)
    created = body.createdAt or now
    updated = body.updatedAt or now
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO notes (user_id, id, title, body, pinned, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, id) DO UPDATE SET
              title = excluded.title,
              body = excluded.body,
              pinned = excluded.pinned,
              created_at = excluded.created_at,
              updated_at = excluded.updated_at
            """,
            (
                user["id"],
                note_id,
                body.title,
                body.body,
                1 if body.pinned else 0,
                created,
                updated,
            ),
        )
    return {
        "note": {
            "id": note_id,
            "title": body.title,
            "body": body.body,
            "pinned": body.pinned,
            "createdAt": created,
            "updatedAt": updated,
        }
    }


@app.delete("/api/notes/{note_id}", status_code=204)
def delete_note(
    note_id: str,
    user: sqlite3.Row = Depends(require_user),
):
    with connect() as conn:
        conn.execute(
            "DELETE FROM notes WHERE user_id = ? AND id = ?",
            (user["id"], note_id),
        )
    return Response(status_code=204)