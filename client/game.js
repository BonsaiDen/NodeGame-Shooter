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

var CLIENT = new Client(30);
window.onload = function() {
    CLIENT.connect(HOST, PORT);
};


// Game ------------------------------------------------------------------------
// -----------------------------------------------------------------------------
Game.prototype.onConnect = function(success) {
    var that = this;
    this.canvas = document.getElementById('bg');
    if (!success) {
        document.getElementById('error').style.display = 'block';
        this.canvas.style.display = 'none';
        return;
    }
    this.canvas.style.display = 'block';
    document.getElementById('size').style.display = 'block';
    
    document.getElementById('login').onkeypress = function(e) {
        that.onLogin(e);
    };
    
    window.onbeforeunload = function() {
        localStorage.setItem('small', that.small);
        localStorage.setItem('extreme', that.extreeeeeeme);
    };
    
    // Canvas
    this.particles = [];
    this.small = localStorage.getItem('small') == 'true' || false;
    this.scale = this.small ? 0.5 : 1;
    this.extreeeeeeme = !(localStorage.getItem('extreme') == 'true' || false);
    this.onExtreme();
    
    // Stuff
    this.playerNames = {};
    this.playerScores = {};
    this.playerColors = {};
    
    this.colorCodes      = ['#f00000', '#0080ff', '#f0f000', '#00f000', '#9000ff', '#f0f0f0'];
    this.colorCodesFaded = ['#700000', '#004080', '#707000', '#007000', '#500080', '#707070'];
    
    // Rounds
    this.roundTime = 0;
    this.roundStart = 0;
    this.roundID = 0;
    this.roundStats = {};
    this.roundGO = null;
    this.playing = false;
    
    // Power UPs
    this.powerUpColors = {
        'shield':  '#0060cf', // blue
        'laser':   '#d00000', // red
        'life':    '#00b000', // green
        'boost':   '#f0c000', // yellow
        'defense': '#9c008c', // purple
        'bomb':    '#d0d0d0', // light gray
        'camu':    '#808080'  // camu
    };
    
    // Input
    this.keys = {};
    window.onkeydown = window.onkeyup = function(e, key) {
        (key = e.keyCode) != 116 ? (e.type == "keydown" ? 
                                    (!that.keys[key] ? that.keys[key] = 1 : 0) 
                                    : delete that.keys[key]) : 0;
    };
};


Game.prototype.onInit = function(data) {
    this.width = data.s[0];
    this.height = data.s[1];
    this.playerNames = data.p;
    this.playerScores = data.c;
    this.playerColors = data.o;
    this.checkRound(data);
    this.checkPlayers(data);
    
    this.initCanvas();
    
    // Login box
    document.getElementById('box').style.display = 'block';
    document.getElementById('login').focus();
};

Game.prototype.onUpdate = function(data) {
    this.playerNames = data.p;
    this.playerScores = data.c;
    this.playerColors = data.o;
    this.checkRound(data);
    this.checkPlayers(data);
};

Game.prototype.onControl = function(data) {
    return {'keys': [this.keys[87] || this.keys[38],
                     this.keys[68] || this.keys[39],
                     this.keys[13] || this.keys[77],
                     this.keys[65] || this.keys[37],
                     this.keys[32]]
    };
};

Game.prototype.onWebSocketError = function() {
    document.getElementById('bg').style.display = 'none';
    document.getElementById('fail').style.display = 'block';
};


Game.prototype.onClose = function() {
    document.location.href = document.location.href.split('#')[0].split('?')[0];
};

Game.prototype.onErroe = function(e) {
    document.location.href = document.location.href.split('#')[0].split('?')[0];
};


// Renderimg -------------------------------------------------------------------
Game.prototype.onRender = function() {
    
    // Clear
    this.fill('#000000');
    this.bg.globalCompositeOperation = 'source-over';
    this.bg.fillRect(0, 0, this.width, this.height);
    this.bg.globalCompositeOperation = 'lighter';
    
    // Effects
    this.renderParticles();
    
    // Info
    this.renderRound();
};

