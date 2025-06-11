import React, { useState } from 'react';

const AdminPage = () => {
  const [token, setToken] = useState('');
  const [donations, setDonations] = useState([]);
  const [testimonies, setTestimonies] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchDonations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('https://api.thewayofmessiah.net/donations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Unauthorized or failed request');
      const data = await res.json();
      setDonations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTestimonies = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('https://api.thewayofmessiah.net/testimonies', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Unauthorized or failed request');
      const data = await res.json();
      setTestimonies(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`https://api.thewayofmessiah.net/testimonies/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchTestimonies();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`https://api.thewayofmessiah.net/testimonies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchTestimonies();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
      <div className="mb-6">
        <label className="block mb-2 font-semibold">Admin Token</label>
        <input
          type="password"
          className="w-full p-2 border rounded mb-2"
          placeholder="Enter admin token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <div className="flex gap-4">
          <button onClick={fetchDonations} className="px-4 py-2 bg-blue-600 text-white rounded">
            View Donations
          </button>
          <button onClick={fetchTestimonies} className="px-4 py-2 bg-purple-600 text-white rounded">
            View Testimonies
          </button>
        </div>
      </div>

      {loading && <p>Loading data...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {donations.length > 0 && (
        <div className="mt-6">
          <h2 className="text-2xl font-semibold mb-4">Recent Donations</h2>
          <ul className="space-y-2">
            {donations.map((d, i) => (
              <li key={i} className="border p-4 rounded shadow">
                <p><strong>Email:</strong> {d.email}</p>
                <p><strong>Amount:</strong> ${d.amount_total} {d.currency.toUpperCase()}</p>
                <p><strong>Date:</strong> {d.created}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {testimonies.length > 0 && (
        <div className="mt-10">
          <h2 className="text-2xl font-semibold mb-4">Submitted Testimonies</h2>
          <ul className="space-y-4">
            {testimonies.map((t, i) => (
              <li key={i} className="border p-4 rounded shadow">
                <p><strong>Name:</strong> {t.name || 'Anonymous'}</p>
                <p><strong>Email:</strong> {t.email || 'N/A'}</p>
                <p><strong>Message:</strong> {t.message}</p>
                {t.imageUrl && (
                  <img src={t.imageUrl} alt="Testimony" className="mt-2 max-w-xs rounded" />
                )}
                <div className="mt-4 flex gap-2">
                  <button onClick={() => handleApprove(t.id)} className="px-3 py-1 bg-green-600 text-white rounded">
                    Approve
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="px-3 py-1 bg-red-600 text-white rounded">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
