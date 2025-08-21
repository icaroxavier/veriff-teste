export type DecisionRecord = {
  sessionId: string;
  decision?: string;            // approved/declined/resubmission_requested/…
  docType?: string;             // PASSPORT | ID_CARD
  docCountry?: string;          // BR
  docNumber?: string | null;    // número extraído (pode ser null se não disponível)
  createdAt: string;            // ISO
  raw?: any;                    // payload bruto (opcional)
};

const decisions = new Map<string, DecisionRecord>();

export function saveDecision(rec: DecisionRecord) {
  decisions.set(rec.sessionId, rec);
}

export function getDecision(sessionId: string) {
  return decisions.get(sessionId);
}
