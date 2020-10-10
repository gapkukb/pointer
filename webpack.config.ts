import webpack from "webpack";
import path from "path";
module.exports = (env: any) => {
  console.log(env);

  return <webpack.Configuration>[
    {
      entry: {
        index: path.resolve(__dirname, "src/index.ts"),
      },
      output: {
        filename: "[name].js",
        chunkFilename: "[name].js",
        path: path.resolve(__dirname, "dist"),
        environment: {
          arrowFunction: false,
        },
      },
      resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"],
      },
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            loader: "ts-loader",
          },
        ],
      },
    },
    {
      entry: {
        index: path.resolve(__dirname, "src/index.ts"),
      },
      output: {
        filename: "[name].js",
        chunkFilename: "[name].js",
        path: path.resolve(__dirname, "dist"),
      },
      resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"],
      },
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            loader: "ts-loader",
          },
        ],
      },
    },
  ];
};
