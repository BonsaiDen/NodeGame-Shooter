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


var sys = require('sys');
var fs= require('fs');

var WebSocket = require('./WebSocket');
var BISON = require('./bison');

// Message types
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


// Game Model ------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Model(interval) {
    this.interval = interval;
    this.game = {};
    this.client = {};
    this.actors = {};
    this.baseActor = function(rate) {
        this.updateRate = rate;
        this.onCreate = function(data) {};
        this.onUpdate = function() {};
        this.onDestroy = function() {};
        this.onMessage = function(once) {return [];};
    };
}

Model.prototype.Game = function() {
    return this.game;
};

Model.prototype.Client = function() {
    return this.client;
};

Model.prototype.Actor = function(id, rate) {
    return this.actors[id] = new this.baseActor(rate);
};

Model.prototype.Server = function(options) {
    return new Server(options, this);
};

exports.Model = function(interval) {
    return new Model(interval);
};


// Server ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Server(options, model) {
    this.maxChars = options.maxChars || 128;
    this.maxClients = options.maxClients || 64;
    this.port = options.port || 8000;
    this.showStatus = options.status === false ? false : true;
    this.flash = options.flash || false;

    // Server
    this.model = model;
    this.fields = {};
    this.fieldsChanged = false;
    this.logs = [];

    // Client
    this.clientCount = 0;
    this.clients = {};
    this.clientID = 0;

    // Actors
    this.actorCount = 0;
    this.actorID = 0;
    this.actorTypes = model.actors;
    this.actors = {};

    this.bytesSend = 0;
    this.bytesSendLast = 0;

    // Recording
    this.record = options.record || false;
    this.recordFile = options.recordFile || './record[date].js';
    this.recordData = [];

    // Socket
    var that = this;
    this.$ = new WebSocket.Server();
    this.$.on('connection', function(conn) {
        if (this.clientCount >= this.maxClients) {
            conn.close();
            return;
        }
    });

    this.$.on('data', function(conn, msg) {
        if (msg.length > that.maxChars) {
            that.log('!! Message longer than ' + that.maxChars + ' chars');
            conn.close();

        } else {
            try {
                var msg = BISON.decode(msg);
                if (!conn.$clientID && msg instanceof Array && msg.length === 1
                    && msg[0] === 'init') {

                    conn.$clientID = that.addClient(conn);

                } else if (conn.$clientID) {
                    that.clients[conn.$clientID].send(MSG_GAME_PING, []);
                    that.clients[conn.$clientID].onMessage(msg);
                }

            } catch (e) {
                that.log('!! Error: ' + e);
                conn.close();
            }
        }
    });

    this.$.on('end', function(conn) {
        that.removeClient(conn.$clientID);
    });

    // Hey Listen!
    this.$.listen(this.port);
    this.run();
}


// General ---------------------------------------------------------------------
Server.prototype.run = function() {
    var that = this;
    for(var i in this.actorTypes) {
        this.actors[i] = [];
    }
    this.startTime = new Date().getTime();
    this.time = new Date().getTime();
    this.log('>> Server started');
    this.$$ = new Game(this);
    this.$$.start();
    this.status();

    if (this.record) {
        this.clientID++;
        this.clients[0] = new Client(this, null, true);
        this.clientCount++;
    }
    process.addListener('SIGINT', function(){that.shutdown()});
};

Server.prototype.shutdown = function() {
    this.$$.$running = false;
    this.emit(MSG_GAME_SHUTDOWN, this.$$.onShutdown());
    this.destroyActors();

    var that = this;
    setTimeout(function() {
        for(var c in that.clients) {
            that.clients[c].close();
        }
        that.saveRecording();
        that.log('>> Shutting down...');
        that.status(true);
        process.exit(0);
    }, 100);
};

Server.prototype.recordMessage = function(msg) {
    if (msg[0] !== MSG_GAME_SHUTDOWN) {
        this.recordData.push([this.getTime() - this.startTime,
                              JSON.stringify(msg)]);
    }
};

Server.prototype.saveRecording = function() {
    if (this.record) {
        this.log('## Saving recording...');
        var date = new Date().toString().replace(/(\s|:)/g, '-').substr(0, 24)
        var file = this.recordFile.replace('[date]', '.' + date);
        var fd = fs.openSync(file, 'w+');
        if (!fd) {
            this.log('!! Failed to save recording');

        } else {
            var str = 'var RECORD = [\n';
            for(var i = 0, l = this.recordData.length; i < l; i++) {
                str += '    ' + '[' + this.recordData[i] + ']'
                              + (i < l - 1 ? ',' : '') + '\n';
            }
            fs.writeSync(fd, str + '];');
            this.log('## Recording saved');
        }
    }
};


// Helpers ---------------------------------------------------------------------
Server.prototype.getTime = function() {
    return this.time;
};

