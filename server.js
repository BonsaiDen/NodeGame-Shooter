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

// Server ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
var ws = require(__dirname + '/lib/ws');

function Server(port) {
    var that = this;
    
    this.fields = {};
    this.fieldsChanged = false;
    
    this.clientCount = 0;
    this.clients = {};
    
    this.$ = ws.createServer();    
    this.$.addListener('connection', function(conn) {
        that.clientAdd(conn);
        
        conn.addListener('message', function(msg) {
            if (msg.length > 512) {
                console.log('!! ' + 'Message longer than 512 chars');
                conn.close();
            
            } else {
                try {
                    that.clientState(conn.id, JSON.parse(msg));
                
                } catch (e) {
                    console.log('!! Error: ' + e);
                    conn.close();
                }
            }
        });
    });
    
    this.$.addListener('close', function(conn) {
        that.clientRemove(conn.id);
    });
    
    this.$.listen(port);
    
    // Actors
    this.actorCount = 0;
    this.actorID = 0;
    this.actorTypes = {};
    this.actors = {};
    return this;
}

Server.prototype.run = function() {
    console.log('>> Server started');
    
    var that = this;

    for(var i in this.actorTypes) {
        this.actors[i] = []; 
    }
    
    // Mainloop
    this.startTime = new Date().getTime();
    this.time = new Date().getTime();
    this.interval = 0;
    this.$g = new Game(this);
    this.bytesSend = 0;
    this.bytesSendSecond = 0;
    
    // Status
    setInterval(function() {
        var t = Math.round((that.time - that.startTime) / 1000);
        var m = Math.floor(t / 60);
        var s = t % 60;
        
        console.log('>> Running ' + m + ':' + (s < 10 ? '0' : '') + s + ' / '
                    + that.clientCount
                    + ' Client(s) / ' + that.actorCount + ' Actor(s) / '
                    + (Math.round(that.bytesSendSecond / 10 * 100 / 1024) / 100) +' kb/s');
        
        that.bytesSendSecond = 0;
        
    }, 10000);
    
    // Exit
    process.addListener('SIGINT', function () {
        console.log('>> Shutting down...');
        
        clearInterval(that.$g._loop);
        that.actorsDestroy();
        that.emit('e', {});
        setTimeout(function() {
            for(var c in that.clients) {
                that.clients[c].close();
            }
            process.exit(0);
        }, 100);
    });
};

exports.Server = Server;


// Getters
Server.prototype.getTime = function() {
    return this.time;
};

// Fields
Server.prototype.setField = function(key, value, send) {
    this.fields[key] = value;
    if (send) {
        this.fieldsChanged = true;
    }
};

Server.prototype.setFieldItem = function(key, item, value, send) {
    this.fields[key][item] = value;
    if (send) {
        this.fieldsChanged = true;
    }
};

Server.prototype.getField = function(key) {
    return this.fields[key];
};

Server.prototype.delField = function(key) {
    if (this.fields[key]) {
        delete this.fields[key];
        this.fieldsChanged = true;
    } 
};

Server.prototype.delFieldItem = function(key, item) {
    if (this.fields[key][item]) {
        delete this.fields[key][item];
        this.fieldsChanged = true;
    } 
};

Server.prototype.pushFields = function(mode) {
    if (mode) {
        this.fieldsChanged = true;
    
    } else if (this.fieldsChanged) {
        this.emit('f', this.fields);
        this.fieldsChanged = false;
    }
};

Server.prototype.forceFields = function(mode) {
    this.emit('f', this.fields);
    this.fieldsChanged = false;
};


// Clients
Server.prototype.clientAdd = function(conn) {
    if (!this.clients[conn.id]) {
        var c = this.clients[conn.id] = new Client(this, conn);
        this.clientCount++;
        c._init();
        c.onInit();   
    }
};

Server.prototype.clientState = function(id, msg) {
    this.clients[id].onMessage(msg);
};

Server.prototype.clientRemove = function(id) {
    if (this.clients[id]) {
        this.clientCount--;
        this.clients[id].onRemove();
        delete this.clients[id];
    }
};

Server.prototype.clientsUpdate = function() {
    for(var c in this.clients) {
        this.clients[c].onUpdate();
    }
};


// Actors
Server.prototype.createActor = function(clas, data) {
    var a = new Actor(this, clas, data, null);
    this.actors[clas].push(a);
    this.actorCount++;
    return a;
};

Server.prototype.createActorType = function(id) {
    function ActorType() {
        this.create = function(data) {};
        this.update = function() {};
        this.destroy = function() {};
        this.msg = function(full) {return {};};
        return this;
    }
    this.actorTypes[id] = new ActorType();
    return this.actorTypes[id];
};

Server.prototype.getActors = function(clas) {
    return this.actors[clas];
};

Server.prototype.actorsUpdate = function() {
    var allUpdates = [];
    var clientUpdates = {};
    for(var i in this.clients) {
        clientUpdates[i] = [];
    }
    
    var acc = 0;
    for(var t in this.actors) {
        var alive_actors = [];
        for(var i = 0, l = this.actors[t].length; i < l; i++) {
            var a = this.actors[t][i];
            if (a.alive) {
                a.update();
            }
            if (a.alive) {
                if (a.updated === true) {
                    a.updated = false;
                    allUpdates.push(a.toMessage(false));
                
                } else if(typeof a.updated === 'object') {
                    for(var e = 0; e < a.updated.length; e++) {
                        clientUpdates[a.updated[e]].push(a.toMessage(false));
                    }
                }
                alive_actors.push(a);
            }
        }
        this.actors[t] = alive_actors;
        acc += this.actors[t].length;
    }
    this.actorCount = acc;
    
    if (allUpdates.length > 0) {
        this.emit('u', {'a': allUpdates});
    }
    
    for(var i in this.clients) {
        if (clientUpdates[i].length > 0) {
            this.send(this.clients[i].conn, 'u', {'a': clientUpdates[i]});
        }
    }
    
};

