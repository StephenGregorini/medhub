import { ReactNode } from "react";
import { Avatar, Badge, Layout, Menu, Typography } from "antd";
import {
  ApiOutlined,
  BarChartOutlined,
  BellOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  FileTextOutlined,
  SettingOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { Link, useLocation } from "react-router-dom";
import logoClaro from "../assets/logo_claro.svg";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const items = [
  {
    key: "/dashboard",
    icon: <DashboardOutlined />,
    label: (
      <div className="flex items-center justify-between gap-2">
        <span>Dashboard</span>
      </div>
    ),
    disabled: true,
  },
  {
    key: "/gestao",
    icon: <BarChartOutlined />,
    label: (
      <div className="flex items-center justify-between gap-2">
        <Link to="/gestao">Central de Gestao</Link>
        <Badge count={3} size="small" />
      </div>
    ),
  },
  {
    key: "/clinicas",
    icon: <TeamOutlined />,
    label: (
      <div className="flex items-center justify-between gap-2">
        <Link to="/clinicas">Clinicas</Link>
      </div>
    ),
  },
  {
    key: "/importar",
    icon: <UploadOutlined />,
    label: (
      <div className="flex items-center justify-between gap-2">
        <span>Importar Clinicas</span>
      </div>
    ),
    disabled: true,
  },
  {
    key: "/api-externa",
    icon: <ApiOutlined />,
    label: (
      <div className="flex items-center justify-between gap-2">
        <span>API Externa</span>
      </div>
    ),
    disabled: true,
  },
  {
    key: "/documentacao",
    icon: <FileTextOutlined />,
    label: (
      <div className="flex items-center justify-between gap-2">
        <span>Documentacao</span>
      </div>
    ),
    disabled: true,
  },
  {
    key: "/operadoras",
    icon: <CreditCardOutlined />,
    label: (
      <div className="flex items-center justify-between gap-2">
        <span>Operadoras</span>
      </div>
    ),
    disabled: true,
  },
  {
    key: "/usuarios",
    icon: <UserSwitchOutlined />,
    label: (
      <div className="flex items-center justify-between gap-2">
        <span>Usuarios</span>
      </div>
    ),
    disabled: true,
  },
  {
    key: "/configuracoes",
    icon: <SettingOutlined />,
    label: (
      <div className="flex items-center justify-between gap-2">
        <span>Configuracoes</span>
      </div>
    ),
    disabled: true,
  },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={240}
        breakpoint="lg"
        collapsedWidth={72}
        style={{ background: "#fff", borderRight: "1px solid #f0f0f0" }}
      >
        <div className="h-16 flex items-center gap-3 px-4">
          <img src={logoClaro} alt="MedSimples" className="h-8 w-auto" />
        </div>
        <div className="px-4 pb-3">
          <Text type="secondary" className="text-xs">
            Credenciamento - 1.17.0
          </Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={items}
          style={{ borderInlineEnd: "none" }}
        />
      </Sider>
      <Layout>
        <Header
          className="flex items-center justify-between px-6"
          style={{ background: "#fff", borderBottom: "1px solid #f0f0f0" }}
        >
          <Text>CRM do Credenciamento</Text>
          <div className="flex items-center gap-4">
            <BellOutlined />
            <div className="flex items-center gap-2">
              <Avatar size="small" icon={<UserOutlined />} />
              <div className="flex flex-col leading-tight">
                <Text className="text-xs">Stephen Gregoriani</Text>
                <Text type="secondary" className="text-xs">
                  Administrador
                </Text>
              </div>
            </div>
          </div>
        </Header>
        <Content className="p-6" style={{ background: "#f5f7fb" }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
