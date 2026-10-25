"""사진 칸을 인스타그램에서 받아 오기(10/24 사진 칸 A) — 빌드할 때 최근 게시물을 받아 .cache/instagram에 두고 build.py에 넘긴다.

공식 길: Instagram API with Instagram Login(프로페셔널 계정 · 공개 계정만 — 개인 계정용 API는 2024-12-04에 끝남).
토큰은 공개 저장소(웹사이트/) 밖 `기준/비밀/instagram_token.txt`에만 둔다. GitHub에서 돌릴 때는 환경 변수 INSTAGRAM_TOKEN.
토큰은 요청 머리줄(Authorization)로만 보내고 주소(URL) · 화면 코드 · 출력에는 넣지 않는다.
토큰은 60일짜리다. 늘리는 요청(refresh_access_token)은 토큰을 주소에 넣어야만 받아 줘서(머리줄 · 본문은 HTTP 400, 10/24 실측) 늘리지 않는다 —
대신 토큰이 바뀐 날을 적어 두고(토큰은 적지 않고 지문 8자만), 끝나기 10일 전부터 빌드가 알린다 → 앱 대시보드에서 다시 만들어 붙여 넣기.
토큰이 없거나 받아 오기에 실패하면 지난번 받아 둔 것(.cache)을, 그것도 없으면 None — build.py가 photos.json의 사진을 그대로 쓴다.
시험할 때만: IG_API_BASE(가짜 서버 주소) · IG_TOKEN_FILE · IG_CACHE(다른 자리)
"""
import hashlib
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from PIL import Image, ImageOps

HERE = Path(__file__).resolve().parent
TOKEN_FILE = Path(os.environ.get("IG_TOKEN_FILE", HERE.parent / "기준/비밀/instagram_token.txt"))
META_FILE = TOKEN_FILE.with_name("instagram_token_meta.json")  # 토큰이 바뀐 날 · 끝나는 날 · 지문 8자(토큰은 없음)
CACHE = Path(os.environ.get("IG_CACHE", HERE / ".cache/instagram"))
API = os.environ.get("IG_API_BASE", "https://graph.instagram.com")
FIELDS = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,children{id,media_type,media_url,thumbnail_url}"
TOKEN_DAYS = 60  # 앱 대시보드에서 만든 토큰의 수명(Meta 문서)


def _token():
    # (토큰, 파일에서 읽었는지) — 환경 변수가 먼저
    t = os.environ.get("INSTAGRAM_TOKEN", "").strip()
    if t:
        return t, False
    if TOKEN_FILE.exists():
        t = TOKEN_FILE.read_text(encoding="utf-8").strip()
        if t:
            return t, True
    return None, False


def _get(path, token, params=None):
    url = API.rstrip("/") + path + ("?" + urllib.parse.urlencode(params) if params else "")
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}", "User-Agent": "namdongwon.com build"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as x:
        # 인스타가 돌려준 까닭(예: 토큰이 끝남)만 — 토큰은 머리줄에만 있어 여기 나오지 않음
        try:
            why = json.loads(x.read().decode("utf-8")).get("error", {}).get("message", "")
        except ValueError:
            why = ""
        raise RuntimeError(f"HTTP {x.code} {why}".strip()) from None


def _age_note(token):
    # 토큰이 바뀌면 그날부터 60일로 적고, 끝나기 10일 전부터 알림
    key = hashlib.sha256(token.encode("utf-8")).hexdigest()[:8]
    meta = json.loads(META_FILE.read_text(encoding="utf-8")) if META_FILE.exists() else {}
    today = datetime.now(timezone.utc).astimezone().date()
    if meta.get("key") != key:
        meta = {"key": key, "added": today.isoformat(), "expires": (today + timedelta(days=TOKEN_DAYS)).isoformat()}
        META_FILE.write_text(json.dumps(meta, indent=1) + "\n", encoding="utf-8")
    left = (date.fromisoformat(meta["expires"]) - today).days
    if left <= 10:
        when = "끝났을 수 있음" if left < 0 else f"{left}일 뒤 끝남"
        print(f"알림: 인스타 토큰이 {when}({meta['expires']}) — Meta 앱 대시보드 '2. 액세스 토큰 생성'에서 토큰 생성을 다시 눌러 {TOKEN_FILE.name}에 붙여 넣기")


