/* 동의 창(11/1 동원 "고야드 식으로 하긴 하는데 좀 정확히 따라해봐" · 버튼 "안 1 — 고야드 문구 바탕") — GA4는 동의한 방문만 셈.
   세 단계(고야드 · Didomi와 같은 길): 첫 창 .cz-1 → '자세히 알아보기 →' 동의 관리 .cz-2 → '파트너 보기' 파트너 선택 .cz-3(첫 창의 '1개 파트너사'도 여기로)
   고른 것은 이 기기 localStorage 'consent-ga'에만 {p1 콘텐츠 성과 측정, p2 기기에 정보 저장 및/또는 액세스, g Google Analytics Products, at 고른 때}
   GA4는 p1 · p2 · g가 모두 동의일 때, namdongwon.com 주소에서만 받음 — 이 맥 시험(127.0.0.1) · 자동 조종 브라우저 · 관리 화면 미리 보기에선 받지 않음
   창은 고르기 전에만 저절로 뜸(namdongwon.com · 이 맥 시험은 ?consent=show) · 시집 쪽 첫 방문은 문 장면이 끝난 뒤 · 처리방침 쪽은 저절로 뜨지 않음(읽고 고르시게)
   사람에게 보일 글자는 쪽 HTML(ui.json cz_…)에만 — 글꼴 줄이기가 쪽에서 글자를 모음 */
