import React from 'react';
import { Button, Item, Label } from 'semantic-ui-react';
import { ipcRenderer } from 'electron';
import {
  CHAN_RENDERER_TO_WORKER,
  ID_RENDERER,
  ID_WORKER,
  TYPE_RESOURCE_STATE_REQ,
} from '../types';

export type Resource = {
  resourceId: number;
  name: string;
  location: string;
  loaded: boolean;
  type: 'asn1';
};

type Props = {
  resource: Resource;
};

function changeResourceState(resourceId: number, state: boolean) {
  ipcRenderer.send(CHAN_RENDERER_TO_WORKER, {
    src: ID_RENDERER,
    dst: ID_WORKER,
    type: TYPE_RESOURCE_STATE_REQ,
    resourceId,
    state,
  });
}

export default function ResourceItem({ resource }: Props) {
  const { resourceId, name, location, loaded, type } = resource;
  const buttonColor = loaded ? 'red' : 'green';
  const buttonText = loaded ? 'Unload' : 'Load';
  const locationLabel = location.startsWith('http') ? 'cloud' : 'local';
  return (
    <Item>
      <Item.Content>
        <Item.Header>{`#${resourceId}. ${name}`}</Item.Header>
        <Item.Extra>
          <Label basic color="blue">
            {type}
            <Label.Detail>{locationLabel}</Label.Detail>
          </Label>
          <Button
            basic
            size="mini"
            color={buttonColor}
            floated="right"
            onClick={() => changeResourceState(resourceId, !loaded)}
          >
            {buttonText}
          </Button>
        </Item.Extra>
      </Item.Content>
    </Item>
  );
}
