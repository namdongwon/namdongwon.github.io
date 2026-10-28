"""namdongwon.com 만들기 — content/와 src/를 읽어 docs/(GitHub Pages가 보여 줄 폴더)를 새로 만든다.

쓰는 법(남무비 폴더에서): tools/.venv/bin/python 웹사이트/build.py
필요한 것: 파이썬 3 + Pillow(사진 줄이기·미리보기 그림) + fontTools·brotli(글꼴을 쓰는 글자만 남겨 woff2로 줄임).
글꼴 원본은 맥의 정해진 자리에서 찾고, 없으면 docs/assets/fonts에 이미 있는 줄인 판을 그대로 쓴다(새 글자가 생겼으면 빠질 수 있어 알림).
"""
import html
import itertools
import json
import math
import os
import re
import shutil
import subprocess
import sys
import unicodedata
from datetime import date, datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from fontTools import subset as ftsubset
from PIL import Image, ImageDraw, ImageFont, ImageOps

sys.path.insert(0, str(Path(__file__).resolve().parent))  # instagram.py는 이 파일 옆 — 다른 스크립트가 build를 불러 써도 찾게
import instagram  # noqa: E402

HERE = Path(__file__).resolve().parent
CONTENT = HERE / "content"
SRC = HERE / "src"
DOCS = HERE / "docs"
ASSETS = DOCS / "assets"
POEM_DIR = Path.home() / "Downloads/남동원 시집"
PTD_DIR = HERE.parent / "기준/폰트"

# 원본 글꼴 → 사이트에서 쓰는 줄인 판(woff2). 라이선스(OFL)상 이름이 예약된 글꼴(Pretendard)은 줄인 판에 다른 이름(NDW …)을 붙인다.
# 명조는 본명조 한 가족(10/26 동원 "응 바꿔" — 나눔명조 · 은바탕에서): 시집 작업 폴더의 BonMyeongjo KR(Noto Serif CJK KR을 TrueType으로 바꾸고
# 이름을 바꾼 판 — 원본 예약 이름 'Source'를 쓰지 않음)이라 이름은 그대로 두고 '줄인 판' 표시만 남긴다. Light는 첫 화면 큰 제목 글자만(LIGHT_ONLY)
FONTS = [
    ("BonMyeongjoKR-Light.ttf", POEM_DIR, "작업 파일)/fonts/out", "bon-myeongjo-light.woff2", False),
    ("BonMyeongjoKR-Regular.ttf", POEM_DIR, "작업 파일)/fonts/out", "bon-myeongjo.woff2", False),
    ("BonMyeongjoKR-Bold.ttf", POEM_DIR, "작업 파일)/fonts/out", "bon-myeongjo-bold.woff2", False),
    ("Pretendard-Light.otf", PTD_DIR, "", "ndw-sans-light.woff2", True),
    ("Pretendard-SemiBold.otf", PTD_DIR, "", "ndw-sans-semibold.woff2", True),
]
# 사이트 글자 말고도 늘 남겨 둘 것: 영문·숫자·기호(주소·계정 이름·숫자 세기)와 쓰는 문장부호
SEARCH_ICON = ('<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true" focusable="false">'
               '<circle cx="8.5" cy="8.5" r="6"/><path d="M13 13l5 5" stroke-linecap="round"/></svg>')  # 맨 위 막대 · 찾기 창의 가는 선 돋보기(10/26)
THEME_ICONS = {k: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + v + '</svg>' for k, v in {
    "system": '<rect x="2.5" y="3.5" width="15" height="10" rx="1.5"/><path d="M7 17h6M10 13.5V17"/>',
    "light": '<circle cx="10" cy="10" r="3.4"/><path d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/>',
    "dark": '<path d="M16.6 12.4A7 7 0 0 1 7.6 3.4a7 7 0 1 0 9 9z"/>',
}.items()}  # 판권면 화면 고르기 그림(10/28 동원 "이모지로 하자 글자 말고" → "B 선 그림 먹") — 돋보기와 같은 20칸 · 선 1.4 · 모니터 · 해 · 달
PAL_FONT = "bon-myeongjo.woff2"  # 글자 팔레트(10/28)의 글자 612가지는 본명조 보통 판에만 담음 — 굵게 · 고딕 판은 늘지 않게(main)
LIGHT_ONLY = "bon-myeongjo-light.woff2"  # 굵기 300은 한국어판 첫 화면 큰 제목(#home .ht)에만 — 그 글자만 담아 가볍게. 다른 곳에 300을 쓰면 여기를 넓힐 것
# 첫 화면 작은 판(10/27 동원 "첫 화면 작은 글꼴은 B로 하자"): 한국어판 첫 화면에 보이는 글자만 담아 미리 받는 판(CSS BMJF · PTDF) — 통째 판(본명조 보통 · 굵게 182KB)을
# 미리 받느라 style.css · main.js가 늦던 것을 덜어 냄(시험용 복사본 실측: 느린 4G 문 열림 3.6 → 3.1초 · 보통 LTE 1.5 → 1.3초, 다 선 화면 같음). 통째 판은 아래 칸에서 그대로 씀
FIRST = {  # 작은 판: (같은 원본의 통째 판, 담을 글자 — first_text())
    "bon-myeongjo-first.woff2": ("bon-myeongjo.woff2", "door"),           # 문 글자(.door .t, 400)
    "bon-myeongjo-bold-first.woff2": ("bon-myeongjo-bold.woff2", "hs"),   # 첫 화면 부제(#home .hs, 700)
    "ndw-sans-light-first.woff2": ("ndw-sans-light.woff2", "home"),       # 첫 화면 작은 글자(#home, 300)
    "ndw-sans-semibold-first.woff2": ("ndw-sans-semibold.woff2", "home"), # 첫 화면 작은 글자(#home, 600)
}
ALWAYS = "".join(chr(c) for c in range(0x20, 0x7F)) + "‘’“”『』「」〈〉《》—–·…→←↑↓↗©\u00a0"  # ↗: 밖으로 나가는 링크(10/24) · 줄 안 바뀜 공백(keep()) · 〈〉《》: 작품 이름 부호(marked())
NOTE = "Subset for namdongwon.com (only the characters used on the site), 2026"
# 영어판 글꼴(10/24 ⑤ B): Newsreader — 기준/폰트/Newsreader/(Google Fonts 저장소에서 내려받음, OFL)
EN_FONTS = [("Newsreader[opsz,wght].ttf", "newsreader.woff2"), ("Newsreader-Italic[opsz,wght].ttf", "newsreader-italic.woff2")]
EN_FIRST = "newsreader-first.woff2"  # 영어판 첫 화면 작은 판(10/27 점검 큼 — 영어판 문이 한국어판보다 0.7초 늦었음): 문 글자 · 첫 화면 글자만 담은 Newsreader(가변 축 그대로)
e = html.escape
NB = "\u00a0"  # 줄 안 바뀜 공백
SPLIT = {}  # 시집 제목 → (큰 제목, 작은 제목) — render()가 원고의 book.display에서 채움(이스케이프한 글, tt())
NAMES = []  # 채널 이름(한 · 영) — render()가 videos.json에서 채움(names())
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def keep(s):
    # 줄 끝(10/24 ⑨): 날짜(2026년 11월 1일)는 한 덩어리로, 가운뎃점은 앞 말에 붙여 줄 머리에 오지 않게 — 이스케이프까지 함께
    s = re.sub(r"(\d+년) (\d+월) (\d+일)", rf"\1{NB}\2{NB}\3", e(s))
    # 영어판(10/24): 치수 '128 × 188 mm'와 날짜 'November 1, 2026'도 한 덩어리로
    s = re.sub(r"(\d+) × (\d+) (mm|cm)", rf"\1{NB}×{NB}\2{NB}\3", s)
    s = re.sub(r"\b(" + "|".join(MONTHS) + r") (\d{1,2}), (\d{4})", rf"\1{NB}\2,{NB}\3", s)
    s = s.replace("교보문고 퍼플", f"교보문고{NB}퍼플").replace("Kyobo PubPle", f"Kyobo{NB}PubPle")  # 상호는 한 덩어리(10/27 점검 남은 것 가2 — 1280 첫 화면 라벨에서 '교보문고 / 퍼플'로 갈렸음)
    return names(s.replace(" · ", NB + "· "))


def names(s):
    # 채널 이름(아름다울 남 · Beautiful Nam)도 한 덩어리 — 10/25 마지막 점검 ②③을 고친 뒤 영어 '지금' 320px에서 'Beautiful / Nam'으로 갈려서
    for n in NAMES:
        s = s.replace(n, n.replace(" ", NB))
    return s


def build_day():
    # 빌드한 날(서울) — 판권면 '고친 날' · 시집 상태 낱말 · 시집 소식이 이 날을 봄. 미리 볼 때는 환경 변수 SITE_TODAY=2026-11-01로 날을 정함
    s = os.environ.get("SITE_TODAY")
    return date.fromisoformat(s) if s else datetime.now(ZoneInfo("Asia/Seoul")).date()


def verify_tags(site):
    # 검색 등록 소유 확인(10/27 동원 "수락" · "네이버도 함께 (권장)") — site.json verify.google · verify.naver에 인증 태그의 content 값만 넣으면
    # 한국어 첫 쪽(주소 맨 앞 — 두 곳 모두 이 주소로 등록) 머리말에 한 줄씩. 비면 넣지 않음 · 인증 뒤에도 지우지 않음(구글 · 네이버가 다시 확인함). 순서 `기준/검색 등록 순서_v1.md`
    v, out = site.get("verify") or {}, []
    for key, name in (("google", "google-site-verification"), ("naver", "naver-site-verification")):
        code = (v.get(key) or "").strip()
        if code and not re.fullmatch(r"[A-Za-z0-9_-]{8,128}", code):
            raise SystemExit(f"검색 인증 값(verify.{key})은 태그의 content 값만 넣음(따옴표 · 태그 없이) — 지금 '{code[:40]}'")
        if code:
            out.append(f'<meta name="{name}" content="{code}">')
    return "".join(out)


def goatcounter(site):
    # 방문 셈(10/27 동원 "수락 — GoatCounter 자리 미리 만들어 줘"): site.json analytics.goatcounter에 GoatCounter 이름(주소 앞부분 — 이름.goatcounter.com)을
    # 넣으면 켜지고 비면 꺼짐. 쿠키 없음 · IP 주소 저장 안 함[출처 goatcounter.com/privacy]. 켜려면 처리방침에 방문 셈 문구(privacy.json의 when "goatcounter")가 먼저 있어야 함
    code = ((site.get("analytics") or {}).get("goatcounter") or "").strip()
    if code and not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,62}", code):
        raise SystemExit(f"GoatCounter 이름은 주소 앞부분만(영문 소문자 · 숫자 · -, 예: namdongwon) — 지금 '{code}'")
    if code and not any(i.get("when") == "goatcounter" for s in (load("privacy.json")["sections"] if (CONTENT / "privacy.json").exists() else []) for i in s["items"]):
        raise SystemExit("방문 셈(analytics.goatcounter)을 켜려면 개인정보 처리방침(content/privacy.json)에 방문 셈 문구(when \"goatcounter\")가 먼저 있어야 함")
    return code


def book_card(site):
    # 출간일 공유 카드(10/27 동원 "공유 카드는 B로 하자"): 나온 날(book.published)부터 book.card_until 전날까지는 링크 미리보기를 책 카드로
    # (그림 og-book.jpg · og-book-en.jpg + og:title을 책 제목으로) — 그 밖엔 이름 카드. 정적 사이트라 그날 뒤 처음 빌드할 때 바뀜
    bk = site["book"]
    return date.fromisoformat(bk["published"]) <= build_day() < date.fromisoformat(bk.get("card_until", "9999-12-31"))


# 작품 이름 부호(10/24 ⑩ A): 영화·작품 〈 〉 · 책 『 』 · 시 「 」 · 전시 《 》 — 문장 부호 규정(2015)과 관행
MARKS = {"영화": "〈〉", "작품": "〈〉", "책": "『』", "시": "「」", "전시": "《》"}


def marked(kind, title, lang="ko"):
    if kind not in MARKS:
        raise ValueError(f"갈래 '{kind}'에 맞는 부호가 없음 — {' · '.join(MARKS)} 중 하나로")
    if lang == "en":  # 영어판(10/24): 영화 · 책 · 전시 · 작품은 기울임, 시는 따옴표(영어 관행)
        return f"“{e(title)}”" if kind == "시" else f"<i>{e(title)}</i>"
    return MARKS[kind][0] + e(title) + MARKS[kind][1]


def art_parts(a, lang="ko"):
    # 전시 작품 캡션(10/24 ⑩ · ⑫): 앞 '작가, 〈작품〉, 해' · 뒤 '《전시》, 미술관' — 빈 칸은 건너뜀
    head = ", ".join(x for x in (e(a.get("artist", "")), marked("작품", a["title"], lang) if a.get("title") else "", e(a.get("year", ""))) if x)
    tail = ", ".join(x for x in (marked("전시", a["show"], lang) if a.get("show") else "", e(a.get("venue", ""))) if x)
    return head, tail


def art_line(a, lang="ko"):
    # 한 줄로 쓸 때: '작가, 〈작품〉, 해 — 《전시》, 미술관'
    head, tail = art_parts(a, lang)
    return head + (" — " + tail if tail else "")


def sentence(w, lang="ko", kinds=None):
    # 대표 편 정보 한 문장(10/24 ⑩ A — Le Cinéma Club식): '영화 〈제목〉 만든 이. 2001. 일본.' / 'Film *Title* Maker. 2001. Japan.'
    # 제목 · 만든 이만 먹, 갈래 낱말과 나머지는 옅게(Kunsthalle Basel식 진하기 위계). 사람 이름은 한 덩어리로.
    # data-title은 부호 없는 제목 — 재생 단추 · 플레이어 이름(main.js). 영어판 제목은 <cite>가 기울임(style.css)
    who = e(w["creator"]).replace(" ", NB)
    tail = "".join(f" {keep(x)}." for x in w.get("facts", []))
    kind = e((kinds or {}).get(w["kind"], w["kind"]))
    name = marked(w["kind"], w["title"]) if lang == "ko" else e(w["title"])
    return (f'<p class="vt" data-title="{e(w["title"])}">{kind} <b><cite>{name}</cite> {who}</b>.{tail}</p>')




def ordinal(n):
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def printing_no(co):
    # 판권면 쇄 = 이 판 첫 올림(colophon.edition_start 커밋)부터 docs/를 바꿔 GitHub main에 올린 기록 수 + 1 — 지금 빌드가 다음 올림(10/25 관리 화면 세션 제안 · 동원 수락)
    # git이 없거나 그 커밋이 기록에 없으면(관리 화면 시험의 가짜 저장소 등) colophon.printing 그대로. 판을 올리면 edition_start를 비우고 그 판 첫 올림 뒤 그 커밋을 적음
    start = co.get("edition_start", "")
    if not start:
        return co["printing"]
    try:
        r = subprocess.run(["git", "-C", str(HERE), "rev-list", "origin/main", "--", "docs"], capture_output=True, text=True, timeout=10)
    except (OSError, subprocess.SubprocessError):
        return co["printing"]
    ids = r.stdout.split() if r.returncode == 0 else []
    n = next((i + 1 for i, c in enumerate(ids) if c.startswith(start)), 0)
    return n + 1 if n else co["printing"]


def merge(a, b):
    # 영어 칸(en)을 한국어 위에 덮음 — 사전은 칸마다, 같은 길이의 사전 목록(링크 · 기록)은 순서대로, 나머지는 통째로
    if isinstance(a, dict) and isinstance(b, dict):
        return {**a, **{k: merge(a[k], v) if k in a else v for k, v in b.items()}}
    if isinstance(a, list) and isinstance(b, list) and len(a) == len(b) and all(isinstance(x, dict) for x in a + b):
        return [merge(x, y) for x, y in zip(a, b)]
    return b


