
import React, { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function App() {
  const [pin, setPin] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [donors, setDonors] = useState([]);
  const [work, setWork] = useState("");
  const [amounts, setAmounts] = useState({});
  const [search, setSearch] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function api(action, extra = {}) {
    if (!API_URL) {
      throw new Error("VITE_API_URL அமைக்கப்படவில்லை. Vercel Settings சரிபார்க்கவும்.");
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ pin, action, ...extra })
    });

    if (!response.ok) {
      throw new Error("Backend பதில் பிழை: " + response.status);
    }

    const data = await response.json();

    if (data.error) throw new Error(data.error);

    setDonors(data.donors || []);
    setWork(data.work || "");
    return data;
  }

  async function run(action, extra = {}) {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api(action, extra);
      setLoggedIn(true);
      setNotice("Google Sheet வெற்றிகரமாகப் புதுப்பிக்கப்பட்டது.");
      return true;
    } catch (e) {
      setError(
        e.message || "இணைப்பில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்."
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  const total = donors.reduce((s, d) => s + d.total, 0);
  const paid = donors.reduce((s, d) => s + d.paid, 0);
  const balance = donors.reduce((s, d) => s + d.bal, 0);

  const visibleDonors = donors.filter(d => {
    const matches =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search);
    return matches && (!pendingOnly || d.bal > 0);
  });

  if (!loggedIn) {
    return (
      <main className="app">
        <header>
          <h1>கோவில் திருப்பணி வசூல்</h1>
          <p>நன்கொடை மற்றும் கட்டண நிலவரம்</p>
        </header>

        <section className="panel">
          <h2>நிர்வாகி உள்நுழைவு</h2>
          <form onSubmit={e => {
            e.preventDefault();
            run("load");
          }}>
            <label htmlFor="pin">PIN உள்ளிடவும்</label>
            <input
              id="pin"
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              required
            />
            <button disabled={busy}>
              {busy ? "சரிபார்க்கிறது..." : "உள்ளே செல்லவும்"}
            </button>
          </form>
          {error && <p role="alert">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <header>
        <h1>கோவில் திருப்பணி வசூல்</h1>
        <p>நன்கொடை கணக்கு மேலாண்மை</p>
      </header>

      <section className="panel">
        <h2>மொத்த கணக்கு</h2>
        <p>மொத்த இலக்கு: ₹{total.toLocaleString("en-IN")}</p>
        <p>மொத்தம் வழங்கியது: ₹{paid.toLocaleString("en-IN")}</p>
        <p>மீதம்: ₹{balance.toLocaleString("en-IN")}</p>
        <button disabled={busy} onClick={() => run("load")}>
          கணக்கைப் புதுப்பிக்கவும்
        </button>
      </section>

      <section className="panel">
        <h2>திருப்பணி நிலவரம்</h2>
        <textarea
          value={work}
          onChange={e => setWork(e.target.value)}
          placeholder="திருப்பணி நிலவரத்தை உள்ளிடவும்"
        />
        <button disabled={busy} onClick={() => run("work", { text: work })}>
          நிலவரத்தைச் சேமிக்கவும்
        </button>
      </section>

      <section className="panel">
        <h2>நன்கொடையாளர்கள் ({visibleDonors.length})</h2>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="பெயர் அல்லது தொலைபேசி எண் தேடவும்"
        />

        <label>
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={e => setPendingOnly(e.target.checked)}
          />
          மீதம் உள்ளவர்கள் மட்டும்
        </label>

        {visibleDonors.map(d => (
          <article className="donor" key={d.row}>
            <h3>{d.name}</h3>
            <p>மொத்த இலக்கு: ₹{d.total}</p>
            <p>மொத்தம் வழங்கியது: ₹{d.paid}</p>
            <p>மீதம்: ₹{d.bal}</p>

            <input
              type="number"
              min="1"
              step="1"
              placeholder="சேர்க்க வேண்டிய தொகை"
              value={amounts[d.row] || ""}
              onChange={e => setAmounts(old => ({
                ...old, [d.row]: e.target.value
              }))}
            />

            <button disabled={busy} onClick={async () => {
              const amount = Number(amounts[d.row]);

              if (!Number.isSafeInteger(amount) || amount <= 0) {
                setError("சரியான முழு ரூபாய் தொகையை உள்ளிடவும்.");
                return;
              }

              if (amount > d.bal) {
                setError("மீதமுள்ள தொகையைவிட அதிகமாகப் பதிவு செய்ய முடியாது.");
                return;
              }

              if (!window.confirm(
                `${d.name} அவர்களுக்கு ₹${amount} பதிவு செய்யவா?`
              )) return;

              const ok = await run("pay", { row: d.row, amount });
              if (ok) {
                setAmounts(old => ({ ...old, [d.row]: "" }));
              }
            }}>
              பணம் சேர்
            </button>

            {d.phone && (
              <p>
                <a
                  href={`https://wa.me/91${d.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(
                    `வணக்கம் ${d.name}, மொத்தம் வழங்கியது ₹${d.paid}, மீதம் ₹${d.bal}. திருப்பணி நிலவரம்: ${work}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp செய்தி
                </a>
              </p>
            )}
          </article>
        ))}
      </section>

      <section className="panel">
        <h2>புதிய வசூல் சுற்று</h2>
        <p>முந்தைய மொத்தத்தை D column-க்கு மாற்றி, E column-ஐ பூஜ்ஜியமாக்கும்.</p>
        <button disabled={busy} onClick={() => {
          if (window.confirm(
            "புதிய சுற்றைத் தொடங்கவா? முதலில் Sheet backup எடுத்துக்கொள்ளுங்கள்."
          )) {
            run("newRound");
          }
        }}>
          புதிய சுற்று தொடங்கு
        </button>
      </section>

      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}

      <button onClick={() => {
        setLoggedIn(false);
        setPin("");
        setDonors([]);
        setError("");
        setNotice("");
      }}>
        வெளியேறு
      </button>
    </main>
  );
}
