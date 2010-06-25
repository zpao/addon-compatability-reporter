/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Add-on Compatibility Reporter.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): Brian King <brian (at) briks (dot) si>
 *                 David McNamara
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

ACR = new function() {}

ACR.Controller = new function() {}
ACR.RPC = new function() {}

ACR.FIRSTRUN_LANDING_PAGE = "https://%%AMO_HOST%%/pages/compatibility_firstrun";
ACR.EM_ID = "compatibility@addons.mozilla.org";

/* Firefox */
ACR.CHECK_COMPATIBILITY_PREFS_FB = ["extensions.checkCompatibility",
                                 "extensions.checkCompatibility.3.6b",
                                 "extensions.checkCompatibility.3.6",
                                 "extensions.checkCompatibility.3.6p",
                                 "extensions.checkCompatibility.3.6pre",
                                 "extensions.checkCompatibility.3.7a"]; // remember to also add to components.acrService.js

/* Thunderbird */
ACR.CHECK_COMPATIBILITY_PREFS_TB = ["extensions.checkCompatibility",
                                    "extensions.checkCompatibility.3.0",
                                    "extensions.checkCompatibility.3.1p",
                                    "extensions.checkCompatibility.3.1pre",
                                    "extensions.checkCompatibility.3.1a",
                                    "extensions.checkCompatibility.3.1b",
                                    "extensions.checkCompatibility.3.1"]; // remember to also add to components.acrService.js

ACR.submitReport = function(addon, stillWorks, details, includeOtherAddons, callback)
{
    ACR.Logger.debug("In ACR.submitReport()");

    var submitReport = function(installedExtensions)
    {
        details = details.trim();

        var otherAddons = [];

        for (var i=0; i<installedExtensions.length; i++)
        {
            otherAddons.push([installedExtensions[i].id, installedExtensions[i].version]);
        }

        var envInfo = ACR.Util.getHostEnvironmentInfo();

        var internalCallback = function(event)
        {
            if (!event.isError())
            {
                addon.state = (stillWorks ? 1 : 2);
                ACR.Factory.saveAddon(addon);
            }

            callback(event);
        }

        ACR.getService().submitReport(
            addon.guid,
            addon.version,
            stillWorks,
            envInfo.appGUID,
            envInfo.appVersion,
            envInfo.appBuildID,
            envInfo.osVersion,
            details,
            otherAddons,
            internalCallback
        );
    };

    if (includeOtherAddons)
    {
        ACR.Util.getInstalledExtensions(submitReport);
    }
    else
    {
        submitReport([]);
    }
}

ACR.disableAddon = function(addon)
{
    try
    {
        Components.utils.import("resource://gre/modules/AddonManager.jsm");

        AddonManager.getAddonByID(addon.guid, function(addon)
        {
            if (addon)
                addon.userDisabled = true;
        });
    }
    catch (e)
    {
        // Legacy EM stuff
        var em = Components.classes["@mozilla.org/extensions/manager;1"]
            .getService(Components.interfaces.nsIExtensionManager);

        em.disableItem(addon.guid);
    }
}

ACR.getService = function()
{
    if (!this._service)
    {
        this._service = new ACR.RPC.Service();
        this._service.registerLogger(ACR.Logger);
    }

    return this._service;
}

ACR.checkForApplicationUpgrade = function()
{
    var versionRE = /(\d\.\d)(\.\d)?(([ab])\d.*)?/;

    var env = ACR.Util.getHostEnvironmentInfo()
    var currAppVersion = env.appVersion;
    var currAppVersionParts = currAppVersion.match(versionRE);

    var resetCompatibilityInformation = function()
    {
        ACR.Logger.info("Detected (non-beta) major application upgrade; cleared previous compatibility information.");
        ACR.Preferences.setPreference("previousApplicationVersion", currAppVersion);
        ACR.Preferences.setPreference("addons", "");
        //ACR.disableCheckCompatibilityPrefs();
    };

    if (currAppVersionParts)
    {
        ACR.Logger.debug("Current application version '" + currAppVersion + "' is major version '" + currAppVersionParts[1] + "', minor version '" + currAppVersionParts[2] + "'. "  + (currAppVersionParts[3]?"This version is " + (currAppVersionParts[4]=="b"?"BETA":"ALPHA") + ", labelled '" + currAppVersionParts[3] + "'.":""));
    }
    else
    {
        ACR.Logger.error("Unrecognized current application version '" + currAppVersion  + "'.");
        return;
    }

    var prevAppVersion = ACR.Preferences.getPreference("previousApplicationVersion");
    var prevAppVersionParts = prevAppVersion.match(versionRE);

    if (!prevAppVersionParts)
    {
        ACR.Logger.warn("Unrecognized previous application version '" + prevAppVersion  + "'.");
        resetCompatibilityInformation();
        return;
    }
    else
    {
        ACR.Logger.debug("Previous application version '" + prevAppVersion + "' was major version '" + prevAppVersionParts[1] + "', minor version '" + prevAppVersionParts[2] + "'. "  + (prevAppVersionParts[3]?"This version was " + (prevAppVersionParts[4]=="b"?"BETA":"ALPHA") + ", labelled '" + prevAppVersionParts[3] + "'.":""));
    }

    // check for major version upgrade
    if (currAppVersionParts[1] != prevAppVersionParts[1])
    {
        resetCompatibilityInformation();
        return;
    }

    // check for upgrade from or to alpha
    if (currAppVersionParts[4] == "a" || prevAppVersionParts[4] == "a")
    {
        resetCompatibilityInformation();
        return;
    }

    // don't reset on betas: https://bugzilla.mozilla.org/show_bug.cgi?id=527249

}

