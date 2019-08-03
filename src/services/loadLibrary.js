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

export const dynamicallyLoadLibraries = initApp =>
  Promise.all(libs.map(lib => loadjs(lib[0], lib[1]))).then(initApp);
