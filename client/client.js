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


// Game ------------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Game(client) {
    this.$ = client;
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
    return this.$.getTime();
};

Game.prototype.send = function(msg) {
    this.$.send(msg);
};


// Client ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Client(fps) {
    this.conn = null;
    this.connected = false;
    this.lastState = '';
    this.id = '';
    
    this.intervalTime = 0;
    this.interval = null;
    this.intervalSteps = 0;
    this.fpsTime = Math.round(1000 / fps);
    
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
    this.$g = new Game(this);
};

Client.prototype.connect = function(host, port) {
    if (!window['WebSocket']) {
        this.$g.onWebSocketError();
        return;
    }
    
    var that = this;
    this.conn = new WebSocket('ws://' + host + ':' + port);
    this.conn.onopen = function() {
        that.connected = true;
        that.$g.onConnect(true);
    };
    
    this.conn.onmessage = function(msg){
        that.onMessage(msg);
    }
    
    this.conn.onclose = function(e) {
        if (that.connected) {
            that.quit();
            that.$g.onClose();
        
        } else {
            that.$g.onConnect(false);
        }
    };
    
    this.conn.onerror = function(e) {
        if (that.connected) {
            that.quit();
            that.$g.onError(e);
        }
    };
    
    window.onbeforeunload = window.onunload = function() {
        that.conn.close();
    };
};

Client.prototype.onMessage = function(msg) {
    var that = this;
    try {
        var data = JSON.parse('[' + msg.data.replace(/([a-z0-9]+)\:/gi, '"$1":') + ']');
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
        this.id = data[0];
        this.lastFrame = this.lastRender = this.getTime();
        
        this.intervalTime = data[1];
        this.intervalSteps = this.intervalTime / 10;
        this.interval = setInterval(function() {that.update()}, 15);
        
        this.$g.onInit(data[2]);
    
    } else if (type == this.msgGameFields) {
        this.$g.onUpdate(data[0]);
    
    } else if (type == this.msgGameShutdown) {
        this.$g.onShutdown(data);
        
    // Actors
    } else if (type == this.msgActorsCreate) {
        this.actors[data[0][1]] = new Actor(this, data);
    
    } else if (type == this.msgActorsInit) {
        for(var i = 0, l = data.length; i < l; i++) {
            var a = data[i];
            this.actors[a[0][1]] = new Actor(this, a);
        }
    
    } else if (type == this.msgActorsUpdate) {
        for(var i = 0, l = data.length; i < l; i++) {
            var a = data[i];
            if (this.actors[a[0][1]]) {
                this.actors[a[0][1]].update(a);
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
    clearInterval(this.interval);
    for(var i in this.actors) {
        this.actors[i].destroy();
    }
};

Client.prototype.update = function() {
    var currentFrame = this.getTime();
    while(this.lastFrame < currentFrame) {
        this.render();
        this.lastFrame += 10;
    }
};

Client.prototype.render = function() {
    var render = this.getTime() - this.lastRender > this.fpsTime;
    if (render) {
        this.lastRender = this.getTime();
        var msg = JSON.stringify(this.$g.onControl());
        if (msg != this.lastState) {
            this.conn.send(msg);
            this.lastState = msg;
        }
        this.$g.onRender();
    }
    
    for(var c in this.actors) {
        var a = this.actors[c];
        a.x += a.mx / this.intervalSteps;
        a.y += a.my / this.intervalSteps;
        this.actorTypes[a.clas].interleave.call(a);
        
        if (render) {
            this.actorTypes[a.clas].render.call(a);
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
    this.$ = game;
    this.$g = game.$g;
    
    var d = data[0]
    this.clas = d[0];
    this.id = d[1];
    
    this.x = d[2];
    this.y = d[3];
    this.mx = d[4];
    this.my = d[5];
    
    this.$.actorTypes[this.clas].create.call(this, data[1]);
}

Actor.prototype.update = function(data) {
    var d = data[0];
    this.x = d[2];
    this.y = d[3];
    this.mx = d[4];
    this.my = d[5];
    
    this.$.actorTypes[this.clas].update.call(this, data[1]);
};

Actor.prototype.event = function(type, data) {
    this.$.actor_types[this.clas].event.call(this, type, data);
};

Actor.prototype.destroy = function(x, y) {
    this.x = x;
    this.y = y;
    this.$.actorTypes[this.clas].destroy.call(this);
};

