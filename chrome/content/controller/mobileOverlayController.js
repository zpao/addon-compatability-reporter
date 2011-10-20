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

var ACRController = function() {};

ACRController.flags = {};

ACRController.init = function()
{
    var ConsoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
    ConsoleService.logStringMessage("Initializing ACR");
    dump("Initializing ACR\n");

    var ACR = {};

    try
    {
        Components.utils.import("resource://acr/modules/ACR.jsm", ACR);
    }
    catch (e)
    {
        ConsoleService.logStringMessage("Could not initialize ACR: " + e);
    }

    if (ACR.Preferences.getPreference("firstrun") === true)
    {
        try {
            ACR.Logger.debug("This is firstrun");
            ACR.firstrun();
            // TODO a fennec first run story
        }
        catch (e) { ACR.Logger.debug("firstrun fail : "+e); }
    }

    setTimeout(function()
    {
        ACR.Logger.debug("delayed init");

        ACR.registerAddonListener();
        ACR.setAMOShowIncompatibleAddons();

        ACR.checkForLangPackDisable();
        ACR.checkForCompatibilityReset();
    }, 5000);

    document.getElementById("addons-list").addEventListener("DOMNodeInserted", function(event)
    {
        if (!ACRController.flags.addedSelectedListener)
        {
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

            ACRController.flags.addedSelectedListener = true;
        }

        if (event.originalTarget.getAttribute("typeName") == "local")
        {
            var options = document.getAnonymousElementByAttribute(event.originalTarget,
                "anonid",
                "options-button");

            var addonReport = ACR.AddonReportStorage.getAddonReport(
                event.originalTarget.getAttribute("addonID"),
                event.originalTarget.getAttribute("version"));
            addonReport.compatible = event.originalTarget.addon.isCompatible;

            // TODO localise strings in following UI

            var createCompatibilityLabel = function(label, image)
            {
                var b = document.createElement("hbox");
                b.collapsed = true;
                b.setAttribute("align", "center");
                b.setAttribute("pack", "end");
                b.setAttribute("flex", "1");
                var i = document.createElement("image");
                i.setAttribute("src", image);
                b.appendChild(i);
                var l = document.createElement("label");
                l.setAttribute("value", label);
                l.setAttribute("class", "prefdesc");
                b.appendChild(l);
                return b;
            };

            var markedAsCompatible = createCompatibilityLabel(
                "You marked this add-on as compatible",
                "chrome://acr/skin/images/greentick.png");
            event.originalTarget.appendChild(markedAsCompatible);

            var markedAsIncompatible = createCompatibilityLabel(
                "You marked this add-on as incompatible",
                "chrome://acr/skin/images/exclamation.png");
            event.originalTarget.appendChild(markedAsIncompatible);

            if (addonReport.state == 1)
            {
                markedAsCompatible.setAttribute("class", "show-on-select");
            }
            else if (addonReport.state == 2)
            {
                markedAsIncompatible.setAttribute("class", "show-on-select");
            }
            else
            {
                var compatibilityButton = document.createElement("button");
                compatibilityButton.setAttribute("label", "ACR");
                compatibilityButton.setAttribute("type", "checkbox");
                options.parentNode.insertBefore(compatibilityButton, options.nextSibling);

                var compatibilityBox = document.createElement("vbox");
                compatibilityBox.collapsed = true;

                var stillWorks = document.createElement("setting");
                stillWorks.setAttribute("type", "bool");
                stillWorks.setAttribute("title", "This add-on still works");
                compatibilityBox.appendChild(stillWorks);

                var description = document.createElement("setting");
                description.setAttribute("type", "string");
                description.setAttribute("title", "Send details of problems encountered:");
                description.appendChild(document.createTextNode("This information will be public"));
                compatibilityBox.appendChild(description);

                var include = document.createElement("setting");
                include.setAttribute("type", "bool");
                include.setAttribute("title", "Include add-ons");
                include.appendChild(document.createTextNode("Send a list of my add-ons with the report"));
                compatibilityBox.appendChild(include);

                var disable = document.createElement("setting");
                disable.setAttribute("type", "bool");
                disable.setAttribute("title", "Disable this add-on");
                compatibilityBox.appendChild(disable);

                var submit = document.createElement("setting");
                submit.setAttribute("type", "control");
                var submitButton = document.createElement("button");
                submitButton.setAttribute("label", "Submit Report");
                submit.appendChild(submitButton);
                compatibilityBox.appendChild(submit);

                var resultBox = document.createElement("hbox");
                resultBox.setAttribute("align", "center");
                var resultHolder = document.createElement("label");
                resultHolder.setAttribute("class", "prefdesc");
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
                    stillWorks.setAttribute("disabled", !enabled);
                    description.setAttribute("disabled", !enabled);
                    include.setAttribute("disabled", !enabled);
                    disable.setAttribute("disabled", !enabled);
                    submit.setAttribute("disabled", !enabled);
                };

                var collapseStillWorksUI = function(collapsed)
                {
                    description.collapsed = collapsed;
                    include.collapsed = collapsed;
                    disable.collapsed = collapsed;
                };
                stillWorks.addEventListener("command", function(event) { collapseStillWorksUI(event.currentTarget.value); }, true);
                collapseStillWorksUI(stillWorks.value);

                submitButton.addEventListener("command", function()
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

                            if (disable.value)
                                ACR.disableAddon(addonReport);

                            compatibilityBox.collapsed = true;
                            compatibilityButton.collapsed = true;

                            if (stillWorks.value)
                            {
                                markedAsCompatible.setAttribute("class", "show-on-select");
                            }
                            else
                            {
                                markedAsIncompatible.setAttribute("class", "show-on-select");
                            }

                        }
                    };

                    ACR.submitReport(addonReport,
                        stillWorks.value,
                        description.value,
                        include.value,
                        cb);

                }, true);

                compatibilityButton.addEventListener("command", function() { compatibilityBox.collapsed = !compatibilityBox.collapsed; }, true);
                event.originalTarget.appendChild(compatibilityBox);
            }

            event.originalTarget.hideCompatibilityBox = function()
            {
                if (compatibilityButton)
                {
                    compatibilityButton.removeAttribute("checked");
                    compatibilityBox.collapsed = true;
                }
            };
        }

    }, true);
};

window.addEventListener("UIReady", ACRController.init, false);

