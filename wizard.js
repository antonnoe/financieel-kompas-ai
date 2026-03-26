/**
 * wizard.js — Horizontal wizard navigation for Financieel Kompas
 * Loaded BEFORE script.js. Manages slide transitions, step indicator,
 * interim summaries, and bridges the overlay → wizard flow.
 * 
 * Does NOT touch calculation logic — that stays 100% in script.js.
 */
(function () {
  'use strict';

  let currentStep = 1;
  const TOTAL_STEPS = 7;

  // --- DOM refs (resolved after DOMContentLoaded) ---
  let wizard, overlay, slides, stepItems, stepConnectors;

  // --- Utility ---
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const fmt = (n) => {
    const r = Math.round(Math.abs(n || 0));
    return `€ ${r.toLocaleString('nl-NL')}`;
  };

  // ============================================================
  // INIT
  // ============================================================
  document.addEventListener('DOMContentLoaded', function () {
    wizard = $('#wizard');
    overlay = $('#start-overlay');
    slides = $$('.slide');
    stepItems = $$('.step-item');
    stepConnectors = $$('.step-connector');

    // --- Start overlay: intercept "Start berekening" ---
    const startBtn = $('#start-continue');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        // Overlay logic in script.js handles NL/BE + single/couple via hidden buttons.
        // We just need to show wizard + hide overlay AFTER script.js has processed.
        setTimeout(function () {
          overlay.style.display = 'none';
          wizard.style.display = 'flex';
          goToStep(1);
          updatePartnerColumns();
        }, 50);
      });
    }

    // --- "Wijzig" button → back to overlay ---
    const changeBtn = $('#change-choice');
    if (changeBtn) {
      changeBtn.addEventListener('click', function () {
        overlay.style.display = 'grid';
        wizard.style.display = 'none';
      });
    }

    // --- Navigation buttons ---
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-next]');
      if (btn) {
        const next = parseInt(btn.dataset.next, 10);
        // If it's a "confirm" button, trigger updateScenario first
        if (btn.classList.contains('btn-confirm')) {
          triggerUpdate();
          // Small delay to let script.js recalculate
          setTimeout(function () {
            updateStepSummary(currentStep);
            goToStep(next);
          }, 80);
        } else {
          goToStep(next);
        }
        return;
      }

      const prevBtn = e.target.closest('[data-prev]');
      if (prevBtn) {
        goToStep(parseInt(prevBtn.dataset.prev, 10));
        return;
      }

      // Welcome tiles → jump to step
      const tile = e.target.closest('.tile[data-goto]');
      if (tile) {
        goToStep(parseInt(tile.dataset.goto, 10));
        return;
      }
    });

    // --- Step indicator click ---
    stepItems.forEach(function (item) {
      item.addEventListener('click', function () {
        const step = parseInt(item.dataset.step, 10);
        // Only allow jumping to visited steps or 1 ahead
        if (step <= currentStep + 1) {
          if (step > currentStep) triggerUpdate();
          goToStep(step);
        }
      });
    });

    // --- Watch for partner toggle changes (from script.js) ---
    const coupleBtn = $('#btn-couple');
    const singleBtn = $('#btn-single');
    if (coupleBtn) coupleBtn.addEventListener('click', function () { setTimeout(updatePartnerColumns, 50); });
    if (singleBtn) singleBtn.addEventListener('click', function () { setTimeout(updatePartnerColumns, 50); });

    // --- Gîte slide: sync with business-type selects ---
    setupGiteMirror();

    // --- Listen for input changes to keep summaries fresh ---
    const inputPanel = $('#input-panel');
    if (inputPanel) {
      inputPanel.addEventListener('input', function () {
        // Debounced summary update
        clearTimeout(inputPanel._debounce);
        inputPanel._debounce = setTimeout(function () {
          updateGiteStatus();
        }, 200);
      });
    }

    // --- Reset button → back to step 1 ---
    const resetBtn = $('#reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        // script.js handles the actual reset. We go back to step 1.
        setTimeout(function () {
          clearAllSummaries();
          goToStep(1);
        }, 100);
      });
    }
  });

  // ============================================================
  // NAVIGATION
  // ============================================================
  function goToStep(step) {
    step = Math.max(1, Math.min(TOTAL_STEPS, step));

    // Hide all slides
    slides.forEach(function (s) { s.classList.remove('active'); });

    // Show target slide
    const target = slides.find(function (s) { return parseInt(s.dataset.step, 10) === step; });
    if (target) {
      target.classList.add('active');
      target.scrollTop = 0;
    }

    // Update step indicator
    stepItems.forEach(function (item) {
      const s = parseInt(item.dataset.step, 10);
      item.classList.remove('active');
      item.classList.remove('completed');
      if (s === step) {
        item.classList.add('active');
      } else if (s < step) {
        item.classList.add('completed');
      }
    });

    currentStep = step;

    // If going to result slide, ensure final calc
    if (step === 7) {
      triggerUpdate();
      setTimeout(function () { updateGiteStatus(); }, 100);
    }

    // If going to gîte slide, update status
    if (step === 5) {
      updateGiteStatus();
    }
  }

  // ============================================================
  // TRIGGER SCRIPT.JS RECALCULATION
  // ============================================================
  function triggerUpdate() {
    // script.js listens on #input-panel for 'input' events.
    // Fire a synthetic one to trigger updateScenario().
    var panel = $('#input-panel');
    if (panel) {
      var ev = new Event('input', { bubbles: true });
      // Find any slider to dispatch from
      var slider = panel.querySelector('input[type="range"]');
      if (slider) {
        slider.dispatchEvent(ev);
      }
    }
  }

  // ============================================================
  // PARTNER COLUMN VISIBILITY
  // ============================================================
  function updatePartnerColumns() {
    var isCouple = $('#btn-couple') && $('#btn-couple').classList.contains('active');
    // partner2-section is handled by script.js for slide 2
    // But we also need to show/hide partner columns in other slides
    $$('.partner-col-2').forEach(function (el) {
      el.style.display = isCouple ? '' : 'none';
    });
    // Update chosen-info bar
    var hhLabel = $('#chosen-household-label');
    if (hhLabel) {
      hhLabel.textContent = isCouple ? 'Partners' : 'Alleenstaande';
    }
  }

  // ============================================================
  // STEP SUMMARIES (interim results shown after "Bevestig")
  // ============================================================
  function updateStepSummary(step) {
    var el = $('#summary-' + step);
    if (!el) return;

    var html = '';

    switch (step) {
      case 2:
        html = buildSituationSummary();
        break;
      case 3:
        html = buildPensionSummary();
        break;
      case 4:
        html = buildIncomeSummary();
        break;
      case 6:
        html = buildWealthSummary();
        break;
    }

    if (html) {
      el.innerHTML = html;
      el.classList.add('visible');
    }
  }

  function clearAllSummaries() {
    $$('.step-summary').forEach(function (s) {
      s.innerHTML = '';
      s.classList.remove('visible');
    });
  }

  function buildSituationSummary() {
    var y1 = getVal('birth-year-1');
    var m1 = getVal('birth-month-1');
    if (!y1) return '';
    var age1 = new Date().getFullYear() - y1;
    var isNL = $('#btn-nl') && $('#btn-nl').classList.contains('active');
    var aow1 = isNL ? getVal('aow-years-1') : getVal('be-work-years-1');
    var fr1 = getVal('fr-work-years-1');
    var lines = ['<strong>P1:</strong> Geb. ' + y1 + ' (' + age1 + ' jaar), ' + (isNL ? 'AOW-opbouw' : 'Werkjaren BE') + ': ' + aow1 + ' jaar, FR: ' + fr1 + ' jaar'];

    var isCouple = $('#btn-couple') && $('#btn-couple').classList.contains('active');
    if (isCouple) {
      var y2 = getVal('birth-year-2');
      var age2 = y2 ? (new Date().getFullYear() - y2) : '?';
      var aow2 = isNL ? getVal('aow-years-2') : getVal('be-work-years-2');
      var fr2 = getVal('fr-work-years-2');
      lines.push('<strong>P2:</strong> Geb. ' + (y2 || '?') + ' (' + age2 + ' jaar), ' + (isNL ? 'AOW-opbouw' : 'Werkjaren BE') + ': ' + (aow2 || 0) + ' jaar, FR: ' + (fr2 || 0) + ' jaar');
    }
    return lines.join('<br>');
  }

  function buildPensionSummary() {
    var pub1 = getVal('slider-pension-public-1');
    var priv1 = getVal('slider-pension-private-1');
    var lij1 = getVal('slider-lijfrente-1');
    var total1 = pub1 + priv1 + lij1;

    var isBE = $('#btn-be') && $('#btn-be').classList.contains('active');
    if (isBE) {
      total1 += getVal('slider-be-pension-1');
    }

    var lines = ['<strong>P1 pensioen totaal:</strong> ' + fmt(total1)];

    var isCouple = $('#btn-couple') && $('#btn-couple').classList.contains('active');
    if (isCouple) {
      var pub2 = getVal('slider-pension-public-2');
      var priv2 = getVal('slider-pension-private-2');
      var lij2 = getVal('slider-lijfrente-2');
      var total2 = pub2 + priv2 + lij2;
      if (isBE) total2 += getVal('slider-be-pension-2');
      lines.push('<strong>P2 pensioen totaal:</strong> ' + fmt(total2));
    }
    return lines.join('<br>');
  }

  function buildIncomeSummary() {
    var sal1 = getVal('slider-salary-1');
    var bus1 = getVal('slider-business-1');
    var lines = ['<strong>P1:</strong> Loon ' + fmt(sal1) + ', Winst ' + fmt(bus1)];

    var isCouple = $('#btn-couple') && $('#btn-couple').classList.contains('active');
    if (isCouple) {
      var sal2 = getVal('slider-salary-2');
      var bus2 = getVal('slider-business-2');
      lines.push('<strong>P2:</strong> Loon ' + fmt(sal2) + ', Winst ' + fmt(bus2));
    }
    return lines.join('<br>');
  }

  function buildWealthSummary() {
    var kids = getVal('slider-children');
    var fin = getVal('slider-wealth-financial');
    var prop = getVal('slider-wealth-property');
    var iv1 = getVal('slider-income-wealth-1');
    var lines = [
      '<strong>Kinderen:</strong> ' + kids + ' · <strong>Vermogensinkomen P1:</strong> ' + fmt(iv1),
      '<strong>Financieel:</strong> ' + fmt(fin) + ' · <strong>Vastgoed:</strong> ' + fmt(prop)
    ];
    return lines.join('<br>');
  }

  // ============================================================
  // GÎTE STATUS
  // ============================================================
  function updateGiteStatus() {
    var el = $('#gite-status');
    if (!el) return;
    var bus1 = getVal('slider-business-1');
    var bus2 = getVal('slider-business-2');
    var type1El = $('#business-type-1');
    var type2El = $('#business-type-2');
    var type1 = type1El ? type1El.value : 'services';
    var type2 = type2El ? type2El.value : 'services';
    var isCouple = $('#btn-couple') && $('#btn-couple').classList.contains('active');

    if (bus1 === 0 && bus2 === 0) {
      el.innerHTML = '<p style="color:var(--text-light);">U heeft geen ondernemingswinst ingevuld. Deze stap is niet van toepassing op uw situatie.</p>';
      return;
    }

    var lines = [];
    if (bus1 > 0) {
      var typeLabel1 = type1 === 'rental' ? 'Verhuur Gîte/B&B (abattement 30%)' : 'Dienst/Overig (abattement 50%)';
      lines.push('<strong>P1:</strong> Winst ' + fmt(bus1) + ' — ' + typeLabel1);
    }
    if (isCouple && bus2 > 0) {
      var typeLabel2 = type2 === 'rental' ? 'Verhuur Gîte/B&B (abattement 30%)' : 'Dienst/Overig (abattement 50%)';
      lines.push('<strong>P2:</strong> Winst ' + fmt(bus2) + ' — ' + typeLabel2);
    }
    el.innerHTML = lines.join('<br>');
  }

  function setupGiteMirror() {
    // If user changes type on gîte slide mirrors, sync back to main selects
    var mirror1 = $('#gite-type-mirror-1');
    var mirror2 = $('#gite-type-mirror-2');
    var orig1 = $('#business-type-1');
    var orig2 = $('#business-type-2');

    if (mirror1 && orig1) {
      mirror1.addEventListener('change', function () {
        orig1.value = mirror1.value;
        triggerUpdate();
      });
    }
    if (mirror2 && orig2) {
      mirror2.addEventListener('change', function () {
        orig2.value = mirror2.value;
        triggerUpdate();
      });
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function getVal(id) {
    var el = document.getElementById(id);
    return el ? (Number(el.value) || 0) : 0;
  }

})();
