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
 * The Original Code is ACR.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): David McNamara
 *                 Brian King
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

ACR.RPC = new function() {}

ACR.RPC.Service = function()
{
    // private instance variables
    this._observers = new Array();
    this._logger = null;
    this._serviceDocument = null;
    this._serviceRootURL = ACR.RPC.Constants.ACR_RPC_SERVICE_BASE.replace("%%AMO_HOST%%", ACR.Preferences.getPreference("amo_host"));

    this.rpcComplete = function(rpcnet, result, response, type, callback)
    {
        var service = this;

        service._logger.debug("ACR.RPC.Service: got rpc complete (id=" + (rpcnet?rpcnet.id:"null") + ",s=" + (rpcnet?rpcnet.status:"null") + ") of type = " + type + " and status = " + result);

        var event = new ACR.RPC.Event(type, result, response);

        if (result == ACR.RPC.Constants.ACR_RPC_NET_FAILURE)
        {
            // response is error code
            service._logger.debug("ACR.RPC.Service: complete is error with error code: " + response.errorCode + ", message: " + response.errorMessage);
            event.error = new ACR.RPC.Error(response.errorCode, response.errorMessage);
            event._response = response.data;
        }
        
        // CALLBACK TYPE 1: if we have a callback, call it

        if (callback && typeof(callback) == 'function')
        {
            callback(event);
        }

        // CALLBACK TYPE 2: if we have observers, notify them

        if (!event.isInternalEvent)
            service.notifyObservers(event);
    };

    this.rpcCompleteWithError = function(rpcnet, errorCode, type)
    {
        this.rpcComplete(rpcnet, ACR.RPC.Constants.ACR_RPC_RPC_FAILURE, errorCode, type);
    }

    this.notifyObservers = function(event)
    {
        //for (var i=0; i<this._observers.length; i++)
        for (var id in this._observers)
        {
            if (this._observers[id])
            {
                try
                {
                    this._observers[id](event);
                }
                catch (e)
                {
                    this._logger.error("ACR.RPC.Service.onComplete: error notifying observer: " + e);
                    //ACR.Util.dumpObject(e);
                }
            }
        }
    };

    this.rpcSend = function(type, callback, actionUrl, method, data, url, credentials)
    {
        var service = this;

        var rpcnet = new ACR.RPC.Net();

        rpcnet.registerLogger(service._logger);
        var isLogin = (type == ACR.RPC.Constants.ACR_RPC_EVENT_TYPE_ACR_RPC_LOGIN_COMPLETE);
        service._logger.debug("ACR.RPC.Service: request going to : " + actionUrl);
        rpcnet.setUrl(actionUrl);
        rpcnet.setType(type);

        if (method && method == "POST")
        {
            rpcnet.setMethod("POST");
            rpcnet.setPostData(data);
        }
        else if (method == "DELETE")
        {
            rpcnet.setMethod("DELETE");
        }
        else if (method == "PUT")
        {
            rpcnet.setMethod("PUT");
            rpcnet.setPostData(data);
        }
        else
        {
            rpcnet.setMethod("GET");

            if (ACR.RPC.Constants.ACR_RPC_ENABLE_CACHE_BUSTER)
            {
                if (data == null)
                    data = [];

                data["__"] = (new Date()).getTime();
            }

            rpcnet.setArguments(data);
        }

        if (credentials)
        {
            rpcnet.setCredentials(credentials.login, credentials.password);
        }

        rpcnet.onComplete = function(rpc, result, response, type) { service.rpcComplete(rpc, result, response, type, callback); };

        // send immediately
        service._logger.debug("ACR.RPC.Service: sending rpc immediately");
        rpcnet.send();
    };

    this.createAction = function(action, replacements)
    {
        if (replacements)
        {
            for (var i=0; i<replacements.length; i++)
            {
                action = action.replace("%" + (i+1), encodeURIComponent(replacements[i]));
            }
        }

        return action;
    };

    this.getUniqueId = function()
    {
        var id = ((new Date()).getTime() - 1169730000000) + "" + (Math.round(1000*Math.random())+1000);
        return id;
    };
}

/* 
 * Public Utility Methods
 */

ACR.RPC.Service.prototype.registerLogger = function(logger)
{
    this._logger = logger;
}

ACR.RPC.Service.prototype.registerObserver = function(observer)
{
    var id = this.getUniqueId();

    this._observers[id] = observer;

    this._logger.info('ACR.RPC.Service.registerObserver: adding observer, id = ' + id);

    return id;
}

ACR.RPC.Service.prototype.unregisterObserver = function(observerId)
{
    for (var i in this._observers)
    {
        if (i == observerId)
        {
            this._observers[observerId] = null;
            this._logger.debug('ACR.RPC.Service.unregisterObserver: removed observer, id = ' + observerId);
            return;
        }
    }
}

/*
 * ACR Protocol Methods Below Here
 */

ACR.RPC.Service.prototype.submitReport = function(guid, worksProperly, appGUID, appVersion, appBuild, clientOS, comments, otherAddons, callback)
{
    var service = this;

    ACR.Logger.debug("ACR.RPC.Service.submitReport: guid = '" + guid + "', worksProperly = " + worksProperly);

    var data = {
        guid: guid,
        worksProperly: worksProperly,
        appGUID: appGUID,
        appVersion: appVersion,
        appBuild: appBuild,
        clientOS: clientOS,
        comments: comments,
        otherAddons: otherAddons
    };

    var internalCallback = function(event)
    {
        // don't need to do anything here
        if (callback)
            callback(event);
    }

    this.rpcSend(ACR.RPC.Constants.ACR_RPC_EVENT_TYPE_SUBMIT_REPORT_COMPLETE, 
                 internalCallback, 
                 service._serviceRootURL + ACR.RPC.Constants.ACR_RPC_SUBMIT_REPORT,
                 "POST",
                 JSON.stringify(data));
}


