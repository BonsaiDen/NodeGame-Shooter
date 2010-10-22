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
var MSG_GAME_FIELDS = 2;
var MSG_GAME_SHUTDOWN = 3;

var MSG_ACTORS_INIT = 4;
var MSG_ACTORS_CREATE = 5;
var MSG_ACTORS_UPDATE = 6;
var MSG_ACTORS_EVENT = 0;
var MSG_ACTORS_REMOVE = 7;
var MSG_ACTORS_DESTROY = 8;

var MSG_CLIENT_MESSAGE = 9;


// Game ------------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Game(client) {
    this.$ = client;
    this.id = -1; 
};

Game.prototype.onCreate = function() {
};

Game.prototype.onConnect = function(success) {
};

Game.prototype.onInit = function(data) {
};

Game.prototype.onUpdate = function(data) {
};

Game.prototype.onMessage = function(msg) {
};

Game.prototype.onInput = function() {
};

Game.prototype.onDraw = function() {
};

Game.prototype.onShutdown = function(data) {
};

Game.prototype.onClose = function() {
};

Game.prototype.onError = function(e) {
};

Game.prototype.onFlashSocket = function() {
};

Game.prototype.getTime = function() {
    return this.$.time;
};

Game.prototype.timeDiff = function(time) {
    return this.$.time - time;
};

Game.prototype.send = function(msg) {
    this.$.send(msg);
};


// Client ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Client(fps) {
    this.reset();
    
    this.created = false;
    this.recoding = null;
    this.recordingTime = null;
    this.recordingID = -1;
    this.recordingLength = 0;
    this.recordingTimer = null;
    this.actorTypes = {};
};

Client.prototype.reset = function() {
    this.conn = null;
    this.connected = false;
    this.lastState = '';
    this.time = new Date().getTime();
    this.messageTime = 0;
    this.interval = 0;
    this.running = false;
    this.actors = {};
};

Client.prototype.connect = function(host, port) {
    if (!this.created) {
        this.$.onCreate();
        this.created = true;
    }
    
    if (WebSocket.prototype.__createFlash) {
        this.$.onFlashSocket();
    }
    
    var that = this;
    this.conn = new WebSocket('ws://' + host + ':' + port);
    this.conn.onopen = function() {
        that.connected = true;
        that.$.onConnect(true);
    };
    
    this.conn.onmessage = function(msg) {
        that.onMessage(msg);
    };
    
    this.conn.onclose = function(e) {
        if (that.connected) {
            that.quit();
            that.$.onClose();
        
        } else {
            that.$.onConnect(false);
        }
    };
    
    this.conn.onerror = function(e) {
        if (that.connected) {
            that.quit();
            that.$.onError(e);
        }
    };
};

Client.prototype.close = function() {
    this.conn.close();
};

Client.prototype.quit = function() {
    window.clearTimeout(this.gameTimer);
    for(var i in this.actors) {
        this.actors[i].remove();
    }
    this.reset();
};

// Recording -------------------------------------------------------------------
Client.prototype.playRecording = function(record) {
    if (record) {
        this.recordingTimer = null;
        this.recording = record;
        this.recordingTime = this.getTime() - this.recording[0][0];
        this.recordingID = 0;
        this.recordingLength = this.recording.length;
        this.playRecording();
     
     } else if (this.recording) {
        while(this.recordingID < this.recordingLength) {
            var entry = this.recording[this.recordingID];
            if (entry[0] > new Date().getTime() - this.recordingTime) {
                break;
            }
            
            var data = entry[1];
            var type = data.shift();
            this.handleMessage(type, data);
            data.unshift(type);
            this.recordingID++;
        }
        
        var that = this;
        if (this.recordingID < this.recordingLength) {
            this.recordingTimer = window.setTimeout(function() {
                                        that.playRecording();
                                    }, 20);
        
        } else {
            this.recordingTimer = window.setTimeout(function() {
                that.playRecording(that.recording);
            }, this.$.roundTime);
        }
    }
};

