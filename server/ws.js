// Bits and pieces *cough* stolen *cough* from
// Micheil Smith's node-websocket-server
// <http://github.com/miksago/node-websocket-server>

// Therefore, I don't really think that I should claim any copyright for 
// this piece of "minified" code.


var http = require('http');
var crypto = require('crypto');

function pack(num) {
    return String.fromCharCode(num >> 24 & 0xFF)
           + String.fromCharCode(num >> 16 & 0xFF)
           + String.fromCharCode(num >> 8 & 0xFF)
           + String.fromCharCode(num & 0xFF);
};


function Connection($, req, socket, headers, upgradeHeader) {
    var data = 'HTTP/1.1 101 WebSocket Protocol Handshake\r\n'
                + 'Upgrade: WebSocket\r\n'
                + 'Connection: Upgrade\r\n'
                + 'Sec-WebSocket-Origin: ' + headers.origin + '\r\n'
                + 'Sec-WebSocket-Location: ws://' + headers.host + '/';
    
    // Draft 76
    if ('sec-websocket-key1' in headers && 'sec-websocket-key2' in headers) {
        var key1 = headers['sec-websocket-key1'];
        var key2 = headers['sec-websocket-key2'];
        
        var num1 = parseInt(key1.replace(/[^\d]/g, ''), 10);
        var num2 = parseInt(key2.replace(/[^\d]/g, ''), 10);
        
        var spaces1 = key1.replace(/[^\ ]/g, '').length;
        var spaces2 = key2.replace(/[^\ ]/g, '').length;
        
        if (spaces1 == 0 || spaces2 == 0
            || num1 % spaces1 != 0 || num2 % spaces2 != 0) {
            
            socket.end();
            socket.destroy();
            return;
        
        } else {
            var hash = crypto.createHash('md5');
            hash.update(pack(parseInt(num1 / spaces1)));
            hash.update(pack(parseInt(num2 / spaces2)));
            hash.update(upgradeHeader.toString('binary'));
            data += '\r\n\r\n';
            data += hash.digest('binary');
            socket.write(data, 'binary');
            socket.flush();
        }
    
    } else {
        data += '\r\n\r\n';
        socket.write(data, 'ascii');
        socket.flush();
    }  
    
    this.id = socket.remoteAddress + ':' + socket.remotePort;
    var that = this;
    
    // Events
    var frame = [];
    var state = 0;
    req.socket.addListener('data', function(data) {
        for(var i = 0, l = data.length; i < l; i++) {
            var b = data[i];
            if (state == 0) {
                if (b & 0x80 == 0x80) {
                    state = 2;
                
                } else {
                    state = 1;
                }
            
            // Low
            } else if (state == 1) {
                if (b == 0xff) {
                    var str = new Buffer(frame);
                    frame = [];
                    state = 0
                    $.onMessage(that, str.toString('utf8', 0, str.length));
                    
                } else {
                    frame.push(b);
                }
            
            // High
            } else if (state == 2) {
                if (b == 0x00) {
                    that.close();
                }
            }
        }
    });

    req.socket.addListener('end', function() {
        $.remove(that);
    });

    req.socket.addListener('error', function() {
        that.close();
    });
    
    this.write = function(data) {
        if (socket.writable) {
            try {
                socket.write('\x00', 'binary');
                if (typeof data == 'string') {
                    socket.write(data, 'utf8');
                }
                socket.write('\xff', 'binary'); 
                socket.flush();
            
            } catch(e) {
                
            }
        }
    }
    
    this.send = function(data) {
        that.write(data);
    };
    
    this.close = function() {
        that.write(null);
        socket.end();
        socket.destroy();
        $.remove(that);
    };
    $.add(this);
};


function Server() {
    var $ = new http.Server();
    var that = this;
    var connections = {};
    
    $.addListener('connection', function(socket) {
        socket.setTimeout(0);
        socket.setNoDelay(true);
        socket.setKeepAlive(true, 0);
    });
    
    $.addListener('upgrade', function(req, socket, upgradeHeader) {
        if (req.method == 'GET'
            && 'upgrade' in req.headers && 'connection' in req.headers
            && req.headers.upgrade.toLowerCase() == 'websocket'
            && req.headers.connection.toLowerCase() == 'upgrade') {
            
            new Connection(that, req, socket, req.headers, upgradeHeader);
        
        } else {
            socket.end();
            socket.destroy();
        }
    });
    
    this.add = function(conn) {
        connections[conn.id] = conn;
        that.onConnect(conn);
    };
    
    this.remove = function(conn) {
        that.onClose(conn);
        delete connections[conn.id];
    };
    
    this.onConnect = function(conn) {
    };
    
    this.onMessage = function(conn, data) {
    };
    
    this.onClose = function(conn) {
    };
    
    this.broadcast = function(data) {
        for(var c in connections) {
            connections[c].send(data);
        }
    }
    
    this.listen = function(port) {
        $.listen(port);
    };
};

exports.Server = Server;

