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


// Helpers ---------------------------------------------------------------------
//------------------------------------------------------------------------------
Shooter.getOpacity = function(id) {
    var o = $(id).style.opacity;
    return o === '' ? 0 : parseFloat(o.toString().replace(',', '.'));
};

Shooter.tutorialFadeIn = function() {
    var that = this;
    var opacity = this.getOpacity('tutorial');
    function fade() {
        if (opacity < 1 && that.roundGO && that.tutorialEnabled) {
            show('tutorialOverlay');
            opacity = Math.min(opacity + 0.075, 1);
            $('tutorial').style.opacity = opacity;
            if (opacity < 1) {
                that.tutorialFadeTimer = window.setTimeout(fade, 75);
            }
        }
    }
    window.clearTimeout(this.tutorialFadeTimer);
    fade();
};

Shooter.tutorialFadeOut = function() {
    var that = this;
    var opacity = this.getOpacity('tutorial');
    function fade() {
        if (opacity > 0) {
            opacity = Math.max(opacity - 0.075, 0);
            $('tutorial').style.opacity = opacity;
            if (opacity === 0) {
                hide('tutorialOverlay');
            
            } else {
                that.tutorialFadeTimer = window.setTimeout(fade, 75);
            }
        }
    }
    window.clearTimeout(this.tutorialFadeTimer);
    fade();
};

Shooter.achievementFadeIn = function() {
    var that = this;
    var opacity = this.getOpacity('achievement');
    function fade() {
        if (opacity < 1) {
            show('achievementOverlay');
            opacity = Math.min(opacity + 0.075, 1);
            $('achievement').style.opacity = opacity;
            if (opacity < 1) {
                that.achievementFadeTimer = window.setTimeout(fade, 50);
            }
        }
    }
    window.clearTimeout(this.achievementFadeTimer);
    fade();
};

Shooter.achievementFadeOut = function(callback) {
    var that = this;
    var opacity = this.getOpacity('achievement');
    function fade() {
        if (opacity > 0) {
            opacity = Math.max(opacity - 0.075, 0);
            $('achievement').style.opacity = opacity;
            if (opacity === 0) {
                hide('achievementOverlay');
                if (callback) {
                    callback();
                }
            
            } else {
                that.achievementFadeTimer = window.setTimeout(fade, 50);
            }
        }
    }
    window.clearTimeout(this.achievementFadeTimer);
    fade();
};

Shooter.showAchievement = function(player, title, description, priority) {
    var that = this;
    var overlay = $('achievementOverlay');
    if (overlay.style.display !== 'block') {
        this.achievementPriority = priority;
    
        if (this.playing && this.player) {
            if (this.player.y > this.height / 2) {
                overlay.style.paddingTop = '80px';
            
            } else {
                overlay.style.paddingTop = (this.height - 100) + 'px';
            }
        
        } else {
            overlay.style.paddingTop = '80px';
        }
        
        $('achievement').innerHTML = '<span style="color: '
                                     + this.playerColor(player) +'">'
                                     + '- ' + title + ' -'
                                     + '</span><br/>'
                                     + description;
        
        this.achievementFadeIn();
        this.achievementTimer = window.setTimeout(function() {
            that.achievementPriority = 0;
            that.achievementFadeOut();
        }, 3500);
    
    } else if (priority >= this.achievementPriority) {
        window.clearTimeout(this.achievementTimer);
        this.achievementFadeOut(function() {
            that.showAchievement(player, title, description);
        });
    }
};

Shooter.achievementHide = function() {
    window.clearTimeout(this.achievementTimer);
    this.achievementPriority = 0;
    this.achievementFadeOut();
}


// Network ---------------------------------------------------------------------
Shooter.watch = function() {
    this.achievementHide();
    window.clearTimeout(this.tutorialTimers[0]);
    window.clearTimeout(this.tutorialTimers[1]);
    this.watching = true;
    this.reset();
    show('loginOverlay')
    hide('loginBox');
    show('offlineBox');
    this.$.playRecording(RECORD);
    this.checkServer(HOST, PORT);
};

Shooter.play = function () {
    window.clearTimeout(this.checkTimer);
    this.watching = false;
    this.$.stopRecording();
    this.reset();
    hide('offlineBox');
    $('gameInfoLeft').innerHTML = '';
    this.connect(HOST, PORT);
};


// Storage ---------------------------------------------------------------------
Shooter.getItem = function(id, def) {
    try {
        var value = localStorage.getItem(id);
        if (value === 'false') {
            return false;
        
        } else if (value === 'true') {
            return true;
        
        } else {
            return def;
        }
        
    } catch (e) {
        return def;
    }
};

Shooter.getItemInt = function(id) {
    try {
        return parseInt(localStorage.getItem('color') || 0);
        
    } catch (e) {
        return 0;
    }
};

Shooter.setItem = function(id, value) {
    try {
        localStorage.setItem(id, value);
    
    } catch(e) {
    }
}


// Colors ----------------------------------------------------------------------
Shooter.selectColor = function(c) {
    for(var i = 0; i < this.colorSelects.length; i++) {
        this.colorSelects[i].className = 'color';
    }
    this.colorSelected = c;
    this.colorSelects[c].className = 'color colorselected';
    this.setItem('color', c);
};

Shooter.createColors = function() {
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
};


Shooter.playerColor = function(id) {
    return this.colorCodes[this.playerColors[id]];
};

Shooter.playerColorFaded = function(id) {
    return this.colorCodesFaded[this.playerColors[id]];
};


// Game ------------------------------------------------------------------------
Shooter.playSound = function(snd) {
    this.sound.play(snd, 0.5);
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
    
    } else if (obj.x > this.width + 16) {
        obj.x -= this.width + 32;
    }
    
    if (obj.y < -16) {
        obj.y += this.height + 32;
    
    } else if (obj.y > this.height + 16) {
        obj.y -= this.height + 32;
    }
};

