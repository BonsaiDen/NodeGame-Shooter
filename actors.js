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
var ActorPlayer = Shooter.Actor('player', 2);
ActorPlayer.shape = [[0, -12], [10, 12], [-10, 12], [0, -12]];
ActorPlayer.shapeArmor = [[0, -20.5], [15, 15.5], [-15, 15.5], [0, -20.5]];

ActorPlayer.onCreate = function(data, complete) {
    this.or = this.r = data[0];
    this.mr = data[1]; 
    this.defense = data[2];
    this.thrust = data[3];
    this.boost = data[4];
    this.shield = data[5];
    this.fade = data[6];
    this.missiles = data[7];
    this.armor = data[8];
    this.id = data[9];
    
    this.mor = data[7];
    this.mmr = 0;
    this.alpha = 1.0;
    
    this.col = this.$.playerColor(this.id);
    this.colFaded = this.$.playerColorFaded(this.id);
    
    // Outside reference
    if (this.id === this.$.id) {
        this.$.player = this;
    }
};

ActorPlayer.onUpdate = function(data) {
    this.or = this.r = data[0];
    this.mr = data[1]; 
    this.defense = data[2];
    this.thrust = data[3];
    this.boost = data[4];
    if (this.fade === -1 && data[6] !== -1) {
        this.$.playSound('fadeOut');
    }
    if (this.fade === -2 && data[6] !== -2) {
        this.$.playSound('fadeIn');
    }
    this.fade = data[6];
    
    // Shield
    if (this.fade !== -1) {
        this.alpha = this.id === this.$.id ? 0.20 + (this.fade / 100 * 0.8)
                                           : this.fade / 100;
    
    } else {
        this.alpha = 1.0;
    }
    
    if (this.shield && !data[5]) {
        this.$.playSound('powerOff');
        this.$.fxRing({o: this, r: 20, n: 30, d: 0.5, s: 2.75,
                       c: this.col, a: this.alpha});
    
    } else if (!this.shield && data[5]) {
        this.$.playSound('powerOn');
        this.$.fxRing({o: this, r: 35, n: 30, d: 0.2, s: -2.75,
                       c: this.col, a: this.alpha});
    }
    this.shield = data[5];
    
    // Missiles
    if (data[7] > this.missiles) {
        this.$.playSound('powerOn');
        this.mmr = 0;
        this.mor = data[7];
        for(var i = 0; i < data[7]; i++) {
            if (i < this.missiles) {
                continue;
            }
            
            var r = this.$.wrapAngle((Math.PI * 2 / this.mor * i) - Math.PI + this.mmr);
            var size = 26 + Math.cos(this.mmr * 2);
            var ox = this.x + Math.sin(r) * size;
            var oy = this.y + Math.cos(r) * size;
            this.$.fxArea({x: ox, y: oy, s: 3.5, d: 0.25, c: this.col});
            this.$.fxExp({x: ox, y: oy, n: 6, d: 0.25,
                                s: 1, c: this.col});
        }
    }
    this.missiles = data[7];
    
    // Armor
    if (this.armor && !data[8]) {
        this.$.playSound('powerOff');
        this.emitParticles(1.0, 0.5, 4);
        this.emitParticles(1.7, 0.4, 6);
    
    } else if (!this.armor && data[8]) {
        this.$.playSound('powerOn');
        this.emitParticles(1.25, 0.4, 4);
        this.emitParticles(2.0, 0.3, 6);
    }
    this.armor = data[8];
};

ActorPlayer.onInterleave = function(delta) {
    this.r = this.$.wrapAngle(this.or + this.mr * delta);
    this.$.wrapPosition(this);
};

ActorPlayer.onDestroy = function(complete) {
    if (complete) {
        this.$.fxExp({o: this, n: 20, d: 0.9, s: 1.4, c: this.col});
        this.$.fxArea({o: this, s: 20, d: 0.5, c: this.col});
        
        if (this.shield) {
            this.$.fxRing({o: this, r: 20, n: 42, d: 0.6, s: 3.25,
                           c: this.col, a: this.alpha});
        }
        
        if (this.armor) {
            this.emitParticles(1.5, 0.45, 3.5);
            this.emitParticles(2.2, 0.35, 5.5);
        }
        
        for(var i = 0; i < this.missiles; i++) {
            var r = this.$.wrapAngle((Math.PI * 2 / this.mor * i) - Math.PI + this.mmr);
            var size = 26 + Math.cos(this.mmr * 2);
            var ox = this.x + Math.sin(r) * size;
            var oy = this.y + Math.cos(r) * size;
            
            this.$.fxExp({x: ox, y: oy, n: 6, d: 0.45, s: 1, c: this.col});
            this.$.fxArea({x: ox, y: oy, s: 8.5, d: 0.45, c: this.col});
        }
        this.$.playSound('explosionShip');
    }
};

