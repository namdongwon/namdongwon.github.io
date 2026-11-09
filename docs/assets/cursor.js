// 커서 점 · 누르면 파동(11/9 동원 "시안 영상에서 보여준 마우스 포인터랑 누르면 파동 … 내 웹사이트 들어와도 똑같이" → 시안 커서시안_v1 → "A 점만 (권장)")
// 마우스가 있는 기기: 기본 화살표를 숨기고 점 하나(14px · 뒤집기 — 11/9 밤 동원 '14로 가자')가 따라옴 · 링크 위에서도 같은 모양(11/9 밤 동원 '커지지 않았으면') · 글 칸 위에선 점을 숨기고 기본 글 커서
// 휴대폰 · 손가락: 점 없이 누른 자리에 파동만 · 움직임 줄이기(기기 설정 · 판권면 스위치 — 켜고 끄는 즉시)면 점 · 파동 모두 끔
// 모양은 style.css(.cur · .rip) — 처리방침 · 404처럼 main.js가 없는 쪽에도 따로 실림
// 점 아래 바탕이 어두우면(검은 단추 · 마우스 올린 진회색 단추 등) 순흰 점(.lt) — 뒤집기만으론 #444 위에서 회색(#bbb)이 되어서(11/9 밤 동원 "마우스가 회색이 되는 거 같은데 난 아예 흰색이 되었으면")
(() => {
  const H = document.documentElement;
  const sysReduce = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const calm = () => sysReduce.matches || H.getAttribute("data-motion") === "reduce";
  const TEXT = "input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea,[contenteditable=true]";
  let dot = null, x = 0, y = 0, tx = 0, ty = 0, seen = false, run = false, last = null;
  const dark = (el) => {  // 위로 올라가며 처음 칠해진 바탕색의 밝기 — 0.5 아래면 어두움(그림 · 투명은 건너뜀 · 끝까지 없으면 밝음)
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const m = getComputedStyle(n).backgroundColor.match(/[\d.]+/g);
      if (m && (m.length < 4 || +m[3] > 0.5)) return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255 < 0.5;
    }
    return false;
  };
  const tone = () => last && dot && dot.classList.toggle("lt", dark(last));  // 바탕이 마우스 올림으로 바뀌는 단추도 따라가게 — 옮길 때 · 바탕 바뀜(transitionend) 때
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
    dot.classList.toggle("off", !!(t && t.closest(TEXT)));
    if (t !== last) { last = t; tone(); }
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
  }, { passive: true });
  addEventListener("pointerup", () => dot && dot.classList.remove("dn"), { passive: true });
  H.addEventListener("pointerleave", () => dot && dot.classList.add("off"));  // 창 밖 · 유튜브 틀(iframe) 안으로 가면 숨김
  addEventListener("blur", () => dot && dot.classList.add("off"));
  addEventListener("transitionend", (e) => { if (e.propertyName === "background-color" && last && e.target.contains(last)) tone(); }, { passive: true });
  [sysReduce, fine].forEach((m) => m.addEventListener && m.addEventListener("change", sync));
  new MutationObserver(sync).observe(H, { attributes: true, attributeFilter: ["data-motion"] });
  sync();
})();
