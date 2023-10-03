import { parentPort as port, workerData as _workerData } from 'worker_threads'
import { z } from 'zod'
import {
  FormatReport,
  FormatRequest,
  IeListReport,
  IeListRequest,
  MemoryUsageReport,
  Ping,
  ResourceListReport,
  ResourceLoadRequest,
  ResourceUnloadRequest,
  SaveLocationRequest,
  SaveLocationResponse,
  WorkerStateReport
} from '../lib/message'
import { getHeapStatistics } from 'v8'
import { debounce } from '../lib/debounce'
import { Resource } from '../lib/resource'
import { WorkerState } from '../lib/workerState'
import { Modules } from 'lib3rd/dist/asn1/classes/modules'
import { Definitions } from 'lib3rd/dist/ran3/classes/definitions'
import { Workbook } from 'exceljs'
import { getWorkbook } from 'lib3rd/dist/common/spreadsheet'
import { cloneDeep } from 'lodash'

const resourceList: Resource[] = []
let formatted: Workbook | undefined

if (!port) {
  throw Error('Worker parent port error')
}

const reportMemoryUsage = debounce(() => {
  const { heap_size_limit, used_heap_size } = getHeapStatistics()
  port?.postMessage({
    src: 'worker',
    dest: 'renderer',
    channel: 'memoryUsageReport',
    total: heap_size_limit,
    used: used_heap_size
  } satisfies z.infer<typeof MemoryUsageReport>)
})

const reportResourceList = debounce(() => {
  port?.postMessage({
    src: 'worker',
    dest: 'renderer',
    channel: 'resourceListReport',
    resourceList
  } satisfies z.infer<typeof ResourceListReport>)
})

function reportFormatComplete(success: boolean, saveLocation: string | undefined) {
  port?.postMessage({
    src: 'worker',
    dest: 'renderer',
    channel: 'formatReport',
    success,
    saveLocation
  } satisfies z.infer<typeof FormatReport>)
}

function reportWorkerState(state: z.infer<typeof WorkerState>) {
  port?.postMessage({
    src: 'worker',
    dest: 'renderer',
    channel: 'workerStateReport',
    state
  } satisfies z.infer<typeof WorkerStateReport>)
}

port.on('message', (msg: unknown) => {
  if (Ping.safeParse(msg).success) {
    reportMemoryUsage()
    reportResourceList()
    reportWorkerState('idle')
    return
  }

  const resourceLoadRequestParseResult = ResourceLoadRequest.safeParse(msg)
  if (resourceLoadRequestParseResult.success) {
    reportWorkerState('busy')
    const { name, serialized } = resourceLoadRequestParseResult.data
    if (!resourceList.find((resource) => resource.name === name)) {
      const object = JSON.parse(serialized)
      const resource =
        'modulesTag' in object && 'modules' in object
          ? Modules.fromObject(object)
          : 'definitionList' in object
          ? Definitions.fromObject(object)
          : null
      if (resource) {
        const type = resource instanceof Modules ? 'asn1' : 'tabular'
        resourceList.push({
          id: resourceList.length.toString(),
          name,
          type,
          resource
        })
      }
    }
    reportMemoryUsage()
    reportResourceList()
    reportWorkerState('idle')
    return
  }

  const resourceUnloadRequestParseResult = ResourceUnloadRequest.safeParse(msg)
  if (resourceUnloadRequestParseResult.success) {
    const { id } = resourceUnloadRequestParseResult.data
    const index = resourceList.findIndex((resource) => resource.id === id)
    resourceList.splice(index, 1)
    reportMemoryUsage()
    reportResourceList()
    return
  }

  const ieListRequestParseResult = IeListRequest.safeParse(msg)
  if (ieListRequestParseResult.success) {
    reportWorkerState('busy')
    const { id } = ieListRequestParseResult.data
    const resource = resourceList.find((resource) => resource.id === id)?.resource
    if (!resource) {
      reportWorkerState('idle')
      return
    }
    const ieList: Array<{ name: string; key: string }> = []
    if ('modules' in resource) {
      resource.modules.forEach(({ name: moduleName, assignments }) => {
        assignments.forEach((assignment) => {
          if ('valueAssignmentTag' in assignment) {
            return
          }
          const { name } = assignment
          const key = `${moduleName}.${name}`
          ieList.push({ name, key })
        })
      })
    }
    if ('definitionList' in resource) {
      resource.definitionList.forEach((def) => {
        const { sectionNumber: key, name } = def
        ieList.push({ name, key })
      })
    }
    port?.postMessage({
      src: 'worker',
      dest: 'renderer',
      channel: 'ieListReport',
      ieList
    } satisfies z.infer<typeof IeListReport>)
    reportWorkerState('idle')
    return
  }

  const formatRequestParseResult = FormatRequest.safeParse(msg)
  if (formatRequestParseResult.success) {
    reportWorkerState('busy')
    const { queue } = formatRequestParseResult.data
    formatted = getWorkbook()
    const tocSheet = formatted.addWorksheet('Contents')
    queue.forEach(({ id, name, key, expand }) => {
      const resource = resourceList.find((resource) => resource.id === id)?.resource
      if (!resource) {
        return
      }
      if ('modules' in resource) {
        const [moduleName, name] = key.split('.')
        const assignment = resource.findAssignment(name, moduleName)
        if (!assignment || 'valueAssignmentTag' in assignment) {
          return
        }
        const assignmentNew = expand ? cloneDeep(assignment).expand(resource) : assignment
        assignmentNew.toSpreadsheet(formatted)
      }
      if ('definitionList' in resource) {
        const definition = resource.findDefinition(key)
        if (!definition) {
          return
        }
        const definitionNew = expand ? cloneDeep(definition) : definition
        definitionNew.toSpreadsheet(formatted)
      }
      const sheetCount = formatted!.worksheets.length
      const row = tocSheet.addRow([
        {
          text: name,
          hyperlink: `#'${formatted!.worksheets[sheetCount - 1].name}'!A1`
        }
      ])
      row.font = {
        color: { argb: 'FF0000FF' },
        underline: true
      }
    })
    tocSheet.columns[0].width = 80
    port?.postMessage({
      src: 'worker',
      dest: 'main',
      channel: 'saveLocationRequest'
    } satisfies z.infer<typeof SaveLocationRequest>)
    return
  }

  const saveLocationResponseParseResult = SaveLocationResponse.safeParse(msg)
  if (saveLocationResponseParseResult.success) {
    const { saveLocation } = saveLocationResponseParseResult.data
    if (!saveLocation) {
      formatted = undefined
      reportFormatComplete(false, saveLocation)
      reportMemoryUsage()
      reportWorkerState('idle')
      return
    }
    if (formatted) {
      formatted.xlsx
        .writeFile(saveLocation)
        .then(() => {
          reportFormatComplete(true, saveLocation)
        })
        .catch((reason) => {
          reportFormatComplete(false, undefined)
          console.error(reason)
        })
        .finally(() => {
          formatted = undefined
          reportMemoryUsage()
          reportWorkerState('idle')
        })
    }
    return
  }
})
