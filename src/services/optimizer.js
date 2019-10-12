// const
export function detectCodeCloneASTSuffix(ast) {
  // flatten to node sequence
}

// special node token
const END_OF_BRANCH = {
  type: "END_OF_BRANCH",
  value: "",
  children: [],
  id: -1,
  parent: null
};

const END = {
  type: "END",
  value: "",
  children: [],
  id: -1,
  parent: null
};

const BeginToken = id => ({
  type: "BEGIN_TOKEN",
  value: "",
  children: [],
  id,
  parent: null
});

const EndToken = id => ({
  type: "END_TOKEN",
  value: "",
  children: [],
  id,
  parent: null
});

function flattenToNodeSequences(ast) {
  let seq = [];
  let blockRequired = false;
  if (
    ast.type == "template" ||
    ast.type == "tplarg" ||
    ast.type == "ext" ||
    ast.type == "part"
  )
    blockRequired = true;
  if (blockRequired) seq.push(BeginToken(ast.id));
  seq.push(ast);

  if (ast.children.length == 0) {
    seq.push(END_OF_BRANCH);
    return seq;
  }

  let curr = ast;
  ast.children.forEach(c => {
    let rest = flattenToNodeSequences(c);
    seq = [...seq, ...rest];
  });
  if (blockRequired) seq.push(EndToken(ast.id));
  return seq;
}

// translate a node sequence to a string for suffix tree (phase 1)
// the string only contains type information and value information of nodes
function nodeSequenceToString(nodeSeq) {
  let str = "";
  let i = 0;
  let nodeStrMap = new Map();
  nodeSeq.forEach((n, ni) => {
    n._strI = i;
    n._nodeSeqI = ni;
    nodeStrMap.set(i, n);
    let val = n.type ? n.type : "";
    val += n.value ? n.value : "";
    val += "$";
    str += val;
    i += val.length;
  });
  nodeStrMap.set(i, END);
  END._strI = i;
  END._nodeSeqI = nodeSeq.length;

  return { str, nodeStrMap };
}

export function detectCodeClone(ast, threshold = 10) {
  let nodeSeq = flattenToNodeSequences(ast);
  console.log("nodeseq", nodeSeq);
  debugger;
  let { str, nodeStrMap } = nodeSequenceToString(nodeSeq);
  debugger;
  const root = { val: "", len: 0, indexes: [], children: new Array(128) }; // 128 ascii characters
  const clones = {};
  console.log(str, nodeStrMap);

  for (let i = 0; i < nodeSeq.length; i++) {
    let s = str.substr(nodeSeq[i]._strI);
    addSuffixToTree(s, nodeSeq[i]._strI);
  }
  console.log(root);
  console.log(clones, 111);
  processPossibleClones(clones);

  // 1. map str clones to nodes
  // 2. make sure each clone is valid
  // 3. remove conflicting clones -> union find? probably just use greedy for now
  function processPossibleClones(
    clones,
    srcLenThreshold = 15,
    nodeLenThreshold = 7
  ) {
    let validClones = [];
    for (let c of Object.values(clones)) {
      let vc = { nodeIndexes: [], nodeLen: -1 };
      let len = c.len;
      for (let start of c.indexes) {
        if (!nodeStrMap.has(start) || !nodeStrMap.has(start + len)) continue;

        // check nodeLenThreshold
        let startNodeIndex = nodeStrMap.get(start)._nodeSeqI;
        let endNodeIndex = nodeStrMap.get(start + len)._nodeSeqI - 1;
        let nodeLen = endNodeIndex - startNodeIndex + 1;
        if (nodeLen < nodeLenThreshold) continue;

        // check srcLenThreshold
        let srcStart = -1;
        let srcEnd = -1;
        for (let i = startNodeIndex; i < endNodeIndex; i++) {
          // special token like beginToken and endToken does not have start and end attribute
          if (nodeSeq[i].start || nodeSeq[i].start == 0) {
            srcStart = nodeSeq[i].start;
            break;
          }
        }
        for (let i = endNodeIndex; i > startNodeIndex; i--) {
          if (nodeSeq[i].end || nodeSeq[i].end == 0) {
            srcEnd = nodeSeq[i].end;
            break;
          }
        }
        if (srcEnd - srcStart < srcLenThreshold) continue;

        // check if valid statement
        // matching begin tokens and end tokens
        if (!isCloneValidStatement(startNodeIndex, endNodeIndex)) continue;
        if (vc.nodeLen != -1 && vc.nodeLen != nodeLen) {
          console.log("ERROR");
        }
        vc.nodeLen = nodeLen;
        // greedy: remove conflicting clones
        // always keep the clone that terminates earliest
        // like course scheduling problem
        if (
          vc.nodeIndexes.length > 0 &&
          vc.nodeIndexes[vc.nodeIndexes.length - 1] + length > startNodeIndex
        )
          continue;
        vc.nodeIndexes.push(startNodeIndex);
      }
      if (vc.nodeIndexes.length > 1) validClones.push(vc);
    }
    console.log(validClones);
    return validClones;
  }

  // check if valid statement
  // matching begin tokens and end tokens
  function isCloneValidStatement(startNodeIndex, endNodeIndex) {
    let stack = [];
    for (let i = startNodeIndex; i <= endNodeIndex; i++) {
      let node = nodeSeq[i];
      if (node.type == "BEGIN_TOKEN") stack.push(node);
      else if (node.type == "END_TOKEN") {
        if (stack.length == 0) return false;
        if (stack[stack.length - 1].id != node.id) return false;
        stack.pop();
      }
    }
    return stack.length == 0;
  }
  // char: string, character
  // i: number, index
  function addSuffixToTree(s, i, rootNode = root) {
    let j = 0;
    let node = rootNode;
    while (j < s.length) {
      let cCode = s.charCodeAt(j);
      let next = node.children[cCode];

      // suffix does not exist in tree
      if (!next) {
        addClone(node, i);

        let subStr = s.substr(j);
        node.children[cCode] = {
          val: s.substr(j),
          len: node.len + subStr.length,
          indexes: [j + i],
          children: new Array(128)
        };
        return;
      }

      // compare next val with subStr
      let k = 0;
      while (k < next.val.length) {
        let kCode = next.val.charCodeAt(k);

        if (k + j == s.length || next.val.charAt(k) != s.charAt(k + j)) {
          // subStr is shorter than next.val
          // all previous characters are matched
          // split node
          let splitOutStr = next.val.substr(k);
          let splitOutNode = {
            val: splitOutStr,
            len: next.len,
            indexes: [...next.indexes],
            children: next.children
          };
          next.val = next.val.substring(0, k);
          next.len -= splitOutStr.length;
          next.children = new Array(128);
          next.children[kCode] = splitOutNode;

          // console.log(s.substring(0, k + j));
          addClone(next, i);

          if (k + j == s.length) return;

          if (next.val.charAt(k) != s.charAt(k + j)) {
            // at least one character will be matched (to have next)
            // node needed to be splited

            // create a node for the rest str
            let sCode = s.charCodeAt(k + j);
            let sSubStr = s.substr(k + j);
            next.children[sCode] = {
              val: sSubStr,
              len: next.len + sSubStr.length,
              indexes: [i],
              children: new Array(128)
            };
            return;
          }
        }
        k++;
      }

      if (k + j == s.length) {
        addClone(next, i);
        return;
      }

      // s still has unprocessed characters
      node = next;
      j += k;
      addClone(node, i, true);
    }
    addClone(node, i);
  }

  function addClone(node, i, conditional = false) {
    if (node.indexes.length == 0 || node.indexes[node.indexes.length - 1] == i)
      return;
    node.indexes.push(i);

    if (node.len >= threshold && node.indexes.length >= 2) {
      let key = node.indexes[0] + "-" + node.len;
      if (clones[key] && clones[key].indexes.length == node.indexes) return;
      if (clones[key] || (!isSubClone(node.indexes) && !conditional)) {
        clones[key] = {
          len: node.len,
          indexes: [...node.indexes]
        };
      }
    }
  }
  // the clone is a sub-part of another clone
  function isSubClone(indexes) {
    let s1s = indexes[0];
    let s2s = indexes[indexes.length - 1];
    for (let c of Object.values(clones)) {
      let len = c.len;
      let lastI = c.indexes.length - 1;
      let _s1s = c.indexes[0];
      let _s1e = _s1s + len;
      let _s2s = c.indexes[lastI];
      let _s2e = _s2s + len;
      if (
        _s1s < s1s &&
        s1s < _s1e &&
        _s2s < s2s &&
        s2s < _s2e &&
        s1s - _s1s == s2s - _s2s
      )
        return true;
    }
    return false;
  }
}

