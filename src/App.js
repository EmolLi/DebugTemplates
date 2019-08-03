import {
  apiParse,
  apiEval,
  apiEvalAsync,
  apiGetSource,
  apiEvalHasResult,
  apiEvalGetResult,
  apiGetPage,
  apiGetTemplateName
} from "./services/api.js";

import {
  getXMLParser,
  getAst,
  mapAstToSrc,
  extractTemplatesAndParams,
  getExpectedPattern,
  includesUnmatchedBracket,
  parserExtensions
} from "./services/parser.js";

import { InputSection } from "./components/InputSection.js";
import { ErrorSection } from "./components/ErrorSection.js";
const { React, antd } = window;
const {
  Row,
  Col,
  Input,
  Table,
  PageHeader,
  Typography,
  Button,
  Tree,
  Icon,
  Collapse,
  Checkbox,
  Tag
} = antd;
const { TextArea, Search } = Input;
const { Title, Paragraph, Text } = Typography;
const { TreeNode } = Tree;
const { Panel } = Collapse;

// enums
const NODE_TYPE = {
  template: "template"
};

const paramsTableColumn = [
  {
    title: "Name",
    dataIndex: "name",
    key: "name"
  },
  {
    title: "Value",
    dataIndex: "value",
    key: "value"
  }
];
const customPanelStyle = {
  border: 0
};

export class App extends React.Component {
  state = {
    src: "{{#ifexpr: | yes | no}}",
    treeView: null,
    result: "",
    errors: "",
    title: "",
    url: "http://localhost/mediawiki-1.32.1/api.php",
    homePageUrl: "http://localhost/mediawiki-1.32.1/index.php",
    stepIntoTemplateButtonDisabled: true,
    selectedNode: null,
    editIntput: true,
    inputHighlight: null,
    unmatchedBracket: [],
    stepHistory: [{ title: "Main", params: [] }],
    params: [],
    extensions: {
      parserFunctions: true,
      variables: true,
      stringFunctions: true
    }
  };

  handler = newState => {
    this.setState({
      ...this.state,
      ...newState
    });
  };

