const { Typography, Button } = antd;
const { Title } = Typography;

export function OptimizerPane({}) {
  return (
    <div id="optimizer-pane" className="debugger-section">
      <Title className="debugger-section-title debugger-title" level={4}>
        Optimizer Pane
        <Button
          onClick={() => console.log("optimize")}
          type="primary"
          icon="caret-right"
        />
      </Title>
      <div></div>
    </div>
  );
}
