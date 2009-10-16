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

ACR.RPC.Net = function()
{
    // public instance variables
    this.onComplete = function(rpc, result, response, type, request) {};
    this.status = ACR.RPC.Constants.ACR_RPC_NET_CREATED;
    this.id = ((new Date()).getTime() - 1169730000000) + "" + (Math.round(1000*Math.random())+1000);

    // private instance variables
    this._url = '';
    this._method = 'GET';
    this._basicAuthUsername = '';
    this._basicAuthPassword = '';
    this._queryString = '';
    this._postData = '';
    this._type = null;
    this._headers = {};

    this._request = null;
    this._logger = null;

    this.finished = function(result, response, request)
    {
        this._logger.debug('ACR.RPC.Net.finished: ' + this.id + ': finished');
        this.status = ACR.RPC.Constants.ACR_RPC_NET_FINISHED;
        this.onComplete(this, result, response, this._type, request);
    };

    this.failed = function(errorCode, errorMessage, data)
    {
        this._logger.debug('ACR.RPC.Net.failed: ' + this.id + ': failed');
        this.status = ACR.RPC.Constants.ACR_RPC_NET_FINISHED;
        var response = {errorCode: errorCode, errorMessage: errorMessage, data: data};
        this.onComplete(this, ACR.RPC.Constants.ACR_RPC_NET_FAILURE, response, this._type, null);
    };

    this.ready = function (rpcnetrequest)
    {
        var rpcnet = this;

        try
        {
            //rpc._logger.debug('ACR.RPC.Net.send.onreadystatechange: ' + rpc.id + ': readyState = ' + rpcnetrequest.readyState);
            if (rpcnetrequest.readyState != 4) { return; }
        }
        catch (e) 
        {
            rpcnet._logger.error('ACR.RPC.Net.send.onreadystatechange: ' + rpcnet.id + ': error in readyState: ' + e);
            rpcnet.failed(ACR.RPC.Constants.ACR_RPC_NET_ERROR_XHR_CONNECTION);
            return;
        }

        var result = ACR.RPC.Constants.ACR_RPC_NET_SUCCESS;
        var status = 0;
        var response = null;
        var lastErr = null;

        try 
        {
            status = rpcnetrequest.status;
        }
        catch (e)
        {
            rpcnet._logger.error('ACR.RPC.Net.send.onreadystatechange: ' + rpcnet.id + ': no http status... a protocol error occured');
            rpcnet.failed(ACR.RPC.Constants.ACR_RPC_NET_ERROR_HTTP);
            return;
        }

        try
        {
            if (rpcnetrequest.responseText != "")
                response = JSON.parse(rpcnetrequest.responseText);
            else
                response = "";
        }
        catch (e)
        {
            rpcnet._logger.error('ACR.RPC.Net.send.onreadystatechange: ' + rpcnet.id + ": can't parse JSON response... '" + e + "'");
            lastErr = e;
        }

        rpcnet._logger.debug('ACR.RPC.Net.send.onreadystatechange: ' + rpcnet.id + ': completed, status = ' + status);
        rpcnet._logger.debug('ACR.RPC.Net.send.onreadystatechange: ' + rpcnet.id + ": completed, response text = '" + rpcnetrequest.responseText + "'");

        if (
            (rpcnet._method == 'DELETE' && (status == 303))
            || (rpcnet._method == 'DELETE' && (status == 410))
            || (status >= 200 && status <= 300)
            )
        {
            if (response != null)
            {
                // everything went successfully
                rpcnet.finished(ACR.RPC.Constants.ACR_RPC_NET_SUCCESS, response, rpcnetrequest);
                return;
            }
            else
            {
                // application error (bad xml)
                rpcnet.failed(ACR.RPC.Constants.ACR_RPC_SERVICE_ERROR_BAD_XML, lastErr, response);
                return;
            }
        }

        // try to get an error message in response error -> lastErr

        try 
        {
            lastErr = response.error + ": " + response.details;
            rpcnet._logger.debug('ACR.RPC.Net.send.onreadystatechange: ' + rpcnet.id + ": completed, response error message = '" + lastErr + "'");
        }
        catch (e)
        {
            rpcnet._logger.debug('ACR.RPC.Net.send.onreadystatechange: ' + rpcnet.id + ": have an error status code (" + status + "), but there is no error message in the XML response");
            lastErr = null;
        }

        if (status == 400)
        {
            rpcnet.failed(ACR.RPC.Constants.ACR_RPC_SERVICE_ERROR_BAD_REQUEST, lastErr, response);
            return;
        }
        else if (status == 401)
        {
            rpcnet.failed(ACR.RPC.Constants.ACR_RPC_SERVICE_ERROR_UNAUTHORIZED, lastErr, response);
            return;
        }
        else if (status == 403)
        {
            rpcnet.failed(ACR.RPC.Constants.ACR_RPC_SERVICE_ERROR_FORBIDDEN, lastErr, response);
            return;
        }
         else if (status == 404)
        {
            rpcnet.failed(ACR.RPC.Constants.ACR_RPC_SERVICE_ERROR_NOT_FOUND, lastErr, response);
            return;
        }
         else if (status == 409)
        {
            rpcnet.failed(ACR.RPC.Constants.ACR_RPC_SERVICE_ERROR_CONFLICT, lastErr, response);
            return;
        }
         else if (status == 422)
        {
            rpcnet.failed(ACR.RPC.Constants.ACR_RPC_SERVICE_ERROR_BAD_CONTEXT, lastErr, response);
            return;
        }
         else if (status == 500)
        {
            rpcnet.failed(ACR.RPC.Constants.ACR_RPC_SERVICE_ERROR_INTERNAL_SERVER_ERROR, lastErr, response);
            return;
        }
        else
        {
            rpcnet.failed(ACR.RPC.Constants.ACR_RPC_SERVICE_ERROR_CRITICAL_ERROR, lastErr, response);
            return;
        }
    };
}

