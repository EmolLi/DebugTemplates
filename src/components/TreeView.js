const { Typography, Tree, Tag } = antd;
const { Title } = Typography;
const { TreeNode } = Tree;

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
    <div id="debugger-tree-view">
      <Title level={4} type="secondary">
        Tree View
      </Title>
      <div id="debugger-tree-view-content">
        {treeView && (
          <Tree onSelect={treeNodeOnSelect}>{generateTreeNode(treeView)}</Tree>
        )}
      </div>
    </div>
  );
}

function generateTreeNode(node) {
  const { type, value, id, children } = node;
  return (
    <TreeNode title={formatTreeNode(node)} key={node.id} node={node}>
      {node.children.length > 0 && node.children.map(c => generateTreeNode(c))}
    </TreeNode>
  );
}

function formatTreeNode(node) {
  const { type, value, id, children } = node;
  return (
    <div>
      {formatType(type)}
      {formatValue(value)}
      {formatEval(node._eval)}
      {node._highlight ? <Tag color="green">⇦</Tag> : null}
    </div>
  );
}

function formatType(type) {
  if (!type) return null;
  switch (type) {
    case "part":
      return "parameter";
    case "tplarg":
      return "argument";
    case "ext":
      return "nowiki";
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
