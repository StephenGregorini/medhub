import { ReactNode } from "react";
import { Breadcrumb, Space, Typography } from "antd";

const { Title, Text } = Typography;

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
  actions?: ReactNode;
};

export default function PageHeader({
  title,
  subtitle,
  breadcrumb,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      {breadcrumb && (
        <Breadcrumb items={breadcrumb.map((item) => ({ title: item }))} />
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Title level={3} className="!mb-0">
            {title}
          </Title>
          {subtitle && <Text type="secondary">{subtitle}</Text>}
        </div>
        {actions && <Space>{actions}</Space>}
      </div>
    </div>
  );
}
