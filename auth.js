
/* global teocli */

'use strict';

angular.module('app.auth', [/*'ngRoute'*/])

//.config([/*'$routeProvider'*/, function(/*$routeProvider*/) {
//  $routeProvider
  
//  // Login
//  .when('/login', {
//    //template: '<widget ng-init="include=\'controllers/auth/login.html\'" />',
//    templateUrl: 'controllers/auth/login.html',
//    controller: 'AuthController'
//  })
//  // Registration
//  .when('/register', {
//    //template: '<widget ng-init="include=\'controllers/auth/login.html\'" />',
//    templateUrl: 'controllers/auth/register.html',
//    controller: 'AuthController'
//  })
//  // Restore password
//  .when('/retrieve', {
//    //template: '<widget ng-init="include=\'controllers/auth/login.html\'" />',
//    templateUrl: 'controllers/auth/retrieve.html',
//    controller: 'AuthController'
//  })
//  // Update user info
//  .when('/profile', {
//    //template: '<widget ng-init="include=\'controllers/auth/profile.html\'" />',
//    templateUrl: 'controllers/auth/profile.html',
//    controller: 'AuthController'
//  })
//  // Update user info
//  .when('/main_profile', {
//    //template: '<widget ng-init="include=\'controllers/auth/profile.html\'" />',
//    templateUrl: 'controllers/auth/main_profile.html',
//    controller: 'AuthController'
//  })  
//  // Update user info
//  .when('/profile/:userId', {
//    //template: '<widget ng-init="include=\'controllers/auth/profile.html\'" />',
//    templateUrl: 'controllers/auth/profile.html',
//    controller: 'AuthController'
//  })
//  // Settings
//  .when('/settings', {
//    //template: '<widget ng-init="include=\'controllers/auth/settings.html\'" />',
//    templateUrl: 'controllers/auth/settings.html',
//    controller: 'AuthController'
//  })
//  // Change user password
//  .when('/change', {
//    //template: '<widget ng-init="include=\'controllers/auth/change.html\'" />',
//    templateUrl: 'controllers/auth/change.html',
//    controller: 'AuthController'
//  })
//  ;
//}])

