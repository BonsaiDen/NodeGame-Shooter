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


var polygon = require('./polygon');


// Actors ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
var ActorPlayer = Server.createActorType('player', 2);
ActorPlayer.shape = new polygon.Shape2D([[0, -12], [10, 12], [-10, 12],
                                         [0, -12]], 2.5);

ActorPlayer.shapeArmor = new polygon.Shape2D([[0, -12], [10, 12], [-10, 12],
                                              [0, -12]], 6.5);

ActorPlayer.onCreate = function(data) {
    this.client = data.client;
    this.hp = 15;
    this.r = (Math.random() * Math.PI * 2) - Math.PI;
    this.mr = 0;
    
    this.$$.randomPosition(this, this.$$.sizePlayer);
    this.polygon = new polygon.Polygon2D(this.x, this.y, this.r,
                                         ActorPlayer.shape);
    
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
    this.shieldHP = 0;
    
    this.armor = false;
    this.armorDis = false;
    this.armorTime = 0;
    this.armorHP = 0;
    
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
    if (this.shield && this.timeDiff(this.shieldTime) > 15000) {
        this.shieldHP = 0;
        this.shield = false;
    }
    
    // Armor
    if (this.armorDis && this.timeDiff(this.armorTime) > 500) {
        this.disableArmor();
    }
    
    // Speed
    if (this.boost && this.timeDiff(this.boostTime) > 12500) {
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
    
    // Faded
    } else if (this.camu === 2) {
        if (this.timeDiff(this.camuTime) > 15000) {
            this.camu = 3;
            this.camuFade = 0;
            this.clients();
        }
    
    // Fade in
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

ActorPlayer.enableArmor = function() {
    this.armorHP = 16;
    this.armor = true;
    this.armorDis = false;
    this.armorTime = this.getTime();
    this.polygon = new polygon.Polygon2D(this.x, this.y, this.r,
                                         ActorPlayer.shapeArmor);
};

ActorPlayer.disableArmor = function() {
    this.polygon = new polygon.Polygon2D(this.x, this.y, this.r,
                                         ActorPlayer.shape);
    
    this.armor = false;
    this.armorDis = false;
    this.armorHP = 0;
};

ActorPlayer.stopArmor = function() {
    this.armorTime = this.getTime();
    this.armorDis = true;
};

ActorPlayer.onDestroy = function() {
    this.clients();
    if (this.defender !== null) {
        this.defender.destroy();
    }
    this.defender = null;
    this.hp = 0;
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
        this.missiles,
        this.armor
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
    this.player.client.shots++;
    
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
            this.r -= Math.max(dr / 15, -0.3);
        
        } else {
            this.r -= Math.min(dr / 15, 0.3);
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
    return once ? [this.player.client.id, this.r] : [this.r];
};


// Bullet ----------------------------------------------------------------------
var ActorBullet = Server.createActorType('bullet', 6);
ActorBullet.onCreate = function(data) {
    this.time = this.getTime();
    this.player = data.player;
    this.player.client.shots++;
    
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
var ActorBomb = Server.createActorType('bomb', 6);
ActorBomb.onCreate = function(data) {
    this.time = this.getTime();
    this.player = data.player;
    this.player.client.shots++;
    this.range = 120;
    this.fired = false;
    
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
var ActorPlayerDef = Server.createActorType('player_def', 6);
ActorPlayerDef.onCreate = function(data) {
    this.player = data.player;
    this.player.defender = this;
    this.level = 1;
    this.r = (Math.random() * (Math.PI * 2)) - Math.PI;
    this.mr = 0.20;
    this.shotTime = this.getTime();
    this.initTime = this.getTime();
    
    this.x = this.player.x + Math.sin(this.r) * 35;
    this.y = this.player.y + Math.cos(this.r) * 35;
    this.$$.wrapPosition(this);
    
    this.mx = this.player.mx;
    this.my = this.player.my;
    this.mxOld = this.mx;
    this.myOld = this.my;
};

ActorPlayerDef.onUpdate = function() {
    this.x = this.player.x + Math.sin(this.r) * 35;
    this.y = this.player.y + Math.cos(this.r) * 35;
    this.$$.wrapPosition(this);
    
    this.mx = this.player.mx;
    this.my = this.player.my;
    
    if (this.timeDiff(this.initTime) < 14000) {
        if (this.timeDiff(this.initTime) > 7500) {
            this.level = 2;
        }
        
        if (this.timeDiff(this.shotTime) > (this.level === 1 ? 1200 : 180)) {
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
ActorAsteroid.shapes = [
    new polygon.Shape2D([[-1, -6], [-7, -4], [-6, 4], [2, 5], [6, -2]], 2.5),
    new polygon.Shape2D([[-2, -13], [-13 , -8], [-12, 8], [-2, 12], [11, 10],
                         [12, -8]], 2.5),
    
    new polygon.Shape2D([[-5, -16], [-16 , -9], [-15, 12], [-4, 16], [13, 13],
                         [16, -5], [10, -15]], 2.5),
    
    new polygon.Shape2D([[-66, -120], [-126, -56], [-92, 76], [-42, 118],
                         [6, 102], [120, 62], [148, 36], [148, -22], [58, -90]],
                         5),
    
    new polygon.Shape2D([[-96, -100], [-126, -26], [-112, 75], [-32, 92],
                         [35, 92], [110, 70], [138, 36], [128, -52],
                         [28, -120]], 5)
];

ActorAsteroid.onCreate = function(data) {    
    var tx = this.$$.width / 4 + (Math.random() * (this.$$.width / 2));
    var ty = this.$$.height / 4 + (Math.random() * (this.$$.height / 2));
    this.type = data.type;
    this.hp = [1, 5, 10, 20, 200, 200][this.type];
    this.broken = null;
    
    if (this.type >= 4) {
        tx = this.$$.width / 3 + (Math.random() * (this.$$.width / 3));
        ty = this.$$.height / 3 + (Math.random() * (this.$$.height / 3));  
    }
    this.polygon = new polygon.Polygon2D(this.x, this.y, this.r,
                                         ActorAsteroid.shapes[this.type - 1]);
    
    var found = false;
    var tries = 0;
    while(!found && tries < 15) {
        found = true;
        
        // Choose a random location outside of the play field
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
        
        // Find free spot
        var size = this.type >= 4 ? this.$$.sizeBigAsteroid
                                  : this.$$.sizeAsteroid * 2;
        
        var asteroids = this.$$.getActors('asteroid');
        for(var i = 0, l = asteroids.length; i < l; i++) {
            var asize = asteroids[i].type >= 4 ? this.$$.sizeBigAsteroid
                                               : this.$$.sizeAsteroid * 2;
            
            if (this.$$.checkCollision(asteroids[i], this, asize, size,
                                       true,
                                       asteroids[i].type >= 4)) {
                
                found = false;
                break;
            }
        }
        tries++;
    }
    
    var speed = Math.random() * 2.0 + 0.75;
    this.r = this.$$.wrapAngle(Math.atan2(tx - this.x, ty - this.y));
    this.mr = ((Math.random() * Math.PI * 2) - Math.PI) / 20; 
    if (this.mr > -0.02 && this.mr < 0.02) {
        this.mr *= 2;
        
    } else if (this.mr < -0.10 || this.mr > 0.10) {
        this.mr *= 0.5;
    }
    
    if (this.type >= 4) {
        speed = Math.random() * 1.20 + 1.40;
        this.x += this.x < this.$$.halfWidth ? -128 : 128;
        this.y += this.y < this.$$.halfHeight ? -128 : 128;
        this.r = this.$$.wrapAngle(Math.atan2(tx - this.x, ty - this.y));
        this.mr *= 0.125;
    }
    while (this.mr > -0.01 && this.mr < 0.01) {
        this.mr *= 2.5;
    }
    
    this.mr = Math.round(this.mr * 100) / 100;
    this.mx = Math.sin(this.r) * speed;
    this.my = Math.cos(this.r) * speed;
};

ActorAsteroid.setMovement = function(x, y, dist, r, player, bigSpeed) {
    this.r = this.$$.wrapAngle(r);
    this.x = x + Math.sin(r) * dist;
    this.y = y + Math.cos(r) * dist;
    
    var speed = Math.random() * 2.0 + 0.75;
    if (player) {
        speed = 0.75 + Math.sqrt(player.mx * player.mx
                                + player.my * player.my) * 0.65;
    }
    
    if (bigSpeed !== undefined) {
        speed = bigSpeed;
    }
    
    this.mx = Math.sin(this.r) * speed;
    this.my = Math.cos(this.r) * speed;
    this.polygon.transform(this.x, this.y, this.r);
};

ActorAsteroid.onUpdate = function() {
    this.r = this.$$.wrapAngle(this.r + this.mr);
    this.x += this.mx;
    this.y += this.my;
    this.polygon.transform(this.x, this.y, this.r);
    
    if (this.type < 4) {
        this.$$.wrapPosition(this);
    
    } else if (this.x < -160 || this.y < -160
               || this.x > this.$$.width + 160
               || this.y > this.$$.height + 160) {
        
        this.remove();
    }
};

ActorAsteroid.onDestroy = function() {
    if (this.type < 4 || this.$$.roundFinished) {
        return;
    }
    
    var bounds = this.polygon.bounds();
    var xs = this.$$.sizeAsteroid * 2;
    var ys = this.$$.sizeAsteroid * 2;
    
    var asteroids = [];
    for(var y = bounds[1]; y < bounds[3] + ys; y += ys) {
        for(var x = bounds[0]; x < bounds[2] + xs; x += xs) {
            if (x > -16 && x < this.$$.width + 16
                && y > -16 && y < this.$$.height + 16) {
                
                if (this.polygon.containsCircle(x, y, this.$$.sizeAsteroid)) {
                    var dx = x - this.x, dy = y - this.y;
                    var dist = Math.sqrt(dx * dx + dy * dy); 
                    var type = 2 + Math.round(Math.random(1));
                    var a = this.$$.createActor('asteroid', {'type': type});  
                    var r = this.$$.wrapAngle(Math.atan2(x - this.x, y - this.y));
                    var speed = (Math.random() * 1.0 + 1.75) * 4.5;
                    var coreDist = this.polygon.radius - dist;
                    var distPercent = 100 / this.polygon.radius * coreDist;
                    a.setMovement(x, y, 0, r, null, 0.5 + speed / (1.0 + distPercent / 20));   
                    asteroids.push(a);
                }
            }
        }
    }
    
    xs = this.$$.sizeAsteroid;
    ys = this.$$.sizeAsteroid;
    for(var y = bounds[1]; y < bounds[3] + ys; y += ys) {
        for(var x = bounds[0]; x < bounds[2] + xs; x += xs) {
            if (x > -16 && x < this.$$.width + 16
                && y > -16 && y < this.$$.height + 16) {
                
                if (!this.polygon.containsCircle(x, y, this.$$.sizeAsteroid / 2.5)) {
                    continue;
                }
                
                var dx = x - this.x, dy = y - this.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.polygon.radius / 2) {
                    continue;
                }
                
                var place = true;
                for(var i = 0, l = asteroids.length; i < l; i++) {
                    if (asteroids[i].polygon.intersectsCircle(x, y, this.$$.sizeAsteroid / 2.5)) {
                        place = false;
                        break;
                    }
                }
                
                if (place) {
                    var a = this.$$.createActor('asteroid', {'type': 1});  
                    var r = this.$$.wrapAngle(Math.atan2(x - this.x, y - this.y));
                    var speed = (Math.random() * 1.0 + 1.75) * 4.5;
                    var coreDist = this.polygon.radius - dist;
                    var distPercent = 100 / this.polygon.radius * coreDist;
                    a.setMovement(x, y, 0, r, null, 0.5 + speed / (1.0 + distPercent / 20));
                }
            }
        }
    }
};

ActorAsteroid.onMessage = function(once) {
    return once ? [this.r, this.interleave(this.mr), this.type] : [this.r];
};

