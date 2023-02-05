/* eslint react/jsx-props-no-spreading: off */
import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import semverCompare from 'semver-compare';
import routes from './constants/routes.json';
import App from './containers/App';
import HomePage from './containers/HomePage';
import ResourceItem, { Resource } from './components/ResourceItem';
import MemoryUsage from './components/MemoryUsage';
import {
  CHAN_WORKER_TO_RENDERER,
  TYPE_STATE,
  STATE_WAITING,
  TYPE_RESOURCE_LIST,
  CHAN_WORKER_ERROR,
  CHAN_RENDERER_TO_WORKER,
  ID_RENDERER,
  ID_WORKER,
  TYPE_LOAD_FROM_WEB_REQ,
  TYPE_LOAD_FILE_REQ,
  TYPE_TOAST,
  ID_MAIN,
  TYPE_EDIT_SETTINGS,
  CHAN_RENDERER_TO_MAIN,
  TYPE_VERSION,
  TYPE_SPEC_LIST,
  CHAN_SHELL_OPEN_EXTERNAL,
} from './types';
import Diff from './containers/Diff';
import Format from './containers/Format';
import { version } from './package.json';
import ModalSettings from './components/ModalSettings';
import {
  GH_SPEC_ARCHIVE,
  GH_SPEC_REPO,
  GH_TOOL3RD_ISSUES,
  GH_TOOL3RD_RELEASES,
} from './constants/urls';
import ModalAbout from './components/ModalAbout';
import ModalLoadFromCloud from './components/ModalLoadFromCloud';

type Toast = {
  key: number;
  message: string;
  autoDismiss: boolean;
};

type State = {
  resourceList: Resource[];
  waiting: boolean;
  workerError: Error | null;
  showAbout: boolean;
  toastList: Toast[];
  modalLoadFromCloudVisible: boolean;
  modalSettingsVisible: boolean;
  numToast: number;
  specList: {
    name: string;
    children: { name: string; children: string[] }[];
  }[];
  versionLatest: string | undefined;
};

export default class Routes extends React.Component<
  Record<string, unknown>,
  State
