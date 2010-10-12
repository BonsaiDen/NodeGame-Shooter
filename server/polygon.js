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


function Shape2D(points, border) {
    this.count = points.length;
    this.base = new Array(this.count);
    this.radius = 0;
    for(var e = 0; e < points.length; e++) {
        var r = Math.atan2(points[e][0], points[e][1]);
        var d = Math.sqrt(points[e][0] * points[e][0]
                          + points[e][1] * points[e][1]) + border;
        
        if (d > this.radius) {
            this.radius = d;
        }
        this.base[e] = [Math.sin(r) * d,  Math.cos(r) * d];
    }
    this.radius += 3;
}

function Polygon2D(x, y, r, shape) {
    this.count = shape.count
    this.base = shape.base;
    this.radius = shape.radius;
    this.points = new Array(this.count);
    this.transform(x, y, r);
}

Polygon2D.prototype.transform = function(x, y, r) {
    r = Math.PI - r; // due to the fact that the client does this too
    for(var i = 0; i < this.count; i++) {
		var px = x + (Math.cos(r) * this.base[i][0] - Math.sin(r) * this.base[i][1]);
		var py = y + (Math.sin(r) * this.base[i][0] + Math.cos(r) * this.base[i][1]);
        this.points[i] = new Vector2D(px, py);
    }
};

Polygon2D.prototype.bounds = function() {
    var maxx = -9999999, minx = 9999999;
    var maxy = -9999999, miny = 9999999; 
    for(var i = 0; i < this.count; i++) {
        var p = this.points[i];
        if (p.x < minx) {
            minx = p.x;
        
        } else if (p.x > maxx) {
            maxx = p.x;
        }
        
        if (p.y < miny) {
            miny = p.y;
        
        } else if (p.y > maxy) {
            maxy = p.y;
        }
    }
    return [minx, miny, maxx, maxy];
};

Polygon2D.prototype.containsCircle = function(x, y, r) {
    return this.contains(x - r, y) && this.contains(x + r, y)
           && this.contains(x, y - r) && this.contains(x, y + r);
};

Polygon2D.prototype.contains = function(x, y) {
	var c = false;
	for(var i = 0, e = this.count - 1; i < this.count; e = i++) {
	    var a = this.points[i];
	    var b = this.points[e];
        if (a.y < y && b.y >= y || b.y < y && a.y >= y) {
            if (a.x + (y - a.y) / (b.y - a.y) * (b.x - a.x) < x) {
                c = !c;
            }
        }
	}
	return c;
};

Polygon2D.prototype.projectAxis = function(axis) {
    var min = max = this.points[0].dot(axis);
    for(var i = 1; i < this.count; i++) {
        var dot = this.points[i].dot(axis);
        if (dot < min) {
            min = dot;
        
        } else if (dot > max) {
            max = dot;
        }
    }
    return [min, max];
};

function projectCircle(axis, x, y, r) {
    var len = axis.magnitude();
    var cn = axis.dot(new Vector2D(x, y));
    return [cn - r * len, cn + r * len];
}

function intersectProjections(a, b) {
    return a[0] <= b[1] && b[0] <= a[1];
}

Polygon2D.prototype.intersects = function(o) {
    for(var i = 0, e = this.count - 1; i < this.count; e = i++) {
        var axis = (this.points[i].sub(this.points[e])).perpendicular();
        if (!intersectProjections(this.projectAxis(axis),
                                  o.projectAxis(axis))) {
            
            return false;
        }
    }
    
    for(var i = 0, e = o.count - 1; i < o.count; e = i++) {
        var axis = (o.points[i].sub(o.points[e])).perpendicular();
        if (!intersectProjections(o.projectAxis(axis),
                                  this.projectAxis(axis))) {
            
            return false;
        } 
    }
    return true;
};

Polygon2D.prototype.intersectsCircle = function(x, y, r) {
    for(var i = 0, e = this.count - 1; i < this.count; e = i++) {
        var axis = (this.points[i].sub(this.points[e])).perpendicular();
        if (!intersectProjections(this.projectAxis(axis),
                                  projectCircle(axis, x, y, r))) {
            
            return false;
        }  
    }
    
    var c = new Vector2D(x, y);
    for(var i = 0; i < this.count; i++) {
        var axis = c.sub(this.points[i]);
        if (!intersectProjections(this.projectAxis(axis),
                                  projectCircle(axis, x, y, r))) {
            
            return false;
        }    
    }
    return true;
};

function Vector2D(x, y) {
    this.x = x;
    this.y = y;
}

Vector2D.prototype.dot = function(o) {
    return this.x * o.x + this.y * o.y;
};

Vector2D.prototype.add = function(o) {
    return new Vector2D(this.x + o.x, this.y + o.y);
};

Vector2D.prototype.sub = function(o) {
    return new Vector2D(this.x - o.x, this.y - o.y);
};

Vector2D.prototype.cross = function(o) {
    return new Vector2D(o.y - this.y, this.x - o.x);
};

Vector2D.prototype.mul = function(m) {
    return new Vector2D(this.x * m, this.y * m);
};

Vector2D.prototype.div = function(scale) {
    return new Vector2D(this.x / scale, this.y / scale);
};

Vector2D.prototype.magnitude = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
};

Vector2D.prototype.perpendicular = function() {
    return new Vector2D(-this.y, this.x);
};

exports.Shape2D = Shape2D;
exports.Polygon2D = Polygon2D;