Client.prototype.stopRecording = function() {
    window.clearTimeout(this.recordingTimer);
    this.recordingID = -1;
    this.quit();
}


// Messages --------------------------------------------------------------------
Client.prototype.onMessage = function(msg) {
    var data = BISON.decode(msg.data);
    if (this.connected && data) {
        this.handleMessage(data.shift(), data);
    }
};

Client.prototype.handleMessage = function(type, data) {
    this.messageTime = new Date().getTime();
    
    // Game
    if (type === MSG_GAME_START) {
        var that = this; 
        this.$.id = data[0];
        this.interval = data[1];
        this.$.onInit(data[2]);
        this.running = true;
        this.gameTimer = window.setTimeout(function(){that.update();}, 0);
    
    } else if (type === MSG_GAME_FIELDS) {
        this.$.onUpdate(data[0]);
    
    } else if (type === MSG_GAME_SHUTDOWN) {
        this.$.onShutdown(data);
    
    // Client
    } else if (type === MSG_CLIENT_MESSAGE) {
        this.$.onMessage(data[0]);
    
    // Actors
    } else if (type === MSG_ACTORS_INIT) {
        for(var i = 0, l = data.length; i < l; i++) {
            var a = data[i];
            this.actors[a[0][0]] = new Actor(this, a, false);
        }
    
    } else if (type === MSG_ACTORS_CREATE) {
        for(var i = 0, l = data.length; i < l; i++) {
            var a = data[i];
            this.actors[a[0][0]] = new Actor(this, a, true);
        }
    
    } else if (type === MSG_ACTORS_UPDATE) {
        for(var i = 0, l = data.length; i < l; i++) {
            var a = data[i];
            this.actors[a[0][0]].update(a);
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
    }
};


// Game ------------------------------------------------------------------------
Client.prototype.Game = function(fps) {
    this.fpsTime = Math.round(1000 / fps);
    this.gameTimer = null;
    this.$ = new Game(this);
    return this.$;
};

Client.prototype.update = function() {
    if (this.running) { 
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
        
        var that = this;
        this.gameTimer = setTimeout(function() {that.update()},
                         this.fpsTime - (new Date().getTime() - this.time)); 
        
        if (this.$.playing) {
            var msg = BISON.encode(this.$.onInput());
            if (msg !== this.lastState) {
                this.conn.send(msg);
                this.lastState = msg;
            }
        }
    }
};

Client.prototype.createActorType = function(id, rate) {
    function ActorType(rate) {
        this.updateRate = rate;
        this.onCreate = function(data, complete) {};
        this.onUpdate = function(data) {};
        this.onEvent = function(data) {};
        this.onInterleave = function() {};
        this.onDraw = function() {};
        this.onDestroy = function(complete) {};
    }
    this.actorTypes[id] = new ActorType(rate);
    return this.actorTypes[id];
};

Client.prototype.send = function(msg) {
    this.conn.send(BISON.encode(msg));
};

Client.prototype.getTime = function() {
    return this.time;
};


// Actors ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Actor(client, data, create) {
    this.$ = client.$;
    this.$client = client;
    
    var d = data[0];
    this.id = d[0];
    this.$updateRate = client.actorTypes[d[5]].updateRate;
    this.move(d);
    
    for(var m in client.actorTypes[d[5]]) {
        if (m !== 'update' && m !== 'destroy' && m !== 'remove') {
            this[m] = client.actorTypes[d[5]][m];
        }
    }
    this.onCreate(data[1], create);
}

Actor.prototype.move = function(data) {
    this.x = this.ox = data[1];
    this.y = this.oy = data[2];
    this.mx = data[3] - this.x;
    this.my = data[4] - this.y;
    this.$r = Math.atan2(this.mx, this.my);
    this.$d = Math.sqrt(this.mx * this.mx + this.my * this.my);
    this.$t = this.$client.messageTime + (this.$client.interval * this.$updateRate);
};

Actor.prototype.update = function(data) {
    this.move(data[0]);
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
window.NodeGame = Client;
})();

