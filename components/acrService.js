/**
 * The compatibility reporter component
 */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/AddonManager.jsm");

function acrService()
{
    this.init();
}

acrService.prototype = {
    classDescription: "Add-on Compatibility Reporter Component",
    classID: Components.ID("{19699160-a04c-48a5-b8e4-500f913753fb}"),
    contractID: "@addons.mozilla.org/acrservice;1",

     _xpcom_categories: [{
        category: "app-startup",
        service: true
    }],

    init: function acr_init()
    {
        this.debug("component init");

        this.version = "0.1";
        this.ConsoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
        this.prefsGlobal = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch(null);
        
        Components.utils.import("resource://acr/modules/Constants.jsm");

        /* Firefox */
        this.CHECK_COMPATIBILITY_PREFS = COMPATIBILITY_PREFS_FX;

        var info = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
        this.debug("We are in: "+info.name+" version "+info.version);

        var cversion = info.version.replace(/^([^\.]+\.[0-9]+[a-z]*).*/gi, "$1");
        this.debug("This version uses compatibility pref 'extensions.checkCompatibility." + cversion + "'");

        if (info.name == "Thunderbird")
        {
            /* Thunderbird */
            this.CHECK_COMPATIBILITY_PREFS = COMPATIBILITY_PREFS_TB;
        }
        else if (info.name == "SeaMonkey")
        {
            /* SeaMonkey */
            this.CHECK_COMPATIBILITY_PREFS = COMPATIBILITY_PREFS_SM;
        }
    },

    // Observer Service
    __observerSvc: null,
    get _observerSvc() {
      if (!this.__observerSvc)
        this.__observerSvc =
          Components.classes["@mozilla.org/observer-service;1"].
          getService(Components.interfaces.nsIObserverService);
      return this.__observerSvc;
    },

    // nsIObserver
    observe: function acr_observe(subject, topic, data) {
      switch(topic) {
        case "profile-after-change":
          this._observerSvc.addObserver(this, "final-ui-startup", true);
          break;
        case "app-startup":
          this._observerSvc.addObserver(this, "final-ui-startup", true);
          break;
        case "final-ui-startup": 
          this._observerSvc.removeObserver(this, "final-ui-startup");
          this._onAppStartup();
          break;
      }
    },

    _onAppStartup : function acr_onAppStartup()
    {
      this.debug("final-ui-startup");

      this._disableCheckCompatibilityPrefs();

      //return; // for now -- see bug 572322

      if (this.prefsGlobal.getBoolPref("extensions.acr.postinstall") === true)
      {
          me = this;
          me.debug("In postinstall - will shutdown addonRepository and restart the application");

          Components.utils.import("resource://gre/modules/AddonRepository.jsm");
          Components.utils.import("resource://gre/modules/Services.jsm");

          var observer = {
              observe: function (aSubject, aTopic, aData) {
                  if (aTopic == "addon-repository-shutdown") {
                      me.debug("In postinstall - received addon-repository-shutdown notification");

                      Services.obs.removeObserver(this, "addon-repository-shutdown");

                      me.prefsGlobal.setBoolPref("extensions.acr.postinstall", false);
                      var boot = Components.classes["@mozilla.org/toolkit/app-startup;1"].getService(Components.interfaces.nsIAppStartup);
                      boot.quit(Components.interfaces.nsIAppStartup.eForceQuit|Components.interfaces.nsIAppStartup.eRestart);
                  }
              },
          };

          Services.obs.addObserver(observer, "addon-repository-shutdown", false);
          AddonRepository.shutdown();
      }

    },

    _disableCheckCompatibilityPrefs : function acr_disableCheckCompatibilityPrefs()
    {
        var compatByDefault = ("strictCompatibility" in AddonManager) &&
                              !AddonManager.strictCompatibility;
        if (compatByDefault)
          this.debug("Compatible-by-default is enabled; compatibility checking will not be disabled");

        // disable all compatibility checks 
        // if this is firstrun, saves any previous compatibility info for future restore

        for (var i=0; i<this.CHECK_COMPATIBILITY_PREFS.length; i++)
        {
            try
            {
                // fix up any mis-configured compat. prefs

                if (this.prefsGlobal.prefHasUserValue(this.CHECK_COMPATIBILITY_PREFS[i]) &&
                    this.prefsGlobal.getPrefType(this.CHECK_COMPATIBILITY_PREFS[i]) != 128)
                {
                    this.debug("Clearing non-boolean compatibility pref '" + this.CHECK_COMPATIBILITY_PREFS[i] + "'");
                    this.prefsGlobal.clearUserPref(this.CHECK_COMPATIBILITY_PREFS[i]);
                }

                // save previous compat. prefs

                // using different pref, for now -- see bug 572322
                //if (this.prefsGlobal.getBoolPref("extensions.acr.postinstall") == true)
                if (this.prefsGlobal.getBoolPref("extensions.acr.firstrun") == true && !compatByDefault)
                {
                    if (this.prefsGlobal.prefHasUserValue(this.CHECK_COMPATIBILITY_PREFS[i]))
                    {
                        var previous = this.prefsGlobal.getBoolPref(this.CHECK_COMPATIBILITY_PREFS[i]);
                        this.prefsGlobal.setBoolPref(this.CHECK_COMPATIBILITY_PREFS[i] + ".previous", previous);

                        this.debug("Compatibility pref '" + this.CHECK_COMPATIBILITY_PREFS[i] + "' was previously set as '" + previous + "'. Saving this pref in '" + this.CHECK_COMPATIBILITY_PREFS[i] + ".previous'");
                    }
                    else
                    {
                        this.debug("Compatibility pref '" + this.CHECK_COMPATIBILITY_PREFS[i] + "' was not previously set");
                    }
                }

                if (compatByDefault) {
                  // Don't disable compatibility checking when compatible-by-default is enabled.
                  if (this.prefsGlobal.prefHasUserValue(this.CHECK_COMPATIBILITY_PREFS[i])) {
                    this.debug("Resetting compatibility pref '" + this.CHECK_COMPATIBILITY_PREFS[i] + "'");
                    this.prefsGlobal.clearUserPref(this.CHECK_COMPATIBILITY_PREFS[i]);
                  }
                }
                else
                {
                  // turn off this compatilibilty pref

                  this.debug("Setting compatibility pref '" + this.CHECK_COMPATIBILITY_PREFS[i] + "' to 'false'");
                  this.prefsGlobal.setBoolPref(this.CHECK_COMPATIBILITY_PREFS[i], false);
                }
            }
            catch (e)
            {
                this.debug("Could not set a checkCompatibility pref: " + e);
            }
        }
    },

    // for debugging
    debug : function acr_dump(str)
    {
      try
      {
          var debugOn = (this.prefsGlobal.getBoolPref("extensions.acr.debug") == true)
          if (debugOn) {

            var date = new Date();
            datestr = " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "." + date.getMilliseconds();

            dump("ACR (Component)"+datestr+": " + str + "\n");
            this.ConsoleService.logStringMessage("ACR (Component)"+datestr+": " + str);
          }
      }
      catch (e)
      {
          dump("ACR (Component): " + str + "\n");
      }
    },

    QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsISupportsWeakReference, Components.interfaces.nsIObserver])

};

let components = [acrService];

/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule(components);