Server.prototype.timeDiff = function(time) {
    return this.time - time;
};

Server.prototype.log = function(str) {
    if (this.showStatus) {
        this.logs.push([this.getTime(), str]);
        if (this.logs.length > 20) {
            this.logs.shift();
        }

    } else {
        console.log(str);
    }
};

Server.prototype.toSize = function(size) {
    var t = 0;
    while(size >= 1024 && t < 2) {
        size = size / 1024;
        t++;
    }
    return Math.round(size * 100) / 100 + [' bytes', ' kib', ' mib'][t];
};

Server.prototype.toTime = function(time) {
    var t = Math.round((time - this.startTime) / 1000);
    var m = Math.floor(t / 60);
    var s = t % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
};

Server.prototype.status = function(end) {
    var that = this;
    if (!this.showStatus) {
        return;
    }

    var stats = '    Running ' + this.toTime(this.time) + ' | '
                + this.clientCount
                + ' Client(s) | ' + this.actorCount + ' Actor(s) | '
                + this.toSize(this.bytesSend)
                + ' send | '
                + this.toSize((this.bytesSend - this.bytesSendLast) * 2)
                + '/s\n';

    this.bytesSendLast = this.bytesSend;
    for(var i = this.logs.length - 1; i >= 0; i--) {
        stats += '\n      ' + this.toTime(this.logs[i][0])
                            + ' ' + this.logs[i][1];
    }
    sys.print('\x1b[H\x1b[J# NodeGame Server at port '
              + this.port + (this.flash ? ' / 843' : '') + '\n' + stats + '\n\x1b[s\x1b[H');

    if (!end) {
        setTimeout(function() {that.status(false)}, 500);

    } else {
        sys.print('\x1b[u\n');
    }
};


// Clients ---------------------------------------------------------------------
Server.prototype.addClient = function(conn) {
    this.clientID++;
    this.clients[this.clientID] = new Client(this, conn, false);
    this.clientCount++;
    return this.clientID;
};

Server.prototype.removeClient = function(id) {
    if (this.clients[id]) {
        this.clientCount--;
        this.clients[id].remove();
        delete this.clients[id];
    }
};

Server.prototype.updateClients = function() {
    for(var c in this.clients) {
        this.clients[c].update();
    }
};


// Messaging -------------------------------------------------------------------
Server.prototype.send = function(conn, type, msg, record) {
    msg.unshift(type);
    if (!record) {
        this.bytesSend += conn.send(this.toBISON(msg));

    } else {
        this.recordMessage(msg);
    }
};

Server.prototype.emit = function(type, msg) {
    msg.unshift(type);
    this.bytesSend += this.$.broadcast(this.toBISON(msg));
    if (this.record) {
        this.recordMessage(msg);
    }
};

Server.prototype.messageAll = function(msg) {
    msg = [MSG_CLIENT_MESSAGE, msg];
    this.bytesSend += this.$.broadcast(this.toBISON(msg));
    if (this.record) {
        this.recordMessage(msg);
    }
};

Server.prototype.toBISON = function(data) {
    return BISON.encode(data);
};


// Actors ----------------------------------------------------------------------
Server.prototype.createActor = function(clas, data) {
    var a = new Actor(this, clas, data, null);
    this.actors[clas].push(a);
    return a;
};

Server.prototype.getActors = function(clas) {
    return this.actors[clas];
};

Server.prototype.updateActors = function() {
    this.actorCount = 0;
    for(var t in this.actors) {
        for(var i = 0, l = this.actors[t].length; i < l; i++) {
            var a = this.actors[t][i];
            if (a.$alive) {
                a.onUpdate();
                if (a.$updateRate > 0) {
                    a.$updateCount++;
                    if (a.$updateCount >= a.$updateRate) {
                        a.$updated = true;
                        a.$updateCount = 0;
                    }
                }
            }
            if (a.$alive) {
                if (a.$updated) {
                    a.$emit(MSG_ACTORS_UPDATE);
                    a.$updated = false;

                } else {
                    a.$emit(MSG_ACTORS_INIT);
                }

            } else {
                this.actors[t].splice(i, 1);
                i--;
                l--;
            }
        }
        this.actorCount += this.actors[t].length;
    }
    this.sendActors();
};

Server.prototype.sendActors = function(types) {
    types = types || [MSG_ACTORS_INIT, MSG_ACTORS_CREATE, MSG_ACTORS_UPDATE,
                      MSG_ACTORS_EVENT, MSG_ACTORS_REMOVE, MSG_ACTORS_DESTROY];

    for(var i in this.clients) {
        var c = this.clients[i];
        if (!c.$initiated) {
            continue;
        }

        for(var t = 0, l = types.length; t < l; t++) {
            if (c.$messages[types[t]].length !== 0) {
                c.send(types[t], c.$messages[types[t]]);
                c.$messages[types[t]] = [];
            }
        }
    }
};

