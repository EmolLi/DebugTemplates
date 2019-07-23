/**
 * JS code for all the interactive parts of the special page
 *
 * @author Clark Verbrugge, Duan Li
 * @license CC BY-SA 3.0
 **/

// TODO: performance issue on highlight src code
// TODO: refactor, config compiler

const corsProxy = "https://gentle-taiga-41562.herokuapp.com/";
function getUrl(url) {
  if (new URL(url).hostname != "localhost") {
    // cors
    return corsProxy + url;
  }
  return url;
}
// enums
const NODE_TYPE = {
  template: "template"
};
let root = document.getElementById("debug-template-debugger");

let libs = [
  ["https://unpkg.com/react@16/umd/react.development.js", "text/javascript"],
  [
    "https://unpkg.com/react-dom@16/umd/react-dom.development.js",
    "text/javascript"
  ],
  ["https://momentjs.com/downloads/moment.js", "text/javascript"],
  [
    "https://cdnjs.cloudflare.com/ajax/libs/antd/3.19.0/antd.min.js",
    "text/javascript"
  ],
  [
    "https://cdnjs.cloudflare.com/ajax/libs/antd/3.19.0/antd.min.css",
    "text/css"
  ]
];
//
function loadjs(file, type = "text/javascript") {
  return new Promise((resolve, reject) => {
    let fileref;
    if (type == "text/javascript") {
      //if filename is a external JavaScript file
      fileref = document.createElement("script");
      fileref.setAttribute("type", "text/javascript");
      fileref.setAttribute("src", file);
      fileref.async = false;
      fileref.crossOrigin = "anonymous";
    } else if (type == "text/css") {
      //if filename is an external CSS file
      fileref = document.createElement("link");
      fileref.setAttribute("rel", "stylesheet");
      fileref.setAttribute("type", "text/css");
      fileref.setAttribute("href", file);
    }
    fileref.onload = function() {
      console.log("LOADED: " + file);
      resolve();
    };
    document.body.appendChild(fileref);
  });
}

Promise.all(libs.map(lib => loadjs(lib[0], lib[1]))).then(async () => {
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
    // background: "#f7f7f7",
    // borderRadius: 4,
    // marginTop: 10,
    // marginBottom: 10,
    // paddingLeft: 0,
    // paddingRight: 0,
    border: 0
    // overflow: "hidden"
  };

  // "{{Test|p1={{Test|p2=ddd}}}} {{Test|p1={p2|p}=22}|o3={dd}|d{=p3|ddd}}",
  class App extends React.Component {
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

    SettingPanel() {
      const { url, homePageUrl, extensions } = this.state;
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
                Settings
              </Title>
            }
            key="1"
            style={customPanelStyle}
          >
            <Input
              placeholder="API URL"
              value={url}
              onChange={e => this.setState({ url: e.target.value })}
            />
            <Input
              placeholder="Home Page URL"
              value={homePageUrl}
              onChange={e => this.setState({ homePageUrl: e.target.value })}
            />
            <Checkbox
              onChange={e =>
                this.setState({
                  extensions: {
                    ...extensions,
                    parserFunctions: e.target.checked
                  }
                })
              }
              checked={extensions.parserFunctions}
            >
              Parser Functions
            </Checkbox>
            <Checkbox
              onChange={e =>
                this.setState({
                  extensions: {
                    ...extensions,
                    variables: e.target.checked
                  }
                })
              }
              checked={extensions.variables}
            >
              Variables
            </Checkbox>
            <Checkbox
              onChange={e =>
                this.setState({
                  extensions: {
                    ...extensions,
                    stringFunctions: e.target.checked
                  }
                })
              }
              checked={extensions.stringFunctions}
            >
              String Functions
            </Checkbox>
          </Panel>
        </Collapse>
      );
    }

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
        this.setState({
          errors: "",
          result: result
        });
      } catch (e) {
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
            nindex = 0;
            let treeView = getAst(ast.children[0]);
            let unmatchedBracket = mapAstToSrc(treeView, src);
            await parserExtensions(treeView, src, extensions, url);
            debugger;
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
          {type}
          {this.formatValue(value)}
          {this.formatEval(node._eval)}
          {node._highlight ? "  <SELECTED>" : ""}
        </div>
      );
    }

    formatType(type) {
      if (!type) return null;
      return <Tag color="magenta">{type}</Tag>;
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

    inputTextWithHighlight() {
      const { src, inputHighlight } = this.state;
      if (!inputHighlight)
        return (
          <pre className="debugger-input-textarea-pre">
            <code>{src}</code>
          </pre>
        );
      return (
        <React.Fragment>
          <pre className="debugger-input-textarea-pre">
            {inputHighlight[0] > 0 && (
              <code className="disabled">
                {src.substring(0, inputHighlight[0])}
              </code>
            )}
            <code>
              {src.substring(inputHighlight[0], inputHighlight[1] + 1)}
            </code>
            {inputHighlight[1] < src.length - 1 && (
              <code className="disabled">
                {src.substring(inputHighlight[1] + 1)}
              </code>
            )}
          </pre>
        </React.Fragment>
      );
    }
    src;
    InputSection() {
      const {
        src,
        title,
        result,
        url,
        homePageUrl,
        errors,
        stepIntoTemplateButtonDisabled,
        editIntput
      } = this.state;
      return (
        <div id="debugger-input" className="debugger-section">
          <Title level={4}>Input</Title>
          {this.SettingPanel()}
          <div>
            <Title className="debugger-title" level={4} type="secondary">
              Source
              <Button
                onClick={() => this.setState({ editIntput: true })}
                disabled={editIntput}
                type="primary"
                icon="edit"
              />
            </Title>
            <Search
              placeholder="Template Title"
              value={title}
              onChange={e => this.setState({ title: e.target.value })}
              onSearch={this.getTemplateSource}
              enterButton
            />
            {editIntput ? (
              <TextArea
                value={src}
                id="debugger-input-textarea"
                onChange={e =>
                  this.setState({ src: e.target.value, inputHighlight: null })
                }
              />
            ) : (
              <div id="debugger-input-textarea">
                {this.inputTextWithHighlight()}
              </div>
            )}
          </div>
        </div>
      );
    }

    ErrorSection = () => {
      const { errors, unmatchedBracket } = this.state;
      return (
        <div id="debugger-errors" className="debugger-section">
          <Title level={4}>Errors</Title>
          <div id="debugger-errors-content">
            {errors && (
              <Text type="danger">
                Error: {errors}
                <br />
              </Text>
            )}
            {unmatchedBracket &&
              unmatchedBracket.length > 0 &&
              unmatchedBracket.map((b, i) => (
                <Text
                  type="warning"
                  key={i}
                  onClick={() =>
                    this.setState({ inputHighlight: [b.start, b.start] })
                  }
                >
                  Warning: unmacthed bracket {b.value}
                  <br />
                </Text>
              ))}
          </div>
        </div>
      );
    };

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
        params
      } = this.state;
      return (
        <Row>
          <Col span={12}>
            {this.InputSection()}
            {this.ErrorSection()}
          </Col>
          <Col span={12}>
            <div id="debugger-debugging-pane" className="debugger-section">
              <Title
                className="debugger-section-title debugger-title"
                level={4}
              >
                Debugging Pane
                <Button
                  onClick={this.stepIntoTemplate}
                  disabled={stepIntoTemplateButtonDisabled}
                  type="primary"
                  icon="vertical-align-bottom"
                />
                <Button
                  onClick={this.debug}
                  type="primary"
                  icon="caret-right"
                />
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

  ReactDOM.render(<App />, root);
});