ActorPlayer.onDraw = function() {
    var playerCol = this.defense ? this.colFaded : this.col;
    
    // Ship
    if (this.fade > 0 || this.fade === -1 || this.id === this.$.id) {
        this.$.alpha(this.alpha);
        this.$.local(this.x, this.y, Math.PI - this.r);
        this.$.strokePolygon(playerCol, 3, ActorPlayer.shape);
        if (this.armor) {
            this.$.strokePolygon(playerCol, 0.5, ActorPlayer.shapeArmor);
        }
        this.$.unlocal();
        
        // Effects
        if (this.thrust) {
            var r = this.$.wrapAngle(this.r - Math.PI);
            var ox = this.x + Math.sin(r) * 12;
            var oy = this.y + Math.cos(r) * 12;
            var rr = [-0.9, -0.5, -0.25, 0.25, 0.5, 0.9];
            for(var i = 0; i < (this.boost ? 2 : 1); i++) {
                var ir = this.$.wrapAngle(r - rr[Math.floor(Math.random() * 6)]);
                this.$.fxPar({x: ox, y: oy, r: ir, s: 1.6,
                              d: 0.2 + (this.boost ? 0.1 : 0),
                              c: this.col, a: this.alpha});
            }
        }
        
        // Rotate
        if (this.mr !== 0) {
            var d = this.mr > 0 ? 1 : -1; 
            var r = this.$.wrapAngle(this.r - Math.PI);
            var or = this.$.wrapAngle(r - Math.PI * 2.22 * d);
            var ox = this.x + Math.sin(or) * 14;
            var oy = this.y + Math.cos(or) * 14;
            r = r - Math.PI * 2.47 * d - 0.4 + Math.random() * 0.80;
            r = this.$.wrapAngle(r);
            this.$.fxPar({x: ox, y: oy, r: r, s: 2, d: 0.10,
                          c: this.col, a: this.alpha});
        }
        
        // Shield ring
        if (this.shield) {
            this.$.strokeCircle(this.x, this.y, 20, 3, this.colFaded);
            
            this.$.alpha(0.25 * this.alpha);
            this.$.strokeCircle(this.x, this.y, 20 + (Math.random() + 0.5),
                                1.5, this.col);
            
            this.$.alpha((Math.random() / 4 + 0.25) * this.alpha );
            this.$.strokeCircle(this.x, this.y, 20 + (Math.random() + 0.5),
                                3.5 + Math.random() * 2, this.col);
            
            var count =  22 * (Math.random() / 2 + 0.75);
            var size = 19 + (Math.random() + 0.5);
            for(var i = 0; i < count; i++) {
                var r = (Math.PI * 2 / count * i) - Math.PI;
                var e = Math.random() / 2 + 0.5;
                var ox = this.x + Math.sin(r) * size;
                var oy = this.y + Math.cos(r) * size;
                
                this.$.alpha(Math.min((this.alpha * 0.5) * 2, 1.0));
                this.$.fillRect(ox - 2, oy - 2, 4, 4, this.colFaded);
            }
        }
        
        // Missile Ring
        if (this.missiles > 0) {
            if (this.mor < this.missiles) {
                this.mor += 0.0625;
            
            } else if (this.mor > this.missiles) {
                this.mor -= 0.0625;
            }
            for(var i = 0; i < this.missiles; i++) {
                var r = (Math.PI * 2 / this.mor * i) - Math.PI + this.mmr;
                r = this.$.wrapAngle(r);
                
                var size = 26 + Math.cos(this.mmr * 2);
                var ox = this.x + Math.sin(r) * size;
                var oy = this.y + Math.cos(r) * size;
                if (ox < -16) {
                    ox += this.$.width + 32;
                
                } else if (ox > this.$.width + 16) {
                    ox -= this.$.width + 32;
                }
                if (oy < -16) {
                    oy += this.$.height + 32;
                
                } else if (oy > this.$.height + 16) {
                    oy -= this.$.height + 32;
                }
                
                this.$.alpha(this.alpha * 0.5);
                this.$.fillCircle(ox, oy, 5, this.col);
                
                this.$.alpha(this.alpha);
                this.$.fillRect(ox - 2, oy - 2, 4, 4, this.col);
            }
            this.mmr += 0.1;
        }
    
    } else {
        this.shield = false;
    }
    
    // Name
    if (this.fade > 0 || this.fade === -1 || this.id === this.$.id) {
        if (this.$.playerNames[this.id]) {
            this.$.alpha(this.alpha);
            this.$.fill(this.colFaded);
            this.$.text(this.x, this.y - 27,
                        this.$.playerNames[this.id] + '('
                        + this.$.playerScores[this.id] + ')',
                        'center', 'middle');
        }
    }
    this.$.alpha(1.0);
};

