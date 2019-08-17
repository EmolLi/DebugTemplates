// =============================================
// code clone detection: suffix tree
// =============================================
export function detectCodeClone(src, threshold) {
  const root = { val: "", len: 0, indexes: [], children: new Array(128) }; // 128 ascii characters
  for (let i = 0; i < src.length; i++) {
    let s = src.substr(i);
    addSuffixToTree(s, i);
  }
  console.log(root);
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

          console.log(s.substring(0, k + j));

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
