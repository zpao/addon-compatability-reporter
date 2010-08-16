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
 *                 David McNamara
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

ACR.Controller.ExtensionsOverlay = new function()
{
    this._addon = null;
    this._compatibilityButton = null;
}

ACR.Controller.ExtensionsOverlay.init = function()
{
    ACR.Logger.debug("In ExtensionsOverlay.init()");

    ACR.checkForApplicationUpgrade();

    if (ACR.Controller.ExtensionsOverlay.isLegacyEM())
    {
        ACR.Controller.ExtensionsOverlay._compatibilityButton = document.createElement("acrCompatibilityButton");
        document.getElementById("extensionsView").addEventListener("select", ACR.Controller.ExtensionsOverlay._invalidateCompatibilityButtonLegacyEM, true);
    }
    else
    {
        document.getElementById("addon-list").addEventListener("select", ACR.Controller.ExtensionsOverlay._setSelectedAddon, true);
        document.addEventListener("ViewChanged", function()
        {
            ACR.Controller.ExtensionsOverlay._invalidateCompatibilityButtons();
        }, true);
    }
}

ACR.Controller.ExtensionsOverlay.isLegacyEM  = function()
{
    // Firefox 3.6 and below
    return document.getElementById("extensionsView");
}

ACR.Controller.ExtensionsOverlay.doStillWorks = function()
{
    ACR.Logger.debug("In ACR.Controller.ExtensionsOverlay.doStillWorks()");

    var params = {addon: this._addon, stillWorks: true};

    ACR.Controller.ExtensionsOverlay._openSubmitReportDialog(params);
}

ACR.Controller.ExtensionsOverlay.doNoLongerWorks = function()
{
    ACR.Logger.debug("In ACR.Controller.ExtensionsOverlay.doNoLongerWorks()");

    var params = {addon: this._addon, stillWorks: false};

    ACR.Controller.ExtensionsOverlay._openSubmitReportDialog(params);
}

ACR.Controller.ExtensionsOverlay._openSubmitReportDialog = function(params)
{
    params.ACR = ACR;

    window.openDialog("chrome://acr/content/view/submitReport.xul", "",
            "chrome,titlebar,centerscreen,modal", params);

    if (ACR.Controller.ExtensionsOverlay.isLegacyEM())
    {
        ACR.Controller.ExtensionsOverlay._invalidateCompatibilityButtonLegacyEM();
    }
    else
    {
        ACR.Controller.ExtensionsOverlay._invalidateCompatibilityButtons();
    }
}

ACR.Controller.ExtensionsOverlay._getAddonFromListItem = function(richlistitem, callback)
{
    var guid = richlistitem.getAttribute("value");

    var internalCallback = function(addon)
    {
        if (!addon)
        {
            ACR.Logger.warn("Not a valid add-on: " + guid);
            return null;
        }

        //ACR.Logger.debug("type = " + addon.type);

        if (addon.type == "plugin")
            return null;

        // TODO filter out personas here

        var acrAddon = ACR.Factory.getAddonByAddonManagerAddonObject(addon);

        callback(acrAddon);
    }

    AddonManager.getAddonByID(guid, internalCallback);
}

ACR.Controller.ExtensionsOverlay._setSelectedAddon = function()
{
    ACR.Logger.debug("In ACR.Controller.ExtensionsOverlay._setSelectedAddon()");

    var elemExtension = document.getElementById("addon-list").selectedItem;

    if (!elemExtension)
        return;

    ACR.Controller.ExtensionsOverlay._getAddonFromListItem(
        elemExtension, 
        function(acrAddon)
        {
            if (!acrAddon) return;

            ACR.Logger.debug("Selected add-on: '" + acrAddon.guid + "/" + acrAddon.version + "' state: '" + acrAddon.state + "' compatibility: " + (acrAddon.compatible?"IS":"IS NOT") + " compatible with this version of the platform.");
            ACR.Controller.ExtensionsOverlay._addon = acrAddon;
        }
        );
}

ACR.Controller.ExtensionsOverlay._invalidateCompatibilityButtons = function()
{
    ACR.Logger.debug("In ACR.Controller.ExtensionsOverlay._invalidateCompatibilityButtons()");

    var stuffer = function()
    {
        ACR.Logger.debug("in stuffer()");

        if (document.getElementById("view-port").selectedPanel.id == "list-view")
        {
            for (var i=0; i<document.getElementById("addon-list").itemCount; i++)
            {
                var item = document.getElementById("addon-list").getItemAtIndex(i);
                var controlContainer = document.getAnonymousElementByAttribute(item, 'anonid', 'control-container');

                if (!controlContainer) ACR.Logger.warn("no control container");

                var callback = let (cc = controlContainer) function(acrAddon)
                {
                    if (!acrAddon) return;

                    var existings = cc.getElementsByTagName("acrCompatibilityButton");
                    var cb;

                    if (existings.length)
                    {
                        cb = existings[0];
                    }
                    else
                    {
                        cb = document.createElement("acrCompatibilityButton");
                        cc.insertBefore(cb, cc.firstChild);
                    }

                    ACR.Logger.debug("Add-on: '" + acrAddon.guid + "/" + acrAddon.version + "' state: '" + acrAddon.state + "' compatibility: " + (acrAddon.compatible?"IS":"IS NOT") + " compatible with this version of the platform.");

                    cb.addon = acrAddon;
                    try { cb.invalidate(); } catch (e) {}

                    ACR.Logger.debug("invalidated/stuffed a button");
                };

                ACR.Controller.ExtensionsOverlay._getAddonFromListItem(item, callback);
            }
        }
        else if (document.getElementById("view-port").selectedPanel.id == "detail-view")
        {
            if (!ACR.Controller.ExtensionsOverlay._addon)
                return;

            var existings = document.getElementById("detail-view").getElementsByTagName("acrCompatibilityButton");
            var cb;

            if (existings.length)
            {
                cb = existings[0];
            }
            else
            {
                cb = document.createElement("acrCompatibilityButton");
                document.getElementById("detail-uninstall").parentNode.insertBefore(cb, document.getElementById("detail-uninstall"));
            }

            cb.addon = ACR.Controller.ExtensionsOverlay._addon;
            try { cb.invalidate(); } catch (e) {}
        }
    }

    //if (ACR.Controller.ExtensionsOverlay._stuffTimeout) clearTimeout(stuffer);
    //ACR.Controller.ExtensionsOverlay._stuffTimeout = setTimeout(stuffer, 200);
    stuffer();
}

