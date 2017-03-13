/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global angular, device, cordova */

var teocli = undefined;

angular.module('app.services.Teocli', [])

.factory('showInConnect',function () {

    return {

        message: function(msg) {

            var div = document.createElement('div');
            div.innerHTML = msg;
            div.className = "msg";
            var el = document.getElementById('stage');
            if(el !== undefined && el !== null)
                el.appendChild(div);
        },

        line: function() {

            this.message("----------");
        }

    };
})

.factory('initTeocli', function($location, $rootScope, $localStorage,
    authTeocli, dataTeocli, showInConnect) {

    var teocli_change_page_to = undefined;
    var teocli_last_page = undefined;
    var teocli_connect_to_idx = 0;

    // Initialize teonet client connection
    return {

      teocli_reconnect_now: false,
      teocli_login: false,

      teocli_init: function(done) {

        var self = this;

        /**
         * On client connected callback function example
         *
         * @param {type} ev
         * @returns {undefined}
         */
        function open_func(ev) {

            console.log('onopen', teocli.client_name, ev);
            var success = true;

            //onotherTeocli.register(onotherTeocli._onother, onother_func);

            // Send login to L0 server
            var auth = new authTeocli();
            if(!auth._checkUserLogin()) {
                // Client name (random created)
                teocli.client_name = "teo-cli-ws-" + Math.floor((Math.random() * 100) + 1);
                teocli.login(teocli.client_name); // Send login command to L0 server      
                success = false;
            }
            else {
                // Client name (userid:clientid)
                teocli.client_name = $localStorage.user.userId + ':' + $localStorage.user.clientId;
                //teocli.client_name = $localStorage.user.accessToken;
                teocli.login($localStorage.user.accessToken); // Send login command to L0 server
            }

            // Send teocli-init event
//            self.teocli_login = true;
//            $rootScope.$broadcast('teocli-init');

            if(teocli_last_page !== undefined) {

                if(teocli_change_page_to !== undefined)
                    $location.path(teocli_last_page);

                teocli_last_page = undefined;
            }

            // Call done function
            if(typeof done === 'function') { 
                if(success) done(undefined, "success"); 
                else done("err", undefined); 
            }
        }

        /**
          * On error callback function example
          *
          * @param {type} ev
          * @returns {undefined}
          */
        function error_func(ev) {

             console.log('error_func', ev);
        }

        /**
         * On close callback function example
         *
         * @param {type} ev
         * @returns {undefined}
         */
        function close_func(ev) {

            console.log('close_func', ev);

            teocli = undefined;
            self.teocli_login = false;

            if(teocli_last_page === undefined)
                teocli_last_page = $location.path();

            if(teocli_change_page_to !== undefined)
                $location.path(teocli_change_page_to);

            // Send teocli-close event
            $rootScope.$broadcast('teocli-close');

            console.log('close_func.reconnect now: ', self.teocli_reconnect_now);

            // Set timeout
            var timeout = 5000;
            if(self.teocli_reconnect_now || $rootScope.teocli_reconnect_now) {
                timeout = 100;
                self.teocli_reconnect_now = false;
            }

            // Reconnect
            console.log('close_func.reconnect after', timeout, "ms");
            setTimeout(init, timeout);
        }

        /**
         * On message callback function example
         *
         * @param {type} ev
         * @returns {undefined}
         */
        function message_func(ev) {

            //console.log('message_func', ev, ev.data.slice(0,20));
            showInConnect.message(ev.data);
        }

        /**
         * Check login answer in Other callback function
         *
         * @param {type} err
         * @param {type} data
         * @returns {int}
         */
        function other_func (err, data) {

            console.log("other_func" , data);

            var processed = 0;

            // Check login answer
            if(data && data.cmd === 96) {

                console.log("check login answer" , data);

                // Send teocli-init event
                self.teocli_login = true;
                $rootScope.$broadcast('teocli-init');
                $rootScope.networksItems = data.data.networks;
                processed = 1;
            }

            return processed;
        }

        /**
         * Set default local storage values
         * 
         * @returns {undefined}
         */
        function set_settings_default() {
            
            console.log("mset_settings_default()");  
        
            $localStorage.settings = {
                ws_server_addr: "teomac.ksproject.org",
                ws_server_port: 80,
                auth_separate: false,
                auth_server_addr: "teomac.ksproject.org",
                auth_server_port: 1234,       
                rememberMe: true,
                autoLogin: false
            };
        }
        
        function init() {

            console.log("initTeocli" , "Start");
            
            if($localStorage.settings === undefined) set_settings_default();

            // Connect to websocket server
            var ws = new WebSocket(dataTeocli.connect_to[teocli_connect_to_idx]);

            // Create Teocli object
            teocli = new Teocli(ws);

            // Set netx connection index
            if(++teocli_connect_to_idx >= dataTeocli.connect_to.length)
                teocli_connect_to_idx = 0;

            // Define received data callbacks
            // teocli.onecho = echo_func; // Calls when echo_answer received
            // teocli.onpeers = peers_func; // Calls when peers_answer received
            teocli.onother = other_func; // Calls when some other command received
            //
            // Define common websocket callbacks
            teocli.onopen = open_func; // Calls when client connected to websocket
            teocli.onclose = close_func; // Calls when client disconnected from websocket
            teocli.onerror = error_func; // Calls when websocket error hapend
            teocli.onmessage = message_func; // Calls when websocket message received
        }

        init();
      }
    };

    //return teocli_init;
})

