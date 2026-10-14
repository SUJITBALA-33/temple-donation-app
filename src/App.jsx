
import React, { useState } from "react";

export default function App() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  return (
    <main className="app">
      <header>
        <h1>கோவில் திருப்பணி வசூல்</h1>
        <p>நன்கொடை மற்றும் கட்டண நிலவரம்</p>
      </header>

      {!unlocked ? (
        <section className="panel">
          <h2>நிர்வாகி உள்நுழைவு</h2>
          <label htmlFor="pin">PIN உள்ளிடவும்</label>
          <input
            id="pin"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="உங்கள் PIN"
          />
          <button onClick={() => {
            if (pin) {
              setUnlocked(true);
              alert("இந்த மாதிரி திரை மட்டும் திறக்கப்பட்டது. Google Sheet இணைப்பு இன்னும் அமைக்கப்படவில்லை.");
            }
          }}>
            உள்ளே செல்லவும்
          </button>
        </section>
      ) : (
        <section className="panel">
          <h2>வணக்கம்!</h2>
          <p>Google Sheets இணைப்பை அடுத்த கட்டத்தில் அமைக்க வேண்டும்.</p>
          <button onClick={() => setUnlocked(false)}>வெளியேறு</button>
        </section>
      )}
    </main>
  );
}
