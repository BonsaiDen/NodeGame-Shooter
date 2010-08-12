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
var ActorPlayer = CLIENT.createActorType('player');
ActorPlayer.create = function(data) {
    this.r = data[0];
    this.mr = data[1]; 
    this.defense = data[2];
    this.thrust = data[3];
    this.boost = data[4];
    this.shield = data[5];
    this.fade = data[6];
    
    this.id = data[7];
};

ActorPlayer.update = function(data) {
    this.r = data[0];
    this.mr = data[1]; 
    this.nr = this.r + this.mr;
    this.defense = data[2];
    this.thrust = data[3];
    this.boost = data[4];
    this.fade = data[6];
    
    // Shield
    var col = this.$g.colorCodes[this.$g.playerColors[this.id]];
    if (this.shield && !data[5]) {
        this.$g.effectRing(this.x, this.y, 20, 30, 0.5, 3.0, col, 1);
    
    } else if (!this.shield && data.s) {
        this.$g.effectRing(this.x, this.y, 30, 30, 0.20, -3.0, col, 1);
    }
    this.shield = data[5];
};

ActorPlayer.interleave = function() {
    var nr = this.r + this.mr / (this.$.intervalSteps * 1.1);
    if ((this.mr < 0 && nr > this.nr) || (this.mr > 0 && nr < this.nr)) {
        this.r = this.$g.wrapAngle(nr);
    }
};

ActorPlayer.destroy = function() {
    var col = this.$g.colorCodes[this.$g.playerColors[this.id]];
    this.$g.effectExplosion(this.x, this.y, 20, 1.5, 1.5, col);
    this.$g.effectArea(this.x, this.y, 20, 0.5, col);
    
    if (this.shield) {
        this.$g.effectRing(this.x, this.y, 20, 42, 0.6, 4.0, col, 1);
    }
};

ActorPlayer.render = function() {
    // Color
    var col = this.$g.playerColor(this.id);
    var colFaded = this.$g.playerColorFaded(this.id);
    var alpha = 1.0;
    if (this.fade != -1) {
        alpha = this.id == this.$.id ? 0.20 + (this.fade / 100 * 0.8) : this.fade / 100;
        this.$g.alpha(alpha);
    }
    
    
    // Draw Ship base
    if (this.fade > 0 || this.fade == -1 || this.id == this.$.id) {
        this.$g.line(3);
        this.$g.stroke(this.defense ? colFaded : col);
        
        this.$g.bg.save();
        this.$g.bg.translate(this.x, this.y);
        this.$g.bg.rotate(Math.PI - this.r);
        
        this.$g.bg.beginPath();
        this.$g.bg.moveTo(0, -12);
        this.$g.bg.lineTo(10 , 12);
        this.$g.bg.lineTo(-10, 12);
        this.$g.bg.lineTo(0, -12);
        this.$g.bg.closePath();
        this.$g.bg.stroke();
        
        if (this.shield) {
            this.$g.strokeCircle(0, 0, 20, 3, colFaded);
        }
        this.$g.bg.restore();
        
        // Effects
        if (this.thrust) {
            var r = this.$g.wrapAngle(this.r - Math.PI);
            var ox = this.x + Math.sin(r) * 12;
            var oy = this.y + Math.cos(r) * 12;
            this.$g.effectParticle(ox, oy,
                                   this.$g.wrapAngle(r - 0.8 + Math.random()
                                                     * 1.60),
                                   
                                   2, 0.2 + (this.boost ? 0.1 : 0), col, alpha);
            
            if (this.boost) {
                this.$g.effectParticle(ox, oy,
                                       this.$g.wrapAngle(r - 0.8 + Math.random()
                                                         * 1.60),
                                       
                                       2, 0.2 + (this.boost ? 0.1 : 0), col,
                                       alpha);
            }
        }
        
        // Rotate
        if (this.mr != 0) {
            var d = (this.mr * 10);
            var r = this.$g.wrapAngle(this.r - Math.PI);
            var ox = this.x + Math.sin(this.$g.wrapAngle(r - Math.PI * 2.22 * d)
                                       ) * 14;
            
            var oy = this.y + Math.cos(this.$g.wrapAngle(r - Math.PI * 2.22 * d)
                                       ) * 14;
            
            r = this.$g.wrapAngle(r - Math.PI * 2.47 * d - 0.4 + Math.random()
                                  * 0.80);
            
            this.$g.effectParticle(ox, oy, r, 2, 0.13, col, alpha);
        }
        
        // Shield ring
        if (this.shield) {
            this.$g.strokeCircle(this.x, this.y, 20, 2.5, col);
            this.$g.effectRing(this.x, this.y, 20, 22 * (Math.random() + 0.5),
                               this.$g.extreeeeeeme ? 0.02 : 0.04,
                               this.$g.extreeeeeeme ? 0.125 : 0.25,
                               col, alpha);
        }
    
    } else {
        this.shield = false;
    }
    
    // Name
    if (this.fade == -1 || this.id == this.$.id) {
        this.$g.fill(colFaded);
        this.$g.text(this.x, this.y - 27, this.$g.playerNames[this.id] + '('
                     + this.$g.playerScores[this.id] + ')', 'center', 'middle'); 
    }
    this.$g.alpha(1.0);
};


