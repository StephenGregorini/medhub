import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  List,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  WarningOutlined,
  ExportOutlined,
  EyeOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { ETAPAS, mockClinicas, type ClinicaCase } from "../data/mockClinicas";
import {
  calcAgingDias,
  calcSlaStatus,
  formatDate,
  formatDateTime,
  type SlaStatus,
} from "../utils/sla";

const { Title, Text } = Typography;

const STATUS_GERAL_OPTIONS = [
  "Todos",
  "Em credenciamento",
  "Credenciado",
  "Pausado",
  "Cancelado",
] as const;

const ETAPA_OPTIONS = ["Todos", ...ETAPAS] as const;

const REGIOES = ["Todos", "DF", "GO", "SP", "RJ"] as const;
const ESPECIALIDADES = [
  "Todos",
  "Odonto",
  "Cardiologia",
  "Ortopedia",
  "Pediatria",
  "Dermatologia",
  "Clinica Geral",
] as const;

const PERIODOS = ["Ultimos 7 dias", "Ultimos 30 dias", "Ultimos 90 dias"] as const;

type FiltersState = {
  search: string;
  operadora: string;
  statusGeral: (typeof STATUS_GERAL_OPTIONS)[number];
  etapaAtual: (typeof ETAPA_OPTIONS)[number];
  regiao: (typeof REGIOES)[number];
  especialidade: (typeof ESPECIALIDADES)[number];
  periodo: (typeof PERIODOS)[number];
  somenteSlaRisco: boolean;
  somentePendenciaDoc: boolean;
  somenteAgingAlto: boolean;
};

type CaseComputed = ClinicaCase & {
  agingDias: number;
  diasRestantes: number;
  statusSla: SlaStatus;
};

type FilterPreset = {
  name: string;
  filters: FiltersState;
};

const initialFilters: FiltersState = {
  search: "",
  operadora: "GEAP",
  statusGeral: "Todos",
  etapaAtual: "Todos",
  regiao: "Todos",
  especialidade: "Todos",
  periodo: "Ultimos 30 dias",
  somenteSlaRisco: false,
  somentePendenciaDoc: false,
  somenteAgingAlto: false,
};

function slaTagColor(status: SlaStatus) {
  if (status === "Estourado") return "error";
  if (status === "Em risco") return "warning";
  return "success";
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 60;
      const y = 20 - ((value - min) / range) * 20;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width="60" height="24" viewBox="0 0 60 24">
      <polyline
        fill="none"
        stroke="#1677ff"
        strokeWidth="2"
        points={points}
      />
    </svg>
  );
}

const SPARKLINE_DATA = {
  total: [90, 96, 101, 105, 110],
  credenciadas: [20, 24, 28, 32, 36],
  emCredenciamento: [70, 72, 73, 74, 74],
  slaRisco: [12, 14, 17, 19, 20],
  slaEstourado: [8, 10, 12, 14, 15],
  cicloMedio: [9, 10, 11, 10, 9],
  conversao: [22, 25, 29, 31, 33],
  retrabalho: [14, 15, 16, 15, 14],
};