Server.prototype.destroyActors = function() {
    for(var t in this.actors) {
        for(var i = 0, l = this.actors[t].length; i < l; i++) {
            this.actors[t][i].destroy();
        }
    }
};


// Fields ----------------------------------------------------------------------
function Field(value) {
    this.clients = [];
    this.value = value;
    this.updated = true;
}

Field.prototype.update = function(value) {
    if (value !== undefined) {
        this.value = value;
    }
    this.updated = true;
};

Server.prototype.updateFields = function() {
    for(var i in this.clients) {
        var c = this.clients[i];
        if (c.$initiated) {
            var fields = this.getFields(i, false);
            if (fields !== null) {
                c.send(MSG_GAME_FIELDS, [fields]);
            }
        }
    }

    for(var i in this.fields) {
        this.fields[i].updated = false;
    }
};

Server.prototype.getFields = function(id, force) {
    var fieldData = {};
    var changed = false;

    for(var i in this.fields) {
        var f = this.fields[i];
        if (f.clients.length === 0 || f.clients.indexOf(id) !== -1) {
            if (f.updated || force) {
                fieldData[i] = f.value;
                changed = true;
            }
        }
    }
    return changed ? fieldData : null;
};


// Game ------------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Game(srv) {
    this.$ = srv;
    this.$interval = Math.round(1000 / this.$.model.interval);
    for(var m in this.$.model.game) {
        this[m] = this.$.model.game[m];
    }
}

Game.prototype.start = function() {
    this.$lastTime = this.$.time;
    this.$running = true;
    this.onInit();
    this.run();
};

Game.prototype.run = function() {
    if (this.$running) {
        this.$.updateFields();
        this.$.time = new Date().getTime();
        while(this.$lastTime <= this.$.time) {
            this.$.updateClients();
            this.$.updateActors();
            this.onUpdate();
            this.$lastTime += this.$interval;
        }
        var that = this;
        setTimeout(function(){that.run();}, 5);
    }
};

Game.prototype.onInit = function() {
};

Game.prototype.onUpdate = function() {
};

Game.prototype.onShutdown = function() {
    return [];
};

// Helpers
Game.prototype.getTime = function() {
    return this.$.time;
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
    return this.$.createActor(clas, data);
};

Game.prototype.destroyActors = function() {
    return this.$.destroyActors();
};

Game.prototype.createField = function(id, value) {
    return this.$.fields[id] = new Field(value);
};


// Clients ---------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Client(srv, conn, record) {
    this.$ = srv;
    this.$$ = srv.$$;

    if (!record) {
        var e = conn.id.split(':');
        this.ip = e[0];
        this.port = Math.abs(e[1]);

    } else {
        this.ip = '127.0.0.1';
        this.port = 'RECORD';
    }

    this.$record = record;
    this.$conn = conn;
    this.$.time = srv.time;
    this.id = this.$.clientID;
    this.$actors = [];

    this.$messages = {};
    this.$messages[MSG_ACTORS_INIT] = [];
    this.$messages[MSG_ACTORS_CREATE] = [];
    this.$messages[MSG_ACTORS_UPDATE] = [];
    this.$messages[MSG_ACTORS_EVENT] = [];
    this.$messages[MSG_ACTORS_REMOVE] = [];
    this.$messages[MSG_ACTORS_DESTROY] = [];

    this.$initiated = false;
    for(var t in this.$.actors) {
        for(var i = 0, l = this.$.actors[t].length; i < l; i++) {
            this.$.actors[t][i].$emit(MSG_ACTORS_INIT);
        }
    }
    for(var m in this.$.model.client) {
        this[m] = this.$.model.client[m];
    }
    this.onInit();
}

Client.prototype.update = function() {
    if (!this.$initiated) {
        this.send(MSG_GAME_START, [this.id, this.$$.$interval,
                                   this.$.getFields(this.id, true)]);

        this.$initiated = true;
    }
    this.onUpdate();
};

Client.prototype.message = function(msg) {
    this.send(MSG_CLIENT_MESSAGE, [msg]);
};

Client.prototype.send = function(type, msg) {
    this.$.send(this.$conn, type, msg, this.$record);
};

Client.prototype.close = function() {
    if (!this.$record) {
        this.$conn.close();
    }
};

Client.prototype.remove = function() {
    this.onRemove();
    this.$actors = [];
    this.$messages = {};
};

Client.prototype.onInit = function() {
};

Client.prototype.onUpdate = function() {
};

Client.prototype.onMessage = function(msg) {
};

Client.prototype.onRemove = function() {
};


// Helpers
Client.prototype.log = function(str) {
    this.$.log(str);
};

