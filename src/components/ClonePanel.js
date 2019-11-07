const { Collapse, Typography, Button, List, Switch, Table } = antd;
const { Title } = Typography;
const { Panel } = Collapse;
import { detectCodeClone } from "../services/optimizer";

const customPanelStyle = {
  border: 0
};

export function ClonePanel({
  clones,
  selectedClone,
  handler,
  selectedClonesToOptimize
}) {
  const columns = [
    {
      title: "ID",
      dataIndex: "id"
    },
    {
      title: "Length",
      dataIndex: "srcLen"
    },
    {
      title: "Count",
      dataIndex: "count"
    },
    {
      title: "Action",
      dataIndex: "action",
      render: (text, record, index) => {
        return <a onClick={cloneOnClick(index)}>Highlight</a>;
      }
    }
  ];

  const rowSelection = {
    selectedRowKeys: selectedClonesToOptimize,
    onChange: selectedRowKeys => {
      handler({ selectedClonesToOptimize: selectedRowKeys });
    }
  };

  let cloneOnClick = i => () => {
    handler({ selectedClone: i });
    let inputHighlight = [];
    for (let c of clones[i].nodeIndexes) {
      inputHighlight.push(c.srcStart);
      inputHighlight.push(c.srcEnd);
    }
    handler({ inputHighlight });
  };

  return (
    <Collapse
      className="debugger-collapse-section"
      expandIconPosition="right"
      bordered={false}
      defaultActiveKey={["1"]}
    >
      <Panel
        header={
          <Title level={4} type="secondary">
            Clone Detection
          </Title>
        }
        key="1"
        style={customPanelStyle}
      >
        <div id="debugger-opt-clone">
          {clones.length > 0 && (
            <Table
              rowSelection={rowSelection}
              columns={columns}
              dataSource={clones}
            />
          )}
        </div>
      </Panel>
    </Collapse>
  );
}
