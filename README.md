# Job application tracker

A small full-stack app for tracking job applications on a kanban board.

- **Backend:** Python, Flask, SQLite (`app.py`)
- **Frontend:** HTML (`templates/index.html`), CSS (`static/style.css`), JavaScript (`static/app.js`)

## Features
- Board with Wishlist, Applied, Interviewing, Offer and Rejected columns
- Drag and drop cards between columns
- Add, edit and delete applications (company, role, dates, link, notes)
- Follow-up reminders highlighted when overdue
- Search by company or role
- Data stored in a local SQLite file (`jobs.db`)

## Run locally

```bash
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000 in your browser.

## API

| Method | Route                       | Purpose            |
|--------|-----------------------------|--------------------|
| GET    | `/api/applications`         | List applications  |
| POST   | `/api/applications`         | Create one         |
| PUT    | `/api/applications/<id>`    | Update one         |
| DELETE | `/api/applications/<id>`    | Delete one         |

## Project structure

```
job-tracker/
├── app.py
├── requirements.txt
├── templates/index.html
└── static/
    ├── style.css
    └── app.js
```

## Ideas for next steps
- User accounts and login
- CSV export
- Application timeline and charts
- Deploy to Render or Railway
