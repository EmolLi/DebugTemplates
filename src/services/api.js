const corsProxy = "https://gentle-taiga-41562.herokuapp.com/";
function getUrl(url) {
  if (new URL(url).hostname != "localhost") {
    // cors
    return corsProxy + url;
  }
  return url;
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
export function apiParse(t, title, url, callback) {
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
export function apiEval(t, title, url, callback) {
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

export async function apiEvalAsync(src, title, url, params) {
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

export async function apiGetSource(title, homePageUrl) {
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
export function apiEvalHasResult(result) {
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
export function apiEvalGetResult(result) {
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
export function apiGetPage(t, callback) {
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
export function apiGetTemplateName(t, callback) {
  var args =
    "action=parse&format=json&prop=templates&contentmodel=wikitext&text=" +
    encodeURIComponent(t);
  var url = document.getElementById("dt-api").value;
  doPost(url, args, callback);
}

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
