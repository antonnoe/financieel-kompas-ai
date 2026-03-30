/**
 * cc-embed.js v3 — AI-Toelichter Widget
 * Sticky pill top-right, floats with scroll, panel opens underneath
 */
;(function () {
  'use strict';

  var script = document.currentScript;
  var CFG = {
    toolId: script?.getAttribute('data-tool-id') || 'unknown',
    toolName: script?.getAttribute('data-tool-name') || 'Tool',
    emoji: script?.getAttribute('data-expert-emoji') || '💡',
    label: script?.getAttribute('data-expert-label') || 'AI-Toelichter',
    color: script?.getAttribute('data-color') || '#800000',
    apiUrl: script?.getAttribute('data-api-url') || '/api/chat',
  };

  var C = CFG.color;

  /* ── Fonts ── */
  var fl = document.createElement('link');
  fl.rel = 'stylesheet';
  fl.href = 'https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600&family=Poppins:wght@500;600&display=swap';
  document.head.appendChild(fl);

  /* ── Styles ── */
  var css = document.createElement('style');
  css.textContent = [
    /* Sticky pill — always visible top-right */
    '#cc-fab{position:fixed;top:12px;right:12px;z-index:99998;',
    'display:flex;align-items:center;gap:6px;',
    'padding:8px 16px 8px 12px;border-radius:24px;',
    'background:' + C + ';color:#fff;border:none;cursor:pointer;',
    'font-family:"Mulish",sans-serif;font-size:13px;font-weight:600;',
    'box-shadow:0 2px 12px rgba(128,0,0,0.35);',
    'transition:transform .15s,box-shadow .15s,opacity .15s;',
    'white-space:nowrap}',
    '#cc-fab:hover{transform:scale(1.03);box-shadow:0 4px 20px rgba(128,0,0,0.45)}',
    '#cc-fab.open{opacity:0;pointer-events:none;transform:scale(0.9)}',
    '#cc-fab-icon{font-size:16px;line-height:1}',
    '#cc-fab-label{line-height:1}',

    /* Pulse animation on load */
    '#cc-fab{animation:ccPulse 2s ease-in-out 1s 2}',
    '@keyframes ccPulse{0%,100%{box-shadow:0 2px 12px rgba(128,0,0,0.35)}50%{box-shadow:0 2px 24px rgba(128,0,0,0.6)}}',

    /* Panel — opens from top-right */
    '#cc-panel{position:fixed;top:12px;right:12px;z-index:99999;',
    'width:400px;max-width:calc(100vw - 24px);',
    'height:min(560px, calc(100vh - 24px));',
    'background:#faf9f7;border-radius:16px;',
    'box-shadow:0 8px 40px rgba(0,0,0,0.18);',
    'display:none;flex-direction:column;',
    'font-family:"Mulish",sans-serif;overflow:hidden;',
    'border:1px solid rgba(128,0,0,0.12)}',
    '#cc-panel.open{display:flex}',

    '#cc-head{background:' + C + ';color:#fff;padding:12px 16px;',
    'display:flex;align-items:center;gap:10px;flex-shrink:0}',
    '#cc-head-icon{font-size:18px;width:32px;height:32px;background:rgba(255,255,255,0.15);',
    'border-radius:8px;display:flex;align-items:center;justify-content:center}',
    '#cc-head-text{flex:1}',
    '#cc-head-title{font-family:"Poppins",sans-serif;font-size:13px;font-weight:600;line-height:1.3}',
    '#cc-head-sub{font-size:10px;opacity:0.75;line-height:1.3}',
    '.cc-hb{background:none;border:none;color:#fff;cursor:pointer;padding:4px;opacity:0.7;font-size:16px;line-height:1}',
    '.cc-hb:hover{opacity:1}',

    '#cc-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}',
    '#cc-msgs::-webkit-scrollbar{width:4px}',
    '#cc-msgs::-webkit-scrollbar-thumb{background:rgba(128,0,0,0.2);border-radius:2px}',

    '.cc-m{max-width:88%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.7;word-wrap:break-word;white-space:pre-wrap}',
    '.cc-m.a{background:#fff;color:#2c2c2a;align-self:flex-start;border-bottom-left-radius:4px;',
    'border:1px solid rgba(128,0,0,0.08);box-shadow:0 1px 3px rgba(0,0,0,0.04)}',
    '.cc-m.u{background:' + C + ';color:#fff;align-self:flex-end;border-bottom-right-radius:4px}',
    '.cc-m.s{background:transparent;color:#999;align-self:center;text-align:center;font-size:11px;padding:4px 8px}',

    '.cc-dots{align-self:flex-start;padding:12px 16px;background:#fff;border-radius:12px;border-bottom-left-radius:4px;',
    'display:flex;gap:5px;align-items:center;border:1px solid rgba(128,0,0,0.08)}',
    '.cc-dots i{width:6px;height:6px;background:' + C + ';border-radius:50%;opacity:0.3;animation:ccB 1.2s infinite}',
    '.cc-dots i:nth-child(2){animation-delay:.15s}',
    '.cc-dots i:nth-child(3){animation-delay:.3s}',
    '@keyframes ccB{0%,60%,100%{transform:translateY(0);opacity:.3}30%{transform:translateY(-4px);opacity:1}}',

    '#cc-suggest{padding:0 14px 6px;display:flex;flex-wrap:wrap;gap:5px;flex-shrink:0}',
    '.cc-sg{background:#fff;color:' + C + ';border:1px solid rgba(128,0,0,0.2);',
    'border-radius:16px;padding:4px 10px;font-size:11px;cursor:pointer;',
    'font-family:"Mulish",sans-serif;transition:all .15s}',
    '.cc-sg:hover{background:' + C + ';color:#fff}',

    '#cc-foot{padding:10px 12px;border-top:1px solid #eae5e0;flex-shrink:0;background:#fff;border-radius:0 0 16px 16px}',
    '#cc-input-row{display:flex;gap:8px}',
    '#cc-in{flex:1;border:1px solid #d3d1c7;border-radius:8px;padding:8px 12px;font-size:13px;',
    'font-family:"Mulish",sans-serif;resize:none;outline:none;line-height:1.4;max-height:72px;overflow-y:auto}',
    '#cc-in:focus{border-color:' + C + '}',
    '#cc-in::placeholder{color:#b4b2a9}',
    '#cc-go{background:' + C + ';color:#fff;border:none;border-radius:8px;width:40px;height:40px;',
    'cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;',
    'flex-shrink:0;transition:opacity .15s}',
    '#cc-go:disabled{opacity:0.35;cursor:not-allowed}',
    '#cc-go:hover:not(:disabled){opacity:0.85}',

    '#cc-actions{display:flex;gap:5px;margin-top:7px}',
    '.cc-act{flex:1;padding:6px 0;border:1px solid rgba(128,0,0,0.2);border-radius:6px;',
    'font-size:10px;font-family:"Mulish",sans-serif;font-weight:500;',
    'cursor:pointer;text-align:center;transition:all .15s;background:#fff;color:' + C + '}',
    '.cc-act:hover{background:' + C + ';color:#fff}',
    '.cc-act.ok{background:#28a745;color:#fff;border-color:#28a745}',

    '@media(max-width:440px){',
    '#cc-panel{width:calc(100vw - 16px);right:8px;top:8px;height:calc(100vh - 16px)}',
    '#cc-fab{top:8px;right:8px;padding:6px 12px 6px 10px;font-size:12px}}',

    /* In iframe: tighter positioning */
    '@media(max-height:850px){',
    '#cc-panel{height:calc(100vh - 24px)}}',
  ].join('');
  document.head.appendChild(css);

  var isInIframe = (window.parent !== window);

  /* ── DOM ── */
  var fab = document.createElement('button');
  fab.id = 'cc-fab';
  fab.innerHTML = '<span id="cc-fab-icon">' + CFG.emoji + '</span><span id="cc-fab-label">' + CFG.label + '</span>';
  fab.title = CFG.label;
  if (isInIframe) fab.style.display = 'none';
  document.body.appendChild(fab);

  var panel = document.createElement('div');
  panel.id = 'cc-panel';
  panel.innerHTML = [
    '<div id="cc-head">',
    '<span id="cc-head-icon">' + CFG.emoji + '</span>',
    '<div id="cc-head-text">',
    '<div id="cc-head-title">' + CFG.label + '</div>',
    '<div id="cc-head-sub">' + CFG.toolName + ' \u2014 Infofrankrijk</div>',
    '</div>',
    '<button class="cc-hb" id="cc-min" title="Minimaliseer">\u2014</button>',
    '<button class="cc-hb" id="cc-cls" title="Sluiten">\u2715</button>',
    '</div>',
    '<div id="cc-msgs"></div>',
    '<div id="cc-suggest"></div>',
    '<div id="cc-foot">',
    '<div id="cc-input-row">',
    '<textarea id="cc-in" rows="1" placeholder="Stel een vraag over uw berekening\u2026"></textarea>',
    '<button id="cc-go" disabled title="Verstuur">\u27A4</button>',
    '</div>',
    '<div id="cc-actions">',
    '<button class="cc-act" id="cc-save">\uD83D\uDCC1 Bewaar in Dossier</button>',
    '<button class="cc-act" id="cc-copy">\uD83D\uDCCB Kopieer</button>',
    '<button class="cc-act" id="cc-reset">\uD83D\uDD04 Nieuw</button>',
    '</div>',
    '</div>',
  ].join('');
  document.body.appendChild(panel);

  var $m = panel.querySelector('#cc-msgs');
  var $sg = panel.querySelector('#cc-suggest');
  var $in = panel.querySelector('#cc-in');
  var $go = panel.querySelector('#cc-go');
  var $save = panel.querySelector('#cc-save');
  var $copy = panel.querySelector('#cc-copy');
  var $reset = panel.querySelector('#cc-reset');

  var hist = [];
  var busy = false;

  var SUGGEST = [
    'Leg het verschil uit',
    'Hoe kan ik optimaliseren?',
    'Wat doet de lijfrente?',
    'Welke bronnen zijn gebruikt?',
  ];

  function showSg() {
    $sg.innerHTML = '';
    if (hist.length > 0) return;
    SUGGEST.forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'cc-sg';
      b.textContent = t;
      b.onclick = function () { doSend(t); };
      $sg.appendChild(b);
    });
  }

  function msg(role, text) {
    var d = document.createElement('div');
    d.className = 'cc-m ' + role;
    d.textContent = text;
    $m.appendChild(d);
    $m.scrollTop = $m.scrollHeight;
  }

  function dots(on) {
    var el = document.getElementById('cc-dots');
    if (!on) { if (el) el.remove(); return; }
    if (el) return;
    var d = document.createElement('div');
    d.className = 'cc-dots'; d.id = 'cc-dots';
    d.innerHTML = '<i></i><i></i><i></i>';
    $m.appendChild(d);
    $m.scrollTop = $m.scrollHeight;
  }

  function state() {
    return typeof window.getToolState === 'function' ? window.getToolState() : null;
  }

  function doSend(text) {
    if (busy || !text.trim()) return;
    busy = true; $go.disabled = true; $in.value = ''; $sg.innerHTML = '';
    msg('u', text);
    hist.push({ role: 'user', content: text });
    dots(true);

    fetch(CFG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: hist, toolState: state() }),
    })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      dots(false);
      var reply = d.reply || 'Geen antwoord.';
      msg('a', reply);
      hist.push({ role: 'assistant', content: reply });
    })
    .catch(function () {
      dots(false);
      msg('s', 'Er ging iets mis. Probeer het opnieuw.');
    })
    .finally(function () { busy = false; $go.disabled = !$in.value.trim(); });
  }

  /* ── Export text ── */
  function exportText() {
    var s = state();
    var now = new Date().toLocaleDateString('nl-NL', { year:'numeric', month:'long', day:'numeric' });
    var L = [];
    var sep = '\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550';
    var line = '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500';

    L.push(sep);
    L.push('FINANCIEEL KOMPAS \u2014 VOLLEDIGE ANALYSE + AI-ADVIES');
    L.push('Datum: ' + now);
    L.push(sep);
    L.push('');

    if (s && s.resultaten && s.resultaten.analyse) {
      L.push('DEEL 1: BEREKENING');
      L.push(line);
      L.push(s.resultaten.analyse);
      L.push('');
    }

    if (s && s.resultaten) {
      var r = s.resultaten;
      L.push('SAMENVATTING');
      L.push(line);
      if (r.vergelijkingsland) L.push(r.vergelijkingsland.label + ': Bruto ' + r.vergelijkingsland.bruto + ' | Netto ' + r.vergelijkingsland.netto);
      if (r.frankrijk) L.push('Frankrijk: Bruto ' + r.frankrijk.bruto + ' | Netto ' + r.frankrijk.netto);
      if (r.conclusie) L.push('Verschil: ' + r.conclusie.verschil + ' (' + r.conclusie.toelichting + ')');
      L.push('');
    }

    if (hist.length > 0) {
      L.push('DEEL 2: AI-ADVIES (' + CFG.label + ')');
      L.push(line);
      hist.forEach(function (m) {
        if (m.role === 'user') { L.push(''); L.push('VRAAG: ' + m.content); }
        else if (m.role === 'assistant') { L.push('ADVIES: ' + m.content); }
      });
      L.push('');
    }

    L.push(sep);
    L.push('Indicatieve analyse, geen financieel advies.');
    L.push('Bron: Financieel Kompas \u2014 Infofrankrijk.com');
    return L.join('\n');
  }

  /* ── Save / Copy / Reset ── */
  function flash(btn, txt) {
    var orig = btn.textContent;
    btn.textContent = txt; btn.classList.add('ok');
    setTimeout(function () { btn.textContent = orig; btn.classList.remove('ok'); }, 2000);
  }

  function clip(text) {
    if (navigator.clipboard) { navigator.clipboard.writeText(text); return; }
    var ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
  }

  $save.onclick = function () {
    var txt = exportText();
    var s = state();
    var verschil = s?.resultaten?.conclusie?.verschil || '?';
    var land = s?.resultaten?.vergelijkingsland?.label || 'NL';
    var hh = s?.huishoudtype || '';
    var title = 'Financieel Kompas: ' + hh + ' | ' + land + ' vs FR | ' + verschil;
    if (hist.length > 0) title += ' (incl. AI-advies)';

    var data = { type: 'saveToDossier', title: title, summary: txt, source: 'financieel-kompas-ai' };

    if (window.parent !== window) {
      window.parent.postMessage(data, '*');
      flash($save, 'Opgeslagen!');
    } else {
      clip(txt);
      flash($save, 'Gekopieerd!');
    }
  };

  $copy.onclick = function () { clip(exportText()); flash($copy, 'Gekopieerd!'); };

  $reset.onclick = function () {
    hist = []; $m.innerHTML = ''; $sg.innerHTML = '';
    msg('a', 'Nieuw gesprek. Pas eventueel uw scenario aan en stel een nieuwe vraag.');
    showSg();
  };

  /* ── Open / Close ── */
  fab.onclick = function () {
    panel.classList.add('open'); fab.classList.add('open');
    if (hist.length === 0) {
      msg('a', 'Welkom bij de ' + CFG.label + '. Vul eerst uw scenario in en ik kan het verschil tussen de landen uitleggen, de berekening toelichten en optimalisatietips geven.\n\nWat wilt u weten?');
      showSg();
    }
    setTimeout(function () { $in.focus(); }, 100);
  };

  function close() {
    panel.classList.remove('open');
    fab.classList.remove('open');
  }

  panel.querySelector('#cc-cls').onclick = close;
  panel.querySelector('#cc-min').onclick = close;

  $in.oninput = function () {
    $go.disabled = !$in.value.trim() || busy;
    $in.style.height = 'auto';
    $in.style.height = Math.min($in.scrollHeight, 72) + 'px';
  };
  $in.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend($in.value); } };
  $go.onclick = function () { doSend($in.value); };

  /* ── Public API ── */
  window.ccExpertWidget = { getExportText: exportText, getConversation: function () { return hist.slice(); } };
})();
