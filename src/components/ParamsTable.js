const { Table, Typography } = antd;
const { Title } = Typography;

const paramsTableColumn = [
  {
    title: "Name",
    dataIndex: "name",
    key: "name"
  },
  {
    title: "Value",
    dataIndex: "value",
    key: "value"
  }
];

export function ParamsTable({ params }) {
  if (params.length == 0) return null;
  return (
    <div>
      <Title level={4} type="secondary">
        Parameters
      </Title>
      <Table
        columns={paramsTableColumn}
        dataSource={params}
        size="small"
        pagination={false}
      />
    </div>
  );
}
