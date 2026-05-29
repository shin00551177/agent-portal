const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_ASO_CHANNEL = process.env.SLACK_ASO_CHANNEL ?? "C099MB6KC21";

export async function sendSlack(text: string, channel = SLACK_ASO_CHANNEL): Promise<boolean> {
  if (!SLACK_BOT_TOKEN) return false;
  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
      body: JSON.stringify({ channel, text }),
    });
    const json = await res.json() as { ok: boolean };
    return json.ok === true;
  } catch {
    return false;
  }
}

export async function sendSlackError(opts: {
  step: "sync" | "analyze" | "report";
  appId: string;
  appName?: string;
  error: unknown;
}): Promise<void> {
  const label = opts.appName ? `${opts.appName} (${opts.appId})` : opts.appId;
  const message = opts.error instanceof Error ? opts.error.message : String(opts.error);
  const text = [
    `🚨 *ASO Agent エラー*`,
    `*アプリ*: ${label}`,
    `*処理*: ${opts.step}`,
    `*エラー*: ${message.slice(0, 200)}`,
    `_詳細: https://agent-portal-production-ba67.up.railway.app/aso/${opts.appId}_`,
  ].join("\n");
  await sendSlack(text);
}

export async function sendSlackHalt(opts: {
  appId: string;
  appName?: string;
  consecutiveErrors: number;
  maxErrors: number;
}): Promise<void> {
  const label = opts.appName ? `${opts.appName} (${opts.appId})` : opts.appId;
  const text = [
    `🛑 *ASO Agent 自動停止*`,
    `*アプリ*: ${label}`,
    `連続エラーが ${opts.consecutiveErrors}/${opts.maxErrors} 回に達したため Agent を停止しました。`,
    `設定ページから手動で再起動してください。`,
    `_設定: https://agent-portal-production-ba67.up.railway.app/aso/${opts.appId}/settings_`,
  ].join("\n");
  await sendSlack(text);
}