.controller('AuthController', function ($scope, $rootScope, $localStorage, 
    $stateParams, $location, $timeout, initTeocli, authTeocli, 
    authTeocliRequests, dataTeocli, onotherTeocli) {

    console.log('AuthController');

    var auth = new authTeocli();
    var WAIT = "Wait ...";
    var PASSWORD_LEN = 7;

    $rootScope.bodylayoutF = false;
    $scope.params = $stateParams;
    
    $scope.authErrorTxt = $scope.authInfoTxt = "";

    // Sew widget title and footer
    if($location.path().startsWith("/profile")) {
        $rootScope.include_foot = 'controllers/auth/profile_footer.html';
        $rootScope.widgetTitle = 'Profile';
    }    
    else if($location.path() === "/change") {
        $rootScope.include_foot = 'controllers/auth/change_footer.html';
        $rootScope.widgetTitle = 'Change password';
    }
    else if($location.path() === "/settings") {
        $rootScope.include_foot = 'controllers/auth/settings_footer.html';
        $rootScope.widgetTitle = 'Settings';
    }
    else {
        $rootScope.bodylayoutF = true;
        $rootScope.include_foot = "";
    }
    
    // Initialize view as modal auth window
    if($rootScope.bodylayoutF) $rootScope.bodylayout = 'modal-open';
    $scope.authErrorF = false;
    $scope.authInfoF = false;
    
    // Destroy view
    $rootScope.$on('$locationChangeStart', function() {
        $rootScope.bodylayout = '';
    });

    if($scope.user === undefined) $scope.user = {};
    
    // Get saved to local storage users fields
    if($localStorage.settings && $localStorage.settings.rememberMe) {
        if($localStorage.settings.password)
            $scope.password = atob($localStorage.settings.password);
        $scope.user.rememberMe = $localStorage.settings.rememberMe;
        $scope.user.email = $localStorage.settings.email;
        $scope.user.password = $scope.password;
    }
    
    // Get saved user info
    if(!$scope.params.userId && $localStorage.user) {
        $scope.user.user_email = $localStorage.user.email;
        $scope.user_name = $localStorage.user.username; 
        $scope.user.userId = $localStorage.user.userId;
        $scope.user.user_name = $scope.user_name;
        $scope.readyToShow = true;
    } 
    
    // Hide info after 10 sec timeout
    var _hideAuthT = undefined;
    var _hideAuthInfoCancel = function() {
        if(_hideAuthT !== undefined) {
            console.log('AuthController:$timeout cancel', _hideAuthT);
            $timeout.cancel(_hideAuthT);
        }        
    };
    var _hideAuthInfo = function() {
        
        _hideAuthInfoCancel();
        
        _hideAuthT = $timeout(function() {            
            console.log('AuthController:$timeout execute', _hideAuthT);
            $scope.authInfoF = false;
            $scope.$apply();
        }, 10000);
        console.log('AuthController:$timeout start', _hideAuthT);
    };    

    /**
     * Login form processing
     *
     * @returns {undefined}
     */
    $scope.login = function() {

        console.log('AuthController:login', $scope.user);

        $scope.authInfoF = true;
        $scope.authErrorF = false;
        $scope.authInfoTxt = WAIT;
        $scope.authInfoSplash = true;

        // Save to local storage
        if($scope.user.rememberMe) {

            // Update login settings
            if(!$localStorage.settings) $localStorage.settings = {};
            $localStorage.settings.rememberMe = $scope.user.rememberMe;
            $localStorage.settings.email = $scope.user.email;
            $localStorage.settings.password = btoa($scope.user.password);
        }
        else {

            // Remove login settings
            var settings = $localStorage.settings;
            if(settings) {
                delete settings.rememberMe;
                delete settings.email;
                delete settings.password;
                $localStorage.settings = settings;
            }
        }

        // On Login user callback
        var onlogin = function(error, data) {

            $scope.authInfoSplash = false;

            if(!error) {

                console.log('Login user success', data);
                
                $scope.authInfoTxt = "Login successfully ...";
                $scope.$apply();
                
                // Update current user name
                auth._updateUserName();

                // Reconnect
                $location.path("/");   
                initTeocli.teocli_reconnect_now = true;
                teocli.ws.close(); // Close connection to reconnect
                $rootScope.$apply();
                $scope.authInfoF = false;
                $scope.authInfoTxt = "";
            }
            else {

                console.log('Login user error', data);
                
                $scope.authInfoF = false;

                if(data === "Unauthorized") {
                    delete $localStorage.user;
                    auth.login($scope.user.email, $scope.user.password, onlogin);
                }
                else {
                    //alert("Login error: " + data);
                    $scope.authErrorF = true;
                    if(data)
                        $scope.authErrorTxt = data.replace(/_/g, " ");
                    else
                        $scope.authErrorTxt = "UDEFINED ERROR";
                    $scope.$apply();
                }
            }
        };

        // Login user
        auth.login($scope.user.email, $scope.user.password, onlogin);
        console.log('Login user success, exit ...');
    };
    
    /**
     * Registration form processing
     * 
     * @returns {undefined}
     */
    $scope.register = function() {
        
        console.log('AuthController:register', $scope);

        $scope.authErrorF = false;

        // Check form data
        if(!$scope.password || $scope.password.length < PASSWORD_LEN) {
            
            //alert("The password is too short");
            $scope.authErrorF = true;
            $scope.authErrorTxt = "The password is too short";
            return;
        }
        if($scope.password !== $scope.password2) {
            
            //alert("Repeat password should be equal to password");
            $scope.authErrorF = true;
            $scope.authErrorTxt = "Repeat password should be equal to password";
            return;
        }
        
        $scope.authInfoF = true;
        $scope.authInfoTxt = WAIT;
        $scope.authInfoSplash = true;
        
        // Register user
        auth.register($scope.email, $scope.password, $scope.user_name, null, 
            function(error, data) {

            console.log("Register user result:", error, data);
            $scope.authInfoSplash = false;

            if(!error) {
                
               console.log('Register User success', data);
               //alert("Registration success");
               $scope.authInfoTxt = "Registration success";
                    
                // Reconnect
                $location.path("/login");   
//                initTeocli.teocli_reconnect_now = true;
//                teocli.ws.close(); // Close connection to reconnect
                $rootScope.$apply();
            } 
            else {
                
                console.log('Register User error', data);                
                //alert("Registration error: "  + data);
                $scope.authInfoF = false;
                $scope.authErrorF = true;
                $scope.authErrorTxt = data.replace(/_/g, " ");
                $scope.$apply();
            }
        });        
    };

    /**
     * Retrieve user password form processing
     * 
     * @returns {undefined}
     */
    $scope.retrieve = function() {

        // \todo: Send auth retrieve command ...
        //alert("TODO: Send auth retrieve command, email: " + $scope.email);
        
        $scope.authErrorF = false;
        
        $scope.authInfoF = true;
        $scope.authInfoTxt = WAIT;
        $scope.authInfoSplash = true;
        
        // Retrieve user password
        auth.restore($scope.email, function(error, data) {

            console.log("Retrieve user password result:", error, data);

            if(!error) {
                
               console.log('Retrieve User password success', data);
               $scope.authInfoSplash = false;
               $scope.authErrorF = false;
               $scope.authInfoF = true;
               $scope.authInfoTxt = 
                    "Mail with retrieve password instruction send to email: " + 
                    $scope.email;
            
               $scope.$apply(); 
                    
            } 
            else {
                
                console.log('Retrieve User password error', data);                
                
                $scope.authInfoF = false;
                $scope.authErrorF = true;
                $scope.authErrorTxt = data.replace(/_/g, " ");
                $scope.$apply();
            }
        });
    };
    
    /**
     * User settings form processing
     * 
     * @returns {undefined}
     */
    $scope.settings = function() {
        
        // TODO: do something
    };
    
    /**
     * Change user password
     * 
     * @param {type} user
     * @returns {undefined}
     */
    $scope.changeUserpassword = function(user) {
        
        $scope.authErrorF = false;
        $scope.authInfoF = false;
        
        // Check form data
        if(!user.password_new || user.password_new.length < PASSWORD_LEN) {
            
            //alert("The password is too short");
            $scope.authErrorF = true;
            $scope.authErrorTxt = "The password is too short";
            return;
        }
        else if(user.password_new !== user.password_new_2) {
            
            $scope.authErrorF = true;
            $scope.authErrorTxt = 
                "The 'New password' field should be equal to the 'Repeat new password' field";
            return;
        }
        
        $scope.authInfoF = true;
        $scope.authInfoTxt = WAIT;
        $scope.authInfoSplash = true;
        
        // TODO: Change user password
        auth.changeUserpassword(user.password, user.password_new, 
            function(error, data) {

            console.log("Change user password result:", error, data);

            if(!error) {
                
               // TODO: Update current user password
               if($localStorage.settings && $localStorage.settings.rememberMe) {

                    $localStorage.settings.password = btoa(user.password_new);
                }

                console.log('Change user password success', data);           
                $scope.authInfoTxt = "Your user password successfully updated";
                $scope.authInfoSplash = false;
                $scope.$apply();    
                
                _hideAuthInfo();
            } 
            else {
                
                console.log('Change user password error', data);                                
                $scope.authInfoF = false;
                $scope.authErrorF = true;
                $scope.authErrorTxt = data.replace(/_/g, " ");
                $scope.$apply();
            }
        });

    };
    
    /**
     * Update user info (profile)
     * 
     * @param {type} user
     * @returns {undefined}
     */
    $scope.changeUsername = function(user) {
        
        //console.log("Change username to", user.user_name);
                
        $scope.authErrorF = false;
        
        $scope.authInfoF = true;
        $scope.authInfoTxt = WAIT;
        $scope.authInfoSplash = true;

        auth.changeUsername(user.user_name, function(error, data) {

            console.log("Change username to \"" + user.user_name + "\" result:", 
                $scope.user.user_name, error, data);

            if(!error) {
                
               console.log('Change Username success', data);
               
               // Update current user name
               $localStorage.user.username =  user.user_name;
               auth._updateUserName();
               
               $scope.authInfoTxt = "Your user info successfully updated";
               $scope.authInfoSplash = false;
               $scope.$apply(); 
               
               _hideAuthInfo();
                    
            } 
            else {
                
                console.log('Change username error', data);                
                
                $scope.authInfoF = false;
                $scope.authInfoSplash = false;
                $scope.authErrorF = true;
                $scope.authErrorTxt = data.replace(/_/g, " ");
                $scope.$apply();
            }
        });
    };
    
    $scope.update = function() {
        console.log('UPDATE!!!!!'+$scope.user_age + $('#user_about').val());
        
        var Image = document.getElementById('user_avatar');
        var data = {
                user_avatar: Image.src,
                user_age: $scope.user_age,
                user_about: $scope.user_about
            };
        teocli.send('{ "cmd": 140, "to": "' + dataTeocli.max + '", "data": "' + data.user_avatar + ',' + data.user_age + ',' + data.user_about/*JSON.stringify(data)*/ + '" }');
        console.log("$scope.update = [ \"" + data + "\" ]");
  
    };
    
    // Init and set reinit event function
    init();
    $scope.$on('teocli-init', init);

    // Stop interval function
    $scope.stopFight = function() {
        
//        if(angular.isDefined(interval)) {
//            $interval.cancel(interval);
//            interval = undefined;            
//        }
        destroy();
    };

    // Stop interval on controller destroy or On teonet close(disconnect) event
    $scope.$on('$destroy', $scope.stopFight);
    $scope.$on('teocli-close', $scope.stopFight);           
    
    /**
     * Set teocli onother callback    
     * 
     * @returns {undefined}
     */
    function init() {
        
        if(teocli !== undefined && initTeocli.teocli_login) {
            
            // Read user info
            if($scope.params.userId) {        
                $scope.user.userId = $scope.params.userId;
                authTeocliRequests.send_user_info_request($scope.params.userId);
            }
    
            onotherTeocli.register(onotherTeocli._onother, onother_func);
        }
    }
    
    /**
     * Free teocli callbacks
     * 
     * @returns {undefined}
     */
    function destroy() {
               
        $rootScope.include_foot = "";
        _hideAuthInfoCancel();
        onotherTeocli.unregister(onotherTeocli._onother, onother_func);
    }    
    
    /**
     * Rooms answer callback function
     * 
     * @param {type} err
     * @param {type} data
     * @returns {undefined}
     */
    function onother_func (err, data) {
        
        var processed = 0;
        
        // Process command #133
        if(data.from === dataTeocli.auth) {
            
            // User info answer
            if (data.cmd === 133) {

                console.log("AuthController.onother_func.1", data);
                
                // Set user parameters
                if(data.data.userId === $scope.user.userId) {
                    $scope.user.user_name = data.data.username;
                    $scope.user.user_email = data.data.email;
                    
                    $scope.readyToShow = true;
                    $scope.$apply();
                }
            }            
        }
        
        return processed;
    }
    
})

