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

var NodeGame = require(__dirname + '/nodegame');

// Init
Server = new NodeGame.Server({
    'port': Math.abs(process.argv[2]) || 28785,
    'status': true,
    'recordFile': __dirname + '/../record[date].js',
    'record': false
});
Server.run();

require(__dirname + '/clients');
require(__dirname + '/actors');


// Game ------------------------------------------------------------------------
// -----------------------------------------------------------------------------
var Shooter = Server.Game(20);

Shooter.onInit = function() {
    this.width = 480;
    this.height = 480;
    
    this.$.setField('s', [this.width, this.height]); // size
    this.$.setField('p', {}); // players
    this.$.setField('c', {}); // scores
    this.$.setField('o', {}); // colors
    
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
    
    this.$.setField('m', this.maxPlayers);
    
    // Sizes
    this.sizePlayer = 19;
    this.sizeShield = 22;
    this.sizePowerUp = 10;
    this.sizeBullet = 2;
    this.sizeMissile = 4;
    this.sizeDefend = 3;
    this.sizeBomb = 4;
    this.sizeAsteroid = 22;
    this.sizeBigAsteroid = 165;
    
    this.fullWidth = this.width + 32;
    this.fullHeight = this.height + 32;
    this.halfWidth = this.width / 2;
    this.halfHeight = this.height / 2;
    
    // PowerUPS
    this.powerUps = {};
    this.powerUpCount = 0;
    this.powerUpsMax = 3;
    this.initPowerUp('shield',  2, 23, 10);
    this.initPowerUp('armor',   1, 30, 20);
    this.initPowerUp('missile', 2, 16, 15);
    this.initPowerUp('life',    2,  8,  8);
    this.initPowerUp('boost',   1, 26, 15);
    this.initPowerUp('defense', 1, 30, 30);
    this.initPowerUp('bomb',    1, 70, 35);
    this.initPowerUp('camu',    1, 45, 20);
    
    this.powerUpTimes = [2, 1.35, 1.12, 1.0, 1, 0.9, 0.8];
    
    // Asteroids
    this.maxAsteroids = [8, 7, 7, 6, 6, 5, 4];
    
    // Start Game
    this.startRound();
};


// Rounds ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
Shooter.startRound = function() {
    this.roundID++;
    this.roundStart = this.getTime();
    this.roundTimeLeft = this.roundTime;
    this.roundTimeUpdate = this.getTime();
    this.nextAsteroid = this.getTime() + Math.random() * 5000;
    this.nextBigAsteroid = this.getTime() + 40000 + Math.random() * 60000;
    
    this.$.setField('ri', this.roundID); // roundID
    this.$.setField('rt', this.roundTime); //roundTime
    this.$.setField('rg', 1); // roundGO
    this.$.setField('rs', []); //roundStats
    
    // Reset powerup timers
    for(var p in this.powerUps) {
        this.powerUps[p][0] = 0;
        this.createPowerUp(p, false, true);
    }
    this.powerUpCount = 0; 
    
    // Reset player stats
    this.roundFinished = false;
    for(var c in this.$.clients) {
        this.$.clients[c].init(false);
        this.addPlayerStats(c);
    }
    
    var that = this;
    setTimeout(function(){that.endRound();}, this.roundTime);
};

Shooter.endRound = function() {
    
    // Reset
    this.roundStart = this.getTime();
    this.roundFinished = true;
    this.roundStart = this.getTime();
    this.roundTimeLeft = this.roundWait;
    this.$.destroyActors();
    
    // Stats
    var sorted = [];
    for(var c in this.$.clients) {
        if (this.$.clients[c].playerName != '') {
            var stats = this.roundStats[c];
            sorted.push([this.$.clients[c].score,
                         stats.kills, this.$.clients[c].playerName,
                         stats.selfDestructs,
                         this.$.clients[c].playerColor,
                         this.$.clients[c].shots > 0 ? 
                                    Math.round(100 / this.$.clients[c].shots
                                                   * this.$.clients[c].hits)
                                                      : -1]);
        }
    }
    
    function sortScore(a, b) {
        var d = b[0] - a[0];
        if (d === 0) {
            d = b[1] - a[1];
            if (d === 0) {
                d = a[3] - b[3];
            }
        }
        return d;
    }
    sorted.sort(sortScore);
    
    this.$.setField('rt', this.roundWait);
    this.$.setField('rg', 0);
    this.$.setField('rs', sorted);
    this.roundStats = {};
    
    var that = this;
    setTimeout(function(){that.startRound();}, this.roundWait);
};