(() => {
  const w = document.getElementById("cz");
  if (!w) return;
  const H = document.documentElement, KEY = "consent-ga", id = w.dataset.ga;
  const box = [w.querySelector(".cz-1"), w.querySelector(".cz-2"), w.querySelector(".cz-3")];
  const live = /^(www\.)?namdongwon\.com$/.test(location.hostname) && !navigator.webdriver;
  H.classList.add("cz-js");  // 바닥글 · 처리방침의 '쿠키 설정'은 이 파일이 돌 때만 보임
  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v === "object" ? v : null; } catch (x) { return null; } };
  const write = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (x) { /* 저장소를 막은 브라우저 — 이번 방문에만 */ } };
  const ok = v => !!(v && v.p1 && v.p2 && v.g);
  let saved = read(), draft = {}, loaded = false, back = null;

  const load = () => {  // GA4 — 구글이 알려 준 꼴(gtag.js · 측정 ID)[출처 support.google.com/analytics/answer/9304153]
    if (loaded || !live || !id) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    // 광고 쪽 신호는 늘 거부 — 동의 창은 광고 목적을 묻지 않음(11/1 동원 버튼 '통과하면 올려 (권장)' 때 함께 알림)[출처 developers.google.com/tag-platform/security/guides/consent]
    window.gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "granted" });
    window.gtag("js", new Date());
    window.gtag("config", id);
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    document.head.appendChild(s);
  };
  const wipe = () => {  // 동의를 거두면 GA 쿠키(_ga · _ga_…)를 지움 — 이미 받은 이번 쪽의 GA는 동의 없음으로 돌림
    if (loaded && window.gtag) window.gtag("consent", "update", { analytics_storage: "denied" });
    const host = location.hostname.replace(/^www\./, "");
    document.cookie.split(";").map(c => c.split("=")[0].trim()).filter(n => /^_ga/.test(n)).forEach(n =>
      ["", ";domain=" + host, ";domain=." + host].forEach(d => { document.cookie = n + "=;max-age=0;path=/" + d; }));
  };

  // 단추 짝(동의 안 함 · 동의 / 차단 · 인증) — 고른 쪽이 먹. '모든 파트너'는 파트너가 하나라 Google과 같은 값
  const groups = k => [...w.querySelectorAll(k === "g" ? ".cz-va .cz-rd, .cz-vr .cz-rd" : `.cz-r[data-k="${k}"] .cz-rd`)];
  const paint = () => {
    ["p1", "p2", "g"].forEach(k => groups(k).forEach(gr => gr.querySelectorAll("[role=radio]").forEach(b =>
      b.setAttribute("aria-checked", String(draft[k] !== undefined && String(+draft[k]) === b.dataset.v)))));
    box[1].querySelector(".cz-sv").disabled = draft.p1 === undefined || draft.p2 === undefined;  // 고야드: 저장할 모든 환경설정을 설정해야 저장
  };
  w.querySelectorAll(".cz-rd [role=radio]").forEach(b => b.addEventListener("click", () => {
    const row = b.closest("[data-k]");
    draft[row ? row.dataset.k : "g"] = b.dataset.v === "1";
    paint();
  }));

  const info = p => {  // 사용자 정보 보기 — 이 기기에 저장한 선택을 굵은 이름표 줄로(고야드의 사용자 ID · 토큰 자리 · 이름 · 단추 글은 쪽에서 읽음)
    p.textContent = "";
    if (!saved) { p.textContent = p.dataset.none; return; }
    const name = k => w.querySelector(`.cz-r[data-k="${k}"] > .cz-e`).textContent.replace(/^[+-]/, "");
    const word = (k, v) => groups(k)[0].querySelector(`[data-v="${v ? 1 : 0}"]`).textContent;
    const line = (label, value) => { const d = document.createElement("div"), b = document.createElement("b"); b.textContent = label + ": "; d.append(b, value); p.append(d); };
    ["p1", "p2", "g"].forEach(k => line(name(k), word(k, saved[k])));
    line(p.dataset.at, (saved.at || "").replace("T", " ").slice(0, 16));
  };
  w.querySelectorAll(".cz-e").forEach(b => b.addEventListener("click", () => {  // '+' 펼침 — 바로 뒤의 .cz-d
    let d = b.nextElementSibling;
    while (d && !d.classList.contains("cz-d")) d = d.nextElementSibling;
    if (!d) return;
    const open = d.hidden;
    d.hidden = !open;
    b.setAttribute("aria-expanded", String(open));
    b.querySelector(".cz-pl").textContent = open ? "-" : "+";
    if (open && b.classList.contains("cz-u")) info(d);
    const row = b.parentElement;  // 목적 · 파트너 줄을 펼치면 단추 짝이 아래 자리(.cz-rr)로, 접으면 이름 옆으로 — 고야드와 같음
    if (row.matches(".cz-r[data-k]")) {
      const rd = row.querySelector(".cz-rd"), slot = row.querySelector(".cz-rr");
      if (rd && slot) { if (open) slot.appendChild(rd); else b.after(rd); }
    }
  }));

  // 열고 닫기 — 열린 동안 쪽 나머지는 inert(Tab이 창 안에서만) · 닫으면 연 단추로 포커스
  const rest = on => [...document.body.children].forEach(el => { if (el !== w && el.tagName !== "SCRIPT") el.inert = on; });
  const show = n => {
    box.forEach((b, i) => { b.hidden = i !== n - 1; });
    const b = box[n - 1];
    b.tabIndex = -1;
    b.scrollTop = 0;
    b.focus({ preventScroll: true });
  };
  const open = n => {
    if (w.hidden) { back = document.activeElement; w.hidden = false; rest(true); H.classList.add("cz-on"); }
    draft = saved ? { p1: saved.p1, p2: saved.p2, g: saved.g } : {};
    paint();
    show(n);
  };
  const close = () => {
    w.hidden = true;
    rest(false);
    H.classList.remove("cz-on");
    if (back && back.focus && document.contains(back)) back.focus({ preventScroll: true });
  };
  const decide = v => {
    v.at = new Date().toISOString();
    saved = v;
    write(v);
    if (ok(v)) load(); else wipe();
    close();
  };
  box[0].querySelector(".cz-x").addEventListener("click", () => decide({ p1: false, p2: false, g: false }));  // 동의 없이 계속하기
  box[0].querySelector(".cz-yes").addEventListener("click", () => decide({ p1: true, p2: true, g: true }));  // 동의 후 닫기
  box[0].querySelector(".cz-more").addEventListener("click", () => show(2));
  box[0].querySelector(".cz-pt").addEventListener("click", () => show(3));
  box[1].querySelector(".cz-vb").addEventListener("click", () => show(3));
  box[2].querySelector(".cz-bk").addEventListener("click", () => show(2));
  w.querySelectorAll(".cz-sv").forEach(b => b.addEventListener("click", () =>
    decide({ p1: draft.p1 === true, p2: draft.p2 === true, g: draft.g !== false })));  // 파트너를 고르지 않았으면 목적 고른 대로
  const shut = () => (saved ? close() : show(1));  // × · Esc — 고른 적이 없으면 첫 창으로(고야드와 같음)
  w.querySelectorAll(".cz-c").forEach(b => b.addEventListener("click", shut));
  w.addEventListener("keydown", ev => { if (ev.key === "Escape" && box[0].hidden) { ev.preventDefault(); ev.stopPropagation(); shut(); } });
  const sk = w.querySelector(".cz-sk");
  if (sk) sk.addEventListener("click", ev => { ev.preventDefault(); w.querySelector("#cz-sv3").focus(); });  // "저장"으로 건너뛰기 — 주소에 #를 남기지 않게
  document.querySelectorAll(".cz-open").forEach(b => b.addEventListener("click", () => open(2)));  // 바닥글 · 처리방침 '쿠키 설정'

  // 교보 링크 누름 — 동의한 방문에서만 kyobo_click(spot: '책장에 꽂기-첫화면' 등, 관리 화면이 읽는 이름과 같음)
  document.addEventListener("click", ev => {
    const a = ev.target.closest && ev.target.closest("[data-ga-click]");
    if (a && loaded && window.gtag) window.gtag("event", "kyobo_click", { spot: a.dataset.gaClick });
  }, true);

  if (ok(saved)) load();
  else if (!saved && (live || /[?&]consent=show\b/.test(location.search)) && !document.querySelector("main.pp")) {
    const go = () => open(1);
    if (H.classList.contains("intro")) {  // 시집 쪽 첫 방문 — 문 장면이 끝나면(main.js가 intro를 뗌)
      const mo = new MutationObserver(() => { if (!H.classList.contains("intro")) { mo.disconnect(); go(); } });
      mo.observe(H, { attributes: true, attributeFilter: ["class"] });
    } else go();
  }
})();
