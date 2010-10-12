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

var Client = new NodeGame();
window.onload = function() {
    var watch = document.location.href.split('?')[1] === 'watch';
    if (watch) {
        Shooter.onConnect(false);
    
    } else {
        Client.connect(HOST, PORT);
    }
};


// Helpers ---------------------------------------------------------------------
function show(id) {
    $(id).style.display = 'block';
}

function hide(id) {
    $(id).style.display = 'none';
}

function $(id) {
    return typeof id === 'string' ? document.getElementById(id) : id;
}


// Game ------------------------------------------------------------------------
// -----------------------------------------------------------------------------
var Shooter = Client.Game(30);

Shooter.onConnect = function(success) {
    // Force FF to show up the cookie dialog, because if cookies aren't allowed
    // localStorage will fail too.
    if (document.cookie !== 'SET') {
        document.cookie = 'SET';
    }

    this.canvas = $('bg');
    show(this.canvas);
    show('sub');
    
    $('login').onkeypress = function(e) {
        that.onLogin(e);
    };
    
    window.onbeforeunload = function() {
        localStorage.setItem('sound', that.sound.enabled);
        localStorage.setItem('color', that.colorSelected);
    };
    
    // Canvas
    this.particles = [];
    this.scale = 1;
    
    // Sounds
    this.sound = new SoundPlayer(7, 'sounds', [
        'explosionBig',
        'explosionMedium',
        'explosionShip',
        'explosionSmall',
        
        'fadeIn',
        'fadeOut',
        'launchBig',
        'launchMedium',
        'launchSmall',
        'powerOff',
        'powerOn',
        'powerSound'
    ]);
    
    try {
        this.sound.enabled = !(localStorage.getItem('sound') === 'true' || false);
        
    } catch (e) {
        this.sound.enabled = true;
    }
    this.onSound(); 
    
    // Stuff
    this.playerNames = {};
    this.playerScores = {};
    this.playerColors = {};
    
    this.colorCodes      = ['#f00000', '#0080ff', '#f0f000',
                            '#00f000', '#9000ff', '#f0f0f0'];
    
    this.colorCodesFaded = ['#700000', '#004080', '#707000',
                            '#007000', '#500080', '#707070'];
    
    
    // Color selection
    try {
        this.colorSelected = parseInt(localStorage.getItem('color') || 0);
    
    } catch (e) {
        this.colorSelected = 0;
    }
    
    var colorBox = $('colors');
    this.colorSelects = [];
    for(var i = 0; i < this.colorCodes.length; i++) {
        var d = document.createElement('div');
        d.className = i === this.colorSelected ? 'color colorselected': 'color';
        d.style.backgroundColor = this.colorCodes[i];
        d.style.borderColor = this.colorCodesFaded[i];
        
        d.onclick = (function(e) {
            return function() {
                Shooter.selectColor(e);
            }
        })(i);
        colorBox.appendChild(d);
        this.colorSelects.push(d);
    } 
    
    // Rounds
    this.roundTime = 0;
    this.roundStart = 0;
    this.roundID = 0;
    this.roundStats = {};
    this.roundGO = null;
    this.playing = false;
    
    // Power UPs
    this.powerUpColors = {
        'shield':  '#0060c0', // blue
        'armor':   '#00c9ff', // teal
        'missile': '#d00000', // red
        'life':    '#00b000', // green
        'boost':   '#f0c000', // yellow
        'defense': '#9c008c', // purple
        'bomb':    '#d0d0d0', // light gray
        'camu':    '#808080'  // camu
    };
    
    // Input
    var that = this;
    this.keys = {};
    window.onkeydown = window.onkeyup = function(e) {
        var key = e.keyCode;
        if (key !== 116 && !e.shiftKey && !e.altKey && !e.ctrlKey) {
            if (e.type === "keydown") {
                that.keys[key] = 1;
            
            } else {
                that.keys[key] = 2;
            }
            if (that.playing) {
                e.preventDefault();
                return false;
            }
        }
    };
    window.onblur = function(e) {
        that.keys = {};
    };
    
    // Play recording
    this.watch = !success;
    if (!success) {
        hide('loginBox');
        show('offlineBox');
        Shooter.$.playRecording(RECORD);
        Shooter.$.checkServer(HOST, PORT);
    }
};

