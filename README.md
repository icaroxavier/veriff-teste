# Integração Veriff — Setup de Desenvolvimento (Node/Express + React/Vite)

## 1) Setup & execução

### Server (Node/Express)

Crie um arquivo `.env` na raiz da pasta **server**, copiando a estrutura do `.env.example` e substituindo os valores:

```env
VERIFF_API_KEY=COLOQUE_AQUI_SUA_STATION_API_KEY
VERIFF_HMAC_SECRET=COLOQUE_AQUI_SUA_HMAC_SECRET   # opcional, recomendado
PORT=4000
```

No diretório **server**, execute:

```bash
npm i
npm run dev
# Servidor disponível em http://localhost:4000
```

---

### Client (React + Vite)

Garanta que o `client/vite.config.ts` tenha proxy para o backend:

```ts
// vite.config.ts
export default {
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } }
  }
}
```

No diretório **client**, execute:

```bash
npm i
npm run dev
# App disponível em http://localhost:5173
```

---

## 2) Expor endereço público (DEV)

### Usando ngrok

**Windows (Chocolatey):**
```bash
choco install ngrok
ngrok config add-authtoken SEU_TOKEN
ngrok http 4000
```

**macOS/Homebrew (opcional):**
```bash
brew install ngrok/ngrok/ngrok
ngrok config add-authtoken SEU_TOKEN
ngrok http 4000
```

Copie a URL pública que aparecer (ex.: `https://<id>.ngrok-free.app`).  
Essa URL deve apontar para o seu server local na porta **4000**.

---

## 3) Configurar o webhook no Veriff

1. Acesse o **Veriff Customer Portal** com a sua conta.  
2. Vá em **Developers → Webhooks** (ou *“Webhook decisions URL”*, dependendo do layout).  
3. Coloque a URL pública do seu endpoint de webhook (formato):

```
https://<id>.ngrok-free.app/api/veriff/webhooks/decision
```

4. **Salve.**

### HMAC
- Se o seu backend valida HMAC (recomendado), mantenha `VERIFF_HMAC_SECRET` no `.env`.
- O Veriff enviará a assinatura no header `X-HMAC-SIGNATURE`; o seu endpoint deve validar o **raw body** antes de processar.
- Se ainda não ativou a validação no código, deixe para depois — mas já configure a secret no `.env` para produção.

---

## 4) Fluxo de teste rápido

1. Suba o **server** (`npm run dev` em `server`) e o **client** (`npm run dev` em `client`).  
2. Exponha o server com `ngrok http 4000` e configure a URL no portal (passo acima).  
3. No client, inicie uma verificação (ex.: botão **RG** ou **Passaporte**).  
4. Ao finalizar o fluxo do Veriff, ele chamará o seu webhook (`/api/veriff/webhooks/decision`).  
5. Verifique os logs do server: o payload da **Decision** deve chegar; o backend grava o número (quando extraído).  
6. *(Opcional)* Se o client fizer polling (ex.: `GET /api/veriff/decision/:sessionId`), a UI deve exibir o número assim que o backend o tiver salvo.

---

## 5) Dicas rápidas

- **Portas:** Vite no `5173`; backend no `4000`. O proxy do Vite evita CORS durante dev.  
- **HTTPS em produção:** use domínio fixo (sem túnel), **TLS**, **HMAC** e, se possível, *allowlist* de IPs.  
- **PII:** trate o `document.number` com cuidado (mascarar/cifrar, acesso restrito).  
- **Webhooks:** responda **200 OK** rapidamente; trabalho pesado deve ser assíncrono.

---

## 6) Checklist — Webhook, Headers, HMAC e teste com `curl`

Este checklist ajuda a **validar o webhook de decisão do Veriff** end-to-end.

### A) Headers esperados no webhook (entrada do Veriff)
- `Content-Type: application/json` *(normalmente)*  
- `X-HMAC-SIGNATURE: <hex>` *(se HMAC estiver ativo no portal)*

> A sua API **deve ler o corpo bruto (raw)** para validar a assinatura antes de parsear JSON.

