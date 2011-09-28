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
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): David McNamara
 *                 Brian King
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

var EXPORTED_SYMBOLS = ["getHostEnvironmentInfo", "getAppName", "getFullApplicationString", "getFullOSString",
    "dumpObject", "getInstalledExtensions", "getLocalStorageForOrigin", "getMostRecentAppWindow"];

var Cc = Components.classes;
var Ci = Components.interfaces;

var Logger = {};
Components.utils.import("resource://acr/modules/Logger.jsm", Logger);

function getHostEnvironmentInfo()
{
    // Returns "WINNT" on Windows Vista, XP, 2000, and NT systems;
    // "Linux" on GNU/Linux; and "Darwin" on Mac OS X.
    var osName = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime).OS;

    var osVersion;
    
    try
    {
        osVersion = getMostRecentAppWindow().navigator.oscpu;
    }
    catch (e) { Logger.warn(e); }

    var info = Cc["@mozilla.org/xre/app-info;1"] .getService(Ci.nsIXULAppInfo);

    // Get the name of the application running us
    //info.name; // Returns "Firefox" for Firefox
    //info.version; // Returns "2.0.0.1" for Firefox version 2.0.0.1

    var hostEnvInfo =
    {
        osName: osName,
        osVersion: osVersion,
        appGUID: info.ID,
        appName: info.name,
        appVersion: info.version,
        appBuildID: info.appBuildID
    };

    return hostEnvInfo;
}

function getAppName()
{
    // Returns "Firefox", "Thunderbird" or "SeaMonkey"
    var envinfo = getHostEnvironmentInfo();
    return envinfo.appName;
}

function getFullApplicationString()
{
    var envinfo = getHostEnvironmentInfo();

    return envinfo.appName + " " + envinfo.appVersion + " (build " + envinfo.appBuildID + ")";
}

function getFullOSString()
{
    var envinfo = getHostEnvironmentInfo();

    return envinfo.osVersion;
}

function dumpObject(obj, name, indent, depth)
{
    Logger.debug(ACR.Util._dumpObject(obj, name, indent, depth));
}

function _dumpObject(obj, name, indent, depth)
{
    if (!name) name = "object";
    if (!indent) indent = " ";

    if (depth > 10)
    {
        return indent + name + ": <Maximum Depth Reached>\n";
    }

    if (typeof obj == "object")
    {
        var child = null;
        var output = indent + name + "\n";
        indent += "\t";

        for (var item in obj)
        {
            try
            {
                child = obj[item];
            }
            catch (e)
            {
                child = "<Unable to Evaluate>";
            }

            if (typeof child == "object")
            {
                output += _dumpObject(child, item, indent, depth + 1);
            }
            else
            {
                output += indent + item + ": " + child + "\n";
            }
        }
        return output;
    }
    else
    {
        return obj;
    }
}

function getInstalledExtensions(callback)
{
    try
    {
        Components.utils.import("resource://gre/modules/AddonManager.jsm");
 
        AddonManager.getAllAddons(callback);
    }
    catch (e)
    {
        // legacy EM stuff
        var extensionManager = Cc["@mozilla.org/extensions/manager;1"].getService(Ci.nsIExtensionManager);
        callback(extensionManager.getItemList(Ci.nsIUpdateItem.TYPE_ANY, { }));
    }
}

function getLocalStorageForOrigin(origin)
{
    // e.g. origin = "http://example.com"

    try
    {
        var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
        var ssm = Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);
        var dsm = Cc["@mozilla.org/dom/storagemanager;1"].getService(Ci.nsIDOMStorageManager);

        var uri = ios.newURI(origin, "", null);
        var principal = ssm.getCodebasePrincipal(uri);
        var storage = dsm.getLocalStorageForPrincipal(principal, "");

        //storage.setItem("chromekey", "chromevalue");

        return storage;
    }
    catch (e) { Logger.warn(e); return null; }
}

function getMostRecentAppWindow()
{
    var appWinString = "navigator:browser"; // default, Firefox
    var app = Cc["@mozilla.org/xre/app-info;1"] .getService(Ci.nsIXULAppInfo).name;
    if (app == "Thunderbird")
        appWinString = "mail:3pane";
    var appWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                .getService(Components.interfaces.nsIWindowMediator)
                .getMostRecentWindow(appWinString);
    return appWindow;
}