Shooter.removePlayerStats = function(id) {
    if (this.roundStats[id]) {
        delete this.roundStats[id];
    }
};

Shooter.getPlayerStats = function(id) {
    return this.roundStats[id];
};

Shooter.addPlayerStats = function(id) {
    this.roundStats[id] = {
        'kills': 0,
        'selfDestructs': 0
    };
};


// Mainloop --------------------------------------------------------------------
// -----------------------------------------------------------------------------
Shooter.onUpdate = function() {
    
    // Round time
    var roundTimeLeft = this.roundTimeLeft + (this.roundStart - this.getTime());
    if (this.getTime() > this.roundTimeUpdate + 15000 && !this.roundFinished) {
        this.$.messageAll({'rt': roundTimeLeft});
        this.roundTimeUpdate = this.getTime();
    }
    
    this.$.setField('rt', roundTimeLeft, false);
    if (this.roundFinished) {
        return;
    }
    
    // Updates
    this.updatePowerUps();
    this.updatePlayers();
    this.updateAsteroids();
    this.updatePlayerDefs();
    
    // Limit score
    for(var i in this.$.clients) {
        var c = this.$.clients[i];
        if (c.score < 0) {
            c.score = 0;
            this.$.setFieldItem('c', c.id, c.score, true); // scores
        }
    }
};


// PowerUPs --------------------------------------------------------------------
// -----------------------------------------------------------------------------
Shooter.initPowerUp = function(type, max, wait, rand) { 
    this.powerUps[type] = [0, 0, max, wait, rand];
};

Shooter.createPowerUp = function(type, dec, init) { 
    var up = this.powerUps[type];
    var add = (up[3] * 1000) + Math.random() * (up[4] * 1000);
    if (init) {
        add -= (up[4] / 2 * 1000) * (Math.random() / 2 + 0.5);
    }
    up[1] = this.getTime() + add * this.powerUpTimes[this.playerCount];
    if (dec) {
        this.powerUpCount--;
        up[0]--;
    }
};

Shooter.removePowerUp = function(type) { 
    this.powerUps[type][0]--;
    this.powerUpCount--;
};

Shooter.updatePowerUps = function() {
    for(var p in this.powerUps) {
        var up = this.powerUps[p];
        if (this.getTime() > up[1] && up[0] < up[2]) {
            if (this.powerUpCount < this.powerUpsMax) {
                this.createActor('powerup', {'type': p});
                this.createPowerUp(p, false, false);
                
                up[0]++;
                this.powerUpCount++;
            
            } else {
                up[1] += up[4] * (Math.random() / 2 + 0.5) * 1000;
            }
        }
    }
};

Shooter.collidePowerUps = function(o, p) {
    if (o.type === 'shield') {
        p.shield = true;
        p.shieldTime = this.getTime();
    
    } else if (o.type === 'boost') {
        p.boost = true;
        p.boostTime = this.getTime();
    
    } else if (o.type === 'missile') {
        p.missiles += 5;
        if (p.missiles > 10) {
            p.missiles = 10;
        }
    
    } else if (o.type === 'bomb') {
        p.bomb = true;
    
    } else if (o.type === 'camu') {
        if (p.camu === 0) {
            p.camu = 1;
            p.camuFade = 100;
        }
    
    } else if (o.type === 'defense') {
        if (!p.defender) {
            this.createActor('player_def', {'player': p});
        
        } else {
            p.defender.level = 1;
            p.defender.initTime = this.getTime();
        }
    
    } else if (o.type === 'armor') {
        p.enableArmor();
    
    } else if (o.type === 'life') {
        p.hp += 15;
        if (p.h > 30) {
            p.hp = 30;
        }
    }
    this.createPowerUp(o.type, true, false);
    o.destroy();
};


