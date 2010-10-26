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


// Client handlers -------------------------------------------------------------
// -----------------------------------------------------------------------------
var Client = Shooter.Client();

Client.onInit = function() {
    this.playerName = '';
    this.playerColor = -1;
    this.favoredColor = -1;
    this.log('++ [' + this.getInfo() + '] connected');
    this.local = this.ip === '127.0.0.1'
};

Client.init = function() {
    if (this.playerName && !this.$$.roundFinished) {
        
        // Get favored color
        if (this.favoredColor !== -1) {
            if (this.$$.playerColors[this.favoredColor] === -1) {
                this.$$.playerColors[this.favoredColor] = this.id;
                this.playerColor = this.favoredColor;
            }
            this.favoredColor = -1;
        }
        
        // Get free color
        if (this.playerColor === -1) {
            for(var i = 0; i < this.$$.maxPlayers; i++) {
                if(this.$$.playerColors[i] === -1) {
                    this.$$.playerColors[i] = this.id;
                    this.playerColor = i;
                    break;
                }
            }
        }
        
        // Stuff
        this.left = false;
        this.reset = -1;
        this.shots = 0;
        this.hits = 0;
        this.score = 0;
        this.kills = 0;
        this.killedBy = [];
        this.selfDestructs = 0;
        this.resetAchievements();
        
        // Fields
        this.$$.fieldScores.value[this.id] = this.score;
        this.$$.fieldScores.update();
        
        this.$$.fieldColors.value[this.id] = this.playerColor;
        this.$$.fieldColors.update();
        
        this.$$.fieldPlayers.value[this.id] = this.playerName;
        this.$$.fieldPlayers.update();
        
        // Player
        this.moveTime = this.getTime();
        this.keys = [0, 0, 0, 0, 0];
        this.shotTime = this.getTime() + 1000;
        this.bomb = null;
        this.bombLaunched = false;
        this.player = this.$.createActor('player', {'r': 0, 'client': this});
    }
};

Client.onMessage = function(msg) {
    // Controls
    if (this.playerName !== '' && msg.keys && msg.keys.length === 5) {
        var k = msg.keys;
        this.keys = [!!k[0], !!k[1], !!k[2], !!k[3], !!k[4]];
    
    // Set name and init player
    } else if (msg.player) {
        msg.player = msg.player.trim().replace(/\s+/g, '_');
        if (msg.player && this.playerName === ''
            && msg.player.length >= 2 && msg.player.length <= 12
            && this.$$.playerCount < this.$$.maxPlayers) {
            
            this.playerName = msg.player;
            this.$$.playerCount += 1;
            this.message({'playing': true});
            
            if (msg.color) {
                var color = parseInt(msg.color);
                if (color >= 0 && color < this.$$.maxPlayers) {
                    this.favoredColor = color;
                }
            }
            
            this.log('++ [' + this.getInfo() + '] ' + this.playerName
                     + ' has joined');
            
            this.init();
        }
    
    // Leave the game
    } else if (this.playerName !== '' && msg.leave) {
        this.leave();
    }
};

Client.onUpdate = function() {
    if (this.$$.roundFinished || !this.playerName) {
        return;
    }
    
    // Respawn
    if (this.reset !== -1) {
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
                    'r': this.$$.wrapAngle(this.player.r + this.player.mr),
                    'player': this.player,
                    'd': 18.25 + (this.player.armor ? 3 : 0)
                });
                this.achieveBoom = 0;
                this.bomb.fired = true;
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
        && this.timeDiff(this.shotTime) > (this.player.missiles > 0 ? 400 : 600)) {
        
        moved = true;
        if (this.player.missiles > 0) {
            this.$.createActor('missile', {
                'player': this.player,
                'r': this.$$.wrapAngle(this.player.r + this.player.mr),
                'd': 16 + (this.player.armor ? 3 : 0)
            });
            this.player.missiles--;
        
        } else {
            this.$.createActor('bullet', {
                'player': this.player,
                'r': this.$$.wrapAngle(this.player.r + this.player.mr),
                'd': 13.5 + (this.player.armor ? 3 : 0)
            });
        }
        this.shotTime = this.getTime();
    }
    
    // Idle
    if (moved) {
        this.moveTime = this.getTime();
    }
    if (this.timeDiff(this.moveTime) > 30000 && !this.local) {
        this.message({'kicked': true});
        this.log('++ [' + this.getInfo() + '] ' + this.playerName
                 + ' kicked for idleing');
        
        this.player.bomb = false;
        this.close();
    }
};

Client.onRemove = function() {
    this.leave();
    this.log('-- [' + this.getInfo() + '] quit ('
             + this.$.toSize(this.bytesSend()) + ' send)');
        
};

Client.leave = function() {
    if (this.playerName !== '') {
        this.log('-- [' + this.getInfo() + '] ' + this.playerName + ' has left');
        this.playerName = '';
        this.$$.playerColors[this.playerColor] = -1;
        this.$$.playerCount--;
        
        // Fields
        delete this.$$.fieldPlayers.value[this.id];
        this.$$.fieldPlayers.update();
        
        delete this.$$.fieldScores.value[this.id];
        this.$$.fieldScores.update();
        
        if (this.player) {
            this.left = true;
            this.player.destroy();
        }
    }
};


