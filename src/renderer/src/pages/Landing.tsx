import { H1, H2, H3, List } from '@/components/ui/typography'
import sampleFormatter from '../assets/sample-formatter.png'
// import sampleDiff from '../assets/sample-diff.png'

export function Landing() {
  return (
    <div className="space-y-4">
      <H1 className="my-6">tool3rd</H1>
      <H2>Features</H2>
      <H3>Message formatter</H3>
      <div className="flex space-x-4">
        <span className="flex-1">
          Format visualizes a definition of message/IE into spreadsheet for better comprehension.
          Following specs are supported:
          <List>
            <li>E-UTRA RRC (36.331), S1AP (36.413), X2AP (36.423)</li>
            <li>NR RRC (38.331), NGAP (38.413), XnAP (38.423), E1AP (38.463), F1AP (38.473)</li>
            <li>LPP (37.355), NRPPa (38.455)</li>
          </List>
        </span>
        <span className="flex-1">
          <img src={sampleFormatter} />
        </span>
      </div>
      {/* <H3>ASN.1 differ</H3>
      <div className="flex space-x-4">
        <span className="flex-1">
          Diff compares two ASN.1 specs and visualizes it. Following specs are supported:
          <List>
            <li>E-UTRA RRC (36.331), S1AP (36.413), X2AP (36.423)</li>
            <li>NR RRC (38.331), NGAP (38.413), XnAP (38.423), E1AP (38.463), F1AP (38.473)</li>
            <li>LPP (37.355), NRPPa (38.455)</li>
          </List>
        </span>
        <span className="flex-1">
          <img src={sampleDiff} />
        </span>
      </div> */}
    </div>
  )
}
