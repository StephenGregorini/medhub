export type SlaStatus = "No prazo" | "Em risco" | "Estourado";

export function calcAgingDias(dataEntradaEtapa: Date) {
  const now = new Date();
  const diffMs = now.getTime() - dataEntradaEtapa.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function calcSlaStatus(agingDias: number, slaDiasEtapa: number): SlaStatus {
  if (slaDiasEtapa === 0) return "No prazo";
  if (agingDias > slaDiasEtapa) return "Estourado";
  if (agingDias >= Math.floor(slaDiasEtapa * 0.7)) return "Em risco";
  return "No prazo";
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
