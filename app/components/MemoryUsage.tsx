import { ipcRenderer } from 'electron';
import { Progress } from 'semantic-ui-react';
import React from 'react';
import {
  CHAN_WORKER_TO_RENDERER,
  CHAN_RENDERER_TO_WORKER,
  ID_RENDERER,
  ID_WORKER,
  TYPE_MEMORY_USAGE_REQ,
  TYPE_MEMORY_USAGE,
} from '../types';

type State = {
  avail: number;
  used: number;
};

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

export default class MemoryUsage extends React.Component<
  Record<string, unknown>,
  State
> {
  constructor(props: Record<string, unknown>) {
    super(props);
    this.state = {
      avail: 100,
      used: 1,
    };
    this.onIpc = this.onIpc.bind(this);
  }

  componentDidMount() {
    ipcRenderer.on(CHAN_WORKER_TO_RENDERER, this.onIpc);
    requestMemoryUsage();
  }

  componentWillUnmount() {
    ipcRenderer.removeListener(CHAN_WORKER_TO_RENDERER, this.onIpc);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onIpc(_event: Electron.IpcRendererEvent, msg: any) {
    const { type } = msg;
    if (type === TYPE_MEMORY_USAGE) {
      const { avail, used } = msg;
      this.setState({ avail, used });
    }
  }

  render() {
    const { avail, used } = this.state;
    return (
      <Progress value={used} total={avail} size="tiny">
        {`${b2mb(used)} / ${b2mb(avail)} MB used`}
      </Progress>
    );
  }
}
