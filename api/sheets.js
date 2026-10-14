export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST மட்டும் அனுமதிக்கப்படும்', source: 'vercel' });

  const url = process.env.APPS_SCRIPT_URL;
  if (!url || !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url))
    return res.status(500).json({ error: 'APPS_SCRIPT_URL அமைப்பு தவறு', source: 'vercel' });

  let payload = req.body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); }
    catch { return res.status(400).json({ error: 'தவறான கோரிக்கை', source: 'vercel' }); }
  }
  if (!payload || typeof payload !== 'object' || typeof payload.pin !== 'string' || typeof payload.action !== 'string')
    return res.status(400).json({ error: 'PIN அல்லது செயல் இல்லை', source: 'vercel' });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8500);
  try {
    const up = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),   // payload is an object here, so it is stringified exactly once
      redirect: 'follow',
      signal: ctrl.signal
    });
    const text = await up.text();
    let data;
    try { data = JSON.parse(text); }
    catch {
      console.error('Non-JSON from Apps Script', up.status, text.slice(0, 200));
      return res.status(502).json({
        error: 'Apps Script JSON பதில் தரவில்லை', source: 'apps-script', upstreamStatus: up.status,
        hint: 'Check deployment access = Anyone, URL ends in /exec, and the script is authorized'
      });
    }
    if (data.error) {
      const status = { BAD_PIN: 401, BAD_REQUEST: 400, BUSY: 503 }[data.code] || 500;
      return res.status(status).json({ ...data, source: 'apps-script' });
    }
    return res.status(200).json(data);
  } catch (e) {
    const timeout = e.name === 'AbortError';
    return res.status(timeout ? 504 : 502).json({ error: timeout ? 'Google பதில் தாமதம்' : 'Google-ஐ இணைக்க முடியவில்லை', source: 'vercel' });
  } finally { clearTimeout(timer); }
}
