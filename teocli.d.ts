/** 
 * Typescript Teocli class definition
 */

export default class Teocli {

    CMD: any;
    ws: WebSocket;

    constructor(ws: WebSocket);

    onopen(ev: any): void;
    onclose(ev: any): void;
    onerror(ev: any): void;
    onother(err: any, data: any): number;    
    onecho(err: any, data: any): number;
    onclients(err: any, data: any): number;

    process(data:any): number;
    
    login(client_name: string): void;
    echo(to: string, msg: string): void;
    clients(to: string): void;
    send(data: any): boolean;
    
    /**
     * Send authentication request to peer (or L0 server)
     *
     * @param {string} to Peer name or L0 webserver if empty string
     * @param {string} method HTTP request method 'POST' or 'GET'
     * @param {string} url Part of authentication url: register-client, register, login, refresh
     * @param {string} data Authentication data rquered by URL
     * @param {string} headers Basic authentication header or emty string if not rquered
     * @param {number} timeout Result timeout
     * @param {any} callback Result callback function
     */
    auth(to: string, method: string, url:string, data: string, headers: string, 
         timeout: number, callback: any): void;    
}