Client.prototype.getTime = function() {
    return this.$.getTime();
};

Client.prototype.getTimeConnected = function() {
    return this.$.getTime() - this.$time;
};

Client.prototype.timeDiff = function(time) {
    return this.$.timeDiff(time);
};

Client.prototype.bytesSend = function() {
    return this.$conn.bytesSend;
};


// Actors ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
function Actor(srv, clas, data) {
    this.$ = srv;
    this.$$ = srv.$$;
    this.id = ++this.$.actorID;
    this.$clas = clas;
    this.x = 0;
    this.y = 0;
    this.mx = 0;
    this.my = 0;

    this.$clients = [];
    this.$alive = true;
    this.$updated = false;
    this.$updateRate = this.$.actorTypes[this.$clas].updateRate;
    this.$updateCount = this.$updateRate;

    // Extend
    for(var m in this.$.actorTypes[this.$clas]) {
        if (m !== 'destroy' && m !== 'update' && m !== 'alive') {
            this[m] = this.$.actorTypes[this.$clas][m];
        }
    }
    this.onCreate(data);
    this.$emit(MSG_ACTORS_CREATE);
}

Actor.prototype.$emit = function(type, event) {
    for(var i in this.$.clients) {
        var c = this.$.clients[i];
        var index = c.$actors.indexOf(this.id);

        // Should this actor be broadcasted to the client?
        if (this.$clients.length === 0 || this.$clients.indexOf(c.id) !== -1) {

            // Create
            if (type === MSG_ACTORS_CREATE && index === -1) {
                c.$actors.push(this.id);
                c.$messages[MSG_ACTORS_CREATE].push(this.toMessage(true));

            // Init
            } else if (type === MSG_ACTORS_INIT && index === -1) {
                c.$actors.push(this.id);
                c.$messages[MSG_ACTORS_INIT].push(this.toMessage(true));

            } else {

                // Init in case the actor was removed previously
                if (index === -1) {
                    c.$actors.push(this.id);
                    c.$messages[MSG_ACTORS_INIT].push(this.toMessage(true));
                }

                // Destroy
                if (type === MSG_ACTORS_DESTROY) {
                    c.$actors.splice(index, 1);
                    c.$messages[MSG_ACTORS_DESTROY].push([this.id,
                                                          Math.round(this.x),
                                                          Math.round(this.y)]);

                // Remove
                } else if (type === MSG_ACTORS_REMOVE) {
                    c.$actors.splice(index, 1);
                    c.$messages[MSG_ACTORS_REMOVE].push([this.id]);

                // Update
                } else if (type === MSG_ACTORS_UPDATE) {
                    c.$messages[MSG_ACTORS_UPDATE].push(this.toMessage(false));

                // Event
                } else if (type === MSG_ACTORS_EVENT) {
                    c.$messages[MSG_ACTORS_EVENT].push(event);
                }
            }

        // Remove
        } else if (this.$clients.indexOf(c.id) === -1 && index !== -1) {
            c.$actors.splice(index, 1);
            c.$messages[MSG_ACTORS_REMOVE].push([this.id]);
        }
    }
};

Actor.prototype.sendEvent = function(data) {
    this.$emit(MSG_ACTORS_EVENT, [this.id, data]);
};

Actor.prototype.toMessage = function(once) {
    var x = Math.round(this.x * 100) / 100;
    var y = Math.round(this.y * 100) / 100;
    var nx = Math.round((x + this.interleave(this.mx)) * 100) / 100;
    var ny = Math.round((y + this.interleave(this.my)) * 100) / 100;

    var raw = [this.id, x, y, nx, ny];
    if (once) {
        raw.push(this.$clas);
    }

    var msg = [raw];
    var d = this.onMessage(once);
    if (d.length > 0) {
        msg.push(d);
    }
    return msg;
};

Actor.prototype.interleave = function(value) {
    return value * this.$updateRate;
};

Actor.prototype.update = function() {
    this.$updated = true;
};

Actor.prototype.alive = function() {
    return this.$alive;
};

Actor.prototype.clients = function(clients) {
    this.$clients = clients || [];
};

Actor.prototype.destroy = function() {
    if (this.$alive) {
        this.$alive = false;
        this.onDestroy();
        this.$emit(MSG_ACTORS_DESTROY);
    }
};

Actor.prototype.remove = function() {
    if (this.$alive) {
        this.$alive = false;
        this.onDestroy();
        this.$emit(MSG_ACTORS_REMOVE);
    }
};

// Helpers
Actor.prototype.log = function(str) {
    return this.$.log(str);
};

Actor.prototype.getTime = function() {
    return this.$.getTime();
};

Actor.prototype.timeDiff = function(time) {
    return this.$.timeDiff(time);
};

