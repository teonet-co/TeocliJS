/* 
 * Typescript Teocli class definition
 */

export default class Teocli {

    ws: WebSocket;
    client_name: string;

    constructor(ws: WebSocket);

    onopen(ev: any): void;
    onclose(ev: any): void;
    onerror(ev: any): void;
    onother(err: any, data: any): number;

    login(client_name: string): void;
    echo(to: string, msg: string): void;
}