Game.prototype.renderRound = function() {
    this.fill('#ffffff');
    
    var t = Math.round((this.roundTime + (this.roundStart - this.getTime())) / 1000);
    var m = Math.floor(t / 60);
    var s = t % 60;
    if (s < 10) {
        s = '0' + s;
    }
    
    if (!this.roundGO) {
        this.text(this.width - 4, 1, 'Next in ' + m + ':' + s + ' | Round #'
                  + this.roundID + ' finished', 'right', 'top');
        
        // Scores
        this.font((this.scale == 1 ? 15 : 17.5));
        var ypos = 60;
        var xpos = 130;
        this.text(xpos, ypos, 'Name', 'right', 'top');
        this.text(xpos + 75, ypos, 'Score', 'right', 'top');
        this.text(xpos + 145, ypos, 'Kills', 'right', 'top');
        this.text(xpos + 260, ypos, 'SelfDest', 'right', 'top');
        
        ypos += 22;
        for(var i = 0; i < this.roundStats.length; i++) {
            var p = this.roundStats[i];
            this.fill(this.colorCodes[p[4]]);
            this.text(xpos, ypos, p[2], 'right', 'top');
            this.text(xpos + 75, ypos, p[0], 'right', 'top');
            this.text(xpos + 145, ypos, p[1], 'right', 'top');
            this.text(xpos + 260, ypos, p[3], 'right', 'top');
            ypos += 18;
        }
        this.font((this.scale == 1 ? 12 : 17));
    
    } else {
        this.text(this.width - 4, 1, m + ':' + s + ' left | Round #'
                  + this.roundID, 'right', 'top');
    }
};

