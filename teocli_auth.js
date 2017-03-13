/* global teocli, angular, CryptoJS, device */

angular.module('app.services.Auth', [])

.factory('authTeocli', function($rootScope, $localStorage, $location, $http, 
    Base64) {

    /**
     * User class
     *
     * @returns {auth_L3.User}
     */
    function User () {

    }

    /**
     * Use websocket to send authenticate requests
     */
    //User.prototype._use_ws = !$localStorage.settings.auth_separate; //false;

    /**
     * Authentication request throught websocket timeout
     */
    User.prototype._ws_timeout = 10000;

    /**
     * Method POST constant
     */
    User.prototype._POST = "POST";

    /**
     * Method GET constant
     */
    User.prototype._GET = "GET";

    /**
     * Check websocker response error
     *
     * @param {type} err
     * @param {type} response
     * @param {type} callback
     * @returns {undefined}
     */
    User.prototype._check_error = function(err, response, callback) {

        if(err || response.status !== 200) {

            var REQUEST_FAILED = "Request failed";
            if(response) callback(response.status, response.data || REQUEST_FAILED);
            else callback(REQUEST_FAILED, REQUEST_FAILED);

            return true;
        }
        return false;
    };

    /**
     * Make Authentication server URL
     *
     * @returns {String}
     */
    User.prototype._auth_server = function() {
        return "http://" + $localStorage.settings.auth_server_addr + ":" +
            $localStorage.settings.auth_server_port + "/api/auth/";
    };

    /**
     * Decrypt text
     *
     * @param {string} text
     * @param {string} secret
     *
     * @returns {string}
     */
    User.prototype._decrypt = function(text, secret) {

        var ciphertext = CryptoJS.enc.Hex.parse(text); // text in hex
        var salt = CryptoJS.lib.WordArray.create(0); // empty array
        var decrypted = CryptoJS.AES.decrypt({ciphertext: ciphertext, salt: salt}, secret);

        return decrypted.toString(CryptoJS.enc.Utf8);
    };

    /**
     * Encrypt object
     *
     * @param {object} data
     * @param {string} secret
     *
     * @returns {object}
     */
    User.prototype._encrypt = function(data, secret) {

        var text = JSON.stringify(data);

        var salt = CryptoJS.lib.WordArray.create(0); // empty array
        var params = CryptoJS.kdf.OpenSSL.execute(secret, 256/32, 128/32, salt);
        var encrypted = CryptoJS.AES.encrypt(text, params.key, {iv: params.iv});

        return { data: encrypted.ciphertext.toString() };
     };


    /**
     * Check client info and request it if absent
     *
     * @param callback
     * @private
     */
    User.prototype._checkClient = function (callback) {

        var self = this;

        var user = $localStorage.user;
        if (user && user.clientId && user.clientSecret && user.clientKey) {
            callback(null);
            return;
        }

        // Register client if clientId is absent
        self.registerClient(function (err) {

            if (err) {
                callback(err);
                return;
            }
            callback(null);
        });
    };

    /**
     * Last time login or refresh
     */
    User.prototype._refreshTime = 0;

    /**
     * Set refresh time
     * @returns {undefined}
     */
    User.prototype._setRefreshTime = function() {
        User.prototype._refreshTime = Date.now();
    };

    /**
     * Check time to refresh and refresh if need
     *
     * @param callback
     * @private
     */
    User.prototype._checkRefresh = function (callback) {

        var self = this;

        if((Date.now() - self._refreshTime) > 30 * 60 * 1000 ) self.refresh(callback);
        else callback(null, "Refresh not need now");
    };

    /**
     * Check user login to this application
     * 
     * @returns {teocli_auth_L5.$localStorage.user}
     */
    User.prototype._checkUserLogin = function () {
        
        if(!$localStorage.user)$location.path("/login");
        
        return $localStorage.user;
    };
    
    /**
     * Update rootScope userName parameter
     *
     */
    User.prototype._updateUserName = function () {
        
        var self = this;

        if(self._checkUserLogin()) {
            $rootScope.userName = $localStorage.user.username;
            $rootScope.userLogin = "Logout";
        }
        else {
            $rootScope.userName = ""; //"Admin";
            $rootScope.userLogin = ""; //"Login";
        }
    };

    /**
     * Register client
     *
     * @param {Function} callback
     */
    User.prototype.registerClient = function (callback) {

        var self = this;

        var data = {
//            os: {
//                type: os.type(),
//                platform: os.platform(),
//                arch: os.arch(),
//                cpus: os.cpus(),
//                networkInterfaces: os.networkInterfaces()
//            }
            type: "teonet-lig-i"
            //teoman_device: device
        };

        var success = function(response) {

            $localStorage.user = response.data;

            // Delay before login/register to get time to save data to DataBase
            setTimeout(function() {
                callback(null, response.data);
            }, 100);
        };

        // HTTP request
        if($localStorage.settings && $localStorage.settings.auth_separate)
            $http({

            method: self._POST,
            url: self._auth_server() + 'register-client',
            data: data

        }).then(function(response){

            success(response);

        }, function(response){

            callback(response.status, response.data || "Request failed");
        });

        // Teocli (websocket) request
        else teocli.auth("", self._POST,
            "register-client", // URL
            JSON.stringify(data), // Data
            "", // Header
            self._ws_timeout, function(err, response) {

            console.log("teocli.auth register-client: ", err, response);
            if(!self._check_error(err, response, callback)) success(response);
        });
    };

    /**
     * Register User
     *
     * @param {type} email
     * @param {type} password
     * @param {type} name
     * @param {type} userData
     * @param {type} callback
     * @returns {undefined}
     */
    User.prototype.register = function(email, password, name, userData, callback) {

        var self = this;

        self._checkClient(function (err) {

            if (err) {
                callback(err);
                return;
            }

            var data = {
                email: email,
                hashPassword: CryptoJS.SHA512(password).toString(),
                username: name,
                userData: userData
            };

            var success = function(response) {

                // Decrypt
                var dec = self._decrypt(response.data.data, $localStorage.user.clientKey);
                angular.extend($localStorage.user, JSON.parse(dec.toString()));

                // Save refresh time
                self._setRefreshTime();

                callback(null, response);
            };

            var user = $localStorage.user;

            // HTTP request
            if($localStorage.settings && $localStorage.settings.auth_separate)
                $http({

                method: self._POST,
                url: self._auth_server() + 'register',
                data: self._encrypt(data, user.clientKey),
                headers: {
                    'Authorization': 'Basic ' + Base64.encode(user.clientId + ':' + user.clientSecret)
                }

            }).then(function(response) {

                success(response);

            }, function(response){

                callback(response.status, response.data || "Request failed");

            });

            // Teocli (websocket) request
            else teocli.auth("", self._POST, "register",
                JSON.stringify(self._encrypt(data, user.clientKey)),
                "Authorization: Basic " + Base64.encode(user.clientId + ':' + user.clientSecret),
                self._ws_timeout, function(err, response) {

                console.log("teocli.auth register: ", err, response);

                // Check error
                if(!self._check_error(err, response, callback)) success(response);
            });
        });
    };

    /**
     * User login
     *
     * @param {type} email
     * @param {type} password
     * @param {type} callback
     * @returns {undefined}
     */
    User.prototype.login = function (email, password, callback) {

        var self = this;

        self._checkClient(function (err) {

            if (err) {
                callback(err);
                return;
            }

            var data = {
                email: email,
                hashPassword: CryptoJS.SHA512(password).toString()
            };

            var success = function(response) {
                var dec = self._decrypt(response.data.data, $localStorage.user.clientKey);
                angular.extend($localStorage.user, JSON.parse(dec.toString()));
                callback(null, response || "Request success");

                // Save refresh time
                self._setRefreshTime();
            };

            var user = $localStorage.user;

            // HTTP request
            if($localStorage.settings && $localStorage.settings.auth_separate)
                $http({

                method: self._POST,
                url: self._auth_server() + 'login',
                data: self._encrypt(data, user.clientKey),
                headers: {
                    'Authorization': 'Basic ' + Base64.encode(user.clientId + ':' + user.clientSecret)
                }

            }).then(function(response) {

                success(response);

            }, function(response){

                callback(response.status, response.data || "Request failed");

            });

            // Teocli (websocket) request
            else teocli.auth("", self._POST, "login",
                JSON.stringify(self._encrypt(data, user.clientKey)),
                "Authorization: Basic " + Base64.encode(user.clientId + ':' + user.clientSecret),
                self._ws_timeout, function(err, response) {

                console.log("teocli.auth login:", err, response);
                if(!self._check_error(err, response, callback)) success(response);
            });
        });
    };

    /**
     * Refresh Access Token
     *
     * @param {type} callback
     * @returns {undefined}
     */
    User.prototype.refresh = function (callback) {

        console.log("teocli.auth.refresh");

        var self = this;
        var user = $localStorage.user;
        var data = { refreshToken: user.refreshToken };
        var success = function(response) {

            // Decrypt response data and extend user storage
            var dec = self._decrypt(response.data.data, $localStorage.user.clientKey);
            angular.extend($localStorage.user, JSON.parse(dec.toString()));
            // Save refresh time
            self._setRefreshTime();

            callback(null, response || "Refresh success");
        };
        var error = function() {

            // Remove authorisation tokens
            delete $localStorage.user.accessToken;
            delete $localStorage.user.refreshToken;
            delete $localStorage.user.expiresIn;
        };

        // HTTP request
        if($localStorage.settings && $localStorage.settings.auth_separate)
            $http({

            method: self._POST,
            url: self._auth_server() + 'refresh',
            data: data,
            headers: {
                'Authorization': 'Basic ' + Base64.encode(user.clientId + ':' + user.clientSecret)
            }

        }).then(function(response) {

            success(response);

        }, function(response){

            callback(response.status, response.data || "Refresh failed");
            error();
        });

        // Teocli (websocket) request
        else teocli.auth("", self._POST, "refresh",
            JSON.stringify(data),
            "Authorization: Basic " + Base64.encode(user.clientId + ':' + user.clientSecret),
            self._ws_timeout, function(err, response) {

            console.log("teocli.auth refresh:", err, response);
            if(self._check_error(err, response, callback)) error();
            else success(response);
        });

//        request.post(config.authServerUrl + 'refresh', {
//            json: {
//                'refreshToken': user.refreshToken
//            },
//            auth: {
//                'user': user.clientId,
//                'pass': user.clientSecret
//            }
//        }, self._response(function (err, data) {
//            if (err && err === 401) {
//                // если ошибка авторизации, то сносим токены
//                user = storage.get();
//                user.accessToken = null;
//                user.refreshToken = null;
//                user.expiresIn = null;
//                storage.save(user);
//            }
//
//            if (err) {
//                self.emit('refreshError', err);
//            }
//
//            if (typeof callback === 'function') {
//                callback(err, data);
//            }
//
//        }));
    };

    /**
     *
     * Restore (retrieve) user password
     *
     * @param {type} email
     * @param {type} callback
     * @returns {undefined}
     */
    User.prototype.restore = function(email, callback) {

        var self = this;

        self._checkClient(function (err) {

            var user = $localStorage.user;
            var data = self._encrypt({email: email}, user.clientKey);
            var success = function(response) {

                // Decrypt response data and extend user storage
                //var dec = self._decrypt(response.data.data, $localStorage.user.clientKey);
                //angular.extend($localStorage.user, JSON.parse(dec.toString()));
                callback(null, response || "Refresh success");
            };
            var error = function() {

                // Do something ....
            };

            if (err) {
                callback(err);
                return;
            }

            // HTTP request
            if($localStorage.settings && $localStorage.settings.auth_separate)
                $http({

                method: self._POST,
                url: self._auth_server() + 'restore',
                data: data,
                headers: {
                    'Authorization': 'Basic ' + Base64.encode(user.clientId + ':' + user.clientSecret)
                }

            }).then(function(response) {

                success(response);

            }, function(response){

                callback(response.status, response.data || "Retrieve failed");
                error();
            });

            // Teocli (websocket) request
            else teocli.auth("", self._POST, "restore",
                JSON.stringify(data),
                "Authorization: Basic " + Base64.encode(user.clientId + ':' + user.clientSecret),
                self._ws_timeout, function(err, response) {

                console.log("teocli.auth retrieve:", err, response);
                if(self._check_error(err, response, callback)) error();
                else success(response);
            });
        });
    };

    /**
     * Update user info
     *
     * @param {type} username
     * @param {type} callback
     * @returns {undefined}
     */
    User.prototype.changeUsername = function(username, callback) {

        var self = this;

        self._checkClient(function (err) {

            var data = { username: username };
            var success = function(response) {

                // Decrypt response data and extend user storage
                //var dec = self._decrypt(response.data.data, $localStorage.user.clientKey);
                //angular.extend($localStorage.user, JSON.parse(dec.toString()));
                callback(null, response || "Change name success");
            };
            var error = function() {

                // Do something ....
            };

            if (err) {
                callback(err);
                return;
            }

            self._checkRefresh(function() {

                var user = $localStorage.user;
                var URL = 'change-username';

                // HTTP request
                if($localStorage.settings && $localStorage.settings.auth_separate)
                    $http({

                    method: self._POST,
                    url: self._auth_server() + URL,
                    data: data,
                    headers: {
                        'Authorization': 'Bearer ' + user.accessToken
                    }

                }).then(function(response) {

                    success(response);

                }, function(response){

                    callback(response.status, response.data || "Change name failed");
                    error();
                });

                // Teocli (websocket) request
                else teocli.auth("", self._POST, URL,
                    JSON.stringify(data),
                    "Authorization: Bearer " + user.accessToken,
                    self._ws_timeout, function(err, response) {

                    console.log("teocli.auth.changeUsername:", err, response);
                    if(self._check_error(err, response, callback)) error();
                    else success(response);
                });
            });
        });
    };

    /**
     * Change user password
     *
     * @param {type} password
     * @param {type} passwordNew
     * @param {type} callback
     * @returns {undefined}
     */
    User.prototype.changeUserpassword = function(password, passwordNew, callback) {

        var self = this;

        self._checkClient(function (err) {

            var success = function(response) {

                // Decrypt response data and extend user storage
                //var dec = self._decrypt(response.data.data, $localStorage.user.clientKey);
                //angular.extend($localStorage.user, JSON.parse(dec.toString()));
                callback(null, response || "Change password success");
            };
            var error = function() {

                // Do something ....
            };

            if (err) {
                callback(err);
                return;
            }

            self._checkRefresh(function() {

                var URL = 'change-password';
                var user = $localStorage.user;
                var data = self._encrypt({
                    current: CryptoJS.SHA512(password).toString(),
                    new: CryptoJS.SHA512(passwordNew).toString()
                }, user.clientKey);

                // HTTP request
                if($localStorage.settings && $localStorage.settings.auth_separate)
                    $http({

                    method: self._POST,
                    url: self._auth_server() + URL,
                    data: data,
                    headers: {
                        'Authorization': 'Bearer ' + user.accessToken
                    }

                }).then(function(response) {

                    success(response);

                }, function(response){

                    callback(response.status, response.data || "Change password failed");
                    error();
                });

                // Teocli (websocket) request
                else teocli.auth("", self._POST, URL,
                    JSON.stringify(data),
                    "Authorization: Bearer " + user.accessToken,
                    self._ws_timeout, function(err, response) {

                    console.log("teocli.auth.changeUserpassword:", err, response);
                    if(self._check_error(err, response, callback)) error();
                    else success(response);
                });
            });
        });
    };

    return User;
})

.factory('authTeocliRequests', function(dataTeocli) {

    return {

        /**
         * Request user info
         *
         * @param {string} name Clients accessToken
         * @returns {undefined}
         */
        send_user_info_request: function(name) {

            console.log("ClientsController.send_user_info_request", name);

            if(teocli !== undefined)
                teocli.send('{ "cmd": 132, "to": "' + dataTeocli.auth + '", "data": ["' + name + '"] }');
        },

        /**
         * Request clients info
         *
         * @param {type} client
         * @returns {undefined}
         */
        send_client_info_request: function(client) {

            console.log("ClientsController.send_client_info_request", name);

            if(teocli !== undefined)
                teocli.send('{ "cmd": 134, "to": "' + dataTeocli.auth + '", "data": ["' + client + '"] }');
        }
    
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