// <div id="debugger-result">
//   <Title level={4} type="secondary">
//     Result
//   </Title>
//   <div id="debugger-result-content">
//     <pre className="debugger-result-content-pre">
//       <code>{result}</code>
//     </pre>
//   </div>
// </div>

// fucntion formatType(type) {
//       if (!type) return "";
//       switch (type) {
//         case "part":
//           return "parameter";
//         case "tplarg":
//           return "argument";
//         default:
//         return type
//       }
//     }
//     function formatValue(value) {
//       if (value == " ") return "[SPACE]";
//       return value ? value : "";
//     }
/**
 * *************************
 * Global variables section.
 *****************************
 **/

// For indexing the displayed HTML nodes with unique numbers used in highlighting.
var nindex = 0;
var ast;

/**
 * Perform a POST operation.
 *
 * @param {string} url
 * @param {string} params Assumed to be URI-encoded.
 * @param {function} callback Callback upong completion. It will receive 1 or 2 arguments; if everything
 *  was ok then it receives "OK" and the result, and if not then it receives an error message.
 **/
function doPost(url, params, callback) {
  var x = new XMLHttpRequest();
  x.open("POST", getUrl(url), true);
  x.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  // x.setRequestHeader("Content-length", params.length);
  // x.setRequestHeader("Connection", "close");
  x.setRequestHeader("Api-User-Agent", "DebugTemplatesExtension/1.0");

  x.onreadystatechange = function() {
    if (x.readyState == 4) {
      if (x.status == 200) {
        callback("OK", x.responseText);
      } else {
        callback("An error has occured making the request");
      }
    }
  };
  //debugNote("sending "+url+" and " + params);
  x.send(params);
}

//===============================API SERVICES=====================
//================================================================
//================================================================
/**
 * Asks the wiki API to parse the given text into XML.
 *
 * @param {string} t The string to parse; it will be URI-encoded.
 * @param {function} callback Receives 1 or 2 args with the JSON-encoded result, as per doPost.
 **/
