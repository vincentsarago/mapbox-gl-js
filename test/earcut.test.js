'use strict';

var Map = require('../js/ui/map');
var browser = require('../js/util/browser');
var style = require('./fixtures/earcut-crash');

var st = require('st');
var http = require('http');
var path = require('path');

var server = http.createServer(st({path: path.join(__dirname, 'fixtures')}));

function localURL(url) {
    return url.replace(/^asset:\/\//, 'http://localhost:2900/');
}

var app = {
    listen: function (callback) {
        server.listen(2900, callback);
    },

    close: function (callback) {
        server.close(callback);
    },

    localizeURLs: function (style) {
        for (var k in style.sources) {
            var source = style.sources[k];

            for (var l in source.tiles) {
                source.tiles[l] = localURL(source.tiles[l]);
            }

            if (source.urls) {
                source.urls = source.urls.map(localURL);
            }

            if (source.url) {
                source.url = localURL(source.url);
            }

            if (source.data && typeof source.data == 'string') {
                source.data = localURL(source.data);
            }
        }

        if (style.sprite) {
            style.sprite = localURL(style.sprite);
        }

        if (style.glyphs) {
            style.glyphs = localURL(style.glyphs);
        }
    }
};

app.listen();

browser.devicePixelRatio = 2;

var options = {
    width: 256,
    height: 256
};

app.localizeURLs(style);

var map = new Map({
    container: {
        offsetWidth: options.width,
        offsetHeight: options.height,
        classList: {
            add: function() {},
            remove: function() {}
        }
    },
    style: style,
    interactive: false,
    attributionControl: false
});

var gl = map.painter.gl;

map.once('load', function() {
    var w = options.width * browser.devicePixelRatio,
        h = options.height * browser.devicePixelRatio;

    var pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    var data = new Buffer(pixels);

    map.remove();
    gl.destroy();

    // Flip the scanlines.
    var stride = w * 4;
    var tmp = new Buffer(stride);
    for (var i = 0, j = h - 1; i < j; i++, j--) {
        var start = i * stride;
        var end = j * stride;
        data.copy(tmp, 0, start, start + stride);
        data.copy(data, start, end, end + stride);
        tmp.copy(data, end);
    }

    app.close();
});
