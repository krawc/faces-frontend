import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import Webcam from 'react-webcam';
import { loadModels, getFullFaceDescription, createMatcher } from '../api/face';
import DrawBox from '../components/drawBox';
import { JSON_PROFILE } from '../common/profile';

const WIDTH = 340;
const HEIGHT = 512;
const inputSize = 160;

class CameraFaceDetect extends Component {
  constructor(props) {
    super(props);
    this.webcam = React.createRef();
    this.state = {
      fullDesc: null,
      faceMatcher: null,
      facingMode: null,
      result: {
        agency: 1,
        communion: 1
      },
      labels: {
        agency: ["Low Agency", "Moderate Agency", "High Agency"],
        communion: ["Low Communion", "Moderate Comunion", "High Communion"],
      }
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
          let result = fetch('https://faces-restful.herokuapp.com/api/predict', {
            headers: {
               'Accept': 'application/json',
               'Content-Type': 'application/json'
             },
            method: 'POST',
             body: {
              "landmarks": landmarks_post
            }
          }).then((result) => {
            console.log(result)
            if (result.result) {
              let agency = result.result.agency.replace("[", "").replace("]", "");
              let communion = result.result.communion.replace("[", "").replace("]", "");
              let agency_communion = {
                agency: agency,
                communion: communion
              }
              this.setState({result: communion});
            }
          });
        }
      });
    }
  };

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
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <p>Camera: {camera}</p>
        <div
          style={{
            width: WIDTH,
            height: HEIGHT
          }}
        >
          <div style={{ position: 'relative', width: WIDTH }}>
            {!!videoConstraints ? (
              <div style={{ position: 'absolute' }}>
                <Webcam
                  audio={false}
                  width={WIDTH}
                  height={HEIGHT}
                  ref={this.webcam}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                />
                <h3 style={{textAlign: 'center'}}>{this.state.labels.agency[this.state.result.agency] + ", " + this.state.labels.communion[this.state.result.communion]}</h3>
              </div>
            ) : null}
            {!!fullDesc ? (
              <DrawBox
                fullDesc={fullDesc}
                faceMatcher={faceMatcher}
                imageWidth={WIDTH}
                boxColor={'blue'}
              />
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}

export default withRouter(CameraFaceDetect);