/**
 * Teonet event callback function registration
 *
 * @param {type} $rootScope
 * @returns {onotherTeocli}
 */
.factory('onotherTeocli', function($rootScope) {

    var self; // To save this

    // Literal constants
    var _onclients = "clients";
    var _onpeers = "onpeers";
    var _onother = "onother";
    var _onecho = "onecho";

    // Initialize arrays
    function init_ar(ar) {
        ar[_onclients] = [];
        ar[_onpeers] = [];
        ar[_onother] = [];
        ar[_onecho] = [];
    }

    return {

      onclients_save: undefined,
      onpeers_save: undefined,
      onother_save: undefined,
      onecho_save: undefined,
      onother_cb_ar: Object.create(null),
      onother_ar: Object.create(null),
      _onclients: _onclients,
      _onpeers: _onpeers,
      _onother: _onother,
      _onecho: _onecho,

      /**
       * Initialize onotherTeocli factory
       *
       * @returns {undefined}
       */
      init: function() {

        console.log("onotherTeocli.init");
        init_ar(this.onother_cb_ar);
        init_ar(this.onother_ar);
        self = this;

        // On teocli init
        $rootScope.$on('teocli-init', function() {
            console.log("onotherTeocli.init.'teocli-init'");
            // onclients
            self.onclients_save = teocli.onclients;
            teocli.onclients = self.process_onclients_func;
            // onpeers
            self.onpeers_save = teocli.onpeers;
            teocli.onpeers = self.process_onpeers_func;
            // onother
            self.onother_save = teocli.onother;
            teocli.onother = self.process_onother_func;
            // onecho
            self.onecho_save = teocli.onecho;
            teocli.onecho = self.process_onecho_func;
        });

        // On teocli close(disconnect) event
        $rootScope.$on('teocli-close', this.destroy);
      },

      /**
       * Destroy onotherTeocli factory
       *
       * @returns {undefined}
       */
      destroy: function() {
        console.log("onotherTeocli.destroy");
        if(teocli !== undefined) {
            teocli.onclients = this.onclients_save;
            teocli.onpeers = this.onpeers_save;
            teocli.onother = this.onother_save;
            teocli.onecho = this.onecho_save;
        }
        //if(this.onother_ar !== undefined) {
        this.onother_cb_ar = Object.create(null);
        this.onother_ar = Object.create(null);
        //}
      },

      /**
       * Register callback function
       *
       * @param {type} type_func Type of function: onclients, onpeers, onother, onecho
       * @param {type} func Callback function to register
       * @param {type} cb Users callback, calls when processed
       * @returns {undefined}
       */
      register: function(type_func, func, cb) {
        console.log("onotherTeocli.register", type_func);
        var index = this.onother_ar[type_func].indexOf(func);
        if (!(index > -1)) {
            console.log("onotherTeocli.register.function", type_func);
            this.onother_ar[type_func].push(func);
            this.onother_cb_ar[type_func].push(cb);
        }
      },

      /**
       * Unregister callback function
       *
       * @param {type} type_func
       * @param {type} func
       * @returns {undefined}
       */
      unregister: function(type_func, func) {
        console.log("onotherTeocli.unregister", type_func);
        var index = this.onother_ar[type_func].indexOf(func);
        if (index > -1) {
            console.log("onotherTeocli.unregister.function", type_func);
            this.onother_ar[type_func].splice(index, 1);
            this.onother_cb_ar[type_func].splice(index, 1);
        }
      },

      /**
       * Process _onpeers event: find and call calback functions
       *
       * @param {type} err
       * @param {type} data
       * @returns {undefined}
       */
      process_onpeers_func: function(err, data) {

        //console.log("onotherTeocli.process_onpeers_func");
        var processed = 0, len = self.onother_ar[_onpeers].length;
        for(var i = 0; i < len &&
           (!(typeof self.onother_ar[_onpeers][i] === 'function') ||
            !(processed = self.onother_ar[_onpeers][i](err, data, self.onother_cb_ar[_onpeers][i])));
            i++);

        //console.log("onotherTeocli.process_onpeers_func.i:", i, ", processed:" , processed);
        if(!processed) {
            if(self.onpeers_save !== undefined) {
                //console.log("onotherTeocli.process_onpeers_func.execute.onpeers_save");
                if(typeof self.onpeers_save === 'function' )
                    self.onpeers_save(err, data);
            }
        }
      },

      /**
       * Process _onclients event: find and call calback functions
       *
       * @param {type} err
       * @param {type} data
       * @returns {undefined}
       */
      process_onclients_func: function(err, data) {

        //console.log("onotherTeocli.process_onclients_func");
        var processed = 0, len = self.onother_ar[_onclients].length;
        for(var i = 0; i < len &&
                   !(processed = self.onother_ar[_onclients][i](err, data, self.onother_cb_ar[_onclients][i])); i++);

        //console.log("onotherTeocli.process_onclients_func.i:", i, ", processed:" , processed);
        if(!processed) {
            if(self.onclients_save !== undefined) {
                //console.log("onotherTeocli.process_onclients_func.execute.onclients_save");
                if(typeof self.onclients_save === 'function' )
                    self.onclients_save(err, data);
            }
        }
      },

      /**
       * Process _onother event: find and call calback functions
       *
       * @param {type} err
       * @param {type} data
       * @returns {undefined}
       */
      process_onother_func: function(err, data) {

        //console.log("onotherTeocli.process_onother_func");
        var processed = 0, len = self.onother_ar[_onother].length;
        for(var i = 0; i < len &&
                   !(processed = self.onother_ar[_onother][i](err, data, self.onother_cb_ar[_onother][i])); i++);

        //console.log("onotherTeocli.process_onother_func.i:", i, ", processed:" , processed);
        if(!processed) {
            if(self.onother_save !== undefined) {
                //console.log("onotherTeocli.process_onother_func.execute.onother_save");
                if(typeof self.onother_save === 'function' )
                    self.onother_save(err, data);
            }
        }
      },

      /**
       * Process _onecho event: find and call calback functions
       *
       * @param {type} err
       * @param {type} data
       * @returns {undefined}
       */
      process_onecho_func: function(err, data) {

        //console.log("onotherTeocli.process_onecho_func");
        var processed = 0, len = self.onother_ar[_onecho].length;
        for(var i = 0; i < len &&
                   !(processed = self.onother_ar[_onecho][i](err, data, self.onother_cb_ar[_onecho][i])); i++);

        //console.log("onotherTeocli.process_onecho_func.i:", i, ", processed:" , processed);
        if(!processed) {
            if(self.onecho_save !== undefined) {
                //console.log("onotherTeocli.process_onecho_func.execute.onecho_save");
                if(typeof self.onecho_save === 'function' )
                    self.onecho_save(err, data);
            }
        }
      }


    };
})