Shooter.selectColor = function(c) {
    for(var i = 0; i < this.colorSelects.length; i++) {
        this.colorSelects[i].className = 'color';
    }
    this.colorSelected = c;
    this.colorSelects[c].className = 'color colorselected';
};

Shooter.reloadPage = function() {
    document.location.href = document.location.href.split('?')[0];
};

Shooter.playSound = function(snd) {
    this.sound.play(snd, 0.5);
};

Shooter.onInit = function(data) {
    this.width = data.s[0];
    this.height = data.s[1];
    this.maxPlayers = data.m;
    this.playerNames = data.p;
    this.playerScores = data.c;
    this.playerColors = data.o;
    this.checkRound(data);
    this.checkPlayers(data);
    this.initCanvas();
};

Shooter.onUpdate = function(data) {
    this.playerNames = data.p;
    this.playerScores = data.c;
    this.playerColors = data.o;
    this.checkRound(data);
    this.checkPlayers(data);
};

Shooter.onMessage = function(msg) {
    if (msg.playing === true) {
        this.playing = true;
        hide('loginOverlay');
    }
    if (msg.rt !== undefined) {
        this.roundStart = this.getTime();
        this.roundTime = msg.rt;
    }
};

Shooter.onInput = function() {
    var keys = {'keys': [
        this.keys[87] || this.keys[38] || 0,
        this.keys[68] || this.keys[39] || 0,
        this.keys[13] || this.keys[77] || 0,
        this.keys[65] || this.keys[37] || 0,
        this.keys[32] || 0]
    };
    
    for(var i in this.keys) {
        if (this.keys[i] === 2) {
            this.keys[i] = 0;
        }
    }
    return keys;
};

Shooter.onWebSocketFlash = function() {
    show('warning');
};

Shooter.onServerOnline = function() {
    $('serverStatus').innerHTML = 'SERVER ONLINE!';
    hide('watching');
    show('goplaying');
};

Shooter.onClose = function() {
    this.reloadPage();
};

Shooter.onError = function(e) {
    this.reloadPage();
};


