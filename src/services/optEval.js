import { apiParse, apiEvalAsync, apiGetSource } from "./api.js";

export function getMetrics(src, ast) {
  let astInfo = getAstDepthAndNodesCnt(ast);
  return {
    srcLen: src.length,
    ...astInfo
  };
}

function getAstDepthAndNodesCnt(ast) {
  let nodeCnt = 0;
  let maxDepth = 0;
  dfs(ast, 0);
  function dfs(node, depth) {
    if (!node) return;
    nodeCnt++;
    if (depth + 1 > maxDepth) maxDepth = depth + 1;
    node.children.forEach(c => dfs(c, depth + 1));
  }
  return { nodeCnt, maxDepth };
}
