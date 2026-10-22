const STATUSES = [
  ["wishlist", "Wishlist"], ["applied", "Applied"], ["interview", "Interviewing"],
  ["offer", "Offer"], ["rejected", "Rejected"],
];

let apps = [];
let query = "";
let editingId = null;

const $ = (id) => document.getElementById(id);
const field = (name) => $("f-" + name);
const dlg = $("dlg");

/* ---------- API ---------- */
async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Request failed (" + res.status + ")");
  }
  return res.status === 204 ? null : res.json();
}

function showError(message) {
  const box = $("error");
  box.textContent = message;
  box.hidden = !message;
}

/* ---------- helpers ---------- */
function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function el(tag, props, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props || {});
  children.forEach((child) => node.append(child));
  return node;
}

/* ---------- rendering ---------- */
function render() {
  const q = query.trim().toLowerCase();
  const shown = apps.filter((a) => !q || (a.company + " " + a.role).toLowerCase().includes(q));
  const count = (s) => apps.filter((a) => a.status === s).length;
  const active = count("applied") + count("interview");

  $("summary").textContent = apps.length
    ? apps.length + " applications, " + active + " active, " + count("interview") + " interviewing, " + count("offer") + " offers"
    : "No applications yet. Add the first role you are interested in.";

  const board = $("board");
  board.replaceChildren();

  STATUSES.forEach(([key, label]) => {
    const items = shown.filter((a) => a.status === key);
    const col = el("section", { className: "col" });
    col.style.setProperty("--c", "var(--c-" + key + ")");
    col.append(el("h2", {}, label, el("span", { textContent: String(items.length) })));

    if (!items.length) {
      col.append(el("div", { className: "empty", textContent: q ? "No matches." : "Drag a card here." }));
    }
    items.forEach((a) => col.append(renderCard(a)));

    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("over"); });
    col.addEventListener("dragleave", () => col.classList.remove("over"));
    col.addEventListener("drop", (e) => {
      e.preventDefault();
      col.classList.remove("over");
      moveCard(Number(e.dataTransfer.getData("text/plain")), key);
    });
    board.append(col);
  });
}

function renderCard(a) {
  const card = el("button", { className: "card", draggable: true, type: "button" });
  card.append(el("b", { textContent: a.company }), el("span", { className: "role", textContent: a.role }));

  const meta = el("div", { className: "meta" });
  if (a.date) meta.append(el("span", { textContent: "Applied " + formatDate(a.date) }));
  if (a.follow) {
    const open = a.status === "applied" || a.status === "interview";
    const late = open && a.follow <= today();
    meta.append(el("span", {
      className: late ? "due" : "",
      textContent: (late ? "Follow up due " : "Follow up ") + formatDate(a.follow),
    }));
  }
  if (meta.children.length) card.append(meta);

  card.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", String(a.id)));
  card.addEventListener("click", () => openDialog(a));
  return card;
}

/* ---------- actions ---------- */
async function moveCard(id, status) {
  const current = apps.find((a) => a.id === id);
  if (!current || current.status === status) return;
  try {
    const updated = await api("/api/applications/" + id, {
      method: "PUT",
      body: JSON.stringify({ ...current, status }),
    });
    apps = apps.map((a) => (a.id === id ? updated : a));
    showError("");
    render();
  } catch (err) {
    showError(err.message);
  }
}

function openDialog(a) {
  editingId = a ? a.id : null;
  $("dlgTitle").textContent = a ? "Edit application" : "Add application";
  $("del").style.display = a ? "" : "none";
  field("company").value = a ? a.company : "";
  field("role").value = a ? a.role : "";
  field("status").value = a ? a.status : "applied";
  field("date").value = a ? a.date : today();
  field("follow").value = a ? a.follow : "";
  field("link").value = a ? a.link : "";
  field("notes").value = a ? a.notes : "";

  const link = $("open-link");
  link.hidden = !(a && a.link);
  if (a && a.link) link.href = a.link;

  dlg.showModal();
  field("company").focus();
}

/* ---------- wiring ---------- */
STATUSES.forEach(([key, label]) => field("status").append(el("option", { value: key, textContent: label })));

$("add").addEventListener("click", () => openDialog(null));
$("cancel").addEventListener("click", () => dlg.close());
$("search").addEventListener("input", (e) => { query = e.target.value; render(); });

$("del").addEventListener("click", async () => {
  try {
    await api("/api/applications/" + editingId, { method: "DELETE" });
    apps = apps.filter((a) => a.id !== editingId);
    showError("");
    render();
    dlg.close();
  } catch (err) {
    showError(err.message);
    dlg.close();
  }
});

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    company: field("company").value, role: field("role").value, status: field("status").value,
    date: field("date").value, follow: field("follow").value,
    link: field("link").value, notes: field("notes").value,
  };
  try {
    if (editingId) {
      const updated = await api("/api/applications/" + editingId, { method: "PUT", body: JSON.stringify(payload) });
      apps = apps.map((a) => (a.id === editingId ? updated : a));
    } else {
      const created = await api("/api/applications", { method: "POST", body: JSON.stringify(payload) });
      apps = [created, ...apps];
    }
    showError("");
    render();
    dlg.close();
  } catch (err) {
    showError(err.message);
    dlg.close();
  }
});

async function init() {
  try {
    apps = await api("/api/applications");
  } catch (err) {
    showError("Could not load applications. Make sure the Flask server is running.");
  }
  render();
}
init();
