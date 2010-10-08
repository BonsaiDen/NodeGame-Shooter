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


var polygon = require(__dirname + '/polygon');


// Actors ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
var ActorPlayer = Server.createActorType('player', 2);
ActorPlayer.onCreate = function(data) {
    this.client = data.client;
    this.hp = 15;
    this.r = (Math.random() * Math.PI * 2) - Math.PI;
    this.mr = 0;
    
    this.polygon = new polygon.Polygon2D(this.x, this.y, this.r,
                                        [[0, -14], [-11.7, 14],
                                         [11.7, 14], [0, -14]]);
    
    this.$$.randomPosition(this, this.$$.sizePlayer);
    
    this.thrust = false;
    this.defense = 1400;
    this.defenseTime = this.getTime();
    this.defMode = true;
    
    this.oldMr = 0;
    
    // PowerUPS
    this.boost = false;
    this.boostTime = 0;
    
    this.shield = false;
    this.shieldTime = 0;
    
    this.bomb = false;
    this.defender = null;
    
    this.camu = 0;
    this.camuFade = -1;
    this.camuTime = 0;
    
    this.missiles = 0;
};

ActorPlayer.onUpdate = function() {
    this.r = this.$$.wrapAngle(this.r + this.mr);
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
    this.polygon.transform(this.x, this.y, this.r);
    
    // Wrap
    this.$$.wrapPosition(this);
    
    // Invincibility
    if (this.timeDiff(this.defenseTime) > 100 && this.defense > 0) {
        this.defense -= 100;
        this.update();
        this.defenseTime = this.getTime();
    }
    
    // Shield
    if (this.shield && this.timeDiff(this.shieldTime) > 12500) {
        this.shield = false;
    }
    
    // Speed
    if (this.boost && this.timeDiff(this.boostTime) > 10000) {
        this.boost = false;
    }
    
    // Camouflage
    if (this.camu === 1) {
        if (this.camuFade >= 0) {
            this.camuFade -= 5;
            this.update();
            
        } else {
            this.camu = 2;
            this.camuTime = this.getTime();
            this.camuFade = -2;
            this.clients([this.client.id]);
        }
    
    // faded
    } else if (this.camu === 2) {
        if (this.timeDiff(this.camuTime) > 15000) {
            this.camu = 3;
            this.camuFade = 0;
            this.clients();
        }
        
    // fade in
    } else if (this.camu === 3) {
        if (this.camuFade <= 100) {
            this.camuFade += 5;
            this.update();
        
        } else {
            this.camuFade = -1;
            this.camu = 0;
        }
    }
    
    if (this.mr !== this.oldMr) {
        this.update();
        this.oldMr = this.mr;
    }
};

ActorPlayer.onDestroy = function() {
    this.clients();
    this.defender = null;
    this.hp = 0;
    var playersDefs = this.$.getActors('player_def');
    for(var i = 0, l = playersDefs.length; i < l; i++) {
        var pd = playersDefs[i];
        if (pd.player === this) {
            pd.destroy();
        }
    }
};

ActorPlayer.onMessage = function(once) {
    var msg = [
        Math.round(this.r * 10) / 10,
        this.interleave(this.mr),
        (this.defense % 200) !== 0,
        this.thrust,
        this.boost,
        this.shield,
        this.camuFade,
        this.missiles
    ];
    
    if (once) {
        msg.push(this.client.id);
    }
    return msg;
};


// Missile ---------------------------------------------------------------------
var ActorMissile = Server.createActorType('missile', 2);
ActorMissile.onCreate = function(data) {
    this.time = this.getTime();
    this.player = data.player;
    
    var r = data.r;
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
    
    this.x = this.player.x + Math.sin(this.$$.wrapAngle(r)) * data.d;
    this.y = this.player.y + Math.cos(this.$$.wrapAngle(r)) * data.d;
    this.r = r;
    
    this.time = this.getTime();
    this.tick = this.getTime() - 500;
    
    this.speed = speed;
    this.target = null;
};
        
