import Store from 'electron-store';
import React, { createRef, useEffect, useState } from 'react';
import { ipcRenderer } from 'electron';
import {
  CHAN_APP_EXIT,
  CHAN_APP_RELAUNCH,
  CHAN_BROWSE_CERTIFICATE,
} from '../types';

type Props = { visible?: boolean; onCancel?: () => void };

export default function ModalSettings({ visible, onCancel }: Props) {
  const store = new Store();

  const refUseProxy = createRef<HTMLInputElement>();
  const refProtocol = createRef<HTMLSelectElement>();
  const refHost = createRef<HTMLInputElement>();
  const refPort = createRef<HTMLInputElement>();
  const [cert, setCert] = useState('');
  const refVerifyCa = createRef<HTMLInputElement>();

  const [settingsChanged, setSettingsChanged] = useState(false);

  useEffect(() => {
    if (
      !refUseProxy.current ||
      !refProtocol.current ||
      !refHost.current ||
      !refPort.current ||
      !refVerifyCa.current
    ) {
      return;
    }
    const { proxy, security } = store.store;
    refUseProxy.current.checked = (proxy as any).use;
    refProtocol.current.value = (proxy as any).https.protocol;
    refHost.current.value = (proxy as any).https.host;
    refPort.current.value = (proxy as any).https.port;
    setCert((security as any).cert);
    refVerifyCa.current.checked = (security as any).rejectUnauthorized;
  }, [visible]);

  function applyAndRelaunch() {
    if (
      !refUseProxy.current ||
      !refProtocol.current ||
      !refHost.current ||
      !refPort.current ||
      !refVerifyCa.current
    ) {
      return;
    }
    const settingsNew = {
      proxy: {
        use: refUseProxy.current.checked,
        https: {
          protocol: refProtocol.current.value,
          host: refHost.current.value,
          port: refPort.current.value,
        },
      },
      security: {
        cert,
        rejectUnauthorized: refVerifyCa.current.checked,
      },
    };
    store.set(settingsNew);
    ipcRenderer.send(CHAN_APP_RELAUNCH);
    ipcRenderer.send(CHAN_APP_EXIT);
  }

  function checkSettingsChanged() {
    if (
      !refUseProxy.current ||
      !refProtocol.current ||
      !refHost.current ||
      !refPort.current ||
      !refVerifyCa.current
    ) {
      return;
    }
    const { proxy, security } = store.store;
    const settingsChanged =
      refUseProxy.current.checked === (proxy as any).use &&
      refProtocol.current.value === (proxy as any).https.protocol &&
      refHost.current.value === (proxy as any).https.host &&
      refPort.current.value === (proxy as any).https.port &&
      cert === (security as any).cert &&
      refVerifyCa.current.checked === (security as any).rejectUnauthorized;
    setSettingsChanged(settingsChanged);
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
        onValuesChange();
      })
      .catch((reason) => {
        console.error(reason);
      });
  }

  function onValuesChange() {
    checkSettingsChanged();
  }

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
                <input type="checkbox" ref={refUseProxy}></input>
                Use
              </label>
            </div>
          </div>
          <div className="field has-addons">
            <div className="control">
              <div className="select">
                <select ref={refProtocol}>
                  <option value="http">http://</option>
                  <option value="https">https://</option>
                </select>
              </div>
            </div>
            <div className="control">
              <input
                ref={refHost}
                className="input"
                placeholder="host"
                type="url"
              ></input>
            </div>
            <div className="control">
              <input
                ref={refPort}
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
                <input type="checkbox" ref={refVerifyCa}></input>
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
