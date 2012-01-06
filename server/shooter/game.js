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
  NodeGame: Game. If not, see <http://www.gnu.org/licenses/>.

*/


// Game Methods ----------------------------------------------------------------
// -----------------------------------------------------------------------------
var Game = Shooter.Game();
Game.onInit = function() {

    // Size
    this.width = 480;
    this.height = 480;
    this.fieldSize = this.createField('s', [this.width, this.height]);

    this.fullWidth = this.width + 32;
    this.fullHeight = this.height + 32;
    this.halfWidth = this.width / 2;
    this.halfHeight = this.height / 2;

    // Rounds
    this.roundGame = 180000;
    this.roundWait = 15000;

    this.roundID = 0;
    this.roundStart = 0;
    this.roundTime = 0;
    this.roundFinished = false;
    this.roundStats = {};

    this.fieldRoundID = this.createField('ri', this.roundID);
    this.fieldRoundTime = this.createField('rt', this.roundTime);
    this.fieldRoundGO = this.createField('rg', 0);
    this.fieldRoundStats = this.createField('rs', []);

    // Players
    this.maxPlayers = 5;
    this.playerCount = 0;
    this.playerColors = [-1, -1, -1, -1, -1, -1, -1];

    this.fieldMaxPlayers = this.createField('m', this.maxPlayers);
    this.fieldPlayers = this.createField('p', {});
    this.fieldScores = this.createField('c', {});
    this.fieldColors = this.createField('o', {});

    // Sizes
    this.sizePlayer = 21;
    this.sizeShield = 22;
    this.sizePowerUp = 10;
    this.sizeBullet = 2;
    this.sizeMissile = 4;
    this.sizeDefend = 3;
    this.sizeBomb = 4;
    this.sizeAsteroid = 24;
    this.sizeBigAsteroid = 150;

    // PowerUPS
    this.powerUps = {};
    this.powerUpCount = 0;
    this.powerUpsMax = 3;
    this.addPowerUpType('shield',  2, 23, 10, true);
    this.addPowerUpType('armor',   1, 30, 20, true);
    this.addPowerUpType('missile', 2, 16, 15, true);
    this.addPowerUpType('life',    2,  8,  8, false);
    this.addPowerUpType('boost',   1, 22, 12, true);
    this.addPowerUpType('defense', 2, 30, 30, true);
    this.addPowerUpType('bomb',    1, 65, 35, true);
    this.addPowerUpType('camu',    1, 40, 20, true);
    this.powerUpTimes = [1.8, 1.25, 1.12, 1.0, 1, 0.9, 0.8];

    // Asteroids
    this.maxAsteroids = [9, 8, 7, 7, 6, 6, 5];

    // Start Game
    this.startRound();
};


// Achievments -----------------------------------------------------------------
// -----------------------------------------------------------------------------
Game.achievement = function(id, type) {
    this.$.messageAll({'aie': [typeof id === 'object' ? id.cid : id,
                               this.achievements[type][0],
                               this.achievements[type][1],
                               this.achievements[type][2]]});
};