/**
 * This function called when user selects any extension in the legacy (<= FF 3.6) extension manager.
 *
 * Ensure the compatibilityButton binding is in the correct state, then add to the right place in the selected extension's ui.
 */
ACR.Controller.ExtensionsOverlay._invalidateCompatibilityButtonLegacyEM = function()
{
    ACR.Logger.debug("In ACR.Controller.ExtensionsOverlay._invalidateCompatibilityButtonLegacyEM()");

    if (ACR.Controller.ExtensionsOverlay._compatibilityButton && ACR.Controller.ExtensionsOverlay._compatibilityButton.parentNode)
    {
        ACR.Controller.ExtensionsOverlay._compatibilityButton.parentNode.removeChild(ACR.Controller.ExtensionsOverlay._compatibilityButton);
    }

    if (ACR.Preferences.getGlobalPreference("extensions.checkCompatibility", true) == true)
    {
        ACR.Logger.info("Not showing compatibility reporter button because extensions.checkCompatibility is set to 'true'");
        return;
    }

    var elemExtension = document.getElementById("extensionsView").selectedItem;

    if (!elemExtension)
        return;

    var elemSelectedButtons = document.getAnonymousElementByAttribute(elemExtension, "anonid", "selectedButtons");

    if (!elemSelectedButtons)
        return;

    // No compatibility for plugins 
    if (elemExtension.getAttribute("plugin") == "true")
        return;

    // No compatibility for personas 
    if (elemExtension.getAttribute("lwtheme") == "true")
        return;

    var selectedExtensionGUID = elemExtension.getAttribute("addonID");
    var selectedExtensionVersion = elemExtension.getAttribute("version");

    ACR.Logger.debug("Have valid addon (not plugin, updateable) with id = '" + selectedExtensionGUID + "'");

    if (!selectedExtensionGUID)
        return;

    ACR.Controller.ExtensionsOverlay._addon = ACR.Factory.getAddon(selectedExtensionGUID, selectedExtensionVersion);
    ACR.Controller.ExtensionsOverlay._addon.name = elemExtension.getAttribute("name");
    ACR.Controller.ExtensionsOverlay._addon.compatible = elemExtension.getAttribute("compatible") == "true";

    ACR.Logger.debug("Addon name is " + ACR.Controller.ExtensionsOverlay._addon.name);
    ACR.Logger.debug("Addon " + (ACR.Controller.ExtensionsOverlay._addon.compatible?"IS":"IS NOT") + " compatible with this version of platform.");
    ACR.Logger.debug("Factory says addon '" + ACR.Controller.ExtensionsOverlay._addon.guid + "/" + selectedExtensionVersion + "' has state '" + ACR.Controller.ExtensionsOverlay._addon.state + "'");

    if (!ACR.Controller.ExtensionsOverlay._compatibilityButton)
    {
        ACR.Controller.ExtensionsOverlay._compatibilityButton = document.createElement("acrCompatibilityButton");
    }

    ACR.Controller.ExtensionsOverlay._compatibilityButton.addon = ACR.Controller.ExtensionsOverlay._addon;

    try 
    {
        ACR.Controller.ExtensionsOverlay._compatibilityButton.invalidate();
    }
    catch (e) {}

    for (var i=0; i<elemSelectedButtons.childNodes.length; i++)
    {
        if (elemSelectedButtons.childNodes[i]
            && elemSelectedButtons.childNodes[i].nodeType == Node.ELEMENT_NODE
            && (elemSelectedButtons.childNodes[i].getAttribute("class").match(/enableButton/)
                || elemSelectedButtons.childNodes[i].getAttribute("class").match(/addonInstallButton/)))
        {
            ACR.Logger.debug("inserting compatibility button");

            elemSelectedButtons.insertBefore(ACR.Controller.ExtensionsOverlay._compatibilityButton,
                                             elemSelectedButtons.childNodes[i]);
            break;
        }
    }
}

addEventListener("load", ACR.Controller.ExtensionsOverlay.init, false);
