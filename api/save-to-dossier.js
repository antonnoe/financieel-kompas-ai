export default async function handler(req, res) {
  // CORS headers for iframe usage
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { title, summary, source, userEmail } = req.body || {};
  if (!title || !summary) {
    return res.status(400).json({ error: 'title and summary required' });
  }

  // Try DossierFrankrijk API (server-side = no CORS issues)
  const dfUrl = 'https://dossierfrankrijk.nl/api/pending';
  
  try {
    const dfResponse = await fetch(dfUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titel: title,
        inhoud: summary,
      }),
    });

    if (dfResponse.ok) {
      const data = await dfResponse.json();
      return res.status(200).json({ success: true, message: 'Opgeslagen in Dossier', data });
    }

    // DF returned an error — log and return
    const errText = await dfResponse.text();
    console.error('DossierFrankrijk API error:', dfResponse.status, errText);
    return res.status(502).json({ 
      success: false, 
      error: 'DossierFrankrijk niet bereikbaar',
      status: dfResponse.status 
    });
  } catch (err) {
    console.error('Proxy error:', err.message);
    return res.status(502).json({ 
      success: false, 
      error: 'Verbindingsfout met DossierFrankrijk' 
    });
  }
}