def localize(obj, lang):
    # 영어판(10/24): 원고마다 붙은 'en' 칸을 덮어씀 — 한국어판은 원고 그대로('en' 칸만 뺌)
    if isinstance(obj, dict):
        out = {k: localize(v, lang) for k, v in obj.items() if k != "en"}
        return merge(out, localize(obj["en"], lang)) if lang == "en" and isinstance(obj.get("en"), dict) else out
    if isinstance(obj, list):
        return [localize(x, lang) for x in obj]
    return obj


# 관리 화면이 고치는 작은 표(데이터 설계서 v2 ① — 10/25 원고 옮기기): 지금 · 시집 소식 · 이달의 한 줄 · 연표. 시험처럼 site에 미리 넣어 준 표가 있으면 그것을
TABLES = {"now": "now.json", "news": "news.json", "monthly": "monthly.json", "years": "years.json"}
# 영어가 비면(설계서 5절 — 빈 글 ""과 칸 없음은 같은 뜻): 문장 칸(글 · 각주 · 영상 사실 · 스틸 출처)은 영어판에서 숨김(빈 글) · 이름 칸은 한국어 그대로 · 말이 없는 칸은 그대로
NAME_KEYS = {"label", "title", "creator", "artist", "show", "venue", "where", "name"}
PLAIN_KEYS = {"updated", "date", "month", "year", "kind", "thumb", "youtube_id", "post", "page", "n", "link", "url", "id"}


def tables(site):
    return {k: site[k] if k in site else load(f) for k, f in TABLES.items()}


def row_lang(row, lang):
    # 관리 화면이 고치는 표의 줄 → 그 말의 값(줄 안 en 칸, 설계서 원칙 4). 한국어판은 en 칸만 뺌
    if isinstance(row, list):
        return [row_lang(x, lang) for x in row]
    if not isinstance(row, dict):
        return row
    ko = {k: row_lang(v, lang) for k, v in row.items() if k != "en"}
    if lang != "en":
        return ko
    en, out = row.get("en") or {}, {}
    for k, v in ko.items():
        ev = en.get(k)
        if isinstance(row[k], dict):
            out[k] = row_lang({**row[k], "en": ev if isinstance(ev, dict) else {}}, lang)
        elif k in PLAIN_KEYS:
            out[k] = v
        elif ev in (None, "", []):
            out[k] = v if k in NAME_KEYS else ([] if isinstance(v, list) else "")
        else:
            out[k] = ev
    return out


def link_url(site, lid):
    # 주소는 site.json links 한 곳에만(설계서 ③) — 다른 곳은 이름표(id)로 가리킴
    return next((l["url"] for l in site["links"] if l.get("id") == lid), "")


def is_art(p):
    # 작품 정보 칸에 글이 하나라도 있으면 작품 사진(자르지 않음 · 흰 벽 — 설계서 4-6)
    return bool(p.get("art")) and any(str(x).strip() for x in p["art"].values())


def tt(t, ko, tail=""):
    # 작품 제목은 바로 붙은 문장부호 · 조사까지 한 덩어리(.tt — 칸에 들어가면 통째로 다음 줄, 칸보다 길면 그 안에서만 갈림 · 10/25 마지막 점검 ②③).
    # 시집 제목은 그 안을 표지 줄 나눔(큰 제목 | 작은 제목) 두 토막으로 다시 감쌈 — 칸보다 길 때(휴대폰 약력 등)도 '문을 열고 나오면 / 살아 있는 …' 자리에서만 나뉨
    if t in SPLIT:
        a, z = SPLIT[t]
        if ko:
            return f'<span class="tt"><span class="tt">『{a}</span> <span class="tt">{z}』{tail}</span></span>'
        return f'<span class="tt"><i><span class="tt">{a}</span> <span class="tt">{z}</span></i>{tail}</span>'  # 기울임은 한 제목에 하나
    return f'<span class="tt">『{t}』{tail}</span>' if ko else f'<span class="tt"><i>{t}</i>{tail}</span>'


def rich(s):
    # 영어 글의 *별표*는 기울임(작품 제목) — 이스케이프한 뒤에. 영어 제목 · 한국어 『제목』 모두 tt()로
    s = re.sub(r"\*([^*]+)\*([.,;:!?’”)]*)", lambda m: tt(m.group(1), False, m.group(2)), e(s))
    return names(re.sub(r"『([^』]*)』([가-힣]*)", lambda m: tt(m.group(1), True, m.group(2)), s))


def note_html(s, en):
    # 연표 각주(10/25 40곳 2차 ④): 날짜 · 가운뎃점은 keep()대로, 작품 제목 안 띄어쓰기는 붙여 두 줄로 갈리지 않게 — 영어는 *별표* 기울임, 한국어는 〈 〉 《 》
    s = keep(s)
    if en:
        return re.sub(r"\*([^*]+)\*", lambda m: "<i>" + m.group(1).replace(" ", NB) + "</i>", s)
    return re.sub(r"[〈《][^〉》]*[〉》]", lambda m: m.group(0).replace(" ", NB), s)


SEASON_WARNED = []


def season_of(d):
    # 24절기(10/25 40곳 2차 ⑤ A — ミナ ペルホネン식): d가 든 절기(시작 날이 d 이전인 마지막 것) → (한국어, 영어). content/seasons.json 표 밖이면 None
    s = load("seasons.json")
    rows = sorted((date.fromisoformat(x), n) for k, v in s.items() if k.isdigit() for x, n in v)
    if not rows or d < rows[0][0] or d >= rows[-1][0] + timedelta(days=14):
        if not SEASON_WARNED:
            SEASON_WARNED.append(1)
            print(f"알림: 절기 표(content/seasons.json)에 {d}가 든 절기가 없어 '지금' 꼬리표 옆 절기를 뺌 — 다음 해 줄을 더할 것")
        return None
    n = [n for x, n in rows if x <= d][-1]
    return n, s["names_en"][n]


def stanzas_of(text):
    # 연은 빈 줄로, 행은 한 줄씩
    out, cur = [], []
    for line in text.strip().splitlines():
        if line.strip():
            cur.append(line.strip())
        elif cur:
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out

# 첫 그림이 그려지기 전에 html에 표시를 붙인다: js(움직임을 켬) · intro(문 장면 — 첫 방문 한 번만, '동작 줄이기'나 #주소로 들어오면 생략, ?door면 다시 봄)
HEAD_JS = """<script>(function(){var H=document.documentElement;H.classList.add("js");try{var th=localStorage.getItem("theme");if(th==="dark"||th==="system")H.setAttribute("data-theme",th)}catch(x){}try{var m=matchMedia("(prefers-reduced-motion: reduce)").matches,
again=/[?&]door\\b/.test(location.search);if(!m&&!location.hash&&(again||!localStorage.getItem("door"))){H.classList.add("intro");localStorage.setItem("door","1")}else if(localStorage.getItem("door"))H.classList.add("seen")}catch(x){}})();</script>"""


CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"
VFIRST = {9: 8, 10: 8, 11: 8, 14: 13, 15: 13, 16: 13, 19: 18}  # 겹모음은 두 번에 침: ㅘㅙㅚ←ㅗ · ㅝㅞㅟ←ㅜ · ㅢ←ㅡ


def typing_steps(text):
    # 이름을 두벌식으로 칠 때 화면에 보이는 차례(남동원 → ㄴ 나 남 남ㄷ 남도 남동 남동ㅇ 남동우 남동워 남동원).
    # 페이지에 적어 두면 이 글자들이 줄인 글꼴에 함께 들어감(첫 화면 이름 자모 타자 — main.js)
    out, done = [], ""
    for ch in unicodedata.normalize("NFC", text):
        code = ord(ch) - 0xAC00
        if 0 <= code < 11172:
            c, v, t = code // 588, (code % 588) // 28, code % 28

            def syl(vv, tt=0):
                return chr(0xAC00 + (c * 21 + vv) * 28 + tt)
            out.append(done + CHO[c])
            if v in VFIRST:
                out.append(done + syl(VFIRST[v]))
            out.append(done + syl(v))
            if t:
                out.append(done + syl(v, t))
        elif ch.strip():
            out.append(done + ch)
        done += ch
    return out


def find(root, name, must_in=""):
    # 맥 한글 이름은 NFD로 저장될 때가 있어 NFC로 맞춰 찾는다
    if not root.exists():
        return None
    for dp, dn, fn in os.walk(root):
        for f in fn:
            if unicodedata.normalize("NFC", f) == name and must_in in unicodedata.normalize("NFC", dp):
                return Path(dp) / f
    return None


def load(name):
    return json.loads((CONTENT / name).read_text(encoding="utf-8"))


def save_jpg(src, dst, maxw, quality=80):
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")  # 사진 속 정보(위치 등)는 저장하지 않음
    if im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "JPEG", quality=quality, optimize=True, progressive=True)
    return im.size


def psrc(p):
    # 사진 원본 자리 — 인스타에서 받아 온 것은 .cache/instagram, 나머지는 content/photos
    return Path(p["src"]) if p.get("src") else CONTENT / "photos" / p["file"]


# 그림 글자(이모지) — 캡션에서 뺌(10/24, 무채색 사이트에서 색 그림으로 튐). 피부색 · 이음표(ZWJ) · 꾸밈 표시까지
EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿⬅-⬇⬛⬜⭐⭕⌚⌛"
                   "⏩-⏳⏸-⏺︎️‍⃣]")


def first_line(caption, limit=60):
    # 인스타 글의 첫 줄(10/24 사진 칸 A) — 해시태그 · 그림 글자는 빼고(그러고 나서 빈 줄이면 다음 줄), 길면 낱말 끝에서 줄임
    clean = (re.sub(r"\s{2,}", " ", re.sub(r"\s*#\S+", "", EMOJI.sub("", x))).strip() for x in caption.splitlines())
    line = next((x for x in clean if x), "")
    if len(line) > limit:
        cut = line[:limit]
        line = (cut.rsplit(" ", 1)[0] if " " in cut else cut).rstrip(" ,.·") + "…"
    return line


def ig_items(feed, overrides):
    # 받아 온 게시물 → 사진 칸 한 장(photos.json의 items와 같은 꼴). 날짜는 서울 기준.
    # 캡션 · 전시 작품 정보를 덧씌울 때는 게시물 주소 끝 글자로(photo_art.json 줄의 post — …/p/ABC123/ → "ABC123")
    out = []
    for f in feed:
        d = datetime.strptime(f["timestamp"], "%Y-%m-%dT%H:%M:%S%z").astimezone(ZoneInfo("Asia/Seoul"))
        code = f["permalink"].rstrip("/").rsplit("/", 1)[-1]
        it = {"file": f"ig_{f['id']}.jpg", "src": f["src"], "kids": [k for k in f.get("kids", []) if Path(k).exists()], "where": first_line(f["caption"]), "when": "", "credit": "",
              "date": f"{d.year}년 {d.month}월 {d.day}일", "link": f["permalink"], "en": {"date": f"{MONTHS[d.month - 1]} {d.day}, {d.year}"}}
        over = overrides.get(code, {})  # photo_art.json의 그 게시물 줄(10/25 원고 옮기기 — 전에는 photos.json instagram.overrides)
        ko = {k: v for k, v in over.items() if k not in ("en", "post") and v not in ("", None)}
        if "art" in ko and not is_art(ko):
            del ko["art"]
        oe = {k: ({kk: vv for kk, vv in v.items() if vv not in ("", None)} if isinstance(v, dict) else v)
              for k, v in (over.get("en") or {}).items() if v not in ("", None)}  # 영어가 빈 칸은 덮지 않음 — 이름 · 캡션 첫 줄은 한국어 그대로(설계서 5절)
        out.append({**it, **ko, "en": {**it["en"], **{k: v for k, v in oe.items() if v != {}}}})
    return out


def out_size(src, maxw):
    # save_jpg가 저장할 크기(그림을 다 풀지 않고 머리만 읽음, 사진 속 회전 정보 반영) — <img>의 width · height를 실제 비율로
    with Image.open(src) as im:
        w, h = im.size
        if im.getexif().get(274) in (5, 6, 7, 8):
            w, h = h, w
    return (maxw, round(h * maxw / w)) if w > maxw else (w, h)


def font(path, size):
    return ImageFont.truetype(str(path), size)


def used_text(pages):
    # 줄인 글꼴에 남길 글자: 만든 쪽(HTML)의 모든 글자 + main.js의 문자열(안내 문구) + 늘 남길 것. main.js의 주석 글자는 빼서 가볍게
    js = (SRC / "main.js").read_text(encoding="utf-8")
    strings = "".join(m.group(0) for m in re.finditer(r'"(?:[^"\\\n]|\\.)*"|`[^`]*`', js))
    return unicodedata.normalize("NFC", "".join(pages) + strings + ALWAYS)


def first_text(page):
    # 첫 화면 작은 판(FIRST)에 담을 글자 — 만든 한국어판 쪽에서: 문 글자(.door .t) · 부제(#home .hs) · #home 전체(이름 치는 중간 글자 data-type 포함).
    # 빈칸 · 부호(ALWAYS[95:])는 다른 판처럼 늘 담음(가는 본명조 큰 제목 판과 같은 규칙)
    home = re.search(r'<section id="home".*?</section>', page, re.S).group(0)
    plain = lambda s: html.unescape(re.sub(r"<[^>]+>", "", s))  # noqa: E731
    door = plain(re.search(r'<div class="door".*?<i class="gap"></i></div>', page, re.S).group(0))
    hs = plain("".join(re.findall(r'<p class="hs[^"]*">(.*?)</p>', home, re.S)))
    ht = plain("".join(re.findall(r'<p class="ht[^"]*">(.*?)</p>', home, re.S)))
    sans = plain(home) + "".join(re.findall(r'data-type="([^"]*)"', home))
    out = {k: unicodedata.normalize("NFC", v + " " + ALWAYS[95:]) for k, v in (("door", door), ("hs", hs), ("home", sans))}
    out["serif"] = unicodedata.normalize("NFC", door + ht + hs + " ")  # 영어판 Newsreader 작은 판 — 문 글자 · 큰 제목 · 부제만(부호 · ASCII 통째는 빼서 가볍게, 없는 글자는 통째 판으로)
    return out


def rename_font(font):
    # OFL의 예약된 이름(Pretendard · 지난 나눔명조)을 줄인 판에서 쓰지 않게 이름표를 바꿈
    for r in font["name"].names:
        s = r.toUnicode()
        if r.nameID in (3, 6):
            s = s.replace("NanumMyeongjo", "NDWMyeongjo").replace("Pretendard", "NDWSans")
        else:
            s = (s.replace("NanumMyeongjoBold", "NDW Myeongjo Bold").replace("NanumMyeongjo", "NDW Myeongjo")
                 .replace("나눔명조", "NDW Myeongjo").replace("Pretendard", "NDW Sans"))
        r.string = s
    if "CFF " in font:  # Pretendard(OTF)는 글꼴 안 CFF 표에도 이름이 있음
        cff = font["CFF "].cff
        cff.fontNames = [n.replace("Pretendard", "NDWSans") for n in cff.fontNames]
        td = cff.topDictIndex[0]
        for k in ("FullName", "FamilyName"):
            if hasattr(td, k):
                setattr(td, k, getattr(td, k).replace("Pretendard", "NDW Sans"))