ActorMissile.onUpdate = function() {
    if (this.speed > 5) {
        this.speed /= 1.05;
        if (this.speed < 5) {
            this.speed = 5;
        }  
    }
    if (this.speed < 5) {
        this.speed *= 1.05;
        if (this.speed > 5) {
            this.speed = 5;
        }  
    }
    
    // Find target
    if (this.timeDiff(this.tick) > 75) {
        var players = this.$.getActors('player');
        var max = 10000;
        var target = this.target;
        this.target = null;
        
        var defTarget = null;
        for(var i = 0, l = players.length; i < l; i++) {
            var p = players[i];
            var dist = this.$$.getDistance(this, p);
            if (dist < 100 && dist < max
                && (p !== this.player
                    || (this.timeDiff(this.time) > 2150 && !target))
                
                && p.camu !== 2) {
                
                if (p.defense === 0) {
                    this.target = p;
                
                } else {
                    defTarget = p;
                }
            }
        }
        
        if (this.target === null) {
            this.target = defTarget;
        }
        this.tick = this.getTime();
    }
    
    if (this.target) {
        var dr = this.$$.getAngle(this, this.target);
        dr = this.$$.wrapAngle(this.r - dr);
        if (dr < 0) {
            this.r -= Math.max(dr / 12, -0.3);
        
        } else {
            this.r -= Math.min(dr / 12, 0.3);
        }
        this.r = this.$$.wrapAngle(this.r);
    }
    
    this.mx = Math.sin(this.r) * this.speed;
    this.my = Math.cos(this.r) * this.speed;
    this.x += this.mx;
    this.y += this.my;
    
    // Wrap
    this.$$.wrapPosition(this);
    
    // Destroy
    if (this.timeDiff(this.time) > 5000) {
        this.destroy();
    }
};

ActorMissile.onMessage = function(once) {
    return once ? [this.player.client.id, this.r]: [this.r];
};


// Bullet ----------------------------------------------------------------------
var ActorBullet = Server.createActorType('bullet', 10);
ActorBullet.onCreate = function(data) {
    this.time = this.getTime();
    this.player = data.player;
    
    var r = data.r;
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
    
    this.x = this.player.x + Math.sin(this.$$.wrapAngle(r)) * data.d;
    this.y = this.player.y + Math.cos(this.$$.wrapAngle(r)) * data.d;
    this.time = this.getTime();
};
        
ActorBullet.onUpdate = function() {
    this.x += this.mx;
    this.y += this.my;
    
    // Wrap
    this.$$.wrapPosition(this);
    
    // Destroy
    if (this.timeDiff(this.time) > 3000) {
        this.destroy();
    }
};

ActorBullet.onMessage = function(once) {
    return once ? [this.player.client.id]: [];
};


// Bomb ------------------------------------------------------------------------
var ActorBomb = Server.createActorType('bomb', 8);
ActorBomb.onCreate = function(data) {
    this.time = this.getTime();
    this.player = data.player;
    this.range = 120;
    
    var r = data.r;
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
    
    this.x = this.player.x + Math.sin(this.$$.wrapAngle(r)) * data.d;
    this.y = this.player.y + Math.cos(this.$$.wrapAngle(r)) * data.d;
    this.time = this.getTime();       
};

ActorBomb.onUpdate = function() {
    this.x += this.mx;
    this.y += this.my;
    
    // Wrap
    this.$$.wrapPosition(this);
    
    // Destroy
    if (this.timeDiff(this.time) > 4000) {
        this.destroy();
    }
};

ActorBomb.onDestroy = function() {
    this.$$.destroyBomb(this);
};

ActorBomb.onMessage = function(once) {
    return once ? [this.player.client.id, this.range] : [];
};


// PowerUp ---------------------------------------------------------------------
var ActorPowerUp = Server.createActorType('powerup', 0);
ActorPowerUp.onCreate = function(data) {
    this.$$.randomPosition(this, this.$$.sizePowerUp);
    this.type = data.type;
    this.time = this.getTime() + 15000 + Math.ceil(Math.random() * 5000);
};

ActorPowerUp.onUpdate = function() {
    if (this.getTime() > this.time) {
        this.$$.removePowerUp(this.type);
        this.destroy();
    }
};

ActorPowerUp.onMessage = function(once) {
    return once ? [this.type] : [];
};


// Player Defender -------------------------------------------------------------
var ActorPlayerDef = Server.createActorType('player_def', 8);
ActorPlayerDef.onCreate = function(data) {
    this.player = data.player;
    this.player.defender = this;
    this.level = 1;
    this.r = (Math.random() * (Math.PI * 2)) - Math.PI;
    this.mr = 0.20;
    this.shotTime = this.getTime();
    this.initTime = this.getTime();
    
    this.mxOld = this.mx;
    this.myOld = this.my;
};