function apiParse(t, title, url, callback) {
  var args = "action=parse&format=json&prop=parsetree";
  if (title) {
    args = args + "&title=" + encodeURIComponent(title);
  }
  args = args + "&text=" + encodeURIComponent(t);
  //debugNote("Action is "+action);
  doPost(url, args, callback);
}
/**
 * Asks the wiki API to parse the given text into wikitext.
 *
 * @param {string} t The string to parse; it will be URI-encoded.
 * @param {function} callback Receives 1 or 2 args with the JSON-encoded result, as per doPost.
 **/
function apiEval(t, title, url, callback) {
  //var args = "action=expandtemplates&format=json&prop=wikitext&includecomments=";
  var args = "action=expandframe&format=json";
  if (title) {
    args = args + "&title=" + encodeURIComponent(title);
  }
  args = args + "&text=" + encodeURIComponent(t);
  // args = args + "&frame=" + encodeURIComponent(JSON.stringify({ p1: "hellodd" });
  // debugNote("Action is "+args);
  doPost(url, args, callback);
}

async function apiEvalAsync(src, title, url, params) {
  if (src == "") return "";
  let args = "action=expandframe&format=json";
  if (title) {
    args = args + "&title=" + encodeURIComponent(title);
  }
  args = args + "&text=" + encodeURIComponent(src);
  if (params && params.length > 0) {
    let p = {};
    params.forEach(k => (p[k.name] = k.value));
    args = args + "&frame=" + encodeURIComponfent(JSON.stringify(p));
  }
  let response = await fetch(getUrl(url), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Api-User-Agent": "DebugTemplatesExtension/1.0"
    },
    body: args
  });
  let result = await response.json();
  if (!response.ok) throw new Error(response.status + content);
  return result.expandframe.result;
}

async function apiGetSource(title, homePageUrl) {
  let response = await fetch(
    getUrl(`${homePageUrl}/Template:${title}?action=raw`)
  );
  content = await response.text();
  if (!response.ok) {
    if (response.status == 404) throw new Error(`Template ${title} not found.`);
    throw new Error(response.status + content);
  }
  return content;
}
/**
 * Determines whether a proper result was obtained from an apiEval call.
 *
 * Note that this assumes an "OK" result.
 *
 * @param {object} result The object returned from the apiEval call, JSON-decoded.
 * @return {boolean}
 **/
function apiEvalHasResult(result) {
  if (result.parse && result.parse.parsetree !== undefined) {
    return true;
  } else if (result.expandframe && result.expandframe.result !== undefined) {
    return true;
  }
  return false;
}

/**
 * Returns the wikitext from a valided result obtained from an apiEval call.
 *
 * Note that this assumes an "OK" result and that apiEvalHasResult was true.
 *
 * @param {object} result The object returned from the apiEval call, JSON-decoded.
 * @return {string}
 **/
function apiEvalGetResult(result) {
  if (result.parse && result.parse.parsetree !== undefined) {
    return result.parse.parsetree;
  }
  return result.expandframe.result;
}

/**
 * Asks the wiki API to return the raw content of the given page.
 *
 * @param {string} t The page title to parse; it will be URI-encoded.
 * @param {function} callback Receives 1 or 2 args with the JSON-encoded result, as per doPost.
 **/
function apiGetPage(t, callback) {
  var args =
    "action=query&format=json&prop=revisions&rvprop=content&titles=" +
    encodeURIComponent(t);
  var url = document.getElementById("dt-api").value;
  doPost(url, args, callback);
}

/**
 * Asks the wiki API to return the full name of the template being invoked.
 *
 * @param {string} t Template name.
 * @param {function} callback Receives 1 or 2 args with the JSON-encoded result, as per doPost.
 **/
function apiGetTemplateName(t, callback) {
  var args =
    "action=parse&format=json&prop=templates&contentmodel=wikitext&text=" +
    encodeURIComponent(t);
  var url = document.getElementById("dt-api").value;
  doPost(url, args, callback);
}

//===============================PARSING==========================
//================================================================
//================================================================
/**
 * Retrieves an XML parser, or null if it cannot find one.
 *
 * @return {function|null}
 **/
function getXMLParser() {
  if (typeof window.DOMParser != "undefined") {
    return function(xmlStr) {
      return new window.DOMParser().parseFromString(xmlStr, "text/xml");
    };
  }
  return null;
}

function getAst(node, parent = null) {
  if (!node) return null;
  let n = {
    type: node.tagName,
    value: node.nodeValue,
    children: [],
    id: nindex++,
    parent
  };
  node.childNodes.forEach(c => n.children.push(getAst(c, node)));
  return n;
}

