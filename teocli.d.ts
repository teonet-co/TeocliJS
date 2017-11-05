/* 
 * Typescript Teocli class definition
 */

export default class Teocli {

    CMD: any;
    ws: WebSocket;
    client_name: string;

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
}
