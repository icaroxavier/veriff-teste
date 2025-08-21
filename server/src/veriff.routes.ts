import { Router } from "express";
import fetch from "node-fetch";

export const veriffRouter = Router();

type CreateSessionBody = {
  docType: "PASSPORT" | "ID_CARD";
};

type VeriffSessionResponse = {
  verification?: {
    id?: string;
    url?: string;
    // adicione aqui outros campos se quiser
  };
  // alguns erros da API retornam outras chaves
  error?: string;
  status?: string;
};

veriffRouter.post("/session", async (req, res) => {
  try {
    const apiKey = process.env.VERIFF_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "VERIFF_API_KEY não configurada" });
    }

    const { docType } = (req.body || {}) as CreateSessionBody;
    if (!["PASSPORT", "ID_CARD"].includes(docType as string)) {
      return res.status(400).json({ error: "Tipo de documento inválido" });
    }

    const payload = {
      verification: {
        lang: "pt",
        document: { type: docType, country: "BR" }
      }
    };

    const response = await fetch("https://stationapi.veriff.com/v1/sessions", {
      method: "POST",
      headers: {
        "X-AUTH-CLIENT": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });



    const data = (await response.json()) as VeriffSessionResponse;

    if (!response.ok) {
      // repassa o erro da Veriff
      return res.status(response.status).json(data);
    }

    const sessionId = data.verification?.id ?? null;
    const url = data.verification?.url ?? null;

    if (!sessionId || !url) {
      // resposta inesperada da API (proteção extra)
      return res.status(502).json({
        error: "Resposta inesperada da Veriff (sem id/url de verificação).",
        raw: data
      });
    }

    return res.json({ sessionId, url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao criar sessão";
    console.error(e);
    return res.status(500).json({ error: msg });
  }
});