// Asteroids -------------------------------------------------------------------
// -----------------------------------------------------------------------------
Shooter.updateAsteroids = function() {
    
    // Creation
    var asteroids = this.getActors('asteroid');
    if (asteroids.length < this.maxAsteroids[this.playerCount]
        && this.getTime() > this.nextAsteroid) {
        
        this.createActor('asteroid', {'type': Math.ceil(Math.random() * 2) + 1});
        this.nextAsteroid = this.getTime() + Math.random() * 10000;
    }
    
    // Big Asteroid
    if (this.getTime() > this.nextBigAsteroid) {
        var bigFound = false;
        for(var i = 0, l = asteroids.length; i < l; i++) {
            if (asteroids[i].type >= 4) {
                bigFound = true;
                break;
            }
        }
        
        if (!bigFound) {
            this.createActor('asteroid',
                             {'type': 4 + Math.round(Math.random(1))});
        }
        this.nextBigAsteroid = this.getTime() + 70000 + Math.random() * 70000;
    }
    
    // Collision
    for(var i = 0, l = asteroids.length; i < l; i++) {
        var a = asteroids[i];
        if (a.hp > 0) {
            this.collideAsteroidPowerUps(a)
            
            this.collideAsteroidPlayerDefs(a)
                || this.collideAsteroidBombs(a)
                || this.collideAsteroidPlayers(a)
                || this.collideAsteroidAsteroids(a, i)
                || this.collideAsteroidBullets(a)
                || this.collideAsteroidMissiles(a)
        }
    }
    
    // Splitting
    for(var i = 0, l = asteroids.length; i < l; i++) {
        var a = asteroids[i];
        if (a.hp > 0 || a.bombed) {
            continue;
        }
        
        if (a.type > 1 && a.type < 4) {
            var ar = this.createActor('asteroid', {'type': a.type - 1});
            var al = this.createActor('asteroid', {'type': a.type - 1}); 
            var dd = a.broken ? 1.125 : 1;
            
            var rr, rl;
            if (!a.broken) {
                var r = Math.atan2(a.mx, a.my);
                rr = r - ((Math.PI / 4) + (Math.random() * (Math.PI / 2)));
                rl = r + ((Math.PI / 4) + (Math.random() * (Math.PI / 2)));
            
            } else {
                var mr = Math.atan2(a.broken.mx, a.broken.my);
                rr = mr - ((Math.PI / 3) + (Math.random() * (Math.PI / 3)));
                rl = mr + ((Math.PI / 3) + (Math.random() * (Math.PI / 3)));
            }
            ar.setMovement(a.x, a.y, [0, 0, 11, 17][a.type] * dd, rr, a.broken);
            al.setMovement(a.x, a.y, [0, 0, 11, 17][a.type] * dd, rl, a.broken); 
        }
    }
};

Shooter.collideAsteroidPowerUps = function(a) {
    if (a.type < 4) {
        return;
    }
    var powerUps = this.getActors('powerup');
    for(var e = 0, l = powerUps.length; e < l; e++) {
        var o = powerUps[e];
        if (this.asteroidCollision(a, o, this.sizePowerUp)) {
            this.removePowerUp(o.type);
            o.destroy();
        }
    }
};

Shooter.collideAsteroidPlayerDefs = function(a) {
    var playerDefs = this.getActors('player_def');
    for(var e = 0, l = playerDefs.length; e < l; e++) {
        var pd = playerDefs[e];
        if (this.asteroidCollision(a, pd, this.sizeDefend)) {
            if (a.type > 1) {
                pd.destroy();
            }
            
            if (a.type < 4) {
                a.hp -= 15;
                if (a.hp <= 0) {
                    pd.player.client.addScore(1);
                    a.destroy();
                    return true;
                }
            }
        }
    }
};

Shooter.collideAsteroidBombs = function(a) {
    var bombs = this.getActors('bomb');  
    for(var e = 0, l = bombs.length; e < l; e++) {
        var bo = bombs[e];
        if (this.asteroidCollision(a, bo, this.sizeBomb)) {
            bo.destroy();
            if (a.hp === 0) {
                a.bombed = true;
                return true;
            }
        }
    }
};

