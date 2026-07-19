// 흔적 OS — 텔레그램 캡처 파이프 (Vercel Serverless Function)
// ─────────────────────────────────────────────────────────────
// 역할: 텔레그램에 던진 "한 줄"을, 내 개인(비공개) 데이터 저장소의 inbox.md 에
//       그대로 append 하고, "담았어요 ✅" 라고 답장한다.
// 분류는 하지 않는다 — 분류·복원은 흔적 OS '두뇌'(skill/SKILL.md)가 담당.
// 여기는 30초 캡처를 위한 '튼튼한 파이프'만.
//
// 필요한 환경변수(Vercel 프로젝트 Settings → Environment Variables):
//   TELEGRAM_TOKEN   : BotFather가 준 봇 토큰
//   GITHUB_TOKEN     : 내 데이터 repo에 Contents(read/write) 권한 있는 fine-grained PAT
//   DATA_REPO        : "myid/heunjeok-os-data" 형태 (내 비공개 저장소)
//   INBOX_PATH       : (선택) 기본 "inbox.md"
//   ALLOWED_CHAT_ID  : (선택) 내 텔레그램 chat id만 허용 (봇 오남용 방지)
//   WEBHOOK_SECRET   : (선택) 텔레그램 secret_token 과 대조해 위조 요청 차단

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GITHUB_TOKEN   = process.env.GITHUB_TOKEN;
const DATA_REPO      = process.env.DATA_REPO;
const INBOX_PATH     = process.env.INBOX_PATH || "inbox.md";
const ALLOWED_CHAT_ID = process.env.ALLOWED_CHAT_ID;
const WEBHOOK_SECRET  = process.env.WEBHOOK_SECRET;

export default async function handler(req, res) {
  // GET 등은 헬스체크로 통과
  if (req.method !== "POST") return res.status(200).send("흔적 OS 캡처봇 살아있음 🫧");

  // (선택) 텔레그램이 보낸 secret 헤더 검증
  if (WEBHOOK_SECRET) {
    const got = req.headers["x-telegram-bot-api-secret-token"];
    if (got !== WEBHOOK_SECRET) return res.status(401).send("bad secret");
  }

  try {
    const update = req.body || {};
    const msg = update.message || update.edited_message;
    const text = msg && typeof msg.text === "string" ? msg.text.trim() : "";
    const chatId = msg && msg.chat ? msg.chat.id : null;

    if (!text || !chatId) return res.status(200).send("no text");

    // 내 chat 만 허용 (설정한 경우)
    if (ALLOWED_CHAT_ID && String(chatId) !== String(ALLOWED_CHAT_ID)) {
      return res.status(200).send("not allowed");
    }

    // /start 같은 명령어는 안내만
    if (text.startsWith("/")) {
      await reply(chatId, "🫧 흔적 OS 캡처봇이에요.\n생각·할 일·글감을 그냥 한 줄 보내면 inbox 에 담아둘게요.");
      return res.status(200).send("cmd");
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const line = `- [ ] (${today}) ${flatten(text)}`;
    await appendToInbox(line);
    await reply(chatId, `📥 담았어요 ✅\n${text}`);
    return res.status(200).send("ok");
  } catch (e) {
    console.error("capture error:", e);
    // 200 으로 응답해 텔레그램의 무한 재시도를 막는다 (실패는 로그로만)
    return res.status(200).send("err");
  }
}

// 내 데이터 repo 의 inbox.md 를 읽어 한 줄 덧붙이고 다시 커밋한다.
async function appendToInbox(line) {
  const url = `https://api.github.com/repos/${DATA_REPO}/contents/${encodeURIComponent(INBOX_PATH)}`;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "heunjeok-os-capture",
  };

  let sha;
  let content = "# 📥 인박스 (던지는 곳)\n\n> 텔레그램에서 자동으로 들어옴. \"인박스 정리해줘\"로 두뇌가 역할별로 옮긴다.\n";

  const getRes = await fetch(url, { headers });
  if (getRes.status === 200) {
    const data = await getRes.json();
    sha = data.sha;
    content = Buffer.from(data.content, "base64").toString("utf8");
  } else if (getRes.status !== 404) {
    throw new Error(`GitHub GET ${getRes.status}: ${await getRes.text()}`);
  }

  const newContent = content.replace(/\s*$/, "") + "\n" + line + "\n";

  const putRes = await fetch(url, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `capture: ${flatten(line).slice(0, 64)}`,
      content: Buffer.from(newContent, "utf8").toString("base64"),
      ...(sha ? { sha } : {}), // sha 없으면 새 파일 생성
    }),
  });
  if (!putRes.ok) {
    throw new Error(`GitHub PUT ${putRes.status}: ${await putRes.text()}`);
  }
}

async function reply(chatId, text) {
  if (!TELEGRAM_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// 줄바꿈 제거해 한 줄로 (markdown 목록 깨짐 방지)
function flatten(t) {
  return String(t).replace(/\r?\n+/g, " ").trim();
}