### B) Validação HMAC (passo a passo)
1. Defina `VERIFF_HMAC_SECRET` no `.env` do **server**.  
2. Na rota do webhook, use `express.raw({ type: "*/*" })` para capturar o **raw body**.  
3. Calcule `HMAC-SHA256` do **raw body** usando a secret e gere o **hex**.  
4. Compare com o header `X-HMAC-SIGNATURE` usando `crypto.timingSafeEqual`.  
5. Se ok, **retorne 200 rapidamente** e processe o payload (persistência/filas) de forma assíncrona.

**Exemplo mínimo (trecho):**
```ts
import crypto from "crypto";
app.post("/api/veriff/webhooks/decision", express.raw({ type: "*/*" }), (req, res) => {
  const secret = process.env.VERIFF_HMAC_SECRET;
  const sig = req.get("x-hmac-signature") || req.get("X-HMAC-SIGNATURE");
  if (secret) {
    if (!sig) return res.status(401).json({ error: "Missing HMAC signature" });
    const expected = crypto.createHmac("sha256", secret).update(req.body as Buffer).digest("hex");
    const ok = expected.length === sig.length &&
               crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    if (!ok) return res.status(401).json({ error: "Invalid HMAC signature" });
  }
  const body = JSON.parse((req.body as Buffer).toString("utf8"));
  // ...processa body.verification.{id,decision,document}
  res.sendStatus(200);
});
```

### C) Teste local com `curl` (simulando o Veriff)

#### 1) Crie um payload de exemplo (`payload.json`):
```json
{
  "verification": {
    "id": "c2a1c8b8-TEST-1234",
    "decision": "approved",
    "document": { "type": "ID_CARD", "country": "BR", "number": "123456789" }
  }
}
```

#### 2) Gere a assinatura HMAC do **raw body**

**Opção Node (multiplataforma):**
```bash
# Ajuste a secret conforme seu .env
export VERIFF_HMAC_SECRET="minha_secret_de_teste"

SIG=$(node -e "const c=require('crypto');const fs=require('fs');const key=process.env.VERIFF_HMAC_SECRET;const b=fs.readFileSync('payload.json');process.stdout.write(c.createHmac('sha256',key).update(b).digest('hex'))")
echo $SIG
```

**Opção OpenSSL (Linux/macOS):**
```bash
export VERIFF_HMAC_SECRET="minha_secret_de_teste"
SIG=$(openssl dgst -sha256 -hmac "$VERIFF_HMAC_SECRET" -hex payload.json | awk '{print $2}')
echo $SIG
```

#### 3) Envie o webhook para sua API local **usando o corpo bruto**:
```bash
curl -i -X POST "http://localhost:4000/api/veriff/webhooks/decision"   -H "Content-Type: application/json"   -H "X-HMAC-SIGNATURE: $SIG"   --data-binary @payload.json
```

> Use **`--data-binary`** (e não `-d`) para preservar o corpo sem alterações de whitespace/newline.  
> A rota precisa estar registrada com `express.raw()` para receber um **Buffer**.

### D) Erros comuns e como evitar
- **Usar `express.json()` no webhook** → quebra a validação HMAC, pois altera o corpo.  
  ✅ Solução: use `express.raw({ type: "*/*" })` **somente** nessa rota.
- **Assinatura diferente do esperado** → calculada sobre um JSON diferente (whitespace, ordem de chaves, encoding).  
  ✅ Solução: assine **exatamente** o arquivo enviado em `--data-binary`.
- **Comparação insegura** → `===` pode abrir margem a ataques de *timing*.  
  ✅ Solução: use `crypto.timingSafeEqual`.
- **Responder tardiamente** → o Veriff pode re-tentar ou considerar falha.  
  ✅ Solução: responda `200 OK` rápido e faça o trabalho pesado em *background*.

### E) Referência rápida de endpoints do backend (dev)

| Método | Rota                                   | Descrição                                           |
|-------:|----------------------------------------|-----------------------------------------------------|
|  POST  | `/api/veriff/session`                  | Cria sessão no Station API (headers: `X-AUTH-CLIENT`) |
|  POST  | `/api/veriff/webhooks/decision`        | Recebe decisão do Veriff (valida HMAC + salva)      |
|   GET  | `/health`                              | Healthcheck simples                                 |

> No client, você pode iniciar o fluxo chamando `POST /api/veriff/session` (body: `{ "docType": "PASSPORT" | "ID_CARD" }`) e, após finalizar, obter o resultado via webhook e/ou polling.