Shooter.collideAsteroidPlayers = function(a) {
    var players = this.getActors('player');
    for(var e = 0, l = players.length; e < l; e++) {
        var p = players[e];
        if (p.defense === 0 && this.asteroidCollision(a, p, this.sizePlayer)) {
            if (!p.armor || a.type >= 4) {
                if (a.type === 1) {
                    p.hp -= p.armor ? 2 : 5;
                
                } else {
                    p.hp = 0;
                }
            }
            
            if (p.hp <= 0) {
                p.client.kill(true);
                this.getPlayerStats(p.client.id).selfDestructs += 1;
            }
            
            if (p.armor && a.type > 1) {
                p.stopArmor();
            }
            
            if (a.type < 4) {
                a.broken = p;
                a.hp = 0;
                a.destroy();
                return true;
            }
        }
    }
};

Shooter.collideAsteroidAsteroids = function(a, i) {
    var asteroids = this.getActors('asteroid');
    for(var e = i + 1, l = asteroids.length; e < l; e++) {
        var aa = asteroids[e];
        var size = aa.type >= 4 ? this.sizeBigAsteroid : this.sizeAsteroid;
        if (this.asteroidCollision(a, aa, size)) {
            if (a.type === aa.type) {
                a.hp = 0;
                a.destroy();
                aa.hp = 0;
                aa.destroy();
                return true;
            
            } else if (a.type <= aa.type) {
                a.hp = 0;
                a.destroy();
                return true;
            
            } else {
                aa.hp = 0;
                aa.destroy();
            }
        }
    }
};

Shooter.collideAsteroidBullets = function(a) {
    var bullets = this.getActors('bullet');
    for(var e = 0, l = bullets.length; e < l; e++) {
        var b = bullets[e];
        if (this.asteroidCollision(a, b, this.sizeBullet)) {
            b.player.client.hits++;
            b.destroy();
            if (a.type < 4) {
                a.hp -= 5;
                if (a.hp <= 0) {
                    a.destroy();
                    return true;
                }
            }
        }
    }
};

Shooter.collideAsteroidMissiles = function(a) {
    var missiles = this.getActors('missile');
    for(var e = 0, l = missiles.length; e < l; e++) {
        var m = missiles[e];
        if (this.asteroidCollision(a, m, this.sizeMissile)) {
            m.player.client.hits++;
            m.destroy();
            if (a.type < 4) {
                a.hp -= 8;
                if (a.hp <= 0) {
                    a.destroy();
                    return true;
                }
            }
        }
    }
};


// Players ---------------------------------------------------------------------
// -----------------------------------------------------------------------------
Shooter.updatePlayers = function() {
    var players = this.getActors('player');
    for(var i = 0, l = players.length; i < l; i++) {
        var p = players[i];
        if (p.hp > 0 && p.defense === 0) {
            this.collidePlayerPowerUps(p)
            this.collidePlayerPlayerDefs(p)
                || this.collidePlayerBombs(p)
                || this.collidePlayerPlayers(p, i)
                || this.collidePlayerBullets(p)
                || this.collidePlayerMissiles(p)
        }
    }
};

Shooter.collidePlayerPlayerDefs = function(p) {
    var playerDefs = this.getActors('player_def');
    for(var e = 0, l = playerDefs.length; e < l; e++) {
        var pd = playerDefs[e];
        if (pd.player !== p && this.playerCollision(p, pd, this.sizeDefend)) {
            pd.destroy();
            p.hp -= 15;
            if (p.hp <= 0) {
                pd.player.client.addScore(10);
                this.getPlayerStats(pd.player.client.id).kills += 1;
                p.client.kill();
                return true;
            }
        }
    }
};

Shooter.collidePlayerBombs = function(p) {
    var bombs = this.getActors('bomb');
    for(var e = 0, l = bombs.length; e < l; e++) {
        var bo = bombs[e];
        if (this.playerCollision(p, bo, this.sizeBomb)) {
            bo.destroy();
            return true;
        }
    }
};

Shooter.collidePlayerPlayers = function(p, i) {
    var players = this.getActors('player');
    for(var e = i + 1, l = players.length; e < l; e++) {
        var pp = players[e];
        if (pp.defense === 0 && this.playerCollision(p, pp, this.sizePlayer)) {
            if (p.armor && !pp.armor) {
                p.disableArmor();
                pp.client.kill(false, true);
            
            } else if (pp.armor && !p.armor) {
                pp.disableArmor();
                p.client.kill(false, true);
                return true;
            
            } else {
                pp.client.kill();
                p.client.kill();
                
                this.getPlayerStats(p.client.id).selfDestructs += 1;
                this.getPlayerStats(pp.client.id).selfDestructs += 1;
                return true;
            }
        }
    }
};

