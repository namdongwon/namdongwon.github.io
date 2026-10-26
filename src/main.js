// namdongwon.com — 움직임 C(큰 장면 + 결) · 사진 넘기기 · 문의 폼
// 장면: 문(첫 방문 한 번) · 탁본 · 기록 / 결: 이름을 자모로 쳐 나감 · 칸 요소가 차례로 떠오름 · 맨 위 띠 — 칸 사이 셔터는 10/25 뺌
// '동작 줄이기'를 켠 사람과 IntersectionObserver가 없는 브라우저는 움직임 없이 다 보이게 둔다
(() => {
  const H = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motion = !reduce && "IntersectionObserver" in window;
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
  if (motion && nameEl && nameEl.dataset.type) {
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
  const turnable = bk => {
    const b = bk.querySelector(".b"), REST = 26;
    let ry = REST, run = 0, drag = null;
    const set = v => { ry = v; b.style.setProperty("--ry", v.toFixed(2) + "deg"); };
    const take = () => {  // CSS가 잡고 있던 각도(처음 자세·4초 안전 장치)를 그대로 넘겨받음 — 시집 칸 책은 처음부터 on이라 26°에서 시작
      if (bk.classList.contains("on")) return;
      set(parseFloat(getComputedStyle(b).getPropertyValue("--ry")) || REST);
      bk.classList.add("on");
    };
    const tween = (to, ms) => {
      const from = ry, t0 = performance.now(), id = ++run;
      const step = now => {
        if (id !== run) return;
        const p = Math.min(1, (now - t0) / ms);
        set(from + (to - from) * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    bk.addEventListener("pointerdown", e => {
      if (e.button) return;
      take();
      run++;
      drag = { x: e.clientX, ry };
      bk.classList.add("drag");
      try { bk.setPointerCapture(e.pointerId); } catch {}
    });
    bk.addEventListener("pointermove", e => { if (drag) set(drag.ry + (e.clientX - drag.x) * 0.9); });
    const up = () => {
      if (!drag) return;
      drag = null;
      bk.classList.remove("drag");
      if (reduce) set(REST);
      else tween(REST, 1100);
    };
    bk.addEventListener("pointerup", up);
    bk.addEventListener("pointercancel", up);  // 세로로 밀어 화면이 넘어가면 브라우저가 가져감 → 제자리
    return { turnIn: () => { if (!drag) { take(); tween(REST, 1000); } } };
  };
  // 첫 화면 책만 처음에 책등이 보이게 비스듬히(78°) 서 있다가 26°로 돌아섬. 돌아서는 때는 문 장면이 정함
  // (첫 방문: 문이 열리고 0.9초 뒤 — 표지가 0.6초부터 0.8초 동안 떠오르니 거의 다 보인 뒤 / 다시 온 사람: 책이 화면에 들어오면)
  const bk = home && home.querySelector(".bk");
  let bookIn = () => {};
  if (bk) {
    const t = turnable(bk);
    if (motion) bookIn = t.turnIn;
  }
  const cardBook = document.querySelector(".pbook .bk");  // 시집 칸 책 카드 — 들어올 때 돌아서지 않고 만질 때만(10/25 A)
  if (cardBook) turnable(cardBook);

  // ① 문 — 첫 방문 한 번만(head의 스크립트가 html.intro를 붙였을 때). 문이 열리는 순간 이름이 나타남
  // 글꼴은 0.8초까지만 기다림 — 글꼴이 늦으면 검은 문 앞에서 오래 서 있게 되므로(늦게 온 글꼴은 그 뒤에 바뀌어 들어옴)
  const door = document.querySelector(".door");
  if (H.classList.contains("intro") && door && motion) {
    Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 800))]).then(() => {
      // 첫 화면이 3초 안에 다 서게(10/24 B) — 문 열림 1.55 → 1.1초, 나머지는 그 뒤로 겹쳐 둠
      setTimeout(() => door.classList.add("on"), 200);
      setTimeout(() => door.classList.add("lit"), 800);
      setTimeout(() => { door.classList.add("open"); H.classList.add("opened"); home.classList.add("go"); setTimeout(typeName, 150); setTimeout(bookIn, 900); }, 1100);
      setTimeout(() => { door.remove(); H.classList.remove("intro"); }, 2500);
    });
  } else {
    H.classList.remove("intro");
    // 한 문장이 숨은 채로 한 번 그려진 뒤에 'go'를 붙여야 흐림 → 또렷이 보임(같은 순간에 붙이면 그냥 나타남 — 10/24 실측)
    if (home) requestAnimationFrame(() => requestAnimationFrame(() => home.classList.add("go")));
    // 다시 온 사람: 글꼴을 0.8초까지만 기다렸다가 바로 침
    Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 800))]).then(() => setTimeout(typeName, 150));
    if (bk && motion) once([bk], () => setTimeout(bookIn, 250));
  }

  // 결 — 칸 요소들이 화면에 들어오면 차례로 떠오름(시·기록은 장면이 맡음)
  if (motion) {
    const sels = ["main section > .label", "#poem .h2", ".pbook", "#me .h2", ".tagl", ".bio", ".years li", ".now", "#photo .head", "#photo .caps",
      "#photo .nav2", ".bhead", ".btext", ".btoc h3", ".btoc .parts > div", ".btoc .tail", ".ch2", ".big", ".vt", ".sub", ".toc li", ".empty", "#contact .h2", ".lead", ".ask > *", ".sns", ".colo"];
    const seen = new Set();
    sels.forEach(sel => document.querySelectorAll(sel).forEach(el => {
      if (seen.has(el)) return;
      seen.add(el);
      el.classList.add("rv");
      el.style.setProperty("--i", Math.max(0, [...el.parentElement.children].filter(c => c.matches(sel)).indexOf(el)));
    }));
    once([...document.querySelectorAll(".rv, .strip")], el => el.classList.add("in"), { rootMargin: "0px 0px -8% 0px" });
  }

  // ② 탁본 — 연이 화면에 들어오면 행마다 차례로 드러남(모양은 style.css)
  if (motion) {
    const stanzas = [...document.querySelectorAll(".poem p")];
    stanzas.forEach(p => p.querySelectorAll(".ln").forEach((l, i) => {
      l.style.setProperty("--i", i);
      const le = l.nextElementSibling;  // 영어판(10/24): 번역 행은 짝인 원문 행과 함께 드러남
      if (le && le.classList.contains("le")) le.style.setProperty("--i", i);
    }));
    once(stanzas, p => p.classList.add("in"), { threshold: 0.35 });
  }

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
      const x = c.getContext("2d");
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      let col = 0, d = 0;
      chars.forEach(ch => {
        const m = F[ch], faint = ch !== "," && d++ < lead;
        for (let r = 0; r < 7; r++) for (let k = 0; k < m[r].length; k++) {
          x.fillStyle = m[r][k] === "#" ? (faint ? "#c9c9c9" : "#111") : "#efefef";
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
      const x = c.getContext("2d");
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let i = 0; i < +c.dataset.n; i++) {
        x.fillStyle = i < n ? "#111" : "#e9e9e9";
        x.fillRect((i % g.cols) * g.step, Math.floor(i / g.cols) * g.step, g.cell, g.cell);
      }
    };
    // 새로 찬 칸만 칠함(1,559칸을 매번 다시 그리지 않게)
    const more = (c, n) => {
      const from = drawn.get(c) || 0, g = grid(c);
      if (n <= from || !g.W) return;
      const x = c.getContext("2d");
      x.fillStyle = "#111";
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
        ul.style.transform = `translateX(${on.offsetLeft}px)`;
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
  const swap = document.querySelector(".top nav .lang");
  if (swap) swap.addEventListener("click", ev => {
    const cur = document.querySelector('.top nav a.on[href^="#"]');
    if (cur) { ev.preventDefault(); location.href = swap.getAttribute("href") + cur.getAttribute("href"); }
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
    const show = i => {
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
      grid.classList.remove("show");
      if (m === "all") { void grid.offsetWidth; grid.classList.add("show"); }
    };
    modes.forEach(b => b.addEventListener("click", () => setMode(b.dataset.m)));
    if (grid) [...grid.children].forEach((b, i) => b.addEventListener("click", () => { setMode("one"); go(i, false); show(i); fade(i); }));
    show(0);
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
    view.addEventListener("scroll", upd, { passive: true });
    const open = (i, btn) => {
      const list = posts[i] || [];
      if (list.length < 2) return;
      n = list.length;
      from = btn;
      const alt = (btn.querySelector("img") || {}).alt || "";
      view.textContent = "";
      list.forEach((src, k) => {
        const f = document.createElement("figure"), img = document.createElement("img");
        img.src = src;
        img.alt = `${alt} (${k + 1} / ${n})`;
        if (k > 1) img.loading = "lazy";
        f.append(img);
        view.append(f);
      });
      foot.innerHTML = pcaps[i] ? pcaps[i].innerHTML : "";
      pv.hidden = false;
      H.classList.add("pv-on");
      others(true);
      view.scrollLeft = 0;
      upd();
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
    pv.addEventListener("keydown", ev => {
      if (ev.key === "Escape") shut();
      else if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
        ev.preventDefault();
        step(ev.key === "ArrowRight" ? 1 : -1);
      }
    });
  }

  // 사이트 안 찾기(10/26 검색 A 전체 화면 창) — 맨 위 막대 돋보기(또는 '/' 키)로 흰 한 장을 열고, 빌드가 쪽에 넣은 찾을 거리(#sidx)에서 찾음.
  // 띄어쓰기 · 부호 · 영문 대소문자 무시 · 초성만 쳐도(ㅌㅂ → 탁본). 검색어는 이 기기 밖으로 나가지 않음 · 열면 나머지 쪽은 inert · Esc나 '닫기'로 닫고 포커스는 돋보기로
  const sq = document.querySelector(".sq"), srch = document.querySelector(".srch"), sidx = document.getElementById("sidx");
  if (sq && srch && sidx) {
    const items = JSON.parse(sidx.textContent);  // [갈래, 글, 자리, 갈 곳] · 칸 이름만 다섯째에 그 칸의 낱말(약력 · 차례 …)
    const inp = srch.querySelector("input"), res = srch.querySelector(".sr-res"), none = srch.querySelector(".sr-none");
    const cnt = srch.querySelector(".sr-n"), lab = srch.querySelector(".sr-lab"), sug = srch.querySelector(".sug");
    const K = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
    const cho = s => [...s].map(c => { const k = c.charCodeAt(0) - 0xac00; return k >= 0 && k < 11172 ? K[Math.floor(k / 588)] : c; }).join("");
    const skip = /[\s·「」『』〈〉《》,.!?'"“”‘’\-—–()]/;
    // 견줄 글(빈칸 · 부호를 뺀 소문자) + 원래 글의 자리 — 찾은 낱말을 원래 글에서 굵게 감쌀 때 씀
    const norm = s => { const o = [], m = []; [...s.normalize("NFC")].forEach((c, i) => { if (!skip.test(c)) { o.push(c.toLowerCase()); m.push(i); } }); return [o.join(""), m]; };
    const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const find = q => {
      const [nq] = norm(q);
      if (!nq) return [];
      const ch = /^[ㄱ-ㅎ]+$/.test(nq), out = [];
      items.forEach(it => {
        const [nt, map] = norm(it[1]), at = (ch ? cho(nt) : nt).indexOf(nq);
        if (at < 0) {  // 칸 이름은 그 칸의 낱말로도('약력' → 소개) — 굵게 할 글자가 없어 이름 그대로, 앞부분이 맞은 것과 함께 위로
          // 낱말을 붙여 견줌('사는 곳'처럼 띄운 말도) · 초성만 쳤으면 낱말 첫머리만(ㅅㅈ → 사진은 맞고 메시지는 안 맞게)
          if (it[4] && (ch ? it[4].split(" ").some(w => cho(norm(w)[0]).startsWith(nq)) : norm(it[4])[0].includes(nq))) out.push({ it, at: 0, html: esc(it[1]) });
          return;
        }
        const cs = [...it[1].normalize("NFC")], a = map[at], b = map[at + nq.length - 1] + 1;
        out.push({ it, at, html: esc(cs.slice(0, a).join("")) + "<b>" + esc(cs.slice(a, b).join("")) + "</b>" + esc(cs.slice(b).join("")) });
      });
      return out.sort((x, y) => (x.at > 0) - (y.at > 0)).slice(0, 12);  // 앞부분이 맞는 것부터, 같으면 갈래 차례(칸 · 시집 · 차례 · 시 · 소개 …)
    };
    const run = () => {
      const q = inp.value, empty = !q.trim(), hits = empty ? [] : find(q);
      lab.hidden = sug.hidden = !empty;
      cnt.hidden = empty || !hits.length;
      cnt.textContent = uiText("search_count", "찾은 것 {n}", { n: hits.length });
      res.innerHTML = hits.map(h => {
        const ext = /^https?:/.test(h.it[3]);
        return `<li><a href="${esc(h.it[3])}"${ext ? ' target="_blank" rel="noopener"' : ""}><span class="tg">${esc(h.it[0])}</span>` +
          `<span class="tx">${h.html}</span><span class="wh">${esc(h.it[2])}</span></a></li>`;
      }).join("");
      none.hidden = empty || hits.length > 0;
    };
    let from = null;
    const others = on => [...document.body.children].forEach(el => { if (el !== srch && el.tagName !== "SCRIPT") el.inert = on; });
    const open = () => {
      if (!srch.hidden) return;
      from = document.activeElement;
      srch.hidden = false;
      H.classList.add("sr-on");
      others(true);
      inp.value = "";
      run();
      inp.focus();
    };
    const shut = back => {
      if (srch.hidden) return;
      srch.hidden = true;
      H.classList.remove("sr-on");
      others(false);
      if (back && from) from.focus();
    };
    // 결과로 가기 — 사진은 그 장으로 넘기고, 나머지는 그 줄을 화면 가운데에 두고 잠깐 옅은 바탕
    const goTo = href => {
      const p = /^#p(\d+)$/.exec(href);
      const el = document.querySelector(p ? "#photo" : href);
      if (!el) return;
      const sec = el.matches("section"), big = el.offsetHeight > innerHeight * 0.6;  // 칸 · 큰 덩어리(차례 전체)는 머리를 위에, 한 줄은 화면 가운데에
      el.scrollIntoView({ block: sec || big ? "start" : "center", behavior: reduce ? "auto" : "smooth" });
      if (p) { const b = document.querySelectorAll(".thumbs button")[+p[1]]; if (b) b.click(); return; }
      if (!sec && !big) { el.classList.add("hit"); setTimeout(() => el.classList.remove("hit"), 1600); }
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    };
    sq.addEventListener("click", open);
    srch.querySelector(".x").addEventListener("click", () => shut(true));
    srch.addEventListener("keydown", ev => { if (ev.key === "Escape") shut(true); });
    inp.addEventListener("input", run);
    srch.addEventListener("click", ev => {
      const a = ev.target.closest("a, button[data-q]");
      if (!a) return;
      if (a.dataset.q) { inp.value = a.dataset.q; run(); inp.focus(); return; }
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) { shut(false); return; }  // 밖으로 나가는 링크(교보 · 유튜브)는 새 창 그대로
      ev.preventDefault();
      shut(false);
      goTo(href);
    });
    document.addEventListener("keydown", ev => {
      const a = document.activeElement;
      if (ev.key === "/" && !ev.metaKey && !ev.ctrlKey && !ev.altKey && srch.hidden &&
          !(a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable))) { ev.preventDefault(); open(); }
    });
  }

  // 「탁본」 한 장 — 시를 길게 누르면(2.2초) 검은 먹 종이가 올라오고 흰 글자로 전문이 한 줄씩 찍힘. 그 전에 떼면 되돌아감.
  // 안내 문구를 누르면(키보드·화면 읽기 프로그램도) 바로 열림 · Esc나 '닫기'로 닫음 · '동작 줄이기'면 움직임 없이 바로
  const poemBox = document.querySelector(".poem"), hint = document.querySelector(".hint"), sheet = document.querySelector(".sheet");
  if (poemBox && hint && sheet) {
    const lines = [...sheet.querySelectorAll(".sp .ln")];
    const keep = sheet.querySelector(".keep"), close = sheet.querySelector(".close");
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
    };
    const finish = () => {
      open = true;
      auto = false;
      apply(1);
      sheet.classList.add("done");
      rest(true);
      // '간직하기'를 누르는 순간 바로 건넬 수 있게 그림을 미리 받아 둠(휴대폰 공유 창은 누른 직후에만 열림)
      img = img || fetch(ASSET + "img/takbon.jpg").then(r => r.blob()).catch(() => null);
      close.focus();
    };
    const loop = () => {
      const now = performance.now(), dt = (now - last) / 1000;
      last = now;
      if (!open) p = Math.max(0, Math.min(1, p + (pressing || auto ? dt / (auto ? 0.9 : 2.2) : -dt / 0.6)));
      apply(p);
      if (p >= 1 && !open) finish();
      if (!open && (pressing || auto || p > 0)) requestAnimationFrame(loop);
      else {
        ticking = false;
        if (!open && p === 0) hide();
      }
    };
    const run = () => { if (!ticking) { ticking = true; last = performance.now(); requestAnimationFrame(loop); } };
    poemBox.addEventListener("pointerdown", ev => {
      if (open || (ev.pointerType === "mouse" && ev.button !== 0)) return;
      pressing = true;
      viaKey = false;
      back = hint;
      touch.style.left = ev.clientX + "px";
      touch.style.top = ev.clientY + "px";
      touch.classList.add("on");
      poemBox.classList.add("pressing");
      show();
      if (reduce) { p = 1; finish(); } else run();
    });
    const up = () => {
      if (!pressing) return;
      pressing = false;
      touch.classList.remove("on");
      poemBox.classList.remove("pressing");
      run();
    };
    addEventListener("pointerup", up);
    addEventListener("pointercancel", up);
    poemBox.addEventListener("contextmenu", ev => { if (pressing) ev.preventDefault(); });
    hint.addEventListener("click", ev => {
      if (open) return;
      viaKey = ev.detail === 0;  // 키보드(Enter·Space)로 누르면 0
      back = hint;
      show();
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
    // 간직하기 — 휴대폰은 공유 창(사진 저장·인스타로 보내기), 안 되면 그림 파일 내려받기
    keep.addEventListener("click", async () => {
      const name = uiText("file", "남동원_탁본.jpg");
      const blob = img ? await img : null;
      if (blob && navigator.canShare) {
        const file = new File([blob], name, { type: "image/jpeg" });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: uiText("share", "「탁본」 — 남동원") });
            return;
          } catch (err) {
            if (err && err.name === "AbortError") return;
          }
        }
      }
      const a = document.createElement("a");
      a.href = ASSET + "img/takbon.jpg";
      a.download = name;
      document.body.append(a);
      a.click();
      a.remove();
    });
  }

  // 맨 위 띠: 넘기면 아래 선이 생기고 뒤가 흐리게 비침
  const top = document.querySelector(".top");
  if (top) addEventListener("scroll", () => top.classList.toggle("sc", scrollY > 8), { passive: true });

  // 문의 폼: Formspree 주소가 들어가기 전에는 보내지 않고 안내만
  // 메일(10/26) — 쪽 원본에는 뒤집은 두 조각만 있음(주소를 긁어 가는 프로그램 대비) → 여기서 주소와 mailto를 이어 붙임
  document.querySelectorAll("a.ml[data-u]").forEach(a => {
    const m = [...a.dataset.u].reverse().join("") + "@" + [...a.dataset.d].reverse().join("");
    a.textContent = m;
    a.href = "mailto:" + m;
  });

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
})();
