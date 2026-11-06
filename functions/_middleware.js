// 스테이징 잠금 보조(11/6 동원 'Access로 잠그기 (권장)') — Cloudflare Pages에서만 도는 미들웨어(GitHub Pages 운영은 이 폴더를 쓰지 않음).
// Access는 staging.namdongwon.com에 걸리므로, 잠금 없는 기본 주소(namdongwon-staging.pages.dev · 그 미리 보기 주소)로 온 요청은 같은 길로 staging 주소에 넘김.
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname.endsWith(".pages.dev")) {
    return Response.redirect("https://staging.namdongwon.com" + url.pathname + url.search, 302);
  }
  return next();
}