Shooter.collidePlayerPowerUps = function(p) {
    var powerups = this.getActors('powerup');
    for(var e = 0, l = powerups.length; e < l; e++) {
        var o = powerups[e];
        if (this.playerCollision(p, o, this.sizePowerUp)) {
            this.collidePowerUps(o, p);
        }
    }
};

Shooter.collidePlayerBullets = function(p) {
    var bullets  = this.getActors('bullet');
    for(var e = 0, l = bullets.length; e < l; e++) {
        var b = bullets[e];
        if (!b.alive()) {
            continue;
        }
        
        // Hit on ship
        if (!p.shield && (b.player != p || this.timeDiff(b.time) > 50)
            && this.playerCollision(p, b, this.sizeBullet)) {
            
            b.player.client.hits++;
            b.destroy();
            p.hp -= 5;
            if (p.hp <= 0) {
                b.player.client.addScore(10);
                this.getPlayerStats(b.player.client.id).kills += 1;
                p.client.kill();
                return true;
            }
        
        // Hit on Shield
        } else if (p.shield && (b.player != p || this.timeDiff(b.time) > 225)
                   && this.circleCollision(p, b, this.sizeShield,
                                                 this.sizeBullet, true)) {
            
            b.player.client.hits++;
            b.destroy();
        }
    }
};

Shooter.collidePlayerMissiles = function(p) {
    var missiles  = this.getActors('missile');
    for(var e = 0, l = missiles.length; e < l; e++) {
        var m = missiles[e];
        if (!m.alive()) {
            continue;
        }
        
        // Hit on ship
        if (!p.shield  && (m.player != p || this.timeDiff(m.time) > 50)
            && this.playerCollision(p, m, this.sizeMissile)) {
            
            m.player.client.hits++;
            m.destroy();
            p.hp -= p.armor ? 2 : 4;
            if (p.hp <= 0) {
                m.player.client.addScore(10);
                this.getPlayerStats(m.player.client.id).kills += 1;
                p.client.kill();
                return;
            }
        
        // Hit on Shield
        } else if (p.shield && (m.player != p || this.timeDiff(m.time) > 225)
                   && this.circleCollision(p, m, this.sizeShield,
                                                 this.sizeMissile, true)) {
            
            m.player.client.hits++;
            m.destroy();
        }
    }
};


// Player Defends --------------------------------------------------------------
// -----------------------------------------------------------------------------
Shooter.updatePlayerDefs = function() {
    var playersDefs = this.getActors('player_def');
    var powerups = this.getActors('powerup');
    var bombs = this.getActors('bomb');
    
    for(var i = 0, l = playersDefs.length; i < l; i++) {
        var pd = playersDefs[i];
        if (!pd.alive()) {
            continue;
        }
        
        // PowerUp collision
        for(var e = 0, dl = powerups.length; e < dl; e++) {
            var o = powerups[e];
            if (this.defendCollision(pd, o, this.sizePowerUp)) {
                this.collidePowerUps(o, pd.player);
            }
        }
        
        // Player Bomb
        for(var e = 0, dl = bombs.length; e < dl; e++) {
            var bo = bombs[e];
            if (this.defendCollision(pd, bo, this.sizeBomb)) {
                bo.destroy();
                pd.destroy();
                break;
            }
        }
        
        if (!pd.alive()) {
            continue;
        }
        
        // Other defs
        for(var e = i + 1, dl = playersDefs.length; e < dl; e++) {
            var pdd = playersDefs[e];
            if (this.defendCollision(pdd, pd, this.sizeDefend)) {
                pdd.destroy();
                pd.destroy();
                break;
            }
        }
    }
};


// Bombs -----------------------------------------------------------------------
// -----------------------------------------------------------------------------
Shooter.destroyBomb = function(b) {
    b.player.bomb = false;
    b.player.client.bomb = null;
    
    function Explosion(count, interval, bomb) {
        var that = this;
        var tick = 0;
        this.tick = function() {
            Shooter.explodeBomb(bomb, tick);
            tick++;
            count--;
            if (count > 0) {
                setTimeout(that.tick, interval);
            }
        };
        this.tick();
    }
    new Explosion(8, 50, b);
};

