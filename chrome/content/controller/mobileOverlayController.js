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

var initACR = function()
{
    var ConsoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
    ConsoleService.logStringMessage("Initializing ACR");

    var ACR = {};

    try
    {
        Components.utils.import("resource://acr/modules/ACR.jsm", ACR);
    }
    catch (e)
    {
        ConsoleService.logStringMessage("Could not initialize ACR: " + e + "\n");
    }

    if (ACR.Preferences.getPreference("firstrun") == true)
    {
        try {
            ACR.Logger.debug("This is firstrun");
            ACR.firstrun();
            // TODO a fennec first run story
        }
        catch (e) { ACR.Logger.debug("firstrun fail : "+e); }
    }

    ACR.registerAddonListener();
    ACR.setAMOShowIncompatibleAddons();

    ACR.checkForLangPackDisable();
    ACR.checkForCompatibilityReset();

    document.getElementById("addons-list").addEventListener("select", function(event)
    {
        if (event.target.nodeName != "richlistbox")
            return;

        var addons = document.getElementById("addons-list").getElementsByAttribute("typeName", "local");

        for (var i=0; i<addons.length; i++)
        {
            addons[i].hideCompatibilityBox();
        }
    }, true);

    document.getElementById("addons-list").addEventListener("DOMNodeInserted", function(event)
    {
        if (event.originalTarget.getAttribute("typeName") == "local")
        {
            var options = document.getAnonymousElementByAttribute(event.originalTarget,
                "anonid",
                "options-button");

            // TODO localise strings in following UI

            var compatibilityButton = document.createElement("button");
            compatibilityButton.setAttribute("label", "ACR");
            compatibilityButton.setAttribute("type", "checkbox");
            options.parentNode.insertBefore(compatibilityButton, options.nextSibling);

            var compatibilityBox = document.createElement("vbox");
            compatibilityBox.collapsed = true;

            event.originalTarget.hideCompatibilityBox = function()
            {
                compatibilityButton.removeAttribute("checked");
                compatibilityBox.collapsed = true;
            };

            var addonReport = ACR.AddonReportStorage.getAddonReport(
                event.originalTarget.getAttribute("addonID"),
                event.originalTarget.getAttribute("version"));

            addonReport.compatible = event.originalTarget.addon.isCompatible;

            if (addonReport.state == 1)
            {
                // works properly
                var b = document.createElement("hbox");
                b.setAttribute("align", "center");
                var i = document.createElement("image");
                i.setAttribute("src", "chrome://acr/skin/images/greentick.png");
                b.appendChild(i);
                var l = document.createElement("label");
                l.setAttribute("value", "Works Properly");
                b.appendChild(l);
                /*
                var but = document.createElement("button");
                but.setAttribute("label", "Clear Report");
                but.addEventListener("command", function() { ACR.AddonReportStorage.deleteAddonReport(addonReport); }, true);
                compatibilityBox.appendChild(but);
                */
                compatibilityBox.appendChild(b);
            }
            else if (addonReport.state == 2)
            {
                // compatibility problems
                var b = document.createElement("hbox");
                b.setAttribute("align", "center");
                var i = document.createElement("image");
                i.setAttribute("src", "chrome://acr/skin/images/exclamation.png");
                b.appendChild(i);
                var l = document.createElement("label");
                l.setAttribute("value", "Compatibility Problems");
                b.appendChild(l);
                compatibilityBox.appendChild(b);
            }
            else
            {
                var detailsBox = document.createElement("vbox");
                detailsBox.collapsed = true;

                var radiogroup = document.createElement("radiogroup");
                radiogroup.addEventListener("command", function(event) { detailsBox.collapsed = (event.currentTarget.selectedIndex == 0); }, true);

                var stillWorks = document.createElement("radio");
                stillWorks.setAttribute("label", "This add-on still works");
                radiogroup.appendChild(stillWorks);

                var noLongerWorks = document.createElement("radio");
                noLongerWorks.setAttribute("label", "no longer works");
                radiogroup.appendChild(noLongerWorks);

                if (addonReport.compatible)
                {
                    var b = document.createElement("hbox");
                    b.setAttribute("align", "center");
                    var i = document.createElement("image");
                    i.setAttribute("src", "chrome://acr/skin/images/greentick.png");
                    b.appendChild(i);
                    var l = document.createElement("label");
                    l.setAttribute("value", "Marked as compatible by developer.");
                    b.appendChild(l);
                    compatibilityBox.appendChild(b);
                }

                compatibilityBox.appendChild(radiogroup);

                var desc = document.createElement("description");
                desc.appendChild(document.createTextNode("Please provide details of the problems you encountered, including any steps to reproduce:"));
                detailsBox.appendChild(desc);

                var tb = document.createElement("textbox");
                tb.setAttribute("multiline", true);
                detailsBox.appendChild(tb);

                var includeListBox = document.createElement("hbox");
                var includeListLabel = document.createElement("label");
                includeListLabel.setAttribute("value", "Include my add-ons");
                includeListBox.appendChild(includeListLabel);
                var includeList = document.createElement("checkbox");
                includeList.setAttribute("checked", false);
                includeListBox.appendChild(includeList);
                detailsBox.appendChild(includeListBox);

                var disableAddonBox = document.createElement("hbox");
                var disableAddonLabel = document.createElement("label");
                disableAddonLabel.setAttribute("value", "Disable this add-on");
                disableAddonBox.appendChild(disableAddonLabel);
                var disableAddon = document.createElement("checkbox");
                disableAddon.setAttribute("checked", false);
                disableAddonBox.appendChild(disableAddon);
                detailsBox.appendChild(disableAddonBox);

                var publicL = document.createElement("label");
                publicL.setAttribute("value", "This information will be public.");
                detailsBox.appendChild(publicL);

                compatibilityBox.appendChild(detailsBox);
                
                var submitReportBox = document.createElement("hbox");
                submitReportBox.setAttribute("pack", "end");
                var submitReport = document.createElement("button");
                submitReport.setAttribute("label", "Submit Report");
                submitReportBox.appendChild(submitReport);
                compatibilityBox.appendChild(submitReportBox);

                var resultBox = document.createElement("hbox");
                resultBox.setAttribute("align", "center");
                var resultHolder = document.createElement("label");
                resultBox.appendChild(resultHolder);
                var resultSpacer = document.createElement("spacer");
                resultSpacer.setAttribute("flex","1");
                resultBox.appendChild(resultSpacer);
                var resultSpinner = document.createElement("image");
                resultSpinner.setAttribute("src", "chrome://acr/skin/images/spinner.gif");
                resultSpinner.collapsed = true;
                resultSpinner.style.verticalAlign = "top";
                resultBox.appendChild(resultSpinner);
                resultBox.collapsed = true;
                compatibilityBox.appendChild(resultBox);

                var setResult = function(txt, isError, isLoading)
                {
                    resultHolder.setAttribute("value", txt);
                    resultHolder.style.color = (isError?"red":"inherit");
                    resultBox.collapsed = false;
                    resultSpinner.collapsed = !isLoading;
                };

                var setFormEnabled = function(enabled)
                {
                    radiogroup.setAttribute("disabled", !enabled);
                    stillWorks.setAttribute("disabled", !enabled);
                    noLongerWorks.setAttribute("disabled", !enabled);
                    tb.setAttribute("disabled", !enabled);
                    includeList.setAttribute("disabled", !enabled);
                    disableAddon.setAttribute("disabled", !enabled);
                    submitReport.setAttribute("disabled", !enabled);
                };

                submitReport.addEventListener("command", function()
                {
                    ACR.Logger.debug("submitreport");

                    setFormEnabled(false);
                    setResult("Submitting Report...", false, true);

                    var cb = function(cbEvent)
                    {
                        if (cbEvent.isError())
                        {
                            ACR.Logger.debug("In submitReport callback, error = " + cbEvent.getError().toString());
                            setResult("Error Submitting Report", true, false);

                            setFormEnabled(true);
                        }
                        else
                        {
                            ACR.Logger.debug("In submitReport callback, success!");
                            setResult("Report submitted. Thank you!", false, false);

                            if (disableAddon.checked)
                                ACR.disableAddon(addonReport);
                        }
                    };

                    ACR.submitReport(addonReport,
                        (radiogroup.selectedIndex == 0),
                        tb.value,
                        includeList.checked,
                        cb);

                }, true);
            }

            compatibilityButton.addEventListener("command", function() { compatibilityBox.collapsed = !compatibilityBox.collapsed; }, true);
            event.originalTarget.appendChild(compatibilityBox);

            if (radiogroup && addonReport.compatible)
            {
                /*
                radiogroup.selectedIndex = 1;
                */
                detailsBox.collapsed = false;
                radiogroup.collapsed = true;
            }
        }

    }, true);
};

window.addEventListener("load", function() { setTimeout(initACR, 3000); }, true);


