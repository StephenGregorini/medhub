export type HistoricoEvento = {
  data: Date;
  tipo: string;
  descricao: string;
};

export type ClinicaCase = {
  id: string;
  clinicaNome: string;
  cnpj: string;
  cidade: string;
  uf: string;
  operadora: string;
  statusGeral: "Credenciado" | "Em credenciamento" | "Pausado" | "Cancelado";
  etapaAtual:
    | "Entrada"
    | "Documentacao"
    | "Validacao Operacional"
    | "Contrato"
    | "Finalizacao"
    | "Credenciado";
  dataEntradaEtapa: Date;
  slaDiasEtapa: number;
  pendenciaPrincipal: string;
  pendencias: string[];
  responsavelNome: string | null;
  ultimaAtualizacao: Date;
  especialidades: string[];
  historicoEventos: HistoricoEvento[];
};

const nomesBase = [
  "Clinica Vida",
  "Saude Total",
  "MedPrime",
  "Centro Med",
  "Clinica Alfa",
  "Clinica Beta",
  "Saude Norte",
  "Instituto Viva",
  "Clinica Horizonte",
  "Clinica Bem Estar",
  "Clinica Popular",
  "Clinica Integrar",
  "Clinica Boa Saude",
  "Clinica Nucleo",
  "Clinica Harmonia",
];

const cidades = [
  { cidade: "Brasilia", uf: "DF" },
  { cidade: "Goiania", uf: "GO" },
  { cidade: "Sao Paulo", uf: "SP" },
  { cidade: "Rio de Janeiro", uf: "RJ" },
  { cidade: "Campinas", uf: "SP" },
  { cidade: "Niteroi", uf: "RJ" },
  { cidade: "Anapolis", uf: "GO" },
  { cidade: "Taguatinga", uf: "DF" },
];

const especialidades = [
  "Odonto",
  "Cardiologia",
  "Ortopedia",
  "Pediatria",
  "Dermatologia",
  "Clinica Geral",
  "Ginecologia",
];

const pendenciasBase = [
  "Doc pendente",
  "Minuta em revisao",
  "Assinatura pendente",
  "Dados cadastrais incompletos",
  "Pendencia de licenca",
];

const responsaveis = [
  "Mariana Costa",
  "Joao Lima",
  "Paula Souza",
  "Rafael Alves",
  "Carla Nunes",
  "Rodrigo Silva",
];

const etapas = [
  "Entrada",
  "Documentacao",
  "Validacao Operacional",
  "Contrato",
  "Finalizacao",
] as const;

const slaPorEtapa: Record<(typeof etapas)[number], number> = {
  Entrada: 2,
  Documentacao: 7,
  "Validacao Operacional": 5,
  Contrato: 10,
  Finalizacao: 3,
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomPick<T>(arr: T[], rand: () => number) {
  return arr[Math.floor(rand() * arr.length)];
}

function randomCnpj(rand: () => number) {
  const digits = Array.from({ length: 14 }, () => Math.floor(rand() * 10));
  const raw = digits.join("");
  return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12)}`;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export function generateMockClinicas(): ClinicaCase[] {
  const rand = mulberry32(42);
  const total = 110;
  const credenciadas = 36;
  const emCredenciamento = total - credenciadas;

  const cases: ClinicaCase[] = [];

  for (let i = 0; i < total; i += 1) {
    const nomeBase = randomPick(nomesBase, rand);
    const city = randomPick(cidades, rand);
    const isCredenciada = i < credenciadas;
    const etapaAtual = isCredenciada
      ? "Credenciado"
      : randomPick([...etapas], rand);
    const slaDiasEtapa = etapaAtual === "Credenciado" ? 0 : slaPorEtapa[etapaAtual];

    cases.push({
      id: `case-${i + 1}`,
      clinicaNome: `${nomeBase} ${i + 1}`,
      cnpj: randomCnpj(rand),
      cidade: city.cidade,
      uf: city.uf,
      operadora: "GEAP",
      statusGeral: isCredenciada ? "Credenciado" : "Em credenciamento",
      etapaAtual,
      dataEntradaEtapa: daysAgo(1),
      slaDiasEtapa,
      pendenciaPrincipal: randomPick(pendenciasBase, rand),
      pendencias: [randomPick(pendenciasBase, rand)],
      responsavelNome: randomPick(responsaveis, rand),
      ultimaAtualizacao: daysAgo(Math.floor(rand() * 10)),
      especialidades: [randomPick(especialidades, rand)],
      historicoEventos: [
        {
          data: daysAgo(Math.floor(rand() * 20)),
          tipo: "convite",
          descricao: "Convite enviado",
        },
        {
          data: daysAgo(Math.floor(rand() * 15)),
          tipo: "documentacao",
          descricao: "Documentacao solicitada",
        },
        {
          data: daysAgo(Math.floor(rand() * 8)),
          tipo: "validacao",
          descricao: "Validacao em andamento",
        },
      ],
    });
  }

  const emCred = cases.slice(credenciadas);

  const slaEstouradoCount = 15;
  const slaRiscoCount = 20;
  for (let i = 0; i < emCred.length; i += 1) {
    const etapa = emCred[i].etapaAtual as (typeof etapas)[number];
    const sla = slaPorEtapa[etapa];
    let agingDias = Math.max(1, Math.floor(rand() * sla));

    if (i < slaEstouradoCount) {
      agingDias = sla + 2 + Math.floor(rand() * 5);
    } else if (i < slaEstouradoCount + slaRiscoCount) {
      agingDias = Math.floor(sla * 0.75) + Math.floor(rand() * 2);
    }

    emCred[i].dataEntradaEtapa = daysAgo(agingDias);
    emCred[i].slaDiasEtapa = sla;
  }

  const pendenciaDocCount = 25;
  for (let i = 0; i < pendenciaDocCount; i += 1) {
    emCred[i].pendenciaPrincipal = "Doc pendente";
    emCred[i].pendencias = ["Doc pendente", "CNES pendente"];
  }

  const semResponsavelCount = 10;
  for (let i = 0; i < semResponsavelCount; i += 1) {
    emCred[i].responsavelNome = null;
  }

  const pausedCount = 6;
  for (let i = 0; i < pausedCount; i += 1) {
    const idx = credenciadas + i;
    cases[idx].statusGeral = "Pausado";
  }

  const canceladoCount = 4;
  for (let i = 0; i < canceladoCount; i += 1) {
    const idx = credenciadas + pausedCount + i;
    cases[idx].statusGeral = "Cancelado";
  }

  return cases;
}

export const mockClinicas = generateMockClinicas();
export const SLA_DIAS_PADRAO = slaPorEtapa;
export const ETAPAS = etapas;
