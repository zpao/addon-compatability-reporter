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

ACR.Controller.SubmitReportController = new function() {}

ACR.Controller.SubmitReportController.init = function()
{
    ACR.Logger.debug("In ACR.Controller.SubmitReportController.init()");

    ACR.Controller.SubmitReportController.stringBundle = document.getElementById("acr-strings");

    var windowArgs = window.arguments[0];

    ACR.Controller.SubmitReportController._addon = windowArgs.addon;
    ACR.Controller.SubmitReportController._stillWorks = windowArgs.stillWorks;

    ACR.Logger.debug("Have addon = '" + ACR.Controller.SubmitReportController._addon.name);

    if (ACR.Controller.SubmitReportController._stillWorks)
    {
        document.getElementById("stillWorks").collapsed = false;
    }
    else
    {
        document.getElementById("noLongerWorks").collapsed = false;
        document.getElementById("disableThisAddon").collapsed = false;
    }

    document.getElementById("addon").value = ACR.Controller.SubmitReportController._addon.name + " " + ACR.Controller.SubmitReportController._addon.version;
    document.getElementById("application").value = ACR.Util.getFullApplicationString();
    document.getElementById("operatingSystem").value = ACR.Util.getFullOSString();

    ACR.Logger.debug("Finished ACR.Controller.SubmitReportController.init()");
}

ACR.Controller.SubmitReportController.doCancel = function()
{
    return true;
}

ACR.Controller.SubmitReportController.doAccept = function()
{
    ACR.Logger.debug("In ACR.Controller.SubmitReportController.doAccept()");

    ACR.Controller.SubmitReportController.disableFormAndShowSpinner();

    ACR.submitReport(ACR.Controller.SubmitReportController._addon,
        ACR.Controller.SubmitReportController._stillWorks,
        document.getElementById("details").value,
        document.getElementById("includeAddonList").checked,
        ACR.Controller.SubmitReportController.finished);

    return false;
}

ACR.Controller.SubmitReportController.enableFormAndHideSpinner = function()
{
    document.getElementById("details").disabled = false;
    document.getElementById("includeAddonList").disabled = false;
    document.getElementById("disableThisAddon").disabled = false;

    ACR.Controller.SubmitReportController.hideSpinner();
}

ACR.Controller.SubmitReportController.disableFormAndShowSpinner = function()
{
    document.getElementById("details").disabled = true;
    document.getElementById("includeAddonList").disabled = true;
    document.getElementById("disableThisAddon").disabled = true;

    document.getElementById("spinner").collapsed = false;
}

ACR.Controller.SubmitReportController.hideSpinner = function()
{
    document.getElementById("spinner").collapsed = true;
}

ACR.Controller.SubmitReportController.finished = function(event)
{
    if (event.isError())
    {
        ACR.Logger.debug(event.getError().toString());

        document.getElementById("result").value = ACR.Controller.SubmitReportController.stringBundle.getString("acr.submitreport.error");
        document.getElementById("result").setAttribute("class", "error");
        document.getElementById("result").collapsed = false;

        ACR.Controller.SubmitReportController.enableFormAndHideSpinner();
    }
    else
    {
        ACR.Controller.SubmitReportController.hideSpinner();

        if (document.getElementById("disableThisAddon").checked)
        {
            ACR.disableAddon(ACR.Controller.SubmitReportController._addon);
        }

        document.getElementById("result").value = ACR.Controller.SubmitReportController.stringBundle.getString("acr.submitreport.success");
        document.getElementById("result").setAttribute("class", "success");
        document.getElementById("result").collapsed = false;

        document.getElementById("acr-submit-report").getButton("accept").collapsed = true;
        document.getElementById("acr-submit-report").getButton("cancel").label = ACR.Controller.SubmitReportController.stringBundle.getString("acr.submitreport.close");

    }
}

window.addEventListener("load", ACR.Controller.SubmitReportController.init, true);
