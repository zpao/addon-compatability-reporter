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

var EXPORTED_SYMBOLS = ["debug", "warn", "log", "error", "fatal", "info"];

var ENABLE_CONSOLE_LOG = true;
var ENABLE_DUMP_LOG = true;
var ENABLE_TIMESTAMPS = false;

var consoleService = null;
var _debug = null;
var _verbose = null;

var Preferences = {};
Components.utils.import("resource://acr/modules/Preferences.jsm", Preferences);

var _realLog = function(msg, level)
{
    if (ENABLE_DUMP_LOG)
        _dumpLog(msg, level);

    if (ENABLE_CONSOLE_LOG)
        _consoleLog(msg, level);
};

var _dumpLog = function(msg, level)
{
    dump("ACR (" + _getNiceLevel(level) + "): " + msg + "\n");
};

var _consoleLog = function(msg, level)
{
    if (!consoleService)
    {
        consoleService = Components.classes['@mozilla.org/consoleservice;1'].
            getService(Components.interfaces.nsIConsoleService);
    }

    var datestr = "";

    if (ENABLE_TIMESTAMPS)
    {
        var date = new Date();
        datestr = " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "." + date.getMilliseconds();
    }

    consoleService.logStringMessage("ACR (" + _getNiceLevel(level) + ")" + datestr + ": " + msg);
};

var _isDebugEnabled = function()
{
    if (_debug == undefined)
    {
        var debug = Preferences.getPreference("debug");

        if (debug == undefined)
            _debug = false;
        else
            _debug = debug;
    }

    return _debug;
};

var _isVerboseEnabled = function()
{
    if (_isDebugEnabled() === true)
    {
        return true;
    }

    if (_verbose == undefined)
    {
        var verbose = Preferences.getPreference("verbose");

        if (verbose == undefined)
            _verbose = false;
        else
            _verbose = verbose;
    }

    return _verbose;
};

var _getNiceLevel = function(level)
{
    switch (level)
    {
        case 1: return "ERROR"; break;
        case 2: return "WARN"; break;
        case 5: return "DEBUG"; break;
        default: return "INFO";
    }

    return "INFO";
};

function debug(msg)
{
    //alert("Bandwagon.Logger.debug 1");
    if (!_isDebugEnabled()) return;

    //alert("Bandwagon.Logger.debug 1");
    _realLog(msg, 5);
}

function info(msg)
{
    if (!_isVerboseEnabled()) return;

    _realLog(msg, 3);
}

function log(msg)
{
    if (!_isVerboseEnabled()) return;

    _realLog(msg, 3);
}

function warn(msg)
{
    if (!_isVerboseEnabled()) return;

    _realLog(msg, 2);
}

function error(msg)
{
    _realLog(msg, 1);
}

function fatal(msg)
{
    _realLog(msg, 1);
}


