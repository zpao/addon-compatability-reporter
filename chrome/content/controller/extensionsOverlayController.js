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

var ACR = {};
Components.utils.import("resource://acr/modules/ACR.jsm", ACR);

var ACRController = new function()
{
    this._addonReport = null;
    this._compatibilityButton = null;
    this._COMPATIBILITY_REPORT_URL_BASE = "https://addons.mozilla.org/en-US/firefox/compatibility/reporter/";
}

ACRController.init = function()
{
    ACR.Logger.debug("In ExtensionsOverlay.init()");

    if (ACRController.isLegacyEM())
    {
        ACRController._compatibilityButton = ACRController._createWidget();
        document.getElementById("extensionsView").addEventListener("select", ACRController._invalidateCompatibilityButtonLegacyEM, true);
    }
    else
    {
        document.getElementById("addon-list").addEventListener("select", ACRController._setSelectedAddon, true);
        document.addEventListener("ViewChanged", ACRController._invalidateCompatibilityButtons, true);

        ACRController._invalidateCompatibilityButtons();
    }

    // catch case where EM opens in detail view
    if (!ACRController.isLegacyEM())
    {
        setTimeout(function()
        {
            if (gDetailView._addon)
            {
                ACRController._addonReport = ACR.AddonReportStorage.getAddonReportByAddon(gDetailView._addon);
                ACRController._invalidateCompatibilityButtons();
            }
        }, 1000);
    }
}

ACRController._createWidget = function()
{
    var widget = document.createElement("acrCompatibilityButton");

    var runtime = Components.classes['@mozilla.org/xre/app-info;1']
        .getService(Components.interfaces.nsIXULRuntime);

    widget.setAttribute('OS', runtime.OS);

    return widget;
}

ACRController.isLegacyEM  = function()
{
    // Firefox 3.6 and below
    return document.getElementById("extensionsView");
}

ACRController.doStillWorks = function()
{
    ACR.Logger.debug("In ACRController.doStillWorks()");

    var params = {addonReport: this._addonReport, stillWorks: true};

    ACRController._openSubmitReportDialog(params);
}

ACRController.doNoLongerWorks = function()
{
    ACR.Logger.debug("In ACRController.doNoLongerWorks()");

    var params = {addonReport: this._addonReport, stillWorks: false};

    ACRController._openSubmitReportDialog(params);
}

ACRController._openSubmitReportDialog = function(params)
{
    params.ACR = ACR;

    window.openDialog("chrome://acr/content/view/submitReport.xul", "",
            "chrome,titlebar,centerscreen,modal", params);

    if (ACRController.isLegacyEM())
    {
        ACRController._invalidateCompatibilityButtonLegacyEM();
    }
    else
    {
        ACRController._invalidateCompatibilityButtons();
    }
}

ACRController._getAddonFromListItem = function(richlistitem, callback)
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

        var addonReport = ACR.AddonReportStorage.getAddonReportByAddon(addon);

        callback(addonReport);
    }

    AddonManager.getAddonByID(guid, internalCallback);
}

ACRController._setSelectedAddon = function()
{
    ACR.Logger.debug("In ACRController._setSelectedAddon()");

    var elemExtension = document.getElementById("addon-list").selectedItem;

    if (!elemExtension)
        return;

    ACRController._getAddonFromListItem(
        elemExtension, 
        function(addonReport)
        {
            if (!addonReport) return;

            ACR.Logger.debug("Selected add-on: '" + addonReport.guid + "/" + addonReport.version + "' state: '"
                + addonReport.state + "' compatibility: " + (addonReport.compatible?"IS":"IS NOT")
                + " compatible with this version of the platform.");
            ACRController._addonReport = addonReport;
        }
        );
}

