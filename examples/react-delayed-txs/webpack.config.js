const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          }
        },
      },
    ],
  },
  mode: "development",
  experiments: {
    asyncWebAssembly: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: "./src/index.html" }],
    }),
  ],
};