def subset_font(src, dst, text, rename):
    opts = ftsubset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]      # 자간·대체 글자 같은 글꼴 기능은 모두 남김
    opts.name_IDs = ["*"]             # 저작권·라이선스 이름표(0·13·14)까지 남김
    opts.notdef_outline = True
    opts.desubroutinize = True        # woff2 압축이 더 잘 되게(Pretendard의 CFF)
    opts.drop_tables += ["FFTM", "feat", "morx"]  # 글꼴 편집기·맥 전용 표는 웹에 필요 없음
    f = ftsubset.load_font(str(src), opts)
    sub = ftsubset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(f)
    # 붙임 공백(U+00A0, keep()이 날짜 · 가운뎃점을 묶을 때 씀)을 보통 공백과 같은 글리프로 — 본명조는 붙임 공백이 보통 공백보다 넓어 묶은 자리만 벌어졌음(10/26)
    for t in f["cmap"].tables:
        if 0x20 in t.cmap and 0xA0 in t.cmap:
            t.cmap[0xA0] = t.cmap[0x20]
    if rename:
        rename_font(f)
    # 바꾼 판이라는 표시(GPL 2(a) — 은바탕), 다른 글꼴에도 같은 표시 — 원래 설명 뒤에 덧붙임
    old = f["name"].getName(10, 3, 1, 0x409)
    f["name"].setName((old.toUnicode() + " / " if old else "") + NOTE, 10, 3, 1, 0x409)
    ftsubset.save_font(f, str(dst), opts)


def vfont(path, size, axes):
    # 가변 글꼴(Newsreader)을 굵기 · 글자 크기 축을 정해 씀
    f = ImageFont.truetype(str(path), size)
    f.set_variation_by_axes(list(axes))
    return f


def og_chip(d, x, y, h, text, f):
    # 책 카드의 상태 낱말 — 사이트 책 카드(.bstate)와 같은 결: 테두리 알약 + 점 + 낱말. 알약 오른쪽 끝 x를 돌려줌
    tw = d.textlength(text, font=f)
    w = round(h * 0.55 + h * 0.32 + tw + h * 0.55)
    d.rounded_rectangle((x, y, x + w, y + h), radius=h // 2, outline="#111111", width=max(2, h // 26))
    r, cx, cy = h * 0.12, x + h * 0.55, y + h / 2
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill="#111111")
    d.text((cx + h * 0.32, cy), text, font=f, fill="#111111", anchor="lm")
    return x + w


def og_book(d, site, src, lang, words, room):
    # 출간일 책 카드(10/27 B — 시안 기준/브랜드 시안/공유카드시안_v1): 사이트 첫 화면과 같은 차례 — '이름 첫 시집' → 큰 제목(가는 본명조 ·
    # 영어판 Newsreader) → 굵은 부제 → '● 판매 중 · 교보문고 퍼플' → 주소. 칸(room)보다 긴 줄은 글자를 줄임
    bk, en = site["book"], lang == "en"
    sans = {600: src["Pretendard-SemiBold.otf"], 300: src["Pretendard-Light.otf"]}

    def fit(make, lines, size, low):
        while max(make(size).getlength(t) for t in lines) > room and size > low:
            size -= 2
        return make(size), size

    kick = words["kick"].format(name=site["name"])
    kf, _ = fit(lambda s: font(sans[600], s), [kick], 34, 22)
    d.text((100, 92), kick, font=kf, fill="#111111")
    big, small = bk["display"]["big"], " ".join(bk["display"]["small"])
    tf, ts = fit((lambda s: vfont(src["NR"], s, (380, 72))) if en else (lambda s: font(src["BonMyeongjoKR-Light.ttf"], s)), big, 100, 60)
    lh, y = round(ts * 1.12), 150
    for t in big:
        d.text((94, y), t, font=tf, fill="#111111")
        y += lh
    sf, ss = fit((lambda s: vfont(src["NR"], s, (650, 36))) if en else (lambda s: font(src["BonMyeongjoKR-Bold.ttf"], s)), [small], 40, 28)
    y += 24
    d.text((100, y), small, font=sf, fill="#111111")
    y += ss + 32
    end = og_chip(d, 100, y, 64, words["on"], font(sans[600], 32))
    d.text((end + 18, y + 32), bk["store"], font=font(sans[300], 32), fill="#111111", anchor="lm")
    d.text((100, 566), site["base_url"].replace("https://", "") + ("/en" if en else ""), font=font(sans[300], 22), fill="#717171")


def make_og(site, cover, src, lang="ko", words=None):
    # 카톡·인스타에 링크를 붙였을 때 뜨는 미리보기 그림(1200×630) — 줄이기 전 원본 글꼴로 그림. 영어판은 og-en.jpg(Newsreader)
    # words(책 카드 낱말 — kick · on)가 있으면 출간일 책 카드 og-book.jpg · og-book-en.jpg(10/27 B). 이름 카드는 늘 그대로 만듦(예전에 읽어 간 주소가 비지 않게)
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(im)
    c = ImageOps.exif_transpose(Image.open(cover)).convert("RGB")
    ch = 500
    c = c.resize((round(c.width * ch / c.height), ch), Image.LANCZOS)
    x, y = W - c.width - 110, (H - ch) // 2
    if words:
        og_book(d, site, src, lang, words, x - 100 - 48)
        out = "og-book-en.jpg" if lang == "en" else "og-book.jpg"
    elif lang == "ko":
        d.text((96, 232), site["name"], font=font(src["BonMyeongjoKR-Bold.ttf"], 118), fill="#111111")
        d.text((100, 392), site["tagline"], font=font(src["BonMyeongjoKR-Regular.ttf"], 34), fill="#555555")  # 회색은 사이트 토큰과 같이(10/24 ⑨ --muted)
        d.text((100, 540), site["base_url"].replace("https://", ""), font=font(src["Pretendard-Light.otf"], 24), fill="#717171")  # --faint
        out = "og.jpg"
    else:
        room = x - 100 - 48
        size = 108
        while vfont(src["NR"], size, (650, 72)).getlength(site["name"]) > room and size > 60:
            size -= 2
        d.text((96, 196), site["name"], font=vfont(src["NR"], size, (650, 72)), fill="#111111")
        tf, yy = vfont(src["NR"], 34, (400, 34)), 196 + size + 44
        for line in _wrap(d, site["tagline"], tf, room):
            d.text((100, yy), line, font=tf, fill="#555555")
            yy += 48
        d.text((100, 540), site["base_url"].replace("https://", "") + "/en", font=font(src["Pretendard-Light.otf"], 24), fill="#717171")
        out = "og-en.jpg"
    d.rectangle((x - 1, y - 1, x + c.width, y + ch), outline="#e2e2e2")
    im.paste(c, (x, y))
    im.save(ASSETS / out, "JPEG", quality=86, optimize=True)


def _wrap(d, text, f, maxw):
    # 행이 넓이를 넘으면 낱말 사이에서 넘김(넘어간 부분은 그리는 쪽에서 한 글자 들여씀 — 사이트와 같음)
    lines, cur = [], ""
    for wd in text.split(" "):
        t = (cur + " " + wd).strip()
        if d.textlength(t, font=f) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = wd
    lines.append(cur)
    return lines


def make_takbon(site, poem, src):
    # '간직하기'로 저장되는 그림(9:16, 인스타 스토리) — 흰 바탕 위 곧은 가장자리의 검은 판에 또렷한 흰 글자로 「탁본」 전문,
    # 아래에 시집 이름과 사이트 주소(시안 v11 A + 10/24 결 정돈). 줄이기 전 원본 글꼴로 그림
    W, H, (x0, y0, x1, y1) = 1080, 1920, (64, 70, 1016, 1650)
    sw, sh = x1 - x0, y1 - y0
    im = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(im)
    d.rectangle((x0, y0, x1 - 1, y1 - 1), fill=(12, 12, 12))
    ink = (240, 240, 240)
    d.text((x0 + 84, y0 + 96), f"「{site['poem']['title']}」", font=font(src["BonMyeongjoKR-Bold.ttf"], 54), fill=ink)
    stanzas = [s.split("\n") for s in poem.strip().split("\n\n")]
    size = 34
    while True:  # 시 전체가 판 안에 들어가는 크기
        f, lh = font(src["BonMyeongjoKR-Regular.ttf"], size), round(size * 1.72)
        rows = sum(len(_wrap(d, ln, f, sw - 168 - size)) for st in stanzas for ln in st) + len(stanzas) - 1
        if 206 + rows * lh <= sh - 80 or size <= 24:
            break
        size -= 1
    y = y0 + 206
    for si, st in enumerate(stanzas):
        y += lh if si else 0
        for ln in st:
            for k, part in enumerate(_wrap(d, ln, f, sw - 168 - size)):
                d.text((x0 + 84 + (size if k else 0), y), part, font=f, fill=ink)
                y += lh
    d.text((70, 1712), f"{site['name']} 시집 『{site['book']['title']}』", font=font(src["Pretendard-Light.otf"], 27), fill=(98, 98, 98))
    d.text((70, 1762), site["base_url"].replace("https://", ""), font=font(src["Pretendard-SemiBold.otf"], 28), fill=(17, 17, 17))
    im.save(ASSETS / "img" / "takbon.jpg", "JPEG", quality=90, optimize=True)


ICON_V = 3  # 아이콘 주소 끝 ?v= — 아이콘 모양을 바꾸면 하나 올림(브라우저가 옛 탭 아이콘을 오래 기억해서, 10/26 동그라미 · 10/28 바탕 뺌)


def make_icons():
    # 바탕 없는 먹 동그라미(10/28 동원 "바탕없는 먹 동그라미는 어때?" → "C 바탕 없는 동그라미" — 전엔 흰 네모 위 먹 동그라미, 10/26 동원 "검정색 동그라미로 하자").
    # 지름 40/64 그대로 흰 네모만 뺌 — 회색 탭 막대(안 고른 탭)에서 상자 없이 점 하나. 어두운 탭 막대에서는 사이트 어둡게의 먹(#ecebe6)으로 —
    # SVG 안 prefers-color-scheme은 크롬 · 엣지 · 파이어폭스가 따르고 사파리는 무시(먹 그대로 · WebKit 버그 309949). 시안 `기준/브랜드 시안/탭아이콘시안_v2_지금·A·C.png`
    (DOCS / "favicon.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><style>circle{fill:#111}'
        '@media (prefers-color-scheme:dark){circle{fill:#ecebe6}}</style>'
        '<circle cx="32" cy="32" r="20"/></svg>\n', encoding="utf-8")
    for size, name, paper in ((32, "favicon-32.png", False), (180, "apple-touch-icon.png", True)):
        # 32px는 투명 바탕(SVG를 못 쓰는 곳) · 홈 화면 그림은 흰 바탕 그대로(투명하면 iOS가 검게 채움)
        big = size * 8  # 8배로 그려 줄임 — 작은 크기에서도 가장자리가 매끈하게
        im = Image.new("RGBA", (big, big), (255, 255, 255, 255 if paper else 0))
        m = big * 12 / 64
        ImageDraw.Draw(im).ellipse((m, m, big - m, big - m), fill=(17, 17, 17, 255))
        im = im.resize((size, size), Image.LANCZOS)
        (im.convert("RGB") if paper else im).save(DOCS / name)


