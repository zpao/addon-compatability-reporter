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

var ACRMainOverlayController = new function() {}

ACRMainOverlayController.initACR = function()
{
    try
    {
        ACRMainOverlayController.ACR = {};
        Components.utils.import("resource://acr/modules/ACR.jsm", ACRMainOverlayController.ACR);

        if (ACRMainOverlayController.ACR.flags.initialized) return;
    }
    catch (e) { dump("Could not initialize ACR: " + e + "\n");return; }

    var ACR = ACRMainOverlayController.ACR;
    ACR.Logger.info("Initializing ACR");

    if (ACR.Preferences.getPreference("firstrun") == true)
    {
        try {
            ACR.Logger.debug("This is firstrun");
            ACR.firstrun();
            ACRMainOverlayController.firstrun();
        }
        catch (e) { ACR.Logger.debug("firstrun fail : "+e); }
    }

    // disabling this for now (https://bugzilla.mozilla.org/show_bug.cgi?id=644933)
    // ACR.checkForLangPackDisable();

    ACR.registerAddonListener();
    ACR.setAMOShowIncompatibleAddons();
    ACR.checkForCompatibilityReset();

    ACR.flags.initialized = true;
};

/*ACRMainOverlayController.shutdownACR = function()
{
    window.removeEventListener("load", ACRMainOverlayController.initACR, true);
};*/

ACRMainOverlayController.firstrun = function()
{
    var ACR = ACRMainOverlayController.ACR;

    ACR.Logger.info("This is ACR's firstrun. Welcome!");

    switch (ACR.Util.getHostEnvironmentInfo().appName)
    {
        case "Firefox":
        case "SeaMonkey":
            window.setTimeout(function()
            {
                var tab = window.getBrowser().addTab(ACR.FIRSTRUN_LANDING_PAGE);
                window.getBrowser().selectedTab = tab;
            },
            1000);
            break;
        case "Thunderbird":
            window.setTimeout(function()
            {
                var tabmail = document.getElementById("tabmail");
                var newTab = tabmail.openTab("contentTab",
                         {contentPage: ACR.FIRSTRUN_LANDING_PAGE_TB});
                if (!newTab)
                  ACR.Logger.info("Expected new tab info to be returned from openTab");
            },
            1000);
            break;
    }
};

window.addEventListener("load", ACRMainOverlayController.initACR, true);
//window.addEventListener("unload", ACRMainOverlayController.shutdownACR, true);

