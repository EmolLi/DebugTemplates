/**
 * JS code for all the interactive parts of the special page
 *
 * @author Clark Verbrugge, Duan Li
 * @license CC BY-SA 3.0
 **/

// TODO: performance issue on highlight src code
// TODO: refactor, config compiler
// TODO: detect if an ext is installed
// TODO: support different version of API
// TODO: rename part in argument
// TODO: link not supported
import { dynamicallyLoadLibraries } from "./services/loadLibrary.js";
let root = document.getElementById("debug-template-debugger");

function initApp() {
  window.antd = antd;
  window.React = React;
  window.ReactDOM = ReactDOM;

  import("./App.js").then(res => {
    console.log("hiii");
    const { App } = res;

    ReactDOM.render(<App />, root);
  });
}

dynamicallyLoadLibraries(initApp);
