document.addEventListener('DOMContentLoaded', () => {
    // === STARTPAGINA OVERLAY ===
    const overlay = document.getElementById('start-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            const choice = e.target.closest('.start-choice');
            if (choice) {
                const group = choice.closest('.start-group');
                group.querySelectorAll('.start-choice').forEach(b => b.classList.remove('active'));
                choice.classList.add('active');
                const sel = choice.getAttribute('data-click-target');
                const target = document.querySelector(sel);
                if (target) target.click();
            }
            if (e.target && e.target.id === 'start-continue') {
                overlay.style.display = 'none';
                updateChosenInfo();
                document.getElementById('input-panel')?.scrollIntoView({behavior:'smooth', block:'start'});
            }
        });
    }
    // "Wijzig" knop: terug naar overlay
    document.getElementById('change-choice')?.addEventListener('click', () => {
        if (overlay) overlay.style.display = 'grid';
    });
    // Update de compacte keuze-balk
    function updateChosenInfo() {
        const countryLabel = document.getElementById('chosen-country-label');
        const countryFlag = document.getElementById('chosen-country-flag');
        const hhLabel = document.getElementById('chosen-household-label');
        const isNL = document.getElementById('btn-nl')?.classList.contains('active');
        const isSingle = document.getElementById('btn-single')?.classList.contains('active');
        if (countryLabel) countryLabel.textContent = isNL ? 'Nederland' : 'België';
        if (countryFlag) countryFlag.textContent = isNL ? '🇳🇱' : '🇧🇪';
        if (hhLabel) hhLabel.textContent = isSingle ? 'Alleenstaande' : 'Partners';
    }

    // --- Globale variabelen ---
    let PARAMS; let isCouple = false; let initialLoad = true; let activeComparison = 'NL'; const MAX_WORK_YEARS = 50;
    let comparisonChoice, compareCountryResult, compareCountryLabel, compareCountryFlag;
    let householdType, partner2Section, inputs, outputs, valueOutputs;
    let pensionLabels;

    const getEl = (id) => document.getElementById(id);

    // --- Hulpfuncties ---
    function displayError(message) { console.error(message); const el=getEl('calculation-breakdown'); if(el) el.textContent=message; else document.body.innerHTML=`<p style="color:red;padding:20px;">${message}</p>`; }
    function checkSelectors() { if(!comparisonChoice||!householdType||!inputs||!outputs||!valueOutputs||!outputs.breakdown||!inputs.p1?.birthYear||!inputs.children||!outputs.compareBruto||!valueOutputs.p1?.aowYears||!inputs.simYear){ console.error("UI elements missing."); return false; } return true; }

    function getSimulationInfo(vals) {
        const simYear = inputs.simYear ? parseInt(inputs.simYear.value, 10) : null;
        const simMonth = inputs.simMonth ? parseInt(inputs.simMonth.value, 10) : null;
        let simulatieDatum = new Date();
        let scenarioIsPastOrPresent = true;

        if (simYear && simMonth && simYear > 1900 && simMonth > 0) { // Check voor geldige invoer
            simulatieDatum = new Date(simYear, simMonth - 1, 15);
            scenarioIsPastOrPresent = simulatieDatum <= new Date();
        }

        const calcAge = (p) => {
             // BUGFIX: Gebruik P1/P2 birthYear/Month, niet de algemene 'vals'
             if (!p?.birthYear || !p?.birthMonth) return null; 
             let ageYears = simulatieDatum.getFullYear() - p.birthYear;
             let ageMonths = simulatieDatum.getMonth() - (p.birthMonth - 1);
             // Correcte leeftijdsberekening
             if (ageMonths < 0 || (ageMonths === 0 && simulatieDatum.getDate() < 1)) { // Dag 1 ipv 15
                 ageYears--;
             }
             return ageYears;
         };
         
        // Zorg ervoor dat vals.p1 bestaat, ook al is het leeg (gebeurt in updateScenario)
        const simulatieLeeftijdP1 = calcAge(vals.p1);
        const simulatieLeeftijdP2 = vals.p2 ? calcAge(vals.p2) : null;

        return { simulatieDatum, simulatieLeeftijdP1, simulatieLeeftijdP2, scenarioIsPastOrPresent };
    }


    // --- Initialisatie ---
    async function initializeApp() {
        console.log("Initializing...");
        try { // 1. Load Config
            const response = await fetch('./config.json'); if (!response.ok) throw new Error(`Config load failed: ${response.status}`);
            PARAMS = await response.json(); console.log("Config loaded.");
            const fixInf = (arr) => arr?.forEach(item => { if (item.grens === "Infinity") item.grens = Infinity; });
            fixInf(PARAMS?.FR?.INKOMSTENBELASTING?.SCHIJVEN); fixInf(PARAMS?.FR?.IFI?.SCHIJVEN); fixInf(PARAMS?.BE?.INKOMSTENBELASTING?.SCHIJVEN_2025); fixInf(PARAMS?.BE?.SOCIALE_LASTEN?.BIJZONDERE_BIJDRAGE_SCHIJVEN_GEZIN_2024);
            // Lijfrente fracties en tarief (FR)
            PARAMS.FR.INKOMSTENBELASTING.LIJFRENTE_FRACTIES = [ { age: 50, fraction: 0.7 }, { age: 60, fraction: 0.5 }, { age: 70, fraction: 0.4 }, { age: Infinity, fraction: 0.3 } ];
            PARAMS.FR.SOCIALE_LASTEN.LIJFRENTE_TARIEF = 0.091; // Aanname
            window._fkParams = PARAMS; // Beschikbaar voor AI-assistent
        } catch (error) { displayError(`Fout laden config: ${error.message}.`); return; }

        // 2. Select DOM Elements
        console.log("Selecting elements...");
        comparisonChoice={nl:getEl('btn-nl'),be:getEl('btn-be')}; compareCountryResult=getEl('compare-country-result'); compareCountryLabel=getEl('compare-country-label'); compareCountryFlag=getEl('compare-country-flag');
        householdType={single:getEl('btn-single'),couple:getEl('btn-couple')}; partner2Section=getEl('partner2-section');
        inputs = {
            simYear: getEl('sim-year'), simMonth: getEl('sim-month'),
            stopSalaryAfterAOW: getEl('stop-salary-after-aow'),
            children: getEl('slider-children'), cak: getEl('cak-contribution'), homeHelp: getEl('home-help'), wealthFinancial: getEl('slider-wealth-financial'), wealthProperty: getEl('slider-wealth-property'),
            p1: { birthYear: getEl('birth-year-1'), birthMonth: getEl('birth-month-1'), aowYears: getEl('aow-years-1'), beWorkYears: getEl('be-work-years-1'), frWorkYears: getEl('fr-work-years-1'), bePension: getEl('slider-be-pension-1'), pensionPublic: getEl('slider-pension-public-1'), pensionPrivate: getEl('slider-pension-private-1'), lijfrente: getEl('slider-lijfrente-1'), lijfrenteDuration: getEl('lijfrente-duration-1'), lijfrenteStartAge: getEl('lijfrente-start-1'), incomeWealth: getEl('slider-income-wealth-1'), salary: getEl('slider-salary-1'), business: getEl('slider-business-1'), businessType: getEl('business-type-1') },
            p2: { birthYear: getEl('birth-year-2'), birthMonth: getEl('birth-month-2'), aowYears: getEl('aow-years-2'), beWorkYears: getEl('be-work-years-2'), frWorkYears: getEl('fr-work-years-2'), bePension: getEl('slider-be-pension-2'), pensionPublic: getEl('slider-pension-public-2'), pensionPrivate: getEl('slider-pension-private-2'), lijfrente: getEl('slider-lijfrente-2'), lijfrenteDuration: getEl('lijfrente-duration-2'), lijfrenteStartAge: getEl('lijfrente-start-2'), incomeWealth: getEl('slider-income-wealth-2'), salary: getEl('slider-salary-2'), business: getEl('slider-business-2'), businessType: getEl('business-type-2') },};
        outputs = { compareBruto: getEl('compare-bruto'), compareTax: getEl('compare-tax'), compareNetto: getEl('compare-netto'), wealthTaxCompare: getEl('wealth-tax-compare'), frBruto: getEl('fr-bruto'), frTax: getEl('fr-tax'), frNetto: getEl('fr-netto'), wealthTaxFr: getEl('wealth-tax-fr'), wealthTaxFrExpl: getEl('wealth-tax-fr-expl'), conclusionBar: getEl('conclusion-bar'), conclusionValue: getEl('conclusion-value'), conclusionExpl: getEl('conclusion-expl'), estateTotalDisplay: getEl('estate-total-display'), breakdown: getEl('calculation-breakdown'),};
        valueOutputs = { p1: { aowYears: getEl('value-aow-years-1'), beWorkYears: getEl('value-be-work-years-1'), frWorkYears: getEl('value-fr-work-years-1'), bePension: getEl('value-be-pension-1'), pensionPublic: getEl('value-pension-public-1'), pensionPrivate: getEl('value-pension-private-1'), lijfrente: getEl('value-lijfrente-1'), incomeWealth: getEl('value-income-wealth-1'), salary: getEl('value-salary-1'), business: getEl('value-business-1') }, p2: { aowYears: getEl('value-aow-years-2'), beWorkYears: getEl('value-be-work-years-2'), frWorkYears: getEl('value-fr-work-years-2'), bePension: getEl('value-be-pension-2'), pensionPublic: getEl('value-pension-public-2'), pensionPrivate: getEl('value-pension-private-2'), lijfrente: getEl('value-lijfrente-2'), incomeWealth: getEl('value-income-wealth-2'), salary: getEl('value-salary-2'), business: getEl('value-business-2') }, children: getEl('value-children'), wealthFinancial: getEl('value-wealth-financial'), wealthProperty: getEl('value-wealth-property'),};
        pensionLabels = document.querySelectorAll('.country-origin');

        // 3. Check Selectors
        if (!checkSelectors()) { displayError("Init mislukt: Kon UI-elementen niet vinden."); return; }
        console.log("DOM elements selected.");

        // 4. Setup
        populateDateDropdowns(); populateSimDateDropdowns();
        setupListeners();
        updateHouseholdType(false); updateComparisonCountry('NL');
        console.log("Application initialized.");
        
        // Auto-focus first field in Module 1
        const firstField = getEl('birth-year-1');
        if (firstField) {
            setTimeout(() => firstField.focus(), 100);
        }
    }

    // --- Core Functions ---
    const formatCurrency = (amount, withSign = false) => { const s=amount>0?'+':amount<0?'−':''; const r=Math.round(Math.abs(amount||0)); return `${withSign?s+' ':''}€ ${r.toLocaleString('nl-NL')}`; };
    function populateDateDropdowns() { if(!inputs?.p1?.birthYear||!inputs?.p2?.birthYear)return; const cY=new Date().getFullYear();const M=["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"]; [inputs.p1,inputs.p2].forEach(p=>{if(!p||!p.birthYear||!p.birthMonth)return; const yS=p.birthYear,mS=p.birthMonth;if(yS.options.length>0)return; yS.innerHTML='';mS.innerHTML=''; for(let y=cY-18;y>=1940;y--){const o=new Option(y,y);if(y===1960)o.selected=true; yS.add(o);} M.forEach((m,i)=>mS.add(new Option(m,i+1)));}); }
    function populateSimDateDropdowns() { if (!inputs.simYear || !inputs.simMonth) return; const cY=new Date().getFullYear(); const sY=inputs.simYear,sM=inputs.simMonth; sY.innerHTML='<option value="">-- Huidig Jaar --</option>'; sM.innerHTML='<option value="">-- Huidige Maand --</option>'; for (let y=cY+20;y>=cY-10;y--){sY.add(new Option(y,y));} const M=["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"]; M.forEach((m,i)=>sM.add(new Option(m,i+1))); }
    function getAOWDateInfo(birthYear) { const yr=Number(birthYear); if(!yr||yr<1940)return{years:67,months:0}; if(yr<=1957)return{years:66,months:4}; if(yr===1958)return{years:66,months:7}; if(yr===1959)return{years:66,months:10}; return{years:67,months:0}; }
    function setupListeners() { if(!comparisonChoice||!householdType)return; if(comparisonChoice.nl)comparisonChoice.nl.addEventListener('click',()=>updateComparisonCountry('NL')); if(comparisonChoice.be)comparisonChoice.be.addEventListener('click',()=>updateComparisonCountry('BE')); if(householdType.single)householdType.single.addEventListener('click',()=>updateHouseholdType(false)); if(householdType.couple)householdType.couple.addEventListener('click',()=>updateHouseholdType(true)); const rb=getEl('reset-btn'); if(rb){rb.addEventListener('click',()=>{if(!inputs?.p1?.birthYear)return; document.querySelectorAll('input[type=range]').forEach(i=>{if(i)i.value=0;}); document.querySelectorAll('input[type=checkbox]').forEach(i=>{if(i)i.checked=false;}); document.querySelectorAll('select:not([id*="birth"])').forEach(s=>{if(s)s.selectedIndex=0;}); if(inputs.p1.birthYear)inputs.p1.birthYear.value=1960; if(inputs.p1.birthMonth)inputs.p1.birthMonth.value=1; if(inputs.p2.birthYear)inputs.p2.birthYear.value=1960; if(inputs.p2.birthMonth)inputs.p2.birthMonth.value=1; if(inputs.simYear)inputs.simYear.value=""; if(inputs.simMonth)inputs.simMonth.value=""; initialLoad=true; updateHouseholdType(false);updateComparisonCountry('NL');});} const cb=getEl('copy-btn'); if(cb){cb.addEventListener('click',()=>{const txt=outputs?.breakdown?.textContent||''; if(txt&&!txt.includes("Welkom")){navigator.clipboard.writeText(txt).then(()=>{cb.textContent='Gekopieerd!';setTimeout(()=>{cb.textContent='📋 Kopieer Analyse';},2000);}).catch(err=>{console.error('Kopieerfout:',err);alert('Kopiëren mislukt.');});}else{alert("Genereer analyse.");}}); } const ic=getEl('input-panel'); if(ic){ic.addEventListener('input',(e)=>{if(e.target.matches('input, select')){if(e.target.id.includes('aow-years')||e.target.id.includes('fr-work-years')||e.target.id.includes('be-work-years')){adjustWorkYears(e.target.id);}updateScenario();}});}else{console.error("#input-panel missing!");} }
    function toggleCountrySpecificFields(countryCode) {
        document.querySelectorAll('.nl-specific').forEach(el=>el.style.display=(countryCode==='NL'?'block':'none'));
        document.querySelectorAll('.be-specific').forEach(el=>el.style.display=(countryCode==='BE'?'block':'none'));
        document.querySelectorAll('.hide-for-be').forEach(el=>el.style.display=(countryCode==='BE'?'none':'block'));
        const countryName = countryCode === 'NL' ? 'NL' : 'BE';
        pensionLabels.forEach(label => { if(label) label.textContent = `uit ${countryName}`; });
    }
    function updateComparisonCountry(countryCode) {
         if (!comparisonChoice?.nl || !comparisonChoice?.be || !compareCountryLabel || !compareCountryFlag || !compareCountryResult) return;
        activeComparison = countryCode; comparisonChoice.nl.classList.toggle('active', activeComparison === 'NL'); comparisonChoice.be.classList.toggle('active', activeComparison === 'BE');
        if (activeComparison === 'NL') { compareCountryLabel.textContent = "Nederland"; compareCountryFlag.textContent = "🇳🇱"; compareCountryResult.style.borderColor = "var(--primary-color)";}
        else if (activeComparison === 'BE') { compareCountryLabel.textContent = "België"; compareCountryFlag.textContent = "🇧🇪"; compareCountryResult.style.borderColor = "#FDDA25"; }
        toggleCountrySpecificFields(activeComparison);
        updateChosenInfo();
        updateScenario();
    }
    function updateHouseholdType(setToCouple) {
         if (!householdType?.single || !householdType?.couple || !partner2Section || !inputs?.p2) return;
        isCouple = setToCouple; householdType.single.classList.toggle('active',!isCouple); householdType.couple.classList.toggle('active',isCouple);
        partner2Section.style.display = isCouple ? 'flex' : 'none';
        if (!isCouple) { Object.keys(inputs.p2).forEach(key=>{ const el=inputs.p2[key]; if(el&&(el.matches('input[type=range]')||el.matches('input[type=checkbox]')||el.matches('select:not([id*="birth"])'))){ if(el.type==='range')el.value=0; if(el.type==='checkbox')el.checked=false; if(el.tagName==='SELECT')el.selectedIndex=0;}}); }
        updateChosenInfo();
        updateScenario();
    }
    function getPartnerInput(partnerId) {
        if (!inputs || !inputs[partnerId] || !inputs[partnerId].birthYear){ console.error(`P data missing ${partnerId}`); return null; }
        const p = inputs[partnerId]; const getN = (el) => el ? Number(el.value) : 0; const getS = (el, d) => el ? el.value : d;
        const lijfrenteStart = p.lijfrenteStartAge ? p.lijfrenteStartAge.value : 'aow';
        return { birthYear:getN(p.birthYear), birthMonth:getN(p.birthMonth), aowYears:getN(p.aowYears), beWorkYears:getN(p.beWorkYears), frWorkYears:getN(p.frWorkYears), bePension:getN(p.bePension), pensionPublic:getN(p.pensionPublic), pensionPrivate:getN(p.pensionPrivate), lijfrente:getN(p.lijfrente), lijfrenteDuration:getN(p.lijfrenteDuration), lijfrenteStartAge: lijfrenteStart, incomeWealth:getN(p.incomeWealth), salary:getN(p.salary), business:getN(p.business), businessType:getS(p.businessType,'services') };
    }
    function adjustWorkYears(changedId) { if(!inputs?.p1||!inputs?.p2)return; const pI=changedId.includes('-1')?inputs.p1:inputs.p2; if(!pI)return; let cS,fS; if(activeComparison==='NL'){cS=pI.aowYears;fS=pI.frWorkYears;}else{cS=pI.beWorkYears;fS=pI.frWorkYears;} if(!cS||!fS)return; let cV=Number(cS.value);let fV=Number(fS.value); if(cV+fV>MAX_WORK_YEARS){if(changedId===cS.id){fV=MAX_WORK_YEARS-cV;fS.value=fV;}else{cV=MAX_WORK_YEARS-fV;cS.value=cV;}} updateValueOutputsForYears(); }
    function updateValueOutputsForYears() { if(!valueOutputs?.p1||!valueOutputs?.p2||!inputs?.p1||!inputs?.p2)return; const uV=(oE,iE,iC=true,iY=false)=>{if(oE&&iE){const v=iE.value||'0';oE.textContent=iY?v:(iC?formatCurrency(Number(v)):v);}else if(oE){oE.textContent=iY?'0':formatCurrency(0);}}; uV(valueOutputs.p1.aowYears,inputs.p1.aowYears,false,true); uV(valueOutputs.p1.beWorkYears,inputs.p1.beWorkYears,false,true); uV(valueOutputs.p1.frWorkYears,inputs.p1.frWorkYears,false,true); uV(valueOutputs.p1.bePension,inputs.p1.bePension); uV(valueOutputs.p1.pensionPublic,inputs.p1.pensionPublic); uV(valueOutputs.p1.pensionPrivate,inputs.p1.pensionPrivate); uV(valueOutputs.p1.lijfrente,inputs.p1.lijfrente); uV(valueOutputs.p1.incomeWealth,inputs.p1.incomeWealth); uV(valueOutputs.p1.salary,inputs.p1.salary); uV(valueOutputs.p1.business,inputs.p1.business); if(isCouple){ uV(valueOutputs.p2.aowYears,inputs.p2.aowYears,false,true); uV(valueOutputs.p2.beWorkYears,inputs.p2.beWorkYears,false,true); uV(valueOutputs.p2.frWorkYears,inputs.p2.frWorkYears,false,true); uV(valueOutputs.p2.bePension,inputs.p2.bePension); uV(valueOutputs.p2.pensionPublic,inputs.p2.pensionPublic); uV(valueOutputs.p2.pensionPrivate,inputs.p2.pensionPrivate); uV(valueOutputs.p2.lijfrente,inputs.p2.lijfrente); uV(valueOutputs.p2.incomeWealth,inputs.p2.incomeWealth); uV(valueOutputs.p2.salary,inputs.p2.salary); uV(valueOutputs.p2.business,inputs.p2.business); } }
    function updateScenario() {
        if (!PARAMS || !inputs || !outputs || !valueOutputs || !checkSelectors()) { console.warn("UpdateScenario called too early."); if(outputs?.breakdown) outputs.breakdown.textContent="Laden..."; return; }
        try {
            const p1Input = getPartnerInput('p1'); if (!p1Input) throw new Error("P1 data invalid.");
            const p2Input = isCouple ? getPartnerInput('p2') : null; if (isCouple && !p2Input) throw new Error("P2 data invalid.");
            const inputValues = { isCouple, stopSalaryAfterAOW: !!inputs.stopSalaryAfterAOW?.checked, children: Number(inputs.children?.value||0), cak: !!inputs.cak?.checked, homeHelp: Number(inputs.homeHelp?.value||0), wealthFinancial: Number(inputs.wealthFinancial?.value||0), wealthProperty: Number(inputs.wealthProperty?.value||0), p1: p1Input, p2: p2Input };
            inputValues.estate = inputValues.wealthFinancial + inputValues.wealthProperty;

            [ { p: p1Input, elData: inputs.p1 }, { p: p2Input, elData: inputs.p2 } ].forEach(item => { const yS=activeComparison==='NL'?item.elData?.aowYears:item.elData?.beWorkYears; if(item.p&&yS){const m=50; yS.max=m; const c=Number(yS.value||0); const yP=activeComparison==='NL'?'aowYears':'beWorkYears'; item.p[yP]=Math.min(c,m); if(c>m)yS.value=m; const tt=yS.closest('.form-group')?.querySelector('.tooltip'); if(tt)tt.dataset.text=`Jaren ${activeComparison}(max ${m}). EU(${activeComparison}+FR) max 50.`;} if(item.p&&item.elData?.frWorkYears){const m=50; item.elData.frWorkYears.max=m; const c=Number(item.elData.frWorkYears.value||0); item.p.frWorkYears=Math.min(c,m); if(c>m)item.elData.frWorkYears.value=m; const tt=item.elData.frWorkYears.closest('.form-group')?.querySelector('.tooltip'); if(tt)tt.dataset.text=`Jaren FR(max ${m}). EU(${activeComparison}+FR) max 50.`;}});
            updateValueOutputsForYears();
            if(valueOutputs.children) valueOutputs.children.textContent=inputValues.children; if(valueOutputs.wealthFinancial) valueOutputs.wealthFinancial.textContent=formatCurrency(inputValues.wealthFinancial); if(valueOutputs.wealthProperty) valueOutputs.wealthProperty.textContent=formatCurrency(inputValues.wealthProperty); if(outputs.estateTotalDisplay) outputs.estateTotalDisplay.textContent=formatCurrency(inputValues.estate);

            let compareResults = { bruto: 0, tax: 0, netto: 0, wealthTax: 0, breakdown: {} };
            if (activeComparison === 'NL') { compareResults = calculateNetherlands(inputValues); }
            else if (activeComparison === 'BE') { compareResults = calculateBelgium(inputValues); }
            const frResults = calculateFrance(inputValues, activeComparison);

            // Invariant check: Netto = Bruto - Lasten (±1 rounding tolerance)
            [compareResults, frResults].forEach(r => {
                if (r && r.bruto !== undefined && r.tax !== undefined && r.netto !== undefined) {
                    const expectedNetto = r.bruto - r.tax;
                    if (Math.abs(expectedNetto - r.netto) > 1) {
                        console.warn(`Invariant violation detected: |${expectedNetto} - ${r.netto}| > 1. Auto-correcting.`);
                        r.netto = expectedNetto;
                        if (r.breakdown) r.breakdown.invariantAdjusted = true;
                    }
                }
            });

            if(outputs.compareBruto)outputs.compareBruto.textContent=formatCurrency(compareResults.bruto); if(outputs.compareTax)outputs.compareTax.textContent=formatCurrency(compareResults.tax); if(outputs.compareNetto)outputs.compareNetto.textContent=formatCurrency(compareResults.netto); if(outputs.wealthTaxCompare)outputs.wealthTaxCompare.textContent=formatCurrency(compareResults.wealthTax);
            if(outputs.frBruto)outputs.frBruto.textContent=formatCurrency(frResults.bruto); if(outputs.frTax)outputs.frTax.textContent=formatCurrency(frResults.tax); if(outputs.frNetto)outputs.frNetto.textContent=formatCurrency(frResults.netto); if(outputs.wealthTaxFr)outputs.wealthTaxFr.textContent=formatCurrency(frResults.wealthTax); if(outputs.wealthTaxFrExpl)outputs.wealthTaxFrExpl.textContent=(frResults.wealthTax===0&&inputValues.estate>50000)?"(Vastgoed < €1.3M)":"";
            const frN=frResults.netto||0, compN=compareResults.netto||0, frW=frResults.wealthTax||0, compW=compareResults.wealthTax||0; const delta=(frN-compN)+(compW-frW);
            if(outputs.conclusionValue)outputs.conclusionValue.textContent=formatCurrency(delta,true); if(outputs.conclusionBar)outputs.conclusionBar.className=delta>=0?'positive':'negative'; if(outputs.conclusionExpl)outputs.conclusionExpl.textContent=delta>=0?"Positief: voordeel in Frankrijk.":"Negatief: voordeel in vergeleken land.";
            if(outputs.breakdown){if(initialLoad){outputs.breakdown.innerHTML=`<p style="text-align: center;">Welkom! 🧭 Vul data in.</p>`; initialLoad=false;}else{outputs.breakdown.textContent=generateBreakdown(inputValues,compareResults,frResults);}}
// Café Claude widget — resultaten beschikbaar maken
            if (!initialLoad) {
              const simInfo = getSimulationInfo(inputValues);
              const p1AOWInfo = getAOWDateInfo(p1Input.birthYear);
              const p1AOWDate = new Date((p1Input.birthYear||1900)+p1AOWInfo.years,(p1Input.birthMonth||1)-1+p1AOWInfo.months);
              const p1IsPensioner = simInfo.simulatieDatum >= p1AOWDate;
              let p2IsPensioner = null;
              let p2AOWInfo = null;
              if (p2Input) {
                p2AOWInfo = getAOWDateInfo(p2Input.birthYear);
                const p2AOWDate = new Date((p2Input.birthYear||1900)+p2AOWInfo.years,(p2Input.birthMonth||1)-1+p2AOWInfo.months);
                p2IsPensioner = simInfo.simulatieDatum >= p2AOWDate;
              }
              window._fkComputedState = {
                simulatieDatum: simInfo.simulatieDatum.toISOString().slice(0,10),
                partner1: {
                  leeftijd: simInfo.simulatieLeeftijdP1,
                  isPensionado: p1IsPensioner,
                  aowLeeftijd: p1AOWInfo.years + ' jaar' + (p1AOWInfo.months > 0 ? ' en ' + p1AOWInfo.months + ' maanden' : ''),
                },
                partner2: p2Input ? {
                  leeftijd: simInfo.simulatieLeeftijdP2,
                  isPensionado: p2IsPensioner,
                  aowLeeftijd: p2AOWInfo.years + ' jaar' + (p2AOWInfo.months > 0 ? ' en ' + p2AOWInfo.months + ' maanden' : ''),
                } : null,
                quotientFamilialParts: frResults.breakdown?.parts || null,
                frStaatspensioen: frResults.breakdown?.frStatePension || 0,
              };
              window.ccEmbed = {
                getToolContext: () => ({
                  summary: `${activeComparison} netto: ${formatCurrency(compareResults.netto)} | FR netto: ${formatCurrency(frResults.netto)} | Verschil: ${formatCurrency(frResults.netto - compareResults.netto, true)} | Parts: ${frResults.breakdown?.parts || '-'} | Vermogensbelasting ${activeComparison}: ${formatCurrency(compareResults.wealthTax)} | IFI FR: ${formatCurrency(frResults.wealthTax)}`,
                  details: {
                    comparison: activeComparison,
                    compareBruto: compareResults.bruto,
                    compareTax: compareResults.tax,
                    compareNetto: compareResults.netto,
                    compareWealthTax: compareResults.wealthTax,
                    frBruto: frResults.bruto,
                    frTax: frResults.tax,
                    frNetto: frResults.netto,
                    frWealthTax: frResults.wealthTax,
                    parts: frResults.breakdown?.parts,
                    delta: frResults.netto - compareResults.netto,
                    isCouple: inputValues.isCouple,
                    children: inputValues.children
                  }
                })
              };
            }
        } catch (error) { console.error("Fout in updateScenario:", error); displayError(`Fout berekening: ${error.message}.`); }
     }

    // ===========================================
    // ===== REKENFUNCTIES ======================
    // ===========================================

    // --- NEDERLAND ---
    function calculateNetherlands(vals) {
        if (!PARAMS.NL) return { bruto: 0, tax: 0, netto: 0, wealthTax: 0, breakdown: {} }; let cB=0, cT=0, cN=0; const P=[vals.p1, vals.p2].filter(p=>p);
        const { simulatieDatum, simulatieLeeftijdP1, simulatieLeeftijdP2 } = getSimulationInfo(vals);

        P.forEach((p, index)=>{
            const simulatieLeeftijd = (index === 0) ? simulatieLeeftijdP1 : simulatieLeeftijdP2;
            if (simulatieLeeftijd === null) return;
            
            const aDI=getAOWDateInfo(p.birthYear); const aM=new Date((p.birthYear||1900)+aDI.years,(p.birthMonth||1)-1+aDI.months);
            const isPensioner = simulatieDatum >= aM; // Check against sim date
            const lDN=p.lijfrenteDuration?Number(p.lijfrenteDuration):999;
            const lijfrenteStartAgeVal = p.lijfrenteStartAge === 'aow' ? (aDI.years + Math.floor(aDI.months / 12)) : parseInt(p.lijfrenteStartAge || '999', 10);
            const lijfrenteIsActive = simulatieLeeftijd >= lijfrenteStartAgeVal && simulatieLeeftijd < lDN;

            const cP=isPensioner?(p.pensionPublic||0)+(p.pensionPrivate||0):0;
            const cAOW=isPensioner?(Number(p.aowYears||0)/50)*(vals.isCouple?PARAMS.AOW_BRUTO_COUPLE:PARAMS.AOW_BRUTO_SINGLE):0;
            const cL = lijfrenteIsActive ? (p.lijfrente||0) : 0;
            const isWorking = simulatieDatum < aM; // Werkt tot AOW-leeftijd
            const sUsed = (!vals.stopSalaryAfterAOW || isWorking) ? (p.salary||0) : 0;
            const r=calculateNLNetto(cAOW+cP+cL, sUsed, p.business||0, isPensioner);
            cB+=r.bruto;cT+=r.tax;cN+=r.netto;
        });
        const v=vals.isCouple?(PARAMS.NL.BOX3.VRIJSTELLING_COUPLE||0):(PARAMS.NL.BOX3.VRIJSTELLING_SINGLE||0); const wT=Math.max(0,(vals.wealthFinancial||0)-v)*(PARAMS.NL.BOX3.FORFAITAIR_RENDEMENT||0)*(PARAMS.NL.BOX3.TARIEF||0);
        return {bruto:cB, tax:cT, netto:cN, wealthTax:wT, breakdown: { simulatieDatum: simulatieDatum }};
    }
     function calculateNLNetto(pI, s, b, iA) { if(!PARAMS.NL)return{bruto:0,tax:0,netto:0}; const wNV=b*(1-(PARAMS.NL.BOX1.MKB_WINSTVRIJSTELLING||0)); const zB=b>0?wNV:0; const z=zB*(PARAMS.NL.SOCIALE_LASTEN.ZVW_PERCENTAGE||0); const br=pI+s+wNV; if(br<=0&&z<=0)return{bruto:0,tax:0,netto:0}; if(br<=0&&z>0)return{bruto:0,tax:z,netto:-z}; let t=0; const T=iA?PARAMS.NL.BOX1.TARIEVEN_BOVEN_AOW:PARAMS.NL.BOX1.TARIEVEN_ONDER_AOW; const gS1=PARAMS.NL.BOX1.GRENS_SCHIJF_1||Infinity; if(br<=gS1){t=br*T[0];}else{t=(gS1*T[0])+((br-gS1)*T[1]);} let aK=(s>0||b>0?(PARAMS.NL.BOX1.ARBEIDSKORTING_MAX||0):0); let alK=PARAMS.NL.BOX1.ALGEMENE_HEFFINGSKORTING_MAX||0; const hAS=PARAMS.NL.BOX1.HK_AFBOUW_START||0; if(br>hAS){alK=Math.max(0,alK-((br-hAS)*(PARAMS.NL.BOX1.HK_AFBOUW_FACTOR||0)));} if(br>=gS1){alK=0;} const akAS=39957; if(br>akAS){aK=Math.max(0,aK-((br-akAS)*0.0651));} t=t-alK-aK; t=Math.max(0,t); const tT=t+z; return {bruto:br, tax:tT, netto:br-tT}; }

    // --- FRANKRIJK ---
    function calculateFrance(vals, currentComparison) {
        if (!PARAMS.FR || !PARAMS.NL || !PARAMS.BE) return { bruto: 0, tax: 0, netto: 0, wealthTax: 0, breakdown: {} };
        let bINLB=0, tA=0, tPP=0, tLo=0, tW=0, iPH=false;
        let tBFA={services:0, rental:0}; let tEY=0;
        let totalBePension = 0, totalBePensionContributions = 0;
        let totalLijfrenteBruto = 0, totalLijfrenteBelastbaar = 0, lijfrenteSocLasten = 0;
        const P=[vals.p1, vals.p2].filter(p=>p);
        const { simulatieDatum, simulatieLeeftijdP1, simulatieLeeftijdP2 } = getSimulationInfo(vals);

        P.forEach((p, index)=>{
            const simulatieLeeftijd = (index === 0) ? simulatieLeeftijdP1 : simulatieLeeftijdP2;
            if (simulatieLeeftijd === null) return;
            const aDI=getAOWDateInfo(p.birthYear); const aM=new Date((p.birthYear||1900)+aDI.years,(p.birthMonth||1)-1+aDI.months);
            const isPensioner = simulatieDatum >= aM; const isWorking = simulatieDatum < aM;
            if(isPensioner) iPH = true;
            const lDN=p.lijfrenteDuration?Number(p.lijfrenteDuration):999;
            const lijfrenteStartAgeVal = p.lijfrenteStartAge === 'aow' ? (aDI.years + Math.floor(aDI.months / 12)) : parseInt(p.lijfrenteStartAge || '999', 10);
            const lijfrenteIsActive = simulatieLeeftijd >= lijfrenteStartAgeVal && simulatieLeeftijd < lDN;

            const countryYears = (currentComparison === 'NL') ? Number(p.aowYears||0) : Number(p.beWorkYears||0);
            tEY += countryYears + Number(p.frWorkYears||0);

            bINLB+=isPensioner?(p.pensionPublic||0):0;
            tA+=isPensioner?(Number(p.aowYears||0)/50)*(vals.isCouple?PARAMS.AOW_BRUTO_COUPLE:PARAMS.AOW_BRUTO_SINGLE):0;
            tPP+=isPensioner?(p.pensionPrivate||0):0;
            
            const currentLijfrente = lijfrenteIsActive ? (p.lijfrente||0) : 0;
            totalLijfrenteBruto += currentLijfrente;
            if (currentLijfrente > 0) {
                let belastbareFractie = 1.0; // Default 100% (als < 50)
                // BUGFIX: Gebruik lijfrenteStartAgeVal voor de fractie, niet simulatieLeeftijd
                for (const frac of (PARAMS.FR.INKOMSTENBELASTING.LIJFRENTE_FRACTIES||[])) {
                    if (lijfrenteStartAgeVal < frac.age) { belastbareFractie = frac.fraction; break; } 
                    belastbareFractie = frac.fraction; // Blijf updaten
                }
                const lijfrenteBelastbaarDeel = currentLijfrente * belastbareFractie;
                totalLijfrenteBelastbaar += lijfrenteBelastbaarDeel;
                lijfrenteSocLasten += lijfrenteBelastbaarDeel * (PARAMS.FR.SOCIALE_LASTEN.LIJFRENTE_TARIEF || 0);
            }

            tLo+= (!vals.stopSalaryAfterAOW || isWorking) ? (p.salary||0) : 0;
            tW+= (p.business||0);
            tBFA[p.businessType||'services']+=(p.business||0);
            const bePensionBruto = p.bePension || 0;
            if (isPensioner && bePensionBruto > 0) {
                totalBePension += bePensionBruto;
                totalBePensionContributions += bePensionBruto * ((PARAMS.BE.SOCIALE_LASTEN.PENSIOEN_RIZIV_PERCENTAGE||0) + (PARAMS.BE.SOCIALE_LASTEN.PENSIOEN_SOLIDARITEIT_PERCENTAGE||0));
            }
        });

        const frReqYears = PARAMS.FR_PENSION_YEARS_REQUIRED || 1; const frRate = PARAMS.FR_PENSION_RATE || 0; const frAvgSal = PARAMS.FR_PENSION_AVG_SALARY || 0;
        const frPensionRate = tEY >= frReqYears ? frRate : frRate * (tEY / frReqYears);
        const tFWY=(vals.p1?.frWorkYears||0)+(vals.p2?.frWorkYears||0); const fSP=frReqYears>0?(tFWY/frReqYears)*frAvgSal*frPensionRate:0; const fSPA=iPH?fSP:0;
        const tIV=(vals.p1?.incomeWealth||0)+(vals.p2?.incomeWealth||0); const pT=tIV*(PARAMS.FR.INKOMSTENBELASTING.PFU_TARIEF||0); const pSL=tIV*(PARAMS.FR.SOCIALE_LASTEN.PFU||0);
        const nlTR=PARAMS.NL?.BOX1?.TARIEVEN_BOVEN_AOW?.[0]||0; const nINL=bINLB*(1-nlTR);
        const tPIF_NL_BE=tA+tPP+fSPA + totalBePension;
        const sLP=(tA+tPP+fSPA)*(PARAMS.FR.SOCIALE_LASTEN.PENSIOEN||0);
        const sLS=tLo*(PARAMS.FR.SOCIALE_LASTEN.SALARIS||0); const sLW=(tBFA.services*(PARAMS.FR.SOCIALE_LASTEN.WINST_DIENSTEN||0))+(tBFA.rental*(PARAMS.FR.SOCIALE_LASTEN.WINST_VERHUUR||0));
        const tSL_excl_lijfrente = sLP + sLS + sLW;
        const wNA=(tBFA.services*(1-(PARAMS.FR.INKOMSTENBELASTING.ABATTEMENT_WINST_DIENSTEN||0)))+(tBFA.rental*(1-(PARAMS.FR.INKOMSTENBELASTING.ABATTEMENT_WINST_VERHUUR||0)));
        let bI=(tPIF_NL_BE+tLo+wNA) - tSL_excl_lijfrente + totalLijfrenteBelastbaar;
        bI -= totalBePensionContributions; const aC=vals.cak?(PARAMS.FR.CAK_BIJDRAGE_GEMIDDELD||0):0; bI-=aC;
        let a65=0; if(iPH){const aP=P.filter(p=>{const aI=getAOWDateInfo(p.birthYear);const aMo=new Date((p.birthYear||1900)+aI.years,(p.birthMonth||1)-1+aI.months);return simulatieDatum>=aMo;}).length; const iBFA_65=tPIF_NL_BE + totalLijfrenteBruto; const d1=PARAMS.FR.INKOMSTENBELASTING.ABATTEMENT_65PLUS.DREMPEL1||Infinity; const d2=PARAMS.FR.INKOMSTENBELASTING.ABATTEMENT_65PLUS.DREMPEL2||Infinity; const af1=PARAMS.FR.INKOMSTENBELASTING.ABATTEMENT_65PLUS.AFTREK1||0; const af2=PARAMS.FR.INKOMSTENBELASTING.ABATTEMENT_65PLUS.AFTREK2||0; if(iBFA_65<=d1*aP){a65=af1*aP;}else if(iBFA_65<=d2*aP){a65=af2*aP;}} bI-=a65;
        const parts=(vals.isCouple?2:1)+(vals.children>2?(vals.children-2)*1+1:(vals.children||0)*0.5); const iPP=parts>0?Math.max(0,bI)/parts:0;
        let bPP=0,vG=0; (PARAMS.FR.INKOMSTENBELASTING.SCHIJVEN||[]).forEach(s=>{const cG=s.grens===Infinity?Infinity:Number(s.grens); bPP+=Math.max(0,Math.min(iPP,cG)-vG)*s.tarief; vG=cG;});
        let tax = bPP * parts;
        const bP = vals.isCouple ? 2 : 1; const cP = parts - bP; let tWC = 0;
        if (cP > 0 && bP > 0) { const iPB = Math.max(0, bI) / bP; vG = 0; (PARAMS.FR.INKOMSTENBELASTING.SCHIJVEN||[]).forEach(s=>{const cG=s.grens===Infinity?Infinity:Number(s.grens); tWC+=Math.max(0,Math.min(iPB,cG)-vG)*s.tarief; vG=cG;}); tWC*=bP; const mV=cP*2*(PARAMS.FR.INKOMSTENBELASTING.QUOTIENT_PLAFOND_PER_HALF_PART||0); const cA=tWC-tax; if (cA > mV) { tax = tWC - mV; } }
        const bK=(vals.homeHelp||0)*(PARAMS.FR.HULP_AAN_HUIS_KREDIET_PERCENTAGE||0); tax=tax-bK;
        const bIF = tPIF_NL_BE + totalLijfrenteBruto + tLo + tW + tIV;
        const br = bIF + bINLB;
        const nlWithholding = bINLB * nlTR; // NL bronheffing on NL overheidspensioen
        const totaleSocialeLastenFrankrijk = tSL_excl_lijfrente + pSL + lijfrenteSocLasten + totalBePensionContributions;
        const tIF_withNL = totaleSocialeLastenFrankrijk + pT + Math.max(0,tax) + nlWithholding; // Include NL bronheffing
        const nt = br - tIF_withNL; // Netto = Bruto - Lasten
        let wT=0; const wPN=vals.wealthProperty||0; const ifiStart = PARAMS.FR.IFI.DREMPEL_START || Infinity; if(wPN>ifiStart){let tA=wPN;wT=0;let pL=800000;for(const s of (PARAMS.FR.IFI.SCHIJVEN||[])){const cG=s.grens===Infinity?Infinity:Number(s.grens);if(tA<=pL)break; const aIS=Math.max(0,Math.min(tA,cG)-pL); wT+=aIS*s.tarief; pL=cG; if(tA<=cG)break;}}
        return {bruto:br,tax:tIF_withNL,netto:nt,wealthTax:wT, breakdown:{ simulatieDatum: simulatieDatum, socialeLasten:totaleSocialeLastenFrankrijk, nlWithholdingOnGovPension:nlWithholding, aftrekCak:aC, beContribAftrek: totalBePensionContributions, abattement65Plus: a65, belastingKrediet:bK,tax:Math.max(0,tax)+pT,calculatedTaxIB:tax,parts:parts,nettoInkomenUitNL:nINL,brutoInFR:bIF,brutoInkomenVoorNLBelasting:bINLB,frStatePension:fSPA, lijfrenteBruto: totalLijfrenteBruto, lijfrenteBelastbaar: totalLijfrenteBelastbaar, pfuTax: pT, pfuSocLasten: pSL, frSocLastenInkomen: tSL_excl_lijfrente, lijfrenteSocLasten: lijfrenteSocLasten }};
    }

    // --- BELGIË ---
    function calculateBelgium(vals) {
        if (!PARAMS.BE || !PARAMS.NL) return { bruto: 0, tax: 0, netto: 0, wealthTax: 0, breakdown: {} };
        let tB=0, tBI_voor_kosten=0, tSL=0, tIV=0, tRV=0, nPNLB=0;
        let brutoBePension=0, bePensionContrib=0;
        let p1LoonVoorKosten = 0, p2LoonVoorKosten = 0;
        let totalRszWerknemer=0, totalZelfstandigenbijdrage=0, totalLoon=0, totalWinst=0;
        const P=[vals.p1, vals.p2].filter(p=>p); const PB=PARAMS.BE;
        const { simulatieDatum, simulatieLeeftijdP1, simulatieLeeftijdP2 } = getSimulationInfo(vals);

        P.forEach((p, index) => {
            const simulatieLeeftijd = (index === 0) ? simulatieLeeftijdP1 : simulatieLeeftijdP2;
            if (simulatieLeeftijd === null) return;
            const s=p.salary||0, b=p.business||0; const pP=p.pensionPublic||0, pPr=p.pensionPrivate||0;
            const l=p.lijfrente||0, iW=p.incomeWealth||0; const aY=p.aowYears||0; const beP=p.bePension||0;

            const aDI=getAOWDateInfo(p.birthYear); const aM=new Date((p.birthYear||1900)+aDI.years,(p.birthMonth||1)-1+aDI.months);
            const isPensioner = simulatieDatum >= aM; const isWorking = simulatieDatum < aM;
            const lDN=p.lijfrenteDuration?Number(p.lijfrenteDuration):999;
            const lijfrenteStartAgeVal = p.lijfrenteStartAge === 'aow' ? (aDI.years + Math.floor(aDI.months / 12)) : parseInt(p.lijfrenteStartAge || '999', 10);
            const lijfrenteIsActive = simulatieLeeftijd >= lijfrenteStartAgeVal && simulatieLeeftijd < lDN;

            const loon = (!vals.stopSalaryAfterAOW || isWorking) ? s : 0;
            const winst = b; // always
            totalLoon += loon;
            totalWinst += winst;
            const rW=loon*(PB.SOCIALE_LASTEN.WERKNEMER_RSZ_PERCENTAGE||0); const nettoLoonVoorKosten=loon-rW; totalRszWerknemer+=rW; tSL+=rW; tBI_voor_kosten+=nettoLoonVoorKosten;
            if (index === 0) p1LoonVoorKosten = nettoLoonVoorKosten; else p2LoonVoorKosten = nettoLoonVoorKosten;
            let rZ=0; if(winst>0){let iR=winst,vG=0; (PB.SOCIALE_LASTEN.ZELFSTANDIGE_SCHIJVEN||[]).forEach(sch=>{const cG=Number(sch.grens);let bIS=Math.max(0,Math.min(iR,cG-vG));rZ+=bIS*sch.tarief;iR-=bIS;vG=cG;});} const nettoWinstVoorKosten=winst-rZ; totalZelfstandigenbijdrage+=rZ; tSL+=rZ; tBI_voor_kosten+=nettoWinstVoorKosten;
            tB+=loon+winst;

            const cAOW=isPensioner?(aY/50)*(vals.isCouple?PARAMS.AOW_BRUTO_COUPLE:PARAMS.AOW_BRUTO_SINGLE):0; const cABP=isPensioner?pP:0; const cP=isPensioner?pPr:0; const cL=lijfrenteIsActive?l:0;
            const cBEP = isPensioner ? beP : 0; brutoBePension += cBEP;
            if(cABP>0){nPNLB+=cABP;} const tOP=cAOW+cP+cL;
            tBI_voor_kosten+=tOP; // Alle NL part. pensioenen/lijfrentes in BE belastbaar
            tB+=cABP+tOP+cBEP; tIV+=iW;
        });

        const rizivP = PB.SOCIALE_LASTEN.PENSIOEN_RIZIV_PERCENTAGE||0; const solidP = PB.SOCIALE_LASTEN.PENSIOEN_SOLIDARITEIT_PERCENTAGE||0;
        const rizivBijdrage = brutoBePension * rizivP; const solidBijdrage = brutoBePension * solidP;
        bePensionContrib = rizivBijdrage + solidBijdrage; tSL += bePensionContrib;
        const nettoBePension = brutoBePension - bePensionContrib;

        const nlTR=PARAMS.NL?.BOX1?.TARIEVEN_BOVEN_AOW?.[0]||0; const nINL=nPNLB*(1-nlTR);
        const nlWithholding = nPNLB * nlTR; // NL bronheffing on NL overheidspensioen
        tB+=tIV; // Final Total Gross (removed duplicate nPNLB, already included in line 304)

        const maxKostenPP = PB.INKOMSTENBELASTING.FORFAIT_BEROEPSKOSTEN_WERKNEMER_MAX||0;
        const kostenPercentage = PB.INKOMSTENBELASTING.FORFAIT_BEROEPSKOSTEN_WERKNEMER_PERCENTAGE||0;
        let forfaitKosten = 0;
        if (vals.p1) forfaitKosten += Math.min(p1LoonVoorKosten * kostenPercentage, maxKostenPP);
        if (vals.p2 && isCouple) forfaitKosten += Math.min(p2LoonVoorKosten * kostenPercentage, maxKostenPP);

        const tBI_na_kosten = Math.max(0, tBI_voor_kosten - forfaitKosten);
        const totaalBelastbaarInkomen = tBI_na_kosten + nettoBePension;

        const spaarRenteDeel=tIV/2, overigRenteDividendDeel=tIV/2; const vrijstSpaarPP=PB.INKOMSTENBELASTING.ROERENDE_VOORHEFFING_VRIJSTELLING_SPAAR_PP||0; const vrijstSpaarTotaal=vrijstSpaarPP*(vals.isCouple?2:1); const belasteSpaarRente=Math.max(0,spaarRenteDeel-vrijstSpaarTotaal); const rvSpaar=belasteSpaarRente*(PB.INKOMSTENBELASTING.ROERENDE_VOORHEFFING_TARIEF_SPAAR||0);
        const dividendDeelOverig=overigRenteDividendDeel/2, renteDeelOverig=overigRenteDividendDeel/2; const vrijstDividendPP=PB.INKOMSTENBELASTING.ROERENDE_VOORHEFFING_VRIJSTELLING_DIVIDEND_PP||0; const vrijstDividendTotaal=vrijstDividendPP*(vals.isCouple?2:1); const belastbaarDividend=Math.max(0,dividendDeelOverig-vrijstDividendTotaal); const rvOverig=(belastbaarDividend+renteDeelOverig)*(PB.INKOMSTENBELASTING.ROERENDE_VOORHEFFING_TARIEF_ALGEMEEN||0); tRV=rvSpaar+rvOverig;

        let fB=0, iRF=totaalBelastbaarInkomen, vGF=0; (PB.INKOMSTENBELASTING.SCHIJVEN_2025||[]).forEach(sch=>{const g=sch.grens;let bIS=Math.max(0,Math.min(iRF,g-vGF));fB+=bIS*sch.tarief;iRF-=bIS;vGF=g;});
        let tV=(PB.INKOMSTENBELASTING.BASIS_VRIJSTELLING||0)*(vals.isCouple?2:1); const nC=vals.children||0; if(nC>0){const kA=PB.INKOMSTENBELASTING.VRIJSTELLING_PER_KIND||[0,0,0]; const eK=PB.INKOMSTENBELASTING.EXTRA_VRIJSTELLING_KIND_MEER_DAN_3||0; if(nC===1)tV+=kA[0]; else if(nC===2)tV+=kA[1]; else if(nC===3)tV+=kA[2]; else if(nC>3){tV+=kA[2]+(nC-3)*eK;}}
        const lT=(PB.INKOMSTENBELASTING.SCHIJVEN_2025||[{tarief:0.25}])[0].tarief; const bK=Math.min(totaalBelastbaarInkomen,tV)*lT; fB=Math.max(0,fB-bK);
        const gB=fB*(PB.INKOMSTENBELASTING.GEMEENTEBELASTING_GEMIDDELD||0);

        let bszb=0; const bszbSchijven = PB.SOCIALE_LASTEN.BIJZONDERE_BIJDRAGE_SCHIJVEN_GEZIN_2024||[];
        const gezinsInkomenVoorBSZB = tBI_voor_kosten + brutoBePension; // BSZB basis = netto inkomen voor kosten + bruto BE pensioen
        for (const schijf of bszbSchijven) { if (gezinsInkomenVoorBSZB < schijf.grens) { bszb = schijf.bijdrage; break; } bszb = schijf.bijdrage||0; }

        const totaleTaxWithNL = tSL + fB + gB + tRV + bszb + nlWithholding; // Include NL bronheffing
        const nt = tB - totaleTaxWithNL; const wT = 0;
        return { bruto:tB, tax:totaleTaxWithNL, netto:nt, wealthTax:wT, breakdown:{simulatieDatum: simulatieDatum, nettoInkomenUitNL:nINL, nlWithholdingOnGovPension:nlWithholding, socialeLasten:tSL, rszWerknemer: totalRszWerknemer, zelfstandigenbijdrage: totalZelfstandigenbijdrage, bePensionContrib: bePensionContrib, brutoBePension: brutoBePension, totalLoon: totalLoon, totalWinst: totalWinst, bszb: bszb, forfaitKosten: forfaitKosten, federaleBelasting:fB, gemeentebelasting:gB, roerendeVoorheffing:tRV }};
    }

    // --- BREAKDOWN (FIXED) ---
    function generateBreakdown(vals, compare, fr) {
        try {
            if (!vals || !compare || !fr || !compare.breakdown || !fr.breakdown) { return "Fout: Analyse data incompleet."; }
            const wf=vals.wealthFinancial||0, wp=vals.wealthProperty||0; const est=wf+wp; const nlTR=PARAMS.NL?.BOX1?.TARIEVEN_BOVEN_AOW?.[0]||0;
            const tIV = (vals.p1?.incomeWealth || 0) + (vals.p2?.incomeWealth || 0);
            
            const { simulatieDatum } = compare.breakdown; // Haal sim datum uit breakdown
            const simDatumStr = (inputs.simYear.value && inputs.simMonth.value) ? `per ${simulatieDatum.toLocaleString('nl-NL', { month: 'long', year: 'numeric' })}` : '(huidige situatie)';

            const getRetirementProjection = (p, idx) => { if(!p||!p.birthYear)return''; const aDI=getAOWDateInfo(p.birthYear); const aM=new Date((p.birthYear||1900)+aDI.years,(p.birthMonth||1)-1+aDI.months); const pL=vals.isCouple?`(P${idx+1})`:''; if(!simulatieDatum) return ''; if(simulatieDatum<aM){const n=simulatieDatum; let yD=aM.getFullYear()-n.getFullYear();let mD=aM.getMonth()-n.getMonth();if(mD<0){yD--;mD+=12;}return `\n    ↳ Wett. Pensioen${pL} over ${yD}j,${mD}m`;} return `\n    ↳ Wett. Pensioen${pL} loopt`; };
            const projP1 = getRetirementProjection(vals.p1, 0); const projP2 = vals.p2 ? getRetirementProjection(vals.p2, 1) : '';
            let compTitle = "...", compContent = "...";

            if (activeComparison === 'NL') {
                const vS=PARAMS.NL?.BOX3?.VRIJSTELLING_SINGLE||0, vC=PARAMS.NL?.BOX3?.VRIJSTELLING_COUPLE||0;
                const zvwP1 = (vals.p1?.business||0) > 0 ? (vals.p1.business * (1-(PARAMS.NL.BOX1.MKB_WINSTVRIJSTELLING||0))) * (PARAMS.NL.SOCIALE_LASTEN.ZVW_PERCENTAGE||0) : 0;
                const zvwP2 = (vals.p2?.business||0) > 0 ? (vals.p2.business * (1-(PARAMS.NL.BOX1.MKB_WINSTVRIJSTELLING||0))) * (PARAMS.NL.SOCIALE_LASTEN.ZVW_PERCENTAGE||0) : 0;
                compTitle = `Nederland 🇳🇱 ${simDatumStr}`;
                compContent = `1. Bruto Inkomen Totaal: ${formatCurrency(compare.bruto)}
2. Geschatte Lasten: ${formatCurrency(compare.tax)}
   ↳ IB (Box 1): ${formatCurrency(compare.tax - zvwP1 - zvwP2)} (incl. AHK/AK, soc. lasten werkn./pens.)
   ↳ Zvw (ondernemers): ${formatCurrency(zvwP1 + zvwP2)}
3. Netto Inkomen: ${formatCurrency(compare.netto)}

4. Vermogen (Box 3):
   - Financieel: ${formatCurrency(wf)} (Vrijst.: ${formatCurrency(vals.isCouple ? vC : vS)})
   ↳ Aanslag: ${formatCurrency(compare.wealthTax)} (${((PARAMS.NL.BOX3.FORFAITAIR_RENDEMENT||0)*100).toFixed(2)}% fictief rend.)`;
            }
            else if (activeComparison === 'BE') {
                const div=(1-nlTR); const bNP=div!==0?(compare.breakdown.nettoInkomenUitNL||0)/div:0;
                const nlWithholding = compare.breakdown.nlWithholdingOnGovPension || 0;
                const rszWerknemer = compare.breakdown.rszWerknemer || 0;
                const zelfstandigenbijdrage = compare.breakdown.zelfstandigenbijdrage || 0;
                const bePensionContrib = compare.breakdown.bePensionContrib || 0;
                const bszb = compare.breakdown.bszb || 0;
                
                // Build social contributions breakdown conditionally
                let socialeLastenBreakdown = '';
                if (rszWerknemer > 0) {
                    socialeLastenBreakdown += `\n   ↳ RSZ Werknemer (13,07%): -${formatCurrency(rszWerknemer)}`;
                }
                if (zelfstandigenbijdrage > 0) {
                    socialeLastenBreakdown += `\n   ↳ Zelfstandigenbijdrage: -${formatCurrency(zelfstandigenbijdrage)}`;
                }
                if (bePensionContrib > 0) {
                    socialeLastenBreakdown += `\n   ↳ RIZIV (3,55%) + Solidariteit (~1%) op BE pensioen: -${formatCurrency(bePensionContrib)}`;
                }
                if (bszb > 0) {
                    socialeLastenBreakdown += `\n   ↳ Bijzondere Sociale Zekerheidsbijdrage (BSZB): -${formatCurrency(bszb)}`;
                }
                
                compTitle = `België 🇧🇪 ${simDatumStr}`;
                compContent = `1. Bruto Inkomen Totaal: ${formatCurrency(compare.bruto)}
   (Incl. NL pensioen bruto*: ${formatCurrency(bNP)})
2. Sociale Lasten: ${formatCurrency(compare.breakdown.socialeLasten||0)}${socialeLastenBreakdown}
   = Subtotaal na SZ: ${formatCurrency(compare.bruto - (compare.breakdown.socialeLasten||0))}
3. Beroepskosten (Forfait werknemer): -${formatCurrency(compare.breakdown.forfaitKosten||0)}
   = Belastbaar Inkomen: ${formatCurrency(compare.bruto - (compare.breakdown.socialeLasten||0) - (compare.breakdown.forfaitKosten||0))}
4. Belastingen: ${formatCurrency((compare.breakdown.federaleBelasting||0)+(compare.breakdown.gemeentebelasting||0)+(compare.breakdown.roerendeVoorheffing||0))}
   ↳ Fed. PB (na vrije som korting): ${formatCurrency(compare.breakdown.federaleBelasting||0)}
   ↳ Gem. Belast. (~${((PARAMS.BE.INKOMSTENBELASTING.GEMEENTEBELASTING_GEMIDDELD||0)*100).toFixed(1)}% op Fed. PB): +${formatCurrency(compare.breakdown.gemeentebelasting||0)}
   ↳ Roerende Voorheffing: +${formatCurrency(compare.breakdown.roerendeVoorheffing||0)} (30% alg./15% spaar > vrijst.)
5. NL Bronheffing (op NL ovh.pensioen): +${formatCurrency(nlWithholding)} (${(nlTR*100).toFixed(2)}% op ${formatCurrency(bNP)})
6. Totale Lasten (SZ + Belastingen + NL Bronheff.): ${formatCurrency(compare.tax)}
7. Netto Inkomen: ${formatCurrency(compare.netto)}

8. Vermogen: Aanslag: ${formatCurrency(compare.wealthTax)} (Geen alg. vermogensbelasting)
* NL overheidspensioen wordt in NL belast. Particulier NL pensioen/lijfrente in BE.`;
            }

            // --- FRANSE BREAKDOWN (FIXED) ---
            const pfuSocLasten_fr = fr.breakdown.pfuSocLasten || 0;
            const beContribAftrek_fr = fr.breakdown.beContribAftrek || 0;
            const lijfrenteSocLasten_fr = fr.breakdown.lijfrenteSocLasten || 0;
            const frSocLastenExclPFUBeLijfrente = fr.breakdown.frSocLastenInkomen || 0; // Dit was de fout, nu correct gelezen
            const cakAftrek_fr = fr.breakdown.aftrekCak || 0;
            const pfuTax_fr = fr.breakdown.pfuTax || 0;
            const ibTax_fr = (fr.breakdown.tax || 0) - pfuTax_fr;
            const belastingKrediet_fr = fr.breakdown.belastingKrediet || 0;
            const nlWithholding_fr = fr.breakdown.nlWithholdingOnGovPension || 0;
            const abattement65Plus_fr = fr.breakdown.abattement65Plus || 0;
            // Benadering belastbaar inkomen voor weergave
            const belastbaarInkomen_fr = (fr.breakdown.brutoInFR || 0) - frSocLastenExclPFUBeLijfrente - beContribAftrek_fr - cakAftrek_fr - (fr.breakdown.lijfrenteBruto || 0) + (fr.breakdown.lijfrenteBelastbaar || 0);

            // Build conditional FR "Overige Aftrekposten" lines
            let overigeAftrekposten_fr = '';
            if (cakAftrek_fr > 0) {
                overigeAftrekposten_fr += `\n   ↳ Aftrek CAK-bijdrage (NL): -${formatCurrency(cakAftrek_fr)}`;
            }
            if (beContribAftrek_fr > 0) {
                overigeAftrekposten_fr += `\n   ↳ Aftrek BE pensioenbijdragen: -${formatCurrency(beContribAftrek_fr)}`;
            }
            if (abattement65Plus_fr > 0) {
                overigeAftrekposten_fr += `\n   ↳ Abattement 65+: -${formatCurrency(abattement65Plus_fr)}`;
            }

            // Check for invariant adjustments
            let invariantNote = '';
            if (compare.breakdown?.invariantAdjusted || fr.breakdown?.invariantAdjusted) {
                invariantNote = '\n⚠️ Integriteitscorrectie toegepast: Netto = Bruto − Lasten.';
            }

            return `
Analyse ${activeComparison}-FR | ${vals.isCouple?'Partners':'Alleenst.'}, Kind:${vals.children||0} | Verm: ${formatCurrency(est)} (${formatCurrency(wf)} fin/${formatCurrency(wp)} vast) ${projP1}${projP2}
Simulatiedatum: ${simDatumStr}${invariantNote}
----------------------------------------------------------------------------------------------------
${compTitle}
${compContent}
----------------------------------------------------------------------------------------------------
Frankrijk 🇫🇷 ${simDatumStr}
1. Bruto Inkomen Totaal: ${formatCurrency(fr.bruto)}
   ↳ Inkomen belast in FR: ${formatCurrency(fr.breakdown.brutoInFR||0)} (Incl. bruto lijfrente: ${formatCurrency(fr.breakdown.lijfrenteBruto||0)})
   ↳ Inkomen belast in Herkomstland*: ${formatCurrency(fr.breakdown.brutoInkomenVoorNLBelasting||0)} (Netto: ${formatCurrency(fr.breakdown.nettoInkomenUitNL||0)})
2. Sociale Lasten (Totaal): ${formatCurrency(fr.breakdown.socialeLasten||0)}
   ↳ FR Soc. Lasten (Inkomen): -${formatCurrency(frSocLastenExclPFUBeLijfrente)} (~9% pens, ~22% loon, ~21% winst)
   ↳ FR Soc. Lasten (Lijfrente belastb. deel): -${formatCurrency(lijfrenteSocLasten_fr)} (${((PARAMS.FR.SOCIALE_LASTEN.LIJFRENTE_TARIEF||0)*100).toFixed(1)}% op ${formatCurrency(fr.breakdown.lijfrenteBelastbaar||0)})
   ↳ FR Soc. Lasten (Vermogen PFU 17.2%): -${formatCurrency(pfuSocLasten_fr)}
   ↳ BE Soc. Lasten (Pensioen RIZIV/Solid.): -${formatCurrency(beContribAftrek_fr)} (Betaald in BE)
   = Subtotaal na SZ: ${formatCurrency(fr.bruto - (fr.breakdown.socialeLasten||0))}
3. Overige Aftrekposten FR:${overigeAftrekposten_fr}
   = Belastbaar Inkomen FR (vóór IB): ${formatCurrency(belastbaarInkomen_fr - abattement65Plus_fr)}
      (Lijfrente slechts deels belast: ${formatCurrency(fr.breakdown.lijfrenteBelastbaar||0)} van ${formatCurrency(fr.breakdown.lijfrenteBruto||0)})
4. Belastingen FR (Totaal): ${formatCurrency(fr.breakdown.tax||0)}
   ↳ Inkomstenbelasting (IB) na QF (${fr.breakdown.parts?.toFixed(1)||0} parts): ${formatCurrency(ibTax_fr)}
      (Resultaat na verrekening Krediet Hulp Huis: +${formatCurrency(belastingKrediet_fr)})
      (NB: QF-voordeel heeft geen effect bij laag inkomen of is geplafonneerd.)
   ↳ Belasting Verm. Inkomen (PFU 12.8%): +${formatCurrency(pfuTax_fr)}
   ↳ NL Bronheffing (op NL ovh.pensioen): +${formatCurrency(nlWithholding_fr)} (${(nlTR*100).toFixed(2)}% op ${formatCurrency(fr.breakdown.brutoInkomenVoorNLBelasting||0)})
5. Totale Lasten (SZ + Belastingen + NL Bronheff.): ${formatCurrency(fr.tax)}
6. Netto Inkomen: ${formatCurrency(fr.netto)}

7. Vermogen (IFI):
   - Vastgoed: ${formatCurrency(wp)} (> €1.3M belast, excl. hoofd)
   ↳ Aanslag: ${formatCurrency(fr.wealthTax)}
* Ovh. pensioen wordt in herkomstland belast. Part. pensioen/lijfrente in woonland (FR).
        `;
        } catch (error) {
            console.error("Fout in generateBreakdown:", error);
            return `Fout bij genereren analyse: ${error.message}`;
        }
    }

    // --- Start Applicatie ---
    initializeApp();

}); // Einde DOMContentLoaded listener
// === AI ASSISTENT: TOOL STATE SERIALIZER ===
window.getToolState = function () {
  try {
    var comparison = document.getElementById('btn-nl')?.classList.contains('active') ? 'NL' : 'BE';
    var household = document.getElementById('btn-single')?.classList.contains('active') ? 'alleenstaand' : 'partners';
    var getVal = function (id) { var el = document.getElementById(id); return el ? el.value : null; };
    var getNum = function (id) { var el = document.getElementById(id); return el ? Number(el.value) || 0 : 0; };
    var getTxt = function (id) { var el = document.getElementById(id); return el ? el.textContent : ''; };
    var getChk = function (id) { var el = document.getElementById(id); return el ? el.checked : false; };

    var partner1 = {
      geboortejaar: getNum('birth-year-1'),
      geboortemaand: getNum('birth-month-1'),
      aowOpbouwjaren: getNum('aow-years-1'),
      werkjarenBelgie: getNum('be-work-years-1'),
      werkjarenFrankrijk: getNum('fr-work-years-1'),
      bePensioen: getNum('slider-be-pension-1'),
      overheidsPensioen: getNum('slider-pension-public-1'),
      particulierPensioen: getNum('slider-pension-private-1'),
      lijfrente: getNum('slider-lijfrente-1'),
      lijfrenteDuur: getVal('lijfrente-duration-1'),
      lijfrenteStartleeftijd: getVal('lijfrente-start-1'),
      inkomenUitVermogen: getNum('slider-income-wealth-1'),
      loon: getNum('slider-salary-1'),
      winstOnderneming: getNum('slider-business-1'),
      ondernemingstype: getVal('business-type-1'),
    };

    var partner2 = null;
    if (household === 'partners') {
      partner2 = {
        geboortejaar: getNum('birth-year-2'),
        geboortemaand: getNum('birth-month-2'),
        aowOpbouwjaren: getNum('aow-years-2'),
        werkjarenBelgie: getNum('be-work-years-2'),
        werkjarenFrankrijk: getNum('fr-work-years-2'),
        bePensioen: getNum('slider-be-pension-2'),
        overheidsPensioen: getNum('slider-pension-public-2'),
        particulierPensioen: getNum('slider-pension-private-2'),
        lijfrente: getNum('slider-lijfrente-2'),
        lijfrenteDuur: getVal('lijfrente-duration-2'),
        lijfrenteStartleeftijd: getVal('lijfrente-start-2'),
        inkomenUitVermogen: getNum('slider-income-wealth-2'),
        loon: getNum('slider-salary-2'),
        winstOnderneming: getNum('slider-business-2'),
        ondernemingstype: getVal('business-type-2'),
      };
    }

    return {
      vergelijking: comparison,
      huishoudtype: household,
      simulatiejaar: getVal('sim-year') || null,
      simulatiemaand: getVal('sim-month') || null,
      stopLoonNaAOW: getChk('stop-salary-after-aow'),
      kinderen: getNum('slider-children'),
      cakBijdrage: getChk('cak-contribution'),
      hulpAanHuis: getNum('home-help'),
      financieelVermogen: getNum('slider-wealth-financial'),
      vastgoedVermogen: getNum('slider-wealth-property'),
      partner1: partner1,
      partner2: partner2,
      resultaten: {
        vergelijkingsland: {
          label: getTxt('compare-country-label'),
          bruto: getTxt('compare-bruto'),
          lasten: getTxt('compare-tax'),
          netto: getTxt('compare-netto'),
          vermogensbelasting: getTxt('wealth-tax-compare'),
        },
        frankrijk: {
          bruto: getTxt('fr-bruto'),
          lasten: getTxt('fr-tax'),
          netto: getTxt('fr-netto'),
          vermogensbelasting: getTxt('wealth-tax-fr'),
        },
        conclusie: {
          verschil: getTxt('conclusion-value'),
          toelichting: getTxt('conclusion-expl'),
        },
        analyse: document.getElementById('calculation-breakdown')?.textContent || '',
      },
      berekend: window._fkComputedState || null,
      fiscaleParameters: window._fkParams || null,
    };
  } catch (e) {
    console.error('getToolState error:', e);
    return null;
  }
};

