// namdongwon.com — 움직임 C(큰 장면 + 결) · 사진 넘기기 · 문의 폼
// 장면: 문(첫 방문 한 번) · 탁본 · 기록 / 결: 이름을 자모로 쳐 나감 · 칸 요소가 차례로 떠오름 · 맨 위 띠 — 칸 사이 셔터는 10/25 뺌
// '동작 줄이기'를 켠 사람과 IntersectionObserver가 없는 브라우저는 움직임 없이 다 보이게 둔다
(() => {
  const H = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches || H.getAttribute("data-motion") === "reduce";  // 판권면 '움직임 줄이기' 스위치(11/1 밤)도 같은 값
  const motion = !reduce && "IntersectionObserver" in window;
  const revisit = H.classList.contains("seen");  // 다시 온 방문(head 스크립트 — 이 기기에 문 장면을 본 표시가 있음): 첫 화면 이름 · 책 · 창살 빛을 처음부터 머문 자리로(10/27 숨 재기 3)
  const home = document.querySelector("#home");
  // 영어판(10/24): 안내 문구는 쪽에 실린 ui 글(content/ui.json → 빌드)에서 — 없으면 한국어 그대로.
  // 그림 자리는 이 스크립트가 있는 assets 폴더 기준(영어판은 한 칸 아래 폴더라 "assets/…"로는 못 찾음)
  const UI = (() => { try { return JSON.parse(document.getElementById("ui").textContent); } catch (x) { return {}; } })();
  const uiText = (k, d, v = {}) => (UI[k] || d).replace(/\{(\w+)\}/g, (m, n) => (n in v ? v[n] : m));
  const ASSET = document.currentScript ? new URL("./", document.currentScript.src).href : "assets/";
  // 화면에 한 번 들어오면 fn을 부르고 그만 봄
  const once = (els, fn, opt) => {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { io.unobserve(e.target); fn(e.target); }
    }), opt);
    els.forEach(el => io.observe(el));
  };

  // 이름 — 커서와 함께 자모로 쳐 나감(10/24). 치는 차례는 build.py가 data-type에 적어 둠(그 글자들이 줄인 글꼴에 들어가게).
  const nameEl = home && home.querySelector(".name");
  let typeName = () => {};
  if (motion && !revisit && nameEl && nameEl.dataset.type) {
    const steps = nameEl.dataset.type.split("|"), full = nameEl.textContent;
    nameEl.textContent = "";
    const sr = document.createElement("span");
    sr.className = "sr";
    sr.textContent = full;
    const out = document.createElement("span");
    out.setAttribute("aria-hidden", "true");
    const caret = document.createElement("i");
    caret.className = "caret";
    caret.setAttribute("aria-hidden", "true");
    nameEl.append(sr, out, caret);
    typeName = () => {
      let i = 0;
      const next = () => {
        out.textContent = steps[i++];
        if (i < steps.length) setTimeout(next, 105);
        else setTimeout(() => caret.classList.add("off"), 1200);
      };
      next();
    };
  }
  if (nameEl) nameEl.classList.add("ty");

  // 서 있는 책(10/24) — 26°로 서 있고, 옆으로 밀면 돌아가 책등·뒤표지, 놓으면 제자리. 첫 화면 책과 시집 칸 책 카드가 같은 손맛(10/25 시집 칸 A 손으로만)
  // 첫 화면 책은 누르기 · 키보드로도(10/27 점검 a11y 10 — 끌기로만 되던 것): 살짝 누르기 · Enter · Space는 TAP대로, ← → 는 한 면씩
  const TAP = "step";  // "step" 누를 때마다 한 면씩(그 면에 머묾 — 10/27 동원 "내가 버튼 누를 때마다 옆모습 뒷모습 보여주는 거로 바꾸자") · "around" 한 바퀴(책등 · 뒤표지를 차례로 보이고 제자리 — 처음 고른 A)
  const turnable = (bk, keys) => {
    const b = bk.querySelector(".b"), REST = 26, FACES = [REST, 90, 180 + REST];  // 앞표지 · 책등 · 뒤표지 각도
    let ry = REST, run = 0, drag = null, face = 0, seq = 0;
    const set = v => { ry = v; b.style.setProperty("--ry", v.toFixed(2) + "deg"); };
    const take = () => {  // CSS가 잡고 있던 각도(처음 자세·4초 안전 장치)를 그대로 넘겨받음 — 시집 칸 책은 처음부터 on이라 26°에서 시작
      if (bk.classList.contains("on")) return;
      set(parseFloat(getComputedStyle(b).getPropertyValue("--ry")) || REST);
      bk.classList.add("on");
    };
    const tween = (to, ms, done) => {
      const from = ry, t0 = performance.now(), id = ++run;
      const step = now => {
        if (id !== run) return;
        const p = Math.min(1, (now - t0) / ms);
        set(from + (to - from) * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(step); else if (done) done();
      };
      requestAnimationFrame(step);
    };
    const go = (f, ms = 700, done) => {  // f번째 면으로 — 도는 쪽 그대로(뒤표지 다음 앞표지는 한 바퀴 더 돌아 제자리)
      take();
      const n = FACES.length, next = ((f % n) + n) % n, fwd = f >= face;
      let to = FACES[next];
      if (fwd) while (to <= ry + 1) to += 360; else while (to >= ry - 1) to -= 360;
      face = next;
      const end = () => { set(FACES[next]); if (done) done(); };
      if (reduce) end(); else tween(to, ms, end);
    };
    const around = () => {  // 한 바퀴 — '움직임 줄이기'면 한 면씩
      if (reduce) return go(face + 1);
      const id = ++seq, k = face, hold = (ms, f) => setTimeout(() => { if (id === seq) f(); }, ms);
      go(k + 1, 650, () => hold(450, () => go(k + 2, 750, () => hold(550, () => go(k + 3, 900)))));
    };
    const press = () => { if (TAP === "around") around(); else { seq++; go(face + 1); } };
    bk.addEventListener("pointerdown", e => {
      if (e.button) return;
      take();
      run++;
      seq++;
      drag = { x: e.clientX, ry, t: performance.now() };
      bk.classList.add("drag");
      try { bk.setPointerCapture(e.pointerId); } catch {}
    });
    bk.addEventListener("pointermove", e => { if (drag) set(drag.ry + (e.clientX - drag.x) * 0.9); });
    const up = e => {
      if (!drag) return;
      const tap = keys && e.type === "pointerup" && Math.abs(e.clientX - drag.x) < 6 && performance.now() - drag.t < 350;  // 살짝 누름
      drag = null;
      bk.classList.remove("drag");
      if (tap) return press();
      face = 0;
      if (reduce) set(REST);
      else tween(REST, 1100);
    };
    bk.addEventListener("pointerup", up);
    bk.addEventListener("pointercancel", up);  // 세로로 밀어 화면이 넘어가면 브라우저가 가져감 → 제자리
    if (keys) {
      bk.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); press(); }
        else if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); seq++; go(face + (e.key === "ArrowRight" ? 1 : -1)); }
      });
      bk.addEventListener("blur", () => { if (!face) return; seq++; face = 0; if (reduce) set(REST); else tween(REST, 900); });  // 다른 데로 가면 제자리
    }
    return { turnIn: () => { if (!drag) { take(); tween(REST, 1000); } } };
  };
  // 첫 화면 책만 처음에 책등이 보이게 비스듬히(78°) 서 있다가 26°로 돌아섬. 돌아서는 때는 문 장면이 정함
  // (첫 방문: 문이 열리고 0.9초 뒤 — 표지가 0.6초부터 0.8초 동안 떠오르니 거의 다 보인 뒤 / 다시 온 사람: 책이 화면에 들어오면)
  const bk = home && home.querySelector(".bk");
  let bookIn = () => {};
  if (bk) {
    const t = turnable(bk, true);
    if (motion) bookIn = t.turnIn;
  }
  const cardBook = document.querySelector(".pbook .bk");  // 시집 칸 책 카드 — 들어올 때 돌아서지 않고 만질 때만(10/25 A) · 누르기 · 키보드도 첫 화면 책과 같게(10/27 동원 "시집 칸에 있는 책도 똑같이")
  if (cardBook) turnable(cardBook, true);

  // ① 문 — 첫 방문 한 번만(head의 스크립트가 html.intro를 붙였을 때). 문이 열리는 순간 이름이 나타남
  // 글꼴은 문 글자 · 큰 제목에 쓰는 것만, 0.8초까지만 기다림 — 글꼴이 늦으면 검은 문 앞에서 오래 서 있게 되므로(늦게 온 글꼴은 그 뒤에 바뀌어 들어옴).
  // 모든 글꼴(document.fonts.ready)을 기다리면 아래 칸의 통째 판까지 기다리게 됨 — 한국어판은 둘 다 첫 화면 작은 판이라 곧 옴(10/27 B)
  const door = document.querySelector(".door");
  if (H.classList.contains("intro") && door && motion) {
    // 문 글자는 첫 화면 제목과 같은 자리 · 크기 · 두 줄 · 글꼴로(10/29 동원 '한 컷으로' — 새 눈 비평 그 밖 5): 문이 갈라지며 흰 글자가 같은 자리의 먹 글자로 남는 한 컷.
    // 전엔 가운데 21px 한 줄이라 문이 열리면 글자가 바뀌어 보였음. 아래 글꼴 기다리기(want)도 이 모양으로 잼
    const ht = home && home.querySelector(".ht");
    const alignDoor = () => {
      if (!ht || !door.isConnected) return;
      const r = ht.getBoundingClientRect(), s = getComputedStyle(ht);
      door.querySelectorAll(".t").forEach(t => {
        t.innerHTML = ht.innerHTML;
        Object.assign(t.style, { top: r.top + "px", paddingLeft: r.left + "px", fontFamily: s.fontFamily, fontWeight: s.fontWeight, fontSize: s.fontSize, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing });
      });
      door.classList.add("hd");
    };
    alignDoor();
    addEventListener("resize", alignDoor, { passive: true });
    // 글꼴 목록의 맨 앞 하나만 — fonts.load는 목록에 든 가족을 모두 받으므로, 통째로 넘기면 뒤의 통째 판(BMJ 보통 90KB)까지 기다림[실측 10/27 — 문 열림 3.9초]
    const face = el => { const s = getComputedStyle(el); return document.fonts.load(`${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily.split(",")[0]}`, el.textContent); };
    const want = document.fonts ? Promise.all([door.querySelector(".t"), home && home.querySelector(".ht")].filter(Boolean).map(face)).catch(() => {}) : Promise.resolve();
    let opened = false;
    const openDoor = () => {  // 문 열림 — 이름은 0.15초 · 책은 0.9초 뒤로 겹쳐 두고, 1.4초 뒤 문을 걷어 냄
      if (opened) return;
      opened = true;
      ["wheel", "touchmove", "keydown", "pointerdown"].forEach(k => removeEventListener(k, early, true));
      door.classList.add("open");
      H.classList.add("opened");
      home.classList.add("go");
      setTimeout(typeName, 150);
      setTimeout(bookIn, 900);
      setTimeout(() => { door.remove(); H.classList.remove("intro"); }, 1400);
    };
    // 기다리지 않는 사람(10/27 숨 재기 2) — 문이 덮은 동안 누르기 · 스크롤 · 키는 문을 바로 엶. 그 손짓은 문 뒤 쪽에 닿지 않게:
    // 스크롤은 막고, 누름은 뒤따르는 click까지 삼킴(문이 열리며 손가락 밑에 링크가 드러나도 눌리지 않게 — 0.6초 안에 오지 않으면 풀어 둠)
    const SCROLL_KEYS = [" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "End", "Home"];
    const eat = ev => { ev.preventDefault(); ev.stopPropagation(); removeEventListener("click", eat, true); };
    const early = ev => {
      if (opened || (ev.type === "keydown" && (ev.metaKey || ev.ctrlKey || ev.altKey))) return;  // 브라우저 단축키는 그대로
      if (ev.type === "wheel" || ev.type === "touchmove" || SCROLL_KEYS.includes(ev.key)) ev.preventDefault();
      if (ev.type === "pointerdown") {
        addEventListener("click", eat, true);
        setTimeout(() => removeEventListener("click", eat, true), 600);
      }
      openDoor();
    };
    ["wheel", "touchmove", "keydown", "pointerdown"].forEach(k => addEventListener(k, early, { capture: true, passive: false }));
    Promise.race([want, new Promise(r => setTimeout(r, 800))]).then(() => {
      if (opened) return;
      // 첫 화면이 3초 안에 다 서게(10/24 B) — 문 열림 1.55 → 1.1초, 나머지는 그 뒤로 겹쳐 둠
      setTimeout(() => { if (!opened) door.classList.add("on"); }, 200);
      setTimeout(() => { if (!opened) door.classList.add("lit"); }, 800);
      setTimeout(openDoor, 1100);
    });
  } else {
    H.classList.remove("intro");
    // 한 문장이 숨은 채로 한 번 그려진 뒤에 'go'를 붙여야 흐림 → 또렷이 보임(같은 순간에 붙이면 그냥 나타남 — 10/24 실측)
    if (home) requestAnimationFrame(() => requestAnimationFrame(() => home.classList.add("go")));
    // 다시 온 사람: 글꼴을 0.8초까지만 기다렸다가 바로 침
    Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 800))]).then(() => setTimeout(typeName, 150));
    if (bk && motion && !revisit) once([bk], () => setTimeout(bookIn, 250));
  }

  // 결 — 칸 요소들이 화면에 들어오면 차례로 떠오름(시·기록은 장면이 맡음)
  if (motion) {
    const sels = ["main section > .label", "#poem .h2", ".pbook", "#me .h2", ".tagl", ".bio", ".years li", ".now", "#photo .head", "#photo .caps",
      "#photo .nav2", ".bhead", ".btext", ".btoc h3", ".btoc .parts > div", ".btoc .parts > details", ".btoc .tail", ".ch2", ".big", ".vt", ".sub", ".toc li", ".empty", ".pastnone", "#contact .h2", ".lead", ".ask > *", ".sns", ".colo", "#palette .h2", ".pal", ".pk"];
    const seen = new Set();
    sels.forEach(sel => document.querySelectorAll(sel).forEach(el => {
      if (seen.has(el)) return;
      seen.add(el);
      el.classList.add("rv");
      el.style.setProperty("--i", Math.max(0, [...el.parentElement.children].filter(c => c.matches(sel)).indexOf(el)));
    }));
    once([...document.querySelectorAll(".rv, .nt")], el => el.classList.add("in"), { rootMargin: "0px 0px -8% 0px" });  // .nt — '준비 중' 점은 보일 때 세 번만 숨 쉼
  }

  // ② 탁본 — 시 칸 글자는 움직이지 않음(10/27 숨 재기 4 — 한 줄씩 찍힘은 「탁본」 한 장에만, 아래 길게 누르기)

  // ③ 기록 — 캔버스 하나에 칸을 그림(칸을 요소로 만들면 1,559개가 되어 무거움) + 숫자도 같은 네모 점으로(점 숫자).
  // 움직임이 없으면 다 찬 그림과 숫자. 글자 숫자(.n)는 화면 읽기 프로그램용으로 늘 끝 값 그대로
  const rec = document.querySelector(".rec");
  if (rec) {
    const cvs = [...rec.querySelectorAll("canvas.grid")], dots = [...rec.querySelectorAll("canvas.dot-n")];
    // 5×7 점 글꼴(숫자와 쉼표)
    const F = {
      "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
      "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
      "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
      "3": ["#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###."],
      "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
      "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
      "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
      "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
      "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
      "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
      ",": ["..", "..", "..", "..", ".#", ".#", "#."]
    };
    const shown = new Map();  // 점 숫자마다 지금 보이는 값
    const tone = k => getComputedStyle(H).getPropertyValue(k).trim();  // 색은 style.css 낱말에서(어두운 모드면 어두운 값)
    // 점 한 칸: 컴퓨터 11px · 휴대폰 8px(10/29 고침 3 — 17 · 12px에서 한 단 작게, 휴대폰 숫자 높이 81 → 53px) — 끝 값(1,121이면 26칸)이 기록 칸 폭에 다 안 들어가면 들어갈 때까지 줄임(10/24, 좁은 화면·태블릿에서 칸을 넘지 않게).
    // 두 숫자는 같은 크기로(넓은 쪽에 맞춤) · 화면 폭이 바뀌면 다시 잼
    const span = c => { const f = (+c.dataset.to).toLocaleString("ko-KR"); return [...f].reduce((n, ch) => n + F[ch][0].length, 0) + f.length - 1; };
    let step = 12;
    const fit = () => {
      const max = innerWidth >= 768 ? 11 : 8, room = rec.clientWidth, cols = Math.max(1, ...dots.map(span));
      step = room ? Math.max(4, Math.min(max, Math.floor((room + 3) / cols))) : max;
    };
    fit();
    // 끝 값의 모양(예: 1,121)에 맞춰 자리를 잡고, 지금 값을 0으로 채워 찍음 — 앞자리 0은 옅게, 꺼진 점은 아주 옅게
    const dot = (c, v) => {
      shown.set(c, v);
      const fmt = (+c.dataset.to).toLocaleString("ko-KR"), dpr = Math.min(2, devicePixelRatio || 1);
      const cell = step - 3;
      const s = String(v).padStart(fmt.replace(/,/g, "").length, "0"), lead = s.length - String(v).length;
      let di = 0;
      const chars = [...fmt].map(ch => (ch === "," ? "," : s[di++]));
      const cols = chars.reduce((n, ch) => n + F[ch][0].length, 0) + chars.length - 1;
      const W = cols * step - 3, Hh = 7 * step - 3;
      c.width = W * dpr;
      c.height = Hh * dpr;
      c.style.width = W + "px";
      c.style.height = Hh + "px";
      const x = c.getContext("2d"), on = tone("--ink"), dim = tone("--dot-lead"), off = tone("--dot-off");
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      let col = 0, d = 0;
      chars.forEach(ch => {
        const m = F[ch], faint = ch !== "," && d++ < lead;
        for (let r = 0; r < 7; r++) for (let k = 0; k < m[r].length; k++) {
          if (ch === "," && m[r][k] !== "#") continue;  // 쉼표 칸은 꺼진 점 없이 켜진 점만 — 숫자 한 칸('1 ı 1 1 7')이 아니라 부호로 읽히게(10/29 고침 3)
          x.fillStyle = m[r][k] === "#" ? (faint ? dim : on) : off;
          x.fillRect((col + k) * step, r * step, cell, cell);
        }
        col += m[0].length + 1;
      });
    };
    const drawn = new Map();  // 칸 그림마다 지금까지 칠한 칸 수
    // 다 찬 뒤 옅어진 정도(0 먹 → 1 옅은 회색) — 끝의 올해 본 칸(data-y)만 먹으로 남음(10/29 동원 'B 올해만 먹' — 새 눈 비평 고침 3: 차오를 때는 화려하게, 멈추면 옅게)
    let rest = motion ? 0 : 1;
    const grid = c => {
      const W = c.clientWidth, cell = 3, gap = 2, step = cell + gap, cols = Math.max(1, Math.floor((W + gap) / step));  // 칸 3px + 틈 2px(10/29 고침 3 — 6px이면 1,117칸이 휴대폰 208px 먹 덩어리)
      return { W, cell, step, cols, rows: Math.ceil(+c.dataset.n / cols) };
    };
    // 처음부터 다 그림(처음 · 화면 폭이 바뀔 때 · 옅어지는 동안). 선명도는 2배까지만
    const full = (c, n) => {
      const g = grid(c), dpr = Math.min(2, devicePixelRatio || 1);
      drawn.set(c, n);
      if (!g.W) return;
      c.width = Math.round(g.W * dpr);
      c.height = Math.round(g.rows * g.step * dpr);
      c.style.height = g.rows * g.step + "px";
      const x = c.getContext("2d"), on = tone("--ink"), off = tone("--cell-off"), past = tone("--line"), N = +c.dataset.n, y = +c.dataset.y || 0;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let i = 0; i < N; i++) {
        const px = (i % g.cols) * g.step, py = Math.floor(i / g.cols) * g.step;
        x.fillStyle = i >= n ? off : rest && i < N - y ? past : on;
        x.fillRect(px, py, g.cell, g.cell);
        if (i < n && rest && rest < 1 && i < N - y) {  // 옅어지는 중 — 회색 위에 먹을 (1 − rest)만큼 겹침
          x.globalAlpha = 1 - rest;
          x.fillStyle = on;
          x.fillRect(px, py, g.cell, g.cell);
          x.globalAlpha = 1;
        }
      }
    };
    // 새로 찬 칸만 칠함(1,559칸을 매번 다시 그리지 않게)
    const more = (c, n) => {
      const from = drawn.get(c) || 0, g = grid(c);
      if (n <= from || !g.W) return;
      const x = c.getContext("2d");
      x.fillStyle = tone("--ink");
      for (let i = from; i < n; i++) x.fillRect((i % g.cols) * g.step, Math.floor(i / g.cols) * g.step, g.cell, g.cell);
      drawn.set(c, n);
    };
    if (motion) {
      cvs.forEach(c => full(c, 0));
      dots.forEach(c => dot(c, 0));
      once([rec], () => {
        const t0 = performance.now(), D = 2200;
        const tick = () => {
          const p = Math.min(1, (performance.now() - t0) / D), q = 1 - Math.pow(1 - p, 3);
          cvs.forEach(c => more(c, Math.round(q * +c.dataset.n)));
          dots.forEach(c => dot(c, Math.round(q * +c.dataset.to)));
          if (p < 1) requestAnimationFrame(tick);
          else setTimeout(fade, 600);  // 다 찬 모습을 0.6초 보인 뒤
        };
        // 0.8초에 옅게 — 올해 본 칸만 먹으로 남음(10/29 고침 3)
        const fade = () => {
          const t1 = performance.now();
          const step2 = () => {
            const p = Math.min(1, (performance.now() - t1) / 800);
            rest = Math.max(p * p * (3 - 2 * p), 0.001);
            cvs.forEach(c => full(c, +c.dataset.n));
            if (p < 1) requestAnimationFrame(step2);
          };
          requestAnimationFrame(step2);
        };
        requestAnimationFrame(tick);
      }, { rootMargin: "0px 0px -35% 0px", threshold: 0.01 });
    } else {
      cvs.forEach(c => full(c, +c.dataset.n));
      dots.forEach(c => dot(c, +c.dataset.to));
    }
    let rt = 0;
    addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => { fit(); cvs.forEach(c => full(c, drawn.get(c))); dots.forEach(c => dot(c, shown.get(c))); }, 150);
    });
    const redraw = () => { cvs.forEach(c => full(c, drawn.get(c) || 0)); dots.forEach(c => dot(c, shown.get(c) || 0)); };
    new MutationObserver(redraw).observe(H, { attributes: true, attributeFilter: ["data-theme"] });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", redraw);
  }


  // 지금 보는 쪽(10/31 쪽 나누기 — 전엔 한 장에서 칸을 따라 밑줄이 미끄러졌음, 10/24 B) — 빌드가 그 쪽 메뉴에 on · aria-current="page"를 붙여 둠 → 그 이름 아래 밑줄만
  const nav = document.querySelector(".top nav");
  if (nav) {
    const ul = document.createElement("i");
    ul.className = "ul";
    ul.setAttribute("aria-hidden", "true");
    nav.append(ul);
    const on = nav.querySelector('a[aria-current="page"]');
    const place = to => {  // to: 손 댄 메뉴(11/4 ⑨ 메뉴 밑줄 미끄러짐) — 없으면 지금 쪽
      const was = ul.classList.contains("on");
      const at0 = to || on, at = at0 && !at0.classList.contains("cta") ? at0 : null;  // 연락하기는 먹 상자라 밑줄을 그리지 않음(10/28 A — 상자가 곧 표시)
      if (at) {
        if (!was) ul.style.transition = "none";  // 처음 나타날 땐 그 자리에서(왼쪽 끝에서 미끄러져 오지 않게)
        ul.style.width = at.offsetWidth - (parseFloat(getComputedStyle(at).letterSpacing) || 0) + "px";  // 글자 뒤 자간(.12em)만큼 빼서 글자 폭에 맞춤
        const dy = at.offsetTop + at.offsetHeight - nav.clientHeight;  // 메뉴가 두 줄이면(글 간격을 넓힌 읽기 도구 등 — 돋보기 · 언어 단추가 아랫줄로) 밑줄도 그 칸 이름의 줄 바닥으로
        ul.style.transform = `translate(${at.offsetLeft}px, ${Math.abs(dy) > 2 ? dy : 0}px)`;  // 한 줄일 때는 반올림 차이로 1px 흔들리지 않게 0
        if (!was) { void ul.offsetWidth; ul.style.transition = ""; }
      }
      ul.classList.toggle("on", !!at);
    };
    place();
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) {  // ⑨ 메뉴에 손을 대면 밑줄이 그 메뉴로 미끄러지고, 떼면 제자리(11/4 동원 '넣기' — 손반응열_v1 09)
      nav.querySelectorAll("a[data-pg]").forEach(a => a.addEventListener("mouseenter", () => place(a)));
      nav.addEventListener("mouseleave", () => place());
    }
    // 글꼴이 늦게 오거나 화면 폭이 바뀌면 글자 폭이 달라지므로 밑줄 자리를 다시 잼
    if (document.fonts) document.fonts.ready.then(() => place());  // 인자 없이 — then이 넘기는 FontFaceSet을 손 댄 메뉴로 읽던 결함(11/4 점심 QA)
    let pt = 0;
    addEventListener("resize", () => { clearTimeout(pt); pt = setTimeout(place, 150); });
  }
  // 휴대폰 메뉴 단추(11/1 밤 동원 버튼 "B 메뉴 단추" — 방명록을 더하면 메뉴 다섯이 휴대폰 한 줄에 안 들어가, 명품 사이트 휴대폰 꼴로): 띠 왼쪽 '메뉴'를 누르면 띠 아래로 쪽 목록(#mnu).
  // 여는 동안 띠와 목록 밖은 inert(Tab이 목록 뒤로 새지 않게 — 찾기 창과 같은 꼴) · 쪽 스크롤 멈춤 · 다시 누르거나 Esc면 닫고 단추로 · 찾기를 열거나(돋보기 · ⌘K) 768px 위로 넓어지면 닫음
  const mb = document.querySelector(".top .mb"), mnu = document.getElementById("mnu");
  if (mb && mnu) {
    const head = mb.closest(".top");
    const menu = on => {
      if (on === !mnu.hidden) return;
      if (on) mnu.style.top = head.getBoundingClientRect().bottom + "px";  // 글 간격을 넓힌 읽기 도구로 띠가 높아져도 띠 바로 아래
      mnu.hidden = !on;
      mb.setAttribute("aria-expanded", on ? "true" : "false");
      mb.textContent = on ? mb.dataset.close : mb.dataset.open;
      H.classList.toggle("mnu-on", on);
      [...document.body.children].forEach(el => { if (el !== head && el !== mnu && el.tagName !== "SCRIPT") el.inert = on; });
    };
    mb.addEventListener("click", ev => {
      const on = mnu.hidden;
      menu(on);
      if (on && !ev.detail) mnu.querySelector("a").focus({ preventScroll: true });  // 키보드로 열었을 때만 첫 쪽 이름으로(손가락 · 마우스는 단추에 그대로 — 첫 이름에 굵은 포커스 테두리가 뜨지 않게)
    });
    addEventListener("keydown", ev => {
      if (mnu.hidden) return;
      if (ev.key === "Escape") { menu(false); mb.focus(); }
      else if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") menu(false);  // 찾기 창보다 먼저 닫음(찾기가 쪽 나머지를 inert로 돌리고 닫을 때 풀기 때문)
    }, true);
    head.addEventListener("click", ev => { if (ev.target.closest(".sq")) menu(false); }, true);
    matchMedia("(min-width:768px)").addEventListener("change", m => { if (m.matches) menu(false); });
    addEventListener("pageshow", ev => { if (ev.persisted) menu(false); });  // 뒤로 가기로 돌아온 쪽(bfcache)이 열린 채 남지 않게
  }
  // 화면 밝게 · 어둡게 · 시스템(10/26 동원 "웹사이트 화면에 화이트모드 다크모드 시스템설정 있으면 좋겠다" → A 먹 종이) — 판권면 세 단추.
  // 고른 것은 이 기기에만 기억(localStorage theme — 쿠키 아님), 처음은 밝게. 첫 그림 전에 머리 스크립트가 data-theme을 붙이고 여기서는 단추 · 브라우저 막대 색만
  // 움직임 줄이기(11/1 밤 명품 제안 ⑥ — 버튼 'A 스위치'): 켜면 html data-motion="reduce" — 기기의 '동작 줄이기'와 똑같이(빌드가 스타일 움직임을 그 조건으로 묶음 · motion_css).
  // 이 기기에만 기억(localStorage motion — 쿠키 아님) · 켜고 끄면 스타일 움직임은 바로, 스크립트 움직임(문 · 이름 치기 · 책 돌기 · 마우스 반응 · 쪽 전환)은 다음 쪽부터
  const mot = document.querySelector(".colo .mot input");
  if (mot) {
    const note = document.querySelector(".colo .mot small");
    const paintMo = () => {
      const on = H.getAttribute("data-motion") === "reduce";
      mot.checked = on;
      if (note) note.textContent = on ? note.dataset.on : note.dataset.off;
    };
    mot.addEventListener("change", () => {
      if (mot.checked) H.setAttribute("data-motion", "reduce"); else H.removeAttribute("data-motion");
      try { localStorage.setItem("motion", mot.checked ? "reduce" : "system"); } catch (x) { /* 사생활 모드 등 — 이번 쪽에만 */ }
      paintMo();
    });
    paintMo();
  }
  // 지난번 뒤 새로 생긴 것 점(11/3 '다정한 UX' ⑥ A — 칸 정의 기준/웹사이트 새것 점 칸 정의_v1.md): 빌드가 실은 쪽마다 지문(#nw)을 이 기기의 지난 지문(localStorage seen)과 견줌.
  // 처음 온 사람은 지금 것을 적어 두고 점 없음 · 지금 쪽은 열었으니 지금 것으로 · 다른 쪽 지문이 다르면 메뉴 이름 옆 먹 점(휴대폰은 '메뉴' 단추에도 하나) · 쿠키 아님 · 서버로 안 보냄
  const nwEl = document.getElementById("nw");
  if (nwEl) {
    try {
      const cur = JSON.parse(nwEl.textContent), hereA = document.querySelector('.top nav a[aria-current="page"]'), here = hereA && hereA.dataset.pg;
      let seen = null;
      try { seen = JSON.parse(localStorage.getItem("seen") || "null"); } catch (x) { /* 깨진 값 — 처음 온 사람처럼 */ }
      const first = !seen || typeof seen !== "object";
      if (first) seen = {};
      Object.keys(cur).forEach(p => { if (first || !(p in seen)) seen[p] = cur[p]; });
      if (here !== undefined && here !== null && here in cur) seen[here] = cur[here];
      let any = false;
      const dot = a => {
        const s = document.createElement("span"); s.className = "nwd"; s.setAttribute("aria-hidden", "true");
        const r = document.createElement("span"); r.className = "sr"; r.textContent = " " + uiText("nw_sr", "새 글 있음");
        a.append(s, r);
      };
      document.querySelectorAll(".top nav a[data-pg], .mnu a[data-pg]").forEach(a => {
        const p = a.dataset.pg;
        if (p in cur && seen[p] !== cur[p]) { dot(a); any = true; }
      });
      const mb = document.querySelector(".top .mb");
      if (any && mb) { const s = document.createElement("span"); s.className = "nwd"; s.setAttribute("aria-hidden", "true"); mb.append(s); }
      try { localStorage.setItem("seen", JSON.stringify(seen)); } catch (x) { /* 사생활 모드 등 — 이번 쪽에만 */ }
    } catch (x) { /* 표가 깨지면 점 없이 */ }
  }
  // 글자 크기(11/3 '다정한 UX' ④ A): 보통 · 크게 · 더 크게 — html data-fs="l" · "xl"(빌드 fs_css가 읽는 글자 크기에 --fs를 곱함) · 이 기기에만 기억(localStorage fs — 쿠키 아님) · 머리 스크립트가 첫 그림 전에 붙임
  const fsz = document.querySelectorAll(".fsz button[data-fs]");
  if (fsz.length) {
    const paintFs = () => { const v = H.getAttribute("data-fs") || "m"; fsz.forEach(b => b.setAttribute("aria-pressed", b.dataset.fs === v)); };
    fsz.forEach(b => b.addEventListener("click", () => {
      const v = b.dataset.fs;
      if (v === "m") H.removeAttribute("data-fs"); else H.setAttribute("data-fs", v);
      try { localStorage.setItem("fs", v); } catch (x) { /* 사생활 모드 등 — 이번 쪽에만 */ }
      paintFs();
    }));
    paintFs();
  }
  const thm = document.querySelectorAll(".thm button[data-th]"), tcol = document.querySelector('meta[name="theme-color"]');
  if (thm.length) {
    const sysDark = matchMedia("(prefers-color-scheme: dark)");
    const paint = () => {
      const th = H.getAttribute("data-theme") || "light";
      thm.forEach(b => b.setAttribute("aria-pressed", b.dataset.th === th));
      if (tcol) tcol.content = th === "dark" || (th === "system" && sysDark.matches) ? "#141414" : "#ffffff";
    };
    thm.forEach(b => b.addEventListener("click", () => {
      const th = b.dataset.th;
      if (th === "light") H.removeAttribute("data-theme"); else H.setAttribute("data-theme", th);
      try { localStorage.setItem("theme", th); } catch (x) { /* 사생활 모드 등 — 이번 쪽에만 */ }
      paint();
    }));
    sysDark.addEventListener("change", paint);
    paint();
  }

  // 언어 바꾸기(10/24 영어판) — 보던 칸으로 이어서(예: 사진 칸에서 EN → 영어판 사진 칸)
  // 화면 위 1/3에 걸친 id 가운데 가장 작은 것으로(두 판의 id가 같음 — 차례 t · 시 행 l · 연표 y · 팔레트 …), 없으면 지금 칸(10/28 사용 편의 점검 ⑥ — 칸 머리로만 이어져 차례 · 시에서 읽던 줄을 잃었음)
  // 11/1 일본어판 — 다른 판 링크가 둘(한국어 · English · 日本語 가운데 지금 판 빼고)이라 모두에
  document.querySelectorAll(".colo .lang").forEach(swap => swap.addEventListener("click", ev => {  // 10/31 언어는 바닥글 판권면 '언어' 줄로(동원 "언어 설정 하단 푸터로 빼")
    const y = innerHeight / 3;
    const hit = [...document.querySelectorAll("main [id]")].filter(el => { const r = el.getBoundingClientRect(); return r.height && r.top <= y && r.bottom > y; })
      .sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height)[0];
    const to = hit ? "#" + hit.id : "";  // 같은 쪽의 다른 판으로(10/31 쪽 나누기 — 언어 단추가 그 쪽 주소를 가리킴)
    if (to) { ev.preventDefault(); location.href = swap.getAttribute("href") + to; }
  }));

  // 사진 칸의 한 장씩 · 모아 보기 · 3D 고리(10/24–11/1)는 11/3 흐르는 벽으로 바뀌며 뺌(11/4 정리 — git 기록 9cec51b 앞에 있음)

  // 영상 칸: 큰 한 편은 누르면 이 자리에서 재생 — 누르기 전에는 플레이어를 불러오지 않음(썸네일 그림만 · youtube-nocookie · IFrame API는 처음 누를 때 한 번).
  // 작은 재생기(A 아래 띠, 10/24): 재생 중에 영상이 화면에서 다 벗어나면 멈추고 아래 띠가 올라옴 → 띠를 누르면 영상 칸으로 돌아가 이어 재생.
  // 안 보이는 채로는 재생하지 않음(유튜브 정책 III.I.9 — 안 보일 때 재생이 시작돼도 바로 멈춤). 띠를 닫아도 영상은 멈춘 그대로
  const vbox = document.querySelector(".vbox[data-yt]");
  if (vbox) {
    const link = vbox.querySelector("a"), thumb = vbox.querySelector("img");
    const vt = document.querySelector("#video .vt"), cite = vt && vt.querySelector("cite");
    const title = ((vt && (vt.dataset.title || vt.textContent)) || "").trim();  // 재생 단추 · 플레이어 이름은 부호 없이(한 문장 전체가 아니라 제목만)
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vplay";
    btn.setAttribute("aria-label", uiText("play", "{title} 재생", { title }));
    btn.append(thumb);
    btn.insertAdjacentHTML("beforeend", '<span class="play" aria-hidden="true"></span>');
    link.replaceWith(btn);
    const say = document.createElement("p");  // 멈췄다는 것을 화면 읽기 프로그램에 알림(띠는 숨겨져 있다가 뜨므로 바깥에 둠)
    say.className = "sr";
    say.setAttribute("role", "status");
    vbox.after(say);
    const api = () => new Promise((ok, no) => {
      if (window.YT && window.YT.Player) return ok();
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); ok(); };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.onerror = no;
      document.head.append(s);
    });
    const clock = t => {  // 42 → 0:42, 3725 → 1:02:05
      t = Math.floor(t || 0);
      const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = String(t % 60).padStart(2, "0");
      return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
    };
    let player = null, mini = null, seen = true, back = false, key = false;
    const hide = () => { if (mini) mini.classList.remove("on"); };
    const resume = () => {
      back = false;
      player.playVideo();
      if (key) player.getIframe().focus({ preventScroll: true });
    };
    const bar = () => {
      mini = document.createElement("div");
      mini.className = "mini";
      mini.setAttribute("role", "region");
      mini.setAttribute("aria-label", uiText("paused", "멈춘 영상"));
      mini.innerHTML = `<i class="pr"></i><button type="button" class="go"><img alt=""><span class="tx"><b></b><small></small></span><span class="pl" aria-hidden="true"></span></button><button type="button" class="x" aria-label="${uiText("close_mini", "작은 재생기 닫기")}">×</button>`;
      mini.querySelector("img").src = thumb.currentSrc || thumb.src;
      mini.querySelector("b").textContent = cite ? cite.textContent : title;  // 띠에 보이는 제목은 사이트 표기 그대로(〈 〉)
      mini.querySelector(".go").addEventListener("click", ev => {
        back = true;
        key = ev.detail === 0;  // 키보드로 눌렀으면 이어 재생한 뒤 커서를 영상으로
        hide();
        if (seen) return resume();  // 띠가 내려가는 중에 눌렀으면 영상이 이미 보이는 자리
        vbox.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      });
      mini.querySelector(".x").addEventListener("click", () => { back = false; hide(); });
      document.body.append(mini);
    };
    // 멈추고 띠를 올림 — 멈춘 때 · 처음부터 멈춘 자리까지의 선
    const stop = () => {
      player.pauseVideo();
      if (!mini) bar();
      const t = player.getCurrentTime(), d = player.getDuration();
      const msg = uiText("paused_at", "{t}에서 멈춤 · 이어 보기", { t: clock(t) });
      mini.querySelector("small").textContent = msg;
      mini.querySelector(".pr").style.width = d ? `${Math.min(100, t / d * 100)}%` : "0";
      say.textContent = msg;
      H.classList.add("mini-used");
      requestAnimationFrame(() => mini.classList.add("on"));
    };
    btn.addEventListener("click", async ev => {
      const viaKey = ev.detail === 0;
      btn.disabled = true;
      try {
        await api();
      } catch {  // 유튜브를 못 불러오면 유튜브로 가는 링크로 되돌림(한 번 더 누르면 유튜브에서 열림)
        link.append(thumb);
        btn.replaceWith(link);
        return;
      }
      const spot = document.createElement("div");
      btn.replaceWith(spot);
      player = new YT.Player(spot, {
        host: "https://www.youtube-nocookie.com",
        videoId: vbox.dataset.yt,
        width: "100%",
        height: "100%",
        playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
        events: {
          onReady: e => {
            const f = e.target.getIframe();
            f.title = title;
            if (viaKey) f.focus({ preventScroll: true });
            e.target.playVideo();
          },
          onStateChange: e => { if (e.data === YT.PlayerState.PLAYING && !seen) stop(); }
        }
      });
      if (!("IntersectionObserver" in window)) return;
      new IntersectionObserver(es => es.forEach(e => {
        seen = e.isIntersecting;
        if (seen) {
          hide();
          if (back && player.playVideo) resume();
        } else if (player.getPlayerState && [YT.PlayerState.PLAYING, YT.PlayerState.BUFFERING].includes(player.getPlayerState())) stop();
      }), { threshold: 0 }).observe(vbox);
    });
  }

  // 게시물 열어 보기(10/25 ⑤ A) — 띠의 사진 가운데 여러 장짜리 게시물('20장' 표시)을 누르면 그 게시물 안 사진을 옆으로 넘겨 보는 흰 창.
  // 사진은 열 때만 받음 · 열면 나머지 쪽은 inert(Tab이 창 안에서만) · Esc나 '닫기'로 닫고 포커스는 누른 사진으로 · 화살표 키로 넘김
  // 마우스로 보는 컴퓨터는 옆으로 밀 수 없어 양옆 넘기기 단추(10/26) — 끝 장에서는 흐리게(disabled를 쓰면 누르던 단추에서 포커스가 빠져 Esc가 안 먹음)
  const pv = document.querySelector(".pv"), postsEl = document.getElementById("posts");
  if (pv && postsEl) {
    const posts = JSON.parse(postsEl.textContent), view = pv.querySelector(".pvs"), cnt = pv.querySelector(".pvc"), foot = pv.querySelector(".pvf"), x = pv.querySelector(".pvx");
    const pcaps = [...document.querySelectorAll("#photo .cap")], prev = pv.querySelector(".pvp"), next = pv.querySelector(".pvn");
    let from = null, n = 0;
    const others = on => [...document.body.children].forEach(el => { if (el !== pv && el.tagName !== "SCRIPT") el.inert = on; });
    const upd = () => {
      const k = Math.min(n, Math.round(view.scrollLeft / Math.max(1, view.clientWidth)) + 1);
      cnt.textContent = `${k} / ${n}`;
      if (prev) { prev.setAttribute("aria-disabled", k <= 1); next.setAttribute("aria-disabled", k >= n); }
    };
    const step = d => view.scrollBy({ left: d * view.clientWidth, behavior: reduce ? "auto" : "smooth" });
    const pin = f => {  // 번호 칩(.pvk)을 맞춰 줄인 사진의 오른쪽 위에 — 사진이 온 뒤 · 창이 보인 뒤 · 화면 크기가 바뀐 뒤
      const img = f.querySelector("img"), c = f.querySelector(".pvk");
      if (!img || !c || !img.naturalWidth || pv.hidden) return;
      const r = img.getBoundingClientRect(), fr = f.getBoundingClientRect();
      c.style.top = `${r.top - fr.top + 10}px`;
      c.style.right = `${fr.right - r.right + 10}px`;
      c.hidden = false;
    };
    addEventListener("resize", () => view.querySelectorAll("figure").forEach(pin));
    view.addEventListener("scroll", upd, { passive: true });
    view.addEventListener("scroll", () => {
      const k = Math.round(view.scrollLeft / Math.max(1, view.clientWidth));
      [k, k + 1].forEach(j => { const im = view.children[j] && view.children[j].querySelector("img"); if (im && im.dataset.src) { im.src = im.dataset.src; im.removeAttribute("data-src"); } });
    }, { passive: true });
    const open = (i, btn, start = 0) => {  // start: 흐르는 벽(11/3)에서 누른 그 사진부터
      const list = posts[i] || [];
      if (list.length < 2) return;
      n = list.length;
      from = btn;
      const cov = document.querySelector(`#photo .wt[data-i="${i}"][data-k="0"]`);  // 첫 장 설명 — 벽의 첫 사진 단추 이름에서 ' — 1 / n'을 뺀 것
      const sim = cov ? { alt: cov.getAttribute("aria-label").replace(/ — \d+ \/ \d+$/, ""), lang: cov.lang } : btn.querySelector("img") || {}, alt = sim.alt || "";
      view.textContent = "";
      list.forEach((src, k) => {
        const f = document.createElement("figure"), img = document.createElement("img"), chip = document.createElement("span");
        if (Math.abs(k - start) > 1 && k > 1) img.dataset.src = src; else img.src = src;  // 셋째 장부터는 넘길 때 한 장 앞씩(10/27 점검 — 열 때 여러 장을 한꺼번에 받아 둘째 장이 늦었음)
        // 첫 장만 그 사진의 설명, 둘째 장부터는 '게시물 사진 2 / 20' — 첫 장 설명을 되풀이하면 다른 사진을 설명하게 됨(10/27 점검 남은 것 가4 · 장마다 설명은 출간 뒤)
        img.alt = k ? uiText("post_photo", "게시물 사진 {k} / {n}", { k: k + 1, n }) : `${alt} (1 / ${n})`;
        if (sim.lang && !k) img.lang = sim.lang;  // 영어판의 한국어 대체 글은 한국어로(띠의 사진과 같게)
        chip.className = "pvk";
        chip.setAttribute("aria-hidden", "true");  // 화면 읽기에는 맨 위 '2 / 20'(aria-live)이 알림
        chip.hidden = true;
        chip.textContent = `${k + 1}/${n}`;  // 지금 몇 번째인지 — 인스타그램처럼 사진 위(10/27 동원 "A 사진 위 칩")
        img.addEventListener("load", () => pin(f));
        f.append(img, chip);
        view.append(f);
      });
      foot.innerHTML = pcaps[i] ? pcaps[i].innerHTML : "";
      if (btn && btn.classList.contains("wt")) {  // ⑧ 누른 사진 자리에서 창이 커지며 열림(11/4 동원 '넣기' — 손반응열_v1 08)
        const r = btn.getBoundingClientRect();
        pv.style.setProperty("--ox", `${r.left + r.width / 2}px`);
        pv.style.setProperty("--oy", `${r.top + r.height / 2}px`);
        pv.classList.add("fromt");
      } else pv.classList.remove("fromt");
      pv.classList.remove("bare");  // 열 때는 늘 단추가 보이게
      pv.hidden = false;
      H.classList.add("pv-on");
      others(true);
      view.scrollLeft = start * view.clientWidth;
      upd();
      view.querySelectorAll("figure").forEach(pin);  // 이미 받아 둔 사진은 창이 보인 지금 자리를 잼
      requestAnimationFrame(() => requestAnimationFrame(() => pv.classList.add("on")));
      x.focus();
    };
    const shut = () => {
      if (pv.hidden) return;
      pv.classList.remove("on");
      others(false);
      H.classList.remove("pv-on");
      setTimeout(() => { pv.hidden = true; view.textContent = ""; }, reduce ? 0 : 300);
      if (from) from.focus();
    };
    document.querySelectorAll("#photo .pop").forEach(b => b.addEventListener("click", () => open(+b.dataset.i, b, +(b.dataset.k || 0))));
    x.addEventListener("click", shut);
    // ① 사진을 누르면 단추 · 글이 0.3초에 숨어 사진만 남고, 다시 누르면 돌아옴(11/4 동원 'A 누르면 숨김' — 갤러리UX열_v1 01 · 아이폰 사진 앱) · 키보드로 단추에 오면 늘 보임
    view.addEventListener("click", () => pv.classList.toggle("bare"));
    pv.addEventListener("focusin", ev => { if (ev.target !== view) pv.classList.remove("bare"); });
    if (prev) { prev.addEventListener("click", () => step(-1)); next.addEventListener("click", () => step(1)); }
    document.addEventListener("keydown", ev => {  // 창 안 빈자리를 눌러 포커스가 쪽 바탕으로 빠져도 Esc · 좌우 키가 듣게 문서에서 받음(10/28 점검 3 — 「탁본」 한 장과 같게)
      if (pv.hidden) return;
      if (ev.key === "Escape") shut();
      else if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
        ev.preventDefault();
        step(ev.key === "ArrowRight" ? 1 : -1);
      }
    });
  }

  // 사이트 안 찾기(10/26 검색 A 전체 화면 창) — 맨 위 막대 돋보기(또는 ⌘K · Ctrl+K)로 흰 한 장을 열고, 빌드가 쪽에 넣은 찾을 거리(#sidx)에서 찾음.
  // 띄어쓰기 · 부호 · 영문 대소문자 무시 · 초성만 쳐도(ㅌㅂ → 탁본). 검색어는 이 기기 밖으로 나가지 않음 · 열면 나머지 쪽은 inert · Esc나 '닫기'로 닫고 포커스는 돋보기로
  let leaving = false;  // 찾기에서 사이트 안 다른 쪽으로 가는 중(10/31 쪽 나누기) — 창을 닫을 때 쌓아 둔 기록 칸을 뒤로 걷지 않음(그 뒤로 가기가 Enter로 시작한 이동을 취소했음)
  const sq = document.querySelector(".sq"), srch = document.querySelector(".srch"), sidx = document.getElementById("sidx");
  if (sq && srch && sidx) {
    const items = JSON.parse(sidx.textContent);  // [갈래, 글, 자리, 갈 곳] · 칸 이름만 다섯째에 그 칸의 낱말(약력 · 차례 …)
    const inp = srch.querySelector("input"), res = srch.querySelector(".sr-res"), none = srch.querySelector(".sr-none");
    const cnt = srch.querySelector(".sr-n"), lab = srch.querySelector(".sr-lab"), sug = srch.querySelector(".sug");
    const say = srch.querySelector('[role="status"]');  // 결과 수 · '없음'을 화면 읽기 프로그램에 — 늘 자리에 있는 한 줄에서 글만 바꿈(숨겼다 보이면 안 읽힘, 10/27 점검)
    let sayT = 0;
    const K = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
    const cho = s => [...s].map(c => { const k = c.charCodeAt(0) - 0xac00; return k >= 0 && k < 11172 ? K[Math.floor(k / 588)] : c; }).join("");
    const skip = /[\s·「」『』〈〉《》,.!?'"“”‘’\-—–()・、。（）：]/;  // 일본어판(11/1) 부호 ・、。（）： 도
    // 견줄 글(빈칸 · 부호를 뺀 소문자) + 원래 글의 자리 — 찾은 낱말을 원래 글에서 굵게 감쌀 때 씀
    const norm = s => { const o = [], m = []; [...s.normalize("NFC")].forEach((c, i) => { if (!skip.test(c)) { o.push(c.toLowerCase()); m.push(i); } }); return [o.join(""), m]; };
    const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    // 영어판 · 일본어판 결과의 한국어(시 행 · 원제 '탁본')는 한국어로 읽히게 감쌈 — 태그 사이 글만(10/27 점검 a11y 9)
    const ko = s => H.lang !== "ko" ? s.replace(/[가-힣ㄱ-ㅎ](?:[가-힣ㄱ-ㅎ\s·「」『』〈〉《》,.!?“”‘’()—–-]*[가-힣ㄱ-ㅎ」』〉》])?/g, w => `<span lang="ko">${w}</span>`) : s;
    const find = q => {
      const [nq] = norm(q);
      if (!nq) return [];
      const ch = /^[ㄱ-ㅎ]+$/.test(nq), out = [];
      const one = H.lang === "en" && nq.length > 4 && nq.endsWith("s") ? nq.slice(0, -1) : "";  // 영어 복수형(films · poems)은 끝 s를 떼고 한 번 더(10/28 점검 5)
      items.forEach(it => {
        const [nt, map] = norm(it[1]), hay = ch ? cho(nt) : nt;
        let w = nq, at = hay.indexOf(nq);
        if (at < 0 && one) { w = one; at = hay.indexOf(one); }
        if (at < 0) {  // 칸 이름은 그 칸의 낱말로도('약력' → 소개) — 굵게 할 글자가 없어 이름 그대로, 앞부분이 맞은 것과 함께 위로
          // 낱말을 붙여 견줌('사는 곳'처럼 띄운 말도) · 초성만 쳤으면 낱말 첫머리만(ㅅㅈ → 사진은 맞고 메시지는 안 맞게)
          if (it[4] && (ch ? it[4].split(" ").some(x => cho(norm(x)[0]).startsWith(nq)) : [nq, one].some(x => x && norm(it[4])[0].includes(x)))) out.push({ it, at: 0, html: esc(it[1]) });
          return;
        }
        const cs = [...it[1].normalize("NFC")], a = map[at], b = map[at + w.length - 1] + 1;
        out.push({ it, at, html: esc(cs.slice(0, a).join("")) + "<b>" + esc(cs.slice(a, b).join("")) + "</b>" + esc(cs.slice(b).join("")) });
      });
      return out.sort((x, y) => (x.at > 0) - (y.at > 0)).slice(0, 12);  // 앞부분이 맞는 것부터, 같으면 갈래 차례(칸 · 시집 · 차례 · 시 · 소개 …)
    };
    // 방향키로 고른 줄(10/27 동원 요청 · 10/28 A 옅은 바탕) — 포커스는 입력 칸에 두고 고른 줄만 표시(aria-activedescendant) · 더 치면 그대로 이어서 찾음
    let act = -1, lastQ = null;
    const opts = () => [...(sug.hidden ? res : sug).querySelectorAll('[role="option"]')];
    const pick = k => {
      const o = opts();
      act = o[k] ? k : -1;
      o.forEach((el, i) => { el.classList.toggle("on", i === act); el.setAttribute("aria-selected", i === act ? "true" : "false"); });
      if (act < 0) inp.removeAttribute("aria-activedescendant");
      else { inp.setAttribute("aria-activedescendant", o[act].id); o[act].scrollIntoView({ block: "nearest" }); }
    };
    const run = () => {
      const q = inp.value;
      if (q === lastQ) return;  // 글자가 그대로면(한글 한 글자 마침 등) 다시 그리지 않음 — 고른 줄을 지킴
      lastQ = q;
      const empty = !q.trim(), hits = empty ? [] : find(q), showSug = empty || !hits.length;  // 찾는 글이 없으면 추천을 함께(10/28 점검 4 — 안내가 '추천 주제를 눌러 보세요')
      lab.hidden = sug.hidden = !showSug;
      cnt.hidden = empty || !hits.length;
      cnt.textContent = uiText("search_count", "찾은 것 {n}", { n: hits.length });
      res.innerHTML = hits.map((h, i) => {
        const ext = /^https?:/.test(h.it[3]);
        return `<li role="none"><a role="option" id="sr${i}" aria-selected="false" href="${esc(h.it[3])}"${ext ? ' target="_blank" rel="noopener"' : ""}><span class="tg">${esc(h.it[0])}</span>` +
          `<span class="tx">${ko(h.html)}${ext ? " ↗" : ""}</span><span class="wh">${ko(esc(h.it[2]))}</span></a></li>`;  // 새 창은 끝에 ↗(10/28 점검 7 — 사이트 링크 규칙)
      }).join("");
      none.hidden = empty || hits.length > 0;
      inp.setAttribute("aria-controls", showSug ? sug.id : res.id);
      inp.setAttribute("aria-expanded", opts().length ? "true" : "false");
      pick(-1);
      clearTimeout(sayT);
      const msg = empty ? "" : hits.length ? cnt.textContent : none.textContent;
      sayT = setTimeout(() => { if (say) say.textContent = msg; }, 400);  // 치는 동안 글자마다 읽지 않게 잠깐 멈춘 뒤
    };
    let from = null;
    const others = on => [...document.body.children].forEach(el => { if (el !== srch && el.tagName !== "SCRIPT") el.inert = on; });
    const open = () => {
      if (!srch.hidden) return;
      from = document.activeElement;
      srch.inert = false;
      srch.hidden = false;
      H.classList.add("sr-on");
      others(true);
      inp.value = "";
      lastQ = null;
      run();
      inp.focus();
    };
    const shut = back => {
      if (srch.hidden) return;
      srch.hidden = true;
      H.classList.remove("sr-on");
      others(false);
      if (back) (from && from !== document.body ? from : sq).focus({ preventScroll: true });  // 포커스 없이(⌘K) 열었으면 돋보기로 · 화면은 그대로(10/28 점검 1 — 맨 위 띠의 돋보기로 포커스가 가며 쪽이 400px쯤 위로 튀었음)
    };
    // 결과로 가기 — 사진은 그 장으로 넘기고, 나머지는 그 줄을 화면 가운데에 두고 잠깐 옅은 바탕
    const goTo = href => {
      const p = /^#p(\d+)$/.exec(href);
      const el = document.querySelector(p ? "#photo" : href);
      if (!el) return;
      const fold = el.closest("details");  // '지난 소식'처럼 접힌 묶음 안이면 펼친 뒤에
      if (fold && !fold.open) fold.open = true;
      const sec = el.matches("section"), big = el.offsetHeight > innerHeight * 0.6;  // 칸 · 큰 덩어리(차례 전체)는 머리를 위에, 한 줄은 화면 가운데에
      el.scrollIntoView({ block: sec || big ? "start" : "center", behavior: reduce ? "auto" : "smooth" });
      if (p) {  // 흐르는 벽(11/3) — 그 게시물을 창으로 엶(첫 사진 단추에 포커스를 두고 누름 — 창을 닫으면 그 자리로)
        const b = document.querySelector(`#photo .wt[data-i="${+p[1]}"][data-k="0"]`);
        if (b) { b.focus({ preventScroll: true }); b.click(); }
        return;
      }
      if (!sec && !big) { el.classList.add("hit"); setTimeout(() => el.classList.remove("hit"), 1600); }
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    };
    if (/^#p\d+$/.test(location.hash)) goTo(location.hash);  // 다른 쪽 찾기 결과로 사진 쪽에 온 사람(10/31 쪽 나누기 — photo/#p3) — 그 장으로 넘김
    sq.addEventListener("click", open);
    srch.querySelector(".x").addEventListener("click", () => shut(true));
    // ↑↓ — 맨 아래 다음 · 맨 위 앞은 입력 칸(고른 줄 없음)으로, 검색창 자동 완성처럼 돎. Tab으로 줄에 가 있었으면 그 줄에서 이어서
    srch.addEventListener("keydown", ev => {
      if ((ev.key !== "ArrowDown" && ev.key !== "ArrowUp") || ev.altKey || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
      const o = opts(), at = ev.target === inp ? act : o.indexOf(ev.target);
      if (!o.length || (ev.target !== inp && at < 0)) return;
      ev.preventDefault();
      let k = at + (ev.key === "ArrowDown" ? 1 : -1);
      if (k >= o.length) k = -1; else if (k < -1) k = o.length - 1;
      if (ev.target !== inp) inp.focus();
      pick(k);
    });
    inp.addEventListener("input", run);
    inp.addEventListener("keydown", ev => {  // Enter(휴대폰 자판 '검색')면 고른 줄로, 고른 줄이 없으면 첫 결과로 — 한글을 짜는 중의 Enter는 글자 마침이라 건너뜀
      if (ev.key !== "Enter" || ev.isComposing || ev.keyCode === 229) return;
      const to = opts()[act] || res.querySelector("a");
      if (to) { ev.preventDefault(); to.click(); }
    });
    srch.addEventListener("click", ev => {
      const a = ev.target.closest("a, button[data-q]");
      if (!a) return;
      if (a.dataset.q) { inp.value = a.dataset.q; run(); inp.focus(); return; }
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#") && a.target !== "_blank") {  // 사이트 안 다른 쪽(10/31 쪽 나누기 — book/#toc 등): 창을 닫고 쌓아 둔 기록 칸을 그 쪽 주소로 바꿔 옮김(뒤로 가기는 찾기 전 자리로)
        ev.preventDefault();
        leaving = true;
        shut(false);
        location.replace(a.href);
        return;
      }
      if (!href.startsWith("#")) { shut(true); return; }  // 밖으로 나가는 링크(교보 · 유튜브)는 새 창 그대로 · 포커스는 돋보기로(돌아왔을 때 쪽 맨 앞부터 다시가 아니게)
      ev.preventDefault();
      shut(false);
      goTo(href);
    });
    // ⌘K · Ctrl+K로 열기(10/27 동원 "A 조합 키" — 전엔 '/' 한 글자라 음성 입력 · 한 키 탐색에서 뜻하지 않게 열렸음, WCAG 2.1.4). 한글 자판이어도 K 자리(code)로
    document.addEventListener("keydown", ev => {
      if (ev.key === "Escape" && !srch.hidden) { shut(true); return; }  // Esc는 문서에서 — 창 안 빈자리를 눌러 포커스가 쪽 바탕으로 빠져도 닫힘(10/28 점검 3)
      const other = [...document.querySelectorAll('[aria-modal="true"]')].some(d => d !== srch && !d.hidden);  // 다른 창(게시물 · 「탁본」 한 장)이 열려 있으면 무시
      if ((ev.metaKey || ev.ctrlKey) && !ev.altKey && !ev.shiftKey && (ev.code === "KeyK" || (ev.key || "").toLowerCase() === "k") && srch.hidden && !other) { ev.preventDefault(); open(); }
    });
  }

  // 「탁본」 한 장 — 시를 길게 누르면(2.2초) 검은 먹 종이가 올라오고 흰 글자로 전문이 한 줄씩 찍힘. 그 전에 떼면 되돌아감.
  // 안내 문구를 누르면(키보드·화면 읽기 프로그램도) 바로 열림 · Esc나 '닫기'로 닫음 · '동작 줄이기'면 움직임 없이 바로
  const poemBox = document.querySelector(".poem"), hint = document.querySelector(".hint"), sheet = document.querySelector(".sheet");
  if (poemBox && hint && sheet) {
    const lines = [...sheet.querySelectorAll(".sp .ln")];
    const keep = sheet.querySelector(".keep"), close = sheet.querySelector(".close"), kb = sheet.querySelector(".kb");
    const touch = document.createElement("i");
    touch.className = "touch";
    touch.setAttribute("aria-hidden", "true");
    document.body.append(touch);
    // viaKey: 키보드로 열었을 때만 닫은 뒤 커서를 안내로 돌려놓음(손가락·마우스로 열었으면 테두리가 남지 않게)
    let p = 0, pressing = false, auto = false, open = false, ticking = false, last = 0, back = hint, img = null, viaKey = false;
    // 진행의 앞 35%는 종이가 올라오고, 뒤 65%는 행이 차례로 찍힘
    const apply = q => {
      const s = Math.min(1, q / 0.35), e = 1 - Math.pow(1 - s, 3);
      sheet.style.transform = `translateY(${(1 - e) * 102}%)`;
      const n = q <= 0.35 ? 0 : Math.ceil((q - 0.35) / 0.65 * lines.length);
      lines.forEach((l, i) => l.classList.toggle("on", i < n));
    };
    // 다 열린 동안 종이 밖은 inert — Tab이 검은 종이 뒤 링크로 새지 않게(10/25 마지막 점검 ⑥). 닫기 시작할 때 먼저 풀어 포커스를 안내로 돌려놓을 수 있게
    const rest = on => [...document.body.children].forEach(el => { if (el !== sheet && el.tagName !== "SCRIPT") el.inert = on; });
    // 한 장에 맞춤(10/28 동원 'A 한 장에 맞춤' — 낮은 화면(375×667 · 사파리 548)에서 다 찍힌 뒤 첫 행이 제목 밑에 가려지던 것): 다 찍힌 모습(끝 두 줄까지)으로 재어
    // 종이가 화면보다 길면 연 사이 → 행간 → 글자(11px 바닥) → 위아래 여백(.tight) → 연 사이 한 번 더, 한 단씩 줄임. 그래도 넘치면 다 찍힌 뒤 맨 아래 대신 첫 행이 보이는 맨 위 그대로
    const sp = sheet.querySelector(".sp"), stanzas = [...sp.querySelectorAll("p")].slice(1);
    const gap = v => stanzas.forEach(x => { x.style.marginTop = v; });
    const FIT = [() => gap("1.2em"), () => gap(".8em"), () => { sp.style.lineHeight = "1.5"; }, () => { sp.style.fontSize = "11px"; }, () => sheet.classList.add("tight"), () => gap(".6em")];
    let fitOver = 0;
    const unfit = () => { gap(""); sp.style.lineHeight = sp.style.fontSize = ""; sheet.classList.remove("tight"); };
    const fit = () => {
      unfit();
      const was = sheet.classList.contains("done");
      sheet.classList.add("done");  // 끝 두 줄이 나온 높이로 잼 — 같은 순간에 되돌려 그려지지 않음
      const over = () => sheet.scrollHeight - sheet.clientHeight;
      for (const step of FIT) { if (over() <= 0) break; step(); }
      fitOver = over();
      if (!was) sheet.classList.remove("done");
    };
    const show = () => { sheet.hidden = false; H.style.overflow = "hidden"; fit(); };
    addEventListener("resize", () => { if (!sheet.hidden) fit(); }, { passive: true });  // 돌리거나 주소창이 접히면 다시 맞춤
    const hide = () => {
      sheet.hidden = true;
      unfit();
      H.style.overflow = "";
      rest(false);
      sheet.classList.remove("done");
      lines.forEach(l => l.classList.remove("on"));
      p = 0;
      keep.hidden = false;  // 다음에 열면 다시 '간직하기'부터
      if (kb) kb.hidden = true;
      sheet.scrollTop = 0;
      sheet.classList.remove("sc");
    };
    // 시가 위에 붙은 제목 밑으로 지나가는 동안만 제목 아래 그림자(10/27 숨 재기 6)
    sheet.addEventListener("scroll", () => sheet.classList.toggle("sc", sheet.scrollTop > 2), { passive: true });
    // 뜬 날(10/27 동원 'B 주소 줄 오른쪽' — 레퍼런스 제안 ④): 간직하는 그림의 주소 줄 오른쪽에 이 기기의 오늘 날짜(2026. 11. 1. 뜸 · Taken November 1, 2026)를 그려 넣음.
    // 자리는 build.py make_takbon의 주소 줄과 같은 기준선(1080×1920에서 오른쪽 끝 1010 · 기준선 1789) · 글꼴은 시집 이름 줄과 같은 고딕 300 · 27px · 회색. 그리기에 실패하면 날짜 없는 그림. 이름 · 정보는 받지 않음
    const dated = async () => {
      const plain = () => fetch(ASSET + "img/takbon.jpg").then(r => r.blob()).catch(() => null);
      try {
        const bmp = await createImageBitmap(await (await fetch(ASSET + "img/takbon.jpg")).blob());
        const sans = H.lang === "ja" ? "JGO, PTD" : "PTD";  // 일본어판(11/1)은 Pretendard JP 판 먼저
        await document.fonts.load(`300 27px ${sans}`);
        const c = document.createElement("canvas");
        c.width = bmp.width;
        c.height = bmp.height;
        const g = c.getContext("2d");
        g.drawImage(bmp, 0, 0);
        const now = new Date();
        const d = H.lang === "en" ? now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
          : H.lang === "ja" ? now.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })  // 2026年11月1日(일본어판 날짜 꼴)
          : `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}.`;
        g.font = `300 27px ${sans}, -apple-system, sans-serif`;
        g.fillStyle = "#626262";
        g.textAlign = "right";
        g.textBaseline = "alphabetic";
        g.fillText(uiText("kept_on", "{d} 뜸", { d }), 1010, 1789);
        return (await new Promise(r => c.toBlob(r, "image/jpeg", 0.9))) || plain();
      } catch {
        return plain();
      }
    };
    // 끝 두 줄(인사 · 다리)이나 교보 단추로 아래 줄이 높아져 종이가 화면보다 길어지면 맨 아래로 — 시의 끝 줄이 아래 줄에 덮이지 않게(10/27 끝 화면 A)
    const toEnd = () => { if (sheet.scrollHeight > sheet.clientHeight + 1) sheet.scrollTo({ top: sheet.scrollHeight, behavior: reduce ? "auto" : "smooth" }); };
    const finish = () => {
      open = true;
      auto = false;
      apply(1);
      sheet.classList.add("done");
      rest(true);
      // '간직하기'를 누르는 순간 바로 건넬 수 있게 그림을 미리 만들어 둠(휴대폰 공유 창은 누른 직후에만 열림) — 뜬 날을 그린 그림
      img = img || dated();
      fit();  // 글꼴이 늦게 와 높이가 바뀌었을 수도 있어 한 번 더(같은 값이면 그대로)
      if (fitOver <= 0) toEnd();  // 한 장에 들어가면 그대로 · 맞춰도 넘치면 맨 위(첫 행이 보이게 — 10/28 A)
      close.focus({ preventScroll: true });
    };
    const loop = () => {
      const now = performance.now(), dt = (now - last) / 1000;
      last = now;
      if (!open) p = Math.max(0, Math.min(1, p + (pressing || auto ? dt / (auto ? 0.9 : 1.9) : -dt / 0.6)));
      apply(p);
      if (p >= 1 && !open) finish();
      if (!open && (pressing || auto || p > 0)) requestAnimationFrame(loop);
      else {
        ticking = false;
        if (!open && p === 0) hide();
      }
    };
    const run = () => { if (!ticking) { ticking = true; last = performance.now(); requestAnimationFrame(loop); } };
    let hold = 0, x0 = 0, y0 = 0;
    poemBox.addEventListener("pointerdown", ev => {
      if (open || (ev.pointerType === "mouse" && ev.button !== 0)) return;
      pressing = true;
      viaKey = false;
      back = hint;
      x0 = ev.clientX;
      y0 = ev.clientY;
      touch.style.left = x0 + "px";
      touch.style.top = y0 + "px";
      touch.classList.add("on");
      clearTimeout(hold);
      hold = setTimeout(() => {
        if (!pressing) return;
        poemBox.classList.add("pressing");
        show();
        if (reduce) { p = 1; finish(); } else run();
      }, 300);
    });
    const up = () => {
      clearTimeout(hold);
      if (!pressing) return;
      pressing = false;
      touch.classList.remove("on");
      poemBox.classList.remove("pressing");
      if (p > 0 || ticking) run();
    };
    addEventListener("pointerup", up);
    addEventListener("pointercancel", up);
    addEventListener("pointermove", ev => { if (pressing && !open && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) up(); }, { passive: true });
    poemBox.addEventListener("contextmenu", ev => { if (pressing) ev.preventDefault(); });
    hint.addEventListener("click", ev => {
      if (open) return;
      viaKey = ev.detail === 0;  // 키보드(Enter·Space)로 누르면 0
      back = hint;
      show();
      rest(true);  // 여는 0.9초 동안에도 종이 뒤로 Tab이 새지 않게(10/27 숨 재기 5) — 길게 누르는 길은 손가락이 닿아 있는 동안 inert가 터치를 끊을 수 있어 다 열린 뒤 그대로
      if (reduce) { p = 1; finish(); } else { auto = true; run(); }
    });
    const shut = () => {
      if (!open) return;
      open = false;
      rest(false);
      sheet.classList.remove("done");
      if (reduce) hide();
      else {
        sheet.style.transition = "transform .7s cubic-bezier(.65,0,.35,1)";
        sheet.style.transform = "translateY(102%)";
        setTimeout(() => { sheet.style.transition = ""; hide(); }, 720);
      }
      if (viaKey) back.focus();
      else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    };
    close.addEventListener("click", shut);
    addEventListener("keydown", ev => { if (ev.key === "Escape") { if (open) viaKey = true; shut(); } });
    // 간직한 뒤(10/27 끝 화면 A) — '간직하기' 자리를 교보 단추로(나가는 길은 사기 · 닫기 둘). 포커스가 간직하기에 있었으면 교보 단추로 옮김
    const kept = () => {
      if (!kb || !open) return;
      const had = document.activeElement === keep;
      keep.hidden = true;
      kb.hidden = false;
      fit();  // 교보 단추로 아래 줄이 높아지면 다시 맞춤(10/28 A)
      if (fitOver <= 0) toEnd();
      if (had) kb.focus({ preventScroll: true });
    };
    // 간직하기 — 손가락 기기는 공유 창(사진 저장·인스타로 보내기), 마우스 기기나 공유가 안 되면 그림 파일 내려받기(10/27 숨 재기 7 — 맥 Chrome · Safari도 공유 창을 먼저 띄웠음).
    // 손가락 기기는 CSS의 길게 누르기와 같은 기준(hover:none). 공유 창을 닫기만 했으면(AbortError) '간직하기' 그대로
    const touchOnly = matchMedia("(hover: none)");
    const inApp = /Instagram|FBAN|FBAV|KAKAOTALK|NAVER\(inapp|Line\/|; wv\)/i.test(navigator.userAgent);  // 앱 안 브라우저(인스타그램 · 카카오톡 등)는 내려받기가 조용히 막혀 저장 없이 끝났음(10/28 사용 편의 점검 ②)
    keep.addEventListener("click", async () => {
      const name = uiText("file", "남동원_탁본.jpg");
      const blob = img ? await img : null;
      if (blob && navigator.canShare && touchOnly.matches) {
        const file = new File([blob], name, { type: "image/jpeg" });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: uiText("share", "「탁본」 — 남동원") });
            kept();
            return;
          } catch (err) {
            if (err && err.name === "AbortError") return;
          }
        }
      }
      const url = blob ? URL.createObjectURL(blob) : ASSET + "img/takbon.jpg";  // 뜬 날을 그린 그림, 못 만들었으면 원래 그림
      if (inApp) {  // 그림을 종이 위에 띄우고 한 줄 — 길게 눌러 사진에 저장(교보 단추는 그 아래 그대로)
        let fig = sheet.querySelector(".kimg");
        if (!fig) {
          fig = document.createElement("figure");
          fig.className = "kimg";
          fig.append(document.createElement("figcaption"), document.createElement("img"));  // 안내가 먼저 — 읽고 나서 그림을 길게 누름
          sheet.querySelector(".sf").before(fig);  // 시 바로 아래 — 아래 줄(.sf)은 가로 칸이라 그 안이면 그림이 눌림
        }
        const im = fig.querySelector("img");
        im.src = url;
        im.alt = uiText("keep_alt", "뜬 「탁본」 한 장");
        fig.querySelector("figcaption").textContent = uiText("keep_hold", "그림을 길게 눌러 사진에 저장하세요");
        kept();
        // 그림을 다 불러온 뒤 제목 바로 아래로 — 그 전에 맞추면 그림 높이가 0이라 아래 단추 줄 뒤에 가려졌음
        const show = () => { const st = sheet.querySelector(".st").getBoundingClientRect().bottom - sheet.getBoundingClientRect().top; sheet.scrollTo({ top: Math.max(0, fig.offsetTop - st - 16), behavior: reduce ? "auto" : "smooth" }); };
        if (im.complete && im.naturalWidth) requestAnimationFrame(show); else im.addEventListener("load", show, { once: true });
        return;
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.append(a);
      a.click();
      a.remove();
      if (blob) setTimeout(() => URL.revokeObjectURL(url), 10000);
      kept();
    });
  }

  // 맨 위 띠: 넘기면 아래 선이 생기고 뒤가 흐리게 비침
  const top = document.querySelector(".top");
  if (top) {
    let ly = scrollY;
    const sc = () => {
      const y = scrollY;
      top.classList.toggle("sc", y > 8);
      // ⑥ 아래로 내리면 띠가 숨고 조금이라도 올리면 나타남(11/4 동원 '넣기' — 손반응열_v1 06) · 맨 위 120px 안 · 띠 안에 초점이 있으면 늘 보임
      if (y > ly + 4 && y > 120 && !top.contains(document.activeElement)) top.classList.add("hide");
      else if (y < ly - 4 || y <= 120) top.classList.remove("hide");
      ly = y;
    };
    top.addEventListener("focusin", () => top.classList.remove("hide"));
    // 가장자리 안개(11/4 동원 'A 위 · 아래 안개' — dmcg.co): 위 안개는 띠 바로 밑(띠가 숨으면 화면 맨 위) · 맨 위에선 없음 · 아래 안개는 맨 아래에 닿으면 없음
    const fogT = document.createElement("i"), fogB = document.createElement("i");
    fogT.className = "fog t"; fogB.className = "fog b";
    fogT.setAttribute("aria-hidden", "true"); fogB.setAttribute("aria-hidden", "true");
    document.body.append(fogT, fogB);
    const fog = () => {
      const y = scrollY;
      fogT.classList.toggle("on", y > 8);
      fogT.classList.toggle("up", top.classList.contains("hide"));
      fogB.classList.toggle("on", innerHeight + y < document.documentElement.scrollHeight - 4);
    };
    const toph = () => H.style.setProperty("--toph", top.offsetHeight + "px");
    toph(); fog();
    addEventListener("scroll", () => requestAnimationFrame(fog), { passive: true });  // 띠 숨김(sc)이 먼저 정해진 뒤에
    addEventListener("resize", () => { toph(); fog(); }, { passive: true });
    sc();  // 쪽 가운데에서 다시 열어도(새로 고침 · #주소) 처음부터 맞게 — 연락하기 상자의 테두리 · 먹 채움이 이 표시를 따름(10/29 고침 2)
    addEventListener("scroll", sc, { passive: true });
  }

  // 문의 폼: Formspree 주소가 들어가기 전에는 보내지 않고 안내만
  // 방명록 보내기(10/26 A — 설계 v2) — fetch로(쿠키 없이 · reCAPTCHA 없이), 보낸 뒤엔 '받았다'만 · 한도가 차면(429) 다음 달에 · 보내는 동안 단추를 잠금
  // 보낸 뒤 완료 화면(11/2 동원 예시 '메일을 성공적으로 발송하였습니다' → 버튼 'A 완료 화면 (권장)' — 목업 기준/브랜드 시안/보낸뒤화면시안_v1_휴대폰.png):
  // 쓰던 칸이 원 안 체크 · 굵은 한 줄 · 옅은 한 줄 · 가는 선 · '새로 쓰기' · '첫 화면으로'로 바뀜(두 번 보내기를 막음). whole이면 box의 안을 통째로(방명록 카드), 아니면 box 자리에(연락 폼)
  // '새로 쓰기'는 비운 칸을 되돌리고 글 칸에 초점 · 화면 읽기에는 굵은 줄로 초점(role=status)
  const done = (box, whole, title, sub) => {
    const kids = whole ? [...box.children] : [box];
    const ok = document.createElement("div");
    ok.className = "ok";
    ok.setAttribute("role", "status");
    ok.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10.5"/><path d="M7.6 12.3l3 3 5.8-6.2"/></svg>'
      + '<p class="ot" tabindex="-1"></p><p class="os"></p><div class="ob"><button type="button"></button><a></a></div>';
    ok.querySelector(".ot").textContent = title;
    ok.querySelector(".os").textContent = sub;
    const again = ok.querySelector("button"), home = ok.querySelector("a");
    again.textContent = uiText("done_again", "새로 쓰기");
    home.textContent = uiText("done_home", "첫 화면으로");
    home.href = (document.querySelector(".top .logo") || {}).href || "/";
    const folded = box.classList.contains("fold");  // ⑦ 접혀 올라간 뒤면 완료 화면이 떠오르며 원 → 체크가 그어짐
    if (folded) { box.classList.remove("fold"); ok.classList.add("in"); }
    if (whole) { kids.forEach(k => k.remove()); box.append(ok); } else box.replaceWith(ok);
    ok.querySelector(".ot").focus({ preventScroll: true });
    again.addEventListener("click", () => {
      if (whole) { ok.remove(); kids.forEach(k => box.append(k)); } else ok.replaceWith(box);
      const ta = box.querySelector("textarea");
      if (ta) ta.focus();
    });
  };

  const gbf = document.querySelector("form.gbf");
  if (gbf) {
    const gbSend = gbf.querySelector(".send"), gbMsg = gbf.querySelector(".msg"), gbPromise = gbMsg.textContent;  // 단추 아래 약속 한 줄(보내는 동안 상태로 바뀌었다가 되돌림)
    // 글자 수(11/2 엽서 한 장) — 글 칸 아래 '0 / 200'을 켜고 칠 때마다 셈 · 보낸 뒤 비우면 다시 0
    const gbTa = gbf.querySelector("textarea"), gbCnt = gbf.querySelector(".cnt");
    // 쓰던 글 지켜 두기(11/3 동원 '다정한 UX 7가지' ① → 목업 기준/브랜드 시안/방명록임시저장시안_v1_휴대폰_A·B.png → 'A 조용히 되살림 (권장)'):
    // 칠 때마다 이 기기의 브라우저 저장소(localStorage gb-draft — 쿠키 아님 · 서버로 보내지 않음)에 글과 적은 때를 둠 → 다시 열면 안내 없이 그대로(Gmail 임시보관함 꼴)
    // 보내면(reset) 지움 · 7일 지나면 지움(같이 쓰는 PC 대비) · 저장소가 막힌 브라우저(사생활 보호 창 등)는 지금처럼 그냥 둠
    const DK = "gb-draft", WEEK = 7 * 864e5;
    const dSet = v => { try { if (v) localStorage.setItem(DK, JSON.stringify({ t: v, at: Date.now() })); else localStorage.removeItem(DK); } catch {} };
    if (gbTa) {
      try {
        const d = JSON.parse(localStorage.getItem(DK) || "null");
        if (d && Date.now() - d.at < WEEK) { if (!gbTa.value) gbTa.value = d.t; } else if (d) dSet("");
      } catch { dSet(""); }
      gbTa.addEventListener("input", () => dSet(gbTa.value));
      gbf.addEventListener("reset", () => dSet(""));
    }
    if (gbTa && gbCnt) {
      const n = gbCnt.querySelector("span"), count = () => { n.textContent = gbTa.value.length; };
      gbTa.addEventListener("input", count);
      gbf.addEventListener("reset", () => setTimeout(count));
      count();
      gbCnt.hidden = false;
    }
    gbSend.addEventListener("touchstart", () => {}, { passive: true });  // 아이폰 누름 모양(문의 단추와 같음)
    // ⑦ 누르면 쓰던 칸이 0.32초에 위로 접혀 올라감 → 받으면 완료 화면(11/4 동원 'A 엽서가 접혀 올라감' — 방명록보냄_v1) · 못 보내면 다시 펼쳐 글을 돌려줌 · 움직임 줄이기면 지금처럼 바로
    const gbCard = gbf.closest(".card");
    const fold = () => {
      if (!gbCard || H.getAttribute("data-motion") === "reduce" || matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
      gbCard.classList.add("fold");
      return new Promise(r => setTimeout(r, 320));
    };
    const unfold = () => { if (gbCard) gbCard.classList.remove("fold"); };
    gbf.addEventListener("submit", async ev => {
      ev.preventDefault();
      gbMsg.textContent = uiText("sending", "보내는 중…");
      gbSend.disabled = true;
      const folded = fold();
      try {
        if (gbf.dataset.kind === "gform") {
          // 구글 폼(11/1): 이름 · 글 두 칸만 보냄(동의 칸은 우리 쪽 확인) · 숨은 칸이 차 있으면 보낸 척만(스팸 프로그램).
          // 구글은 다른 주소의 답을 읽게 해 주지 않아(no-cors) 보내기가 끝나면 받은 것으로 봄 — 켜는 날 시험 글로 시트에 들어오는지 확인
          const fd = new FormData(gbf), hp = gbf.querySelector(".hp");
          if (!(hp && hp.value)) {
            const body = new URLSearchParams();
            [...gbf.querySelectorAll("input[name^='entry.'], textarea[name^='entry.']")].forEach(x => body.append(x.name, fd.get(x.name) || ""));
            await fetch(gbf.dataset.endpoint, { method: "POST", mode: "no-cors", body });
          }
          await folded;
          gbf.reset();
          gbSend.disabled = false;
          gbMsg.textContent = gbPromise;
          done(gbf.closest(".card") || gbf, !!gbf.closest(".card"), uiText("gb_ok", "글을 보냈습니다."), uiText("gb_ok_sub", gbPromise));
          return;
        }
        const r = await fetch(gbf.dataset.endpoint, { method: "POST", body: new FormData(gbf), headers: { Accept: "application/json" } });
        await folded;
        if (!r.ok) unfold();
        gbMsg.textContent = r.ok ? gbPromise
          : r.status === 429 ? uiText("gb_full", "이번 달 받는 칸이 찼습니다. 다음 달에 다시 부탁드립니다.")
          : uiText("failed", "보내지 못했습니다. 잠시 뒤 다시 해 주세요.");
        if (r.ok) { gbf.reset(); done(gbf.closest(".card") || gbf, !!gbf.closest(".card"), uiText("gb_ok", "글을 보냈습니다."), uiText("gb_ok_sub", gbPromise)); }
      } catch {
        await folded;
        unfold();
        gbMsg.textContent = uiText("failed", "보내지 못했습니다. 잠시 뒤 다시 해 주세요.");
      }
      gbSend.disabled = false;
    });
  }

  // 메일(10/26) — 쪽 원본에는 뒤집은 두 조각만 있음(주소를 긁어 가는 프로그램 대비) → 여기서 주소와 mailto를 이어 붙임
  document.querySelectorAll("a.ml[data-u]").forEach(a => {
    const m = [...a.dataset.u].reverse().join("") + "@" + [...a.dataset.d].reverse().join("");
    a.textContent = m;
    a.href = "mailto:" + m;
  });

  // 누름 반응 하나로(10/28 ⑧ A) — 아이폰 Safari는 터치를 듣는 곳이 있어야 :active를 그림. 문서에 하나 두면 모든 링크 · 단추가 닿는 동안 옅어짐(style.css hover:none)
  document.addEventListener("touchstart", () => {}, { passive: true });

  const form = document.querySelector("form.ask");
  // 아이폰 Safari는 터치 이벤트가 붙은 요소에만 누름(:active) 모양을 보여 줌[MDN 호환성 자료] — '보내기'를 누르는 동안 먹으로(10/24 ⑨ A)
  const send = form && form.querySelector(".send");
  if (send) send.addEventListener("touchstart", () => {}, { passive: true });
  if (form) form.addEventListener("submit", async ev => {
    ev.preventDefault();
    const msg = form.querySelector(".msg");
    if (!form.dataset.endpoint) {
      msg.textContent = uiText("form_off", "아직 연결 전입니다. 인스타그램으로 연락해 주세요.");
      return;
    }
    msg.textContent = uiText("sending", "보내는 중…");
    try {
      const r = await fetch(form.dataset.endpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
      msg.textContent = r.ok ? "" : uiText("failed", "보내지 못했습니다. 잠시 뒤 다시 해 주세요.");
      if (r.ok) { form.reset(); done(form, false, uiText("ask_ok", "메시지를 보냈습니다."), uiText("ask_ok_sub", "답장 드리겠습니다.")); }
    } catch {
      msg.textContent = uiText("failed", "보내지 못했습니다. 잠시 뒤 다시 해 주세요.");
    }
  });

  // 꼬리표 지우기(10/27 관리 화면 세션 부탁 → 동원 '넣어') — 방문 셈(GoatCounter)이 이 방문을 센 뒤 주소창에서 utm_*만 뺌(다른 값 · # · 기록 상태는 그대로).
  // 꼬리표 링크(예: 인스타 스토리)를 받은 사람이 주소창 주소를 그대로 다시 퍼뜨려도 그 방문이 같은 꼬리표로 쌓이지 않게(기준/관리 화면 꼬리표 링크 칸 정의_v1.md 4절).
  // count.js는 실행되자마자(쪽이 보이면) 셈 주소를 만들어 보내고, 숨은 탭이면 보이게 될 때 셈 — 셀 때의 location.search를 읽으므로 반드시 그 뒤에[출처 gc.zgo.at/count.js].
  // '실행되자마자'는 count.js 줄이 쪽 맨 끝(body 안, async — build.py gc_tag)이라 실행될 때 body가 있어서임. 줄 자리를 옮기면 이 차례를 다시 시험(scratch utm_check.py)
  // count.js를 못 받으면(막힘) 셀 일이 없으니 바로 뺌
  // 11/1(관리 화면 세션이 찾음 — GA4로 바뀌며 아래가 GoatCounter 줄이 있을 때만 돌아 꺼져 있었음): GA4 판(동의 창 #cz가 있는 쪽)은 consent.js가 한 곳에서 뺌
  // (셈 뒤 — config의 page_location에 처음 주소 · 거부면 바로 · 고르기 전엔 그대로). 여기는 동의 창이 없는 빌드만 — GoatCounter면 셈 뒤, 방문 셈이 아무것도 없으면 바로
  const gcs = document.querySelector("script[data-goatcounter]");
  if (!document.getElementById("cz") && /[?&]utm_/i.test(location.search)) {
    let untagged = false;
    const unTag = () => {
      if (untagged) return;
      untagged = true;
      const q = new URLSearchParams(location.search);
      [...q.keys()].filter(k => /^utm_/i.test(k)).forEach(k => q.delete(k));
      const s = q.toString();
      history.replaceState(history.state, "", location.pathname + (s ? "?" + s : "") + location.hash);
    };
    const after = () => {
      if (!("visibilityState" in document) || document.visibilityState === "visible") { unTag(); return; }  // count.js와 같은 조건
      // count.js가 먼저 단 visibilitychange가 먼저 돌아 셈이 나간 뒤에 뺌(같은 사건은 단 차례대로 돎)
      const v = () => { if (document.visibilityState === "visible") { document.removeEventListener("visibilitychange", v); setTimeout(unTag, 0); } };
      document.addEventListener("visibilitychange", v);
    };
    if (!gcs) unTag();  // 방문 셈이 없는 빌드 — 셀 일이 없으니 바로
    else if (window.goatcounter && typeof window.goatcounter.count === "function") after();
    else {
      gcs.addEventListener("load", after, { once: true });
      gcs.addEventListener("error", unTag, { once: true });
      // count.js가 이 스크립트보다 먼저 막혔으면(광고 차단 등) 위 사건은 이미 지나감 — 쪽을 다 받은 뒤(async 스크립트까지) 한 번 더 봄
      addEventListener("load", () => { if (!(window.goatcounter && typeof window.goatcounter.count === "function")) unTag(); }, { once: true });
    }
  }

  // 쪽 안에서 옮긴 뒤 주소창의 #은 지움 — 그 주소를 나누면 받은 사람이 문 · 첫 화면 없이 그 칸에서 시작했음(10/28 동원 'A 주소창의 # 지우기').
  // 깊은 링크로 들어온 첫 주소(#t23 등)는 그대로 · 뒤로 가기는 전처럼 앞 칸 차례로(기록 칸은 남고 주소만 바뀜)
  addEventListener("hashchange", () => { if (location.hash) history.replaceState(history.state, "", location.pathname + location.search); });
  // 접힌 묶음(영어판 차례의 부 · 지난 소식) 안의 줄로 가는 쪽 안 링크는 먼저 펼침 — 첫 화면 '이달의 한 줄'(#tN) 등(10/29 영어판 차례 접기)
  document.addEventListener("click", ev => {
    const a = ev.target.closest && ev.target.closest('a[href^="#"]'), id = a && a.getAttribute("href").slice(1);
    const el = id && document.getElementById(decodeURIComponent(id)), fold = el && el.closest("details");
    if (fold && !fold.open) fold.open = true;
  });
  // 깊은 링크(#t23 · #l9 · #n1 …)로 열면 그 줄에 찾기와 같은 옅은 바탕 1.6초(10/28 사용 편의 점검 ⑤ — 어느 줄로 왔는지 표시가 없었음)
  if (location.hash) {
    const hit = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    const fold = hit && hit.closest("details");
    if (fold && !fold.open) { fold.open = true; hit.scrollIntoView({ block: "center" }); }  // 접힌 부 안의 줄이면 펼친 뒤 그 줄로
    if (hit && !hit.matches("section")) { hit.classList.add("hit"); setTimeout(() => hit.classList.remove("hit"), 1600); }
  }

  // 뒤로 가기로 창 닫기(10/28 사용 편의 점검 ① — 찾기 · 「탁본」 한 장 · 게시물 사진 창을 연 채 뒤로 가면 사이트를 떠났음).
  // 창이 열리면 기록 한 칸을 쌓고, 뒤로 가기면 그 창의 닫기를 누름 · 닫기 · Esc · 찾기 결과로 닫히면 쌓은 칸을 걷음(옮긴 자리는 되돌리지 않게)
  [[".srch", ".srch .x"], [".sheet", ".sheet .close"], [".pv", ".pvx"]].forEach(([w, x]) => {
    const el = document.querySelector(w), btn = document.querySelector(x);
    if (!el || !btn) return;
    let mine = false, popping = false;
    new MutationObserver(() => {
      if (!el.hidden && !mine) { mine = true; history.scrollRestoration = "manual"; history.pushState({ layer: w }, ""); }
      else if (el.hidden && mine) { mine = false; if (!popping && !leaving && history.state && history.state.layer === w) history.back(); popping = false; }
    }).observe(el, { attributes: true, attributeFilter: ["hidden"] });
    addEventListener("popstate", () => {
      setTimeout(() => { history.scrollRestoration = "auto"; }, 0);  // 되살리기는 이번 뒤로 가기가 끝난 뒤에 켬 — 바로 켜면 예전에 적어 둔 위치로 쪽이 옮겨졌음(찾기 2400 → 0)
      if (mine && !el.hidden) { popping = true; btn.click(); }
    });
  });
  // ── 마우스 반응 열(11/1 동원 버튼 '권하는 묶음으로 (권장)' — 패스트캠퍼스 강의 쪽에서 고른 열, 시안 `기준/브랜드 시안/고른열시안_v1.mp4`)
  // 마우스로만 하는 것은 마우스 기기(hover:hover · pointer:fine)에서만 · 움직이는 것은 '동작 줄이기'면 빼고 · 라이브러리 없이
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // ② 시집 첫 화면 책 장면(← '스크롤에 따라 장면이 바뀌는 히어로' · Aube) — 넓은 화면 · 움직임 허용이면 #home에 .scene(style.css). 첫 화면을 지나 내려가는 동안
  //   책 칸이 붙어 있고 책이 가운데로 옮겨 가며(--sx · 처음 20%) 한 바퀴(--ry 26° → 386°) · 라벨이 차례로 곁에(박물관 라벨 .lab에서 작품 · 지은이를 뺀 사양 · (이달의 한 줄) · 재료 · 소장처 —
  //   글만 옮기고 링크 '팔레트 보기 ↓' 같은 말은 뺌 · 링크는 화면 밖에 남긴 .lab이 그대로 맡음)
  const sBk = home && home.querySelector(".bk"), sB = sBk && sBk.querySelector(".b"), sLab = home && home.querySelector(".lab");
  if (sB && sLab && motion && matchMedia("(min-width: 1024px)").matches) {
    home.classList.add("scene");
    const sR = sBk.closest(".r"), side = ["L", "R", "L", "R"], at = [.12, .3, .48, .66];
    const cos = [...sLab.querySelectorAll("dl > div")].slice(2, 6).map((d, i) => {
      const c = document.createElement("div"), dd = d.querySelector("dd").cloneNode(true);
      dd.querySelectorAll("a").forEach(a => a.remove());
      c.className = "bco " + side[i];
      c.setAttribute("aria-hidden", "true");
      c.innerHTML = `<b>${d.querySelector("dt").textContent}</b>`;
      c.append(dd.textContent.replace(/\s*—\s*$/, "").trim());
      sR.appendChild(c);
      return c;
    });
    let geo = null, pend = false;
    const place = () => {
      sBk.style.setProperty("--sx", "0px");
      const rr = sR.getBoundingClientRect(), br = sBk.getBoundingClientRect(), mid = innerWidth / 2;
      geo = { sx: mid - (br.left + br.width / 2), max: Math.max(1, home.offsetHeight - innerHeight) };
      cos.forEach((c, i) => {
        c.style.top = (br.top - rr.top + br.height * (.14 + i * .2)) + "px";
        if (side[i] === "L") { c.style.right = (rr.left + rr.width - (mid - br.width / 2 - 52)) + "px"; c.style.left = "auto"; }
        else { c.style.left = (mid + br.width / 2 + 52 - rr.left) + "px"; c.style.right = "auto"; }
      });
    };
    const upd = () => {
      pend = false;
      if (!geo) place();
      const p = Math.min(1, Math.max(0, -home.getBoundingClientRect().top / geo.max)), q = Math.min(1, p / .2);
      sBk.style.setProperty("--sx", (geo.sx * q * q * (3 - 2 * q)).toFixed(1) + "px");
      if (p > 0) sB.style.setProperty("--ry", (26 + p * 360).toFixed(1) + "deg");  // 맨 위에서는 책 만지기(끌어 돌리기 · 누르기)가 정한 각 그대로
      home.classList.toggle("moved", p > .02);
      cos.forEach((c, i) => c.classList.toggle("on", p >= at[i]));
    };
    addEventListener("scroll", () => { if (!pend) { pend = true; requestAnimationFrame(upd); } }, { passive: true });
    addEventListener("resize", () => { geo = null; upd(); }, { passive: true });
    upd();
  }

  // ③ 「탁본」 칠(← '끌어서 하이라이트 커서') — 마우스로 끌어 고른 낱말이 손을 떼면 칠로 남음(고르는 동안의 선택 색 · 먹 바탕 + 흰 글과 같은 꼴). 복사는 그대로 · 칠한 낱말을 한 번 누르면 지움
  //   길게 누르기(탁본 한 장)는 8px 넘게 움직이면 풀리는 지금 규칙이라 겹치지 않음 · 낱말은 띄어쓰기 단위로 감쌈(행 id · 글은 그대로 — 찾기 · 깊은 링크 #l9 그대로)
  const verse = document.querySelector(".poem");
  if (verse && fine) {
    verse.querySelectorAll(".ln, .le").forEach(ln => {
      if (ln.children.length) return;  // 안에 다른 칸(기울임 등)이 있으면 그대로
      const parts = ln.textContent.split(/(\s+)/);
      ln.textContent = "";
      parts.forEach(w => {
        if (!w) return;
        if (/^\s+$/.test(w)) { ln.append(w); return; }
        const s = document.createElement("span");
        s.className = "w";
        s.textContent = w;
        ln.append(s);
      });
    });
    let down = null;
    verse.addEventListener("mousedown", ev => { if (ev.button === 0) down = [ev.clientX, ev.clientY]; });
    addEventListener("mouseup", ev => {
      if (!down) return;
      const far = Math.hypot(ev.clientX - down[0], ev.clientY - down[1]) > 6, sel = getSelection();
      down = null;
      if (!far) {
        const w = ev.target.closest && ev.target.closest(".poem .w.ink");
        if (w && sel.isCollapsed) w.classList.remove("ink");
        return;
      }
      if (sel.isCollapsed || !verse.contains(sel.anchorNode)) return;
      verse.querySelectorAll(".w").forEach(w => { if (sel.containsNode(w, true)) w.classList.add("ink"); });
    });
  }

  // ④ 「탁본」 읽기 진행(← '읽은 만큼 차오르는 진행 바') — 시 칸이 화면 위 30% 선을 지나는 동안 맨 위 띠 바로 아래 먹 줄이 차오름(모든 기기)
  const poemSec = document.querySelector("#poem");
  if (poemSec) {
    const bar = document.createElement("i");
    bar.className = "rbar";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    let pend = false;
    const upd = () => {
      pend = false;
      const r = poemSec.getBoundingClientRect(), y = innerHeight * .3;
      bar.style.transform = `scaleX(${Math.min(1, Math.max(0, (y - r.top) / Math.max(1, r.height - y))).toFixed(4)})`;
      bar.classList.toggle("on", r.top < y && r.bottom > 0);
    };
    addEventListener("scroll", () => { if (!pend) { pend = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }


  // ⑦ 유튜브 썸네일 스틸 넘김(← '올리면 재생되는 썸네일') — 마우스 기기에서 썸네일 위 커서의 가로 자리 = 몇째 장(보도 자료 스틸 · 영상 · 예고편은 쓰지 않음). 스틸은 처음 올릴 때 받음
  const nt = document.querySelector(".nt[data-stills]");
  if (nt && fine) {
    const img = nt.querySelector("img"), first = img.getAttribute("src"), list = nt.dataset.stills.split("|");
    const bar = document.createElement("i");
    bar.className = "sbar";
    bar.style.setProperty("--n", list.length);
    nt.appendChild(bar);
    let got = false, k = -1;
    nt.addEventListener("mouseenter", () => { if (!got) { got = true; list.forEach(u => { new Image().src = u; }); } });
    nt.addEventListener("mousemove", ev => {
      const r = nt.getBoundingClientRect(), n = Math.max(0, Math.min(list.length - 1, Math.floor((ev.clientX - r.left) / r.width * list.length)));
      if (n !== k) { k = n; img.src = list[n]; bar.style.setProperty("--k", n); }
      nt.classList.add("scrub");
    });
    nt.addEventListener("mouseleave", () => { k = -1; img.src = first; nt.classList.remove("scrub"); });
  }

  // ⑨ 연락 — '인스타그램 메시지로 남기기'가 커서 쪽으로 다가옴(← '마그네틱 버튼') · 단추 둘레 90px 안에서 0.32배 · 최대 18px · 1.04배(마우스 기기 · 움직임 허용)
  const ask = document.querySelector(".ask-off a");
  if (ask && fine && !reduce) {
    let box = null;
    addEventListener("resize", () => { box = null; }, { passive: true });
    addEventListener("mousemove", ev => {
      if (!box) {
        ask.style.transform = "";
        const r = ask.getBoundingClientRect();
        box = { x: r.left + r.width / 2, y: r.top + scrollY + r.height / 2, R: Math.max(r.width, r.height) / 2 + 90 };
      }
      const dx = ev.clientX - box.x, dy = ev.clientY + scrollY - box.y;
      if (Math.hypot(dx, dy) < box.R) {
        let tx = dx * .32, ty = dy * .4;
        const L = Math.hypot(tx, ty);
        if (L > 18) { tx *= 18 / L; ty *= 18 / L; }
        ask.classList.add("pull");
        ask.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(1.04)`;
      } else if (ask.classList.contains("pull")) { ask.classList.remove("pull"); ask.style.transform = ""; }
    }, { passive: true });
  }

  // ⑩ 쪽 사이 원형 전환(← '페이지 인트로') — 맨 위 띠의 쪽 링크(이름 · 메뉴 넷 · 연락하기)를 누르면 누른 자리로 원이 닫히고(0.55초) 다음 쪽이 그 자리에서 열림(0.8초 —
  //   머리 스크립트가 남긴 cin을 여기서 copen으로). 새 탭 · 수정 키 · 같은 쪽 · '동작 줄이기'면 그대로 · 뒤로 가기로 돌아오면(bfcache) 원을 거둠
  if (H.classList.contains("cin")) requestAnimationFrame(() => requestAnimationFrame(() => {
    H.classList.add("copen");
    setTimeout(() => H.classList.remove("cin", "copen"), 900);
  }));
  if (!reduce) document.addEventListener("click", ev => {
    const a = ev.target.closest && ev.target.closest("header.top a[href]");
    if (!a || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || a.target === "_blank") return;
    const to = new URL(a.href, location.href);
    if (to.origin !== location.origin || to.pathname === location.pathname) return;
    ev.preventDefault();
    const r = a.getBoundingClientRect(), x = ev.detail ? ev.clientX : r.left + r.width / 2, y = ev.detail ? ev.clientY : r.top + r.height / 2;  // 키보드(Enter)면 링크 가운데에서
    try { sessionStorage.setItem("cto", JSON.stringify([Math.round(x), Math.round(y), Date.now()])); } catch (x2) { /* 사생활 모드 — 다음 쪽은 원 없이 */ }
    H.style.setProperty("--cx", x + "px");
    H.style.setProperty("--cy", y + scrollY + "px");  // 닫히는 원은 body 기준(내려 둔 만큼 더함)
    H.classList.add("cgo");
    void H.offsetWidth;
    H.classList.add("cout");
    setTimeout(() => { location.href = to.href; }, 560);
  });
  // 소개 첫 화면(11/1 첫 화면 TOKA식 A): 큰 이름의 글꼴이 오면 들어오는 차례를 켬(.go — 글자 → 사람 → 시각 → 한 문장 → 첫 시집 · 단추, style.css).
  // 글꼴은 0.8초까지만 기다림(문 장면과 같은 원칙 — 늦으면 대신 글꼴로 시작하고 온 뒤 바뀜). 구석 시각은 서울 시각을 30초마다 — 세 판 모두 영어(9:58 PM)
  const tk = document.querySelector(".tk");
  if (tk) {
    const w = tk.querySelector(".tk-w"), go = () => tk.classList.add("go");
    if (w && document.fonts && document.fonts.load) Promise.race([document.fonts.load(`${getComputedStyle(w).fontWeight} 1em ${getComputedStyle(w).fontFamily}`, w.textContent), new Promise(r => setTimeout(r, 800))]).then(go, go);
    else go();
    const tm = tk.querySelector(".tk-c .tm");
    if (tm && window.Intl) {
      const fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Seoul" });  // 세 판 모두 영어 9:58 PM(11/1 밤 동원 "시계는 그냥 차라리 영어로 … AM PM")
      const tick = () => { tm.textContent = fmt.format(new Date()); };
      tick();
      setInterval(tick, 30000);
    }
  }
  addEventListener("pageshow", ev => { if (ev.persisted) H.classList.remove("cgo", "cout", "cin", "copen"); });

  // ① 사진이 받아지면 0.5초에 스며듦 · 받는 동안은 옅은 회색 자리(11/4 동원 '넣기' — 손반응열_v1 01 · recent.design) — 이미 받아 둔 사진은 그대로
  document.querySelectorAll(".wall .wt img, #video .nt img, #video img.big").forEach(im => {
    if (im.complete && im.naturalWidth) return;
    im.classList.add("fi");
    const done = () => im.classList.add("ld");
    im.addEventListener("load", done, { once: true });
    im.addEventListener("error", done, { once: true });
  });
  // ⑥ 휴대폰에서 쪽을 내리는 손을 인스타 벽 흐름이 따라감 — 내린 빠르기만큼 왼쪽 줄은 손과 같은 쪽, 오른쪽 줄은 반대로 더 흐르고 0.12초에 걸쳐 원래 흐름(반 바퀴 60초)으로(11/4 동원 'A 손을 흐름이 따라감' — 벽끌기_v1)
  // 쪽 스크롤은 막지 않음 · 화면에 보일 때만 돎 · 움직임 줄이기를 켜면 바로 멈추고 스타일 흐름으로 돌려줌
  const wcols = document.querySelector(".wall .cols");
  if (wcols && motion && matchMedia("(pointer: coarse)").matches) {
    let S = [], run = false, lt = 0, ly = 0;
    const ty = c => { const m = getComputedStyle(c).transform; return m && m !== "none" ? new DOMMatrixReadOnly(m).m42 : 0; };  // 스타일 흐름이 지금 있는 자리에서 이어받음
    const tick = n => {
      if (!run) return;
      if (H.getAttribute("data-motion") === "reduce") { run = false; wcols.classList.remove("flow"); S.forEach(s => { s.c.style.transform = ""; }); return; }
      const dt = Math.min(50, n - lt), sv = (scrollY - ly) / Math.max(1, dt);
      lt = n; ly = scrollY;
      S.forEach(s => {
        const half = s.c.offsetHeight / 2;
        if (!half) return;
        s.v += (sv * 0.8 * s.dir - s.v) * Math.min(1, dt / 120);
        if (!s.c.matches(":focus-within")) s.pos += (s.dir * half / 60000 + s.v) * dt;
        s.pos = ((s.pos % half) - half) % half;
        s.c.style.transform = `translateY(${s.pos}px)`;
      });
      requestAnimationFrame(tick);
    };
    new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) { run = false; return; }
      if (run || H.getAttribute("data-motion") === "reduce") return;
      S = [...wcols.querySelectorAll(".col")].filter(c => c.offsetParent).map((c, i) => {
        const old = S.find(o => o.c === c);
        return { c, dir: i % 2 ? 1 : -1, v: 0, pos: old ? old.pos : ty(c) };
      });
      wcols.classList.add("flow");
      run = true; lt = performance.now(); ly = scrollY;
      requestAnimationFrame(tick);
    }).observe(wcols);
  }
  // 글자 팔레트에 손을 대면 그 글자 — 누른(마우스는 올린) 글자를 먹 바탕으로 뒤집고, 아래 줄을 '「빛」 14번 — 612가지 가운데 117번째로 많이 쓴 글자'로(11/4 동원 'A 아래 줄이 그 글자로' — 팔레트누름_v1 · Taper 「16 anna」)
  // 글자 612개를 요소로 쪼개지 않고 글자 자리(Range)를 한 번 재어 둠(팔레트 크기가 바뀌면 다시) · 표시는 CSS Highlight API(없는 브라우저는 줄만 바뀜) · 빈 곳을 누르거나 마우스가 나가면 원래 줄
  const pal = document.querySelector("#palette .pal"), pk = document.querySelector("#palette .pk");
  if (pal && pk && pal.dataset.n) {
    const N = pal.dataset.n.split(",").map(Number), orig = pk.textContent, HL = window.CSS && CSS.highlights && window.Highlight;
    let cells = null, cw = 0, cur = -1;
    const measure = () => {
      const o = pal.getBoundingClientRect(), w = document.createTreeWalker(pal, NodeFilter.SHOW_TEXT);
      cells = []; cw = o.width;
      for (let n; (n = w.nextNode());) for (let k = 0; k < n.textContent.length; k++) {
        const r = document.createRange(); r.setStart(n, k); r.setEnd(n, k + 1);
        const b = r.getBoundingClientRect();
        cells.push({ r, x0: b.left - o.left, x1: b.right - o.left, y0: b.top - o.top, y1: b.bottom - o.top });
      }
    };
    const show = i => {
      if (i === cur) return;
      cur = i;
      if (i < 0) { pk.textContent = orig; if (HL) CSS.highlights.delete("pg"); return; }
      const c = cells[i], ch = c.r.toString(), num = v => v.toLocaleString(H.lang || "ko");
      pk.textContent = uiText("pal_one", "「{ch}」 {n}번", { ch, n: num(N[i]), rank: num(i + 1), all: num(N.length) });
      if (HL) CSS.highlights.set("pg", new Highlight(c.r));
    };
    const pick = ev => {
      const o = pal.getBoundingClientRect();
      if (!cells || Math.abs(o.width - cw) > 0.5) measure();
      const x = ev.clientX - o.left, y = ev.clientY - o.top;
      return cells.findIndex(c => x >= c.x0 && x < c.x1 && y >= c.y0 && y < c.y1);
    };
    addEventListener("resize", () => { cells = null; }, { passive: true });  // 글꼴이 늦게 오거나 폭이 바뀌면 다시 잼
    if (document.fonts) document.fonts.addEventListener("loadingdone", () => { cells = null; });
    pal.addEventListener("pointermove", ev => { if (ev.pointerType === "mouse") show(pick(ev)); });
    pal.addEventListener("pointerleave", ev => { if (ev.pointerType === "mouse") show(-1); });
    pal.addEventListener("click", ev => show(pick(ev)));
  }
  // ⑤ 밑줄 단추 끝의 화살표(↗ · ↓)만 따로 — 손을 대면 그 방향으로 살짝(11/4 동원 '넣기' — 손반응열_v1 05)
  document.querySelectorAll(".buy").forEach(a => {
    const last = a.lastChild;
    if (!last || last.nodeType !== 3 || !/[↗↓]\s*$/.test(last.textContent)) return;
    const ch = last.textContent.trim().slice(-1);
    last.textContent = last.textContent.replace(/[↗↓]\s*$/, "");  // 앞 빈칸은 남김 — 글자(읽기 도구 · 찾기)가 전과 같게
    const s = document.createElement("span");
    s.className = "ar " + (ch === "↗" ? "ne" : "dn");
    s.setAttribute("aria-hidden", "true");
    s.textContent = ch;
    a.append(s);
  });

  // 공유(11/4 동원 'A 단추 줄 끝' — 목업 공유단추시안_v1): 휴대폰은 기본 공유 시트(Web Share API — 카카오톡 · 메시지 …), 공유 시트가 없으면 주소를 복사하고 2초 동안 '링크를 복사했습니다'
  document.querySelectorAll(".buy.shr").forEach(b => {
    b.hidden = false;
    b.addEventListener("click", async () => {
      const title = (document.querySelector('meta[property="og:title"]') || {}).content || document.title;
      const url = (document.querySelector('link[rel="canonical"]') || {}).href || location.href;
      if (navigator.share) { try { await navigator.share({ title, url }); } catch (x) { /* 닫음 */ } return; }
      try { await navigator.clipboard.writeText(url); } catch (x) { return; }
      const lab = b.firstChild, was = lab.textContent;
      lab.textContent = uiText("shared", "링크를 복사했습니다");
      setTimeout(() => { lab.textContent = was; }, 2000);
    });
  });

  // 맨 위로(11/1 밤 — 고야드 실측): 360px 넘게 내리면 오른쪽 아래 동그라미가 나타나고, 누르면 맨 위로(동작 줄이기면 바로).
  // 키보드로 눌렀으면(detail 0) 맨 위 띠의 첫 링크로 초점을 옮겨 이어서 읽게. 자바스크립트가 없으면 숨은 채로(hidden)
  const toTop = document.querySelector(".totop");
  if (toTop) {
    toTop.hidden = false;
    const showTop = () => {
      toTop.classList.toggle("on", scrollY > 360);
      toTop.style.setProperty("--p", (scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)).toFixed(3));  // ⑩A 테두리가 내린 만큼 채워짐(11/4)
    };
    addEventListener("scroll", showTop, { passive: true });
    showTop();
    toTop.addEventListener("click", ev => {
      scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      if (!ev.detail) { const f = document.querySelector("header.top a"); if (f) f.focus({ preventScroll: true }); }
    });
  }
})();