Shooter.explodeBomb = function(b, tick) {
    // Bombs
    var bombs = this.getActors('bomb');
    for(var i = 0, l = bombs.length; i < l; i++) {
        var e = bombs[i];
        if (this.bombCollision(b, e, this.sizeBomb)) {
            e.destroy();
        }
    }
    
    // Defs
    var playersDefs = this.getActors('player_def');
    for(var i = 0, l = playersDefs.length; i < l; i++) {
        var e = playersDefs[i];
        if (this.bombCollision(b, e, this.sizeDefend)) {
            e.destroy();
        }
    }
    
    // Players
    var players = this.getActors('player');
    for(var i = 0, l = players.length; i < l; i++) {
        var e = players[i];
        if (this.bombCollision(b, e, this.sizePlayer)) {
            e.client.kill();
            if (b.player && b.player.client.bombLaunched) {
                if (e != b.player) {
                    b.player.client.addScore(10);
                    b.player.client.hits++;
                    this.getPlayerStats(b.player.client.id).kills += 1;
                
                } else {
                    b.player.client.addScore(-5);
                    this.getPlayerStats(b.player.client.id).selfDestructs += 1;
                }
            }
        }
    }
    if (tick === 0) {
        b.player.client.bombLaunched = false;
    }
    
    // Powerups
    var powerups = this.getActors('powerup');
    for(var i = 0, l = powerups.length; i < l; i++) {
        var e = powerups[i];
        if (this.bombCollision(b, e, this.sizePowerUp)) {
            e.destroy();
            this.removePowerUp(e.type);
        }
    }
    
    // Bullets
    var bullets = this.getActors('bullet');
    for(var i = 0, l = bullets.length; i < l; i++) {
        var e = bullets[i];
        if (this.bombCollision(b, e, this.sizeBullet)) {
            e.destroy();
        }
    }
    
    // Missiles
    var missiles = this.getActors('missile');
    for(var i = 0, l = missiles.length; i < l; i++) {
        var e = missiles[i];
        if (this.bombCollision(b, e, this.sizeMissile)) {
            e.destroy();
        }
    }
    
    // Asteroids
    var asteroids = this.getActors('asteroid');
    for(var i = 0, l = asteroids.length; i < l; i++) {
        var e = asteroids[i];
        if (e.type < 4 && this.bombCollision(b, e, this.sizeAsteroid)) {
            e.bombed = true;
            e.hp = 0;
            e.destroy();
        }
    }
};


// Collision -------------------------------------------------------------------
// -----------------------------------------------------------------------------
Shooter.playerCollision = function(p, e, r) {
    return (p.alive() && e.alive())
                ? this.circleCollision(p, e, this.sizePlayer, r) : false;
};

Shooter.defendCollision = function(d, e, r) {
    return (d.alive() && e.alive() && d.player.alive())
                ? this.circleCollision(d, e, this.sizeDefend, r) : false;
};

Shooter.asteroidCollision = function(a, e, r) {
    var wr = a.type >= 4;
    var size = wr ? this.sizeBigAsteroid : this.sizeAsteroid;
    return (a.alive() && e.alive())
                ? this.circleCollision(a, e, size, r, false, wr) : false;    
};

Shooter.bombCollision = function(b, e, r) {
    return e.alive() ? this.circleCollision(b, e, b.range, r) : false;
};

Shooter.circleCollision = function(a, b, ra, rb, circle, noWrap) {
    
    // Normal
    if (this.checkCollision(a, b, ra, rb, circle)) {
        return true;
    }
    
    if (noWrap) {
        return false;
    }
    
    // Overlap
    var aa = {};
    aa.x = a.x
    aa.y = a.y;
    
    // Left / Right
    if (a.x - ra < -16) {
        aa.x = a.x + 32 + this.width;
    
    } else if (a.x + ra > this.width + 16) {
        aa.x = a.x - 32 - this.width;
    }
    if (a.x != aa.x && this.checkCollision(aa, b, ra, rb, circle)) {
        return true;
    }
    
    // Top // Bottom
    var ab = {};
    ab.x = a.x;
    ab.y = a.y;
    if (a.y - ra < -16) {
        ab.y = a.y + 32 + this.height;
    
    } else if (a.y + ra > this.height + 16) {
        ab.y = a.y - 32 - this.height;
    }
    if (a.y != ab.y && this.checkCollision(ab, b, ra, rb, circle)) {
        return true;
    }
    
    // Diagonal
    aa.y = ab.y;
    if (a.y != aa.y && a.x != aa.x
        && this.checkCollision(aa, b, ra, rb, circle)) {
        
        return true;
    }
    return false;
};

