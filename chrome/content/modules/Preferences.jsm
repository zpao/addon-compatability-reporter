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

var EXPORTED_SYMBOLS = ["setPreference", "getPreference", "setPreferenceList", "getPreferenceList",
    "setPreferenceMap", "getPreferenceMap", "notifyObservers", "addObserver", "removeObserver",
    "getGlobalPreference", "addGlobalObserver", "removeGlobalObserver", "setBoolGlobalPreference",
    "globalGetPrefType", "clearGlobalPreference", "globalHasUserValue"];

var _prefServiceRoot = "extensions.acr.";
var _prefServiceListDelimiter = "|";
var _prefServiceCache = null;
var Cc = Components.classes;
var Ci = Components.interfaces;

var Logger = {};
Components.utils.import("resource://acr/modules/Logger.jsm", Logger);

function setPreference(name, value)
{
    try
    {
        if (typeof value == 'boolean')
        {
            _getPrefService().setBoolPref(name, value);
        }
        else if (typeof value == 'number')
        {
            _getPrefService().setIntPref(name, value);
        }
        else if (typeof value == 'string')
        {
            _getPrefService().setCharPref(name, value);
        }
        else
        {
            _getPrefService().setCharPref(name, value.toString());
        }
    }
    catch (e)
    {
        Logger.error("setPreference : " + e);
    }
}

function getPreference(name)
{
    var val = null;

    try
    {
        var type = _getPrefService().getPrefType(name);

        if (_getPrefService().PREF_BOOL == type)
        {
            val = _getPrefService().getBoolPref(name);
        }
        else if (_getPrefService().PREF_INT == type)
        {
            val = _getPrefService().getIntPref(name);
        }
        else if (_getPrefService().PREF_STRING == type)
        {
            val = _getPrefService().getCharPref(name);
        }
        else
        {
            Logger.error("Invalid pref: " + name);
        }
    }
    catch (e)
    {
        Logger.error("getPreference : "+e);
    }

    return val;
}

function setPreferenceList(name, list)
{
    for (var i=0; i<list.length; i++)
    {
        if (!list[i])
            continue;

        list[i] = list[i].replace(/\|/g, "\\|");
    }

    var joinedList = list.join(_prefServiceListDelimiter);

    setPreference(name, joinedList);
}

function getPreferenceList(name)
{
    var pref = getPreference(name, "char");

    if (!pref) return new Array();

    pref = pref.replace(/\\\|/g, "FORWARDSLASHFORWARDSLASHFORWARDSLASHPIPE");
    var splitList = pref.split(/\|/);

    for (var i=0; i<splitList.length; i++)
    {
        splitList[i] = splitList[i].replace(/FORWARDSLASHFORWARDSLASHFORWARDSLASHPIPE/g, "|");
    }

    return pref.split(_prefServiceListDelimiter);
}

function setPreferenceMap(name, map)
{
    var list = [];

    for (var id in map)
    {
        if (!map[id])
            continue;

        var blah = map[id].toString();
        var escaped = blah.replace(/=/g, "\\=");

        list.push(id + "=" + escaped);
    }

    return this.setPreferenceList(name, list);
}

function getPreferenceMap(name)
{
    var list = this.getPreferenceList(name);
    var map = {};

    for (var i=0; i<list.length; i++)
    {
        var bits = list[i].split(/([^\\])=/);

        if (bits.length != 3)
            continue;

        bits[2] = bits[2].replace(/\\=/g, "=");

        map[bits[0]+bits[1]] = bits[2];
    }

    return map;
}

function addObserver(observer)
{
    var prefService = _getPrefService();

    prefService.QueryInterface(Ci.nsIPrefBranch2);
    prefService.addObserver("", observer, false);
}

function removeObserver(observer)
{
    _getPrefService().removeObserver("", observer);
}

function notifyObservers(data)
{
    Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService).
        notifyObservers(null, "nsPref:changed", data);
}

function getGlobalPreference(name, failSilently)
{
    var prefSvc = Cc["@mozilla.org/preferences-service;1"].
        getService(Ci.nsIPrefService).
        getBranch("");

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
        else if (failSilently == undefined || failSilently === false)
        {
            Logger.error("Invalid pref: " + name);
        }
    }
    catch (e)
    {
        if (failSilently == undefined || failSilently === false)
            Logger.error("getGlobalPreference : "+e);

        return null;
    }

    return val;
}

function addGlobalObserver(observer, branchName)
{
    var prefService = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);

    var branch = prefService.getBranch(branchName);
    branch.QueryInterface(Ci.nsIPrefBranch2);

    branch.addObserver("", observer, false);
}

function removeGlobalObserver(observer, branchName)
{
    var prefService = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);

    var branch = prefService.getBranch(branchName);
    branch.QueryInterface(Ci.nsIPrefBranch2);

    branch.removeObserver("", observer);
}

var _getPrefService = function()
{
    if (!_prefServiceCache)
    {
        try
        {
            var prefSvc = Cc["@mozilla.org/preferences-service;1"].
                getService(Ci.nsIPrefService);
            _prefServiceCache = prefSvc.getBranch(_prefServiceRoot);
        }
        catch (e)
        {
            Logger.error("Can't get Prefs Service: " + e);
        }
    }

    return _prefServiceCache;
};

function setBoolGlobalPreference(name, value)
{
    var prefSvc = Cc["@mozilla.org/preferences-service;1"].
        getService(Ci.nsIPrefService).
        getBranch("");

    try
    {
        prefSvc.setBoolPref(name, value);
    }
    catch (e)
    {
        Logger.error(e);
    }
}

function globalGetPrefType(name)
{
    var prefSvc = Cc["@mozilla.org/preferences-service;1"].
        getService(Ci.nsIPrefService);

    return prefSvc.getPrefType(name);
}

function clearGlobalPreference(name)
{
    var prefSvc = Cc["@mozilla.org/preferences-service;1"].
        getService(Ci.nsIPrefService).
        getBranch("");

    if (!prefSvc.prefHasUserValue(name))
        return;

    try
    {
        prefSvc.clearUserPref(name);
    }
    catch (e)
    {
        Logger.error(e);
    }
}

function globalHasUserValue(name)
{
    var prefSvc = Cc["@mozilla.org/preferences-service;1"].
        getService(Ci.nsIPrefService);

    var branch = name.substring(0, name.lastIndexOf(".")+1);

    if (branch !== "")
    {
        prefSvc = prefSvc.getBranch(branch);
        name = name.substring(name.lastIndexOf(".")+1);
    }

    return prefSvc.prefHasUserValue(name);
}


