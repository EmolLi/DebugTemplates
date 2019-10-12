const { Collapse, Typography, Tree, Tag } = antd;
const { Title } = Typography;
const { TreeNode } = Tree;
const { Panel } = Collapse;
const customPanelStyle = {
  border: 0
};

export function TreeView({
  treeView,
  selectedNode,
  inputHighlight,
  stepIntoTemplateButtonDisabled,
  handler
}) {
  const treeNodeOnSelect = (selectedKeys, info) => {
    let newState = { selectedNode: info.node.props.node };
    // jump to template source
    let { start, end, type } = info.node.props.node;
    if (start != undefined && end != undefined) {
      console.log(start, end);
      newState.inputHighlight = [start, end];
    }
    if (type == "root") newState.inputHighlight = null;
    if (type == "template") {
      newState.stepIntoTemplateButtonDisabled = false;
    } else {
      newState.stepIntoTemplateButtonDisabled = true;
    }
    handler(newState);
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
            Tree View
          </Title>
        }
        key="1"
        style={customPanelStyle}
      >
        <div id="debugger-tree-view-content">
          {treeView && (
            <Tree onSelect={treeNodeOnSelect}>
              {generateTreeNode(treeView)}
            </Tree>
          )}
        </div>
      </Panel>
    </Collapse>
  );
}

function generateTreeNode(node) {
  const { type, value, id, children } = node;
  if (node.start == undefined || node.end == undefined) {
  }
  return (
    <TreeNode title={formatTreeNode(node)} key={node.id} node={node}>
      {node.children.length > 0 && node.children.map(c => generateTreeNode(c))}
    </TreeNode>
  );
}

function formatTreeNode(node) {
  const { value, id, children } = node;
  return (
    <div>
      {formatType(node)}
      {formatValue(value)}
      {formatEval(node._eval)}
      {node._highlight ? <Tag color="green">⇦</Tag> : null}
    </div>
  );
}

function formatType(node) {
  let type = node.type;
  if (!type) return null;
  switch (type) {
    case "part":
      return "parameter";
    case "tplarg":
      return "argument";
    case "ext":
      return node._extType;
    default:
      return type;
  }
}

function formatValue(value) {
  if (!value) return null;
  return <Tag>{value}</Tag>;
}

function formatEval(_eval) {
  if (!_eval) return null;
  return <Tag color="blue">{_eval}</Tag>;
}
