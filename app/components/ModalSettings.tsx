import Store from 'electron-store';
import React, { useEffect, useState } from 'react';
import { ipcRenderer } from 'electron';
import {
  CHAN_APP_EXIT,
  CHAN_APP_RELAUNCH,
  CHAN_BROWSE_CERTIFICATE,
} from '../types';

type Props = { visible?: boolean; onCancel?: () => void };

export default function ModalSettings({ visible, onCancel }: Props) {
  const store = new Store();

  const [useProxy, setUseProxy] = useState(false);
  const [protocol, setProtocol] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(0);
  const [cert, setCert] = useState('');
  const [rejectUnauthorized, setRejectUnauthorized] = useState(true);

  useEffect(() => {
    const { proxy, security } = store.store;
    setUseProxy(!!(proxy as any).use);
    setProtocol((proxy as any).https.protocol);
    setHost((proxy as any).https.host);
    setPort((proxy as any).https.port);
    setCert((security as any).cert);
    setRejectUnauthorized((security as any).rejectUnauthorized);
  }, [visible]);

  function applyAndRelaunch() {
    const settingsNew = {
      proxy: {
        use: useProxy,
        https: {
          protocol,
          host,
          port,
        },
      },
      security: {
        cert,
        rejectUnauthorized,
      },
    };
    store.set(settingsNew);
    ipcRenderer.send(CHAN_APP_RELAUNCH);
    ipcRenderer.send(CHAN_APP_EXIT);
  }

  function onClickBrowse() {
    ipcRenderer
      .invoke(CHAN_BROWSE_CERTIFICATE)
      .then((openDialogReturnValue: Electron.OpenDialogReturnValue) => {
        const { canceled, filePaths } = openDialogReturnValue;
        if (canceled || !filePaths.length) {
          return;
        }
        const certPath = filePaths[0];
        setCert(certPath);
      })
      .catch((reason) => {
        console.error(reason);
      });
  }

  const { proxy, security } = store.store;
  const settingsChanged =
    useProxy !== (proxy as any).use ||
    protocol !== (proxy as any).https.protocol ||
    host !== (proxy as any).https.host ||
    port !== (proxy as any).https.port ||
    cert !== (security as any).cert ||
    rejectUnauthorized !== (security as any).rejectUnauthorized;

  return (
    <div className={`modal ${visible ? 'is-active' : ''}`}>
      <div className="modal-background" onClick={onCancel}></div>
      <div className="modal-card">
        <div className="modal-card-head">
          <div className="modal-card-title">Settings</div>
        </div>
        <div className="modal-card-body">
          <h4 className="title is-4">Proxy</h4>
          <div className="field">
            <div className="control">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={useProxy}
                  onChange={(e) => setUseProxy(e.target.checked)}
                ></input>
                Use
              </label>
            </div>
          </div>
          <div className="field has-addons">
            <div className="control">
              <div className="select">
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                >
                  <option value="http">http://</option>
                  <option value="https">https://</option>
                </select>
              </div>
            </div>
            <div className="control">
              <input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="input"
                placeholder="host"
                type="url"
              ></input>
            </div>
            <div className="control">
              <input
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="input"
                placeholder="port"
                type="number"
                min="1"
                max="65535"
              ></input>
            </div>
          </div>
          <h4 className="title is-4">Security</h4>
          <div className="field">
            <label className="label">Certificate</label>
            <div className="control">
              <div className="file has-name is-fullwidth">
                <input className="file-input" type="file"></input>
                <span className="file-cta" onClick={onClickBrowse}>
                  <span className="file-icon">
                    <i className="mdi mdi-folder-search"></i>
                  </span>
                  <span className="file-label">Choose a file...</span>
                </span>
                <span className="file-name">{cert}</span>
              </div>
            </div>
            <div className="help">
              If you are behind a proxy, you may want to set a self-signed
              certificate.
            </div>
          </div>
          <div className="field">
            <div className="control">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={rejectUnauthorized}
                  onChange={(e) => setRejectUnauthorized(e.target.checked)}
                ></input>
                Verify CA
              </label>
            </div>
            <div className="help">
              Whether to verify SSL certificate. If you have a trouble with
              using a self-signed certificate, uncheck it. However, it may
              expose a potential security risk and tool3rd recommends you to set
              a self-signed certificate, if applicable.
            </div>
          </div>
        </div>
        <div className="modal-card-foot">
          <button
            className="button"
            onClick={applyAndRelaunch}
            disabled={!settingsChanged}
          >
            Apply & relaunch
          </button>
        </div>
      </div>
    </div>
  );
}
