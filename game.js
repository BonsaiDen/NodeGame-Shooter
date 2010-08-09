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

var gs = require(__dirname + '/server');
var Game = gs.Game;
var Client = gs.Client;

// Start
var SERVER = new gs.Server(28785);


// Game ------------------------------------------------------------------------
// -----------------------------------------------------------------------------
Game.prototype.onInit = function() {
    this.width = 480;
    this.height = 480;

    this.$.setField('size', [this.width, this.height], true);
    this.$.setField('players', {}, true);
    this.$.setField('scores', {}, true);
    this.$.setField('colors', {}, true);
    
    // Rounds
    this.roundTime = 180000;
    this.roundWait = 15000;
    
    this.roundID = 0;
    this.roundStart = 0;
    this.roundTimeLeft = 0;
    this.roundFinished = false;
    this.roundStats = {};
    
    this.maxPlayers = 6;
    this.playerCount = 0;
    this.playerColors = [-1, -1, -1, -1, -1, -1, -1];
    
    this.$.setField('max', this.maxPlayers, true);
    
    // PowerUPS
    this.powerUps = {};
    this.initPowerUp('shield', 2, 23, 10);
    this.initPowerUp('laser',  1, 32, 15);
    this.initPowerUp('life',   2, 8, 8);
    this.initPowerUp('boost',  2, 20, 15);
    this.initPowerUp('defense', 1, 37, 20);
    this.initPowerUp('bomb',    1, 70, 35);
    this.initPowerUp('camu',    1, 50, 20);
    
    // Start Game
    this.startRound();
    return 50;
};


// Rounds ----------------------------------------------------------------------
Game.prototype.startRound = function() {
    this.roundID++;
    console.log('>> Round #' + this.roundID + ' started!');
    
    this.roundStart = this.getTime();
    this.roundTimeLeft = this.roundTime;
    
    this.$.setField('roundID', this.roundID, true);
    this.$.setField('roundTime', this.roundTime, true);
    this.$.setField('roundGO', 1, true);
    this.$.setField('roundStats', {}, true);
    
    // Reset powerup timers
    for(var p in this.powerUps) {
        this.powerUps[p][0] = 0;
        this.createPowerUp(p, false);
    }
    
    // Reset player stats
    this.roundFinished = false;
    for(var c in this.$.clients) {
        this.$.clients[c].init();
        this.addPlayerStats(c);
    }
    
    var that = this;
    setTimeout(function(){that.endRound();}, this.roundTime);
};

Game.prototype.endRound = function() {
    console.log('>> Round #' + this.roundID + ' finished!');
    
    // Reset
    this.roundStart = this.getTime();
    this.roundFinished = true;
    this.roundStart = this.getTime();
    this.roundTimeLeft = this.roundWait;
    this.$.actorsDestroy();
    
    // Stats
    var sorted = [];
    for(var c in this.$.clients) {
        if (this.$.clients[c].playerName != '') {
            var stats = this.roundStats[c];
            sorted.push([this.$.clients[c].score + Math.floor(Math.random() * 10),
                         stats.kills, this.$.clients[c].playerName,
                         stats.selfDestructs, this.$.clients[c].playerColor]);
        }
    }
    sorted.sort();
    
    this.$.setField('roundTime', this.roundWait, true);
    this.$.setField('roundGO', 0, true);
    this.$.setField('roundStats', sorted, true);
    this.roundStats = {};
    
    var that = this;
    setTimeout(function(){that.startRound();}, this.roundWait);
};

Game.prototype.removePlayerStats = function(id) {
    if (this.roundStats[id]) {
        delete this.roundStats[id];
    }
};

Game.prototype.getPlayerStats = function(id) {
    return this.roundStats[id];
};

Game.prototype.addPlayerStats = function(id) {
    this.roundStats[id] = {
        'kills': 0,
        'selfDestructs': 0
    };
};


// Gameplay --------------------------------------------------------------------
Game.prototype.circleCollision = function(a, b, ra, rb) {
    var r = ra + rb;
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return r * r > dx * dx + dy * dy; 
};

Game.prototype.initPowerUp = function(type, max, wait, rand) { 
    this.powerUps[type] = [0, 0, max, wait, rand];
};

Game.prototype.createPowerUp = function(type, dec) { 
    var up = this.powerUps[type];
    var add = (up[3] * 1000) + Math.random() * (up[4] * 1000);
    up[1] = this.getTime() + add;
    if (dec) {
        up[0]--;
    }
};

