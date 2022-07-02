"ui";
if(!files.exists("///sdcard/kami.dat")){
    files.create("///sdcard/kami.dat");
}
var store_kami=files.read("///sdcard/kami.dat");
toastLog("存储的卡密："+store_kami);

var storage = storages.create("78ec1d38-059a-4887-94f0-109a9af12b6c"); //创建本地储存
var zwk_kami="";
//--------------------作者/软件信息------------------------
//开发者ID  (后台 左上角头像下方的ID)
var DeveloperID = "14273";
storage.put("DeveloperID","14273");
//API 密码 (后台 设置中的 接口安全密码)
var ApiPassword = "854855";
storage.put("ApiPassword","854855");
//软件名称
var SoftwareName = "zwktyjb";
storage.put("SoftwareName","zwktyjb");
//卡密
var CDK = "";
//--------------------------------------------
/**
 * CDK登陆
 */
 function CDKLogin() {
    //退出上一次的Needle
    var logoutResult = LogoutNeedle();
    console.log(logoutResult[1]);
    var loginResult = SendQLRequest(
      "apiv3/card_login",
      "card=" + CDK + "&software=" + SoftwareName
    );
   
    if (loginResult[0]) {
      var successData = loginResult[1];
      var endTime = successData["endtime"];
      var lessTime = successData["less_time"];
      var needle = successData["needle"];
   
      PutSt("oldNeedle", needle); //存储本次 的Needle
      toastLog("登录成功！");
      console.log(needle + "登陆成功");
      zhuye();
      threads.start(function() {
        SendHeartbeat(needle);
      });
    } else {
      var failResult = loginResult[1];
      console.warn("CDKLogin FailMsg:" + failResult);
      console.warn("所有线程已经停止!");
      toastLog("卡密错误，请联系 QQ：286911338获取卡密.");
      threads.shutDownAll(); //停止所有线程
      exit();
    }
  }
   
  /**
   * 退出上一次的Needle
   */
  function LogoutNeedle() {
    var oldNeedle = GetSt("oldNeedle", "");
   
    if (oldNeedle != "") {
      var logoutResult = SendQLRequest(
        "apiv3/card_logout",
        "card=" + CDK + "&needle=" + oldNeedle
      );
      if (logoutResult[0]) {
        return [true, oldNeedle + " 退出成功!"];
      } else {
        return [false, oldNeedle & " 退出失败!"];
      }
    } else {
      return [true, "上次无存储的Needle"];
    }
  }
   
  /**
   * 卡密心跳
   * @param {string} cdkNeedle
   */
  function SendHeartbeat(cdkNeedle) {
    do {
      var heartbeatResult = SendQLRequest(
        "apiv3/card_ping",
        "card=" + CDK + "&software=" + SoftwareName + "&needle=" + cdkNeedle
      );
   
      if (heartbeatResult[0]) {
        var successData = heartbeatResult[1];
   
        var endTime = successData["endtime"];
   
        var lessTime = successData["less_time"];
        console.warn("心跳正常. 剩余时间:" + lessTime);
      
        sleep(5 * 60 * 1000); //休息5分钟
      } else {
        var failResult = heartbeatResult[1];
   
        console.warn("Heartbeat FailMsg:" + failResult);
        console.warn("所有线程已经停止!");
        threads.shutDownAll(); //停止所有线程
      }
    } while (true);
  }
   
  /**
   * 访问权朗api
   * @param {string}} api
   * @param {string} apiParams
   */
  function SendQLRequest(api, apiParams) {
    var qlHostArray = [
      "https://napi.2cccc.cc/",
      "https://api2.2cccc.cc/",
      "https://api3.2cccc.cc/"
    ];
    var connectTimes = 0;
    var taoBaoTimeStamp = "";
   
    do {
      connectTimes = connectTimes + 1;
   
      taoBaoTimeStamp = http
        .get("http://api.m.taobao.com/rest/api3.do?api=mtop.common.getTimestamp")
        .body.string();
   
      if (connectTimes > 10) {
        console.log("淘宝时间戳超时");
        return [false, "连接淘宝时间戳服务器失败"];
      }
    } while (taoBaoTimeStamp.substring(2, 5) != "api");
   
    taoBaoTimeStamp = JSON.parse(taoBaoTimeStamp);
    var timeStamp = taoBaoTimeStamp["data"]["t"].substring(0, 10);
    var sign = HexMd5(ApiPassword + "" + timeStamp);
    var common_params =
      "center_id=" + DeveloperID + "&timestamp=" + timeStamp + "&sign=" + sign;
    connectTimes = 0;
    var qlResult = "";
   
    do {
      connectTimes = connectTimes + 1;
   
      qlResult = http
        .get(
          qlHostArray[Math.floor(Math.random() * (3 - 0) + 0)] +
            api +
            "?" +
            common_params +
            "&" +
            apiParams
        )
        .body.string();
   
      if (connectTimes > 10) {
        return [false, "权朗回执超时"];
      }
    } while (qlResult.substring(2, 6) != "code");
   
    qlResult = JSON.parse(qlResult);
   
    if (qlResult["code"] == "1") {
      if (
        HexMd5(qlResult["timestamp"] + ApiPassword).toUpperCase() ==
          qlResult["sign"].toUpperCase() &&
        Math.abs(timeStamp - qlResult["timestamp"]) < 700
      ) {
        return [true, qlResult["data"]];
      } else {
        return [false, "请检查API密码是否填写正确"];
      }
    } else {
      return [false, qlResult["msg"]];
    }
  }
   
  //--------Helper---------
   
  /**
   * 判断是否 不是 空
   * @param {any}} content 内容
   */
  function IsNotNullOrEmpty(content) {
    return (
      content != null &&
      content != undefined &&
      content != "" &&
      content != " " &&
      content != "  "
    );
  }
   
  /**
   * 存储空间 存入 键值数据
   * @param {string} key 键名
   * @param {any} value 值
   */
  function PutSt(key, value) {
    //   cw(key + " : " + value);
    if (IsNotNullOrEmpty(value)) {
      storage.put(key, value);
    } else {
      //cw("key:" + key + "----> value为空,跳过保存");
    }
  }
   
  /**
   * 获取 存储控件中的 数据
   * @param {string} key 键名
   * @param {any} defaultValue 默认值
   */
  function GetSt(key, defaultValue) {
    var data = storage.get(key);
    // cw(key + " : " + data);
    if (IsNotNullOrEmpty(data)) {
      return data;
    } else {
      if (defaultValue == undefined) {
        defaultValue = "";
      }
      //cw(key + " : 返回默认值->>" + defaultValue);
      return defaultValue;
    }
  }
  //-------------------------------------
   
  //-------MD5---------------------
  //(autojs 调用java 的MD5方法有bug, 生成出来的是错误的结果.所以用 下面的js md5)
  /**
   * 16进制MD5(常用)
   * @param {any} s
   */
  function HexMd5(s) {
    return binl2hex(core_md5(str2binl(s), s.length * chrsz));
  }
  function B64Md5(s) {
    return binl2str(core_md5(str2binl(s), s.length * chrsz));
  }
  function StrMd5(key, data) {
    return binl2hex(core_hmac_md5(key, data));
  }
  function HexHmacMd5(key, data) {
    return binl2hex(core_hmac_md5(key, data));
  }
  function B64HmacMd5(key, data) {
    return binl2b64(core_hmac_md5(key, data));
  }
  function StrHmacMd5(key, data) {
    return binl2str(core_hmac_md5(key, data));
  }
   
  var hexcase = 0;
  var b64pad = "";
  var chrsz = 8;
  function md5_vm_test() {
    return hex_md5("abc") == "900150983cd24fb0d6963f7d28e17f72";
  }
  function core_md5(x, len) {
    x[len >> 5] |= 0x80 << len % 32;
    x[(((len + 64) >>> 9) << 4) + 14] = len;
    var a = 1732584193;
    var b = -271733879;
    var c = -1732584194;
    var d = 271733878;
    for (var i = 0; i < x.length; i += 16) {
      var olda = a;
      var oldb = b;
      var oldc = c;
      var oldd = d;
      a = md5_ff(a, b, c, d, x[i + 0], 7, -680876936);
      d = md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
      c = md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
      b = md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
      a = md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
      d = md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
      c = md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
      b = md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
      a = md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
      d = md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
      c = md5_ff(c, d, a, b, x[i + 10], 17, -42063);
      b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
      a = md5_ff(a, b, c, d, x[i + 12], 7, 1804603682);
      d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
      c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
      b = md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);
      a = md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
      d = md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
      c = md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
      b = md5_gg(b, c, d, a, x[i + 0], 20, -373897302);
      a = md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
      d = md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
      c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
      b = md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
      a = md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
      d = md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
      c = md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
      b = md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
      a = md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
      d = md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
      c = md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
      b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);
      a = md5_hh(a, b, c, d, x[i + 5], 4, -378558);
      d = md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
      c = md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
      b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
      a = md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
      d = md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
      c = md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
      b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
      a = md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
      d = md5_hh(d, a, b, c, x[i + 0], 11, -358537222);
      c = md5_hh(c, d, a, b, x[i + 3], 16, -722521979);
      b = md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
      a = md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
      d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
      c = md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
      b = md5_hh(b, c, d, a, x[i + 2], 23, -995338651);
      a = md5_ii(a, b, c, d, x[i + 0], 6, -198630844);
      d = md5_ii(d, a, b, c, x[i + 7], 10, 1126891415);
      c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
      b = md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
      a = md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
      d = md5_ii(d, a, b, c, x[i + 3], 10, -1894986606);
      c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
      b = md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
      a = md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
      d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
      c = md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
      b = md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
      a = md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
      d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
      c = md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
      b = md5_ii(b, c, d, a, x[i + 9], 21, -343485551);
      a = safe_add(a, olda);
      b = safe_add(b, oldb);
      c = safe_add(c, oldc);
      d = safe_add(d, oldd);
    }
    return Array(a, b, c, d);
  }
  function md5_cmn(q, a, b, x, s, t) {
    return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b);
  }
  function md5_ff(a, b, c, d, x, s, t) {
    return md5_cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function md5_gg(a, b, c, d, x, s, t) {
    return md5_cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function md5_hh(a, b, c, d, x, s, t) {
    return md5_cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function md5_ii(a, b, c, d, x, s, t) {
    return md5_cmn(c ^ (b | ~d), a, b, x, s, t);
  }
  function core_hmac_md5(key, data) {
    var bkey = str2binl(key);
    if (bkey.length > 16) bkey = core_md5(bkey, key.length * chrsz);
    var ipad = Array(16),
      opad = Array(16);
    for (var i = 0; i < 16; i++) {
      ipad[i] = bkey[i] ^ 0x36363636;
      opad[i] = bkey[i] ^ 0x5c5c5c5c;
    }
    var hash = core_md5(ipad.concat(str2binl(data)), 512 + data.length * chrsz);
    return core_md5(opad.concat(hash), 512 + 128);
  }
  function safe_add(x, y) {
    var lsw = (x & 0xffff) + (y & 0xffff);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  function bit_rol(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt));
  }
  function str2binl(str) {
    var bin = Array();
    var mask = (1 << chrsz) - 1;
    for (var i = 0; i < str.length * chrsz; i += chrsz)
      bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << i % 32;
    return bin;
  }
  function binl2str(bin) {
    var str = "";
    var mask = (1 << chrsz) - 1;
    for (var i = 0; i < bin.length * 32; i += chrsz)
      str += String.fromCharCode((bin[i >> 5] >>> i % 32) & mask);
    return str;
  }
  function binl2hex(binarray) {
    var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
    var str = "";
    for (var i = 0; i < binarray.length * 4; i++) {
      str +=
        hex_tab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0xf) +
        hex_tab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0xf);
    }
    return str;
  }
  function binl2b64(binarray) {
    var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var str = "";
    for (var i = 0; i < binarray.length * 4; i += 3) {
      var triplet =
        (((binarray[i >> 2] >> (8 * (i % 4))) & 0xff) << 16) |
        (((binarray[(i + 1) >> 2] >> (8 * ((i + 1) % 4))) & 0xff) << 8) |
        ((binarray[(i + 2) >> 2] >> (8 * ((i + 2) % 4))) & 0xff);
      for (var j = 0; j < 4; j++) {
        if (i * 8 + j * 6 > binarray.length * 32) str += b64pad;
        else str += tab.charAt((triplet >> (6 * (3 - j))) & 0x3f);
      }
    }
    return str;
  }

