import { Router } from "express";
import crypto from "crypto";
import { saveDecision } from "./storage";

export const webhookRouter = Router();

/**
 * Para validar HMAC, precisamos do "raw body".
 * Em server.ts usamos express.raw() apenas nesta rota.
 */
function verifyHmac(rawBody: Buffer, signatureHeader?: string) {
  const secret = process.env.VERIFF_HMAC_SECRET;
  if (!secret) return true; // se não tiver HMAC configurado, não verifica
  if (!signatureHeader) return false;

  // Veriff costuma enviar HMAC-SHA256 em header (ex.: x-hmac-signature)
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  // Comparação segura
  return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
}

webhookRouter.post("/decision", (req: any, res) => {
  try {
    const raw: Buffer = req.body; // vem como Buffer (express.raw)
    const sig = req.get("x-hmac-signature") || req.get("X-HMAC-SIGNATURE");

    if (!verifyHmac(raw, sig)) {
      return res.status(401).json({ error: "Assinatura HMAC inválida" });
    }

    // Agora podemos parsear:
    const body = JSON.parse(raw.toString("utf8"));

    // Estrutura típica:
    // body.verification.id
    // body.verification.decision
    // body.verification.document.type / number / country
    const v = body?.verification ?? {};
    const sessionId: string = v?.id || v?.sessionId;
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId não encontrado no payload" });
    }

    const record = {
      sessionId,
      decision: v?.decision,
      docType: v?.document?.type,
      docCountry: v?.document?.country,
      docNumber: v?.document?.number ?? null,
      createdAt: new Date().toISOString(),
      raw: body
    };

    // Salva (em memória aqui; troque por DB no seu ambiente)
    saveDecision(record);

    // ok para o Veriff
    return res.sendStatus(200);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Falha no processamento do webhook" });
  }
});
