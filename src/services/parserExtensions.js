import { apiEvalAsync } from "./api.js";
let _variables;

export async function parserExtensions(
  ast,
  src,
  extensions,
  url,
  warnings = []
) {
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
    ast.children.map(async child => {
      await parserExtInTemplateSyntax(child, src, url, warnings, ext);
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
  } else if (ext == "stringFunctions") {
    // switch (func) {
    //   case "#len:": {
    //     break;
    //   }
    //   case "#pos:": {
    //     break;
    //   }
    //   case "#rpos:": {
    //     break;
    //   }
    //   case "#sub:": {
    //     break;
    //   }
    //   case "padleft:": {
    //     break;
    //   }
    //   case "padright:": {
    //     break;
    //   }
    //   case "#replace:": {
    //     break;
    //   }
    //   case "#explode:": {
    //     break;
    //   }
    //   default:
    // }
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