.factory('dbTeocli', function(dataTeocli) {

    return {

    id: 0,

    /**
     * Send CMD_D_SET command
     *
     * @param cmd Command SET = 0, GET = 1 or GET_LIST = 2
     * @param key Key
     * @param data Value
     * @param db Database peer name
     *
     * @returns {undefined}
     */
    send_db_request: function (cmd, key, data, db) {

        // DB request object
        var request = {

            cmd: cmd + 129,
            to:  db === undefined ? dataTeocli.db : db,
            data: "JSON: " + JSON.stringify({
                key: key,
                id: ++this.id,
                //data: data !== undefined ? JSON.stringify(data) : undefined
                data: data
            })
        };

        // Stringify request
        var request_str = JSON.stringify(request);
        console.log("send_db_request: " + request_str);

        // Send db request to teonet
        if(teocli !== undefined)
            teocli.send(request_str);

        return this.id;
    },

   /**
     * Send CMD_D_SET command
     *
     * @param db Database name
     * @param cmd Command SET = 0, GET = 1 or GET_LIST = 2
     * @param key Key
     * @param data Value
     *
     * @returns {undefined}
     */
    send_db_request_multy: function (db, cmd, key, data) {
        return this.send_db_request(cmd, key, data, db);
    }

//   /**
//     * Send CMD_D_SET command
//     *
//     * @param db Database name
//     * @param cmd Command SET = 0, GET = 1 or GET_LIST = 2
//     * @param key Key
//     * @param data Value
//     *
//     * @returns {undefined}
//     */
//    send_db_request_multy: function (db, cmd, key, data) {
//
//        // DB request object
//        var request = {
//
//            cmd: cmd + 129,
//            to:  db,
//            data: "JSON: " + JSON.stringify({
//                key: key,
//                id: ++this.id,
//                //data: data !== undefined ? JSON.stringify(data) : undefined
//                data: data
//            })
//        };
//
//        // Stringify request
//        var request_str = JSON.stringify(request);
//        console.log("send_db_request: " + request_str);
//
//        // Send db request to teonet
//        if(teocli !== undefined)
//            teocli.send(request_str);
//
//        return this.id;
//    }

    };
})

