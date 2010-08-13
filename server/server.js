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
var sys = require('sys');

function Server(port, maxClients, maxChars) {
    this.maxChars = maxChars || 128;
    this.maxClients = maxClients || 64;
    this.port = port;
    
    // these could be global but... meh...
    this.msgGameStart = 1;
    this.msgGameFields = 2;
    this.msgGameShutdown = 3;
    
    this.msgActorsCreate = 4;
    this.msgActorsInit = 5;
    this.msgActorsUpdate = 6;
    this.msgActorsEvent = 7;
    this.msgActorsDestroy = 8;
    
    // Server setup
    this.clientCount = 0;
    this.clients = {};
    this.clientID = 0;
    
    this.fields = {};
    this.fieldsChanged = false;
    this.logs = [];
    
    this.bytesSend = 0;
    this.bytesSendLast = 0;
    
    this.$ = ws.createServer();   
    
    var that = this;
    this.$.addListener('connection', function(conn) {
        if (this.clientCount >= this.maxClients) {
            conn.close();
            return;
        }
        
        var id = that.clientAdd(conn);
        conn.addListener('message', function(msg) {
        
            // a little bit paranoid...
            if (msg.length > that.maxChars) {
                that.log('Message longer than ' + that.maxChars
                            + ' chars');
                
                conn.close();
            
            } else {
                try {
                    that.clientState(id, JSON.parse(msg));
                
                } catch (e) {
                    that.log('Error: ' + e);
                    conn.close();
                }
            }
        });
        
        conn.addListener('close', function(conn) {
            that.clientRemove(id);
        });
    });
    
    // Actors
    this.actorCount = 0;
    this.actorID = 0;
    this.actorTypes = {};
    this.actors = {};
    
    // Hey Listen!
    this.$.listen(this.port);
}


// Start -----------------------------------------------------------------------
Server.prototype.run = function() {
    var that = this;
    process.nextTick(function() {
        that.start();
    });
};

Server.prototype.start = function() {
    var that = this;
    for(var i in this.actorTypes) {
        this.actors[i] = []; 
    }
    
    // Mainloop
    this.startTime = new Date().getTime();
    this.time = new Date().getTime();
    this.log('>> Server started');
    this.$g.start();
    this.status();
    
    // Exit
    process.addListener('SIGINT', function () {
        that.log('>> Shutting down...');
        that.status(true);
        that.$g.running = false;
        that.actorsDestroy();
        that.emit(that.msgGameShutdown, []);
        setTimeout(function() {
            sys.print('\x1b[u\n');
            for(var c in that.clients) {
                that.clients[c].close();
            }
            process.exit(0);
        }, 100);
    });
};

Server.prototype.initGame = function(interval) {
    this.$g = new Game(this, interval);
    return this.$g;
};

Server.prototype.log = function(str) {
    this.logs.push([this.getTime(), str]);
    if (this.logs.length > 18) {
        this.logs.shift();
    }
};

