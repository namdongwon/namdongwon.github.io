// 커서 점 · 누르면 파동(11/9 동원 "시안 영상에서 보여준 마우스 포인터랑 누르면 파동 … 내 웹사이트 들어와도 똑같이" → 시안 커서시안_v1 → "A 점만 (권장)")
// 마우스가 있는 기기: 기본 화살표를 숨기고 점 하나(10px · 11/10 동원 '11에서 10으로' · 점 뒤 반전 — 11/9 밤 동원 '11로 해보자' · '흰색하면 글자가 가려')가 따라옴 · 링크 · 단추 위에선 32px로 커짐(11/10 동원 버튼 '32px (권장)' — 11/9 밤 '커지지 않았으면'을 바꿈) · 글 칸 위 · 글을 드래그해 고르는 동안엔 같은 반전의 세로 막대(I빔 · 11/10)
// 휴대폰 · 손가락: 점 없이 누른 자리에 파동만 · 움직임 줄이기(기기 설정 · 판권면 스위치 — 켜고 끄는 즉시)면 점 · 파동 모두 끔
// 모양은 style.css(.cur · .rip) — 처리방침 · 404처럼 main.js가 없는 쪽에도 따로 실림
(() => {
  const H = document.documentElement;
  const sysReduce = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const calm = () => sysReduce.matches || H.getAttribute("data-motion") === "reduce";
  const TEXT = "input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea,[contenteditable=true]";
  const LINK = "a[href],button,summary,label,select,[role=button]";
  let dot = null, x = 0, y = 0, tx = 0, ty = 0, seen = false, run = false, fld = null, drag = false, ink = null;
  const sync = () => {  // 마우스 기기 · 움직임 켬일 때만 점(스위치를 바꾸면 바로 따라감)
    const on = fine.matches && !calm();
    H.classList.toggle("cur-on", on);
    if (on && !dot) {
      dot = document.createElement("div");
      dot.className = "cur off";
      dot.setAttribute("aria-hidden", "true");
      document.body.appendChild(dot);
    }
    if (dot) dot.hidden = !on;
  };
  const lum = (c) => { const m = c.match(/[\d.]+/g) || [0, 0, 0]; return (+m[0] + +m[1] + +m[2]) / 765; };
  // 글자가 바탕보다 먹에 가까운데 먹은 아닌 것(회색 글자) — 검은 단추의 흰 글자처럼 바탕 쪽 색은 그대로
  const faded = (el) => { const b = getComputedStyle(document.body), c = lum(getComputedStyle(el).color), k = lum(b.color), g = lum(b.backgroundColor);
    return Math.abs(c - k) > 0.02 && Math.abs(c - k) < Math.abs(c - g); };
  // 11/22 동원 "동그라미가 커지니까 잘 안 보이는데 … 먹고리 같은 형태로" → 시안 기준/브랜드 시안/커서먹고리시안_v1 · 버튼 "B 글자 링크 모두 (권장)":
  // 한 줄 글자 링크(그림 없음 · 높이 44 이하 · 칠한 바탕 없음)는 반전 대신 먹고리(.pl) — 세 글자 넘는 낱말(방명록 · 인스타그램)을 32px 원이 반만 덮어 글자가 흰 · 먹으로 갈라졌음
  // 단추(연락하기 · 시집 보기 · 보내기 …)와 아이콘은 반전 그대로 — 칠한 바탕 · 그라데이션 · 테두리 그림자(연락하기는 올리면 테두리만) 중 하나라도 있으면 단추 · 링크마다 처음 닿을 때 한 번만 가름
  // 11/22 동원 "이거는 왜 고리이고 이거는 왜 큰 동그라미야 통일성이 없잖아" — 고른 글자 크기 '가'의 밑줄(16 × 1.5px 그라데이션)을 칠한 바탕으로 보아 그것만 반전이었음
  // → 링크 반 넘게 칠한 그라데이션 · 사방 테두리(0 0 0 Npx)만 단추로 · 밑줄 · 한쪽 선은 글자 링크 그대로(고름 · 올림 상태와 상관없이 같은 모양)
  const solid = (s, r) => {
    if (s.backgroundImage !== "none") { const [w, h = w] = s.backgroundSize.split(" "), px = (v, all) => (/px$/.test(v) ? parseFloat(v) : all);
      if (px(w, r.width) >= r.width / 2 && px(h, r.height) >= r.height / 2) return true; }
    for (const m of s.boxShadow.matchAll(/(-?[\d.]+)px (-?[\d.]+)px (-?[\d.]+)px (-?[\d.]+)px/g)) if (+m[1] === 0 && +m[2] === 0 && +m[4] > 0) return true;
    const m = s.backgroundColor.match(/[\d.]+/g) || []; if (m.length < 3 || (m.length > 3 && +m[3] < 0.5)) return false;
    return Math.abs(lum(s.backgroundColor) - lum(getComputedStyle(document.body).backgroundColor)) > 0.3; };
  const said = (L) => { const w = document.createTreeWalker(L, NodeFilter.SHOW_TEXT);  // 눈에 보이는 글자가 있나 — 읽기 도구용 숨은 글(.sr) · aria-hidden은 빼고 셈(아이콘만 있는 링크는 아이콘)
    for (let n; (n = w.nextNode());) if (n.data.trim() && !n.parentElement.closest(".sr,[aria-hidden=true]")) return true; return false; };
  const plain = (L) => { if (L.closest(".lsw li,.ppv-l li")) return true;  // 작은 기호(KOR ▾ 같은 펼침 표시)가 붙어도 글자가 있으면 글자 링크
    return L.getBoundingClientRect().height <= 44 && !L.querySelector("img,video,canvas,picture") && said(L) && !solid(getComputedStyle(L), L.getBoundingClientRect()); };
  let plL = null, plV = false, hold = 0;  // hold — 맨 위 메뉴를 누른 뒤 이 시각까지 고리 대신 작은 점(아래 click)
  const tick = () => {  // 거의 붙어 따라오되 아주 조금 부드럽게(0.38)
    x += (tx - x) * 0.38; y += (ty - y) * 0.38;
    dot.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
    if (Math.abs(tx - x) + Math.abs(ty - y) > 0.1) requestAnimationFrame(tick); else run = false;
  };
  // 11/21 동원 "마우스 우클릭을 누르면 점이 멈춤 그리고 마우스가 안 보임" — 우클릭 메뉴가 떠 있는 동안은 브라우저가 마우스 자리를 페이지에 안 알려 줘(모든 브라우저 같음)
  // 점이 그 자리에 멈추고 화살표는 숨겨져 있었음 → 메뉴가 뜨면 점은 숨기고 기본 화살표를 보임(.cur-ctx) · 메뉴가 닫히고 마우스가 움직이면 다시 점(누른 채 멈춘 '눌림' 모양도 풀음)
  let ctx = null;
  // 11/22 동원 "마우스 오른쪽 누른 다음에 움직일 수 없는 거 동그라미 안 움직여지는 거" — 웨일은 오른쪽 단추를 누른 채 움직이면 마우스 제스처가 움직임을 가져가고
  // 메뉴는 단추를 뗄 때 띄움 → 메뉴가 뜨기 전 누르고 움직이는 동안 점이 누른 자리에 멈추고 화살표는 숨겨져 있었음 → 오른쪽 단추를 누르는 순간부터 점은 숨기고 기본 화살표 ·
  // 오른쪽 단추를 누르고 있는 동안은 그대로(윈도 크롬도 메뉴가 뗄 때 뜸) · 떼고 움직이거나 왼쪽으로 누르면 다시 점
  const toctx = (e) => {
    if (!dot || dot.hidden) return;
    ctx = [e.clientX, e.clientY]; drag = false;
    H.classList.add("cur-ctx"); dot.classList.add("off"); dot.classList.remove("dn", "sl", "lk"); unink();
  };
  addEventListener("contextmenu", toctx);
  const unctx = () => { ctx = null; H.classList.remove("cur-ctx"); };
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || !dot || dot.hidden) return;
    if (ctx) { if (e.buttons & 2 || Math.abs(e.clientX - ctx[0]) + Math.abs(e.clientY - ctx[1]) < 3) return; unctx(); }
    tx = e.clientX; ty = e.clientY;
    if (!seen) { x = tx; y = ty; seen = true; }
    const t = e.target instanceof Element ? e.target : null;
    const f = t && t.closest(TEXT);  // 글 칸 위 — 점이 같은 반전의 가는 세로 막대(I빔)로 바뀜 · 높이는 그 칸 글자 크기(11/10 동원 "지금 마우스 포인터와 매칭되게")
    if (f !== fld) { fld = f; dot.classList.toggle("tx", !!f); if (f) dot.style.setProperty("--tx-h", Math.round(parseFloat(getComputedStyle(f).fontSize) * 1.15) + "px"); }
    const sl = drag && (e.buttons & 1) && !getSelection().isCollapsed;  // 글을 드래그해 고르는 동안 — 글 칸처럼 막대 · 높이는 밑 글자 크기(11/10 동원 "드래그 할 때도 계속 점이거든? 글칸커서처럼")
    if (sl && t && !f) dot.style.setProperty("--tx-h", Math.round(parseFloat(getComputedStyle(t).fontSize) * 1.15) + "px");
    dot.classList.toggle("sl", !!sl && !f);
    const L = !f && !sl && t && !t.closest(".si") ? t.closest(LINK) : null;  // 랜딩 칸 표시(.si) 위에선 점 그대로 — 큰 원이 5px 막대를 덮었음(11/16)
    const held = performance.now() < hold;
    dot.classList.toggle("lk", !!L && !held);
    if (L !== plL) { plL = L; plV = !!L && plain(L); }
    dot.classList.toggle("pl", plV && !held);  // 반전 없는 테두리 원(먹고리) — 언어 목록 줄(국기 본래 색 · 11/10 동원 "국가의 국기들 … 본연의 색깔 그대로") · 11/22부터 한 줄 글자 링크도(위 plain)
    if (L !== ink) { if (ink) ink.classList.remove("cur-ink"); ink = L && !L.closest(".lsw li,.ppv-l li") && L.getBoundingClientRect().height <= 44 && (faded(L) || faded(t)) ? L : null; if (ink) ink.classList.add("cur-ink"); }  // 원이 덮은 회색 글자는 먹색으로 — 반전되면 순흰(어둡게는 순검정)(11/10 동원 "푸터 글자들 마우스 오버시 회색이지? 흰색으로 해야지 … 전부 흰색으로") · 한 줄짜리 링크만(높이 44px 이하) — 카드 · 큰 링크는 글 색 그대로(11/10 동원 "마우스 오버시 글이 왜 더 진해져?" → 버튼 "카드 · 큰 링크는 빼기 (권장)")  // 링크 · 단추 위 — 점이 32px로 커져 글자를 반전(11/10 동원 "닿았을때 원이 좀 더 커졌으면" → 버튼 "32px (권장)")
    dot.classList.remove("off");
    if (!run) { run = true; requestAnimationFrame(tick); }
  }, { passive: true });
  addEventListener("pointerdown", (e) => {
    if (ctx && e.button !== 2) unctx();
    if (e.pointerType === "mouse" && e.button === 2) { toctx(e); return; }  // 오른쪽 단추 — 파동 · 눌림 없이 바로 기본 화살표(위 toctx)
    if (calm()) return;
    const r = document.createElement("span");
    r.className = "rip"; r.setAttribute("aria-hidden", "true");
    r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px";
    document.body.appendChild(r);
    r.addEventListener("animationend", () => r.remove());
    if (dot && e.pointerType === "mouse") dot.classList.add("dn");
    drag = e.pointerType === "mouse" && e.button === 0 && !(e.target instanceof Element && e.target.closest(LINK + "," + TEXT));
  }, { passive: true });
  const unink = () => { if (ink) { ink.classList.remove("cur-ink"); ink = null; } };
  addEventListener("pointerup", () => { drag = false; if (dot) dot.classList.remove("dn", "sl"); }, { passive: true });
  // 11/22 동원 "페이지 넘길 때 … 운영은 튀는데 스테이징은 안 튀어" — 메뉴 위 작은 점(main.js .dt)이 누른 메뉴 위로 튀어 앉는 자리가 바로 마우스 밑이라
  // 먹고리(테두리 선)에 묻혀 안 보였음(운영의 반전 원은 점을 흰색으로 뒤집어 보였음) → 맨 위 메뉴를 누르면 0.6초 동안 고리 대신 작은 점(조금 움직여도) · 그 뒤 움직이면 다시 고리
  addEventListener("click", (e) => {
    if (!dot || !(e.target instanceof Element) || !e.target.closest(".top nav a[href]")) return;
    dot.classList.remove("lk", "pl"); unink(); plL = null; plV = false; hold = performance.now() + 600;  // 점 튐 0.45초 + 여유 · 11/27 plV도 비움(동원 "마우스 저거 왜 먹고리돼" — 메뉴를 누른 뒤 빈 곳에서 L · plL이 둘 다 null이라 다시 재지 않아 옛 먹고리 표시가 남았음 · 웨일 재현 cur pl 10px)
  }, { passive: true });
  H.addEventListener("pointerleave", () => { unink(); if (dot) dot.classList.add("off"); });  // 창 밖 · 유튜브 틀(iframe) 안으로 가면 숨김
  addEventListener("blur", () => { drag = false; unink(); if (dot) dot.classList.add("off"); });
  // 기호 단추 말풍선(11/11 동원 "우리 문양으로 되어있는 것 마우스 오버시 이렇게 설명 나오는 것도 좋겠네" — 보낸 그림의 검은 말풍선 꼴):
  // 이름(aria-label)이 있고 보이는 글이 한 글자 이하인 단추 · 링크(돋보기 · 원 아이콘 · 화면 · 글자 '가' · 맨 위로 · 닫기)에 올리면 0.4초 뒤 아래에(자리가 없으면 위에) — 키보드 초점에도 · 브라우저 기본 말풍선(title)은 겹치지 않게 뺌
  const TIPS = "a[aria-label]:not(.si a),button[aria-label],summary[aria-label]";  // 랜딩 칸 표시(.si)는 제 이름 글이 있어 말풍선을 띄우지 않음(11/16)
  const icon = (el) => el && el.matches(TIPS) && [...el.childNodes].map((n) => (n.nodeType === 3 || !(n.classList && n.classList.contains("sr")) ? n.textContent : "")).join("").trim().length <= 1;
  let tipEl = null, tipFor = null, tipT = 0;
  const hideTip = () => { clearTimeout(tipT); tipFor = null; if (tipEl) tipEl.classList.remove("on"); };
  const showTip = (el, now) => {
    if (el === tipFor) return;
    hideTip(); tipFor = el;
    if (el.hasAttribute("title")) { el.dataset.tip = el.getAttribute("title"); el.removeAttribute("title"); }
    tipT = setTimeout(() => {
      if (tipFor !== el || !el.isConnected) return;
      if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "ttp"; tipEl.setAttribute("aria-hidden", "true"); document.body.appendChild(tipEl); }
      tipEl.textContent = el.getAttribute("aria-label");
      const r = el.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
      const below = r.bottom + 8 + h <= innerHeight - 8;
      tipEl.style.left = Math.round(Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8)) + "px";
      tipEl.style.top = Math.round(below ? r.bottom + 8 : r.top - 8 - h) + "px";
      tipEl.classList.toggle("up", !below);
      tipEl.classList.add("on");
    }, now ? 0 : 400);
  };
  addEventListener("pointerover", (e) => { if (e.pointerType !== "mouse") return; const el = e.target instanceof Element ? e.target.closest(TIPS) : null; if (icon(el)) showTip(el); else if (tipFor && !(el && el === tipFor)) hideTip(); }, { passive: true });
  addEventListener("focusin", (e) => { const el = e.target; if (icon(el) && el.matches(":focus-visible")) showTip(el, true); });
  ["pointerdown", "scroll", "keydown", "blur", "focusout"].forEach((t) => addEventListener(t, hideTip, { passive: true, capture: true }));
  H.addEventListener("pointerleave", hideTip);
  [sysReduce, fine].forEach((m) => m.addEventListener && m.addEventListener("change", sync));
  new MutationObserver(sync).observe(H, { attributes: true, attributeFilter: ["data-motion"] });
  sync();
  // 11/20 '쪽을 넘어가도 점이 마우스 자리에(sessionStorage curxy)'는 11/21 뺌 — 사이트 안 이동이 모두 페이지 이어 받기(Turbo)라 점이 그대로 남고,
  // 새로 받는 경우(주소창 · 다른 사이트에서 옴)엔 움직이기 전 화살표와 점이 겹쳐 보였음(인계 문서 '주의')
  // 11/20 동원 "개인정보 처리 방침 누르고 돌아가기 누르면 마우스 포인트 이상해진다" — 쪽 넘김(View Transition) 동안 화면을 덮는 ::view-transition에는
  // .cur-on *의 cursor:none이 안 닿아 크롬이 화살표를 띄우고, 덮개가 걷힌 뒤에도 커서 모양을 다시 안 재면 점 + 화살표가 남음(뒤로 가기 bfcache에서 실측)
  // → 넘김이 끝나거나 bfcache로 되살아나면 cur-on을 한 번 뗐다 붙여 크롬이 커서를 다시 정하게 함
  // 같은 날 고침 — cur-on을 떼면 그 두 프레임 동안 화살표가 번뜩였음 → 똑같이 안 보이는 투명 그림 커서(.cur-k)로 잠깐 바꿨다 돌림(값만 바뀌어 크롬이 커서를 다시 정함 · 화살표는 안 나옴)
  // 11/21 페이지 이어 받기(Turbo — 소개 ↔ 시집): body가 통째로 바뀌므로 점 · 말풍선을 새 body로 옮겨 둠(점이 끊기지 않고 그 자리에 그대로) — 새 페이지를 받지 않으니 화살표도 안 나옴
  document.addEventListener("turbo:before-render", (e) => {
    hideTip(); unink(); fld = null;
    const nb = e.detail && e.detail.newBody;
    if (!nb) return;
    if (dot) nb.appendChild(dot);
    if (tipEl) nb.appendChild(tipEl);
  });
  const kick = () => { if (!H.classList.contains("cur-on")) return; H.classList.add("cur-k"); requestAnimationFrame(() => requestAnimationFrame(() => H.classList.remove("cur-k"))); };
  const after = (vt) => { if (vt && vt.finished) vt.finished.then(kick, kick); };
  after(document.activeViewTransition);  // 이 스크립트(defer)가 돌 때 이미 넘김 중이면
  addEventListener("pagereveal", (e) => after(e.viewTransition));
  addEventListener("pageshow", (e) => { if (e.persisted) { if (document.activeViewTransition) after(document.activeViewTransition); else kick(); } });
})();
