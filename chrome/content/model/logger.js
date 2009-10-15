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

ACR.Logger = new function()
{
    this.ENABLE_CONSOLE_LOG = true;
    this.ENABLE_DUMP_LOG = true;
    this.ENABLE_TIMESTAMPS = false;

    this.consoleService = null;
    this._debug = null;
    this._verbose = null;

    this._realLog = function(msg, level)
    {
        if (this.ENABLE_DUMP_LOG)
            this._dumpLog(msg, level);

        if (this.ENABLE_CONSOLE_LOG)
            this._consoleLog(msg, level);
    }

    this._dumpLog = function(msg, level)
    {
        dump("acr(" + level + "): " + msg + "\n\n");
    }

    this._consoleLog = function(msg, level)
    {
        if (!this.consoleService)
        {
            this.consoleService = Components.classes['@mozilla.org/consoleservice;1'].
                getService(Components.interfaces.nsIConsoleService);
        }

        var datestr = "";

        if (this.ENABLE_TIMESTAMPS)
        {
            var date = new Date();
            datestr = " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "." + date.getMilliseconds();
        }

        this.consoleService.logStringMessage("acr(" + level + ")" + datestr + ": " + msg);
    }

    this._isDebugEnabled = function()
    {
        if (this._debug == undefined)
        {
            var debug = ACR.Preferences.getPreference("debug");

            if (debug == undefined)
                this._debug = false;
            else
                this._debug = debug;
        }

        return this._debug;
    }

    this._isVerboseEnabled = function()
    {
        if (this._isDebugEnabled() == true)
        {
            return true;
        }

        if (this._verbose == undefined)
        {
            var verbose = ACR.Preferences.getPreference("verbose");

            if (verbose == undefined)
                this._verbose = false;
            else
                this._verbose = verbose;
        }

        return this._verbose;
    }
}

ACR.Logger.debug = function(msg)
{
    //alert("ACR.Logger.debug 1");
    if (!this._isDebugEnabled()) return;

    //alert("ACR.Logger.debug 1");
    this._realLog(msg, 5);
}

ACR.Logger.info = function(msg)
{
    if (!this._isVerboseEnabled()) return;

    this._realLog(msg, 3);
}

ACR.Logger.log = function(msg)
{
    if (!this._isVerboseEnabled()) return;

    this._realLog(msg, 3);
}

ACR.Logger.warn = function(msg)
{
    if (!this._isVerboseEnabled()) return;

    this._realLog(msg, 2);
}

ACR.Logger.error = function(msg)
{
    this._realLog(msg, 1);
}

ACR.Logger.fatal = function(msg)
{
    this._realLog(msg, 1);
}