// Kills -----------------------------------------------------------------------
Client.killByAsteroid = function(a) {
    if (this.player && !this.$$.roundFinished) {
        this.selfDestructs++;
        this.addScore(-2);
        
        if (a.destroyer === this.id) {
            this.$$.achievement(this.player, 'fail');
        }
        this.kill(false, true);
    }
};

Client.killByProjectile = function(o) {
    if (this.player && !this.$$.roundFinished) {
        var player = this.player;
        this.addScore(-5);
        this.kill(true);
        this.killedBy = [this.getTime(), o.player.cid];
        o.player.client.addScore(10);
        o.player.client.addKill();
        
        if (this.$$.getDistance(player, o.player) < this.$$.sizePlayer * 1.75
            && o.player.speed > 1.5) {
            
            this.$$.achievement(o.player, 'hit');
        }
        this.checkRevenge(o);
    }
};

Client.killByDefend = function(o) {
    if (this.player && !this.$$.roundFinished) {
        this.addScore(-5);
        this.$$.achievement(this.player, 'touch');
        this.kill(true);
        this.killedBy = [this.getTime(), o.player.cid];
        o.player.client.addScore(10);
        o.player.client.addKill(false, true);
    }
};

Client.killByPlayer = function(p) {
    if (this.player && !this.$$.roundFinished) {
        if (!p.armor) {
            this.selfDestructs++;
            this.addScore(-5);
        }
        
        if (this.player.speed > 2.8) {
            if (p.armor || p.shield) {
                this.$$.achievement(this.player, 'kami');
            }
        }        
        this.kill();
    }
};

Client.killByBomb = function(b) {
    if (this.player && !this.$$.roundFinished) {
        if (this.player !== b.player) {
            if (b.fired && b.player) {
                b.killedPlayers.push(this.id);
                b.player.client.addScore(10);
                b.player.client.hits++;
                b.player.client.addKill(true);
                this.checkRevenge(b);
            }
            this.addScore(-5);
        
        } else if (b.player) {
            b.killedPlayers.push(this.id);
            b.player.client.addScore(-5);
            b.player.client.selfDestructs++;
        }
        this.killedBy = [this.getTime(), b.player.cid];
        this.kill();
    }
};

Client.kill = function(projectile, asteroid) {    
    this.player.hp = 0;
    this.player.destroy();
    
    if (this.player.bomb && !this.bombLaunched) {
        var bomb = this.$.createActor('bomb', {
            'r': 0,
            'player': this.player,
            'd': 0
        });
        bomb.destroy();
    }
    this.bomb = null;
    this.bombLaunched = false;
    
    // Achievements
    this.achieveHatTrick = 0;
    if (projectile) {
        this.achieveHeadless++;
        if (this.achieveHeadless === 6) {
            this.$$.achievement(this.player, 'head');
            this.achieveHeadless = 0;
        }
    }
    
    if (asteroid) {
        this.achieveAsteroids++;
        if (this.achieveAsteroids === 5) {
            this.$$.achievement(this.player, 'ast');
            this.achieveAsteroids = 0;
        }
    }
    this.player = null;  
    this.reset = this.getTime();
};

Client.addKill = function(bomb, defend) {
    if (!bomb) {
        if (this.player && this.player.camu === 2) {
            this.achieveNinja++;
            if (this.achieveNinja === 2) {
                this.$$.achievement(this.player, 'ninja');
                this.achieveNinja = 0;
            }
        
        } else {
            this.achieveHatTrick++;
            if (this.achieveHatTrick === 3) {
                this.$$.achievement(this.player, 'hattrick');
                this.achieveHatTrick = 0;
            }
        }
        if (defend) {
            this.achieveDefend++;
            if (this.achieveDefend === 2) {
                this.$$.achievement(this.player, 'balls');
                this.achieveDefend = 0;
            }  
        }
    
    } else {
        this.achieveBoom++;
        if (this.achieveBoom === 3) {
            this.$$.achievement(this.player, 'boom');
            this.achieveBoom = 0;
        }
    }
    this.kills++;
};

Client.checkRevenge = function(o) {
    if (o.player.client.killedBy[1] === this.id
        && this.getTime() - o.player.client.killedBy[0] < 1000) {
        
        this.$$.achievement(o.player, 'revenge');
    }
};


// Points & Stuff --------------------------------------------------------------
Client.addScore = function(add) {
    var oldScore = this.score;
    if (add < 0 && this.player.camu === 2) {
        add *= 2;
    }
    this.score += add;
    
    // guide achievement
    if (this.score === 42 && oldScore < this.score) {
        this.$$.achievement(this.player, 'guide');
    }
    
    this.$$.fieldScores.value[this.id] = this.score;
    this.$$.fieldScores.update();
};

Client.limitScore = function() {
    if (this.score < 0) {
        this.score = 0;
        this.$$.fieldScores.value[this.id] = this.score;
        this.$$.fieldScores.update();
    }
}

Client.getInfo = function() {
    return this.ip + ':' + this.port;
};

Client.resetAchievements = function() {
    this.achieveHatTrick = 0;
    this.achieveHeadless = 0;
    this.achieveNinja = 0;
    this.achieveBoom = 0;
    this.achieveDefend = 0;
    this.achieveAsteroids = 0;
    this.achieveKawaii = 0;
    this.achieveMissile = 0;
};

