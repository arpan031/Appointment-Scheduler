import { useEffect, useMemo, useState } from "react";
import "./styles.css";

const API_URL = "/api/appointments";

const emptyForm = {
  clientName: "",
  date: new Date().toISOString().slice(0, 10),
  time: "09:00",
  purpose: "",
};

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (contentType.includes("application/json")) {
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new Error("Server returned invalid JSON.");
    }
  }

  throw new Error(
    text
      ? text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
      : `Request failed with status ${response.status}`
  );
}

function formatDate(date) {
  const d = new Date(`${date}T00:00:00`);

  return {
    month: d.toLocaleDateString(undefined, {
      month: "short",
    }).toUpperCase(),

    day: d.getDate(),
  };
}

function formatFullDate(date) {
  const d = new Date(`${date}T00:00:00`);

  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time) {
  if (!time) return "";

  const [hours, minutes] = time.split(":").map(Number);

  const period = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;

  return `${hour}:${String(minutes).padStart(2, "0")} ${period}`;
}

export default function App() {
  const [appointments, setAppointments] = useState([]);

  const [form, setForm] = useState(emptyForm);

  const [editingId, setEditingId] = useState(null);

  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");

  const [isDark, setIsDark] = useState(false);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [deleteId, setDeleteId] = useState(null);

  const today = new Date().toISOString().slice(0, 10);

  // =========================================
  // GET ALL APPOINTMENTS
  // =========================================

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL);

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to load appointments."
        );
      }

      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.message || "Unable to connect to the appointment API."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // =========================================
  // STATISTICS
  // =========================================

  const stats = useMemo(() => {
    const total = appointments.length;

    const todayCount = appointments.filter(
      (appointment) => appointment.date === today
    ).length;

    const upcoming = appointments.filter(
      (appointment) => appointment.date > today
    ).length;

    return {
      total,
      today: todayCount,
      upcoming,
    };
  }, [appointments, today]);

  // =========================================
  // SEARCH
  // =========================================

  const filteredAppointments = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) {
      return [...appointments].sort(
        (a, b) =>
          `${a.date}${a.time}`.localeCompare(
            `${b.date}${b.time}`
          )
      );
    }

    return appointments
      .filter(
        (appointment) =>
          appointment.clientName
            ?.toLowerCase()
            .includes(searchText) ||
          appointment.purpose
            ?.toLowerCase()
            .includes(searchText)
      )
      .sort(
        (a, b) =>
          `${a.date}${a.time}`.localeCompare(
            `${b.date}${b.time}`
          )
      );
  }, [appointments, search]);

  // =========================================
  // FORM
  // =========================================

  const openNewAppointment = () => {
    setForm({
      ...emptyForm,
      date: today,
    });

    setEditingId(null);
    setError("");
    setShowForm(true);
  };

  const openEditAppointment = (appointment) => {
    setForm({
      clientName: appointment.clientName || "",
      date: appointment.date || "",
      time: appointment.time || "",
      purpose: appointment.purpose || "",
    });

    setEditingId(appointment._id);

    setError("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // =========================================
  // CREATE / UPDATE
  // =========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !form.clientName.trim() ||
      !form.date ||
      !form.time ||
      !form.purpose.trim()
    ) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const url = editingId
        ? `${API_URL}/${editingId}`
        : API_URL;

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          clientName: form.clientName.trim(),
          date: form.date,
          time: form.time,
          purpose: form.purpose.trim(),
        }),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        const validationMessage = data?.errors
          ? Object.values(data.errors).join(", ")
          : data?.message;

        throw new Error(
          validationMessage || "Unable to save appointment."
        );
      }

      // UPDATE
      if (editingId) {
        setAppointments((current) =>
          current.map((appointment) =>
            appointment._id === editingId
              ? data
              : appointment
          )
        );
      }

      // CREATE
      else {
        setAppointments((current) => [
          data,
          ...current,
        ]);
      }

      closeForm();
    } catch (err) {
      setError(
        err.message || "Unable to save appointment."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================
  // DELETE
  // =========================================

  const handleDelete = async (id) => {
    try {
      setError("");

      const response = await fetch(
        `${API_URL}/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to delete appointment."
        );
      }

      setAppointments((current) =>
        current.filter(
          (appointment) => appointment._id !== id
        )
      );

      setDeleteId(null);
    } catch (err) {
      setError(
        err.message || "Unable to delete appointment."
      );

      setDeleteId(null);
    }
  };

  // =========================================
  // UI
  // =========================================

  return (
    <div className={`app ${isDark ? "dark" : ""}`}>
      <div className="container">

        {/* HEADER */}

        <header className="header">
          <div>
            <p className="eyebrow">
              APPOINTMENT SCHEDULER
            </p>

            <h1>Appointments</h1>

            <p className="subtitle">
              Manage your appointments from one clean
              dashboard.
            </p>
          </div>

          <button
            className="theme-button"
            onClick={() =>
              setIsDark((current) => !current)
            }
          >
            {isDark ? "☀" : "☾"}
          </button>
        </header>

        {/* STATISTICS */}

        <section className="stats-grid">

          <div className="stat-card">
            <div className="stat-icon blue">
              ✓
            </div>

            <div>
              <strong>{stats.total}</strong>

              <span>
                Total appointments
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              ●
            </div>

            <div>
              <strong>{stats.today}</strong>

              <span>
                Today
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon amber">
              ↗
            </div>

            <div>
              <strong>{stats.upcoming}</strong>

              <span>
                Upcoming
              </span>
            </div>
          </div>

        </section>

        {/* TOOLBAR */}

        <div className="toolbar">

          <div className="search-box">
            <span>⌕</span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search appointments..."
            />

            {search && (
              <button
                className="clear-search"
                onClick={() => setSearch("")}
              >
                ×
              </button>
            )}
          </div>

          <button
            className="new-button"
            onClick={openNewAppointment}
          >
            <span>+</span>
            New appointment
          </button>

        </div>

        {/* ERROR */}

        {error && (
          <div className="alert">
            <span>!</span>

            <span>{error}</span>

            <button
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}

        {/* FORM */}

        {showForm && (
          <section className="form-panel">

            <div className="form-header">

              <div>
                <p className="eyebrow">
                  {editingId ? "EDIT" : "NEW"}
                </p>

                <h2>
                  {editingId
                    ? "Edit appointment"
                    : "New appointment"}
                </h2>
              </div>

              <button
                className="close-button"
                onClick={closeForm}
              >
                ×
              </button>

            </div>

            <form onSubmit={handleSubmit}>

              <div className="form-grid">

                <label className="field full">
                  <span>
                    Client name
                  </span>

                  <input
                    required
                    name="clientName"
                    value={form.clientName}
                    onChange={handleChange}
                    placeholder="e.g. Arjun Mehta"
                  />
                </label>

                <label className="field">
                  <span>Date</span>

                  <input
                    required
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                  />
                </label>

                <label className="field">
                  <span>Time</span>

                  <input
                    required
                    type="time"
                    name="time"
                    value={form.time}
                    onChange={handleChange}
                  />
                </label>

                <label className="field full">
                  <span>
                    Purpose
                  </span>

                  <input
                    required
                    name="purpose"
                    value={form.purpose}
                    onChange={handleChange}
                    placeholder="e.g. Project consultation"
                  />
                </label>

              </div>

              <div className="form-actions">

                <button
                  className="save-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Save changes"
                    : "Add appointment"}
                </button>

                <button
                  className="cancel-button"
                  type="button"
                  onClick={closeForm}
                >
                  Cancel
                </button>

              </div>

            </form>

          </section>
        )}

        {/* LIST HEADER */}

        <div className="list-header">

          <h2>
            {search
              ? "Search results"
              : "All appointments"}
          </h2>

          <span>
            {filteredAppointments.length}{" "}
            {filteredAppointments.length === 1
              ? "appointment"
              : "appointments"}
          </span>

        </div>

        {/* APPOINTMENTS */}

        {loading ? (

          <div className="empty-state">
            <div className="loading-spinner" />
            <p>
              Loading appointments...
            </p>
          </div>

        ) : filteredAppointments.length === 0 ? (

          <div className="empty-state">

            <div className="empty-icon">
              □
            </div>

            <h3>
              No appointments found
            </h3>

            <p>
              {search
                ? "Try a different search."
                : "Create your first appointment to get started."}
            </p>

          </div>

        ) : (

          <div className="appointment-list">

            {filteredAppointments.map(
              (appointment, index) => {

                const { month, day } =
                  formatDate(appointment.date);

                const isToday =
                  appointment.date === today;

                return (
                  <article
                    className="appointment-card"
                    key={appointment._id}
                    style={{
                      animationDelay:
                        `${index * 40}ms`,
                    }}
                  >

                    {/* DATE */}

                    <div
                      className={`date-box ${
                        isToday ? "today" : ""
                      }`}
                    >
                      <span>
                        {month}
                      </span>

                      <strong>
                        {day}
                      </strong>
                    </div>

                    {/* INFO */}

                    <div className="appointment-info">

                      <h3>
                        {appointment.clientName}
                      </h3>

                      <p className="purpose">
                        {appointment.purpose}
                      </p>

                      <p className="appointment-meta">
                        <span>◷</span>

                        {formatFullDate(
                          appointment.date
                        )}

                        {" · "}

                        {formatTime(
                          appointment.time
                        )}
                      </p>

                    </div>

                    {/* ACTIONS */}

                    <div className="card-actions">

                      <button
                        className="icon-button edit"
                        onClick={() =>
                          openEditAppointment(
                            appointment
                          )
                        }
                        title="Edit appointment"
                      >
                        ✎
                      </button>

                      {deleteId ===
                      appointment._id ? (

                        <div className="delete-confirm">

                          <button
                            className="delete-confirm-button"
                            onClick={() =>
                              handleDelete(
                                appointment._id
                              )
                            }
                          >
                            Delete
                          </button>

                          <button
                            className="keep-button"
                            onClick={() =>
                              setDeleteId(null)
                            }
                          >
                            Keep
                          </button>

                        </div>

                      ) : (

                        <button
                          className="icon-button delete"
                          onClick={() =>
                            setDeleteId(
                              appointment._id
                            )
                          }
                          title="Delete appointment"
                        >
                          ×
                        </button>

                      )}

                    </div>

                  </article>
                );
              }
            )}

          </div>
        )}

      </div>
    </div>
  );
}
