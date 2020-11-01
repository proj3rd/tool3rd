import React from 'react';
import { Image, Segment, Header, Grid } from 'semantic-ui-react';
import sampleDiff from '../images/sample-diff.png';
import sampleFormatter from '../images/sample-formatter.png';

export default function HomePage() {
  return (
    <Segment>
      <Header as="h1">tool3rd</Header>
      <Grid columns={2}>
        <Grid.Row columns={1}>
          <Header as="h2">Format</Header>
        </Grid.Row>
        <Grid.Row>
          <Grid.Column>
            Format visualizes a definition of message/IE into spreadsheet for
            better comprehension. Following specs are supported:
            <ul>
              <li>E-UTRA RRC (36.331), S1AP (36.413), X2AP (36.423)</li>
              <li>
                NR RRC (38.331), NGAP (38.413), XnAP (38.423), E1AP (38.463),
                F1AP (38.473)
              </li>
              <li>LPP (37.355), NRPPa (38.455)</li>
            </ul>
          </Grid.Column>
          <Grid.Column>
            <Image src={sampleFormatter} />
          </Grid.Column>
        </Grid.Row>
        <Grid.Row columns={1}>
          <Header as="h2">Diff</Header>
        </Grid.Row>
        <Grid.Row>
          <Grid.Column>
            Diff compares two ASN.1 specs and visualizes it. Following specs are
            supported:
            <ul>
              <li>E-UTRA RRC (36.331), S1AP (36.413), X2AP (36.423)</li>
              <li>
                NR RRC (38.331), NGAP (38.413), XnAP (38.423), E1AP (38.463),
                F1AP (38.473)
              </li>
              <li>LPP (37.355), NRPPa (38.455)</li>
            </ul>
          </Grid.Column>
          <Grid.Column>
            <Image src={sampleDiff} />
          </Grid.Column>
        </Grid.Row>
      </Grid>
    </Segment>
  );
}
