var http = require('http');
var express = require('express');
var httpProxy = require('http-proxy');

express.static.mime.define({
 'application/x-font-woff': ['woff'],
 'application/font-woff': ['woff']
});


var serve = express.static(process.cwd(), {'index': ['index.html', 'index.htm']});
var proxy = httpProxy.createProxyServer();

var app = express();
app.use(serve);

app.all('/re_*', function (req, res, next) {
  proxy.web(req, res ,{
    target: 'http://fbinter.stadt-berlin.de/fb/wfs/geometry/senstadt/'
  });
});

app.listen(3000, 'localhost');
