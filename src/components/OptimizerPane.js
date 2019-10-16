const { Typography, Button } = antd;
const { Title } = Typography;
import { detectCodeClone } from "../services/optimizer";
import { ClonePanel } from "./ClonePanel";

export function OptimizerPane({ clones, selectedClone, ast, handler }) {
  return (
    <div id="optimizer-pane" className="debugger-section">
      <Title className="debugger-section-title debugger-title" level={4}>
        Optimizer Pane
        <Button
          onClick={() => {
            console.log(!ast, "222");
            if (!ast) return;
            let clones = detectCodeClone(ast);
            console.log(clones, "ccc");
            handler({ clones });
          }}
          type="primary"
          icon="caret-right"
        />
      </Title>
      <div>
        <ClonePanel
          clones={clones}
          handler={handler}
          selectedClone={selectedClone}
        />
      </div>
    </div>
  );
}
