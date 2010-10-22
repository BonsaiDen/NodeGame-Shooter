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
Shooter.tutorialOpacity = function() {
    var o = $('tutorial').style.opacity;
    return o === '' ? 0 : parseFloat(o.toString().replace(',', '.'));
};

Shooter.tutorialFadeIn = function() {
    var that = this;
    var opacity = this.tutorialOpacity();
    function fade() {
        if (opacity < 1 && that.roundGO && that.tutorialEnabled) {
            show('tutorialOverlay');
            opacity = Math.min(opacity + 0.05, 1);
            $('tutorial').style.opacity = opacity;
            if (opacity < 1) {
                window.setTimeout(fade, 75);
            }
        }
    }
    fade();
};

Shooter.tutorialFadeOut = function() {
    var opacity = this.tutorialOpacity();
    function fade() {
        if (opacity > 0) {
            opacity = Math.max(opacity - 0.05, 0);
            $('tutorial').style.opacity = opacity;
            if (opacity === 0) {
                hide('tutorialOverlay');
            
            } else {
                window.setTimeout(fade, 75);
            }
        }
    }
    fade();
};


// Network ---------------------------------------------------------------------
Shooter.watch = function() {
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
    this.$.connect(HOST, PORT);
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