Game.prototype.removePowerUp = function(type) { 
    this.powerUps[type][0]--;
};

Game.prototype.collidePowerUps = function(o, p) {
    
    // Shield
    if (o.type == 'shield') {
        p.shield = true;
        p.shieldTime = this.getTime();
    
    // Boost
    } else if (o.type == 'boost') {
        p.boost = true;
        p.boostTime = this.getTime();
    
    // Laser
    } else if (o.type == 'laser') {
        p.laser = true;
        p.laserTime = this.getTime();
    
    // Bomb
    } else if (o.type == 'bomb') {
        p.bomb = true;
    
    // Camu
    } else if (o.type == 'camu') {
        if (p.camu == 0) {
            p.camu = 1;
            p.camuFade = 100;
        }
    
    // Player Defense
    } else if (o.type == 'defense') {
        if (p.defs < 3) {
            this.createActor('player_def', {'player': p});
        }
    
    // Life
    } else if (o.type == 'life') {
        p.hp += 15;
        if (p.h > 30) {
            p.hp = 30;
        }
    }
    this.createPowerUp(o.type, true);
    o.destroy();
};


// Mainloop --------------------------------------------------------------------
Game.prototype.onUpdate = function() {

    // RoundTimer
    this.$.setField('roundTime', this.roundTimeLeft + (this.roundStart - this.getTime()), false);
    if (this.roundFinished) {
        return;
    }

    // PowerUP creation
    for(var p in this.powerUps) {
        var up = this.powerUps[p];
        if (this.getTime() > up[1] && up[0] < up[2]) {
            this.createActor('powerup', {'type': p});
            this.createPowerUp(p, false);
            up[0]++;
        }
    }
    
    // Collision Detection
    var players      = this.getActors('player');
    var players_defs = this.getActors('player_def');
    var powerups     = this.getActors('powerup');
    var bullets      = this.getActors('bullet');
    var bombs        = this.getActors('bomb');
    
    for(var i = 0, l = players.length; i < l; i++) {
        var p = players[i];
        if (p.hp > 0 && p.defense == 0) {
            
            // Player / Player Def collision
            for(var e = 0, dl = players_defs.length; e < dl; e++) {
                var pd = players_defs[e];
                if (pd.alive && this.circleCollision(p, pd, 12, 3)) {
                    pd.destroy();
                    p.hp -= 15;
                    if (p.hp <= 0) {
                        pd.player.client.addScore(10);
                        this.getPlayerStats(pd.player.client.id).kills += 1;
                        p.client.kill();
                        break;
                    }
                }
            }
            if (p.hp < 0) {
                continue;
            }
            
            // Player / Bomb
            for(var e = 0, dl = bombs.length; e < dl; e++) {
                var bo = bombs[e];
                if (bo.alive && this.circleCollision(p, bo, 10, 5)) {
                    bo.destroy();
                }
            }
            
            // Player / Player collision
            for(var e = i + 1; e < l; e++) {
                var pp = players[e];
                if (pp.hp > 0 && pp.defense == 0) {
                    if (this.circleCollision(p, pp, 10, 10)) {
                        p.hp = 0;
                        pp.hp = 0;
                        pp.client.kill(); 
                        p.client.kill();
                        
                        this.getPlayerStats(p.client.id).selfDestructs += 1;
                        this.getPlayerStats(pp.client.id).selfDestructs += 1;
                        break;
                    }
                }
            }
            
            if (p.hp > 0) {
                // PowerUPs
                for(var f = 0, lf = powerups.length; f < lf; f++) {
                    var o = powerups[f];
                    if (o.alive && this.circleCollision(p, o, 10, 10)) {
                        this.collidePowerUps(o, p);
                    }
                }
                
                // Bullets
                for(var f = 0, lf = bullets.length; f < lf; f++) {
                    var b = bullets[f];
                    if (b.alive) {
                        
                        // Hit on ship
                        if (!p.shield && this.circleCollision(p, b, 12, 2)) {
                            b.destroy();
                            p.hp -= 5;
                            if (p.hp <= 0) {
                                b.player.client.addScore(10);
                                this.getPlayerStats(b.player.client.id).kills += 1;
                                p.client.kill();
                                break;
                            }
                        
                        // Hit on Shield
                        } else if (p.shield
                                   && (b.player != p || this.getTime() - b.time > 150)
                                   && this.circleCollision(p, b, 22, 2)) {
                            
                            b.destroy();
                        }
                    }
                }
            }
        }
    }
    
    // Player Def 
    for(var i = 0, dl = players_defs.length; i < dl; i++) {
        var pd = players_defs[i];
        if (pd.alive && pd.player.hp > 0) {
            // powerup collision
            for(var f = 0, lf = powerups.length; f < lf; f++) {
                var o = powerups[f];
                if (o.alive && this.circleCollision(pd, o, 3, 10)) {
                    this.collidePowerUps(o, pd.player);
                }
            }
            
            // Player Bomb
            for(var e = 0, dl = bombs.length; e < dl; e++) {
                var bo = bombs[e];
                if (bo.alive && this.circleCollision(pd, bo, 3, 5)) {
                    bo.destroy();
                    pd.destroy();
                    break;
                }
            }
            
            // Other defs
            for(var e = i + 1, dl = players_defs.length; e < dl; e++) {
                var pdd = players_defs[e];
                if (pdd.alive && this.circleCollision(pdd, pd, 3, 3)) {
                    pdd.destroy();
                    pd.destroy();
                    break;
                }
            }
        }
    }
    
    // Limit score
    for(var i in this.$.clients) {
        var c = this.$.clients[i];
        if (c.score < 0) {
            c.score = 0;
            this.$.setFieldItem('scores', c.id, c.score, true);
        }
    }
};


