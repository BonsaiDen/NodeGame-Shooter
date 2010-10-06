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


// Sounds ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
function SoundPlayer(max, dir, sounds) {
    var that = this;
    
    // IE9 doesn't expose the Audio object... idiots...
    if (typeof Audio === 'undefined') {  
        window.Audio = function() {
            return document.createElement('audio');
        };
    }
    
    // Sounds 
    this.enabled = true;
    this.soundType = (new Audio()).canPlayType('audio/mp3') ? 'mp3' : 'ogg';
    this.soundFiles = sounds;
    this.soundDirectory = dir;
    this.soundMax = max;
    
    // Preload
    this.sounds = {};
    for(var i = 0; i < this.soundFiles.length; i++) {
        this.sounds[this.soundFiles[i]] = [];
        this.Sound(this.soundFiles[i], 0.0);
    }
}

SoundPlayer.prototype.play = function(snd) {
    if (!this.enabled) {
        return;
    }
    
    var sounds = this.sounds[snd];
    for(var i = 0; i < sounds.length; i++) {
        if (sounds[i]._isReady && !sounds[i]._isPlaying) {
            sounds[i]._isPlaying = true;
            sounds[i].volume = 0.5;
            sounds[i].play();
            return true;
        }
    }
    if (sounds.length < this.soundMax) {
        this.Sound(snd, 0.5);
    }
};

SoundPlayer.prototype.Sound = function(snd, volume) {
    var a = new Audio();
    a._isReady = false;
    a._isPlaying = false;
    
    a.addEventListener('ended', function() {
        this._isPlaying = false;
    }, false);
    
    a.addEventListener('error', function() {
        this._isPlaying = false;
    }, false);
    
    a.addEventListener('empty', function() {
        this._isPlaying = false;
    }, false);
    
    a.volume = volume;
    a.addEventListener('canplay', function() {
        this._isReady = true;
        if (this.volume > 0.0) {
            this._isPlaying = true;
            a.play();
        }
    }, false);
    a.src = this.soundDirectory + '/' + snd + '.' + this.soundType;
    this.sounds[snd].push(a);
};

