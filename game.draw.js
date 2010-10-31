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


// Drawing & Effects  ----------------------------------------------------------
// -----------------------------------------------------------------------------
Shooter.renderRound = function() {
    this.fill('#ffffff');
    if (this.watching && !this.infoLeftText) {
        $('gameInfoLeft').innerHTML = this.infoLeftText = 'No Video, just &lt;canvas&gt;!';
    }
        
    if (!this.roundGO) {
        var text = 'Next in ' + this.renderTime() + ' | Round #'
                    + this.roundID + ' finished';
        
        if (text !== this.infoRightText) {
            $('gameInfoRight').innerHTML = this.infoRightText = text;
        }
        
        // Scores
        this.font(15);
        var ypos = 60;
        var xpos = 130;
        this.text(xpos, ypos, 'Name', 'right', 'top');
        this.text(xpos + 70, ypos, 'Points', 'right', 'top');
        this.text(xpos + 135, ypos, 'Kills', 'right', 'top');
        this.text(xpos + 195, ypos, 'Self', 'right', 'top');
        this.text(xpos + 260, ypos, 'Hit', 'right', 'top');
        
        ypos += 22;
        for(var i = 0; i < this.roundStats.length; i++) {
            var p = this.roundStats[i];
            this.fill(this.colorCodes[p[4]]);
            this.text(xpos, ypos, p[2], 'right', 'top');
            this.text(xpos + 70, ypos, p[0], 'right', 'top');
            this.text(xpos + 135, ypos, p[1], 'right', 'top');
            this.text(xpos + 195, ypos, p[3], 'right', 'top');
            this.text(xpos + 260, ypos, p[5] >= 0 ? (p[5] + '%') : '--', 'right', 'top');
            ypos += 18;
        }
        this.font(12);
    
    } else {
        var text = this.renderTime() + ' left | Round #' + this.roundID;
        if (text !== this.infoRightText) {
            $('gameInfoRight').innerHTML = this.infoRightText = text;
            $('gameInfoRight').title = 'Ping ' + this.$.ping + 'ms';
        }
    }
};

Shooter.renderTime = function() {
    var timeLeft = (this.roundTime + (this.roundStart - this.getTime()));
    var t = Math.max(0, Math.round(timeLeft / 1000));
    var m = Math.floor(t / 60);
    var s = t % 60;
    if (s < 10) {
        s = '0' + s;
    }
    return m + ':' + s;
};

Shooter.renderParticles = function() {
    for(var i = 0, l = this.particles.length; i < l; i++) {
        var p = this.particles[i];
        
        // Normal particles
        if (!p.size) {
            p.x += Math.sin(p.r) * p.speed;
            p.y += Math.cos(p.r) * p.speed;
            if (!p.nowrap) {
                if (p.x < -16) {
                    p.x += this.width + 32;
                
                } else if (p.x > this.width + 16) {
                    p.x -= this.width + 32;
                }
                
                if (p.y < -16) {
                    p.y += this.height + 32;
                
                } else if (p.y > this.height + 16) {
                    p.y -= this.height + 32;
                }
            }
        }
        
        // Kill
        if (this.getTime() > p.time) {
            this.particles.splice(i, 1);
            l--;
            i--;
        
        } else {
            this.fill(p.col || '#ffffff');
            var scale = this.timeScale(p.time, p.d);
            if (!p.size) {
                var a = Math.round((0 - scale) * p.a * 100) / 100;
                this.alpha(Math.min(a * 2, 1.0));
                this.bg.fillRect(p.x - 2, p.y - 2, 4, 4);
            
            } else {
                var a = Math.round(((0 - scale) * 0.5) * 100) / 100;
                this.alpha(Math.min(a * 1.25, 1.0));
                this.fillCircle(p.x, p.y, p.size, p.col || '#ffffff');
                
                // Overlap
                if (!p.nowrap) {
                    var x = p.x;
                    var y = p.y;
                    if (p.x - p.size < -16) {
                        x = p.x + 32 + this.width;
                    
                    } else if (p.x + p.size > this.width + 16) {
                        x = p.x - 32 - this.width;
                    }
                    if (x !== p.x) {
                        this.fillCircle(x, p.y, p.size, p.col || '#ffffff');
                    }
                    
                    if (p.y - p.size < -16) {
                        y = p.y + 32 + this.height;
                    
                    } else if (p.y + p.size > this.height + 16) {
                        y = p.y - 32 - this.height;
                    }
                    
                    if (y !== p.y) {
                        this.fillCircle(p.x, y, p.size, p.col || '#ffffff');
                    }
                    
                    if (y !== p.y && x !== p.x) {
                        this.fillCircle(x, y, p.size, p.col || '#ffffff');
                    }
                }
            }
        }
    }
    this.alpha(1.0);
};


// Effects ---------------------------------------------------------------------
Shooter.fxArea = function(obj) {
    this.particles.push({
        'x': obj.o ? obj.o.x : obj.x,
        'y': obj.o ? obj.o.y : obj.y,
        'size': obj.s,
        'time': this.getTime() + obj.d * 1500,
        'd': obj.d * 1500,
        'col': obj.c,
        'nowrap': obj.w || false
    });
};