// Helpers ---------------------------------------------------------------------
Game.prototype.wrapAngle = function(r) {
    if (r > Math.PI) {
        r -= Math.PI * 2;
    }
    if (r < 0 - Math.PI) {
        r += Math.PI * 2;
    }
    return r;
};

Game.prototype.randomPosition = function(obj) {
    obj.x = (Math.random() * (this.width - 50)) + 25;
    obj.y = (Math.random() * (this.height - 50)) + 25;
};

Game.prototype.wrapPosition = function(obj) {
    if (obj.x < -16) {
        obj.x = this.width + 16;
    
    } else if (obj.x > this.width + 16) {
        obj.x = -16;
    }
    
    if (obj.y < -16) {
        obj.y = this.height + 16;
    
    } else if (obj.y > this.height + 16) {
        obj.y = -16;
    }
};


// Client handlers -------------------------------------------------------------
// -----------------------------------------------------------------------------
Client.prototype.onInit = function() {
    this.playerName = '';
    this.playerColor = -1;
    console.log('++ #' + this.id + ' connected');
    this.$.pushFields(true);
};

Client.prototype.init = function() {
    if (this.playerName && !this.$g.roundFinished) {
        
        // Get free color
        if (this.playerColor == -1) {
            for(var i = 0; i < this.$g.maxPlayers; i++) {
                if(this.$g.playerColors[i] == -1) {
                    this.$g.playerColors[i] = this.id;
                    this.playerColor = i;
                    break;
                }
            }
        }
        console.log('++ #' + this.id + ' ' + this.playerName
                    + ' has joined, color ' + this.playerColor);
        
        this.$.setFieldItem('colors', this.id, this.playerColor, true)
        this.$.setFieldItem('players', this.id, this.playerName, true)
        this.reset = -1;
        
        this.score = 0;
        this.$.setFieldItem('scores', this.id, this.score, true);
        this.$g.addPlayerStats(this.id);
        
        this.moveTime = this.getTime();
        this.keys = [0, 0, 0, 0];
        this.shotTime = this.getTime() + 1000;
        this.bomb = null;
        this.bombLaunched = false;
        
        this.$.forceFields();
        this.player = this.createActor('player', {'r': 0});
    }
};

Client.prototype.kill = function() {
    this.bomb = null;
    this.addScore(-5);
    this.reset = this.getTime();
    this.player.destroy();
    if (this.player.bomb && !this.bombLaunched) {
        var bomb = this.createActor('bomb', {'r': null, 'player': this.player, 'd': 0});
        bomb.destroy();
    }
    this.bombLaunched = false;
};

Client.prototype.addScore = function(add) {
    this.score += add;
    this.$.setFieldItem('scores', this.id, this.score, true);
};

Client.prototype.onMessage = function(msg) {
    // Controls
    if (this.playerName != '' && msg.keys && msg.keys.length == 5) {
        var k = msg.keys;
        this.keys = [!!k[0], !!k[1], !!k[2], !!k[3], !!k[4]];
    
    // Set name and init player
    } else if (msg.join) {
        msg.join = msg.join.replace(/^\s+|\s+$/g, '').replace(/\s+/g, '_');
        if (msg.join && this.playerName == ''
            && msg.join.length >= 2 && msg.join.length <= 12
            && this.$g.playerCount < this.$g.maxPlayers) {
            
            this.playerName = msg.join;
            this.$g.playerCount += 1;
            this.init();
        }
    
    // Leave the game
    } else if (this.playerName != '' && msg.leave) {
        this.leave();
    }
};

