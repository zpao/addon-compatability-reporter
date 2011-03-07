/**
 * The compatibility reporter component
 */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

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
        this.version = "0.1";
        this.ConsoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
        this.prefsGlobal = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch(null);
        /* Firefox */
        this.CHECK_COMPATIBILITY_PREFS = ["extensions.checkCompatibility",
                                          "extensions.checkCompatibility.3.6b",
                                          "extensions.checkCompatibility.3.6",
                                          "extensions.checkCompatibility.3.6p",
                                          "extensions.checkCompatibility.3.6pre",
                                          "extensions.checkCompatibility.3.7a",
                                          "extensions.checkCompatibility.4.0b",
                                          "extensions.checkCompatibility.4.0pre",
                                          "extensions.checkCompatibility.4.0p",
                                          "extensions.checkCompatibility.4.0",
                                          "extensions.checkCompatibility.5.0a",
                                          "extensions.checkCompatibility.5.0b",
                                          "extensions.checkCompatibility.5.0pre",
                                          "extensions.checkCompatibility.5.0p"]; // remember to also add to chrome/content/model/acr.js

        var info = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
        this.debug("We are in: "+info.name+" version "+info.version);

        var cversion = info.version.replace(/^([^\.]+\.[0-9]+[a-z]*).*/gi, "$1");
        this.debug("This version uses compatibility pref 'extensions.checkCompatibility." + cversion + "'");

        if (info.name == "Thunderbird")
        {
            /* Thunderbird */
            this.CHECK_COMPATIBILITY_PREFS = ["extensions.checkCompatibility",
                                             "extensions.checkCompatibility.3.0",
                                             "extensions.checkCompatibility.3.1p",
                                             "extensions.checkCompatibility.3.1pre",
                                             "extensions.checkCompatibility.3.1a",
                                             "extensions.checkCompatibility.3.1b",
                                             "extensions.checkCompatibility.3.1", 
                                             "extensions.checkCompatibility.3.3p",
                                             "extensions.checkCompatibility.3.3pre",
                                             "extensions.checkCompatibility.3.3a",
                                             "extensions.checkCompatibility.3.3b",
                                             "extensions.checkCompatibility.3.3"]; // remember to also add to chrome/content/model/acr.js
        }
        else if (info.name == "SeaMonkey")
        {
            /* SeaMonkey */
            this.CHECK_COMPATIBILITY_PREFS = ["extensions.checkCompatibility",
                                              "extensions.checkCompatibility.2.0",
                                              "extensions.checkCompatibility.2.1p",
                                              "extensions.checkCompatibility.2.1pre",
                                              "extensions.checkCompatibility.2.1a",
                                              "extensions.checkCompatibility.2.1b",
                                              "extensions.checkCompatibility.2.1"]; // remember to also add to chrome/content/model/acr.js
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
      if (this.prefsGlobal.getBoolPref("extensions.acr.firstrun") == false)
      {
          this._disableCheckCompatibilityPrefs();
      }
    },

    _disableCheckCompatibilityPrefs : function acr_disableCheckCompatibilityPrefs()
    {
        // disable compatibility checks every time EXCEPT first run (which takes place in acr.js)

        for (var i=0; i<this.CHECK_COMPATIBILITY_PREFS.length; i++)
        {
            try
            {
                this.debug("Setting compatibility pref '"+this.CHECK_COMPATIBILITY_PREFS[i]+"' to 'false'.");

                if (this.prefsGlobal.prefHasUserValue(this.CHECK_COMPATIBILITY_PREFS[i]) &&
                    this.prefsGlobal.getPrefType(this.CHECK_COMPATIBILITY_PREFS[i]) != 128)
                {
                    this.debug("Clearing non-boolean compatibility pref '" + this.CHECK_COMPATIBILITY_PREFS[i] + "'");
                    this.prefsGlobal.clearUserPref(this.CHECK_COMPATIBILITY_PREFS[i]);
                }

                this.prefsGlobal.setBoolPref(this.CHECK_COMPATIBILITY_PREFS[i], false);
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
      var debugOn = (this.prefsGlobal.getBoolPref("extensions.acr.debug") == true)
      if (debugOn) {
        dump("ACR: " + str + "\n");
        this.ConsoleService.logStringMessage("ACR: " + str);
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