// === DOSSIER FRANKIJK INTEGRATIE ===
document.getElementById('save-dossier-btn')?.addEventListener('click', function() {
    // Use the AI widget's export if available (includes AI conversation)
    if (window.ccExpertWidget && typeof window.ccExpertWidget.getExportText === 'function') {
        var conv = window.ccExpertWidget.getConversation();
        var hasAI = conv && conv.length > 0;
        var summary = window.ccExpertWidget.getExportText();
        var state = typeof window.getToolState === 'function' ? window.getToolState() : null;
        var verschil = state?.resultaten?.conclusie?.verschil || '?';
        var land = state?.resultaten?.vergelijkingsland?.label || 'NL';
        var hh = state?.huishoudtype || '';
        var title = 'Financieel Kompas: ' + hh + ' | ' + land + ' vs FR | ' + verschil;
        if (hasAI) title += ' (incl. AI-advies)';

        var data = { type: 'saveToDossier', title: title, summary: summary, source: 'financieel-kompas-ai' };

        if (window.parent !== window) {
            window.parent.postMessage(data, '*');
            var btn = document.getElementById('save-dossier-btn');
            if (btn) { var orig = btn.textContent; btn.textContent = 'Opgeslagen!'; btn.style.background = '#28a745'; setTimeout(function() { btn.textContent = orig; btn.style.background = ''; }, 2000); }
        } else {
            // Standalone: copy to clipboard
            if (navigator.clipboard) { navigator.clipboard.writeText(summary); } else {
                var ta = document.createElement('textarea'); ta.value = summary; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
            }
            var btn = document.getElementById('save-dossier-btn');
            if (btn) { var orig = btn.textContent; btn.textContent = 'Gekopieerd naar klembord!'; btn.style.background = '#28a745'; setTimeout(function() { btn.textContent = orig; btn.style.background = ''; }, 2000); }
        }
        return;
    }

    // Fallback: old behavior without AI
    var compareCountry = document.getElementById('compare-country-label')?.textContent || 'Nederland';
    var compareBruto = document.getElementById('compare-bruto')?.textContent || '€ 0';
    var compareTax = document.getElementById('compare-tax')?.textContent || '€ 0';
    var compareNetto = document.getElementById('compare-netto')?.textContent || '€ 0';
    var compareWealth = document.getElementById('wealth-tax-compare')?.textContent || '€ 0';
    var frBruto = document.getElementById('fr-bruto')?.textContent || '€ 0';
    var frTax = document.getElementById('fr-tax')?.textContent || '€ 0';
    var frNetto = document.getElementById('fr-netto')?.textContent || '€ 0';
    var frWealth = document.getElementById('wealth-tax-fr')?.textContent || '€ 0';
    var conclusionValue = document.getElementById('conclusion-value')?.textContent || '€ 0';
    var isPositive = document.getElementById('conclusion-value')?.classList.contains('positive');
    var conclusionText = isPositive ? 'Voordeel Frankrijk' : 'Voordeel ' + compareCountry;
    var isSingle = document.getElementById('btn-single')?.classList.contains('active');
    var household = isSingle ? 'Alleenstaand' : 'Partners';
    var today = new Date().toLocaleDateString('nl-NL');
    var breakdown = document.getElementById('calculation-breakdown')?.textContent || '';

    var summary = '\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n' +
        'FINANCIEEL KOMPAS \u2014 VERGELIJKING\n' +
        'Datum: ' + today + '\n' +
        '\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n' +
        (breakdown ? 'ANALYSE\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n' + breakdown + '\n\n' : '') +
        'SAMENVATTING\n' +
        compareCountry + ': Bruto ' + compareBruto + ' | Netto ' + compareNetto + '\n' +
        'Frankrijk: Bruto ' + frBruto + ' | Netto ' + frNetto + '\n' +
        'Verschil: ' + conclusionValue + ' (' + conclusionText + ')\n\n' +
        'Indicatieve berekening. Raadpleeg een adviseur.\n' +
        'Bron: Financieel Kompas \u2014 Infofrankrijk.com';

    var data = {
        type: 'saveToDossier',
        title: 'Financieel Kompas: ' + household + ' | ' + compareCountry + ' vs Frankrijk | ' + conclusionValue,
        summary: summary,
        source: 'financieel-kompas'
    };

    if (window.parent !== window) {
        window.parent.postMessage(data, '*');
    } else {
        alert('Deze functie werkt alleen binnen Infofrankrijk.com');
    }
});