// Check peers present and show it in menu service
.service('guiServiceTeocli', function ($rootScope, dataTeocli, initTeocli,
    onotherTeocli) {

    var db_gl_peersItems = [];
    var mm_peersItems = [];
    var statLr_peersItems = [];
    var rproxy_peersItems = [];

    console.log('guiServiceTeocli');

    //$rootScope.$on('teocli-init', init); // On teonet open(connect) event
    $rootScope.$on('teocli-close', destroy); // On teonet close(disconnect) event
    $rootScope.$on('$destroy', destroy); // On service distroy

    items_clear();
    this.login = init;

    /**
     * Menu items variables clear
     * @returns {undefined}
     */
    function items_clear() {

        // db
        $rootScope.db_peersNumber = 0;
        $rootScope.db_peersItems = [];
        // db_gl
        $rootScope.db_gl_peersNumber = 0;
        db_gl_peersItems = [];
        // room
        $rootScope.room_peersNumber = 0;
        $rootScope.room_peersItems = [];
        // mm
        $rootScope.mm_peersNumber = 0;
        mm_peersItems = [];
        // StatLR
        $rootScope.statLr_peersNumber = 0;
        statLr_peersItems = [];
        // r-proxy
        $rootScope.rproxy_peersNumber = 0;
        rproxy_peersItems = [];
    }

    /**
     * Set teocli callbacks
     * @returns {undefined}
     */
    function init() {

        console.log('guiServiceTeocli.init');

        if(teocli !== undefined && initTeocli.teocli_login) {
            onotherTeocli.register(onotherTeocli._onother, db_peers_check);
            onotherTeocli.register(onotherTeocli._onpeers, db_peers_check);
            send_peers_subscribe();
        }
        items_clear();
    }

    /**
     * Free teocli callbacks
     *
     * @returns {undefined}
     */
    function destroy() {

        console.log('guiServiceTeocli.destroy');

        if(teocli !== undefined) {
            send_peers_unsubscribe();
        }
        onotherTeocli.unregister(onotherTeocli._onother, db_peers_check);
        onotherTeocli.unregister(onotherTeocli._onpeers, db_peers_check);
        items_clear();
    }

    /**
     * Check DB peers callback function
     *
     * @param {type} err
     * @param {type} data
     * @returns {undefined}
     */
    function db_peers_check (err, data) {

        var processed = 0;

        //console.log('guiServiceTeocli.db_func', data);

        // Process peers info answer
        if(data.cmd === 73) {

            onotherTeocli.unregister(onotherTeocli._onpeers, db_peers_check);
            //data.data.arp_data_ar;
            console.log("guiServiceTeocli.db_peers_check.peers ", data);
            for(var i = 0; i < data.data.arp_data_ar.length; i++) {

                console.log("guiServiceTeocli.db_peers_check.peers ",
                    data.data.arp_data_ar[i].name);

                send_peer_info_request(data.data.arp_data_ar[i].name);
            }
        }

        // Process command #83 CMD_SUBSCRIBE_ANSWER
        else if(data.cmd === teocli.CMD.CMD_SUBSCRIBE_ANSWER) {

            // Peer Connected event EV_K_CONNECTED #3
            if(data.data.ev === 3) {

                var peer_name = atob(data.data.data);
                console.log("guiServiceTeocli.db_peers_check.connected ",
                    $rootScope.db_peersNumber, data, peer_name);
                send_peer_info_request(peer_name);
                //processed = 1;
            }

            // Peer disconnected EV_K_DISCONNECTED #4
            else if(data.data.ev === 4) {

                var peer_name = atob(data.data.data);
                console.log("guiServiceTeocli.db_peers_check.disconnected ",
                    $rootScope.db_peersNumber, data, peer_name);
                send_peer_info_request(peer_name);
                //processed = 1;
            }
        }

        // Process command #91 CMD_HOST_INFO_ANSWER
        else if(data.cmd === teocli.CMD.HOST_INFO_ANSWER) {

            console.log(
                "guiServiceTeocli.db_peers_check.host_info_answer, data:",
                data);

            for(var i = 0; i < data.data.type.length; i++) {

                console.log(
                    "guiServiceTeocli.db_peers_check.host_info_answer, type:",
                    data.data.type[i]);

                // Check DB peers
                if(data.data.type[i] === dataTeocli.db) {

                    var d = data.from;

                    $rootScope.db_peersItems.pushIfNotExist(d, function(e) {

                        return e === d;

                    }, function(e) {

                        $rootScope.db_peersNumber += 1;
                        $rootScope.$apply();
                    });

                    // Check DB_GL peers
                    if(data.data.name === dataTeocli.db_gl) {

                        var d = data.from;

                        db_gl_peersItems.pushIfNotExist(d, function(e) {

                            return e === d;

                        }, function(e) {

                            $rootScope.db_gl_peersNumber += 1;
                            $rootScope.$apply();

                        });
                    }
                }

                // Check ROOM peers
                else if(data.data.type[i] === dataTeocli.room) {

                    var d = data.from;

                    $rootScope.room_peersItems.pushIfNotExist(d, function(e) {

                        return e === d;

                    }, function(e) {

                        $rootScope.room_peersNumber += 1;
                        $rootScope.room_peersItems.sort(function(a, b) {
                            return a === b ? 0 : (a < b ? -1 : 1);
                        });
                        $rootScope.$apply();
                    });
                }

                // Check MM peers
                else if(data.data.type[i] === dataTeocli.mm) {

                    var d = data.from;

                    mm_peersItems.pushIfNotExist(d, function(e) {

                        return e === d;

                    }, function(e) {

                        $rootScope.mm_peersNumber += 1;
                        $rootScope.$apply();

                    });
                }

                // Check StatLR peers
                else if(data.data.type[i] === dataTeocli.stat_lr) {

                    var d = data.from;

                    statLr_peersItems.pushIfNotExist(d, function(e) {

                        return e === d;

                    }, function(e) {

                        $rootScope.statLr_peersNumber += 1;
                        $rootScope.$apply();

                    });
                }

                // Check RProxy peers
                else if(data.data.type[i] === dataTeocli.rproxy) {

                    var d = data.from;

                    rproxy_peersItems.pushIfNotExist(d, function(e) {

                        return e === d;

                    }, function(e) {

                        $rootScope.rproxy_peersNumber += 1;
                        $rootScope.$apply();

                    });
                }
            }
        }

        return processed;
    }

    /**
     * Send subscribe request
     *
     * @returns {undefined}
     */
    function send_peers_subscribe() {

        console.log("guiServiceTeocli.send_peers_subscribe to ", dataTeocli.l0);

        // Request peers info
        teocli.peers(dataTeocli.l0);

        // Send CMD_SUBSCRIBE Subscribe to Peers Connected / Disconnected
        teocli.send('{ "cmd": 81, "to": "' + dataTeocli.l0 + '", "data": "TEXT:3" }');
        teocli.send('{ "cmd": 81, "to": "' + dataTeocli.l0 + '", "data": "TEXT:4" }');
    }

    /**
     * Send unsubscribe request
     *
     * @returns {undefined}
     */
    function send_peers_unsubscribe() {

        console.log("guiServiceTeocli.send_peers_unsubscribe from ", dataTeocli.l0);

        // Send CMD_SUBSCRIBE UnSubscribe to Peers Connected / Disconnected
        teocli.send('{ "cmd": 82, "to": "' + dataTeocli.l0 + '", "data": "TEXT:3" }');
        teocli.send('{ "cmd": 82, "to": "' + dataTeocli.l0 + '", "data": "TEXT:4" }');
    }

    /**
     * Send host info request
     *
     * @param name Peers name
     *
     * @returns {undefined}
     */
    function send_peer_info_request(name) {

        console.log("PeersController.peers_func.send_peer_info_request:", name);

        //if(teocli !== undefined)
        teocli.send('{ "cmd": 90, "to": "' + name + '", "data": "JSON" }');
    };
})

