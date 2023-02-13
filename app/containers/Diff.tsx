import React, { ChangeEvent } from 'react';
import { ipcRenderer, shell } from 'electron';
import { Resource } from '../components/ResourceItem';
import {
  CHAN_RENDERER_TO_WORKER,
  ID_RENDERER,
  TYPE_DIFF_REQ,
  ID_WORKER,
  CHAN_WORKER_TO_RENDERER,
  TYPE_DIFF_SAVE_CANCEL,
  TYPE_DIFF_SAVE_PATH,
  TYPE_DIFF_SAVE_REQ,
  TYPE_WORK_COMPLETE,
  CHAN_DIALOG_SHOWSAVE,
} from '../types';

type Props = {
  resourceList: Resource[];
};

type State = {
  options: { key: number; text: string; value: number; name: string }[];
  valueOld: number | undefined;
  valueNew: number | undefined;
  filePath: string;
  isMessageVisible: boolean;
};

export default class Diff extends React.Component<Props, State> {
  private timer: number | undefined;

  constructor(props: Props) {
    super(props);

    const { resourceList } = props;
    const options = this.getOptions(resourceList);
    this.state = {
      options,
      valueOld: undefined,
      valueNew: undefined,
      filePath: '',
      isMessageVisible: false,
    };
    this.requestDiff = this.requestDiff.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onIpc = this.onIpc.bind(this);
  }

  componentDidMount() {
    ipcRenderer.on(CHAN_WORKER_TO_RENDERER, this.onIpc);
  }

  UNSAFE_componentWillReceiveProps(props: Props) {
    const { resourceList } = props;
    const options = this.getOptions(resourceList);
    this.setState({ options });
  }

  componentWillUnmount() {
    clearTimeout(this.timer);
    ipcRenderer.removeListener(CHAN_WORKER_TO_RENDERER, this.onIpc);
  }

  onChange(event: ChangeEvent<HTMLSelectElement>, oldNew: 'old' | 'new') {
    const value = Number(event.target.value);
    if (oldNew === 'old') {
      this.setState({ valueOld: value });
    }
    if (oldNew === 'new') {
      this.setState({ valueNew: value });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onIpc(_event: Electron.IpcRendererEvent, msg: any) {
    const { type } = msg;
    switch (type) {
      case TYPE_DIFF_SAVE_REQ: {
        const { options, valueOld, valueNew } = this.state;
        const optionOld = options.find((option) => option.key === valueOld);
        const optionNew = options.find((option) => option.key === valueNew);
        const nameOld = optionOld ? optionOld.name : '';
        const nameNew = optionNew ? optionNew.name : '';
        ipcRenderer
          .invoke(CHAN_DIALOG_SHOWSAVE, {
            defaultPath: `diff_${nameOld}_${nameNew}.htm`,
            filters: [
              {
                name: 'Web page file',
                extensions: ['htm', 'html'],
              },
            ],
          })
          .then((dialogReturn) => {
            const { canceled, filePath } = dialogReturn;
            // eslint-disable-next-line promise/always-return
            if (canceled || filePath === undefined) {
              this.cancelDiffSave();
            } else {
              ipcRenderer.send(CHAN_RENDERER_TO_WORKER, {
                src: ID_RENDERER,
                dst: ID_WORKER,
                type: TYPE_DIFF_SAVE_PATH,
                filePath,
              });
              this.setState({ filePath });
            }
          })
          .catch(() => {
            this.cancelDiffSave();
          });
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
      .filter((resource) => resource.type === 'asn1' && resource.loaded)
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
  cancelDiffSave() {
    ipcRenderer.send(CHAN_RENDERER_TO_WORKER, {
      src: ID_RENDERER,
      dst: ID_WORKER,
      type: TYPE_DIFF_SAVE_CANCEL,
    });
  }

  requestDiff() {
    const { valueOld, valueNew } = this.state;
    ipcRenderer.send(CHAN_RENDERER_TO_WORKER, {
      src: ID_RENDERER,
      dst: ID_WORKER,
      type: TYPE_DIFF_REQ,
      keyOld: valueOld,
      keyNew: valueNew,
    });
  }

  render() {
    const {
      options,
      valueOld,
      valueNew,
      filePath,
      isMessageVisible,
    } = this.state;
    const disabled =
      valueOld === undefined || valueNew === undefined || valueOld === valueNew;
    return (
      <div className="box">
        <h1 className="title is-1">Diff</h1>
        <div className="columns">
          <div className="column">
            <div className="field">
              <label className="label">Old spec</label>
              <div className="control">
                <div className="select">
                  <select onChange={(e) => this.onChange(e, 'old')}>
                    <option disabled selected>
                      Old spec
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
          </div>
          <div className="column">
            <div className="field">
              <label className="label">New spec</label>
              <div className="control">
                <div className="select">
                  <select onChange={(e) => this.onChange(e, 'new')}>
                    <option disabled selected>
                      New spec
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
          </div>
        </div>
        <div className="columns">
          <div className="column">
            <button
              className="button"
              disabled={disabled}
              onClick={() => this.requestDiff()}
            >
              Diff
            </button>
          </div>
        </div>
        {isMessageVisible ? (
          <div className="message is-success">
            <div className="message-header">Diff success</div>
            <div className="message-body">
              <div className="buttons">
                <button
                  className="button is-success"
                  onClick={() => {
                    shell.openExternal(filePath);
                  }}
                >
                  <span className="icon">
                    <i className="mdi mdi-file-compare"></i>
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
    );
  }
}
