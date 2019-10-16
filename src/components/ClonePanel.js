const { Collapse, Typography, Button, List, Switch } = antd;
const { Title } = Typography;
const { Panel } = Collapse;
import { detectCodeClone } from "../services/optimizer";

const customPanelStyle = {
  border: 0
};

export function ClonePanel({ clones, selectedClone, handler }) {
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
            <List
              size="small"
              dataSource={clones}
              renderItem={(c, i) => (
                <List.Item
                  onClick={cloneOnClick(i)}
                  actions={[
                    <Switch
                      size="small"
                      checked={c.toOptimize}
                      onChange={() => {
                        clones[i].toOptimize = !clones[i].toOptimize;
                        handler({ clones });
                      }}
                    />
                  ]}
                >
                  <Typography.Text
                    mark={i == selectedClone}
                  >{`clone of length ${c.srcLen}`}</Typography.Text>
                </List.Item>
              )}
            />
          )}
        </div>
      </Panel>
    </Collapse>
  );
}
