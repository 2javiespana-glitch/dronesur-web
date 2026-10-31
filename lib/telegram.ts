// Aviso por Telegram (por ejemplo, cuando llega una reseña nueva pendiente de aprobar).
// Necesita las variables TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en Vercel.
// Si faltan o Telegram falla, no pasa nada: nunca debe impedir guardar lo que se estaba haciendo.
export async function notifyTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(4000),
    })
  } catch {
    // Se ignora a propósito.
  }
}
