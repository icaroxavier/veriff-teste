// server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

// Use RAW body ONLY for the webhook route (needed to verify HMAC)
app.post("/api/veriff/webhooks/decision", express.raw({ type: "*/*" }), (req, res) => {
  try {
    const hmacSecret = process.env.VERIFF_HMAC_SECRET; // set this in your env
    const sigHeader = req.get("x-hmac-signature") || req.get("X-HMAC-SIGNATURE");

    if (hmacSecret) {
      if (!sigHeader) return res.status(401).json({ error: "Missing HMAC signature" });
      const expected = crypto.createHmac("sha256", hmacSecret).update(req.body as Buffer).digest("hex");
      const ok =
        expected.length === sigHeader.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigHeader));
      if (!ok) return res.status(401).json({ error: "Invalid HMAC signature" });
    }

    // Now it's safe to parse the body
    const body = JSON.parse((req.body as Buffer).toString("utf8"));

    // Typical structure includes verification.id, decision, and document fields
    const v = body?.verification ?? {};
    const sessionId: string | undefined = v?.id;             // your tracking key
    const docNumber: string | null = v?.document?.number ?? null;
    const docType: string | undefined = v?.document?.type;   // "PASSPORT" | "ID_CARD"
    const decision: string | undefined = v?.decision;        // "approved" | "declined" | ...

    // TODO: persist securely (mask/encrypt PII). This is just an example:
    // await saveDecisionToDB({ sessionId, decision, docType, docNumber, raw: body });

    // Respond fast; do heavy work async if needed.
    return res.sendStatus(200);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

// (Outras rotas: criar sessão, healthcheck, etc.)
app.get("/health", (_req, res) => res.send("OK"));

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API listening at http://localhost:${port}`));
