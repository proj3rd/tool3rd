/* eslint react/jsx-props-no-spreading: off */
import React from 'react';
import { Switch, Route, Link } from 'react-router-dom';
import {
  Menu,
  Grid,
  Divider,
  Item,
  Dimmer,
  Loader,
  Modal,
  Form,
  Button,
  Dropdown,
  Message,
  Header,
  Container,
  Label,
  List,
} from 'semantic-ui-react';
import { ipcRenderer, remote, shell } from 'electron';
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
  TYPE_RATE_LIMIT,
  TYPE_LOAD_FILE_REQ,
  TYPE_TOAST,
} from './types';
import Diff from './containers/Diff';
import Format from './containers/Format';
import { version } from './package.json';

type Toast = {
  key: number;
  message: string;
  autoDismiss: boolean;
};

type State = {
  resourceList: Resource[];
  rateRemaining: number | undefined;
  waiting: boolean;
  workerError: Error | null;
  showAbout: boolean;
  toastList: Toast[];
  numToast: number;
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
      rateRemaining: undefined,
      waiting: false,
      workerError: null,
      showAbout: false,
      toastList: [],
      numToast: 0,
    };
    this.onIpc = this.onIpc.bind(this);
    this.onWorkerError = this.onWorkerError.bind(this);
    this.addToast = this.addToast.bind(this);
    this.removeToast = this.removeToast.bind(this);
  }

  componentDidMount() {
    ipcRenderer.on(CHAN_WORKER_ERROR, this.onWorkerError);
    ipcRenderer.on(CHAN_WORKER_TO_RENDERER, this.onIpc);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onIpc(_event: Electron.IpcRendererEvent, msg: any) {
    const { type } = msg;
    switch (type) {
      case TYPE_STATE: {
        const { state } = msg;
        this.setState({ waiting: state === STATE_WAITING });
        break;
      }
      case TYPE_RATE_LIMIT: {
        const { remaining: rateRemaining } = msg;
        this.setState({ rateRemaining });
        break;
      }
      case TYPE_RESOURCE_LIST: {
        const { resourceList } = msg;
        this.setState({ resourceList });
        break;
      }
      case TYPE_TOAST: {
        const { message, autoDismiss } = msg;
        this.addToast({ key: -1, message, autoDismiss });
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
  loadFromWeb() {
    ipcRenderer.send(CHAN_RENDERER_TO_WORKER, {
      src: ID_RENDERER,
      dst: ID_WORKER,
      type: TYPE_LOAD_FROM_WEB_REQ,
    });
  }

  // eslint-disable-next-line class-methods-use-this
  openIssueTracker() {
    remote.shell.openExternal('https://github.com/3gpp-network/tool3rd/issues');
  }

  render() {
    const {
      resourceList,
      rateRemaining,
      waiting,
      workerError,
      showAbout,
      toastList,
    } = this.state;
    return (
      <App>
        <Grid>
          <Grid.Column width={13} id="main">
            <Menu>
              <Menu.Item header>tool3rd</Menu.Item>
              <Dropdown item simple text="Message">
                <Dropdown.Menu>
                  <Link to={routes.FORMAT}>
                    <Dropdown.Item>Format</Dropdown.Item>
                  </Link>
                  <Link to={routes.DIFF}>
                    <Dropdown.Item>Diff ASN.1</Dropdown.Item>
                  </Link>
                </Dropdown.Menu>
              </Dropdown>
              <Dropdown item simple text="PHY" disabled>
                <Dropdown.Menu>
                  <Dropdown.Item disabled>Inter-RAT Interference</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
              <Dropdown item simple text="Help">
                <Dropdown.Menu>
                  <Dropdown.Item
                    onClick={() => {
                      shell.openExternal(
                        'https://github.com/proj3rd/tool3rd/releases'
                      );
                    }}
                  >
                    Check for updates
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => {
                      shell.openExternal(
                        'https://github.com/proj3rd/tool3rd/issues'
                      );
                    }}
                  >
                    Report Bug & Suggest feature
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => {
                      this.setState({ showAbout: true });
                    }}
                  >
                    About
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
              <Menu.Menu position="right">
                <Dropdown item simple text="Resources">
                  <Dropdown.Menu>
                    <Dropdown.Item
                      onClick={() => this.fileInputRef.current?.click()}
                    >
                      Load local file
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={() => {
                        shell.openExternal(
                          'https://github.com/proj3rd/3gpp-specs/archive/master.zip'
                        );
                      }}
                    >
                      Download spec archive
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={() => {
                        shell.openExternal(
                          'https://github.com/3gpp-network/3gpp-specs/'
                        );
                      }}
                    >
                      Visit spec repository
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={() => this.loadFromWeb()}
                      alt={rateRemaining}
                    >
                      Load resources from cloud
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Menu.Menu>
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
              accept=".asn1,.htm,.html"
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
              <div>
                <Label>{version}</Label>
              </div>
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
      </App>
    );
  }
}
