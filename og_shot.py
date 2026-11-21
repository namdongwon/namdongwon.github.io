"""첫 화면(/ · 여섯 판) 공유 카드 그림을 진짜 화면으로 찍는다 — content/og/og-home.jpg · og-home-<말>.jpg (1200×630)

11/21 동원 "공유 카드 이런식으로 보여주는 게 더 멋있을 거 같아 딱 이런 느낌"(꾸민 카드 대신 첫 화면을 그대로 찍은 모습).
빌드(build.py)는 크롬을 띄우지 않고 찍어 둔 그림을 docs/assets에 그대로 옮기기만 함 — 그래서 첫 화면 모습(헤더 · 큰 이름 · 사람 · 메뉴 이름)이
바뀌면 이 스크립트를 다시 돌려 그림을 새로 찍고 커밋한다.

쓰는 법(웹사이트 폴더에서): 먼저 빌드 → tools/.venv/bin/python og_shot.py
- 빌드된 docs를 이 맥 안 임시 서버로 열어 넓은 창 1440×756(1.91:1 · 화면 배율 2)에서 맨 위를 찍고 1200×630으로 줄임
- 커서 점 · 동의 창 · 언어 안내 띠 · 프리로더는 숨기고, 첫 화면 등장 움직임이 다 선 뒤에 찍음
- 헤드리스 크롬은 크롬 쪽지(tools/site_tests/크롬 쓰는 중.txt)에 내 줄을 덧붙이고 쓰며, 끝나면 내 줄만 뺌 — 시험 전체(QA · run_all) 줄이 있으면 기다리라고 알리고 멈춤
  (11/21 이어 받기 세션 '다른 줄이 있어도 내 줄을 덧붙이고 30초 찍은 뒤 내 줄만 빼' — 쪽지를 여러 세션이 함께 쓰는 중)
- 임시 크롬 프로필은 끝나면 지움
"""
import base64
import functools
import http.server
import io
import os
import shutil
import sys
import tempfile
import threading
import time
from datetime import datetime
from pathlib import Path

from PIL import Image

HERE = Path(os.path.realpath(__file__)).parent
TOOLS = Path(os.path.realpath(HERE.parent / "tools"))
sys.path.insert(0, str(TOOLS))
import web_record as wr  # noqa: E402 — 헤드리스 크롬을 파이프로 다루는 도구(tools 저장소)

DOCS, OUT = HERE / "docs", HERE / "content" / "og"
LANGS = ("ko", "en", "ja", "ru", "es", "fr")
NOTE = TOOLS / "site_tests" / "크롬 쓰는 중.txt"
W, H, DPR = 1440, 756, 2
HIDE = "#cz,#pl,.cur,.ttp,.rip,.lsug{display:none!important}"


def main():
    if not (DOCS / "index.html").exists():
        raise SystemExit("docs가 없어요 — 먼저 build.py로 빌드하세요")
    now = NOTE.read_text(encoding="utf-8") if NOTE.exists() else ""
    if any(w in ln for ln in now.splitlines() for w in ("QA", "run_all")):
        raise SystemExit("크롬 쪽지에 시험 전체 줄이 있어요 — 끝난 뒤 다시 돌리세요:\n" + now)
    mine = f"{datetime.now():%m/%d %H:%M} og_shot.py — 첫 화면 공유 카드 찍기(약 30초)\n"
    with NOTE.open("a", encoding="utf-8") as f:
        f.write(("" if not now or now.endswith("\n") else "\n") + mine)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(DOCS)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    prof = tempfile.mkdtemp(prefix="ogshot-")
    c = None
    try:
        c = wr.CDP(["--headless=new", "--remote-debugging-pipe", "--no-first-run", "--hide-scrollbars", f"--user-data-dir={prof}", "about:blank"])
        tid = c.send("Target.createTarget", {"url": "about:blank"})["targetId"]
        s = c.send("Target.attachToTarget", {"targetId": tid, "flatten": True})["sessionId"]
        c.send("Emulation.setDeviceMetricsOverride", {"width": W, "height": H, "deviceScaleFactor": DPR, "mobile": False}, s)
        for d in ("Runtime", "Page"):
            c.send(f"{d}.enable", None, s)
        c.send("Page.addScriptToEvaluateOnNewDocument", {"source": "try { localStorage.setItem('lsug', '1') } catch (e) {}"}, s)
        OUT.mkdir(parents=True, exist_ok=True)
        base = f"http://127.0.0.1:{srv.server_address[1]}/"
        for lang in LANGS:
            c.send("Page.navigate", {"url": base + ("" if lang == "ko" else f"{lang}/")}, s)
            c.wait_event("Page.loadEventFired", 60)
            ev = lambda x: c.send("Runtime.evaluate", {"expression": x, "awaitPromise": True, "returnByValue": True}, s)["result"].get("value")  # noqa: E731
            ev("document.fonts.ready.then(() => 1)")
            ev(f"(() => {{ const st = document.createElement('style'); st.textContent = {HIDE!r}; document.head.appendChild(st); return 1 }})()")
            end = time.time() + 15
            while time.time() < end and not ev("!!document.querySelector('.tk.go.pgo')"):
                c.pump(0.1)
            t0 = time.time()
            while time.time() - t0 < 3:  # 등장 움직임(글 · 사람 · 메뉴 점)이 다 서도록
                c.pump(0.1)
            png = base64.b64decode(c.send("Page.captureScreenshot", {"format": "png"}, s)["data"])
            im = Image.open(io.BytesIO(png)).convert("RGB").resize((1200, 630), Image.LANCZOS)
            out = OUT / (f"og-home-{lang}.jpg" if lang != "ko" else "og-home.jpg")
            im.save(out, "JPEG", quality=88, optimize=True)
            print(f"{out.relative_to(HERE)}  {out.stat().st_size // 1024} KB")
    finally:
        if c:
            try:
                c.close()
            except Exception:
                pass
        shutil.rmtree(prof, ignore_errors=True)
        srv.shutdown()
        if NOTE.exists():  # 내 줄만 뺌(그새 다른 세션이 덧붙인 줄은 그대로)
            left = NOTE.read_text(encoding="utf-8").replace(mine, "", 1)
            NOTE.write_text(left, encoding="utf-8")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


if __name__ == "__main__":
    main()