Server.prototype.actorsDestroy = function() {
    for(var t in this.actors) {
        for(var i = 0, l = this.actors[t].length; i < l; i++) {
            this.actors[t][i].destroy();
        }
    }
};

// Messaging
Server.prototype.send = function(conn, type, msg) {
    var e = this.toJSON([type, msg]);
    this.bytesSend += e.length;
    this.bytesSendSecond += e.length;
    conn.write(e);
};

Server.prototype.emit = function(type, msg) {
    var e = this.toJSON([type, msg]);
    this.bytesSend += e.length * this.clientCount;
    this.bytesSendSecond += e.length * this.clientCount;
    this.$.broadcast(e);
};

Server.prototype.toJSON = function(data) {
    var msg = JSON.stringify(data);
    msg = msg.substring(1).substring(0, msg.length - 2);
    msg = msg.replace(/\"([a-z0-9]+)\"\:/gi, '$1:');
    return msg;
};


// Actors ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Game(srv) {
    this.$ = srv;
    this._time = this.$.time;
    this._lastTime = this._time;
    this.$.interval = this.onInit();
    
    var that = this;
    this._loop = setInterval(function(){that.run();}, 5);
}
exports.Game = Game;

Game.prototype.run = function() {
    this._time = this.$.time = new Date().getTime();
    while(this._lastTime <= this._time) {
        this.$.clientsUpdate();
        this.$.actorsUpdate();
        this.onUpdate(); 
        this._lastTime += this.$.interval 
    }
    this.$.pushFields(false);
};

Game.prototype.getTime = function() {
    return this._time;
};

Game.prototype.getActors = function(clas) {
    return this.$.getActors(clas);
};

Game.prototype.createActor = function(clas, data) {
    this.$.createActor(clas, data);
};

Game.prototype.onInit = function() {
    return 50;
};

Game.prototype.onUpdate = function() {
};


// Clients ---------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Client(srv, conn, client) {
    this.$ = srv;
    this.$g = srv.$g;
    this.conn = conn;
    this.id = conn.id;
    return this;
}

Client.prototype._init = function() {
    var actors = [];
    for(var t in this.$.actors) {
        for(var i = 0, l = this.$.actors[t].length; i < l; i++) {
            var a = this.$.actors[t][i];
            if (a.alive) {
                actors.push(a.toMessage(true));
            }
        }
    }
    
    this.send('s', {
        'd': this.$.fields,
        'n': this.$.interval,
        'i': this.id
    });
    
    this.send('i', {'a': actors});
};
exports.Client = Client;

Client.prototype.onInit = function() {
};

Client.prototype.onMessage = function(msg) {
};

Client.prototype.onUpdate = function() {
};

Client.prototype.onRemove = function() {
};

// Stuff
Client.prototype.getTime = function() {
    return this.$.getTime();
};

Client.prototype.createActor = function(clas, data) {
    var a = new Actor(this.$, clas, data, this);
    this.$.actors[clas].push(a);
    this.$.actorCount++;
    return a;
};

Client.prototype.emit = function(type, msg) {
    this.$.emit(type, msg);
}

Client.prototype.send = function(type, msg) {
    this.$.send(this.conn, type, msg);
};

Client.prototype.close = function() {
    this.conn.close();
};


// Actors ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Actor(srv, clas, data, client) {
    this.$ = srv;
    this.$g = srv.$g;
    this.id = this.$.actorID;
    this.$.actorID += 1;
    this.clas = clas;
    this.client = client;
    this.x = 0;
    this.y = 0;
    this.mx = 0;
    this.my = 0;
    
    this.alive = true;
    this.updated = true;
    
    this.$.actorTypes[this.clas].create.call(this, data); 
    this.$.emit('c', this.toMessage(true));
    return this;
}

Actor.prototype.update = function() {
    this.$.actorTypes[this.clas].update.call(this);
};

Actor.prototype.destroy = function() {
    if (this.alive) {
        this.alive = false;
        this.$.actorTypes[this.clas].destroy.call(this);
        this.$.emit('d', [this.id, Math.round(this.x), Math.round(this.y)]);
    }
};

Actor.prototype.toMessage = function(full) {
    var msg = full ? {'c': this.clas} : {};
    msg.i = this.id;
    msg.x = Math.round(this.x * 100) / 100;
    msg.y = Math.round(this.y * 100) / 100;
    msg.m = Math.round(this.mx * 100) / 100;
    msg.l = Math.round(this.my * 100) / 100;
    msg.d = this.$.actorTypes[this.clas].msg.call(this, full);
    return msg;
};

Actor.prototype.event = function(type, data) {
    var msg = [this.id, type];
    if (data != null) {
        msg.push(data);
    }
    this.$.emit('n', msg);
};

// Getters
Actor.prototype.getTime = function() {
    return this.$.getTime();
};

