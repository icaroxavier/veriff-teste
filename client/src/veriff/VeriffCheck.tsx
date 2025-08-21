import { useRef, useState } from "react";
import { createVeriffFrame, MESSAGES } from "@veriff/incontext-sdk";

export default function VeriffCheck() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);

  const start = async (docType: "ID_CARD" | "PASSPORT") => {
    setLoading(true);
    try {
      const resp = await fetch("/api/veriff/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType })
      });
      const { url } = await resp.json();
      if (!resp.ok || !url) throw new Error("Sessão inválida");

      // Embedded: renderiza dentro do container
      createVeriffFrame({
        url,                                     // URL criada no backend
        embedded: true,                          // modo embedded
        embeddedOptions: { rootElementID: "veriff-container" },
        onEvent: (msg: MESSAGES) => {
          if (msg === MESSAGES.FINISHED || msg === MESSAGES.CANCELED) {
            console.log("Fluxo finalizado:", msg);
          }
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => start("ID_CARD")} disabled={loading}>RG</button>
      <button onClick={() => start("PASSPORT")} disabled={loading}>Passaporte</button>
      <div id="veriff-container" ref={containerRef} style={{ width: 640, height: 680, border: "1px solid #ccc" }}/>
    </>
  );
}
