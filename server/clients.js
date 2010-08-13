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

var gs = require(__dirname + '/server');
var Client = gs.Client;


// Client handlers -------------------------------------------------------------
// -----------------------------------------------------------------------------
Client.prototype.onInit = function() {
    this.playerName = '';
    this.playerColor = -1;
    this.log('++ [' + this.getInfo() + '] connected');
    this.$.emitFields();
};

Client.prototype.init = function() {
    if (this.playerName && !this.$g.roundFinished) {
        
        // Get free color
        if (this.playerColor == -1) {
            for(var i = 0; i < this.$g.maxPlayers; i++) {
                if(this.$g.playerColors[i] == -1) {
                    this.$g.playerColors[i] = this.id;
                    this.playerColor = i;
                    break;
                }
            }
        }
        this.log('++ [' + this.getInfo() + '] ' + this.playerName
                 + ' has joined, color ' + this.playerColor);
        
        this.$.setFieldItem('o', this.id, this.playerColor); // colors
        this.$.setFieldItem('p', this.id, this.playerName); // players
        this.reset = -1;
        
        this.score = 0;
        this.$.setFieldItem('c', this.id, this.score); // scores
        this.$g.addPlayerStats(this.id);
        
        this.moveTime = this.getTime();
        this.keys = [0, 0, 0, 0, 0];
        this.shotTime = this.getTime() + 1000;
        this.bomb = null;
        this.bombLaunched = false;
        
        this.$.emitFields();
        this.player = this.$.createActor('player', {'r': 0, 'client': this});
    }
};

Client.prototype.kill = function() {
    if (this.player && !this.$g.roundFinished) {
        this.bomb = null;
        this.addScore(this.player.camu == 2 ? -10 : -5);
        this.reset = this.getTime();
        this.player.destroy();
        if (this.player.bomb && !this.bombLaunched) {
            var bomb = this.$.createActor('bomb', {
                'r': 0,
                'player': this.player,
                'd': 0
            });
            bomb.destroy();
        }
        this.player = null;  
        this.bombLaunched = false;
    }
};

Client.prototype.addScore = function(add) {
    this.score += add;
    this.$.setFieldItem('c', this.id, this.score); // scores
};

Client.prototype.onMessage = function(msg) {
    // Controls
    if (this.playerName != '' && msg.keys && msg.keys.length == 5) {
        var k = msg.keys;
        this.keys = [!!k[0], !!k[1], !!k[2], !!k[3], !!k[4]];
    
    // Set name and init player
    } else if (msg.join) {
        msg.join = msg.join.trim().replace(/\s+/g, '_');
        if (msg.join && this.playerName == ''
            && msg.join.length >= 2 && msg.join.length <= 12
            && this.$g.playerCount < this.$g.maxPlayers) {
            
            this.playerName = msg.join;
            this.$g.playerCount += 1;
            this.init();
        }
    
    // Leave the game
    } else if (this.playerName != '' && msg.leave) {
        this.leave();
    }
};

Client.prototype.onUpdate = function() {
    if (this.$g.roundFinished || !this.playerName) {
        return;
    }
    
    if (this.reset != -1) {
        if (this.timeDiff(this.reset) > 3000) {
            this.shotTime = this.getTime();
            this.player = this.$.createActor('player', {'r': 0, 'client': this});
            this.reset = -1;
        }
        return;
    }
    
    // Turn
    var moved = false;
    if (this.keys[1]) {
        moved = true;
        this.player.mr = -0.1;
    
    } else if (this.keys[3]) {
        moved = true;
        this.player.mr = 0.1;
    
    } else {
        this.player.mr = 0;
    }
    
    // Bomb
    if (this.keys[2] && !this.bombDown) {
        if (this.player.bomb) {
            moved = true;
            if (this.bombLaunched) {
                this.bomb.destroy();
                
                if (!this.player) {
                    return;
                }
            
            } else {
                this.bomb = this.$.createActor('bomb',{
                    'r': this.$g.wrapAngle(this.player.r + this.player.mr),
                    'player': this.player,
                    'd': 14
                });
                this.bombLaunched = true;
            }
        }
        this.bombDown = true;
    
    } else if (!this.keys[2]) {
        this.bombDown = false;
    }
    
    // Acceleration
    if (this.keys[0]) {
        moved = true;
        this.player.mx += Math.sin(this.player.r) * 0.19;
        this.player.my += Math.cos(this.player.r) * 0.19;
    }
    this.player.thrust = this.keys[0];
    
    // Shoot
    if (this.keys[4]
        && this.timeDiff(this.shotTime) > (this.player.laser ? 400 : 600)) {
        
        moved = true;
        this.$.createActor('bullet', {
            'player': this.player,
            'r': this.$g.wrapAngle(this.player.r + this.player.mr),
            'd': 12
        });
        this.shotTime = this.getTime();
    }
    
    // Idle
    if (moved) {
        this.moveTime = this.getTime();
    }
    if (this.timeDiff(this.moveTime) > 30000) {
        this.log('++ [' + this.getInfo() + '] ' + this.playerName
                 + ' kicked for idleing');
        
        this.player.bomb = false;
        this.close();
        return;
    }
};

Client.prototype.onRemove = function() {
    this.leave();
    this.log('-- [' + this.getInfo() + '] quit');
};

Client.prototype.leave = function() {
    if (this.playerName != '') {
        this.$g.playerColors[this.playerColor] = -1;
        this.$g.playerCount -= 1;
        this.log('-- [' + this.getInfo() + '] ' + this.playerName
                 + ' has left');
        
        this.playerName = '';
        this.$.delFieldItem('p', this.id); // players
        this.$.delFieldItem('c', this.id); // scores
        this.$g.removePlayerStats(this.id);
        if (this.player) {
            this.player.destroy();
        }
    }
};