function mapAstToSrc(ast, src) {
  debugger;
  let { templatesAndParams, unmatchedBracket } = extractTemplatesAndParams(ast);
  let stack_ast = [];
  let stack_src = [];
  let ast_i = 0;
  let src_i = 0;

  while (ast_i < templatesAndParams.length) {
    stack_ast.push(templatesAndParams[ast_i]);
    let curr = templatesAndParams[ast_i];
    ast_i++;
    let { expectedStart, expectedEnd, expectedStartLen } = getExpectedPattern(
      curr
    );

    // match start
    while (src_i < src.length) {
      if (expectedStartLen == -1) {
        // non-empty name/value in part
        curr.start = src_i;
        break;
      }
      if (
        expectedStartLen >= 0 &&
        src.substr(src_i, expectedStartLen) == expectedStart
      ) {
        if (curr.type == "ext") {
          let src_j = src_i + expectedStartLen;
          while (src.charAt(src_j) == " ") src_j++;
          if (src.charAt(src_j) == ">") {
            curr.start = src_i;
            src_i = src_j + 1;
            break;
          }
        }

        curr.start = src_i;
        src_i += expectedStartLen;
        break;
      }
      src_i++;
    }

    if (
      curr.type == "unmatchedBracket" ||
      curr.type == "assignmentSign" ||
      expectedStartLen == 0
    ) {
      // unmatched bracket, empty name/ value in part
      stack_ast.splice(stack_ast.length - 1, 1); // pop
      if (stack_ast.length == 0) continue;
      curr = stack_ast[stack_ast.length - 1];
      ({ expectedStart, expectedEnd, expectedStartLen } = getExpectedPattern(
        curr
      ));
    }

    debugger;
    // match ends
    matchEnd: while (src_i < src.length) {
      let c = src.charAt(src_i);

      if (curr.type == "ext") {
        while (src_i < src.length) {
          if (src.substr(src_i, expectedStartLen + 1) == expectedEnd) {
            let src_j = src_i + expectedStartLen + 1;
            while (src.charAt(src_j) == " ") src_j++;
            if (src.charAt(src_j) == ">") {
              curr.end = src_j;
              src_i = src_j + 1;
              c = src.charAt(src_i);

              stack_ast.splice(stack_ast.length - 1, 1); // pop
              if (stack_ast.length == 0) break matchEnd;
              curr = stack_ast[stack_ast.length - 1];
              ({
                expectedStart,
                expectedEnd,
                expectedStartLen
              } = getExpectedPattern(curr));
              break;
            }
          } else src_i++;
        }
      }

      if (curr.type == "part" || curr.type == "value") {
        // part unfinished
        if (
          curr.type == "part" &&
          templatesAndParams[ast_i] &&
          (templatesAndParams[ast_i].type == "name" ||
            templatesAndParams[ast_i].type == "value")
        )
          break;

        let prev =
          stack_ast[
            curr.type == "part" ? stack_ast.length - 2 : stack_ast.length - 3
          ];
        let prevPattern = getExpectedPattern(prev);
        // part && template/ argument finished
        if (
          src.substr(src_i, prevPattern.expectedStartLen) ==
          prevPattern.expectedEnd
        ) {
          curr.end = src_i - 1;
          stack_ast.splice(stack_ast.length - 1, 1); // pop
          curr = stack_ast[stack_ast.length - 1];
          ({
            expectedStart,
            expectedEnd,
            expectedStartLen
          } = getExpectedPattern(curr));
          continue;
        }
        // internal part finished
        else if (
          c == "|" &&
          templatesAndParams[ast_i] &&
          templatesAndParams[ast_i].type == "part"
        ) {
          curr.end = src_i - 1;
          stack_ast.splice(stack_ast.length - 1, 1); // pop
          if (curr.type == "value") {
            curr = stack_ast[stack_ast.length - 1];
            ({ expectedStart, expectedEnd, expectedStartLen } = curr);
            continue;
          }
          break;
        }
      }
      if (curr.type == "name" && c == "=") {
        curr.end = src_i - 1;
        stack_ast.splice(stack_ast.length - 1, 1); // pop
        break;
      }
      // if (curr.type == "part" && (!templatesAndParams[ast] || ))
      // title
      else if (
        (curr.type == "template" || curr.type == "tplarg") &&
        !curr.children[0].start &&
        c == "|"
      ) {
        curr.children[0].start = curr.start + expectedStartLen;
        curr.children[0].end = src_i - 1;
        break;
      } else if (
        c == "<" &&
        templatesAndParams[ast_i] &&
        templatesAndParams[ast_i].type == "ext"
      )
        break;
      else if (c == "{") break;
      // match next
      else if (c == "}") {
        if (
          expectedStartLen < 0 ||
          src.substr(src_i, expectedStartLen) != expectedEnd
        ) {
          if (
            templatesAndParams[ast_i] &&
            templatesAndParams[ast_i].type == "unmatchedBracket"
          )
            break;
        }
        curr.end = src_i + expectedStartLen - 1;
        // title
        if (curr.type == "template" && !curr.children[0].start) {
          curr.children[0].start = curr.start + 2;
          curr.children[0].end = src_i - 1;
        }
        src_i += expectedStartLen;
        stack_ast.splice(stack_ast.length - 1, 1); // pop
        if (stack_ast.length == 0) break;
        curr = stack_ast[stack_ast.length - 1];
        ({ expectedStart, expectedEnd, expectedStartLen } = getExpectedPattern(
          curr
        ));
      } else src_i++;
    }
  }
  console.log(templatesAndParams);
  return unmatchedBracket;
}

