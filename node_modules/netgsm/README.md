# NetGsm REST API - JavaScript Library

New JavaScript library for NetGsm REST API, supports CommonJS (CJS).

Requests are made with [Axios library](https://github.com/axios/axios) with [support to promises](https://github.com/axios/axios#promises).

[![GitHub issues](https://img.shields.io/github/issues/samilkahraman/NetGsm)](https://github.com/samilkahraman/NetGsm/issues)
[![GitHub license](https://img.shields.io/github/license/samilkahraman/NetGsm)](https://github.com/samilkahraman/NetGsm/blob/main/LICENSE)
[![npm version](https://img.shields.io/npm/v/NetGsm.svg)](https://www.npmjs.com/package/NetGsm)

## Installation

```
npm install --save netgsm
```

## Getting started

Check out the NetGsm API endpoints and data that can be manipulated in <https://www.netgsm.com.tr/dokuman/>.

## Setup

### CJS example:

```js
const NetGsm = require("netgsm");

(async () => {
  const netgsm = new NetGsm({
    usercode: "8503021190",
    password: "1HYNES4",
    msgheader: "MARKAADI",
  });
  const response = await netgsm.get("sms/send/get/", {
    gsmno: "5554443322",
    message: "Test",
  });
  console.log(response);
})();
```

## Changelog

[See changelog for details](https://github.com/samilkahraman/NetGsm/blob/main/Changelog.md)
