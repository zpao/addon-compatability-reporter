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

top.ACR = new function() {}

ACR.Controller = new function() {}
ACR.RPC = new function() {}

ACR.FIRSTRUN_LANDING_PAGE = "https://%%AMO_HOST%%/pages/compatibility_firstrun";
ACR.EM_ID = "compatibility@addons.mozilla.org";

ACR.submitReport = function(addon, stillWorks, details, includeOtherAddons, callback)
{
    ACR.Logger.debug("In ACR.submitReport()");

    details = details.trim();

    var otherAddons = [];

    if (includeOtherAddons)
    {
        var installedExtensions = ACR.Util.getInstalledExtensions();

        for (var i=0; i<installedExtensions.length; i++)
        {
            otherAddons.push([installedExtensions[i].id, installedExtensions[i].version]);
        }
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
        stillWorks,
        envInfo.appGUID,
        envInfo.appVersion,
        envInfo.appBuildID,
        envInfo.osVersion,
        details,
        otherAddons,
        internalCallback
    );
}

ACR.disableAddon = function(addon)
{
    var em = Components.classes["@mozilla.org/extensions/manager;1"]
        .getService(Components.interfaces.nsIExtensionManager);

    em.disableItem(addon.guid);
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
    var env = ACR.Util.getHostEnvironmentInfo()
    var appString = env.appName + " " + env.appVersion;

    if (ACR.Preferences.getPreference("previousApplicationVersion") != appString)
    {
        ACR.Logger.info("Detected an application upgrade (previous was '" + ACR.Preferences.getPreference("previousApplicationVersion") + "', current is '" + appString + "'), clearing addon states.");
        ACR.Preferences.setPreference("previousApplicationVersion", appString);
        ACR.Preferences.setPreference("addons", "");
    }
}

ACR.firstrun = function()
{
    var previousCheckCompatibilityPreference = ACR.Preferences.getGlobalPreference("extensions.checkCompatibility", true);

    if (previousCheckCompatibilityPreference == null)
        previousCheckCompatibilityPreference = true;

    ACR.Preferences.setPreference("previousCheckCompatibility", previousCheckCompatibilityPreference);

    var prefSvc = Components.classes["@mozilla.org/preferences-service;1"].
        getService(Components.interfaces.nsIPrefService);

    prefSvc.setBoolPref("extensions.checkCompatibility", false);
}

ACR.lastrun = function()
{
    ACR.Preferences.setGlobalPreference("extensions.checkCompatibility", ACR.Preferences.getPreference("previousCheckCompatibility"));
}

ACR.registerUninstallObserver = function()
{
    if (ACR._uninstallObserverRegistered) return;

    var action =
    {
        observe: function (subject, topic, data)
        {
            if ((data == "item-uninstalled")
                &&
                (subject instanceof Components.interfaces.nsIUpdateItem)
                &&
                (subject.id == ACR.EM_ID))
            {
                ACR.lastrun();
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

