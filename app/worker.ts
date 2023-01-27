/* eslint-disable no-console */

import axios from 'axios';
import { Workbook } from 'exceljs';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { asn1, ran3 } from 'lib3rd';
import { cloneDeep } from 'lodash';
import { parse } from 'path';
import 'regenerator-runtime/runtime';
import { getHeapStatistics } from 'v8';
import { Modules } from 'lib3rd/dist/asn1/classes/modules';
import { ValueAssignment } from 'lib3rd/dist/asn1/classes/valueAssignment';
import { Definitions } from 'lib3rd/dist/ran3/classes/definitions';
import { todo, unreach } from 'unimpl';
import { ChildProcess } from 'child_process';
import { getWorkbook } from 'lib3rd/dist/common/spreadsheet';
import {
  ID_WORKER,
  ID_RENDERER,
  TYPE_MEMORY_USAGE_REQ,
  TYPE_LOAD_FILE_REQ,
  TYPE_MEMORY_USAGE,
  TYPE_STATE,
  STATE_WAITING,
  TYPE_RESOURCE_LIST,
  TYPE_RESOURCE_STATE_REQ,
  TYPE_DIFF_REQ,
  TYPE_DIFF_SAVE_REQ,
  TYPE_DIFF_SAVE_CANCEL,
  TYPE_DIFF_SAVE_PATH,
  TYPE_WORK_COMPLETE,
  TYPE_IE_LIST_REQ,
  TYPE_IE_LIST,
  TYPE_LOAD_FROM_WEB_REQ,
  MSG_LOAD_FILE_REQ,
  MSG_RESOURCE_STATE_REQ,
  MSG_DIFF_REQ,
  MSG_IE_LIST_REQ,
  MSG_DIFF_SAVE_PATH,
  TYPE_FORMAT_REQ,
  MSG_FORMAT_REQ,
  TYPE_FORMAT_SAVE_REQ,
  TYPE_FORMAT_SAVE_PATH,
  MSG_FORMAT_SAVE_PATH,
  TYPE_TOAST,
  TYPE_FORMAT_SAVE_CANCEL,
  ID_MAIN,
  TYPE_SETTINGS,
  TYPE_VERSION,
  TYPE_SPEC_LIST,
} from './types';
import { HttpsProxyAgentWithCa } from './httpsProxyAgentWithCa';

const sslRootCas = require('ssl-root-cas/latest');

const { NODE_EXTRA_CA_CERTS } = process.env;

const PROC = <ChildProcess>(<unknown>process);

PROC.send({
  src: ID_WORKER,
  dst: ID_MAIN,
  type: TYPE_SETTINGS,
});

const TYPE_ASN1 = 'asn1';
const TYPE_JSON = 'json';
const TYPE_TAB = 'tab';

const template =
  process.env.NODE_ENV === 'development'
    ? readFileSync(
        `${__dirname}/../node_modules/lib3rd/resources/diff.pug`,
        'utf8'
      )
    : readFileSync(`${__dirname}/diff.pug`, 'utf8');

const ECONNRESET = 'ECONNRESET';

interface IResource {
  resourceId: number;
  name: string;
  location: string;
  loaded: boolean;
  type: 'asn1' | 'tab';
  modules: Modules | Definitions | null;
}

const resourceList: IResource[] = [];
let diffRendered: string | undefined;
let formatted: Workbook | undefined;

function findResource(resourceId: number): IResource | undefined {
  return resourceList.find((resource) => resource.resourceId === resourceId);
}

async function getResourceContent(location: string) {
  if (!location.startsWith('http')) {
    const content = readFileSync(location, 'utf8');
    return Promise.resolve(content);
  }
  return axios
    .get(location)
    .then((value) => {
      const { data: content } = value;
      return content as string;
    })
    .catch((reason) => {
      console.error(reason);
      throw reason;
    });
}

function resourceExists(name: string, location: string): boolean {
  return (
    resourceList.find(
      (resource) => resource.name === name && resource.location === location
    ) !== undefined
  );
}

function reportResourceList() {
  const resourceListToReport = resourceList.map((resource) => {
    const { resourceId, name, location, loaded, type } = resource;
    return { resourceId, name, location, loaded, type };
  });
  PROC.send({
    src: ID_WORKER,
    dst: ID_RENDERER,
    type: TYPE_RESOURCE_LIST,
    resourceList: resourceListToReport,
  });
}