Shooter.fxPar = function(obj) {
    this.particles.push({
        'x': obj.o ? obj.o.x : obj.x,
        'y': obj.o ? obj.o.y : obj.y,
        'r': this.wrapAngle(obj.r),
        'speed': obj.s,
        'time': this.getTime() + obj.d * 1500,
        'd': obj.d * 1500,
        'col': obj.c,
        'a': obj.a,
        'nowrap': obj.w || false
    });
};

Shooter.fxExp = function(obj) {
    var x = obj.o ? obj.o.x : obj.x;
    var y = obj.o ? obj.o.y : obj.y;
    var r = (Math.PI * 2 * Math.random());
    var rs = Math.PI * 2 / (obj.n * 2);
    for(var i = 0; i < obj.n * 2; i++) {
        this.fxPar({'x': x, 'y': y, 'r': (r + rs * i) - Math.PI,
                    's':  0.35 + Math.random() * obj.s,
                    'd': (1 * obj.d) + Math.random() * (0.5 * obj.d),
                    'c': obj.c,
                    'a': 1,
                    'w': obj.w});
    }
};

Shooter.fxRing = function(obj) {
    var x = obj.o ? obj.o.x : obj.x;
    var y = obj.o ? obj.o.y : obj.y;
    for(var i = 0; i < obj.n; i++) {
        var r = (Math.PI * 2 / obj.n * i) - Math.PI;
        var e = Math.random() / 2 + 0.5;
        var ox = x + Math.sin(r) * obj.r;
        var oy = y + Math.cos(r) * obj.r;
        this.fxPar({'x': ox, 'y': oy, 'r': r + e / 2, 's': obj.s * 0.5 * e,
                    'd': obj.d, 'c': obj.c, 'a': obj.a});
        
        this.fxPar({'x': ox, 'y': oy, 'r': r - e, 's': obj.s * e,
                    'd': obj.d * 2, 'c': obj.c, 'a': obj.a});
    }
};


// Drawing ---------------------------------------------------------------------
Shooter.initCanvas = function() {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.bg = this.canvas.getContext('2d');
    this.font(12);
};

Shooter.font = function(size) {
    this.bg.font = 'bold ' + size+ 'px'
                   + ' "Tahoma", "DejaVu Sans Mono", "Bitstream Vera Sans Mono"';
};

Shooter.strokeCircle = function(x, y, size, line, color) {
    this.line(line);
    this.stroke(color);
    this.bg.beginPath();
    this.bg.arc(x, y, size, 0, Math.PI * 2, true);
    this.bg.closePath();
    this.bg.stroke();
};

Shooter.fillCircle = function(x, y, size, color) {
    this.line(0.5);
    this.fill(color);
    this.bg.beginPath();
    this.bg.arc(x, y, size, 0, Math.PI * 2, true);
    this.bg.closePath();
    this.bg.fill();
};

Shooter.fillRect = function(x, y, w, h, color) {
    this.fill(color);
    this.bg.fillRect(x, y, w, h);
};


Shooter.line = function(width) {
    this.bg.lineWidth = width;
};

Shooter.alpha = function(value) {
    this.bg.globalAlpha = value;
};

Shooter.text = function(x, y, text, align, baseline) {
    this.bg.textAlign = align;
    this.bg.textBaseline = baseline;
    this.bg.fillText(text, x, y);   
};

Shooter.fill = function(color) {
    this.bg.fillStyle = color;
};

Shooter.stroke = function(color) {
    this.bg.strokeStyle = color;
};

Shooter.local = function(x, y, r, xs, ys) {
    this.bg.save();
    this.bg.translate(x, y);
    if (r !== undefined && r !== 0) {
        this.bg.rotate(r);
    }
    if (xs !== undefined && xs !== 1) {
        this.bg.scale(xs, ys);
    }
};

Shooter.unlocal = function() {
    this.bg.restore();
};


Shooter.scale = function(x, y) {
    this.bg.scale(x, y);
};

Shooter.strokePolygon = function(col, line, points, scale) {
    this.stroke(col);
    this.line(line);
    if (scale !== undefined && scale !== 1) {
        this.bg.scale(scale, scale);
    }
    
    this.bg.beginPath();
    this.bg.moveTo(points[0][0], points[0][1]);
    for(var i = 1; i < points.length; i++) {
        this.bg.lineTo(points[i][0], points[i][1]);
    }
    this.bg.closePath();
    this.bg.stroke();
};

Shooter.fillPolygon = function(col, line, points, scale) {
    this.fill(col);
    this.line(line);
    if (scale !== undefined && scale !== 1) {
        this.bg.scale(scale, scale);
    }
    
    this.bg.beginPath();
    this.bg.moveTo(points[0][0], points[0][1]);
    for(var i = 1; i < points.length; i++) {
        this.bg.lineTo(points[i][0], points[i][1]);
    }
    this.bg.closePath();
    this.bg.fill();
};