  ResultPanel() {
    const { result } = this.state;
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

  evalResult = async (src = this.state.src, title = this.state.title) => {
    const { url, params } = this.state;
    try {
      let result = await apiEvalAsync(src, title, url, params);
      debugger;
      console.log(result, "1111111111");
      this.setState({
        errors: "",
        result: result
      });
    } catch (e) {
      console.log(e, "2222222222");
      this.setState({ errors: e.message });
    }
  };

  getParseTree() {
    const { src, title, url, extensions } = this.state;
    apiParse(src, title, url, async (k, t) => {
      if (k == "OK") {
        var result = window.JSON.parse(t);
        if (result.parse && result.parse.parsetree) {
          let ast = result.parse.parsetree["*"]
            ? getXMLParser()(result.parse.parsetree["*"])
            : null;
          let treeView = getAst(ast.children[0]);
          let unmatchedBracket = mapAstToSrc(treeView, src);
          await parserExtensions(treeView, src, extensions, url);
          this.setState({ treeView: treeView, errors: "", unmatchedBracket });
          // updateFromXML(result.expandtemplates.parsetree, newparams);
        } else {
          // updateFromXML("");
          if (!result.error || result.error.code != "notext")
            this.setState({
              treeView: null,
              unmatchedBracket: [],
              errors: t
            });
          // debugNote(mw.message("debugtemplates-error-parse") + " " + t);
        }
      } else {
        this.setState({ treeView: null, unmatchedBracket: [], errors: k });
        // updateFromXML("");
        // debugNote(mw.message("debugtemplates-error-parse") + " " + k);
      }
    });
  }

  getTemplateSource = async (title = this.state.title) => {
    if (!title) return;
    try {
      let src = await apiGetSource(title, this.state.homePageUrl);
      await this.setState({ errors: "", src, inputHighlight: null });
    } catch (err) {
      this.setState({ src: "", errors: err.message, inputHighlight: null });
    }
  };

  stepIntoTemplate = async () => {
    let { selectedNode, url, src, stepHistory } = this.state;
    if (selectedNode.type != "template") {
      console.log("eeeeee");
    }
    let titleNode = selectedNode.children[0];
    let titleSrc = src.substring(
      selectedNode.children[0].start,
      selectedNode.children[0].end + 1
    );

    let params = [];
    try {
      for (let i = 1; i < selectedNode.children.length; i++) {
        let p = {};
        let param = selectedNode.children[i];
        let name = param.children[0];
        let value = param.children[param.children.length - 1];
        if (name.start && name.end) {
          p.nameSrc = src.substring(name.start, name.end + 1);
          p.name = await apiEvalAsync(p.nameSrc, "", url);
        } else continue;
        if (value.start && value.end) {
          p.valueSrc = src.substring(value.start, value.end + 1);
          p.value = await apiEvalAsync(p.valueSrc, "", url);
        }
        params.push(p);
      }

      let title = await apiEvalAsync(titleSrc, "", url);
      await this.getTemplateSource(title);
      stepHistory[stepHistory.length - 1].src = src;
      stepHistory[stepHistory.length - 1].command = src.substring(
        selectedNode.start,
        selectedNode.end + 1
      );
      let newHistory = { title, params };
      stepHistory = [...stepHistory, newHistory];
      this.setState(
        {
          title,
          stepHistory,
          params
        },
        () => this.debug()
      );
    } catch (e) {
      this.setState({ errors: e.message });
    }
  };

  navigateInHistory = index => async () => {
    let { stepHistory, src, url } = this.state;
    if (!stepHistory[index].src) return;
    this.setState(
      {
        src: stepHistory[index].src,
        params: stepHistory[index].params,
        stepHistory: stepHistory.splice(0, index + 1)
      },
      () => this.debug()
    );
  };

  debug = () => {
    if (!this.state.src) {
      this.setState({ treeView: null, result: "", errors: "" });
    } else {
      this.setState({ editIntput: false });
      debugger;
      this.evalResult();
      this.getParseTree();
    }
  };

  treeNodeOnSelect = (selectedKeys, info) => {
    // jump to template source
    this.setState({ selectedNode: info.node.props.node });
    let { start, end, type } = info.node.props.node;
    if (start != undefined && end != undefined) {
      this.setState({ inputHighlight: [start, end] });
    }
    if (type == "root") this.setState({ inputHighlight: null });
    if (type == "template") {
      this.setState({ stepIntoTemplateButtonDisabled: false });
      // this.setState({title: node.})
    } else {
      this.setState({ stepIntoTemplateButtonDisabled: true });
    }
  };

  generateTreeNode(node) {
    const { type, value, id, children } = node;
    // type = formatType(type);
    // value = format(value)
    return (
      <TreeNode title={this.formatTreeNode(node)} key={node.id} node={node}>
        {node.children.length > 0 &&
          node.children.map(c => this.generateTreeNode(c))}
      </TreeNode>
    );
  }

  formatTreeNode(node) {
    const { type, value, id, children } = node;
    return (
      <div>
        {this.formatType(type)}
        {this.formatValue(value)}
        {this.formatEval(node._eval)}
        {node._highlight ? <Tag color="green">⇦</Tag> : null}
      </div>
    );
  }

  formatType(type) {
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
  formatValue(value) {
    if (!value) return null;
    return <Tag>{value}</Tag>;
  }
  formatEval(_eval) {
    if (!_eval) return null;
    return <Tag color="blue">{_eval}</Tag>;
  }
  TreeView() {
    const { treeView } = this.state;
    return (
      <div id="debugger-tree-view">
        <Title level={4} type="secondary">
          Tree View
        </Title>
        <div id="debugger-tree-view-content">
          {treeView && (
            <Tree onSelect={this.treeNodeOnSelect}>
              {this.generateTreeNode(treeView)}
            </Tree>
          )}
        </div>
      </div>
    );
  }

  CallStackSection = () => {
    const { stepHistory } = this.state;
    if (stepHistory.length <= 1) return null;
    return (
      <div id="debugger-call-stack">
        <Title level={4} type="secondary">
          Call Stack
        </Title>
        <div className="non-padding-section">
          {stepHistory.map((h, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Icon type="right" />}
              <Button type="link" onClick={this.navigateInHistory(i)}>
                {h.title}
              </Button>
            </React.Fragment>
          ))}
        </div>
        {stepHistory.slice(0, stepHistory.length - 1).map((h, i) => (
          <Typography>
            <strong>{h.title}</strong>: {h.command}
          </Typography>
        ))}
      </div>
    );
  };

  ParamsTable = () => {
    const { params } = this.state;
    if (params.length == 0) return null;
    return (
      <div>
        <Title level={4} type="secondary">
          Parameters
        </Title>
        <Table
          columns={paramsTableColumn}
          dataSource={params}
          size="small"
          pagination={false}
        />
      </div>
    );
  };
  render() {
    const {
      src,
      title,
      result,
      url,
      homePageUrl,
      errors,
      stepHistory,
      stepIntoTemplateButtonDisabled,
      params,
      editIntput,
      extensions,
      unmatchedBracket,
      inputHighlight
    } = this.state;
    return (
      <Row>
        <Col span={12}>
          <InputSection
            src={src}
            title={title}
            result={result}
            url={url}
            homePageUrl={homePageUrl}
            errors={errors}
            stepIntoTemplateButtonDisabled={stepIntoTemplateButtonDisabled}
            editIntput={editIntput}
            extensions={extensions}
            handler={this.handler}
            inputHighlight={inputHighlight}
            getTemplateSource={this.getTemplateSource}
          />
          <ErrorSection
            errors={errors}
            unmatchedBracket={unmatchedBracket}
            handler={this.handler}
          />
        </Col>
        <Col span={12}>
          <div id="debugger-debugging-pane" className="debugger-section">
            <Title className="debugger-section-title debugger-title" level={4}>
              Debugging Pane
              <Button
                onClick={this.stepIntoTemplate}
                disabled={stepIntoTemplateButtonDisabled}
                type="primary"
                icon="vertical-align-bottom"
              />
              <Button onClick={this.debug} type="primary" icon="caret-right" />
            </Title>
            {this.CallStackSection()}
            {this.ParamsTable()}
            <div>
              {this.ResultPanel()}
              {this.TreeView()}
            </div>
          </div>
        </Col>
      </Row>
    );
  }
}