.factory('Base64', function () {
    /* jshint ignore:start */

    var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

    return {

        encode: function (input) {
            var output = "";
            var chr1, chr2, chr3 = "";
            var enc1, enc2, enc3, enc4 = "";
            var i = 0;

            do {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);

                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;

                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }

                output = output +
                    keyStr.charAt(enc1) +
                    keyStr.charAt(enc2) +
                    keyStr.charAt(enc3) +
                    keyStr.charAt(enc4);
                chr1 = chr2 = chr3 = "";
                enc1 = enc2 = enc3 = enc4 = "";
            } while (i < input.length);

            return output;
        },

        decode: function (input) {
            var output = "";
            var chr1, chr2, chr3 = "";
            var enc1, enc2, enc3, enc4 = "";
            var i = 0;

            // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
            var base64test = /[^A-Za-z0-9\+\/\=]/g;
            if (base64test.exec(input)) {
                window.alert("There were invalid base64 characters in the input text.\n" +
                    "Valid base64 characters are A-Z, a-z, 0-9, '+', '/',and '='\n" +
                    "Expect errors in decoding.");
            }
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

            do {
                enc1 = keyStr.indexOf(input.charAt(i++));
                enc2 = keyStr.indexOf(input.charAt(i++));
                enc3 = keyStr.indexOf(input.charAt(i++));
                enc4 = keyStr.indexOf(input.charAt(i++));

                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;

                output = output + String.fromCharCode(chr1);

                if (enc3 !== 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 !== 64) {
                    output = output + String.fromCharCode(chr3);
                }

                chr1 = chr2 = chr3 = "";
                enc1 = enc2 = enc3 = enc4 = "";

            } while (i < input.length);

            return output;
        }
    };

    /* jshint ignore:end */
})
;
