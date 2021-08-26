import { HttpsProxyAgent, HttpsProxyAgentOptions } from "https-proxy-agent";
import { ClientRequest, RequestOptions } from 'agent-base';
import { Socket } from "net";

export class HttpsProxyAgentWithCa extends HttpsProxyAgent {
  private ca: string | Buffer | (string | Buffer)[] | undefined;

  constructor(opts: HttpsProxyAgentOptions) {
    super(opts);
    this.ca = opts.ca;
  }

  async callback(req: ClientRequest, opts: RequestOptions): Promise<Socket> {
      return super.callback(req, Object.assign(opts, { ca: this.ca }));
  }
}
