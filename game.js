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

var server = require(__dirname + '/server');
var Game = server.Game;

// Init
NodeShooter = new server.Server(28785);
require(__dirname + '/clients');
require(__dirname + '/actors');

process.nextTick(function() {
    NodeShooter.run();
});


// Game ------------------------------------------------------------------------
// -----------------------------------------------------------------------------
Game.prototype.onInit = function() {
    this.width = 480;
    this.height = 480;
    
    this.$.setField('s', [this.width, this.height], true); // size
    this.$.setField('p', {}, true); // players
    this.$.setField('c', {}, true); // scores
    this.$.setField('o', {}, true); // colors
    
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
    this.initPowerUp('shield',  2, 23, 10);
    this.initPowerUp('laser',   1, 32, 15);
    this.initPowerUp('life',    2,  8,  8);
    this.initPowerUp('boost',   2, 20, 15);
    this.initPowerUp('defense', 1, 35, 30);
    this.initPowerUp('bomb',    1, 70, 35);
    this.initPowerUp('camu',    1, 47, 20);
    
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
    
    this.$.setField('ri', this.roundID, true); // roundID
    this.$.setField('rt', this.roundTime, true); //roundTime
    this.$.setField('rg', 1, true); // roundGO
    this.$.setField('rs', [], true); //roundStats
    
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
            sorted.push([this.$.clients[c].score,
                         stats.kills, this.$.clients[c].playerName,
                         stats.selfDestructs, this.$.clients[c].playerColor]);       
        }
    }
    
    function sortScore(a, b) {
        var d = b[0] - a[0];
        if (d == 0) {
            d = b[1] - a[1];
            if (d == 0) {
                d = a[3] - b[3];
            }
        }
        return d;
    }
    sorted.sort(sortScore);
    
    this.$.setField('rt', this.roundWait, true);
    this.$.setField('rg', 0, true);
    this.$.setField('rs', sorted, true);
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
    
    // Normal
    if (this.checkCollision(a, b, ra, rb)) {
        return true;
    }
    
    // Overlap
    var aa = {};
    aa.x = a.x
    aa.y = a.y;
    
    // Left / Right
    if (a.x - ra / 2 < -16) {
        aa.x = a.x + 32 + this.width;
    
    } else if (a.x + ra / 2 > this.width + 16) {
        aa.x = a.x - 32 - this.width;
    }
    if (a.x != aa.x && this.checkCollision(aa, b, ra, rb)) {
        return true;
    }
    
    // Top // Bottom
    var ab = {};
    ab.x = a.x;
    ab.y = a.y;
    if (a.y - ra / 2 < -16) {
        ab.y = a.y + 32 + this.height;
    
    } else if (a.y + ra / 2 > this.height + 16) {
        ab.y = a.y - 32 - this.height;
    }
    if (a.y != ab.y && this.checkCollision(ab, b, ra, rb)) {
        return true;
    }
    
    // Diagonal
    aa.y = ab.y;
    if (a.y != aa.y && a.x != aa.x && this.checkCollision(aa, b, ra, rb)) {
        return true;
    }
    return false;
};

Game.prototype.checkCollision = function(a, b, ra, rb) {
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
        if (p.defs < 1) {
            this.createActor('player_def', {'player': p});
        
        } else {
            p.defender.level += 1;
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
    this.$.setField('rt', this.roundTimeLeft + (this.roundStart - this.getTime()), false);
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
            if (!pd.alive) {
                continue;
            }
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
            this.$.setFieldItem('c', c.id, c.score, true); // scores
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
        obj.x = this.width + 32;
        obj.updated = true;
    
    } else if (obj.x > this.width + 32) {
        obj.x = -16;
        obj.updated = true;
    }
    
    if (obj.y < -16) {
        obj.y = this.height + 32;
        obj.updated = true;
    
    } else if (obj.y > this.height + 32) {
        obj.y = -16;
        obj.updated = true;
    }
};

