var path = require('path'),
    webpack = require('webpack');

module.exports = {
    context: path.join(__dirname, 'src'),
    entry: {
        phy6: [ './index.js' ]
    },
    output: {
        path: path.join(__dirname, 'out'),
        publicPath: '/',
        filename: '[name].js',
        libraryTarget: 'umd',
        library: 'phy6'
    },
    resolve: {
        root: path.join(__dirname, 'out'),
        extensions: ['', '.js'],
        modulesDirectories: ['node_modules']
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loaders: [ 'babel' ]
            }
        ],
    },
    plugins: [
        new webpack.NoErrorsPlugin()
    ],
};