export default function CentralGestaoCredenciamento() {
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseComputed | null>(null);
  const [queueQuickFilter, setQueueQuickFilter] = useState<
    "all" | "estourado" | "risco" | "sem-responsavel"
  >("all");

  useEffect(() => {
    const stored = localStorage.getItem("medhub.crm.presets");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as FilterPreset[];
        setPresets(parsed);
      } catch {
        setPresets([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("medhub.crm.presets", JSON.stringify(presets));
  }, [presets]);

  const casesComputed = useMemo<CaseComputed[]>(() => {
    // TODO: substituir mockClinicas por API/hook de credenciamento
    return mockClinicas.map((item) => {
      const agingDias = calcAgingDias(item.dataEntradaEtapa);
      const statusSla = calcSlaStatus(agingDias, item.slaDiasEtapa);
      const diasRestantes = item.slaDiasEtapa - agingDias;
      return { ...item, agingDias, statusSla, diasRestantes };
    });
  }, []);

  const filteredCases = useMemo(() => {
    const now = new Date();
    const periodDays = filters.periodo.includes("7")
      ? 7
      : filters.periodo.includes("30")
        ? 30
        : 90;

    return casesComputed.filter((item) => {
      if (filters.operadora !== "GEAP" && item.operadora !== filters.operadora) {
        return false;
      }
      if (filters.statusGeral !== "Todos" && item.statusGeral !== filters.statusGeral) {
        return false;
      }
      if (filters.etapaAtual !== "Todos" && item.etapaAtual !== filters.etapaAtual) {
        return false;
      }
      if (filters.regiao !== "Todos" && item.uf !== filters.regiao) {
        return false;
      }
      if (
        filters.especialidade !== "Todos" &&
        !item.especialidades.includes(filters.especialidade)
      ) {
        return false;
      }
      if (filters.search) {
        const term = filters.search.toLowerCase();
        if (
          !item.clinicaNome.toLowerCase().includes(term) &&
          !item.cnpj.toLowerCase().includes(term) &&
          !item.cidade.toLowerCase().includes(term)
        ) {
          return false;
        }
      }
      const diffMs = now.getTime() - item.ultimaAtualizacao.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > periodDays) {
        return false;
      }
      if (filters.somenteSlaRisco && item.statusSla === "No prazo") {
        return false;
      }
      if (filters.somentePendenciaDoc && item.pendenciaPrincipal !== "Doc pendente") {
        return false;
      }
      if (filters.somenteAgingAlto && item.agingDias <= 15) {
        return false;
      }
      return true;
    });
  }, [casesComputed, filters]);

  const kpis = useMemo(() => {
    const total = filteredCases.length;
    const credenciadas = filteredCases.filter((c) => c.statusGeral === "Credenciado").length;
    const emCredenciamento = filteredCases.filter(
      (c) => c.statusGeral === "Em credenciamento"
    ).length;
    const slaRisco = filteredCases.filter((c) => c.statusSla === "Em risco").length;
    const slaEstourado = filteredCases.filter((c) => c.statusSla === "Estourado").length;
    const safeTotal = Math.max(1, total);
    const cicloMedio = Math.round(
      filteredCases.reduce((acc, item) => acc + item.agingDias, 0) / safeTotal
    );
    const taxaConversao = Math.round((credenciadas / safeTotal) * 100);
    const retrabalhoCount = filteredCases.filter((c) => c.pendencias.length > 1).length;
    const retrabalhoPercent = Math.round((retrabalhoCount / safeTotal) * 100);

    return {
      total,
      credenciadas,
      emCredenciamento,
      slaRisco,
      slaEstourado,
      cicloMedio,
      taxaConversao,
      retrabalhoCount,
      retrabalhoPercent,
    };
  }, [filteredCases]);

  const backlogPorEtapa = useMemo(() => {
    const backlog = ETAPAS.map((etapa) => {
      const total = filteredCases.filter(
        (item) => item.etapaAtual === etapa && item.statusGeral === "Em credenciamento"
      ).length;
      return { etapa, total };
    });
    const max = Math.max(...backlog.map((b) => b.total), 1);
    return backlog.map((b) => ({
      ...b,
      percent: Math.round((b.total / max) * 100),
      destaque: b.total === max,
    }));
  }, [filteredCases]);

  const slaDistribuicao = useMemo(() => {
    const inProgress = filteredCases.filter((c) => c.statusGeral === "Em credenciamento");
    const total = Math.max(1, inProgress.length);
    const noPrazo = inProgress.filter((c) => c.statusSla === "No prazo").length;
    const emRisco = inProgress.filter((c) => c.statusSla === "Em risco").length;
    const estourado = inProgress.filter((c) => c.statusSla === "Estourado").length;
    return {
      total,
      noPrazo,
      emRisco,
      estourado,
    };
  }, [filteredCases]);

  const agingBuckets = useMemo(() => {
    const buckets = [
      { label: "0-7", min: 0, max: 7 },
      { label: "8-15", min: 8, max: 15 },
      { label: "16-30", min: 16, max: 30 },
      { label: "+30", min: 31, max: 999 },
    ];
    const total = Math.max(1, filteredCases.length);
    return buckets.map((bucket) => {
      const count = filteredCases.filter(
        (c) => c.agingDias >= bucket.min && c.agingDias <= bucket.max
      ).length;
      return {
        ...bucket,
        count,
        percent: Math.round((count / total) * 100),
      };
    });
  }, [filteredCases]);

  const rankingGargalos = useMemo(() => {
    return [...filteredCases]
      .filter((c) => c.statusGeral === "Em credenciamento")
      .sort((a, b) => b.agingDias - a.agingDias)
      .slice(0, 5);
  }, [filteredCases]);

  const kanbanColumns = useMemo(() => {
    return ETAPAS.map((etapa) => ({
      etapa,
      items: filteredCases.filter(
        (c) => c.etapaAtual === etapa && c.statusGeral === "Em credenciamento"
      ),
    }));
  }, [filteredCases]);

  const workQueue = useMemo(() => {
    const priorityScore = (item: CaseComputed) => {
      const slaWeight = item.statusSla === "Estourado" ? 3 : item.statusSla === "Em risco" ? 2 : 1;
      return slaWeight * 1000 + item.agingDias;
    };

    let data = filteredCases.filter((c) => c.statusGeral === "Em credenciamento");

    if (queueQuickFilter === "estourado") {
      data = data.filter((c) => c.statusSla === "Estourado");
    }
    if (queueQuickFilter === "risco") {
      data = data.filter((c) => c.statusSla === "Em risco");
    }
    if (queueQuickFilter === "sem-responsavel") {
      data = data.filter((c) => !c.responsavelNome);
    }

    return [...data].sort((a, b) => priorityScore(b) - priorityScore(a));
  }, [filteredCases, queueQuickFilter]);

  const alertas = useMemo(() => {
    const items = filteredCases
      .filter((c) => c.statusGeral === "Em credenciamento")
      .flatMap((c) => {
        const alerts = [];
        if (c.pendenciaPrincipal === "Doc pendente") {
          alerts.push({
            id: `${c.id}-doc`,
            texto: `Documento pendente ha ${c.agingDias} dias`,
            severidade: "warning" as const,
            caso: c,
          });
        }
        if (c.statusSla === "Em risco") {
          alerts.push({
            id: `${c.id}-risco`,
            texto: `SLA estoura em ${Math.max(1, c.diasRestantes)} dias`,
            severidade: "warning" as const,
            caso: c,
          });
        }
        if (c.statusSla === "Estourado") {
          alerts.push({
            id: `${c.id}-estourado`,
            texto: `SLA estourado ha ${Math.abs(c.diasRestantes)} dias`,
            severidade: "error" as const,
            caso: c,
          });
        }
        if (c.etapaAtual === "Contrato" && c.agingDias > 10) {
          alerts.push({
            id: `${c.id}-contrato`,
            texto: `Contrato parado ha ${c.agingDias} dias`,
            severidade: "warning" as const,
            caso: c,
          });
        }
        return alerts;
      })
      .slice(0, 10);
    return items;
  }, [filteredCases]);

  const openCase = (item: CaseComputed) => {
    setSelectedCase(item);
    setDrawerOpen(true);
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setSelectedPreset(null);
  };

  const savePreset = () => {
    const name = window.prompt("Nome do preset");
    if (!name) return;
    const next = presets.filter((p) => p.name !== name);
    next.push({ name, filters });
    setPresets(next);
    setSelectedPreset(name);
    message.success("Preset salvo");
  };

  const removePreset = () => {
    if (!selectedPreset) return;
    setPresets(presets.filter((p) => p.name !== selectedPreset));
    setSelectedPreset(null);
    message.success("Preset removido");
  };

  const columns: ColumnsType<CaseComputed> = [
    {
      title: "Clinica",
      dataIndex: "clinicaNome",
      key: "clinica",
      render: (_, record) => (
        <div>
          <div className="font-semibold text-gray-900">{record.clinicaNome}</div>
          <div className="text-sm text-gray-500">{record.cnpj}</div>
        </div>
      ),
    },
    {
      title: "Operadora",
      dataIndex: "operadora",
      key: "operadora",
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: "Etapa",
      dataIndex: "etapaAtual",
      key: "etapa",
    },
    {
      title: "Aging (dias)",
      dataIndex: "agingDias",
      key: "aging",
      sorter: (a, b) => a.agingDias - b.agingDias,
    },
    {
      title: "SLA",
      dataIndex: "statusSla",
      key: "sla",
      render: (value: SlaStatus) => <Tag color={slaTagColor(value)}>{value}</Tag>,
    },
    {
      title: "Pendencia principal",
      dataIndex: "pendenciaPrincipal",
      key: "pendencia",
    },
    {
      title: "Responsavel",
      dataIndex: "responsavelNome",
      key: "responsavel",
      render: (value: string | null) => value ?? <Text type="secondary">Nao atribuido</Text>,
    },
    {
      title: "Ultima atualizacao",
      dataIndex: "ultimaAtualizacao",
      key: "ultima",
      render: (value: Date) => formatDateTime(value),
    },
    {
      title: "Acoes",
      key: "acoes",
      render: (_, record) => (
        <Space wrap>
          <Button size="small" type="primary" onClick={() => openCase(record)}>
            Abrir
          </Button>
          <Button size="small">Atribuir</Button>
          <Button size="small">Adicionar nota</Button>
          <Button size="small">Marcar contato</Button>
          <Button size="small">Enviar lembrete</Button>
        </Space>
      ),
    },
  ];

  return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Central de Gestao de Credenciamento"
          subtitle="Visao consolidada do funil, backlog, SLAs e alertas - Piloto GEAP"
          breadcrumb={["CRM", "Central de Gestao"]}
          actions={
            <>
              <Button type="primary">
                <Link to="/clinicas">Ver Clinicas</Link>
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={() => message.info("Exportacao sera integrada na API")}
              >
                Exportar
              </Button>
            </>
          }
        />

      <Alert
        message="Painel piloto GEAP"
        description="Dados simulados para a visao de funil e fila. Integracao com API em breve."
        type="info"
        showIcon
      />

      <Card>
        <Form layout="vertical">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12} xl={6}>
              <Form.Item label="Busca">
                <Input
                  placeholder="Buscar clinica, CNPJ, cidade..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={4}>
              <Form.Item label="Operadora">
                <Select value={filters.operadora} disabled options={[{ value: "GEAP" }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={5}>
              <Form.Item label="Status geral">
                <Select
                  value={filters.statusGeral}
                  onChange={(value) => setFilters({ ...filters, statusGeral: value })}
                  options={STATUS_GERAL_OPTIONS.map((value) => ({ value }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={5}>
              <Form.Item label="Etapa atual">
                <Select
                  value={filters.etapaAtual}
                  onChange={(value) => setFilters({ ...filters, etapaAtual: value })}
                  options={ETAPA_OPTIONS.map((value) => ({ value }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={4}>
              <Form.Item label="Regiao/UF">
                <Select
                  value={filters.regiao}
                  onChange={(value) => setFilters({ ...filters, regiao: value })}
                  options={REGIOES.map((value) => ({ value }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={4}>
              <Form.Item label="Especialidade">
                <Select
                  value={filters.especialidade}
                  onChange={(value) => setFilters({ ...filters, especialidade: value })}
                  options={ESPECIALIDADES.map((value) => ({ value }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={4}>
              <Form.Item label="Periodo">
                <Select
                  value={filters.periodo}
                  onChange={(value) => setFilters({ ...filters, periodo: value })}
                  options={PERIODOS.map((value) => ({ value }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Filtros rapidos">
                <Space direction="vertical" size={8}>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={filters.somenteSlaRisco}
                      onChange={(checked) =>
                        setFilters({ ...filters, somenteSlaRisco: checked })
                      }
                    />
                    <Text>Somente SLA em risco/estourado</Text>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={filters.somentePendenciaDoc}
                      onChange={(checked) =>
                        setFilters({ ...filters, somentePendenciaDoc: checked })
                      }
                    />
                    <Text>Somente pendencia documental</Text>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={filters.somenteAgingAlto}
                      onChange={(checked) =>
                        setFilters({ ...filters, somenteAgingAlto: checked })
                      }
                    />
                    <Text>Aging &gt; 15 dias</Text>
                  </div>
                </Space>
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={4}>
              <Form.Item label="Preset de filtros">
                <Select
                  placeholder="Selecionar preset"
                  value={selectedPreset ?? undefined}
                  onChange={(value) => {
                    const preset = presets.find((p) => p.name === value);
                    if (preset) {
                      setFilters(preset.filters);
                      setSelectedPreset(preset.name);
                    }
                  }}
                  options={presets.map((preset) => ({ value: preset.name }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={4} className="flex items-end gap-2">
              <Button onClick={resetFilters}>Limpar filtros</Button>
              <Button onClick={savePreset}>Salvar preset</Button>
              <Button danger onClick={removePreset} disabled={!selectedPreset}>
                Remover
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <Title level={4} className="!mb-0">
            KPIs
          </Title>
          <Text type="secondary">Resumo executivo do credenciamento</Text>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card size="small" className="flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <Statistic title="Total de Clinicas" value={kpis.total} />
            <Sparkline values={SPARKLINE_DATA.total} />
          </div>
          <Text type="secondary">MVP: 110</Text>
        </Card>
        <Card size="small" className="flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <Statistic title="Credenciadas" value={kpis.credenciadas} />
            <Sparkline values={SPARKLINE_DATA.credenciadas} />
          </div>
        </Card>
        <Card size="small" className="flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <Statistic title="Em credenciamento" value={kpis.emCredenciamento} />
            <Sparkline values={SPARKLINE_DATA.emCredenciamento} />
          </div>
        </Card>
        <Card size="small" className="flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <Statistic title="SLA em risco" value={kpis.slaRisco} />
            <Sparkline values={SPARKLINE_DATA.slaRisco} />
          </div>
        </Card>
        <Card size="small" className="flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <Statistic title="SLA estourado" value={kpis.slaEstourado} />
            <Sparkline values={SPARKLINE_DATA.slaEstourado} />
          </div>
        </Card>
        <Card size="small" className="flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <Statistic title="Tempo medio de ciclo (dias)" value={kpis.cicloMedio} />
            <Sparkline values={SPARKLINE_DATA.cicloMedio} />
          </div>
        </Card>
        <Card size="small" className="flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <Statistic title="Taxa de conversao" value={`${kpis.taxaConversao}%`} />
            <Sparkline values={SPARKLINE_DATA.conversao} />
          </div>
        </Card>
        <Card size="small" className="flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <Statistic
              title="Retrabalho"
              value={`${kpis.retrabalhoCount} (${kpis.retrabalhoPercent}%)`}
            />
            <Sparkline values={SPARKLINE_DATA.retrabalho} />
          </div>
        </Card>
      </div>

      <Tabs
        defaultActiveKey="visao"
        items={[
          {
            key: "visao",
            label: "Visao Geral",
            children: (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card title="Backlog por etapa" size="small">
                  <Text type="secondary">Destaque para a etapa com maior volume.</Text>
                  <div className="flex flex-col gap-3 mt-3">
                    {backlogPorEtapa.map((item) => (
                      <div key={item.etapa} className="flex items-center gap-3">
                        <div className="w-40">
                          <Text strong={item.destaque}>{item.etapa}</Text>
                        </div>
                        <Progress percent={item.percent} size="small" />
                        <Badge count={item.total} color={item.destaque ? "#fa8c16" : "#1677ff"} />
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Distribuicao de SLA" size="small">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <Text>No prazo</Text>
                      <Progress
                        percent={Math.round((slaDistribuicao.noPrazo / slaDistribuicao.total) * 100)}
                        size="small"
                      />
                      <Tag color="success">{slaDistribuicao.noPrazo}</Tag>
                    </div>
                    <div className="flex items-center justify-between">
                      <Text>Em risco</Text>
                      <Progress
                        percent={Math.round((slaDistribuicao.emRisco / slaDistribuicao.total) * 100)}
                        size="small"
                        status="active"
                      />
                      <Tag color="warning">{slaDistribuicao.emRisco}</Tag>
                    </div>
                    <div className="flex items-center justify-between">
                      <Text>Estourado</Text>
                      <Progress
                        percent={Math.round((slaDistribuicao.estourado / slaDistribuicao.total) * 100)}
                        size="small"
                        status="exception"
                      />
                      <Tag color="error">{slaDistribuicao.estourado}</Tag>
                    </div>
                  </div>
                </Card>

                <Card title="Aging" size="small">
                  <div className="flex flex-col gap-4">
                    {agingBuckets.map((bucket) => (
                      <div key={bucket.label} className="flex items-center gap-3">
                        <div className="w-24">
                          <Text>{bucket.label} dias</Text>
                        </div>
                        <Progress percent={bucket.percent} size="small" />
                        <Tag>{bucket.count}</Tag>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card
                  title="Ranking de gargalos"
                  size="small"
                  extra={<Button type="link">Ver todos</Button>}
                >
                  <List
                    dataSource={rankingGargalos}
                    renderItem={(item) => (
                      <List.Item
                        actions={[
                          <Button key="abrir" type="link" onClick={() => openCase(item)}>
                            Abrir caso
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={item.clinicaNome}
                          description={`${item.cidade}/${item.uf} • ${item.agingDias} dias na etapa`}
                        />
                        <Tag color={slaTagColor(item.statusSla)}>{item.statusSla}</Tag>
                      </List.Item>
                    )}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: "funil",
            label: "Funil",
            children: (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
                {kanbanColumns.map((column) => (
                  <Card
                    key={column.etapa}
                    size="small"
                    title={
                      <div className="flex items-center justify-between">
                        <Text>{column.etapa}</Text>
                        <Tag>{column.items.length}</Tag>
                      </div>
                    }
                  >
                    <div className="flex flex-col gap-3">
                      {column.items.slice(0, 6).map((item) => (
                        <Card
                          key={item.id}
                          size="small"
                          className="shadow-sm"
                          actions={[
                            <Button key="abrir" type="link" onClick={() => openCase(item)}>
                              Abrir
                            </Button>,
                          ]}
                        >
                          <div className="flex flex-col gap-2">
                            <Text strong>{item.clinicaNome}</Text>
                            <Text type="secondary">
                              {item.cidade}/{item.uf}
                            </Text>
                            <Tag color={slaTagColor(item.statusSla)}>{item.statusSla}</Tag>
                            <Text>Aging: {item.agingDias} dias</Text>
                            <Text>Pendencia: {item.pendenciaPrincipal}</Text>
                            <div className="flex items-center gap-2">
                              <UserOutlined />
                              <Text>
                                {item.responsavelNome ?? "Nao atribuido"}
                              </Text>
                            </div>
                          </div>
                        </Card>
                      ))}
                      {column.items.length > 6 && (
                        <Button type="link">Ver mais</Button>
                      )}
                      {column.items.length === 0 && (
                        <Text type="secondary">Sem casos</Text>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ),
          },
          {
            key: "fila",
            label: "Fila de Trabalho",
            children: (
              <div className="flex flex-col gap-4">
                <Card size="small" title="Fila priorizada">
                  <Space wrap>
                    <Tag
                      color={queueQuickFilter === "all" ? "blue" : undefined}
                      onClick={() => setQueueQuickFilter("all")}
                    >
                      Todas
                    </Tag>
                    <Tag
                      color={queueQuickFilter === "estourado" ? "red" : undefined}
                      onClick={() => setQueueQuickFilter("estourado")}
                    >
                      SLA estourado
                    </Tag>
                    <Tag
                      color={queueQuickFilter === "risco" ? "orange" : undefined}
                      onClick={() => setQueueQuickFilter("risco")}
                    >
                      SLA em risco
                    </Tag>
                    <Tag
                      color={queueQuickFilter === "sem-responsavel" ? "gold" : undefined}
                      onClick={() => setQueueQuickFilter("sem-responsavel")}
                    >
                      Sem responsavel
                    </Tag>
                  </Space>
                  <Divider className="!my-4" />
                  <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={workQueue}
                    pagination={{ pageSize: 8 }}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: "alertas",
            label: "Alertas",
            children: (
              <Card size="small">
                <Alert
                  message="Alertas acionaveis"
                  description="Monitoramento diario para evitar estouros de SLA."
                  type="warning"
                  showIcon
                  className="!mb-4"
                />
                <List
                  dataSource={alertas}
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <Button key="abrir" type="link" onClick={() => openCase(item.caso)}>
                          Abrir caso
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={item.texto}
                        description={item.caso.clinicaNome}
                      />
                      <Tag color={item.severidade === "error" ? "error" : "warning"}>
                        {item.severidade === "error" ? "Critico" : "Atencao"}
                      </Tag>
                    </List.Item>
                  )}
                />
              </Card>
            ),
          },
        ]}
      />

      <Drawer
        title="Detalhe do Caso"
        placement="right"
        width={520}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {selectedCase && (
          <div className="flex flex-col gap-4">
            <div>
              <Title level={5}>{selectedCase.clinicaNome}</Title>
              <Text type="secondary">{selectedCase.cnpj}</Text>
            </div>
            <Divider />
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="Endereco">
                {selectedCase.cidade}/{selectedCase.uf}
              </Descriptions.Item>
              <Descriptions.Item label="Especialidades">
                {selectedCase.especialidades.join(", ")}
              </Descriptions.Item>
              <Descriptions.Item label="Status">{selectedCase.statusGeral}</Descriptions.Item>
              <Descriptions.Item label="Etapa atual">
                {selectedCase.etapaAtual}
              </Descriptions.Item>
              <Descriptions.Item label="SLA">
                <Tag color={slaTagColor(selectedCase.statusSla)}>{selectedCase.statusSla}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            <div>
              <Title level={5}>Linha do tempo</Title>
              <Timeline
                items={selectedCase.historicoEventos.map((event) => ({
                  children: `${formatDate(event.data)} - ${event.descricao}`,
                }))}
              />
            </div>
            <Divider />
            <div>
              <Title level={5}>Pendencias</Title>
              <List
                size="small"
                dataSource={selectedCase.pendencias}
                renderItem={(item) => (
                  <List.Item>
                    <Tag icon={<WarningOutlined />}>{item}</Tag>
                  </List.Item>
                )}
              />
            </div>
            <Divider />
            <div>
              <Title level={5}>Notas/Comentarios</Title>
              <Alert message="Area de notas (mock)" type="info" showIcon />
            </div>
            <Divider />
            <div className="flex flex-col gap-3">
              <Title level={5}>Acoes rapidas</Title>
              <Space direction="vertical" size={8}>
                <Select
                  placeholder="Atribuir responsavel"
                  options={[
                    { value: "Mariana Costa" },
                    { value: "Joao Lima" },
                    { value: "Paula Souza" },
                  ]}
                />
                <Button icon={<EyeOutlined />}>Atualizar pendencia</Button>
                <Button type="primary">
                  <Link to="/clinicas">Abrir tela operacional existente</Link>
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
