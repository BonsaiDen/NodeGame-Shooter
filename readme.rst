NodeGame: Shooter
=================

**NodeGame: Shooter** is an asteroids / geometry wars styled HTML5 multiplayer game. It was written using Node.js and HTML5.

| It currently runs natively in Chrome 5+, Safari 5 and Firefox 4 Beta.
| It also runs **somewhat** in IE9 and Opera 10 using a Flash fallback for the HTML5 WebSocket API.


Playing
-------

Currently I don't have any hosting for the game, so whether you can play it or not solely depends on the fact that my computer is online, you can give it a try here:  http://bonsaiden.github.com/NodeGame-Shooter/


Setup
-----

| If you want to run/host the game yourself you must first edit `client/config.js` to point to your server.

| Then start `server/game.js` via Node.js, additionally you can supply a port for the game to listen on.

| In case that you want to make the Flash fallback responsive, you must allow Node.js to listen on port 843. So either `sudo` start the game or use something like `privbind` on Ubuntu.


Todo
----

- (Client) Improve the sound effects


License
=======

Copyright (c) 2010 Ivo Wetzel.

All rights reserved.

**NodeGame: Shooter** is free software: you can redistribute it and/or
modify it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

**NodeGame: Shooter** is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with
**NodeGame: Shooter**. If not, see <http://www.gnu.org/licenses/>.

