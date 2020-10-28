import { debounce } from 'lodash';
/* eslint-disable jsx-a11y/label-has-associated-control */
import React from 'react';
import {
  Segment,
  Header,
  Form,
  DropdownProps,
  Message,
  Grid,
  Button,
  DropdownItemProps,
  InputOnChangeData,
  Table,
  Label,
  Input,
} from 'semantic-ui-react';
import { ipcRenderer, remote } from 'electron';
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
  ieList: DropdownItemProps[];
  queue: QueueItem[];
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

  onNameChange(
    _event: React.ChangeEvent<HTMLInputElement>,
    data: InputOnChangeData
  ) {
    const name = data.value;
    this.onNameChangeDebounce(name);
  }

  onNameChangeDebounce = debounce((name) => {
    this.setState({ name });
  }, 1000);

  // eslint-disable-next-line class-methods-use-this
  onSpecChange(
    _event: React.SyntheticEvent<HTMLElement, Event>,
    data: DropdownProps
  ) {
    const value = data.value as number | undefined;
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
        remote.dialog
          .showSaveDialog({
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
        }, 3000);
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
    const { options, name, ieList, queue, isMessageVisible } = this.state;
    const disabled = queue.length === 0;
    return (
      <Segment>
        <Header as="h1">Format</Header>
        <Form>
          <Grid columns={2}>
            <Grid.Row>
              <Grid.Column>
                <Form.Select
                  label="Spec"
                  placeholder="Spec"
                  options={options}
                  onChange={(event, data) => this.onSpecChange(event, data)}
                />
              </Grid.Column>
            </Grid.Row>
            <Grid.Row>
              <Grid.Column>
                <Input
                  fluid
                  label="Filter by name"
                  onChange={(event, data) => this.onNameChange(event, data)}
                />
              </Grid.Column>
              <Grid.Column>
                <Button.Group>
                  <Button disabled active>
                    Add all
                  </Button>
                  <Button
                    basic
                    color="green"
                    disabled={ieList.length === 0}
                    onClick={() => {
                      ieList.forEach((ie) => {
                        const { key } = ie;
                        this.addToQueue(key, false);
                      });
                    }}
                  >
                    Normal
                  </Button>
                  <Button
                    basic
                    color="blue"
                    disabled={ieList.length === 0}
                    onClick={() => {
                      ieList.forEach((ie) => {
                        const { key } = ie;
                        this.addToQueue(key, true);
                      });
                    }}
                  >
                    Expand
                  </Button>
                </Button.Group>
                <Button disabled={disabled} onClick={this.removeAll}>
                  Remove all
                </Button>
                <Button
                  disabled={disabled}
                  onClick={() => this.requestFormat()}
                >
                  Format
                </Button>
              </Grid.Column>
            </Grid.Row>
            <Grid.Row columns={1}>
              <Grid.Column>
                {isMessageVisible ? (
                  <Message positive>Format success</Message>
                ) : (
                  <></>
                )}
              </Grid.Column>
            </Grid.Row>
            <Grid.Row>
              <Grid.Column>
                <Segment className="format-ie-list">
                  <Label attached="top">Pool</Label>
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.HeaderCell>Name</Table.HeaderCell>
                        <Table.HeaderCell collapsing>Format</Table.HeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {ieList
                        .filter((ie) =>
                          (ie.text as string)
                            .toLowerCase()
                            .includes(name.toLowerCase())
                        )
                        .map((ie) => {
                          const { key } = ie;
                          return (
                            <Table.Row key={key}>
                              <Table.Cell>{ie.text}</Table.Cell>
                              <Table.Cell>
                                <Button.Group size="tiny">
                                  <Button
                                    basic
                                    color="green"
                                    onClick={() => this.addToQueue(key, false)}
                                  >
                                    Normal
                                  </Button>
                                  <Button
                                    basic
                                    color="blue"
                                    onClick={() => this.addToQueue(key, true)}
                                  >
                                    Expand
                                  </Button>
                                </Button.Group>
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                    </Table.Body>
                  </Table>
                </Segment>
              </Grid.Column>
              <Grid.Column>
                <Segment className="format-ie-list">
                  <Label attached="top">Queue</Label>
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.HeaderCell>Name</Table.HeaderCell>
                        <Table.HeaderCell>Spec</Table.HeaderCell>
                        <Table.HeaderCell collapsing>Expand</Table.HeaderCell>
                        <Table.HeaderCell collapsing>Remove</Table.HeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {queue.map((ie) => {
                        const { key, resourceId, ieName, expand } = ie;
                        const optionIndex = options.findIndex((option) => {
                          return option.key === resourceId;
                        });
                        const specFileName = options[optionIndex].name;
                        return (
                          <Table.Row key={key}>
                            <Table.Cell>{ieName}</Table.Cell>
                            <Table.Cell>{specFileName}</Table.Cell>
                            <Table.Cell>{expand ? 'Expand' : ''}</Table.Cell>
                            <Table.Cell>
                              <Button.Group size="tiny">
                                <Button
                                  basic
                                  color="grey"
                                  onClick={() => this.removeFromQueue(key)}
                                >
                                  Remove
                                </Button>
                              </Button.Group>
                            </Table.Cell>
                          </Table.Row>
                        );
                      })}
                    </Table.Body>
                  </Table>
                </Segment>
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </Form>
      </Segment>
    );
  }
}