def render(site, poem, videos, photos, lang="ko"):
    # 같은 틀로 한국어판(docs/)과 영어판(docs/en/)을 찍음(10/24 영어판) — 화면 낱말은 content/ui.json, 내용의 영어는 원고마다 'en' 칸
    ui = load("ui.json")
    L = {k: v[lang] if isinstance(v, dict) and lang in v else v for k, v in ui.items() if not k.startswith("_")}

    def t(key, **kw):
        return e(L[key]).format(**kw)
    S, PH = localize(site, lang), localize(photos, lang)
    tb = tables(site)
    # 사이트 안 찾기(10/26 검색 A)의 찾을 거리 — 칸을 그리면서 갈래마다 [갈래 이름, 글, 자리, 갈 곳]을 모아 쪽 안 JSON(#sidx)으로. 갈래 차례가 결과의 차례
    ix = {k: [] for k in ("sec", "book", "toc", "poem", "me", "news", "photo", "video", "contact")}  # 찾은 것이 같은 자리에서 맞으면 이 차례(칸 이름이 먼저)
    tg = dict(zip(("toc", "poem", "book", "me", "news", "photo", "video", "contact", "sec"), L["search_tags"].split("|")))  # ui.json search_tags 차례대로
    plain = lambda s: re.sub(r"\*", "", s)  # noqa: E731 — 영어 원고의 *기울임* 표시는 찾기 글에서 뺌
    # 영상(videos.json — 다음 편 · 올린 편): 5절 규칙, 올린 편은 날짜로 최근 것부터(설계서 ④)
    V = {"upcoming": row_lang(videos.get("upcoming") or {}, lang),
         "items": sorted((row_lang(x, lang) for x in videos.get("items", [])), key=lambda x: x.get("date", ""), reverse=True)}
    en = lang == "en"
    P = "../" if en else ""  # 영어판은 한 칸 아래(docs/en/)라 assets를 한 칸 위에서
    base = S["base_url"].rstrip("/")
    here = f"{base}/en/" if en else f"{base}/"
    book = S["book"]
    SPLIT.clear()  # tt()가 쓰는 시집 제목 두 토막 — 한 · 영 모두(영어판 라벨에도 한국어 원제가 나옴)
    for bk in (site["book"], site.get("en", {}).get("book", {})):
        d = bk.get("display", {})
        if d.get("big") and d.get("small"):
            a, z = " ".join(d["big"]), " ".join(d["small"])
            SPLIT[e(f"{a} {z}")] = (e(a), e(z))
    ch = site.get("channel", {})
    NAMES[:] = [e(n) for n in (ch.get("name"), ch.get("en", {}).get("name")) if n]
    title = S.get("tab_title") or f'{S["name"]} — {S["tagline"]}'  # 영어 탭 제목만 짧게(10/27 밤 '이대로 넣어' — en.tab_title, 소개 칸 한 줄은 tagline 그대로)
    # 링크 미리보기(og): 출간일 책 카드 기간에는 책 그림 · 책 제목(10/27 B — book_card), 그 밖엔 이름 카드 · 이름 제목. 탭 제목(<title>)은 늘 이름
    card = book_card(site)
    gc = goatcounter(site)  # 방문 셈(10/27) — GoatCounter가 알려 준 꼴 그대로(쪽 맨 끝, async)[출처 goatcounter.com/help/start]
    # 교보 링크 누름(10/27 동원 수락 — 관리 화면 숫자판 M2 '책장에 꽂기', 정의서 v2 W2): 네 자리 × 한 · 영에 이름을 붙여 셈 — 방문 셈을 켰을 때만.
    # 이름 '책장에 꽂기-첫화면 · -소장처 · -책카드 · -찾기', 영어판은 끝에 -en(관리 화면이 이 이름으로 읽음). 값을 붙이면 count.js가 누름을 셈[출처 goatcounter.com/help/events]
    gcc = lambda where: f' data-goatcounter-click="{e("책장에 꽂기-" + where + ("-en" if en else ""))}"' if gc else ""  # noqa: E731
    dtxt = lambda s: (lambda d: f"{MONTHS[d.month - 1]}{NB}{d.day}, {d.year}")(date.fromisoformat(s)) if en else s.replace("-", ".")  # noqa: E731  소식 · 방명록 날짜 — 한국어 2026.11.01 · 영어 November 1, 2026(같은 쪽 다른 영어 날짜와 같은 꼴, 10/27 점검)
    gc_tag = f'<script data-goatcounter="https://{gc}.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>\n' if gc else ""
    og_img =("og-book-en.jpg" if en else "og-book.jpg") if card else ("og-en.jpg" if en else "og.jpg")
    og_title = L["og_book_title"].format(title=book["title"], name=S["name"]) if card else title
    og_desc = L["og_book_desc"] if card else S["description"]  # 책 카드 기간 설명은 그림 · 제목에 없는 사실만(10/27 밤 '이대로 넣어' — 카톡에서 책 제목이 세 번 겹쳤음)
    links = [l for l in S["links"] if l["url"]]
    # 구조화 데이터(10/27 점검 남은 것 가5): 사람 + 사이트 이름(검색 결과 윗줄) + 책. 값 · ISBN은 넣지 않음(10/24 동원 "값과 ISBN은 지금은 넣지 말자")
    me, kb = f"{base}/#me", site["book"]
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Person", "@id": me, "name": S["name"], "alternateName": site["name"] if en else site["en"]["name"],
         "url": here, "description": S["tagline"], "sameAs": [l["url"] for l in links]},
        {"@type": "WebSite", "name": S["name"], "url": base + "/", "inLanguage": lang, "publisher": {"@id": me}},
        {"@type": "Book", "name": kb["title"], "alternateName": site["en"]["book"]["title"], "author": {"@id": me}, "inLanguage": "ko",
         "datePublished": kb["published"], "numberOfPages": int(re.search(r"(\d+)쪽", kb["spec"]).group(1)),
         "publisher": {"@type": "Organization", "name": kb["spec"].split(" · ")[-1]}, "url": kb["buy_url"], "image": f"{base}/assets/img/cover.jpg"}]}
    poem_t = e(S["poem"]["title"])
    title_br = "<br>".join(e(x) for x in book["title_lines"])
    book_title = f"<i>{title_br}</i>" if en else f"『{title_br}』"  # 영어판 책 제목은 기울임, 아래에 한국어 원제(표지 · 교보는 한국어)
    # 첫 화면(10/25 A 시집을 전시하다 — 무채색): 동원이 보낸 웹 전시 그림의 원리만(물건 하나 · 아주 큰 제목 · 박물관 라벨), 색은 흰 바탕 · 먹 그대로.
    # 이름 · '첫 시집 · 웹 전시' → 아주 큰 제목 → 떠 있는 3D 책(옆으로 밀어 돌림) → 라벨: 작품 · 지은이(한 문장) · 사양 · 소장처 '당신의 책장 — 책장에 꽂기 ↗'.
    # 화살표 규칙: 밖으로 나가는 링크는 ↗, 사이트 안에서 내려가는 링크는 ↓
    disp = book["display"]
    ht, hs = ("<br>".join(e(x) for x in disp[k]) for k in ("big", "small"))
    work = (f'Poetry collection, {tt(e(book["title"]), False)} <small lang="ko">{tt(e(site["book"]["title"]), True)}</small>' if en
            else f'시집 {tt(e(book["title"]), True)}')
    # 글자 팔레트(10/28 동원 'B 첫 화면 바로 아래' — 10/26 동원 제안 '색의 팔레트가 아닌 글자의 팔레트'): 시집 본문에 쓴 글자를 많이 쓴 글자부터 한 번씩(content/palette.json).
    # 먹색은 쓴 횟수의 로그를 열 단으로(g0 한 번 → g9 가장 많이) — 같은 단은 한 span이라 칸 612개를 요소로 만들지 않음. 사진은 10/28 동원 "일단 팔레트 아래에 내 사진은 빼자"로 뺌(글자 견본만)
    pl = load("palette.json")
    pg, pn = pl["glyphs"], pl["counts"]
    ptotal = f'{pl["total"]:,}'
    pal = "".join(f'<span class="g{k}">{"".join(g for g, _ in grp)}</span>'
                  for k, grp in itertools.groupby(zip(pg, (round(9 * math.log(n) / math.log(pn[0])) for n in pn)), key=lambda x: x[1]))
    ptop = (", ".join(f"{g} ({n})" for g, n in zip(pg[:3], pn[:3])) if en else " · ".join(f"{g} {n}번" for g, n in zip(pg[:3], pn[:3])))
    palette = (f'<section id="palette" aria-labelledby="palette-t">\n    <p class="label">{t("label_palette")}</p>\n'
               f'    <div class="l"><h2 class="h2" id="palette-t">{t("pal_title", n=len(pg))}</h2><p class="lead">{t("pal_lead", total=ptotal, n=len(pg))}</p></div>\n'
               f'    <div class="r"><p class="pal" aria-hidden="true">{pal}</p><p class="pk">{t("pal_key", top=ptop, ones=pn.count(1))}</p></div>\n  </section>\n  ')  # 사진은 뺌(10/28 동원 "일단 팔레트 아래에 내 사진은 빼자")
    # 칸 끝 길 '「탁본」 읽기 ↓'(10/28 A)는 10/29 '시집 칸 통째로 앞으로'(시가 팔레트 위로 감)와 함께 뺌 — 팔레트는 차례 뒤 '이 시집의 재료'
    exl = (f'<dl><div><dt>{t("ex_object")}</dt><dd>{work}</dd></div>'
           f'<div><dt>{t("ex_author")}</dt><dd>{e(S["name"])}</dd></div>'  # 지은이는 이름만(10/25 동원)
           f'<div><dt>{t("ex_spec")}</dt><dd>{keep(book["spec"])}</dd></div>\x00MONTH\x00'  # 이달의 한 줄(10/28 동원 'A 라벨에 한 줄') — 차례를 그린 뒤 채움
           f'<div><dt>{t("ex_medium")}</dt><dd>{keep(L["ex_medium_v"].format(n=len(pg), total=ptotal))} — <a class="go" href="#palette">{t("pal_go")} ↓</a></dd></div>'  # 재료(10/28 — 미술관 라벨의 재료 칸, 팔레트로 가는 길)
           f'<div><dt>{t("ex_collection")}</dt><dd>{t("ex_shelf")} — <a class="buy" href="{e(book["buy_url"])}" target="_blank" rel="noopener"{gcc("소장처")}>{e(book["buy_label"])} ↗</a><span class="whr">{t("buy_where")}</span></dd></div></dl>')

    # 연표(years.json) — 줄의 note 칸이 각주(10/25 40곳 2차 ④ A, Andrew Trousdale식 경의의 각주): 줄 끝 위첨자 번호 + 연표 바로 아래 각주 목록
    notes, lis = [], []
    for r in row_lang(tb["years"]["items"], lang):
        if not r["text"]:
            continue
        if r["note"]:
            notes.append(r["note"])
        lis.append(f'<li id="y{len(lis) + 1}"><b>{e(r["year"])}</b><span>{names(e(r["text"]))}' + (f'<sup class="fr">{len(notes)}</sup>' if r["note"] else '') + '</span></li>')
        ix["me"].append((tg["me"], f'{r["year"]} {plain(r["text"])}', L["search_timeline"], f"#y{len(lis)}"))
    years = "".join(lis)
    fnb = ('<ol class="fn">' + "".join(f'<li><b>{i}</b><span>{note_html(x, en)}</span></li>' for i, x in enumerate(notes, 1)) + '</ol>') if notes else ""
    # 소개 칸의 지금(10/25 ⑥ A — William Jansson 'Now'식): 연표 아래 읽는 책 · 편집 중인 편 · 쓰는 시 + 고친 날(손으로 적는 날). 빈 줄은 안 보임
    nw = {**tb["now"], "items": row_lang(tb["now"]["items"], lang)}  # 말 규칙은 줄마다(고친 날 · 세 줄을 담은 겉은 그대로)
    now_rows = "".join(f'<div><dt>{e(x["label"])}</dt><dd>{rich(x["text"]) if en else note_html(x["text"], False)}</dd></div>' for x in nw.get("items", []) if x.get("text"))  # 한국어도 〈 〉 안 띄어쓰기를 붙임(10/27 가2 — 320에서 '〈릴리 슈슈의 모든 / 것〉')
    nd = date.fromisoformat(nw["updated"]) if nw.get("updated") else None
    nday = (f"{MONTHS[nd.month - 1]}{NB}{nd.day}, {nd.year}" if en else f"{nd.year}년{NB}{nd.month}월{NB}{nd.day}일") if nd else ""
    # '지금' 꼬리표 옆 절기 한 낱말(10/25 40곳 2차 ⑤ A) — 고친 날이 든 절기, 줄이 갈리지 않게 붙임
    sn = season_of(nd) if nd else None
    nlab = t("now_label") + (f'<i>{t("now_season", name=e(sn[1] if en else sn[0])).replace(" ", NB)}</i>' if sn else "")
    nowb = (f'<div class="now"><p class="nk"><span class="nl">{nlab}</span><span>{t("now_updated", date=nday)}</span></p><dl>{now_rows}</dl></div>' if now_rows else "")

    # 「탁본」: 연은 문단, 행은 한 줄씩 — 화면이 좁아 행이 넘어가면 넘어간 부분만 한 글자 들여씀(style.css).
    # 영어판(10/24 ③)은 행마다 원문(.ln)과 번역(.le)을 한 쌍으로 — 휴대폰은 위아래, 컴퓨터는 두 단(style.css)
    ko_st = stanzas_of(poem)
    ko_html = "".join("<p>" + "".join(f'<span class="ln">{e(x)}</span>' for x in st) + "</p>" for st in ko_st)  # 탁본 한 장에도 씀(id 없이)
    # 시 칸의 행마다 id(l1, l2 …) — 찾기 결과가 그 행으로 감
    tr = stanzas_of((CONTENT / S["poem"]["file"]).read_text(encoding="utf-8")) if en else ko_st
    if [len(x) for x in tr] != [len(x) for x in ko_st]:
        raise SystemExit(f"번역의 연 · 행 수가 원문과 다름: 원문 {[len(x) for x in ko_st]} · 번역 {[len(x) for x in tr]}")
    stz, ln_no = [], 0
    for st, tl in zip(ko_st, tr):
        spans = []
        for a, b in zip(st, tl):
            ln_no += 1
            if en:
                spans.append(f'<span class="pair" id="l{ln_no}"><span class="ln" lang="ko">{e(a)}</span><span class="le">{e(b)}</span></span>')
                ix["poem"] += [(tg["poem"], b, S["poem"]["pages"], f"#l{ln_no}"), (tg["poem"], a, S["poem"]["pages"], f"#l{ln_no}")]  # 어디 칸에 쪽수(10/27 출처 한 줄 — 레퍼런스 제안 ⑥)
            else:
                spans.append(f'<span class="ln" id="l{ln_no}">{e(a)}</span>')
                ix["poem"].append((tg["poem"], a, S["poem"]["pages"], f"#l{ln_no}"))
        stz.append("<p>" + "".join(spans) + "</p>")
    poem_html = "".join(stz)

    # 첫 방문의 문 — 시집 제목 첫 줄이 두 문짝에 걸쳐 적힘(움직임은 main.js)
    door_t = e(book.get("door", book["title_lines"][0]))
    door = (f'<div class="door" aria-hidden="true"><div class="p l"><div class="t">{door_t}</div></div>'
            f'<div class="p r"><div class="t">{door_t}</div></div><i class="gap"></i></div>')
    # 탁본 한 장 — 「탁본」을 길게 누르면 열리는 검은 먹 종이(움직임·간직하기는 main.js). 자바스크립트가 없으면 숨은 채로.
    # 영어판도 시는 한국어 원문 그대로(10/24 ③)
    ko_attr = ' lang="ko"' if en else ""
    sheet_title = tt(e(book["title"]), not en)  # 출처의 시집 제목도 표지 줄 나눔 자리에서만 나뉘게(10/25 다듬기 가9 — '있다』'만 넘어가던 것)
    # 끝 화면(10/27 동원 "A 같은 먹 종이" · "① 나머지 쉰아홉 편" — 레퍼런스 제안 ①): 다 찍히면 판권면과 같은 인사 · 종이책으로 가는 다리 한 문장,
    # '간직하기'를 마치면 그 자리가 교보 단추로(main.js) — 나가는 길은 사기 · 닫기 둘. 화면 읽기는 종이의 설명(aria-describedby)으로 두 줄을 읽음
    sheet = (f'<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-t" aria-describedby="sheet-e" hidden>'
             f'<p class="st" id="sheet-t"{ko_attr}>「{e(site["poem"]["title"])}」</p><div class="sp"{ko_attr}>{ko_html}</div>'
             f'<div class="sf"><div class="se" id="sheet-e"><p class="g">{t("colo_end")}</p><p>{t("sheet_bridge")}</p></div>'
             f'<span class="sbk">{t("sheet_book", name=e(S["name"]), pages=e(S["poem"]["pages"]))}<br>{sheet_title}</span>'
             f'<span class="btns"><button type="button" class="keep">{t("keep")}</button>'
             f'<a class="kb" href="{e(book["buy_url"])}" target="_blank" rel="noopener" hidden{gcc("탁본")}>{e(book["store_label"])} ↗</a>'
             f'<button type="button" class="close">{t("close")}</button></span></div></div>')
    # 기록 — 본 영화·전시를 칸으로(그림은 main.js가 캔버스 하나에 그림, 숫자는 글자로 남김)
    # 숫자는 기록 칸과 같은 네모 점으로 찍고(dot-n), 글자 숫자(.n)는 화면 읽기 프로그램용으로 남김 — 자바스크립트가 없으면 글자 숫자가 보임
    rec = "".join(f'<canvas class="dot-n" data-to="{r["n"]}" aria-hidden="true"></canvas>'
                  f'<p class="rl"><b class="n">{r["n"]:,}</b><span>{keep(L["rec"].format(unit=r["unit"], note=r["note"]))}</span></p>'
                  f'<canvas class="grid" data-n="{r["n"]}" aria-hidden="true"></canvas>' for r in S["records"])

    # 사진 칸
    shots, caps = [], []
    for i, p in enumerate(PH["items"]):
        # 전시 작품 사진("art")은 자르지 않음(10/24 ⑫ A 흰 벽 — style.css의 .art) · 캡션은 작품 틀
        # 대체 글은 사진 설명(photo_art.json의 alt · en.alt — 10/27 동원 "이대로 넣어", 정의 `기준/사진 설명 칸 정의_v1.md`)이 먼저, 없으면 작가 · 작품 · 해 / 인스타 글 첫 줄
        a = p["art"] if is_art(p) else None
        alt = p.get("alt") or (", ".join(x for x in (a.get("artist"), (a["title"] if en else f'〈{a["title"]}〉') if a.get("title") else "", a.get("year")) if x)
                               if a else (p["where"] or L["photo_alt"]))
        art = ' class="art"' if a else ""
        w, h = out_size(psrc(p), 1080)
        # 띠의 둘째 장부터는 data-src — main.js가 보는 장 + 다음 한 장만 받음(10/27 점검: 가까이 오면 큰 사진 3–5장을 한꺼번에 받아 첫 장이 늦었음)
        sa, lz = ("src", ' loading="lazy"') if i == 0 else ("data-src", "")
        ko_alt = ' lang="ko"' if en and re.search("[가-힣]", alt) else ""  # 영어판에서 한국어 대체 글(인스타 글 첫 줄)은 한국어로 읽히게(10/27 점검 a11y 9)
        img = f'<img {sa}="{P}assets/img/photos/{e(Path(p["file"]).stem)}.jpg" alt="{e(alt)}"{ko_alt}{lz} width="{w}" height="{h}">'
        if p.get("kids"):  # 여러 장짜리 게시물(10/25 ⑤ A): 누르면 그 게시물 안 사진을 넘겨 보는 창 · 오른쪽 위 'N장'
            k = 1 + len(p["kids"])
            name = t("pop_post", i=i + 1, n=len(PH["items"])) if ko_alt else e(alt)  # 단추 이름은 한 언어로 — 영어판은 'Post 2 of 8 — …', 한국어 글은 보이는 캡션(lang=ko)이 맡음
            img = (f'<button type="button" class="pop" data-i="{i}" aria-haspopup="dialog" aria-label="{name} — {t("pop", n=k)}">{img}'
                   f'<span class="many" aria-hidden="true">{t("many", n=k)}</span></button>')
        shots.append(f'<figure{art}>{img}</figure>')
        words = " · ".join(x for x in (p["where"], p["when"]) if x)
        # 작품 캡션 두 결 두 줄(10/25 ⑦ A — Mennour식): '작가, 〈작품〉, 해'는 먹 한 줄로 세우고, 전시 · 미술관은 작은 줄로(작가 이름이 가장 옅은 글자가 되지 않게)
        head, tail = art_parts(a, lang) if a else ("", "")
        aw = f'<span class="aw">{head}</span>' if head else ""
        small = (NB + "· ").join(x for x in (tail, keep(p["credit"]) if p["credit"] else "") if x)
        wtxt = keep(words)
        if p.get("link"):  # 인스타에서 받아 온 사진(10/24 사진 칸 A): 글 첫 줄 아래 작은 줄에 날짜 · 게시물 ↗
            post = f'<a href="{e(p["link"])}" target="_blank" rel="noopener">{t("ig_post")} ↗</a>'
            small = (NB + "· ").join(x for x in (small, keep(p["date"]), post) if x)
            if en and re.search("[가-힣]", words):  # 영어판에도 인스타 글은 쓴 말 그대로
                wtxt = f'<span lang="ko">{wtxt}</span>'
        cap_art = rich(L["cap_art"]) if en else keep(L["cap_art"])
        line = (f'<p>{wtxt}{aw}' + (f'<small>{small}</small>' if small else "") + "</p>"
                if words or small or aw else f'<p class="ph">{keep(L["cap_where"])}<small>{cap_art}</small></p>')
        caps.append(f'<div class="cap"{"" if i == 0 else " hidden"}>{line}</div>')
    for i, p in enumerate(PH["items"]):  # 찾기: 캡션 첫 줄 · 작가 · 작품 → 그 사진으로(#p번호 — main.js가 띠를 넘김)
        a = p["art"] if is_art(p) else {}
        txt = " · ".join(x for x in (p["where"], a.get("artist", ""), a.get("title", "")) if x)
        if txt:
            ix["photo"].append((tg["photo"], txt, p.get("date") or "", f"#p{i}"))
    n = len(PH["items"])
    iu = link_url(site, PH["account"].get("link", "instagram"))
    acc = {**PH["account"], "url": iu, "handle": iu.rstrip("/").rsplit("/", 1)[-1]}  # 계정 이름은 links 인스타 주소 끝(설계서 ③)
    # 게시물 열어 보기(10/25 ⑤ A) — 게시물마다 띠의 사진 + 게시물 안 사진 주소(창은 main.js가 열 때 채움). 한 장짜리 게시물은 빈 목록
    posts = [[f'{P}assets/img/photos/{Path(p["file"]).stem}.jpg'] + [f'{P}assets/img/photos/post/{Path(k).name}' for k in p["kids"]] if p.get("kids") else []
             for p in PH["items"]]
    posts_js = json.dumps(posts).replace("</", "<\\/")
    pv = (f'<div class="pv" role="dialog" aria-modal="true" aria-label="{t("pv_label")}" hidden><div class="pvh"><p class="pvc" aria-live="polite"></p>'
          f'<button type="button" class="pvx">{t("close")}</button></div><div class="pvw"><div class="pvs" tabindex="0" aria-label="{t("pv_label")}"></div>'
          f'<button type="button" class="pva pvp" aria-label="{t("pv_prev")}">←</button><button type="button" class="pva pvn" aria-label="{t("pv_next")}">→</button></div>'  # 넘기기 단추 — 마우스로 보는 컴퓨터에서만(10/26 동원 "컴퓨터에서는 확대해도 안 넘어가는 거 같네")
          f'<div class="pvf"></div></div>\n'
          f'<script id="posts" type="application/json">{posts_js}</script>\n') if any(posts) else ""
    # 아래 작은 줄(보는 한 장만 색)과 '모아 보기' 격자(번호) — 가벼운 작은 사진(240px)을 따로 씀
    thumb = lambda p: f'{P}assets/img/photos/thumb/{e(Path(p["file"]).stem)}.jpg'
    tsize = lambda p: 'width="{}" height="{}"'.format(*out_size(psrc(p), 240))
    tart = lambda p: ' class="art"' if is_art(p) else ""
    # 작은 사진은 data-src — 첫 큰 사진이 다 온 뒤 main.js가 받음(10/27 점검)
    thumbs = "".join(f'<button type="button"{tart(p)} aria-label="{t("thumb", i=i + 1)}"><img data-src="{thumb(p)}" alt="" {tsize(p)}></button>'
                     for i, p in enumerate(PH["items"]))
    pgrid = "".join(f'<button type="button"{tart(p)} style="--i:{i}" aria-label="{t("grid", i=i + 1)}"><img data-src="{thumb(p)}" alt="" {tsize(p)}>'
                    f'<span class="no">{i + 1:02d}</span></button>' for i, p in enumerate(PH["items"]))

    # 영상 칸 — 최신 한 편 크게 + 지난 편은 차례처럼(편 번호 없음)
    ch, items, kinds = {**S["channel"], "url": link_url(site, S["channel"]["link"])}, V["items"], L["kinds"]
    if items:
        v = items[0]
        # 큰 한 편: 자바스크립트가 있으면 누를 때 이 자리에서 재생 + 작은 재생기(main.js) — 없으면 유튜브로 가는 링크 그대로
        latest = (f'<div class="vbox" data-yt="{e(v["youtube_id"])}"><a href="https://www.youtube.com/watch?v={e(v["youtube_id"])}" target="_blank" rel="noopener">'
                  f'<img class="big" src="https://i.ytimg.com/vi/{e(v["youtube_id"])}/hqdefault.jpg" alt="{t("video_alt", title=e(v["title"]))}" loading="lazy"></a></div>'
                  + sentence(v, lang, kinds))
        rest = "".join(f'<li><a href="https://www.youtube.com/watch?v={e(x["youtube_id"])}" target="_blank" rel="noopener">'
                       f'<i>{e(kinds.get(x["kind"], x["kind"]))}</i><b>{marked(x["kind"], x["title"], lang)}</b><em>{e(x["date"].replace("-", "."))}</em></a></li>' for x in items[1:])
        past = f'<ul class="toc">{rest}</ul>' if rest else f'<p class="empty">{t("empty")}</p>'
        go = t("go_watch")
        for x in items:  # 찾기: 갈래 낱말 · 작품 · 만든 이 → 유튜브
            ix["video"].append((tg["video"], " ".join(y for y in (kinds.get(x["kind"], x["kind"]), x["title"], x.get("creator", "")) if y),
                                x["date"].replace("-", "."), f'https://www.youtube.com/watch?v={x["youtube_id"]}'))
    else:
        u = V["upcoming"]
        if u.get("title"):  # 찾기: 다음 편(준비 중) → 영상 칸
            ix["video"].append((tg["video"], " ".join(y for y in (kinds.get(u.get("kind", ""), u.get("kind", "")), u["title"], u.get("creator", "")) if y),
                                L["search_soon"], "#video"))
        if u.get("thumb"):
            # 첫 편 준비 중(10/24 B): 고른 썸네일 시안을 흑백으로 + '준비 중' + 스틸 출처. 올리면 이 자리에 유튜브 썸네일(색)과 재생 단추
            first = e(u["title"]) if en else marked(u["kind"], u["title"])
            latest = (f'<div class="nt"><img src="{P}assets/img/next.jpg" alt="{t("first_alt", title=first)}" width="1280" height="720" loading="lazy">'
                      f'<b><i aria-hidden="true"></i>{t("coming")}</b></div>'
                      + sentence(u, lang, kinds)
                      + (f'<p class="cr">{keep(u["credit"])}</p>' if u.get("credit") else ""))
        else:
            latest = (f'<div class="big soon" role="img" aria-label="{t("first_soon")}"><span>{t("first_soon")}</span></div>'
                      + sentence(u, lang, kinds))
        past = f'<p class="empty">{t("empty")}</p>'
        go = t("go_channel")

    c = S["contact"]
    # 문의 폼은 쓰지 않음(10/27 동원 "문의 폼은 B로 하자 — 문의 폼 없이 인스타그램 · 메일 두 길") — 연락 칸은 인스타그램 단추 · 메일 · 방명록.
    # 아래 폼은 동의가 한 칸뿐인 옛 꼴이라, 다시 켜려면 동의 두 칸(시안 A `기준/브랜드 시안/문의폼시안_v1_A·B.png`) · 처리방침 1 · 2절부터 맞출 것
    if c["formspree_id"]:
        raise SystemExit("문의 폼(contact.formspree_id)은 10/27 B로 쓰지 않기로 함 — 다시 켜려면 동의 두 칸(시안 A)과 처리방침 1 · 2절을 먼저 맞출 것")
    endpoint = ""
    lead = "<br>".join(e(x) for x in c["lead_lines"])
    sns = "".join(f'<a href="{e(l["url"])}" target="_blank" rel="noopener">{e(l["name"])} ↗</a>' for l in links)  # 밖으로 나가는 링크는 ↗(10/25 다듬기 가5)
    # 문의 폼(Formspree)을 붙이기 전에는 폼을 접고 인스타그램으로 — 다 쓰고 보낸 뒤에야 '연결 전'을 알게 되지 않게(10/25 다듬기 가4)
    ask = (f'''<form class="ask" data-endpoint="{e(endpoint)}" method="post">
        <label>{t("form_name")}<input type="text" name="name" autocomplete="name"></label>
        <label>{t("form_email")}<input type="email" name="email" autocomplete="email" required></label>
        <label>{t("form_message")}<textarea name="message" required></textarea></label>
        <input class="hp" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">
        <label class="agree"><input type="checkbox" name="agree" required>{t("agree", privacy=e(c["privacy"]))}</label>
        <button class="send" type="submit">{t("send")}</button>
        <p class="msg" role="status"></p></form>''' if endpoint else
           f'<p class="ask-off"><a class="buy" href="{e(link_url(site, "instagram"))}" target="_blank" rel="noopener">{t("ask_off")} ↗</a></p>')
    # 메일(10/26 동원 "나의 지메일 도 남기면 좋을 거 같아") — 문의 아래 한 줄 '메일 + 주소'(베껴 쓰기 쉽게 주소를 그대로 보임 · 누르면 메일 앱).
    # 주소를 긁어 가는 프로그램 대비로 공개 저장소의 원고 · 쪽 원본 어디에도 주소를 한 덩어리로 두지 않음: site.json은 아이디 · 도메인을 나눠 두고,
    # 쪽에는 뒤집은 두 조각(data-u · data-d)과 '@'를 따로 감싼 글만 → main.js가 화면에서 주소와 mailto를 이어 붙임. 찾을 거리 · 구조화 데이터에도 주소는 넣지 않음
    em = c.get("email") or {}
    mail = (f'<p class="mail"><span>{t("mail")}</span><a class="buy ml" href="#contact" data-u="{e(em["user"][::-1])}" data-d="{e(em["domain"][::-1])}">'
            f'{e(em["user"])}<span>@</span>{e(em["domain"])}</a></p>') if em.get("user") and em.get("domain") else ""
    # 방명록(10/26 동원 "방명록은 A 같은 글자 목록으로 하자" — 설계 `기준/웹사이트 방명록 설계_v2.md`) — 연락 칸 안, 연락 길 아래(#guestbook — 관리 화면 미리 보기 자리).
    # 받은 글은 Formspree → 동원 메일 → 관리 화면 '방명록' 표(content/guestbook.json)에 고른 글만 → 다시 올림. 방문자 글 · 이름은 글자로만(e()) · 줄바꿈만 살림 · 찾기에는 넣지 않음.
    # 방문자 글은 원문 그대로라 row_lang을 쓰지 않음(영어판에서 비지 않게) — 답만 en.reply가 있으면 영어. 폼 아이디(contact.guestbook_formspree_id)가 없으면 폼을 그리지 않고,
    # 실린 글도 없으면 묶음 전체를 그리지 않음. 폼을 이으려면 개인정보 처리방침(content/privacy.json)이 먼저 있어야 함(동의 문구가 그 쪽을 가리킴)
    gb_id = c.get("guestbook_formspree_id", "")
    if gb_id and not (CONTENT / "privacy.json").exists():
        raise SystemExit("방명록 폼(contact.guestbook_formspree_id)을 이으려면 개인정보 처리방침(content/privacy.json)이 먼저 있어야 함 — 동의 문구가 그 쪽을 가리킴")
    gbook = sorted((x for x in (load("guestbook.json").get("items", []) if (CONTENT / "guestbook.json").exists() else []) if x.get("text") and x.get("date")),
                   key=lambda x: x["date"], reverse=True)

    def gb_li(x):
        txt = "<br>".join(e(ln) for ln in x["text"].strip().split("\n"))
        lk = ' lang="ko"' if en and re.search(r"[가-힣]", x["text"]) else ""  # 영어판에서 한국어 글은 한국어로 읽히게
        rp = ((x.get("en") or {}).get("reply") or x.get("reply", "")) if en else x.get("reply", "")
        rep = f'<p class="rp">{e(rp)}<span>— {t("gb_reply_by")}</span></p>' if rp else ""
        return f'<li><p class="tx"{lk}>{txt}</p><p class="by">{e(x.get("name", "")) or t("gb_anon")} · {e(dtxt(x["date"]))}</p>{rep}</li>'
    guest, priv = "", f'<a href="privacy/">{t("gb_privacy")}</a>'  # 처리방침 쪽(한 · 영 모두 제 판 아래 privacy/)
    if gb_id or gbook:
        more = f'<details><summary>{t("gb_more")}</summary><ol>{"".join(gb_li(x) for x in gbook[12:])}</ol></details>' if len(gbook) > 12 else ""
        body = f'<ol>{"".join(gb_li(x) for x in gbook[:12])}</ol>{more}' if gbook else f'<p class="empty">{t("gb_empty")}</p>'
        form = (f'<h3 class="h3b">{t("gb_write")}</h3><p class="when">{t("gb_when")}</p>'
                f'<form class="gbf" data-endpoint="https://formspree.io/f/{e(gb_id)}" method="post">'
                f'<label>{t("gb_name")} <i>{t("gb_name_hint")}</i><input type="text" name="name" maxlength="20" autocomplete="name"></label>'
                f'<label>{t("gb_text")} <i>{t("gb_text_hint")}</i><textarea name="message" maxlength="200" rows="3" required></textarea></label>'
                '<input class="hp" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">'
                f'<label class="ag"><input type="checkbox" name="agree" required><span>{t("gb_ag1")}</span></label>'
                f'<label class="ag"><input type="checkbox" name="agree_abroad" required><span>{t("gb_ag2", privacy=priv)}</span></label>'
                f'<button class="send" type="submit">{t("gb_send")}</button><p class="msg" role="status"></p></form>') if gb_id else ""
        guest = f'\n      <div class="gb" id="guestbook"><h3>{t("gb_title")}</h3><p class="sep">{t("gb_sep")}</p>{body}{form}</div>'
    # 바닥글: 판권면(10/24 A) — 시집 판권면의 틀(제목 → 항목 줄 → ⓒ와 다시 쓰기 안내)만 빌림. 고친 날은 빌드한 날(서울 시간),
    # 판은 디자인을 크게 다시 할 때(site.json) · 쇄는 고쳐 올릴 때마다 저절로(printing_no — 올린 기록으로 셈, 10/25)
    co, today = S["colophon"], build_day()
    when = (f"{MONTHS[today.month - 1]}{NB}{today.day}, {today.year}" if en else f"{today.year}년{NB}{today.month}월{NB}{today.day}일")
    pr = printing_no(co)
    ed = (f'{ordinal(co["edition"])} edition, {ordinal(pr)} printing' if en else f'{co["edition"]}판 {pr}쇄')
    # 화면 밝게 · 어둡게 · 시스템(10/26 A 먹 종이) — 판권면 줄, 처음은 밝게 · 누르면 main.js가 이 기기에 기억
    # 글자 대신 그림(10/28 B 선 그림 — 이름은 읽기 프로그램 · 마우스를 올리면 보이는 말로)
    thm = "".join(f'<button type="button" data-th="{k}" aria-pressed="{"true" if k == "light" else "false"}" aria-label="{e(x)}" title="{e(x)}">{THEME_ICONS[k]}</button>'
                    for k, x in zip(("system", "light", "dark"), L["theme_opts"].split("|")))
    pp_link = f' <a class="pp-l" href="privacy/">{t("gb_privacy")}</a>' if (CONTENT / "privacy.json").exists() else ""  # 처리방침 쪽(10/27) — '쿠키를 쓰지 않습니다' 옆
    colo = (f'<div class="colo"><p class="t">{e(urlparse(base).netloc or base)}</p><dl>'
            f'<dt>{t("colo_updated")}</dt><dd><time datetime="{today.isoformat()}">{when}</time>{NB}· {ed}</dd>'
            f'<dt>{t("colo_author")}</dt><dd>{e(S["name"])}</dd>'
            f'<dt>{t("colo_pub")}</dt><dd>{keep(book["spec"].split(" · ")[-1])} — <a class="pp-l" href="{e(book["buy_url"])}" target="_blank" rel="noopener"{gcc("판권면")}>{e(book["buy_label"])} ↗</a></dd>'  # 펴낸 곳(10/28 동원 'A 판권면에 펴낸 곳 줄' — 쪽 끝에서 사는 길이 3.3화면 위였음)
            f'<dt>{t("colo_made")}</dt><dd>{e(co["made"])}</dd>'
            f'<dt class="thm">{t("theme")}</dt><dd class="thm" role="group" aria-label="{t("theme")}">{thm}</dd></dl>'  # 글꼴 줄은 뺌(10/26 동원 "사이트에 내 글꼴 소개하지 않아도 되잖아 지워" — 라이선스 글은 글꼴 옆에 그대로)
            f'<p class="c">{e(S["copyright"])}<br>{e(co["note"])}<br>{t("colo_cookie")}{pp_link}</p>'
            f'<p class="end">{t("colo_end")}</p></div>')  # 사이트의 끝 — 책 '읽어 주신 분들께'의 맺음 인사(10/27 경험 설계 '끝까지 온 사람을 맞이하나?' · 동원 "B1 좋은 아침")

    secs = ("me", "poem", "photo", "video", "contact")
    navname = dict(zip(secs, L["nav"]))  # 낱말은 ui.json nav 그대로(찾기 칸 이름도 이 차례로 씀)
    nav = "".join(f'<a href="#{sid}">{e(navname[sid])}</a>' for sid in ("poem", "me", "photo", "video"))  # 시집이 먼저 — 칸 차례와 같게(10/29 동원 'A 시집 칸 통째로', 10/25 '소개 먼저'를 바꿈) · 연락은 맨 오른쪽 상자로(아래)
    other = "ko" if en else "en"
    # 맨 위 띠 차례: 메뉴 넷 | 언어 · 찾기 · [연락하기](10/28 동원 "연락하기를 맨 오른쪽에 놓고 상자 형태로 … 검색은 그 왼쪽 그리고 한국어 영어 버전은 그 왼쪽" · 'A 먹 채운 상자' · "연락이 아니라 연락하기로 하자") — 구분선은 언어 앞(CSS)
    nav += f'<a class="lang" href="{"../" if en else "en/"}" hreflang="{other}" aria-label="{t("switch_label")}"><span class="fl" aria-hidden="true">{t("switch_flag")}</span><span class="lt">{t("switch")}</span></a>'  # 지금 언어를 보임(10/26 동원 "지금 현재 나라의 언어를 표시하는 게 더 좋을 거 같은데" — 한국어판 🇰🇷 KO · 영어판 🇬🇧 EN, 누르면 다른 판)
    nav += f'<button type="button" class="sq" aria-label="{t("search_label")}" aria-haspopup="dialog">{SEARCH_ICON}</button>'  # 사이트 안 찾기(10/26)
    nav += f'<a class="cta" href="#contact">{t("nav_cta")}</a>'  # 연락하기 — 먹 채운 상자(책 카드 '교보문고에서 사기'와 같은 꼴)
    preload = ("".join(f'<link rel="preload" href="{P}assets/fonts/{f}" as="font" type="font/woff2" crossorigin>\n' for f in
                       ((EN_FIRST, "ndw-sans-light-first.woff2", "ndw-sans-semibold-first.woff2") if en else ("bon-myeongjo-light.woff2", *FIRST))))
    # 첫 화면 작은 판만 미리 받음(한국어 10/27 B · 영어 10/27 점검 — 영어 첫 화면은 본명조를 한 자도 안 그리는데 통째 판을 받아 문이 늦었음). 작은 고딕 판(PTDF)은 ASCII를 늘 담아 영어 첫 화면에도 씀
    # 시 아래 출처 줄은 시집 제목 · 쪽수(10/27 동원 "탁본 - 61쪽 이런식으로 쓰는 게 아니라 문을 열고 나오면 살아 있는 것들로 가득 차 있다 - 61쪽") — 제목은 표지 줄 나눔 자리에서만 갈리고,
    # 쪽수는 제목 끝 토막 안에 붙여 함께 넘어감(토막 밖에 두면 영어 390에서 'Living Things' / ', pages 61–62'로 갈렸음). 영어는 기울임을 제목에만
    head, _, tail = t("pgno", book="\0", pages=e(S["poem"]["pages"]).replace(" ", NB)).partition("\0")
    bt = e(book["title"])
    if en and bt in SPLIT:
        a, z = SPLIT[bt]
        ptitle = f'<span class="tt"><i><span class="tt">{a}</span></i> <span class="tt"><i>{z}</i>{tail}</span></span>'
    else:
        ptitle = tt(bt, not en, tail)
    pgno = head + ptitle + (f'<br>{t("translated")}' if L["translated"] else "")
    note = f'<p class="note">{t("ship_note")}</p>' if L["ship_note"] else ""
    # 만든 사람 한 줄(10/28 동원 '모두 직접 했어' — 일본 디테일 보고서 ⑨, 書肆侃侃房 · 港の人가 장정까지 역할어로 적는 방식) — 책 카드 사양 아래, 이름은 한 덩어리
    credit = f'<small class="bcr">{keep(book["credit"]).replace(e(S["name"]), e(S["name"]).replace(" ", NB))}</small>' if book.get("credit") else ""
    # 시집 소개 · 차례(10/25 A 아래로 이어 쌓기) — 책 카드 다음에 머리 두 줄 → 소개 한 단락 → 차례(「탁본」 줄만 먹)
    # 글은 교보에 올린 최종본 그대로. 영어판은 옮긴 제목 곁에 한국어 원제를 작게(「탁본」 대역과 같은 방식)
    bi, toc, toc_ko = book["intro"], book["toc"], site["book"]["toc"]  # 차례 줄은 {title, page, en: {title}}(10/25 원고 옮기기 — 한 · 영이 한 줄에)
    ko_tag = ' lang="ko"'

    # 차례에서 열기(10/25 ④ C): 달마다 시 한 편 — 그달 줄은 먹으로 바뀌고 아래에 한 행이 열림, 지난달 줄은 먹으로 남음(차례가 자람).
    # book.monthly는 빌드한 달까지만 열림(출간 소식과 같은 날짜 규칙). 영어판은 옮긴 행 아래에 한국어 원문을 작게
    day = build_day()
    titles = {r["title"] for p in toc_ko["parts"] for r in p["items"]} | {r["title"] for r in toc_ko["tail"]}
    mk = tb["monthly"]["items"]
    for m in mk:
        if m["title"] not in titles:
            raise SystemExit(f"이달의 한 줄 제목이 차례에 없음: {m['title']} (content/monthly.json)")
        if not (m.get("en") or {}).get("lines"):  # 이달의 한 줄은 영어 꼭(설계서 ②)
            raise SystemExit(f"이달의 한 줄 영어가 비어 있음: {m['title']} (content/monthly.json)")
    opened = sorted((row_lang(m, lang) for m in mk if m["month"] <= day.strftime("%Y-%m")), key=lambda m: m["month"])
    mo, cur = {m["title"]: m for m in opened}, (opened[-1]["title"] if opened else None)
    month_ko = {m["title"]: row_lang(m, "ko") for m in mk}

    tn = [0]
    month_row = [""]  # 첫 화면 라벨의 '이달의 한 줄' 줄 — 그달 줄이 열렸을 때만(toc_li가 채움)

    def toc_li(row, ko_row, part=None):
        tn[0] += 1  # 차례 줄마다 id(t1, t2 …) — 찾기 결과가 그 줄로 감
        ix["toc"].append((tg["toc"], row["title"] + (f' · {ko_row["title"]}' if en else ""),
                          L["search_toc_where"].format(part=part, page=row["page"]) if part else L["search_page"].format(page=row["page"]), f"#t{tn[0]}"))
        m = mo.get(ko_row["title"])
        cls = "on" if ko_row["title"] == site["poem"]["title"] else ("mo" if m and ko_row["title"] == cur else ("mo past" if m else ""))
        ko = f' <small{ko_tag}>{e(ko_row["title"])}</small>' if en else ""
        tag = line = ""
        if m:
            mm = int(m["month"][5:])
            tag = f'<span class="mt">{MONTHS[mm - 1][:3] if en else str(mm) + "월"}</span>'
            if ko_row["title"] == cur:
                orig = f'<small{ko_tag}>{" / ".join(e(x) for x in month_ko[ko_row["title"]]["lines"])}</small>' if en else ""
                # 다음 날짜(10/27 동원 "A 꼬리표에 붙임" — 레퍼런스 제안 ⑦, 本屋 Title의 '매일 8시'처럼): 예약된 다음 달 줄이 있을 때만 '· 다음은 12월 1일'.
                # 그날 아침 예약 올리기(site-release-MMDD)가 있어야 지키는 약속 — 다음 달 줄을 넣을 때 예약도 함께(README)
                nx = min((x["month"] for x in mk if x["month"] > day.strftime("%Y-%m")), default=None)
                nxt = t("month_next", m=f"{MONTHS[int(nx[5:]) - 1]}{NB}1" if en else f"{int(nx[5:])}월{NB}1일") if nx else ""
                line = f'<em>{"<br>".join(e(x) for x in m["lines"])}{orig}<small>{t("month_line", m=MONTHS[mm - 1] if en else mm)}{nxt}</small></em>'
                # 찾기 — 다시 온 사람이 '이달 · 11월 · 한 줄'로 그달 줄을 찾게(10/28 사용 편의 점검 ④ — 제목 줄만 있어 0건이었음)
                mname = MONTHS[mm - 1] if en else mm
                month_row[0] = (f'<div><dt>{t("ex_month")}</dt><dd>{keep(L["ex_month_v"].format(m=mname, title=row["title"], page=row["page"]))} — '
                                f'<a class="go" href="#t{tn[0]}">{t("ex_month_go")} ↓</a></dd></div>')
                ix["toc"].insert(0, (L["search_month_tag"], plain(" ".join(m["lines"])), L["search_month_where"].format(m=mname, title=row["title"], page=row["page"]),
                                     f"#t{tn[0]}", L["search_month_keys"].format(m=mname.lower() if en else mname)))
        attr = f' id="t{tn[0]}"' + (f' class="{cls}"' if cls else "")
        # 먹 줄(사이트에 올린 시)은 제목이 그 시로 가는 링크 + 화면 읽기용 '— 여기서 읽기'(10/27 점검 a11y 11 — 색으로만 구별되던 것)
        title = f'<a href="#poem">{e(row["title"])}</a>' if cls == "on" else e(row["title"])
        here = f'<span class="sr"> {t("toc_here")}</span>' if cls == "on" else ""
        return f'<li{attr}><span>{title}{ko}{here}{tag}</span><span>{row["page"]}</span>{line}</li>'
    parts = "".join(f'<div><h4>{e(p["name"])}</h4><ol>{"".join(toc_li(r, k, p["name"]) for r, k in zip(p["items"], kp["items"]))}</ol></div>'
                    for p, kp in zip(toc["parts"], toc_ko["parts"]))
    bintro = (f'<div class="bintro"><p class="bhead">{"<br>".join(e(x) for x in bi["lead"])}</p>'
              f'<p class="btext">{keep(bi["text"])}</p>'
              f'<div class="btoc" id="toc"><h3>{e(toc["label"])}</h3><p class="key"><i></i>{t("toc_key")}</p><div class="parts">{parts}</div>'
              f'<ol class="tail">{"".join(toc_li(r, k) for r, k in zip(toc["tail"], toc_ko["tail"]))}</ol></div></div>')
    exl = exl.replace("\x00MONTH\x00", month_row[0])  # 첫 화면 라벨의 '이달의 한 줄' — 차례에서 그달 줄을 찾은 뒤(열린 줄이 없으면 빈 칸)
    # 시집 상태 낱말 · 시집 소식(10/25 A 쌓이는 소식 세 줄) — 빌드한 날 기준: 나온 날 전이면 '출간 예정', 그날부터 '판매 중'.
    # 소식은 책에 일어난 일(판권면 '고친 날'은 사이트에 일어난 일) — 날짜가 지난 것만, 최근 세 줄 + 나머지는 '지난 소식'으로 접음
    state = f'<p class="bstate"><i aria-hidden="true"></i>{t("book_on" if day >= date.fromisoformat(book["published"]) else "book_soon")}</p>'
    news = sorted((x for x in row_lang(tb["news"]["items"], lang) if x["text"] and date.fromisoformat(x["date"]) <= day), key=lambda x: x["date"], reverse=True)

    def news_li(k, x):  # 소식 줄마다 id(n1 = 가장 최근) — 찾기 결과가 그 줄로 감(10/27 점검: 시집 칸 맨 위로 가서 소식이 1.6–2.3화면 아래였음)
        return f'<li id="n{k}"><time datetime="{x["date"]}">{dtxt(x["date"])}</time><span>{keep(x["text"])}</span></li>'
    more = f'<details><summary>{t("news_more")}</summary><ol>{"".join(news_li(k, x) for k, x in enumerate(news[3:], 4))}</ol></details>' if len(news) > 3 else ""
    bnews = f'<div class="bnews"><h3>{t("news")}</h3><ol>{"".join(news_li(k, x) for k, x in enumerate(news[:3], 1))}</ol>{more}</div>' if news else ""
    ui_js = json.dumps(L["js"], ensure_ascii=False).replace("</", "<\\/")

    # 사이트 안 찾기(10/26 검색 A 전체 화면 창) — 맨 위 막대 돋보기 → 흰 한 장 · 추천 주제(content/search.json) · 찾을 거리(#sidx). 찾기는 main.js
    # 칸 이름(10/26 동원 "소개나 시집 이런 대분류들도 검색될 수 있게") — 맨 위 막대의 다섯 칸. 다섯째 값은 그 칸에 든 것의 낱말(약력 · 차례 …) — 칸 이름에 없는 말로도 찾게
    ix["sec"] = [(tg["sec"], x, w, f"#{sid}", k) for sid, x, w, k in zip(secs, L["nav"], L["search_sec_where"].split("|"), L["search_sec_keys"].split("|"))]
    ix["sec"].append((tg["sec"], L["label_palette"], L["pal_where"].format(n=len(pg)), "#palette", L["pal_keys"]))  # 글자 팔레트 칸(10/28) — 맨 위 막대에는 없지만 칸 이름 · 낱말로 찾게
    ix["book"] += [(tg["book"], plain(book["title"]), book["spec"], "#bookcard"), (tg["book"], book["buy_label"], book["store_label"], book["buy_url"], L["search_buy_keys"])]  # 책 제목 결과는 책 카드로(10/27 가4 — 휴대폰에서 #poem이면 책 카드가 한 화면 아래)
    ix["me"][:0] = [(tg["me"], S["name"], "", "#me"), (tg["me"], S["tagline"], "", "#me")] + [
        (tg["me"], x, "", "#me") for x in re.split(r"(?<=[.!?다])\s+", plain(S["bio"])) if x]
    ix["me"] += [(tg["me"], f'{x["label"]} · {plain(x["text"])}', "", "#me") for x in nw.get("items", []) if x.get("text")]  # 이름표와 글 사이는 가운뎃점(10/28 점검 10 — 글 안의 줄표와 겹쳤음)
    ix["news"] += [(tg["news"], plain(x["text"]), dtxt(x["date"]), f"#n{k}", L["search_news_keys"]) for k, x in enumerate(news, 1)]  # 소식 줄도 '소식 · 새로'로(10/28 사용 편의 점검 ④)
    ix["contact"] += [(tg["contact"], L["label_contact"] if endpoint else L["ask_off"], "", "#contact")] + [(tg["contact"], l["name"], "", l["url"]) for l in links]
    sidx_js = json.dumps([list(x) for k in ix for x in ix[k]], ensure_ascii=False).replace("</", "<\\/")
    sj = load("search.json") if (CONTENT / "search.json").exists() else {"suggest": []}

    def sug_li(x, k):  # 추천 주제 한 줄 — go: 쪽 안 자리 · 'buy'(교보) / q: 그 말로 찾기 · 줄마다 모든 칸, 안 쓰는 쪽은 ""(설계서 7절) · 방향키로 고르는 줄(option, id sg{k})
        if en:  # 영어판은 en 칸으로 — en.label이 비었거나 찾을 말 줄인데 en.q가 비면 그 줄을 뺌(관리 화면 '영어 빔 — 영어판에서 숨겨짐'과 같은 규칙, 10/26)
            o = x.get("en") or {}
            if not o.get("label") or (x.get("q") and not o.get("q")):
                return ""
            x = {**x, **o}
        if not x.get("label"):  # 이름이 빈 줄도 뺌(관리 화면이 막지만 원고를 손으로 고칠 때 대비)
            return ""
        note = f'<i>{e(x.get("note", ""))}</i>'
        hang = ' class="hang"' if x["label"][:1] in "「『" else ""  # 여는 부호로 시작하면 내어 걸기(본명조 앞 빈 0.6em 안팎)
        opt = f' role="option" id="sg{k}" aria-selected="false"'
        if x.get("q"):
            return f'<li role="none"><button type="button"{opt}{hang} data-q="{e(x["q"])}">{e(x["label"])}{note}</button></li>'
        href = book["buy_url"] if x.get("go") == "buy" else (x.get("go") or "#home")
        ext = href.startswith("http")
        return (f'<li role="none"><a{opt}{hang} href="{e(href)}"' + (' target="_blank" rel="noopener"' if ext else "") + (gcc("찾기") if x.get("go") == "buy" else "")
                + f'>{e(x["label"])}{" ↗" if ext else ""}{note}</a></li>')
    # 입력 칸은 combobox — 추천 · 결과 목록(listbox) 가운데 보이는 쪽을 aria-controls로, 방향키로 고른 줄은 aria-activedescendant로(main.js)
    srch = (f'<div class="srch" role="dialog" aria-modal="true" aria-label="{t("search_label")}" hidden><div class="in">'
            f'<div class="bar">{SEARCH_ICON}<input type="search" name="q" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="sr-sug" placeholder="{t("search_ph")}" aria-label="{t("search_label")}" autocomplete="off" enterkeyhint="search">'
            f'<button type="button" class="x">{t("close")}</button></div>'
            f'<p class="sr-lab" id="sr-lab">{t("search_suggest")}</p><ul class="sug" id="sr-sug" role="listbox" aria-labelledby="sr-lab">{"".join(sug_li(x, k) for k, x in enumerate(sj["suggest"]))}</ul>'
            f'<p class="sr" role="status"></p><p class="sr-n" id="sr-n" hidden></p><ul class="sr-res" id="sr-res" role="listbox" aria-labelledby="sr-n"></ul><p class="sr-none" hidden>{t("search_none")}</p></div></div>\n'
            f'<script id="sidx" type="application/json">{sidx_js}</script>\n')

    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(S["description"])}">{"" if en else verify_tags(site)}
