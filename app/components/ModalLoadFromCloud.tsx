import React, { useState } from 'react';

type Props = {
  visible?: boolean;
  onOk?: (series: string, spec: string, version: string) => void;
  onCancel?: () => void;
  specList?: {
    name: string;
    children: { name: string; children: string[] }[];
  }[];
};

export default function ModalLoadFromCloud({
  visible,
  onOk,
  onCancel,
  specList,
}: Props) {
  const [series, setSeries] = useState('');
  const [spec, setSpec] = useState('');
  const [release, setRelease] = useState(0);
  const [version, setVersion] = useState('');

  const extractVersion = (spec: string) => {
    const indexDot = spec.indexOf('.');
    if (indexDot === -1) {
      return undefined;
    }
    const indexHyphen = spec.substring(0, indexDot).lastIndexOf('-');
    if (indexHyphen === -1) {
      return undefined;
    }
    return spec.substring(0, indexDot).substring(indexHyphen + 1);
  };

  const extractRelease = (version: string | undefined) => {
    if (!version) {
      return undefined;
    }
    if (version?.length === 6) {
      return Number(version.substring(0, 2));
    }
    if (version?.length === 3) {
      const char = version[0];
      if (char.match(/\d/)) {
        return Number(char);
      }
      return char.charCodeAt(0) - 'a'.charCodeAt(0) + 10;
    }
    return undefined;
  };

  const seriesFound = specList?.find(({ name }) => name === series)?.children;
  const specFound = seriesFound?.find(({ name }) => name === spec)?.children;
  const releaseList = Array.from(
    new Set(
      specFound
        ?.map((spec) => {
          const version = extractVersion(spec);
          return extractRelease(version);
        })
        .filter((release) => release)
    )
  ).sort();
  const versionList = specFound?.filter((spec) => {
    const version = extractVersion(spec);
    return extractRelease(version) === release;
  });

  const styleSelect = { height: 'auto', padding: 'unset' };
  const styleOption = { padding: '.5em 1em' };

  return (
    <div className={`modal ${visible ? 'is-active' : ''}`}>
      <div className="modal-background" onClick={onCancel}></div>
      <div className="modal-card">
        <div className="modal-card-head">
          <div className="modal-card-title">Load from cloud</div>
        </div>
        <div className="modal-card-body">
          <div className="columns">
            <div className="column">
              <div className="field">
                <label className="label">Series</label>
                <div className="control">
                  <div className="select is-multiple is-fullwidth">
                    <select
                      size={8}
                      style={styleSelect}
                      defaultValue={series}
                      onChange={(e) => {
                        setSeries(e.target.value);
                        setSpec('');
                        setRelease(0);
                        setVersion('');
                      }}
                    >
                      {specList?.map(({ name }) => (
                        <option key={name} value={name} style={styleOption}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="column">
              <div className="field">
                <label className="label">Spec</label>
                <div className="control">
                  <div className="select is-multiple is-fullwidth">
                    <select
                      size={8}
                      style={styleSelect}
                      onChange={(e) => {
                        setSpec(e.target.value);
                        setRelease(0);
                        setVersion('');
                      }}
                    >
                      {seriesFound?.map(({ name }) => (
                        <option key={name} value={name} style={styleOption}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="column">
              <div className="field">
                <label className="label">Release</label>
                <div className="control">
                  <div className="select is-multiple is-fullwidth">
                    <select
                      size={8}
                      style={styleSelect}
                      onChange={(e) => {
                        setRelease(Number(e.target.value));
                        setVersion('');
                      }}
                    >
                      {releaseList?.map((release) => (
                        <option
                          key={release}
                          value={release}
                          style={styleOption}
                        >
                          Rel-{release}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="column">
              <div className="field">
                <label className="label">Version</label>
                <div className="control">
                  <div className="select is-multiple is-fullwidth">
                    <select
                      size={8}
                      style={styleSelect}
                      onChange={(e) => setVersion(e.target.value)}
                    >
                      {versionList?.map((version) => (
                        <option
                          key={version}
                          value={version}
                          style={styleOption}
                        >
                          {version}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-card-foot">
          <button
            className="button"
            onClick={() => onOk?.(series, spec, version)}
          >
            Load
          </button>
        </div>
      </div>
    </div>
  );
}
