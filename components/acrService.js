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
        
        Components.utils.import("resource://acr/modules/constants.jsm");

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
