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
var MSG_ACTORS_REMOVE = 7;
var MSG_ACTORS_DESTROY = 8;


// Game ------------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Game(client) {
    this.$s = client;
    this.id = -1; 
};

Game.prototype.onConnect = function(success) {
};

Game.prototype.onInit = function(data) {
};

Game.prototype.onUpdate = function(data) {
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

Game.prototype.onWebSocketError = function() {
};

Game.prototype.getTime = function() {
    return this.$s.getTime();
};

Game.prototype.getinterleave = function() {
    return this.$s.interleaveSteps;
};

Game.prototype.send = function(msg) {
    this.$s.send(msg);
};


// Client ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Client(fps) {
    this.conn = null;
    this.connected = false;
    this.lastState = '';
    this.lastFrame = 0;
    this.lastRender = 0;
    this.interleaveSteps = 0;
    this.running = false;
    
    this.actors = {};
    this.actorTypes = {};
};

Client.prototype.connect = function(host, port) {
    if (!window['WebSocket']) {
        this.$.onWebSocketError();
        return;
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
    
    window.onbeforeunload = window.onunload = function() {
        that.conn.close();
    };
};

Client.prototype.onMessage = function(msg) {
    var that = this;
    var data = msg.data.replace(/([a-z0-9]+)\:/gi, '"$1":'), type = 0;
    try {
        data = JSON.parse('[' + data + ']');
        type = data.shift();
    
    } catch(e) {
        try {
            console.log('JSON Error:', msg);
        
        } catch(e) {
            
        }
        return;
    }
    
    // Game
    if (type == MSG_GAME_START) {
        this.$.id = data[0];
        this.lastFrame = this.lastRender = this.getTime();
        this.interleaveSteps = data[1] / 10;
        this.running = true;
        this.update();
        this.$.onInit(data[2]);
    
    } else if (type == MSG_GAME_FIELDS) {
        this.$.onUpdate(data[0]);
    
    } else if (type == MSG_GAME_SHUTDOWN) {
        this.$.onShutdown(data);
    
    // Actors
    } else if (type == MSG_ACTORS_INIT) {
        for(var i = 0, l = data.length; i < l; i++) {
            var a = data[i];
            this.actors[a[0][0]] = new Actor(this, a, false);
        }
    
    } else if (type == MSG_ACTORS_CREATE) {
        for(var i = 0, l = data.length; i < l; i++) {
            var a = data[i];
            this.actors[a[0][0]] = new Actor(this, a, true);
        }
    
    } else if (type == MSG_ACTORS_UPDATE) {
        for(var i = 0, l = data.length; i < l; i++) {
            var a = data[i];
            if (this.actors[a[0][0]]) {
                this.actors[a[0][0]].update(a);
            }
        }
    
    } else if (type == MSG_ACTORS_REMOVE) {
        for(var i = 0, l = data.length; i < l; i++) {
            var a = data[i];
            this.actors[a[0]].remove();
            delete this.actors[a[0]];
        }
    
    } else if (type == MSG_ACTORS_DESTROY) {
        for(var i = 0, l = data.length; i < l; i++) {
            var a = data[i];
            this.actors[a[0]].destroy(a[1], a[2]);
            delete this.actors[a[0]];
        }
    }
};

Client.prototype.quit = function() {
    this.running = false;
    for(var i in this.actors) {
        this.actors[i].remove();
    }
};

Client.prototype.Game = function(fps) {
    this.fpsTime = Math.round(1000 / fps);
    this.$ = new Game(this);
    return this.$;
};


// Mainloop --------------------------------------------------------------------
Client.prototype.update = function() {
    if (this.running) {
        var currentFrame = this.getTime();
        
        // Update
        var diff = (currentFrame - this.lastFrame) / 10;
        if (diff > 1.0) {
            this.lastFrame = currentFrame;
            for(var c in this.actors) {
                var a = this.actors[c];
                if (a.$updateRate > 0) {
                    var step = a.$updateRate * this.interleaveSteps / diff;
                    a.x += a.mx / step;
                    a.y += a.my / step; 
                    a.onInterleave(step);
                }
            }
        }
        
        // Render
        if (currentFrame - this.lastRender > this.fpsTime) {
            var msg = JSON.stringify(this.$.onInput());
            if (msg != this.lastState) {
                this.conn.send(msg);
                this.lastState = msg;
            }
            this.$.onDraw();
            for(var c in this.actors) {
                this.actors[c].onDraw();
            }
            
            var diff = (currentFrame - this.lastRender) - this.fpsTime;
            this.lastRender = currentFrame - diff;
        }
        
        var that = this;
        setTimeout(function() {that.update()}, 5);
    }
};

Client.prototype.createActorType = function(id, rate) {
    function ActorType(rate) {
        this.updateRate = rate;
        this.onCreate = function(data, complete) {};
        this.onUpdate = function(data) {};
        this.onInterleave = function() {};
        this.onDraw = function() {};
        this.onDestroy = function(complete) {};
    }
    this.actorTypes[id] = new ActorType(rate);
    return this.actorTypes[id];
};

Client.prototype.send = function(msg) {
    this.conn.send(JSON.stringify(msg));
};

Client.prototype.getTime = function() {
    return new Date().getTime();
};


// Actors ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Actor(client, data, create) {
    this.$c = client;
    this.$ = client.$;
    
    var d = data[0]
    this.id = d[0];
    this.x = d[1];
    this.y = d[2];
    
    this.$updateRate = this.$c.actorTypes[d[5]].updateRate;
    this.mx = d[3] - this.x;
    this.my = d[4] - this.y;
    
    for(var m in this.$c.actorTypes[d[5]]) {
        if (m != 'update' && m != 'destroy' && m != 'remove') {
            this[m] = this.$c.actorTypes[d[5]][m];
        }
    }
    this.onCreate(data[1], create);
}

Actor.prototype.update = function(data) {
    var d = data[0];
    var dx = this.x - d[1];
    var dy = this.y - d[2];
    
    var r = Math.atan2(dx, dy);
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1.5) {
        this.x = this.x - Math.sin(r) * dist * 0.5;
        this.y = this.y - Math.cos(r) * dist * 0.5;
        
    } else {
        this.x = d[1];
        this.y = d[2];
    }
    this.mx = d[3] - this.x;
    this.my = d[4] - this.y;
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

// Exports
window.NodeGame = Client;
})();

