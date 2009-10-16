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

ACR.Controller.MainOverlay = new function() {}

ACR.Controller.MainOverlay.initACR = function()
{
    ACR.Controller.MainOverlay._delayedInitACR();
}

ACR.Controller.MainOverlay._delayedInitACR = function()
{
    //ACR.Controller.MainOverlay._removeLoadListener();

    if (ACR.Preferences.getPreference("firstrun") == true)
    {
        ACR.Logger.debug("This is firstrun");
        ACR.Preferences.setPreference("firstrun", false);
        ACR.firstrun();
        ACR.Controller.MainOverlay.firstrun();
    }

    ACR.registerUninstallObserver();
}

ACR.Controller.MainOverlay._removeLoadListener = function()
{
    window.removeEventListener("load", ACR.init, true);
}

ACR.Controller.MainOverlay.firstrun = function()
{
    ACR.Logger.info("This is ACR's firstrun. Welcome!");

    var url = ACR.FIRSTRUN_LANDING_PAGE.replace("%%AMO_HOST%%", ACR.Preferences.getPreference("amo_host"));

    if (ACR.Util.getHostEnvironmentInfo().appName == "Firefox")
    {
        window.setTimeout(function()
        {
            var tab = window.getBrowser().addTab(url);
            window.getBrowser().selectedTab = tab;
        },
        1000);
    }
    // XX TODO A Thunderbird firstrun story
}

window.addEventListener("load", ACR.Controller.MainOverlay.initACR, true);
