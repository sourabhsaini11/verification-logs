export interface LogVerificationPayload {
  domain: string;
  version: string;
  flow: string;
  bap_id: string;
  bpp_id: string;
  payload: Record<string, any>;
}

export interface IssueComment {
  comment: string;
  type: string;
}

export interface LogVerificationResponse {
  response: string;
  domain: string | null;
  required: Record<string, string[]> | null;
}
