const { Typography, Button } = antd;
const { Title } = Typography;
import { detectCodeClone } from "../services/optimizer";

export function OptimizerPane({ ast }) {
  return (
    <div id="optimizer-pane" className="debugger-section">
      <Title className="debugger-section-title debugger-title" level={4}>
        Optimizer Pane
        <Button
          onClick={() => {
            if (!ast) return;
            detectCodeClone(ast);
          }}
          type="primary"
          icon="caret-right"
        />
      </Title>
      <div></div>
    </div>
  );
}
