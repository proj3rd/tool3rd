/* eslint-disable @typescript-eslint/naming-convention */

export const ID_RENDERER = 'renderer';
export const ID_WORKER = 'worker';

export const CHAN_RENDERER_TO_WORKER = 'rendererToWorker';
export const CHAN_WORKER_ERROR = 'workerError';
export const CHAN_WORKER_TO_RENDERER = 'workerToRenderer';

export const TYPE_DIFF_REQ = 'diffRequest';
export const TYPE_DIFF_SAVE_CANCEL = 'diffSaveCancel';
export const TYPE_DIFF_SAVE_PATH = 'diffSavePath';
export const TYPE_DIFF_SAVE_REQ = 'diffSaveRequest';
export const TYPE_ERROR = 'error';
export const TYPE_FORMAT_REQ = 'formatRequest';
export const TYPE_FORMAT_SAVE_CANCEL = 'formatSaveCancel';
export const TYPE_FORMAT_SAVE_PATH = 'formatSavePath';
export const TYPE_FORMAT_SAVE_REQ = 'formatSaveRequest';
export const TYPE_IE_LIST = 'ieList';
export const TYPE_IE_LIST_REQ = 'ieListRequest';
export const TYPE_LOAD_FILE_REQ = 'loadFileRequest';
export const TYPE_LOAD_FROM_WEB_REQ = 'loadFromWebRequest';
export const TYPE_MEMORY_USAGE = 'memoryUsage';
export const TYPE_MEMORY_USAGE_REQ = 'memoryUsageRequest';
export const TYPE_RATE_LIMIT = 'rateLimit';
export const TYPE_RESOURCE_LIST = 'resourceList';
export const TYPE_RESOURCE_STATE_REQ = 'resourceStateRequest';
export const TYPE_STATE = 'state';
export const TYPE_WORK_COMPLETE = 'workComplete';

export const STATE_WAITING = 'waiting';

export type MSG_DIFF_REQ = {
  keyOld: number;
  keyNew: number;
};

export type MSG_DIFF_SAVE_PATH = {
  filePath: string;
};

export type MSG_FORMAT_REQ = {
  queue: FormatQueueItem[];
};

export type MSG_FORMAT_SAVE_PATH = {
  filePath: string;
};

export type FormatQueueItem = {
  resourceId: number;
  ieName: string;
  expand: boolean;
};

export type MSG_IE_LIST_REQ = {
  resourceId: number;
};

export type MSG_LOAD_FILE_REQ = {
  location: string;
};

export type MSG_RESOURCE_STATE_REQ = {
  resourceId: number;
  state: boolean;
};