def _pick(m, videos):
    # 게시물에서 쓸 그림 한 장: 사진은 그대로, 영상은 표지(videos='cover'일 때만), 여러 장은 첫 사진
    kind = m.get("media_type")
    if kind == "IMAGE":
        return m.get("media_url")
    if kind == "VIDEO":
        return m.get("thumbnail_url") if videos == "cover" else None
    if kind == "CAROUSEL_ALBUM":
        kids = (m.get("children") or {}).get("data", [])
        for k in kids:
            if k.get("media_type") == "IMAGE":
                return k.get("media_url")
        if videos == "cover" and kids:
            return kids[0].get("thumbnail_url")
    return None


def _download(url, dst, maxw=None):
    # 인스타 그림 주소(CDN)에는 토큰을 보내지 않음 — 받은 뒤 그림이 맞는지 한 번 열어 봄.
    # maxw를 주면(게시물 안 사진, 10/25 ⑤ A) 받은 자리에서 그 폭으로 줄여 둠 — 원본 12MP를 빌드마다 다시 줄이지 않게(사진 속 정보는 저장하지 않음)
    tmp = dst.with_name(dst.name + ".tmp")
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "namdongwon.com build"}), timeout=30) as r:
        tmp.write_bytes(r.read())
    with Image.open(tmp) as im:
        im.verify()
    if maxw:
        with Image.open(tmp) as im:
            small = ImageOps.exif_transpose(im).convert("RGB")
        if small.width > maxw:
            small = small.resize((maxw, round(small.height * maxw / small.width)), Image.LANCZOS)
        small.save(tmp, "JPEG", quality=80, optimize=True, progressive=True)
    os.replace(tmp, dst)


def fetch(cfg):
    """최근 게시물 cfg['count']장(기본 8) — [{'id', 'src', 'caption', 'timestamp', 'permalink', 'kids'}] 또는 None. kids는 첫 장 다음 게시물 안 사진(1080px)."""
    count, videos = int(cfg.get("count", 8)), cfg.get("videos", "skip")
    token, from_file = _token()
    if token:
        try:
            if from_file:
                _age_note(token)
            data = _get("/me/media", token, {"fields": FIELDS, "limit": min(50, count * 3)}).get("data", [])
            CACHE.mkdir(parents=True, exist_ok=True)
            feed = []
            for m in data:
                url = _pick(m, videos)
                if not url:
                    continue
                dst = CACHE / f"ig_{m['id']}.jpg"
                if not dst.exists():
                    _download(url, dst)
                # 게시물 안 사진(10/25 ⑤ A — 띠의 사진을 누르면 그 게시물을 넘겨 봄): 첫 장(띠의 사진) 다음 사진들 · 영상은 뺌 · 하나를 못 받으면 그것만 빼고
                imgs = [k for k in (m.get("children") or {}).get("data", []) if k.get("media_type") == "IMAGE" and k.get("id") and k.get("media_url")]
                kids = []
                for k in (imgs[1:] if imgs and imgs[0]["media_url"] == url else imgs):
                    kd = CACHE / f"c_{k['id']}.jpg"
                    try:
                        if not kd.exists():
                            _download(k["media_url"], kd, maxw=1080)
                        kids.append(str(kd))
                    except (urllib.error.URLError, OSError, ValueError) as x:
                        print(f"알림: 게시물 안 사진 하나를 받지 못함({x}) — 빼고 씀")
                feed.append({"id": m["id"], "src": str(dst), "caption": m.get("caption") or "", "timestamp": m["timestamp"], "permalink": m["permalink"], "kids": kids})
                if len(feed) == count:
                    break
            if feed:
                (CACHE / "feed.json").write_text(json.dumps(feed, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
                print(f"인스타그램에서 게시물 {len(feed)}장을 받음")
                return feed
            print("알림: 인스타그램에서 받은 사진이 없음 — 지난번 받아 둔 것을 씀")
        except (RuntimeError, urllib.error.URLError, OSError, KeyError, ValueError) as x:
            print(f"알림: 인스타그램에서 받지 못함({x}) — 지난번 받아 둔 것을 씀")
    saved = CACHE / "feed.json"
    if saved.exists():
        feed = [{**f, "kids": [k for k in f.get("kids", []) if Path(k).exists()]} for f in json.loads(saved.read_text(encoding="utf-8")) if Path(f["src"]).exists()]
        if feed:
            if not token:
                print(f"알림: 인스타 토큰이 없어 지난번 받아 둔 게시물 {len(feed)}장을 씀")
            return feed
    if not token:
        print("알림: 인스타 토큰이 없어 photos.json의 사진을 씀(토큰 자리: 기준/비밀/instagram_token.txt)")
    return None