ActorPlayer.emitParticles = function(speed, dur, step) {
    for(var i = 0, l = ActorPlayer.shape.length - 1;
                   i < ActorPlayer.shape.length; l = i, i++) {
        
        var a = ActorPlayer.shape[i], b = ActorPlayer.shape[l];
        var dx = b[0] - a[0];
        var dy = b[1] - a[1];
        var r = Math.atan2(dx, dy)
        var d = Math.sqrt(dx * dx + dy * dy);
        var rr = Math.atan2(a[0], a[1]);
        var dd = Math.sqrt(a[0] * a[0] + a[1] * a[1]);
        
        var steps = d / step;
        for(var e = 0; e < steps; e++) {
            var x = this.x + Math.sin(Math.PI + this.r - rr) * dd;
            var y = this.y + Math.cos(Math.PI + this.r - rr) * dd;
            x += Math.sin(Math.PI + this.r -r) * (e * step);
            y += Math.cos(Math.PI + this.r -r) * (e * step);
            this.$.fxPar({x: x, y: y, r: Math.atan2(x - this.x, y - this.y),
                          s: speed, d: dur, c: this.col, a: this.alpha});
        }
    }
};


// Bullet ----------------------------------------------------------------------
var ActorBullet = Shooter.Actor('bullet', 6);
ActorBullet.onCreate = function(data, complete) {
    this.id = data[0];
    this.col = this.$.playerColor(this.id);;
    if (complete) {
        this.$.playSound('launchSmall');
    }
};

ActorBullet.onDestroy = function(complete) {
    if (complete) {
        this.$.fxExp({o: this, n: 4, d: 0.35, s: 1, c: this.col});
        this.$.fxArea({o: this, s: 3.5, d: 0.35, c: this.col});
        this.$.playSound('explosionSmall'); 
    }
};

ActorBullet.onInterleave = function(diff) {
    this.$.wrapPosition(this);
};

ActorBullet.onDraw = function() {
    this.$.fillCircle(this.x, this.y, 2.9, this.col);
};


// Missile ---------------------------------------------------------------------
var ActorMissile = Shooter.Actor('missile', 2);
ActorMissile.shape = [[0, -12], [8, 12], [-8, 12], [0, -12]];

ActorMissile.onCreate = function(data, complete) {
    this.id = data[0];
    this.r = data[1];
    this.col = this.$.playerColor(this.id);;
    
    if (complete) {
        this.$.fxExp({o: this, n: 4, d: 0.35, s: 1, c: this.col});
        this.$.fxArea({o: this, s: 3.5, d: 0.35, c: this.col});
        this.$.playSound('launchMedium');
    }
};

ActorMissile.onUpdate = function(data) {
    this.r = data[0];
};

ActorMissile.onDestroy = function(complete) {
    if (complete) {
        this.$.fxExp({o: this, n: 6, d: 0.45, s: 1, c: this.col});
        this.$.fxArea({o: this, s: 8.5, d: 0.45, c: this.col});
        this.$.playSound('explosionMedium');
    }
};

ActorMissile.onInterleave = function(diff) {
    this.$.wrapPosition(this);
};