// Renderimg -------------------------------------------------------------------
Shooter.onDraw = function() {
    
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

Shooter.renderRound = function() {
    this.fill('#ffffff');
    if (this.watch) {
        this.text(4, 1, 'No Video. Rendered live on <canvas>.', 'left', 'top');   
    }    
    
    var t = Math.round((this.roundTime
                       + (this.roundStart - this.getTime())) / 1000);
    
    if (t < 0) {
        t = 0;
    }
    
    var m = Math.floor(t / 60);
    var s = t % 60;
    if (s < 10) {
        s = '0' + s;
    }
    
    if (!this.roundGO) {
        this.text(this.width - 4, 1, 'Next in ' + m + ':' + s + ' | Round #'
                  + this.roundID + ' finished', 'right', 'top');
        
        // Scores
        this.font((this.scale === 1 ? 15 : 17.5));
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
        this.font((this.scale === 1 ? 12 : 17));
    
    } else {
        this.text(this.width - 4, 1, m + ':' + s + ' left | Round #'
                  + this.roundID, 'right', 'top');
    }
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



// Interface -------------------------------------------------------------------
Shooter.onSound = function(data) {
    this.sound.enabled = !this.sound.enabled;
    $('sound').innerHTML = (this.sound.enabled ? 'DEACTIVATE' : 'ACTIVATE')
                                                  + ' SOUND';
};

Shooter.onLogin = function(e) {
    e = e || window.event;
    if (e.keyCode === 13) {
        var playerName = $('login').value;
        playerName = playerName.replace(/^\s+|\s+$/g, '').replace(/\s+/g, '_');
        if (playerName.length >= 2 && playerName.length <= 12) {
            e.preventDefault();
            this.send({'player': playerName, 'color': this.colorSelected});
        }
        return false;
    }
};


// Rounds & Players ------------------------------------------------------------
Shooter.checkRound = function(data) {
    if (this.roundGO !== !!data.rg) {
        this.roundID = data.ri;
        this.roundStats = data.rs;
        this.roundStart = this.getTime();
        this.roundTime = data.rt; 
    }
    this.roundGO = !!data.rg;
};

Shooter.checkPlayers = function(data) {
    var count = 0;
    for(var i in data.p) {
        count++;
    }
    
    var login = $('loginOverlay');
    if (!this.playing) {
        if (count < data.m) {
            if (login.style.display !== 'block') {
                show(login);
                $('login').focus();
            }
        
        } else {
            hide(login);
        }
    }
};

Shooter.playerColor = function(id) {
    return this.colorCodes[this.playerColors[id]];
};

Shooter.playerColorFaded = function(id) {
    return this.colorCodesFaded[this.playerColors[id]];
};


// Effects ---------------------------------------------------------------------
Shooter.effectArea = function(x, y, obj) {
    this.particles.push({
        'x': x, 'y': y,
        'size': obj.s,
        'time': this.getTime() + obj.d * 1500,
        'd': obj.d * 1500,
        'col': obj.c,
        'nowrap': obj.n || false
    });
};

Shooter.effectParticle = function(x, y, r, obj) {
    this.particles.push({
        'x': x , 'y': y,
        'r': this.wrapAngle(r),
        'speed': obj.s,
        'time': this.getTime() + obj.d * 1500,
        'd': obj.d * 1500,
        'col': obj.c,
        'a': obj.a,
        'nowrap': obj.n || false
    });
};

Shooter.effectExplosion = function(x, y, count, obj) {
    var r = (Math.PI * 2 * Math.random());
    var rs = Math.PI * 2 / (count * 2);
    for(var i = 0; i < count * 2; i++) {
        this.effectParticle(x, y, (r + rs * i) - Math.PI,
                            {'s':  0.35 + Math.random() * obj.s,
                             'd': (1 * obj.d) + Math.random() * (0.5 * obj.d),
                             'c': obj.c,
                             'a': 1,
                             'n': obj.n});
    }
};

Shooter.effectRing = function(x, y, size, obj) {
    for(var i = 0; i < obj.n; i++) {
        var r = (Math.PI * 2 / obj.n * i) - Math.PI;
        var e = Math.random() / 2 + 0.5;
        var ox = x + Math.sin(r) * size;
        var oy = y + Math.cos(r) * size;
        this.effectParticle(ox, oy, r + e / 2,
                            {'s':  obj.s * 0.5 * e, 'd': obj.d,
                             'c': obj.c, 'a': obj.a});
        
        this.effectParticle(ox, oy, r - e,
                            {'s':  obj.s * e, 'd': obj.d * 2,
                             'c': obj.c, 'a': obj.a});
    }
};


// Helpers ---------------------------------------------------------------------
Shooter.initCanvas = function() {
    this.canvas.width = this.width * this.scale;
    this.canvas.height = this.height * this.scale;
    this.bg = this.canvas.getContext('2d');
    this.bg.scale(this.scale, this.scale);
    this.font((this.scale === 1 ? 12 : 17));
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

Shooter.timeScale = function(time, scale) {
    var diff = this.getTime() - time;
    return diff < scale ? d = 1 / scale * diff : 1;         
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

Shooter.wrapPosition = function(obj) {
    if (obj.x < -16) {
        obj.x += this.width + 32;
        obj.updated = true;
    
    } else if (obj.x > this.width + 16) {
        obj.x -= this.width + 32;
        obj.updated = true;
    }
    
    if (obj.y < -16) {
        obj.y += this.height + 32
        obj.updated = true;
    
    } else if (obj.y > this.height + 16) {
        obj.y -= this.height + 32;
        obj.updated = true;
    }
};