Client.prototype.onUpdate = function() {
    if (this.$g.roundFinished || !this.playerName) {
        return;
    }
    
    if (this.reset != -1) {
        if (this.getTime() - this.reset > 3000) {
            this.shotTime = this.getTime();
            this.player = this.createActor('player', {'r': 0});
            this.reset = -1;
        }
        return;
    }
    
    // Turn
    var moved = false;
    if (this.keys[1]) {
        moved = true;
        this.player.mr = -0.1;
    
    } else if (this.keys[3]) {
        moved = true;
        this.player.mr = 0.1;
    
    } else {
        this.player.mr = 0;
    }
    
    // Bomb
    if (this.keys[2] && !this.bombDown) {
        if (this.player.bomb) {
            moved = true;
            if (this.bombLaunched) {
                this.bomb.destroy();
            
            } else {
                this.bomb = this.createActor('bomb', {'r': null, 'player': this.player, 'd': 14});
                this.bombLaunched = true;
            }
        }
        this.bombDown = true;
    
    } else if (!this.keys[2]) {
        this.bombDown = false;
    }
    
    // Acceleration
    if (this.keys[0]) {
        moved = true;
        this.player.mx += Math.sin(this.player.r) * 0.19;
        this.player.my += Math.cos(this.player.r) * 0.19;
    }
    this.player.thrust = this.keys[0];
    
    // Idle
    if (moved) {
        this.moveTime = this.getTime();
    }
    if (this.getTime() - this.moveTime > 30000) {
        console.log('++ #' + this.id + ' ' + this.playerName + ' kicked for idleing');
        this.player.bomb = false;
        this.close();
        return;
    }
    
    // Shoot
    if (this.keys[4] && this.getTime() - this.shotTime > (this.player.laser ? 400 : 600)) {
        this.createActor('bullet', {'player': this.player, 'r': null, 'd': 12});
        this.shotTime = this.getTime();
    }
};

Client.prototype.onRemove = function() {
    this.leave();
    console.log('-- #' + this.id + ' quit');
};

Client.prototype.leave = function() {
    if (this.playerName != '') {
        this.$g.playerColors[this.playerColor] = -1;
        this.$g.playerCount -= 1;
        console.log('-- #' + this.id + ' ' + this.playerName + ' has left');
        this.playerName = '';
        this.$.delFieldItem('players', this.id);
        this.$.delFieldItem('scores', this.id);
        this.$g.removePlayerStats(this.id);
        if (this.player) {
            this.player.destroy();
        }
    }
};


// Actors ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
var ActorPlayer = SERVER.createActorType('player');
ActorPlayer.create = function(data) {
    this.hp = 15;
    this.r = (Math.random() * Math.PI * 2) - Math.PI;
    this.mr = 0;
    
    this.$g.randomPosition(this);
    
    this.thrust = false;
    this.defense = 1400;
    this.defenseTime = this.getTime();
    this.defMode = true;
    
    // PowerUPS
    this.boost = false;
    this.boostTime = this.getTime();
    
    this.shield = false;
    this.shieldTime = 0;
    
    this.laser = false;
    this.laserTime = 0;
    
    this.bomb = false;
    
    this.defs = 0;
    
    this.camu = 0;
    this.camuFade = -1;
    this.camuTime = 0;
};

