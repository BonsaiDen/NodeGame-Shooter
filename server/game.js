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
    'status': true
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
    this.initPowerUp('armor',   1, 30, 15);
    this.initPowerUp('missile', 2, 16, 15);
    this.initPowerUp('life',    2,  8,  8);
    this.initPowerUp('boost',   2, 20, 14);
    this.initPowerUp('defense', 1, 30, 30);
    this.initPowerUp('bomb',    1, 70, 35);
    this.initPowerUp('camu',    1, 45, 20);
    
    // Asteroids
    this.maxAsteroids = [8, 7, 7, 6, 6, 5, 4];
    
    // Start Game
    this.startRound();
};


// Rounds ----------------------------------------------------------------------
Shooter.startRound = function() {
    this.roundID++;
   // this.log('## Round #' + this.roundID + ' started!');
    
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
    //this.log('## Round #' + this.roundID + ' finished!');
    
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


// Gameplay --------------------------------------------------------------------
Shooter.initPowerUp = function(type, max, wait, rand) { 
    this.powerUps[type] = [0, 0, max, wait, rand];
};

Shooter.createPowerUp = function(type, dec, init) { 
    var up = this.powerUps[type];
    var add = (up[3] * 1000) + Math.random() * (up[4] * 1000);
    if (init) {
        add -= (up[4] / 2 * 1000) * (Math.random() / 2 + 0.5);
    }
    up[1] = this.getTime() + add;
    if (dec) {
        this.powerUpCount--;
        up[0]--;
    }
};

Shooter.removePowerUp = function(type) { 
    this.powerUps[type][0]--;
    this.powerUpCount--;
};

Shooter.collidePowerUps = function(o, p) {
    
    // Shield
    if (o.type === 'shield') {
        p.shield = true;
        p.shieldTime = this.getTime();
    
    // Boost
    } else if (o.type === 'boost') {
        p.boost = true;
        p.boostTime = this.getTime();
    
    // Missile
    } else if (o.type === 'missile') {
        p.missiles += 5;
        if (p.missiles > 10) {
            p.missiles = 10;
        }
    
    // Bomb
    } else if (o.type === 'bomb') {
        p.bomb = true;
    
    // Camu
    } else if (o.type === 'camu') {
        if (p.camu === 0) {
            p.camu = 1;
            p.camuFade = 100;
        }
    
    // Player Defense
    } else if (o.type === 'defense') {
        if (!p.defender) {
            this.createActor('player_def', {'player': p});
        
        } else {
            p.defender.level = 1;
            p.defender.initTime = this.getTime();
        }
    
    // Armor
    } else if (o.type === 'armor') {
        p.enableArmor();
    
    // Life
    } else if (o.type === 'life') {
        p.hp += 15;
        if (p.h > 30) {
            p.hp = 30;
        }
    }
    this.createPowerUp(o.type, true, false);
    o.destroy();
};


// Mainloop --------------------------------------------------------------------
Shooter.onUpdate = function() {

    // RoundTimer, make sure we keep it in sync
    var roundTimeLeft = this.roundTimeLeft + (this.roundStart - this.getTime());
    if (this.getTime() > this.roundTimeUpdate + 15000 && !this.roundFinished) {
        this.$.messageAll({'rt': roundTimeLeft});
        this.roundTimeUpdate = this.getTime();
    }
    
    this.$.setField('rt', roundTimeLeft, false);
    if (this.roundFinished) {
        return;
    }
    
    // PowerUP creation
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
      
    // Asteroids
    var asteroids = this.getActors('asteroid');
    if (asteroids.length < this.maxAsteroids[this.playerCount]
        && this.getTime() > this.nextAsteroid) {
        
        this.createActor('asteroid', {'type': Math.ceil(Math.random() * 2) + 1});
        this.nextAsteroid = this.getTime() + Math.random() * 10000;
    }
    
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
    
    // Collision Detection
    var players      = this.getActors('player');
    var playersDefs  = this.getActors('player_def');
    var powerups     = this.getActors('powerup');
    var bombs        = this.getActors('bomb');
    
    // Players
    for(var i = 0, l = players.length; i < l; i++) {
        var p = players[i];
        if (p.hp > 0 && p.defense === 0) {
            this.collidePlayer(p, i, l);
        }
    }
    
    // Asteroids
    for(var i = 0, l = asteroids.length; i < l; i++) {
        var a = asteroids[i];
        if (a.hp > 0) {
            this.collideAsteroid(a, i, l);
        }
    }
    
    for(var i = 0, l = asteroids.length; i < l; i++) {
        var a = asteroids[i];
        if (a.hp <= 0 && !a.bombed) {
            if (a.type > 1 && a.type < 4) {
                var ar = this.createActor('asteroid', {'type': a.type - 1});
                var al = this.createActor('asteroid', {'type': a.type - 1}); 
                var dd = a.broken ? 1.125 : 1;
                
                var rr, rl;
                if (!a.broken) {
                    rr = a.r - ((Math.PI / 4) + (Math.random() * (Math.PI / 2)));
                    rl = a.r + ((Math.PI / 4) + (Math.random() * (Math.PI / 2)));
                
                } else {
                    var mr = Math.atan2(a.broken.mx, a.broken.my);
                    rr = mr - ((Math.PI / 3) + (Math.random() * (Math.PI / 3)));
                    rl = mr + ((Math.PI / 3) + (Math.random() * (Math.PI / 3)));
                }
                ar.setMovement(a.x, a.y, [0, 0, 11, 17][a.type] * dd, rr, a.broken);
                al.setMovement(a.x, a.y, [0, 0, 11, 17][a.type] * dd, rl, a.broken); 
            }
        }
    }
    
    // Player Defends
    for(var i = 0, dl = playersDefs.length; i < dl; i++) {
        var pd = playersDefs[i];
        if (pd.alive() && pd.player.hp > 0) {
        
            // PowerUp collision
            for(var f = 0, lf = powerups.length; f < lf; f++) {
                var o = powerups[f];
                if (o.alive() && this.circleCollision(pd, o,
                                                      this.sizeDefend,
                                                      this.sizePowerUp)) {
                    
                    this.collidePowerUps(o, pd.player);
                }
            }
            
            // Player Bomb
            for(var e = 0, dl = bombs.length; e < dl; e++) {
                var bo = bombs[e];
                if (bo.alive() && this.circleCollision(pd, bo,
                                                       this.sizeDefend,
                                                       this.sizeBomb)) {
                    
                    bo.destroy();
                    pd.destroy();
                    break;
                }
            }
            
            // Other defs
            if (!pd.alive()) {
                continue;
            }
            for(var e = i + 1, dl = playersDefs.length; e < dl; e++) {
                var pdd = playersDefs[e];
                if (pdd.alive() && this.circleCollision(pdd, pd,
                                                        this.sizeDefend,
                                                        this.sizeDefend)) {
                    
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

Shooter.collideAsteroid = function(a, i, al) {
    var players      = this.getActors('player');
    var playersDefs  = this.getActors('player_def');
    var bullets      = this.getActors('bullet');
    var missiles     = this.getActors('missile');
    var bombs        = this.getActors('bomb');
    var asteroids    = this.getActors('asteroid');
    
    var asteroidSize = a.type >= 4 ? this.sizeBigAsteroid : this.sizeAsteroid;
    var noWrap = a.type >= 4;
    
    // Big Asteroid PowerUP collision
    if (a.type >= 4) {
        var powerups     = this.getActors('powerup');
        for(var f = 0, lf = powerups.length; f < lf; f++) {
            var o = powerups[f];
            if (o.alive()
                && this.circleCollision(a, o, this.sizeBigAsteroid,
                                              this.sizePowerUp, false, noWrap)) {
                
                this.removePowerUp(o.type);
                o.destroy();
            }
        }
    }
    
    // Asteroid / Player Defend collision
    for(var e = 0, dl = playersDefs.length; e < dl; e++) {
        var pd = playersDefs[e];
        if (pd.alive()
            && this.circleCollision(a, pd, asteroidSize, this.sizeDefend,
                                    false, noWrap)) {
            
            if (a.type > 1) {
                pd.destroy();
            }
            
            if (a.type < 4) {
                a.hp -= 15;
                if (a.hp <= 0) {
                    pd.player.client.addScore(1);
                    a.destroy();
                    return;
                }
            }
        }
    }
    
    // Asteroid / Bomb
    for(var e = 0, dl = bombs.length; e < dl; e++) {
        var bo = bombs[e];
        if (bo.alive()
            && this.circleCollision(a, bo, asteroidSize, this.sizeBomb,
                                    false, noWrap)) {
            
            bo.destroy();
            if (a.hp === 0) {
                a.bombed = true;
                return;
            }
        }
    }
    
    // Asteroid / Player collision
    for(var e = 0, l = players.length; e < l; e++) {
        var p = players[e];
        if (p.hp > 0 && p.defense === 0
            && this.circleCollision(a, p, asteroidSize, this.sizePlayer,
                                                        false, noWrap)) {
            
            if (!p.armor || a.type >= 4) {
                if (a.type === 1) {
                    p.hp -= 5;
                
                } else {
                    p.hp = 0;
                }
            }
            if (p.hp <= 0) {
                p.client.kill(true);
                this.getPlayerStats(p.client.id).selfDestructs += 1;
            }
            
            if (a.type < 4) {
                a.broken = p;
                a.hp = 0;
                a.destroy();
                return;
            }
        }
    }
    
    // Asteroid / Asteroid collision
    for(var e = i + 1; e < al; e++) {
        var aa = asteroids[e];
        if (aa.hp > 0) {
            if (this.circleCollision(a, aa, asteroidSize,
                                     aa.type >= 4 ? this.sizeBigAsteroid
                                                  : this.sizeAsteroid,
                                                  false, noWrap)) {
                
                if (a.type === aa.type) {
                    a.hp = 0;
                    a.destroy();
                    aa.hp = 0;
                    aa.destroy();
                    return;
                
                } else if (a.type <= aa.type) {
                    a.hp = 0;
                    a.destroy();
                    return;
                
                } else {
                    aa.hp = 0;
                    aa.destroy();
                }
            }
        }
    }
    
    if (a.hp > 0) {
        // Bullets
        for(var f = 0, lf = bullets.length; f < lf; f++) {
            var b = bullets[f];
            if (b.alive()
                && this.circleCollision(a, b, asteroidSize,
                                              this.sizeBullet,
                                              false,
                                              noWrap)) {
                
                b.player.client.hits++;
                b.destroy();
                if (a.type < 4) {
                    a.hp -= 5;
                    if (a.hp <= 0) {
                        b.player.client.addScore(1);
                        a.destroy();
                        return;
                    }
                }
            }
        }
        
        // Missiles
        for(var f = 0, lf = missiles.length; f < lf; f++) {
            var m = missiles[f];
            if (m.alive()
                && this.circleCollision(a, m, asteroidSize,
                                              this.sizeMissile,
                                              false,
                                              noWrap)) {
                
                m.player.client.hits++;
                m.destroy();
                if (a.type < 4) {
                    a.hp -= 8;
                    if (a.hp <= 0) {
                        m.player.client.addScore(1);
                        a.destroy();
                        return;
                    }
                }
            }
        }
    }
};

Shooter.collidePlayer = function(p, i, l) {
    var players      = this.getActors('player');
    var playersDefs  = this.getActors('player_def');
    var powerups     = this.getActors('powerup');
    var bullets      = this.getActors('bullet');
    var missiles     = this.getActors('missile');
    var bombs        = this.getActors('bomb');
    
    // Player / Player Defend collision
    for(var e = 0, dl = playersDefs.length; e < dl; e++) {
        var pd = playersDefs[e];
        if (pd.alive() && pd.player !== p
            && this.circleCollision(p, pd, this.sizePlayer, this.sizeDefend)) {
            
            pd.destroy();
            p.hp -= 15;
            if (p.hp <= 0) {
                pd.player.client.addScore(10);
                this.getPlayerStats(pd.player.client.id).kills += 1;
                p.client.kill();
                return;
            }
        }
    }
    
    // Player / Bomb
    for(var e = 0, dl = bombs.length; e < dl; e++) {
        var bo = bombs[e];
        if (bo.alive() && this.circleCollision(p, bo, this.sizePlayer,
                                                      this.sizeBomb)) {
            
            bo.destroy();
            return;
        }
    }
    
    // Player / Player collision
    for(var e = i + 1; e < l; e++) {
        var pp = players[e];
        if (pp.hp > 0 && pp.defense === 0) {
            if (this.circleCollision(p, pp, this.sizePlayer, this.sizePlayer)) {
                p.hp = 0;
                pp.hp = 0;
                pp.client.kill(); 
                p.client.kill();
                
                this.getPlayerStats(p.client.id).selfDestructs += 1;
                this.getPlayerStats(pp.client.id).selfDestructs += 1;
                return;
            }
        }
    }
    
    if (p.hp > 0) {
        // PowerUPs
        for(var f = 0, lf = powerups.length; f < lf; f++) {
            var o = powerups[f];
            if (o.alive() && this.circleCollision(p, o, this.sizePlayer,
                                                        this.sizePowerUp)) {
                
                this.collidePowerUps(o, p);
            }
        }
        
        // Bullets
        for(var f = 0, lf = bullets.length; f < lf; f++) {
            var b = bullets[f];
            if (b.alive()) {
                
                // Hit on ship
                if (!p.shield
                    && (b.player != p || this.timeDiff(b.time) > 50)
                    && this.circleCollision(p, b, this.sizePlayer,
                                                  this.sizeBullet)) {
                    
                    b.player.client.hits++;
                    b.destroy();
                    p.hp -= 5;
                    if (p.hp <= 0) {
                        b.player.client.addScore(10);
                        this.getPlayerStats(b.player.client.id).kills += 1;
                        p.client.kill();
                        return;
                    }
                
                // Hit on Shield
                } else if (p.shield
                           && (b.player != p || this.timeDiff(b.time) > 225)
                           && this.circleCollision(p, b, this.sizeShield,
                                                         this.sizeBullet,
                                                         true)) {
                    
                    b.player.client.hits++;
                    b.destroy();
                }
            }
        }
        
        // Missiles
        for(var f = 0, lf = missiles.length; f < lf; f++) {
            var m = missiles[f];
            if (m.alive()) {
                
                // Hit on ship
                if (!p.shield  
                    && (m.player != p || this.timeDiff(m.time) > 50)
                    && this.circleCollision(p, m, this.sizePlayer,
                                                  this.sizeMissile)) {
                    
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
                } else if (p.shield
                           && (m.player != p || this.timeDiff(m.time) > 225)
                           && this.circleCollision(p, m, this.sizeShield,
                                                         this.sizeMissile,
                                                         true)) {
                    
                    m.player.client.hits++;
                    m.destroy();
                }
            }
        }
    }
};



// Bomb ------------------------------------------------------------------------
Shooter.destroyBomb = function(b) {
    b.player.bomb = false;
    b.player.client.bomb = null;
    
    function Exploder(count, interval, bomb) {
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
    new Exploder(25, 20, b);
};


Shooter.explodeBomb = function(b, tick) {
    // Bombs
    var bombs = this.getActors('bomb');
    for(var i = 0, l = bombs.length; i < l; i++) {
        var e = bombs[i];
        if (e.alive() && this.circleCollision(b, e, b.range, this.sizeBomb)) {
            e.destroy();
        }
    }
    
    // Defs
    var playersDefs = this.getActors('player_def');
    for(var i = 0, l = playersDefs.length; i < l; i++) {
        var e = playersDefs[i];
        if (e.alive() && this.circleCollision(b, e, b.range, this.sizeDefend)) {
            e.destroy();
        }
    }
    
    // Players
    var players = this.getActors('player');
    for(var i = 0, l = players.length; i < l; i++) {
        var e = players[i];
        if (e.alive() && this.circleCollision(b, e, b.range, this.sizePlayer)) {
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
        if (e.alive() && this.circleCollision(b, e, b.range, this.sizePowerUp)) {
            e.destroy();
            this.removePowerUp(e.type);
        }
    }
    
    // Bullets
    var bullets = this.getActors('bullet');
    for(var i = 0, l = bullets.length; i < l; i++) {
        var e = bullets[i];
        if (e.alive() && this.circleCollision(b, e, b.range, this.sizeBullet)) {
            e.destroy();
        }
    }
    
    // Missiles
    var missiles = this.getActors('missile');
    for(var i = 0, l = missiles.length; i < l; i++) {
        var e = missiles[i];
        if (e.alive() && this.circleCollision(b, e, b.range, this.sizeMissile)) {
            e.destroy();
        }
    }
    
    // Asteroids
    var asteroids = this.getActors('asteroid');
    for(var i = 0, l = asteroids.length; i < l; i++) {
        var e = asteroids[i];
        if (e.alive() && e.type < 4
            && this.circleCollision(b, e, b.range, this.sizeAsteroid)) {
            
            b.player.client.addScore(1);
            e.bombed = true;
            e.hp = 0;
            e.destroy();
        }
    }
};


// Helpers ---------------------------------------------------------------------
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

