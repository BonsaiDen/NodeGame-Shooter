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

// Game ------------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Game(client) {
    this.$s = client;
    this.id = -1; 
    this.intervalSteps = 0;
};

Game.prototype.onConnect = function(success) {
};

Game.prototype.onWebSocketError = function() {
};

Game.prototype.onInit = function(data) {
};

Game.prototype.onUpdate = function(data) {
};

Game.prototype.onRender = function() {
};

Game.prototype.onShutdown = function(clean) {
};

Game.prototype.onClose = function() {
};

Game.prototype.onError = function(e) {
};

Game.prototype.getTime = function() {
    return this.$s.getTime();
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
    this.running = false;
    
    this.actors = {};
    this.actorTypes = {};
    
    this.msgGameStart = 1;
    this.msgGameFields = 2;
    this.msgGameShutdown = 3;
    
    this.msgActorsCreate = 4;
    this.msgActorsInit = 5;
    this.msgActorsUpdate = 6;
    this.msgActorsEvent = 7;
    this.msgActorsDestroy = 8;
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
    
    this.conn.onmessage = function(msg){
        that.onMessage(msg);
    }
    
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
    try {
        var data = JSON.parse('[' +
                              msg.data.replace(/([a-z0-9]+)\:/gi, '"$1":')
                              + ']');
        
        var type = data.shift();
    
    } catch(e) {
        try {
            console.log('JSON Error:', msg);
        } catch(e) {
            
        }
        return;
    }
    
    // Game
    if (type == this.msgGameStart) {
        this.$.id = data[0];
        this.lastFrame = this.lastRender = this.getTime();
        this.$.intervalSteps = data[1] / 10;
        
        this.running = true;
        this.loop();
        
        this.$.onInit(data[2]);
    
    } else if (type == this.msgGameFields) {
        this.$.onUpdate(data[0]);
    
    } else if (type == this.msgGameShutdown) {
        this.$.onShutdown(data);
        
    // Actors
    } else if (type == this.msgActorsCreate) {
        this.actors[data[0][0]] = new Actor(this, data);
    
    } else if (type == this.msgActorsInit) {
        for(var i = 0, l = data.length; i < l; i++) {
            var a = data[i];
            this.actors[a[0][0]] = new Actor(this, a);
        }
    
    } else if (type == this.msgActorsUpdate) {
        for(var i = 0, l = data.length; i < l; i++) {
            var a = data[i];
            if (this.actors[a[0][0]]) {
                this.actors[a[0][0]].update(a);
            }
        }
    
    } else if (type == this.msgActorsEvent) {
        this.actors[data[0]].event(data[1], data.length > 2 ? data[2] : {});
    
    } else if (type == this.msgActorsDestroy) {
        this.actors[data[0]].destroy(data[1], data[2]);
        delete this.actors[data[0]];
    }
};

Client.prototype.quit = function() {
    this.running = false;
    for(var i in this.actors) {
        this.actors[i].destroy();
    }
};

Client.prototype.createGame = function(fps) {
    this.fpsTime = Math.round(1000 / fps);
    this.$ = new Game(this);
    return this.$;
};


// Mainloop --------------------------------------------------------------------
Client.prototype.loop = function() {
    var that = this;
    setTimeout(function() {that.update()}, 5);
};

Client.prototype.update = function() {
    if (this.running) {
        var currentFrame = this.getTime();
        while(this.lastFrame < currentFrame) {
            this.render();
            this.lastFrame += 10;
        }
        this.loop();
    }
};

Client.prototype.render = function() {
    var render = this.getTime() - this.lastRender > this.fpsTime;
    if (render) {
        this.lastRender = this.getTime();
        var msg = JSON.stringify(this.$.onControl());
        if (msg != this.lastState) {
            this.conn.send(msg);
            this.lastState = msg;
        }
        this.$.onRender();
    }
    
    for(var c in this.actors) {
        var a = this.actors[c];
        a.x += a.mx / this.$.intervalSteps;
        a.y += a.my / this.$.intervalSteps;
        a.interleave();
        if (render) {
            a.render();
        }
    }
};

Client.prototype.createActorType = function(id) {
    function ActorType() {
        this.create = function(data) {};
        this.update = function(data) {};
        this.interleave = function() {};
        this.render = function() {};
        this.event = function(type, data) {};
        this.destroy = function() {};
        return this;
    }
    this.actorTypes[id] = new ActorType();
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
function Actor(game, data) {
    this.$s = game;
    this.$ = game.$;
    
    var d = data[0]
    this.id = d[0];
    
    this.x = d[1];
    this.y = d[2];
    this.mx = d[3];
    this.my = d[4];
    this.clas = d[5];
    
    for(var m in this.$s.actorTypes[this.clas]) {
        if (m != 'update' && m != 'destroy') {
            this[m] = this.$s.actorTypes[this.clas][m];
        }
    }
    this.create(data[1]);
}

Actor.prototype.update = function(data) {
    var d = data[0];
    this.x = d[1];
    this.y = d[2];
    this.mx = d[3];
    this.my = d[4];
    this.$s.actorTypes[this.clas].update.call(this, data[1]);
};

Actor.prototype.destroy = function(x, y) {
    this.x = x;
    this.y = y;
    this.$s.actorTypes[this.clas].destroy.call(this);
};

// Exports
window.NodeGame = Client;
})();

