// 연결 끊김 한 장(11/5 동원 "편의 부분 또 없나" → 목업 기준/브랜드 시안/연결끊김시안_v1_휴대폰_A·B.png → "아니다 그냥 바로 A가 낫겠다").
// 쪽을 열 때(navigate)만 지켜봄: 연결이 되면 손대지 않고 그대로, 연결이 없어 받지 못하면 회색 오류 대신 우리 모양 안내 한 장.
// 아무것도 받아 두지 않음(Cache API 없음) — 배포 뒤 옛 화면이 남을 일이 없음. 글은 ui.json offline(빌드가 아래 TEXT 자리에 넣음).
// 끄려면: 이 파일을 self.registration.unregister()만 하는 판으로 배포
const TEXT = {"ko": {"title": "연결 없음 — 남동원", "kicker": "연결 없음", "head": "지금은 연결이<br>닿지 않습니다", "sub": "연결이 돌아오면 이 쪽이 저절로 다시 열립니다.", "retry": "다시 시도"}, "en": {"title": "Offline — Dongwon Nam", "kicker": "Offline", "head": "No connection<br>right now", "sub": "This page will reopen on its own once you are back online.", "retry": "Try again"}, "ja": {"title": "オフライン — ナム・ドンウォン", "kicker": "オフライン", "head": "ただいま接続が<br>ありません", "sub": "接続が戻ると、このページは自動で開き直します。", "retry": "再読み込み"}, "ru": {"title": "Нет связи — Нам Донвон", "kicker": "Нет связи", "head": "Сейчас нет<br>подключения", "sub": "Страница откроется сама, как только связь восстановится.", "retry": "Повторить"}};
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
const page = path => {
  const lang = /^\/(en|ja|ru)\//.test(path) ? path.slice(1, 3) : "ko", t = TEXT[lang];
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${t.title}</title>
<meta name="color-scheme" content="light dark"><style>
:root{--bg:#fff;--ink:#111;--muted:#555;--faint:#717171;--line:#ececec}
@media (prefers-color-scheme:dark){:root{--bg:#111;--ink:#f2f2f2;--muted:#b5b5b5;--faint:#8a8a8a;--line:#2a2a2a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,"Apple SD Gothic Neo","Hiragino Sans",sans-serif;-webkit-font-smoothing:antialiased;word-break:keep-all}
header{display:flex;align-items:center;justify-content:center;height:56px;border-bottom:1px solid var(--line);font-size:12px;letter-spacing:.3em}
main{min-height:calc(100vh - 56px);min-height:calc(100dvh - 56px);display:flex;flex-direction:column;justify-content:center;padding:0 20px 64px;max-width:720px;margin:0 auto}
.k{margin:0 0 16px;font-size:12.5px;font-weight:600;letter-spacing:.5px;color:var(--faint)}
h1{margin:0 0 16px;font:400 30px/1.3 "AppleMyungjo","Hiragino Mincho ProN",serif}  /* 사이트 명조는 받아 두지 않아 기기 명조 — 아이폰은 한글 명조가 없어 고딕 */
p.s{margin:0 0 36px;font-size:15px;font-weight:300;line-height:1.6;color:var(--muted)}
button{align-self:flex-start;padding:14px 20px;border:1px solid var(--ink);border-radius:0;background:none;color:var(--ink);font-family:inherit;font-size:15px;font-weight:600;line-height:1;cursor:pointer}
button:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
</style></head><body><header>NAM DONGWON</header><main><p class="k">${t.kicker}</p><h1>${t.head}</h1><p class="s">${t.sub}</p>
<button type="button" onclick="location.reload()">${t.retry}</button></main>
<script>addEventListener("online", () => location.reload());</script></body></html>`;
};
self.addEventListener("fetch", e => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => new Response(page(new URL(e.request.url).pathname), { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
