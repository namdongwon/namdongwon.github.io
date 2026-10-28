// namdongwon.com — 움직임 C(큰 장면 + 결) · 사진 넘기기 · 문의 폼
// 장면: 문(첫 방문 한 번) · 탁본 · 기록 / 결: 이름을 자모로 쳐 나감 · 칸 요소가 차례로 떠오름 · 맨 위 띠 — 칸 사이 셔터는 10/25 뺌
// '동작 줄이기'를 켠 사람과 IntersectionObserver가 없는 브라우저는 움직임 없이 다 보이게 둔다
(() => {
  const H = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      "#photo .nav2", ".bhead", ".btext", ".btoc h3", ".btoc .parts > div", ".btoc .tail", ".ch2", ".big", ".vt", ".sub", ".toc li", ".empty", "#contact .h2", ".lead", ".ask > *", ".sns", ".colo", "#palette .h2", ".pal", ".pk"];
    const seen = new Set();
    sels.forEach(sel => document.querySelectorAll(sel).forEach(el => {
      if (seen.has(el)) return;
      seen.add(el);
      el.classList.add("rv");
      el.style.setProperty("--i", Math.max(0, [...el.parentElement.children].filter(c => c.matches(sel)).indexOf(el)));
    }));
    once([...document.querySelectorAll(".rv, .strip, .nt")], el => el.classList.add("in"), { rootMargin: "0px 0px -8% 0px" });  // .nt — '준비 중' 점은 보일 때 세 번만 숨 쉼
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
    // 점 한 칸: 컴퓨터 17px · 휴대폰 12px — 끝 값(1,121이면 26칸)이 기록 칸 폭에 다 안 들어가면 들어갈 때까지 줄임(10/24, 좁은 화면·태블릿에서 칸을 넘지 않게).
    // 두 숫자는 같은 크기로(넓은 쪽에 맞춤) · 화면 폭이 바뀌면 다시 잼
    const span = c => { const f = (+c.dataset.to).toLocaleString("ko-KR"); return [...f].reduce((n, ch) => n + F[ch][0].length, 0) + f.length - 1; };
    let step = 12;
    const fit = () => {
      const max = innerWidth >= 768 ? 17 : 12, room = rec.clientWidth, cols = Math.max(1, ...dots.map(span));
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
          x.fillStyle = m[r][k] === "#" ? (faint ? dim : on) : off;
          x.fillRect((col + k) * step, r * step, cell, cell);
        }
        col += m[0].length + 1;
      });
    };
    const drawn = new Map();  // 칸 그림마다 지금까지 칠한 칸 수
    const grid = c => {
      const W = c.clientWidth, cell = 6, gap = 2, step = cell + gap, cols = Math.max(1, Math.floor((W + gap) / step));
      return { W, cell, step, cols, rows: Math.ceil(+c.dataset.n / cols) };
    };
    // 처음부터 다 그림(처음 · 화면 폭이 바뀔 때). 선명도는 2배까지만
    const full = (c, n) => {
      const g = grid(c), dpr = Math.min(2, devicePixelRatio || 1);
      drawn.set(c, n);
      if (!g.W) return;
      c.width = Math.round(g.W * dpr);
      c.height = Math.round(g.rows * g.step * dpr);
      c.style.height = g.rows * g.step + "px";
      const x = c.getContext("2d"), on = tone("--ink"), off = tone("--cell-off");
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let i = 0; i < +c.dataset.n; i++) {
        x.fillStyle = i < n ? on : off;
        x.fillRect((i % g.cols) * g.step, Math.floor(i / g.cols) * g.step, g.cell, g.cell);
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


  // 지금 보는 칸(10/24 B) — 위 메뉴에서 그 칸 이름만 먹색, 밑줄이 칸을 따라 미끄러짐(첫 화면엔 없음).
  // 지금 칸 = 화면 위에서 45% 줄에 걸친 칸 · 화면 읽기 프로그램에는 aria-current로 '지금 위치'
  const nav = document.querySelector(".top nav");
  if (nav && "IntersectionObserver" in window) {
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const ul = document.createElement("i");
    ul.className = "ul";
    ul.setAttribute("aria-hidden", "true");
    nav.append(ul);
    let on = null;
    const place = () => {
      const was = ul.classList.contains("on");
      if (on) {
        if (!was) ul.style.transition = "none";  // 처음 나타날 땐 그 자리에서(왼쪽 끝에서 미끄러져 오지 않게)
        ul.style.width = on.offsetWidth - (parseFloat(getComputedStyle(on).letterSpacing) || 0) + "px";  // 글자 뒤 자간(.12em)만큼 빼서 글자 폭에 맞춤
        const dy = on.offsetTop + on.offsetHeight - nav.clientHeight;  // 메뉴가 두 줄이면(글 간격을 넓힌 읽기 도구 등 — 돋보기 · 언어 단추가 아랫줄로) 밑줄도 그 칸 이름의 줄 바닥으로
        ul.style.transform = `translate(${on.offsetLeft}px, ${Math.abs(dy) > 2 ? dy : 0}px)`;  // 한 줄일 때는 반올림 차이로 1px 흔들리지 않게 0
        if (!was) { void ul.offsetWidth; ul.style.transition = ""; }
      }
      ul.classList.toggle("on", !!on);
    };
    const show = id => {
      on = links.find(a => a.getAttribute("href") === "#" + id) || null;
      links.forEach(a => {
        a.classList.toggle("on", a === on);
        if (a === on) a.setAttribute("aria-current", "location");
        else a.removeAttribute("aria-current");
      });
      place();
    };
    const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) show(e.target.id); }), { rootMargin: "-45% 0px -54% 0px" });
    document.querySelectorAll("main > section").forEach(s => spy.observe(s));
    // 글꼴이 늦게 오거나 화면 폭이 바뀌면 글자 폭이 달라지므로 밑줄 자리를 다시 잼
    if (document.fonts) document.fonts.ready.then(place);
    let pt = 0;
    addEventListener("resize", () => { clearTimeout(pt); pt = setTimeout(place, 150); });
  }
  // 화면 밝게 · 어둡게 · 시스템(10/26 동원 "웹사이트 화면에 화이트모드 다크모드 시스템설정 있으면 좋겠다" → A 먹 종이) — 판권면 세 단추.
  // 고른 것은 이 기기에만 기억(localStorage theme — 쿠키 아님), 처음은 밝게. 첫 그림 전에 머리 스크립트가 data-theme을 붙이고 여기서는 단추 · 브라우저 막대 색만
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
  const swap = document.querySelector(".top nav .lang");
  if (swap) swap.addEventListener("click", ev => {
    const y = innerHeight / 3;
    const hit = [...document.querySelectorAll("main [id]")].filter(el => { const r = el.getBoundingClientRect(); return r.height && r.top <= y && r.bottom > y; })
      .sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height)[0];
    const cur = document.querySelector('.top nav a.on[href^="#"]');
    const to = hit ? "#" + hit.id : cur ? cur.getAttribute("href") : "";
    if (to) { ev.preventDefault(); location.href = swap.getAttribute("href") + to; }
  });

  // 사진 칸: 옆으로 넘기기 + '1 / 8' + 캡션 · 아래 작은 줄(보는 한 장만 색) · '모아 보기'(번호 붙은 흑백 격자) — 10/24 둘 다
  const strip = document.querySelector(".strip");
  if (strip) {
    const sec = document.querySelector("#photo"), grid = document.querySelector(".pgrid");
    const slides = strip.children.length;
    const count = document.querySelector(".count");
    const caps = [...document.querySelectorAll(".cap")];
    const thumbs = [...document.querySelectorAll(".thumbs button")];
    const at = () => Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth));
    const big = [...strip.children].map(f => f.querySelector("img"));
    const load = im => { if (im && im.dataset.src) { im.src = im.dataset.src; im.removeAttribute("data-src"); } };
    const ahead = i => { load(big[i]); load(big[i + 1]); };
    const small = () => document.querySelectorAll(".thumbs img[data-src], .pgrid img[data-src]").forEach(load);
    if (big[0]) {
      const go1 = () => { ahead(0); small(); };
      if (big[0].complete && big[0].naturalWidth) go1();
      else { big[0].addEventListener("load", go1, { once: true }); big[0].addEventListener("error", go1, { once: true }); }
    }
    const show = (i, first) => {
      if (!first) ahead(i);  // 처음 그릴 때는 받지 않음 — 첫 장이 다 온 뒤에(위) 둘째 장을 받음
      if (count) count.textContent = `${i + 1} / ${slides}`;
      caps.forEach((c, n) => { c.hidden = n !== i; });
      thumbs.forEach((t, n) => { t.classList.toggle("on", n === i); t.setAttribute("aria-current", n === i ? "true" : "false"); });
    };
    strip.addEventListener("scroll", () => show(at()), { passive: true });
    const go = (i, smooth) => strip.scrollTo({ left: i * strip.clientWidth, behavior: smooth && !reduce ? "smooth" : "auto" });
    let devLast = -1e9;  // 넘긴 사진은 짧게 서서히 — 1초에 한 번까지
    const fade = i => {
      const now = performance.now();
      if (!motion || now - devLast < 1000) return;
      devLast = now;
      const img = strip.children[i] && strip.children[i].querySelector("img");
      if (img) { img.classList.add("dev"); requestAnimationFrame(() => requestAnimationFrame(() => img.classList.remove("dev"))); }
    };
    // 이전·다음(자바스크립트가 없을 때만 보임 — 있으면 작은 줄이 대신함)
    document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => {
      const i = Math.max(0, Math.min(slides - 1, at() + Number(b.dataset.go)));
      go(i, true);
      setTimeout(() => fade(i), 420);
    }));
    thumbs.forEach((t, i) => t.addEventListener("click", () => { go(i, false); show(i); fade(i); }));
    // 한 장씩 ↔ 모아 보기
    const modes = [...document.querySelectorAll(".mode button")];
    const setMode = m => {
      modes.forEach(b => b.setAttribute("aria-pressed", b.dataset.m === m ? "true" : "false"));
      sec.classList.toggle("all", m === "all");
      if (!grid) return;
      grid.hidden = m !== "all";
      if (m === "all") small();
      grid.classList.remove("show");
      if (m === "all") { void grid.offsetWidth; grid.classList.add("show"); }
    };
    modes.forEach(b => b.addEventListener("click", () => setMode(b.dataset.m)));
    if (grid) [...grid.children].forEach((b, i) => b.addEventListener("click", () => {
      setMode("one"); go(i, false); show(i); fade(i);
      (strip.children[i].querySelector(".pop") || strip).focus({ preventScroll: true });  // 격자가 숨으며 포커스가 쪽 바탕으로 빠지지 않게 — 고른 사진으로(10/27 점검)
    }));
    show(0, true);
  }

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
    const open = (i, btn) => {
      const list = posts[i] || [];
      if (list.length < 2) return;
      n = list.length;
      from = btn;
      const sim = btn.querySelector("img") || {}, alt = sim.alt || "";
      view.textContent = "";
      list.forEach((src, k) => {
        const f = document.createElement("figure"), img = document.createElement("img"), chip = document.createElement("span");
        if (k > 1) img.dataset.src = src; else img.src = src;  // 셋째 장부터는 넘길 때 한 장 앞씩(10/27 점검 — 열 때 여러 장을 한꺼번에 받아 둘째 장이 늦었음)
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
      pv.hidden = false;
      H.classList.add("pv-on");
      others(true);
      view.scrollLeft = 0;
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
    document.querySelectorAll("#photo .pop").forEach(b => b.addEventListener("click", () => open(+b.dataset.i, b)));
    x.addEventListener("click", shut);
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
  const sq = document.querySelector(".sq"), srch = document.querySelector(".srch"), sidx = document.getElementById("sidx");
  if (sq && srch && sidx) {
    const items = JSON.parse(sidx.textContent);  // [갈래, 글, 자리, 갈 곳] · 칸 이름만 다섯째에 그 칸의 낱말(약력 · 차례 …)
    const inp = srch.querySelector("input"), res = srch.querySelector(".sr-res"), none = srch.querySelector(".sr-none");
    const cnt = srch.querySelector(".sr-n"), lab = srch.querySelector(".sr-lab"), sug = srch.querySelector(".sug");
    const say = srch.querySelector('[role="status"]');  // 결과 수 · '없음'을 화면 읽기 프로그램에 — 늘 자리에 있는 한 줄에서 글만 바꿈(숨겼다 보이면 안 읽힘, 10/27 점검)
    let sayT = 0;
    const K = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
    const cho = s => [...s].map(c => { const k = c.charCodeAt(0) - 0xac00; return k >= 0 && k < 11172 ? K[Math.floor(k / 588)] : c; }).join("");
    const skip = /[\s·「」『』〈〉《》,.!?'"“”‘’\-—–()]/;
    // 견줄 글(빈칸 · 부호를 뺀 소문자) + 원래 글의 자리 — 찾은 낱말을 원래 글에서 굵게 감쌀 때 씀
    const norm = s => { const o = [], m = []; [...s.normalize("NFC")].forEach((c, i) => { if (!skip.test(c)) { o.push(c.toLowerCase()); m.push(i); } }); return [o.join(""), m]; };
    const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    // 영어판 결과의 한국어(시 행 · 원제 '탁본')는 한국어로 읽히게 감쌈 — 태그 사이 글만(10/27 점검 a11y 9)
    const ko = s => H.lang === "en" ? s.replace(/[가-힣ㄱ-ㅎ](?:[가-힣ㄱ-ㅎ\s·「」『』〈〉《》,.!?“”‘’()—–-]*[가-힣ㄱ-ㅎ」』〉》])?/g, w => `<span lang="ko">${w}</span>`) : s;
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
      if (p) {  // 그 장으로 넘기고 포커스도 그 사진에(창이 닫히며 쪽 바탕으로 빠지지 않게, 10/27 점검) · 모아 보기였으면 한 장씩으로 먼저(10/28 점검 6)
        const m1 = document.querySelector('.mode [data-m="one"]');
        if (m1 && m1.getAttribute("aria-pressed") !== "true") m1.click();
        const i = +p[1], b = document.querySelectorAll(".thumbs button")[i], f = document.querySelectorAll(".strip > *")[i];
        if (b) b.click();
        const to = (f && f.querySelector(".pop")) || document.querySelector(".strip");
        if (to) to.focus({ preventScroll: true });
        return;
      }
      if (!sec && !big) { el.classList.add("hit"); setTimeout(() => el.classList.remove("hit"), 1600); }
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    };
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
    const show = () => { sheet.hidden = false; H.style.overflow = "hidden"; };
    const hide = () => {
      sheet.hidden = true;
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
        await document.fonts.load("300 27px PTD");
        const c = document.createElement("canvas");
        c.width = bmp.width;
        c.height = bmp.height;
        const g = c.getContext("2d");
        g.drawImage(bmp, 0, 0);
        const now = new Date();
        const d = H.lang === "en" ? now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}.`;
        g.font = "300 27px PTD, -apple-system, sans-serif";
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
      toEnd();
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
      toEnd();
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
  if (top) addEventListener("scroll", () => top.classList.toggle("sc", scrollY > 8), { passive: true });

  // 문의 폼: Formspree 주소가 들어가기 전에는 보내지 않고 안내만
  // 방명록 보내기(10/26 A — 설계 v2) — fetch로(쿠키 없이 · reCAPTCHA 없이), 보낸 뒤엔 '받았다'만 · 한도가 차면(429) 다음 달에 · 보내는 동안 단추를 잠금
  const gbf = document.querySelector("form.gbf");
  if (gbf) {
    const gbSend = gbf.querySelector(".send"), gbMsg = gbf.querySelector(".msg");
    gbSend.addEventListener("touchstart", () => {}, { passive: true });  // 아이폰 누름 모양(문의 단추와 같음)
    gbf.addEventListener("submit", async ev => {
      ev.preventDefault();
      gbMsg.textContent = uiText("sending", "보내는 중…");
      gbSend.disabled = true;
      try {
        const r = await fetch(gbf.dataset.endpoint, { method: "POST", body: new FormData(gbf), headers: { Accept: "application/json" } });
        gbMsg.textContent = r.ok ? uiText("gb_sent", "잘 받았습니다. 월요일에 읽어 보겠습니다.")
          : r.status === 429 ? uiText("gb_full", "이번 달 받는 칸이 찼습니다. 다음 달에 다시 부탁드립니다.")
          : uiText("failed", "보내지 못했습니다. 잠시 뒤 다시 해 주세요.");
        if (r.ok) gbf.reset();
      } catch {
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
      msg.textContent = r.ok ? uiText("sent", "잘 받았습니다. 답장 드리겠습니다.") : uiText("failed", "보내지 못했습니다. 잠시 뒤 다시 해 주세요.");
      if (r.ok) form.reset();
    } catch {
      msg.textContent = uiText("failed", "보내지 못했습니다. 잠시 뒤 다시 해 주세요.");
    }
  });

  // 꼬리표 지우기(10/27 관리 화면 세션 부탁 → 동원 '넣어') — 방문 셈(GoatCounter)이 이 방문을 센 뒤 주소창에서 utm_*만 뺌(다른 값 · # · 기록 상태는 그대로).
  // 꼬리표 링크(예: 인스타 스토리)를 받은 사람이 주소창 주소를 그대로 다시 퍼뜨려도 그 방문이 같은 꼬리표로 쌓이지 않게(기준/관리 화면 꼬리표 링크 칸 정의_v1.md 4절).
  // count.js는 실행되자마자(쪽이 보이면) 셈 주소를 만들어 보내고, 숨은 탭이면 보이게 될 때 셈 — 셀 때의 location.search를 읽으므로 반드시 그 뒤에[출처 gc.zgo.at/count.js].
  // '실행되자마자'는 count.js 줄이 쪽 맨 끝(body 안, async — build.py gc_tag)이라 실행될 때 body가 있어서임. 줄 자리를 옮기면 이 차례를 다시 시험(scratch utm_check.py)
  // 방문 셈이 꺼져 있으면(count.js 줄이 없으면) 아무것도 하지 않음 · count.js를 못 받으면(막힘) 셀 일이 없으니 바로 뺌
  const gcs = document.querySelector("script[data-goatcounter]");
  if (gcs && /[?&]utm_/i.test(location.search)) {
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
    if (window.goatcounter && typeof window.goatcounter.count === "function") after();
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
  // 깊은 링크(#t23 · #l9 · #n1 …)로 열면 그 줄에 찾기와 같은 옅은 바탕 1.6초(10/28 사용 편의 점검 ⑤ — 어느 줄로 왔는지 표시가 없었음)
  if (location.hash) {
    const hit = document.getElementById(decodeURIComponent(location.hash.slice(1)));
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
      else if (el.hidden && mine) { mine = false; if (!popping && history.state && history.state.layer === w) history.back(); popping = false; }
    }).observe(el, { attributes: true, attributeFilter: ["hidden"] });
    addEventListener("popstate", () => {
      setTimeout(() => { history.scrollRestoration = "auto"; }, 0);  // 되살리기는 이번 뒤로 가기가 끝난 뒤에 켬 — 바로 켜면 예전에 적어 둔 위치로 쪽이 옮겨졌음(찾기 2400 → 0)
      if (mine && !el.hidden) { popping = true; btn.click(); }
    });
  });
})();
