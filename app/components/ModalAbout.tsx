import { ipcRenderer } from 'electron';
import React from 'react';
import { GH_LIB3RD_REPO, GH_TOOL3RD_REPO } from '../constants/urls';
import { CHAN_SHELL_OPEN_EXTERNAL } from '../types';

type Props = {
  visible?: boolean;
  onClose?: () => void;
  version: string;
  versionLatest?: string;
};

export default function ModalAbout({ visible, onClose, version, versionLatest }: Props) {
  return (
    <div className={`modal ${visible ? 'is-active' : ''}`}>
      <div className="modal-background" onClick={onClose}></div>
      <div className="modal-card">
        <div className="modal-card-head">
          <div className="modal-card-title">tool3rd</div>
        </div>
        <div className="modal-card-body">
          <>
            <div className="columns">
              <div className="column has-text-right">Current:</div>
              <div className="column has-text-left">{version}</div>
            </div>
            {versionLatest !== undefined ? (
              <div className="columns">
                <div className="column has-text-right">Latest:</div>
                <div className="column has-text-left">{versionLatest}</div>
              </div>
            ) : null}
          </>
          <div className="buttons is-justify-content-center">
            <button
              className="button is-text"
              onClick={() => {
                ipcRenderer.send(CHAN_SHELL_OPEN_EXTERNAL, {
                  url: GH_TOOL3RD_REPO,
                });
              }}
            >
              Project home
            </button>
            <button
              className="button is-text"
              onClick={() => {
                ipcRenderer.send(CHAN_SHELL_OPEN_EXTERNAL, {
                  url: GH_LIB3RD_REPO,
                });
              }}
            >
              lib3rd
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
