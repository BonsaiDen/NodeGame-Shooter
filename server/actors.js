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


// Actors ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
var ActorPlayer = Server.createActorType('player');
ActorPlayer.onCreate = function(data) {
    this.client = data.client;
    this.hp = 15;
    this.r = (Math.random() * Math.PI * 2) - Math.PI;
    this.mr = 0;
    
    this.$g.randomPosition(this, this.$g.sizePlayer);
    
    this.thrust = false;
    this.defense = 1400;
    this.defenseTime = this.getTime();
    this.defMode = true;
    
    // Syncing
    this.sync = 10;
    this.needSync = false;
    this.realSync = 10;
    this.mxOld = this.mx;
    this.myOld = this.my;
    this.mrOld = this.mr;
    this.thrustOld = false;
    this.shieldOld = false;
    this.boostOld = false;
    
    // PowerUPS
    this.boost = false;
    this.boostTime = this.getTime();
    
    this.shield = false;
    this.shieldTime = 0;
    
    this.laser = false;
    this.laserTime = 0;
    
    this.bomb = false;
    this.defender = null;
    
    this.camu = 0;
    this.camuFade = -1;
    this.camuTime = 0;
};

ActorPlayer.onUpdate = function() {
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
    
    // Laser
    if (this.laser && this.timeDiff(this.laserTime) > 7500) {
        this.laser = false;
    }
    
    // Camouflage
    if (this.camu == 1) {
        // Fade out
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
    } else if (this.camu == 2) {
        if (this.timeDiff(this.camuTime) > 15000) {
            this.camu = 3;
            this.camuFade = 0;
            this.clients();
            
        } else {
            this.update();
        }
        
    
    // fade in
    } else if (this.camu == 3) {
        if (this.camuFade <= 100) {
            this.camuFade += 5;
            this.update();
        
        } else {
            this.camuFade = -1;
            this.camu = 0;
        }        
    }
    this.syncData();
};

ActorPlayer.syncData = function() {
    this.sync++;
    if (this.thrust != this.thrustOld || this.mr != 0 || this.sync > 4) {
        this.needSync = true;
        this.sync = 0;
        this.thrustOld = this.thrust;
    }
    
    this.realSync++;
    if (this.boost != this.boostOld || this.mr != this.mrOld
        || this.shield != this.shieldOld
        || Math.abs(this.mx - this.mxOld) > 0.025
        || Math.abs(this.my - this.myOld) > 0.025
        || (this.needSync && this.realSync > 1)) {
        
        this.shieldOld = this.shield;
        this.boostOld = this.boost;
        this.mrOld = this.mr;
        this.mxOld = this.mx;
        this.myOld = this.my;
        
        this.realSync = 0;
        this.needSync = false;
        if (this.camu == 2) {
            this.updated = [this.client.id];
        
        } else {
            this.update();
        }
    }
}

ActorPlayer.onDestroy = function() {
    this.clients();
    this.defender = null;
    this.hp = 0;
    var players_defs = this.$.getActors('player_def');
    for(var i = 0, l = players_defs.length; i < l; i++) {
        var pd = players_defs[i];
        if (pd.player == this) {
            pd.destroy();
        }
    }
};

ActorPlayer.onMessage = function(full) {
    var msg = [
        Math.round(this.r * 10) / 10,
        this.mr,
        (this.defense % 200) != 0 ? 1 : 0,
        this.thrust ? 1 : 0,
        this.boost ? 1 : 0,
        this.shield ? 1 : 0,
        this.camuFade
    ];
    
    if (full) {
        msg.push(this.client.id);
    }
    return msg;
};


// Bullet ----------------------------------------------------------------------
var ActorBullet = Server.createActorType('bullet');
ActorBullet.onCreate = function(data) {
    this.time = this.getTime();
    this.player = data.player;
    this.sync = 10;
    
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
    
    this.x = this.player.x + Math.sin(this.$g.wrapAngle(r)) * data.d;
    this.y = this.player.y + Math.cos(this.$g.wrapAngle(r)) * data.d;
    this.time = this.getTime();
};
        
