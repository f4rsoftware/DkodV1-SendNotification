const axios = require("axios");
const Url = require("url-parse");

/**
 * Creates a NetGsm instance.
 * @param {Object} options Configuration options
 * @param {String} options.baseUrl The url of the source default (https://api.netgsm.com.tr)
 * @param {String} options.usercode The API user that allowed to use api
 * @param {String} options.password The api user password
 * @param {String} options.msgheader Message header that will be used on sms (That one cant be empty or random)
 * @param {String} [options.apiVersion] The NetGsm API version to use
 * @param {Boolean|Object} [options.autoLimit] Limits the request rate
 * @param {Number} [options.timeout] The request timeout
 * @constructor
 * @public
 */
function NetGsm(options) {
  if (!(this instanceof NetGsm)) return new NetGsm(options);
  if (!options || !options.usercode || !options.password) {
    throw new Error("Missing or invalid options");
  }
  this._setDefaultsOptions(options);
  console.log(options.usercode, options.password);
}

/**
 * GET requests
 *
 * @param  {String} endpoint
 * @param  {Object} params
 * @return {Object}
 */
NetGsm.prototype.get = function get(endpoint, params = {}) {
  return this.request("get", endpoint, null, {
    usercode: this.usercode,
    password: this.password,
    msgheader: this.msgheader,
    ...params,
  });
};

/**
 * POST requests
 *
 * @param  {String} endpoint
 * @param  {Object} data
 * @param  {Object} params
 *
 * @return {Object}
 */
NetGsm.prototype.post = function post(endpoint, data, params = {}) {
  return this.request("post", endpoint, data, {
    usercode: this.usercode,
    password: this.password,
    msgheader: this.msgheader,
    ...params,
  });
};

/**
 * PUT requests
 *
 * @param  {String} endpoint
 * @param  {Object} data
 * @param  {Object} params
 *
 * @return {Object}
 */
NetGsm.prototype.put = function put(endpoint, data, params = {}) {
  return this.request("put", endpoint, data, {
    usercode: this.usercode,
    password: this.password,
    msgheader: this.msgheader,
    ...params,
  });
};

/**
 * DELETE requests
 *
 * @param  {String} endpoint
 * @param  {Object} params
 * @param  {Object} params
 *
 * @return {Object}
 */
NetGsm.prototype.delete = function remove(endpoint, params = {}) {
  return this.request("delete", endpoint, null, {
    usercode: this.usercode,
    password: this.password,
    msgheader: this.msgheader,
    ...params,
  });
};

/**
 * Set default options
 *
 * @param {Object} opt
 */
NetGsm.prototype._setDefaultsOptions = function _setDefaultsOptions(opt) {
  this.baseUrl = opt.baseUrl || "https://api.netgsm.com.tr";
  this.isHttps = /^https/i.test(this.baseUrl);
  this.msgheader = opt.msgheader || "";
  this.encoding = opt.encoding || "utf8";
  //   this.grant_type = opt.grant_type || "password";
  this.usercode = opt.usercode || "";
  this.password = opt.password || "";
  this.queryStringAuth = opt.queryStringAuth || false;
  this.timeout = opt.timeout || 60000;
  this.axiosConfig = opt.axiosConfig || {};
};

NetGsm.prototype._getUrl = function _getUrl(endpoint, params) {
  console.log(endpoint, params);
  let url = this.baseUrl.slice(-1) === "/" ? this.baseUrl : this.baseUrl + "/";
  url = url + endpoint;

  return this._normalizeQueryString(url, params);
};

NetGsm.prototype._normalizeQueryString = function _normalizeQueryString(
  url,
  params
) {
  // Exit if don't find query string.
  if (url.indexOf("?") === -1 && Object.keys(params).length === 0) {
    return url;
  }

  const query = new Url(url, null, true).query;
  const values = [];

  let queryString = "";

  // Include params object into URL.searchParams.
  this._parseParamsObject(params, query);

  for (const key in query) {
    values.push(key);
  }
  values.sort();

  for (const i in values) {
    if (queryString.length) {
      queryString += "&";
    }

    queryString += encodeURIComponent(values[i])
      .replace(/%5B/g, "[")
      .replace(/%5D/g, "]");
    queryString += "=";
    queryString += encodeURIComponent(query[values[i]]);
  }

  return url.split("?")[0] + "?" + queryString;
};

NetGsm.prototype.request = function request(
  method,
  endpoint,
  data,
  params = {}
) {
  const url = this._getUrl(endpoint, params);
  const headers = {
    Accept: "application/json",
  };
  // only set "User-Agent" in node environment
  // the checking method is identical to upstream axios
  if (
    typeof process !== "undefined" &&
    Object.prototype.toString.call(process) === "[object process]"
  ) {
    headers["User-Agent"] = "NetGsm REST API - JS Client";
  }

  let options = {
    url: url,
    method: method,
    responseEncoding: this.encoding,
    timeout: this.timeout,
    responseType: "json",
    headers,
  };

  if (data) {
    options.headers["Content-Type"] = "application/json;charset=utf-8";
    options.data = JSON.stringify(data);
  }

  // Allow set and override Axios options.
  options = { ...options, ...this.axiosConfig };
  return axios(options);
};

/**
 * Parse params object.
 *
 * @param {Object} params
 * @param {Object} query
 */
NetGsm.prototype._parseParamsObject = function _parseParamsObject(
  params,
  query
) {
  for (const key in params) {
    const value = params[key];

    if (typeof value === "object") {
      for (const prop in value) {
        const itemKey = key.toString() + "[" + prop.toString() + "]";
        query[itemKey] = value[prop];
      }
    } else {
      query[key] = value;
    }
  }

  return query;
};

module.exports = NetGsm;