<link rel="canonical" href="{e(here)}">
<link rel="alternate" hreflang="ko" href="{e(base)}/">
<link rel="alternate" hreflang="en" href="{e(base)}/en/">
<link rel="alternate" hreflang="x-default" href="{e(base)}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{e(S["name"])}">
<meta property="og:url" content="{e(here)}">
<meta property="og:title" content="{e(og_title)}">
<meta property="og:description" content="{e(og_desc)}">
<meta property="og:image" content="{e(base)}/assets/{og_img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{e(og_title)}">
<meta property="og:locale" content="{L["og_locale"]}">
<meta property="og:locale:alternate" content="{ui["og_locale"][other]}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="{P}favicon.svg?v={ICON_V}" type="image/svg+xml">
<link rel="icon" href="{P}favicon-32.png?v={ICON_V}" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="{P}apple-touch-icon.png?v={ICON_V}">
{HEAD_JS}
{preload}<link rel="stylesheet" href="{P}assets/style.css">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body>
{door}
<a class="skip" href="#main">{t("skip")}</a>
<header class="top"><a class="logo" href="#home">{e(S.get("logo") or S["name"])}</a>
  <nav aria-label="{t("nav_label")}">{nav}</nav></header>
<main id="main">
  <section id="home" aria-label="{t("home_label")}">
    <div class="l"><h1 class="kick"><span class="name" data-type="{e("|".join(typing_steps(S["name"])))}">{e(S["name"])}</span> <span>{t("ex_kick")}</span></h1>
      <p class="ht">{ht}</p><p class="hs hsl">{hs}</p></div>
    <div class="r book"><div class="side"><p class="hs">{hs}</p><a class="buy sb" href="{e(book["buy_url"])}" target="_blank" rel="noopener"{gcc("첫화면")}>{e(book["buy_label"])} ↗</a><span class="whr">{t("buy_where")}</span><p class="tip">{t("ex_tip")}</p></div>
      <div class="bk" tabindex="0" role="button" aria-label="{t("turn_label", book=e(book["title"]))}"><div class="b"><img class="cover" src="{P}assets/img/cover.jpg" alt="{t("cover_alt", book=e(book["title"]) if en else e(book["title"]))}" width="600" height="881" fetchpriority="high" draggable="false"><i class="bc"></i><i class="sp"></i><i class="pg"></i><i class="tp"></i><i class="bt"></i></div><i class="sh"></i><i class="win"></i></div>
      </div>
    <div class="lab"><p class="rd"><a class="buy" href="#poem">{t("read", poem=poem_t)}</a></p>{exl}</div>
  </section>
  <section id="poem" aria-labelledby="poem-t">
    <p class="label">{t("label_poem")}</p>
    <div class="r"><h2 class="h2" id="poem-t">{poem_t if en else f"「{poem_t}」"}</h2><button type="button" class="hint" aria-haspopup="dialog">{t("hint")}</button><div class="poem">{poem_html}</div>
      <p class="pgno">{pgno}</p><p class="pbr">{t("sheet_bridge")}</p></div>
    <div class="l pbook" id="bookcard"><div class="bk on" tabindex="0" role="button" aria-label="{t("turn_label", book=e(book["title"]))}"><div class="b"><img class="cover" src="{P}assets/img/cover.jpg" alt="" width="600" height="881" loading="lazy" draggable="false"><i class="bc"></i><i class="sp"></i><i class="pg"></i><i class="tp"></i><i class="bt"></i></div><i class="sh"></i></div>
      {state}<p class="t">{book_title}<small>{keep(book["spec"])}</small>{credit}</p><a class="buy2" href="{e(book["buy_url"])}" target="_blank" rel="noopener"{gcc("책카드")}>{e(book["store_label"])} ↗</a>{note}</div>
    {bnews}{bintro}
  </section>
  {palette}<section id="me" aria-labelledby="me-t">
    <p class="label">{t("label_me")}</p>
    <div class="l"><h2 class="h2" id="me-t">{e(S["name"])}</h2><p class="tagl">{keep(S["tagline"])}</p><p class="bio">{rich(S["bio"])}</p></div>
    <div class="r"><ul class="years">{years}</ul>{fnb}{nowb}<div class="rec">{rec}</div></div>
  </section>
  <section id="photo" aria-labelledby="photo-t">
    <p class="label">{t("label_photo")}</p>
    <div class="r top2"><div class="head"><h2 id="photo-t">{e(acc["handle"])}</h2><span>{e(acc["desc"])}</span></div>
      <p class="mode" role="group" aria-label="{t("mode_label")}"><button type="button" data-m="one" aria-pressed="true">{t("mode_one")}</button><button type="button" data-m="all" aria-pressed="false">{t("mode_all")}</button></p></div>
    <div class="l"><div class="strip" tabindex="0" aria-label="{t("strip", n=n)}">{"".join(shots)}</div>
      <div class="thumbs">{thumbs}</div><div class="pgrid" hidden>{pgrid}</div></div>
    <div class="r info"><div class="caps"><span class="count" aria-live="polite">1 / {n}</span>{"".join(caps)}</div>
      <p class="nav2"><button type="button" data-go="-1">{t("prev")}</button><button type="button" data-go="1">{t("next")}</button></p>
      <a class="buy" href="{e(acc["url"])}" target="_blank" rel="noopener">{t("more_ig")} ↗</a></div>
  </section>
  <section id="video" aria-labelledby="video-t">
    <p class="label">{t("label_video")}</p>
    <div class="l"><div class="ch2"><h2 id="video-t"{ko_attr if re.search("[가-힣]", ch["name"]) else ""}>{e(ch["name"])}</h2><span>{e(ch["desc"])}</span></div>{latest}
      <a class="buy" href="{e(ch["url"])}" target="_blank" rel="noopener">{go} ↗</a></div>
    <div class="r"><p class="sub">{t("past")}</p>{past}</div>
  </section>
  <section id="contact" aria-labelledby="contact-t">
    <p class="label">{t("label_contact")}</p>
    <div class="l"><h2 class="h2" id="contact-t">{t("contact_title")}</h2><p class="lead">{lead}</p></div>
    <div class="r">{ask}{mail}{guest}
      <p class="sns">{sns}</p>
      {colo}</div>
  </section>
