export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type MailSendResult = {
  provider: string;
  ok: boolean;
  error?: string;
};

export type MailProvider = {
  name: string;
  send: (msg: MailMessage, cfg?: import("../mailRuntimeConfig").MailRuntimeConfig) => Promise<MailSendResult>;
};