ActorPlayerDef.onUpdate = function() {
    this.x = this.player.x + Math.sin(this.r) * 35;
    this.y = this.player.y + Math.cos(this.r) * 35;
    this.$$.wrapPosition(this);
    
    this.mx = this.player.mx;
    this.my = this.player.my;
    
    if (this.timeDiff(this.initTime) < 22500) {
        if (this.timeDiff(this.initTime) > 15000) {
            this.level = 2;
        }
        
        if (this.timeDiff(this.shotTime) > (this.level === 1 ? 1200 : 225)) {
            this.$.createActor('bullet', {
                'player': this.player,
                'r': this.r,
                'd': 35
            });
            this.shotTime = this.getTime();
        }
    }
    this.r = this.$$.wrapAngle(this.r + this.mr);
    if (this.mx !== this.mxOld || this.my !== this.myOld) {
        this.mxOld = this.mx;
        this.myOld = this.my;
        this.update();
    }
};

ActorPlayerDef.onDestroy = function() {
    this.player.defender = null;
};

ActorPlayerDef.onMessage = function(once) {
    return once ? [this.player.client.id, this.r, this.interleave(this.mr),
                   Math.round(this.player.x * 100) / 100,
                   Math.round(this.player.y * 100) / 100]
                   : [this.r, Math.round(this.player.x * 100) / 100,
                              Math.round(this.player.y * 100) / 100];
};


// Asteroid --------------------------------------------------------------------
var ActorAsteroid = Server.createActorType('asteroid', 6);
ActorAsteroid.onCreate = function(data) {
    this.$$.randomPosition(this, this.$$.sizeAsteroid);
    var tx = this.x;
    var ty = this.y;
    
    this.type = data.type;
    this.hp = [5, 10, 20][this.type - 1];
    
    var rx = (Math.random() * this.$$.width + 32) - 16;
    var ry = (Math.random() * this.$$.height + 32) - 16;
    var top = Math.random() * 10 < 5;
    var left = Math.random() * 10 < 5;
    if (Math.random() * 10 < 5) {
        this.x = left ? rx / 2 : rx / 2 + this.$$.width / 2;
        if (this.x < -16 || this.x > this.$$.width + 16) {
            this.y = top ? ry / 2 : ry / 2 + this.$$.height / 2;
        
        } else {
            this.y = top ? -16 : this.$$.height + 16;
        }
    
    } else {
        this.y = top ? ry / 2 : ry / 2 + this.$$.height / 2;
        if (this.y < -16 || this.y > this.$$.height + 16) {
            this.x = left ? rx / 2 : rx / 2 + this.$$.width / 2;
        
        } else {
            this.y = top ? -16 : this.$$.height + 16;
        }
    }
    
    var ps = [
        [[-1, -6], [-7, -4], [-6, 4], [2, 5], [6, -2]],
        [[-2, -13], [-13 , -8], [-12, 8], [-2, 12], [11, 10], [12, -8]],
        [[-5, -16], [-16 , -9], [-15, 12], [-4, 16], [13, 13], [16, -5], [10, -15]]
    ];
    
    for(var i = 0; i < ps.length; i++) {
        for(var e = 0; e < ps[i].length; e++) {
            ps[i][e][0] *= 1.15;
            ps[i][e][1] *= 1.15;
        }
    }
    this.polygon = new polygon.Polygon2D(this.x, this.y,
                                         this.r, ps[this.type - 1]);
    
    var speed = Math.random() * 2.0 + 0.75;
    this.r = this.$$.wrapAngle(Math.atan2(tx - this.x, ty - this.y) + Math.PI);
    this.mr = ((Math.random() * Math.PI * 2) - Math.PI) / 20;
    if (this.mr > -0.05 && this.mr < 0.05) {
        this.mr *= 4;
    }
    
    this.mx = Math.sin(this.r) * speed;
    this.my = Math.cos(this.r) * speed;
};

ActorAsteroid.setMovement = function(x, y, dist, r) {
    this.r = this.$$.wrapAngle(r);
    this.x = x + Math.sin(r) * dist;
    this.y = y + Math.cos(r) * dist;
    
    var speed = Math.random() * 2.0 + 0.75;
    this.mx = Math.sin(this.r) * speed;
    this.my = Math.cos(this.r) * speed;
};

ActorAsteroid.onUpdate = function() {
    this.r = this.$$.wrapAngle(this.r + this.mr);
    this.x += this.mx;
    this.y += this.my;
    this.polygon.transform(this.x, this.y, this.r);
    this.$$.wrapPosition(this);
};

ActorAsteroid.onMessage = function(once) {
    var msg = [
        Math.round(this.r * 10) / 10,
        this.interleave(this.mr)
    ];
    
    if (once) {
        msg.push(this.type);
    }
    return msg;
};

