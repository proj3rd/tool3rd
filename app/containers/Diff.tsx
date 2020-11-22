import React from 'react';
import {
  Segment,
  Header,
  DropdownProps,
  Message,
  Grid,
  Form,
  Button,
  Icon,
} from 'semantic-ui-react';
import { remote, ipcRenderer, shell } from 'electron';
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

  onChange(
    _event: React.SyntheticEvent<HTMLElement, Event>,
    data: DropdownProps,
    oldNew: 'old' | 'new'
  ) {
    const value = data.value as number | undefined;
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
        remote.dialog
          .showSaveDialog({
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
      .filter((resource) => resource.name.endsWith('asn1') && resource.loaded)
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
      <Segment>
        <Header as="h1">Diff</Header>
        <Form>
          <Grid columns={2}>
            <Grid.Row>
              <Grid.Column>
                <Form.Select
                  label="Old spec"
                  placeholder="Old spec"
                  options={options}
                  onChange={(event, data) => this.onChange(event, data, 'old')}
                />
              </Grid.Column>
              <Grid.Column>
                <Form.Select
                  label="New spec"
                  placeholder="New spec"
                  options={options}
                  onChange={(event, data) => this.onChange(event, data, 'new')}
                />
              </Grid.Column>
            </Grid.Row>
            <Grid.Row>
              <Grid.Column>
                <Form.Button
                  disabled={disabled}
                  onClick={() => this.requestDiff()}
                >
                  Diff
                </Form.Button>
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </Form>
        {isMessageVisible ? (
          <Message positive>
            <Message.Header>Diff success</Message.Header>
            <Message.Content>
              <Button
                icon
                size="tiny"
                basic
                color="green"
                onClick={() => {
                  shell.openExternal(filePath);
                }}
              >
                <Icon name="file text" />
                Open file
              </Button>
              <Button
                icon
                size="tiny"
                basic
                color="blue"
                onClick={() => {
                  shell.showItemInFolder(filePath);
                }}
              >
                <Icon name="folder" />
                Open folder
              </Button>
            </Message.Content>
          </Message>
        ) : (
          <></>
        )}
      </Segment>
    );
  }
}