Game.achievements = {
    'boom':     ['BOOOOOOOOOM!',
                 'Destroy at least 3 players with a single bomb!',
                 10],

    'awesome':  ['AWESOME BOMB, NOT.',
                 'Destroy yourself and ONLY yourself with a bomb.',
                 10],

    'fail':     ['EPIC FAIL!',
                 'Destroy the giant asteroid and get destroyed by its debris.',
                 9],

    'giro':     ['GIRONIMO!!!',
                 'Destroy the giant asteroid... by crashing into it!',
                 9],

    'master':   ['Master of the Universe',
                 'Have Defender, at least 5 Missiles and Armor or Shield!',
                 9],

    'guide':    ['Guide to the Galaxy',
                 'Score exactly 42 points.',
                 8],

    'close':    ['Close Call!',
                 'Be REALLY close to a bomb detonation.',
                 8],

    'ninja':    ['Ninja Skills!',
                 'Destroy 2 players while being in stealth.',
                 8],

    'revenge':  ['REVENGE FOR SUSHII!!',
                 'Destroy someone within one second after they destroyed you.',
                 7],

    'sharp':    ['Sharpshooter',
                 'Hit someone with a bomb that was JUST about to explode.',
                 7],

    'hit':      ['Watch out DUUUDE!',
                 'Destroy a player JUST before they crashing into you.',
                 6],

    'balls':    ['Balls of Steel',
                 'Destroy 2 players with a defender.',
                 6],

    'stamina':  ['STAMINA! OH YEAH!',
                 'Take 40 points of damage without being destroyed.',
                 5],

    'touch':    ['You can\'t touch this...',
                 'Get killed by a defender.',
                 5],

    'move':     ['Keep Cool...',
                 'Don\'t move for 15 seconds... and survive that!',
                 5],

    'ast':      ['Asteroids. You\'re doing it wrong.',
                 'Crash into 5 asteroids.',
                 4],

    'fire':     ['Fireworks!',
                 'Detonate a bomb... without destroying anyone.',
                 4],

    'boost':    ['You\'ve got Boost Power!',
                 'Fly full speed for 10 seconds.',
                 4],

    'bullets':  ['Bullet Proof',
                 'Survive 5 bullet hits.',
                 3],

    'kami':     ['Kamikaze!',
                 'Crash into someone that has a shield or the armor.',
                 3],

    'bad':      ['Bad Luck',
                 'Get destroyed the moment you become vulnerable.',
                 2],

    'hattrick': ['Hattrick',
                 'Destroy 3 players in a row without dying.',
                 2],

    'waste':    ['Space Waste',
                 'Get destroyed 6 times without destroying anyone else.',
                 1],

    'missile':  ['Missile Master',
                 'Collect 10 missiles.',
                 1],

    'kawaii':   ['Kawaii! ^_^"',
                 'Clean up this place by destroying 10 little asteroids.',
                 1],

    'miss':     ['MISS-iles',
                 'Shoot 5 missiles without hitting anyone.',
                 1]
};


// Rounds ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
Game.startRound = function() {
    this.roundID++;
    this.roundStart = this.getTime();
    this.roundTime = this.roundGame;
    this.roundTimeUpdate = this.getTime();
    this.nextAsteroid = this.getTime() + Math.random() * 5000;
    this.nextBigAsteroid = this.getTime() + 20000 + Math.random() * 80000;

    this.fieldRoundID.update(this.roundID);
    this.fieldRoundTime.update(this.roundGame);
    this.fieldRoundGO.update(1);
    this.fieldRoundStats.update([]);

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
    }

    var that = this;
    setTimeout(function(){that.endRound();}, this.roundGame);
};

Game.endRound = function() {

    // Reset
    this.roundStart = this.getTime();
    this.roundFinished = true;
    this.roundStart = this.getTime();
    this.roundTime = this.roundWait;
    this.destroyActors();

    // Stats
    var sorted = [];
    for(var e in this.$.clients) {
        var c = this.$.clients[e];
        if (c.playerName != '') {
            var hits = c.shots > 0 ? Math.round(100 / c.shots * c.hits) : -1;
            sorted.push([c.score, c.kills, c.playerName, c.selfDestructs,
                         c.playerColor, hits]);
        }
    }

    sorted.sort(function(a, b) {
        var d = b[0] - a[0];
        if (d === 0) {
            d = b[1] - a[1];
            if (d === 0) {
                d = a[3] - b[3];
            }
        }
        return d;
    });

    this.fieldRoundTime.update(this.roundWait);
    this.fieldRoundGO.update(0);
    this.fieldRoundStats.update(sorted);
    this.roundStats = {};

    var that = this;
    setTimeout(function(){that.startRound();}, this.roundWait);
};


