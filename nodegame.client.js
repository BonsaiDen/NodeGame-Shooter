/*
  
  NodeGame: Shooter
  Copyright (c) 2010 Ivo Wetzel.
  
  All rights reserved.
  
  NodeGame: Shooter is free software: you can redistribute it and/or
  modify it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  NodeGame: Shooter is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License along with
  NodeGame: Shooter. If not, see <http://www.gnu.org/licenses/>.
  
*/

(function() {

var MSG_GAME_START = 1;
var MSG_GAME_PING = 10;
var MSG_GAME_FIELDS = 2;
var MSG_GAME_SHUTDOWN = 3;

var MSG_ACTORS_INIT = 4;
var MSG_ACTORS_CREATE = 5;
var MSG_ACTORS_UPDATE = 6;
var MSG_ACTORS_EVENT = 0;
var MSG_ACTORS_REMOVE = 7;
var MSG_ACTORS_DESTROY = 8;

var MSG_CLIENT_MESSAGE = 9;

var MSG_CONNECTION_CLOSED = 255;


// Game ------------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Game(client) {
    this.$ = client;
    this.id = -1; 
};

Game.prototype.onCreate = function(flash) {};
Game.prototype.onConnect = function(success) {};
Game.prototype.onUpdate = function(data, init) {};
Game.prototype.onMessage = function(msg) {};
Game.prototype.onInput = function() {};
Game.prototype.onDraw = function() {};
Game.prototype.onShutdown = function(data) {};
Game.prototype.onClose = function(error) {};
Game.prototype.onRecordingEnd = function() {};

Game.prototype.BaseActor = function(rate) {
    this.updateRate = rate;
    this.onCreate = function(data, complete) {};
    this.onUpdate = function(data) {};
    this.onEvent = function(data) {};
    this.onInterleave = function() {};
    this.onDraw = function() {};
    this.onDestroy = function(complete) {};
};

Game.prototype.Actor = function(id, rate) {
    return this.$.actorTypes[id] = new this.BaseActor(rate);
};

Game.prototype.getTime = function() {
    return this.$.time;
};

Game.prototype.timeDiff = function(time) {
    return this.$.time - time;
};

Game.prototype.connect = function(host, port) {
    this.$.connect(host, port);
};

Game.prototype.close = function() {
    this.$.close();
};

Game.prototype.send = function(msg) {
    this.$.send(msg);
};


// Client ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Client() {
    this.reset();
    
    this.created = false;
    this.actorTypes = {};
    
    this.rec = null;
    this.recTime = null;
    this.recID = -1;
    this.recLength = 0;
    this.recTimer = null;
};

Client.prototype.connect = function(host, port) {
    var that = this;
    if (!this.created) {
        this.$.onCreate(!!WebSocket.prototype.__createFlash);
        this.created = true;
    }
    
    this.conn = new WebSocket('ws://' + host + ':' + port);
    this.conn.onopen = function() {
        that.connected = true;
        that.$.onConnect(true);
    };
    
    this.conn.onmessage = function(msg) {
        that.onMessage(msg);
    };
    
    this.conn.onerror = this.conn.onclose = function(e) {
        if (that.connected) {
            that.queueMessage([MSG_CONNECTION_CLOSED, e]);
        
        } else {
            that.$.onConnect(false);
        }
    };
};

Client.prototype.close = function() {
    this.conn.close();
};

Client.prototype.reset = function() {
    this.conn = null;
    this.connected = false;
    this.lastState = '';
    this.time = new Date().getTime();
    this.messages = [];
    this.pingTime = new Date().getTime();
    this.ping = 0;
    this.pings = [0, 0, 0, 0, 0];
    this.interval = 0;
    this.running = false;
    this.actors = {};
};

Client.prototype.quit = function() {
    clearTimeout(this.gameTimer);
    for(var i in this.actors) {
        this.actors[i].remove();
    }
    this.reset();
};


// Recording -------------------------------------------------------------------
Client.prototype.playRecording = function(record) {
    if (record) {
        this.quit();
        this.recTimer = null;
        this.rec = record;
        this.recTime = this.getTime() - this.rec[0][0];
        this.recID = 0;
        this.recLength = this.rec.length;
        this.playRecording();
     
     } else if (this.rec) {
        var that = this;
        while(this.recID < this.recLength) {
            var entry = this.rec[this.recID];
            if (entry[0] > new Date().getTime() - this.recTime) {
                break;
            }
            
            this.queueMessage(entry[1]);
            this.recID++;
        }
        if (this.recID < this.recLength) {
            this.recTimer = setTimeout(function(){that.playRecording();}, 20);
        
        } else {
            this.$.onRecordingEnd();
        }
    }
};

Client.prototype.replayRecording = function(timeout) {
    var that = this;
    this.recTimer = setTimeout(function() {
        that.playRecording(that.rec);
    }, timeout);
};

Client.prototype.stopRecording = function() {
    clearTimeout(this.recTimer);
    this.quit();
};


// Messages --------------------------------------------------------------------
Client.prototype.onMessage = function(msg) {
    var data = BISON.decode(msg.data);
    if (this.connected && data) {
        this.queueMessage(data);
    }
};

Client.prototype.queueMessage = function(data) {
    var time = new Date().getTime();
    if (!this.running) {
        this.handleMessage(data, time);
    
    } else {
        this.messages.push([data, time]);
    }
};

Client.prototype.processMessages = function() {
    while(this.messages.length > 0) {
        var msg = this.messages.shift();
        this.handleMessage(msg[0], msg[1]);
    }
};

