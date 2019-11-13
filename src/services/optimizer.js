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

export function detectCodeClone(ast, approach = 1, threshold = 10) {
  let nodeSeq = flattenToNodeSequences(ast);
  console.log("nodeseq", nodeSeq);
  let { str, nodeStrMap } = nodeSequenceToString(nodeSeq);
  const root = { val: "", len: 0, indexes: [], children: new Array(128) }; // 128 ascii characters
  const clones = {};
  console.log(str, nodeStrMap);

  for (let i = 0; i < nodeSeq.length; i++) {
    let s = str.substr(nodeSeq[i]._strI);
    addSuffixToTree(s, nodeSeq[i]._strI);
  }
  console.log(root);
  console.log(clones, 111);
  let validClones = processPossibleClones(clones);
  switch (approach) {
    case 1:
      selectClonesApproach1(validClones);
      break;
    default:
  }
  return validClones;

  /* P1: select clone candidate for elimination
       P1.1 inner conflict
       P1.2 cross group conflict
     P2: redesign problem
       Variable update problem

    Here all clones are valid, we choose clones to optimize as some clones conflict with others
  */
  function selectClonesApproach1(validClones) {
    /*
      P1. only select clones with no variable
        P1.1 greedy
        P1.2 random -> based on order, whoever comes first
    */
    // P1: remove clones that contains variable
    let i = 0;
    let keys = Object.keys(validClones);
    while (i < keys.length) {
      let vc = validClones[keys[i]];
      if (
        cloneContainsVariable(
          vc.nodeIndexes[0].startNodeIndex,
          vc.nodeIndexes[0].endNodeIndex
        )
      ) {
        // remove
        console.log("remove ", validClones[keys[i]]);
        delete validClones[keys[i]];
        keys.splice(i, 1);
      } else i++;
    }

    // P1.1
    // greedy: remove conflicting inner clones
    // always keep the clone that terminates earliest
    // like course scheduling problem
    let i = 0;
    keys = Object.keys(validClones);
    while (i < keys.length) {
      let vc = validClones[keys[i]];
      let cur = 1;
      while (cur < vc.count) {
        if (vc.nodeIndexes[cur - 1].endNodeIndex >= startNodeIndex) {
          vc.nodeIndexes.splice(cur, 1);
          vc.count--;
        } else cur++;
      }
      if (vc.count <= 1) {
        console.log("remove2 ", validClones[keys[i]]);
        delete validClones[keys[i]];
        keys.splice(i, 1);
      } else i++;
    }

    // P1.2 random -> based on order, whoever comes first
    computeCloneGroupConflictInfo();
    let i = 0;
    keys = Object.keys(validClones);
    while (i < keys.length) {
      let vc = validClones[keys[i]];
      determineIfOptimizeCloneGroup(vc);
    }

    // determine if we should optimize clone group
    // we can optimize it if we do not optimize a group that conflict with it
    function determineIfOptimizeCloneGroup(cloneGroup) {
      let toOptimize = true;
      for (let g of Object.values(cloneGroup.conflictGroups)) {
        if (validClones[g].toOptimize) {
          toOptimize = false;
          break;
        }
      }
      cloneGroup.toOptimize = toOptimize;
      return toOptimize;
    }

    function computeCloneGroupConflictInfo() {
      // let groupConflictMap = {};
      let clones = cloneGroupsToCloneList(validClones);
      for (let i = 0; i < clones.length - 1; i++) {
        for (let j = i + 1; j < clones.length; j++) {
          let c1 = clones[i];
          let c2 = clones[j];
          if (cloneConflict(c1, c2)) {
            validClones[c1.gid].conflictGroups[c2.gid] = c2.gid;
            validClones[c2.gid].conflictGroups[c1.gid] = c1.gid;
          }
        }
      }
    }
  }

  // flatten clone groups to clone list
  function cloneGroupsToCloneList(cloneGroups) {
    let clones = [];
    for (let group of Object.values(cloneGroups)) {
      for (let c of group.nodeIndexes) clones.push(c);
    }
    return clones;
  }

  // determine if c1 and c2 conflicts
  function cloneConflict(c1, c2) {
    // for c1 and c2 in the same clone group, if they overlap, they conflict
    if (c1.gid == c2.gid) {
      if (
        !(
          (c1.srcStart < c2.srcStart && c1.srcEnd < c2.srcStart) ||
          (c1.srcStart > c2.srcEnd && c1.srcEnd > c2.srcEnd)
        )
      ) {
        c1.conflicts.push(c2);
        c2.conflicts.push(c1);
        return true;
      }
    }
    // for c1 and c2 exist in different clone group, if they overlap, and one does not include the other, they conflict
    if (c1.gid != c2.gid) {
      // not overlap
      if (
        (c1.srcStart < c2.srcStart && c1.srcEnd < c2.srcStart) ||
        (c1.srcStart > c2.srcEnd && c1.srcEnd > c2.srcEnd)
      )
        return false;
      // one include one
      if (
        (c1.srcStart >= c2.srcStart && c1.srcEnd <= c2.srcEnd) ||
        (c1.srcStart <= c2.srcStart && c1.srcEnd >= c2.srcEnd)
      ) {
        return false;
      }
      c1.conflicts.push(c2);
      c2.conflicts.push(c1);
      return true;
    }
  }

  // 1. map str clones to nodes
  // 2. make sure each clone is valid
  // here we remove all invalid clones.
  function processPossibleClones(
    clones,
    srcLenThreshold = 15,
    nodeLenThreshold = 7
  ) {
    let validClones = {};
    for (let cid of Object.keys(clones)) {
      let c = clones[cid];
      let vc = {
        nodeIndexes: [],
        conflictGroups: {},
        nodeLen: -1,
        srcLen: -1,
        toOptimize: false,
        id: cid,
        index: validClones.length,
        count: 0
      }; // FIXME: possible bug here

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
        for (let i = startNodeIndex; i < endNodeIndex; i++) {
          if (nodeSeq[i].end || nodeSeq[i].end == 0) {
            if (nodeSeq[i].end > srcEnd) srcEnd = nodeSeq[i].end;
          }
        }
        if (srcEnd - srcStart < srcLenThreshold) continue;
        vc.srcLen = srcEnd - srcStart + 1;

        // check if valid statement
        // matching begin tokens and end tokens
        if (!isCloneValidStatement(startNodeIndex, endNodeIndex)) continue;
        if (vc.nodeLen != -1 && vc.nodeLen != nodeLen) {
          console.log("ERROR");
        }
        vc.nodeLen = nodeLen;

        vc.nodeIndexes.push({
          cid: `${startNodeIndex}-${endNodeIndex}`,
          startNodeIndex,
          endNodeIndex,
          srcStart,
          srcEnd,
          conflicts: [],
          gid: vc.id,
          toOptimize: true
        });
        vc.count++;
      }
      if (vc.count > 1) validClones[cid] = vc;
    }
    console.log(validClones);
    return validClones;
  }

  function cloneContainsVariable(nodeIndexStart, nodeIndexEnd) {
    for (let i = nodeIndexStart; i <= nodeIndexEnd; i++) {
      let node = nodeSeq[i];
      switch (node.type) {
        case "#var":
        case "#varexists":
        case "#vardefine":
          return true;
      }
    }
    return false;
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

// based on selected clones, generate optimized code
export function elimilateClones(clones, src, selectedClonesToOptimize) {
  if (clones.length == 0) return src;
  let variableDeclarations = "";
  let cloneMapForSubstitute = {};
  for (let cindex of selectedClonesToOptimize) {
    let c = clones[cindex];
    let osrc = src.substring(
      c.nodeIndexes[0].srcStart,
      c.nodeIndexes[0].srcEnd + 1
    );
    variableDeclarations += `{{#vardefine:${c.id}|${osrc}}}`;
    for (let ci of c.nodeIndexes) {
      cloneMapForSubstitute[ci.srcStart] = c;
    }
  }

  // go through the src to substitute clone with variable
  let prev = 0;
  let curr = 0;
  let optCode = "";
  debugger;
  while (curr < src.length) {
    if (cloneMapForSubstitute[curr]) {
      // add substr prev~curr
      optCode += src.substring(prev, curr);
      let clone = cloneMapForSubstitute[curr];
      optCode += `{{#var:${clone.id}}}`;
      prev = curr + clone.srcLen;
      curr = prev;
    } else curr++;
  }
  if (prev < src.length) optCode += src.substring(prev);
  return variableDeclarations + optCode;
}
