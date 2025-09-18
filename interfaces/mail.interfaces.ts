export interface Mail {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  fromName?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    cid?: string;
  }>;
}
