NodeGame: Shooter
=================

**NodeGame: Shooter** is a simple multiplayer game using node.js and HTML5
WebSockets as well as the Canvas object.

| It currently runs natively in Chrome 5+, Safari 5 and Firefox 4 Beta.
| It also runs *somehow* in IE9 and Opera 10 using a flash fallback for the WebSocket API.


Playing
-------

Depending on the time of the day(read: whether my PC is running or not)
there might be a 6 player server available at: http://bonsaiden.github.com/NodeGame-Shooter/


Setup
-----

| If you want to run the game yourself you must first edit `client/config.js` to point to your server.
| Then start `server/game.js` via Node.js, additionally you can supply a port for the game to listen on.
| If you want to make the Flash fallback responsive you must allow Node.js to listen on port 843, so either `sudo` start the game or use something like `privbind` on Ubuntu.


Todo
----

- (Client) Better/More sound effects
- (Server) Improve collision detection for ships(use polygon stuff instead of circles)
- (Server) May be some asteroids(again, polygon stuff...)


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

