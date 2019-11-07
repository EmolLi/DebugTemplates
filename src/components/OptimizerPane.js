const { Typography, Button } = antd;
const { Title } = Typography;
import { detectCodeClone, elimilateClones } from "../services/optimizer";
import { ClonePanel } from "./ClonePanel";
import { CodePad } from "./CodePad";
import { OPT_CODE_VALIDATION_STATUS } from "../Enums";

export function OptimizerPane({
  clones,
  selectedClone,
  ast,
  handler,
  src,
  optCode,
  selectedClonesToOptimize,
  optCodeValidationStatus,
  verifyOptCode
}) {
  function detectClones() {
    console.log(!ast, "222");
    if (!ast) return;
    let clones = detectCodeClone(ast);
    console.log(clones, "ccc");
    let selectedClonesToOpt = [];
    clones.forEach((c, i) => {
      if (c.toOptimize) selectedClonesToOpt.push(i);
    });
    handler({ clones, selectedClonesToOptimize: selectedClonesToOpt });
  }
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
            let selectedClonesToOpt = [];
            clones.forEach((c, i) => {
              if (c.toOptimize) selectedClonesToOpt.push(i);
            });
            handler({ clones, selectedClonesToOptimize: selectedClonesToOpt });
          }}
          type="primary"
          icon="caret-right"
        />
        <Button
          onClick={() => {
            console.log("generate");
            if (!clones) return;
            let optCode = elimilateClones(
              clones,
              src,
              selectedClonesToOptimize
            );
            console.log(optCode);
            handler({ optCode }, verifyOptCode);
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
          selectedClonesToOptimize={selectedClonesToOptimize}
        />
        {optCode && (
          <CodePad
            src={optCode}
            optCodeValidationStatus={optCodeValidationStatus}
          />
        )}
      </div>
    </div>
  );
}
