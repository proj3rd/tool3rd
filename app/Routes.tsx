/* eslint react/jsx-props-no-spreading: off */
import React from 'react';
import { Switch, Route } from 'react-router-dom';
import {
  Grid,
  Divider,
  Item,
  Dimmer,
  Loader,
  Modal,
  Form,
  Button,
  Message,
  Header,
  Container,
  List,
} from 'semantic-ui-react';
import { ipcRenderer, shell } from 'electron';
import * as remote from '@electron/remote';
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
} from './types';
import Diff from './containers/Diff';
import Format from './containers/Format';
import { version } from './package.json';
import { Col, Menu, Row } from 'antd';
import ModalSettings from './components/ModalSettings';

const { SubMenu } = Menu;

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
  modalSettingsVisible: boolean;
  numToast: number;
  specList: { name: string; children: { name: string; children: string[]; }[]; }[];
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
      toastList: [],
      numToast: 0,
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
    remote.shell.openExternal('https://github.com/proj3rd/tool3rd/issues');
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
      modalSettingsVisible,
      specList,
      versionLatest,
    } = this.state;
    return (
      <App>
        <Grid>
          <Grid.Column width={13} id="main">
            <Menu mode="horizontal" selectable={false}>
              <Menu.Item
                key="header"
                onClick={() => this.pushHistory("/")}
              >
                tool3rd
              </Menu.Item>
              <SubMenu key="message" title="Message">
                <Menu.Item
                  key="format"
                  onClick={() => this.pushHistory(routes.FORMAT)}
                >
                  Format
                </Menu.Item>
                <Menu.Item
                  key="diff"
                  onClick={() => this.pushHistory(routes.DIFF)}
                >
                  Diff ASN.1
                </Menu.Item>
              </SubMenu>
              <SubMenu key="resources" title="Resources">
                <Menu.Item
                  key="loadLocalFile"
                  onClick={() => this.fileInputRef.current?.click()}
                >
                  Load local file
                </Menu.Item>
                {
                  specList.length ? (
                    <SubMenu key="cloud" title="Load from cloud">
                      {
                        specList.map((series: { name: string; children: { name: string; children: string[]; }[]; }) => {
                          const { name: seriesName, children } = series;
                          return (
                            <SubMenu key={seriesName} title={seriesName}>
                              {
                                children.map((spec) => {
                                  const { name: specName, children } = spec;
                                  return (
                                    <SubMenu key={specName} title={specName}>
                                      {
                                        children.map((version) => {
                                          const label = version.replace(".json", "").replace(".asn1", " (ASN.1)").replace(".tabular", " (Tabular)");
                                          return (
                                            <Menu.Item
                                              key={version}
                                              onClick={() => this.loadFromWeb(seriesName, specName, version)}
                                            >
                                              {label}
                                            </Menu.Item>
                                          )
                                        })
                                      }
                                    </SubMenu>
                                  )
                                })
                              }
                            </SubMenu>
                          )
                        })
                      }
                    </SubMenu>
                  ) : null
                }
                <Menu.Item
                  key="downloadSpecArchive"
                  onClick={() => {
                    shell.openExternal(
                      'https://github.com/proj3rd/3gpp-specs-in-json/archive/master.zip'
                    );
                  }}
                >
                  Download spec archive
                </Menu.Item>
                <Menu.Item
                  key="visitSpecRepository"
                  onClick={() => {
                    shell.openExternal(
                      'https://github.com/proj3rd/3gpp-specs-in-json/'
                    );
                  }}
                >
                  Visit spec repository
                </Menu.Item>
              </SubMenu>
              <Menu.Item
                key="settings"
                onClick={() => this.setState({ modalSettingsVisible: true })}
              >
                Settings
              </Menu.Item>
              <SubMenu key="help" title="Help">
                <Menu.Item
                  key="checkForUpdate"
                  onClick={() => {
                    shell.openExternal(
                      'https://github.com/proj3rd/tool3rd/releases'
                    );
                  }}
                >
                  Check for update
                </Menu.Item>
                <Menu.Item
                  key="issues"
                  onClick={() => {
                    shell.openExternal(
                      'https://github.com/proj3rd/tool3rd/issues'
                    );
                  }}
                >
                  Report Bug & Suggest feature
                </Menu.Item>
                <Menu.Item
                  key="about"
                  onClick={() => {
                    this.setState({ showAbout: true });
                  }}
                >
                  About
                </Menu.Item>
              </SubMenu>
            </Menu>
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
          </Grid.Column>
          <Grid.Column width={3} id="aside">
            <Item.Group divided>
              {resourceList.map((resource) => {
                const { resourceId } = resource;
                return <ResourceItem key={resourceId} resource={resource} />;
              })}
            </Item.Group>
            <input
              type="file"
              accept=".asn1,.json,.htm,.html"
              hidden
              ref={this.fileInputRef}
              onChange={this.onFileChange}
            />
            <Divider />
            <MemoryUsage />
          </Grid.Column>
        </Grid>
        <Dimmer active={waiting}>
          <Loader />
        </Dimmer>
        <Modal open={workerError !== null}>
          <Modal.Header>Oops...</Modal.Header>
          <Modal.Content>
            <Modal.Description>
              tool3rd encountered an error. If you are willing to support
              tool3rd and contribute fixing the problem, please copy the below
              message and report in the issue tracker.
              <Form>
                <Form.TextArea
                  id="workerError"
                  value={workerError?.toString()}
                  rows={24}
                />
                <Button onClick={() => this.openIssueTracker()}>
                  Go to Issue tracker
                </Button>
              </Form>
            </Modal.Description>
          </Modal.Content>
        </Modal>
        <Modal
          open={showAbout}
          onClose={() => {
            this.setState({ showAbout: false });
          }}
        >
          {/* <Modal.Header>tool3rd</Modal.Header> */}
          <Modal.Content>
            <Container textAlign="center">
              <Header as="h1">tool3rd</Header>
              <>
                <Row>
                  <Col span={12} style={{ textAlign: "right" }}>Current:</Col>
                  <Col span={12} style={{ textAlign: "left" }}>{version}</Col>
                </Row>
                {
                  versionLatest !== undefined ? (
                    <Row>
                      <Col span={12} style={{ textAlign: "right" }}>Latest:</Col>
                      <Col span={12} style={{ textAlign: "left" }}>{versionLatest}</Col>
                    </Row>
                  ) : null
                }
              </>
              <List bulleted horizontal>
                <List.Item
                  as="a"
                  onClick={() => {
                    shell.openExternal('https://github.com/proj3rd/tool3rd');
                  }}
                >
                  Project home
                </List.Item>
                <List.Item
                  as="a"
                  onClick={() => {
                    shell.openExternal('https://github.com/proj3rd/lib3rd');
                  }}
                >
                  lib3rd
                </List.Item>
              </List>
            </Container>
          </Modal.Content>
        </Modal>
        <div id="toast">
          {toastList.map((toast) => {
            const { key, message } = toast;
            return (
              <Message
                key={key}
                negative
                onDismiss={() => this.removeToast(key)}
              >
                {message}
              </Message>
            );
          })}
        </div>
        <ModalSettings
          onCancel={() => this.setState({ modalSettingsVisible: false })}
          visible={modalSettingsVisible}
        />
      </App>
    );
  }
}