ACRController._invalidateCompatibilityButtons = function()
{
    ACR.Logger.debug("In ACRController._invalidateCompatibilityButtons()");

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

                var callback = let (cc = controlContainer) function(addonReport)
                {
                    if (!addonReport) return;

                    var existings = cc.getElementsByTagName("acrCompatibilityButton");
                    var cb;

                    if (existings.length)
                    {
                        cb = existings[0];
                    }
                    else
                    {
                        cb = ACRController._createWidget();
                        cc.insertBefore(cb, cc.firstChild);
                    }

                    ACR.Logger.debug("Add-on: '" + addonReport.guid + "/" + addonReport.version + "' state: '"
                        + addonReport.state + "' compatibility: " + (addonReport.compatible?"IS":"IS NOT")
                        + " compatible with this version of the platform.");

                    cb.addonReport = addonReport;
                    try { cb.invalidate(); } catch (e) {}

                    ACR.Logger.debug("Invalidated a button");
                };

                ACRController._getAddonFromListItem(item, callback);
            }
        }
        else if (document.getElementById("view-port").selectedPanel.id == "detail-view")
        {
            if (!ACRController._addonReport)
                return;

            var existings = document.getElementById("detail-view").getElementsByTagName("acrCompatibilityButton");
            var cb;

            if (existings.length)
            {
                cb = existings[0];
            }
            else if (document.getElementById("detail-uninstall"))
            {
                cb = ACRController._createWidget();
                document.getElementById("detail-uninstall").parentNode.insertBefore(cb, document.getElementById("detail-uninstall"));
            }
            else if (document.getElementById("detail-enable-btn"))
            {
                cb = ACRController._createWidget();
                document.getElementById("detail-enable-btn").parentNode.insertBefore(cb, document.getElementById("detail-enable-btn"));
            }

            cb.addonReport = ACRController._addonReport;

            if (cb.addonReport && cb.addonReport.type == "plugin")
            {
                cb.parentNode.removeChild(cb);
                return;
            }

            try { cb.invalidate(); } catch (e) { ACR.Logger.warn(e); }
        }

        gViewController.updateCommands();
    }

    //if (ACRController._stuffTimeout) clearTimeout(stuffer);
    //ACRController._stuffTimeout = setTimeout(stuffer, 200);
    stuffer();
}

/**
 * This function called when user selects any extension in the legacy (<= FF 3.6) extension manager.
 *
 * Ensure the compatibilityButton binding is in the correct state, then add to the right place in the selected extension's ui.
 */
ACRController._invalidateCompatibilityButtonLegacyEM = function()
{
    ACR.Logger.debug("In ACRController._invalidateCompatibilityButtonLegacyEM()");

    if (ACRController._compatibilityButton && ACRController._compatibilityButton.parentNode)
    {
        ACRController._compatibilityButton.parentNode.removeChild(ACRController._compatibilityButton);
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

    ACRController._addonReport = ACR.AddonReportStorage.getAddonReport(selectedExtensionGUID, selectedExtensionVersion);
    ACRController._addonReport.name = elemExtension.getAttribute("name");
    ACRController._addonReport.compatible = elemExtension.getAttribute("compatible") == "true";

    ACR.Logger.debug("Addon name is " + ACRController._addonReport.name);
    ACR.Logger.debug("Addon " + (ACRController._addonReport.compatible?"IS":"IS NOT") + " compatible with this version of platform.");
    ACR.Logger.debug("Factory says addon '" + ACRController._addonReport.guid + "/" + selectedExtensionVersion + "' has state '" + ACRController._addonReport.state + "'");

    if (!ACRController._compatibilityButton)
    {
        ACRController._compatibilityButton = ACRController._createWidget();
    }

    ACRController._compatibilityButton.addonReport = ACRController._addonReport;

    try 
    {
        ACRController._compatibilityButton.invalidate();
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

            elemSelectedButtons.insertBefore(ACRController._compatibilityButton,
                                             elemSelectedButtons.childNodes[i]);
            break;
        }
    }
}

addEventListener("load", ACRController.init, false);

