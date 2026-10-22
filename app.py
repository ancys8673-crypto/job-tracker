"""Job application tracker: Flask + SQLite backend."""
import sqlite3
from pathlib import Path

from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "jobs.db"
STATUSES = {"wishlist", "applied", "interview", "offer", "rejected"}
TEXT_FIELDS = ("company", "role", "date", "follow", "link", "notes")

app = Flask(__name__)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS applications (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                company TEXT NOT NULL,
                role    TEXT NOT NULL,
                status  TEXT NOT NULL DEFAULT 'applied',
                date    TEXT NOT NULL DEFAULT '',
                follow  TEXT NOT NULL DEFAULT '',
                link    TEXT NOT NULL DEFAULT '',
                notes   TEXT NOT NULL DEFAULT ''
            )"""
        )


def clean(payload):
    """Validate and normalise incoming JSON. Returns (data, error)."""
    if not isinstance(payload, dict):
        return None, "Expected a JSON object."
    data = {f: str(payload.get(f, "")).strip() for f in TEXT_FIELDS}
    data["status"] = str(payload.get("status", "applied")).strip()
    if not data["company"] or not data["role"]:
        return None, "Company and role are required."
    if data["status"] not in STATUSES:
        return None, "Invalid status."
    if data["link"] and not data["link"].lower().startswith(("http://", "https://")):
        return None, "Job link must start with http:// or https://."
    return data, None


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/applications")
def list_applications():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM applications ORDER BY id DESC").fetchall()
    return jsonify([dict(r) for r in rows])


@app.post("/api/applications")
def create_application():
    data, error = clean(request.get_json(silent=True))
    if error:
        return jsonify(error=error), 400
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO applications (company, role, status, date, follow, link, notes) "
            "VALUES (:company, :role, :status, :date, :follow, :link, :notes)",
            data,
        )
        row = conn.execute("SELECT * FROM applications WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(dict(row)), 201


@app.put("/api/applications/<int:app_id>")
def update_application(app_id):
    data, error = clean(request.get_json(silent=True))
    if error:
        return jsonify(error=error), 400
    data["id"] = app_id
    with get_db() as conn:
        cur = conn.execute(
            "UPDATE applications SET company=:company, role=:role, status=:status, "
            "date=:date, follow=:follow, link=:link, notes=:notes WHERE id=:id",
            data,
        )
        if cur.rowcount == 0:
            return jsonify(error="Application not found."), 404
        row = conn.execute("SELECT * FROM applications WHERE id = ?", (app_id,)).fetchone()
    return jsonify(dict(row))


@app.delete("/api/applications/<int:app_id>")
def delete_application(app_id):
    with get_db() as conn:
        cur = conn.execute("DELETE FROM applications WHERE id = ?", (app_id,))
    if cur.rowcount == 0:
        return jsonify(error="Application not found."), 404
    return "", 204


init_db()

if __name__ == "__main__":
    app.run(debug=True)