// Mainloop --------------------------------------------------------------------
// -----------------------------------------------------------------------------
Game.onUpdate = function() {

    // Round time
    this.roundTimeLeft = this.roundTime + (this.roundStart - this.getTime());
    if (this.getTime() > this.roundTimeUpdate + 15000 && !this.roundFinished) {
        this.$.messageAll({'rt': this.roundTimeLeft});
        this.roundTimeUpdate = this.getTime();
    }

    this.fieldRoundTime.value = this.roundTimeLeft;
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
        this.$.clients[i].limitScore();
    }
};


// PowerUPs --------------------------------------------------------------------
// -----------------------------------------------------------------------------
Game.addPowerUpType = function(type, max, wait, rand, count) {
    this.powerUps[type] = [0, 0, max, wait, rand, count];
};

Game.createPowerUp = function(type, dec, init) {
    var up = this.powerUps[type];
    var add = (up[3] * 1000) + Math.random() * (up[4] * 1000);
    if (init) {
        add -= (up[4] / 2 * 1000) * (Math.random() / 2 + 0.5);
    }
    up[1] = this.getTime() + add * this.powerUpTimes[this.playerCount];
    if (dec) {
        if (this.powerUps[type][5]) {
            this.powerUpCount--;
        }
        up[0]--;
    }
};

Game.removePowerUp = function(type) {
    this.powerUps[type][0]--;
    if (this.powerUps[type][5]) {
        this.powerUpCount--;
    }
};

Game.updatePowerUps = function() {
    for(var type in this.powerUps) {
        var up = this.powerUps[type];
        if (this.getTime() > up[1] && up[0] < up[2]) {
            if (this.powerUpCount < this.powerUpsMax) {
                this.createActor('powerup', {'type': type});
                this.createPowerUp(type, false, false);

                up[0]++;
                if (this.powerUps[type][5]) {
                    this.powerUpCount++;
                }

            } else {
                up[1] += up[4] * (Math.random() / 2 + 0.5) * 1000;
            }
        }
    }
};

Game.collidePowerUps = function(o, p) {
    if (o.type === 'shield') {
        p.shieldHP = 50;
        p.shield = true;
        p.shieldTime = this.getTime();
        p.checkPowerUps();

    } else if (o.type === 'boost') {
        p.boost = true;
        p.boosting = true;
        p.boostTime = this.getTime();

    } else if (o.type === 'missile') {
        var oldCount = p.missiles;
        p.missiles = Math.min(10, p.missiles + 5);
        if (p.missiles === 10 && oldCount < 10) {
            this.achievement(p, 'missile');
        }
        p.checkPowerUps();

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
        p.checkPowerUps();

    } else if (o.type === 'armor') {
        p.enableArmor();
        p.checkPowerUps();

    } else if (o.type === 'life') {
        p.hp = Math.min(30, p.hp + 15);
    }
    this.createPowerUp(o.type, true, false);
    o.collect();
};


// Asteroids -------------------------------------------------------------------
// -----------------------------------------------------------------------------
Game.updateAsteroids = function() {

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

Game.collideAsteroidPowerUps = function(a) {
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

Game.collideAsteroidPlayerDefs = function(a) {
    var playerDefs = this.getActors('player_def');
    for(var e = 0, l = playerDefs.length; e < l; e++) {
        var pd = playerDefs[e];
        if (this.asteroidCollision(a, pd, this.sizeDefend)) {
            if (a.type > 1) {
                pd.destroy();
            }
            a.hp -= 15;
            if (a.hp <= 0) {
                if (a.type === 1) {
                    pd.player.client.achieveKawaii++;
                }
                a.destroyer = pd.player.cid;
                a.destroy();
                return true;
            }
        }
    }
};

Game.collideAsteroidBombs = function(a) {
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

Game.collideAsteroidPlayers = function(a) {
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
                p.client.killByAsteroid(a);
            }

            if (p.armor && a.type > 1) {
                p.stopArmor();
            }

            if (a.type < 4) {
                a.broken = p;
                a.destroy();
                return true;

            } else {
                a.hp -= p.armor ? 30 : 20;
                if (a.hp <= 0) {
                    a.destroyer = p.cid;
                    this.achievement(p, 'giro');
                    a.destroy();
                    return true;
                }
            }
        }
    }
};

