import { useEffect, useMemo, useRef, useState } from 'react'
import './styles.css'

const rs = n => '₹' + Number(n || 0).toLocaleString('en-IN')
const first = s => { try { return [...new Intl.Segmenter('ta', { granularity: 'grapheme' }).segment(s)][0].segment } catch { return (s || '?')[0] } }
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'r' + Date.now() + Math.random().toString(36).slice(2, 10))

const localMsg = d => `அருள்மிகு ஸ்ரீ காமாட்சி அம்மன் திருக்கோவில் மலையப்பாளையம். மாங்கல்ய காணிக்கை விபரம். திரு.${d.name}, கோவில் திருப்பணிக்கு ஆதரவளித்தமைக்கு நன்றி. மொத்த தொகை ₹${d.total}. தற்பொழுது வழங்கிய தொகை: ₹${d.now}. மொத்தம் வழங்கிய தொகை : ₹${d.paid}. மீதம் வழங்க வேண்டிய தொகை : ₹${d.bal}. திருக்கோவில் திருப்பணிகள் சிறப்பாக நடைபெற்று வருகின்றன. அனைவருக்கும் அம்மனின் திருவருள் கிடைக்க வேண்டுகிறோம். இப்படிக்கு :- அருள்மிகு ஸ்ரீ காமாட்சி அம்மன் திருக்கோவில் திருப்பணிக்குழு மலையப்பாளையம்.`

async function api(pin, action, extra = {}) {
  const res = await fetch('/api/sheets', {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ pin, action, ...extra })
  })
  let data = null
  try { data = await res.json() } catch { /* not JSON */ }
  if (!res.ok || !data || data.error) {
    const e = new Error((data && data.error) || 'Backend பதில் பிழை: ' + res.status)
    e.badPin = res.status === 401 || (data && (data.code === 'BAD_PIN' || data.error === 'PIN தவறு'))
    throw e
  }
  return data
}

