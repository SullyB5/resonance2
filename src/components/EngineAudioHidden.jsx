export default function EngineAudioHidden() {
  return (
    <div className="engine-audio-hidden" hidden aria-hidden="true">
      <div className="seg" id="waves" role="group" aria-label="waveform">
        <button type="button" data-w="sine" aria-pressed="true">sine</button>
        <button type="button" data-w="triangle" aria-pressed="false">triangle</button>
        <button type="button" data-w="square" aria-pressed="false">square</button>
        <button type="button" data-w="sawtooth" aria-pressed="false">saw</button>
      </div>
      <div className="seg warm" id="modes" role="group" aria-label="experiment">
        <button type="button" data-m="tone" aria-pressed="true">pure tone</button>
        <button type="button" data-m="harmonics" aria-pressed="false">harmonics</button>
        <button type="button" data-m="beat" aria-pressed="false">beat</button>
        <button type="button" data-m="chord" aria-pressed="false">chord</button>
      </div>
    </div>
  )
}