Game.collideAsteroidAsteroids = function(a, i) {
    var asteroids = this.getActors('asteroid');
    for(var e = i + 1, l = asteroids.length; e < l; e++) {
        var aa = asteroids[e];
        var size = aa.type >= 4 ? this.sizeBigAsteroid : this.sizeAsteroid;
        if (this.asteroidCollision(a, aa, size)) {
            if (a.type === aa.type) {
                a.destroy();
                aa.destroy();
                return true;

            } else if (a.type <= aa.type) {
                a.destroy();
                return true;

            } else {
                aa.destroy();
            }
        }
    }
};

Game.collideAsteroidBullets = function(a) {
    var bullets = this.getActors('bullet');
    for(var e = 0, l = bullets.length; e < l; e++) {
        var b = bullets[e];
        if (this.asteroidCollision(a, b, this.sizeBullet)) {
            b.player.client.hits++;
            b.destroy();
            a.hp -= 5;
            if (a.hp <= 0) {
                if (a.type === 1) {
                    b.player.client.achieveKawaii++;
                }
                a.destroyer = b.player.cid;
                a.destroy();
                return true;
            }
        }
    }
};

Game.collideAsteroidMissiles = function(a) {
    var missiles = this.getActors('missile');
    for(var e = 0, l = missiles.length; e < l; e++) {
        var m = missiles[e];
        if (this.asteroidCollision(a, m, this.sizeMissile)) {
            m.player.client.hits++;
            m.player.client.achieveMissile++;
            m.destroy();
            a.hp -= 10;
            if (a.hp <= 0) {
                if (a.type === 1) {
                    m.player.client.achieveKawaii++;
                }
                a.destroyer = m.player.cid;
                a.destroy();
                return true;
            }
        }
    }
};


// Players ---------------------------------------------------------------------
// -----------------------------------------------------------------------------
Game.updatePlayers = function() {
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

Game.collidePlayerPlayerDefs = function(p) {
    var playerDefs = this.getActors('player_def');
    for(var e = 0, l = playerDefs.length; e < l; e++) {
        var pd = playerDefs[e];
        if (pd.player !== p && this.playerCollision(p, pd, this.sizeDefend)) {
            pd.destroy();
            p.damage(p.armor ? 10 : 15);
            if (p.armor) {
                p.disableArmor();
            }
            if (p.hp <= 0) {
                p.client.killByDefend(pd);
                return true;
            }
        }
    }
};

Game.collidePlayerBombs = function(p) {
    var bombs = this.getActors('bomb');
    for(var e = 0, l = bombs.length; e < l; e++) {
        var bo = bombs[e];
        if (this.playerCollision(p, bo, this.sizeBomb)) {
            bo.checkPlayerCollision(p);
            bo.destroy();
            return true;
        }
    }
};

Game.collidePlayerPlayers = function(p, i) {
    var players = this.getActors('player');
    for(var e = i + 1, l = players.length; e < l; e++) {
        var pp = players[e];
        if (pp.defense === 0 && this.playerCollision(p, pp, this.sizePlayer)) {
            if (p.armor && !pp.armor) {
                pp.client.killByPlayer(p);
                p.disableArmor();

            } else if (pp.armor && !p.armor) {
                p.client.killByPlayer(pp);
                pp.disableArmor();
                return true;

            } else {
                pp.client.killByPlayer(p);
                p.client.killByPlayer(pp);
                return true;
            }
        }
    }
};

Game.collidePlayerPowerUps = function(p) {
    var powerups = this.getActors('powerup');
    for(var e = 0, l = powerups.length; e < l; e++) {
        var o = powerups[e];
        if (this.playerCollision(p, o, this.sizePowerUp)) {
            this.collidePowerUps(o, p);
        }
    }
};

Game.collidePlayerBullets = function(p) {
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

            p.bulletsTaken++;
            p.damage(5);
            if (p.hp <= 0) {
                p.client.killByProjectile(b);
                return true;
            }

        // Hit on Shield
        } else if (p.shield && (b.player != p || this.timeDiff(b.time) > 225)
                   && this.circleCollision(p, b, this.sizeShield,
                                                 this.sizeBullet, true)) {

            b.player.client.hits++;
            b.destroy();

            p.shieldHP -= 5;
            if (p.shieldHP <= 0) {
                p.shield = false;
            }
        }
    }
};

