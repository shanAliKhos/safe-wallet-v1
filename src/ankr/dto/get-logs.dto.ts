import { Event, EventInput, Log } from './common.dto';

export interface GetLogsParams {
  blockchain?: string | string[];
  address?: string | string[];
  fromBlock?: string | number;
  toBlock?: string | number;
  fromTimestamp?: number;
  toTimestamp?: number;
  topics?: (string | string[])[][];
  decodeLogs?: boolean;
  descOrder?: boolean;
  pageSize?: string | number;
  pageToken?: string;
}

export type { Event, EventInput, Log };

export interface GetLogsResponse {
  logs: Log[];
  nextPageToken?: string;
}

