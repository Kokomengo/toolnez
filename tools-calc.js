/* tools-calc.js - calculators and utilities */
(() => {
const T = ToolNez;
const { $, $$, esc, icon, num, clamp, toast, download, copy, results } = T;

const bind = (root, ids, fn) => { ids.forEach(i => { const el = $('#' + i, root); el.addEventListener('input', fn); el.addEventListener('change', fn); }); fn(); };
const money = n => '$' + num(n);

/* ==========================================================  CALCULATORS  ========================================================== */

T.tool({
  id: 'percentage', cat: 'calc', icon: 'percent',
  name: 'Percentages', tagline: 'The four percentage sums everybody ends up searching for.',
  keywords: 'percentage discount increase tax vat change calculate %',
  ui: () => `
    <h3>What is X% of a number</h3>
    <div class="grid3"><input type="number" id="a1" placeholder="% (e.g. 21)"><input type="number" id="b1" placeholder="of (e.g. 450)"></div>
    <div class="readout" id="r1" style="margin-top:12px">&mdash;</div>

    <h3 style="margin-top:26px">X is what percent of Y</h3>
    <div class="grid3"><input type="number" id="a2" placeholder="this part"><input type="number" id="b2" placeholder="of this total"></div>
    <div class="readout" id="r2" style="margin-top:12px">&mdash;</div>

    <h3 style="margin-top:26px">How much it went up or down</h3>
    <div class="grid3"><input type="number" id="a3" placeholder="before"><input type="number" id="b3" placeholder="after"></div>
    <div class="readout" id="r3" style="margin-top:12px">&mdash;</div>

    <h3 style="margin-top:26px">Price after a discount</h3>
    <div class="grid3"><input type="number" id="a4" placeholder="price"><input type="number" id="b4" placeholder="% off"></div>
    <div class="readout" id="r4" style="margin-top:12px">&mdash;</div>`,
  init(root) {
    bind(root, ['a1', 'b1'], () => {
      const a = +$('#a1', root).value, b = +$('#b1', root).value;
      $('#r1', root).innerHTML = a && b ? `${num(a * b / 100)}<small>${num(a, 0)}% of ${num(b, 0)}</small>` : '&mdash;';
    });
    bind(root, ['a2', 'b2'], () => {
      const a = +$('#a2', root).value, b = +$('#b2', root).value;
      $('#r2', root).innerHTML = b ? `${num(a / b * 100)}%<small>${num(a, 0)} out of ${num(b, 0)}</small>` : '&mdash;';
    });
    bind(root, ['a3', 'b3'], () => {
      const a = +$('#a3', root).value, b = +$('#b3', root).value;
      if (!a) return $('#r3', root).textContent = '\u2014';
      const v = (b - a) / a * 100;
      $('#r3', root).innerHTML = `${v >= 0 ? '+' : ''}${num(v)}%<small>${v >= 0 ? 'up' : 'down'} by ${num(Math.abs(b - a))} in absolute terms</small>`;
    });
    bind(root, ['a4', 'b4'], () => {
      const a = +$('#a4', root).value, b = +$('#b4', root).value;
      $('#r4', root).innerHTML = a ? `${num(a * (1 - b / 100))}<small>you save ${num(a * b / 100)}</small>` : '&mdash;';
    });
  },
  info: `<h2>The classic mistake</h2>
    <p>A 20% rise followed by a 20% cut does not take you back to the start: 100 goes up to 120 and then down to 96.
    The second percentage works on a different base. To undo a 20% rise you have to take off 16.67%.</p>
    <p>Sales tax behaves the same way: if a price already includes 21%, you do not get the net figure by subtracting
    21%, you get it by dividing by 1.21.</p>`
});

T.tool({
  id: 'bmi', cat: 'calc', icon: 'scale',
  name: 'Body mass index', tagline: 'BMI, the healthy range, and what it actually tells you.',
  keywords: 'bmi weight height obesity health body mass index',
  ui: () => `
    <div class="grid2">
      <div><label class="lb" for="p">Weight (kg)</label><input type="number" id="p" value="70" step="0.1"></div>
      <div><label class="lb" for="a">Height (cm)</label><input type="number" id="a" value="170"></div>
    </div>
    <div class="readout" id="out" style="margin-top:16px">&mdash;</div>
    <div class="bar-meter"><i id="bar"></i></div>
    <div class="result" id="detail"></div>
    <table class="t"><tr><th>BMI</th><th>Category (WHO)</th></tr>
      <tr><td class="num">&lt; 18.5</td><td>Underweight</td></tr>
      <tr><td class="num">18.5 &ndash; 24.9</td><td>Healthy weight</td></tr>
      <tr><td class="num">25 &ndash; 29.9</td><td>Overweight</td></tr>
      <tr><td class="num">30 &ndash; 34.9</td><td>Obesity class I</td></tr>
      <tr><td class="num">&ge; 35</td><td>Obesity class II or III</td></tr></table>`,
  init(root) {
    bind(root, ['p', 'a'], () => {
      const p = +$('#p', root).value, h = +$('#a', root).value / 100;
      if (!p || !h) return;
      const i = p / (h * h);
      const cat = i < 18.5 ? 'Underweight' : i < 25 ? 'Healthy weight' : i < 30 ? 'Overweight' : i < 35 ? 'Obesity class I' : 'Obesity class II or III';
      $('#out', root).innerHTML = `${num(i, 1)}<small>${cat}</small>`;
      const bar = $('#bar', root);
      bar.style.width = clamp(i / 40 * 100, 0, 100) + '%';
      bar.className = i >= 18.5 && i < 25 ? 'ok' : i >= 30 ? 'bad' : '';
      $('#detail', root).textContent =
        `Healthy weight for your height: ${num(18.5 * h * h, 1)} to ${num(24.9 * h * h, 1)} kg
Against the upper limit: ${p > 24.9 * h * h ? num(p - 24.9 * h * h, 1) + ' kg over' : 'inside the range'}`;
    });
  },
  info: `<h2>What it is good for, and what it is not</h2>
    <p>BMI is a population indicator, not a diagnosis. It divides weight by height squared and cannot tell muscle from
    fat, so athletes frequently land in "overweight", while an older person with little muscle can read "healthy"
    while carrying too much fat.</p>
    <p>Waist measurement is the usual companion check: above 94 cm for men and 80 cm for women there is cardiovascular
    risk even when BMI looks fine.</p>`
});

T.tool({
  id: 'loan-payment', cat: 'calc', icon: 'bank',
  name: 'Loan payment', tagline: 'Mortgage or personal loan, with the full amortisation table.',
  keywords: 'loan mortgage monthly payment interest amortisation credit',
  ui: () => `
    <div class="grid3">
      <div><label class="lb" for="c">Amount</label><input type="number" id="c" value="150000"></div>
      <div><label class="lb" for="i">Annual rate (%)</label><input type="number" id="i" value="3.2" step="0.01"></div>
      <div><label class="lb" for="y">Term (years)</label><input type="number" id="y" value="25"></div>
    </div>
    <div class="readout" id="out" style="margin-top:16px">&mdash;</div>
    <div class="result" id="detail"></div>
    <div class="actions"><button class="btn sec" id="tbl">Show the amortisation table</button>
      <button class="btn sec" id="csv">${icon('download')}Download as CSV</button></div>
    <div id="tblwrap"></div>`,
  init(root) {
    let rows = [];
    const calc = () => {
      const C = +$('#c', root).value, r = +$('#i', root).value / 100 / 12, n = +$('#y', root).value * 12;
      if (!C || !n) return;
      const cuota = r ? C * r / (1 - Math.pow(1 + r, -n)) : C / n;
      $('#out', root).innerHTML = `${money(cuota)}<small>per month for ${n} payments</small>`;
      $('#detail', root).textContent =
        `Total you will repay: ${money(cuota * n)}
Interest: ${money(cuota * n - C)}  (${num((cuota * n - C) / C * 100, 1)}% of the principal)
First payment: ${money(C * r)} interest and ${money(cuota - C * r)} principal`;
      let saldo = C; rows = [];
      for (let k = 1; k <= n; k++) {
        const int = saldo * r, amort = cuota - int;
        saldo = Math.max(0, saldo - amort);
        rows.push([k, int, amort, saldo]);
      }
    };
    bind(root, ['c', 'i', 'y'], calc);
    $('#tbl', root).onclick = () => {
      $('#tblwrap', root).innerHTML = `<div class="scrolly"><table class="t">
        <thead><tr><th>No.</th><th>Interest</th><th>Principal</th><th>Balance</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td class="num">${r[0]}</td><td class="num">${num(r[1])}</td><td class="num">${num(r[2])}</td><td class="num">${num(r[3])}</td></tr>`).join('')}
        </tbody></table></div>`;
    };
    $('#csv', root).onclick = () => {
      const csv = 'payment,interest,principal,balance\n' + rows.map(r => r.map(v => num(v)).join(',')).join('\n');
      download(new Blob([csv], { type: 'text/csv' }), 'amortisation.csv');
    };
  },
  info: `<h2>How to read the result</h2>
    <p>On a standard amortising loan the payment is fixed but its split is not: early on almost all of it is interest,
    and only later does real principal come off. That is why overpaying in the first years saves far more than
    overpaying near the end.</p>
    <p>The figure leaves out insurance, arrangement fees and closing costs, which on a mortgage can add up to several
    thousand.</p>`,
  faq: [['Does it work for variable rates?', 'Only as a snapshot: enter the current rate and you get today\'s payment. If the index moves, run it again with the new figure.']]
});

T.tool({
  id: 'compound-interest', cat: 'calc', icon: 'trend',
  name: 'Compound interest', tagline: 'What happens if you put the same amount in every month for years.',
  keywords: 'compound interest savings investment return index fund growth',
  ui: () => `
    <div class="grid2">
      <div><label class="lb" for="p">Starting amount</label><input type="number" id="p" value="2000"></div>
      <div><label class="lb" for="m">Monthly contribution</label><input type="number" id="m" value="150"></div>
      <div><label class="lb" for="r">Annual return (%)</label><input type="number" id="r" value="6" step="0.1"></div>
      <div><label class="lb" for="y">Years</label><input type="number" id="y" value="15"></div>
    </div>
    <div class="readout" id="out" style="margin-top:16px">—</div>
    <div class="result" id="detail"></div>
    <div class="scrolly" id="tbl"></div>`,
  init(root) {
    bind(root, ['p', 'm', 'r', 'y'], () => {
      const P = +$('#p', root).value, m = +$('#m', root).value, r = +$('#r', root).value / 100 / 12, y = +$('#y', root).value;
      let bal = P, puesto = P;
      const rows = [];
      for (let k = 1; k <= y * 12; k++) {
        bal = bal * (1 + r) + m; puesto += m;
        if (k % 12 === 0) rows.push([k / 12, puesto, bal, bal - puesto]);
      }
      $('#out', root).innerHTML = `${money(bal)}<small>of which ${money(bal - puesto)} is growth</small>`;
      $('#detail', root).textContent = `You will have paid in ${money(puesto)} out of your own pocket over ${y} years.
Growth adds ${num((bal - puesto) / Math.max(1, puesto) * 100, 1)}% on top of what you paid in.`;
      $('#tbl', root).innerHTML = `<table class="t"><thead><tr><th>Year</th><th>Paid in</th><th>Total</th><th>Growth</th></tr></thead><tbody>
        ${rows.map(x => `<tr><td class="num">${x[0]}</td><td class="num">${num(x[1], 0)}</td><td class="num"><b>${num(x[2], 0)}</b></td><td class="num">${num(x[3], 0)}</td></tr>`).join('')}
        </tbody></table>`;
    });
  },
  info: `<h2>The detail almost everyone forgets</h2>
    <p>These figures are nominal: they ignore inflation and capital gains tax. If you expect 6% a year with
    inflation at 2%, your purchasing power grows by roughly 4%. To see the number in today's money, subtract
    inflation from the return before running the calculation.</p>`
});

T.tool({
  id: 'age-calculator', cat: 'calc', icon: 'cake',
  name: 'Age calculator', tagline: 'Years, months, days lived and how long until the next birthday.',
  keywords: 'age date of birth days birthday years old',
  ui: () => `
    <div class="grid2">
      <div><label class="lb" for="n">Date of birth</label><input type="date" id="n"></div>
      <div><label class="lb" for="h">Work it out as of</label><input type="date" id="h"></div>
    </div>
    <div class="readout" id="out" style="margin-top:16px">—</div>
    <div class="result" id="detail"></div>`,
  init(root) {
    const hoy = new Date().toISOString().slice(0, 10);
    $('#h', root).value = hoy;
    $('#n', root).value = '1990-06-15';
    bind(root, ['n', 'h'], () => {
      const a = new Date($('#n', root).value), b = new Date($('#h', root).value);
      if (isNaN(a) || isNaN(b) || b < a) return $('#out', root).textContent = '—';
      let y = b.getFullYear() - a.getFullYear(), m = b.getMonth() - a.getMonth(), d = b.getDate() - a.getDate();
      if (d < 0) { m--; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
      if (m < 0) { y--; m += 12; }
      const dias = Math.floor((b - a) / 86400000);
      const prox = new Date(b.getFullYear(), a.getMonth(), a.getDate());
      if (prox < b) prox.setFullYear(prox.getFullYear() + 1);
      const faltan = Math.ceil((prox - b) / 86400000);
      $('#out', root).innerHTML = `${y} years, ${m} months and ${d} days<small>${faltan === 0 ? 'Today is the birthday!' : 'Next birthday in ' + faltan + ' days'}</small>`;
      $('#detail', root).textContent =
        `Days lived: ${num(dias, 0)}
Weeks: ${num(dias / 7, 0)}
Hours: ${num(dias * 24, 0)}
Day of the week you were born: ${a.toLocaleDateString('en-US', { weekday: 'long' })}`;
    });
  }
});

T.tool({
  id: 'rule-of-three', cat: 'calc', icon: 'divide',
  name: 'Rule of three', tagline: 'Direct or inverse, without having to remember which is which.',
  keywords: 'rule of three proportion direct inverse solve for x cross multiply',
  ui: () => `
    <p class="dim">If <b>A</b> corresponds to <b>B</b>, what does <b>C</b> correspond to?</p>
    <div class="grid3">
      <div><label class="lb" for="a">A</label><input type="number" id="a" value="100"></div>
      <div><label class="lb" for="b">B</label><input type="number" id="b" value="45"></div>
      <div><label class="lb" for="c">C</label><input type="number" id="c" value="250"></div>
    </div>
    <div class="actions"><div class="segment" id="mode"><button data-m="d" class="on">Direct</button><button data-m="i">Inverse</button></div></div>
    <div class="readout" id="out">—</div>
    <div class="note">${icon('info')}<span><b>Direct:</b> when one goes up so does the other (weight and price).
      <b>Inverse:</b> when one goes up the other comes down (workers and days on site).</span></div>`,
  init(root) {
    let mode = 'd';
    const calc = () => {
      const a = +$('#a', root).value, b = +$('#b', root).value, c = +$('#c', root).value;
      if (!a || (mode === 'i' && !c)) return $('#out', root).textContent = '—';
      const x = mode === 'd' ? b * c / a : a * b / c;
      $('#out', root).innerHTML = `${num(x, 4).replace(/[.,]?0+$/, '')}<small>${mode === 'd' ? 'direct proportion' : 'inverse proportion'}</small>`;
    };
    bind(root, ['a', 'b', 'c'], calc);
    $$('#mode button', root).forEach(btn => btn.onclick = () => {
      $$('#mode button', root).forEach(x => x.classList.remove('on'));
      btn.classList.add('on'); mode = btn.dataset.m; calc();
    });
  }
});

const UNITS = {
  Length: { millimetre: .001, centimetre: .01, metre: 1, kilometre: 1000, inch: .0254, foot: .3048, yard: .9144, mile: 1609.344 },
  Weight: { milligram: 1e-6, gram: .001, kilogram: 1, tonne: 1000, ounce: .0283495, pound: .453592 },
  Volume: { millilitre: .001, litre: 1, 'cubic metre': 1000, 'gallon (US)': 3.78541, cup: .24 },
  Area: { 'square centimetre': .0001, 'square metre': 1, 'square kilometre': 1e6, hectare: 10000, 'square foot': .092903, acre: 4046.86 },
  Data: { bit: .125, byte: 1, kilobyte: 1024, megabyte: 1048576, gigabyte: 1073741824, terabyte: 1.0995116e12 },
  Time: { second: 1, minute: 60, hour: 3600, day: 86400, week: 604800, month: 2629800, year: 31557600 },
  Speed: { 'm/s': 1, 'km/h': .277778, 'mph': .44704, knot: .514444 }
};
T.tool({
  id: 'unit-converter', cat: 'calc', icon: 'ruler',
  name: 'Unit converter', tagline: 'Metres, pounds, degrees, gigabytes and whatever else comes up.',
  keywords: 'convert units metres feet kilos pounds celsius fahrenheit gb',
  ui: () => `
    <div><label class="lb" for="cat">Kind of measurement</label>
      <select id="cat">${Object.keys(UNITS).map(k => `<option>${k}</option>`).join('')}<option>Temperature</option></select></div>
    <div class="grid2" style="margin-top:14px">
      <div><label class="lb" for="v">Value</label><input type="number" id="v" value="1">
        <select id="from" style="margin-top:8px"></select></div>
      <div><label class="lb" for="res">Equals</label><input type="text" id="res" readonly class="mono">
        <select id="to" style="margin-top:8px"></select></div>
    </div>
    <div class="actions"><button class="btn sec" id="swap">Swap</button>
      <button class="btn sec" id="cp">${icon('copy')}Copy</button></div>`,
  init(root) {
    const TEMP = ['Celsius', 'Fahrenheit', 'Kelvin'];
    const cat = $('#cat', root), from = $('#from', root), to = $('#to', root), v = $('#v', root), res = $('#res', root);
    const fill = () => {
      const keys = cat.value === 'Temperature' ? TEMP : Object.keys(UNITS[cat.value]);
      from.innerHTML = to.innerHTML = keys.map(k => `<option>${k}</option>`).join('');
      to.selectedIndex = Math.min(1, keys.length - 1);
      conv();
    };
    const conv = () => {
      const x = +v.value;
      let out;
      if (cat.value === 'Temperature') {
        const k = from.value === 'Celsius' ? x + 273.15 : from.value === 'Fahrenheit' ? (x - 32) * 5 / 9 + 273.15 : x;
        out = to.value === 'Celsius' ? k - 273.15 : to.value === 'Fahrenheit' ? (k - 273.15) * 9 / 5 + 32 : k;
      } else out = x * UNITS[cat.value][from.value] / UNITS[cat.value][to.value];
      res.value = (Math.abs(out) && (Math.abs(out) < 1e-4 || Math.abs(out) > 1e9))
        ? out.toExponential(4) : num(out, 6).replace(/[.,]?0+$/, '');
    };
    cat.onchange = fill;
    [v, from, to].forEach(e => { e.oninput = conv; e.onchange = conv; });
    $('#swap', root).onclick = () => { const i = from.selectedIndex; from.selectedIndex = to.selectedIndex; to.selectedIndex = i; conv(); };
    $('#cp', root).onclick = () => copy(res.value, 'Result');
    fill();
  }
});

T.tool({
  id: 'split-the-bill', cat: 'calc', icon: 'plate',
  name: 'Split the bill', tagline: 'Tip included, and what each person owes.',
  keywords: 'tip split bill restaurant per person share check',
  ui: () => `
    <div class="grid3">
      <div><label class="lb" for="c">Bill total</label><input type="number" id="c" value="86.40" step="0.01"></div>
      <div><label class="lb" for="n">People</label><input type="number" id="n" value="4" min="1"></div>
      <div class="field"><div class="slider-head"><label class="lb">Tip</label><b id="tv">10%</b></div>
        <input type="range" id="t" min="0" max="30" value="10"></div>
    </div>
    <div class="readout" id="out" style="margin-top:16px">—</div>
    <div class="result" id="detail"></div>`,
  init(root) {
    bind(root, ['c', 'n', 't'], () => {
      const c = +$('#c', root).value, n = Math.max(1, +$('#n', root).value), t = +$('#t', root).value;
      $('#tv', root).textContent = t + '%';
      const prop = c * t / 100, total = c + prop;
      $('#out', root).innerHTML = `${money(total / n)}<small>per person, tip included</small>`;
      $('#detail', root).textContent = `Tip: ${money(prop)}
Total with tip: ${money(total)}
Rounding up: ${money(Math.ceil(total / n))} each (${money(Math.ceil(total / n) * n - total)} extra)`;
    });
  }
});

/* ==========================================================  UTILITIES  ========================================================== */

const entropyBits = (len, sets) => len * Math.log2(sets || 1);
function crackTime(bits) {
  const s = Math.pow(2, bits - 1) / 1e11;         // ~100 billion guesses per second
  if (s > 3.15e16) return 'longer than the age of the universe';
  const u = [[3.15e10, 'millennia'], [3.15e7, 'years'], [2.6e6, 'months'], [86400, 'days'], [3600, 'hours'], [60, 'minutes']];
  for (const [d, n] of u) if (s >= d) return num(s / d, 0) + ' ' + n;
  return 'less than a minute';
}
T.tool({
  id: 'password-generator', cat: 'util', icon: 'key',
  name: 'Password generator', tagline: 'Solid passwords and an honest meter of how long they hold up.',
  keywords: 'password secure generate random strong passphrase',
  ui: () => `
    <div class="readout mono" id="pw" style="font-size:1.35rem">·········</div>
    <div class="bar-meter"><i id="bar"></i></div>
    <p class="tiny dim" id="info" style="margin:8px 0 0"></p>
    <div class="actions">
      <button class="btn" id="gen">${icon('key')}Generate another</button>
      <button class="btn sec" id="cp">${icon('copy')}Copy</button>
      <button class="btn sec" id="ten">Ten at once</button>
    </div>
    <div class="field" style="margin-top:18px"><div class="slider-head">
      <label class="lb" for="len">Length</label><b id="lenv">16</b></div>
      <input type="range" id="len" min="6" max="48" value="16"></div>
    <div class="actions">
      <label class="opt"><input type="checkbox" id="up" checked> A-Z</label>
      <label class="opt"><input type="checkbox" id="low" checked> a-z</label>
      <label class="opt"><input type="checkbox" id="dig" checked> 0-9</label>
      <label class="opt"><input type="checkbox" id="sym" checked> !@#$%</label>
      <label class="opt"><input type="checkbox" id="amb"> No confusing characters (l, 1, O, 0)</label>
    </div>
    <div class="result" id="many" hidden></div>
    <div class="box" style="margin-top:18px">
      <h3>What about the one you already use?</h3>
      <input type="text" id="test" placeholder="Type it in to measure its strength">
      <div class="bar-meter"><i id="tbar"></i></div>
      <p class="tiny dim" id="tinfo" style="margin:8px 0 0">—</p>
    </div>`,
  init(root) {
    const opts = () => ({
      up: $('#up', root).checked, low: $('#low', root).checked,
      dig: $('#dig', root).checked, sym: $('#sym', root).checked, amb: $('#amb', root).checked
    });
    const build = (len, o) => {
      let set = '';
      if (o.up) set += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (o.low) set += 'abcdefghijklmnopqrstuvwxyz';
      if (o.dig) set += '0123456789';
      if (o.sym) set += '!@#$%^&*()-_=+[]{};:,.?';
      if (o.amb) set = set.replace(/[lI1O0o]/g, '');
      if (!set) return '';
      const a = new Uint32Array(len);
      crypto.getRandomValues(a);
      return [...a].map(v => set[v % set.length]).join('');
    };
    const sizeOf = o => (o.up ? 26 : 0) + (o.low ? 26 : 0) + (o.dig ? 10 : 0) + (o.sym ? 23 : 0) - (o.amb ? 6 : 0);
    const gen = () => {
      const len = +$('#len', root).value, o = opts();
      $('#lenv', root).textContent = len;
      const pw = build(len, o);
      if (!pw) return toast('Tick at least one character type', true);
      $('#pw', root).textContent = pw;
      const bits = entropyBits(len, sizeOf(o));
      const bar = $('#bar', root);
      bar.style.width = clamp(bits / 128 * 100, 4, 100) + '%';
      bar.className = bits < 50 ? 'bad' : bits < 80 ? '' : 'ok';
      $('#info', root).textContent = `${Math.round(bits)} bits of entropy \u00b7 an attacker with serious hardware would need ${crackTime(bits)}`;
    };
    $('#gen', root).onclick = gen;
    $('#len', root).addEventListener('input', gen);
    $$('input[type=checkbox]', root).forEach(c => c.addEventListener('change', gen));
    $('#cp', root).onclick = () => copy($('#pw', root).textContent, 'Password');
    $('#ten', root).onclick = () => {
      const box = $('#many', root);
      box.hidden = false;
      box.textContent = Array.from({ length: 10 }, () => build(+$('#len', root).value, opts())).join('\n');
    };
    const test = $('#test', root);
    test.addEventListener('input', () => {
      const p = test.value;
      const bar = $('#tbar', root), out = $('#tinfo', root);
      if (!p) { bar.style.width = '0'; out.textContent = '—'; return; }
      const o = { up: /[A-Z]/.test(p), low: /[a-z]/.test(p), dig: /\d/.test(p), sym: /[^A-Za-z0-9]/.test(p) };
      let bits = entropyBits(p.length, sizeOf({ ...o, amb: false }));
      const comunes = ['123456', 'password', 'qwerty', 'admin', '111111', 'iloveyou', 'letmein', '12345678', 'princess', 'dragon', 'football'];
      const floja = comunes.some(c => p.toLowerCase().includes(c));
      if (floja) bits = Math.min(bits, 18);
      if (/^(.)\1+$/.test(p)) bits = 8;
      bar.style.width = clamp(bits / 128 * 100, 4, 100) + '%';
      bar.className = bits < 50 ? 'bad' : bits < 80 ? '' : 'ok';
      out.textContent = `${Math.round(bits)} bits \u00b7 ${bits < 40 ? 'very weak' : bits < 60 ? 'passable' : bits < 90 ? 'good' : 'excellent'}`
        + (floja ? ' \u00b7 it contains a pattern found in every cracking dictionary' : '')
        + ` \u00b7 it would fall in ${crackTime(bits)}`;
    });
    gen();
  },
  info: `<h2>What the bar measures</h2>
    <p>Entropy in bits, which is the number of guesses somebody would need working at random. Every extra bit
    doubles the attacker's work. Below 50 bits a modern graphics card is done in hours; past 80 it becomes
    impractical with today's technology.</p>
    <h2>What matters most</h2>
    <ul><li>Length beats exotic symbols: <code>correct-horse-battery-staple</code> holds up better than <code>P@ssw0rd!</code>.</li>
    <li>A different password for every site. Reuse one and somebody else's breach takes all your accounts.</li>
    <li>Two-factor authentication wherever it exists; it turns a leaked password into a scare instead of a disaster.</li></ul>
    <p>Passwords are produced with <code>crypto.getRandomValues()</code>, not <code>Math.random()</code>.</p>`
});

T.tool({
  id: 'hash', cat: 'util', icon: 'hash',
  name: 'Hash calculator', tagline: 'SHA-256 and friends, from a piece of text or a file.',
  keywords: 'hash sha256 sha1 sha512 checksum verify integrity',
  ui: () => `
    <div class="actions" style="margin:0 0 12px"><div class="segment" id="mode">
      <button data-m="text" class="on">From text</button><button data-m="file">From a file</button></div>
      <select id="alg" style="width:auto;margin-left:auto"><option>SHA-256</option><option>SHA-1</option><option>SHA-384</option><option>SHA-512</option></select>
    </div>
    <textarea id="src" placeholder="Type or paste the text\u2026" style="min-height:120px"></textarea>
    <div id="fbox" hidden>${ToolNez.dropzone('Drop a file here', 'Any file type works', '*/*', false)}</div>
    <div class="result mono" id="out">&mdash;</div>
    <div class="actions"><button class="btn sec" id="cp">${icon('copy')}Copy</button>
      <input type="text" id="cmp" placeholder="Paste the expected hash here to compare" style="max-width:420px">
      <span class="tiny" id="verdict"></span></div>`,
  init(root) {
    const src = $('#src', root), out = $('#out', root);
    const digest = async data => {
      const h = await crypto.subtle.digest($('#alg', root).value, data);
      return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
    };
    const fromText = async () => { out.textContent = src.value ? await digest(new TextEncoder().encode(src.value)) : '\u2014'; check(); };
    const check = () => {
      const want = $('#cmp', root).value.trim().toLowerCase(), got = out.textContent;
      const v = $('#verdict', root);
      if (!want) { v.textContent = ''; return; }
      const ok = want === got;
      v.textContent = ok ? '\u2713 they match' : '\u2715 they do not match';
      v.style.color = ok ? 'var(--ok)' : 'var(--bad)';
    };
    src.addEventListener('input', fromText);
    $('#alg', root).addEventListener('change', fromText);
    $('#cmp', root).addEventListener('input', check);
    $('#cp', root).onclick = () => copy(out.textContent, 'Hash');
    ToolNez.onFiles(root, async fs => {
      out.textContent = 'calculating\u2026';
      out.textContent = await digest(await fs[0].arrayBuffer());
      toast('Hashed ' + fs[0].name); check();
    });
    $$('#mode button', root).forEach(b => b.onclick = () => {
      $$('#mode button', root).forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      src.hidden = b.dataset.m === 'file';
      $('#fbox', root).hidden = b.dataset.m === 'text';
    });
  },
  info: `<h2>What a hash is for</h2>
    <p>To check that a file is exactly the one you expected. Plenty of downloads publish their SHA-256; if the one
    you get here matches, the file has not been corrupted or tampered with along the way.</p>
    <p>SHA-1 still turns up in older systems, but it is broken for security purposes: use it only to verify legacy
    downloads, never to sign anything.</p>`
});

T.tool({
  id: 'base64', cat: 'util', icon: 'code',
  name: 'Base64', tagline: 'Encode and decode text or small files.',
  keywords: 'base64 encode decode data uri image',
  ui: () => `
    <div class="two">
      <div><label class="lb" for="a">Plain text</label><textarea id="a"></textarea></div>
      <div><label class="lb" for="b">Base64</label><textarea id="b"></textarea></div>
    </div>
    <div class="actions">
      <button class="btn" id="enc">Encode \u2192</button>
      <button class="btn" id="dec">\u2190 Decode</button>
      <button class="btn sec" id="clr">Clear</button>
    </div>
    <div class="box" style="margin-top:18px">
      <h3>Image to data URI</h3>
      <p class="tiny dim">Handy for embedding a small icon straight into your CSS without another request.</p>
      ${ToolNez.dropzone('Drop an image here', 'Under 100 KB, or the CSS becomes unreadable', 'image/*', false)}
      <div class="result" id="uri" style="max-height:150px;overflow:auto">&mdash;</div>
      <div class="actions"><button class="btn sec" id="cpuri">${icon('copy')}Copy as CSS</button></div>
    </div>`,
  init(root) {
    const a = $('#a', root), b = $('#b', root);
    $('#enc', root).onclick = () => { try { b.value = btoa(unescape(encodeURIComponent(a.value))); } catch { toast('Could not encode that', true); } };
    $('#dec', root).onclick = () => { try { a.value = decodeURIComponent(escape(atob(b.value.trim()))); } catch { toast('That is not valid Base64', true); } };
    $('#clr', root).onclick = () => { a.value = b.value = ''; };
    let uri = '';
    ToolNez.onFiles(root, fs => {
      const r = new FileReader();
      r.onload = () => {
        uri = r.result;
        $('#uri', root).textContent = uri.slice(0, 600) + (uri.length > 600 ? `\n\u2026 (${num(uri.length, 0)} characters)` : '');
      };
      r.readAsDataURL(fs[0]);
    });
    $('#cpuri', root).onclick = () => uri ? copy(`background-image: url("${uri}");`, 'CSS') : toast('Drop an image first', true);
  }
});

T.tool({
  id: 'json-formatter', cat: 'util', icon: 'braces',
  name: 'JSON formatter', tagline: 'Tidy it, minify it, and find where the error is.',
  keywords: 'json format validate minify indent error beautify',
  ui: () => `
    <textarea id="src" placeholder='{"paste":"your JSON here"}' style="min-height:260px" spellcheck="false"></textarea>
    <div class="actions">
      <button class="btn" id="fmt">Tidy up</button>
      <button class="btn sec" id="min">Minify</button>
      <button class="btn sec" id="sort">Sort keys A-Z</button>
      <button class="btn sec" id="cp">${icon('copy')}Copy</button>
    </div>
    <div class="result" id="out">Paste something and press Tidy up.</div>`,
  init(root) {
    const src = $('#src', root), out = $('#out', root);
    const parse = () => JSON.parse(src.value);
    const info = o => {
      const count = (x) => typeof x !== 'object' || x === null ? 1 : Object.values(x).reduce((a, v) => a + count(v), 1);
      out.textContent = `Valid JSON \u00b7 root: ${Array.isArray(o) ? 'array of ' + o.length : 'object with ' + Object.keys(o).length + ' keys'} \u00b7 ${count(o)} nodes`;
      out.style.color = 'var(--ok)';
    };
    const fail = e => {
      const m = e.message.match(/position (\d+)/);
      out.style.color = 'var(--bad)';
      if (m) {
        const pos = +m[1], line = src.value.slice(0, pos).split('\n').length;
        out.textContent = `Error on line ${line}: ${e.message}`;
        src.focus(); src.setSelectionRange(pos, pos + 1);
      } else out.textContent = e.message;
    };
    const run = fn => { try { const o = parse(); src.value = fn(o); info(o); } catch (e) { fail(e); } };
    const deepSort = o => Array.isArray(o) ? o.map(deepSort)
      : (o && typeof o === 'object') ? Object.fromEntries(Object.keys(o).sort().map(k => [k, deepSort(o[k])])) : o;
    $('#fmt', root).onclick = () => run(o => JSON.stringify(o, null, 2));
    $('#min', root).onclick = () => run(o => JSON.stringify(o));
    $('#sort', root).onclick = () => run(o => JSON.stringify(deepSort(o), null, 2));
    $('#cp', root).onclick = () => copy(src.value, 'JSON');
  }
});

T.tool({
  id: 'slug', cat: 'util', icon: 'link',
  name: 'Slug generator', tagline: 'Turn a headline into a clean URL.',
  keywords: 'slug url friendly seo permalink title',
  ui: () => `
    <label class="lb" for="src">Title</label>
    <input type="text" id="src" value="How to make a Spanish omelette (my grandmother's recipe)">
    <div class="actions">
      <label class="opt"><input type="checkbox" id="low" checked> All lower case</label>
      <label class="opt"><input type="checkbox" id="stop"> Drop articles and prepositions</label>
      <div class="segment" id="sep"><button data-s="-" class="on">Hyphens</button><button data-s="_">Underscores</button></div>
    </div>
    <div class="readout mono" id="out" style="font-size:1.05rem">&mdash;</div>
    <div class="actions"><button class="btn" id="cp">${icon('copy')}Copy slug</button>
      <span class="tiny dim" id="len"></span></div>`,
  init(root) {
    let sep = '-';
    const stops = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'is', 'it', 'my', 'your']);
    const up = () => {
      let s = $('#src', root).value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, ' ').trim().split(/[\s_-]+/);
      if ($('#stop', root).checked) s = s.filter(w => !stops.has(w.toLowerCase()));
      let out = s.join(sep);
      if ($('#low', root).checked) out = out.toLowerCase();
      $('#out', root).textContent = out || '\u2014';
      $('#len', root).textContent = `${out.length} characters${out.length > 60 ? ' \u00b7 too long for a comfortable URL' : ''}`;
    };
    ['src', 'low', 'stop'].forEach(id => { $('#' + id, root).oninput = up; $('#' + id, root).onchange = up; });
    $$('#sep button', root).forEach(b => b.onclick = () => {
      $$('#sep button', root).forEach(x => x.classList.remove('on'));
      b.classList.add('on'); sep = b.dataset.s; up();
    });
    $('#cp', root).onclick = () => copy($('#out', root).textContent, 'Slug');
    up();
  }
});

})();
