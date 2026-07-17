#!/usr/bin/env python3
"""
아침 묵상 OS
실행: python3 묵상-os.py
접속: http://psalm1331:1331
"""
import json, os, re, subprocess, threading, time, webbrowser
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from urllib.request import urlopen, Request

BASE = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(BASE, "묵상-로그.json")
REMINDERS_FILE = os.path.join(BASE, "알림-스케줄.json")

# 핸드폰 알림: ntfy.sh 무료 푸시 서비스
# 앱 설치 후 아래 토픽 구독하면 알림이 와요
NTFY_TOPIC = "mango-bible-morning-os"  # 고유 이름 — 나만 아는 이름으로 바꿔도 됨

def load_log():
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, encoding="utf-8") as f:
            return json.load(f)
    return []

def save_log(entries):
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

def load_reminders():
    if os.path.exists(REMINDERS_FILE):
        with open(REMINDERS_FILE, encoding="utf-8") as f:
            return json.load(f)
    return []

def save_reminders(reminders):
    with open(REMINDERS_FILE, "w", encoding="utf-8") as f:
        json.dump(reminders, f, ensure_ascii=False, indent=2)

def send_phone_push(title, message):
    try:
        req = Request(
            f"https://ntfy.sh/{NTFY_TOPIC}",
            data=message.encode(),
            headers={"Title": title, "Priority": "default", "Tags": "bible"}
        )
        urlopen(req, timeout=5)
    except Exception:
        pass  # 인터넷 없어도 팝업은 정상 작동

def show_popup(title, message):
    safe_msg = message.replace('"', "'")
    subprocess.Popen([
        "osascript", "-e",
        f'display dialog "{safe_msg}" buttons {{"확인"}} default button "확인" with title "{title}"'
    ])
    send_phone_push(title, message)

def schedule_reminders(entry):
    reminders = load_reminders()
    now = datetime.now()

    # 액션 플랜: 이틀 뒤 오후 4시
    action_time = (now + timedelta(days=2)).replace(hour=16, minute=0, second=0, microsecond=0)
    # 단어: 다음날 오전 11시 30분
    vocab_time = (now + timedelta(days=1)).replace(hour=11, minute=30, second=0, microsecond=0)

    if entry.get("action"):
        reminders.append({
            "id": f"action_{entry['date']}",
            "time": action_time.isoformat(),
            "title": "📖 액션 플랜 체크",
            "message": f"이틀 전 다짐: {entry['action']}\\n\\n지켰나요? 오늘 다시 한 번!",
            "fired": False
        })

    if entry.get("words"):
        word_str = ", ".join(entry["words"][:5])
        reminders.append({
            "id": f"vocab_{entry['date']}",
            "time": vocab_time.isoformat(),
            "title": "🔑 오늘의 단어",
            "message": f"{entry['passage']}\\n{word_str}",
            "fired": False
        })

    save_reminders(reminders)

def reminder_loop():
    while True:
        try:
            reminders = load_reminders()
            now = datetime.now()
            changed = False
            for r in reminders:
                if not r.get("fired") and datetime.fromisoformat(r["time"]) <= now:
                    show_popup(r["title"], r["message"])
                    r["fired"] = True
                    changed = True
            if changed:
                save_reminders(reminders)
        except Exception:
            pass
        time.sleep(30)

def mark_highlights(text):
    return re.sub(r'\[H\](.*?)\[/H\]', r'<span class="hl">\1</span>', text)

