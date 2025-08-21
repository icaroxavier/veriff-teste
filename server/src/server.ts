// server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import { veriffRouter } from "./veriff.routes";      // ✅ usa as rotas de sessão
import { webhookRouter } from "./webhooks";           // ✅ usa o router do webhook
import { getDecision } from "./storage";              // ✅ se for expor o GET de consulta

const app = express();
app.use(cors());

// 1) Webhook (usa raw body) — tem que vir ANTES do express.json()
app.use("/api/veriff/webhooks", express.raw({ type: "*/*" }), webhookRouter);

// 2) Demais rotas com JSON
app.use(express.json());
app.use("/api/veriff", veriffRouter);

// (Opcional) Endpoint para o client consultar a decisão/número (polling)
app.get("/api/veriff/decision/:sessionId", (req, res) => {
  const rec = getDecision(req.params.sessionId);
  if (!rec) return res.status(404).json({ found: false });
  return res.json({ found: true, ...rec });
});

// Healthcheck
app.get("/health", (_req, res) => res.send("OK"));

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API listening at http://localhost:${port}`));