ActorMissile.onDraw = function() {
    this.$.local(this.x, this.y, Math.PI - this.r, 0.7, 0.7);
    this.$.alpha(0.35);
    this.$.fillPolygon(this.col, 3, ActorMissile.shape);
    this.$.alpha(1);
    this.$.fillPolygon(this.col, 3, ActorMissile.shape, 0.7);
    this.$.unlocal();
    
    var r = this.$.wrapAngle(this.r - Math.PI);
    var rr = this.$.wrapAngle(r - [-0.75, -0.0, 0.75][Math.floor(Math.random() * 3)])
    this.$.fxPar({x: this.x + Math.sin(r) * 4, y: this.y + Math.cos(r) * 4,
                  r: rr, s: 0.15, d: 0.25, c: this.col, a: 0.5});
};


// Bomb ------------------------------------------------------------------------
var ActorBomb = Shooter.Actor('bomb', 6);
ActorBomb.onCreate = function(data, complete) {
    this.id = data[0];
    this.radius = data[1];
    if (this.id !== 0) {
        this.col = this.$.playerColor(this.id);
    
    } else {
        this.col = '#F0F0F0';
    }
    if (complete) {
        this.$.playSound('launchBig');
    }
};

ActorBomb.onDestroy = function(complete) {
    if (complete) {
        this.$.playSound('explosionBig');
        this.$.fxArea({o: this, s: this.radius, d: 1, c: this.col});
        this.$.fxArea({o: this, s: this.radius / 2, d: 1.5, c: this.col});
        this.$.fxRing({o: this, r: this.radius / 2 * 0.975, n: 75, d: 1,
                       s: 1.25, c: this.col, a: 1});
        
        this.$.fxRing({o: this, r: this.radius * 0.975, n: 125, d: 1,
                       s: 1.25, c: this.col, a: 1});
    }
};

ActorBomb.onInterleave = function(diff) {
    this.$.wrapPosition(this);
};

ActorBomb.onDraw = function() {
    this.$.fillCircle(this.x, this.y, 3, this.col);
    this.$.strokeCircle(this.x, this.y, 6, 1.5, this.col);
    
    var r = Math.atan2(this.mx, this.my);
    var ox = this.x - Math.sin(r) * 2;
    var oy = this.y - Math.cos(r) * 2;
    
    var rr = [-0.7, -0.35, -0.15, 0.15, 0.35, 0.7];
    
    var ir = this.$.wrapAngle(r - rr[Math.floor(Math.random() * 6)] * 1.15);
    this.$.fxPar({x: ox, y: oy, r: ir, s: 1.25, d: 0.3, c: this.col, a: 1});
    ir = this.$.wrapAngle(r - rr[Math.floor(Math.random() * 6)] * 1.5);
    this.$.fxPar({x: ox, y: oy, r: ir, s: 1.125, d: 0.4, c: this.col, a: 1});
};

// PowerUP ---------------------------------------------------------------------
var ActorPowerUp = Shooter.Actor('powerup', 0);
ActorPowerUp.onCreate = function(data, complete) {
    this.type = data[0];
    this.col = this.$.powerUpColors[this.type];
    
    if (complete) {
        this.createTime = this.$.getTime();
        this.$.fxExp({o: this, n: 8, d: 1, s: 0.5, c: this.col});
        this.$.playSound('powerSound');
    
    } else {
        this.createTime = this.$.getTime() - 1000;
    }
};

ActorPowerUp.onDestroy = function(complete) {
    if (complete) {
        this.$.fxExp({o: this, n: 8, d: 1, s: 0.5, c: this.col});
        this.$.fxArea({o: this, s: 8, d: 0.3, c: this.col});
        this.$.playSound('powerSound');
    }
};

ActorPowerUp.onDraw = function() {
    var scale = this.$.timeScale(this.createTime, 1000);
    this.$.local(this.x, this.y, 0, scale, scale);
    if (this.type !== 'camu' && this.type !== 'armor') {
        this.$.fillCircle(0, 0, 5.25, this.col);
    
    } else {
        this.$.strokeCircle(0, 0, 4.8, 1.5, this.col);
    }
    this.$.strokeCircle(0, 0, 8, 1, this.col);
    this.$.unlocal();
};


