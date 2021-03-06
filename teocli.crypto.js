/*
 * The MIT License
 *
 * Copyright 2017 Kirill Scherba <kirill@scherba.ru>.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/* global CryptoJS */

var TeocliCrypto = (function () {
    
  var CryptoJS;
  
  function TeocliCrypto(cryptojs) { 
      CryptoJS = cryptojs;
  }
    
  TeocliCrypto.prototype.decrypt = function (text, secret) {

    var ciphertext = CryptoJS.enc.Hex.parse(text); // text in hex
    var salt = CryptoJS.lib.WordArray.create(0); // empty array
    var decrypted = CryptoJS.AES.decrypt({ciphertext: ciphertext, salt: salt}, secret);

    return decrypted.toString(CryptoJS.enc.Utf8);
  };

  TeocliCrypto.prototype.encrypt = function (data, secret) {

    var text = JSON.stringify(data);

    var salt = CryptoJS.lib.WordArray.create(0); // empty array
    var params = CryptoJS.kdf.OpenSSL.execute(secret, 256 / 32, 128 / 32, salt);
    var encrypted = CryptoJS.AES.encrypt(text, params.key, {iv: params.iv});

    return {data: encrypted.ciphertext.toString()};
  };

  TeocliCrypto.prototype.hash = function (text) {
    return CryptoJS.SHA512(text).toString();
  };
  
  TeocliCrypto.prototype.MD5 = function (text) {
    return CryptoJS.MD5(text);
  };
  
  TeocliCrypto.prototype.hash_short = function (text) {
    return CryptoJS.SHA1(text).toString();
  };

  return TeocliCrypto;
  
}());
export { TeocliCrypto };