ActorPlayer.update = function() {
    this.r = this.$g.wrapAngle(this.r + this.mr);
    var maxSpeed = this.boost ? 4.5 : 3;
    var r = Math.atan2(this.mx, this.my);
    
    var speed = Math.sqrt(Math.pow(this.x - (this.x + this.mx), 2)
                        + Math.pow(this.y - (this.y + this.my), 2));
    
    if (speed > maxSpeed) {
        speed = maxSpeed;
    }
    this.mx = Math.sin(r) * speed;
    this.my = Math.cos(r) * speed;
    
    this.x += this.mx;
    this.y += this.my;
    
    // Wrap
    this.$g.wrapPosition(this);
    
    // Invincibility
    if (this.getTime() - this.defenseTime > 50 && this.defense > 0) {
        this.defense -= 50;
        this.updated = true;
        this.defenseTime = this.getTime();
    }
    
    // Shield
    if (this.shield && this.getTime() - this.shieldTime > 12500) {
        this.shield = false;
    }
    
    // Speed
    if (this.boost && this.getTime() - this.boostTime > 10000) {
        this.boost = false;
    }
    
    // Laser
    if (this.laser && this.getTime() - this.laserTime > 10000) {
        this.laser = false;
    }
    
    // Camouflage
    if (this.camu == 1) {
        // Fade out
        if (this.camuFade >= 0) {
            this.camuFade -= 5;
            this.updated = true;
        
        } else {
            this.camu = 2;
            this.camuTime = this.getTime();
            this.camuFade = -2;
            this.updated = [this.client.id];
        }
    
    // faded
    } else if (this.camu == 2) {
        if (this.getTime() - this.camuTime > 15000) {
            this.camu = 3;
            this.camuFade = 0;
            this.updated = true;
            
        } else {
            this.updated = [this.client.id];
        }
    
    // fade in
    } else if (this.camu == 3) {
        if (this.camuFade <= 100) {
            this.camuFade += 5;
        
        } else {
            this.camuFade = -1;
            this.camu = 0;
        }
        this.updated = true;
        
    } else {
        this.updated = true;
    }
};

ActorPlayer.destroy = function() {
    this.hp = 0;
    var players_defs = this.$.getActors('player_def');
    for(var i = 0, l = players_defs.length; i < l; i++) {
        var pd = players_defs[i];
        if (pd.player == this) {
            pd.destroy();
            this.defs--;
        }
    }
    //this.event('explode');
};

ActorPlayer.msg = function(full) {
    var msg = {
        'r': Math.round(this.r * 10) / 10,
        'm': this.mr,
        'd': (this.defense % 200) != 0,
        't': this.thrust ? 1 : 0,
        'b': this.boost ? 1 : 0,
        's': this.shield ? 1 : 0,
        'f': this.camuFade
    };
    if (full) {
        msg.p = this.client.id;
    }
    return msg;
};


// Bullet ----------------------------------------------------------------------
var ActorBullet = SERVER.createActorType('bullet');
ActorBullet.create = function(data) {
    this.time = this.getTime();
    this.player = data.player;
    
    var r = data.r != null ? data.r : this.$g.wrapAngle(this.player.r + this.player.mr);
    this.x = this.player.x + Math.sin(r) * 12;
    this.y = this.player.y + Math.cos(r) * 12;
    
    this.mx = this.player.mx + Math.sin(r) * 4.0;
    this.my = this.player.my + Math.cos(r) * 4.0;
    
    var speed = Math.sqrt(Math.pow(this.x - (this.x + this.mx), 2)
                        + Math.pow(this.y - (this.y + this.my), 2));
    
    if (speed < 4) {
        speed = 4;
    
    } else if (speed > 7) {
        speed = 7;
    }
    this.mx = Math.sin(r) * speed;
    this.my = Math.cos(r) * speed;
    
    this.x = this.player.x + Math.sin(this.$g.wrapAngle(r)) * data.d;
    this.y = this.player.y + Math.cos(this.$g.wrapAngle(r)) * data.d;
    this.time = this.getTime();
};
        
ActorBullet.update = function() {
    this.x += this.mx;
    this.y += this.my;
    
    // Wrap
    this.$g.wrapPosition(this);
    
    // Destroy
    if (this.getTime() - this.time > 3000) {
        this.destroy();
    
    } else {
        this.updated = true;
    }
};

ActorBullet.msg = function(full) {
    return full ? {'i': this.player.client.id}: {};
};


// Bomb ------------------------------------------------------------------------
var ActorBomb = SERVER.createActorType('bomb');
ActorBomb.create = function(data) {
    this.time = this.getTime();
    this.player = data.player;
    this.range = 140;
    
    var r = data.r != null ? data.r : this.$g.wrapAngle(this.player.r + this.player.mr);
    this.x = this.player.x + Math.sin(r) * 12;
    this.y = this.player.y + Math.cos(r) * 12;
    
    this.mx = this.player.mx + Math.sin(r) * 4.0;
    this.my = this.player.my + Math.cos(r) * 4.0;
    
    var speed = Math.sqrt(Math.pow(this.x - (this.x + this.mx), 2)
                        + Math.pow(this.y - (this.y + this.my), 2));
    
    if (speed < 6) {
        speed = 6;
    
    } else if (speed > 9) {
        speed = 9;
    }
    this.mx = Math.sin(r) * speed;
    this.my = Math.cos(r) * speed;
    
    this.x = this.player.x + Math.sin(this.$g.wrapAngle(r)) * data.d;
    this.y = this.player.y + Math.cos(this.$g.wrapAngle(r)) * data.d;
    this.time = this.getTime();       
};

