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
  NodeGame: Game. If not, see <http://www.gnu.org/licenses/>.
  
*/


// Server ----------------------------------------------------------------------
// -----------------------------------------------------------------------------
var NodeGame = require('./nodegame/nodegame');

// Setup Game Model
Shooter = NodeGame.Model(20);
require('./shooter/game');
require('./shooter/client');
require('./shooter/actors');

// Start a Server
Shooter.Server({
    'port': Math.abs(process.argv[2]) || 28785,
    'status': true,
    'recordFile': './../record[date].js',
    'record': false,
    'flash': true
});

