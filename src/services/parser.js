/**
 * Retrieves an XML parser, or null if it cannot find one.
 *
 * @return {function|null}
 **/
export function getXMLParser() {
  if (typeof window.DOMParser != "undefined") {
    return function(xmlStr) {
      return new window.DOMParser().parseFromString(xmlStr, "text/xml");
    };
  }
  return null;
}

export function getAst(node) {
  let nindex = 0;
  function _getAst(node, parent) {
    if (!node) return null;
    let n = {
      type: node.tagName,
      value: node.nodeValue,
      children: [],
      id: nindex++,
      parent
    };
    node.childNodes.forEach(c => n.children.push(_getAst(c, n)));
    return n;
  }
  return _getAst(node, null);
}

export function mapAstToSrc(ast, src) {
  let { templatesAndParams } = extractTemplatesAndParams(ast);
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
          } else if (src.substr(src_j, 2) == "/>") {
            // <nowiki /> self closing tag
            curr.start = src_i;
            curr.end = src_j + 1;
            src_i = src_j + 2;
            expectedStartLen = 0;
            break;
          }
        }

        curr.start = src_i;
        src_i += expectedStartLen;
        break;
      }
      src_i++;
    }

    if (!curr.type || expectedStartLen == 0) {
      curr.end = src_i - 1;
      // unmatched bracket, empty name/ value in part
      stack_ast.splice(stack_ast.length - 1, 1); // pop
      if (stack_ast.length == 0) continue;
      curr = stack_ast[stack_ast.length - 1];
      ({ expectedStart, expectedEnd, expectedStartLen } = getExpectedPattern(
        curr
      ));
    }

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
        // if (ast_i == 49) debugger;
        // if (curr.id == 56) debugger;
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
        templatesAndParams[ast_i].type == "ext" &&
        isExtBeginTag(src, src_i, templatesAndParams[ast_i])
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
            !templatesAndParams[ast_i].type &&
            templatesAndParams[ast_i].value.charAt(0) == "}"
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
      } else {
        if (templatesAndParams[ast_i] && !templatesAndParams[ast_i].type) {
          let {
            expectedEnd,
            expectedStart,
            expectedStartLen
          } = getExpectedPattern(templatesAndParams[ast_i]);
          if (src.substr(src_i, expectedStartLen) == expectedStart) break;
        } else src_i++;
      }
    }
  }
  console.log(templatesAndParams);
}

function isExtBeginTag(src, i, extNode) {
  let { expectedEnd, expectedStart, expectedStartLen } = getExpectedPattern(
    extNode
  );
  if (src.substr(i, expectedStartLen) != expectedStart) return false;
  let j = i + expectedStartLen;
  while (j < src.length && src.charAt(j) == " ") j++;
  if (j == src.length) return false;
  if (src.charAt(j) == ">") return true;
  if (src.substr(j, 2) == "/>") return true;
  return false;
}

function extractTemplatesAndParams(ast) {
  let templatesAndParams = [];

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

    if (curr.type == "ext") curr._extType = getExtType(curr);

    if (!curr.type && curr.value) {
      templatesAndParams.push(curr);
    }

    if (!curr.children || curr.type == "ext") continue;
    for (let j = curr.children.length - 1; j >= 0; j--) {
      stack_tree_explore.push(curr.children[j]);
    }
  }
  return { templatesAndParams };
}

function getExtType(node) {
  let extType = node.children[0].children[0].value;
  return extType;
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
    case null:
    case undefined:
      expectedStart = node.value;
      expectedEnd = "";
      break;
    case "part":
      expectedStart = "|";
      expectedEnd = "";
      break;
    case "ext":
      expectedStart = "<" + node._extType;
      expectedEnd = "</" + node._extType;
      break;
    default:
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
