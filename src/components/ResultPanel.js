const { Collapse, Typography } = antd;
const { Panel } = Collapse;
const { Title } = Typography;

const customPanelStyle = {
  border: 0
};

export function ResultPanel({ result }) {
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
            Result
          </Title>
        }
        key="1"
        style={customPanelStyle}
      >
        <div id="debugger-result-content">
          <pre className="debugger-result-content-pre">
            <code>{result}</code>
          </pre>
        </div>
      </Panel>
    </Collapse>
  );
}
