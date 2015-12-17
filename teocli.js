/* 
 * The MIT License
 *
 * Copyright 2015 Kirill Scherba <kirill@scherba.ru>.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Teonet client class ver 0.0.2
 *
 * @param {Object} ws Websocket connection
 * @constructor
 */
function Teocli(ws) {

    var teocli = this;
    teocli.ws = ws;

    teocli.ws.onopen = function (ev) {
        console.log("ws.onopen");
        if (typeof teocli.onopen === 'function') {
            teocli.onopen(ev);
        }
    };
    teocli.ws.onerror = function (ev) {
        if (typeof teocli.onerror === 'function') {
            teocli.onerror(ev);
        }
    };
    teocli.ws.onclose = function (ev) {
        if (typeof teocli.onerror === 'function') {
            teocli.onclose(ev);
        }
    };
    teocli.ws.onmessage = function (ev) {
        if (!teocli.process(ev.data)) {
            if (typeof teocli.onmessage === 'function') {
                teocli.onmessage(ev);
            }
        }
    };
}

/**
 * Send data to the webSocket
 *
 * @param {String|Object} data
 * @return {boolean} result
 */
Teocli.prototype.send = function (data) {

    if (this.ws.readyState === 1) { // 1 - connection is open
        if (typeof data === "object") {
            data = JSON.stringify(data);
        }

        this.ws.send(data);
        return true;
    }

    return false;
};


/**
 * Send authentication request to peer (or L0 server)
 *
 * @param {string} to Peer name or L0 webserver if empty string
 * @param {string} method HTTP request method 'POST' or 'GET'
 * @param {string} url Part of authentication url: register-client, register, login, refresh
 * @param {type} data Authentication data rquered by URL
 * @param {string} headers Basic authentication header or emty string if not rquered
 * @param {type} timeout Result timeout
 * @param {type} callback Result callback function
 * @returns {undefined}
 */
Teocli.prototype.auth = function (to, method, url, data, headers, timeout, callback) {

    var self = this;

    var TIMEOUT = "TIMEOUT";
    var AUTH_BUSY = "AUTH BUSY";

    if (self.onauth === undefined) {

        self.onauth = function (err, response) {
            self.onauth = undefined;
            callback(err, response ? response.data : undefined);
        };

        this.send('{ "cmd": 77, "to": "' + to + '", "data": { "method": "' +
            method + '", "url": "' + url + '", "data": ' + data +
            ', "headers": "' + headers + '" } }');

        setTimeout(function () {

            // Send timeout error
            if (typeof self.onauth === 'function') {
                self.onauth(new Error(TIMEOUT), {data: {status: 400, data: TIMEOUT}});
            }

        }, timeout);
    }

    else {

        // Send authentication busy error
        if (typeof self.onauth === 'function') {
            self.onauth(new Error(AUTH_BUSY), {data: {status: 400, data: AUTH_BUSY}});
        }
    }
};

/**
 * Send login command to L0 server
 *
 * @param {type} client_name Name of this client
 * @returns {undefined}
 */
Teocli.prototype.login = function (client_name) {
    this.send('{ "cmd": 0, "to": "", "data": "' + client_name + '" }');
};

/**
 * Send peers request command to peer
 *
 * @param {type} to Peer name to send to
 * @returns {undefined}
 */
Teocli.prototype.peers = function (to) {
    this.send('{ "cmd": 72, "to": "' + to + '", "data": "" }');
};

/**
 * Send peers answer command to peer
 *
 * @param {type} to Peer name to send to
 * @returns {undefined}
 */
Teocli.prototype.peersAnswer = function (to) {
    this.send('{ "cmd": 73, "to": "' + to + '", "data": "" }');
};

/**
 * Send clients request command to peer
 *
 * @param {type} to Peer name to send to
 * @returns {undefined}
 */
Teocli.prototype.clients = function (to) {
    this.send('{ "cmd": 79, "to": "' + to + '", "data": "" }');
};