def analyze(passage):
    prompt = f"""성경 본문 "{passage}"를 분석해서 아래 JSON 형식으로만 응답해줘. 코드블록 없이 JSON만.

번역본 4개를 비교해서, 서로 다르게 표현된 단어나 구절은 [H]단어[/H] 로 감싸줘.
같은 뜻이지만 단어 선택이나 표현이 다른 부분이 핵심이야. 4개 중 하나라도 다르면 표시.

{{
  "translations": {{
    "개역개정": "(본문 전체, 다른 표현은 [H]...[/H] 로 감싸기)",
    "새번역": "(본문 전체, 다른 표현은 [H]...[/H] 로 감싸기)",
    "NKJV": "(full text, different expressions wrapped in [H]...[/H])",
    "NASB": "(full text, different expressions wrapped in [H]...[/H])"
  }},
  "words": [
    {{
      "korean": "단어 또는 숙어/표현구",
      "english": "word or phrase (예: so loved, only begotten, give a defense)",
      "pos": "품사 (명사/동사/형용사/부사/동사구/명사구/형용사구 중 하나, 한국어로)",
      "original": "헬라어/히브리어 (단어인 경우만, 표현구면 빈 문자열)",
      "meaning": "원어 뜻 또는 표현의 한국어 의미",
      "nuance": "영어 뉘앙스와 문맥 속 의미. 수능/중등 수준으로 — 어렵지 않은 표현도 왜 이렇게 쓰는지 설명"
    }}
  ],
  "background": "저자·시대·문맥 중 이 본문을 이해하는 데 가장 중요한 것 한 가지, 2문장"
}}

words는 중요한 단어 + 유용한 숙어·표현구 합쳐서 4~6개. 수능/중등 수준 난이도.
JSON만 출력."""

    result = subprocess.run(
        ["claude", "-p", "--dangerously-skip-permissions", "--output-format", "text", prompt],
        capture_output=True, text=True, timeout=120,
        stdin=subprocess.DEVNULL
    )
    text = result.stdout.strip()
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    data = json.loads(text.strip())
    # [H]...[/H] → <span class="hl">...</span>
    for key in data.get("translations", {}):
        data["translations"][key] = mark_highlights(data["translations"][key])
    return data

HTML = r"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>아침 묵상 OS</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;600&display=swap" rel="stylesheet">
<style>
/* ════════════════════════════════════════
   PALETTE — Parisian Antique
   흐릿한 하늘 · 바랜 테라코타 · 양피지
════════════════════════════════════════ */
:root{
  /* 하늘색: 채도 높임 — 선명하지만 우아하게 */
  --sky:    #4e9ec2;
  --sky-l:  #c8e6f5;
  --sky-d:  #2d7ea6;
  --sky-s1: #6ab4d4;  /* 세로 줄무늬 진한 줄 */
  --sky-s2: #acd6ea;  /* 세로 줄무늬 연한 줄 */
  /* 주황: 채도 높임 — 선명한 테라코타 */
  --ora:    #d45d20;
  --ora-l:  #fad8c0;
  --ora-d:  #a83e08;
  /* 중성 */
  --parch:  #f2ede1;
  --cream:  #fdfaf2;
  --ink:    #26180c;
  --ink2:   #52391e;
  --line:   #c8b89a;
  --line-l: #e2d5c0;
}

*{box-sizing:border-box;margin:0;padding:0}

/* 배경: 양피지 + 아주 흐릿한 세로 핀스트라이프 */
body{
  font-family:'Lato',sans-serif;
  color:var(--ink);min-height:100vh;
  background-color:var(--parch);
  background-image: repeating-linear-gradient(
    to right,
    transparent        0px, transparent        47px,
    rgba(141,180,200,.09) 47px, rgba(141,180,200,.09) 48px
  );
}

/* ── 헤더: 세로 줄무늬 (프랑스 티킹 패브릭) ── */
.header{
  background-image: repeating-linear-gradient(
    to right,
    var(--sky-s1) 0px,  var(--sky-s1) 10px,
    var(--sky-s2) 10px, var(--sky-s2) 30px
  );
  padding:20px 24px 16px;
  text-align:center;
  position:sticky;top:0;z-index:10;
  border-bottom:3px solid var(--sky-d);
}
.header-ornament{
  font-size:10px;letter-spacing:5px;
  color:rgba(40,70,90,.4);margin-bottom:6px;
}
.header h1{
  font-family:'Playfair Display',serif;
  font-size:24px;font-weight:700;
  color:var(--ora);letter-spacing:.5px;
  text-shadow:0 1px 3px rgba(255,255,255,.5);
}
.header-sub{
  font-size:11px;color:var(--ink);
  margin-top:7px;letter-spacing:.3px;
  font-family:'Playfair Display',serif;
  font-style:italic;line-height:1.6;
  opacity:.82;
}

