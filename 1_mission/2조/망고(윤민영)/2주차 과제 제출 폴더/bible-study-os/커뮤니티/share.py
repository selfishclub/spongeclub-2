#!/usr/bin/env python3
import json, os, subprocess, tempfile

BASE = os.path.dirname(os.path.abspath(__file__))

entry_path = os.path.join(BASE, "latest-entry.json")
if not os.path.exists(entry_path):
    print("❌ latest-entry.json이 없어요.")
    print("   먼저 bible-study-os 채널에서 묵상을 완료해주세요.")
    exit(1)

with open(entry_path, encoding="utf-8") as f:
    entry = json.load(f)

words = " · ".join(entry.get("words", []))
message = f"""🙏 오늘의 묵상

📖 {entry['passage']}
💬 {entry['summary']}
✍️ 액션 플랜: {entry['action']}
🔑 오늘의 단어: {words}

#{entry['date'].replace('-', '')} #묵상"""

html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>묵상 공유</title>
<style>
  body {{ font-family: -apple-system, sans-serif; max-width: 480px; margin: 60px auto; padding: 0 24px; background: #fafaf8; color: #1a1a1a; }}
  h2 {{ font-size: 18px; font-weight: 600; margin-bottom: 24px; }}
  .card {{ background: white; border-radius: 16px; padding: 24px; white-space: pre-wrap; line-height: 1.8; font-size: 15px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); border: 1px solid #ebebeb; }}
  button {{ margin-top: 20px; width: 100%; padding: 16px; background: #FEE500; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; color: #1a1a1a; }}
  button:active {{ opacity: 0.8; }}
  .done {{ background: #e8f5e9; color: #2e7d32; }}
  .date {{ font-size: 12px; color: #888; margin-bottom: 8px; }}
</style>
</head>
<body>
<div class="date">{entry['date']}</div>
<h2>오늘의 묵상</h2>
<div class="card" id="msg">{message}</div>
<button id="btn" onclick="copy()">카카오톡에 복사하기</button>
<script>
function copy() {{
  const text = document.getElementById('msg').innerText;
  navigator.clipboard.writeText(text).then(() => {{
    const btn = document.getElementById('btn');
    btn.textContent = '✅ 복사됐어요! 카톡에 붙여넣기 하세요.';
    btn.classList.add('done');
  }});
}}
</script>
</body>
</html>"""

html_path = os.path.join(BASE, "_share.html")
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)

subprocess.run(["open", html_path])
print("✅ 브라우저에서 공유 화면이 열렸어요. 버튼을 누르면 카톡에 붙여넣기 가능해요.")
