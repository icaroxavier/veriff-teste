// webhooks.ts
import { Router } from "express";
import crypto from "crypto";
import { saveDecision } from "./storage";

export const webhookRouter = Router();

function verifyHmac(rawBody: Buffer, signatureHeader?: string) {
  const secret = process.env.VERIFF_HMAC_SECRET;
  if (!secret) return true;                // em dev, pode não validar
  if (!signatureHeader) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected.length !== signatureHeader.length) return false; // ✅ impede throw
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}

webhookRouter.post("/decision", (req: any, res) => {
  try {
    const raw: Buffer = req.body; // vem como Buffer (por causa do express.raw no server.ts)
    const sig = req.get("x-hmac-signature") || req.get("X-HMAC-SIGNATURE");
    if (!verifyHmac(raw, sig)) return res.status(401).json({ error: "Assinatura HMAC inválida" });

    const body = JSON.parse(raw.toString("utf8"));
    const v = body?.verification ?? {};
    const sessionId: string = v?.id || v?.sessionId;
    if (!sessionId) return res.status(400).json({ error: "sessionId não encontrado no payload" });

    saveDecision({
      sessionId,
      decision: v?.decision,
      docType: v?.document?.type,
      docCountry: v?.document?.country,
      docNumber: v?.document?.number ?? null,
      createdAt: new Date().toISOString(),
      raw: body
    });

    return res.sendStatus(200);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Falha no processamento do webhook" });
  }
});
