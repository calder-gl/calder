module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: {
      app: './src/examples/render.ts',
      generation: './src/examples/generation.ts',
      silhouette: './src/examples/silhouette.ts',
      forest: './src/examples/forest.ts',
      benchmark: './src/examples/benchmark.ts'
  },
  output: {
    path: __dirname + '/public',
    filename: 'build/[name].js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [
      { test: /\.tsx?$/, loader: 'ts-loader' }
    ]
  }
}
