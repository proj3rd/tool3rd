import { ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';
import {
  CHAN_WORKER_TO_RENDERER,
  CHAN_RENDERER_TO_WORKER,
  ID_RENDERER,
  ID_WORKER,
  TYPE_MEMORY_USAGE_REQ,
  TYPE_MEMORY_USAGE,
} from '../types';

function b2mb(b: number) {
  return Math.ceil(b / 1024 / 1024);
}

function requestMemoryUsage() {
  ipcRenderer.send(CHAN_RENDERER_TO_WORKER, {
    src: ID_RENDERER,
    dst: ID_WORKER,
    type: TYPE_MEMORY_USAGE_REQ,
  });
}

export default function MemoryUsage() {
  const [avail, setAvail] = useState(100);
  const [used, setUsed] = useState(1);

  useEffect(() => {
    ipcRenderer.on(CHAN_WORKER_TO_RENDERER, onIpc);
    requestMemoryUsage();
    return function cleanup() {
      ipcRenderer.removeListener(CHAN_WORKER_TO_RENDERER, onIpc);
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onIpc(_event: Electron.IpcRendererEvent, msg: any) {
    const { type } = msg;
    if (type === TYPE_MEMORY_USAGE) {
      const { avail, used } = msg;
      setAvail(avail);
      setUsed(used);
    }
  }

  return (
    <div className="has-text-centered">
      <progress className="progress" value={used} max={avail} />
      {`${b2mb(used)} / ${b2mb(avail)} MB used`}
    </div>
  );
}
