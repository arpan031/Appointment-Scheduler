import React, { useEffect, useState } from 'react';

const emptyForm = {
  clientName: '',
  date: '',
  time: '',
  purpose: ''
};

const API_URL = '/appointments';

export default function App() {
  const [form, setForm] = useState(emptyForm);
  const [appointments, setAppointments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load appointments');
      setAppointments(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const method = editingId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        const validationText = data.errors ? Object.values(data.errors).join(', ') : data.message;
        throw new Error(validationText || 'Unable to save appointment');
      }

      setAppointments((current) =>
        editingId
          ? current.map((appointment) => (appointment._id === editingId ? data : appointment))
          : [data, ...current]
      );
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (appointment) => {
    setEditingId(appointment._id);
    setForm({
      clientName: appointment.clientName,
      date: appointment.date,
      time: appointment.time,
      purpose: appointment.purpose,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this appointment?')) return;

    try {
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to delete appointment');
      setAppointments((current) => current.filter((appointment) => appointment._id !== id));
      if (editingId === id) resetForm();
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">APPOINTMENT SCHEDULER</p>
        <h1>Plan every appointment with clarity.</h1>
        <p className="subtitle">Create, update, and manage client appointments from one clean dashboard.</p>
      </section>

      <section className="panel form-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{editingId ? 'UPDATE APPOINTMENT' : 'NEW APPOINTMENT'}</p>
            <h2>{editingId ? 'Edit appointment' : 'Schedule an appointment'}</h2>
          </div>
          {editingId && <button className="ghost-button" onClick={resetForm}>Cancel edit</button>}
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Client name
            <input name="clientName" value={form.clientName} onChange={handleChange} placeholder="e.g. Arjun Mehta" required />
          </label>
          <label>
            Date
            <input type="date" name="date" value={form.date} onChange={handleChange} required />
          </label>
          <label>
            Time
            <input type="time" name="time" value={form.time} onChange={handleChange} required />
          </label>
          <label>
            Purpose
            <input name="purpose" value={form.purpose} onChange={handleChange} placeholder="e.g. Project consultation" required />
          </label>
          <div className="actions full-width">
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update appointment' : 'Add appointment'}
            </button>
            {!editingId && <button className="ghost-button" type="button" onClick={resetForm}>Clear</button>}
          </div>
        </form>
      </section>

      {error && <div className="alert">{error}</div>}

      <section className="section-heading list-heading">
        <div>
          <p className="eyebrow">SCHEDULE</p>
          <h2>Upcoming appointments</h2>
        </div>
        <span className="count-badge">{appointments.length} total</span>
      </section>

      <section className="appointments-grid">
        {loading ? (
          <div className="empty-state">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="empty-state">No appointments yet. Use the form above to schedule one.</div>
        ) : (
          appointments.map((appointment) => (
            <article className="appointment-card" key={appointment._id}>
              <div className="date-chip">
                <span>{new Date(`${appointment.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short' })}</span>
                <strong>{new Date(`${appointment.date}T00:00:00`).getDate()}</strong>
              </div>
              <div className="appointment-content">
                <h3>{appointment.clientName}</h3>
                <p className="purpose">{appointment.purpose}</p>
                <p className="meta">{appointment.date} · {appointment.time}</p>
              </div>
              <div className="card-actions">
                <button className="text-button" onClick={() => startEdit(appointment)}>Edit</button>
                <button className="danger-button" onClick={() => handleDelete(appointment._id)}>Delete</button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