.directive('userGroups', function() {
  return {
    restrict: 'AE',
    replace: 'true',
    templateUrl: 'controllers/auth/user_groups.html',
    controller: 'UserGroupsController',
    scope: {
        userId: "=userid"
    }
  };
})

.controller('UserGroupsController', function ($scope, initTeocli, onotherTeocli, 
    dataTeocli) {
    
    $scope.groupsItems = [];
    //$scope.groupsItems = [ { name: "teonet" }, { name: "teonet.admin" }, { name: "liferace" }, { name: "liferace.admin" } ];
    
    console.log('UserGroupsController');

    // Init and set reinit event function
    init();
    $scope.$on('teocli-init', init);

    // Stop interval function
    $scope.stopFight = function() {
        
        if (angular.isDefined(stop)) {
            //$interval.cancel(stop);
            stop = undefined;
        }            
        destroy();
    };

    // Stop interval on controller destroy or On teonet close(disconnect) event
    $scope.$on('$destroy', $scope.stopFight);
    $scope.$on('teocli-close', $scope.stopFight);
    
    /**
     * Set teocli callbacks
     * @returns {undefined}
     */
    function init() {
        
        $scope.groupsItems = [];
        
        if(teocli !== undefined && initTeocli.teocli_login) {

            console.log("UserGroupsController.init.userId =", $scope.userId);

            onotherTeocli.register(onotherTeocli._onother, groups_func);
            
            // Send "get user groups" request command to "teo-auth" peer
            get_user_groups_request($scope.userId);                
        }
    }
    
    /**
     * Free teocli callbacks
     * 
     * @returns {undefined}
     */
    function destroy() {
        
        $scope.groupsItems = [];
        
        if(teocli !== undefined) {
            //new_visites_unsubscribe_request();
        }
        onotherTeocli.unregister(onotherTeocli._onother, groups_func);
    }    
    
    /**
     * Get user groups answer callback function
     * 
     * @param {type} err
     * @param {type} data
     * @returns {undefined}
     */
    function groups_func (err, data) {

        var processed = 0;
        
        // Process command #145
        if(data.from === dataTeocli.auth) {
                    
            // Process command #145 CMD_GET_USER_GROUPS_LIST_ANSWER
            if(data.cmd === 145) {

                //console.log("UserGroupsController.groups_func", data);
                $scope.groupsItems = data.data;
                processed = 1;
            } 
        }
        
        if(processed) {
            $scope.$apply();
            console.log("UserGroupsController.groups_func.processed", data);
        } 
        
        return processed;
    }
    
    /**
     * Send "get user groups" request
     * 
     * @param {type} data
     * @returns {undefined}
     */
    function get_user_groups_request(data) {
        
        console.log("UserGroupsController.get_user_groups_request.data = [ \"" + data + "\" ]");
        
        // Send get users number request
        //console.log("UserGroupsController.get_user_groups_request", '{ "cmd": 144, "to": "' + dataTeocli.auth + '", "data": ["' + data + '"] }');
        teocli.send('{ "cmd": 144, "to": "' + dataTeocli.auth + '", "data": ["' + data + '"] }');
        
    }  

})
;
