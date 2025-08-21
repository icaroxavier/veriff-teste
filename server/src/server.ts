import "dotenv/config";
import express from "express";
import cors from "cors";
import { veriffRouter } from "./veriff.routes";
import { webhookRouter } from "./webhooks";
import { getDecision } from "./storage";

const app = express();
app.use(cors());

// 1) Webhook com RAW body (antes do express.json)
app.use("/api/veriff/webhooks", express.raw({ type: "*/*" }), webhookRouter);

// 2) Demais rotas com JSON
app.use(express.json());
app.use("/api/veriff", veriffRouter);

// (opcional) consulta para o front fazer polling
app.get("/api/veriff/decision/:sessionId", (req, res) => {
  const rec = getDecision(req.params.sessionId);
  if (!rec) return res.status(404).json({ found: false });
  return res.json({ found: true, ...rec });
});

app.get("/health", (_req, res) => res.send("OK"));
app.listen(Number(process.env.PORT || 4000), () => console.log("API ON"));