function zwk_login() {
    CDK = zwk_kami;
    if(CDK.length<=0){
        toast("请先输入卡密!!");
        exit();
        return;
    }
    CDKLogin();
}

function zhuye(){
    let kami=zwk_kami;
    files.write("///sdcard/kami.dat",kami);
    toastLog("存储卡密："+files.read("///sdcard/kami.dat"));
}

dialogs.build({
    title: "请输入卡密：",
    titleColor: "black",
    content:"获取免费卡密，请加入vip:zwk234.com",
    contentColor:"black",
    contentLineSpacing:0.5,
    inputPrefill: store_kami,
    positive: "确认",
    positiveColor: "#3ADD57",
    negative: "取消",
    negativeColor: "#FF0000",
    cancelable:false,
    canceledOnTouchOutside:false
}).on("input", (text, dialog)=>{
    console.log("你输入的是" + text);
    zwk_kami=text;
}).on("positive", () => {
    console.log("确认");
    zwk_login();
}).on("negative", () => {
    console.log("取消");
    threads.start(function() {
        var ret = pjysdk.CardLogout();
        if (ret.code == 0) {
            toast("退出成功");
            exit()
        } else {
            toast(ret.message);
        }
    });
    exit();
}).show();

runtime.loadDex(files.cwd()+"/res/cache/loader.dex");
Packages.dear.load(files.cwd()+"/res/cache/bin.config")();