ActorBullet.onUpdate = function() {
    this.x += this.mx;
    this.y += this.my;
    
    // Wrap
    this.$g.wrapPosition(this);
    
    // Destroy
    if (this.timeDiff(this.time) > 3000) {
        this.destroy();
    
    } else {
        this.sync++;
        if (this.sync > 10) {
            this.update();
            this.sync = 0;
        }
    }
};

ActorBullet.onMessage = function(full) {
    return full ? [this.player.client.id]: [];
};


// Bomb ------------------------------------------------------------------------
var ActorBomb = Server.createActorType('bomb');
ActorBomb.onCreate = function(data) {
    this.time = this.getTime();
    this.player = data.player;
    this.range = 120;
    this.sync = 10;
    
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
    
    this.x = this.player.x + Math.sin(this.$g.wrapAngle(r)) * data.d;
    this.y = this.player.y + Math.cos(this.$g.wrapAngle(r)) * data.d;
    this.time = this.getTime();       
};

ActorBomb.onUpdate = function() {
    this.x += this.mx;
    this.y += this.my;
    
    // Wrap
    this.$g.wrapPosition(this);
    
    // Destroy
    if (this.timeDiff(this.time) > 4000) {
        this.destroy();
    
    } else {
        this.sync++;
        if (this.sync > 8) {
            this.update();
            this.sync = 0;
        }
    }
};

ActorBomb.onDestroy = function() {
    this.$g.destroyBomb(this);
};

ActorBomb.onMessage = function(full) {
    return full ? [this.player.client.id, this.range] : [];
};


// PowerUp ---------------------------------------------------------------------
var ActorPowerUp = Server.createActorType('powerup');
ActorPowerUp.onCreate = function(data) {
    this.$g.randomPosition(this, this.$g.sizePowerUp);
    this.type = data.type;
    this.time = this.getTime() + 15000 + Math.ceil(Math.random() * 5000);
};

ActorPowerUp.onUpdate = function() {
    if (this.getTime() > this.time) {
        this.$g.removePowerUp(this.type);
        this.destroy();
    }
};

ActorPowerUp.onMessage = function(full) {
    return full ? [this.type] : [];
};


// Player Defender -------------------------------------------------------------
var ActorPlayerDef = Server.createActorType('player_def');
ActorPlayerDef.onCreate = function(data) {
    this.player = data.player;
    this.player.defender = this;
    this.level = 1;
    this.r = (Math.random() * (Math.PI * 2)) - Math.PI;
    this.shotTime = this.getTime();
    this.initTime = this.getTime();
    
    this.mxOld = this.mx;
    this.myOld = this.my;
    this.sync = 10;
};

ActorPlayerDef.onUpdate = function() {
    this.x = this.player.x + Math.sin(this.r) * 35;
    this.y = this.player.y + Math.cos(this.r) * 35;
    this.$g.wrapPosition(this);
    
    this.mx = this.player.mx;
    this.my = this.player.my;
    
    if (this.timeDiff(this.initTime) < 22500) {
        if (this.timeDiff(this.initTime) > 15000) {
            this.level = 2;
        }
        
        if (this.timeDiff(this.shotTime) > (this.level == 1 ? 1200 : 225)) {
            this.$.createActor('bullet', {
                'player': this.player,
                'r': this.r,
                'd': 35
            });
            this.shotTime = this.getTime();
        }
    }
    this.r = this.$g.wrapAngle(this.r + 0.20);
    
    this.sync++;
    if (this.sync > 8 || this.mx != this.mxOld || this.my != this.myOld) {
        this.mxOld = this.mx;
        this.myOld = this.my;
        this.update();
        this.sync = 0;
    }
};

ActorPlayerDef.onDestroy = function() {
    this.player.defender = null;
};

ActorPlayerDef.onMessage = function(full) {
    return full ? [this.player.client.id, this.r,
                   Math.round(this.player.x * 100) / 100,
                   Math.round(this.player.y * 100) / 100]
                   : [this.r, Math.round(this.player.x * 100) / 100,
                      Math.round(this.player.y * 100) / 100];
};

