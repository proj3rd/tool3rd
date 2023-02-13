import { debounce } from 'lodash';
import React, { ChangeEvent } from 'react';
import { ipcRenderer, shell } from 'electron';
import { Resource } from '../components/ResourceItem';
import {
  CHAN_WORKER_TO_RENDERER,
  CHAN_RENDERER_TO_WORKER,
  ID_RENDERER,
  ID_WORKER,
  TYPE_IE_LIST_REQ,
  TYPE_IE_LIST,
  TYPE_FORMAT_REQ,
  TYPE_FORMAT_SAVE_REQ,
  TYPE_FORMAT_SAVE_PATH,
  TYPE_FORMAT_SAVE_CANCEL,
  TYPE_WORK_COMPLETE,
  CHAN_DIALOG_SHOWSAVE,
} from '../types';

type QueueItem = {
  key: string;
  resourceId: number;
  indexInResource: number;
  ieKey: string;
  ieName: string;
  expand: boolean;
};

type Props = {
  resourceList: Resource[];
};

type State = {
  options: { key: number; text: string; value: number; name: string }[];
  resourceId: number | undefined;
  name: string;
  ieList: { key: string; text: string; value: string }[];
  queue: QueueItem[];
  filePath: string;
  isMessageVisible: boolean;
};

export default class Format extends React.Component<Props, State> {
  private timer: number | undefined;

  constructor(props: Props) {
    super(props);

    const { resourceList } = props;
    const options = this.getOptions(resourceList);
    this.state = {
      options,
      resourceId: undefined,
      name: '',
      ieList: [],
      queue: [],
      filePath: '',
      isMessageVisible: false,
    };
    this.addToQueue = this.addToQueue.bind(this);
    this.removeAll = this.removeAll.bind(this);
    this.removeFromQueue = this.removeFromQueue.bind(this);
    this.requestFormat = this.requestFormat.bind(this);
    this.onNameChange = this.onNameChange.bind(this);
    this.onNameChangeDebounce = this.onNameChangeDebounce.bind(this);
    this.onSpecChange = this.onSpecChange.bind(this);
    this.onIpc = this.onIpc.bind(this);
  }

  componentDidMount() {
    ipcRenderer.on(CHAN_WORKER_TO_RENDERER, this.onIpc);
  }

  UNSAFE_componentWillReceiveProps(props: Props) {
    const { resourceList } = props;
    this.setState((state) => {
      const { resourceId, ieList, queue } = state;
      const options = this.getOptions(resourceList);
      const ieListNew =
        options.find((option) => option.value === resourceId) !== undefined
          ? ieList
          : [];
      const queueNew = queue.filter((item) => {
        const index = options.findIndex((option) => {
          return option.key === item.resourceId;
        });
        return index !== -1;
      });
      return {
        options,
        ieList: ieListNew,
        queue: queueNew,
      };
    });
  }

  componentWillUnmount() {
    clearTimeout(this.timer);
    ipcRenderer.removeListener(CHAN_WORKER_TO_RENDERER, this.onIpc);
  }

  onNameChange(e: ChangeEvent<HTMLInputElement>) {
    const { value: name } = e.target;
    this.onNameChangeDebounce(name);
  }

  onNameChangeDebounce = debounce((name) => {
    this.setState({ name });
  }, 1000);