Server.prototype.status = function(end) {
    var that = this;
    function toTime(time) {
        var t = Math.round((time - that.startTime) / 1000);
        var m = Math.floor(t / 60);
        var s = t % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function toSize(size) {
        var t = 0;
        while(size >= 1024 && t < 2) {
            size = size / 1024;
            t++;
        }
        return Math.round(size * 100) / 100 + [' bytes', ' kib', ' mib'][t];
    }
    
    var stats = '    Running ' + toTime(this.time) + ' | '
                + this.clientCount
                + ' Client(s) | ' + this.actorCount + ' Actor(s) | '
                + toSize(this.bytesSend)
                + ' send | '
                + toSize((this.bytesSend - this.bytesSendLast) * 2)
                + '/s\n';
    
    this.bytesSendLast = this.bytesSend;
    for(var i = this.logs.length - 1; i >= 0; i--) {
        stats += '\n      ' + toTime(this.logs[i][0])
                 + ' ' + this.logs[i][1];
    }
    sys.print('\x1b[H\x1b[J# NodeGame Server at port '
              + this.port + '\n' + stats + '\n\x1b[s\x1b[H');
              
    if (!end) {
        var that = this;
        setTimeout(function() {that.status(false)}, 500);
    }
};

exports.Server = Server;


// Clients ---------------------------------------------------------------------
Server.prototype.clientAdd = function(conn) {
    this.clientID += 1;
    var c = this.clients[this.clientID] = new Client(this, conn, this.clientID);
    this.clientCount++;
    c._init();
    c.onInit(); 
    return this.clientID;
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


// Actors ----------------------------------------------------------------------
Server.prototype.createActor = function(clas, data) {
    var a = new Actor(this, clas, data, null);
    this.actors[clas].push(a);
    return a;
};

Server.prototype.createActorType = function(id) {
    function ActorType() {
        this.create = function(data) {};
        this.update = function() {};
        this.destroy = function() {};
        this.msg = function(full) {return {};};
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
    
    this.actorCount = 0;
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
        this.actorCount += this.actors[t].length;
    }
    
    // Emit updates
    if (allUpdates.length > 0) {
        this.emit(this.msgActorsUpdate, allUpdates);
    }
    
    for(var i in this.clients) {
        if (clientUpdates[i].length > 0) {
            this.send(this.clients[i].conn, this.msgActorsUpdate,
                                            clientUpdates[i]);
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


// Messaging -------------------------------------------------------------------
Server.prototype.send = function(conn, type, msg) {
    msg.unshift(type);
    var e = this.toJSON(msg);
    this.bytesSend += e.length;
    conn.write(e);
};

Server.prototype.emit = function(type, msg) {
    msg.unshift(type);
    var e = this.toJSON(msg);
    this.bytesSend += e.length * this.clientCount;
    this.$.broadcast(e);
};

Server.prototype.toJSON = function(data) {
    var msg = JSON.stringify(data);
    msg = msg.substring(1).substring(0, msg.length - 2);
    msg = msg.replace(/\"([a-z0-9]+)\"\:/gi, '$1:');
    return msg;
};


// Helpers ---------------------------------------------------------------------
Server.prototype.getTime = function() {
    return this.time;
};

Server.prototype.timeDiff = function(time) {
    return this.time - time;
};

Server.prototype.setField = function(key, value, send) {
    this.fields[key] = value;
    if (send !== false) {
        this.fieldsChanged = true;
    }
};

Server.prototype.setFieldItem = function(key, item, value, send) {
    this.fields[key][item] = value;
    if (send !== false) {
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

Server.prototype.updateFields = function(mode) {
    if (mode) {
        this.fieldsChanged = true;
    
    } else if (this.fieldsChanged) {
        this.emit(this.msgGameFields, [this.fields]);
        this.fieldsChanged = false;
    }
};

Server.prototype.emitFields = function(mode) {
    this.emit(this.msgGameFields, [this.fields]);
    this.fieldsChanged = false;
};


// Gane ------------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Game(srv, interval) {
    this.$ = srv;
    this.interval = interval;
}

Game.prototype.start = function() {
    this._time = this.$.time;
    this._lastTime = this._time;
    this.running = true;
    this.onInit();
    this.loop();
};

Game.prototype.loop = function() {
    var that = this;
    setTimeout(function(){that.run();}, 5);
};

Game.prototype.run = function() {
    if (this.running) {
        this.$.updateFields(false);
        this._time = this.$.time = new Date().getTime();
        while(this._lastTime <= this._time) {
            this.$.clientsUpdate();
            this.$.actorsUpdate();
            this.onUpdate(); 
            this._lastTime += this.interval;
        }
        this.loop();
    }
};

Game.prototype.getTime = function() {
    return this._time;
};

Game.prototype.log = function(str) {
    this.$.log(str);
};

Game.prototype.timeDiff = function(time) {
    return this.$.timeDiff(time);
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
function Client(srv, conn, id) {
    this.$ = srv;
    this.$g = srv.$g;
    this.conn = conn;
    this.id = id;
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
    
    this.send(this.$.msgGameStart, [
        this.id,
        this.$g.interval,
        this.$.fields
    ]);
    
    this.send(this.$.msgActorsInit, actors);
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
Client.prototype.log = function(str) {
    this.$.log(str);
};

Client.prototype.getInfo = function() {
    return this.conn.id;
}

Client.prototype.getTime = function() {
    return this.$.getTime();
};

Client.prototype.timeDiff = function(time) {
    return this.$.timeDiff(time);
};

Client.prototype.send = function(type, msg) {
    this.$.send(this.conn, type, msg);
};

Client.prototype.close = function() {
    this.conn.close();
};


// Actors ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Actor(srv, clas, data) {
    this.$ = srv;
    this.$g = srv.$g;
    this.id = this.$.actorID;
    this.$.actorID += 1;
    this.clas = clas;
    this.x = 0;
    this.y = 0;
    this.mx = 0;
    this.my = 0;
    
    this.alive = true;
    this.updated = false;
    
    for(var m in this.$.actorTypes[this.clas]) {
        if (m != 'destroy') {
            this[m] = this.$.actorTypes[this.clas][m];
        }
    }
    this.create(data); 
    this.$.emit(this.$.msgActorsCreate, this.toMessage(true));
}
Actor.prototype.destroy = function() {
    if (this.alive) {
        this.alive = false;
        this.$.actorTypes[this.clas].destroy.call(this);
        this.$.emit(this.$.msgActorsDestroy, [this.id, Math.round(this.x),
                                                       Math.round(this.y)]);
    }
};

Actor.prototype.toMessage = function(full) {
    var raw = [
        this.id,
        Math.round(this.x * 100) / 100,
        Math.round(this.y * 100) / 100,
        Math.round(this.mx * 100) / 100,
        Math.round(this.my * 100) / 100
    ];
    if (full) {
        raw.push(this.clas);
    }
    
    var msg = [raw];
    var d = this.msg(full);
    if (d.length > 0) {
        msg.push(d);
    }
    return msg;
};

Actor.prototype.event = function(type, data) {
    var msg = [this.id, type];
    if (data != null) {
        msg.push(data);
    }
    this.$.emit(this.$.msgActorsEvent, msg);
};

Actor.prototype.getTime = function() {
    return this.$.getTime();
};

Actor.prototype.timeDiff = function(time) {
    return this.$.timeDiff(time);
};

