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
// TODO: ext, should include pre
// TODO: link not supported

let root = document.getElementById("debug-template-debugger");
//
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
  return new Promise(function(resolve, reject) {
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
  window.antd = antd;
  window.React = React;
  window.ReactDOM = ReactDOM;

  // import { App } from "./App.js";
  import("./App.js").then(res => {
    console.log("hiii");
    const { App } = res;

    ReactDOM.render(<App />, root);
  });
  // "{{Test|p1={{Test|p2=ddd}}}} {{Test|p1={p2|p}=22}|o3={dd}|d{=p3|ddd}}",
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