// Player Defender -------------------------------------------------------------
var ActorPlayerDef = Shooter.Actor('player_def', 6);
ActorPlayerDef.onCreate = function(data, complete) {
    this.id = data[0];
    this.or = this.r = data[1];
    this.mr = data[2];
    this.ox = this.x = data[3];
    this.oy = this.y = data[4];
    this.wrap();
    
    this.col = this.$.playerColor(this.id);
    if (complete) {
        this.$.fxExp({x: this.dx, y: this.dy, n: 4, d: 0.25, s: 1, c: this.col});
    }
};

ActorPlayerDef.onDestroy = function(complete) {
    if (complete) {
        this.$.playSound('explosionMedium');
        this.$.fxExp({x: this.dx, y: this.dy, n: 6, d: 0.5, s: 1, c: this.col});
    }
};

ActorPlayerDef.onDraw = function() {
    this.$.fillCircle(this.dx, this.dy, 5, this.$.playerColor(this.id));
};

ActorPlayerDef.onUpdate = function(data) {
    this.or = this.r = data[0];
    this.ox = this.x = data[1];
    this.oy = this.y = data[2];
};

ActorPlayerDef.onInterleave = function(delta) {
    this.r = this.$.wrapAngle(this.or + this.mr * delta);
    this.x = this.ox + this.mx * delta;
    this.y = this.oy + this.my * delta;
    this.wrap();
};

ActorPlayerDef.wrap = function() {
    this.dx = this.x + Math.sin(this.r) * 35;
    this.dy = this.y + Math.cos(this.r) * 35;
    if (this.dx < -16) {
        this.dx += this.$.width + 32;
    
    } else if (this.dx > this.$.width + 16) {
        this.dx -= this.$.width + 32;
    }
    
    if (this.dy < -16) {
        this.dy += this.$.height + 32;
    
    } else if (this.dy > this.$.height + 16) {
        this.dy -= this.$.height + 32;
    }
};


// Asteroid --------------------------------------------------------------------
var ActorAsteroid = Shooter.Actor('asteroid', 6);
ActorAsteroid.points = [
    [[-1, -6], [-7, -4], [-6, 4], [2, 5], [6, -2]],
    [[-2, -13], [-13 , -8], [-12, 8], [-2, 12], [11, 10], [12, -8]],
    [[-5, -16], [-16 , -9], [-15, 12], [-4, 16], [13, 13], [16, -5], [10, -15]],
    
    [[-66, -120], [-126, -56], [-92, 76], [-42, 118], [6, 102], [120, 62],
     [148, 36], [148, -22], [58, -90]],
     
    [[-96, -100], [-126, -26], [-112, 75], [-32, 92], [35, 92], [110, 70],
     [138, 36], [128, -52], [28, -120]]
];

ActorAsteroid.onCreate = function(data, complete) {
    this.or = this.r = data[0];
    this.mr = data[1]; 
    this.type = data[2];
    this.col = '#777777';
    this.points = ActorAsteroid.points[this.type - 1];
    this.border = this.type < 4 ? 3 : 6;
};

ActorAsteroid.onUpdate = function(data) {
    this.or = this.r = data[0];
};

ActorAsteroid.onDraw = function() {
    this.$.local(this.x, this.y, Math.PI - this.r);
    this.$.strokePolygon(this.col, this.border, this.points);
    this.$.unlocal();
};

ActorAsteroid.onInterleave = function(delta) {
    this.r = this.$.wrapAngle(this.or + this.mr * delta);
    if (this.type < 4) {
        this.$.wrapPosition(this);
    }
};


ActorAsteroid.onDestroy = function(complete) {
    if (complete) {
        if (this.type >= 4) {
            this.$.fxExp({o: this, n: 60, d: 2.15, s: 2.50, c: this.col, w: true});
            this.$.fxArea({o: this, s: 70, d: 1.75, c: this.col, w: true});  
            this.$.fxArea({o: this, s: 150, d: 1.2, c: this.col, w: true});
            this.$.playSound('explosionMedium');
        
        } else {
            var add = this.type === 2 ? 5.5 : (this.type === 3 ? 10 : 0);
            this.$.fxExp({o: this, n: [0, 6, 10, 14][this.type],
                          d: 0.85 + add / 7, s: 0.50, c: this.col});
            
            this.$.fxArea({o: this, s: 13 + add * 1.75, d: 0.5 + add / 27, c: this.col});
            this.$.playSound(this.type === 1 ? 'explosionSmall' : 'explosionMedium');
        }
    }
};