Game.prototype.renderParticles = function() {
    var remove = [];
    for(var i = 0, l = this.particles.length; i < l; i++) {
        var p = this.particles[i];
        
        // Normal particles
        if (!p.size) {
            p.x += Math.sin(p.r) * p.speed;
            p.y += Math.cos(p.r) * p.speed;
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
        
        // Kill
        if (this.getTime() > p.time) {
            remove.push(i);
        
        } else {
            this.fill(p.col || '#ffffff');
            var scale = this.timeScale(p.time, p.d);
            if (!p.size) {
                this.alpha(Math.round((0 - scale) * p.a * 100) / 100);
                this.bg.fillRect(p.x - 2, p.y - 2, 4, 4);
                
            } else {
                this.alpha(Math.round(((0 - scale) * 0.5) * 100) / 100);
                this.fillCircle(p.x, p.y, p.size, p.col || '#ffffff');
                
                // Overlap
                var x = p.x;
                var y = p.y;
                if (p.x - p.size < -16) {
                    x = p.x + 32 + this.width;
                
                } else if (p.x + p.size > this.width + 16) {
                    x = p.x - 32 - this.width;
                }
                if (x != p.x) {
                    this.fillCircle(x, p.y, p.size, p.col || '#ffffff');
                }
                
                if (p.y - p.size < -16) {
                    y = p.y + 32 + this.height;
                
                } else if (p.y + p.size > this.height + 16) {
                    y = p.y - 32 - this.height;
                }
                
                if (y != p.y) {
                    this.fillCircle(p.x, y, p.size, p.col || '#ffffff');
                }
                
                if (y != p.y && x != p.x) {
                    this.fillCircle(x, y, p.size, p.col || '#ffffff');
                }
            }
        }
    }
    
    for(var i = 0, l = remove.length; i < l; i++) {
        this.particles.splice(remove[i] - i, 1);
    }
    this.alpha(1.0);
};



// Interface -------------------------------------------------------------------
Game.prototype.onResize = function(data) {
    this.small = !this.small;
    this.scale = this.small ? 0.5 : 1;
    this.initCanvas();
};

Game.prototype.onExtreme = function(data) {
    this.extreeeeeeme = !this.extreeeeeeme;
    document.getElementById('extreme').innerHTML = (this.extreeeeeeme ? 'DEACTIVATE' : 'ACTIVATE') + ' EXTREEEEME';
};

Game.prototype.onLogin = function(e) {
    e = e || window.event;
    if (e.keyCode == 13) {
        var playerName = document.getElementById('login').value;
        playerName = playerName.replace(/^\s+|\s+$/g, '').replace(/\s+/g, '_');
        if (playerName.length >= 2 && playerName.length <= 12) {
            document.getElementById('box').style.display = 'none';
            e.preventDefault();
            this.send({'join': playerName});
            this.playing = true;
        }
        return false;
    }
};


// Rounds & Players ------------------------------------------------------------
Game.prototype.checkRound = function(data) {
    if (this.roundGO != !!data.rg) {
        this.roundStart = this.getTime();
        this.roundID = data.ri;
        this.roundTime = data.rt;
        this.roundStats = data.rs;
    }
    this.roundGO = !!data.rg;
};

Game.prototype.checkPlayers = function(data) {
    var count = 0;
    for(var i in data.players) {
        count++;
    }
    
    if (!this.playing && this.roundGO) {
        var box = document.getElementById('box');
        if (count < data.max) {
            box.style.display = 'block';
        
        } else {
            box.style.display = 'none';
        }
    }
};

Game.prototype.playerColor = function(id) {
    return this.colorCodes[this.playerColors[id]];
};

Game.prototype.playerColorFaded = function(id) {
    return this.colorCodesFaded[this.playerColors[id]];
};


// Effects ---------------------------------------------------------------------
Game.prototype.effectArea = function(x, y, size, d, col) {
    d = d * 1000;
    d = this.extreeeeeeme ? d * 2 : d;
    this.particles.push({
        'x': x, 'y': y,
        'size': size,
        'time': this.getTime() + d,
        'd': d,
        'col': col
    });
};

Game.prototype.effectParticle = function(x, y, r, speed, d, col, a) {
    d = this.extreeeeeeme ? d * 2 : d;
    for(var i = 0; i < (this.extreeeeeeme ? 2 : 1); i++) {
        this.particles.push({
            'x': x + Math.random(10) * i, 'y': y + Math.random(10) * i,
            'r': this.wrapAngle(r),
            'speed': speed,
            'time': this.getTime() + d * 1000,
            'd': d * 1000,
            'col': col,
            'a': a
        });
    }
};

Game.prototype.effectExplosion = function(x, y, count, d, speed, col) {
    count = this.extreeeeeeme ? count * 2 : count;
    var r = (Math.PI * 2 * Math.random());
    var rs = Math.PI * 2 / count;
    for(var i = 0; i < count; i++) {
        this.effectParticle(x, y, (r + rs * i) - Math.PI,
                            0.35 + Math.random() * speed,
                            (1 * d) + Math.random() * (0.5 * d), col, 1);
    }
};

Game.prototype.effectRing = function(x, y, size, count, d, speed, col, a) {
    for(var i = 0; i < count; i++) {
        var r = (Math.PI * 2 / count * i) - Math.PI;
        
        var e = Math.random() / 2 + 0.5;
        var ox = x + Math.sin(r) * size;
        var oy = y + Math.cos(r) * size;
        this.effectParticle(ox, oy, r + e / 2, speed * 0.5 * e, d, col, a);
        this.effectParticle(ox, oy, r - e, speed * e, d * 2, col, a);
    }
};


// Helpers ---------------------------------------------------------------------
Game.prototype.initCanvas = function() {
    this.canvas.width = this.width * this.scale;
    this.canvas.height = this.height * this.scale;
    this.bg = this.canvas.getContext('2d');
    this.bg.scale(this.scale, this.scale);
    this.font((this.scale == 1 ? 11 : 17));
};

Game.prototype.font = function(size) {
    this.bg.font = 'bold ' + size + 'px Monaco, "DejaVu Sans Mono", "Bitstream Vera Sans Mono"';
};

Game.prototype.strokeCircle = function(x, y, size, line, color) {
    this.line(line);
    this.stroke(color);
    this.bg.beginPath();
    this.bg.arc(x, y, size, 0, Math.PI * 2, true);
    this.bg.closePath();
    this.bg.stroke();
};

Game.prototype.fillCircle = function(x, y, size, color) {
    this.line(0.5);
    this.fill(color);
    this.bg.beginPath();
    this.bg.arc(x, y, size, 0, Math.PI * 2, true);
    this.bg.closePath();
    this.bg.fill();
};

Game.prototype.line = function(width) {
    this.bg.lineWidth = width;
};

Game.prototype.alpha = function(value) {
    this.bg.globalAlpha = value;
};

Game.prototype.text = function(x, y, text, align, baseline) {
    this.bg.textAlign = align;
    this.bg.textBaseline = baseline;
    this.bg.fillText(text, x, y);   
};

Game.prototype.fill = function(color) {
    this.bg.fillStyle = color;
};

Game.prototype.stroke = function(color) {
    this.bg.strokeStyle = color;
};

Game.prototype.timeScale = function(time, scale) {
    var diff = this.getTime() - time;
    return diff < scale ? d = 1 / scale * diff : 1;         
};

Game.prototype.wrapAngle = function(r) {
    if (r > Math.PI) {
        r -= Math.PI * 2;
    }
    if (r < 0 - Math.PI) {
        r += Math.PI * 2;
    }
    return r;
};