Game.collidePlayerMissiles = function(p) {
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
            m.player.client.achieveMissile = 0;
            m.destroy();

            if (p.armor) {
                p.armorHP -= 4;
                if (p.armorHP <= 0) {
                    p.disableArmor();
                }
                p.damage(1);

            } else {
                p.damage(4);
            }

            if (p.hp <= 0) {
                p.client.killByProjectile(m);
                return;
            }

        // Hit on Shield
        } else if (p.shield && (m.player != p || this.timeDiff(m.time) > 225)
                   && this.circleCollision(p, m, this.sizeShield,
                                                 this.sizeMissile, true)) {

            m.player.client.hits++;
            m.player.client.achieveMissile = 0;
            m.destroy();

            p.shieldHP -= 4;
            if (p.shieldHP <= 0) {
                p.shield = false;
            }
        }
    }
};


// Player Defends --------------------------------------------------------------
// -----------------------------------------------------------------------------
Game.updatePlayerDefs = function() {
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
Game.destroyBomb = function(b) {
    if (b.player) {
        b.player.bomb = false;
        b.player.client.bomb = null;
        b.player.client.bombLaunched = false;
    }
    this.bombExplosion(8, 50, b);
};

Game.bombExplosion = function(count, interval, bomb) {
    var that = this;
    var tick = function() {
        that.explodeBomb(bomb);
        count--;
        if (count > 0) {
            setTimeout(tick, interval);

        } else {
            bomb.finishExplosion();
        }
    };
    tick();
};

Game.explodeBomb = function(b) {

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
        if (e.defense === 0 && this.bombCollision(b, e, this.sizePlayer)) {
            e.client.killByBomb(b);
        }
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
        var size = e.type < 4 ? this.sizeAsteroid : this.sizeBigAsteroid;
        if (this.bombCollision(b, e, size)) {
            if (e.type < 4) {
                e.bombed = true;
                e.destroy();

            } else {
                e.hp -= 150;
                if (e.hp <= 0) {
                    if (b.player) {
                        e.destroyer = b.player.cid;
                    }
                    e.destroy();
                }
            }
        }
    }
};


// Collision -------------------------------------------------------------------
// -----------------------------------------------------------------------------
Game.playerCollision = function(p, e, r) {
    return (p.alive() && e.alive())
                      ? this.circleCollision(p, e, this.sizePlayer, r) : false;
};

Game.defendCollision = function(d, e, r) {
    return (d.alive() && e.alive() && d.player.alive())
                      ? this.circleCollision(d, e, this.sizeDefend, r) : false;
};

Game.asteroidCollision = function(a, e, r) {
    var wr = a.type >= 4;
    var size = wr ? this.sizeBigAsteroid : this.sizeAsteroid;
    return (a.alive() && e.alive())
                      ? this.circleCollision(a, e, size, r, false, wr) : false;
};

Game.bombCollision = function(b, e, r) {
    return e.alive() ? this.circleCollision(b, e, b.range, r) : false;
};

Game.bombBorderCollision = function(b, e, r) {
    return e.alive() ? this.circleCollision(b, e, b.range + r, r) : false;
};

