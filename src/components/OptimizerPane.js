const { Typography, Button } = antd;
const { Title } = Typography;
import { detectCodeClone } from "../services/optimizer";

export function OptimizerPane({}) {
  return (
    <div id="optimizer-pane" className="debugger-section">
      <Title className="debugger-section-title debugger-title" level={4}>
        Optimizer Pane
        <Button
          onClick={() =>
            detectCodeClone(
              "hello hello hello world yes yes helloo hello hello world yes"
            )
          }
          type="primary"
          icon="caret-right"
        />
      </Title>
      <div></div>
    </div>
  );
}