function extractTemplatesAndParams(ast) {
  let templatesAndParams = [];
  let unmatchedBracket = [];

  let stack_tree_explore = [];
  stack_tree_explore.push(ast);
  let curr;
  while (stack_tree_explore.length > 0) {
    curr = stack_tree_explore.splice(stack_tree_explore.length - 1)[0];
    if (
      curr.type == "template" ||
      curr.type == "tplarg" ||
      curr.type == "part" ||
      curr.type == "name" ||
      curr.type == "value" ||
      curr.type == "ext"
    )
      templatesAndParams.push(curr);
    if (curr.value) {
      if (curr.value == "=" && curr.parent && curr.parent.type == "part") {
        templatesAndParams.push({ ...curr, type: "assignmentSign" });
      } else {
        let unmacthed = includesUnmatchedBracket(curr.value);
        if (unmacthed) {
          unmatchedBracket = [...unmatchedBracket, ...unmacthed];
          templatesAndParams = [...templatesAndParams, ...unmacthed];
        }
      }
    }
    if (!curr.children || curr.type == "ext") continue;
    for (let j = curr.children.length - 1; j >= 0; j--) {
      stack_tree_explore.push(curr.children[j]);
    }
  }
  return { templatesAndParams, unmatchedBracket };
}

function getExpectedPattern(node) {
  let expectedStart = "";
  let expectedEnd = "";
  let expectedStartLen = 0;

  switch (node.type) {
    case "template":
      expectedStart = "{{";
      expectedEnd = "}}";
      break;
    case "tplarg":
      expectedStart = "{{{";
      expectedEnd = "}}}";
      break;
    case "unmatchedBracket":
      expectedStart = node.value;
      expectedEnd = "";
      break;
    case "assignmentSign":
      expectedStart = "=";
      expectedEnd = "";
      break;
    case "part":
      expectedStart = "|";
      expectedEnd = "";
      break;
    case "ext":
      expectedStart = "<nowiki";
      expectedEnd = "</nowiki";
      break;
    default:
      break;
  }

  expectedStartLen = expectedStart.length;
  if (
    (node.type == "name" || node.type == "value") &&
    node.children.length != 0
  ) {
    expectedStartLen = -1;
  }
  return { expectedEnd, expectedStart, expectedStartLen };
}

function includesUnmatchedBracket(str) {
  let unmatched = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charAt(i);
    if (c == "{" || c == "}")
      unmatched.push({ type: "unmatchedBracket", value: c });
  }
  if (unmatched.length > 0) return unmatched;
}

let _variables;

async function parserExtensions(ast, src, extensions, url, warnings = []) {
  if (extensions.parserFunctions) {
    await parserExtInTemplateSyntax(ast, src, url, warnings, "parserFunctions");
  }
  if (extensions.variables) {
    _variables = {};
    await parserExtInTemplateSyntax(ast, src, url, warnings, "variables");
  }
  if (extensions.stringFunctions) {
    await parserExtInTemplateSyntax(ast, src, url, warnings, "stringFunctions");
  }
}

// ===================== EXT: variables ============================
// =================================================================
// grammar rules based on https://www.mediawiki.org/wiki/Extension:Variables#Installation
const supportedVariablesUtils = {
  "#vardefine:": "#vardefine:",
  "#vardefineecho:": "#vardefineecho:",
  "#var:": "#var:",
  "#varexists:": "#varexists:",
  "#var_final:": "#var_final:"
};

const variablesUtilsConfigs = {
  "#vardefine:": {
    argCnt: 2,
    nodeType: "#vardefine",
    titleNodeType: "define variable",
    otherNodeTypes: ["specified value"]
  },
  "#vardefineecho:": {
    argCnt: 2,
    nodeType: "#vardefineecho",
    titleNodeType: "define and print variable",
    otherNodeTypes: ["specified value"]
  },
  "#var:": {
    argCntLE: 2,
    nodeType: "#var",
    titleNodeType: "variable",
    otherNodeTypes: ["default value"]
  },
  "#varexists:": {
    argCntLE: 3,
    nodeType: "#varexists",
    titleNodeType: "if var is defined",
    otherNodeTypes: ["then", "else"]
  },
  "#var_final:": {
    argCnt: 2,
    nodeType: "#var_final",
    titleNodeType: "output final value for variable",
    otherNodeTypes: ["default value"]
  }
};