/* ── 탭 ── */
.tab-bar{display:flex;background:var(--sky-d)}
.tab{
  flex:1;padding:11px;text-align:center;
  font-family:'Lato',sans-serif;font-size:12px;font-weight:700;
  color:rgba(255,255,255,.6);cursor:pointer;
  border-bottom:3px solid transparent;
  letter-spacing:1px;text-transform:uppercase;transition:color .15s;
}
.tab.active{color:#fff;border-bottom-color:var(--ora)}
.tab:hover:not(.active){color:rgba(255,255,255,.88)}

/* ── 페이지 ── */
.page{display:none;padding:18px;max-width:620px;margin:0 auto}
.page.active{display:block}

/* 카드: 이중 테두리 — 액자 효과 */
.card{
  background:var(--cream);
  border:1px solid var(--line);
  box-shadow:
    inset 0 0 0 5px var(--cream),
    inset 0 0 0 6px var(--line-l),
    2px 4px 14px rgba(42,32,22,.08);
  padding:22px;margin-bottom:16px;
}
.card-title{
  font-family:'Playfair Display',serif;
  font-size:12px;font-weight:700;color:var(--sky-d);
  letter-spacing:.8px;text-transform:uppercase;
  margin-bottom:14px;padding-bottom:9px;
  border-bottom:1px solid var(--line-l);
  display:flex;align-items:center;gap:8px;
}
.card-title::before{
  content:'';display:inline-block;
  width:3px;height:12px;
  background:var(--ora);flex-shrink:0;
}

/* ── 입력 ── */
input[type=text]{
  width:100%;padding:12px 14px;
  border:1px solid var(--line);
  font-size:15px;font-family:'Lato',sans-serif;
  background:white;outline:none;color:var(--ink);
}
input[type=text]:focus{border-color:var(--sky);box-shadow:0 0 0 3px rgba(141,180,200,.15)}
textarea{
  width:100%;border:1px solid var(--line);
  padding:12px 14px;font-size:14px;min-height:90px;
  resize:vertical;font-family:'Lato',sans-serif;
  outline:none;line-height:1.75;background:white;color:var(--ink);
}
textarea:focus{border-color:var(--sky);box-shadow:0 0 0 3px rgba(141,180,200,.15)}

/* ── 버튼 ── */
.btn{
  width:100%;padding:14px;border:none;
  font-size:13px;font-weight:700;cursor:pointer;
  margin-top:10px;letter-spacing:.9px;
  font-family:'Lato',sans-serif;text-transform:uppercase;
}
.btn-primary{background:var(--ora);color:white}
.btn-primary:hover{background:var(--ora-d)}
.btn-primary:disabled{background:#c2b49e;cursor:default}
.btn-kakao{background:#FEE500;color:var(--ink)}

/* ── 스피너 ── */
.spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:white;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:7px}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── 번역 테이블 ── */
.result-area{display:none}
.trans-table{width:100%;border-collapse:collapse;font-size:14px}
.trans-table td{padding:11px 12px;border-bottom:1px solid var(--line-l);vertical-align:top;line-height:1.85}
.trans-table td:first-child{
  font-weight:700;color:var(--sky-d);font-size:10px;
  white-space:nowrap;width:68px;
  font-family:'Lato',sans-serif;letter-spacing:.6px;text-transform:uppercase;
  border-right:1px solid var(--sky-l);
}
.trans-table tr:last-child td{border-bottom:none}
.hl{background:var(--sky-l);padding:1px 4px;color:var(--sky-d);font-weight:700}

/* ── 품사 뱃지 ── */
.pos-badge{
  background:var(--ora-l);color:var(--ora-d);
  font-size:9px;font-weight:700;padding:2px 7px;
  vertical-align:middle;margin-left:5px;
  letter-spacing:.3px;text-transform:uppercase;
  border:1px solid rgba(192,115,72,.2);
}

/* ── 단어 카드 ── */
.word-card{
  border:1px solid var(--line-l);
  padding:15px 16px;margin-bottom:10px;
  background:white;border-left:3px solid var(--sky);
  box-shadow:1px 2px 5px rgba(42,32,22,.04);
}
.word-num{font-size:10px;font-weight:700;color:var(--ora);margin-bottom:4px;letter-spacing:.5px;text-transform:uppercase;font-family:'Lato',sans-serif}
.word-title{font-family:'Playfair Display',serif;font-size:17px;font-weight:600;margin-bottom:10px;color:var(--ink)}
.word-title span{font-size:12px;color:#9a8872;font-weight:400;margin-left:7px;font-family:'Lato',sans-serif}
.word-row{display:flex;gap:10px;margin-bottom:6px;font-size:13px;align-items:flex-start}
.wk{font-weight:700;color:var(--sky-d);font-size:10px;min-width:58px;flex-shrink:0;padding-top:2px;text-transform:uppercase;letter-spacing:.4px}
.wv{color:var(--ink2);line-height:1.75}
.bg-text{font-size:14px;line-height:1.9;color:var(--ink2);font-style:italic}

/* ── 묵상 기록 ── */
.field{margin-bottom:13px}
.fl{font-size:11px;font-weight:700;color:var(--sky-d);margin-bottom:6px;display:block;text-transform:uppercase;letter-spacing:.6px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.chip{background:var(--sky-l);color:var(--sky-d);padding:5px 12px;font-size:12px;cursor:pointer;font-family:'Lato',sans-serif;font-weight:700;border:1px solid rgba(141,180,200,.3)}
.chip:hover{background:var(--sky);color:white}
.word-add{display:flex;gap:8px}
.word-add input{flex:1;padding:9px 12px;border:1px solid var(--line);font-size:13px;outline:none;font-family:'Lato',sans-serif;background:white}
.word-add input:focus{border-color:var(--sky)}
.word-add button{padding:9px 14px;background:var(--sky);color:white;border:none;font-size:12px;cursor:pointer;font-family:'Lato',sans-serif;font-weight:700;letter-spacing:.5px;text-transform:uppercase}
.word-add button:hover{background:var(--sky-d)}

/* ── 대시보드 ── */
.dash-toolbar{display:flex;justify-content:flex-end;gap:8px;margin-bottom:14px}
.view-btn{width:34px;height:34px;border:1px solid var(--line);background:var(--cream);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.view-btn.active{background:var(--sky-d);border-color:var(--sky-d);color:white}
.entry-card{background:var(--cream);border:1px solid var(--line);padding:16px;margin-bottom:10px;border-left:3px solid var(--ora);box-shadow:1px 2px 6px rgba(42,32,22,.06)}
.entry-date{font-size:11px;color:var(--ora);font-weight:700;margin-bottom:3px;letter-spacing:.6px;text-transform:uppercase}
.entry-passage{font-family:'Playfair Display',serif;font-size:17px;font-weight:600;margin-bottom:6px;color:var(--ink)}
.entry-summary{font-size:13px;color:var(--ink2);line-height:1.75;margin-bottom:5px}
.entry-action{font-size:12px;color:var(--sky-d);margin-bottom:8px;font-weight:700}
.echips{display:flex;flex-wrap:wrap;gap:5px}
.echip{background:var(--sky-l);color:var(--sky-d);padding:3px 10px;font-size:11px;font-weight:700;border:1px solid rgba(141,180,200,.2)}
.empty{text-align:center;padding:60px 20px;color:#b0a484;font-size:15px;line-height:2.2;font-family:'Playfair Display',serif;font-style:italic}

/* ── 달력 ── */
.cal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.cal-header h3{font-family:'Playfair Display',serif;font-size:17px;font-weight:600;color:var(--ink)}
.cal-nav{background:none;border:1px solid var(--line);font-size:16px;cursor:pointer;color:var(--sky-d);padding:4px 12px}
.cal-nav:hover{background:var(--sky-l)}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.cal-day-label{text-align:center;font-size:10px;font-weight:700;color:var(--sky-d);padding:5px 0;letter-spacing:.5px;text-transform:uppercase}
.cal-cell{
  min-height:58px;padding:6px 4px 5px;
  display:flex;flex-direction:column;align-items:center;
  cursor:pointer;background:var(--cream);border:1px solid var(--line-l);
}
.cal-cell:hover{background:var(--sky-l);border-color:var(--sky)}
.cal-cell.has-entry{background:var(--sky-l);border:1px solid var(--sky)}
.cal-cell.today .cal-num{background:var(--ora);color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center}
.cal-cell.empty-cell{background:none;border:none;cursor:default}
.cal-num{font-size:13px;font-weight:500;color:var(--ink);margin-bottom:2px}
.cal-dot{display:none}
.cal-preview{
  font-size:9px;color:var(--sky-d);font-weight:700;
  text-align:center;line-height:1.3;
  overflow:hidden;display:-webkit-box;
  -webkit-line-clamp:2;-webkit-box-orient:vertical;
  width:100%;padding:0 2px;
  font-family:'Lato',sans-serif;
}
.cal-cell.has-entry .cal-preview{display:block}
.cal-cell:not(.has-entry) .cal-preview{display:none}
.cal-popup{background:var(--cream);border:1px solid var(--line);border-left:3px solid var(--ora);padding:16px;margin-top:10px;box-shadow:2px 3px 12px rgba(42,32,22,.1);display:none}
.cal-popup.show{display:block}
</style>
</head>
<body>

<div class="header">
  <div class="header-ornament">· &nbsp;· &nbsp;✦&nbsp; · &nbsp;·</div>
  <h1>Come Away</h1>
  <div class="header-sub">"Turn your eyes away from me,<br>for they overwhelm me." — Song of Songs 6:5</div>
</div>

<div class="tab-bar">
  <div class="tab active" onclick="showTab('study')">묵상</div>
  <div class="tab" onclick="showTab('dashboard')">대시보드</div>
</div>

<div id="tab-study" class="page active">

  <!-- 본문 입력 -->
  <div class="card">
    <div class="card-title">✦ &nbsp;오늘의 본문</div>
    <input type="text" id="passage" placeholder="예: 요한복음 3:16 / Romans 8:28" onkeydown="if(event.key==='Enter')analyze()">
    <button class="btn btn-primary" id="analyze-btn" onclick="analyze()">분석하기</button>
  </div>

  <!-- 분석 결과 -->
  <div class="result-area" id="result-area">
    <div class="card">
      <div class="card-title">✦ &nbsp;번역본 비교</div>
      <table class="trans-table"><tbody id="trans-body"></tbody></table>
    </div>
    <div class="card">
      <div class="card-title">✦ &nbsp;핵심 단어 분석</div>
      <div id="words-body"></div>
    </div>
    <div class="card">
      <div class="card-title">✦ &nbsp;배경</div>
      <p class="bg-text" id="bg-text"></p>
    </div>
  </div>

  <!-- 묵상 기록 -->
  <div class="card">
    <div class="card-title">✦ &nbsp;오늘의 묵상 기록</div>
    <div class="field">
      <label class="fl">묵상 내용</label>
      <textarea id="summary" placeholder="오늘 이 말씀은 당신에게 어떻게 와닿았나요? 무엇을 느꼈나요?"></textarea>
    </div>
    <div class="field">
      <label class="fl">액션 플랜</label>
      <textarea id="action" placeholder="딱 하나만요 — 작고 소소해도 괜찮아요. 오늘 집에서, 혹은 지금 당장 할 수 있는 게 뭐가 있을까요?" style="min-height:65px"></textarea>
    </div>
    <div class="field">
      <label class="fl">기억할 단어</label>
      <div class="chips" id="word-chips"></div>
      <div class="word-add">
        <input type="text" id="word-input" placeholder="단어 입력" onkeydown="if(event.key==='Enter')addWord()">
        <button onclick="addWord()">추가</button>
      </div>
    </div>
    <button class="btn btn-primary" onclick="saveEntry()">기록 저장</button>
    <button class="btn btn-kakao" id="share-btn" style="display:none" onclick="shareKakao()">카카오톡에 공유하기</button>
  </div>

</div>

<div id="tab-dashboard" class="page">
  <div class="dash-toolbar">
    <button class="view-btn active" id="btn-list" onclick="setView('list')" title="목록 보기">☰</button>
    <button class="view-btn" id="btn-cal" onclick="setView('cal')" title="달력 보기">📅</button>
  </div>
  <div id="dashboard-list"></div>
  <div id="dashboard-cal" style="display:none">
    <div class="cal-header">
      <button class="cal-nav" onclick="moveCal(-1)">‹</button>
      <h3 id="cal-title"></h3>
      <button class="cal-nav" onclick="moveCal(1)">›</button>
    </div>
    <div class="cal-grid" id="cal-grid"></div>
    <div class="cal-popup" id="cal-popup"></div>
  </div>
</div>

<script>
let words = [];
let savedEntry = null;
let isSaved = false;

function showTab(name) {
  document.querySelectorAll('.tab').forEach((t,i) =>
    t.classList.toggle('active', ['study','dashboard'][i]===name));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  if(name==='dashboard') loadDashboard();
}

async function analyze() {
  const passage = document.getElementById('passage').value.trim();
  if(!passage) { document.getElementById('passage').focus(); return; }

  const btn = document.getElementById('analyze-btn');
  btn.innerHTML = '<span class="spinner"></span>분석 중...';
  btn.disabled = true;
  document.getElementById('result-area').style.display = 'none';
  document.getElementById('share-btn').style.display = 'none';
  isSaved = false;
  const saveBtn = document.querySelector('button.btn-primary[onclick="saveEntry()"]');
  if(saveBtn){ saveBtn.textContent='기록 저장'; saveBtn.disabled=false; saveBtn.style.background=''; }

  try {
    const res = await fetch('/api/analyze', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({passage})
    });
    const data = await res.json();
    if(data.error) { alert('오류: '+data.error); return; }
    render(data);
  } catch(e) {
    alert('오류가 발생했어요: '+e.message);
  } finally {
    btn.innerHTML = '분석하기';
    btn.disabled = false;
  }
}

function render(data) {
  // 번역본 (세로 표)
  const tbody = document.getElementById('trans-body');
  tbody.innerHTML = ['개역개정','새번역','NKJV','NASB'].map(v =>
    data.translations[v] ? `<tr><td>${v}</td><td>${data.translations[v]}</td></tr>` : ''
  ).join('');

  // 단어 (번호 카드)
  document.getElementById('words-body').innerHTML = (data.words||[]).map((w,i) => {
    const sub = [w.english, w.original].filter(Boolean).join(' / ');
    const label = w.original ? '원어 뜻' : '의미';
    return `
    <div class="word-card">
      <div class="word-num">${i+1} <span class="pos-badge">${w.pos||''}</span></div>
      <div class="word-title">${w.korean}<span>${sub ? ' / '+sub : ''}</span></div>
      <div class="word-row"><span class="wk">${label}</span><span class="wv">${w.meaning}</span></div>
      <div class="word-row"><span class="wk">영어 뉘앙스</span><span class="wv">${w.nuance}</span></div>
    </div>`;
  }).join('');

  document.getElementById('bg-text').textContent = data.background||'';
  document.getElementById('result-area').style.display = 'block';
  document.getElementById('result-area').scrollIntoView({behavior:'smooth'});

  // 영어 단어 자동 채우기 (영어 먼저, 원어는 괄호 안)
  words = (data.words||[]).map(w=>`${w.english} (${w.original})`).filter(Boolean);
  renderChips();
}

function addWord() {
  const input = document.getElementById('word-input');
  const v = input.value.trim();
  if(!v) return;
  words.push(v); renderChips(); input.value='';
}
function renderChips() {
  document.getElementById('word-chips').innerHTML =
    words.map((w,i)=>`<span class="chip" onclick="removeWord(${i})">${w} ×</span>`).join('');
}
function removeWord(i) { words.splice(i,1); renderChips(); }

async function saveEntry() {
  if(isSaved) { alert('이미 저장됐어요!'); return; }
  const passage = document.getElementById('passage').value.trim();
  const summary = document.getElementById('summary').value.trim();
  const action = document.getElementById('action').value.trim();
  if(!passage||!summary) { alert(passage?'묵상 내용을 입력해주세요.':'본문을 입력해주세요.'); return; }

  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  savedEntry = {date, passage, summary, action, words:[...words]};
  await fetch('/api/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(savedEntry)});
  isSaved = true;
  const saveBtn = document.querySelector('button.btn-primary[onclick="saveEntry()"]');
  if(saveBtn){ saveBtn.textContent='✅ 저장됨'; saveBtn.disabled=true; saveBtn.style.background='#888'; }
  document.getElementById('share-btn').style.display='block';
  document.getElementById('share-btn').scrollIntoView({behavior:'smooth'});
}

function shareKakao() {
  if(!savedEntry) return;
  const w = savedEntry.words.join(' · ');
  const text = `🙏 오늘의 묵상\n\n📖 ${savedEntry.passage}\n💬 ${savedEntry.summary}${savedEntry.action?'\n✍️ 액션 플랜: '+savedEntry.action:''}${w?'\n🔑 오늘의 단어: '+w:''}\n\n#묵상`;
  const ta = document.createElement('textarea');
  ta.value=text; ta.style.cssText='position:fixed;opacity:0';
  document.body.appendChild(ta); ta.select();
  try{document.execCommand('copy');}catch(e){}
  document.body.removeChild(ta);
  const btn=document.getElementById('share-btn');
  btn.textContent='✅ 복사됐어요! 카톡에 붙여넣기 하세요.';
  btn.style.background='#e8f5e9';
  setTimeout(()=>{btn.textContent='카카오톡에 공유하기';btn.style.background='';},3000);
}

let allEntries = [];
let calYear, calMonth;
let dashView = 'list';

function entryCardHtml(e) {
  return `<div class="entry-card">
    <div class="entry-date">${e.date}</div>
    <div class="entry-passage">${e.passage}</div>
    <div class="entry-summary">${e.summary}</div>
    ${e.action?`<div class="entry-action">✍️ ${e.action}</div>`:''}
    ${e.words?.length?`<div class="echips">${e.words.map(w=>`<span class="echip">${w}</span>`).join('')}</div>`:''}
  </div>`;
}

function renderList() {
  const el = document.getElementById('dashboard-list');
  if(!allEntries.length){
    el.innerHTML='<div class="empty">아직 기록된 묵상이 없어요 🙏<br>첫 묵상을 시작해보세요.</div>';
    return;
  }
  el.innerHTML=[...allEntries].reverse().map(entryCardHtml).join('');
}

function renderCal() {
  const today = new Date();
  if(calYear===undefined){ calYear=today.getFullYear(); calMonth=today.getMonth(); }
  const title = `${calYear}년 ${calMonth+1}월`;
  document.getElementById('cal-title').textContent = title;

  const byDate = {};
  allEntries.forEach(e=>{ byDate[e.date]=e; });

  const days = ['일','월','화','수','목','금','토'];
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  let html = days.map(d=>`<div class="cal-day-label">${d}</div>`).join('');
  for(let i=0;i<firstDay;i++) html+=`<div class="cal-cell empty-cell"></div>`;
  for(let d=1;d<=daysInMonth;d++){
    const ds=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const entry=byDate[ds];
    const hasEntry=!!entry;
    const isToday=ds===todayStr;
    // 프리뷰: 본문 + 묵상 앞 8자
    let preview='';
    if(entry){
      const passage = entry.passage||'';
      const snip = (entry.summary||'').slice(0,18);
      preview=`<div class="cal-preview">${passage}<br>${snip}…</div>`;
    }
    html+=`<div class="cal-cell${hasEntry?' has-entry':''}${isToday?' today':''}" onclick="calClick('${ds}')">
      <div class="cal-num">${d}</div>
      ${preview}
    </div>`;
  }
  document.getElementById('cal-grid').innerHTML=html;
  document.getElementById('cal-popup').className='cal-popup';
}

function calClick(dateStr) {
  const byDate={};
  allEntries.forEach(e=>{byDate[e.date]=e;});
  const e=byDate[dateStr];
  const popup=document.getElementById('cal-popup');
  if(!e){ popup.className='cal-popup'; return; }
  popup.innerHTML=entryCardHtml(e);
  popup.className='cal-popup show';
}

function moveCal(dir) {
  calMonth+=dir;
  if(calMonth<0){calMonth=11;calYear--;}
  if(calMonth>11){calMonth=0;calYear++;}
  document.getElementById('cal-popup').className='cal-popup';
  renderCal();
}

function setView(v) {
  dashView=v;
  document.getElementById('btn-list').classList.toggle('active',v==='list');
  document.getElementById('btn-cal').classList.toggle('active',v==='cal');
  document.getElementById('dashboard-list').style.display=v==='list'?'':'none';
  document.getElementById('dashboard-cal').style.display=v==='cal'?'':'none';
  if(v==='cal') renderCal();
}

async function loadDashboard() {
  const res = await fetch('/api/log');
  allEntries = await res.json();
  renderList();
  if(dashView==='cal') renderCal();
}
</script>
</body>
</html>"""

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if urlparse(self.path).path == "/api/log":
            self.send_json(load_log())
        else:
            body = HTML.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length))
        path = urlparse(self.path).path

        if path == "/api/analyze":
            try:
                data = analyze(body["passage"])
                self.send_json(data)
            except Exception as e:
                self.send_json({"error": str(e)}, 500)

        elif path == "/api/log":
            entries = load_log()
            entries.append(body)
            save_log(entries)
            schedule_reminders(body)
            self.send_json({"ok": True})

if __name__ == "__main__":
    PORT = 1331
    server = HTTPServer(("", PORT), Handler)
    print("✅ 아침 묵상 OS → http://psalm1331:1331")
    print("   종료: Ctrl+C")
    t = threading.Thread(target=reminder_loop, daemon=True)
    t.start()
    threading.Timer(0.5, lambda: webbrowser.open("http://psalm1331:1331")).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n종료됐어요.")
