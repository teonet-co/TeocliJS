/** 
 * Typescript TeocliCrypt class definition
 */
export declare class TeocliCrypto {

    constructor(cryptojs: any);

    /**
     * Decrypt text with CryptoJS AES
     *
     * @param {string} text
     * @param {string} secret
     *
     * @returns {string}
     */
    decrypt(text: string, secret: string): string;

    /**
     * Encrypt object with CryptoJS AES
     *
     * @param {any} data
     * @param {string} secret
     *
     * @returns {any}
     */
    encrypt(data: any, secret: string): any;

    /**
     * Get hash of string with CryptoJS SHA512
     * 
     * @param {string} text Input text
     * @return {string} Hash of input string
     */
    hash(text: string): string;
    
    /**
     * Get hash of string with MD5
     * 
     * @param {string} text Input text
     * @return {string} Hash of input string
     */
    MD5(text: string): any;
}