Shooter.checkCollision = function(a, b, ra, rb, circle) {
    var r = ra + rb;
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    if (r * r > dx * dx + dy * dy) {
        if (circle) {
            return true;
        
        } else if (a.polygon && b.polygon) {
            return a.polygon.intersects(b.polygon);
        
        } else if (a.polygon) {
            return a.polygon.intersectsCircle(b.x, b.y, rb);
            
        } else if (b.polygon) {
            return b.polygon.intersectsCircle(a.x, a.y, ra);
        
        } else {
            return true;
        }
    
    } else {
        return false;
    }
};


// Helpers ---------------------------------------------------------------------
// -----------------------------------------------------------------------------
Shooter.wrapAngle = function(r) {
    if (r > Math.PI) {
        r -= Math.PI * 2;
    }
    if (r < 0 - Math.PI) {
        r += Math.PI * 2;
    }
    return r;
};

Shooter.randomPosition = function(obj, size) {
    var players      = this.getActors('player');
    var powerups     = this.getActors('powerup');
    var asteroids    = this.getActors('asteroid');
    
    var found = false;
    var tries = 0;
    while(!found && tries < 25) {
        obj.x = (Math.random() * (this.width - 50)) + 25;
        obj.y = (Math.random() * (this.height - 50)) + 25;
        
        found = true;
        for(var i = 0, l = players.length; i < l; i++) {
            if (this.checkCollision(players[i], obj,
                                    this.sizePlayer * 2, size * 2,
                                    true)) {
                
                found = false;
                break;
            }
        }
        
        if (found) {
            for(var i = 0, l = powerups.length; i < l; i++) {
                if (this.checkCollision(powerups[i], obj,
                                        this.sizePowerUp * 2, size * 2,
                                        true)) {
                    
                    found = false;
                    break;
                }
            }
        }
        
        if (found) {
            for(var i = 0, l = asteroids.length; i < l; i++) {
                var asize = asteroids[i].type >= 4 ? this.sizeBigAsteroid
                                                   : this.sizeAsteroid * 2;
                
                if (this.checkCollision(asteroids[i], obj, asize, size * 2,
                                        true,
                                        asteroids[i].type >= 4)) {
                    
                    found = false;
                    break;
                }
            }
        }
        tries++;
    }
};

Shooter.wrapPosition = function(obj) {
    if (obj.x < -16) {
        obj.x += this.fullWidth;
        obj.updated = true;
    
    } else if (obj.x > this.width + 16) {
        obj.x -= this.fullWidth;
        obj.updated = true;
    }
    
    if (obj.y < -16) {
        obj.y += this.fullHeight
        obj.updated = true;
    
    } else if (obj.y > this.height + 16) {
        obj.y -= this.fullHeight;
        obj.updated = true;
    }
};

Shooter.getDistance = function(a, b) { 
    var tx = b.x - a.x;
    var ty = b.y - a.y;
    while(tx < -(this.halfWidth)) {
      tx += this.fullWidth;
    }
    while(ty < -(this.halfHeight)) {
      ty += this.fullHeight;
    }
    while(tx > this.halfWidth) {
      tx -= this.fullWidth;
    }
    while(ty > this.halfHeight) {
      ty -= this.fullHeight;
    }
    return Math.sqrt(tx * tx + ty * ty);
};

Shooter.getAngle = function(a, b) {
    var tx = b.x - a.x;
    var ty = b.y - a.y;
    while(tx < -(this.halfWidth)) {
      tx += this.fullWidth;
    }
    while(ty < -(this.halfHeight)) {
      ty += this.fullHeight;
    }
    while(tx > this.halfWidth) {
      tx -= this.fullWidth;
    }
    while(ty > this.halfHeight) {
      ty -= this.fullHeight;
    }
    return Math.atan2(tx, ty);
};