ACR.firstrun = function()
{
    if (ACR.Preferences.getPreference("firstrun") == true)
    {
        ACR.Preferences.setPreference("firstrun", false);
        ACR.disableCheckCompatibilityPrefs();
    }
}

ACR.disableCheckCompatibilityPrefs = function()
{
    ACR.Logger.debug("Disabling all checkCompatibility preferences.");
    var checkCompatibilityPrefs = (ACR.Util.getAppName() == "Thunderbird") ? ACR.CHECK_COMPATIBILITY_PREFS_TB : ACR.CHECK_COMPATIBILITY_PREFS_FB;

    try
    {
        for (var i=0; i<checkCompatibilityPrefs.length; i++)
        {
            if (ACR.Preferences.globalHasUserValue(checkCompatibilityPrefs[i]))
            {
                var previous = ACR.Preferences.getGlobalPreference(checkCompatibilityPrefs[i]);
                ACR.Preferences.setBoolGlobalPreference(checkCompatibilityPrefs[i] + ".previous", previous);

                ACR.Logger.debug("Compatibility pref '" + checkCompatibilityPrefs[i] + "' was previously set as '" + previous + "'. Saving this pref in '" + checkCompatibilityPrefs[i] + ".previous'");
            }
            else
            {
                ACR.Logger.debug("Compatibility pref '" + checkCompatibilityPrefs[i] + "' was not previously set.");
            }

            ACR.Logger.debug("Setting compatibility pref '" + checkCompatibilityPrefs[i] + "' to 'false'.");
            ACR.Preferences.setBoolGlobalPreference(checkCompatibilityPrefs[i], false);
        }
    }
    catch (e)
    {
        ACR.Logger.warn("Could not set a checkCompatibility pref: " + e);
    }
}

ACR.lastrun = function()
{
    var checkCompatibilityPrefs = (ACR.Util.getAppName() == "Thunderbird") ? ACR.CHECK_COMPATIBILITY_PREFS_TB : ACR.CHECK_COMPATIBILITY_PREFS_FB;

    try
    {
        for (var i=0; i<checkCompatibilityPrefs.length; i++)
        {
            if (ACR.Preferences.globalHasUserValue(checkCompatibilityPrefs[i]+".previous"))
            {
                var previous = ACR.Preferences.getGlobalPreference(checkCompatibilityPrefs[i]+".previous", true);
                ACR.Preferences.setBoolGlobalPreference(checkCompatibilityPrefs[i], previous);
                ACR.Preferences.clearGlobalPreference(checkCompatibilityPrefs[i]+".previous");

                ACR.Logger.debug("Resetting compatibility pref '" + checkCompatibilityPrefs[i] + "' to previous value '" + previous + "'.");
            }
            else
            {
                ACR.Preferences.clearGlobalPreference(checkCompatibilityPrefs[i]);

                ACR.Logger.debug("Compatibility pref '" + checkCompatibilityPrefs[i] + "' had no previous value - have cleared this pref.");
            }
        }
    }
    catch (e)
    {
        ACR.Logger.warn("Could not reset a checkCompatibility pref: " + e);
    }

    ACR.Preferences.setPreference("firstrun", true);
}

ACR.registerUninstallObserver = function()
{
    if (ACR._uninstallObserverRegistered) return;

    try
    {
        Components.utils.import("resource://gre/modules/AddonManager.jsm");

        var listener = {
            onUninstalling: function(addon) { if (addon.id == ACR.EM_ID) ACR.lastrun(); },
            onOperationCancelled: function(addon) { if (addon.id == ACR.EM_ID) ACR.firstrun(); },
            onUninstalled: function(addon) { ACR.Logger.debug("addon '" + addon.id + "' is uninstalled"); },
            onDisabling: function(addon) { ACR.Logger.debug("addon '" + addon.id + "' is disabling"); },
            onDisabled: function(addon) { ACR.Logger.debug("addon '" + addon.id + "' is disabled"); },
        };

        AddonManager.addAddonListener(listener);
        ACR._uninstallObserverRegistered = true;
    }
    catch (e)
    {
        return ACR.registerUninstallObserverLegacyEM();
    }
}

ACR.registerUninstallObserverLegacyEM = function()
{
    var action =
    {
        observe: function (subject, topic, data)
        {
            if ((subject instanceof Components.interfaces.nsIUpdateItem)
                &&
                (subject.id == ACR.EM_ID))
            {
                if (data == "item-uninstalled")
                    ACR.lastrun();
                else if (data == "item-cancel-action")
                    ACR.firstrun();
            }
        }
    };

    var observer = 
    {
        onAssert: function (ds, subject, predicate, target)
        {
            if ((predicate.Value == "http://www.mozilla.org/2004/em-rdf#toBeUninstalled")
                    &&
                    (target instanceof Components.interfaces.nsIRDFLiteral)
                    &&
                    (target.Value == "true")
                    &&
                    (subject.Value == "urn:mozilla:extension:" + ACR.EM_ID))
            {
                ACR.lastrun();
            }
        },
        onUnassert: function (ds, subject, predicate, target) {},
        onChange: function (ds, subject, predicate, oldtarget, newtarget) {},
        onMove: function (ds, oldsubject, newsubject, predicate, target) {},
        onBeginUpdateBatch: function() {},
        onEndUpdateBatch: function() {}
    };

    var extService = Components.classes["@mozilla.org/extensions/manager;1"]
        .getService(Components.interfaces.nsIExtensionManager);

    if (extService && ("uninstallItem" in extService))
    {
        var observerService = Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService);
        observerService.addObserver(action, "em-action-requested", false);
        ACR._uninstallObserverRegistered = true;
    }
    else
    {
        try
        {
            extService.datasource.AddObserver(observer);
            ACR._uninstallObserverRegistered = true;
        }
        catch (e) { }
    }
}