> {
  private fileInputRef: React.RefObject<HTMLInputElement> = React.createRef();

  constructor(props: Record<string, unknown>) {
    super(props);
    this.state = {
      resourceList: [],
      waiting: false,
      workerError: null,
      showAbout: false,
      toastList: [{ key: 0, message: 'ASDF', autoDismiss: false }],
      numToast: 1,
      modalLoadFromCloudVisible: false,
      modalSettingsVisible: false,
      specList: [],
      versionLatest: undefined,
    };
    this.onIpc = this.onIpc.bind(this);
    this.onWorkerError = this.onWorkerError.bind(this);
    this.addToast = this.addToast.bind(this);
    this.removeToast = this.removeToast.bind(this);
  }

  componentDidMount() {
    ipcRenderer.on(CHAN_WORKER_ERROR, this.onWorkerError);
    ipcRenderer.on(CHAN_WORKER_TO_RENDERER, this.onIpc);
    ipcRenderer.send(CHAN_RENDERER_TO_WORKER, {
      src: ID_RENDERER,
      dst: ID_WORKER,
      type: TYPE_VERSION,
    });
    ipcRenderer.send(CHAN_RENDERER_TO_WORKER, {
      src: ID_RENDERER,
      dst: ID_WORKER,
      type: TYPE_SPEC_LIST,
    });
  }

  componentWillUnmount() {
    ipcRenderer.removeListener(CHAN_WORKER_ERROR, this.onWorkerError);
    ipcRenderer.removeListener(CHAN_WORKER_TO_RENDERER, this.onIpc);
  }

  // eslint-disable-next-line class-methods-use-this
  onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;
    if (files === null || files.length === 0) {
      return;
    }
    const file = files[0];
    const { path: location } = file;
    ipcRenderer.send(CHAN_RENDERER_TO_WORKER, {
      src: ID_RENDERER,
      dst: ID_WORKER,
      type: TYPE_LOAD_FILE_REQ,
      location,
    });
  }

  onClickEditSettings() {
    ipcRenderer.send(CHAN_RENDERER_TO_MAIN, {
      src: ID_RENDERER,
      dst: ID_MAIN,
      type: TYPE_EDIT_SETTINGS,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onIpc(_event: Electron.IpcRendererEvent, msg: any) {
    const { type } = msg;
    switch (type) {
      case TYPE_STATE: {
        const { state } = msg;
        this.setState({ waiting: state === STATE_WAITING });
        break;
      }
      case TYPE_RESOURCE_LIST: {
        const { resourceList } = msg;
        this.setState({ resourceList });
        break;
      }
      case TYPE_SPEC_LIST: {
        const { specList } = msg;
        this.setState({ specList });
        break;
      }
      case TYPE_TOAST: {
        const { message, autoDismiss } = msg;
        this.addToast({ key: -1, message, autoDismiss });
        break;
      }
      case TYPE_VERSION: {
        const { version: versionLatest } = msg;
        this.setState({ versionLatest });
        break;
      }
      default: {
        // do nothing
      }
    }
  }

  onWorkerError(_event: Electron.IpcRendererEvent, err: Error) {
    ipcRenderer.removeAllListeners(CHAN_WORKER_TO_RENDERER);
    this.setState({ waiting: false, workerError: err });
  }

  addToast(toast: Toast) {
    this.setState((state) => {
      const { toastList, numToast } = state;
      toast.key = numToast;
      toastList.push(toast);
      if (toast.autoDismiss) {
        setTimeout(this.removeToast, 3000, toast.key);
      }
      return { toastList, numToast: numToast + 1 };
    });
  }

  removeToast(key: number) {
    this.setState((state) => {
      const { toastList } = state;
      const index = toastList.findIndex((toast) => toast.key === key);
      toastList.splice(index, 1);
      return { toastList };
    });
  }

  // eslint-disable-next-line class-methods-use-this
  loadFromWeb(series: string, spec: string, version: string) {
    ipcRenderer.send(CHAN_RENDERER_TO_WORKER, {
      src: ID_RENDERER,
      dst: ID_WORKER,
      type: TYPE_LOAD_FROM_WEB_REQ,
      series,
      spec,
      version,
    });
  }

  // eslint-disable-next-line class-methods-use-this
  openIssueTracker() {
    ipcRenderer.send(CHAN_SHELL_OPEN_EXTERNAL, {
      url: GH_TOOL3RD_ISSUES,
    });
  }

  pushHistory(location: string) {
    (this.props as any).history.push(location);
  }

  render() {
    const {
      resourceList,
      waiting,
      workerError,
      showAbout,
      toastList,
      modalLoadFromCloudVisible,
      modalSettingsVisible,
      specList,
      versionLatest,
    } = this.state;
    return (
      <App>
        <div className="navbar">
          <div className="navbar-brand">
            <a className="navbar-item" onClick={() => this.pushHistory('/')}>
              <b>tool3rd</b>
            </a>
          </div>
          <div className="navbar-start">
            <div className="navbar-item has-dropdown is-hoverable">
              <div className="navbar-link">Message</div>
              <div className="navbar-dropdown">
                <a
                  className="navbar-item"
                  onClick={() => this.pushHistory(routes.FORMAT)}
                >
                  Format
                </a>
                <a
                  className="navbar-item"
                  onClick={() => this.pushHistory(routes.DIFF)}
                >
                  Diff
                </a>
              </div>
            </div>
            <div className="navbar-item has-dropdown is-hoverable">
              <div className="navbar-link">Resources</div>
              <div className="navbar-dropdown">
                <a
                  className="navbar-item"
                  onClick={() => this.fileInputRef.current?.click()}
                >
                  Load local file
                </a>
                <a
                  className="navbar-item"
                  onClick={() =>
                    this.setState({ modalLoadFromCloudVisible: true })
                  }
                >
                  Load from cloud
                </a>
                <a
                  className="navbar-item"
                  onClick={() => {
                    ipcRenderer.send(CHAN_SHELL_OPEN_EXTERNAL, {
                      url: GH_SPEC_ARCHIVE,
                    });
                  }}
                >
                  Download spec archive
                </a>
                <a
                  className="navbar-item"
                  onClick={() => {
                    ipcRenderer.send(CHAN_SHELL_OPEN_EXTERNAL, {
                      url: GH_SPEC_REPO,
                    });
                  }}
                >
                  Visit spec repository
                </a>
              </div>
            </div>
          </div>
          <div className="navbar-end">
            <a
              className="navbar-item"
              onClick={() => this.setState({ modalSettingsVisible: true })}
            >
              Settings
            </a>
            <div className="navbar-item has-dropdown is-hoverable">
              <a className="navbar-link">Help</a>
              <div className="navbar-dropdown is-right">
                <a
                  className="navbar-item"
                  onClick={() => {
                    ipcRenderer.send(CHAN_SHELL_OPEN_EXTERNAL, {
                      url: GH_TOOL3RD_RELEASES,
                    });
                  }}
                >
                  Check for update
                </a>
                <a
                  className="navbar-item"
                  key="issues"
                  onClick={() => {
                    ipcRenderer.send(CHAN_SHELL_OPEN_EXTERNAL, {
                      url: GH_TOOL3RD_ISSUES,
                    });
                  }}
                >
                  Report Bug & Suggest feature
                </a>
                <a
                  className="navbar-item"
                  key="about"
                  onClick={() => {
                    this.setState({ showAbout: true });
                  }}
                >
                  About
                </a>
              </div>
            </div>
            {semverCompare(versionLatest ?? '', version) > 0 ? (
              <div className="navbar-item">
                <button
                  className="button is-primary"
                  onClick={() => {
                    ipcRenderer.send(CHAN_SHELL_OPEN_EXTERNAL, {
                      url: GH_TOOL3RD_RELEASES,
                    });
                  }}
                >
                  New version available
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="columns">
          <div className="column is-four-fifths" id="main">
            <Switch>
              <Route exact path={routes.HOME} component={HomePage} />
              <Route
                path={routes.FORMAT}
                render={() => <Format resourceList={resourceList} />}
              />
              <Route
                path={routes.DIFF}
                render={() => <Diff resourceList={resourceList} />}
              />
            </Switch>
          </div>
          <div className="column" id="aside">
            <div className="box">
              {resourceList.map((resource) => {
                const { resourceId } = resource;
                return <ResourceItem key={resourceId} resource={resource} />;
              })}
              <input
                type="file"
                accept=".asn1,.json,.htm,.html"
                hidden
                ref={this.fileInputRef}
                onChange={this.onFileChange}
              />
              <hr />
              <MemoryUsage />
            </div>
          </div>
        </div>
        <ModalLoadFromCloud
          visible={modalLoadFromCloudVisible}
          onCancel={() => this.setState({ modalLoadFromCloudVisible: false })}
          specList={specList}
          onOk={(series, spec, version) => {
            this.setState({ modalLoadFromCloudVisible: false });
            this.loadFromWeb(series, spec, version);
          }}
        />
        <div className={`modal ${waiting ? 'is-active' : ''}`}>
          <div className="modal-background"></div>
          <div className="modal-content">
            <progress className="progress is-primary" max="100"></progress>
          </div>
        </div>
        <div className={`modal ${workerError ? 'is-active' : ''}`}>
          <div className="modal-background"></div>
          <div className="modal-card">
            <div className="modal-card-head">
              <div className="modal-card-title">Oops...</div>
            </div>
            <div className="modal-card-body">
              tool3rd encountered an error. If you are willing to support
              tool3rd and contribute fixing the problem, please copy the below
              message and report in the issue tracker.
              <textarea
                className="textarea"
                id="workerError"
                cols={80}
                rows={24}
                readOnly
              >
                {workerError?.toString()}
              </textarea>
              <button
                className="button"
                onClick={() => this.openIssueTracker()}
              >
                Go to Issue tracker
              </button>
            </div>
          </div>
        </div>
        <ModalAbout
          visible={showAbout}
          onClose={() => this.setState({ showAbout: false })}
          version={version}
          versionLatest={versionLatest}
        />
        <div id="toast">
          {toastList.map((toast) => {
            const { key, message } = toast;
            return (
              <div key={key} className="notification is-danger is-light">
                <button
                  className="delete"
                  onClick={() => this.removeToast(key)}
                ></button>
                {message}
              </div>
            );
          })}
        </div>
        {
          /**
           * This branching prevents the following warning:
           * > Warning: Instance created by `useForm` is not connected to any Form element. Forget to pass `form` prop?
           */
          modalSettingsVisible ? (
            <ModalSettings
              onCancel={() => this.setState({ modalSettingsVisible: false })}
              visible={modalSettingsVisible}
            />
          ) : null
        }
      </App>
    );
  }
}

/* TODO: Make it modal
{specList.length ? (
              <SubMenu key="cloud" title="Load from cloud">
                {specList.map(
                  (series: {
                    name: string;
                    children: { name: string; children: string[] }[];
                  }) => {
                    const { name: seriesName, children } = series;
                    return (
                      <SubMenu key={seriesName} title={seriesName}>
                        {children.map((spec) => {
                          const { name: specName, children } = spec;
                          return (
                            <SubMenu key={specName} title={specName}>
                              {children.map((version) => {
                                const label = version
                                  .replace('.json', '')
                                  .replace('.asn1', ' (ASN.1)')
                                  .replace('.tabular', ' (Tabular)');
                                return (
                                  <Menu.Item
                                    key={version}
                                    onClick={() =>
                                      this.loadFromWeb(
                                        seriesName,
                                        specName,
                                        version
                                      )
                                    }
                                  >
                                    {label}
                                  </Menu.Item>
                                );
                              })}
                            </SubMenu>
                          );
                        })}
                      </SubMenu>
                    );
                  }
                )}
              </SubMenu>
            ) : null}
*/
