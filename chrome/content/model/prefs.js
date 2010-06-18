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

ACR.Preferences = new function() {}

ACR.Preferences._prefServiceRoot = "extensions.acr.";
ACR.Preferences._prefServiceListDelimiter = "|";
ACR.Preferences._prefServiceCache = null;
ACR.Preferences.Cc = Components.classes;
ACR.Preferences.Ci = Components.interfaces;

ACR.Preferences.setPreference = function(name, value)
{
    try
    {
        if (typeof value == 'boolean')
        {
            this._getPrefService().setBoolPref(name, value);
        }
        else if (typeof value == 'number')
        {
            this._getPrefService().setIntPref(name, value);
        }
        else if (typeof value == 'string')
        {
            this._getPrefService().setCharPref(name, value);
        }
        else
        {
            this._getPrefService().setCharPref(name, value.toString());
        }
    }
    catch (e)
    {
        ACR.Logger.error(e);
    }
}

ACR.Preferences.getPreference = function(name)
{
    var val = null;

    try
    {
        var type = this._getPrefService().getPrefType(name);

        if (this._getPrefService().PREF_BOOL == type)
        {
            val = this._getPrefService().getBoolPref(name);
        }
        else if (this._getPrefService().PREF_INT == type)
        {
            val = this._getPrefService().getIntPref(name);
        }
        else if (this._getPrefService().PREF_STRING == type)
        {
            val = this._getPrefService().getCharPref(name);
        }
        else
        {
            ACR.Logger.error("Invalid pref: " + name);
        }
    }
    catch (e)
    {
        ACR.Logger.error(e);
    }

    return val;
}

ACR.Preferences.setPreferenceList = function(name, list)
{
    // TODO ensure there's no this._prefServiceListDelimiter in the list

    var joinedList = list.join(this._prefServiceListDelimiter);

    this.setPreference(name, joinedList);
}

ACR.Preferences.getPreferenceList = function(name)
{
    var pref = this.getPreference(name, "char");

    if (!pref) return new Array();

    return pref.split(this._prefServiceListDelimiter);
}

ACR.Preferences.setPreferenceMap = function(name, map)
{
    var list = [];

    for (var id in map)
    {
        list.push(id + "=" + map[id]);
    }

    return this.setPreferenceList(name, list);
}

ACR.Preferences.getPreferenceMap = function(name)
{
    var list = this.getPreferenceList(name);
    var map = {};

    for (var i=0; i<list.length; i++)
    {
        var bits = list[i].split("=");

        if (bits.length != 2)
            continue;

        map[bits[0]] = bits[1];
    }

    return map;
}


ACR.Preferences.addObserver = function(observer)
{
    var prefService = this._getPrefService();

    prefService.QueryInterface(this.Ci.nsIPrefBranch2);
    prefService.addObserver("", observer, false);
}

ACR.Preferences.removeObserver = function(observer)
{
    this._getPrefService().removeObserver("", observer);
}

ACR.Preferences.notifyObservers = function(data)
{
    this.Cc["@mozilla.org/observer-service;1"]
              .getService(this.Ci.nsIObserverService)
              .notifyObservers(null, "nsPref:changed", data);
}

ACR.Preferences.setGlobalPreference = function(name, value)
{
    var prefSvc = ACR.Preferences.Cc["@mozilla.org/preferences-service;1"].
        getService(ACR.Preferences.Ci.nsIPrefService);

    try
    {
        var type = prefSvc.getPrefType(name);

        if (prefSvc.PREF_BOOL == type)
        {
            prefSvc.setBoolPref(name, value);
        }
        else if (prefSvc.PREF_INT == type)
        {
            prefSvc.setIntPref(name, value);
        }
        else if (prefSvc.PREF_STRING == type)
        {
            prefSvc.setCharPref(name, value);
        }
    }
    catch (e)
    {
        ACR.Logger.error(e);
    }
}

ACR.Preferences.setBoolGlobalPreference = function(name, value)
{
    var prefSvc = ACR.Preferences.Cc["@mozilla.org/preferences-service;1"].
        getService(ACR.Preferences.Ci.nsIPrefService);

    try
    {
        prefSvc.setBoolPref(name, value);
    }
    catch (e)
    {
        ACR.Logger.error(e);
    }
}


ACR.Preferences.clearGlobalPreference = function(name)
{
    var prefSvc = ACR.Preferences.Cc["@mozilla.org/preferences-service;1"].
        getService(ACR.Preferences.Ci.nsIPrefService);

        alert("clearing global pref '" + name + "'");

    try
    {
        prefSvc.clearUserPref(name);
    }
    catch (e)
    {
        ACR.Logger.error(e);
    }
}


ACR.Preferences.globalHasUserValue = function(name)
{
    var prefs = ACR.Preferences.Cc["@mozilla.org/preferences-service;1"].
        getService(ACR.Preferences.Ci.nsIPrefService);

    var branch = name.substring(0, name.lastIndexOf(".")+1);

    if (branch != "")
    {
        prefs = prefs.getBranch(branch);
        name = name.substring(name.lastIndexOf(".")+1);
    }

    return prefs.prefHasUserValue(name);
}

ACR.Preferences.getGlobalPreference = function(name, failSilently)
{
    var prefSvc = ACR.Preferences.Cc["@mozilla.org/preferences-service;1"].
        getService(ACR.Preferences.Ci.nsIPrefService);

    var branch = name.substring(0, name.lastIndexOf(".")+1);

    if (branch != "")
    {
        prefSvc = prefSvc.getBranch(branch);
        name = name.substring(name.lastIndexOf(".")+1);
    }

    var val = null;

    try
    {
        var type = prefSvc.getPrefType(name);

        if (prefSvc.PREF_BOOL == type)
        {
            val = prefSvc.getBoolPref(name);
        }
        else if (prefSvc.PREF_INT == type)
        {
            val = prefSvc.getIntPref(name);
        }
        else if (prefSvc.PREF_STRING == type)
        {
            val = prefSvc.getCharPref(name);
        }
        else if (failSilently == undefined || failSilently == false)
        {
            ACR.Logger.error("Invalid pref: " + name);
            return null;
        }
    }
    catch (e)
    {
        if (failSilently == undefined || failSilently == false)
        {
            ACR.Logger.error(e);
            return null;
        }

        return null;
    }

    return val;
}

ACR.Preferences.addGlobalObserver = function(observer, branchName)
{
    var prefService = this.Cc["@mozilla.org/preferences-service;1"]
        .getService(this.Ci.nsIPrefService);

    var branch = prefService.getBranch(branchName);
    branch.QueryInterface(this.Ci.nsIPrefBranch2);

    branch.addObserver("", observer, false);
}

ACR.Preferences.removeGlobalObserver = function(observer, branchName)
{
    var prefService = this.Cc["@mozilla.org/preferences-service;1"]
        .getService(this.Ci.nsIPrefService);

    var branch = prefService.getBranch(branchName);
    branch.QueryInterface(this.Ci.nsIPrefBranch2);

    branch.removeObserver("", observer);
}

ACR.Preferences._getPrefService = function()
{
    if (!this._prefServiceCache)
    {
        try
        {
            var prefSvc = this.Cc["@mozilla.org/preferences-service;1"].
                getService(this.Ci.nsIPrefService);
            this._prefServiceCache = prefSvc.getBranch(this._prefServiceRoot);
        }
        catch (e)
        {
            ACR.Logger.error("Can't get Prefs Service: " + e);
        }
    }

    return this._prefServiceCache;
}