ActorBomb.update = function() {
    this.x += this.mx;
    this.y += this.my;
    
    // Wrap
    this.$g.wrapPosition(this);
    
    // Destroy
    if (this.getTime() - this.time > 4000) {
        this.destroy();
    
    } else {
        this.updated = true;
    }
};

ActorBomb.destroy = function() {
    this.player.bomb = false;
    this.player.client.bomb = null;
    
    var players      = this.$.getActors('player');
    var players_defs = this.$.getActors('player_def');
    var powerups     = this.$.getActors('powerup');
    var bullets      = this.$.getActors('bullet');
    var bombs        = this.$.getActors('bomb');
    
    // Bombs
    for(var i = 0, l = bombs.length; i < l; i++) {
        var e = bombs[i];
        if (e.alive && this.$g.circleCollision(this, e, this.range, 2)) {
            e.destroy();
        }
    }
    
    // Defs
    for(var i = 0, l = players_defs.length; i < l; i++) {
        var e = players_defs[i];
        if (e.alive && this.$g.circleCollision(this, e, this.range, 3)) {
            e.destroy();
        }
    }
    
    // Players
    for(var i = 0, l = players.length; i < l; i++) {
        var e = players[i];
        if (e.alive && this.$g.circleCollision(this, e, this.range, 12)) {
            e.client.kill();
            if (this.player.client.bombLaunched) {
                if (e != this.player) {
                    this.player.client.addScore(10);
                    this.$g.getPlayerStats(this.player.client.id).kills += 1;
                
                } else {
                    this.player.client.addScore(-5);
                    this.$g.getPlayerStats(this.player.client.id).selfDestructs += 1;
                }
            }
        }
    }
    this.player.client.bombLaunched = false;
    
    // Powerups
    for(var i = 0, l = powerups.length; i < l; i++) {
        var e = powerups[i];
        if (e.alive && this.$g.circleCollision(this, e, this.range, 10)) {
            e.destroy();
            this.$g.removePowerUp(e.type);
        }
    }
    
    // Bullets
    for(var i = 0, l = bullets.length; i < l; i++) {
        var e = bullets[i];
        if (e.alive && this.$g.circleCollision(this, e, this.range, 2)) {
            e.destroy();
        }
    }
};

ActorBomb.msg = function(full) {
    return full ? {'r': this.range, 'i': this.player.client.id}: {};
};


// PowerUp ----------------------------------------------------------------------
var ActorPowerUp = SERVER.createActorType('powerup');
ActorPowerUp.create = function(data) {
    this.$g.randomPosition(this);
    this.type = data.type;
    this.time = this.getTime();
};

ActorPowerUp.update = function() {
    if (this.getTime() - this.time > 20000) {
        this.$g.removePowerUp(this.type);
        this.destroy();
    }
};

ActorPowerUp.msg = function(full) {
    return full ? {'t': this.type} : {};
};


// Player Defender ----------------------------------------------------------------------
var ActorPlayerDef = SERVER.createActorType('player_def');
ActorPlayerDef.create = function(data) {
    this.player = data.player;
    this.player.defs++;
    this.r = (Math.random() * (Math.PI * 2)) - Math.PI;
    this.shotTime = this.getTime();
};

ActorPlayerDef.update = function() {
    this.x = this.player.x + Math.sin(this.r) * 35;
    this.y = this.player.y + Math.cos(this.r) * 35;
    this.$g.wrapPosition(this);
    
    var r2 = this.$g.wrapAngle(this.r + Math.PI / 1.9);
    this.mx = this.player.mx + Math.sin(r2) * 0.27;
    this.my = this.player.my + Math.cos(r2) * 0.27;
    
    if (this.getTime() - this.shotTime > 1200) {
        this.$.createActor('bullet', {'player': this.player, 'r': this.r, 'd': 35});
        this.shotTime = this.getTime();
    }
    this.r = this.$g.wrapAngle(this.r + 0.20);
    this.updated = true;
};

ActorPlayerDef.destroy = function() {
    this.player.defs--;
};

ActorPlayerDef.msg = function(full) {
    return full ? {'p': this.player.client.id} : {};
};

// Start Server
SERVER.run();

