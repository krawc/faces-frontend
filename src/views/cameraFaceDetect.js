import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
// import Webcam from 'react-webcam';
import { loadModels, getFullFaceDescription, createMatcher } from '../api/face';
//import DrawBox from '../components/drawBox';
import Camera from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';

import { JSON_PROFILE } from '../common/profile';

const WIDTH = 340;
const HEIGHT = 512;
const inputSize = 160;

class CameraFaceDetect extends Component {
  constructor(props) {
    super(props);
    this.webcam = React.createRef();
    this.onTakePhoto = this.onTakePhoto.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.state = {
      fullDesc: null,
      faceMatcher: null,
      facingMode: null,
      responseRegistered: false,
      result: {
        agency: 1,
        communion: 1
      },
      labels: {
        agency: ["LOW", "MODERATE", "HIGH"],
        communion: ["NOT HIGHLY", "MODERATE", "HIGHLY"],
      },
      messageSent: false
    };
  }

  componentWillMount() {
    loadModels();
    this.setInputDevice();
    this.matcher();
  }

  setInputDevice = () => {
    navigator.mediaDevices.enumerateDevices().then(async devices => {
      let inputDevice = await devices.filter(
        device => device.kind === 'videoinput'
      );
      if (inputDevice.length < 2) {
        await this.setState({
          facingMode: 'user'
        });
      } else {
        await this.setState({
          facingMode: { exact: 'environment' }
        });
      }
      this.startCapture();
    });
  };

  matcher = async () => {
    const faceMatcher = await createMatcher(JSON_PROFILE);
    this.setState({ faceMatcher });
  };

  startCapture = () => {
    this.interval = setInterval(() => {
      this.capture();
    }, 5000);
  };

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  capture = async () => {
    if (!!this.webcam.current) {
      await getFullFaceDescription(
        this.webcam.current.getScreenshot(),
        inputSize
      ).then((fullDesc) => {
        this.setState({ fullDesc });
        let landmarks_out = [];
        if (fullDesc[0]) {
          let landmarks_in = fullDesc[0].faceLandmarks.positions
          for (let i = 0; i < landmarks_in.length; i ++) {
            landmarks_out.push(Math.floor(landmarks_in[i].x));
            landmarks_out.push(Math.floor(landmarks_in[i].y));
          }

          let landmarks_post = "[" + landmarks_out.toString() + "]";
          console.log(landmarks_post);
          let body = {
            "landmarks": landmarks_post
          }
          let result = fetch('https://faces-restful.herokuapp.com/api/predict', {
            headers: {
               'Accept': 'application/json',
               'Content-Type': 'application/json'
             },
            method: 'POST',
            body: JSON.stringify(body)
          }).then((result_str) => {
            return result_str.json()
          }).then((result) => {
            console.log(result)
            if (result.result) {
              let agency = result.result.agency.replace("[", "").replace("]", "");
              let communion = result.result.communion.replace("[", "").replace("]", "");
              let agency_communion = {
                agency: agency,
                communion: communion
              }
              this.setState({result: agency_communion});
            }
          });
        }
      });
    }
  };

  async onTakePhoto(dataUri) {
    await getFullFaceDescription(
      dataUri,
      inputSize
    ).then((fullDesc) => {
      this.setState({ fullDesc });
      let landmarks_out = [];
      if (fullDesc[0]) {
        let landmarks_in = fullDesc[0].faceLandmarks.positions
        for (let i = 0; i < landmarks_in.length; i ++) {
          landmarks_out.push(Math.floor(landmarks_in[i].x));
          landmarks_out.push(Math.floor(landmarks_in[i].y));
        }

        let landmarks_post = "[" + landmarks_out.toString() + "]";
        console.log(landmarks_post);
        let body = {
          "landmarks": landmarks_post
        }
        let result = fetch('https://faces-restful.herokuapp.com/api/predict', {
          headers: {
             'Accept': 'application/json',
             'Content-Type': 'application/json'
           },
          method: 'POST',
          body: JSON.stringify(body)
        }).then((result_str) => {
          return result_str.json()
        }).then((result) => {
          console.log(result)
          if (result.result) {
            let agency = result.result.agency.replace("[", "").replace("]", "");
            let communion = result.result.communion.replace("[", "").replace("]", "");
            let agency_communion = {
              agency: agency,
              communion: communion
            }
            this.setState({result: agency_communion, responseRegistered: true});
          }
        });
      }
    });
  }

  handleSubmit(event) {
    fetch('https://krawc.space/api/forms/submit/contact?token=e2949d4cfc3fb48cb1803670f3f61a', {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            form: {
                message: event.target.attributes.getNamedItem('data-rate').value,
            }
        })
    })
    .then(entry => entry.json())
    .then(entry => console.log(entry))
    .then(this.setState({
      messageSent: true
    }));

    event.preventDefault();

  }

  render() {
    const { fullDesc, faceMatcher, facingMode } = this.state;
    let videoConstraints = null;
    let camera = '';
    if (!!facingMode) {
      videoConstraints = {
        width: WIDTH,
        height: HEIGHT,
        facingMode: facingMode
      };
      if (facingMode === 'user') {
        camera = 'Front';
      } else {
        camera = 'Back';
      }
    }

    return (
      <div
        className="Camera"
      >
        <Camera
          onTakePhoto = { (dataUri) => { this.onTakePhoto(dataUri); } }
          isImageMirror = {true}
          idealResolution = {{width: 340, height: 512}}
        />
      {!this.state.responseRegistered ? (
        <div className="information">

            <h2>PERSONALITY MIRROR</h2>
            <p>Take a mirror selfie to how others might perceive you.</p>
            <p>The tool rates the perceived first impression of your personality, focusing on how much <strong>agency</strong> you exhibit and how <strong>cooperative</strong> you are.</p>
            <p>Take a photo to see the results and respond to them.</p>
            <p style={{fontSize: '11px'}}>designed and developed by Konrad Krawczyk</p>
            <p style={{fontSize: '11px'}}>special thanks to University of Basel 🙌</p>
        </div>
      ) : (
        <div className="output">
          <h2>BASED ON THE MODEL,</h2>
          <p>your <strong>AGENCY</strong> is perceived as <strong>{this.state.labels.agency[this.state.result.agency]}</strong></p>
          <p>and your tendency to <strong>COLLABORATE</strong> is <strong>{this.state.labels.communion[this.state.result.communion]}.</strong></p>
          <p>How does this prediction hold true to your own self-perception?</p>
          <div className="response-buttons">
            <p>Give an answer on a scale from 1 (untrue) to 5 (fully true). <br/>All responses are registered anonymously.</p>
            <button onClick={this.handleSubmit} data-rate="1">1</button>
            <button onClick={this.handleSubmit} data-rate="2">2</button>
            <button onClick={this.handleSubmit} data-rate="3">3</button>
            <button onClick={this.handleSubmit} data-rate="4">4</button>
            <button onClick={this.handleSubmit} data-rate="5">5</button>
            <span>{this.state.messageSent ? 'Thanks! Your anonymous response has been registered.' : ''}</span>
          </div>
          <p style={{fontSize: '11px'}}>designed and developed by Konrad Krawczyk</p>
          <p style={{fontSize: '11px'}}>special thanks to University of Basel 🙌</p>
        </div>
        )}
      </div>

    );
  }
}

export default withRouter(CameraFaceDetect);