</main>
{sheet}
{pv}{srch}<script id="ui" type="application/json">{ui_js}</script>
<script src="{P}assets/main.js" defer onerror="document.documentElement.classList.remove('js','intro')"></script>
{gc_tag}</body>
</html>
"""


def page_privacy(site, lang):
    # 개인정보 처리방침 한 쪽(10/27 — 방명록 · 문의 폼을 켜기 전에, 초안 `기준/개인정보 처리방침 초안_v1.md`). content/privacy.json이 없으면 만들지 않음.
    # 한국어 docs/privacy/ · 영어 docs/en/privacy/ — 검색에는 내지 않음(noindex) · 고른 화면(어두운 모드)은 첫 그림 전에 · 글자는 사이트 글꼴(쓰인 글자 모으기에 함께 넣음)
    if not (CONTENT / "privacy.json").exists():
        return None
    p, en = load("privacy.json"), lang == "en"
    g = lambda d: e(d["en"] if en else d["ko"])  # noqa: E731
    R = "../../" if en else "../"  # 쪽 자리에서 docs/ 맨 위까지
    base = site["base_url"].rstrip("/")
    d = date.fromisoformat(p["updated"])
    when = f"{MONTHS[d.month - 1]} {d.day}, {d.year}" if en else f"{d.year}년 {d.month}월 {d.day}일"
    # when이 붙은 줄은 그것을 켰을 때만(방문 셈 when "goatcounter" · 방명록 when "guestbook" — 10/27) · 칸에 보일 줄이 없으면 그 칸의 empty 한 줄 · 방문 셈을 켜면 첫 문단도 lead_counted로
    on = {"goatcounter": bool(goatcounter(site)), "guestbook": bool(site["contact"].get("guestbook_formspree_id"))}
    shown = lambda items: [i for i in items if on.get(i.get("when"), True)]  # noqa: E731
    lead = p["lead_counted"] if on["goatcounter"] and p.get("lead_counted") else p["lead"]
    secs = "".join(f'<h2>{g(x["h"])}</h2><ul>{"".join(f"<li>{g(i)}</li>" for i in (shown(x["items"]) or [x["empty"]] * ("empty" in x)))}</ul>' for x in p["sections"])
    other_lang, other_href = ("ko", "../../privacy/") if en else ("en", "../en/privacy/")
    return f"""<!doctype html>