if (!ACRController.isLegacyEM())
{
    // add any acr commands

    gViewController.commands["cmd_showCompatibilityResults"] = {
        isEnabled: function(aAddon) {
            if (!aAddon || aAddon.type == "plugin")
                return false;
            return true;
        },
        doCommand: function(aAddon) {
            openURL(ACRController._COMPATIBILITY_REPORT_URL_BASE + encodeURIComponent(aAddon.id));
        }
    };

    gViewController.commands["cmd_clearCompatibilityReport"] = {
        isEnabled: function(aAddon) {
            if (!aAddon || aAddon.type == "plugin")
                return false;

            var addonReport = ACR.AddonReportStorage.getAddonReportByAddon(aAddon);
            
            if (!addonReport || addonReport.state == 0)
                return false;

            return true;
        },
        doCommand: function(aAddon) {
            if (aAddon)
            {
                var addonReport = ACR.AddonReportStorage.getAddonReportByAddon(aAddon);
                ACR.AddonReportStorage.deleteAddonReport(addonReport);

                ACRController._addonReport = ACR.AddonReportStorage.getAddonReportByAddon(aAddon);
                ACRController._invalidateCompatibilityButtons();
            }
        }
    };


    // override this method for bug 678787

    gSearchView.show = function(aQuery, aRequest)
    {
        Components.utils.import("resource://acr/modules/CustomAddonRepository.jsm");
        ACR.Logger.debug("[CustomAddonRepository.jsm] Loaded");

        gEventManager.registerInstallListener(this);

        this.showEmptyNotice(false);
        this.showAllResultsLink(0);
        this.showLoading(true);
        this._sorters.showprice = false;

        gHeader.searchQuery = aQuery;
        aQuery = aQuery.trim().toLocaleLowerCase();
        if (this._lastQuery == aQuery) {
          this.updateView();
          gViewController.notifyViewChanged();
          return;
        }
        this._lastQuery = aQuery;

        if (AddonRepository.isSearching)
          AddonRepository.cancelSearch();

        while (this._listBox.firstChild.localName == "richlistitem")
          this._listBox.removeChild(this._listBox.firstChild);

        var self = this;
        gCachedAddons = {};
        this._pendingSearches = 2;
        this._sorters.setSort("relevancescore", false);

        var elements = [];

        function createSearchResults(aObjsList, aIsInstall, aIsRemote) {
          aObjsList.forEach(function(aObj) {
            let score = 0;
            if (aQuery.length > 0) {
              score = self.getMatchScore(aObj, aQuery);
              if (score == 0 && !aIsRemote)
                return;
            }

            let item = createItem(aObj, aIsInstall, aIsRemote);
            item.setAttribute("relevancescore", score);
            if (aIsRemote) {
              gCachedAddons[aObj.id] = aObj;
              if (aObj.purchaseURL)
                self._sorters.showprice = true;
            }

            elements.push(item);
          });
        }

        function finishSearch(createdCount) {
          if (elements.length > 0) {
            sortElements(elements, [self._sorters.sortBy], self._sorters.ascending);
            elements.forEach(function(aElement) {
              self._listBox.insertBefore(aElement, self._listBox.lastChild);
            });
            self.updateListAttributes();
          }

          self._pendingSearches--;
          self.updateView();

          if (!self.isSearching)
            gViewController.notifyViewChanged();
        }

        getAddonsAndInstalls(null, function(aAddons, aInstalls) {
          if (gViewController && aRequest != gViewController.currentViewRequest)
            return;

          createSearchResults(aAddons, false, false);
          createSearchResults(aInstalls, true, false);
          finishSearch();
        });

        var maxRemoteResults = 0;
        try {
          maxRemoteResults = Services.prefs.getIntPref(PREF_MAXRESULTS);
        } catch(e) {}

        if (maxRemoteResults <= 0) {
          finishSearch(0);
          return;
        }

        AddonRepository.searchAddons(aQuery, maxRemoteResults, {
          searchFailed: function() {
            ACR.Logger.debug("[CustomAddonRepository.jsm] searchFailed");

            if (gViewController && aRequest != gViewController.currentViewRequest)
              return;

            self._lastRemoteTotal = 0;

            // XXXunf Better handling of AMO search failure. See bug 579502
            finishSearch(0); // Silently fail
          },

          searchSucceeded: function(aAddonsList, aAddonCount, aTotalResults) {
            ACR.Logger.debug("[CustomAddonRepository.jsm] searchSucceeded, " + aTotalResults + " results");

            if (gViewController && aRequest != gViewController.currentViewRequest)
              return;

            if (aTotalResults > maxRemoteResults)
              self._lastRemoteTotal = aTotalResults;
            else
              self._lastRemoteTotal = 0;

            var createdCount = createSearchResults(aAddonsList, false, true);
            finishSearch(createdCount);
          }
        });
    };
}
