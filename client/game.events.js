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


// Client Events ---------------------------------------------------------------
// -----------------------------------------------------------------------------
Shooter.onCreate = function(flash) {
    if (document.cookie !== 'SET') {
        document.cookie = 'SET'; // FF fix for certain cookie settings
    }

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
    this.onSound(this.getItem('sound', false));

    // Tutorial
    this.tutorialTimers = [null, null];
    this.tutorialFadeTimer = null;
    this.onTutorial(this.getItem('tutorial', true));

    // Achievements
    this.achievementTimer = null;
    this.achievementFadeTimer = null;
    this.achievementPriority = 0;

    // General
    var that = this;
    this.reset();
    this.colorSelected = this.getItemInt('color');

    // Input
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

    $('login').onkeypress = function(e) {
        that.onLogin(e);
    };

    if (flash) {
        show('warning');
    }

    // Firefox race condition with the colors div...
    window.setTimeout(function(){that.createColors();}, 0);

};

Shooter.onConnect = function(success) {
    if (!success) {
        this.watch();

    } else {
        this.send(['init']);
    }
};

Shooter.onUpdate = function(data, init) {

    // Fields
    if (data.s !== undefined) {
        this.width = data.s[0];
        this.height = data.s[1];
    }
    if (data.m !== undefined) {
        this.maxPlayers = data.m;
    }
    if (data.c !== undefined) {
        this.playerScores = data.c;
    }
    if (data.o !== undefined) {
        this.playerColors = data.o;
    }
    if (data.p !== undefined) {
        this.playerNames = data.p;
        this.checkPlayers(data);
    }
    if (data.rg !== undefined) {
        this.checkRound(data);
    }

    if (init) {
        this.initCanvas();
        if (!this.watching) {
            show('loginBox');
            $('login').focus();
        }
        show('sub');
        show(this.canvas);
        $('gameInfo').style.width = this.width + 'px';
        $('gameInfoRight').style.width = 260 + 'px';
        $('gameInfoLeft').style.width = (this.width - 16 - 260)  + 'px';

    } else {
        // Tutorial
        if (this.playing && !this.tutorialStarted && this.roundGO) {
            this.tutorial(this.tutorialNext);
            this.tutorialStarted = true;

        } else if (!this.roundGO && $('tutorial').style.display !== 'none') {
            this.tutorialFadeOut();
        }

        if (!this.roundGO) {
            this.achievementHide();
        }
    }
};

Shooter.onMessage = function(msg) {
    if (msg.playing === true) {
        this.kicked = false;
        this.playing = true;
        hide('loginOverlay');
    }
    if (msg.rt !== undefined) {
        this.roundStart = this.getTime();
        this.roundTime = msg.rt;
    }
    if (msg.aie !== undefined) {
        this.showAchievement(msg.aie[0], msg.aie[1], msg.aie[2], msg.aie[3]);
    }
    if (msg.kicked !== undefined) {
        this.kicked = true;
    }
};

Shooter.onClose = function(error) {
    if (this.kicked) {
        this.play();

    } else {
        this.watch();
    }
};

Shooter.onRecordingEnd = function() {
    this.$.replayRecording(this.roundTime);
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

Shooter.onDraw = function() {
    this.fill('#000000');
    this.bg.globalCompositeOperation = 'source-over';
    this.bg.fillRect(0, 0, this.width, this.height);
    this.bg.globalCompositeOperation = 'lighter';
    this.renderParticles();
    this.renderRound();
};


// Game Events -----------------------------------------------------------------
// -----------------------------------------------------------------------------
Shooter.onWatch = function() {
    this.close();
};

Shooter.onPlay = function() {
    this.play();
};

Shooter.onServerStatus = function(online) {
    if (online) {
        $('serverStatus').innerHTML = 'SERVER ONLINE!';
        hide('watching');
        show('goplaying');

    } else {
        $('serverStatus').innerHTML = 'SERVER OFFLINE';
        show('watching');
        hide('goplaying');
    }
};

Shooter.onSound = function(data) {
    if (data !== undefined) {
        this.sound.enabled = data;

    } else {
        this.sound.enabled = !this.sound.enabled;
    }
    this.setItem('sound', this.sound.enabled);
    $('sound').innerHTML = (this.sound.enabled ? 'DEACTIVATE' : 'ACTIVATE')
                                                  + ' SOUND';
};

Shooter.onTutorial = function(data) {
    if (data !== undefined) {
        this.tutorialEnabled = data;

    } else {
        this.tutorialEnabled = !this.tutorialEnabled;
    }
    this.tutorialStarted = !this.tutorialEnabled;
    this.tutorialNext = 'start';
    window.clearTimeout(this.tutorialTimers[0]);
    window.clearTimeout(this.tutorialTimers[1]);
    if (!this.tutorialStarted && this.playing) {
        this.tutorial(this.tutorialNext);
        this.tutorialStarted = true;
    }

    this.setItem('tutorial', this.tutorialEnabled);
    $('tut').innerHTML = (this.tutorialEnabled ? 'DISABLE' : 'RE-ENABLE')
                                                  + ' TUTORIAL';

    if (!this.tutorialEnabled && $('tutorial').style.display !== 'none') {
        this.tutorialFadeOut();
    }
};

Shooter.onLogin = function(e) {
    e = e || window.event;
    if (e.keyCode === 13) {
        e.preventDefault();
        return Shooter.doLogin();
    }
};

Shooter.doLogin = function() {
    var playerName = $('login').value;
    playerName = playerName.replace(/^\s+|\s+$/g, '').replace(/\s+/g, '_');
    if (playerName.length >= 2 && playerName.length <= 15) {
        this.send({'player': playerName, 'color': this.colorSelected});
    }
    return false;
};

