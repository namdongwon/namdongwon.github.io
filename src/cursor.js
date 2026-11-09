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
  let dot = null, x = 0, y = 0, tx = 0, ty = 0, seen = false, run = false, fld = null, drag = false;
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
  const tick = () => {  // 거의 붙어 따라오되 아주 조금 부드럽게(0.38)
    x += (tx - x) * 0.38; y += (ty - y) * 0.38;
    dot.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
    if (Math.abs(tx - x) + Math.abs(ty - y) > 0.1) requestAnimationFrame(tick); else run = false;
  };
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || !dot || dot.hidden) return;
    tx = e.clientX; ty = e.clientY;
    if (!seen) { x = tx; y = ty; seen = true; }
    const t = e.target instanceof Element ? e.target : null;
    const f = t && t.closest(TEXT);  // 글 칸 위 — 점이 같은 반전의 가는 세로 막대(I빔)로 바뀜 · 높이는 그 칸 글자 크기(11/10 동원 "지금 마우스 포인터와 매칭되게")
    if (f !== fld) { fld = f; dot.classList.toggle("tx", !!f); if (f) dot.style.setProperty("--tx-h", Math.round(parseFloat(getComputedStyle(f).fontSize) * 1.15) + "px"); }
    const sl = drag && (e.buttons & 1) && !getSelection().isCollapsed;  // 글을 드래그해 고르는 동안 — 글 칸처럼 막대 · 높이는 밑 글자 크기(11/10 동원 "드래그 할 때도 계속 점이거든? 글칸커서처럼")
    if (sl && t && !f) dot.style.setProperty("--tx-h", Math.round(parseFloat(getComputedStyle(t).fontSize) * 1.15) + "px");
    dot.classList.toggle("sl", !!sl && !f);
    dot.classList.toggle("lk", !f && !sl && !!(t && t.closest(LINK)));  // 링크 · 단추 위 — 점이 32px로 커져 글자를 반전(11/10 동원 "닿았을때 원이 좀 더 커졌으면" → 버튼 "32px (권장)")
    dot.classList.remove("off");
    if (!run) { run = true; requestAnimationFrame(tick); }
  }, { passive: true });
  addEventListener("pointerdown", (e) => {
    if (calm()) return;
    const r = document.createElement("span");
    r.className = "rip"; r.setAttribute("aria-hidden", "true");
    r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px";
    document.body.appendChild(r);
    r.addEventListener("animationend", () => r.remove());
    if (dot && e.pointerType === "mouse") dot.classList.add("dn");
    drag = e.pointerType === "mouse" && e.button === 0 && !(e.target instanceof Element && e.target.closest(LINK + "," + TEXT));
  }, { passive: true });
  addEventListener("pointerup", () => { drag = false; if (dot) dot.classList.remove("dn", "sl"); }, { passive: true });
  H.addEventListener("pointerleave", () => dot && dot.classList.add("off"));  // 창 밖 · 유튜브 틀(iframe) 안으로 가면 숨김
  addEventListener("blur", () => { drag = false; if (dot) dot.classList.add("off"); });
  [sysReduce, fine].forEach((m) => m.addEventListener && m.addEventListener("change", sync));
  new MutationObserver(sync).observe(H, { attributes: true, attributeFilter: ["data-motion"] });
  sync();
})();