<html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{g(p["title"])} — {e(site["en"]["name"] if en else site["name"])}</title><meta name="robots" content="noindex">
<link rel="canonical" href="{e(base)}{"/en" if en else ""}/privacy/"><meta name="theme-color" content="#ffffff">
<link rel="icon" href="{R}favicon.svg?v={ICON_V}" type="image/svg+xml"><link rel="stylesheet" href="{R}assets/style.css">
<script>try{{var t=localStorage.getItem("theme");if(t==="dark"||t==="system")document.documentElement.setAttribute("data-theme",t)}}catch(x){{}}</script></head>
<body><main class="pp">
<h1 class="h2">{g(p["title"])}</h1>
<p class="lead">{g(lead)}</p>
{secs}
<p class="up">{g(p["updated_label"])} <time datetime="{d.isoformat()}">{when}</time></p>
<p class="back"><a class="buy" href="../">{g(p["back"])}</a><a class="oth" href="{other_href}" lang="{other_lang}" hreflang="{other_lang}">{g(p["other"])}</a></p>
</main></body></html>
"""


def page_404(site):
    # 없는 쪽 하나(GitHub Pages는 맨 위 404.html 하나만 씀) — 한국어와 영어를 함께
    ui = load("ui.json")
    k, en = (lambda key: e(ui[key]["ko"])), (lambda key: e(ui[key]["en"]))
    return f"""<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{k("nf_title")} — {e(site["name"])}</title><meta name="robots" content="noindex">
