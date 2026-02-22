"use client";

import React, { useState } from "react";

export default function PaymentPage() {
  const [sandbox, setSandbox] = useState(true);
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (sandbox) {
      setStatus("Sandbox transaction: Payment simulated. Receipt will be emailed.");
      // Simulate sending receipt
      setTimeout(() => {
        alert(`Digital receipt sent to ${email}`);
      }, 1000);
    } else {
      setStatus("Live transaction: Payment processed.");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto", padding: 20 }}>
      <h2>Payment Page</h2>
      <form onSubmit={handlePayment}>
        <label htmlFor="email">Email:</label>
        <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: "100%", marginBottom: 8 }} />
        <label htmlFor="amount">Amount:</label>
        <input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} required style={{ width: "100%", marginBottom: 8 }} />
        <div style={{ marginBottom: 8 }}>
          <label>
            <input type="checkbox" checked={sandbox} onChange={e => setSandbox(e.target.checked)} /> Sandbox Mode
          </label>
        </div>
        <button type="submit">Pay</button>
      </form>
      {status && <p style={{ marginTop: 16 }}>{status}</p>}
    </div>
  );
}
