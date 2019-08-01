module.exports = [
  {
    name: "app",
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: ["babel-loader"]
        }
      ]
    },
    resolve: {
      extensions: ["*", ".js", ".jsx"]
    },
    output: {
      path: __dirname + "/dist",
      publicPath: "/",
      filename: "bundle.js"
    },
    devServer: {
      contentBase: "./dist"
    },
    devtool: "source-map"
  },
  {
    name: "lib",
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/
        }
      ]
    },
    entry: "./library/index.js",
    resolve: {
      extensions: ["*", ".js"]
    },
    output: {
      path: __dirname + "/library",
      publicPath: "/",
      filename: "lib.bundle.js"
    },
    mode: "production"
  }
];
