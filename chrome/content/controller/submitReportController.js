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

var ACR = window.opener.ACR;

if (!ACR)
{
    ACR = window.arguments[0].ACR;
}

var Controller = new function() {}

Controller.flags = {finished: false};

Controller.init = function()
{
    ACR.Logger.debug("In Controller.init()");

    Controller.stringBundle = document.getElementById("acr-strings");

    var windowArgs = window.arguments[0];

    Controller._addonReport = windowArgs.addonReport;
    Controller._stillWorks = windowArgs.stillWorks;

    ACR.Logger.debug("Have addonReport = '" + Controller._addonReport.name + "'");

    if (Controller._stillWorks)
    {
        document.getElementById("stillWorks").collapsed = false;
    }
    else
    {
        document.getElementById("noLongerWorks").collapsed = false;
        document.getElementById("disableThisAddon").collapsed = false;
    }

    document.getElementById("addon").value = Controller._addonReport.name + " " + Controller._addonReport.version;
    document.getElementById("application").value = ACR.Util.getFullApplicationString();
    document.getElementById("operatingSystem").value = ACR.Util.getFullOSString();

    if (Controller._addonReport.report)
        document.getElementById("details").value = Controller._addonReport.report;

    ACR.Logger.debug("Finished Controller.init()");
}

Controller.doCancel = function()
{
    return true;
}

Controller.doAccept = function()
{
    if (Controller.flags.finished)
        return true;

    ACR.Logger.debug("In Controller.doAccept()");

    Controller.disableFormAndShowSpinner();

    ACR.submitReport(Controller._addonReport,
        Controller._stillWorks,
        document.getElementById("details").value,
        document.getElementById("includeAddonList").checked,
        Controller.finished);

    return false;
}

Controller.enableFormAndHideSpinner = function()
{
    document.getElementById("details").disabled = false;
    document.getElementById("includeAddonList").disabled = false;
    document.getElementById("disableThisAddon").disabled = false;

    Controller.hideSpinner();
}

Controller.disableFormAndShowSpinner = function()
{
    document.getElementById("details").disabled = true;
    document.getElementById("includeAddonList").disabled = true;
    document.getElementById("disableThisAddon").disabled = true;

    document.getElementById("spinner").collapsed = false;
}

Controller.hideSpinner = function()
{
    document.getElementById("spinner").collapsed = true;
}

Controller.finished = function(event)
{
    if (event.isError())
    {
        ACR.Logger.debug(event.getError().toString());

        document.getElementById("result").value = Controller.stringBundle.getString("acr.submitreport.error");
        document.getElementById("result").setAttribute("class", "error");
        document.getElementById("result").collapsed = false;

        Controller.enableFormAndHideSpinner();
    }
    else
    {
        Controller.flags.finished = true;

        Controller.hideSpinner();

        if (document.getElementById("disableThisAddon").checked)
        {
            ACR.disableAddon(Controller._addonReport);
        }

        document.getElementById("result").value = Controller.stringBundle.getString("acr.submitreport.success");
        document.getElementById("result").setAttribute("class", "success");
        document.getElementById("result").collapsed = false;

        document.getElementById("acr-submit-report").getButton("accept").collapsed = true;
        document.getElementById("acr-submit-report").getButton("cancel").label = Controller.stringBundle.getString("acr.submitreport.close");
        document.getElementById("acr-submit-report").getButton("cancel").focus();

    }
}

window.addEventListener("load", Controller.init, true);
