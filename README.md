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

> Precisa de um *checklist* com headers do webhook, verificação da assinatura HMAC e um comando `curl` para testar localmente o endpoint? Posso incluir no projeto, se desejar.
