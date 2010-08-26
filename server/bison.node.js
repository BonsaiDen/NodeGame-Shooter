/*
  
  BiSON.js
  Copyright (c) 2010 Ivo Wetzel.
  
  All rights reserved.
  
  BiSON.js is free software: you can redistribute it and/or
  modify it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  BiSON.js is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License along with
  BiSON.js. If not, see <http://www.gnu.org/licenses/>.
  
*/

var chr = String.fromCharCode;

var enc = '';
function _encode(data) {
    if (typeof data == 'number') {
        
        // Float
        var add = 0;
        if (Math.floor(data) != data) {
            var m = data > 0 ? Math.floor(data) : Math.ceil(data);
            var r = Math.round((data - m) * 100);
            if (!(m >= 0 && r >= 0)) {
                m = Math.abs(m);
                r = Math.abs(r);      
                add = 1;
            }
            
            if (m <= 255) {
                enc += chr(13 + add) + chr(m) + chr(r);
            
            } else if (m <= 65535) {
                enc += chr(15 + add) + chr(m >> 8 & 0xff) + chr(m & 0xff) + chr(r);
            
            } else if (m <= 2147483647) {
                enc += chr(17 + add) + chr(m >> 24 & 0xff) + chr(m >> 16 & 0xff)
                       + chr(m >> 8 & 0xff) + chr(m & 0xff) + chr(r);
            
            } else {
                enc += chr(1 + add) + chr(0);
            }
        
        // Fixed
        } else {
            if (data < 0) {
                data = Math.abs(data);   
                add = 1;
            }
            
            if (data <= 255) {
                enc += chr(1 + add) + chr(data);
                
            } else if (data <= 65535) {
                enc += chr(3 + add) + chr(data >> 8 & 0xff) + chr(data & 0xff);
            
            } else if (data <= 2147483647) {
                enc += chr(5 + add) + chr(data >> 24 & 0xff) + chr(data >> 16 & 0xff)
                       + chr(data >> 8 & 0xff) + chr(data & 0xff);
            
            } else {
                enc += chr(1 + add) + chr(0);
            }
        }
    
    // Strings
    } else if (typeof data == 'string') {
        enc += chr(7) + data + chr(0);
    
    // Boolean
    } else if (typeof data == 'boolean') {
        enc += chr(data ? 19 : 20)
    
    // Objects / Arrays
    } else if (typeof data == 'object') {
        if (Array.isArray(data)) {
            enc += chr(8);
            for(var i = 0, l = data.length; i < l; i++) {
                _encode(data[i]);
            }
            enc += chr(9);
        
        } else {
            enc += chr(10);
            for(var i in data) {
                enc += chr(25 + i.length) + i;
                _encode(data[i]);
            }
            enc += chr(11);
        }
    }
}

function encode(data) {
    enc = '';
    _encode(data);
    return enc;
};

function add(o, v, k) {
    if (Array.isArray(o)) {
        o.push(v);
    
    } else {
        o[k] = v;
    }
}

function decode(data) {
    var p = 0;
    var l = data.length;
    var s = [];
    var d = [];
    var k = '';
    var str = '';
    while(p < l) {
        var t = data.charCodeAt(p++);
        
        // Key
        if (t >= 25) {
            k = data.substring(p, p + (t - 25));
            p += (t - 25);
        
        // Array // Objects
        } else if (t == 8 || t == 10) {
            var a = t == 8 ? [] : {};
            if (s.length > 0) {
                add(s[0], a, k);
            
            } else {
                d.push(a);
            }
            s.unshift(a);
        
        } else if (t == 11 || t == 9) {
            s.shift();
        
        // Fixed
        } else if (t > 0 && t < 7) {
            var size = Math.floor((t - 1) / 2);
            var value = 0;
            if (size == 0) {
                value = data.charCodeAt(p);
                p++;
            
            } else if (size == 1) {
                value = (data.charCodeAt(p) << 8) + data.charCodeAt(p + 1);
                p += 2;
            
            } else if (size == 2) {
                value = (data.charCodeAt(p) << 24) + (data.charCodeAt(p + 1) << 16)
                        + (data.charCodeAt(p + 2) << 8) + data.charCodeAt(p + 3);
                
                p += 4;
            }
            add(s[0], t % 2 ? value : 0 - value, k);
        
        // Floats
        } else if (t > 12 && t < 19) {
            var size = Math.floor((t - 1) / 2) - 6;
            var m = 0, r = 0;
            if (size == 0) {
                m = data.charCodeAt(p);
                r = data.charCodeAt(p + 1);
                p += 2;
            
            } else if (size == 1) {
                m = (data.charCodeAt(p) << 8) + data.charCodeAt(p + 1);
                r = data.charCodeAt(p + 2);
                p += 3;
            
            } else if (size == 2) {
                m = (data.charCodeAt(p) << 24) + (data.charCodeAt(p + 1) << 16)
                         + (data.charCodeAt(p + 2) << 8) + data.charCodeAt(p + 3);
                
                r = data.charCodeAt(p + 4);
                p += 5;
            }
            add(s[0], t % 2 ? m + r * 0.01: 0 - (m + r * 0.01), k);
        
        // Boolean
        } else if (t > 18 && t < 21) {
            add(s[0], t == 19, k);
        
        // String
        } else if (t == 7) {
            str = '';
            while(data.charCodeAt(p) != 0) {
                str += data.charAt(p++);
            }
            add(s[0], str, k);
        }
    }
    return d[0];
}

exports.encode = encode;
exports.decode = decode;

