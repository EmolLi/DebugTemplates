/**
 * JS code for all the interactive parts of the special page
 *
 * @author Clark Verbrugge, Duan Li
 * @license CC BY-SA 3.0
 **/
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
    Icon
  } = antd;
  const { TextArea, Search } = Input;
  const { Title, Paragraph, Text } = Typography;
  const { TreeNode } = Tree;

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
  class App extends React.Component {
    state = {
      src:
        "{{Test|p1={{Test|p2=ddd}}}} {{Test|p1={p2|p}=22}|o3={dd}|d{=p3|ddd}}",
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
      params: []
    };
    evalResult = async (src = this.state.src, title = this.state.title) => {
      const { url, params } = this.state;
      console.log(params, "   params");
      try {
        debugger;
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
      const { src, title, url } = this.state;
      apiParse(src, title, url, (k, t) => {
        if (k == "OK") {
          var result = window.JSON.parse(t);
          if (result.parse && result.parse.parsetree) {
            let ast = result.parse.parsetree["*"]
              ? getXMLParser()(result.parse.parsetree["*"])
              : null;
            nindex = 0;
            let treeView = getAst(ast.children[0]);
            let unmatchedBracket = mapAstToSrc(treeView, src);

            this.setState({ treeView: treeView, errors: "", unmatchedBracket });
            console.log(treeView);
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
      const { selectedNode, url, src, stepHistory } = this.state;
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
        this.setState(
          {
            title,
            stepHistory: [
              ...stepHistory,
              {
                title,
                params
              }
            ],
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
      console.log("selected", selectedKeys, info);
    };

    generateTreeNode(node) {
      return (
        <TreeNode
          title={`${node.type ? node.type : ""}${
            node.type && node.value ? " " : ""
          }${node.value ? node.value : ""}`}
          key={node.id}
          node={node}
        >
          {node.children.length > 0 &&
            node.children.map(c => this.generateTreeNode(c))}
        </TreeNode>
      );
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
      if (!inputHighlight) return <Text>{src}</Text>;
      return (
        <React.Fragment>
          {inputHighlight[0] > 0 && (
            <Text disabled>{src.substring(0, inputHighlight[0])}</Text>
          )}
          <Text>{src.substring(inputHighlight[0], inputHighlight[1] + 1)}</Text>
          {inputHighlight[1] < src.length - 1 && (
            <Text disabled>{src.substring(inputHighlight[1] + 1)}</Text>
          )}
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
          <Search
            placeholder="Template Title"
            value={title}
            onChange={e => this.setState({ title: e.target.value })}
            onSearch={this.getTemplateSource}
            enterButton
          />
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
            {unmatchedBracket.length > 0 &&
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
              {stepHistory.length > 1 && (
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
              )}
              {this.ParamsTable()}
              <div>
                <div id="debugger-result">
                  <Title level={4} type="secondary">
                    Result
                  </Title>
                  <div id="debugger-result-content">
                    <Paragraph>{result}</Paragraph>
                  </div>
                </div>
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

/**
 * *************************
 * Global variables section.
 *****************************
 **/

// For indexing the displayed HTML nodes with unique numbers used in highlighting.
var nindex = 0;
// For indexexing AST nodes with unique numbers.
var xindex = 0;
// Mapping from nindex to xindex.
var nTox = [];
// Root of the AST.
var ast;
// Array of things done for undoing.  Each entry is a string or an array of strings.// Constant: timeout interval in ms used in making sequences of API calls.
var apiCallInterval = 30;

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
  let args = "action=expandframe&format=json";
  if (title) {
    args = args + "&title=" + encodeURIComponent(title);
  }
  args = args + "&text=" + encodeURIComponent(src);
  if (params && params.length > 0) {
    let p = {};
    params.forEach(k => (p[k.name] = k.value));
    console.log(p);
    args = args + "&frame=" + encodeURIComponent(JSON.stringify(p));
    console.log(args);
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

/**
 * Returns an HTML element for the given text.
 *
 * This may be a single text node, or a span with <br>'s inserted to mimic linebreaks.
 *
 * @param {string} txt Input plain text, possibly with linebreaks.
 * @param {string|null} cname Optional class name to put on the multi-line structure.
 * @return {HTMLElement}
 **/
function textWithLinebreaks(txt, cname) {
  var s = txt.split("\n");
  if (s.length <= 1) {
    return document.createTextNode(s[0]);
  }
  var h = document.createElement("span");
  if (cname) {
    h.className = cname;
  }
  h.appendChild(document.createTextNode(s[0]));
  for (var i = 1; i < s.length; i++) {
    h.appendChild(document.createElement("br"));
    h.appendChild(document.createTextNode(s[i]));
  }
  return h;
}

/**
 * Cleans up the given text for transcluding by parsing through the includeonly, onlyinclude, and
 * noinclude tags and extracting what would be included.
 *
 * @param {string} text
 * @return {string}
 **/
function transcludeText(text) {
  return transcludeOnlyInclude(text);
}

/**
 * Clean up the given text by extracting any <onlyinclude> blocks, and then processing
 * the remainder for includeonly and noinclude.
 *
 * @param {string} text
 * @param {boolean} imeanit If true this indicates to return nothing if no <onlyinclude> blocks are
 *  found.  Used in recursive calls.
 * @return {string}
 **/
function transcludeOnlyInclude(text, imeanit) {
  var re = new RegExp("^((?:.|\\n)*?)(<onlyinclude\\s*/?>)((?:.|\\n)*)$", "i");
  var m = re.exec(text);
  if (!m) {
    // No onlyinclude tag found
    if (imeanit) {
      return "";
    }
    return transcludeNoAndOnly(text);
  }
  if (m[2].indexOf("\\/>") > 0) {
    // Singleton tag
    return transcludeOnlyInclude(m[3], true);
  }
  // Look for a closing tag
  // Note this is more restrictive, and not case-insensitive
  var reEnd = new RegExp("^((?:.|\\n)*?)(</onlyinclude>)((?:.|\\n)*)$", "");
  var mm = reEnd.exec(m[3]);
  if (!mm) {
    // No closing tag---opening tag doesn't count then
    if (imeanit) {
      return "";
    }
    return transcludeNoAndOnly(text);
  }
  // Ok, found some included text (contained in mm[1]), look for any more
  return transcludeNoAndOnly(mm[1]) + transcludeOnlyInclude(mm[3], true);
}

/**
 * Clean up the given text by removing <noinclude> blocks and discarding <includeonly> tags.
 *
 * @param {string} text
 * @return {string}
 **/
function transcludeNoAndOnly(text) {
  var rc = "";
  var re = new RegExp("^((?:.|\\n)*?)(<noinclude\\s*/?>)((?:.|\\n)*)$", "i");
  var reIO = new RegExp("<includeonly\\s*/?>", "ig");
  var m = re.exec(text);
  if (!m) {
    // No noinclude tags
    return text.replace(reIO, "").replace("</includeonly>", "");
  }
  var singleTag = m[2].indexOf("\\/>") > 0;

  // Certainly have the text prior to the tag
  rc = m[1].replace(reIO, "").replace("</includeonly>", "");

  // We have an outer noinclude.  Look for a closing tag, discard the enclosed text,
  //  and recurse on the remainder.
  // Note more restrictive, and not case-insensitive
  var reEnd = new RegExp("^((?:.|\\n)*?)(</noinclude>)((?:.|\\n)*)$", "");
  var mm = reEnd.exec(m[3]);
  if (!mm) {
    // No closing tag---assume it continues to the end
    return rc;
  }
  return rc + transcludeNoAndOnly(mm[3]);
}

/**
 * Callback function which updates the view given the XML derived from the raw input.
 *
 * @param {string} x Well-formed XML as a string
 * @param {Object|null} inheritparams An optional set of parameters and their defined values which should
 *  be included in the list of input parameters constructed.
 **/
function updateFromXML(x, inheritparams) {
  var i, pname;
  // First parse the xml and build an AST
  ast = x === "" ? null : getXMLParser()(x);

  // // Wipe out the global var of previous params and define a new set
  // params = [];
  //
  // // Now extract all the parameters in the AST so we can build our parameter list
  // var newparams = {};
  // var astparams = null;
  // if (ast) {
  //   astparams = ast.getElementsByTagName("tplarg");
  //   if (astparams) {
  //     for (i = 0; i < astparams.length; i++) {
  //       pname = getParamName(astparams[i], i);
  //       if (newparams[pname] === undefined) {
  //         newparams[pname] = true;
  //         params.push({ name: pname, row: 0, used: true });
  //       }
  //     }
  //   }
  // }
  // // Add in any in inheritparams
  // if (inheritparams) {
  //   for (var p in inheritparams) {
  //     pname = p.trim();
  //     if (newparams[pname] === undefined) {
  //       newparams[pname] = true;
  //       params.push({ name: pname, row: 0 });
  //     }
  //   }
  // }
  // // Now sort them alphabetically
  // params.sort(function(a, b) {
  //   return a.name.localeCompare(b.name);
  // });
  // // Create the mapping from AST nodes to their entry in the param array
  // if (astparams) {
  //   for (i = 0; i < astparams.length; i++) {
  //     pname = getParamName(astparams[i], i);
  //     // Look for it in our list of params
  //     for (var j = 0; j < params.length; j++) {
  //       if (params[j].name == pname) {
  //         // Set the 'pindex' property to the row number
  //         astparams[i].setAttribute("pindex", j);
  //         break;
  //       }
  //     }
  //   }
  // }
  //
  // // Construct the params array
  // updateParams(params, inheritparams);
  // Construct the output
  htmlFromAST(ast);
}

/**
 * Extracts a parameter name from a <tplarg> AST node.
 *
 * @param {XMLElement} node
 * @param {number|string} i Unique index used to help form a unique name when the parameter name is a
 *  constructed one.
 * @return {string}
 **/
function getParamName(node, i) {
  // This should not happen...
  if (!node.firstChild.firstChild) {
    return "";
  }
  // If the name itself is tree then we cannot determine the name until it has been fully parsed, so we
  //  make something up using the unique index number given.
  if (
    node.firstChild.childNodes.length > 1 ||
    node.firstChild.firstChild.nodeValue === null
  ) {
    return "<" + mw.message("debugtemplates-args-constructed") + i + ">";
  }
  return node.firstChild.firstChild.nodeValue.trim();
}

/**
 * Retrieves the manual value the user has associated with a parameter in the displayed list of
 * parameters.
 *
 * @param {number} pindex Row number of the corresponding parameter in the params array
 * @return {string|null} May return an empty string, so null is used to indicate a parameter that has not
 *  been set
 **/
function getParamText(pindex) {
  var rownum = params[pindex].row;
  var row = document.getElementById("dt-argtable-row-number-" + rownum);
  var ptext = row.cells[2].firstChild;
  if (ptext.classList.contains("dt-arg-set-yes")) {
    return ptext.value;
  }
  return null;
}

/**
 * Retrieves the DOM cell associated with the manual value of a parameter in the displayed list of
 * parameters.
 *
 * @param {string} name The name of the parameter
 * @param {HTMLElement|null} argtable The DOM node for the argtable <tbody>
 * @return {HTMLElement|null} Can return null if not found
 **/
function getParamValue(name, argtable) {
  if (!argtable) {
    return null;
  }
  for (var i = 0; i < argtable.rows.length; i++) {
    var celln = argtable.rows[i].cells[1].firstChild;
    if (celln.nodeValue == name) {
      return argtable.rows[i].cells[2].firstChild;
    }
  }
  return null;
}

/**
 * Reconstructs the list of available parameters being displayed.
 *
 * @param {object} params The new set of parameters
 * @param {object|null} inheritparams The set of name -> value mappings that should initialize the displayed value
 **/
function updateParams(params, inheritparams) {
  var argtable = document.getElementById("dt-argtable");
  var eall = mw.message("debugtemplates-args-eval-all");
  // We are going to replace the entire table body and wipe out the existing one
  var new_tbody = document.createElement("tbody");
  // There may not be a tbody, so it can be null
  var old_tbody = argtable.getElementsByTagName("tbody");
  if (old_tbody) {
    old_tbody = old_tbody[0];
  }

  // Now construct each row from a param
  for (var i = 0; i < params.length; i++) {
    var oldval = getParamValue(params[i].name, old_tbody);
    var row = document.createElement("tr");

    // First cell is the set/unset status
    var c = document.createElement("td");
    c.className = "dt-arg-centered";
    // Create a toggle-able boolean value
    var span = document.createElement("span");
    if (
      (inheritparams && inheritparams[params[i].name] !== undefined) ||
      (oldval !== null && oldval.classList.contains("dt-arg-set-yes"))
    ) {
      span.appendChild(document.createTextNode(argy));
    } else {
      span.appendChild(document.createTextNode(argn));
    }
    span.addEventListener("click", paramSetHandler, false);
    c.appendChild(span);
    row.appendChild(c);

    // Then create the parameter name
    c = document.createElement("td");
    c.appendChild(document.createTextNode(params[i].name));
    row.appendChild(c);

    // The parameter value is a textarea since it can be large, multiline text
    c = document.createElement("td");
    span = document.createElement("textarea");
    if (
      (inheritparams && inheritparams[params[i].name] !== undefined) ||
      (oldval !== null && oldval.classList.contains("dt-arg-set-yes"))
    ) {
      span.setAttribute("class", "dt-arg-set-yes");
    } else {
      span.setAttribute("class", "dt-arg-set-no");
    }
    if (inheritparams && inheritparams[params[i].name] !== undefined) {
      span.value = inheritparams[params[i].name];
    } else if (oldval !== null) {
      span.value = oldval.value;
    } else {
      span.value = "";
    }
    span.style.width = "95%";
    c.appendChild(span);
    row.appendChild(c);

    // Then create the eval-all-instances button
    c = document.createElement("td");
    c.className = "dt-arg-centered";
    span = document.createElement("input");
    span.setAttribute("type", "button");
    span.setAttribute("value", eall);
    span.addEventListener("click", paramEval, false);
    c.appendChild(span);
    row.appendChild(c);

    // Ensure the params entry's row field is correct
    row.setAttribute("id", "dt-argtable-row-number-" + i);
    if (!params[i].used) row.classList.add("dt-arg-unused");
    new_tbody.appendChild(row);
    params[i].row = i;
  }
  var prev = argtable.getElementsByTagName("tbody")[0];
  if (prev) {
    argtable.replaceChild(new_tbody, prev);
  } else {
    argtable.appendChild(new_tbody);
  }
}

/**
 * Main entry point to construct the DOM tree from the AST and install it in the output pane.
 *
 * @param {XMLElement|null} ast
 **/
function htmlFromAST(ast) {
  // Reset our maximum index values and mappings between unique id numbers
  nindex = 0;
  nTox = {};
  xindex = 0;
  // No undo is possible after this
  // resetButtonNode.setAttribute("disabled", "disabled");
  // undoButtonNode.setAttribute("disabled", "disabled");
  if (ast && ast.documentElement) {
    var oh = htmlFromAST_r(ast.documentElement);
    // setOutput(oh);
  }
}

function getAst(node) {
  if (!node) return null;
  let n = {
    type: node.tagName,
    value: node.nodeValue,
    children: [],
    id: nindex++
  };
  node.childNodes.forEach(c => n.children.push(getAst(c)));
  return n;
}

function mapAstToSrc(ast, src) {
  let { templatesAndParams, unmatchedBracket } = extractTemplatesAndParams(ast);
  console.log(templatesAndParams);
  debugger;
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
      if (stack_ast.length == 0) break;
      curr = stack_ast[stack_ast.length - 1];
      ({ expectedStart, expectedEnd, expectedStartLen } = getExpectedPattern(
        curr
      ));
    }

    // match ends
    while (src_i < src.length) {
      let c = src.charAt(src_i);

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
      } else if (c == "{") break;
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
          console.log("err");
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
      curr.type == "value"
    )
      templatesAndParams.push(curr);
    if (curr.value) {
      if (curr.value == "=") {
        templatesAndParams.push({ ...curr, type: "assignmentSign" });
      } else {
        let unmacthed = includesUnmatchedBracket(curr.value);
        if (unmacthed) {
          unmatchedBracket = [...unmatchedBracket, ...unmacthed];
          templatesAndParams = [...templatesAndParams, ...unmacthed];
        }
      }
    }
    if (!curr.children) continue;
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
/**
 * Handler for the parameter eval-all buttons.
 **/
function paramEval() {
  if (busy) {
    return;
  }
  this.setAttribute("disabled", "disabled");
  var row = this.parentNode.parentNode;
  var pname = row.childNodes[1].firstChild;
  if (!pname) {
    return;
  }
  setBusy(true);
  // We need to know our row number
  var rown = row.id.replace(/[^0-9]*/g, "");
  // Look through all the parameters displayed
  var instances = document.getElementsByClassName("dt-node-tplarg");
  // Start off a chain of individual lookups
  if (instances) {
    paramEvalNext(0, instances, rown);
  } else {
    setBusy(false);
  }
}