<link rel="icon" href="/favicon.svg?v={ICON_V}" type="image/svg+xml"><link rel="stylesheet" href="/assets/style.css"><script>try{{var t=localStorage.getItem("theme");if(t==="dark"||t==="system")document.documentElement.setAttribute("data-theme",t)}}catch(x){{}}</script></head>
<body><main class="nf" style="min-height:100vh;display:grid;place-content:center;gap:18px;padding:28px;text-align:center">
<p class="label" style="justify-content:center">404</p>
<h1 class="h2" style="margin-top:0">{k("nf_title")}</h1>
<p class="lead">{k("nf_lead")}</p>
<p><a class="buy" href="/">{k("nf_back")}</a></p>
<p class="lead" lang="en">{en("nf_title")}. {en("nf_lead")}</p>
<p lang="en"><a class="buy" href="/en/">{en("nf_back")}</a></p></main></body></html>
"""


# 단 검사(10/28 동원 '고치고 검사기 넣어' — 기준/웹사이트 단 검사_2026-10-28.md): style.css가 10/28 단(머리 주석)을 지키는지 빌드마다 훑음.
# 단 밖인데 일부러 둔 값은 (선택자 머리, 속성): 까닭으로 허용 — 새로 일부러 둘 값이 생기면 까닭과 함께 여기에
SCALE_SP = {0, 2, 4, 6, 8, 12, 16, 22, 30, 36, 44, 64, 20, 72, *range(48, 61)}  # 간격 열한 단 + 자리 값(옆 여백 20 · 64 · 두 단 틈 72 · 창 안쪽 48–60)
SCALE_LH = {"1", "1.05", "1.2", "1.3", "1.5", "1.6", "1.7", "1.9", "2"}
SCALE_FS = {11, 12.5, 13, 14, 15}  # 16px 아래 작은 글자 — 고딕 11 · 12.5 · 14 · 명조 13 · 14 · 15
SCALE_ALLOW = {
    (".skip", "left"): "화면 밖에 숨김", (".hp", "left"): "방명록 빈칸 함정 — 화면 밖",
    (".top nav a::before", "inset"): "누르는 자리 44px", (".pbook .bk .sh", "bottom"): "책 그림자 자리",
    (".top nav .lang .fl", "line-height"): "국기 줄 높이 0", (".years sup.fr", "font"): "각주 위첨자 줄 높이 0",
    (".vplay .play", "margin"): "58px 동그라미 가운데", (".touch", "margin"): "58px 동그라미 가운데",
    (".vplay .play::after", "left"): "재생 세모 자리", (".vplay .play::after", "top"): "재생 세모 자리",
    ("#poem>.l", "top"): "띠 아래 제목 자리", ("#me>.l", "top"): "띠 아래 제목 자리",
    ("#contact>.l", "top"): "띠 아래 제목 자리", ("#palette>.l", "top"): "띠 아래 제목 자리",
}


def scale_check():
    css = re.sub(r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), (SRC / "style.css").read_text(encoding="utf-8"), flags=re.S)  # 주석은 같은 길이 공백(줄 번호 그대로)
    bad, ok = [], 0
    for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", css):
        sel, head = " ".join(m.group(1).split()), css[:m.start()]
        k = head.rfind("@media")
        media = head[k:head.find("{", k)] if k >= 0 and head.count("{", k) > head.count("}", k) else ""
        for d in re.finditer(r"([\w-]+)\s*:\s*([^;]+)", m.group(2)):
            prop, val = d.group(1), d.group(2).strip()
            off = []
            if re.fullmatch(r"(margin|padding)(-\w+)*|gap|row-gap|column-gap|inset|top|right|bottom|left", prop) and "calc(" not in val:
                off = [n for n in re.findall(r"-?\d*\.?\d+(?=px)", val) if abs(float(n)) not in SCALE_SP | {1, 1.5}]  # 1 · 1.5px는 선 굵기 맞춤
            elif prop in ("font", "font-size"):
                off = [n for n in re.findall(r"(?<![\w.])(\d*\.?\d+)px", val) if float(n) < 16 and float(n) not in SCALE_FS]
                lh = re.search(r"/\s*(\d*\.?\d+)(?![\w%])", val) if prop == "font" else None
                off += [lh.group(1)] if lh and lh.group(1) not in SCALE_LH else []
            elif prop == "line-height" and re.fullmatch(r"\d*\.?\d+", val) and val not in SCALE_LH:
                off = [val]
            if not off:
                continue
            narrow = ".top nav" in sel and "max-width" in media and prop in ("gap", "padding-left")  # 좁은 폭 메뉴 맞춤값(단 머리 주석)
            if narrow or any(sel.startswith(a) and prop == b for a, b in SCALE_ALLOW):
                ok += 1
            else:
                bad.append(f"L{css[:m.start(2) + d.start()].count(chr(10)) + 1} {sel[:40]} {prop} {' '.join(off)}")
    # 어긋나면 '알림'으로 시작 — 관리 화면이 빌드 끝 60줄의 '알림' 줄을 빌드 뒤 알림으로 보여 줌(10/28 관리 화면 세션). 빌드는 멈추지 않음
    print(("알림 — " if bad else "") + f"단 검사: 단 밖 {len(bad)}곳 (허용 {ok}곳)" + (" — " + " · ".join(bad[:6]) if bad else ""))


def main():
    site, videos, photos = load("site.json"), load("videos.json"), load("photos.json")
    # 사진 칸(10/24 A): 인스타그램 최근 게시물을 받아 옴 — 토큰이 없거나 실패하면 지난번 받아 둔 것, 그것도 없으면 photos.json의 사진
    ig = photos.get("instagram", {})
    feed = instagram.fetch(ig)
    if feed:
        art = {r["post"]: r for r in load("photo_art.json").get("items", [])}  # 작품 정보(10/25 원고 옮기기 — 게시물 주소 끝 글자로)
        for r in art.values():  # 사진 설명 길이(정의 v1 — 한국어 60자 · 영어 120자 안) — 넘으면 알림만
            for lg, s, lim in (("한국어", r.get("alt") or "", 60), ("영어", (r.get("en") or {}).get("alt") or "", 120)):
                if len(s) > lim:
                    print(f"알림: photo_art.json 게시물 {r['post']}의 사진 설명({lg})이 {len(s)}자 — {lim}자 안을 권함")
        codes = {f["permalink"].rstrip("/").rsplit("/", 1)[-1] for f in feed}
        for c in sorted(set(art) - codes):
            print(f"알림: photo_art.json의 게시물 {c}이 받아 온 {len(feed)}장 밖 — 덧씌울 사진이 없음")
        photos = {**photos, "items": ig_items(feed, art)}
    poem = (CONTENT / site["poem"]["file"]).read_text(encoding="utf-8")
    base = site["base_url"].rstrip("/")

    # docs/를 새로 만든다(옛 결과는 지운다 — docs는 빌드 결과라 원본이 아님). 줄인 글꼴·미리보기 그림은 원본을 못 찾을 때를 위해 먼저 옮겨 둔다
    keep = {}
    for f in [*(ASSETS / "fonts").glob("*.woff2"), ASSETS / "og.jpg", ASSETS / "og-en.jpg", ASSETS / "og-book.jpg", ASSETS / "og-book-en.jpg", ASSETS / "img" / "takbon.jpg"]:
        if f.exists():
            keep[f.name] = f.read_bytes()
    if DOCS.exists():
        shutil.rmtree(DOCS)
    (ASSETS / "img/photos").mkdir(parents=True)
    (ASSETS / "fonts").mkdir(parents=True)

    # 쪽을 먼저 만들어 쓰인 글자를 모은 뒤, 그 글자만 남겨 글꼴을 줄임
    index_html, en_html, page404 = render(site, poem, videos, photos), render(site, poem, videos, photos, "en"), page_404(site)
    priv = {lg: page_privacy(site, lg) for lg in ("ko", "en")}  # 처리방침 쪽(없으면 None)
    no_pal = lambda h: re.sub(r'<p class="pal"[^>]*>.*?</p>', "", h, flags=re.S)  # noqa: E731 — 글자 팔레트 칸의 글자는 본명조 보통 판에만(PAL_FONT)
    text = used_text([no_pal(index_html), no_pal(en_html), page404, *(x for x in priv.values() if x)])
    pal_text = load("palette.json")["glyphs"]
    srcs = {}
    title_text = unicodedata.normalize("NFC", "".join(site["book"]["display"]["big"]) + " " + ALWAYS[95:])  # 굵기 300 판에 담을 글자(큰 제목 + 빈칸 · 부호 — 영문 · 숫자는 빼고 가볍게)
    for name, root, must, out, rename in FONTS:
        src = find(root, name, must)
        if src:
            srcs[name] = src
            subset_font(src, ASSETS / "fonts" / out, title_text if out == LIGHT_ONLY else text + pal_text if out == PAL_FONT else text, rename)
        elif out in keep:
            (ASSETS / "fonts" / out).write_bytes(keep[out])
            print(f"알림: 원본 {name}을 찾지 못해 지난 줄인 판을 씀 — 새로 생긴 글자는 빠질 수 있음")
        else:
            raise SystemExit(f"글꼴을 찾지 못함: {name}")
    ft = first_text(index_html)  # 첫 화면 작은 판(10/27 B) — 통째 판과 같은 원본에서 첫 화면 글자만
    for out, (whole, kind) in FIRST.items():  # (base는 아래 사이트 주소가 쓰는 이름이라 피함)
        name, rename = next((n, r) for n, _, _, o, r in FONTS if o == whole)
        if name in srcs:
            subset_font(srcs[name], ASSETS / "fonts" / out, ft[kind], rename)
        elif out in keep:
            (ASSETS / "fonts" / out).write_bytes(keep[out])
        else:
            raise SystemExit(f"첫 화면 작은 판을 만들 원본을 찾지 못함: {name}")
    print(f"글꼴에 남긴 글자 {len(set(text))}자")
    # 영어판 글꼴(10/24 ⑤ B) — Newsreader 바로 · 기울임을 영어판의 글자만 남겨 줄임(가변 축 그대로, 예약된 이름 없어 이름 그대로)
    text_en = used_text([en_html, page404])  # 404의 영어 두 줄도 Newsreader로(10/28)
    fte = first_text(en_html)  # 영어판 첫 화면 작은 판에 담을 글자(문 글자 · 첫 화면)
    for name, out in EN_FONTS:
        src = find(PTD_DIR, name, "Newsreader")
        if src:
            srcs["NR" if "Italic" not in name else "NRI"] = src
            subset_font(src, ASSETS / "fonts" / out, text_en, False)
        elif out in keep:
            (ASSETS / "fonts" / out).write_bytes(keep[out])
            print(f"알림: 원본 {name}을 찾지 못해 지난 줄인 판을 씀")
        else:
            raise SystemExit(f"글꼴을 찾지 못함: {name}")
    if "NR" in srcs:
        subset_font(srcs["NR"], ASSETS / "fonts" / EN_FIRST, fte["serif"], False)
    elif EN_FIRST in keep:
        (ASSETS / "fonts" / EN_FIRST).write_bytes(keep[EN_FIRST])
    else:
        raise SystemExit(f"영어판 첫 화면 작은 판({EN_FIRST})을 만들 원본(Newsreader)을 찾지 못함")


    # 글꼴 라이선스 전문은 글꼴 옆에 함께 둔다(OFL·GPL 조건)
    for lic in sorted((CONTENT / "licenses").glob("*.txt")):
        shutil.copy2(lic, ASSETS / "fonts" / lic.name)

    shutil.copy2(SRC / "style.css", ASSETS / "style.css")
    shutil.copy2(SRC / "main.js", ASSETS / "main.js")

    cover = CONTENT / site["book"]["cover"]
    save_jpg(cover, ASSETS / "img/cover.jpg", 600, quality=84)
    # 첫 화면 서 있는 책(10/24)의 뒤표지·책등 — 교보 최종 표지 파일에서 자른 그림. 앞표지와 같은 폭 600px, 책등은 9mm 비율(600×9/128 ≈ 42px)
    save_jpg(CONTENT / site["book"]["back"], ASSETS / "img/back.jpg", 600, quality=84)
    save_jpg(CONTENT / site["book"]["spine"], ASSETS / "img/spine.jpg", 42, quality=88)
    # 첫 편 준비 중(10/24)의 썸네일 시안 — 800px(휴대폰 2배·컴퓨터 칸 폭에 넉넉). 흑백은 CSS가 함
    up = videos.get("upcoming") or {}
    if not videos["items"] and up.get("thumb"):
        save_jpg(CONTENT / up["thumb"], ASSETS / "img/next.jpg", 1280, quality=80)  # 원본 1280px 그대로(10/28 모양 점검 ⑨ — 800px를 컴퓨터 칸에 1.55배로 늘여 제목 글자가 흐렸음)
    for p in photos["items"]:
        save_jpg(psrc(p), ASSETS / "img/photos" / (Path(p["file"]).stem + ".jpg"), 1080)
        save_jpg(psrc(p), ASSETS / "img/photos/thumb" / (Path(p["file"]).stem + ".jpg"), 240, quality=72)
        for k in p.get("kids", []):  # 게시물 안 사진(10/25 ⑤ A) — instagram.py가 1080px로 줄여 받아 둔 것을 그대로
            (ASSETS / "img/photos/post").mkdir(parents=True, exist_ok=True)
            shutil.copy2(k, ASSETS / "img/photos/post" / Path(k).name)

    if all(k in srcs for k in ("BonMyeongjoKR-Bold.ttf", "BonMyeongjoKR-Regular.ttf", "Pretendard-Light.otf")):
        make_og(site, cover, srcs)
    elif "og.jpg" in keep:
        (ASSETS / "og.jpg").write_bytes(keep["og.jpg"])
    if all(k in srcs for k in ("NR", "Pretendard-Light.otf")):
        make_og(localize(site, "en"), cover, srcs, "en")
    elif "og-en.jpg" in keep:
        (ASSETS / "og-en.jpg").write_bytes(keep["og-en.jpg"])
    if book_card(site):  # 출간일 책 카드 기간(10/27 B) — 쪽의 og 태그도 이 그림 · 책 제목을 가리킴(render)
        ui = load("ui.json")
        for lg, sl, out, need in (("ko", site, "og-book.jpg", ("BonMyeongjoKR-Light.ttf", "BonMyeongjoKR-Bold.ttf")),
                                  ("en", localize(site, "en"), "og-book-en.jpg", ("NR",))):
            if all(k in srcs for k in (*need, "Pretendard-Light.otf", "Pretendard-SemiBold.otf")):
                make_og(sl, cover, srcs, lg, {"kick": ui["og_book_kick"][lg], "on": ui["book_on"][lg]})
            elif out in keep:
                (ASSETS / out).write_bytes(keep[out])
            else:
                raise SystemExit(f"출간일 책 카드({out})를 그릴 원본 글꼴을 찾지 못함")
    if all(f[0] in srcs for f in FONTS):  # 원본 글꼴이 다 있으면(10/25 고침 — 영어 글꼴 NR · NRI가 srcs에 더해진 뒤로 '개수 같음'이 늘 거짓이라 옛 그림만 옮겨 쓰고 있었음)
        make_takbon(site, poem, srcs)
    elif "takbon.jpg" in keep:
        (ASSETS / "img" / "takbon.jpg").write_bytes(keep["takbon.jpg"])
    make_icons()
    (DOCS / "index.html").write_text(index_html, encoding="utf-8")
    (DOCS / "en").mkdir()
    (DOCS / "en" / "index.html").write_text(en_html, encoding="utf-8")
    (DOCS / "404.html").write_text(page404, encoding="utf-8")
    for lg, html in priv.items():
        if html:
            d = DOCS / ("en/privacy" if lg == "en" else "privacy")
            d.mkdir(parents=True, exist_ok=True)
            (d / "index.html").write_text(html, encoding="utf-8")
    (DOCS / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {base}/sitemap.xml\n", encoding="utf-8")
    (DOCS / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
        + "".join(f'<url><loc>{e(base)}{path}</loc><lastmod>{build_day().isoformat()}</lastmod><xhtml:link rel="alternate" hreflang="ko" href="{e(base)}/"/>'
                  f'<xhtml:link rel="alternate" hreflang="en" href="{e(base)}/en/"/><xhtml:link rel="alternate" hreflang="x-default" href="{e(base)}/"/></url>'
                  for path in ("/", "/en/"))  # lastmod는 빌드한 날 · x-default는 머리말과 같게(10/27 가5)
        + "</urlset>\n", encoding="utf-8")
    (DOCS / ".nojekyll").write_text("", encoding="utf-8")  # GitHub Pages가 파일을 다시 가공하지 않게
    if (CONTENT / "CNAME").exists():  # 도메인을 산 뒤에만 둔다 — docs는 매번 새로 만들어지므로 여기서 옮겨 넣음
        shutil.copy2(CONTENT / "CNAME", DOCS / "CNAME")

    scale_check()  # 맨 끝 '합계' 줄 앞에(시험 묶음이 끝 줄을 읽음)

    # 무게 보고
    total = 0
    rows = []
    for f in sorted(DOCS.rglob("*")):
        if f.is_file():
            total += f.stat().st_size
            rows.append((f.stat().st_size, f.relative_to(DOCS)))
    for size, rel in sorted(rows, reverse=True)[:8]:
        print(f"{size/1024:9.0f} KB  {rel}")
    print(f"합계 {total/1024/1024:.1f} MB · 파일 {len(rows)}개 → {DOCS}")


if __name__ == "__main__":
    main()