ACR.RPC.Net.prototype.registerLogger = function(logger)
{
    this._logger = logger;
}

ACR.RPC.Net.prototype.setUrl = function(url)
{
    this._url = url;
}

ACR.RPC.Net.prototype.setType = function(type)
{
    this._type = type;
}

ACR.RPC.Net.prototype.setPostData = function(args)
{
    this._postData = '';

    if (args.constructor == Array)
    {
        for (var i in args)
        {
            this._postData += ACR.Util.encodeURL(i) + '=' + ACR.Util.encodeURL(args[i]) + '&';
        }

        if ('&' == this._postData.charAt(this._postData.length-1))
        {
            this._postData = this._postData.substring(0,this._postData.length-1);
        }
    }
    else
    {
        this._postData = args;
    }
}

ACR.RPC.Net.prototype.setArguments = function(args)
{
    this._queryString = '';

    for (var i in args)
    {
        this._queryString += ACR.Util.encodeURL(i) + '=' + ACR.Util.encodeURL(args[i]) + '&';
    }

    if ('&' == this._queryString.charAt(this._queryString.length-1))
    {
        this._queryString = this._queryString.substring(0,this._queryString.length-1);
    }
}

ACR.RPC.Net.prototype.setMethod = function(method)
{
    if (method == 'POST')
    {
        this._method = 'POST';
    }
    else if (method == 'DELETE')
    {
        this._method = 'DELETE';
    }
    else if (method == 'PUT')
    {
        this._method = 'PUT';
    }
    else 
    {
        this._method = 'GET';
    }

    this._method = method;
}

ACR.RPC.Net.prototype.setHeader = function(header, value)
{
    this._headers[header] = value;
}

ACR.RPC.Net.prototype.setCredentials = function(username, password)
{
    this._basicAuthUsername = username;
    this._basicAuthPassword = password;
}

ACR.RPC.Net.prototype.send = function()
{
    var rpcnet = this;

    rpcnet.status = ACR.RPC.Constants.ACR_RPC_NET_INPROGRESS;

    //rpc._logger.debug('ACR.RPC.Net.send: ' + rpc.id + ': creating ' + rpc._method + ' XMLHttpRequest');

    var rpcnetrequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);

    if (!rpcnetrequest) { rpcnet.failed(ACR.RPC.Constants.ACR_RPC_NET_ERROR_XHR_CREATE); }

    rpcnetrequest.mozBackgroundRequest = true;

    var postData = null;
    var url = rpcnet._url;

    if (('POST' == rpcnet._method || 'PUT' == rpcnet._method)
        && rpcnet._postData.length > 0)
    {
        postData = rpcnet._postData;
    }
    else if (rpcnet._queryString && (rpcnet._queryString.length > 0))
    {
        url += "?" + rpcnet._queryString;
    }

    rpcnet._logger.debug('ACR.RPC.Net.send: ' + rpcnet.id + ': opening ' + rpcnet._method + ' XMLHttpRequest to ' + url);

    try
    {
        rpcnetrequest.open(rpcnet._method, url, true);
    }
    catch (e)
    {
        rpcnet._logger.error('ACR.RPC.Net.send: ' + rpcnet.id + ': error opening connection: ' + e);
        rpcnet.failed(ACR.RPC.Constants.ACR_RPC_NET_ERROR_XHR_CREATE);
        return;
    }

    if ('POST' == rpcnet._method)
    {
        rpcnetrequest.setRequestHeader('Content-type', 'application/json');
    }

    if (('POST' == rpcnet._method || 'PUT' == rpcnet._method) && postData)
    {
        rpcnetrequest.setRequestHeader('Content-length', postData.length);
    }

    for (var header in rpcnet._headers)
    {
        //rpcnet._logger.debug('ACR.RPC.Net.send: ' + rpcnet.id + ': adding custom header ' + header + ': ' + rpcnet._headers[header]);
        rpcnetrequest.setRequestHeader(header, rpcnet._headers[header]);
    }

    if ('' != rpcnet._basicAuthUsername) {
        rpcnet._logger.debug('ACR.RPC.Net.send: using credentials for ' + rpcnet._basicAuthUsername);
        rpcnetrequest.setRequestHeader('Authorization', 'Basic ' + btoa(rpcnet._basicAuthUsername + ':' + rpcnet._basicAuthPassword));
    }

    rpcnetrequest.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 2005 00:00:00 GMT");

    // Cache-Control: no-cache ?
    //rpcnetrequest.overrideMimeType('text/xml');

    rpcnetrequest.onreadystatechange = function() { rpcnet.ready(rpcnetrequest); };

    rpcnet._logger.debug('ACR.RPC.Net.send: ' + rpcnet.id + ': sending XMLHttpRequest ' + (postData?' with data "' + postData + '"':''));

    // have to send as binary, otherwise moz stuffs a charset in the content-type header, which is rejected by the api

    rpcnetrequest.sendAsBinary(postData);
}