const supportedParserFunctions = {
  "#expr:": "#expr:",
  "#if:": "#if:",
  "#ifeq:": "#ifeq:",
  "#iferror:": "#iferror:",
  "#ifexpr:": "#ifexpr:",
  "#ifexist:": "#ifexist:",
  "#rel2abs:": "#rel2abs:",
  "#switch:": "#switch:",
  "#time:": "#time:",
  "#timel:": "#timel:",
  "#titleparts:": "#titleparts:"
};

const parserFunctionsConfigs = {
  "#expr:": {
    argCnt: 1,
    nodeType: "#expr",
    titleNodeType: "expr",
    otherNodeTypes: []
  },
  "#if:": {
    argCnt: 3,
    nodeType: "#if",
    titleNodeType: "if expr",
    otherNodeTypes: ["then", "else"]
  },
  "#ifeq:": {
    argCnt: 4,
    nodeType: "#ifeq",
    titleNodeType: "if string 1 equals",
    otherNodeTypes: ["string 2", "then", "else"]
  },
  "#iferror:": {
    argCntLE: 3,
    nodeType: "#iferror",
    titleNodeType: "if expr is erroneous",
    otherNodeTypes: ["then", "else"]
  },
  "#ifexpr:": {
    argCnt: 3,
    nodeType: "#ifexpr",
    titleNodeType: "if expr",
    otherNodeTypes: ["then", "else"]
  }, //    {{#ifexpr: expression | value if true | value if false }}
  "#ifexist:": {
    argCnt: 3,
    nodeType: "#ifexist",
    titleNodeType: "if page exists",
    otherNodeTypes: ["then", "else"]
  }, //{{#ifexist: page title | value if exists | value if doesn't exist }}
  "#rel2abs:": {
    argCntLE: 2,
    nodeType: "#rel2abs",
    titleNodeType: "convert path",
    otherNodeTypes: ["base path"]
  }, //{{#rel2abs: path }} {{#rel2abs: path | base path }}
  "#switch:": {
    nodeType: "#switch",
    titleNodeType: "switch on expr",
    otherNodeTypes: []
  }, //{{#switch: comparison string
  //| case = result
  //| case = result
  //| ...
  //| case = result
  //| default result
  //}}

  "#time:": {
    argCntLE: 4,
    nodeType: "#time",
    titleNodeType: "format string",
    otherNodeTypes: ["date/time object", "language code", "local"]
  }, //{{#time: format string }}
  //{{#time: format string | date/time object }}
  //{{#time: format string | date/time object | language code }}
  //{{#time: format string | date/time object | language code | local }}
  "#timel:": {
    argCntLE: 3,
    nodeType: "#timel",
    titleNodeType: "format string",
    otherNodeTypes: ["date/time object", "language code"]
  }, // {{#timel: format string }}
  // {{#timel: format string | date/time object }}
  // {{#timel: format string | date/time object | language code }}
  "#titleparts:": {
    argCnt: 3,
    nodeType: "#titleparts",
    titleNodeType: "get parts of title",
    otherNodeTypes: ["number of segments", "first segment"]
  } //{{#titleparts: pagename | number of segments to return | first segment to return }}
};

const supportedStringFunctions = {
  "#len:": "#len:",
  "#pos:": "#pos:",
  "#rpos:": "#rpos:",
  "#sub:": "#sub:",
  "padleft:": "padleft:",
  "padright:": "padright:",
  "#replace:": "#replace:",
  "#explode:": "#explode:"
};
//#urlencode #urldecode not supported
const stringFunctionsConfigs = {
  "#len:": {
    argCnt: 1,
    nodeType: "#len",
    titleNodeType: "length of str",
    otherNodeTypes: []
  },
  "#pos:": {
    argCntLE: 3,
    nodeType: "#pos",
    titleNodeType: "search in str",
    otherNodeTypes: ["search term", "offset"]
  },
  "#rpos:": {
    argCnt: 2,
    nodeType: "#rpos",
    titleNodeType: "search in str",
    otherNodeTypes: ["search term"]
  },
  "#sub:": {
    argCntLE: 3,
    nodeType: "#sub",
    titleNodeType: "substring",
    otherNodeTypes: ["start", "length"]
  },
  "#replace:": {
    argCnt: 3,
    nodeType: "#replace",
    titleNodeType: "replace pattern in str",
    otherNodeTypes: ["pattern", "replacement term"]
  },
  "#explode:": {
    argCntLE: 4,
    nodeType: "#explode",
    titleNodeType: "split str",
    otherNodeTypes: ["delimiter", "position", "limit"]
  },
  "padleft:": {
    argCntLE: 3,
    nodeType: "padleft",
    titleNodeType: "insert padding",
    otherNodeTypes: ["length", "padstring"]
  },
  "padright:": {
    argCntLE: 3,
    nodeType: "padright",
    titleNodeType: "insert padding",
    otherNodeTypes: ["length", "padstring"]
  }
};
const extConfigs = {
  parserFunctions: {
    supportedUtils: supportedParserFunctions,
    configs: parserFunctionsConfigs
  },
  variables: {
    supportedUtils: supportedVariablesUtils,
    configs: variablesUtilsConfigs
  },
  stringFunctions: {
    supportedUtils: supportedStringFunctions,
    configs: stringFunctionsConfigs
  }
};
// ===================== EXT: parser functions =====================
// =================================================================
// grammar rules based on https://www.mediawiki.org/wiki/Help:Extension:ParserFunctions