// Bullet ----------------------------------------------------------------------
var ActorBullet = CLIENT.createActorType('bullet');
ActorBullet.create = function(data) {
    this.id = data[0];
};

ActorBullet.destroy = function() {
    var col = this.$g.playerColor(this.id);
    this.$g.effectExplosion(this.x, this.y, 4, 0.35, 1, col);
    this.$g.effectArea(this.x, this.y, 3.5, 0.35, col);  
};

ActorBullet.render = function() {
    this.$g.strokeCircle(this.x, this.y, 1.25, 3, this.$g.playerColor(this.id));
};


// Bomb ------------------------------------------------------------------------
var ActorBomb = CLIENT.createActorType('bomb');
ActorBomb.create = function(data) {
    this.id = data[0];
    this.radius = data[1];
};

ActorBomb.destroy = function() {
    var col = this.$g.playerColor(this.id);
    this.$g.effectArea(this.x, this.y, this.radius, 1.0, col);
    this.$g.effectRing(this.x, this.y, this.radius / 2 * 0.975, 75, 1, 1.25,
                       col, 1);
    
    this.$g.effectArea(this.x, this.y, this.radius / 2, 1.5, col);
    this.$g.effectRing(this.x, this.y, this.radius * 0.975, 125, 1, 1.25,
                       col, 1);
    
};

ActorBomb.render = function() {
    var col = this.$g.playerColor(this.id);
    this.$g.fillCircle(this.x, this.y, 3, col);
    this.$g.strokeCircle(this.x, this.y, 6, 1.5, col);
    
    var r = Math.atan2(this.mx, this.my);
    var ox = this.x - Math.sin(r) * 2;
    var oy = this.y - Math.cos(r) * 2;
    this.$g.effectParticle(ox, oy,
                           this.$g.wrapAngle(r - 0.8 + Math.random() * 1.60),
                           1, 0.5, col, 1);
    
    this.$g.effectParticle(ox, oy,
                           this.$g.wrapAngle(r - 1.6 + Math.random() * 3.20),
                           0.5, 0.8, col, 1);          
};

// PowerUP ---------------------------------------------------------------------
var ActorPowerUp = CLIENT.createActorType('powerup');
ActorPowerUp.create = function(data) {
    this.type = data[0];
    this.createTime = this.$g.getTime();
    
    var col = this.$g.powerUpColors[this.type];
    this.$g.effectExplosion(this.x, this.y, 8, 1, 0.5, col);
};

ActorPowerUp.destroy = function() {
    var col = this.$g.powerUpColors[this.type];
    this.$g.effectExplosion(this.x, this.y, 8, 1, 0.5, col);
    this.$g.effectArea(this.x, this.y, 8, 0.3, col);
};

ActorPowerUp.render = function() {
    this.$g.bg.save();
    this.$g.bg.translate(this.x, this.y);
    var scale = this.$g.timeScale(this.createTime, 1000);
    if (scale != 1) {
        this.$g.bg.scale(scale, scale);
    }
    
    var col = this.$g.powerUpColors[this.type];
    if (this.type != 'camu') {
        this.$g.fillCircle(0, 0, 5.25, col);
    
    } else {
        this.$g.strokeCircle(0, 0, 4.8, 1.5, col);
    }
    this.$g.strokeCircle(0, 0, 8, 1, col);
    this.$g.bg.restore();
};


// Player Defender -------------------------------------------------------------
var ActorPlayerDef = CLIENT.createActorType('player_def');
ActorPlayerDef.create = function(data) {
    this.id = data[0];
    this.r = data[1];
    this.x = data[2];
    this.y = data[3];
    
    this.wrap();
    this.$g.effectExplosion(this.dx, this.dy, 4, 0.25, 1,
                            this.$g.playerColor(this.id));
};

ActorPlayerDef.destroy = function() {
    this.$g.effectExplosion(this.dx, this.dy, 6, 0.5, 1,
                            this.$g.playerColor(this.id));
};

ActorPlayerDef.render = function() {
    this.$g.fillCircle(this.dx, this.dy, 5, this.$g.playerColor(this.id));
};

ActorPlayerDef.update = function(data) {
    this.r = data[0];
    this.x = data[1];
    this.y = data[2];
};

ActorPlayerDef.interleave = function() {
    this.r = this.$g.wrapAngle(this.r + 0.20 / this.$.intervalSteps);
    this.wrap();
};

ActorPlayerDef.wrap = function() {
    this.dx = this.x + Math.sin(this.r) * 35;
    this.dy = this.y + Math.cos(this.r) * 35;
    if (this.dx < -16) {
        this.dx += this.$g.width + 32;
    
    } else if (this.dx > this.$g.width + 16) {
        this.dx -= this.$g.width + 32;
    }
    
    if (this.y < -16) {
        this.y += this.$g.height + 32;
    
    } else if (this.y > this.$g.height + 16) {
        this.y -= this.$g.height + 32;
    }
};

