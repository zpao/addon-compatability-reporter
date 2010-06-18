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
    classID: Components.ID("19699160-a04c-48a5-b8e4-500f913753fb"),
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
                                          "extensions.checkCompatibility.3.7a"]; // remember to also add to chrome/content/model/acr.js
        var info = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
        this.debug("We are in: "+info.name);
        if (info.name == "Thunderbird")
        {
            /* Thunderbird */
            this.CHECK_COMPATIBILITY_PREFS = ["extensions.checkCompatibility",
                                             "extensions.checkCompatibility.3.0",
                                             "extensions.checkCompatibility.3.1p",
                                             "extensions.checkCompatibility.3.1pre",
                                             "extensions.checkCompatibility.3.1a",
                                             "extensions.checkCompatibility.3.1b",
                                             "extensions.checkCompatibility.3.1"]; // remember to also add to components.acrService.js
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
      try
      {
        for (var i=0; i<this.CHECK_COMPATIBILITY_PREFS.length; i++)
        {
          this.debug("Setting compatibility pref '"+this.CHECK_COMPATIBILITY_PREFS[i]+"' to 'false'.");
          this.prefsGlobal.setBoolPref(this.CHECK_COMPATIBILITY_PREFS[i], false);
        }
      }
      catch (e)
      {
        this.debug("Could not set a checkCompatibility pref: " + e);
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

function NSGetModule(compMgr, fileSpec)
{
  return XPCOMUtils.generateModule(components);
}