  // eslint-disable-next-line class-methods-use-this
  onSpecChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = Number(event.target.value);
    this.setState({ resourceId: value });
    ipcRenderer.send(CHAN_RENDERER_TO_WORKER, {
      src: ID_RENDERER,
      dst: ID_WORKER,
      type: TYPE_IE_LIST_REQ,
      resourceId: value,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, class-methods-use-this
  onIpc(_event: Electron.IpcRendererEvent, msg: any) {
    const { type } = msg;
    switch (type) {
      case TYPE_FORMAT_SAVE_REQ: {
        const { options, queue } = this.state;
        let defaultPath = '';
        if (queue.length === 1) {
          const { resourceId, ieName, expand } = queue[0];
          const optionIndex = options.findIndex((option) => {
            return option.key === resourceId;
          });
          const specFileName = options[optionIndex].name;
          const expandString = expand ? '_expand' : '';
          defaultPath = `${ieName}_${specFileName}${expandString}.xlsx`;
        } else if (queue.length > 1) {
          const { resourceId: firstResourceId, expand: firstExpand } = queue[0];
          let specFileName = '';
          let expandString = '';
          if (queue.every((item) => item.resourceId === firstResourceId)) {
            const optionIndex = options.findIndex((option) => {
              return option.key === firstResourceId;
            });
            specFileName = options[optionIndex].name;
            if (queue.every((item) => item.expand === firstExpand)) {
              expandString = firstExpand ? '_expand' : '';
            } else {
              expandString = '_mixed';
            }
            defaultPath = `${specFileName}${expandString}.xlsx`;
          }
        }
        ipcRenderer
          .invoke(CHAN_DIALOG_SHOWSAVE, {
            defaultPath,
            filters: [
              {
                name: 'Spreadsheet file',
                extensions: ['xlsx'],
              },
            ],
          })
          .then((dialogReturn) => {
            const { canceled, filePath } = dialogReturn;
            // eslint-disable-next-line promise/always-return
            if (canceled || filePath === undefined) {
              this.cancelFormatSave();
            } else {
              ipcRenderer.send(CHAN_RENDERER_TO_WORKER, {
                src: ID_RENDERER,
                dst: ID_WORKER,
                type: TYPE_FORMAT_SAVE_PATH,
                filePath,
              });
              this.setState({ filePath });
            }
          })
          .catch(() => {
            this.cancelFormatSave();
          });
        break;
      }
      case TYPE_IE_LIST: {
        const ieList = msg.ieList.map((ie: { name: string; key: string }) => ({
          key: ie.key,
          text: ie.name,
          value: ie.key,
        }));
        this.setState({ ieList });
        break;
      }
      case TYPE_WORK_COMPLETE: {
        this.setState({ isMessageVisible: true });
        this.timer = window.setTimeout(() => {
          this.setState({ isMessageVisible: false });
        }, 10000);
        break;
      }
      default: {
        // Do nothing
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  onWorkComplete() {
    // Do nothing
  }

  // eslint-disable-next-line class-methods-use-this
  getOptions(resourceList: Resource[]) {
    return resourceList
      .filter((resource) => resource.loaded)
      .map((resource) => {
        const { resourceId, name } = resource;
        return {
          key: resourceId,
          text: `#${resourceId}. ${name}`,
          value: resourceId,
          name,
        };
      });
  }

  // eslint-disable-next-line class-methods-use-this
  cancelFormatSave() {
    ipcRenderer.send(CHAN_RENDERER_TO_WORKER, {
      src: ID_RENDERER,
      dst: ID_WORKER,
      type: TYPE_FORMAT_SAVE_CANCEL,
    });
  }

  // eslint-disable-next-line class-methods-use-this
  addToQueue(key: string, expand: boolean) {
    const { resourceId, ieList, queue } = this.state;
    if (resourceId === undefined) {
      return;
    }
    const index = ieList.findIndex((ie) => ie.key === key);
    if (index === -1) {
      return;
    }
    const ie = ieList[index];
    const ieName = ie.text as string;
    const item: QueueItem = {
      key: `${resourceId}_${key}_${expand}`,
      resourceId,
      indexInResource: index,
      ieKey: key,
      ieName,
      expand,
    };
    const itemInQueue = queue.find((i) => {
      return i.key === item.key;
    });
    if (itemInQueue) {
      return;
    }
    this.setState((state) => {
      const queueNew = [...state.queue, item].sort((a, b) => {
        if (a.resourceId < b.resourceId) {
          return -1;
        }
        if (a.resourceId > b.resourceId) {
          return 1;
        }
        if (a.indexInResource < b.indexInResource) {
          return -1;
        }
        if (a.indexInResource > b.indexInResource) {
          return 1;
        }
        return 0;
      });
      return { queue: queueNew };
    });
  }

  removeAll() {
    this.setState({ queue: [] });
  }

  removeFromQueue(key: string) {
    this.setState((state) => {
      const { queue } = state;
      const queueNew = queue.filter((item) => {
        return item.key !== key;
      });
      return { queue: queueNew };
    });
  }

  // eslint-disable-next-line class-methods-use-this
  requestFormat() {
    const { queue } = this.state;
    const queueNew = queue.map((item) => {
      const { resourceId, ieKey, expand } = item;
      return { resourceId, ieKey, expand };
    });
    ipcRenderer.send(CHAN_RENDERER_TO_WORKER, {
      src: ID_RENDERER,
      dst: ID_WORKER,
      type: TYPE_FORMAT_REQ,
      queue: queueNew,
    });
  }

  render() {
    const {
      options,
      name,
      ieList,
      queue,
      filePath,
      isMessageVisible,
    } = this.state;
    const disabled = queue.length === 0;
    return (
      <div className="box">
        <h1 className="title is-1">Format</h1>
        <div className="field">
          <div className="control">
            <label className="label">Spec</label>
            <div className="select">
              <select onChange={this.onSpecChange} defaultValue="placeholder">
                <option value="placeholder" disabled>
                  Spec
                </option>
                {options.map(({ key, text, value }) => (
                  <option key={key} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="columns">
          <div className="column">
            <div className="field">
              <div className="control is-expanded">
                <input
                  className="input"
                  placeholder="Filter by name"
                  onChange={this.onNameChange}
                ></input>
              </div>
            </div>
          </div>
          <div className="column">
            <div className="field has-addons">
              <div className="control">
                <button className="button" disabled>
                  Add all
                </button>
              </div>
              <div className="control">
                <button
                  className="button is-success"
                  disabled={ieList.length === 0}
                  onClick={() => {
                    ieList.forEach((ie) => {
                      const { key } = ie;
                      this.addToQueue(key, false);
                    });
                  }}
                >
                  Normal
                </button>
              </div>
              <div className="control">
                <button
                  className="button is-info"
                  disabled={ieList.length === 0}
                  onClick={() => {
                    ieList.forEach((ie) => {
                      const { key } = ie;
                      this.addToQueue(key, true);
                    });
                  }}
                >
                  Expand
                </button>
              </div>
            </div>
            <div className="field is-grouped">
              <div className="control">
                <button
                  className="button"
                  disabled={disabled}
                  onClick={() => this.requestFormat()}
                >
                  Format
                </button>
              </div>
              <div className="control">
                <button
                  className="button"
                  disabled={disabled}
                  onClick={this.removeAll}
                >
                  Remove all
                </button>
              </div>
            </div>
          </div>
        </div>
        <div>
          {isMessageVisible ? (
            <div className="message is-success">
              <div className="message-header">Format success</div>
              <div className="message-body">
                <div className="buttons">
                  <button
                    className="button is-success"
                    onClick={() => {
                      shell.openExternal(filePath);
                    }}
                  >
                    <span className="icon">
                      <i className="mdi mdi-file-excel"></i>
                    </span>
                    <span>Open file</span>
                  </button>
                  <button
                    className="button is-info"
                    onClick={() => {
                      shell.showItemInFolder(filePath);
                    }}
                  >
                    <span className="icon">
                      <i className="mdi mdi-folder"></i>
                    </span>
                    <span>Open folder</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <></>
          )}
        </div>
        <div className="columns">
          <div className="column">
            <div className="format-ie-list">
              <table className="table is-fullwidth">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Format</th>
                  </tr>
                </thead>
                <tbody>
                  {ieList
                    .filter((ie) =>
                      (ie.text as string)
                        .toLowerCase()
                        .includes(name.toLowerCase())
                    )
                    .map((ie) => {
                      const { key } = ie;
                      return (
                        <tr key={key}>
                          <td>{ie.text}</td>
                          <td>
                            <div className="field has-addons">
                              <div className="control">
                                <button
                                  className="button is-success"
                                  onClick={() => this.addToQueue(key, false)}
                                >
                                  Normal
                                </button>
                              </div>
                              <div className="control">
                                <button
                                  className="button is-info"
                                  onClick={() => this.addToQueue(key, true)}
                                >
                                  Expand
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="column">
            <div className="format-ie-list">
              <table className="table is-fullwidth">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Spec</th>
                    <th>Expand</th>
                    <th>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((ie) => {
                    const { key, resourceId, ieName, expand } = ie;
                    const optionIndex = options.findIndex((option) => {
                      return option.key === resourceId;
                    });
                    const specFileName = options[optionIndex].name;
                    return (
                      <tr key={key}>
                        <td>{ieName}</td>
                        <td>{specFileName}</td>
                        <td>{expand ? 'Expand' : ''}</td>
                        <td>
                          <button
                            className="button"
                            onClick={() => this.removeFromQueue(key)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
