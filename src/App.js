import { apiParse, apiEvalAsync, apiGetSource } from "./services/api.js";

import { getXMLParser, getAst, mapAstToSrc } from "./services/parser.js";
import { parserExtensions } from "./services/parserExtensions.js";
import { getMetrics } from "./services/optEval.js";

import { InputSection } from "./components/InputSection.js";
import { ErrorSection } from "./components/ErrorSection.js";
import { ResultPanel } from "./components/ResultPanel.js";
import { TreeView } from "./components/TreeView.js";
import { CallStackSection } from "./components/CallStackSection.js";
import { ParamsTable } from "./components/ParamsTable.js";
import { OptimizerPane } from "./components/OptimizerPane.js";
import { OPT_CODE_VALIDATION_STATUS } from "./Enums";

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

const cleanState = {
  treeView: null,
  result: "",
  errors: "",
  selectedNode: null,
  inputHighlight: null,
  unmatchedBracket: [],
  clones: [],
  selectedClone: -1,
  optCode: "",
  optCodeValidationStatus: OPT_CODE_VALIDATION_STATUS.PENDING
};
export class App extends React.Component {
  state = {
    src: "{{#ifexpr: | yes | no}}",
    treeView: null,
    result: "",
    errors: "",
    title: "",
    url: "http://localhost/mediawiki-1.32.1/api.php", //"http://www.ewiki.club/api.php",
    homePageUrl: "http://localhost/mediawiki-1.32.1/index.php", //"http://www.ewiki.club//index.php",
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
    },
    clones: [], // Optimizer
    selectedClone: -1,
    selectedClonesToOptimize: [],
    optCode: "",
    optCodeValidationStatus: OPT_CODE_VALIDATION_STATUS.PENDING
  };

  handler = (newState, callback = null) => {
    let state = { ...this.state, ...newState };
    if (!callback) this.setState(state);
    else this.setState(state, callback);
  };

  evalResult = async (src = this.state.src, title = this.state.title) => {
    const { url, params } = this.state;
    try {
      let result = await apiEvalAsync(src, title, url, params);
      this.setState({
        errors: "",
        result: result
      });
    } catch (e) {
      this.setState({ errors: e.message });
    }
  };

  compareOptCodeWithSrc = () => {
    const { src, title, url, extensions, optCode, treeView } = this.state;
    let srcInfo = getMetrics(src, treeView);
    console.log("[INFO][SRC]: ", srcInfo);
    apiParse(optCode, title, url, async (k, t) => {
      if (k == "OK") {
        var result = window.JSON.parse(t);
        if (result.parse && result.parse.parsetree) {
          let ast = result.parse.parsetree["*"]
            ? getXMLParser()(result.parse.parsetree["*"])
            : null;
          let optTreeView = getAst(ast.children[0]);
          let optInfo = getMetrics(optCode, optTreeView);
          console.log("[INFO][OPT]: ", optInfo);
        }
      }
    });
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
        } else {
          if (!result.error || result.error.code != "notext")
            this.setState({
              treeView: null,
              unmatchedBracket: [],
              errors: t
            });
        }
      } else {
        this.setState({ treeView: null, unmatchedBracket: [], errors: k });
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

  debug = () => {
    this.setState(cleanState);
    if (!this.state.src) {
      // this.setState({ treeView: null, result: "", errors: "" });
    } else {
      this.setState({ editIntput: false });
      this.evalResult();
      this.getParseTree();
    }
  };

  verifyOptCode = async () => {
    const { url, params, optCode, title, result } = this.state;
    let optResult = await apiEvalAsync(optCode, title, url, params);
    if (result == optResult)
      this.setState({
        optCodeValidationStatus: OPT_CODE_VALIDATION_STATUS.SUCCESS
      });
    else {
      this.setState({
        optCodeValidationStatus: OPT_CODE_VALIDATION_STATUS.ERROR
      });
      console.log("OPT:", optResult);
    }
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
      selectedNode,
      params,
      editIntput,
      extensions,
      unmatchedBracket,
      inputHighlight,
      treeView,
      clones,
      selectedClone,
      selectedClonesToOptimize,
      optCode,
      optCodeValidationStatus
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
            <CallStackSection
              stepHistory={stepHistory}
              handler={this.handler}
              debug={this.debug}
            />
            <ParamsTable params={params} />
            <div>
              <ResultPanel result={result} />
              <TreeView
                treeView={treeView}
                selectedNode={selectedNode}
                inputHighlight={inputHighlight}
                stepIntoTemplateButtonDisabled={stepIntoTemplateButtonDisabled}
                handler={this.handler}
              />
            </div>
          </div>
          <OptimizerPane
            ast={treeView}
            clones={clones}
            selectedClone={selectedClone}
            handler={this.handler}
            src={src}
            optCode={optCode}
            selectedClonesToOptimize={selectedClonesToOptimize}
            optCodeValidationStatus={optCodeValidationStatus}
            verifyOptCode={this.verifyOptCode}
            compareOptCodeWithSrc={this.compareOptCodeWithSrc}
          />
        </Col>
      </Row>
    );
  }
}