// =============================================
// code clone detection: suffix tree
// =============================================
export function detectCodeClone2(src, threshold = 30) {
  const root = { val: "", len: 0, indexes: [], children: new Array(128) }; // 128 ascii characters
  const clones = {};
  for (let i = 0; i < src.length; i++) {
    let s = src.substr(i);
    addSuffixToTree(s, i);
  }
  console.log(root);
  console.log(clones);
  // char: string, character
  // i: number, index
  function addSuffixToTree(s, i, rootNode = root) {
    let j = 0;
    let node = rootNode;
    while (j < s.length) {
      let cCode = s.charCodeAt(j);
      let next = node.children[cCode];
      // suffix does not exist in tree
      if (!next) {
        let subStr = s.substr(j);
        node.children[cCode] = {
          val: s.substr(j),
          len: node.len + subStr.length,
          indexes: [j + i],
          children: new Array(128)
        };
        return;
      }

      // compare next val with subStr
      let k = 0;
      while (k < next.val.length) {
        let kCode = next.val.charCodeAt(k);

        if (k + j == s.length || next.val.charAt(k) != s.charAt(k + j)) {
          // subStr is shorter than next.val
          // all previous characters are matched
          // split node
          let splitOutStr = next.val.substr(k);
          let splitOutNode = {
            val: splitOutStr,
            len: next.len,
            indexes: [...next.indexes],
            children: next.children
          };
          next.val = next.val.substring(0, k);
          next.len -= splitOutStr.length;
          next.indexes.push(i);
          next.children = new Array(128);
          next.children[kCode] = splitOutNode;

          if (next.len >= threshold) {
            console.log(s.substring(0, k + j));
            let key = next.indexes[0] + "-" + next.len;
            clones[key] = {
              len: next.len,
              indexes: [...next.indexes]
            };
          }

          if (k + j == s.length) return;

          if (next.val.charAt(k) != s.charAt(k + j)) {
            // at least one character will be matched (to have next)
            // node needed to be splited

            // create a node for the rest str
            let sCode = s.charCodeAt(k + j);
            let sSubStr = s.substr(k + j);
            next.children[sCode] = {
              val: sSubStr,
              len: next.len + sSubStr.length,
              indexes: [i],
              children: new Array(128)
            };
            return;
          }
        }
        k++;
      }

      if (k + j == s.length) {
        next.indexes.push(i);
        console.log(s);
        return;
      }

      // s still has unprocessed characters
      node = next;
      j += k;
    }
  }
}

// =============================================
// =============================================