async function parserExtInTemplateSyntax(ast, src, url, warnings, ext) {
  if (ast.type == "template") {
    let title = await getTitle(ast.children[0], url, src);
    title = title.trim();
    for (let func in extConfigs[ext].supportedUtils) {
      if (title.substr(0, func.length) == func) {
        await parserFunc(ext, func, ast, src, url, warnings);
        break;
      }
    }
  }
  await Promise.all(
    ast.children.map(async c => {
      await parserExtInTemplateSyntax(c, src, url, warnings, ext);
    })
  );
}

function parsePartToParamForparserFunc(branch) {
  let oc = branch.children;
  branch.children = [...oc[0].children];
  if (oc.length == 3) {
    branch.children.push({ id: oc[1].id, value: "=", children: [] });
    branch.children = [...branch.children, ...oc[2].children];
  } else if (oc.length == 2)
    branch.children = [...branch.children, ...oc[1].children];

  // merge
  let i = 1;
  while (i < branch.children.length) {
    let prev = branch.children[i - 1];
    let curr = branch.children[i];
    if (prev.value != undefined && curr.value != undefined) {
      prev.value += curr.value;
      branch.children.splice(i, 1);
    } else i++;
  }
}

let parserFunc = async (ext, func, ast, src, url, warnings) => {
  // ast._eval = await apiEvalAsync(
  //   src.substring(ast.start, ast.end + 1),
  //   "",
  //   url
  // );

  let titleNode = ast.children[0];
  let title = await getTitle(titleNode, url, src);
  title = title.trim();
  let titleExpStr = title.substring(func.length);

  titleNode._str = titleExpStr;
  let titleExpEval = await apiEvalAsync(titleExpStr, "", url);
  titleNode._eval = titleExpEval;

  let config = extConfigs[ext].configs[func];
  ast.type = config.nodeType;
  titleNode.type = config.titleNodeType;

  // check param number
  if (config.argCnt && ast.children.length != config.argCnt) {
    warnings.push({
      start: ast.start,
      end: ast.end,
      warning: `${func} function has ${
        ast.children.length
      } arguments, it should have ${config.argCnt} arguments.`
    });
  } else if (config.argCntLE && ast.children.length > config.argCntLE) {
    warnings.push({
      start: ast.start,
      end: ast.end,
      warning: `${func} function has ${
        ast.children.length
      } arguments, it should have at most ${config.argCntLE} arguments.`
    });
  }

  for (let i = 0; i < config.otherNodeTypes.length; i++) {
    let child = ast.children[i + 1];
    if (!child) break;
    child.type = config.otherNodeTypes[i];
    parsePartToParamForparserFunc(child);
  }

  // eval each Function
  if (ext == "parserFunctions") {
    switch (func) {
      case "#expr:":
        break;
      case "#if:": {
        let evalResult = titleNode._eval.trim();
        if (!!evalResult) {
          if (ast.children[1]) ast.children[1]._highlight = true;
        } else {
          if (ast.children[2]) ast.children[2]._highlight = true;
        }
        break;
      }
      case "#ifeq:": {
        let strRNode = ast.children[1];
        if (strRNode) {
          // string Right
          let strR = src.substring(strRNode.start + 1, strRNode.end + 1);
          let evalStrR = await apiEvalAsync(strR, "", url);
          strRNode._src = strR;
          strRNode._eval = evalStrR;
        }

        if (!strRNode) break;
        let str1 = titleNode._eval.trim();
        let str2 = strRNode._eval.trim();
        let evalResult = false;
        if (str1 == str2) evalResult = true;
        // If both strings are valid numerical values, the strings are compared numerically.
        // "^" is XOR in javascript, "10^3" is a valid number in javascript but not in wikitext.
        else if (str1.indexOf("^") < 0 && str2.indexOf("^") < 0) {
          let num1 = Number.parseFloat(str1);
          let num2 = Number.parseFloat(str2);
          if (!isNaN(num1) && !isNaN(num2) && num1 == num2) evalResult = true;
        }

        let branchA = ast.children[2];
        let branchB = ast.children[3];
        if (evalResult) {
          if (branchA) branchA._highlight = true;
        } else {
          if (branchB) branchB._highlight = true;
        }
        break;
      }
      case "#iferror:": {
        let errStr = titleNode._eval.trim();
        let evalResult = isErrorMeg(errStr);

        let branchA = ast.children[1];
        let branchB = ast.children[2];
        if (evalResult) {
          if (branchA) branchA._highlight = true;
        } else {
          if (branchB) branchB._highlight = true;
          else titleNode._highlight = true;
        }
        break;
      }
      case "#ifexpr:": {
        let evalExp = `{{#expr:${titleExpStr}}}`;
        let expResult = await apiEvalAsync(evalExp, "", url);
        expResult = expResult.trim();
        let evalResult = false;
        if (!!expResult && expResult != "0" && !isErrorMeg(expResult))
          evalResult = true;

        let branchA = ast.children[1];
        let branchB = ast.children[2];
        if (evalResult) {
          if (branchA) branchA._highlight = true;
        } else {
          if (branchB) branchB._highlight = true;
        }
        break;
      }
      case "#ifexist:": {
        // unreliable result.
        // no highlighted node
        // is considered an "expensive parser function"; only a limited number of which can be included on any one page (including functions inside transcluded templates). When this limit is exceeded, any further #ifexist: functions automatically return false, whether the target page exists or not
        break;
      }
      case "#rel2abs:": {
        // no highlighted node
        break;
      }
      case "#switch:": {
        let highlightedCase = -1;
        let defaultCase;
        for (let i = 1; i < ast.children.length; i++) {
          let child = ast.children[i];
          if (!child) break;
          child.type = "case";

          let nameNode = child.children[0];
          if (child.children.length == 3) {
            if (nameNode.length == 0) {
              // name is an empty str
              if (titleNode._eval.trim() == "") {
                highlightedCase = i;
              }
            } else {
              // name is not empty
              child._eval = await apiEvalAsync(
                src.substring(nameNode.start, nameNode.end + 1),
                "",
                url
              );
              child._eval = child._eval.replace("&#61;", "=");
              if (child._eval.trim() == "#default") {
                child.type = "default case";
                defaultCase = child;
              } else if (child._eval.trim() == titleNode._eval.trim()) {
                highlightedCase = i;
              }
            }
          } else {
            if (i == ast.children.length - 1) {
              child.type = "default case";
              defaultCase = child;
            }
            // defaultCase
            else {
              child._eval = await apiEvalAsync(
                src.substring(
                  child.children[1].start,
                  child.children[1].end + 1
                ),
                "",
                url
              );
              child._eval = child._eval.replace("&#61;", "=");
              if (child._eval.trim() == titleNode._eval.trim()) {
                highlightedCase = i;
              }
            } // fall through
          }
        }
        if (highlightedCase >= 1)
          ast.children[highlightedCase]._highlight = true;
        else if (defaultCase) defaultCase._highlight = true;

        break;
      }
      case "#time:":
        // no highligh needed
        break;
      case "#timel:":
        // no highligh needed
        break;
      case "#titleparts:":
        break;
      default:
    }
  } else if (ext == "variables") {
    switch (func) {
      case "#vardefine:": {
        let varName = titleNode._eval.trim();
        _variables[varName] = true;
        break;
      }

      case "#vardefineecho:": {
        let varName = titleNode._eval.trim();
        _variables[varName] = true;
        break;
      }
      case "#var:": {
        let varName = titleNode._eval.trim();
        if (!_variables[varName] && ast.children.length >= 2) {
          ast.children[1]._highlight = true;
          _variables[varName] = true;
        }
        break;
      }
      case "#varexists:": {
        let varName = titleNode._eval.trim();
        if (_variables[varName] && ast.children.length >= 2) {
          ast.children[1]._highlight = true;
        } else if (!_variables[varName] && ast.children.length >= 3) {
          ast.children[2]._highlight = true;
        }
        break;
      }
      case "#var_final:": {
        let varName = titleNode._eval.trim();
        if (!_variables[varName] && ast.children.length >= 2)
          ast.children[1]._highlight = true;
        break;
      }
      default:
    }
  }
};

function isErrorMeg(errStr) {
  if (
    errStr.indexOf("<") >= 0 &&
    errStr.indexOf(">") > 11 &&
    errStr.indexOf("error") > 6 &&
    errStr.indexOf("class") > 1
  ) {
    try {
      // TODO: is the call blocking?
      let domNode = getXMLParser()(errStr);
      if (
        domNode.childNodes &&
        domNode.childNodes[0] &&
        domNode.childNodes[0].classList.contains("error")
      ) {
        return true;
      }
    } catch (err) {}
  }
}

// =================================================================
// get title value of template/ arg
async function getTitle(titleNode, url, src) {
  if (!titleNode._value) {
    let titleSrc = src.substring(titleNode.start, titleNode.end + 1);
    titleNode._value = await apiEvalAsync(titleSrc, "", url);
  }
  return titleNode._value;
}