export default function App() {
  const [pin, setPin] = useState(sessionStorage.getItem('pin') || '')
  const [authed, setAuthed] = useState(false)
  const [donors, setDonors] = useState([])
  const [work, setWork] = useState('')
  const [workDraft, setWorkDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [sheet, setSheet] = useState(null)
  const pinRef = useRef(pin)

  const say = (text, bad) => { setToast({ text, bad }); setTimeout(() => setToast(null), bad ? 4500 : 2200) }

  async function run(action, extra, okText) {
    setBusy(true)
    try {
      const d = await api(pinRef.current, action, extra)
      setDonors(d.donors || []); setWork(d.work || ''); setWorkDraft(d.work || '')
      setAuthed(true); sessionStorage.setItem('pin', pinRef.current)
      if (okText) say(okText)
      return true
    } catch (e) {
      if (e.badPin) { setAuthed(false); sessionStorage.removeItem('pin') }
      say(e.message === 'Failed to fetch' ? 'இணைய இணைப்பை சரிபார்க்கவும்' : e.message, true)
      return false
    } finally { setBusy(false) }
  }
  useEffect(() => { if (pin) run('load') }, [])

  const stats = useMemo(() => {
    const total = donors.reduce((a, d) => a + d.total, 0), paid = donors.reduce((a, d) => a + d.paid, 0)
    return { total, paid, bal: Math.max(0, total - paid), pct: total ? Math.min(100, Math.round(paid * 100 / total)) : 0,
      done: donors.filter(d => d.bal <= 0).length }
  }, [donors])

  const shown = useMemo(() => donors.filter(d =>
    (d.name + d.phone).toLowerCase().includes(q.trim().toLowerCase()) &&
    (tab === 'all' || (tab === 'pending' ? d.bal > 0 : d.bal <= 0))), [donors, q, tab])

  if (!authed) return (
    <div className="login">
      <div className="logo">🛕</div>
      <h1>கோவில் திருவிழா வசூல்</h1>
      <p>நிர்வாகி PIN-ஐ உள்ளிடவும்</p>
      <form onSubmit={e => { e.preventDefault(); pinRef.current = pin; run('load') }}>
        <input type="password" inputMode="numeric" autoComplete="current-password" value={pin}
          onChange={e => setPin(e.target.value)} placeholder="PIN" aria-label="PIN" />
        <button className="btn" disabled={busy || !pin}>{busy ? 'சரிபார்க்கிறது…' : 'உள்ளே செல்'}</button>
      </form>
      {toast && <div className={'toast' + (toast.bad ? ' bad' : '')} role="alert">{toast.text}</div>}
    </div>
  )

  const C = 2 * Math.PI * 44

  return (
    <div className="app">
      <header>
        <div className="kolam" />
        <div className="hero">
          <svg viewBox="0 0 100 100" className="ring" role="img" aria-label={`${stats.pct}% வசூல்`}>
            <circle cx="50" cy="50" r="44" className="track" />
            <circle cx="50" cy="50" r="44" className="fill" strokeDasharray={C} strokeDashoffset={C * (1 - stats.pct / 100)} />
            <text x="50" y="57" textAnchor="middle">{stats.pct}%</text>
          </svg>
          <div className="nums">
            <h1>கோவில் திருவிழா வசூல்</h1>
            <div><b>{rs(stats.paid)}</b> வசூல்</div>
            <div><b>{rs(stats.bal)}</b> மீதம்</div>
            <small>இலக்கு {rs(stats.total)} · {stats.done}/{donors.length} பேர் முடித்தனர்</small>
          </div>
        </div>
      </header>

      <main>
        <section className="card work">
          <label htmlFor="work">🔨 திருப்பணி நிலவரம்</label>
          <textarea id="work" rows="2" value={workDraft} onChange={e => setWorkDraft(e.target.value)} placeholder="எ.கா: கோபுர வர்ணம் 60% முடிந்தது" />
          {workDraft !== work && <button className="btn" disabled={busy} onClick={() => run('work', { text: workDraft }, 'நிலவரம் சேமிக்கப்பட்டது')}>சேமி</button>}
        </section>

        <div className="find">
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 பெயர் அல்லது எண் தேடு" aria-label="தேடு" />
          <div className="tabs" role="tablist">
            {[['all', 'அனைவரும்'], ['pending', 'மீதம் உள்ளவர்'], ['done', 'முடித்தவர்']].map(([k, t]) =>
              <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>)}
          </div>
        </div>

        <ul className="list">
          {shown.map(d => {
            const pct = d.total ? Math.min(100, Math.round(d.paid * 100 / d.total)) : 0
            return (
              <li key={d.row} className={d.bal <= 0 ? 'done' : ''}>
                <div className="avatar" aria-hidden="true">{first(d.name)}</div>
                <div className="info">
                  <b>{d.name}</b>
                  <span className="ph">{d.phone}</span>
                  <div className="mini"><i style={{ width: pct + '%' }} /></div>
                  <span className="line">{rs(d.paid)} / {rs(d.total)} · <strong>{d.bal > 0 ? 'மீதம் ' + rs(d.bal) : '✔ முழுவதும் செலுத்தினார்'}</strong></span>
                </div>
                <div className="acts">
                  <button className="btn" onClick={() => setSheet({ type: 'pay', d })}>+ பணம்</button>
                  <button className="btn ghost" onClick={() => setSheet({ type: 'msg', d })}>📄 செய்தி</button>
                </div>
              </li>)
          })}
          {!shown.length && <p className="empty">யாரும் இல்லை</p>}
        </ul>
      </main>

      <nav className="dock">
        <button className="btn" onClick={() => setSheet({ type: 'add' })}>+ புதிய நன்கொடையாளர்</button>
        <button className="btn ghost" onClick={() => setSheet({ type: 'round' })}>புதிய சுற்று</button>
        <button className="link" onClick={() => { sessionStorage.removeItem('pin'); setAuthed(false); setPin('') }}>வெளியேறு</button>
      </nav>

      {sheet && sheet.type === 'msg' && <MsgSheet d={sheet.d} close={() => setSheet(null)} say={say} />}
      {sheet && sheet.type !== 'msg' && <Sheet sheet={sheet} busy={busy} close={() => setSheet(null)}
        go={async (a, x, t) => { if (await run(a, x, t)) setSheet(null) }} />}
      {toast && <div className={'toast' + (toast.bad ? ' bad' : '')} role="alert">{toast.text}</div>}
    </div>
  )
}

function Sheet({ sheet, busy, close, go }) {
  const d = sheet.d
  const [rid] = useState(uid)           // same id on retry = no double payment
  const [amt, setAmt] = useState('')
  const [minus, setMinus] = useState(false)
  const [f, setF] = useState({ name: '', phone: '', total: '' })
  const n = Number(amt) || 0
  const after = d ? d.bal - (minus ? -n : n) : 0

  return (
    <div className="back" onClick={close}>
      <form className="sheet" onClick={e => e.stopPropagation()} onSubmit={e => {
        e.preventDefault()
        if (sheet.type === 'pay') go('pay', { row: d.row, amount: minus ? -n : n, requestId: rid }, 'பணம் சேர்க்கப்பட்டது ✔')
        else if (sheet.type === 'add') go('addDonor', { name: f.name.trim(), phone: f.phone.replace(/\D/g, '').slice(-10), total: Number(f.total) }, 'நன்கொடையாளர் சேர்க்கப்பட்டார் ✔')
        else go('newRound', {}, 'புதிய சுற்று தொடங்கியது ✔')
      }}>
        {sheet.type === 'pay' && <>
          <h2>{d.name}</h2>
          <p>தற்போது மீதம்: <b>{rs(d.bal)}</b></p>
          <input autoFocus type="number" inputMode="numeric" min="1" value={amt} onChange={e => setAmt(e.target.value)} placeholder="தொகை ₹" aria-label="தொகை" />
          <div className="chips">
            {[500, 1000, 2000, 5000].map(v => <button type="button" key={v} onClick={() => setAmt(String(v))}>{rs(v)}</button>)}
            {d.bal > 0 && <button type="button" onClick={() => setAmt(String(d.bal))}>மீதம் முழுவதும்</button>}
          </div>
          <label className="check"><input type="checkbox" checked={minus} onChange={e => setMinus(e.target.checked)} /> தவறாக சேர்த்ததை கழிக்க</label>
          {n > 0 && <p className="preview">{minus ? 'கழித்த' : 'சேர்த்த'} பிறகு மீதம்: <b>{rs(Math.max(0, after))}</b></p>}
        </>}
        {sheet.type === 'add' && <>
          <h2>புதிய நன்கொடையாளர்</h2>
          <input autoFocus required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="பெயர்" />
          <input required type="tel" inputMode="numeric" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="10 இலக்க கைபேசி எண்" />
          <input required type="number" inputMode="numeric" min="1" value={f.total} onChange={e => setF({ ...f, total: e.target.value })} placeholder="வழங்குவதாக சொன்ன தொகை ₹" />
        </>}
        {sheet.type === 'round' && <>
          <h2>புதிய சுற்று தொடங்கவா?</h2>
          <p>இதுவரை வழங்கிய மொத்தம் “முன்பு வழங்கிய” பகுதிக்கு மாறும். “தற்பொழுது வழங்கிய” 0 ஆகும். இதை உடனே திரும்பப் பெற முடியாது.</p>
        </>}
        <div className="row">
          <button type="button" className="btn ghost" onClick={close}>ரத்து</button>
          <button className="btn" disabled={busy || (sheet.type === 'pay' && !n)}>{busy ? 'சேமிக்கிறது…' : sheet.type === 'round' ? 'ஆம், தொடங்கு' : 'சேமி'}</button>
        </div>
      </form>
    </div>
  )
}

function MsgSheet({ d, close, say }) {
  const text = d.msg || localMsg(d)
  const sep = /iPhone|iPad/.test(navigator.userAgent) ? '&' : '?'
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); say('நகலெடுக்கப்பட்டது ✔') }
    catch { say('நகலெடுக்க முடியவில்லை', true) }
  }
  return (
    <div className="back" onClick={close}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <h2>{d.name} — செய்தி</h2>
        <div className="printarea"><p className="msgtext">{text}</p></div>
        <div className="row">
          <a className="btn" href={`https://wa.me/91${d.phone}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a>
          <a className="btn ghost" href={`sms:+91${d.phone}${sep}body=${encodeURIComponent(text)}`}>SMS</a>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={copy}>நகல்</button>
          <button className="btn ghost" onClick={() => window.print()}>🖨 அச்சிடு</button>
        </div>
        <button className="link" onClick={close}>மூடு</button>
      </div>
    </div>
  )
}