function reportMemoryUsage() {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { heap_size_limit, used_heap_size } = getHeapStatistics();
  PROC.send({
    src: ID_WORKER,
    dst: ID_RENDERER,
    type: TYPE_MEMORY_USAGE,
    avail: heap_size_limit,
    used: used_heap_size,
  });
}

function reportWorkComplete() {
  PROC.send({
    src: ID_WORKER,
    dst: ID_RENDERER,
    type: TYPE_WORK_COMPLETE,
  });
}

function reportWorkerState(state?: string) {
  PROC.send({
    src: ID_WORKER,
    dst: ID_RENDERER,
    type: TYPE_STATE,
    state,
  });
}

async function loadFile(msg: MSG_LOAD_FILE_REQ) {
  reportWorkerState(STATE_WAITING);
  const { location } = msg;
  const { base: name, ext } = parse(location);
  if (!resourceExists(name, location)) {
    const content = readFileSync(location, 'utf8');
    // eslint-disable-next-line no-nested-ternary
    const type = ext.includes('asn')
      ? TYPE_ASN1
      : ext.includes('json')
      ? TYPE_JSON
      : TYPE_TAB;
    let modules = null;
    if (type === TYPE_JSON) {
      const obj = JSON.parse(content);
      try {
        modules = Definitions.fromObject(obj);
      } catch (e) {
        console.error(e);
      }
      if (!modules) {
        try {
          modules = Modules.fromObject(obj);
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      modules = type === TYPE_ASN1 ? asn1.parse(content) : ran3.parse(content);
    }
    // TODO: Handle if modules === undefined
    resourceList.push({
      resourceId: resourceList.length,
      name,
      location,
      loaded: true,
      type: modules instanceof Modules ? TYPE_ASN1 : TYPE_TAB,
      modules,
    });
  }
  reportResourceList();
  reportMemoryUsage();
  reportWorkerState();
}

function sendToast(message: string, autoDismiss: boolean) {
  PROC.send({
    src: ID_WORKER,
    dst: ID_RENDERER,
    type: TYPE_TOAST,
    message,
    autoDismiss,
  });
}

function loadFromWeb(series: string, spec: string, version: string) {
  reportWorkerState(STATE_WAITING);
  const location = `https://cdn.jsdelivr.net/gh/proj3rd/3gpp-specs-in-json/${series}/${spec}/${version}`;
  return axios
    .get(location)
    .then((response) => {
      // { name, ... }[]
      const { data: obj } = response;
      const resourceId = resourceList.length;
      if (!resourceExists(version, location)) {
        const type = version.includes('asn') ? TYPE_ASN1 : TYPE_TAB;
        const modules = type === TYPE_ASN1 ? Modules.fromObject(obj) : Definitions.fromObject(obj);
        resourceList.push({
          resourceId,
          name: version,
          location,
          loaded: true,
          type,
          modules,
        });
      }
    })
    .catch((reason) => {
      console.error(reason);
      const { code, errno } = reason;
      if (code === ECONNRESET || errno === ECONNRESET) {
        sendToast(
          `Your request is blocked due to network issue.
Maybe you are behind the proxy.
Or you can manually download resources via 'Visit spec repository'
and load them via 'Load local file'.`,
          false
        );
      }
    })
    .finally(() => {
      reportResourceList();
      reportMemoryUsage();
      reportWorkerState();
    });
}

function setResourceState(msg: MSG_RESOURCE_STATE_REQ) {
  reportWorkerState(STATE_WAITING);
  const { resourceId, state } = msg;
  const indexFound = resourceList.findIndex((item) => item.resourceId === resourceId);
  const resource = resourceList[indexFound];
  if (resource !== undefined && resource.loaded !== state) {
    if (state === false) {
      resource.modules = null;
      resource.loaded = false; // Not necessary if `resourceList.splice()` is used
      resourceList.splice(indexFound, 1);
      reportResourceList();
      reportMemoryUsage();
      reportWorkerState();
    }
    if (state === true) {
      // eslint-disable-next-line promise/catch-or-return
      getResourceContent(resource.location)
        .then((content) => {
          // eslint-disable-next-line promise/always-return
          if (resource.location.endsWith('json')) {
            const obj = JSON.parse(content);
            try {
              console.log('Trying to deserialize into RAN3 tabular');
              resource.modules = Definitions.fromObject(obj);
            } catch (e) {
              console.error(e);
            }
            if (!resource.modules) {
              try {
                console.log('Trying to deserialize into ASN.1');
                resource.modules = Modules.fromObject(obj);
              } catch (e) {
                console.error(e);
              }
            }
          } else if (resource.type === TYPE_ASN1) {
            resource.modules = asn1.parse(content);
          } else if (resource.type === TYPE_TAB) {
            resource.modules = ran3.parse(content);
          }
          resource.loaded = true;
        })
        .catch((reason) => {
          console.error(reason);
        })
        .finally(() => {
          reportResourceList();
          reportMemoryUsage();
          reportWorkerState();
        });
    }
  }
}

function diff(msg: MSG_DIFF_REQ) {
  reportWorkerState(STATE_WAITING);
  const { keyOld, keyNew } = msg;
  const resourceOld = findResource(keyOld);
  const resourceNew = findResource(keyNew);
  if (resourceOld === undefined) {
    todo();
  }
  if (resourceNew === undefined) {
    todo();
  }
  const { name: specOld, modules: modulesOld } = resourceOld;
  const { name: specNew, modules: modulesNew } = resourceNew;
  if (!(modulesOld instanceof Modules) || !(modulesNew instanceof Modules)) {
    unreach();
  }
  const patchList = asn1.diff(modulesOld, modulesNew);
  diffRendered = asn1.renderDiff(
    {
      specOld,
      specNew,
      patchList,
    },
    template
  );
  PROC.send({
    src: ID_WORKER,
    dst: ID_RENDERER,
    type: TYPE_DIFF_SAVE_REQ,
  });
}

function format(msg: MSG_FORMAT_REQ) {
  reportWorkerState(STATE_WAITING);
  const { queue } = msg;
  formatted = getWorkbook();
  const sheetToc = formatted.addWorksheet('Contents');
  const nameList: string[] = [];
  const sheetnameList: string[] = [];
  queue.forEach((item) => {
    const { resourceId, ieKey, expand } = item;
    const resource = findResource(resourceId);
    if (resource === undefined) {
      return;
    }
    const { modules } = resource;
    if (modules instanceof Modules) {
      const [moduleName, assignmentName] = ieKey.split('.');
      const assignment = modules.findAssignment(assignmentName, moduleName);
      if (assignment === undefined || assignment instanceof ValueAssignment) {
        return;
      }
      const assignmentNew = expand
        ? cloneDeep(assignment).expand(modules)
        : assignment;
      assignmentNew.toSpreadsheet(formatted);
      nameList.push(assignmentName);
    }
    if (modules instanceof Definitions) {
      const definition = modules.findDefinition(ieKey);
      if (definition === undefined) {
        return;
      }
      const definitionNew = expand
        ? cloneDeep(definition).expand(modules)
        : definition;
      definitionNew.toSpreadsheet(formatted);
      nameList.push(definition.name);
    }
    if (formatted) {
      const sheetCount = formatted.worksheets.length;
      const lastSheet = formatted.worksheets[sheetCount - 1];
      sheetnameList.push(lastSheet.name);
    }
  });
  const maxLength = nameList.reduce((prevLength, name, index) => {
    const row = sheetToc.addRow([
      {
        text: name,
        hyperlink: `#'${sheetnameList[index]}'!A1`,
      },
    ]);
    row.font = {
      color: { argb: 'FF0000FF' },
      underline: true,
    };
    return Math.max(prevLength, name.length);
  }, 0);
  sheetToc.columns[0].width = maxLength;
  PROC.send({
    src: ID_WORKER,
    dst: ID_RENDERER,
    type: TYPE_FORMAT_SAVE_REQ,
  });
}

function cancelDiffSave() {
  diffRendered = undefined;
  reportMemoryUsage();
  reportWorkerState();
}

function cancelFormatSave() {
  formatted = undefined;
  reportMemoryUsage();
  reportWorkerState();
}

function saveDiff(msg: MSG_DIFF_SAVE_PATH) {
  const { filePath } = msg;
  writeFileSync(filePath, diffRendered);
  diffRendered = undefined;
  reportWorkComplete();
  reportMemoryUsage();
  reportWorkerState();
}

function saveFormatted(msg: MSG_FORMAT_SAVE_PATH) {
  const { filePath } = msg;
  if (!formatted) {
    reportMemoryUsage();
    reportWorkerState();
    return;
  }
  // eslint-disable-next-line promise/catch-or-return
  formatted.xlsx
    .writeFile(filePath)
    // eslint-disable-next-line promise/always-return
    .then(() => {
      reportWorkComplete();
    })
    .catch((reason) => {
      console.error(reason);
    })
    .finally(() => {
      reportMemoryUsage();
      reportWorkerState();
    });
}

function reportIeList(msg: MSG_IE_LIST_REQ) {
  reportWorkerState(STATE_WAITING);
  const { resourceId } = msg;
  const resource = findResource(resourceId);
  if (resource === undefined) {
    todo();
  }
  const { type } = resource;
  const ieList: { name: string; key: string }[] = [];
  if (type === TYPE_ASN1) {
    if (!(resource.modules instanceof Modules)) {
      unreach();
    }
    resource.modules.modules.forEach((module) => {
      const { name: moduleName } = module;
      module.assignments.forEach((assignment) => {
        if (assignment instanceof ValueAssignment) {
          return;
        }
        const { name } = assignment;
        const key = `${moduleName}.${name}`;
        ieList.push({ name, key });
      });
    });
  } else if (type === TYPE_TAB) {
    if (!(resource.modules instanceof Definitions)) {
      unreach();
    }
    resource.modules.definitionList.forEach((definition) => {
      const { sectionNumber: key, name } = definition;
      ieList.push({ name, key });
    });
  }
  PROC.send({
    src: ID_WORKER,
    dst: ID_RENDERER,
    type: TYPE_IE_LIST,
    ieList,
  });
  reportWorkerState();
}

process.on('message', (msg) => {
  const { dst, type } = msg;
  if (dst !== ID_WORKER) {
    return;
  }
  switch (type) {
    case TYPE_DIFF_REQ: {
      diff(msg);
      break;
    }
    case TYPE_DIFF_SAVE_CANCEL: {
      cancelDiffSave();
      break;
    }
    case TYPE_DIFF_SAVE_PATH: {
      saveDiff(msg);
      break;
    }
    case TYPE_FORMAT_REQ: {
      format(msg);
      break;
    }
    case TYPE_FORMAT_SAVE_CANCEL: {
      cancelFormatSave();
      break;
    }
    case TYPE_FORMAT_SAVE_PATH: {
      saveFormatted(msg);
      break;
    }
    case TYPE_IE_LIST_REQ: {
      reportIeList(msg);
      break;
    }
    case TYPE_LOAD_FILE_REQ: {
      loadFile(msg);
      break;
    }
    case TYPE_LOAD_FROM_WEB_REQ: {
      const { series, spec, version } = msg;
      loadFromWeb(series, spec, version);
      break;
    }
    case TYPE_MEMORY_USAGE_REQ: {
      reportMemoryUsage();
      break;
    }
    case TYPE_RESOURCE_STATE_REQ: {
      setResourceState(msg);
      break;
    }
    case TYPE_SETTINGS: {
      const { settings } = msg;
      const { proxy } = settings;
      if (!proxy) {
        break;
      }
      const { use, https, rejectUnauthorized } = proxy;
      if (!use || !https) {
        break;
      }
      const ca = sslRootCas.create();
      if (NODE_EXTRA_CA_CERTS && existsSync(NODE_EXTRA_CA_CERTS)) {
        ca.addFile(NODE_EXTRA_CA_CERTS);
      }
      const httpsProxyAgent = new HttpsProxyAgentWithCa({
        protocol: https.protocol,
        host: https.host,
        port: https.port,
        rejectUnauthorized,
        ca,
      });
      axios.defaults.httpsAgent = httpsProxyAgent;
      break;
    }
    case TYPE_SPEC_LIST: {
      axios.get('https://cdn.jsdelivr.net/gh/proj3rd/3gpp-specs-in-json/.dir-list.json').then((response) => {
        const specList = response.data;
        PROC.send({
          src: ID_WORKER,
          dst: ID_RENDERER,
          type: TYPE_SPEC_LIST,
          specList,
        });
      }).catch((reason) => {
        console.error(reason);
      })
      break;
    }
    case TYPE_VERSION: {
      axios.get('https://data.jsdelivr.com/v1/package/gh/proj3rd/tool3rd').then((response) => {
        const { versions } = response.data;
        const version = versions[0];
        PROC.send({
          src: ID_WORKER,
          dst: ID_RENDERER,
          type: TYPE_VERSION,
          version,
        });
      }).catch((reason) => {
        console.error(reason);
      });
      break;
    }
    default: {
      // Do nothing
    }
  }
});
