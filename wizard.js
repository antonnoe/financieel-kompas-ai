/**
 * wizard.js v2 — Section/Phase navigation for Financieel Kompas
 * Slides are addressed as "section-phase" e.g. "2-explain", "2-input", "2-confirm"
 * Loaded BEFORE script.js.
 */
(function () {
  'use strict';

  var currentSection = 1;
  var currentPhase = 'main';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); };
  var fmt = function (n) {
    var r = Math.round(Math.abs(n || 0));
    return '\u20AC\u00A0' + r.toLocaleString('nl-NL');
  };
  var getVal = function (id) { var el = document.getElementById(id); return el ? (Number(el.value) || 0) : 0; };
  var getTxt = function (id) { var el = document.getElementById(id); return el ? el.value : ''; };

  document.addEventListener('DOMContentLoaded', function () {
    var wizard = $('#wizard');
    var overlay = $('#start-overlay');
    var slides = $$('.slide');
    var stepItems = $$('.step-item');

    // --- Start overlay → wizard ---
    var startBtn = $('#start-continue');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        setTimeout(function () {
          overlay.style.display = 'none';
          wizard.style.display = 'flex';
          goTo('1', 'main');
          syncPartnerCols();
        }, 50);
      });
    }

    // --- "Wijzig" → overlay ---
    var changeBtn = $('#change-choice');
    if (changeBtn) {
      changeBtn.addEventListener('click', function () {
        overlay.style.display = 'grid';
        wizard.style.display = 'none';
      });
    }

    // --- Navigation clicks ---
    document.addEventListener('click', function (e) {
      // data-go="3-explain" style buttons
      var goBtn = e.target.closest('[data-go]');
      if (goBtn) {
        var parts = goBtn.dataset.go.split('-');
        var sec = parts[0];
        var phase = parts[1] || 'main';

        // If it's a confirm-step button, trigger calc + build confirm first
        if (goBtn.classList.contains('btn-confirm-step')) {
          triggerCalc();
          setTimeout(function () {
            buildConfirm(sec);
            goTo(sec, phase);
          }, 100);
        } else {
          // If navigating to result, trigger calc
          if (sec === '7') triggerCalc();
          // If navigating to gîte, update status
          if (sec === '5') setTimeout(updateGiteStatus, 50);
          goTo(sec, phase);
        }
        return;
      }

      // Welcome tile clicks
      var tile = e.target.closest('[data-goto-section]');
      if (tile) {
        var sec = tile.dataset.gotoSection;
        goTo(sec, 'explain');
        return;
      }
    });

    // --- Step indicator clicks ---
    stepItems.forEach(function (item) {
      item.addEventListener('click', function () {
        var sec = parseInt(item.dataset.section, 10);
        if (sec <= currentSection + 1) {
          // Jump to explain phase of section (or main for 1 and 7)
          var phase = (sec === 1 || sec === 7) ? 'main' : 'explain';
          goTo(String(sec), phase);
        }
      });
    });

    // --- Partner toggle sync ---
    var coupleBtn = $('#btn-couple');
    var singleBtn = $('#btn-single');
    if (coupleBtn) coupleBtn.addEventListener('click', function () { setTimeout(syncPartnerCols, 50); });
    if (singleBtn) singleBtn.addEventListener('click', function () { setTimeout(syncPartnerCols, 50); });

    // --- Reset button ---
    var resetBtn = $('#reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        setTimeout(function () { goTo('1', 'main'); }, 100);
      });
    }

    // ============================================================
    // NAVIGATION
    // ============================================================
    function goTo(section, phase) {
      section = String(section);
      phase = phase || 'main';
      var secNum = parseInt(section, 10);

      // Find target slide
      var target = null;
      slides.forEach(function (s) {
        if (s.dataset.section === section && s.dataset.phase === phase) target = s;
      });
      if (!target) return;

      // Hide all, show target
      slides.forEach(function (s) { s.classList.remove('active'); });
      target.classList.add('active');
      target.scrollTop = 0;

      // Update step indicator
      stepItems.forEach(function (item) {
        var itemSec = parseInt(item.dataset.section, 10);
        item.classList.remove('active', 'completed');
        if (itemSec === secNum) item.classList.add('active');
        else if (itemSec < secNum) item.classList.add('completed');
      });

      currentSection = secNum;
      currentPhase = phase;
    }

    // ============================================================
    // TRIGGER SCRIPT.JS RECALCULATION
    // ============================================================
    function triggerCalc() {
      var panel = $('#input-panel');
      if (!panel) return;
      var slider = panel.querySelector('input[type="range"]');
      if (slider) slider.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // ============================================================
    // PARTNER COLUMN SYNC
    // ============================================================
    function syncPartnerCols() {
      var isCouple = $('#btn-couple') && $('#btn-couple').classList.contains('active');
      $$('.partner-col-2').forEach(function (el) {
        el.style.display = isCouple ? '' : 'none';
      });
      var hhLabel = $('#chosen-household-label');
      if (hhLabel) hhLabel.textContent = isCouple ? 'Partners' : 'Alleenstaande';
    }

    // ============================================================
    // BUILD CONFIRM CARDS
    // ============================================================
    function buildConfirm(section) {
      var el = $('#confirm-' + section);
      if (!el) return;
      var isCouple = $('#btn-couple') && $('#btn-couple').classList.contains('active');
      var isNL = $('#btn-nl') && $('#btn-nl').classList.contains('active');
      var html = '';

      switch (section) {
        case '2':
          html = buildConfirm2(isCouple, isNL);
          break;
        case '3':
          html = buildConfirm3(isCouple, isNL);
          break;
        case '4':
          html = buildConfirm4(isCouple);
          break;
        case '6':
          html = buildConfirm6(isCouple);
          break;
      }
      el.innerHTML = html;
    }

    function row(label, value) {
      return '<div class="confirm-row"><span class="confirm-label">' + label + '</span><span class="confirm-value">' + value + '</span></div>';
    }
    function sectionTitle(t) {
      return '<div class="confirm-section-title">' + t + '</div>';
    }

    function buildConfirm2(isCouple, isNL) {
      var y1 = getVal('birth-year-1');
      var age1 = new Date().getFullYear() - y1;
      var aow1 = isNL ? getVal('aow-years-1') : getVal('be-work-years-1');
      var fr1 = getVal('fr-work-years-1');
      var h = '<div class="confirm-section">' + sectionTitle('Partner 1');
      h += row('Geboortejaar', y1 + ' (' + age1 + ' jaar)');
      h += row(isNL ? 'AOW-opbouwjaren' : 'Werkjaren België', aow1);
      h += row('Werkjaren Frankrijk', fr1);
      h += '</div>';
      if (isCouple) {
        var y2 = getVal('birth-year-2');
        var age2 = new Date().getFullYear() - y2;
        var aow2 = isNL ? getVal('aow-years-2') : getVal('be-work-years-2');
        var fr2 = getVal('fr-work-years-2');
        h += '<div class="confirm-section">' + sectionTitle('Partner 2');
        h += row('Geboortejaar', y2 + ' (' + age2 + ' jaar)');
        h += row(isNL ? 'AOW-opbouwjaren' : 'Werkjaren België', aow2);
        h += row('Werkjaren Frankrijk', fr2);
        h += '</div>';
      }
      return h;
    }

    function buildConfirm3(isCouple, isNL) {
      var h = '<div class="confirm-section">' + sectionTitle('Partner 1');
      if (!isNL) h += row('Wettelijk pensioen BE', fmt(getVal('slider-be-pension-1')));
      h += row('Overheidspensioen', fmt(getVal('slider-pension-public-1')));
      h += row('Particulier pensioen', fmt(getVal('slider-pension-private-1')));
      h += row('Lijfrente', fmt(getVal('slider-lijfrente-1')));
      h += '</div>';
      if (isCouple) {
        h += '<div class="confirm-section">' + sectionTitle('Partner 2');
        if (!isNL) h += row('Wettelijk pensioen BE', fmt(getVal('slider-be-pension-2')));
        h += row('Overheidspensioen', fmt(getVal('slider-pension-public-2')));
        h += row('Particulier pensioen', fmt(getVal('slider-pension-private-2')));
        h += row('Lijfrente', fmt(getVal('slider-lijfrente-2')));
        h += '</div>';
      }
      return h;
    }

    function buildConfirm4(isCouple) {
      var h = '<div class="confirm-section">' + sectionTitle('Partner 1');
      h += row('Loon', fmt(getVal('slider-salary-1')));
      h += row('Winst onderneming', fmt(getVal('slider-business-1')));
      var t1 = $('#business-type-1');
      if (t1 && getVal('slider-business-1') > 0) {
        h += row('Type', t1.value === 'rental' ? 'Verhuur Gîte/B&B' : 'Dienst / Overig');
      }
      h += '</div>';
      if (isCouple) {
        h += '<div class="confirm-section">' + sectionTitle('Partner 2');
        h += row('Loon', fmt(getVal('slider-salary-2')));
        h += row('Winst onderneming', fmt(getVal('slider-business-2')));
        var t2 = $('#business-type-2');
        if (t2 && getVal('slider-business-2') > 0) {
          h += row('Type', t2.value === 'rental' ? 'Verhuur Gîte/B&B' : 'Dienst / Overig');
        }
        h += '</div>';
      }
      return h;
    }

    function buildConfirm6(isCouple) {
      var h = '';
      h += row('Kinderen ten laste', getVal('slider-children'));
      h += row('Ink. vermogen P1', fmt(getVal('slider-income-wealth-1')));
      if (isCouple) h += row('Ink. vermogen P2', fmt(getVal('slider-income-wealth-2')));
      h += row('Financieel vermogen', fmt(getVal('slider-wealth-financial')));
      h += row('Vastgoed (excl. hoofd)', fmt(getVal('slider-wealth-property')));
      var cak = document.getElementById('cak-contribution');
      if (cak) h += row('CAK-bijdrage', cak.checked ? 'Ja' : 'Nee');
      h += row('Hulp aan huis', fmt(getVal('home-help')) + '/jaar');
      return h;
    }

    // ============================================================
    // GÎTE STATUS
    // ============================================================
    function updateGiteStatus() {
      var el = $('#gite-status');
      if (!el) return;
      var bus1 = getVal('slider-business-1');
      var bus2 = getVal('slider-business-2');
      var t1 = $('#business-type-1');
      var t2 = $('#business-type-2');
      var isCouple = $('#btn-couple') && $('#btn-couple').classList.contains('active');

      if (bus1 === 0 && bus2 === 0) {
        el.innerHTML = 'U heeft geen ondernemingswinst ingevuld — deze stap is niet van toepassing.';
        return;
      }
      var lines = [];
      if (bus1 > 0) {
        var lbl1 = (t1 && t1.value === 'rental') ? 'Verhuur (30% abattement)' : 'Dienst (50% abattement)';
        lines.push('<strong>P1:</strong> ' + fmt(bus1) + ' — ' + lbl1);
      }
      if (isCouple && bus2 > 0) {
        var lbl2 = (t2 && t2.value === 'rental') ? 'Verhuur (30% abattement)' : 'Dienst (50% abattement)';
        lines.push('<strong>P2:</strong> ' + fmt(bus2) + ' — ' + lbl2);
      }
      el.innerHTML = lines.join('<br>');
    }

  });
})();