Game.circleCollision = function(a, b, ra, rb, circle, noWrap) {
    // Use polygon radii if available
    if (!circle) {
        if (a.polygon) {
            ra = a.polygon.radius;
        }
        if (b.polygon) {
            rb = b.polygon.radius;
        }
    }

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

Game.checkCollision = function(a, b, ra, rb, circle) {
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

Game.checkOverlap = function(objs, o, size, osize) {
    for(var i = 0, l = objs.length; i < l; i++) {
        if (this.circleCollision(objs[i], o, size * 2, osize, true)) {
            return true;
        }
    }
    return false;
};

Game.checkOverlapAsteroids = function(objs, o, osize) {
    for(var i = 0, l = objs.length; i < l; i++) {
        var big = objs[i].type >= 4;
        var size = big ? this.sizeBigAsteroid * 1.20
                         : this.sizeAsteroid * 2;

        if (this.circleCollision(objs[i], o, size, osize, true, big)) {
            return true;
        }
    }
    return false;
};


// Helpers ---------------------------------------------------------------------
// -----------------------------------------------------------------------------
Game.wrapAngle = function(r) {
    if (r > Math.PI) {
        r -= Math.PI * 2;
    }
    if (r < 0 - Math.PI) {
        r += Math.PI * 2;
    }
    return r;
};

Game.randomPosition = function(obj, size) {
    var players = this.getActors('player');
    var powerups = this.getActors('powerup');
    var asteroids = this.getActors('asteroid');

    var found = false;
    var tries = 0;
    while(!found && tries++ < 20) {
        found = true;
        obj.x = (Math.random() * (this.width - 50)) + 25;
        obj.y = (Math.random() * (this.height - 50)) + 25;

        if (this.checkOverlap(players, obj, this.sizePlayer, size * 2)) {
            found = false;

        } else if (this.checkOverlap(powerups, obj, this.sizePowerUp, size * 2)) {
            found = false;

        } else if (this.checkOverlapAsteroids(asteroids, obj, size * 2)) {
            found = false;
        }
    }
};

Game.randomPositionAsteroid = function(obj, size) {
    var asteroids = this.getActors('asteroid');
    var players = this.getActors('player');

    var found = false;
    var tries = 0;
    while(!found && tries++ < 15) {
        found = true;

        var rx = (Math.random() * this.width + 32) - 16;
        var ry = (Math.random() * this.height + 32) - 16;
        var top = Math.random() * 10 < 5;
        var left = Math.random() * 10 < 5;
        if (Math.random() * 10 < 5) {
            obj.x = left ? rx / 2 : rx / 2 + this.width / 2;
            if (obj.x < -16 || obj.x > this.width + 16) {
                obj.y = top ? ry / 2 : ry / 2 + this.height / 2;

            } else {
                obj.y = top ? -16 : this.height + 16;
            }

        } else {
            obj.y = top ? ry / 2 : ry / 2 + this.height / 2;
            if (obj.y < -16 || obj.y > this.height + 16) {
                obj.x = left ? rx / 2 : rx / 2 + this.width / 2;

            } else {
                obj.y = top ? -16 : this.height + 16;
            }
        }

        if (this.checkOverlap(players, obj, this.sizePlayer, size)) {
            found = false;

        } else if (this.checkOverlapAsteroids(asteroids, obj, size)) {
            found = false;
        }
    }
};

Game.launchAt = function(a, d, r, min, max) {
    a.mx = a.player.mx + Math.sin(r) * d;
    a.my = a.player.my + Math.cos(r) * d;

    var speed = Math.sqrt(Math.pow(a.x - (a.x + a.mx), 2)
                        + Math.pow(a.y - (a.y + a.my), 2));

    speed = Math.min(max, Math.max(min, speed));
    a.mx = Math.sin(r) * speed;
    a.my = Math.cos(r) * speed;
    return speed;
};

Game.wrapPosition = function(obj) {
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

Game.getDistance = function(a, b) {
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

Game.getAngle = function(a, b) {
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

