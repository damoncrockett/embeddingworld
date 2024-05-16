const path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin");

const paths = {
  src: path.resolve(__dirname, 'src'),
  dist: path.resolve(__dirname, 'dist')
}

module.exports = {
  entry: path.resolve(paths.src, 'index.js'),
  resolve: {
    extensions: ['.js', '.jsx', '.txt'], // Add .txt to the resolve extensions
  },
  output: {
    path: paths.dist,
    filename: 'bundle.js',
    publicPath: ''
  },
  devServer: {
    static: paths.dist,
    compress: true,
    port: 8080,
    open: true
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        include: paths.src,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          // No need for 'options' here if you're using a .babelrc or babel.config.json file
        },
      },
      {
        test: /\.css$/,
        use: [
          { loader: "style-loader" },
          { loader: "css-loader" },
        ]
      },
      {
        test: /\.txt$/,
        use: 'raw-loader',
      },
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'index.html')
    })
  ]
};