Client.prototype.handleMessage = function(data, time) {
    var type = data.shift();
    if (type === MSG_GAME_START) {
        var that = this; 
        this.$.id = data[0];
        this.interval = data[1];
        this.$.onUpdate(data[2], true);
        this.running = true;
        this.gameTimer = setTimeout(function() {that.update();}, 0);
    
    } else if (type === MSG_GAME_FIELDS) {
        this.$.onUpdate(data[0], false);
    
    } else if (type === MSG_GAME_PING) {
        var ping = time - this.pingTime;
        this.pings.push(ping);
        if (this.pings.length > 5) {
            this.pings.shift();
        }
        
        var median = 0;
        for(var i = 0; i < 5; i++) {
            median += this.pings[i];
        }
        this.ping = median / 10;
    
    } else if (type === MSG_GAME_SHUTDOWN) {
        this.$.onShutdown(data);
    
    } else if (type === MSG_CLIENT_MESSAGE) {
        this.$.onMessage(data[0]);
    
    } else if (type === MSG_ACTORS_INIT) {
        for(var i = 0, l = data.length; i < l; i++) {
            var a = data[i];
            this.actors[a[0][0]] = new Actor(this, a, false, time);
        }
    
    } else if (type === MSG_ACTORS_CREATE) {
        for(var i = 0, l = data.length; i < l; i++) {
            var a = data[i];
            this.actors[a[0][0]] = new Actor(this, a, true, time);
        }
    
    } else if (type === MSG_ACTORS_UPDATE) {
        for(var i = 0, l = data.length; i < l; i++) {
            var a = data[i];
            this.actors[a[0][0]].update(a, time);
        }
    
    } else if (type === MSG_ACTORS_EVENT) {
        for(var i = 0, l = data.length; i < l; i++) {
            var a = data[i];
            this.actors[a[0]].onEvent(a[1]);
        }
    
    } else if (type === MSG_ACTORS_REMOVE) {
        for(var i = 0, l = data.length; i < l; i++) {
            var a = data[i];
            this.actors[a[0]].remove();
            delete this.actors[a[0]];
        }
    
    } else if (type === MSG_ACTORS_DESTROY) {
        for(var i = 0, l = data.length; i < l; i++) {
            var a = data[i];
            this.actors[a[0]].destroy(a[1], a[2]);
            delete this.actors[a[0]];
        }
    
    } else if (type === MSG_CONNECTION_CLOSED) {
        var that = this;
        this.quit();
        setTimeout(function() {that.$.onClose(data[0]);}, 0);
    }
    
    if (this.recID !== -1) {
        data.unshift(type);
    }
};


// Game ------------------------------------------------------------------------
Client.prototype.Game = function(fps) {
    this.fpsTime = Math.round(1000 / fps);
    this.gameTimer = null;
    return this.$ = new Game(this);
};

Client.prototype.update = function() {
    var frameTime = new Date().getTime();
    if (this.running) {
        this.processMessages();
        this.$.onDraw();
        
        this.time = new Date().getTime();
        for(var c in this.actors) {
            var a = this.actors[c];
            if (a.$updateRate > 0) {
                var step = 100.0 / (this.interval * a.$updateRate);
                var delta = 1 - step * ((a.$t - this.time) / 100);
                a.x = a.ox + Math.sin(a.$r) * a.$d * delta;
                a.y = a.oy + Math.cos(a.$r) * a.$d * delta;
                a.onInterleave(delta);
            }
            a.onDraw();
        }
    }
    
    if (this.running) {
        var that = this;
        var next = this.fpsTime - (new Date().getTime() - frameTime);
        this.gameTimer = setTimeout(function() {that.update()}, next);
        
        if (this.$.playing) {
            var msg = BISON.encode(this.$.onInput());
            if (msg !== this.lastState) {
                this.pingTime = new Date().getTime();
                this.conn.send(msg);
                this.lastState = msg;
            }
        }
    }
};

Client.prototype.send = function(msg) {
    this.pingTime = new Date().getTime();
    this.conn.send(BISON.encode(msg));
};

Client.prototype.getTime = function() {
    return this.time;
};


// Actors ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Actor(client, data, create, time) {
    this.$ = client.$;
    this.$interval = client.interval;
    
    var d = data[0];
    this.id = d[0];
    this.$updateRate = client.actorTypes[d[5]].updateRate;
    this.move(d, time);
    
    for(var m in client.actorTypes[d[5]]) {
        if (m !== 'update' && m !== 'destroy' && m !== 'remove') {
            this[m] = client.actorTypes[d[5]][m];
        }
    }
    this.onCreate(data[1], create);
}

Actor.prototype.move = function(data, time) {
    this.x = this.ox = data[1];
    this.y = this.oy = data[2];
    this.mx = data[3] - this.x;
    this.my = data[4] - this.y;
    this.$r = Math.atan2(this.mx, this.my);
    this.$d = Math.sqrt(this.mx * this.mx + this.my * this.my);
    this.$t = time + (this.$interval * this.$updateRate);
};

Actor.prototype.update = function(data, time) {
    this.move(data[0], time);
    this.onUpdate(data[1]);
};

Actor.prototype.destroy = function(x, y) {
    this.x = x;
    this.y = y;
    this.onDestroy(true);
};

Actor.prototype.remove = function() {
    this.onDestroy(false);
};

Actor.prototype.getTime = function() {
    return new Date().getTime();
};

Actor.prototype.timeDiff = function(time) {
    return this.$.timeDiff(time);
};

// Exports
window.NodeGame = function(fps) {
    var client = new Client();
    return client.Game(fps);
};
})();

