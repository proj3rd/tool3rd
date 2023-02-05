import React from 'react';
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
  const buttonColor = loaded ? 'danger' : 'success';
  const buttonText = loaded ? 'Unload' : 'Load';
  const locationLabel = location.startsWith('http') ? 'cloud' : 'local';
  return (
    <div className="block">
      <b>{`#${resourceId}. ${name}`}</b>
      <div className="level">
        <div className="level-left">
          <div className="tags has-addons">
            <span className="tag">{locationLabel}</span>
            <span className="tag is-primary">{type}</span>
          </div>
        </div>
        <div className="level-right">
          <a
            className={`has-text-${buttonColor} is-size-7`}
            onClick={() => changeResourceState(resourceId, !loaded)}
          >
            {buttonText}
          </a>
        </div>
      </div>
    </div>
  );
}
