import React from 'react';
import sampleDiff from '../images/sample-diff.png';
import sampleFormatter from '../images/sample-formatter.png';

export default function HomePage() {
  return (
    <div className='box'>
      <h1 className="title is-1">tool3rd</h1>
      <div>
        <h2 className="subtitle is-3">Format</h2>
      </div>
      <div className="columns">
        <div className="column">
          Format visualizes a definition of message/IE into spreadsheet for
          better comprehension. Following specs are supported:
          <ul>
            <li>E-UTRA RRC (36.331), S1AP (36.413), X2AP (36.423)</li>
            <li>
              NR RRC (38.331), NGAP (38.413), XnAP (38.423), E1AP (38.463), F1AP
              (38.473)
            </li>
            <li>LPP (37.355), NRPPa (38.455)</li>
          </ul>
        </div>
        <div className="column">
          <img src={sampleFormatter} />
        </div>
      </div>
      <div>
        <h2 className="subtitle is-3">Diff</h2>
      </div>
      <div className="columns">
        <div className="column">
          Diff compares two ASN.1 specs and visualizes it. Following specs are
          supported:
          <ul>
            <li>E-UTRA RRC (36.331), S1AP (36.413), X2AP (36.423)</li>
            <li>
              NR RRC (38.331), NGAP (38.413), XnAP (38.423), E1AP (38.463), F1AP
              (38.473)
            </li>
            <li>LPP (37.355), NRPPa (38.455)</li>
          </ul>
        </div>
        <div className="column">
          <img src={sampleDiff} />
        </div>
      </div>
    </div>
  );
}