/**
 * Send clients answer command to peer
 *
 * @param {type} to Peer name to send to
 * @returns {undefined}
 */
Teocli.prototype.clientsAnswer = function (to) {
    this.send('{ "cmd": 80, "to": "' + to + '", "data": "" }');
};

/**
 * Send echo command to peer
 *
 * @param {type} to Peer name to send to
 * @param {type} msg Text message to send to peer
 * @returns {undefined}
 */
Teocli.prototype.echo = function (to, msg) {

    var d = new Date();
    var n = d.getTime();
    var msg_is_obj = this.IsJsonString(msg) ? "" : '"';
    this.send('{ "cmd": 65, "to": "' + to + '", "data": { "msg": ' +
        msg_is_obj + msg + msg_is_obj + ', "time": ' + n + ' } }');
};

/**
 * Send echo answer command to peer
 *
 * @param {type} to Peer name to send to
 * @param {type} obj Data (object) to send to peer
 * @returns {undefined}
 */
Teocli.prototype.echoAnswer = function (to, obj) {
    this.send('{ "cmd": 66, "to": "' + to + '", "data": ' + JSON.stringify(obj) + ' }');
};

/**
 * Calculate echo triptime
 *
 * @param {type} t Previous time in ms
 * @returns {Number} Return triptime - diference between now and previous time
 *                   in ms
 */
Teocli.prototype.triptime = function (t) {

    var d = new Date();
    var n = d.getTime();

    return n - t;
};

/**
 * Check if input string is JSON object
 *
 * @param {type} str JSON string
 *
 * @returns {Array|Object|undefined} Parsed json object or undefined if input
 *                         string can't be parsed
 */
Teocli.prototype.IsJsonString = function (str) {

    try {
        return JSON.parse(str);
    } catch (e) {
        return undefined;
    }
};

/**
 * Process received data
 *
 * @param {type} data Received data
 *
 * @returns {int} 1 - if processed, 0 - if not processed
 */
Teocli.prototype.process = function (data) {

    var processed = 0;

    var teocli = this;

    // Parse JSON command
    var p = teocli.IsJsonString(data);

    // Check that command is in JSON format
    if (p && p.hasOwnProperty('cmd') && p.hasOwnProperty('from') &&
        p.hasOwnProperty('data')) {

        console.log("Teocli.process", p);

        // Check received commands
        //
        // Got ECHO command
        if (p.cmd === 65) {
            // Send echo answer
            teocli.echoAnswer(p.from, p.data);
            processed = 1;
        }

        // Got ECHO answer command
        else if (p.cmd === 66) {
            // Calculate triptime command
            p.data.time = teocli.triptime(p.data.time);
            // Exequte echo callback
            if (typeof this.onecho === 'function') {
                this.onecho(null, p);
            }
            processed = 1;
        }

        // Got PEERS command
        else if (p.cmd === 72) {
            // Send peers answer command
            teocli.peersAnswer(p.from);
            processed = 1;
        }

        // Got PEERS answer command
        else if (p.cmd === 73) {
            // Exequte peers callback
            if (typeof this.onpeers === 'function') {
                this.onpeers(null, p);
            }
            processed = 1;
        }

        // Got AUTH answer command
        else if (p.cmd === 78) {
            // Exequte auth callback
            if (typeof this.onauth === 'function') {
                this.onauth(null, p);
            }
            processed = 1;
        }

        // Got CLIENTS command
        else if (p.cmd === 79) {
            // Send clients answer command
            teocli.clientsAnswer(p.from);
            processed = 1;
        }

        // Got CLIENTS answer command
        else if (p.cmd === 80) {
            // Exequte clients callback
            if (typeof this.onclients === 'function') {
                this.onclients(null, p);
            }
            processed = 1;
        }


        // Got some other command
        else {
            // Exequte other callback
            if (typeof this.onother === 'function') {
                processed = this.onother(null, p);
            }
            //processed = 0;
        }
    }

    return processed;
};

/* global module */

// Check NodeJS module exists
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Teocli;
}
